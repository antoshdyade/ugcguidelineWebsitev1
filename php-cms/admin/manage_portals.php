<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireLogin();
$canPlacements = canAccessResource($user, 'placements');
$canGrievances = canAccessResource($user, 'grievances');
if (!$canPlacements && !$canGrievances) {
    http_response_code(403);
    exit('Access Denied: Insufficient RBAC privileges for Placements or Grievances.');
}

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$tab = (string)($_GET['tab'] ?? ($canPlacements ? 'placements' : 'grievances'));
if ($tab === 'placements' && !$canPlacements) $tab = 'grievances';
if ($tab === 'grievances' && !$canGrievances) $tab = 'placements';

// CSV Export for Grievance Moderation Log (before any HTML)
if ($canGrievances && $tab === 'grievances' && !empty($_GET['export_csv'])) {
    $rows = $pdo->query('SELECT ticket_code, submitted_at, complainant_name, email, phone, reporter_role, category, urgency, is_anonymous, subject, status, resolution_note, updated_at FROM grievances ORDER BY id DESC')->fetchAll();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="svcoer-grievance-log-' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Ticket Code', 'Submitted At', 'Reporter Name', 'Email', 'Phone', 'Role', 'Category', 'Urgency', 'Anonymous', 'Subject', 'Status', 'Resolution Remarks', 'Updated At']);
    foreach ($rows as $r) {
        fputcsv($out, [
            $r['ticket_code'],
            $r['submitted_at'],
            !empty($r['is_anonymous']) ? '[CONFIDENTIAL] ' . $r['complainant_name'] : $r['complainant_name'],
            $r['email'],
            $r['phone'],
            $r['reporter_role'],
            $r['category'],
            $r['urgency'],
            !empty($r['is_anonymous']) ? 'Yes' : 'No',
            $r['subject'],
            $r['status'],
            $r['resolution_note'],
            $r['updated_at'],
        ]);
    }
    fclose($out);
    exit;
}

$msg = '';
$err = '';

$drives = getPlacementDrives($pdo);
$intakePrograms = getSanctionedIntakePrograms($pdo);
$gCfg = getGrievancePortalConfig($pdo);

