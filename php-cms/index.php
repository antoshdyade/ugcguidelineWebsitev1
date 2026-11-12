<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
$pdo = getDB();

$sliders = $pdo->query('SELECT * FROM sliders WHERE is_active = 1 ORDER BY sort_order ASC')->fetchAll();
$ticker  = $pdo->query('SELECT * FROM ticker_items WHERE is_active = 1 ORDER BY sort_order ASC')->fetchAll();
$depts   = $pdo->query('SELECT * FROM departments ORDER BY sort_order ASC')->fetchAll();
$events  = $pdo->query('SELECT * FROM campus_events ORDER BY event_date DESC LIMIT 5')->fetchAll();
$docs    = $pdo->query('SELECT * FROM documents WHERE is_quick_link = 1 ORDER BY uploaded_at DESC LIMIT 6')->fetchAll();
$cats    = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC')->fetchAll();

$pageTitle = 'Home — UGC NEP 2020 Self-Disclosure Portal';
require_once __DIR__ . '/includes/header.php';
?>
<?php if ($ticker): ?>
  <div class="ticker-wrap" role="region" aria-label="Latest Announcements">
    <div class="ticker-inner">
      <?php foreach (array_merge($ticker, $ticker) as $tk): ?>
        <a href="<?= e($tk['link_url']) ?>" style="margin-right:2.5rem;text-decoration:none;color:#1c1917;font-size:0.875rem;">
          <strong style="color:var(--secondary-color);"><?= e($tk['badge_text']) ?>:</strong> <?= e($tk['text']) ?>
        </a>
      <?php endforeach; ?>
    </div>
  </div>
<?php endif; ?>

<?php if (!empty($sliders[0])): $hero = $sliders[0]; ?>
  <section class="card" style="background:linear-gradient(120deg, var(--primary-color), #1e293b);color:#fff;padding:2.5rem;margin-top:1rem;">
    <p style="text-transform:uppercase;letter-spacing:0.08em;font-size:0.75rem;color:#fde68a;margin:0 0 0.5rem;">UGC NEP 2020 Public Self-Disclosure Portal</p>
    <h1 style="font-family:'Playfair Display',serif;font-size:2.2rem;margin:0 0 0.75rem;"><?= e($hero['title']) ?></h1>
    <p style="max-width:680px;margin:0 0 1.25rem;color:#e2e8f0;"><?= e($hero['caption']) ?></p>
    <a href="<?= e($hero['cta_link']) ?>" class="btn-secondary"><?= e($hero['cta_label']) ?></a>
    <a href="quick-links.php" class="btn-primary" style="margin-left:0.5rem;background:rgba(255,255,255,0.16);">Document Repository</a>
  </section>
<?php endif; ?>

<section style="margin-top:2rem;">
  <h2 style="font-family:'Playfair Display',serif;">Academic Department Microsites</h2>
  <div class="grid-4">
    <?php foreach ($depts as $d): ?>
      <article class="card">
        <small style="color:var(--text-muted);"><?= e($d['code']) ?> · Est. <?= e((string)$d['established_year']) ?> · Intake <?= e((string)$d['intake_capacity']) ?></small>
        <h3 style="margin:0.4rem 0;"><?= e($d['name']) ?></h3>
        <p style="font-size:0.85rem;color:var(--text-muted);"><?= e($d['overview']) ?></p>
        <a href="department.php?dept=<?= urlencode($d['slug']) ?>" class="btn-primary" style="margin-top:0.5rem;">Open Microsite</a>
      </article>
    <?php endforeach; ?>
  </div>
</section>

<section style="margin-top:2rem;">
  <h2 style="font-family:'Playfair Display',serif;">UGC Mandatory Disclosure Sections</h2>
  <div class="grid-4">
    <?php foreach ($cats as $c): ?>
      <div class="card">
        <small style="color:var(--secondary-color);font-weight:600;"><?= e($c['ugc_code']) ?></small>
        <h3 style="margin:0.35rem 0;"><?= e($c['name']) ?></h3>
        <p style="font-size:0.82rem;color:var(--text-muted);"><?= e($c['description']) ?></p>
      </div>
    <?php endforeach; ?>
  </div>
</section>

<section class="grid-2" style="margin-top:2rem;">
  <div class="card">
    <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Latest Circulars &amp; Events</h2>
    <?php foreach ($events as $ev): ?>
      <div style="padding:0.6rem 0;border-bottom:1px solid var(--border-color);">
        <small style="color:var(--secondary-color);font-weight:600;"><?= e($ev['category']) ?> · <?= e($ev['event_date']) ?></small>
        <div style="font-weight:600;"><?= e($ev['title']) ?></div>
        <p style="margin:0.2rem 0 0;font-size:0.85rem;color:var(--text-muted);"><?= e($ev['summary']) ?></p>
      </div>
    <?php endforeach; ?>
  </div>
  <div class="card">
    <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Quick Links &amp; Downloads</h2>
    <?php foreach ($docs as $doc): ?>
      <div style="padding:0.6rem 0;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div style="font-weight:600;font-size:0.9rem;"><?= e($doc['title']) ?></div>
          <small style="color:var(--text-muted);"><?= e($doc['category']) ?> · <?= e(formatBytes((int)$doc['file_size_bytes'])) ?> · <?= e($doc['uploaded_at']) ?></small>
        </div>
        <a href="<?= e($doc['file_url']) ?>" download class="btn-primary">Download</a>
      </div>
    <?php endforeach; ?>
  </div>
</section>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
