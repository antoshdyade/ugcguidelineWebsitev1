<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/backup_helper.php';

$user = requireRoleAccess('users');
$pdo = getDB();
$msg = '';
$err = '';
$restorePreview = null;

ensureBackupsStorage();

// Authenticated local download
if (isset($_GET['download']) && $_GET['download'] !== '') {
    $file = basename((string)$_GET['download']);
    $full = dirname(__DIR__) . '/backups/' . $file;
    if (preg_match('/^svcoer-[a-z0-9-]+\.json$/i', $file) === 1 && is_file($full)) {
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $file . '"');
        header('Content-Length: ' . filesize($full));
        readfile($full);
        exit;
    }
    $err = 'Requested backup file not found.';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'create_backup') {
        $mode = ($_POST['mode'] ?? 'full') === 'incremental' ? 'incremental' : 'full';
        $dest = in_array($_POST['destination'] ?? 'local', ['local', 'scp', 'gdrive_webhook'], true)
            ? $_POST['destination']
            : 'local';
        $rec = createBackupArchive($pdo, $mode, $dest, $user['email']);
        logAudit($pdo, $user, 'CREATE_BACKUP', 'Backup', $rec['fileName'] . ' (' . $rec['mode'] . ' -> ' . $dest . ')');
        $msg = 'Created ' . strtoupper($rec['mode']) . ' backup (' . $rec['fileName'] . ') — ' . $rec['transferStatus'];
    } elseif ($action === 'save_schedule') {
        $schedule = [
            'enabled'          => isset($_POST['sched_enabled']),
            'frequency'        => in_array($_POST['sched_frequency'] ?? 'daily', ['disabled', 'hourly', 'daily', 'weekly'], true) ? $_POST['sched_frequency'] : 'daily',
            'mode'             => ($_POST['sched_mode'] ?? 'incremental') === 'full' ? 'full' : 'incremental',
            'destination'      => in_array($_POST['sched_destination'] ?? 'local', ['local', 'scp', 'gdrive_webhook'], true) ? $_POST['sched_destination'] : 'local',
            'retentionCount'   => max(3, min(100, (int)($_POST['retention_count'] ?? 10))),
            'gdriveWebhookUrl' => trim((string)($_POST['gdrive_webhook_url'] ?? '')),
            'lastRunAt'        => getBackupSchedule($pdo)['lastRunAt'] ?? null,
            'nextRunAt'        => isset($_POST['sched_enabled'])
                ? computeNextRunIso((string)($_POST['sched_frequency'] ?? 'daily'), time())
                : null,
            'scp'              => [
                'enabled'        => isset($_POST['scp_enabled']),
                'host'           => trim((string)($_POST['scp_host'] ?? '')),
                'port'           => max(1, min(65535, (int)($_POST['scp_port'] ?? 22))),
                'username'       => trim((string)($_POST['scp_username'] ?? '')),
                'remotePath'     => trim((string)($_POST['scp_remote_path'] ?? '/var/backups/svcoer-cms')),
                'privateKeyPath' => trim((string)($_POST['scp_key_path'] ?? '')),
            ],
        ];
        kvSet($pdo, 'backup_schedule', $schedule);
        logAudit($pdo, $user, 'UPDATE_BACKUP_SCHEDULE', 'BackupSchedule', $schedule['frequency'] . ' / ' . $schedule['destination']);
        $msg = 'Automatic backup schedule & remote export settings saved.';
    } elseif ($action === 'run_scheduler_now') {
        $res = runScheduledBackupIfDue($pdo, $user['email'], true);
        if (!empty($res['ran'])) {
            $rec = $res['record'];
            logAudit($pdo, $user, 'RUN_SCHEDULED_BACKUP', 'Backup', $rec['fileName']);
            $msg = 'Scheduled backup executed: ' . $rec['fileName'] . ' (' . $rec['transferStatus'] . ')';
        } else {
            $err = $res['reason'] ?? 'Scheduler did not run.';
        }
    } elseif ($action === 'delete_backup' && !empty($_POST['file_name'])) {
        $target = basename((string)$_POST['file_name']);
        $index = kvGet($pdo, 'backup_index', []);
        if (is_array($index)) {
            $index = array_values(array_filter($index, static fn($r) => ($r['fileName'] ?? '') !== $target));
            kvSet($pdo, 'backup_index', $index);
        }
        $full = dirname(__DIR__) . '/backups/' . $target;
        if (is_file($full)) {
            @unlink($full);
        }
        $msg = 'Backup archive removed: ' . $target;
    } elseif ($action === 'preview_restore') {
        if (!empty($_FILES['backup_file']['tmp_name'])) {
            $raw = (string)@file_get_contents($_FILES['backup_file']['tmp_name']);
            $decoded = json_decode($raw, true);
            $val = validateBackupPackage($decoded);
            if ($val['valid']) {
                $pendingName = 'pending-restore-' . bin2hex(random_bytes(6)) . '.json';
                file_put_contents(dirname(__DIR__) . '/backups/' . $pendingName, $raw);
                $restorePreview = [
                    'fileName'    => $_FILES['backup_file']['name'],
                    'pendingFile' => $pendingName,
                    'validation'  => $val,
                ];
                $msg = 'Backup archive validated. Review counts below and confirm restore.';
            } else {
                $err = $val['error'];
            }
        } else {
            $err = 'Please select a valid .json backup archive file to import.';
        }
    } elseif ($action === 'confirm_restore') {
        $pending = !empty($_POST['pending_file']) ? basename((string)$_POST['pending_file']) : '';
        $existingFile = !empty($_POST['existing_backup_file']) ? basename((string)$_POST['existing_backup_file']) : '';
        $targetPath = '';
        if ($pending !== '' && is_file(dirname(__DIR__) . '/backups/' . $pending)) {
            $targetPath = dirname(__DIR__) . '/backups/' . $pending;
        } elseif ($existingFile !== '' && is_file(dirname(__DIR__) . '/backups/' . $existingFile)) {
            $targetPath = dirname(__DIR__) . '/backups/' . $existingFile;
        }
        if ($targetPath === '') {
            $err = 'Restore source archive could not be located.';
        } else {
            $decoded = json_decode((string)file_get_contents($targetPath), true);
            if (!is_array($decoded)) {
                $err = 'Corrupted backup JSON file.';
            } else {
                $res = restoreFromBackupPackage($pdo, $decoded, $user['email']);
                if ($pending !== '' && is_file(dirname(__DIR__) . '/backups/' . $pending)) {
                    @unlink(dirname(__DIR__) . '/backups/' . $pending);
                }
                if ($res['ok']) {
                    logAudit($pdo, $user, 'RESTORE_BACKUP', 'Database', 'Safety snapshot: ' . $res['safetyBackup']);
                    $msg = 'Website restored cleanly across ' . count($res['restoredTables']) . ' tables! Pre-restore safety snapshot saved: ' . $res['safetyBackup'];
                } else {
                    $err = $res['error'];
                }
            }
        }
    }
}

