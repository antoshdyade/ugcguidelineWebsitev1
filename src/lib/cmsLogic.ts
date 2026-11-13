import type {
  CmsDatabase,
  CmsDocument,
  CmsPage,
  CmsUser,
  SearchResultItem,
  UserRole,
} from '../types/cms';

export interface ThemePalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  soft: string;
}

export const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'royal-navy',
    name: 'Royal Navy & Gold',
    primary: '#0F294A',
    secondary: '#B45309',
    soft: '#EFF4FA',
  },
  {
    id: 'emerald-slate',
    name: 'Emerald Green & Slate',
    primary: '#064E3B',
    secondary: '#0F766E',
    soft: '#ECFDF5',
  },
  {
    id: 'crimson-charcoal',
    name: 'Crimson & Charcoal',
    primary: '#7F1D1D',
    secondary: '#B91C1C',
    soft: '#FEF2F2',
  },
];

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const val = bytes / Math.pow(1024, idx);
  return `${val >= 10 || idx === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

export function validateExternalDocumentUrl(
  rawUrl: string,
): { valid: boolean; normalizedUrl?: string; reason?: string } {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, reason: 'External link URL is required.' };
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return { valid: false, reason: 'Unsafe URL scheme is blocked for security.' };
  }
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/assets/')) {
    return { valid: true, normalizedUrl: trimmed };
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      reason: 'External URL must start with https:// or http:// (or a local /uploads/ path).',
    };
  }
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { valid: false, reason: 'External URL must include a valid domain name.' };
    }
    return { valid: true, normalizedUrl: parsed.toString() };
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }
}

const BLOCKED_EXTENSIONS = new Set([
  'php',
  'phtml',
  'php3',
  'php4',
  'php5',
  'phar',
  'exe',
  'sh',
  'bash',
  'bat',
  'cmd',
  'js',
  'mjs',
  'cjs',
  'html',
  'htm',
  'svg',
  'cgi',
  'pl',
  'py',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function validateUploadMeta(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  maxBytes = 10 * 1024 * 1024,
): { valid: boolean; reason?: string; safeFilename?: string } {
  const cleanName = filename.trim();
  if (!cleanName || !cleanName.includes('.')) {
    return { valid: false, reason: 'File must have a valid extension.' };
  }
  const parts = cleanName.toLowerCase().split('.');
  // Check all extension segments (blocks double extensions like shell.php.jpg)
  for (let i = 1; i < parts.length; i += 1) {
    if (BLOCKED_EXTENSIONS.has(parts[i])) {
      return {
        valid: false,
        reason: `Executable or script extension ".${parts[i]}" is blocked for security.`,
      };
    }
  }
  const ext = parts[parts.length - 1];
  if (!['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx'].includes(ext)) {
    return { valid: false, reason: `Unsupported file extension ".${ext}".` };
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, reason: `Disallowed MIME type "${mimeType}".` };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxBytes) {
    return {
      valid: false,
      reason: `File size must be between 1 B and ${formatBytes(maxBytes)}.`,
    };
  }
  const baseSlug = parts[0].replace(/[^a-z0-9_-]/g, '-').slice(0, 48) || 'doc';
  const safeFilename = `${baseSlug}-${Date.now()}.${ext}`;
  return { valid: true, safeFilename };
}

export type AdminResource =
  | 'users'
  | 'settings'
  | 'audit_logs'
  | 'categories'
  | 'pages'
  | 'sliders_events'
  | 'departments'
  | 'documents'
  | 'gallery'
  | 'leadership'
  | 'directory';

export type RbacUserLike = Pick<
  CmsUser,
  'role' | 'assignedDepartmentId' | 'allowedCategories' | 'allowedPageIds' | 'isActive'
>;

export function canUserAccessResource(
  user: RbacUserLike | null,
  resource: AdminResource,
  targetDepartmentId?: number | null,
): boolean {
  if (!user || !user.isActive) return false;
  const role: UserRole = user.role;

  if (role === 'super_admin') return true;

  const hasExplicitPageScope =
    (user.allowedCategories?.length ?? 0) > 0 ||
    (user.allowedPageIds?.length ?? 0) > 0;

  switch (resource) {
    case 'users':
    case 'settings':
    case 'audit_logs':
      return false;
    case 'sliders_events':
    case 'gallery':
    case 'directory':
      return role === 'content_editor';
    case 'categories':
    case 'leadership':
      return role === 'content_editor' || role === 'iqac_officer';
    case 'pages':
      return (
        role === 'content_editor' ||
        role === 'iqac_officer' ||
        role === 'exam_controller' ||
        hasExplicitPageScope
      );
    case 'documents':
      return (
        role === 'iqac_officer' ||
        role === 'content_editor' ||
        role === 'exam_controller'
      );
    case 'departments':
      if (role !== 'department_admin') return false;
      if (targetDepartmentId === undefined || targetDepartmentId === null) {
        return Boolean(user.assignedDepartmentId);
      }
      return user.assignedDepartmentId === targetDepartmentId;
    default:
      return false;
  }
}

export function canUserAccessCategory(
  user: RbacUserLike | null,
  categorySlug: string,
): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'super_admin') return true;
  const allowedCats = user.allowedCategories ?? [];
  const allowedPages = user.allowedPageIds ?? [];
  if (allowedCats.length > 0) {
    return allowedCats.includes(categorySlug);
  }
  if (allowedPages.length > 0) {
    // User is restricted to explicit individual page IDs rather than full categories
    return false;
  }
  if (user.role === 'exam_controller') {
    return categorySlug === 'examination';
  }
  return user.role === 'content_editor' || user.role === 'iqac_officer';
}

export function canUserAccessPage(
  user: RbacUserLike | null,
  page: Pick<CmsPage, 'id' | 'categorySlug'>,
): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'super_admin') return true;
  const allowedCats = user.allowedCategories ?? [];
  const allowedPages = user.allowedPageIds ?? [];
  if (allowedCats.length > 0 || allowedPages.length > 0) {
    return (
      allowedPages.includes(page.id) ||
      allowedCats.includes(page.categorySlug)
    );
  }
  if (user.role === 'exam_controller') {
    return page.categorySlug === 'examination';
  }
  return user.role === 'content_editor' || user.role === 'iqac_officer';
}

export function filterDocuments(
  docs: CmsDocument[],
  category: string,
  query: string,
): CmsDocument[] {
  const q = query.trim().toLowerCase();
  return docs.filter((doc) => {
    const matchCategory = !category || category === 'All' || doc.category === category;
    if (!matchCategory) return false;
    if (!q) return true;
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.fileName.toLowerCase().includes(q)
    );
  });
}

export function searchCmsContent(
  query: string,
  db: Pick<CmsDatabase, 'pages' | 'departments' | 'documents' | 'events'>,
): SearchResultItem[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const results: SearchResultItem[] = [];

  for (const page of db.pages) {
    if (!page.isPublished) continue;
    const plain = page.contentHtml.replace(/<[^>]+>/g, ' ').toLowerCase();
    if (
      page.title.toLowerCase().includes(q) ||
      page.subtitle.toLowerCase().includes(q) ||
      plain.includes(q)
    ) {
      results.push({
        id: `page-${page.id}`,
        type: 'page',
        title: page.title,
        subtitle: page.subtitle || 'UGC Mandatory Disclosure Page',
        url: `/page/${page.slug}`,
        meta: `UGC Disclosure · ${page.categorySlug.replace('-', ' ')}`,
      });
    }
  }

  for (const dept of db.departments) {
    if (
      dept.name.toLowerCase().includes(q) ||
      dept.code.toLowerCase().includes(q) ||
      dept.overview.toLowerCase().includes(q) ||
      dept.hodName.toLowerCase().includes(q)
    ) {
      results.push({
        id: `dept-${dept.id}`,
        type: 'department',
        title: dept.name,
        subtitle: `Head of Department: ${dept.hodName} · Intake ${dept.intakeCapacity}`,
        url: `/department/${dept.slug}`,
        meta: `Academic Department · ${dept.code}`,
      });
    }
    for (const fac of dept.faculty) {
      if (
        fac.name.toLowerCase().includes(q) ||
        fac.specialization.toLowerCase().includes(q) ||
        fac.designation.toLowerCase().includes(q)
      ) {
        results.push({
          id: `faculty-${fac.id}`,
          type: 'faculty',
          title: fac.name,
          subtitle: `${fac.designation} · ${dept.shortName}`,
          url: `/department/${dept.slug}/faculty`,
          meta: `${fac.qualification} · ${fac.specialization}`,
        });
      }
    }
  }

  for (const doc of db.documents) {
    if (
      doc.title.toLowerCase().includes(q) ||
      doc.category.toLowerCase().includes(q) ||
      doc.fileName.toLowerCase().includes(q)
    ) {
      const isExternal = doc.sourceType === 'external';
      results.push({
        id: `doc-${doc.id}`,
        type: 'document',
        title: doc.title,
        subtitle: isExternal
          ? `${doc.category} · External Link`
          : `${doc.category} · ${formatBytes(doc.fileSizeBytes)}`,
        url: `/quick-links?q=${encodeURIComponent(doc.title)}`,
        meta: `${isExternal ? 'External Document' : 'Downloadable PDF'} · ${doc.uploadedAt}`,
      });
    }
  }

  for (const ev of db.events) {
    if (
      ev.title.toLowerCase().includes(q) ||
      ev.summary.toLowerCase().includes(q) ||
      ev.category.toLowerCase().includes(q)
    ) {
      results.push({
        id: `event-${ev.id}`,
        type: 'notice',
        title: ev.title,
        subtitle: ev.summary,
        url: `/page/circulars-notices`,
        meta: `${ev.category} · ${ev.eventDate}`,
      });
    }
  }

  return results.slice(0, 24);
}
