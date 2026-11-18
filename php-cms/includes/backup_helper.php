<?php
declare(strict_types=1);

/**
 * SVCOER PHP CMS — Backup, Incremental Diff, SCP/Google Drive Export & Restore Helper
 */

function backupTablesList(): array
{
    return [
        'site_settings',
        'users',
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
        'alumni_profiles',
        'alumni_jobs',
        'alumni_events',
        'alumni_discussion_topics',
        'alumni_discussion_posts',
        'alumni_discussion_comments',
        'alumni_achievers',
        'alumni_pledges',
        'conferences',
        'conference_submissions',
        'conference_registrations',
        'placement_stats',
        'placement_stories',
        'placement_notices',
        'placement_custom_sections',
        'grievances',
        'sports_facilities',
        'sports_events',
        'sports_achievements',
        'sports_gallery',
        'sports_notices',
        'facilities',
        'visitor_logs',
        'security_blocked_ips',
        'cms_kv_store',
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

function kvGet(PDO $pdo, string $key, $default = null)
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

function kvSet(PDO $pdo, string $key, $value): void
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
    switch ($frequency) {
        case 'hourly':
            return gmdate('Y-m-d\TH:i:s\Z', $fromTs + 3600);
        case 'daily':
            return gmdate('Y-m-d\TH:i:s\Z', $fromTs + 86400);
        case 'weekly':
            return gmdate('Y-m-d\TH:i:s\Z', $fromTs + 604800);
        default:
            return null;
    }
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
        $isZipFile = str_ends_with(strtolower($fileName), '.zip');
        $payload = json_encode([
            'filename'      => $fileName,
            'mimeType'      => $isZipFile ? 'application/zip' : 'application/json',
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

function validateBackupPackage($decoded): array
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

/**
 * Pure-PHP ZIP Writer/Reader fallback when ext-zip (ZipArchive) is not enabled on Webmin.
 */
final class SvcoerMiniZip
{
    public static function writeFile(string $destPath, array $entries): bool
    {
        $fh = @fopen($destPath, 'wb');
        if (!$fh) {
            return false;
        }
        $centralDir = '';
        $offset = 0;
        $count = 0;
        foreach ($entries as $name => $rawData) {
            $name = ltrim(str_replace('\\', '/', (string)$name), '/');
            if ($name === '' || str_contains($name, '..')) {
                continue;
            }
            $data = (string)$rawData;
            $uncompressedLen = strlen($data);
            $crc = crc32($data);
            $method = 0;
            $compressed = $data;
            if ($uncompressedLen > 64 && function_exists('gzdeflate')) {
                $def = @gzdeflate($data, 6);
                if ($def !== false && strlen($def) < $uncompressedLen) {
                    $method = 8;
                    $compressed = $def;
                }
            }
            $compLen = strlen($compressed);
            $nameLen = strlen($name);
            $dosTime = 0x0000;
            $dosDate = 0x5421;

            $localHeader = pack(
                'VvvvvvVVVvv',
                0x04034b50,
                20,
                0x0800,
                $method,
                $dosTime,
                $dosDate,
                $crc,
                $compLen,
                $uncompressedLen,
                $nameLen,
                0
            ) . $name . $compressed;

            fwrite($fh, $localHeader);

            $centralHeader = pack(
                'VvvvvvvVVVvvvvvVV',
                0x02014b50,
                20,
                20,
                0x0800,
                $method,
                $dosTime,
                $dosDate,
                $crc,
                $compLen,
                $uncompressedLen,
                $nameLen,
                0,
                0,
                0,
                0,
                0,
                $offset
            ) . $name;

            $centralDir .= $centralHeader;
            $offset += strlen($localHeader);
            $count++;
        }

        $eocd = pack(
            'VvvvvVVv',
            0x06054b50,
            0,
            0,
            $count,
            $count,
            strlen($centralDir),
            $offset,
            0
        );
        fwrite($fh, $centralDir . $eocd);
        fclose($fh);
        return true;
    }

    public static function readEntries(string $zipPath): array
    {
        $bin = @file_get_contents($zipPath);
        if ($bin === false || strlen($bin) < 22) {
            return [];
        }
        $eocdPos = strrpos($bin, "\x50\x4b\x05\x06");
        if ($eocdPos === false || $eocdPos + 22 > strlen($bin)) {
            return [];
        }
        $eocd = unpack('Vsig/vdisk/vcdDisk/vdiskEntries/vtotalEntries/VcdSize/VcdOffset/vcommentLen', substr($bin, $eocdPos, 22));
        if (!$eocd) {
            return [];
        }
        $pos = (int)$eocd['cdOffset'];
        $total = (int)$eocd['totalEntries'];
        $out = [];
        for ($i = 0; $i < $total; $i++) {
            if ($pos + 46 > strlen($bin)) {
                break;
            }
            $hdr = unpack(
                'Vsig/vverMade/vverNeed/vflags/vmethod/vmtime/vmdate/Vcrc/VcompSize/VuncompSize/vnameLen/vextraLen/vcommentLen/vdiskStart/vintAttr/VextAttr/VlocalOffset',
                substr($bin, $pos, 46)
            );
            if (!$hdr || $hdr['sig'] !== 0x02014b50) {
                break;
            }
            $name = substr($bin, $pos + 46, (int)$hdr['nameLen']);
            $pos += 46 + (int)$hdr['nameLen'] + (int)$hdr['extraLen'] + (int)$hdr['commentLen'];

            $lOffset = (int)$hdr['localOffset'];
            if ($lOffset + 30 > strlen($bin)) {
                continue;
            }
            $lh = unpack('Vsig/vver/vflags/vmethod/vmtime/vmdate/Vcrc/VcompSize/VuncompSize/vnameLen/vextraLen', substr($bin, $lOffset, 30));
            if (!$lh || $lh['sig'] !== 0x04034b50) {
                continue;
            }
            $dataOffset = $lOffset + 30 + (int)$lh['nameLen'] + (int)$lh['extraLen'];
            $compSize = (int)$hdr['compSize'];
            if ($dataOffset + $compSize > strlen($bin)) {
                continue;
            }
            $payload = substr($bin, $dataOffset, $compSize);
            if ((int)$hdr['method'] === 8 && function_exists('gzinflate')) {
                $dec = @gzinflate($payload);
                if ($dec !== false) {
                    $out[$name] = $dec;
                }
            } elseif ((int)$hdr['method'] === 0) {
                $out[$name] = $payload;
            }
        }
        return $out;
    }
}

function isSafeMigrationRestoreAsset(string $entryName): ?string
{
    $norm = ltrim(str_replace('\\', '/', $entryName), '/');
    if ($norm === '' || str_contains($norm, "\0") || str_contains($norm, '..')) {
        return null;
    }
    if (str_starts_with($norm, 'code/')) {
        $norm = substr($norm, 5);
    }
    $isUpload = str_starts_with($norm, 'uploads/');
    $isAssetImg = str_starts_with($norm, 'assets/images/');
    if (!$isUpload && !$isAssetImg) {
        return null;
    }
    $base = basename($norm);
    if ($base === '' || str_starts_with($base, '.')) {
        return null;
    }
    $parts = explode('.', strtolower($base));
    if (count($parts) < 2) {
        return null;
    }
    $blocked = ['php', 'phtml', 'php3', 'php4', 'php5', 'phar', 'exe', 'sh', 'bat', 'js', 'html', 'htm', 'svg', 'py', 'pl'];
    foreach (array_slice($parts, 1) as $seg) {
        if (in_array($seg, $blocked, true)) {
            return null;
        }
    }
    $ext = end($parts);
    if (!in_array($ext, ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'docx', 'xlsx'], true)) {
        return null;
    }
    return $norm;
}

function rewriteDomainUrlsRecursive($value, string $oldUrl, string $newUrl)
{
    $oldNorm = rtrim(trim($oldUrl), '/');
    $newNorm = rtrim(trim($newUrl), '/');
    if ($oldNorm === '' || $newNorm === '' || $oldNorm === $newNorm) {
        return $value;
    }
    if (is_string($value)) {
        $res = str_replace($oldNorm, $newNorm, $value);
        $oldHost = parse_url($oldNorm, PHP_URL_HOST);
        $newHost = parse_url($newNorm, PHP_URL_HOST);
        if ($oldHost && $newHost && $oldHost !== $newHost) {
            $res = str_replace('https://' . $oldHost, $newNorm, $res);
            $res = str_replace('http://' . $oldHost, $newNorm, $res);
        }
        return $res;
    }
    if (is_array($value)) {
        $out = [];
        foreach ($value as $k => $v) {
            if ($k === 'password_hash') {
                $out[$k] = $v;
                continue;
            }
            $out[$k] = rewriteDomainUrlsRecursive($v, $oldNorm, $newNorm);
        }
        return $out;
    }
    return $value;
}

function buildMigrationSqlDump(PDO $pdo, array $snapshot): string
{
    $lines = [
        '-- SVCOER CMS Full Site Migration SQL Dump',
        '-- Generated: ' . gmdate('Y-m-d\TH:i:s\Z'),
        'SET FOREIGN_KEY_CHECKS = 0;',
        '',
    ];
    foreach (backupTablesList() as $tbl) {
        $rows = $snapshot[$tbl] ?? [];
        $lines[] = "DELETE FROM `$tbl`;";
        if (!is_array($rows)) {
            continue;
        }
        foreach ($rows as $row) {
            if (!is_array($row) || empty($row)) {
                continue;
            }
            $cols = [];
            $vals = [];
            foreach ($row as $k => $v) {
                if (preg_match('/^[a-zA-Z0-9_]+$/', (string)$k) !== 1) {
                    continue;
                }
                $cols[] = "`$k`";
                $vals[] = $v === null ? 'NULL' : $pdo->quote((string)$v);
            }
            if (!empty($cols)) {
                $lines[] = sprintf('INSERT INTO `%s` (%s) VALUES (%s);', $tbl, implode(', ', $cols), implode(', ', $vals));
            }
        }
        $lines[] = '';
    }
    $lines[] = 'SET FOREIGN_KEY_CHECKS = 1;';
    return implode("\n", $lines);
}

function collectPhpCmsFilesForMigration(): array
{
    $root = realpath(dirname(__DIR__));
    if (!$root) {
        return ['code' => [], 'media' => []];
    }
    $codeEntries = [];
    $mediaEntries = [];
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
    );
    foreach ($it as $file) {
        if (!$file->isFile()) {
            continue;
        }
        $full = str_replace('\\', '/', $file->getPathname());
        $rootNorm = str_replace('\\', '/', $root);
        $rel = ltrim(substr($full, strlen($rootNorm)), '/');

        if (
            str_starts_with($rel, 'backups/')
            || str_starts_with($rel, 'uploads/.sessions')
            || str_starts_with($rel, '.git/')
            || $rel === 'config/config.local.php'
        ) {
            continue;
        }
        $data = @file_get_contents($full);
        if ($data === false) {
            continue;
        }
        if (str_starts_with($rel, 'uploads/') || str_starts_with($rel, 'assets/images/')) {
            $mediaEntries[$rel] = $data;
        } else {
            $codeEntries['code/' . $rel] = $data;
        }
    }
    return ['code' => $codeEntries, 'media' => $mediaEntries];
}

function createFullSiteMigrationZip(
    PDO $pdo,
    string $actorEmail,
    string $sourceOrigin = '',
    bool $includeData = true,
    bool $includeMedia = true,
    bool $includeCode = true,
    string $destination = 'local'
): array {
    $dir = ensureBackupsStorage();
    $schedule = getBackupSchedule($pdo);
    $snapshot = $includeData ? captureCmsSnapshot($pdo) : [];
    $kvExtras = $includeData
        ? [
            'alumni_settings' => kvGet($pdo, 'alumni_settings', function_exists('defaultAlumniSettings') ? defaultAlumniSettings() : []),
            'upload_policy'   => kvGet($pdo, 'upload_policy', null),
        ]
        : [];

    $id = 'mig-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(3));
    $fileName = 'svcoer-site-migration-' . gmdate('Ymd-His') . '.zip';
    $createdAt = gmdate('Y-m-d\TH:i:s\Z');
    $dataPayload = [
        'format'                 => 'svcoer-cms-backup',
        'version'                => 2,
        'id'                     => $id,
        'mode'                   => 'full',
        'archiveType'            => 'full_site_migration',
        'includesHashedSecrets'  => $includeData,
        'createdAt'              => $createdAt,
        'createdBy'              => $actorEmail,
        'entityCounts'           => $includeData ? countSnapshotEntities($snapshot) : [],
        'kvSettings'             => $kvExtras,
        'data'                   => $snapshot,
    ];
    $dataJson = json_encode($dataPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $checksum = hash('sha256', (string)$dataJson);

    $files = collectPhpCmsFilesForMigration();
    $selectedCode = $includeCode ? $files['code'] : [];
    $selectedMedia = $includeMedia ? $files['media'] : [];

    $manifest = [
        'format'        => 'svcoer-site-migration',
        'version'       => 1,
        'platform'      => 'php-mysql',
        'createdAt'     => $createdAt,
        'createdBy'     => $actorEmail,
        'sourceOrigin'  => $sourceOrigin,
        'sourceBaseUrl' => getBaseUrl(),
        'dataChecksum'  => $checksum,
        'includeData'   => $includeData,
        'includeMedia'  => $includeMedia,
        'includeCode'   => $includeCode,
        'mediaCount'    => count($selectedMedia),
        'codeCount'     => count($selectedCode),
        'entityCounts'  => $dataPayload['entityCounts'],
    ];

    $allEntries = array_merge($selectedCode, $selectedMedia, [
        'migration-manifest.json' => json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ]);
    if ($includeData) {
        $allEntries['migration-data.json'] = $dataJson;
        $allEntries['database-dump.sql'] = buildMigrationSqlDump($pdo, $snapshot);
    }

    $filePath = $dir . '/' . $fileName;
    if (class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($filePath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            foreach ($allEntries as $entryName => $entryContent) {
                $zip->addFromString($entryName, (string)$entryContent);
            }
            $zip->close();
        } else {
            SvcoerMiniZip::writeFile($filePath, $allEntries);
        }
    } else {
        SvcoerMiniZip::writeFile($filePath, $allEntries);
    }

    $destNormalized = in_array($destination, ['local', 'download', 'scp', 'gdrive_webhook'], true) ? $destination : 'local';
    if ($destNormalized === 'scp' || $destNormalized === 'gdrive_webhook') {
        $pushResult = pushBackupToDestination($filePath, $fileName, $destNormalized, $schedule, [
            'mode'      => 'full_site_migration',
            'createdAt' => $createdAt,
            'checksum'  => $checksum,
        ]);
    } else {
        $pushResult = [
            'ok'     => true,
            'status' => $destNormalized === 'download'
                ? 'Generated & downloaded to local computer (.zip)'
                : 'Saved to server disk (' . count($selectedCode) . ' code, ' . count($selectedMedia) . ' media)',
        ];
    }

    $record = [
        'id'             => $id,
        'fileName'       => $fileName,
        'mode'           => 'full',
        'archiveType'    => 'full_site_migration',
        'destination'    => $destNormalized,
        'createdAt'      => $createdAt,
        'createdBy'      => $actorEmail,
        'sizeBytes'      => (int)@filesize($filePath),
        'checksum'       => $checksum,
        'mediaCount'     => count($selectedMedia),
        'codeCount'      => count($selectedCode),
        'entityCounts'   => $dataPayload['entityCounts'],
        'transferStatus' => $pushResult['status'],
        'transferOk'     => $pushResult['ok'],
    ];

    $index = kvGet($pdo, 'backup_index', []);
    if (!is_array($index)) {
        $index = [];
    }
    array_unshift($index, $record);
    kvSet($pdo, 'backup_index', $index);

    return $record;
}

function readZipMigrationEntries(string $zipPath): array
{
    if (class_exists('ZipArchive')) {
        $zip = new ZipArchive();
        if ($zip->open($zipPath) === true) {
            $entries = [];
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if ($name !== false && !str_ends_with($name, '/')) {
                    $content = $zip->getFromIndex($i);
                    if ($content !== false) {
                        $entries[$name] = $content;
                    }
                }
            }
            $zip->close();
            return $entries;
        }
    }
    return SvcoerMiniZip::readEntries($zipPath);
}

function inspectSiteMigrationZip(string $zipPath): array
{
    $entries = readZipMigrationEntries($zipPath);
    if (empty($entries)) {
        return ['valid' => false, 'error' => 'Unable to read .zip archive or archive is empty.'];
    }
    $dataRaw = $entries['migration-data.json'] ?? ($entries['database-backup.json'] ?? null);
    if ($dataRaw === null) {
        return ['valid' => false, 'error' => 'Archive does not contain migration-data.json or database-backup.json.'];
    }
    $pkg = json_decode((string)$dataRaw, true);
    $val = validateBackupPackage($pkg);
    if (!$val['valid']) {
        return $val;
    }
    $manifest = [];
    if (!empty($entries['migration-manifest.json'])) {
        $decMan = json_decode((string)$entries['migration-manifest.json'], true);
        if (is_array($decMan)) {
            $manifest = $decMan;
        }
    }
    $mediaFiles = [];
    $codeFiles = 0;
    foreach ($entries as $name => $_content) {
        if (isSafeMigrationRestoreAsset($name) !== null) {
            $mediaFiles[] = $name;
        } elseif (str_starts_with($name, 'code/')) {
            $codeFiles++;
        }
    }
    return [
        'valid'         => true,
        'mode'          => $val['mode'],
        'createdAt'     => $val['createdAt'],
        'checksum'      => $val['checksum'],
        'counts'        => $val['counts'],
        'sourceOrigin'  => (string)($manifest['sourceOrigin'] ?? ''),
        'sourceBaseUrl' => (string)($manifest['sourceBaseUrl'] ?? ''),
        'mediaCount'    => count($mediaFiles),
        'codeCount'     => $codeFiles,
    ];
}

function restoreFromSiteMigrationZip(
    PDO $pdo,
    string $zipPath,
    string $actorEmail,
    string $oldBaseUrl = '',
    string $newBaseUrl = '',
    bool $restoreMedia = true
): array {
    $entries = readZipMigrationEntries($zipPath);
    $dataRaw = $entries['migration-data.json'] ?? ($entries['database-backup.json'] ?? null);
    if ($dataRaw === null) {
        return ['ok' => false, 'error' => 'Migration ZIP missing database payload JSON.'];
    }
    $pkg = json_decode((string)$dataRaw, true);
    if (!is_array($pkg)) {
        return ['ok' => false, 'error' => 'Invalid JSON payload inside migration ZIP.'];
    }

    if ($oldBaseUrl !== '' && $newBaseUrl !== '') {
        $pkg['data'] = rewriteDomainUrlsRecursive($pkg['data'] ?? [], $oldBaseUrl, $newBaseUrl);
        if (!empty($pkg['kvSettings']) && is_array($pkg['kvSettings'])) {
            $pkg['kvSettings'] = rewriteDomainUrlsRecursive($pkg['kvSettings'], $oldBaseUrl, $newBaseUrl);
        }
    }

    $res = restoreFromBackupPackage($pdo, $pkg, $actorEmail);
    if (!$res['ok']) {
        return $res;
    }

    if (!empty($pkg['kvSettings']) && is_array($pkg['kvSettings'])) {
        if (!empty($pkg['kvSettings']['alumni_settings']) && is_array($pkg['kvSettings']['alumni_settings'])) {
            kvSet($pdo, 'alumni_settings', $pkg['kvSettings']['alumni_settings']);
        }
        if (!empty($pkg['kvSettings']['upload_policy']) && is_array($pkg['kvSettings']['upload_policy'])) {
            kvSet($pdo, 'upload_policy', $pkg['kvSettings']['upload_policy']);
        }
    }

    $restoredFilesCount = 0;
    if ($restoreMedia) {
        $root = dirname(__DIR__);
        foreach ($entries as $entryName => $rawBytes) {
            $safeRel = isSafeMigrationRestoreAsset($entryName);
            if ($safeRel === null) {
                continue;
            }
            $dest = $root . '/' . $safeRel;
            $destDir = dirname($dest);
            if (!is_dir($destDir)) {
                @mkdir($destDir, 0755, true);
            }
            if (@file_put_contents($dest, $rawBytes) !== false) {
                $restoredFilesCount++;
            }
        }
    }

    $res['restoredMediaCount'] = $restoredFilesCount;
    return $res;
}

