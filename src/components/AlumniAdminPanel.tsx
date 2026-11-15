import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Briefcase,
  Calendar,
  Check,
  Edit3,
  HeartHandshake,
  MessageSquare,
  Pin,
  Settings,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  ALUMNI_CHAPTER_PRESETS,
  ALUMNI_DEGREE_PRESETS,
  ALUMNI_JOB_TYPE_PRESETS,
} from '../lib/collegeFeaturesLogic';
import { CustomSelectInput } from './CustomSelectInput';
import { ImageUploader } from './ImageUploader';
import type {
  AlumniAchiever,
  AlumniApprovalStatus,
  AlumniData,
  AlumniDiscussionTopic,
  AlumniEventChapter,
  AlumniJob,
  AlumniJobStatus,
  AlumniJobType,
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
  const [subTab, setSubTab] = useState<
    'profiles' | 'achievers' | 'jobs' | 'events' | 'discussions' | 'pledges' | 'settings'
  >('profiles');

  // Profile form state (controlled defaults)
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPassword, setPPassword] = useState('');
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

  // Discussion topic management & moderation state
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tActive, setTActive] = useState(true);
  const [dTopicFilter, setDTopicFilter] = useState<number | 'ALL'>('ALL');
  const [dStatusFilter, setDStatusFilter] = useState<'ALL' | AlumniApprovalStatus>('ALL');

  // Distinguished Achievers form state
  const [achName, setAchName] = useState('');
  const [achYear, setAchYear] = useState('2015');
  const [achDept, setAchDept] = useState(departments[0]?.code || 'CSE');
  const [achDesig, setAchDesig] = useState('');
  const [achOrg, setAchOrg] = useState('');
  const [achAward, setAchAward] = useState('');
  const [achCitation, setAchCitation] = useState('');
  const [achPhoto, setAchPhoto] = useState('/src/assets/images/leadership_principal_1794512597061.jpg');

  // Alumni portal settings state (strictly controlled primitives)
  const normalizeCfg = (raw: AlumniData['settings']) => ({
    heroTitle: raw.heroTitle ?? '',
    heroSubtitle: raw.heroSubtitle ?? '',
    associationRegNo: raw.associationRegNo ?? '',
    coordinatorName: raw.coordinatorName ?? '',
    coordinatorEmail: raw.coordinatorEmail ?? '',
    allowSelfRegistration: Boolean(raw.allowSelfRegistration),
    allowPublicJobPosting: Boolean(raw.allowPublicJobPosting),
    enableDiscussions: raw.enableDiscussions !== false,
    requireDiscussionApproval: Boolean(raw.requireDiscussionApproval),
  });
  const [cfg, setCfg] = useState(() => normalizeCfg(alumni.settings));
  useEffect(() => {
    setCfg(normalizeCfg(alumni.settings));
  }, [alumni.settings]);

  const resetProfileForm = () => {
    setEditingProfileId(null);
    setPName('');
    setPEmail('');
    setPPassword('');
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

  const resetTopicForm = () => {
    setEditingTopicId(null);
    setTTitle('');
    setTDesc('');
    setTActive(true);
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
  const discussionTopics = alumni.discussionTopics ?? [];
  const discussions = alumni.discussions ?? [];
  const pendingPosts = discussions.filter((p) => p.status === 'pending');
  const achievers = alumni.achievers ?? [];
  const pledges = alumni.pledges ?? [];

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
            id: 'achievers' as const,
            label: `Achievers (${achievers.length})`,
            icon: <Award className="w-3.5 h-3.5" />,
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
            id: 'pledges' as const,
            label: `Endowment Pledges (${pledges.length})`,
            icon: <HeartHandshake className="w-3.5 h-3.5" />,
          },
          {
            id: 'discussions' as const,
            label: `Discussions & Topics (${discussions.length})${pendingPosts.length ? ` · ${pendingPosts.length} Pending` : ''}`,
            icon: <MessageSquare className="w-3.5 h-3.5" />,
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
                const payload: Record<string, unknown> = {
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
                  if (pPassword.trim()) payload.newPassword = pPassword.trim();
                  await adminFetch(`/api/admin/alumni/profiles/${editingProfileId}`, 'PUT', payload);
                  notify('ok', `Updated alumni profile "${pName}".`);
                } else {
                  if (pPassword.trim()) payload.password = pPassword.trim();
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
              <CustomSelectInput
                ariaLabel="Alumni Chapter"
                value={pChapter}
                onChange={setPChapter}
                options={[...ALUMNI_CHAPTER_PRESETS]}
                customPlaceholder="Custom Alumni Chapter..."
              />
              <CustomSelectInput
                ariaLabel="Degree"
                value={pDegree}
                onChange={setPDegree}
                options={[...ALUMNI_DEGREE_PRESETS]}
                customPlaceholder="Custom Degree..."
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
            <input
              type="password"
              value={pPassword}
              onChange={(e) => setPPassword(e.target.value)}
              minLength={6}
              placeholder={
                editingProfileId
                  ? 'Reset Alumni Portal Password (leave blank to keep unchanged)'
                  : 'Alumni Portal Password (min 6 chars, default Alumni@123)'
              }
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
                        setPPassword('');
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
              <CustomSelectInput
                ariaLabel="Job Type"
                value={jType}
                onChange={setJType}
                options={[...ALUMNI_JOB_TYPE_PRESETS]}
                customPlaceholder="Custom Opportunity Type..."
              />
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

      {/* 4. DISCUSSIONS & TOPICS MODERATION (MEMBERS-ONLY BLOGGER FORUM) */}
      {subTab === 'discussions' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5 space-y-5">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const payload = {
                    title: tTitle.trim(),
                    description: tDesc.trim(),
                    isActive: tActive,
                  };
                  if (editingTopicId) {
                    await adminFetch(`/api/admin/alumni/topics/${editingTopicId}`, 'PUT', payload);
                    notify('ok', `Updated topic "${tTitle}".`);
                  } else {
                    await adminFetch('/api/admin/alumni/topics', 'POST', payload);
                    notify('ok', `Created discussion topic "${tTitle}".`);
                  }
                  resetTopicForm();
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">
                  {editingTopicId ? `Edit Topic: ${tTitle}` : 'Create Discussion Topic'}
                </h2>
                {editingTopicId && (
                  <button type="button" onClick={resetTopicForm} className="text-xs text-stone-500 hover:underline">
                    Cancel Edit
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={tTitle}
                onChange={(e) => setTTitle(e.target.value)}
                placeholder="Topic Title * (e.g., AI & Cloud Engineering)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <textarea
                rows={2}
                value={tDesc}
                onChange={(e) => setTDesc(e.target.value)}
                placeholder="Topic description & guidelines for alumni authors"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input type="checkbox" checked={tActive} onChange={(e) => setTActive(e.target.checked)} />
                <span>Active (Visible to Logged-in Alumni)</span>
              </label>
              <button
                type="submit"
                className="w-full py-2 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {editingTopicId ? 'Save Topic Changes' : 'Add Discussion Topic'}
              </button>
            </form>

            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-bold">Discussion Topics ({discussionTopics.length})</h3>
              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {discussionTopics.map((topic: AlumniDiscussionTopic) => (
                  <div key={topic.id} className="py-2.5 flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 dark:text-white">{topic.title}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            topic.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-stone-200 text-stone-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {topic.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      {topic.description && (
                        <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">{topic.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch(`/api/admin/alumni/topics/${topic.id}`, 'PUT', {
                            isActive: !topic.isActive,
                          }).then(() => notify('ok', `${topic.isActive ? 'Hid' : 'Activated'} "${topic.title}".`))
                        }
                        className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                      >
                        {topic.isActive ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTopicId(topic.id);
                          setTTitle(topic.title);
                          setTDesc(topic.description);
                          setTActive(topic.isActive);
                        }}
                        className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete topic ${topic.title}`}
                        onClick={() =>
                          adminFetch(`/api/admin/alumni/topics/${topic.id}`, 'DELETE').then(() =>
                            notify('ok', `Deleted topic "${topic.title}".`),
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

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold">
                Members-Only Blogger Articles &amp; Thread Moderation ({discussions.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                <select
                  value={dTopicFilter}
                  onChange={(e) => setDTopicFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  aria-label="Filter discussions by topic"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="ALL">All Topics</option>
                  {discussionTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <select
                  value={dStatusFilter}
                  onChange={(e) => setDStatusFilter(e.target.value as 'ALL' | AlumniApprovalStatus)}
                  aria-label="Filter discussions by status"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Hidden / Rejected</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {discussions
                .filter((p) => (dTopicFilter === 'ALL' ? true : p.topicId === dTopicFilter))
                .filter((p) => (dStatusFilter === 'ALL' ? true : p.status === dStatusFilter))
                .map((post) => {
                  const topicName =
                    discussionTopics.find((t) => t.id === post.topicId)?.title || `Topic #${post.topicId}`;
                  return (
                    <div
                      key={post.id}
                      className="rounded-lg border border-stone-200 dark:border-slate-800 p-3.5 space-y-2.5 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {post.isPinned && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                                <Pin className="w-3 h-3" /> Pinned
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 font-semibold text-[10px]">
                              {topicName}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                                post.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : post.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {post.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-stone-900 dark:text-white mt-1">{post.title}</h4>
                          <p className="text-[11px] text-stone-500">
                            By {post.authorName} ({post.authorBatch}) · {post.createdAt}
                          </p>
                          <p className="text-stone-700 dark:text-slate-300 mt-1 line-clamp-3">{post.content}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 shrink-0">
                          {post.status !== 'approved' && (
                            <button
                              type="button"
                              onClick={() =>
                                adminFetch(`/api/admin/alumni/discussions/${post.id}`, 'PUT', {
                                  status: 'approved',
                                }).then(() => notify('ok', `Approved post "${post.title}".`))
                              }
                              className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold"
                            >
                              Approve
                            </button>
                          )}
                          {post.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() =>
                                adminFetch(`/api/admin/alumni/discussions/${post.id}`, 'PUT', {
                                  status: 'rejected',
                                }).then(() => notify('ok', `Hid post "${post.title}".`))
                              }
                              className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                            >
                              Hide
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              adminFetch(`/api/admin/alumni/discussions/${post.id}`, 'PUT', {
                                isPinned: !post.isPinned,
                              }).then(() => notify('ok', `${post.isPinned ? 'Unpinned' : 'Pinned'} "${post.title}".`))
                            }
                            className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                          >
                            {post.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete post ${post.title}`}
                            onClick={() =>
                              adminFetch(`/api/admin/alumni/discussions/${post.id}`, 'DELETE').then(() =>
                                notify('ok', `Deleted post "${post.title}".`),
                              )
                            }
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {post.comments && post.comments.length > 0 && (
                        <div className="pt-2 border-t border-stone-100 dark:border-slate-800 space-y-1.5">
                          <p className="text-[11px] font-bold text-stone-500">
                            Replies ({post.comments.length})
                          </p>
                          {post.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="flex items-start justify-between gap-2 bg-stone-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-stone-800 dark:text-slate-200">
                                  {comment.authorName} ({comment.authorBatch}):
                                </span>{' '}
                                <span className="text-stone-600 dark:text-slate-300">{comment.content}</span>
                              </div>
                              <button
                                type="button"
                                aria-label={`Delete reply by ${comment.authorName}`}
                                onClick={() =>
                                  adminFetch(
                                    `/api/admin/alumni/discussions/${post.id}/comments/${comment.id}`,
                                    'DELETE',
                                  ).then(() => notify('ok', 'Deleted reply.'))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* 4B. DISTINGUISHED ALUMNI ACHIEVERS */}
      {subTab === 'achievers' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await adminFetch('/api/admin/alumni/achievers', 'POST', {
                  fullName: achName,
                  batchYear: Number(achYear),
                  departmentCode: achDept,
                  designation: achDesig,
                  organization: achOrg,
                  awardTitle: achAward,
                  citation: achCitation,
                  photoUrl: achPhoto,
                });
                setAchName('');
                setAchDesig('');
                setAchOrg('');
                setAchAward('');
                setAchCitation('');
                notify('ok', `Added Distinguished Achiever "${achName}".`);
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <h2 className="text-base font-bold">Add Distinguished Alumni Achiever</h2>
            <input
              type="text"
              required
              value={achName}
              onChange={(e) => setAchName(e.target.value)}
              placeholder="Achiever Full Name *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={achYear}
                onChange={(e) => setAchYear(e.target.value)}
                placeholder="Batch Year"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={achDept}
                onChange={(e) => setAchDept(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>{d.code}</option>
                ))}
              </select>
              <input
                type="text"
                value={achDesig}
                onChange={(e) => setAchDesig(e.target.value)}
                placeholder="Current Role / Title"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={achOrg}
                onChange={(e) => setAchOrg(e.target.value)}
                placeholder="Organization"
                className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <input
              type="text"
              required
              value={achAward}
              onChange={(e) => setAchAward(e.target.value)}
              placeholder="Award / Honor Title *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <textarea
              rows={2}
              value={achCitation}
              onChange={(e) => setAchCitation(e.target.value)}
              placeholder="Achievement citation..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <ImageUploader
              label="Achiever Photo (1:1 Auto-Crop)"
              value={achPhoto}
              onChange={setAchPhoto}
              uploadBinary={uploadBinary}
              aspectRatio="1:1"
              maxPhotoMb={settings.maxPhotoUploadMb ?? 2}
              autoCropEnabled={settings.autoCropImages !== false}
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Add Achiever Card
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-sm font-bold">Distinguished Achievers ({achievers.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {achievers.map((ach: AlumniAchiever) => (
                <div key={ach.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={ach.photoUrl} alt={ach.fullName} className="w-12 h-12 rounded-lg object-cover border shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-sm">{ach.fullName} ({ach.batchYear} {ach.departmentCode})</p>
                      <p className="text-amber-700 font-semibold">{ach.awardTitle}</p>
                      <p className="text-stone-500">{ach.designation} · {ach.organization}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      adminFetch(`/api/admin/alumni/achievers/${ach.id}`, 'DELETE').then(() =>
                        notify('ok', `Deleted achiever "${ach.fullName}".`),
                      )
                    }
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4C. ENDOWMENT & GIVE BACK PLEDGES */}
      {subTab === 'pledges' && (
        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h3 className="text-sm font-bold">Alumni Endowment &amp; Lab Support Pledges ({pledges.length})</h3>
          {pledges.length === 0 ? (
            <p className="text-xs text-stone-500">No alumni pledges received yet.</p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
              {pledges.map((pl) => (
                <div key={pl.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-sm">
                      {pl.fullName} ({pl.batchYear} {pl.departmentCode}) —{' '}
                      <span className="text-amber-700">{pl.pledgeType}</span>
                    </p>
                    <p className="font-semibold">{pl.amountOrSupport}</p>
                    <p className="text-stone-500">
                      {pl.email} {pl.phone ? `· ${pl.phone}` : ''} · Status: <strong className="uppercase">{pl.status}</strong>
                    </p>
                    {pl.message && <p className="text-stone-600 mt-1">{pl.message}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        adminFetch(`/api/admin/alumni/pledges/${pl.id}`, 'PUT', { status: 'acknowledged' }).then(() =>
                          notify('ok', `Acknowledged pledge from ${pl.fullName}.`),
                        )
                      }
                      className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                    >
                      Acknowledge
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminFetch(`/api/admin/alumni/pledges/${pl.id}`, 'PUT', { status: 'fulfilled' }).then(() =>
                          notify('ok', `Marked pledge from ${pl.fullName} fulfilled.`),
                        )
                      }
                      className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 font-semibold"
                    >
                      Mark Fulfilled
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminFetch(`/api/admin/alumni/pledges/${pl.id}`, 'DELETE').then(() =>
                          notify('ok', 'Deleted pledge record.'),
                        )
                      }
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. ALUMNI PORTAL SETTINGS */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold pt-1">
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
              <span>Allow Logged-In Alumni to Post Jobs</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.enableDiscussions}
                onChange={(e) => setCfg({ ...cfg, enableDiscussions: e.target.checked })}
              />
              <span>Enable Members-Only Discussion Panel</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.requireDiscussionApproval}
                onChange={(e) => setCfg({ ...cfg, requireDiscussionApproval: e.target.checked })}
              />
              <span>Require Admin Approval Before Discussion Posts Go Live</span>
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
