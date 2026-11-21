<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$settings = getSiteSettings($pdo);

$summary = [
    'summaryNote'      => 'With a 91.1% placement track record and 250+ visiting recruiters, our Training & Placement Cell delivers structured aptitude, coding, Communication Improvement Programs (CIP), and industry internship mentorship.',
    'coordinatorName'  => 'Dr. S. B. Kulkarni',
    'coordinatorEmail' => 'tnp@coe.sveri.ac.in',
    'coordinatorPhone' => '+91-02186-216063',
    'brochureUrl'      => '',
    'brochureLabel'    => 'Download T&P Brochure (PDF)',
    'recruiters'       => $settings['recruiters'] ?? 'TCS Digital, Infosys, Accenture, Deloitte, Qualcomm, KPIT, Bharat Forge, Atlas Copco, Tata Power, Wipro, Tech Mahindra, L&T',
];
try {
    $rawSum = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'placements_summary' LIMIT 1")->fetchColumn();
    if ($rawSum) {
        $dec = json_decode((string)$rawSum, true);
        if (is_array($dec)) {
            $summary = array_merge($summary, array_filter($dec, static fn($v) => $v !== null && $v !== ''));
        }
    }
} catch (Throwable $ignored) {
}

$stats = $pdo->query("SELECT * FROM placement_stats WHERE status = 'published' ORDER BY sort_order ASC, id ASC")->fetchAll();
$stories = $pdo->query("SELECT * FROM placement_stories WHERE status = 'published' ORDER BY is_featured DESC, sort_order ASC, id ASC")->fetchAll();
$notices = [];
try {
    $notices = $pdo->query("SELECT * FROM placement_notices WHERE status = 'published' ORDER BY is_pinned DESC, sort_order ASC, id DESC")->fetchAll();
} catch (Throwable $ignoredNotices) {
}
$customSections = [];
try {
    $customSections = $pdo->query("SELECT * FROM placement_custom_sections WHERE is_published = 1 AND status = 'published' ORDER BY sort_order ASC, id ASC")->fetchAll();
} catch (Throwable $ignoredCustom) {
}
$drives = getPlacementDrives($pdo);

// KPI Aggregates
$totalEligible = 0;
$totalPlaced = 0;
$maxPkg = 0.0;
$avgPkgSum = 0.0;
$yearsMap = [];
foreach ($stats as $st) {
    $totalEligible += (int)$st['eligible_students'];
    $totalPlaced += (int)$st['placed_students'];
    $maxPkg = max($maxPkg, (float)$st['highest_package_lpa']);
    $avgPkgSum += (float)$st['average_package_lpa'];
    $yr = trim((string)($st['academic_year'] ?? ''));
    if ($yr !== '') {
        $yearsMap[$yr] = true;
    }
}
$ratio = $totalEligible > 0 ? round(($totalPlaced / $totalEligible) * 100, 1) : 0.0;
$meanAvgPkg = count($stats) > 0 ? round($avgPkgSum / count($stats), 2) : 0.0;
$recruiterList = array_values(array_filter(array_map('trim', explode(',', (string)($summary['recruiters'] ?? '')))));
$academicYears = array_keys($yearsMap);

// Query Filters (Non-destructive GET filtering)
$selectedYear = trim((string)($_GET['year'] ?? 'All'));
if ($selectedYear !== 'All' && !isset($yearsMap[$selectedYear])) {
    $selectedYear = 'All';
}
$filteredStats = $selectedYear === 'All'
    ? $stats
    : array_values(array_filter($stats, static fn(array $r): bool => trim((string)$r['academic_year']) === $selectedYear));

