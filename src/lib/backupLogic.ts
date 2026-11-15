import type {
  BackupFrequency,
  BackupPackage,
  BackupScheduleConfig,
  CmsDatabase,
} from '../types/cms';

export const BACKUP_DATA_KEYS = [
  'categories',
  'pages',
  'leadership',
  'departments',
  'sliders',
  'ticker',
  'events',
  'documents',
  'gallery',
  'telephoneDirectory',
  'alumni',
  'users',
  'auditLogs',
  'settings',
] as const;

export type BackupDataKey = (typeof BACKUP_DATA_KEYS)[number];

export function extractSnapshotData(
  db: CmsDatabase,
): Omit<CmsDatabase, 'backups' | 'backupSchedule'> {
  return {
    categories: db.categories,
    pages: db.pages,
    leadership: db.leadership,
    departments: db.departments,
    sliders: db.sliders,
    ticker: db.ticker,
    events: db.events,
    documents: db.documents,
    gallery: db.gallery,
    telephoneDirectory: db.telephoneDirectory,
    alumni: db.alumni,
    users: db.users,
    auditLogs: db.auditLogs,
    settings: db.settings,
  };
}

export function countDatabaseEntities(
  data: Partial<Omit<CmsDatabase, 'backups' | 'backupSchedule'>>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const key of BACKUP_DATA_KEYS) {
    const val = data[key];
    if (Array.isArray(val)) {
      counts[key] = val.length;
    } else if (val && typeof val === 'object') {
      if (key === 'alumni' && 'profiles' in val && Array.isArray((val as { profiles?: unknown[] }).profiles)) {
        const alum = val as { profiles: unknown[]; jobs?: unknown[]; events?: unknown[] };
        counts[key] = alum.profiles.length + (alum.jobs?.length ?? 0) + (alum.events?.length ?? 0);
      } else {
        counts[key] = 1;
      }
    }
  }
  return counts;
}

export function computeIncrementalDiff(
  baselineData: Partial<Omit<CmsDatabase, 'backups' | 'backupSchedule'>> | null,
  currentDb: CmsDatabase,
): {
  changedData: Partial<Omit<CmsDatabase, 'backups' | 'backupSchedule'>>;
  changedKeys: string[];
} {
  const current = extractSnapshotData(currentDb);
  if (!baselineData) {
    return {
      changedData: current,
      changedKeys: [...BACKUP_DATA_KEYS],
    };
  }

  const changedData: Partial<Omit<CmsDatabase, 'backups' | 'backupSchedule'>> = {};
  const changedKeys: string[] = [];

  for (const key of BACKUP_DATA_KEYS) {
    const prevJson = JSON.stringify(baselineData[key] ?? null);
    const currJson = JSON.stringify(current[key] ?? null);
    if (prevJson !== currJson) {
      (changedData as Record<string, unknown>)[key] = current[key];
      changedKeys.push(key);
    }
  }

  return { changedData, changedKeys };
}

export function validateBackupPackage(raw: unknown): {
  valid: boolean;
  reason?: string;
  pkg?: BackupPackage;
  entityCounts?: Record<string, number>;
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, reason: 'Backup payload must be a valid JSON object.' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.format !== 'svcoer-cms-backup') {
    return {
      valid: false,
      reason: 'Unrecognized backup format header (expected "svcoer-cms-backup").',
    };
  }
  if (!obj.data || typeof obj.data !== 'object') {
    return { valid: false, reason: 'Backup archive is missing its "data" payload.' };
  }
  const mode = obj.mode === 'incremental' ? 'incremental' : 'full';
  const data = obj.data as Partial<Omit<CmsDatabase, 'backups' | 'backupSchedule'>>;

  if (mode === 'full') {
    const requiredKeys: BackupDataKey[] = [
      'categories',
      'pages',
      'departments',
      'users',
      'settings',
    ];
    for (const k of requiredKeys) {
      if (!data[k]) {
        return {
          valid: false,
          reason: `Full backup is incomplete: missing required section "${k}".`,
        };
      }
    }
  } else {
    const hasAny = BACKUP_DATA_KEYS.some((k) => data[k] !== undefined);
    if (!hasAny) {
      return {
        valid: false,
        reason: 'Incremental backup contains no modified CMS sections to restore.',
      };
    }
  }

  const pkg: BackupPackage = {
    format: 'svcoer-cms-backup',
    version: typeof obj.version === 'number' ? obj.version : 1,
    mode,
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
    baseBackupId: typeof obj.baseBackupId === 'string' ? obj.baseBackupId : null,
    sha256: typeof obj.sha256 === 'string' ? obj.sha256 : undefined,
    data,
    uploadManifest: Array.isArray(obj.uploadManifest)
      ? (obj.uploadManifest as BackupPackage['uploadManifest'])
      : undefined,
  };

  return {
    valid: true,
    pkg,
    entityCounts: countDatabaseEntities(data),
  };
}

