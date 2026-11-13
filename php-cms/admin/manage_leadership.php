<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('leadership');
$pdo = getDB();
$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    if ($action === 'add' || $action === 'update') {
        $photoUrl = trim($_POST['existing_photo'] ?? 'assets/images/principal.jpg');
        if (!empty($_FILES['photo']['name'])) {
            $up = handleSecureUpload($_FILES['photo'], __DIR__ . '/../uploads');
            if ($up['ok']) $photoUrl = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '') {
            if ($action === 'update' && !empty($_POST['id'])) {
                $pdo->prepare('UPDATE leadership_profiles SET role_title = ?, name = ?, qualification = ?, email = ?, phone = ?, photo_url = ?, bio = ?, committee_group = ? WHERE id = ?')
                    ->execute([trim($_POST['role_title']), trim($_POST['name']), trim($_POST['qualification']), trim($_POST['email']), trim($_POST['phone']), $photoUrl, trim($_POST['bio']), $_POST['committee_group'] ?? 'statutory', (int)$_POST['id']]);
                $msg = 'Leadership profile updated.';
            } else {
                $pdo->prepare('INSERT INTO leadership_profiles (role_title, name, qualification, email, phone, photo_url, bio, committee_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                    ->execute([trim($_POST['role_title']), trim($_POST['name']), trim($_POST['qualification']), trim($_POST['email']), trim($_POST['phone']), $photoUrl, trim($_POST['bio']), $_POST['committee_group'] ?? 'statutory']);
                logAudit($pdo, $user, 'ADD_LEADERSHIP', 'Leadership', $_POST['name']);
                $msg = 'Leadership profile added.';
            }
        }
    } elseif ($action === 'delete') {
        $pdo->prepare('DELETE FROM leadership_profiles WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Profile removed.';
    }
}

$editing = null;
if (!empty($_GET['edit'])) {
    $s = $pdo->prepare('SELECT * FROM leadership_profiles WHERE id = ?');
    $s->execute([(int)$_GET['edit']]);
    $editing = $s->fetch() ?: null;
}
$adminPageTitle = 'Leadership & Governance Desk (Our Desk)';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;"><?= $editing ? 'Edit Officer: ' . e($editing['name']) : 'Add Statutory Officer / Desk Profile' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="<?= $editing ? 'update' : 'add' ?>">
    <?php if ($editing): ?><input type="hidden" name="id" value="<?= (int)$editing['id'] ?>"><?php endif; ?>
    <input type="hidden" name="existing_photo" value="<?= e($editing['photo_url'] ?? 'assets/images/principal.jpg') ?>">
    <div class="grid-2" style="margin-bottom:0.5rem;">
      <input type="text" name="role_title" required value="<?= e($editing['role_title'] ?? '') ?>" placeholder="Role Title (e.g. Principal / Chairman)" style="padding:0.5rem;">
      <input type="text" name="name" required value="<?= e($editing['name'] ?? '') ?>" placeholder="Officer Full Name" style="padding:0.5rem;">
      <input type="text" name="qualification" required value="<?= e($editing['qualification'] ?? '') ?>" placeholder="Qualifications" style="padding:0.5rem;">
      <input type="email" name="email" required value="<?= e($editing['email'] ?? '') ?>" placeholder="Email" style="padding:0.5rem;">
      <input type="text" name="phone" required value="<?= e($editing['phone'] ?? '') ?>" placeholder="Phone" style="padding:0.5rem;">
      <select name="committee_group" style="padding:0.5rem;">
        <?php foreach (['statutory','governance','icc','academic_leadership'] as $g): ?>
          <option value="<?= $g ?>" <?= (($editing['committee_group'] ?? 'statutory') === $g) ? 'selected' : '' ?>><?= ucfirst(str_replace('_', ' ', $g)) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <textarea name="bio" rows="2" placeholder="Profile bio / message..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e($editing['bio'] ?? '') ?></textarea>
    <label style="display:block;font-size:0.85rem;margin-bottom:0.75rem;">Upload Officer Photo (JPG/PNG/WEBP): <input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label>
    <button type="submit" class="btn-primary"><?= $editing ? 'Update Officer' : 'Add Officer' ?></button>
    <?php if ($editing): ?><a href="manage_leadership.php" class="btn-secondary">Cancel</a><?php endif; ?>
  </form>

  <div class="grid-3">
    <?php foreach ($profiles as $p): ?>
      <div class="card">
        <img src="../<?= e($p['photo_url']) ?>" alt="<?= e($p['name']) ?>" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">
        <h3 style="margin:0.5rem 0 0.2rem;"><?= e($p['name']) ?></h3>
        <small style="color:var(--secondary-color);font-weight:700;"><?= e($p['role_title']) ?></small>
        <p style="font-size:0.85rem;color:var(--text-muted);"><?= e($p['bio']) ?></p>
        <div style="display:flex;gap:0.4rem;">
          <a href="?edit=<?= (int)$p['id'] ?>" class="btn-primary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Edit</a>
          <form method="post"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button class="btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Remove</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
