import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Layers,
  Mail,
  Phone,
  Pin,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import type { PlacementCustomSection, PlacementsData, SiteSettings } from '../types/cms';
import {
  computePlacementMetrics,
  DEFAULT_GRIEVANCE_PORTAL_CONFIG,
  filterCongratulationsStories,
  filterPlacementNotices,
  GRIEVANCE_CATEGORY_PRESETS,
  GRIEVANCE_ROLE_PRESETS,
  isEntityShareable,
  isRecordPublished,
} from '../lib/collegeFeaturesLogic';
import { sortByOrder } from '../lib/cmsLogic';
import { getUploadSizeLimitBytes, getUploadSizeLimitMb } from '../lib/imageCrop';
import { CaptchaWidget } from './CaptchaWidget';
import { CmsHtmlContent } from './CmsHtmlContent';
import { CustomSelectInput } from './CustomSelectInput';
import { SocialShareBar } from './SocialMediaWidgets';

interface PlacementsPortalProps {
  placements: PlacementsData;
  settings: SiteSettings;
}

export function PlacementsPortal({ placements, settings }: PlacementsPortalProps) {
  const publishedStats = useMemo(
    () => (placements.stats || []).filter((s) => isRecordPublished(s)),
    [placements.stats],
  );
  const years = useMemo(
    () => Array.from(new Set(publishedStats.map((s) => s.academicYear))),
    [publishedStats],
  );
  const [selectedYear, setSelectedYear] = useState<string>(years[0] || 'All');

  // Notices & Information Desk Filter
  const [noticeCat, setNoticeCat] = useState<string>('All');
  const [noticeQuery, setNoticeQuery] = useState<string>('');

  // Congratulations Desk Filter
  const [congratsType, setCongratsType] = useState<string>('All');
  const [congratsQuery, setCongratsQuery] = useState<string>('');

  const visibleStats = useMemo(() => {
    const ordered = sortByOrder(publishedStats);
    return selectedYear === 'All' ? ordered : ordered.filter((s) => s.academicYear === selectedYear);
  }, [publishedStats, selectedYear]);

  const metrics = useMemo(() => computePlacementMetrics(visibleStats), [visibleStats]);
  const upcomingDrives = useMemo(
    () => sortByOrder(placements.upcomingDrives || []),
    [placements.upcomingDrives],
  );

  const allNotices = useMemo(
    () => (placements.notices || []).filter((n) => isRecordPublished(n)),
    [placements.notices],
  );
  const noticeCategories = useMemo(
    () => ['All', ...Array.from(new Set(allNotices.map((n) => n.category).filter(Boolean)))],
    [allNotices],
  );
  const visibleNotices = useMemo(
    () => filterPlacementNotices(allNotices, noticeCat, noticeQuery),
    [allNotices, noticeCat, noticeQuery],
  );

  const allStories = useMemo(
    () => (placements.stories || []).filter((s) => isRecordPublished(s)),
    [placements.stories],
  );
  const congratsTypes = useMemo(
    () => [
      'All',
      ...Array.from(new Set(allStories.map((s) => s.entryType || 'Campus Placement').filter(Boolean))),
    ],
    [allStories],
  );
  const visibleStories = useMemo(
    () => filterCongratulationsStories(allStories, congratsType, congratsQuery),
    [allStories, congratsType, congratsQuery],
  );

  const customSections = useMemo(
    () =>
      sortByOrder(
        (placements.customSections || []).filter((sec) => sec.isPublished !== false && isRecordPublished(sec)),
      ) as PlacementCustomSection[],
    [placements.customSections],
  );

  const recruiters = settings.recruiters || [];

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-8">
      {/* Editorial Hero Banner */}
      <header
        className="rounded-2xl p-6 sm:p-9 text-white border border-white/10"
        style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #163A64 100%)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
              Career Development · Corporate Relations · Campus Hiring
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
              Training &amp; Placement (T&amp;P) Portal
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-3xl leading-relaxed">
              {placements.summaryNote}
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              {placements.brochureUrl && (
                <a
                  href={placements.brochureUrl}
                  target={placements.brochureUrl.startsWith('http') ? '_blank' : undefined}
                  rel={placements.brochureUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>{placements.brochureLabel || 'Download Placement Brochure'}</span>
                </a>
              )}
              <a
                href="#tp-notices"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/25 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-amber-300" />
                <span>Student Notices ({allNotices.length})</span>
              </a>
              <a
                href="#congratulations-desk"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/25 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Congratulations Desk ({allStories.length})</span>
              </a>
            </div>
          </div>

          {/* T&P Office Contact Strip */}
          <aside className="lg:col-span-4 rounded-xl bg-white/10 border border-white/15 p-5 space-y-2 text-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Training &amp; Placement Office
            </p>
            <p className="text-base font-bold text-white">{placements.coordinatorName}</p>
            <p className="text-slate-200">Training &amp; Placement Officer (TPO)</p>
            <div className="pt-2 border-t border-white/15 space-y-1.5 text-slate-100">
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">{placements.coordinatorEmail}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="tabular-nums">{placements.coordinatorPhone}</span>
              </p>
            </div>
          </aside>
        </div>
      </header>

      {/* Architectural KPI Strip (Tabular Numerals) */}
      <section aria-label="Placement Key Metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Placement Conversion ({selectedYear})
          </p>
          <p className="font-display text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {metrics.overallRate}%
          </p>
          <p className="text-xs text-stone-500 mt-1 tabular-nums">
            {metrics.placed} placed of {metrics.eligible} eligible
          </p>
        </div>
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Highest Package Offered
          </p>
          <p className="font-display text-3xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
            ₹{metrics.highest} LPA
          </p>
          <p className="text-xs text-stone-500 mt-1">Product &amp; Core Tech Offers</p>
        </div>
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Mean Annual Package
          </p>
          <p className="font-display text-3xl font-bold text-stone-900 dark:text-white mt-1 tabular-nums">
            ₹{metrics.avg} LPA
          </p>
          <p className="text-xs text-stone-500 mt-1">Across Engineering Programs</p>
        </div>
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Active Hiring Partners
          </p>
          <p className="font-display text-3xl font-bold text-stone-900 dark:text-white mt-1 tabular-nums">
            {recruiters.length > 0 ? `${recruiters.length}+` : '250+'}
          </p>
          <p className="text-xs text-stone-500 mt-1">MNC &amp; Core Industry Drives</p>
        </div>
      </section>

      {/* Student Notices & T&P Information Board */}
      <section
        id="tp-notices"
        className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
              Official Circulars &amp; Drive Alerts
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 dark:text-white flex items-center gap-2 mt-0.5">
              <Bell className="w-5 h-5 text-amber-600" />
              Student Notices &amp; T&amp;P Information Desk
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={noticeQuery}
                onChange={(e) => setNoticeQuery(e.target.value)}
                placeholder="Search notices & schedules..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {noticeCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNoticeCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    noticeCat === cat
                      ? 'text-white border-transparent'
                      : 'bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300'
                  }`}
                  style={noticeCat === cat ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleNotices.length === 0 ? (
          <p className="text-sm text-stone-500 py-4">No placement notices match your current filter.</p>
        ) : (
          <div className="divide-y divide-stone-200 dark:divide-slate-800">
            {visibleNotices.map((notice) => (
              <article
                key={notice.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400">
                    <span className="font-mono font-semibold text-stone-800 dark:text-slate-200 tabular-nums">
                      {notice.noticeDate}
                    </span>
                    <span>·</span>
                    <span className="font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-400">
                      {notice.category}
                    </span>
                    {notice.isPinned && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                          <Pin className="w-3 h-3" /> Priority Notice
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white leading-snug">
                    {notice.title}
                  </h3>
                  {notice.summary && (
                    <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                      {notice.summary}
                    </p>
                  )}
                </div>
                  <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
                    {notice.attachmentUrl && (
                      <a
                        href={notice.attachmentUrl}
                        target={notice.attachmentUrl.startsWith('http') ? '_blank' : undefined}
                        rel={notice.attachmentUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-900 dark:text-white"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>{notice.linkLabel || 'Open Circular'}</span>
                      </a>
                    )}
                    <SocialShareBar
                      compact
                      isShareable={isEntityShareable(notice)}
                      title={notice.title}
                      summary={notice.summary}
                      settings={settings}
                      location="portal"
                      className="!mt-0 !pt-2"
                    />
                  </div>
                </article>
            ))}
          </div>
        )}
      </section>

      {/* Congratulations Desk (Placed Students & Achievement Winners with Photos) */}
      <section
        id="congratulations-desk"
        className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 dark:border-slate-800 pb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
              Roll of Honour · Placements &amp; Student Achievements
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900 dark:text-white flex items-center gap-2 mt-0.5">
              <Award className="w-5 h-5 text-emerald-600" />
              Congratulations Desk
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={congratsQuery}
                onChange={(e) => setCongratsQuery(e.target.value)}
                placeholder="Search student or company..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {congratsTypes.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setCongratsType(tp)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    congratsType === tp
                      ? 'text-white border-transparent'
                      : 'bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300'
                  }`}
                  style={congratsType === tp ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  {tp}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleStories.length === 0 ? (
          <p className="text-sm text-stone-500 py-4">No student congratulatory entries match this filter.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleStories.map((st) => (
              <article
                key={st.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3.5">
                    <img
                      src={st.photoUrl}
                      alt={st.studentName}
                      className="w-20 h-20 rounded-xl object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        {st.entryType || 'Campus Placement'}
                      </p>
                      <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white leading-snug">
                        {st.studentName}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-slate-300">
                        {st.branch} · Batch {st.batchYear}
                      </p>
                    </div>
                  </div>

                  {st.headline && (
                    <p className="text-xs font-bold text-stone-800 dark:text-slate-100">
                      {st.headline}
                    </p>
                  )}

                  <div className="pt-2.5 border-t border-stone-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 dark:text-white truncate">{st.company}</p>
                      {st.roleOrAward && (
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate">
                          {st.roleOrAward}
                        </p>
                      )}
                    </div>
                    {st.packageLpa && (
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums shrink-0">
                        {st.packageLpa}
                      </span>
                    )}
                  </div>

                  {st.quote && (
                    <blockquote className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed italic">
                      &ldquo;{st.quote}&rdquo;
                    </blockquote>
                  )}
                </div>
                <SocialShareBar
                  compact
                  isShareable={isEntityShareable(st)}
                  title={`${st.studentName} — ${st.company}`}
                  summary={st.headline || st.quote}
                  settings={settings}
                  location="portal"
                />
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming & Active Campus Recruitment Drives */}
      {upcomingDrives.length > 0 && (
        <section className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="border-b border-stone-200 dark:border-slate-800 pb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
              Recruitment Calendar
            </p>
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2 mt-0.5">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Upcoming &amp; Active Campus Placement Drives
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingDrives.map((drive) => (
              <article
                key={drive.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 flex flex-col justify-between space-y-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {drive.status === 'open' || drive.status === 'ongoing'
                        ? 'Registrations Open'
                        : drive.status === 'completed'
                          ? 'Drive Completed'
                          : 'Scheduled Drive'}
                    </span>
                    <span className="font-mono font-semibold text-stone-500 tabular-nums">
                      {drive.driveDate}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">{drive.company}</h3>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    {drive.roleTitle} · <span className="tabular-nums">{drive.packageLpa}</span>
                  </p>
                  <p className="text-stone-600 dark:text-slate-300">
                    <strong>Eligible:</strong> {drive.eligibleBranches}
                  </p>
                </div>
                {drive.applyUrl && (
                  <a
                    href={drive.applyUrl}
                    target={drive.applyUrl.startsWith('http') ? '_blank' : undefined}
                    rel={drive.applyUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white font-semibold"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <span>Drive Portal / Registration</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Year Filter & Formatted Branch-Wise Placement Statistics */}
      <section className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
              Verified Department Record
            </p>
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2 mt-0.5">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              Branch-Wise Placement Statistics
            </h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...years].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedYear === yr
                    ? 'text-white border-transparent'
                    : 'bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700'
                }`}
                style={selectedYear === yr ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="cms-table cms-table-navy w-full text-xs">
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Engineering Branch</th>
                <th>Eligible</th>
                <th>Placed</th>
                <th>Placement %</th>
                <th>Highest (LPA)</th>
                <th>Average (LPA)</th>
                <th>Major Recruiters</th>
              </tr>
            </thead>
            <tbody>
              {metrics.rowsWithPct.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono font-semibold whitespace-nowrap tabular-nums">{row.academicYear}</td>
                  <td className="font-semibold">{row.branch}</td>
                  <td className="tabular-nums">{row.eligibleStudents}</td>
                  <td className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                    {row.placedStudents}
                  </td>
                  <td className="min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-stone-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${Math.min(100, row.placementRatePct)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold tabular-nums">{row.placementRatePct}%</span>
                    </div>
                  </td>
                  <td className="tabular-nums font-semibold whitespace-nowrap">₹{row.highestPackageLpa} LPA</td>
                  <td className="tabular-nums whitespace-nowrap">₹{row.averagePackageLpa} LPA</td>
                  <td>{row.topRecruitersList}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Admin-Managed Custom Placement Data Sections (Tables, Cards, Brochures, Rich HTML) */}
      {customSections.map((sec) => (
        <section
          key={sec.id}
          className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                {sec.title}
              </h2>
              {sec.subtitle && (
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">{sec.subtitle}</p>
              )}
            </div>
            {sec.ctaUrl && sec.sectionType !== 'brochure' && (
              <a
                href={sec.ctaUrl}
                target={sec.ctaUrl.startsWith('http') ? '_blank' : undefined}
                rel={sec.ctaUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                <span>{sec.ctaLabel || 'Open Resource'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {sec.sectionType === 'table' && (sec.tableHeaders?.length || 0) > 0 && (
            <div className="overflow-x-auto">
              <table className="cms-table cms-table-navy w-full text-xs">
                <thead>
                  <tr>
                    {(sec.tableHeaders || []).map((hdr, hIdx) => (
                      <th key={hIdx}>{hdr}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(sec.tableRows || []).map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className={cIdx === 0 ? 'font-semibold' : 'tabular-nums'}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sec.sectionType === 'cards' && (sec.cards?.length || 0) > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(sec.cards || []).map((card, cIdx) => (
                <article
                  key={cIdx}
                  className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 flex flex-col justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    {card.badge && (
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        {card.badge}
                      </p>
                    )}
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">{card.title}</h3>
                    {card.subtitle && (
                      <p className="font-semibold text-stone-600 dark:text-slate-300">{card.subtitle}</p>
                    )}
                    {card.description && (
                      <p className="text-stone-600 dark:text-slate-300 leading-relaxed pt-1">
                        {card.description}
                      </p>
                    )}
                  </div>
                  {card.linkUrl && (
                    <a
                      href={card.linkUrl}
                      target={card.linkUrl.startsWith('http') ? '_blank' : undefined}
                      rel={card.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400 hover:underline pt-1"
                    >
                      <span>{card.linkLabel || 'View Details'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}

          {sec.sectionType === 'brochure' && (
            <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                {sec.htmlContent && <CmsHtmlContent html={sec.htmlContent} className="text-xs sm:text-sm" />}
              </div>
              {sec.ctaUrl && (
                <a
                  href={sec.ctaUrl}
                  target={sec.ctaUrl.startsWith('http') ? '_blank' : undefined}
                  rel={sec.ctaUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  <Download className="w-4 h-4" />
                  <span>{sec.ctaLabel || 'Download Document'}</span>
                </a>
              )}
            </div>
          )}

          {sec.sectionType === 'html' && sec.htmlContent && (
            <CmsHtmlContent html={sec.htmlContent} />
          )}
        </section>
      ))}

      {/* Esteemed Campus Recruiters Directory */}
      <section className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="border-b border-stone-200 dark:border-slate-800 pb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
            Corporate &amp; Industrial Tie-Ups
          </p>
          <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2 mt-0.5">
            <Building2 className="w-5 h-5 text-amber-600" />
            Esteemed Campus Recruiters
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {recruiters.map((rec, idx) => (
            <div
              key={idx}
              className="px-3 py-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs font-semibold text-stone-800 dark:text-slate-100 text-center"
            >
              {rec}
            </div>
          ))}
        </div>
      </section>

      <SocialShareBar
        title={`${settings.shortCode} Training & Placement Portal — ${metrics.overallRate}% Track`}
        summary={placements.summaryNote}
        settings={settings}
        location="portal"
      />
    </div>
  );
}


export function GrievancePortal({ settings }: { settings: SiteSettings }) {
  const gp = useMemo(
    () => ({
      ...DEFAULT_GRIEVANCE_PORTAL_CONFIG,
      ...(settings.grievancePortal || {}),
      committeeMembers:
        settings.grievancePortal?.committeeMembers && settings.grievancePortal.committeeMembers.length > 0
          ? sortByOrder(settings.grievancePortal.committeeMembers)
          : DEFAULT_GRIEVANCE_PORTAL_CONFIG.committeeMembers,
    }),
    [settings.grievancePortal],
  );

  const maxDocMb = getUploadSizeLimitMb(settings, 'document');
  const maxDocBytes = getUploadSizeLimitBytes(settings, 'document');

  const [complainantName, setComplainantName] = useState('');
  const [complainantRole, setComplainantRole] = useState<string>(GRIEVANCE_ROLE_PRESETS[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentOrCell, setDepartmentOrCell] = useState('General Administration');
  const [category, setCategory] = useState<string>(GRIEVANCE_CATEGORY_PRESETS[0]);
  const [urgency, setUrgency] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaRefresh, setCaptchaRefresh] = useState(0);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string; code?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [summary, setSummary] = useState({ total: 0, submitted: 0, inReview: 0, resolved: 0, closed: 0 });
  const [lookupCode, setLookupCode] = useState('');
  const [lookupErr, setLookupErr] = useState('');
  const [lookupData, setLookupData] = useState<{
    ticketCode: string;
    category: string;
    subject: string;
    departmentOrCell: string;
    urgency?: string;
    isAnonymous?: boolean;
    hasAttachment?: boolean;
    status: string;
    resolutionNote: string;
    submittedAt: string;
    updatedAt: string;
  } | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/public/grievances/summary');
      if (res.ok) {
        const d = await res.json();
        setSummary(d);
      }
    } catch {
      // Ignore transient summary error
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > maxDocBytes) {
      setSubmitResult({ ok: false, msg: `Supporting attachment exceeds Max Upload limit of ${maxDocMb} MB.` });
      return;
    }
    setUploadingEvidence(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/public/grievances/upload-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/pdf',
          base64Data: base64,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evidence upload failed.');
      setAttachmentUrl(data.url);
    } catch (err) {
      setSubmitResult({ ok: false, msg: (err as Error).message });
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/public/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complainantName: isAnonymous && !complainantName.trim() ? 'Confidential Complainant' : complainantName,
          complainantRole,
          email,
          phone,
          departmentOrCell,
          category,
          urgency,
          isAnonymous,
          attachmentUrl,
          subject,
          description,
          captchaId,
          captchaAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register grievance.');
      setSubmitResult({ ok: true, msg: data.message, code: data.ticketCode });
      setLookupCode(data.ticketCode || '');
      setComplainantName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setDescription('');
      setAttachmentUrl('');
      setUrgency('normal');
      setIsAnonymous(false);
      setCaptchaAnswer('');
      setCaptchaRefresh((v) => v + 1);
      fetchSummary();
    } catch (err) {
      setSubmitResult({ ok: false, msg: (err as Error).message });
      setCaptchaRefresh((v) => v + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupErr('');
    setLookupData(null);
    try {
      const res = await fetch(`/api/public/grievances/status?code=${encodeURIComponent(lookupCode.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ticket lookup failed.');
      setLookupData(data);
    } catch (err) {
      setLookupErr((err as Error).message);
    }
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
      {/* Hero Banner */}
      <div
        className="rounded-2xl p-6 sm:p-8 text-white space-y-3"
        style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, var(--primary-color) 100%)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
          AICTE &amp; UGC Statutory Redressal Mechanism (2023 Regulations)
        </p>
        <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight">{gp.heroTitle}</h1>
        <p className="text-sm text-white/90 max-w-3xl leading-relaxed">{gp.heroSubtitle}</p>
        <div className="pt-2 flex flex-wrap gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/20">
            UGC Anti-Ragging Toll-Free: <strong>{settings.antiRaggingHelpline || '1800-180-5522'}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/20">
            Campus 24x7 Squad: <strong>{gp.antiRaggingSquadPhone}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold">
            Initial SLA: {gp.slaAcknowledgementHours} · Final SGRC Disposal: {gp.slaResolutionDays}
          </span>
        </div>
      </div>

      {/* Live Anonymized SGRC Resolution Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Total Tickets Registered</p>
          <p className="font-display text-3xl font-bold text-stone-900 dark:text-white mt-1 tabular-nums">
            {summary.total}
          </p>
          <p className="text-[11px] text-stone-400">Centralized Audit Trail</p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Resolved &amp; Closed</p>
          <p className="font-display text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {Number(summary.resolved || 0) + Number(summary.closed || 0)}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">Verified Action Taken</p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Under SGRC Review</p>
          <p className="font-display text-3xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
            {Number(summary.inReview || 0) + Number(summary.submitted || 0)}
          </p>
          <p className="text-[11px] text-stone-400">Active Committee Queue</p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">National Anti-Ragging Portal</p>
          <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-1">Zero-Tolerance Policy</p>
          <a
            href={gp.ugcAffidavitUrl || 'https://www.antiragging.in/'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold underline mt-1 text-stone-800 dark:text-slate-200"
          >
            Submit Online Undertaking <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Submission Form + Tracking & Ombudsperson Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            Submit Formal Grievance / Helpdesk Request
          </h2>

          {submitResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs ${
                submitResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submitResult.msg}</span>
              </div>
              {submitResult.code && <p className="mt-1 font-mono font-bold">Tracking Code: {submitResult.code}</p>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={complainantName}
                  onChange={(e) => setComplainantName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <CustomSelectInput
                label="Complainant Role"
                required
                value={complainantRole}
                onChange={setComplainantRole}
                options={[...GRIEVANCE_ROLE_PRESETS]}
                customPlaceholder="Enter custom stakeholder role..."
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <CustomSelectInput
                label="Grievance Category"
                required
                value={category}
                onChange={setCategory}
                options={[...GRIEVANCE_CATEGORY_PRESETS]}
                customPlaceholder="Enter custom grievance category..."
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Concerned Department / Cell</label>
                <input
                  type="text"
                  value={departmentOrCell}
                  onChange={(e) => setDepartmentOrCell(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Priority / Urgency Level</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as 'normal' | 'high' | 'urgent')}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="normal">Normal (Standard 15-Day SGRC Track)</option>
                  <option value="high">High Priority (Exam / Scholarship Deadline)</option>
                  <option value="urgent">Urgent (Anti-Ragging / Campus Safety Alert)</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 w-full">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <span>Keep identity confidential during preliminary review</span>
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="sm:col-span-2 p-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-semibold">Supporting Document / Screenshot Evidence (optional)</p>
                  <p className="text-[11px] text-stone-500">PDF, JPG, or PNG · Max {maxDocMb} MB</p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingEvidence ? 'Uploading...' : 'Attach Evidence'}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleEvidenceUpload}
                    className="sr-only"
                  />
                </label>
                {attachmentUrl && (
                  <p className="w-full text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Attached: {attachmentUrl}
                  </p>
                )}
              </div>
            </div>

            <CaptchaWidget
              captchaId={captchaId}
              captchaAnswer={captchaAnswer}
              onCaptchaIdChange={setCaptchaId}
              onCaptchaAnswerChange={setCaptchaAnswer}
              refreshSignal={captchaRefresh}
              label="Grievance Portal Security CAPTCHA"
            />

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {submitting ? 'Registering Ticket...' : 'Submit Grievance Securely'}
            </button>
          </form>
        </section>

        {/* Right Column: Tracker + Ombudsperson + 24x7 Helplines */}
        <aside className="lg:col-span-5 space-y-5">
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" /> Track Grievance Ticket Status
            </h3>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Enter your Ticket Code (for example, <code className="font-mono font-semibold">GRV-2026-0001</code>).
            </p>
            <form onSubmit={handleTrack} className="flex gap-2">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="GRV-2026-0001"
                className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Check
              </button>
            </form>
            {lookupErr && <p className="text-xs text-rose-600 font-medium">{lookupErr}</p>}
            {lookupData && (
              <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono font-bold">{lookupData.ticketCode}</span>
                  <div className="flex items-center gap-1.5">
                    {lookupData.urgency && (
                      <span className="px-2 py-0.5 rounded uppercase text-[10px] font-bold bg-rose-100 text-rose-800">
                        {lookupData.urgency}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded uppercase text-[10px] font-bold bg-amber-100 text-amber-900">
                      {lookupData.status}
                    </span>
                  </div>
                </div>
                <p className="font-semibold text-stone-900 dark:text-white">{lookupData.subject}</p>
                <p className="text-stone-500">{lookupData.category} · {lookupData.departmentOrCell}</p>
                <p className="pt-1 border-t border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200">
                  <strong>Committee Response:</strong> {lookupData.resolutionNote}
                </p>
                <p className="text-[11px] text-stone-400">Updated: {lookupData.updatedAt}</p>
              </div>
            )}
          </div>

          {/* Appointed Institutional Ombudsperson Card */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Institutional Ombudsperson (Appellate Authority)
            </h3>
            <div className="flex items-start gap-3">
              <img
                src={gp.ombudspersonPhotoUrl || '/src/assets/images/leadership_principal_1794512597061.jpg'}
                alt={gp.ombudspersonName}
                className="w-16 h-16 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0 space-y-0.5">
                <p className="font-bold text-sm text-stone-900 dark:text-white">{gp.ombudspersonName}</p>
                <p className="text-stone-600 dark:text-slate-300">{gp.ombudspersonDesignation}</p>
                <p className="flex items-center gap-1.5 text-stone-500 pt-1">
                  <Mail className="w-3.5 h-3.5 text-amber-600" /> {gp.ombudspersonEmail}
                </p>
                <p className="flex items-center gap-1.5 text-stone-500">
                  <Phone className="w-3.5 h-3.5 text-amber-600" /> {gp.ombudspersonPhone}
                </p>
              </div>
            </div>
          </div>

          {/* 24x7 Anti-Ragging & Women Safety ICC Helplines */}
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-5 space-y-2 text-xs">
            <h3 className="font-display text-base font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              24x7 Anti-Ragging Squad &amp; ICC Cell
            </h3>
            <p className="flex items-center gap-2 text-stone-700 dark:text-slate-200">
              <Phone className="w-3.5 h-3.5 text-rose-600" />
              UGC 24x7 Toll-Free: <strong>{settings.antiRaggingHelpline || '1800-180-5522'}</strong>
            </p>
            <p className="flex items-center gap-2 text-stone-700 dark:text-slate-200">
              <Phone className="w-3.5 h-3.5 text-rose-600" />
              Campus Flying Squad: <strong>{gp.antiRaggingSquadPhone}</strong>
            </p>
            <p className="flex items-center gap-2 text-stone-700 dark:text-slate-200">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              ICC Officer ({gp.iccCoordinatorName}): {gp.iccCoordinatorEmail}
            </p>
          </div>
        </aside>
      </div>

      {/* SGRC & Anti-Ragging Committee Photo Cards */}
      {gp.committeeMembers.length > 0 && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Student Grievance Redressal Committee (SGRC) &amp; Anti-Ragging Squad Members
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gp.committeeMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 flex items-start gap-3 text-xs"
              >
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-16 h-16 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                />
                <div className="min-w-0 space-y-0.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-bold uppercase">
                    {member.roleTitle}
                  </span>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white truncate">{member.name}</h3>
                  <p className="text-stone-600 dark:text-slate-300">{member.designation}</p>
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{member.committeeName}</p>
                  {member.email && (
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 pt-0.5 truncate">
                      <Mail className="w-3 h-3 shrink-0" /> {member.email}
                    </p>
                  )}
                  {member.phone && (
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3 shrink-0" /> {member.phone}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Formatted Escalation Matrix & Rich Statutory Charter */}
      {gp.charterHtml && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <h2 className="font-display text-xl font-bold">Statutory Escalation SLA &amp; Redressal Charter</h2>
          </div>
          <CmsHtmlContent html={gp.charterHtml} className="text-stone-700 dark:text-slate-200" />
        </section>
      )}
    </div>
  );
}
