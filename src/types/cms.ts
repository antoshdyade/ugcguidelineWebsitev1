export type UserRole =
  | 'super_admin'
  | 'content_editor'
  | 'department_admin'
  | 'iqac_officer'
  | 'exam_controller'
  | 'specific_page_editor';

export type UgcCategorySlug = string;

export type MenuPlacementLocation = 'main' | 'more' | 'hidden';

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
  menuLocation?: MenuPlacementLocation;
}

export interface HeaderPortalMenuItem {
  id: number;
  label: string;
  url: string;
  menuLocation: MenuPlacementLocation;
  sortOrder: number;
  badge?: string;
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
  showShareBar?: boolean;
  metaDescription?: string;
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
  | 'sports'
  | 'facilities'
  | 'grievances'
  | 'seo'
  | 'analytics';

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
  socialMediaLinks?: SocialMediaLink[];
  socialSharing?: SocialSharingConfig;
  mapEmbedQuery: string;
  maxPhotoUploadMb?: number;
  maxDocumentUploadMb?: number;
  autoCropImages?: boolean;
  homeSections?: HomeSectionsConfig;
  customHomeComponents?: CustomHomeComponent[];
  researchSliderSlides?: ConferenceSlide[];
  portalMenuItems?: HeaderPortalMenuItem[];
  grievancePortal?: GrievancePortalConfig;
  intakePrograms?: SanctionedIntakeProgram[];
}

export type SocialPlatformKey =
  | 'facebook'
  | 'linkedin'
  | 'instagram'
  | 'youtube'
  | 'twitter'
  | 'whatsapp'
  | 'telegram'
  | 'github'
  | 'custom';

