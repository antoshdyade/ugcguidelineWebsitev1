<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('categories');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$msg = '';
$err = '';
$portalMenus = getPortalMenuItems($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = (string)($_POST['action'] ?? '');

    if ($action === 'create' || $action === 'update') {
        $name = trim((string)($_POST['name'] ?? ''));
        $shortLabel = trim((string)($_POST['short_label'] ?? ''));
        $ugcCode = trim((string)($_POST['ugc_code'] ?? 'Autonomous'));
        $desc = trim((string)($_POST['description'] ?? ''));
        $slugInput = trim((string)($_POST['slug'] ?? '')) ?: $name;
        $slug = trim((string)preg_replace('/[^a-z0-9-]+/', '-', strtolower($slugInput)), '-');
        $menuLocation = in_array($_POST['menu_location'] ?? 'main', ['main', 'more', 'hidden'], true)
            ? (string)$_POST['menu_location']
            : 'main';
        $showInMenu = ($menuLocation !== 'hidden') ? 1 : 0;
        $showOnHome = isset($_POST['show_on_home']) ? 1 : 0;
        $sortOrder = max(1, (int)($_POST['sort_order'] ?? 1));

        if ($name === '' || $slug === '') {
            $err = 'Category name and URL slug are required.';
        } elseif ($action === 'update' && !empty($_POST['category_id'])) {
            $stmt = $pdo->prepare(
                'UPDATE categories SET slug = ?, name = ?, short_label = ?, ugc_code = ?, description = ?, show_in_menu = ?, menu_location = ?, show_on_home = ?, sort_order = ? WHERE id = ?'
            );
            $stmt->execute([$slug, $name, $shortLabel, $ugcCode, $desc, $showInMenu, $menuLocation, $showOnHome, $sortOrder, (int)$_POST['category_id']]);
            logAudit($pdo, $user, 'UPDATE_CATEGORY', 'Category', $name . ' [' . $menuLocation . ']');
            $msg = 'Category updated successfully.';
        } else {
            $stmt = $pdo->prepare(
                'INSERT INTO categories (slug, name, short_label, ugc_code, description, show_in_menu, menu_location, show_on_home, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$slug, $name, $shortLabel, $ugcCode, $desc, $showInMenu, $menuLocation, $showOnHome, $sortOrder]);
            $newCatId = (int)$pdo->lastInsertId();

            $starterQueued = false;
            if (!empty($_POST['create_default_page'])) {
                $isSuper = cmsIsSuperAdmin($user);
                $pgSlug = $slug . '-overview';
                $pgTitle = $name . ' Overview';
                $pgSub = $ugcCode ?: 'Institutional Section';
                $pgHtml = '<h2>' . e($name) . '</h2><p>' . e($desc ?: 'Overview and statutory disclosures for ' . $name . '.') . '</p>';
                $pgPub = $isSuper ? 1 : 0;
                $pgStatus = $isSuper ? 'published' : 'pending_approval';
                $pgStmt = $pdo->prepare(
                    'INSERT INTO pages (category_id, slug, title, subtitle, content_html, is_published, is_shareable, show_share_bar, sort_order, updated_by, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 1, ?, CURDATE(), ?)'
                );
                $pgStmt->execute([
                    $newCatId,
                    $pgSlug,
                    $pgTitle,
                    $pgSub,
                    $pgHtml,
                    $pgPub,
                    $user['full_name'],
                    $pgStatus,
                ]);
                if (!$isSuper) {
                    $newPageId = (int)$pdo->lastInsertId();
                    cmsQueuePendingCreate($pdo, $user, 'pages', $newPageId, $pgTitle, [
                        'category_id' => $newCatId,
                        'slug' => $pgSlug,
                        'title' => $pgTitle,
                        'subtitle' => $pgSub,
                        'content_html' => $pgHtml,
                        'is_published' => 1,
                        'is_shareable' => 1,
                        'show_share_bar' => 1,
                        'sort_order' => 1,
                        'status' => 'pending_approval',
                    ]);
                    $starterQueued = true;
                }
            }
            logAudit($pdo, $user, 'CREATE_CATEGORY', 'Category', $name . ' [' . $menuLocation . ']');
            $msg = 'Category created and routed to ' . ($menuLocation === 'main' ? 'Main Header Bar' : ($menuLocation === 'more' ? 'More Portals' : 'Hidden')) . '.'
                . ($starterQueued ? ' Its starter Overview page has been submitted for Super Admin approval.' : '');
        }
    } elseif ($action === 'move' && !empty($_POST['category_id'])) {
        $cid = (int)$_POST['category_id'];
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'categories', $cid, $dir, null, null, 'id ASC')) {
            logAudit($pdo, $user, 'REORDER_CATEGORIES', 'Category', 'Moved category #' . $cid);
            $msg = 'Category order updated.';
        }
    } elseif ($action === 'set_cat_location' && !empty($_POST['category_id'])) {
        $cid = (int)$_POST['category_id'];
        $loc = in_array($_POST['menu_location'] ?? 'main', ['main', 'more', 'hidden'], true)
            ? (string)$_POST['menu_location']
            : 'main';
        $show = ($loc !== 'hidden') ? 1 : 0;
        $pdo->prepare('UPDATE categories SET menu_location = ?, show_in_menu = ? WHERE id = ?')->execute([$loc, $show, $cid]);
        logAudit($pdo, $user, 'MOVE_CATEGORY_MENU', 'Category', '#' . $cid . ' -> ' . $loc);
        $msg = 'Category header placement updated.';
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
    } elseif ($action === 'save_portal_menu') {
        $pmId = trim((string)($_POST['portal_id'] ?? ''));
        $label = trim((string)($_POST['label'] ?? ''));
        $href = trim((string)($_POST['href'] ?? 'index.php'));
        $loc = in_array($_POST['menuLocation'] ?? 'main', ['main', 'more', 'hidden'], true)
            ? (string)$_POST['menuLocation']
            : 'main';
        $openNew = !empty($_POST['openInNewTab']);

        if ($label === '' || $href === '') {
            $err = 'Portal menu label and destination URL/script are required.';
        } else {
            $found = false;
            foreach ($portalMenus as &$pm) {
                if ($pm['id'] === $pmId) {
                    $pm['label'] = $label;
                    if (empty($pm['isSystem'])) {
                        $pm['href'] = $href;
                    }
                    $pm['menuLocation'] = $loc;
                    $pm['openInNewTab'] = $openNew;
                    $found = true;
                    break;
                }
            }
            unset($pm);
            if (!$found) {
                $newId = 'custom-' . trim((string)preg_replace('/[^a-z0-9]+/', '-', strtolower($label)), '-') . '-' . random_int(10, 99);
                $portalMenus[] = [
                    'id'           => $newId,
                    'label'        => $label,
                    'href'         => $href,
                    'matchScripts' => [],
                    'menuLocation' => $loc,
                    'sortOrder'    => count($portalMenus) + 1,
                    'isSystem'     => false,
                    'openInNewTab' => $openNew,
                ];
            }
            savePortalMenuItems($pdo, $portalMenus);
            logAudit($pdo, $user, 'SAVE_PORTAL_MENU', 'Header Menu', $label . ' [' . $loc . ']');
            $msg = 'Header portal menu "' . $label . '" saved.';
        }
    } elseif ($action === 'set_portal_location' && !empty($_POST['portal_id'])) {
        $pmId = (string)$_POST['portal_id'];
        $loc = in_array($_POST['menuLocation'] ?? 'main', ['main', 'more', 'hidden'], true)
            ? (string)$_POST['menuLocation']
            : 'main';
        foreach ($portalMenus as &$pm) {
            if ($pm['id'] === $pmId) {
                $pm['menuLocation'] = $loc;
                break;
            }
        }
        unset($pm);
        savePortalMenuItems($pdo, $portalMenus);
        logAudit($pdo, $user, 'MOVE_PORTAL_MENU', 'Header Menu', $pmId . ' -> ' . $loc);
        $msg = 'Portal menu placement updated (' . ($loc === 'main' ? 'Main Header Bar' : ($loc === 'more' ? 'More Portals' : 'Hidden')) . ').';
    } elseif ($action === 'move_portal_menu' && !empty($_POST['portal_id'])) {
        $pmId = (string)$_POST['portal_id'];
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 1 : -1;
        foreach ($portalMenus as $idx => $pm) {
            if ($pm['id'] === $pmId) {
                $swap = $idx + $dir;
                if (isset($portalMenus[$swap])) {
                    $tmp = $portalMenus[$idx];
                    $portalMenus[$idx] = $portalMenus[$swap];
                    $portalMenus[$swap] = $tmp;
                    foreach ($portalMenus as $sIdx => &$row) {
                        $row['sortOrder'] = $sIdx + 1;
                    }
                    unset($row);
                    savePortalMenuItems($pdo, $portalMenus);
                    $msg = 'Portal link order updated.';
                }
                break;
            }
        }
    } elseif ($action === 'delete_portal_menu' && !empty($_POST['portal_id'])) {
        $pmId = (string)$_POST['portal_id'];
        $filtered = [];
        foreach ($portalMenus as $pm) {
            if ($pm['id'] === $pmId && empty($pm['isSystem'])) {
                continue;
            }
            $filtered[] = $pm;
        }
        foreach ($filtered as $sIdx => &$row) {
            $row['sortOrder'] = $sIdx + 1;
        }
        unset($row);
        $portalMenus = $filtered;
        savePortalMenuItems($pdo, $portalMenus);
        logAudit($pdo, $user, 'DELETE_PORTAL_MENU', 'Header Menu', $pmId);
        $msg = 'Custom header link removed.';
    }
}

