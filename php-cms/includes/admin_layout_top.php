<?php
declare(strict_types=1);
$activePage = basename($_SERVER['PHP_SELF'] ?? 'dashboard.php');
$adminTitle = $adminPageTitle ?? 'CMS Console';
$siteSettings = isset($pdo) ? getSiteSettings($pdo) : [];
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($adminTitle) ?> — SVCOER Admin Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="<?= e(assetUrl('assets/css/style.css')) ?>">
  <?php if (!empty($siteSettings)): ?>
  <style>
    :root {
      --primary-color: <?= e($siteSettings['primary_color'] ?? '#0F294A') ?>;
      --secondary-color: <?= e($siteSettings['secondary_color'] ?? '#B45309') ?>;
    }
  </style>
  <?php endif; ?>
  <script>
    window.SVCOER_BASE_URL = <?= json_encode(getBaseUrl(), JSON_UNESCAPED_SLASHES) ?>;
  </script>
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
        <a href="<?= e(baseUrl('admin/dashboard.php')) ?>" class="<?= $activePage === 'dashboard.php' ? 'active' : '' ?>">Overview &amp; UGC Audit</a>
        <?php if (canAccessResource($user, 'categories')): ?>
          <a href="<?= e(baseUrl('admin/manage_categories.php')) ?>" class="<?= $activePage === 'manage_categories.php' ? 'active' : '' ?>">Categories &amp; Menus</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'pages')): ?>
          <a href="<?= e(baseUrl('admin/manage_pages.php')) ?>" class="<?= $activePage === 'manage_pages.php' ? 'active' : '' ?>">Pages &amp; UGC Content</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'departments')): ?>
          <a href="<?= e(baseUrl('admin/manage_departments.php')) ?>" class="<?= $activePage === 'manage_departments.php' ? 'active' : '' ?>">Departments &amp; Micro-Pages</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'sliders_events')): ?>
          <a href="<?= e(baseUrl('admin/manage_sliders.php')) ?>" class="<?= $activePage === 'manage_sliders.php' ? 'active' : '' ?>">Sliders, Ticker &amp; Events</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'settings')): ?>
          <a href="<?= e(baseUrl('admin/manage_home_components.php')) ?>" class="<?= $activePage === 'manage_home_components.php' ? 'active' : '' ?>">Homepage HTML Components</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'leadership')): ?>
          <a href="<?= e(baseUrl('admin/manage_leadership.php')) ?>" class="<?= $activePage === 'manage_leadership.php' ? 'active' : '' ?>">Leadership &amp; Our Desk</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'gallery')): ?>
          <a href="<?= e(baseUrl('admin/manage_gallery.php')) ?>" class="<?= $activePage === 'manage_gallery.php' ? 'active' : '' ?>">Picture Gallery</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'documents')): ?>
          <a href="<?= e(baseUrl('admin/manage_documents.php')) ?>" class="<?= $activePage === 'manage_documents.php' ? 'active' : '' ?>">Document Repository</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'directory')): ?>
          <a href="<?= e(baseUrl('admin/manage_directory.php')) ?>" class="<?= $activePage === 'manage_directory.php' ? 'active' : '' ?>">Telephone Directory</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'settings')): ?>
          <a href="<?= e(baseUrl('admin/site_settings.php')) ?>" class="<?= $activePage === 'site_settings.php' ? 'active' : '' ?>">Site Settings, Vision &amp; Theme</a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'users')): ?>
          <a href="<?= e(baseUrl('admin/manage_users.php')) ?>" class="<?= $activePage === 'manage_users.php' ? 'active' : '' ?>">Users, Per-Page RBAC &amp; Audit</a>
          <a href="<?= e(baseUrl('admin/manage_backups.php')) ?>" class="<?= $activePage === 'manage_backups.php' ? 'active' : '' ?>">Backup, Export &amp; Restore</a>
        <?php endif; ?>
      </nav>
    </div>

    <div style="border-top:1px solid var(--border-color);padding-top:0.85rem;margin-top:1.25rem;display:flex;flex-direction:column;gap:0.45rem;">
      <a href="<?= e(baseUrl('index.php')) ?>" class="btn-secondary" style="justify-content:center;">&larr; View Public Website</a>
      <a href="<?= e(baseUrl('admin/logout.php')) ?>" class="btn-primary" style="justify-content:center;background:#991b1b;">Sign Out</a>
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
