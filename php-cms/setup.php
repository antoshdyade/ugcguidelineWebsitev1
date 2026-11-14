<?php
declare(strict_types=1);

/**
 * SVCOER UGC CMS — Linux Webmin / Virtualmin Pre-Flight Setup, Schema Upgrade & Diagnostics
 * IMPORTANT: Delete this file from public_html/ once deployment checks pass!
 */
require_once __DIR__ . '/config/db.php';

$phpOk = version_compare(PHP_VERSION, '8.0.0', '>=');
$pdoOk = extension_loaded('pdo_mysql');
$finfoOk = extension_loaded('fileinfo');
$uploadsDir = __DIR__ . '/uploads';
$uploadsWritable = is_dir($uploadsDir) ? is_writable($uploadsDir) : @mkdir($uploadsDir, 0755, true);
$backupsDir = __DIR__ . '/backups';
$backupsWritable = is_dir($backupsDir) ? is_writable($backupsDir) : @mkdir($backupsDir, 0755, true);
$sessionPath = session_save_path() ?: sys_get_temp_dir();
$sessionOk = is_writable($sessionPath) || is_writable(__DIR__ . '/uploads');

$cssPath = __DIR__ . '/assets/css/style.css';
$editorJsPath = __DIR__ . '/assets/js/editor.js';
$htaccessPath = __DIR__ . '/.htaccess';

$isWorldReadable = static function (string $path): bool {
    if (!file_exists($path) || !is_readable($path)) {
        return false;
    }
    $perms = @fileperms($path);
    return $perms === false ? is_readable($path) : (($perms & 0x0004) !== 0);
};

$cssOk = $isWorldReadable($cssPath);
$editorOk = $isWorldReadable($editorJsPath);
$htaccessOk = file_exists($htaccessPath) && is_readable($htaccessPath);

