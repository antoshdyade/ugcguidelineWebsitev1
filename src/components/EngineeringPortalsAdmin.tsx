import React, { useEffect, useState } from 'react';
import { Award, ShieldAlert, Trash2, TrendingUp } from 'lucide-react';
import type {
  Department,
  GrievanceStatus,
  GrievanceTicket,
  PlacementsData,
  SiteSettings,
} from '../types/cms';
import { getUploadSizeLimitMb } from '../lib/imageCrop';
import { CustomSelectInput } from './CustomSelectInput';
import { ImageUploader } from './ImageUploader';

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
  // Placements state
  const [summaryNote, setSummaryNote] = useState(placements.summaryNote ?? '');
  const [coordName, setCoordName] = useState(placements.coordinatorName ?? '');
  const [coordEmail, setCoordEmail] = useState(placements.coordinatorEmail ?? '');
  const [coordPhone, setCoordPhone] = useState(placements.coordinatorPhone ?? '');

  useEffect(() => {
    setSummaryNote(placements.summaryNote ?? '');
    setCoordName(placements.coordinatorName ?? '');
    setCoordEmail(placements.coordinatorEmail ?? '');
    setCoordPhone(placements.coordinatorPhone ?? '');
  }, [placements]);

  const [stYear, setStYear] = useState('2025-26');
  const [stBranch, setStBranch] = useState(departments[0]?.name || 'Computer Science & Engineering');
  const [stEligible, setStEligible] = useState('120');
  const [stPlaced, setStPlaced] = useState('108');
  const [stHighest, setStHighest] = useState('18.5');
  const [stAvg, setStAvg] = useState('5.6');
  const [stRecruiters, setStRecruiters] = useState('TCS, Infosys, Persistent Systems, Bosch');

  const [stuName, setStuName] = useState('');
  const [stuBranch, setStuBranch] = useState('B.Tech CSE');
  const [stuCompany, setStuCompany] = useState('');
  const [stuLpa, setStuLpa] = useState('');
  const [stuBatch, setStuBatch] = useState('2026');
  const [stuPhoto, setStuPhoto] = useState('/src/assets/images/campus_convocation_1794512597749.jpg');
  const [stuQuote, setStuQuote] = useState('');

  // Grievances state
  const [gFilter, setGFilter] = useState<'all' | GrievanceStatus>('all');
  const [gStatuses, setGStatuses] = useState<Record<number, GrievanceStatus>>({});
  const [gNotes, setGNotes] = useState<Record<number, string>>({});

  const maxPhotoMb = getUploadSizeLimitMb(settings, 'photo');
  const autoCrop = settings.autoCropImages !== false;
  const branchOptions = Array.from(new Set([...departments.map((d) => d.name), 'MBA', 'MCA']));

  if (mode === 'placements') {
    return (
      <div className="space-y-6">
        {/* T&P Summary & Coordinator Settings */}
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

        {/* Branch-Wise Placement Stats */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await adminFetch('/api/admin/placements/stats', 'POST', {
                  academicYear: stYear,
                  branch: stBranch,
                  eligibleStudents: Number(stEligible),
                  placedStudents: Number(stPlaced),
                  highestPackageLpa: Number(stHighest),
                  averagePackageLpa: Number(stAvg),
                  topRecruitersList: stRecruiters,
                });
                notify('ok', `Added placement statistics for ${stBranch} (${stYear}).`);
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <h3 className="text-sm font-bold">Add Branch-Wise Placement Record</h3>
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
                <label className="block text-xs font-semibold mb-1">Eligible Students</label>
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
                <label className="block text-xs font-semibold mb-1">Placed Students</label>
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
                <label className="block text-xs font-semibold mb-1">Highest Package (LPA)</label>
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
                <label className="block text-xs font-semibold mb-1">Average Package (LPA)</label>
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
              + Add Placement Stat Row
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-sm font-bold">Published Placement Statistics ({placements.stats.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
              {placements.stats.map((row) => (
                <div key={row.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-stone-900 dark:text-white">
                      {row.academicYear} · {row.branch}
                    </p>
                    <p className="text-stone-500">
                      Placed: {row.placedStudents}/{row.eligibleStudents} · Highest: ₹{row.highestPackageLpa} LPA · Avg: ₹{row.averagePackageLpa} LPA
                    </p>
                    <p className="text-[11px] text-stone-400">{row.topRecruitersList}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      adminFetch(`/api/admin/placements/stats/${row.id}`, 'DELETE').then(() =>
                        notify('ok', 'Removed placement record.'),
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

        {/* Placed Student Success Stories */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await adminFetch('/api/admin/placements/stories', 'POST', {
                  studentName: stuName,
                  branch: stuBranch,
                  company: stuCompany,
                  packageLpa: stuLpa,
                  batchYear: stuBatch,
                  photoUrl: stuPhoto,
                  quote: stuQuote,
                });
                setStuName('');
                setStuCompany('');
                setStuLpa('');
                setStuQuote('');
                notify('ok', `Added placement story for ${stuName}.`);
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <h3 className="text-sm font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" /> Add Placed Student Story
            </h3>
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
              + Add Placed Student Story
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-sm font-bold">Student Achiever Stories ({placements.stories.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
              {placements.stories.map((st) => (
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
                      <p className="text-stone-500">{st.branch} · Batch {st.batchYear}</p>
                      <p className="text-[11px] text-stone-400 truncate">{st.quote}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      adminFetch(`/api/admin/placements/stories/${st.id}`, 'DELETE').then(() =>
                        notify('ok', `Removed story for ${st.studentName}.`),
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
      </div>
    );
  }

  // GRIEVANCE REDRESSAL MODERATION QUEUE
  const filteredGrievances =
    gFilter === 'all' ? grievances : grievances.filter((g) => g.status === gFilter);

  return (
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
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold uppercase">
                      {ticket.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white mt-1">{ticket.subject}</h3>
                  <p className="text-stone-500">
                    From: <strong>{ticket.complainantName}</strong> ({ticket.complainantRole}) · {ticket.email}{' '}
                    {ticket.phone ? `· ${ticket.phone}` : ''} · Cell: {ticket.departmentOrCell}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-stone-400">Submitted {ticket.submittedAt}</span>
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
  );
}
