<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('sliders_events');
$pdo = getDB();
$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    if ($action === 'add_slide') {
        $stmt = $pdo->prepare('INSERT INTO sliders (title, caption, image_url, cta_label, cta_link) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([trim($_POST['title']), trim($_POST['caption']), trim($_POST['image_url']), trim($_POST['cta_label']), trim($_POST['cta_link'])]);
        logAudit($pdo, $user, 'CREATE_SLIDE', 'Slider', $_POST['title']);
        $msg = 'Hero slide added.';
    } elseif ($action === 'add_ticker') {
        $stmt = $pdo->prepare('INSERT INTO ticker_items (text, link_url, badge_text) VALUES (?, ?, ?)');
        $stmt->execute([trim($_POST['text']), trim($_POST['link_url']), trim($_POST['badge_text'])]);
        logAudit($pdo, $user, 'CREATE_TICKER', 'Ticker', $_POST['text']);
        $msg = 'Ticker item added.';
    } elseif ($action === 'add_event') {
        $stmt = $pdo->prepare('INSERT INTO campus_events (title, event_date, category, summary) VALUES (?, ?, ?, ?)');
        $stmt->execute([trim($_POST['title']), $_POST['event_date'], $_POST['category'], trim($_POST['summary'])]);
        logAudit($pdo, $user, 'CREATE_EVENT', 'Event', $_POST['title']);
        $msg = 'Event/Notice published.';
    }
}

$sliders = $pdo->query('SELECT * FROM sliders ORDER BY sort_order ASC')->fetchAll();
$ticker  = $pdo->query('SELECT * FROM ticker_items ORDER BY sort_order ASC')->fetchAll();
$events  = $pdo->query('SELECT * FROM campus_events ORDER BY event_date DESC')->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manage Sliders, Ticker &amp; Events</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="container" style="padding:2rem 1rem;">
  <p><a href="dashboard.php">&larr; Dashboard</a></p>
  <h1>Homepage Sliders, Ticker &amp; Events</h1>
  <?php if ($msg): ?><p style="color:#15803d;font-weight:600;"><?= e($msg) ?></p><?php endif; ?>

  <div class="grid-2">
    <form method="post" class="card">
      <h2 style="margin-top:0;">Add Hero Slide</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="add_slide">
      <input type="text" name="title" required placeholder="Slide Title" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="caption" placeholder="Caption" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="image_url" value="assets/images/hero_campus.jpg" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="cta_label" value="Explore" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="cta_link" value="page.php?slug=about-overview" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <button type="submit" class="btn-primary">Add Slide</button>
    </form>

    <form method="post" class="card">
      <h2 style="margin-top:0;">Add Ticker &amp; Event</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="add_ticker">
      <input type="text" name="text" required placeholder="Ticker Announcement Text" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="badge_text" value="Notice" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="link_url" value="quick-links.php" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <button type="submit" class="btn-primary">Publish Ticker</button>
    </form>
  </div>
</body>
</html>
