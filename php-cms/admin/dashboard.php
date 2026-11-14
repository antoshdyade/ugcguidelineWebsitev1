<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireLogin();
$pdo = getDB();

$pageCount = (int)$pdo->query('SELECT COUNT(*) FROM pages WHERE is_published = 1')->fetchColumn();
$deptCount = (int)$pdo->query('SELECT COUNT(*) FROM departments')->fetchColumn();
$docCount  = (int)$pdo->query('SELECT COUNT(*) FROM documents')->fetchColumn();
$evCount   = (int)$pdo->query('SELECT COUNT(*) FROM campus_events')->fetchColumn();
$homeCompCount = 0;
try {
    $homeCompCount = (int)$pdo->query('SELECT COUNT(*) FROM custom_home_components WHERE is_active = 1')->fetchColumn();
} catch (Throwable $ignored) {}

$adminPageTitle = 'Overview & UGC Audit — Welcome, ' . $user['full_name'];
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
<?php if (file_exists(__DIR__ . '/../setup.php')): ?>
  <div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:0.75rem 1rem;border-radius:8px;margin-bottom:1.25rem;font-size:0.85rem;">
    <strong>Security Reminder:</strong> Run <code>setup.php</code> diagnostics if needed, then delete <code>setup.php</code> from your Webmin <code>public_html</code> directory once installation is complete.
  </div>
<?php endif; ?>

<div class="grid-4" style="margin-bottom:1.5rem;">
  <div class="card"><small style="color:var(--text-muted);font-weight:600;">Published Pages</small><h2 style="margin:0.25rem 0 0;"><?= $pageCount ?></h2></div>
  <div class="card"><small style="color:var(--text-muted);font-weight:600;">Departments</small><h2 style="margin:0.25rem 0 0;"><?= $deptCount ?></h2></div>
  <div class="card"><small style="color:var(--text-muted);font-weight:600;">Documents &amp; Links</small><h2 style="margin:0.25rem 0 0;"><?= $docCount ?></h2></div>
  <div class="card"><small style="color:var(--text-muted);font-weight:600;">Active Home Blocks</small><h2 style="margin:0.25rem 0 0;"><?= $homeCompCount ?: $evCount ?></h2></div>
</div>

<div class="grid-3">
  <?php if (canAccessResource($user, 'categories')): ?>
    <a href="manage_categories.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Categories &amp; Menus</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Add Examination/custom sections, reorder header links &amp; auto-create portals.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'pages')): ?>
    <a href="manage_pages.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Pages &amp; Micro-Pages</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Visual Word-style WYSIWYG + HTML editor with PDF upload or Google Drive links.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'departments')): ?>
    <a href="manage_departments.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Departments &amp; Micro-Pages</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Manage Dept Library, Galleries, Notice Boards, Notes/Syllabus &amp; custom Faculty fields.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'sliders_events')): ?>
    <a href="manage_sliders.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Sliders, Ticker &amp; Events</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Hero banners with image upload, news ticker &amp; campus notices.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'settings')): ?>
    <a href="manage_home_components.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Homepage HTML Components</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Drag-and-drop &amp; HTML custom blocks placed anywhere on the homepage.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'leadership')): ?>
    <a href="manage_leadership.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Leadership &amp; Our Desk</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Manage Statutory Officers, Principal, CoE &amp; portraits.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'gallery')): ?>
    <a href="manage_gallery.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Picture Gallery</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Create event albums &amp; upload photos.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'documents')): ?>
    <a href="manage_documents.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Document Repository</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Upload statutory PDFs or attach external Google Drive download links.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'directory')): ?>
    <a href="manage_directory.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Telephone Directory</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Manage campus office extensions &amp; contacts.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'users')): ?>
    <a href="manage_users.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Users, Per-Page RBAC &amp; Audit</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Assign Exam Controller, category/page permissions &amp; inspect audit logs.</p>
    </a>
    <a href="manage_backups.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Backup, Export &amp; Restore</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Full &amp; incremental snapshots, SCP/Google Drive push, Webmin cron schedule &amp; recovery.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'settings')): ?>
    <a href="site_settings.php" class="card" style="text-decoration:none;color:inherit;">
      <h3 style="margin-top:0;">Site Settings, Logo &amp; Vision</h3>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0;">Logo upload, About Us, Vision/Mission &amp; theme colors.</p>
    </a>
  <?php endif; ?>
</div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
