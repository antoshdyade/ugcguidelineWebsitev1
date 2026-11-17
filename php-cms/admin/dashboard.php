<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireLogin();
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$pageCount = (int)$pdo->query('SELECT COUNT(*) FROM pages WHERE is_published = 1')->fetchColumn();
$deptCount = (int)$pdo->query('SELECT COUNT(*) FROM departments')->fetchColumn();
$docCount  = (int)$pdo->query('SELECT COUNT(*) FROM documents')->fetchColumn();
$galCount  = (int)$pdo->query('SELECT COUNT(*) FROM gallery_albums')->fetchColumn();

$pendingAlumniCount = 0;
$pendingJobsCount = 0;
$confPublishedCount = 0;
$openGrievanceCount = 0;
$urgentGrievanceCount = 0;
$placementCount = 0;
try {
    $pendingAlumniCount = (int)$pdo->query("SELECT COUNT(*) FROM alumni_profiles WHERE status = 'pending'")->fetchColumn();
    $pendingJobsCount = (int)$pdo->query("SELECT COUNT(*) FROM alumni_jobs WHERE status = 'pending'")->fetchColumn();
    $confPublishedCount = (int)$pdo->query('SELECT COUNT(*) FROM conferences WHERE is_published = 1')->fetchColumn();
    $openGrievanceCount = (int)$pdo->query("SELECT COUNT(*) FROM grievances WHERE status IN ('Open','Under Review','Escalated')")->fetchColumn();
    $urgentGrievanceCount = (int)$pdo->query("SELECT COUNT(*) FROM grievances WHERE urgency = 'Urgent' AND status IN ('Open','Under Review','Escalated')")->fetchColumn();
    $placementCount = (int)$pdo->query('SELECT COUNT(*) FROM placement_stats')->fetchColumn()
        + (int)$pdo->query('SELECT COUNT(*) FROM placement_stories')->fetchColumn();
} catch (Throwable $ignoredStats) {
}

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
  <a href="<?= e(baseUrl(canAccessResource($user, 'conferences') ? 'admin/manage_conferences.php' : 'admin/dashboard.php')) ?>" class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Conferences &amp; R&amp;D Events</small>
    <p class="admin-stat-num"><?= $confPublishedCount ?></p>
  </a>
  <a href="<?= e(baseUrl(canAccessResource($user, 'grievances') ? 'admin/manage_portals.php?tab=grievances' : (canAccessResource($user, 'documents') ? 'admin/manage_documents.php' : 'admin/dashboard.php'))) ?>" class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;"><?= canAccessResource($user, 'grievances') ? 'Open Grievances (SGRC)' : 'Repository Documents' ?></small>
    <p class="admin-stat-num"><?= canAccessResource($user, 'grievances') ? $openGrievanceCount : $docCount ?></p>
    <?php if (canAccessResource($user, 'grievances') && $urgentGrievanceCount > 0): ?>
      <small style="display:inline-block;margin-top:0.25rem;color:#B91C1C;font-weight:700;"><?= $urgentGrievanceCount ?> Urgent</small>
    <?php endif; ?>
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
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Add Examination/custom sections, place items in Main vs More menu &amp; reorder portals.</p>
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
  <?php if (canAccessResource($user, 'conferences')): ?>
    <a href="<?= e(baseUrl('admin/manage_conferences.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Conferences, Workshops &amp; R&amp;D</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Manage <?= $confPublishedCount ?> live events, Research slider, tracks, CMT/local CFP &amp; delegates.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'placements')): ?>
    <a href="<?= e(baseUrl('admin/manage_portals.php?tab=placements')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Placements Desk (T&amp;P)</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Branch-wise placement statistics, upcoming campus drives, sanctioned intake &amp; achiever stories (<?= $placementCount ?> records).</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'grievances')): ?>
    <a href="<?= e(baseUrl('admin/manage_portals.php?tab=grievances')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Grievance Redressal (SGRC)</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">
        Moderate SGRC &amp; Anti-Ragging tickets, Ombudsperson profile &amp; CSV audit export.
        <?php if ($openGrievanceCount > 0): ?><strong style="color:#B45309;">(<?= $openGrievanceCount ?> active)</strong><?php endif; ?>
      </p>
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
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Manage Statutory Officers, Governing Body, Academic Council, BoS &amp; committees.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'alumni')): ?>
    <a href="<?= e(baseUrl('admin/manage_alumni.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Alumni Network, Jobs &amp; Give Back</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">
        Verify alumni, jobs, achievers, pledges &amp; member discussions.
        <?php if ($pendingAlumniCount + $pendingJobsCount > 0): ?>
          <strong style="color:#B45309;">(<?= $pendingAlumniCount ?> alumni, <?= $pendingJobsCount ?> jobs pending)</strong>
        <?php endif; ?>
      </p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'gallery')): ?>
    <a href="<?= e(baseUrl('admin/manage_gallery.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Picture Gallery</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Create event albums &amp; upload photos (<?= $galCount ?> albums).</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'documents')): ?>
    <a href="<?= e(baseUrl('admin/manage_documents.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Document Repository</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Upload statutory PDFs or attach external Google Drive download links (<?= $docCount ?> files).</p>
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
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Assign Exam Controller, category/page/module permissions, revoke users &amp; inspect audit logs.</p>
    </a>
    <a href="<?= e(baseUrl('admin/manage_backups.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Backup, Export &amp; Restore</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Full &amp; incremental snapshots with media/credentials, SCP/Google Drive push &amp; recovery.</p>
    </a>
  <?php endif; ?>
  <?php if (canAccessResource($user, 'settings')): ?>
    <a href="<?= e(baseUrl('admin/site_settings.php')) ?>" class="admin-stat-card">
      <h3 style="margin:0 0 0.3rem;">Site Settings, Logo &amp; Vision</h3>
      <p style="font-size:0.82rem;color:#57534E;margin:0;">Logo upload, Approved Bodies, About Us, Vision/Mission &amp; theme presets.</p>
    </a>
  <?php endif; ?>
</div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
