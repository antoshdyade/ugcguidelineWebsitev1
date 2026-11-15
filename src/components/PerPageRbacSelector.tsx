import React, { useMemo, useState } from 'react';
import { CheckSquare, Search, ShieldCheck, Square } from 'lucide-react';
import { sortByOrder } from '../lib/cmsLogic';
import type { CmsCategory, CmsPage } from '../types/cms';

interface PerPageRbacSelectorProps {
  categories: CmsCategory[];
  pages: CmsPage[];
  selectedPageIds: number[];
  onChange: (nextIds: number[]) => void;
  title?: string;
}

export function PerPageRbacSelector({
  categories,
  pages,
  selectedPageIds,
  onChange,
  title = 'Individual Page-Wise Access Control (Fine-Grained RBAC)',
}: PerPageRbacSelectorProps) {
  const [filterText, setFilterText] = useState('');

  const orderedCats = useMemo(() => sortByOrder(categories), [categories]);
  const selectedSet = useMemo(() => new Set(selectedPageIds), [selectedPageIds]);

  const grouped = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    const knownCatSlugs = new Set(orderedCats.map((c) => c.slug));
    const catGroups = orderedCats
      .map((cat) => {
        const catPages = sortByOrder(pages.filter((p) => p.categorySlug === cat.slug)).filter((pg) => {
          if (!q) return true;
          return (
            pg.title.toLowerCase().includes(q) ||
            pg.slug.toLowerCase().includes(q) ||
            cat.name.toLowerCase().includes(q)
          );
        });
        return { cat, catPages };
      })
      .filter((g) => g.catPages.length > 0);

    const orphanPages = sortByOrder(pages.filter((p) => !knownCatSlugs.has(p.categorySlug))).filter((pg) => {
      if (!q) return true;
      return (
        pg.title.toLowerCase().includes(q) ||
        pg.slug.toLowerCase().includes(q) ||
        'uncategorized other'.includes(q)
      );
    });
    if (orphanPages.length > 0) {
      catGroups.push({
        cat: {
          id: -999,
          slug: '__uncategorized__',
          name: 'Other / Uncategorized Micro-Pages',
          ugcCode: 'Custom',
          sortOrder: 9999,
          description: 'Pages not linked to a listed category',
        },
        catPages: orphanPages,
      });
    }
    return catGroups;
  }, [orderedCats, pages, filterText]);

  const togglePage = (pageId: number) => {
    if (selectedSet.has(pageId)) {
      onChange(selectedPageIds.filter((id) => id !== pageId));
    } else {
      onChange([...selectedPageIds, pageId]);
    }
  };

  const toggleCategoryPages = (catPageIds: number[], allSelected: boolean) => {
    if (allSelected) {
      const removeSet = new Set(catPageIds);
      onChange(selectedPageIds.filter((id) => !removeSet.has(id)));
    } else {
      const merged = new Set([...selectedPageIds, ...catPageIds]);
      onChange(Array.from(merged));
    }
  };

  return (
    <div className="rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/70 dark:bg-slate-800/40 p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-bold text-stone-800 dark:text-slate-100">{title}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 font-semibold tabular-nums">
            {selectedPageIds.length} / {pages.length} {selectedPageIds.length === 1 ? 'page' : 'pages'} selected
          </span>
          <button
            type="button"
            onClick={() => onChange(pages.map((p) => p.id))}
            className="text-amber-700 dark:text-amber-400 hover:underline font-semibold"
          >
            Select All
          </button>
          {selectedPageIds.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-rose-600 hover:underline font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-stone-500 dark:text-slate-400">
        When any individual pages are checked below, the user can edit <strong>only</strong> these exact pages (overrides full category permissions).
      </p>

      <div className="relative">
        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2 pointer-events-none" />
        <input
          type="search"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter pages by title, slug, or category..."
          className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
        />
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
        {grouped.map(({ cat, catPages }) => {
          const catPageIds = catPages.map((p) => p.id);
          const selectedInCat = catPageIds.filter((id) => selectedSet.has(id)).length;
          const allSelected = catPageIds.length > 0 && selectedInCat === catPageIds.length;
          return (
            <div
              key={cat.id}
              className="rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2"
            >
              <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-stone-100 dark:border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-slate-200 truncate">
                  {cat.name} ({selectedInCat}/{catPages.length})
                </span>
                <button
                  type="button"
                  onClick={() => toggleCategoryPages(catPageIds, allSelected)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 shrink-0"
                >
                  {allSelected ? <CheckSquare className="w-3 h-3 text-amber-600" /> : <Square className="w-3 h-3" />}
                  <span>{allSelected ? 'Uncheck Group' : 'Select Group'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {catPages.map((pg) => (
                  <label
                    key={pg.id}
                    className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs cursor-pointer border transition-colors ${
                      selectedSet.has(pg.id)
                        ? 'border-amber-500/60 bg-amber-50/60 dark:bg-amber-950/30 font-medium'
                        : 'border-transparent hover:bg-stone-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSet.has(pg.id)}
                      onChange={() => togglePage(pg.id)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="min-w-0 leading-snug">
                      <span className="block truncate">{pg.title}</span>
                      <span className="block text-[10px] text-stone-400 truncate">/{pg.slug}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        {grouped.length === 0 && (
          <p className="text-xs text-stone-500 py-3 text-center">No pages match &ldquo;{filterText}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
