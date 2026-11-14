<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
$pdo = getDB();

$albums = $pdo->query('SELECT * FROM gallery_albums ORDER BY sort_order ASC, event_date DESC, id DESC')->fetchAll();
$photosByAlbum = [];
foreach ($pdo->query('SELECT * FROM gallery_photos')->fetchAll() as $ph) {
    $photosByAlbum[$ph['album_id']][] = $ph;
}

$pageTitle = 'Picture Gallery';
require_once __DIR__ . '/includes/header.php';
$albumPhotosPayload = [];
foreach ($albums as $alb) {
    $aid = (int)$alb['id'];
    $items = $photosByAlbum[$aid] ?? [];
    $mapped = [];
    foreach ($items as $ph) {
        $mapped[] = [
            'url'     => mediaUrl($ph['image_url'] ?? ''),
            'caption' => (string)($ph['caption'] ?? $alb['title']),
        ];
    }
    if (empty($mapped) && !empty($alb['cover_url'])) {
        $mapped[] = ['url' => mediaUrl($alb['cover_url']), 'caption' => (string)$alb['title']];
    }
    $albumPhotosPayload[$aid] = ['title' => (string)$alb['title'], 'photos' => $mapped];
}
?>
<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
  <h1 style="font-family:'Playfair Display',serif;margin:0;">Campus Picture Gallery &amp; Archives</h1>
  <small style="color:var(--text-muted);"><?= count($albums) ?> Event Albums</small>
</div>
<div class="grid-4">
  <?php foreach ($albums as $alb): $aid = (int)$alb['id']; $pCount = count($photosByAlbum[$aid] ?? []); ?>
    <article class="card" style="padding:0.75rem;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <img src="<?= e(mediaUrl($alb['cover_url'] ?? '')) ?>" alt="<?= e($alb['title']) ?>" style="width:100%;height:180px;object-fit:cover;border-radius:8px;display:block;">
        <small style="color:var(--text-muted);display:block;margin-top:0.55rem;"><?= e($alb['category']) ?> · <?= e($alb['event_date']) ?> · <?= $pCount ?> photos</small>
        <h3 style="margin:0.25rem 0 0.6rem;font-size:1rem;"><?= e($alb['title']) ?></h3>
      </div>
      <button type="button" class="btn-secondary" style="width:100%;justify-content:center;font-size:0.8rem;" onclick="svcoerOpenAlbumLightbox(<?= $aid ?>)">
        View Album Photos (<?= max(1, $pCount) ?>)
      </button>
    </article>
  <?php endforeach; ?>
</div>

<div id="gallery-lightbox" style="display:none;position:fixed;inset:0;z-index:1200;background:rgba(15,23,42,0.82);padding:1.25rem;overflow-y:auto;align-items:center;justify-content:center;" role="dialog" aria-modal="true" aria-labelledby="gallery-lightbox-title">
  <div class="card" style="max-width:960px;width:100%;margin:auto;position:relative;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;border-bottom:1px solid var(--border-color);padding-bottom:0.65rem;margin-bottom:1rem;">
      <h2 id="gallery-lightbox-title" style="margin:0;font-family:'Playfair Display',serif;font-size:1.3rem;">Album Photos</h2>
      <button type="button" class="btn-secondary" onclick="svcoerCloseAlbumLightbox()">Close &times;</button>
    </div>
    <div id="gallery-lightbox-grid" class="grid-3"></div>
  </div>
</div>
<script>
(function () {
  var albumsData = <?= json_encode($albumPhotosPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>;
  window.svcoerOpenAlbumLightbox = function (albumId) {
    var info = albumsData[albumId];
    var modal = document.getElementById('gallery-lightbox');
    var titleEl = document.getElementById('gallery-lightbox-title');
    var gridEl = document.getElementById('gallery-lightbox-grid');
    if (!info || !modal || !gridEl) return;
    titleEl.textContent = info.title;
    gridEl.innerHTML = '';
    info.photos.forEach(function (ph) {
      var fig = document.createElement('figure');
      fig.style.cssText = 'margin:0;border:1px solid var(--border-color);border-radius:8px;overflow:hidden;background:var(--surface-bg);';
      var img = document.createElement('img');
      img.src = ph.url;
      img.alt = ph.caption || info.title;
      img.style.cssText = 'width:100%;height:200px;object-fit:cover;display:block;';
      var cap = document.createElement('figcaption');
      cap.textContent = ph.caption || '';
      cap.style.cssText = 'padding:0.5rem 0.65rem;font-size:0.8rem;color:var(--text-muted);';
      fig.appendChild(img);
      fig.appendChild(cap);
      gridEl.appendChild(fig);
    });
    modal.style.display = 'flex';
  };
  window.svcoerCloseAlbumLightbox = function () {
    var modal = document.getElementById('gallery-lightbox');
    if (modal) modal.style.display = 'none';
  };
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') window.svcoerCloseAlbumLightbox();
  });
})();
</script>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
