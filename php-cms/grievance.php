<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/captcha.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$settings = getSiteSettings($pdo);
$gCfg = getGrievancePortalConfig($pdo);

$msg = '';
$err = '';
$tracked = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    if (!verifyCaptchaAnswer($_POST['captcha_answer'] ?? null, 'grievance_submit')) {
        $err = 'Invalid CAPTCHA verification code. Please enter the 5-character code shown.';
    } else {
        $isAnon = !empty($_POST['is_anonymous']) ? 1 : 0;
        $rawName = trim((string)($_POST['complainant_name'] ?? ''));
        $name = ($isAnon && $rawName === '') ? 'Confidential / Anonymous Reporter' : $rawName;
        $email = trim((string)($_POST['email'] ?? ''));
        $phone = trim((string)($_POST['phone'] ?? ''));
        $role = trim((string)($_POST['reporter_role'] ?? 'Student (UG / PG / Ph.D.)'));
        $category = trim((string)($_POST['category'] ?? 'Academic & Examination'));
        $urgency = in_array($_POST['urgency'] ?? 'Normal', ['Normal', 'High', 'Urgent'], true) ? (string)$_POST['urgency'] : 'Normal';
        $subject = trim((string)($_POST['subject'] ?? ''));
        $description = trim((string)($_POST['description'] ?? ''));

        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $subject === '' || $description === '') {
            $err = 'Please fill in all required grievance details and a valid email address for status notifications.';
        } else {
            $attachmentUrl = null;
            if (!empty($_FILES['attachment']['name'])) {
                $up = handleCmsUpload($pdo, $_FILES['attachment'], __DIR__ . '/uploads', 'auto');
                if (!$up['ok']) {
                    $err = $up['error'];
                } else {
                    $attachmentUrl = $up['file_url'];
                }
            }
            if ($err === '') {
                $ticketCode = 'GRV-' . date('Y') . '-' . random_int(1000, 9999);
                $now = date('Y-m-d H:i');
                $pdo->prepare(
                    'INSERT INTO grievances (ticket_code, complainant_name, email, phone, reporter_role, category, subject, description, urgency, is_anonymous, attachment_url, status, submitted_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                )->execute([$ticketCode, $name, $email, $phone, $role, $category, $subject, $description, $urgency, $isAnon, $attachmentUrl, 'Open', $now, $now]);
                $msg = 'Grievance logged confidentially! Please save your Ticket Tracking Code: ' . $ticketCode;
            }
        }
    }
}

$trackQuery = trim((string)($_GET['track'] ?? ''));
if ($trackQuery !== '') {
    $st = $pdo->prepare('SELECT * FROM grievances WHERE UPPER(ticket_code) = UPPER(?) LIMIT 1');
    $st->execute([$trackQuery]);
    $tracked = $st->fetch() ?: null;
}

// Live anonymized SGRC resolution summary metrics
$summaryCounts = ['total' => 0, 'resolved' => 0, 'in_progress' => 0, 'urgent' => 0];
try {
    $rowCounts = $pdo->query(
        "SELECT COUNT(*) AS total,
                SUM(status = 'Resolved') AS resolved,
                SUM(status IN ('Open','Under Review','Escalated')) AS in_progress,
                SUM(urgency = 'Urgent' AND status <> 'Resolved') AS urgent_open
         FROM grievances"
    )->fetch();
    if ($rowCounts) {
        $summaryCounts['total'] = (int)$rowCounts['total'];
        $summaryCounts['resolved'] = (int)$rowCounts['resolved'];
        $summaryCounts['in_progress'] = (int)$rowCounts['in_progress'];
        $summaryCounts['urgent'] = (int)$rowCounts['urgent_open'];
    }
} catch (Throwable $ignored) {
}

$committeeMembers = is_array($gCfg['committeeMembers'] ?? null) ? $gCfg['committeeMembers'] : [];

$pageTitle = 'Online Grievance Redressal (SGRC) & Anti-Ragging Portal';
require_once __DIR__ . '/includes/header.php';
?>

<section class="alumni-hero" style="margin-bottom:1.25rem;">
  <span style="display:block;font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FCD34D;"><?= e((string)$gCfg['heroBadge']) ?></span>
  <h1 style="margin:0.4rem 0 0.35rem;font-family:'Playfair Display',serif;font-size:clamp(1.45rem,2.6vw,2.05rem);color:#fff;">
    <?= e((string)$gCfg['heroTitle']) ?>
  </h1>
  <p style="margin:0;color:#E2E8F0;max-width:820px;font-size:0.93rem;"><?= e((string)$gCfg['heroSubtitle']) ?></p>
