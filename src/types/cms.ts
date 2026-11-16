export type UserRole =
  | 'super_admin'
  | 'content_editor'
  | 'department_admin'
  | 'iqac_officer'
  | 'exam_controller'
  | 'specific_page_editor';

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
  committeeGroup: string;
  sortOrder: number;
}

export type DepartmentSubPageType = string;

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
  sortOrder?: number;
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

export type CampusEventCategory = string;

export interface CampusEvent {
  id: number;
  title: string;
  eventDate: string;
  category: CampusEventCategory;
  departmentSlug?: string;
  summary: string;
  contentHtml: string;
  imageUrl?: string;
  documentUrl?: string;
  isFeatured: boolean;
  sortOrder?: number;
}

export type DocumentCategory = string;

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
  sortOrder?: number;
}

export interface GalleryAlbum {
  id: number;
  title: string;
  category: string;
  eventDate: string;
  coverUrl: string;
  sortOrder?: number;
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
  sortOrder?: number;
}

export type AdminModuleKey =
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

export interface CmsUser {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  assignedDepartmentId?: number | null;
  allowedCategories?: string[];
  allowedPageIds?: number[];
  allowedModules?: AdminModuleKey[];
  allowedDepartmentIds?: number[];
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
  schemaVersion?: number;
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
  designPreset?: 'heritage-navy' | 'modern-slate' | 'emerald-campus' | 'crimson-scholar';
  fontHeading?: string;
  fontBody?: string;
  cardRadius?: 'sharp' | 'rounded' | 'soft';
  headerStyle?: 'classic' | 'compact';
  customCss?: string;
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
  maxPhotoUploadMb?: number;
  maxDocumentUploadMb?: number;
  autoCropImages?: boolean;
  homeSections?: HomeSectionsConfig;
  customHomeComponents?: CustomHomeComponent[];
  researchSliderSlides?: ConferenceSlide[];
}

export type BackupMode = 'full' | 'incremental';
export type BackupDestination = 'local' | 'scp' | 'webhook';
export type BackupFrequency = 'hourly' | 'daily' | 'weekly';

export interface ScpConfig {
  host: string;
  port: number;
  username: string;
  remoteDir: string;
  keyPath?: string;
}

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: BackupFrequency;
  mode: BackupMode;
  destination: BackupDestination;
  autoExportJson: boolean;
  retentionCount: number;
  scpConfig?: ScpConfig;
  webhookUrl?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: string;
}

export interface BackupRecord {
  id: string;
  createdAt: string;
  createdBy: string;
  mode: BackupMode;
  destination: BackupDestination;
  filename: string;
  sizeBytes: number;
  sha256: string;
  baseBackupId?: string | null;
  notes?: string;
  entityCounts: Record<string, number>;
  changedKeys?: string[];
  remoteStatus?: string;
  archiveType?: 'json' | 'site-zip';
  mediaCount?: number;
  codeCount?: number;
}

export interface BackupPackage {
  format: 'svcoer-cms-backup';
  version: number;
  mode: BackupMode;
  createdAt: string;
  baseBackupId?: string | null;
  sha256?: string;
  data: Partial<Omit<CmsDatabase, 'backups' | 'backupSchedule'>>;
  uploadManifest?: { filename: string; sizeBytes: number; mtimeMs: number }[];
}

export interface SiteMigrationManifest {
  format: 'svcoer-full-site-migration';
  version: number;
  createdAt: string;
  createdBy: string;
  sourceOrigin: string;
  sourceBaseUrl: string;
  databaseSummary: Record<string, number>;
  mediaFiles: string[];
  codeFilesCount: number;
  sha256: string;
}

export type AlumniApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface AlumniProfile {
  id: number;
  fullName: string;
  email: string;
  passwordHash?: string;
  phone?: string;
  graduationYear: number;
  departmentCode: string;
  departmentName: string;
  degree: string;
  currentCompany: string;
  designation: string;
  location: string;
  chapter: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  photoUrl: string;
  bio: string;
  mentorshipAreas?: string[];
  openToMentorship: boolean;
  isFeatured: boolean;
  status: AlumniApprovalStatus;
  sortOrder: number;
  registeredAt: string;
}

export type AlumniJobType = string;
export type AlumniJobStatus = 'open' | 'closed' | 'pending';

export interface AlumniJob {
  id: number;
  title: string;
  company: string;
  location: string;
  jobType: AlumniJobType;
  departmentFocus: string;
  experienceRange: string;
  compensation: string;
  description: string;
  applyUrlOrEmail: string;
  postedByAlumniName: string;
  postedByBatch: string;
  deadlineDate: string;
  status: AlumniJobStatus;
  postedAt: string;
  sortOrder: number;
}

export interface AlumniEventChapter {
  id: number;
  title: string;
  chapter: string;
  eventDate: string;
  venue: string;
  organizer: string;
  description: string;
  bannerUrl: string;
  registrationUrl?: string;
  rsvpCount: number;
  isActive: boolean;
  sortOrder: number;
}

