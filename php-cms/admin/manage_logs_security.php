<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('analytics');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$filters = [
    'search'     => trim((string)($_GET['search'] ?? '')),
    'dateRange'  => trim((string)($_GET['dateRange'] ?? 'all')),
    'country'    => trim((string)($_GET['country'] ?? 'all')),
    'state'      => trim((string)($_GET['state'] ?? 'all')),
    'area'       => trim((string)($_GET['area'] ?? 'all')),
    'severity'   => trim((string)($_GET['severity'] ?? 'all')),
    'event_type' => trim((string)($_GET['event_type'] ?? 'all')),
];

if (!empty($_GET['export'])) {
    $expFmt = strtolower(trim((string)$_GET['export']));
    $maskIps = !empty($_GET['maskIps']);
    $expLogs = queryFilteredVisitorLogs($pdo, $filters, 2000);
    logAudit($pdo, $user, 'EXPORT_SECURITY_LOGS', 'Analytics', strtoupper($expFmt) . ($maskIps ? ' (Masked IPs)' : ''));
    streamPhpLogsExport($expLogs, $expFmt, $maskIps);
}

$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'save_security_config') {
        $next = [
            'enableWaf'             => isset($_POST['enable_waf']),
            'enableRateLimit'       => isset($_POST['enable_rate_limit']),
            'maxRequestsPerMinute'  => (int)($_POST['max_requests_per_minute'] ?? 180),
            'maxFailedLogins'       => (int)($_POST['max_failed_logins'] ?? 6),
            'lockoutMinutes'        => (int)($_POST['lockout_minutes'] ?? 15),
            'autoBlockOnHighThreat' => isset($_POST['auto_block_on_high_threat']),
            'blockKnownScanners'    => isset($_POST['block_known_scanners']),
            'logRetentionDays'      => (int)($_POST['log_retention_days'] ?? 90),
        ];
        saveSecurityConfig($pdo, $next);
        logAudit($pdo, $user, 'UPDATE_SECURITY_CONFIG', 'WAF Shield', 'Updated Firewall & Rate Limits');
        $msg = 'Security firewall, rate limiting & brute-force lockout policy updated.';
    } elseif ($action === 'block_ip') {
        $ip = normalizePhpClientIp((string)($_POST['ip_address'] ?? ''));
        $reason = trim((string)($_POST['reason'] ?? 'Blocked by Security Administrator')) ?: 'Blocked by Security Administrator';
        $mins = (int)($_POST['duration_minutes'] ?? 0);
        if ($ip === '127.0.0.1') {
            $err = 'Loopback IP (127.0.0.1) cannot be blocked to prevent local admin lockout.';
        } else {
            blockPhpIp($pdo, $ip, $reason, (string)$user['email'], $mins > 0 ? $mins : null);
            logAudit($pdo, $user, 'BLOCK_IP', 'Security', $ip . ' — ' . $reason);
            $msg = 'IP ' . $ip . ' added to active WAF blocklist.';
        }
    } elseif ($action === 'unblock_ip' && !empty($_POST['block_id'])) {
        $delId = (int)$_POST['block_id'];
        $pdo->prepare('DELETE FROM security_blocked_ips WHERE id = ?')->execute([$delId]);
        logAudit($pdo, $user, 'UNBLOCK_IP', 'Security', 'Block ID #' . $delId);
        $msg = 'Removed IP restriction from firewall blocklist.';
    } elseif ($action === 'prune_logs') {
        $mode = trim((string)($_POST['prune_mode'] ?? 'retention'));
        if ($mode === 'all') {
            $pdo->exec('DELETE FROM visitor_logs');
            logAudit($pdo, $user, 'CLEAR_ALL_LOGS', 'Analytics', 'Cleared visitor_logs');
            $msg = 'All visitor & security logs cleared cleanly.';
        } else {
            $cfg = getSecurityConfig($pdo);
            $cutoff = gmdate('c', time() - ((int)$cfg['logRetentionDays'] * 86400));
            $st = $pdo->prepare('DELETE FROM visitor_logs WHERE timestamp_iso < ?');
            $st->execute([$cutoff]);
            logAudit($pdo, $user, 'PRUNE_LOGS', 'Analytics', 'Pruned > ' . $cfg['logRetentionDays'] . ' days');
            $msg = 'Pruned logs older than ' . (int)$cfg['logRetentionDays'] . ' days.';
        }
    }
}

