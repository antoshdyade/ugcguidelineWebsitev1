import React, { useMemo, useState } from 'react';
import {
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  Mail,
  Phone,
  Search,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import type { PlacementsData, SiteSettings } from '../types/cms';
import { GRIEVANCE_CATEGORY_PRESETS, GRIEVANCE_ROLE_PRESETS } from '../lib/collegeFeaturesLogic';
import { sortByOrder } from '../lib/cmsLogic';
import { CaptchaWidget } from './CaptchaWidget';
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

  const totals = useMemo(() => {
    const eligible = visibleStats.reduce((sum, s) => sum + Number(s.eligibleStudents || 0), 0);
    const placed = visibleStats.reduce((sum, s) => sum + Number(s.placedStudents || 0), 0);
    const highest = Math.max(0, ...visibleStats.map((s) => Number(s.highestPackageLpa || 0)));
    const avg =
      visibleStats.length > 0
        ? visibleStats.reduce((sum, s) => sum + Number(s.averagePackageLpa || 0), 0) / visibleStats.length
        : 0;
    const rate = eligible > 0 ? ((placed / eligible) * 100).toFixed(1) : '0.0';
    return { eligible, placed, highest, avg: avg.toFixed(2), rate };
  }, [visibleStats]);

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
            {totals.rate}%
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">{totals.placed} / {totals.eligible} students placed</p>
        </div>
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Highest Package Offered</p>
          <p className="font-display text-3xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
            ₹{totals.highest} LPA
          </p>
          <p className="text-[11px] text-stone-500 mt-0.5">Core &amp; Product Tech Drives</p>
        </div>
        <div className="p-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs font-semibold text-stone-500">Average Package</p>
          <p className="font-display text-3xl font-bold text-stone-900 dark:text-white mt-1 tabular-nums">
            ₹{totals.avg} LPA
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

      {/* Year Filter & Branch Table */}
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
                <th>Highest (LPA)</th>
                <th>Average (LPA)</th>
                <th>Major Recruiters</th>
              </tr>
            </thead>
            <tbody>
              {visibleStats.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono font-semibold">{row.academicYear}</td>
                  <td className="font-semibold">{row.branch}</td>
                  <td className="tabular-nums">{row.eligibleStudents}</td>
                  <td className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{row.placedStudents}</td>
                  <td className="tabular-nums font-semibold">₹{row.highestPackageLpa} LPA</td>
                  <td className="tabular-nums">₹{row.averagePackageLpa} LPA</td>
                  <td>{row.topRecruitersList}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
    </div>
  );
}

export function GrievancePortal({ settings }: { settings: SiteSettings }) {
  const [complainantName, setComplainantName] = useState('');
  const [complainantRole, setComplainantRole] = useState<string>(GRIEVANCE_ROLE_PRESETS[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentOrCell, setDepartmentOrCell] = useState('General Administration');
  const [category, setCategory] = useState<string>(GRIEVANCE_CATEGORY_PRESETS[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaRefresh, setCaptchaRefresh] = useState(0);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; msg: string; code?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [lookupCode, setLookupCode] = useState('');
  const [lookupErr, setLookupErr] = useState('');
  const [lookupData, setLookupData] = useState<{
    ticketCode: string;
    category: string;
    subject: string;
    departmentOrCell: string;
    status: string;
    resolutionNote: string;
    submittedAt: string;
    updatedAt: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch('/api/public/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complainantName,
          complainantRole,
          email,
          phone,
          departmentOrCell,
          category,
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
      setCaptchaAnswer('');
      setCaptchaRefresh((v) => v + 1);
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
      <div
        className="rounded-2xl p-6 sm:p-8 text-white"
        style={{ background: 'linear-gradient(135deg, #7F1D1D 0%, var(--primary-color) 100%)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-1">
          AICTE &amp; UGC Statutory Redressal Mechanism
        </p>
        <h1 className="font-display text-2xl sm:text-4xl font-bold mb-2">
          Online Student Grievance Redressal (SGRC) &amp; Anti-Ragging Helpdesk
        </h1>
        <p className="text-sm text-white/90 max-w-3xl">
          Confidential online submission &amp; real-time status tracking. Anti-Ragging 24x7 Helpline:{' '}
          <strong>{settings.antiRaggingHelpline}</strong> · Campus Emergency: <strong>{settings.emergencyHelpline}</strong>
        </p>
      </div>

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
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold">{lookupData.ticketCode}</span>
                  <span className="px-2 py-0.5 rounded uppercase text-[10px] font-bold bg-amber-100 text-amber-900">
                    {lookupData.status}
                  </span>
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

          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2 text-xs">
            <h3 className="font-display text-base font-bold">Ombudsperson &amp; SGRC Helpline</h3>
            <p className="flex items-center gap-2 text-stone-600 dark:text-slate-300">
              <Phone className="w-3.5 h-3.5 text-rose-600" /> Anti-Ragging Toll-Free: {settings.antiRaggingHelpline}
            </p>
            <p className="flex items-center gap-2 text-stone-600 dark:text-slate-300">
              <Mail className="w-3.5 h-3.5 text-amber-600" /> {settings.email}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
