<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$deptSlug = $_GET['dept'] ?? 'computer-science';
$subSlug  = $_GET['sub'] ?? 'about';

$dStmt = $pdo->prepare("SELECT * FROM departments WHERE slug = ? AND status = 'published' LIMIT 1");
$dStmt->execute([$deptSlug]);
$dept = $dStmt->fetch();

if (!$dept) {
    $dept = $pdo->query("SELECT * FROM departments WHERE status = 'published' ORDER BY sort_order ASC, id ASC LIMIT 1")->fetch();
}

if (!$dept) {
    $pageTitle = 'Departments';
    require_once __DIR__ . '/includes/header.php';
    echo '<section class="card" style="padding:2rem;text-align:center;"><h2>No Departments Configured</h2><p style="color:var(--text-muted);">Please add engineering departments from the CMS Admin Portal.</p></section>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

$subStmt = $pdo->prepare("SELECT * FROM department_subpages WHERE department_id = ? AND is_published = 1 AND status = 'published' ORDER BY sort_order ASC, id ASC");
$subStmt->execute([$dept['id']]);
$subPages = $subStmt->fetchAll();

$facStmt = $pdo->prepare('SELECT * FROM faculty WHERE department_id = ? ORDER BY sort_order ASC, id ASC');
$facStmt->execute([$dept['id']]);
$faculty = $facStmt->fetchAll();

$labStmt = $pdo->prepare('SELECT * FROM department_labs WHERE department_id = ? ORDER BY sort_order ASC, id ASC');
$labStmt->execute([$dept['id']]);
$labs = $labStmt->fetchAll();

$deptLibrary = !empty($dept['library_json']) ? json_decode((string)$dept['library_json'], true) : null;
if (!is_array($deptLibrary) || empty($deptLibrary['name'])) {
    $deptLibrary = null;
}

$activeSubPage = null;
foreach ($subPages as $sp) {
    if ($sp['slug'] === $subSlug) {
        $activeSubPage = $sp;
        break;
    }
}

$pageTitle = $dept['name'] . ' — Department Microsite';
require_once __DIR__ . '/includes/header.php';
?>
<section class="card" style="background:linear-gradient(120deg, var(--primary-color), #1e293b);color:#fff;margin-bottom:1.5rem;display:flex;justify-content:space-between;align-items:center;gap:1.25rem;flex-wrap:wrap;">
  <div style="flex:1;min-width:260px;">
    <small style="color:#fde68a;font-weight:700;text-transform:uppercase;">Department Microsite · Est. <?= e((string)$dept['established_year']) ?> · <?= e($dept['nba_status']) ?></small>
    <h1 style="font-family:'Playfair Display',serif;margin:0.35rem 0;color:#fff;"><?= e($dept['name']) ?></h1>
    <p style="margin:0;color:#e2e8f0;">HoD: <?= e($dept['hod_name']) ?> · Sanctioned Intake: <?= e((string)$dept['intake_capacity']) ?></p>
  </div>
  <?php if (!empty($dept['hero_image_url'])): ?>
    <img src="<?= e(mediaUrl($dept['hero_image_url'])) ?>" alt="<?= e($dept['name']) ?>" style="width:210px;height:115px;object-fit:cover;border-radius:10px;border:2px solid rgba(255,255,255,0.25);">
  <?php endif; ?>
</section>

<div class="layout-sidebar">
  <aside class="card">
    <p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-top:0;"><?= e($dept['short_name']) ?> Menu</p>
    <ul style="list-style:none;padding:0;margin:0;">
      <?php foreach ($subPages as $sp): ?>
        <li style="margin-bottom:0.35rem;">
          <a href="<?= e(baseUrl('department.php?dept=' . urlencode($dept['slug']) . '&sub=' . urlencode($sp['slug']))) ?>"
             style="display:block;padding:0.45rem 0.65rem;border-radius:6px;text-decoration:none;<?= $subSlug === $sp['slug'] ? 'background:var(--primary-color);color:#fff;font-weight:600;' : 'color:var(--text-main);' ?>">
            <?= e($sp['title']) ?>
          </a>
        </li>
      <?php endforeach; ?>
      <li style="margin-bottom:0.35rem;">
        <a href="<?= e(baseUrl('department.php?dept=' . urlencode($dept['slug']) . '&sub=faculty')) ?>"
           style="display:block;padding:0.45rem 0.65rem;border-radius:6px;text-decoration:none;<?= $subSlug === 'faculty' ? 'background:var(--primary-color);color:#fff;font-weight:600;' : 'color:var(--text-main);' ?>">
          Faculty &amp; Staff (<?= count($faculty) ?>)
        </a>
      </li>
      <li style="margin-bottom:0.35rem;">
        <a href="<?= e(baseUrl('department.php?dept=' . urlencode($dept['slug']) . '&sub=laboratories')) ?>"
           style="display:block;padding:0.45rem 0.65rem;border-radius:6px;text-decoration:none;<?= $subSlug === 'laboratories' ? 'background:var(--primary-color);color:#fff;font-weight:600;' : 'color:var(--text-main);' ?>">
          Laboratories (<?= count($labs) ?>)
        </a>
      </li>
      <?php if ($deptLibrary): ?>
        <li>
          <a href="<?= e(baseUrl('department.php?dept=' . urlencode($dept['slug']) . '&sub=library')) ?>"
             style="display:block;padding:0.45rem 0.65rem;border-radius:6px;text-decoration:none;<?= $subSlug === 'library' ? 'background:var(--primary-color);color:#fff;font-weight:600;' : 'color:var(--text-main);' ?>">
            Department Library
          </a>
        </li>
      <?php endif; ?>
    </ul>
  </aside>

  <section class="card">
    <?php if ($subSlug === 'faculty'): ?>
      <h2 style="margin-top:0;">Department Faculty Directory</h2>
      <div class="grid-2">
        <?php foreach ($faculty as $fIdx => $f):
          $customFields = !empty($f['custom_fields_json']) ? json_decode((string)$f['custom_fields_json'], true) : [];
          if (!is_array($customFields)) $customFields = [];
          $srNo = !empty($f['sort_order']) ? (int)$f['sort_order'] : ($fIdx + 1);
        ?>
          <article class="card">
            <div style="display:flex;gap:0.9rem;align-items:flex-start;">
              <img src="<?= e(mediaUrl($f['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="<?= e($f['name']) ?>" style="width:68px;height:68px;border-radius:10px;object-fit:cover;border:1px solid var(--border-color);flex-shrink:0;">
              <div style="min-width:0;flex:1;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
                  <small style="color:var(--secondary-color);font-weight:700;"><?= e($f['designation']) ?></small>
                  <span style="font-size:0.7rem;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--surface-bg);border:1px solid var(--border-color);color:var(--text-muted);">Sr. No. <?= $srNo ?></span>
                </div>
                <h3 style="margin:0.2rem 0;font-size:1.05rem;"><?= e($f['name']) ?></h3>
                <p style="font-size:0.84rem;margin:0;color:var(--text-main);"><?= e($f['qualification']) ?> · <strong><?= e((string)$f['experience_years']) ?> yrs</strong> exp.</p>
                <p style="font-size:0.82rem;margin:0.25rem 0 0;color:var(--text-muted);"><strong>Area of Expertise:</strong> <?= e($f['specialization']) ?></p>
              </div>
            </div>
            <div style="margin-top:0.75rem;padding-top:0.65rem;border-top:1px solid var(--border-color);font-size:0.82rem;color:var(--text-muted);">
              <div>Email: <?= e($f['email']) ?><?php if (!empty($f['phone'])): ?> · Tel: <?= e($f['phone']) ?><?php endif; ?></div>
              <?php foreach ($customFields as $cfKey => $cfVal): if (trim((string)$cfVal) === '') continue; ?>
                <div style="margin-top:0.25rem;"><strong style="color:var(--text-main);"><?= e((string)$cfKey) ?>:</strong> <?= e((string)$cfVal) ?></div>
              <?php endforeach; ?>
              <?php if (!empty($f['external_profile_url'])): ?>
                <div style="margin-top:0.55rem;">
                  <a href="<?= e($f['external_profile_url']) ?>" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size:0.78rem;padding:0.3rem 0.65rem;">
                    <?= e($f['external_profile_label'] ?: 'Faculty Profile Link') ?> &nearr;
                  </a>
                </div>
              <?php endif; ?>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php elseif ($subSlug === 'laboratories'): ?>
      <h2 style="margin-top:0;">Departmental Laboratories</h2>
      <div class="grid-2">
        <?php foreach ($labs as $lab): ?>
          <article class="card" style="padding:0;overflow:hidden;">
            <?php if (!empty($lab['photo_url'])): ?>
              <img src="<?= e(mediaUrl($lab['photo_url'])) ?>" alt="<?= e($lab['name']) ?>" style="width:100%;height:175px;object-fit:cover;display:block;">
            <?php endif; ?>
            <div style="padding:1rem;">
              <small style="color:var(--secondary-color);font-weight:700;"><?= e((string)$lab['area_sqft']) ?> Sq.Ft.</small>
              <h3 style="margin:0.25rem 0 0.4rem;font-size:1.05rem;"><?= e($lab['name']) ?></h3>
              <p style="font-size:0.85rem;color:var(--text-muted);margin:0 0 0.5rem;"><?= e($lab['equipment_summary']) ?></p>
              <div style="font-size:0.82rem;"><strong>In-Charge:</strong> <?= e($lab['incharge']) ?></div>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php elseif ($subSlug === 'library' && $deptLibrary): ?>
      <h2 style="margin-top:0;"><?= e($deptLibrary['name']) ?></h2>
      <div class="grid-2" style="align-items:start;">
        <?php if (!empty($deptLibrary['photoUrl'])): ?>
          <img src="<?= e(mediaUrl($deptLibrary['photoUrl'])) ?>" alt="<?= e($deptLibrary['name']) ?>" style="width:100%;height:240px;object-fit:cover;border-radius:10px;border:1px solid var(--border-color);">
        <?php endif; ?>
        <div>
          <?php if (!empty($deptLibrary['description'])): ?>
            <p style="font-size:0.92rem;color:var(--text-muted);line-height:1.6;margin-top:0;"><?= e($deptLibrary['description']) ?></p>
          <?php endif; ?>
          <table class="cms-table cms-table-navy">
            <tbody>
              <tr><th>Reference Volumes</th><td><?= e((string)($deptLibrary['volumesCount'] ?? '—')) ?></td></tr>
              <tr><th>Print / E-Journals</th><td><?= e((string)($deptLibrary['journalsCount'] ?? '—')) ?></td></tr>
              <tr><th>E-Resources Access</th><td><?= e((string)($deptLibrary['eResourcesSummary'] ?? '—')) ?></td></tr>
              <tr><th>Library In-Charge</th><td><?= e((string)($deptLibrary['incharge'] ?? '—')) ?></td></tr>
              <tr><th>Reading Timings</th><td><?= e((string)($deptLibrary['timings'] ?? '—')) ?></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    <?php else:
      $subPhotos = ($activeSubPage && !empty($activeSubPage['photos_json'])) ? json_decode((string)$activeSubPage['photos_json'], true) : [];
      if (!is_array($subPhotos)) $subPhotos = [];
      $subItems = ($activeSubPage && !empty($activeSubPage['items_json'])) ? json_decode((string)$activeSubPage['items_json'], true) : [];
      if (!is_array($subItems)) $subItems = [];
    ?>
      <h2 style="margin-top:0;"><?= e($activeSubPage['title'] ?? 'About Department') ?></h2>
      <div class="cms-prose"><?= $activeSubPage['content_html'] ?? '<p>' . e($dept['overview']) . '</p>' ?></div>

      <?php if ($subItems): ?>
        <div style="margin-top:1.5rem;display:grid;gap:0.9rem;">
          <?php foreach ($subItems as $it):
            $itLink = trim((string)($it['linkUrl'] ?? ''));
            $isExt = $itLink !== '' && preg_match('#^https?://#i', $itLink) === 1;
          ?>
            <article class="card" style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-start;">
              <?php if (!empty($it['photoUrl'])): ?>
                <img src="<?= e(mediaUrl($it['photoUrl'])) ?>" alt="<?= e($it['title'] ?? '') ?>" style="width:120px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border-color);">
              <?php endif; ?>
              <div style="flex:1;min-width:220px;">
                <small style="color:var(--secondary-color);font-weight:700;">
                  <?= e($it['badge'] ?? 'Update') ?><?php if (!empty($it['date'])): ?> · <?= e($it['date']) ?><?php endif; ?>
                </small>
                <h3 style="margin:0.2rem 0 0.35rem;font-size:1.05rem;"><?= e($it['title'] ?? '') ?></h3>
                <?php if (!empty($it['summary'])): ?>
                  <p style="margin:0;font-size:0.88rem;color:var(--text-muted);"><?= e($it['summary']) ?></p>
                <?php endif; ?>
                <?php if ($itLink !== ''): ?>
                  <div style="margin-top:0.55rem;">
                    <?php if ($isExt): ?>
                      <a href="<?= e($itLink) ?>" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="font-size:0.78rem;padding:0.35rem 0.7rem;">
                        <?= e($it['linkLabel'] ?? 'Open External Resource') ?> &nearr;
                      </a>
                    <?php else: ?>
                      <a href="<?= e(baseUrl($itLink)) ?>" download class="btn-primary" style="font-size:0.78rem;padding:0.35rem 0.7rem;">
                        <?= e($it['linkLabel'] ?? 'Download Attachment') ?>
                      </a>
                    <?php endif; ?>
                  </div>
                <?php endif; ?>
              </div>
            </article>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>

      <?php if ($subPhotos): ?>
        <h3 style="margin-top:1.75rem;margin-bottom:0.5rem;">Department Visual Gallery</h3>
        <div class="cms-gallery-grid">
          <?php foreach ($subPhotos as $ph): $resolvedPh = mediaUrl($ph['url'] ?? ''); ?>
            <figure class="cms-gallery-card" style="margin:0;cursor:pointer;" onclick="openDeptLightbox(this.dataset.src, this.dataset.cap)" data-src="<?= e($resolvedPh) ?>" data-cap="<?= e($ph['caption'] ?? '') ?>">
              <img src="<?= e($resolvedPh) ?>" alt="<?= e($ph['caption'] ?? 'Department photo') ?>">
              <?php if (!empty($ph['caption'])): ?>
                <figcaption><?= e($ph['caption']) ?></figcaption>
              <?php endif; ?>
            </figure>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>

      <?php if ($subSlug === 'about' && $deptLibrary): ?>
        <div class="card" style="margin-top:1.75rem;background:var(--surface-bg);display:flex;gap:1.1rem;flex-wrap:wrap;align-items:center;">
          <?php if (!empty($deptLibrary['photoUrl'])): ?>
            <img src="<?= e(mediaUrl($deptLibrary['photoUrl'])) ?>" alt="<?= e($deptLibrary['name']) ?>" style="width:160px;height:110px;object-fit:cover;border-radius:8px;">
          <?php endif; ?>
          <div style="flex:1;min-width:220px;">
            <small style="color:var(--secondary-color);font-weight:700;text-transform:uppercase;">Departmental Library</small>
            <h3 style="margin:0.2rem 0;"><?= e($deptLibrary['name']) ?></h3>
            <p style="font-size:0.86rem;color:var(--text-muted);margin:0 0 0.5rem;">
              <?= e((string)($deptLibrary['volumesCount'] ?? '0')) ?> Volumes · <?= e((string)($deptLibrary['journalsCount'] ?? '0')) ?> Journals · <?= e((string)($deptLibrary['eResourcesSummary'] ?? '')) ?>
            </p>
            <a href="<?= e(baseUrl('department.php?dept=' . urlencode($dept['slug']) . '&sub=library')) ?>" class="btn-primary" style="font-size:0.8rem;padding:0.35rem 0.75rem;">Open Library Showcase &rarr;</a>
          </div>
        </div>
      <?php endif; ?>
    <?php endif; ?>
    <?php
      $deptShareable = !isset($dept['is_shareable']) || !empty($dept['is_shareable']);
      $subShareable = $activeSubPage ? (!isset($activeSubPage['is_shareable']) || !empty($activeSubPage['is_shareable'])) : true;
      $shareTitle = $dept['name'] . ($activeSubPage ? ' — ' . $activeSubPage['title'] : ($subSlug === 'faculty' ? ' — Faculty Directory' : ($subSlug === 'laboratories' ? ' — Laboratories' : ($subSlug === 'library' ? ' — Department Library' : ''))));
      $shareUrl = baseUrl('department.php?dept=' . urlencode((string)$dept['slug']) . ($subSlug ? '&sub=' . urlencode((string)$subSlug) : ''));
      echo renderPhpSocialShareBar($pdo, $shareTitle, (string)($dept['overview'] ?? ''), $shareUrl, 'page', $deptShareable && $subShareable);
    ?>
  </section>
</div>

<div id="dept-lightbox" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,0.88);z-index:120;align-items:center;justify-content:center;padding:1.5rem;" onclick="if(event.target===this)this.style.display='none'">
  <div style="max-width:860px;width:100%;background:#fff;border-radius:12px;overflow:hidden;">
    <img id="dept-lightbox-img" src="" alt="" style="width:100%;max-height:70vh;object-fit:contain;background:#0f172a;display:block;">
    <div style="padding:0.85rem 1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;">
      <strong id="dept-lightbox-cap" style="font-size:0.9rem;"></strong>
      <button type="button" class="btn-primary" onclick="document.getElementById('dept-lightbox').style.display='none'">Close</button>
    </div>
  </div>
</div>
<script>
function openDeptLightbox(src, cap) {
  var box = document.getElementById('dept-lightbox');
  document.getElementById('dept-lightbox-img').src = src;
  document.getElementById('dept-lightbox-cap').textContent = cap || 'Department Photo';
  box.style.display = 'flex';
}
</script>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
