<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('documents');
$pdo = getDB();
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    if (($_POST['action'] ?? '') === 'upload' && !empty($_FILES['doc_file'])) {
        $res = handleSecureUpload($_FILES['doc_file'], __DIR__ . '/../uploads');
        if ($res['ok']) {
            $stmt = $pdo->prepare('INSERT INTO documents (title, category, file_url, file_name, file_size_bytes, mime_type, uploaded_at, uploaded_by, is_quick_link) VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)');
            $stmt->execute([
                trim($_POST['title']),
                trim($_POST['category']),
                $res['file_url'],
                $res['file_name'],
                $res['size'],
                $res['mime_type'],
                $user['full_name'],
                isset($_POST['is_quick_link']) ? 1 : 0,
            ]);
            logAudit($pdo, $user, 'UPLOAD_DOCUMENT', 'Document', $_POST['title']);
            $msg = 'Document uploaded securely: ' . $res['file_url'];
        } else {
            $err = $res['error'];
        }
    } elseif (($_POST['action'] ?? '') === 'delete') {
        $pdo->prepare('DELETE FROM documents WHERE id = ?')->execute([(int)$_POST['doc_id']]);
        logAudit($pdo, $user, 'DELETE_DOCUMENT', 'Document', 'ID #' . (int)$_POST['doc_id']);
        $msg = 'Document removed.';
    }
}

$docs = $pdo->query('SELECT * FROM documents ORDER BY uploaded_at DESC')->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manage Documents &amp; Media</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="container" style="padding:2rem 1rem;">
  <p><a href="dashboard.php">&larr; Dashboard</a></p>
  <h1>Media &amp; Statutory Document Manager</h1>
  <?php if ($msg): ?><p style="color:#15803d;font-weight:600;"><?= e($msg) ?></p><?php endif; ?>
  <?php if ($err): ?><p style="color:#dc2626;font-weight:600;"><?= e($err) ?></p><?php endif; ?>

  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="upload">
    <input type="text" name="title" required placeholder="Document Title" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
    <select name="category" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <option value="Fee Structure">Fee Structure</option>
      <option value="Academic Calendar">Academic Calendar</option>
      <option value="Syllabus">Syllabus</option>
      <option value="UGC & AICTE Approvals">UGC &amp; AICTE Approvals</option>
      <option value="NAAC / NBA / NIRF">NAAC / NBA / NIRF</option>
      <option value="Annual Reports & Audits">Annual Reports &amp; Audits</option>
      <option value="Circulars & Forms">Circulars &amp; Forms</option>
    </select>
    <input type="file" name="doc_file" required style="margin-bottom:0.5rem;">
    <label style="display:block;margin-bottom:0.75rem;"><input type="checkbox" name="is_quick_link" checked> Show in Quick Links Repository</label>
    <button type="submit" class="btn-primary">Upload Securely</button>
  </form>

  <div class="card">
    <table class="data-table">
      <thead><tr><th>Title</th><th>Category</th><th>Size</th><th>Link</th><th>Action</th></tr></thead>
      <tbody>
        <?php foreach ($docs as $d): ?>
          <tr>
            <td><?= e($d['title']) ?></td>
            <td><?= e($d['category']) ?></td>
            <td><?= e(formatBytes((int)$d['file_size_bytes'])) ?></td>
            <td><code><?= e($d['file_url']) ?></code></td>
            <td>
              <form method="post" style="display:inline;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="delete">
                <input type="hidden" name="doc_id" value="<?= (int)$d['id'] ?>">
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
