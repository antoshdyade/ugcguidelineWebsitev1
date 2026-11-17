<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('sliders_events');
$pdo = getDB();
$msg = '';
$err = '';

$eventCategories = ['Event', 'Notice', 'Achievement', 'Circular', 'Placement', 'Conference', 'Workshop / FDP'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    if ($action === 'add_slide' || $action === 'update_slide') {
        $imgUrl = trim($_POST['image_url'] ?? 'assets/images/hero_campus.jpg');
        if (!empty($_FILES['slide_image']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['slide_image'], __DIR__ . '/../uploads', 'photo');
            if ($up['ok']) $imgUrl = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '') {
            if ($action === 'update_slide' && !empty($_POST['slide_id'])) {
                $stmt = $pdo->prepare('UPDATE sliders SET title = ?, caption = ?, image_url = ?, cta_label = ?, cta_link = ? WHERE id = ?');
                $stmt->execute([trim($_POST['title']), trim($_POST['caption']), $imgUrl, trim($_POST['cta_label']), trim($_POST['cta_link']), (int)$_POST['slide_id']]);
                logAudit($pdo, $user, 'UPDATE_SLIDE', 'Slider', $_POST['title']);
                $msg = 'Hero slide updated.';
            } else {
                $stmt = $pdo->prepare('INSERT INTO sliders (title, caption, image_url, cta_label, cta_link) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([trim($_POST['title']), trim($_POST['caption']), $imgUrl, trim($_POST['cta_label']), trim($_POST['cta_link'])]);
                logAudit($pdo, $user, 'CREATE_SLIDE', 'Slider', $_POST['title']);
                $msg = 'Hero slide added.';
            }
        }
    } elseif ($action === 'move_slide' && !empty($_POST['id'])) {
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'sliders', (int)$_POST['id'], $dir, null, null, 'id DESC')) {
            $msg = 'Slide order updated.';
        }
    } elseif ($action === 'delete_slide') {
        $pdo->prepare('DELETE FROM sliders WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Slide removed.';
    } elseif ($action === 'add_ticker' || $action === 'update_ticker') {
        if ($action === 'update_ticker' && !empty($_POST['ticker_id'])) {
            $stmt = $pdo->prepare('UPDATE ticker_items SET text = ?, link_url = ?, badge_text = ? WHERE id = ?');
            $stmt->execute([trim($_POST['text']), trim($_POST['link_url']), trim($_POST['badge_text']), (int)$_POST['ticker_id']]);
            logAudit($pdo, $user, 'UPDATE_TICKER', 'Ticker', $_POST['text']);
            $msg = 'Ticker item updated.';
        } else {
            $stmt = $pdo->prepare('INSERT INTO ticker_items (text, link_url, badge_text) VALUES (?, ?, ?)');
            $stmt->execute([trim($_POST['text']), trim($_POST['link_url']), trim($_POST['badge_text'])]);
            logAudit($pdo, $user, 'CREATE_TICKER', 'Ticker', $_POST['text']);
            $msg = 'Ticker item added.';
        }
    } elseif ($action === 'move_ticker' && !empty($_POST['id'])) {
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'ticker_items', (int)$_POST['id'], $dir, null, null, 'id DESC')) {
            $msg = 'Ticker order updated.';
        }
    } elseif ($action === 'delete_ticker') {
        $pdo->prepare('DELETE FROM ticker_items WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Ticker item removed.';
    } elseif ($action === 'add_event' || $action === 'update_event') {
        $imgUrl = trim($_POST['existing_event_image'] ?? '');
        if (!empty($_FILES['event_image']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['event_image'], __DIR__ . '/../uploads', 'photo');
            if ($up['ok']) $imgUrl = $up['file_url'];
            else $err = $up['error'];
        }
        $evCat = trim((string)($_POST['category'] ?? 'Event')) ?: 'Event';
        if ($err === '') {
            if ($action === 'update_event' && !empty($_POST['event_id'])) {
                $stmt = $pdo->prepare('UPDATE campus_events SET title = ?, event_date = ?, category = ?, summary = ?, image_url = ? WHERE id = ?');
                $stmt->execute([trim($_POST['title']), $_POST['event_date'], $evCat, trim($_POST['summary']), $imgUrl, (int)$_POST['event_id']]);
                logAudit($pdo, $user, 'UPDATE_EVENT', 'Event', $_POST['title']);
                $msg = 'Event/Notice updated.';
            } else {
                $stmt = $pdo->prepare('INSERT INTO campus_events (title, event_date, category, summary, image_url) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([trim($_POST['title']), $_POST['event_date'], $evCat, trim($_POST['summary']), $imgUrl]);
                logAudit($pdo, $user, 'CREATE_EVENT', 'Event', $_POST['title']);
                $msg = 'Event/Notice published.';
            }
        }
    } elseif ($action === 'move_event' && !empty($_POST['id'])) {
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'campus_events', (int)$_POST['id'], $dir, null, null, 'event_date DESC, id DESC')) {
            $msg = 'Event display order updated.';
        }
    } elseif ($action === 'delete_event') {
        $pdo->prepare('DELETE FROM campus_events WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Event/Notice deleted.';
    }
}

