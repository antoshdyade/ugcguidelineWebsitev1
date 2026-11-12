import React from 'react';
import { ChevronRight, FlaskConical, Mail, Users } from 'lucide-react';
import type { Department } from '../types/cms';

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

        <main className="lg:col-span-9 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
          {activeSub === 'faculty' ? (
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white mb-1">
                Department Faculty &amp; Staff Directory
              </h2>
              <p className="text-xs text-stone-500 dark:text-slate-400 mb-6">
                UGC Section 5(c) · Department-wise Faculty Particulars with Photographs
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dept.faculty.map((fac) => (
                  <div
                    key={fac.id}
                    className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 flex items-start gap-4"
                  >
                    <img
                      src={fac.photoUrl}
                      alt={fac.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold" style={{ color: 'var(--secondary-color)' }}>
                        {fac.designation}
                      </p>
                      <h3 className="text-base font-bold text-stone-900 dark:text-white">
                        {fac.name}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-slate-300">
                        {fac.qualification} · {fac.experienceYears} yrs experience
                      </p>
                      <p className="text-xs text-stone-500 dark:text-slate-400">
                        Specialization: {fac.specialization}
                      </p>
                      {fac.email && (
                        <p className="text-xs text-stone-600 dark:text-slate-300 inline-flex items-center gap-1 pt-1">
                          <Mail className="w-3 h-3" /> {fac.email}
                        </p>
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
                Equipment specifications, carpet area, and faculty-in-charge
              </p>
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
                    {dept.labs.map((lab) => (
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
            <div>
              <div className="pb-4 mb-5 border-b border-stone-200 dark:border-slate-800">
                <p className="text-xs text-stone-500 dark:text-slate-400 mb-1">
                  {dept.name} · Sub-Page
                </p>
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
                  {currentSubPage?.title || 'Department Overview'}
                </h2>
              </div>
              <div
                className="cms-prose text-stone-700 dark:text-slate-200"
                dangerouslySetInnerHTML={{
                  __html: currentSubPage?.contentHtml || `<p>${dept.overview}</p>`,
                }}
              />
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
    </div>
  );
}
