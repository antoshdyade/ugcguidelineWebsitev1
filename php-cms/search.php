<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';

$pdo = getDB();
$q = trim($_GET['q'] ?? '');
$results = [];

if (mb_strlen($q) >= 2) {
    $like = '%' . $q . '%';

    $pStmt = $pdo->prepare('SELECT title, slug FROM pages WHERE is_published = 1 AND (title LIKE ? OR content_html LIKE ?) LIMIT 8');
    $pStmt->execute([$like, $like]);
    foreach ($pStmt->fetchAll() as $r) {
        $results[] = ['type' => 'UGC Page', 'title' => $r['title'], 'url' => 'page.php?slug=' . urlencode($r['slug'])];
    }

    $fStmt = $pdo->prepare('SELECT f.name, f.designation, d.slug FROM faculty f JOIN departments d ON f.department_id = d.id WHERE f.name LIKE ? OR f.specialization LIKE ? LIMIT 8');
    $fStmt->execute([$like, $like]);
    foreach ($fStmt->fetchAll() as $r) {
        $results[] = ['type' => 'Faculty · ' . $r['designation'], 'title' => $r['name'], 'url' => 'department.php?dept=' . urlencode($r['slug']) . '&sub=faculty'];
    }

    $dStmt = $pdo->prepare('SELECT title, category, file_url FROM documents WHERE title LIKE ? OR category LIKE ? LIMIT 8');
    $dStmt->execute([$like, $like]);
    foreach ($dStmt->fetchAll() as $r) {
        $results[] = ['type' => 'Document · ' . $r['category'], 'title' => $r['title'], 'url' => $r['file_url']];
    }
}

if (isset($_GET['ajax'])) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($results);
    exit;
}

$pageTitle = 'Search Results';
require_once __DIR__ . '/includes/header.php';
?>
<h1>Global Search Results for &ldquo;<?= e($q) ?>&rdquo;</h1>
<div class="card">
  <?php if (!$results): ?>
    <p>No matching disclosures, faculty profiles, or downloadable documents found.</p>
  <?php else: ?>
    <ul>
      <?php foreach ($results as $item): ?>
        <li style="margin-bottom:0.65rem;">
          <a href="<?= e($item['url']) ?>"><strong><?= e($item['title']) ?></strong></a>
          <small style="color:var(--text-muted);"> (<?= e($item['type']) ?>)</small>
        </li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