</section>

<!-- Live Anonymized SGRC Resolution Metrics Strip -->
<section class="grid-4" style="margin-bottom:1.35rem;">
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Total Grievances Logged</div><div style="font-size:1.75rem;font-weight:700;color:var(--primary-color);font-variant-numeric:tabular-nums;"><?= (int)$summaryCounts['total'] ?></div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Resolved Cases</div><div style="font-size:1.75rem;font-weight:700;color:#047857;font-variant-numeric:tabular-nums;"><?= (int)$summaryCounts['resolved'] ?></div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Active / Under SGRC Review</div><div style="font-size:1.75rem;font-weight:700;color:var(--secondary-color);font-variant-numeric:tabular-nums;"><?= (int)$summaryCounts['in_progress'] ?></div></div>
  <div class="card" style="border-color:#FECACA;background:#FEF2F2;"><div style="font-size:0.75rem;color:#991B1B;font-weight:700;">24x7 Anti-Ragging Squad</div><div style="font-size:1.05rem;font-weight:700;color:#B91C1C;font-variant-numeric:tabular-nums;"><?= e((string)$gCfg['antiRaggingSquadPhone']) ?></div><small style="color:var(--text-muted);font-variant-numeric:tabular-nums;">UGC Helpline: <?= e((string)($settings['anti_ragging_helpline'] ?? '1800-180-5522')) ?></small></div>
</section>

