<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('directory');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$msg = '';

$sectionPresets = [
    'Principal & Administration',
    'Examination Cell',
    'Academic Departments',
    'Training & Placement',
    'Library & Hostels',
    'Student Grievance & Anti-Ragging',
    'Conference & R&D Cell',
];

$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    $isSuper = cmsIsSuperAdmin($user);
    if ($action === 'add' || $action === 'update') {
        $section = trim((string)($_POST['section'] ?? ''));
        $officer = trim((string)($_POST['officer_name'] ?? ''));
        $desig = trim((string)($_POST['designation'] ?? ''));
        $ext = trim((string)($_POST['extension'] ?? ''));
        $phone = trim((string)($_POST['direct_phone'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $payload = [
            'section' => $section,
            'officer_name' => $officer,
            'designation' => $desig,
            'extension' => $ext,
            'direct_phone' => $phone,
            'email' => $email,
        ];
        if ($action === 'update' && !empty($_POST['id'])) {
            $dirId = (int)$_POST['id'];
            $currStmt = $pdo->prepare('SELECT * FROM telephone_directory WHERE id = ? LIMIT 1');
            $currStmt->execute([$dirId]);
            $curr = $currStmt->fetch();
            if (!$curr) {
                $err = 'Directory entry not found.';
            } elseif ($isSuper) {
                $pdo->prepare('UPDATE telephone_directory SET section = ?, officer_name = ?, designation = ?, extension = ?, direct_phone = ?, email = ?, status = ? WHERE id = ?')
                    ->execute([$section, $officer, $desig, $ext, $phone, $email, 'published', $dirId]);
                logAudit($pdo, $user, 'UPDATE_DIRECTORY', 'Directory', $officer . ' (' . $section . ')');
                $msg = 'Contact entry updated and published.';
            } else {
                cmsQueuePendingUpdate($pdo, $user, 'telephone_directory', $dirId, $officer . ' (' . $section . ')', $curr, $payload);
                $msg = 'Update to contact "' . $officer . '" submitted for Super Admin approval. Live entry remains unchanged.';
            }
        } else {
            $insStatus = $isSuper ? 'published' : 'pending_approval';
            $pdo->prepare('INSERT INTO telephone_directory (section, officer_name, designation, extension, direct_phone, email, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
                ->execute([$section, $officer, $desig, $ext, $phone, $email, $insStatus]);
            $newId = (int)$pdo->lastInsertId();
            if ($isSuper) {
                logAudit($pdo, $user, 'ADD_DIRECTORY', 'Directory', $section);
                $msg = 'Contact entry added and published.';
            } else {
                $payload['status'] = 'pending_approval';
                cmsQueuePendingCreate($pdo, $user, 'telephone_directory', $newId, $officer . ' (' . $section . ')', $payload);
                $msg = 'New contact "' . $officer . '" submitted for Super Admin approval before appearing in directory.';
            }
        }
    } elseif ($action === 'move' && !empty($_POST['id'])) {
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'telephone_directory', (int)$_POST['id'], $dir, null, null, 'id ASC')) {
            $msg = 'Directory order updated.';
        }
    } elseif ($action === 'delete' && !empty($_POST['id'])) {
        $delId = (int)$_POST['id'];
        $currStmt = $pdo->prepare('SELECT * FROM telephone_directory WHERE id = ? LIMIT 1');
        $currStmt->execute([$delId]);
        $curr = $currStmt->fetch();
        if (!$curr) {
            $err = 'Directory entry not found.';
        } elseif ($isSuper) {
            $pdo->prepare('DELETE FROM telephone_directory WHERE id = ?')->execute([$delId]);
            logAudit($pdo, $user, 'DELETE_DIRECTORY', 'Directory', (string)($curr['officer_name'] ?? '#' . $delId));
            $msg = 'Contact entry removed.';
        } else {
            cmsQueuePendingDelete($pdo, $user, 'telephone_directory', $delId, (string)($curr['officer_name'] ?? 'Directory #' . $delId), $curr);
            $msg = 'Delete request for "' . ($curr['officer_name'] ?? '#' . $delId) . '" submitted for Super Admin approval.';
        }
    }
}

$editRow = null;
if (!empty($_GET['edit_id'])) {
    $st = $pdo->prepare('SELECT * FROM telephone_directory WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit_id']]);
    $editRow = $st->fetch() ?: null;
}