$noticeCat = trim((string)($_GET['notice_cat'] ?? 'All'));
$noticeQuery = trim((string)($_GET['q'] ?? ''));
$noticeCategories = ['All'];
foreach ($notices as $nr) {
    $cat = trim((string)($nr['category'] ?? 'General Information'));
    if ($cat !== '' && !in_array($cat, $noticeCategories, true)) {
        $noticeCategories[] = $cat;
    }
}
$filteredNotices = array_values(array_filter($notices, static function (array $nr) use ($noticeCat, $noticeQuery): bool {
    if ($noticeCat !== 'All' && trim((string)($nr['category'] ?? '')) !== $noticeCat) {
        return false;
    }
    if ($noticeQuery !== '') {
        $needle = mb_strtolower($noticeQuery);
        $haystack = mb_strtolower((string)($nr['title'] ?? '') . ' ' . (string)($nr['summary'] ?? '') . ' ' . (string)($nr['category'] ?? ''));
        if (mb_strpos($haystack, $needle) === false) {
            return false;
        }
    }
    return true;
}));

$congratsType = trim((string)($_GET['congrats_type'] ?? 'All'));
$congratsQuery = trim((string)($_GET['cq'] ?? ''));
$congratsTypes = ['All'];
foreach ($stories as $sr) {
    $etype = trim((string)($sr['entry_type'] ?? 'Campus Placement'));
    if ($etype !== '' && !in_array($etype, $congratsTypes, true)) {
        $congratsTypes[] = $etype;
    }
}
$filteredStories = array_values(array_filter($stories, static function (array $sr) use ($congratsType, $congratsQuery): bool {
    if ($congratsType !== 'All' && trim((string)($sr['entry_type'] ?? 'Campus Placement')) !== $congratsType) {
        return false;
    }
    if ($congratsQuery !== '') {
        $needle = mb_strtolower($congratsQuery);
        $haystack = mb_strtolower(
            (string)($sr['student_name'] ?? '') . ' '
            . (string)($sr['company'] ?? '') . ' '
            . (string)($sr['branch'] ?? '') . ' '
            . (string)($sr['role_title'] ?? '') . ' '
            . (string)($sr['headline'] ?? '')
        );
        if (mb_strpos($haystack, $needle) === false) {
            return false;
        }
    }
    return true;
}));

$resolveDocHref = static function (string $url): string {
    $u = trim($url);
    if ($u === '') {
        return '';
    }
    if (preg_match('#^https?://#i', $u)) {
        return validateExternalUrl($u) ? $u : '';
    }
    return baseUrl(ltrim($u, '/'));
};

$brochureHref = $resolveDocHref((string)($summary['brochureUrl'] ?? ''));

$pageTitle = 'Training & Placement Cell (T&P)';
require_once __DIR__ . '/includes/header.php';
?>

