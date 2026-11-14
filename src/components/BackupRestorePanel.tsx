import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  Clock,
  Download,
  FileUp,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Send,
  Server,
  Trash2,
} from 'lucide-react';
import { defaultBackupSchedule, validateBackupPackage } from '../lib/backupLogic';
import { formatBytes } from '../lib/cmsLogic';
import type {
  BackupDestination,
  BackupFrequency,
  BackupMode,
  BackupRecord,
  BackupScheduleConfig,
} from '../types/cms';

interface BackupRestorePanelProps {
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  sessionToken: string | null;
  notify: (type: 'ok' | 'err', text: string) => void;
  onRestored: () => Promise<void>;
}

export function BackupRestorePanel({
  adminFetch,
  sessionToken,
  notify,
  onRestored,
}: BackupRestorePanelProps) {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [schedule, setSchedule] = useState<BackupScheduleConfig>(defaultBackupSchedule());
  const [uploadsCount, setUploadsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(false);

  const [createMode, setCreateMode] = useState<BackupMode>('full');
  const [createDest, setCreateDest] = useState<BackupDestination>('local');
  const [createNotes, setCreateNotes] = useState('');

  // Import & Restore state
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restorePayload, setRestorePayload] = useState<unknown>(null);
  const [restorePreview, setRestorePreview] = useState<{
    mode: string;
    createdAt: string;
    counts: Record<string, number>;
  } | null>(null);
  const [confirmRestoreServerId, setConfirmRestoreServerId] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<{
        backups: BackupRecord[];
        schedule: BackupScheduleConfig;
        uploadsInventory: { filename: string }[];
      }>('/api/admin/backups');
      setBackups(data.backups || []);
      setSchedule({
        ...defaultBackupSchedule(),
        ...(data.schedule || {}),
        scpConfig: {
          ...defaultBackupSchedule().scpConfig!,
          ...(data.schedule?.scpConfig || {}),
        },
      });
      setUploadsCount((data.uploadsInventory || []).length);
    } catch (err) {
      notify('err', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, notify]);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const downloadAuthenticatedFile = async (url: string, fallbackName: string) => {
    try {
      const headers: Record<string, string> = {};
      if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
      const resp = await fetch(url, { credentials: 'include', headers });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Download failed');
      }
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objUrl;
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objUrl);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        const check = validateBackupPackage(parsed);
        if (!check.valid || !check.pkg) {
          setRestorePayload(null);
          setRestorePreview(null);
          notify('err', check.reason || 'Invalid backup file format.');
          return;
        }
        setRestorePayload(parsed);
        setRestorePreview({
          mode: check.pkg.mode,
          createdAt: check.pkg.createdAt,
          counts: check.entityCounts || {},
        });
        notify('ok', `Validated "${file.name}" (${check.pkg.mode.toUpperCase()} archive). Ready to restore.`);
      } catch {
        setRestorePayload(null);
        setRestorePreview(null);
        notify('err', 'Could not parse JSON from uploaded backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreUploaded = async () => {
    if (!restorePayload) return;
    setBusyAction(true);
    try {
      const res = await adminFetch<{ restoredMode: string; safetyFilename: string }>(
        '/api/admin/backups/restore',
        'POST',
        { packageData: restorePayload },
      );
      setRestorePayload(null);
      setRestorePreview(null);
      setRestoreFileName('');
      await loadBackups();
      await onRestored();
      notify('ok', `Restored ${res.restoredMode} archive! Safety backup saved as ${res.safetyFilename}.`);
    } catch (err) {
      notify('err', (err as Error).message);
    } finally {
      setBusyAction(false);
    }
  };

  const handleRestoreServerBackup = async (backupId: string) => {
    setBusyAction(true);
    try {
      const res = await adminFetch<{ restoredMode: string; safetyFilename: string }>(
        '/api/admin/backups/restore',
        'POST',
        { backupId },
      );
      setConfirmRestoreServerId(null);
      await loadBackups();
      await onRestored();
      notify('ok', `Restored server snapshot (${res.restoredMode}). Pre-restore safety snapshot: ${res.safetyFilename}.`);
    } catch (err) {
      notify('err', (err as Error).message);
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Row: Create Full / Incremental Backup + Instant Export */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusyAction(true);
            try {
              const rec = await adminFetch<BackupRecord>('/api/admin/backups/create', 'POST', {
                mode: createMode,
                destination: createDest,
                notes: createNotes,
              });
              setCreateNotes('');
              await loadBackups();
              notify(
                'ok',
                `${rec.mode.toUpperCase()} backup created (${rec.filename})${rec.remoteStatus ? ` · ${rec.remoteStatus}` : ''}`,
              );
            } catch (err) {
              notify('err', (err as Error).message);
            } finally {
              setBusyAction(false);
            }
          }}
          className="lg:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Archive className="w-4 h-4 text-amber-600" />
                <span>Create Backup &amp; Incremental Snapshot</span>
              </h2>
              <p className="text-xs text-stone-500">
                Includes all CMS pages, departments, leadership, RBAC users, settings &amp; {uploadsCount} uploaded media files manifest.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Backup Type</label>
              <select
                value={createMode}
                onChange={(e) => setCreateMode(e.target.value as BackupMode)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="full">Full Website Backup (Complete)</option>
                <option value="incremental">Incremental Backup (Changed Data Only)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Transfer Destination</label>
              <select
                value={createDest}
                onChange={(e) => setCreateDest(e.target.value as BackupDestination)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="local">Local Server Storage + Disk Download</option>
                <option value="scp">Push via SCP / SSH to Remote Server</option>
                <option value="webhook">Push to Google Drive Script / Webhook URL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Backup Label / Notes (Optional)</label>
            <input
              type="text"
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
              placeholder="e.g. Before AY 2026-27 syllabus update"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="submit"
              disabled={busyAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>{busyAction ? 'Creating...' : `Create ${createMode === 'incremental' ? 'Incremental' : 'Full'} Backup`}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadAuthenticatedFile(
                  '/api/admin/export',
                  `svcoer-export-${new Date().toISOString().slice(0, 10)}.json`,
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Complete JSON to Disk</span>
            </button>
          </div>
        </form>

        {/* Import & Disaster Recovery Restore */}
        <div className="lg:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Import &amp; Restore Corrupted Website</span>
            </h2>
            <p className="text-xs text-stone-500">
              Upload any previously exported or downloaded <code>.json</code> full or incremental backup file. An automatic pre-restore safety backup is created before applying changes.
            </p>
          </div>

          <label className="block p-4 rounded-lg border-2 border-dashed border-stone-300 dark:border-slate-700 bg-stone-50/60 dark:bg-slate-800/40 cursor-pointer hover:border-amber-500 transition-colors">
            <div className="flex items-center gap-3">
              <FileUp className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-800 dark:text-slate-100 truncate">
                  {restoreFileName || 'Choose .json backup package from local computer...'}
                </p>
                <p className="text-[11px] text-stone-500">Supports full snapshots &amp; incremental diff packages</p>
              </div>
            </div>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportFileChange}
              className="sr-only"
            />
          </label>

          {restorePreview && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Verified {restorePreview.mode} Archive
                </span>
                <span className="text-stone-600 dark:text-slate-300 tabular-nums">
                  {restorePreview.createdAt.slice(0, 19).replace('T', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {Object.entries(restorePreview.counts).map(([key, count]) => (
                  <span
                    key={key}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 font-mono-tabular"
                  >
                    {key}: {count}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={handleRestoreUploaded}
                  className="px-3.5 py-1.5 rounded text-xs font-semibold bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-50"
                >
                  Confirm &amp; Restore Website Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRestorePayload(null);
                    setRestorePreview(null);
                    setRestoreFileName('');
                  }}
                  className="px-3 py-1.5 rounded text-xs border border-stone-300 dark:border-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automatic Scheduled Backup & Remote Destinations (SCP / Google Drive Webhook) */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusyAction(true);
          try {
            const saved = await adminFetch<BackupScheduleConfig>(
              '/api/admin/backups/schedule',
              'PUT',
              schedule,
            );
            setSchedule(saved);
            notify('ok', 'Automatic scheduled backup & export configuration saved.');
          } catch (err) {
            notify('err', (err as Error).message);
          } finally {
            setBusyAction(false);
          }
        }}
        className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Automatic Scheduled Backup, Auto-Export &amp; Remote Offsite Targets</span>
            </h2>
            <p className="text-xs text-stone-500">
              Schedule recurring backups to local disk, remote Linux server via SCP, or Google Drive via Apps Script webhook.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={schedule.enabled}
              onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })}
            />
            <span>Enable Automatic Scheduler</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1">Schedule Frequency</label>
            <select
              value={schedule.frequency}
              onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value as BackupFrequency })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="hourly">Every Hour</option>
              <option value="daily">Daily (Every 24 Hours)</option>
              <option value="weekly">Weekly (Every 7 Days)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Snapshot Strategy</label>
            <select
              value={schedule.mode}
              onChange={(e) => setSchedule({ ...schedule, mode: e.target.value as BackupMode })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="incremental">Incremental (Space-Saving Diff)</option>
              <option value="full">Full Snapshot</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Automatic Destination</label>
            <select
              value={schedule.destination}
              onChange={(e) => setSchedule({ ...schedule, destination: e.target.value as BackupDestination })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="local">Local Server Archive</option>
              <option value="scp">SCP Remote Linux Server</option>
              <option value="webhook">Google Drive Apps Script / Webhook</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Retention Count (Keep Last N)</label>
            <input
              type="number"
              min={3}
              max={100}
              value={schedule.retentionCount ?? 14}
              onChange={(e) => setSchedule({ ...schedule, retentionCount: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* SCP Configuration & Google Drive Webhook Config */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 space-y-2.5">
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-amber-600" />
              <span>Remote Server SCP / SSH Settings</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={schedule.scpConfig?.host ?? ''}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    scpConfig: { ...(schedule.scpConfig || { host: '', port: 22, username: '', remoteDir: '' }), host: e.target.value },
                  })
                }
                placeholder="Host / IP (backup.sveri.ac.in)"
                className="col-span-2 px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="number"
                min={1}
                max={65535}
                value={schedule.scpConfig?.port ?? 22}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    scpConfig: { ...(schedule.scpConfig || { host: '', port: 22, username: '', remoteDir: '' }), port: Number(e.target.value) },
                  })
                }
                placeholder="Port 22"
                className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={schedule.scpConfig?.username ?? ''}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    scpConfig: { ...(schedule.scpConfig || { host: '', port: 22, username: '', remoteDir: '' }), username: e.target.value },
                  })
                }
                placeholder="SSH Username (e.g. backupuser)"
                className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="text"
                value={schedule.scpConfig?.remoteDir ?? ''}
                onChange={(e) =>
                  setSchedule({
                    ...schedule,
                    scpConfig: { ...(schedule.scpConfig || { host: '', port: 22, username: '', remoteDir: '' }), remoteDir: e.target.value },
                  })
                }
                placeholder="Remote Path (/var/backups/svcoer)"
                className="px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
            <input
              type="text"
              value={schedule.scpConfig?.keyPath ?? ''}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  scpConfig: { ...(schedule.scpConfig || { host: '', port: 22, username: '', remoteDir: '' }), keyPath: e.target.value },
                })
              }
              placeholder="Optional SSH Private Key Path on Server (e.g. /root/.ssh/id_ed25519)"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-800/40 space-y-2.5">
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-amber-600" />
              <span>Google Drive (Apps Script) / Cloud Webhook Endpoint</span>
            </h3>
            <input
              type="url"
              value={schedule.webhookUrl ?? ''}
              onChange={(e) => setSchedule({ ...schedule, webhookUrl: e.target.value })}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
              Deploy a tiny Google Apps Script Web App (`doPost(e) &#123; DriveApp.getFolderById(...).createFile(...); &#125;`) or any S3/Nextcloud webhook URL here to receive automated backup JSON pushes directly into Google Drive.
            </p>
            <div className="flex flex-wrap gap-3 text-[11px] text-stone-600 dark:text-slate-300 pt-1">
              <span>Last Run: <strong>{schedule.lastRunAt ? schedule.lastRunAt.slice(0, 19).replace('T', ' ') : 'Never'}</strong></span>
              <span>Next Run: <strong>{schedule.enabled && schedule.nextRunAt ? schedule.nextRunAt.slice(0, 19).replace('T', ' ') : 'Paused'}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-stone-500 dark:text-slate-400 truncate">
            {schedule.lastStatus ? `Status: ${schedule.lastStatus}` : 'Configure schedule & click Save Schedule.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyAction}
              onClick={async () => {
                setBusyAction(true);
                try {
                  const res = await adminFetch<{ record: BackupRecord; schedule: BackupScheduleConfig }>(
                    '/api/admin/backups/run-scheduled-now',
                    'POST',
                  );
                  setSchedule(res.schedule);
                  await loadBackups();
                  notify('ok', `Scheduled backup ran: ${res.record.filename}`);
                } catch (err) {
                  notify('err', (err as Error).message);
                } finally {
                  setBusyAction(false);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run Scheduled Backup Now</span>
            </button>
            <button
              type="submit"
              disabled={busyAction}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Save Schedule &amp; Remote Config
            </button>
          </div>
        </div>
      </form>

      {/* Saved Backup Snapshots History */}
      <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Saved Backup Archives ({backups.length})</h3>
          <button
            type="button"
            onClick={loadBackups}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border border-stone-200 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-stone-500 py-4">Loading backup history...</p>
        ) : backups.length === 0 ? (
          <p className="text-xs text-stone-500 py-4">
            No backups recorded yet. Click <strong>Create Full Backup</strong> above to create your baseline snapshot.
          </p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-slate-800">
            {backups.map((bk) => (
              <div key={bk.id} className="py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        bk.mode === 'full'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {bk.mode}
                    </span>
                    <span className="font-semibold text-sm text-stone-900 dark:text-white truncate">
                      {bk.filename}
                    </span>
                    <span className="text-stone-500 tabular-nums">{formatBytes(bk.sizeBytes)}</span>
                    <span className="font-mono-tabular text-[10px] text-stone-400">
                      SHA256: {bk.sha256.slice(0, 12)}…
                    </span>
                  </div>
                  <p className="text-stone-500 dark:text-slate-400">
                    {bk.createdAt.slice(0, 19).replace('T', ' ')} · By {bk.createdBy}
                    {bk.notes ? ` · ${bk.notes}` : ''}
                    {bk.changedKeys && bk.changedKeys.length > 0 ? ` · Changed: ${bk.changedKeys.join(', ')}` : ''}
                  </p>
                  {bk.remoteStatus && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Remote: {bk.remoteStatus}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      downloadAuthenticatedFile(`/api/admin/backups/${bk.id}/download`, bk.filename)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 font-semibold"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={async () => {
                      setBusyAction(true);
                      try {
                        const res = await adminFetch<{ message: string }>(
                          `/api/admin/backups/${bk.id}/transfer-scp`,
                          'POST',
                          { scpConfig: schedule.scpConfig },
                        );
                        await loadBackups();
                        notify('ok', res.message);
                      } catch (err) {
                        await loadBackups();
                        notify('err', (err as Error).message);
                      } finally {
                        setBusyAction(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800"
                    title="Send to Remote Linux Server via SCP"
                  >
                    Push SCP
                  </button>
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={async () => {
                      setBusyAction(true);
                      try {
                        const res = await adminFetch<{ message: string }>(
                          `/api/admin/backups/${bk.id}/push-webhook`,
                          'POST',
                          { webhookUrl: schedule.webhookUrl },
                        );
                        await loadBackups();
                        notify('ok', res.message);
                      } catch (err) {
                        await loadBackups();
                        notify('err', (err as Error).message);
                      } finally {
                        setBusyAction(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded border border-stone-300 dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800"
                    title="Send to Google Drive Apps Script / Webhook"
                  >
                    Push Drive/Hook
                  </button>
                  {confirmRestoreServerId === bk.id ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        disabled={busyAction}
                        onClick={() => handleRestoreServerBackup(bk.id)}
                        className="px-2.5 py-1 rounded bg-rose-700 text-white font-semibold"
                      >
                        Confirm Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreServerId(null)}
                        className="px-2 py-1 rounded border border-stone-300 dark:border-slate-700"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreServerId(bk.id)}
                      className="px-2.5 py-1 rounded border border-amber-400 text-amber-800 dark:text-amber-300 font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      Restore
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Delete backup ${bk.filename}`}
                    onClick={() =>
                      adminFetch(`/api/admin/backups/${bk.id}`, 'DELETE').then(() => {
                        loadBackups();
                        notify('ok', `Deleted archive ${bk.filename}`);
                      })
                    }
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
