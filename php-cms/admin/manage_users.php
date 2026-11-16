<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('users');
$pdo = getDB();
$msg = '';
$err = '';

$cats = $pdo->query('SELECT id, slug, name FROM categories ORDER BY sort_order ASC, id ASC')->fetchAll();
$allPages = $pdo->query("SELECT p.id, p.title, p.slug, c.id AS cat_id, COALESCE(c.name, 'Standalone / Uncategorized') AS cat_name FROM pages p LEFT JOIN categories c ON p.category_id = c.id ORDER BY COALESCE(c.sort_order, 999) ASC, p.sort_order ASC")->fetchAll();
$pagesGrouped = [];
foreach ($allPages as $pg) {
    $pagesGrouped[$pg['cat_name']][] = $pg;
}
$moduleOptions = rbacModuleOptions();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    if ($action === 'create') {
        $role = $_POST['role'] ?? 'content_editor';
        $selDepts = array_values(array_unique(array_filter(array_map('intval', $_POST['allowed_department_ids'] ?? []))));
        $deptId = ($role === 'department_admin') ? (!empty($_POST['assigned_department_id']) ? (int)$_POST['assigned_department_id'] : ($selDepts[0] ?? null)) : (!empty($selDepts) ? $selDepts[0] : null);
        if ($deptId && !in_array($deptId, $selDepts, true) && $role === 'department_admin') {
            array_unshift($selDepts, $deptId);
        }
        $selCats = array_values(array_filter(array_map('strval', $_POST['allowed_categories'] ?? [])));
        $selPages = array_values(array_filter(array_map('intval', $_POST['allowed_page_ids'] ?? [])));
        $selModules = array_values(array_filter(array_map('strval', $_POST['allowed_modules'] ?? [])));
        if ($role === 'exam_controller' && empty($selCats) && empty($selPages)) {
            $selCats = ['examination'];
        }
        if ($role === 'specific_page_editor' && empty($selCats) && empty($selPages) && empty($selModules)) {
            $err = 'Please select at least one individual page, category, or admin module for Specific Page / Category Access Only.';
        } else {
            $hash = password_hash($_POST['password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('INSERT INTO users (full_name, email, password_hash, role, assigned_department_id, allowed_categories_json, allowed_page_ids_json, allowed_modules_json, allowed_department_ids_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                trim($_POST['full_name']),
                strtolower(trim($_POST['email'])),
                $hash,
                $role,
                $deptId,
                !empty($selCats) ? json_encode($selCats) : null,
                !empty($selPages) ? json_encode($selPages) : null,
                !empty($selModules) ? json_encode($selModules) : null,
                !empty($selDepts) ? json_encode($selDepts) : null,
            ]);
            logAudit($pdo, $user, 'CREATE_USER', 'User', $_POST['email']);
            $msg = 'RBAC user created with granular permissions.';
        }
    } elseif ($action === 'update_rbac' && !empty($_POST['user_id'])) {
        $targetId = (int)$_POST['user_id'];
        $role = $_POST['role'] ?? 'content_editor';
        $selDepts = array_values(array_unique(array_filter(array_map('intval', $_POST['allowed_department_ids'] ?? []))));
        $deptId = ($role === 'department_admin') ? (!empty($_POST['assigned_department_id']) ? (int)$_POST['assigned_department_id'] : ($selDepts[0] ?? null)) : (!empty($selDepts) ? $selDepts[0] : null);
        if ($deptId && !in_array($deptId, $selDepts, true) && $role === 'department_admin') {
            array_unshift($selDepts, $deptId);
        }
        $selCats = array_values(array_filter(array_map('strval', $_POST['allowed_categories'] ?? [])));
        $selPages = array_values(array_filter(array_map('intval', $_POST['allowed_page_ids'] ?? [])));
        $selModules = array_values(array_filter(array_map('strval', $_POST['allowed_modules'] ?? [])));
        if ($role === 'specific_page_editor' && empty($selCats) && empty($selPages) && empty($selModules)) {
            $err = 'Please select at least one individual page, category, or admin module for Specific Page / Category Access Only.';
        } else {
            $pdo->prepare('UPDATE users SET role = ?, assigned_department_id = ?, allowed_categories_json = ?, allowed_page_ids_json = ?, allowed_modules_json = ?, allowed_department_ids_json = ? WHERE id = ?')
                ->execute([
                    $role,
                    $deptId,
                    !empty($selCats) ? json_encode($selCats) : null,
                    !empty($selPages) ? json_encode($selPages) : null,
                    !empty($selModules) ? json_encode($selModules) : null,
                    !empty($selDepts) ? json_encode($selDepts) : null,
                    $targetId,
                ]);
            logAudit($pdo, $user, 'UPDATE_RBAC_SCOPE', 'User', 'User #' . $targetId . ' (' . $role . ')');
            $msg = 'Per-page, category & module RBAC permissions updated.';
        }
    } elseif ($action === 'toggle') {
        $pdo->prepare('UPDATE users SET is_active = NOT is_active WHERE id = ? AND id != ?')->execute([(int)$_POST['user_id'], $user['id']]);
        logAudit($pdo, $user, 'TOGGLE_USER', 'User', 'ID #' . (int)$_POST['user_id']);
        $msg = 'User status updated.';
    } elseif ($action === 'delete_user' && !empty($_POST['user_id'])) {
        $targetId = (int)$_POST['user_id'];
        if ($targetId === (int)$user['id']) {
            $err = 'You cannot delete your own currently signed-in administrator account.';
        } else {
            $stTarget = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
            $stTarget->execute([$targetId]);
            $targetRow = $stTarget->fetch();
            if (!$targetRow) {
                $err = 'User account not found.';
            } else {
                $activeAdminsCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'super_admin' AND is_active = 1")->fetchColumn();
                if ($targetRow['role'] === 'super_admin' && !empty($targetRow['is_active']) && $activeAdminsCount <= 1) {
                    $err = 'Cannot delete the last active Super Admin account.';
                } else {
                    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$targetId]);
                    logAudit($pdo, $user, 'DELETE_USER', 'User', $targetRow['email'] . ' (' . $targetRow['role'] . ')');
                    $msg = 'Revoked & deleted user account: ' . $targetRow['full_name'] . ' (' . $targetRow['email'] . ').';
                }
            }
        }
    }
}

