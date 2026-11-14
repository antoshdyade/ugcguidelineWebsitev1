<?php
declare(strict_types=1);
$settings = getSiteSettings($pdo);
try {
    $navCats = $pdo->query('SELECT * FROM categories WHERE COALESCE(show_in_menu, 1) = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
} catch (Throwable $exNav) {
    $navCats = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')->fetchAll();
}
$navDepts = $pdo->query('SELECT id, slug, code, name FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();
$navPagesStmt = $pdo->query('SELECT id, category_id, slug, title FROM pages WHERE is_published = 1 ORDER BY sort_order ASC');
$pagesByCat = [];
foreach ($navPagesStmt->fetchAll() as $pg) {
    $pagesByCat[$pg['category_id']][] = $pg;
}
$primaryCats = array_slice($navCats, 0, 7);
$overflowCats = array_slice($navCats, 7);
$dteDisplay = preg_replace('/^EN-/i', '', $settings['dte_code'] ?? '06220');
$currentScript = basename($_SERVER['PHP_SELF'] ?? 'index.php');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($pageTitle ?? $settings['institution_name']) ?></title>
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
    }
  </style>
</head>
<body>
<a href="#main-content" class="btn-primary sr-only-focus">Skip to main content</a>

<header class="site-header">
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
        <?php if (!empty($overflowCats)): ?>
          <li class="nav-item">
            <a class="nav-link" href="#">More Portals</a>
            <div class="dropdown-menu">
              <?php foreach ($overflowCats as $ocat): ?>
                <a href="<?= e(baseUrl('page.php?cat=' . urlencode($ocat['slug']))) ?>"><strong><?= e($ocat['name']) ?></strong></a>
                <?php foreach (array_slice($pagesByCat[$ocat['id']] ?? [], 0, 3) as $pg): ?>
                  <a href="<?= e(baseUrl('page.php?slug=' . urlencode($pg['slug']))) ?>" style="padding-left:1.25rem;font-size:0.8rem;"><?= e($pg['title']) ?></a>
                <?php endforeach; ?>
              <?php endforeach; ?>
            </div>
          </li>
        <?php endif; ?>
        <li class="nav-item"><a class="nav-link <?= $currentScript === 'gallery.php' ? 'is-active' : '' ?>" href="<?= e(baseUrl('gallery.php')) ?>">Gallery</a></li>
        <li class="nav-item"><a class="nav-link <?= $currentScript === 'contact.php' ? 'is-active' : '' ?>" href="<?= e(baseUrl('contact.php')) ?>">Contact Us</a></li>
      </ul>
    </div>
  </nav>

  <!-- Statutory & Quick Access Strip -->
  <div class="statutory-bar">
    <div class="container statutory-bar-inner">
      <span class="statutory-label">Statutory &amp; Quick Access:</span>
      <a class="statutory-link" href="<?= e(baseUrl('quick-links.php')) ?>">Quick Links</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('page.php?cat=examination')) ?>">Examination Cell</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('page.php?slug=prospectus-fee-structure')) ?>">FRA Fee Structure</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('page.php?slug=rti-disclosure')) ?>">RTI Disclosure</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('page.php?slug=about-overview')) ?>">Mandatory Disclosures</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('page.php?slug=circulars-notices')) ?>">Circulars &amp; Notices</a>
      <span class="statutory-sep">|</span>
      <a class="statutory-link" href="<?= e(baseUrl('page.php?slug=training-placement')) ?>">Placements</a>
    </div>
  </div>
</header>
<main id="main-content" class="container" style="padding-top:0.5rem;">
