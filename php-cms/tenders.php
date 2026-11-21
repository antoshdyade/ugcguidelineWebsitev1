<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$cfg = getTenderPortalConfig($pdo);

$selectedCat    = trim((string)($_GET['cat'] ?? 'All'));
$selectedStatus = trim((string)($_GET['status'] ?? 'All'));
$searchQ        = trim((string)($_GET['q'] ?? ''));
$highlightRef   = trim((string)($_GET['ref'] ?? ''));
if ($highlightRef !== '' && $searchQ === '') {
    $searchQ = $highlightRef;
}

$allItems = [];
try {
    $allItems = $pdo->query(
        "SELECT * FROM tender_notices WHERE is_published = 1 AND moderation_status = 'published' ORDER BY is_pinned DESC, sort_order ASC, id ASC"
    )->fetchAll();
} catch (Throwable $ignored) {
}

$categories = ['All'];
foreach ($allItems as $tn) {
    $c = trim((string)($tn['category'] ?? ''));
    if ($c !== '' && !in_array($c, $categories, true)) {
        $categories[] = $c;
    }
}

$statusOptions = array_merge(['All'], tenderStatusPresets());

$openCount = 0;
$awardedCount = 0;
foreach ($allItems as $tn) {
    $st = (string)($tn['lifecycle_status'] ?? '');
    if ($st === 'Open' || $st === 'Corrigendum Issued') {
        $openCount++;
    } elseif ($st === 'Awarded') {
        $awardedCount++;
    }
}

$visible = array_values(array_filter($allItems, static function (array $tn) use ($selectedCat, $selectedStatus, $searchQ): bool {
    if ($selectedCat !== 'All' && (string)($tn['category'] ?? '') !== $selectedCat) {
        return false;
    }
    if ($selectedStatus !== 'All' && (string)($tn['lifecycle_status'] ?? '') !== $selectedStatus) {
        return false;
    }
    if ($searchQ !== '') {
        $hay = strtolower(
            (string)($tn['reference_number'] ?? '') . ' ' .
            (string)($tn['title'] ?? '') . ' ' .
            (string)($tn['category'] ?? '') . ' ' .
            (string)($tn['department_name'] ?? '') . ' ' .
            (string)($tn['summary'] ?? '') . ' ' .
            (string)($tn['awarded_to'] ?? '') . ' ' .
            (string)($tn['custom_fields_json'] ?? '')
        );
        if (!str_contains($hay, strtolower($searchQ))) {
            return false;
        }
    }
    return true;
}));

$sanitizeSafeHtml = static function (string $html): string {
    $clean = preg_replace('#<(script|iframe|object|embed|style)\b[^>]*>.*?</\1>#is', '', $html) ?? '';
    $clean = preg_replace('/\son[a-z]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $clean) ?? '';
    $clean = preg_replace('/\s(href|src)\s*=\s*(["\'])\s*(?:javascript|data|vbscript):.*?\2/i', ' $1="#"', $clean) ?? '';
    return $clean;
};

$safeDocHref = static function (?string $raw): ?string {
    $val = trim((string)($raw ?? ''));
    if ($val === '' || preg_match('#^(?:javascript|data|vbscript):#i', $val)) {
        return null;
    }
    if (preg_match('#^https?://#i', $val)) {
        return filter_var($val, FILTER_VALIDATE_URL) !== false ? $val : null;
    }
    return mediaUrl($val);
};

$statusBadgeStyle = static function (string $status): string {
    switch ($status) {
        case 'Open':
            return 'color:#065F46;border-color:#A7F3D0;background:#ECFDF5;';
        case 'Corrigendum Issued':
            return 'color:#92400E;border-color:#FCD34D;background:#FFFBEB;';
        case 'Under Evaluation':
            return 'color:#1E40AF;border-color:#BFDBFE;background:#EFF6FF;';
        case 'Awarded':
            return 'color:#0F294A;border-color:#CBD5E1;background:#F1F5F9;';
        default:
            return 'color:#57534E;border-color:#D6D3D1;background:#F5F5F4;';
    }
};

$eProcUrl = trim((string)($cfg['eProcurementPortalUrl'] ?? ''));
$hasSafeEProc = $eProcUrl !== '' && !preg_match('#^(?:javascript|data|vbscript):#i', $eProcUrl);

$pageTitle = (string)($cfg['heroTitle'] ?: 'Tenders, Quotations & Purchase Notices');
$pageDesc  = (string)($cfg['heroSubtitle'] ?? '');
require_once __DIR__ . '/includes/header.php';
?>

<style>
  .tender-hero { background: var(--primary-color); color: #fff; border-color: transparent; margin-bottom: 1.25rem; padding: 1.5rem 1.75rem; }
  .tender-stats-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.16); }
  .tender-layout { display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(260px, 1fr); gap: 1.25rem; align-items: start; }
  .tender-meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.65rem; padding: 0.7rem 0.85rem; background: #FAFAF9; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.78rem; }
  @media (max-width: 900px) {
    .tender-layout { grid-template-columns: 1fr; }
    .tender-meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tender-stats-row { grid-template-columns: 1fr; }
  }
  @media print {
    .no-print { display: none !important; }
  }
