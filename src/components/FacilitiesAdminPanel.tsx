import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Building2, Plus, Trash2, Upload } from 'lucide-react';
import type { FacilitiesData, FacilityCustomField, FacilityItem, SiteSettings } from '../types/cms';
import { FACILITY_CATEGORY_PRESETS } from '../lib/collegeFeaturesLogic';
import { getUploadSizeLimitMb } from '../lib/imageCrop';
import { CustomSelectInput } from './CustomSelectInput';
import { ImageUploader } from './ImageUploader';
import { RichTextEditor } from './RichTextEditor';

interface FacilitiesAdminPanelProps {
  facilities: FacilitiesData;
  settings: SiteSettings;
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  uploadBinary: (file: File) => Promise<string>;
  notify: (type: 'ok' | 'err', text: string) => void;
}

export function FacilitiesAdminPanel({
  facilities,
  settings,
  adminFetch,
  uploadBinary,
  notify,
}: FacilitiesAdminPanelProps) {
  const [subTab, setSubTab] = useState<'items' | 'config'>('items');
  const maxPhotoMb = getUploadSizeLimitMb(settings, 'photo');
  const autoCrop = settings.autoCropImages !== false;

  const [cfgDraft, setCfgDraft] = useState(facilities.config);
  const [presetText, setPresetText] = useState((facilities.config.customFieldPresets || []).join(', '));
  useEffect(() => {
    setCfgDraft(facilities.config);
    setPresetText((facilities.config.customFieldPresets || []).join(', '));
  }, [facilities.config]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(FACILITY_CATEGORY_PRESETS[0]);
  const [shortSummary, setShortSummary] = useState('');
  const [descriptionHtml, setDescriptionHtml] = useState('<p>Enter detailed infrastructure overview, capacity, and student benefits here.</p>');
  const [locationBlock, setLocationBlock] = useState('');
  const [capacity, setCapacity] = useState('');
  const [timings, setTimings] = useState('08:30 AM – 06:00 PM');
  const [inchargeName, setInchargeName] = useState('');
  const [inchargeEmail, setInchargeEmail] = useState('');
  const [inchargePhone, setInchargePhone] = useState('');
  const [imageUrl, setImageUrl] = useState('/src/assets/images/campus_facilities_1794991331724.jpg');
  const [brochureUrl, setBrochureUrl] = useState('');
  const [customFields, setCustomFields] = useState<FacilityCustomField[]>([]);
  const [cfLabel, setCfLabel] = useState('');
  const [cfValue, setCfValue] = useState('');
  const [isFeatured, setIsFeatured] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [isShareable, setIsShareable] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory(FACILITY_CATEGORY_PRESETS[0]);
    setShortSummary('');
    setDescriptionHtml('<p>Enter detailed infrastructure overview, capacity, and student benefits here.</p>');
    setLocationBlock('');
    setCapacity('');
    setTimings('08:30 AM – 06:00 PM');
    setInchargeName('');
    setInchargeEmail('');
    setInchargePhone('');
    setImageUrl('/src/assets/images/campus_facilities_1794991331724.jpg');
    setBrochureUrl('');
    setCustomFields([]);
    setIsFeatured(true);
    setIsPublished(true);
    setIsShareable(true);
  };

  const reorderFacility = async (index: number, dir: -1 | 1) => {
    const items = [...facilities.items];
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    try {
      await adminFetch('/api/admin/facilities/items/reorder', 'PUT', {
        orderedIds: items.map((i) => i.id),
      });
      notify('ok', 'Reordered facilities display sequence.');
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-bold">Campus Facilities &amp; Infrastructure Portal (/facilities)</span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('items')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              subTab === 'items'
                ? 'text-white border-transparent'
                : 'bg-stone-50 dark:bg-slate-800 border-stone-300 dark:border-slate-700'
            }`}
            style={subTab === 'items' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Facilities Directory &amp; Custom Fields ({facilities.items.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              subTab === 'config'
                ? 'text-white border-transparent'
                : 'bg-stone-50 dark:bg-slate-800 border-stone-300 dark:border-slate-700'
            }`}
            style={subTab === 'config' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Hero Banner &amp; Custom Field Presets
          </button>
        </div>
      </div>

      {subTab === 'config' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await adminFetch('/api/admin/facilities/config', 'PUT', {
                ...cfgDraft,
                customFieldPresets: presetText
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
              notify('ok', 'Saved Facilities Portal header and field presets.');
            } catch (err) {
              notify('err', (err as Error).message);
            }
          }}
          className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs max-w-3xl"
        >
          <h2 className="text-base font-bold">Facilities Portal Banner &amp; Suggested Custom Fields</h2>
          <input
            type="text"
            value={cfgDraft.heroBadge}
            onChange={(e) => setCfgDraft({ ...cfgDraft, heroBadge: e.target.value })}
            placeholder="Hero Badge"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <input
            type="text"
            required
            value={cfgDraft.heroTitle}
            onChange={(e) => setCfgDraft({ ...cfgDraft, heroTitle: e.target.value })}
            placeholder="Hero Title"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <textarea
            rows={2}
            value={cfgDraft.heroSubtitle}
            onChange={(e) => setCfgDraft({ ...cfgDraft, heroSubtitle: e.target.value })}
            placeholder="Hero Subtitle"
            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <div>
            <label className="block font-semibold mb-1">Suggested Custom Field Labels (comma-separated)</label>
            <input
              type="text"
              value={presetText}
              onChange={(e) => setPresetText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg text-white font-bold"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Save Portal Settings
          </button>
        </form>
      )}

      {subTab === 'items' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const payload = {
                title,
                category,
                shortSummary,
                descriptionHtml,
                locationBlock,
                capacity,
                timings,
                inchargeName,
                inchargeEmail,
                inchargePhone,
                imageUrl,
                brochureUrl,
                customFields,
                isFeatured,
                isPublished,
                isShareable,
              };
              try {
                if (editingId) {
                  const res = await adminFetch<{ queuedForApproval?: boolean; message?: string; item?: FacilityItem }>(
                    `/api/admin/facilities/items/${editingId}`,
                    'PUT',
                    payload,
                  );
                  notify(
                    'ok',
                    res?.queuedForApproval && res.message ? res.message : `Updated facility "${title}".`,
                  );
                } else {
                  const res = await adminFetch<{ queuedForApproval?: boolean; message?: string; item?: FacilityItem }>(
                    '/api/admin/facilities/items',
                    'POST',
                    payload,
                  );
                  notify(
                    'ok',
                    res?.queuedForApproval && res.message ? res.message : `Added facility "${title}".`,
                  );
                }
                resetForm();
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="xl:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
          >
            <h3 className="text-sm font-bold">
              {editingId ? 'Edit Campus Facility' : 'Add Infrastructural / IT / Student Facility'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Facility Title (e.g. Central Data Centre & High-Speed Wi-Fi) *"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div className="md:col-span-2">
                <CustomSelectInput
                  label="Facility Category (or Custom)"
                  required
                  value={category}
                  onChange={setCategory}
                  options={[...FACILITY_CATEGORY_PRESETS]}
                  customPlaceholder="Enter custom facility category..."
                />
              </div>
              <input
                type="text"
                value={locationBlock}
                onChange={(e) => setLocationBlock(e.target.value)}
                placeholder="Building / Location Block"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Capacity / Nodes / Seats"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={timings}
                onChange={(e) => setTimings(e.target.value)}
                placeholder="Access Timings"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={inchargeName}
                onChange={(e) => setInchargeName(e.target.value)}
                placeholder="Facility Coordinator / Officer Name"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="email"
                value={inchargeEmail}
                onChange={(e) => setInchargeEmail(e.target.value)}
                placeholder="Coordinator Email"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={inchargePhone}
                onChange={(e) => setInchargePhone(e.target.value)}
                placeholder="Coordinator Phone"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <textarea
              rows={2}
              value={shortSummary}
              onChange={(e) => setShortSummary(e.target.value)}
              placeholder="Short Executive Summary *"
              required
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />

            <RichTextEditor
              label="Detailed Description (HTML + Images + Tables)"
              value={descriptionHtml}
              onChange={setDescriptionHtml}
              uploadBinary={uploadBinary}
              maxPhotoMb={maxPhotoMb}
              autoCropEnabled={autoCrop}
              minHeight={130}
            />

            {/* Dynamic Custom Fields Builder */}
            <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">Custom Facility Specifications ({customFields.length})</span>
                <div className="flex flex-wrap gap-1">
                  {(cfgDraft.customFieldPresets || []).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCfLabel(preset)}
                      className="px-2 py-0.5 rounded border border-stone-300 dark:border-slate-600 text-[10px] hover:bg-white dark:hover:bg-slate-800"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={cfLabel}
                  onChange={(e) => setCfLabel(e.target.value)}
                  placeholder="Field Label"
                  className="px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={cfValue}
                  onChange={(e) => setCfValue(e.target.value)}
                  placeholder="Field Value"
                  className="px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!cfLabel.trim()) return;
                    setCustomFields([...customFields, { label: cfLabel.trim(), value: cfValue.trim() }]);
                    setCfLabel('');
                    setCfValue('');
                  }}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded bg-stone-900 dark:bg-slate-700 text-white font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Field
                </button>
              </div>
              {customFields.map((cf, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 p-2 rounded bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700"
                >
                  <span>
                    <strong>{cf.label}:</strong> {cf.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomFields(customFields.filter((_, idx) => idx !== i))}
                    className="text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <ImageUploader
              label="Facility Photograph (16:9)"
              value={imageUrl}
              onChange={setImageUrl}
              uploadBinary={uploadBinary}
              aspectRatio="16:9"
              maxPhotoMb={maxPhotoMb}
              autoCropEnabled={autoCrop}
            />

            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border cursor-pointer bg-stone-50 dark:bg-slate-800 font-semibold">
                <Upload className="w-3.5 h-3.5" />
                <span>Brochure / Spec PDF</span>
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
                      setBrochureUrl(url);
                    } catch (err) {
                      notify('err', (err as Error).message);
                    }
                  }}
                />
              </label>
              <input
                type="text"
                value={brochureUrl}
                onChange={(e) => setBrochureUrl(e.target.value)}
                placeholder="Brochure / Page URL (optional)"
                className="flex-1 px-2.5 py-1.5 rounded border bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex flex-wrap gap-4 font-semibold">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                <span>Published on Portal</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
                <span>Highlight as Key Infrastructure</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isShareable} onChange={(e) => setIsShareable(e.target.checked)} />
                <span>Allow Social Media Sharing on this Facility card</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg text-white font-bold"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {editingId ? 'Save Facility Changes' : '+ Add Facility Item'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border font-semibold">
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="xl:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">Configured Campus Facilities ({facilities.items.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {facilities.items.map((item: FacilityItem, idx: number) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-16 h-12 rounded object-cover border shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-bold text-sm truncate">{item.title}</p>
                        {item.status === 'pending_approval' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Pending Super Admin Approval
                          </span>
                        )}
                        {item.status === 'rejected' && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                            Rejected
                          </span>
                        )}
                      </div>
                      <p className="text-stone-500 truncate">
                        {item.category} · {(item.customFields || []).length} custom fields · {item.isShareable === false ? 'Share Hidden' : 'Shareable'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => reorderFacility(idx, -1)}
                      className="p-1 rounded border disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === facilities.items.length - 1}
                      onClick={() => reorderFacility(idx, 1)}
                      className="p-1 rounded border disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setTitle(item.title);
                        setCategory(item.category);
                        setShortSummary(item.shortSummary);
                        setDescriptionHtml(item.descriptionHtml);
                        setLocationBlock(item.locationBlock);
                        setCapacity(item.capacity);
                        setTimings(item.timings);
                        setInchargeName(item.inchargeName);
                        setInchargeEmail(item.inchargeEmail || '');
                        setInchargePhone(item.inchargePhone || '');
                        setImageUrl(item.imageUrl);
                        setBrochureUrl(item.brochureUrl || '');
                        setCustomFields(item.customFields || []);
                        setIsFeatured(item.isFeatured);
                        setIsPublished(item.isPublished);
                        setIsShareable(item.isShareable !== false);
                      }}
                      className="px-2.5 py-1 rounded border font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        adminFetch<{ queuedForApproval?: boolean; message?: string }>(
                          `/api/admin/facilities/items/${item.id}`,
                          'DELETE',
                        )
                          .then((res) =>
                            notify(
                              'ok',
                              res?.queuedForApproval && res.message
                                ? res.message
                                : `Deleted facility "${item.title}".`,
                            ),
                          )
                          .catch((err) => notify('err', (err as Error).message))
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
    </div>
  );
}
