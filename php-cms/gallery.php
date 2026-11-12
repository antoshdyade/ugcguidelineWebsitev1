<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
$pdo = getDB();

$albums = $pdo->query('SELECT * FROM gallery_albums ORDER BY event_date DESC')->fetchAll();
$photosByAlbum = [];
foreach ($pdo->query('SELECT * FROM gallery_photos')->fetchAll() as $ph) {
    $photosByAlbum[$ph['album_id']][] = $ph;
}

$pageTitle = 'Picture Gallery';
require_once __DIR__ . '/includes/header.php';
?>
<h1>Picture Gallery (UGC Section 5(i))</h1>
<div class="grid-4">
  <?php foreach ($albums as $alb): ?>
    <article class="card">
      <img src="<?= e($alb['cover_url']) ?>" alt="<?= e($alb['title']) ?>" style="width:100%;height:180px;object-fit:cover;border-radius:8px;">
      <small style="color:var(--text-muted);display:block;margin-top:0.5rem;"><?= e($alb['category']) ?> · <?= e($alb['event_date']) ?></small>
      <h3 style="margin:0.25rem 0;"><?= e($alb['title']) ?></h3>
    </article>
  <?php endforeach; ?>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
