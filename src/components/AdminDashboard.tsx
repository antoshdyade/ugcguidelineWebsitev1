import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  FilePlus2,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  LogOut,
  Plus,
  Settings,
  Shield,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { canUserAccessResource, formatBytes, THEME_PALETTES, validateUploadMeta } from '../lib/cmsLogic';
import type {
  AuditLogEntry,
  CampusEvent,
  CmsCategory,
  CmsDocument,
  CmsPage,
  CmsUser,
  Department,
  DocumentCategory,
  HeroSlide,
  SiteSettings,
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
  settings: SiteSettings;
  users: CmsUser[];
  auditLogs: AuditLogEntry[];
}

type AdminTab =
  | 'overview'
  | 'pages'
  | 'departments'
  | 'homepage'
  | 'documents'
  | 'users'
  | 'settings';

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

  // Page Builder form state
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [pageCat, setPageCat] = useState<UgcCategorySlug>('about-hei');
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageSubtitle, setPageSubtitle] = useState('');
  const [pageHtml, setPageHtml] = useState('<h2>Section Heading</h2><p>Enter institutional disclosure content here.</p>');
  const [pagePublished, setPagePublished] = useState(true);

  // Department Subpage / Faculty state
  const [selectedDeptId, setSelectedDeptId] = useState<number>(1);
  const [subTitle, setSubTitle] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [subHtml, setSubHtml] = useState('<h2>Department Update</h2><p>Details here.</p>');
  const [facName, setFacName] = useState('');
  const [facDesignation, setFacDesignation] = useState('Assistant Professor');
  const [facQual, setFacQual] = useState('M.Tech');
  const [facSpec, setFacSpec] = useState('');
  const [facEmail, setFacEmail] = useState('');

  // Homepage / Events state
  const [slideTitle, setSlideTitle] = useState('');
  const [slideCaption, setSlideCaption] = useState('');
  const [slideCta, setSlideCta] = useState('Explore');
  const [slideLink, setSlideLink] = useState('/page/about-overview');
  const [tickerText, setTickerText] = useState('');
  const [tickerBadge, setTickerBadge] = useState('Notice');
  const [tickerLink, setTickerLink] = useState('/page/circulars-notices');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('2026-11-20');
  const [eventCat, setEventCat] = useState<'Event' | 'Notice' | 'Achievement' | 'Circular'>('Notice');
  const [eventSummary, setEventSummary] = useState('');

  // Document Upload state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('Circulars & Forms');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docQuickLink, setDocQuickLink] = useState(true);

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
    setTimeout(() => setStatusMsg(null), 4500);
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

          {/* Role Credentials Quick-Fill for RBAC Verification */}
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
  const canDocs = canUserAccessResource(user, 'documents');
  const canUsers = canUserAccessResource(user, 'users');
  const canSettings = canUserAccessResource(user, 'settings');

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode; allowed: boolean }[] = [
    { id: 'overview', label: 'Overview & UGC Audit', icon: <Shield className="w-4 h-4" />, allowed: true },
    { id: 'pages', label: 'Pages & Categories', icon: <Layers className="w-4 h-4" />, allowed: canPages },
    { id: 'departments', label: 'Department Microsites', icon: <Building2 className="w-4 h-4" />, allowed: canDepts },
    { id: 'homepage', label: 'Sliders, Ticker & Events', icon: <ImageIcon className="w-4 h-4" />, allowed: canHomepage },
    { id: 'documents', label: 'Document Repository', icon: <FolderOpen className="w-4 h-4" />, allowed: canDocs },
    { id: 'users', label: 'Users, RBAC & Audit', icon: <Users className="w-4 h-4" />, allowed: canUsers },
    { id: 'settings', label: 'Site Settings & PHP', icon: <Settings className="w-4 h-4" />, allowed: canSettings },
  ];

  const accessibleDepts = (state?.departments || []).filter((d) =>
    canUserAccessResource(user, 'departments', d.id),
  );
  const currentDept =
    accessibleDepts.find((d) => d.id === selectedDeptId) || accessibleDepts[0];

  const insertFormatting = (snippet: string) => {
    setPageHtml((prev) => `${prev}\n${snippet}`);
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
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'text-white'
                      : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                  }`}
                  style={activeTab === item.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
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

        {/* Loading / Error Resilience so main area is never blank */}
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

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && state && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Published UGC Pages', val: state.pages.filter((p) => p.isPublished).length },
                { label: 'Department Microsites', val: state.departments.length },
                { label: 'Repository Documents', val: state.documents.length },
                { label: 'Active Notices & Events', val: state.events.length },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <p className="text-xs text-stone-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold font-mono-tabular text-stone-900 dark:text-white mt-1">
                    {stat.val}
                  </p>
                </div>
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

        {/* PAGES BUILDER TAB */}
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
                      isPublished: pagePublished,
                    });
                    notify('ok', `Updated page "${pageTitle}".`);
                  } else {
                    await adminFetch('/api/admin/pages', 'POST', {
                      categorySlug: pageCat,
                      slug: pageSlug,
                      title: pageTitle,
                      subtitle: pageSubtitle,
                      contentHtml: pageHtml,
                      isPublished: pagePublished,
                    });
                    notify('ok', `Published new page "${pageTitle}".`);
                  }
                  setEditingPageId(null);
                  setPageTitle('');
                  setPageSlug('');
                  setPageSubtitle('');
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="xl:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">{editingPageId ? 'Edit CMS Page' : 'Create New Disclosure Page'}</h2>
                {editingPageId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPageId(null);
                      setPageTitle('');
                      setPageSlug('');
                      setPageSubtitle('');
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
                  <label className="block text-xs font-semibold mb-1">URL Slug</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPageId)}
                    value={pageSlug}
                    onChange={(e) => setPageSlug(e.target.value)}
                    placeholder="e.g. scholarship-schemes"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Page Title</label>
                <input
                  type="text"
                  required
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
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
                  placeholder="UGC Section 5(x) · Brief description"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold">Rich Content Editor (HTML + Tables)</label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: '+ Heading', code: '<h2>Subheading</h2>' },
                      {
                        label: '+ Table',
                        code: '<table><thead><tr><th>Item</th><th>Details</th></tr></thead><tbody><tr><td>Row 1</td><td>Value</td></tr></tbody></table>',
                      },
                      { label: '+ List', code: '<ul><li>Point 1</li><li>Point 2</li></ul>' },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => insertFormatting(btn.code)}
                        className="px-2 py-0.5 text-[11px] rounded border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={8}
                  value={pageHtml}
                  onChange={(e) => setPageHtml(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
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

            <div className="xl:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 font-bold text-sm">
                All Disclosure Pages ({state.pages.length})
              </div>
              <div className="max-h-[540px] overflow-y-auto divide-y divide-stone-100 dark:divide-slate-800">
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

        {/* DEPARTMENT MICROSITES TAB */}
        {activeTab === 'departments' && canDepts && state && currentDept && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {accessibleDepts.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDeptId(d.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold border ${
                    currentDept.id === d.id
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700'
                  }`}
                  style={currentDept.id === d.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  {d.name}
                </button>
              ))}
              {user.role === 'department_admin' && (
                <span className="text-xs text-stone-500 dark:text-slate-400 ml-2">
                  RBAC Scope: Restricted strictly to your assigned department
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sub-pages Manager */}
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <h2 className="text-base font-bold">{currentDept.shortName} Microsite Sub-Pages</h2>
                <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                  {currentDept.subPages.map((sp) => (
                    <li key={sp.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold">{sp.title}</p>
                        <p className="text-xs text-stone-500">/{currentDept.slug}/{sp.slug}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Delete sub-page ${sp.title}`}
                        onClick={async () => {
                          try {
                            await adminFetch(`/api/admin/departments/${currentDept.id}/subpages/${sp.id}`, 'DELETE');
                            notify('ok', `Removed sub-page "${sp.title}".`);
                          } catch (err) {
                            notify('err', (err as Error).message);
                          }
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await adminFetch(`/api/admin/departments/${currentDept.id}/subpages`, 'POST', {
                        title: subTitle,
                        slug: subSlug,
                        contentHtml: subHtml,
                        isPublished: true,
                      });
                      setSubTitle('');
                      setSubSlug('');
                      notify('ok', 'Added department sub-page.');
                    } catch (err) {
                      notify('err', (err as Error).message);
                    }
                  }}
                  className="pt-4 border-t border-stone-200 dark:border-slate-800 space-y-2.5"
                >
                  <p className="text-xs font-semibold">Add Department Sub-Page</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={subTitle}
                      onChange={(e) => setSubTitle(e.target.value)}
                      placeholder="Title (e.g. Placements)"
                      className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      required
                      value={subSlug}
                      onChange={(e) => setSubSlug(e.target.value)}
                      placeholder="Slug (e.g. placements)"
                      className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={subHtml}
                    onChange={(e) => setSubHtml(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Sub-Page
                  </button>
                </form>
              </div>

              {/* Faculty Directory Manager */}
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <h2 className="text-base font-bold">{currentDept.shortName} Faculty Profiles</h2>
                <ul className="divide-y divide-stone-100 dark:divide-slate-800">
                  {currentDept.faculty.map((f) => (
                    <li key={f.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-semibold">{f.name}</p>
                        <p className="text-xs text-stone-500">
                          {f.designation} · {f.qualification}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove faculty ${f.name}`}
                        onClick={async () => {
                          try {
                            await adminFetch(`/api/admin/departments/${currentDept.id}/faculty/${f.id}`, 'DELETE');
                            notify('ok', `Removed faculty "${f.name}".`);
                          } catch (err) {
                            notify('err', (err as Error).message);
                          }
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await adminFetch(`/api/admin/departments/${currentDept.id}/faculty`, 'POST', {
                        name: facName,
                        designation: facDesignation,
                        qualification: facQual,
                        specialization: facSpec,
                        email: facEmail,
                      });
                      setFacName('');
                      setFacSpec('');
                      setFacEmail('');
                      notify('ok', 'Added faculty profile.');
                    } catch (err) {
                      notify('err', (err as Error).message);
                    }
                  }}
                  className="pt-4 border-t border-stone-200 dark:border-slate-800 space-y-2.5"
                >
                  <p className="text-xs font-semibold">Add Faculty Member</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={facName}
                      onChange={(e) => setFacName(e.target.value)}
                      placeholder="Full Name"
                      className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      required
                      value={facDesignation}
                      onChange={(e) => setFacDesignation(e.target.value)}
                      placeholder="Designation"
                      className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={facQual}
                      onChange={(e) => setFacQual(e.target.value)}
                      placeholder="Qualification"
                      className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={facSpec}
                      onChange={(e) => setFacSpec(e.target.value)}
                      placeholder="Specialization"
                      className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <input
                    type="email"
                    value={facEmail}
                    onChange={(e) => setFacEmail(e.target.value)}
                    placeholder="Institutional Email"
                    className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Faculty
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* HOMEPAGE SLIDERS, TICKER & EVENTS */}
        {activeTab === 'homepage' && canHomepage && state && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hero Slides */}
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-bold">Hero Slider Manager</h2>
              <ul className="space-y-2">
                {state.sliders.map((s) => (
                  <li key={s.id} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-stone-500 truncate max-w-[200px]">{s.ctaLink}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => adminFetch(`/api/admin/sliders/${s.id}`, 'DELETE').then(() => notify('ok', 'Slide deleted'))}
                      className="text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await adminFetch('/api/admin/sliders', 'POST', {
                    title: slideTitle,
                    caption: slideCaption,
                    ctaLabel: slideCta,
                    ctaLink: slideLink,
                  });
                  setSlideTitle('');
                  setSlideCaption('');
                  notify('ok', 'Added hero slide.');
                }}
                className="space-y-2 pt-3 border-t border-stone-200 dark:border-slate-800"
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
                  Add Slide
                </button>
              </form>
            </div>

            {/* Ticker Manager */}
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <h2 className="text-base font-bold">Scrolling Ticker Manager</h2>
              <ul className="space-y-2">
                {state.ticker.map((tk) => (
                  <li key={tk.id} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 flex items-start justify-between gap-2 text-xs">
                    <span>
                      <strong>{tk.badgeText}:</strong> {tk.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => adminFetch(`/api/admin/ticker/${tk.id}`, 'DELETE').then(() => notify('ok', 'Ticker removed'))}
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
                  notify('ok', 'Added scrolling announcement.');
                }}
                className="space-y-2 pt-3 border-t border-stone-200 dark:border-slate-800"
              >
                <input
                  type="text"
                  required
                  value={tickerText}
                  onChange={(e) => setTickerText(e.target.value)}
                  placeholder="Ticker Announcement Text"
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={tickerBadge}
                    onChange={(e) => setTickerBadge(e.target.value)}
                    placeholder="Label (e.g. FRA Fee)"
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
              <h2 className="text-base font-bold">Events, Circulars &amp; Notices</h2>
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {state.events.map((ev) => (
                  <li key={ev.id} className="p-2.5 rounded border border-stone-200 dark:border-slate-800 flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold">{ev.title}</p>
                      <p className="text-stone-500 tabular-nums">
                        {ev.category} · {ev.eventDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => adminFetch(`/api/admin/events/${ev.id}`, 'DELETE').then(() => notify('ok', 'Event deleted'))}
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
                  await adminFetch('/api/admin/events', 'POST', {
                    title: eventTitle,
                    eventDate,
                    category: eventCat,
                    summary: eventSummary,
                  });
                  setEventTitle('');
                  setEventSummary('');
                  notify('ok', 'Published event/notice.');
                }}
                className="space-y-2 pt-3 border-t border-stone-200 dark:border-slate-800"
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
                    onChange={(e) => setEventCat(e.target.value as 'Event' | 'Notice' | 'Achievement' | 'Circular')}
                    className="px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Notice">Notice</option>
                    <option value="Circular">Circular</option>
                    <option value="Event">Event</option>
                    <option value="Achievement">Achievement</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={eventSummary}
                  onChange={(e) => setEventSummary(e.target.value)}
                  placeholder="Summary..."
                  className="w-full px-2.5 py-1.5 text-sm rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Publish Notice
                </button>
              </form>
            </div>
          </div>
        )}

        {/* DOCUMENTS & MEDIA UPLOAD MANAGER */}
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
                <label className="block text-xs font-semibold mb-1">Select File (Optional in Demo)</label>
                <input
                  type="file"
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

        {/* USERS & AUDIT LOGS (SUPER ADMIN) */}
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

            {/* Audit Log */}
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

        {/* SITE SETTINGS & PHP DEPLOYMENT TAB */}
        {activeTab === 'settings' && canSettings && settingsDraft && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await adminFetch('/api/admin/settings', 'PUT', settingsDraft);
                  notify('ok', 'Site settings updated.');
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <h2 className="text-base font-bold">Institutional Identity &amp; Theme Defaults</h2>
              <div>
                <label className="block text-xs font-semibold mb-1">Institution Full Name</label>
                <input
                  type="text"
                  value={settingsDraft.institutionName}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, institutionName: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Default Institutional Theme Palette</label>
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
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Save Site Settings
              </button>
            </form>

            <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h2 className="text-base font-bold">XAMPP / LAMP / cPanel PHP 8.x Package</h2>
              <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                The complete standalone PHP 8.x (PDO) + MySQL 8 codebase mirroring this application is generated in the workspace directory <code className="font-mono">/php-cms/</code>:
              </p>
              <ul className="text-xs font-mono space-y-1 text-stone-700 dark:text-slate-300 bg-stone-50 dark:bg-slate-800 p-3 rounded-lg border border-stone-200 dark:border-slate-700">
                <li>database.sql (Schema + UGC Seeds)</li>
                <li>config/db.php &amp; includes/auth.php</li>
                <li>index.php, page.php, department.php</li>
                <li>quick-links.php, gallery.php, contact.php, search.php</li>
                <li>assets/css/style.css &amp; assets/js/accessibility.js</li>
                <li>admin/*.php (Full RBAC Dashboard)</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
