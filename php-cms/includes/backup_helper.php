<?php
declare(strict_types=1);

/**
 * SVCOER PHP CMS — Backup, Incremental Diff, SCP/Google Drive Export & Restore Helper
 */

function backupTablesList(): array
{
    return [
        'site_settings',
        'categories',
        'pages',
        'departments',
        'department_subpages',
        'faculty',
        'department_labs',
        'leadership_profiles',
        'sliders',
        'ticker_items',
        'campus_events',
        'documents',
        'gallery_albums',
        'gallery_photos',
        'telephone_directory',
        'custom_home_components',
    ];
}

function ensureBackupsStorage(): string
{
    $dir = dirname(__DIR__) . '/backups';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    $htaccess = $dir . '/.htaccess';
    if (!file_exists($htaccess)) {
        @file_put_contents($htaccess, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Deny from all\n</IfModule>\n");
    }
    return $dir;
}

function kvGet(PDO $pdo, string $key, mixed $default = null): mixed
{
    try {
        $stmt = $pdo->prepare('SELECT val_json FROM cms_kv_store WHERE key_name = ? LIMIT 1');
        $stmt->execute([$key]);
        $row = $stmt->fetch();
        if ($row && $row['val_json'] !== null) {
            $decoded = json_decode((string)$row['val_json'], true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : $default;
        }
    } catch (Throwable $ignored) {
    }
    return $default;
}

function kvSet(PDO $pdo, string $key, mixed $value): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS cms_kv_store (
            key_name VARCHAR(80) PRIMARY KEY,
            val_json MEDIUMTEXT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB'
    );
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $stmt = $pdo->prepare(
        'INSERT INTO cms_kv_store (key_name, val_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)'
    );
    $stmt->execute([$key, $json]);
}

function defaultBackupSchedule(): array
{
    return [
        'enabled'          => false,
        'frequency'        => 'daily',
        'mode'             => 'incremental',
        'destination'      => 'local',
        'retentionCount'   => 10,
        'lastRunAt'        => null,
        'nextRunAt'        => null,
        'gdriveWebhookUrl' => '',
        'scp'              => [
            'enabled'         => false,
            'host'            => '',
            'port'            => 22,
            'username'        => '',
            'remotePath'      => '/var/backups/svcoer-cms',
            'privateKeyPath'  => '',
        ],
    ];
}

function getBackupSchedule(PDO $pdo): array
{
    $stored = kvGet($pdo, 'backup_schedule', []);
    $def = defaultBackupSchedule();
    if (!is_array($stored)) {
        return $def;
    }
    $merged = array_merge($def, $stored);
    $merged['scp'] = array_merge($def['scp'], is_array($stored['scp'] ?? null) ? $stored['scp'] : []);
    return $merged;
}

function computeNextRunIso(string $frequency, int $fromTs): ?string
{
    return match ($frequency) {
        'hourly' => gmdate('Y-m-d\TH:i:s\Z', $fromTs + 3600),
        'daily'  => gmdate('Y-m-d\TH:i:s\Z', $fromTs + 86400),
        'weekly' => gmdate('Y-m-d\TH:i:s\Z', $fromTs + 604800),
        default  => null,
    };
}

function captureUploadsManifest(): array
{
    $uploadsDir = dirname(__DIR__) . '/uploads';
    $list = [];
    if (!is_dir($uploadsDir)) {
        return $list;
    }
    $items = @scandir($uploadsDir) ?: [];
    foreach ($items as $file) {
        if ($file === '.' || $file === '..' || str_starts_with($file, '.')) {
            continue;
        }
        $full = $uploadsDir . '/' . $file;
        if (is_file($full)) {
            $list[] = [
                'fileName' => $file,
                'path'     => 'uploads/' . $file,
                'size'     => (int)filesize($full),
                'sha256'   => (string)hash_file('sha256', $full),
            ];
        }
    }
    return $list;
}

function captureCmsSnapshot(PDO $pdo): array
{
    $data = [];
    foreach (backupTablesList() as $tbl) {
        try {
            $data[$tbl] = $pdo->query("SELECT * FROM `$tbl`")->fetchAll();
        } catch (Throwable $ignored) {
            $data[$tbl] = [];
        }
    }
    $data['uploads_manifest'] = captureUploadsManifest();
    return $data;
}

function countSnapshotEntities(array $snapshot): array
{
    $counts = [];
    foreach ($snapshot as $k => $v) {
        if (is_array($v)) {
            $counts[$k] = count($v);
        }
    }
    return $counts;
}

function pushBackupToDestination(string $localPath, string $fileName, string $destination, array $schedule, array $meta): array
{
    if ($destination === 'scp') {
        $scp = $schedule['scp'] ?? [];
        if (empty($scp['enabled']) || empty($scp['host']) || empty($scp['username']) || empty($scp['remotePath'])) {
            return ['ok' => false, 'status' => 'SCP target not configured or disabled'];
        }
        $port = max(1, min(65535, (int)($scp['port'] ?? 22)));
        $remoteTarget = $scp['username'] . '@' . $scp['host'] . ':' . rtrim((string)$scp['remotePath'], '/') . '/' . $fileName;
        $cmdParts = ['scp', '-P', escapeshellarg((string)$port), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15'];
        if (!empty($scp['privateKeyPath']) && file_exists((string)$scp['privateKeyPath'])) {
            $cmdParts[] = '-i';
            $cmdParts[] = escapeshellarg((string)$scp['privateKeyPath']);
        }
        $cmdParts[] = escapeshellarg($localPath);
        $cmdParts[] = escapeshellarg($remoteTarget);
        $cmd = implode(' ', $cmdParts) . ' 2>&1';
        $output = [];
        $code = 1;
        @exec($cmd, $output, $code);
        if ($code === 0) {
            return ['ok' => true, 'status' => 'Uploaded via SCP to ' . $remoteTarget];
        }
        return ['ok' => false, 'status' => 'SCP transfer failed: ' . implode(' | ', $output)];
    }

    if ($destination === 'gdrive_webhook') {
        $hookUrl = trim((string)($schedule['gdriveWebhookUrl'] ?? ''));
        if ($hookUrl === '' || !preg_match('#^https://#i', $hookUrl)) {
            return ['ok' => false, 'status' => 'HTTPS Google Apps Script / Drive Webhook URL is required'];
        }
        $rawContent = (string)@file_get_contents($localPath);
        $payload = json_encode([
            'filename'      => $fileName,
            'mimeType'      => 'application/json',
            'mode'          => $meta['mode'] ?? 'full',
            'createdAt'     => $meta['createdAt'] ?? gmdate('c'),
            'checksum'      => $meta['checksum'] ?? '',
            'contentBase64' => base64_encode($rawContent),
        ], JSON_UNESCAPED_SLASHES);

        if (function_exists('curl_init')) {
            $ch = curl_init($hookUrl);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 25,
                CURLOPT_FOLLOWLOCATION => true,
            ]);
            $resp = curl_exec($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);
            if ($resp !== false && $httpCode >= 200 && $httpCode < 400) {
                return ['ok' => true, 'status' => 'Uploaded to Google Drive Webhook (HTTP ' . $httpCode . ')'];
            }
            return ['ok' => false, 'status' => 'Google Drive webhook failed: ' . ($err ?: 'HTTP ' . $httpCode)];
        }
        $ctx = stream_context_create([
            'http' => [
                'method'  => 'POST',
                'header'  => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 25,
            ],
        ]);
        $resp = @file_get_contents($hookUrl, false, $ctx);
        if ($resp !== false) {
            return ['ok' => true, 'status' => 'Uploaded to Google Drive Webhook'];
        }
        return ['ok' => false, 'status' => 'Google Drive webhook HTTP request failed'];
    }

    return ['ok' => true, 'status' => 'Saved to local server storage'];
}

