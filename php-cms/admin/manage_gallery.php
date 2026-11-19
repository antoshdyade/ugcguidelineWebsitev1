<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('gallery');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    if ($action === 'add_album' || $action === 'update_album') {
        $coverUrl = trim((string)($_POST['existing_cover'] ?? 'assets/images/hero_campus.jpg'));
        if (!empty($_FILES['cover_image']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['cover_image'], __DIR__ . '/../uploads', 'photo');
            if ($up['ok']) $coverUrl = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '') {
            $title = trim((string)($_POST['title'] ?? ''));
            $category = trim((string)($_POST['category'] ?? 'Campus'));
            $eventDate = (string)($_POST['event_date'] ?? date('Y-m-d'));
            $isSuper = cmsIsSuperAdmin($user);
            if ($action === 'update_album' && !empty($_POST['album_id'])) {
                $albId = (int)$_POST['album_id'];
                $currStmt = $pdo->prepare('SELECT * FROM gallery_albums WHERE id = ? LIMIT 1');
                $currStmt->execute([$albId]);
                $curr = $currStmt->fetch();
                if (!$curr) {
                    $err = 'Gallery album not found.';
                } else {
                    $payload = [
                        'title' => $title,
                        'category' => $category,
                        'event_date' => $eventDate,
                        'cover_url' => $coverUrl,
                    ];
                    if ($isSuper) {
                        $pdo->prepare('UPDATE gallery_albums SET title = ?, category = ?, event_date = ?, cover_url = ?, status = ? WHERE id = ?')
                            ->execute([$title, $category, $eventDate, $coverUrl, 'published', $albId]);
                        logAudit($pdo, $user, 'UPDATE_ALBUM', 'Gallery', $title);
                        $msg = 'Gallery album updated and published.';
                    } else {
                        cmsQueuePendingUpdate($pdo, $user, 'gallery_albums', $albId, $title, $curr, $payload);
                        $msg = 'Changes to album "' . $title . '" submitted for Super Admin approval. Existing live album remains unchanged.';
                    }
                }
            } else {
                $insStatus = $isSuper ? 'published' : 'pending_approval';
                $pdo->prepare('INSERT INTO gallery_albums (title, category, event_date, cover_url, status) VALUES (?, ?, ?, ?, ?)')
                    ->execute([$title, $category, $eventDate, $coverUrl, $insStatus]);
                $newAlbId = (int)$pdo->lastInsertId();
                if ($isSuper) {
                    logAudit($pdo, $user, 'CREATE_ALBUM', 'Gallery', $title);
                    $msg = 'Gallery album created and published.';
                } else {
                    cmsQueuePendingCreate($pdo, $user, 'gallery_albums', $newAlbId, $title, [
                        'title' => $title,
                        'category' => $category,
                        'event_date' => $eventDate,
                        'cover_url' => $coverUrl,
                        'status' => 'pending_approval',
                    ]);
                    $msg = 'New gallery album "' . $title . '" submitted for Super Admin approval before going live.';
                }
            }
        }
    } elseif ($action === 'add_photo') {
        $imgUrl = '';
        if (!empty($_FILES['photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['photo'], __DIR__ . '/../uploads', 'photo');
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
    } elseif ($action === 'delete_photo' && !empty($_POST['photo_id'])) {
        $pdo->prepare('DELETE FROM gallery_photos WHERE id = ?')->execute([(int)$_POST['photo_id']]);
        logAudit($pdo, $user, 'DELETE_PHOTO', 'Gallery', 'Photo #' . (int)$_POST['photo_id']);
        $msg = 'Photo removed from album.';
    } elseif ($action === 'move_album' && !empty($_POST['id'])) {
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'gallery_albums', (int)$_POST['id'], $dir, null, null, 'event_date DESC, id DESC')) {
            $msg = 'Gallery album order updated.';
        }
    } elseif ($action === 'delete_album' && !empty($_POST['id'])) {
        $albId = (int)$_POST['id'];
        $currStmt = $pdo->prepare('SELECT * FROM gallery_albums WHERE id = ? LIMIT 1');
        $currStmt->execute([$albId]);
        $curr = $currStmt->fetch();
        if (!$curr) {
            $err = 'Gallery album not found.';
        } elseif (cmsIsSuperAdmin($user)) {
            $pdo->prepare('DELETE FROM gallery_photos WHERE album_id = ?')->execute([$albId]);
            $pdo->prepare('DELETE FROM gallery_albums WHERE id = ?')->execute([$albId]);
            logAudit($pdo, $user, 'DELETE_ALBUM', 'Gallery', (string)($curr['title'] ?? '#' . $albId));
            $msg = 'Album deleted.';
        } else {
            cmsQueuePendingDelete($pdo, $user, 'gallery_albums', $albId, (string)($curr['title'] ?? 'Album #' . $albId), $curr);
            $msg = 'Delete request for album "' . ($curr['title'] ?? '#' . $albId) . '" submitted for Super Admin approval. Photos and live album remain intact until approved.';
        }
    }
}