</style>

<section class="card tender-hero">
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1rem;">
    <div style="max-width:760px;">
      <p style="margin:0 0 0.35rem;font-size:0.74rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FCD34D;">
        <?= e((string)($cfg['heroBadge'] ?? 'Central Purchase & Procurement Cell')) ?>
      </p>
      <h1 style="margin:0 0 0.45rem;color:#fff;font-size:1.85rem;"><?= e((string)$cfg['heroTitle']) ?></h1>
      <p style="margin:0;color:#E2E8F0;font-size:0.9rem;line-height:1.55;"><?= e((string)$cfg['heroSubtitle']) ?></p>
    </div>
    <div class="no-print" style="display:flex;flex-wrap:wrap;gap:0.5rem;">
      <?php if ($hasSafeEProc): ?>
        <a href="<?= e(preg_match('#^https?://#i', $eProcUrl) ? $eProcUrl : baseUrl($eProcUrl)) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm" style="background:#fff;color:#0F294A;border-color:#fff;font-weight:700;text-decoration:none;">
          <?= e((string)($cfg['eProcurementPortalLabel'] ?: 'GeM / e-Tendering Portal')) ?> &#8599;
        </a>
      <?php endif; ?>
      <button type="button" onclick="window.print()" class="btn-outline btn-sm" style="background:rgba(255,255,255,0.12);color:#fff;border-color:rgba(255,255,255,0.3);font-weight:700;">
        Print Bulletin
      </button>
    </div>
  </div>

  <div class="tender-stats-row">
    <div>
      <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:#CBD5E1;">Published Notices</div>
      <div style="font-size:1.45rem;font-weight:700;font-variant-numeric:tabular-nums;margin-top:2px;"><?= count($allItems) ?></div>
    </div>
    <div>
      <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:#CBD5E1;">Active / Open Bids</div>
      <div style="font-size:1.45rem;font-weight:700;font-variant-numeric:tabular-nums;color:#FCD34D;margin-top:2px;"><?= $openCount ?></div>
    </div>
    <div>
      <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em;color:#CBD5E1;">Contracts Awarded</div>
      <div style="font-size:1.45rem;font-weight:700;font-variant-numeric:tabular-nums;color:#6EE7B7;margin-top:2px;"><?= $awardedCount ?></div>
    </div>
  </div>
</section>

