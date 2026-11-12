<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

if (currentUser()) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $email = trim($_POST['email'] ?? '');
    $pass  = $_POST['password'] ?? '';

    $pdo = getDB();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($pass, $user['password_hash'])) {
        session_regenerate_id(true);
        $_SESSION['cms_user'] = [
            'id'                     => (int)$user['id'],
            'full_name'              => $user['full_name'],
            'email'                  => $user['email'],
            'role'                   => $user['role'],
            'assigned_department_id' => $user['assigned_department_id'] ? (int)$user['assigned_department_id'] : null,
        ];
        $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);
        logAudit($pdo, $_SESSION['cms_user'], 'LOGIN', 'Session', $user['email']);
        header('Location: dashboard.php');
        exit;
    }
    $error = 'Invalid credentials or inactive account.';
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CMS Admin Login</title>
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body style="display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <form method="post" class="card" style="width:100%;max-width:420px;">
    <h1 style="margin-top:0;">SVCOER CMS Admin Login</h1>
    <?php if ($error): ?><p style="color:#dc2626;font-size:0.875rem;"><?= e($error) ?></p><?php endif; ?>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <label style="display:block;margin-bottom:0.75rem;">
      <span style="display:block;font-size:0.8rem;font-weight:600;">Email</span>
      <input type="email" name="email" required style="width:100%;padding:0.5rem;border:1px solid var(--border-color);border-radius:6px;">
    </label>
    <label style="display:block;margin-bottom:1rem;">
      <span style="display:block;font-size:0.8rem;font-weight:600;">Password</span>
      <input type="password" name="password" required style="width:100%;padding:0.5rem;border:1px solid var(--border-color);border-radius:6px;">
    </label>
    <button type="submit" class="btn-primary" style="width:100%;justify-content:center;">Sign In</button>
    <p style="margin-top:1rem;font-size:0.8rem;"><a href="../index.php">&larr; Back to Public Website</a></p>
  </form>
</body>
</html>
