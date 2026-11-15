<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/backup_helper.php';

$user = requireRoleAccess('users');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$msg = '';
$err = '';
$restorePreview = null;

ensureBackupsStorage();

// Authenticated local download (.json or .zip)
if (isset($_GET['download']) && $_GET['download'] !== '') {
    $file = basename((string)$_GET['download']);
    $full = dirname(__DIR__) . '/backups/' . $file;
    if (preg_match('/^svcoer-[a-z0-9-]+\.(json|zip)$/i', $file, $m) === 1 && is_file($full)) {
        $ext = strtolower($m[1]);
        header('Content-Type: ' . ($ext === 'zip' ? 'application/zip' : 'application/json; charset=utf-8'));
        header('Content-Disposition: attachment; filename="' . $file . '"');
        header('Content-Length: ' . filesize($full));
        readfile($full);
        exit;
    }
    $err = 'Requested backup archive not found.';
}

$scheme = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')) ? 'https' : 'http';
$currentOrigin = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
$currentTargetBase = $currentOrigin . getBaseUrl();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'export_full_site') {
        $sourceOrigin = trim((string)($_POST['source_origin'] ?? $currentTargetBase));
        $includeData = isset($_POST['include_data']);
        $includeMedia = isset($_POST['include_media']);
        $includeCode = isset($_POST['include_code']);
        $exportDest = (string)($_POST['export_destination'] ?? 'local');
        if (!$includeData && !$includeMedia && !$includeCode) {
            $err = 'Please select at least one export component (Data + Credentials, Media/Photos, or Source Code).';
        } else {
            $rec = createFullSiteMigrationZip($pdo, $user['email'], $sourceOrigin, $includeData, $includeMedia, $includeCode, $exportDest);
            logAudit($pdo, $user, 'EXPORT_SITE_MIGRATION_ZIP', 'SiteMigration', $rec['fileName'] . ' -> ' . $exportDest);
            if ($exportDest === 'download') {
                $fullZip = dirname(__DIR__) . '/backups/' . basename($rec['fileName']);
                if (is_file($fullZip)) {
                    header('Content-Type: application/zip');
                    header('Content-Disposition: attachment; filename="' . basename($rec['fileName']) . '"');
                    header('Content-Length: ' . filesize($fullZip));
                    readfile($fullZip);
                    exit;
                }
            }
            $msg = 'Website Migration Archive created: ' . $rec['fileName'] . ' (' . $rec['transferStatus'] . ').';
        }
    } elseif ($action === 'push_remote' && !empty($_POST['file_name'])) {
        $target = basename((string)$_POST['file_name']);
        $remoteDest = ($_POST['remote_dest'] ?? '') === 'scp' ? 'scp' : 'gdrive_webhook';
        $fullPath = dirname(__DIR__) . '/backups/' . $target;
        if (is_file($fullPath)) {
            $schedule = getBackupSchedule($pdo);
            $res = pushBackupToDestination($fullPath, $target, $remoteDest, $schedule, [
                'mode'      => str_ends_with(strtolower($target), '.zip') ? 'full_site_migration' : 'full',
                'createdAt' => gmdate('Y-m-d\TH:i:s\Z'),
            ]);
            if (!empty($res['ok'])) {
                logAudit($pdo, $user, 'PUSH_BACKUP_REMOTE', 'Backup', $target . ' -> ' . $remoteDest);
                $msg = $target . ': ' . $res['status'];
            } else {
                $err = $res['status'];
            }
        } else {
            $err = 'Archive file not found on server disk.';
        }
    } elseif ($action === 'create_backup') {
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
            $origName = (string)($_FILES['backup_file']['name'] ?? '');
            $isZip = str_ends_with(strtolower($origName), '.zip');
            if ($isZip) {
                $pendingName = 'pending-restore-' . bin2hex(random_bytes(6)) . '.zip';
                $destPath = dirname(__DIR__) . '/backups/' . $pendingName;
                if (move_uploaded_file($_FILES['backup_file']['tmp_name'], $destPath) || copy($_FILES['backup_file']['tmp_name'], $destPath)) {
                    $val = inspectSiteMigrationZip($destPath);
                    if ($val['valid']) {
                        $restorePreview = [
                            'type'        => 'zip',
                            'fileName'    => $origName,
                            'pendingFile' => $pendingName,
                            'validation'  => $val,
                        ];
                        $msg = 'Site Migration .zip validated (' . (int)$val['mediaCount'] . ' photos/media, ' . (int)$val['codeCount'] . ' code files). Review domain rewrite settings and confirm.';
                    } else {
                        @unlink($destPath);
                        $err = $val['error'];
                    }
                } else {
                    $err = 'Could not stage uploaded .zip package.';
                }
            } else {
                $raw = (string)@file_get_contents($_FILES['backup_file']['tmp_name']);
                $decoded = json_decode($raw, true);
                $val = validateBackupPackage($decoded);
                if ($val['valid']) {
                    $pendingName = 'pending-restore-' . bin2hex(random_bytes(6)) . '.json';
                    file_put_contents(dirname(__DIR__) . '/backups/' . $pendingName, $raw);
                    $restorePreview = [
                        'type'        => 'json',
                        'fileName'    => $origName,
                        'pendingFile' => $pendingName,
                        'validation'  => $val,
                    ];
                    $msg = 'Backup JSON archive validated. Review counts below and confirm restore.';
                } else {
                    $err = $val['error'];
                }
            }
        } else {
            $err = 'Please select a valid .zip migration package or .json backup archive.';
        }
    } elseif ($action === 'confirm_restore') {
        $pending = !empty($_POST['pending_file']) ? basename((string)$_POST['pending_file']) : '';
        $existingFile = !empty($_POST['existing_backup_file']) ? basename((string)$_POST['existing_backup_file']) : '';
        $oldDomainUrl = trim((string)($_POST['old_base_url'] ?? ''));
        $newDomainUrl = trim((string)($_POST['new_base_url'] ?? ''));
        $restoreMedia = isset($_POST['restore_media']);
        $targetPath = '';
        if ($pending !== '' && is_file(dirname(__DIR__) . '/backups/' . $pending)) {
            $targetPath = dirname(__DIR__) . '/backups/' . $pending;
        } elseif ($existingFile !== '' && is_file(dirname(__DIR__) . '/backups/' . $existingFile)) {
            $targetPath = dirname(__DIR__) . '/backups/' . $existingFile;
        }
        if ($targetPath === '') {
            $err = 'Restore source archive could not be located.';
        } else {
            $isZipTarget = str_ends_with(strtolower($targetPath), '.zip');
            if ($isZipTarget) {
                $res = restoreFromSiteMigrationZip($pdo, $targetPath, $user['email'], $oldDomainUrl, $newDomainUrl, $restoreMedia);
            } else {
                $decoded = json_decode((string)file_get_contents($targetPath), true);
                if (!is_array($decoded)) {
                    $res = ['ok' => false, 'error' => 'Corrupted backup JSON file.'];
                } else {
                    if ($oldDomainUrl !== '' && $newDomainUrl !== '') {
                        $decoded['data'] = rewriteDomainUrlsRecursive($decoded['data'] ?? [], $oldDomainUrl, $newDomainUrl);
                    }
                    $res = restoreFromBackupPackage($pdo, $decoded, $user['email']);
                }
            }
            if ($pending !== '' && is_file(dirname(__DIR__) . '/backups/' . $pending)) {
                @unlink(dirname(__DIR__) . '/backups/' . $pending);
            }
            if (!empty($res['ok'])) {
                $mediaNote = isset($res['restoredMediaCount']) ? ' and restored ' . (int)$res['restoredMediaCount'] . ' uploaded photos/media files' : '';
                logAudit($pdo, $user, 'RESTORE_BACKUP', 'Database', 'Safety snapshot: ' . $res['safetyBackup']);
                $msg = 'Website restored cleanly across ' . count($res['restoredTables']) . ' tables' . $mediaNote . '! Pre-restore safety snapshot saved: ' . $res['safetyBackup'];
            } else {
                $err = $res['error'] ?? 'Restore failed.';
            }
        }
    }
}

