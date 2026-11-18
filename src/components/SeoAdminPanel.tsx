import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import { DEFAULT_SEO_SETTINGS } from '../lib/securityAndSeoLogic';
import type {
  HitCounterStats,
  SeoRouteOverride,
  SeoSettings,
  SiteSettings,
} from '../types/cms';

interface SeoAuditItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

interface SeoAdminPanelProps {
  settings: SiteSettings;
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  uploadBinary: (file: File) => Promise<string>;
  notify: (kind: 'ok' | 'err', msg: string) => void;
}

export function SeoAdminPanel({
  settings,
  adminFetch,
  uploadBinary,
  notify,
}: SeoAdminPanelProps) {
  const [seoDraft, setSeoDraft] = useState<SeoSettings>(DEFAULT_SEO_SETTINGS);
  const [hitCounter, setHitCounter] = useState<HitCounterStats | null>(null);
  const [audit, setAudit] = useState<SeoAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Override composer state
  const [ovPattern, setOvPattern] = useState('');
  const [ovTitle, setOvTitle] = useState('');
  const [ovDesc, setOvDesc] = useState('');
  const [ovKeywords, setOvKeywords] = useState('');
  const [ovNoIndex, setOvNoIndex] = useState(false);

  const loadSeoState = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<{
        seo: SeoSettings;
        hitCounter: HitCounterStats;
        audit: SeoAuditItem[];
      }>('/api/admin/seo', 'GET');
      if (data.seo) setSeoDraft(data.seo);
      if (data.hitCounter) setHitCounter(data.hitCounter);
      if (Array.isArray(data.audit)) setAudit(data.audit);
    } catch (err) {
      notify('err', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, notify]);

  useEffect(() => {
    loadSeoState();
  }, [loadSeoState]);

  const handleSaveSeo = async (e?: React.FormEvent, nextOverrideDraft?: SeoSettings) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = nextOverrideDraft || seoDraft;
      const res = await adminFetch<{
        seo: SeoSettings;
        hitCounter: HitCounterStats;
        audit: SeoAuditItem[];
      }>('/api/admin/seo', 'PUT', payload);
      setSeoDraft(res.seo);
      setHitCounter(res.hitCounter);
      setAudit(res.audit);
      notify('ok', 'SEO Studio, Search Metadata & Footer Hit Counter saved.');
    } catch (err) {
      notify('err', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ovPattern.trim() || !ovTitle.trim()) {
      notify('err', 'Route pattern and SEO title are required.');
      return;
    }
    const cleanPattern = ovPattern.trim().startsWith('/') ? ovPattern.trim() : `/${ovPattern.trim()}`;
    const newOv: SeoRouteOverride = {
      id: `seo-ov-${Date.now()}`,
      routePattern: cleanPattern,
      title: ovTitle.trim(),
      description: ovDesc.trim(),
      keywords: ovKeywords.trim(),
      noIndex: ovNoIndex,
    };
    const filtered = (seoDraft.pageOverrides || []).filter((o) => o.routePattern !== cleanPattern);
    const updated: SeoSettings = {
      ...seoDraft,
      pageOverrides: [newOv, ...filtered],
    };
    setSeoDraft(updated);
    setOvPattern('');
    setOvTitle('');
    setOvDesc('');
    setOvKeywords('');
    setOvNoIndex(false);
    await handleSaveSeo(undefined, updated);
  };

  const handleDeleteOverride = async (id: string) => {
    const updated: SeoSettings = {
      ...seoDraft,
      pageOverrides: (seoDraft.pageOverrides || []).filter((o) => o.id !== id),
    };
    setSeoDraft(updated);
    await handleSaveSeo(undefined, updated);
  };

  if (loading) {
    return (
      <div className="p-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-stone-500">
        Loading SEO Studio, Sitemap Diagnostics &amp; Hit Counter Controls...
      </div>
    );
  }

  const passedCount = audit.filter((a) => a.passed).length;

  return (
    <div className="space-y-6">
      {/* Header Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-stone-500 dark:text-slate-400">SEO Audit Health</p>
          <p className="text-2xl font-bold font-mono-tabular text-stone-900 dark:text-white mt-1">
            {passedCount} / {audit.length || 7} Passed
          </p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-stone-500 dark:text-slate-400">Total Website Visits</p>
          <p className="text-2xl font-bold font-mono-tabular text-stone-900 dark:text-white mt-1">
            {Number(hitCounter?.totalHits || 0).toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-stone-500 dark:text-slate-400">Today&apos;s Page Hits</p>
          <p className="text-2xl font-bold font-mono-tabular text-stone-900 dark:text-white mt-1">
            {Number(hitCounter?.todayHits || 0).toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-stone-500 dark:text-slate-400">Cumulative Unique Visitors</p>
          <p className="text-2xl font-bold font-mono-tabular text-stone-900 dark:text-white mt-1">
            {Number(hitCounter?.uniqueVisitors || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Google Search SERP Preview + Quick Sitemap Links */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" />
              Live Google Search Snippet Preview
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:underline"
              >
                <Globe2 className="w-3.5 h-3.5" /> sitemap.xml <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:underline"
              >
                robots.txt <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 space-y-1">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono truncate">
              {seoDraft.canonicalBaseUrl || 'https://coe.sveri.ac.in'}
            </p>
            <p className="text-base font-semibold text-blue-800 dark:text-blue-300 leading-snug">
              {seoDraft.defaultTitle || settings.institutionName}
            </p>
            <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
              {seoDraft.defaultDescription}
            </p>
          </div>

          {/* Audit Checklist */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400">
                Automated Technical SEO Checklist
              </h3>
              <button
                type="button"
                onClick={loadSeoState}
                className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-slate-300 hover:underline"
              >
                <RefreshCw className="w-3 h-3" /> Re-Audit
              </button>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-slate-800 border border-stone-200 dark:border-slate-800 rounded-lg">
              {audit.map((chk) => (
                <div key={chk.id} className="px-3 py-2 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-stone-800 dark:text-slate-200">{chk.label}</p>
                      <p className="text-stone-500 dark:text-slate-400">{chk.detail}</p>
                    </div>
                  </div>
                  <span
                    className={`font-semibold shrink-0 ${
                      chk.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {chk.passed ? 'OK' : 'Review'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Hit Counter Settings */}
        <div className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-stone-900 dark:text-white">
              Public Footer Website Hit Counter
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Displays verified institution traffic statistics in the website footer and records GeoIP visits into the Log Analyzer.
          </p>

          <label className="flex items-center gap-2.5 text-sm font-medium text-stone-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={seoDraft.showHitCounterInFooter}
              onChange={(e) =>
                setSeoDraft((prev) => ({ ...prev, showHitCounterInFooter: e.target.checked }))
              }
            />
            <span>Show Website Visit Hit Counter in Public Footer</span>
          </label>

          <div>
            <label className="block text-xs font-semibold mb-1 text-stone-700 dark:text-slate-300">
              Historical Counter Baseline / Offset
            </label>
            <input
              type="number"
              min={0}
              value={seoDraft.hitCounterStartOffset}
              onChange={(e) =>
                setSeoDraft((prev) => ({
                  ...prev,
                  hitCounterStartOffset: Math.max(0, Number(e.target.value || 0)),
                }))
              }
              className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              Adjusting this baseline smoothly shifts Total Website Visits while preserving all live increments.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 text-xs space-y-1.5 tabular-nums">
            <div className="flex justify-between">
              <span className="text-stone-500">Current Total Counter:</span>
              <span className="font-bold font-mono">{Number(hitCounter?.totalHits || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Today&apos;s Date (UTC):</span>
              <span className="font-mono">{hitCounter?.todayDate || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Last Visit Recorded:</span>
              <span className="font-mono">{hitCounter?.lastHitAt || '-'}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveSeo()}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving SEO & Counter...' : 'Save SEO & Footer Hit Counter Settings'}
          </button>
        </div>
      </div>

      {/* Global SEO Form */}
      <form
        onSubmit={handleSaveSeo}
        className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-white">
              Global Search Engine Optimization (Meta, OpenGraph, Twitter &amp; Schema.org)
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Applied dynamically on every route across both AI Studio React SPA and Webmin PHP/MySQL deployment.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-60"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <Save className="w-3.5 h-3.5" /> Save Global SEO
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Default Homepage Title (30–70 chars)</label>
            <input
              type="text"
              required
              value={seoDraft.defaultTitle}
              onChange={(e) => setSeoDraft((prev) => ({ ...prev, defaultTitle: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Sub-Page Title Suffix (after &ldquo;|&rdquo;)</label>
            <input
              type="text"
              value={seoDraft.titleSuffix}
              onChange={(e) => setSeoDraft((prev) => ({ ...prev, titleSuffix: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Canonical Production Domain URL</label>
            <input
              type="url"
              required
              value={seoDraft.canonicalBaseUrl}
              onChange={(e) => setSeoDraft((prev) => ({ ...prev, canonicalBaseUrl: e.target.value }))}
              placeholder="https://coe.sveri.ac.in"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Schema.org Structured Data Type</label>
            <select
              value={seoDraft.schemaOrgType}
              onChange={(e) =>
                setSeoDraft((prev) => ({
                  ...prev,
                  schemaOrgType: e.target.value as SeoSettings['schemaOrgType'],
                }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="CollegeOrUniversity">CollegeOrUniversity (Recommended)</option>
              <option value="EducationalOrganization">EducationalOrganization</option>
              <option value="University">University</option>
              <option value="Organization">Organization</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Default Meta Description (120–165 chars recommended — current: {seoDraft.defaultDescription.length} chars)
          </label>
          <textarea
            rows={2}
            value={seoDraft.defaultDescription}
            onChange={(e) => setSeoDraft((prev) => ({ ...prev, defaultDescription: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Global Meta Keywords (Comma-Separated)</label>
          <input
            type="text"
            value={seoDraft.defaultKeywords}
            onChange={(e) => setSeoDraft((prev) => ({ ...prev, defaultKeywords: e.target.value }))}
            className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <ImageUploader
              label="OpenGraph & Twitter Social Share Card Image (16:9)"
              value={seoDraft.ogImageUrl}
              onChange={(url) => setSeoDraft((prev) => ({ ...prev, ogImageUrl: url }))}
              uploadBinary={uploadBinary}
              aspectRatio="16:9"
              maxPhotoMb={settings.maxPhotoUploadMb ?? 2}
              autoCropEnabled={settings.autoCropImages !== false}
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Google Search Console Verification Code</label>
              <input
                type="text"
                value={seoDraft.googleVerificationCode || ''}
                onChange={(e) => setSeoDraft((prev) => ({ ...prev, googleVerificationCode: e.target.value }))}
                placeholder="Paste google-site-verification content token"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Bing Webmaster Verification Code</label>
              <input
                type="text"
                value={seoDraft.bingVerificationCode || ''}
                onChange={(e) => setSeoDraft((prev) => ({ ...prev, bingVerificationCode: e.target.value }))}
                placeholder="Paste msvalidate.01 verification code"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1.5 pt-1 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={seoDraft.enableJsonLd}
                  onChange={(e) => setSeoDraft((prev) => ({ ...prev, enableJsonLd: e.target.checked }))}
                />
                <span>Inject Schema.org JSON-LD Institutional Rich Snippet</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={seoDraft.allowIndexing}
                  onChange={(e) => setSeoDraft((prev) => ({ ...prev, allowIndexing: e.target.checked }))}
                />
                <span>Allow Public Search Engine Indexing (Uncheck only for maintenance/staging)</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">Custom robots.txt Rules (Optional — leave blank for automatic protection)</label>
          <textarea
            rows={3}
            value={seoDraft.robotsTxtCustom || ''}
            onChange={(e) => setSeoDraft((prev) => ({ ...prev, robotsTxtCustom: e.target.value }))}
            placeholder="User-agent: *&#10;Allow: /&#10;Disallow: /admin"
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
      </form>

      {/* Per-Route SEO Overrides */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <form
          onSubmit={handleAddOverride}
          className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
        >
          <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add / Update Route SEO Override
          </h3>
          <div>
            <label className="block text-xs font-semibold mb-1">Route Path Pattern *</label>
            <input
              type="text"
              required
              value={ovPattern}
              onChange={(e) => setOvPattern(e.target.value)}
              placeholder="/placements or /department/computer-science"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Custom Page Title *</label>
            <input
              type="text"
              required
              value={ovTitle}
              onChange={(e) => setOvTitle(e.target.value)}
              placeholder="CSE Department | Top Autonomous Programs"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Meta Description</label>
            <textarea
              rows={2}
              value={ovDesc}
              onChange={(e) => setOvDesc(e.target.value)}
              placeholder="Specific summary snippet for search engines..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Route Keywords</label>
            <input
              type="text"
              value={ovKeywords}
              onChange={(e) => setOvKeywords(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={ovNoIndex} onChange={(e) => setOvNoIndex(e.target.checked)} />
            <span>Set robots &ldquo;noindex, nofollow&rdquo; on this route</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Save Route SEO Override
          </button>
        </form>

        <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              Active Route SEO Overrides ({(seoDraft.pageOverrides || []).length})
            </h3>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-slate-800">
            {(seoDraft.pageOverrides || []).length === 0 && (
              <p className="p-5 text-xs text-stone-500">No route overrides added yet.</p>
            )}
            {(seoDraft.pageOverrides || []).map((ov) => (
              <div key={ov.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">
                    {ov.routePattern} {ov.noIndex ? '· [noindex]' : ''}
                  </p>
                  <p className="text-sm font-semibold text-stone-900 dark:text-white mt-0.5 truncate">
                    {ov.title}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {ov.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteOverride(ov.id)}
                  className="p-1.5 rounded border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                  title="Remove Override"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
