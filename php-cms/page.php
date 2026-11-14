<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
$pdo = getDB();

$slug = $_GET['slug'] ?? '';
$catSlug = $_GET['cat'] ?? '';
$page = null;
$emptyCategory = null;

if ($slug !== '') {
    $stmt = $pdo->prepare('SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.ugc_code FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.slug = ? AND p.is_published = 1 LIMIT 1');
    $stmt->execute([$slug]);
    $page = $stmt->fetch() ?: null;
} elseif ($catSlug !== '') {
    $catStmt = $pdo->prepare('SELECT * FROM categories WHERE slug = ? LIMIT 1');
    $catStmt->execute([$catSlug]);
    $catRow = $catStmt->fetch();
    if ($catRow) {
        $pgStmt = $pdo->prepare('SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.ugc_code FROM pages p JOIN categories c ON p.category_id = c.id WHERE c.id = ? AND p.is_published = 1 ORDER BY p.sort_order ASC, p.id ASC LIMIT 1');
        $pgStmt->execute([(int)$catRow['id']]);
        $page = $pgStmt->fetch() ?: null;
        if ($page) {
            $slug = $page['slug'];
        } else {
            $emptyCategory = $catRow;
        }
    }
} else {
    $stmt = $pdo->prepare('SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.ugc_code FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.is_published = 1 ORDER BY c.sort_order ASC, p.sort_order ASC LIMIT 1');
    $stmt->execute();
    $page = $stmt->fetch() ?: null;
    if ($page) $slug = $page['slug'];
}

if (!$page && $emptyCategory) {
    $pageTitle = $emptyCategory['name'];
    require_once __DIR__ . '/includes/header.php';
    echo '<div class="card"><h1>' . e($emptyCategory['name']) . '</h1><p>' . e($emptyCategory['description'] ?: 'Content for this portal is being updated via the CMS Admin Portal.') . '</p><a href="index.php" class="btn-primary">Return Home</a></div>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

if (!$page) {
    http_response_code(404);
    $pageTitle = 'Page Not Found';
    require_once __DIR__ . '/includes/header.php';
    echo '<div class="card"><h1>Disclosure Page Not Found</h1><a href="index.php" class="btn-primary">Return Home</a></div>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

$sibStmt = $pdo->prepare('SELECT slug, title FROM pages WHERE category_id = ? AND is_published = 1 ORDER BY sort_order ASC');
$sibStmt->execute([$page['category_id']]);
$siblings = $sibStmt->fetchAll();

$leaders = ($slug === 'statutory-officers')
    ? $pdo->query('SELECT * FROM leadership_profiles ORDER BY sort_order ASC')->fetchAll()
    : [];

$pageTitle = $page['title'];
require_once __DIR__ . '/includes/header.php';
?>
<div class="layout-sidebar">
  <aside class="card">
    <p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-top:0;">
      <?= e($page['category_name']) ?>
    </p>
    <ul style="list-style:none;padding:0;margin:0;">
      <?php foreach ($siblings as $sib): ?>
        <li style="margin-bottom:0.35rem;">
          <a href="page.php?slug=<?= urlencode($sib['slug']) ?>"
             style="display:block;padding:0.45rem 0.65rem;border-radius:6px;text-decoration:none;<?= $sib['slug'] === $slug ? 'background:var(--primary-color);color:#fff;font-weight:600;' : 'color:var(--text-main);' ?>">
            <?= e($sib['title']) ?>
          </a>
        </li>
      <?php endforeach; ?>
    </ul>
  </aside>

  <article class="card">
    <small style="color:var(--text-muted);"><?= e($page['subtitle']) ?> · Updated <?= e($page['updated_at']) ?></small>
    <h1 style="font-family:'Playfair Display',serif;margin-top:0.25rem;"><?= e($page['title']) ?></h1>
    <div class="cms-prose"><?= $page['content_html'] ?></div>

    <?php if (!empty($page['attached_pdf_url'])):
      $isExtPdf = preg_match('#^https?://#i', (string)$page['attached_pdf_url']) === 1;
    ?>
      <div class="card" style="margin-top:1.5rem;background:var(--surface-bg);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
        <strong><?= e($page['attached_pdf_label'] ?: 'Attached Statutory Document') ?></strong>
        <?php if ($isExtPdf): ?>
          <a href="<?= e($page['attached_pdf_url']) ?>" target="_blank" rel="noopener noreferrer" class="btn-secondary">Open Document Link &nearr;</a>
        <?php else: ?>
          <a href="<?= e($page['attached_pdf_url']) ?>" download class="btn-primary">Download PDF</a>
        <?php endif; ?>
      </div>
    <?php endif; ?>

    <?php if ($leaders): ?>
      <h2 style="margin-top:2rem;">Statutory Officers &amp; Leadership Profiles</h2>
      <div class="grid-2">
        <?php foreach ($leaders as $l): ?>
          <div class="card">
            <div style="display:flex;gap:0.75rem;align-items:flex-start;">
              <img src="<?= e($l['photo_url'] ?: 'assets/images/principal.jpg') ?>" alt="<?= e($l['name']) ?>" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;">
              <div>
                <small style="color:var(--secondary-color);font-weight:700;"><?= e(formatCommitteeGroupLabel($l['committee_group'] ?? '')) ?> · <?= e($l['role_title']) ?></small>
                <h3 style="margin:0.2rem 0;"><?= e($l['name']) ?></h3>
                <p style="font-size:0.84rem;margin:0;"><?= e($l['qualification']) ?></p>
                <p style="font-size:0.8rem;color:var(--text-muted);margin:0.2rem 0 0;"><?= e($l['email']) ?> · <?= e($l['phone']) ?></p>
              </div>
            </div>
            <?php if (!empty($l['bio'])): ?>
              <p style="font-size:0.82rem;color:var(--text-muted);margin:0.6rem 0 0;"><?= e($l['bio']) ?></p>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </article>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
