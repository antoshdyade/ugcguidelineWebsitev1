import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Trophy, Upload } from 'lucide-react';
import type {
  SiteSettings,
  SportsAchievement,
  SportsCustomField,
  SportsData,
  SportsEvent,
  SportsFacility,
  SportsGalleryItem,
  SportsNotice,
} from '../types/cms';
const SPORTS_DEPARTMENT_OPTIONS: { code: string; name: string }[] = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'ENTC', name: 'Electronics & Telecommunication' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'EE', name: 'Electrical Engineering' },
  { code: 'FE', name: 'First Year Engineering' },
  { code: 'MCA', name: 'MCA / PG Studies' },
  { code: 'All', name: 'Institute Team (All Branches)' },
];
import {
  SPORTS_ACHIEVEMENT_LEVEL_PRESETS,
  SPORTS_EVENT_TYPE_PRESETS,
  SPORTS_FACILITY_TYPE_PRESETS,
  SPORTS_NOTICE_CATEGORY_PRESETS,
} from '../lib/collegeFeaturesLogic';
import { getUploadSizeLimitMb } from '../lib/imageCrop';
import { CustomSelectInput } from './CustomSelectInput';
import { ImageUploader } from './ImageUploader';

interface SportsAdminPanelProps {
  sports: SportsData;
  settings: SiteSettings;
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  uploadBinary: (file: File) => Promise<string>;
  notify: (type: 'ok' | 'err', text: string) => void;
}