$rows = $pdo->query('SELECT * FROM telephone_directory ORDER BY sort_order ASC, id ASC')->fetchAll();
$adminPageTitle = 'Telephone Directory Manager';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
  <datalist id="dir-section-presets">
    <?php foreach ($sectionPresets as $sp): ?>
      <option value="<?= e($sp) ?>"></option>
    <?php endforeach; ?>
  </datalist>

  <form method="post" class="card" style="margin-bottom:1.5rem;<?= $editRow ? 'border:2px solid var(--secondary-color);' : '' ?>">
    <h2 style="margin-top:0;"><?= $editRow ? 'Edit Directory Contact: ' . e($editRow['officer_name']) : 'Add Directory Contact' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="<?= $editRow ? 'update' : 'add' ?>">
    <?php if ($editRow): ?><input type="hidden" name="id" value="<?= (int)$editRow['id'] ?>"><?php endif; ?>
    <div class="grid-3" style="margin-bottom:0.75rem;">
      <input type="text" name="section" list="dir-section-presets" required value="<?= e($editRow['section'] ?? '') ?>" placeholder="Department / Cell (Select or Type Custom)" style="padding:0.5rem;">
      <input type="text" name="officer_name" required value="<?= e($editRow['officer_name'] ?? '') ?>" placeholder="Officer Name" style="padding:0.5rem;">
      <input type="text" name="designation" required value="<?= e($editRow['designation'] ?? '') ?>" placeholder="Designation" style="padding:0.5rem;">
      <input type="text" name="extension" required value="<?= e($editRow['extension'] ?? '') ?>" placeholder="Ext (e.g. 101)" style="padding:0.5rem;">
      <input type="text" name="direct_phone" required value="<?= e($editRow['direct_phone'] ?? '') ?>" placeholder="Direct Phone" style="padding:0.5rem;">
      <input type="email" name="email" required value="<?= e($editRow['email'] ?? '') ?>" placeholder="Email" style="padding:0.5rem;">
    </div>
    <button type="submit" class="btn-primary"><?= $editRow ? 'Update Directory Contact' : 'Add Directory Contact' ?></button>
    <?php if ($editRow): ?><a href="manage_directory.php" class="btn-secondary" style="margin-left:0.5rem;">Cancel</a><?php endif; ?>
  </form>

  <div class="card">
    <table class="data-table">
      <thead><tr><th>Order</th><th>Section</th><th>Officer</th><th>Phone / Ext</th><th>Email</th><th>Action</th></tr></thead>
      <tbody>
        <?php foreach ($rows as $r): ?>
          <tr>
            <td style="white-space:nowrap;">
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move"><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;">&uarr;</button><button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;">&darr;</button></form>
              <span style="margin-left:4px;font-size:0.8rem;">#<?= (int)($r['sort_order'] ?? 1) ?></span>
            </td>
            <td><?= e($r['section']) ?></td>
            <td>
              <?= e($r['officer_name']) ?> (<?= e($r['designation']) ?>)
              <div style="margin-top:3px;"><?= cmsModerationStatusBadge((string)($r['status'] ?? 'published')) ?></div>
            </td>
            <td><?= e($r['direct_phone']) ?> · Ext <?= e($r['extension']) ?></td>
            <td><?= e($r['email']) ?></td>
            <td style="white-space:nowrap;">
              <a href="?edit_id=<?= (int)$r['id'] ?>" class="btn-primary" style="padding:0.28rem 0.6rem;font-size:0.78rem;">Edit</a>
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><button class="btn-secondary" style="padding:0.28rem 0.6rem;font-size:0.78rem;">Remove</button></form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
