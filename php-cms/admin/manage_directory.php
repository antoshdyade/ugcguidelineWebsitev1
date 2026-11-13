<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('directory');
$pdo = getDB();
$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    if (($_POST['action'] ?? '') === 'add') {
        $pdo->prepare('INSERT INTO telephone_directory (section, officer_name, designation, extension, direct_phone, email) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([trim($_POST['section']), trim($_POST['officer_name']), trim($_POST['designation']), trim($_POST['extension']), trim($_POST['direct_phone']), trim($_POST['email'])]);
        logAudit($pdo, $user, 'ADD_DIRECTORY', 'Directory', $_POST['section']);
        $msg = 'Contact entry added.';
    } elseif (($_POST['action'] ?? '') === 'delete') {
        $pdo->prepare('DELETE FROM telephone_directory WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Contact entry removed.';
    }
}
$rows = $pdo->query('SELECT * FROM telephone_directory ORDER BY id ASC')->fetchAll();
$adminPageTitle = 'Telephone Directory Manager';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

  <form method="post" class="card" style="margin-bottom:1.5rem;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="add">
    <div class="grid-3" style="margin-bottom:0.75rem;">
      <input type="text" name="section" required placeholder="Department / Cell" style="padding:0.5rem;">
      <input type="text" name="officer_name" required placeholder="Officer Name" style="padding:0.5rem;">
      <input type="text" name="designation" required placeholder="Designation" style="padding:0.5rem;">
      <input type="text" name="extension" required placeholder="Ext (e.g. 101)" style="padding:0.5rem;">
      <input type="text" name="direct_phone" required placeholder="Direct Phone" style="padding:0.5rem;">
      <input type="email" name="email" required placeholder="Email" style="padding:0.5rem;">
    </div>
    <button type="submit" class="btn-primary">Add Directory Contact</button>
  </form>

  <div class="card">
    <table class="data-table">
      <thead><tr><th>Section</th><th>Officer</th><th>Phone / Ext</th><th>Email</th><th>Action</th></tr></thead>
      <tbody>
        <?php foreach ($rows as $r): ?>
          <tr>
            <td><?= e($r['section']) ?></td>
            <td><?= e($r['officer_name']) ?> (<?= e($r['designation']) ?>)</td>
            <td><?= e($r['direct_phone']) ?> · Ext <?= e($r['extension']) ?></td>
            <td><?= e($r['email']) ?></td>
            <td><form method="post"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><button class="btn-secondary">Remove</button></form></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
