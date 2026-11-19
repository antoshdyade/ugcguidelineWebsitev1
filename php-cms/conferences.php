<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$scopeFilter = trim((string)($_GET['scope'] ?? 'All'));
$rows = $pdo->query("SELECT * FROM conferences WHERE is_published = 1 AND status = 'published' ORDER BY sort_order ASC, id ASC")->fetchAll();

$scopes = ['All'];
foreach ($rows as $r) {
    $sc = trim((string)($r['scope'] ?? ''));
    if ($sc !== '' && !in_array($sc, $scopes, true)) {
        $scopes[] = $sc;
    }
}

$filtered = array_values(array_filter($rows, static function (array $r) use ($scopeFilter): bool {
    return $scopeFilter === 'All' || strcasecmp((string)($r['scope'] ?? ''), $scopeFilter) === 0;
}));

$researchSlides = getResearchSliderSlides($pdo);
$pageTitle = 'Conferences, Workshops, FDPs & Technical Events';
require_once __DIR__ . '/includes/header.php';
?>

<section class="alumni-hero" style="margin-bottom:1.25rem;">
  <span style="display:inline-block;padding:0.2rem 0.65rem;border-radius:999px;background:rgba(255,255,255,0.14);font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Research &amp; Academic Events Portal</span>
  <h1 style="margin:0.45rem 0 0.35rem;font-family:'Playfair Display',serif;font-size:clamp(1.45rem,2.6vw,2.05rem);color:#fff;">
    National &amp; International Conferences, Workshops, FDPs &amp; Events
  </h1>
  <p style="margin:0;color:#E2E8F0;max-width:780px;font-size:0.93rem;">
    Explore peer-reviewed academic conferences, research workshops, Faculty Development Programs (FDPs), and custom technical symposia hosted under the Autonomous R&amp;D Cell.
  </p>
</section>

<?php if (!empty($researchSlides)): ?>
  <section style="margin-bottom:1.5rem;" aria-label="Research Portal Highlights Slider">
    <?= renderCustomSliderBlock($researchSlides, 360, 5) ?>
  </section>
<?php endif; ?>

<section style="margin-bottom:2rem;">
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.75rem;margin-bottom:1rem;">
    <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
      <?php foreach ($scopes as $sc): ?>
        <?php $isAct = (strcasecmp($scopeFilter, $sc) === 0); ?>
        <a href="<?= e(baseUrl('conferences.php' . ($sc === 'All' ? '' : '?scope=' . urlencode($sc)))) ?>"
           class="alumni-tabbtn <?= $isAct ? 'is-active' : '' ?>" style="padding:0.4rem 0.85rem;font-size:0.8rem;">
          <?= e($sc) ?>
        </a>
      <?php endforeach; ?>
    </div>
    <a href="<?= e(baseUrl('page.php?cat=research')) ?>" class="btn-outline btn-sm">&larr; Open R&amp;D Cell &amp; Funded Projects</a>
  </div>

  <?php if (empty($filtered)): ?>
    <div class="card">
      <p style="margin:0;color:var(--text-muted);">No published conferences or events match the selected filter.</p>
    </div>
  <?php else: ?>
    <div class="conf-dir-grid">
      <?php foreach ($filtered as $conf): ?>
        <?php
        $partners = json_decode((string)($conf['indexing_partners_json'] ?? '[]'), true);
        if (!is_array($partners)) $partners = [];
        $tracks = json_decode((string)($conf['tracks_json'] ?? '[]'), true);
        $trackCount = is_array($tracks) ? count($tracks) : 0;
        $people = json_decode((string)($conf['people_json'] ?? '[]'), true);
        $peopleCount = is_array($people) ? count($people) : 0;
        $confShareEnabled = !isset($conf['is_shareable']) || !empty($conf['is_shareable']);
        ?>
        <article class="conf-grid-card">
          <div>
            <div class="conf-grid-card-media">
              <img src="<?= e(mediaUrl($conf['banner_url'] ?? '', 'assets/images/hero_campus.jpg')) ?>" alt="<?= e($conf['title']) ?>">
              <div class="conf-grid-card-overlay">
                <div class="conf-hero-badges">
                  <span class="conf-badge-amber"><?= e($conf['scope']) ?></span>
                  <span class="conf-badge-glass"><?= e($conf['mode']) ?></span>
                  <?php if (!empty($conf['is_featured'])): ?>
                    <span class="conf-badge-emerald">Featured</span>
                  <?php endif; ?>
                </div>
                <h2 class="conf-grid-card-title"><?= e($conf['short_name']) ?>: <?= e($conf['title']) ?></h2>
              </div>
            </div>
            <div class="conf-grid-card-body">
              <div>
                <?php if (!empty($conf['theme'])): ?>
                  <p style="margin:0 0 0.55rem;font-size:0.85rem;font-weight:600;color:var(--text-main);"><?= e($conf['theme']) ?></p>
                <?php endif; ?>
                <div style="font-size:0.79rem;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:0.35rem 1rem;">
                  <span><strong>Dates:</strong> <?= e($conf['start_date']) ?><?= $conf['end_date'] !== $conf['start_date'] ? ' to ' . e($conf['end_date']) : '' ?></span>
                  <span><strong>Venue:</strong> <?= e($conf['venue']) ?></span>
                </div>
                <?php if (!empty($partners)): ?>
                  <p style="margin:0.5rem 0 0;font-size:0.78rem;font-weight:700;color:#047857;">
                    Indexing / Proceedings: <?= e(implode(' · ', array_slice(array_map('strval', $partners), 0, 4))) ?>
                  </p>
                <?php endif; ?>
              </div>

              <div>
                <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.5rem;padding-top:0.65rem;border-top:1px solid var(--border-color);">
                  <a href="<?= e(baseUrl('conference.php?slug=' . urlencode($conf['slug']))) ?>" class="btn-primary btn-sm">Open Dedicated Conference Website &rarr;</a>
                  <span style="font-size:0.75rem;color:var(--text-muted);"><?= $trackCount ?> Tracks · <?= $peopleCount ?> Speakers/Chairs</span>
                </div>
                <?php if ($confShareEnabled): ?>
                  <?= renderPhpSocialShareBar($pdo, $conf['short_name'] . ' — ' . $conf['title'], (string)($conf['theme'] ?? ''), baseUrl('conference.php?slug=' . urlencode((string)$conf['slug'])), 'conference', true, true) ?>
                <?php endif; ?>
              </div>
            </div>
          </div>
        </article>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>

<?= renderPhpSocialShareBar($pdo, 'Conferences, Workshops, FDPs & Events — SVCOER Pandharpur', 'Explore upcoming national and international conferences, research workshops, FDPs, and poster tracks.', baseUrl('conferences.php'), 'conference', true) ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
