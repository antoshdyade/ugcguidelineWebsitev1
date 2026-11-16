<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$scopeFilter = trim((string)($_GET['scope'] ?? 'All'));
$rows = $pdo->query('SELECT * FROM conferences WHERE is_published = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();

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
    <a href="<?= e(baseUrl('page.php?cat=research')) ?>" class="btn-outline btn-sm">&larr; Research &amp; Development Cell</a>
  </div>

  <?php if (empty($filtered)): ?>
    <div class="card">
      <p style="margin:0;color:var(--text-muted);">No published conferences or events match the selected filter.</p>
    </div>
  <?php else: ?>
    <div class="grid-3">
      <?php foreach ($filtered as $conf): ?>
        <?php
        $partners = json_decode((string)($conf['indexing_partners_json'] ?? '[]'), true);
        if (!is_array($partners)) $partners = [];
        $tracks = json_decode((string)($conf['tracks_json'] ?? '[]'), true);
        $trackCount = is_array($tracks) ? count($tracks) : 0;
        ?>
        <article class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:0.75rem;padding:0;overflow:hidden;">
          <div>
            <div style="position:relative;height:175px;background:#0F172A;overflow:hidden;">
              <img src="<?= e(mediaUrl($conf['banner_url'] ?? '', 'assets/images/hero_campus.jpg')) ?>" alt="<?= e($conf['short_name']) ?>" style="width:100%;height:100%;object-fit:cover;">
              <div style="position:absolute;top:0.65rem;left:0.65rem;display:flex;gap:0.35rem;flex-wrap:wrap;">
                <span style="background:rgba(15,41,74,0.92);color:#fff;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;"><?= e($conf['scope']) ?></span>
                <?php if (!empty($conf['is_featured'])): ?>
                  <span style="background:#B45309;color:#fff;font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:6px;">Featured</span>
                <?php endif; ?>
              </div>
            </div>
            <div style="padding:1rem;">
              <div style="font-size:0.74rem;font-weight:700;color:var(--secondary-color);text-transform:uppercase;"><?= e($conf['short_name']) ?> · <?= e($conf['mode']) ?></div>
              <h2 style="margin:0.25rem 0 0.45rem;font-size:1.05rem;line-height:1.3;color:var(--primary-color);"><?= e($conf['title']) ?></h2>
              <?php if (!empty($conf['theme'])): ?>
                <p style="margin:0 0 0.55rem;font-size:0.83rem;color:var(--text-muted);"><?= e($conf['theme']) ?></p>
              <?php endif; ?>
              <div style="font-size:0.78rem;color:var(--text-muted);display:flex;flex-direction:column;gap:0.2rem;">
                <span><strong>Dates:</strong> <?= e($conf['start_date']) ?><?= $conf['end_date'] !== $conf['start_date'] ? ' to ' . e($conf['end_date']) : '' ?></span>
                <span><strong>Venue:</strong> <?= e($conf['venue']) ?></span>
                <span><strong>Organizer:</strong> <?= e($conf['organizing_department']) ?> · <?= $trackCount ?> Track(s)</span>
              </div>
              <?php if (!empty($partners)): ?>
                <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.6rem;">
                  <?php foreach (array_slice($partners, 0, 3) as $pt): ?>
                    <span class="alumni-pill" style="font-size:0.67rem;"><?= e((string)$pt) ?></span>
                  <?php endforeach; ?>
                </div>
              <?php endif; ?>
            </div>
          </div>
          <div style="padding:0 1rem 1rem;display:flex;gap:0.45rem;flex-wrap:wrap;">
            <a href="<?= e(baseUrl('conference.php?slug=' . urlencode($conf['slug']))) ?>" class="btn-primary" style="flex:1;text-align:center;">Open Microsite &amp; Register</a>
          </div>
        </article>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
