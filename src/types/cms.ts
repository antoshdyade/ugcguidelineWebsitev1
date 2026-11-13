export type UserRole =
  | 'super_admin'
  | 'content_editor'
  | 'department_admin'
  | 'iqac_officer'
  | 'exam_controller';

export type UgcCategorySlug = string;

export interface CmsCategory {
  id: number;
  slug: UgcCategorySlug;
  name: string;
  shortLabel?: string;
  ugcCode: string;
  sortOrder: number;
  description: string;
  showInMenu?: boolean;
  showOnHome?: boolean;
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

export type DepartmentSubPageType =
  | 'general'
  | 'gallery'
  | 'library'
  | 'notice_board'
  | 'events'
  | 'notes_syllabus'
  | 'achievements_students'
  | 'achievements_faculty'
  | 'celebrations';

export interface DepartmentSubPagePhoto {
  id: number;
  imageUrl: string;
  caption: string;
}

export interface DepartmentSubPageItem {
  id: number;
  title: string;
  date?: string;
  badge?: string;
  description?: string;
  url?: string;
  sourceType?: 'upload' | 'external';
  imageUrl?: string;
}

export interface DepartmentSubPage {
  id: number;
  departmentId: number;
  slug: string;
  title: string;
  pageType?: DepartmentSubPageType;
  contentHtml: string;
  photos?: DepartmentSubPagePhoto[];
  items?: DepartmentSubPageItem[];
  sortOrder: number;
  isPublished: boolean;
  updatedAt: string;
}

export interface FacultyCustomField {
  id: string;
  label: string;
  value: string;
  fieldType?: 'text' | 'url';
}

export interface FacultyMember {
  id: number;
  departmentId: number;
  name: string;
  designation: string;
  qualification: string;
  specialization: string;
  email: string;
  phone?: string;
  experienceYears: number;
  photoUrl: string;
  externalProfileUrl?: string;
  externalProfileLabel?: string;
  customFields?: FacultyCustomField[];
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
  photoUrl?: string;
}

export interface DepartmentLibraryInfo {
  title?: string;
  description: string;
  totalVolumes?: number;
  seatingCapacity?: number;
  incharge?: string;
  timings?: string;
  photoUrl?: string;
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
  library?: DepartmentLibraryInfo;
  facultyFieldSchema?: string[];
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
  sourceType?: 'upload' | 'external';
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
  allowedCategories?: string[];
  allowedPageIds?: number[];
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

export type HomeComponentPlacement =
  | 'after-hero'
  | 'after-about'
  | 'after-depts'
  | 'before-footer';

export interface CustomHomeComponent {
  id: number;
  title: string;
  placement: HomeComponentPlacement;
  sortOrder: number;
  isActive: boolean;
  contentHtml: string;
}

export interface HomeSectionsConfig {
  showTicker: boolean;
  showSlider: boolean;
  showStatsAndRecognitions: boolean;
  showAboutAndDownloads: boolean;
  showApprovedAndVision: boolean;
  showLeadershipDesk: boolean;
  showExaminationSpotlight: boolean;
  showDepartments: boolean;
  showCategoriesDirectory: boolean;
  showEventsAndRecruiters: boolean;
  aboutHeading?: string;
  downloadsHeading?: string;
  leadershipHeading?: string;
  examinationHeading?: string;
  departmentsHeading?: string;
  categoriesHeading?: string;
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
  homeSections?: HomeSectionsConfig;
  customHomeComponents?: CustomHomeComponent[];
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