$secCfg = getSecurityConfig($pdo);
$hitStats = getHitCounterStats($pdo);
$logs = queryFilteredVisitorLogs($pdo, $filters, 300);
$summary = aggregatePhpVisitorLogs($logs);
$blockedIps = $pdo->query('SELECT * FROM security_blocked_ips ORDER BY id DESC')->fetchAll();

// Build distinct dropdown lists from all logs cleanly
$allGeoRows = $pdo->query('SELECT DISTINCT country, state, area FROM visitor_logs')->fetchAll();
$countryList = [];
$stateList = [];
$areaList = [];
foreach ($allGeoRows as $gr) {
    if (!empty($gr['country'])) $countryList[(string)$gr['country']] = true;
    if (!empty($gr['state'])) $stateList[(string)$gr['state']] = true;
    if (!empty($gr['area'])) $areaList[(string)$gr['area']] = true;
}
ksort($countryList);
ksort($stateList);
ksort($areaList);

$buildFilterLink = static function (array $overrides) use ($filters): string {
    $merged = array_merge($filters, $overrides);
    return '?' . http_build_query($merged);
};

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
$setupExists = file_exists(__DIR__ . '/../setup.php');

$adminPageTitle = 'Log Analyzer, GeoIP & Hackproof Security Shield';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="grid-4" style="margin-bottom:1.25rem;">
  <div class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Total Website Visits</small>
    <p class="admin-stat-num" style="font-variant-numeric:tabular-nums;"><?= number_format((int)$hitStats['totalHits']) ?></p>
    <small style="color:#57534E;">Today: <?= number_format((int)$hitStats['todayHits']) ?> &middot; Unique: <?= number_format((int)$hitStats['uniqueVisitors']) ?></small>
  </div>
  <div class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Matched Log Events</small>
    <p class="admin-stat-num" style="font-variant-numeric:tabular-nums;"><?= number_format((int)$summary['totalMatched']) ?></p>
    <small style="color:#57534E;">Unique IPs: <?= number_format((int)$summary['uniqueIps']) ?> &middot; Avg <?= (int)$summary['avgLatencyMs'] ?>ms</small>
  </div>
  <div class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Threats &amp; Anomalies Intercepted</small>
    <p class="admin-stat-num" style="font-variant-numeric:tabular-nums;color:<?= $summary['criticals'] > 0 ? '#B91C1C' : '#047857' ?>;"><?= number_format((int)$summary['threats']) ?></p>
    <small style="color:#57534E;"><?= number_format((int)$summary['criticals']) ?> Critical WAF / Brute-Force</small>
  </div>
  <div class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Active Firewall Blocklist</small>
    <p class="admin-stat-num" style="font-variant-numeric:tabular-nums;"><?= count($blockedIps) ?></p>
    <small style="color:<?= !empty($secCfg['enableWaf']) ? '#047857' : '#B91C1C' ?>;font-weight:600;">
      WAF Shield: <?= !empty($secCfg['enableWaf']) ? 'ACTIVE' : 'PAUSED' ?>
    </small>
  </div>
</div>

