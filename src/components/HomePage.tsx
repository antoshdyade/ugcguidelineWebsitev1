import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { formatBytes } from '../lib/cmsLogic';
import { useThemeAccessibility } from '../context/ThemeAccessibilityContext';
import type {
  CampusEvent,
  CmsCategory,
  CmsDocument,
  Department,
  HeroSlide,
  LeadershipProfile,
  SiteSettings,
  TickerItem,
} from '../types/cms';

interface HomePageProps {
  settings: SiteSettings;
  sliders: HeroSlide[];
  ticker: TickerItem[];
  categories: CmsCategory[];
  departments: Department[];
  events: CampusEvent[];
  documents: CmsDocument[];
  leadership: LeadershipProfile[];
  onNavigate: (path: string) => void;
}

export function HomePage({
  settings,
  sliders,
  ticker,
  categories,
  departments,
  events,
  documents,
  leadership,
  onNavigate,
}: HomePageProps) {
  const { t } = useThemeAccessibility();
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (sliders.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % sliders.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [sliders.length]);

  const activeSlide = sliders[slideIdx % Math.max(1, sliders.length)];
  const principal = leadership.find((l) => l.roleTitle.toLowerCase().includes('principal')) || leadership[0];

  const categoryLandingMap: Record<string, string> = {
    'about-hei': '/page/about-overview',
    administration: '/page/statutory-officers',
    academics: '/page/academic-programs',
    'admissions-fee': '/page/prospectus-fee-structure',
    research: '/page/research-development-cell',
    'student-life': '/page/placement-cell',
    alumni: '/page/alumni-association',
    'information-corner': '/page/rti-disclosure',
  };

  return (
    <div className="space-y-12 pb-8">
      {/* Scrolling Announcement Ticker */}
      {ticker.length > 0 && (
        <div className="border-b border-stone-200 dark:border-slate-800 bg-amber-50/90 dark:bg-slate-900 overflow-hidden">
          <div className="max-w-[1380px] mx-auto px-4 flex items-center">
            <div
              className="py-2 pr-4 text-xs font-semibold uppercase tracking-wider shrink-0 border-r border-amber-200 dark:border-slate-700"
              style={{ color: 'var(--secondary-color)' }}
            >
              {t('latestUpdates')}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden py-2 pl-4 relative">
              <div className="ticker-track gap-10">
                {[...ticker, ...ticker].map((item, idx) => (
                  <button
                    key={`${item.id}-${idx}`}
                    type="button"
                    onClick={() => onNavigate(item.linkUrl)}
                    className="inline-flex items-center gap-2 text-sm text-stone-800 dark:text-slate-200 hover:underline whitespace-nowrap"
                  >
                    <span className="font-semibold" style={{ color: 'var(--secondary-color)' }}>
                      {item.badgeText || 'Notice'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Image Slider */}
      {activeSlide && (
        <section aria-label="Featured Campus Highlights" className="max-w-[1380px] mx-auto px-4 pt-2">
          <div className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-slate-900 min-h-[380px] lg:min-h-[470px] flex items-end">
            <img
              src={activeSlide.imageUrl}
              alt={activeSlide.title}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/15" />

            <div className="relative z-10 p-6 pb-8 sm:p-10 lg:p-12 max-w-3xl text-white">
              <p className="text-xs font-medium uppercase tracking-widest text-amber-300 mb-2">
                {settings.shortCode} · UGC NEP 2020 Self-Disclosure Portal
              </p>
              <h2 className="font-display text-2xl sm:text-4xl lg:text-[42px] font-bold leading-tight mb-3 text-balance">
                {activeSlide.title}
              </h2>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-6 max-w-2xl">
                {activeSlide.caption}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate(activeSlide.ctaLink)}
                  className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap transition-colors"
                  style={{ backgroundColor: 'var(--secondary-color)' }}
                >
                  <span>{activeSlide.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/quick-links')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-xs whitespace-nowrap transition-colors"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Document Repository</span>
                </button>
              </div>
            </div>

            {sliders.length > 1 && (
              <div className="absolute top-4 right-4 sm:top-auto sm:bottom-5 sm:right-5 z-10 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous slide"
                  onClick={() => setSlideIdx((prev) => (prev - 1 + sliders.length) % sliders.length)}
                  className="p-2 rounded-lg bg-slate-950/70 hover:bg-slate-950 text-white border border-white/20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/90 font-mono-tabular px-2">
                  {slideIdx + 1} / {sliders.length}
                </span>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={() => setSlideIdx((prev) => (prev + 1) % sliders.length)}
                  className="p-2 rounded-lg bg-slate-950/70 hover:bg-slate-950 text-white border border-white/20"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Accreditation & Highlights Bar */}
      <section aria-label="Institutional Accreditations" className="max-w-[1380px] mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 dark:divide-slate-800 border border-stone-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
          {settings.accreditationHighlights.map((item, idx) => (
            <div key={idx} className="px-5 py-4 text-center">
              <p className="text-xs uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-1">
                Recognition {String(idx + 1).padStart(2, '0')}
              </p>
              <p className="text-sm font-semibold text-stone-900 dark:text-white">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principal's Desk & Mandatory Self-Disclosure Spotlight */}
      <section className="max-w-[1380px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {principal && (
          <article className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
            <img
              src={principal.photoUrl}
              alt={principal.name}
              referrerPolicy="no-referrer"
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl object-cover border border-stone-200 dark:border-slate-700 shrink-0"
            />
            <div className="space-y-3">
              <div className="text-xs text-stone-500 dark:text-slate-400">
                <span>Administration Desk</span>
                <span aria-hidden="true"> · </span>
                <span>{principal.roleTitle}</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
                {principal.name}
              </h2>
              <p className="text-xs font-medium text-stone-600 dark:text-slate-300">
                {principal.qualification}
              </p>
              <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                &ldquo;Guided by NEP 2020 and UGC Public Self-Disclosure norms, SVCOER maintains open, login-free access to every academic, financial, governance, and placement record for students, parents, and regulators.&rdquo;
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-4 text-sm">
                <button
                  type="button"
                  onClick={() => onNavigate('/page/statutory-officers')}
                  className="font-semibold hover:underline inline-flex items-center gap-1"
                  style={{ color: 'var(--primary-color)' }}
                >
                  <span>View All Statutory Officers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/page/about-overview')}
                  className="text-stone-600 dark:text-slate-300 hover:underline"
                >
                  Institutional Overview
                </button>
              </div>
            </div>
          </article>
        )}

        {/* Official UGC NEP 2020 Compliance Card */}
        <aside className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--secondary-color)' }}>
              NEP 2020 Mandate
            </p>
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white mb-2">
              {t('ugcDisclosure')}
            </h2>
            <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed mb-5">
              Unrestricted public access to Sections 5(a)–5(j) disclosures including Act &amp; Statutes, FRA Fee Structure, Audited Accounts, Faculty Directory, RTI, and SGRC without login barriers.
            </p>
          </div>
          <div className="space-y-2.5 pt-4 border-t border-stone-200 dark:border-slate-800">
            <a
              href="/assets/aistudio/7822003_GUIDELINES-ON-PUBLIC-SELF-DISCLOSURE-BY-HIGHER-EDUCATION-INSTITUTIONS_1ee4b0ce.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <span>Read Official UGC Disclosure Guidelines (PDF)</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
            <button
              type="button"
              onClick={() => onNavigate('/quick-links')}
              className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium border border-stone-300 dark:border-slate-700 text-stone-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800"
            >
              <span>Browse All Downloadable Statutory PDFs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      </section>

      {/* Academic Departments Microsites Showcase */}
      <section className="max-w-[1380px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-3 border-b border-stone-200 dark:border-slate-800">
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
              UGC Section 5(c) · Dedicated Departmental Portals
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white mt-1">
              {t('exploreDepts')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/page/academic-programs')}
            className="text-sm font-semibold hover:underline inline-flex items-center gap-1"
            style={{ color: 'var(--primary-color)' }}
          >
            <span>All Academic Programs &amp; Intake</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {departments.map((dept) => (
            <article
              key={dept.id}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="h-40 bg-stone-200 dark:bg-slate-800 relative overflow-hidden">
                  <img
                    src={dept.heroImageUrl}
                    alt={`${dept.name} laboratory`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <div className="text-xs text-stone-500 dark:text-slate-400 tabular-nums mb-1.5">
                    <span>{dept.code}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Est. {dept.establishedYear}</span>
                    <span aria-hidden="true"> · </span>
                    <span>Intake {dept.intakeCapacity}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white mb-2">
                    {dept.name}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                    {dept.overview}
                  </p>
                </div>
              </div>
              <div className="px-5 py-3.5 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-slate-400 truncate max-w-[150px]">
                  {dept.hodName}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(`/department/${dept.slug}`)}
                  className="text-xs font-semibold inline-flex items-center gap-1 hover:underline shrink-0"
                  style={{ color: 'var(--secondary-color)' }}
                >
                  <span>Open Microsite</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* UGC 8-Module Disclosure Directory */}
      <section className="max-w-[1380px] mx-auto px-4">
        <div className="mb-6 pb-3 border-b border-stone-200 dark:border-slate-800">
          <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
            NEP 2020 Compliance Architecture
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white mt-1">
            Statutory Self-Disclosure Categories
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onNavigate(categoryLandingMap[cat.slug] || '/page/about-overview')}
              className="text-left p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-stone-400 dark:hover:border-slate-600 transition-colors group"
            >
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400 mb-1.5">
                <span className="font-mono-tabular font-medium">{cat.ugcCode}</span>
                <GraduationCap className="w-4 h-4 opacity-50 group-hover:opacity-100" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white mb-1.5 group-hover:underline">
                {cat.name}
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                {cat.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Events, Circulars & Quick Downloads Split */}
      <section className="max-w-[1380px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              Recent Events, Circulars &amp; Achievements
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('/page/circulars-notices')}
              className="text-xs font-semibold hover:underline"
              style={{ color: 'var(--primary-color)' }}
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-slate-800">
            {events.slice(0, 5).map((ev) => (
              <div key={ev.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="text-xs text-stone-500 dark:text-slate-400 tabular-nums mb-1">
                  <span className="font-semibold" style={{ color: 'var(--secondary-color)' }}>
                    {ev.category}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>{ev.eventDate}</span>
                </div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-white mb-1">
                  {ev.title}
                </h3>
                <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                  {ev.summary}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              Quick Links &amp; Downloads
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('/quick-links')}
              className="text-xs font-semibold hover:underline"
              style={{ color: 'var(--primary-color)' }}
            >
              Full Repository
            </button>
          </div>
          <ul className="divide-y divide-stone-100 dark:divide-slate-800">
            {documents.slice(0, 6).map((doc) => (
              <li key={doc.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                    {doc.title}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-slate-400 tabular-nums mt-0.5">
                    {doc.category} · {formatBytes(doc.fileSizeBytes)} · {doc.uploadedAt}
                  </p>
                </div>
                <a
                  href={doc.fileUrl}
                  download={doc.fileName}
                  aria-label={`Download ${doc.title}`}
                  className="p-2 rounded-lg border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-200 shrink-0"
                >
                  <Download className="w-4 h-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
