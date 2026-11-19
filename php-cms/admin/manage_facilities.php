<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('facilities');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$msg = '';
$err = '';

$categoryPresets = [
    'Infrastructural Facilities',
    'IT & Computing Facilities',
    'Student Facilities',
    'Research & Central Labs',
    'Library & Digital Resources',
    'Green & Barrier-Free Campus',
];

$decodeCustomFields = static function (?string $raw): array {
    $dec = json_decode((string)($raw ?? '[]'), true);
    if (!is_array($dec)) {
        return [];
    }
    $out = [];
    foreach ($dec as $row) {
        if (is_array($row) && trim((string)($row['label'] ?? '')) !== '') {
            $out[] = ['label' => trim((string)$row['label']), 'value' => trim((string)($row['value'] ?? ''))];
        }
    }
    return $out;
};

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = (string)($_POST['action'] ?? '');

    if ($action === 'save_portal_config') {
        $presetsRaw = trim((string)($_POST['custom_field_presets_csv'] ?? ''));
        $presetsArr = array_values(array_filter(array_map('trim', explode(',', $presetsRaw))));
        $cfg = [
            'heroBadge'          => trim((string)($_POST['hero_badge'] ?? '')),
            'heroTitle'          => trim((string)($_POST['hero_title'] ?? '')),
            'heroSubtitle'       => trim((string)($_POST['hero_subtitle'] ?? '')),
            'customFieldPresets' => $presetsArr,
        ];
        $pdo->prepare('INSERT INTO cms_kv_store (key_name, val_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)')
            ->execute(['facilities_portal_config', json_encode($cfg, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        logAudit($pdo, $user, 'UPDATE_FACILITIES_CONFIG', 'Facilities Portal', (string)$cfg['heroTitle']);
        $msg = 'Facilities portal header & preset settings saved.';
    } elseif ($action === 'save_facility') {
        $editId = (int)($_POST['edit_id'] ?? 0);
        $title = trim((string)($_POST['title'] ?? ''));
        $category = trim((string)($_POST['category'] ?? 'Infrastructural Facilities')) ?: 'Infrastructural Facilities';
        $shortSummary = trim((string)($_POST['short_summary'] ?? ''));
        $descHtml = (string)($_POST['description_html'] ?? '');
        $loc = trim((string)($_POST['location_block'] ?? ''));
        $cap = trim((string)($_POST['capacity'] ?? ''));
        $timings = trim((string)($_POST['timings'] ?? ''));
        $incName = trim((string)($_POST['incharge_name'] ?? ''));
        $incEmail = trim((string)($_POST['incharge_email'] ?? ''));
        $incPhone = trim((string)($_POST['incharge_phone'] ?? ''));
        $isFeat = !empty($_POST['is_featured']) ? 1 : 0;
        $isPub = !empty($_POST['is_published']) ? 1 : 0;
        $isShareable = !empty($_POST['is_shareable']) ? 1 : 0;
        $cfJson = json_encode($decodeCustomFields($_POST['custom_fields_json'] ?? '[]'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $imgUrl = trim((string)($_POST['existing_image'] ?? 'assets/images/campus_facilities.jpg'));
        if (!empty($_FILES['image_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['image_file'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $imgUrl = $up['file_url'];
        }
        $brochureUrl = trim((string)($_POST['brochure_url'] ?? ''));
        if ($err === '' && !empty($_FILES['brochure_file']['name'])) {
            $upB = handleCmsUpload($pdo, $_FILES['brochure_file'], __DIR__ . '/../uploads', 'document');
            if (!$upB['ok']) $err = $upB['error'];
            else $brochureUrl = $upB['file_url'];
        }

        if ($title === '') $err = 'Facility title is required.';
        if ($err === '') {
            $isSuper = cmsIsSuperAdmin($user);
            if ($editId > 0) {
                $currStmt = $pdo->prepare('SELECT * FROM facilities WHERE id = ? LIMIT 1');
                $currStmt->execute([$editId]);
                $curr = $currStmt->fetch();
                if (!$curr) {
                    $err = 'Facility record not found.';
                } else {
                    $payload = [
                        'title' => $title,
                        'category' => $category,
                        'short_summary' => $shortSummary,
                        'description_html' => $descHtml,
                        'location_block' => $loc,
                        'capacity' => $cap,
                        'timings' => $timings,
                        'incharge_name' => $incName,
                        'incharge_email' => $incEmail,
                        'incharge_phone' => $incPhone,
                        'image_url' => $imgUrl,
                        'brochure_url' => $brochureUrl,
                        'custom_fields_json' => $cfJson,
                        'is_featured' => $isFeat,
                        'is_published' => $isPub,
                        'is_shareable' => $isShareable,
                    ];
                    if ($isSuper) {
                        $pdo->prepare('UPDATE facilities SET title=?, category=?, short_summary=?, description_html=?, location_block=?, capacity=?, timings=?, incharge_name=?, incharge_email=?, incharge_phone=?, image_url=?, brochure_url=?, custom_fields_json=?, is_featured=?, is_published=?, is_shareable=?, status=? WHERE id=?')
                            ->execute([$title, $category, $shortSummary, $descHtml, $loc, $cap, $timings, $incName, $incEmail, $incPhone, $imgUrl, $brochureUrl, $cfJson, $isFeat, $isPub, $isShareable, 'published', $editId]);
                        logAudit($pdo, $user, 'SAVE_FACILITY', 'Campus Facility', $title);
                        $msg = 'Facility "' . $title . '" updated and published.';
                    } else {
                        cmsQueuePendingUpdate($pdo, $user, 'facilities', $editId, $title, $curr, $payload);
                        $msg = 'Changes to facility "' . $title . '" submitted for Super Admin approval. Existing live entry remains unchanged.';
                    }
                }
            } else {
                $ord = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM facilities')->fetchColumn()) + 1;
                $insPub = $isSuper ? $isPub : 0;
                $insStatus = $isSuper ? 'published' : 'pending_approval';
                $pdo->prepare('INSERT INTO facilities (title, category, short_summary, description_html, location_block, capacity, timings, incharge_name, incharge_email, incharge_phone, image_url, brochure_url, custom_fields_json, is_featured, is_published, is_shareable, sort_order, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
                    ->execute([$title, $category, $shortSummary, $descHtml, $loc, $cap, $timings, $incName, $incEmail, $incPhone, $imgUrl, $brochureUrl, $cfJson, $isFeat, $insPub, $isShareable, $ord, $insStatus]);
                $newId = (int)$pdo->lastInsertId();
                if ($isSuper) {
                    logAudit($pdo, $user, 'SAVE_FACILITY', 'Campus Facility', $title);
                    $msg = 'Facility "' . $title . '" added and published.';
                } else {
                    cmsQueuePendingCreate($pdo, $user, 'facilities', $newId, $title, [
                        'title' => $title,
                        'category' => $category,
                        'short_summary' => $shortSummary,
                        'description_html' => $descHtml,
                        'location_block' => $loc,
                        'capacity' => $cap,
                        'timings' => $timings,
                        'incharge_name' => $incName,
                        'incharge_email' => $incEmail,
                        'incharge_phone' => $incPhone,
                        'image_url' => $imgUrl,
                        'brochure_url' => $brochureUrl,
                        'custom_fields_json' => $cfJson,
                        'is_featured' => $isFeat,
                        'is_published' => $isPub,
                        'is_shareable' => $isShareable,
                        'sort_order' => $ord,
                        'status' => 'pending_approval',
                    ]);
                    $msg = 'New facility "' . $title . '" submitted for Super Admin approval before going live.';
                }
            }
        }
    } elseif ($action === 'move_facility' && !empty($_POST['id'])) {
        swapSortOrder($pdo, 'facilities', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up');
        $msg = 'Facility display order updated.';
    } elseif ($action === 'delete_facility' && !empty($_POST['id'])) {
        $delId = (int)$_POST['id'];
        $currStmt = $pdo->prepare('SELECT * FROM facilities WHERE id = ? LIMIT 1');
        $currStmt->execute([$delId]);
        $curr = $currStmt->fetch();
        if (!$curr) {
            $err = 'Facility record not found.';
        } elseif (cmsIsSuperAdmin($user)) {
            $pdo->prepare('DELETE FROM facilities WHERE id = ?')->execute([$delId]);
            logAudit($pdo, $user, 'DELETE_FACILITY', 'Campus Facility', (string)($curr['title'] ?? '#' . $delId));
            $msg = 'Facility deleted.';
        } else {
            cmsQueuePendingDelete($pdo, $user, 'facilities', $delId, (string)($curr['title'] ?? 'Facility #' . $delId), $curr);
            $msg = 'Delete request for facility "' . ($curr['title'] ?? '#' . $delId) . '" submitted for Super Admin approval.';
        }
    }
}

$cfg = [
    'heroBadge'          => 'Institutional Infrastructure, IT & Student Support Campus',
    'heroTitle'          => 'Campus Facilities & Infrastructure Showcase',
    'heroSubtitle'       => 'Explore AICTE/UGC-compliant smart lecture theatres, 1 Gbps campus computing backbone, central library, hostels, research centres, green solar microgrids, and barrier-free student amenities.',
    'customFieldPresets' => ['Area (Sq. Ft.)', 'Equipment Highlights', 'Accessibility / Divyangjan Support', 'Power & Safety Compliance'],
];
try {
    $kv = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'facilities_portal_config' LIMIT 1");
    $kv->execute();
    $dec = json_decode((string)$kv->fetchColumn(), true);
    if (is_array($dec)) {
        $cfg = array_merge($cfg, $dec);
    }
} catch (Throwable $ignored) {
}

$editingFac = null;
if (!empty($_GET['edit_id'])) {
    $s = $pdo->prepare('SELECT * FROM facilities WHERE id = ? LIMIT 1');
    $s->execute([(int)$_GET['edit_id']]);
    $editingFac = $s->fetch() ?: null;
}

$items = $pdo->query('SELECT * FROM facilities ORDER BY sort_order ASC, id ASC')->fetchAll();
$catOptions = $categoryPresets;
foreach ($items as $it) {
    $c = (string)($it['category'] ?? '');
    if ($c !== '' && !in_array($c, $catOptions, true)) {
        $catOptions[] = $c;
    }
}
$initCustomFields = $editingFac ? $decodeCustomFields((string)($editingFac['custom_fields_json'] ?? '[]')) : [];

$adminPageTitle = 'Campus Facilities & Custom Specifications';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="admin-subtabs" style="align-items:center;">
  <span style="font-weight:700;font-size:0.86rem;">Manage Facilities (<?= count($items) ?> items)</span>
  <a href="<?= e(baseUrl('facilities.php')) ?>" target="_blank" class="btn-outline btn-sm" style="margin-left:auto;">Open Public Facilities Showcase &rarr;</a>
</div>

<!-- Portal Config -->
<form method="post" class="card" style="margin-bottom:1.25rem;">
  <h2 style="margin-top:0;">Facilities Portal Hero &amp; Custom Field Presets</h2>
  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
  <input type="hidden" name="action" value="save_portal_config">
  <div class="grid-3" style="margin-bottom:0.65rem;">
    <label style="font-size:0.82rem;font-weight:600;">Badge<input type="text" name="hero_badge" value="<?= e((string)$cfg['heroBadge']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">Portal Title<input type="text" name="hero_title" value="<?= e((string)$cfg['heroTitle']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">Custom Field Presets (comma-separated)<input type="text" name="custom_field_presets_csv" value="<?= e(implode(', ', (array)($cfg['customFieldPresets'] ?? []))) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
  </div>
  <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Hero Subtitle
    <textarea name="hero_subtitle" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"><?= e((string)$cfg['heroSubtitle']) ?></textarea>
  </label>
  <button type="submit" class="btn-outline btn-sm">Save Header Configuration</button>
</form>

<!-- Add / Edit Facility Form -->
<form method="post" enctype="multipart/form-data" id="fac-item-form" class="card" style="margin-bottom:1.25rem;">
  <h2 style="margin-top:0;"><?= $editingFac ? 'Edit Facility: ' . e($editingFac['title']) : 'Add New Campus Facility' ?></h2>
  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
  <input type="hidden" name="action" value="save_facility">
  <input type="hidden" name="edit_id" value="<?= (int)($editingFac['id'] ?? 0) ?>">
  <input type="hidden" name="existing_image" value="<?= e((string)($editingFac['image_url'] ?? 'assets/images/campus_facilities.jpg')) ?>">
  <input type="hidden" name="custom_fields_json" id="fac_cf_json">

  <div class="grid-3" style="margin-bottom:0.65rem;">
    <label style="font-size:0.82rem;font-weight:600;">Facility Title *<input type="text" name="title" required value="<?= e((string)($editingFac['title'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">Facility Category (Custom Enabled) *
      <select name="category" data-custom-select="1" style="width:100%;padding:0.45rem;margin-top:3px;">
        <?php foreach ($catOptions as $co): ?>
          <option value="<?= e($co) ?>" <?= ($editingFac['category'] ?? 'Infrastructural Facilities') === $co ? 'selected' : '' ?>><?= e($co) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Location / Building Block<input type="text" name="location_block" value="<?= e((string)($editingFac['location_block'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">Capacity / Scale<input type="text" name="capacity" value="<?= e((string)($editingFac['capacity'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">Timings / Access Hours<input type="text" name="timings" value="<?= e((string)($editingFac['timings'] ?? '8:00 AM – 6:30 PM')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">Facility In-Charge Name<input type="text" name="incharge_name" value="<?= e((string)($editingFac['incharge_name'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">In-Charge Email<input type="email" name="incharge_email" value="<?= e((string)($editingFac['incharge_email'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">In-Charge Phone<input type="text" name="incharge_phone" value="<?= e((string)($editingFac['incharge_phone'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">Facility Photo (16:9)<input type="file" name="image_file" accept="image/*" style="width:100%;margin-top:3px;"></label>
  </div>

  <div class="grid-2" style="margin-bottom:0.65rem;">
    <label style="font-size:0.82rem;font-weight:600;">Brochure / SOP PDF URL (optional)<input type="text" name="brochure_url" value="<?= e((string)($editingFac['brochure_url'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <label style="font-size:0.82rem;font-weight:600;">Or Upload Brochure PDF<input type="file" name="brochure_file" accept=".pdf" style="width:100%;margin-top:3px;"></label>
  </div>

  <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.6rem;">Short Executive Summary
    <input type="text" name="short_summary" value="<?= e((string)($editingFac['short_summary'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
  </label>

  <div style="margin-bottom:0.75rem;">
    <strong style="display:block;font-size:0.82rem;margin-bottom:0.3rem;">Detailed Facility Description (Visual Editor)</strong>
    <textarea name="description_html" class="rich-editor" data-csrf="<?= e(csrfToken()) ?>"><?= e((string)($editingFac['description_html'] ?? '<p>Describe equipment, infrastructure capacity, and student benefits here.</p>')) ?></textarea>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
    <strong style="font-size:0.84rem;">Custom Facility Fields / Specifications</strong>
    <button type="button" class="btn-outline btn-sm" onclick="addFacCf()">+ Add Custom Specification</button>
  </div>
  <div id="fac-cf-list" style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.75rem;"></div>

  <div style="display:flex;gap:1.25rem;flex-wrap:wrap;margin-bottom:0.75rem;font-size:0.84rem;font-weight:600;">
    <label><input type="checkbox" name="is_published" value="1" <?= (!isset($editingFac['is_published']) || !empty($editingFac['is_published'])) ? 'checked' : '' ?>> Published</label>
    <label><input type="checkbox" name="is_featured" value="1" <?= !empty($editingFac['is_featured']) ? 'checked' : '' ?>> Highlight as Featured</label>
    <label><input type="checkbox" name="is_shareable" value="1" <?= (!isset($editingFac) || !array_key_exists('is_shareable', (array)$editingFac) || !empty($editingFac['is_shareable'])) ? 'checked' : '' ?>> Enable Social Share Buttons</label>
  </div>

  <div style="display:flex;gap:0.6rem;">
    <button type="submit" class="btn-primary"><?= $editingFac ? 'Update Facility' : 'Save Campus Facility' ?></button>
    <?php if ($editingFac): ?><a href="manage_facilities.php" class="btn-outline">Cancel Editing</a><?php endif; ?>
  </div>
</form>

<script>
  (function(){
    var cfs = <?= json_encode($initCustomFields, JSON_UNESCAPED_SLASHES) ?>;
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
    window.renderFacCf = function(){
      document.getElementById('fac-cf-list').innerHTML = cfs.map(function(c,i){
        return '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;">' +
          '<input type="text" placeholder="Field Name (e.g. Area Sq. Ft.)" value="'+esc(c.label)+'" oninput="window._facCfs['+i+'].label=this.value" style="padding:5px;border:1px solid #D6D3D1;border-radius:6px;">' +
          '<input type="text" placeholder="Value" value="'+esc(c.value)+'" oninput="window._facCfs['+i+'].value=this.value" style="padding:5px;border:1px solid #D6D3D1;border-radius:6px;">' +
          '<button type="button" class="btn-danger btn-sm" onclick="window._facCfs.splice('+i+',1);window.renderFacCf()">&times;</button></div>';
      }).join('');
    };
    window._facCfs = cfs;
    window.addFacCf = function(){ cfs.push({label:'',value:''}); window.renderFacCf(); };
    window.renderFacCf();
    document.getElementById('fac-item-form').addEventListener('submit', function(){
      document.getElementById('fac_cf_json').value = JSON.stringify(cfs);
    });
  })();
</script>

<!-- Existing Facilities List -->
<div class="card">
  <h2 style="margin-top:0;">Existing Campus Facilities (<?= count($items) ?>)</h2>
  <?php foreach ($items as $it): ?>
    <div class="admin-list-row">
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <img src="<?= e(mediaUrl((string)$it['image_url'], 'assets/images/campus_facilities.jpg')) ?>" alt="" style="width:68px;height:46px;object-fit:cover;border-radius:8px;">
        <div>
          <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
            <strong><?= e($it['title']) ?></strong>
            <?= cmsModerationStatusBadge((string)($it['status'] ?? 'published')) ?>
          </div>
          <div style="font-size:0.78rem;color:#78716C;"><?= e($it['category']) ?> · <?= e((string)$it['location_block']) ?> · <?= !empty($it['is_published']) ? 'Published' : 'Draft' ?><?= isset($it['is_shareable']) && empty($it['is_shareable']) ? ' · Share Off' : '' ?></div>
        </div>
      </div>
      <div style="display:flex;gap:0.4rem;">
        <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_facility"><input type="hidden" name="id" value="<?= (int)$it['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
        <a href="?edit_id=<?= (int)$it['id'] ?>" class="btn-primary btn-sm">Edit</a>
        <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_facility"><input type="hidden" name="id" value="<?= (int)$it['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
      </div>
    </div>
  <?php endforeach; ?>
</div>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