<!-- Geo Breakdowns: Hits by Country, State & Area -->
<div class="grid-3" style="gap:1rem;margin-bottom:1.25rem;">
  <div class="card">
    <h3 style="margin-top:0;">Hits Based on Country</h3>
    <table class="data-table">
      <thead><tr><th>Country</th><th style="text-align:right;">Hits</th><th style="text-align:right;">Threats</th></tr></thead>
      <tbody>
        <?php foreach (array_slice($summary['byCountry'], 0, 8) as $cRow): ?>
          <tr>
            <td>
              <a href="<?= e($buildFilterLink(['country' => $cRow['country'], 'state' => 'all', 'area' => 'all'])) ?>" style="font-weight:600;color:var(--primary-color);text-decoration:none;">
                <?= e($cRow['country']) ?> (<?= e($cRow['countryCode']) ?>)
              </a>
            </td>
            <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:700;"><?= number_format((int)$cRow['hits']) ?></td>
            <td style="text-align:right;font-variant-numeric:tabular-nums;color:<?= $cRow['threats'] > 0 ? '#B91C1C' : '#78716C' ?>;"><?= (int)$cRow['threats'] ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h3 style="margin-top:0;">Hits Based on State / Region</h3>
    <table class="data-table">
      <thead><tr><th>State / Region</th><th style="text-align:right;">Hits</th><th style="text-align:right;">Threats</th></tr></thead>
      <tbody>
        <?php foreach (array_slice($summary['byState'], 0, 8) as $sRow): ?>
          <tr>
            <td>
              <a href="<?= e($buildFilterLink(['country' => $sRow['country'], 'state' => $sRow['state'], 'area' => 'all'])) ?>" style="font-weight:600;color:var(--primary-color);text-decoration:none;">
                <?= e($sRow['state']) ?>
              </a>
              <small style="color:#78716C;display:block;"><?= e($sRow['country']) ?></small>
            </td>
            <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:700;"><?= number_format((int)$sRow['hits']) ?></td>
            <td style="text-align:right;font-variant-numeric:tabular-nums;color:<?= $sRow['threats'] > 0 ? '#B91C1C' : '#78716C' ?>;"><?= (int)$sRow['threats'] ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h3 style="margin-top:0;">Hits Based on Area / City</h3>
    <table class="data-table">
      <thead><tr><th>Area / City</th><th style="text-align:right;">Hits</th><th style="text-align:right;">Threats</th></tr></thead>
      <tbody>
        <?php foreach (array_slice($summary['byArea'], 0, 8) as $aRow): ?>
          <tr>
            <td>
              <a href="<?= e($buildFilterLink(['country' => $aRow['country'], 'state' => $aRow['state'], 'area' => $aRow['area']])) ?>" style="font-weight:600;color:var(--primary-color);text-decoration:none;">
                <?= e($aRow['area']) ?>
              </a>
              <small style="color:#78716C;display:block;"><?= e($aRow['state']) ?>, <?= e($aRow['country']) ?></small>
            </td>
            <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:700;"><?= number_format((int)$aRow['hits']) ?></td>
            <td style="text-align:right;font-variant-numeric:tabular-nums;color:<?= $aRow['threats'] > 0 ? '#B91C1C' : '#78716C' ?>;"><?= (int)$aRow['threats'] ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Top Paths & Client Device/Browser/Status Breakdown -->
<div class="grid-3" style="gap:1rem;margin-bottom:1.25rem;">
  <div class="card">
    <h3 style="margin-top:0;">Top Visited Endpoints</h3>
    <table class="data-table">
      <thead><tr><th>Path</th><th style="text-align:right;">Hits</th></tr></thead>
      <tbody>
        <?php foreach (array_slice($summary['byPath'], 0, 6, true) as $pKey => $pHits): ?>
          <tr>
            <td><code style="font-size:0.78rem;"><?= e((string)$pKey) ?></code></td>
            <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:700;"><?= (int)$pHits ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="card">
    <h3 style="margin-top:0;">Devices &amp; Browsers</h3>
    <table class="data-table">
      <thead><tr><th>Client</th><th style="text-align:right;">Hits</th></tr></thead>
      <tbody>
        <?php foreach ($summary['byDevice'] as $dKey => $dHits): ?>
          <tr><td>Device: <strong><?= e((string)$dKey) ?></strong></td><td style="text-align:right;font-variant-numeric:tabular-nums;"><?= (int)$dHits ?></td></tr>
        <?php endforeach; ?>
        <?php foreach (array_slice($summary['byBrowser'], 0, 4, true) as $bKey => $bHits): ?>
          <tr><td>Browser: <?= e((string)$bKey) ?></td><td style="text-align:right;font-variant-numeric:tabular-nums;"><?= (int)$bHits ?></td></tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <div class="card">
    <h3 style="margin-top:0;">HTTP Response Codes</h3>
    <table class="data-table">
      <thead><tr><th>Status</th><th style="text-align:right;">Count</th></tr></thead>
      <tbody>
        <?php foreach ($summary['byStatus'] as $sCode => $sHits): ?>
          <tr>
            <td><strong style="font-variant-numeric:tabular-nums;color:<?= (int)$sCode >= 400 ? '#B91C1C' : '#047857' ?>;">HTTP <?= (int)$sCode ?></strong></td>
            <td style="text-align:right;font-variant-numeric:tabular-nums;"><?= (int)$sHits ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Multi-Filter Bar & Export Toolbar -->