$backups = kvGet($pdo, 'backup_index', []);
if (!is_array($backups)) $backups = [];
$schedule = getBackupSchedule($pdo);
$cronPath = realpath(dirname(__DIR__) . '/cron_backup.php') ?: (dirname(__DIR__) . '/cron_backup.php');

$adminPageTitle = 'Website Backup, Incremental Export, SCP/Drive & Restore';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
  <div class="grid-2" style="margin-bottom:1.5rem;align-items:start;">
    <form method="post" class="card">
      <h2 style="margin-top:0;">Create Backup / Export Snapshot</h2>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0;">
        Generate full database &amp; media manifest snapshots or incremental diffs since your latest baseline, saved locally or exported to Google Drive Webhook / remote SCP server.
      </p>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="create_backup">

      <div class="grid-2" style="margin-bottom:0.75rem;">
        <label>Backup Mode
          <select name="mode" style="width:100%;padding:0.5rem;">
            <option value="full">Full Website Backup</option>
            <option value="incremental">Incremental Snapshot (Changed Sections)</option>
          </select>
        </label>
        <label>Export Destination
          <select name="destination" style="width:100%;padding:0.5rem;">
            <option value="local">Local Server Storage &amp; Disk Download</option>
            <option value="gdrive_webhook">Upload to Google Drive (Apps Script Webhook)</option>
            <option value="scp">Push to Remote Linux Server (SCP/SSH)</option>
          </select>
        </label>
      </div>
      <button type="submit" class="btn-primary">Run Backup &amp; Export Now</button>
    </form>

    <div class="card">
      <h2 style="margin-top:0;">Import &amp; Restore Corrupted Website</h2>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0;">
        Upload any exported <code>svcoer-*.json</code> archive to validate checksums &amp; row counts. A pre-restore safety snapshot is automatically saved before restoring.
      </p>
      <form method="post" enctype="multipart/form-data">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="preview_restore">
        <input type="file" name="backup_file" accept=".json,application/json" required style="display:block;margin-bottom:0.75rem;">
        <button type="submit" class="btn-secondary">Validate &amp; Preview Backup File</button>
      </form>

      <?php if ($restorePreview): ?>
        <div style="margin-top:1rem;padding:0.85rem;border:2px solid var(--secondary-color);border-radius:8px;background:var(--surface-bg);">
          <strong>Ready to Restore: <?= e($restorePreview['fileName']) ?></strong>
          <div style="font-size:0.8rem;color:var(--text-muted);margin:0.35rem 0;">
            Mode: <?= e($restorePreview['validation']['mode']) ?> · Created: <?= e($restorePreview['validation']['createdAt']) ?>
          </div>
          <div style="font-size:0.78rem;margin-bottom:0.65rem;">
            <?php foreach ($restorePreview['validation']['counts'] as $tbl => $cnt): ?>
              <span style="display:inline-block;margin:2px 6px 2px 0;padding:1px 6px;background:#fff;border:1px solid var(--border-color);border-radius:4px;"><?= e($tbl) ?>: <?= (int)$cnt ?></span>
            <?php endforeach; ?>
          </div>
          <form method="post" style="display:flex;gap:0.5rem;">
            <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="action" value="confirm_restore">
            <input type="hidden" name="pending_file" value="<?= e($restorePreview['pendingFile']) ?>">
            <button type="submit" class="btn-primary">Confirm Atomic Restore</button>
            <a href="manage_backups.php" class="btn-secondary">Cancel</a>
          </form>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <!-- Automatic Scheduled Backup, SCP & Google Drive Webhook Config -->
  <form method="post" class="card" style="margin-bottom:1.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
      <h2 style="margin:0;">Automatic Scheduled Backup &amp; Remote Export Settings</h2>
      <label style="font-weight:700;font-size:0.9rem;">
        <input type="checkbox" name="sched_enabled" <?= !empty($schedule['enabled']) ? 'checked' : '' ?>> Enable Scheduled Auto-Backup
      </label>
    </div>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_schedule">

    <div class="grid-4" style="margin-bottom:0.85rem;">
      <label>Frequency
        <select name="sched_frequency" style="width:100%;padding:0.45rem;">
          <?php foreach (['disabled' => 'Disabled', 'hourly' => 'Hourly', 'daily' => 'Daily', 'weekly' => 'Weekly'] as $fk => $fl): ?>
            <option value="<?= $fk ?>" <?= ($schedule['frequency'] ?? 'daily') === $fk ? 'selected' : '' ?>><?= e($fl) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Backup Mode
        <select name="sched_mode" style="width:100%;padding:0.45rem;">
          <option value="incremental" <?= ($schedule['mode'] ?? 'incremental') === 'incremental' ? 'selected' : '' ?>>Incremental Snapshot</option>
          <option value="full" <?= ($schedule['mode'] ?? '') === 'full' ? 'selected' : '' ?>>Full Snapshot</option>
        </select>
      </label>
      <label>Default Target
        <select name="sched_destination" style="width:100%;padding:0.45rem;">
          <option value="local" <?= ($schedule['destination'] ?? 'local') === 'local' ? 'selected' : '' ?>>Local Server Archive</option>
          <option value="gdrive_webhook" <?= ($schedule['destination'] ?? '') === 'gdrive_webhook' ? 'selected' : '' ?>>Google Drive Webhook</option>
          <option value="scp" <?= ($schedule['destination'] ?? '') === 'scp' ? 'selected' : '' ?>>Remote SCP Server</option>
        </select>
      </label>
      <label>Retention (Keep Last N)
        <input type="number" min="3" max="100" name="retention_count" value="<?= (int)($schedule['retentionCount'] ?? 10) ?>" style="width:100%;padding:0.45rem;">
      </label>
    </div>

    <div class="grid-2" style="margin-bottom:0.85rem;">
      <div style="border:1px solid var(--border-color);border-radius:8px;padding:0.75rem;background:var(--surface-bg);">
        <strong style="display:block;margin-bottom:0.4rem;">Google Drive Upload (Apps Script / Webhook URL)</strong>
        <input type="url" name="gdrive_webhook_url" value="<?= e((string)($schedule['gdriveWebhookUrl'] ?? '')) ?>" placeholder="https://script.google.com/macros/s/.../exec" style="width:100%;padding:0.45rem;">
        <small style="display:block;color:var(--text-muted);margin-top:0.3rem;">Deploy a Google Apps Script web app accepting JSON POST <code>{ filename, contentBase64 }</code> to save directly into your Drive folder.</small>
      </div>

      <div style="border:1px solid var(--border-color);border-radius:8px;padding:0.75rem;background:var(--surface-bg);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
          <strong>Remote SCP / SSH Export Target</strong>
          <label style="font-size:0.82rem;"><input type="checkbox" name="scp_enabled" <?= !empty($schedule['scp']['enabled']) ? 'checked' : '' ?>> Enable SCP</label>
        </div>
        <div class="grid-3" style="gap:0.4rem;margin-bottom:0.4rem;">
          <input type="text" name="scp_host" value="<?= e((string)($schedule['scp']['host'] ?? '')) ?>" placeholder="Host / IP" style="padding:0.4rem;">
          <input type="number" name="scp_port" value="<?= (int)($schedule['scp']['port'] ?? 22) ?>" placeholder="Port" style="padding:0.4rem;">
          <input type="text" name="scp_username" value="<?= e((string)($schedule['scp']['username'] ?? '')) ?>" placeholder="SSH User" style="padding:0.4rem;">
        </div>
        <div class="grid-2" style="gap:0.4rem;">
          <input type="text" name="scp_remote_path" value="<?= e((string)($schedule['scp']['remotePath'] ?? '/var/backups/svcoer-cms')) ?>" placeholder="/var/backups/svcoer-cms" style="padding:0.4rem;">
          <input type="text" name="scp_key_path" value="<?= e((string)($schedule['scp']['privateKeyPath'] ?? '')) ?>" placeholder="SSH Key Path (Optional)" style="padding:0.4rem;">
        </div>
      </div>
    </div>

    <div style="display:flex;gap:0.65rem;flex-wrap:wrap;align-items:center;">
      <button type="submit" class="btn-primary">Save Auto-Backup &amp; Remote Settings</button>
      <small style="color:var(--text-muted);">
        Last Run: <?= e((string)($schedule['lastRunAt'] ?? 'Never')) ?> · Next Due: <?= e((string)($schedule['nextRunAt'] ?? 'Not scheduled')) ?>
      </small>
    </div>

    <div style="margin-top:0.85rem;padding:0.65rem;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:0.8rem;color:#92400e;">
      <strong>Linux Webmin Scheduled Cron Job:</strong> Add this hourly cron command in <em>Webmin &rarr; System &rarr; Scheduled Cron Jobs</em>:<br>
      <code>0 * * * * /usr/bin/php <?= e($cronPath) ?> &gt;/dev/null 2&gt;&amp;1</code>
    </div>
  </form>

  <form method="post" style="margin-bottom:1.25rem;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="run_scheduler_now">
    <button type="submit" class="btn-secondary">Execute Scheduled Backup Now</button>
  </form>

  <div class="card">
    <h2 style="margin-top:0;">Backup Archive History (<?= count($backups) ?>)</h2>
    <table class="data-table">
      <thead><tr><th>Archive File</th><th>Mode</th><th>Target &amp; Status</th><th>Size</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>
        <?php foreach ($backups as $b): ?>
          <tr>
            <td>
              <strong><?= e($b['fileName']) ?></strong>
              <br><small style="color:var(--text-muted);">SHA-256: <code><?= e(substr((string)($b['checksum'] ?? ''), 0, 14)) ?>...</code></small>
            </td>
            <td><?= e(strtoupper((string)($b['mode'] ?? 'full'))) ?></td>
            <td><?= e((string)($b['destination'] ?? 'local')) ?><br><small style="color:var(--text-muted);"><?= e((string)($b['transferStatus'] ?? '')) ?></small></td>
            <td><?= e(formatBytes((int)($b['sizeBytes'] ?? 0))) ?></td>
            <td><?= e((string)($b['createdAt'] ?? '')) ?></td>
            <td style="white-space:nowrap;">
              <a href="?download=<?= urlencode((string)$b['fileName']) ?>" class="btn-primary" style="padding:0.3rem 0.6rem;font-size:0.78rem;">Download</a>
              <form method="post" style="display:inline;" onsubmit="return confirm('Restore database from this archive? A safety snapshot will be created first.');">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="confirm_restore">
                <input type="hidden" name="existing_backup_file" value="<?= e($b['fileName']) ?>">
                <button type="submit" class="btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.78rem;">Restore</button>
              </form>
              <form method="post" style="display:inline;" onsubmit="return confirm('Delete this archive?');">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="delete_backup">
                <input type="hidden" name="file_name" value="<?= e($b['fileName']) ?>">
                <button type="submit" class="btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.78rem;">Delete</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($backups)): ?>
          <tr><td colspan="6" style="color:var(--text-muted);">No backups created yet. Click <strong>Run Backup &amp; Export Now</strong> above to create your first snapshot.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
