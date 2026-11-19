import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Mail,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type {
  EmailDispatchLogEntry,
  EmailPushConfig,
  FeedbackEntry,
  FeedbackSectionConfig,
  FeedbackStatus,
} from '../types/cms';
import {
  DEFAULT_EMAIL_PUSH_CONFIG,
  FEEDBACK_SUBMISSION_TYPE_PRESETS,
  computeFeedbackMetrics,
  filterFeedbackEntries,
} from '../lib/collegeFeaturesLogic';

function exportFeedbackCsv(entries: FeedbackEntry[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = [
    'Ticket Code',
    'Type',
    'Section',
    'Subsection',
    'Rating',
    'Sender Name',
    'Role',
    'Email',
    'Subject',
    'Message',
    'Routed Emails',
    'Email Push Status',
    'Status',
    'Action Taken Note',
    'Submitted At',
  ];
  const rows = entries.map((e) => [
    e.ticketCode,
    e.submissionType,
    e.sectionName,
    e.subsection,
    e.rating,
    e.senderName,
    e.senderRole,
    e.senderEmail,
    e.subject,
    e.message,
    e.routedToEmails,
    e.emailPushStatus,
    e.status,
    e.actionTakenNote || '',
    e.submittedAt,
  ]);
  const csv = [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `svcoer-feedback-entries-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface FeedbackManagerPanelProps {
  sections: FeedbackSectionConfig[];
  entries: FeedbackEntry[];
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  notify: (type: 'ok' | 'err', text: string) => void;
}

export function FeedbackManagerPanel({
  sections,
  entries,
  adminFetch,
  notify,
}: FeedbackManagerPanelProps) {
  const [subTab, setSubTab] = useState<'entries' | 'sections'>('entries');
  const [secFilter, setSecFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});
  const [statusDraft, setStatusDraft] = useState<Record<number, FeedbackStatus>>({});

  // Section CRUD form
  const [editingSecId, setEditingSecId] = useState<number | null>(null);
  const [secName, setSecName] = useState('');
  const [secSubsections, setSecSubsections] = useState('');
  const [secEmails, setSecEmails] = useState('');
  const [secCcEmails, setSecCcEmails] = useState('');
  const [secIncharge, setSecIncharge] = useState('');
  const [secSlaDays, setSecSlaDays] = useState(4);
  const [secAutoEmail, setSecAutoEmail] = useState(true);
  const [secActive, setSecActive] = useState(true);

  const metrics = useMemo(() => computeFeedbackMetrics(entries), [entries]);
  const filteredEntries = useMemo(
    () => filterFeedbackEntries(entries, secFilter, typeFilter, statusFilter, searchQ),
    [entries, secFilter, typeFilter, statusFilter, searchQ],
  );

  const resetSecForm = () => {
    setEditingSecId(null);
    setSecName('');
    setSecSubsections('');
    setSecEmails('');
    setSecCcEmails('');
    setSecIncharge('');
    setSecSlaDays(4);
    setSecAutoEmail(true);
    setSecActive(true);
  };

  const moveSection = async (id: number, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= sections.length) return;
    const ids = sections.map((s) => s.id);
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    await adminFetch('/api/admin/feedback/sections/reorder', 'PUT', { orderedIds: ids });
    notify('ok', 'Reordered feedback sections.');
  };

  return (
    <div className="space-y-6 pt-6 mt-6 border-t border-stone-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white">
            Stakeholder Complaint &amp; Feedback Manager (Section Email Routing)
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Configure custom Feedback Sections, Subsections, and Section Head Email recipients; moderate and respond to submissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('entries')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border ${
              subTab === 'entries'
                ? 'text-white border-transparent'
                : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700'
            }`}
            style={subTab === 'entries' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Feedback Inbox ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('sections')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border ${
              subTab === 'sections'
                ? 'text-white border-transparent'
                : 'bg-white dark:bg-slate-900 border-stone-300 dark:border-slate-700'
            }`}
            style={subTab === 'sections' ? { backgroundColor: 'var(--primary-color)' } : undefined}
          >
            Sections &amp; Email Routing ({sections.length})
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-stone-500">Total Feedback</p>
          <p className="text-2xl font-bold tabular-nums">{metrics.total}</p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-stone-500">Open / Forwarded</p>
          <p className="text-2xl font-bold tabular-nums text-amber-700">{metrics.open}</p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-stone-500">Resolved / Closed</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-700">{metrics.resolved}</p>
        </div>
        <div className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-xs text-stone-500">Avg Campus Rating</p>
          <p className="text-2xl font-bold tabular-nums">{metrics.avgRating} / 5</p>
        </div>
      </div>

      {subTab === 'entries' && (
        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search ticket, sender, subject..."
                className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={secFilter}
                onChange={(e) => setSecFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Sections</option>
                {sections.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.sectionName}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Types</option>
                {FEEDBACK_SUBMISSION_TYPE_PRESETS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Statuses</option>
                <option value="new">New</option>
                <option value="forwarded">Forwarded</option>
                <option value="in_review">In Review</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => exportFeedbackCsv(filteredEntries)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="space-y-3">
            {filteredEntries.map((item) => {
              const curStatus = statusDraft[item.id] ?? item.status;
              const curNote = notesDraft[item.id] ?? item.actionTakenNote ?? '';
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 space-y-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-stone-600 dark:text-slate-300">
                      <span className="font-mono font-bold text-stone-900 dark:text-white">{item.ticketCode}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">{item.submissionType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.sectionName} / {item.subsection}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{item.rating}/5 Stars</span>
                    </div>
                    <span className="font-semibold uppercase text-stone-700 dark:text-slate-200">{item.status}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white">{item.subject}</h4>
                    <p className="text-stone-700 dark:text-slate-200 mt-1 leading-relaxed">{item.message}</p>
                    <p className="text-[11px] text-stone-500 mt-1.5">
                      Sender: {item.senderName} ({item.senderRole}) · {item.senderEmail} {item.departmentOrRollNo ? `· ${item.departmentOrRollNo}` : ''}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Routed To: <span className="font-mono">{item.routedToEmails}</span> ({item.emailPushStatus})
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-2 border-t border-stone-200/70 dark:border-slate-700 items-center">
                    <select
                      value={curStatus}
                      onChange={(e) =>
                        setStatusDraft((prev) => ({ ...prev, [item.id]: e.target.value as FeedbackStatus }))
                      }
                      className="md:col-span-2 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="new">New</option>
                      <option value="forwarded">Forwarded</option>
                      <option value="in_review">In Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <input
                      type="text"
                      value={curNote}
                      onChange={(e) => setNotesDraft((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Record action taken note..."
                      className="md:col-span-6 px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/feedback/entries/${item.id}`, 'PUT', {
                            status: curStatus,
                            actionTakenNote: curNote,
                          });
                          notify('ok', `Updated ${item.ticketCode}.`);
                        }}
                        className="px-3 py-1.5 rounded text-white font-semibold"
                        style={{ backgroundColor: 'var(--primary-color)' }}
                      >
                        Save Action
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await adminFetch(`/api/admin/feedback/entries/${item.id}/resend`, 'POST', {});
                          notify('ok', `Re-pushed email reminder to ${item.routedToEmails}.`);
                        }}
                        className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 font-semibold inline-flex items-center gap-1"
                      >
                        <Mail className="w-3 h-3" /> Re-Push Email
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${item.ticketCode}`}
                        onClick={async () => {
                          await adminFetch(`/api/admin/feedback/entries/${item.id}`, 'DELETE');
                          notify('ok', `Deleted ${item.ticketCode}.`);
                        }}
                        className="p-1.5 rounded text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredEntries.length === 0 && (
              <p className="text-center py-6 text-xs text-stone-500">No feedback entries match current filters.</p>
            )}
          </div>
        </div>
      )}

      {subTab === 'sections' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const payload = {
                  sectionName: secName,
                  subsections: secSubsections,
                  recipientEmails: secEmails,
                  ccEmails: secCcEmails,
                  inchargeName: secIncharge,
                  slaDays: secSlaDays,
                  autoEmailEnabled: secAutoEmail,
                  isActive: secActive,
                };
                if (editingSecId) {
                  await adminFetch(`/api/admin/feedback/sections/${editingSecId}`, 'PUT', payload);
                  notify('ok', `Updated feedback section "${secName}".`);
                } else {
                  await adminFetch('/api/admin/feedback/sections', 'POST', payload);
                  notify('ok', `Added feedback section "${secName}".`);
                }
                resetSecForm();
              } catch (err) {
                notify('err', (err as Error).message);
              }
            }}
            className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingSecId ? 'Edit Feedback Section' : 'Add Feedback Section & Email Route'}
              </h3>
              {editingSecId && (
                <button type="button" onClick={resetSecForm} className="text-xs underline">
                  Cancel
                </button>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Section Title *</label>
              <input
                type="text"
                required
                value={secName}
                onChange={(e) => setSecName(e.target.value)}
                placeholder="e.g. Research Labs & IDEA Lab"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Subsections (Comma-Separated) *</label>
              <textarea
                rows={2}
                required
                value={secSubsections}
                onChange={(e) => setSecSubsections(e.target.value)}
                placeholder="Equipment Access, Safety Gear, Lab Timing"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Primary Recipient Email(s) *</label>
              <input
                type="text"
                required
                value={secEmails}
                onChange={(e) => setSecEmails(e.target.value)}
                placeholder="sectionhead@coe.sveri.ac.in, dean@coe.sveri.ac.in"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold mb-1">CC Email(s)</label>
                <input
                  type="text"
                  value={secCcEmails}
                  onChange={(e) => setSecCcEmails(e.target.value)}
                  placeholder="principal@coe.sveri.ac.in"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">SLA (Days)</label>
                <input
                  type="number"
                  min={1}
                  value={secSlaDays}
                  onChange={(e) => setSecSlaDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Nodal In-Charge Name</label>
              <input
                type="text"
                value={secIncharge}
                onChange={(e) => setSecIncharge(e.target.value)}
                placeholder="Prof. A. B. Kulkarni"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={secAutoEmail} onChange={(e) => setSecAutoEmail(e.target.checked)} />
                <span>Auto-Push Email on Submit</span>
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={secActive} onChange={(e) => setSecActive(e.target.checked)} />
                <span>Visible on Public Portal</span>
              </label>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <Plus className="w-4 h-4" />
              <span>{editingSecId ? 'Save Section Route' : 'Add Feedback Section'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-stone-100 dark:divide-slate-800">
            {sections.map((sec, idx) => (
              <div key={sec.id} className="p-4 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-stone-900 dark:text-white">
                    {sec.sectionName} {!sec.isActive && '(Hidden)'}
                  </p>
                  <p className="text-stone-600 dark:text-slate-300">
                    In-Charge: {sec.inchargeName} · SLA: {sec.slaDays}d · Auto-Email: {sec.autoEmailEnabled ? 'ON' : 'OFF'}
                  </p>
                  <p className="font-mono text-[11px] text-amber-700 dark:text-amber-400">
                    To: {sec.recipientEmails} {sec.ccEmails ? `| CC: ${sec.ccEmails}` : ''}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Subsections: {sec.subsections.join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" disabled={idx === 0} onClick={() => moveSection(sec.id, -1)} className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" disabled={idx === sections.length - 1} onClick={() => moveSection(sec.id, 1)} className="p-1 rounded border border-stone-200 dark:border-slate-700 disabled:opacity-30">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSecId(sec.id);
                      setSecName(sec.sectionName);
                      setSecSubsections(sec.subsections.join(', '));
                      setSecEmails(sec.recipientEmails);
                      setSecCcEmails(sec.ccEmails || '');
                      setSecIncharge(sec.inchargeName);
                      setSecSlaDays(sec.slaDays);
                      setSecAutoEmail(sec.autoEmailEnabled);
                      setSecActive(sec.isActive);
                    }}
                    className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminFetch(`/api/admin/feedback/sections/${sec.id}`, 'DELETE');
                      notify('ok', `Deleted "${sec.sectionName}".`);
                    }}
                    className="p-1.5 rounded text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface EmailPushManagerPanelProps {
  config?: EmailPushConfig;
  logs?: EmailDispatchLogEntry[];
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  notify: (type: 'ok' | 'err', text: string) => void;
}

export function EmailPushManagerPanel({
  config,
  logs = [],
  adminFetch,
  notify,
}: EmailPushManagerPanelProps) {
  const [draft, setDraft] = useState<EmailPushConfig>({
    ...DEFAULT_EMAIL_PUSH_CONFIG,
    ...(config || {}),
  });
  const [busyPush, setBusyPush] = useState(false);

  useEffect(() => {
    setDraft({ ...DEFAULT_EMAIL_PUSH_CONFIG, ...(config || {}) });
  }, [config]);

  const triggerPush = async (reportType: EmailDispatchLogEntry['category']) => {
    setBusyPush(true);
    try {
      const res = await adminFetch<{ ok: boolean; logEntry: EmailDispatchLogEntry }>(
        '/api/admin/email-push/send',
        'POST',
        { reportType },
      );
      if (res.logEntry.status === 'failed') {
        notify('err', `Email dispatch failed: ${res.logEntry.detail}`);
      } else {
        notify('ok', `Dispatched ${reportType.replace('_', ' ')} to ${res.logEntry.recipientEmails}`);
      }
    } catch (err) {
      notify('err', (err as Error).message);
    } finally {
      setBusyPush(false);
    }
  };

  return (
    <div className="space-y-6 pt-6 mt-6 border-t border-stone-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-600" />
            Automated Email Push Alerts &amp; Scheduled Analytics Reports
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Configure SMTP, PHP mail(), or Webhook relay to push instant Security/WAF alerts, Visitor Log Reports, and Section Feedback emails.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busyPush}
            onClick={() => triggerPush('visitor_report')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Push Visitor Logs Report Now</span>
          </button>
          <button
            type="button"
            disabled={busyPush}
            onClick={() => triggerPush('security_alert')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-700 text-white"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Push Security/WAF Report</span>
          </button>
          <button
            type="button"
            disabled={busyPush}
            onClick={() => triggerPush('test')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-slate-700"
          >
            <span>Send Test Email</span>
          </button>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await adminFetch('/api/admin/email-push/config', 'PUT', draft);
            notify('ok', 'Saved Email Push & SMTP configuration.');
          } catch (err) {
            notify('err', (err as Error).message);
          }
        }}
        className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Mail Transport Engine</label>
            <select
              value={draft.transportMode}
              onChange={(e) => setDraft({ ...draft, transportMode: e.target.value as EmailPushConfig['transportMode'] })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="php_mail">Server Local MTA / PHP mail()</option>
              <option value="smtp">Direct Authenticated SMTP Socket</option>
              <option value="webhook">HTTP Webhook Mail Relay</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">From Sender Name</label>
            <input
              type="text"
              value={draft.fromName}
              onChange={(e) => setDraft({ ...draft, fromName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">From Email Address</label>
            <input
              type="email"
              value={draft.fromEmail}
              onChange={(e) => setDraft({ ...draft, fromEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Reply-To Email</label>
            <input
              type="email"
              value={draft.replyToEmail}
              onChange={(e) => setDraft({ ...draft, replyToEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {draft.transportMode === 'smtp' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3.5 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 text-xs">
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">SMTP Host</label>
              <input
                type="text"
                value={draft.smtpHost}
                onChange={(e) => setDraft({ ...draft, smtpHost: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Port</label>
              <input
                type="number"
                value={draft.smtpPort}
                onChange={(e) => setDraft({ ...draft, smtpPort: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Security</label>
              <select
                value={draft.smtpEncryption}
                onChange={(e) => setDraft({ ...draft, smtpEncryption: e.target.value as EmailPushConfig['smtpEncryption'] })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="tls">STARTTLS (587)</option>
                <option value="ssl">SSL/TLS (465)</option>
                <option value="none">Plain (25)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">SMTP Username</label>
              <input
                type="text"
                value={draft.smtpUsername}
                onChange={(e) => setDraft({ ...draft, smtpUsername: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="md:col-span-5">
              <label className="block font-semibold mb-1">SMTP App Password / Secret (leave blank to preserve stored secret on PHP server)</label>
              <input
                type="password"
                value={draft.smtpPassword || ''}
                onChange={(e) => setDraft({ ...draft, smtpPassword: e.target.value })}
                placeholder="••••••••••••••••"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>
        )}

        {draft.transportMode === 'webhook' && (
          <div className="text-xs">
            <label className="block font-semibold mb-1">Mail Relay Webhook URL (https://...)</label>
            <input
              type="url"
              value={draft.webhookRelayUrl || ''}
              onChange={(e) => setDraft({ ...draft, webhookRelayUrl: e.target.value })}
              placeholder="https://mailer.coe.sveri.ac.in/api/push"
              className="w-full px-3 py-2 font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Security &amp; WAF Alert Recipient Emails</label>
            <input
              type="text"
              value={draft.alertRecipientEmails}
              onChange={(e) => setDraft({ ...draft, alertRecipientEmails: e.target.value })}
              className="w-full px-3 py-2 font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Visitor Log &amp; Analytics Digest Emails</label>
            <input
              type="text"
              value={draft.reportRecipientEmails}
              onChange={(e) => setDraft({ ...draft, reportRecipientEmails: e.target.value })}
              className="w-full px-3 py-2 font-mono rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-xs">
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            <span>Master Email Push Enabled</span>
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={draft.pushOnNewFeedback} onChange={(e) => setDraft({ ...draft, pushOnNewFeedback: e.target.checked })} />
            <span>Push on New Feedback / Complaint</span>
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={draft.pushOnNewGrievance} onChange={(e) => setDraft({ ...draft, pushOnNewGrievance: e.target.checked })} />
            <span>Push on New Grievance / Anti-Ragging</span>
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input type="checkbox" checked={draft.pushOnSecurityAlert} onChange={(e) => setDraft({ ...draft, pushOnSecurityAlert: e.target.checked })} />
            <span>Push on Critical WAF Attack</span>
          </label>
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={draft.enableScheduledVisitorDigest}
              onChange={(e) => setDraft({ ...draft, enableScheduledVisitorDigest: e.target.checked })}
            />
            <span>Scheduled Visitor Digest ({draft.digestFrequency})</span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            Save Email Push Configuration
          </button>
        </div>
      </form>

      {/* Email Dispatch Audit Log */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200 dark:border-slate-800 font-bold text-sm">
          Recent Email Push &amp; Report Dispatch Log ({logs.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800 text-left">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Recipients</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">Status / Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
              {logs.slice(0, 20).map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 px-4 font-mono whitespace-nowrap tabular-nums">{log.sentAt}</td>
                  <td className="py-2.5 px-4 uppercase font-semibold">{log.category}</td>
                  <td className="py-2.5 px-4 font-mono">{log.recipientEmails}</td>
                  <td className="py-2.5 px-4">{log.subject}</td>
                  <td className="py-2.5 px-4">
                    <span className={log.status === 'failed' ? 'text-rose-600 font-semibold' : 'text-emerald-700 font-semibold'}>
                      {log.status.toUpperCase()}
                    </span>{' '}
                    · {log.detail}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-stone-500">
                    No emails dispatched yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
