<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/captcha.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$msg = '';
$err = '';
$tracked = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    if (!verifyCaptchaAnswer($_POST['captcha_answer'] ?? null, 'grievance_submit')) {
        $err = 'Invalid CAPTCHA verification code. Please enter the 5-character code shown.';
    } else {
        $name = trim((string)($_POST['complainant_name'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $phone = trim((string)($_POST['phone'] ?? ''));
        $role = trim((string)($_POST['reporter_role'] ?? 'Student (UG / PG / Ph.D.)'));
        $category = trim((string)($_POST['category'] ?? 'Academic & Examination'));
        $urgency = in_array($_POST['urgency'] ?? 'Normal', ['Normal', 'High', 'Urgent'], true) ? $_POST['urgency'] : 'Normal';
        $subject = trim((string)($_POST['subject'] ?? ''));
        $description = trim((string)($_POST['description'] ?? ''));

        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $subject === '' || $description === '') {
            $err = 'Please fill in all required grievance details and a valid email address.';
        } else {
            $ticketCode = 'GRV-' . date('Y') . '-' . random_int(1000, 9999);
            $now = date('Y-m-d H:i');
            $pdo->prepare(
                'INSERT INTO grievances (ticket_code, complainant_name, email, phone, reporter_role, category, subject, description, urgency, status, submitted_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
            )->execute([$ticketCode, $name, $email, $phone, $role, $category, $subject, $description, $urgency, 'Open', $now, $now]);
            $msg = 'Grievance submitted! Please save your Ticket Tracking Code: ' . $ticketCode;
        }
    }
}

$trackQuery = trim((string)($_GET['track'] ?? ''));
if ($trackQuery !== '') {
    $st = $pdo->prepare('SELECT * FROM grievances WHERE UPPER(ticket_code) = UPPER(?) LIMIT 1');
    $st->execute([$trackQuery]);
    $tracked = $st->fetch() ?: null;
}

$pageTitle = 'Online Grievance Redressal & Anti-Ragging Helpdesk';
require_once __DIR__ . '/includes/header.php';
?>

<section class="alumni-hero" style="margin-bottom:1.25rem;">
  <span style="display:inline-block;padding:0.2rem 0.65rem;border-radius:999px;background:rgba(255,255,255,0.14);font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">UGC Samadhaan &amp; Statutory Redressal Cell</span>
  <h1 style="margin:0.45rem 0 0.35rem;font-family:'Playfair Display',serif;font-size:clamp(1.45rem,2.6vw,2.05rem);color:#fff;">
    Online Grievance Redressal &amp; Live Ticket Tracker
  </h1>
  <p style="margin:0;color:#E2E8F0;max-width:780px;font-size:0.93rem;">
    Students, parents, alumni, and staff may lodge confidential academic, administrative, infrastructure, ICC, or anti-ragging grievances and track committee resolution status online.
  </p>
</section>

<?php if ($msg): ?><div class="alert-ok"><?= e($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert-err"><?= e($err) ?></div><?php endif; ?>

<section class="grid-2" style="margin-bottom:2rem;align-items:start;">
  <form method="post" class="card">
    <h2 style="margin-top:0;color:var(--primary-color);">Submit a New Grievance Ticket</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <div class="grid-2">
      <label class="login-field"><span class="login-label">Complainant Full Name *</span>
        <input type="text" name="complainant_name" required class="login-input">
      </label>
      <label class="login-field"><span class="login-label">Email Address *</span>
        <input type="email" name="email" required class="login-input">
      </label>
    </div>
    <div class="grid-2">
      <label class="login-field"><span class="login-label">Mobile / Contact Number</span>
        <input type="text" name="phone" class="login-input">
      </label>
      <label class="login-field"><span class="login-label">Reporter Role *</span>
        <select name="reporter_role" class="login-input">
          <?php foreach (grievanceRolePresets() as $r): ?>
            <option value="<?= e($r) ?>"><?= e($r) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
    </div>
    <div class="grid-2">
      <label class="login-field"><span class="login-label">Grievance Category *</span>
        <select name="category" class="login-input">
          <?php foreach (grievanceCategoryPresets() as $c): ?>
            <option value="<?= e($c) ?>"><?= e($c) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label class="login-field"><span class="login-label">Urgency Priority</span>
        <select name="urgency" class="login-input">
          <option value="Normal">Normal</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </label>
    </div>
    <label class="login-field"><span class="login-label">Subject / Grievance Title *</span>
      <input type="text" name="subject" required class="login-input" placeholder="Concise summary of the issue">
    </label>
    <label class="login-field"><span class="login-label">Detailed Description *</span>
      <textarea name="description" rows="4" required class="login-input" placeholder="Describe the issue, dates, department, and expected resolution..."></textarea>
    </label>
    <?= renderCaptchaWidget('grievance_submit', baseUrl('includes/captcha.php'), 'Grievance Security CAPTCHA *') ?>
    <button type="submit" class="btn-primary" style="width:100%;">Submit Confidential Grievance</button>
  </form>

  <div class="card">
    <h2 style="margin-top:0;color:var(--primary-color);">Track Grievance Resolution Status</h2>
    <form method="get" style="display:flex;gap:0.5rem;margin-bottom:1rem;">
      <input type="text" name="track" required value="<?= e($trackQuery) ?>" class="login-input" placeholder="Enter Ticket Code (e.g. GRV-2026-1042)">
      <button type="submit" class="btn-secondary" style="white-space:nowrap;">Check Status</button>
    </form>

    <?php if ($trackQuery !== ''): ?>
      <?php if ($tracked): ?>
        <div style="border:1px solid var(--border-color);border-radius:10px;padding:1rem;background:var(--surface-bg);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <strong style="color:var(--primary-color);"><?= e($tracked['ticket_code']) ?></strong>
            <span class="badge <?= $tracked['status'] === 'Resolved' ? 'badge-ok' : 'badge-warn' ?>"><?= e($tracked['status']) ?></span>
          </div>
          <h3 style="margin:0 0 0.35rem;font-size:1rem;"><?= e($tracked['subject']) ?></h3>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;">
            Category: <?= e($tracked['category']) ?> · Urgency: <?= e($tracked['urgency']) ?> · Updated: <?= e($tracked['updated_at']) ?>
          </div>
          <?php if (!empty($tracked['resolution_note'])): ?>
            <div style="padding:0.65rem;border-radius:8px;background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;font-size:0.84rem;">
              <strong>Committee Action / Remarks:</strong><br><?= nl2br(e((string)$tracked['resolution_note'])) ?>
            </div>
          <?php else: ?>
            <p style="margin:0;font-size:0.84rem;color:var(--text-muted);">Your grievance has been logged with the Redressal Committee and is awaiting review remarks.</p>
          <?php endif; ?>
        </div>
      <?php else: ?>
        <div class="alert-err">No grievance ticket found matching code &ldquo;<?= e($trackQuery) ?>&rdquo;.</div>
      <?php endif; ?>
    <?php else: ?>
      <div style="padding:0.9rem;border-radius:10px;background:var(--surface-bg);border:1px solid var(--border-color);font-size:0.84rem;color:var(--text-muted);">
        <strong style="color:var(--primary-color);display:block;margin-bottom:0.35rem;">24x7 Anti-Ragging &amp; Women Safety Helplines</strong>
        <div>Anti-Ragging Toll-Free: <?= e((string)($settings['anti_ragging_helpline'] ?? '1800-180-5522')) ?></div>
        <div>Institutional Desk: <?= e((string)($settings['email'] ?? 'principal@coe.sveri.ac.in')) ?></div>
      </div>
    <?php endif; ?>
  </div>
</section>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
