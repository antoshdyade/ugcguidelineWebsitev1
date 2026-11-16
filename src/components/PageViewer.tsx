import React, { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, ExternalLink, Globe2, Mail, MapPin, Phone, Volume2 } from 'lucide-react';
import { formatCommitteeGroupLabel, sortByOrder } from '../lib/cmsLogic';
import { useThemeAccessibility } from '../context/ThemeAccessibilityContext';
import { CmsHtmlContent } from './CmsHtmlContent';
import type { CampusEvent, CmsCategory, CmsPage, Conference, ConferenceSlide, LeadershipProfile } from '../types/cms';

interface PageViewerProps {
  slug?: string;
  categorySlug?: string;
  categories: CmsCategory[];
  pages: CmsPage[];
  leadership: LeadershipProfile[];
  events: CampusEvent[];
  conferences?: Conference[];
  researchSliderSlides?: ConferenceSlide[];
  onNavigate: (path: string) => void;
}

export function PageViewer({
  slug,
  categorySlug,
  categories,
  pages,
  leadership,
  events,
  conferences = [],
  researchSliderSlides = [],
  onNavigate,
}: PageViewerProps) {
  const { toggleSpeech, isSpeaking } = useThemeAccessibility();
  const [researchSlideIdx, setResearchSlideIdx] = useState(0);

  useEffect(() => {
    if (researchSliderSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setResearchSlideIdx((prev) => (prev + 1) % researchSliderSlides.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [researchSliderSlides.length]);

  const resolvedCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
  const categoryPages = resolvedCategory
    ? pages.filter((p) => p.categorySlug === resolvedCategory.slug).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const page = slug
    ? pages.find((p) => p.slug === slug)
    : resolvedCategory
      ? categoryPages[0]
      : pages[0];

  if (!page && resolvedCategory) {
    return (
      <div className="max-w-[1380px] mx-auto px-4 py-8">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400 mb-6">
          <button type="button" onClick={() => onNavigate('/')} className="hover:underline">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-stone-800 dark:text-slate-200">{resolvedCategory.name}</span>
        </nav>
        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
            Institutional Portal
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white mb-3">
            {resolvedCategory.name}
          </h1>
          <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed mb-6">
            {resolvedCategory.description}
          </p>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            No micro-pages have been published under this category yet. Staff can add pages inside Admin Dashboard &rarr; Pages &amp; UGC Content.
          </p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="max-w-[1380px] mx-auto px-4 py-16 text-center">
        <h2 className="font-display text-2xl font-bold mb-2">Disclosure Page Not Found</h2>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="px-4 py-2 rounded bg-slate-900 text-white text-sm"
        >
          Return Home
        </button>
      </div>
    );
  }

  const category = categories.find((c) => c.slug === page.categorySlug);
  const siblingPages = pages
    .filter((p) => p.categorySlug === page.categorySlug)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400 mb-6">
        <button type="button" onClick={() => onNavigate('/')} className="hover:underline">
          Home
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button
          type="button"
          onClick={() => onNavigate(`/category/${category?.slug || page.categorySlug}`)}
          className="hover:underline"
        >
          {category?.name || page.categorySlug}
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-stone-800 dark:text-slate-200">{page.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Category Left Sidebar */}
        <aside className="lg:col-span-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400 px-2 mb-3">
            {category?.name}
          </p>
          <ul className="space-y-1">
            {siblingPages.map((sib) => {
              const active = sib.slug === page.slug;
              return (
                <li key={sib.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/page/${sib.slug}`)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'text-white font-semibold'
                        : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                    }`}
                    style={active ? { backgroundColor: 'var(--primary-color)' } : undefined}
                  >
                    {sib.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main Disclosure Content */}
        <article className="lg:col-span-9 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 mb-6 border-b border-stone-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-slate-400 mb-1">
                {page.subtitle || `${category?.name || 'Institutional'} · Official Information`}
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white">
                {page.title}
              </h1>
              <p className="text-xs text-stone-500 dark:text-slate-400 mt-2 tabular-nums">
                Last Verified: {page.updatedAt} · Updated by {page.updatedBy}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleSpeech(`${page.title}. ${page.subtitle}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-medium text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{isSpeaking ? 'Stop Audio' : 'Read Aloud'}</span>
            </button>
          </div>

          <CmsHtmlContent
            html={page.contentHtml}
            className="text-stone-700 dark:text-slate-200"
            onNavigate={onNavigate}
          />

          {/* Research Category Dedicated Slider & Live Conferences / Events / Workshops */}
          {page.categorySlug === 'research' && (
            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-slate-800 space-y-5">
              {researchSliderSlides.length > 0 && (() => {
                const activeSlide = researchSliderSlides[researchSlideIdx % researchSliderSlides.length];
                return (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-slate-700 bg-slate-900 min-h-[260px] flex items-end">
                    <img
                      src={activeSlide.imageUrl}
                      alt={activeSlide.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent" />
                    <div className="relative z-10 p-6 text-white w-full pr-24">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                        Research Highlights &amp; Symposia Slider
                      </p>
                      <h2 className="font-display text-xl sm:text-2xl font-bold mb-1">{activeSlide.title}</h2>
                      {activeSlide.caption && (
                        <p className="text-xs sm:text-sm text-slate-200 max-w-2xl mb-3">{activeSlide.caption}</p>
                      )}
                      {activeSlide.ctaLabel && activeSlide.ctaLink && (
                        <button
                          type="button"
                          onClick={() => onNavigate(activeSlide.ctaLink!)}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
                        >
                          {activeSlide.ctaLabel} &rarr;
                        </button>
                      )}
                    </div>
                    {researchSliderSlides.length > 1 && (
                      <>
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Previous research slide"
                            onClick={() =>
                              setResearchSlideIdx((prev) => (prev - 1 + researchSliderSlides.length) % researchSliderSlides.length)
                            }
                            className="p-1.5 rounded-full bg-slate-950/65 text-white border border-white/20 hover:bg-slate-950"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Next research slide"
                            onClick={() => setResearchSlideIdx((prev) => (prev + 1) % researchSliderSlides.length)}
                            className="p-1.5 rounded-full bg-slate-950/65 text-white border border-white/20 hover:bg-slate-950"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-3 right-4 z-10 flex gap-1.5">
                          {researchSliderSlides.map((s, idx) => (
                            <button
                              key={s.id}
                              type="button"
                              aria-label={`Research slide ${idx + 1}`}
                              onClick={() => setResearchSlideIdx(idx)}
                              className={`h-2 rounded-full transition-all ${
                                idx === researchSlideIdx % researchSliderSlides.length ? 'w-5 bg-amber-400' : 'w-2 bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Globe2 className="w-5 h-5 text-amber-600" />
                    National / International Conferences, Workshops &amp; Research Events
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Admin-managed conferences, workshops, FDPs, and symposia with dedicated microsites &amp; submission portals.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('/conferences')}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  Open Full Research Conferences &amp; Events Portal &rarr;
                </button>
              </div>

              {conferences.filter((c) => c.isPublished).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortByOrder(conferences.filter((c) => c.isPublished)).map((conf) => (
                    <div
                      key={conf.id}
                      className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-4 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase">
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950">{conf.scope}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-stone-800 dark:text-slate-200">
                            {conf.mode}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                          {conf.shortName}: {conf.title}
                        </h3>
                        <p className="text-xs text-stone-600 dark:text-slate-300 line-clamp-2">{conf.theme}</p>
                        <div className="flex flex-wrap gap-3 text-[11px] text-stone-500 dark:text-slate-400 pt-1">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-600" /> {conf.startDate}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-600" /> {conf.venue}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-2.5 border-t border-stone-200/70 dark:border-slate-700 flex items-center justify-between">
                        <span className="text-[11px] text-stone-500">{conf.tracks.length} Tracks</span>
                        <button
                          type="button"
                          onClick={() => onNavigate(`/conference/${conf.slug}`)}
                          className="text-xs font-bold hover:underline"
                          style={{ color: 'var(--primary-color)' }}
                        >
                          Open Microsite &amp; Submit Paper &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attached Statutory PDF or External Link */}
          {page.attachedPdfUrl && (() => {
            const isExternal = /^https?:\/\//i.test(page.attachedPdfUrl);
            return (
              <div className="mt-8 p-4 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    {isExternal ? 'Attached External Document Link (Google Drive / Portal)' : 'Attached Statutory Document'}
                  </p>
                  <p className="text-sm font-semibold text-stone-900 dark:text-white">
                    {page.attachedPdfLabel || (isExternal ? 'Open Linked Document' : 'Download Official Document (PDF)')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={page.attachedPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isExternal ? 'Open Document Link' : 'View PDF'}</span>
                  </a>
                  {!isExternal && (
                    <a
                      href={page.attachedPdfUrl}
                      download
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-slate-600 text-stone-800 dark:text-slate-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Leadership & Committee Profiles with Photographs & Contact Particulars */}
          {(() => {
            const matchedLeadership = sortByOrder(leadership).filter((officer) => {
              if (page.slug === 'statutory-officers') return true;
              const label = formatCommitteeGroupLabel(officer.committeeGroup).toLowerCase();
              const slugWords = page.slug.toLowerCase();
              const titleWords = page.title.toLowerCase();
              if (slugWords.includes('governing') || titleWords.includes('governing')) {
                return label.includes('governing') || label.includes('statutory');
              }
              if (slugWords.includes('academic-council') || titleWords.includes('academic council')) {
                return label.includes('academic council') || label.includes('academic leadership');
              }
              if (slugWords.includes('board-of-studies') || slugWords.includes('bos') || titleWords.includes('board of studies')) {
                return label.includes('board of studies') || label.includes('bos');
              }
              if (slugWords.includes('finance') || titleWords.includes('finance committee')) {
                return label.includes('finance');
              }
              if (slugWords.includes('internal-complaint') || slugWords.includes('icc') || titleWords.includes('icc')) {
                return label.includes('internal complaint') || label.includes('icc');
              }
              if (slugWords.includes('anti-ragging') || titleWords.includes('anti-ragging')) {
                return label.includes('anti-ragging');
              }
              if (slugWords.includes('grievance') || titleWords.includes('grievance')) {
                return label.includes('grievance') || label.includes('sgrc');
              }
              return false;
            });
            if (matchedLeadership.length === 0) return null;
            return (
              <div className="mt-8 pt-6 border-t border-stone-200 dark:border-slate-800">
                <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white mb-4">
                  Profiles with Photographs &amp; Contact Particulars
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchedLeadership.map((officer) => (
                    <div
                      key={officer.id}
                      className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 flex items-start gap-4"
                    >
                      <img
                        src={officer.photoUrl}
                        alt={officer.name}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300">
                          {formatCommitteeGroupLabel(officer.committeeGroup)}
                        </span>
                        <p className="text-xs font-semibold" style={{ color: 'var(--secondary-color)' }}>
                          {officer.roleTitle}
                        </p>
                        <h3 className="text-base font-bold text-stone-900 dark:text-white">
                          {officer.name}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-slate-400">
                          {officer.qualification}
                        </p>
                        <p className="text-xs text-stone-600 dark:text-slate-300">{officer.bio}</p>
                        <div className="pt-1 flex flex-wrap gap-3 text-xs text-stone-700 dark:text-slate-300 tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {officer.email}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {officer.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Live Circulars & Events Feed (for Section 5(h)) */}
          {page.slug === 'circulars-notices' && (
            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-slate-800 space-y-3">
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white mb-2">
                Active Institutional Circulars, Notices &amp; Events
              </h2>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40"
                >
                  <div className="text-xs text-stone-500 dark:text-slate-400 tabular-nums mb-1">
                    <span className="font-semibold" style={{ color: 'var(--secondary-color)' }}>
                      {ev.category}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span>{ev.eventDate}</span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900 dark:text-white mb-1">
                    {ev.title}
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-slate-300">{ev.summary}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
