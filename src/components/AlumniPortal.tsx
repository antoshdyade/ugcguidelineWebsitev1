import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe,
  GraduationCap,
  HeartHandshake,
  Linkedin,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  Pin,
  Search,
  Send,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { filterAlumniJobs, filterAlumniProfiles } from '../lib/alumniLogic';
import {
  ALUMNI_CHAPTER_PRESETS,
  ALUMNI_DEGREE_PRESETS,
  ALUMNI_JOB_TYPE_PRESETS,
  ALUMNI_PLEDGE_TYPE_PRESETS,
} from '../lib/collegeFeaturesLogic';
import { CaptchaWidget } from './CaptchaWidget';
import { CustomSelectInput } from './CustomSelectInput';
import { ImageUploader } from './ImageUploader';
import type {
  AlumniData,
  AlumniDiscussionPost,
  AlumniDiscussionTopic,
  AlumniEventChapter,
  AlumniJob,
  AlumniJobType,
  AlumniProfile,
  Department,
  SiteSettings,
} from '../types/cms';

export type AlumniPortalTab =
  | 'directory'
  | 'achievers'
  | 'register'
  | 'jobs'
  | 'events'
  | 'pledge'
  | 'discussions'
  | 'login';

interface AlumniPortalProps {
  alumni: AlumniData;
  departments: Department[];
  settings: SiteSettings;
  initialTab?: AlumniPortalTab;
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
  const [activeTab, setActiveTab] = useState<AlumniPortalTab>(initialTab);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Authenticated Alumni Member Session
  const [loggedAlumni, setLoggedAlumni] = useState<Omit<AlumniProfile, 'passwordHash'> | null>(null);
  const [alumniToken, setAlumniToken] = useState<string>('');
  const [alumniCsrf, setAlumniCsrf] = useState<string>('');
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const alumniTokenRef = useRef('');
  alumniTokenRef.current = alumniToken;
  const alumniCsrfRef = useRef('');
  alumniCsrfRef.current = alumniCsrf;

  // Alumni Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCaptchaId, setLoginCaptchaId] = useState('');
  const [loginCaptchaAnswer, setLoginCaptchaAnswer] = useState('');
  const [loginCaptchaRefresh, setLoginCaptchaRefresh] = useState(0);
  const [loginBusy, setLoginBusy] = useState(false);

  // Directory Filters
  const [dirQuery, setDirQuery] = useState('');
  const [dirDept, setDirDept] = useState('All');
  const [dirBatch, setDirBatch] = useState('All');
  const [dirChapter, setDirChapter] = useState('All');
  const [mentorsOnly, setMentorsOnly] = useState(false);

  // Job Board Filters & Authenticated Submission
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
  const [jobDeadline, setJobDeadline] = useState('');
  const [jobCaptchaId, setJobCaptchaId] = useState('');
  const [jobCaptchaAnswer, setJobCaptchaAnswer] = useState('');
  const [jobCaptchaRefresh, setJobCaptchaRefresh] = useState(0);
  const [submittingJob, setSubmittingJob] = useState(false);

  // Registration Form State (always initialized with defined strings)
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
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
  const [regCaptchaId, setRegCaptchaId] = useState('');
  const [regCaptchaAnswer, setRegCaptchaAnswer] = useState('');
  const [regCaptchaRefresh, setRegCaptchaRefresh] = useState(0);
  const [submittingReg, setSubmittingReg] = useState(false);

