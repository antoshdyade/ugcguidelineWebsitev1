<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('seo');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$msg = '';
$err = '';
$siteSettings = getSiteSettings($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    $seo = getSeoSettings($pdo);

    if ($action === 'save_global_seo') {
        $next = [
            'siteTitleSuffix'        => trim((string)($_POST['site_title_suffix'] ?? $seo['siteTitleSuffix'])),
            'defaultDescription'     => trim((string)($_POST['default_description'] ?? '')),
            'defaultKeywords'        => trim((string)($_POST['default_keywords'] ?? '')),
            'canonicalBaseUrl'       => rtrim(trim((string)($_POST['canonical_base_url'] ?? '')), '/'),
            'ogImageUrl'             => trim((string)($_POST['og_image_url'] ?? 'assets/images/hero_campus.jpg')),
            'twitterHandle'          => trim((string)($_POST['twitter_handle'] ?? '')),
            'robotsPolicy'           => trim((string)($_POST['robots_policy'] ?? 'index, follow')),
            'googleSiteVerification' => trim((string)($_POST['google_site_verification'] ?? '')),
            'bingSiteVerification'   => trim((string)($_POST['bing_site_verification'] ?? '')),
            'organizationType'       => trim((string)($_POST['organization_type'] ?? 'CollegeOrUniversity')),
            'schemaSameAsCsv'        => trim((string)($_POST['schema_same_as_csv'] ?? '')),
            'enableJsonLd'           => isset($_POST['enable_json_ld']),
            'enableSitemapXml'       => isset($_POST['enable_sitemap_xml']),
            'showHitCounterInFooter' => isset($_POST['show_hit_counter_in_footer']),
            'hitCounterStartOffset'  => max(0, (int)($_POST['hit_counter_start_offset'] ?? 0)),
            'hitCounterLabel'        => trim((string)($_POST['hit_counter_label'] ?? 'Website Visits')) ?: 'Website Visits',
            'routeOverrides'         => $seo['routeOverrides'] ?? [],
        ];
        saveSeoSettings($pdo, $next);
        logAudit($pdo, $user, 'UPDATE_SEO_SETTINGS', 'SEO', 'Global SEO, Schema.org & Hit Counter');
        $msg = 'Global SEO configuration, Schema.org metadata & Footer Hit Counter settings saved.';
    } elseif ($action === 'save_route_override') {
        $path = ltrim(trim((string)($_POST['route_path'] ?? '')), '/');
        $title = trim((string)($_POST['route_title'] ?? ''));
        $desc = trim((string)($_POST['route_description'] ?? ''));
        $keywords = trim((string)($_POST['route_keywords'] ?? ''));
        $ogImg = trim((string)($_POST['route_og_image'] ?? ''));
        $noIndex = isset($_POST['route_no_index']);
        $editId = !empty($_POST['override_id']) ? (int)$_POST['override_id'] : 0;

        if ($path === '' || $title === '') {
            $err = 'Please provide both Route Path (e.g. index.php or page.php?slug=about) and Custom Meta Title.';
        } else {
            $overrides = is_array($seo['routeOverrides'] ?? null) ? $seo['routeOverrides'] : [];
            if ($editId > 0) {
                foreach ($overrides as &$ov) {
                    if ((int)($ov['id'] ?? 0) === $editId) {
                        $ov['path'] = $path;
                        $ov['title'] = $title;
                        $ov['description'] = $desc;
                        $ov['keywords'] = $keywords;
                        $ov['ogImageUrl'] = $ogImg;
                        $ov['noIndex'] = $noIndex;
                    }
                }
                unset($ov);
            } else {
                $maxId = 0;
                foreach ($overrides as $ov) {
                    $maxId = max($maxId, (int)($ov['id'] ?? 0));
                }
                $overrides[] = [
                    'id'          => $maxId + 1,
                    'path'        => $path,
                    'title'       => $title,
                    'description' => $desc,
                    'keywords'    => $keywords,
                    'ogImageUrl'  => $ogImg,
                    'noIndex'     => $noIndex,
                ];
            }
            $seo['routeOverrides'] = array_values($overrides);
            saveSeoSettings($pdo, $seo);
            logAudit($pdo, $user, 'SAVE_SEO_OVERRIDE', 'SEO Route', $path);
            $msg = 'Saved custom SEO meta rule for: ' . $path;
        }
    } elseif ($action === 'delete_route_override' && !empty($_POST['override_id'])) {
        $delId = (int)$_POST['override_id'];
        $overrides = array_values(array_filter(
            is_array($seo['routeOverrides'] ?? null) ? $seo['routeOverrides'] : [],
            static fn($ov) => (int)($ov['id'] ?? 0) !== $delId
        ));
        $seo['routeOverrides'] = $overrides;
        saveSeoSettings($pdo, $seo);
        logAudit($pdo, $user, 'DELETE_SEO_OVERRIDE', 'SEO Route', 'ID #' . $delId);
        $msg = 'Removed per-route SEO rule.';
    }
}