<style>
  .tp-hero {
    background: linear-gradient(135deg, var(--primary-color) 0%, #173A66 100%);
    color: #fff;
    border-radius: 12px;
    padding: 1.85rem;
    margin-bottom: 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.14);
  }
  .tp-hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 320px);
    gap: 1.5rem;
    align-items: start;
  }
  @media (max-width: 860px) {
    .tp-hero-grid { grid-template-columns: 1fr; }
  }
  .tp-kicker {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #FCD34D;
    margin-bottom: 0.45rem;
  }
  .tp-kpi-val {
    font-size: 1.85rem;
    font-weight: 800;
    color: var(--primary-color);
    font-variant-numeric: tabular-nums;
    line-height: 1.15;
    margin: 0.25rem 0;
  }
  .tp-filter-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .tp-filter-tab {
    display: inline-block;
    padding: 0.36rem 0.78rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    text-decoration: none;
    color: var(--text-main);
    background: var(--card-bg);
  }
  .tp-filter-tab:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  .tp-filter-tab.is-active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: #fff;
  }
  .tp-notice-item {
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1rem 1.15rem;
    background: var(--card-bg);
  }
  .tp-congrats-card {
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1.1rem;
    background: var(--card-bg);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .tp-drive-card {
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 1.15rem;
    background: var(--card-bg);
  }
</style>

<!-- Editorial Hero Banner + T&P Desk Officer Panel -->
<section class="tp-hero">
  <div class="tp-hero-grid">
    <div>
      <span class="tp-kicker">Training &amp; Placement Cell (T&amp;P) · Corporate Relations &amp; Career Excellence</span>
      <h1 style="margin:0 0 0.55rem;font-family:'Playfair Display',serif;font-size:clamp(1.5rem,2.7vw,2.15rem);color:#fff;line-height:1.2;">
        Campus Placements, Student Notices &amp; Congratulations Desk
      </h1>
      <p style="margin:0 0 1rem;color:#E2E8F0;max-width:740px;font-size:0.93rem;line-height:1.6;">
        <?= e((string)$summary['summaryNote']) ?>
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:0.65rem;">
        <?php if ($brochureHref !== ''): ?>
          <a href="<?= e($brochureHref) ?>" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="background:#B45309;color:#fff;border-color:#D97706;">
            <?= e((string)($summary['brochureLabel'] ?? 'Download T&P Brochure (PDF)')) ?> &#8599;
          </a>
        <?php endif; ?>
        <a href="#student-notices" class="btn-outline" style="color:#fff;border-color:rgba(255,255,255,0.45);background:rgba(255,255,255,0.08);">
          Student Notices (<?= count($notices) ?>)
        </a>
        <a href="#congratulations-desk" class="btn-outline" style="color:#fff;border-color:rgba(255,255,255,0.45);background:rgba(255,255,255,0.08);">
          Congratulations Desk (<?= count($stories) ?>)
        </a>
      </div>
    </div>

    <aside style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:1rem 1.15rem;">
      <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#FCD34D;">Dean / Officer — Training &amp; Placement</div>
      <div style="font-size:1.05rem;font-weight:700;color:#fff;margin:0.3rem 0 0.25rem;"><?= e((string)$summary['coordinatorName']) ?></div>
      <div style="font-size:0.82rem;color:#E2E8F0;line-height:1.55;">
        <div>Email: <a href="mailto:<?= e((string)$summary['coordinatorEmail']) ?>" style="color:#fff;text-decoration:underline;"><?= e((string)$summary['coordinatorEmail']) ?></a></div>
        <div style="font-variant-numeric:tabular-nums;">Direct Desk: <?= e((string)$summary['coordinatorPhone']) ?></div>
      </div>
    </aside>
  </div>
</section>

<!-- Institutional KPI Strip (tabular-nums) -->
<section class="grid-4" style="margin-bottom:1.5rem;">
  <div class="card">
    <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Placement Conversion</div>
    <div class="tp-kpi-val" style="color:#047857;"><?= e((string)$ratio) ?>%</div>
    <div style="font-size:0.78rem;color:var(--text-muted);font-variant-numeric:tabular-nums;"><?= (int)$totalPlaced ?> of <?= (int)$totalEligible ?> eligible scholars</div>
  </div>
  <div class="card">
    <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Highest CTC Package</div>
    <div class="tp-kpi-val" style="color:var(--secondary-color);"><?= e(number_format($maxPkg, 1)) ?> LPA</div>
    <div style="font-size:0.78rem;color:var(--text-muted);">Peak campus recruitment offer</div>
  </div>
  <div class="card">
    <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Mean Package (LPA)</div>
    <div class="tp-kpi-val"><?= e(number_format($meanAvgPkg, 2)) ?> LPA</div>
    <div style="font-size:0.78rem;color:var(--text-muted);">Across reported engineering branches</div>
  </div>
  <div class="card">
    <div style="font-size:0.72rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Hiring Partners</div>
    <div class="tp-kpi-val"><?= count($recruiterList) ?>+</div>
    <div style="font-size:0.78rem;color:var(--text-muted);">IT, R&amp;D &amp; Core manufacturing companies</div>
  </div>
</section>

<!-- Student Notices & T&P Information Desk -->
<section id="student-notices" class="card" style="margin-bottom:1.5rem;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-color);">
    <div>
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--secondary-color);">Student Circulars &amp; Updates</div>
      <h2 style="margin:0.2rem 0 0;color:var(--primary-color);">Student Notices &amp; T&amp;P Information Desk</h2>
    </div>
    <form method="get" action="placements.php#student-notices" style="display:flex;gap:0.45rem;flex-wrap:wrap;align-items:center;">
      <input type="hidden" name="notice_cat" value="<?= e($noticeCat) ?>">
      <?php if ($selectedYear !== 'All'): ?><input type="hidden" name="year" value="<?= e($selectedYear) ?>"><?php endif; ?>
      <input type="search" name="q" value="<?= e($noticeQuery) ?>" placeholder="Search notice title or drive..." style="padding:0.42rem 0.7rem;border:1px solid var(--border-color);border-radius:6px;min-width:220px;font-size:0.84rem;">
      <button type="submit" class="btn-primary btn-sm">Search</button>
      <?php if ($noticeQuery !== '' || $noticeCat !== 'All'): ?>
        <a href="placements.php#student-notices" class="btn-outline btn-sm">Reset</a>
      <?php endif; ?>
    </form>
  </div>

  <?php if (count($noticeCategories) > 1): ?>
    <div class="tp-filter-strip" style="margin-bottom:1rem;">
      <?php foreach ($noticeCategories as $catOption):
        $url = 'placements.php?notice_cat=' . urlencode($catOption)
            . ($noticeQuery !== '' ? '&q=' . urlencode($noticeQuery) : '')
            . ($selectedYear !== 'All' ? '&year=' . urlencode($selectedYear) : '')
            . '#student-notices';
      ?>
        <a href="<?= e($url) ?>" class="tp-filter-tab <?= $noticeCat === $catOption ? 'is-active' : '' ?>"><?= e($catOption) ?></a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <?php if (empty($filteredNotices)): ?>
    <p style="color:var(--text-muted);margin:0;">No notices match your selected filter criteria.</p>
  <?php else: ?>
    <div style="display:flex;flex-direction:column;gap:0.75rem;">
      <?php foreach ($filteredNotices as $nr):
        $attHref = $resolveDocHref((string)($nr['attachment_url'] ?? ''));
      ?>
        <article id="placement-notice-<?= (int)$nr['id'] ?>" class="tp-notice-item">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.65rem;">
            <div style="flex:1;min-width:240px;">
              <div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.65rem;font-size:0.75rem;margin-bottom:0.35rem;">
                <?php if (!empty($nr['is_pinned'])): ?>
                  <span style="font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#B45309;">Priority Notice</span>
                <?php endif; ?>
                <span style="font-weight:700;color:var(--primary-color);text-transform:uppercase;letter-spacing:0.04em;"><?= e((string)$nr['category']) ?></span>
                <span style="color:var(--text-muted);font-variant-numeric:tabular-nums;">Date: <?= e((string)$nr['notice_date']) ?></span>
              </div>
              <h3 style="margin:0 0 0.3rem;font-size:1.02rem;color:var(--primary-color);"><?= e((string)$nr['title']) ?></h3>
              <?php if (!empty($nr['summary'])): ?>
                <p style="margin:0;font-size:0.86rem;color:var(--text-muted);line-height:1.55;"><?= nl2br(e((string)$nr['summary'])) ?></p>
              <?php endif; ?>
            </div>
            <?php if ($attHref !== ''): ?>
              <div style="flex-shrink:0;">
                <a href="<?= e($attHref) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm">
                  <?= e(!empty($nr['link_label']) ? (string)$nr['link_label'] : 'View Circular') ?> &#8599;
                </a>
              </div>
            <?php endif; ?>
          </div>
          <?php if (!isset($nr['is_shareable']) || !empty($nr['is_shareable'])): ?>
            <?= renderPhpSocialShareBar($pdo, (string)$nr['title'], (string)($nr['summary'] ?? ''), baseUrl('placements.php#placement-notice-' . (int)$nr['id']), 'portal', true, true) ?>
          <?php endif; ?>
        </article>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>

