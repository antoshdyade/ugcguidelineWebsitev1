<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('settings');
$pdo = getDB();
$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $stmt = $pdo->prepare('UPDATE site_settings SET institution_name = ?, affiliation = ?, address = ?, phone = ?, email = ?, emergency_helpline = ?, anti_ragging_helpline = ?, primary_color = ?, secondary_color = ? WHERE id = 1');
    $stmt->execute([
        trim($_POST['institution_name']),
        trim($_POST['affiliation']),
        trim($_POST['address']),
        trim($_POST['phone']),
        trim($_POST['email']),
        trim($_POST['emergency_helpline']),
        trim($_POST['anti_ragging_helpline']),
        trim($_POST['primary_color']),
        trim($_POST['secondary_color']),
    ]);
    logAudit($pdo, $user, 'UPDATE_SETTINGS', 'Settings', $_POST['institution_name']);
    $msg = 'Site settings saved.';
}

$s = getSiteSettings($pdo);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Site Settings</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="container" style="padding:2rem 1rem;">
  <p><a href="dashboard.php">&larr; Dashboard</a></p>
  <h1>Site Settings &amp; Default Theme</h1>
  <?php if ($msg): ?><p style="color:#15803d;font-weight:600;"><?= e($msg) ?></p><?php endif; ?>

  <form method="post" class="card" style="max-width:720px;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <label style="display:block;margin-bottom:0.5rem;">Institution Name
      <input type="text" name="institution_name" value="<?= e($s['institution_name']) ?>" style="width:100%;padding:0.5rem;">
    </label>
    <label style="display:block;margin-bottom:0.5rem;">Affiliation Subtitle
      <input type="text" name="affiliation" value="<?= e($s['affiliation']) ?>" style="width:100%;padding:0.5rem;">
    </label>
    <label style="display:block;margin-bottom:0.5rem;">Address
      <input type="text" name="address" value="<?= e($s['address']) ?>" style="width:100%;padding:0.5rem;">
    </label>
    <div class="grid-2" style="margin-bottom:0.5rem;">
      <label>Phone <input type="text" name="phone" value="<?= e($s['phone']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Email <input type="email" name="email" value="<?= e($s['email']) ?>" style="width:100%;padding:0.5rem;"></label>
    </div>
    <div class="grid-2" style="margin-bottom:0.5rem;">
      <label>Emergency Helpline <input type="text" name="emergency_helpline" value="<?= e($s['emergency_helpline']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Anti-Ragging Helpline <input type="text" name="anti_ragging_helpline" value="<?= e($s['anti_ragging_helpline']) ?>" style="width:100%;padding:0.5rem;"></label>
    </div>
    <div class="grid-2" style="margin-bottom:1rem;">
      <label>Default Primary Hex <input type="color" name="primary_color" value="<?= e($s['primary_color']) ?>"></label>
      <label>Default Secondary Hex <input type="color" name="secondary_color" value="<?= e($s['secondary_color']) ?>"></label>
    </div>
    <button type="submit" class="btn-primary">Save Settings</button>
  </form>
</body>
</html>
