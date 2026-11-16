import React, { useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Download,
  ExternalLink,
  FlaskConical,
  Mail,
  Phone,
  Users,
  X,
} from 'lucide-react';
import { sortByOrder } from '../lib/cmsLogic';
import { CmsHtmlContent } from './CmsHtmlContent';
import type { Department, DepartmentSubPagePhoto } from '../types/cms';

interface DepartmentMicrositeProps {
  departments: Department[];
  deptSlug: string;
  subSlug?: string;
  onNavigate: (path: string) => void;
}

export function DepartmentMicrosite({
  departments,
  deptSlug,
  subSlug = 'about',
  onNavigate,
}: DepartmentMicrositeProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<DepartmentSubPagePhoto | null>(null);
  const dept = departments.find((d) => d.slug === deptSlug) || departments[0];
  if (!dept) return null;

  const activeSub =
    subSlug === 'faculty' || subSlug === 'laboratories'
      ? subSlug
      : dept.subPages.find((s) => s.slug === subSlug)?.slug || dept.subPages[0]?.slug || 'about';

  const currentSubPage = dept.subPages.find((s) => s.slug === activeSub);

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb + Department Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav aria-label="Department Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400">
          <button type="button" onClick={() => onNavigate('/')} className="hover:underline">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Departments</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-stone-800 dark:text-slate-200">{dept.name}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-1.5">
          {departments.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onNavigate(`/department/${d.slug}`)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                d.id === dept.id
                  ? 'text-white border-transparent'
                  : 'border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
              style={d.id === dept.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
            >
              {d.code}
            </button>
          ))}
        </div>
      </div>

      {/* Department Hero Banner */}
      <section className="relative rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-slate-900 min-h-[220px] flex items-end">
        <img
          src={dept.heroImageUrl}
          alt={dept.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent" />
        <div className="relative z-10 p-6 sm:p-8 text-white w-full flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-300 mb-1 tabular-nums">
              Department Microsite · Est. {dept.establishedYear} · {dept.nbaStatus}
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold">{dept.name}</h1>
          </div>
          <div className="text-xs sm:text-sm text-slate-200 tabular-nums">
            <p>Head of Department: <strong>{dept.hodName}</strong></p>
            <p>Sanctioned Intake: {dept.intakeCapacity} Seats</p>
          </div>
        </div>
      </section>

      {/* Dedicated Department Microsite Sidebar + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400 px-2 mb-3">
            {dept.shortName} Navigation
          </p>
          <ul className="space-y-1">
            {dept.subPages
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((sp) => {
                const isActive = activeSub === sp.slug;
                return (
                  <li key={sp.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/department/${dept.slug}/${sp.slug}`)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'text-white font-semibold'
                          : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                      }`}
                      style={isActive ? { backgroundColor: 'var(--primary-color)' } : undefined}
                    >
                      {sp.title}
                    </button>
                  </li>
                );
              })}
            <li>
              <button
                type="button"
                onClick={() => onNavigate(`/department/${dept.slug}/faculty`)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  activeSub === 'faculty'
                    ? 'text-white font-semibold'
                    : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`}
                style={activeSub === 'faculty' ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                <Users className="w-4 h-4" />
                <span>Faculty &amp; Staff ({dept.faculty.length})</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate(`/department/${dept.slug}/laboratories`)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  activeSub === 'laboratories'
                    ? 'text-white font-semibold'
                    : 'text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800'
                }`}
                style={activeSub === 'laboratories' ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Laboratories ({dept.labs.length})</span>
              </button>
            </li>
          </ul>
        </aside>

        <main className="lg:col-span-9 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
          {activeSub === 'faculty' ? (
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white mb-1">
                Department Faculty &amp; Staff Directory
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mb-6">
                Department Qualifications, Experience, Area of Expertise &amp; External Research Profiles
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortByOrder(dept.faculty).map((fac, idx) => (
                  <div
                    key={fac.id}
                    className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 flex items-start gap-4 bg-stone-50/40 dark:bg-slate-800/30"
                  >
                    <img
                      src={fac.photoUrl}
                      alt={fac.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold" style={{ color: 'var(--secondary-color)' }}>
                            {fac.designation}
                          </p>
                          <span className="text-[11px] font-mono-tabular font-semibold px-2 py-0.5 rounded bg-stone-200/70 dark:bg-slate-700 text-stone-700 dark:text-slate-200 shrink-0">
                            Sr. No. {fac.sortOrder ?? idx + 1}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-stone-900 dark:text-white">
                          {fac.name}
                        </h3>
                      </div>
                      <p className="text-xs text-stone-700 dark:text-slate-200 tabular-nums">
                        {fac.qualification} · {fac.experienceYears} yrs experience
                      </p>
                      <p className="text-xs text-stone-600 dark:text-slate-300">
                        <strong className="text-stone-800 dark:text-slate-200">Area of Expertise:</strong>{' '}
                        {fac.specialization}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600 dark:text-slate-300">
                        {fac.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0" /> {fac.email}
                          </span>
                        )}
                        {fac.phone && (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Phone className="w-3 h-3 shrink-0" /> {fac.phone}
                          </span>
                        )}
                      </div>

                      {fac.customFields && fac.customFields.length > 0 && (
                        <dl className="pt-2 mt-2 border-t border-stone-200 dark:border-slate-700/70 space-y-1">
                          {fac.customFields.map((cf) => (
                            <div key={cf.id} className="text-xs">
                              <dt className="inline font-semibold text-stone-800 dark:text-slate-200">
                                {cf.label}:{' '}
                              </dt>
                              <dd className="inline text-stone-600 dark:text-slate-300 break-words">
                                {cf.fieldType === 'url' || /^https?:\/\//i.test(cf.value) ? (
                                  <a
                                    href={cf.value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 hover:underline font-medium"
                                    style={{ color: 'var(--primary-color)' }}
                                  >
                                    <span>View Link</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  cf.value
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {fac.externalProfileUrl && (
                        <div className="pt-1.5">
                          <a
                            href={fac.externalProfileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-stone-300 dark:border-slate-600 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-slate-800"
                            style={{ color: 'var(--primary-color)' }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>{fac.externalProfileLabel || 'External Profile'}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeSub === 'laboratories' ? (
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white mb-1">
                Departmental Laboratories &amp; Infrastructure
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mb-6">
                Equipment specifications, carpet area, photographs, and faculty-in-charge
              </p>

              {dept.labs.some((l) => l.photoUrl) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {dept.labs
                    .filter((l) => l.photoUrl)
                    .map((lab) => (
                      <div
                        key={`photo-${lab.id}`}
                        className="rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/50"
                      >
                        <img
                          src={lab.photoUrl}
                          alt={lab.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-44 object-cover"
                        />
                        <div className="p-3">
                          <p className="text-sm font-bold text-stone-900 dark:text-white">{lab.name}</p>
                          <p className="text-xs text-stone-500 dark:text-slate-400">
                            {lab.areaSqFt} sq. ft. · In-charge: {lab.incharge}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-left">
                      <th className="py-2.5 px-3 font-semibold">Laboratory Name</th>
                      <th className="py-2.5 px-3 font-semibold tabular-nums">Area (Sq. Ft.)</th>
                      <th className="py-2.5 px-3 font-semibold">Major Equipment</th>
                      <th className="py-2.5 px-3 font-semibold">Lab In-Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                    {sortByOrder(dept.labs).map((lab) => (
                      <tr key={lab.id}>
                        <td className="py-3 px-3 font-medium text-stone-900 dark:text-white">{lab.name}</td>
                        <td className="py-3 px-3 tabular-nums">{lab.areaSqFt}</td>
                        <td className="py-3 px-3 text-stone-600 dark:text-slate-300">{lab.equipmentSummary}</td>
                        <td className="py-3 px-3 text-stone-600 dark:text-slate-300">{lab.incharge}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="pb-4 border-b border-stone-200 dark:border-slate-800">
                <p className="text-xs text-stone-500 dark:text-slate-400 mb-1">
                  {dept.name} · {currentSubPage?.pageType ? currentSubPage.pageType.replace(/_/g, ' ').toUpperCase() : 'Sub-Page'}
                </p>
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
                  {currentSubPage?.title || 'Department Overview'}
                </h2>
              </div>

              {/* Department Library Highlight Card */}
              {(currentSubPage?.pageType === 'library' || activeSub === 'department-library') && dept.library && (
                <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 overflow-hidden grid grid-cols-1 md:grid-cols-12">
                  {dept.library.photoUrl && (
                    <div className="md:col-span-5 min-h-[200px]">
                      <img
                        src={dept.library.photoUrl}
                        alt={dept.library.title || `${dept.shortName} Library`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className={`${dept.library.photoUrl ? 'md:col-span-7' : 'md:col-span-12'} p-5 space-y-3`}>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>
                      <BookOpen className="w-4 h-4" />
                      <span>Department Library</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white">
                      {dept.library.title || `${dept.shortName} Departmental Library`}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                      {dept.library.description}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-200 dark:border-slate-700 text-xs">
                      {dept.library.totalVolumes !== undefined && (
                        <div>
                          <p className="text-stone-500 dark:text-slate-400">Volumes</p>
                          <p className="font-bold text-stone-900 dark:text-white tabular-nums">{dept.library.totalVolumes}</p>
                        </div>
                      )}
                      {dept.library.seatingCapacity !== undefined && (
                        <div>
                          <p className="text-stone-500 dark:text-slate-400">Seating</p>
                          <p className="font-bold text-stone-900 dark:text-white tabular-nums">{dept.library.seatingCapacity} Seats</p>
                        </div>
                      )}
                      {dept.library.incharge && (
                        <div>
                          <p className="text-stone-500 dark:text-slate-400">In-Charge</p>
                          <p className="font-semibold text-stone-900 dark:text-white truncate">{dept.library.incharge}</p>
                        </div>
                      )}
                      {dept.library.timings && (
                        <div>
                          <p className="text-stone-500 dark:text-slate-400">Timings</p>
                          <p className="font-semibold text-stone-900 dark:text-white">{dept.library.timings}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <CmsHtmlContent
                html={currentSubPage?.contentHtml || `<p>${dept.overview}</p>`}
                className="text-stone-700 dark:text-slate-200"
                onNavigate={onNavigate}
              />

              {/* Structured Items Feed (Notice Board, Events, Notes & Syllabus, Achievements) */}
              {currentSubPage?.items && currentSubPage.items.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-slate-200">
                    {currentSubPage.pageType === 'notes_syllabus'
                      ? 'Downloads, Syllabus & Google Drive Resources'
                      : currentSubPage.pageType === 'notice_board'
                      ? 'Active Department Notices & Circulars'
                      : 'Records, Highlights & Links'}
                  </h3>
                  <div className="space-y-3">
                    {currentSubPage.items.map((item) => {
                      const isExternal = item.sourceType === 'external' || (item.url ? /^https?:\/\//i.test(item.url) : false);
                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className="w-20 h-16 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                              />
                            )}
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-slate-400 tabular-nums">
                                {item.badge && (
                                  <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--secondary-color)' }}>
                                    {item.badge}
                                  </span>
                                )}
                                {item.date && <span>{item.date}</span>}
                              </div>
                              <h4 className="text-sm font-bold text-stone-900 dark:text-white">{item.title}</h4>
                              {item.description && (
                                <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">{item.description}</p>
                              )}
                            </div>
                          </div>

                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white shrink-0 self-start sm:self-center"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            >
                              {isExternal ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                              <span>{isExternal ? 'Open Drive / Link' : 'Download PDF'}</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-page Photo Gallery Grid (Gallery, Celebrations, Events, Library Photos) */}
              {currentSubPage?.photos && currentSubPage.photos.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700 dark:text-slate-200">
                    Photo Gallery ({currentSubPage.photos.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentSubPage.photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setLightboxPhoto(photo)}
                        className="group text-left rounded-xl overflow-hidden border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40"
                      >
                        <div className="h-44 overflow-hidden bg-stone-200 dark:bg-slate-800">
                          <img
                            src={photo.imageUrl}
                            alt={photo.caption || currentSubPage.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        {photo.caption && (
                          <p className="p-3 text-xs font-medium text-stone-700 dark:text-slate-200">
                            {photo.caption}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeSub === 'about' && (
                <div className="mt-8 pt-6 border-t border-stone-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 rounded-lg bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-1.5">
                      Department Vision
                    </h3>
                    <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">{dept.vision}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-stone-50 dark:bg-slate-800/60 border border-stone-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-1.5">
                      Department Mission
                    </h3>
                    <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">{dept.mission}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Lightbox Modal for Department Photos */}
      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Department photo preview"
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">
                {lightboxPhoto.caption || dept.name}
              </p>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                aria-label="Close photo"
                className="p-1.5 rounded-lg border border-stone-200 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxPhoto.imageUrl}
              alt={lightboxPhoto.caption || dept.name}
              className="w-full max-h-[75vh] object-contain bg-slate-950"
            />
          </div>
        </div>
      )}
    </div>
  );
}
