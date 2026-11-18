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
  ConferencePosterItem,
  ConferenceRegistration,
  ConferenceScheduleItem,
  ConferenceSlide,
  ConferenceSubmission,
  ConferenceTrack,
  Department,
  ResearchPatentItem,
  ResearchPortfolioData,
  ResearchPortalConfig,
  ResearchProjectItem,
  SiteSettings,
} from '../types/cms';
import {
  CONFERENCE_MODE_PRESETS,
  CONFERENCE_ROLE_PRESETS,
  CONFERENCE_SCOPE_PRESETS,
  CONFERENCE_SUBMISSION_PLATFORM_PRESETS,
  RESEARCH_AGENCY_PRESETS,
  RESEARCH_PATENT_TYPE_PRESETS,
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
  researchPortfolio?: ResearchPortfolioData;
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
  researchPortfolio,
  adminFetch,
  uploadBinary,
  notify,
}: ConferenceAdminPanelProps) {
  const [selectedId, setSelectedId] = useState<number>(conferences[0]?.id || 0);
  const [subTab, setSubTab] = useState<'overview' | 'program' | 'people' | 'submissions' | 'registrations' | 'research-slider' | 'research-projects' | 'research-patents'>('overview');
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
  const [posterCode, setPosterCode] = useState('PST-01');
  const [posterTitle, setPosterTitle] = useState('');
  const [posterAuthors, setPosterAuthors] = useState('');
  const [posterAffil, setPosterAffil] = useState('');
  const [posterTrack, setPosterTrack] = useState('');
  const [posterAward, setPosterAward] = useState('');
  const [posterAbstract, setPosterAbstract] = useState('');
  const [posterImg, setPosterImg] = useState('/src/assets/images/poster_session_1794991330669.jpg');
  const [posterPdfUrl, setPosterPdfUrl] = useState('');

  // Research Portfolio (R&D Config, Projects, Patents/IPR/Start-ups)
  const [rpConfig, setRpConfig] = useState<ResearchPortalConfig>(
    researchPortfolio?.config || {
      heroBadge: 'UGC Section 5(e) · Sponsored R&D & IPR',
      heroTitle: 'Research, Funded Grants, Patents & Incubation Cell',
      heroSubtitle: 'Sponsored R&D projects, IPR patents, start-ups & consultancy cell.',
      deanName: 'Dr. M. S. Kadam',
      deanTitle: 'Dean Research & Development',
      deanEmail: 'dean.rd@coe.sveri.ac.in',
      deanPhone: '+91-02186-216066',
      totalGrantsHighlight: '₹3.85 Cr+ Sponsored Grants',
      activeLabsHighlight: '4 Approved Ph.D. Centres & 18+ Labs',
      consultancyPolicyUrl: '/quick-links',
    },
  );
  const [editingProjId, setEditingProjId] = useState<number | null>(null);
  const [projTitle, setProjTitle] = useState('');
  const [projAgency, setProjAgency] = useState<string>(RESEARCH_AGENCY_PRESETS[0]);
  const [projPi, setProjPi] = useState('');
  const [projCoPi, setProjCoPi] = useState('');
  const [projDept, setProjDept] = useState(departments[0]?.code || 'CSE');
  const [projGrant, setProjGrant] = useState('₹15.00 Lakhs');
  const [projYear, setProjYear] = useState('2026-27');
  const [projDuration, setProjDuration] = useState('24 Months');
  const [projStatus, setProjStatus] = useState<string>('Ongoing');
  const [projCode, setProjCode] = useState('');
  const [projSummary, setProjSummary] = useState('');
  const [projDocUrl, setProjDocUrl] = useState('');

  const [editingPatId, setEditingPatId] = useState<number | null>(null);
  const [patType, setPatType] = useState<string>(RESEARCH_PATENT_TYPE_PRESETS[0]);
  const [patTitle, setPatTitle] = useState('');
  const [patInventors, setPatInventors] = useState('');
  const [patDept, setPatDept] = useState(departments[0]?.code || 'CSE');
  const [patRef, setPatRef] = useState('');
  const [patDate, setPatDate] = useState(new Date().toISOString().slice(0, 10));
  const [patStatus, setPatStatus] = useState('Granted');
  const [patPartner, setPatPartner] = useState('Indian Patent Office');
  const [patSummary, setPatSummary] = useState('');
  const [patUrl, setPatUrl] = useState('');

  useEffect(() => {
    setResearchSlides(settings.researchSliderSlides || []);
  }, [settings.researchSliderSlides]);

  useEffect(() => {
    if (researchPortfolio?.config) {
      setRpConfig(researchPortfolio.config);
    }
  }, [researchPortfolio?.config]);

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
              setSubTab('research-projects');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
              subTab === 'research-projects' && !showCreate
                ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                : 'border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}
          >
            Funded Projects &amp; R&amp;D ({researchPortfolio?.projects.length || 0})
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setSubTab('research-patents');
            }}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
              subTab === 'research-patents' && !showCreate
                ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                : 'border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}
          >
            Patents, IPR &amp; Start-ups ({researchPortfolio?.patents.length || 0})
          </button>
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

              {/* Poster Presentation & Expo Track Configuration */}
              <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      Poster Presentation &amp; Expo Track Configuration ({(draft.posterItems || []).length} Exhibits)
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      Configure poster dimensions, prizes, template PDF, guidelines, and showcase accepted research posters.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.enablePosterPresentation !== false}
                      onChange={(e) => setDraft({ ...draft, enablePosterPresentation: e.target.checked })}
                    />
                    <span>Enable Poster Presentation Track</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Poster Board Dimensions</label>
                    <input
                      type="text"
                      value={draft.posterDimensions || ''}
                      onChange={(e) => setDraft({ ...draft, posterDimensions: e.target.value })}
                      placeholder="A0 Portrait (841 mm x 1189 mm)"
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Best Poster Prizes / Recognition</label>
                    <input
                      type="text"
                      value={draft.posterPrizesText || ''}
                      onChange={(e) => setDraft({ ...draft, posterPrizesText: e.target.value })}
                      placeholder="Best Poster Award per Track + Certificate"
                      className="w-full px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Poster Template URL (PPTX/PDF)</label>
                    <div className="flex items-center gap-1.5">
                      <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold cursor-pointer shrink-0">
                        <Upload className="w-3 h-3" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept=".pdf,.pptx,.ppt,.docx"
                          className="sr-only"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (!f) return;
                            try {
                              const url = await uploadBinary(f);
                              setDraft({ ...draft, posterTemplateUrl: url });
                              notify('ok', 'Uploaded Poster Template.');
                            } catch (err) {
                              notify('err', (err as Error).message);
                            }
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        value={draft.posterTemplateUrl || ''}
                        onChange={(e) => setDraft({ ...draft, posterTemplateUrl: e.target.value })}
                        placeholder="/uploads/... or https://..."
                        className="flex-1 min-w-0 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <RichTextEditor
                  label="Poster Presentation Guidelines (HTML)"
                  value={draft.posterGuidelinesHtml || ''}
                  onChange={(html) => setDraft({ ...draft, posterGuidelinesHtml: html })}
                  uploadBinary={uploadBinary}
                  maxPhotoMb={maxPhotoMb}
                  autoCropEnabled={autoCrop}
                  minHeight={130}
                />

                <div className="pt-2 border-t border-stone-200 dark:border-slate-700 space-y-2.5">
                  <p className="text-xs font-bold">Add Accepted Poster / Technical Exhibit Card</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <input
                      type="text"
                      value={posterCode}
                      onChange={(e) => setPosterCode(e.target.value)}
                      placeholder="Code (e.g. PST-01)"
                      className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={posterTitle}
                      onChange={(e) => setPosterTitle(e.target.value)}
                      placeholder="Poster Title *"
                      className="md:col-span-2 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={posterAuthors}
                      onChange={(e) => setPosterAuthors(e.target.value)}
                      placeholder="Authors *"
                      className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={posterAffil}
                      onChange={(e) => setPosterAffil(e.target.value)}
                      placeholder="Affiliation / Dept"
                      className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={posterTrack}
                      onChange={(e) => setPosterTrack(e.target.value)}
                      placeholder="Track Name"
                      className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={posterAward}
                      onChange={(e) => setPosterAward(e.target.value)}
                      placeholder="Award Note (optional)"
                      className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="text"
                      value={posterPdfUrl}
                      onChange={(e) => setPosterPdfUrl(e.target.value)}
                      placeholder="Poster PDF URL (optional)"
                      className="md:col-span-2 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <textarea
                      rows={2}
                      value={posterAbstract}
                      onChange={(e) => setPosterAbstract(e.target.value)}
                      placeholder="Short Abstract / Summary"
                      className="md:col-span-3 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <ImageUploader
                    label="Poster Preview Image (16:9)"
                    value={posterImg}
                    onChange={setPosterImg}
                    uploadBinary={uploadBinary}
                    aspectRatio="16:9"
                    maxPhotoMb={maxPhotoMb}
                    autoCropEnabled={autoCrop}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!posterTitle.trim() || !posterAuthors.trim()) return;
                      const list = draft.posterItems || [];
                      const item: ConferencePosterItem = {
                        id: Math.max(0, ...list.map((p) => p.id)) + 1,
                        posterCode: posterCode.trim() || `PST-${list.length + 1}`,
                        title: posterTitle.trim(),
                        authors: posterAuthors.trim(),
                        affiliation: posterAffil.trim(),
                        track: posterTrack.trim(),
                        awardNote: posterAward.trim(),
                        abstract: posterAbstract.trim(),
                        imageUrl: posterImg,
                        posterPdfUrl: posterPdfUrl.trim(),
                      };
                      setDraft({ ...draft, posterItems: [...list, item] });
                      setPosterTitle('');
                      setPosterAuthors('');
                      setPosterAbstract('');
                      setPosterAward('');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-stone-800 dark:bg-stone-700 text-white text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Poster Showcase Card
                  </button>

                  {(draft.posterItems || []).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {(draft.posterItems || []).map((p) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-amber-700 mr-2">{p.posterCode}</span>
                            <span className="font-bold">{p.title}</span>
                            <span className="text-stone-500 ml-2">({p.authors})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                posterItems: (draft.posterItems || []).filter((x) => x.id !== p.id),
                              })
                            }
                            className="p-1 text-rose-600 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                      ['Tracking Code', 'Presentation Mode', 'Title', 'Track', 'Author', 'Email', 'Affiliation', 'Status', 'Submitted At'],
                      confSubmissions.map((s) => [
                        s.trackingCode,
                        s.presentationType || 'Oral Paper Presentation',
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
                            <span className="font-bold text-sky-700 dark:text-sky-400">
                              {sub.presentationType || 'Oral Paper Presentation'}
                            </span>{' '}
                            · <span className="font-semibold">{sub.trackTitle}</span>
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

      {/* RESEARCH PROJECTS, FUNDING & R&D CONFIG */}
      {!showCreate && subTab === 'research-projects' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await adminFetch('/api/admin/research/config', 'PUT', rpConfig);
              notify('ok', 'Saved Research Portal Header, Dean R&D & Grant Highlights.');
            }}
            className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold">Research Cell Configuration &amp; R&amp;D Leadership Contact</h2>
                <p className="text-xs text-stone-500">
                  Displayed prominently across all UGC Section 5(e) Research pages alongside Funded Projects &amp; IPR records.
                </p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Save R&amp;D Cell Config
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <input
                type="text"
                value={rpConfig.heroBadge}
                onChange={(e) => setRpConfig({ ...rpConfig, heroBadge: e.target.value })}
                placeholder="Section Badge"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={rpConfig.heroTitle}
                onChange={(e) => setRpConfig({ ...rpConfig, heroTitle: e.target.value })}
                placeholder="Research Portal Title"
                className="md:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <textarea
                rows={2}
                value={rpConfig.heroSubtitle}
                onChange={(e) => setRpConfig({ ...rpConfig, heroSubtitle: e.target.value })}
                placeholder="Research Overview Subtitle"
                className="md:col-span-3 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={rpConfig.deanName}
                onChange={(e) => setRpConfig({ ...rpConfig, deanName: e.target.value })}
                placeholder="Dean R&D Name"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={rpConfig.deanTitle}
                onChange={(e) => setRpConfig({ ...rpConfig, deanTitle: e.target.value })}
                placeholder="Dean Designation"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="email"
                value={rpConfig.deanEmail}
                onChange={(e) => setRpConfig({ ...rpConfig, deanEmail: e.target.value })}
                placeholder="Dean Email"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={rpConfig.deanPhone}
                onChange={(e) => setRpConfig({ ...rpConfig, deanPhone: e.target.value })}
                placeholder="Dean Phone"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={rpConfig.totalGrantsHighlight}
                onChange={(e) => setRpConfig({ ...rpConfig, totalGrantsHighlight: e.target.value })}
                placeholder="Total Grants Highlight (e.g. ₹3.85 Cr+)"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={rpConfig.activeLabsHighlight}
                onChange={(e) => setRpConfig({ ...rpConfig, activeLabsHighlight: e.target.value })}
                placeholder="Ph.D. Centres & Labs Highlight"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </form>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!projTitle.trim()) return;
                const payload = {
                  title: projTitle,
                  fundingAgency: projAgency,
                  principalInvestigator: projPi,
                  coInvestigator: projCoPi,
                  departmentCode: projDept,
                  grantAmountLakhs: projGrant,
                  sanctionYear: projYear,
                  duration: projDuration,
                  status: projStatus,
                  projectCode: projCode,
                  summary: projSummary,
                  documentUrl: projDocUrl,
                  isPublished: true,
                };
                if (editingProjId) {
                  await adminFetch(`/api/admin/research/projects/${editingProjId}`, 'PUT', payload);
                  notify('ok', 'Updated funded research project.');
                } else {
                  await adminFetch('/api/admin/research/projects', 'POST', payload);
                  notify('ok', 'Added new funded research project.');
                }
                setEditingProjId(null);
                setProjTitle('');
                setProjPi('');
                setProjCoPi('');
                setProjCode('');
                setProjSummary('');
                setProjDocUrl('');
              }}
              className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">
                  {editingProjId ? 'Edit Funded Project / Grant' : 'Add Sponsored Research Project'}
                </h3>
                {editingProjId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProjId(null);
                      setProjTitle('');
                    }}
                    className="text-xs text-stone-500 hover:underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={projTitle}
                onChange={(e) => setProjTitle(e.target.value)}
                placeholder="Project Title *"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <CustomSelectInput
                label="Funding Agency"
                value={projAgency}
                onChange={setProjAgency}
                options={[...RESEARCH_AGENCY_PRESETS]}
                customPlaceholder="Enter custom funding agency..."
              />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  required
                  value={projPi}
                  onChange={(e) => setProjPi(e.target.value)}
                  placeholder="Principal Investigator *"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={projCoPi}
                  onChange={(e) => setProjCoPi(e.target.value)}
                  placeholder="Co-Investigator"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <CustomSelectInput
                  label="Department"
                  value={projDept}
                  onChange={setProjDept}
                  options={departments.map((d) => d.code)}
                  customPlaceholder="Dept Code"
                />
                <CustomSelectInput
                  label="Project Status"
                  value={projStatus}
                  onChange={setProjStatus}
                  options={['Ongoing', 'Completed', 'Sanctioned']}
                  customPlaceholder="Status"
                />
                <input
                  type="text"
                  value={projGrant}
                  onChange={(e) => setProjGrant(e.target.value)}
                  placeholder="Grant (e.g. ₹24.5 Lakhs)"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={projYear}
                  onChange={(e) => setProjYear(e.target.value)}
                  placeholder="Year (e.g. 2026-27)"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={projDuration}
                  onChange={(e) => setProjDuration(e.target.value)}
                  placeholder="Duration (e.g. 36 Months)"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={projCode}
                  onChange={(e) => setProjCode(e.target.value)}
                  placeholder="Sanction Ref No."
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <textarea
                rows={2}
                value={projSummary}
                onChange={(e) => setProjSummary(e.target.value)}
                placeholder="Project deliverables / outcomes summary..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={projDocUrl}
                onChange={(e) => setProjDocUrl(e.target.value)}
                placeholder="Sanction Order PDF / URL (optional)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="w-full px-4 py-2.5 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {editingProjId ? 'Update Research Project' : 'Publish Funded Research Project'}
              </button>
            </form>

            <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/50 text-xs font-bold">
                Sponsored Research Projects ({(researchPortfolio?.projects || []).length})
              </div>
              <div className="divide-y divide-stone-100 dark:divide-slate-800 max-h-[680px] overflow-y-auto">
                {(researchPortfolio?.projects || []).map((p: ResearchProjectItem, idx: number, arr: ResearchProjectItem[]) => (
                  <div key={p.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-amber-700 dark:text-amber-400">{p.fundingAgency}</span>
                        <span className="font-mono text-stone-500">{p.grantAmountLakhs}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {p.isPublished ? 'Visible' : 'Hidden'}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-stone-900 dark:text-white">{p.title}</p>
                      <p className="text-stone-500">
                        PI: {p.principalInvestigator} ({p.departmentCode}) · {p.sanctionYear} · {p.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={async () => {
                          const ids = arr.map((x) => x.id);
                          [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                          await adminFetch('/api/admin/research/projects/reorder', 'PUT', { orderedIds: ids });
                        }}
                        className="p-1 rounded border disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={async () => {
                          const ids = arr.map((x) => x.id);
                          [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                          await adminFetch('/api/admin/research/projects/reorder', 'PUT', { orderedIds: ids });
                        }}
                        className="p-1 rounded border disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/research/projects/${p.id}`, 'PUT', { isPublished: !p.isPublished });
                          notify('ok', p.isPublished ? 'Project hidden from public Research tab.' : 'Project published on Research tab.');
                        }}
                        className="px-2 py-1 rounded border text-[11px] font-semibold"
                      >
                        {p.isPublished ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProjId(p.id);
                          setProjTitle(p.title);
                          setProjAgency(p.fundingAgency);
                          setProjPi(p.principalInvestigator);
                          setProjCoPi(p.coInvestigator || '');
                          setProjDept(p.departmentCode);
                          setProjGrant(p.grantAmountLakhs);
                          setProjYear(p.sanctionYear);
                          setProjDuration(p.duration || '');
                          setProjStatus(p.status);
                          setProjCode(p.projectCode || '');
                          setProjSummary(p.summary || '');
                          setProjDocUrl(p.documentUrl || '');
                        }}
                        className="px-2 py-1 rounded border text-[11px] font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/research/projects/${p.id}`, 'DELETE');
                          notify('ok', 'Deleted research project.');
                        }}
                        className="p-1 text-rose-600"
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

      {/* PATENTS, IPR, INCUBATED START-UPS & CONSULTANCY */}
      {!showCreate && subTab === 'research-patents' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!patTitle.trim()) return;
              const payload = {
                itemType: patType,
                title: patTitle,
                inventorsOrLead: patInventors,
                departmentCode: patDept,
                referenceNumber: patRef,
                filingOrGrantDate: patDate,
                status: patStatus,
                partnerOrAgency: patPartner,
                summary: patSummary,
                externalUrl: patUrl,
                isPublished: true,
              };
              if (editingPatId) {
                await adminFetch(`/api/admin/research/patents/${editingPatId}`, 'PUT', payload);
                notify('ok', 'Updated Patent / IPR / Start-up record.');
              } else {
                await adminFetch('/api/admin/research/patents', 'POST', payload);
                notify('ok', 'Added Patent / IPR / Start-up record.');
              }
              setEditingPatId(null);
              setPatTitle('');
              setPatInventors('');
              setPatRef('');
              setPatSummary('');
              setPatUrl('');
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingPatId ? 'Edit IPR / Patent / Start-up Entry' : 'Add Patent, IPR, Start-up or Consultancy'}
              </h3>
              {editingPatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingPatId(null);
                    setPatTitle('');
                  }}
                  className="text-xs text-stone-500 hover:underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            <CustomSelectInput
              label="Entry Category"
              value={patType}
              onChange={setPatType}
              options={[...RESEARCH_PATENT_TYPE_PRESETS]}
              customPlaceholder="Enter custom IPR/Start-up category..."
            />
            <input
              type="text"
              required
              value={patTitle}
              onChange={(e) => setPatTitle(e.target.value)}
              placeholder="Title of Patent / Start-up / Consultancy *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              required
              value={patInventors}
              onChange={(e) => setPatInventors(e.target.value)}
              placeholder="Inventors / Founders / Lead Faculty *"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <CustomSelectInput
                label="Department"
                value={patDept}
                onChange={setPatDept}
                options={departments.map((d) => d.code)}
                customPlaceholder="Dept Code"
              />
              <div>
                <label className="block font-semibold mb-1">Filing / Grant Date</label>
                <input
                  type="date"
                  value={patDate}
                  onChange={(e) => setPatDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <input
                type="text"
                value={patRef}
                onChange={(e) => setPatRef(e.target.value)}
                placeholder="Application / Patent / CIN No."
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={patStatus}
                onChange={(e) => setPatStatus(e.target.value)}
                placeholder="Status (e.g. Granted / Seed Funded)"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <input
              type="text"
              value={patPartner}
              onChange={(e) => setPatPartner(e.target.value)}
              placeholder="Patent Office / Incubator / Industry Client"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <textarea
              rows={2}
              value={patSummary}
              onChange={(e) => setPatSummary(e.target.value)}
              placeholder="Innovation abstract / impact details..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={patUrl}
              onChange={(e) => setPatUrl(e.target.value)}
              placeholder="Verification Link / Gazette PDF URL (optional)"
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {editingPatId ? 'Update Record' : 'Publish IPR / Start-up Entry'}
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/50 text-xs font-bold">
              Published Patents, IPR, Start-ups &amp; Consultancy ({(researchPortfolio?.patents || []).length})
            </div>
            <div className="divide-y divide-stone-100 dark:divide-slate-800 max-h-[680px] overflow-y-auto">
              {(researchPortfolio?.patents || []).map((pat: ResearchPatentItem, idx: number, arr: ResearchPatentItem[]) => (
                <div key={pat.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-amber-700 dark:text-amber-400">{pat.itemType}</span>
                      <span className="font-mono text-stone-500">{pat.referenceNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pat.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {pat.isPublished ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-stone-900 dark:text-white">{pat.title}</p>
                    <p className="text-stone-500">
                      {pat.inventorsOrLead} ({pat.departmentCode}) · {pat.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={async () => {
                        const ids = arr.map((x) => x.id);
                        [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                        await adminFetch('/api/admin/research/patents/reorder', 'PUT', { orderedIds: ids });
                      }}
                      className="p-1 rounded border disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === arr.length - 1}
                      onClick={async () => {
                        const ids = arr.map((x) => x.id);
                        [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                        await adminFetch('/api/admin/research/patents/reorder', 'PUT', { orderedIds: ids });
                      }}
                      className="p-1 rounded border disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminFetch(`/api/admin/research/patents/${pat.id}`, 'PUT', { isPublished: !pat.isPublished });
                        notify('ok', pat.isPublished ? 'Record hidden.' : 'Record published.');
                      }}
                      className="px-2 py-1 rounded border text-[11px] font-semibold"
                    >
                      {pat.isPublished ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPatId(pat.id);
                        setPatType(pat.itemType);
                        setPatTitle(pat.title);
                        setPatInventors(pat.inventorsOrLead);
                        setPatDept(pat.departmentCode);
                        setPatRef(pat.referenceNumber);
                        setPatDate(pat.filingOrGrantDate);
                        setPatStatus(pat.status);
                        setPatPartner(pat.partnerOrAgency || '');
                        setPatSummary(pat.summary || '');
                        setPatUrl(pat.externalUrl || '');
                      }}
                      className="px-2 py-1 rounded border text-[11px] font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminFetch(`/api/admin/research/patents/${pat.id}`, 'DELETE');
                        notify('ok', 'Deleted patent / IPR record.');
                      }}
                      className="p-1 text-rose-600"
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
    </div>
  );
}