<!-- Congratulations Desk: Placed Students & Achievement Winners -->
<section id="congratulations-desk" class="card" style="margin-bottom:1.5rem;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border-color);">
    <div>
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--secondary-color);">Hall of Distinction &amp; Campus Offers</div>
      <h2 style="margin:0.2rem 0 0;color:var(--primary-color);">Congratulations Desk — Placed Scholars &amp; Achievers</h2>
    </div>
    <form method="get" action="placements.php#congratulations-desk" style="display:flex;gap:0.45rem;flex-wrap:wrap;align-items:center;">
      <input type="hidden" name="congrats_type" value="<?= e($congratsType) ?>">
      <?php if ($selectedYear !== 'All'): ?><input type="hidden" name="year" value="<?= e($selectedYear) ?>"><?php endif; ?>
      <input type="search" name="cq" value="<?= e($congratsQuery) ?>" placeholder="Search student, company, award..." style="padding:0.42rem 0.7rem;border:1px solid var(--border-color);border-radius:6px;min-width:220px;font-size:0.84rem;">
      <button type="submit" class="btn-primary btn-sm">Filter</button>
      <?php if ($congratsQuery !== '' || $congratsType !== 'All'): ?>
        <a href="placements.php#congratulations-desk" class="btn-outline btn-sm">Reset</a>
      <?php endif; ?>
    </form>
  </div>

  <?php if (count($congratsTypes) > 1): ?>
    <div class="tp-filter-strip" style="margin-bottom:1.1rem;">
      <?php foreach ($congratsTypes as $typeOpt):
        $url = 'placements.php?congrats_type=' . urlencode($typeOpt)
            . ($congratsQuery !== '' ? '&cq=' . urlencode($congratsQuery) : '')
            . ($selectedYear !== 'All' ? '&year=' . urlencode($selectedYear) : '')
            . '#congratulations-desk';
      ?>
        <a href="<?= e($url) ?>" class="tp-filter-tab <?= $congratsType === $typeOpt ? 'is-active' : '' ?>"><?= e($typeOpt) ?></a>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>

  <?php if (empty($filteredStories)): ?>
    <p style="color:var(--text-muted);margin:0;">No student placement or achievement highlights match your current filter.</p>
  <?php else: ?>
    <div class="grid-3">
      <?php foreach ($filteredStories as $st):
        $etype = trim((string)($st['entry_type'] ?? 'Campus Placement'));
        $headline = trim((string)($st['headline'] ?? ''));
      ?>
        <article id="placement-story-<?= (int)$st['id'] ?>" class="tp-congrats-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;font-size:0.72rem;border-bottom:1px solid var(--border-color);padding-bottom:0.45rem;">
            <span style="font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--secondary-color);"><?= e($etype) ?></span>
            <?php if (!empty($st['is_featured'])): ?>
              <span style="font-weight:700;color:var(--primary-color);text-transform:uppercase;letter-spacing:0.04em;">Featured</span>
            <?php endif; ?>
          </div>

          <div style="display:flex;align-items:center;gap:0.85rem;">
            <img src="<?= e(mediaUrl($st['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>"
                 alt="<?= e($st['student_name']) ?>"
                 style="width:72px;height:72px;aspect-ratio:1/1;border-radius:10px;object-fit:cover;border:1px solid var(--border-color);flex-shrink:0;">
            <div>
              <h3 style="margin:0;font-size:1.03rem;color:var(--primary-color);"><?= e($st['student_name']) ?></h3>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.15rem;font-variant-numeric:tabular-nums;">
                <?= e($st['branch']) ?> · Batch <?= e($st['batch_year']) ?>
              </div>
              <div style="font-size:0.86rem;font-weight:800;color:#047857;margin-top:0.2rem;font-variant-numeric:tabular-nums;">
                <?= e($st['package_lpa']) ?>
              </div>
            </div>
          </div>

          <?php if ($headline !== ''): ?>
            <div style="font-size:0.9rem;font-weight:700;color:var(--text-main);line-height:1.35;">
              <?= e($headline) ?>
            </div>
          <?php endif; ?>

          <div style="background:var(--surface-bg);border:1px solid var(--border-color);border-radius:8px;padding:0.6rem 0.75rem;font-size:0.82rem;">
            <div style="font-weight:700;color:var(--primary-color);"><?= e($st['company']) ?></div>
            <div style="color:var(--text-muted);margin-top:0.1rem;"><?= e($st['role_title']) ?></div>
          </div>

          <?php if (!empty($st['quote_text'])): ?>
            <p style="margin:0;font-size:0.82rem;color:var(--text-muted);font-style:italic;line-height:1.5;">
              &ldquo;<?= e($st['quote_text']) ?>&rdquo;
            </p>
          <?php endif; ?>

          <?php if (!isset($st['is_shareable']) || !empty($st['is_shareable'])): ?>
            <?= renderPhpSocialShareBar($pdo, $st['student_name'] . ' — ' . ($st['company'] ?: 'Congratulations Desk'), (string)($st['headline'] ?: $st['role_title']), baseUrl('placements.php#placement-story-' . (int)$st['id']), 'portal', true, true) ?>
          <?php endif; ?>
        </article>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>

