import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  Pause,
  Play,
  ShieldCheck,
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
  const [tickerPaused, setTickerPaused] = useState(false);
  const [activeTickerIdx, setActiveTickerIdx] = useState(0);

  useEffect(() => {
    if (sliders.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % sliders.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [sliders.length]);

  useEffect(() => {
    if (ticker.length <= 1 || tickerPaused) return;
    const timer = setInterval(() => {
      setActiveTickerIdx((prev) => (prev + 1) % ticker.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [ticker.length, tickerPaused]);

  const activeSlide = sliders[slideIdx % Math.max(1, sliders.length)];
  const activeTicker = ticker[activeTickerIdx % Math.max(1, ticker.length)];

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

  const highlightsStats = settings.highlightsStats || [
    { label: 'Placement Rate', value: '91.1%' },
    { label: 'Highest Package', value: '18.5 LPA' },
    { label: 'NAAC Grade', value: 'A+ (3.42)' },
    { label: 'NBA Accredited', value: '4 Depts' },
    { label: 'Global Alumni', value: '11,500+' },
  ];

  const approvedBodies = settings.approvedBodies || [
    { name: 'AICTE New Delhi', url: '/page/recognition-approvals' },
    { name: 'UGC 2(f) & 12(B)', url: '/page/recognition-approvals' },
    { name: 'NAAC A+ Accredited', url: '/page/accreditation-ranking' },
    { name: 'PAHSUS Solapur', url: '/page/affiliating-university' },
    { name: 'DTE Maharashtra', url: '/page/admission-process' },
  ];

  const missionItems = settings.missionItems || [
    'Deliver outcome-based engineering education with multidisciplinary minors and barrier-free access.',
    'Foster funded R&D, industrial consultancy, and entrepreneurship incubation.',
    'Maintain 100% institutional governance transparency aligned with UGC Public Self-Disclosure norms.',
  ];

  const recruiters = settings.recruiters || ['TCS', 'Infosys', 'Persistent Systems', 'Bosch India', 'Tata Technologies', 'Bharat Forge'];

  return (
    <div className="space-y-12 pb-10">
      {/* News Ticker Bar with Prev / Play-Pause / Next Controls (ftccoe-inspired) */}
      {ticker.length > 0 && (
        <div className="border-b border-stone-200 dark:border-slate-800 bg-amber-50/95 dark:bg-slate-900">
          <div className="max-w-[1380px] mx-auto px-4 flex items-center justify-between gap-2">
            <div className="flex items-center flex-1 min-w-0">
              <div
                className="py-2 px-3 text-xs font-bold uppercase tracking-wider text-white shrink-0"
                style={{ backgroundColor: 'var(--secondary-color)' }}
              >
                {t('latestUpdates')}
              </div>

              {tickerPaused && activeTicker ? (
                <button
                  type="button"
                  onClick={() => onNavigate(activeTicker.linkUrl)}
                  className="flex-1 min-w-0 text-left px-4 py-2 text-sm text-stone-800 dark:text-slate-100 hover:underline truncate"
                >
                  <span className="font-semibold mr-2" style={{ color: 'var(--secondary-color)' }}>
                    [{activeTicker.badgeText || 'Notice'}]
                  </span>
                  {activeTicker.text}
                </button>
              ) : (
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
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 py-1">
              <button
                type="button"
                aria-label="Previous announcement"
                onClick={() => {
                  setTickerPaused(true);
                  setActiveTickerIdx((prev) => (prev - 1 + ticker.length) % ticker.length);
                }}
                className="p-1.5 rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label={tickerPaused ? 'Resume news ticker' : 'Pause news ticker'}
                onClick={() => setTickerPaused((p) => !p)}
                className="p-1.5 rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100"
              >
                {tickerPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                aria-label="Next announcement"
                onClick={() => {
                  setTickerPaused(true);
                  setActiveTickerIdx((prev) => (prev + 1) % ticker.length);
                }}
                className="p-1.5 rounded bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Image Slider */}
      {activeSlide && (
        <section aria-label="Featured Campus Highlights" className="max-w-[1380px] mx-auto px-4 pt-1">
          <div className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-slate-900 min-h-[380px] lg:min-h-[460px] flex items-end">
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

      {/* Institutional Highlights & Key Metrics Bar (ftccoe-style stats + recognitions) */}
      <section aria-label="Institutional Highlights" className="max-w-[1380px] mx-auto px-4 space-y-4">
        <div
          className="rounded-xl text-white grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/15 shadow-sm overflow-hidden"
          style={{ backgroundColor: 'var(--primary-color)' }}
        >
          {highlightsStats.map((stat, idx) => (
            <div key={idx} className="px-5 py-5 text-center">
              <p className="font-display text-2xl sm:text-3xl font-bold text-amber-300 tabular-nums">
                {stat.value}
              </p>
              <p className="text-xs uppercase tracking-wider text-white/85 mt-1 font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 dark:divide-slate-800 border border-stone-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
          {settings.accreditationHighlights.map((item, idx) => (
            <div key={idx} className="px-4 py-3 text-center">
              <p className="text-[11px] uppercase tracking-wider text-stone-500 dark:text-slate-400">
                Recognition {String(idx + 1).padStart(2, '0')}
              </p>
              <p className="text-xs sm:text-sm font-semibold text-stone-900 dark:text-white mt-0.5">
                {item}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* About Us + Statutory Downloads Split (ftccoe.ac.in signature layout) */}
      <section className="max-w-[1380px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <article className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
          <img
            src={settings.aboutImageUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg'}
            alt={`${settings.shortCode} campus`}
            referrerPolicy="no-referrer"
            className="w-full sm:w-52 h-48 sm:h-full max-h-64 rounded-xl object-cover border border-stone-200 dark:border-slate-700 shrink-0"
          />
          <div className="flex-1 flex flex-col justify-between h-full space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--secondary-color)' }}>
                About Our Campus
              </p>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white pb-2 border-b-2 inline-block mb-3" style={{ borderColor: 'var(--primary-color)' }}>
                ABOUT US
              </h2>
              <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                {settings.aboutSummary ||
                  'Established in 1998, our Autonomous Engineering Campus delivers NAAC A+ accredited technical education, industry-partnered laboratories, and 100% transparent UGC NEP 2020 public disclosures.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/page/about-overview')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                <span>Know More</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="/assets/aistudio/7822003_GUIDELINES-ON-PUBLIC-SELF-DISCLOSURE-BY-HIGHER-EDUCATION-INSTITUTIONS_1ee4b0ce.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-slate-700 text-stone-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800"
              >
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>UGC Disclosure Guidelines (PDF)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </article>

        {/* Statutory Downloads Panel */}
        <aside className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-200 dark:border-slate-800">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>
                  Open Public Access
                </p>
                <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                  DOWNLOADS
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/quick-links')}
                className="px-3 py-1.5 rounded text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                View All
              </button>
            </div>

            <ul className="space-y-2.5">
              {documents.slice(0, 5).map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/70 dark:bg-slate-800/60 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
                      {doc.category} · {formatBytes(doc.fileSizeBytes)}
                    </p>
                  </div>
                  <a
                    href={doc.fileUrl}
                    download={doc.fileName}
                    aria-label={`Download ${doc.title}`}
                    className="p-2 rounded-lg text-white shrink-0 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* Approved & Affiliated By + Vision & Mission Split (ftccoe-style + UGC Compliance) */}
      <section className="max-w-[1380px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--secondary-color)' }}>
              Statutory Recognitions
            </p>
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white mb-4">
              APPROVED &amp; AFFILIATED BY
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {approvedBodies.map((body, idx) => (
                <button
                  key={`${body.name}-${idx}`}
                  type="button"
                  onClick={() => onNavigate(body.url)}
                  className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/70 hover:border-amber-600 text-left transition-colors group"
                >
                  <Award className="w-5 h-5 mb-1.5 text-amber-600" />
                  <p className="text-sm font-bold text-stone-900 dark:text-white group-hover:underline">
                    {body.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-stone-500 dark:text-slate-400 border-t border-stone-200 dark:border-slate-800 pt-3">
            All statutory approvals (UGC 2(f)/12(B), AICTE EoA, NAAC SSR, FRA Fee &amp; University Affiliation) are accessible without login.
          </p>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--secondary-color)' }}>
              Institutional Charter · NEP 2020
            </p>
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
              VISION &amp; MISSION
            </h2>
          </div>

          <div className="rounded-lg p-4 border-l-4 bg-stone-50 dark:bg-slate-800/70" style={{ borderColor: 'var(--secondary-color)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-1">
              Our Vision
            </h3>
            <p className="text-sm sm:text-base font-medium text-stone-900 dark:text-slate-100 leading-relaxed">
              {settings.visionText}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-2.5">
              Our Mission
            </h3>
            <ul className="space-y-2.5">
              {missionItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-stone-700 dark:text-slate-300">
                  <span
                    className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Our Desk — Leadership Showcase (ftccoe-style multi-card desk) */}
      {leadership.length > 0 && (
        <section className="max-w-[1380px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-3 border-b border-stone-200 dark:border-slate-800">
            <div>
              <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
                UGC Section 5(b) · Governance &amp; Statutory Officers
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white mt-1">
                OUR DESK &amp; LEADERSHIP
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/page/statutory-officers')}
              className="text-sm font-semibold hover:underline inline-flex items-center gap-1"
              style={{ color: 'var(--primary-color)' }}
            >
              <span>All Statutory Officers &amp; Committees</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {leadership.slice(0, 4).map((leader) => (
              <article
                key={leader.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="p-5 pb-4 flex items-center gap-4 border-b border-stone-100 dark:border-slate-800">
                    <img
                      src={leader.photoUrl}
                      alt={leader.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: 'var(--secondary-color)' }}>
                        {leader.roleTitle}
                      </p>
                      <h3 className="font-display text-base font-bold text-stone-900 dark:text-white truncate">
                        {leader.name}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-slate-400 truncate">
                        {leader.qualification}
                      </p>
                    </div>
                  </div>
                  <p className="p-4 text-xs text-stone-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                    {leader.bio}
                  </p>
                </div>
                <div className="px-4 py-2.5 bg-stone-50 dark:bg-slate-800/60 border-t border-stone-100 dark:border-slate-800 flex items-center gap-2 text-xs text-stone-600 dark:text-slate-300 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                  <span className="truncate">{leader.email}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Academic Departments Microsites Showcase */}
      <section className="max-w-[1380px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-3 border-b border-stone-200 dark:border-slate-800">
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
              UGC Section 5(c) · Dedicated Departmental Microsites
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

      {/* Campus Activities, Achievements & Top Recruiters Strip */}
      <section className="max-w-[1380px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
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
              <div key={ev.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-4">
                {ev.imageUrl && (
                  <img
                    src={ev.imageUrl}
                    alt={ev.title}
                    className="w-20 h-16 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                  />
                )}
                <div className="min-w-0">
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
              </div>
            ))}
          </div>
        </div>

        {/* Top Recruiters & Placement Snapshot (ftccoe-style) */}
        <aside className="lg:col-span-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-200 dark:border-slate-800">
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                Top Recruiters
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('/page/placement-cell')}
                className="text-xs font-semibold hover:underline"
                style={{ color: 'var(--primary-color)' }}
              >
                T&amp;P Cell
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {recruiters.map((company, idx) => (
                <div
                  key={`${company}-${idx}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/70 text-xs font-semibold text-stone-800 dark:text-slate-200"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">{company}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/gallery')}
            className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold text-white text-center transition-colors"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Explore Campus Picture Gallery →
          </button>
        </aside>
      </section>
    </div>
  );
}
