import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Clock,
  Download,
  Mail,
  MapPin,
  Phone,
  Search,
  Star,
  UserCheck,
} from 'lucide-react';
import type { FacilitiesData, SiteSettings } from '../types/cms';
import { sortByOrder } from '../lib/cmsLogic';
import { CmsHtmlContent } from './CmsHtmlContent';

interface FacilitiesPortalProps {
  facilities: FacilitiesData;
  settings: SiteSettings;
  initialCategory?: string;
  onNavigate?: (path: string) => void;
}

export function FacilitiesPortal({ facilities, settings, initialCategory, onNavigate }: FacilitiesPortalProps) {
  const [selectedCat, setSelectedCat] = useState(initialCategory || 'All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialCategory) setSelectedCat(initialCategory);
  }, [initialCategory]);

  const publishedItems = useMemo(
    () => sortByOrder((facilities.items || []).filter((item) => item.isPublished)),
    [facilities.items],
  );

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(publishedItems.map((i) => i.category).filter(Boolean)))],
    [publishedItems],
  );

  const visibleItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedItems.filter((item) => {
      if (selectedCat !== 'All' && item.category !== selectedCat) return false;
      if (!q) return true;
      const plain = item.descriptionHtml.replace(/<[^>]+>/g, ' ').toLowerCase();
      const cfMatch = (item.customFields || []).some(
        (cf) => cf.label.toLowerCase().includes(q) || cf.value.toLowerCase().includes(q),
      );
      return (
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.shortSummary.toLowerCase().includes(q) ||
        item.locationBlock.toLowerCase().includes(q) ||
        item.capacity.toLowerCase().includes(q) ||
        item.inchargeName.toLowerCase().includes(q) ||
        plain.includes(q) ||
        cfMatch
      );
    });
  }, [publishedItems, selectedCat, searchQuery]);

  const cfg = facilities.config;

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
      {/* Institutional Facilities Hero */}
      <header
        className="rounded-xl p-6 sm:p-8 text-white shadow-sm border border-stone-200 dark:border-slate-800 space-y-4"
        style={{ backgroundColor: 'var(--primary-color)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
              {cfg.heroBadge || 'Campus Infrastructure & Resources'}
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight">
              {cfg.heroTitle}
            </h1>
            <p className="text-sm text-white/90 leading-relaxed">{cfg.heroSubtitle}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0 tabular-nums">
            <div className="px-4 py-3 rounded-lg bg-white/10">
              <p className="text-2xl font-bold">{publishedItems.length}</p>
              <p className="text-[11px] text-white/80">Campus Facilities</p>
            </div>
            <div className="px-4 py-3 rounded-lg bg-white/10">
              <p className="text-2xl font-bold">{Math.max(0, categories.length - 1)}</p>
              <p className="text-[11px] text-white/80">Facility Domains</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Categories & Search */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCat(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                selectedCat === cat
                  ? 'text-white border-transparent'
                  : 'bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200'
              }`}
              style={selectedCat === cat ? { backgroundColor: 'var(--primary-color)' } : undefined}
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
            placeholder="Filter labs, IT nodes, capacity, custom fields..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-950"
          />
        </div>
      </div>

      {/* Facilities Grid */}
      {visibleItems.length === 0 ? (
        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
          No published facilities match your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col"
            >
              <div className="relative h-56 border-b border-stone-200 dark:border-slate-800 bg-slate-900">
                <img
                  src={item.imageUrl || '/src/assets/images/campus_facilities_1794991331724.jpg'}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-transparent p-4 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-amber-300">{item.category}</span>
                    {item.isFeatured && (
                      <span className="inline-flex items-center gap-1 font-semibold text-white/95">
                        <Star className="w-3 h-3 text-amber-300" /> Key Infrastructure
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-bold leading-snug mt-0.5">{item.title}</h2>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-stone-800 dark:text-slate-100 leading-relaxed">
                    {item.shortSummary}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    {item.locationBlock && (
                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200/80 dark:border-slate-700">
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-500">
                          <MapPin className="w-3 h-3 text-amber-600" /> Location
                        </span>
                        <span className="font-semibold text-stone-900 dark:text-white mt-0.5 block">
                          {item.locationBlock}
                        </span>
                      </div>
                    )}
                    {item.capacity && (
                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200/80 dark:border-slate-700 tabular-nums">
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-500">
                          <Building2 className="w-3 h-3 text-amber-600" /> Capacity / Scale
                        </span>
                        <span className="font-semibold text-stone-900 dark:text-white mt-0.5 block">
                          {item.capacity}
                        </span>
                      </div>
                    )}
                    {item.timings && (
                      <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200/80 dark:border-slate-700 tabular-nums">
                        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-500">
                          <Clock className="w-3 h-3 text-amber-600" /> Timings
                        </span>
                        <span className="font-semibold text-stone-900 dark:text-white mt-0.5 block">
                          {item.timings}
                        </span>
                      </div>
                    )}
                  </div>

                  {item.descriptionHtml && (
                    <div className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                      <CmsHtmlContent html={item.descriptionHtml} onNavigate={onNavigate} />
                    </div>
                  )}

                  {item.customFields && item.customFields.length > 0 && (
                    <div className="rounded-lg border border-stone-200 dark:border-slate-700 overflow-hidden">
                      <div className="px-3 py-1.5 bg-stone-100 dark:bg-slate-800 text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                        Technical Specifications &amp; Facility Details
                      </div>
                      <dl className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
                        {item.customFields.map((cf, idx) => (
                          <div key={idx} className="px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
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

                <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5 text-stone-600 dark:text-slate-300">
                    {item.inchargeName && (
                      <p className="font-semibold text-stone-900 dark:text-white flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600" /> {item.inchargeName}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 text-[11px] text-stone-500">
                      {item.inchargeEmail && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {item.inchargeEmail}
                        </span>
                      )}
                      {item.inchargePhone && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Phone className="w-3 h-3" /> {item.inchargePhone}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.brochureUrl && (
                    <a
                      href={item.brochureUrl}
                      onClick={(e) => {
                        if (item.brochureUrl!.startsWith('/') && onNavigate) {
                          e.preventDefault();
                          onNavigate(item.brochureUrl!);
                        }
                      }}
                      target={item.brochureUrl.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 font-semibold hover:bg-stone-50 dark:hover:bg-slate-800"
                    >
                      <Download className="w-3.5 h-3.5" /> Details / Brochure
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className="text-center text-xs text-stone-500 dark:text-slate-400 pt-2">
        Infrastructure maintained under AICTE Approval Process Handbook &amp; UGC Public Self-Disclosure norms ({settings.institutionName}).
      </footer>
    </div>
  );
}