<?php if ($msg): ?><div class="alert-ok"><?= e($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert-err"><?= e($err) ?></div><?php endif; ?>

<section class="grid-2" style="margin-bottom:1.5rem;align-items:start;">
  <!-- Grievance Filing Form with Confidentiality + Attachment Upload -->
  <form method="post" enctype="multipart/form-data" class="card">
    <h2 style="margin-top:0;color:var(--primary-color);">Submit a Grievance / Anti-Ragging Complaint</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <label style="display:flex;align-items:center;gap:0.5rem;padding:0.55rem 0.75rem;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin-bottom:0.85rem;font-size:0.82rem;font-weight:600;color:#78350F;cursor:pointer;">
      <input type="checkbox" name="is_anonymous" value="1">
      Confidential / Anonymous Submission (Identity masked in public tracking &amp; restricted to Chairperson/Ombudsperson)
    </label>
    <div class="grid-2">
      <label class="login-field"><span class="login-label">Complainant Name *</span>
        <input type="text" name="complainant_name" required class="login-input" placeholder="Full Name or Pseudonym">
      </label>
      <label class="login-field"><span class="login-label">Email Address (for status updates) *</span>
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
      <label class="login-field"><span class="login-label">Grievance / Cell Category *</span>
        <select name="category" class="login-input">
          <?php foreach (grievanceCategoryPresets() as $c): ?>
            <option value="<?= e($c) ?>"><?= e($c) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label class="login-field"><span class="login-label">Urgency Priority *</span>
        <select name="urgency" class="login-input">
          <option value="Normal">Normal</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent (Safety / Anti-Ragging)</option>
        </select>
      </label>
    </div>
    <label class="login-field"><span class="login-label">Subject / Grievance Title *</span>
      <input type="text" name="subject" required class="login-input" placeholder="Concise summary of the issue">
    </label>
    <label class="login-field"><span class="login-label">Detailed Description *</span>
      <textarea name="description" rows="4" required class="login-input" placeholder="Describe incident, date, location, department, and expected redressal..."></textarea>
    </label>
    <label class="login-field"><span class="login-label">Supporting Document / Evidence (Optional PDF / JPG / PNG)</span>
      <input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" class="login-input">
    </label>
    <?= renderCaptchaWidget('grievance_submit', baseUrl('includes/captcha.php'), 'Grievance Security CAPTCHA *') ?>
    <button type="submit" class="btn-primary" style="width:100%;">Submit Confidential Grievance Ticket</button>
  </form>

  <!-- Right Column: Live Ticket Tracker + Ombudsperson + Helplines -->
  <div style="display:flex;flex-direction:column;gap:1.1rem;">
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
      <?php endif; ?>
    </div>

    <!-- University Appointed Ombudsperson Portrait Card -->
    <div class="card" style="display:flex;gap:1rem;align-items:center;">
      <img src="<?= e(mediaUrl((string)$gCfg['ombudspersonPhoto'], 'assets/images/principal.jpg')) ?>" alt="<?= e((string)$gCfg['ombudspersonName']) ?>" style="width:74px;height:74px;border-radius:10px;object-fit:cover;border:1px solid var(--border-color);flex-shrink:0;">
      <div>
        <span style="display:block;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-color);">UGC Mandated Ombudsperson</span>
        <h3 style="margin:0.2rem 0 0.1rem;font-size:1rem;color:var(--primary-color);"><?= e((string)$gCfg['ombudspersonName']) ?></h3>
        <div style="font-size:0.8rem;font-weight:600;color:var(--secondary-color);"><?= e((string)$gCfg['ombudspersonTitle']) ?></div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem;">
          Email: <?= e((string)$gCfg['ombudspersonEmail']) ?> · Phone: <?= e((string)$gCfg['ombudspersonPhone']) ?>
        </div>
      </div>
    </div>

    <!-- Statutory Helplines & UGC Anti-Ragging Portal -->
    <div class="card" style="background:var(--surface-bg);">
      <h3 style="margin-top:0;color:var(--primary-color);font-size:1rem;">24x7 Anti-Ragging, Women Safety &amp; UGC Undertaking</h3>
      <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.45rem;font-size:0.84rem;">
        <li><strong>UGC National Anti-Ragging Helpline:</strong> <?= e((string)($settings['anti_ragging_helpline'] ?? '1800-180-5522')) ?> (24x7 Toll-Free)</li>
        <li><strong>Campus Anti-Ragging Squad:</strong> <?= e((string)$gCfg['antiRaggingSquadPhone']) ?></li>
        <li><strong>Women Empowerment &amp; ICC Officer:</strong> <?= e((string)$gCfg['womenCellOfficer']) ?> (<?= e((string)$gCfg['womenCellPhone']) ?>)</li>
      </ul>
      <?php if (!empty($gCfg['ugcUndertakingUrl']) && validateExternalUrl((string)$gCfg['ugcUndertakingUrl'])): ?>
        <div style="margin-top:0.75rem;">
          <a href="<?= e((string)$gCfg['ugcUndertakingUrl']) ?>" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm">Fill Online UGC Anti-Ragging Undertaking &#8599;</a>
        </div>
      <?php endif; ?>
    </div>
  </div>
</section>

<!-- SGRC & Anti-Ragging Committee Members -->
<?php if (!empty($committeeMembers)): ?>
  <section class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;color:var(--primary-color);">Student Grievance Redressal Committee (SGRC) &amp; Anti-Ragging Squad</h2>
    <div class="grid-3">
      <?php foreach ($committeeMembers as $cm): ?>
        <article style="display:flex;gap:0.85rem;align-items:flex-start;border:1px solid var(--border-color);border-radius:12px;padding:0.9rem;background:var(--surface-bg);">
          <img src="<?= e(mediaUrl((string)($cm['photoUrl'] ?? ''), 'assets/images/principal.jpg')) ?>" alt="<?= e((string)($cm['name'] ?? '')) ?>" style="width:66px;height:66px;border-radius:10px;object-fit:cover;border:1px solid var(--border-color);flex-shrink:0;">
          <div>
            <span style="display:block;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--secondary-color);"><?= e((string)($cm['role'] ?? 'Member')) ?></span>
            <h3 style="margin:0.2rem 0 0.1rem;font-size:0.98rem;color:var(--primary-color);"><?= e((string)($cm['name'] ?? '')) ?></h3>
            <div style="font-size:0.79rem;font-weight:600;color:var(--secondary-color);"><?= e((string)($cm['designation'] ?? '')) ?></div>
            <div style="font-size:0.77rem;color:var(--text-muted);"><?= e((string)($cm['department'] ?? '')) ?></div>
            <div style="font-size:0.76rem;color:var(--text-muted);margin-top:0.2rem;">
              <?= e((string)($cm['email'] ?? '')) ?> <?= !empty($cm['phone']) ? '· ' . e((string)$cm['phone']) : '' ?>
            </div>
          </div>
        </article>
      <?php endforeach; ?>
    </div>
  </section>
<?php endif; ?>

<!-- Statutory Escalation SLA Matrix & Rich Charter -->
<?php if (!empty($gCfg['charterHtml'])): ?>
  <section class="card cms-prose" style="margin-bottom:2rem;">
    <?= (string)$gCfg['charterHtml'] ?>
  </section>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