<!-- Filter & Search Bar -->
<div class="card no-print" style="margin-bottom:1.25rem;">
  <form method="get" style="display:flex;flex-direction:column;gap:0.75rem;">
    <div style="display:flex;flex-wrap:wrap;gap:0.75rem;align-items:center;justify-content:space-between;">
      <div style="display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;">
        <?php foreach ($categories as $catOpt): ?>
          <a href="?cat=<?= urlencode($catOpt) ?>&status=<?= urlencode($selectedStatus) ?><?= $searchQ !== '' ? '&q=' . urlencode($searchQ) : '' ?>"
             class="<?= $selectedCat === $catOpt ? 'btn-primary' : 'btn-outline' ?> btn-sm" style="text-decoration:none;"><?= e($catOpt) ?></a>
        <?php endforeach; ?>
      </div>
      <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
        <input type="hidden" name="cat" value="<?= e($selectedCat) ?>">
        <select name="status" onchange="this.form.submit()" aria-label="Filter by Bid Stage" style="padding:0.45rem 0.6rem;border:1px solid var(--border-color);border-radius:8px;background:#fff;">
          <?php foreach ($statusOptions as $stOpt): ?>
            <option value="<?= e($stOpt) ?>" <?= $selectedStatus === $stOpt ? 'selected' : '' ?>>Stage: <?= e($stOpt) ?></option>
          <?php endforeach; ?>
        </select>
        <input type="search" name="q" value="<?= e($searchQ) ?>" placeholder="Search NIT ref, equipment, dept, vendor..." style="padding:0.45rem 0.7rem;border:1px solid var(--border-color);border-radius:8px;min-width:220px;">
        <button type="submit" class="btn-primary btn-sm">Filter</button>
        <?php if ($selectedCat !== 'All' || $selectedStatus !== 'All' || $searchQ !== ''): ?>
          <a href="<?= e(baseUrl('tenders.php')) ?>" class="btn-outline btn-sm" style="text-decoration:none;">Reset</a>
        <?php endif; ?>
      </div>
    </div>
  </form>
</div>

