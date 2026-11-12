import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Mail, MapPin, Phone, Search, ShieldAlert, X } from 'lucide-react';
import type { GalleryAlbum, SiteSettings, TelephoneEntry } from '../types/cms';

export function GalleryView({ albums }: { albums: GalleryAlbum[] }) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [lightbox, setLightbox] = useState<{ album: GalleryAlbum; index: number } | null>(null);

  const categories = ['All', ...Array.from(new Set(albums.map((a) => a.category)))];
  const visibleAlbums =
    activeCategory === 'All' ? albums : albums.filter((a) => a.category === activeCategory);

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-stone-200 dark:border-slate-800">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
            UGC Section 5(i) · Campus Media Archive
          </p>
          <h1 className="font-display text-3xl font-bold text-stone-900 dark:text-white mt-1">
            Picture Gallery
          </h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                activeCategory === cat
                  ? 'text-white border-transparent'
                  : 'bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300'
              }`}
              style={activeCategory === cat ? { backgroundColor: 'var(--primary-color)' } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visibleAlbums.map((album) => (
          <article
            key={album.id}
            className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setLightbox({ album, index: 0 })}
              className="w-full text-left group"
            >
              <div className="h-52 overflow-hidden bg-stone-200 dark:bg-slate-800">
                <img
                  src={album.coverUrl}
                  alt={album.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <p className="text-xs text-stone-500 dark:text-slate-400 tabular-nums mb-1">
                  {album.category} · {album.eventDate} · {album.photos.length} Photos
                </p>
                <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white group-hover:underline">
                  {album.title}
                </h2>
              </div>
            </button>
          </article>
        ))}
      </div>

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.album.title}
          className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4"
        >
          <div className="max-w-4xl w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden text-white">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">{lightbox.album.title}</h3>
                <p className="text-xs text-slate-400 tabular-nums">
                  Photo {lightbox.index + 1} of {lightbox.album.photos.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Close gallery lightbox"
                className="p-1.5 rounded hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-black flex items-center justify-center max-h-[68vh]">
              <img
                src={lightbox.album.photos[lightbox.index].imageUrl}
                alt={lightbox.album.photos[lightbox.index].altText}
                referrerPolicy="no-referrer"
                className="max-h-[65vh] w-auto object-contain"
              />
              {lightbox.album.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() =>
                      setLightbox((prev) =>
                        prev
                          ? {
                              ...prev,
                              index: (prev.index - 1 + prev.album.photos.length) % prev.album.photos.length,
                            }
                          : null,
                      )
                    }
                    className="absolute left-3 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() =>
                      setLightbox((prev) =>
                        prev ? { ...prev, index: (prev.index + 1) % prev.album.photos.length } : null,
                      )
                    }
                    className="absolute right-3 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            <div className="px-4 py-3 text-sm text-slate-200 border-t border-slate-800">
              {lightbox.album.photos[lightbox.index].caption}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContactView({
  settings,
  directory,
}: {
  settings: SiteSettings;
  directory: TelephoneEntry[];
}) {
  const [dirSearch, setDirSearch] = useState('');

  const filteredDirectory = useMemo(() => {
    const q = dirSearch.trim().toLowerCase();
    if (!q) return directory;
    return directory.filter(
      (row) =>
        row.section.toLowerCase().includes(q) ||
        row.officerName.toLowerCase().includes(q) ||
        row.designation.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q),
    );
  }, [directory, dirSearch]);

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-8">
      <div className="pb-4 border-b border-stone-200 dark:border-slate-800">
        <p className="text-xs uppercase tracking-widest text-stone-500 dark:text-slate-400">
          UGC Section 5(j) · Official Institutional Contact &amp; Telephone Directory
        </p>
        <h1 className="font-display text-3xl font-bold text-stone-900 dark:text-white mt-1">
          Contact Us &amp; Campus Directory
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
            Campus Address &amp; Helplines
          </h2>
          <div className="space-y-3 text-sm text-stone-700 dark:text-slate-300">
            <p className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-1" />
              <span>{settings.address}</span>
            </p>
            <p className="flex items-center gap-2.5 tabular-nums">
              <Phone className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Main Board: {settings.phone}</span>
            </p>
            <p className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Official Email: {settings.email}</span>
            </p>
            <p className="flex items-center gap-2.5 tabular-nums">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                24x7 Emergency: {settings.emergencyHelpline} · Anti-Ragging: {settings.antiRaggingHelpline}
              </span>
            </p>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden min-h-[280px]">
          <iframe
            title="SVCOER Campus Location Map"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.mapEmbedQuery)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            className="w-full h-full min-h-[280px] border-0"
            loading="lazy"
          />
        </div>
      </div>

      {/* Searchable Telephone Directory */}
      <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 border-b border-stone-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              Institutional Telephone Directory
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Direct extensions, office contacts, and official email addresses
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={dirSearch}
              onChange={(e) => setDirSearch(e.target.value)}
              placeholder="Search section, officer, email..."
              aria-label="Search telephone directory"
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/70 text-left text-xs uppercase tracking-wider text-stone-500 dark:text-slate-400">
                <th className="py-3 px-4">Office / Section</th>
                <th className="py-3 px-4">Officer Name</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 tabular-nums">Ext.</th>
                <th className="py-3 px-4 tabular-nums">Direct Phone</th>
                <th className="py-3 px-4">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {filteredDirectory.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 px-4 font-semibold text-stone-900 dark:text-white">{row.section}</td>
                  <td className="py-3 px-4">{row.officerName}</td>
                  <td className="py-3 px-4 text-stone-600 dark:text-slate-300">{row.designation}</td>
                  <td className="py-3 px-4 font-mono-tabular">{row.extension}</td>
                  <td className="py-3 px-4 font-mono-tabular whitespace-nowrap">{row.directPhone}</td>
                  <td className="py-3 px-4 text-stone-600 dark:text-slate-300">{row.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
