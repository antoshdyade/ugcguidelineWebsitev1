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
  | 'directory'
  | 'alumni'
  | 'conferences'
  | 'placements'
  | 'grievances';

export interface RbacModuleOption {
  id: AdminResource;
  label: string;
  description: string;
}

export const ALL_RBAC_MODULE_OPTIONS: RbacModuleOption[] = [
  { id: 'categories', label: 'Categories & Header Menus', description: 'Top nav portals & category ordering' },
  { id: 'pages', label: 'Pages & UGC Portal Content', description: 'Micro-pages selected in Per-Page matrix below' },
  { id: 'departments', label: 'Departments & Microsites', description: 'Department profiles, faculty, labs & sub-pages' },
  { id: 'sliders_events', label: 'Homepage, Sliders, Ticker & Events', description: 'Hero banners, news marquee & campus events' },
  { id: 'leadership', label: 'Leadership & Governance Committees', description: 'Statutory officers, BoG, Academic Council, ICC' },
  { id: 'conferences', label: 'Conferences (Nat\'l / Int\'l)', description: 'Call for papers, tracks, speakers, submissions & reg' },
  { id: 'placements', label: 'Training & Placement Hub', description: 'Branch placement stats, recruiters & stories' },
  { id: 'grievances', label: 'Grievance & Anti-Ragging Helpdesk', description: 'Review tickets & post resolution responses' },
  { id: 'alumni', label: 'Alumni Network, Jobs & Forum', description: 'Profiles, jobs, achievers, discussions & pledges' },
  { id: 'gallery', label: 'Picture Gallery', description: 'Campus photo albums & event pictures' },
  { id: 'documents', label: 'Document Repository & Quick Links', description: 'PDFs, circulars, fees & approvals' },
  { id: 'directory', label: 'Telephone Directory', description: 'Campus extensions & office contacts' },
  { id: 'settings', label: 'Site Settings, Theme & Design', description: 'Colors, fonts, layout & upload size controls' },
  { id: 'users', label: 'Users, RBAC & Website Backup', description: 'Account roles, permissions & .zip migration' },
  { id: 'audit_logs', label: 'Security Audit Logs', description: 'View administrative change history' },
];

export type RbacUserLike = Pick<
  CmsUser,
  | 'role'
  | 'assignedDepartmentId'
  | 'allowedCategories'
  | 'allowedPageIds'
  | 'allowedModules'
  | 'allowedDepartmentIds'
  | 'isActive'
>;

export function canUserAccessResource(
  user: RbacUserLike | null,
  resource: AdminResource,
  targetDepartmentId?: number | null,
): boolean {
  if (!user || !user.isActive) return false;
  const role: UserRole = user.role;

  if (role === 'super_admin') return true;

  const explicitModules = Array.isArray(user.allowedModules) ? user.allowedModules : [];
  const hasExplicitModules = explicitModules.length > 0;
  const explicitDepts = Array.isArray(user.allowedDepartmentIds) ? user.allowedDepartmentIds : [];

  const hasExplicitPageScope =
    (user.allowedCategories?.length ?? 0) > 0 ||
    (user.allowedPageIds?.length ?? 0) > 0;

  // If explicit per-module permissions are granted, honor them directly for any resource
  if (hasExplicitModules) {
    if (resource === 'departments') {
      if (!explicitModules.includes('departments') && role !== 'department_admin') {
        return false;
      }
      if (targetDepartmentId === undefined || targetDepartmentId === null) {
        return explicitModules.includes('departments') || Boolean(user.assignedDepartmentId);
      }
      if (explicitDepts.length > 0) {
        return explicitDepts.includes(targetDepartmentId);
      }
      if (user.assignedDepartmentId) {
        return user.assignedDepartmentId === targetDepartmentId;
      }
      return explicitModules.includes('departments');
    }
    if (resource === 'pages' && (explicitModules.includes('pages') || hasExplicitPageScope)) {
      return true;
    }
    return explicitModules.includes(resource);
  }

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
    case 'alumni':
    case 'conferences':
    case 'placements':
    case 'grievances':
      return role === 'content_editor' || role === 'iqac_officer';
    case 'pages':
      return (
        role === 'content_editor' ||
        role === 'iqac_officer' ||
        role === 'exam_controller' ||
        role === 'specific_page_editor' ||
        hasExplicitPageScope
      );
    case 'documents':
      return (
        role === 'iqac_officer' ||
        role === 'content_editor' ||
        role === 'exam_controller'
      );
    case 'departments':
      if (explicitDepts.length > 0) {
        if (targetDepartmentId === undefined || targetDepartmentId === null) return true;
        return explicitDepts.includes(targetDepartmentId);
      }
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
  if (user.allowedModules?.includes('pages') && user.role === 'specific_page_editor') {
    return true;
  }
  return user.role === 'content_editor' || user.role === 'iqac_officer';
}

export const LEADERSHIP_GROUP_PRESETS = [
  'Statutory Officer',
  'Governing Body',
  'Internal Complaint Committee (ICC)',
  'Academic Leadership',
  'Board of Studies',
  'Finance Committee',
  'Academic Council',
  'Anti-Ragging Committee',
  'Student Grievance Redressal Committee (SGRC)',
] as const;

export function formatCommitteeGroupLabel(group?: string): string {
  const raw = (group || '').trim();
  if (!raw) return 'Leadership & Governance';
  switch (raw) {
    case 'statutory':
      return 'Statutory Officer';
    case 'governance':
      return 'Governing Body';
    case 'icc':
      return 'Internal Complaint Committee (ICC)';
    case 'academic_leadership':
      return 'Academic Leadership';
    default:
      return raw;
  }
}

export function sortByOrder<T extends { id: number; sortOrder?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ao = a.sortOrder ?? a.id;
    const bo = b.sortOrder ?? b.id;
    if (ao !== bo) return ao - bo;
    return a.id - b.id;
  });
}

export function canUserAccessPage(
  user: RbacUserLike | null,
  page: Pick<CmsPage, 'id' | 'categorySlug'>,
): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'super_admin') return true;
  const allowedCats = user.allowedCategories ?? [];
  const allowedPages = user.allowedPageIds ?? [];
  if (allowedPages.length > 0) {
    return allowedPages.includes(page.id);
  }
  if (allowedCats.length > 0) {
    return allowedCats.includes(page.categorySlug);
  }
  if (user.role === 'exam_controller') {
    return page.categorySlug === 'examination';
  }
  if (user.allowedModules?.includes('pages') && user.role === 'specific_page_editor') {
    return true;
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
  db: Pick<CmsDatabase, 'pages' | 'departments' | 'documents' | 'events' | 'conferences'>,
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

  for (const conf of db.conferences || []) {
    if (!conf.isPublished) continue;
    if (
      conf.title.toLowerCase().includes(q) ||
      conf.shortName.toLowerCase().includes(q) ||
      conf.theme.toLowerCase().includes(q) ||
      conf.scope.toLowerCase().includes(q)
    ) {
      results.push({
        id: `conf-${conf.id}`,
        type: 'conference',
        title: `${conf.shortName}: ${conf.title}`,
        subtitle: `${conf.scope} · ${conf.startDate} to ${conf.endDate}`,
        url: `/conference/${conf.slug}`,
        meta: `${conf.organizingDepartment} · ${conf.mode}`,
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
