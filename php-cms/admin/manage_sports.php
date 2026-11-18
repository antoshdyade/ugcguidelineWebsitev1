<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('sports');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$msg = '';
$err = '';
$tab = (string)($_GET['tab'] ?? 'config');
if (!in_array($tab, ['config', 'facilities', 'events', 'achievements', 'gallery', 'notices'], true)) {
    $tab = 'config';
}

$kvGetLocal = static function (string $key, array $default) use ($pdo): array {
    try {
        $s = $pdo->prepare('SELECT val_json FROM cms_kv_store WHERE key_name = ? LIMIT 1');
        $s->execute([$key]);
        $dec = json_decode((string)$s->fetchColumn(), true);
        return is_array($dec) ? array_merge($default, $dec) : $default;
    } catch (Throwable $ignored) {
        return $default;
    }
};

$kvSetLocal = static function (string $key, array $val) use ($pdo): void {
    $pdo->prepare('INSERT INTO cms_kv_store (key_name, val_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)')
        ->execute([$key, json_encode($val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
};

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

    if ($action === 'save_sports_config') {
        $tab = 'config';
        $cfg = [
            'heroBadge'          => trim((string)($_POST['hero_badge'] ?? '')),
            'heroTitle'          => trim((string)($_POST['hero_title'] ?? '')),
            'heroSubtitle'       => trim((string)($_POST['hero_subtitle'] ?? '')),
            'directorName'       => trim((string)($_POST['director_name'] ?? '')),
            'directorTitle'      => trim((string)($_POST['director_title'] ?? '')),
            'directorEmail'      => trim((string)($_POST['director_email'] ?? '')),
            'directorPhone'      => trim((string)($_POST['director_phone'] ?? '')),
            'gymkhanaTimings'    => trim((string)($_POST['gymkhana_timings'] ?? '')),
            'annualFlagshipName' => trim((string)($_POST['annual_flagship_name'] ?? '')),
            'customFields'       => $decodeCustomFields($_POST['config_custom_fields_json'] ?? '[]'),
        ];
        $kvSetLocal('sports_portal_config', $cfg);
        logAudit($pdo, $user, 'UPDATE_SPORTS_CONFIG', 'Sports Portal', (string)$cfg['heroTitle']);
        $msg = 'Sports Directorate configuration & custom fields saved.';
    } elseif ($action === 'save_facility') {
        $tab = 'facilities';
        $editId = (int)($_POST['edit_id'] ?? 0);
        $name = trim((string)($_POST['name'] ?? ''));
        $ftype = trim((string)($_POST['facility_type'] ?? 'Outdoor Ground / Track')) ?: 'Outdoor Ground / Track';
        $dim = trim((string)($_POST['dimensions_or_capacity'] ?? ''));
        $timings = trim((string)($_POST['timings'] ?? ''));
        $incharge = trim((string)($_POST['incharge_name'] ?? ''));
        $desc = trim((string)($_POST['description'] ?? ''));
        $isPub = !empty($_POST['is_published']) ? 1 : 0;
        $cfJson = json_encode($decodeCustomFields($_POST['custom_fields_json'] ?? '[]'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $imgUrl = trim((string)($_POST['existing_image'] ?? 'assets/images/sports_complex.jpg'));
        if (!empty($_FILES['image_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['image_file'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $imgUrl = $up['file_url'];
        }
        if ($name === '') $err = 'Sports facility name is required.';
        if ($err === '') {
            if ($editId > 0) {
                $pdo->prepare('UPDATE sports_facilities SET name=?, facility_type=?, dimensions_or_capacity=?, timings=?, incharge_name=?, description=?, image_url=?, custom_fields_json=?, is_published=? WHERE id=?')
                    ->execute([$name, $ftype, $dim, $timings, $incharge, $desc, $imgUrl, $cfJson, $isPub, $editId]);
                $msg = 'Sports facility updated.';
            } else {
                $ord = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM sports_facilities')->fetchColumn()) + 1;
                $pdo->prepare('INSERT INTO sports_facilities (name, facility_type, dimensions_or_capacity, timings, incharge_name, description, image_url, custom_fields_json, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)')
                    ->execute([$name, $ftype, $dim, $timings, $incharge, $desc, $imgUrl, $cfJson, $isPub, $ord]);
                $msg = 'Sports facility added.';
            }
            logAudit($pdo, $user, 'SAVE_SPORTS_FACILITY', 'Sports', $name);
        }
    } elseif ($action === 'move_facility' && !empty($_POST['id'])) {
        $tab = 'facilities';
        swapSortOrder($pdo, 'sports_facilities', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up');
        $msg = 'Sports facility order updated.';
    } elseif ($action === 'delete_facility' && !empty($_POST['id'])) {
        $tab = 'facilities';
        $pdo->prepare('DELETE FROM sports_facilities WHERE id = ?')->execute([(int)$_POST['id']]);
        logAudit($pdo, $user, 'DELETE_SPORTS_FACILITY', 'Sports', '#' . (int)$_POST['id']);
        $msg = 'Sports facility deleted.';
    } elseif ($action === 'save_event') {
        $tab = 'events';
        $editId = (int)($_POST['edit_id'] ?? 0);
        $title = trim((string)($_POST['title'] ?? ''));
        $etype = trim((string)($_POST['event_type'] ?? 'Annual Sports Meet'));
        $disc = trim((string)($_POST['discipline'] ?? 'Multi-Sport'));
        $edate = trim((string)($_POST['event_date'] ?? date('Y-m-d')));
        $venue = trim((string)($_POST['venue'] ?? 'Campus Ground'));
        $org = trim((string)($_POST['organizer'] ?? 'Sports Cell'));
        $status = in_array($_POST['status'] ?? 'Upcoming', ['Upcoming', 'Registrations Open', 'Completed'], true) ? (string)$_POST['status'] : 'Upcoming';
        $regUrl = trim((string)($_POST['registration_url'] ?? ''));
        $desc = trim((string)($_POST['description'] ?? ''));
        $isPub = !empty($_POST['is_published']) ? 1 : 0;
        $banner = trim((string)($_POST['existing_banner'] ?? 'assets/images/sports_complex.jpg'));
        if (!empty($_FILES['banner_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['banner_file'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $banner = $up['file_url'];
        }
        if ($title === '') $err = 'Event title is required.';
        if ($err === '') {
            if ($editId > 0) {
                $pdo->prepare('UPDATE sports_events SET title=?, event_type=?, discipline=?, event_date=?, venue=?, organizer=?, status=?, registration_url=?, description=?, banner_url=?, is_published=? WHERE id=?')
                    ->execute([$title, $etype, $disc, $edate, $venue, $org, $status, $regUrl, $desc, $banner, $isPub, $editId]);
                $msg = 'Sports event updated.';
            } else {
                $ord = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM sports_events')->fetchColumn()) + 1;
                $pdo->prepare('INSERT INTO sports_events (title, event_type, discipline, event_date, venue, organizer, status, registration_url, description, banner_url, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                    ->execute([$title, $etype, $disc, $edate, $venue, $org, $status, $regUrl, $desc, $banner, $isPub, $ord]);
                $msg = 'Sports event added.';
            }
            logAudit($pdo, $user, 'SAVE_SPORTS_EVENT', 'Sports Event', $title);
        }
    } elseif ($action === 'delete_event' && !empty($_POST['id'])) {
        $tab = 'events';
        $pdo->prepare('DELETE FROM sports_events WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Sports event deleted.';
    } elseif ($action === 'save_achievement') {
        $tab = 'achievements';
        $editId = (int)($_POST['edit_id'] ?? 0);
        $name = trim((string)($_POST['student_or_team_name'] ?? ''));
        $dept = trim((string)($_POST['department_code'] ?? 'CSE'));
        $batch = trim((string)($_POST['batch_year'] ?? date('Y')));
        $sport = trim((string)($_POST['sport_name'] ?? 'Athletics'));
        $level = in_array($_POST['level'] ?? 'State', ['University', 'State', 'National', 'International', 'Zonal / Intercollegiate'], true) ? (string)$_POST['level'] : 'State';
        $medal = trim((string)($_POST['medal_or_rank'] ?? 'Gold Medal'));
        $evName = trim((string)($_POST['event_name'] ?? ''));
        $evDate = trim((string)($_POST['event_date'] ?? date('Y-m-d')));
        $high = trim((string)($_POST['highlights'] ?? ''));
        $isFeat = !empty($_POST['is_featured']) ? 1 : 0;
        $photo = trim((string)($_POST['existing_photo'] ?? 'assets/images/principal.jpg'));
        if (!empty($_FILES['photo_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['photo_file'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $photo = $up['file_url'];
        }
        if ($name === '' || $evName === '') $err = 'Student/Team name and Event name are required.';
        if ($err === '') {
            if ($editId > 0) {
                $pdo->prepare('UPDATE sports_achievements SET student_or_team_name=?, department_code=?, batch_year=?, sport_name=?, level=?, medal_or_rank=?, event_name=?, event_date=?, photo_url=?, highlights=?, is_featured=? WHERE id=?')
                    ->execute([$name, $dept, $batch, $sport, $level, $medal, $evName, $evDate, $photo, $high, $isFeat, $editId]);
                $msg = 'Achievement updated.';
            } else {
                $ord = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM sports_achievements')->fetchColumn()) + 1;
                $pdo->prepare('INSERT INTO sports_achievements (student_or_team_name, department_code, batch_year, sport_name, level, medal_or_rank, event_name, event_date, photo_url, highlights, is_featured, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                    ->execute([$name, $dept, $batch, $sport, $level, $medal, $evName, $evDate, $photo, $high, $isFeat, $ord]);
                $msg = 'Sports achievement added.';
            }
            logAudit($pdo, $user, 'SAVE_SPORTS_ACHIEVEMENT', 'Sports Achievement', $name);
        }
    } elseif ($action === 'delete_achievement' && !empty($_POST['id'])) {
        $tab = 'achievements';
        $pdo->prepare('DELETE FROM sports_achievements WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Sports achievement removed.';
    } elseif ($action === 'save_gallery') {
        $tab = 'gallery';
        $title = trim((string)($_POST['title'] ?? ''));
        $mtype = ($_POST['media_type'] ?? 'Photo') === 'Video' ? 'Video' : 'Photo';
        $cat = trim((string)($_POST['category'] ?? 'Annual Sports Meet'));
        $edate = trim((string)($_POST['event_date'] ?? date('Y-m-d')));
        $cap = trim((string)($_POST['caption'] ?? ''));
        $mediaUrl = trim((string)($_POST['media_url'] ?? ''));
        if (!empty($_FILES['media_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['media_file'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $mediaUrl = $up['file_url'];
        }
        if ($title === '' || $mediaUrl === '') $err = 'Title and Photo/Video URL or Upload are required.';
        if ($err === '') {
            $ord = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM sports_gallery')->fetchColumn()) + 1;
            $pdo->prepare('INSERT INTO sports_gallery (title, media_type, category, media_url, thumbnail_url, event_date, caption, is_published, sort_order) VALUES (?,?,?,?,?,?,?,1,?)')
                ->execute([$title, $mtype, $cat, $mediaUrl, $mediaUrl, $edate, $cap, $ord]);
            logAudit($pdo, $user, 'ADD_SPORTS_MEDIA', 'Sports Gallery', $title);
            $msg = 'Sports gallery item added.';
        }
    } elseif ($action === 'delete_gallery' && !empty($_POST['id'])) {
        $tab = 'gallery';
        $pdo->prepare('DELETE FROM sports_gallery WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Gallery item deleted.';
    } elseif ($action === 'save_notice') {
        $tab = 'notices';
        $title = trim((string)($_POST['title'] ?? ''));
        $ndate = trim((string)($_POST['notice_date'] ?? date('Y-m-d')));
        $cat = trim((string)($_POST['category'] ?? 'Trials & Selection'));
        $summary = trim((string)($_POST['summary'] ?? ''));
        $regLink = trim((string)($_POST['registration_link'] ?? ''));
        $attachUrl = trim((string)($_POST['attachment_url'] ?? ''));
        $isPinned = !empty($_POST['is_pinned']) ? 1 : 0;
        if (!empty($_FILES['notice_pdf']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['notice_pdf'], __DIR__ . '/../uploads', 'document');
            if (!$up['ok']) $err = $up['error'];
            else $attachUrl = $up['file_url'];
        }
        if ($title === '') $err = 'Notice title is required.';
        if ($err === '') {
            $ord = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM sports_notices')->fetchColumn()) + 1;
            $pdo->prepare('INSERT INTO sports_notices (title, notice_date, category, summary, attachment_url, registration_link, is_pinned, is_published, sort_order) VALUES (?,?,?,?,?,?,?,1,?)')
                ->execute([$title, $ndate, $cat, $summary, $attachUrl, $regLink, $isPinned, $ord]);
            logAudit($pdo, $user, 'ADD_SPORTS_NOTICE', 'Sports Notice', $title);
            $msg = 'Sports notice published.';
        }
    } elseif ($action === 'delete_notice' && !empty($_POST['id'])) {
        $tab = 'notices';
        $pdo->prepare('DELETE FROM sports_notices WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Sports notice deleted.';
    }
}

$cfg = $kvGetLocal('sports_portal_config', [
    'heroBadge'          => 'Student Life · Directorate of Physical Education & Sports',
    'heroTitle'          => 'Athletics, Indoor Courts, Fitness & Sports Portal',
    'heroSubtitle'       => '',
    'directorName'       => 'Prof. R. S. Jadhav',
    'directorTitle'      => 'Director of Physical Education & Sports',
    'directorEmail'      => 'sports@coe.sveri.ac.in',
    'directorPhone'      => '+91-02186-216063',
    'gymkhanaTimings'    => '6:00 AM – 8:30 AM & 4:30 PM – 8:00 PM',
    'annualFlagshipName' => 'SVERI Krida Mahotsav',
    'customFields'       => [],
]);
$facilities = $pdo->query('SELECT * FROM sports_facilities ORDER BY sort_order ASC, id ASC')->fetchAll();
$events     = $pdo->query('SELECT * FROM sports_events ORDER BY sort_order ASC, id DESC')->fetchAll();
$achievs    = $pdo->query('SELECT * FROM sports_achievements ORDER BY sort_order ASC, id DESC')->fetchAll();
$gallery    = $pdo->query('SELECT * FROM sports_gallery ORDER BY sort_order ASC, id DESC')->fetchAll();
$notices    = $pdo->query('SELECT * FROM sports_notices ORDER BY is_pinned DESC, sort_order ASC, id DESC')->fetchAll();

$adminPageTitle = 'Sports & Gymkhana Admin';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="admin-subtabs">
  <a href="?tab=config" class="admin-subtab <?= $tab === 'config' ? 'is-active' : '' ?>">Directorate &amp; Custom Fields</a>
  <a href="?tab=facilities" class="admin-subtab <?= $tab === 'facilities' ? 'is-active' : '' ?>">Facilities (<?= count($facilities) ?>)</a>
  <a href="?tab=events" class="admin-subtab <?= $tab === 'events' ? 'is-active' : '' ?>">Events &amp; Tournaments (<?= count($events) ?>)</a>
  <a href="?tab=achievements" class="admin-subtab <?= $tab === 'achievements' ? 'is-active' : '' ?>">Achievements (<?= count($achievs) ?>)</a>
  <a href="?tab=gallery" class="admin-subtab <?= $tab === 'gallery' ? 'is-active' : '' ?>">Photo/Video Gallery (<?= count($gallery) ?>)</a>
  <a href="?tab=notices" class="admin-subtab <?= $tab === 'notices' ? 'is-active' : '' ?>">Notices &amp; Trials (<?= count($notices) ?>)</a>
  <a href="<?= e(baseUrl('sports.php')) ?>" target="_blank" class="btn-outline btn-sm" style="margin-left:auto;">Open Public Sports Portal &rarr;</a>
</div>

<?php if ($tab === 'config'): ?>
  <form method="post" id="sp-cfg-form" class="card">
    <h2 style="margin-top:0;">Sports Portal Configuration &amp; Custom Fields</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_sports_config">
    <input type="hidden" name="config_custom_fields_json" id="sp_cfg_cf_json">
    <div class="grid-2" style="margin-bottom:0.75rem;">
      <label style="font-size:0.82rem;font-weight:600;">Portal Badge<input type="text" name="hero_badge" value="<?= e((string)$cfg['heroBadge']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Hero Title<input type="text" name="hero_title" value="<?= e((string)$cfg['heroTitle']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Physical Director Name<input type="text" name="director_name" value="<?= e((string)$cfg['directorName']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Director Title<input type="text" name="director_title" value="<?= e((string)$cfg['directorTitle']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Director Email<input type="email" name="director_email" value="<?= e((string)$cfg['directorEmail']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Director Phone<input type="text" name="director_phone" value="<?= e((string)$cfg['directorPhone']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Gymkhana Timings<input type="text" name="gymkhana_timings" value="<?= e((string)$cfg['gymkhanaTimings']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Annual Flagship Meet<input type="text" name="annual_flagship_name" value="<?= e((string)$cfg['annualFlagshipName']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    </div>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.75rem;">Hero Subtitle
      <textarea name="hero_subtitle" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"><?= e((string)$cfg['heroSubtitle']) ?></textarea>
    </label>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
      <strong style="font-size:0.84rem;">Custom Metadata Fields</strong>
      <button type="button" class="btn-outline btn-sm" onclick="addCfgCf()">+ Add Custom Field</button>
    </div>
    <div id="sp-cfg-cf-list" style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.85rem;"></div>
    <button type="submit" class="btn-primary">Save Sports Settings</button>
  </form>
  <script>
    (function(){
      var cfs = <?= json_encode($cfg['customFields'] ?? [], JSON_UNESCAPED_SLASHES) ?>;
      function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
      window.renderCfgCf = function(){
        document.getElementById('sp-cfg-cf-list').innerHTML = cfs.map(function(c,i){
          return '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;">' +
            '<input type="text" placeholder="Label" value="'+esc(c.label)+'" oninput="window._spCfgCfs['+i+'].label=this.value" style="padding:5px;border:1px solid #D6D3D1;border-radius:6px;">' +
            '<input type="text" placeholder="Value" value="'+esc(c.value)+'" oninput="window._spCfgCfs['+i+'].value=this.value" style="padding:5px;border:1px solid #D6D3D1;border-radius:6px;">' +
            '<button type="button" class="btn-danger btn-sm" onclick="window._spCfgCfs.splice('+i+',1);window.renderCfgCf()">&times;</button></div>';
        }).join('');
      };
      window._spCfgCfs = cfs;
      window.addCfgCf = function(){ cfs.push({label:'',value:''}); window.renderCfgCf(); };
      window.renderCfgCf();
      document.getElementById('sp-cfg-form').addEventListener('submit', function(){
        document.getElementById('sp_cfg_cf_json').value = JSON.stringify(cfs);
      });
    })();
  </script>

<?php elseif ($tab === 'facilities'): ?>
  <form method="post" enctype="multipart/form-data" id="sp-fac-form" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Add Sports Facility (Indoor / Outdoor / Fitness)</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_facility">
    <input type="hidden" name="custom_fields_json" id="sp_fac_cf_json">
    <div class="grid-3" style="margin-bottom:0.65rem;">
      <label style="font-size:0.82rem;font-weight:600;">Facility Name *<input type="text" name="name" required style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Facility Type<input type="text" name="facility_type" value="Outdoor Ground / Track" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Dimensions / Capacity<input type="text" name="dimensions_or_capacity" placeholder="400m Track · 4 Courts" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Timings<input type="text" name="timings" value="6:00 AM – 8:00 PM" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">In-Charge Name<input type="text" name="incharge_name" value="Prof. R. S. Jadhav" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Photo (16:9)<input type="file" name="image_file" accept="image/*" style="width:100%;margin-top:3px;"></label>
    </div>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.55rem;">Description<textarea name="description" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"></textarea></label>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;">
      <strong style="font-size:0.82rem;">Custom Specifications (e.g. Surface, Floodlights)</strong>
      <button type="button" class="btn-outline btn-sm" onclick="addSpFacCf()">+ Add Custom Field</button>
    </div>
    <div id="sp-fac-cf-list" style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.65rem;"></div>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;"><input type="checkbox" name="is_published" value="1" checked> Published on Website</label>
    <button type="submit" class="btn-primary">Add Sports Facility</button>
  </form>
  <script>
    (function(){
      var cfs = [];
      function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
      window.renderSpFacCf = function(){
        document.getElementById('sp-fac-cf-list').innerHTML = cfs.map(function(c,i){
          return '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;">' +
            '<input type="text" placeholder="Field Label" value="'+esc(c.label)+'" oninput="window._spFacCfs['+i+'].label=this.value" style="padding:5px;border:1px solid #D6D3D1;border-radius:6px;">' +
            '<input type="text" placeholder="Field Value" value="'+esc(c.value)+'" oninput="window._spFacCfs['+i+'].value=this.value" style="padding:5px;border:1px solid #D6D3D1;border-radius:6px;">' +
            '<button type="button" class="btn-danger btn-sm" onclick="window._spFacCfs.splice('+i+',1);window.renderSpFacCf()">&times;</button></div>';
        }).join('');
      };
      window._spFacCfs = cfs;
      window.addSpFacCf = function(){ cfs.push({label:'',value:''}); window.renderSpFacCf(); };
      document.getElementById('sp-fac-form').addEventListener('submit', function(){
        document.getElementById('sp_fac_cf_json').value = JSON.stringify(cfs);
      });
    })();
  </script>
  <div class="card">
    <h2 style="margin-top:0;">Existing Sports Facilities (<?= count($facilities) ?>)</h2>
    <?php foreach ($facilities as $f): ?>
      <div class="admin-list-row">
        <div><strong><?= e($f['name']) ?></strong><div style="font-size:0.78rem;color:#78716C;"><?= e($f['facility_type']) ?> · <?= e((string)$f['dimensions_or_capacity']) ?> · <?= e((string)$f['timings']) ?></div></div>
        <div style="display:flex;gap:0.4rem;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_facility"><input type="hidden" name="id" value="<?= (int)$f['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_facility"><input type="hidden" name="id" value="<?= (int)$f['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($tab === 'events'): ?>
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Add Sports Activity / Tournament</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_event">
    <div class="grid-3" style="margin-bottom:0.65rem;">
      <label style="font-size:0.82rem;font-weight:600;">Event Title *<input type="text" name="title" required style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Event Type<input type="text" name="event_type" value="Intercollegiate Tournament" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Discipline(s)<input type="text" name="discipline" value="Cricket, Badminton & Athletics" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Event Date<input type="date" name="event_date" value="<?= date('Y-m-d') ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Venue<input type="text" name="venue" value="SVERI Athletic Stadium" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Status<select name="status" style="width:100%;padding:0.45rem;margin-top:3px;"><option>Upcoming</option><option>Registrations Open</option><option>Completed</option></select></label>
      <label style="font-size:0.82rem;font-weight:600;">Registration URL<input type="text" name="registration_url" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Organizer<input type="text" name="organizer" value="Student Gymkhana & Sports Cell" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Banner Photo<input type="file" name="banner_file" accept="image/*" style="width:100%;margin-top:3px;"></label>
    </div>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.55rem;">Description<textarea name="description" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"></textarea></label>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;"><input type="checkbox" name="is_published" value="1" checked> Published on Website</label>
    <button type="submit" class="btn-primary">Add Sports Event</button>
  </form>
  <div class="card">
    <h2 style="margin-top:0;">Sports Events (<?= count($events) ?>)</h2>
    <?php foreach ($events as $ev): ?>
      <div class="admin-list-row">
        <div><strong><?= e($ev['title']) ?></strong><div style="font-size:0.78rem;color:#78716C;"><?= e($ev['event_date']) ?> · <?= e($ev['event_type']) ?> · <?= e($ev['status']) ?></div></div>
        <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_event"><input type="hidden" name="id" value="<?= (int)$ev['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($tab === 'achievements'): ?>
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Record Student Sports Achievement</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_achievement">
    <div class="grid-3" style="margin-bottom:0.65rem;">
      <label style="font-size:0.82rem;font-weight:600;">Student / Team Name *<input type="text" name="student_or_team_name" required style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Department Code<input type="text" name="department_code" value="CSE" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Batch Year<input type="text" name="batch_year" value="2026" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Sport<input type="text" name="sport_name" required style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Competition Level<select name="level" style="width:100%;padding:0.45rem;margin-top:3px;"><option>University</option><option>State</option><option>National</option><option>International</option><option>Zonal / Intercollegiate</option></select></label>
      <label style="font-size:0.82rem;font-weight:600;">Medal / Rank *<input type="text" name="medal_or_rank" value="Gold Medal" required style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Event Name *<input type="text" name="event_name" required style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Date<input type="date" name="event_date" value="<?= date('Y-m-d') ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Photo (1:1)<input type="file" name="photo_file" accept="image/*" style="width:100%;margin-top:3px;"></label>
    </div>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Highlights<textarea name="highlights" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"></textarea></label>
    <button type="submit" class="btn-primary">Add Student Achievement</button>
  </form>
  <div class="card">
    <h2 style="margin-top:0;">Student Sports Medalists (<?= count($achievs) ?>)</h2>
    <?php foreach ($achievs as $ac): ?>
      <div class="admin-list-row">
        <div><strong><?= e($ac['student_or_team_name']) ?> (<?= e($ac['sport_name']) ?>)</strong><div style="font-size:0.78rem;color:#78716C;"><?= e($ac['level']) ?> · <?= e($ac['medal_or_rank']) ?> · <?= e($ac['event_name']) ?></div></div>
        <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_achievement"><input type="hidden" name="id" value="<?= (int)$ac['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($tab === 'gallery'): ?>
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Add Photo or Video to Sports Gallery</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_gallery">
    <div class="grid-3" style="margin-bottom:0.65rem;">
      <label style="font-size:0.82rem;font-weight:600;">Title *<input type="text" name="title" required style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Media Type<select name="media_type" style="width:100%;padding:0.45rem;margin-top:3px;"><option>Photo</option><option>Video</option></select></label>
      <label style="font-size:0.82rem;font-weight:600;">Category<input type="text" name="category" value="Annual Sports Meet" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Image/YouTube Video URL<input type="text" name="media_url" placeholder="https://youtube.com/... or assets/images/..." style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Or Upload Photo<input type="file" name="media_file" accept="image/*" style="width:100%;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Date<input type="date" name="event_date" value="<?= date('Y-m-d') ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    </div>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Caption<input type="text" name="caption" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
    <button type="submit" class="btn-primary">Add Gallery Item</button>
  </form>
  <div class="card">
    <h2 style="margin-top:0;">Sports Gallery (<?= count($gallery) ?>)</h2>
    <?php foreach ($gallery as $g): ?>
      <div class="admin-list-row">
        <div><strong><?= e($g['title']) ?></strong><div style="font-size:0.78rem;color:#78716C;"><?= e($g['media_type']) ?> · <?= e((string)$g['category']) ?> · <?= e((string)$g['event_date']) ?></div></div>
        <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_gallery"><input type="hidden" name="id" value="<?= (int)$g['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($tab === 'notices'): ?>
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Publish Sports Notice / Trials Circular</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_notice">
    <div class="grid-3" style="margin-bottom:0.65rem;">
      <label style="font-size:0.82rem;font-weight:600;">Notice Title *<input type="text" name="title" required style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Category<input type="text" name="category" value="Trials & Selection" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Notice Date<input type="date" name="notice_date" value="<?= date('Y-m-d') ?>" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Registration Link (optional)<input type="text" name="registration_link" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Attachment URL (optional)<input type="text" name="attachment_url" style="width:100%;padding:0.45rem;margin-top:3px;"></label>
      <label style="font-size:0.82rem;font-weight:600;">Or Upload PDF Circular<input type="file" name="notice_pdf" accept=".pdf" style="width:100%;margin-top:3px;"></label>
    </div>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.55rem;">Summary<textarea name="summary" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"></textarea></label>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;"><input type="checkbox" name="is_pinned" value="1"> Pin Notice at Top</label>
    <button type="submit" class="btn-primary">Publish Notice</button>
  </form>
  <div class="card">
    <h2 style="margin-top:0;">Sports Notices (<?= count($notices) ?>)</h2>
    <?php foreach ($notices as $nt): ?>
      <div class="admin-list-row">
        <div><strong><?= !empty($nt['is_pinned']) ? '[PINNED] ' : '' ?><?= e($nt['title']) ?></strong><div style="font-size:0.78rem;color:#78716C;"><?= e((string)$nt['category']) ?> · <?= e((string)$nt['notice_date']) ?></div></div>
        <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_notice"><input type="hidden" name="id" value="<?= (int)$nt['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
      </div>
    <?php endforeach; ?>
  </div>
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
