<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('settings');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$msg = '';
$err = '';

$placements = [
    'after-hero'    => 'After Hero Banner',
    'after-about'   => 'After About Us & Downloads',
    'after-depts'   => 'After Academic Departments',
    'before-footer' => 'Before Website Footer',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    try {
        if ($action === 'create' || $action === 'update') {
            $title = trim($_POST['title'] ?? '');
            $placement = $_POST['placement'] ?? 'after-hero';
            if (!array_key_exists($placement, $placements)) {
                $placement = 'after-hero';
            }
            $html = $_POST['html_content'] ?? '';
            $sortOrder = max(1, (int)($_POST['sort_order'] ?? 1));
            $isActive = isset($_POST['is_active']) ? 1 : 0;

            if ($title === '' || trim(strip_tags($html, '<img><iframe><table><hr>')) === '') {
                $err = 'Component title and HTML content are required.';
            } elseif ($action === 'update' && !empty($_POST['component_id'])) {
                $stmt = $pdo->prepare('UPDATE custom_home_components SET title = ?, placement = ?, html_content = ?, sort_order = ?, is_active = ? WHERE id = ?');
                $stmt->execute([$title, $placement, $html, $sortOrder, $isActive, (int)$_POST['component_id']]);
                logAudit($pdo, $user, 'UPDATE_HOME_COMPONENT', 'HomeComponent', $title);
                $msg = 'Homepage HTML component updated.';
            } else {
                $stmt = $pdo->prepare('INSERT INTO custom_home_components (title, placement, html_content, sort_order, is_active) VALUES (?, ?, ?, ?, ?)');
                $stmt->execute([$title, $placement, $html, $sortOrder, $isActive]);
                logAudit($pdo, $user, 'CREATE_HOME_COMPONENT', 'HomeComponent', $title);
                $msg = 'Homepage HTML component added and live.';
            }
        } elseif ($action === 'toggle_active' && !empty($_POST['component_id'])) {
            $cid = (int)$_POST['component_id'];
            $pdo->prepare('UPDATE custom_home_components SET is_active = IF(is_active = 1, 0, 1) WHERE id = ?')->execute([$cid]);
            logAudit($pdo, $user, 'TOGGLE_HOME_COMPONENT', 'HomeComponent', 'ID #' . $cid);
            $msg = 'Component visibility updated.';
        } elseif ($action === 'move' && !empty($_POST['component_id'])) {
            $cid = (int)$_POST['component_id'];
            $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
            $all = $pdo->query('SELECT id, sort_order FROM custom_home_components ORDER BY sort_order ASC, id ASC')->fetchAll();
            foreach ($all as $idx => $row) {
                if ((int)$row['id'] === $cid) {
                    $swapIdx = $dir === 'up' ? $idx - 1 : $idx + 1;
                    if (isset($all[$swapIdx])) {
                        $other = $all[$swapIdx];
                        $upd = $pdo->prepare('UPDATE custom_home_components SET sort_order = ? WHERE id = ?');
                        $upd->execute([(int)$other['sort_order'], (int)$row['id']]);
                        $upd->execute([(int)$row['sort_order'], (int)$other['id']]);
                        $msg = 'Component order updated.';
                    }
                    break;
                }
            }
        } elseif ($action === 'delete' && !empty($_POST['component_id'])) {
            $cid = (int)$_POST['component_id'];
            $pdo->prepare('DELETE FROM custom_home_components WHERE id = ?')->execute([$cid]);
            logAudit($pdo, $user, 'DELETE_HOME_COMPONENT', 'HomeComponent', 'ID #' . $cid);
            $msg = 'Component deleted.';
        }
    } catch (PDOException $ex) {
        $err = 'Database table custom_home_components missing. Run setup.php to auto-upgrade your database schema.';
    }
}

$editing = null;
$components = [];
try {
    if (!empty($_GET['edit'])) {
        $st = $pdo->prepare('SELECT * FROM custom_home_components WHERE id = ? LIMIT 1');
        $st->execute([(int)$_GET['edit']]);
        $editing = $st->fetch() ?: null;
    }
    $components = $pdo->query('SELECT * FROM custom_home_components ORDER BY placement ASC, sort_order ASC, id ASC')->fetchAll();
} catch (Throwable $ex) {
    $err = $err ?: 'Table custom_home_components not found yet. Open setup.php and click Auto-Upgrade Database Schema.';
}

$adminPageTitle = 'Homepage Custom HTML Components Builder';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
<p style="color:var(--text-muted);margin-top:0;">
  Build custom banners, accreditation grids, NAAC/NIRF callouts, or rich HTML tables using the Visual Word-Style Block Composer and place them anywhere on the public homepage.