$editingCat = null;
if (!empty($_GET['edit'])) {
    $st = $pdo->prepare('SELECT * FROM categories WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit']]);
    $editingCat = $st->fetch() ?: null;
}

$editingPortal = null;
if (!empty($_GET['edit_portal'])) {
    foreach ($portalMenus as $pm) {
        if ($pm['id'] === (string)$_GET['edit_portal']) {
            $editingPortal = $pm;
            break;
        }
    }
}

$cats = $pdo->query(
    'SELECT c.*, (SELECT COUNT(*) FROM pages p WHERE p.category_id = c.id) AS page_count FROM categories c ORDER BY c.sort_order ASC, c.id ASC'
)->fetchAll();
$partitioned = partitionHeaderMenus($cats, $portalMenus);

$adminPageTitle = 'Categories, Header Menus & More Portals Routing';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
  <p style="color:var(--text-muted);margin-top:0;">
    View and manage <strong>every menu item shown on the website homepage</strong>—both UGC Content Categories and Standalone Portals (Conferences, Placements, Grievance &amp; Anti-Ragging, Alumni, Gallery, Contact Us, Quick Links)—and move any item between <strong>Main Header Bar</strong>, <strong>More Portals</strong> dropdown, or <strong>Hidden</strong>.
  </p>

  <!-- Live Header Menu Bar Preview -->
  <div class="card" style="margin-bottom:1.25rem;background:linear-gradient(135deg,#0F294A,#1E3A5F);color:#fff;">
    <div style="font-size:0.74rem;text-transform:uppercase;letter-spacing:0.08em;color:#FDE68A;font-weight:700;margin-bottom:0.45rem;">
      Live Public Header Navigation Preview (Main Bar: <?= count($partitioned['mainCats']) + count($partitioned['mainPortals']) ?> · More Portals: <?= count($partitioned['moreCats']) + count($partitioned['morePortals']) ?>)
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;margin-bottom:0.55rem;">
      <span style="padding:0.25rem 0.65rem;border-radius:6px;background:rgba(255,255,255,0.18);font-size:0.78rem;font-weight:700;">Home</span>
      <?php foreach ($partitioned['mainCats'] as $mc): ?>
        <span style="padding:0.25rem 0.65rem;border-radius:6px;background:rgba(255,255,255,0.12);font-size:0.78rem;font-weight:600;">
          <?= e(!empty($mc['short_label']) ? $mc['short_label'] : $mc['name']) ?>
        </span>
      <?php endforeach; ?>
      <?php foreach ($partitioned['mainPortals'] as $mp): ?>
        <span style="padding:0.25rem 0.65rem;border-radius:6px;background:rgba(245,158,11,0.22);border:1px solid rgba(252,211,77,0.45);font-size:0.78rem;font-weight:700;color:#FEF3C7;">
          <?= e((string)$mp['label']) ?>
        </span>
      <?php endforeach; ?>
      <?php if (!empty($partitioned['moreCats']) || !empty($partitioned['morePortals'])): ?>
        <span style="padding:0.25rem 0.65rem;border-radius:6px;background:#B45309;font-size:0.78rem;font-weight:700;color:#fff;">
          More Portals (<?= count($partitioned['moreCats']) + count($partitioned['morePortals']) ?>) &darr;
        </span>
      <?php endif; ?>
    </div>
    <?php if (!empty($partitioned['moreCats']) || !empty($partitioned['morePortals'])): ?>
      <div style="font-size:0.76rem;color:#CBD5E1;">
        <strong>Inside &ldquo;More Portals&rdquo; dropdown:</strong>
        <?php
        $moreNames = [];
        foreach ($partitioned['moreCats'] as $oc) $moreNames[] = $oc['name'];
        foreach ($partitioned['morePortals'] as $op) $moreNames[] = $op['label'];
        echo e(implode(' · ', $moreNames));
        ?>
      </div>
    <?php endif; ?>
  </div>

  <!-- Category Form -->
  <form method="post" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;"><?= $editingCat ? 'Edit Category: ' . e($editingCat['name']) : 'Add New Top-Level Category Section' ?></h2>
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
      <label>Header Menu Placement
        <?php $curLoc = $editingCat['menu_location'] ?? ((!empty($editingCat) && empty($editingCat['show_in_menu'])) ? 'hidden' : 'main'); ?>
        <select name="menu_location" style="width:100%;padding:0.5rem;">
          <option value="main" <?= $curLoc === 'main' ? 'selected' : '' ?>>Main Header Bar (Primary Top Menu)</option>
          <option value="more" <?= $curLoc === 'more' ? 'selected' : '' ?>>Inside "More Portals" Dropdown</option>
          <option value="hidden" <?= $curLoc === 'hidden' ? 'selected' : '' ?>>Hidden from Top Navigation</option>
        </select>
      </label>
      <label>UGC / Autonomous Badge
        <input type="text" name="ugc_code" value="<?= e($editingCat['ugc_code'] ?? 'Autonomous Section') ?>" placeholder="Autonomous · CoE / Section 5(a)" style="width:100%;padding:0.5rem;">
      </label>
      <label>Short Description
        <input type="text" name="description" value="<?= e($editingCat['description'] ?? '') ?>" placeholder="Displayed on homepage portal directory cards" style="width:100%;padding:0.5rem;">
      </label>
    </div>
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:center;margin-bottom:0.75rem;">
      <label>Order <input type="number" min="1" name="sort_order" value="<?= (int)($editingCat['sort_order'] ?? (count($cats) + 1)) ?>" style="width:80px;padding:0.35rem;"></label>
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

  <!-- Category Table with 1-Click Main / More Portals / Hidden -->
  <div class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;">1. Content Categories &amp; UGC Sections (<?= count($cats) ?>)</h2>
    <div class="cms-table-wrap">
      <table class="cms-table cms-table-navy">
        <thead>
          <tr>
            <th>Order</th>
            <th>Category</th>
            <th>Badge</th>
            <th>Pages</th>
            <th>Header Placement</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($cats as $c):
            $cLoc = $c['menu_location'] ?? (!empty($c['show_in_menu']) ? 'main' : 'hidden');
          ?>
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
                <br><small style="color:var(--text-muted);">page.php?cat=<?= e($c['slug']) ?></small>
              </td>
              <td><?= e($c['ugc_code']) ?></td>
              <td>
                <a href="manage_pages.php?cat=<?= (int)$c['id'] ?>" class="btn-secondary" style="padding:0.25rem 0.55rem;font-size:0.8rem;">
                  <?= (int)$c['page_count'] ?> Pages &rarr;
                </a>
              </td>
              <td>
                <form method="post" style="display:inline-flex;gap:0.25rem;flex-wrap:wrap;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="set_cat_location">
                  <input type="hidden" name="category_id" value="<?= (int)$c['id'] ?>">
                  <button type="submit" name="menu_location" value="main" class="<?= $cLoc === 'main' ? 'btn-primary' : 'btn-outline' ?> btn-sm">Main Bar</button>
                  <button type="submit" name="menu_location" value="more" class="<?= $cLoc === 'more' ? 'btn-secondary' : 'btn-outline' ?> btn-sm">More Portals</button>
                  <button type="submit" name="menu_location" value="hidden" class="<?= $cLoc === 'hidden' ? 'btn-danger' : 'btn-outline' ?> btn-sm">Hidden</button>
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
  </div>

  <!-- Standalone Portals & Custom Header Menu Items -->
  <div class="card">
    <h2 style="margin-top:0;">2. Standalone Website Portals &amp; Custom Header Links (<?= count($portalMenus) ?>)</h2>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-top:0;">
      Move <strong>Conferences</strong>, <strong>Placements</strong>, <strong>Grievance &amp; Anti-Ragging</strong>, <strong>Alumni</strong>, <strong>Gallery</strong>, <strong>Contact Us</strong>, or <strong>Quick Links</strong> between the <strong>Main Header Bar</strong> and <strong>More Portals</strong> dropdown, reorder them, or add custom external/ERP portal links.
    </p>

    <form method="post" style="background:#FAFAF9;border:1px solid var(--border-color);border-radius:10px;padding:0.9rem;margin-bottom:1rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_portal_menu">
      <input type="hidden" name="portal_id" value="<?= e((string)($editingPortal['id'] ?? '')) ?>">
      <strong style="display:block;margin-bottom:0.5rem;font-size:0.88rem;"><?= $editingPortal ? 'Edit Portal Menu Item: ' . e((string)$editingPortal['label']) : 'Add Custom Header Portal / ERP Link' ?></strong>
      <div class="grid-4" style="margin-bottom:0.55rem;">
        <label style="font-size:0.8rem;font-weight:600;">Menu Label *
          <input type="text" name="label" required value="<?= e((string)($editingPortal['label'] ?? '')) ?>" placeholder="e.g. Student ERP / NIRF" style="width:100%;padding:0.45rem;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">URL / Script *
          <input type="text" name="href" required <?= !empty($editingPortal['isSystem']) ? 'readonly' : '' ?> value="<?= e((string)($editingPortal['href'] ?? '')) ?>" placeholder="https://... or page.php?slug=..." style="width:100%;padding:0.45rem;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Header Placement
          <?php $pLoc = (string)($editingPortal['menuLocation'] ?? 'main'); ?>
          <select name="menuLocation" style="width:100%;padding:0.45rem;">
            <option value="main" <?= $pLoc === 'main' ? 'selected' : '' ?>>Main Header Bar</option>
            <option value="more" <?= $pLoc === 'more' ? 'selected' : '' ?>>More Portals Dropdown</option>
            <option value="hidden" <?= $pLoc === 'hidden' ? 'selected' : '' ?>>Hidden</option>
          </select>
        </label>
        <label style="font-size:0.8rem;font-weight:600;display:flex;align-items:center;gap:0.4rem;padding-top:1.1rem;">
          <input type="checkbox" name="openInNewTab" value="1" <?= !empty($editingPortal['openInNewTab']) ? 'checked' : '' ?>> Open in new tab
        </label>
      </div>
      <button type="submit" class="btn-primary btn-sm"><?= $editingPortal ? 'Update Portal Menu Item' : 'Add Custom Header Link' ?></button>
      <?php if ($editingPortal): ?>
        <a href="manage_categories.php" class="btn-outline btn-sm" style="margin-left:0.4rem;">Cancel</a>
      <?php endif; ?>
    </form>

    <div class="cms-table-wrap">
      <table class="cms-table cms-table-navy">
        <thead>
          <tr>
            <th>Order</th>
            <th>Menu Label</th>
            <th>Destination</th>
            <th>Type</th>
            <th>Placement (Main / More / Hide)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($portalMenus as $idx => $pm):
            $loc = (string)($pm['menuLocation'] ?? 'main');
          ?>
            <tr>
              <td>
                <form method="post" style="display:inline;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="move_portal_menu">
                  <input type="hidden" name="portal_id" value="<?= e((string)$pm['id']) ?>">
                  <button type="submit" name="dir" value="up" class="btn-secondary" style="padding:0.2rem 0.45rem;">&uarr;</button>
                  <button type="submit" name="dir" value="down" class="btn-secondary" style="padding:0.2rem 0.45rem;">&darr;</button>
                </form>
                <span style="margin-left:4px;font-size:0.8rem;"><?= $idx + 1 ?></span>
              </td>
              <td><strong><?= e((string)$pm['label']) ?></strong></td>
              <td><code><?= e((string)$pm['href']) ?></code></td>
              <td><?= !empty($pm['isSystem']) ? '<span class="badge badge-ok">Built-in Portal</span>' : '<span class="badge badge-warn">Custom Link</span>' ?></td>
              <td>
                <form method="post" style="display:inline-flex;gap:0.25rem;flex-wrap:wrap;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="set_portal_location">
                  <input type="hidden" name="portal_id" value="<?= e((string)$pm['id']) ?>">
                  <button type="submit" name="menuLocation" value="main" class="<?= $loc === 'main' ? 'btn-primary' : 'btn-outline' ?> btn-sm">Main Bar</button>
                  <button type="submit" name="menuLocation" value="more" class="<?= $loc === 'more' ? 'btn-secondary' : 'btn-outline' ?> btn-sm">More Portals</button>
                  <button type="submit" name="menuLocation" value="hidden" class="<?= $loc === 'hidden' ? 'btn-danger' : 'btn-outline' ?> btn-sm">Hidden</button>
                </form>
              </td>
              <td style="white-space:nowrap;">
                <a href="?edit_portal=<?= urlencode((string)$pm['id']) ?>" class="btn-primary btn-sm">Edit</a>
                <?php if (empty($pm['isSystem'])): ?>
                  <form method="post" style="display:inline;" onsubmit="return confirm('Delete this custom header menu item?');">
                    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                    <input type="hidden" name="action" value="delete_portal_menu">
                    <input type="hidden" name="portal_id" value="<?= e((string)$pm['id']) ?>">
                    <button type="submit" class="btn-danger btn-sm">Delete</button>
                  </form>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
