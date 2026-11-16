import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Download,
  FileCheck2,
  Globe2,
  Plus,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import type {
  Conference,
  ConferenceFeeTier,
  ConferenceImportantDate,
  ConferencePaperStatus,
  ConferencePerson,
  ConferenceRegistration,
  ConferenceScheduleItem,
  ConferenceSlide,
  ConferenceSubmission,
  ConferenceTrack,
  Department,
  SiteSettings,
} from '../types/cms';
import {
  CONFERENCE_MODE_PRESETS,
  CONFERENCE_ROLE_PRESETS,
  CONFERENCE_SCOPE_PRESETS,
  CONFERENCE_SUBMISSION_PLATFORM_PRESETS,
  isExternalPaperSubmissionActive,
} from '../lib/collegeFeaturesLogic';
import { getUploadSizeLimitBytes, getUploadSizeLimitMb } from '../lib/imageCrop';
import { CustomSelectInput } from './CustomSelectInput';
import { ImageUploader } from './ImageUploader';
import { RichTextEditor } from './RichTextEditor';

interface ConferenceAdminPanelProps {
  conferences: Conference[];
  submissions: ConferenceSubmission[];
  registrations: ConferenceRegistration[];
  departments: Department[];
  settings: SiteSettings;
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  uploadBinary: (file: File) => Promise<string>;
  notify: (type: 'ok' | 'err', text: string) => void;
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | undefined)[][]) {
  const esc = (v: string | number | undefined) => {
    const s = String(v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };
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

export function ConferenceAdminPanel({
  conferences,
  submissions,
  registrations,
  departments,
  settings,
  adminFetch,
  uploadBinary,
  notify,
}: ConferenceAdminPanelProps) {
  const [selectedId, setSelectedId] = useState<number>(conferences[0]?.id || 0);
  const [subTab, setSubTab] = useState<'overview' | 'program' | 'people' | 'submissions' | 'registrations' | 'research-slider'>('overview');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [researchSlides, setResearchSlides] = useState<ConferenceSlide[]>(settings.researchSliderSlides || []);
  const [rSlideTitle, setRSlideTitle] = useState('');
  const [rSlideCap, setRSlideCap] = useState('');
  const [rSlideImg, setRSlideImg] = useState('/src/assets/images/hero_campus_aerial_1794512596442.jpg');
  const [rSlideCtaLabel, setRSlideCtaLabel] = useState('Explore Program');
  const [rSlideCtaLink, setRSlideCtaLink] = useState('/conferences');
  const [cSlideTitle, setCSlideTitle] = useState('');
  const [cSlideCap, setCSlideCap] = useState('');
  const [cSlideImg, setCSlideImg] = useState('/src/assets/images/hero_campus_aerial_1794512596442.jpg');
  const [cSlideCtaLabel, setCSlideCtaLabel] = useState('');
  const [cSlideCtaLink, setCSlideCtaLink] = useState('');
  const [customSecTitle, setCustomSecTitle] = useState('');
  const [customSecHtml, setCustomSecHtml] = useState('<p>Add custom accommodation, publication ethics, or sponsorship details here.</p>');

  useEffect(() => {
    setResearchSlides(settings.researchSliderSlides || []);
  }, [settings.researchSliderSlides]);

  // Create New Conference State
  const [newTitle, setNewTitle] = useState('');
  const [newShort, setNewShort] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newScope, setNewScope] = useState<string>(CONFERENCE_SCOPE_PRESETS[0]);
  const [newMode, setNewMode] = useState<string>(CONFERENCE_MODE_PRESETS[0]);
  const [newTheme, setNewTheme] = useState('');
  const [newStart, setNewStart] = useState(new Date().toISOString().slice(0, 10));
  const [newEnd, setNewEnd] = useState(new Date().toISOString().slice(0, 10));
  const [newVenue, setNewVenue] = useState("SVERI's COE Auditorium, Pandharpur");
  const [newDept, setNewDept] = useState(departments[0]?.name || 'All Engineering Departments');
  const [newBanner, setNewBanner] = useState('/src/assets/images/hero_campus_aerial_1794512596442.jpg');

  const selectedConf = useMemo(
    () => conferences.find((c) => c.id === selectedId) || conferences[0],
    [conferences, selectedId],
  );

  // Editable Draft for Selected Conference
  const [draft, setDraft] = useState<Conference | null>(selectedConf ? structuredClone(selectedConf) : null);

  useEffect(() => {
    if (selectedConf) {
      setDraft(structuredClone(selectedConf));
    } else {
      setDraft(null);
    }
  }, [selectedConf]);

  // Program add forms (Tracks, Dates, Schedule, Fees)
  const [trTitle, setTrTitle] = useState('');
  const [trChair, setTrChair] = useState('');
  const [trDesc, setTrDesc] = useState('');

  const [dtLabel, setDtLabel] = useState('');
  const [dtDate, setDtDate] = useState('');
  const [dtNote, setDtNote] = useState('');

  const [scDay, setScDay] = useState('Day 1');
  const [scTime, setScTime] = useState('09:30 AM - 11:00 AM');
  const [scTrack, setScTrack] = useState('');
  const [scSession, setScSession] = useState('');
  const [scSpeaker, setScSpeaker] = useState('');
  const [scVenue, setScVenue] = useState('Main Auditorium');

  const [feeLabel, setFeeLabel] = useState('');
  const [feeInr, setFeeInr] = useState('');
  const [feeUsd, setFeeUsd] = useState('');
  const [feeNote, setFeeNote] = useState('');

  // People add form (Keynote & Committee Photo Cards)
  const [pKind, setPKind] = useState<'keynote' | 'committee'>('keynote');
  const [pRole, setPRole] = useState<string>(CONFERENCE_ROLE_PRESETS[0]);
  const [pName, setPName] = useState('');
  const [pDesig, setPDesig] = useState('');
  const [pAffil, setPAffil] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pBio, setPBio] = useState('');
  const [pPhoto, setPPhoto] = useState('/src/assets/images/leadership_principal_1794512597061.jpg');

  // Review state for submissions
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [reviewStatuses, setReviewStatuses] = useState<Record<number, ConferencePaperStatus>>({});

  const maxPhotoMb = getUploadSizeLimitMb(settings, 'photo');
  const maxDocMb = getUploadSizeLimitMb(settings, 'document');
  const maxDocBytes = getUploadSizeLimitBytes(settings, 'document');
  const autoCrop = settings.autoCropImages !== false;

  const deptNames = useMemo(
    () => ['All Engineering Departments', ...departments.map((d) => d.name)],
    [departments],
  );

  const saveConferencePatch = async (updatedConf: Conference, msg = 'Saved conference changes.') => {
    try {
      await adminFetch(`/api/admin/conferences/${updatedConf.id}`, 'PUT', updatedConf);
      notify('ok', msg);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const handleUploadAttachment = async (field: 'brochureUrl' | 'templateUrl', file: File) => {
    if (!draft) return;
    if (file.size > maxDocBytes) {
      notify('err', `File exceeds Max Document limit of ${maxDocMb} MB.`);
      return;
    }
    try {
      const url = await uploadBinary(file);
      const next = { ...draft, [field]: url };
      setDraft(next);
      await saveConferencePatch(next, `Uploaded ${field === 'brochureUrl' ? 'Brochure' : 'Format Template'}.`);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const confSubmissions = useMemo(
    () => (selectedConf ? submissions.filter((s) => s.conferenceId === selectedConf.id) : []),
    [submissions, selectedConf],
  );
  const confRegistrations = useMemo(
    () => (selectedConf ? registrations.filter((r) => r.conferenceId === selectedConf.id) : []),
    [registrations, selectedConf],
  );

  return (
    <div className="space-y-5">
      {/* Conference Switcher + Create Toggle */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Globe2 className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-sm font-bold text-stone-900 dark:text-white mr-1">
            Research Conferences, Workshops &amp; Events ({conferences.length}):
          </span>
          {conferences.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSelectedId(c.id);
                setShowCreate(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                !showCreate && selectedConf?.id === c.id
                  ? 'text-white border-transparent'
                  : 'bg-stone-50 dark:bg-slate-800 border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200'
              }`}
              style={!showCreate && selectedConf?.id === c.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
            >
              {c.shortName} ({c.scope})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setSubTab('research-slider');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
              subTab === 'research-slider' && !showCreate
                ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                : 'border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}
          >
            Research Page Slider ({researchSlides.length})
          </button>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--secondary-color)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showCreate ? 'Back to Selected Program' : 'Add Conference / Workshop / Event'}</span>
          </button>
        </div>
      </div>

      {/* Create New Conference Form */}
      {showCreate && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const created = await adminFetch<Conference>('/api/admin/conferences', 'POST', {
                title: newTitle,
                shortName: newShort,
                slug: newSlug,
                scope: newScope,
                mode: newMode,
                theme: newTheme,
                startDate: newStart,
                endDate: newEnd,
                venue: newVenue,
                organizingDepartment: newDept,
                bannerUrl: newBanner,
                isPublished: true,
                isFeatured: true,
              });
              setNewTitle('');
              setNewShort('');
              setNewSlug('');
              setNewTheme('');
              setShowCreate(false);
              if (created?.id) setSelectedId(created.id);
              notify('ok', `Created conference microsite "${created?.shortName || newShort}".`);
            } catch (err) {
              notify('err', (err as Error).message);
            }
          }}
          className="rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <h2 className="text-base font-bold">Add National / International Conference, Workshop, FDP, Event or Custom Program</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Full Conference Title *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="International Conference on Sustainable AI & Smart Systems (ICSAISS-2027)"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Short Acronym *</label>
              <input
                type="text"
                required
                value={newShort}
                onChange={(e) => {
                  setNewShort(e.target.value);
                  if (!newSlug) {
                    setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                  }
                }}
                placeholder="ICSAISS-2027"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Dedicated URL Slug</label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="icsaiss-2027"
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <CustomSelectInput
              label="Conference Scope"
              required
              value={newScope}
              onChange={setNewScope}
              options={[...CONFERENCE_SCOPE_PRESETS]}
              customPlaceholder="Enter custom conference scope..."
            />
            <CustomSelectInput
              label="Delivery Mode"
              required
              value={newMode}
              onChange={setNewMode}
              options={[...CONFERENCE_MODE_PRESETS]}
              customPlaceholder="Enter custom mode..."
            />
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1">Conference Theme</label>
              <input
                type="text"
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
                placeholder="Translating Engineering Research into Resilient Real-World Impact"
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <CustomSelectInput
              label="Organizing Department"
              value={newDept}
              onChange={setNewDept}
              options={deptNames}
              customPlaceholder="Enter custom organizing cell..."
            />
            <div>
              <label className="block text-xs font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">End Date</label>
              <input
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Venue</label>
              <input
                type="text"
                value={newVenue}
                onChange={(e) => setNewVenue(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <ImageUploader
            label="Conference Banner Image (16:9)"
            value={newBanner}
            onChange={setNewBanner}
            uploadBinary={uploadBinary}
            aspectRatio="16:9"
            maxPhotoMb={maxPhotoMb}
            autoCropEnabled={autoCrop}
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Create Dedicated Conference Website
          </button>
        </form>
      )}

      {/* Selected Conference Management */}
      {!showCreate && draft && (
        <div className="space-y-4">
          {/* Sub-navigation for selected conference */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['overview', 'Overview, Page Slider & CFP'],
                  ['program', `Tracks (${draft.tracks.length}), Dates, Schedule & Fees`],
                  ['people', `Keynote & Committee Photos (${draft.people.length})`],
                  ['submissions', `Paper Submissions (${confSubmissions.length})`],
                  ['registrations', `Delegate Registrations (${confRegistrations.length})`],
                  ['research-slider', `Research Main Slider (${researchSlides.length})`],
                ] as const
              ).map(([tid, tlabel]) => (
                <button
                  key={tid}
                  type="button"
                  onClick={() => setSubTab(tid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    subTab === tid
                      ? 'text-white border-transparent'
                      : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700'
                  }`}
                  style={subTab === tid ? { backgroundColor: 'var(--primary-color)' } : undefined}
                >
                  {tlabel}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-stone-500">
                Public URL: /conference/{draft.slug}
              </span>
              {confirmDeleteId === draft.id ? (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await adminFetch(`/api/admin/conferences/${draft.id}`, 'DELETE');
                      setConfirmDeleteId(null);
                      notify('ok', `Deleted conference "${draft.shortName}".`);
                    }}
                    className="px-2.5 py-1 rounded bg-rose-700 text-white text-xs font-bold"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2 py-1 rounded border text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(draft.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>

          {/* 1. OVERVIEW, BANNER & CFP */}
          {subTab === 'overview' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveConferencePatch(draft, `Saved "${draft.shortName}" overview and Call for Papers.`);
              }}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Conference Title</label>
                  <input
                    type="text"
                    required
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Short Acronym</label>
                  <input
                    type="text"
                    required
                    value={draft.shortName}
                    onChange={(e) => setDraft({ ...draft, shortName: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <CustomSelectInput
                  label="Scope / Level"
                  value={draft.scope}
                  onChange={(val) => setDraft({ ...draft, scope: val })}
                  options={[...CONFERENCE_SCOPE_PRESETS]}
                  customPlaceholder="Enter custom conference scope..."
                />
                <CustomSelectInput
                  label="Conference Mode"
                  value={draft.mode}
                  onChange={(val) => setDraft({ ...draft, mode: val })}
                  options={[...CONFERENCE_MODE_PRESETS]}
                  customPlaceholder="Enter custom mode..."
                />
                <CustomSelectInput
                  label="Organizing Department"
                  value={draft.organizingDepartment}
                  onChange={(val) => setDraft({ ...draft, organizingDepartment: val })}
                  options={deptNames}
                  customPlaceholder="Enter organizing department..."
                />
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold mb-1">Theme Subtitle</label>
                  <input
                    type="text"
                    value={draft.theme}
                    onChange={(e) => setDraft({ ...draft, theme: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={draft.startDate}
                    onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Venue</label>
                  <input
                    type="text"
                    value={draft.venue}
                    onChange={(e) => setDraft({ ...draft, venue: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Secretariat Email</label>
                  <input
                    type="email"
                    value={draft.contactEmail}
                    onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Secretariat Phone</label>
                  <input
                    type="text"
                    value={draft.contactPhone}
                    onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Indexing Partners (comma-separated)</label>
                  <input
                    type="text"
                    value={(draft.indexingPartners || []).join(', ')}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        indexingPartners: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <ImageUploader
                label="Default Fallback Banner (16:9)"
                value={draft.bannerUrl}
                onChange={(url) => setDraft({ ...draft, bannerUrl: url })}
                uploadBinary={uploadBinary}
                aspectRatio="16:9"
                maxPhotoMb={maxPhotoMb}
                autoCropEnabled={autoCrop}
              />

              {/* Dedicated Page Slider Slides for this Conference / Workshop / Event */}
              <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/40 dark:bg-slate-800/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      Own Microsite Slider Slides ({(draft.heroSlides || []).length})
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Each conference, workshop, or event microsite displays its own interactive multi-slide banner.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={cSlideTitle}
                    onChange={(e) => setCSlideTitle(e.target.value)}
                    placeholder="New Slide Title (e.g. Keynote & Paper Tracks Open)"
                    className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={cSlideCap}
                    onChange={(e) => setCSlideCap(e.target.value)}
                    placeholder="Slide Caption / Theme Subtitle"
                    className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={cSlideCtaLabel}
                    onChange={(e) => setCSlideCtaLabel(e.target.value)}
                    placeholder="CTA Label (optional)"
                    className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    value={cSlideCtaLink}
                    onChange={(e) => setCSlideCtaLink(e.target.value)}
                    placeholder="CTA Link (optional)"
                    className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <ImageUploader
                  label="New Slide Image (16:9 Auto-Crop)"
                  value={cSlideImg}
                  onChange={setCSlideImg}
                  uploadBinary={uploadBinary}
                  aspectRatio="16:9"
                  maxPhotoMb={maxPhotoMb}
                  autoCropEnabled={autoCrop}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!cSlideTitle.trim()) return;
                    const existingSlides = draft.heroSlides || [];
                    const newSlide: ConferenceSlide = {
                      id: Math.max(0, ...existingSlides.map((s) => s.id)) + 1,
                      title: cSlideTitle.trim(),
                      caption: cSlideCap.trim(),
                      imageUrl: cSlideImg || draft.bannerUrl,
                      ctaLabel: cSlideCtaLabel.trim(),
                      ctaLink: cSlideCtaLink.trim(),
                    };
                    setDraft({ ...draft, heroSlides: [...existingSlides, newSlide] });
                    setCSlideTitle('');
                    setCSlideCap('');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-700 text-white text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Slide to {draft.shortName}
                </button>

                {(draft.heroSlides || []).length > 0 && (
                  <div className="space-y-2 pt-2">
                    {(draft.heroSlides || []).map((sl, idx) => (
                      <div
                        key={sl.id}
                        className="p-2.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-3 text-xs"
                      >
                        <img src={sl.imageUrl} alt={sl.title} className="w-24 h-14 rounded object-cover border shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{sl.title}</p>
                          <p className="text-[11px] text-stone-500 truncate">{sl.caption}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const arr = [...(draft.heroSlides || [])];
                              [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                              setDraft({ ...draft, heroSlides: arr });
                            }}
                            className="p-1 rounded border disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === (draft.heroSlides || []).length - 1}
                            onClick={() => {
                              const arr = [...(draft.heroSlides || [])];
                              [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                              setDraft({ ...draft, heroSlides: arr });
                            }}
                            className="p-1 rounded border disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                heroSlides: (draft.heroSlides || []).filter((_, i) => i !== idx),
                              })
                            }
                            className="p-1 rounded border border-rose-200 text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold">Conference Brochure PDF (Max {maxDocMb} MB)</label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload PDF</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) handleUploadAttachment('brochureUrl', f);
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={draft.brochureUrl || ''}
                      onChange={(e) => setDraft({ ...draft, brochureUrl: e.target.value })}
                      placeholder="/uploads/... or https://..."
                      className="flex-1 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold">Manuscript Paper Format Template (DOCX/PDF)</label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Template</span>
                      <input
                        type="file"
                        accept=".pdf,.docx"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (f) handleUploadAttachment('templateUrl', f);
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={draft.templateUrl || ''}
                      onChange={(e) => setDraft({ ...draft, templateUrl: e.target.value })}
                      placeholder="/uploads/... or https://..."
                      className="flex-1 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

              <RichTextEditor
                label="About Conference (Visual HTML Editor + Profile Cards)"
                value={draft.overviewHtml}
                onChange={(html) => setDraft({ ...draft, overviewHtml: html })}
                uploadBinary={uploadBinary}
                maxPhotoMb={maxPhotoMb}
                autoCropEnabled={autoCrop}
                minHeight={220}
              />

              <RichTextEditor
                label="Call for Papers (CFP) & Guidelines"
                value={draft.cfpHtml}
                onChange={(html) => setDraft({ ...draft, cfpHtml: html })}
                uploadBinary={uploadBinary}
                maxPhotoMb={maxPhotoMb}
                autoCropEnabled={autoCrop}
                minHeight={180}
              />

              {/* Paper Submission Portal Mode: Built-in CMS vs Third-Party Platform (Microsoft CMT / EasyChair) */}
              <div className="p-4 rounded-xl border-2 border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      Paper Submission Mode &amp; Third-Party Portal Link (Microsoft CMT / EasyChair / Custom)
                    </h3>
                    <p className="text-[11px] text-stone-600 dark:text-slate-300">
                      When a valid third-party submission link is active, local website paper submission is automatically disabled.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase ${
                      draft.submissionMode === 'closed'
                        ? 'bg-rose-600 text-white'
                        : isExternalPaperSubmissionActive(draft)
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {draft.submissionMode === 'closed'
                      ? 'Submissions Closed'
                      : isExternalPaperSubmissionActive(draft)
                        ? 'External Link Active (Local Disabled)'
                        : 'Built-in Local Form Active'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {(
                    [
                      ['portal', 'Built-in Portal Submission Form'],
                      ['external', 'Third-Party Link (CMT / EasyChair)'],
                      ['closed', 'Close Paper Submissions'],
                    ] as const
                  ).map(([mVal, mLabel]) => (
                    <label
                      key={mVal}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer font-semibold ${
                        (draft.submissionMode || (isExternalPaperSubmissionActive(draft) ? 'external' : 'portal')) === mVal
                          ? 'border-amber-600 bg-white dark:bg-slate-900'
                          : 'border-stone-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`sub-mode-${draft.id}`}
                        checked={
                          (draft.submissionMode || (isExternalPaperSubmissionActive(draft) ? 'external' : 'portal')) === mVal
                        }
                        onChange={() =>
                          setDraft({
                            ...draft,
                            submissionMode: mVal,
                            externalSubmissionUrl: mVal === 'portal' ? '' : draft.externalSubmissionUrl || '',
                          })
                        }
                      />
                      <span>{mLabel}</span>
                    </label>
                  ))}
                </div>

                {(draft.submissionMode === 'external' || isExternalPaperSubmissionActive(draft)) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <CustomSelectInput
                      label="Third-Party Platform Name"
                      value={draft.externalSubmissionLabel || 'Microsoft CMT'}
                      onChange={(val) => setDraft({ ...draft, externalSubmissionLabel: val })}
                      options={[...CONFERENCE_SUBMISSION_PLATFORM_PRESETS]}
                      customPlaceholder="Enter custom submission portal name..."
                    />
                    <div>
                      <label className="block text-xs font-semibold mb-1">External Paper Submission URL (https://...) *</label>
                      <input
                        type="url"
                        value={draft.externalSubmissionUrl || ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            submissionMode: 'external',
                            externalSubmissionUrl: e.target.value,
                          })
                        }
                        placeholder="https://cmt3.research.microsoft.com/CONFERENCE2026"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Author Submission Instructions / Author Kit Notes (optional HTML)
                  </label>
                  <textarea
                    rows={2}
                    value={draft.submissionInstructionsHtml || ''}
                    onChange={(e) => setDraft({ ...draft, submissionInstructionsHtml: e.target.value })}
                    placeholder="<p>Prepare manuscript in IEEE double-column format (max 6 pages) and upload PDF via Microsoft CMT.</p>"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Custom Extensible Sections per Conference */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-800/30 space-y-3">
                <h3 className="text-sm font-bold">
                  Additional Custom Sections ({(draft.customSections || []).length}) — Travel, Sponsors, Ethics
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    value={customSecTitle}
                    onChange={(e) => setCustomSecTitle(e.target.value)}
                    placeholder="Section Heading (e.g. Publication Ethics & Scopus Indexing Policy)"
                    className="px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <RichTextEditor
                    label="Custom Section Body"
                    value={customSecHtml}
                    onChange={setCustomSecHtml}
                    uploadBinary={uploadBinary}
                    maxPhotoMb={maxPhotoMb}
                    autoCropEnabled={autoCrop}
                    minHeight={120}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!customSecTitle.trim()) return;
                      const list = draft.customSections || [];
                      setDraft({
                        ...draft,
                        customSections: [
                          ...list,
                          {
                            id: Math.max(0, ...list.map((s) => s.id)) + 1,
                            title: customSecTitle.trim(),
                            contentHtml: customSecHtml,
                            sortOrder: list.length + 1,
                          },
                        ],
                      });
                      setCustomSecTitle('');
                    }}
                    className="self-start px-3 py-1.5 rounded bg-stone-800 dark:bg-stone-700 text-white text-xs font-bold"
                  >
                    + Add Section Block
                  </button>
                </div>
                {(draft.customSections || []).map((sec) => (
                  <div
                    key={sec.id}
                    className="p-2.5 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-bold">{sec.title}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          customSections: (draft.customSections || []).filter((x) => x.id !== sec.id),
                        })
                      }
                      className="p-1 text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs font-semibold">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.isPublished}
                    onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
                  />
                  <span>Published on Public Website</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.isFeatured}
                    onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })}
                  />
                  <span>Featured Conference</span>
                </label>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Save Program Overview, Slider, Submission Mode &amp; CFP
              </button>
            </form>
          )}

          {/* RESEARCH PORTAL MAIN SLIDER MANAGER */}
          {subTab === 'research-slider' && (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div>
                <h2 className="text-base font-bold">Research Portal &amp; Conferences Landing Page Slider</h2>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Controls the top hero slider on both the Research menu pages and `/conferences` portal.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  value={rSlideTitle}
                  onChange={(e) => setRSlideTitle(e.target.value)}
                  placeholder="Research Slide Heading Title *"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={rSlideCap}
                  onChange={(e) => setRSlideCap(e.target.value)}
                  placeholder="Caption / Description"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={rSlideCtaLabel}
                  onChange={(e) => setRSlideCtaLabel(e.target.value)}
                  placeholder="CTA Button Label"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={rSlideCtaLink}
                  onChange={(e) => setRSlideCtaLink(e.target.value)}
                  placeholder="CTA Link (e.g. /conference/icaest-2026)"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <ImageUploader
                label="Research Slider Photo (16:9 Auto-Crop)"
                value={rSlideImg}
                onChange={setRSlideImg}
                uploadBinary={uploadBinary}
                aspectRatio="16:9"
                maxPhotoMb={maxPhotoMb}
                autoCropEnabled={autoCrop}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (!rSlideTitle.trim()) return;
                    const nextSlides: ConferenceSlide[] = [
                      ...researchSlides,
                      {
                        id: Math.max(0, ...researchSlides.map((s) => s.id)) + 1,
                        title: rSlideTitle.trim(),
                        caption: rSlideCap.trim(),
                        imageUrl: rSlideImg,
                        ctaLabel: rSlideCtaLabel.trim(),
                        ctaLink: rSlideCtaLink.trim(),
                      },
                    ];
                    setResearchSlides(nextSlides);
                    setRSlideTitle('');
                    setRSlideCap('');
                    await adminFetch('/api/admin/conferences/research-slider', 'PUT', { researchSliderSlides: nextSlides });
                    notify('ok', 'Added slide to Research Portal Slider.');
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add &amp; Save Research Slide
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-slate-800">
                {researchSlides.map((sl, idx) => (
                  <div
                    key={sl.id}
                    className="p-3 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 flex flex-wrap items-center gap-3 text-xs"
                  >
                    <img src={sl.imageUrl} alt={sl.title} className="w-28 h-16 rounded object-cover border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{sl.title}</p>
                      <p className="text-stone-500 truncate">{sl.caption}</p>
                      {sl.ctaLink && <p className="text-[11px] font-mono text-amber-700">{sl.ctaLabel} &rarr; {sl.ctaLink}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={async () => {
                          const arr = [...researchSlides];
                          [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                          setResearchSlides(arr);
                          await adminFetch('/api/admin/conferences/research-slider', 'PUT', { researchSliderSlides: arr });
                          notify('ok', 'Updated Research slider order.');
                        }}
                        className="p-1.5 rounded border disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === researchSlides.length - 1}
                        onClick={async () => {
                          const arr = [...researchSlides];
                          [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                          setResearchSlides(arr);
                          await adminFetch('/api/admin/conferences/research-slider', 'PUT', { researchSliderSlides: arr });
                          notify('ok', 'Updated Research slider order.');
                        }}
                        className="p-1.5 rounded border disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const arr = researchSlides.filter((_, i) => i !== idx);
                          setResearchSlides(arr);
                          await adminFetch('/api/admin/conferences/research-slider', 'PUT', { researchSliderSlides: arr });
                          notify('ok', 'Removed Research slider image.');
                        }}
                        className="p-1.5 rounded border border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. TRACKS, IMPORTANT DATES, SCHEDULE & FEE TIERS */}
          {subTab === 'program' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Technical Tracks */}
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="text-sm font-bold">Technical Tracks ({draft.tracks.length})</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={trTitle}
                    onChange={(e) => setTrTitle(e.target.value)}
                    placeholder="Track Title (e.g. Track 1: AI & Edge Computing)"
                    className="w-full px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={trChair}
                    onChange={(e) => setTrChair(e.target.value)}
                    placeholder="Track Chair (optional)"
                    className="w-full px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <textarea
                    rows={2}
                    value={trDesc}
                    onChange={(e) => setTrDesc(e.target.value)}
                    placeholder="Track topics & scope..."
                    className="w-full px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!trTitle.trim()) return;
                      const item: ConferenceTrack = {
                        id: Date.now(),
                        title: trTitle.trim(),
                        chair: trChair.trim() || undefined,
                        description: trDesc.trim(),
                      };
                      const next = { ...draft, tracks: [...draft.tracks, item] };
                      setDraft(next);
                      setTrTitle('');
                      setTrChair('');
                      setTrDesc('');
                      await saveConferencePatch(next, 'Added technical track.');
                    }}
                    className="px-3.5 py-1.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--primary-color)' }}
                  >
                    + Add Track
                  </button>
                </div>
                <ul className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
                  {draft.tracks.map((tr) => (
                    <li key={tr.id} className="py-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{tr.title}</p>
                        {tr.chair && <p className="text-[11px] text-amber-700">Chair: {tr.chair}</p>}
                        <p className="text-stone-500">{tr.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const next = { ...draft, tracks: draft.tracks.filter((x) => x.id !== tr.id) };
                          setDraft(next);
                          await saveConferencePatch(next, 'Removed track.');
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Important Dates */}
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" /> Important Dates ({draft.importantDates.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={dtLabel}
                    onChange={(e) => setDtLabel(e.target.value)}
                    placeholder="Milestone (e.g. Full Paper Submission)"
                    className="px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={dtDate}
                    onChange={(e) => setDtDate(e.target.value)}
                    placeholder="Date (e.g. 2026-12-30)"
                    className="px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={dtNote}
                    onChange={(e) => setDtNote(e.target.value)}
                    placeholder="Status Note (e.g. Open / Extended)"
                    className="sm:col-span-2 px-3 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!dtLabel.trim() || !dtDate.trim()) return;
                    const item: ConferenceImportantDate = {
                      id: Date.now(),
                      label: dtLabel.trim(),
                      date: dtDate.trim(),
                      statusNote: dtNote.trim() || undefined,
                    };
                    const next = { ...draft, importantDates: [...draft.importantDates, item] };
                    setDraft(next);
                    setDtLabel('');
                    setDtDate('');
                    setDtNote('');
                    await saveConferencePatch(next, 'Added important date.');
                  }}
                  className="px-3.5 py-1.5 rounded text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  + Add Milestone Date
                </button>
                <ul className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
                  {draft.importantDates.map((d) => (
                    <li key={d.id} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold">{d.label}</span> —{' '}
                        <span className="font-mono">{d.date}</span>
                        {d.statusNote && <span className="ml-1.5 text-amber-700">({d.statusNote})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const next = {
                            ...draft,
                            importantDates: draft.importantDates.filter((x) => x.id !== d.id),
                          };
                          setDraft(next);
                          await saveConferencePatch(next, 'Removed date.');
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Technical Schedule */}
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="text-sm font-bold">Program Schedule ({draft.schedule.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={scDay}
                    onChange={(e) => setScDay(e.target.value)}
                    placeholder="Day 1"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={scTime}
                    onChange={(e) => setScTime(e.target.value)}
                    placeholder="Time Slot"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={scTrack}
                    onChange={(e) => setScTrack(e.target.value)}
                    placeholder="Track / Plenary"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={scVenue}
                    onChange={(e) => setScVenue(e.target.value)}
                    placeholder="Hall / Room"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={scSession}
                    onChange={(e) => setScSession(e.target.value)}
                    placeholder="Session Title *"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={scSpeaker}
                    onChange={(e) => setScSpeaker(e.target.value)}
                    placeholder="Speaker / Session Chair"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!scSession.trim()) return;
                    const item: ConferenceScheduleItem = {
                      id: Date.now(),
                      dayLabel: scDay.trim() || 'Day 1',
                      timeSlot: scTime.trim(),
                      trackTitle: scTrack.trim() || 'General',
                      sessionTitle: scSession.trim(),
                      speakerOrChair: scSpeaker.trim(),
                      venue: scVenue.trim() || 'Main Auditorium',
                    };
                    const next = { ...draft, schedule: [...draft.schedule, item] };
                    setDraft(next);
                    setScSession('');
                    setScSpeaker('');
                    await saveConferencePatch(next, 'Added schedule session.');
                  }}
                  className="px-3.5 py-1.5 rounded text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  + Add Schedule Session
                </button>
                <ul className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
                  {draft.schedule.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold">
                          {s.dayLabel} · {s.timeSlot} — {s.sessionTitle}
                        </p>
                        <p className="text-stone-500">
                          {s.trackTitle} · {s.speakerOrChair} · {s.venue}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const next = { ...draft, schedule: draft.schedule.filter((x) => x.id !== s.id) };
                          setDraft(next);
                          await saveConferencePatch(next, 'Removed session.');
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Registration Fee Tiers */}
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="text-sm font-bold">Registration Fee Tiers ({draft.feeTiers.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={feeLabel}
                    onChange={(e) => setFeeLabel(e.target.value)}
                    placeholder="Category (e.g. UG / PG Student) *"
                    className="col-span-2 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={feeInr}
                    onChange={(e) => setFeeInr(e.target.value)}
                    placeholder="INR Fee (e.g. ₹2,500) *"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={feeUsd}
                    onChange={(e) => setFeeUsd(e.target.value)}
                    placeholder="USD Fee (optional, e.g. $100)"
                    className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={feeNote}
                    onChange={(e) => setFeeNote(e.target.value)}
                    placeholder="Includes (Kit, Certificate, Proceedings)"
                    className="col-span-2 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!feeLabel.trim() || !feeInr.trim()) return;
                    const tier: ConferenceFeeTier = {
                      id: Date.now(),
                      categoryLabel: feeLabel.trim(),
                      inrAmount: feeInr.trim(),
                      usdAmount: feeUsd.trim() || undefined,
                      includesNote: feeNote.trim() || undefined,
                    };
                    const next = { ...draft, feeTiers: [...draft.feeTiers, tier] };
                    setDraft(next);
                    setFeeLabel('');
                    setFeeInr('');
                    setFeeUsd('');
                    setFeeNote('');
                    await saveConferencePatch(next, 'Added registration fee tier.');
                  }}
                  className="px-3.5 py-1.5 rounded text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  + Add Fee Tier
                </button>
                <ul className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
                  {draft.feeTiers.map((t) => (
                    <li key={t.id} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-bold">
                          {t.categoryLabel} — {t.inrAmount} {t.usdAmount ? `/ ${t.usdAmount}` : ''}
                        </p>
                        {t.includesNote && <p className="text-stone-500">{t.includesNote}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const next = { ...draft, feeTiers: draft.feeTiers.filter((x) => x.id !== t.id) };
                          setDraft(next);
                          await saveConferencePatch(next, 'Removed fee tier.');
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 3. KEYNOTE SPEAKERS & ORGANIZING COMMITTEE WITH 1:1 PHOTOGRAPHS */}
          {subTab === 'people' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!pName.trim()) return;
                  const newPerson: ConferencePerson = {
                    id: Date.now(),
                    kind: pKind,
                    role: pRole.trim() || 'Committee Member',
                    name: pName.trim(),
                    designation: pDesig.trim(),
                    affiliation: pAffil.trim(),
                    email: pEmail.trim() || undefined,
                    phone: pPhone.trim() || undefined,
                    photoUrl: pPhoto,
                    bio: pBio.trim() || undefined,
                    sortOrder: draft.people.length + 1,
                  };
                  const next = { ...draft, people: [...draft.people, newPerson] };
                  setDraft(next);
                  setPName('');
                  setPDesig('');
                  setPAffil('');
                  setPEmail('');
                  setPPhone('');
                  setPBio('');
                  await saveConferencePatch(next, `Added conference profile "${newPerson.name}".`);
                }}
                className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  Add Keynote Speaker / Organizing Committee Member
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Section</label>
                    <select
                      value={pKind}
                      onChange={(e) => setPKind(e.target.value as 'keynote' | 'committee')}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="keynote">Keynote Speaker</option>
                      <option value="committee">Organizing Committee</option>
                    </select>
                  </div>
                  <CustomSelectInput
                    label="Conference Role"
                    value={pRole}
                    onChange={setPRole}
                    options={[...CONFERENCE_ROLE_PRESETS]}
                    customPlaceholder="Enter custom role..."
                  />
                </div>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="Full Name with Title (e.g. Dr. Ramesh Kulkarni) *"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  required
                  value={pDesig}
                  onChange={(e) => setPDesig(e.target.value)}
                  placeholder="Designation & Qualification *"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  required
                  value={pAffil}
                  onChange={(e) => setPAffil(e.target.value)}
                  placeholder="Institution / Industry Affiliation *"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    value={pEmail}
                    onChange={(e) => setPEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={pPhone}
                    onChange={(e) => setPPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    className="px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <textarea
                  rows={2}
                  value={pBio}
                  onChange={(e) => setPBio(e.target.value)}
                  placeholder="Keynote talk / committee responsibilities"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <ImageUploader
                  label="Speaker / Member Portrait (1:1 Auto-Crop)"
                  value={pPhoto}
                  onChange={setPPhoto}
                  uploadBinary={uploadBinary}
                  aspectRatio="1:1"
                  maxPhotoMb={maxPhotoMb}
                  autoCropEnabled={autoCrop}
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  + Add Speaker / Committee Profile
                </button>
              </form>

              <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="text-sm font-bold">
                  Conference Speakers &amp; Committee Cards ({draft.people.length})
                </h3>
                <div className="divide-y divide-stone-100 dark:divide-slate-800">
                  {draft.people.map((person, idx) => (
                    <div key={person.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={person.photoUrl}
                          alt={person.name}
                          className="w-14 h-14 rounded-lg object-cover border border-stone-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase">
                            {person.kind} · {person.role}
                          </span>
                          <p className="font-bold text-sm truncate text-stone-900 dark:text-white">{person.name}</p>
                          <p className="text-stone-600 dark:text-slate-300 truncate">
                            {person.designation} · {person.affiliation}
                          </p>
                          {(person.email || person.phone) && (
                            <p className="text-[11px] text-stone-500 truncate">
                              {person.email} {person.phone ? `· ${person.phone}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={async () => {
                            const arr = [...draft.people];
                            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                            arr.forEach((p, i) => {
                              p.sortOrder = i + 1;
                            });
                            const next = { ...draft, people: arr };
                            setDraft(next);
                            await saveConferencePatch(next, 'Updated speaker/committee order.');
                          }}
                          className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === draft.people.length - 1}
                          onClick={async () => {
                            const arr = [...draft.people];
                            [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                            arr.forEach((p, i) => {
                              p.sortOrder = i + 1;
                            });
                            const next = { ...draft, people: arr };
                            setDraft(next);
                            await saveConferencePatch(next, 'Updated speaker/committee order.');
                          }}
                          className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const next = {
                              ...draft,
                              people: draft.people.filter((x) => x.id !== person.id),
                            };
                            setDraft(next);
                            await saveConferencePatch(next, `Removed "${person.name}".`);
                          }}
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

          {/* 4. PAPER SUBMISSIONS REVIEW */}
          {subTab === 'submissions' && (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-amber-600" />
                  Submitted Research Manuscripts ({confSubmissions.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `${draft.slug}-papers.csv`,
                      ['Tracking Code', 'Title', 'Track', 'Author', 'Email', 'Affiliation', 'Status', 'Submitted At'],
                      confSubmissions.map((s) => [
                        s.trackingCode,
                        s.paperTitle,
                        s.trackTitle,
                        s.authorName,
                        s.authorEmail,
                        s.affiliation,
                        s.status,
                        s.submittedAt,
                      ]),
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Export Papers CSV
                </button>
              </div>

              {confSubmissions.length === 0 ? (
                <p className="text-xs text-stone-500">No papers submitted for this conference yet.</p>
              ) : (
                <div className="space-y-3">
                  {confSubmissions.map((sub) => {
                    const currentSt = reviewStatuses[sub.id] ?? sub.status;
                    const currentNote = reviewNotes[sub.id] ?? (sub.reviewerNote || '');
                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 space-y-2.5 text-xs"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <span className="font-mono font-bold text-amber-700">{sub.trackingCode}</span> ·{' '}
                            <span className="font-semibold">{sub.trackTitle}</span>
                            <h4 className="font-bold text-sm text-stone-900 dark:text-white mt-0.5">
                              {sub.paperTitle}
                            </h4>
                            <p className="text-stone-500">
                              {sub.authorName} ({sub.authorEmail}) · {sub.affiliation}
                            </p>
                          </div>
                          {sub.manuscriptUrl && (
                            <a
                              href={sub.manuscriptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 font-semibold"
                            >
                              Download Manuscript
                            </a>
                          )}
                        </div>
                        <p className="text-stone-600 dark:text-slate-300 bg-stone-50 dark:bg-slate-800/50 p-2.5 rounded">
                          {sub.abstractText}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={currentSt}
                            onChange={(e) =>
                              setReviewStatuses((prev) => ({
                                ...prev,
                                [sub.id]: e.target.value as ConferencePaperStatus,
                              }))
                            }
                            className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Peer Review</option>
                            <option value="accepted">Accepted</option>
                            <option value="revision_required">Revision Required</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <input
                            type="text"
                            value={currentNote}
                            onChange={(e) => setReviewNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                            placeholder="Reviewer / TPC comments..."
                            className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await adminFetch(
                                `/api/admin/conferences/${draft.id}/submissions/${sub.id}`,
                                'PUT',
                                { status: currentSt, reviewerNote: currentNote },
                              );
                              notify('ok', `Updated paper ${sub.trackingCode} -> ${currentSt}`);
                            }}
                            className="px-3 py-1.5 rounded text-white font-semibold"
                            style={{ backgroundColor: 'var(--primary-color)' }}
                          >
                            Save Review
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              adminFetch(`/api/admin/conferences/${draft.id}/submissions/${sub.id}`, 'DELETE').then(
                                () => notify('ok', `Deleted submission ${sub.trackingCode}.`),
                              )
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. DELEGATE REGISTRATIONS */}
          {subTab === 'registrations' && (
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold">Delegate Registrations ({confRegistrations.length})</h3>
                <button
                  type="button"
                  onClick={() =>
                    downloadCsv(
                      `${draft.slug}-delegates.csv`,
                      ['Delegate ID', 'Name', 'Email', 'Phone', 'Affiliation', 'Fee Category', 'Mode', 'Status'],
                      confRegistrations.map((r) => [
                        r.regCode,
                        r.attendeeName,
                        r.email,
                        r.phone,
                        r.affiliation,
                        r.feeCategory,
                        r.participationMode,
                        r.status,
                      ]),
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Export Delegates CSV
                </button>
              </div>
              {confRegistrations.length === 0 ? (
                <p className="text-xs text-stone-500">No delegate registrations yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800 text-left">
                        <th className="py-2 px-3">Delegate ID</th>
                        <th className="py-2 px-3">Name &amp; Contact</th>
                        <th className="py-2 px-3">Affiliation</th>
                        <th className="py-2 px-3">Category / Mode</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                      {confRegistrations.map((reg) => (
                        <tr key={reg.id}>
                          <td className="py-2 px-3 font-mono font-bold">{reg.regCode}</td>
                          <td className="py-2 px-3">
                            <p className="font-semibold">{reg.attendeeName}</p>
                            <p className="text-stone-500">{reg.email} · {reg.phone}</p>
                          </td>
                          <td className="py-2 px-3">{reg.affiliation}</td>
                          <td className="py-2 px-3">
                            <p>{reg.feeCategory}</p>
                            <p className="text-stone-500">{reg.participationMode}</p>
                          </td>
                          <td className="py-2 px-3 font-bold uppercase">{reg.status}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  adminFetch(
                                    `/api/admin/conferences/${draft.id}/registrations/${reg.id}`,
                                    'PUT',
                                    { status: reg.status === 'verified' ? 'registered' : 'verified' },
                                  ).then(() => notify('ok', `Updated ${reg.regCode} status.`))
                                }
                                className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold"
                              >
                                {reg.status === 'verified' ? 'Unverify' : 'Verify'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  adminFetch(
                                    `/api/admin/conferences/${draft.id}/registrations/${reg.id}`,
                                    'DELETE',
                                  ).then(() => notify('ok', `Deleted ${reg.regCode}.`))
                                }
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
