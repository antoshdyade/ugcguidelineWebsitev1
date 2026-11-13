<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('sliders_events');
$pdo = getDB();
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    if ($action === 'add_slide') {
        $imgUrl = trim($_POST['image_url'] ?? 'assets/images/hero_campus.jpg');
        if (!empty($_FILES['slide_image']['name'])) {
            $up = handleSecureUpload($_FILES['slide_image'], __DIR__ . '/../uploads');
            if ($up['ok']) $imgUrl = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '') {
            $stmt = $pdo->prepare('INSERT INTO sliders (title, caption, image_url, cta_label, cta_link) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([trim($_POST['title']), trim($_POST['caption']), $imgUrl, trim($_POST['cta_label']), trim($_POST['cta_link'])]);
            logAudit($pdo, $user, 'CREATE_SLIDE', 'Slider', $_POST['title']);
            $msg = 'Hero slide added.';
        }
    } elseif ($action === 'delete_slide') {
        $pdo->prepare('DELETE FROM sliders WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Slide removed.';
    } elseif ($action === 'add_ticker') {
        $stmt = $pdo->prepare('INSERT INTO ticker_items (text, link_url, badge_text) VALUES (?, ?, ?)');
        $stmt->execute([trim($_POST['text']), trim($_POST['link_url']), trim($_POST['badge_text'])]);
        logAudit($pdo, $user, 'CREATE_TICKER', 'Ticker', $_POST['text']);
        $msg = 'Ticker item added.';
    } elseif ($action === 'delete_ticker') {
        $pdo->prepare('DELETE FROM ticker_items WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Ticker item removed.';
    } elseif ($action === 'add_event') {
        $imgUrl = '';
        if (!empty($_FILES['event_image']['name'])) {
            $up = handleSecureUpload($_FILES['event_image'], __DIR__ . '/../uploads');
            if ($up['ok']) $imgUrl = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '') {
            $stmt = $pdo->prepare('INSERT INTO campus_events (title, event_date, category, summary, image_url) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([trim($_POST['title']), $_POST['event_date'], $_POST['category'], trim($_POST['summary']), $imgUrl]);
            logAudit($pdo, $user, 'CREATE_EVENT', 'Event', $_POST['title']);
            $msg = 'Event/Notice published.';
        }
    } elseif ($action === 'delete_event') {
        $pdo->prepare('DELETE FROM campus_events WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Event/Notice deleted.';
    }
}

$sliders = $pdo->query('SELECT * FROM sliders ORDER BY sort_order ASC, id DESC')->fetchAll();
$ticker  = $pdo->query('SELECT * FROM ticker_items ORDER BY sort_order ASC, id DESC')->fetchAll();
$events  = $pdo->query('SELECT * FROM campus_events ORDER BY event_date DESC')->fetchAll();
$adminPageTitle = 'Homepage Sliders, News Ticker & Events';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

  <div class="grid-3" style="margin-bottom:1.5rem;">
    <form method="post" enctype="multipart/form-data" class="card">
      <h2 style="margin-top:0;">Add Hero Slide</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="add_slide">
      <input type="text" name="title" required placeholder="Slide Title" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="caption" placeholder="Caption" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <label style="display:block;font-size:0.82rem;margin-bottom:0.5rem;">Upload Banner Image: <input type="file" name="slide_image" accept="image/jpeg,image/png,image/webp"></label>
      <input type="text" name="image_url" value="assets/images/hero_campus.jpg" placeholder="Or Image URL" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="cta_label" value="Explore" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="cta_link" value="page.php?slug=about-overview" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <button type="submit" class="btn-primary">Add Slide</button>
    </form>

    <form method="post" class="card">
      <h2 style="margin-top:0;">Add News Ticker</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="add_ticker">
      <input type="text" name="text" required placeholder="Ticker Announcement Text" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="badge_text" value="Notice" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="link_url" value="quick-links.php" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <button type="submit" class="btn-primary">Publish Ticker</button>
    </form>

    <form method="post" enctype="multipart/form-data" class="card">
      <h2 style="margin-top:0;">Add Event / Achievement</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="add_event">
      <input type="text" name="title" required placeholder="Event/Notice Title" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <div class="grid-2" style="margin-bottom:0.5rem;">
        <input type="date" name="event_date" value="<?= date('Y-m-d') ?>" required style="padding:0.5rem;">
        <select name="category" style="padding:0.5rem;">
          <option>Event</option><option>Notice</option><option>Achievement</option><option>Circular</option><option>Placement</option>
        </select>
      </div>
      <textarea name="summary" rows="2" required placeholder="Summary..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"></textarea>
      <label style="display:block;font-size:0.82rem;margin-bottom:0.5rem;">Thumbnail Photo (Optional): <input type="file" name="event_image" accept="image/jpeg,image/png,image/webp"></label>
      <button type="submit" class="btn-primary">Publish Event</button>
    </form>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3 style="margin-top:0;">Active Hero Slides</h3>
      <?php foreach ($sliders as $sl): ?>
        <div style="padding:0.5rem 0;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
          <span><strong><?= e($sl['title']) ?></strong></span>
          <form method="post"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_slide"><input type="hidden" name="id" value="<?= (int)$sl['id'] ?>"><button class="btn-secondary" style="padding:2px 8px;">Remove</button></form>
        </div>
      <?php endforeach; ?>
    </div>
    <div class="card">
      <h3 style="margin-top:0;">Active Events &amp; Ticker Items</h3>
      <?php foreach ($ticker as $tk): ?>
        <div style="padding:0.4rem 0;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;">
          <span>[Ticker] <?= e($tk['text']) ?></span>
          <form method="post"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_ticker"><input type="hidden" name="id" value="<?= (int)$tk['id'] ?>"><button class="btn-secondary" style="padding:2px 8px;">Remove</button></form>
        </div>
      <?php endforeach; ?>
      <?php foreach ($events as $ev): ?>
        <div style="padding:0.4rem 0;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;">
          <span>[<?= e($ev['category']) ?>] <?= e($ev['title']) ?></span>
          <form method="post"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_event"><input type="hidden" name="id" value="<?= (int)$ev['id'] ?>"><button class="btn-secondary" style="padding:2px 8px;">Remove</button></form>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
