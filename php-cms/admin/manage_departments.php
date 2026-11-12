<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('departments');
$pdo = getDB();
$isFullDeptAdmin = in_array($user['role'], ['super_admin', 'content_editor'], true);
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'add_department' && $isFullDeptAdmin) {
        $heroUrl = 'assets/images/hero_robotics.jpg';
        if (!empty($_FILES['hero_image']['name'])) {
            $up = handleSecureUpload($_FILES['hero_image'], __DIR__ . '/../uploads');
            if ($up['ok']) $heroUrl = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '') {
            $slug = preg_replace('/[^a-z0-9-]/', '-', strtolower(trim($_POST['slug'])));
            $code = strtoupper(preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($_POST['code']))));
            $stmt = $pdo->prepare('INSERT INTO departments (slug, code, name, short_name, established_year, intake_capacity, nba_status, hod_name, overview, vision, mission, hero_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $slug,
                $code,
                trim($_POST['name']),
                trim($_POST['short_name'] ?: $code),
                (int)$_POST['established_year'],
                (int)$_POST['intake_capacity'],
                trim($_POST['nba_status'] ?: 'AICTE Approved'),
                trim($_POST['hod_name']),
                trim($_POST['overview']),
                trim($_POST['vision'] ?? ''),
                trim($_POST['mission'] ?? ''),
                $heroUrl,
            ]);
            $newId = (int)$pdo->lastInsertId();
            $pdo->prepare('INSERT INTO department_subpages (department_id, slug, title, content_html, sort_order, updated_at) VALUES (?, "about", "About Department", ?, 1, CURDATE())')
                ->execute([$newId, '<h2>' . e(trim($_POST['name'])) . '</h2><p>' . e(trim($_POST['overview'])) . '</p>']);
            logAudit($pdo, $user, 'CREATE_DEPARTMENT', 'Department', $_POST['name']);
            header('Location: manage_departments.php?dept_id=' . $newId . '&msg=created');
            exit;
        }
    } elseif ($action === 'delete_department' && $isFullDeptAdmin) {
        $delId = (int)$_POST['department_id'];
        $pdo->prepare('DELETE FROM departments WHERE id = ?')->execute([$delId]);
        logAudit($pdo, $user, 'DELETE_DEPARTMENT', 'Department', 'ID #' . $delId);
        header('Location: manage_departments.php?msg=deleted');
        exit;
    } else {
        $deptId = (int)$_POST['department_id'];
        requireRoleAccess('departments', $deptId);

        if ($action === 'update_department') {
            $heroUrl = trim($_POST['existing_hero_image'] ?? 'assets/images/hero_robotics.jpg');
            if (!empty($_FILES['hero_image']['name'])) {
                $up = handleSecureUpload($_FILES['hero_image'], __DIR__ . '/../uploads');
                if ($up['ok']) $heroUrl = $up['file_url'];
                else $err = $up['error'];
            }
            if ($err === '') {
                $stmt = $pdo->prepare('UPDATE departments SET name = ?, short_name = ?, established_year = ?, intake_capacity = ?, nba_status = ?, hod_name = ?, hod_message = ?, overview = ?, vision = ?, mission = ?, hero_image_url = ? WHERE id = ?');
                $stmt->execute([
                    trim($_POST['name']),
                    trim($_POST['short_name']),
                    (int)$_POST['established_year'],
                    (int)$_POST['intake_capacity'],
                    trim($_POST['nba_status']),
                    trim($_POST['hod_name']),
                    trim($_POST['hod_message'] ?? ''),
                    trim($_POST['overview']),
                    trim($_POST['vision'] ?? ''),
                    trim($_POST['mission'] ?? ''),
                    $heroUrl,
                    $deptId,
                ]);
                logAudit($pdo, $user, 'UPDATE_DEPARTMENT', 'Department', $_POST['name']);
                $msg = 'Department profile updated.';
            }
        } elseif ($action === 'save_subpage') {
            $slug = preg_replace('/[^a-z0-9-]/', '-', strtolower(trim($_POST['slug'])));
            if (!empty($_POST['subpage_id'])) {
                $stmt = $pdo->prepare('UPDATE department_subpages SET slug = ?, title = ?, content_html = ?, is_published = ?, updated_at = CURDATE() WHERE id = ? AND department_id = ?');
                $stmt->execute([$slug, trim($_POST['title']), $_POST['content_html'] ?? '<p></p>', isset($_POST['is_published']) ? 1 : 0, (int)$_POST['subpage_id'], $deptId]);
                logAudit($pdo, $user, 'UPDATE_DEPT_SUBPAGE', 'Department', $_POST['title']);
                $msg = 'Department micro-page updated.';
            } else {
                $stmt = $pdo->prepare('INSERT INTO department_subpages (department_id, slug, title, content_html, is_published, updated_at) VALUES (?, ?, ?, ?, ?, CURDATE())');
                $stmt->execute([$deptId, $slug, trim($_POST['title']), $_POST['content_html'] ?? '<p></p>', isset($_POST['is_published']) ? 1 : 0]);
                logAudit($pdo, $user, 'CREATE_DEPT_SUBPAGE', 'Department', $_POST['title']);
                $msg = 'Department micro-page created.';
            }
        } elseif ($action === 'delete_subpage') {
            $pdo->prepare('DELETE FROM department_subpages WHERE id = ? AND department_id = ?')->execute([(int)$_POST['subpage_id'], $deptId]);
            $msg = 'Micro-page deleted.';
        } elseif ($action === 'add_faculty') {
            $photoUrl = 'assets/images/principal.jpg';
            if (!empty($_FILES['photo']['name'])) {
                $up = handleSecureUpload($_FILES['photo'], __DIR__ . '/../uploads');
                if ($up['ok']) $photoUrl = $up['file_url'];
                else $err = $up['error'];
            }
            if ($err === '') {
                $stmt = $pdo->prepare('INSERT INTO faculty (department_id, name, designation, qualification, specialization, email, experience_years, photo_url, is_hod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([$deptId, trim($_POST['name']), trim($_POST['designation']), trim($_POST['qualification']), trim($_POST['specialization']), trim($_POST['email']), (int)($_POST['experience_years'] ?? 5), $photoUrl, isset($_POST['is_hod']) ? 1 : 0]);
                logAudit($pdo, $user, 'ADD_FACULTY', 'Faculty', $_POST['name']);
                $msg = 'Faculty member added.';
            }
        } elseif ($action === 'delete_faculty') {
            $pdo->prepare('DELETE FROM faculty WHERE id = ? AND department_id = ?')->execute([(int)$_POST['faculty_id'], $deptId]);
            $msg = 'Faculty member removed.';
        } elseif ($action === 'add_lab') {
            $pdo->prepare('INSERT INTO department_labs (department_id, name, area_sqft, equipment_summary, incharge) VALUES (?, ?, ?, ?, ?)')
                ->execute([$deptId, trim($_POST['name']), (int)$_POST['area_sqft'], trim($_POST['equipment_summary']), trim($_POST['incharge'])]);
            $msg = 'Laboratory added.';
        } elseif ($action === 'delete_lab') {
            $pdo->prepare('DELETE FROM department_labs WHERE id = ? AND department_id = ?')->execute([(int)$_POST['lab_id'], $deptId]);
            $msg = 'Laboratory removed.';
        }
    }
}

