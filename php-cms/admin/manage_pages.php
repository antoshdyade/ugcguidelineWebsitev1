<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('pages');
$pdo = getDB();
$msg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'create') {
        $stmt = $pdo->prepare('INSERT INTO pages (category_id, slug, title, subtitle, content_html, is_published, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())');
        $stmt->execute([
            (int)$_POST['category_id'],
            preg_replace('/[^a-z0-9-]/', '-', strtolower(trim($_POST['slug']))),
            trim($_POST['title']),
            trim($_POST['subtitle'] ?? ''),
            $_POST['content_html'] ?? '<p></p>',
            isset($_POST['is_published']) ? 1 : 0,
            $user['full_name'],
        ]);
        logAudit($pdo, $user, 'CREATE_PAGE', 'Page', $_POST['title']);
        $msg = 'Disclosure page created successfully.';
    } elseif ($action === 'delete') {
        $stmt = $pdo->prepare('DELETE FROM pages WHERE id = ?');
        $stmt->execute([(int)$_POST['page_id']]);
        logAudit($pdo, $user, 'DELETE_PAGE', 'Page', 'ID #' . (int)$_POST['page_id']);
        $msg = 'Page deleted.';
    }
}

$cats  = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC')->fetchAll();
$pages = $pdo->query('SELECT p.*, c.name AS cat_name FROM pages p JOIN categories c ON p.category_id = c.id ORDER BY p.id DESC')->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manage UGC Pages</title>
  <link rel="stylesheet" href="../assets/css/style.css">
  <script src="https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js" referrerpolicy="origin"></script>
  <script>tinymce.init({ selector: '#page-editor', plugins: 'table lists link image code', toolbar: 'undo redo | styles | bold italic | alignleft aligncenter | bullist numlist | table link | code' });</script>
</head>
<body class="container" style="padding:2rem 1rem;">
  <p><a href="dashboard.php">&larr; Dashboard</a></p>
  <h1>Manage Dynamic UGC Disclosure Pages</h1>
  <?php if ($msg): ?><p style="color:#15803d;font-weight:600;"><?= e($msg) ?></p><?php endif; ?>

  <form method="post" class="card" style="margin-bottom:1.5rem;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="create">
    <div class="grid-2" style="margin-bottom:0.75rem;">
      <select name="category_id" required style="padding:0.5rem;">
        <?php foreach ($cats as $c): ?>
          <option value="<?= (int)$c['id'] ?>"><?= e($c['ugc_code']) ?> · <?= e($c['name']) ?></option>
        <?php endforeach; ?>
      </select>
      <input type="text" name="slug" required placeholder="url-slug" style="padding:0.5rem;">
    </div>
    <input type="text" name="title" required placeholder="Page Title" style="width:100%;padding:0.5rem;margin-bottom:0.75rem;">
    <input type="text" name="subtitle" placeholder="Subtitle / UGC Reference" style="width:100%;padding:0.5rem;margin-bottom:0.75rem;">
    <textarea id="page-editor" name="content_html" rows="8"><p>Enter disclosure details...</p></textarea>
    <label style="display:block;margin:0.75rem 0;"><input type="checkbox" name="is_published" checked> Publish Immediately</label>
    <button type="submit" class="btn-primary">Save &amp; Publish Page</button>
  </form>

  <div class="card">
    <table class="data-table">
      <thead><tr><th>Title</th><th>Category</th><th>Slug</th><th>Updated</th><th>Action</th></tr></thead>
      <tbody>
        <?php foreach ($pages as $pg): ?>
          <tr>
            <td><?= e($pg['title']) ?></td>
            <td><?= e($pg['cat_name']) ?></td>
            <td><?= e($pg['slug']) ?></td>
            <td><?= e($pg['updated_at']) ?></td>
            <td>
              <form method="post" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="page_id" value="<?= (int)$pg['id'] ?>">
                <button type="submit" class="btn-secondary">Delete</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</body>
</html>
