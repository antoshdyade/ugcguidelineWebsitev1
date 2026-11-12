<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('categories');
$pdo = getDB();
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'create' || $action === 'update') {
        $name = trim($_POST['name'] ?? '');
        $shortLabel = trim($_POST['short_label'] ?? '');
        $ugcCode = trim($_POST['ugc_code'] ?? 'Autonomous');
        $desc = trim($_POST['description'] ?? '');
        $slugInput = trim($_POST['slug'] ?? '') ?: $name;
        $slug = trim(preg_replace('/[^a-z0-9-]+/', '-', strtolower($slugInput)), '-');
        $showInMenu = isset($_POST['show_in_menu']) ? 1 : 0;
        $showOnHome = isset($_POST['show_on_home']) ? 1 : 0;
        $sortOrder = max(1, (int)($_POST['sort_order'] ?? 1));

        if ($name === '' || $slug === '') {
            $err = 'Category name and URL slug are required.';
        } elseif ($action === 'update' && !empty($_POST['category_id'])) {
            $stmt = $pdo->prepare(
                'UPDATE categories SET slug = ?, name = ?, short_label = ?, ugc_code = ?, description = ?, show_in_menu = ?, show_on_home = ?, sort_order = ? WHERE id = ?'
            );
            $stmt->execute([$slug, $name, $shortLabel, $ugcCode, $desc, $showInMenu, $showOnHome, $sortOrder, (int)$_POST['category_id']]);
            logAudit($pdo, $user, 'UPDATE_CATEGORY', 'Category', $name);
            $msg = 'Category updated successfully.';
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO categories (slug, name, short_label, ugc_code, description, show_in_menu, show_on_home, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$slug, $name, $shortLabel, $ugcCode, $desc, $showInMenu, $showOnHome, $sortOrder]);
            $newCatId = (int)$pdo->lastInsertId();

            if (!empty($_POST['create_default_page'])) {
                $pgStmt = $pdo->prepare(
                    'INSERT INTO pages (category_id, slug, title, subtitle, content_html, is_published, sort_order, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, 1, 1, ?, CURDATE())'
                );
                $pgStmt->execute([
                    $newCatId,
                    $slug . '-overview',
                    $name . ' Overview',
                    $ugcCode ?: 'Institutional Section',
                    '<h2>' . e($name) . '</h2><p>' . e($desc ?: 'Overview and statutory disclosures for ' . $name . '.') . '</p>',
                    $user['full_name'],
                ]);
            }
            logAudit($pdo, $user, 'CREATE_CATEGORY', 'Category', $name);
            $msg = 'Category created and added to public navigation.';
        }
    } elseif ($action === 'move' && !empty($_POST['category_id'])) {
        $cid = (int)$_POST['category_id'];
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        $all = $pdo->query('SELECT id, sort_order FROM categories ORDER BY sort_order ASC, id ASC')->fetchAll();
        foreach ($all as $idx => $row) {
            if ((int)$row['id'] === $cid) {
                $swapIdx = $dir === 'up' ? $idx - 1 : $idx + 1;
                if (isset($all[$swapIdx])) {
                    $other = $all[$swapIdx];
                    $upd = $pdo->prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
                    $upd->execute([(int)$other['sort_order'], (int)$row['id']]);
                    $upd->execute([(int)$row['sort_order'], (int)$other['id']]);
                    logAudit($pdo, $user, 'REORDER_CATEGORIES', 'Category', 'Moved category #' . $cid);
                    $msg = 'Menu order updated.';
                }
                break;
            }
        }
    } elseif ($action === 'toggle_menu' && !empty($_POST['category_id'])) {
        $cid = (int)$_POST['category_id'];
        $pdo->prepare('UPDATE categories SET show_in_menu = IF(show_in_menu = 1, 0, 1) WHERE id = ?')->execute([$cid]);
        $msg = 'Menu visibility updated.';
    } elseif ($action === 'delete' && !empty($_POST['category_id'])) {
        $total = (int)$pdo->query('SELECT COUNT(*) FROM categories')->fetchColumn();
        if ($total <= 1) {
            $err = 'At least one category must remain in the CMS.';
        } else {
            $cid = (int)$_POST['category_id'];
            $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$cid]);
            logAudit($pdo, $user, 'DELETE_CATEGORY', 'Category', 'ID #' . $cid);
            $msg = 'Category and its child micro-pages deleted.';
        }
    }
}

$editingCat = null;
if (!empty($_GET['edit'])) {
    $st = $pdo->prepare('SELECT * FROM categories WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit']]);
    $editingCat = $st->fetch() ?: null;
}

