<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$selectedCat = trim((string)($_GET['cat'] ?? 'All'));
$searchQ     = trim((string)($_GET['q'] ?? ''));

$cfgRow = [];
try {
    $kv = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'facilities_portal_config' LIMIT 1");
    $kv->execute();
    $dec = json_decode((string)$kv->fetchColumn(), true);
    if (is_array($dec)) {
        $cfgRow = $dec;
    }
} catch (Throwable $ignored) {
}
$config = array_merge([
    'heroBadge'    => 'Institutional Infrastructure, IT & Student Support Campus',
    'heroTitle'    => 'Campus Facilities & Infrastructure Showcase',
    'heroSubtitle' => 'AICTE/UGC-compliant smart lecture theatres, 1 Gbps campus computing backbone, central library, hostels, research centres, green solar microgrids, and barrier-free amenities.',
], $cfgRow);

$allFacilities = $pdo->query('SELECT * FROM facilities WHERE is_published = 1 ORDER BY is_featured DESC, sort_order ASC, id ASC')->fetchAll();

$categories = ['All'];
foreach ($allFacilities as $fac) {
    $c = (string)($fac['category'] ?? '');
    if ($c !== '' && !in_array($c, $categories, true)) {
        $categories[] = $c;
    }
}

$visible = array_values(array_filter($allFacilities, static function (array $fac) use ($selectedCat, $searchQ): bool {
    if ($selectedCat !== 'All' && (string)$fac['category'] !== $selectedCat) {
        return false;
    }
    if ($searchQ !== '') {
        $hay = strtolower(
            ($fac['title'] ?? '') . ' ' .
            ($fac['category'] ?? '') . ' ' .
            ($fac['short_summary'] ?? '') . ' ' .
            ($fac['location_block'] ?? '') . ' ' .
            ($fac['custom_fields_json'] ?? '')
        );
        if (!str_contains($hay, strtolower($searchQ))) {
            return false;
        }
    }
    return true;
}));

$pageTitle = 'Campus Facilities & Infrastructure Showcase';
$pageDesc  = (string)$config['heroSubtitle'];
require_once __DIR__ . '/includes/header.php';
?>

<section class="card" style="background:var(--primary-color);color:#fff;border-color:transparent;margin-bottom:1.25rem;padding:1.5rem 1.75rem;">
  <div style="max-width:820px;">
    <p style="margin:0 0 0.35rem;font-size:0.74rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FCD34D;">
      <?= e((string)$config['heroBadge']) ?>
    </p>
    <h1 style="margin:0 0 0.45rem;color:#fff;font-size:1.85rem;"><?= e((string)$config['heroTitle']) ?></h1>
    <p style="margin:0;color:#E2E8F0;font-size:0.92rem;line-height:1.55;"><?= e((string)$config['heroSubtitle']) ?></p>
  </div>
</section>

<!-- Filter & Search Bar -->
<div class="card" style="margin-bottom:1.25rem;">
  <form method="get" style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;justify-content:space-between;">
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
      <?php foreach ($categories as $catOpt): ?>
        <a href="?cat=<?= urlencode($catOpt) ?><?= $searchQ !== '' ? '&q=' . urlencode($searchQ) : '' ?>" class="<?= $selectedCat === $catOpt ? 'btn-primary' : 'btn-outline' ?> btn-sm" style="text-decoration:none;"><?= e($catOpt) ?></a>
      <?php endforeach; ?>
    </div>
    <div style="display:flex;gap:0.4rem;align-items:center;">
      <input type="hidden" name="cat" value="<?= e($selectedCat) ?>">
      <input type="search" name="q" value="<?= e($searchQ) ?>" placeholder="Search labs, hostels, Wi-Fi, specs..." style="padding:0.45rem 0.7rem;border:1px solid var(--border-color);border-radius:8px;min-width:220px;">
      <button type="submit" class="btn-primary btn-sm">Filter</button>
    </div>
  </form>
</div>

<?php if (empty($visible)): ?>
  <div class="card"><p style="margin:0;color:var(--text-muted);">No published campus facilities match the selected filter.</p></div>
