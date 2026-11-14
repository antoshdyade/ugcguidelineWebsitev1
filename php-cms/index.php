<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
$pdo = getDB();

$sliders    = $pdo->query('SELECT * FROM sliders WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
$ticker     = $pdo->query('SELECT * FROM ticker_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
$depts      = $pdo->query('SELECT * FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();
$events     = $pdo->query('SELECT * FROM campus_events ORDER BY sort_order ASC, event_date DESC, id DESC LIMIT 5')->fetchAll();
$docs       = $pdo->query('SELECT * FROM documents WHERE is_quick_link = 1 ORDER BY sort_order ASC, uploaded_at DESC, id DESC LIMIT 6')->fetchAll();
$cats       = $pdo->query('SELECT * FROM categories WHERE COALESCE(show_on_home, 1) = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
$leadership = $pdo->query('SELECT * FROM leadership_profiles ORDER BY sort_order ASC, id ASC LIMIT 4')->fetchAll();
$examPages  = $pdo->query("SELECT p.slug, p.title, p.subtitle FROM pages p JOIN categories c ON p.category_id = c.id WHERE c.slug = 'examination' AND p.is_published = 1 ORDER BY p.sort_order ASC")->fetchAll();
$allCatPages = [];
foreach ($pdo->query('SELECT category_id, slug, title FROM pages WHERE is_published = 1 ORDER BY sort_order ASC')->fetchAll() as $pg) {
    $allCatPages[$pg['category_id']][] = $pg;
}

$customBlocksBySlot = ['after-hero' => [], 'after-about' => [], 'after-depts' => [], 'before-footer' => []];
try {
    foreach ($pdo->query('SELECT * FROM custom_home_components WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')->fetchAll() as $cb) {
        $slot = $cb['placement'] ?? 'after-hero';
        if (isset($customBlocksBySlot[$slot])) {
            $customBlocksBySlot[$slot][] = $cb;
        }
    }
} catch (Throwable $ignored) {}

$renderHomeSlot = static function (string $slot) use ($customBlocksBySlot): void {
    foreach ($customBlocksBySlot[$slot] ?? [] as $blk) {
        echo '<section class="card" style="margin-top:1.5rem;" data-custom-component="' . (int)$blk['id'] . '">';
        echo $blk['html_content'];
        echo '</section>';
    }
};

$pageTitle = 'Home — UGC NEP 2020 Self-Disclosure Portal';
require_once __DIR__ . '/includes/header.php';

$hs = $settings['home_sections'] ?? [];
$stats = $settings['highlights_stats'] ?? [];
$approvedBodies = $settings['approved_bodies'] ?? [];
$missionLines = array_filter(array_map('trim', explode("\n", (string)($settings['mission_text'] ?? ''))));
$recruiterLines = array_filter(array_map('trim', explode("\n", (string)($settings['recruiters'] ?? ''))));
?>
<?php if (!empty($hs['showTicker']) && $ticker): ?>
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

<?php if (!empty($hs['showSlider']) && !empty($sliders[0])): $hero = $sliders[0]; ?>
  <section class="card" style="position:relative;overflow:hidden;background:linear-gradient(120deg, var(--primary-color), #1e293b);color:#fff;padding:2.5rem;margin-top:1rem;">
    <p style="text-transform:uppercase;letter-spacing:0.08em;font-size:0.75rem;color:#fde68a;margin:0 0 0.5rem;">UGC NEP 2020 Public Self-Disclosure Portal</p>
    <h1 style="font-family:'Playfair Display',serif;font-size:2.2rem;margin:0 0 0.75rem;"><?= e($hero['title']) ?></h1>
    <p style="max-width:680px;margin:0 0 1.25rem;color:#e2e8f0;"><?= e($hero['caption']) ?></p>
    <a href="<?= e($hero['cta_link']) ?>" class="btn-secondary"><?= e($hero['cta_label']) ?></a>
    <a href="quick-links.php" class="btn-primary" style="margin-left:0.5rem;background:rgba(255,255,255,0.16);">Document Repository</a>
  </section>
<?php endif; ?>

<?php $renderHomeSlot('after-hero'); ?>

<?php if (!empty($hs['showStatsAndRecognitions']) && !empty($stats)): ?>
  <section class="grid-4" style="margin-top:1.5rem;">
    <?php foreach ($stats as $st): ?>
      <div class="card" style="text-align:center;">
        <div style="font-size:1.75rem;font-weight:700;color:var(--primary-color);"><?= e($st['value'] ?? '') ?></div>
        <small style="color:var(--text-muted);font-weight:600;"><?= e($st['label'] ?? '') ?></small>
      </div>
    <?php endforeach; ?>
  </section>
<?php endif; ?>

<?php if (!empty($hs['showAboutAndDownloads'])): ?>
<section class="grid-2" style="margin-top:2rem;">
  <article class="card" style="display:flex;gap:1.25rem;flex-wrap:wrap;align-items:flex-start;">
    <img src="<?= e($settings['about_image_url']) ?>" alt="Campus" style="width:200px;height:180px;object-fit:cover;border-radius:8px;">
    <div style="flex:1;min-width:220px;">
      <small style="color:var(--secondary-color);font-weight:700;text-transform:uppercase;">About Campus</small>
      <h2 style="font-family:'Playfair Display',serif;margin:0.25rem 0 0.75rem;">ABOUT US</h2>
      <p style="font-size:0.9rem;color:var(--text-muted);line-height:1.6;"><?= e($settings['about_summary']) ?></p>
      <a href="page.php?slug=about-overview" class="btn-primary" style="margin-top:0.5rem;">Know More &rarr;</a>
    </div>
  </article>

  <aside class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:0.5rem;margin-bottom:0.75rem;">
      <h2 style="margin:0;font-family:'Playfair Display',serif;">DOWNLOADS</h2>
      <a href="quick-links.php" class="btn-primary" style="font-size:0.78rem;padding:0.35rem 0.75rem;">View All</a>
    </div>
    <?php foreach ($docs as $doc): $isExt = preg_match('#^https?://#i', (string)$doc['file_url']) === 1; ?>
      <div style="padding:0.5rem 0;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div style="font-weight:600;font-size:0.88rem;"><?= e($doc['title']) ?></div>
          <small style="color:var(--text-muted);"><?= e($doc['category']) ?> · <?= $isExt ? 'External Link' : e(formatBytes((int)$doc['file_size_bytes'])) ?></small>
        </div>
        <?php if ($isExt): ?>
          <a href="<?= e($doc['file_url']) ?>" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size:0.78rem;">Open Link &nearr;</a>
        <?php else: ?>
          <a href="<?= e($doc['file_url']) ?>" download class="btn-primary" style="font-size:0.78rem;">Download</a>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  </aside>
</section>
<?php endif; ?>

<?php $renderHomeSlot('after-about'); ?>

<?php if (!empty($hs['showApprovedAndVision'])): ?>
<section class="grid-2" style="margin-top:2rem;">
  <div class="card">
    <small style="color:var(--secondary-color);font-weight:700;text-transform:uppercase;">Statutory Recognitions</small>
    <h2 style="font-family:'Playfair Display',serif;margin:0.25rem 0 1rem;">APPROVED &amp; AFFILIATED BY</h2>
    <div class="grid-2">
      <?php foreach ($approvedBodies as $ab): ?>
        <a href="<?= e($ab['href'] ?? 'page.php?slug=about-overview') ?>" class="card" style="text-decoration:none;color:inherit;">
          <strong><?= e($ab['name'] ?? '') ?></strong>
          <?php if (!empty($ab['subtitle'])): ?><small style="display:block;color:var(--text-muted);"><?= e($ab['subtitle']) ?></small><?php endif; ?>
        </a>
      <?php endforeach; ?>
    </div>
  </div>
  <div class="card">
    <small style="color:var(--secondary-color);font-weight:700;text-transform:uppercase;">NEP 2020 Charter</small>
    <h2 style="font-family:'Playfair Display',serif;margin:0.25rem 0 0.75rem;">VISION &amp; MISSION</h2>
    <p style="background:#f8fafc;border-left:4px solid var(--secondary-color);padding:0.75rem;margin-bottom:0.75rem;font-weight:500;">
      <?= e($settings['vision_text']) ?>
    </p>
    <ol style="padding-left:1.25rem;margin:0;color:var(--text-muted);font-size:0.9rem;">
      <?php foreach ($missionLines as $m): ?><li style="margin-bottom:0.35rem;"><?= e($m) ?></li><?php endforeach; ?>
    </ol>
  </div>
</section>
<?php endif; ?>

<?php if (!empty($hs['showLeadershipDesk']) && $leadership): ?>
<section style="margin-top:2rem;">
  <div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:0.75rem;">
    <h2 style="font-family:'Playfair Display',serif;margin:0;">OUR DESK &amp; LEADERSHIP</h2>
    <a href="page.php?slug=statutory-officers" style="color:var(--primary-color);font-weight:600;text-decoration:none;">All Statutory Officers &rarr;</a>
  </div>
  <div class="grid-4">
    <?php foreach ($leadership as $ld): ?>
      <article class="card">
        <img src="<?= e($ld['photo_url']) ?>" alt="<?= e($ld['name']) ?>" style="width:60px;height:60px;border-radius:50%;object-fit:cover;">
        <small style="display:block;color:var(--secondary-color);font-weight:700;margin-top:0.5rem;"><?= e(formatCommitteeGroupLabel($ld['committee_group'] ?? '')) ?> · <?= e($ld['role_title']) ?></small>
        <h3 style="margin:0.2rem 0;"><?= e($ld['name']) ?></h3>
        <small style="color:var(--text-muted);display:block;"><?= e($ld['qualification']) ?></small>
        <p style="font-size:0.82rem;color:var(--text-muted);"><?= e($ld['bio']) ?></p>
      </article>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<?php if (!empty($hs['showExaminationSpotlight']) && $examPages): ?>
<section class="card" style="margin-top:2rem;border-left:5px solid var(--secondary-color);">
  <div style="display:flex;justify-content:space-between;align-items:end;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem;">
    <div>
      <small style="color:var(--secondary-color);font-weight:700;text-transform:uppercase;">Controller of Examinations (Autonomous)</small>
      <h2 style="font-family:'Playfair Display',serif;margin:0.2rem 0 0;"><?= e($hs['examSpotlightTitle'] ?? 'Autonomous Examination Portal (CoE)') ?></h2>
    </div>
    <a href="page.php?cat=examination" class="btn-primary">Open Examination Cell &rarr;</a>
  </div>
  <div class="grid-3">
    <?php foreach ($examPages as $ep): ?>
      <a href="page.php?slug=<?= urlencode($ep['slug']) ?>" class="card" style="text-decoration:none;color:inherit;">
        <small style="color:var(--secondary-color);font-weight:700;"><?= e($ep['subtitle'] ?: 'Autonomous Examination') ?></small>
        <h3 style="margin:0.35rem 0 0;font-size:1rem;"><?= e($ep['title']) ?></h3>
      </a>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<?php if (!empty($hs['showDepartments']) && $depts): ?>
<section style="margin-top:2rem;">
  <h2 style="font-family:'Playfair Display',serif;"><?= e($hs['departmentsTitle'] ?? 'Academic Department Microsites') ?></h2>
  <div class="grid-3">
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
<?php endif; ?>

<?php $renderHomeSlot('after-depts'); ?>

<?php if (!empty($hs['showCategoriesDirectory']) && $cats): ?>
<section style="margin-top:2rem;">
  <h2 style="font-family:'Playfair Display',serif;"><?= e($hs['categoriesTitle'] ?? 'Statutory Self-Disclosure & Autonomous Portals') ?></h2>
  <div class="grid-4">
    <?php foreach ($cats as $c): $subPages = $allCatPages[$c['id']] ?? []; ?>
      <div class="card">
        <small style="color:var(--secondary-color);font-weight:600;"><?= count($subPages) ?> pages</small>
        <h3 style="margin:0.35rem 0;"><?= e($c['name']) ?></h3>
        <p style="font-size:0.82rem;color:var(--text-muted);"><?= e($c['description']) ?></p>
        <?php foreach (array_slice($subPages, 0, 3) as $sp): ?>
          <a href="page.php?slug=<?= urlencode($sp['slug']) ?>" style="display:block;font-size:0.8rem;margin-bottom:0.2rem;color:var(--primary-color);text-decoration:none;">&rsaquo; <?= e($sp['title']) ?></a>
        <?php endforeach; ?>
        <a href="page.php?cat=<?= urlencode($c['slug']) ?>" class="btn-secondary" style="margin-top:0.65rem;font-size:0.8rem;">Explore <?= e(!empty($c['short_label']) ? $c['short_label'] : $c['name']) ?> &rarr;</a>
      </div>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<?php if (!empty($hs['showEventsAndRecruiters'])): ?>
<section class="grid-2" style="margin-top:2rem;">
  <div class="card">
    <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Latest Circulars, Events &amp; Achievements</h2>
    <?php foreach ($events as $ev): ?>
      <div style="padding:0.6rem 0;border-bottom:1px solid var(--border-color);">
        <small style="color:var(--secondary-color);font-weight:600;"><?= e($ev['category']) ?> · <?= e($ev['event_date']) ?></small>
        <div style="font-weight:600;"><?= e($ev['title']) ?></div>
        <p style="margin:0.2rem 0 0;font-size:0.85rem;color:var(--text-muted);"><?= e($ev['summary']) ?></p>
      </div>
    <?php endforeach; ?>
  </div>
  <div class="card">
    <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Top Recruiters</h2>
    <div class="grid-2" style="gap:0.6rem;">
      <?php foreach ($recruiterLines as $rc): ?>
        <div style="padding:0.6rem 0.75rem;border:1px solid var(--border-color);border-radius:6px;font-weight:600;font-size:0.88rem;"><?= e($rc) ?></div>
      <?php endforeach; ?>
    </div>
    <a href="gallery.php" class="btn-primary" style="margin-top:1rem;">Explore Picture Gallery &rarr;</a>
  </div>
</section>
<?php endif; ?>
<?php $renderHomeSlot('before-footer'); ?>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