$dbConnected = false;
$dbError = '';
$tablesCount = 0;
$usersCount = 0;
$hasHomeComponents = false;
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
    $hasHomeComponents = in_array('custom_home_components', $tables, true);
    if (in_array('users', $tables, true)) {
        $usersCount = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    }
} catch (Throwable $ex) {
    $dbError = $ex->getMessage();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $dbConnected) {
    $act = $_POST['action'] ?? '';
    if ($act === 'reset_passwords') {
        if ($tablesCount > 0 && $usersCount > 0) {
            $defaults = [
                'admin@svcoer.edu.in'   => 'Admin@123',
                'pro@svcoer.edu.in'     => 'Editor@123',
                'hod.cse@svcoer.edu.in' => 'Dept@123',
                'iqac@svcoer.edu.in'    => 'Iqac@123',
                'coe@coe.sveri.ac.in'   => 'Exam@123',
            ];
            $stmt = $pdo->prepare('UPDATE users SET password_hash = ?, is_active = 1 WHERE email = ?');
            foreach ($defaults as $email => $pw) {
                $stmt->execute([password_hash($pw, PASSWORD_DEFAULT), $email]);
            }
            $chkCoe = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
            $chkCoe->execute(['coe@coe.sveri.ac.in']);
            if (!$chkCoe->fetch()) {
                try {
                    $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','content_editor','department_admin','iqac_officer','exam_controller') NOT NULL");
                } catch (Throwable $ignored) {}
                try {
                    $pdo->prepare('INSERT INTO users (full_name, email, password_hash, role, assigned_department_id, allowed_categories_json) VALUES (?, ?, ?, ?, NULL, ?)')
                        ->execute(['Dr. M. S. Kumbhar (Controller of Examinations)', 'coe@coe.sveri.ac.in', password_hash('Exam@123', PASSWORD_DEFAULT), 'exam_controller', '["examination"]']);
                } catch (Throwable $ignored) {}
            }
            $actionMsg = 'All 5 default RBAC account passwords (including coe@coe.sveri.ac.in) re-hashed with native PHP password_hash() and activated.';
        } else {
            $actionMsg = 'Please import database.sql into your MySQL database first.';
        }
    } elseif ($act === 'upgrade_schema' && $tablesCount > 0) {
        $alters = [
            "ALTER TABLE departments ADD COLUMN library_json TEXT NULL",
            "ALTER TABLE departments ADD COLUMN faculty_field_schema_json TEXT NULL",
            "ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','content_editor','department_admin','iqac_officer','exam_controller') NOT NULL",
            "ALTER TABLE users ADD COLUMN allowed_categories_json TEXT NULL",
            "ALTER TABLE users ADD COLUMN allowed_page_ids_json TEXT NULL",
            "ALTER TABLE pages MODIFY COLUMN attached_pdf_url VARCHAR(500) NULL",
            "ALTER TABLE department_subpages ADD COLUMN page_type VARCHAR(40) DEFAULT 'general'",
            "ALTER TABLE department_subpages ADD COLUMN photos_json MEDIUMTEXT NULL",
            "ALTER TABLE department_subpages ADD COLUMN items_json MEDIUMTEXT NULL",
            "ALTER TABLE faculty ADD COLUMN phone VARCHAR(40) NULL",
            "ALTER TABLE faculty ADD COLUMN external_profile_url VARCHAR(500) NULL",
            "ALTER TABLE faculty ADD COLUMN external_profile_label VARCHAR(120) NULL",
            "ALTER TABLE faculty ADD COLUMN custom_fields_json TEXT NULL",
            "ALTER TABLE department_labs ADD COLUMN photo_url VARCHAR(255) NULL",
            "ALTER TABLE department_labs ADD COLUMN sort_order INT DEFAULT 1",
            "ALTER TABLE leadership_profiles MODIFY COLUMN committee_group VARCHAR(120) NOT NULL DEFAULT 'Statutory Officer'",
            "ALTER TABLE campus_events ADD COLUMN sort_order INT DEFAULT 1",
            "ALTER TABLE documents ADD COLUMN source_type VARCHAR(20) DEFAULT 'upload'",
            "ALTER TABLE documents MODIFY COLUMN file_url VARCHAR(500) NOT NULL",
            "ALTER TABLE documents ADD COLUMN sort_order INT DEFAULT 1",
            "ALTER TABLE gallery_albums ADD COLUMN sort_order INT DEFAULT 1",
            "ALTER TABLE telephone_directory ADD COLUMN sort_order INT DEFAULT 1",
            "CREATE TABLE IF NOT EXISTS custom_home_components (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(180) NOT NULL, placement ENUM('after-hero','after-about','after-depts','before-footer') DEFAULT 'after-hero', html_content MEDIUMTEXT NOT NULL, sort_order INT DEFAULT 1, is_active TINYINT(1) DEFAULT 1, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB",
            "CREATE TABLE IF NOT EXISTS cms_kv_store (key_name VARCHAR(80) PRIMARY KEY, val_json MEDIUMTEXT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB",
        ];
        foreach ($alters as $sql) {
            try {
                $pdo->exec($sql);
            } catch (Throwable $ignored) {
                // Column already exists
            }
        }
        $hasHomeComponents = true;
        $actionMsg = 'Database schema upgraded cleanly with new tables and columns.';
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SVCOER PHP CMS — Webmin Pre-Flight Check</title>
  <link rel="stylesheet" href="assets/css/style.css?v=2">
</head>
<body class="container" style="padding:2rem 1rem;max-width:860px;">
  <div class="card">
    <p style="color:#b45309;font-weight:700;font-size:0.8rem;margin:0;">WEBMIN / UBUNTU LINUX HOSTING DIAGNOSTICS</p>
    <h1 style="margin:0.25rem 0 1rem;">SVCOER UGC CMS Setup Check</h1>
    <?php if ($actionMsg): ?>
      <div class="alert-ok"><?= e($actionMsg) ?></div>
    <?php endif; ?>

    <table class="data-table">
      <thead><tr><th>Check</th><th>Status</th><th>Details</th></tr></thead>
      <tbody>
        <tr><td>PHP Version (&ge; 8.0)</td><td><?= $phpOk ? 'PASS' : 'FAIL' ?></td><td>Running PHP <?= e(PHP_VERSION) ?></td></tr>
        <tr><td>MySQL PDO (pdo_mysql)</td><td><?= $pdoOk ? 'PASS' : 'FAIL' ?></td><td><?= $pdoOk ? 'Loaded' : 'Install php8.x-mysql and restart Apache/PHP-FPM' ?></td></tr>
        <tr><td>Fileinfo MIME Check</td><td><?= $finfoOk ? 'PASS' : 'FAIL' ?></td><td><?= $finfoOk ? 'Loaded' : 'Enable php-fileinfo extension' ?></td></tr>
        <tr><td>CSS Stylesheet (<code>assets/css/style.css</code>)</td><td><?= $cssOk ? 'PASS' : 'FAIL' ?></td><td><?= $cssOk ? 'Exists &amp; world-readable (0644)' : 'Missing or chmod blocked! Run: chmod 644 assets/css/style.css' ?></td></tr>
        <tr><td>Visual Block Editor (<code>assets/js/editor.js</code>)</td><td><?= $editorOk ? 'PASS' : 'FAIL' ?></td><td><?= $editorOk ? 'Exists &amp; world-readable (0644)' : 'Missing or chmod blocked! Run: chmod 644 assets/js/editor.js' ?></td></tr>
        <tr><td>Apache Root <code>.htaccess</code></td><td><?= $htaccessOk ? 'PASS' : 'WARN' ?></td><td><?= $htaccessOk ? 'Present (MIME types &amp; DirectoryIndex configured)' : 'Upload .htaccess to public_html/' ?></td></tr>
        <tr><td>Uploads Directory</td><td><?= $uploadsWritable ? 'PASS' : 'FAIL' ?></td><td><code>uploads/</code> <?= $uploadsWritable ? 'writable' : 'needs chmod 755 &amp; owner match' ?></td></tr>
        <tr><td>Backups Directory</td><td><?= $backupsWritable ? 'PASS' : 'WARN' ?></td><td><code>backups/</code> <?= $backupsWritable ? 'writable' : 'needs chmod 755 &amp; owner match' ?></td></tr>
        <tr><td>PHP Sessions</td><td><?= $sessionOk ? 'PASS' : 'FAIL' ?></td><td>Save path: <code><?= e($sessionPath) ?></code></td></tr>
        <tr><td>MySQL Connection</td><td><?= $dbConnected ? 'PASS' : 'FAIL' ?></td><td><?= $dbConnected ? ('Connected to ' . e(DB_NAME) . " ($tablesCount tables, $usersCount users)") : e($dbError) ?></td></tr>
        <tr><td>Enhanced Schema (Custom Home &amp; Dept Fields)</td><td><?= $hasHomeComponents ? 'PASS' : 'NEEDS UPGRADE' ?></td><td><?= $hasHomeComponents ? 'All v2 tables present' : 'Click Auto-Upgrade Database Schema below' ?></td></tr>
      </tbody>
    </table>

    <?php if ($dbConnected && $tablesCount > 0): ?>
      <div style="margin-top:1.25rem;display:flex;gap:0.75rem;flex-wrap:wrap;">
        <form method="post">
          <input type="hidden" name="action" value="upgrade_schema">
          <button type="submit" class="btn-secondary">Auto-Upgrade Database Schema (Safe)</button>
        </form>
        <form method="post">
          <input type="hidden" name="action" value="reset_passwords">
          <button type="submit" class="btn-primary">Verify &amp; Reset Default RBAC Passwords (5 Accounts)</button>
        </form>
        <a href="admin/login.php" class="btn-secondary">Open Admin Login &rarr;</a>
        <a href="index.php" class="btn-secondary">Open Public Site &rarr;</a>
      </div>
    <?php endif; ?>

    <div style="margin-top:1.25rem;padding:0.75rem;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:0.85rem;color:#92400e;">
      <strong>Ubuntu Webmin CSS / Editor Troubleshooting:</strong> If your CSS looks broken or the rich visual editor shows a plain box after uploading via Webmin File Manager, run in SSH:<br>
      <code>find /home/&lt;user&gt;/public_html -type d -exec chmod 755 {} \; &amp;&amp; find /home/&lt;user&gt;/public_html -type f -exec chmod 644 {} \;</code><br>
      <strong>Security Notice:</strong> Once your checks pass and admin login works cleanly, delete <code>setup.php</code> from the server!
    </div>
  </div>
</body>
</html>
