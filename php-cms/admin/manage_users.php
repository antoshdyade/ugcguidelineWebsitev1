<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('users');
$pdo = getDB();
$msg = '';
$err = '';

$cats = $pdo->query('SELECT id, slug, name FROM categories ORDER BY sort_order ASC, id ASC')->fetchAll();
$allPages = $pdo->query('SELECT p.id, p.title, c.name AS cat_name FROM pages p JOIN categories c ON p.category_id = c.id ORDER BY c.sort_order ASC, p.sort_order ASC')->fetchAll();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    if ($action === 'create') {
        $hash = password_hash($_POST['password'], PASSWORD_DEFAULT);
        $role = $_POST['role'] ?? 'content_editor';
        $deptId = ($role === 'department_admin') ? (int)$_POST['assigned_department_id'] : null;
        $selCats = array_values(array_filter(array_map('strval', $_POST['allowed_categories'] ?? [])));
        $selPages = array_values(array_filter(array_map('intval', $_POST['allowed_page_ids'] ?? [])));
        if ($role === 'exam_controller' && empty($selCats)) {
            $selCats = ['examination'];
        }
        $stmt = $pdo->prepare('INSERT INTO users (full_name, email, password_hash, role, assigned_department_id, allowed_categories_json, allowed_page_ids_json) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            trim($_POST['full_name']),
            strtolower(trim($_POST['email'])),
            $hash,
            $role,
            $deptId,
            !empty($selCats) ? json_encode($selCats) : null,
            !empty($selPages) ? json_encode($selPages) : null,
        ]);
        logAudit($pdo, $user, 'CREATE_USER', 'User', $_POST['email']);
        $msg = 'RBAC user created with granular permissions.';
    } elseif ($action === 'update_rbac' && !empty($_POST['user_id'])) {
        $targetId = (int)$_POST['user_id'];
        $role = $_POST['role'] ?? 'content_editor';
        $deptId = ($role === 'department_admin') ? (int)$_POST['assigned_department_id'] : null;
        $selCats = array_values(array_filter(array_map('strval', $_POST['allowed_categories'] ?? [])));
        $selPages = array_values(array_filter(array_map('intval', $_POST['allowed_page_ids'] ?? [])));
        $pdo->prepare('UPDATE users SET role = ?, assigned_department_id = ?, allowed_categories_json = ?, allowed_page_ids_json = ? WHERE id = ?')
            ->execute([
                $role,
                $deptId,
                !empty($selCats) ? json_encode($selCats) : null,
                !empty($selPages) ? json_encode($selPages) : null,
                $targetId,
            ]);
        logAudit($pdo, $user, 'UPDATE_RBAC_SCOPE', 'User', 'User #' . $targetId . ' (' . $role . ')');
        $msg = 'Per-page & category RBAC permissions updated.';
    } elseif ($action === 'toggle') {
        $pdo->prepare('UPDATE users SET is_active = NOT is_active WHERE id = ? AND id != ?')->execute([(int)$_POST['user_id'], $user['id']]);
        logAudit($pdo, $user, 'TOGGLE_USER', 'User', 'ID #' . (int)$_POST['user_id']);
        $msg = 'User status updated.';
    }
}

$editingUser = null;
if (!empty($_GET['edit_rbac'])) {
    $st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit_rbac']]);
    $editingUser = $st->fetch() ?: null;
}

$users = $pdo->query('SELECT u.*, d.short_name AS dept_name FROM users u LEFT JOIN departments d ON u.assigned_department_id = d.id ORDER BY u.id ASC')->fetchAll();
$depts = $pdo->query('SELECT id, name FROM departments ORDER BY sort_order ASC')->fetchAll();
$logs  = $pdo->query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 25')->fetchAll();

