<?php
declare(strict_types=1);
$activePage = basename($_SERVER['PHP_SELF'] ?? 'dashboard.php');
$adminTitle = $adminPageTitle ?? 'CMS Console';
if (isset($pdo) && $pdo instanceof PDO) {
    ensureCmsSchemaUpgraded($pdo);
}
$siteSettings = isset($pdo) ? getSiteSettings($pdo) : [];

$navSvg = static function (string $d): string {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $d . '</svg>';
};
$icons = [
    'shield'     => $navSvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    'grid'       => $navSvg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
    'layers'     => $navSvg('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'),
    'building'   => $navSvg('<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'),
    'image'      => $navSvg('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
    'blocks'     => $navSvg('<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14v7"/><path d="M14 14v7"/>'),
    'usercheck'  => $navSvg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/>'),
    'graduation' => $navSvg('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>'),
    'folder'     => $navSvg('<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>'),
    'phone'      => $navSvg('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    'settings'   => $navSvg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    'users'      => $navSvg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    'archive'    => $navSvg('<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>'),
    'search'     => $navSvg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
    'activity'   => $navSvg('<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'),
    'trophy'     => $navSvg('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
    'landmark'   => $navSvg('<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>'),
    'arrowleft'  => $navSvg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
    'logout'     => $navSvg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'),
    'check'      => $navSvg('<polyline points="20 6 9 17 4 12"/>'),
];
$pendingApprovalsCount = (isset($pdo) && $pdo instanceof PDO && function_exists('cmsIsSuperAdmin') && cmsIsSuperAdmin($user ?? null) && function_exists('cmsCountPendingApprovals'))
    ? cmsCountPendingApprovals($pdo)
    : 0;
$uploadPolicy = isset($pdo)
    ? getUploadLimits($pdo)
    : ['max_photo_mb' => 2.0, 'max_doc_mb' => 10.0, 'auto_crop_enabled' => 1];
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($adminTitle) ?> — SVCOER Admin Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <link id="svcoer-main-css" rel="stylesheet" href="<?= e(assetUrl('assets/css/style.css')) ?>">
  <script>
    window.SVCOER_BASE_URL = <?= json_encode(getBaseUrl(), JSON_UNESCAPED_SLASHES) ?>;
    window.SVCOER_UPLOAD_POLICY = <?= json_encode([
        'maxPhotoMb' => (float)$uploadPolicy['max_photo_mb'],
        'maxDocMb'   => (float)$uploadPolicy['max_doc_mb'],
        'autoCrop'   => !empty($uploadPolicy['auto_crop_enabled']),
        'csrfToken'  => csrfToken(),
        'uploadUrl'  => baseUrl('admin/upload_handler.php'),
    ], JSON_UNESCAPED_SLASHES) ?>;
    (function () {
      var fallbackHref = <?= json_encode(baseUrl('admin/asset_proxy.php?f=css'), JSON_UNESCAPED_SLASHES) ?>;
      var proxyImgBase = <?= json_encode(baseUrl('admin/asset_proxy.php?img='), JSON_UNESCAPED_SLASHES) ?>;
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
      window.addEventListener('load', ensureCss);
      setTimeout(ensureCss, 350);

      document.addEventListener('error', function (ev) {
        var t = ev && ev.target;
        if (!t || t.tagName !== 'IMG' || t.dataset.proxyTried === '1') return;
        var src = t.getAttribute('src') || '';
        var idxAssets = src.indexOf('assets/images/');
        var idxUploads = src.indexOf('uploads/');
        var rel = idxAssets >= 0 ? src.slice(idxAssets) : (idxUploads >= 0 ? src.slice(idxUploads) : '');
        if (!rel) return;
        rel = rel.split('?')[0];
        t.dataset.proxyTried = '1';
        t.src = proxyImgBase + encodeURIComponent(rel);
      }, true);
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
        <?php if (function_exists('cmsIsSuperAdmin') && cmsIsSuperAdmin($user ?? null)): ?>
          <a href="<?= e(baseUrl('admin/pending_approvals.php')) ?>" class="<?= $activePage === 'pending_approvals.php' ? 'active' : '' ?>" style="justify-content:space-between;">
            <span style="display:inline-flex;align-items:center;gap:0.6rem;"><?= $icons['check'] ?><span>Pending Approvals</span></span>
            <?php if ($pendingApprovalsCount > 0): ?>
              <span style="background:#F59E0B;color:#020617;border-radius:999px;padding:0.08rem 0.48rem;font-size:0.68rem;font-weight:800;line-height:1.3;"><?= (int)$pendingApprovalsCount ?></span>
            <?php endif; ?>
          </a>
        <?php endif; ?>
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
        <?php if (canAccessResource($user, 'conferences')): ?>
          <a href="<?= e(baseUrl('admin/manage_conferences.php')) ?>" class="<?= $activePage === 'manage_conferences.php' ? 'active' : '' ?>"><?= $icons['blocks'] ?><span>Conferences, Workshops &amp; R&amp;D</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'alumni')): ?>
          <a href="<?= e(baseUrl('admin/manage_alumni.php')) ?>" class="<?= $activePage === 'manage_alumni.php' ? 'active' : '' ?>"><?= $icons['graduation'] ?><span>Alumni Network &amp; Jobs</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'placements') || canAccessResource($user, 'grievances')): ?>
          <a href="<?= e(baseUrl('admin/manage_portals.php')) ?>" class="<?= $activePage === 'manage_portals.php' ? 'active' : '' ?>"><?= $icons['shield'] ?><span>Placements, Grievances &amp; Feedback</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'sports')): ?>
          <a href="<?= e(baseUrl('admin/manage_sports.php')) ?>" class="<?= $activePage === 'manage_sports.php' ? 'active' : '' ?>"><?= $icons['trophy'] ?><span>Sports &amp; Gymkhana</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'facilities')): ?>
          <a href="<?= e(baseUrl('admin/manage_facilities.php')) ?>" class="<?= $activePage === 'manage_facilities.php' ? 'active' : '' ?>"><?= $icons['landmark'] ?><span>Campus Facilities</span></a>
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
        <?php if (canAccessResource($user, 'seo')): ?>
          <a href="<?= e(baseUrl('admin/manage_seo.php')) ?>" class="<?= $activePage === 'manage_seo.php' ? 'active' : '' ?>"><?= $icons['search'] ?><span>SEO Studio &amp; Hit Counter</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'analytics')): ?>
          <a href="<?= e(baseUrl('admin/manage_logs_security.php')) ?>" class="<?= $activePage === 'manage_logs_security.php' ? 'active' : '' ?>"><?= $icons['activity'] ?><span>Log Analyzer, Security &amp; Email Push</span></a>
        <?php endif; ?>
        <?php if (canAccessResource($user, 'settings')): ?>
          <a href="<?= e(baseUrl('admin/site_settings.php')) ?>" class="<?= $activePage === 'site_settings.php' ? 'active' : '' ?>"><?= $icons['settings'] ?><span>Settings, Social Media &amp; Theme</span></a>
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