<div class="card" style="margin-bottom:1.25rem;">
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.75rem;margin-bottom:0.85rem;">
    <h2 style="margin:0;">Log Explorer &amp; Export Studio</h2>
    <div style="display:flex;flex-wrap:wrap;gap:0.45rem;align-items:center;">
      <a href="<?= e($buildFilterLink(['export' => 'csv'])) ?>" class="btn-primary" style="font-size:0.78rem;padding:0.42rem 0.75rem;">Export CSV</a>
      <a href="<?= e($buildFilterLink(['export' => 'csv', 'maskIps' => '1'])) ?>" class="btn-secondary" style="font-size:0.78rem;padding:0.42rem 0.75rem;">Export CSV (Masked IP)</a>
      <a href="<?= e($buildFilterLink(['export' => 'json'])) ?>" class="btn-secondary" style="font-size:0.78rem;padding:0.42rem 0.75rem;">Export JSON</a>
      <a href="<?= e($buildFilterLink(['export' => 'log'])) ?>" class="btn-secondary" style="font-size:0.78rem;padding:0.42rem 0.75rem;">Export .LOG</a>
      <form method="post" style="display:inline;" onsubmit="return confirm('Prune visitor logs older than retention period?');">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="prune_logs">
        <input type="hidden" name="prune_mode" value="retention">
        <button type="submit" class="btn-secondary" style="font-size:0.78rem;padding:0.42rem 0.75rem;">Prune Old Logs</button>
      </form>
    </div>
  </div>

  <form method="get" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:0.55rem;padding:0.75rem;background:#FAFAF9;border:1px solid #E7E5E4;border-radius:8px;margin-bottom:1rem;align-items:end;">
    <div>
      <label style="display:block;font-size:0.74rem;font-weight:600;">Search IP / Path / Rule</label>
      <input type="search" name="search" value="<?= e($filters['search']) ?>" placeholder="IP, Pune, SQLi..." style="width:100%;padding:0.42rem;border:1px solid #D6D3D1;border-radius:6px;">
    </div>
    <div>
      <label style="display:block;font-size:0.74rem;font-weight:600;">Window</label>
      <select name="dateRange" style="width:100%;padding:0.42rem;border:1px solid #D6D3D1;border-radius:6px;">
        <option value="all" <?= $filters['dateRange'] === 'all' ? 'selected' : '' ?>>All Recorded</option>
        <option value="today" <?= $filters['dateRange'] === 'today' ? 'selected' : '' ?>>Today (UTC)</option>
        <option value="7d" <?= $filters['dateRange'] === '7d' ? 'selected' : '' ?>>Last 7 Days</option>
        <option value="30d" <?= $filters['dateRange'] === '30d' ? 'selected' : '' ?>>Last 30 Days</option>
      </select>
    </div>
    <div>
      <label style="display:block;font-size:0.74rem;font-weight:600;">Country</label>
      <select name="country" style="width:100%;padding:0.42rem;border:1px solid #D6D3D1;border-radius:6px;">
        <option value="all">All Countries</option>
        <?php foreach (array_keys($countryList) as $cOpt): ?>
          <option value="<?= e($cOpt) ?>" <?= $filters['country'] === $cOpt ? 'selected' : '' ?>><?= e($cOpt) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div>
      <label style="display:block;font-size:0.74rem;font-weight:600;">State</label>
      <select name="state" style="width:100%;padding:0.42rem;border:1px solid #D6D3D1;border-radius:6px;">
        <option value="all">All States</option>
        <?php foreach (array_keys($stateList) as $sOpt): ?>
          <option value="<?= e($sOpt) ?>" <?= $filters['state'] === $sOpt ? 'selected' : '' ?>><?= e($sOpt) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div>
      <label style="display:block;font-size:0.74rem;font-weight:600;">Area</label>
      <select name="area" style="width:100%;padding:0.42rem;border:1px solid #D6D3D1;border-radius:6px;">
        <option value="all">All Areas</option>
        <?php foreach (array_keys($areaList) as $aOpt): ?>
          <option value="<?= e($aOpt) ?>" <?= $filters['area'] === $aOpt ? 'selected' : '' ?>><?= e($aOpt) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div>
      <label style="display:block;font-size:0.74rem;font-weight:600;">Severity</label>
      <select name="severity" style="width:100%;padding:0.42rem;border:1px solid #D6D3D1;border-radius:6px;">
        <option value="all">All Severities</option>
        <option value="info" <?= $filters['severity'] === 'info' ? 'selected' : '' ?>>Info</option>
        <option value="warning" <?= $filters['severity'] === 'warning' ? 'selected' : '' ?>>Warning</option>
        <option value="critical" <?= $filters['severity'] === 'critical' ? 'selected' : '' ?>>Critical</option>
      </select>
    </div>
    <div>
      <label style="display:block;font-size:0.74rem;font-weight:600;">Event Type</label>
      <select name="event_type" style="width:100%;padding:0.42rem;border:1px solid #D6D3D1;border-radius:6px;">
        <option value="all">All Events</option>
        <?php foreach (['page_view', 'waf_block', 'failed_login', 'rate_limit', 'admin_login', 'alumni_login', 'error'] as $eOpt): ?>
          <option value="<?= e($eOpt) ?>" <?= $filters['event_type'] === $eOpt ? 'selected' : '' ?>><?= e($eOpt) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div style="display:flex;gap:0.4rem;">
      <button type="submit" class="btn-primary" style="flex:1;">Apply</button>
      <a href="<?= e(baseUrl('admin/manage_logs_security.php')) ?>" class="btn-secondary">Reset</a>
    </div>
  </form>

  <div style="overflow-x:auto;">
    <table class="data-table">
      <thead>
        <tr>
          <th>Time (UTC)</th>
          <th>IP &amp; Geo Location</th>
          <th>Request &amp; Status</th>
          <th>Client</th>
          <th>Event / Security Verdict</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <?php if (empty($logs)): ?>
          <tr><td colspan="6" style="text-align:center;color:#78716C;padding:1.25rem;">No log entries match the active filters.</td></tr>
        <?php endif; ?>
        <?php foreach ($logs as $row):
          $sev = (string)($row['severity'] ?? 'info');
          $sevColor = $sev === 'critical' ? '#B91C1C' : ($sev === 'warning' ? '#B45309' : '#047857');
        ?>
          <tr>
            <td style="font-size:0.76rem;white-space:nowrap;font-variant-numeric:tabular-nums;"><?= e(str_replace(['T', '+00:00', 'Z'], [' ', ' UTC', ''], (string)$row['timestamp_iso'])) ?></td>
            <td>
              <code style="font-size:0.8rem;font-weight:700;"><?= e((string)$row['ip']) ?></code>
              <div style="font-size:0.76rem;color:#57534E;"><?= e((string)$row['area']) ?>, <?= e((string)$row['state']) ?>, <?= e((string)$row['country']) ?></div>
            </td>
            <td>
              <code style="font-size:0.78rem;"><?= e((string)$row['method']) ?> <?= e((string)$row['path']) ?></code>
              <div style="font-size:0.75rem;font-variant-numeric:tabular-nums;">
                Status: <strong style="color:<?= (int)$row['status_code'] >= 400 ? '#B91C1C' : '#047857' ?>;"><?= (int)$row['status_code'] ?></strong>
                &middot; <?= (int)$row['latency_ms'] ?>ms
              </div>
            </td>
            <td style="font-size:0.78rem;">
              <div><?= e((string)$row['device_type']) ?> &middot; <?= e((string)$row['browser']) ?></div>
              <small style="color:#78716C;"><?= e((string)$row['os']) ?></small>
            </td>
            <td style="font-size:0.78rem;">
              <strong style="color:<?= $sevColor ?>;text-transform:uppercase;"><?= e($sev) ?> &middot; <?= e((string)$row['event_type']) ?></strong>
              <?php if (!empty($row['threat_category'])): ?>
                <div style="color:#B91C1C;font-weight:600;"><?= e((string)$row['threat_category']) ?></div>
              <?php endif; ?>
              <?php if (!empty($row['actor_email'])): ?>
                <div style="color:#1D4ED8;">Actor: <?= e((string)$row['actor_email']) ?></div>
              <?php endif; ?>
              <?php if (!empty($row['note'])): ?>
                <small style="color:#57534E;"><?= e((string)$row['note']) ?></small>
              <?php endif; ?>
            </td>
            <td>
              <?php if ($row['ip'] !== '127.0.0.1'): ?>
                <form method="post" style="display:inline;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="block_ip">
                  <input type="hidden" name="ip_address" value="<?= e((string)$row['ip']) ?>">
                  <input type="hidden" name="reason" value="<?= e((string)($row['threat_category'] ?: 'Blocked from Log Analyzer (' . $row['event_type'] . ')')) ?>">
                  <input type="hidden" name="duration_minutes" value="1440">
                  <button type="submit" class="btn-secondary" style="color:#BE123C;border-color:#FECDD3;padding:0.22rem 0.55rem;font-size:0.74rem;">Block IP</button>
                </form>
              <?php else: ?>
                <small style="color:#78716C;">Loopback</small>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Hackproof Firewall Controls + IP Blocklist + Hardening Checklist -->
