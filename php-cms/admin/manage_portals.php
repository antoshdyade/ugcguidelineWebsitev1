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

$msg = '';
$err = '';

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
        ];
        $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('placements_summary', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
            ->execute([json_encode($sum, JSON_UNESCAPED_UNICODE)]);
        logAudit($pdo, $user, 'UPDATE_PLACEMENTS_SUMMARY', 'Placements', $sum['coordinatorName']);
        $msg = 'T&P Coordinator & Overview updated.';
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
    } elseif ($canPlacements && $action === 'save_story') {
        $tab = 'placements';
        $photoUrl = trim((string)($_POST['existing_photo'] ?? 'assets/images/principal.jpg'));
        if (!empty($_FILES['photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['photo'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $photoUrl = $up['file_url'];
        }
        if ($err === '') {
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
    }
}

$summary = ['summaryNote' => '', 'coordinatorName' => 'Dr. S. B. Kulkarni', 'coordinatorEmail' => 'tnp@coe.sveri.ac.in', 'coordinatorPhone' => '+91-02186-216063'];
$rawSum = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'placements_summary' LIMIT 1")->fetchColumn();
if ($rawSum) {
    $dec = json_decode((string)$rawSum, true);
    if (is_array($dec)) $summary = array_merge($summary, $dec);
}

$stats = $pdo->query('SELECT * FROM placement_stats ORDER BY sort_order ASC, id ASC')->fetchAll();
$stories = $pdo->query('SELECT * FROM placement_stories ORDER BY sort_order ASC, id ASC')->fetchAll();
$grievances = $pdo->query('SELECT * FROM grievances ORDER BY id DESC')->fetchAll();

$adminPageTitle = 'Placements (T&P) & Grievance Redressal Desk';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="admin-subtabs">
  <?php if ($canPlacements): ?>
    <a href="?tab=placements" class="admin-subtab <?= $tab === 'placements' ? 'is-active' : '' ?>">Training &amp; Placement Desk</a>
  <?php endif; ?>
  <?php if ($canGrievances): ?>
    <a href="?tab=grievances" class="admin-subtab <?= $tab === 'grievances' ? 'is-active' : '' ?>">Grievance Redressal Queue (<?= count($grievances) ?>)</a>
  <?php endif; ?>
</div>

<?php if ($tab === 'placements' && $canPlacements): ?>
  <form method="post" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">T&amp;P Coordinator &amp; Summary Statement</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_placement_summary">
    <div class="grid-3" style="margin-bottom:0.5rem;">
      <input type="text" name="coordinatorName" value="<?= e((string)$summary['coordinatorName']) ?>" placeholder="T&P Officer Name" style="padding:0.5rem;">
      <input type="email" name="coordinatorEmail" value="<?= e((string)$summary['coordinatorEmail']) ?>" placeholder="Email" style="padding:0.5rem;">
      <input type="text" name="coordinatorPhone" value="<?= e((string)$summary['coordinatorPhone']) ?>" placeholder="Phone" style="padding:0.5rem;">
    </div>
    <textarea name="summaryNote" rows="2" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e((string)$summary['summaryNote']) ?></textarea>
    <button type="submit" class="btn-primary">Update T&amp;P Overview</button>
  </form>

  <form method="post" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Add Branch-Wise Placement Statistic</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_stat">
    <div class="grid-4" style="margin-bottom:0.5rem;">
      <input type="text" name="academic_year" required value="2025-26" placeholder="Academic Year" style="padding:0.5rem;">
      <input type="text" name="branch" required placeholder="Branch / Department" style="padding:0.5rem;">
      <input type="number" name="eligible_students" required placeholder="Eligible" style="padding:0.5rem;">
      <input type="number" name="placed_students" required placeholder="Placed" style="padding:0.5rem;">
      <input type="number" step="0.01" name="highest_package_lpa" required placeholder="Highest LPA" style="padding:0.5rem;">
      <input type="number" step="0.01" name="average_package_lpa" required placeholder="Average LPA" style="padding:0.5rem;">
      <input type="text" name="top_recruiters_list" placeholder="Top Recruiters" style="grid-column:span 2;padding:0.5rem;">
    </div>
    <button type="submit" class="btn-primary">Add Branch Statistic</button>
  </form>

  <div class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Placement Statistics</h2>
    <?php foreach ($stats as $st): ?>
      <div class="admin-list-row">
        <div>
          <strong><?= e($st['academic_year']) ?> · <?= e($st['branch']) ?></strong>
          <div style="font-size:0.78rem;color:#78716C;">Placed: <?= (int)$st['placed_students'] ?>/<?= (int)$st['eligible_students'] ?> · Highest: <?= e((string)$st['highest_package_lpa']) ?> LPA</div>
        </div>
        <div style="display:flex;gap:0.4rem;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_stat"><input type="hidden" name="id" value="<?= (int)$st['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_stat"><input type="hidden" name="id" value="<?= (int)$st['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Add Placed Student Highlight (With 1:1 Photo Crop)</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_story">
    <div class="grid-3" style="margin-bottom:0.5rem;">
      <input type="text" name="student_name" required placeholder="Student Full Name" style="padding:0.5rem;">
      <input type="text" name="batch_year" required value="2026" placeholder="Batch" style="padding:0.5rem;">
      <input type="text" name="branch" required value="CSE" placeholder="Branch" style="padding:0.5rem;">
      <input type="text" name="company" required placeholder="Company Name" style="padding:0.5rem;">
      <input type="text" name="role_title" required placeholder="Offered Role" style="padding:0.5rem;">
      <input type="text" name="package_lpa" required placeholder="Package (e.g. 14.5 LPA)" style="padding:0.5rem;">
    </div>
    <textarea name="quote_text" rows="2" placeholder="Student quote / testimonial..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"></textarea>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">Student Photo (1:1 Crop): <input type="file" name="photo" data-aspect="1:1" accept="image/jpeg,image/png,image/webp"></label>
    <button type="submit" class="btn-primary">Add Student Highlight</button>
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
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_story"><input type="hidden" name="id" value="<?= (int)$sr['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
<?php elseif ($tab === 'grievances' && $canGrievances): ?>
  <div class="card">
    <h2 style="margin-top:0;">Online Grievance Tickets &amp; Committee Resolution</h2>
    <?php if (empty($grievances)): ?>
      <p style="color:#78716C;">No grievance tickets logged yet.</p>
    <?php else: ?>
      <table class="data-table">
        <thead><tr><th>Ticket</th><th>Complainant</th><th>Subject &amp; Details</th><th>Update Status &amp; Resolution</th></tr></thead>
        <tbody>
          <?php foreach ($grievances as $g): ?>
            <tr>
              <td><strong><?= e($g['ticket_code']) ?></strong><br><small><?= e($g['urgency']) ?></small><br><small><?= e($g['submitted_at']) ?></small></td>
              <td><strong><?= e($g['complainant_name']) ?></strong><br><small><?= e($g['reporter_role']) ?></small><br><small><?= e($g['email']) ?></small></td>
              <td><strong><?= e($g['subject']) ?></strong> (<?= e($g['category']) ?>)<br><small><?= e($g['description']) ?></small></td>
              <td>
                <form method="post" style="display:flex;flex-direction:column;gap:0.35rem;">
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
    <?php endif; ?>
  </div>
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
