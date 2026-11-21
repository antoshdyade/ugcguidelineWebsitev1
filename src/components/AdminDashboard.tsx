import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Building2,
  Check,
  CheckSquare,
  Edit3,
  FilePlus2,
  FileText,
  FolderOpen,
  Globe2,
  GraduationCap,
  Image as ImageIcon,
  Landmark,
  Layers,
  LayoutGrid,
  LogOut,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  ALL_RBAC_MODULE_OPTIONS,
  canUserAccessCategory,
  canUserAccessPage,
  canUserAccessResource,
  formatBytes,
  formatCommitteeGroupLabel,
  LEADERSHIP_GROUP_PRESETS,
  sortByOrder,
  THEME_PALETTES,
  validateExternalDocumentUrl,
  validateUploadMeta,
} from '../lib/cmsLogic';
import {
  buildRevisionDiffRows,
  buildSocialShareUrls,
  CONTRIBUTOR_ROLE_PRESETS,
  DEFAULT_CREDITS_PAGE_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_PORTAL_MENU_ITEMS,
  DEFAULT_SOCIAL_MEDIA_LINKS,
  DEFAULT_SOCIAL_SHARING_CONFIG,
  DEPT_SUBPAGE_TYPE_PRESETS,
  DESIGN_PRESETS,
  DOCUMENT_CATEGORY_PRESETS,
  EVENT_CATEGORY_PRESETS,
  normalizeCreditsPageConfig,
  normalizeFooterConfig,
  normalizeHeaderConfig,
  normalizeSocialSharingConfig,
  partitionHeaderMenus,
  SOCIAL_PLATFORM_PRESETS,
  TELEPHONE_SECTION_PRESETS,
} from '../lib/collegeFeaturesLogic';
import { SocialPlatformSvg } from './SocialMediaWidgets';
import {
  getUploadSizeLimitBytes,
  getUploadSizeLimitMb,
  isImageFileMeta,
} from '../lib/imageCrop';
import { AlumniAdminPanel } from './AlumniAdminPanel';
import { BackupRestorePanel } from './BackupRestorePanel';
import { CaptchaWidget } from './CaptchaWidget';
import { ConferenceAdminPanel } from './ConferenceAdminPanel';
import { CustomSelectInput } from './CustomSelectInput';
import { EngineeringPortalsAdmin } from './EngineeringPortalsAdmin';
import { FacilitiesAdminPanel } from './FacilitiesAdminPanel';
import { EmailPushManagerPanel, FeedbackManagerPanel } from './FeedbackAndEmailAdminPanel';
import { ImageUploader } from './ImageUploader';
import { LogSecurityAdminPanel } from './LogSecurityAdminPanel';
import { PerPageRbacSelector } from './PerPageRbacSelector';
import { RichTextEditor } from './RichTextEditor';
import { SeoAdminPanel } from './SeoAdminPanel';
import { SportsAdminPanel } from './SportsAdminPanel';
import type {
  AdminModuleKey,
  AlumniData,
  AuditLogEntry,
  CampusEvent,
  CmsCategory,
  CmsDocument,
  CmsPage,
  CmsUser,
  Conference,
  ConferenceRegistration,
  ConferenceSubmission,
  ContributorMember,
  CustomHomeComponent,
  Department,
  DepartmentSubPage,
  DepartmentSubPageItem,
  DepartmentSubPagePhoto,
  DepartmentSubPageType,
  DocumentCategory,
  EmailDispatchLogEntry,
  EmailPushConfig,
  FacilitiesData,
  FacultyCustomField,
  FacultyMember,
  FeedbackEntry,
  FeedbackSectionConfig,
  GalleryAlbum,
  GrievanceTicket,
  HeaderPortalMenuItem,
  HeroSlide,
  HitCounterStats,
  HomeComponentPlacement,
  LeadershipProfile,
  MenuPlacementLocation,
  PendingContentRevision,
  PlacementsData,
  ResearchPortfolioData,
  SecurityConfig,
  SeoSettings,
  SiteSettings,
  SocialMediaLink,
  SportsData,
  TelephoneEntry,
  TickerItem,
  UgcCategorySlug,
  UserRole,
} from '../types/cms';

type AdminMutateResult<T = Record<string, unknown>> = T & {
  queuedForApproval?: boolean;
  message?: string;
  item?: T;
};

interface AdminStatePayload {
  categories: CmsCategory[];
  pages: CmsPage[];
  departments: Department[];
  sliders: HeroSlide[];
  ticker: TickerItem[];
  events: CampusEvent[];
  documents: CmsDocument[];
  gallery: GalleryAlbum[];
  leadership: LeadershipProfile[];
  telephoneDirectory: TelephoneEntry[];
  alumni?: AlumniData;
  conferences?: Conference[];
  conferenceSubmissions?: ConferenceSubmission[];
  conferenceRegistrations?: ConferenceRegistration[];
  placements?: PlacementsData;
  grievances?: GrievanceTicket[];
  sports?: SportsData;
  facilities?: FacilitiesData;
  researchPortfolio?: ResearchPortfolioData;
  feedbackSections?: FeedbackSectionConfig[];
  feedbackEntries?: FeedbackEntry[];
  emailPushConfig?: EmailPushConfig;
  emailDispatchLogs?: EmailDispatchLogEntry[];
  settings: SiteSettings;
  seo?: SeoSettings;
  hitCounter?: HitCounterStats;
  securityConfig?: SecurityConfig;
  blockedIpCount?: number;
  pendingContentRevisions?: PendingContentRevision[];
  users: CmsUser[];
  auditLogs: AuditLogEntry[];
}

type AdminTab =
  | 'overview'
  | 'approvals'
  | 'categories'
  | 'pages'
  | 'departments'
  | 'homepage'
  | 'leadership'
  | 'conferences'
  | 'placements'
  | 'sports'
  | 'facilities'
  | 'grievances'
  | 'alumni'
  | 'gallery'
  | 'documents'
  | 'directory'
  | 'seo'
  | 'analytics'
  | 'settings'
  | 'users'
  | 'backups';

function resolveInitialAdminTab(u: CmsUser): AdminTab {
  if (u.role === 'super_admin') return 'overview';
  if (u.assignedDepartmentId) return 'departments';
  if (
    u.role === 'exam_controller' ||
    u.role === 'specific_page_editor' ||
    (Array.isArray(u.allowedPageIds) && u.allowedPageIds.length > 0) ||
    (Array.isArray(u.allowedCategories) && u.allowedCategories.length > 0)
  ) {
    return 'pages';
  }
  const orderedResources: [AdminModuleKey, AdminTab][] = [
    ['categories', 'categories'],
    ['pages', 'pages'],
    ['departments', 'departments'],
    ['sliders_events', 'homepage'],
    ['leadership', 'leadership'],
    ['conferences', 'conferences'],
    ['placements', 'placements'],
    ['sports', 'sports'],
    ['facilities', 'facilities'],
    ['grievances', 'grievances'],
    ['alumni', 'alumni'],
    ['gallery', 'gallery'],
    ['documents', 'documents'],
    ['directory', 'directory'],
    ['seo', 'seo'],
    ['analytics', 'analytics'],
    ['settings', 'settings'],
    ['users', 'users'],
  ];
  for (const [resource, tab] of orderedResources) {
    if (canUserAccessResource(u, resource)) return tab;
  }
  return 'overview';
}