export function SportsAdminPanel({
  sports,
  settings,
  adminFetch,
  uploadBinary,
  notify,
}: SportsAdminPanelProps) {
  const [subTab, setSubTab] = useState<
    'config' | 'facilities' | 'events' | 'achievements' | 'gallery' | 'notices'
  >('config');

  const maxPhotoMb = getUploadSizeLimitMb(settings, 'photo');
  const autoCrop = settings.autoCropImages !== false;

  // Config draft
  const [cfgDraft, setCfgDraft] = useState(sports.config);
  const [cfgFieldLabel, setCfgFieldLabel] = useState('');
  const [cfgFieldValue, setCfgFieldValue] = useState('');
  useEffect(() => {
    setCfgDraft(sports.config);
  }, [sports.config]);

  // Facility form
  const [editingFacId, setEditingFacId] = useState<number | null>(null);
  const [fName, setFName] = useState('');
  const [fType, setFType] = useState<string>(SPORTS_FACILITY_TYPE_PRESETS[0]);
  const [fDims, setFDims] = useState('');
  const [fTimings, setFTimings] = useState('06:00 AM - 08:30 AM & 04:30 PM - 07:30 PM');
  const [fIncharge, setFIncharge] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fImg, setFImg] = useState('/src/assets/images/sports_complex_1794991330591.jpg');
  const [fCustomFields, setFCustomFields] = useState<SportsCustomField[]>([]);
  const [fCfLabel, setFCfLabel] = useState('');
  const [fCfValue, setFCfValue] = useState('');

  // Event form
  const [editingEvId, setEditingEvId] = useState<number | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eType, setEType] = useState<string>(SPORTS_EVENT_TYPE_PRESETS[0]);
  const [eDisc, setEDisc] = useState('');
  const [eDate, setEDate] = useState(new Date().toISOString().slice(0, 10));
  const [eVenue, setEVenue] = useState('SVCOER Sports Complex, Pandharpur');
  const [eOrg, setEOrg] = useState('Gymkhana Committee');
  const [eStatus, setEStatus] = useState<SportsEvent['status']>('Upcoming');
  const [eRegUrl, setERegUrl] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eImg, setEImg] = useState('/src/assets/images/sports_complex_1794991330591.jpg');

  // Achievement form
  const [editingAchId, setEditingAchId] = useState<number | null>(null);
  const [aName, setAName] = useState('');
  const [aDept, setADept] = useState<string>(SPORTS_DEPARTMENT_OPTIONS[0].code);
  const [aBatch, setABatch] = useState('2026');
  const [aSport, setASport] = useState('');
  const [aLevel, setALevel] = useState<SportsAchievement['level']>('University');
  const [aMedal, setAMedal] = useState('Gold Medal');
  const [aEvent, setAEvent] = useState('');
  const [aDate, setADate] = useState(new Date().toISOString().slice(0, 10));
  const [aImg, setAImg] = useState('/src/assets/images/sports_complex_1794991330591.jpg');
  const [aHighlights, setAHighlights] = useState('');

  // Gallery form
  const [gTitle, setGTitle] = useState('');
  const [gType, setGType] = useState<'Photo' | 'Video'>('Photo');
  const [gCat, setGCat] = useState('Annual Sports Meet');
  const [gMediaUrl, setGMediaUrl] = useState('/src/assets/images/sports_complex_1794991330591.jpg');
  const [gThumbUrl, setGThumbUrl] = useState('/src/assets/images/sports_complex_1794991330591.jpg');
  const [gDate, setGDate] = useState(new Date().toISOString().slice(0, 10));
  const [gCap, setGCap] = useState('');

  // Notice form
  const [nTitle, setNTitle] = useState('');
  const [nDate, setNDate] = useState(new Date().toISOString().slice(0, 10));
  const [nCat, setNCat] = useState<string>(SPORTS_NOTICE_CATEGORY_PRESETS[0]);
  const [nSummary, setNSummary] = useState('');
  const [nAttachment, setNAttachment] = useState('');
  const [nRegLink, setNRegLink] = useState('');
  const [nPinned, setNPinned] = useState(true);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-bold">Student Life &rarr; Sports Portal Manager (/sports)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['config', 'Director Desk & Custom Fields'],
              ['facilities', `Facilities (${sports.facilities.length})`],
              ['events', `Activities & Events (${sports.events.length})`],
              ['achievements', `Achievements (${sports.achievements.length})`],
              ['gallery', `Gallery (${sports.gallery.length})`],
              ['notices', `Notices (${sports.notices.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                subTab === id
                  ? 'text-white border-transparent'
                  : 'bg-stone-50 dark:bg-slate-800 border-stone-300 dark:border-slate-700'
              }`}
              style={subTab === id ? { backgroundColor: 'var(--primary-color)' } : undefined}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. CONFIG & CUSTOM FIELDS */}
      {subTab === 'config' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await adminFetch('/api/admin/sports/config', 'PUT', cfgDraft);
              notify('ok', 'Updated Sports portal configuration & custom fields.');
            } catch (err) {
              notify('err', (err as Error).message);
            }
          }}
          className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <h2 className="text-base font-bold">Gymkhana Banner, Director Details &amp; Custom Fields</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <input
              type="text"
              value={cfgDraft.heroBadge}
              onChange={(e) => setCfgDraft({ ...cfgDraft, heroBadge: e.target.value })}
              placeholder="Hero Badge"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.annualFlagshipName}
              onChange={(e) => setCfgDraft({ ...cfgDraft, annualFlagshipName: e.target.value })}
              placeholder="Annual Flagship Event Name"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              required
              value={cfgDraft.heroTitle}
              onChange={(e) => setCfgDraft({ ...cfgDraft, heroTitle: e.target.value })}
              placeholder="Portal Main Heading"
              className="md:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <textarea
              rows={2}
              value={cfgDraft.heroSubtitle}
              onChange={(e) => setCfgDraft({ ...cfgDraft, heroSubtitle: e.target.value })}
              placeholder="Subtitle Description"
              className="md:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.directorName}
              onChange={(e) => setCfgDraft({ ...cfgDraft, directorName: e.target.value })}
              placeholder="Physical Director Name"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.directorTitle}
              onChange={(e) => setCfgDraft({ ...cfgDraft, directorTitle: e.target.value })}
              placeholder="Designation / Title"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="email"
              value={cfgDraft.directorEmail}
              onChange={(e) => setCfgDraft({ ...cfgDraft, directorEmail: e.target.value })}
              placeholder="Gymkhana Email"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.directorPhone}
              onChange={(e) => setCfgDraft({ ...cfgDraft, directorPhone: e.target.value })}
              placeholder="Contact Phone"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.gymkhanaTimings}
              onChange={(e) => setCfgDraft({ ...cfgDraft, gymkhanaTimings: e.target.value })}
              placeholder="Ground & Gym Timings"
              className="md:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="p-4 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/40 space-y-2.5 text-xs">
            <p className="font-bold">Custom Sports Portal Fields ({(cfgDraft.customFields || []).length})</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={cfgFieldLabel}
                onChange={(e) => setCfgFieldLabel(e.target.value)}
                placeholder="Field Label (e.g. Playfield Area)"
                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={cfgFieldValue}
                onChange={(e) => setCfgFieldValue(e.target.value)}
                placeholder="Field Value"
                className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => {
                  if (!cfgFieldLabel.trim()) return;
                  setCfgDraft({
                    ...cfgDraft,
                    customFields: [
                      ...(cfgDraft.customFields || []),
                      { label: cfgFieldLabel.trim(), value: cfgFieldValue.trim() },
                    ],
                  });
                  setCfgFieldLabel('');
                  setCfgFieldValue('');
                }}
                className="px-3 py-1.5 rounded bg-stone-900 dark:bg-slate-700 text-white font-semibold"
              >
                + Add Custom Field
              </button>
            </div>
            {(cfgDraft.customFields || []).map((cf, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700">
                <span>
                  <strong>{cf.label}:</strong> {cf.value}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCfgDraft({
                      ...cfgDraft,
                      customFields: (cfgDraft.customFields || []).filter((_, i) => i !== idx),
                    })
                  }
                  className="text-rose-600 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Save Sports Portal Config
          </button>
        </form>
      )}

      {/* 2. SPORTS FACILITIES */}
      {subTab === 'facilities' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const payload = {
                name: fName,
                facilityType: fType,
                dimensionsOrCapacity: fDims,
                timings: fTimings,
                inchargeName: fIncharge,
                description: fDesc,
                imageUrl: fImg,
                customFields: fCustomFields,
                isPublished: true,
              };
              try {
                if (editingFacId) {
                  await adminFetch(`/api/admin/sports/facilities/${editingFacId}`, 'PUT', payload);
                  notify('ok', `Updated sports facility "${fName}".`);
                } else {
                  await adminFetch('/api/admin/sports/facilities', 'POST', payload);
                  notify('ok', `Added sports facility "${fName}".`);
                }
                setEditingFacId(null);
                setFName('');
                setFDims('');
                setFIncharge('');
                setFDesc('');
                setFCustomFields([]);
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-bold">{editingFacId ? 'Edit Sports Facility' : 'Add Indoor / Outdoor Facility'}</h3>
            <input
              type="text"
              required
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              placeholder="Facility Name *"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <CustomSelectInput
              label="Facility Category"
              value={fType}
              onChange={setFType}
              options={[...SPORTS_FACILITY_TYPE_PRESETS]}
              customPlaceholder="Enter custom sports facility type..."
            />
            <input
              type="text"
              value={fDims}
              onChange={(e) => setFDims(e.target.value)}
              placeholder="Dimensions / Capacity (e.g. 400m Track · 4 Wooden Courts)"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={fTimings}
              onChange={(e) => setFTimings(e.target.value)}
              placeholder="Operating Timings"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={fIncharge}
              onChange={(e) => setFIncharge(e.target.value)}
              placeholder="Coach / Facility In-Charge"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <textarea
              rows={3}
              value={fDesc}
              onChange={(e) => setFDesc(e.target.value)}
              placeholder="Equipment, turf, lighting & safety description..."
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-slate-700 space-y-2">
              <p className="font-semibold">Custom Specs ({fCustomFields.length})</p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={fCfLabel}
                  onChange={(e) => setFCfLabel(e.target.value)}
                  placeholder="Label"
                  className="w-1/3 px-2 py-1 rounded border bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={fCfValue}
                  onChange={(e) => setFCfValue(e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-2 py-1 rounded border bg-white dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!fCfLabel.trim()) return;
                    setFCustomFields([...fCustomFields, { label: fCfLabel.trim(), value: fCfValue.trim() }]);
                    setFCfLabel('');
                    setFCfValue('');
                  }}
                  className="px-2.5 py-1 rounded bg-stone-800 text-white font-semibold"
                >
                  +
                </button>
              </div>
              {fCustomFields.map((cf, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span>
                    <strong>{cf.label}:</strong> {cf.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFCustomFields(fCustomFields.filter((_, idx) => idx !== i))}
                    className="text-rose-600"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <ImageUploader
              label="Facility Photograph (16:9)"
              value={fImg}
              onChange={setFImg}
              uploadBinary={uploadBinary}
              aspectRatio="16:9"
              maxPhotoMb={maxPhotoMb}
              autoCropEnabled={autoCrop}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg text-white font-bold"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {editingFacId ? 'Update Sports Facility' : '+ Add Sports Facility'}
              </button>
              {editingFacId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingFacId(null);
                    setFName('');
                    setFCustomFields([]);
                  }}
                  className="px-3 py-2 rounded-lg border"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="text-sm font-bold">Configured Sports Facilities ({sports.facilities.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
              {sports.facilities.map((fac: SportsFacility) => (
                <div key={fac.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={fac.imageUrl} alt={fac.name} className="w-16 h-12 rounded object-cover border shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{fac.name}</p>
                      <p className="text-stone-500 truncate">{fac.facilityType} · {fac.dimensionsOrCapacity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFacId(fac.id);
                        setFName(fac.name);
                        setFType(fac.facilityType);
                        setFDims(fac.dimensionsOrCapacity);
                        setFTimings(fac.timings);
                        setFIncharge(fac.inchargeName);
                        setFDesc(fac.description);
                        setFImg(fac.imageUrl);
                        setFCustomFields(fac.customFields || []);
                      }}
                      className="px-2.5 py-1 rounded border"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminFetch(`/api/admin/sports/facilities/${fac.id}`, 'DELETE').then(() =>
                          notify('ok', `Deleted ${fac.name}.`),
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

      {/* 3. EVENTS & TOURNAMENTS */}
      {subTab === 'events' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const payload = {
                title: eTitle,
                eventType: eType,
                discipline: eDisc,
                eventDate: eDate,
                venue: eVenue,
                organizer: eOrg,
                status: eStatus,
                registrationUrl: eRegUrl,
                description: eDesc,
                bannerUrl: eImg,
                isPublished: true,
              };
              try {
                if (editingEvId) {
                  await adminFetch(`/api/admin/sports/events/${editingEvId}`, 'PUT', payload);
                  notify('ok', 'Updated sports event.');
                } else {
                  await adminFetch('/api/admin/sports/events', 'POST', payload);
                  notify('ok', 'Added sports event.');
                }
                setEditingEvId(null);
                setETitle('');
                setEDisc('');
                setEDesc('');
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-bold">{editingEvId ? 'Edit Sports Event' : 'Add Sports Event / Tournament'}</h3>
            <input
              type="text"
              required
              value={eTitle}
              onChange={(e) => setETitle(e.target.value)}
              placeholder="Tournament / Event Title *"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <CustomSelectInput
              label="Event Type"
              value={eType}
              onChange={setEType}
              options={[...SPORTS_EVENT_TYPE_PRESETS]}
              customPlaceholder="Custom event type..."
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={eDisc}
                onChange={(e) => setEDisc(e.target.value)}
                placeholder="Sports Discipline(s)"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={eStatus}
                onChange={(e) => setEStatus(e.target.value as SportsEvent['status'])}
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Registrations Open">Registrations Open</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={eDate}
                onChange={(e) => setEDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={eVenue}
                onChange={(e) => setEVenue(e.target.value)}
                placeholder="Venue"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <input
              type="text"
              value={eRegUrl}
              onChange={(e) => setERegUrl(e.target.value)}
              placeholder="Registration URL (optional)"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <textarea
              rows={2}
              value={eDesc}
              onChange={(e) => setEDesc(e.target.value)}
              placeholder="Event summary & participation instructions..."
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <ImageUploader
              label="Event Banner (16:9)"
              value={eImg}
              onChange={setEImg}
              uploadBinary={uploadBinary}
              aspectRatio="16:9"
              maxPhotoMb={maxPhotoMb}
              autoCropEnabled={autoCrop}
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg text-white font-bold"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {editingEvId ? 'Update Sports Event' : '+ Add Sports Event'}
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">Sports Activities &amp; Tournaments ({sports.events.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {sports.events.map((ev) => (
                <div key={ev.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{ev.title}</p>
                    <p className="text-stone-500">{ev.eventType} · {ev.eventDate} · {ev.status}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEvId(ev.id);
                        setETitle(ev.title);
                        setEType(ev.eventType);
                        setEDisc(ev.discipline);
                        setEDate(ev.eventDate);
                        setEVenue(ev.venue);
                        setEOrg(ev.organizer);
                        setEStatus(ev.status);
                        setERegUrl(ev.registrationUrl || '');
                        setEDesc(ev.description);
                        setEImg(ev.bannerUrl);
                      }}
                      className="px-2.5 py-1 rounded border"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminFetch(`/api/admin/sports/events/${ev.id}`, 'DELETE').then(() =>
                          notify('ok', `Deleted ${ev.title}.`),
                        )
                      }
                      className="p-1.5 text-rose-600 rounded"
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

      {/* 4. STUDENT ACHIEVEMENTS */}
      {subTab === 'achievements' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const payload = {
                studentOrTeamName: aName,
                departmentCode: aDept,
                batchYear: aBatch,
                sportName: aSport,
                level: aLevel,
                medalOrRank: aMedal,
                eventName: aEvent,
                eventDate: aDate,
                photoUrl: aImg,
                highlights: aHighlights,
                isFeatured: true,
              };
              try {
                if (editingAchId) {
                  await adminFetch(`/api/admin/sports/achievements/${editingAchId}`, 'PUT', payload);
                  notify('ok', 'Updated sports achievement.');
                } else {
                  await adminFetch('/api/admin/sports/achievements', 'POST', payload);
                  notify('ok', 'Added student sports achievement.');
                }
                setEditingAchId(null);
                setAName('');
                setASport('');
                setAEvent('');
                setAHighlights('');
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-bold">Add Student / Team Achievement</h3>
            <input
              type="text"
              required
              value={aName}
              onChange={(e) => setAName(e.target.value)}
              placeholder="Student or Team Name *"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={aDept}
                onChange={(e) => setADept(e.target.value)}
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {SPORTS_DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={aBatch}
                onChange={(e) => setABatch(e.target.value)}
                placeholder="Batch Year"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={aSport}
                onChange={(e) => setASport(e.target.value)}
                placeholder="Sport (e.g. Kabaddi) *"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={aLevel}
                onChange={(e) => setALevel(e.target.value as SportsAchievement['level'])}
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {SPORTS_ACHIEVEMENT_LEVEL_PRESETS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              required
              value={aMedal}
              onChange={(e) => setAMedal(e.target.value)}
              placeholder="Medal / Position (e.g. Gold Medal)"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={aEvent}
                onChange={(e) => setAEvent(e.target.value)}
                placeholder="Tournament Name"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="date"
                value={aDate}
                onChange={(e) => setADate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <textarea
              rows={2}
              value={aHighlights}
              onChange={(e) => setAHighlights(e.target.value)}
              placeholder="Records / highlights..."
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <ImageUploader
              label="Winner Photo (1:1)"
              value={aImg}
              onChange={setAImg}
              uploadBinary={uploadBinary}
              aspectRatio="1:1"
              maxPhotoMb={maxPhotoMb}
              autoCropEnabled={autoCrop}
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg text-white font-bold"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {editingAchId ? 'Update Achievement' : '+ Add Sports Achievement'}
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">Student Sports Medals &amp; Records ({sports.achievements.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {sports.achievements.map((ach) => (
                <div key={ach.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={ach.photoUrl} alt={ach.studentOrTeamName} className="w-12 h-12 rounded object-cover border shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{ach.studentOrTeamName} — {ach.medalOrRank}</p>
                      <p className="text-stone-500 truncate">{ach.level} · {ach.sportName} · {ach.eventName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAchId(ach.id);
                        setAName(ach.studentOrTeamName);
                        setADept(ach.departmentCode);
                        setABatch(ach.batchYear);
                        setASport(ach.sportName);
                        setALevel(ach.level);
                        setAMedal(ach.medalOrRank);
                        setAEvent(ach.eventName);
                        setADate(ach.eventDate);
                        setAImg(ach.photoUrl);
                        setAHighlights(ach.highlights);
                      }}
                      className="px-2.5 py-1 rounded border"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminFetch(`/api/admin/sports/achievements/${ach.id}`, 'DELETE').then(() =>
                          notify('ok', 'Deleted sports achievement.'),
                        )
                      }
                      className="p-1.5 text-rose-600 rounded"
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

      {/* 5. GALLERY (PHOTOS & VIDEOS) */}
      {subTab === 'gallery' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await adminFetch('/api/admin/sports/gallery', 'POST', {
                  title: gTitle,
                  mediaType: gType,
                  category: gCat,
                  mediaUrl: gMediaUrl,
                  thumbnailUrl: gThumbUrl,
                  eventDate: gDate,
                  caption: gCap,
                  isPublished: true,
                });
                setGTitle('');
                setGCap('');
                notify('ok', 'Added media item to Sports Gallery.');
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-bold">Add Photo or Video to Sports Gallery</h3>
            <input
              type="text"
              required
              value={gTitle}
              onChange={(e) => setGTitle(e.target.value)}
              placeholder="Photo / Video Title *"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={gType}
                onChange={(e) => setGType(e.target.value as 'Photo' | 'Video')}
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="Photo">Photo</option>
                <option value="Video">Video (YouTube / Link)</option>
              </select>
              <input
                type="date"
                value={gDate}
                onChange={(e) => setGDate(e.target.value)}
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <input
              type="text"
              value={gCat}
              onChange={(e) => setGCat(e.target.value)}
              placeholder="Album / Category"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            {gType === 'Photo' ? (
              <ImageUploader
                label="Upload Event Photograph (16:9)"
                value={gMediaUrl}
                onChange={setGMediaUrl}
                uploadBinary={uploadBinary}
                aspectRatio="16:9"
                maxPhotoMb={maxPhotoMb}
                autoCropEnabled={autoCrop}
              />
            ) : (
              <>
                <input
                  type="url"
                  required
                  value={gMediaUrl}
                  onChange={(e) => setGMediaUrl(e.target.value)}
                  placeholder="YouTube Video URL (https://www.youtube.com/watch?v=...)"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <ImageUploader
                  label="Fallback Video Thumbnail"
                  value={gThumbUrl}
                  onChange={setGThumbUrl}
                  uploadBinary={uploadBinary}
                  aspectRatio="16:9"
                  maxPhotoMb={maxPhotoMb}
                  autoCropEnabled={autoCrop}
                />
              </>
            )}
            <textarea
              rows={2}
              value={gCap}
              onChange={(e) => setGCap(e.target.value)}
              placeholder="Caption..."
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg text-white font-bold inline-flex items-center justify-center gap-1"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Gallery Media
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">Sports Gallery Items ({sports.gallery.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {sports.gallery.map((g: SportsGalleryItem) => (
                <div key={g.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">[{g.mediaType}] {g.title}</p>
                    <p className="text-stone-500 truncate">{g.category} · {g.eventDate}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      adminFetch(`/api/admin/sports/gallery/${g.id}`, 'DELETE').then(() =>
                        notify('ok', `Deleted "${g.title}".`),
                      )
                    }
                    className="p-1.5 text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. NOTICES & UPDATES */}
      {subTab === 'notices' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await adminFetch('/api/admin/sports/notices', 'POST', {
                  title: nTitle,
                  noticeDate: nDate,
                  category: nCat,
                  summary: nSummary,
                  attachmentUrl: nAttachment,
                  registrationLink: nRegLink,
                  isPinned: nPinned,
                  isPublished: true,
                });
                setNTitle('');
                setNSummary('');
                setNAttachment('');
                setNRegLink('');
                notify('ok', 'Published sports notice.');
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-bold">Publish Sports Notice / Selection Circular</h3>
            <input
              type="text"
              required
              value={nTitle}
              onChange={(e) => setNTitle(e.target.value)}
              placeholder="Notice Title *"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-2">
              <CustomSelectInput
                label="Category"
                value={nCat}
                onChange={setNCat}
                options={[...SPORTS_NOTICE_CATEGORY_PRESETS]}
                customPlaceholder="Custom notice category..."
              />
              <div>
                <label className="block text-xs font-semibold mb-1">Notice Date</label>
                <input
                  type="date"
                  value={nDate}
                  onChange={(e) => setNDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <textarea
              rows={3}
              value={nSummary}
              onChange={(e) => setNSummary(e.target.value)}
              placeholder="Schedule, reporting time, eligibility..."
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border cursor-pointer bg-stone-50 dark:bg-slate-800 font-semibold">
                <Upload className="w-3.5 h-3.5" />
                <span>PDF Circular</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    try {
                      const url = await uploadBinary(f);
                      setNAttachment(url);
                    } catch (err) {
                      notify('err', (err as Error).message);
                    }
                  }}
                />
              </label>
              <input
                type="text"
                value={nAttachment}
                onChange={(e) => setNAttachment(e.target.value)}
                placeholder="Attachment URL"
                className="flex-1 px-2.5 py-1.5 rounded border bg-white dark:bg-slate-800"
              />
            </div>
            <input
              type="text"
              value={nRegLink}
              onChange={(e) => setNRegLink(e.target.value)}
              placeholder="Registration / Enquiry Link (optional)"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
              <input type="checkbox" checked={nPinned} onChange={(e) => setNPinned(e.target.checked)} />
              <span>Pin notice to top</span>
            </label>
            <button
              type="submit"
              className="w-full py-2 rounded-lg text-white font-bold"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              + Publish Sports Notice
            </button>
          </form>

          <div className="xl:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">Sports Notices &amp; Updates ({sports.notices.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {sports.notices.map((n: SportsNotice) => (
                <div key={n.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">
                      {n.isPinned ? '[Pinned] ' : ''}{n.title}
                    </p>
                    <p className="text-stone-500">{n.category} · {n.noticeDate}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      adminFetch(`/api/admin/sports/notices/${n.id}`, 'DELETE').then(() =>
                        notify('ok', `Deleted notice "${n.title}".`),
                      )
                    }
                    className="p-1.5 text-rose-600 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