$editAlbum = null;
if (!empty($_GET['edit_album'])) {
    $st = $pdo->prepare('SELECT * FROM gallery_albums WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit_album']]);
    $editAlbum = $st->fetch() ?: null;
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
  <datalist id="gallery-cat-presets">
    <option value="Campus"></option>
    <option value="Convocation"></option>
    <option value="Technical Fest"></option>
    <option value="Cultural & Sports"></option>
    <option value="Workshops & Seminars"></option>
    <option value="Placements & Alumni"></option>
  </datalist>

  <div class="grid-2" style="margin-bottom:1.5rem;">
    <form method="post" enctype="multipart/form-data" class="card" <?= $editAlbum ? 'style="border:2px solid var(--secondary-color);"' : '' ?>>
      <h2 style="margin-top:0;"><?= $editAlbum ? 'Edit Album: ' . e($editAlbum['title']) : 'Create New Album' ?></h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="<?= $editAlbum ? 'update_album' : 'add_album' ?>">
      <?php if ($editAlbum): ?><input type="hidden" name="album_id" value="<?= (int)$editAlbum['id'] ?>"><?php endif; ?>
      <input type="hidden" name="existing_cover" value="<?= e($editAlbum['cover_url'] ?? 'assets/images/hero_campus.jpg') ?>">
      <input type="text" name="title" required value="<?= e($editAlbum['title'] ?? '') ?>" placeholder="Album Title" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <div class="grid-2" style="margin-bottom:0.5rem;">
        <input type="text" name="category" list="gallery-cat-presets" value="<?= e($editAlbum['category'] ?? 'Campus') ?>" required placeholder="Category" style="padding:0.5rem;">
        <input type="date" name="event_date" value="<?= e($editAlbum['event_date'] ?? date('Y-m-d')) ?>" required style="padding:0.5rem;">
      </div>
      <label style="display:block;font-size:0.85rem;margin-bottom:0.75rem;">Cover Photo<?= $editAlbum ? ' (Optional to replace)' : '' ?>: <input type="file" name="cover_image" accept="image/jpeg,image/png,image/webp" data-aspect="4:3" <?= $editAlbum ? '' : 'required' ?>></label>
      <button type="submit" class="btn-primary"><?= $editAlbum ? 'Update Album' : 'Create Album' ?></button>
      <?php if ($editAlbum): ?><a href="manage_gallery.php" class="btn-secondary" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
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
      <label style="display:block;font-size:0.85rem;margin-bottom:0.75rem;">Select Image (JPG/PNG/WEBP): <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" data-aspect="4:3" required></label>
      <button type="submit" class="btn-primary">Upload Photo</button>
    </form>
  </div>

  <div class="grid-3">
    <?php foreach ($albums as $al): $phs = $photosByAlbum[$al['id']] ?? []; ?>
      <div class="card">
        <img src="<?= e(mediaUrl($al['cover_url'] ?? '')) ?>" alt="<?= e($al['title']) ?>" style="width:100%;height:150px;object-fit:cover;border-radius:6px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.4rem;margin:0.5rem 0 0.2rem;flex-wrap:wrap;">
          <h3 style="margin:0;"><?= e($al['title']) ?></h3>
          <?= cmsModerationStatusBadge((string)($al['status'] ?? 'published')) ?>
        </div>
        <small style="color:var(--text-muted);"><?= e($al['category']) ?> · <?= count($phs) ?> photos</small>
        <?php if (!empty($phs)): ?>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.35rem;margin-top:0.65rem;">
            <?php foreach ($phs as $ph): ?>
              <div style="border:1px solid var(--border-color);border-radius:6px;overflow:hidden;background:#FAF9F6;">
                <img src="<?= e(mediaUrl($ph['image_url'] ?? '')) ?>" alt="<?= e($ph['caption'] ?? '') ?>" style="width:100%;height:54px;object-fit:cover;display:block;">
                <form method="post" style="padding:2px;" onsubmit="return confirm('Delete this photo?');">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="delete_photo">
                  <input type="hidden" name="photo_id" value="<?= (int)$ph['id'] ?>">
                  <button type="submit" class="btn-secondary" style="width:100%;padding:2px;font-size:0.68rem;">&times; Remove</button>
                </form>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
        <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;margin-top:0.65rem;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_album"><input type="hidden" name="id" value="<?= (int)$al['id'] ?>"><button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;">&uarr;</button><button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;">&darr;</button></form>
          <a href="?edit_album=<?= (int)$al['id'] ?>" class="btn-primary" style="padding:2px 8px;font-size:0.78rem;">Edit</a>
          <form method="post" style="display:inline;" onsubmit="return confirm('Delete this album and all its photos?');"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_album"><input type="hidden" name="id" value="<?= (int)$al['id'] ?>"><button class="btn-secondary" style="padding:2px 8px;font-size:0.78rem;">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