function LinkTargetPicker({
  value,
  onChange,
  categories,
  pages,
  departments,
  placeholder = '/page/...',
}: {
  value: string;
  onChange: (val: string) => void;
  categories: CmsCategory[];
  pages: CmsPage[];
  departments: Department[];
  placeholder?: string;
}) {
  const builtinTargets = [
    { label: 'Home Page (/)', url: '/' },
    { label: 'Campus Facilities Showcase (/facilities)', url: '/facilities' },
    { label: 'Sports, Athletics & Gymkhana (/sports)', url: '/sports' },
    { label: 'Research Conferences, Workshops & Events (/conferences)', url: '/conferences' },
    { label: 'Training & Placement (T&P) Hub (/placements)', url: '/placements' },
    { label: 'Online Grievance & Anti-Ragging Helpdesk (/grievance)', url: '/grievance' },
    { label: 'Alumni Network, Jobs & Registration (/alumni)', url: '/alumni' },
    { label: 'Quick Links & Document Repository (/quick-links)', url: '/quick-links' },
    { label: 'Picture Gallery (/gallery)', url: '/gallery' },
    { label: 'Contact & Telephone Directory (/contact)', url: '/contact' },
  ];
  const allUrls = new Set([
    ...builtinTargets.map((b) => b.url),
    ...categories.map((c) => `/category/${c.slug}`),
    ...pages.map((p) => `/page/${p.slug}`),
    ...departments.map((d) => `/department/${d.slug}`),
  ]);
  const safeValue = value ?? '';
  const selectVal = allUrls.has(safeValue) ? safeValue : '__custom__';

  return (
    <div className="space-y-1">
      <select
        aria-label="Choose destination page or category"
        value={selectVal}
        onChange={(e) => {
          if (e.target.value !== '__custom__') onChange(e.target.value);
        }}
        className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
      >
        <option value="__custom__">-- Custom / External URL --</option>
        <optgroup label="Built-In Portals">
          {builtinTargets.map((b) => (
            <option key={b.url} value={b.url}>
              {b.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Categories (Header / Exam / Autonomous)">
          {categories.map((c) => (
            <option key={c.id} value={`/category/${c.slug}`}>
              Category: {c.name} ({c.ugcCode})
            </option>
          ))}
        </optgroup>
        <optgroup label="Disclosure & Exam Micro-Pages">
          {pages.map((p) => (
            <option key={p.id} value={`/page/${p.slug}`}>
              Page: {p.title}
            </option>
          ))}
        </optgroup>
        <optgroup label="Department Microsites">
          {departments.map((d) => (
            <option key={d.id} value={`/department/${d.slug}`}>
              Dept: {d.name}
            </option>
          ))}
        </optgroup>
      </select>
      <input
        type="text"
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1 text-[11px] font-mono rounded border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900"
      />
    </div>
  );
}

export function AdminDashboard({
  onExitToPublic,
  onPublicDataChanged,
}: {
  onExitToPublic: () => void;
  onPublicDataChanged: () => Promise<void>;
}) {
  const [user, setUser] = useState<CmsUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [authChecked, setAuthChecked] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaRefreshSignal, setCaptchaRefreshSignal] = useState(0);
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [state, setState] = useState<AdminStatePayload | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Category & Navigation Builder state
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catName, setCatName] = useState('');
  const [catShort, setCatShort] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catUgcCode, setCatUgcCode] = useState('Autonomous Portal');
  const [catDesc, setCatDesc] = useState('');
  const [catShowMenu, setCatShowMenu] = useState(true);
  const [catShowHome, setCatShowHome] = useState(true);
  const [catMenuLocation, setCatMenuLocation] = useState<MenuPlacementLocation>('main');
  const [catCreatePage, setCatCreatePage] = useState(true);

  // Portal & Custom Top-Bar / "More Portals" Link Manager state
  const [newPortalLabel, setNewPortalLabel] = useState('');
  const [newPortalUrl, setNewPortalUrl] = useState('/page/about-overview');
  const [newPortalLocation, setNewPortalLocation] = useState<MenuPlacementLocation>('main');
  const [editingPortalId, setEditingPortalId] = useState<number | null>(null);

  // Page Builder state
  const [pageFilterCat, setPageFilterCat] = useState<string>('all');
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [pageCat, setPageCat] = useState<UgcCategorySlug>('about-hei');
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageSubtitle, setPageSubtitle] = useState('');
  const [pageSortOrder, setPageSortOrder] = useState<number>(1);
  const [pageHtml, setPageHtml] = useState('<h2>Section Heading</h2><p>Enter institutional disclosure content here.</p>');
  const [pagePdfUrl, setPagePdfUrl] = useState('');
  const [pagePdfLabel, setPagePdfLabel] = useState('');
  const [pagePdfMode, setPagePdfMode] = useState<'upload' | 'external'>('upload');
  const [pagePublished, setPagePublished] = useState(true);
  const [pageShowShareBar, setPageShowShareBar] = useState(true);
  const [pageMetaDescription, setPageMetaDescription] = useState('');
  const [homepageMode, setHomepageMode] = useState<'sliders' | 'sections' | 'components'>('sliders');
  const [settingsSection, setSettingsSection] = useState<'identity' | 'sections' | 'header_footer' | 'credits' | 'metrics' | 'design' | 'social'>('identity');

  // Social Media Icon Addition & Direct Broadcast Composer state
  const [newSocialPlatform, setNewSocialPlatform] = useState<string>('instagram');
  const [newSocialLabel, setNewSocialLabel] = useState('Instagram');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [newSocialHandle, setNewSocialHandle] = useState('');
  const [broadcastSourceKey, setBroadcastSourceKey] = useState<string>('custom');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastSummary, setBroadcastSummary] = useState('');
  const [broadcastUrl, setBroadcastUrl] = useState(() =>
    typeof window !== 'undefined' ? `${window.location.origin}/` : '/',
  );
  const [broadcastTags, setBroadcastTags] = useState('Engineering,NEP2020');
  const [broadcastTagsTouched, setBroadcastTagsTouched] = useState(false);
  const [broadcastCopied, setBroadcastCopied] = useState(false);

  // Super Admin Content Approvals state
  const [approvalFilter, setApprovalFilter] = useState<'pending_approval' | 'approved' | 'rejected' | 'all'>('pending_approval');
  const [approvalNotes, setApprovalNotes] = useState<Record<number, string>>({});
  const [expandedRevId, setExpandedRevId] = useState<number | null>(null);

  // Homepage Custom HTML Components state
  const [editingHomeCompId, setEditingHomeCompId] = useState<number | null>(null);
  const [homeCompTitle, setHomeCompTitle] = useState('');
  const [homeCompPlacement, setHomeCompPlacement] = useState<HomeComponentPlacement>('after-hero');
  const [homeCompHtml, setHomeCompHtml] = useState(
    '<div class="cms-card"><h3>Autonomous Announcement / Widget</h3><p>Add formatted announcements, schedules, or HTML tables here.</p></div>',
  );
  const [homeCompActive, setHomeCompActive] = useState(true);

  // Department Manager state
  const [selectedDeptId, setSelectedDeptId] = useState<number>(1);
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptShort, setNewDeptShort] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptSlug, setNewDeptSlug] = useState('');
  const [newDeptYear, setNewDeptYear] = useState(2026);
  const [newDeptIntake, setNewDeptIntake] = useState(60);
  const [newDeptNba, setNewDeptNba] = useState('AICTE Approved · NEP 2020 Aligned');
  const [newDeptHod, setNewDeptHod] = useState('');
  const [newDeptOverview, setNewDeptOverview] = useState('');
  const [newDeptHero, setNewDeptHero] = useState('/src/assets/images/hero_robotics_lab_1794512596365.jpg');
  const [newDeptShareable, setNewDeptShareable] = useState(true);

  const [deptDraft, setDeptDraft] = useState<Partial<Department>>({});
  const [deptPanelMode, setDeptPanelMode] = useState<'micropages' | 'faculty' | 'labs' | 'library_fields' | 'profile'>('micropages');
  const [newSchemaField, setNewSchemaField] = useState('');

  // Department Sub-page (Micro-page) state
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subTitle, setSubTitle] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [subPageType, setSubPageType] = useState<DepartmentSubPageType>('general');
  const [subHtml, setSubHtml] = useState('<h2>Department Update</h2><p>Enter department micro-page details here.</p>');
  const [subPublished, setSubPublished] = useState(true);
  const [subShareable, setSubShareable] = useState(true);
  const [subPhotos, setSubPhotos] = useState<DepartmentSubPagePhoto[]>([]);
  const [newSubPhotoUrl, setNewSubPhotoUrl] = useState('');
  const [newSubPhotoCaption, setNewSubPhotoCaption] = useState('');
  const [subItems, setSubItems] = useState<DepartmentSubPageItem[]>([]);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDate, setNewItemDate] = useState('2026-11-12');
  const [newItemBadge, setNewItemBadge] = useState('Notice');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemImage, setNewItemImage] = useState('');
  const [newItemSourceType, setNewItemSourceType] = useState<'upload' | 'external'>('external');
  const [newItemUrl, setNewItemUrl] = useState('');

  // Department Faculty state
  const [editingFacId, setEditingFacId] = useState<number | null>(null);
  const [facName, setFacName] = useState('');
  const [facDesignation, setFacDesignation] = useState('Assistant Professor');
  const [facQual, setFacQual] = useState('M.Tech');
  const [facSpec, setFacSpec] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facPhone, setFacPhone] = useState('');
  const [facExp, setFacExp] = useState(5);
  const [facSortOrder, setFacSortOrder] = useState(1);
  const [facPhoto, setFacPhoto] = useState('/src/assets/images/leadership_principal_1794512597061.jpg');
  const [facExtUrl, setFacExtUrl] = useState('');
  const [facExtLabel, setFacExtLabel] = useState('Google Scholar / Profile');
  const [facCustomFields, setFacCustomFields] = useState<FacultyCustomField[]>([]);
  const [newFacFieldLabel, setNewFacFieldLabel] = useState('');
  const [newFacFieldValue, setNewFacFieldValue] = useState('');
  const [newFacFieldType, setNewFacFieldType] = useState<'text' | 'url'>('text');

  // Department Labs state
  const [editingLabId, setEditingLabId] = useState<number | null>(null);
  const [labName, setLabName] = useState('');
  const [labArea, setLabArea] = useState(1400);
  const [labEquip, setLabEquip] = useState('');
  const [labIncharge, setLabIncharge] = useState('');
  const [labPhotoUrl, setLabPhotoUrl] = useState('');
  const [labSortOrder, setLabSortOrder] = useState(1);

  // Homepage / Events state
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [slideTitle, setSlideTitle] = useState('');
  const [slideCaption, setSlideCaption] = useState('');
  const [slideImage, setSlideImage] = useState('/src/assets/images/hero_campus_aerial_1794512596442.jpg');
  const [slideCta, setSlideCta] = useState('Explore');
  const [slideLink, setSlideLink] = useState('/page/about-overview');

  const [tickerText, setTickerText] = useState('');
  const [tickerBadge, setTickerBadge] = useState('Notice');
  const [tickerLink, setTickerLink] = useState('/page/circulars-notices');

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('2026-11-20');
  const [eventCat, setEventCat] = useState<string>('Notice');
  const [eventSummary, setEventSummary] = useState('');
  const [eventImage, setEventImage] = useState('');
  const [eventShareable, setEventShareable] = useState(true);

  // Leadership state
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [leadRole, setLeadRole] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadQual, setLeadQual] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadPhoto, setLeadPhoto] = useState('/src/assets/images/leadership_principal_1794512597061.jpg');
  const [leadBio, setLeadBio] = useState('');
  const [leadGroup, setLeadGroup] = useState<string>('Statutory Officer');
  const [leadSortOrder, setLeadSortOrder] = useState(1);

  // Gallery state
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumCat, setAlbumCat] = useState('Campus');
  const [albumDate, setAlbumDate] = useState('2026-11-12');
  const [albumCover, setAlbumCover] = useState('/src/assets/images/hero_campus_aerial_1794512596442.jpg');
  const [selectedAlbumId, setSelectedAlbumId] = useState<number>(1);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');

  // Document Upload & External URL state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('Circulars & Forms');
  const [docSourceType, setDocSourceType] = useState<'upload' | 'external'>('upload');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docExternalUrl, setDocExternalUrl] = useState('');
  const [docQuickLink, setDocQuickLink] = useState(true);

  // Telephone Directory state
  const [dirSection, setDirSection] = useState('');
  const [dirOfficer, setDirOfficer] = useState('');
  const [dirDesig, setDirDesig] = useState('');
  const [dirExt, setDirExt] = useState('');
  const [dirPhone, setDirPhone] = useState('');
  const [dirEmail, setDirEmail] = useState('');

  // Users & Per-Page / Per-Module RBAC state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('content_editor');
  const [newUserDept, setNewUserDept] = useState<number>(1);
  const [newUserAllowedCats, setNewUserAllowedCats] = useState<string[]>([]);
  const [newUserAllowedPageIds, setNewUserAllowedPageIds] = useState<number[]>([]);
  const [newUserAllowedModules, setNewUserAllowedModules] = useState<AdminModuleKey[]>([]);
  const [newUserAllowedDeptIds, setNewUserAllowedDeptIds] = useState<number[]>([]);
  const [editingPermsUserId, setEditingPermsUserId] = useState<number | null>(null);
  const [permRole, setPermRole] = useState<UserRole>('content_editor');
  const [permDeptId, setPermDeptId] = useState<number>(1);
  const [permAllowedCats, setPermAllowedCats] = useState<string[]>([]);
  const [permAllowedPageIds, setPermAllowedPageIds] = useState<number[]>([]);
  const [permAllowedModules, setPermAllowedModules] = useState<AdminModuleKey[]>([]);
  const [permAllowedDeptIds, setPermAllowedDeptIds] = useState<number[]>([]);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);

  // Settings draft
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings | null>(null);

  const csrfTokenRef = useRef('');
  csrfTokenRef.current = csrfToken;
  const sessionTokenRef = useRef('');
  sessionTokenRef.current = sessionToken;

  const notify = useCallback((type: 'ok' | 'err', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  }, []);

  const clearStoredSession = () => {
    try {
      window.sessionStorage.removeItem('svcoer_admin_session');
    } catch {
      // Ignore storage access restriction
    }
    setSessionToken('');
    setCsrfToken('');
  };

  const saveStoredSession = (token: string, csrf: string) => {
    setSessionToken(token);
    setCsrfToken(csrf);
    try {
      window.sessionStorage.setItem('svcoer_admin_session', JSON.stringify({ sessionToken: token, csrfToken: csrf }));
    } catch {
      // Ignore storage access restriction
    }
  };

  const getStoredToken = useCallback((): string => {
    if (sessionTokenRef.current) return sessionTokenRef.current;
    try {
      const raw = window.sessionStorage.getItem('svcoer_admin_session');
      if (!raw) return '';
      const parsed = JSON.parse(raw) as { sessionToken?: string };
      return parsed.sessionToken || '';
    } catch {
      return '';
    }
  }, []);

  const fetchAdminState = useCallback(async (tokenOverride?: string): Promise<boolean> => {
    const activeToken = tokenOverride ?? getStoredToken();
    setStateLoading(true);
    setStateError('');
    try {
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
      }
      const resp = await fetch('/api/admin/state', {
        credentials: 'include',
        headers,
      });
      if (resp.status === 401) {
        clearStoredSession();
        setUser(null);
        setState(null);
        setLoginError('Session expired or cookies blocked. Please sign in again.');
        return false;
      }
      if (!resp.ok) {
        const errPayload = await resp.json().catch(() => ({}));
        setStateError(errPayload.error || `Failed to load dashboard data (HTTP ${resp.status}).`);
        return false;
      }
      const data = (await resp.json()) as AdminStatePayload;
      setState(data);
      setSettingsDraft(data.settings);
      if (data.gallery[0]) {
        setSelectedAlbumId((prev) => (data.gallery.some((g) => g.id === prev) ? prev : data.gallery[0].id));
      }
      return true;
    } catch {
      setStateError('Unable to reach CMS server while loading workspace data.');
      return false;
    } finally {
      setStateLoading(false);
    }
  }, [getStoredToken]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = getStoredToken();
        const headers: Record<string, string> = {};
        if (storedToken) {
          headers.Authorization = `Bearer ${storedToken}`;
        }
        const resp = await fetch('/api/auth/me', {
          credentials: 'include',
          headers,
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            setCsrfToken(data.csrfToken);
            if (storedToken) setSessionToken(storedToken);
            if (data.user.assignedDepartmentId) {
              setSelectedDeptId(data.user.assignedDepartmentId);
            }
            setActiveTab(resolveInitialAdminTab(data.user));
            if (Array.isArray(data.user.allowedPageIds) && data.user.allowedPageIds.length > 0) {
              setPageFilterCat('all');
            } else if (Array.isArray(data.user.allowedCategories) && data.user.allowedCategories.length > 0) {
              setPageCat(data.user.allowedCategories[0]);
              setPageFilterCat(data.user.allowedCategories[0]);
            }
            await fetchAdminState(storedToken);
          } else {
            clearStoredSession();
          }
        }
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [fetchAdminState, getStoredToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaId, captchaAnswer }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || 'Authentication failed.');
        setCaptchaRefreshSignal((k) => k + 1);
        return;
      }
      const token = String(data.sessionToken || '');
      saveStoredSession(token, String(data.csrfToken || ''));
      setUser(data.user);
      setCaptchaAnswer('');
      if (data.user.assignedDepartmentId) {
        setSelectedDeptId(data.user.assignedDepartmentId);
      }
      setActiveTab(resolveInitialAdminTab(data.user));
      if (Array.isArray(data.user.allowedPageIds) && data.user.allowedPageIds.length > 0) {
        setPageFilterCat('all');
      } else if (Array.isArray(data.user.allowedCategories) && data.user.allowedCategories.length > 0) {
        setPageCat(data.user.allowedCategories[0]);
        setPageFilterCat(data.user.allowedCategories[0]);
      } else {
        setPageFilterCat('all');
      }
      await fetchAdminState(token);
    } catch {
      setLoginError('Network error while connecting to CMS server.');
      setCaptchaRefreshSignal((k) => k + 1);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    clearStoredSession();
    setUser(null);
    setState(null);
    setStateError('');
    setLoginError('');
    setCaptchaId('');
    setCaptchaAnswer('');
  };

  const adminFetch = useCallback(
    async <T = unknown>(url: string, method = 'GET', body?: unknown): Promise<T> => {
      const activeToken = getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfTokenRef.current,
      };
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
      }
      const resp = await fetch(url, {
        method,
        credentials: 'include',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 401) {
        clearStoredSession();
        setUser(null);
        setState(null);
        setLoginError('Session expired. Please sign in again.');
        throw new Error('Session expired.');
      }
      if (!resp.ok) {
        throw new Error((data as { error?: string }).error || 'Operation failed');
      }
      if (method !== 'GET') {
        await fetchAdminState(activeToken);
        await onPublicDataChanged();
      }
      return data as T;
    },
    [fetchAdminState, getStoredToken, onPublicDataChanged],
  );

  const reorderCollection = async <T extends { id: number; sortOrder?: number }>(
    list: T[],
    index: number,
    direction: -1 | 1,
    endpoint: string,
    label: string,
  ) => {
    const ordered = sortByOrder(list);
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const ids = ordered.map((item) => item.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await adminFetch(endpoint, 'PUT', { orderedIds: ids });
      notify('ok', `Reordered ${label}.`);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const activeSettings = settingsDraft ?? state?.settings;
  const maxPhotoMb = getUploadSizeLimitMb(activeSettings, 'photo');
  const maxDocumentMb = getUploadSizeLimitMb(activeSettings, 'document');
  const autoCropEnabled = activeSettings?.autoCropImages !== false;

  useEffect(() => {
    const brand = (activeSettings?.shortCode || activeSettings?.institutionName || '').trim();
    if (brand) {
      document.title = `${brand} — Staff & Admin Console`;
      if (!broadcastTagsTouched) {
        setBroadcastTags(`${brand.replace(/\s+/g, '')},Engineering,NEP2020`);
      }
    }
  }, [activeSettings?.shortCode, activeSettings?.institutionName, broadcastTagsTouched]);

  const renderModerationBadge = (status?: string) => {
    if (status === 'pending_approval') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wide">
          Pending Super Admin Approval
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold uppercase tracking-wide">
          Rejected
        </span>
      );
    }
    return null;
  };

  const uploadBinaryFile = async (file: File): Promise<string> => {
    const isImg = isImageFileMeta(file.name, file.type);
    const maxBytes = getUploadSizeLimitBytes(activeSettings, isImg ? 'photo' : 'document');
    const check = validateUploadMeta(file.name, file.type || 'application/octet-stream', file.size, maxBytes);
    if (!check.valid) {
      throw new Error(check.reason || 'File blocked by security policy.');
    }
    const base64Content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read selected file.'));
      reader.readAsDataURL(file);
    });
    const activeToken = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    };
    if (activeToken) headers.Authorization = `Bearer ${activeToken}`;
    const resp = await fetch('/api/admin/upload', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        fileSizeBytes: file.size,
        base64Content,
      }),
    });
    const payload = await resp.json().catch(() => ({}));
    if (!resp.ok || !payload.fileUrl) {
      throw new Error(payload.error || 'Upload failed.');
    }
    return String(payload.fileUrl);
  };

  if (!authChecked) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center text-sm text-stone-500">
        Checking CMS session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[82vh] flex items-center justify-center px-4 py-12 bg-stone-100 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                Enterprise RBAC CMS
              </p>
              <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white mt-0.5">
                Staff &amp; Admin Portal
              </h1>
            </div>
            <button
              type="button"
              onClick={onExitToPublic}
              className="text-xs font-medium text-stone-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Public Site
            </button>
          </div>

          {loginError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Institutional Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@svcoer.edu.in"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <CaptchaWidget
              idPrefix="admin-login"
              captchaId={captchaId}
              captchaAnswer={captchaAnswer}
              onCaptchaIdChange={setCaptchaId}
              onCaptchaAnswerChange={setCaptchaAnswer}
              refreshSignal={captchaRefreshSignal}
              label="Admin Login Security CAPTCHA *"
            />
            <button
              type="submit"
              disabled={loginBusy}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {loginBusy ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="pt-4 border-t border-stone-200 dark:border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-stone-500 dark:text-slate-400">
              RBAC Demo Accounts (Click to Fill):
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { label: 'Super Admin', e: 'admin@svcoer.edu.in', p: 'Admin@123' },
                { label: 'Content Editor / PRO', e: 'pro@svcoer.edu.in', p: 'Editor@123' },
                { label: 'CSE Dept Admin', e: 'hod.cse@svcoer.edu.in', p: 'Dept@123' },
                { label: 'IQAC Officer', e: 'iqac@svcoer.edu.in', p: 'Iqac@123' },
                { label: 'Controller of Examinations (CoE)', e: 'coe@coe.sveri.ac.in', p: 'Exam@123' },
              ].map((acc, idx) => (
                <button
                  key={acc.e}
                  type="button"
                  onClick={() => {
                    setEmail(acc.e);
                    setPassword(acc.p);
                  }}
                  className={`text-left px-2.5 py-1.5 rounded border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 ${
                    idx === 4 ? 'col-span-2' : ''
                  }`}
                >
                  <span className="font-semibold block text-stone-800 dark:text-slate-200">{acc.label}</span>
                  <span className="text-[11px] text-stone-500 dark:text-slate-400 truncate block">{acc.e}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canCategories = canUserAccessResource(user, 'categories');
  const canPages = canUserAccessResource(user, 'pages');
  const canDepts = canUserAccessResource(user, 'departments');
  const canHomepage = canUserAccessResource(user, 'sliders_events');
  const canLeadership = canUserAccessResource(user, 'leadership');
  const canConferences = canUserAccessResource(user, 'conferences');
  const canPlacements = canUserAccessResource(user, 'placements');
  const canSports = canUserAccessResource(user, 'sports');
  const canFacilities = canUserAccessResource(user, 'facilities');
  const canGrievances = canUserAccessResource(user, 'grievances');
  const canAlumni = canUserAccessResource(user, 'alumni');
  const canGallery = canUserAccessResource(user, 'gallery');
  const canDocs = canUserAccessResource(user, 'documents');
  const canDirectory = canUserAccessResource(user, 'directory');
  const canSeo = canUserAccessResource(user, 'seo');
  const canAnalytics = canUserAccessResource(user, 'analytics');
  const canUsers = canUserAccessResource(user, 'users');
  const canSettings = canUserAccessResource(user, 'settings');

  const pendingApprovalCount = (state?.pendingContentRevisions || []).filter(
    (r) => r.status === 'pending_approval',
  ).length;

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; allowed: boolean }[] = [
    { id: 'overview', label: 'Overview & UGC Audit', icon: <Shield className="w-4 h-4" />, allowed: true },
    {
      id: 'approvals',
      label: `Pending Approvals (${pendingApprovalCount})`,
      icon: <CheckSquare className="w-4 h-4" />,
      allowed: user.role === 'super_admin',
    },
    { id: 'categories', label: 'Categories & Menus', icon: <LayoutGrid className="w-4 h-4" />, allowed: canCategories },
    { id: 'pages', label: 'Pages & Portal Content', icon: <Layers className="w-4 h-4" />, allowed: canPages },
    { id: 'departments', label: 'Departments & Micro-Pages', icon: <Building2 className="w-4 h-4" />, allowed: canDepts },
    { id: 'homepage', label: 'Homepage, Sliders & Events', icon: <ImageIcon className="w-4 h-4" />, allowed: canHomepage },
    { id: 'leadership', label: 'Leadership & Governance', icon: <UserCheck className="w-4 h-4" />, allowed: canLeadership },
    { id: 'conferences', label: 'Research: Conferences & Events', icon: <Globe2 className="w-4 h-4" />, allowed: canConferences },
    { id: 'placements', label: 'Training & Placements', icon: <TrendingUp className="w-4 h-4" />, allowed: canPlacements },
    { id: 'sports', label: 'Sports & Gymkhana', icon: <Trophy className="w-4 h-4" />, allowed: canSports },
    { id: 'facilities', label: 'Campus Facilities', icon: <Landmark className="w-4 h-4" />, allowed: canFacilities },
    { id: 'grievances', label: 'Grievance, Feedback & Mail', icon: <ShieldAlert className="w-4 h-4" />, allowed: canGrievances },
    { id: 'alumni', label: 'Alumni Network & Jobs', icon: <GraduationCap className="w-4 h-4" />, allowed: canAlumni },
    { id: 'gallery', label: 'Picture Gallery', icon: <ImageIcon className="w-4 h-4" />, allowed: canGallery },
    { id: 'documents', label: 'Document Repository', icon: <FolderOpen className="w-4 h-4" />, allowed: canDocs },
    { id: 'directory', label: 'Telephone Directory', icon: <Phone className="w-4 h-4" />, allowed: canDirectory },
    { id: 'seo', label: 'SEO Studio & Hit Counter', icon: <Search className="w-4 h-4" />, allowed: canSeo },
    { id: 'analytics', label: 'Log Analyzer & Security Shield', icon: <Activity className="w-4 h-4" />, allowed: canAnalytics },
    { id: 'settings', label: 'Site Settings, Vision & Design', icon: <Settings className="w-4 h-4" />, allowed: canSettings },
    { id: 'users', label: 'Users, RBAC & Audit', icon: <Users className="w-4 h-4" />, allowed: canUsers },
    { id: 'backups', label: 'Backup, Export & Restore', icon: <Archive className="w-4 h-4" />, allowed: canUsers },
  ];

  const accessibleDepts = (state?.departments || []).filter((d) =>
    canUserAccessResource(user, 'departments', d.id),
  );
  const currentDept =
    accessibleDepts.find((d) => d.id === selectedDeptId) || accessibleDepts[0];
  const currentAlbum =
    state?.gallery.find((a) => a.id === selectedAlbumId) || state?.gallery[0];

  const selectDepartment = (dept: Department) => {
    setSelectedDeptId(dept.id);
    setDeptDraft({ ...dept });
    setEditingSubId(null);
    setSubTitle('');
    setSubSlug('');
    setSubPageType('general');
    setSubPhotos([]);
    setSubItems([]);
    setEditingFacId(null);
    setFacName('');
    setFacPhone('');
    setFacExtUrl('');
    setFacSortOrder(dept.faculty.length + 1);
    setFacCustomFields([]);
    setEditingLabId(null);
    setLabName('');
    setLabPhotoUrl('');
    setLabSortOrder(dept.labs.length + 1);
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950 flex flex-col lg:flex-row">
      {/* Admin Left Sidebar */}
      <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col justify-between">
        <div>
          <div className="pb-4 mb-4 border-b border-stone-200 dark:border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400">
              {user.role.replace('_', ' ')}
            </p>
            <h2 className="text-sm font-bold text-stone-900 dark:text-white mt-0.5 truncate">
              {user.fullName}
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>

          <nav aria-label="Admin Navigation" className="space-y-1">
            {navItems
              .filter((n) => n.allowed)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors text-left ${
                    activeTab === item.id
                      ? 'text-white'
                      : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                  }`}
                  style={activeTab === item.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
          </nav>
        </div>

        <div className="pt-4 mt-6 border-t border-stone-200 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={onExitToPublic}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Public Website</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-5 sm:p-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-6 border-b border-stone-200 dark:border-slate-800">
          <div>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              CMS Console / {navItems.find((n) => n.id === activeTab)?.label}
            </p>
            <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
          </div>
          {statusMsg && (
            <div
              role="status"
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border ${
                statusMsg.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </div>

        {user.role !== 'super_admin' && (
          <div className="mb-5 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
            <strong>Super Admin Approval Workflow Active:</strong> Any record you create, edit, or delete will be queued for Super Admin review before appearing or changing on the public website.
          </div>
        )}

        {/* Loading / Error Resilience */}
        {!state && (
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
            {stateLoading ? (
              <p className="text-sm font-medium text-stone-600 dark:text-slate-300">
                Loading CMS console modules and UGC audit metrics...
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {stateError || 'CMS state could not be loaded.'}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fetchAdminState()}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    Retry Loading
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-slate-700"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && state && (
          <div className="space-y-6">
            {user.role === 'super_admin' && pendingApprovalCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
                <span>
                  <strong>{pendingApprovalCount}</strong> content submission{pendingApprovalCount === 1 ? '' : 's'} from department/editor accounts awaiting your review &amp; approval.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('approvals')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Review Pending Approvals
                </button>
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[
                { label: 'Published UGC Pages', val: state.pages.filter((p) => p.isPublished).length, tab: 'pages' as AdminTab },
                { label: 'Department Microsites', val: state.departments.length, tab: 'departments' as AdminTab },
                { label: 'Repository Documents', val: state.documents.length, tab: 'documents' as AdminTab },
                { label: 'Gallery Albums', val: state.gallery.length, tab: 'gallery' as AdminTab },
                { label: 'Website Visits Counter', val: Number(state.hitCounter?.totalHits || 0).toLocaleString(), tab: 'seo' as AdminTab },
                { label: 'Blocked Attack IPs', val: state.blockedIpCount ?? 0, tab: 'analytics' as AdminTab },
              ].map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => navItems.find((n) => n.id === stat.tab)?.allowed && setActiveTab(stat.tab)}
                  className="text-left p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-stone-400 transition-colors"
                >
                  <p className="text-xs text-stone-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold font-mono-tabular text-stone-900 dark:text-white mt-1">
                    {stat.val}
                  </p>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h2 className="text-base font-bold text-stone-900 dark:text-white mb-3">
                UGC NEP 2020 Mandatory Self-Disclosure Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {state.categories.map((cat) => {
                  const count = state.pages.filter((p) => p.categorySlug === cat.slug && p.isPublished).length;
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-slate-800 text-sm"
                    >
                      <div>
                        <span className="font-mono-tabular text-xs text-stone-500 mr-2">{cat.ugcCode}</span>
                        <span className="font-semibold text-stone-900 dark:text-white">{cat.name}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        <Check className="w-3.5 h-3.5" /> {count} {count === 1 ? 'Page' : 'Pages'} Live
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 1A. SUPER ADMIN CONTENT APPROVAL QUEUE */}
        {activeTab === 'approvals' && user.role === 'super_admin' && state && (() => {
          const allRevs = state.pendingContentRevisions || [];
          const counts = {
            pending_approval: allRevs.filter((r) => r.status === 'pending_approval').length,
            approved: allRevs.filter((r) => r.status === 'approved').length,
            rejected: allRevs.filter((r) => r.status === 'rejected').length,
            all: allRevs.length,
          };
          const filteredRevs = allRevs.filter((r) => (approvalFilter === 'all' ? true : r.status === approvalFilter));
          return (
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-stone-900 dark:text-white">
                    Super Admin Content Moderation &amp; Approval Queue
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Review new creations, live edits, and deletion requests queued by department admins and editors before publishing changes live.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['pending_approval', `Pending (${counts.pending_approval})`],
                      ['approved', `Approved (${counts.approved})`],
                      ['rejected', `Rejected (${counts.rejected})`],
                      ['all', `All (${counts.all})`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setApprovalFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        approvalFilter === key
                          ? 'text-white'
                          : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                      }`}
                      style={approvalFilter === key ? { backgroundColor: 'var(--primary-color)' } : undefined}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredRevs.length === 0 ? (
                <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
                  No submissions in &ldquo;{approvalFilter.replace('_', ' ')}&rdquo;.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRevs.map((rev) => {
                    const diffRows = buildRevisionDiffRows(rev);
                    const changedRows = diffRows.filter((d) => d.changed);
                    const isExpanded = expandedRevId === rev.id || rev.status === 'pending_approval';
                    const actionBadgeClass =
                      rev.actionType === 'create'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : rev.actionType === 'delete'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
                    const statusBadgeClass =
                      rev.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : rev.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300';

                    return (
                      <div
                        key={rev.id}
                        className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${actionBadgeClass}`}>
                                {rev.actionType}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-[11px] font-mono text-stone-700 dark:text-slate-300">
                                {rev.entityTable}
                                {rev.entityId ? ` #${rev.entityId}` : ''}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${statusBadgeClass}`}>
                                {rev.status.replace('_', ' ')}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                              {rev.entityTitle}
                            </h3>
                            <p className="text-xs text-stone-500 dark:text-slate-400">
                              Submitted by <strong>{rev.submittedByName}</strong> ({rev.submittedByEmail} ·{' '}
                              {rev.submittedByRole.replace(/_/g, ' ')}) on {new Date(rev.submittedAt).toLocaleString()}
                            </p>
                            {(rev.reviewedBy || rev.reviewerEmail) && (
                              <p className="text-xs text-stone-500 dark:text-slate-400">
                                Reviewed by {rev.reviewedBy || rev.reviewerEmail}
                                {rev.reviewedAt ? ` on ${new Date(rev.reviewedAt).toLocaleString()}` : ''}
                                {rev.reviewNote || rev.reviewerNote ? ` — "${rev.reviewNote || rev.reviewerNote}"` : ''}
                              </p>
                            )}
                          </div>
                          {rev.status !== 'pending_approval' && (
                            <button
                              type="button"
                              onClick={() => setExpandedRevId(expandedRevId === rev.id ? null : rev.id)}
                              className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs font-medium"
                            >
                              {isExpanded ? 'Hide Diff' : `Show Diff (${changedRows.length})`}
                            </button>
                          )}
                        </div>

                        {isExpanded && diffRows.length > 0 && (
                          <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-stone-50 dark:bg-slate-800/70 text-stone-600 dark:text-slate-300">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">Field</th>
                                  <th className="px-3 py-2 font-semibold">Current Live Value</th>
                                  <th className="px-3 py-2 font-semibold">Proposed Change</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                                {(changedRows.length > 0 ? changedRows : diffRows).map((row) => (
                                  <tr key={row.field} className={row.changed ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}>
                                    <td className="px-3 py-2 font-mono font-semibold text-stone-700 dark:text-slate-300 align-top whitespace-nowrap">
                                      {row.field}
                                    </td>
                                    <td className="px-3 py-2 text-stone-600 dark:text-slate-400 align-top break-words max-w-xs">
                                      {row.before}
                                    </td>
                                    <td className="px-3 py-2 text-stone-900 dark:text-slate-100 align-top break-words max-w-xs font-medium">
                                      {row.after}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {rev.status === 'pending_approval' && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-2 border-t border-stone-100 dark:border-slate-800">
                            <input
                              type="text"
                              value={approvalNotes[rev.id] || ''}
                              onChange={(e) => setApprovalNotes({ ...approvalNotes, [rev.id]: e.target.value })}
                              placeholder="Optional reviewer note / reason..."
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await adminFetch(`/api/admin/pending-approvals/${rev.id}/approve`, 'POST', {
                                      reviewNote: approvalNotes[rev.id] || '',
                                    });
                                    setApprovalNotes((prev) => {
                                      const next = { ...prev };
                                      delete next[rev.id];
                                      return next;
                                    });
                                    notify('ok', `Approved & published "${rev.entityTitle}".`);
                                  } catch (err) {
                                    notify('err', (err as Error).message);
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800"
                              >
                                Approve &amp; Publish
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await adminFetch(`/api/admin/pending-approvals/${rev.id}/reject`, 'POST', {
                                      reviewNote: approvalNotes[rev.id] || '',
                                    });
                                    setApprovalNotes((prev) => {
                                      const next = { ...prev };
                                      delete next[rev.id];
                                      return next;
                                    });
                                    notify('ok', `Rejected "${rev.entityTitle}". Live site remains unchanged.`);
                                  } catch (err) {
                                    notify('err', (err as Error).message);
                                  }
                                }}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* 1B. CATEGORIES, NAVIGATION MENUS & HEADER/FOOTER BUILDER */}
        {activeTab === 'categories' && canCategories && state && (
          <div className="space-y-6">
            {/* Live Header Menu Bar Preview */}
            {(() => {
              const portalList: HeaderPortalMenuItem[] =
                settingsDraft?.portalMenuItems && settingsDraft.portalMenuItems.length > 0
                  ? settingsDraft.portalMenuItems
                  : DEFAULT_PORTAL_MENU_ITEMS;
              const { mainCategories, moreCategories, mainPortalLinks, morePortalLinks } =
                partitionHeaderMenus(state.categories, portalList);
              return (
                <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                        Live Public Header Navigation Bar Preview
                      </h2>
                      <p className="text-[11px] text-stone-500">
                        Manage ALL Categories AND standalone Portal Menus (Conferences, Placements, Grievance, Alumni, Gallery, Contact, Quick Links) — move any item between Main Bar, More Portals, or Hidden.
                      </p>
                    </div>
                  </div>
                  <div
                    className="rounded-lg px-3 py-2 flex flex-wrap items-center gap-1.5 text-white text-xs"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <span className="px-2 py-1 rounded bg-white/20 font-bold">Home</span>
                    {mainCategories.map((c) => (
                      <span key={`prev-cat-${c.id}`} className="px-2 py-1 rounded bg-white/10">
                        {c.shortLabel || c.name} ▾
                      </span>
                    ))}
                    {mainPortalLinks.map((p) => (
                      <span
                        key={`prev-portal-${p.id}`}
                        className="px-2 py-1 rounded bg-amber-400/20 text-amber-200 font-semibold"
                      >
                        {p.label}
                      </span>
                    ))}
                    {(moreCategories.length > 0 || morePortalLinks.length > 0) && (
                      <span className="px-2.5 py-1 rounded bg-slate-950/50 border border-white/25 font-bold">
                        More Portals ({moreCategories.length + morePortalLinks.length}) ▾
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    if (editingCatId) {
                      await adminFetch(`/api/admin/categories/${editingCatId}`, 'PUT', {
                        name: catName,
                        shortLabel: catShort || catName,
                        ugcCode: catUgcCode,
                        description: catDesc,
                        showInMenu: catMenuLocation !== 'hidden',
                        menuLocation: catMenuLocation,
                        showOnHome: catShowHome,
                      });
                      notify('ok', `Updated category "${catName}".`);
                    } else {
                      await adminFetch('/api/admin/categories', 'POST', {
                        name: catName,
                        shortLabel: catShort || catName,
                        slug: catSlug || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        ugcCode: catUgcCode,
                        description: catDesc,
                        showInMenu: catMenuLocation !== 'hidden',
                        menuLocation: catMenuLocation,
                        showOnHome: catShowHome,
                        createDefaultPage: catCreatePage,
                      });
                      notify('ok', `Created category "${catName}" and updated navigation menus.`);
                    }
                    setEditingCatId(null);
                    setCatName('');
                    setCatShort('');
                    setCatSlug('');
                    setCatUgcCode('Autonomous Portal');
                    setCatDesc('');
                    setCatShowMenu(true);
                    setCatMenuLocation('main');
                    setCatShowHome(true);
                    setCatCreatePage(true);
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
                className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold">
                    {editingCatId ? `Edit Category: ${catName}` : 'Add Homepage / Menu Category'}
                  </h2>
                  {editingCatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(null);
                        setCatName('');
                        setCatShort('');
                        setCatSlug('');
                        setCatDesc('');
                        setCatMenuLocation('main');
                      }}
                      className="text-xs underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Create top-level portal sections (such as Examination, Placement Cell, or NIRF Cell) and assign whether they sit directly on the Main Header Bar or inside More Portals.
                </p>

                <div>
                  <label className="block text-xs font-semibold mb-1">Category Full Name *</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCatName(val);
                      if (!editingCatId) {
                        setCatSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                        setCatShort(val.slice(0, 18));
                      }
                    }}
                    placeholder="e.g. Training & Placement"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Short Header Label</label>
                    <input
                      type="text"
                      value={catShort}
                      onChange={(e) => setCatShort(e.target.value)}
                      placeholder="e.g. Placements"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Badge / UGC Reference</label>
                    <input
                      type="text"
                      value={catUgcCode}
                      onChange={(e) => setCatUgcCode(e.target.value)}
                      placeholder="e.g. Autonomous · CoE"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold mb-1">URL Slug</label>
                    <input
                      type="text"
                      disabled={Boolean(editingCatId)}
                      value={catSlug}
                      onChange={(e) => setCatSlug(e.target.value)}
                      placeholder="e.g. examination"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Header Menu Placement</label>
                    <select
                      value={catMenuLocation}
                      onChange={(e) => {
                        const loc = e.target.value as MenuPlacementLocation;
                        setCatMenuLocation(loc);
                        setCatShowMenu(loc !== 'hidden');
                      }}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="main">Main Header Bar</option>
                      <option value="more">Inside &ldquo;More Portals&rdquo;</option>
                      <option value="hidden">Hidden from Top Menu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Description (shown on Homepage card)</label>
                  <textarea
                    rows={2}
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Brief description of micro-pages inside this section..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={catShowHome} onChange={(e) => setCatShowHome(e.target.checked)} />
                    <span>Show in Homepage Categories Directory</span>
                  </label>
                  {!editingCatId && (
                    <label className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                      <input type="checkbox" checked={catCreatePage} onChange={(e) => setCatCreatePage(e.target.checked)} />
                      <span>Auto-create starter Overview micro-page inside this category</span>
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {editingCatId ? 'Save Category Changes' : 'Add Category & Update Navigation'}
                </button>
              </form>

              <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-sm">Category Dropdown Menus ({state.categories.length})</span>
                  <span className="text-[11px] text-stone-500">
                    Click Main Bar / More Portals / Hidden to route any category
                  </span>
                </div>
                <div className="divide-y divide-stone-100 dark:divide-slate-800">
                  {state.categories.map((cat, idx) => {
                    const count = state.pages.filter((p) => p.categorySlug === cat.slug).length;
                    const effLoc: MenuPlacementLocation =
                      cat.menuLocation || (cat.showInMenu === false ? 'hidden' : idx < 6 ? 'main' : 'more');
                    const moveCategory = async (dir: -1 | 1) => {
                      const target = idx + dir;
                      if (target < 0 || target >= state.categories.length) return;
                      const ids = state.categories.map((c) => c.id);
                      [ids[idx], ids[target]] = [ids[target], ids[idx]];
                      await adminFetch('/api/admin/categories/reorder', 'PUT', { orderedIds: ids });
                      notify('ok', `Reordered "${cat.name}".`);
                    };
                    const setCatPlacement = (loc: MenuPlacementLocation) =>
                      adminFetch(`/api/admin/categories/${cat.id}`, 'PUT', {
                        menuLocation: loc,
                        showInMenu: loc !== 'hidden',
                      }).then(() =>
                        notify(
                          'ok',
                          `Moved "${cat.shortLabel || cat.name}" to ${
                            loc === 'main' ? 'Main Header Bar' : loc === 'more' ? 'More Portals' : 'Hidden'
                          }.`,
                        ),
                      );
                    return (
                      <div key={cat.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-400">
                              #{cat.sortOrder} · {cat.ugcCode}
                            </span>
                            <span className="font-bold text-stone-900 dark:text-white">{cat.name}</span>
                            {cat.shortLabel && cat.shortLabel !== cat.name && (
                              <span className="text-[11px] text-stone-500">(Menu: {cat.shortLabel})</span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 dark:text-slate-400 truncate mt-0.5">{cat.description}</p>
                        </div>

                        <div className="flex items-center gap-1 flex-wrap shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveCategory(-1)}
                            title="Move Up"
                            className="p-1.5 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === state.categories.length - 1}
                            onClick={() => moveCategory(1)}
                            title="Move Down"
                            className="p-1.5 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <div className="inline-flex rounded-md border border-stone-300 dark:border-slate-700 overflow-hidden text-[11px] font-semibold">
                            <button
                              type="button"
                              onClick={() => setCatPlacement('main')}
                              className={`px-2 py-1 ${
                                effLoc === 'main'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300'
                              }`}
                            >
                              Main Bar
                            </button>
                            <button
                              type="button"
                              onClick={() => setCatPlacement('more')}
                              className={`px-2 py-1 border-x border-stone-300 dark:border-slate-700 ${
                                effLoc === 'more'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300'
                              }`}
                            >
                              More Portals
                            </button>
                            <button
                              type="button"
                              onClick={() => setCatPlacement('hidden')}
                              className={`px-2 py-1 ${
                                effLoc === 'hidden'
                                  ? 'bg-stone-600 text-white'
                                  : 'bg-white dark:bg-slate-800 text-stone-500'
                              }`}
                            >
                              Hidden
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setPageFilterCat(cat.slug);
                              setPageCat(cat.slug);
                              setActiveTab('pages');
                            }}
                            className="px-2 py-1 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                          >
                            Pages ({count}) &rarr;
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCatId(cat.id);
                              setCatName(cat.name ?? '');
                              setCatShort(cat.shortLabel || cat.name || '');
                              setCatSlug(cat.slug ?? '');
                              setCatUgcCode(cat.ugcCode ?? '');
                              setCatDesc(cat.description ?? '');
                              setCatShowMenu(cat.showInMenu !== false);
                              setCatMenuLocation(effLoc);
                              setCatShowHome(cat.showOnHome !== false);
                            }}
                            className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete category ${cat.name}`}
                            onClick={async () => {
                              try {
                                await adminFetch(`/api/admin/categories/${cat.id}`, 'DELETE');
                                notify('ok', `Deleted category "${cat.name}".`);
                              } catch (err) {
                                notify('err', (err as Error).message);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Standalone Portal & Custom Header Menus (Conferences, Placements, Grievance, Alumni, Gallery, Contact, Quick Links, Custom) */}
            {settingsDraft && (() => {
              const portalList: HeaderPortalMenuItem[] =
                settingsDraft.portalMenuItems && settingsDraft.portalMenuItems.length > 0
                  ? settingsDraft.portalMenuItems
                  : DEFAULT_PORTAL_MENU_ITEMS;

              const persistPortalList = async (nextList: HeaderPortalMenuItem[], msg: string) => {
                const renumbered = nextList.map((item, i) => ({ ...item, sortOrder: i + 1 }));
                setSettingsDraft({ ...settingsDraft, portalMenuItems: renumbered });
                await adminFetch('/api/admin/settings', 'PUT', { portalMenuItems: renumbered });
                notify('ok', msg);
              };

              return (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newPortalLabel.trim() || !newPortalUrl.trim()) return;
                      if (editingPortalId) {
                        const updated = portalList.map((item) =>
                          item.id === editingPortalId
                            ? {
                                ...item,
                                label: newPortalLabel.trim(),
                                url: newPortalUrl.trim(),
                                menuLocation: newPortalLocation,
                              }
                            : item,
                        );
                        setEditingPortalId(null);
                        setNewPortalLabel('');
                        await persistPortalList(updated, `Updated header portal menu "${newPortalLabel}".`);
                      } else {
                        const newItem: HeaderPortalMenuItem = {
                          id: Math.max(0, ...portalList.map((i) => i.id)) + 1,
                          label: newPortalLabel.trim(),
                          url: newPortalUrl.trim(),
                          menuLocation: newPortalLocation,
                          sortOrder: portalList.length + 1,
                        };
                        setNewPortalLabel('');
                        await persistPortalList([...portalList, newItem], `Added menu item "${newItem.label}".`);
                      }
                    }}
                    className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold">
                        {editingPortalId ? 'Edit Header / Portal Menu Link' : 'Add Portal / Custom Header Menu Link'}
                      </h3>
                      {editingPortalId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPortalId(null);
                            setNewPortalLabel('');
                          }}
                          className="text-xs underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">
                      Add new top-bar buttons or More Portals entries (e.g. NIRF Cell, Scholarships, Moodle LMS) and route any existing portal link.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Menu Button Label *</label>
                      <input
                        type="text"
                        required
                        value={newPortalLabel}
                        onChange={(e) => setNewPortalLabel(e.target.value)}
                        placeholder="e.g. NIRF Ranking / ERP Portal"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Target Page / Portal Route *</label>
                      <LinkTargetPicker
                        value={newPortalUrl}
                        onChange={setNewPortalUrl}
                        categories={state.categories}
                        pages={state.pages}
                        departments={state.departments}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Menu Placement</label>
                      <select
                        value={newPortalLocation}
                        onChange={(e) => setNewPortalLocation(e.target.value as MenuPlacementLocation)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="main">Main Header Bar</option>
                        <option value="more">Inside &ldquo;More Portals&rdquo; Dropdown</option>
                        <option value="hidden">Hidden</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                      {editingPortalId ? 'Save Header Link Changes' : '+ Add Header Portal Menu'}
                    </button>
                  </form>

                  <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-sm">
                        Homepage Portal &amp; Standalone Header Menus ({portalList.length})
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Reorder or move items into More Portals to keep the top bar clean
                      </span>
                    </div>
                    <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
                      {portalList.map((item, idx) => (
                        <div key={`${item.id}-${item.url}`} className="p-3.5 flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-stone-900 dark:text-white">{item.label}</p>
                            <p className="font-mono text-[11px] text-stone-500">{item.url}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                const arr = [...portalList];
                                [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                persistPortalList(arr, `Moved "${item.label}" up.`);
                              }}
                              className="p-1.5 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === portalList.length - 1}
                              onClick={() => {
                                const arr = [...portalList];
                                [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                persistPortalList(arr, `Moved "${item.label}" down.`);
                              }}
                              className="p-1.5 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <div className="inline-flex rounded-md border border-stone-300 dark:border-slate-700 overflow-hidden text-[11px] font-semibold">
                              <button
                                type="button"
                                onClick={() =>
                                  persistPortalList(
                                    portalList.map((x) => (x.id === item.id ? { ...x, menuLocation: 'main' } : x)),
                                    `Moved "${item.label}" to Main Header Bar.`,
                                  )
                                }
                                className={`px-2 py-1 ${
                                  item.menuLocation === 'main'
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300'
                                }`}
                              >
                                Main Bar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  persistPortalList(
                                    portalList.map((x) => (x.id === item.id ? { ...x, menuLocation: 'more' } : x)),
                                    `Moved "${item.label}" inside More Portals.`,
                                  )
                                }
                                className={`px-2 py-1 border-x border-stone-300 dark:border-slate-700 ${
                                  item.menuLocation === 'more'
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300'
                                }`}
                              >
                                More Portals
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  persistPortalList(
                                    portalList.map((x) => (x.id === item.id ? { ...x, menuLocation: 'hidden' } : x)),
                                    `Hid "${item.label}" from header.`,
                                  )
                                }
                                className={`px-2 py-1 ${
                                  item.menuLocation === 'hidden'
                                    ? 'bg-stone-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-stone-500'
                                }`}
                              >
                                Hidden
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPortalId(item.id);
                                setNewPortalLabel(item.label);
                                setNewPortalUrl(item.url);
                                setNewPortalLocation(item.menuLocation);
                              }}
                              className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                persistPortalList(
                                  portalList.filter((x) => x.id !== item.id),
                                  `Removed header portal menu "${item.label}".`,
                                )
                              }
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Header Quick-Access Links & Footer Columns Visual Builder */}
            {canSettings && settingsDraft && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Header Top Utility Strip */}
                <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Top Quick-Access Strip Links</h3>
                      <p className="text-xs text-stone-500">Shown directly below the main header bar.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          topBarLinks: [...settingsDraft.topBarLinks, { label: 'New Quick Link', url: '/quick-links' }],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: 'var(--secondary-color)' }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Link
                    </button>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {settingsDraft.topBarLinks.map((lk, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-stone-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={lk.label ?? ''}
                            onChange={(e) => {
                              const next = [...settingsDraft.topBarLinks];
                              next[idx] = { ...lk, label: e.target.value };
                              setSettingsDraft({ ...settingsDraft, topBarLinks: next });
                            }}
                            placeholder="Button Label"
                            className="flex-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSettingsDraft({
                                ...settingsDraft,
                                topBarLinks: settingsDraft.topBarLinks.filter((_, i) => i !== idx),
                              })
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <LinkTargetPicker
                          value={lk.url}
                          onChange={(url) => {
                            const next = [...settingsDraft.topBarLinks];
                            next[idx] = { ...lk, url };
                            setSettingsDraft({ ...settingsDraft, topBarLinks: next });
                          }}
                          categories={state.categories}
                          pages={state.pages}
                          departments={state.departments}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      adminFetch('/api/admin/settings', 'PUT', settingsDraft)
                        .then(() => notify('ok', 'Saved Header Quick-Access links.'))
                        .catch((err) => notify('err', (err as Error).message))
                    }
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    Save Header Quick Links
                  </button>
                </div>

                {/* Footer Columns Builder */}
                <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Footer Link Columns</h3>
                      <p className="text-xs text-stone-500">Manage columns &amp; links in website footer.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          footerColumns: [
                            ...settingsDraft.footerColumns,
                            { title: 'New Section', links: [{ label: 'Home', url: '/' }] },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: 'var(--secondary-color)' }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Column
                    </button>
                  </div>
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                    {settingsDraft.footerColumns.map((col, colIdx) => (
                      <div key={colIdx} className="p-3 rounded-lg border border-stone-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={col.title ?? ''}
                            onChange={(e) => {
                              const nextCols = [...settingsDraft.footerColumns];
                              nextCols[colIdx] = { ...col, title: e.target.value };
                              setSettingsDraft({ ...settingsDraft, footerColumns: nextCols });
                            }}
                            placeholder="Column Heading"
                            className="flex-1 px-2.5 py-1.5 text-xs font-bold rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextCols = [...settingsDraft.footerColumns];
                              nextCols[colIdx] = {
                                ...col,
                                links: [...col.links, { label: 'New Link', url: '/page/about-overview' }],
                              };
                              setSettingsDraft({ ...settingsDraft, footerColumns: nextCols });
                            }}
                            className="px-2 py-1 text-[11px] font-semibold rounded border border-stone-300 dark:border-slate-700"
                          >
                            + Link
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSettingsDraft({
                                ...settingsDraft,
                                footerColumns: settingsDraft.footerColumns.filter((_, i) => i !== colIdx),
                              })
                            }
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {col.links.map((lk, lkIdx) => (
                          <div key={lkIdx} className="pl-2 border-l-2 border-stone-200 dark:border-slate-700 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={lk.label ?? ''}
                                onChange={(e) => {
                                  const nextCols = [...settingsDraft.footerColumns];
                                  const nextLinks = [...col.links];
                                  nextLinks[lkIdx] = { ...lk, label: e.target.value };
                                  nextCols[colIdx] = { ...col, links: nextLinks };
                                  setSettingsDraft({ ...settingsDraft, footerColumns: nextCols });
                                }}
                                placeholder="Link Label"
                                className="flex-1 px-2 py-1 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextCols = [...settingsDraft.footerColumns];
                                  nextCols[colIdx] = { ...col, links: col.links.filter((_, i) => i !== lkIdx) };
                                  setSettingsDraft({ ...settingsDraft, footerColumns: nextCols });
                                }}
                                className="text-rose-600 p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <LinkTargetPicker
                              value={lk.url}
                              onChange={(url) => {
                                const nextCols = [...settingsDraft.footerColumns];
                                const nextLinks = [...col.links];
                                nextLinks[lkIdx] = { ...lk, url };
                                nextCols[colIdx] = { ...col, links: nextLinks };
                                setSettingsDraft({ ...settingsDraft, footerColumns: nextCols });
                              }}
                              categories={state.categories}
                              pages={state.pages}
                              departments={state.departments}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      adminFetch('/api/admin/settings', 'PUT', settingsDraft)
                        .then(() => notify('ok', 'Saved Footer columns & links.'))
                        .catch((err) => notify('err', (err as Error).message))
                    }
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    Save Footer Columns
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. PAGES BUILDER TAB (Visual WYSIWYG + HTML Toggle + PDF Upload/External Link + Per-Page RBAC) */}
        {activeTab === 'pages' && canPages && state && (() => {
          const permittedCategories = state.categories.filter((c) => canUserAccessCategory(user, c.slug));
          const permittedPages = state.pages.filter((pg) => canUserAccessPage(user, pg));
          const canCreatePage = permittedCategories.length > 0;
          const activeCreateCategory = permittedCategories.some((c) => c.slug === pageCat)
            ? pageCat
            : (permittedCategories[0]?.slug ?? pageCat);
          const selectableFormCategories =
            permittedCategories.length > 0
              ? permittedCategories
              : state.categories.filter((c) => c.slug === pageCat);
          const hasExplicitScope =
            user.role === 'exam_controller' ||
            user.role === 'specific_page_editor' ||
            (user.allowedCategories && user.allowedCategories.length > 0) ||
            (user.allowedPageIds && user.allowedPageIds.length > 0);
          return (
          <div className="space-y-4">
            {hasExplicitScope && (
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Scoped RBAC Access Active ({user.role.replace(/_/g, ' ')}):</strong>{' '}
                  Showing {permittedPages.length} authorized {permittedPages.length === 1 ? 'page' : 'pages'}{' '}
                  {permittedCategories.length > 0
                    ? `across ${permittedCategories.map((c) => c.shortLabel || c.name).join(', ')}`
                    : '(individual page-wise permission)'}.
                </span>
              </div>
            )}

            {/* Category Quick Filter Strip */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-stone-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPageFilterCat('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  pageFilterCat === 'all' ? 'text-white' : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`}
                style={pageFilterCat === 'all' ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                Permitted ({permittedPages.length})
              </button>
              {permittedCategories.map((c) => {
                const cnt = permittedPages.filter((p) => p.categorySlug === c.slug).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setPageFilterCat(c.slug);
                      if (!editingPageId) setPageCat(c.slug);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      pageFilterCat === c.slug
                        ? 'text-white'
                        : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                    }`}
                    style={pageFilterCat === c.slug ? { backgroundColor: 'var(--primary-color)' } : undefined}
                  >
                    {c.shortLabel || c.name} ({cnt})
                  </button>
                );
              })}
            </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {!editingPageId && !canCreatePage ? (
              <div className="xl:col-span-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-center">
                <h2 className="text-base font-bold text-stone-900 dark:text-white mb-2">
                  Individual Page-Wise Access Active
                </h2>
                {permittedPages.length === 0 ? (
                  <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                    No individual pages or categories have been assigned to this account yet. Please contact the Super Administrator to assign specific pages.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed mb-3">
                      Your account is scoped strictly to {permittedPages.length} individually assigned{' '}
                      {permittedPages.length === 1 ? 'page' : 'pages'} without category-wide creation privileges.
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      Select <strong>Edit</strong> next to any authorized page in the panel on the right to open the visual editor and update its content or attached PDF.
                    </p>
                  </>
                )}
              </div>
            ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (pagePdfUrl && pagePdfMode === 'external') {
                    const urlCheck = validateExternalDocumentUrl(pagePdfUrl);
                    if (!urlCheck.valid) {
                      notify('err', urlCheck.reason || 'Enter a valid http/https external document link.');
                      return;
                    }
                  }
                  if (editingPageId) {
                    const res = await adminFetch<AdminMutateResult<CmsPage>>(
                      `/api/admin/pages/${editingPageId}`,
                      'PUT',
                      {
                        categorySlug: pageCat,
                        title: pageTitle,
                        subtitle: pageSubtitle,
                        metaDescription: pageMetaDescription || undefined,
                        sortOrder: pageSortOrder,
                        contentHtml: pageHtml,
                        attachedPdfUrl: pagePdfUrl || undefined,
                        attachedPdfLabel: pagePdfLabel || undefined,
                        isPublished: pagePublished,
                        showShareBar: pageShowShareBar,
                        isShareable: pageShowShareBar,
                      },
                    );
                    notify(
                      'ok',
                      res?.queuedForApproval && res?.message
                        ? res.message
                        : `Updated page "${pageTitle}".`,
                    );
                  } else {
                    const autoSlug = pageTitle
                      .toLowerCase()
                      .replace(/&/g, '-and-')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '');
                    const res = await adminFetch<AdminMutateResult<CmsPage>>('/api/admin/pages', 'POST', {
                      categorySlug: activeCreateCategory,
                      slug: pageSlug || autoSlug,
                      title: pageTitle,
                      subtitle: pageSubtitle,
                      metaDescription: pageMetaDescription || undefined,
                      contentHtml: pageHtml,
                      attachedPdfUrl: pagePdfUrl || undefined,
                      attachedPdfLabel: pagePdfLabel || undefined,
                      isPublished: pagePublished,
                      showShareBar: pageShowShareBar,
                      isShareable: pageShowShareBar,
                    });
                    notify(
                      'ok',
                      res?.queuedForApproval && res?.message
                        ? res.message
                        : `Published new page "${pageTitle}".`,
                    );
                  }
                  setEditingPageId(null);
                  setPageTitle('');
                  setPageSlug('');
                  setPageSubtitle('');
                  setPageMetaDescription('');
                  setPageSortOrder(1);
                  setPagePdfUrl('');
                  setPagePdfLabel('');
                  setPagePdfMode('upload');
                  setPagePublished(true);
                  setPageShowShareBar(true);
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="xl:col-span-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  {editingPageId ? 'Edit Micro-Page / Disclosure Page' : 'Create New Micro-Page / Disclosure Page'}
                </h2>
                {editingPageId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPageId(null);
                      setPageTitle('');
                      setPageSlug('');
                      setPageSubtitle('');
                      setPageMetaDescription('');
                      setPageSortOrder(1);
                      setPagePdfUrl('');
                      setPagePdfLabel('');
                      setPagePublished(true);
                      setPageShowShareBar(true);
                    }}
                    className="text-xs underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Portal Category</label>
                  <select
                    disabled={Boolean(editingPageId && !canCreatePage)}
                    value={editingPageId ? pageCat : activeCreateCategory}
                    onChange={(e) => setPageCat(e.target.value as UgcCategorySlug)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
                  >
                    {selectableFormCategories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">URL Slug</label>
                  <input
                    type="text"
                    disabled={Boolean(editingPageId)}
                    value={pageSlug}
                    onChange={(e) => setPageSlug(e.target.value)}
                    placeholder="auto-from-title"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-semibold mb-1">Page Title</label>
                  <input
                    type="text"
                    required
                    value={pageTitle}
                    onChange={(e) => {
                      setPageTitle(e.target.value);
                      if (!editingPageId) {
                        setPageSlug(e.target.value.toLowerCase().replace(/&/g, '-and-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                      }
                    }}
                    placeholder="Enter page title"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold mb-1">Subtitle / Reference</label>
                  <input
                    type="text"
                    value={pageSubtitle}
                    onChange={(e) => setPageSubtitle(e.target.value)}
                    placeholder="Autonomous CoE / UGC Section"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Order</label>
                  <input
                    type="number"
                    min={1}
                    value={pageSortOrder}
                    onChange={(e) => setPageSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="sm:col-span-12">
                  <label className="block text-xs font-semibold mb-1">SEO &amp; OpenGraph Meta Description (optional)</label>
                  <input
                    type="text"
                    value={pageMetaDescription}
                    onChange={(e) => setPageMetaDescription(e.target.value)}
                    placeholder="Concise summary for Google Search, WhatsApp, and LinkedIn link previews..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <RichTextEditor
                label="Page Content (Visual Word-style Editor with Optional HTML View)"
                value={pageHtml}
                onChange={setPageHtml}
                uploadBinary={uploadBinaryFile}
                maxPhotoMb={maxPhotoMb}
                autoCropEnabled={autoCropEnabled}
                minHeight={230}
              />

              {/* Attached Statutory Document: Upload PDF OR External Link (Google Drive / URL) */}
              <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold">Optional Attached Document (Upload PDF or External Drive Link)</span>
                  <div className="inline-flex rounded-lg border border-stone-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setPagePdfMode('upload')}
                      className={`px-2.5 py-1 text-[11px] font-semibold ${
                        pagePdfMode === 'upload' ? 'text-white' : 'text-stone-700 dark:text-slate-300'
                      }`}
                      style={pagePdfMode === 'upload' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                    >
                      Upload PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setPagePdfMode('external')}
                      className={`px-2.5 py-1 text-[11px] font-semibold ${
                        pagePdfMode === 'external' ? 'text-white' : 'text-stone-700 dark:text-slate-300'
                      }`}
                      style={pagePdfMode === 'external' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                    >
                      External URL / Google Drive
                    </button>
                  </div>
                </div>
                {pagePdfMode === 'upload' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white cursor-pointer"
                      style={{ backgroundColor: 'var(--secondary-color)' }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload PDF File</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          try {
                            const url = await uploadBinaryFile(f);
                            setPagePdfUrl(url);
                            if (!pagePdfLabel) setPagePdfLabel(`Download ${f.name}`);
                            notify('ok', 'PDF attached to page.');
                          } catch (err) {
                            notify('err', (err as Error).message);
                          }
                        }}
                      />
                    </label>
                    <span className="text-[11px] text-stone-500">
                      Max Document Size: {maxDocumentMb} MB · Or switch to External URL for Google Drive
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={pagePdfLabel}
                    onChange={(e) => setPagePdfLabel(e.target.value)}
                    placeholder="Button Label (e.g. Open Examination Timetable)"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={pagePdfUrl}
                    onChange={(e) => setPagePdfUrl(e.target.value)}
                    placeholder={pagePdfMode === 'external' ? 'https://drive.google.com/file/d/...' : '/uploads/document.pdf'}
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={pagePublished}
                      onChange={(e) => setPagePublished(e.target.checked)}
                    />
                    <span>Publish Immediately</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={pageShowShareBar}
                      onChange={(e) => setPageShowShareBar(e.target.checked)}
                    />
                    <span>Show Social Share Bar</span>
                  </label>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>{editingPageId ? 'Save Changes' : 'Create Micro-Page'}</span>
                </button>
              </div>
            </form>
            )}

            <div className="xl:col-span-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 font-bold text-sm">
                {pageFilterCat === 'all'
                  ? `Permitted Micro-Pages (${permittedPages.length})`
                  : `${state.categories.find((c) => c.slug === pageFilterCat)?.name || pageFilterCat} Pages`}
              </div>
              <div className="max-h-[640px] overflow-y-auto divide-y divide-stone-100 dark:divide-slate-800">
                {(() => {
                  const visiblePages = sortByOrder(
                    permittedPages.filter((pg) => pageFilterCat === 'all' || pg.categorySlug === pageFilterCat),
                  );
                  const allOrderedPages = sortByOrder(state.pages);
                  const moveVisiblePage = async (pgId: number, dir: -1 | 1) => {
                    const idxInVis = visiblePages.findIndex((p) => p.id === pgId);
                    const targetVis = idxInVis + dir;
                    if (idxInVis < 0 || targetVis < 0 || targetVis >= visiblePages.length) return;
                    const swapId = visiblePages[targetVis].id;
                    const fullIds = allOrderedPages.map((p) => p.id);
                    const aIdx = fullIds.indexOf(pgId);
                    const bIdx = fullIds.indexOf(swapId);
                    if (aIdx < 0 || bIdx < 0) return;
                    [fullIds[aIdx], fullIds[bIdx]] = [fullIds[bIdx], fullIds[aIdx]];
                    await adminFetch('/api/admin/pages/reorder', 'PUT', { orderedIds: fullIds });
                    notify('ok', 'Reordered pages.');
                  };
                  return visiblePages.map((pg, idx) => (
                    <div key={pg.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold text-stone-900 dark:text-white truncate">{pg.title}</p>
                          {renderModerationBadge(pg.status)}
                        </div>
                        <p className="text-xs text-stone-500 dark:text-slate-400">
                          {pg.categorySlug} · #{pg.sortOrder} · /{pg.slug} · {pg.isPublished ? 'Published' : 'Draft'} · {(pg.isShareable ?? pg.showShareBar) !== false ? 'Share On' : 'Share Off'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveVisiblePage(pg.id, -1)}
                          aria-label={`Move ${pg.title} up`}
                          title="Move Up"
                          className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === visiblePages.length - 1}
                          onClick={() => moveVisiblePage(pg.id, 1)}
                          aria-label={`Move ${pg.title} down`}
                          title="Move Down"
                          className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await adminFetch<AdminMutateResult>(`/api/admin/pages/${pg.id}`, 'PUT', {
                                isPublished: !pg.isPublished,
                              });
                              notify(
                                'ok',
                                res?.queuedForApproval && res?.message
                                  ? res.message
                                  : pg.isPublished
                                    ? `Hidden micro-page "${pg.title}" from public menus.`
                                    : `Published micro-page "${pg.title}".`,
                              );
                            } catch (err) {
                              notify('err', (err as Error).message);
                            }
                          }}
                          className={`px-2.5 py-1 rounded border text-xs font-semibold ${
                            pg.isPublished
                              ? 'border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300 hover:bg-amber-50'
                              : 'border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          {pg.isPublished ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPageId(pg.id);
                            setPageCat(pg.categorySlug);
                            setPageTitle(pg.title ?? '');
                            setPageSlug(pg.slug ?? '');
                            setPageSubtitle(pg.subtitle ?? '');
                            setPageMetaDescription(pg.metaDescription || '');
                            setPageSortOrder(pg.sortOrder ?? 1);
                            setPageHtml(pg.contentHtml ?? '');
                            setPagePdfUrl(pg.attachedPdfUrl || '');
                            setPagePdfLabel(pg.attachedPdfLabel || '');
                            setPagePdfMode(pg.attachedPdfUrl && /^https?:\/\//i.test(pg.attachedPdfUrl) ? 'external' : 'upload');
                            setPagePublished(pg.isPublished !== false);
                            setPageShowShareBar((pg.isShareable ?? pg.showShareBar) !== false);
                          }}
                          className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${pg.title}`}
                          onClick={async () => {
                            try {
                              const res = await adminFetch<AdminMutateResult>(`/api/admin/pages/${pg.id}`, 'DELETE');
                              notify(
                                'ok',
                                res?.queuedForApproval && res?.message
                                  ? res.message
                                  : `Deleted page "${pg.title}".`,
                              );
                            } catch (err) {
                              notify('err', (err as Error).message);
                            }
                          }}
                          className="p-1.5 rounded text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
          </div>
          );
        })()}

        {/* 3. FULL DEPARTMENT & MICRO-PAGE MANAGER */}
        {activeTab === 'departments' && canDepts && state && (
          <div className="space-y-6">
            {/* Department Switcher + Add New Department */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {accessibleDepts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => selectDepartment(d)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border ${
                      currentDept?.id === d.id
                        ? 'text-white border-transparent'
                        : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700'
                    }`}
                    style={currentDept?.id === d.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
                  >
                    {d.name} ({d.code})
                    {d.status === 'pending_approval' ? ' · Pending' : d.status === 'rejected' ? ' · Rejected' : ''}
                  </button>
                ))}
              </div>
              {canSettings && (
                <button
                  type="button"
                  onClick={() => setShowAddDept((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--secondary-color)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddDept ? 'Close New Department' : 'Add Additional Department'}</span>
                </button>
              )}
            </div>

            {/* Add Additional Department Form (Super Admin) */}
            {showAddDept && canSettings && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await adminFetch<AdminMutateResult<Department>>('/api/admin/departments', 'POST', {
                      name: newDeptName,
                      shortName: newDeptShort || newDeptCode,
                      code: newDeptCode,
                      slug: newDeptSlug || newDeptName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      establishedYear: newDeptYear,
                      intakeCapacity: newDeptIntake,
                      nbaStatus: newDeptNba,
                      hodName: newDeptHod,
                      overview: newDeptOverview,
                      heroImageUrl: newDeptHero,
                      isShareable: newDeptShareable,
                    });
                    const created = (res?.item ?? res) as Department;
                    setNewDeptName('');
                    setNewDeptShort('');
                    setNewDeptCode('');
                    setNewDeptSlug('');
                    setNewDeptHod('');
                    setNewDeptOverview('');
                    setNewDeptShareable(true);
                    setShowAddDept(false);
                    if (created?.id) setSelectedDeptId(created.id);
                    notify(
                      'ok',
                      res?.queuedForApproval && res?.message
                        ? res.message
                        : `Added new department microsite "${created?.name || newDeptName}".`,
                    );
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
                className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <h2 className="text-base font-bold">Create New Academic Department Microsite</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={newDeptName}
                    onChange={(e) => {
                      setNewDeptName(e.target.value);
                      setNewDeptSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                    }}
                    placeholder="Full Name (e.g. Artificial Intelligence & Data Science)"
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 sm:col-span-2"
                  />
                  <input
                    type="text"
                    required
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    placeholder="Code (e.g. AIDS)"
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newDeptShort}
                    onChange={(e) => setNewDeptShort(e.target.value)}
                    placeholder="Short Name (AI & DS)"
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    required
                    value={newDeptSlug}
                    onChange={(e) => setNewDeptSlug(e.target.value)}
                    placeholder="URL Slug (ai-ds)"
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="number"
                    value={newDeptYear}
                    onChange={(e) => setNewDeptYear(Number(e.target.value))}
                    placeholder="Est. Year"
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="number"
                    value={newDeptIntake}
                    onChange={(e) => setNewDeptIntake(Number(e.target.value))}
                    placeholder="Intake (60)"
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newDeptHod}
                    onChange={(e) => setNewDeptHod(e.target.value)}
                    placeholder="Head of Department Name"
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={newDeptNba}
                    onChange={(e) => setNewDeptNba(e.target.value)}
                    placeholder="Accreditation Status"
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <textarea
                  rows={2}
                  value={newDeptOverview}
                  onChange={(e) => setNewDeptOverview(e.target.value)}
                  placeholder="Department overview paragraph..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <ImageUploader
                  label="Department Hero Banner Image"
                  value={newDeptHero}
                  onChange={setNewDeptHero}
                  uploadBinary={uploadBinaryFile}
                  aspectRatio="16:9"
                  maxPhotoMb={maxPhotoMb}
                  autoCropEnabled={autoCropEnabled}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={newDeptShareable}
                      onChange={(e) => setNewDeptShareable(e.target.checked)}
                    />
                    <span>Allow Social Media Sharing on this Department Microsite</span>
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    Create Department Microsite
                  </button>
                </div>
              </form>
            )}

            {currentDept && (
              <div className="space-y-4">
                {/* Department Sub-Section Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-stone-200 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'micropages' as const, label: `Micro-Pages & Galleries (${currentDept.subPages.length})` },
                      { id: 'faculty' as const, label: `Faculty & Custom Fields (${currentDept.faculty.length})` },
                      { id: 'labs' as const, label: `Laboratories (${currentDept.labs.length})` },
                      { id: 'library_fields' as const, label: 'Dept Library & Field Schema' },
                      { id: 'profile' as const, label: 'Department Profile & Banner' },
                    ].map((tItem) => (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => {
                          setDeptPanelMode(tItem.id);
                          if (tItem.id === 'profile' || tItem.id === 'library_fields') {
                            setDeptDraft({ ...currentDept });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          deptPanelMode === tItem.id
                            ? 'text-white'
                            : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                        }`}
                        style={deptPanelMode === tItem.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
                      >
                        {tItem.label}
                      </button>
                    ))}
                  </div>
                  {canSettings && state.departments.length > 1 && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await adminFetch<AdminMutateResult>(`/api/admin/departments/${currentDept.id}`, 'DELETE');
                          notify(
                            'ok',
                            res?.queuedForApproval && res?.message
                              ? res.message
                              : `Deleted department "${currentDept.name}".`,
                          );
                        } catch (err) {
                          notify('err', (err as Error).message);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      Delete Department
                    </button>
                  )}
                </div>

                {/* Department Micro-Pages Manager (Gallery, Notice Board, Events, Notes/Syllabus, Celebrations, Achievements, Library) */}
                {deptPanelMode === 'micropages' && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          if (editingSubId) {
                            const res = await adminFetch<AdminMutateResult>(
                              `/api/admin/departments/${currentDept.id}/subpages/${editingSubId}`,
                              'PUT',
                              {
                                title: subTitle,
                                pageType: subPageType,
                                contentHtml: subHtml,
                                photos: subPhotos,
                                items: subItems,
                                isPublished: subPublished,
                                isShareable: subShareable,
                              },
                            );
                            notify(
                              'ok',
                              res?.queuedForApproval && res?.message
                                ? res.message
                                : `Updated micro-page "${subTitle}".`,
                            );
                          } else {
                            const res = await adminFetch<AdminMutateResult>(
                              `/api/admin/departments/${currentDept.id}/subpages`,
                              'POST',
                              {
                                title: subTitle,
                                slug: subSlug || subTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                                pageType: subPageType,
                                contentHtml: subHtml,
                                photos: subPhotos,
                                items: subItems,
                                isPublished: subPublished,
                                isShareable: subShareable,
                              },
                            );
                            notify(
                              'ok',
                              res?.queuedForApproval && res?.message
                                ? res.message
                                : `Added micro-page "${subTitle}".`,
                            );
                          }
                          setEditingSubId(null);
                          setSubTitle('');
                          setSubSlug('');
                          setSubPageType('general');
                          setSubShareable(true);
                          setSubPhotos([]);
                          setSubItems([]);
                        } catch (err) {
                          notify('err', (err as Error).message);
                        }
                      }}
                      className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold">
                          {editingSubId
                            ? `Edit Micro-Page: ${subTitle}`
                            : `Add Micro-Page / Portal to ${currentDept.shortName}`}
                        </h2>
                        {editingSubId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubId(null);
                              setSubTitle('');
                              setSubSlug('');
                              setSubPageType('general');
                              setSubShareable(true);
                              setSubPhotos([]);
                              setSubItems([]);
                            }}
                            className="text-xs underline"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>

                      {/* Micro-Page Template / Section Type with Custom Entry Support */}
                      <div className="space-y-1.5">
                        <CustomSelectInput
                          label="Micro-Page Template / Section Type"
                          value={subPageType}
                          onChange={(val) => {
                            setSubPageType(val);
                            if (!editingSubId && !subTitle && val) {
                              const match = DEPT_SUBPAGE_TYPE_PRESETS.find((p) => p.value === val);
                              const lbl = match?.label || val;
                              setSubTitle(lbl);
                              setSubSlug(lbl.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                            }
                          }}
                          options={DEPT_SUBPAGE_TYPE_PRESETS}
                          customPlaceholder="Enter custom micro-page type..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          value={subTitle}
                          onChange={(e) => {
                            setSubTitle(e.target.value);
                            if (!editingSubId) {
                              setSubSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                            }
                          }}
                          placeholder="Micro-Page Title (e.g. Department Gallery)"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          required
                          disabled={Boolean(editingSubId)}
                          value={subSlug}
                          onChange={(e) => setSubSlug(e.target.value)}
                          placeholder="URL Slug (e.g. gallery)"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
                        />
                      </div>

                      <RichTextEditor
                        label="Micro-Page Content (Visual Editor + HTML Source)"
                        value={subHtml}
                        onChange={setSubHtml}
                        uploadBinary={uploadBinaryFile}
                        maxPhotoMb={maxPhotoMb}
                        autoCropEnabled={autoCropEnabled}
                        minHeight={200}
                      />

                      {/* Multi-Photo Gallery Builder for Sub-Page */}
                      <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold">
                            Micro-Page Photo Gallery / Celebrations Album ({subPhotos.length})
                          </h3>
                          <span className="text-[11px] text-stone-500">Upload photos to display in public lightbox grid</span>
                        </div>
                        <ImageUploader
                          label="Upload or Paste Image for Micro-Page Gallery"
                          value={newSubPhotoUrl}
                          onChange={setNewSubPhotoUrl}
                          uploadBinary={uploadBinaryFile}
                          aspectRatio="4:3"
                          maxPhotoMb={maxPhotoMb}
                          autoCropEnabled={autoCropEnabled}
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={newSubPhotoCaption}
                            onChange={(e) => setNewSubPhotoCaption(e.target.value)}
                            placeholder="Photo Caption (e.g. Inauguration Ceremony)"
                            className="flex-1 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newSubPhotoUrl.trim()) {
                                notify('err', 'Upload or paste a photo URL first.');
                                return;
                              }
                              setSubPhotos((prev) => [
                                ...prev,
                                {
                                  id: Date.now(),
                                  imageUrl: newSubPhotoUrl.trim(),
                                  caption: newSubPhotoCaption.trim() || subTitle || 'Department Photo',
                                },
                              ]);
                              setNewSubPhotoUrl('');
                              setNewSubPhotoCaption('');
                            }}
                            className="px-3 py-1.5 rounded text-xs font-semibold text-white shrink-0"
                            style={{ backgroundColor: 'var(--secondary-color)' }}
                          >
                            + Add Photo to Page
                          </button>
                        </div>
                        {subPhotos.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                            {subPhotos.map((ph) => (
                              <div key={ph.id} className="relative rounded-lg overflow-hidden border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                <img src={ph.imageUrl} alt={ph.caption} className="w-full h-16 object-cover" />
                                <p className="text-[10px] px-1.5 py-0.5 truncate text-stone-600 dark:text-slate-300">{ph.caption}</p>
                                <button
                                  type="button"
                                  onClick={() => setSubPhotos((prev) => prev.filter((p) => p.id !== ph.id))}
                                  aria-label={`Remove photo ${ph.caption}`}
                                  className="absolute top-1 right-1 p-0.5 rounded bg-rose-600 text-white"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Structured Feed Items Builder (Notices, Notes, Syllabus, Events, Achievements) */}
                      <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold">
                            Structured Notices / Notes / Syllabus / Achievement Cards ({subItems.length})
                          </h3>
                          <span className="text-[11px] text-stone-500">Supports PDF Upload OR Google Drive / External URL</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            placeholder="Item Title (e.g. SEM-V Question Bank)"
                            className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <input
                            type="date"
                            value={newItemDate}
                            onChange={(e) => setNewItemDate(e.target.value)}
                            className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newItemBadge}
                            onChange={(e) => setNewItemBadge(e.target.value)}
                            placeholder="Badge (e.g. Syllabus, Award)"
                            className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <input
                            type="text"
                            value={newItemDesc}
                            onChange={(e) => setNewItemDesc(e.target.value)}
                            placeholder="Short description or student/faculty details..."
                            className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <ImageUploader
                          label="Optional Item Photo (for Achievements / Events)"
                          value={newItemImage}
                          onChange={setNewItemImage}
                          uploadBinary={uploadBinaryFile}
                          aspectRatio="4:3"
                          maxPhotoMb={maxPhotoMb}
                          autoCropEnabled={autoCropEnabled}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex rounded border border-stone-300 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 text-[11px] font-semibold">
                            <button
                              type="button"
                              onClick={() => setNewItemSourceType('upload')}
                              className={`px-2 py-1 ${newItemSourceType === 'upload' ? 'text-white' : ''}`}
                              style={newItemSourceType === 'upload' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                            >
                              Upload PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewItemSourceType('external')}
                              className={`px-2 py-1 ${newItemSourceType === 'external' ? 'text-white' : ''}`}
                              style={newItemSourceType === 'external' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                            >
                              Google Drive / Link
                            </button>
                          </div>
                          {newItemSourceType === 'upload' && (
                            <label
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-white cursor-pointer"
                              style={{ backgroundColor: 'var(--secondary-color)' }}
                              title={`Max Document Size: ${maxDocumentMb} MB`}
                            >
                              <Upload className="w-3 h-3" />
                              <span>Choose File (Max {maxDocumentMb} MB)</span>
                              <input
                                type="file"
                                accept=".pdf,.docx,.xlsx,.jpg,.png"
                                className="sr-only"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = '';
                                  if (!f) return;
                                  try {
                                    const u = await uploadBinaryFile(f);
                                    setNewItemUrl(u);
                                    notify('ok', 'Item attachment uploaded.');
                                  } catch (err) {
                                    notify('err', (err as Error).message);
                                  }
                                }}
                              />
                            </label>
                          )}
                          <input
                            type="text"
                            value={newItemUrl}
                            onChange={(e) => setNewItemUrl(e.target.value)}
                            placeholder="https://drive.google.com/... or /uploads/..."
                            className="flex-1 min-w-[180px] px-2.5 py-1 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newItemTitle.trim()) {
                                notify('err', 'Enter an item title before adding.');
                                return;
                              }
                              if (newItemUrl && newItemSourceType === 'external') {
                                const check = validateExternalDocumentUrl(newItemUrl);
                                if (!check.valid) {
                                  notify('err', check.reason || 'Invalid external URL.');
                                  return;
                                }
                              }
                              setSubItems((prev) => [
                                ...prev,
                                {
                                  id: Date.now(),
                                  title: newItemTitle.trim(),
                                  date: newItemDate,
                                  badge: newItemBadge.trim() || undefined,
                                  description: newItemDesc.trim() || undefined,
                                  imageUrl: newItemImage.trim() || undefined,
                                  sourceType: newItemUrl ? newItemSourceType : undefined,
                                  url: newItemUrl.trim() || undefined,
                                },
                              ]);
                              setNewItemTitle('');
                              setNewItemDesc('');
                              setNewItemImage('');
                              setNewItemUrl('');
                            }}
                            className="px-3 py-1 rounded text-xs font-semibold text-white shrink-0"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                          >
                            + Add Card
                          </button>
                        </div>
                        {subItems.length > 0 && (
                          <ul className="divide-y divide-stone-200 dark:divide-slate-700 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            {subItems.map((it) => (
                              <li key={it.id} className="p-2 flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{it.title}</p>
                                  <p className="text-[11px] text-stone-500 truncate">
                                    {it.date} {it.badge ? `· ${it.badge}` : ''} {it.url ? `· ${it.sourceType === 'external' ? 'External Link' : 'File'}` : ''}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSubItems((prev) => prev.filter((x) => x.id !== it.id))}
                                  className="p-1 text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-4">
                          <label className="inline-flex items-center gap-2 text-xs font-medium">
                            <input
                              type="checkbox"
                              checked={subPublished}
                              onChange={(e) => setSubPublished(e.target.checked)}
                            />
                            <span>Published on Microsite Sidebar</span>
                          </label>
                          <label className="inline-flex items-center gap-2 text-xs font-medium">
                            <input
                              type="checkbox"
                              checked={subShareable}
                              onChange={(e) => setSubShareable(e.target.checked)}
                            />
                            <span>Allow Social Media Sharing</span>
                          </label>
                        </div>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                          style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{editingSubId ? 'Save Micro-Page' : 'Publish Micro-Page'}</span>
                        </button>
                      </div>
                    </form>

                    <div className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                      <h3 className="text-sm font-bold">{currentDept.shortName} Microsite Sub-Pages</h3>
                      <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                        {sortByOrder(currentDept.subPages).map((sp: DepartmentSubPage, idx: number, arr: DepartmentSubPage[]) => (
                          <li key={sp.id} className="py-3 flex items-center justify-between gap-2 text-sm">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="font-semibold truncate">{sp.title}</p>
                                {renderModerationBadge(sp.status)}
                              </div>
                              <p className="text-xs text-stone-500">
                                #{sp.sortOrder ?? idx + 1} · {sp.pageType || 'general'} · /{sp.slug} · {sp.photos?.length || 0} photos · {sp.items?.length || 0} items · {sp.isPublished ? 'Live' : 'Draft'} · {sp.isShareable !== false ? 'Share On' : 'Share Off'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() =>
                                  reorderCollection(
                                    currentDept.subPages,
                                    idx,
                                    -1,
                                    `/api/admin/departments/${currentDept.id}/subpages/reorder`,
                                    'department micro-pages',
                                  )
                                }
                                aria-label={`Move ${sp.title} up`}
                                title="Move Up"
                                className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === arr.length - 1}
                                onClick={() =>
                                  reorderCollection(
                                    currentDept.subPages,
                                    idx,
                                    1,
                                    `/api/admin/departments/${currentDept.id}/subpages/reorder`,
                                    'department micro-pages',
                                  )
                                }
                                aria-label={`Move ${sp.title} down`}
                                title="Move Down"
                                className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubId(sp.id);
                                  setSubTitle(sp.title ?? '');
                                  setSubSlug(sp.slug ?? '');
                                  setSubPageType(sp.pageType || 'general');
                                  setSubHtml(sp.contentHtml ?? '');
                                  setSubPhotos(sp.photos || []);
                                  setSubItems(sp.items || []);
                                  setSubPublished(sp.isPublished !== false);
                                  setSubShareable(sp.isShareable !== false);
                                }}
                                className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs hover:bg-stone-100 dark:hover:bg-slate-800"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete sub-page ${sp.title}`}
                                onClick={async () => {
                                  try {
                                    const res = await adminFetch<AdminMutateResult>(
                                      `/api/admin/departments/${currentDept.id}/subpages/${sp.id}`,
                                      'DELETE',
                                    );
                                    notify(
                                      'ok',
                                      res?.queuedForApproval && res?.message
                                        ? res.message
                                        : `Removed micro-page "${sp.title}".`,
                                    );
                                  } catch (err) {
                                    notify('err', (err as Error).message);
                                  }
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Department Faculty Manager (Photo Upload + Manual Sr. No. + Reordering + Custom Fields) */}
                {deptPanelMode === 'faculty' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          if (facExtUrl.trim()) {
                            const check = validateExternalDocumentUrl(facExtUrl.trim());
                            if (!check.valid) {
                              notify('err', check.reason || 'External Profile URL must start with https:// or http://');
                              return;
                            }
                          }
                          const payload = {
                            name: facName,
                            designation: facDesignation,
                            qualification: facQual,
                            specialization: facSpec,
                            email: facEmail,
                            phone: facPhone || undefined,
                            experienceYears: facExp,
                            sortOrder: Math.max(1, Number(facSortOrder) || 1),
                            photoUrl: facPhoto,
                            externalProfileUrl: facExtUrl.trim() || undefined,
                            externalProfileLabel: facExtLabel.trim() || undefined,
                            customFields: facCustomFields,
                          };
                          if (editingFacId) {
                            await adminFetch(
                              `/api/admin/departments/${currentDept.id}/faculty/${editingFacId}`,
                              'PUT',
                              payload,
                            );
                            notify('ok', `Updated faculty "${facName}".`);
                          } else {
                            await adminFetch(`/api/admin/departments/${currentDept.id}/faculty`, 'POST', payload);
                            notify('ok', `Added faculty "${facName}".`);
                          }
                          setEditingFacId(null);
                          setFacName('');
                          setFacSpec('');
                          setFacEmail('');
                          setFacPhone('');
                          setFacExtUrl('');
                          setFacSortOrder(currentDept.faculty.length + 1);
                          setFacCustomFields([]);
                        } catch (err) {
                          notify('err', (err as Error).message);
                        }
                      }}
                      className="lg:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold">
                          {editingFacId ? 'Edit Faculty Member' : `Add Faculty to ${currentDept.shortName}`}
                        </h2>
                        {editingFacId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFacId(null);
                              setFacName('');
                              setFacPhone('');
                              setFacExtUrl('');
                              setFacSortOrder(currentDept.faculty.length + 1);
                              setFacCustomFields([]);
                            }}
                            className="text-xs underline"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-3">
                          <label htmlFor="fac-sort-order" className="block text-[11px] font-semibold mb-1">
                            Manual Sr. No.
                          </label>
                          <input
                            id="fac-sort-order"
                            type="number"
                            min={1}
                            required
                            value={facSortOrder}
                            onChange={(e) => setFacSortOrder(Number(e.target.value))}
                            placeholder="Sr. No."
                            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-semibold mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            value={facName}
                            onChange={(e) => setFacName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold mb-1">Designation</label>
                          <input
                            type="text"
                            required
                            value={facDesignation}
                            onChange={(e) => setFacDesignation(e.target.value)}
                            placeholder="Designation"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={facQual}
                          onChange={(e) => setFacQual(e.target.value)}
                          placeholder="Qualification"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="number"
                          value={facExp}
                          onChange={(e) => setFacExp(Number(e.target.value))}
                          placeholder="Experience (Years)"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <input
                        type="text"
                        value={facSpec}
                        onChange={(e) => setFacSpec(e.target.value)}
                        placeholder="Area of Expertise / Specialization"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="email"
                          value={facEmail}
                          onChange={(e) => setFacEmail(e.target.value)}
                          placeholder="Institutional Email"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          value={facPhone}
                          onChange={(e) => setFacPhone(e.target.value)}
                          placeholder="Contact Phone / Ext (Optional)"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={facExtLabel}
                          onChange={(e) => setFacExtLabel(e.target.value)}
                          placeholder="External Link Label (e.g. Google Scholar)"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="url"
                          value={facExtUrl}
                          onChange={(e) => setFacExtUrl(e.target.value)}
                          placeholder="https://scholar.google.com/..."
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <ImageUploader
                        label="Faculty Portrait Photo"
                        value={facPhoto}
                        onChange={setFacPhoto}
                        uploadBinary={uploadBinaryFile}
                        aspectRatio="1:1"
                        maxPhotoMb={maxPhotoMb}
                        autoCropEnabled={autoCropEnabled}
                      />

                      {/* Dynamic Customizable Faculty Fields */}
                      <div className="p-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">Customizable Profile Fields ({facCustomFields.length})</span>
                          <span className="text-[11px] text-stone-500">Click preset or add custom field</span>
                        </div>
                        {(currentDept.facultyFieldSchema || []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(currentDept.facultyFieldSchema || []).map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setNewFacFieldLabel(preset)}
                                className="px-2 py-0.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] hover:bg-stone-100"
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5">
                          <input
                            type="text"
                            value={newFacFieldLabel}
                            onChange={(e) => setNewFacFieldLabel(e.target.value)}
                            placeholder="Field Label (e.g. Patents Filed)"
                            className="sm:col-span-4 px-2 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <input
                            type="text"
                            value={newFacFieldValue}
                            onChange={(e) => setNewFacFieldValue(e.target.value)}
                            placeholder="Value or URL"
                            className="sm:col-span-5 px-2 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                          <select
                            value={newFacFieldType}
                            onChange={(e) => setNewFacFieldType(e.target.value as 'text' | 'url')}
                            className="sm:col-span-3 px-2 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          >
                            <option value="text">Text</option>
                            <option value="url">Link URL</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newFacFieldLabel.trim() || !newFacFieldValue.trim()) {
                              notify('err', 'Enter both field label and value.');
                              return;
                            }
                            setFacCustomFields((prev) => [
                              ...prev,
                              {
                                id: `ff-${Date.now()}`,
                                label: newFacFieldLabel.trim(),
                                value: newFacFieldValue.trim(),
                                fieldType: newFacFieldType,
                              },
                            ]);
                            setNewFacFieldLabel('');
                            setNewFacFieldValue('');
                          }}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold text-white"
                          style={{ backgroundColor: 'var(--secondary-color)' }}
                        >
                          + Add Custom Field
                        </button>
                        {facCustomFields.length > 0 && (
                          <div className="space-y-1">
                            {facCustomFields.map((cf) => (
                              <div key={cf.id} className="flex items-center justify-between gap-2 px-2.5 py-1 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
                                <span className="truncate">
                                  <strong>{cf.label}:</strong> {cf.value}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setFacCustomFields((prev) => prev.filter((x) => x.id !== cf.id))}
                                  className="text-rose-600 p-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{editingFacId ? 'Update Faculty Profile' : 'Add Faculty Member'}</span>
                      </button>
                    </form>

                    <div className="lg:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                      <h3 className="text-sm font-bold mb-3">{currentDept.shortName} Faculty Profiles (Ordered by Sr. No.)</h3>
                      <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                        {sortByOrder(currentDept.faculty).map((f: FacultyMember, idx: number, arr: FacultyMember[]) => (
                          <li key={f.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-mono-tabular font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 shrink-0">
                                Sr. {f.sortOrder ?? idx + 1}
                              </span>
                              <img src={f.photoUrl} alt={f.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-stone-200" />
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{f.name}</p>
                                <p className="text-xs text-stone-500 truncate">
                                  {f.designation} · {f.qualification} · {(f.customFields || []).length} custom fields
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() =>
                                  reorderCollection(
                                    currentDept.faculty,
                                    idx,
                                    -1,
                                    `/api/admin/departments/${currentDept.id}/faculty/reorder`,
                                    'faculty directory order',
                                  )
                                }
                                aria-label={`Move ${f.name} up`}
                                title="Move Up"
                                className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === arr.length - 1}
                                onClick={() =>
                                  reorderCollection(
                                    currentDept.faculty,
                                    idx,
                                    1,
                                    `/api/admin/departments/${currentDept.id}/faculty/reorder`,
                                    'faculty directory order',
                                  )
                                }
                                aria-label={`Move ${f.name} down`}
                                title="Move Down"
                                className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFacId(f.id);
                                  setFacName(f.name ?? '');
                                  setFacDesignation(f.designation ?? '');
                                  setFacQual(f.qualification ?? '');
                                  setFacSpec(f.specialization ?? '');
                                  setFacEmail(f.email ?? '');
                                  setFacPhone(f.phone || '');
                                  setFacExp(f.experienceYears ?? 0);
                                  setFacSortOrder(f.sortOrder ?? idx + 1);
                                  setFacPhoto(f.photoUrl ?? '');
                                  setFacExtUrl(f.externalProfileUrl || '');
                                  setFacExtLabel(f.externalProfileLabel || 'Google Scholar / Profile');
                                  setFacCustomFields(f.customFields || []);
                                }}
                                className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await adminFetch(`/api/admin/departments/${currentDept.id}/faculty/${f.id}`, 'DELETE');
                                  notify('ok', `Removed faculty "${f.name}".`);
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Department Labs Manager (with Photo Upload, Sort Order & Edit) */}
                {deptPanelMode === 'labs' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const labPayload = {
                            name: labName,
                            areaSqFt: labArea,
                            equipmentSummary: labEquip,
                            incharge: labIncharge || currentDept.hodName,
                            photoUrl: labPhotoUrl || undefined,
                            sortOrder: Math.max(1, Number(labSortOrder) || 1),
                          };
                          if (editingLabId) {
                            await adminFetch(
                              `/api/admin/departments/${currentDept.id}/labs/${editingLabId}`,
                              'PUT',
                              labPayload,
                            );
                            notify('ok', `Updated laboratory "${labName}".`);
                          } else {
                            await adminFetch(`/api/admin/departments/${currentDept.id}/labs`, 'POST', labPayload);
                            notify('ok', 'Added department laboratory.');
                          }
                          setEditingLabId(null);
                          setLabName('');
                          setLabEquip('');
                          setLabIncharge('');
                          setLabPhotoUrl('');
                          setLabSortOrder(currentDept.labs.length + 1);
                        } catch (err) {
                          notify('err', (err as Error).message);
                        }
                      }}
                      className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold">
                          {editingLabId ? 'Edit Department Laboratory' : 'Add Department Laboratory'}
                        </h2>
                        {editingLabId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLabId(null);
                              setLabName('');
                              setLabEquip('');
                              setLabIncharge('');
                              setLabPhotoUrl('');
                              setLabSortOrder(currentDept.labs.length + 1);
                            }}
                            className="text-xs underline"
                          >
                            Cancel Edit
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={labName}
                        onChange={(e) => setLabName(e.target.value)}
                        placeholder="Laboratory Name"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <div className="grid grid-cols-3 gap-2.5">
                        <input
                          type="number"
                          value={labArea}
                          onChange={(e) => setLabArea(Number(e.target.value))}
                          placeholder="Area (sq. ft.)"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="number"
                          min={1}
                          value={labSortOrder}
                          onChange={(e) => setLabSortOrder(Number(e.target.value))}
                          placeholder="Order"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          value={labIncharge}
                          onChange={(e) => setLabIncharge(e.target.value)}
                          placeholder="Lab In-Charge"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <textarea
                        rows={3}
                        value={labEquip}
                        onChange={(e) => setLabEquip(e.target.value)}
                        placeholder="Key equipment & software..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <ImageUploader
                        label="Laboratory Photo (Optional)"
                        value={labPhotoUrl}
                        onChange={setLabPhotoUrl}
                        uploadBinary={uploadBinaryFile}
                        aspectRatio="4:3"
                        maxPhotoMb={maxPhotoMb}
                        autoCropEnabled={autoCropEnabled}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        {editingLabId ? 'Update Laboratory' : 'Add Laboratory'}
                      </button>
                    </form>

                    <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                      <h3 className="text-sm font-bold">{currentDept.shortName} Laboratories</h3>
                      <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                        {sortByOrder(currentDept.labs).map((lab, idx, arr) => (
                          <li key={lab.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                            <div className="flex items-start gap-3 min-w-0">
                              {lab.photoUrl && (
                                <img src={lab.photoUrl} alt={lab.name} className="w-12 h-10 rounded object-cover shrink-0 border border-stone-200" />
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold">
                                  <span className="text-xs font-mono-tabular text-stone-500 mr-1.5">#{lab.sortOrder ?? idx + 1}</span>
                                  {lab.name}
                                </p>
                                <p className="text-xs text-stone-500">
                                  {lab.areaSqFt} sq.ft · In-charge: {lab.incharge}
                                </p>
                                <p className="text-xs text-stone-600 dark:text-slate-300 mt-1">{lab.equipmentSummary}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() =>
                                  reorderCollection(
                                    currentDept.labs,
                                    idx,
                                    -1,
                                    `/api/admin/departments/${currentDept.id}/labs/reorder`,
                                    'department laboratories',
                                  )
                                }
                                aria-label={`Move ${lab.name} up`}
                                title="Move Up"
                                className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === arr.length - 1}
                                onClick={() =>
                                  reorderCollection(
                                    currentDept.labs,
                                    idx,
                                    1,
                                    `/api/admin/departments/${currentDept.id}/labs/reorder`,
                                    'department laboratories',
                                  )
                                }
                                aria-label={`Move ${lab.name} down`}
                                title="Move Down"
                                className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLabId(lab.id);
                                  setLabName(lab.name);
                                  setLabArea(lab.areaSqFt);
                                  setLabEquip(lab.equipmentSummary);
                                  setLabIncharge(lab.incharge);
                                  setLabPhotoUrl(lab.photoUrl || '');
                                  setLabSortOrder(lab.sortOrder ?? idx + 1);
                                }}
                                className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  adminFetch(`/api/admin/departments/${currentDept.id}/labs/${lab.id}`, 'DELETE').then(() =>
                                    notify('ok', 'Laboratory deleted.'),
                                  )
                                }
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Department Library Manager & Faculty Field Schema */}
                {deptPanelMode === 'library_fields' && (() => {
                  const lib = deptDraft.library ?? currentDept.library ?? {
                    title: `${currentDept.shortName} Departmental Library`,
                    description: 'Departmental reference library with textbooks, project reports, and IEEE access.',
                    photoUrl: '',
                    totalVolumes: 1200,
                    seatingCapacity: 24,
                    incharge: currentDept.hodName,
                    timings: '9:30 AM – 5:15 PM (Mon – Sat)',
                  };
                  const schema = deptDraft.facultyFieldSchema ?? currentDept.facultyFieldSchema ?? [
                    'Area of Expertise',
                    'Research Publications',
                    'External Profile URL',
                  ];
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          try {
                            await adminFetch(`/api/admin/departments/${currentDept.id}`, 'PUT', {
                              library: lib,
                              facultyFieldSchema: schema,
                            });
                            notify('ok', 'Saved Department Library & Faculty Field Schema.');
                          } catch (err) {
                            notify('err', (err as Error).message);
                          }
                        }}
                        className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3.5"
                      >
                        <h2 className="text-base font-bold">Department Library Showcase &amp; Photo Upload</h2>
                        <input
                          type="text"
                          value={lib.title ?? ''}
                          onChange={(e) => setDeptDraft({ ...deptDraft, library: { ...lib, title: e.target.value } })}
                          placeholder="Library Title"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <input
                            type="number"
                            value={lib.totalVolumes ?? 1200}
                            onChange={(e) =>
                              setDeptDraft({ ...deptDraft, library: { ...lib, totalVolumes: Number(e.target.value) } })
                            }
                            placeholder="Volumes"
                            className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                          <input
                            type="number"
                            value={lib.seatingCapacity ?? 24}
                            onChange={(e) =>
                              setDeptDraft({ ...deptDraft, library: { ...lib, seatingCapacity: Number(e.target.value) } })
                            }
                            placeholder="Seats"
                            className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                          <input
                            type="text"
                            value={lib.timings ?? ''}
                            onChange={(e) => setDeptDraft({ ...deptDraft, library: { ...lib, timings: e.target.value } })}
                            placeholder="Timings"
                            className="col-span-2 px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </div>
                        <input
                          type="text"
                          value={lib.incharge ?? ''}
                          onChange={(e) => setDeptDraft({ ...deptDraft, library: { ...lib, incharge: e.target.value } })}
                          placeholder="Library In-Charge"
                          className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <textarea
                          rows={2}
                          value={lib.description ?? ''}
                          onChange={(e) =>
                            setDeptDraft({ ...deptDraft, library: { ...lib, description: e.target.value } })
                          }
                          placeholder="Department library collections, journals & facilities..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <ImageUploader
                          label="Department Library Photo"
                          value={lib.photoUrl ?? ''}
                          onChange={(url) => setDeptDraft({ ...deptDraft, library: { ...lib, photoUrl: url } })}
                          uploadBinary={uploadBinaryFile}
                          aspectRatio="4:3"
                          maxPhotoMb={maxPhotoMb}
                          autoCropEnabled={autoCropEnabled}
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                          style={{ backgroundColor: 'var(--primary-color)' }}
                        >
                          Save Department Library &amp; Schema
                        </button>
                      </form>

                      <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                        <h3 className="text-sm font-bold">Standard Faculty Profile Custom Fields</h3>
                        <p className="text-xs text-stone-500">
                          Manage department-wide preset fields (e.g., ORCID, Patents, Consultancy) available in one click when adding/editing faculty.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSchemaField}
                            onChange={(e) => setNewSchemaField(e.target.value)}
                            placeholder="New Field Name (e.g. Scopus ID)"
                            className="flex-1 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              if (!newSchemaField.trim()) return;
                              const updated = [...schema, newSchemaField.trim()];
                              setDeptDraft({ ...deptDraft, facultyFieldSchema: updated });
                              setNewSchemaField('');
                              await adminFetch(`/api/admin/departments/${currentDept.id}`, 'PUT', {
                                facultyFieldSchema: updated,
                              });
                              notify('ok', 'Added faculty custom field preset.');
                            }}
                            className="px-3 py-1.5 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: 'var(--secondary-color)' }}
                          >
                            + Add
                          </button>
                        </div>
                        <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                          {schema.map((fieldLbl, fIdx) => (
                            <li key={fIdx} className="py-2 flex items-center justify-between text-xs">
                              <span className="font-semibold">{fieldLbl}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const updated = schema.filter((_, i) => i !== fIdx);
                                  setDeptDraft({ ...deptDraft, facultyFieldSchema: updated });
                                  await adminFetch(`/api/admin/departments/${currentDept.id}`, 'PUT', {
                                    facultyFieldSchema: updated,
                                  });
                                  notify('ok', `Removed field "${fieldLbl}".`);
                                }}
                                className="text-rose-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()}

                {/* Edit Department Overview, Vision, Mission, Hero Image */}
                {deptPanelMode === 'profile' && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        const res = await adminFetch<AdminMutateResult>(`/api/admin/departments/${currentDept.id}`, 'PUT', {
                          name: deptDraft.name ?? currentDept.name,
                          shortName: deptDraft.shortName ?? currentDept.shortName,
                          code: deptDraft.code ?? currentDept.code,
                          establishedYear: deptDraft.establishedYear ?? currentDept.establishedYear,
                          intakeCapacity: deptDraft.intakeCapacity ?? currentDept.intakeCapacity,
                          nbaStatus: deptDraft.nbaStatus ?? currentDept.nbaStatus,
                          hodName: deptDraft.hodName ?? currentDept.hodName,
                          hodMessage: deptDraft.hodMessage ?? currentDept.hodMessage,
                          overview: deptDraft.overview ?? currentDept.overview,
                          vision: deptDraft.vision ?? currentDept.vision,
                          mission: deptDraft.mission ?? currentDept.mission,
                          heroImageUrl: deptDraft.heroImageUrl ?? currentDept.heroImageUrl,
                          isShareable: (deptDraft.isShareable ?? currentDept.isShareable) !== false,
                        });
                        notify(
                          'ok',
                          res?.queuedForApproval && res?.message
                            ? res.message
                            : 'Updated department profile & banner image.',
                        );
                      } catch (err) {
                        notify('err', (err as Error).message);
                      }
                    }}
                    className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold">Edit {currentDept.name} Microsite Profile</h2>
                      {renderModerationBadge(currentDept.status)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={deptDraft.name ?? currentDept.name ?? ''}
                        onChange={(e) => setDeptDraft({ ...deptDraft, name: e.target.value })}
                        placeholder="Department Name"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 sm:col-span-2"
                      />
                      <input
                        type="text"
                        value={deptDraft.nbaStatus ?? currentDept.nbaStatus ?? ''}
                        onChange={(e) => setDeptDraft({ ...deptDraft, nbaStatus: e.target.value })}
                        placeholder="NBA / Accreditation Status"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={deptDraft.hodName ?? currentDept.hodName ?? ''}
                        onChange={(e) => setDeptDraft({ ...deptDraft, hodName: e.target.value })}
                        placeholder="HoD Name"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="number"
                        value={deptDraft.establishedYear ?? currentDept.establishedYear ?? 2026}
                        onChange={(e) => setDeptDraft({ ...deptDraft, establishedYear: Number(e.target.value) })}
                        placeholder="Established Year"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="number"
                        value={deptDraft.intakeCapacity ?? currentDept.intakeCapacity ?? 60}
                        onChange={(e) => setDeptDraft({ ...deptDraft, intakeCapacity: Number(e.target.value) })}
                        placeholder="Intake Capacity"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={deptDraft.overview ?? currentDept.overview ?? ''}
                      onChange={(e) => setDeptDraft({ ...deptDraft, overview: e.target.value })}
                      placeholder="Department Overview"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <textarea
                        rows={2}
                        value={deptDraft.vision ?? currentDept.vision ?? ''}
                        onChange={(e) => setDeptDraft({ ...deptDraft, vision: e.target.value })}
                        placeholder="Department Vision"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <textarea
                        rows={2}
                        value={deptDraft.mission ?? currentDept.mission ?? ''}
                        onChange={(e) => setDeptDraft({ ...deptDraft, mission: e.target.value })}
                        placeholder="Department Mission"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <ImageUploader
                      label="Department Hero Banner Image"
                      value={deptDraft.heroImageUrl ?? currentDept.heroImageUrl ?? ''}
                      onChange={(url) => setDeptDraft({ ...deptDraft, heroImageUrl: url })}
                      uploadBinary={uploadBinaryFile}
                      aspectRatio="16:9"
                      maxPhotoMb={maxPhotoMb}
                      autoCropEnabled={autoCropEnabled}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-xs font-medium">
                        <input
                          type="checkbox"
                          checked={(deptDraft.isShareable ?? currentDept.isShareable) !== false}
                          onChange={(e) => setDeptDraft({ ...deptDraft, isShareable: e.target.checked })}
                        />
                        <span>Allow Social Media Sharing on Department Microsite</span>
                      </label>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        Save Department Profile
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. HOMEPAGE SLIDERS, TICKER, EVENTS & SECTION BUILDER */}
        {activeTab === 'homepage' && canHomepage && state && (
          <div className="space-y-6">
            {canSettings && (
              <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-stone-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setHomepageMode('sliders')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                    homepageMode === 'sliders' ? 'text-white' : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100'
                  }`}
                  style={homepageMode === 'sliders' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  Hero Sliders, Ticker &amp; Events
                </button>
                <button
                  type="button"
                  onClick={() => setHomepageMode('sections')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                    homepageMode === 'sections' ? 'text-white' : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100'
                  }`}
                  style={homepageMode === 'sections' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  Homepage Sections, Stats &amp; Badges Builder
                </button>
                <button
                  type="button"
                  onClick={() => setHomepageMode('components')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${
                    homepageMode === 'components' ? 'text-white' : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100'
                  }`}
                  style={homepageMode === 'components' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  Custom HTML Components ({(state.settings?.customHomeComponents || []).length})
                </button>
              </div>
            )}

          {homepageMode === 'components' && canSettings ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    if (editingHomeCompId) {
                      const res = await adminFetch<AdminMutateResult>(`/api/admin/home-components/${editingHomeCompId}`, 'PUT', {
                        title: homeCompTitle,
                        placement: homeCompPlacement,
                        contentHtml: homeCompHtml,
                        isActive: homeCompActive,
                      });
                      notify(
                        'ok',
                        res?.queuedForApproval && res?.message
                          ? res.message
                          : `Updated Homepage HTML Component "${homeCompTitle}".`,
                      );
                    } else {
                      const res = await adminFetch<AdminMutateResult>('/api/admin/home-components', 'POST', {
                        title: homeCompTitle,
                        placement: homeCompPlacement,
                        contentHtml: homeCompHtml,
                        isActive: homeCompActive,
                      });
                      notify(
                        'ok',
                        res?.queuedForApproval && res?.message
                          ? res.message
                          : `Published Homepage HTML Component "${homeCompTitle}".`,
                      );
                    }
                    setEditingHomeCompId(null);
                    setHomeCompTitle('');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
                className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">
                      {editingHomeCompId ? `Edit Component: ${homeCompTitle}` : 'Add Custom Homepage HTML Component'}
                    </h2>
                    <p className="text-xs text-stone-500">
                      Insert custom visual cards, tables, admission banners, or widgets directly onto the Homepage without touching code.
                    </p>
                  </div>
                  {editingHomeCompId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHomeCompId(null);
                        setHomeCompTitle('');
                      }}
                      className="text-xs underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Component Title</label>
                    <input
                      type="text"
                      required
                      value={homeCompTitle}
                      onChange={(e) => setHomeCompTitle(e.target.value)}
                      placeholder="e.g. CAP Admission Notice Banner"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Homepage Placement Slot</label>
                    <select
                      value={homeCompPlacement}
                      onChange={(e) => setHomeCompPlacement(e.target.value as HomeComponentPlacement)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="after-hero">Slot 1: Directly After Hero Slider</option>
                      <option value="after-about">Slot 2: After About &amp; Vision Section</option>
                      <option value="after-depts">Slot 3: After Departments &amp; Exam Portal</option>
                      <option value="before-footer">Slot 4: Before Footer</option>
                    </select>
                  </div>
                </div>
                <RichTextEditor
                  label="Custom Component Design (Visual Block Builder + Full HTML Editor)"
                  value={homeCompHtml}
                  onChange={setHomeCompHtml}
                  uploadBinary={uploadBinaryFile}
                  maxPhotoMb={maxPhotoMb}
                  autoCropEnabled={autoCropEnabled}
                  minHeight={220}
                />
                <div className="flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={homeCompActive}
                      onChange={(e) => setHomeCompActive(e.target.checked)}
                    />
                    <span>Active &amp; Visible on Public Homepage</span>
                  </label>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{editingHomeCompId ? 'Save Component' : 'Publish Homepage Component'}</span>
                  </button>
                </div>
              </form>

              <div className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="text-sm font-bold">
                  Custom Homepage Blocks ({(state.settings?.customHomeComponents || []).length})
                </h3>
                {(state.settings?.customHomeComponents || []).length === 0 ? (
                  <p className="text-xs text-stone-500 py-4">
                    No custom HTML components added yet. Use the Visual Editor on the left to publish one.
                  </p>
                ) : (
                  <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                    {(state.settings?.customHomeComponents || []).map((comp: CustomHomeComponent, idx: number) => {
                      const list: CustomHomeComponent[] = state.settings?.customHomeComponents || [];
                      const moveComp = async (dir: -1 | 1) => {
                        const target = idx + dir;
                        if (target < 0 || target >= list.length) return;
                        const ids = list.map((x) => x.id);
                        [ids[idx], ids[target]] = [ids[target], ids[idx]];
                        await adminFetch('/api/admin/home-components/reorder', 'PUT', { orderedIds: ids });
                        notify('ok', `Reordered "${comp.title}".`);
                      };
                      return (
                        <li key={comp.id} className="py-3 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-semibold text-sm truncate">{comp.title}</p>
                              {renderModerationBadge(comp.status)}
                            </div>
                            <p className="text-stone-500">
                              Slot: {comp.placement} · Order #{comp.sortOrder} · {comp.isActive ? 'Active' : 'Hidden'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveComp(-1)}
                              disabled={idx === 0}
                              className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveComp(1)}
                              disabled={idx === list.length - 1}
                              className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                adminFetch<AdminMutateResult>(`/api/admin/home-components/${comp.id}`, 'PUT', {
                                  isActive: !comp.isActive,
                                }).then((res) =>
                                  notify(
                                    'ok',
                                    res?.queuedForApproval && res?.message
                                      ? res.message
                                      : comp.isActive
                                        ? 'Component hidden.'
                                        : 'Component enabled.',
                                  ),
                                )
                              }
                              className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                            >
                              {comp.isActive ? 'Hide' : 'Show'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHomeCompId(comp.id);
                                setHomeCompTitle(comp.title ?? '');
                                setHomeCompPlacement(comp.placement || 'after-hero');
                                setHomeCompHtml(comp.contentHtml ?? '');
                                setHomeCompActive(comp.isActive !== false);
                              }}
                              className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete ${comp.title}`}
                              onClick={() =>
                                adminFetch<AdminMutateResult>(`/api/admin/home-components/${comp.id}`, 'DELETE').then((res) =>
                                  notify(
                                    'ok',
                                    res?.queuedForApproval && res?.message
                                      ? res.message
                                      : `Deleted component "${comp.title}".`,
                                  ),
                                )
                              }
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : homepageMode === 'sections' && canSettings && settingsDraft ? (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold">Manage Homepage Blocks, Key Metrics &amp; Statutory Cards</h2>
                  <p className="text-xs text-stone-500">Toggle sections on/off, customize headings, and manage metrics without touching any code.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    adminFetch('/api/admin/settings', 'PUT', settingsDraft)
                      .then(() => notify('ok', 'Homepage layout sections & metrics saved!'))
                      .catch((err) => notify('err', (err as Error).message))
                  }
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Save Homepage Layout
                </button>
              </div>

              {/* Section Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {(
                  [
                    ['showTicker', 'Scrolling News / FRA Fee Ticker'],
                    ['showSlider', 'Hero Image Banner Slider'],
                    ['showStatsAndRecognitions', 'Institutional Metrics & Recognition Bar'],
                    ['showAboutAndDownloads', 'About Campus & Downloads Split'],
                    ['showApprovedAndVision', 'Approved Bodies & Vision/Mission'],
                    ['showLeadershipDesk', 'Our Desk & Leadership Cards'],
                    ['showExaminationSpotlight', 'Autonomous Examination Portal Spotlight'],
                    ['showDepartments', 'Academic Departments Microsites'],
                    ['showCategoriesDirectory', 'All Categories & Portals Directory'],
                    ['showEventsAndRecruiters', 'Events, Circulars & Top Recruiters'],
                  ] as const
                ).map(([key, label]) => {
                  const hs = settingsDraft.homeSections || {
                    showTicker: true,
                    showSlider: true,
                    showStatsAndRecognitions: true,
                    showAboutAndDownloads: true,
                    showApprovedAndVision: true,
                    showLeadershipDesk: true,
                    showExaminationSpotlight: true,
                    showDepartments: true,
                    showCategoriesDirectory: true,
                    showEventsAndRecruiters: true,
                  };
                  const checked = hs[key] !== false;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2.5 p-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            homeSections: { ...hs, [key]: e.target.checked },
                          })
                        }
                      />
                      <span className="font-semibold text-stone-800 dark:text-slate-200">{label}</span>
                    </label>
                  );
                })}
              </div>

              {/* Custom Section Headings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    ['aboutHeading', 'About Section Heading', 'ABOUT US'],
                    ['downloadsHeading', 'Downloads Heading', 'DOWNLOADS'],
                    ['leadershipHeading', 'Leadership Desk Heading', 'OUR DESK & LEADERSHIP'],
                    ['examinationHeading', 'Examination Section Heading', 'AUTONOMOUS EXAMINATION PORTAL'],
                    ['departmentsHeading', 'Departments Section Heading', 'Academic Departments'],
                    ['categoriesHeading', 'Categories Directory Heading', 'Statutory Self-Disclosure & Autonomous Portals'],
                  ] as const
                ).map(([field, label, fallback]) => {
                  const hs = settingsDraft.homeSections || {
                    showTicker: true,
                    showSlider: true,
                    showStatsAndRecognitions: true,
                    showAboutAndDownloads: true,
                    showApprovedAndVision: true,
                    showLeadershipDesk: true,
                    showExaminationSpotlight: true,
                    showDepartments: true,
                    showCategoriesDirectory: true,
                    showEventsAndRecruiters: true,
                  };
                  return (
                    <div key={field}>
                      <label className="block text-xs font-semibold mb-1">{label}</label>
                      <input
                        type="text"
                        value={hs[field] ?? fallback}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            homeSections: { ...hs, [field]: e.target.value },
                          })
                        }
                        className="w-full px-3 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Key Stats Metrics Builder */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-stone-200 dark:border-slate-800">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Key Highlight Statistics Bar</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          highlightsStats: [...(settingsDraft.highlightsStats || []), { label: 'New Metric', value: '100%' }],
                        })
                      }
                      className="px-2.5 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: 'var(--secondary-color)' }}
                    >
                      + Add Stat
                    </button>
                  </div>
                  {(settingsDraft.highlightsStats || []).map((st, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={st.value ?? ''}
                        onChange={(e) => {
                          const next = [...(settingsDraft.highlightsStats || [])];
                          next[idx] = { ...st, value: e.target.value };
                          setSettingsDraft({ ...settingsDraft, highlightsStats: next });
                        }}
                        placeholder="91.1%"
                        className="w-28 px-2.5 py-1.5 text-xs font-bold rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="text"
                        value={st.label ?? ''}
                        onChange={(e) => {
                          const next = [...(settingsDraft.highlightsStats || [])];
                          next[idx] = { ...st, label: e.target.value };
                          setSettingsDraft({ ...settingsDraft, highlightsStats: next });
                        }}
                        placeholder="Placement Rate"
                        className="flex-1 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSettingsDraft({
                            ...settingsDraft,
                            highlightsStats: (settingsDraft.highlightsStats || []).filter((_, i) => i !== idx),
                          })
                        }
                        className="p-1.5 text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Approved Bodies Cards Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Approved &amp; Affiliated Body Cards</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          approvedBodies: [
                            ...(settingsDraft.approvedBodies || []),
                            { name: 'AICTE Approved', url: '/page/recognition-approvals' },
                          ],
                        })
                      }
                      className="px-2.5 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: 'var(--secondary-color)' }}
                    >
                      + Add Approval Card
                    </button>
                  </div>
                  {(settingsDraft.approvedBodies || []).map((ab, idx) => (
                    <div key={idx} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ab.name ?? ''}
                          onChange={(e) => {
                            const next = [...(settingsDraft.approvedBodies || [])];
                            next[idx] = { ...ab, name: e.target.value };
                            setSettingsDraft({ ...settingsDraft, approvedBodies: next });
                          }}
                          placeholder="Statutory Body Name"
                          className="flex-1 px-2.5 py-1.5 text-xs font-semibold rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSettingsDraft({
                              ...settingsDraft,
                              approvedBodies: (settingsDraft.approvedBodies || []).filter((_, i) => i !== idx),
                            })
                          }
                          className="p-1.5 text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <LinkTargetPicker
                        value={ab.url}
                        onChange={(url) => {
                          const next = [...(settingsDraft.approvedBodies || [])];
                          next[idx] = { ...ab, url };
                          setSettingsDraft({ ...settingsDraft, approvedBodies: next });
                        }}
                        categories={state.categories}
                        pages={state.pages}
                        departments={state.departments}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hero Slides */}
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Hero Slider Manager</h2>
                {editingSlideId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSlideId(null);
                      setSlideTitle('');
                      setSlideCaption('');
                    }}
                    className="text-xs underline"
                  >
                    New
                  </button>
                )}
              </div>
              <ul className="space-y-2">
                {sortByOrder(state.sliders).map((s, idx, arr) => (
                  <li key={s.id} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={s.imageUrl} alt={s.title} className="w-10 h-8 rounded object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold truncate">{s.title}</p>
                          {renderModerationBadge(s.status)}
                        </div>
                        <p className="text-stone-500 truncate">#{s.sortOrder ?? idx + 1} · {s.ctaLink}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => reorderCollection(state.sliders, idx, -1, '/api/admin/sliders/reorder', 'hero sliders')}
                        aria-label={`Move slide ${s.title} up`}
                        title="Move Up"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => reorderCollection(state.sliders, idx, 1, '/api/admin/sliders/reorder', 'hero sliders')}
                        aria-label={`Move slide ${s.title} down`}
                        title="Move Down"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSlideId(s.id);
                          setSlideTitle(s.title ?? '');
                          setSlideCaption(s.caption ?? '');
                          setSlideImage(s.imageUrl ?? '');
                          setSlideCta(s.ctaLabel ?? '');
                          setSlideLink(s.ctaLink ?? '');
                        }}
                        className="p-1 text-stone-600 hover:bg-stone-100 rounded"
                        title="Edit Slide"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch<AdminMutateResult>(`/api/admin/sliders/${s.id}`, 'DELETE').then((res) =>
                            notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Slide deleted'),
                          )
                        }
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    if (editingSlideId) {
                      const res = await adminFetch<AdminMutateResult>(`/api/admin/sliders/${editingSlideId}`, 'PUT', {
                        title: slideTitle,
                        caption: slideCaption,
                        imageUrl: slideImage,
                        ctaLabel: slideCta,
                        ctaLink: slideLink,
                      });
                      notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Updated hero slide.');
                    } else {
                      const res = await adminFetch<AdminMutateResult>('/api/admin/sliders', 'POST', {
                        title: slideTitle,
                        caption: slideCaption,
                        imageUrl: slideImage,
                        ctaLabel: slideCta,
                        ctaLink: slideLink,
                      });
                      notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Added hero slide.');
                    }
                    setEditingSlideId(null);
                    setSlideTitle('');
                    setSlideCaption('');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
                className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-slate-800"
              >
                <input
                  type="text"
                  required
                  value={slideTitle}
                  onChange={(e) => setSlideTitle(e.target.value)}
                  placeholder="Slide Headline"
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={slideCaption}
                  onChange={(e) => setSlideCaption(e.target.value)}
                  placeholder="Caption"
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <ImageUploader
                  label="Banner Image"
                  value={slideImage}
                  onChange={setSlideImage}
                  uploadBinary={uploadBinaryFile}
                  aspectRatio="16:9"
                  maxPhotoMb={maxPhotoMb}
                  autoCropEnabled={autoCropEnabled}
                />
                <input
                  type="text"
                  value={slideCta}
                  onChange={(e) => setSlideCta(e.target.value)}
                  placeholder="CTA Button Label"
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <LinkTargetPicker
                  value={slideLink}
                  onChange={setSlideLink}
                  categories={state.categories}
                  pages={state.pages}
                  departments={state.departments}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {editingSlideId ? 'Update Slide' : 'Add Slide'}
                </button>
              </form>
            </div>

            {/* Ticker Manager */}
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-bold">Scrolling Ticker Manager</h2>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {sortByOrder(state.ticker).map((t, idx, arr) => (
                  <li key={t.id} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 flex items-start justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <div>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">{t.badgeText}: </span>
                        <span>{t.text}</span>
                      </div>
                      {renderModerationBadge(t.status)}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => reorderCollection(state.ticker, idx, -1, '/api/admin/ticker/reorder', 'ticker items')}
                        aria-label={`Move ticker item ${t.badgeText} up`}
                        title="Move Up"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => reorderCollection(state.ticker, idx, 1, '/api/admin/ticker/reorder', 'ticker items')}
                        aria-label={`Move ticker item ${t.badgeText} down`}
                        title="Move Down"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch<AdminMutateResult>(`/api/admin/ticker/${t.id}`, 'DELETE').then((res) =>
                            notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Ticker item removed'),
                          )
                        }
                        className="text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await adminFetch<AdminMutateResult>('/api/admin/ticker', 'POST', {
                    text: tickerText,
                    badgeText: tickerBadge,
                    linkUrl: tickerLink,
                  });
                  setTickerText('');
                  notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Ticker item added.');
                }}
                className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-slate-800"
              >
                <input
                  type="text"
                  required
                  value={tickerText}
                  onChange={(e) => setTickerText(e.target.value)}
                  placeholder="Scrolling announcement text..."
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={tickerBadge}
                  onChange={(e) => setTickerBadge(e.target.value)}
                  placeholder="Badge (e.g. FRA Fee, Exam)"
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <LinkTargetPicker
                  value={tickerLink}
                  onChange={setTickerLink}
                  categories={state.categories}
                  pages={state.pages}
                  departments={state.departments}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Publish Ticker
                </button>
              </form>
            </div>

            {/* Events & Circulars */}
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Events, Circulars &amp; Achievements</h2>
                {editingEventId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventId(null);
                      setEventTitle('');
                      setEventSummary('');
                      setEventImage('');
                      setEventShareable(true);
                    }}
                    className="text-xs underline"
                  >
                    New
                  </button>
                )}
              </div>
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {sortByOrder(state.events).map((ev, idx, arr) => (
                  <li key={ev.id} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold truncate">{ev.title}</p>
                        {renderModerationBadge(ev.status)}
                      </div>
                      <p className="text-stone-500 tabular-nums">
                        #{ev.sortOrder ?? idx + 1} · {ev.category} · {ev.eventDate} · {ev.isShareable !== false ? 'Share On' : 'Share Off'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => reorderCollection(state.events, idx, -1, '/api/admin/events/reorder', 'events & notices')}
                        aria-label={`Move ${ev.title} up`}
                        title="Move Up"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => reorderCollection(state.events, idx, 1, '/api/admin/events/reorder', 'events & notices')}
                        aria-label={`Move ${ev.title} down`}
                        title="Move Down"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEventId(ev.id);
                          setEventTitle(ev.title ?? '');
                          setEventDate(ev.eventDate ?? '');
                          setEventCat(ev.category || 'Notice');
                          setEventSummary(ev.summary ?? '');
                          setEventImage(ev.imageUrl || '');
                          setEventShareable(ev.isShareable !== false);
                        }}
                        className="p-1 text-stone-600 hover:bg-stone-100 rounded"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch<AdminMutateResult>(`/api/admin/events/${ev.id}`, 'DELETE').then((res) =>
                            notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Event deleted'),
                          )
                        }
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (editingEventId) {
                    const res = await adminFetch<AdminMutateResult>(`/api/admin/events/${editingEventId}`, 'PUT', {
                      title: eventTitle,
                      eventDate,
                      category: eventCat,
                      summary: eventSummary,
                      imageUrl: eventImage || undefined,
                      isShareable: eventShareable,
                    });
                    notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Updated event/notice.');
                  } else {
                    const res = await adminFetch<AdminMutateResult>('/api/admin/events', 'POST', {
                      title: eventTitle,
                      eventDate,
                      category: eventCat,
                      summary: eventSummary,
                      imageUrl: eventImage || undefined,
                      isShareable: eventShareable,
                    });
                    notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Published event/notice.');
                  }
                  setEditingEventId(null);
                  setEventTitle('');
                  setEventSummary('');
                  setEventImage('');
                  setEventShareable(true);
                }}
                className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-slate-800"
              >
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Notice or Event Title"
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                      Event / Circular Date
                    </label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <CustomSelectInput
                    label="Category"
                    required
                    value={eventCat}
                    onChange={setEventCat}
                    options={[...EVENT_CATEGORY_PRESETS]}
                    customPlaceholder="Enter custom event category..."
                  />
                </div>
                <textarea
                  rows={2}
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  placeholder="Summary..."
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <ImageUploader
                  label="Optional Event Photo"
                  value={eventImage}
                  onChange={setEventImage}
                  uploadBinary={uploadBinaryFile}
                  aspectRatio="3:2"
                  maxPhotoMb={maxPhotoMb}
                  autoCropEnabled={autoCropEnabled}
                />
                <label className="inline-flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={eventShareable}
                    onChange={(e) => setEventShareable(e.target.checked)}
                  />
                  <span>Allow Social Media Sharing on Event</span>
                </label>
                <button
                  type="submit"
                  className="block px-3 py-1.5 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {editingEventId ? 'Save Changes' : 'Publish Notice'}
                </button>
              </form>
            </div>
          </div>
          )}
          </div>
        )}

        {/* 5. LEADERSHIP & GOVERNANCE PROFILES (Custom Manual Groups, Sr. No. & Reordering) */}
        {activeTab === 'leadership' && canLeadership && state && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const payload = {
                    roleTitle: leadRole,
                    name: leadName,
                    qualification: leadQual,
                    email: leadEmail,
                    phone: leadPhone,
                    photoUrl: leadPhoto,
                    bio: leadBio,
                    committeeGroup: leadGroup.trim() || 'Statutory Officer',
                    sortOrder: Math.max(1, Number(leadSortOrder) || 1),
                  };
                  if (editingLeadId) {
                    const res = await adminFetch<AdminMutateResult>(`/api/admin/leadership/${editingLeadId}`, 'PUT', payload);
                    notify(
                      'ok',
                      res?.queuedForApproval && res?.message
                        ? res.message
                        : `Updated leadership profile "${leadName}".`,
                    );
                  } else {
                    const res = await adminFetch<AdminMutateResult>('/api/admin/leadership', 'POST', payload);
                    notify(
                      'ok',
                      res?.queuedForApproval && res?.message
                        ? res.message
                        : `Added leadership profile "${leadName}".`,
                    );
                  }
                  setEditingLeadId(null);
                  setLeadRole('');
                  setLeadName('');
                  setLeadQual('');
                  setLeadEmail('');
                  setLeadPhone('');
                  setLeadBio('');
                  setLeadGroup('Statutory Officer');
                  setLeadSortOrder(state.leadership.length + 1);
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  {editingLeadId ? 'Edit Officer / Leadership Desk' : 'Add Officer / Governance Profile'}
                </h2>
                {editingLeadId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLeadId(null);
                      setLeadSortOrder(state.leadership.length + 1);
                    }}
                    className="text-xs underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <label htmlFor="lead-sort-order" className="block text-[11px] font-semibold mb-1">
                    Sr. No.
                  </label>
                  <input
                    id="lead-sort-order"
                    type="number"
                    min={1}
                    required
                    value={leadSortOrder}
                    onChange={(e) => setLeadSortOrder(Number(e.target.value))}
                    placeholder="Order"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="sm:col-span-9">
                  <label className="block text-[11px] font-semibold mb-1">Role / Designation</label>
                  <input
                    type="text"
                    required
                    value={leadRole}
                    onChange={(e) => setLeadRole(e.target.value)}
                    placeholder="Role (e.g. Principal, President, Dean R&D)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <input
                type="text"
                required
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    value={leadQual}
                    onChange={(e) => setLeadQual(e.target.value)}
                    placeholder="Qualification (e.g. Ph.D., M.Tech)"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <CustomSelectInput
                  label="Committee / Leadership Group"
                  required
                  value={leadGroup}
                  onChange={setLeadGroup}
                  options={[...LEADERSHIP_GROUP_PRESETS]}
                  customPlaceholder="Enter custom committee name..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="Email"
                  className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="Phone"
                  className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <textarea
                rows={2}
                value={leadBio}
                onChange={(e) => setLeadBio(e.target.value)}
                placeholder="Desk message / short bio..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <ImageUploader
                label="Officer Portrait Photo"
                value={leadPhoto}
                onChange={setLeadPhoto}
                uploadBinary={uploadBinaryFile}
                aspectRatio="1:1"
                maxPhotoMb={maxPhotoMb}
                autoCropEnabled={autoCropEnabled}
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {editingLeadId ? 'Update Officer Profile' : 'Add Officer Profile'}
              </button>
            </form>

            <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h3 className="text-sm font-bold mb-3">Administration &amp; Leadership Desk ({state.leadership.length})</h3>
              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {sortByOrder(state.leadership).map((l, idx, arr) => (
                  <div key={l.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono-tabular font-bold px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 shrink-0">
                        #{l.sortOrder ?? idx + 1}
                      </span>
                      <img src={l.photoUrl} alt={l.name} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-stone-200" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          {l.roleTitle} · <span className="text-stone-600 dark:text-slate-300">{formatCommitteeGroupLabel(l.committeeGroup)}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-bold truncate">{l.name}</p>
                          {renderModerationBadge(l.status)}
                        </div>
                        <p className="text-xs text-stone-500 truncate">{l.email} · {l.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => reorderCollection(state.leadership, idx, -1, '/api/admin/leadership/reorder', 'leadership order')}
                        aria-label={`Move ${l.name} up`}
                        title="Move Up"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => reorderCollection(state.leadership, idx, 1, '/api/admin/leadership/reorder', 'leadership order')}
                        aria-label={`Move ${l.name} down`}
                        title="Move Down"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLeadId(l.id);
                          setLeadRole(l.roleTitle ?? '');
                          setLeadName(l.name ?? '');
                          setLeadQual(l.qualification ?? '');
                          setLeadEmail(l.email ?? '');
                          setLeadPhone(l.phone ?? '');
                          setLeadPhoto(l.photoUrl ?? '');
                          setLeadBio(l.bio ?? '');
                          setLeadGroup(formatCommitteeGroupLabel(l.committeeGroup));
                          setLeadSortOrder(l.sortOrder ?? idx + 1);
                        }}
                        className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch<AdminMutateResult>(`/api/admin/leadership/${l.id}`, 'DELETE').then((res) =>
                            notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Officer removed'),
                          )
                        }
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. PICTURE GALLERY ALBUMS & PHOTO UPLOAD */}
        {activeTab === 'gallery' && canGallery && state && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const res = await adminFetch<AdminMutateResult<GalleryAlbum>>('/api/admin/gallery/albums', 'POST', {
                      title: albumTitle,
                      category: albumCat,
                      eventDate: albumDate,
                      coverUrl: albumCover,
                    });
                    const created = (res?.item ?? res) as GalleryAlbum;
                    setAlbumTitle('');
                    if (created?.id) setSelectedAlbumId(created.id);
                    notify(
                      'ok',
                      res?.queuedForApproval && res?.message
                        ? res.message
                        : `Created photo album "${created?.title || albumTitle}".`,
                    );
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <h2 className="text-base font-bold">Create Photo Gallery Album</h2>
                <input
                  type="text"
                  required
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="Album Title (e.g. Annual TechFest 2026)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={albumCat}
                    onChange={(e) => setAlbumCat(e.target.value)}
                    placeholder="Category (Events, Campus)"
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="date"
                    value={albumDate}
                    onChange={(e) => setAlbumDate(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <ImageUploader
                  label="Album Cover Image"
                  value={albumCover}
                  onChange={setAlbumCover}
                  uploadBinary={uploadBinaryFile}
                  aspectRatio="4:3"
                  maxPhotoMb={maxPhotoMb}
                  autoCropEnabled={autoCropEnabled}
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Create Album
                </button>
              </form>

              {currentAlbum && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!photoUrl) {
                      notify('err', 'Please upload or enter a photo first.');
                      return;
                    }
                    await adminFetch(`/api/admin/gallery/albums/${currentAlbum.id}/photos`, 'POST', {
                      imageUrl: photoUrl,
                      caption: photoCaption || currentAlbum.title,
                    });
                    setPhotoUrl('');
                    setPhotoCaption('');
                    notify('ok', `Added photo to "${currentAlbum.title}".`);
                  }}
                  className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                >
                  <h3 className="text-sm font-bold">Add Photo to: {currentAlbum.title}</h3>
                  <ImageUploader
                    label="Select Photo to Upload"
                    value={photoUrl}
                    onChange={setPhotoUrl}
                    uploadBinary={uploadBinaryFile}
                    aspectRatio="4:3"
                    maxPhotoMb={maxPhotoMb}
                    autoCropEnabled={autoCropEnabled}
                  />
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Photo Caption"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--secondary-color)' }}
                  >
                    Add Photo to Album
                  </button>
                </form>
              )}
            </div>

            <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h3 className="text-sm font-bold">Albums &amp; Uploaded Photos ({state.gallery.length})</h3>
              <div className="space-y-4">
                {sortByOrder(state.gallery).map((alb, idx, arr) => (
                  <div key={alb.id} className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedAlbumId(alb.id)}
                        className="text-left"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-bold text-sm">#{alb.sortOrder ?? idx + 1} · {alb.title}</p>
                          {renderModerationBadge(alb.status)}
                        </div>
                        <p className="text-xs text-stone-500">{alb.category} · {alb.eventDate} · {alb.photos.length} Photos</p>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => reorderCollection(state.gallery, idx, -1, '/api/admin/gallery/albums/reorder', 'gallery albums')}
                          aria-label={`Move album ${alb.title} up`}
                          title="Move Up"
                          className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === arr.length - 1}
                          onClick={() => reorderCollection(state.gallery, idx, 1, '/api/admin/gallery/albums/reorder', 'gallery albums')}
                          aria-label={`Move album ${alb.title} down`}
                          title="Move Down"
                          className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAlbumId(alb.id)}
                          className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs"
                        >
                          Manage Photos
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            adminFetch<AdminMutateResult>(`/api/admin/gallery/albums/${alb.id}`, 'DELETE').then((res) =>
                              notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Album deleted'),
                            )
                          }
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {alb.photos.map((ph) => (
                        <div key={ph.id} className="relative group rounded-lg overflow-hidden border border-stone-200 h-20">
                          <img src={ph.imageUrl} alt={ph.altText} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => adminFetch(`/api/admin/gallery/albums/${alb.id}/photos/${ph.id}`, 'DELETE')}
                            aria-label="Delete photo"
                            className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white opacity-90 hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. DOCUMENTS & MEDIA UPLOAD OR EXTERNAL LINK MANAGER */}
        {activeTab === 'documents' && canDocs && state && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (docSourceType === 'external') {
                    const urlCheck = validateExternalDocumentUrl(docExternalUrl);
                    if (!urlCheck.valid) {
                      notify('err', urlCheck.reason || 'Provide a valid Google Drive or https:// document URL.');
                      return;
                    }
                    const res = await adminFetch<AdminMutateResult>('/api/admin/documents', 'POST', {
                      title: docTitle,
                      category: docCategory,
                      sourceType: 'external',
                      externalUrl: docExternalUrl.trim(),
                      isQuickLink: docQuickLink,
                    });
                    setDocTitle('');
                    setDocExternalUrl('');
                    notify(
                      'ok',
                      res?.queuedForApproval && res?.message
                        ? res.message
                        : 'External document link published to Repository.',
                    );
                    return;
                  }

                  const fileName = docFile ? docFile.name : `${docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
                  const mimeType = docFile ? docFile.type || 'application/pdf' : 'application/pdf';
                  const fileSizeBytes = docFile ? docFile.size : 245760;

                  const docLimitBytes = getUploadSizeLimitBytes(
                    activeSettings,
                    isImageFileMeta(fileName, mimeType) ? 'photo' : 'document',
                  );
                  const check = validateUploadMeta(fileName, mimeType, fileSizeBytes, docLimitBytes);
                  if (!check.valid) {
                    notify('err', check.reason || 'File blocked by security policy.');
                    return;
                  }

                  let base64Content: string | undefined;
                  if (docFile) {
                    base64Content = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result || ''));
                      reader.readAsDataURL(docFile);
                    });
                  }

                  const res = await adminFetch<AdminMutateResult>('/api/admin/documents', 'POST', {
                    title: docTitle,
                    category: docCategory,
                    sourceType: 'upload',
                    fileName,
                    mimeType,
                    fileSizeBytes,
                    base64Content,
                    isQuickLink: docQuickLink,
                  });
                  setDocTitle('');
                  setDocFile(null);
                  notify(
                    'ok',
                    res?.queuedForApproval && res?.message
                      ? res.message
                      : 'Document uploaded and published to Repository.',
                  );
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <h2 className="text-base font-bold">Publish Statutory Document / Circular</h2>
              <div className="inline-flex rounded-lg border border-stone-300 dark:border-slate-700 overflow-hidden bg-stone-50 dark:bg-slate-800 w-full">
                <button
                  type="button"
                  onClick={() => setDocSourceType('upload')}
                  className={`flex-1 py-1.5 text-xs font-semibold ${
                    docSourceType === 'upload' ? 'text-white' : 'text-stone-700 dark:text-slate-300'
                  }`}
                  style={docSourceType === 'upload' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  Upload Local File
                </button>
                <button
                  type="button"
                  onClick={() => setDocSourceType('external')}
                  className={`flex-1 py-1.5 text-xs font-semibold ${
                    docSourceType === 'external' ? 'text-white' : 'text-stone-700 dark:text-slate-300'
                  }`}
                  style={docSourceType === 'external' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  External Link (Google Drive / URL)
                </button>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                {docSourceType === 'upload'
                  ? 'Strict MIME verification active: PDF, JPG, PNG, DOCX, XLSX only. Executables (.php, .exe, .sh) are rejected.'
                  : 'Link directly to a Google Drive, OneDrive, University portal, or Institutional CDN PDF (https://).'}
              </p>
              <div>
                <label className="block text-xs font-semibold mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. NIRF Engineering Data 2026"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <CustomSelectInput
                label="Repository Category"
                required
                value={docCategory}
                onChange={(val) => setDocCategory(val as DocumentCategory)}
                options={[...DOCUMENT_CATEGORY_PRESETS]}
                customPlaceholder="Enter custom repository category..."
              />
              {docSourceType === 'upload' ? (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block text-xs font-semibold">Select PDF / Document File</label>
                    <span className="text-[10px] font-semibold text-stone-500 dark:text-slate-400">
                      Max Document: {maxDocumentMb} MB · Max Photo: {maxPhotoMb} MB
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (f) {
                        const isImg = isImageFileMeta(f.name, f.type);
                        const limBytes = getUploadSizeLimitBytes(activeSettings, isImg ? 'photo' : 'document');
                        const limMb = isImg ? maxPhotoMb : maxDocumentMb;
                        if (f.size > limBytes) {
                          notify(
                            'err',
                            `${f.name} (${formatBytes(f.size)}) exceeds the configured Max ${isImg ? 'Photo' : 'Document'} limit of ${limMb} MB.`,
                          );
                          e.target.value = '';
                          setDocFile(null);
                          return;
                        }
                      }
                      setDocFile(f);
                    }}
                    className="w-full text-xs text-stone-600 dark:text-slate-300"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-1">External Download URL (Google Drive / Portal)</label>
                  <input
                    type="url"
                    required
                    value={docExternalUrl}
                    onChange={(e) => setDocExternalUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              )}
              <label className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={docQuickLink}
                  onChange={(e) => setDocQuickLink(e.target.checked)}
                />
                <span>Feature in Quick Links Repository</span>
              </label>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                <Upload className="w-4 h-4" />
                <span>{docSourceType === 'external' ? 'Publish External Link' : 'Upload & Publish'}</span>
              </button>
            </form>

            <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 font-bold text-sm">
                Published Documents ({state.documents.length})
              </div>
              <ul className="divide-y divide-stone-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                {sortByOrder(state.documents).map((doc, idx, arr) => (
                  <li key={doc.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold truncate">{doc.title}</p>
                          {renderModerationBadge(doc.status)}
                        </div>
                        <p className="text-xs text-stone-500 font-mono-tabular truncate">
                          #{doc.sortOrder ?? idx + 1} · {doc.category} ·{' '}
                          {doc.sourceType === 'external' ? 'External URL' : formatBytes(doc.fileSizeBytes)} · {doc.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => reorderCollection(state.documents, idx, -1, '/api/admin/documents/reorder', 'documents')}
                        aria-label={`Move ${doc.title} up`}
                        title="Move Up"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => reorderCollection(state.documents, idx, 1, '/api/admin/documents/reorder', 'documents')}
                        aria-label={`Move ${doc.title} down`}
                        title="Move Down"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch<AdminMutateResult>(`/api/admin/documents/${doc.id}`, 'DELETE').then((res) =>
                            notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Document deleted'),
                          )
                        }
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 8. TELEPHONE DIRECTORY MANAGER */}
        {activeTab === 'directory' && canDirectory && state && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await adminFetch<AdminMutateResult>('/api/admin/directory', 'POST', {
                  section: dirSection,
                  officerName: dirOfficer,
                  designation: dirDesig,
                  extension: dirExt,
                  directPhone: dirPhone,
                  email: dirEmail,
                });
                setDirSection('');
                setDirOfficer('');
                setDirDesig('');
                setDirExt('');
                setDirPhone('');
                setDirEmail('');
                notify(
                  'ok',
                  res?.queuedForApproval && res?.message
                    ? res.message
                    : 'Added entry to campus telephone directory.',
                );
              }}
              className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <h2 className="text-base font-bold">Add Telephone Directory Entry</h2>
              <CustomSelectInput
                label="Office / Section"
                required
                value={dirSection}
                onChange={setDirSection}
                options={[...TELEPHONE_SECTION_PRESETS]}
                placeholder="Select office or cell..."
                customPlaceholder="Enter custom office / section (e.g. Scholarship Cell)"
              />
              <input
                type="text"
                required
                value={dirOfficer}
                onChange={(e) => setDirOfficer(e.target.value)}
                placeholder="Officer Name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={dirDesig}
                onChange={(e) => setDirDesig(e.target.value)}
                placeholder="Designation"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={dirExt}
                  onChange={(e) => setDirExt(e.target.value)}
                  placeholder="Extension (e.g. 125)"
                  className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={dirPhone}
                  onChange={(e) => setDirPhone(e.target.value)}
                  placeholder="Direct Phone"
                  className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <input
                type="email"
                value={dirEmail}
                onChange={(e) => setDirEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Add Directory Contact
              </button>
            </form>

            <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <h3 className="text-sm font-bold mb-3">Institutional Telephone Directory ({state.telephoneDirectory.length})</h3>
              <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                {sortByOrder(state.telephoneDirectory).map((row: TelephoneEntry, idx: number, arr: TelephoneEntry[]) => (
                  <li key={row.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-semibold">
                          <span className="text-xs font-mono-tabular text-stone-500 mr-1.5">#{row.sortOrder ?? idx + 1}</span>
                          {row.section} · {row.officerName}
                        </p>
                        {renderModerationBadge(row.status)}
                      </div>
                      <p className="text-xs text-stone-500">
                        {row.designation} · Ext {row.extension} · {row.directPhone} · {row.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() =>
                          reorderCollection(state.telephoneDirectory, idx, -1, '/api/admin/directory/reorder', 'telephone directory')
                        }
                        aria-label={`Move ${row.section} up`}
                        title="Move Up"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() =>
                          reorderCollection(state.telephoneDirectory, idx, 1, '/api/admin/directory/reorder', 'telephone directory')
                        }
                        aria-label={`Move ${row.section} down`}
                        title="Move Down"
                        className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch<AdminMutateResult>(`/api/admin/directory/${row.id}`, 'DELETE').then((res) =>
                            notify('ok', res?.queuedForApproval && res?.message ? res.message : 'Contact removed'),
                          )
                        }
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 9. SITE SETTINGS, VISION/MISSION, LOGO, STATS & THEME */}
        {activeTab === 'settings' && canSettings && settingsDraft && state && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await adminFetch('/api/admin/settings', 'PUT', settingsDraft);
                  notify('ok', 'All site settings, homepage sections & theme saved.');
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="lg:col-span-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-slate-800 pb-3">
                <h2 className="text-base font-bold">Complete Website Identity, Sections &amp; Recognitions</h2>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ['identity', 'Identity & Branding'],
                      ['sections', 'Homepage Sections'],
                      ['header_footer', 'Header & Footer'],
                      ['credits', 'Creators & Dev Page'],
                      ['design', 'Design & Theme'],
                      ['metrics', 'Recognitions & Recruiters'],
                      ['social', 'Social Media & Sharing'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSettingsSection(id)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        settingsSection === id ? 'text-white' : 'bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                      }`}
                      style={settingsSection === id ? { backgroundColor: 'var(--primary-color)' } : undefined}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {settingsSection === 'identity' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Trust / Society Name</label>
                      <input
                        type="text"
                        value={settingsDraft.trustName || ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, trustName: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Institution Full Name</label>
                      <input
                        type="text"
                        value={settingsDraft.institutionName ?? ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, institutionName: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label htmlFor="settings-short-code" className="block text-xs font-semibold mb-1">
                        Short Code / Title Acronym
                      </label>
                      <input
                        id="settings-short-code"
                        type="text"
                        value={settingsDraft.shortCode ?? ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, shortCode: e.target.value })}
                        placeholder="e.g. COEP / SVERI"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <p className="text-[11px] text-stone-500 mt-1">
                        Drives browser &amp; admin &lt;title&gt;, SEO suffix, security notices &amp; push email titles.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Affiliation &amp; Recognition Line</label>
                    <input
                      type="text"
                      value={settingsDraft.affiliation ?? ''}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, affiliation: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ImageUploader
                      label="Institution Logo / Crest (Optional)"
                      value={settingsDraft.logoUrl || ''}
                      onChange={(url) => setSettingsDraft({ ...settingsDraft, logoUrl: url })}
                      uploadBinary={uploadBinaryFile}
                      aspectRatio="1:1"
                      maxPhotoMb={maxPhotoMb}
                      autoCropEnabled={autoCropEnabled}
                    />
                    <ImageUploader
                      label="About Campus Showcase Photo"
                      value={settingsDraft.aboutImageUrl || ''}
                      onChange={(url) => setSettingsDraft({ ...settingsDraft, aboutImageUrl: url })}
                      uploadBinary={uploadBinaryFile}
                      aspectRatio="4:3"
                      maxPhotoMb={maxPhotoMb}
                      autoCropEnabled={autoCropEnabled}
                    />
                  </div>

                  {/* Upload Size Restrictions & Auto-Crop Policy */}
                  <div className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-stone-900 dark:text-slate-100">
                          Upload Size Controls &amp; Auto-Crop Policy
                        </h3>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400">
                          Enforced across all photo uploaders, rich editor images, department pages, and document uploads.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="settings-max-photo-mb" className="block text-xs font-semibold mb-1">
                          Max Photo Upload Size (MB)
                        </label>
                        <input
                          id="settings-max-photo-mb"
                          type="number"
                          step="0.25"
                          min={0.25}
                          max={25}
                          value={settingsDraft.maxPhotoUploadMb ?? 2}
                          onChange={(e) =>
                            setSettingsDraft({
                              ...settingsDraft,
                              maxPhotoUploadMb: Number(e.target.value) || 2,
                            })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label htmlFor="settings-max-doc-mb" className="block text-xs font-semibold mb-1">
                          Max Document Upload Size (MB)
                        </label>
                        <input
                          id="settings-max-doc-mb"
                          type="number"
                          step="0.5"
                          min={0.5}
                          max={50}
                          value={settingsDraft.maxDocumentUploadMb ?? 10}
                          onChange={(e) =>
                            setSettingsDraft({
                              ...settingsDraft,
                              maxDocumentUploadMb: Number(e.target.value) || 10,
                            })
                          }
                          className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        id="settings-auto-crop-toggle"
                        type="checkbox"
                        checked={settingsDraft.autoCropImages !== false}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            autoCropImages: e.target.checked,
                          })
                        }
                      />
                      <span>Enable Auto-Crop &amp; Aspect Ratio Lock on all photo uploads</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Homepage About Us Summary</label>
                    <textarea
                      rows={3}
                      value={settingsDraft.aboutSummary || ''}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, aboutSummary: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Our Vision Statement</label>
                      <textarea
                        rows={3}
                        value={settingsDraft.visionText || ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, visionText: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Our Mission Points (One per line)</label>
                      <textarea
                        rows={3}
                        value={(settingsDraft.missionItems || []).join('\n')}
                        onChange={(e) =>
                          setSettingsDraft({
                            ...settingsDraft,
                            missionItems: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Official Phone</label>
                      <input
                        type="text"
                        value={settingsDraft.phone ?? ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, phone: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Official Email</label>
                      <input
                        type="email"
                        value={settingsDraft.email ?? ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, email: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Theme Palette</label>
                      <select
                        value={settingsDraft.defaultPaletteId ?? 'royal-navy'}
                        onChange={(e) => {
                          const pal = THEME_PALETTES.find((p) => p.id === e.target.value);
                          setSettingsDraft({
                            ...settingsDraft,
                            defaultPaletteId: e.target.value,
                            primaryColor: pal?.primary || settingsDraft.primaryColor,
                            secondaryColor: pal?.secondary || settingsDraft.secondaryColor,
                          });
                        }}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        {THEME_PALETTES.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">DTE Code</label>
                      <input
                        type="text"
                        value={settingsDraft.dteCode ?? ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, dteCode: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">AICTE Permanent ID</label>
                      <input
                        type="text"
                        value={settingsDraft.aicteCode ?? ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, aicteCode: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Anti-Ragging Helpline</label>
                      <input
                        type="text"
                        value={settingsDraft.antiRaggingHelpline ?? ''}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, antiRaggingHelpline: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {settingsSection === 'sections' && (
                <div className="space-y-4">
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Turn any homepage section on or off and customize headings for your campus.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {(
                      [
                        ['showTicker', 'Scrolling News / FRA Fee Ticker'],
                        ['showSlider', 'Hero Image Banner Slider'],
                        ['showStatsAndRecognitions', 'Institutional Metrics & Recognition Bar'],
                        ['showAboutAndDownloads', 'About Campus & Downloads Split'],
                        ['showApprovedAndVision', 'Approved Bodies & Vision/Mission'],
                        ['showLeadershipDesk', 'Our Desk & Leadership Cards'],
                        ['showExaminationSpotlight', 'Autonomous Examination Portal Spotlight'],
                        ['showDepartments', 'Academic Departments Microsites'],
                        ['showCategoriesDirectory', 'All Categories & Portals Directory'],
                        ['showEventsAndRecruiters', 'Events, Circulars & Top Recruiters'],
                      ] as const
                    ).map(([key, label]) => {
                      const hs = settingsDraft.homeSections || {
                        showTicker: true,
                        showSlider: true,
                        showStatsAndRecognitions: true,
                        showAboutAndDownloads: true,
                        showApprovedAndVision: true,
                        showLeadershipDesk: true,
                        showExaminationSpotlight: true,
                        showDepartments: true,
                        showCategoriesDirectory: true,
                        showEventsAndRecruiters: true,
                      };
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={hs[key] !== false}
                            onChange={(e) =>
                              setSettingsDraft({
                                ...settingsDraft,
                                homeSections: { ...hs, [key]: e.target.checked },
                              })
                            }
                          />
                          <span className="font-semibold">{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {settingsSection === 'design' && (
                <div className="space-y-4">
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Customize site colors, typography, card geometry, header compactness, and safe CSS overrides without affecting any uploaded data.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DESIGN_PRESETS.map((preset) => {
                      const active = settingsDraft.designPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setSettingsDraft({
                              ...settingsDraft,
                              designPreset: preset.id,
                              primaryColor: preset.primary,
                              secondaryColor: preset.secondary,
                              fontHeading: preset.fontHeading,
                              fontBody: preset.fontBody,
                            })
                          }
                          className={`p-3 rounded-xl border text-left transition-colors ${
                            active
                              ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/30'
                              : 'border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold">{preset.label}</span>
                            <span className="flex items-center gap-1">
                              <span className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: preset.primary }} />
                              <span className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: preset.secondary }} />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Primary Color (Hex)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settingsDraft.primaryColor || '#0F294A'}
                          onChange={(e) => setSettingsDraft({ ...settingsDraft, primaryColor: e.target.value })}
                          className="w-9 h-9 rounded border border-stone-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settingsDraft.primaryColor || '#0F294A'}
                          onChange={(e) => setSettingsDraft({ ...settingsDraft, primaryColor: e.target.value })}
                          className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Secondary / Accent Color (Hex)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={settingsDraft.secondaryColor || '#B45309'}
                          onChange={(e) => setSettingsDraft({ ...settingsDraft, secondaryColor: e.target.value })}
                          className="w-9 h-9 rounded border border-stone-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settingsDraft.secondaryColor || '#B45309'}
                          onChange={(e) => setSettingsDraft({ ...settingsDraft, secondaryColor: e.target.value })}
                          className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <CustomSelectInput
                      label="Heading Typography Font"
                      value={settingsDraft.fontHeading || "'Playfair Display', Georgia, serif"}
                      onChange={(val) => setSettingsDraft({ ...settingsDraft, fontHeading: val })}
                      options={[
                        { value: "'Playfair Display', Georgia, serif", label: 'Playfair Display (Academic Serif)' },
                        { value: "'Plus Jakarta Sans', system-ui, sans-serif", label: 'Plus Jakarta Sans (Modern Geometric)' },
                        { value: "'Merriweather', Georgia, serif", label: 'Merriweather (Editorial Serif)' },
                        { value: "'Inter', system-ui, sans-serif", label: 'Inter Clean Sans' },
                      ]}
                      customPlaceholder="Enter custom CSS font-family..."
                    />
                    <CustomSelectInput
                      label="Body Typography Font"
                      value={settingsDraft.fontBody || "'Plus Jakarta Sans', system-ui, sans-serif"}
                      onChange={(val) => setSettingsDraft({ ...settingsDraft, fontBody: val })}
                      options={[
                        { value: "'Plus Jakarta Sans', system-ui, sans-serif", label: 'Plus Jakarta Sans (Default)' },
                        { value: "'Inter', system-ui, sans-serif", label: 'Inter Clean Sans' },
                        { value: "Georgia, 'Times New Roman', serif", label: 'Georgia Institutional Serif' },
                      ]}
                      customPlaceholder="Enter custom CSS font-family..."
                    />
                    <div>
                      <label className="block text-xs font-semibold mb-1">Card Corner Radius</label>
                      <select
                        value={settingsDraft.cardRadius || 'rounded'}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, cardRadius: e.target.value as SiteSettings['cardRadius'] })}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="rounded">Standard Rounded (12px)</option>
                        <option value="soft">Soft Pill-Card (20px)</option>
                        <option value="sharp">Formal Sharp (4px)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Header Layout Style</label>
                      <select
                        value={settingsDraft.headerStyle || 'classic'}
                        onChange={(e) => setSettingsDraft({ ...settingsDraft, headerStyle: e.target.value as SiteSettings['headerStyle'] })}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="classic">Classic Institutional Header</option>
                        <option value="compact">Compact Sticky Header</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Custom Safe CSS Overrides (Optional)</label>
                    <textarea
                      rows={3}
                      value={settingsDraft.customCss || ''}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, customCss: e.target.value })}
                      placeholder="/* e.g. .cms-prose h2 { border-left: 4px solid var(--secondary-color); padding-left: 10px; } */"
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}

              {settingsSection === 'metrics' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Accreditation Recognition Strip (One badge per line)</label>
                    <textarea
                      rows={4}
                      value={(settingsDraft.accreditationHighlights || []).join('\n')}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          accreditationHighlights: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Top Recruiters (One company per line)</label>
                    <textarea
                      rows={4}
                      value={(settingsDraft.recruiters || []).join('\n')}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          recruiters: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              )}

              {settingsSection === 'social' && (() => {
                const socialList: SocialMediaLink[] = settingsDraft.socialMediaLinks || DEFAULT_SOCIAL_MEDIA_LINKS;
                const shareCfg = normalizeSocialSharingConfig(settingsDraft.socialSharing);
                const updateSocialList = (next: SocialMediaLink[]) => {
                  setSettingsDraft({
                    ...settingsDraft,
                    socialMediaLinks: next,
                  });
                };
                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://example.edu.in';
                const broadcastLinks = buildSocialShareUrls({
                  url: broadcastUrl || `${origin}/`,
                  title: broadcastTitle || `${settingsDraft.shortCode || settingsDraft.institutionName || 'Campus'} Institutional Announcement`,
                  summary: broadcastSummary,
                  hashtags: broadcastTags,
                  via: shareCfg.twitterHandle,
                });

                return (
                  <div className="space-y-6">
                    {/* A. Social Media Links & Icons Manager */}
                    <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                            Official Social Media Profiles &amp; Header/Footer Icons ({socialList.length})
                          </h3>
                          <p className="text-xs text-stone-500">
                            Add, edit, reorder, show/hide, or delete any social media channel. Remember to click Save All Website Settings below.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs p-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                        <select
                          aria-label="Select social platform"
                          value={newSocialPlatform}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewSocialPlatform(val);
                            const preset = SOCIAL_PLATFORM_PRESETS.find((p) => p.value === val);
                            if (preset && val !== 'custom') setNewSocialLabel(preset.label);
                          }}
                          className="px-2.5 py-2 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        >
                          {SOCIAL_PLATFORM_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newSocialLabel}
                          onChange={(e) => setNewSocialLabel(e.target.value)}
                          placeholder="Display Label *"
                          className="px-2.5 py-2 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="url"
                          value={newSocialUrl}
                          onChange={(e) => setNewSocialUrl(e.target.value)}
                          placeholder="Profile URL (https://...) *"
                          className="px-2.5 py-2 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newSocialHandle}
                            onChange={(e) => setNewSocialHandle(e.target.value)}
                            placeholder="@handle (optional)"
                            className="flex-1 min-w-0 px-2.5 py-2 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!newSocialLabel.trim() || !newSocialUrl.trim()) {
                                notify('err', 'Enter both platform label and https:// profile URL.');
                                return;
                              }
                              const next: SocialMediaLink[] = [
                                ...socialList,
                                {
                                  id: Math.max(0, ...socialList.map((s) => s.id)) + 1,
                                  platform: newSocialPlatform,
                                  label: newSocialLabel.trim(),
                                  url: newSocialUrl.trim(),
                                  handle: newSocialHandle.trim(),
                                  isActive: true,
                                  sortOrder: socialList.length + 1,
                                },
                              ];
                              updateSocialList(next);
                              setNewSocialUrl('');
                              setNewSocialHandle('');
                              notify('ok', `Added ${newSocialLabel.trim()}. Click Save All Website Settings to persist.`);
                            }}
                            className="px-3 py-2 rounded bg-stone-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold shrink-0"
                          >
                            + Add
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {socialList.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-2 text-xs"
                          >
                            <span className="p-2 rounded bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-200">
                              <SocialPlatformSvg platform={item.platform} className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => {
                                const next = [...socialList];
                                next[idx] = { ...item, label: e.target.value };
                                updateSocialList(next);
                              }}
                              className="w-28 px-2 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                            />
                            <input
                              type="url"
                              value={item.url}
                              onChange={(e) => {
                                const next = [...socialList];
                                next[idx] = { ...item, url: e.target.value };
                                updateSocialList(next);
                              }}
                              className="flex-1 min-w-[180px] px-2 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                            <label className="inline-flex items-center gap-1 cursor-pointer px-2">
                              <input
                                type="checkbox"
                                checked={item.isActive}
                                onChange={(e) => {
                                  const next = [...socialList];
                                  next[idx] = { ...item, isActive: e.target.checked };
                                  updateSocialList(next);
                                }}
                              />
                              <span>Visible</span>
                            </label>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                const next = [...socialList];
                                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                updateSocialList(next.map((n, i) => ({ ...n, sortOrder: i + 1 })));
                              }}
                              className="p-1.5 rounded border disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === socialList.length - 1}
                              onClick={() => {
                                const next = [...socialList];
                                [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                updateSocialList(next.map((n, i) => ({ ...n, sortOrder: i + 1 })));
                              }}
                              className="p-1.5 rounded border disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSocialList(socialList.filter((s) => s.id !== item.id))}
                              className="p-1.5 rounded text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* B. Social Sharing Controls */}
                    <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                          Public Post Sharing Controls &amp; Placement Toggles
                        </h3>
                        <label className="inline-flex items-center gap-2 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={shareCfg.enabled}
                            onChange={(e) =>
                              setSettingsDraft({
                                ...settingsDraft,
                                socialSharing: { ...shareCfg, enabled: e.target.checked },
                              })
                            }
                          />
                          <span>Enable Social Share Bar Across Website</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(
                          [
                            ['showIconsInHeader', 'Show Social Icons in Header'],
                            ['showIconsInFooter', 'Show Social Icons in Footer'],
                            ['showOnPages', 'Share Bar on UGC Micro-Pages'],
                            ['showOnResearch', 'Share Bar on Research Pages'],
                            ['showOnConferences', 'Share Bar on Conferences'],
                            ['showOnPortals', 'Share Bar on Sports/Placements/Facilities'],
                          ] as const
                        ).map(([k, lbl]) => (
                          <label key={k} className="flex items-center gap-2 p-2 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={shareCfg[k]}
                              onChange={(e) =>
                                setSettingsDraft({
                                  ...settingsDraft,
                                  socialSharing: { ...shareCfg, [k]: e.target.checked },
                                })
                              }
                            />
                            <span>{lbl}</span>
                          </label>
                        ))}
                      </div>

                      <p className="font-semibold pt-1">Active Share Networks:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          [
                            ['whatsapp', 'WhatsApp'],
                            ['linkedin', 'LinkedIn'],
                            ['twitter', 'X (Twitter)'],
                            ['facebook', 'Facebook'],
                            ['telegram', 'Telegram'],
                            ['email', 'Email Link'],
                            ['copyLink', 'Copy URL Button'],
                            ['nativeShare', 'Device Web Share'],
                          ] as const
                        ).map(([pk, plbl]) => (
                          <label key={pk} className="flex items-center gap-2 p-2 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={shareCfg.platforms[pk]}
                              onChange={(e) =>
                                setSettingsDraft({
                                  ...settingsDraft,
                                  socialSharing: {
                                    ...shareCfg,
                                    platforms: { ...shareCfg.platforms, [pk]: e.target.checked },
                                  },
                                })
                              }
                            />
                            <span>{plbl}</span>
                          </label>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block font-semibold mb-1">Share Bar Prompt Text</label>
                          <input
                            type="text"
                            value={shareCfg.shareHeading}
                            onChange={(e) =>
                              setSettingsDraft({
                                ...settingsDraft,
                                socialSharing: { ...shareCfg, shareHeading: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Default Hashtags (comma-separated)</label>
                          <input
                            type="text"
                            value={shareCfg.defaultHashtags}
                            onChange={(e) =>
                              setSettingsDraft({
                                ...settingsDraft,
                                socialSharing: { ...shareCfg, defaultHashtags: e.target.value },
                              })
                            }
                            className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Official X (@handle)</label>
                          <input
                            type="text"
                            value={shareCfg.twitterHandle || ''}
                            onChange={(e) =>
                              setSettingsDraft({
                                ...settingsDraft,
                                socialSharing: { ...shareCfg, twitterHandle: e.target.value },
                              })
                            }
                            placeholder="campus_official"
                            className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    {/* C. Direct Social Post & Broadcast Composer */}
                    <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-slate-800/40 space-y-3 text-xs">
                      <div>
                        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                          Direct Social Media Post &amp; Broadcast Composer
                        </h3>
                        <p className="text-stone-600 dark:text-slate-300">
                          Pick any published micro-page, conference, notice, or custom message and publish/broadcast straight to LinkedIn, X, Facebook, WhatsApp, Telegram, or copy formatted text.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="block font-semibold mb-1">Select Website Page / Event to Broadcast</label>
                          <select
                            value={broadcastSourceKey}
                            onChange={(e) => {
                              const k = e.target.value;
                              setBroadcastSourceKey(k);
                              if (k.startsWith('page:')) {
                                const slug = k.slice(5);
                                const pg = state.pages.find((p) => p.slug === slug);
                                if (pg) {
                                  setBroadcastTitle(pg.title);
                                  setBroadcastSummary(pg.subtitle || `${settingsDraft.shortCode || settingsDraft.institutionName || 'Campus'} Official Notice`);
                                  setBroadcastUrl(`${origin}/page/${pg.slug}`);
                                }
                              } else if (k.startsWith('conf:')) {
                                const slug = k.slice(5);
                                const cf = (state.conferences || []).find((c) => c.slug === slug);
                                if (cf) {
                                  setBroadcastTitle(`${cf.shortName}: ${cf.title}`);
                                  setBroadcastSummary(`${cf.scope} (${cf.startDate}) · ${cf.venue}`);
                                  setBroadcastUrl(`${origin}/conference/${cf.slug}`);
                                }
                              }
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          >
                            <option value="custom">Custom Institutional Post / Announcement</option>
                            {state.pages.filter((p) => p.isPublished).map((p) => (
                              <option key={p.id} value={`page:${p.slug}`}>Page: {p.title}</option>
                            ))}
                            {(state.conferences || []).filter((c) => c.isPublished).map((c) => (
                              <option key={c.id} value={`conf:${c.slug}`}>Conference: {c.shortName} — {c.title}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={broadcastTitle}
                          onChange={(e) => setBroadcastTitle(e.target.value)}
                          placeholder="Post Headline *"
                          className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <input
                          type="url"
                          value={broadcastUrl}
                          onChange={(e) => setBroadcastUrl(e.target.value)}
                          placeholder="Target Link URL *"
                          className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <textarea
                          rows={2}
                          value={broadcastSummary}
                          onChange={(e) => setBroadcastSummary(e.target.value)}
                          placeholder="Post caption / announcement details..."
                          className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <input
                          type="text"
                          value={broadcastTags}
                          onChange={(e) => {
                            setBroadcastTagsTouched(true);
                            setBroadcastTags(e.target.value);
                          }}
                          placeholder="Hashtags (comma-separated)"
                          className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="p-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                          Social Card &amp; Caption Preview
                        </p>
                        <pre className="whitespace-pre-wrap font-sans text-xs text-stone-800 dark:text-slate-200">
                          {broadcastLinks.formattedPost}
                        </pre>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <a href={broadcastLinks.linkedin} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-sky-700 text-white font-bold">
                          Publish to LinkedIn &rarr;
                        </a>
                        <a href={broadcastLinks.twitter} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-slate-900 text-white font-bold">
                          Post on X &rarr;
                        </a>
                        <a href={broadcastLinks.facebook} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-blue-700 text-white font-bold">
                          Post to Facebook &rarr;
                        </a>
                        <a href={broadcastLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-emerald-700 text-white font-bold">
                          WhatsApp Broadcast &rarr;
                        </a>
                        <a href={broadcastLinks.telegram} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-cyan-700 text-white font-bold">
                          Post on Telegram &rarr;
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(broadcastLinks.formattedPost);
                              setBroadcastCopied(true);
                              window.setTimeout(() => setBroadcastCopied(false), 2000);
                            } catch {
                              notify('err', 'Clipboard access denied.');
                            }
                          }}
                          className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                        >
                          {broadcastCopied ? 'Copied Post Text!' : 'Copy Post for Instagram / YouTube'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {settingsSection === 'header_footer' && (() => {
                const headerCfg = normalizeHeaderConfig(settingsDraft.headerConfig);
                const footerCfg = normalizeFooterConfig(settingsDraft.footerConfig);
                const topLinks = settingsDraft.topBarLinks || [];
                const footerCols = settingsDraft.footerColumns || [];

                const setHeaderCfg = (patch: Partial<typeof headerCfg>) =>
                  setSettingsDraft({ ...settingsDraft, headerConfig: { ...headerCfg, ...patch } });
                const setFooterCfg = (patch: Partial<typeof footerCfg>) =>
                  setSettingsDraft({ ...settingsDraft, footerConfig: { ...footerCfg, ...patch } });

                return (
                  <div className="space-y-5 text-xs">
                    {/* Header Utility & Statutory Ribbon Controls */}
                    <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                            Header Layout, Utility Bar &amp; Statutory Quick-Access Strip
                          </h3>
                          <p className="text-stone-500 dark:text-slate-400">
                            Toggle visibility of header zones and manage top utility / statutory strip links across all public pages.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHeaderCfg(DEFAULT_HEADER_CONFIG)}
                          className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-600 text-[11px] font-semibold hover:bg-white dark:hover:bg-slate-800"
                        >
                          Reset Header Defaults
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {(
                          [
                            ['showTopUtilityBar', 'Show Top Accessibility Utility Ribbon'],
                            ['showRegulatoryCodes', 'Show DTE & AICTE Codes in Top Ribbon'],
                            ['showAdminButton', 'Show CMS Admin Shortcut Button'],
                            ['showInstituteCodeBadge', 'Show Institute Code Crest Emblem'],
                            ['showSearchBar', 'Show Global Live Search Input'],
                            ['showStatutoryBar', 'Show Secondary Statutory Strip'],
                          ] as const
                        ).map(([key, label]) => (
                          <label
                            key={key}
                            className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={headerCfg[key]}
                              onChange={(e) => setHeaderCfg({ [key]: e.target.checked })}
                              className="w-4 h-4 accent-amber-700"
                            />
                            <span className="font-medium text-stone-800 dark:text-slate-200">{label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">Top Ribbon Tagline</label>
                          <input
                            type="text"
                            value={headerCfg.utilityTagline}
                            onChange={(e) => setHeaderCfg({ utilityTagline: e.target.value })}
                            placeholder="Autonomous Engineering Campus"
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Statutory Strip Prefix Label</label>
                          <input
                            type="text"
                            value={headerCfg.statutoryBarLabel}
                            onChange={(e) => setHeaderCfg({ statutoryBarLabel: e.target.value })}
                            placeholder="Statutory & Quick Access:"
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      {/* Top Bar Links CRUD */}
                      <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-800 dark:text-slate-100">
                            Statutory Quick-Access Bar Links ({topLinks.length})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSettingsDraft({
                                ...settingsDraft,
                                topBarLinks: [...topLinks, { label: 'New Link', url: '/page/about-overview' }],
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-700 text-white font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Top Link
                          </button>
                        </div>
                        <div className="space-y-2">
                          {topLinks.map((lk, idx) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-stone-200 dark:border-slate-700">
                              <input
                                type="text"
                                value={lk.label}
                                onChange={(e) => {
                                  const next = [...topLinks];
                                  next[idx] = { ...lk, label: e.target.value };
                                  setSettingsDraft({ ...settingsDraft, topBarLinks: next });
                                }}
                                placeholder="Link Label"
                                className="sm:col-span-5 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                value={lk.url}
                                onChange={(e) => {
                                  const next = [...topLinks];
                                  next[idx] = { ...lk, url: e.target.value };
                                  setSettingsDraft({ ...settingsDraft, topBarLinks: next });
                                }}
                                placeholder="/page/slug or https://..."
                                className="sm:col-span-5 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 font-mono text-[11px]"
                              />
                              <div className="sm:col-span-2 flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const next = [...topLinks];
                                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                    setSettingsDraft({ ...settingsDraft, topBarLinks: next });
                                  }}
                                  className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === topLinks.length - 1}
                                  onClick={() => {
                                    const next = [...topLinks];
                                    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                    setSettingsDraft({ ...settingsDraft, topBarLinks: next });
                                  }}
                                  className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSettingsDraft({
                                      ...settingsDraft,
                                      topBarLinks: topLinks.filter((_, i) => i !== idx),
                                    });
                                  }}
                                  className="p-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50"
                                  title="Remove Link"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Attribution, Copyright, Columns & Bottom Bar */}
                    <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                            Footer Columns, Legal Strip &amp; Creator / Contributor Credit Bar
                          </h3>
                          <p className="text-stone-500 dark:text-slate-400">
                            Configure institutional footer columns, bottom utility links, copyright notice, and creator attribution link.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFooterCfg(DEFAULT_FOOTER_CONFIG)}
                          className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-600 text-[11px] font-semibold hover:bg-white dark:hover:bg-slate-800"
                        >
                          Reset Footer Defaults
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={footerCfg.showContactBlock}
                            onChange={(e) => setFooterCfg({ showContactBlock: e.target.checked })}
                            className="w-4 h-4 accent-amber-700"
                          />
                          <span className="font-medium">Show Left Contact Column</span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={footerCfg.showBottomLinks}
                            onChange={(e) => setFooterCfg({ showBottomLinks: e.target.checked })}
                            className="w-4 h-4 accent-amber-700"
                          />
                          <span className="font-medium">Show Bottom Bar Links</span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={footerCfg.showCreatorCreditBar}
                            onChange={(e) => setFooterCfg({ showCreatorCreditBar: e.target.checked })}
                            className="w-4 h-4 accent-amber-700"
                          />
                          <span className="font-medium">Show Creator / Developer Credit Strip</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">Custom Copyright Line (leave blank for auto-year + Institution Name)</label>
                          <input
                            type="text"
                            value={footerCfg.copyrightText}
                            onChange={(e) => setFooterCfg({ copyrightText: e.target.value })}
                            placeholder={`© ${new Date().getFullYear()} ${settingsDraft.institutionName}.`}
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Compliance / Disclosure Note</label>
                          <input
                            type="text"
                            value={footerCfg.complianceNote}
                            onChange={(e) => setFooterCfg({ complianceNote: e.target.value })}
                            placeholder="Compliant with UGC Guidelines on Public Self-Disclosure (NEP 2020)."
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-slate-900/60">
                        <div>
                          <label className="block font-semibold mb-1">Creator Prefix Label</label>
                          <input
                            type="text"
                            value={footerCfg.creatorCreditLabel}
                            onChange={(e) => setFooterCfg({ creatorCreditLabel: e.target.value })}
                            placeholder="Designed & Developed by"
                            className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Creator / Organization Name</label>
                          <input
                            type="text"
                            value={footerCfg.creatorCreditName}
                            onChange={(e) => setFooterCfg({ creatorCreditName: e.target.value })}
                            placeholder="Campus Web & Software Engineering Team"
                            className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Creator Link URL (e.g. /credits)</label>
                          <input
                            type="text"
                            value={footerCfg.creatorCreditUrl}
                            onChange={(e) => setFooterCfg({ creatorCreditUrl: e.target.value })}
                            placeholder="/credits"
                            className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                          />
                        </div>
                      </div>

                      {/* Footer Columns CRUD */}
                      <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-800 dark:text-slate-100">
                            Footer Navigation Columns ({footerCols.length})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSettingsDraft({
                                ...settingsDraft,
                                footerColumns: [
                                  ...footerCols,
                                  { title: 'New Section', links: [{ label: 'Developers & Contributors', url: '/credits' }] },
                                ],
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-700 text-white font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Footer Column
                          </button>
                        </div>

                        <div className="space-y-3">
                          {footerCols.map((col, colIdx) => (
                            <div key={colIdx} className="p-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={col.title}
                                  onChange={(e) => {
                                    const next = [...footerCols];
                                    next[colIdx] = { ...col, title: e.target.value };
                                    setSettingsDraft({ ...settingsDraft, footerColumns: next });
                                  }}
                                  placeholder="Column Heading"
                                  className="flex-1 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 font-semibold"
                                />
                                <button
                                  type="button"
                                  disabled={colIdx === 0}
                                  onClick={() => {
                                    const next = [...footerCols];
                                    [next[colIdx - 1], next[colIdx]] = [next[colIdx], next[colIdx - 1]];
                                    setSettingsDraft({ ...settingsDraft, footerColumns: next });
                                  }}
                                  className="p-1.5 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                                  title="Move Column Up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={colIdx === footerCols.length - 1}
                                  onClick={() => {
                                    const next = [...footerCols];
                                    [next[colIdx + 1], next[colIdx]] = [next[colIdx], next[colIdx + 1]];
                                    setSettingsDraft({ ...settingsDraft, footerColumns: next });
                                  }}
                                  className="p-1.5 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                                  title="Move Column Down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...footerCols];
                                    next[colIdx] = { ...col, links: [...col.links, { label: 'New Link', url: '/' }] };
                                    setSettingsDraft({ ...settingsDraft, footerColumns: next });
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-stone-300 dark:border-slate-700 font-semibold"
                                >
                                  <Plus className="w-3 h-3" /> Link
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSettingsDraft({
                                      ...settingsDraft,
                                      footerColumns: footerCols.filter((_, i) => i !== colIdx),
                                    });
                                  }}
                                  className="p-1.5 rounded border border-rose-200 text-rose-700 hover:bg-rose-50"
                                  title="Delete Column"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="space-y-1.5 pl-2 border-l-2 border-stone-200 dark:border-slate-700">
                                {col.links.map((lk, lkIdx) => (
                                  <div key={lkIdx} className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center">
                                    <input
                                      type="text"
                                      value={lk.label}
                                      onChange={(e) => {
                                        const next = [...footerCols];
                                        const nextLinks = [...col.links];
                                        nextLinks[lkIdx] = { ...lk, label: e.target.value };
                                        next[colIdx] = { ...col, links: nextLinks };
                                        setSettingsDraft({ ...settingsDraft, footerColumns: next });
                                      }}
                                      placeholder="Link Label"
                                      className="sm:col-span-5 px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                                    />
                                    <input
                                      type="text"
                                      value={lk.url}
                                      onChange={(e) => {
                                        const next = [...footerCols];
                                        const nextLinks = [...col.links];
                                        nextLinks[lkIdx] = { ...lk, url: e.target.value };
                                        next[colIdx] = { ...col, links: nextLinks };
                                        setSettingsDraft({ ...settingsDraft, footerColumns: next });
                                      }}
                                      placeholder="/page/slug"
                                      className="sm:col-span-5 px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 font-mono text-[11px]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = [...footerCols];
                                        next[colIdx] = { ...col, links: col.links.filter((_, i) => i !== lkIdx) };
                                        setSettingsDraft({ ...settingsDraft, footerColumns: next });
                                      }}
                                      className="sm:col-span-1 p-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 justify-self-end"
                                      title="Remove Link"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Bar Links CRUD */}
                      <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-800 dark:text-slate-100">
                            Footer Bottom Strip Links ({footerCfg.bottomBarLinks.length})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFooterCfg({
                                bottomBarLinks: [...footerCfg.bottomBarLinks, { label: 'New Bottom Link', url: '/credits' }],
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-700 text-white font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Bottom Link
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {footerCfg.bottomBarLinks.map((lk, idx) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-stone-200 dark:border-slate-700">
                              <input
                                type="text"
                                value={lk.label}
                                onChange={(e) => {
                                  const next = [...footerCfg.bottomBarLinks];
                                  next[idx] = { ...lk, label: e.target.value };
                                  setFooterCfg({ bottomBarLinks: next });
                                }}
                                placeholder="Label"
                                className="sm:col-span-5 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                value={lk.url}
                                onChange={(e) => {
                                  const next = [...footerCfg.bottomBarLinks];
                                  next[idx] = { ...lk, url: e.target.value };
                                  setFooterCfg({ bottomBarLinks: next });
                                }}
                                placeholder="/credits"
                                className="sm:col-span-5 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 font-mono text-[11px]"
                              />
                              <div className="sm:col-span-2 flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const next = [...footerCfg.bottomBarLinks];
                                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                    setFooterCfg({ bottomBarLinks: next });
                                  }}
                                  className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === footerCfg.bottomBarLinks.length - 1}
                                  onClick={() => {
                                    const next = [...footerCfg.bottomBarLinks];
                                    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                    setFooterCfg({ bottomBarLinks: next });
                                  }}
                                  className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFooterCfg({
                                      bottomBarLinks: footerCfg.bottomBarLinks.filter((_, i) => i !== idx),
                                    })
                                  }
                                  className="p-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {settingsSection === 'credits' && (() => {
                const cp = normalizeCreditsPageConfig(settingsDraft.creditsPage);
                const setCp = (patch: Partial<typeof cp>) =>
                  setSettingsDraft({ ...settingsDraft, creditsPage: { ...cp, ...patch } });

                const updateContributor = (idx: number, patch: Partial<ContributorMember>) => {
                  const next = [...cp.contributors];
                  next[idx] = { ...next[idx], ...patch };
                  setCp({ contributors: next });
                };

                return (
                  <div className="space-y-5 text-xs">
                    <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                            Developer / Creator &amp; Contributors Page (/credits)
                          </h3>
                          <p className="text-stone-500 dark:text-slate-400">
                            Customize page metadata, creators, core contributors, UI/UX designers, tech stack, and acknowledgements.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href="/credits"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded border border-amber-500/60 text-amber-800 dark:text-amber-300 font-semibold hover:bg-amber-50 dark:hover:bg-slate-800"
                          >
                            Preview /credits &rarr;
                          </a>
                          <button
                            type="button"
                            onClick={() => setCp(DEFAULT_CREDITS_PAGE_CONFIG)}
                            className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-600 text-[11px] font-semibold hover:bg-white dark:hover:bg-slate-800"
                          >
                            Reset Defaults
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold mb-1">Eyebrow Label</label>
                          <input
                            type="text"
                            value={cp.eyebrow}
                            onChange={(e) => setCp({ eyebrow: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Page Title</label>
                          <input
                            type="text"
                            value={cp.pageTitle}
                            onChange={(e) => setCp({ pageTitle: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block font-semibold mb-1">Page Subtitle</label>
                          <textarea
                            rows={2}
                            value={cp.pageSubtitle}
                            onChange={(e) => setCp({ pageSubtitle: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Maintainer / Organization Credit</label>
                          <input
                            type="text"
                            value={cp.organizationCredit}
                            onChange={(e) => setCp({ organizationCredit: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-semibold mb-1">Project Version</label>
                            <input
                              type="text"
                              value={cp.projectVersion}
                              onChange={(e) => setCp({ projectVersion: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">Release Year</label>
                            <input
                              type="text"
                              value={cp.releaseYear}
                              onChange={(e) => setCp({ releaseYear: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block font-semibold mb-1">Compliance &amp; License Note</label>
                          <input
                            type="text"
                            value={cp.licenseNote}
                            onChange={(e) => setCp({ licenseNote: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cp.isShareable}
                            onChange={(e) => setCp({ isShareable: e.target.checked })}
                            className="w-4 h-4 accent-amber-700"
                          />
                          <span className="font-medium">Allow Social Media Share Icons</span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cp.showContributorsSection}
                            onChange={(e) => setCp({ showContributorsSection: e.target.checked })}
                            className="w-4 h-4 accent-amber-700"
                          />
                          <span className="font-medium">Show Contributors Directory</span>
                        </label>
                        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cp.showTechStackSection}
                            onChange={(e) => setCp({ showTechStackSection: e.target.checked })}
                            className="w-4 h-4 accent-amber-700"
                          />
                          <span className="font-medium">Show Architecture Tech Stack</span>
                        </label>
                      </div>

                      <div>
                        <label className="block font-semibold mb-1">Acknowledgements &amp; Governance HTML</label>
                        <textarea
                          rows={3}
                          value={cp.acknowledgementsHtml}
                          onChange={(e) => setCp({ acknowledgementsHtml: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    {/* Contributors Directory Manager */}
                    <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                            Creators, Developers &amp; Contributors ({cp.contributors.length})
                          </h4>
                          <p className="text-stone-500 dark:text-slate-400">
                            Add people or teams, upload optional portraits, set role presets, and reorder display cards.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const nextId = Math.max(0, ...cp.contributors.map((c) => Number(c.id || 0))) + 1;
                            setCp({
                              contributors: [
                                ...cp.contributors,
                                {
                                  id: nextId,
                                  name: 'New Developer / Contributor',
                                  role: 'Software Engineer',
                                  category: 'Core Contributor',
                                  affiliation: settingsDraft.institutionName || 'Engineering Cell',
                                  email: '',
                                  websiteUrl: '',
                                  githubUrl: '',
                                  linkedinUrl: '',
                                  photoUrl: '',
                                  bio: '',
                                  contributions: 'Platform Features & Content Maintenance',
                                  isActive: true,
                                  sortOrder: cp.contributors.length + 1,
                                },
                              ],
                            });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Creator / Contributor
                        </button>
                      </div>

                      <div className="space-y-3">
                        {cp.contributors.map((member, idx) => (
                          <div key={member.id || idx} className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-slate-800 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-stone-900 dark:text-white">#{idx + 1} · {member.name || 'Contributor'}</span>
                                <label className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 dark:text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={member.isActive !== false}
                                    onChange={(e) => updateContributor(idx, { isActive: e.target.checked })}
                                    className="accent-emerald-600"
                                  />
                                  <span>Visible on Public Page</span>
                                </label>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => {
                                    const next = [...cp.contributors];
                                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                    setCp({ contributors: next.map((c, i) => ({ ...c, sortOrder: i + 1 })) });
                                  }}
                                  className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === cp.contributors.length - 1}
                                  onClick={() => {
                                    const next = [...cp.contributors];
                                    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                    setCp({ contributors: next.map((c, i) => ({ ...c, sortOrder: i + 1 })) });
                                  }}
                                  className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCp({ contributors: cp.contributors.filter((_, i) => i !== idx) })
                                  }
                                  className="p-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <input
                                type="text"
                                value={member.name}
                                onChange={(e) => updateContributor(idx, { name: e.target.value })}
                                placeholder="Full Name or Team Name *"
                                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <select
                                value={member.category}
                                onChange={(e) => updateContributor(idx, { category: e.target.value })}
                                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              >
                                {CONTRIBUTOR_ROLE_PRESETS.map((preset) => (
                                  <option key={preset} value={preset}>{preset}</option>
                                ))}
                                {!CONTRIBUTOR_ROLE_PRESETS.includes(member.category as typeof CONTRIBUTOR_ROLE_PRESETS[number]) && (
                                  <option value={member.category}>{member.category}</option>
                                )}
                              </select>
                              <input
                                type="text"
                                value={member.role}
                                onChange={(e) => updateContributor(idx, { role: e.target.value })}
                                placeholder="Designation / Specific Title"
                                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                value={member.affiliation}
                                onChange={(e) => updateContributor(idx, { affiliation: e.target.value })}
                                placeholder="Department / Organization"
                                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                value={member.contributions}
                                onChange={(e) => updateContributor(idx, { contributions: e.target.value })}
                                placeholder="Key Contribution Areas"
                                className="sm:col-span-2 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <textarea
                                rows={2}
                                value={member.bio}
                                onChange={(e) => updateContributor(idx, { bio: e.target.value })}
                                placeholder="Short bio & impact summary..."
                                className="sm:col-span-3 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <input
                                type="email"
                                value={member.email || ''}
                                onChange={(e) => updateContributor(idx, { email: e.target.value })}
                                placeholder="Email (optional)"
                                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <input
                                type="url"
                                value={member.githubUrl || ''}
                                onChange={(e) => updateContributor(idx, { githubUrl: e.target.value })}
                                placeholder="GitHub URL (optional)"
                                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <input
                                type="url"
                                value={member.linkedinUrl || ''}
                                onChange={(e) => updateContributor(idx, { linkedinUrl: e.target.value })}
                                placeholder="LinkedIn URL (optional)"
                                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <input
                                type="url"
                                value={member.websiteUrl || ''}
                                onChange={(e) => updateContributor(idx, { websiteUrl: e.target.value })}
                                placeholder="Personal Website URL (optional)"
                                className="sm:col-span-3 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <div className="sm:col-span-3">
                                <ImageUploader
                                  label="Contributor Photo (Optional — defaults to initials monogram)"
                                  value={member.photoUrl || ''}
                                  onChange={(url) => updateContributor(idx, { photoUrl: url })}
                                  uploadBinary={uploadBinaryFile}
                                  aspectRatio="1:1"
                                  maxPhotoMb={maxPhotoMb}
                                  autoCropEnabled={autoCropEnabled}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technical Stack Cards Manager */}
                    <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white">
                          Architecture &amp; Stack Cards ({cp.techStack.length})
                        </h4>
                        <button
                          type="button"
                          onClick={() =>
                            setCp({
                              techStack: [
                                ...cp.techStack,
                                { name: 'Module Name', category: 'Platform Layer', description: 'Describe role in stack...' },
                              ],
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 dark:bg-slate-700 text-white font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Stack Card
                        </button>
                      </div>
                      <div className="space-y-2">
                        {cp.techStack.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-stone-200 dark:border-slate-700">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const next = [...cp.techStack];
                                next[idx] = { ...item, name: e.target.value };
                                setCp({ techStack: next });
                              }}
                              placeholder="Technology / Module"
                              className="sm:col-span-4 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                            />
                            <input
                              type="text"
                              value={item.category}
                              onChange={(e) => {
                                const next = [...cp.techStack];
                                next[idx] = { ...item, category: e.target.value };
                                setCp({ techStack: next });
                              }}
                              placeholder="Category"
                              className="sm:col-span-3 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                            />
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => {
                                const next = [...cp.techStack];
                                next[idx] = { ...item, description: e.target.value };
                                setCp({ techStack: next });
                              }}
                              placeholder="Description"
                              className="sm:col-span-4 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setCp({ techStack: cp.techStack.filter((_, i) => i !== idx) })
                              }
                              className="sm:col-span-1 p-1.5 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 justify-self-end"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Save All Website Settings
              </button>
            </form>

            <div className="lg:col-span-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h2 className="text-base font-bold">Linux Webmin / PHP 8.x Package</h2>
              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                Complete standalone PHP 8.x (PDO) + MySQL 8 codebase in <code className="font-mono">/php-cms/</code> with visual editor, image upload handler, and <code className="font-mono">setup.php</code> diagnostics.
              </p>
              <ul className="text-xs font-mono space-y-1 text-stone-700 dark:text-slate-300 bg-stone-50 dark:bg-slate-800 p-3 rounded-lg border border-stone-200 dark:border-slate-700">
                <li>database.sql + setup.php</li>
                <li>DEPLOY_WEBMIN.md</li>
                <li>admin/manage_pages.php</li>
                <li>admin/manage_departments.php</li>
                <li>admin/manage_leadership.php</li>
                <li>admin/manage_gallery.php</li>
                <li>admin/manage_sliders.php</li>
                <li>admin/manage_documents.php</li>
                <li>admin/manage_directory.php</li>
              </ul>
            </div>
          </div>
        )}

        {/* 10. USERS, GRANULAR PER-PAGE RBAC & AUDIT LOGS (SUPER ADMIN) */}
        {activeTab === 'users' && canUsers && state && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await adminFetch('/api/admin/users', 'POST', {
                      fullName: newUserName,
                      email: newUserEmail,
                      password: newUserPass,
                      role: newUserRole,
                      assignedDepartmentId: newUserRole === 'department_admin' ? newUserDept : null,
                      allowedModules: newUserAllowedModules,
                      allowedDepartmentIds: newUserAllowedDeptIds,
                      allowedCategories: newUserAllowedCats,
                      allowedPageIds: newUserAllowedPageIds,
                    });
                    setNewUserName('');
                    setNewUserEmail('');
                    setNewUserPass('');
                    setNewUserAllowedModules([]);
                    setNewUserAllowedDeptIds([]);
                    setNewUserAllowedCats([]);
                    setNewUserAllowedPageIds([]);
                    notify('ok', 'Created RBAC user account with module & page-wise permissions.');
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
                className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <h2 className="text-base font-bold">Create Staff / Admin Account</h2>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Institutional Email"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="password"
                  required
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  placeholder="Temporary Password"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <div>
                  <label htmlFor="new-user-role" className="block text-xs font-semibold mb-1">Assigned Role</label>
                  <select
                    id="new-user-role"
                    value={newUserRole}
                    onChange={(e) => {
                      const roleVal = e.target.value as UserRole;
                      setNewUserRole(roleVal);
                      if (roleVal === 'exam_controller' && newUserAllowedCats.length === 0) {
                        setNewUserAllowedCats(['examination']);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="content_editor">Content Editor / PRO</option>
                    <option value="department_admin">Department Admin</option>
                    <option value="iqac_officer">IQAC / Compliance Officer</option>
                    <option value="exam_controller">Controller of Examinations (CoE)</option>
                    <option value="specific_page_editor">Specific Page / Category Access Only</option>
                  </select>
                </div>
                {newUserRole === 'specific_page_editor' && (
                  <p className="text-[11px] px-2.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                    Strict Isolation: This account will only see <strong>Pages &amp; Portal Content</strong> for the exact categories or individual pages checked below (all other admin modules stay hidden).
                  </p>
                )}
                {newUserRole === 'department_admin' && (
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {state.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        Assigned Dept: {d.name}
                      </option>
                    ))}
                  </select>
                )}
                {newUserRole !== 'super_admin' && (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 space-y-1.5">
                      <p className="text-xs font-semibold">Allowed Admin Modules (Explicit Per-Module RBAC):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] max-h-40 overflow-y-auto">
                        {ALL_RBAC_MODULE_OPTIONS.map((mod) => (
                          <label key={mod.id} className="inline-flex items-center gap-1.5 truncate" title={mod.description}>
                            <input
                              type="checkbox"
                              checked={newUserAllowedModules.includes(mod.id)}
                              onChange={(e) =>
                                setNewUserAllowedModules((prev) =>
                                  e.target.checked ? [...prev, mod.id] : prev.filter((m) => m !== mod.id),
                                )
                              }
                            />
                            <span className="truncate">{mod.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 space-y-1.5">
                      <p className="text-xs font-semibold">Allowed Portal Categories (Optional Scoping):</p>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {state.categories.map((c) => (
                          <label key={c.slug} className="inline-flex items-center gap-1.5 truncate">
                            <input
                              type="checkbox"
                              checked={newUserAllowedCats.includes(c.slug)}
                              onChange={(e) =>
                                setNewUserAllowedCats((prev) =>
                                  e.target.checked ? [...prev, c.slug] : prev.filter((s) => s !== c.slug),
                                )
                              }
                            />
                            <span className="truncate">{c.shortLabel || c.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 space-y-1.5">
                      <p className="text-xs font-semibold">Allowed Departments (Multi-Department Scoping):</p>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {state.departments.map((d) => (
                          <label key={d.id} className="inline-flex items-center gap-1.5 truncate">
                            <input
                              type="checkbox"
                              checked={newUserAllowedDeptIds.includes(d.id)}
                              onChange={(e) =>
                                setNewUserAllowedDeptIds((prev) =>
                                  e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id),
                                )
                              }
                            />
                            <span className="truncate">{d.shortName || d.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <PerPageRbacSelector
                      categories={state.categories}
                      pages={state.pages}
                      selectedPageIds={newUserAllowedPageIds}
                      onChange={setNewUserAllowedPageIds}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Create RBAC User
                </button>
              </form>

              <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 font-bold text-sm">
                  CMS Users &amp; Page-Level Permissions ({state.users.length})
                </div>
                <div className="divide-y divide-stone-100 dark:divide-slate-800">
                  {state.users.map((u) => {
                    const isEditing = editingPermsUserId === u.id;
                    const activeSuperAdminsCount = state.users.filter((x) => x.role === 'super_admin' && x.isActive).length;
                    const isDeleteBlocked =
                      u.id === user.id || (u.role === 'super_admin' && u.isActive && activeSuperAdminsCount <= 1);
                    const roleDisplay =
                      u.role === 'specific_page_editor'
                        ? 'Specific Page / Category Access Only'
                        : u.role === 'super_admin'
                          ? 'Super Admin'
                          : u.role === 'content_editor'
                            ? 'Content Editor / PRO'
                            : u.role === 'department_admin'
                              ? 'Department Admin'
                              : u.role === 'iqac_officer'
                                ? 'IQAC / Compliance Officer'
                                : 'Controller of Examinations (CoE)';
                    return (
                      <div key={u.id} className="p-3.5 space-y-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold">{u.fullName}</p>
                            <p className="text-xs text-stone-500">
                              {u.email} · {roleDisplay} {u.assignedDepartmentId ? `(Dept #${u.assignedDepartmentId})` : ''}
                              {u.allowedModules && u.allowedModules.length > 0
                                ? ` · Modules: ${u.allowedModules.length}`
                                : ''}
                              {u.allowedCategories && u.allowedCategories.length > 0
                                ? ` · Cats: ${u.allowedCategories.join(', ')}`
                                : ''}
                              {u.allowedPageIds && u.allowedPageIds.length > 0
                                ? ` · Pages: ${u.allowedPageIds.length} selected`
                                : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingPermsUserId(null);
                                  return;
                                }
                                setEditingPermsUserId(u.id);
                                setPermRole(u.role);
                                setPermDeptId(u.assignedDepartmentId || state.departments[0]?.id || 1);
                                setPermAllowedModules(u.allowedModules || []);
                                setPermAllowedDeptIds(u.allowedDepartmentIds || []);
                                setPermAllowedCats(u.allowedCategories || []);
                                setPermAllowedPageIds(u.allowedPageIds || []);
                              }}
                              className="px-2.5 py-1 rounded text-xs font-semibold border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
                            >
                              {isEditing ? 'Close' : 'Permissions'}
                            </button>
                            <button
                              type="button"
                              onClick={() => adminFetch(`/api/admin/users/${u.id}/toggle`, 'PUT').then(() => notify('ok', 'Updated user status')).catch((e) => notify('err', e.message))}
                              className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                                u.isActive ? 'border-emerald-300 text-emerald-700' : 'border-rose-300 text-rose-700'
                              }`}
                            >
                              {u.isActive ? 'Active' : 'Disabled'}
                            </button>
                            {confirmDeleteUserId === u.id ? (
                              <span className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  aria-label={`Confirm delete ${u.fullName}`}
                                  onClick={async () => {
                                    try {
                                      await adminFetch(`/api/admin/users/${u.id}`, 'DELETE');
                                      setConfirmDeleteUserId(null);
                                      if (editingPermsUserId === u.id) setEditingPermsUserId(null);
                                      notify('ok', `Revoked and deleted user account "${u.fullName}".`);
                                    } catch (err) {
                                      notify('err', (err as Error).message);
                                    }
                                  }}
                                  className="px-2 py-1 rounded text-xs font-semibold bg-rose-700 text-white hover:bg-rose-800"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="px-2 py-1 rounded text-xs border border-stone-300 dark:border-slate-700"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={isDeleteBlocked}
                                title={isDeleteBlocked ? 'Cannot delete your own session or the last active Super Admin' : `Revoke & Delete ${u.fullName}`}
                                aria-label={`Delete user ${u.fullName}`}
                                onClick={() => setConfirmDeleteUserId(u.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-35 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="p-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 space-y-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold">Granular Category &amp; Per-Page RBAC Access</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPermRole('exam_controller');
                                  setPermAllowedCats(['examination']);
                                  setPermAllowedPageIds([]);
                                }}
                                className="px-2 py-1 rounded border border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-semibold text-[11px]"
                              >
                                Preset: Examination Section Only
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <select
                                aria-label={`Edit Role for ${u.fullName}`}
                                value={permRole}
                                onChange={(e) => setPermRole(e.target.value as UserRole)}
                                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                              >
                                <option value="super_admin">Super Admin</option>
                                <option value="content_editor">Content Editor / PRO</option>
                                <option value="department_admin">Department Admin</option>
                                <option value="iqac_officer">IQAC Officer</option>
                                <option value="exam_controller">Controller of Examinations (CoE)</option>
                                <option value="specific_page_editor">Specific Page / Category Access Only</option>
                              </select>
                              {permRole === 'department_admin' && (
                                <select
                                  value={permDeptId}
                                  onChange={(e) => setPermDeptId(Number(e.target.value))}
                                  className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                >
                                  {state.departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      Dept: {d.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {permRole === 'specific_page_editor' && (
                              <p className="text-[11px] px-2.5 py-1.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                                Specific Page / Category Access Only: Account will only access the Pages module for the categories or individual pages checked below.
                              </p>
                            )}
                            <div>
                              <p className="font-semibold mb-1">Allowed Admin Modules (Explicit Per-Module Checkboxes):</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                                {ALL_RBAC_MODULE_OPTIONS.map((mod) => (
                                  <label key={mod.id} className="inline-flex items-center gap-1.5 truncate" title={mod.description}>
                                    <input
                                      type="checkbox"
                                      checked={permAllowedModules.includes(mod.id)}
                                      onChange={(e) =>
                                        setPermAllowedModules((prev) =>
                                          e.target.checked ? [...prev, mod.id] : prev.filter((m) => m !== mod.id),
                                        )
                                      }
                                    />
                                    <span className="truncate">{mod.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="font-semibold mb-1">Allowed Categories (uncheck all for default role behavior):</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {state.categories.map((c) => (
                                  <label key={c.slug} className="inline-flex items-center gap-1.5 truncate">
                                    <input
                                      type="checkbox"
                                      checked={permAllowedCats.includes(c.slug)}
                                      onChange={(e) =>
                                        setPermAllowedCats((prev) =>
                                          e.target.checked ? [...prev, c.slug] : prev.filter((s) => s !== c.slug),
                                        )
                                      }
                                    />
                                    <span className="truncate">{c.shortLabel || c.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="font-semibold mb-1">Allowed Departments (Multi-Department):</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {state.departments.map((d) => (
                                  <label key={d.id} className="inline-flex items-center gap-1.5 truncate">
                                    <input
                                      type="checkbox"
                                      checked={permAllowedDeptIds.includes(d.id)}
                                      onChange={(e) =>
                                        setPermAllowedDeptIds((prev) =>
                                          e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id),
                                        )
                                      }
                                    />
                                    <span className="truncate">{d.shortName || d.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <PerPageRbacSelector
                              categories={state.categories}
                              pages={state.pages}
                              selectedPageIds={permAllowedPageIds}
                              onChange={setPermAllowedPageIds}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await adminFetch(`/api/admin/users/${u.id}/permissions`, 'PUT', {
                                    role: permRole,
                                    assignedDepartmentId: permRole === 'department_admin' ? permDeptId : null,
                                    allowedModules: permAllowedModules,
                                    allowedDepartmentIds: permAllowedDeptIds,
                                    allowedCategories: permAllowedCats,
                                    allowedPageIds: permAllowedPageIds,
                                  });
                                  setEditingPermsUserId(null);
                                  notify('ok', `Saved granular RBAC permissions for ${u.fullName}.`);
                                } catch (err) {
                                  notify('err', (err as Error).message);
                                }
                              }}
                              className="px-3.5 py-1.5 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            >
                              Save User Permissions
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 font-bold text-sm">
                System Security &amp; Content Audit Log
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800 text-left">
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                    {state.auditLogs.slice(0, 15).map((log) => (
                      <tr key={log.id}>
                        <td className="py-2.5 px-4 font-mono-tabular whitespace-nowrap">{log.timestamp}</td>
                        <td className="py-2.5 px-4">{log.actorEmail}</td>
                        <td className="py-2.5 px-4">{log.actorRole}</td>
                        <td className="py-2.5 px-4 font-mono-tabular font-semibold">{log.action}</td>
                        <td className="py-2.5 px-4">
                          {log.entityType}: {log.entityTitle}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 10A. RESEARCH CONFERENCES, WORKSHOPS, FDPs & EVENTS */}
        {activeTab === 'conferences' && canConferences && state && (
          <ConferenceAdminPanel
            conferences={state.conferences || []}
            submissions={state.conferenceSubmissions || []}
            registrations={state.conferenceRegistrations || []}
            departments={state.departments}
            settings={state.settings}
            researchPortfolio={state.researchPortfolio}
            adminFetch={adminFetch}
            uploadBinary={uploadBinaryFile}
            notify={notify}
          />
        )}

        {/* 10B. TRAINING & PLACEMENT HUB ADMIN */}
        {activeTab === 'placements' && canPlacements && state && (
          <EngineeringPortalsAdmin
            mode="placements"
            placements={
              state.placements || {
                summaryNote: '',
                coordinatorName: '',
                coordinatorEmail: '',
                coordinatorPhone: '',
                stats: [],
                stories: [],
                upcomingDrives: [],
              }
            }
            grievances={state.grievances || []}
            departments={state.departments}
            settings={state.settings}
            adminFetch={adminFetch}
            uploadBinary={uploadBinaryFile}
            notify={notify}
          />
        )}

        {/* 10B2. SPORTS & GYMKHANA PORTAL ADMIN */}
        {activeTab === 'sports' && canSports && state && state.sports && (
          <SportsAdminPanel
            sports={state.sports}
            settings={state.settings}
            adminFetch={adminFetch}
            uploadBinary={uploadBinaryFile}
            notify={notify}
          />
        )}

        {/* 10B3. CAMPUS FACILITIES PORTAL ADMIN */}
        {activeTab === 'facilities' && canFacilities && state && state.facilities && (
          <FacilitiesAdminPanel
            facilities={state.facilities}
            settings={state.settings}
            adminFetch={adminFetch}
            uploadBinary={uploadBinaryFile}
            notify={notify}
          />
        )}

        {/* 10C. GRIEVANCE, ANTI-RAGGING & STAKEHOLDER FEEDBACK + EMAIL ROUTING */}
        {activeTab === 'grievances' && canGrievances && state && (
          <div className="space-y-8">
            <EngineeringPortalsAdmin
              mode="grievances"
              placements={
                state.placements || {
                  summaryNote: '',
                  coordinatorName: '',
                  coordinatorEmail: '',
                  coordinatorPhone: '',
                  stats: [],
                  stories: [],
                  upcomingDrives: [],
                }
              }
              grievances={state.grievances || []}
              departments={state.departments}
              settings={state.settings}
              adminFetch={adminFetch}
              uploadBinary={uploadBinaryFile}
              notify={notify}
            />
            <FeedbackManagerPanel
              sections={state.feedbackSections || []}
              entries={state.feedbackEntries || []}
              shortCode={state.settings?.shortCode}
              adminFetch={adminFetch}
              notify={notify}
            />
          </div>
        )}

        {/* 10D. ALUMNI NETWORK, REGISTRATION MODERATION & JOB BOARD */}
        {activeTab === 'alumni' && canAlumni && state && state.alumni && (
          <AlumniAdminPanel
            alumni={state.alumni}
            departments={state.departments}
            settings={state.settings}
            adminFetch={adminFetch}
            uploadBinary={uploadBinaryFile}
            notify={notify}
          />
        )}

        {/* 10E. SEO STUDIO & FOOTER HIT COUNTER */}
        {activeTab === 'seo' && canSeo && state && (
          <SeoAdminPanel
            settings={state.settings}
            adminFetch={adminFetch}
            uploadBinary={uploadBinaryFile}
            notify={notify}
          />
        )}

        {/* 10F. LOG ANALYZER, SECURITY SHIELD & AUTOMATED EMAIL PUSH REPORTS */}
        {activeTab === 'analytics' && canAnalytics && state && (
          <div className="space-y-8">
            <LogSecurityAdminPanel
              shortCode={state.settings?.shortCode}
              adminFetch={adminFetch}
              sessionToken={sessionToken || getStoredToken()}
              notify={notify}
            />
            {state.emailPushConfig && (
              <EmailPushManagerPanel
                config={state.emailPushConfig}
                logs={state.emailDispatchLogs || []}
                adminFetch={adminFetch}
                notify={notify}
              />
            )}
          </div>
        )}

        {/* 11. WEBSITE BACKUP, INCREMENTAL SNAPSHOTS, SCHEDULED EXPORT & DISASTER RECOVERY (SUPER ADMIN) */}
        {activeTab === 'backups' && canUsers && state && (
          <BackupRestorePanel
            shortCode={state.settings?.shortCode}
            adminFetch={adminFetch}
            sessionToken={sessionToken || getStoredToken()}
            notify={notify}
            onRestored={async () => {
              await fetchAdminState();
              await onPublicDataChanged();
            }}
          />
        )}
      </main>
    </div>
  );
}
