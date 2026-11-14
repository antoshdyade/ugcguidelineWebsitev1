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
            $up = handleCmsUpload($pdo, $_FILES['photo'], __DIR__ . '/../uploads', 'photo');
            if ($up['ok']) $photoUrl = $up['file_url'];
            else $err = $up['error'];
        }
        $groupName = trim($_POST['committee_group'] ?? '') ?: 'Statutory Officer';
        $sortOrder = max(1, (int)($_POST['sort_order'] ?? 1));
        if ($err === '') {
            if ($action === 'update' && !empty($_POST['id'])) {
                $pdo->prepare('UPDATE leadership_profiles SET role_title = ?, name = ?, qualification = ?, email = ?, phone = ?, photo_url = ?, bio = ?, committee_group = ?, sort_order = ? WHERE id = ?')
                    ->execute([trim($_POST['role_title']), trim($_POST['name']), trim($_POST['qualification']), trim($_POST['email']), trim($_POST['phone']), $photoUrl, trim($_POST['bio']), $groupName, $sortOrder, (int)$_POST['id']]);
                logAudit($pdo, $user, 'UPDATE_LEADERSHIP', 'Leadership', $_POST['name']);
                $msg = 'Leadership profile updated.';
            } else {
                $pdo->prepare('INSERT INTO leadership_profiles (role_title, name, qualification, email, phone, photo_url, bio, committee_group, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                    ->execute([trim($_POST['role_title']), trim($_POST['name']), trim($_POST['qualification']), trim($_POST['email']), trim($_POST['phone']), $photoUrl, trim($_POST['bio']), $groupName, $sortOrder]);
                logAudit($pdo, $user, 'ADD_LEADERSHIP', 'Leadership', $_POST['name']);
                $msg = 'Leadership profile added.';
            }
        }
    } elseif ($action === 'move' && !empty($_POST['id'])) {
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'leadership_profiles', (int)$_POST['id'], $dir, null, null, 'id ASC')) {
            logAudit($pdo, $user, 'REORDER_LEADERSHIP', 'Leadership', 'Profile #' . (int)$_POST['id']);
            $msg = 'Leadership display order updated.';
        }
    } elseif ($action === 'delete') {
        $pdo->prepare('DELETE FROM leadership_profiles WHERE id = ?')->execute([(int)$_POST['id']]);
        logAudit($pdo, $user, 'DELETE_LEADERSHIP', 'Leadership', 'Profile #' . (int)$_POST['id']);
        $msg = 'Profile removed.';
    }
}

$editing = null;
if (!empty($_GET['edit'])) {
    $s = $pdo->prepare('SELECT * FROM leadership_profiles WHERE id = ?');
    $s->execute([(int)$_GET['edit']]);
    $editing = $s->fetch() ?: null;
}
$profiles = $pdo->query('SELECT * FROM leadership_profiles ORDER BY sort_order ASC, id ASC')->fetchAll();
$groupPresets = leadershipGroupPresets();

$adminPageTitle = 'Leadership & Governance Desk (Our Desk)';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;"><?= $editing ? 'Edit Officer: ' . e($editing['name']) : 'Add Officer / Custom Committee Member' ?></h2>
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
      <div style="display:flex;gap:0.4rem;">
        <input type="text" id="lead-group-input" name="committee_group" list="leadership-group-presets" required value="<?= e($editing ? formatCommitteeGroupLabel($editing['committee_group'] ?? '') : 'Statutory Officer') ?>" placeholder="Custom Committee / Group Name" style="flex:1;padding:0.5rem;">
        <input type="number" min="1" name="sort_order" value="<?= (int)($editing['sort_order'] ?? (count($profiles) + 1)) ?>" title="Manual Sr. No." placeholder="Sr. No." style="width:76px;padding:0.5rem;">
      </div>
      <datalist id="leadership-group-presets">
        <?php foreach ($groupPresets as $gp): ?>
          <option value="<?= e($gp) ?>">
        <?php endforeach; ?>
      </datalist>
    </div>
    <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.55rem;">
      <small style="color:var(--text-muted);align-self:center;">Quick Presets:</small>
      <?php foreach ($groupPresets as $gp): ?>
        <button type="button" class="btn-secondary" style="padding:2px 8px;font-size:0.74rem;" onclick="document.getElementById('lead-group-input').value=this.textContent"><?= e($gp) ?></button>
      <?php endforeach; ?>
    </div>
    <textarea name="bio" rows="2" placeholder="Profile bio / message..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e($editing['bio'] ?? '') ?></textarea>
    <label style="display:block;font-size:0.85rem;margin-bottom:0.75rem;">Upload Officer Photo (JPG/PNG/WEBP): <input type="file" name="photo" accept="image/jpeg,image/png,image/webp"></label>
    <button type="submit" class="btn-primary"><?= $editing ? 'Update Officer' : 'Add Officer' ?></button>
    <?php if ($editing): ?><a href="manage_leadership.php" class="btn-secondary">Cancel</a><?php endif; ?>
  </form>

  <div class="grid-3">
    <?php foreach ($profiles as $idx => $p): ?>
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
          <img src="<?= e(mediaUrl($p['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="<?= e($p['name']) ?>" style="width:64px;height:64px;border-radius:50%;object-fit:cover;">
          <div style="display:flex;align-items:center;gap:4px;">
            <span style="font-size:0.72rem;font-weight:700;padding:2px 6px;border-radius:4px;background:var(--surface-bg);border:1px solid var(--border-color);">#<?= (int)($p['sort_order'] ?? ($idx + 1)) ?></span>
            <form method="post" style="display:inline;">
              <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="action" value="move">
              <input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
              <button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;font-size:0.74rem;" title="Move Up">&uarr;</button>
              <button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;font-size:0.74rem;" title="Move Down">&darr;</button>
            </form>
          </div>
        </div>
        <div style="margin-top:0.5rem;font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;"><?= e(formatCommitteeGroupLabel($p['committee_group'] ?? '')) ?></div>
        <h3 style="margin:0.2rem 0 0.2rem;"><?= e($p['name']) ?></h3>
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