<div class="tender-layout">
  <div style="display:flex;flex-direction:column;gap:1rem;">
    <?php if (empty($visible)): ?>
      <div class="card">
        <p style="margin:0;color:var(--text-muted);font-weight:600;">No published tenders or purchase notices match your current filter.</p>
      </div>
    <?php else: ?>
      <?php foreach ($visible as $tn):
        $cfRows = json_decode((string)($tn['custom_fields_json'] ?? '[]'), true);
        if (!is_array($cfRows)) $cfRows = [];
        $nitHref  = $safeDocHref((string)($tn['nit_pdf_url'] ?? ''));
        $boqHref  = $safeDocHref((string)($tn['boq_url'] ?? ''));
        $corrHref = $safeDocHref((string)($tn['corrigendum_url'] ?? ''));
        $isHighlighted = $highlightRef !== '' && strcasecmp($highlightRef, (string)($tn['reference_number'] ?? '')) === 0;
        $tnStatus = (string)($tn['lifecycle_status'] ?? 'Open');
      ?>
        <article id="tender-<?= (int)$tn['id'] ?>" class="card" style="padding:1.25rem;<?= $isHighlighted ? 'border-color:var(--primary-color);box-shadow:0 0 0 2px rgba(15,41,74,0.12);' : '' ?>">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;font-size:0.78rem;">
              <strong style="font-family:monospace;color:var(--primary-color);font-variant-numeric:tabular-nums;"><?= e((string)$tn['reference_number']) ?></strong>
              <span style="color:var(--text-muted);">&middot; <?= e((string)$tn['category']) ?></span>
              <span style="color:var(--text-muted);">&middot; <?= e((string)$tn['procurement_mode']) ?></span>
            </div>
            <div style="display:flex;align-items:center;gap:0.4rem;">
              <?php if (!empty($tn['is_pinned'])): ?>
                <small style="font-weight:700;color:var(--secondary-color);font-size:0.72rem;text-transform:uppercase;">Pinned</small>
              <?php endif; ?>
              <span style="display:inline-block;padding:0.15rem 0.55rem;border:1px solid;font-size:0.72rem;font-weight:700;border-radius:4px;<?= e($statusBadgeStyle($tnStatus)) ?>">
                <?= e($tnStatus) ?>
              </span>
            </div>
          </div>

          <h2 style="margin:0 0 0.45rem;font-size:1.18rem;color:#1C1917;line-height:1.35;"><?= e((string)$tn['title']) ?></h2>

          <?php if (!empty($tn['summary'])): ?>
            <p style="margin:0 0 0.75rem;font-size:0.88rem;color:var(--text-muted);line-height:1.55;"><?= e((string)$tn['summary']) ?></p>
          <?php endif; ?>

          <div class="tender-meta-grid">
            <div>
              <span style="color:var(--text-muted);display:block;font-size:0.7rem;text-transform:uppercase;">Indenting Dept</span>
              <strong style="color:#1C1917;"><?= e((string)$tn['department_name']) ?></strong>
            </div>
            <div>
              <span style="color:var(--text-muted);display:block;font-size:0.7rem;text-transform:uppercase;">Est. Value / EMD</span>
              <strong style="color:#1C1917;font-variant-numeric:tabular-nums;">
                <?= e((string)($tn['estimated_value'] ?: 'As per BOQ')) ?>
                <?php if (!empty($tn['emd_amount'])): ?>
                  <span style="display:block;font-weight:500;color:var(--text-muted);font-size:0.72rem;">EMD: <?= e((string)$tn['emd_amount']) ?></span>
                <?php endif; ?>
              </strong>
            </div>
            <div>
              <span style="color:var(--text-muted);display:block;font-size:0.7rem;text-transform:uppercase;">Published Date</span>
              <strong style="color:#1C1917;font-variant-numeric:tabular-nums;"><?= e((string)$tn['publish_date']) ?></strong>
            </div>
            <div>
              <span style="color:var(--text-muted);display:block;font-size:0.7rem;text-transform:uppercase;">Bid Closing</span>
              <strong style="color:#9F1239;font-variant-numeric:tabular-nums;"><?= e((string)$tn['submission_deadline']) ?></strong>
            </div>
          </div>

          <?php if (!empty($tn['corrigendum_note'])): ?>
            <div style="margin-top:0.75rem;padding:0.65rem 0.85rem;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;font-size:0.82rem;color:#78350F;">
              <strong>Corrigendum / Addendum:</strong> <?= e((string)$tn['corrigendum_note']) ?>
            </div>
          <?php endif; ?>

          <?php if ($tnStatus === 'Awarded' && !empty($tn['awarded_to'])): ?>
            <div style="margin-top:0.75rem;padding:0.65rem 0.85rem;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;font-size:0.82rem;color:#065F46;">
              <strong>Contract Awarded:</strong> <?= e((string)$tn['awarded_to']) ?>
              <?php if (!empty($tn['awarded_value'])): ?> · <strong>Value:</strong> <?= e((string)$tn['awarded_value']) ?><?php endif; ?>
              <?php if (!empty($tn['po_reference'])): ?> · <strong>PO Ref:</strong> <?= e((string)$tn['po_reference']) ?><?php endif; ?>
            </div>
          <?php endif; ?>

          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.65rem;margin-top:0.85rem;padding-top:0.7rem;border-top:1px solid var(--border-color);">
            <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
              <?php if ($nitHref !== null): ?>
                <a href="<?= e($nitHref) ?>" target="_blank" rel="noopener noreferrer" class="btn-primary btn-sm" style="text-decoration:none;">NIT Document &darr;</a>
              <?php endif; ?>
              <?php if ($boqHref !== null): ?>
                <a href="<?= e($boqHref) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm" style="text-decoration:none;">BOQ / Price Bid &darr;</a>
              <?php endif; ?>
              <?php if ($corrHref !== null): ?>
                <a href="<?= e($corrHref) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm" style="text-decoration:none;border-color:#F59E0B;color:#92400E;">Corrigendum PDF &darr;</a>
              <?php endif; ?>
            </div>
          </div>

          <details <?= $isHighlighted ? 'open' : '' ?> style="margin-top:0.75rem;border-top:1px dashed var(--border-color);padding-top:0.65rem;">
            <summary style="cursor:pointer;font-size:0.8rem;font-weight:700;color:var(--primary-color);">
              Schedule, Vendor Eligibility &amp; Technical Parameters
            </summary>
            <div style="margin-top:0.75rem;display:flex;flex-direction:column;gap:0.75rem;">
              <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.6rem;font-size:0.8rem;padding:0.6rem 0.75rem;background:#FAFAF9;border:1px solid var(--border-color);border-radius:6px;">
                <div><span style="color:var(--text-muted);display:block;">Pre-Bid Meeting</span><strong><?= e((string)($tn['pre_bid_date'] ?: 'Not Applicable')) ?></strong></div>
                <div><span style="color:var(--text-muted);display:block;">Technical Bid Opening</span><strong><?= e((string)($tn['bid_opening_date'] ?: 'As per Schedule')) ?></strong></div>
                <div><span style="color:var(--text-muted);display:block;">Tender Fee</span><strong><?= e((string)($tn['tender_fee'] ?: 'Nil / Exempted')) ?></strong></div>
              </div>

              <?php if (!empty($tn['eligibility_html'])): ?>
                <div class="cms-prose" style="font-size:0.85rem;color:#334155;">
                  <strong style="display:block;margin-bottom:0.25rem;color:#1C1917;">Eligibility &amp; Submission Instructions</strong>
                  <?= $sanitizeSafeHtml((string)$tn['eligibility_html']) ?>
                </div>
              <?php endif; ?>

              <?php if (!empty($cfRows)): ?>
                <table class="data-table" style="font-size:0.8rem;">
                  <tbody>
                    <?php foreach ($cfRows as $cf): ?>
                      <?php if (trim((string)($cf['label'] ?? '')) !== ''): ?>
                        <tr>
                          <th style="width:36%;text-align:left;background:#FAFAF9;"><?= e((string)$cf['label']) ?></th>
                          <td><?= e((string)($cf['value'] ?? '')) ?></td>
                        </tr>
                      <?php endif; ?>
                    <?php endforeach; ?>
                  </tbody>
                </table>
              <?php endif; ?>
            </div>
          </details>

          <?php if (!isset($tn['is_shareable']) || !empty($tn['is_shareable'])): ?>
            <div style="margin-top:0.65rem;">
              <?= renderPhpSocialShareBar($pdo, (string)$tn['reference_number'] . ': ' . (string)$tn['title'], (string)($tn['summary'] ?? ''), baseUrl('tenders.php?ref=' . urlencode((string)$tn['reference_number'])), 'portal', true, true) ?>
            </div>
          <?php endif; ?>
        </article>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>

  <!-- Procurement Sidebar -->
  <aside style="display:flex;flex-direction:column;gap:1rem;">
    <section class="card">
      <small style="display:block;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--secondary-color);margin-bottom:0.25rem;">Central Purchase Office</small>
      <h3 style="margin:0 0 0.6rem;font-size:1.05rem;">Procurement Desk Contact</h3>
      <div style="font-size:0.84rem;color:#334155;line-height:1.55;">
        <div style="font-weight:700;color:#1C1917;"><?= e((string)$cfg['officerName']) ?></div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.6rem;"><?= e((string)$cfg['officerTitle']) ?></div>
        <?php if (!empty($cfg['officerEmail'])): ?>
          <div><strong>Email:</strong> <a href="mailto:<?= e((string)$cfg['officerEmail']) ?>"><?= e((string)$cfg['officerEmail']) ?></a></div>
        <?php endif; ?>
        <?php if (!empty($cfg['officerPhone'])): ?>
          <div><strong>Phone:</strong> <?= e((string)$cfg['officerPhone']) ?></div>
        <?php endif; ?>
        <?php if (!empty($cfg['officeAddress'])): ?>
          <div style="margin-top:0.45rem;color:var(--text-muted);font-size:0.8rem;"><?= e((string)$cfg['officeAddress']) ?></div>
        <?php endif; ?>
      </div>
    </section>

    <section class="card">
      <small style="display:block;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--secondary-color);margin-bottom:0.25rem;">Vendor Compliance</small>
      <h3 style="margin:0 0 0.6rem;font-size:1.05rem;">Standard Procurement Guidelines</h3>
      <div class="cms-prose" style="font-size:0.82rem;color:#334155;line-height:1.55;">
        <?= $sanitizeSafeHtml((string)($cfg['generalTermsHtml'] ?? '')) ?>
      </div>
    </section>
  </aside>
</div>

<div style="margin-top:1.25rem;">
  <?= renderPhpSocialShareBar($pdo, $pageTitle, (string)($cfg['heroSubtitle'] ?? ''), baseUrl('tenders.php'), 'portal', true) ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
