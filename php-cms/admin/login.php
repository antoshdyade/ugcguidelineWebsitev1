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
    try {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
    } catch (PDOException $ex) {
        $user = null;
        $error = 'Database tables not found. Please import database.sql and run setup.php first.';
    }

    if ($user && password_verify($pass, $user['password_hash'])) {
        session_regenerate_id(true);
        $allowedCats = !empty($user['allowed_categories_json']) ? json_decode((string)$user['allowed_categories_json'], true) : null;
        $allowedPages = !empty($user['allowed_page_ids_json']) ? json_decode((string)$user['allowed_page_ids_json'], true) : null;
        $_SESSION['cms_user'] = [
            'id'                     => (int)$user['id'],
            'full_name'              => $user['full_name'],
            'email'                  => $user['email'],
            'role'                   => $user['role'],
            'assigned_department_id' => $user['assigned_department_id'] ? (int)$user['assigned_department_id'] : null,
            'allowed_categories'     => is_array($allowedCats) ? $allowedCats : null,
            'allowed_page_ids'       => is_array($allowedPages) ? array_map('intval', $allowedPages) : null,
        ];
        $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);
        logAudit($pdo, $_SESSION['cms_user'], 'LOGIN', 'Session', $user['email']);
        header('Location: dashboard.php');
        exit;
    }
    if (!$error) {
        $error = 'Invalid credentials or inactive account. If deploying for the first time, run setup.php to verify DB & passwords.';
    }
}
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMS Admin Login</title>
  <link id="svcoer-login-css" rel="stylesheet" href="<?= e(assetUrl('assets/css/style.css')) ?>">
  <script>
    (function () {
      var fallbackHref = <?= json_encode(baseUrl('admin/asset_proxy.php?f=css'), JSON_UNESCAPED_SLASHES) ?>;
      function ensureCss() {
        var ready = getComputedStyle(document.documentElement).getPropertyValue('--svcoer-css-ready').trim();
        if (ready !== '1' && !document.getElementById('svcoer-proxy-css')) {
          var lk = document.createElement('link');
          lk.id = 'svcoer-proxy-css';
          lk.rel = 'stylesheet';
          lk.href = fallbackHref;
          document.head.appendChild(lk);
        }
      }
      var mainLk = document.getElementById('svcoer-login-css');
      if (mainLk) mainLk.addEventListener('error', ensureCss);
      window.addEventListener('DOMContentLoaded', ensureCss);
      window.addEventListener('load', ensureCss);
      setTimeout(ensureCss, 350);
    })();
  </script>
</head>
<body style="display:flex;min-height:100vh;align-items:center;justify-content:center;padding:1rem;">
  <form method="post" class="card" style="width:100%;max-width:440px;">
    <h1 style="margin-top:0;">SVCOER CMS Admin Login</h1>
    <?php if ($error): ?>
      <div style="background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;padding:0.65rem;border-radius:6px;font-size:0.85rem;margin-bottom:0.75rem;">
        <?= e($error) ?>
      </div>
    <?php endif; ?>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <label style="display:block;margin-bottom:0.75rem;">
      <span style="display:block;font-size:0.8rem;font-weight:600;">Email</span>
      <input type="email" name="email" required placeholder="admin@svcoer.edu.in" style="width:100%;padding:0.5rem;border:1px solid var(--border-color);border-radius:6px;">
    </label>
    <label style="display:block;margin-bottom:1rem;">
      <span style="display:block;font-size:0.8rem;font-weight:600;">Password</span>
      <input type="password" name="password" required placeholder="••••••••" style="width:100%;padding:0.5rem;border:1px solid var(--border-color);border-radius:6px;">
    </label>
    <button type="submit" class="btn-primary" style="width:100%;justify-content:center;">Sign In</button>
    <div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border-color);font-size:0.78rem;color:var(--text-muted);">
      <strong>Default Accounts:</strong><br>
      Super Admin: <code>admin@svcoer.edu.in</code> / <code>Admin@123</code><br>
      PRO Editor: <code>pro@svcoer.edu.in</code> / <code>Editor@123</code><br>
      CSE Dept: <code>hod.cse@svcoer.edu.in</code> / <code>Dept@123</code><br>
      IQAC Officer: <code>iqac@svcoer.edu.in</code> / <code>Iqac@123</code><br>
      CoE (Exam Cell): <code>coe@coe.sveri.ac.in</code> / <code>Exam@123</code>
    </div>
    <p style="margin-top:0.75rem;font-size:0.8rem;display:flex;justify-content:space-between;">
      <a href="<?= e(baseUrl('index.php')) ?>">&larr; Back to Public Website</a>
      <?php if (file_exists(__DIR__ . '/../setup.php')): ?>
        <a href="<?= e(baseUrl('setup.php')) ?>">First-Time Setup Check &rarr;</a>
      <?php endif; ?>
    </p>
  </form>
</body>
</html>
