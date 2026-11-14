import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  Calendar,
  Check,
  Edit3,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { ImageUploader } from './ImageUploader';
import type {
  AlumniApprovalStatus,
  AlumniData,
  AlumniEventChapter,
  AlumniJob,
  AlumniJobStatus,
  AlumniJobType,
  AlumniProfile,
  Department,
  SiteSettings,
} from '../types/cms';

interface AlumniAdminPanelProps {
  alumni: AlumniData;
  departments: Department[];
  settings: SiteSettings;
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  uploadBinary: (file: File) => Promise<string>;
  notify: (type: 'ok' | 'err', text: string) => void;
}

export function AlumniAdminPanel({
  alumni,
  departments,
  settings,
  adminFetch,
  uploadBinary,
  notify,
}: AlumniAdminPanelProps) {
  const [subTab, setSubTab] = useState<'profiles' | 'jobs' | 'events' | 'settings'>('profiles');

  // Profile form state (controlled defaults)
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pYear, setPYear] = useState('2020');
  const [pDept, setPDept] = useState(departments[0]?.code || 'CSE');
  const [pDegree, setPDegree] = useState('B.Tech');
  const [pCompany, setPCompany] = useState('');
  const [pDesignation, setPDesignation] = useState('');
  const [pLocation, setPLocation] = useState('Pune, India');
  const [pChapter, setPChapter] = useState('Pune Chapter');
  const [pLinkedin, setPLinkedin] = useState('');
  const [pPhoto, setPPhoto] = useState('');
  const [pBio, setPBio] = useState('');
  const [pMentor, setPMentor] = useState(true);
  const [pFeatured, setPFeatured] = useState(false);
  const [pStatus, setPStatus] = useState<AlumniApprovalStatus>('approved');

  // Job form state
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [jTitle, setJTitle] = useState('');
  const [jCompany, setJCompany] = useState('');
  const [jLocation, setJLocation] = useState('Pune / Hybrid');
  const [jType, setJType] = useState<AlumniJobType>('Full-Time');
  const [jDept, setJDept] = useState('All Branches');
  const [jExp, setJExp] = useState('0–2 Years');
  const [jComp, setJComp] = useState('');
  const [jApply, setJApply] = useState('');
  const [jPoster, setJPoster] = useState('');
  const [jBatch, setJBatch] = useState('');
  const [jDeadline, setJDeadline] = useState('');
  const [jDesc, setJDesc] = useState('');
  const [jStatus, setJStatus] = useState<AlumniJobStatus>('open');

  // Event form state
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eChapter, setEChapter] = useState('Pandharpur Home Chapter');
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10));
  const [eVenue, setEVenue] = useState('');
  const [eOrganizer, setEOrganizer] = useState('');
  const [eBanner, setEBanner] = useState('/src/assets/images/campus_convocation_1794512597749.jpg');
  const [eRegUrl, setERegUrl] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eActive, setEActive] = useState(true);

  // Alumni portal settings state
  const [cfg, setCfg] = useState(alumni.settings);

  const resetProfileForm = () => {
    setEditingProfileId(null);
    setPName('');
    setPEmail('');
    setPPhone('');
    setPYear('2020');
    setPDept(departments[0]?.code || 'CSE');
    setPDegree('B.Tech');
    setPCompany('');
    setPDesignation('');
    setPLocation('Pune, India');
    setPChapter('Pune Chapter');
    setPLinkedin('');
    setPPhoto('');
    setPBio('');
    setPMentor(true);
    setPFeatured(false);
    setPStatus('approved');
  };

  const resetJobForm = () => {
    setEditingJobId(null);
    setJTitle('');
    setJCompany('');
    setJLocation('Pune / Hybrid');
    setJType('Full-Time');
    setJDept('All Branches');
    setJExp('0–2 Years');
    setJComp('');
    setJApply('');
    setJPoster('');
    setJBatch('');
    setJDeadline('');
    setJDesc('');
    setJStatus('open');
  };

  const resetEventForm = () => {
    setEditingEventId(null);
    setETitle('');
    setEChapter('Pandharpur Home Chapter');
    setEDate(new Date().toISOString().slice(0, 10));
    setEVenue('');
    setEOrganizer('');
    setEBanner('/src/assets/images/campus_convocation_1794512597749.jpg');
    setERegUrl('');
    setEDesc('');
    setEActive(true);
  };

  const moveItem = async (
    endpoint: string,
    items: { id: number }[],
    index: number,
    dir: -1 | 1,
    label: string,
  ) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((x) => x.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await adminFetch(endpoint, 'PUT', { orderedIds: ids });
      notify('ok', `Updated display order for ${label}.`);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const pendingProfiles = alumni.profiles.filter((p) => p.status === 'pending');
  const pendingJobs = alumni.jobs.filter((j) => j.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          {
            id: 'profiles' as const,
            label: `Alumni Profiles (${alumni.profiles.length})${pendingProfiles.length ? ` · ${pendingProfiles.length} Pending` : ''}`,
            icon: <Users className="w-3.5 h-3.5" />,
          },
          {
            id: 'jobs' as const,
            label: `Jobs & Referrals (${alumni.jobs.length})${pendingJobs.length ? ` · ${pendingJobs.length} Pending` : ''}`,
            icon: <Briefcase className="w-3.5 h-3.5" />,
          },
          {
            id: 'events' as const,
            label: `Chapters & Reunions (${alumni.events.length})`,
            icon: <Calendar className="w-3.5 h-3.5" />,
          },
          {
            id: 'settings' as const,
            label: 'Alumni Portal Settings',
            icon: <Settings className="w-3.5 h-3.5" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              subTab === tab.id
                ? 'text-white'
                : 'border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800'
            }`}
            style={subTab === tab.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. PROFILES & APPROVAL QUEUE */}
      {subTab === 'profiles' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  fullName: pName,
                  email: pEmail,
                  phone: pPhone,
                  graduationYear: Number(pYear),
                  departmentCode: pDept,
                  degree: pDegree,
                  currentCompany: pCompany,
                  designation: pDesignation,
                  location: pLocation,
                  chapter: pChapter,
                  linkedinUrl: pLinkedin,
                  photoUrl: pPhoto,
                  bio: pBio,
                  openToMentorship: pMentor,
                  isFeatured: pFeatured,
                  status: pStatus,
                };
                if (editingProfileId) {
                  await adminFetch(`/api/admin/alumni/profiles/${editingProfileId}`, 'PUT', payload);
                  notify('ok', `Updated alumni profile "${pName}".`);
                } else {
                  await adminFetch('/api/admin/alumni/profiles', 'POST', payload);
                  notify('ok', `Added alumni profile "${pName}".`);
                }
                resetProfileForm();
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">
                {editingProfileId ? `Edit Alumni: ${pName}` : 'Add Alumni Profile'}
              </h2>
              {editingProfileId && (
                <button type="button" onClick={resetProfileForm} className="text-xs text-stone-500 hover:underline">
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                value={pName}
                onChange={(e) => setPName(e.target.value)}
                placeholder="Full Name *"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="email"
                required
                value={pEmail}
                onChange={(e) => setPEmail(e.target.value)}
                placeholder="Email *"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="number"
                required
                min={1998}
                max={2030}
                value={pYear}
                onChange={(e) => setPYear(e.target.value)}
                placeholder="Batch Year"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={pDept}
                onChange={(e) => setPDept(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>
                    {d.code} — {d.shortName}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={pCompany}
                onChange={(e) => setPCompany(e.target.value)}
                placeholder="Current Company *"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={pDesignation}
                onChange={(e) => setPDesignation(e.target.value)}
                placeholder="Designation *"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={pLocation}
                onChange={(e) => setPLocation(e.target.value)}
                placeholder="City / Country"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={pChapter}
                onChange={(e) => setPChapter(e.target.value)}
                placeholder="Alumni Chapter"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={pDegree}
                onChange={(e) => setPDegree(e.target.value)}
                placeholder="Degree (B.Tech / M.Tech)"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={pStatus}
                onChange={(e) => setPStatus(e.target.value as AlumniApprovalStatus)}
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="approved">Approved (Live)</option>
                <option value="pending">Pending Moderation</option>
                <option value="rejected">Rejected / Hidden</option>
              </select>
            </div>

            <input
              type="url"
              value={pLinkedin}
              onChange={(e) => setPLinkedin(e.target.value)}
              placeholder="LinkedIn URL (optional)"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />

            <ImageUploader
              label="Alumni Photo (1:1)"
              value={pPhoto}
              onChange={setPPhoto}
              uploadBinary={uploadBinary}
              aspectRatio="1:1"
              maxPhotoMb={settings.maxPhotoUploadMb ?? 2}
              autoCropEnabled={settings.autoCropImages !== false}
            />

            <textarea
              rows={2}
              value={pBio}
              onChange={(e) => setPBio(e.target.value)}
              placeholder="Short bio & mentorship focus"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />

            <div className="flex flex-wrap gap-4 text-xs">
              <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                <input type="checkbox" checked={pMentor} onChange={(e) => setPMentor(e.target.checked)} />
                <span>Open to Mentorship</span>
              </label>
              <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                <input type="checkbox" checked={pFeatured} onChange={(e) => setPFeatured(e.target.checked)} />
                <span>Featured Distinguished Alumni</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {editingProfileId ? 'Save Alumni Profile' : 'Add Alumni Profile'}
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-sm font-bold">
              Registered Alumni &amp; Verification Queue ({alumni.profiles.length})
            </h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {alumni.profiles.map((prof, idx) => (
                <div key={prof.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={prof.photoUrl}
                      alt={prof.fullName}
                      className="w-11 h-11 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-sm text-stone-900 dark:text-white">
                          {prof.fullName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            prof.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : prof.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {prof.status}
                        </span>
                        {prof.isFeatured && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700">
                            <Sparkles className="w-3 h-3" /> Featured
                          </span>
                        )}
                      </div>
                      <p className="text-stone-600 dark:text-slate-300">
                        {prof.designation} · {prof.currentCompany} ({prof.departmentCode} &rsquo;{String(prof.graduationYear).slice(-2)})
                      </p>
                      <p className="text-[11px] text-stone-400">{prof.email} · {prof.chapter}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    {prof.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch(`/api/admin/alumni/profiles/${prof.id}/status`, 'PUT', { status: 'approved' }).then(() =>
                            notify('ok', `Approved ${prof.fullName}.`),
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 text-white font-semibold"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                    )}
                    {prof.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch(`/api/admin/alumni/profiles/${prof.id}/status`, 'PUT', { status: 'rejected' }).then(() =>
                            notify('ok', `Rejected ${prof.fullName}.`),
                          )
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-300 text-rose-700 font-semibold"
                      >
                        <X className="w-3 h-3" /> Reject
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={idx === 0}
                      aria-label={`Move ${prof.fullName} up`}
                      onClick={() => moveItem('/api/admin/alumni/profiles/reorder', alumni.profiles, idx, -1, 'alumni profiles')}
                      className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === alumni.profiles.length - 1}
                      aria-label={`Move ${prof.fullName} down`}
                      onClick={() => moveItem('/api/admin/alumni/profiles/reorder', alumni.profiles, idx, 1, 'alumni profiles')}
                      className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Edit ${prof.fullName}`}
                      onClick={() => {
                        setEditingProfileId(prof.id);
                        setPName(prof.fullName);
                        setPEmail(prof.email);
                        setPPhone(prof.phone || '');
                        setPYear(String(prof.graduationYear));
                        setPDept(prof.departmentCode);
                        setPDegree(prof.degree);
                        setPCompany(prof.currentCompany);
                        setPDesignation(prof.designation);
                        setPLocation(prof.location);
                        setPChapter(prof.chapter);
                        setPLinkedin(prof.linkedinUrl || '');
                        setPPhoto(prof.photoUrl || '');
                        setPBio(prof.bio || '');
                        setPMentor(prof.openToMentorship);
                        setPFeatured(prof.isFeatured);
                        setPStatus(prof.status);
                      }}
                      className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700 inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${prof.fullName}`}
                      onClick={() =>
                        adminFetch(`/api/admin/alumni/profiles/${prof.id}`, 'DELETE').then(() =>
                          notify('ok', `Deleted ${prof.fullName}.`),
                        )
                      }
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. JOBS & INTERNSHIPS */}
      {subTab === 'jobs' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  title: jTitle,
                  company: jCompany,
                  location: jLocation,
                  jobType: jType,
                  departmentFocus: jDept,
                  experienceRange: jExp,
                  compensation: jComp,
                  applyUrlOrEmail: jApply,
                  postedByAlumniName: jPoster || 'Alumni Cell',
                  postedByBatch: jBatch,
                  deadlineDate: jDeadline,
                  description: jDesc,
                  status: jStatus,
                };
                if (editingJobId) {
                  await adminFetch(`/api/admin/alumni/jobs/${editingJobId}`, 'PUT', payload);
                  notify('ok', `Updated job "${jTitle}".`);
                } else {
                  await adminFetch('/api/admin/alumni/jobs', 'POST', payload);
                  notify('ok', `Published job "${jTitle}".`);
                }
                resetJobForm();
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">{editingJobId ? 'Edit Job Posting' : 'Post Alumni Job / Referral'}</h2>
              {editingJobId && (
                <button type="button" onClick={resetJobForm} className="text-xs text-stone-500 hover:underline">
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                required
                value={jTitle}
                onChange={(e) => setJTitle(e.target.value)}
                placeholder="Role Title *"
                className="col-span-2 px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={jCompany}
                onChange={(e) => setJCompany(e.target.value)}
                placeholder="Company Name *"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={jLocation}
                onChange={(e) => setJLocation(e.target.value)}
                placeholder="Location"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={jType}
                onChange={(e) => setJType(e.target.value as AlumniJobType)}
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Internship">Internship</option>
                <option value="Referral">Referral</option>
                <option value="Consultancy">Consultancy</option>
              </select>
              <select
                value={jDept}
                onChange={(e) => setJDept(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All Branches">All Branches</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>{d.code}</option>
                ))}
              </select>
              <input
                type="text"
                value={jExp}
                onChange={(e) => setJExp(e.target.value)}
                placeholder="Experience (0-2 yrs)"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={jComp}
                onChange={(e) => setJComp(e.target.value)}
                placeholder="Package / Stipend"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={jApply}
                onChange={(e) => setJApply(e.target.value)}
                placeholder="Apply URL or Email *"
                className="col-span-2 px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={jPoster}
                onChange={(e) => setJPoster(e.target.value)}
                placeholder="Posted By Alumni *"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={jBatch}
                onChange={(e) => setJBatch(e.target.value)}
                placeholder="Batch (e.g. 2018 CSE)"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="date"
                value={jDeadline}
                onChange={(e) => setJDeadline(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={jStatus}
                onChange={(e) => setJStatus(e.target.value as AlumniJobStatus)}
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="open">Open / Published</option>
                <option value="pending">Pending Moderation</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <textarea
              rows={3}
              value={jDesc}
              onChange={(e) => setJDesc(e.target.value)}
              placeholder="Job responsibilities, skills & referral notes"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {editingJobId ? 'Save Job Changes' : 'Publish Job Opportunity'}
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-sm font-bold">Jobs &amp; Referral Moderation ({alumni.jobs.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {alumni.jobs.map((job: AlumniJob) => (
                <div key={job.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-stone-900 dark:text-white">{job.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          job.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <p className="text-stone-600 dark:text-slate-300">
                      {job.company} · {job.jobType} · {job.location}
                    </p>
                    <p className="text-[11px] text-stone-400">
                      Posted by {job.postedByAlumniName} ({job.postedByBatch})
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    {job.status !== 'open' && (
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch(`/api/admin/alumni/jobs/${job.id}/status`, 'PUT', { status: 'open' }).then(() =>
                            notify('ok', `Published "${job.title}".`),
                          )
                        }
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                      >
                        Approve / Open
                      </button>
                    )}
                    {job.status === 'open' && (
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch(`/api/admin/alumni/jobs/${job.id}/status`, 'PUT', { status: 'closed' }).then(() =>
                            notify('ok', `Closed "${job.title}".`),
                          )
                        }
                        className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700"
                      >
                        Close
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingJobId(job.id);
                        setJTitle(job.title);
                        setJCompany(job.company);
                        setJLocation(job.location);
                        setJType(job.jobType);
                        setJDept(job.departmentFocus);
                        setJExp(job.experienceRange);
                        setJComp(job.compensation);
                        setJApply(job.applyUrlOrEmail);
                        setJPoster(job.postedByAlumniName);
                        setJBatch(job.postedByBatch);
                        setJDeadline(job.deadlineDate);
                        setJDesc(job.description);
                        setJStatus(job.status);
                      }}
                      className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete job ${job.title}`}
                      onClick={() =>
                        adminFetch(`/api/admin/alumni/jobs/${job.id}`, 'DELETE').then(() =>
                          notify('ok', `Removed job "${job.title}".`),
                        )
                      }
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. CHAPTERS & REUNIONS */}
      {subTab === 'events' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  title: eTitle,
                  chapter: eChapter,
                  eventDate: eDate,
                  venue: eVenue,
                  organizer: eOrganizer,
                  bannerUrl: eBanner,
                  registrationUrl: eRegUrl,
                  description: eDesc,
                  isActive: eActive,
                };
                if (editingEventId) {
                  await adminFetch(`/api/admin/alumni/events/${editingEventId}`, 'PUT', payload);
                  notify('ok', `Updated alumni event "${eTitle}".`);
                } else {
                  await adminFetch('/api/admin/alumni/events', 'POST', payload);
                  notify('ok', `Created alumni event "${eTitle}".`);
                }
                resetEventForm();
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">
                {editingEventId ? 'Edit Chapter / Reunion Event' : 'Add Reunion or Chapter Meet'}
              </h2>
              {editingEventId && (
                <button type="button" onClick={resetEventForm} className="text-xs text-stone-500 hover:underline">
                  Cancel
                </button>
              )}
            </div>
            <input
              type="text"
              required
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
              placeholder="Event Title *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                value={eChapter}
                onChange={(e) => setEChapter(e.target.value)}
                placeholder="Chapter Name"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="date"
                value={eDate}
                onChange={(e) => setEDate(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={eVenue}
                onChange={(e) => setEVenue(e.target.value)}
                placeholder="Venue / Hybrid Link"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={eOrganizer}
                onChange={(e) => setEOrganizer(e.target.value)}
                placeholder="Organizer"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <ImageUploader
              label="Event Banner (16:9)"
              value={eBanner}
              onChange={setEBanner}
              uploadBinary={uploadBinary}
              aspectRatio="16:9"
              maxPhotoMb={settings.maxPhotoUploadMb ?? 2}
              autoCropEnabled={settings.autoCropImages !== false}
            />
            <input
              type="url"
              value={eRegUrl}
              onChange={(e) => setERegUrl(e.target.value)}
              placeholder="Optional External Registration Link"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <textarea
              rows={3}
              value={eDesc}
              onChange={(e) => setEDesc(e.target.value)}
              placeholder="Event agenda & details"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={eActive} onChange={(e) => setEActive(e.target.checked)} />
              <span>Visible on Public Alumni Portal</span>
            </label>
            <button
              type="submit"
              className="w-full py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {editingEventId ? 'Save Event' : 'Create Chapter Event'}
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-sm font-bold">Chapter Meets &amp; Reunions ({alumni.events.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {alumni.events.map((ev: AlumniEventChapter, idx: number) => (
                <div key={ev.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-stone-900 dark:text-white">{ev.title}</p>
                    <p className="text-stone-600 dark:text-slate-300">
                      {ev.chapter} · {ev.eventDate} · {ev.rsvpCount} RSVPs
                    </p>
                    <p className="text-[11px] text-stone-400">{ev.venue}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem('/api/admin/alumni/events/reorder', alumni.events, idx, -1, 'alumni events')}
                      className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === alumni.events.length - 1}
                      onClick={() => moveItem('/api/admin/alumni/events/reorder', alumni.events, idx, 1, 'alumni events')}
                      className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-40"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventId(ev.id);
                        setETitle(ev.title);
                        setEChapter(ev.chapter);
                        setEDate(ev.eventDate);
                        setEVenue(ev.venue);
                        setEOrganizer(ev.organizer);
                        setEBanner(ev.bannerUrl);
                        setERegUrl(ev.registrationUrl || '');
                        setEDesc(ev.description);
                        setEActive(ev.isActive);
                      }}
                      className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete event ${ev.title}`}
                      onClick={() =>
                        adminFetch(`/api/admin/alumni/events/${ev.id}`, 'DELETE').then(() =>
                          notify('ok', `Deleted event "${ev.title}".`),
                        )
                      }
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. ALUMNI PORTAL SETTINGS */}
      {subTab === 'settings' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await adminFetch('/api/admin/alumni/settings', 'PUT', cfg);
              notify('ok', 'Saved Alumni Portal settings.');
            } catch (err) {
              notify('err', (err as Error).message);
            }
          }}
          className="max-w-2xl rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <h2 className="text-base font-bold">Alumni Association Configuration</h2>
          <div>
            <label className="block text-xs font-semibold mb-1">Portal Hero Heading</label>
            <input
              type="text"
              value={cfg.heroTitle}
              onChange={(e) => setCfg({ ...cfg, heroTitle: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Portal Subtitle</label>
            <textarea
              rows={2}
              value={cfg.heroSubtitle}
              onChange={(e) => setCfg({ ...cfg, heroSubtitle: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Association Reg. No.</label>
              <input
                type="text"
                value={cfg.associationRegNo}
                onChange={(e) => setCfg({ ...cfg, associationRegNo: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Coordinator Name</label>
              <input
                type="text"
                value={cfg.coordinatorName}
                onChange={(e) => setCfg({ ...cfg, coordinatorName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Coordinator Email</label>
              <input
                type="email"
                value={cfg.coordinatorEmail}
                onChange={(e) => setCfg({ ...cfg, coordinatorEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-xs font-semibold pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.allowSelfRegistration}
                onChange={(e) => setCfg({ ...cfg, allowSelfRegistration: e.target.checked })}
              />
              <span>Allow Public Alumni Self-Registration</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.allowPublicJobPosting}
                onChange={(e) => setCfg({ ...cfg, allowPublicJobPosting: e.target.checked })}
              />
              <span>Allow Alumni to Submit Job Referrals</span>
            </label>
          </div>
          <button
            type="submit"
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Save Alumni Settings
          </button>
        </form>
      )}
    </div>
  );
}
