<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
$pdo = getDB();

$cat = trim($_GET['cat'] ?? 'All');
$q   = trim($_GET['q'] ?? '');

$sql = 'SELECT * FROM documents WHERE 1=1';
$params = [];
if ($cat !== 'All' && $cat !== '') {
    $sql .= ' AND category = ?';
    $params[] = $cat;
}
if ($q !== '') {
    $sql .= ' AND (title LIKE ? OR file_name LIKE ?)';
    $params[] = '%' . $q . '%';
    $params[] = '%' . $q . '%';
}
$sql .= ' ORDER BY uploaded_at DESC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$docs = $stmt->fetchAll();

$categories = ['All', 'Fee Structure', 'Academic Calendar', 'Syllabus', 'UGC & AICTE Approvals', 'NAAC / NBA / NIRF', 'Annual Reports & Audits', 'Circulars & Forms'];
$pageTitle = 'Quick Links & Document Repository';
require_once __DIR__ . '/includes/header.php';
?>
<h1>Quick Links &amp; Downloadable Repository</h1>
<form method="get" style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.25rem;">
  <select name="cat" style="padding:0.5rem;border-radius:8px;border:1px solid var(--border-color);">
    <?php foreach ($categories as $c): ?>
      <option value="<?= e($c) ?>" <?= $cat === $c ? 'selected' : '' ?>><?= e($c) ?></option>
    <?php endforeach; ?>
  </select>
  <input type="search" name="q" value="<?= e($q) ?>" placeholder="Filter documents..." style="padding:0.5rem 0.75rem;border-radius:8px;border:1px solid var(--border-color);min-width:240px;">
  <button type="submit" class="btn-primary">Filter</button>
</form>

<div class="card">
  <table class="data-table">
    <thead><tr><th>Document Title</th><th>Category</th><th>Size</th><th>Date</th><th>Action</th></tr></thead>
    <tbody>
      <?php foreach ($docs as $d): ?>
        <tr>
          <td><strong><?= e($d['title']) ?></strong><br><small><?= e($d['file_name']) ?></small></td>
          <td><?= e($d['category']) ?></td>
          <td><?= e(formatBytes((int)$d['file_size_bytes'])) ?></td>
          <td><?= e($d['uploaded_at']) ?></td>
          <td><a href="<?= e($d['file_url']) ?>" download class="btn-primary">Download</a></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