<!-- Upcoming & Active Campus Recruitment Drives -->
<?php if (!empty($drives)): ?>
  <section style="margin-bottom:1.5rem;">
    <div style="margin-bottom:0.85rem;">
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--secondary-color);">Recruitment Schedule</div>
      <h2 style="margin:0.2rem 0 0;color:var(--primary-color);">Upcoming &amp; Active Campus Placement Drives</h2>
    </div>
    <div class="grid-2">
      <?php foreach ($drives as $drv):
        $drvStatus = (string)($drv['status'] ?? 'Upcoming');
        $isOpen = stripos($drvStatus, 'Open') !== false;
        $regHref = $resolveDocHref((string)($drv['registrationUrl'] ?? ''));
      ?>
        <article class="tp-drive-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.65rem;padding-bottom:0.55rem;border-bottom:1px solid var(--border-color);">
            <div>
              <h3 style="margin:0 0 0.2rem;font-size:1.05rem;color:var(--primary-color);"><?= e((string)($drv['company'] ?? '')) ?></h3>
              <div style="font-size:0.86rem;font-weight:600;color:var(--secondary-color);font-variant-numeric:tabular-nums;">
                <?= e((string)($drv['roleTitle'] ?? '')) ?> · <?= e((string)($drv['packageLpa'] ?? '')) ?>
              </div>
            </div>
            <span style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:<?= $isOpen ? '#047857' : 'var(--primary-color)' ?>;white-space:nowrap;">
              <?= e($drvStatus) ?>
            </span>
          </div>
          <div style="margin-top:0.65rem;font-size:0.82rem;color:var(--text-muted);display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0.4rem;">
            <div style="font-variant-numeric:tabular-nums;"><strong>Drive Date:</strong> <?= e((string)($drv['driveDate'] ?? '')) ?></div>
            <div><strong>Eligible Branches:</strong> <?= e((string)($drv['eligibleBranches'] ?? '')) ?></div>
            <div><strong>Venue:</strong> <?= e((string)($drv['venue'] ?? '')) ?></div>
          </div>
          <?php if ($regHref !== ''): ?>
            <div style="margin-top:0.8rem;">
              <a href="<?= e($regHref) ?>" target="_blank" rel="noopener noreferrer" class="btn-primary btn-sm">Apply / Register for Drive &#8599;</a>
            </div>
          <?php endif; ?>
        </article>
      <?php endforeach; ?>
    </div>
  </section>
