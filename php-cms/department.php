<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
$pdo = getDB();

$deptSlug = $_GET['dept'] ?? 'computer-science';
$subSlug  = $_GET['sub'] ?? 'about';

$dStmt = $pdo->prepare('SELECT * FROM departments WHERE slug = ? LIMIT 1');
$dStmt->execute([$deptSlug]);
$dept = $dStmt->fetch();

if (!$dept) {
    $dept = $pdo->query('SELECT * FROM departments ORDER BY sort_order ASC LIMIT 1')->fetch();
}

$subStmt = $pdo->prepare('SELECT * FROM department_subpages WHERE department_id = ? AND is_published = 1 ORDER BY sort_order ASC');
$subStmt->execute([$dept['id']]);
$subPages = $subStmt->fetchAll();

$facStmt = $pdo->prepare('SELECT * FROM faculty WHERE department_id = ? ORDER BY sort_order ASC');
$facStmt->execute([$dept['id']]);
$faculty = $facStmt->fetchAll();

$labStmt = $pdo->prepare('SELECT * FROM department_labs WHERE department_id = ?');
$labStmt->execute([$dept['id']]);
$labs = $labStmt->fetchAll();

$activeSubPage = null;
foreach ($subPages as $sp) {
    if ($sp['slug'] === $subSlug) {
        $activeSubPage = $sp;
        break;
    }
}

$pageTitle = $dept['name'] . ' — Department Microsite';
require_once __DIR__ . '/includes/header.php';
?>
<section class="card" style="background:var(--primary-color);color:#fff;margin-bottom:1.5rem;">
  <small style="color:#fde68a;">Department Microsite · Est. <?= e((string)$dept['established_year']) ?> · <?= e($dept['nba_status']) ?></small>
  <h1 style="font-family:'Playfair Display',serif;margin:0.35rem 0;"><?= e($dept['name']) ?></h1>
  <p style="margin:0;">HoD: <?= e($dept['hod_name']) ?> · Sanctioned Intake: <?= e((string)$dept['intake_capacity']) ?></p>
</section>

<div class="layout-sidebar">
  <aside class="card">
    <p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-top:0;"><?= e($dept['short_name']) ?> Menu</p>
    <ul style="list-style:none;padding:0;margin:0;">
      <?php foreach ($subPages as $sp): ?>
        <li style="margin-bottom:0.35rem;">
          <a href="department.php?dept=<?= urlencode($dept['slug']) ?>&sub=<?= urlencode($sp['slug']) ?>"
             style="display:block;padding:0.45rem 0.65rem;border-radius:6px;text-decoration:none;<?= $subSlug === $sp['slug'] ? 'background:var(--primary-color);color:#fff;font-weight:600;' : 'color:var(--text-main);' ?>">
            <?= e($sp['title']) ?>
          </a>
        </li>
      <?php endforeach; ?>
      <li style="margin-bottom:0.35rem;">
        <a href="department.php?dept=<?= urlencode($dept['slug']) ?>&sub=faculty"
           style="display:block;padding:0.45rem 0.65rem;border-radius:6px;text-decoration:none;<?= $subSlug === 'faculty' ? 'background:var(--primary-color);color:#fff;font-weight:600;' : 'color:var(--text-main);' ?>">
          Faculty &amp; Staff (<?= count($faculty) ?>)
        </a>
      </li>
      <li>
        <a href="department.php?dept=<?= urlencode($dept['slug']) ?>&sub=laboratories"
           style="display:block;padding:0.45rem 0.65rem;border-radius:6px;text-decoration:none;<?= $subSlug === 'laboratories' ? 'background:var(--primary-color);color:#fff;font-weight:600;' : 'color:var(--text-main);' ?>">
          Laboratories (<?= count($labs) ?>)
        </a>
      </li>
    </ul>
  </aside>

  <section class="card">
    <?php if ($subSlug === 'faculty'): ?>
      <h2 style="margin-top:0;">Department Faculty Directory</h2>
      <div class="grid-2">
        <?php foreach ($faculty as $f): ?>
          <div class="card">
            <small style="color:var(--secondary-color);font-weight:600;"><?= e($f['designation']) ?></small>
            <h3 style="margin:0.25rem 0;"><?= e($f['name']) ?></h3>
            <p style="font-size:0.85rem;margin:0;"><?= e($f['qualification']) ?> · <?= e((string)$f['experience_years']) ?> yrs</p>
            <p style="font-size:0.82rem;color:var(--text-muted);"><?= e($f['specialization']) ?> · <?= e($f['email']) ?></p>
          </div>
        <?php endforeach; ?>
      </div>
    <?php elseif ($subSlug === 'laboratories'): ?>
      <h2 style="margin-top:0;">Departmental Laboratories</h2>
      <table class="data-table">
        <thead><tr><th>Lab Name</th><th>Area (Sq.Ft.)</th><th>Major Equipment</th><th>In-Charge</th></tr></thead>
        <tbody>
          <?php foreach ($labs as $lab): ?>
            <tr>
              <td><?= e($lab['name']) ?></td>
              <td><?= e((string)$lab['area_sqft']) ?></td>
              <td><?= e($lab['equipment_summary']) ?></td>
              <td><?= e($lab['incharge']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php else: ?>
      <h2 style="margin-top:0;"><?= e($activeSubPage['title'] ?? 'About Department') ?></h2>
      <div><?= $activeSubPage['content_html'] ?? '<p>' . e($dept['overview']) . '</p>' ?></div>
    <?php endif; ?>
  </section>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
