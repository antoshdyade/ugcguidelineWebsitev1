<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('pages');
$pdo = getDB();
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'create' || $action === 'update') {
        $pdfUrl = trim($_POST['attached_pdf_url'] ?? '');
        $pdfLabel = trim($_POST['attached_pdf_label'] ?? '');
        if (!empty($_FILES['pdf_file']['name'])) {
            $up = handleSecureUpload($_FILES['pdf_file'], __DIR__ . '/../uploads');
            if ($up['ok']) {
                $pdfUrl = $up['file_url'];
                if ($pdfLabel === '') {
                    $pdfLabel = 'Download Attachment (' . $_FILES['pdf_file']['name'] . ')';
                }
            } else {
                $err = $up['error'];
            }
        }
        if ($err === '') {
            $slug = preg_replace('/[^a-z0-9-]/', '-', strtolower(trim($_POST['slug'])));
            $sortOrder = max(1, (int)($_POST['sort_order'] ?? 1));
            if ($action === 'update' && !empty($_POST['page_id'])) {
                $stmt = $pdo->prepare(
                    'UPDATE pages SET category_id = ?, slug = ?, title = ?, subtitle = ?, content_html = ?, attached_pdf_url = ?, attached_pdf_label = ?, is_published = ?, sort_order = ?, updated_by = ?, updated_at = CURDATE() WHERE id = ?'
                );
                $stmt->execute([
                    (int)$_POST['category_id'],
                    $slug,
                    trim($_POST['title']),
                    trim($_POST['subtitle'] ?? ''),
                    $_POST['content_html'] ?? '<p></p>',
                    $pdfUrl !== '' ? $pdfUrl : null,
                    $pdfLabel !== '' ? $pdfLabel : null,
                    isset($_POST['is_published']) ? 1 : 0,
                    $sortOrder,
                    $user['full_name'],
                    (int)$_POST['page_id'],
                ]);
                logAudit($pdo, $user, 'UPDATE_PAGE', 'Page', $_POST['title']);
                $msg = 'Disclosure page updated successfully.';
            } else {
                $stmt = $pdo->prepare(
                    'INSERT INTO pages (category_id, slug, title, subtitle, content_html, attached_pdf_url, attached_pdf_label, is_published, sort_order, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())'
                );
                $stmt->execute([
                    (int)$_POST['category_id'],
                    $slug,
                    trim($_POST['title']),
                    trim($_POST['subtitle'] ?? ''),
                    $_POST['content_html'] ?? '<p></p>',
                    $pdfUrl !== '' ? $pdfUrl : null,
                    $pdfLabel !== '' ? $pdfLabel : null,
                    isset($_POST['is_published']) ? 1 : 0,
                    $sortOrder,
                    $user['full_name'],
                ]);
                logAudit($pdo, $user, 'CREATE_PAGE', 'Page', $_POST['title']);
                $msg = 'Disclosure page created successfully.';
            }
        }
    } elseif ($action === 'delete') {
        $stmt = $pdo->prepare('DELETE FROM pages WHERE id = ?');
        $stmt->execute([(int)$_POST['page_id']]);
        logAudit($pdo, $user, 'DELETE_PAGE', 'Page', 'ID #' . (int)$_POST['page_id']);
        $msg = 'Page deleted.';
    }
}

$editingPage = null;
if (!empty($_GET['edit'])) {
    $st = $pdo->prepare('SELECT * FROM pages WHERE id = ? LIMIT 1');
    $st->execute([(int)$_GET['edit']]);
    $editingPage = $st->fetch() ?: null;
}

