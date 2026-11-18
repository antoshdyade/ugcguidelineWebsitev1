import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bell,
  Calendar,
  ExternalLink,
  Image as ImageIcon,
  Mail,
  MapPin,
  Medal,
  Phone,
  PlayCircle,
  Trophy,
  UserCheck,
} from 'lucide-react';
import type { SiteSettings, SportsData } from '../types/cms';
import { sortByOrder } from '../lib/cmsLogic';

interface SportsPortalProps {
  sports: SportsData;
  settings: SiteSettings;
  initialTab?: string;
  onNavigate?: (path: string) => void;
}

type SportsTab = 'facilities' | 'events' | 'achievements' | 'gallery' | 'notices';

function toYoutubeEmbedUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const vid = parsed.searchParams.get('v');
      if (vid) return `https://www.youtube.com/embed/${encodeURIComponent(vid)}`;
      if (parsed.pathname.startsWith('/embed/')) return rawUrl;
    }
    if (host === 'youtu.be') {
      const vid = parsed.pathname.replace(/^\//, '').split('/')[0];
      if (vid) return `https://www.youtube.com/embed/${encodeURIComponent(vid)}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function SportsPortal({ sports, settings, initialTab, onNavigate }: SportsPortalProps) {
  const normalizeTab = (t?: string): SportsTab => {
    if (t === 'events' || t === 'achievements' || t === 'gallery' || t === 'notices') return t;
    return 'facilities';
  };
  const [activeTab, setActiveTab] = useState<SportsTab>(normalizeTab(initialTab));
  const [facilityFilter, setFacilityFilter] = useState('All');
  const [eventFilter, setEventFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [galleryFilter, setGalleryFilter] = useState<'All' | 'Photo' | 'Video'>('All');

  useEffect(() => {
    if (initialTab) setActiveTab(normalizeTab(initialTab));
  }, [initialTab]);

  const facilities = useMemo(() => sortByOrder(sports.facilities.filter((f) => f.isPublished)), [sports.facilities]);
  const events = useMemo(() => sortByOrder(sports.events.filter((e) => e.isPublished)), [sports.events]);
  const achievements = useMemo(() => sortByOrder(sports.achievements), [sports.achievements]);
  const gallery = useMemo(() => sortByOrder(sports.gallery.filter((g) => g.isPublished)), [sports.gallery]);
  const notices = useMemo(
    () =>
      [...sports.notices.filter((n) => n.isPublished)].sort((a, b) => {
        const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
        if (pinDiff !== 0) return pinDiff;
        return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
      }),
    [sports.notices],
  );

  const facilityTypes = useMemo(
    () => ['All', ...Array.from(new Set(facilities.map((f) => f.facilityType).filter(Boolean)))],
    [facilities],
  );
  const eventTypes = useMemo(
    () => ['All', ...Array.from(new Set(events.map((e) => e.eventType).filter(Boolean)))],
    [events],
  );
  const levels = useMemo(
    () => ['All', ...Array.from(new Set(achievements.map((a) => a.level).filter(Boolean)))],
    [achievements],
  );

  const visibleFacilities =
    facilityFilter === 'All' ? facilities : facilities.filter((f) => f.facilityType === facilityFilter);
  const visibleEvents =
    eventFilter === 'All' ? events : events.filter((e) => e.eventType === eventFilter);
  const visibleAchievements =
    levelFilter === 'All' ? achievements : achievements.filter((a) => a.level === levelFilter);
  const visibleGallery =
    galleryFilter === 'All' ? gallery : gallery.filter((g) => g.mediaType === galleryFilter);

  const cfg = sports.config;

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
      {/* Institutional Sports & Gymkhana Hero */}
      <header className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div
            className="lg:col-span-8 p-6 sm:p-8 text-white flex flex-col justify-between space-y-5"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                {cfg.heroBadge || 'Student Life · Gymkhana & Athletics'}
              </p>
              <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight">
                {cfg.heroTitle}
              </h1>
              <p className="text-sm text-white/90 max-w-2xl leading-relaxed">{cfg.heroSubtitle}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/15 tabular-nums">
              <div className="p-3 rounded-lg bg-white/10">
                <p className="text-xl font-bold">{facilities.length}</p>
                <p className="text-[11px] text-white/80">Sports Facilities</p>
              </div>
              <div className="p-3 rounded-lg bg-white/10">
                <p className="text-xl font-bold">{events.length}</p>
                <p className="text-[11px] text-white/80">Events &amp; Meets</p>
              </div>
              <div className="p-3 rounded-lg bg-white/10">
                <p className="text-xl font-bold">{achievements.length}</p>
                <p className="text-[11px] text-white/80">Student Medals</p>
              </div>
              <div className="p-3 rounded-lg bg-white/10">
                <p className="text-xl font-bold">{notices.length}</p>
                <p className="text-[11px] text-white/80">Trials &amp; Circulars</p>
              </div>
            </div>
          </div>

          {/* Director of Physical Education Desk */}
          <aside className="lg:col-span-4 p-6 bg-stone-50 dark:bg-slate-800/40 flex flex-col justify-between space-y-4 border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-slate-800">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Gymkhana &amp; Physical Education Desk
              </p>
              <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{cfg.directorName}</span>
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-300">{cfg.directorTitle}</p>
              <div className="text-xs space-y-1 pt-1 text-stone-700 dark:text-slate-200 tabular-nums">
                {cfg.directorEmail && (
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {cfg.directorEmail}
                  </p>
                )}
                {cfg.directorPhone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" /> {cfg.directorPhone}
                  </p>
                )}
                {cfg.gymkhanaTimings && (
                  <p className="text-[11px] text-stone-500 dark:text-slate-400 pt-1">
                    <strong>Ground Timings:</strong> {cfg.gymkhanaTimings}
                  </p>
                )}
              </div>
            </div>

            {cfg.customFields && cfg.customFields.length > 0 && (
              <div className="border-t border-stone-200 dark:border-slate-700 pt-3 space-y-1.5 text-xs">
                {cfg.customFields.map((cf, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-2">
                    <span className="text-stone-500 dark:text-slate-400 font-medium">{cf.label}:</span>
                    <span className="font-semibold text-stone-900 dark:text-white text-right">{cf.value}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </header>

      {/* Section Navigation */}
      <nav aria-label="Sports portal sections" className="flex flex-wrap items-center gap-2">
        {(
          [
            ['facilities', `Sports Facilities (${facilities.length})`, Trophy],
            ['events', `Activities & Events (${events.length})`, Calendar],
            ['achievements', `Student Achievements (${achievements.length})`, Medal],
            ['gallery', `Sports Gallery (${gallery.length})`, ImageIcon],
            ['notices', `Notices & Trials (${notices.length})`, Bell],
          ] as const
        ).map(([tabKey, tabLabel, Icon]) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              activeTab === tabKey
                ? 'text-white border-transparent'
                : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
            }`}
            style={activeTab === tabKey ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tabLabel}</span>
          </button>
        ))}
      </nav>

      {/* 1. SPORTS FACILITIES */}
      {activeTab === 'facilities' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
                Indoor &amp; Outdoor Sports Facilities
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-300">
                Flagship Event: {cfg.annualFlagshipName} · {settings.institutionName}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {facilityTypes.map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setFacilityFilter(ft)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    facilityFilter === ft
                      ? 'bg-amber-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  {ft}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleFacilities.map((fac) => (
              <article
                key={fac.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col"
              >
                <img
                  src={fac.imageUrl || '/src/assets/images/sports_complex_1794991330591.jpg'}
                  alt={fac.name}
                  className="w-full h-52 object-cover border-b border-stone-200 dark:border-slate-800"
                />
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        {fac.facilityType}
                      </span>
                      <span className="text-stone-500 dark:text-slate-400 tabular-nums">{fac.timings}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white">{fac.name}</h3>
                    {fac.dimensionsOrCapacity && (
                      <p className="text-xs font-semibold text-stone-700 dark:text-slate-200">
                        Capacity / Specs: {fac.dimensionsOrCapacity}
                      </p>
                    )}
                    <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{fac.description}</p>
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-slate-800 space-y-1.5 text-xs">
                    {fac.inchargeName && (
                      <p className="text-stone-500 dark:text-slate-400">
                        <strong>Coach / In-Charge:</strong> {fac.inchargeName}
                      </p>
                    )}
                    {fac.customFields && fac.customFields.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {fac.customFields.map((cf, i) => (
                          <div key={i} className="p-2 rounded bg-stone-50 dark:bg-slate-800/50 border border-stone-200/70 dark:border-slate-700">
                            <span className="block text-[10px] uppercase tracking-wider text-stone-500">{cf.label}</span>
                            <span className="font-semibold text-stone-900 dark:text-white">{cf.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 2. SPORTS ACTIVITIES & EVENTS */}
      {activeTab === 'events' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
              Sports Activities, Tournaments &amp; Fitness Events
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {eventTypes.map((et) => (
                <button
                  key={et}
                  type="button"
                  onClick={() => setEventFilter(et)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    eventFilter === et
                      ? 'bg-amber-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  {et}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {visibleEvents.map((ev) => (
              <article
                key={ev.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col"
              >
                <img
                  src={ev.bannerUrl || '/src/assets/images/sports_complex_1794991330591.jpg'}
                  alt={ev.title}
                  className="w-full h-44 object-cover border-b border-stone-200 dark:border-slate-800"
                />
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        {ev.eventType}
                      </span>
                      <span className="font-semibold text-stone-700 dark:text-slate-300">{ev.status}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white">{ev.title}</h3>
                    <p className="text-xs font-medium text-stone-700 dark:text-slate-200">{ev.discipline}</p>
                    <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{ev.description}</p>
                  </div>
                  <div className="pt-3 border-t border-stone-100 dark:border-slate-800 space-y-1.5 text-xs text-stone-500 dark:text-slate-400">
                    <p className="flex items-center gap-1.5 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" /> {ev.eventDate}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" /> {ev.venue}
                    </p>
                    {ev.registrationUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate
                            ? onNavigate(ev.registrationUrl!)
                            : window.open(ev.registrationUrl!, '_blank', 'noopener,noreferrer')
                        }
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        <span>Team Registration &amp; Fixture Info</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 3. STUDENT ACHIEVEMENTS */}
      {activeTab === 'achievements' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
              Student Sports Achievements (University, State, National &amp; International)
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {levels.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLevelFilter(lv)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    levelFilter === lv
                      ? 'bg-amber-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  {lv}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleAchievements.map((ach) => (
              <article
                key={ach.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start gap-3.5">
                  <img
                    src={ach.photoUrl || '/src/assets/images/sports_complex_1794991330591.jpg'}
                    alt={ach.studentOrTeamName}
                    className="w-16 h-16 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      {ach.level} Level
                    </span>
                    <h3 className="font-display text-base font-bold text-stone-900 dark:text-white">
                      {ach.studentOrTeamName}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      {ach.departmentCode} · Batch {ach.batchYear}
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 text-xs space-y-1">
                  <p className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{ach.medalOrRank}</span>
                  </p>
                  <p className="font-medium text-stone-700 dark:text-slate-200">
                    {ach.sportName} — {ach.eventName}
                  </p>
                  {ach.highlights && <p className="text-stone-600 dark:text-slate-300">{ach.highlights}</p>}
                  <p className="text-[11px] text-stone-500 tabular-nums pt-0.5">Date: {ach.eventDate}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 4. SPORTS GALLERY (PHOTOS & VIDEOS) */}
      {activeTab === 'gallery' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
              Sports Photo &amp; Video Gallery
            </h2>
            <div className="flex gap-1.5">
              {(['All', 'Photo', 'Video'] as const).map((mType) => (
                <button
                  key={mType}
                  type="button"
                  onClick={() => setGalleryFilter(mType)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    galleryFilter === mType
                      ? 'bg-amber-600 text-white border-transparent'
                      : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  {mType === 'All' ? 'All Media' : `${mType}s`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleGallery.map((g) => {
              const ytEmbed = g.mediaType === 'Video' ? toYoutubeEmbedUrl(g.mediaUrl) : null;
              return (
                <article
                  key={g.id}
                  className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
                >
                  {g.mediaType === 'Video' ? (
                    ytEmbed ? (
                      <iframe
                        src={ytEmbed}
                        title={g.title}
                        className="w-full h-64 border-b border-stone-200 dark:border-slate-800"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="relative h-56 bg-slate-950 flex items-center justify-center">
                        <img
                          src={g.thumbnailUrl || '/src/assets/images/sports_complex_1794991330591.jpg'}
                          alt={g.title}
                          className="w-full h-full object-cover opacity-60"
                        />
                        <a
                          href={g.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold"
                        >
                          <PlayCircle className="w-4 h-4" /> Watch Sports Video
                        </a>
                      </div>
                    )
                  ) : (
                    <img
                      src={g.mediaUrl}
                      alt={g.title}
                      className="w-full h-60 object-cover border-b border-stone-200 dark:border-slate-800"
                    />
                  )}
                  <div className="p-4 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        {g.mediaType} · {g.category}
                      </span>
                      <span className="tabular-nums">{g.eventDate}</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-stone-900 dark:text-white">{g.title}</h3>
                    {g.caption && <p className="text-stone-600 dark:text-slate-300">{g.caption}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. SPORTS NOTICES & UPDATES */}
      {activeTab === 'notices' && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
            Sports Notices, Selection Trials &amp; Schedules
          </h2>
          <div className="space-y-3">
            {notices.map((notice) => (
              <article
                key={notice.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {notice.isPinned && (
                      <span className="font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Pinned Circular
                      </span>
                    )}
                    <span className="font-semibold text-stone-600 dark:text-slate-300">{notice.category}</span>
                    <span className="text-stone-400 tabular-nums">· {notice.noticeDate}</span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white">{notice.title}</h3>
                  <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{notice.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {notice.attachmentUrl && (
                    <a
                      href={notice.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-slate-800"
                    >
                      Download Circular PDF
                    </a>
                  )}
                  {notice.registrationLink && (
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate
                          ? onNavigate(notice.registrationLink!)
                          : window.open(notice.registrationLink!, '_blank', 'noopener,noreferrer')
                      }
                      className="px-3.5 py-2 rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                      Register / Enquire &rarr;
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