function saveKvArray(PDO $pdo, string $key, array $data): void
{
    $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
        ->execute([$key, json_encode(array_values($data), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = (string)($_POST['action'] ?? '');

    if ($canPlacements && $action === 'save_placement_summary') {
        $tab = 'placements';
        $sum = [
            'summaryNote'      => trim((string)($_POST['summaryNote'] ?? '')),
            'coordinatorName'  => trim((string)($_POST['coordinatorName'] ?? '')),
            'coordinatorEmail' => trim((string)($_POST['coordinatorEmail'] ?? '')),
            'coordinatorPhone' => trim((string)($_POST['coordinatorPhone'] ?? '')),
            'recruiters'       => trim((string)($_POST['recruiters'] ?? '')),
        ];
        $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('placements_summary', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
            ->execute([json_encode($sum, JSON_UNESCAPED_UNICODE)]);
        if ($sum['recruiters'] !== '') {
            $pdo->prepare('UPDATE site_settings SET recruiters = ? WHERE id = 1')->execute([$sum['recruiters']]);
        }
        logAudit($pdo, $user, 'UPDATE_PLACEMENTS_SUMMARY', 'Placements', $sum['coordinatorName']);
        $msg = 'T&P Coordinator, Recruiters Directory & Overview updated.';
    } elseif ($canPlacements && $action === 'save_stat') {
        $tab = 'placements';
        $sid = (int)($_POST['id'] ?? 0);
        $vals = [
            trim((string)$_POST['academic_year']),
            trim((string)$_POST['branch']),
            (int)$_POST['eligible_students'],
            (int)$_POST['placed_students'],
            (float)$_POST['highest_package_lpa'],
            (float)$_POST['average_package_lpa'],
            trim((string)$_POST['top_recruiters_list']),
        ];
        if ($sid > 0) {
            $pdo->prepare('UPDATE placement_stats SET academic_year=?, branch=?, eligible_students=?, placed_students=?, highest_package_lpa=?, average_package_lpa=?, top_recruiters_list=? WHERE id=?')
                ->execute(array_merge($vals, [$sid]));
            $msg = 'Placement stat row updated.';
        } else {
            $next = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM placement_stats')->fetchColumn()) + 1;
            $pdo->prepare('INSERT INTO placement_stats (academic_year, branch, eligible_students, placed_students, highest_package_lpa, average_package_lpa, top_recruiters_list, sort_order) VALUES (?,?,?,?,?,?,?,?)')
                ->execute(array_merge($vals, [$next]));
            $msg = 'Placement stat row added.';
        }
    } elseif ($canPlacements && $action === 'move_stat' && !empty($_POST['id'])) {
        $tab = 'placements';
        swapSortOrder($pdo, 'placement_stats', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up', null, null, 'id ASC');
        $msg = 'Placement stat order updated.';
    } elseif ($canPlacements && $action === 'delete_stat' && !empty($_POST['id'])) {
        $tab = 'placements';
        $pdo->prepare('DELETE FROM placement_stats WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Placement stat row deleted.';
    } elseif ($canPlacements && $action === 'save_drive') {
        $tab = 'placements';
        $idx = isset($_POST['drive_idx']) && $_POST['drive_idx'] !== '' ? (int)$_POST['drive_idx'] : -1;
        $newDrive = [
            'id'               => ($idx >= 0 && isset($drives[$idx]['id'])) ? $drives[$idx]['id'] : ('drv-' . time()),
            'company'          => trim((string)($_POST['company'] ?? '')),
            'roleTitle'        => trim((string)($_POST['roleTitle'] ?? '')),
            'packageLpa'       => trim((string)($_POST['packageLpa'] ?? '')),
            'eligibleBranches' => trim((string)($_POST['eligibleBranches'] ?? '')),
            'driveDate'        => trim((string)($_POST['driveDate'] ?? '')),
            'venue'            => trim((string)($_POST['venue'] ?? '')),
            'status'           => trim((string)($_POST['status'] ?? 'Upcoming')),
            'registrationUrl'  => trim((string)($_POST['registrationUrl'] ?? '')),
        ];
        if ($newDrive['company'] === '') {
            $err = 'Company name is required for a campus drive.';
        } else {
            if ($idx >= 0 && isset($drives[$idx])) {
                $drives[$idx] = $newDrive;
                $msg = 'Campus placement drive updated.';
            } else {
                $drives[] = $newDrive;
                $msg = 'Campus placement drive added.';
            }
            saveKvArray($pdo, 'placement_upcoming_drives', $drives);
        }
    } elseif ($canPlacements && $action === 'delete_drive') {
        $tab = 'placements';
        $idx = (int)($_POST['drive_idx'] ?? -1);
        if (isset($drives[$idx])) {
            array_splice($drives, $idx, 1);
            saveKvArray($pdo, 'placement_upcoming_drives', $drives);
            $msg = 'Campus drive deleted.';
        }
    } elseif ($canPlacements && $action === 'save_intake') {
        $tab = 'placements';
        $idx = isset($_POST['intake_idx']) && $_POST['intake_idx'] !== '' ? (int)$_POST['intake_idx'] : -1;
        $newRow = [
            'id'          => ($idx >= 0 && isset($intakePrograms[$idx]['id'])) ? $intakePrograms[$idx]['id'] : ('in-' . time()),
            'degreeLevel' => trim((string)($_POST['degreeLevel'] ?? 'UG (B.Tech)')),
            'programName' => trim((string)($_POST['programName'] ?? '')),
            'code'        => trim((string)($_POST['code'] ?? '')),
            'intake'      => max(0, (int)($_POST['intake'] ?? 60)),
            'nbaStatus'   => trim((string)($_POST['nbaStatus'] ?? 'AICTE Approved')),
            'annualFee'   => trim((string)($_POST['annualFee'] ?? '')),
        ];
        if ($newRow['programName'] === '') {
            $err = 'Program / Branch Name is required.';
        } else {
            if ($idx >= 0 && isset($intakePrograms[$idx])) {
                $intakePrograms[$idx] = $newRow;
                $msg = 'Sanctioned intake row updated.';
            } else {
                $intakePrograms[] = $newRow;
                $msg = 'Sanctioned intake row added.';
            }
            saveKvArray($pdo, 'sanctioned_intake_programs', $intakePrograms);
        }
    } elseif ($canPlacements && $action === 'move_intake') {
        $tab = 'placements';
        $idx = (int)($_POST['intake_idx'] ?? -1);
        $swap = $idx + (($_POST['dir'] ?? 'up') === 'down' ? 1 : -1);
        if (isset($intakePrograms[$idx], $intakePrograms[$swap])) {
            $tmp = $intakePrograms[$idx];
            $intakePrograms[$idx] = $intakePrograms[$swap];
            $intakePrograms[$swap] = $tmp;
            saveKvArray($pdo, 'sanctioned_intake_programs', $intakePrograms);
            $msg = 'Intake program order updated.';
        }
    } elseif ($canPlacements && $action === 'delete_intake') {
        $tab = 'placements';
        $idx = (int)($_POST['intake_idx'] ?? -1);
        if (isset($intakePrograms[$idx])) {
            array_splice($intakePrograms, $idx, 1);
            saveKvArray($pdo, 'sanctioned_intake_programs', $intakePrograms);
            $msg = 'Sanctioned intake row deleted.';
        }
    } elseif ($canPlacements && $action === 'save_story') {
        $tab = 'placements';
        $srId = (int)($_POST['story_id'] ?? 0);
        $photoUrl = trim((string)($_POST['existing_photo'] ?? 'assets/images/principal.jpg'));
        if (!empty($_FILES['photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['photo'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $photoUrl = $up['file_url'];
        }
        if ($err === '') {
            if ($srId > 0) {
                $pdo->prepare('UPDATE placement_stories SET student_name=?, batch_year=?, branch=?, company=?, role_title=?, package_lpa=?, photo_url=?, quote_text=? WHERE id=?')
                    ->execute([
                        trim((string)$_POST['student_name']),
                        trim((string)$_POST['batch_year']),
                        trim((string)$_POST['branch']),
                        trim((string)$_POST['company']),
                        trim((string)$_POST['role_title']),
                        trim((string)$_POST['package_lpa']),
                        $photoUrl,
                        trim((string)$_POST['quote_text']),
                        $srId,
                    ]);
                $msg = 'Placed student story updated.';
            } else {
                $next = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM placement_stories')->fetchColumn()) + 1;
                $pdo->prepare('INSERT INTO placement_stories (student_name, batch_year, branch, company, role_title, package_lpa, photo_url, quote_text, sort_order) VALUES (?,?,?,?,?,?,?,?,?)')
                    ->execute([
                        trim((string)$_POST['student_name']),
                        trim((string)$_POST['batch_year']),
                        trim((string)$_POST['branch']),
                        trim((string)$_POST['company']),
                        trim((string)$_POST['role_title']),
                        trim((string)$_POST['package_lpa']),
                        $photoUrl,
                        trim((string)$_POST['quote_text']),
                        $next,
                    ]);
                $msg = 'Placed student story added.';
            }
        }
    } elseif ($canPlacements && $action === 'move_story' && !empty($_POST['id'])) {
        $tab = 'placements';
        swapSortOrder($pdo, 'placement_stories', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up', null, null, 'id ASC');
        $msg = 'Student highlight order updated.';
    } elseif ($canPlacements && $action === 'delete_story' && !empty($_POST['id'])) {
        $tab = 'placements';
        $pdo->prepare('DELETE FROM placement_stories WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Placed student story removed.';
    } elseif ($canGrievances && $action === 'update_grievance' && !empty($_POST['id'])) {
        $tab = 'grievances';
        $pdo->prepare('UPDATE grievances SET status = ?, resolution_note = ?, updated_at = ? WHERE id = ?')
            ->execute([trim((string)$_POST['status']), trim((string)$_POST['resolution_note']), date('Y-m-d H:i'), (int)$_POST['id']]);
        logAudit($pdo, $user, 'UPDATE_GRIEVANCE', 'Grievance', 'Ticket #' . (int)$_POST['id']);
        $msg = 'Grievance ticket status updated.';
    } elseif ($canGrievances && $action === 'save_grievance_config') {
        $tab = 'grievances';
        $ombPhoto = trim((string)($_POST['existing_ombudsperson_photo'] ?? ($gCfg['ombudspersonPhoto'] ?? 'assets/images/principal.jpg')));
        if (!empty($_FILES['ombudsperson_photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['ombudsperson_photo'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $ombPhoto = $up['file_url'];
        }
        if ($err === '') {
            $gCfg['heroBadge']             = trim((string)($_POST['heroBadge'] ?? $gCfg['heroBadge']));
            $gCfg['heroTitle']             = trim((string)($_POST['heroTitle'] ?? $gCfg['heroTitle']));
            $gCfg['heroSubtitle']          = trim((string)($_POST['heroSubtitle'] ?? $gCfg['heroSubtitle']));
            $gCfg['ombudspersonName']      = trim((string)($_POST['ombudspersonName'] ?? ''));
            $gCfg['ombudspersonTitle']     = trim((string)($_POST['ombudspersonTitle'] ?? ''));
            $gCfg['ombudspersonEmail']     = trim((string)($_POST['ombudspersonEmail'] ?? ''));
            $gCfg['ombudspersonPhone']     = trim((string)($_POST['ombudspersonPhone'] ?? ''));
            $gCfg['ombudspersonPhoto']     = $ombPhoto;
            $gCfg['antiRaggingSquadPhone'] = trim((string)($_POST['antiRaggingSquadPhone'] ?? ''));
            $gCfg['womenCellOfficer']      = trim((string)($_POST['womenCellOfficer'] ?? ''));
            $gCfg['womenCellPhone']        = trim((string)($_POST['womenCellPhone'] ?? ''));
            $gCfg['ugcUndertakingUrl']     = trim((string)($_POST['ugcUndertakingUrl'] ?? ''));
            $gCfg['charterHtml']           = (string)($_POST['charterHtml'] ?? '');
            saveGrievancePortalConfig($pdo, $gCfg);
            logAudit($pdo, $user, 'UPDATE_GRIEVANCE_CONFIG', 'Grievance Portal', $gCfg['ombudspersonName']);
            $msg = 'SGRC Charter, Ombudsperson & Helpline details saved.';
        }
    } elseif ($canGrievances && $action === 'save_committee_member') {
        $tab = 'grievances';
        $members = is_array($gCfg['committeeMembers'] ?? null) ? $gCfg['committeeMembers'] : [];
        $idx = isset($_POST['member_idx']) && $_POST['member_idx'] !== '' ? (int)$_POST['member_idx'] : -1;
        $mPhoto = trim((string)($_POST['existing_member_photo'] ?? 'assets/images/principal.jpg'));
        if (!empty($_FILES['member_photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['member_photo'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $mPhoto = $up['file_url'];
        }
        if ($err === '') {
            $mRow = [
                'id'          => ($idx >= 0 && isset($members[$idx]['id'])) ? $members[$idx]['id'] : ('sgrc-' . time()),
                'name'        => trim((string)($_POST['name'] ?? '')),
                'role'        => trim((string)($_POST['role'] ?? 'SGRC Member')),
                'designation' => trim((string)($_POST['designation'] ?? '')),
                'department'  => trim((string)($_POST['department'] ?? '')),
                'email'       => trim((string)($_POST['email'] ?? '')),
                'phone'       => trim((string)($_POST['phone'] ?? '')),
                'photoUrl'    => $mPhoto,
            ];
            if ($idx >= 0 && isset($members[$idx])) {
                $members[$idx] = $mRow;
                $msg = 'SGRC committee member updated.';
            } else {
                $members[] = $mRow;
                $msg = 'SGRC committee member added.';
            }
            $gCfg['committeeMembers'] = $members;
            saveGrievancePortalConfig($pdo, $gCfg);
        }
    } elseif ($canGrievances && $action === 'move_committee_member') {
        $tab = 'grievances';
        $members = is_array($gCfg['committeeMembers'] ?? null) ? $gCfg['committeeMembers'] : [];
        $idx = (int)($_POST['member_idx'] ?? -1);
        $swap = $idx + (($_POST['dir'] ?? 'up') === 'down' ? 1 : -1);
        if (isset($members[$idx], $members[$swap])) {
            $tmp = $members[$idx];
            $members[$idx] = $members[$swap];
            $members[$swap] = $tmp;
            $gCfg['committeeMembers'] = $members;
            saveGrievancePortalConfig($pdo, $gCfg);
            $msg = 'Committee member order updated.';
        }
    } elseif ($canGrievances && $action === 'delete_committee_member') {
        $tab = 'grievances';
        $members = is_array($gCfg['committeeMembers'] ?? null) ? $gCfg['committeeMembers'] : [];
        $idx = (int)($_POST['member_idx'] ?? -1);
        if (isset($members[$idx])) {
            array_splice($members, $idx, 1);
            $gCfg['committeeMembers'] = $members;
            saveGrievancePortalConfig($pdo, $gCfg);
            $msg = 'Committee member removed.';
        }
    }
}

$settings = getSiteSettings($pdo);
$summary = ['summaryNote' => '', 'coordinatorName' => 'Dr. S. B. Kulkarni', 'coordinatorEmail' => 'tnp@coe.sveri.ac.in', 'coordinatorPhone' => '+91-02186-216063', 'recruiters' => $settings['recruiters'] ?? ''];
$rawSum = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'placements_summary' LIMIT 1")->fetchColumn();
if ($rawSum) {
    $dec = json_decode((string)$rawSum, true);
    if (is_array($dec)) $summary = array_merge($summary, array_filter($dec, static fn($v) => $v !== null));
}

$stats = $pdo->query('SELECT * FROM placement_stats ORDER BY sort_order ASC, id ASC')->fetchAll();
$stories = $pdo->query('SELECT * FROM placement_stories ORDER BY sort_order ASC, id ASC')->fetchAll();
$grievances = $pdo->query('SELECT * FROM grievances ORDER BY id DESC')->fetchAll();

$editingStat = null;
if (!empty($_GET['edit_stat'])) {
    foreach ($stats as $st) {
        if ((int)$st['id'] === (int)$_GET['edit_stat']) {
            $editingStat = $st;
            break;
        }
    }
}
$editingStory = null;
if (!empty($_GET['edit_story'])) {
    foreach ($stories as $sr) {
        if ((int)$sr['id'] === (int)$_GET['edit_story']) {
            $editingStory = $sr;
            break;
        }
    }
}
$editDriveIdx = isset($_GET['edit_drive']) ? (int)$_GET['edit_drive'] : -1;
$editingDrive = ($editDriveIdx >= 0 && isset($drives[$editDriveIdx])) ? $drives[$editDriveIdx] : null;

$editIntakeIdx = isset($_GET['edit_intake']) ? (int)$_GET['edit_intake'] : -1;
$editingIntake = ($editIntakeIdx >= 0 && isset($intakePrograms[$editIntakeIdx])) ? $intakePrograms[$editIntakeIdx] : null;

$members = is_array($gCfg['committeeMembers'] ?? null) ? $gCfg['committeeMembers'] : [];
$editMemberIdx = isset($_GET['edit_member']) ? (int)$_GET['edit_member'] : -1;
$editingMember = ($editMemberIdx >= 0 && isset($members[$editMemberIdx])) ? $members[$editMemberIdx] : null;

$adminPageTitle = 'Placements (T&P), Sanctioned Intake & SGRC Grievance Desk';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="admin-subtabs">
  <?php if ($canPlacements): ?>
    <a href="?tab=placements" class="admin-subtab <?= $tab === 'placements' ? 'is-active' : '' ?>">Placements, Drives &amp; Intake Matrix</a>
  <?php endif; ?>
  <?php if ($canGrievances): ?>
    <a href="?tab=grievances" class="admin-subtab <?= $tab === 'grievances' ? 'is-active' : '' ?>">Grievance &amp; Anti-Ragging Portal (<?= count($grievances) ?>)</a>
  <?php endif; ?>
</div>

<?php if ($tab === 'placements' && $canPlacements): ?>
  <form method="post" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">T&amp;P Coordinator, Overview &amp; Esteemed Recruiters Directory</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_placement_summary">
    <div class="grid-3" style="margin-bottom:0.5rem;">
      <input type="text" name="coordinatorName" value="<?= e((string)$summary['coordinatorName']) ?>" placeholder="T&P Officer Name" style="padding:0.5rem;">
      <input type="email" name="coordinatorEmail" value="<?= e((string)$summary['coordinatorEmail']) ?>" placeholder="Email" style="padding:0.5rem;">
      <input type="text" name="coordinatorPhone" value="<?= e((string)$summary['coordinatorPhone']) ?>" placeholder="Phone" style="padding:0.5rem;">
    </div>
    <textarea name="summaryNote" rows="2" placeholder="Placement summary statement..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e((string)$summary['summaryNote']) ?></textarea>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.5rem;">Esteemed Recruiters List (comma-separated badges shown on Placements &amp; Homepage)
      <input type="text" name="recruiters" value="<?= e((string)($summary['recruiters'] ?? '')) ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
    </label>
    <button type="submit" class="btn-primary">Update T&amp;P Overview &amp; Recruiters</button>
  </form>

  <!-- Add / Edit Branch-Wise Placement Statistic -->
  <form method="post" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;"><?= $editingStat ? 'Edit Branch Statistic: ' . e($editingStat['branch']) : 'Add Branch-Wise Placement Statistic' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_stat">
    <input type="hidden" name="id" value="<?= (int)($editingStat['id'] ?? 0) ?>">
    <div class="grid-4" style="margin-bottom:0.5rem;">
      <input type="text" name="academic_year" required value="<?= e((string)($editingStat['academic_year'] ?? '2025-26')) ?>" placeholder="Academic Year" style="padding:0.5rem;">
      <input type="text" name="branch" required value="<?= e((string)($editingStat['branch'] ?? '')) ?>" placeholder="Branch / Department" style="padding:0.5rem;">
      <input type="number" name="eligible_students" required value="<?= (int)($editingStat['eligible_students'] ?? 0) ?>" placeholder="Eligible" style="padding:0.5rem;">
      <input type="number" name="placed_students" required value="<?= (int)($editingStat['placed_students'] ?? 0) ?>" placeholder="Placed" style="padding:0.5rem;">
      <input type="number" step="0.01" name="highest_package_lpa" required value="<?= e((string)($editingStat['highest_package_lpa'] ?? '')) ?>" placeholder="Highest LPA" style="padding:0.5rem;">
      <input type="number" step="0.01" name="average_package_lpa" required value="<?= e((string)($editingStat['average_package_lpa'] ?? '')) ?>" placeholder="Average LPA" style="padding:0.5rem;">
      <input type="text" name="top_recruiters_list" value="<?= e((string)($editingStat['top_recruiters_list'] ?? '')) ?>" placeholder="Top Recruiters" style="grid-column:span 2;padding:0.5rem;">
    </div>
    <button type="submit" class="btn-primary"><?= $editingStat ? 'Update Branch Statistic' : 'Add Branch Statistic' ?></button>
    <?php if ($editingStat): ?><a href="?tab=placements" class="btn-outline" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
  </form>

  <!-- Formatted Branch Statistics Table -->
  <div class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Published Branch-Wise Placement Statistics (<?= count($stats) ?>)</h2>
    <div class="cms-table-wrap">
      <table class="cms-table cms-table-navy">
        <thead>
          <tr><th>Order</th><th>Year</th><th>Branch</th><th>Eligible</th><th>Placed</th><th>%</th><th>Highest / Avg (LPA)</th><th>Actions</th></tr>
        </thead>
        <tbody>
          <?php foreach ($stats as $st):
            $el = max(0, (int)$st['eligible_students']);
            $pl = max(0, (int)$st['placed_students']);
            $pct = $el > 0 ? round(($pl / $el) * 100, 1) : 0.0;
          ?>
            <tr>
              <td>
                <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_stat"><input type="hidden" name="id" value="<?= (int)$st['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
              </td>
              <td><?= e($st['academic_year']) ?></td>
              <td><strong><?= e($st['branch']) ?></strong></td>
              <td><?= $el ?></td>
              <td><strong><?= $pl ?></strong></td>
              <td><strong><?= e((string)$pct) ?>%</strong></td>
              <td><?= e((string)$st['highest_package_lpa']) ?> / <?= e((string)$st['average_package_lpa']) ?> LPA</td>
              <td style="white-space:nowrap;">
                <a href="?tab=placements&edit_stat=<?= (int)$st['id'] ?>" class="btn-primary btn-sm">Edit</a>
                <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_stat"><input type="hidden" name="id" value="<?= (int)$st['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Upcoming Campus Placement Drives CRUD -->
  <div class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Upcoming Campus Placement Drives (<?= count($drives) ?>)</h2>
    <form method="post" style="background:#FAFAF9;border:1px solid var(--border-color);border-radius:10px;padding:0.9rem;margin-bottom:1rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_drive">
      <input type="hidden" name="drive_idx" value="<?= $editingDrive ? $editDriveIdx : '' ?>">
      <div class="grid-4" style="margin-bottom:0.5rem;">
        <input type="text" name="company" required value="<?= e((string)($editingDrive['company'] ?? '')) ?>" placeholder="Company Name *" style="padding:0.45rem;">
        <input type="text" name="roleTitle" value="<?= e((string)($editingDrive['roleTitle'] ?? '')) ?>" placeholder="Role / Profile" style="padding:0.45rem;">
        <input type="text" name="packageLpa" value="<?= e((string)($editingDrive['packageLpa'] ?? '')) ?>" placeholder="CTC (e.g. 7.0 LPA)" style="padding:0.45rem;">
        <input type="text" name="eligibleBranches" value="<?= e((string)($editingDrive['eligibleBranches'] ?? 'CSE, E&TC, ECS')) ?>" placeholder="Eligible Branches" style="padding:0.45rem;">
        <input type="date" name="driveDate" value="<?= e((string)($editingDrive['driveDate'] ?? date('Y-m-d', strtotime('+10 days')))) ?>" style="padding:0.45rem;">
        <input type="text" name="venue" value="<?= e((string)($editingDrive['venue'] ?? 'Central T&P Auditorium')) ?>" placeholder="Venue" style="padding:0.45rem;">
        <select name="status" style="padding:0.45rem;">
          <?php foreach (['Registrations Open', 'Upcoming', 'Ongoing', 'Completed'] as $ds): ?>
            <option value="<?= e($ds) ?>" <?= ($editingDrive['status'] ?? 'Upcoming') === $ds ? 'selected' : '' ?>><?= e($ds) ?></option>
          <?php endforeach; ?>
        </select>
        <input type="url" name="registrationUrl" value="<?= e((string)($editingDrive['registrationUrl'] ?? '')) ?>" placeholder="Registration URL (Optional)" style="padding:0.45rem;">
      </div>
      <button type="submit" class="btn-primary btn-sm"><?= $editingDrive ? 'Update Drive' : 'Add Campus Drive' ?></button>
      <?php if ($editingDrive): ?><a href="?tab=placements" class="btn-outline btn-sm" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <?php foreach ($drives as $idx => $drv): ?>
      <div class="admin-list-row">
        <div>
          <strong><?= e((string)$drv['company']) ?></strong> · <?= e((string)$drv['roleTitle']) ?> (<?= e((string)$drv['packageLpa']) ?>)
          <div style="font-size:0.78rem;color:#78716C;"><?= e((string)$drv['driveDate']) ?> · <?= e((string)$drv['eligibleBranches']) ?> · <span class="badge badge-ok"><?= e((string)$drv['status']) ?></span></div>
        </div>
        <div style="display:flex;gap:0.4rem;">
          <a href="?tab=placements&edit_drive=<?= $idx ?>" class="btn-primary btn-sm">Edit</a>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_drive"><input type="hidden" name="drive_idx" value="<?= $idx ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

  <!-- AICTE Sanctioned Programs, Intake & FRA Fee Matrix CRUD -->
  <div class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">AICTE Sanctioned Programs, Intake &amp; FRA Fee Matrix (<?= count($intakePrograms) ?>)</h2>
    <form method="post" style="background:#FAFAF9;border:1px solid var(--border-color);border-radius:10px;padding:0.9rem;margin-bottom:1rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_intake">
      <input type="hidden" name="intake_idx" value="<?= $editingIntake ? $editIntakeIdx : '' ?>">
      <div class="grid-3" style="margin-bottom:0.5rem;">
        <select name="degreeLevel" style="padding:0.45rem;">
          <?php foreach (['UG (B.Tech)', 'PG (M.Tech / MBA)', 'Ph.D. Research Center'] as $dl): ?>
            <option value="<?= e($dl) ?>" <?= ($editingIntake['degreeLevel'] ?? 'UG (B.Tech)') === $dl ? 'selected' : '' ?>><?= e($dl) ?></option>
          <?php endforeach; ?>
        </select>
        <input type="text" name="programName" required value="<?= e((string)($editingIntake['programName'] ?? '')) ?>" placeholder="Program / Branch Name *" style="padding:0.45rem;">
        <input type="text" name="code" value="<?= e((string)($editingIntake['code'] ?? '')) ?>" placeholder="DTE Choice Code" style="padding:0.45rem;">
        <input type="number" name="intake" min="0" value="<?= (int)($editingIntake['intake'] ?? 60) ?>" placeholder="Intake" style="padding:0.45rem;">
        <input type="text" name="nbaStatus" value="<?= e((string)($editingIntake['nbaStatus'] ?? 'AICTE Approved')) ?>" placeholder="NBA / AICTE Status" style="padding:0.45rem;">
        <input type="text" name="annualFee" value="<?= e((string)($editingIntake['annualFee'] ?? 'Rs. 1,14,000')) ?>" placeholder="FRA Fee" style="padding:0.45rem;">
      </div>
      <button type="submit" class="btn-primary btn-sm"><?= $editingIntake ? 'Update Program Row' : 'Add Program Row' ?></button>
      <?php if ($editingIntake): ?><a href="?tab=placements" class="btn-outline btn-sm" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <div class="cms-table-wrap">
      <table class="cms-table cms-table-navy">
        <thead><tr><th>Order</th><th>Level</th><th>Program Name</th><th>DTE Code</th><th>Intake</th><th>Accreditation</th><th>FRA Fee</th><th>Actions</th></tr></thead>
        <tbody>
          <?php foreach ($intakePrograms as $idx => $prog): ?>
            <tr>
              <td>
                <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_intake"><input type="hidden" name="intake_idx" value="<?= $idx ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
              </td>
              <td><?= e((string)$prog['degreeLevel']) ?></td>
              <td><strong><?= e((string)$prog['programName']) ?></strong></td>
              <td><code><?= e((string)$prog['code']) ?></code></td>
              <td><strong><?= (int)$prog['intake'] ?></strong></td>
              <td><?= e((string)$prog['nbaStatus']) ?></td>
              <td><?= e((string)$prog['annualFee']) ?></td>
              <td style="white-space:nowrap;">
                <a href="?tab=placements&edit_intake=<?= $idx ?>" class="btn-primary btn-sm">Edit</a>
                <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_intake"><input type="hidden" name="intake_idx" value="<?= $idx ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Placed Student Highlights -->
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;"><?= $editingStory ? 'Edit Placed Student Highlight: ' . e($editingStory['student_name']) : 'Add Placed Student Highlight (With 1:1 Photo Crop)' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_story">
    <input type="hidden" name="story_id" value="<?= (int)($editingStory['id'] ?? 0) ?>">
    <input type="hidden" name="existing_photo" value="<?= e((string)($editingStory['photo_url'] ?? 'assets/images/principal.jpg')) ?>">
    <div class="grid-3" style="margin-bottom:0.5rem;">
      <input type="text" name="student_name" required value="<?= e((string)($editingStory['student_name'] ?? '')) ?>" placeholder="Student Full Name" style="padding:0.5rem;">
      <input type="text" name="batch_year" required value="<?= e((string)($editingStory['batch_year'] ?? '2026')) ?>" placeholder="Batch" style="padding:0.5rem;">
      <input type="text" name="branch" required value="<?= e((string)($editingStory['branch'] ?? 'CSE')) ?>" placeholder="Branch" style="padding:0.5rem;">
      <input type="text" name="company" required value="<?= e((string)($editingStory['company'] ?? '')) ?>" placeholder="Company Name" style="padding:0.5rem;">
      <input type="text" name="role_title" required value="<?= e((string)($editingStory['role_title'] ?? '')) ?>" placeholder="Offered Role" style="padding:0.5rem;">
      <input type="text" name="package_lpa" required value="<?= e((string)($editingStory['package_lpa'] ?? '')) ?>" placeholder="Package (e.g. 14.5 LPA)" style="padding:0.5rem;">
    </div>
    <textarea name="quote_text" rows="2" placeholder="Student quote / testimonial..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e((string)($editingStory['quote_text'] ?? '')) ?></textarea>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Student Photo (1:1 Crop): <input type="file" name="photo" data-aspect="1:1" accept="image/jpeg,image/png,image/webp"></label>
    <button type="submit" class="btn-primary"><?= $editingStory ? 'Update Student Highlight' : 'Add Student Highlight' ?></button>
    <?php if ($editingStory): ?><a href="?tab=placements" class="btn-outline" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
  </form>

  <div class="card">
    <h2 style="margin-top:0;">Placed Student Highlights</h2>
    <?php foreach ($stories as $sr): ?>
      <div class="admin-list-row">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <img src="<?= e(mediaUrl($sr['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="" style="width:46px;height:46px;border-radius:50%;object-fit:cover;">
          <div>
            <strong><?= e($sr['student_name']) ?> (<?= e($sr['company']) ?> · <?= e($sr['package_lpa']) ?>)</strong>
            <div style="font-size:0.78rem;color:#78716C;"><?= e($sr['role_title']) ?> · <?= e($sr['branch']) ?> <?= e($sr['batch_year']) ?></div>
          </div>
        </div>
        <div style="display:flex;gap:0.4rem;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_story"><input type="hidden" name="id" value="<?= (int)$sr['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
          <a href="?tab=placements&edit_story=<?= (int)$sr['id'] ?>" class="btn-primary btn-sm">Edit</a>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_story"><input type="hidden" name="id" value="<?= (int)$sr['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($tab === 'grievances' && $canGrievances): ?>
  <!-- Grievance Moderation Queue with Attachment & CSV Export -->
  <div class="card" style="margin-bottom:1.25rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
      <h2 style="margin:0;">Online Grievance Tickets &amp; Committee Resolution (<?= count($grievances) ?>)</h2>
      <a href="?tab=grievances&export_csv=1" class="btn-secondary btn-sm">Export Grievance Register (CSV) &darr;</a>
    </div>
    <?php if (empty($grievances)): ?>
      <p style="color:#78716C;">No grievance tickets logged yet.</p>
    <?php else: ?>
      <div class="cms-table-wrap">
        <table class="cms-table cms-table-navy">
          <thead><tr><th>Ticket</th><th>Complainant</th><th>Subject, Urgency &amp; Evidence</th><th>Update Status &amp; Resolution</th></tr></thead>
          <tbody>
            <?php foreach ($grievances as $g): ?>
              <tr>
                <td>
                  <strong><?= e($g['ticket_code']) ?></strong><br>
                  <span class="badge <?= $g['urgency'] === 'Urgent' ? 'badge-warn' : 'badge-ok' ?>"><?= e($g['urgency']) ?></span><br>
                  <small><?= e($g['submitted_at']) ?></small>
                </td>
                <td>
                  <strong><?= e($g['complainant_name']) ?></strong>
                  <?php if (!empty($g['is_anonymous'])): ?><br><span class="badge badge-warn">Confidential</span><?php endif; ?>
                  <br><small><?= e($g['reporter_role']) ?></small>
                  <br><small><?= e($g['email']) ?></small>
                </td>
                <td>
                  <strong><?= e($g['subject']) ?></strong> (<?= e($g['category']) ?>)<br>
                  <small><?= e($g['description']) ?></small>
                  <?php if (!empty($g['attachment_url'])): ?>
                    <div style="margin-top:0.35rem;"><a href="<?= e(baseUrl((string)$g['attachment_url'])) ?>" target="_blank" class="btn-outline btn-sm">View Evidence Attachment &#8599;</a></div>
                  <?php endif; ?>
                </td>
                <td>
                  <form method="post" style="display:flex;flex-direction:column;gap:0.35rem;min-width:210px;">
                    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                    <input type="hidden" name="action" value="update_grievance">
                    <input type="hidden" name="id" value="<?= (int)$g['id'] ?>">
                    <select name="status" style="padding:4px 6px;">
                      <?php foreach (['Open','Under Review','Escalated','Resolved'] as $gs): ?>
                        <option value="<?= e($gs) ?>" <?= $g['status'] === $gs ? 'selected' : '' ?>><?= e($gs) ?></option>
                      <?php endforeach; ?>
                    </select>
                    <input type="text" name="resolution_note" value="<?= e((string)$g['resolution_note']) ?>" placeholder="Committee remarks..." style="padding:4px 6px;">
                    <button type="submit" class="btn-primary btn-sm">Update Ticket</button>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>

  <!-- SGRC Charter, Ombudsperson & 24x7 Helplines Config -->
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">SGRC Portal, Ombudsperson &amp; Anti-Ragging Helpline Settings</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_grievance_config">
    <input type="hidden" name="existing_ombudsperson_photo" value="<?= e((string)$gCfg['ombudspersonPhoto']) ?>">

    <div class="grid-3" style="margin-bottom:0.55rem;">
      <label style="font-size:0.8rem;font-weight:600;">Portal Badge
        <input type="text" name="heroBadge" value="<?= e((string)$gCfg['heroBadge']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Portal Heading
        <input type="text" name="heroTitle" value="<?= e((string)$gCfg['heroTitle']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">UGC Undertaking Portal URL
        <input type="url" name="ugcUndertakingUrl" value="<?= e((string)$gCfg['ugcUndertakingUrl']) ?>" style="width:100%;padding:0.45rem;">
      </label>
    </div>
    <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.65rem;">Portal Subtitle
      <input type="text" name="heroSubtitle" value="<?= e((string)$gCfg['heroSubtitle']) ?>" style="width:100%;padding:0.45rem;">
    </label>

    <div class="grid-3" style="margin-bottom:0.65rem;">
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Full Name
        <input type="text" name="ombudspersonName" value="<?= e((string)$gCfg['ombudspersonName']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Designation
        <input type="text" name="ombudspersonTitle" value="<?= e((string)$gCfg['ombudspersonTitle']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Photo (1:1 Crop)
        <input type="file" name="ombudsperson_photo" data-aspect="1:1" accept="image/jpeg,image/png,image/webp" style="width:100%;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Email
        <input type="email" name="ombudspersonEmail" value="<?= e((string)$gCfg['ombudspersonEmail']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Phone
        <input type="text" name="ombudspersonPhone" value="<?= e((string)$gCfg['ombudspersonPhone']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Campus Anti-Ragging Squad Helpline
        <input type="text" name="antiRaggingSquadPhone" value="<?= e((string)$gCfg['antiRaggingSquadPhone']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Women Cell / ICC Presiding Officer
        <input type="text" name="womenCellOfficer" value="<?= e((string)$gCfg['womenCellOfficer']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">ICC Helpline Phone
        <input type="text" name="womenCellPhone" value="<?= e((string)$gCfg['womenCellPhone']) ?>" style="width:100%;padding:0.45rem;">
      </label>
    </div>

    <div style="margin-bottom:0.85rem;">
      <strong style="display:block;font-size:0.82rem;margin-bottom:0.35rem;">Statutory Escalation SLA Matrix &amp; SGRC Charter (Visual Rich Editor)</strong>
      <textarea name="charterHtml" class="rich-editor" data-csrf="<?= e(csrfToken()) ?>"><?= e((string)$gCfg['charterHtml']) ?></textarea>
    </div>
    <button type="submit" class="btn-primary">Save SGRC Charter &amp; Ombudsperson Config</button>
  </form>

  <!-- SGRC & Anti-Ragging Committee Photo Cards CRUD -->
  <div class="card">
    <h2 style="margin-top:0;">SGRC &amp; Anti-Ragging Squad Committee Photo Cards (<?= count($members) ?>)</h2>
    <form method="post" enctype="multipart/form-data" style="background:#FAFAF9;border:1px solid var(--border-color);border-radius:10px;padding:0.9rem;margin-bottom:1rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_committee_member">
      <input type="hidden" name="member_idx" value="<?= $editingMember ? $editMemberIdx : '' ?>">
      <input type="hidden" name="existing_member_photo" value="<?= e((string)($editingMember['photoUrl'] ?? 'assets/images/principal.jpg')) ?>">
      <div class="grid-3" style="margin-bottom:0.5rem;">
        <input type="text" name="name" required value="<?= e((string)($editingMember['name'] ?? '')) ?>" placeholder="Member Name *" style="padding:0.45rem;">
        <input type="text" name="role" required value="<?= e((string)($editingMember['role'] ?? 'SGRC Member')) ?>" placeholder="Committee Role *" style="padding:0.45rem;">
        <input type="text" name="designation" value="<?= e((string)($editingMember['designation'] ?? '')) ?>" placeholder="Designation" style="padding:0.45rem;">
        <input type="text" name="department" value="<?= e((string)($editingMember['department'] ?? '')) ?>" placeholder="Department" style="padding:0.45rem;">
        <input type="email" name="email" value="<?= e((string)($editingMember['email'] ?? '')) ?>" placeholder="Email" style="padding:0.45rem;">
        <input type="text" name="phone" value="<?= e((string)($editingMember['phone'] ?? '')) ?>" placeholder="Phone" style="padding:0.45rem;">
      </div>
      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.6rem;">Member Portrait Photo (1:1 Crop): <input type="file" name="member_photo" data-aspect="1:1" accept="image/jpeg,image/png,image/webp"></label>
      <button type="submit" class="btn-primary btn-sm"><?= $editingMember ? 'Update Committee Member' : 'Add Committee Member' ?></button>
      <?php if ($editingMember): ?><a href="?tab=grievances" class="btn-outline btn-sm" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <?php foreach ($members as $idx => $cm): ?>
      <div class="admin-list-row">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <img src="<?= e(mediaUrl((string)($cm['photoUrl'] ?? ''), 'assets/images/principal.jpg')) ?>" alt="" style="width:46px;height:46px;border-radius:10px;object-fit:cover;">
          <div>
            <strong><?= e((string)$cm['name']) ?></strong> · <span class="badge badge-ok"><?= e((string)$cm['role']) ?></span>
            <div style="font-size:0.78rem;color:#78716C;"><?= e((string)$cm['designation']) ?> · <?= e((string)$cm['department']) ?> · <?= e((string)$cm['phone']) ?></div>
          </div>
        </div>
        <div style="display:flex;gap:0.4rem;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_committee_member"><input type="hidden" name="member_idx" value="<?= $idx ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
          <a href="?tab=grievances&edit_member=<?= $idx ?>" class="btn-primary btn-sm">Edit</a>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_committee_member"><input type="hidden" name="member_idx" value="<?= $idx ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
