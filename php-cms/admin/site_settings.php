<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('settings');
$pdo = getDB();
$msg = '';
$err = '';
$s = getSiteSettings($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $logoUrl = $s['logo_url'] ?? '';
    if (!empty($_FILES['logo_file']['name'])) {
        $up = handleSecureUpload($_FILES['logo_file'], __DIR__ . '/../uploads');
        if ($up['ok']) $logoUrl = $up['file_url'];
        else $err = $up['error'];
    }
    $aboutImg = $s['about_image_url'] ?? 'assets/images/hero_campus.jpg';
    if (!empty($_FILES['about_image_file']['name'])) {
        $up = handleSecureUpload($_FILES['about_image_file'], __DIR__ . '/../uploads');
        if ($up['ok']) $aboutImg = $up['file_url'];
        else $err = $up['error'];
    }

    if ($err === '') {
        $stmt = $pdo->prepare(
            'UPDATE site_settings SET trust_name = ?, institution_name = ?, short_code = ?, logo_url = ?, affiliation = ?, aicte_code = ?, dte_code = ?, address = ?, phone = ?, email = ?, emergency_helpline = ?, anti_ragging_helpline = ?, primary_color = ?, secondary_color = ?, about_summary = ?, about_image_url = ?, vision_text = ?, mission_text = ?, recruiters = ? WHERE id = 1'
        );
        $stmt->execute([
            trim($_POST['trust_name']),
            trim($_POST['institution_name']),
            trim($_POST['short_code']),
            $logoUrl,
            trim($_POST['affiliation']),
            trim($_POST['aicte_code']),
            trim($_POST['dte_code']),
            trim($_POST['address']),
            trim($_POST['phone']),
            trim($_POST['email']),
            trim($_POST['emergency_helpline']),
            trim($_POST['anti_ragging_helpline']),
            trim($_POST['primary_color']),
            trim($_POST['secondary_color']),
            trim($_POST['about_summary']),
            $aboutImg,
            trim($_POST['vision_text']),
            trim($_POST['mission_text']),
            trim($_POST['recruiters']),
        ]);
        logAudit($pdo, $user, 'UPDATE_SETTINGS', 'Settings', $_POST['institution_name']);
        $msg = 'Site settings saved.';
        $s = getSiteSettings($pdo);
    }
}
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
  <h1>Site Settings, Branding &amp; Homepage Charter</h1>
  <?php if ($msg): ?><p style="color:#15803d;font-weight:600;"><?= e($msg) ?></p><?php endif; ?>
  <?php if ($err): ?><p style="color:#b91c1c;font-weight:600;"><?= e($err) ?></p><?php endif; ?>

  <form method="post" enctype="multipart/form-data" class="card" style="max-width:860px;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Trust / Society Name <input type="text" name="trust_name" value="<?= e($s['trust_name'] ?? '') ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Short Code <input type="text" name="short_code" value="<?= e($s['short_code'] ?? 'SVCOER') ?>" style="width:100%;padding:0.5rem;"></label>
    </div>
    <label style="display:block;margin-bottom:0.65rem;">Institution Name
      <input type="text" name="institution_name" value="<?= e($s['institution_name']) ?>" style="width:100%;padding:0.5rem;">
    </label>
    <label style="display:block;margin-bottom:0.65rem;">Affiliation Subtitle
      <input type="text" name="affiliation" value="<?= e($s['affiliation']) ?>" style="width:100%;padding:0.5rem;">
    </label>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>DTE Institute Code <input type="text" name="dte_code" value="<?= e($s['dte_code']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>AICTE Permanent ID <input type="text" name="aicte_code" value="<?= e($s['aicte_code']) ?>" style="width:100%;padding:0.5rem;"></label>
    </div>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Upload Institution Logo (PNG/JPG/WEBP): <input type="file" name="logo_file" accept="image/jpeg,image/png,image/webp"></label>
      <label>Upload About Us Campus Photo: <input type="file" name="about_image_file" accept="image/jpeg,image/png,image/webp"></label>
    </div>
    <label style="display:block;margin-bottom:0.65rem;">About Us Homepage Summary
      <textarea name="about_summary" rows="3" style="width:100%;padding:0.5rem;"><?= e($s['about_summary'] ?? '') ?></textarea>
    </label>
    <label style="display:block;margin-bottom:0.65rem;">Vision Statement
      <textarea name="vision_text" rows="2" style="width:100%;padding:0.5rem;"><?= e($s['vision_text'] ?? '') ?></textarea>
    </label>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Mission Statements (1 per line)
        <textarea name="mission_text" rows="4" style="width:100%;padding:0.5rem;"><?= e($s['mission_text'] ?? '') ?></textarea>
      </label>
      <label>Top Recruiters (1 company per line)
        <textarea name="recruiters" rows="4" style="width:100%;padding:0.5rem;"><?= e($s['recruiters'] ?? '') ?></textarea>
      </label>
    </div>
    <label style="display:block;margin-bottom:0.65rem;">Address <input type="text" name="address" value="<?= e($s['address']) ?>" style="width:100%;padding:0.5rem;"></label>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Phone <input type="text" name="phone" value="<?= e($s['phone']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Email <input type="email" name="email" value="<?= e($s['email']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Emergency Helpline <input type="text" name="emergency_helpline" value="<?= e($s['emergency_helpline']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Anti-Ragging Helpline <input type="text" name="anti_ragging_helpline" value="<?= e($s['anti_ragging_helpline']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Default Primary Hex <input type="color" name="primary_color" value="<?= e($s['primary_color']) ?>"></label>
      <label>Default Secondary Hex <input type="color" name="secondary_color" value="<?= e($s['secondary_color']) ?>"></label>
    </div>
    <button type="submit" class="btn-primary">Save Complete Settings</button>
  </form>
</body>
</html>
