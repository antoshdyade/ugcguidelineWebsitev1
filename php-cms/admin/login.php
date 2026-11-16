<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/captcha.php';

if (currentUser()) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $email = trim((string)($_POST['email'] ?? ''));
    $pass  = (string)($_POST['password'] ?? '');
    $captchaAnswer = (string)($_POST['captcha_answer'] ?? '');

    if (!verifyCaptchaAnswer($captchaAnswer, 'admin_login')) {
        $error = 'Incorrect or expired security CAPTCHA code. Please try again.';
    } else {
        $pdo = getDB();
        try {
            ensureCmsSchemaUpgraded($pdo);
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
            $allowedModules = !empty($user['allowed_modules_json']) ? json_decode((string)$user['allowed_modules_json'], true) : null;
            $allowedDepts = !empty($user['allowed_department_ids_json']) ? json_decode((string)$user['allowed_department_ids_json'], true) : null;
            $_SESSION['cms_user'] = [
                'id'                     => (int)$user['id'],
                'full_name'              => $user['full_name'],
                'email'                  => $user['email'],
                'role'                   => $user['role'],
                'assigned_department_id' => $user['assigned_department_id'] ? (int)$user['assigned_department_id'] : null,
                'allowed_categories'     => is_array($allowedCats) ? $allowedCats : null,
                'allowed_page_ids'       => is_array($allowedPages) ? array_map('intval', $allowedPages) : null,
                'allowed_modules'        => is_array($allowedModules) ? $allowedModules : null,
                'allowed_department_ids' => is_array($allowedDepts) ? array_map('intval', $allowedDepts) : null,
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
}

$demoAccounts = [
    ['label' => 'Super Admin', 'email' => 'admin@svcoer.edu.in', 'pass' => 'Admin@123'],
    ['label' => 'Content Editor / PRO', 'email' => 'pro@svcoer.edu.in', 'pass' => 'Editor@123'],
    ['label' => 'CSE Dept Admin', 'email' => 'hod.cse@svcoer.edu.in', 'pass' => 'Dept@123'],
    ['label' => 'IQAC Officer', 'email' => 'iqac@svcoer.edu.in', 'pass' => 'Iqac@123'],
    ['label' => 'Controller of Examinations (CoE)', 'email' => 'coe@coe.sveri.ac.in', 'pass' => 'Exam@123'],
];
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Staff &amp; Admin Portal — Enterprise RBAC CMS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
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
<body class="login-shell">
  <div class="login-card">
    <div class="login-head">
      <div>
        <p class="login-eyebrow">Enterprise RBAC CMS</p>
        <h1 class="login-title">Staff &amp; Admin Portal</h1>
      </div>
      <a href="<?= e(baseUrl('index.php')) ?>" class="login-exit">&larr; Public Site</a>
    </div>

    <?php if ($error): ?>
      <div role="alert" class="alert-err" style="font-size:0.78rem;padding:0.65rem 0.85rem;"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="post">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <label class="login-field" for="login-email">
        <span class="login-label">Institutional Email</span>
        <input id="login-email" class="login-input" type="email" name="email" required value="<?= e($_POST['email'] ?? '') ?>" placeholder="admin@svcoer.edu.in">
      </label>
      <label class="login-field" for="login-password">
        <span class="login-label">Password</span>
        <input id="login-password" class="login-input" type="password" name="password" required placeholder="••••••••">
      </label>
      <?= renderCaptchaWidget('admin_login', baseUrl('includes/captcha.php'), 'Security CAPTCHA Verification *') ?>
      <button type="submit" class="login-submit">Sign In to Dashboard</button>
    </form>

    <div class="login-demo-box">
      <p class="login-demo-title">RBAC Demo Accounts (Click to Fill):</p>
      <div class="login-demo-grid">
        <?php foreach ($demoAccounts as $idx => $acc): ?>
          <button
            type="button"
            class="login-demo-btn<?= $idx === 4 ? ' is-span-2' : '' ?>"
            data-email="<?= e($acc['email']) ?>"
            data-pass="<?= e($acc['pass']) ?>"
          >
            <span class="login-demo-role"><?= e($acc['label']) ?></span>
            <span class="login-demo-email"><?= e($acc['email']) ?></span>
          </button>
        <?php endforeach; ?>
      </div>
      <?php if (file_exists(__DIR__ . '/../setup.php')): ?>
        <p style="margin:0.85rem 0 0;font-size:0.74rem;text-align:right;">
          <a href="<?= e(baseUrl('setup.php')) ?>" style="color:#57534E;text-decoration:none;">First-Time Setup Check &rarr;</a>
        </p>
      <?php endif; ?>
    </div>
  </div>
  <script>
    (function () {
      var btns = document.querySelectorAll('.login-demo-btn');
      var emailEl = document.getElementById('login-email');
      var passEl = document.getElementById('login-password');
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function () {
          if (emailEl) emailEl.value = this.getAttribute('data-email') || '';
          if (passEl) passEl.value = this.getAttribute('data-pass') || '';
        });
      }
    })();
  </script>
</body>
</html>