$deptList = $user['role'] === 'department_admin'
    ? (function () use ($pdo, $user) { $s = $pdo->prepare('SELECT * FROM departments WHERE id = ?'); $s->execute([(int)$user['assigned_department_id']]); return $s->fetchAll(); })()
    : $pdo->query('SELECT * FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();

$activeDeptId = (int)($_GET['dept_id'] ?? ($deptList[0]['id'] ?? 1));
requireRoleAccess('departments', $activeDeptId);
$activeDept = null;
foreach ($deptList as $d) { if ((int)$d['id'] === $activeDeptId) { $activeDept = $d; break; } }

$editSub = null;
if (!empty($_GET['edit_sub'])) {
    $st = $pdo->prepare('SELECT * FROM department_subpages WHERE id = ? AND department_id = ?');
    $st->execute([(int)$_GET['edit_sub'], $activeDeptId]);
    $editSub = $st->fetch() ?: null;
}

$subPages = $pdo->prepare('SELECT * FROM department_subpages WHERE department_id = ? ORDER BY sort_order ASC, id ASC');
$subPages->execute([$activeDeptId]);
$subs = $subPages->fetchAll();

$facStmt = $pdo->prepare('SELECT * FROM faculty WHERE department_id = ? ORDER BY sort_order ASC, id ASC');
$facStmt->execute([$activeDeptId]);
$facultyList = $facStmt->fetchAll();

$labStmt = $pdo->prepare('SELECT * FROM department_labs WHERE department_id = ? ORDER BY id ASC');
$labStmt->execute([$activeDeptId]);
$labs = $labStmt->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Manage Departments &amp; Microsites</title>
  <link rel="stylesheet" href="../assets/css/style.css">
  <script src="../assets/js/editor.js" defer></script>
</head>
<body class="container" style="padding:2rem 1rem;">
  <p><a href="dashboard.php">&larr; Dashboard</a></p>
  <h1>Departments &amp; Micro-Page Manager</h1>
  <?php if ($msg || !empty($_GET['msg'])): ?><p style="color:#15803d;font-weight:600;"><?= e($msg ?: 'Action completed.') ?></p><?php endif; ?>
  <?php if ($err): ?><p style="color:#b91c1c;font-weight:600;"><?= e($err) ?></p><?php endif; ?>

  <div style="margin-bottom:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
    <?php foreach ($deptList as $d): ?>
      <a href="?dept_id=<?= (int)$d['id'] ?>" class="btn-primary" style="<?= (int)$d['id'] === $activeDeptId ? '' : 'opacity:0.6;' ?>"><?= e($d['name']) ?> (<?= e($d['code']) ?>)</a>
    <?php endforeach; ?>
  </div>

  <?php if ($isFullDeptAdmin): ?>
    <details class="card" style="margin-bottom:1.5rem;">
      <summary style="cursor:pointer;font-weight:700;font-size:1.05rem;">+ Add Additional Academic Department</summary>
      <form method="post" enctype="multipart/form-data" style="margin-top:1rem;">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="add_department">
        <div class="grid-2" style="margin-bottom:0.5rem;">
          <input type="text" name="name" required placeholder="Department Name (e.g. AI & Data Science)" style="padding:0.5rem;">
          <input type="text" name="code" required placeholder="Code (e.g. AIDS)" style="padding:0.5rem;">
          <input type="text" name="slug" required placeholder="URL Slug (e.g. ai-data-science)" style="padding:0.5rem;">
          <input type="text" name="short_name" placeholder="Short Name" style="padding:0.5rem;">
          <input type="number" name="established_year" value="2026" placeholder="Established Year" style="padding:0.5rem;">
          <input type="number" name="intake_capacity" value="60" placeholder="Intake Capacity" style="padding:0.5rem;">
          <input type="text" name="hod_name" required placeholder="HoD Full Name" style="padding:0.5rem;">
          <input type="text" name="nba_status" value="AICTE Approved" placeholder="NBA / Accreditation Status" style="padding:0.5rem;">
        </div>
        <textarea name="overview" rows="2" required placeholder="Department overview..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"></textarea>
        <label style="display:block;margin-bottom:0.75rem;font-size:0.85rem;">Upload Department Hero Banner (JPG/PNG/WEBP):
          <input type="file" name="hero_image" accept="image/jpeg,image/png,image/webp">
        </label>
        <button type="submit" class="btn-primary">Create Department Microsite</button>
      </form>
    </details>
  <?php endif; ?>

  <?php if ($activeDept): ?>
    <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
      <h2 style="margin-top:0;">Department Profile &amp; Banner Image</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="update_department">
      <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
      <input type="hidden" name="existing_hero_image" value="<?= e($activeDept['hero_image_url']) ?>">
      <div class="grid-2" style="margin-bottom:0.5rem;">
        <input type="text" name="name" required value="<?= e($activeDept['name']) ?>" style="padding:0.5rem;">
        <input type="text" name="short_name" required value="<?= e($activeDept['short_name']) ?>" style="padding:0.5rem;">
        <input type="number" name="established_year" value="<?= (int)$activeDept['established_year'] ?>" style="padding:0.5rem;">
        <input type="number" name="intake_capacity" value="<?= (int)$activeDept['intake_capacity'] ?>" style="padding:0.5rem;">
        <input type="text" name="hod_name" value="<?= e($activeDept['hod_name']) ?>" style="padding:0.5rem;">
        <input type="text" name="nba_status" value="<?= e($activeDept['nba_status']) ?>" style="padding:0.5rem;">
      </div>
      <textarea name="overview" rows="2" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e($activeDept['overview']) ?></textarea>
      <textarea name="hod_message" rows="2" placeholder="HoD Message" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e($activeDept['hod_message'] ?? '') ?></textarea>
      <div class="grid-2" style="margin-bottom:0.5rem;">
        <textarea name="vision" rows="2" placeholder="Vision" style="padding:0.5rem;"><?= e($activeDept['vision'] ?? '') ?></textarea>
        <textarea name="mission" rows="2" placeholder="Mission" style="padding:0.5rem;"><?= e($activeDept['mission'] ?? '') ?></textarea>
      </div>
      <label style="display:block;margin-bottom:0.75rem;font-size:0.85rem;">Upload New Hero Banner Image (Current: <code><?= e($activeDept['hero_image_url']) ?></code>):
        <input type="file" name="hero_image" accept="image/jpeg,image/png,image/webp">
      </label>
      <button type="submit" class="btn-primary">Save Department Profile</button>
    </form>

    <div class="card" style="margin-bottom:1.5rem;">
      <h2 style="margin-top:0;"><?= $editSub ? 'Edit Micro-Page: ' . e($editSub['title']) : 'Add / Manage Department Micro-Pages' ?></h2>
      <form method="post" style="margin-bottom:1rem;">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_subpage">
        <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
        <?php if ($editSub): ?><input type="hidden" name="subpage_id" value="<?= (int)$editSub['id'] ?>"><?php endif; ?>
        <div class="grid-2" style="margin-bottom:0.5rem;">
          <input type="text" name="title" required value="<?= e($editSub['title'] ?? '') ?>" placeholder="Micro-Page Title" style="padding:0.5rem;">
          <input type="text" name="slug" required value="<?= e($editSub['slug'] ?? '') ?>" placeholder="url-slug" style="padding:0.5rem;">
        </div>
        <textarea class="rich-editor" data-csrf="<?= e(csrfToken()) ?>" name="content_html" rows="8"><?= htmlspecialchars($editSub['content_html'] ?? '<p>Department micro-page content...</p>', ENT_QUOTES, 'UTF-8') ?></textarea>
        <label style="display:block;margin:0.5rem 0;"><input type="checkbox" name="is_published" <?= (!$editSub || !empty($editSub['is_published'])) ? 'checked' : '' ?>> Published</label>
        <button type="submit" class="btn-primary"><?= $editSub ? 'Update Micro-Page' : 'Save Micro-Page' ?></button>
        <?php if ($editSub): ?><a href="?dept_id=<?= $activeDeptId ?>" class="btn-secondary">Cancel</a><?php endif; ?>
      </form>
      <table class="data-table">
        <thead><tr><th>Micro-Page Title</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <?php foreach ($subs as $s): ?>
            <tr>
              <td><?= e($s['title']) ?></td>
              <td><?= e($s['slug']) ?></td>
              <td><?= !empty($s['is_published']) ? 'Published' : 'Draft' ?></td>
              <td>
                <a href="?dept_id=<?= $activeDeptId ?>&edit_sub=<?= (int)$s['id'] ?>" class="btn-primary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Edit</a>
                <form method="post" style="display:inline;" onsubmit="return confirm('Delete micro-page?');">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="delete_subpage">
                  <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
                  <input type="hidden" name="subpage_id" value="<?= (int)$s['id'] ?>">
                  <button type="submit" class="btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Delete</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <div class="grid-2">
      <form method="post" enctype="multipart/form-data" class="card">
        <h2 style="margin-top:0;">Add Faculty Profile (With Photo Upload)</h2>
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="add_faculty">
        <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
        <input type="text" name="name" required placeholder="Faculty Full Name" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <input type="text" name="designation" required placeholder="Designation" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <input type="text" name="qualification" required placeholder="Qualification" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <input type="text" name="specialization" required placeholder="Specialization" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <input type="email" name="email" required placeholder="Email" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <input type="number" name="experience_years" value="10" placeholder="Years Experience" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <label style="display:block;font-size:0.85rem;margin-bottom:0.5rem;">Faculty Photo: <input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label>
        <label style="display:block;margin-bottom:0.5rem;"><input type="checkbox" name="is_hod"> Mark as HoD</label>
        <button type="submit" class="btn-primary">Add Faculty</button>
        <ul style="margin-top:1rem;">
          <?php foreach ($facultyList as $f): ?>
            <li style="margin-bottom:0.4rem;">
              <?= e($f['name']) ?> — <?= e($f['designation']) ?>
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_faculty"><input type="hidden" name="department_id" value="<?= $activeDeptId ?>"><input type="hidden" name="faculty_id" value="<?= (int)$f['id'] ?>"><button type="submit" class="btn-secondary" style="padding:2px 6px;font-size:0.75rem;">Remove</button></form>
            </li>
          <?php endforeach; ?>
        </ul>
      </form>

      <form method="post" class="card">
        <h2 style="margin-top:0;">Add Laboratory</h2>
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="add_lab">
        <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
        <input type="text" name="name" required placeholder="Laboratory Name" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <input type="number" name="area_sqft" required placeholder="Area (Sq.Ft.)" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <input type="text" name="incharge" required placeholder="Lab In-Charge" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
        <textarea name="equipment_summary" rows="3" required placeholder="Equipment & software details..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"></textarea>
        <button type="submit" class="btn-primary">Add Laboratory</button>
        <ul style="margin-top:1rem;">
          <?php foreach ($labs as $l): ?>
            <li style="margin-bottom:0.4rem;">
              <?= e($l['name']) ?> (<?= (int)$l['area_sqft'] ?> sq.ft.)
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_lab"><input type="hidden" name="department_id" value="<?= $activeDeptId ?>"><input type="hidden" name="lab_id" value="<?= (int)$l['id'] ?>"><button type="submit" class="btn-secondary" style="padding:2px 6px;font-size:0.75rem;">Remove</button></form>
            </li>
          <?php endforeach; ?>
        </ul>
      </form>
    </div>
  <?php endif; ?>
</body>
</html>