export interface AlumniDiscussionTopic {
  id: number;
  slug: string;
  title: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AlumniDiscussionComment {
  id: number;
  postId: number;
  authorAlumniId?: number | null;
  authorName: string;
  authorBatch: string;
  content: string;
  createdAt: string;
}

export interface AlumniDiscussionPost {
  id: number;
  topicId: number;
  title: string;
  content: string;
  authorAlumniId?: number | null;
  authorName: string;
  authorBatch: string;
  authorDesignation?: string;
  isPinned: boolean;
  status: AlumniApprovalStatus;
  createdAt: string;
  updatedAt?: string;
  comments: AlumniDiscussionComment[];
}

export interface AlumniAchiever {
  id: number;
  fullName: string;
  batchYear: number;
  departmentCode: string;
  designation: string;
  organization: string;
  awardTitle: string;
  citation: string;
  photoUrl: string;
  linkedinUrl?: string;
  sortOrder: number;
}

export interface AlumniEndowmentPledge {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  batchYear: number;
  departmentCode: string;
  pledgeType: string;
  amountOrSupport: string;
  message: string;
  status: 'pending' | 'acknowledged' | 'fulfilled';
  submittedAt: string;
}

export interface AlumniSettings {
  heroTitle: string;
  heroSubtitle: string;
  associationRegNo: string;
  coordinatorName: string;
  coordinatorEmail: string;
  allowSelfRegistration: boolean;
  allowPublicJobPosting: boolean;
  enableDiscussions?: boolean;
  requireDiscussionApproval?: boolean;
}

export interface AlumniData {
  settings: AlumniSettings;
  profiles: AlumniProfile[];
  jobs: AlumniJob[];
  events: AlumniEventChapter[];
  discussionTopics?: AlumniDiscussionTopic[];
  discussions?: AlumniDiscussionPost[];
  achievers?: AlumniAchiever[];
  pledges?: AlumniEndowmentPledge[];
}

// International & National Conferences Module
export interface ConferenceTrack {
  id: number;
  title: string;
  chair?: string;
  description: string;
}

export interface ConferenceImportantDate {
  id: number;
  label: string;
  date: string;
  statusNote?: string;
}

export interface ConferencePerson {
  id: number;
  kind: 'keynote' | 'committee';
  role: string;
  name: string;
  designation: string;
  affiliation: string;
  email?: string;
  phone?: string;
  photoUrl: string;
  bio?: string;
  sortOrder: number;
}

export interface ConferenceScheduleItem {
  id: number;
  dayLabel: string;
  timeSlot: string;
  trackTitle: string;
  sessionTitle: string;
  speakerOrChair: string;
  venue: string;
}

export interface ConferenceFeeTier {
  id: number;
  categoryLabel: string;
  inrAmount: string;
  usdAmount?: string;
  includesNote?: string;
}

export interface ConferenceSlide {
  id: number;
  title: string;
  caption: string;
  imageUrl: string;
  ctaLabel?: string;
  ctaLink?: string;
}

export interface Conference {
  id: number;
  slug: string;
  title: string;
  shortName: string;
  scope: string;
  theme: string;
  startDate: string;
  endDate: string;
  venue: string;
  mode: string;
  organizingDepartment: string;
  indexingPartners: string[];
  contactEmail: string;
  contactPhone: string;
  bannerUrl: string;
  heroSlides?: ConferenceSlide[];
  brochureUrl?: string;
  templateUrl?: string;
  overviewHtml: string;
  cfpHtml: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
  tracks: ConferenceTrack[];
  importantDates: ConferenceImportantDate[];
  people: ConferencePerson[];
  schedule: ConferenceScheduleItem[];
  feeTiers: ConferenceFeeTier[];
}

export type ConferencePaperStatus =
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'revision_required'
  | 'rejected';

export interface ConferenceSubmission {
  id: number;
  conferenceId: number;
  trackingCode: string;
  paperTitle: string;
  trackTitle: string;
  authorName: string;
  authorEmail: string;
  authorPhone: string;
  affiliation: string;
  coAuthors?: string;
  abstractText: string;
  manuscriptUrl?: string;
  status: ConferencePaperStatus;
  reviewerNote?: string;
  submittedAt: string;
}

export interface ConferenceRegistration {
  id: number;
  conferenceId: number;
  regCode: string;
  attendeeName: string;
  email: string;
  phone: string;
  affiliation: string;
  designation: string;
  feeCategory: string;
  participationMode: string;
  paperTrackingCode?: string;
  paymentRef?: string;
  status: 'registered' | 'verified' | 'cancelled';
  registeredAt: string;
}

// Engineering College Portals: Training & Placement + AICTE/UGC Grievance Redressal
export interface PlacementYearStat {
  id: number;
  academicYear: string;
  branch: string;
  eligibleStudents: number;
  placedStudents: number;
  highestPackageLpa: number;
  averagePackageLpa: number;
  topRecruitersList: string;
  sortOrder: number;
}

export interface PlacementStory {
  id: number;
  studentName: string;
  branch: string;
  company: string;
  packageLpa: string;
  batchYear: string;
  photoUrl: string;
  quote: string;
  sortOrder: number;
}

export interface PlacementsData {
  summaryNote: string;
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  stats: PlacementYearStat[];
  stories: PlacementStory[];
}

export type GrievanceStatus = 'submitted' | 'in_review' | 'resolved' | 'closed';

export interface GrievanceTicket {
  id: number;
  ticketCode: string;
  complainantName: string;
  complainantRole: string;
  email: string;
  phone: string;
  departmentOrCell: string;
  category: string;
  subject: string;
  description: string;
  attachmentUrl?: string;
  status: GrievanceStatus;
  resolutionNote?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface CmsDatabase {
  schemaVersion?: number;
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
  alumni?: AlumniData;
  conferences?: Conference[];
  conferenceSubmissions?: ConferenceSubmission[];
  conferenceRegistrations?: ConferenceRegistration[];
  placements?: PlacementsData;
  grievances?: GrievanceTicket[];
  users: (CmsUser & { passwordHash: string })[];
  auditLogs: AuditLogEntry[];
  settings: SiteSettings;
  backups?: BackupRecord[];
  backupSchedule?: BackupScheduleConfig;
}

export interface SearchResultItem {
  id: string;
  type: 'page' | 'department' | 'faculty' | 'document' | 'notice' | 'alumni' | 'conference' | 'placement';
  title: string;
  subtitle: string;
  url: string;
  meta: string;
}


