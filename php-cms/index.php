<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$settings = getSiteSettings($pdo);

$sliders    = $pdo->query('SELECT * FROM sliders WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
$ticker     = $pdo->query('SELECT * FROM ticker_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
$depts      = $pdo->query('SELECT * FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();
$events     = $pdo->query('SELECT * FROM campus_events ORDER BY sort_order ASC, event_date DESC, id DESC LIMIT 5')->fetchAll();
$docs       = $pdo->query('SELECT * FROM documents WHERE is_quick_link = 1 ORDER BY sort_order ASC, uploaded_at DESC, id DESC LIMIT 6')->fetchAll();
try {
    $cats = $pdo->query('SELECT * FROM categories WHERE COALESCE(show_on_home, 1) = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
} catch (Throwable $exCats) {
    $cats = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')->fetchAll();
}
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
        echo '<section class="card cms-prose" style="margin-top:1.5rem;" data-custom-component="' . (int)$blk['id'] . '">';
        echo $blk['html_content'];
        echo '</section>';
    }
};

$pageTitle = $settings['institution_name'] ?? 'Home — Autonomous Institutional Portal';
require_once __DIR__ . '/includes/header.php';

$hs = $settings['home_sections'] ?? [];
$stats = $settings['highlights_stats'] ?? [];
$approvedBodies = $settings['approved_bodies'] ?? [];
$missionLines = array_filter(array_map('trim', explode("\n", (string)($settings['mission_text'] ?? ''))));
$recruiterLines = array_filter(array_map('trim', explode("\n", (string)($settings['recruiters'] ?? ''))));
?>

<?php if (!empty($hs['showTicker']) && $ticker): ?>
  <div class="ticker-bar" role="region" aria-label="Latest Announcements">
    <div class="ticker-bar-inner">
      <div id="ticker-badge-label" class="ticker-badge">Latest Notices</div>
      <div id="php-ticker-viewport" class="ticker-viewport">
        <div id="php-ticker-track" class="ticker-inner">
          <?php foreach (array_merge($ticker, $ticker) as $tk): ?>
            <a href="<?= e(baseUrl($tk['link_url'])) ?>" style="margin-right:2.5rem;text-decoration:none;color:var(--text-main);font-size:0.86rem;">
              <strong style="color:var(--secondary-color);"><?= e($tk['badge_text']) ?>:</strong> <?= e($tk['text']) ?>
            </a>
          <?php endforeach; ?>
        </div>
      </div>
      <div class="ticker-controls">
        <button type="button" class="ticker-ctrl-btn" onclick="svcoerTickerStep(-1)" title="Previous Notice">&lsaquo;</button>
        <button type="button" id="ticker-pause-btn" class="ticker-ctrl-btn" onclick="svcoerTickerToggle()">Pause</button>
        <button type="button" class="ticker-ctrl-btn" onclick="svcoerTickerStep(1)" title="Next Notice">&rsaquo;</button>
      </div>
    </div>
  </div>
<?php endif; ?>

<?php if (!empty($hs['showSlider']) && !empty($sliders)): ?>
  <section class="hero-slider" aria-label="Featured Campus Highlights">
    <?php foreach ($sliders as $idx => $sl): ?>
      <div class="hero-slide <?= $idx === 0 ? 'is-active' : '' ?>">
        <img class="hero-slide-img" src="<?= e(mediaUrl($sl['image_url'], 'assets/images/hero_campus.jpg')) ?>" alt="<?= e($sl['title']) ?>">
        <div class="hero-slide-overlay"></div>
        <div class="hero-slide-content">
          <p class="hero-eyebrow"><?= e($settings['short_code'] ?: 'SVERI') ?> · Autonomous Engineering Campus</p>
          <h1 class="hero-title"><?= e($sl['title']) ?></h1>
          <p class="hero-caption"><?= e($sl['caption']) ?></p>
          <div class="hero-cta-row">
            <a href="<?= e(baseUrl($sl['cta_link'])) ?>" class="btn-secondary"><?= e($sl['cta_label']) ?> &rarr;</a>
            <a href="<?= e(baseUrl('quick-links.php')) ?>" class="btn-primary" style="background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.28);">Document Repository</a>
          </div>
        </div>
      </div>
    <?php endforeach; ?>

    <?php if (count($sliders) > 1): ?>
      <div class="hero-controls">
        <button type="button" class="hero-ctrl-btn" onclick="svcoerSlidePrev()" aria-label="Previous slide">&lsaquo;</button>
        <span id="hero-slide-counter" class="hero-counter">1 / <?= count($sliders) ?></span>
        <button type="button" class="hero-ctrl-btn" onclick="svcoerSlideNext()" aria-label="Next slide">&rsaquo;</button>
      </div>
    <?php endif; ?>
  </section>
<?php endif; ?>

<?php $renderHomeSlot('after-hero'); ?>

<?php if (!empty($hs['showStatsAndRecognitions']) && !empty($stats)): ?>
  <section aria-label="Institutional Highlights">
    <div class="kpi-strip">
      <?php foreach ($stats as $st): ?>
        <div class="kpi-cell">
          <div class="kpi-value"><?= e($st['value'] ?? '') ?></div>
          <div class="kpi-label"><?= e($st['label'] ?? '') ?></div>
        </div>
      <?php endforeach; ?>
    </div>
    <div class="recognition-row">
      <div class="recognition-card"><small style="color:var(--secondary-color);font-weight:700;display:block;">RECOGNITION 01</small><strong>Autonomous Status (AY 2024–25)</strong></div>
      <div class="recognition-card"><small style="color:var(--secondary-color);font-weight:700;display:block;">RECOGNITION 02</small><strong>NAAC A+ Accredited (CGPA 3.46)</strong></div>
      <div class="recognition-card"><small style="color:var(--secondary-color);font-weight:700;display:block;">RECOGNITION 03</small><strong>NBA Accredited Core Programs</strong></div>
      <div class="recognition-card"><small style="color:var(--secondary-color);font-weight:700;display:block;">RECOGNITION 04</small><strong>NIRF Ranked · DTE Code <?= e($dteDisplay) ?></strong></div>
      <div class="recognition-card"><small style="color:var(--secondary-color);font-weight:700;display:block;">RECOGNITION 05</small><strong>AICTE Approved · 250+ Recruiters</strong></div>
    </div>
  </section>
<?php endif; ?>

<?php if (!empty($hs['showAboutAndDownloads'])): ?>
<section class="grid-2" style="margin-top:2rem;">
  <article class="card" style="display:flex;gap:1.25rem;flex-wrap:wrap;align-items:flex-start;">
    <img src="<?= e(mediaUrl($settings['about_image_url'] ?? '', 'assets/images/hero_campus.jpg')) ?>" alt="Campus" style="width:210px;height:185px;object-fit:cover;border-radius:10px;">
    <div style="flex:1;min-width:220px;">
      <small style="color:var(--secondary-color);font-weight:700;text-transform:uppercase;">About Our Campus</small>
      <h2 style="font-family:'Playfair Display',serif;margin:0.25rem 0 0.75rem;">ABOUT US</h2>
      <p style="font-size:0.9rem;color:var(--text-muted);line-height:1.6;"><?= e($settings['about_summary']) ?></p>
      <a href="<?= e(baseUrl('page.php?slug=about-overview')) ?>" class="btn-primary" style="margin-top:0.5rem;">Know More &rarr;</a>
    </div>
  </article>

  <aside class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:0.5rem;margin-bottom:0.75rem;">
      <h2 style="margin:0;font-family:'Playfair Display',serif;">DOWNLOADS</h2>
      <a href="<?= e(baseUrl('quick-links.php')) ?>" class="btn-primary" style="font-size:0.78rem;padding:0.35rem 0.75rem;">View All</a>
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
          <a href="<?= e(baseUrl($doc['file_url'])) ?>" download class="btn-primary" style="font-size:0.78rem;">Download</a>
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
    <div class="grid-2" style="gap:0.85rem;">
      <?php foreach ($approvedBodies as $ab): ?>
        <a href="<?= e(baseUrl($ab['href'] ?? 'page.php?slug=about-overview')) ?>" class="card" style="text-decoration:none;color:inherit;padding:0.9rem;">
          <strong><?= e($ab['name'] ?? '') ?></strong>
          <?php if (!empty($ab['subtitle'])): ?><small style="display:block;color:var(--text-muted);"><?= e($ab['subtitle']) ?></small><?php endif; ?>
        </a>
      <?php endforeach; ?>
    </div>
  </div>
  <div class="card">
    <small style="color:var(--secondary-color);font-weight:700;text-transform:uppercase;">NEP 2020 Charter</small>
    <h2 style="font-family:'Playfair Display',serif;margin:0.25rem 0 0.75rem;">VISION &amp; MISSION</h2>
    <p style="background:rgba(15,41,74,0.05);border-left:4px solid var(--secondary-color);padding:0.75rem;margin-bottom:0.75rem;font-weight:500;">
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
  <div style="display:flex;justify-content:space-between;align-items:end;margin-bottom:0.75rem;flex-wrap:wrap;gap:0.5rem;">
    <h2 style="font-family:'Playfair Display',serif;margin:0;">OUR DESK &amp; LEADERSHIP</h2>
    <a href="<?= e(baseUrl('page.php?slug=statutory-officers')) ?>" style="color:var(--primary-color);font-weight:600;text-decoration:none;">All Statutory Officers &rarr;</a>
  </div>
  <div class="grid-4">
    <?php foreach ($leadership as $ld): ?>
      <article class="card">
        <img src="<?= e(mediaUrl($ld['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="<?= e($ld['name']) ?>" style="width:62px;height:62px;border-radius:50%;object-fit:cover;">
        <small style="display:block;color:var(--secondary-color);font-weight:700;margin-top:0.5rem;"><?= e(formatCommitteeGroupLabel($ld['committee_group'] ?? '')) ?> · <?= e($ld['role_title']) ?></small>
        <h3 style="margin:0.2rem 0;"><?= e($ld['name']) ?></h3>
        <small style="color:var(--text-muted);display:block;"><?= e($ld['qualification']) ?></small>
        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0;"><?= e($ld['bio']) ?></p>
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
    <a href="<?= e(baseUrl('page.php?cat=examination')) ?>" class="btn-primary">Open Examination Cell &rarr;</a>
  </div>
  <div class="grid-3">
    <?php foreach ($examPages as $ep): ?>
      <a href="<?= e(baseUrl('page.php?slug=' . urlencode($ep['slug']))) ?>" class="card" style="text-decoration:none;color:inherit;">
        <small style="color:var(--secondary-color);font-weight:700;"><?= e($ep['subtitle'] ?: 'Autonomous Examination') ?></small>
        <h3 style="margin:0.35rem 0 0;font-size:1rem;"><?= e($ep['title']) ?></h3>
      </a>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<?php if (!empty($hs['showDepartments']) && $depts): ?>
<section style="margin-top:2rem;">
  <h2 style="font-family:'Playfair Display',serif;"><?= e($hs['departmentsTitle'] ?? 'Academic Departments') ?></h2>
  <div class="grid-3">
    <?php foreach ($depts as $d): ?>
      <article class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
        <img src="<?= e(mediaUrl($d['hero_image_url'] ?? '', 'assets/images/hero_robotics.jpg')) ?>" alt="<?= e($d['name']) ?>" style="width:100%;height:150px;object-fit:cover;display:block;">
        <div style="padding:1.1rem;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <small style="color:var(--text-muted);"><?= e($d['code']) ?> · Est. <?= e((string)$d['established_year']) ?> · Intake <?= e((string)$d['intake_capacity']) ?></small>
            <h3 style="margin:0.35rem 0;"><?= e($d['name']) ?></h3>
            <p style="font-size:0.85rem;color:var(--text-muted);"><?= e($d['overview']) ?></p>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:0.65rem;border-top:1px solid var(--border-color);margin-top:0.5rem;gap:0.5rem;">
            <small style="color:var(--text-muted);"><?= e($d['hod_name']) ?></small>
            <a href="<?= e(baseUrl('department.php?dept=' . urlencode($d['slug']))) ?>" class="btn-primary" style="font-size:0.8rem;padding:0.4rem 0.75rem;">Open Microsite</a>
          </div>
        </div>
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
          <a href="<?= e(baseUrl('page.php?slug=' . urlencode($sp['slug']))) ?>" style="display:block;font-size:0.8rem;margin-bottom:0.2rem;color:var(--primary-color);text-decoration:none;">&rsaquo; <?= e($sp['title']) ?></a>
        <?php endforeach; ?>
        <a href="<?= e(baseUrl('page.php?cat=' . urlencode($c['slug']))) ?>" class="btn-secondary" style="margin-top:0.65rem;font-size:0.8rem;">Explore <?= e(!empty($c['short_label']) ? $c['short_label'] : $c['name']) ?> &rarr;</a>
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
      <div style="padding:0.65rem 0;border-bottom:1px solid var(--border-color);display:flex;gap:0.75rem;align-items:flex-start;">
        <?php if (!empty($ev['image_url'])): ?>
          <img src="<?= e(mediaUrl($ev['image_url'])) ?>" alt="<?= e($ev['title']) ?>" style="width:84px;height:56px;object-fit:cover;border-radius:6px;flex-shrink:0;">
        <?php endif; ?>
        <div style="flex:1;min-width:0;">
          <small style="color:var(--secondary-color);font-weight:600;"><?= e($ev['category']) ?> · <?= e($ev['event_date']) ?></small>
          <div style="font-weight:600;"><?= e($ev['title']) ?></div>
          <p style="margin:0.2rem 0 0;font-size:0.85rem;color:var(--text-muted);"><?= e($ev['summary']) ?></p>
        </div>
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
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:1rem;">
      <a href="<?= e(baseUrl('gallery.php')) ?>" class="btn-primary">Explore Picture Gallery &rarr;</a>
      <a href="<?= e(baseUrl('alumni.php')) ?>" class="btn-secondary">Alumni Network &amp; Jobs &rarr;</a>
    </div>
  </div>
</section>
<?php endif; ?>
<?php $renderHomeSlot('before-footer'); ?>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