$filterCatId = !empty($_GET['cat']) ? (int)$_GET['cat'] : 0;
$cats = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')->fetchAll();
if ($filterCatId > 0) {
    $stPg = $pdo->prepare('SELECT p.*, c.name AS cat_name FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? ORDER BY p.sort_order ASC, p.id DESC');
    $stPg->execute([$filterCatId]);
    $pages = $stPg->fetchAll();
} else {
    $pages = $pdo->query('SELECT p.*, c.name AS cat_name FROM pages p JOIN categories c ON p.category_id = c.id ORDER BY c.sort_order ASC, p.sort_order ASC, p.id DESC')->fetchAll();
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manage UGC Pages</title>
  <link rel="stylesheet" href="../assets/css/style.css">
  <script src="../assets/js/editor.js" defer></script>
</head>
<body class="container" style="padding:2rem 1rem;">
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
    <p><a href="dashboard.php">&larr; Dashboard</a></p>
    <a href="manage_categories.php" class="btn-secondary">Manage Categories &amp; Nav &rarr;</a>
  </div>
  <h1><?= $editingPage ? 'Edit Page: ' . e($editingPage['title']) : 'Manage Dynamic UGC &amp; Autonomous Micro-Pages' ?></h1>
  <?php if ($msg): ?><p style="color:#15803d;font-weight:600;"><?= e($msg) ?></p><?php endif; ?>
  <?php if ($err): ?><p style="color:#b91c1c;font-weight:600;"><?= e($err) ?></p><?php endif; ?>

  <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:1rem;">
    <a href="manage_pages.php" class="<?= $filterCatId === 0 ? 'btn-primary' : 'btn-secondary' ?>" style="font-size:0.8rem;padding:0.35rem 0.7rem;">All Categories</a>
    <?php foreach ($cats as $c): ?>
      <a href="?cat=<?= (int)$c['id'] ?>" class="<?= $filterCatId === (int)$c['id'] ? 'btn-primary' : 'btn-secondary' ?>" style="font-size:0.8rem;padding:0.35rem 0.7rem;">
        <?= e($c['name']) ?>
      </a>
    <?php endforeach; ?>
  </div>

  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="<?= $editingPage ? 'update' : 'create' ?>">
    <?php if ($editingPage): ?>
      <input type="hidden" name="page_id" value="<?= (int)$editingPage['id'] ?>">
    <?php endif; ?>
    <div class="grid-2" style="margin-bottom:0.75rem;">
      <select name="category_id" required style="padding:0.5rem;">
        <?php foreach ($cats as $c): ?>
          <?php $selectedCat = $editingPage ? (int)$editingPage['category_id'] : $filterCatId; ?>
          <option value="<?= (int)$c['id'] ?>" <?= $selectedCat === (int)$c['id'] ? 'selected' : '' ?>>
            <?= e($c['ugc_code']) ?> · <?= e($c['name']) ?>
          </option>
        <?php endforeach; ?>
      </select>
      <div style="display:flex;gap:0.5rem;">
        <input type="text" name="slug" required value="<?= e($editingPage['slug'] ?? '') ?>" placeholder="url-slug" style="flex:1;padding:0.5rem;">
        <input type="number" name="sort_order" min="1" value="<?= (int)($editingPage['sort_order'] ?? 1) ?>" title="Order" style="width:72px;padding:0.5rem;">
      </div>
    </div>
    <input type="text" name="title" required value="<?= e($editingPage['title'] ?? '') ?>" placeholder="Page Title" style="width:100%;padding:0.5rem;margin-bottom:0.75rem;">
    <input type="text" name="subtitle" value="<?= e($editingPage['subtitle'] ?? '') ?>" placeholder="Subtitle / UGC Reference" style="width:100%;padding:0.5rem;margin-bottom:0.75rem;">

    <label style="display:block;font-weight:600;margin-bottom:0.35rem;">Page Content (Visual Word-Style Editor &amp; Optional HTML Source Toggle):</label>
    <textarea class="rich-editor" data-csrf="<?= e(csrfToken()) ?>" name="content_html" rows="10"><?= htmlspecialchars($editingPage['content_html'] ?? '<h2>Disclosure Overview</h2><p>Enter institutional disclosure details...</p>', ENT_QUOTES, 'UTF-8') ?></textarea>

    <div class="grid-2" style="margin:0.75rem 0;">
      <label style="font-size:0.85rem;">Upload Attached PDF (Optional):
        <input type="file" name="pdf_file" accept="application/pdf" style="display:block;margin-top:4px;">
      </label>
      <label style="font-size:0.85rem;">Or PDF URL / Label:
        <input type="text" name="attached_pdf_url" value="<?= e($editingPage['attached_pdf_url'] ?? '') ?>" placeholder="uploads/document.pdf" style="width:100%;padding:0.4rem;margin-bottom:4px;">
        <input type="text" name="attached_pdf_label" value="<?= e($editingPage['attached_pdf_label'] ?? '') ?>" placeholder="Download Official PDF" style="width:100%;padding:0.4rem;">
      </label>
    </div>

    <label style="display:block;margin:0.75rem 0;">
      <input type="checkbox" name="is_published" <?= (!$editingPage || !empty($editingPage['is_published'])) ? 'checked' : '' ?>> Publish Immediately
    </label>
    <button type="submit" class="btn-primary"><?= $editingPage ? 'Update Disclosure Page' : 'Save &amp; Publish Page' ?></button>
    <?php if ($editingPage): ?>
      <a href="manage_pages.php" class="btn-secondary" style="margin-left:0.5rem;">Cancel Edit</a>
    <?php endif; ?>
  </form>

  <div class="card">
    <table class="data-table">
      <thead><tr><th>Title</th><th>Category</th><th>Slug</th><th>Updated</th><th>Actions</th></tr></thead>
      <tbody>
        <?php foreach ($pages as $pg): ?>
          <tr>
            <td><?= e($pg['title']) ?></td>
            <td><?= e($pg['cat_name']) ?></td>
            <td><?= e($pg['slug']) ?></td>
            <td><?= e($pg['updated_at']) ?></td>
            <td style="white-space:nowrap;">
              <a href="?edit=<?= (int)$pg['id'] ?>" class="btn-primary" style="padding:0.35rem 0.65rem;font-size:0.8rem;">Edit</a>
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
</body>
</html>
