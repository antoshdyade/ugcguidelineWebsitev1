<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('users');
$pdo = getDB();
$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    if (($_POST['action'] ?? '') === 'create') {
        $hash = password_hash($_POST['password'], PASSWORD_DEFAULT);
        $deptId = ($_POST['role'] === 'department_admin') ? (int)$_POST['assigned_department_id'] : null;
        $stmt = $pdo->prepare('INSERT INTO users (full_name, email, password_hash, role, assigned_department_id) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([trim($_POST['full_name']), strtolower(trim($_POST['email'])), $hash, $_POST['role'], $deptId]);
        logAudit($pdo, $user, 'CREATE_USER', 'User', $_POST['email']);
        $msg = 'RBAC user created.';
    } elseif (($_POST['action'] ?? '') === 'toggle') {
        $pdo->prepare('UPDATE users SET is_active = NOT is_active WHERE id = ? AND id != ?')->execute([(int)$_POST['user_id'], $user['id']]);
        logAudit($pdo, $user, 'TOGGLE_USER', 'User', 'ID #' . (int)$_POST['user_id']);
        $msg = 'User status updated.';
    }
}

$users = $pdo->query('SELECT u.*, d.short_name AS dept_name FROM users u LEFT JOIN departments d ON u.assigned_department_id = d.id ORDER BY u.id ASC')->fetchAll();
$depts = $pdo->query('SELECT id, name FROM departments ORDER BY sort_order ASC')->fetchAll();
$logs  = $pdo->query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20')->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manage Users &amp; RBAC</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="container" style="padding:2rem 1rem;">
  <p><a href="dashboard.php">&larr; Dashboard</a></p>
  <h1>Users, Multi-Tier RBAC &amp; Audit Logs</h1>
  <?php if ($msg): ?><p style="color:#15803d;font-weight:600;"><?= e($msg) ?></p><?php endif; ?>

  <div class="grid-2" style="margin-bottom:1.5rem;">
    <form method="post" class="card">
      <h2 style="margin-top:0;">Create RBAC User</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="create">
      <input type="text" name="full_name" required placeholder="Full Name" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="email" name="email" required placeholder="Email" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="password" name="password" required placeholder="Password" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <select name="role" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <option value="super_admin">Super Admin</option>
        <option value="content_editor">Content Editor / PRO</option>
        <option value="department_admin">Department Admin</option>
        <option value="iqac_officer">IQAC / Compliance Officer</option>
      </select>
      <select name="assigned_department_id" style="width:100%;padding:0.5rem;margin-bottom:0.75rem;">
        <?php foreach ($depts as $d): ?><option value="<?= (int)$d['id'] ?>"><?= e($d['name']) ?></option><?php endforeach; ?>
      </select>
      <button type="submit" class="btn-primary">Create User</button>
    </form>

    <div class="card">
      <h2 style="margin-top:0;">Registered Staff</h2>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          <?php foreach ($users as $u): ?>
            <tr>
              <td><?= e($u['full_name']) ?><br><small><?= e($u['email']) ?></small></td>
              <td><?= e($u['role']) ?> <?= $u['dept_name'] ? '(' . e($u['dept_name']) . ')' : '' ?></td>
              <td><?= $u['is_active'] ? 'Active' : 'Disabled' ?></td>
              <td>
                <form method="post">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="toggle">
                  <input type="hidden" name="user_id" value="<?= (int)$u['id'] ?>">
                  <button type="submit" class="btn-secondary">Toggle</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <h2 style="margin-top:0;">Security Audit Log</h2>
    <table class="data-table">
      <thead><tr><th>Timestamp</th><th>Actor</th><th>Role</th><th>Action</th><th>Entity</th></tr></thead>
      <tbody>
        <?php foreach ($logs as $l): ?>
          <tr>
            <td><?= e($l['created_at']) ?></td>
            <td><?= e($l['actor_email']) ?></td>
            <td><?= e($l['actor_role']) ?></td>
            <td><?= e($l['action']) ?></td>
            <td><?= e($l['entity_type']) ?>: <?= e($l['entity_title']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</body>
</html>