$backups = kvGet($pdo, 'backup_index', []);
if (!is_array($backups)) $backups = [];
$schedule = getBackupSchedule($pdo);
$cronPath = realpath(dirname(__DIR__) . '/cron_backup.php') ?: (dirname(__DIR__) . '/cron_backup.php');

$adminPageTitle = 'Website Backup, Migration (.zip), SCP/Drive & Restore';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
  <!-- Complete Website Migration Bundle Card -->
  <div class="card" style="margin-bottom:1.5rem;border:1px solid #BFDBFE;background:#EFF6FF;">
    <form method="post" style="display:grid;gap:0.85rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="export_full_site">
      <input type="hidden" name="source_origin" value="<?= e($currentTargetBase) ?>">
      <div>
        <small style="text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:#1D4ED8;display:block;font-size:0.72rem;">Cross-Domain Site Migration &amp; Selective Archive Export</small>
        <h2 style="margin:0.2rem 0 0.35rem;color:#0F294A;">Export Website Archive (.zip — Data + Credentials + Photos/Media + Code)</h2>
        <p style="margin:0;font-size:0.84rem;color:#334155;">
          Choose which parts to include (hashed staff &amp; alumni credentials are preserved securely across migrations; secrets like <code>config.local.php</code> are excluded) and choose local download, server disk, or remote disk destination.
        </p>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:1.1rem;font-size:0.84rem;font-weight:600;color:#0F294A;">
        <label><input type="checkbox" name="include_data" checked> Database Snapshot &amp; Hashed Credentials (JSON + SQL)</label>
        <label><input type="checkbox" name="include_media" checked> Uploaded Images, Photographs &amp; Files</label>
        <label><input type="checkbox" name="include_code" checked> Complete Website Source Code</label>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:0.55rem;">
        <button type="submit" name="export_destination" value="download" class="btn-primary">Download to Local Computer (.zip)</button>
        <button type="submit" name="export_destination" value="local" class="btn-secondary">Save Archive to Server Disk</button>
        <button type="submit" name="export_destination" value="scp" class="btn-outline">Send to Remote Disk (SCP)</button>
        <button type="submit" name="export_destination" value="gdrive_webhook" class="btn-outline">Send to Remote Drive / Webhook</button>
      </div>
    </form>
  </div>

  <div class="grid-2" style="margin-bottom:1.5rem;align-items:start;">
    <form method="post" class="card">
      <h2 style="margin-top:0;">Create Database Backup / Export Snapshot</h2>
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
      <h2 style="margin-top:0;">Cross-Domain Migration Import &amp; Restore (.zip / .json)</h2>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0;">
        Upload any exported <code>svcoer-site-migration-*.zip</code> or <code>svcoer-*.json</code> archive to restore data, photos, and optionally rewrite URLs from an old domain to this target domain.
      </p>
      <form method="post" enctype="multipart/form-data">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="preview_restore">
        <input type="file" name="backup_file" accept=".zip,.json,application/zip,application/json" required style="display:block;margin-bottom:0.75rem;">
        <button type="submit" class="btn-secondary">Inspect &amp; Preview Archive</button>
      </form>

      <?php if ($restorePreview):
        $val = $restorePreview['validation'];
        $defaultOld = $val['sourceOrigin'] ?? '';
      ?>
        <div style="margin-top:1rem;padding:0.9rem;border:2px solid var(--secondary-color);border-radius:10px;background:var(--surface-bg);">
          <strong>Ready to Restore: <?= e($restorePreview['fileName']) ?></strong>
          <div style="font-size:0.8rem;color:var(--text-muted);margin:0.35rem 0;">
            Type: <?= strtoupper(e($restorePreview['type'])) ?> · Mode: <?= e($val['mode']) ?> · Created: <?= e($val['createdAt']) ?>
            <?php if ($restorePreview['type'] === 'zip'): ?>
              <br>Packaged Media/Photos: <strong><?= (int)$val['mediaCount'] ?></strong> · Code Files: <strong><?= (int)$val['codeCount'] ?></strong>
            <?php endif; ?>
          </div>
          <div style="font-size:0.78rem;margin-bottom:0.75rem;">
            <?php foreach ($val['counts'] as $tbl => $cnt): ?>
              <span style="display:inline-block;margin:2px 6px 2px 0;padding:1px 6px;background:#fff;border:1px solid var(--border-color);border-radius:4px;"><?= e($tbl) ?>: <?= (int)$cnt ?></span>
            <?php endforeach; ?>
          </div>
          <form method="post" style="display:grid;gap:0.65rem;">
            <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="action" value="confirm_restore">
            <input type="hidden" name="pending_file" value="<?= e($restorePreview['pendingFile']) ?>">
            <div class="grid-2" style="gap:0.5rem;">
              <label>Old Domain URL (Rewrite From)
                <input type="text" name="old_base_url" value="<?= e($defaultOld) ?>" placeholder="https://old-college.edu.in" style="width:100%;">
              </label>
              <label>New Target Domain URL (Rewrite To)
                <input type="text" name="new_base_url" value="<?= e($currentTargetBase) ?>" placeholder="https://new-college.edu.in" style="width:100%;">
              </label>
            </div>
            <?php if ($restorePreview['type'] === 'zip'): ?>
              <label style="font-size:0.82rem;"><input type="checkbox" name="restore_media" checked> Extract &amp; restore uploaded photographs &amp; documents safely into <code>uploads/</code> &amp; <code>assets/images/</code></label>
            <?php endif; ?>
            <div style="display:flex;gap:0.5rem;">
              <button type="submit" class="btn-primary">Confirm Atomic Migration Restore</button>
              <a href="manage_backups.php" class="btn-outline">Cancel</a>
            </div>
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
    <h2 style="margin-top:0;">Backup &amp; Migration Archive History (<?= count($backups) ?>)</h2>
    <table class="data-table">
      <thead><tr><th>Archive File</th><th>Type / Mode</th><th>Target &amp; Status</th><th>Size</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>
        <?php foreach ($backups as $b):
          $isSiteZip = ($b['archiveType'] ?? '') === 'full_site_migration' || str_ends_with(strtolower((string)($b['fileName'] ?? '')), '.zip');
        ?>
          <tr>
            <td>
              <strong><?= e($b['fileName']) ?></strong>
              <?php if ($isSiteZip): ?>
                <span class="badge badge-ok" style="margin-left:4px;">SITE ZIP</span>
              <?php endif; ?>
              <br><small style="color:var(--text-muted);">SHA-256: <code><?= e(substr((string)($b['checksum'] ?? ''), 0, 14)) ?>...</code></small>
            </td>
            <td>
              <?= $isSiteZip ? 'COMPLETE SITE' : e(strtoupper((string)($b['mode'] ?? 'full'))) ?>
              <?php if ($isSiteZip): ?>
                <br><small style="color:var(--text-muted);"><?= (int)($b['mediaCount'] ?? 0) ?> media · <?= (int)($b['codeCount'] ?? 0) ?> code</small>
              <?php endif; ?>
            </td>
            <td><?= e((string)($b['destination'] ?? 'local')) ?><br><small style="color:var(--text-muted);"><?= e((string)($b['transferStatus'] ?? '')) ?></small></td>
            <td><?= e(formatBytes((int)($b['sizeBytes'] ?? 0))) ?></td>
            <td><?= e((string)($b['createdAt'] ?? '')) ?></td>
            <td style="white-space:nowrap;">
              <a href="?download=<?= urlencode((string)$b['fileName']) ?>" class="btn-primary btn-sm">Download</a>
              <form method="post" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="push_remote">
                <input type="hidden" name="file_name" value="<?= e($b['fileName']) ?>">
                <input type="hidden" name="remote_dest" value="scp">
                <button type="submit" class="btn-outline btn-sm">Push SCP</button>
              </form>
              <form method="post" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="push_remote">
                <input type="hidden" name="file_name" value="<?= e($b['fileName']) ?>">
                <input type="hidden" name="remote_dest" value="gdrive_webhook">
                <button type="submit" class="btn-outline btn-sm">Push Drive</button>
              </form>
              <form method="post" style="display:inline;" onsubmit="return confirm('Restore website from this archive? A safety snapshot will be created first.');">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="confirm_restore">
                <input type="hidden" name="existing_backup_file" value="<?= e($b['fileName']) ?>">
                <button type="submit" class="btn-outline btn-sm">Restore</button>
              </form>
              <form method="post" style="display:inline;" onsubmit="return confirm('Delete this archive?');">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="delete_backup">
                <input type="hidden" name="file_name" value="<?= e($b['fileName']) ?>">
                <button type="submit" class="btn-danger btn-sm">Delete</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if (empty($backups)): ?>
          <tr><td colspan="6" style="color:var(--text-muted);">No backups created yet. Click <strong>Export Complete Website (.zip)</strong> or <strong>Run Backup &amp; Export Now</strong> above.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