<?php else: ?>
  <div style="display:flex;flex-direction:column;gap:1.25rem;">
    <?php foreach ($visible as $fac):
        $customFields = json_decode((string)($fac['custom_fields_json'] ?? '[]'), true) ?: [];
    ?>
      <article class="card" style="padding:0;overflow:hidden;">
        <div class="grid-2" style="gap:0;">
          <div style="background:#0F172A;min-height:240px;">
            <img src="<?= e(mediaUrl((string)$fac['image_url'], 'assets/images/campus_facilities.jpg')) ?>" alt="<?= e($fac['title']) ?>" style="width:100%;height:100%;max-height:340px;object-fit:cover;display:block;">
          </div>
          <div style="padding:1.35rem;display:flex;flex-direction:column;gap:0.65rem;">
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.5rem;">
              <small style="font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--secondary-color);"><?= e($fac['category']) ?></small>
              <?php if (!empty($fac['is_featured'])): ?>
                <small style="font-weight:700;color:var(--primary-color);">Featured Infrastructure</small>
              <?php endif; ?>
            </div>
            <h2 style="margin:0;font-size:1.3rem;"><?= e($fac['title']) ?></h2>
            <?php if (!empty($fac['short_summary'])): ?>
              <p style="margin:0;font-size:0.9rem;color:var(--text-main);font-weight:500;"><?= e($fac['short_summary']) ?></p>
            <?php endif; ?>
            <?php if (!empty($fac['description_html'])): ?>
              <div class="cms-prose" style="font-size:0.86rem;color:var(--text-muted);"><?= (string)$fac['description_html'] ?></div>
            <?php endif; ?>

            <div class="grid-3" style="gap:0.5rem;padding-top:0.4rem;border-top:1px solid var(--border-color);font-size:0.78rem;">
              <?php if (!empty($fac['location_block'])): ?>
                <div><span style="color:var(--text-muted);display:block;">Location / Block</span><strong><?= e($fac['location_block']) ?></strong></div>
              <?php endif; ?>
              <?php if (!empty($fac['capacity'])): ?>
                <div><span style="color:var(--text-muted);display:block;">Capacity</span><strong><?= e($fac['capacity']) ?></strong></div>
              <?php endif; ?>
              <?php if (!empty($fac['timings'])): ?>
                <div><span style="color:var(--text-muted);display:block;">Access Hours</span><strong><?= e($fac['timings']) ?></strong></div>
              <?php endif; ?>
            </div>

            <?php if (!empty($customFields)): ?>
              <div style="border-top:1px solid var(--border-color);padding-top:0.55rem;">
                <table class="data-table" style="font-size:0.8rem;">
                  <tbody>
                    <?php foreach ($customFields as $cf): ?>
                      <tr>
                        <th style="width:36%;text-align:left;background:#FAFAF9;"><?= e((string)($cf['label'] ?? '')) ?></th>
                        <td><?= e((string)($cf['value'] ?? '')) ?></td>
                      </tr>
                    <?php endforeach; ?>
                  </tbody>
                </table>
              </div>
            <?php endif; ?>

            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.5rem;margin-top:auto;padding-top:0.5rem;border-top:1px solid var(--border-color);font-size:0.8rem;">
              <div style="color:var(--text-muted);">
                <?php if (!empty($fac['incharge_name'])): ?>
                  <strong>In-Charge:</strong> <?= e($fac['incharge_name']) ?>
                  <?php if (!empty($fac['incharge_email'])): ?> · <?= e($fac['incharge_email']) ?><?php endif; ?>
                  <?php if (!empty($fac['incharge_phone'])): ?> · <?= e($fac['incharge_phone']) ?><?php endif; ?>
                <?php endif; ?>
              </div>
              <?php if (!empty($fac['brochure_url'])): ?>
                <a href="<?= e(mediaUrl((string)$fac['brochure_url'])) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm" style="text-decoration:none;">Facility Brochure / SOP &darr;</a>
              <?php endif; ?>
            </div>
          </div>
        </div>
      </article>
    <?php endforeach; ?>
  </div>
<?php endif; ?>

<?= renderPhpSocialShareBar($pdo, $pageTitle, (string)$config['heroSubtitle'], baseUrl('facilities.php'), 'portal', true) ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
