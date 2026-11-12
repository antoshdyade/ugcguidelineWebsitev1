import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  Edit3,
  FilePlus2,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  LogOut,
  Phone,
  Plus,
  Settings,
  Shield,
  Trash2,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import { canUserAccessResource, formatBytes, THEME_PALETTES, validateUploadMeta } from '../lib/cmsLogic';
import { ImageUploader } from './ImageUploader';
import { RichTextEditor } from './RichTextEditor';
import type {
  AuditLogEntry,
  CampusEvent,
  CmsCategory,
  CmsDocument,
  CmsPage,
  CmsUser,
  Department,
  DepartmentSubPage,
  DocumentCategory,
  FacultyMember,
  GalleryAlbum,
  HeroSlide,
  LeadershipProfile,
  SiteSettings,
  TelephoneEntry,
  TickerItem,
  UgcCategorySlug,
  UserRole,
} from '../types/cms';

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
  settings: SiteSettings;
  users: CmsUser[];
  auditLogs: AuditLogEntry[];
}

type AdminTab =
  | 'overview'
  | 'pages'
  | 'departments'
  | 'homepage'
  | 'leadership'
  | 'gallery'
  | 'documents'
  | 'directory'
  | 'settings'
  | 'users';

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
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [state, setState] = useState<AdminStatePayload | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Page Builder state
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [pageCat, setPageCat] = useState<UgcCategorySlug>('about-hei');
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageSubtitle, setPageSubtitle] = useState('');
  const [pageHtml, setPageHtml] = useState('<h2>Section Heading</h2><p>Enter institutional disclosure content here.</p>');
  const [pagePdfUrl, setPagePdfUrl] = useState('');
  const [pagePdfLabel, setPagePdfLabel] = useState('');
  const [pagePublished, setPagePublished] = useState(true);

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

  const [deptDraft, setDeptDraft] = useState<Partial<Department>>({});
  const [deptPanelMode, setDeptPanelMode] = useState<'micropages' | 'faculty' | 'labs' | 'profile'>('micropages');

  // Department Sub-page (Micro-page) state
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subTitle, setSubTitle] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [subHtml, setSubHtml] = useState('<h2>Department Update</h2><p>Enter department micro-page details here.</p>');
  const [subPublished, setSubPublished] = useState(true);

  // Department Faculty state
  const [editingFacId, setEditingFacId] = useState<number | null>(null);
  const [facName, setFacName] = useState('');
  const [facDesignation, setFacDesignation] = useState('Assistant Professor');
  const [facQual, setFacQual] = useState('M.Tech');
  const [facSpec, setFacSpec] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facExp, setFacExp] = useState(5);
  const [facPhoto, setFacPhoto] = useState('/src/assets/images/leadership_principal_1794512597061.jpg');

  // Department Labs state
  const [labName, setLabName] = useState('');
  const [labArea, setLabArea] = useState(1400);
  const [labEquip, setLabEquip] = useState('');
  const [labIncharge, setLabIncharge] = useState('');

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
  const [eventCat, setEventCat] = useState<'Event' | 'Notice' | 'Achievement' | 'Circular' | 'Placement'>('Notice');
  const [eventSummary, setEventSummary] = useState('');
  const [eventImage, setEventImage] = useState('');

  // Leadership state
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [leadRole, setLeadRole] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadQual, setLeadQual] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadPhoto, setLeadPhoto] = useState('/src/assets/images/leadership_principal_1794512597061.jpg');
  const [leadBio, setLeadBio] = useState('');
  const [leadGroup, setLeadGroup] = useState<LeadershipProfile['committeeGroup']>('statutory');

  // Gallery state
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumCat, setAlbumCat] = useState('Campus');
  const [albumDate, setAlbumDate] = useState('2026-11-12');
  const [albumCover, setAlbumCover] = useState('/src/assets/images/hero_campus_aerial_1794512596442.jpg');
  const [selectedAlbumId, setSelectedAlbumId] = useState<number>(1);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');

  // Document Upload state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('Circulars & Forms');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docQuickLink, setDocQuickLink] = useState(true);

  // Telephone Directory state
  const [dirSection, setDirSection] = useState('');
  const [dirOfficer, setDirOfficer] = useState('');
  const [dirDesig, setDirDesig] = useState('');
  const [dirExt, setDirExt] = useState('');
  const [dirPhone, setDirPhone] = useState('');
  const [dirEmail, setDirEmail] = useState('');

  // Users state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('content_editor');
  const [newUserDept, setNewUserDept] = useState<number>(1);

  // Settings draft
  const [settingsDraft, setSettingsDraft] = useState<SiteSettings | null>(null);

  const notify = (type: 'ok' | 'err', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 5000);
  };

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

  const getStoredToken = (): string => {
    if (sessionToken) return sessionToken;
    try {
      const raw = window.sessionStorage.getItem('svcoer_admin_session');
      if (!raw) return '';
      const parsed = JSON.parse(raw) as { sessionToken?: string };
      return parsed.sessionToken || '';
    } catch {
      return '';
    }
  };

  const fetchAdminState = async (tokenOverride?: string): Promise<boolean> => {
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
      if (data.gallery[0] && !data.gallery.some((g) => g.id === selectedAlbumId)) {
        setSelectedAlbumId(data.gallery[0].id);
      }
      return true;
    } catch {
      setStateError('Unable to reach CMS server while loading workspace data.');
      return false;
    } finally {
      setStateLoading(false);
    }
  };

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
              setActiveTab('departments');
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
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setLoginError(data.error || 'Authentication failed.');
        return;
      }
      const token = String(data.sessionToken || '');
      saveStoredSession(token, String(data.csrfToken || ''));
      setUser(data.user);
      if (data.user.assignedDepartmentId) {
        setSelectedDeptId(data.user.assignedDepartmentId);
        setActiveTab('departments');
      } else {
        setActiveTab('overview');
      }
      await fetchAdminState(token);
    } catch {
      setLoginError('Network error while connecting to CMS server.');
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
  };

  const adminFetch = async (url: string, method: string, body?: unknown) => {
    const activeToken = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    };
    if (activeToken) {
      headers.Authorization = `Bearer ${activeToken}`;
    }
    const resp = await fetch(url, {
      method,
      credentials: 'include',
      headers,
      body: body ? JSON.stringify(body) : undefined,
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
      throw new Error(data.error || 'Operation failed');
    }
    await fetchAdminState(activeToken);
    await onPublicDataChanged();
    return data;
  };

  const uploadBinaryFile = async (file: File): Promise<string> => {
    const check = validateUploadMeta(file.name, file.type || 'application/octet-stream', file.size);
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
              ].map((acc) => (
                <button
                  key={acc.e}
                  type="button"
                  onClick={() => {
                    setEmail(acc.e);
                    setPassword(acc.p);
                  }}
                  className="text-left px-2.5 py-1.5 rounded border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800"
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

  const canPages = canUserAccessResource(user, 'pages');
  const canDepts = canUserAccessResource(user, 'departments');
  const canHomepage = canUserAccessResource(user, 'sliders_events');
  const canLeadership = canUserAccessResource(user, 'leadership');
  const canGallery = canUserAccessResource(user, 'gallery');
  const canDocs = canUserAccessResource(user, 'documents');
  const canDirectory = canUserAccessResource(user, 'directory');
  const canUsers = canUserAccessResource(user, 'users');
  const canSettings = canUserAccessResource(user, 'settings');

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; allowed: boolean }[] = [
    { id: 'overview', label: 'Overview & UGC Audit', icon: <Shield className="w-4 h-4" />, allowed: true },
    { id: 'pages', label: 'Pages & UGC Content', icon: <Layers className="w-4 h-4" />, allowed: canPages },
    { id: 'departments', label: 'Departments & Micro-Pages', icon: <Building2 className="w-4 h-4" />, allowed: canDepts },
    { id: 'homepage', label: 'Hero, Ticker & Events', icon: <ImageIcon className="w-4 h-4" />, allowed: canHomepage },
    { id: 'leadership', label: 'Leadership & Governance', icon: <UserCheck className="w-4 h-4" />, allowed: canLeadership },
    { id: 'gallery', label: 'Picture Gallery', icon: <ImageIcon className="w-4 h-4" />, allowed: canGallery },
    { id: 'documents', label: 'Document Repository', icon: <FolderOpen className="w-4 h-4" />, allowed: canDocs },
    { id: 'directory', label: 'Telephone Directory', icon: <Phone className="w-4 h-4" />, allowed: canDirectory },
    { id: 'settings', label: 'Site Settings, Vision & Theme', icon: <Settings className="w-4 h-4" />, allowed: canSettings },
    { id: 'users', label: 'Users, RBAC & Audit', icon: <Users className="w-4 h-4" />, allowed: canUsers },
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
    setEditingFacId(null);
    setFacName('');
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Published UGC Pages', val: state.pages.filter((p) => p.isPublished).length, tab: 'pages' as AdminTab },
                { label: 'Department Microsites', val: state.departments.length, tab: 'departments' as AdminTab },
                { label: 'Repository Documents', val: state.documents.length, tab: 'documents' as AdminTab },
                { label: 'Gallery Albums', val: state.gallery.length, tab: 'gallery' as AdminTab },
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

        {/* 2. PAGES BUILDER TAB (Visual WYSIWYG + HTML Toggle + PDF Attachment Upload) */}
        {activeTab === 'pages' && canPages && state && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editingPageId) {
                    await adminFetch(`/api/admin/pages/${editingPageId}`, 'PUT', {
                      categorySlug: pageCat,
                      title: pageTitle,
                      subtitle: pageSubtitle,
                      contentHtml: pageHtml,
                      attachedPdfUrl: pagePdfUrl || undefined,
                      attachedPdfLabel: pagePdfLabel || undefined,
                      isPublished: pagePublished,
                    });
                    notify('ok', `Updated page "${pageTitle}".`);
                  } else {
                    await adminFetch('/api/admin/pages', 'POST', {
                      categorySlug: pageCat,
                      slug: pageSlug || pageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                      title: pageTitle,
                      subtitle: pageSubtitle,
                      contentHtml: pageHtml,
                      attachedPdfUrl: pagePdfUrl || undefined,
                      attachedPdfLabel: pagePdfLabel || undefined,
                      isPublished: pagePublished,
                    });
                    notify('ok', `Published new page "${pageTitle}".`);
                  }
                  setEditingPageId(null);
                  setPageTitle('');
                  setPageSlug('');
                  setPageSubtitle('');
                  setPagePdfUrl('');
                  setPagePdfLabel('');
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  {editingPageId ? 'Edit Disclosure Page' : 'Create New Disclosure Page'}
                </h2>
                {editingPageId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPageId(null);
                      setPageTitle('');
                      setPageSlug('');
                      setPageSubtitle('');
                      setPagePdfUrl('');
                      setPagePdfLabel('');
                    }}
                    className="text-xs underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">UGC Category</label>
                  <select
                    value={pageCat}
                    onChange={(e) => setPageCat(e.target.value as UgcCategorySlug)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {state.categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.ugcCode} · {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">URL Slug (auto-generated if blank)</label>
                  <input
                    type="text"
                    disabled={Boolean(editingPageId)}
                    value={pageSlug}
                    onChange={(e) => setPageSlug(e.target.value)}
                    placeholder="e.g. scholarship-schemes"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Page Title</label>
                  <input
                    type="text"
                    required
                    value={pageTitle}
                    onChange={(e) => {
                      setPageTitle(e.target.value);
                      if (!editingPageId && !pageSlug) {
                        setPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                      }
                    }}
                    placeholder="Enter page title"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Subtitle / UGC Reference</label>
                  <input
                    type="text"
                    value={pageSubtitle}
                    onChange={(e) => setPageSubtitle(e.target.value)}
                    placeholder="UGC Section 5(x) · Description"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <RichTextEditor
                label="Page Content (Visual Word-style Editor with Optional HTML View)"
                value={pageHtml}
                onChange={setPageHtml}
                uploadBinary={uploadBinaryFile}
                minHeight={230}
              />

              {/* Attached Statutory PDF Upload */}
              <div className="p-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold">Optional Attached Downloadable PDF</span>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold text-white cursor-pointer" style={{ backgroundColor: 'var(--secondary-color)' }}>
                    <Upload className="w-3 h-3" />
                    <span>Upload PDF</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
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
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={pagePdfLabel}
                    onChange={(e) => setPagePdfLabel(e.target.value)}
                    placeholder="Button Label (e.g. Download Notification PDF)"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={pagePdfUrl}
                    onChange={(e) => setPagePdfUrl(e.target.value)}
                    placeholder="/uploads/document.pdf"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={pagePublished}
                    onChange={(e) => setPagePublished(e.target.checked)}
                  />
                  <span>Publish Immediately</span>
                </label>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>{editingPageId ? 'Save Changes' : 'Create Page'}</span>
                </button>
              </div>
            </form>

            <div className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 font-bold text-sm">
                All Disclosure Pages ({state.pages.length})
              </div>
              <div className="max-h-[640px] overflow-y-auto divide-y divide-stone-100 dark:divide-slate-800">
                {state.pages.map((pg) => (
                  <div key={pg.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-900 dark:text-white truncate">{pg.title}</p>
                      <p className="text-xs text-stone-500 dark:text-slate-400">
                        {pg.categorySlug} · /{pg.slug} · {pg.isPublished ? 'Published' : 'Draft'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPageId(pg.id);
                          setPageCat(pg.categorySlug);
                          setPageTitle(pg.title);
                          setPageSlug(pg.slug);
                          setPageSubtitle(pg.subtitle);
                          setPageHtml(pg.contentHtml);
                          setPagePdfUrl(pg.attachedPdfUrl || '');
                          setPagePdfLabel(pg.attachedPdfLabel || '');
                          setPagePublished(pg.isPublished);
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
                            await adminFetch(`/api/admin/pages/${pg.id}`, 'DELETE');
                            notify('ok', `Deleted page "${pg.title}".`);
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
                ))}
              </div>
            </div>
          </div>
        )}

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
                    const created = (await adminFetch('/api/admin/departments', 'POST', {
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
                    })) as Department;
                    setNewDeptName('');
                    setNewDeptShort('');
                    setNewDeptCode('');
                    setNewDeptSlug('');
                    setNewDeptHod('');
                    setNewDeptOverview('');
                    setShowAddDept(false);
                    setSelectedDeptId(created.id);
                    notify('ok', `Added new department microsite "${created.name}".`);
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
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Create Department Microsite
                </button>
              </form>
            )}

            {currentDept && (
              <div className="space-y-4">
                {/* Department Sub-Section Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-stone-200 dark:border-slate-800">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'micropages' as const, label: `Micro-Pages (${currentDept.subPages.length})` },
                      { id: 'faculty' as const, label: `Faculty Profiles (${currentDept.faculty.length})` },
                      { id: 'labs' as const, label: `Laboratories (${currentDept.labs.length})` },
                      { id: 'profile' as const, label: 'Department Profile & Banner' },
                    ].map((tItem) => (
                      <button
                        key={tItem.id}
                        type="button"
                        onClick={() => {
                          setDeptPanelMode(tItem.id);
                          if (tItem.id === 'profile') setDeptDraft({ ...currentDept });
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
                          await adminFetch(`/api/admin/departments/${currentDept.id}`, 'DELETE');
                          notify('ok', `Deleted department "${currentDept.name}".`);
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

                {/* Department Micro-Pages Manager (Create, Edit with WYSIWYG+HTML, Delete) */}
                {deptPanelMode === 'micropages' && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          if (editingSubId) {
                            await adminFetch(
                              `/api/admin/departments/${currentDept.id}/subpages/${editingSubId}`,
                              'PUT',
                              {
                                title: subTitle,
                                contentHtml: subHtml,
                                isPublished: subPublished,
                              },
                            );
                            notify('ok', `Updated micro-page "${subTitle}".`);
                          } else {
                            await adminFetch(`/api/admin/departments/${currentDept.id}/subpages`, 'POST', {
                              title: subTitle,
                              slug: subSlug || subTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                              contentHtml: subHtml,
                              isPublished: subPublished,
                            });
                            notify('ok', `Added micro-page "${subTitle}".`);
                          }
                          setEditingSubId(null);
                          setSubTitle('');
                          setSubSlug('');
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
                            : `Add Micro-Page to ${currentDept.shortName}`}
                        </h2>
                        {editingSubId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubId(null);
                              setSubTitle('');
                              setSubSlug('');
                            }}
                            className="text-xs underline"
                          >
                            Cancel Edit
                          </button>
                        )}
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
                          placeholder="Micro-Page Title (e.g. Placement Records)"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          required
                          disabled={Boolean(editingSubId)}
                          value={subSlug}
                          onChange={(e) => setSubSlug(e.target.value)}
                          placeholder="URL Slug (e.g. placements)"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
                        />
                      </div>
                      <RichTextEditor
                        label="Micro-Page Content (Visual Editor + HTML Source)"
                        value={subHtml}
                        onChange={setSubHtml}
                        uploadBinary={uploadBinaryFile}
                        minHeight={220}
                      />
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 text-xs font-medium">
                          <input
                            type="checkbox"
                            checked={subPublished}
                            onChange={(e) => setSubPublished(e.target.checked)}
                          />
                          <span>Published on Microsite Sidebar</span>
                        </label>
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
                        {currentDept.subPages.map((sp: DepartmentSubPage) => (
                          <li key={sp.id} className="py-3 flex items-center justify-between gap-2 text-sm">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{sp.title}</p>
                              <p className="text-xs text-stone-500">
                                /{currentDept.slug}/{sp.slug} · {sp.isPublished ? 'Live' : 'Draft'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubId(sp.id);
                                  setSubTitle(sp.title);
                                  setSubSlug(sp.slug);
                                  setSubHtml(sp.contentHtml);
                                  setSubPublished(sp.isPublished);
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
                                    await adminFetch(`/api/admin/departments/${currentDept.id}/subpages/${sp.id}`, 'DELETE');
                                    notify('ok', `Removed micro-page "${sp.title}".`);
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

                {/* Department Faculty Manager (with Photo Upload & Edit) */}
                {deptPanelMode === 'faculty' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          if (editingFacId) {
                            await adminFetch(
                              `/api/admin/departments/${currentDept.id}/faculty/${editingFacId}`,
                              'PUT',
                              {
                                name: facName,
                                designation: facDesignation,
                                qualification: facQual,
                                specialization: facSpec,
                                email: facEmail,
                                experienceYears: facExp,
                                photoUrl: facPhoto,
                              },
                            );
                            notify('ok', `Updated faculty "${facName}".`);
                          } else {
                            await adminFetch(`/api/admin/departments/${currentDept.id}/faculty`, 'POST', {
                              name: facName,
                              designation: facDesignation,
                              qualification: facQual,
                              specialization: facSpec,
                              email: facEmail,
                              experienceYears: facExp,
                              photoUrl: facPhoto,
                            });
                            notify('ok', `Added faculty "${facName}".`);
                          }
                          setEditingFacId(null);
                          setFacName('');
                          setFacSpec('');
                          setFacEmail('');
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
                          <button type="button" onClick={() => setEditingFacId(null)} className="text-xs underline">
                            Cancel Edit
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          required
                          value={facName}
                          onChange={(e) => setFacName(e.target.value)}
                          placeholder="Full Name"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <input
                          type="text"
                          required
                          value={facDesignation}
                          onChange={(e) => setFacDesignation(e.target.value)}
                          placeholder="Designation"
                          className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
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
                        placeholder="Specialization"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="email"
                        value={facEmail}
                        onChange={(e) => setFacEmail(e.target.value)}
                        placeholder="Institutional Email"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <ImageUploader
                        label="Faculty Portrait Photo"
                        value={facPhoto}
                        onChange={setFacPhoto}
                        uploadBinary={uploadBinaryFile}
                      />
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
                      <h3 className="text-sm font-bold mb-3">{currentDept.shortName} Faculty Profiles</h3>
                      <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                        {currentDept.faculty.map((f: FacultyMember) => (
                          <li key={f.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={f.photoUrl} alt={f.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-stone-200" />
                              <div className="min-w-0">
                                <p className="font-semibold truncate">{f.name}</p>
                                <p className="text-xs text-stone-500 truncate">
                                  {f.designation} · {f.qualification}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFacId(f.id);
                                  setFacName(f.name);
                                  setFacDesignation(f.designation);
                                  setFacQual(f.qualification);
                                  setFacSpec(f.specialization);
                                  setFacEmail(f.email);
                                  setFacExp(f.experienceYears);
                                  setFacPhoto(f.photoUrl);
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

                {/* Department Labs Manager */}
                {deptPanelMode === 'labs' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          await adminFetch(`/api/admin/departments/${currentDept.id}/labs`, 'POST', {
                            name: labName,
                            areaSqFt: labArea,
                            equipmentSummary: labEquip,
                            incharge: labIncharge || currentDept.hodName,
                          });
                          setLabName('');
                          setLabEquip('');
                          setLabIncharge('');
                          notify('ok', 'Added department laboratory.');
                        } catch (err) {
                          notify('err', (err as Error).message);
                        }
                      }}
                      className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                    >
                      <h2 className="text-base font-bold">Add Department Laboratory</h2>
                      <input
                        type="text"
                        required
                        value={labName}
                        onChange={(e) => setLabName(e.target.value)}
                        placeholder="Laboratory Name"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="number"
                          value={labArea}
                          onChange={(e) => setLabArea(Number(e.target.value))}
                          placeholder="Area (sq. ft.)"
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
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        Add Laboratory
                      </button>
                    </form>

                    <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                      <h3 className="text-sm font-bold">{currentDept.shortName} Laboratories</h3>
                      <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                        {currentDept.labs.map((lab) => (
                          <li key={lab.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                            <div>
                              <p className="font-semibold">{lab.name}</p>
                              <p className="text-xs text-stone-500">
                                {lab.areaSqFt} sq.ft · In-charge: {lab.incharge}
                              </p>
                              <p className="text-xs text-stone-600 dark:text-slate-300 mt-1">{lab.equipmentSummary}</p>
                            </div>
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
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Edit Department Overview, Vision, Mission, Hero Image */}
                {deptPanelMode === 'profile' && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await adminFetch(`/api/admin/departments/${currentDept.id}`, 'PUT', {
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
                        });
                        notify('ok', 'Updated department profile & banner image.');
                      } catch (err) {
                        notify('err', (err as Error).message);
                      }
                    }}
                    className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
                  >
                    <h2 className="text-base font-bold">Edit {currentDept.name} Microsite Profile</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={deptDraft.name ?? currentDept.name}
                        onChange={(e) => setDeptDraft({ ...deptDraft, name: e.target.value })}
                        placeholder="Department Name"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 sm:col-span-2"
                      />
                      <input
                        type="text"
                        value={deptDraft.nbaStatus ?? currentDept.nbaStatus}
                        onChange={(e) => setDeptDraft({ ...deptDraft, nbaStatus: e.target.value })}
                        placeholder="NBA / Accreditation Status"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={deptDraft.hodName ?? currentDept.hodName}
                        onChange={(e) => setDeptDraft({ ...deptDraft, hodName: e.target.value })}
                        placeholder="HoD Name"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="number"
                        value={deptDraft.establishedYear ?? currentDept.establishedYear}
                        onChange={(e) => setDeptDraft({ ...deptDraft, establishedYear: Number(e.target.value) })}
                        placeholder="Established Year"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <input
                        type="number"
                        value={deptDraft.intakeCapacity ?? currentDept.intakeCapacity}
                        onChange={(e) => setDeptDraft({ ...deptDraft, intakeCapacity: Number(e.target.value) })}
                        placeholder="Intake Capacity"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={deptDraft.overview ?? currentDept.overview}
                      onChange={(e) => setDeptDraft({ ...deptDraft, overview: e.target.value })}
                      placeholder="Department Overview"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <textarea
                        rows={2}
                        value={deptDraft.vision ?? currentDept.vision}
                        onChange={(e) => setDeptDraft({ ...deptDraft, vision: e.target.value })}
                        placeholder="Department Vision"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <textarea
                        rows={2}
                        value={deptDraft.mission ?? currentDept.mission}
                        onChange={(e) => setDeptDraft({ ...deptDraft, mission: e.target.value })}
                        placeholder="Department Mission"
                        className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                    <ImageUploader
                      label="Department Hero Banner Image"
                      value={deptDraft.heroImageUrl ?? currentDept.heroImageUrl}
                      onChange={(url) => setDeptDraft({ ...deptDraft, heroImageUrl: url })}
                      uploadBinary={uploadBinaryFile}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                      Save Department Profile
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. HOMEPAGE SLIDERS, TICKER & EVENTS (with Image Upload & Edit) */}
        {activeTab === 'homepage' && canHomepage && state && (
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
                {state.sliders.map((s) => (
                  <li key={s.id} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={s.imageUrl} alt={s.title} className="w-10 h-8 rounded object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{s.title}</p>
                        <p className="text-stone-500 truncate">{s.ctaLink}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSlideId(s.id);
                          setSlideTitle(s.title);
                          setSlideCaption(s.caption);
                          setSlideImage(s.imageUrl);
                          setSlideCta(s.ctaLabel);
                          setSlideLink(s.ctaLink);
                        }}
                        className="p-1 text-stone-600 hover:bg-stone-100 rounded"
                        title="Edit Slide"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => adminFetch(`/api/admin/sliders/${s.id}`, 'DELETE').then(() => notify('ok', 'Slide deleted'))}
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
                      await adminFetch(`/api/admin/sliders/${editingSlideId}`, 'PUT', {
                        title: slideTitle,
                        caption: slideCaption,
                        imageUrl: slideImage,
                        ctaLabel: slideCta,
                        ctaLink: slideLink,
                      });
                      notify('ok', 'Updated hero slide.');
                    } else {
                      await adminFetch('/api/admin/sliders', 'POST', {
                        title: slideTitle,
                        caption: slideCaption,
                        imageUrl: slideImage,
                        ctaLabel: slideCta,
                        ctaLink: slideLink,
                      });
                      notify('ok', 'Added hero slide.');
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
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={slideCta}
                    onChange={(e) => setSlideCta(e.target.value)}
                    placeholder="CTA Label"
                    className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={slideLink}
                    onChange={(e) => setSlideLink(e.target.value)}
                    placeholder="/page/..."
                    className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
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
                {state.ticker.map((t) => (
                  <li key={t.id} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">{t.badgeText}: </span>
                      <span>{t.text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => adminFetch(`/api/admin/ticker/${t.id}`, 'DELETE').then(() => notify('ok', 'Ticker item removed'))}
                      className="text-rose-600 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await adminFetch('/api/admin/ticker', 'POST', {
                    text: tickerText,
                    badgeText: tickerBadge,
                    linkUrl: tickerLink,
                  });
                  setTickerText('');
                  notify('ok', 'Ticker item added.');
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
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={tickerBadge}
                    onChange={(e) => setTickerBadge(e.target.value)}
                    placeholder="Badge (e.g. FRA Fee)"
                    className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={tickerLink}
                    onChange={(e) => setTickerLink(e.target.value)}
                    placeholder="Target Link"
                    className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
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
                    }}
                    className="text-xs underline"
                  >
                    New
                  </button>
                )}
              </div>
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {state.events.map((ev) => (
                  <li key={ev.id} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{ev.title}</p>
                      <p className="text-stone-500 tabular-nums">
                        {ev.category} · {ev.eventDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEventId(ev.id);
                          setEventTitle(ev.title);
                          setEventDate(ev.eventDate);
                          setEventCat(ev.category);
                          setEventSummary(ev.summary);
                          setEventImage(ev.imageUrl || '');
                        }}
                        className="p-1 text-stone-600 hover:bg-stone-100 rounded"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => adminFetch(`/api/admin/events/${ev.id}`, 'DELETE').then(() => notify('ok', 'Event deleted'))}
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
                    await adminFetch(`/api/admin/events/${editingEventId}`, 'PUT', {
                      title: eventTitle,
                      eventDate,
                      category: eventCat,
                      summary: eventSummary,
                      imageUrl: eventImage || undefined,
                    });
                    notify('ok', 'Updated event/notice.');
                  } else {
                    await adminFetch('/api/admin/events', 'POST', {
                      title: eventTitle,
                      eventDate,
                      category: eventCat,
                      summary: eventSummary,
                      imageUrl: eventImage || undefined,
                    });
                    notify('ok', 'Published event/notice.');
                  }
                  setEditingEventId(null);
                  setEventTitle('');
                  setEventSummary('');
                  setEventImage('');
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
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <select
                    value={eventCat}
                    onChange={(e) => setEventCat(e.target.value as CampusEvent['category'])}
                    className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Notice">Notice</option>
                    <option value="Circular">Circular</option>
                    <option value="Event">Event</option>
                    <option value="Achievement">Achievement</option>
                    <option value="Placement">Placement</option>
                  </select>
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
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {editingEventId ? 'Save Changes' : 'Publish Notice'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 5. LEADERSHIP & GOVERNANCE PROFILES (with Photo Upload) */}
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
                    committeeGroup: leadGroup,
                  };
                  if (editingLeadId) {
                    await adminFetch(`/api/admin/leadership/${editingLeadId}`, 'PUT', payload);
                    notify('ok', `Updated leadership profile "${leadName}".`);
                  } else {
                    await adminFetch('/api/admin/leadership', 'POST', payload);
                    notify('ok', `Added leadership profile "${leadName}".`);
                  }
                  setEditingLeadId(null);
                  setLeadRole('');
                  setLeadName('');
                  setLeadQual('');
                  setLeadEmail('');
                  setLeadPhone('');
                  setLeadBio('');
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
                  <button type="button" onClick={() => setEditingLeadId(null)} className="text-xs underline">
                    Cancel
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={leadRole}
                onChange={(e) => setLeadRole(e.target.value)}
                placeholder="Role (e.g. Principal, President, Dean R&D)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={leadQual}
                  onChange={(e) => setLeadQual(e.target.value)}
                  placeholder="Qualification"
                  className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <select
                  value={leadGroup}
                  onChange={(e) => setLeadGroup(e.target.value as LeadershipProfile['committeeGroup'])}
                  className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="statutory">Statutory Officer</option>
                  <option value="governance">Governing Body</option>
                  <option value="icc">Internal Complaint (ICC)</option>
                  <option value="academic_leadership">Academic Dean / HoD</option>
                </select>
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
                {state.leadership.map((l) => (
                  <div key={l.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={l.photoUrl} alt={l.name} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-stone-200" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{l.roleTitle}</p>
                        <p className="font-bold truncate">{l.name}</p>
                        <p className="text-xs text-stone-500 truncate">{l.email} · {l.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLeadId(l.id);
                          setLeadRole(l.roleTitle);
                          setLeadName(l.name);
                          setLeadQual(l.qualification);
                          setLeadEmail(l.email);
                          setLeadPhone(l.phone);
                          setLeadPhoto(l.photoUrl);
                          setLeadBio(l.bio);
                          setLeadGroup(l.committeeGroup);
                        }}
                        className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => adminFetch(`/api/admin/leadership/${l.id}`, 'DELETE').then(() => notify('ok', 'Officer removed'))}
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
                    const created = (await adminFetch('/api/admin/gallery/albums', 'POST', {
                      title: albumTitle,
                      category: albumCat,
                      eventDate: albumDate,
                      coverUrl: albumCover,
                    })) as GalleryAlbum;
                    setAlbumTitle('');
                    setSelectedAlbumId(created.id);
                    notify('ok', `Created photo album "${created.title}".`);
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
                {state.gallery.map((alb) => (
                  <div key={alb.id} className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedAlbumId(alb.id)}
                        className="text-left"
                      >
                        <p className="font-bold text-sm">{alb.title}</p>
                        <p className="text-xs text-stone-500">{alb.category} · {alb.eventDate} · {alb.photos.length} Photos</p>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAlbumId(alb.id)}
                          className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 text-xs"
                        >
                          Manage Photos
                        </button>
                        <button
                          type="button"
                          onClick={() => adminFetch(`/api/admin/gallery/albums/${alb.id}`, 'DELETE').then(() => notify('ok', 'Album deleted'))}
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

        {/* 7. DOCUMENTS & MEDIA UPLOAD MANAGER */}
        {activeTab === 'documents' && canDocs && state && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const fileName = docFile ? docFile.name : `${docTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
                  const mimeType = docFile ? docFile.type || 'application/pdf' : 'application/pdf';
                  const fileSizeBytes = docFile ? docFile.size : 245760;

                  const check = validateUploadMeta(fileName, mimeType, fileSizeBytes);
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

                  await adminFetch('/api/admin/documents', 'POST', {
                    title: docTitle,
                    category: docCategory,
                    fileName,
                    mimeType,
                    fileSizeBytes,
                    base64Content,
                    isQuickLink: docQuickLink,
                  });
                  setDocTitle('');
                  setDocFile(null);
                  notify('ok', 'Document uploaded and published to Repository.');
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <h2 className="text-base font-bold">Upload Statutory Document / Circular</h2>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Strict MIME verification active: PDF, JPG, PNG, DOCX, XLSX only. Executables (.php, .exe, .sh) are rejected.
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
              <div>
                <label className="block text-xs font-semibold mb-1">Repository Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Fee Structure">Fee Structure</option>
                  <option value="Academic Calendar">Academic Calendar</option>
                  <option value="Syllabus">Syllabus</option>
                  <option value="UGC & AICTE Approvals">UGC &amp; AICTE Approvals</option>
                  <option value="NAAC / NBA / NIRF">NAAC / NBA / NIRF</option>
                  <option value="Annual Reports & Audits">Annual Reports &amp; Audits</option>
                  <option value="Circulars & Forms">Circulars &amp; Forms</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Select PDF / Document File</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-stone-600 dark:text-slate-300"
                />
              </div>
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
                <span>Upload &amp; Publish</span>
              </button>
            </form>

            <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 font-bold text-sm">
                Published Documents ({state.documents.length})
              </div>
              <ul className="divide-y divide-stone-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
                {state.documents.map((doc) => (
                  <li key={doc.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{doc.title}</p>
                        <p className="text-xs text-stone-500 font-mono-tabular">
                          {doc.category} · {formatBytes(doc.fileSizeBytes)} · {doc.uploadedAt}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => adminFetch(`/api/admin/documents/${doc.id}`, 'DELETE').then(() => notify('ok', 'Document deleted'))}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                await adminFetch('/api/admin/directory', 'POST', {
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
                notify('ok', 'Added entry to campus telephone directory.');
              }}
              className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <h2 className="text-base font-bold">Add Telephone Directory Entry</h2>
              <input
                type="text"
                required
                value={dirSection}
                onChange={(e) => setDirSection(e.target.value)}
                placeholder="Office / Section (e.g. Scholarship Cell)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                {state.telephoneDirectory.map((row: TelephoneEntry) => (
                  <li key={row.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-semibold">{row.section} · {row.officerName}</p>
                      <p className="text-xs text-stone-500">
                        {row.designation} · Ext {row.extension} · {row.directPhone} · {row.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => adminFetch(`/api/admin/directory/${row.id}`, 'DELETE').then(() => notify('ok', 'Contact removed'))}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 9. SITE SETTINGS, VISION/MISSION, LOGO, STATS & THEME */}
        {activeTab === 'settings' && canSettings && settingsDraft && (
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
              <h2 className="text-base font-bold">Complete Website Identity, Homepage Sections &amp; Theme</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    value={settingsDraft.institutionName}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, institutionName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Affiliation &amp; Recognition Line</label>
                <input
                  type="text"
                  value={settingsDraft.affiliation}
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
                />
                <ImageUploader
                  label="About Campus Showcase Photo"
                  value={settingsDraft.aboutImageUrl || ''}
                  onChange={(url) => setSettingsDraft({ ...settingsDraft, aboutImageUrl: url })}
                  uploadBinary={uploadBinaryFile}
                />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Top Recruiters (Comma-separated)</label>
                  <input
                    type="text"
                    value={(settingsDraft.recruiters || []).join(', ')}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        recruiters: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">DTE &amp; AICTE Codes</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={settingsDraft.dteCode}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, dteCode: e.target.value })}
                      placeholder="DTE Code"
                      className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={settingsDraft.aicteCode}
                      onChange={(e) => setSettingsDraft({ ...settingsDraft, aicteCode: e.target.value })}
                      placeholder="AICTE ID"
                      className="px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Official Phone</label>
                  <input
                    type="text"
                    value={settingsDraft.phone}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Official Email</label>
                  <input
                    type="email"
                    value={settingsDraft.email}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Theme Palette</label>
                  <select
                    value={settingsDraft.defaultPaletteId}
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

        {/* 10. USERS & AUDIT LOGS (SUPER ADMIN) */}
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
                    });
                    setNewUserName('');
                    setNewUserEmail('');
                    setNewUserPass('');
                    notify('ok', 'Created RBAC user account.');
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
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="content_editor">Content Editor / PRO</option>
                  <option value="department_admin">Department Admin</option>
                  <option value="iqac_officer">IQAC / Compliance Officer</option>
                </select>
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
                  CMS Users ({state.users.length})
                </div>
                <div className="divide-y divide-stone-100 dark:divide-slate-800">
                  {state.users.map((u) => (
                    <div key={u.id} className="p-3.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold">{u.fullName}</p>
                        <p className="text-xs text-stone-500">
                          {u.email} · {u.role} {u.assignedDepartmentId ? `(Dept #${u.assignedDepartmentId})` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => adminFetch(`/api/admin/users/${u.id}/toggle`, 'PUT').then(() => notify('ok', 'Updated user status')).catch((e) => notify('err', e.message))}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                          u.isActive ? 'border-emerald-300 text-emerald-700' : 'border-rose-300 text-rose-700'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  ))}
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
      </main>
    </div>
  );
}
