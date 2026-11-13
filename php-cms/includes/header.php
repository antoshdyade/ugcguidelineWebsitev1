<?php
declare(strict_types=1);
$settings = getSiteSettings($pdo);
$navCats = $pdo->query('SELECT * FROM categories WHERE COALESCE(show_in_menu, 1) = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
$navDepts = $pdo->query('SELECT id, slug, code, name FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();
$navPagesStmt = $pdo->query('SELECT id, category_id, slug, title FROM pages WHERE is_published = 1 ORDER BY sort_order ASC');
$pagesByCat = [];
foreach ($navPagesStmt->fetchAll() as $pg) {
    $pagesByCat[$pg['category_id']][] = $pg;
}
$primaryCats = array_slice($navCats, 0, 7);
$overflowCats = array_slice($navCats, 7);
$dteDisplay = preg_replace('/^EN-/i', '', $settings['dte_code'] ?? '6220');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= e($pageTitle ?? $settings['institution_name']) ?></title>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css?v=2">
  <style>
    :root {
      --primary-color: <?= e($settings['primary_color']) ?>;
      --secondary-color: <?= e($settings['secondary_color']) ?>;
    }
  </style>
</head>
<body>
<a href="#main-content" class="btn-primary" style="position:absolute;left:-9999px;top:0;" onfocus="this.style.left='8px'">Skip to main content</a>
<header class="site-header">
  <div class="a11y-ribbon">
    <div class="container">
      <div>
        <span>DTE: <?= e($settings['dte_code']) ?> · AICTE: <?= e($settings['aicte_code']) ?></span>
        <a href="quick-links.php" style="color:#fff;margin-left:12px;">Quick Links</a>
        <a href="admin/login.php" style="color:#fde68a;margin-left:12px;font-weight:600;">CMS Admin</a>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <button type="button" class="a11y-btn" onclick="svcoerFont(-0.08)">A-</button>
        <button type="button" class="a11y-btn" onclick="svcoerFont('reset')">A</button>
        <button type="button" class="a11y-btn" onclick="svcoerFont(0.08)">A+</button>
        <button type="button" class="a11y-btn" onclick="svcoerToggle('contrast')">High Contrast</button>
        <button type="button" class="a11y-btn" onclick="svcoerToggle('dark')">Dark Mode</button>
        <button type="button" class="a11y-btn" onclick="svcoerToggle('dyslexia')">Dyslexia Font</button>
        <button type="button" class="a11y-btn" onclick="svcoerToggle('highlight')">Highlight Links</button>
        <button type="button" class="a11y-btn" onclick="svcoerSpeak()">Listen</button>
        <button type="button" class="a11y-btn" onclick="svcoerPalette('#0F294A','#B45309')">Navy</button>
        <button type="button" class="a11y-btn" onclick="svcoerPalette('#064E3B','#0F766E')">Emerald</button>
        <button type="button" class="a11y-btn" onclick="svcoerPalette('#7F1D1D','#B91C1C')">Crimson</button>
        <input id="picker-primary" type="color" aria-label="Custom Primary Color" value="<?= e($settings['primary_color']) ?>" onchange="svcoerPalette(this.value, document.getElementById('picker-secondary').value)">
        <input id="picker-secondary" type="color" aria-label="Custom Secondary Color" value="<?= e($settings['secondary_color']) ?>" onchange="svcoerPalette(document.getElementById('picker-primary').value, this.value)">
        <div id="google_translate_element"></div>
      </div>
    </div>
  </div>

  <div class="container header-brand-row">
    <a href="index.php" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:12px;">
      <?php if (!empty($settings['logo_url'])): ?>
        <img src="<?= e($settings['logo_url']) ?>" alt="<?= e($settings['short_code']) ?> logo" style="width:52px;height:52px;object-fit:contain;border-radius:8px;border:1px solid var(--border-color);background:#fff;padding:3px;">
      <?php else: ?>
        <div style="width:52px;height:52px;border-radius:8px;background:var(--primary-color);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;"><?= e(substr($settings['short_code'], 0, 2)) ?></div>
      <?php endif; ?>
      <div>
        <small style="text-transform:uppercase;font-weight:700;letter-spacing:0.06em;color:var(--text-muted);display:block;font-size:0.72rem;"><?= e($settings['trust_name']) ?></small>
        <strong style="font-size:1.2rem;display:block;font-family:'Playfair Display',serif;"><?= e($settings['institution_name']) ?></strong>
        <small style="color:var(--text-muted);"><?= e($settings['affiliation']) ?></small>
      </div>
    </a>

    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <div style="background:var(--primary-color);color:#fff;border:2px solid var(--secondary-color);border-radius:999px;padding:6px 16px;text-align:center;">
        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;opacity:0.85;">Institute Code</div>
        <div style="font-weight:700;font-size:0.95rem;"><?= e($dteDisplay) ?></div>
      </div>
      <form action="search.php" method="get" style="position:relative;min-width:250px;flex:0 1 320px;">
        <input id="global-search-input" type="search" name="q" placeholder="Search UGC disclosures, faculty, documents..." aria-label="Global search" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:8px;">
        <div id="global-search-dropdown" style="display:none;position:absolute;left:0;right:0;top:100%;background:var(--card-bg);border:1px solid var(--border-color);border-radius:8px;z-index:80;max-height:300px;overflow-y:auto;"></div>
      </form>
    </div>
  </div>

  <nav class="nav-bar" aria-label="Main Navigation">
    <div class="container">
      <ul class="nav-list">
        <li class="nav-item"><a class="nav-link" href="index.php">Home</a></li>
        <?php foreach ($primaryCats as $cat): ?>
          <li class="nav-item">
            <a class="nav-link" href="page.php?cat=<?= urlencode($cat['slug']) ?>"><?= e(!empty($cat['short_label']) ? $cat['short_label'] : $cat['name']) ?></a>
            <div class="dropdown-menu">
              <a href="page.php?cat=<?= urlencode($cat['slug']) ?>"><strong>Open <?= e($cat['name']) ?> Portal &rarr;</strong></a>
              <?php foreach ($pagesByCat[$cat['id']] ?? [] as $pg): ?>
                <a href="page.php?slug=<?= urlencode($pg['slug']) ?>"><?= e($pg['title']) ?></a>
              <?php endforeach; ?>
              <?php if ($cat['slug'] === 'academics'): ?>
                <hr style="border:none;border-top:1px solid var(--border-color);margin:6px 0;">
                <?php foreach ($navDepts as $d): ?>
                  <a href="department.php?dept=<?= urlencode($d['slug']) ?>"><strong>Dept: <?= e($d['name']) ?></strong></a>
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
                <a href="page.php?cat=<?= urlencode($ocat['slug']) ?>"><strong><?= e($ocat['name']) ?></strong></a>
                <?php foreach (array_slice($pagesByCat[$ocat['id']] ?? [], 0, 3) as $pg): ?>
                  <a href="page.php?slug=<?= urlencode($pg['slug']) ?>" style="padding-left:1.25rem;font-size:0.82rem;"><?= e($pg['title']) ?></a>
                <?php endforeach; ?>
              <?php endforeach; ?>
            </div>
          </li>
        <?php endif; ?>
        <li class="nav-item"><a class="nav-link" href="quick-links.php">Quick Links</a></li>
        <li class="nav-item"><a class="nav-link" href="gallery.php">Gallery</a></li>
        <li class="nav-item"><a class="nav-link" href="contact.php">Contact Us</a></li>
      </ul>
    </div>
  </nav>
</header>
<main id="main-content" class="container" style="padding-top:1.5rem;">
