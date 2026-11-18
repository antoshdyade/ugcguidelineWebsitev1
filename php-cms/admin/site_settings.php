<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('settings');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$msg = '';
$err = '';
$s = getSiteSettings($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $logoUrl = $s['logo_url'] ?? '';
    if (!empty($_FILES['logo_file']['name'])) {
        $up = handleCmsUpload($pdo, $_FILES['logo_file'], __DIR__ . '/../uploads', 'photo');
        if ($up['ok']) $logoUrl = $up['file_url'];
        else $err = $up['error'];
    }
    $aboutImg = $s['about_image_url'] ?? 'assets/images/hero_campus.jpg';
    if (!empty($_FILES['about_image_file']['name'])) {
        $up = handleCmsUpload($pdo, $_FILES['about_image_file'], __DIR__ . '/../uploads', 'photo');
        if ($up['ok']) $aboutImg = $up['file_url'];
        else $err = $up['error'];
    }

    if ($err === '') {
        $homeSections = [
            'showTicker' => isset($_POST['sec_ticker']) ? 1 : 0,
            'showSlider' => isset($_POST['sec_slider']) ? 1 : 0,
            'showStatsAndRecognitions' => isset($_POST['sec_stats']) ? 1 : 0,
            'showAboutAndDownloads' => isset($_POST['sec_about']) ? 1 : 0,
            'showApprovedAndVision' => isset($_POST['sec_approved']) ? 1 : 0,
            'showLeadershipDesk' => isset($_POST['sec_leadership']) ? 1 : 0,
            'showExaminationSpotlight' => isset($_POST['sec_exam']) ? 1 : 0,
            'showDepartments' => isset($_POST['sec_departments']) ? 1 : 0,
            'showCategoriesDirectory' => isset($_POST['sec_categories']) ? 1 : 0,
            'showEventsAndRecruiters' => isset($_POST['sec_events']) ? 1 : 0,
            'examSpotlightTitle' => trim($_POST['exam_spotlight_title'] ?? 'Autonomous Examination Portal (CoE)'),
            'departmentsTitle' => trim($_POST['departments_title'] ?? 'Academic Departments'),
            'categoriesTitle' => trim($_POST['categories_title'] ?? 'Statutory Self-Disclosure & Autonomous Portals'),
        ];
        $statsRows = [];
        $statLabels = $_POST['stat_label'] ?? [];
        $statValues = $_POST['stat_value'] ?? [];
        foreach ($statLabels as $idx => $lbl) {
            $lbl = trim((string)$lbl);
            $val = trim((string)($statValues[$idx] ?? ''));
            if ($lbl !== '' && $val !== '') {
                $statsRows[] = ['label' => $lbl, 'value' => $val];
            }
        }

        $approvedBodiesRows = [];
        $abNames = $_POST['ab_name'] ?? [];
        $abSubtitles = $_POST['ab_subtitle'] ?? [];
        $abHrefs = $_POST['ab_href'] ?? [];
        foreach ($abNames as $idx => $abName) {
            $abName = trim((string)$abName);
            $abSub = trim((string)($abSubtitles[$idx] ?? ''));
            $abHref = trim((string)($abHrefs[$idx] ?? ''));
            if ($abName !== '') {
                $approvedBodiesRows[] = [
                    'name' => $abName,
                    'subtitle' => $abSub,
                    'href' => $abHref !== '' ? $abHref : 'page.php?slug=about-overview',
                ];
            }
        }

        $stmt = $pdo->prepare(
            'UPDATE site_settings SET trust_name = ?, institution_name = ?, short_code = ?, logo_url = ?, affiliation = ?, aicte_code = ?, dte_code = ?, address = ?, phone = ?, email = ?, emergency_helpline = ?, anti_ragging_helpline = ?, primary_color = ?, secondary_color = ?, about_summary = ?, about_image_url = ?, vision_text = ?, mission_text = ?, recruiters = ?, home_sections_json = ?, highlights_json = ?, approved_bodies_json = ? WHERE id = 1'
        );
        $stmt->execute([
            trim($_POST['trust_name']),
            trim($_POST['institution_name']),
            trim($_POST['short_code']),
            $logoUrl,
            trim($_POST['affiliation']),
            trim($_POST['aicte_code']),
            trim($_POST['dte_code']),
            trim($_POST['address']),
            trim($_POST['phone']),
            trim($_POST['email']),
            trim($_POST['emergency_helpline']),
            trim($_POST['anti_ragging_helpline']),
            trim($_POST['primary_color']),
            trim($_POST['secondary_color']),
            trim($_POST['about_summary']),
            $aboutImg,
            trim($_POST['vision_text']),
            trim($_POST['mission_text']),
            trim($_POST['recruiters']),
            json_encode($homeSections, JSON_UNESCAPED_UNICODE),
            json_encode($statsRows, JSON_UNESCAPED_UNICODE),
            json_encode($approvedBodiesRows, JSON_UNESCAPED_UNICODE),
        ]);
        $maxPhotoMb = max(0.25, min(25.0, (float)($_POST['max_photo_mb'] ?? ($s['max_photo_mb'] ?? 2.0))));
        $maxDocMb   = max(0.5, min(50.0, (float)($_POST['max_doc_mb'] ?? ($s['max_doc_mb'] ?? 10.0))));
        $autoCrop   = isset($_POST['auto_crop_enabled']) ? 1 : 0;
        $designPayload = [
            'design_preset' => trim((string)($_POST['design_preset'] ?? 'heritage-navy')),
            'font_heading'  => trim((string)($_POST['font_heading'] ?? "'Playfair Display', Georgia, serif")),
            'font_body'     => trim((string)($_POST['font_body'] ?? "'Plus Jakarta Sans', system-ui, sans-serif")),
            'card_radius'   => in_array($_POST['card_radius'] ?? 'rounded', ['sharp', 'rounded', 'soft'], true) ? $_POST['card_radius'] : 'rounded',
            'header_style'  => ($_POST['header_style'] ?? 'classic') === 'compact' ? 'compact' : 'classic',
            'custom_css'    => trim((string)($_POST['custom_css'] ?? '')),
        ];
        try {
            $pdo->exec('CREATE TABLE IF NOT EXISTS cms_kv_store (key_name VARCHAR(80) PRIMARY KEY, val_json MEDIUMTEXT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)');
            $pdo->prepare("REPLACE INTO cms_kv_store (key_name, val_json) VALUES ('upload_policy', ?)")
                ->execute([json_encode(['max_photo_mb' => $maxPhotoMb, 'max_doc_mb' => $maxDocMb, 'auto_crop_enabled' => $autoCrop])]);
            $pdo->prepare("REPLACE INTO cms_kv_store (key_name, val_json) VALUES ('design_settings', ?)")
                ->execute([json_encode($designPayload, JSON_UNESCAPED_UNICODE)]);
        } catch (Throwable $ignoredKv) {}

        logAudit($pdo, $user, 'UPDATE_SETTINGS', 'Settings', $_POST['institution_name']);
        $msg = 'Site settings, design presets, upload limits & homepage layout saved.';
        $s = getSiteSettings($pdo);
    }
}
$hs = $s['home_sections'] ?? [];
$stats = $s['highlights_stats'] ?? [];
$approvedBodies = $s['approved_bodies'] ?? [];
$adminPageTitle = 'Site Settings, Branding, Design Studio & Homepage Charter';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

  <form method="post" enctype="multipart/form-data" class="card" style="max-width:860px;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Trust / Society Name <input type="text" name="trust_name" value="<?= e($s['trust_name'] ?? '') ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Short Code <input type="text" name="short_code" value="<?= e($s['short_code'] ?? 'SVCOER') ?>" style="width:100%;padding:0.5rem;"></label>
    </div>
    <label style="display:block;margin-bottom:0.65rem;">Institution Name
      <input type="text" name="institution_name" value="<?= e($s['institution_name']) ?>" style="width:100%;padding:0.5rem;">
    </label>
    <label style="display:block;margin-bottom:0.65rem;">Affiliation Subtitle
      <input type="text" name="affiliation" value="<?= e($s['affiliation']) ?>" style="width:100%;padding:0.5rem;">
    </label>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>DTE Institute Code <input type="text" name="dte_code" value="<?= e($s['dte_code']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>AICTE Permanent ID <input type="text" name="aicte_code" value="<?= e($s['aicte_code']) ?>" style="width:100%;padding:0.5rem;"></label>
    </div>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Upload Institution Logo (PNG/JPG/WEBP): <input type="file" name="logo_file" accept="image/jpeg,image/png,image/webp" data-aspect="1:1"></label>
      <label>Upload About Us Campus Photo: <input type="file" name="about_image_file" accept="image/jpeg,image/png,image/webp" data-aspect="4:3"></label>
    </div>
    <label style="display:block;margin-bottom:0.65rem;">About Us Homepage Summary
      <textarea name="about_summary" rows="3" style="width:100%;padding:0.5rem;"><?= e($s['about_summary'] ?? '') ?></textarea>
    </label>
    <label style="display:block;margin-bottom:0.65rem;">Vision Statement
      <textarea name="vision_text" rows="2" style="width:100%;padding:0.5rem;"><?= e($s['vision_text'] ?? '') ?></textarea>
    </label>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Mission Statements (1 per line)
        <textarea name="mission_text" rows="4" style="width:100%;padding:0.5rem;"><?= e($s['mission_text'] ?? '') ?></textarea>
      </label>
      <label>Top Recruiters (1 company per line)
        <textarea name="recruiters" rows="4" style="width:100%;padding:0.5rem;"><?= e($s['recruiters'] ?? '') ?></textarea>
      </label>
    </div>
    <label style="display:block;margin-bottom:0.65rem;">Address <input type="text" name="address" value="<?= e($s['address']) ?>" style="width:100%;padding:0.5rem;"></label>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Phone <input type="text" name="phone" value="<?= e($s['phone']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Email <input type="email" name="email" value="<?= e($s['email']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Emergency Helpline <input type="text" name="emergency_helpline" value="<?= e($s['emergency_helpline']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Anti-Ragging Helpline <input type="text" name="anti_ragging_helpline" value="<?= e($s['anti_ragging_helpline']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Default Primary Hex <input id="setting-primary-hex" type="color" name="primary_color" value="<?= e($s['primary_color']) ?>"></label>
      <label>Default Secondary Hex <input id="setting-secondary-hex" type="color" name="secondary_color" value="<?= e($s['secondary_color']) ?>"></label>
    </div>

    <hr style="border:none;border-top:1px solid var(--border-color);margin:1.25rem 0;">
    <h2 style="margin-top:0;">Design &amp; Typography Studio (Zero-Data-Loss Updates)</h2>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-top:-0.35rem;margin-bottom:0.85rem;">
      Switch site-wide aesthetic presets, typography, corner radii, and header style at any time without disturbing any uploaded pages, PDFs, or media.
    </p>
    <div class="grid-3" style="margin-bottom:0.85rem;">
      <label>Design Preset
        <select name="design_preset" onchange="applyDesignPresetHex(this.value)" style="width:100%;padding:0.45rem;margin-top:4px;">
          <?php foreach ([
            'heritage-navy'   => 'Heritage Navy & Saffron Gold',
            'modern-slate'    => 'Executive Slate & Indigo',
            'emerald-campus'  => 'Emerald Green & Teal',
            'crimson-scholar' => 'Academic Crimson & Bronze',
          ] as $pk => $pl): ?>
            <option value="<?= e($pk) ?>" <?= ($s['design_preset'] ?? 'heritage-navy') === $pk ? 'selected' : '' ?>><?= e($pl) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Card Corner Radius
        <select name="card_radius" style="width:100%;padding:0.45rem;margin-top:4px;">
          <option value="rounded" <?= ($s['card_radius'] ?? 'rounded') === 'rounded' ? 'selected' : '' ?>>Standard Rounded</option>
          <option value="sharp" <?= ($s['card_radius'] ?? '') === 'sharp' ? 'selected' : '' ?>>Sharp Executive</option>
          <option value="soft" <?= ($s['card_radius'] ?? '') === 'soft' ? 'selected' : '' ?>>Soft Modern</option>
        </select>
      </label>
      <label>Header Layout
        <select name="header_style" style="width:100%;padding:0.45rem;margin-top:4px;">
          <option value="classic" <?= ($s['header_style'] ?? 'classic') === 'classic' ? 'selected' : '' ?>>Classic Crest + Brand</option>
          <option value="compact" <?= ($s['header_style'] ?? '') === 'compact' ? 'selected' : '' ?>>Compact Strip</option>
        </select>
      </label>
    </div>
    <div class="grid-2" style="margin-bottom:0.85rem;">
      <label>Heading Font Family
        <select name="font_heading" data-custom-select="1" style="width:100%;padding:0.45rem;margin-top:4px;">
          <?php
            $curHeadFont = (string)($s['font_heading'] ?? "'Playfair Display', Georgia, serif");
            $headFonts = [
              "'Playfair Display', Georgia, serif" => 'Playfair Display (Editorial Serif)',
              "'Plus Jakarta Sans', system-ui, sans-serif" => 'Plus Jakarta Sans (Modern Geometric)',
              "Georgia, Cambria, serif" => 'Georgia (Classic Academic)',
            ];
            if (!isset($headFonts[$curHeadFont])) $headFonts[$curHeadFont] = $curHeadFont;
            foreach ($headFonts as $fk => $fl):
          ?>
            <option value="<?= e($fk) ?>" <?= $curHeadFont === $fk ? 'selected' : '' ?>><?= e($fl) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Body Font Family
        <select name="font_body" data-custom-select="1" style="width:100%;padding:0.45rem;margin-top:4px;">
          <?php
            $curBodyFont = (string)($s['font_body'] ?? "'Plus Jakarta Sans', system-ui, sans-serif");
            $bodyFonts = [
              "'Plus Jakarta Sans', system-ui, sans-serif" => 'Plus Jakarta Sans (Clean UI)',
              "'Atkinson Hyperlegible', sans-serif" => 'Atkinson Hyperlegible (High Readability)',
              "system-ui, -apple-system, sans-serif" => 'System Native Sans',
            ];
            if (!isset($bodyFonts[$curBodyFont])) $bodyFonts[$curBodyFont] = $curBodyFont;
            foreach ($bodyFonts as $bk => $bl):
          ?>
            <option value="<?= e($bk) ?>" <?= $curBodyFont === $bk ? 'selected' : '' ?>><?= e($bl) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
    </div>
    <label style="display:block;margin-bottom:0.85rem;">Custom CSS Overrides (Optional)
      <textarea name="custom_css" rows="3" placeholder="/* e.g. .hero-title { letter-spacing: -0.01em; } */" style="width:100%;padding:0.5rem;font-family:monospace;font-size:0.8rem;"><?= e($s['custom_css'] ?? '') ?></textarea>
    </label>

    <hr style="border:none;border-top:1px solid var(--border-color);margin:1.25rem 0;">
    <h2 style="margin-top:0;">Homepage Sections Visibility &amp; Headings</h2>
    <div class="grid-2" style="margin-bottom:0.75rem;font-size:0.9rem;">
      <label><input type="checkbox" name="sec_ticker" <?= !empty($hs['showTicker']) ? 'checked' : '' ?>> Show News / Notices Ticker</label>
      <label><input type="checkbox" name="sec_slider" <?= !empty($hs['showSlider']) ? 'checked' : '' ?>> Show Hero Image Slider</label>
      <label><input type="checkbox" name="sec_stats" <?= !empty($hs['showStatsAndRecognitions']) ? 'checked' : '' ?>> Show Key Highlights Bar</label>
      <label><input type="checkbox" name="sec_about" <?= !empty($hs['showAboutAndDownloads']) ? 'checked' : '' ?>> Show About Us &amp; Downloads</label>
      <label><input type="checkbox" name="sec_approved" <?= !empty($hs['showApprovedAndVision']) ? 'checked' : '' ?>> Show Approved Bodies &amp; Vision</label>
      <label><input type="checkbox" name="sec_leadership" <?= !empty($hs['showLeadershipDesk']) ? 'checked' : '' ?>> Show Leadership &amp; Our Desk</label>
      <label><input type="checkbox" name="sec_exam" <?= !empty($hs['showExaminationSpotlight']) ? 'checked' : '' ?>> Show Examination Cell Spotlight</label>
      <label><input type="checkbox" name="sec_departments" <?= !empty($hs['showDepartments']) ? 'checked' : '' ?>> Show Academic Departments</label>
      <label><input type="checkbox" name="sec_categories" <?= !empty($hs['showCategoriesDirectory']) ? 'checked' : '' ?>> Show Disclosure &amp; Category Portals</label>
      <label><input type="checkbox" name="sec_events" <?= !empty($hs['showEventsAndRecruiters']) ? 'checked' : '' ?>> Show Events &amp; Top Recruiters</label>
    </div>
    <div class="grid-3" style="margin-bottom:0.75rem;">
      <label>Examination Heading <input type="text" name="exam_spotlight_title" value="<?= e($hs['examSpotlightTitle'] ?? 'Autonomous Examination Portal (CoE)') ?>" style="width:100%;padding:0.45rem;"></label>
      <label>Departments Heading <input type="text" name="departments_title" value="<?= e($hs['departmentsTitle'] ?? 'Academic Departments') ?>" style="width:100%;padding:0.45rem;"></label>
      <label>Portals Directory Heading <input type="text" name="categories_title" value="<?= e($hs['categoriesTitle'] ?? 'Statutory Self-Disclosure & Autonomous Portals') ?>" style="width:100%;padding:0.45rem;"></label>
    </div>

    <h3>Key Highlight Metrics</h3>
    <div class="grid-2" style="margin-bottom:1rem;">
      <?php for ($i = 0; $i < 4; $i++): $stRow = $stats[$i] ?? ['label' => '', 'value' => '']; ?>
        <div style="display:flex;gap:0.5rem;">
          <input type="text" name="stat_value[]" value="<?= e($stRow['value'] ?? '') ?>" placeholder="28+" style="width:90px;padding:0.4rem;">
          <input type="text" name="stat_label[]" value="<?= e($stRow['label'] ?? '') ?>" placeholder="Metric Label" style="flex:1;padding:0.4rem;">
        </div>
      <?php endfor; ?>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <h3 style="margin:0;">Approved &amp; Affiliated Bodies Cards</h3>
      <button type="button" class="btn-secondary" style="font-size:0.78rem;" onclick="addApprovedBodyRow()">+ Add Statutory Body</button>
    </div>
    <div id="approved-bodies-list" style="display:grid;gap:0.45rem;margin-bottom:1rem;">
      <?php foreach ($approvedBodies as $ab): ?>
        <div class="approved-body-row" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:0.45rem;align-items:center;">
          <input type="text" name="ab_name[]" value="<?= e($ab['name'] ?? '') ?>" placeholder="Body Name (e.g. AICTE New Delhi)" style="padding:0.42rem;">
          <input type="text" name="ab_subtitle[]" value="<?= e($ab['subtitle'] ?? '') ?>" placeholder="Subtitle (e.g. Statutory Approval)" style="padding:0.42rem;">
          <input type="text" name="ab_href[]" value="<?= e($ab['href'] ?? 'page.php?slug=about-overview') ?>" placeholder="Target Link" style="padding:0.42rem;">
          <button type="button" class="btn-secondary" style="padding:0.4rem 0.65rem;" onclick="this.parentNode.remove()">&times;</button>
        </div>
      <?php endforeach; ?>
    </div>

    <hr style="border:none;border-top:1px solid var(--border-color);margin:1.25rem 0;">
    <h2 style="margin-top:0;">Upload Size Controls &amp; Image Auto-Crop Policy</h2>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-top:-0.35rem;margin-bottom:0.85rem;">
      Applies globally across all Admin photo uploaders (sliders, gallery, faculty, leadership, labs, library, editor) and document repositories.
    </p>
    <div class="grid-3" style="margin-bottom:1rem;">
      <label style="font-size:0.88rem;font-weight:600;">Max Photo Upload Size (MB)
        <input type="number" step="0.25" min="0.25" max="25" name="max_photo_mb" value="<?= e((string)($s['max_photo_mb'] ?? 2.0)) ?>" style="width:100%;padding:0.45rem;margin-top:4px;">
      </label>
      <label style="font-size:0.88rem;font-weight:600;">Max Document Upload Size (MB)
        <input type="number" step="0.5" min="0.5" max="50" name="max_doc_mb" value="<?= e((string)($s['max_doc_mb'] ?? 10.0)) ?>" style="width:100%;padding:0.45rem;margin-top:4px;">
      </label>
      <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.88rem;font-weight:600;padding-top:1.1rem;">
        <input type="checkbox" name="auto_crop_enabled" <?= !empty($s['auto_crop_enabled']) ? 'checked' : '' ?>>
        Enable Auto-Crop &amp; Aspect Ratio Lock
      </label>
    </div>

    <button type="submit" class="btn-primary">Save Complete Settings &amp; Homepage Layout</button>
  </form>
<script>
function applyDesignPresetHex(preset) {
  var map = {
    'heritage-navy':   ['#0F294A', '#B45309'],
    'modern-slate':    ['#1E293B', '#2563EB'],
    'emerald-campus':  ['#064E3B', '#0F766E'],
    'crimson-scholar': ['#7F1D1D', '#B45309']
  };
  var pair = map[preset];
  if (!pair) return;
  var p = document.getElementById('setting-primary-hex');
  var s = document.getElementById('setting-secondary-hex');
  if (p) p.value = pair[0];
  if (s) s.value = pair[1];
}
function addApprovedBodyRow() {
  var list = document.getElementById('approved-bodies-list');
  if (!list) return;
  var div = document.createElement('div');
  div.className = 'approved-body-row';
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:0.45rem;align-items:center;';
  div.innerHTML = '<input type="text" name="ab_name[]" placeholder="Body Name" style="padding:0.42rem;">'
    + '<input type="text" name="ab_subtitle[]" placeholder="Subtitle" style="padding:0.42rem;">'
    + '<input type="text" name="ab_href[]" value="page.php?slug=about-overview" placeholder="Target Link" style="padding:0.42rem;">'
    + '<button type="button" class="btn-secondary" style="padding:0.4rem 0.65rem;" onclick="this.parentNode.remove()">&times;</button>';
  list.appendChild(div);
}
</script>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