$cats = $pdo->query(
    'SELECT c.*, (SELECT COUNT(*) FROM pages p WHERE p.category_id = c.id) AS page_count FROM categories c ORDER BY c.sort_order ASC, c.id ASC'
)->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manage Categories &amp; Navigation</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="container" style="padding:2rem 1rem;">
  <p><a href="dashboard.php">&larr; Dashboard</a></p>
  <h1>Manage Header Categories &amp; Autonomous Sections</h1>
  <p style="color:var(--text-muted);">Create new top-level sections (e.g. Examination, Autonomous Cell, Skill Development), reorder menu items, and control homepage directory visibility without coding.</p>
  <?php if ($msg): ?><p style="color:#15803d;font-weight:600;"><?= e($msg) ?></p><?php endif; ?>
  <?php if ($err): ?><p style="color:#b91c1c;font-weight:600;"><?= e($err) ?></p><?php endif; ?>

  <form method="post" class="card" style="margin-bottom:1.5rem;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="<?= $editingCat ? 'update' : 'create' ?>">
    <?php if ($editingCat): ?>
      <input type="hidden" name="category_id" value="<?= (int)$editingCat['id'] ?>">
    <?php endif; ?>

    <div class="grid-2" style="margin-bottom:0.75rem;">
      <label>Category Name
        <input type="text" name="name" required value="<?= e($editingCat['name'] ?? '') ?>" placeholder="e.g. Examination" style="width:100%;padding:0.5rem;">
      </label>
      <label>Short Nav Label (Optional)
        <input type="text" name="short_label" value="<?= e($editingCat['short_label'] ?? '') ?>" placeholder="Compact header button label" style="width:100%;padding:0.5rem;">
      </label>
      <label>URL Slug
        <input type="text" name="slug" value="<?= e($editingCat['slug'] ?? '') ?>" placeholder="auto-generated-from-name" style="width:100%;padding:0.5rem;">
      </label>
      <label>UGC / Autonomous Badge
        <input type="text" name="ugc_code" value="<?= e($editingCat['ugc_code'] ?? 'Autonomous Section') ?>" placeholder="Autonomous · CoE / Section 5(a)" style="width:100%;padding:0.5rem;">
      </label>
    </div>
    <label style="display:block;margin-bottom:0.75rem;">Short Description
      <input type="text" name="description" value="<?= e($editingCat['description'] ?? '') ?>" placeholder="Displayed on homepage portal directory cards" style="width:100%;padding:0.5rem;">
    </label>
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;margin-bottom:0.75rem;">
      <label>Order <input type="number" min="1" name="sort_order" value="<?= (int)($editingCat['sort_order'] ?? (count($cats) + 1)) ?>" style="width:80px;padding:0.35rem;"></label>
      <label><input type="checkbox" name="show_in_menu" <?= (!$editingCat || !empty($editingCat['show_in_menu'])) ? 'checked' : '' ?>> Show in Main Navigation</label>
      <label><input type="checkbox" name="show_on_home" <?= (!$editingCat || !empty($editingCat['show_on_home'])) ? 'checked' : '' ?>> Show on Homepage Directory</label>
      <?php if (!$editingCat): ?>
        <label><input type="checkbox" name="create_default_page" checked> Auto-create starter Overview micro-page</label>
      <?php endif; ?>
    </div>
    <button type="submit" class="btn-primary"><?= $editingCat ? 'Update Category' : 'Add Category Section' ?></button>
    <?php if ($editingCat): ?>
      <a href="manage_categories.php" class="btn-secondary" style="margin-left:0.5rem;">Cancel Edit</a>
    <?php endif; ?>
  </form>

  <div class="card">
    <table class="data-table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Category</th>
          <th>Badge</th>
          <th>Pages</th>
          <th>Menu</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($cats as $c): ?>
          <tr>
            <td>
              <form method="post" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="move">
                <input type="hidden" name="category_id" value="<?= (int)$c['id'] ?>">
                <button type="submit" name="dir" value="up" class="btn-secondary" style="padding:0.2rem 0.45rem;">&uarr;</button>
                <button type="submit" name="dir" value="down" class="btn-secondary" style="padding:0.2rem 0.45rem;">&darr;</button>
              </form>
              <span style="margin-left:4px;font-size:0.8rem;"><?= (int)$c['sort_order'] ?></span>
            </td>
            <td>
              <strong><?= e($c['name']) ?></strong>
              <br><small style="color:var(--text-muted);">/category/<?= e($c['slug']) ?></small>
            </td>
            <td><?= e($c['ugc_code']) ?></td>
            <td>
              <a href="manage_pages.php?cat=<?= (int)$c['id'] ?>" class="btn-secondary" style="padding:0.25rem 0.55rem;font-size:0.8rem;">
                <?= (int)$c['page_count'] ?> Pages &rarr;
              </a>
            </td>
            <td>
              <form method="post" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="toggle_menu">
                <input type="hidden" name="category_id" value="<?= (int)$c['id'] ?>">
                <button type="submit" class="btn-secondary" style="padding:0.25rem 0.55rem;font-size:0.78rem;">
                  <?= !empty($c['show_in_menu']) ? 'In Menu' : 'Hidden' ?>
                </button>
              </form>
            </td>
            <td style="white-space:nowrap;">
              <a href="?edit=<?= (int)$c['id'] ?>" class="btn-primary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Edit</a>
              <form method="post" style="display:inline;" onsubmit="return confirm('Delete this category and all its pages?');">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="category_id" value="<?= (int)$c['id'] ?>">
                <button type="submit" class="btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Delete</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</body>
</html>
