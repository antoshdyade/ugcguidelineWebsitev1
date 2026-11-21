import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  Pin,
  Printer,
  Search,
} from 'lucide-react';
import type { SiteSettings, TenderNotice, TendersData } from '../types/cms';
import {
  DEFAULT_TENDER_PORTAL_CONFIG,
  TENDER_STATUS_PRESETS,
  filterTenderNotices,
  isEntityShareable,
  isRecordPublished,
} from '../lib/collegeFeaturesLogic';
import { sortByOrder } from '../lib/cmsLogic';
import { CmsHtmlContent } from './CmsHtmlContent';
import { SocialShareBar } from './SocialMediaWidgets';

interface TendersPortalProps {
  tenders: TendersData;
  settings: SiteSettings;
  initialRef?: string;
  initialCategory?: string;
  onNavigate?: (path: string) => void;
}

function getSafeHref(raw?: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return null;
  return trimmed;
}

export function TendersPortal({
  tenders,
  settings,
  initialRef,
  initialCategory,
  onNavigate,
}: TendersPortalProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState(initialRef || '');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (initialCategory) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialRef) {
      setSearchQuery(initialRef);
      const match = (tenders.items || []).find(
        (t) => t.referenceNumber.toLowerCase() === initialRef.toLowerCase(),
      );
      if (match) setExpandedId(match.id);
    }
  }, [initialRef, tenders.items]);

  const cfg = { ...DEFAULT_TENDER_PORTAL_CONFIG, ...(tenders.config || {}) };

  const publishedItems = useMemo(
    () =>
      sortByOrder(
        (tenders.items || []).filter(
          (item) => item.isPublished && isRecordPublished(item, 'moderationStatus'),
        ),
      ),
    [tenders.items],
  );

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(publishedItems.map((i) => i.category).filter(Boolean)))],
    [publishedItems],
  );

  const visibleItems = useMemo(
    () => filterTenderNotices(publishedItems, selectedCategory, selectedStatus, searchQuery),
    [publishedItems, selectedCategory, selectedStatus, searchQuery],
  );

  const openCount = useMemo(
    () =>
      publishedItems.filter(
        (i) => i.lifecycleStatus === 'Open' || i.lifecycleStatus === 'Corrigendum Issued',
      ).length,
    [publishedItems],
  );

  const awardedCount = useMemo(
    () => publishedItems.filter((i) => i.lifecycleStatus === 'Awarded').length,
    [publishedItems],
  );

  const eProcHref = getSafeHref(cfg.eProcurementPortalUrl);

  const renderDocLink = (url: string | undefined, label: string) => {
    const safe = getSafeHref(url);
    if (!safe) return null;
    const isInternal = safe.startsWith('/');
    return (
      <a
        href={safe}
        onClick={(e) => {
          if (isInternal && onNavigate) {
            e.preventDefault();
            onNavigate(safe);
          }
        }}
        target={isInternal ? undefined : '_blank'}
        rel={isInternal ? undefined : 'noopener noreferrer'}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold text-stone-800 dark:text-slate-100 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
      >
        <FileText className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
        <span>{label}</span>
      </a>
    );
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
      {/* Institutional Procurement Masthead */}
      <header
        className="rounded-xl p-6 sm:p-8 text-white shadow-sm border border-stone-200 dark:border-slate-800 space-y-4"
        style={{ backgroundColor: 'var(--primary-color)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              {cfg.heroBadge}
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight">
              {cfg.heroTitle}
            </h1>
            <p className="text-sm text-white/90 leading-relaxed">{cfg.heroSubtitle}</p>
            <div className="pt-1 flex flex-wrap items-center gap-3">
              {eProcHref && (
                <a
                  href={eProcHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors"
                >
                  <span>{cfg.eProcurementPortalLabel || 'GeM / e-Tendering Portal'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Tender Bulletin</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 shrink-0 tabular-nums">
            <div className="px-4 py-3 rounded-lg bg-white/10 border border-white/15">
              <p className="text-2xl font-bold">{publishedItems.length}</p>
              <p className="text-[11px] text-white/80">Total Notices</p>
            </div>
            <div className="px-4 py-3 rounded-lg bg-white/10 border border-white/15">
              <p className="text-2xl font-bold text-amber-300">{openCount}</p>
              <p className="text-[11px] text-white/80">Active / Open</p>
            </div>
            <div className="px-4 py-3 rounded-lg bg-white/10 border border-white/15">
              <p className="text-2xl font-bold">{awardedCount}</p>
              <p className="text-[11px] text-white/80">Awarded</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters & Search Toolbar */}
      <section
        aria-label="Filter Tenders and Purchase Notices"
        className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedCategory === cat
                    ? 'text-white border-transparent'
                    : 'bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-700'
                }`}
                style={selectedCategory === cat ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NIT ref, item, department..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mr-1">
            Bid Stage:
          </span>
          {['All', ...TENDER_STATUS_PRESETS].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                selectedStatus === st
                  ? 'bg-stone-900 dark:bg-slate-100 text-white dark:text-slate-950 border-transparent'
                  : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </section>

      {/* Main Content Grid: Tender Notices Register + Procurement Cell Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          {visibleItems.length === 0 ? (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
              No tender or purchase notices match the selected filters.
            </div>
          ) : (
            visibleItems.map((item: TenderNotice) => {
              const isOpenDetails = expandedId === item.id;
              const statusTone =
                item.lifecycleStatus === 'Open'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : item.lifecycleStatus === 'Corrigendum Issued'
                    ? 'text-amber-700 dark:text-amber-400'
                    : item.lifecycleStatus === 'Awarded'
                      ? 'text-sky-700 dark:text-sky-400'
                      : 'text-stone-600 dark:text-slate-400';

              return (
                <article
                  key={item.id}
                  id={`tender-${item.id}`}
                  className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
                >
                  <div className="p-5 space-y-3">
                    {/* Unboxed Metadata Line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
                        <span className="font-mono font-bold text-stone-900 dark:text-white">
                          {item.referenceNumber}
                        </span>
                        <span className="text-stone-300 dark:text-slate-600">&middot;</span>
                        <span className="font-semibold text-stone-600 dark:text-slate-300">
                          {item.category}
                        </span>
                        <span className="text-stone-300 dark:text-slate-600">&middot;</span>
                        <span className="text-stone-500 dark:text-slate-400">{item.procurementMode}</span>
                        {item.isPinned && (
                          <>
                            <span className="text-stone-300 dark:text-slate-600">&middot;</span>
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                              <Pin className="w-3 h-3" /> Priority Notice
                            </span>
                          </>
                        )}
                      </div>
                      <span className={`font-bold uppercase tracking-wider text-[11px] ${statusTone}`}>
                        {item.lifecycleStatus}
                      </span>
                    </div>

                    <h2 className="font-display text-lg sm:text-xl font-bold text-stone-900 dark:text-white leading-snug">
                      {item.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                      {item.summary}
                    </p>

                    {/* Structured Key Bid Dates & Financial Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs tabular-nums">
                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200/80 dark:border-slate-700">
                        <span className="block text-[10px] uppercase tracking-wider text-stone-500">
                          Estimated Cost
                        </span>
                        <span className="font-bold text-stone-900 dark:text-white mt-0.5 block">
                          {item.estimatedValue || 'As per BOQ'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200/80 dark:border-slate-700">
                        <span className="block text-[10px] uppercase tracking-wider text-stone-500">
                          EMD / Tender Fee
                        </span>
                        <span className="font-semibold text-stone-900 dark:text-white mt-0.5 block">
                          {item.emdAmount || 'Nil'} / {item.tenderFee || 'Nil'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200/80 dark:border-slate-700">
                        <span className="block text-[10px] uppercase tracking-wider text-stone-500">
                          Published Date
                        </span>
                        <span className="font-semibold text-stone-900 dark:text-white mt-0.5 block">
                          {item.publishDate}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50">
                        <span className="block text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                          Submission Deadline
                        </span>
                        <span className="font-bold text-stone-900 dark:text-white mt-0.5 block">
                          {item.submissionDeadline}
                        </span>
                      </div>
                    </div>

                    {item.corrigendumNote && (
                      <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-stone-800 dark:text-amber-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Corrigendum / Addendum Notice: </span>
                          {item.corrigendumNote}
                        </div>
                      </div>
                    )}

                    {item.lifecycleStatus === 'Awarded' && item.awardedTo && (
                      <div className="p-3 rounded-lg bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-stone-800 dark:text-sky-200 flex items-start gap-2">
                        <Award className="w-4 h-4 text-sky-700 dark:text-sky-400 shrink-0 mt-0.5" />
                        <div className="tabular-nums">
                          <span className="font-bold">Contract Awarded: </span>
                          {item.awardedTo}
                          {item.awardedValue ? ` · Contract Value: ${item.awardedValue}` : ''}
                          {item.poReference ? ` · Ref: ${item.poReference}` : ''}
                        </div>
                      </div>
                    )}

                    {/* Action Row: Downloads & Expand Specifications */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        {renderDocLink(item.nitPdfUrl, 'NIT Document')}
                        {renderDocLink(item.boqUrl, 'BOQ / Price Bid')}
                        {renderDocLink(item.corrigendumUrl, 'Corrigendum PDF')}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpenDetails ? null : item.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span>{isOpenDetails ? 'Hide Full Notice & Specs' : 'View Eligibility & Full Schedule'}</span>
                        {isOpenDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isOpenDetails && (
                      <div className="pt-3 border-t border-stone-200 dark:border-slate-800 space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 tabular-nums">
                          <div>
                            <span className="text-stone-500 block">Indenting Department</span>
                            <strong className="text-stone-900 dark:text-white">{item.departmentName}</strong>
                          </div>
                          {item.preBidDate && (
                            <div>
                              <span className="text-stone-500 block">Pre-Bid Clarification</span>
                              <strong className="text-stone-900 dark:text-white">{item.preBidDate}</strong>
                            </div>
                          )}
                          {item.bidOpeningDate && (
                            <div>
                              <span className="text-stone-500 block">Technical Bid Opening</span>
                              <strong className="text-stone-900 dark:text-white">{item.bidOpeningDate}</strong>
                            </div>
                          )}
                        </div>

                        {item.eligibilityHtml && (
                          <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-slate-700">
                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                              Vendor Eligibility &amp; Scope Requirements
                            </h3>
                            <div className="text-stone-700 dark:text-slate-200 leading-relaxed">
                              <CmsHtmlContent html={item.eligibilityHtml} onNavigate={onNavigate} />
                            </div>
                          </div>
                        )}

                        {item.customFields && item.customFields.length > 0 && (
                          <div className="rounded-lg border border-stone-200 dark:border-slate-700 overflow-hidden">
                            <div className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                              Additional Procurement Parameters
                            </div>
                            <dl className="divide-y divide-stone-100 dark:divide-slate-800">
                              {item.customFields.map((cf, idx) => (
                                <div
                                  key={idx}
                                  className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                                >
                                  <dt className="font-semibold text-stone-600 dark:text-slate-400">{cf.label}</dt>
                                  <dd className="font-medium text-stone-900 dark:text-white tabular-nums sm:text-right">
                                    {cf.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}
                      </div>
                    )}

                    <SocialShareBar
                      compact
                      isShareable={isEntityShareable(item)}
                      title={`${item.referenceNumber}: ${item.title}`}
                      summary={`${item.category} · Submission Deadline: ${item.submissionDeadline}`}
                      settings={settings}
                      location="portal"
                    />
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Column: Procurement Officer Contact & General Tender Rules */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-sm text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100 dark:border-slate-800">
              <Building2 className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">
                Central Purchase Office Contact
              </h2>
            </div>
            <div>
              <p className="font-bold text-sm text-stone-900 dark:text-white">{cfg.officerName}</p>
              <p className="text-stone-500 dark:text-slate-400">{cfg.officerTitle}</p>
            </div>
            <div className="space-y-1.5 text-stone-700 dark:text-slate-300 tabular-nums">
              {cfg.officerEmail && (
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  <a href={`mailto:${cfg.officerEmail}`} className="hover:underline">
                    {cfg.officerEmail}
                  </a>
                </p>
              )}
              {cfg.officerPhone && (
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>{cfg.officerPhone}</span>
                </p>
              )}
              {cfg.officeAddress && (
                <p className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{cfg.officeAddress}</span>
                </p>
              )}
              <p className="flex items-center gap-2 pt-1 text-stone-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Office Hours: Mon – Sat · 10:00 AM – 05:00 PM</span>
              </p>
            </div>
          </div>

          {cfg.generalTermsHtml && (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2.5 shadow-sm text-xs">
              <h2 className="text-sm font-bold text-stone-900 dark:text-white pb-2 border-b border-stone-100 dark:border-slate-800">
                Standard Procurement Guidelines
              </h2>
              <div className="text-stone-600 dark:text-slate-300 leading-relaxed">
                <CmsHtmlContent html={cfg.generalTermsHtml} onNavigate={onNavigate} />
              </div>
            </div>
          )}

          <SocialShareBar
            title={`${settings.shortCode} Tenders & Purchase Notices`}
            summary={cfg.heroSubtitle}
            settings={settings}
            location="portal"
          />
        </aside>
      </div>
    </div>
  );
}
