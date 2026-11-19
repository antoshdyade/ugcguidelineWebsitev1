<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('pages');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$msg = '';
$err = '';

$allCats = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')->fetchAll();
$catsById = [];
$cats = [];
foreach ($allCats as $c) {
    $catsById[(int)$c['id']] = $c;
    if (canAccessCategory($user, $c['slug'])) {
        $cats[] = $c;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'create' || $action === 'update') {
        $targetCatId = (int)($_POST['category_id'] ?? 0);
        $targetCat = $catsById[$targetCatId] ?? null;

        if ($action === 'update' && !empty($_POST['page_id'])) {
            $chk = $pdo->prepare('SELECT p.*, c.slug AS cat_slug FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.id = ? LIMIT 1');
            $chk->execute([(int)$_POST['page_id']]);
            $existing = $chk->fetch();
            if (!$existing || !canAccessPage($user, $existing, $existing['cat_slug'])) {
                $err = 'Access Denied: You do not have permission to edit this specific page.';
            } elseif (!$targetCat || ($targetCatId !== (int)$existing['category_id'] && !canAccessCategory($user, $targetCat['slug']))) {
                $err = 'Access Denied: Your RBAC role does not allow moving this page to that category.';
            }
        } else {
            if (!$targetCat || !canAccessCategory($user, $targetCat['slug'])) {
                $err = 'Access Denied: Your RBAC role does not allow creating pages in this category.';
            }
        }

        if ($err === '') {
            $pdfUrl = trim($_POST['attached_pdf_url'] ?? '');
            $pdfLabel = trim($_POST['attached_pdf_label'] ?? '');
            if (!empty($_FILES['pdf_file']['name'])) {
                $up = handleCmsUpload($pdo, $_FILES['pdf_file'], __DIR__ . '/../uploads', 'document');
                if ($up['ok']) {
                    $pdfUrl = $up['file_url'];
                    if ($pdfLabel === '') {
                        $pdfLabel = 'Download Attachment (' . $_FILES['pdf_file']['name'] . ')';
                    }
                } else {
                    $err = $up['error'];
                }
            } elseif ($pdfUrl !== '' && strpos($pdfUrl, 'uploads/') !== 0 && !validateExternalUrl($pdfUrl)) {
                $err = 'Attachment URL must be a relative uploads/... path or a valid https:// / http:// link (e.g. Google Drive).';
            }
        }

        if ($err === '') {
            $rawSlug = trim((string)($_POST['slug'] ?? ''));
            if ($rawSlug === '') {
                $rawSlug = trim((string)($_POST['title'] ?? ''));
            }
            $slug = normalizePhpSlug($rawSlug);
            if ($slug === '') {
                $slug = 'page-' . random_int(100, 999);
            }
            $sortOrder = max(1, (int)($_POST['sort_order'] ?? 1));
            $metaDesc = trim((string)($_POST['meta_description'] ?? ''));
            $showShareBar = isset($_POST['show_share_bar']) ? 1 : 0;

            if ($action === 'update' && !empty($_POST['page_id'])) {
                $stmt = $pdo->prepare(
                    'UPDATE pages SET category_id = ?, slug = ?, title = ?, subtitle = ?, meta_description = ?, content_html = ?, attached_pdf_url = ?, attached_pdf_label = ?, show_share_bar = ?, is_published = ?, sort_order = ?, updated_by = ?, updated_at = CURDATE() WHERE id = ?'
                );
                $stmt->execute([
                    $targetCatId,
                    $slug,
                    trim($_POST['title']),
                    trim($_POST['subtitle'] ?? ''),
                    $metaDesc,
                    $_POST['content_html'] ?? '<p></p>',
                    $pdfUrl !== '' ? $pdfUrl : null,
                    $pdfLabel !== '' ? $pdfLabel : null,
                    $showShareBar,
                    isset($_POST['is_published']) ? 1 : 0,
                    $sortOrder,
                    $user['full_name'],
                    (int)$_POST['page_id'],
                ]);
                logAudit($pdo, $user, 'UPDATE_PAGE', 'Page', $_POST['title']);
                $msg = 'Disclosure page updated successfully.';
            } else {
                $stmt = $pdo->prepare(
                    'INSERT INTO pages (category_id, slug, title, subtitle, meta_description, content_html, attached_pdf_url, attached_pdf_label, show_share_bar, is_published, sort_order, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())'
                );
                $stmt->execute([
                    $targetCatId,
                    $slug,
                    trim($_POST['title']),
                    trim($_POST['subtitle'] ?? ''),
                    $metaDesc,
                    $_POST['content_html'] ?? '<p></p>',
                    $pdfUrl !== '' ? $pdfUrl : null,
                    $pdfLabel !== '' ? $pdfLabel : null,
                    $showShareBar,
                    isset($_POST['is_published']) ? 1 : 0,
                    $sortOrder,
                    $user['full_name'],
                ]);
                logAudit($pdo, $user, 'CREATE_PAGE', 'Page', $_POST['title']);
                $msg = 'Disclosure page created successfully.';
            }
        }
    } elseif ($action === 'toggle_publish' && !empty($_POST['page_id'])) {
        $chk = $pdo->prepare('SELECT p.*, c.slug AS cat_slug FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.id = ? LIMIT 1');
        $chk->execute([(int)$_POST['page_id']]);
        $existing = $chk->fetch();
        if (!$existing || !canAccessPage($user, $existing, $existing['cat_slug'])) {
            $err = 'Access Denied: Cannot change visibility of a page outside your RBAC scope.';
        } else {
            $nextState = !empty($existing['is_published']) ? 0 : 1;
            $pdo->prepare('UPDATE pages SET is_published = ?, updated_by = ?, updated_at = CURDATE() WHERE id = ?')
                ->execute([$nextState, $user['full_name'], (int)$existing['id']]);
            logAudit($pdo, $user, $nextState ? 'SHOW_PAGE' : 'HIDE_PAGE', 'Page', $existing['title']);
            $msg = 'Micro-page "' . $existing['title'] . '" is now ' . ($nextState ? 'Visible (Published).' : 'Hidden (Draft).');
        }
    } elseif ($action === 'delete') {
        $chk = $pdo->prepare('SELECT p.*, c.slug AS cat_slug FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.id = ? LIMIT 1');
        $chk->execute([(int)$_POST['page_id']]);
        $existing = $chk->fetch();
        if (!$existing || !canAccessPage($user, $existing, $existing['cat_slug'])) {
            $err = 'Access Denied: Cannot delete a page outside your RBAC scope.';
        } else {
            $stmt = $pdo->prepare('DELETE FROM pages WHERE id = ?');
            $stmt->execute([(int)$_POST['page_id']]);
            logAudit($pdo, $user, 'DELETE_PAGE', 'Page', $existing['title']);
            $msg = 'Page deleted.';
        }
    } elseif ($action === 'move' && !empty($_POST['page_id'])) {
        $chk = $pdo->prepare('SELECT p.*, c.slug AS cat_slug FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.id = ? LIMIT 1');
        $chk->execute([(int)$_POST['page_id']]);
        $existing = $chk->fetch();
        if (!$existing || !canAccessPage($user, $existing, $existing['cat_slug'])) {
            $err = 'Access Denied: Cannot reorder a page outside your RBAC scope.';
        } else {
            $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
            if (swapSortOrder($pdo, 'pages', (int)$existing['id'], $dir, 'category_id', (int)$existing['category_id'], 'id DESC')) {
                logAudit($pdo, $user, 'REORDER_PAGES', 'Page', $existing['title']);
                $msg = 'Page order updated.';
            }
        }
    }
}