</p>

<form method="post" class="card" style="margin-bottom:1.5rem;">
  <h2 style="margin-top:0;"><?= $editing ? 'Edit Homepage Component: ' . e($editing['title']) : 'Add New Homepage HTML Component' ?></h2>
  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
  <input type="hidden" name="action" value="<?= $editing ? 'update' : 'create' ?>">
  <?php if ($editing): ?><input type="hidden" name="component_id" value="<?= (int)$editing['id'] ?>"><?php endif; ?>

  <div class="grid-3" style="margin-bottom:0.75rem;">
    <label>Component Title
      <input type="text" name="title" required value="<?= e($editing['title'] ?? '') ?>" placeholder="e.g. NIRF & Admissions Spotlight" style="width:100%;padding:0.5rem;">
    </label>
    <label>Homepage Placement Slot
      <select name="placement" style="width:100%;padding:0.5rem;">
        <?php foreach ($placements as $key => $label): ?>
          <option value="<?= e($key) ?>" <?= (($editing['placement'] ?? 'after-hero') === $key) ? 'selected' : '' ?>><?= e($label) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label>Sort Order
      <input type="number" min="1" name="sort_order" value="<?= (int)($editing['sort_order'] ?? (count($components) + 1)) ?>" style="width:100%;padding:0.5rem;">
    </label>
  </div>

  <label style="display:block;font-weight:600;margin-bottom:0.35rem;">Component Content (Drag &amp; Drop Graphical Blocks or &lt;&gt; HTML Source):</label>
  <textarea class="rich-editor" data-csrf="<?= e(csrfToken()) ?>" data-upload-url="<?= e(baseUrl('admin/upload_handler.php')) ?>" name="html_content" rows="10"><?= htmlspecialchars($editing['html_content'] ?? '<div class="cms-prose"><div class="cms-block cms-banner-navy"><h2>Custom Institutional Highlight</h2><p>Drag blocks from the right panel or edit HTML source directly.</p></div></div>', ENT_QUOTES, 'UTF-8') ?></textarea>

  <label style="display:block;margin:0.75rem 0;">
    <input type="checkbox" name="is_active" <?= (!$editing || !empty($editing['is_active'])) ? 'checked' : '' ?>> Active on Public Homepage
  </label>

  <button type="submit" class="btn-primary"><?= $editing ? 'Update Homepage Component' : 'Publish to Homepage' ?></button>
  <?php if ($editing): ?><a href="manage_home_components.php" class="btn-secondary" style="margin-left:0.5rem;">Cancel Edit</a><?php endif; ?>
</form>

<div class="card">
  <h2 style="margin-top:0;">Configured Homepage Components (<?= count($components) ?>)</h2>
  <table class="data-table">
    <thead><tr><th>Order</th><th>Title</th><th>Placement Slot</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>
      <?php foreach ($components as $c): ?>
        <tr>
          <td>
            <form method="post" style="display:inline;">
              <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="action" value="move">
              <input type="hidden" name="component_id" value="<?= (int)$c['id'] ?>">
              <button type="submit" name="dir" value="up" class="btn-secondary" style="padding:0.2rem 0.45rem;">&uarr;</button>
              <button type="submit" name="dir" value="down" class="btn-secondary" style="padding:0.2rem 0.45rem;">&darr;</button>
            </form>
            <span style="margin-left:4px;font-size:0.8rem;"><?= (int)$c['sort_order'] ?></span>
          </td>
          <td><strong><?= e($c['title']) ?></strong></td>
          <td><?= e($placements[$c['placement']] ?? $c['placement']) ?></td>
          <td>
            <form method="post" style="display:inline;">
              <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="action" value="toggle_active">
              <input type="hidden" name="component_id" value="<?= (int)$c['id'] ?>">
              <button type="submit" class="btn-secondary" style="padding:0.25rem 0.55rem;font-size:0.78rem;">
                <?= !empty($c['is_active']) ? 'Visible' : 'Hidden' ?>
              </button>
            </form>
          </td>
          <td style="white-space:nowrap;">
            <a href="?edit=<?= (int)$c['id'] ?>" class="btn-primary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Edit</a>
            <form method="post" style="display:inline;" onsubmit="return confirm('Delete this homepage component?');">
              <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="action" value="delete">
              <input type="hidden" name="component_id" value="<?= (int)$c['id'] ?>">
              <button type="submit" class="btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Delete</button>
            </form>
          </td>
        </tr>
      <?php endforeach; ?>
      <?php if (!$components): ?>
        <tr><td colspan="5" style="color:var(--text-muted);">No custom homepage components created yet.</td></tr>
      <?php endif; ?>
    </tbody>
  </table>
</div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