$editingUser = null;
if (!empty($_GET['edit_rbac'])) {
    $st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit_rbac']]);
    $editingUser = $st->fetch() ?: null;
}

$users = $pdo->query('SELECT u.*, d.short_name AS dept_name FROM users u LEFT JOIN departments d ON u.assigned_department_id = d.id ORDER BY u.id ASC')->fetchAll();
$depts = $pdo->query('SELECT id, name, short_name FROM departments ORDER BY sort_order ASC')->fetchAll();
$logs  = $pdo->query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 25')->fetchAll();

$adminPageTitle = 'Users, Per-Page RBAC & Security Audit Logs';
require_once __DIR__ . '/../includes/admin_layout_top.php';
$renderPerPageSelector = static function (array $selectedIds, string $uid) use ($pagesGrouped): void {
    $selectedMap = array_flip(array_map('intval', $selectedIds));
    ?>
    <div id="rbac-pages-wrap-<?= e($uid) ?>" style="border:1px solid var(--border-color);border-radius:8px;padding:0.7rem;background:var(--surface-bg);margin-bottom:0.85rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.55rem;">
        <strong style="font-size:0.84rem;">Individual Page-Wise Access Control (Strict Override):</strong>
        <input type="search" placeholder="Filter pages..." oninput="filterRbacPages('<?= e($uid) ?>', this.value)" style="padding:0.3rem 0.5rem;font-size:0.8rem;border:1px solid var(--border-color);border-radius:6px;min-width:190px;">
      </div>
      <div style="max-height:230px;overflow-y:auto;display:grid;gap:0.55rem;">
        <?php foreach ($pagesGrouped as $catTitle => $catPages):
          $grpKey = $uid . '-' . substr(md5($catTitle), 0, 8);
        ?>
          <div style="border:1px solid var(--border-color);border-radius:6px;background:#fff;padding:0.45rem 0.6rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem;border-bottom:1px solid var(--border-color);padding-bottom:0.25rem;">
              <strong style="font-size:0.8rem;color:var(--primary-color);"><?= e($catTitle) ?> (<?= count($catPages) ?>)</strong>
              <span style="display:flex;gap:0.35rem;">
                <button type="button" class="btn-secondary" style="padding:1px 6px;font-size:0.72rem;" onclick="toggleRbacGroup('<?= e($grpKey) ?>', true)">Select All</button>
                <button type="button" class="btn-secondary" style="padding:1px 6px;font-size:0.72rem;" onclick="toggleRbacGroup('<?= e($grpKey) ?>', false)">Clear</button>
              </span>
            </div>
            <div class="rbac-group-<?= e($grpKey) ?>" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:0.3rem;font-size:0.8rem;">
              <?php foreach ($catPages as $pg): ?>
                <label class="rbac-page-item" data-search="<?= e(strtolower($catTitle . ' ' . $pg['title'] . ' ' . $pg['slug'])) ?>" style="display:flex;align-items:flex-start;gap:0.35rem;">
                  <input type="checkbox" name="allowed_page_ids[]" value="<?= (int)$pg['id'] ?>" <?= isset($selectedMap[(int)$pg['id']]) ? 'checked' : '' ?>>
                  <span><?= e($pg['title']) ?></span>
                </label>
              <?php endforeach; ?>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
    <?php
};
?>
  <?php if ($editingUser):
    $uCats = !empty($editingUser['allowed_categories_json']) ? json_decode((string)$editingUser['allowed_categories_json'], true) : [];
    if (!is_array($uCats)) $uCats = [];
    $uPages = !empty($editingUser['allowed_page_ids_json']) ? json_decode((string)$editingUser['allowed_page_ids_json'], true) : [];
    if (!is_array($uPages)) $uPages = [];
    $uMods = !empty($editingUser['allowed_modules_json']) ? json_decode((string)$editingUser['allowed_modules_json'], true) : [];
    if (!is_array($uMods)) $uMods = [];
    $uDepts = !empty($editingUser['allowed_department_ids_json']) ? json_decode((string)$editingUser['allowed_department_ids_json'], true) : [];
    if (!is_array($uDepts)) $uDepts = [];
    if (!empty($editingUser['assigned_department_id']) && !in_array((int)$editingUser['assigned_department_id'], $uDepts, true)) {
        $uDepts[] = (int)$editingUser['assigned_department_id'];
    }
  ?>
    <form method="post" class="card" style="margin-bottom:1.5rem;border:2px solid var(--secondary-color);">
      <h2 style="margin-top:0;">Edit Per-Page, Category &amp; Module RBAC: <?= e($editingUser['full_name']) ?> (<?= e($editingUser['email']) ?>)</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="update_rbac">
      <input type="hidden" name="user_id" value="<?= (int)$editingUser['id'] ?>">

      <div class="grid-2" style="margin-bottom:0.85rem;">
        <label>Role
          <select name="role" style="width:100%;padding:0.5rem;">
            <?php foreach (['super_admin' => 'Super Admin', 'content_editor' => 'Content Editor / PRO', 'department_admin' => 'Department Admin', 'iqac_officer' => 'IQAC / Compliance Officer', 'exam_controller' => 'Controller of Examinations (CoE)', 'specific_page_editor' => 'Specific Page / Category Access Only'] as $rk => $rl): ?>
              <option value="<?= $rk ?>" <?= $editingUser['role'] === $rk ? 'selected' : '' ?>><?= e($rl) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label>Primary Department (for Department Admin)
          <select name="assigned_department_id" style="width:100%;padding:0.5rem;">
            <?php foreach ($depts as $d): ?>
              <option value="<?= (int)$d['id'] ?>" <?= (int)$editingUser['assigned_department_id'] === (int)$d['id'] ? 'selected' : '' ?>><?= e($d['name']) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
      </div>

      <div style="margin-bottom:0.85rem;">
        <strong style="display:block;font-size:0.85rem;margin-bottom:0.35rem;">Explicit Allowed Admin Modules (optional override — leave all unchecked for role defaults):</strong>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:0.45rem;font-size:0.82rem;background:#FAF9F6;padding:0.6rem;border:1px solid var(--border-color);border-radius:8px;">
          <?php foreach ($moduleOptions as $mk => $ml): ?>
            <label><input type="checkbox" name="allowed_modules[]" value="<?= e($mk) ?>" <?= in_array($mk, $uMods, true) ? 'checked' : '' ?>> <?= e($ml) ?></label>
          <?php endforeach; ?>
        </div>
      </div>

      <div style="margin-bottom:0.85rem;">
        <strong style="display:block;font-size:0.85rem;margin-bottom:0.35rem;">Allowed Department Microsites (Multi-Dept Scope):</strong>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;font-size:0.82rem;">
          <?php foreach ($depts as $d): ?>
            <label><input type="checkbox" name="allowed_department_ids[]" value="<?= (int)$d['id'] ?>" <?= in_array((int)$d['id'], $uDepts, true) ? 'checked' : '' ?>> <?= e($d['short_name'] ?: $d['name']) ?></label>
          <?php endforeach; ?>
        </div>
      </div>

      <div style="margin-bottom:0.85rem;">
        <strong style="display:block;font-size:0.85rem;margin-bottom:0.35rem;">Allowed Categories (leave empty if using per-page access below or role default):</strong>
        <div style="display:flex;gap:0.85rem;flex-wrap:wrap;font-size:0.85rem;">
          <?php foreach ($cats as $c): ?>
            <label><input type="checkbox" name="allowed_categories[]" value="<?= e($c['slug']) ?>" <?= in_array($c['slug'], $uCats, true) ? 'checked' : '' ?>> <?= e($c['name']) ?></label>
          <?php endforeach; ?>
        </div>
      </div>

      <?php $renderPerPageSelector($uPages, 'edit'); ?>

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
        <option value="specific_page_editor">Specific Page / Category Access Only</option>
      </select>
      <select name="assigned_department_id" style="width:100%;padding:0.5rem;margin-bottom:0.65rem;">
        <?php foreach ($depts as $d): ?><option value="<?= (int)$d['id'] ?>"><?= e($d['name']) ?></option><?php endforeach; ?>
      </select>
      <div style="margin-bottom:0.75rem;font-size:0.8rem;">
        <strong style="display:block;margin-bottom:0.25rem;">Allowed Admin Modules (Optional):</strong>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:0.3rem;padding:0.5rem;border:1px solid var(--border-color);border-radius:6px;">
          <?php foreach ($moduleOptions as $mk => $ml): ?>
            <label><input type="checkbox" name="allowed_modules[]" value="<?= e($mk) ?>"> <?= e($ml) ?></label>
          <?php endforeach; ?>
        </div>
      </div>
      <div style="margin-bottom:0.75rem;font-size:0.8rem;">
        <strong style="display:block;margin-bottom:0.25rem;">Allowed Departments (Optional Multi-Dept):</strong>
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap;">
          <?php foreach ($depts as $d): ?>
            <label><input type="checkbox" name="allowed_department_ids[]" value="<?= (int)$d['id'] ?>"> <?= e($d['short_name'] ?: $d['name']) ?></label>
          <?php endforeach; ?>
        </div>
      </div>
      <div style="margin-bottom:0.75rem;font-size:0.82rem;">
        <strong style="display:block;margin-bottom:0.25rem;">Allowed Categories (Optional):</strong>
        <div style="display:flex;gap:0.65rem;flex-wrap:wrap;">
          <?php foreach ($cats as $c): ?>
            <label><input type="checkbox" name="allowed_categories[]" value="<?= e($c['slug']) ?>"> <?= e($c['name']) ?></label>
          <?php endforeach; ?>
        </div>
      </div>
      <?php $renderPerPageSelector([], 'create'); ?>
      <button type="submit" class="btn-primary">Create User</button>
    </form>

    <div class="card">
      <h2 style="margin-top:0;">Registered Staff &amp; Permissions</h2>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Role &amp; Scope</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <?php
            $activeSuperCount = count(array_filter($users, static fn($x) => $x['role'] === 'super_admin' && !empty($x['is_active'])));
            foreach ($users as $u):
              $uc = !empty($u['allowed_categories_json']) ? json_decode((string)$u['allowed_categories_json'], true) : [];
              $up = !empty($u['allowed_page_ids_json']) ? json_decode((string)$u['allowed_page_ids_json'], true) : [];
              $um = !empty($u['allowed_modules_json']) ? json_decode((string)$u['allowed_modules_json'], true) : [];
              $canDelete = ((int)$u['id'] !== (int)$user['id']) && !($u['role'] === 'super_admin' && !empty($u['is_active']) && $activeSuperCount <= 1);
          ?>
            <tr>
              <td><?= e($u['full_name']) ?><br><small><?= e($u['email']) ?></small></td>
              <td>
                <strong><?= e($u['role'] === 'specific_page_editor' ? 'Specific Page / Category Access' : $u['role']) ?></strong> <?= $u['dept_name'] ? '(' . e($u['dept_name']) . ')' : '' ?>
                <?php if (is_array($um) && $um): ?><br><small style="color:#0F294A;">Modules: <?= e(implode(', ', $um)) ?></small><?php endif; ?>
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
                <form method="post" style="display:inline;" onsubmit="return confirm('Revoke and permanently delete this user account?');">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="delete_user">
                  <input type="hidden" name="user_id" value="<?= (int)$u['id'] ?>">
                  <button type="submit" class="btn-danger btn-sm" <?= $canDelete ? '' : 'disabled style="opacity:0.4;cursor:not-allowed;"' ?> title="<?= $canDelete ? 'Revoke & Delete Account' : 'Protected active admin' ?>">Delete</button>
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
<script>
function toggleRbacGroup(grpKey, checked) {
  var wrap = document.querySelector('.rbac-group-' + grpKey);
  if (!wrap) return;
  wrap.querySelectorAll('input[type="checkbox"]').forEach(function(cb) { cb.checked = checked; });
}
function filterRbacPages(uid, q) {
  var needle = (q || '').trim().toLowerCase();
  var root = document.getElementById('rbac-pages-wrap-' + uid);
  if (!root) return;
  root.querySelectorAll('.rbac-page-item').forEach(function(el) {
    var hay = el.getAttribute('data-search') || '';
    el.style.display = (!needle || hay.indexOf(needle) !== -1) ? 'flex' : 'none';
  });
}
</script>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
