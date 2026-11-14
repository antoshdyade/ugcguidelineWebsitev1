<?php
declare(strict_types=1);
$activePage = basename($_SERVER['PHP_SELF'] ?? 'dashboard.php');
$adminTitle = $adminPageTitle ?? 'CMS Console';
$siteSettings = isset($pdo) ? getSiteSettings($pdo) : [];

$navSvg = static function (string $d): string {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $d . '</svg>';
};
$icons = [
    'shield'    => $navSvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    'grid'      => $navSvg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
    'layers'    => $navSvg('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'),
    'building'  => $navSvg('<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'),
    'image'     => $navSvg('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
    'blocks'    => $navSvg('<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14v7"/><path d="M14 14v7"/>'),
    'usercheck' => $navSvg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>'),
    'folder'    => $navSvg('<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>'),
    'phone'     => $navSvg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    'settings'  => $navSvg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    'users'     => $navSvg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    'archive'   => $navSvg('<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>'),
    'arrowleft' => $navSvg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
    'logout'    => $navSvg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'),
];
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($adminTitle) ?> — SVCOER Admin Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link id="svcoer-main-css" rel="stylesheet" href="<?= e(assetUrl('assets/css/style.css')) ?>">
  <script>
    window.SVCOER_BASE_URL = <?= json_encode(getBaseUrl(), JSON_UNESCAPED_SLASHES) ?>;
    (function () {
      var fallbackHref = <?= json_encode(baseUrl('admin/asset_proxy.php?f=css'), JSON_UNESCAPED_SLASHES) ?>;
      function ensureCss() {
        var ready = getComputedStyle(document.documentElement).getPropertyValue('--svcoer-css-ready').trim();
        if (ready !== '1' && !document.getElementById('svcoer-proxy-css')) {
          var lk = document.createElement('link');
          lk.id = 'svcoer-proxy-css';
          lk.rel = 'stylesheet';
          lk.href = fallbackHref;
          document.head.appendChild(lk);
        }
      }
      var mainLk = document.getElementById('svcoer-main-css');
      if (mainLk) mainLk.addEventListener('error', ensureCss);
      window.addEventListener('DOMContentLoaded', ensureCss);
    })();
  </script>
  <?php if (!empty($siteSettings)): ?>
  <style>
    :root {
      --primary-color: <?= e($siteSettings['primary_color'] ?? '#0F294A') ?>;
      --secondary-color: <?= e($siteSettings['secondary_color'] ?? '#B45309') ?>;
    }
  </style>
  <?php endif; ?>
</head>
<body>
<div class="admin-shell">
  <aside class="admin-sidebar">
    <div>
      <div class="admin-user-box">
        <small style="text-transform:uppercase;letter-spacing:0.06em;font-weight:700;color:var(--secondary-color);display:block;font-size:0.68rem;">
          <?= e(str_replace('_', ' ', (string)($user['role'] ?? 'staff'))) ?>
        </small>
        <div style="font-weight:700;font-size:0.92rem;color:#1C1917;margin-top:2px;"><?= e($user['full_name'] ?? 'Staff User') ?></div>
        <div style="font-size:0.74rem;color:#78716C;"><?= e($user['email'] ?? '') ?></div>
      </div>

      <nav class="admin-nav" aria-label="Admin Console Navigation">
        <a href="<?= e(baseUrl('admin/dashboard.php')) ?>" class="<?= $activePage === 'dashboard.php' ? 'active' : '' ?>"><?= $icons['shield'] ?><span>Overview &amp; UGC Audit</span></a>
        <?php if (canAccessResource($user, 'categories')): ?>
          <a href="<?= e(baseUrl('admin/manage_categories.php')) ?>" class="<?= $activePage === 'manage_categories.php' ? 'active' : '' ?>"><?= $icons['grid'] ?><span>Categories &amp; Menus</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'pages')): ?>
          <a href="<?= e(baseUrl('admin/manage_pages.php')) ?>" class="<?= $activePage === 'manage_pages.php' ? 'active' : '' ?>"><?= $icons['layers'] ?><span>Pages &amp; UGC Content</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'departments')): ?>
          <a href="<?= e(baseUrl('admin/manage_departments.php')) ?>" class="<?= $activePage === 'manage_departments.php' ? 'active' : '' ?>"><?= $icons['building'] ?><span>Departments &amp; Micro-Pages</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'sliders_events')): ?>
          <a href="<?= e(baseUrl('admin/manage_sliders.php')) ?>" class="<?= $activePage === 'manage_sliders.php' ? 'active' : '' ?>"><?= $icons['image'] ?><span>Sliders, Ticker &amp; Events</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'settings')): ?>
          <a href="<?= e(baseUrl('admin/manage_home_components.php')) ?>" class="<?= $activePage === 'manage_home_components.php' ? 'active' : '' ?>"><?= $icons['blocks'] ?><span>Homepage HTML Components</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'leadership')): ?>
          <a href="<?= e(baseUrl('admin/manage_leadership.php')) ?>" class="<?= $activePage === 'manage_leadership.php' ? 'active' : '' ?>"><?= $icons['usercheck'] ?><span>Leadership &amp; Our Desk</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'gallery')): ?>
          <a href="<?= e(baseUrl('admin/manage_gallery.php')) ?>" class="<?= $activePage === 'manage_gallery.php' ? 'active' : '' ?>"><?= $icons['image'] ?><span>Picture Gallery</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'documents')): ?>
          <a href="<?= e(baseUrl('admin/manage_documents.php')) ?>" class="<?= $activePage === 'manage_documents.php' ? 'active' : '' ?>"><?= $icons['folder'] ?><span>Document Repository</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'directory')): ?>
          <a href="<?= e(baseUrl('admin/manage_directory.php')) ?>" class="<?= $activePage === 'manage_directory.php' ? 'active' : '' ?>"><?= $icons['phone'] ?><span>Telephone Directory</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'settings')): ?>
          <a href="<?= e(baseUrl('admin/site_settings.php')) ?>" class="<?= $activePage === 'site_settings.php' ? 'active' : '' ?>"><?= $icons['settings'] ?><span>Site Settings, Vision &amp; Theme</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'users')): ?>
          <a href="<?= e(baseUrl('admin/manage_users.php')) ?>" class="<?= $activePage === 'manage_users.php' ? 'active' : '' ?>"><?= $icons['users'] ?><span>Users, Per-Page RBAC &amp; Audit</span></a>
          <a href="<?= e(baseUrl('admin/manage_backups.php')) ?>" class="<?= $activePage === 'manage_backups.php' ? 'active' : '' ?>"><?= $icons['archive'] ?><span>Backup, Export &amp; Restore</span></a>
        <?php endif; ?>
      </nav>
    </div>

    <div style="border-top:1px solid #E7E5E4;padding-top:0.85rem;margin-top:1.25rem;display:flex;flex-direction:column;gap:0.45rem;">
      <a href="<?= e(baseUrl('index.php')) ?>" style="display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.5rem 0.75rem;border:1px solid #D6D3D1;border-radius:8px;text-decoration:none;color:#1C1917;font-size:0.78rem;font-weight:600;background:#fff;"><?= $icons['arrowleft'] ?><span>View Public Website</span></a>
      <a href="<?= e(baseUrl('admin/logout.php')) ?>" style="display:flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.5rem 0.75rem;border-radius:8px;text-decoration:none;color:#BE123C;font-size:0.78rem;font-weight:600;background:#FFF1F2;"><?= $icons['logout'] ?><span>Sign Out</span></a>
    </div>
  </aside>

  <main class="admin-main">
    <div class="admin-header-bar">
      <div>
        <small style="color:#78716C;font-weight:600;font-size:0.76rem;">CMS Console / <?= e($adminTitle) ?></small>
        <h1 style="margin:0.15rem 0 0;font-family:'Playfair Display',serif;font-size:1.55rem;color:#1C1917;"><?= e($adminTitle) ?></h1>
      </div>
    </div>
    <?php if (!empty($msg)): ?><div class="alert-ok"><?= e($msg) ?></div><?php endif; ?>
    <?php if (!empty($err)): ?><div class="alert-err"><?= e($err) ?></div><?php endif; ?>