$adminPageTitle = 'Users, Per-Page RBAC & Security Audit Logs';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
  <?php if ($editingUser):
    $uCats = !empty($editingUser['allowed_categories_json']) ? json_decode((string)$editingUser['allowed_categories_json'], true) : [];
    if (!is_array($uCats)) $uCats = [];
    $uPages = !empty($editingUser['allowed_page_ids_json']) ? json_decode((string)$editingUser['allowed_page_ids_json'], true) : [];
    if (!is_array($uPages)) $uPages = [];
  ?>
    <form method="post" class="card" style="margin-bottom:1.5rem;border:2px solid var(--secondary-color);">
      <h2 style="margin-top:0;">Edit Per-Page &amp; Category RBAC: <?= e($editingUser['full_name']) ?> (<?= e($editingUser['email']) ?>)</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="update_rbac">
      <input type="hidden" name="user_id" value="<?= (int)$editingUser['id'] ?>">

      <div class="grid-2" style="margin-bottom:0.85rem;">
        <label>Role
          <select name="role" style="width:100%;padding:0.5rem;">
            <?php foreach (['super_admin' => 'Super Admin', 'content_editor' => 'Content Editor / PRO', 'department_admin' => 'Department Admin', 'iqac_officer' => 'IQAC / Compliance Officer', 'exam_controller' => 'Controller of Examinations (CoE)'] as $rk => $rl): ?>
              <option value="<?= $rk ?>" <?= $editingUser['role'] === $rk ? 'selected' : '' ?>><?= e($rl) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label>Assigned Department (for Department Admin)
          <select name="assigned_department_id" style="width:100%;padding:0.5rem;">
            <?php foreach ($depts as $d): ?>
              <option value="<?= (int)$d['id'] ?>" <?= (int)$editingUser['assigned_department_id'] === (int)$d['id'] ? 'selected' : '' ?>><?= e($d['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
      </div>

      <div style="margin-bottom:0.85rem;">
        <strong style="display:block;font-size:0.85rem;margin-bottom:0.35rem;">Allowed Categories (leave empty for role default):</strong>
        <div style="display:flex;gap:0.85rem;flex-wrap:wrap;font-size:0.85rem;">
          <?php foreach ($cats as $c): ?>
            <label><input type="checkbox" name="allowed_categories[]" value="<?= e($c['slug']) ?>" <?= in_array($c['slug'], $uCats, true) ? 'checked' : '' ?>> <?= e($c['name']) ?></label>
          <?php endforeach; ?>
        </div>
      </div>

      <div style="margin-bottom:1rem;">
        <strong style="display:block;font-size:0.85rem;margin-bottom:0.35rem;">Allowed Specific Pages (Per-Page Override — leave empty to allow all pages in permitted categories):</strong>
        <div style="max-height:190px;overflow-y:auto;border:1px solid var(--border-color);border-radius:8px;padding:0.65rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0.35rem;font-size:0.82rem;">
          <?php foreach ($allPages as $pg): ?>
            <label><input type="checkbox" name="allowed_page_ids[]" value="<?= (int)$pg['id'] ?>" <?= in_array((int)$pg['id'], array_map('intval', $uPages), true) ? 'checked' : '' ?>> [<?= e($pg['cat_name']) ?>] <?= e($pg['title']) ?></label>
          <?php endforeach; ?>
        </div>
      </div>

      <button type="submit" class="btn-primary">Save Per-Page RBAC Permissions</button>
      <a href="manage_users.php" class="btn-secondary" style="margin-left:0.5rem;">Cancel</a>
    </form>
  <?php endif; ?>

  <div class="grid-2" style="margin-bottom:1.5rem;align-items:start;">
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
        <option value="exam_controller">Controller of Examinations (CoE)</option>
      </select>
      <select name="assigned_department_id" style="width:100%;padding:0.5rem;margin-bottom:0.65rem;">
        <?php foreach ($depts as $d): ?><option value="<?= (int)$d['id'] ?>"><?= e($d['name']) ?></option><?php endforeach; ?>
      </select>
      <div style="margin-bottom:0.75rem;font-size:0.82rem;">
        <strong style="display:block;margin-bottom:0.25rem;">Allowed Categories (Optional):</strong>
        <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
          <?php foreach ($cats as $c): ?>
            <label><input type="checkbox" name="allowed_categories[]" value="<?= e($c['slug']) ?>"> <?= e($c['name']) ?></label>
          <?php endforeach; ?>
        </div>
      </div>
      <button type="submit" class="btn-primary">Create User</button>
    </form>

    <div class="card">
      <h2 style="margin-top:0;">Registered Staff &amp; Permissions</h2>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Role &amp; Scope</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <?php foreach ($users as $u):
            $uc = !empty($u['allowed_categories_json']) ? json_decode((string)$u['allowed_categories_json'], true) : [];
            $up = !empty($u['allowed_page_ids_json']) ? json_decode((string)$u['allowed_page_ids_json'], true) : [];
          ?>
            <tr>
              <td><?= e($u['full_name']) ?><br><small><?= e($u['email']) ?></small></td>
              <td>
                <strong><?= e($u['role']) ?></strong> <?= $u['dept_name'] ? '(' . e($u['dept_name']) . ')' : '' ?>
                <?php if (is_array($uc) && $uc): ?><br><small style="color:var(--text-muted);">Cats: <?= e(implode(', ', $uc)) ?></small><?php endif; ?>
                <?php if (is_array($up) && $up): ?><br><small style="color:var(--secondary-color);"><?= count($up) ?> specific page(s)</small><?php endif; ?>
              </td>
              <td><?= $u['is_active'] ? 'Active' : 'Disabled' ?></td>
              <td style="white-space:nowrap;">
                <a href="?edit_rbac=<?= (int)$u['id'] ?>" class="btn-primary" style="padding:0.28rem 0.55rem;font-size:0.78rem;">Per-Page RBAC</a>
                <form method="post" style="display:inline;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="toggle">
                  <input type="hidden" name="user_id" value="<?= (int)$u['id'] ?>">
                  <button type="submit" class="btn-secondary" style="padding:0.28rem 0.55rem;font-size:0.78rem;">Toggle</button>
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
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