$editSlide = null;
if (!empty($_GET['edit_slide'])) {
    $st = $pdo->prepare('SELECT * FROM sliders WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit_slide']]);
    $editSlide = $st->fetch() ?: null;
}
$editTicker = null;
if (!empty($_GET['edit_ticker'])) {
    $st = $pdo->prepare('SELECT * FROM ticker_items WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit_ticker']]);
    $editTicker = $st->fetch() ?: null;
}
$editEvent = null;
if (!empty($_GET['edit_event'])) {
    $st = $pdo->prepare('SELECT * FROM campus_events WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit_event']]);
    $editEvent = $st->fetch() ?: null;
}

$sliders = $pdo->query('SELECT * FROM sliders ORDER BY sort_order ASC, id DESC')->fetchAll();
$ticker  = $pdo->query('SELECT * FROM ticker_items ORDER BY sort_order ASC, id DESC')->fetchAll();
$events  = $pdo->query('SELECT * FROM campus_events ORDER BY sort_order ASC, event_date DESC, id DESC')->fetchAll();
$adminPageTitle = 'Homepage Sliders, News Ticker & Events';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
  <datalist id="event-cat-presets">
    <?php foreach ($eventCategories as $ec): ?>
      <option value="<?= e($ec) ?>"></option>
    <?php endforeach; ?>
  </datalist>

  <div class="grid-3" style="margin-bottom:1.5rem;">
    <form method="post" enctype="multipart/form-data" class="card" <?= $editSlide ? 'style="border:2px solid var(--secondary-color);"' : '' ?>>
      <h2 style="margin-top:0;"><?= $editSlide ? 'Edit Hero Slide' : 'Add Hero Slide' ?></h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="<?= $editSlide ? 'update_slide' : 'add_slide' ?>">
      <?php if ($editSlide): ?><input type="hidden" name="slide_id" value="<?= (int)$editSlide['id'] ?>"><?php endif; ?>
      <input type="text" name="title" required value="<?= e($editSlide['title'] ?? '') ?>" placeholder="Slide Title" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="caption" value="<?= e($editSlide['caption'] ?? '') ?>" placeholder="Caption" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <label style="display:block;font-size:0.82rem;margin-bottom:0.5rem;">Upload Banner Image: <input type="file" name="slide_image" accept="image/jpeg,image/png,image/webp" data-aspect="16:9"></label>
      <input type="text" name="image_url" value="<?= e($editSlide['image_url'] ?? 'assets/images/hero_campus.jpg') ?>" placeholder="Or Image URL" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="cta_label" value="<?= e($editSlide['cta_label'] ?? 'Explore') ?>" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="cta_link" value="<?= e($editSlide['cta_link'] ?? 'page.php?slug=about-overview') ?>" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <button type="submit" class="btn-primary"><?= $editSlide ? 'Update Slide' : 'Add Slide' ?></button>
      <?php if ($editSlide): ?><a href="manage_sliders.php" class="btn-secondary" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <form method="post" class="card" <?= $editTicker ? 'style="border:2px solid var(--secondary-color);"' : '' ?>>
      <h2 style="margin-top:0;"><?= $editTicker ? 'Edit News Ticker' : 'Add News Ticker' ?></h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="<?= $editTicker ? 'update_ticker' : 'add_ticker' ?>">
      <?php if ($editTicker): ?><input type="hidden" name="ticker_id" value="<?= (int)$editTicker['id'] ?>"><?php endif; ?>
      <input type="text" name="text" required value="<?= e($editTicker['text'] ?? '') ?>" placeholder="Ticker Announcement Text" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="badge_text" value="<?= e($editTicker['badge_text'] ?? 'Notice') ?>" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="link_url" value="<?= e($editTicker['link_url'] ?? 'quick-links.php') ?>" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <button type="submit" class="btn-primary"><?= $editTicker ? 'Update Ticker' : 'Publish Ticker' ?></button>
      <?php if ($editTicker): ?><a href="manage_sliders.php" class="btn-secondary" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <form method="post" enctype="multipart/form-data" class="card" <?= $editEvent ? 'style="border:2px solid var(--secondary-color);"' : '' ?>>
      <h2 style="margin-top:0;"><?= $editEvent ? 'Edit Event / Achievement' : 'Add Event / Achievement' ?></h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="<?= $editEvent ? 'update_event' : 'add_event' ?>">
      <?php if ($editEvent): ?><input type="hidden" name="event_id" value="<?= (int)$editEvent['id'] ?>"><?php endif; ?>
      <input type="hidden" name="existing_event_image" value="<?= e($editEvent['image_url'] ?? '') ?>">
      <input type="text" name="title" required value="<?= e($editEvent['title'] ?? '') ?>" placeholder="Event/Notice Title" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <div class="grid-2" style="margin-bottom:0.5rem;">
        <input type="date" name="event_date" value="<?= e($editEvent['event_date'] ?? date('Y-m-d')) ?>" required style="padding:0.5rem;">
        <input type="text" name="category" list="event-cat-presets" value="<?= e($editEvent['category'] ?? 'Event') ?>" required placeholder="Category (Select or Type Custom)" style="padding:0.5rem;">
      </div>
      <textarea name="summary" rows="2" required placeholder="Summary..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e($editEvent['summary'] ?? '') ?></textarea>
      <label style="display:block;font-size:0.82rem;margin-bottom:0.5rem;">Thumbnail Photo (Optional): <input type="file" name="event_image" accept="image/jpeg,image/png,image/webp" data-aspect="4:3"></label>
      <button type="submit" class="btn-primary"><?= $editEvent ? 'Update Event' : 'Publish Event' ?></button>
      <?php if ($editEvent): ?><a href="manage_sliders.php" class="btn-secondary" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3 style="margin-top:0;">Active Hero Slides</h3>
      <?php foreach ($sliders as $sl): ?>
        <div style="padding:0.5rem 0;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
          <span><strong><?= e($sl['title']) ?></strong></span>
          <div style="white-space:nowrap;">
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_slide"><input type="hidden" name="id" value="<?= (int)$sl['id'] ?>"><button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;">&uarr;</button><button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;">&darr;</button></form>
            <a href="?edit_slide=<?= (int)$sl['id'] ?>" class="btn-primary" style="padding:2px 8px;font-size:0.78rem;">Edit</a>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_slide"><input type="hidden" name="id" value="<?= (int)$sl['id'] ?>"><button class="btn-secondary" style="padding:2px 8px;">Remove</button></form>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
    <div class="card">
      <h3 style="margin-top:0;">Active Events &amp; Ticker Items</h3>
      <?php foreach ($ticker as $tk): ?>
        <div style="padding:0.4rem 0;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
          <span>[Ticker] <?= e($tk['text']) ?></span>
          <div style="white-space:nowrap;">
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_ticker"><input type="hidden" name="id" value="<?= (int)$tk['id'] ?>"><button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;">&uarr;</button><button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;">&darr;</button></form>
            <a href="?edit_ticker=<?= (int)$tk['id'] ?>" class="btn-primary" style="padding:2px 8px;font-size:0.78rem;">Edit</a>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_ticker"><input type="hidden" name="id" value="<?= (int)$tk['id'] ?>"><button class="btn-secondary" style="padding:2px 8px;">Remove</button></form>
          </div>
        </div>
      <?php endforeach; ?>
      <?php foreach ($events as $ev): ?>
        <div style="padding:0.4rem 0;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
          <span>[<?= e($ev['category']) ?>] <?= e($ev['title']) ?></span>
          <div style="white-space:nowrap;">
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_event"><input type="hidden" name="id" value="<?= (int)$ev['id'] ?>"><button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;">&uarr;</button><button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;">&darr;</button></form>
            <a href="?edit_event=<?= (int)$ev['id'] ?>" class="btn-primary" style="padding:2px 8px;font-size:0.78rem;">Edit</a>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_event"><input type="hidden" name="id" value="<?= (int)$ev['id'] ?>"><button class="btn-secondary" style="padding:2px 8px;">Remove</button></form>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