<div class="grid-2" style="gap:1.25rem;align-items:start;">
  <div class="card">
    <h2 style="margin-top:0;">Hackproof Security Shield &amp; Firewall Policy</h2>
    <form method="post" class="grid" style="gap:0.75rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_security_config">
      <div style="display:grid;gap:0.45rem;font-size:0.84rem;">
        <label style="display:inline-flex;align-items:center;gap:0.45rem;cursor:pointer;">
          <input type="checkbox" name="enable_waf" value="1" <?= !empty($secCfg['enableWaf']) ? 'checked' : '' ?>>
          <span><strong>Enable Global WAF</strong> (Blocks SQLi, XSS, Path Traversal, Shell &amp; Probe Payloads)</span>
        </label>
        <label style="display:inline-flex;align-items:center;gap:0.45rem;cursor:pointer;">
          <input type="checkbox" name="block_known_scanners" value="1" <?= !empty($secCfg['blockKnownScanners']) ? 'checked' : '' ?>>
          <span><strong>Block Automated Security Scanners</strong> (sqlmap, nikto, zgrab, dirbuster, hydra)</span>
        </label>
        <label style="display:inline-flex;align-items:center;gap:0.45rem;cursor:pointer;">
          <input type="checkbox" name="enable_rate_limit" value="1" <?= !empty($secCfg['enableRateLimit']) ? 'checked' : '' ?>>
          <span><strong>Enable Brute-Force &amp; Rate-Limit Lockout</strong></span>
        </label>
        <label style="display:inline-flex;align-items:center;gap:0.45rem;cursor:pointer;">
          <input type="checkbox" name="auto_block_on_high_threat" value="1" <?= !empty($secCfg['autoBlockOnHighThreat']) ? 'checked' : '' ?>>
          <span><strong>Auto-Ban IP</strong> automatically on Critical WAF Exploit Detection</span>
        </label>
      </div>

      <div class="grid-2" style="gap:0.65rem;">
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;">Max Requests / Min / IP</label>
          <input type="number" min="20" max="5000" name="max_requests_per_minute" value="<?= (int)$secCfg['maxRequestsPerMinute'] ?>" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;">Max Failed Logins Before Lockout</label>
          <input type="number" min="3" max="50" name="max_failed_logins" value="<?= (int)$secCfg['maxFailedLogins'] ?>" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;">Lockout Duration (Minutes)</label>
          <input type="number" min="1" max="1440" name="lockout_minutes" value="<?= (int)$secCfg['lockoutMinutes'] ?>" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;">Log Retention (Days)</label>
          <input type="number" min="7" max="730" name="log_retention_days" value="<?= (int)$secCfg['logRetentionDays'] ?>" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
        </div>
      </div>

      <div>
        <button type="submit" class="btn-primary">Save Firewall Policy</button>
      </div>
    </form>

    <hr style="border:none;border-top:1px solid #E7E5E4;margin:1rem 0;">
    <h3 style="margin-top:0;">Webmin / Ubuntu Hardening Status</h3>
    <ul style="margin:0;padding-left:1.1rem;font-size:0.82rem;line-height:1.65;color:#44403C;">
      <li>HTTP Headers: <strong>Active</strong> (<code>X-Content-Type-Options: nosniff</code>, <code>X-Frame-Options: SAMEORIGIN</code>, <code>Referrer-Policy</code>, <code>X-Powered-By</code> stripped)</li>
      <li>SQL &amp; Auth Security: <strong>Active</strong> (PDO Prepared Statements + CSRF Tokens + CAPTCHA + Bcrypt)</li>
      <li>Setup Script Guard: <strong style="color:<?= $setupExists ? '#B45309' : '#047857' ?>;"><?= $setupExists ? 'Warning — delete setup.php after verification' : 'Verified — setup.php removed' ?></strong></li>
      <li>HTTPS Transport: <strong style="color:<?= $isHttps ? '#047857' : '#B45309' ?>;"><?= $isHttps ? 'TLS Active' : 'Enable SSL/Let\'s Encrypt in Webmin Virtualmin for production' ?></strong></li>
    </ul>
  </div>

  <div class="card">
    <h2 style="margin-top:0;">Persistent IP Blocklist Manager</h2>
    <form method="post" style="display:grid;gap:0.55rem;padding:0.75rem;background:#FAFAF9;border:1px solid #E7E5E4;border-radius:8px;margin-bottom:1rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="block_ip">
      <div class="grid-2" style="gap:0.55rem;">
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;">IPv4 / IPv6 Address *</label>
          <input type="text" name="ip_address" required placeholder="e.g. 203.0.113.55" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
        </div>
        <div>
          <label style="display:block;font-size:0.78rem;font-weight:600;">Ban Duration (Minutes, 0 = Permanent)</label>
          <input type="number" min="0" name="duration_minutes" value="1440" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
        </div>
      </div>
      <div>
        <label style="display:block;font-size:0.78rem;font-weight:600;">Security Reason *</label>
        <input type="text" name="reason" required placeholder="Repeated brute-force / vulnerability scan" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
      </div>
      <div>
        <button type="submit" class="btn-primary" style="background:#B91C1C;border-color:#B91C1C;">Block IP Address</button>
      </div>
    </form>

    <table class="data-table">
      <thead><tr><th>Blocked IP</th><th>Reason</th><th>Blocked By &amp; Expiry</th><th>Action</th></tr></thead>
      <tbody>
        <?php if (empty($blockedIps)): ?>
          <tr><td colspan="4" style="text-align:center;color:#78716C;">No IPs currently blocked.</td></tr>
        <?php endif; ?>
        <?php foreach ($blockedIps as $blk): ?>
          <tr>
            <td><code><?= e((string)$blk['ip']) ?></code></td>
            <td style="font-size:0.8rem;"><?= e((string)$blk['reason']) ?></td>
            <td style="font-size:0.76rem;color:#57534E;">
              <?= e((string)$blk['blocked_by']) ?>
              <div><?= !empty($blk['expires_at']) ? 'Until: ' . e((string)$blk['expires_at']) : 'Permanent' ?></div>
            </td>
            <td>
              <form method="post" style="display:inline;" onsubmit="return confirm('Unblock this IP address?');">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="unblock_ip">
                <input type="hidden" name="block_id" value="<?= (int)$blk['id'] ?>">
                <button type="submit" class="btn-secondary" style="padding:0.25rem 0.55rem;font-size:0.74rem;">Unblock</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