function createBackupArchive(PDO $pdo, string $mode, string $destination, string $actorEmail, ?array $scheduleOverride = null): array
{
    $mode = $mode === 'incremental' ? 'incremental' : 'full';
    $dir = ensureBackupsStorage();
    $schedule = $scheduleOverride ?? getBackupSchedule($pdo);
    $snapshot = captureCmsSnapshot($pdo);
    $baseline = kvGet($pdo, 'backup_baseline_snapshot', null);

    $changedSections = [];
    $payloadData = $snapshot;
    $actualMode = $mode;
    $baseBackupId = null;

    if ($mode === 'incremental' && is_array($baseline) && !empty($baseline['data']) && is_array($baseline['data'])) {
        $baseBackupId = $baseline['id'] ?? null;
        $diff = [];
        foreach ($snapshot as $section => $rows) {
            $prevJson = json_encode($baseline['data'][$section] ?? null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $currJson = json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($prevJson !== $currJson) {
                $diff[$section] = $rows;
                $changedSections[] = $section;
            }
        }
        $payloadData = $diff;
    } else {
        $actualMode = 'full';
        $changedSections = array_keys($snapshot);
    }

    $id = 'bkp-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $fileName = 'svcoer-' . $actualMode . '-' . gmdate('Ymd-His') . '.json';
    $checksum = hash('sha256', (string)json_encode($payloadData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    $package = [
        'format'          => 'svcoer-cms-backup',
        'version'         => 2,
        'id'              => $id,
        'mode'            => $actualMode,
        'baseBackupId'    => $baseBackupId,
        'createdAt'       => gmdate('Y-m-d\TH:i:s\Z'),
        'createdBy'       => $actorEmail,
        'checksum'        => $checksum,
        'changedSections' => $changedSections,
        'entityCounts'    => countSnapshotEntities($payloadData),
        'data'            => $payloadData,
    ];

    $jsonOut = json_encode($package, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $filePath = $dir . '/' . $fileName;
    file_put_contents($filePath, $jsonOut);

    if ($actualMode === 'full') {
        kvSet($pdo, 'backup_baseline_snapshot', ['id' => $id, 'data' => $snapshot]);
    }

    $pushResult = pushBackupToDestination($filePath, $fileName, $destination, $schedule, $package);

    $record = [
        'id'              => $id,
        'fileName'        => $fileName,
        'mode'            => $actualMode,
        'baseBackupId'    => $baseBackupId,
        'destination'     => $destination,
        'createdAt'       => $package['createdAt'],
        'createdBy'       => $actorEmail,
        'sizeBytes'       => (int)filesize($filePath),
        'checksum'        => $checksum,
        'changedSections' => $changedSections,
        'entityCounts'    => $package['entityCounts'],
        'transferStatus'  => $pushResult['status'],
        'transferOk'      => $pushResult['ok'],
    ];

    $index = kvGet($pdo, 'backup_index', []);
    if (!is_array($index)) {
        $index = [];
    }
    array_unshift($index, $record);

    $retention = max(3, (int)($schedule['retentionCount'] ?? 10));
    if (count($index) > $retention) {
        $removed = array_slice($index, $retention);
        $index = array_slice($index, 0, $retention);
        foreach ($removed as $old) {
            $oldFile = $dir . '/' . basename((string)($old['fileName'] ?? ''));
            if (is_file($oldFile)) {
                @unlink($oldFile);
            }
        }
    }
    kvSet($pdo, 'backup_index', $index);

    return $record;
}

function validateBackupPackage(mixed $decoded): array
{
    if (!is_array($decoded) || ($decoded['format'] ?? '') !== 'svcoer-cms-backup' || !is_array($decoded['data'] ?? null)) {
        return ['valid' => false, 'error' => 'Invalid backup file: expected svcoer-cms-backup JSON format.'];
    }
    $counts = [];
    foreach ($decoded['data'] as $k => $rows) {
        if (is_array($rows)) {
            $counts[$k] = count($rows);
        }
    }
    return [
        'valid'     => true,
        'mode'      => ($decoded['mode'] ?? 'full') === 'incremental' ? 'incremental' : 'full',
        'createdAt' => (string)($decoded['createdAt'] ?? ''),
        'checksum'  => (string)($decoded['checksum'] ?? ''),
        'counts'    => $counts,
    ];
}

function restoreFromBackupPackage(PDO $pdo, array $pkg, string $actorEmail): array
{
    $validation = validateBackupPackage($pkg);
    if (!$validation['valid']) {
        return ['ok' => false, 'error' => $validation['error']];
    }

    // Create pre-restore safety snapshot first
    $safety = createBackupArchive($pdo, 'full', 'local', $actorEmail . ' (pre-restore)');

    $allowedTables = backupTablesList();
    $data = $pkg['data'];
    $restoredTables = [];

    $pdo->beginTransaction();
    try {
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        foreach ($allowedTables as $tbl) {
            if (!array_key_exists($tbl, $data) || !is_array($data[$tbl])) {
                continue;
            }
            $rows = $data[$tbl];
            $pdo->exec("DELETE FROM `$tbl`");
            foreach ($rows as $row) {
                if (!is_array($row) || empty($row)) {
                    continue;
                }
                $cols = array_keys($row);
                $safeCols = [];
                $placeholders = [];
                $vals = [];
                foreach ($cols as $c) {
                    if (preg_match('/^[a-zA-Z0-9_]+$/', (string)$c) === 1) {
                        $safeCols[] = "`$c`";
                        $placeholders[] = '?';
                        $vals[] = $row[$c];
                    }
                }
                if (!empty($safeCols)) {
                    $sql = sprintf(
                        'INSERT INTO `%s` (%s) VALUES (%s)',
                        $tbl,
                        implode(', ', $safeCols),
                        implode(', ', $placeholders)
                    );
                    $pdo->prepare($sql)->execute($vals);
                }
            }
            $restoredTables[] = $tbl;
        }
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
        $pdo->commit();
    } catch (Throwable $ex) {
        try {
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
            $pdo->rollBack();
        } catch (Throwable $ignored) {
        }
        return ['ok' => false, 'error' => 'Restore failed cleanly (rolled back): ' . $ex->getMessage()];
    }

    return [
        'ok'             => true,
        'safetyBackup'   => $safety['fileName'],
        'restoredTables' => $restoredTables,
    ];
}

function runScheduledBackupIfDue(PDO $pdo, string $actorEmail = 'scheduler@svcoer.edu.in', bool $force = false): array
{
    $schedule = getBackupSchedule($pdo);
    if (!$force && (empty($schedule['enabled']) || ($schedule['frequency'] ?? 'disabled') === 'disabled')) {
        return ['ran' => false, 'reason' => 'Scheduled backups are disabled'];
    }
    $now = time();
    if (!$force && !empty($schedule['nextRunAt'])) {
        $nextTs = strtotime((string)$schedule['nextRunAt']);
        if ($nextTs !== false && $now < $nextTs) {
            return ['ran' => false, 'reason' => 'Not due until ' . $schedule['nextRunAt']];
        }
    }

    $rec = createBackupArchive(
        $pdo,
        (string)($schedule['mode'] ?? 'incremental'),
        (string)($schedule['destination'] ?? 'local'),
        $actorEmail,
        $schedule
    );
    $schedule['lastRunAt'] = gmdate('Y-m-d\TH:i:s\Z', $now);
    $schedule['nextRunAt'] = computeNextRunIso((string)($schedule['frequency'] ?? 'daily'), $now);
    kvSet($pdo, 'backup_schedule', $schedule);
    return ['ran' => true, 'record' => $rec, 'schedule' => $schedule];
}
