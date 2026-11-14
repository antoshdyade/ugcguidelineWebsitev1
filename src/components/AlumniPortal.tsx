import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  GraduationCap,
  Linkedin,
  MapPin,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { filterAlumniJobs, filterAlumniProfiles } from '../lib/alumniLogic';
import { ImageUploader } from './ImageUploader';
import type {
  AlumniData,
  AlumniEventChapter,
  AlumniJob,
  AlumniJobType,
  Department,
  SiteSettings,
} from '../types/cms';

interface AlumniPortalProps {
  alumni: AlumniData;
  departments: Department[];
  settings: SiteSettings;
  initialTab?: 'directory' | 'register' | 'jobs' | 'events';
  onAlumniDataChanged: () => Promise<void>;
}

const CHAPTER_OPTIONS = [
  'Pandharpur Home Chapter',
  'Pune Chapter',
  'Bengaluru Chapter',
  'Mumbai Chapter',
  'Hyderabad Chapter',
  'Delhi NCR Chapter',
  'North America Chapter',
  'Europe & UK Chapter',
];

export function AlumniPortal({
  alumni,
  departments,
  settings,
  initialTab = 'directory',
  onAlumniDataChanged,
}: AlumniPortalProps) {
  const [activeTab, setActiveTab] = useState<'directory' | 'register' | 'jobs' | 'events'>(initialTab);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Directory Filters
  const [dirQuery, setDirQuery] = useState('');
  const [dirDept, setDirDept] = useState('All');
  const [dirBatch, setDirBatch] = useState('All');
  const [dirChapter, setDirChapter] = useState('All');
  const [mentorsOnly, setMentorsOnly] = useState(false);

  // Job Board Filters & Submission
  const [jobQuery, setJobQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState<AlumniJobType | 'All'>('All');
  const [jobDeptFilter, setJobDeptFilter] = useState('All');
  const [showPostJobForm, setShowPostJobForm] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobType, setJobType] = useState<AlumniJobType>('Full-Time');
  const [jobDeptFocus, setJobDeptFocus] = useState('All Branches');
  const [jobExp, setJobExp] = useState('0–2 Years');
  const [jobComp, setJobComp] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobApplyUrl, setJobApplyUrl] = useState('');
  const [jobPosterName, setJobPosterName] = useState('');
  const [jobPosterBatch, setJobPosterBatch] = useState('');
  const [jobDeadline, setJobDeadline] = useState('');
  const [submittingJob, setSubmittingJob] = useState(false);

  // Registration Form State (always initialized with defined strings)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regYear, setRegYear] = useState(String(new Date().getFullYear() - 2));
  const [regDeptCode, setRegDeptCode] = useState(departments[0]?.code || 'CSE');
  const [regDegree, setRegDegree] = useState('B.Tech');
  const [regCompany, setRegCompany] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regChapter, setRegChapter] = useState('Pune Chapter');
  const [regLinkedin, setRegLinkedin] = useState('');
  const [regPhotoUrl, setRegPhotoUrl] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regMentor, setRegMentor] = useState(true);
  const [submittingReg, setSubmittingReg] = useState(false);

  // RSVP local state optimistic tracking
  const [rsvpBusyId, setRsvpBusyId] = useState<number | null>(null);
  const [rsvpDoneIds, setRsvpDoneIds] = useState<number[]>([]);

  const batchYears = useMemo(() => {
    const set = new Set<number>(alumni.profiles.map((p) => p.graduationYear));
    return Array.from(set).sort((a, b) => b - a);
  }, [alumni.profiles]);

  const chaptersList = useMemo(() => {
    const set = new Set<string>(alumni.profiles.map((p) => p.chapter).filter(Boolean));
    return Array.from(set).sort();
  }, [alumni.profiles]);

  const filteredProfiles = useMemo(
    () =>
      filterAlumniProfiles(alumni.profiles, {
        query: dirQuery,
        departmentCode: dirDept,
        batchYear: dirBatch,
        chapter: dirChapter,
        mentorshipOnly: mentorsOnly,
      }),
    [alumni.profiles, dirQuery, dirDept, dirBatch, dirChapter, mentorsOnly],
  );

  const filteredJobs = useMemo(
    () =>
      filterAlumniJobs(alumni.jobs, {
        query: jobQuery,
        jobType: jobTypeFilter,
        departmentFocus: jobDeptFilter,
      }),
    [alumni.jobs, jobQuery, jobTypeFilter, jobDeptFilter],
  );

  const mentorsCount = useMemo(
    () => alumni.profiles.filter((p) => p.status === 'approved' && p.openToMentorship).length,
    [alumni.profiles],
  );

  const publicUploadPhoto = async (file: File): Promise<string> => {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read selected image file.'));
      reader.readAsDataURL(file);
    });
    const resp = await fetch('/api/public/alumni/upload-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'image/jpeg',
        base64Data,
      }),
    });
    const data = (await resp.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!resp.ok || !data.url) {
      throw new Error(data.error || 'Photo upload failed.');
    }
    return data.url;
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    setSubmittingReg(true);
    try {
      const resp = await fetch('/api/public/alumni/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regName,
          email: regEmail,
          phone: regPhone,
          graduationYear: Number(regYear),
          departmentCode: regDeptCode,
          degree: regDegree,
          currentCompany: regCompany,
          designation: regDesignation,
          location: regLocation,
          chapter: regChapter,
          linkedinUrl: regLinkedin,
          photoUrl: regPhotoUrl,
          bio: regBio,
          openToMentorship: regMentor,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!resp.ok) throw new Error(data.error || 'Registration failed.');
      setBanner({
        type: 'ok',
        text: data.message || 'Registration submitted for verification.',
      });
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegCompany('');
      setRegDesignation('');
      setRegLocation('');
      setRegLinkedin('');
      setRegPhotoUrl('');
      setRegBio('');
      await onAlumniDataChanged();
    } catch (err) {
      setBanner({ type: 'err', text: (err as Error).message });
    } finally {
      setSubmittingReg(false);
    }
  };

  const handlePublicJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    setSubmittingJob(true);
    try {
      const resp = await fetch('/api/public/alumni/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jobTitle,
          company: jobCompany,
          location: jobLocation,
          jobType,
          departmentFocus: jobDeptFocus,
          experienceRange: jobExp,
          compensation: jobComp,
          description: jobDesc,
          applyUrlOrEmail: jobApplyUrl,
          postedByAlumniName: jobPosterName,
          postedByBatch: jobPosterBatch,
          deadlineDate: jobDeadline,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!resp.ok) throw new Error(data.error || 'Job submission failed.');
      setBanner({
        type: 'ok',
        text: data.message || 'Job referral posted for admin moderation.',
      });
      setJobTitle('');
      setJobCompany('');
      setJobLocation('');
      setJobComp('');
      setJobDesc('');
      setJobApplyUrl('');
      setJobPosterName('');
      setJobPosterBatch('');
      setJobDeadline('');
      setShowPostJobForm(false);
      await onAlumniDataChanged();
    } catch (err) {
      setBanner({ type: 'err', text: (err as Error).message });
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleRsvp = async (ev: AlumniEventChapter) => {
    if (rsvpDoneIds.includes(ev.id)) return;
    setRsvpBusyId(ev.id);
    setBanner(null);
    try {
      const resp = await fetch(`/api/public/alumni/events/${ev.id}/rsvp`, { method: 'POST' });
      if (!resp.ok) throw new Error('Could not record RSVP.');
      setRsvpDoneIds((prev) => [...prev, ev.id]);
      await onAlumniDataChanged();
      setBanner({ type: 'ok', text: `RSVP confirmed for "${ev.title}".` });
    } catch (err) {
      setBanner({ type: 'err', text: (err as Error).message });
    } finally {
      setRsvpBusyId(null);
    }
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-7">
      {/* Alumni Portal Hero Banner */}
      <section
        className="rounded-2xl border border-stone-200 dark:border-slate-800 p-6 sm:p-8 text-white relative overflow-hidden"
        style={{ backgroundColor: 'var(--primary-color)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
              Alumni Association · Reg. No. {alumni.settings.associationRegNo}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight">
              {alumni.settings.heroTitle}
            </h1>
            <p className="text-sm text-white/85 leading-relaxed max-w-2xl">
              {alumni.settings.heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {alumni.settings.allowSelfRegistration && (
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register as Alumni</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-white/30 bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Briefcase className="w-4 h-4" />
                <span>Explore Jobs &amp; Referrals ({alumni.jobs.length})</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            {[
              { label: 'Verified Profiles', value: alumni.profiles.length },
              { label: 'Active Mentors', value: mentorsCount },
              { label: 'Open Opportunities', value: alumni.jobs.length },
              { label: 'Chapter Meets', value: alumni.events.length },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/10 border border-white/15 px-4 py-3 backdrop-blur-xs"
              >
                <p className="text-[11px] uppercase tracking-wider text-white/75">{stat.label}</p>
                <p className="text-2xl font-bold font-mono-tabular text-amber-300 mt-0.5">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portal Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-3">
        <div role="tablist" aria-label="Alumni Portal Sections" className="flex flex-wrap gap-2">
          {[
            { id: 'directory' as const, label: `Alumni Directory (${alumni.profiles.length})`, icon: <Users className="w-4 h-4" /> },
            { id: 'jobs' as const, label: `Jobs & Internships (${alumni.jobs.length})`, icon: <Briefcase className="w-4 h-4" /> },
            { id: 'events' as const, label: `Chapters & Reunions (${alumni.events.length})`, icon: <Calendar className="w-4 h-4" /> },
            { id: 'register' as const, label: 'Alumni Registration', icon: <UserPlus className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === t.id
                  ? 'text-white'
                  : 'border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
              }`}
              style={activeTab === t.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-stone-500 dark:text-slate-400">
          Coordinator: <strong className="text-stone-700 dark:text-slate-200">{alumni.settings.coordinatorName}</strong> ({alumni.settings.coordinatorEmail})
        </p>
      </div>

      {banner && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium ${
            banner.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* TAB 1: ALUMNI DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold mb-1">Search Name, Company or Role</label>
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="search"
                  value={dirQuery}
                  onChange={(e) => setDirQuery(e.target.value)}
                  placeholder="Microsoft, Pune, Architect..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Department</label>
              <select
                value={dirDept}
                onChange={(e) => setDirDept(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Branches</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code} — {d.shortName}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Batch Year</label>
              <select
                value={dirBatch}
                onChange={(e) => setDirBatch(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Batches</option>
                {batchYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    Class of {yr}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Chapter</label>
              <select
                value={dirChapter}
                onChange={(e) => setDirChapter(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Chapters</option>
                {chaptersList.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center h-9">
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={mentorsOnly}
                  onChange={(e) => setMentorsOnly(e.target.checked)}
                />
                <span>Mentors Only</span>
              </label>
            </div>
          </div>

          {filteredProfiles.length === 0 ? (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
              No alumni profiles matched your filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProfiles.map((prof) => (
                <article
                  key={prof.id}
                  className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 hover:border-amber-500/60 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5">
                      <img
                        src={prof.photoUrl}
                        alt={prof.fullName}
                        className="w-16 h-16 rounded-xl object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h2 className="font-bold text-base text-stone-900 dark:text-white truncate">
                            {prof.fullName}
                          </h2>
                          {prof.isFeatured && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                              <Sparkles className="w-2.5 h-2.5" /> Distinguished
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          {prof.designation}
                        </p>
                        <p className="text-xs text-stone-600 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                          <span className="truncate">{prof.currentCompany}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 font-semibold text-stone-700 dark:text-slate-200">
                        {prof.degree} · {prof.departmentCode} &rsquo;{String(prof.graduationYear).slice(-2)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {prof.location}
                      </span>
                      {prof.openToMentorship && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold">
                          Open to Mentor
                        </span>
                      )}
                    </div>

                    {prof.bio && (
                      <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {prof.bio}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-stone-500 dark:text-slate-400">{prof.chapter}</span>
                    <div className="flex items-center gap-2">
                      {prof.linkedinUrl && (
                        <a
                          href={prof.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-400 hover:underline"
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                      {prof.websiteUrl && (
                        <a
                          href={prof.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-stone-700 dark:text-slate-300 hover:underline"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Web</span>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: JOB & INTERNSHIP BOARD */}
      {activeTab === 'jobs' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <input
                type="search"
                value={jobQuery}
                onChange={(e) => setJobQuery(e.target.value)}
                placeholder="Search role, company or skill..."
                className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 min-w-[210px]"
              />
              <select
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value as AlumniJobType | 'All')}
                className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Opportunity Types</option>
                <option value="Full-Time">Full-Time</option>
                <option value="Internship">Internship</option>
                <option value="Referral">Alumni Referral</option>
                <option value="Consultancy">Consultancy / Project</option>
              </select>
              <select
                value={jobDeptFilter}
                onChange={(e) => setJobDeptFilter(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Branches</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </select>
            </div>
            {alumni.settings.allowPublicJobPosting && (
              <button
                type="button"
                onClick={() => setShowPostJobForm((v) => !v)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {showPostJobForm ? 'Close Job Form' : '+ Post Job / Referral'}
              </button>
            )}
          </div>

          {showPostJobForm && alumni.settings.allowPublicJobPosting && (
            <form
              onSubmit={handlePublicJobSubmit}
              className="rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <h2 className="text-base font-bold">Share Job Opening / Alumni Referral with Students &amp; Graduates</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Role / Position Title *</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Software Development Engineer I"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    value={jobCompany}
                    onChange={(e) => setJobCompany(e.target.value)}
                    placeholder="Infosys / Tata Technologies"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    placeholder="Pune / Hybrid"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Opportunity Type</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as AlumniJobType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Referral">Alumni Referral</option>
                    <option value="Consultancy">Consultancy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Target Department</label>
                  <select
                    value={jobDeptFocus}
                    onChange={(e) => setJobDeptFocus(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="All Branches">All Branches</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.code}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Experience / Eligibility</label>
                  <input
                    type="text"
                    value={jobExp}
                    onChange={(e) => setJobExp(e.target.value)}
                    placeholder="0–2 Years / Final Year"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Salary / Stipend</label>
                  <input
                    type="text"
                    value={jobComp}
                    onChange={(e) => setJobComp(e.target.value)}
                    placeholder="₹7.5 LPA / ₹25,000 mo"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Apply Link or Referral Email *</label>
                  <input
                    type="text"
                    required
                    value={jobApplyUrl}
                    onChange={(e) => setJobApplyUrl(e.target.value)}
                    placeholder="https://careers... or mailto:..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Last Date to Apply</label>
                  <input
                    type="date"
                    value={jobDeadline}
                    onChange={(e) => setJobDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Your Name (Alumni) *</label>
                  <input
                    type="text"
                    required
                    value={jobPosterName}
                    onChange={(e) => setJobPosterName(e.target.value)}
                    placeholder="Rohan Deshmukh"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Your Batch &amp; Branch</label>
                  <input
                    type="text"
                    value={jobPosterBatch}
                    onChange={(e) => setJobPosterBatch(e.target.value)}
                    placeholder="2018 CSE"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Role Description &amp; Required Skills</label>
                <textarea
                  rows={3}
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={submittingJob}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {submittingJob ? 'Submitting...' : 'Submit Job for Admin Verification'}
              </button>
            </form>
          )}

          {filteredJobs.length === 0 ? (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
              No active job postings match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredJobs.map((job) => {
                const href = job.applyUrlOrEmail.includes('@') && !job.applyUrlOrEmail.startsWith('http') && !job.applyUrlOrEmail.startsWith('mailto:')
                  ? `mailto:${job.applyUrlOrEmail}`
                  : job.applyUrlOrEmail;
                return (
                  <article
                    key={job.id}
                    className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-bold mb-1">
                            {job.jobType} · {job.departmentFocus}
                          </span>
                          <h3 className="font-bold text-base text-stone-900 dark:text-white">
                            {job.title}
                          </h3>
                          <p className="text-xs font-semibold text-stone-600 dark:text-slate-300">
                            {job.company} · {job.location}
                          </p>
                        </div>
                        {job.compensation && (
                          <span className="text-xs font-bold font-mono-tabular px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                            {job.compensation}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                        {job.description}
                      </p>
                      <div className="flex flex-wrap gap-3 text-[11px] text-stone-500 dark:text-slate-400">
                        <span>Experience: <strong>{job.experienceRange}</strong></span>
                        {job.deadlineDate && <span>Deadline: <strong className="tabular-nums">{job.deadlineDate}</strong></span>}
                        <span>Posted by: <strong>{job.postedByAlumniName}</strong> {job.postedByBatch ? `(${job.postedByBatch})` : ''}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400 tabular-nums">Posted {job.postedAt}</span>
                      <a
                        href={href}
                        target={href.startsWith('http') ? '_blank' : undefined}
                        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        <span>Apply / Contact Alumni</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHAPTERS & REUNIONS */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {alumni.events.map((ev) => {
            const alreadyRsvped = rsvpDoneIds.includes(ev.id);
            return (
              <article
                key={ev.id}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-stone-100 dark:bg-slate-800 overflow-hidden">
                    <img src={ev.bannerUrl} alt={ev.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                        {ev.chapter}
                      </span>
                      <span className="font-mono-tabular font-semibold text-stone-600 dark:text-slate-300">
                        {ev.eventDate}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-stone-900 dark:text-white leading-snug">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                      {ev.description}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      <strong>Venue:</strong> {ev.venue}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-slate-400">
                      <strong>Organizer:</strong> {ev.organizer}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3.5 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold font-mono-tabular text-stone-600 dark:text-slate-300">
                    {ev.rsvpCount} Attending
                  </span>
                  <div className="flex items-center gap-2">
                    {ev.registrationUrl && (
                      <a
                        href={ev.registrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-slate-800"
                      >
                        External Link
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={rsvpBusyId === ev.id || alreadyRsvped}
                      onClick={() => handleRsvp(ev)}
                      className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        alreadyRsvped
                          ? 'bg-emerald-600 text-white'
                          : 'text-white'
                      }`}
                      style={alreadyRsvped ? undefined : { backgroundColor: 'var(--primary-color)' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{alreadyRsvped ? 'RSVP Confirmed' : rsvpBusyId === ev.id ? 'Saving...' : 'Count Me In'}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* TAB 4: SELF-SERVICE ALUMNI REGISTRATION */}
      {activeTab === 'register' && (
        <div className="max-w-3xl mx-auto rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          {!alumni.settings.allowSelfRegistration ? (
            <div className="text-center py-6 space-y-2">
              <GraduationCap className="w-8 h-8 mx-auto text-amber-600" />
              <h2 className="font-bold text-lg">Online Registration Currently Paused</h2>
              <p className="text-xs text-stone-500">
                Please contact the Alumni Coordinator ({alumni.settings.coordinatorEmail}) for manual membership verification.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegistrationSubmit} className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                  Register with {settings.shortCode} Alumni Association
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Submitted profiles undergo verification by the Alumni Coordinator before going live on the directory.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="reg-fullname" className="block text-xs font-semibold mb-1">Full Name *</label>
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Priya Deshpande"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold mb-1">Email Address *</label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="priya@company.com"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="reg-phone" className="block text-xs font-semibold mb-1">Phone / WhatsApp</label>
                  <input
                    id="reg-phone"
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91-98..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="reg-year" className="block text-xs font-semibold mb-1">Batch Year *</label>
                    <input
                      id="reg-year"
                      type="number"
                      min={1998}
                      max={new Date().getFullYear() + 2}
                      required
                      value={regYear}
                      onChange={(e) => setRegYear(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-degree" className="block text-xs font-semibold mb-1">Degree</label>
                    <input
                      id="reg-degree"
                      type="text"
                      value={regDegree}
                      onChange={(e) => setRegDegree(e.target.value)}
                      placeholder="B.Tech / M.Tech / MBA"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="reg-dept" className="block text-xs font-semibold mb-1">Graduation Department *</label>
                  <select
                    id="reg-dept"
                    value={regDeptCode}
                    onChange={(e) => setRegDeptCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="reg-chapter" className="block text-xs font-semibold mb-1">Preferred Alumni Chapter</label>
                  <select
                    id="reg-chapter"
                    value={regChapter}
                    onChange={(e) => setRegChapter(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {CHAPTER_OPTIONS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="reg-company" className="block text-xs font-semibold mb-1">Current Company / Organization *</label>
                  <input
                    id="reg-company"
                    type="text"
                    required
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    placeholder="TCS / Persistent / Self-Employed"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="reg-role" className="block text-xs font-semibold mb-1">Current Designation *</label>
                  <input
                    id="reg-role"
                    type="text"
                    required
                    value={regDesignation}
                    onChange={(e) => setRegDesignation(e.target.value)}
                    placeholder="Senior Software Engineer"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="reg-loc" className="block text-xs font-semibold mb-1">Current City &amp; Country</label>
                  <input
                    id="reg-loc"
                    type="text"
                    value={regLocation}
                    onChange={(e) => setRegLocation(e.target.value)}
                    placeholder="Pune, India"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="reg-linkedin" className="block text-xs font-semibold mb-1">LinkedIn Profile URL</label>
                  <input
                    id="reg-linkedin"
                    type="url"
                    value={regLinkedin}
                    onChange={(e) => setRegLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <ImageUploader
                label="Profile Photo (Optional, 1:1 Auto-Crop)"
                value={regPhotoUrl}
                onChange={setRegPhotoUrl}
                uploadBinary={publicUploadPhoto}
                aspectRatio="1:1"
                maxPhotoMb={settings.maxPhotoUploadMb ?? 2}
                autoCropEnabled={settings.autoCropImages !== false}
                placeholder="Or paste external image URL"
              />

              <div>
                <label htmlFor="reg-bio" className="block text-xs font-semibold mb-1">Career Summary / How You Would Like to Help</label>
                <textarea
                  id="reg-bio"
                  rows={3}
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  placeholder="Briefly share your career journey, expertise, or areas where you can mentor students..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={regMentor}
                  onChange={(e) => setRegMentor(e.target.checked)}
                />
                <span>Available to mentor final-year students &amp; provide mock interviews</span>
              </label>

              <div>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {submittingReg ? 'Submitting Registration...' : 'Submit Alumni Registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export arrow icons just so unused import lint stays clean if needed
export { ArrowUp, ArrowDown };
