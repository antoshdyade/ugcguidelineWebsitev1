<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('departments');
$pdo = getDB();

$depts = $user['role'] === 'department_admin'
    ? $pdo->prepare('SELECT * FROM departments WHERE id = ?')
    : $pdo->query('SELECT * FROM departments ORDER BY sort_order ASC');

if ($user['role'] === 'department_admin') {
    $depts->execute([(int)$user['assigned_department_id']]);
    $deptList = $depts->fetchAll();
} else {
    $deptList = $depts->fetchAll();
}

$activeDeptId = (int)($_GET['dept_id'] ?? ($deptList[0]['id'] ?? 1));
requireRoleAccess('departments', $activeDeptId);

$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $deptId = (int)$_POST['department_id'];
    requireRoleAccess('departments', $deptId);

    if (($_POST['action'] ?? '') === 'add_subpage') {
        $stmt = $pdo->prepare('INSERT INTO department_subpages (department_id, slug, title, content_html, updated_at) VALUES (?, ?, ?, ?, CURDATE())');
        $stmt->execute([
            $deptId,
            preg_replace('/[^a-z0-9-]/', '-', strtolower(trim($_POST['slug']))),
            trim($_POST['title']),
            $_POST['content_html'] ?? '<p></p>',
        ]);
        logAudit($pdo, $user, 'CREATE_DEPT_SUBPAGE', 'Department', $_POST['title']);
        $msg = 'Department sub-page added.';
    } elseif (($_POST['action'] ?? '') === 'add_faculty') {
        $stmt = $pdo->prepare('INSERT INTO faculty (department_id, name, designation, qualification, specialization, email) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$deptId, trim($_POST['name']), trim($_POST['designation']), trim($_POST['qualification']), trim($_POST['specialization']), trim($_POST['email'])]);
        logAudit($pdo, $user, 'ADD_FACULTY', 'Faculty', $_POST['name']);
        $msg = 'Faculty member added.';
    }
}

$subPages = $pdo->prepare('SELECT * FROM department_subpages WHERE department_id = ? ORDER BY sort_order ASC');
$subPages->execute([$activeDeptId]);
$subs = $subPages->fetchAll();

$facStmt = $pdo->prepare('SELECT * FROM faculty WHERE department_id = ? ORDER BY sort_order ASC');
$facStmt->execute([$activeDeptId]);
$facultyList = $facStmt->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manage Department Microsite</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body class="container" style="padding:2rem 1rem;">
  <p><a href="dashboard.php">&larr; Dashboard</a></p>
  <h1>Department Microsite Manager</h1>
  <?php if ($msg): ?><p style="color:#15803d;font-weight:600;"><?= e($msg) ?></p><?php endif; ?>

  <div style="margin-bottom:1rem;">
    <?php foreach ($deptList as $d): ?>
      <a href="?dept_id=<?= (int)$d['id'] ?>" class="btn-primary" style="<?= (int)$d['id'] === $activeDeptId ? '' : 'opacity:0.65;' ?>"><?= e($d['name']) ?></a>
    <?php endforeach; ?>
  </div>

  <div class="grid-2">
    <form method="post" class="card">
      <h2 style="margin-top:0;">Add Department Sub-Page</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="add_subpage">
      <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
      <input type="text" name="title" required placeholder="Sub-page Title" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="slug" required placeholder="slug" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <textarea name="content_html" rows="4" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><p>Department content...</p></textarea>
      <button type="submit" class="btn-primary">Add Sub-Page</button>
      <ul><?php foreach ($subs as $s): ?><li><?= e($s['title']) ?> (<?= e($s['slug']) ?>)</li><?php endforeach; ?></ul>
    </form>

    <form method="post" class="card">
      <h2 style="margin-top:0;">Add Faculty Profile</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="add_faculty">
      <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
      <input type="text" name="name" required placeholder="Faculty Full Name" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="designation" required placeholder="Designation" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="qualification" required placeholder="Qualification" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="text" name="specialization" required placeholder="Specialization" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <input type="email" name="email" required placeholder="Email" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
      <button type="submit" class="btn-primary">Add Faculty</button>
      <ul><?php foreach ($facultyList as $f): ?><li><?= e($f['name']) ?> — <?= e($f['designation']) ?></li><?php endforeach; ?></ul>
    </form>
  </div>
</body>
</html>
