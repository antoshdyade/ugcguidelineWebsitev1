<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireLogin();
$pdo = getDB();

$pageCount = (int)$pdo->query('SELECT COUNT(*) FROM pages WHERE is_published = 1')->fetchColumn();
$deptCount = (int)$pdo->query('SELECT COUNT(*) FROM departments')->fetchColumn();
$docCount  = (int)$pdo->query('SELECT COUNT(*) FROM documents')->fetchColumn();
$galCount  = (int)$pdo->query('SELECT COUNT(*) FROM gallery_albums')->fetchColumn();

$auditCats = $pdo->query(
    'SELECT c.id, c.name, c.slug, c.ugc_code, COUNT(p.id) AS live_pages '
    . 'FROM categories c LEFT JOIN pages p ON p.category_id = c.id AND p.is_published = 1 '
    . 'GROUP BY c.id, c.name, c.slug, c.ugc_code ORDER BY c.sort_order ASC, c.id ASC'
)->fetchAll();

$adminPageTitle = 'Overview & UGC Audit';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
<?php if (file_exists(__DIR__ . '/../setup.php')): ?>
  <div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:0.75rem 1rem;border-radius:10px;margin-bottom:1.25rem;font-size:0.85rem;">
    <strong>Security Reminder:</strong> Verify diagnostics via <a href="<?= e(baseUrl('setup.php')) ?>" style="color:#92400e;font-weight:700;">setup.php</a> if needed, then delete <code>setup.php</code> once deployment checks pass.
  </div>
<?php endif; ?>

<div class="grid-4" style="margin-bottom:1.5rem;">
  <a href="<?= e(baseUrl(canAccessResource($user, 'pages') ? 'admin/manage_pages.php' : 'admin/dashboard.php')) ?>" class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Published UGC Pages</small>
    <p class="admin-stat-num"><?= $pageCount ?></p>
  </a>
  <a href="<?= e(baseUrl(canAccessResource($user, 'departments') ? 'admin/manage_departments.php' : 'admin/dashboard.php')) ?>" class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Department Microsites</small>
    <p class="admin-stat-num"><?= $deptCount ?></p>
  </a>
  <a href="<?= e(baseUrl(canAccessResource($user, 'documents') ? 'admin/manage_documents.php' : 'admin/dashboard.php')) ?>" class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Repository Documents</small>
    <p class="admin-stat-num"><?= $docCount ?></p>
  </a>
  <a href="<?= e(baseUrl(canAccessResource($user, 'gallery') ? 'admin/manage_gallery.php' : 'admin/dashboard.php')) ?>" class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Gallery Albums</small>
    <p class="admin-stat-num"><?= $galCount ?></p>
  </a>
</div>

<div class="card" style="margin-bottom:1.5rem;">
  <h2 style="margin-top:0;">UGC NEP 2020 Mandatory Self-Disclosure Status</h2>
  <div class="ugc-audit-grid">
    <?php foreach ($auditCats as $ac): $cnt = (int)$ac['live_pages']; ?>
      <div class="ugc-audit-row">
        <div>
          <span style="font-size:0.74rem;color:#78716C;margin-right:0.45rem;font-variant-numeric:tabular-nums;"><?= e($ac['ugc_code']) ?></span>
          <strong style="color:#1C1917;"><?= e($ac['name']) ?></strong>
        </div>
        <span style="font-size:0.76rem;font-weight:700;color:#047857;white-space:nowrap;font-variant-numeric:tabular-nums;">
          &#10003; <?= $cnt ?> <?= $cnt === 1 ? 'Page' : 'Pages' ?> Live
        </span>
      </div>
    <?php endforeach; ?>
  </div>
</div>

<div class="grid-3">
  <?php if (canAccessResource($user, 'categories')): ?>
    <a href="<?= e(baseUrl('admin/manage_categories.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Categories &amp; Menus</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Add Examination/custom sections, reorder header links &amp; auto-create portals.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'pages')): ?>
    <a href="<?= e(baseUrl('admin/manage_pages.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Pages &amp; Micro-Pages</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Visual Word-style WYSIWYG + HTML editor with PDF upload or Google Drive links.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'departments')): ?>
    <a href="<?= e(baseUrl('admin/manage_departments.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Departments &amp; Micro-Pages</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Manage Dept Library, Galleries, Notice Boards, Notes/Syllabus &amp; custom Faculty fields.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'sliders_events')): ?>
    <a href="<?= e(baseUrl('admin/manage_sliders.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Sliders, Ticker &amp; Events</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Hero banners with image upload, news ticker &amp; campus notices.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'settings')): ?>
    <a href="<?= e(baseUrl('admin/manage_home_components.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Homepage HTML Components</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Drag-and-drop &amp; HTML custom blocks placed anywhere on the homepage.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'leadership')): ?>
    <a href="<?= e(baseUrl('admin/manage_leadership.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Leadership &amp; Our Desk</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Manage Statutory Officers, Principal, CoE, custom groups &amp; order.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'alumni')): ?>
    <a href="<?= e(baseUrl('admin/manage_alumni.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Alumni Network &amp; Jobs</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Verify alumni registrations, moderate job referrals &amp; manage chapter meets.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'gallery')): ?>
    <a href="<?= e(baseUrl('admin/manage_gallery.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Picture Gallery</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Create event albums &amp; upload photos.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'documents')): ?>
    <a href="<?= e(baseUrl('admin/manage_documents.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Document Repository</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Upload statutory PDFs or attach external Google Drive download links.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'directory')): ?>
    <a href="<?= e(baseUrl('admin/manage_directory.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Telephone Directory</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Manage campus office extensions &amp; contacts.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'users')): ?>
    <a href="<?= e(baseUrl('admin/manage_users.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Users, Per-Page RBAC &amp; Audit</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Assign Exam Controller, category/page permissions &amp; inspect audit logs.</p>
    </a>
    <a href="<?= e(baseUrl('admin/manage_backups.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Backup, Export &amp; Restore</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Full &amp; incremental snapshots, SCP/Google Drive push, Webmin cron schedule &amp; recovery.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'settings')): ?>
    <a href="<?= e(baseUrl('admin/site_settings.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Site Settings, Logo &amp; Vision</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Logo upload, About Us, Vision/Mission &amp; theme colors.</p>
    </a>
  <?php endif; ?>
</div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
