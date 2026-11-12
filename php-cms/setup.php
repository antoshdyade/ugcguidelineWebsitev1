<?php
declare(strict_types=1);

/**
 * SVCOER UGC CMS — Linux Webmin / Virtualmin Pre-Flight Setup & Diagnostics
 * IMPORTANT: Delete this file from public_html/ once deployment checks pass!
 */
require_once __DIR__ . '/config/db.php';

$phpOk = version_compare(PHP_VERSION, '8.0.0', '>=');
$pdoOk = extension_loaded('pdo_mysql');
$finfoOk = extension_loaded('fileinfo');
$uploadsDir = __DIR__ . '/uploads';
$uploadsWritable = is_dir($uploadsDir) ? is_writable($uploadsDir) : @mkdir($uploadsDir, 0755, true);
$sessionPath = session_save_path() ?: sys_get_temp_dir();
$sessionOk = is_writable($sessionPath) || is_writable(__DIR__ . '/uploads');

$dbConnected = false;
$dbError = '';
$tablesCount = 0;
$usersCount = 0;
$actionMsg = '';

try {
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $dbConnected = true;
    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    $tablesCount = count($tables);
    if (in_array('users', $tables, true)) {
        $usersCount = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    }
} catch (Throwable $ex) {
    $dbError = $ex->getMessage();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $dbConnected && ($_POST['action'] ?? '') === 'reset_passwords') {
    if ($tablesCount > 0 && $usersCount > 0) {
        $defaults = [
            'admin@svcoer.edu.in'   => 'Admin@123',
            'pro@svcoer.edu.in'     => 'Editor@123',
            'hod.cse@svcoer.edu.in' => 'Dept@123',
            'iqac@svcoer.edu.in'    => 'Iqac@123',
        ];
        $stmt = $pdo->prepare('UPDATE users SET password_hash = ?, is_active = 1 WHERE email = ?');
        foreach ($defaults as $email => $pw) {
            $stmt->execute([password_hash($pw, PASSWORD_DEFAULT), $email]);
        }
        $actionMsg = 'All 4 default RBAC account passwords re-hashed with native PHP password_hash() and activated.';
    } else {
        $actionMsg = 'Please import database.sql into your MySQL database first.';
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SVCOER PHP CMS — Webmin Pre-Flight Check</title>
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="container" style="padding:2rem 1rem;max-width:820px;">
  <div class="card">
    <p style="color:#b45309;font-weight:700;font-size:0.8rem;margin:0;">WEBMIN / LINUX HOSTING DIAGNOSTICS</p>
    <h1 style="margin:0.25rem 0 1rem;">SVCOER UGC CMS Setup Check</h1>
    <?php if ($actionMsg): ?>
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:0.75rem;border-radius:8px;margin-bottom:1rem;"><?= e($actionMsg) ?></div>
    <?php endif; ?>

    <table class="data-table">
      <thead><tr><th>Check</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>
        <tr><td>PHP Version (&ge; 8.0)</td><td><?= $phpOk ? 'PASS' : 'FAIL' ?></td><td>Running PHP <?= e(PHP_VERSION) ?></td></tr>
        <tr><td>MySQL PDO (pdo_mysql)</td><td><?= $pdoOk ? 'PASS' : 'FAIL' ?></td><td><?= $pdoOk ? 'Loaded' : 'Install php8.x-mysql and restart Apache/PHP-FPM' ?></td></tr>
        <tr><td>Fileinfo MIME Check</td><td><?= $finfoOk ? 'PASS' : 'FAIL' ?></td><td><?= $finfoOk ? 'Loaded' : 'Enable php-fileinfo extension' ?></td></tr>
        <tr><td>Uploads Directory</td><td><?= $uploadsWritable ? 'PASS' : 'FAIL' ?></td><td><code>uploads/</code> <?= $uploadsWritable ? 'writable' : 'needs chmod 755 & owner match' ?></td></tr>
        <tr><td>PHP Sessions</td><td><?= $sessionOk ? 'PASS' : 'FAIL' ?></td><td>Save path: <code><?= e($sessionPath) ?></code></td></tr>
        <tr><td>MySQL Connection</td><td><?= $dbConnected ? 'PASS' : 'FAIL' ?></td><td><?= $dbConnected ? ('Connected to ' . e(DB_NAME) . " ($tablesCount tables, $usersCount users)") : e($dbError) ?></td></tr>
      </tbody>
    </table>

    <?php if ($dbConnected && $tablesCount > 0): ?>
      <form method="post" style="margin-top:1.25rem;display:flex;gap:0.75rem;flex-wrap:wrap;">
        <input type="hidden" name="action" value="reset_passwords">
        <button type="submit" class="btn-primary">Verify &amp; Reset Default RBAC Passwords</button>
        <a href="admin/login.php" class="btn-secondary">Open Admin Login &rarr;</a>
        <a href="index.php" class="btn-secondary">Open Public Site &rarr;</a>
      </form>
    <?php endif; ?>

    <div style="margin-top:1.25rem;padding:0.75rem;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:0.85rem;color:#92400e;">
      <strong>Security Notice:</strong> Once your admin login works cleanly, remove <code>setup.php</code> from the server!
    </div>
  </div>
</body>
</html>
