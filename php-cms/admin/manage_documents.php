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
    $action = $_POST['action'] ?? '';
    if ($action === 'upload') {
        $sourceType = ($_POST['source_type'] ?? 'upload') === 'external' ? 'external' : 'upload';
        $title = trim($_POST['title'] ?? '');
        $category = trim($_POST['category'] ?? 'Circulars & Forms');
        $isQuick = isset($_POST['is_quick_link']) ? 1 : 0;

        if ($title === '') {
            $err = 'Document title is required.';
        } elseif ($sourceType === 'external') {
            $extUrl = trim($_POST['external_url'] ?? '');
            if (!validateExternalUrl($extUrl)) {
                $err = 'Please provide a valid external link starting with https:// or http:// (e.g. Google Drive share URL).';
            } else {
                $stmt = $pdo->prepare('INSERT INTO documents (title, category, source_type, file_url, file_name, file_size_bytes, mime_type, uploaded_at, uploaded_by, is_quick_link) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)');
                $stmt->execute([$title, $category, 'external', $extUrl, 'External Download Link', 0, 'text/html', $user['full_name'], $isQuick]);
                logAudit($pdo, $user, 'ADD_EXTERNAL_DOCUMENT', 'Document', $title);
                $msg = 'External download link published: ' . $extUrl;
            }
        } elseif (!empty($_FILES['doc_file']['name'])) {
            $res = handleSecureUpload($_FILES['doc_file'], __DIR__ . '/../uploads');
            if ($res['ok']) {
                $stmt = $pdo->prepare('INSERT INTO documents (title, category, source_type, file_url, file_name, file_size_bytes, mime_type, uploaded_at, uploaded_by, is_quick_link) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)');
                $stmt->execute([
                    $title,
                    $category,
                    'upload',
                    $res['file_url'],
                    $res['file_name'],
                    $res['size'],
                    $res['mime_type'],
                    $user['full_name'],
                    $isQuick,
                ]);
                logAudit($pdo, $user, 'UPLOAD_DOCUMENT', 'Document', $title);
                $msg = 'Document uploaded securely: ' . $res['file_url'];
            } else {
                $err = $res['error'];
            }
        } else {
            $err = 'Please select a file to upload or choose External Link mode.';
        }
    } elseif ($action === 'move' && !empty($_POST['doc_id'])) {
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'documents', (int)$_POST['doc_id'], $dir, null, null, 'uploaded_at DESC, id DESC')) {
            $msg = 'Document order updated.';
        }
    } elseif ($action === 'delete') {
        $pdo->prepare('DELETE FROM documents WHERE id = ?')->execute([(int)$_POST['doc_id']]);
        logAudit($pdo, $user, 'DELETE_DOCUMENT', 'Document', 'ID #' . (int)$_POST['doc_id']);
        $msg = 'Document removed.';
    }
}

$docs = $pdo->query('SELECT * FROM documents ORDER BY sort_order ASC, uploaded_at DESC, id DESC')->fetchAll();
$adminPageTitle = 'Media & Statutory Document Repository';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;">Publish Document (File Upload OR Google Drive / External Link)</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="upload">

    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Document Title
        <input type="text" name="title" required placeholder="e.g. FRA Fee Structure 2026-27" style="width:100%;padding:0.5rem;">
      </label>
      <label>Category
        <select name="category" style="width:100%;padding:0.5rem;">
          <option value="Fee Structure">Fee Structure</option>
          <option value="Academic Calendar">Academic Calendar</option>
          <option value="Syllabus">Syllabus</option>
          <option value="UGC & AICTE Approvals">UGC &amp; AICTE Approvals</option>
          <option value="NAAC / NBA / NIRF">NAAC / NBA / NIRF</option>
          <option value="Annual Reports & Audits">Annual Reports &amp; Audits</option>
          <option value="Circulars & Forms">Circulars &amp; Forms</option>
        </select>
      </label>
    </div>

    <div style="display:flex;gap:1.5rem;margin-bottom:0.75rem;font-size:0.9rem;font-weight:600;">
      <label><input type="radio" name="source_type" value="upload" checked onchange="toggleDocMode(this.value)"> Upload File (PDF / DOCX / XLSX / Image)</label>
      <label><input type="radio" name="source_type" value="external" onchange="toggleDocMode(this.value)"> External Download Link (Google Drive / Portal URL)</label>
    </div>

    <div id="doc-upload-box" style="margin-bottom:0.75rem;">
      <input id="doc-file-input" type="file" name="doc_file" required>
    </div>
    <div id="doc-external-box" style="display:none;margin-bottom:0.75rem;">
      <input id="doc-url-input" type="url" name="external_url" placeholder="https://drive.google.com/file/d/.../view" style="width:100%;padding:0.5rem;">
    </div>

    <label style="display:block;margin-bottom:0.75rem;"><input type="checkbox" name="is_quick_link" checked> Show in Homepage Downloads &amp; Quick Links Repository</label>
    <button type="submit" class="btn-primary">Publish to Repository</button>
  </form>

  <div class="card">
    <table class="data-table">
      <thead><tr><th>Order</th><th>Title</th><th>Category</th><th>Source / Size</th><th>URL</th><th>Action</th></tr></thead>
      <tbody>
        <?php foreach ($docs as $d): $isExt = (($d['source_type'] ?? '') === 'external') || isExternalHttpUrl($d['file_url']); ?>
          <tr>
            <td style="white-space:nowrap;">
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move"><input type="hidden" name="doc_id" value="<?= (int)$d['id'] ?>"><button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;">&uarr;</button><button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;">&darr;</button></form>
              <span style="margin-left:4px;font-size:0.8rem;">#<?= (int)($d['sort_order'] ?? 1) ?></span>
            </td>
            <td><strong><?= e($d['title']) ?></strong></td>
            <td><?= e($d['category']) ?></td>
            <td><?= $isExt ? 'External URL' : e(formatBytes((int)$d['file_size_bytes'])) ?></td>
            <td style="max-width:260px;overflow-wrap:anywhere;"><code><?= e($d['file_url']) ?></code></td>
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
<script>
function toggleDocMode(mode) {
  var upBox = document.getElementById('doc-upload-box');
  var exBox = document.getElementById('doc-external-box');
  var fileIn = document.getElementById('doc-file-input');
  var urlIn = document.getElementById('doc-url-input');
  if (mode === 'external') {
    upBox.style.display = 'none';
    exBox.style.display = 'block';
    fileIn.required = false;
    urlIn.required = true;
  } else {
    upBox.style.display = 'block';
    exBox.style.display = 'none';
    fileIn.required = true;
    urlIn.required = false;
  }
}
</script>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
