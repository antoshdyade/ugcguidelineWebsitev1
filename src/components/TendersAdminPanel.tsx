import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, FileSpreadsheet, Plus, Trash2, Upload } from 'lucide-react';
import type { SiteSettings, TenderCustomField, TenderNotice, TendersData } from '../types/cms';
import {
  DEFAULT_TENDER_PORTAL_CONFIG,
  TENDER_CATEGORY_PRESETS,
  TENDER_MODE_PRESETS,
  TENDER_STATUS_PRESETS,
} from '../lib/collegeFeaturesLogic';
import { getUploadSizeLimitMb } from '../lib/imageCrop';
import { CustomSelectInput } from './CustomSelectInput';
import { RichTextEditor } from './RichTextEditor';

interface TendersAdminPanelProps {
  tenders: TendersData;
  settings: SiteSettings;
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  uploadBinary: (file: File) => Promise<string>;
  notify: (type: 'ok' | 'err', text: string) => void;
}

export function TendersAdminPanel({
  tenders,
  settings,
  adminFetch,
  uploadBinary,
  notify,
}: TendersAdminPanelProps) {
  const [subTab, setSubTab] = useState<'items' | 'config'>('items');
  const maxPhotoMb = getUploadSizeLimitMb(settings, 'photo');
  const autoCrop = settings.autoCropImages !== false;

  const [cfgDraft, setCfgDraft] = useState({
    ...DEFAULT_TENDER_PORTAL_CONFIG,
    ...(tenders.config || {}),
  });
  const [presetText, setPresetText] = useState(
    (tenders.config?.customFieldPresets || DEFAULT_TENDER_PORTAL_CONFIG.customFieldPresets).join(', '),
  );

  useEffect(() => {
    setCfgDraft({ ...DEFAULT_TENDER_PORTAL_CONFIG, ...(tenders.config || {}) });
    setPresetText(
      (tenders.config?.customFieldPresets || DEFAULT_TENDER_PORTAL_CONFIG.customFieldPresets).join(', '),
    );
  }, [tenders.config]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(TENDER_CATEGORY_PRESETS[0]);
  const [departmentName, setDepartmentName] = useState('');
  const [procurementMode, setProcurementMode] = useState<string>(TENDER_MODE_PRESETS[0]);
  const [estimatedValue, setEstimatedValue] = useState('');
  const [emdAmount, setEmdAmount] = useState('');
  const [tenderFee, setTenderFee] = useState('');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10));
  const [preBidDate, setPreBidDate] = useState('');
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [bidOpeningDate, setBidOpeningDate] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState<string>(TENDER_STATUS_PRESETS[0]);
  const [summary, setSummary] = useState('');
  const [eligibilityHtml, setEligibilityHtml] = useState(
    '<ul><li>Valid GST registration, PAN copy &amp; OEM authorization required.</li></ul>',
  );
  const [nitPdfUrl, setNitPdfUrl] = useState('');
  const [boqUrl, setBoqUrl] = useState('');
  const [corrigendumNote, setCorrigendumNote] = useState('');
  const [corrigendumUrl, setCorrigendumUrl] = useState('');
  const [awardedTo, setAwardedTo] = useState('');
  const [awardedValue, setAwardedValue] = useState('');
  const [poReference, setPoReference] = useState('');
  const [customFields, setCustomFields] = useState<TenderCustomField[]>([]);
  const [cfLabel, setCfLabel] = useState('');
  const [cfValue, setCfValue] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [isShareable, setIsShareable] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setReferenceNumber('');
    setTitle('');
    setCategory(TENDER_CATEGORY_PRESETS[0]);
    setDepartmentName('');
    setProcurementMode(TENDER_MODE_PRESETS[0]);
    setEstimatedValue('');
    setEmdAmount('');
    setTenderFee('');
    setPublishDate(new Date().toISOString().slice(0, 10));
    setPreBidDate('');
    setSubmissionDeadline('');
    setBidOpeningDate('');
    setLifecycleStatus(TENDER_STATUS_PRESETS[0]);
    setSummary('');
    setEligibilityHtml('<ul><li>Valid GST registration, PAN copy &amp; OEM authorization required.</li></ul>');
    setNitPdfUrl('');
    setBoqUrl('');
    setCorrigendumNote('');
    setCorrigendumUrl('');
    setAwardedTo('');
    setAwardedValue('');
    setPoReference('');
    setCustomFields([]);
    setIsPinned(false);
    setIsPublished(true);
    setIsShareable(true);
  };

  const reorderTender = async (index: number, dir: -1 | 1) => {
    const items = [...tenders.items];
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    try {
      await adminFetch('/api/admin/tenders/items/reorder', 'PUT', {
        orderedIds: items.map((i) => i.id),
      });
      notify('ok', 'Reordered tender notice display sequence.');
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const handleUploadDoc = async (
    file: File | undefined,
    setter: (val: string) => void,
  ) => {
    if (!file) return;
    try {
      const url = await uploadBinary(file);
      setter(url);
      notify('ok', `Uploaded "${file.name}".`);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-amber-600" />
          <span className="text-sm font-bold">Tenders &amp; Purchase Notices Portal (/tenders)</span>
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
            Tender Notices &amp; Awards ({tenders.items.length})
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
            Procurement Office &amp; Terms Config
          </button>
        </div>
      </div>

      {subTab === 'config' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await adminFetch('/api/admin/tenders/config', 'PUT', {
                ...cfgDraft,
                customFieldPresets: presetText
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              });
              notify('ok', 'Saved Procurement Office & Tender Portal configuration.');
            } catch (err) {
              notify('err', (err as Error).message);
            }
          }}
          className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs max-w-4xl"
        >
          <h2 className="text-base font-bold">Procurement Cell Header, Purchase Officer &amp; Vendor Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={cfgDraft.heroBadge}
              onChange={(e) => setCfgDraft({ ...cfgDraft, heroBadge: e.target.value })}
              placeholder="Portal Eyebrow Badge"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              required
              value={cfgDraft.heroTitle}
              onChange={(e) => setCfgDraft({ ...cfgDraft, heroTitle: e.target.value })}
              placeholder="Portal Title *"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <textarea
              rows={2}
              value={cfgDraft.heroSubtitle}
              onChange={(e) => setCfgDraft({ ...cfgDraft, heroSubtitle: e.target.value })}
              placeholder="Portal Subtitle"
              className="md:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.officerName}
              onChange={(e) => setCfgDraft({ ...cfgDraft, officerName: e.target.value })}
              placeholder="Purchase Officer Name"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.officerTitle}
              onChange={(e) => setCfgDraft({ ...cfgDraft, officerTitle: e.target.value })}
              placeholder="Designation / Committee Title"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="email"
              value={cfgDraft.officerEmail}
              onChange={(e) => setCfgDraft({ ...cfgDraft, officerEmail: e.target.value })}
              placeholder="Procurement Email"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.officerPhone}
              onChange={(e) => setCfgDraft({ ...cfgDraft, officerPhone: e.target.value })}
              placeholder="Procurement Phone"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.officeAddress}
              onChange={(e) => setCfgDraft({ ...cfgDraft, officeAddress: e.target.value })}
              placeholder="Store / Purchase Office Address"
              className="md:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.eProcurementPortalLabel}
              onChange={(e) => setCfgDraft({ ...cfgDraft, eProcurementPortalLabel: e.target.value })}
              placeholder="e-Tendering Button Label"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              value={cfgDraft.eProcurementPortalUrl}
              onChange={(e) => setCfgDraft({ ...cfgDraft, eProcurementPortalUrl: e.target.value })}
              placeholder="e-Tendering / GeM Portal URL"
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <RichTextEditor
            label="Standard Procurement Terms & Vendor Instructions (HTML)"
            value={cfgDraft.generalTermsHtml}
            onChange={(html) => setCfgDraft({ ...cfgDraft, generalTermsHtml: html })}
            uploadBinary={uploadBinary}
            maxPhotoMb={maxPhotoMb}
            autoCropEnabled={autoCrop}
            minHeight={120}
          />

          <div>
            <label className="block font-semibold mb-1">
              Suggested Custom Field Labels (comma-separated)
            </label>
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
            Save Procurement Settings
          </button>
        </form>
      )}

      {subTab === 'items' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const payload = {
                referenceNumber,
                title,
                category,
                departmentName,
                procurementMode,
                estimatedValue,
                emdAmount,
                tenderFee,
                publishDate,
                preBidDate,
                submissionDeadline,
                bidOpeningDate,
                lifecycleStatus,
                summary,
                eligibilityHtml,
                nitPdfUrl,
                boqUrl,
                corrigendumNote,
                corrigendumUrl,
                awardedTo,
                awardedValue,
                poReference,
                customFields,
                isPinned,
                isPublished,
                isShareable,
              };
              try {
                if (editingId) {
                  const res = await adminFetch<{ queuedForApproval?: boolean; message?: string; item?: TenderNotice }>(
                    `/api/admin/tenders/items/${editingId}`,
                    'PUT',
                    payload,
                  );
                  notify(
                    'ok',
                    res?.queuedForApproval && res.message ? res.message : `Updated tender "${referenceNumber}".`,
                  );
                } else {
                  const res = await adminFetch<{ queuedForApproval?: boolean; message?: string; item?: TenderNotice }>(
                    '/api/admin/tenders/items',
                    'POST',
                    payload,
                  );
                  notify(
                    'ok',
                    res?.queuedForApproval && res.message ? res.message : `Published tender "${referenceNumber}".`,
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
              {editingId ? `Edit Tender / Purchase Notice (${referenceNumber})` : 'Publish New Tender / Purchase Notice'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="NIT / Ref No. (e.g. SVCOER/PUR/2026-27/015) *"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
              <input
                type="text"
                required
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="Indenting Dept / Unit *"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <div className="md:col-span-2">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tender / Procurement Title *"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <CustomSelectInput
                label="Procurement Category (or Custom)"
                required
                value={category}
                onChange={setCategory}
                options={[...TENDER_CATEGORY_PRESETS]}
                customPlaceholder="Custom procurement category..."
              />
              <CustomSelectInput
                label="Tendering Mode (or Custom)"
                required
                value={procurementMode}
                onChange={setProcurementMode}
                options={[...TENDER_MODE_PRESETS]}
                customPlaceholder="Custom tendering mode..."
              />
              <CustomSelectInput
                label="Lifecycle Stage"
                required
                value={lifecycleStatus}
                onChange={setLifecycleStatus}
                options={[...TENDER_STATUS_PRESETS]}
                customPlaceholder="Custom stage..."
              />
              <input
                type="text"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="Estimated Value (e.g. ₹12,50,000)"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 self-end"
              />
              <input
                type="text"
                value={emdAmount}
                onChange={(e) => setEmdAmount(e.target.value)}
                placeholder="EMD Amount (e.g. ₹25,000)"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={tenderFee}
                onChange={(e) => setTenderFee(e.target.value)}
                placeholder="Tender Form Fee (e.g. ₹1,500)"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="date"
                required
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                aria-label="Publish Date"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={submissionDeadline}
                onChange={(e) => setSubmissionDeadline(e.target.value)}
                placeholder="Submission Deadline (e.g. 2026-12-15 05:00 PM) *"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={preBidDate}
                onChange={(e) => setPreBidDate(e.target.value)}
                placeholder="Pre-Bid Meeting Date/Venue (optional)"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                value={bidOpeningDate}
                onChange={(e) => setBidOpeningDate(e.target.value)}
                placeholder="Technical Bid Opening Schedule (optional)"
                className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <textarea
              rows={2}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Short Procurement Scope & Invitation Summary *"
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />

            <RichTextEditor
              label="Vendor Eligibility, Turnover & Technical Terms (HTML)"
              value={eligibilityHtml}
              onChange={setEligibilityHtml}
              uploadBinary={uploadBinary}
              maxPhotoMb={maxPhotoMb}
              autoCropEnabled={autoCrop}
              minHeight={110}
            />

            {/* Documents: NIT PDF, BOQ, Corrigendum */}
            <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-slate-700 space-y-2">
              <p className="font-bold">Official Tender Documents (PDF / XLSX / URL)</p>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border cursor-pointer bg-white dark:bg-slate-900 font-semibold shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>NIT PDF</span>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      handleUploadDoc(f, setNitPdfUrl);
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={nitPdfUrl}
                  onChange={(e) => setNitPdfUrl(e.target.value)}
                  placeholder="NIT Document URL"
                  className="flex-1 px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border cursor-pointer bg-white dark:bg-slate-900 font-semibold shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>BOQ File</span>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.docx"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      handleUploadDoc(f, setBoqUrl);
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={boqUrl}
                  onChange={(e) => setBoqUrl(e.target.value)}
                  placeholder="BOQ / Price Bid Sheet URL (optional)"
                  className="flex-1 px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
                />
              </div>

              <input
                type="text"
                value={corrigendumNote}
                onChange={(e) => setCorrigendumNote(e.target.value)}
                placeholder="Corrigendum / Deadline Extension Note (optional)"
                className="w-full px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
              />
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border cursor-pointer bg-white dark:bg-slate-900 font-semibold shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Corrigendum</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      handleUploadDoc(f, setCorrigendumUrl);
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={corrigendumUrl}
                  onChange={(e) => setCorrigendumUrl(e.target.value)}
                  placeholder="Corrigendum PDF URL (optional)"
                  className="flex-1 px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Contract Award Disclosure */}
            <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-slate-700 space-y-2">
              <p className="font-bold">Contract Award Disclosure (Optional / When Awarded)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={awardedTo}
                  onChange={(e) => setAwardedTo(e.target.value)}
                  placeholder="Awarded Vendor Name"
                  className="px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={awardedValue}
                  onChange={(e) => setAwardedValue(e.target.value)}
                  placeholder="Final PO Value"
                  className="px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={poReference}
                  onChange={(e) => setPoReference(e.target.value)}
                  placeholder="PO Number & Date"
                  className="px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            {/* Dynamic Custom Fields */}
            <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-slate-800/40 border border-stone-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">Custom Tender Parameters ({customFields.length})</span>
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
                  placeholder="Parameter Label"
                  className="px-2.5 py-1.5 rounded border bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={cfValue}
                  onChange={(e) => setCfValue(e.target.value)}
                  placeholder="Parameter Value"
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

            <div className="flex flex-wrap gap-4 font-semibold">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                <span>Published on Portal</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
                <span>Pin as Priority Notice</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={isShareable} onChange={(e) => setIsShareable(e.target.checked)} />
                <span>Allow Social Media Sharing on Notice</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg text-white font-bold"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {editingId ? 'Save Tender Changes' : '+ Publish Tender Notice'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border font-semibold">
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="xl:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold">Published &amp; Queued Tenders ({tenders.items.length})</h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800">
              {tenders.items.map((item: TenderNotice, idx: number) => (
                <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] tabular-nums">
                      <span className="font-mono font-bold text-stone-800 dark:text-slate-200">
                        {item.referenceNumber}
                      </span>
                      <span className="text-stone-400">&middot;</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {item.lifecycleStatus}
                      </span>
                      {item.moderationStatus === 'pending_approval' && (
                        <>
                          <span className="text-stone-400">&middot;</span>
                          <span className="font-bold text-amber-700">Pending Super Admin Approval</span>
                        </>
                      )}
                      {item.moderationStatus === 'rejected' && (
                        <>
                          <span className="text-stone-400">&middot;</span>
                          <span className="font-bold text-rose-600">Rejected</span>
                        </>
                      )}
                    </div>
                    <p className="font-bold text-sm text-stone-900 dark:text-white leading-snug">{item.title}</p>
                    <p className="text-stone-500 tabular-nums">
                      {item.category} &middot; {item.departmentName} &middot; Due {item.submissionDeadline} &middot;{' '}
                      {item.isShareable === false ? 'Share Hidden' : 'Shareable'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => reorderTender(idx, -1)}
                      className="p-1 rounded border disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === tenders.items.length - 1}
                      onClick={() => reorderTender(idx, 1)}
                      className="p-1 rounded border disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setReferenceNumber(item.referenceNumber);
                        setTitle(item.title);
                        setCategory(item.category);
                        setDepartmentName(item.departmentName);
                        setProcurementMode(item.procurementMode);
                        setEstimatedValue(item.estimatedValue);
                        setEmdAmount(item.emdAmount);
                        setTenderFee(item.tenderFee);
                        setPublishDate(item.publishDate);
                        setPreBidDate(item.preBidDate || '');
                        setSubmissionDeadline(item.submissionDeadline);
                        setBidOpeningDate(item.bidOpeningDate || '');
                        setLifecycleStatus(item.lifecycleStatus);
                        setSummary(item.summary);
                        setEligibilityHtml(item.eligibilityHtml || '');
                        setNitPdfUrl(item.nitPdfUrl || '');
                        setBoqUrl(item.boqUrl || '');
                        setCorrigendumNote(item.corrigendumNote || '');
                        setCorrigendumUrl(item.corrigendumUrl || '');
                        setAwardedTo(item.awardedTo || '');
                        setAwardedValue(item.awardedValue || '');
                        setPoReference(item.poReference || '');
                        setCustomFields(item.customFields || []);
                        setIsPinned(Boolean(item.isPinned));
                        setIsPublished(item.isPublished !== false);
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
                          `/api/admin/tenders/items/${item.id}`,
                          'DELETE',
                        )
                          .then((res) =>
                            notify(
                              'ok',
                              res?.queuedForApproval && res.message
                                ? res.message
                                : `Deleted tender "${item.referenceNumber}".`,
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
