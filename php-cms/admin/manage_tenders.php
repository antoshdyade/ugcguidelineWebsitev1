<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('tenders');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$msg = '';
$err = '';

$categoryPresets = tenderCategoryPresets();
$modePresets     = tenderModePresets();
$statusPresets   = tenderStatusPresets();

$decodeCustomFields = static function (?string $raw): array {
    $dec = json_decode((string)($raw ?? '[]'), true);
    if (!is_array($dec)) {
        return [];
    }
    $out = [];
    foreach ($dec as $row) {
        if (is_array($row) && trim((string)($row['label'] ?? '')) !== '') {
            $out[] = ['label' => trim((string)$row['label']), 'value' => trim((string)$row['value'] ?? '')];
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
        $cfgNext = [
            'heroBadge'               => trim((string)($_POST['hero_badge'] ?? '')),
            'heroTitle'               => trim((string)($_POST['hero_title'] ?? '')),
            'heroSubtitle'            => trim((string)($_POST['hero_subtitle'] ?? '')),
            'officerName'             => trim((string)($_POST['officer_name'] ?? '')),
            'officerTitle'            => trim((string)($_POST['officer_title'] ?? '')),
            'officerEmail'            => trim((string)($_POST['officer_email'] ?? '')),
            'officerPhone'            => trim((string)($_POST['officer_phone'] ?? '')),
            'officeAddress'           => trim((string)($_POST['office_address'] ?? '')),
            'eProcurementPortalUrl'   => trim((string)($_POST['eproc_url'] ?? '')),
            'eProcurementPortalLabel' => trim((string)($_POST['eproc_label'] ?? '')),
            'generalTermsHtml'        => (string)($_POST['general_terms_html'] ?? ''),
            'customFieldPresets'      => $presetsArr,
        ];
        saveTenderPortalConfig($pdo, $cfgNext);
        logAudit($pdo, $user, 'UPDATE_TENDER_CONFIG', 'Tenders Portal', (string)($cfgNext['heroTitle'] ?: 'Procurement Cell'));
        $msg = 'Tenders & Procurement Office configuration saved.';
    } elseif ($action === 'save_tender') {
        $editId           = (int)($_POST['edit_id'] ?? 0);
        $referenceNumber  = trim((string)($_POST['reference_number'] ?? ''));
        $title            = trim((string)($_POST['title'] ?? ''));
        $category         = trim((string)($_POST['category'] ?? $categoryPresets[0])) ?: $categoryPresets[0];
        $departmentName   = trim((string)($_POST['department_name'] ?? 'Central Purchase Cell')) ?: 'Central Purchase Cell';
        $procurementMode  = trim((string)($_POST['procurement_mode'] ?? $modePresets[0])) ?: $modePresets[0];
        $estimatedValue   = trim((string)($_POST['estimated_value'] ?? ''));
        $emdAmount        = trim((string)($_POST['emd_amount'] ?? ''));
        $tenderFee        = trim((string)($_POST['tender_fee'] ?? ''));
        $publishDate      = trim((string)($_POST['publish_date'] ?? gmdate('Y-m-d')));
        $preBidDate       = trim((string)($_POST['pre_bid_date'] ?? ''));
        $subDeadline      = trim((string)($_POST['submission_deadline'] ?? ''));
        $bidOpeningDate   = trim((string)($_POST['bid_opening_date'] ?? ''));
        $lifecycleStatus  = trim((string)($_POST['lifecycle_status'] ?? 'Open'));
        if (!in_array($lifecycleStatus, $statusPresets, true)) {
            $lifecycleStatus = 'Open';
        }
        $summary          = trim((string)($_POST['summary'] ?? ''));
        $eligibilityHtml  = (string)($_POST['eligibility_html'] ?? '');
        $corrigendumNote  = trim((string)($_POST['corrigendum_note'] ?? ''));
        $awardedTo        = trim((string)($_POST['awarded_to'] ?? ''));
        $awardedValue     = trim((string)($_POST['awarded_value'] ?? ''));
        $poReference      = trim((string)($_POST['po_reference'] ?? ''));
        $isPinned         = !empty($_POST['is_pinned']) ? 1 : 0;
        $isPublished      = !empty($_POST['is_published']) ? 1 : 0;
        $isShareable      = !empty($_POST['is_shareable']) ? 1 : 0;
        $cfJson           = json_encode($decodeCustomFields($_POST['custom_fields_json'] ?? '[]'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $nitPdfUrl = trim((string)($_POST['nit_pdf_url'] ?? ''));
        if (!empty($_FILES['nit_pdf_file']['name'])) {
            $upNit = handleCmsUpload($pdo, $_FILES['nit_pdf_file'], __DIR__ . '/../uploads', 'document');
            if (!$upNit['ok']) $err = $upNit['error'];
            else $nitPdfUrl = $upNit['file_url'];
        }

        $boqUrl = trim((string)($_POST['boq_url'] ?? ''));
        if ($err === '' && !empty($_FILES['boq_file']['name'])) {
            $upBoq = handleCmsUpload($pdo, $_FILES['boq_file'], __DIR__ . '/../uploads', 'document');
            if (!$upBoq['ok']) $err = $upBoq['error'];
            else $boqUrl = $upBoq['file_url'];
        }

        $corrUrl = trim((string)($_POST['corrigendum_url'] ?? ''));
        if ($err === '' && !empty($_FILES['corrigendum_file']['name'])) {
            $upCorr = handleCmsUpload($pdo, $_FILES['corrigendum_file'], __DIR__ . '/../uploads', 'document');
            if (!$upCorr['ok']) $err = $upCorr['error'];
            else $corrUrl = $upCorr['file_url'];
        }

        if ($err === '' && ($referenceNumber === '' || $title === '' || $subDeadline === '')) {
            $err = 'NIT Reference Number, Tender Title, and Submission Deadline are required.';
        }

        if ($err === '') {
            $isSuper = cmsIsSuperAdmin($user);
            $revLabel = $referenceNumber . ' — ' . $title;
            $payload = [
                'reference_number'    => $referenceNumber,
                'title'               => $title,
                'category'            => $category,
                'department_name'     => $departmentName,
                'procurement_mode'    => $procurementMode,
                'estimated_value'     => $estimatedValue,
                'emd_amount'          => $emdAmount,
                'tender_fee'          => $tenderFee,
                'publish_date'        => $publishDate,
                'pre_bid_date'        => $preBidDate,
                'submission_deadline' => $subDeadline,
                'bid_opening_date'    => $bidOpeningDate,
                'lifecycle_status'    => $lifecycleStatus,
                'summary'             => $summary,
                'eligibility_html'    => $eligibilityHtml,
                'nit_pdf_url'         => $nitPdfUrl,
                'boq_url'             => $boqUrl,
                'corrigendum_note'    => $corrigendumNote,
                'corrigendum_url'     => $corrUrl,
                'awarded_to'          => $awardedTo,
                'awarded_value'       => $awardedValue,
                'po_reference'        => $poReference,
                'custom_fields_json'  => $cfJson,
                'is_pinned'           => $isPinned,
                'is_published'        => $isPublished,
                'is_shareable'        => $isShareable,
            ];

            if ($editId > 0) {
                $currStmt = $pdo->prepare('SELECT * FROM tender_notices WHERE id = ? LIMIT 1');
                $currStmt->execute([$editId]);
                $curr = $currStmt->fetch();
                if (!$curr) {
                    $err = 'Tender notice record not found.';
                } elseif ($isSuper) {
                    $pdo->prepare(
                        'UPDATE tender_notices SET reference_number=?, title=?, category=?, department_name=?, procurement_mode=?, estimated_value=?, emd_amount=?, tender_fee=?, publish_date=?, pre_bid_date=?, submission_deadline=?, bid_opening_date=?, lifecycle_status=?, summary=?, eligibility_html=?, nit_pdf_url=?, boq_url=?, corrigendum_note=?, corrigendum_url=?, awarded_to=?, awarded_value=?, po_reference=?, custom_fields_json=?, is_pinned=?, is_published=?, is_shareable=?, moderation_status=? WHERE id=?'
                    )->execute([
                        $referenceNumber, $title, $category, $departmentName, $procurementMode,
                        $estimatedValue, $emdAmount, $tenderFee, $publishDate, $preBidDate,
                        $subDeadline, $bidOpeningDate, $lifecycleStatus, $summary, $eligibilityHtml,
                        $nitPdfUrl, $boqUrl, $corrigendumNote, $corrUrl, $awardedTo,
                        $awardedValue, $poReference, $cfJson, $isPinned, $isPublished,
                        $isShareable, 'published', $editId,
                    ]);
                    logAudit($pdo, $user, 'SAVE_TENDER', 'Tender Notice', $revLabel);
                    $msg = 'Tender notice "' . $referenceNumber . '" updated and published.';
                } else {
                    cmsQueuePendingUpdate($pdo, $user, 'tender_notices', $editId, $revLabel, $curr, $payload);
                    $msg = 'Updates to tender "' . $referenceNumber . '" submitted for Super Admin approval. Live notice remains unchanged.';
                }
            } else {
                $ord = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM tender_notices')->fetchColumn()) + 1;
                $insPub = $isSuper ? $isPublished : 0;
                $insMod = $isSuper ? 'published' : 'pending_approval';
                $pdo->prepare(
                    'INSERT INTO tender_notices (reference_number, title, category, department_name, procurement_mode, estimated_value, emd_amount, tender_fee, publish_date, pre_bid_date, submission_deadline, bid_opening_date, lifecycle_status, summary, eligibility_html, nit_pdf_url, boq_url, corrigendum_note, corrigendum_url, awarded_to, awarded_value, po_reference, custom_fields_json, is_pinned, is_published, is_shareable, moderation_status, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                )->execute([
                    $referenceNumber, $title, $category, $departmentName, $procurementMode,
                    $estimatedValue, $emdAmount, $tenderFee, $publishDate, $preBidDate,
                    $subDeadline, $bidOpeningDate, $lifecycleStatus, $summary, $eligibilityHtml,
                    $nitPdfUrl, $boqUrl, $corrigendumNote, $corrUrl, $awardedTo,
                    $awardedValue, $poReference, $cfJson, $isPinned, $insPub,
                    $isShareable, $insMod, $ord,
                ]);
                $newId = (int)$pdo->lastInsertId();
                if ($isSuper) {
                    logAudit($pdo, $user, 'SAVE_TENDER', 'Tender Notice', $revLabel);
                    $msg = 'Tender notice "' . $referenceNumber . '" created and published.';
                } else {
                    $payload['sort_order'] = $ord;
                    $payload['moderation_status'] = 'pending_approval';
                    cmsQueuePendingCreate($pdo, $user, 'tender_notices', $newId, $revLabel, $payload);
                    $msg = 'New tender notice "' . $referenceNumber . '" submitted for Super Admin approval before publishing.';
                }
            }
        }
    } elseif ($action === 'move_tender' && !empty($_POST['id'])) {
        swapSortOrder($pdo, 'tender_notices', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up');
        $msg = 'Tender display order updated.';
    } elseif ($action === 'delete_tender' && !empty($_POST['id'])) {
        $delId = (int)$_POST['id'];
        $currStmt = $pdo->prepare('SELECT * FROM tender_notices WHERE id = ? LIMIT 1');
        $currStmt->execute([$delId]);
        $curr = $currStmt->fetch();
        if (!$curr) {
            $err = 'Tender notice not found.';
        } elseif (cmsIsSuperAdmin($user)) {
            $pdo->prepare('DELETE FROM tender_notices WHERE id = ?')->execute([$delId]);
            logAudit($pdo, $user, 'DELETE_TENDER', 'Tender Notice', (string)($curr['reference_number'] ?? '#' . $delId));
            $msg = 'Tender notice deleted.';
        } else {
            cmsQueuePendingDelete($pdo, $user, 'tender_notices', $delId, (string)($curr['reference_number'] . ' — ' . $curr['title']), $curr);
            $msg = 'Delete request for tender "' . ($curr['reference_number'] ?? '#' . $delId) . '" submitted for Super Admin approval.';
        }
    }
}

$cfg = getTenderPortalConfig($pdo);

$editingTn = null;
if (!empty($_GET['edit_id'])) {
    $s = $pdo->prepare('SELECT * FROM tender_notices WHERE id = ? LIMIT 1');
    $s->execute([(int)$_GET['edit_id']]);
    $editingTn = $s->fetch() ?: null;
}

$items = $pdo->query('SELECT * FROM tender_notices ORDER BY is_pinned DESC, sort_order ASC, id ASC')->fetchAll();

$catOptions = $categoryPresets;
$modeOptions = $modePresets;
foreach ($items as $it) {
    $c = trim((string)($it['category'] ?? ''));
    if ($c !== '' && !in_array($c, $catOptions, true)) $catOptions[] = $c;
    $m = trim((string)($it['procurement_mode'] ?? ''));
    if ($m !== '' && !in_array($m, $modeOptions, true)) $modeOptions[] = $m;
}

$initCustomFields = $editingTn ? $decodeCustomFields((string)($editingTn['custom_fields_json'] ?? '[]')) : [];
$cfPresets = (array)($cfg['customFieldPresets'] ?? []);

$adminPageTitle = 'Tenders, Quotations & Purchase Notices';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="admin-subtabs" style="align-items:center;">
  <span style="font-weight:700;font-size:0.86rem;">Manage Purchase Tenders &amp; Notices (<?= count($items) ?> notices)</span>
  <a href="<?= e(baseUrl('tenders.php')) ?>" target="_blank" class="btn-outline btn-sm" style="margin-left:auto;">Open Public Tenders Portal &rarr;</a>
</div>

<?php if (!cmsIsSuperAdmin($user)): ?>
  <div class="card" style="background:#FFFBEB;border-color:#FCD34D;margin-bottom:1.1rem;font-size:0.84rem;color:#92400E;">
    <strong>Moderation Notice:</strong> Creating, updating, or deleting tender notices submits a revision to the Super Admin approval queue before going live on the public portal.
  </div>
<?php endif; ?>

<!-- Procurement Office & Terms Config -->
<form method="post" class="card" style="margin-bottom:1.25rem;">
  <h2 style="margin-top:0;">Procurement Office Header, e-Tendering Link &amp; Vendor Terms</h2>
  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
  <input type="hidden" name="action" value="save_portal_config">

  <div class="grid-3" style="margin-bottom:0.65rem;">
    <label style="font-size:0.82rem;font-weight:600;">Portal Badge
      <input type="text" name="hero_badge" value="<?= e((string)$cfg['heroBadge']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Portal Title
      <input type="text" name="hero_title" value="<?= e((string)$cfg['heroTitle']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Custom Parameter Presets (comma-separated)
      <input type="text" name="custom_field_presets_csv" value="<?= e(implode(', ', $cfPresets)) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
  </div>

  <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Portal Hero Subtitle
    <textarea name="hero_subtitle" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"><?= e((string)$cfg['heroSubtitle']) ?></textarea>
  </label>

  <div class="grid-3" style="margin-bottom:0.65rem;">
    <label style="font-size:0.82rem;font-weight:600;">Purchase Officer Name
      <input type="text" name="officer_name" value="<?= e((string)$cfg['officerName']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Designation / Role
      <input type="text" name="officer_title" value="<?= e((string)$cfg['officerTitle']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Purchase Cell Email
      <input type="email" name="officer_email" value="<?= e((string)$cfg['officerEmail']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Office Phone
      <input type="text" name="officer_phone" value="<?= e((string)$cfg['officerPhone']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">GeM / e-Tendering URL
      <input type="text" name="eproc_url" value="<?= e((string)$cfg['eProcurementPortalUrl']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">e-Tendering Button Label
      <input type="text" name="eproc_label" value="<?= e((string)$cfg['eProcurementPortalLabel']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
  </div>

  <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Store &amp; Purchase Office Address
    <input type="text" name="office_address" value="<?= e((string)$cfg['officeAddress']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
  </label>

  <div style="margin-bottom:0.75rem;">
    <strong style="display:block;font-size:0.82rem;margin-bottom:0.3rem;">Standard Procurement Guidelines / General Terms (HTML)</strong>
    <textarea name="general_terms_html" class="rich-editor" data-csrf="<?= e(csrfToken()) ?>"><?= e((string)$cfg['generalTermsHtml']) ?></textarea>
  </div>

  <button type="submit" class="btn-outline btn-sm">Save Procurement Portal Configuration</button>
</form>

<!-- Add / Edit Tender Notice -->
<form method="post" enctype="multipart/form-data" id="tender-item-form" class="card" style="margin-bottom:1.25rem;">
  <h2 style="margin-top:0;"><?= $editingTn ? 'Edit Tender Notice: ' . e((string)$editingTn['reference_number']) : 'Publish New Tender / Purchase Notice' ?></h2>
  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
  <input type="hidden" name="action" value="save_tender">
  <input type="hidden" name="edit_id" value="<?= (int)($editingTn['id'] ?? 0) ?>">
  <input type="hidden" name="custom_fields_json" id="tn_cf_json">

  <div class="grid-3" style="margin-bottom:0.65rem;">
    <label style="font-size:0.82rem;font-weight:600;">NIT / Tender Reference No. *
      <input type="text" name="reference_number" required placeholder="e.g., SVCOER/PUR/2026-27/015" value="<?= e((string)($editingTn['reference_number'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Category (Custom Enabled) *
      <select name="category" data-custom-select="1" style="width:100%;padding:0.45rem;margin-top:3px;">
        <?php foreach ($catOptions as $co): ?>
          <option value="<?= e($co) ?>" <?= ($editingTn['category'] ?? $catOptions[0]) === $co ? 'selected' : '' ?>><?= e($co) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Procurement Mode (Custom Enabled)
      <select name="procurement_mode" data-custom-select="1" style="width:100%;padding:0.45rem;margin-top:3px;">
        <?php foreach ($modeOptions as $mo): ?>
          <option value="<?= e($mo) ?>" <?= ($editingTn['procurement_mode'] ?? $modeOptions[0]) === $mo ? 'selected' : '' ?>><?= e($mo) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
  </div>

  <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Tender / Procurement Title *
    <input type="text" name="title" required value="<?= e((string)($editingTn['title'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
  </label>

  <div class="grid-3" style="margin-bottom:0.65rem;">
    <label style="font-size:0.82rem;font-weight:600;">Indenting Department / Lab
      <input type="text" name="department_name" value="<?= e((string)($editingTn['department_name'] ?? 'Central Purchase Cell')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Bid Lifecycle Stage
      <select name="lifecycle_status" style="width:100%;padding:0.45rem;margin-top:3px;">
        <?php foreach ($statusPresets as $sp): ?>
          <option value="<?= e($sp) ?>" <?= ($editingTn['lifecycle_status'] ?? 'Open') === $sp ? 'selected' : '' ?>><?= e($sp) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Publish Date
      <input type="date" name="publish_date" value="<?= e((string)($editingTn['publish_date'] ?? gmdate('Y-m-d'))) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Estimated Cost / Budget
      <input type="text" name="estimated_value" placeholder="e.g., Rs. 12,50,000" value="<?= e((string)($editingTn['estimated_value'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">EMD Amount
      <input type="text" name="emd_amount" placeholder="e.g., Rs. 25,000" value="<?= e((string)($editingTn['emd_amount'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Tender Fee
      <input type="text" name="tender_fee" placeholder="e.g., Rs. 1,000" value="<?= e((string)($editingTn['tender_fee'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Pre-Bid Meeting Schedule
      <input type="text" name="pre_bid_date" placeholder="e.g., 2026-11-22 11:30 AM · Hall 2" value="<?= e((string)($editingTn['pre_bid_date'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Submission Deadline *
      <input type="text" name="submission_deadline" required placeholder="e.g., 2026-12-08 05:00 PM" value="<?= e((string)($editingTn['submission_deadline'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Bid Opening Date &amp; Time
      <input type="text" name="bid_opening_date" placeholder="e.g., 2026-12-10 11:00 AM" value="<?= e((string)($editingTn['bid_opening_date'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
  </div>

  <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Brief Procurement Scope / Summary
    <textarea name="summary" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"><?= e((string)($editingTn['summary'] ?? '')) ?></textarea>
  </label>

  <div style="margin-bottom:0.75rem;">
    <strong style="display:block;font-size:0.82rem;margin-bottom:0.3rem;">Vendor Eligibility Criteria &amp; Submission Instructions</strong>
    <textarea name="eligibility_html" class="rich-editor" data-csrf="<?= e(csrfToken()) ?>"><?= e((string)($editingTn['eligibility_html'] ?? '<ul><li>Valid GST, PAN and OEM authorization required.</li></ul>')) ?></textarea>
  </div>

  <div class="grid-3" style="margin-bottom:0.65rem;">
    <div>
      <label style="display:block;font-size:0.82rem;font-weight:600;">NIT Document PDF URL
        <input type="text" name="nit_pdf_url" value="<?= e((string)($editingTn['nit_pdf_url'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="display:block;font-size:0.76rem;color:#57534E;margin-top:4px;">Or Upload NIT PDF
        <input type="file" name="nit_pdf_file" accept=".pdf,.doc,.docx" style="width:100%;margin-top:2px;">
      </label>
    </div>
    <div>
      <label style="display:block;font-size:0.82rem;font-weight:600;">BOQ / Price Bid URL
        <input type="text" name="boq_url" value="<?= e((string)($editingTn['boq_url'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="display:block;font-size:0.76rem;color:#57534E;margin-top:4px;">Or Upload BOQ Document
        <input type="file" name="boq_file" accept=".pdf,.xls,.xlsx,.csv,.doc,.docx" style="width:100%;margin-top:2px;">
      </label>
    </div>
    <div>
      <label style="display:block;font-size:0.82rem;font-weight:600;">Corrigendum PDF URL
        <input type="text" name="corrigendum_url" value="<?= e((string)($editingTn['corrigendum_url'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="display:block;font-size:0.76rem;color:#57534E;margin-top:4px;">Or Upload Corrigendum PDF
        <input type="file" name="corrigendum_file" accept=".pdf,.doc,.docx" style="width:100%;margin-top:2px;">
      </label>
    </div>
  </div>

  <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Corrigendum / Extension Note (if any)
    <input type="text" name="corrigendum_note" value="<?= e((string)($editingTn['corrigendum_note'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
  </label>

  <div class="grid-3" style="margin-bottom:0.65rem;padding:0.65rem;background:#F8FAFC;border:1px solid var(--border-color);border-radius:8px;">
    <label style="font-size:0.82rem;font-weight:600;">Awarded Vendor (When Stage = Awarded)
      <input type="text" name="awarded_to" value="<?= e((string)($editingTn['awarded_to'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Awarded Contract Value
      <input type="text" name="awarded_value" value="<?= e((string)($editingTn['awarded_value'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <label style="font-size:0.82rem;font-weight:600;">Purchase Order (PO) Reference
      <input type="text" name="po_reference" value="<?= e((string)($editingTn['po_reference'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.45rem;">
    <strong style="font-size:0.84rem;">Custom Tender Parameters (Key / Value Specifications)</strong>
    <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
      <?php foreach ($cfPresets as $presetLabel): ?>
        <button type="button" class="btn-outline btn-sm" onclick="addTnCf(<?= e(json_encode((string)$presetLabel)) ?>)">+ <?= e((string)$presetLabel) ?></button>
      <?php endforeach; ?>
      <button type="button" class="btn-outline btn-sm" onclick="addTnCf('')">+ Custom Field</button>
    </div>
  </div>
  <div id="tn-cf-list" style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:0.75rem;"></div>

  <div style="display:flex;gap:1.25rem;flex-wrap:wrap;margin-bottom:0.75rem;font-size:0.84rem;font-weight:600;">
    <label><input type="checkbox" name="is_published" value="1" <?= (!isset($editingTn['is_published']) || !empty($editingTn['is_published'])) ? 'checked' : '' ?>> Published on Portal</label>
    <label><input type="checkbox" name="is_pinned" value="1" <?= !empty($editingTn['is_pinned']) ? 'checked' : '' ?>> Pin to Top</label>
    <label><input type="checkbox" name="is_shareable" value="1" <?= (!isset($editingTn) || !array_key_exists('is_shareable', (array)$editingTn) || !empty($editingTn['is_shareable'])) ? 'checked' : '' ?>> Enable Social Share Icons</label>
  </div>

  <div style="display:flex;gap:0.6rem;">
    <button type="submit" class="btn-primary"><?= $editingTn ? 'Update Tender Notice' : 'Save &amp; Publish Tender' ?></button>
    <?php if ($editingTn): ?><a href="manage_tenders.php" class="btn-outline">Cancel Editing</a><?php endif; ?>
  </div>
</form>

<script>
  (function(){
    var cfs = <?= json_encode($initCustomFields, JSON_UNESCAPED_SLASHES) ?>;
    function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');}
    window.renderTnCf = function(){
      document.getElementById('tn-cf-list').innerHTML = cfs.map(function(c,i){
        return '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;">' +
          '<input type="text" placeholder="Parameter Name (e.g. Delivery Period)" value="'+esc(c.label)+'" oninput="window._tnCfs['+i+'].label=this.value" style="padding:5px;border:1px solid #D6D3D1;border-radius:6px;">' +
          '<input type="text" placeholder="Value" value="'+esc(c.value)+'" oninput="window._tnCfs['+i+'].value=this.value" style="padding:5px;border:1px solid #D6D3D1;border-radius:6px;">' +
          '<button type="button" class="btn-danger btn-sm" onclick="window._tnCfs.splice('+i+',1);window.renderTnCf()">&times;</button></div>';
      }).join('');
    };
    window._tnCfs = cfs;
    window.addTnCf = function(preset){ cfs.push({label:preset||'',value:''}); window.renderTnCf(); };
    window.renderTnCf();
    document.getElementById('tender-item-form').addEventListener('submit', function(){
      document.getElementById('tn_cf_json').value = JSON.stringify(cfs);
    });
  })();
</script>

<!-- Existing Tender Notices -->
<div class="card">
  <h2 style="margin-top:0;">Registered Tenders &amp; Purchase Notices (<?= count($items) ?>)</h2>
  <?php foreach ($items as $it): ?>
    <div class="admin-list-row">
      <div>
        <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
          <strong style="font-family:monospace;color:var(--primary-color);"><?= e((string)$it['reference_number']) ?></strong>
          <strong><?= e((string)$it['title']) ?></strong>
          <?= cmsModerationStatusBadge((string)($it['moderation_status'] ?? 'published')) ?>
        </div>
        <div style="font-size:0.78rem;color:#78716C;margin-top:2px;">
          <?= e((string)$it['category']) ?> &middot; Stage: <strong><?= e((string)$it['lifecycle_status']) ?></strong> &middot; Deadline: <?= e((string)$it['submission_deadline']) ?>
          &middot; <?= !empty($it['is_published']) ? 'Published' : 'Hidden' ?>
          <?= !empty($it['is_pinned']) ? ' · Pinned' : '' ?>
          <?= isset($it['is_shareable']) && empty($it['is_shareable']) ? ' · Share Off' : '' ?>
        </div>
      </div>
      <div style="display:flex;gap:0.4rem;">
        <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_tender"><input type="hidden" name="id" value="<?= (int)$it['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
        <a href="?edit_id=<?= (int)$it['id'] ?>" class="btn-primary btn-sm">Edit</a>
        <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_tender"><input type="hidden" name="id" value="<?= (int)$it['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
      </div>
    </div>
  <?php endforeach; ?>
</div>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