export function applyBackupRestore(
  currentDb: CmsDatabase,
  pkg: BackupPackage,
): CmsDatabase {
  const next: CmsDatabase = {
    ...currentDb,
  };

  for (const key of BACKUP_DATA_KEYS) {
    const incoming = pkg.data[key];
    if (incoming !== undefined) {
      (next as unknown as Record<string, unknown>)[key] = structuredClone(incoming);
    }
  }

  // Ensure backup metadata & schedules survive restore safely
  next.backups = currentDb.backups ?? [];
  next.backupSchedule = currentDb.backupSchedule ?? defaultBackupSchedule();
  return next;
}

export function rewriteDomainUrlsInValue<T>(
  value: T,
  oldBaseUrl: string,
  newBaseUrl: string,
): T {
  const from = (oldBaseUrl || '').trim().replace(/\/+$/, '');
  const to = (newBaseUrl || '').trim().replace(/\/+$/, '');
  if (!from || !to || from === to) return value;

  const visit = (node: unknown): unknown => {
    if (typeof node === 'string') {
      return node.split(from).join(to);
    }
    if (Array.isArray(node)) {
      return node.map(visit);
    }
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === 'passwordHash' || k === 'password_hash') {
          out[k] = v;
        } else {
          out[k] = visit(v);
        }
      }
      return out;
    }
    return node;
  };

  return visit(value) as T;
}

const ALLOWED_RESTORE_UPLOAD_EXTS = new Set([
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'docx',
  'xlsx',
]);

export function validateSafeRestoreAssetPath(
  entryPath: string,
): { safe: boolean; targetSubdir?: 'uploads' | 'assets'; relativeName?: string } {
  const normalized = (entryPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || normalized.includes('\0')) {
    return { safe: false };
  }

  let targetSubdir: 'uploads' | 'assets' | undefined;
  let rel = '';

  if (normalized.startsWith('media/uploads/')) {
    targetSubdir = 'uploads';
    rel = normalized.slice('media/uploads/'.length);
  } else if (normalized.startsWith('public/uploads/')) {
    targetSubdir = 'uploads';
    rel = normalized.slice('public/uploads/'.length);
  } else if (normalized.startsWith('uploads/')) {
    targetSubdir = 'uploads';
    rel = normalized.slice('uploads/'.length);
  } else if (normalized.startsWith('media/assets/')) {
    targetSubdir = 'assets';
    rel = normalized.slice('media/assets/'.length);
  } else if (normalized.startsWith('assets/images/')) {
    targetSubdir = 'assets';
    rel = normalized.slice('assets/images/'.length);
  }

  if (!targetSubdir || !rel || rel.includes('/')) {
    return { safe: false };
  }

  const lower = rel.toLowerCase();
  const parts = lower.split('.');
  if (parts.length < 2) return { safe: false };
  const ext = parts[parts.length - 1];
  if (!ALLOWED_RESTORE_UPLOAD_EXTS.has(ext)) {
    return { safe: false };
  }
  // Block dangerous intermediate extensions like .php.jpg
  for (let i = 1; i < parts.length - 1; i += 1) {
    if (['php', 'phtml', 'phar', 'sh', 'exe', 'js', 'html'].includes(parts[i])) {
      return { safe: false };
    }
  }

  return { safe: true, targetSubdir, relativeName: rel };
}

export function computeNextRunIso(
  frequency: BackupFrequency,
  fromDate = new Date(),
): string {
  const ms =
    frequency === 'hourly'
      ? 60 * 60 * 1000
      : frequency === 'weekly'
        ? 7 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
  return new Date(fromDate.getTime() + ms).toISOString();
}

export function defaultBackupSchedule(): BackupScheduleConfig {
  return {
    enabled: false,
    frequency: 'daily',
    mode: 'incremental',
    destination: 'local',
    autoExportJson: true,
    retentionCount: 14,
    scpConfig: {
      host: '',
      port: 22,
      username: '',
      remoteDir: '/var/backups/svcoer-cms',
      keyPath: '',
    },
    webhookUrl: '',
  };
}

