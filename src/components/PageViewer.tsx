import React from 'react';
import { ChevronRight, Download, ExternalLink, Mail, Phone, Volume2 } from 'lucide-react';
import { useThemeAccessibility } from '../context/ThemeAccessibilityContext';
import type { CampusEvent, CmsCategory, CmsPage, LeadershipProfile } from '../types/cms';

interface PageViewerProps {
  slug?: string;
  categorySlug?: string;
  categories: CmsCategory[];
  pages: CmsPage[];
  leadership: LeadershipProfile[];
  events: CampusEvent[];
  onNavigate: (path: string) => void;
}

export function PageViewer({
  slug,
  categorySlug,
  categories,
  pages,
  leadership,
  events,
  onNavigate,
}: PageViewerProps) {
  const { toggleSpeech, isSpeaking } = useThemeAccessibility();

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
            {resolvedCategory.ugcCode}
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
            {category?.ugcCode} · {category?.name}
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
                {page.subtitle || `${category?.ugcCode} Mandatory Public Self-Disclosure`}
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

          <div
            className="cms-prose text-stone-700 dark:text-slate-200"
            dangerouslySetInnerHTML={{ __html: page.contentHtml }}
          />

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

          {/* Statutory Officers Leadership Grid (for Section 5(b)) */}
          {page.slug === 'statutory-officers' && (
            <div className="mt-8 pt-6 border-t border-stone-200 dark:border-slate-800">
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white mb-4">
                Profiles with Photographs &amp; Contact Particulars
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leadership.map((officer) => (
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
          )}

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
