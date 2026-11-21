import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Mail,
  MessageSquarePlus,
  Search,
  Send,
  Star,
  Upload,
} from 'lucide-react';
import type { FeedbackSectionConfig, SiteSettings } from '../types/cms';
import {
  DEFAULT_FEEDBACK_SECTIONS,
  FEEDBACK_SUBMISSION_TYPE_PRESETS,
} from '../lib/collegeFeaturesLogic';
import { getUploadSizeLimitBytes, getUploadSizeLimitMb } from '../lib/imageCrop';
import { CaptchaWidget } from './CaptchaWidget';
import { CustomSelectInput } from './CustomSelectInput';
import { SocialShareBar } from './SocialMediaWidgets';

export interface FeedbackSummaryStats {
  total: number;
  resolved: number;
  open: number;
  complaints: number;
  avgRating: number;
  resolutionRatePct: number;
}

interface FeedbackPortalProps {
  sections?: FeedbackSectionConfig[];
  summary?: FeedbackSummaryStats;
  settings: SiteSettings;
}

export function FeedbackPortal({ sections, summary, settings }: FeedbackPortalProps) {
  const activeSections = useMemo(
    () =>
      (sections && sections.length > 0 ? sections : DEFAULT_FEEDBACK_SECTIONS).filter(
        (s) => s.isActive !== false,
      ),
    [sections],
  );

  const [sectionSlug, setSectionSlug] = useState<string>(activeSections[0]?.slug || 'academics');
  const selectedSection = useMemo(
    () => activeSections.find((s) => s.slug === sectionSlug) || activeSections[0],
    [activeSections, sectionSlug],
  );
  const [subsection, setSubsection] = useState<string>(
    selectedSection?.subsections[0] || 'General Feedback & Query',
  );
  const [submissionType, setSubmissionType] = useState<string>('Feedback');
  const [rating, setRating] = useState<number>(5);
  const [isConfidential, setIsConfidential] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [senderRole, setSenderRole] = useState('Student (UG / PG / Ph.D.)');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [departmentOrRollNo, setDepartmentOrRollNo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaRefresh, setCaptchaRefresh] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: 'ok' | 'err';
    text: string;
    ticketCode?: string;
    routedTo?: string;
  } | null>(null);

  // Live metrics & ticket tracker
  const [liveSummary, setLiveSummary] = useState(
    summary || { total: 0, resolved: 0, open: 0, complaints: 0, avgRating: 5.0, resolutionRatePct: 100 },
  );
  const [trackCode, setTrackCode] = useState('');
  const [trackedEntry, setTrackedEntry] = useState<{
    ticketCode: string;
    submissionType: string;
    sectionName: string;
    subsection: string;
    rating: number;
    subject: string;
    routedToEmails: string;
    status: string;
    actionTakenNote: string;
    submittedAt: string;
    updatedAt: string;
  } | null>(null);
  const [trackErr, setTrackErr] = useState('');

  useEffect(() => {
    if (selectedSection && !selectedSection.subsections.includes(subsection)) {
      setSubsection(selectedSection.subsections[0] || 'General Feedback & Query');
    }
  }, [selectedSection, subsection]);

  useEffect(() => {
    fetch('/api/public/feedback/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.total === 'number') setLiveSummary(d);
      })
      .catch(() => {});
  }, []);

  const maxDocMb = getUploadSizeLimitMb(settings, 'document');
  const maxDocBytes = getUploadSizeLimitBytes(settings, 'document');

  const handleAttachmentUpload = async (file: File) => {
    if (file.size > maxDocBytes) {
      setFeedbackNotice({
        type: 'err',
        text: `Attachment exceeds ${maxDocMb} MB limit.`,
      });
      return;
    }
    setUploadingFile(true);
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const resp = await fetch('/api/public/feedback/upload-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, base64Data }),
      });
      const data = (await resp.json()) as { url?: string; error?: string };
      if (!resp.ok || !data.url) throw new Error(data.error || 'Upload failed.');
      setAttachmentUrl(data.url);
    } catch (err) {
      setFeedbackNotice({ type: 'err', text: (err as Error).message });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackNotice(null);
    try {
      const resp = await fetch('/api/public/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionType,
          sectionSlug: selectedSection?.slug || sectionSlug,
          sectionName: selectedSection?.sectionName || sectionSlug,
          subsection,
          senderName: isConfidential && !senderName.trim() ? 'Confidential Stakeholder' : senderName,
          senderRole,
          senderEmail,
          senderPhone,
          departmentOrRollNo,
          rating,
          isConfidential,
          subject,
          message,
          attachmentUrl,
          captchaId,
          captchaAnswer,
        }),
      });
      const data = (await resp.json()) as {
        ok?: boolean;
        ticketCode?: string;
        routedToEmails?: string;
        message?: string;
        error?: string;
      };
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'Unable to submit feedback.');
      }
      setFeedbackNotice({
        type: 'ok',
        text: data.message || 'Feedback submitted successfully.',
        ticketCode: data.ticketCode,
        routedTo: data.routedToEmails,
      });
      if (data.ticketCode) setTrackCode(data.ticketCode);
      setSubject('');
      setMessage('');
      setAttachmentUrl('');
      setCaptchaRefresh((c) => c + 1);
      fetch('/api/public/feedback/summary')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && typeof d.total === 'number') setLiveSummary(d);
        })
        .catch(() => {});
    } catch (err) {
      setFeedbackNotice({ type: 'err', text: (err as Error).message });
      setCaptchaRefresh((c) => c + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackErr('');
    setTrackedEntry(null);
    try {
      const resp = await fetch(`/api/public/feedback/status?code=${encodeURIComponent(trackCode.trim())}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Ticket not found.');
      setTrackedEntry(data);
    } catch (err) {
      setTrackErr((err as Error).message);
    }
  };

  return (
    <div className="max-w-[1380px] mx-auto px-4 py-8 space-y-8">
      <header
        className="rounded-2xl p-6 sm:p-9 text-white border border-white/10"
        style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #163A64 100%)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
              Continuous Quality Improvement · Automated Section Routing
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
              Stakeholder Complaint &amp; Feedback Portal
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-3xl leading-relaxed">
              Submit complaints, constructive suggestions, service ratings, or appreciation across academic, examination, hostel, IT, transport, accounts, and placement sections. Submissions are pushed directly to the concerned Section In-Charge&rsquo;s email inbox.
            </p>
          </div>
          <div className="lg:col-span-4 grid grid-cols-2 gap-3 text-center">
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15">
              <p className="text-2xl font-bold tabular-nums">{liveSummary.total}</p>
              <p className="text-xs text-slate-200 mt-0.5">Total Submissions</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15">
              <p className="text-2xl font-bold tabular-nums">{liveSummary.avgRating}/5</p>
              <p className="text-xs text-slate-200 mt-0.5">Campus Satisfaction</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15">
              <p className="text-2xl font-bold tabular-nums">{liveSummary.resolutionRatePct}%</p>
              <p className="text-xs text-slate-200 mt-0.5">Action Completion</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 border border-white/15">
              <p className="text-2xl font-bold tabular-nums">{activeSections.length}</p>
              <p className="text-xs text-slate-200 mt-0.5">Routed Sections</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Submission Form */}
        <section className="lg:col-span-8 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="pb-4 border-b border-stone-200 dark:border-slate-800">
            <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-amber-600" />
              Submit Section-Wise Complaint / Feedback
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              Select a target campus section and subsection below — the portal displays the exact nodal officer &amp; routed email address before submission.
            </p>
          </div>

          {feedbackNotice && (
            <div
              role="status"
              className={`p-4 rounded-xl border text-sm space-y-1 ${
                feedbackNotice.type === 'ok'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
              }`}
            >
              <p className="font-semibold flex items-center gap-2">
                {feedbackNotice.type === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{feedbackNotice.text}</span>
              </p>
              {feedbackNotice.ticketCode && (
                <p className="text-xs font-mono tabular-nums">
                  Ticket ID: <strong>{feedbackNotice.ticketCode}</strong> · Pushed to: {feedbackNotice.routedTo}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Submission Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {FEEDBACK_SUBMISSION_TYPE_PRESETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSubmissionType(t)}
                      className={`px-3 py-2 min-h-[40px] rounded-lg text-xs font-semibold border transition-colors ${
                        submissionType === t
                          ? 'text-white border-transparent'
                          : 'border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800'
                      }`}
                      style={submissionType === t ? { backgroundColor: 'var(--primary-color)' } : undefined}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5">Service Experience Rating *</label>
                <div className="flex items-center gap-1.5 min-h-[40px]">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      aria-label={`Rate ${starVal} stars`}
                      className={`p-2 rounded-lg border transition-colors ${
                        starVal <= rating
                          ? 'border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'border-stone-200 dark:border-slate-700 text-stone-400'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${starVal <= rating ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                  <span className="text-xs font-semibold text-stone-600 dark:text-slate-300 ml-2 tabular-nums">
                    {rating} / 5
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Campus Section / Department *</label>
                <select
                  value={selectedSection?.slug || sectionSlug}
                  onChange={(e) => setSectionSlug(e.target.value)}
                  className="w-full px-3 py-2.5 min-h-[42px] text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {activeSections.map((sec) => (
                    <option key={sec.id} value={sec.slug}>
                      {sec.sectionName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <CustomSelectInput
                  label="Specific Subsection / Topic *"
                  value={subsection}
                  onChange={setSubsection}
                  options={selectedSection?.subsections || ['General Query']}
                  placeholder="Enter subsection or area..."
                />
              </div>
            </div>

            {selectedSection && (
              <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-semibold text-stone-900 dark:text-white">
                    Nodal Officer: {selectedSection.inchargeName}
                  </p>
                  <p className="text-stone-600 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Auto-Email Push Target: {selectedSection.recipientEmails}</span>
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-stone-600 dark:text-slate-300 tabular-nums shrink-0">
                  Target Response SLA: {selectedSection.slaDays} Working Days
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                id="fb-conf-toggle"
                type="checkbox"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
              />
              <label htmlFor="fb-conf-toggle" className="text-xs font-medium text-stone-700 dark:text-slate-300">
                Keep my public display name confidential (email kept strictly for ticket resolution tracking)
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {isConfidential ? 'Display Alias (Optional)' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required={!isConfidential}
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Aarav Deshmukh"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <CustomSelectInput
                  label="Stakeholder Role"
                  value={senderRole}
                  onChange={setSenderRole}
                  options={[
                    'Student (UG / PG / Ph.D.)',
                    'Parent / Guardian',
                    'Faculty / Staff Member',
                    'Alumni',
                    'Industry Recruiter / Visitor',
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Dept / Roll No / PRN</label>
                <input
                  type="text"
                  value={departmentOrRollNo}
                  onChange={(e) => setDepartmentOrRollNo(e.target.value)}
                  placeholder="e.g. TY B.Tech CSE · 23CSE019"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Email Address (for updates) *</label>
                <input
                  type="email"
                  required
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="you@sveri.ac.in"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="+91-98xxx-xxxxx"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Subject / Brief Summary *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Clear concise summary of your complaint or feedback"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Detailed Remarks / Action Requested *</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Include relevant dates, room/bus/lab details, or constructive suggestions..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-slate-600 bg-white dark:bg-slate-900 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingFile ? 'Uploading...' : 'Attach Supporting PDF / Image (Optional)'}</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) handleAttachmentUpload(f);
                  }}
                />
              </label>
              <span className="text-[11px] text-stone-500">
                {attachmentUrl ? `Attached: ${attachmentUrl}` : `Max size ${maxDocMb} MB (PDF/JPG/PNG)`}
              </span>
            </div>

            <CaptchaWidget
              idPrefix="feedback"
              captchaId={captchaId}
              captchaAnswer={captchaAnswer}
              onCaptchaIdChange={setCaptchaId}
              onCaptchaAnswerChange={setCaptchaAnswer}
              refreshSignal={captchaRefresh}
            />

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-sm font-bold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting & Sending Email Alert...' : 'Submit & Notify Section Head'}</span>
            </button>
          </form>
        </section>

        {/* Right Column: Ticket Tracker & Section Directory */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3.5">
            <h2 className="font-display text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-600" />
              Track Ticket Status
            </h2>
            <p className="text-xs text-stone-500 dark:text-slate-400">
              Enter your Ticket Code (e.g. <span className="font-mono">CFB-2026-0001</span>) to view section action updates.
            </p>
            <form onSubmit={handleTrackTicket} className="flex gap-2">
              <input
                type="text"
                required
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value)}
                placeholder="CFB-2026-0001"
                className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Track
              </button>
            </form>
            {trackErr && <p className="text-xs text-rose-600 font-medium">{trackErr}</p>}
            {trackedEntry && (
              <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-stone-900 dark:text-white">{trackedEntry.ticketCode}</span>
                  <span className="font-semibold uppercase text-amber-700 dark:text-amber-300">{trackedEntry.status}</span>
                </div>
                <p className="font-semibold text-stone-900 dark:text-white">{trackedEntry.subject}</p>
                <p className="text-stone-600 dark:text-slate-300">
                  {trackedEntry.sectionName} · {trackedEntry.subsection}
                </p>
                <p className="text-stone-700 dark:text-slate-200 pt-1 border-t border-stone-200 dark:border-slate-700">
                  <strong>Action Taken:</strong> {trackedEntry.actionTakenNote}
                </p>
                <p className="text-[11px] text-stone-500 tabular-nums">Updated: {trackedEntry.updatedAt}</p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-lg font-bold text-stone-900 dark:text-white">
              Section Nodal Routing Directory
            </h3>
            <div className="divide-y divide-stone-100 dark:divide-slate-800 text-xs">
              {activeSections.map((sec) => (
                <div key={sec.id} className="py-2.5 space-y-0.5">
                  <p className="font-semibold text-stone-900 dark:text-white">{sec.sectionName}</p>
                  <p className="text-stone-500 dark:text-slate-400">{sec.inchargeName}</p>
                  <p className="font-mono text-[11px] text-amber-700 dark:text-amber-400 truncate">
                    {sec.recipientEmails}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <SocialShareBar
        title={`${settings.shortCode || settings.institutionName || 'Institutional'} Complaint & Feedback Portal`}
        summary="Submit campus complaints, suggestions, or service feedback directly to section heads."
        settings={settings}
        location="portal"
      />
    </div>
  );
}
