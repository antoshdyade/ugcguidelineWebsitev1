export type UserRole =
  | 'super_admin'
  | 'content_editor'
  | 'department_admin'
  | 'iqac_officer';

export type UgcCategorySlug =
  | 'about-hei'
  | 'administration'
  | 'academics'
  | 'admissions-fee'
  | 'research'
  | 'student-life'
  | 'alumni'
  | 'information-corner';

export interface CmsCategory {
  id: number;
  slug: UgcCategorySlug;
  name: string;
  ugcCode: string;
  sortOrder: number;
  description: string;
}

export interface CmsPage {
  id: number;
  categorySlug: UgcCategorySlug;
  slug: string;
  title: string;
  subtitle: string;
  contentHtml: string;
  attachedPdfUrl?: string;
  attachedPdfLabel?: string;
  isPublished: boolean;
  sortOrder: number;
  updatedAt: string;
  updatedBy: string;
}

export interface LeadershipProfile {
  id: number;
  roleTitle: string;
  name: string;
  qualification: string;
  email: string;
  phone: string;
  photoUrl: string;
  bio: string;
  committeeGroup: 'statutory' | 'governance' | 'icc' | 'academic_leadership';
  sortOrder: number;
}

export interface DepartmentSubPage {
  id: number;
  departmentId: number;
  slug: string;
  title: string;
  contentHtml: string;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: string;
}

export interface FacultyMember {
  id: number;
  departmentId: number;
  name: string;
  designation: string;
  qualification: string;
  specialization: string;
  email: string;
  experienceYears: number;
  photoUrl: string;
  isHod: boolean;
  sortOrder: number;
}

export interface DepartmentLab {
  id: number;
  departmentId: number;
  name: string;
  areaSqFt: number;
  equipmentSummary: string;
  incharge: string;
}

export interface Department {
  id: number;
  slug: string;
  code: string;
  name: string;
  shortName: string;
  establishedYear: number;
  intakeCapacity: number;
  nbaStatus: string;
  hodName: string;
  hodMessage: string;
  overview: string;
  vision: string;
  mission: string;
  heroImageUrl: string;
  subPages: DepartmentSubPage[];
  faculty: FacultyMember[];
  labs: DepartmentLab[];
}

export interface HeroSlide {
  id: number;
  title: string;
  caption: string;
  imageUrl: string;
  ctaLabel: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
}

export interface TickerItem {
  id: number;
  text: string;
  linkUrl: string;
  badgeText?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CampusEvent {
  id: number;
  title: string;
  eventDate: string;
  category: 'Event' | 'Notice' | 'Achievement' | 'Circular' | 'Placement';
  departmentSlug?: string;
  summary: string;
  contentHtml: string;
  imageUrl?: string;
  documentUrl?: string;
  isFeatured: boolean;
}

export type DocumentCategory =
  | 'Fee Structure'
  | 'Academic Calendar'
  | 'Syllabus'
  | 'UGC & AICTE Approvals'
  | 'NAAC / NBA / NIRF'
  | 'Annual Reports & Audits'
  | 'Circulars & Forms';

export interface CmsDocument {
  id: number;
  title: string;
  category: DocumentCategory;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  isQuickLink: boolean;
}

export interface GalleryAlbum {
  id: number;
  title: string;
  category: string;
  eventDate: string;
  coverUrl: string;
  photos: {
    id: number;
    imageUrl: string;
    caption: string;
    altText: string;
  }[];
}

export interface TelephoneEntry {
  id: number;
  section: string;
  officerName: string;
  designation: string;
  extension: string;
  directPhone: string;
  email: string;
}

export interface CmsUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  assignedDepartmentId?: number | null;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface AuditLogEntry {
  id: number;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityTitle: string;
  timestamp: string;
}

export interface SiteSettings {
  trustName?: string;
  institutionName: string;
  shortCode: string;
  logoUrl?: string;
  affiliation: string;
  aicteCode: string;
  dteCode: string;
  address: string;
  phone: string;
  email: string;
  emergencyHelpline: string;
  antiRaggingHelpline: string;
  defaultPaletteId: string;
  primaryColor: string;
  secondaryColor: string;
  aboutSummary?: string;
  aboutImageUrl?: string;
  visionText?: string;
  missionItems?: string[];
  highlightsStats?: { label: string; value: string }[];
  approvedBodies?: { name: string; url: string }[];
  recruiters?: string[];
  accreditationHighlights: string[];
  topBarLinks: { label: string; url: string }[];
  footerColumns: {
    title: string;
    links: { label: string; url: string }[];
  }[];
  socialLinks: {
    facebook: string;
    linkedin: string;
    youtube: string;
    twitter: string;
  };
  mapEmbedQuery: string;
}

export interface CmsDatabase {
  categories: CmsCategory[];
  pages: CmsPage[];
  leadership: LeadershipProfile[];
  departments: Department[];
  sliders: HeroSlide[];
  ticker: TickerItem[];
  events: CampusEvent[];
  documents: CmsDocument[];
  gallery: GalleryAlbum[];
  telephoneDirectory: TelephoneEntry[];
  users: (CmsUser & { passwordHash: string })[];
  auditLogs: AuditLogEntry[];
  settings: SiteSettings;
}

export interface SearchResultItem {
  id: string;
  type: 'page' | 'department' | 'faculty' | 'document' | 'notice';
  title: string;
  subtitle: string;
  url: string;
  meta: string;
}
