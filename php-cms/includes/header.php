<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
ensureCmsSchemaUpgraded($pdo);
recordPhpWebsiteVisit($pdo);
$settings = getSiteSettings($pdo);
$seoSettings = getSeoSettings($pdo);
$hitStats = getHitCounterStats($pdo);
$allHeaderCats = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')->fetchAll();
$portalMenuItems = getPortalMenuItems($pdo);
$partitionedNav = partitionHeaderMenus($allHeaderCats, $portalMenuItems);
$primaryCats = $partitionedNav['mainCats'];
$overflowCats = $partitionedNav['moreCats'];
$mainPortalMenus = $partitionedNav['mainPortals'];
$morePortalMenus = $partitionedNav['morePortals'];
$navDepts = $pdo->query('SELECT id, slug, code, name FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();
$navPagesStmt = $pdo->query('SELECT id, category_id, slug, title FROM pages WHERE is_published = 1 ORDER BY sort_order ASC');
$pagesByCat = [];
foreach ($navPagesStmt->fetchAll() as $pg) {
    $pagesByCat[$pg['category_id']][] = $pg;
}
$dteDisplay = preg_replace('/^EN-/i', '', $settings['dte_code'] ?? '06220');
$currentScript = basename($_SERVER['PHP_SELF'] ?? 'index.php');
$resolvedSeo = resolvePhpRouteSeo(
    $seoSettings,
    $settings,
    (string)($pageTitle ?? $settings['institution_name']),
    isset($pageDesc) ? (string)$pageDesc : null
);
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($resolvedSeo['title']) ?></title>
  <meta name="description" content="<?= e($resolvedSeo['description']) ?>">
  <?php if (!empty($resolvedSeo['keywords'])): ?>
  <meta name="keywords" content="<?= e($resolvedSeo['keywords']) ?>">
  <?php endif; ?>
  <meta name="robots" content="<?= e($resolvedSeo['robots']) ?>">
  <link rel="canonical" href="<?= e($resolvedSeo['canonicalUrl']) ?>">
  <?php if (!empty($resolvedSeo['googleVerify'])): ?>
  <meta name="google-site-verification" content="<?= e($resolvedSeo['googleVerify']) ?>">
  <?php endif; ?>
  <?php if (!empty($resolvedSeo['bingVerify'])): ?>
  <meta name="msvalidate.01" content="<?= e($resolvedSeo['bingVerify']) ?>">
  <?php endif; ?>
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="<?= e($settings['institution_name']) ?>">
  <meta property="og:title" content="<?= e($resolvedSeo['title']) ?>">
  <meta property="og:description" content="<?= e($resolvedSeo['description']) ?>">
  <meta property="og:url" content="<?= e($resolvedSeo['canonicalUrl']) ?>">
  <meta property="og:image" content="<?= e($resolvedSeo['ogImageUrl']) ?>">
  <meta name="twitter:card" content="summary_large_image">
  <?php if (!empty($resolvedSeo['twitterHandle'])): ?>
  <meta name="twitter:site" content="<?= e($resolvedSeo['twitterHandle']) ?>">
  <?php endif; ?>
  <meta name="twitter:title" content="<?= e($resolvedSeo['title']) ?>">
  <meta name="twitter:description" content="<?= e($resolvedSeo['description']) ?>">
  <meta name="twitter:image" content="<?= e($resolvedSeo['ogImageUrl']) ?>">
  <?php if (!empty($resolvedSeo['enableJsonLd'])): ?>
  <script type="application/ld+json"><?= json_encode($resolvedSeo['jsonLd'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?></script>
  <?php endif; ?>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
  <link id="svcoer-public-css" rel="stylesheet" href="<?= e(assetUrl('assets/css/style.css')) ?>">
  <script>
    window.SVCOER_BASE_URL = <?= json_encode(getBaseUrl(), JSON_UNESCAPED_SLASHES) ?>;
    (function () {
      var fallbackHref = <?= json_encode(baseUrl('admin/asset_proxy.php?f=css'), JSON_UNESCAPED_SLASHES) ?>;
      var proxyImgBase = <?= json_encode(baseUrl('admin/asset_proxy.php?img='), JSON_UNESCAPED_SLASHES) ?>;
      function ensureCss() {
        var ready = getComputedStyle(document.documentElement).getPropertyValue('--svcoer-css-ready').trim();
        if (ready !== '1' && !document.getElementById('svcoer-proxy-css')) {
          var lk = document.createElement('link');
          lk.id = 'svcoer-proxy-css';
          lk.rel = 'stylesheet';
          lk.href = fallbackHref;
          document.head.appendChild(lk);
        }
      }
      var mainLk = document.getElementById('svcoer-public-css');
      if (mainLk) mainLk.addEventListener('error', ensureCss);
      window.addEventListener('DOMContentLoaded', ensureCss);
      window.addEventListener('load', ensureCss);
      setTimeout(ensureCss, 350);

      // Webmin resilience: auto-recover any 403/failed local image via PHP asset_proxy
      document.addEventListener('error', function (ev) {
        var t = ev && ev.target;
        if (!t || t.tagName !== 'IMG' || t.dataset.proxyTried === '1') return;
        var src = t.getAttribute('src') || '';
        var idxAssets = src.indexOf('assets/images/');
        var idxUploads = src.indexOf('uploads/');
        var rel = idxAssets >= 0 ? src.slice(idxAssets) : (idxUploads >= 0 ? src.slice(idxUploads) : '');
        if (!rel) return;
        rel = rel.split('?')[0];
        t.dataset.proxyTried = '1';
        t.src = proxyImgBase + encodeURIComponent(rel);
      }, true);
    })();
  </script>
  <style>
    :root {
      --primary-color: <?= e($settings['primary_color']) ?>;
      --secondary-color: <?= e($settings['secondary_color']) ?>;
      --font-display: <?= (string)($settings['font_heading'] ?? "'Playfair Display', Georgia, serif") ?>;
      --font-sans: <?= (string)($settings['font_body'] ?? "'Plus Jakarta Sans', system-ui, sans-serif") ?>;
    }
    body { font-family: var(--font-sans); }
    <?php if (!empty($settings['custom_css'])): ?>
    <?= strip_tags((string)$settings['custom_css']) ?>
    <?php endif; ?>
  </style>
</head>
<body class="theme-radius-<?= e($settings['card_radius'] ?? 'rounded') ?>">
<a href="#main-content" class="btn-primary sr-only-focus">Skip to main content</a>

<header class="site-header<?= ($settings['header_style'] ?? 'classic') === 'compact' ? ' is-compact' : '' ?>">
  <!-- Top Accessibility, Audio Listener, Theme & CMS Admin Ribbon -->
  <div class="a11y-ribbon">
    <div class="container a11y-ribbon-inner">
      <div class="a11y-meta">
        <span>DTE: <?= e($settings['dte_code']) ?> · AICTE: <?= e($settings['aicte_code']) ?></span>
        <span>|</span>
        <span><?= e($settings['short_code'] ?: 'SVERI') ?> · Autonomous Engineering Campus</span>
      </div>

      <div class="a11y-controls">
        <div class="a11y-group" role="group" aria-label="Font size controls">
          <button type="button" class="a11y-btn" onclick="svcoerFont(-0.08)" title="Decrease text size">A-</button>
          <button type="button" class="a11y-btn" onclick="svcoerFont('reset')" title="Reset text size">A</button>
          <button type="button" class="a11y-btn" onclick="svcoerFont(0.08)" title="Increase text size">A+</button>
        </div>
        <button type="button" id="a11y-contrast-btn" class="a11y-btn" onclick="svcoerToggle('contrast')">Contrast</button>
        <button type="button" id="a11y-dark-btn" class="a11y-btn" onclick="svcoerToggle('dark')">Dark Mode</button>
        <button type="button" id="a11y-dyslexia-btn" class="a11y-btn" onclick="svcoerToggle('dyslexia')">Dyslexia Font</button>
        <button type="button" id="a11y-highlight-btn" class="a11y-btn" onclick="svcoerToggle('highlight')">Highlight</button>
        <button type="button" id="a11y-listen-btn" class="a11y-btn" onclick="svcoerSpeak()" title="Read page aloud">Listen</button>

        <select id="theme-palette-select" class="a11y-select" aria-label="Color Theme" onchange="svcoerThemeSelect(this.value)">
          <option value="">Theme…</option>
          <option value="#0F294A|#B45309">Navy &amp; Gold</option>
          <option value="#064E3B|#0F766E">Emerald &amp; Slate</option>
          <option value="#7F1D1D|#B91C1C">Crimson &amp; Charcoal</option>
        </select>
        <input id="picker-primary" class="color-swatch-input" type="color" title="Primary Theme Color" aria-label="Custom Primary Color" value="<?= e($settings['primary_color']) ?>" onchange="svcoerPalette(this.value, document.getElementById('picker-secondary').value)">
        <input id="picker-secondary" class="color-swatch-input" type="color" title="Secondary Theme Color" aria-label="Custom Secondary Color" value="<?= e($settings['secondary_color']) ?>" onchange="svcoerPalette(document.getElementById('picker-primary').value, this.value)">

        <select id="lang-switcher" class="a11y-select" aria-label="Language selector" onchange="svcoerLanguage(this.value)">
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
          <option value="mr">मराठी</option>
          <option value="kn">ಕನ್ನಡ</option>
          <option value="ta">தமிழ்</option>
        </select>

        <a href="<?= e(baseUrl('admin/login.php')) ?>" class="a11y-admin-pill">CMS Admin</a>
      </div>
    </div>
  </div>

  <!-- Institutional Brand Header & Search -->
  <div class="container header-brand-row">
    <a href="<?= e(baseUrl('index.php')) ?>" class="brand-link">
      <?php if (!empty($settings['logo_url'])): ?>
        <img src="<?= e(mediaUrl($settings['logo_url'])) ?>" alt="<?= e($settings['short_code']) ?> logo" style="width:54px;height:54px;object-fit:contain;border-radius:10px;border:1px solid var(--border-color);background:#fff;padding:3px;flex-shrink:0;">
      <?php else: ?>
        <div class="brand-badge"><?= e(substr($settings['short_code'], 0, 2)) ?></div>
      <?php endif; ?>
      <div>
        <small style="text-transform:uppercase;font-weight:700;letter-spacing:0.06em;color:var(--text-muted);display:block;font-size:0.72rem;"><?= e($settings['trust_name']) ?></small>
        <strong class="brand-title"><?= e($settings['institution_name']) ?></strong>
        <small style="color:var(--text-muted);display:block;"><?= e($settings['affiliation']) ?></small>
      </div>
    </a>

    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <div class="institute-pill">
        <div style="font-size:0.62rem;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;">Institute Code</div>
        <div style="font-weight:700;font-size:0.95rem;"><?= e($dteDisplay) ?></div>
      </div>
      <form action="<?= e(baseUrl('search.php')) ?>" method="get" class="global-search-form">
        <input id="global-search-input" class="global-search-input" type="search" name="q" placeholder="Search disclosures, faculty, documents..." aria-label="Global search">
        <div id="global-search-dropdown" class="global-search-dropdown"></div>
      </form>
    </div>
  </div>

  <!-- Primary Navigation Menu -->
  <nav class="nav-bar" aria-label="Primary Institutional Navigation">
    <div class="container nav-bar-inner">
      <button type="button" class="mobile-nav-toggle" onclick="svcoerToggleMobileNav()">&#9776; Menu</button>
      <ul id="main-nav-list" class="nav-list">
        <li class="nav-item"><a class="nav-link <?= $currentScript === 'index.php' ? 'is-active' : '' ?>" href="<?= e(baseUrl('index.php')) ?>">Home</a></li>
        <?php foreach ($primaryCats as $cat): ?>
          <li class="nav-item">
            <a class="nav-link" href="<?= e(baseUrl('page.php?cat=' . urlencode($cat['slug']))) ?>"><?= e(!empty($cat['short_label']) ? $cat['short_label'] : $cat['name']) ?></a>
            <div class="dropdown-menu">
              <a href="<?= e(baseUrl('page.php?cat=' . urlencode($cat['slug']))) ?>"><strong>Open <?= e($cat['name']) ?> Portal &rarr;</strong></a>
              <?php if ($cat['slug'] === 'research'): ?>
                <a href="<?= e(baseUrl('conferences.php')) ?>" style="background:#EFF6FF;color:#0F294A;font-weight:700;">Conferences, Workshops &amp; Events &rarr;</a>
              <?php elseif ($cat['slug'] === 'student-life'): ?>
                <a href="<?= e(baseUrl('sports.php')) ?>" style="background:#EFF6FF;color:#0F294A;font-weight:700;">Sports, Athletics &amp; Recreation &rarr;</a>
                <a href="<?= e(baseUrl('placements.php')) ?>" style="background:#EFF6FF;color:#0F294A;font-weight:700;">Training &amp; Placement (T&amp;P) Hub &rarr;</a>
                <a href="<?= e(baseUrl('grievance.php')) ?>" style="background:#FFFBEB;color:#92400E;font-weight:700;">Online Grievance Redressal &rarr;</a>
              <?php endif; ?>
              <?php foreach ($pagesByCat[$cat['id']] ?? [] as $pg): ?>
                <a href="<?= e(baseUrl('page.php?slug=' . urlencode($pg['slug']))) ?>"><?= e($pg['title']) ?></a>
              <?php endforeach; ?>
              <?php if ($cat['slug'] === 'academics'): ?>
                <hr style="border:none;border-top:1px solid var(--border-color);margin:6px 0;">
                <?php foreach ($navDepts as $d): ?>
                  <a href="<?= e(baseUrl('department.php?dept=' . urlencode($d['slug']))) ?>"><strong>Dept: <?= e($d['name']) ?></strong></a>
                <?php endforeach; ?>
              <?php endif; ?>
            </div>
          </li>
        <?php endforeach; ?>
        <?php foreach ($mainPortalMenus as $pm):
          $pmHref = (string)($pm['href'] ?? 'index.php');
          $isExt = preg_match('#^https?://#i', $pmHref) === 1;
          $pmUrl = $isExt ? $pmHref : baseUrl($pmHref);
          $isMatch = in_array($currentScript, (array)($pm['matchScripts'] ?? []), true);
        ?>
          <li class="nav-item">
            <a class="nav-link <?= $isMatch ? 'is-active' : '' ?>" href="<?= e($pmUrl) ?>"<?= !empty($pm['openInNewTab']) ? ' target="_blank" rel="noopener noreferrer"' : '' ?>><?= e((string)$pm['label']) ?></a>
          </li>
        <?php endforeach; ?>
        <?php if (!empty($overflowCats) || !empty($morePortalMenus)): ?>
          <li class="nav-item">
            <a class="nav-link" href="#">More Portals</a>
            <div class="dropdown-menu">
              <?php foreach ($overflowCats as $ocat): ?>
                <a href="<?= e(baseUrl('page.php?cat=' . urlencode($ocat['slug']))) ?>"><strong><?= e($ocat['name']) ?></strong></a>
                <?php if ($ocat['slug'] === 'research'): ?>
                  <a href="<?= e(baseUrl('conferences.php')) ?>" style="padding-left:1.25rem;font-size:0.8rem;font-weight:700;">Conferences, Workshops &amp; Events</a>
                <?php elseif ($ocat['slug'] === 'student-life'): ?>
                  <a href="<?= e(baseUrl('sports.php')) ?>" style="padding-left:1.25rem;font-size:0.8rem;font-weight:700;">Sports, Athletics &amp; Recreation</a>
                  <a href="<?= e(baseUrl('placements.php')) ?>" style="padding-left:1.25rem;font-size:0.8rem;font-weight:700;">Training &amp; Placement Hub</a>
                  <a href="<?= e(baseUrl('grievance.php')) ?>" style="padding-left:1.25rem;font-size:0.8rem;font-weight:700;">Grievance &amp; Anti-Ragging Helpdesk</a>
                <?php endif; ?>
                <?php foreach (array_slice($pagesByCat[$ocat['id']] ?? [], 0, 3) as $pg): ?>
                  <a href="<?= e(baseUrl('page.php?slug=' . urlencode($pg['slug']))) ?>" style="padding-left:1.25rem;font-size:0.8rem;"><?= e($pg['title']) ?></a>
                <?php endforeach; ?>
              <?php endforeach; ?>
              <?php if (!empty($overflowCats) && !empty($morePortalMenus)): ?>
                <hr style="border:none;border-top:1px solid var(--border-color);margin:6px 0;">
              <?php endif; ?>
              <?php foreach ($morePortalMenus as $mpm):
                $mpmHref = (string)($mpm['href'] ?? 'index.php');
                $mpmUrl = preg_match('#^https?://#i', $mpmHref) === 1 ? $mpmHref : baseUrl($mpmHref);
              ?>
                <a href="<?= e($mpmUrl) ?>"<?= !empty($mpm['openInNewTab']) ? ' target="_blank" rel="noopener noreferrer"' : '' ?>><strong><?= e((string)$mpm['label']) ?> &rarr;</strong></a>
              <?php endforeach; ?>
            </div>
          </li>
        <?php endif; ?>
      </ul>
    </div>
  </nav>

  <!-- Statutory & Quick Access Strip -->
  <div class="statutory-bar">
    <div class="container statutory-bar-inner">
      <span class="statutory-label">Statutory &amp; Quick Access:</span>
      <a class="statutory-link" href="<?= e(baseUrl('quick-links.php')) ?>">Quick Links</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('conferences.php')) ?>">Conferences &amp; Workshops</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('page.php?cat=examination')) ?>">Examination Cell</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('alumni.php')) ?>">Alumni Network</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('placements.php')) ?>">Placements</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('grievance.php')) ?>">Grievance Helpdesk</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('page.php?slug=prospectus-fee-structure')) ?>">FRA Fee Structure</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('page.php?slug=rti-disclosure')) ?>">RTI Disclosure</a>
    </div>
  </div>
</header>
<main id="main-content" class="container" style="padding-top:0.5rem;">
