import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Building2,
  Calendar,
  Download,
  Edit3,
  GraduationCap,
  Plus,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import type {
  Department,
  GrievanceCommitteeMember,
  GrievancePortalConfig,
  GrievanceStatus,
  GrievanceTicket,
  PlacementsData,
  SanctionedIntakeProgram,
  SiteSettings,
} from '../types/cms';
import {
  computePlacementMetrics,
  DEFAULT_GRIEVANCE_PORTAL_CONFIG,
  DEFAULT_INTAKE_PROGRAMS,
} from '../lib/collegeFeaturesLogic';
import { getUploadSizeLimitMb } from '../lib/imageCrop';
import { CustomSelectInput } from './CustomSelectInput';
import { ImageUploader } from './ImageUploader';
import { RichTextEditor } from './RichTextEditor';

interface EngineeringPortalsAdminProps {
  mode: 'placements' | 'grievances';
  placements: PlacementsData;
  grievances: GrievanceTicket[];
  departments: Department[];
  settings: SiteSettings;
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  uploadBinary: (file: File) => Promise<string>;
  notify: (type: 'ok' | 'err', text: string) => void;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function EngineeringPortalsAdmin({
  mode,
  placements,
  grievances,
  departments,
  settings,
  adminFetch,
  uploadBinary,
  notify,
}: EngineeringPortalsAdminProps) {
  const maxPhotoMb = getUploadSizeLimitMb(settings, 'photo');
  const autoCrop = settings.autoCropImages !== false;
  const branchOptions = Array.from(new Set([...departments.map((d) => d.name), 'MBA', 'MCA']));

  // Placements Desk & Form State
  const [tpTab, setTpTab] = useState<'stats' | 'drives_recruiters' | 'stories' | 'intake'>('stats');
  const [summaryNote, setSummaryNote] = useState(placements.summaryNote ?? '');
  const [coordName, setCoordName] = useState(placements.coordinatorName ?? '');
  const [coordEmail, setCoordEmail] = useState(placements.coordinatorEmail ?? '');
  const [coordPhone, setCoordPhone] = useState(placements.coordinatorPhone ?? '');

  // Branch-Wise Placement Stat Edit/Create State
  const [editingStatId, setEditingStatId] = useState<number | null>(null);
  const [stYear, setStYear] = useState('2025-26');
  const [stBranch, setStBranch] = useState(departments[0]?.name || 'Computer Science & Engineering');
  const [stEligible, setStEligible] = useState('120');
  const [stPlaced, setStPlaced] = useState('108');
  const [stHighest, setStHighest] = useState('18.5');
  const [stAvg, setStAvg] = useState('5.6');
  const [stRecruiters, setStRecruiters] = useState('TCS, Infosys, Persistent Systems, Bosch');

  // Placed Student Story Edit/Create State
  const [editingStoryId, setEditingStoryId] = useState<number | null>(null);
  const [stuName, setStuName] = useState('');
  const [stuBranch, setStuBranch] = useState('B.Tech CSE');
  const [stuCompany, setStuCompany] = useState('');
  const [stuLpa, setStuLpa] = useState('');
  const [stuBatch, setStuBatch] = useState('2026');
  const [stuPhoto, setStuPhoto] = useState('/src/assets/images/campus_convocation_1794512597749.jpg');
  const [stuQuote, setStuQuote] = useState('');

  // Upcoming Placement Drive State
  const [drCompany, setDrCompany] = useState('');
  const [drRole, setDrRole] = useState('');
  const [drPackage, setDrPackage] = useState('');
  const [drBranches, setDrBranches] = useState('B.Tech CSE, E&TC, IT');
  const [drDate, setDrDate] = useState(new Date().toISOString().slice(0, 10));
  const [drUrl, setDrUrl] = useState('');
  const [drStatus, setDrStatus] = useState<'upcoming' | 'open' | 'completed'>('open');

  // Esteemed Recruiters State
  const [recruitersText, setRecruitersText] = useState((settings.recruiters || []).join('\n'));

  // AICTE Sanctioned Intake Matrix State
  const [intakeList, setIntakeList] = useState<SanctionedIntakeProgram[]>(
    settings.intakePrograms && settings.intakePrograms.length > 0 ? settings.intakePrograms : DEFAULT_INTAKE_PROGRAMS,
  );
  const [inCode, setInCode] = useState('');
  const [inProgram, setInProgram] = useState('');
  const [inLevel, setInLevel] = useState('UG (4 Years)');
  const [inSeats, setInSeats] = useState('60');
  const [inStatus, setInStatus] = useState('AICTE Approved · Autonomous');
  const [inFee, setInFee] = useState('₹1,14,500');

  // Grievances Queue & SGRC Configuration State
  const [grvTab, setGrvTab] = useState<'queue' | 'committee' | 'charter'>('queue');
  const [gFilter, setGFilter] = useState<'all' | GrievanceStatus>('all');
  const [gStatuses, setGStatuses] = useState<Record<number, GrievanceStatus>>({});
  const [gNotes, setGNotes] = useState<Record<number, string>>({});

  const [gpDraft, setGpDraft] = useState<GrievancePortalConfig>({
    ...DEFAULT_GRIEVANCE_PORTAL_CONFIG,
    ...(settings.grievancePortal || {}),
  });
  const [cmName, setCmName] = useState('');
  const [cmRole, setCmRole] = useState('Member, SGRC');
  const [cmDesig, setCmDesig] = useState('');
  const [cmCommittee, setCmCommittee] = useState('Student Grievance Redressal Committee');
  const [cmEmail, setCmEmail] = useState('');
  const [cmPhone, setCmPhone] = useState('');
  const [cmPhoto, setCmPhoto] = useState('/src/assets/images/leadership_principal_1794512597061.jpg');

  useEffect(() => {
    setSummaryNote(placements.summaryNote ?? '');
    setCoordName(placements.coordinatorName ?? '');
    setCoordEmail(placements.coordinatorEmail ?? '');
    setCoordPhone(placements.coordinatorPhone ?? '');
  }, [placements]);

  useEffect(() => {
    setRecruitersText((settings.recruiters || []).join('\n'));
    if (settings.intakePrograms && settings.intakePrograms.length > 0) {
      setIntakeList(settings.intakePrograms);
    }
    setGpDraft({
      ...DEFAULT_GRIEVANCE_PORTAL_CONFIG,
      ...(settings.grievancePortal || {}),
    });
  }, [settings]);

  if (mode === 'placements') {
    const statMetrics = computePlacementMetrics(placements.stats);

    return (
      <div className="space-y-5">
        {/* Sub-Navigation */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
          <button
            type="button"
            onClick={() => setTpTab('stats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              tpTab === 'stats' ? 'text-white border-transparent' : 'border-stone-200 dark:border-slate-700'
            }`}
            style={tpTab === 'stats' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Branch-Wise Statistics ({placements.stats.length})
          </button>
          <button
            type="button"
            onClick={() => setTpTab('drives_recruiters')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              tpTab === 'drives_recruiters' ? 'text-white border-transparent' : 'border-stone-200 dark:border-slate-700'
            }`}
            style={tpTab === 'drives_recruiters' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Placement Drives ({(placements.upcomingDrives || []).length}) &amp; Recruiters
          </button>
          <button
            type="button"
            onClick={() => setTpTab('stories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              tpTab === 'stories' ? 'text-white border-transparent' : 'border-stone-200 dark:border-slate-700'
            }`}
            style={tpTab === 'stories' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Student Achiever Stories ({placements.stories.length})
          </button>
          <button
            type="button"
            onClick={() => setTpTab('intake')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              tpTab === 'intake' ? 'text-white border-transparent' : 'border-stone-200 dark:border-slate-700'
            }`}
            style={tpTab === 'intake' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Sanctioned Programs &amp; Intake Matrix ({intakeList.length})
          </button>
        </div>

        {/* T&P Summary & Coordinator Settings */}
        {tpTab === 'stats' && (
          <>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await adminFetch('/api/admin/placements/settings', 'PUT', {
                    summaryNote,
                    coordinatorName: coordName,
                    coordinatorEmail: coordEmail,
                    coordinatorPhone: coordPhone,
                  });
                  notify('ok', 'Saved Training & Placement Cell contact & summary.');
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <h2 className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Training &amp; Placement (T&amp;P) Desk Profile
              </h2>
              <textarea
                rows={2}
                value={summaryNote}
                onChange={(e) => setSummaryNote(e.target.value)}
                placeholder="Placement hub summary note..."
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={coordName}
                  onChange={(e) => setCoordName(e.target.value)}
                  placeholder="TPO Name"
                  className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="email"
                  value={coordEmail}
                  onChange={(e) => setCoordEmail(e.target.value)}
                  placeholder="TPO Email"
                  className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={coordPhone}
                  onChange={(e) => setCoordPhone(e.target.value)}
                  placeholder="TPO Phone"
                  className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Save T&amp;P Cell Desk Info
              </button>
            </form>

            {/* Add / Edit Stat + Formatted Table View */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const payload = {
                      academicYear: stYear,
                      branch: stBranch,
                      eligibleStudents: Number(stEligible),
                      placedStudents: Number(stPlaced),
                      highestPackageLpa: Number(stHighest),
                      averagePackageLpa: Number(stAvg),
                      topRecruitersList: stRecruiters,
                    };
                    if (editingStatId) {
                      await adminFetch(`/api/admin/placements/stats/${editingStatId}`, 'PUT', payload);
                      notify('ok', `Updated placement statistics for ${stBranch} (${stYear}).`);
                      setEditingStatId(null);
                    } else {
                      await adminFetch('/api/admin/placements/stats', 'POST', payload);
                      notify('ok', `Added placement statistics for ${stBranch} (${stYear}).`);
                    }
                  } catch (err) {
                    notify('err', (err as Error).message);
                  }
                }}
                className="xl:col-span-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">
                    {editingStatId ? 'Edit Branch Stat Row' : 'Add Branch-Wise Placement Record'}
                  </h3>
                  {editingStatId && (
                    <button
                      type="button"
                      onClick={() => setEditingStatId(null)}
                      className="text-xs underline text-stone-500"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <CustomSelectInput
                  label="Academic Year"
                  required
                  value={stYear}
                  onChange={setStYear}
                  options={['2025-26', '2024-25', '2023-24', '2022-23']}
                  customPlaceholder="Enter custom academic year (e.g. 2026-27)..."
                />
                <CustomSelectInput
                  label="Engineering Branch / Program"
                  required
                  value={stBranch}
                  onChange={setStBranch}
                  options={branchOptions}
                  customPlaceholder="Enter custom branch/program..."
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Eligible</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={stEligible}
                      onChange={(e) => setStEligible(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Placed</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={stPlaced}
                      onChange={(e) => setStPlaced(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Highest (LPA)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={stHighest}
                      onChange={(e) => setStHighest(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Average (LPA)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={stAvg}
                      onChange={(e) => setStAvg(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Major Recruiters</label>
                  <input
                    type="text"
                    value={stRecruiters}
                    onChange={(e) => setStRecruiters(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {editingStatId ? 'Save Stat Changes' : '+ Add Placement Stat Row'}
                </button>
              </form>

              <div className="xl:col-span-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">
                    Published Branch-Wise Placement Statistics Table ({placements.stats.length})
                  </h3>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Overall Placement Rate: {statMetrics.overallRate}%
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="cms-table cms-table-navy w-full text-xs">
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Branch</th>
                        <th>Placed / Elig</th>
                        <th>% Rate</th>
                        <th>Highest / Avg</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statMetrics.rowsWithPct.map((row, idx) => (
                        <tr key={row.id}>
                          <td className="font-mono font-semibold">{row.academicYear}</td>
                          <td>
                            <p className="font-bold text-stone-900 dark:text-white">{row.branch}</p>
                            <p className="text-[11px] text-stone-500">{row.topRecruitersList}</p>
                          </td>
                          <td className="tabular-nums font-semibold">
                            {row.placedStudents}/{row.eligibleStudents}
                          </td>
                          <td className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                            {row.placementRatePct}%
                          </td>
                          <td className="tabular-nums whitespace-nowrap">
                            ₹{row.highestPackageLpa} / ₹{row.averagePackageLpa} LPA
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const ids = placements.stats.map((s) => s.id);
                                  [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                                  adminFetch('/api/admin/placements/stats/reorder', 'PUT', { orderedIds: ids }).then(
                                    () => notify('ok', 'Reordered placement rows.'),
                                  );
                                }}
                                className="p-1 rounded border disabled:opacity-30"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === placements.stats.length - 1}
                                onClick={() => {
                                  const ids = placements.stats.map((s) => s.id);
                                  [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                                  adminFetch('/api/admin/placements/stats/reorder', 'PUT', { orderedIds: ids }).then(
                                    () => notify('ok', 'Reordered placement rows.'),
                                  );
                                }}
                                className="p-1 rounded border disabled:opacity-30"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStatId(row.id);
                                  setStYear(row.academicYear);
                                  setStBranch(row.branch);
                                  setStEligible(String(row.eligibleStudents));
                                  setStPlaced(String(row.placedStudents));
                                  setStHighest(String(row.highestPackageLpa));
                                  setStAvg(String(row.averagePackageLpa));
                                  setStRecruiters(row.topRecruitersList);
                                }}
                                className="p-1 rounded border text-stone-700 dark:text-slate-200 hover:bg-stone-100"
                                title="Edit row"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  adminFetch(`/api/admin/placements/stats/${row.id}`, 'DELETE').then(() =>
                                    notify('ok', 'Removed placement record.'),
                                  )
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Upcoming Drives & Recruiters */}
        {tpTab === 'drives_recruiters' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await adminFetch('/api/admin/placements/drives', 'POST', {
                    company: drCompany,
                    roleTitle: drRole,
                    packageLpa: drPackage,
                    eligibleBranches: drBranches,
                    driveDate: drDate,
                    applyUrl: drUrl,
                    status: drStatus,
                  });
                  setDrCompany('');
                  setDrRole('');
                  setDrPackage('');
                  setDrUrl('');
                  notify('ok', `Published campus placement drive for ${drCompany}.`);
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Add Upcoming Campus Placement Drive
              </h3>
              <input
                type="text"
                required
                value={drCompany}
                onChange={(e) => setDrCompany(e.target.value)}
                placeholder="Recruiting Company (e.g. TCS Digital) *"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={drRole}
                  onChange={(e) => setDrRole(e.target.value)}
                  placeholder="Role (e.g. Graduate Trainee) *"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  required
                  value={drPackage}
                  onChange={(e) => setDrPackage(e.target.value)}
                  placeholder="CTC Package (e.g. ₹7.0 LPA) *"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="date"
                  value={drDate}
                  onChange={(e) => setDrDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <select
                  value={drStatus}
                  onChange={(e) => setDrStatus(e.target.value as 'upcoming' | 'open' | 'completed')}
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="open">Registrations Open</option>
                  <option value="upcoming">Upcoming Schedule</option>
                  <option value="completed">Drive Completed</option>
                </select>
              </div>
              <input
                type="text"
                value={drBranches}
                onChange={(e) => setDrBranches(e.target.value)}
                placeholder="Eligible Branches (e.g. B.Tech CSE, E&TC, Mechanical)"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="url"
                value={drUrl}
                onChange={(e) => setDrUrl(e.target.value)}
                placeholder="Registration Form / T&P Link (https://...)"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                + Publish Placement Drive
              </button>

              <div className="pt-4 border-t border-stone-200 dark:border-slate-800 space-y-2">
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  Esteemed Campus Recruiters List (One per line)
                </h4>
                <textarea
                  rows={5}
                  value={recruitersText}
                  onChange={(e) => setRecruitersText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() =>
                    adminFetch('/api/admin/placements/recruiters', 'PUT', {
                      recruiters: recruitersText.split('\n').map((s) => s.trim()).filter(Boolean),
                    })
                      .then(() => notify('ok', 'Updated Esteemed Campus Recruiters directory.'))
                      .catch((err) => notify('err', (err as Error).message))
                  }
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--secondary-color)' }}
                >
                  Save Recruiters Directory
                </button>
              </div>
            </form>

            <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-bold">
                Scheduled Campus Placement Drives ({(placements.upcomingDrives || []).length})
              </h3>
              {(placements.upcomingDrives || []).length === 0 ? (
                <p className="text-xs text-stone-500">No upcoming drives listed yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="cms-table cms-table-navy w-full text-xs">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Company &amp; Role</th>
                        <th>Package</th>
                        <th>Eligible Branches</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(placements.upcomingDrives || []).map((dr) => (
                        <tr key={dr.id}>
                          <td className="font-mono">{dr.driveDate}</td>
                          <td>
                            <p className="font-bold">{dr.company}</p>
                            <p className="text-stone-500">{dr.roleTitle}</p>
                          </td>
                          <td className="font-semibold text-emerald-700">{dr.packageLpa}</td>
                          <td>{dr.eligibleBranches}</td>
                          <td className="uppercase font-bold">{dr.status}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() =>
                                adminFetch(`/api/admin/placements/drives/${dr.id}`, 'DELETE').then(() =>
                                  notify('ok', `Removed drive for ${dr.company}.`),
                                )
                              }
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Placed Student Success Stories */}
        {tpTab === 'stories' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const payload = {
                    studentName: stuName,
                    branch: stuBranch,
                    company: stuCompany,
                    packageLpa: stuLpa,
                    batchYear: stuBatch,
                    photoUrl: stuPhoto,
                    quote: stuQuote,
                  };
                  if (editingStoryId) {
                    await adminFetch(`/api/admin/placements/stories/${editingStoryId}`, 'PUT', payload);
                    notify('ok', `Updated placement story for ${stuName}.`);
                    setEditingStoryId(null);
                  } else {
                    await adminFetch('/api/admin/placements/stories', 'POST', payload);
                    notify('ok', `Added placement story for ${stuName}.`);
                  }
                  setStuName('');
                  setStuCompany('');
                  setStuLpa('');
                  setStuQuote('');
                } catch (err) {
                  notify('err', (err as Error).message);
                }
              }}
              className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  {editingStoryId ? 'Edit Placed Student Story' : 'Add Placed Student Story'}
                </h3>
                {editingStoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStoryId(null);
                      setStuName('');
                      setStuCompany('');
                      setStuLpa('');
                      setStuQuote('');
                    }}
                    className="text-xs underline"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={stuName}
                  onChange={(e) => setStuName(e.target.value)}
                  placeholder="Student Name *"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  required
                  value={stuBranch}
                  onChange={(e) => setStuBranch(e.target.value)}
                  placeholder="Branch (e.g. B.Tech CSE)"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  required
                  value={stuCompany}
                  onChange={(e) => setStuCompany(e.target.value)}
                  placeholder="Company Placed In *"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={stuLpa}
                  onChange={(e) => setStuLpa(e.target.value)}
                  placeholder="Package (e.g. ₹14.5 LPA)"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <input
                type="text"
                value={stuBatch}
                onChange={(e) => setStuBatch(e.target.value)}
                placeholder="Batch Year (e.g. 2026)"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <ImageUploader
                label="Student Photo (1:1 Auto-Crop)"
                value={stuPhoto}
                onChange={setStuPhoto}
                uploadBinary={uploadBinary}
                aspectRatio="1:1"
                maxPhotoMb={maxPhotoMb}
                autoCropEnabled={autoCrop}
              />
              <textarea
                rows={2}
                value={stuQuote}
                onChange={(e) => setStuQuote(e.target.value)}
                placeholder="Student experience quote..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {editingStoryId ? 'Save Student Story' : '+ Add Placed Student Story'}
              </button>
            </form>

            <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-bold">Student Achiever Stories ({placements.stories.length})</h3>
              <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
                {placements.stories.map((st, idx) => (
                  <div key={st.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={st.photoUrl}
                        alt={st.studentName}
                        className="w-12 h-12 rounded-lg object-cover border shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 dark:text-white">
                          {st.studentName} · {st.company} ({st.packageLpa})
                        </p>
                        <p className="text-stone-500">
                          {st.branch} · Batch {st.batchYear}
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">{st.quote}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const ids = placements.stories.map((s) => s.id);
                          [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                          adminFetch('/api/admin/placements/stories/reorder', 'PUT', { orderedIds: ids }).then(
                            () => notify('ok', 'Reordered stories.'),
                          );
                        }}
                        className="p-1 rounded border disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === placements.stories.length - 1}
                        onClick={() => {
                          const ids = placements.stories.map((s) => s.id);
                          [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                          adminFetch('/api/admin/placements/stories/reorder', 'PUT', { orderedIds: ids }).then(
                            () => notify('ok', 'Reordered stories.'),
                          );
                        }}
                        className="p-1 rounded border disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStoryId(st.id);
                          setStuName(st.studentName);
                          setStuBranch(st.branch);
                          setStuCompany(st.company);
                          setStuLpa(st.packageLpa);
                          setStuBatch(st.batchYear);
                          setStuPhoto(st.photoUrl);
                          setStuQuote(st.quote);
                        }}
                        className="p-1 rounded border"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          adminFetch(`/api/admin/placements/stories/${st.id}`, 'DELETE').then(() =>
                            notify('ok', `Removed story for ${st.studentName}.`),
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
            </div>
          </div>
        )}

        {/* Sanctioned Programs, AICTE Intake & FRA Fee Matrix */}
        {tpTab === 'intake' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inProgram.trim()) return;
                const next: SanctionedIntakeProgram[] = [
                  ...intakeList,
                  {
                    id: Math.max(0, ...intakeList.map((i) => i.id)) + 1,
                    code: inCode.trim() || '622000000',
                    programName: inProgram.trim(),
                    level: inLevel.trim(),
                    sanctionedIntake: Math.max(1, Number(inSeats) || 60),
                    accreditationStatus: inStatus.trim(),
                    annualFee: inFee.trim(),
                    sortOrder: intakeList.length + 1,
                  },
                ];
                setIntakeList(next);
                setInCode('');
                setInProgram('');
                await adminFetch('/api/admin/settings', 'PUT', { intakePrograms: next });
                notify('ok', 'Added Sanctioned Engineering Program & saved matrix.');
              }}
              className="xl:col-span-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-amber-600" />
                Add AICTE Program / Sanctioned Intake
              </h3>
              <input
                type="text"
                required
                value={inProgram}
                onChange={(e) => setInProgram(e.target.value)}
                placeholder="Program Name (e.g. B.Tech AI & Data Science) *"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={inCode}
                  onChange={(e) => setInCode(e.target.value)}
                  placeholder="DTE Choice Code"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  value={inSeats}
                  onChange={(e) => setInSeats(e.target.value)}
                  placeholder="Intake (e.g. 60)"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={inLevel}
                  onChange={(e) => setInLevel(e.target.value)}
                  placeholder="Level (UG / PG)"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={inFee}
                  onChange={(e) => setInFee(e.target.value)}
                  placeholder="FRA Annual Fee"
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <input
                type="text"
                value={inStatus}
                onChange={(e) => setInStatus(e.target.value)}
                placeholder="Accreditation / Approval Status"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                + Add Sanctioned Program
              </button>
            </form>

            <div className="xl:col-span-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="text-sm font-bold">AICTE Sanctioned Programs &amp; FRA Fee Matrix ({intakeList.length})</h3>
              <div className="overflow-x-auto">
                <table className="cms-table cms-table-navy w-full text-xs">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Program</th>
                      <th>Level</th>
                      <th>Intake</th>
                      <th>Fee</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intakeList.map((prog, idx) => (
                      <tr key={prog.id}>
                        <td className="font-mono">{prog.code}</td>
                        <td>
                          <p className="font-bold">{prog.programName}</p>
                          <p className="text-[11px] text-stone-500">{prog.accreditationStatus}</p>
                        </td>
                        <td>{prog.level}</td>
                        <td className="font-bold tabular-nums">{prog.sanctionedIntake}</td>
                        <td>{prog.annualFee}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={async () => {
                                const arr = [...intakeList];
                                [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                arr.forEach((p, i) => (p.sortOrder = i + 1));
                                setIntakeList(arr);
                                await adminFetch('/api/admin/settings', 'PUT', { intakePrograms: arr });
                                notify('ok', 'Reordered sanctioned programs.');
                              }}
                              className="p-1 rounded border disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === intakeList.length - 1}
                              onClick={async () => {
                                const arr = [...intakeList];
                                [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                arr.forEach((p, i) => (p.sortOrder = i + 1));
                                setIntakeList(arr);
                                await adminFetch('/api/admin/settings', 'PUT', { intakePrograms: arr });
                                notify('ok', 'Reordered sanctioned programs.');
                              }}
                              className="p-1 rounded border disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const next = intakeList.filter((x) => x.id !== prog.id);
                                setIntakeList(next);
                                await adminFetch('/api/admin/settings', 'PUT', { intakePrograms: next });
                                notify('ok', 'Removed program from intake matrix.');
                              }}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // GRIEVANCE REDRESSAL & ANTI-RAGGING ADMIN (Tickets Queue + Committee Photo Cards + Ombudsperson/SLA Charter)
  const filteredGrievances =
    gFilter === 'all' ? grievances : grievances.filter((g) => g.status === gFilter);

  const saveGrievanceConfig = async (nextConfig: GrievancePortalConfig, msg: string) => {
    try {
      setGpDraft(nextConfig);
      await adminFetch('/api/admin/grievances/config', 'PUT', nextConfig);
      notify('ok', msg);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setGrvTab('queue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              grvTab === 'queue' ? 'text-white border-transparent' : 'border-stone-200 dark:border-slate-700'
            }`}
            style={grvTab === 'queue' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Redressal Tickets Queue ({grievances.length})
          </button>
          <button
            type="button"
            onClick={() => setGrvTab('committee')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              grvTab === 'committee' ? 'text-white border-transparent' : 'border-stone-200 dark:border-slate-700'
            }`}
            style={grvTab === 'committee' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Ombudsperson &amp; SGRC Committee Photos ({gpDraft.committeeMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setGrvTab('charter')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              grvTab === 'charter' ? 'text-white border-transparent' : 'border-stone-200 dark:border-slate-700'
            }`}
            style={grvTab === 'charter' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Escalation SLA Matrix &amp; Portal Charter
          </button>
        </div>

        {grvTab === 'queue' && (
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                'sgrc-grievance-register.csv',
                ['Ticket Code', 'Subject', 'Category', 'Urgency', 'Complainant', 'Role', 'Status', 'Submitted At'],
                grievances.map((t) => [
                  t.ticketCode,
                  t.subject,
                  t.category,
                  t.urgency || 'normal',
                  t.complainantName,
                  t.complainantRole,
                  t.status,
                  t.submittedAt,
                ]),
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" /> Export Grievance CSV
          </button>
        )}
      </div>

      {/* 1. TICKETS MODERATION QUEUE */}
      {grvTab === 'queue' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h2 className="text-base font-bold">
                SGRC &amp; Anti-Ragging Grievance Redressal Queue ({grievances.length})
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(['all', 'submitted', 'in_review', 'resolved', 'closed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setGFilter(st)}
                  className={`px-3 py-1 rounded-lg font-semibold uppercase border ${
                    gFilter === st
                      ? 'text-white border-transparent'
                      : 'bg-stone-50 dark:bg-slate-800 border-stone-300 dark:border-slate-700'
                  }`}
                  style={gFilter === st ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredGrievances.map((ticket) => {
              const curStatus = gStatuses[ticket.id] ?? ticket.status;
              const curNote = gNotes[ticket.id] ?? (ticket.resolutionNote || '');
              return (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-amber-700">{ticket.ticketCode}</span>
                        <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-slate-800 font-semibold">
                          {ticket.category}
                        </span>
                        {ticket.urgency && (
                          <span
                            className={`px-2 py-0.5 rounded font-bold uppercase ${
                              String(ticket.urgency).toLowerCase() === 'urgent'
                                ? 'bg-rose-600 text-white'
                                : String(ticket.urgency).toLowerCase() === 'high'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-stone-200 text-stone-800'
                            }`}
                          >
                            {ticket.urgency}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold uppercase">
                          {ticket.status}
                        </span>
                        {ticket.isAnonymous && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-white font-semibold">
                            Confidential Filing
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-1">{ticket.subject}</h3>
                      <p className="text-stone-500">
                        From: <strong>{ticket.complainantName}</strong> ({ticket.complainantRole}) · {ticket.email}{' '}
                        {ticket.phone ? `· ${ticket.phone}` : ''} · Cell: {ticket.departmentOrCell}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="block text-[11px] font-mono text-stone-400">
                        Submitted {ticket.submittedAt}
                      </span>
                      {ticket.attachmentUrl && (
                        <a
                          href={ticket.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-2 py-1 rounded border border-stone-300 font-semibold text-amber-700"
                        >
                          View Evidence Attachment
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-stone-700 dark:text-slate-300 bg-stone-50 dark:bg-slate-800/50 p-3 rounded-lg">
                    {ticket.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={curStatus}
                      onChange={(e) =>
                        setGStatuses((prev) => ({ ...prev, [ticket.id]: e.target.value as GrievanceStatus }))
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="in_review">In Committee Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <input
                      type="text"
                      value={curNote}
                      onChange={(e) => setGNotes((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                      placeholder="Enter official SGRC / committee resolution response..."
                      className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await adminFetch(`/api/admin/grievances/${ticket.id}`, 'PUT', {
                          status: curStatus,
                          resolutionNote: curNote,
                        });
                        notify('ok', `Updated grievance ticket ${ticket.ticketCode}.`);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-white font-bold"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                    >
                      Save Response
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminFetch(`/api/admin/grievances/${ticket.id}`, 'DELETE').then(() =>
                          notify('ok', `Deleted ticket ${ticket.ticketCode}.`),
                        )
                      }
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. OMBUDSPERSON PROFILE, 24x7 HELPLINES & SGRC COMMITTEE PHOTO CARDS */}
      {grvTab === 'committee' && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveGrievanceConfig(gpDraft, 'Saved Ombudsperson, ICC & 24x7 Anti-Ragging Helpline settings.');
            }}
            className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 text-xs"
          >
            <h3 className="text-sm font-bold">Appointed Institutional Ombudsperson &amp; Statutory Helplines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={gpDraft.ombudspersonName}
                onChange={(e) => setGpDraft({ ...gpDraft, ombudspersonName: e.target.value })}
                placeholder="Ombudsperson Full Name"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={gpDraft.ombudspersonDesignation}
                onChange={(e) => setGpDraft({ ...gpDraft, ombudspersonDesignation: e.target.value })}
                placeholder="Designation & UGC Notification"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="email"
                value={gpDraft.ombudspersonEmail}
                onChange={(e) => setGpDraft({ ...gpDraft, ombudspersonEmail: e.target.value })}
                placeholder="Ombudsperson Email"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={gpDraft.ombudspersonPhone}
                onChange={(e) => setGpDraft({ ...gpDraft, ombudspersonPhone: e.target.value })}
                placeholder="Ombudsperson Phone"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={gpDraft.antiRaggingSquadPhone}
                onChange={(e) => setGpDraft({ ...gpDraft, antiRaggingSquadPhone: e.target.value })}
                placeholder="24x7 Campus Anti-Ragging Squad Phone"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="url"
                value={gpDraft.ugcAffidavitUrl}
                onChange={(e) => setGpDraft({ ...gpDraft, ugcAffidavitUrl: e.target.value })}
                placeholder="UGC Anti-Ragging Undertaking Portal URL"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={gpDraft.iccCoordinatorName}
                onChange={(e) => setGpDraft({ ...gpDraft, iccCoordinatorName: e.target.value })}
                placeholder="ICC Presiding Officer Name"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="email"
                value={gpDraft.iccCoordinatorEmail}
                onChange={(e) => setGpDraft({ ...gpDraft, iccCoordinatorEmail: e.target.value })}
                placeholder="ICC Presiding Officer Email"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <ImageUploader
              label="Ombudsperson Portrait Photo (1:1 Auto-Crop)"
              value={gpDraft.ombudspersonPhotoUrl}
              onChange={(url) => setGpDraft({ ...gpDraft, ombudspersonPhotoUrl: url })}
              uploadBinary={uploadBinary}
              aspectRatio="1:1"
              maxPhotoMb={maxPhotoMb}
              autoCropEnabled={autoCrop}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg font-bold text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Save Ombudsperson &amp; Helpline Contacts
            </button>
          </form>

          {/* Add & Reorder Committee Members */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!cmName.trim()) return;
                const member: GrievanceCommitteeMember = {
                  id: Date.now(),
                  name: cmName.trim(),
                  roleTitle: cmRole.trim(),
                  designation: cmDesig.trim(),
                  committeeName: cmCommittee.trim(),
                  email: cmEmail.trim(),
                  phone: cmPhone.trim(),
                  photoUrl: cmPhoto,
                  sortOrder: gpDraft.committeeMembers.length + 1,
                };
                const next = { ...gpDraft, committeeMembers: [...gpDraft.committeeMembers, member] };
                setCmName('');
                setCmDesig('');
                setCmEmail('');
                setCmPhone('');
                await saveGrievanceConfig(next, `Added SGRC member "${member.name}".`);
              }}
              className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
            >
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-rose-600" /> Add SGRC / Anti-Ragging Squad Member Photo Card
              </h3>
              <input
                type="text"
                required
                value={cmName}
                onChange={(e) => setCmName(e.target.value)}
                placeholder="Member Name *"
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={cmRole}
                  onChange={(e) => setCmRole(e.target.value)}
                  placeholder="Role (e.g. Chairperson, SGRC)"
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={cmDesig}
                  onChange={(e) => setCmDesig(e.target.value)}
                  placeholder="Academic Designation"
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <input
                type="text"
                value={cmCommittee}
                onChange={(e) => setCmCommittee(e.target.value)}
                placeholder="Committee Name"
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  value={cmEmail}
                  onChange={(e) => setCmEmail(e.target.value)}
                  placeholder="Email"
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={cmPhone}
                  onChange={(e) => setCmPhone(e.target.value)}
                  placeholder="Phone"
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploader
                label="Committee Member Photo (1:1 Auto-Crop)"
                value={cmPhoto}
                onChange={setCmPhoto}
                uploadBinary={uploadBinary}
                aspectRatio="1:1"
                maxPhotoMb={maxPhotoMb}
                autoCropEnabled={autoCrop}
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                <Plus className="w-3.5 h-3.5 inline mr-1" /> Add Committee Photo Card
              </button>
            </form>

            <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
              <h3 className="text-sm font-bold">SGRC &amp; Anti-Ragging Squad Roster ({gpDraft.committeeMembers.length})</h3>
              <div className="divide-y divide-stone-100 dark:divide-slate-800">
                {gpDraft.committeeMembers.map((m, idx) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={m.photoUrl} alt={m.name} className="w-12 h-12 rounded-lg object-cover border shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{m.name}</p>
                        <p className="text-rose-700 font-semibold">{m.roleTitle} · {m.committeeName}</p>
                        <p className="text-stone-500 truncate">{m.email} · {m.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const arr = [...gpDraft.committeeMembers];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          arr.forEach((x, i) => (x.sortOrder = i + 1));
                          saveGrievanceConfig({ ...gpDraft, committeeMembers: arr }, 'Reordered committee members.');
                        }}
                        className="p-1 rounded border disabled:opacity-30"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === gpDraft.committeeMembers.length - 1}
                        onClick={() => {
                          const arr = [...gpDraft.committeeMembers];
                          [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                          arr.forEach((x, i) => (x.sortOrder = i + 1));
                          saveGrievanceConfig({ ...gpDraft, committeeMembers: arr }, 'Reordered committee members.');
                        }}
                        className="p-1 rounded border disabled:opacity-30"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          saveGrievanceConfig(
                            { ...gpDraft, committeeMembers: gpDraft.committeeMembers.filter((x) => x.id !== m.id) },
                            `Removed ${m.name}.`,
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
            </div>
          </div>
        </div>
      )}

      {/* 3. ESCALATION SLA MATRIX & PORTAL CHARTER */}
      {grvTab === 'charter' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveGrievanceConfig(gpDraft, 'Saved SGRC Hero text, SLAs, and Formatted Escalation Matrix.');
          }}
          className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 text-xs"
        >
          <h3 className="text-sm font-bold">Grievance Portal Headline, SLAs &amp; Visual Charter</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={gpDraft.heroTitle}
              onChange={(e) => setGpDraft({ ...gpDraft, heroTitle: e.target.value })}
              placeholder="Portal Title"
              className="md:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
            />
            <textarea
              rows={2}
              value={gpDraft.heroSubtitle}
              onChange={(e) => setGpDraft({ ...gpDraft, heroSubtitle: e.target.value })}
              placeholder="Portal Subtitle"
              className="md:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div>
              <label className="block font-semibold mb-1">Acknowledgement SLA</label>
              <input
                type="text"
                value={gpDraft.slaAcknowledgementHours}
                onChange={(e) => setGpDraft({ ...gpDraft, slaAcknowledgementHours: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Final Resolution SLA</label>
              <input
                type="text"
                value={gpDraft.slaResolutionDays}
                onChange={(e) => setGpDraft({ ...gpDraft, slaResolutionDays: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <RichTextEditor
            label="Escalation Matrix & Statutory Grievance Charter (Visual HTML Editor)"
            value={gpDraft.charterHtml}
            onChange={(html) => setGpDraft({ ...gpDraft, charterHtml: html })}
            uploadBinary={uploadBinary}
            maxPhotoMb={maxPhotoMb}
            autoCropEnabled={autoCrop}
            minHeight={220}
          />

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg font-bold text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Save Portal Charter &amp; SLA Configuration
          </button>
        </form>
      )}
    </div>
  );
}