  // Members-Only Blogger Discussion Panel State
  const [discussionTopics, setDiscussionTopics] = useState<AlumniDiscussionTopic[]>([]);
  const [discussions, setDiscussions] = useState<AlumniDiscussionPost[]>([]);
  const [discussionsEnabled, setDiscussionsEnabled] = useState<boolean>(
    alumni.settings.enableDiscussions !== false,
  );
  const [discussionsLoading, setDiscussionsLoading] = useState<boolean>(false);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<number | 'All'>('All');
  const [discussionSearch, setDiscussionSearch] = useState('');
  const [showNewPostComposer, setShowNewPostComposer] = useState(false);
  const [newPostTopicId, setNewPostTopicId] = useState<number>(0);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [publishingPost, setPublishingPost] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyBusyId, setReplyBusyId] = useState<number | null>(null);

  // RSVP local state optimistic tracking
  const [rsvpBusyId, setRsvpBusyId] = useState<number | null>(null);
  const [rsvpDoneIds, setRsvpDoneIds] = useState<number[]>([]);

  // Endowment / Give Back Pledge Form
  const [plName, setPlName] = useState('');
  const [plEmail, setPlEmail] = useState('');
  const [plPhone, setPlPhone] = useState('');
  const [plBatch, setPlBatch] = useState('2016');
  const [plDept, setPlDept] = useState(departments[0]?.code || 'CSE');
  const [plType, setPlType] = useState<string>(ALUMNI_PLEDGE_TYPE_PRESETS[0]);
  const [plAmount, setPlAmount] = useState('');
  const [plMsg, setPlMsg] = useState('');
  const [plCaptchaId, setPlCaptchaId] = useState('');
  const [plCaptchaAnswer, setPlCaptchaAnswer] = useState('');
  const [plCaptchaRefresh, setPlCaptchaRefresh] = useState(0);
  const [submittingPledge, setSubmittingPledge] = useState(false);

  const saveAlumniSessionStorage = (token: string, csrf: string) => {
    setAlumniToken(token);
    setAlumniCsrf(csrf);
    try {
      window.sessionStorage.setItem('svcoer_alumni_session', JSON.stringify({ token, csrf }));
    } catch {
      // ignore storage quota/restrictions
    }
  };

  const clearAlumniSessionStorage = () => {
    setAlumniToken('');
    setAlumniCsrf('');
    setLoggedAlumni(null);
    setDiscussions([]);
    setDiscussionTopics([]);
    try {
      window.sessionStorage.removeItem('svcoer_alumni_session');
    } catch {
      // ignore
    }
  };

  const getStoredAlumniToken = useCallback((): string => {
    if (alumniTokenRef.current) return alumniTokenRef.current;
    try {
      const raw = window.sessionStorage.getItem('svcoer_alumni_session');
      if (!raw) return '';
      const parsed = JSON.parse(raw) as { token?: string };
      return parsed.token || '';
    } catch {
      return '';
    }
  }, []);

  const fetchDiscussions = useCallback(
    async (topicOverride?: number | 'All', searchOverride?: string) => {
      const tok = getStoredAlumniToken();
      if (!tok) return;
      setDiscussionsLoading(true);
      try {
        const params = new URLSearchParams();
        const tId = topicOverride !== undefined ? topicOverride : selectedTopicFilter;
        const q = searchOverride !== undefined ? searchOverride : discussionSearch;
        if (tId !== 'All') params.set('topicId', String(tId));
        if (q.trim()) params.set('q', q.trim());
        const headers: Record<string, string> = {};
        if (tok) headers['X-Alumni-Token'] = tok;
        const resp = await fetch(`/api/alumni/discussions?${params.toString()}`, {
          credentials: 'include',
          headers,
        });
        if (resp.status === 401) {
          clearAlumniSessionStorage();
          return;
        }
        const data = (await resp.json().catch(() => ({}))) as {
          enableDiscussions?: boolean;
          topics?: AlumniDiscussionTopic[];
          posts?: AlumniDiscussionPost[];
        };
        if (resp.ok) {
          setDiscussionsEnabled(data.enableDiscussions !== false);
          const list = data.topics || [];
          setDiscussionTopics(list);
          setDiscussions(data.posts || []);
          if (list[0]) {
            setNewPostTopicId((prev) => (list.some((x) => x.id === prev) ? prev : list[0].id));
          }
        }
      } finally {
        setDiscussionsLoading(false);
      }
    },
    [discussionSearch, getStoredAlumniToken, selectedTopicFilter],
  );

  useEffect(() => {
    (async () => {
      try {
        let tok = '';
        try {
          const raw = window.sessionStorage.getItem('svcoer_alumni_session');
          if (raw) {
            const parsed = JSON.parse(raw) as { token?: string; csrf?: string };
            tok = parsed.token || '';
            if (tok) setAlumniToken(tok);
            if (parsed.csrf) setAlumniCsrf(parsed.csrf);
          }
        } catch {
          // ignore
        }
        const headers: Record<string, string> = {};
        if (tok) headers['X-Alumni-Token'] = tok;
        const resp = await fetch('/api/alumni/me', { credentials: 'include', headers });
        const data = (await resp.json().catch(() => ({}))) as {
          authenticated?: boolean;
          alumni?: Omit<AlumniProfile, 'passwordHash'>;
          csrfToken?: string;
        };
        if (resp.ok && data.authenticated && data.alumni) {
          setLoggedAlumni(data.alumni);
          if (data.csrfToken) setAlumniCsrf(data.csrfToken);
        } else if (tok) {
          clearAlumniSessionStorage();
        }
      } finally {
        setAuthChecking(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'discussions' && loggedAlumni) {
      fetchDiscussions();
    }
  }, [activeTab, loggedAlumni, fetchDiscussions]);

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

  const handleAlumniLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    setLoginBusy(true);
    try {
      const resp = await fetch('/api/alumni/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          captchaId: loginCaptchaId,
          captchaAnswer: loginCaptchaAnswer,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        alumni?: Omit<AlumniProfile, 'passwordHash'>;
        csrfToken?: string;
        sessionToken?: string;
        error?: string;
      };
      if (!resp.ok || !data.alumni || !data.sessionToken) {
        setLoginCaptchaRefresh((k) => k + 1);
        throw new Error(data.error || 'Alumni sign in failed.');
      }
      saveAlumniSessionStorage(data.sessionToken, data.csrfToken || '');
      setLoggedAlumni(data.alumni);
      setLoginPassword('');
      setLoginCaptchaAnswer('');
      setBanner({
        type: 'ok',
        text: `Welcome back, ${data.alumni.fullName} (${data.alumni.graduationYear} ${data.alumni.departmentCode}). You can now post job referrals and join Members-Only Discussions.`,
      });
      setActiveTab('discussions');
    } catch (err) {
      setBanner({ type: 'err', text: (err as Error).message });
    } finally {
      setLoginBusy(false);
    }
  };

  const handleAlumniLogout = async () => {
    await fetch('/api/alumni/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    clearAlumniSessionStorage();
    setShowPostJobForm(false);
    setBanner({ type: 'ok', text: 'Signed out of Alumni Member Portal.' });
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    if (regPassword.length < 6) {
      setBanner({ type: 'err', text: 'Account password must be at least 6 characters.' });
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setBanner({ type: 'err', text: 'Password and Confirm Password do not match.' });
      return;
    }
    setSubmittingReg(true);
    try {
      const resp = await fetch('/api/public/alumni/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regName,
          email: regEmail,
          password: regPassword,
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
          captchaId: regCaptchaId,
          captchaAnswer: regCaptchaAnswer,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { message?: string; error?: string };
      setRegCaptchaRefresh((k) => k + 1);
      if (!resp.ok) throw new Error(data.error || 'Registration failed.');
      setBanner({
        type: 'ok',
        text:
          data.message ||
          'Registration submitted with your login password. Once approved by the Alumni Coordinator, sign in to post jobs and access discussions.',
      });
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegPasswordConfirm('');
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

  const handleAuthenticatedJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedAlumni) {
      setBanner({ type: 'err', text: 'Please sign in as a verified Alumni to post jobs.' });
      return;
    }
    setBanner(null);
    setSubmittingJob(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': alumniCsrfRef.current,
      };
      const tok = getStoredAlumniToken();
      if (tok) headers['X-Alumni-Token'] = tok;
      const resp = await fetch('/api/alumni/jobs', {
        method: 'POST',
        credentials: 'include',
        headers,
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
          deadlineDate: jobDeadline,
          captchaId: jobCaptchaId,
          captchaAnswer: jobCaptchaAnswer,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { message?: string; error?: string };
      setJobCaptchaRefresh((k) => k + 1);
      if (resp.status === 401) {
        clearAlumniSessionStorage();
        throw new Error(data.error || 'Your alumni session expired. Please sign in again.');
      }
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
      setJobDeadline('');
      setShowPostJobForm(false);
      await onAlumniDataChanged();
    } catch (err) {
      setBanner({ type: 'err', text: (err as Error).message });
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleCreateDiscussionPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedAlumni) return;
    setBanner(null);
    setPublishingPost(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': alumniCsrfRef.current,
      };
      const tok = getStoredAlumniToken();
      if (tok) headers['X-Alumni-Token'] = tok;
      const resp = await fetch('/api/alumni/discussions', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          topicId: newPostTopicId,
          title: newPostTitle,
          content: newPostContent,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!resp.ok) throw new Error(data.error || 'Could not publish discussion post.');
      setBanner({ type: 'ok', text: data.message || 'Discussion post published.' });
      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPostComposer(false);
      await fetchDiscussions();
    } catch (err) {
      setBanner({ type: 'err', text: (err as Error).message });
    } finally {
      setPublishingPost(false);
    }
  };

  const handleAddDiscussionComment = async (postId: number) => {
    const text = (replyDrafts[postId] || '').trim();
    if (!text || !loggedAlumni) return;
    setReplyBusyId(postId);
    setBanner(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': alumniCsrfRef.current,
      };
      const tok = getStoredAlumniToken();
      if (tok) headers['X-Alumni-Token'] = tok;
      const resp = await fetch(`/api/alumni/discussions/${postId}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ content: text }),
      });
      const data = (await resp.json().catch(() => ({}))) as { error?: string };
      if (!resp.ok) throw new Error(data.error || 'Failed to post reply.');
      setReplyDrafts((prev) => ({ ...prev, [postId]: '' }));
      await fetchDiscussions();
    } catch (err) {
      setBanner({ type: 'err', text: (err as Error).message });
    } finally {
      setReplyBusyId(null);
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

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);
    setSubmittingPledge(true);
    try {
      const resp = await fetch('/api/public/alumni/pledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: plName,
          email: plEmail,
          phone: plPhone,
          batchYear: Number(plBatch),
          departmentCode: plDept,
          pledgeType: plType,
          amountOrSupport: plAmount,
          message: plMsg,
          captchaId: plCaptchaId,
          captchaAnswer: plCaptchaAnswer,
        }),
      });
      const data = (await resp.json().catch(() => ({}))) as { message?: string; error?: string };
      setPlCaptchaRefresh((v) => v + 1);
      if (!resp.ok) throw new Error(data.error || 'Could not submit pledge.');
      setBanner({
        type: 'ok',
        text: data.message || 'Thank you! Your alumni pledge has been recorded for acknowledgement.',
      });
      setPlName('');
      setPlEmail('');
      setPlPhone('');
      setPlAmount('');
      setPlMsg('');
      setPlCaptchaAnswer('');
    } catch (err) {
      setBanner({ type: 'err', text: (err as Error).message });
    } finally {
      setSubmittingPledge(false);
    }
  };

  const achievers = alumni.achievers ?? [];

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
              {!loggedAlumni ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Alumni Member Sign In</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('discussions')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Member Discussions</span>
                </button>
              )}
              {alumni.settings.allowSelfRegistration && !loggedAlumni && (
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-white/30 bg-white/10 hover:bg-white/20 transition-colors"
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

      {/* Portal Sub-Navigation Tabs + Member Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-3">
        <div role="tablist" aria-label="Alumni Portal Sections" className="flex flex-wrap gap-2">
          {[
            { id: 'directory' as const, label: `Alumni Directory (${alumni.profiles.length})`, icon: <Users className="w-4 h-4" /> },
            { id: 'achievers' as const, label: `Distinguished Achievers (${achievers.length})`, icon: <Award className="w-4 h-4" /> },
            { id: 'jobs' as const, label: `Jobs & Internships (${alumni.jobs.length})`, icon: <Briefcase className="w-4 h-4" /> },
            { id: 'events' as const, label: `Chapters & Reunions (${alumni.events.length})`, icon: <Calendar className="w-4 h-4" /> },
            { id: 'pledge' as const, label: 'Give Back / Endowment', icon: <HeartHandshake className="w-4 h-4" /> },
            { id: 'discussions' as const, label: 'Discussions (Members Only)', icon: <Lock className="w-3.5 h-3.5" /> },
            { id: 'register' as const, label: 'Alumni Registration', icon: <UserPlus className="w-4 h-4" /> },
            ...(!loggedAlumni
              ? [{ id: 'login' as const, label: 'Alumni Login', icon: <LogIn className="w-4 h-4" /> }]
              : []),
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
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

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {loggedAlumni ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold">
              <span>{loggedAlumni.fullName} ({loggedAlumni.graduationYear} {loggedAlumni.departmentCode})</span>
              <button
                type="button"
                onClick={handleAlumniLogout}
                className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 hover:underline ml-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <p className="text-stone-500 dark:text-slate-400">
              Coordinator: <strong className="text-stone-700 dark:text-slate-200">{alumni.settings.coordinatorName}</strong> ({alumni.settings.coordinatorEmail})
            </p>
          )}
        </div>
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

                    {prof.mentorshipAreas && prof.mentorshipAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {prof.mentorshipAreas.map((area, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-[10px] font-semibold border border-amber-200 dark:border-amber-900/50"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    )}

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

      {/* TAB 1B: DISTINGUISHED ACHIEVERS SHOWCASE */}
      {activeTab === 'achievers' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Distinguished Alumni Achievers &amp; Hall of Pride
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Recognizing outstanding engineering graduates leading technology, research, public service, and entrepreneurship worldwide.
            </p>
          </div>
          {achievers.length === 0 ? (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
              No distinguished alumni achievers published yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {achievers.map((ach) => (
                <article
                  key={ach.id}
                  className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-start gap-4"
                >
                  <img
                    src={ach.photoUrl}
                    alt={ach.fullName}
                    className="w-20 h-20 rounded-xl object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 space-y-1 text-xs">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase">
                      {ach.awardTitle}
                    </span>
                    <h3 className="text-base font-bold text-stone-900 dark:text-white">{ach.fullName}</h3>
                    <p className="font-semibold text-stone-700 dark:text-slate-200">
                      {ach.designation} · {ach.organization}
                    </p>
                    <p className="text-stone-500">Class of {ach.batchYear} · {ach.departmentCode}</p>
                    {ach.citation && <p className="text-stone-600 dark:text-slate-300 leading-relaxed pt-1">{ach.citation}</p>}
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
            !loggedAlumni ? (
              <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-6 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-base">
                  <Lock className="w-4 h-4" />
                  <span>Alumni Member Login Required to Post Jobs</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300">
                  Direct unauthenticated job posting is disabled to prevent spam. Please sign in with your verified Alumni credentials to submit a job or internship referral.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In as Alumni</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register Account</span>
                  </button>
                </div>
              </div>
            ) : (
            <form
              onSubmit={handleAuthenticatedJobSubmit}
              className="rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold">Share Job Opening / Alumni Referral with Students &amp; Graduates</h2>
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Posting as: {loggedAlumni.fullName} ({loggedAlumni.graduationYear} {loggedAlumni.departmentCode})
                </span>
              </div>
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
                <CustomSelectInput
                  label="Opportunity Type"
                  value={jobType}
                  onChange={(v) => setJobType(v)}
                  options={[...ALUMNI_JOB_TYPE_PRESETS]}
                  customPlaceholder="Enter custom opportunity type..."
                />
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
              <CaptchaWidget
                idPrefix="alumni-job"
                captchaId={jobCaptchaId}
                captchaAnswer={jobCaptchaAnswer}
                onCaptchaIdChange={setJobCaptchaId}
                onCaptchaAnswerChange={setJobCaptchaAnswer}
                refreshSignal={jobCaptchaRefresh}
                label="Job Posting CAPTCHA Challenge *"
              />
              <button
                type="submit"
                disabled={submittingJob}
                className="px-5 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {submittingJob ? 'Submitting...' : 'Submit Job for Admin Verification'}
              </button>
            </form>
            )
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

      {/* TAB 3B: GIVE BACK / ENDOWMENT & LAB SUPPORT PLEDGE */}
      {activeTab === 'pledge' && (
        <div className="max-w-3xl mx-auto rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-amber-600" />
            <div>
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                Give Back: Endowment, Lab Equipment &amp; Scholarship Pledge
              </h2>
              <p className="text-xs text-stone-500">
                Support departmental CoEs, student merit scholarships, industrial visits, and guest expert lectures.
              </p>
            </div>
          </div>
          <form onSubmit={handlePledgeSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Alumni Full Name *</label>
                <input
                  type="text"
                  required
                  value={plName}
                  onChange={(e) => setPlName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={plEmail}
                  onChange={(e) => setPlEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={plPhone}
                  onChange={(e) => setPlPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold mb-1">Batch Year</label>
                  <input
                    type="number"
                    value={plBatch}
                    onChange={(e) => setPlBatch(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Department</label>
                  <select
                    value={plDept}
                    onChange={(e) => setPlDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.code}>{d.code}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="sm:col-span-2">
                <CustomSelectInput
                  label="Contribution / Support Area"
                  required
                  value={plType}
                  onChange={setPlType}
                  options={[...ALUMNI_PLEDGE_TYPE_PRESETS]}
                  customPlaceholder="Enter custom contribution or mentorship pledge..."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Pledge Amount / Commitment Details *</label>
                <input
                  type="text"
                  required
                  value={plAmount}
                  onChange={(e) => setPlAmount(e.target.value)}
                  placeholder="e.g. ₹50,000 Scholarship Fund / 2 IoT Kits / 3 Guest Lectures"
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Message / Department Note</label>
                <textarea
                  rows={2}
                  value={plMsg}
                  onChange={(e) => setPlMsg(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <CaptchaWidget
              idPrefix="alumni-pledge"
              captchaId={plCaptchaId}
              captchaAnswer={plCaptchaAnswer}
              onCaptchaIdChange={setPlCaptchaId}
              onCaptchaAnswerChange={setPlCaptchaAnswer}
              refreshSignal={plCaptchaRefresh}
              label="Endowment Pledge CAPTCHA *"
            />
            <button
              type="submit"
              disabled={submittingPledge}
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {submittingPledge ? 'Recording Pledge...' : 'Submit Endowment / Mentorship Pledge'}
            </button>
          </form>
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
                  <label htmlFor="reg-password" className="block text-xs font-semibold mb-1">Portal Login Password * (min 6 chars)</label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create your alumni login password"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="reg-password-confirm" className="block text-xs font-semibold mb-1">Confirm Login Password *</label>
                  <input
                    id="reg-password-confirm"
                    type="password"
                    required
                    minLength={6}
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    placeholder="Re-enter password"
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
                  <CustomSelectInput
                    id="reg-degree"
                    label="Degree"
                    value={regDegree}
                    onChange={setRegDegree}
                    options={[...ALUMNI_DEGREE_PRESETS]}
                    customPlaceholder="Enter custom degree..."
                  />
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
                <CustomSelectInput
                  id="reg-chapter"
                  label="Preferred Alumni Chapter"
                  value={regChapter}
                  onChange={setRegChapter}
                  options={[...ALUMNI_CHAPTER_PRESETS, ...CHAPTER_OPTIONS.filter((c) => !(ALUMNI_CHAPTER_PRESETS as readonly string[]).includes(c))]}
                  customPlaceholder="Enter custom city / global chapter..."
                />
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

              <CaptchaWidget
                idPrefix="alumni-reg"
                captchaId={regCaptchaId}
                captchaAnswer={regCaptchaAnswer}
                onCaptchaIdChange={setRegCaptchaId}
                onCaptchaAnswerChange={setRegCaptchaAnswer}
                refreshSignal={regCaptchaRefresh}
                label="Registration Security CAPTCHA *"
              />

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

      {/* TAB 5: MEMBERS-ONLY BLOGGER DISCUSSION PANEL */}
      {activeTab === 'discussions' && (
        <div className="space-y-5">
          {authChecking ? (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
              Checking verified alumni membership...
            </div>
          ) : !loggedAlumni ? (
            <div className="max-w-2xl mx-auto rounded-2xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
                Members-Only Alumni Discussion Panel
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 dark:text-slate-300 leading-relaxed">
                This topic-wise blogger &amp; peer discussion space is strictly private for signed-in, administrator-approved {settings.shortCode} Alumni members and is never exposed publicly.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Read &amp; Discuss</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-semibold border border-stone-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register as Alumni</span>
                </button>
              </div>
            </div>
          ) : !discussionsEnabled ? (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
              The Alumni Discussion Panel is currently paused by the Portal Administrator.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Filter Bar + Topic Pills */}
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="search"
                        value={discussionSearch}
                        onChange={(e) => {
                          setDiscussionSearch(e.target.value);
                          fetchDiscussions(selectedTopicFilter, e.target.value);
                        }}
                        placeholder="Search member blog posts & topics..."
                        className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewPostComposer((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{showNewPostComposer ? 'Close Article Composer' : '+ Publish Topic Article'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTopicFilter('All');
                      fetchDiscussions('All', discussionSearch);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      selectedTopicFilter === 'All'
                        ? 'text-white border-transparent'
                        : 'border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800'
                    }`}
                    style={selectedTopicFilter === 'All' ? { backgroundColor: 'var(--primary-color)' } : undefined}
                  >
                    All Topics
                  </button>
                  {discussionTopics.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        setSelectedTopicFilter(topic.id);
                        fetchDiscussions(topic.id, discussionSearch);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        selectedTopicFilter === topic.id
                          ? 'text-white border-transparent'
                          : 'border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                      style={selectedTopicFilter === topic.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blogger Article Composer */}
              {showNewPostComposer && (
                <form
                  onSubmit={handleCreateDiscussionPost}
                  className="rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-5 space-y-3.5"
                >
                  <h2 className="text-base font-bold">Write a Topic Article / Peer Discussion Post</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="disc-topic" className="block text-xs font-semibold mb-1">Topic Category *</label>
                      <select
                        id="disc-topic"
                        value={newPostTopicId}
                        onChange={(e) => setNewPostTopicId(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        {discussionTopics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="disc-title" className="block text-xs font-semibold mb-1">Article / Thread Title *</label>
                      <input
                        id="disc-title"
                        type="text"
                        required
                        minLength={4}
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        placeholder="e.g. System Design Preparation Roadmap for Final-Year Students"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="disc-body" className="block text-xs font-semibold mb-1">Article Body *</label>
                    <textarea
                      id="disc-body"
                      rows={5}
                      required
                      minLength={10}
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share actionable guidance, industry lessons, syllabus ideas, or meetup proposals with fellow alumni..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewPostComposer(false)}
                      className="px-4 py-2 rounded-lg text-xs border border-stone-300 dark:border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={publishingPost}
                      className="px-5 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                      {publishingPost ? 'Publishing...' : 'Publish Discussion Article'}
                    </button>
                  </div>
                </form>
              )}

              {/* Posts Feed */}
              {discussionsLoading ? (
                <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
                  Loading members-only discussions...
                </div>
              ) : discussions.length === 0 ? (
                <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-stone-500">
                  No discussion posts in this topic yet. Start the conversation above!
                </div>
              ) : (
                <div className="space-y-4">
                  {discussions.map((post) => {
                    const topicObj = discussionTopics.find((t) => t.id === post.topicId);
                    return (
                      <article
                        key={post.id}
                        className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            {topicObj && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold">
                                {topicObj.title}
                              </span>
                            )}
                            {post.isPinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-bold">
                                <Pin className="w-3 h-3" /> Pinned
                              </span>
                            )}
                            {post.status !== 'approved' && (
                              <span className="px-2 py-0.5 rounded bg-stone-200 dark:bg-slate-800 text-stone-700 dark:text-slate-300 font-bold uppercase">
                                {post.status}
                              </span>
                            )}
                            <span className="text-stone-400 font-mono-tabular ml-auto">{post.createdAt}</span>
                          </div>
                          <h3 className="font-display text-lg sm:text-xl font-bold text-stone-900 dark:text-white leading-snug">
                            {post.title}
                          </h3>
                          <p className="text-xs text-stone-500 dark:text-slate-400">
                            By <strong className="text-stone-800 dark:text-slate-200">{post.authorName}</strong> ({post.authorBatch}) · {post.authorDesignation}
                          </p>
                        </div>

                        <div className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {post.content}
                        </div>

                        {/* Member Replies */}
                        <div className="pt-4 border-t border-stone-100 dark:border-slate-800 space-y-3">
                          <p className="text-xs font-bold text-stone-700 dark:text-slate-300">
                            Member Replies ({post.comments.length})
                          </p>
                          {post.comments.length > 0 && (
                            <div className="space-y-2.5 pl-3 border-l-2 border-amber-300 dark:border-amber-700">
                              {post.comments.map((cm) => (
                                <div key={cm.id} className="text-xs space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <strong className="text-stone-900 dark:text-white">{cm.authorName}</strong>
                                    <span className="text-[11px] text-stone-500">({cm.authorBatch})</span>
                                    <span className="text-[10px] text-stone-400 font-mono-tabular">{cm.createdAt}</span>
                                  </div>
                                  <p className="text-stone-700 dark:text-slate-300 leading-relaxed">{cm.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {post.status === 'approved' && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleAddDiscussionComment(post.id);
                              }}
                              className="flex flex-wrap items-center gap-2 pt-1"
                            >
                              <input
                                type="text"
                                value={replyDrafts[post.id] ?? ''}
                                onChange={(e) =>
                                  setReplyDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                                }
                                placeholder="Write a reply to this thread..."
                                className="flex-1 min-w-[200px] px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800"
                              />
                              <button
                                type="submit"
                                disabled={replyBusyId === post.id || !(replyDrafts[post.id] || '').trim()}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                                style={{ backgroundColor: 'var(--primary-color)' }}
                              >
                                <Send className="w-3 h-3" />
                                <span>{replyBusyId === post.id ? 'Posting...' : 'Reply'}</span>
                              </button>
                            </form>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: ALUMNI MEMBER LOGIN WITH CAPTCHA */}
      {activeTab === 'login' && (
        <div className="max-w-md mx-auto rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
              Alumni Member Sign In
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Sign in with your approved alumni credentials to post job referrals and participate in Members-Only Topic Discussions.
            </p>
          </div>

          <form onSubmit={handleAlumniLogin} className="space-y-4">
            <div>
              <label htmlFor="alumni-login-email" className="block text-xs font-semibold mb-1">Registered Alumni Email</label>
              <input
                id="alumni-login-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="rohan.deshmukh@alumni.svcoer.edu.in"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label htmlFor="alumni-login-password" className="block text-xs font-semibold mb-1">Password</label>
              <input
                id="alumni-login-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <CaptchaWidget
              idPrefix="alumni-login"
              captchaId={loginCaptchaId}
              captchaAnswer={loginCaptchaAnswer}
              onCaptchaIdChange={setLoginCaptchaId}
              onCaptchaAnswerChange={setLoginCaptchaAnswer}
              refreshSignal={loginCaptchaRefresh}
              label="Alumni Login Security CAPTCHA *"
            />
            <button
              type="submit"
              disabled={loginBusy}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {loginBusy ? 'Signing In...' : 'Sign In to Alumni Portal'}
            </button>
          </form>

          <div className="pt-4 border-t border-stone-200 dark:border-slate-800 space-y-2">
            <p className="text-xs font-semibold text-stone-500 dark:text-slate-400">
              Demo Approved Alumni Account (Click to Fill):
            </p>
            <button
              type="button"
              onClick={() => {
                setLoginEmail('rohan.deshmukh@alumni.svcoer.edu.in');
                setLoginPassword('Alumni@123');
              }}
              className="w-full text-left px-3 py-2 rounded-lg border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs"
            >
              <span className="font-bold block text-stone-800 dark:text-slate-100">
                Rohan Deshmukh (Senior Cloud Architect, Class of 2016 CSE)
              </span>
              <span className="text-[11px] text-stone-500">
                rohan.deshmukh@alumni.svcoer.edu.in · Pass: Alumni@123
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-export arrow icons just so unused import lint stays clean if needed
export { ArrowUp, ArrowDown };