export interface SocialMediaLink {
  id: number;
  platform: SocialPlatformKey | string;
  label: string;
  url: string;
  handle?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SocialSharingConfig {
  enabled: boolean;
  showIconsInHeader: boolean;
  showIconsInFooter: boolean;
  showOnPages: boolean;
  showOnResearch: boolean;
  showOnConferences: boolean;
  showOnPortals: boolean;
  shareHeading: string;
  defaultHashtags: string;
  twitterHandle?: string;
  platforms: {
    whatsapp: boolean;
    linkedin: boolean;
    twitter: boolean;
    facebook: boolean;
    telegram: boolean;
    email: boolean;
    copyLink: boolean;
    nativeShare: boolean;
  };
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

export interface ConferenceCustomSection {
  id: number;
  title: string;
  badge?: string;
  contentHtml: string;
  sortOrder?: number;
}

export interface ConferencePosterItem {
  id: number;
  posterCode: string;
  title: string;
  authors: string;
  affiliation: string;
  track?: string;
  abstract?: string;
  imageUrl?: string;
  posterPdfUrl?: string;
  awardNote?: string;
  sortOrder?: number;
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
  submissionMode?: 'portal' | 'external' | 'closed';
  externalSubmissionUrl?: string;
  externalSubmissionLabel?: string;
  submissionInstructionsHtml?: string;
  enablePosterPresentation?: boolean;
  posterDimensions?: string;
  posterGuidelinesHtml?: string;
  posterTemplateUrl?: string;
  posterPrizesText?: string;
  posterItems?: ConferencePosterItem[];
  overviewHtml: string;
  cfpHtml: string;
  customSections?: ConferenceCustomSection[];
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
  presentationType?: string;
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
  entryType?: string;
  headline?: string;
  roleOrAward?: string;
  isFeatured?: boolean;
  sortOrder: number;
}

export interface PlacementNotice {
  id: number;
  title: string;
  noticeDate: string;
  category: string;
  summary: string;
  attachmentUrl?: string;
  linkLabel?: string;
  isPinned?: boolean;
  sortOrder: number;
}

export interface PlacementCustomCard {
  title: string;
  subtitle?: string;
  badge?: string;
  description?: string;
  linkUrl?: string;
  linkLabel?: string;
}

export interface PlacementCustomSection {
  id: number;
  title: string;
  subtitle?: string;
  sectionType: 'table' | 'cards' | 'brochure' | 'html';
  htmlContent?: string;
  tableHeaders?: string[];
  tableRows?: string[][];
  cards?: PlacementCustomCard[];
  ctaLabel?: string;
  ctaUrl?: string;
  isPublished: boolean;
  sortOrder: number;
}

export interface PlacementDrive {
  id: number;
  company: string;
  roleTitle: string;
  packageLpa: string;
  driveDate: string;
  eligibleBranches: string;
  applyUrl?: string;
  status: 'upcoming' | 'ongoing' | 'open' | 'completed';
  sortOrder: number;
}

export interface SanctionedIntakeProgram {
  id: number;
  code: string;
  programName: string;
  level: string;
  sanctionedIntake: number;
  accreditationStatus: string;
  annualFee: string;
  sortOrder: number;
}

export interface PlacementsData {
  summaryNote: string;
  coordinatorName: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  brochureUrl?: string;
  brochureLabel?: string;
  stats: PlacementYearStat[];
  stories: PlacementStory[];
  upcomingDrives?: PlacementDrive[];
  notices?: PlacementNotice[];
  customSections?: PlacementCustomSection[];
}

export type GrievanceStatus = 'submitted' | 'in_review' | 'resolved' | 'closed';

export interface GrievanceCommitteeMember {
  id: number;
  name: string;
  roleTitle: string;
  designation: string;
  committeeName: string;
  email: string;
  phone: string;
  photoUrl: string;
  sortOrder: number;
}

export interface GrievancePortalConfig {
  heroTitle: string;
  heroSubtitle: string;
  ombudspersonName: string;
  ombudspersonDesignation: string;
  ombudspersonEmail: string;
  ombudspersonPhone: string;
  ombudspersonPhotoUrl: string;
  antiRaggingSquadPhone: string;
  iccCoordinatorName: string;
  iccCoordinatorEmail: string;
  ugcAffidavitUrl: string;
  slaAcknowledgementHours: string;
  slaResolutionDays: string;
  charterHtml: string;
  committeeMembers: GrievanceCommitteeMember[];
}

export interface GrievanceTicket {
  id: number;
  ticketCode: string;
  complainantName: string;
  complainantRole: string;
  email: string;
  phone: string;
  departmentOrCell: string;
  category: string;
  urgency?: 'Normal' | 'High' | 'Urgent';
  isAnonymous?: boolean;
  subject: string;
  description: string;
  attachmentUrl?: string;
  status: GrievanceStatus;
  resolutionNote?: string;
  submittedAt: string;
  updatedAt: string;
}

export interface SeoRouteOverride {
  id: string;
  routePattern: string;
  title: string;
  description: string;
  keywords?: string;
  ogImageUrl?: string;
  noIndex?: boolean;
}

export interface SeoSettings {
  defaultTitle: string;
  titleSuffix: string;
  defaultDescription: string;
  defaultKeywords: string;
  canonicalBaseUrl: string;
  ogImageUrl: string;
  schemaOrgType: 'CollegeOrUniversity' | 'EducationalOrganization' | 'University' | 'Organization' | 'WebSite';
  enableJsonLd: boolean;
  allowIndexing: boolean;
  googleVerificationCode?: string;
  bingVerificationCode?: string;
  robotsTxtCustom?: string;
  showHitCounterInFooter: boolean;
  hitCounterStartOffset: number;
  pageOverrides: SeoRouteOverride[];
}

export interface HitCounterStats {
  totalHits: number;
  todayHits: number;
  todayDate: string;
  uniqueVisitors: number;
  uniqueTodayHashes?: string[];
  lastHitAt?: string;
}

export type VisitorLogSeverity = 'info' | 'warning' | 'critical';

export type VisitorLogEventType =
  | 'page_view'
  | 'admin_login'
  | 'failed_login'
  | 'alumni_login'
  | 'security_block'
  | 'rate_limit'
  | 'file_upload'
  | 'api_error';

export interface VisitorLogEntry {
  id: number;
  timestamp: string;
  ipAddress: string;
  country: string;
  countryCode: string;
  state: string;
  area: string;
  method: string;
  path: string;
  statusCode: number;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Bot';
  browser: string;
  os: string;
  referrer: string;
  userAgent: string;
  responseTimeMs: number;
  severity: VisitorLogSeverity;
  eventType: VisitorLogEventType;
  threatCategory?: string;
  actorEmail?: string;
}

export interface BlockedIpEntry {
  id: number;
  ipAddress: string;
  reason: string;
  createdAt: string;
  blockedBy: string;
  expiresAt?: string | null;
  hitCount: number;
  autoBlocked?: boolean;
}

export interface SecurityConfig {
  wafEnabled: boolean;
  rateLimitEnabled: boolean;
  autoBlockAttackers: boolean;
  maxRequestsPerMinute: number;
  maxFailedLogins: number;
  lockoutMinutes: number;
  blockScannerProbes: boolean;
  maskExportedIps: boolean;
}

export interface SportsCustomField {
  label: string;
  value: string;
}

export interface SportsPortalConfig {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  directorName: string;
  directorTitle: string;
  directorEmail: string;
  directorPhone: string;
  gymkhanaTimings: string;
  annualFlagshipName: string;
  customFields: SportsCustomField[];
}

export interface SportsFacility {
  id: number;
  name: string;
  facilityType: string;
  dimensionsOrCapacity: string;
  timings: string;
  inchargeName: string;
  description: string;
  imageUrl: string;
  customFields?: SportsCustomField[];
  isPublished: boolean;
  sortOrder: number;
}

export interface SportsEvent {
  id: number;
  title: string;
  eventType: string;
  discipline: string;
  eventDate: string;
  venue: string;
  organizer: string;
  status: 'Upcoming' | 'Registrations Open' | 'Completed';
  registrationUrl?: string;
  description: string;
  bannerUrl: string;
  isPublished: boolean;
  sortOrder: number;
}

export interface SportsAchievement {
  id: number;
  studentOrTeamName: string;
  departmentCode: string;
  batchYear: string;
  sportName: string;
  level: 'University' | 'State' | 'National' | 'International' | 'Zonal / Intercollegiate';
  medalOrRank: string;
  eventName: string;
  eventDate: string;
  photoUrl: string;
  highlights: string;
  isFeatured: boolean;
  sortOrder: number;
}

export interface SportsGalleryItem {
  id: number;
  title: string;
  mediaType: 'Photo' | 'Video';
  category: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  eventDate: string;
  caption: string;
  isPublished: boolean;
  sortOrder: number;
}

export interface SportsNotice {
  id: number;
  title: string;
  noticeDate: string;
  category: string;
  summary: string;
  attachmentUrl?: string;
  registrationLink?: string;
  isPinned: boolean;
  isPublished: boolean;
  sortOrder: number;
}

export interface SportsData {
  config: SportsPortalConfig;
  facilities: SportsFacility[];
  events: SportsEvent[];
  achievements: SportsAchievement[];
  gallery: SportsGalleryItem[];
  notices: SportsNotice[];
}

export interface FacilityCustomField {
  label: string;
  value: string;
}

export interface FacilitiesPortalConfig {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  customFieldPresets: string[];
}

export interface FacilityItem {
  id: number;
  title: string;
  category: string;
  shortSummary: string;
  descriptionHtml: string;
  locationBlock: string;
  capacity: string;
  timings: string;
  inchargeName: string;
  inchargeEmail?: string;
  inchargePhone?: string;
  imageUrl: string;
  brochureUrl?: string;
  customFields: FacilityCustomField[];
  isFeatured: boolean;
  isPublished: boolean;
  sortOrder: number;
}

export interface FacilitiesData {
  config: FacilitiesPortalConfig;
  items: FacilityItem[];
}

export type ResearchProjectStatus = 'Ongoing' | 'Completed' | 'Sanctioned';

export interface ResearchProjectItem {
  id: number;
  title: string;
  fundingAgency: string;
  principalInvestigator: string;
  coInvestigator?: string;
  departmentCode: string;
  grantAmountLakhs: string;
  sanctionYear: string;
  duration?: string;
  status: ResearchProjectStatus | string;
  projectCode?: string;
  summary?: string;
  documentUrl?: string;
  isPublished: boolean;
  sortOrder: number;
}

export type ResearchPatentType =
  | 'Journal / Conference Publication'
  | 'Patent Granted'
  | 'Patent Published'
  | 'Patent Filed'
  | 'Copyright / Design'
  | 'Industry / Academic MoU'
  | 'Incubated Start-up'
  | 'Industry Consultancy';

export interface ResearchPatentItem {
  id: number;
  itemType: ResearchPatentType | string;
  title: string;
  inventorsOrLead: string;
  departmentCode: string;
  referenceNumber: string;
  filingOrGrantDate: string;
  status: string;
  partnerOrAgency?: string;
  summary?: string;
  externalUrl?: string;
  isPublished: boolean;
  sortOrder: number;
}

export interface ResearchPortalConfig {
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  deanName: string;
  deanTitle: string;
  deanEmail: string;
  deanPhone: string;
  totalGrantsHighlight: string;
  activeLabsHighlight: string;
  consultancyPolicyUrl?: string;
}

export interface ResearchPortfolioData {
  config: ResearchPortalConfig;
  projects: ResearchProjectItem[];
  patents: ResearchPatentItem[];
}

export type FeedbackSubmissionType = 'Complaint' | 'Feedback' | 'Suggestion' | 'Appreciation';
export type FeedbackStatus = 'new' | 'forwarded' | 'in_review' | 'resolved' | 'closed';

export interface FeedbackSectionConfig {
  id: number;
  slug: string;
  sectionName: string;
  subsections: string[];
  recipientEmails: string;
  ccEmails?: string;
  inchargeName: string;
  inchargeDesignation?: string;
  slaDays: number;
  autoEmailEnabled: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface FeedbackEntry {
  id: number;
  ticketCode: string;
  submissionType: FeedbackSubmissionType | string;
  sectionSlug: string;
  sectionName: string;
  subsection: string;
  senderName: string;
  senderRole: string;
  senderEmail: string;
  senderPhone?: string;
  departmentOrRollNo?: string;
  rating: number;
  isConfidential?: boolean;
  subject: string;
  message: string;
  attachmentUrl?: string;
  routedToEmails: string;
  emailPushStatus: string;
  status: FeedbackStatus;
  actionTakenNote?: string;
  submittedAt: string;
  updatedAt: string;
}

export type MailTransportMode = 'php_mail' | 'smtp' | 'webhook';
export type SmtpEncryptionType = 'tls' | 'ssl' | 'none';

export interface EmailPushConfig {
  enabled: boolean;
  transportMode: MailTransportMode;
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpEncryption: SmtpEncryptionType;
  smtpUsername: string;
  smtpPassword?: string;
  webhookRelayUrl?: string;
  alertRecipientEmails: string;
  reportRecipientEmails: string;
  pushOnNewFeedback: boolean;
  pushOnNewGrievance: boolean;
  pushOnSecurityAlert: boolean;
  enableScheduledVisitorDigest: boolean;
  digestFrequency: 'daily' | 'weekly';
  lastDigestSentAt?: string;
}

export interface EmailDispatchLogEntry {
  id: number;
  sentAt: string;
  category: 'feedback' | 'grievance' | 'visitor_report' | 'security_alert' | 'test';
  recipientEmails: string;
  subject: string;
  transport: string;
  status: 'sent' | 'queued' | 'failed';
  detail: string;
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
  sports?: SportsData;
  facilities?: FacilitiesData;
  researchPortfolio?: ResearchPortfolioData;
  grievances?: GrievanceTicket[];
  feedbackSections?: FeedbackSectionConfig[];
  feedbackEntries?: FeedbackEntry[];
  emailPushConfig?: EmailPushConfig;
  emailDispatchLogs?: EmailDispatchLogEntry[];
  seo?: SeoSettings;
  hitCounter?: HitCounterStats;
  visitorLogs?: VisitorLogEntry[];
  blockedIps?: BlockedIpEntry[];
  securityConfig?: SecurityConfig;
  users: (CmsUser & { passwordHash: string })[];
  auditLogs: AuditLogEntry[];
  settings: SiteSettings;
  backups?: BackupRecord[];
  backupSchedule?: BackupScheduleConfig;
}

export interface SearchResultItem {
  id: string;
  type: 'page' | 'department' | 'faculty' | 'document' | 'notice' | 'alumni' | 'conference' | 'placement' | 'sports' | 'facility' | 'research';
  title: string;
  subtitle: string;
  url: string;
  meta: string;
}
