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
  <title>CMS Dashboard — <?= e($user['role']) ?></title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body>
<div class="container" style="padding:2rem 1rem;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
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
      <a href="manage_pages.php" class="card" style="text-decoration:none;color:inherit;"><h3>Manage Pages &amp; Categories</h3><p>Rich editor for UGC disclosure pages.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'departments')): ?>
      <a href="manage_departments.php" class="card" style="text-decoration:none;color:inherit;"><h3>Manage Department Microsite</h3><p>Sub-pages, faculty directory &amp; labs.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'sliders_events')): ?>
      <a href="manage_sliders.php" class="card" style="text-decoration:none;color:inherit;"><h3>Manage Sliders &amp; Ticker</h3><p>Hero banners, news ticker &amp; events.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'documents')): ?>
      <a href="manage_documents.php" class="card" style="text-decoration:none;color:inherit;"><h3>Manage Documents</h3><p>Upload PDFs with MIME security check.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'users')): ?>
      <a href="manage_users.php" class="card" style="text-decoration:none;color:inherit;"><h3>Manage Users &amp; RBAC</h3><p>Create roles and inspect audit logs.</p></a>
    <?php endif; ?>
    <?php if (canAccessResource($user, 'settings')): ?>
      <a href="site_settings.php" class="card" style="text-decoration:none;color:inherit;"><h3>Site Settings &amp; Theme</h3><p>Institution branding &amp; default colors.</p></a>
    <?php endif; ?>
  </div>
</div>
</body>
</html>
