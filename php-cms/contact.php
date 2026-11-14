<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
$pdo = getDB();

$dirQuery = trim($_GET['q'] ?? '');
$stmt = $dirQuery
    ? $pdo->prepare('SELECT * FROM telephone_directory WHERE section LIKE ? OR officer_name LIKE ? OR email LIKE ? ORDER BY sort_order ASC, id ASC')
    : $pdo->query('SELECT * FROM telephone_directory ORDER BY sort_order ASC, id ASC');
if ($dirQuery) {
    $like = '%' . $dirQuery . '%';
    $stmt->execute([$like, $like, $like]);
}
$directory = $stmt->fetchAll();

$pageTitle = 'Contact Us & Telephone Directory';
require_once __DIR__ . '/includes/header.php';
?>
<h1>Contact Us &amp; Telephone Directory</h1>
<div class="grid-2" style="margin-bottom:1.5rem;">
  <div class="card">
    <h2 style="margin-top:0;">Official Address</h2>
    <p><?= e($settings['address']) ?></p>
    <p>Phone: <?= e($settings['phone']) ?> · Email: <?= e($settings['email']) ?></p>
    <p>Anti-Ragging Helpline: <?= e($settings['anti_ragging_helpline']) ?></p>
  </div>
  <div class="card" style="padding:0;overflow:hidden;">
    <iframe title="Campus Location" src="https://maps.google.com/maps?q=<?= urlencode($settings['map_embed_query']) ?>&output=embed" style="width:100%;height:260px;border:0;"></iframe>
  </div>
</div>

<div class="card">
  <form method="get" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
    <h2 style="margin:0;">Telephone Directory</h2>
    <div>
      <input type="search" name="q" value="<?= e($dirQuery) ?>" placeholder="Search section or officer..." style="padding:0.45rem 0.75rem;border:1px solid var(--border-color);border-radius:8px;">
      <button type="submit" class="btn-primary">Search</button>
    </div>
  </form>
  <table class="data-table">
    <thead><tr><th>Section</th><th>Officer</th><th>Designation</th><th>Ext.</th><th>Direct Phone</th><th>Email</th></tr></thead>
    <tbody>
      <?php foreach ($directory as $row): ?>
        <tr>
          <td><?= e($row['section']) ?></td>
          <td><?= e($row['officer_name']) ?></td>
          <td><?= e($row['designation']) ?></td>
          <td><?= e($row['extension']) ?></td>
          <td><?= e($row['direct_phone']) ?></td>
          <td><?= e($row['email']) ?></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
