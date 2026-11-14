<?php
declare(strict_types=1);

/**
 * CLI Cron Entrypoint for Webmin / Ubuntu Scheduled Backups
 * Usage: php /path/to/public_html/cron_backup.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Forbidden: Run cron_backup.php via CLI / Webmin Scheduled Cron Jobs only.\n");
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/backup_helper.php';

$pdo = getDB();
$result = runScheduledBackupIfDue($pdo, 'webmin-cron@svcoer.edu.in', false);

if (!empty($result['ran'])) {
    $rec = $result['record'];
    echo sprintf(
        "[OK] Scheduled %s backup created: %s (%s)\n",
        $rec['mode'],
        $rec['fileName'],
        $rec['transferStatus']
    );
    exit(0);
}

echo '[SKIP] ' . ($result['reason'] ?? 'Not due') . "\n";
exit(0);