$editingPage = null;
if (!empty($_GET['edit'])) {
    $st = $pdo->prepare('SELECT p.*, c.slug AS cat_slug FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit']]);
    $cand = $st->fetch() ?: null;
    if ($cand && canAccessPage($user, $cand, $cand['cat_slug'])) {
        $editingPage = $cand;
    } elseif ($cand) {
        $err = 'Access Denied: Requested page is outside your RBAC permission scope.';
    }
}

$filterCatId = !empty($_GET['cat']) ? (int)$_GET['cat'] : 0;
if ($filterCatId > 0) {
    $stPg = $pdo->prepare('SELECT p.*, c.name AS cat_name, c.slug AS cat_slug FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? ORDER BY p.sort_order ASC, p.id DESC');
    $stPg->execute([$filterCatId]);
    $rawPages = $stPg->fetchAll();
} else {
    $rawPages = $pdo->query('SELECT p.*, c.name AS cat_name, c.slug AS cat_slug FROM pages p JOIN categories c ON p.category_id = c.id ORDER BY c.sort_order ASC, p.sort_order ASC, p.id DESC')->fetchAll();
}
$pages = array_values(array_filter($rawPages, static fn($pg) => canAccessPage($user, $pg, $pg['cat_slug'])));

$adminPageTitle = $editingPage ? 'Edit Page: ' . $editingPage['title'] : 'Manage Dynamic UGC & Autonomous Micro-Pages';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.85rem;">
    <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
      <a href="manage_pages.php" class="<?= $filterCatId === 0 ? 'btn-primary' : 'btn-secondary' ?>" style="font-size:0.8rem;padding:0.35rem 0.7rem;">All Permitted Categories</a>
      <?php foreach ($cats as $c): ?>
        <a href="?cat=<?= (int)$c['id'] ?>" class="<?= $filterCatId === (int)$c['id'] ? 'btn-primary' : 'btn-secondary' ?>" style="font-size:0.8rem;padding:0.35rem 0.7rem;">
          <?= e($c['name']) ?>
        </a>
      <?php endforeach; ?>
    </div>
    <?php if (canAccessResource($user, 'categories')): ?>
      <a href="manage_categories.php" class="btn-secondary" style="font-size:0.8rem;padding:0.35rem 0.75rem;">Manage Categories &amp; Nav &rarr;</a>
    <?php endif; ?>
  </div>

  <?php if (!empty($user['allowed_page_ids']) || $user['role'] === 'specific_page_editor'): ?>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a;padding:0.65rem 0.9rem;border-radius:8px;font-size:0.82rem;margin-bottom:1rem;">
      <strong>Per-Page / Category RBAC Active:</strong> You are authorized to edit <?= count($pages) ?> specifically assigned disclosure page(s)<?= !empty($cats) ? ' across ' . count($cats) . ' permitted category(ies)' : '' ?>.
    </div>
  <?php elseif ($user['role'] === 'exam_controller'): ?>
    <div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:0.65rem 0.9rem;border-radius:8px;font-size:0.82rem;margin-bottom:1rem;">
      <strong>Examination Controller Scope:</strong> Scoped strictly to Examination Cell &amp; CoE micro-pages.
    </div>
  <?php endif; ?>

  <?php
  $formCats = $cats;
  if ($editingPage && empty($formCats) && isset($catsById[(int)$editingPage['category_id']])) {
      $formCats = [$catsById[(int)$editingPage['category_id']]];
  }
  ?>
  <?php if (!empty($formCats)): ?>
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="<?= $editingPage ? 'update' : 'create' ?>">
    <?php if ($editingPage): ?>
      <input type="hidden" name="page_id" value="<?= (int)$editingPage['id'] ?>">
    <?php endif; ?>
    <div class="grid-2" style="margin-bottom:0.75rem;">
      <select name="category_id" required style="padding:0.5rem;">
        <?php foreach ($formCats as $c): ?>
          <?php $selectedCat = $editingPage ? (int)$editingPage['category_id'] : $filterCatId; ?>
          <option value="<?= (int)$c['id'] ?>" <?= $selectedCat === (int)$c['id'] ? 'selected' : '' ?>>
            <?= e($c['name']) ?>
          </option>
        <?php endforeach; ?>
      </select>
      <div style="display:flex;gap:0.5rem;">
        <input type="text" name="slug" required value="<?= e($editingPage['slug'] ?? '') ?>" placeholder="url-slug" style="flex:1;padding:0.5rem;">
        <input type="number" name="sort_order" min="1" value="<?= (int)($editingPage['sort_order'] ?? 1) ?>" title="Sr. No. / Order" style="width:72px;padding:0.5rem;">
      </div>
    </div>
    <input type="text" name="title" required value="<?= e($editingPage['title'] ?? '') ?>" placeholder="Page Title" style="width:100%;padding:0.5rem;margin-bottom:0.75rem;">
    <input type="text" name="subtitle" value="<?= e($editingPage['subtitle'] ?? '') ?>" placeholder="Subtitle / UGC Reference" style="width:100%;padding:0.5rem;margin-bottom:0.75rem;">
    <input type="text" name="meta_description" value="<?= e((string)($editingPage['meta_description'] ?? '')) ?>" placeholder="OpenGraph & SEO Meta Description (used when sharing on WhatsApp / LinkedIn / Google)" style="width:100%;padding:0.5rem;margin-bottom:0.75rem;">

    <label style="display:block;font-weight:600;margin-bottom:0.35rem;">Page Content (Visual Word-Style Editor &amp; Optional HTML Source Toggle):</label>
    <textarea class="rich-editor" data-csrf="<?= e(csrfToken()) ?>" data-upload-url="<?= e(baseUrl('admin/upload_handler.php')) ?>" name="content_html" rows="10"><?= htmlspecialchars($editingPage['content_html'] ?? '<h2>Disclosure Overview</h2><p>Enter institutional disclosure details...</p>', ENT_QUOTES, 'UTF-8') ?></textarea>

    <div class="grid-2" style="margin:0.75rem 0;">
      <label style="font-size:0.85rem;">Upload Attached PDF (Optional):
        <input type="file" name="pdf_file" accept="application/pdf" style="display:block;margin-top:4px;">
      </label>
      <label style="font-size:0.85rem;">Or Paste External / Google Drive PDF Link &amp; Label:
        <input type="text" name="attached_pdf_url" value="<?= e($editingPage['attached_pdf_url'] ?? '') ?>" placeholder="https://drive.google.com/... or uploads/document.pdf" style="width:100%;padding:0.4rem;margin-bottom:4px;">
        <input type="text" name="attached_pdf_label" value="<?= e($editingPage['attached_pdf_label'] ?? '') ?>" placeholder="Download Official PDF / Open Google Drive" style="width:100%;padding:0.4rem;">
      </label>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:1.25rem;margin:0.75rem 0;font-size:0.88rem;font-weight:600;">
      <label><input type="checkbox" name="is_published" <?= (!$editingPage || !empty($editingPage['is_published'])) ? 'checked' : '' ?>> Visible / Published on Website</label>
      <label><input type="checkbox" name="show_share_bar" <?= (!$editingPage || !isset($editingPage['show_share_bar']) || !empty($editingPage['show_share_bar'])) ? 'checked' : '' ?>> Enable Social Sharing Bar on this Micro-Page</label>
    </div>
    <button type="submit" class="btn-primary"><?= $editingPage ? 'Update Disclosure Page' : 'Save &amp; Publish Page' ?></button>
    <?php if ($editingPage): ?>
      <a href="manage_pages.php" class="btn-secondary" style="margin-left:0.5rem;">Cancel Edit</a>
    <?php endif; ?>
  </form>
  <?php else: ?>
    <div class="card" style="margin-bottom:1.5rem;color:var(--text-muted);font-size:0.9rem;">
      Select <strong>Edit</strong> on one of your assigned pages below to modify its content.
    </div>
  <?php endif; ?>

  <div class="card">
    <table class="data-table">
      <thead><tr><th>Order</th><th>Title</th><th>Category</th><th>Slug</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead>
      <tbody>
        <?php foreach ($pages as $pg): ?>
          <tr>
            <td style="white-space:nowrap;">
              <form method="post" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="move">
                <input type="hidden" name="page_id" value="<?= (int)$pg['id'] ?>">
                <button type="submit" name="dir" value="up" class="btn-secondary" style="padding:0.2rem 0.45rem;" title="Move Up">&uarr;</button>
                <button type="submit" name="dir" value="down" class="btn-secondary" style="padding:0.2rem 0.45rem;" title="Move Down">&darr;</button>
              </form>
              <span style="margin-left:4px;font-size:0.8rem;">#<?= (int)($pg['sort_order'] ?? 1) ?></span>
            </td>
            <td><?= e($pg['title']) ?></td>
            <td><?= e($pg['cat_name']) ?></td>
            <td><code><?= e($pg['slug']) ?></code></td>
            <td>
              <span class="badge <?= !empty($pg['is_published']) ? 'badge-ok' : 'badge-warn' ?>">
                <?= !empty($pg['is_published']) ? 'Visible' : 'Hidden' ?>
              </span>
            </td>
            <td><?= e($pg['updated_at']) ?></td>
            <td style="white-space:nowrap;">
              <a href="<?= e(baseUrl('page.php?slug=' . urlencode($pg['slug']))) ?>" target="_blank" class="btn-outline btn-sm" style="padding:0.35rem 0.55rem;font-size:0.78rem;">View</a>
              <a href="?edit=<?= (int)$pg['id'] ?>" class="btn-primary" style="padding:0.35rem 0.65rem;font-size:0.8rem;">Edit</a>
              <form method="post" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="toggle_publish">
                <input type="hidden" name="page_id" value="<?= (int)$pg['id'] ?>">
                <button type="submit" class="btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.8rem;"><?= !empty($pg['is_published']) ? 'Hide' : 'Show' ?></button>
              </form>
              <form method="post" style="display:inline;" onsubmit="return confirm('Delete this page?');">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="page_id" value="<?= (int)$pg['id'] ?>">
                <button type="submit" class="btn-secondary" style="padding:0.35rem 0.65rem;font-size:0.8rem;">Delete</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