<?php endif; ?>

<!-- Formatted Branch-Wise Campus Placement Statistics -->
<section class="card" style="margin-bottom:1.5rem;">
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.65rem;margin-bottom:0.85rem;">
    <div>
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--secondary-color);">Audited Outcome Record</div>
      <h2 style="margin:0.2rem 0 0;color:var(--primary-color);">Branch-Wise Campus Placement Statistics</h2>
    </div>
    <?php if (count($academicYears) > 1): ?>
      <div class="tp-filter-strip">
        <a href="placements.php?year=All" class="tp-filter-tab <?= $selectedYear === 'All' ? 'is-active' : '' ?>">All Years</a>
        <?php foreach ($academicYears as $yr): ?>
          <a href="placements.php?year=<?= urlencode($yr) ?>" class="tp-filter-tab <?= $selectedYear === $yr ? 'is-active' : '' ?>"><?= e($yr) ?></a>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>

  <div class="cms-table-wrap">
    <table class="cms-table cms-table-navy">
      <thead>
        <tr>
          <th>Academic Year</th>
          <th>Department / Branch</th>
          <th>Eligible</th>
          <th>Placed</th>
          <th>Placement %</th>
          <th>Highest (LPA)</th>
          <th>Average (LPA)</th>
          <th>Key Recruiting Partners</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($filteredStats as $row):
          $el = max(0, (int)$row['eligible_students']);
          $pl = max(0, (int)$row['placed_students']);
          $pct = $el > 0 ? round(($pl / $el) * 100, 1) : 0.0;
          $barW = min(100, max(0, $pct));
        ?>
          <tr>
            <td><?= e($row['academic_year']) ?></td>
            <td><strong><?= e($row['branch']) ?></strong></td>
            <td><?= $el ?></td>
            <td><strong style="color:#047857;"><?= $pl ?></strong></td>
            <td>
              <div style="display:flex;align-items:center;gap:0.45rem;">
                <span class="cms-progress-track"><span class="cms-progress-fill" style="width:<?= $barW ?>%;"></span></span>
                <strong style="font-size:0.8rem;"><?= e((string)$pct) ?>%</strong>
              </div>
            </td>
            <td><?= e(number_format((float)$row['highest_package_lpa'], 2)) ?></td>
            <td><?= e(number_format((float)$row['average_package_lpa'], 2)) ?></td>
            <td><?= e((string)$row['top_recruiters_list']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</section>

<!-- Custom Placement Data Sections (Tables, Infrastructure Cards, Brochures, Rich HTML) -->
<?php foreach ($customSections as $cs):
  $stype = (string)($cs['section_type'] ?? 'table');
  $payload = json_decode((string)($cs['payload_json'] ?? ''), true);
  if (!is_array($payload)) {
      $payload = [];
  }
  $ctaHref = $resolveDocHref((string)($cs['cta_url'] ?? ''));
?>
  <section class="card" style="margin-bottom:1.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.65rem;margin-bottom:0.85rem;">
      <div>
        <h2 style="margin:0;color:var(--primary-color);"><?= e((string)$cs['title']) ?></h2>
        <?php if (!empty($cs['subtitle'])): ?>
          <p style="margin:0.25rem 0 0;color:var(--text-muted);font-size:0.88rem;"><?= e((string)$cs['subtitle']) ?></p>
        <?php endif; ?>
      </div>
      <?php if ($ctaHref !== '' && $stype !== 'brochure'): ?>
        <a href="<?= e($ctaHref) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm">
          <?= e(!empty($cs['cta_label']) ? (string)$cs['cta_label'] : 'View Resource') ?> &#8599;
        </a>
      <?php endif; ?>
    </div>

    <?php if ($stype === 'table'):
      $headers = is_array($payload['headers'] ?? null) ? $payload['headers'] : [];
      $rows = is_array($payload['rows'] ?? null) ? $payload['rows'] : [];
    ?>
      <?php if (!empty($headers) || !empty($rows)): ?>
        <div class="cms-table-wrap">
          <table class="cms-table cms-table-navy">
            <?php if (!empty($headers)): ?>
              <thead>
                <tr>
                  <?php foreach ($headers as $h): ?>
                    <th><?= e((string)$h) ?></th>
                  <?php endforeach; ?>
                </tr>
              </thead>
            <?php endif; ?>
            <tbody>
              <?php foreach ($rows as $r): if (!is_array($r)) continue; ?>
                <tr>
                  <?php foreach ($r as $cIdx => $cell): ?>
                    <td><?= $cIdx === 0 ? '<strong>' . e((string)$cell) . '</strong>' : e((string)$cell) ?></td>
                  <?php endforeach; ?>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      <?php endif; ?>

    <?php elseif ($stype === 'cards'): ?>
      <div class="grid-3">
        <?php foreach ($payload as $card): if (!is_array($card)) continue; ?>
          <div style="border:1px solid var(--border-color);border-radius:10px;padding:1rem;background:var(--surface-bg);">
            <?php if (!empty($card['metric'])): ?>
              <div style="font-size:0.74rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--secondary-color);font-variant-numeric:tabular-nums;">
                <?= e((string)$card['metric']) ?>
              </div>
            <?php endif; ?>
            <h3 style="margin:0.25rem 0 0.35rem;font-size:1.02rem;color:var(--primary-color);"><?= e((string)($card['title'] ?? '')) ?></h3>
            <?php if (!empty($card['description'])): ?>
              <p style="margin:0;font-size:0.84rem;color:var(--text-muted);line-height:1.5;"><?= e((string)$card['description']) ?></p>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      </div>

    <?php elseif ($stype === 'brochure'): ?>
      <div style="border:1px solid var(--border-color);border-radius:10px;padding:1.1rem;background:var(--surface-bg);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div class="cms-prose" style="flex:1;min-width:240px;">
          <?= (string)($cs['html_content'] ?? '') ?>
        </div>
        <?php if ($ctaHref !== ''): ?>
          <a href="<?= e($ctaHref) ?>" target="_blank" rel="noopener noreferrer" class="btn-primary">
            <?= e(!empty($cs['cta_label']) ? (string)$cs['cta_label'] : 'Download Document (PDF)') ?> &#8599;
          </a>
        <?php endif; ?>
      </div>

    <?php else: ?>
      <div class="cms-prose">
        <?= (string)($cs['html_content'] ?? '') ?>
      </div>
    <?php endif; ?>
  </section>
<?php endforeach; ?>

<!-- Esteemed Recruiters Directory -->
<?php if (!empty($recruiterList)): ?>
  <section class="card" style="margin-bottom:2rem;">
    <div style="margin-bottom:0.85rem;">
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--secondary-color);">Industry Empanelment</div>
      <h2 style="margin:0.2rem 0 0;color:var(--primary-color);">Esteemed Corporate &amp; Core Industry Recruiters</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:0.55rem;">
      <?php foreach ($recruiterList as $rec): ?>
        <div style="padding:0.55rem 0.85rem;border:1px solid var(--border-color);border-radius:8px;background:var(--surface-bg);font-size:0.84rem;font-weight:600;color:var(--primary-color);text-align:center;">
          <?= e($rec) ?>
        </div>
      <?php endforeach; ?>
    </div>
  </section>
<?php endif; ?>

<?php $tpBrand = trim((string)($settings['short_code'] ?? '')) ?: trim((string)($settings['institution_name'] ?? '')) ?: 'Campus'; ?>
<?= renderPhpSocialShareBar($pdo, 'Training & Placements Cell (T&P) — ' . $tpBrand, (string)($summary['summaryNote'] ?? ''), baseUrl('placements.php'), 'portal', true) ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
