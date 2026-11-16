import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import type { PlacementsData, SiteSettings } from '../types/cms';
import {
  computePlacementMetrics,
  DEFAULT_GRIEVANCE_PORTAL_CONFIG,
  DEFAULT_INTAKE_PROGRAMS,
  GRIEVANCE_CATEGORY_PRESETS,
  GRIEVANCE_ROLE_PRESETS,
} from '../lib/collegeFeaturesLogic';
import { sortByOrder } from '../lib/cmsLogic';
import { getUploadSizeLimitBytes, getUploadSizeLimitMb } from '../lib/imageCrop';
import { CaptchaWidget } from './CaptchaWidget';
import { CmsHtmlContent } from './CmsHtmlContent';
import { CustomSelectInput } from './CustomSelectInput';

interface PlacementsPortalProps {
  placements: PlacementsData;
  settings: SiteSettings;
}

export function PlacementsPortal({ placements, settings }: PlacementsPortalProps) {
  const years = useMemo(
    () => Array.from(new Set(placements.stats.map((s) => s.academicYear))),
    [placements.stats],
  );
  const [selectedYear, setSelectedYear] = useState<string>(years[0] || 'All');

  const visibleStats = useMemo(() => {
    const ordered = sortByOrder(placements.stats);
    return selectedYear === 'All' ? ordered : ordered.filter((s) => s.academicYear === selectedYear);
  }, [placements.stats, selectedYear]);

  const metrics = useMemo(() => computePlacementMetrics(visibleStats), [visibleStats]);
  const upcomingDrives = useMemo(
    () => sortByOrder(placements.upcomingDrives || []),
    [placements.upcomingDrives],
  );
  const intakePrograms = useMemo(
    () => sortByOrder(settings.intakePrograms && settings.intakePrograms.length > 0 ? settings.intakePrograms : DEFAULT_INTAKE_PROGRAMS),
    [settings.intakePrograms],
  );

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
      <div
        className="rounded-2xl p-6 sm:p-8 text-white"
        style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #0F766E 100%)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-1">
          Career Development &amp; Industry Relations
        </p>
        <h1 className="font-display text-2xl sm:text-4xl font-bold mb-2">
          Training &amp; Placement (T&amp;P) Hub
        </h1>
        <p className="text-sm text-white/90 max-w-3xl leading-relaxed">{placements.summaryNote}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Placement Rate ({selectedYear})</p>
          <p className="font-display text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {metrics.overallRate}%
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">
            {metrics.placed} / {metrics.eligible} students placed
          </p>
        </div>
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Highest Package Offered</p>
          <p className="font-display text-3xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
            ₹{metrics.highest} LPA
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Core &amp; Product Tech Drives</p>
        </div>
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Average Package</p>
          <p className="font-display text-3xl font-bold text-stone-900 dark:text-white mt-1 tabular-nums">
            ₹{metrics.avg} LPA
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Across Autonomous Branches</p>
        </div>
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">T&amp;P Cell Desk</p>
          <p className="text-sm font-bold text-stone-900 dark:text-white mt-1">{placements.coordinatorName}</p>
          <p className="text-[11px] text-stone-500 mt-0.5 truncate">{placements.coordinatorEmail}</p>
          <p className="text-[11px] text-stone-500">{placements.coordinatorPhone}</p>
        </div>
      </div>

      {/* Year Filter & Formatted Branch Table */}
      <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            Branch-Wise Placement Statistics
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...years].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                  selectedYear === yr
                    ? 'text-white border-transparent'
                    : 'bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700'
                }`}
                style={selectedYear === yr ? { backgroundColor: 'var(--primary-color)' } : undefined}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="cms-table cms-table-navy w-full text-xs">
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Engineering Branch</th>
                <th>Eligible</th>
                <th>Placed</th>
                <th>Placement %</th>
                <th>Highest (LPA)</th>
                <th>Average (LPA)</th>
                <th>Major Recruiters</th>
              </tr>
            </thead>
            <tbody>
              {metrics.rowsWithPct.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono font-semibold whitespace-nowrap">{row.academicYear}</td>
                  <td className="font-semibold">{row.branch}</td>
                  <td className="tabular-nums">{row.eligibleStudents}</td>
                  <td className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                    {row.placedStudents}
                  </td>
                  <td className="min-w-[125px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-stone-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${Math.min(100, row.placementRatePct)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold tabular-nums">{row.placementRatePct}%</span>
                    </div>
                  </td>
                  <td className="tabular-nums font-semibold whitespace-nowrap">₹{row.highestPackageLpa} LPA</td>
                  <td className="tabular-nums whitespace-nowrap">₹{row.averagePackageLpa} LPA</td>
                  <td>{row.topRecruitersList}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Upcoming Campus Recruitment Drives */}
      {upcomingDrives.length > 0 && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Upcoming Campus Placement Drives
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingDrives.map((drive) => (
              <article
                key={drive.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 flex flex-col justify-between space-y-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold uppercase text-[10px]">
                      {drive.status}
                    </span>
                    <span className="font-mono font-semibold text-stone-500">{drive.driveDate}</span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">{drive.company}</h3>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    {drive.roleTitle} · {drive.packageLpa}
                  </p>
                  <p className="text-stone-600 dark:text-slate-300">
                    <strong>Eligible:</strong> {drive.eligibleBranches}
                  </p>
                </div>
                {drive.applyUrl && (
                  <a
                    href={drive.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white font-semibold"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    <span>T&amp;P Drive Registration</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Top Recruiters + Student Success Stories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" /> Esteemed Campus Recruiters
          </h3>
          <div className="flex flex-wrap gap-2">
            {(settings.recruiters || []).map((rec, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 text-xs font-semibold"
              >
                {rec}
              </span>
            ))}
          </div>
        </section>

        <section className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" /> Placed Student Achiever Stories
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortByOrder(placements.stories).map((st) => (
              <div
                key={st.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 flex items-start gap-3"
              >
                <img
                  src={st.photoUrl}
                  alt={st.studentName}
                  className="w-16 h-16 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                />
                <div className="min-w-0 space-y-1 text-xs">
                  <h4 className="font-bold text-stone-900 dark:text-white">{st.studentName}</h4>
                  <p className="text-[11px] text-stone-500">{st.branch}</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    <Briefcase className="w-3 h-3 inline mr-1" />
                    {st.company} · {st.packageLpa}
                  </p>
                  <p className="text-stone-600 dark:text-slate-300 leading-relaxed">&ldquo;{st.quote}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* AICTE Sanctioned Intake & FRA Fee Reference Table */}
      {intakePrograms.length > 0 && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-600" />
            AICTE Sanctioned Programs &amp; Intake Reference
          </h3>
          <div className="overflow-x-auto">
            <table className="cms-table cms-table-navy w-full text-xs">
              <thead>
                <tr>
                  <th>Choice Code</th>
                  <th>Engineering / PG Program</th>
                  <th>Level</th>
                  <th>Sanctioned Intake</th>
                  <th>Accreditation / Recognition</th>
                  <th>FRA Approved Fee</th>
                </tr>
              </thead>
              <tbody>
                {intakePrograms.map((prog) => (
                  <tr key={prog.id}>
                    <td className="font-mono font-semibold">{prog.code}</td>
                    <td className="font-semibold">{prog.programName}</td>
                    <td>{prog.level}</td>
                    <td className="tabular-nums font-bold">{prog.sanctionedIntake}</td>
                    <td>{prog.accreditationStatus}</td>
                    <td className="tabular-nums font-semibold">{prog.annualFee || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export function GrievancePortal({ settings }: { settings: SiteSettings }) {
  const gp = useMemo(
    () => ({
      ...DEFAULT_GRIEVANCE_PORTAL_CONFIG,
      ...(settings.grievancePortal || {}),
      committeeMembers:
        settings.grievancePortal?.committeeMembers && settings.grievancePortal.committeeMembers.length > 0
          ? sortByOrder(settings.grievancePortal.committeeMembers)
          : DEFAULT_GRIEVANCE_PORTAL_CONFIG.committeeMembers,
    }),
    [settings.grievancePortal],
  );

  const maxDocMb = getUploadSizeLimitMb(settings, 'document');
  const maxDocBytes = getUploadSizeLimitBytes(settings, 'document');

  const [complainantName, setComplainantName] = useState('');
  const [complainantRole, setComplainantRole] = useState<string>(GRIEVANCE_ROLE_PRESETS[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentOrCell, setDepartmentOrCell] = useState('General Administration');
  const [category, setCategory] = useState<string>(GRIEVANCE_CATEGORY_PRESETS[0]);
  const [urgency, setUrgency] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaRefresh, setCaptchaRefresh] = useState(0);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string; code?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [summary, setSummary] = useState({ total: 0, submitted: 0, inReview: 0, resolved: 0, closed: 0 });
  const [lookupCode, setLookupCode] = useState('');
  const [lookupErr, setLookupErr] = useState('');
  const [lookupData, setLookupData] = useState<{
    ticketCode: string;
    category: string;
    subject: string;
    departmentOrCell: string;
    urgency?: string;
    isAnonymous?: boolean;
    hasAttachment?: boolean;
    status: string;
    resolutionNote: string;
    submittedAt: string;
    updatedAt: string;
  } | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/public/grievances/summary');
      if (res.ok) {
        const d = await res.json();
        setSummary(d);
      }
    } catch {
      // Ignore transient summary error
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > maxDocBytes) {
      setSubmitResult({ ok: false, msg: `Supporting attachment exceeds Max Upload limit of ${maxDocMb} MB.` });
      return;
    }
    setUploadingEvidence(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/public/grievances/upload-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/pdf',
          base64Data: base64,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evidence upload failed.');
      setAttachmentUrl(data.url);
    } catch (err) {
      setSubmitResult({ ok: false, msg: (err as Error).message });
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/public/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complainantName: isAnonymous && !complainantName.trim() ? 'Confidential Complainant' : complainantName,
          complainantRole,
          email,
          phone,
          departmentOrCell,
          category,
          urgency,
          isAnonymous,
          attachmentUrl,
          subject,
          description,
          captchaId,
          captchaAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register grievance.');
      setSubmitResult({ ok: true, msg: data.message, code: data.ticketCode });
      setLookupCode(data.ticketCode || '');
      setComplainantName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setDescription('');
      setAttachmentUrl('');
      setUrgency('normal');
      setIsAnonymous(false);
      setCaptchaAnswer('');
      setCaptchaRefresh((v) => v + 1);
      fetchSummary();
    } catch (err) {
      setSubmitResult({ ok: false, msg: (err as Error).message });
      setCaptchaRefresh((v) => v + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupErr('');
    setLookupData(null);
    try {
      const res = await fetch(`/api/public/grievances/status?code=${encodeURIComponent(lookupCode.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ticket lookup failed.');
      setLookupData(data);
    } catch (err) {
      setLookupErr((err as Error).message);
    }
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-6">
      {/* Hero Banner */}
      <div
        className="rounded-2xl p-6 sm:p-8 text-white space-y-3"
        style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, var(--primary-color) 100%)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
          AICTE &amp; UGC Statutory Redressal Mechanism (2023 Regulations)
        </p>
        <h1 className="font-display text-2xl sm:text-4xl font-bold leading-tight">{gp.heroTitle}</h1>
        <p className="text-sm text-white/90 max-w-3xl leading-relaxed">{gp.heroSubtitle}</p>
        <div className="pt-2 flex flex-wrap gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/20">
            UGC Anti-Ragging Toll-Free: <strong>{settings.antiRaggingHelpline || '1800-180-5522'}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-white/15 border border-white/20">
            Campus 24x7 Squad: <strong>{gp.antiRaggingSquadPhone}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold">
            Initial SLA: {gp.slaAcknowledgementHours} · Final SGRC Disposal: {gp.slaResolutionDays}
          </span>
        </div>
      </div>

      {/* Live Anonymized SGRC Resolution Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Total Tickets Registered</p>
          <p className="font-display text-3xl font-bold text-stone-900 dark:text-white mt-1 tabular-nums">
            {summary.total}
          </p>
          <p className="text-[11px] text-stone-400">Centralized Audit Trail</p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Resolved &amp; Closed</p>
          <p className="font-display text-3xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {Number(summary.resolved || 0) + Number(summary.closed || 0)}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">Verified Action Taken</p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Under SGRC Review</p>
          <p className="font-display text-3xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
            {Number(summary.inReview || 0) + Number(summary.submitted || 0)}
          </p>
          <p className="text-[11px] text-stone-400">Active Committee Queue</p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">National Anti-Ragging Portal</p>
          <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-1">Zero-Tolerance Policy</p>
          <a
            href={gp.ugcAffidavitUrl || 'https://www.antiragging.in/'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold underline mt-1 text-stone-800 dark:text-slate-200"
          >
            Submit Online Undertaking <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Submission Form + Tracking & Ombudsperson Rail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            Submit Formal Grievance / Helpdesk Request
          </h2>

          {submitResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs ${
                submitResult.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submitResult.msg}</span>
              </div>
              {submitResult.code && <p className="mt-1 font-mono font-bold">Tracking Code: {submitResult.code}</p>}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={complainantName}
                  onChange={(e) => setComplainantName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <CustomSelectInput
                label="Complainant Role"
                required
                value={complainantRole}
                onChange={setComplainantRole}
                options={[...GRIEVANCE_ROLE_PRESETS]}
                customPlaceholder="Enter custom stakeholder role..."
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <CustomSelectInput
                label="Grievance Category"
                required
                value={category}
                onChange={setCategory}
                options={[...GRIEVANCE_CATEGORY_PRESETS]}
                customPlaceholder="Enter custom grievance category..."
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Concerned Department / Cell</label>
                <input
                  type="text"
                  value={departmentOrCell}
                  onChange={(e) => setDepartmentOrCell(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Priority / Urgency Level</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as 'normal' | 'high' | 'urgent')}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="normal">Normal (Standard 15-Day SGRC Track)</option>
                  <option value="high">High Priority (Exam / Scholarship Deadline)</option>
                  <option value="urgent">Urgent (Anti-Ragging / Campus Safety Alert)</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 w-full">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  <span>Keep identity confidential during preliminary review</span>
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="sm:col-span-2 p-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-semibold">Supporting Document / Screenshot Evidence (optional)</p>
                  <p className="text-[11px] text-stone-500">PDF, JPG, or PNG · Max {maxDocMb} MB</p>
                </div>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingEvidence ? 'Uploading...' : 'Attach Evidence'}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleEvidenceUpload}
                    className="sr-only"
                  />
                </label>
                {attachmentUrl && (
                  <p className="w-full text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Attached: {attachmentUrl}
                  </p>
                )}
              </div>
            </div>

            <CaptchaWidget
              captchaId={captchaId}
              captchaAnswer={captchaAnswer}
              onCaptchaIdChange={setCaptchaId}
              onCaptchaAnswerChange={setCaptchaAnswer}
              refreshSignal={captchaRefresh}
              label="Grievance Portal Security CAPTCHA"
            />

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {submitting ? 'Registering Ticket...' : 'Submit Grievance Securely'}
            </button>
          </form>
        </section>

        {/* Right Column: Tracker + Ombudsperson + 24x7 Helplines */}
        <aside className="lg:col-span-5 space-y-5">
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" /> Track Grievance Ticket Status
            </h3>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Enter your Ticket Code (for example, <code className="font-mono font-semibold">GRV-2026-0001</code>).
            </p>
            <form onSubmit={handleTrack} className="flex gap-2">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="GRV-2026-0001"
                className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Check
              </button>
            </form>
            {lookupErr && <p className="text-xs text-rose-600 font-medium">{lookupErr}</p>}
            {lookupData && (
              <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono font-bold">{lookupData.ticketCode}</span>
                  <div className="flex items-center gap-1.5">
                    {lookupData.urgency && (
                      <span className="px-2 py-0.5 rounded uppercase text-[10px] font-bold bg-rose-100 text-rose-800">
                        {lookupData.urgency}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded uppercase text-[10px] font-bold bg-amber-100 text-amber-900">
                      {lookupData.status}
                    </span>
                  </div>
                </div>
                <p className="font-semibold text-stone-900 dark:text-white">{lookupData.subject}</p>
                <p className="text-stone-500">{lookupData.category} · {lookupData.departmentOrCell}</p>
                <p className="pt-1 border-t border-stone-200 dark:border-slate-700 text-stone-700 dark:text-slate-200">
                  <strong>Committee Response:</strong> {lookupData.resolutionNote}
                </p>
                <p className="text-[11px] text-stone-400">Updated: {lookupData.updatedAt}</p>
              </div>
            )}
          </div>

          {/* Appointed Institutional Ombudsperson Card */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Institutional Ombudsperson (Appellate Authority)
            </h3>
            <div className="flex items-start gap-3">
              <img
                src={gp.ombudspersonPhotoUrl || '/src/assets/images/leadership_principal_1794512597061.jpg'}
                alt={gp.ombudspersonName}
                className="w-16 h-16 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0 space-y-0.5">
                <p className="font-bold text-sm text-stone-900 dark:text-white">{gp.ombudspersonName}</p>
                <p className="text-stone-600 dark:text-slate-300">{gp.ombudspersonDesignation}</p>
                <p className="flex items-center gap-1.5 text-stone-500 pt-1">
                  <Mail className="w-3.5 h-3.5 text-amber-600" /> {gp.ombudspersonEmail}
                </p>
                <p className="flex items-center gap-1.5 text-stone-500">
                  <Phone className="w-3.5 h-3.5 text-amber-600" /> {gp.ombudspersonPhone}
                </p>
              </div>
            </div>
          </div>

          {/* 24x7 Anti-Ragging & Women Safety ICC Helplines */}
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-5 space-y-2 text-xs">
            <h3 className="font-display text-base font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              24x7 Anti-Ragging Squad &amp; ICC Cell
            </h3>
            <p className="flex items-center gap-2 text-stone-700 dark:text-slate-200">
              <Phone className="w-3.5 h-3.5 text-rose-600" />
              UGC 24x7 Toll-Free: <strong>{settings.antiRaggingHelpline || '1800-180-5522'}</strong>
            </p>
            <p className="flex items-center gap-2 text-stone-700 dark:text-slate-200">
              <Phone className="w-3.5 h-3.5 text-rose-600" />
              Campus Flying Squad: <strong>{gp.antiRaggingSquadPhone}</strong>
            </p>
            <p className="flex items-center gap-2 text-stone-700 dark:text-slate-200">
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              ICC Officer ({gp.iccCoordinatorName}): {gp.iccCoordinatorEmail}
            </p>
          </div>
        </aside>
      </div>

      {/* SGRC & Anti-Ragging Committee Photo Cards */}
      {gp.committeeMembers.length > 0 && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Student Grievance Redressal Committee (SGRC) &amp; Anti-Ragging Squad Members
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gp.committeeMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 flex items-start gap-3 text-xs"
              >
                <img
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-16 h-16 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                />
                <div className="min-w-0 space-y-0.5">
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-bold uppercase">
                    {member.roleTitle}
                  </span>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white truncate">{member.name}</h3>
                  <p className="text-stone-600 dark:text-slate-300">{member.designation}</p>
                  <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{member.committeeName}</p>
                  {member.email && (
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 pt-0.5 truncate">
                      <Mail className="w-3 h-3 shrink-0" /> {member.email}
                    </p>
                  )}
                  {member.phone && (
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 truncate">
                      <Phone className="w-3 h-3 shrink-0" /> {member.phone}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Formatted Escalation Matrix & Rich Statutory Charter */}
      {gp.charterHtml && (
        <section className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-600" />
            <h2 className="font-display text-xl font-bold">Statutory Escalation SLA &amp; Redressal Charter</h2>
          </div>
          <CmsHtmlContent html={gp.charterHtml} className="text-stone-700 dark:text-slate-200" />
        </section>
      )}
    </div>
  );
}