$seo = getSeoSettings($pdo);
$hitStats = getHitCounterStats($pdo);
$auditChecks = evaluatePhpSeoAudit($pdo, $seo, $siteSettings);
$passedCount = count(array_filter($auditChecks, static fn($c) => !empty($c['pass'])));
$canonicalBase = resolvePhpCanonicalBase($seo);

$adminPageTitle = 'SEO Studio & Website Hit Counter';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="grid-4" style="margin-bottom:1.25rem;">
  <div class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Total Footer Hits</small>
    <p class="admin-stat-num" style="font-variant-numeric:tabular-nums;"><?= number_format((int)$hitStats['totalHits']) ?></p>
    <small style="color:#57534E;">Baseline offset: <?= number_format((int)$seo['hitCounterStartOffset']) ?></small>
  </div>
  <div class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Today's Hits (UTC)</small>
    <p class="admin-stat-num" style="font-variant-numeric:tabular-nums;"><?= number_format((int)$hitStats['todayHits']) ?></p>
    <small style="color:#57534E;"><?= e($hitStats['todayDate']) ?></small>
  </div>
  <div class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">Unique Visitors</small>
    <p class="admin-stat-num" style="font-variant-numeric:tabular-nums;"><?= number_format((int)$hitStats['uniqueVisitors']) ?></p>
    <small style="color:#57534E;">Footer badge: <?= !empty($seo['showHitCounterInFooter']) ? 'Visible' : 'Hidden' ?></small>
  </div>
  <div class="admin-stat-card">
    <small style="color:#78716C;font-weight:600;">SEO Health Checks</small>
    <p class="admin-stat-num" style="font-variant-numeric:tabular-nums;"><?= $passedCount ?> / <?= count($auditChecks) ?></p>
    <small><a href="<?= e(baseUrl('sitemap.php')) ?>" target="_blank" style="color:var(--primary-color);font-weight:600;">sitemap.php</a> &middot; <a href="<?= e(baseUrl('robots.php')) ?>" target="_blank" style="color:var(--primary-color);font-weight:600;">robots.php</a></small>
  </div>
</div>

