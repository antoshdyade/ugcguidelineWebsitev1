<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('gallery');
$pdo = getDB();
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    if ($action === 'add_album') {
        $coverUrl = 'assets/images/hero_campus.jpg';
        if (!empty($_FILES['cover_image']['name'])) {
            $up = handleSecureUpload($_FILES['cover_image'], __DIR__ . '/../uploads');
            if ($up['ok']) $coverUrl = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '') {
            $pdo->prepare('INSERT INTO gallery_albums (title, category, event_date, cover_url) VALUES (?, ?, ?, ?)')
                ->execute([trim($_POST['title']), trim($_POST['category']), $_POST['event_date'], $coverUrl]);
            logAudit($pdo, $user, 'CREATE_ALBUM', 'Gallery', $_POST['title']);
            $msg = 'Gallery album created.';
        }
    } elseif ($action === 'add_photo') {
        $imgUrl = '';
        if (!empty($_FILES['photo']['name'])) {
            $up = handleSecureUpload($_FILES['photo'], __DIR__ . '/../uploads');
            if ($up['ok']) $imgUrl = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '' && $imgUrl !== '') {
            $pdo->prepare('INSERT INTO gallery_photos (album_id, image_url, caption, alt_text) VALUES (?, ?, ?, ?)')
                ->execute([(int)$_POST['album_id'], $imgUrl, trim($_POST['caption']), trim($_POST['caption'])]);
            $msg = 'Photo uploaded to album.';
        } elseif ($err === '') {
            $err = 'Please select an image file to upload.';
        }
    } elseif ($action === 'move_album' && !empty($_POST['id'])) {
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'gallery_albums', (int)$_POST['id'], $dir, null, null, 'event_date DESC, id DESC')) {
            $msg = 'Gallery album order updated.';
        }
    } elseif ($action === 'delete_album') {
        $pdo->prepare('DELETE FROM gallery_albums WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Album deleted.';
    }
}

$albums = $pdo->query('SELECT * FROM gallery_albums ORDER BY sort_order ASC, event_date DESC, id DESC')->fetchAll();
$photosStmt = $pdo->query('SELECT * FROM gallery_photos ORDER BY id DESC');
$photosByAlbum = [];
foreach ($photosStmt->fetchAll() as $ph) {
    $photosByAlbum[$ph['album_id']][] = $ph;
}
$adminPageTitle = 'Picture Gallery & Event Photo Albums';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

  <div class="grid-2" style="margin-bottom:1.5rem;">
    <form method="post" enctype="multipart/form-data" class="card">
      <h2 style="margin-top:0;">Create New Album</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="add_album">
      <input type="text" name="title" required placeholder="Album Title" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <div class="grid-2" style="margin-bottom:0.5rem;">
        <input type="text" name="category" value="Campus" required placeholder="Category" style="padding:0.5rem;">
        <input type="date" name="event_date" value="<?= date('Y-m-d') ?>" required style="padding:0.5rem;">
      </div>
      <label style="display:block;font-size:0.85rem;margin-bottom:0.75rem;">Cover Photo: <input type="file" name="cover_image" accept="image/jpeg,image/png,image/webp" required></label>
      <button type="submit" class="btn-primary">Create Album</button>
    </form>

    <form method="post" enctype="multipart/form-data" class="card">
      <h2 style="margin-top:0;">Upload Photo to Album</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="add_photo">
      <select name="album_id" required style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <?php foreach ($albums as $al): ?>
          <option value="<?= (int)$al['id'] ?>"><?= e($al['title']) ?></option>
        <?php endforeach; ?>
      </select>
      <input type="text" name="caption" required placeholder="Photo Caption" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <label style="display:block;font-size:0.85rem;margin-bottom:0.75rem;">Select Image (JPG/PNG/WEBP): <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label>
      <button type="submit" class="btn-primary">Upload Photo</button>
    </form>
  </div>

  <div class="grid-3">
    <?php foreach ($albums as $al): $phs = $photosByAlbum[$al['id']] ?? []; ?>
      <div class="card">
        <img src="<?= e(mediaUrl($al['cover_url'] ?? '')) ?>" alt="<?= e($al['title']) ?>" style="width:100%;height:150px;object-fit:cover;border-radius:6px;">
        <h3 style="margin:0.5rem 0 0.2rem;"><?= e($al['title']) ?></h3>
        <small style="color:var(--text-muted);"><?= e($al['category']) ?> · <?= count($phs) ?> photos</small>
        <div style="display:flex;gap:0.4rem;align-items:center;margin-top:0.5rem;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_album"><input type="hidden" name="id" value="<?= (int)$al['id'] ?>"><button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;">&uarr;</button><button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;">&darr;</button></form>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_album"><input type="hidden" name="id" value="<?= (int)$al['id'] ?>"><button class="btn-secondary">Delete Album</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
