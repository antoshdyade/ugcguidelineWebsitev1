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
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMS Dashboard — <?= e($user['role']) ?></title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
<div class="container" style="padding:2rem 1rem;">
  <?php if (file_exists(__DIR__ . '/../setup.php')): ?>
    <div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:0.75rem 1rem;border-radius:8px;margin-bottom:1rem;font-size:0.85rem;">
      <strong>Security Reminder:</strong> Delete <code>setup.php</code> from your Webmin <code>public_html</code> directory now that installation is complete.
    </div>
  <?php endif; ?>

  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
    <div>
      <small style="text-transform:uppercase;color:var(--secondary-color);font-weight:700;"><?= e($user['role']) ?></small>
      <h1 style="margin:0;">Welcome, <?= e($user['full_name']) ?></h1>
    </div>
    <div style="display:flex;gap:0.5rem;">
      <a href="../index.php" class="btn-secondary">Public Website</a>
      <a href="logout.php" class="btn-primary">Sign Out</a>
    </div>
  </div>

  <div class="grid-4" style="margin-bottom:1.5rem;">
    <div class="card"><small>Published Pages</small><h2><?= $pageCount ?></h2></div>
    <div class="card"><small>Departments</small><h2><?= $deptCount ?></h2></div>
    <div class="card"><small>Documents</small><h2><?= $docCount ?></h2></div>
    <div class="card"><small>Notices &amp; Events</small><h2><?= $evCount ?></h2></div>
  </div>

  <div class="grid-4">
    <?php if (canAccessResource($user, 'pages')): ?>
      <a href="manage_pages.php" class="card" style="text-decoration:none;color:inherit;"><h3>Pages &amp; Categories</h3><p>Visual WYSIWYG + HTML editor with photo &amp; PDF upload.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'departments')): ?>
      <a href="manage_departments.php" class="card" style="text-decoration:none;color:inherit;"><h3>Departments &amp; Micro-Pages</h3><p>Add departments, edit micro-pages, faculty photos &amp; labs.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'sliders_events')): ?>
      <a href="manage_sliders.php" class="card" style="text-decoration:none;color:inherit;"><h3>Sliders, Ticker &amp; Events</h3><p>Hero banners with image upload, news ticker &amp; notices.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'leadership')): ?>
      <a href="manage_leadership.php" class="card" style="text-decoration:none;color:inherit;"><h3>Leadership &amp; Our Desk</h3><p>Manage Statutory Officers &amp; portraits.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'gallery')): ?>
      <a href="manage_gallery.php" class="card" style="text-decoration:none;color:inherit;"><h3>Picture Gallery</h3><p>Create event albums &amp; upload photos.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'documents')): ?>
      <a href="manage_documents.php" class="card" style="text-decoration:none;color:inherit;"><h3>Document Repository</h3><p>Upload statutory PDFs with MIME check.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'directory')): ?>
      <a href="manage_directory.php" class="card" style="text-decoration:none;color:inherit;"><h3>Telephone Directory</h3><p>Manage campus office extensions &amp; contacts.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'users')): ?>
      <a href="manage_users.php" class="card" style="text-decoration:none;color:inherit;"><h3>Users, RBAC &amp; Audit Logs</h3><p>Manage roles and inspect change logs.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'settings')): ?>
      <a href="site_settings.php" class="card" style="text-decoration:none;color:inherit;"><h3>Site Settings, Logo &amp; Vision</h3><p>Logo upload, About Us, Vision/Mission &amp; theme colors.</p></a>
    <?php endif; ?>
  </div>
</div>
</body>
</html>
