<?php
declare(strict_types=1);
$activePage = basename($_SERVER['PHP_SELF'] ?? 'dashboard.php');
$adminTitle = $adminPageTitle ?? 'CMS Console';
$siteCssVer = 'v=2';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($adminTitle) ?> — SVCOER Admin Portal</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/css/style.css?<?= $siteCssVer ?>">
  <script src="../assets/js/editor.js?<?= $siteCssVer ?>" defer></script>
</head>
<body>
<div class="admin-shell">
  <aside class="admin-sidebar">
    <div>
      <div class="admin-user-box">
        <small style="text-transform:uppercase;letter-spacing:0.06em;font-weight:700;color:var(--secondary-color);display:block;">
          <?= e(str_replace('_', ' ', (string)($user['role'] ?? 'staff'))) ?>
        </small>
        <div style="font-weight:700;font-size:0.95rem;margin-top:2px;"><?= e($user['full_name'] ?? 'Staff User') ?></div>
        <div style="font-size:0.75rem;color:var(--text-muted);"><?= e($user['email'] ?? '') ?></div>
      </div>

      <nav class="admin-nav" aria-label="Admin Console Navigation">
        <a href="dashboard.php" class="<?= $activePage === 'dashboard.php' ? 'active' : '' ?>">Overview &amp; UGC Audit</a>
        <?php if (canAccessResource($user, 'categories')): ?>
          <a href="manage_categories.php" class="<?= $activePage === 'manage_categories.php' ? 'active' : '' ?>">Categories &amp; Menus</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'pages')): ?>
          <a href="manage_pages.php" class="<?= $activePage === 'manage_pages.php' ? 'active' : '' ?>">Pages &amp; UGC Content</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'departments')): ?>
          <a href="manage_departments.php" class="<?= $activePage === 'manage_departments.php' ? 'active' : '' ?>">Departments &amp; Micro-Pages</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'sliders_events')): ?>
          <a href="manage_sliders.php" class="<?= $activePage === 'manage_sliders.php' ? 'active' : '' ?>">Sliders, Ticker &amp; Events</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'settings')): ?>
          <a href="manage_home_components.php" class="<?= $activePage === 'manage_home_components.php' ? 'active' : '' ?>">Homepage HTML Components</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'leadership')): ?>
          <a href="manage_leadership.php" class="<?= $activePage === 'manage_leadership.php' ? 'active' : '' ?>">Leadership &amp; Our Desk</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'gallery')): ?>
          <a href="manage_gallery.php" class="<?= $activePage === 'manage_gallery.php' ? 'active' : '' ?>">Picture Gallery</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'documents')): ?>
          <a href="manage_documents.php" class="<?= $activePage === 'manage_documents.php' ? 'active' : '' ?>">Document Repository</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'directory')): ?>
          <a href="manage_directory.php" class="<?= $activePage === 'manage_directory.php' ? 'active' : '' ?>">Telephone Directory</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'settings')): ?>
          <a href="site_settings.php" class="<?= $activePage === 'site_settings.php' ? 'active' : '' ?>">Site Settings, Vision &amp; Theme</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'users')): ?>
          <a href="manage_users.php" class="<?= $activePage === 'manage_users.php' ? 'active' : '' ?>">Users, Per-Page RBAC &amp; Audit</a>
        <?php endif; ?>
      </nav>
    </div>

    <div style="border-top:1px solid var(--border-color);padding-top:0.85rem;margin-top:1.25rem;display:flex;flex-direction:column;gap:0.45rem;">
      <a href="../index.php" class="btn-secondary" style="justify-content:center;">&larr; View Public Website</a>
      <a href="logout.php" class="btn-primary" style="justify-content:center;background:#991b1b;">Sign Out</a>
    </div>
  </aside>

  <main class="admin-main">
    <div class="admin-header-bar">
      <div>
        <small style="color:var(--text-muted);font-weight:600;">SVCOER CMS Console</small>
        <h1 style="margin:0.15rem 0 0;font-family:'Playfair Display',serif;"><?= e($adminTitle) ?></h1>
      </div>
    </div>
    <?php if (!empty($msg)): ?><div class="alert-ok"><?= e($msg) ?></div><?php endif; ?>
    <?php if (!empty($err)): ?><div class="alert-err"><?= e($err) ?></div><?php endif; ?>