<div class="grid-2" style="gap:1.25rem;align-items:start;margin-bottom:1.5rem;">
  <div class="card">
    <h2 style="margin-top:0;">Global SEO, OpenGraph, Schema.org &amp; Footer Hit Counter</h2>
    <form method="post" class="grid" style="gap:0.75rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_global_seo">

      <div>
        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Site Title Suffix *</label>
        <input type="text" name="site_title_suffix" required value="<?= e((string)$seo['siteTitleSuffix']) ?>" style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
      </div>

      <div>
        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Default Meta Description *</label>
        <textarea name="default_description" rows="3" required style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;"><?= e((string)$seo['defaultDescription']) ?></textarea>
      </div>

      <div>
        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Default Meta Keywords (Comma-Separated)</label>
        <input type="text" name="default_keywords" value="<?= e((string)$seo['defaultKeywords']) ?>" style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
      </div>

      <div class="grid-2" style="gap:0.65rem;">
        <div>
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Canonical Base URL</label>
          <input type="url" name="canonical_base_url" value="<?= e((string)$seo['canonicalBaseUrl']) ?>" placeholder="<?= e($canonicalBase) ?>" style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
        </div>
        <div>
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Default OpenGraph / Social Share Image</label>
          <input type="text" name="og_image_url" value="<?= e((string)$seo['ogImageUrl']) ?>" style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
        </div>
      </div>

      <div class="grid-2" style="gap:0.65rem;">
        <div>
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Robots Meta Policy</label>
          <select name="robots_policy" style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
            <?php
            $rOpts = [
                'index, follow, max-image-preview:large' => 'index, follow (Recommended)',
                'index, follow' => 'index, follow',
                'noindex, follow' => 'noindex, follow (Staging)',
                'noindex, nofollow' => 'noindex, nofollow (Private)',
            ];
            foreach ($rOpts as $rVal => $rLab): ?>
              <option value="<?= e($rVal) ?>" <?= ($seo['robotsPolicy'] ?? '') === $rVal ? 'selected' : '' ?>><?= e($rLab) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Schema.org Organization Type</label>
          <select name="organization_type" style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
            <?php foreach (['CollegeOrUniversity', 'EducationalOrganization', 'Organization'] as $orgT): ?>
              <option value="<?= e($orgT) ?>" <?= ($seo['organizationType'] ?? '') === $orgT ? 'selected' : '' ?>><?= e($orgT) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
      </div>

      <div class="grid-2" style="gap:0.65rem;">
        <div>
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Google Site Verification Token</label>
          <input type="text" name="google_site_verification" value="<?= e((string)$seo['googleSiteVerification']) ?>" placeholder="Search Console token" style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
        </div>
        <div>
          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Bing / Twitter Handle</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.35rem;">
            <input type="text" name="bing_site_verification" value="<?= e((string)$seo['bingSiteVerification']) ?>" placeholder="Bing token" style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
            <input type="text" name="twitter_handle" value="<?= e((string)$seo['twitterHandle']) ?>" placeholder="@SVERI..." style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
          </div>
        </div>
      </div>

      <div>
        <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.25rem;">Schema.org SameAs Official URLs (Comma-Separated)</label>
        <input type="text" name="schema_same_as_csv" value="<?= e((string)$seo['schemaSameAsCsv']) ?>" style="width:100%;padding:0.5rem;border:1px solid #D6D3D1;border-radius:6px;">
      </div>

      <div style="padding:0.85rem;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;">
        <strong style="display:block;font-size:0.85rem;margin-bottom:0.5rem;color:#0F294A;">Standard Website Footer Hit Counter Control</strong>
        <div class="grid-2" style="gap:0.65rem;">
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:0.2rem;">Counter Label</label>
            <input type="text" name="hit_counter_label" value="<?= e((string)$seo['hitCounterLabel']) ?>" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;font-weight:600;margin-bottom:0.2rem;">Baseline / Legacy Start Offset</label>
            <input type="number" min="0" name="hit_counter_start_offset" value="<?= (int)$seo['hitCounterStartOffset'] ?>" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:1rem;margin-top:0.65rem;font-size:0.82rem;">
          <label style="display:inline-flex;align-items:center;gap:0.35rem;cursor:pointer;">
            <input type="checkbox" name="show_hit_counter_in_footer" value="1" <?= !empty($seo['showHitCounterInFooter']) ? 'checked' : '' ?>>
            <span>Display Live Hit Counter in Public Footer</span>
          </label>
          <label style="display:inline-flex;align-items:center;gap:0.35rem;cursor:pointer;">
            <input type="checkbox" name="enable_json_ld" value="1" <?= !empty($seo['enableJsonLd']) ? 'checked' : '' ?>>
            <span>Emit Schema.org JSON-LD</span>
          </label>
          <label style="display:inline-flex;align-items:center;gap:0.35rem;cursor:pointer;">
            <input type="checkbox" name="enable_sitemap_xml" value="1" <?= !empty($seo['enableSitemapXml']) ? 'checked' : '' ?>>
            <span>Enable Dynamic XML Sitemap</span>
          </label>
        </div>
      </div>

      <div>
        <button type="submit" class="btn-primary">Save SEO &amp; Hit Counter Configuration</button>
      </div>
    </form>
  </div>

  <div style="display:grid;gap:1.25rem;">
    <div class="card">
      <h2 style="margin-top:0;">Google Search SERP Snippet Preview</h2>
      <div style="padding:1rem;border:1px solid #E7E5E4;border-radius:8px;background:#fff;">
        <div style="font-size:0.76rem;color:#0F766E;margin-bottom:0.2rem;"><?= e($canonicalBase) ?>/index.php</div>
        <div style="font-size:1.1rem;font-weight:700;color:#1D4ED8;margin-bottom:0.25rem;">
          <?php
            $serpInst = trim((string)($siteSettings['institution_name'] ?? 'Campus Portal'));
            $serpShort = trim((string)($siteSettings['short_code'] ?? ''));
            $serpSuffix = trim((string)($seo['siteTitleSuffix'] ?? ''));
            if ($serpShort !== '' && $serpShort !== 'SVCOER' && str_contains($serpSuffix, 'SVCOER')) {
                $serpSuffix = $serpShort . ' — ' . $serpInst;
            }
          ?>
          <?= e($serpInst . ($serpSuffix !== '' ? ' | ' . $serpSuffix : '')) ?>
        </div>
        <div style="font-size:0.84rem;color:#44403C;line-height:1.45;">
          <?= e(mb_substr((string)$seo['defaultDescription'], 0, 165)) ?>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top:0;">Automated Technical SEO Audit</h2>
      <table class="data-table">
        <thead>
          <tr><th>Audit Check</th><th>Status</th><th>Detail</th></tr>
        </thead>
        <tbody>
          <?php foreach ($auditChecks as $chk): ?>
            <tr>
              <td><?= e($chk['label']) ?></td>
              <td>
                <strong style="color:<?= $chk['pass'] ? '#047857' : '#B45309' ?>;">
                  <?= $chk['pass'] ? '&#10003; Pass' : '&#9888; Review' ?>
                </strong>
              </td>
              <td style="font-size:0.8rem;color:#57534E;"><?= e($chk['detail']) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<div class="card">
  <h2 style="margin-top:0;">Per-Route Custom SEO Meta Rules</h2>
  <p style="font-size:0.84rem;color:#57534E;margin-top:-0.25rem;">Override Title, Meta Description, Keywords, OpenGraph Share Image or Search Indexing per PHP route (e.g. <code>index.php</code>, <code>placements.php</code>, <code>department.php?dept=computer-science</code>).</p>
  <form method="post" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.65rem;padding:0.9rem;background:#FAFAF9;border:1px solid #E7E5E4;border-radius:8px;margin-bottom:1rem;align-items:end;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_route_override">
    <div>
      <label style="display:block;font-size:0.78rem;font-weight:600;">Route Path *</label>
      <input type="text" name="route_path" required placeholder="e.g. conferences.php" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
    </div>
    <div>
      <label style="display:block;font-size:0.78rem;font-weight:600;">Custom Meta Title *</label>
      <input type="text" name="route_title" required placeholder="Custom SERP Title" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
    </div>
    <div>
      <label style="display:block;font-size:0.78rem;font-weight:600;">Custom Description</label>
      <input type="text" name="route_description" placeholder="120-160 chars summary" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
    </div>
    <div>
      <label style="display:block;font-size:0.78rem;font-weight:600;">Keywords / OG Image</label>
      <input type="text" name="route_keywords" placeholder="Keywords comma-separated" style="width:100%;padding:0.45rem;border:1px solid #D6D3D1;border-radius:6px;">
    </div>
    <div style="display:flex;align-items:center;gap:0.65rem;">
      <label style="font-size:0.78rem;display:inline-flex;align-items:center;gap:0.3rem;cursor:pointer;">
        <input type="checkbox" name="route_no_index" value="1">
        <span>noindex</span>
      </label>
      <button type="submit" class="btn-primary">Add Rule</button>
    </div>
  </form>

  <table class="data-table">
    <thead>
      <tr><th>Path</th><th>Custom Title</th><th>Description &amp; Keywords</th><th>Indexing</th><th>Action</th></tr>
    </thead>
    <tbody>
      <?php foreach (($seo['routeOverrides'] ?? []) as $ov): ?>
        <tr>
          <td><code><?= e((string)($ov['path'] ?? '')) ?></code></td>
          <td><strong><?= e((string)($ov['title'] ?? '')) ?></strong></td>
          <td style="font-size:0.8rem;color:#57534E;">
            <?= e((string)($ov['description'] ?? '')) ?>
            <?php if (!empty($ov['keywords'])): ?>
              <div style="color:#78716C;margin-top:2px;">Keywords: <?= e((string)$ov['keywords']) ?></div>
            <?php endif; ?>
          </td>
          <td><?= !empty($ov['noIndex']) ? '<strong style="color:#B91C1C;">noindex</strong>' : '<strong style="color:#047857;">index, follow</strong>' ?></td>
          <td>
            <form method="post" style="display:inline;" onsubmit="return confirm('Delete this route SEO override?');">
              <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="action" value="delete_route_override">
              <input type="hidden" name="override_id" value="<?= (int)($ov['id'] ?? 0) ?>">
              <button type="submit" class="btn-secondary" style="color:#BE123C;border-color:#FECDD3;padding:0.25rem 0.6rem;font-size:0.76rem;">Delete</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</div>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
