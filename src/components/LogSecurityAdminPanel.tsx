import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Ban,
  CheckCircle2,
  Download,
  Filter,
  Globe2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlock,
} from 'lucide-react';
import type {
  BlockedIpEntry,
  HitCounterStats,
  SecurityConfig,
  VisitorLogEntry,
  VisitorLogEventType,
  VisitorLogSeverity,
} from '../types/cms';
import type { LogAnalyticsSummary } from '../lib/securityAndSeoLogic';

interface AnalyticsResponse {
  summary: LogAnalyticsSummary;
  totalUnfiltered: number;
  filteredCount: number;
  logs: VisitorLogEntry[];
  blockedIps: BlockedIpEntry[];
  securityConfig: SecurityConfig;
  hitCounter: HitCounterStats;
  countries: string[];
  states: string[];
  areas: string[];
  posture: Array<{ id: string; label: string; ok: boolean }>;
}

interface LogSecurityAdminPanelProps {
  adminFetch: <T = unknown>(url: string, method?: string, body?: unknown) => Promise<T>;
  sessionToken: string;
  notify: (kind: 'ok' | 'err', msg: string) => void;
}

export function LogSecurityAdminPanel({
  adminFetch,
  sessionToken,
  notify,
}: LogSecurityAdminPanelProps) {
  const [subTab, setSubTab] = useState<'analyzer' | 'firewall' | 'posture'>('analyzer');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter controls
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [severity, setSeverity] = useState<VisitorLogSeverity | 'all'>('all');
  const [eventType, setEventType] = useState<VisitorLogEventType | 'all'>('all');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'all'>('all');

  // Security config draft & IP blocker inputs
  const [secDraft, setSecDraft] = useState<SecurityConfig | null>(null);
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('Suspicious activity / Brute force');
  const [manualHours, setManualHours] = useState('24');

  const buildQueryString = useCallback(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set('search', search.trim());
    if (country !== 'All') p.set('country', country);
    if (stateFilter !== 'All') p.set('state', stateFilter);
    if (areaFilter !== 'All') p.set('area', areaFilter);
    if (severity !== 'all') p.set('severity', severity);
    if (eventType !== 'all') p.set('eventType', eventType);
    if (dateRange !== 'all') p.set('dateRange', dateRange);
    return p.toString();
  }, [areaFilter, country, dateRange, eventType, search, severity, stateFilter]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const qs = buildQueryString();
      const res = await adminFetch<AnalyticsResponse>(
        `/api/admin/analytics${qs ? `?${qs}` : ''}`,
        'GET',
      );
      setData(res);
      setSecDraft(res.securityConfig);
    } catch (err) {
      notify('err', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [adminFetch, buildQueryString, notify]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExportLogs = async (format: 'csv' | 'json' | 'log') => {
    try {
      const qs = buildQueryString();
      const url = `/api/admin/analytics/export?format=${format}${qs ? `&${qs}` : ''}`;
      const headers: Record<string, string> = {};
      if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
      const resp = await fetch(url, { credentials: 'include', headers });
      if (!resp.ok) throw new Error('Failed to export visitor logs.');
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `svcoer-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      notify('ok', `Exported ${data?.filteredCount ?? 0} log entries as ${format.toUpperCase()}.`);
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secDraft) return;
    try {
      await adminFetch('/api/admin/security/config', 'PUT', secDraft);
      notify('ok', 'Hackproof Security Firewall & Rate Limit rules updated.');
      await loadAnalytics();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const handleBlockIp = async (ip: string, reason: string, hours?: string) => {
    try {
      await adminFetch('/api/admin/security/block-ip', 'POST', {
        ipAddress: ip,
        reason,
        hours: hours || '',
      });
      notify('ok', `Blocked IP ${ip} in Security Shield.`);
      setManualIp('');
      await loadAnalytics();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const handleUnblockIp = async (id: number, ip: string) => {
    try {
      await adminFetch(`/api/admin/security/block-ip/${id}`, 'DELETE');
      notify('ok', `Unblocked IP ${ip}.`);
      await loadAnalytics();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const handlePrune = async (mode: 'older_than' | 'clear_access') => {
    try {
      const res = await adminFetch<{ removedCount: number }>('/api/admin/analytics/prune', 'POST', {
        mode,
        keepDays: 30,
      });
      notify('ok', `Pruned ${res.removedCount} log records safely.`);
      await loadAnalytics();
    } catch (err) {
      notify('err', (err as Error).message);
    }
  };

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'analyzer', label: 'Log Analyzer & Geo Hits (Country / State / Area)', icon: <Activity className="w-4 h-4" /> },
            { id: 'firewall', label: `WAF Firewall & Blocked IPs (${data?.blockedIps?.length ?? 0})`, icon: <Ban className="w-4 h-4" /> },
            { id: 'posture', label: 'Hackproof Hardening Audit', icon: <ShieldCheck className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as 'analyzer' | 'firewall' | 'posture')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
                subTab === tab.id
                  ? 'text-white'
                  : 'border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-stone-700 dark:text-slate-300'
              }`}
              style={subTab === tab.id ? { backgroundColor: 'var(--primary-color)' } : undefined}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={loadAnalytics}
          className="px-3 py-2 rounded-lg border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Telemetry
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Logged Hits', val: summary?.totalHits ?? 0 },
          { label: 'Unique Visitor IPs', val: summary?.uniqueIps ?? 0 },
          { label: "Today's Events", val: summary?.todayHits ?? 0 },
          { label: 'WAF Blocked Threats', val: summary?.blockedCount ?? 0, tone: 'text-rose-700 dark:text-rose-400' },
          { label: 'Failed Logins', val: summary?.failedLoginCount ?? 0, tone: 'text-amber-700 dark:text-amber-400' },
          { label: 'Avg Response (ms)', val: `${summary?.avgLatencyMs ?? 0} ms` },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-3.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <p className="text-[11px] text-stone-500 dark:text-slate-400">{kpi.label}</p>
            <p className={`text-xl font-bold font-mono-tabular mt-1 ${kpi.tone || 'text-stone-900 dark:text-white'}`}>
              {typeof kpi.val === 'number' ? kpi.val.toLocaleString() : kpi.val}
            </p>
          </div>
        ))}
      </div>

      {subTab === 'analyzer' && (
        <>
          {/* Geographic Breakdown: Country / State / Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Hits by Country',
                icon: <Globe2 className="w-4 h-4 text-blue-600" />,
                buckets: summary?.byCountry || [],
                onSelect: (name: string) => setCountry((prev) => (prev === name ? 'All' : name)),
                activeVal: country,
              },
              {
                title: 'Hits by State / Region',
                icon: <MapPin className="w-4 h-4 text-emerald-600" />,
                buckets: summary?.byState || [],
                onSelect: (name: string) => setStateFilter((prev) => (prev === name ? 'All' : name)),
                activeVal: stateFilter,
              },
              {
                title: 'Hits by Area / City',
                icon: <MapPin className="w-4 h-4 text-amber-600" />,
                buckets: summary?.byArea || [],
                onSelect: (name: string) => setAreaFilter((prev) => (prev === name ? 'All' : name)),
                activeVal: areaFilter,
              },
            ].map((panel) => (
              <div
                key={panel.title}
                className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    {panel.icon}
                    {panel.title}
                  </h3>
                  {panel.activeVal !== 'All' && (
                    <button
                      type="button"
                      onClick={() => panel.onSelect(panel.activeVal)}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {panel.buckets.length === 0 && (
                    <p className="text-xs text-stone-500">No hits in selected filter range.</p>
                  )}
                  {panel.buckets.map((b) => {
                    const isSelected = panel.activeVal === b.name;
                    return (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => panel.onSelect(b.name)}
                        className={`w-full text-left p-2 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40'
                            : 'border-stone-100 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-900 dark:text-white truncate pr-2">
                            {b.name}
                          </span>
                          <span className="font-mono-tabular font-bold text-stone-800 dark:text-slate-200 shrink-0">
                            {b.hits.toLocaleString()} ({b.sharePct}%)
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(4, b.sharePct))}%`,
                              backgroundColor: b.blockedHits > 0 ? '#dc2626' : 'var(--primary-color)',
                            }}
                          />
                        </div>
                        {(b.subLabel || b.blockedHits > 0) && (
                          <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400">
                            <span className="truncate">{b.subLabel}</span>
                            {b.blockedHits > 0 && (
                              <span className="font-semibold text-rose-700 dark:text-rose-400 shrink-0 tabular-nums">
                                {b.blockedHits} blocked
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Top Paths / Device / Browser / HTTP Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">Top Requested Paths</h4>
              <div className="space-y-1.5 text-xs">
                {(summary?.byPath || []).slice(0, 6).map((p) => (
                  <div key={p.path} className="flex justify-between gap-2">
                    <span className="font-mono truncate text-stone-700 dark:text-slate-300">{p.path}</span>
                    <span className="font-mono-tabular font-bold shrink-0">{p.hits}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">Devices</h4>
              <div className="space-y-1.5 text-xs">
                {(summary?.byDevice || []).map((d) => (
                  <div key={d.deviceType} className="flex justify-between">
                    <span className="font-medium text-stone-700 dark:text-slate-300">{d.deviceType}</span>
                    <span className="font-mono-tabular font-bold">{d.hits}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">Browsers &amp; Agents</h4>
              <div className="space-y-1.5 text-xs">
                {(summary?.byBrowser || []).slice(0, 6).map((b) => (
                  <div key={b.browser} className="flex justify-between">
                    <span className="font-medium text-stone-700 dark:text-slate-300">{b.browser}</span>
                    <span className="font-mono-tabular font-bold">{b.hits}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2.5">HTTP Response Codes</h4>
              <div className="space-y-1.5 text-xs">
                {(summary?.byStatus || []).map((s) => (
                  <div key={s.statusCode} className="flex justify-between">
                    <span className="font-mono font-semibold text-stone-700 dark:text-slate-300">
                      HTTP {s.statusCode}
                    </span>
                    <span className="font-mono-tabular font-bold">{s.hits}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filter & Export Bar */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-600" />
                Log Explorer, Multi-Facet Filters &amp; Export ({data?.filteredCount ?? 0} of {data?.totalUnfiltered ?? 0})
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportLogs('csv')}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExportLogs('json')}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => handleExportLogs('log')}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5" /> Export .LOG
                </button>
                <button
                  type="button"
                  onClick={() => handlePrune('clear_access')}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Access Info Logs
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 text-xs">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search IP, path, threat, email..."
                className="lg:col-span-2 px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as 'today' | '7d' | '30d' | 'all')}
                className="px-2.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="px-2.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Countries</option>
                {(data?.countries || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="px-2.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All States</option>
                {(data?.states || []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="px-2.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="All">All Areas / Cities</option>
                {(data?.areas || []).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as VisitorLogEventType | 'all')}
                className="px-2.5 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Events ({severity === 'all' ? 'All Severities' : severity})</option>
                <option value="page_view">Page Views</option>
                <option value="security_block">WAF Security Blocks</option>
                <option value="failed_login">Failed Logins</option>
                <option value="rate_limit">Rate Limits</option>
                <option value="admin_login">Admin Logins</option>
                <option value="alumni_login">Alumni Logins</option>
                <option value="api_error">API Errors (4xx/5xx)</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
              <span className="font-semibold text-stone-500">Severity:</span>
              {(['all', 'info', 'warning', 'critical'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`px-2.5 py-1 rounded border font-semibold capitalize ${
                    severity === sev
                      ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                      : 'border-stone-200 dark:border-slate-700 text-stone-600 dark:text-slate-300'
                  }`}
                >
                  {sev}
                </button>
              ))}
              {(search || country !== 'All' || stateFilter !== 'All' || areaFilter !== 'All' || severity !== 'all' || eventType !== 'all' || dateRange !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCountry('All');
                    setStateFilter('All');
                    setAreaFilter('All');
                    setSeverity('all');
                    setEventType('all');
                    setDateRange('all');
                  }}
                  className="ml-auto text-xs font-semibold text-blue-600 hover:underline"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          </div>

          {/* Log Table */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800 text-left">
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">IP &amp; Location (Country / State / Area)</th>
                    <th className="py-2.5 px-3">Method &amp; Path</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Security / Event</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-slate-800">
                  {(data?.logs || []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-stone-500">
                        No log records match your selected criteria.
                      </td>
                    </tr>
                  )}
                  {(data?.logs || []).map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono-tabular whitespace-nowrap text-stone-600 dark:text-slate-400">
                        {log.timestamp}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-mono font-semibold text-stone-900 dark:text-white">{log.ipAddress}</p>
                        <p className="text-[11px] text-stone-500 dark:text-slate-400">
                          {log.country} · {log.state} · {log.area}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 max-w-[280px]">
                        <p className="font-mono truncate text-stone-800 dark:text-slate-200" title={log.path}>
                          <span className="font-bold mr-1">{log.method}</span>
                          {log.path}
                        </p>
                        {log.actorEmail && (
                          <p className="text-[11px] text-stone-500">Actor: {log.actorEmail}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            log.statusCode >= 400 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {log.statusCode}
                        </span>
                        <span className="text-stone-400 ml-1.5">{log.responseTimeMs}ms</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-stone-600 dark:text-slate-400">
                        {log.deviceType} · {log.browser} ({log.os})
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-semibold ${
                            log.severity === 'critical'
                              ? 'text-rose-700 dark:text-rose-400'
                              : log.severity === 'warning'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-stone-700 dark:text-slate-300'
                          }`}
                        >
                          {log.eventType}
                        </span>
                        {log.threatCategory && (
                          <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                            {log.threatCategory}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleBlockIp(
                              log.ipAddress,
                              log.threatCategory || `Blocked from Log Analyzer (${log.path})`,
                              '24',
                            )
                          }
                          className="px-2 py-1 rounded border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold"
                        >
                          Block IP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {subTab === 'firewall' && secDraft && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveSecurity}
            className="xl:col-span-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Active Web Application Firewall (WAF) &amp; Rate-Limiting Policy
            </h3>

            <div className="space-y-2.5 text-sm">
              {[
                { key: 'wafEnabled', label: 'Enable Real-Time WAF Inspection (SQLi, XSS, Path Traversal, Cmd Injection)' },
                { key: 'rateLimitEnabled', label: 'Enable API Sliding-Window Rate Limiter' },
                { key: 'autoBlockAttackers', label: 'Automatically Ban Attacker IPs on Critical Exploits (60-Min Quarantine)' },
                { key: 'blockScannerProbes', label: 'Block Vulnerability Scanners (sqlmap, nikto, .env, wp-login probes)' },
                { key: 'maskExportedIps', label: 'Mask Last Octet of IPv4 Addresses in CSV Log Exports (Privacy Mode)' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-2.5 text-xs sm:text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(secDraft[item.key as keyof SecurityConfig])}
                    onChange={(e) =>
                      setSecDraft((prev) => (prev ? { ...prev, [item.key]: e.target.checked } : prev))
                    }
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Max API Req / Min</label>
                <input
                  type="number"
                  min={20}
                  max={2000}
                  value={secDraft.maxRequestsPerMinute}
                  onChange={(e) =>
                    setSecDraft((prev) =>
                      prev ? { ...prev, maxRequestsPerMinute: Number(e.target.value || 120) } : prev,
                    )
                  }
                  className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Max Failed Logins</label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={secDraft.maxFailedLogins}
                  onChange={(e) =>
                    setSecDraft((prev) =>
                      prev ? { ...prev, maxFailedLogins: Number(e.target.value || 5) } : prev,
                    )
                  }
                  className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Lockout Duration (Mins)</label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={secDraft.lockoutMinutes}
                  onChange={(e) =>
                    setSecDraft((prev) =>
                      prev ? { ...prev, lockoutMinutes: Number(e.target.value || 15) } : prev,
                    )
                  }
                  className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Save Firewall &amp; Brute-Force Policies
            </button>
          </form>

          <div className="xl:col-span-6 space-y-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!manualIp.trim()) return;
                handleBlockIp(manualIp.trim(), manualReason.trim(), manualHours.trim());
              }}
              className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                Manually Block IP Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <input
                  type="text"
                  required
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="e.g. 203.0.113.45"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Reason"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={0}
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  placeholder="Hours (blank=perm)"
                  className="px-3 py-2 rounded-lg border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-700 text-white hover:bg-rose-800"
              >
                Add IP to Active Blocklist
              </button>
            </form>

            <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-200 dark:border-slate-800 font-bold text-sm">
                Active Blocked IP Addresses ({data?.blockedIps?.length ?? 0})
              </div>
              <div className="divide-y divide-stone-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {(data?.blockedIps || []).length === 0 && (
                  <p className="p-5 text-xs text-stone-500">No IPs are currently blocked.</p>
                )}
                {(data?.blockedIps || []).map((b) => (
                  <div key={b.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-mono font-bold text-rose-700 dark:text-rose-400">
                        {b.ipAddress}{' '}
                        <span className="text-stone-500 font-normal">
                          · Blocked by {b.blockedBy} · {b.hitCount} hits dropped
                        </span>
                      </p>
                      <p className="text-stone-600 dark:text-slate-400 mt-0.5">{b.reason}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Created: {b.createdAt} · Expires: {b.expiresAt || 'Permanent'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblockIp(b.id, b.ipAddress)}
                      className="px-2.5 py-1.5 rounded border border-stone-300 dark:border-slate-700 font-semibold inline-flex items-center gap-1 hover:bg-stone-50 dark:hover:bg-slate-800 shrink-0"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'posture' && (
        <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">
                Hackproof Server &amp; Application Defense Posture
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Real-time cryptographic, transport, firewall, and file-system security controls verified on startup.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(data?.posture || []).map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-stone-200 dark:border-slate-800 flex items-start gap-2.5 text-xs"
              >
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 mt-0.5 ${item.ok ? 'text-emerald-600' : 'text-amber-600'}`}
                />
                <div>
                  <p className="font-semibold text-stone-900 dark:text-white">{item.label}</p>
                  <p className="text-stone-500 mt-0.5">{item.ok ? 'Enforced & Active' : 'Disabled in Shield Policy'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
