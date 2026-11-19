<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/captcha.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$settings = getSiteSettings($pdo);
$sections = getFeedbackSections($pdo, true);
$sectionsById = [];
foreach ($sections as $sec) {
    $sectionsById[(int)$sec['id']] = $sec;
}

$msg = '';
$err = '';
$submittedTicket = null;
$tracked = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    if (!verifyCaptchaAnswer($_POST['captcha_answer'] ?? null, 'feedback_submit')) {
        $err = 'Invalid CAPTCHA verification code. Please enter the 5-character code shown.';
    } else {
        $secId = (int)($_POST['section_id'] ?? 0);
        $selectedSec = $sectionsById[$secId] ?? ($sections[0] ?? null);
        $sectionName = $selectedSec ? (string)$selectedSec['section_name'] : 'General Feedback & Campus Desk';
        $subsection = trim((string)($_POST['subsection'] ?? 'General')) ?: 'General';
        $subType = in_array($_POST['submission_type'] ?? 'Suggestion', feedbackSubmissionTypePresets(), true)
            ? (string)$_POST['submission_type']
            : 'Suggestion';
        $role = trim((string)($_POST['stakeholder_role'] ?? 'Student (UG / PG / Ph.D.)'));
        $isAnon = !empty($_POST['is_anonymous']) ? 1 : 0;
        $rawName = trim((string)($_POST['sender_name'] ?? ''));
        $senderName = ($isAnon && $rawName === '') ? 'Anonymous Stakeholder' : $rawName;
        $senderEmail = trim((string)($_POST['sender_email'] ?? ''));
        $senderPhone = trim((string)($_POST['sender_phone'] ?? ''));
        $deptBatch = trim((string)($_POST['department_or_batch'] ?? ''));
        $rating = max(1, min(5, (int)($_POST['rating'] ?? 5)));
        $subject = trim((string)($_POST['subject'] ?? ''));
        $message = trim((string)($_POST['message'] ?? ''));

        if ($senderName === '' || !filter_var($senderEmail, FILTER_VALIDATE_EMAIL) || $subject === '' || $message === '') {
            $err = 'Please provide your name, a valid email address, subject, and detailed feedback or complaint.';
        } else {
            $attachmentUrl = '';
            if (!empty($_FILES['attachment']['name'])) {
                $up = handleCmsUpload($pdo, $_FILES['attachment'], __DIR__ . '/uploads', 'auto');
                if (!$up['ok']) {
                    $err = $up['error'];
                } else {
                    $attachmentUrl = (string)$up['file_url'];
                }
            }
            if ($err === '') {
                $ticketCode = 'CFB-' . date('Y') . '-' . random_int(1000, 9999);
                $now = date('Y-m-d H:i');
                $recTo = $selectedSec ? trim((string)($selectedSec['recipient_emails'] ?? '')) : '';
                $recCc = $selectedSec ? trim((string)($selectedSec['cc_emails'] ?? '')) : '';
                $routedStr = trim($recTo . ($recCc !== '' ? ' (CC: ' . $recCc . ')' : ''));

                $dispatchStatus = 'disabled';
                $dispatchDetail = 'Auto-email disabled for this section.';

                try {
                    $epCfg = getEmailPushConfig($pdo);
                    $secAuto = $selectedSec ? !empty($selectedSec['auto_email_enabled']) : true;
                    if (empty($epCfg['enabled']) || empty($epCfg['pushOnNewFeedback'])) {
                        $dispatchStatus = 'disabled';
                        $dispatchDetail = 'Email Push Alerts disabled or paused for Feedback.';
                    } elseif (!$secAuto) {
                        $dispatchStatus = 'disabled';
                        $dispatchDetail = 'Auto-email routing turned off for section ' . $sectionName . '.';
                    } elseif ($recTo === '' && $recCc === '') {
                        $dispatchStatus = 'queued';
                        $dispatchDetail = 'No section recipient emails configured; logged in Admin Inbox.';
                    } else {
                        $mailBody = "SVCOER STAKEHOLDER COMPLAINT & FEEDBACK DESK\n"
                            . str_repeat('=', 60) . "\n"
                            . "Tracking Code : {$ticketCode}\n"
                            . "Section       : {$sectionName}\n"
                            . "Subsection    : {$subsection}\n"
                            . "Type          : {$subType}\n"
                            . "Rating        : {$rating} / 5\n"
                            . "Role          : {$role}\n"
                            . "Dept / Batch  : " . ($deptBatch !== '' ? $deptBatch : 'N/A') . "\n"
                            . "Sender        : " . ($isAnon ? 'Anonymous / Confidential Mode' : "{$senderName} ({$senderEmail}, {$senderPhone})") . "\n"
                            . "Submitted At  : {$now}\n"
                            . "SLA Target    : " . ($selectedSec ? (int)$selectedSec['sla_days'] : 5) . " working days\n\n"
                            . "Subject: {$subject}\n\n"
                            . "Message:\n{$message}\n"
                            . ($attachmentUrl !== '' ? "\nAttachment: " . baseUrl($attachmentUrl) . "\n" : '');

                        $res = cms_dispatch_and_log_email(
                            $pdo,
                            'feedback_alert',
                            $recTo,
                            "[{$subType} · {$sectionName}] {$ticketCode}: {$subject}",
                            $mailBody,
                            'Ticket: ' . $ticketCode . ' -> ' . $sectionName,
                            $recCc,
                            $epCfg
                        );
                        $dispatchStatus = in_array($res['status'] ?? '', ['sent', 'queued', 'failed'], true) ? (string)$res['status'] : 'queued';
                        $dispatchDetail = (string)($res['detail'] ?? '');
                    }
                } catch (Throwable $mailErr) {
                    $dispatchStatus = 'failed';
                    $dispatchDetail = $mailErr->getMessage();
                }

                $pdo->prepare(
                    'INSERT INTO feedback_entries (tracking_code, section_id, section_name, subsection, submission_type, stakeholder_role, sender_name, sender_email, sender_phone, department_or_batch, rating, subject, message, is_anonymous, attachment_url, routed_to_emails, email_dispatch_status, email_dispatch_detail, status, action_taken_note, submitted_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                )->execute([
                    $ticketCode,
                    $selectedSec ? (int)$selectedSec['id'] : 0,
                    $sectionName,
                    $subsection,
                    $subType,
                    $role,
                    $isAnon ? 'Anonymous Stakeholder' : $senderName,
                    $senderEmail,
                    $isAnon ? '' : $senderPhone,
                    $deptBatch,
                    $rating,
                    $subject,
                    $message,
                    $isAnon,
                    $attachmentUrl,
                    substr($routedStr, 0, 400),
                    $dispatchStatus,
                    substr($dispatchDetail, 0, 400),
                    'New',
                    '',
                    $now,
                    $now,
                ]);

                $submittedTicket = [
                    'tracking_code' => $ticketCode,
                    'section_name'  => $sectionName,
                    'subsection'    => $subsection,
                    'routed_to'     => $routedStr,
                    'dispatch'      => $dispatchStatus,
                    'sla_days'      => $selectedSec ? (int)$selectedSec['sla_days'] : 5,
                ];
                $msg = 'Thank you! Your ' . strtolower($subType) . ' has been registered under code ' . $ticketCode . ' and routed to ' . $sectionName . '.';
            }
        }
    }
}

$trackQuery = trim((string)($_GET['track'] ?? ''));
if ($trackQuery !== '') {
    $st = $pdo->prepare('SELECT * FROM feedback_entries WHERE UPPER(tracking_code) = UPPER(?) LIMIT 1');
    $st->execute([$trackQuery]);
    $tracked = $st->fetch() ?: null;
}

$statsCounts = ['total' => 0, 'resolved' => 0, 'in_progress' => 0, 'avg_rating' => '4.8'];
try {
    $rowCounts = $pdo->query(
        "SELECT COUNT(*) AS total,
                SUM(status IN ('Resolved','Closed')) AS resolved,
                SUM(status IN ('New','Acknowledged','In Progress')) AS in_progress,
                ROUND(AVG(rating), 1) AS avg_rating
         FROM feedback_entries"
    )->fetch();
    if ($rowCounts) {
        $statsCounts['total'] = (int)$rowCounts['total'];
        $statsCounts['resolved'] = (int)$rowCounts['resolved'];
        $statsCounts['in_progress'] = (int)$rowCounts['in_progress'];
        $statsCounts['avg_rating'] = $rowCounts['avg_rating'] !== null ? (string)$rowCounts['avg_rating'] : '5.0';
    }
} catch (Throwable $ignored) {
}

$pageTitle = 'Complaint & Stakeholder Feedback Portal';
$seoContext = [
    'title'       => 'Complaint & Stakeholder Feedback Portal | ' . (string)($settings['short_code'] ?? 'SVCOER'),
    'description' => 'Submit section-wise academic, examination, hostel, infrastructure, library, accounts, or placement feedback and complaints with automatic department email routing and live ticket tracking.',
];
require_once __DIR__ . '/includes/header.php';
?>

<section class="alumni-hero" style="margin-bottom:1.25rem;">
  <span style="display:block;font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FCD34D;">IQAC Quality Assurance &amp; Stakeholder Redressal</span>
  <h1 style="margin:0.4rem 0 0.35rem;font-family:'Playfair Display',serif;font-size:clamp(1.45rem,2.6vw,2.05rem);color:#fff;">
    Complaint &amp; Stakeholder Feedback Cell
  </h1>
  <p style="margin:0;color:#E2E8F0;max-width:820px;font-size:0.93rem;">
    Select a campus section and subsection below. Submissions are automatically assigned a tracking code and dispatched via email directly to the designated Section In-Charge and oversight officers.
  </p>
</section>

<section class="grid-4" style="margin-bottom:1.35rem;">
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Total Submissions</div><div style="font-size:1.75rem;font-weight:700;color:var(--primary-color);font-variant-numeric:tabular-nums;"><?= (int)$statsCounts['total'] ?></div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Resolved / Closed</div><div style="font-size:1.75rem;font-weight:700;color:#047857;font-variant-numeric:tabular-nums;"><?= (int)$statsCounts['resolved'] ?></div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Under Section Review</div><div style="font-size:1.75rem;font-weight:700;color:var(--secondary-color);font-variant-numeric:tabular-nums;"><?= (int)$statsCounts['in_progress'] ?></div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Satisfaction Score</div><div style="font-size:1.75rem;font-weight:700;color:#0369A1;font-variant-numeric:tabular-nums;"><?= e($statsCounts['avg_rating']) ?> / 5.0</div><small style="color:var(--text-muted);"><?= count($sections) ?> active routing desks</small></div>
</section>

<?php if ($msg): ?>
  <div class="alert-ok">
    <strong><?= e($msg) ?></strong>
    <?php if ($submittedTicket): ?>
      <div style="margin-top:0.4rem;font-size:0.84rem;">
        Routed To: <code><?= e($submittedTicket['routed_to'] ?: 'Admin Inbox') ?></code> &middot;
        Email Push Status: <strong style="text-transform:uppercase;"><?= e($submittedTicket['dispatch']) ?></strong> &middot;
        Target SLA: <?= (int)$submittedTicket['sla_days'] ?> Working Days
      </div>
    <?php endif; ?>
  </div>
<?php endif; ?>
<?php if ($err): ?><div class="alert-err"><?= e($err) ?></div><?php endif; ?>

<section class="grid-2" style="margin-bottom:1.5rem;align-items:start;">
  <form method="post" enctype="multipart/form-data" class="card">
    <h2 style="margin-top:0;color:var(--primary-color);">Submit Section-Wise Feedback / Complaint</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">

    <div class="grid-2">
      <label class="login-field"><span class="login-label">Target Campus Section *</span>
        <select name="section_id" id="fb-section-select" class="login-input" required>
          <?php foreach ($sections as $sec): ?>
            <option value="<?= (int)$sec['id'] ?>"><?= e((string)$sec['section_name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label class="login-field"><span class="login-label">Subsection / Topic *</span>
        <select name="subsection" id="fb-subsection-select" class="login-input" required>
          <option value="General">General</option>
        </select>
      </label>
    </div>

    <!-- Live Email Routing Preview Card -->
    <div id="fb-routing-preview" style="padding:0.7rem 0.85rem;border:1px solid #BFDBFE;background:#EFF6FF;border-radius:8px;margin-bottom:0.85rem;font-size:0.8rem;color:#1E3A8A;">
      <strong>Automatic Email Routing:</strong> <span id="fb-route-emails">—</span><br>
      <span id="fb-route-incharge">In-Charge: —</span> &middot; Target SLA: <strong id="fb-route-sla">5</strong> working days
    </div>

    <div class="grid-3">
      <label class="login-field"><span class="login-label">Submission Type *</span>
        <select name="submission_type" class="login-input">
          <?php foreach (feedbackSubmissionTypePresets() as $ft): ?>
            <option value="<?= e($ft) ?>"><?= e($ft) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label class="login-field"><span class="login-label">Stakeholder Role *</span>
        <select name="stakeholder_role" class="login-input">
          <?php foreach (['Student (UG / PG / Ph.D.)', 'Parent / Guardian', 'Faculty / Staff', 'Alumni', 'Industry Recruiter / Visitor'] as $sr): ?>
            <option value="<?= e($sr) ?>"><?= e($sr) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label class="login-field"><span class="login-label">Experience Rating *</span>
        <select name="rating" class="login-input">
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Good / Satisfactory</option>
          <option value="3">3 - Average / Needs Improvement</option>
          <option value="2">2 - Below Expectations</option>
          <option value="1">1 - Critical Attention Needed</option>
        </select>
      </label>
    </div>

    <label style="display:flex;align-items:center;gap:0.5rem;padding:0.55rem 0.75rem;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;margin-bottom:0.85rem;font-size:0.81rem;font-weight:600;color:#78350F;cursor:pointer;">
      <input type="checkbox" name="is_anonymous" value="1">
      Submit Confidentially / Mask Name &amp; Phone (Email kept strictly for ticket status tracking)
    </label>

    <div class="grid-2">
      <label class="login-field"><span class="login-label">Full Name (or Pseudonym) *</span>
        <input type="text" name="sender_name" required class="login-input" placeholder="Your Full Name">
      </label>
      <label class="login-field"><span class="login-label">Email Address (for Tracking Updates) *</span>
        <input type="email" name="sender_email" required class="login-input" placeholder="name@example.edu.in">
      </label>
    </div>

    <div class="grid-2">
      <label class="login-field"><span class="login-label">Mobile Number (Optional)</span>
        <input type="text" name="sender_phone" class="login-input" placeholder="+91-...">
      </label>
      <label class="login-field"><span class="login-label">Department / Year / Batch (Optional)</span>
        <input type="text" name="department_or_batch" class="login-input" placeholder="e.g. SY B.Tech CSE">
      </label>
    </div>

    <label class="login-field"><span class="login-label">Subject / Brief Headline *</span>
      <input type="text" name="subject" required class="login-input" placeholder="Concise summary of your feedback or complaint">
    </label>

    <label class="login-field"><span class="login-label">Detailed Feedback / Complaint Description *</span>
      <textarea name="message" rows="4" required class="login-input" placeholder="Include location, dates, observations, and constructive suggestions..."></textarea>
    </label>

    <label class="login-field"><span class="login-label">Supporting Attachment (Optional PDF / Photo)</span>
      <input type="file" name="attachment" accept=".pdf,.jpg,.jpeg,.png,.webp,.docx" class="login-input">
    </label>

    <?= renderCaptchaWidget('feedback_submit', baseUrl('captcha.php'), 'Feedback Security CAPTCHA *') ?>
    <button type="submit" class="btn-primary" style="width:100%;">Submit &amp; Route Feedback to Section</button>
  </form>

  <!-- Right Column: Live Tracker + Campus Section Routing Matrix -->
  <div style="display:flex;flex-direction:column;gap:1.1rem;">
    <div class="card">
      <h2 style="margin-top:0;color:var(--primary-color);">Track Feedback / Complaint Ticket</h2>
      <form method="get" style="display:flex;gap:0.5rem;margin-bottom:0.85rem;">
        <input type="text" name="track" required value="<?= e($trackQuery) ?>" class="login-input" placeholder="Enter Tracking Code (e.g. CFB-2026-4128)">
        <button type="submit" class="btn-secondary" style="white-space:nowrap;">Check Status</button>
      </form>

      <?php if ($trackQuery !== ''): ?>
        <?php if ($tracked): ?>
          <div style="border:1px solid var(--border-color);border-radius:10px;padding:1rem;background:var(--surface-bg);">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">
              <strong style="color:var(--primary-color);"><?= e((string)$tracked['tracking_code']) ?></strong>
              <span class="badge <?= in_array($tracked['status'], ['Resolved', 'Closed'], true) ? 'badge-ok' : 'badge-warn' ?>"><?= e((string)$tracked['status']) ?></span>
            </div>
            <h3 style="margin:0 0 0.35rem;font-size:1rem;"><?= e((string)$tracked['subject']) ?></h3>
            <div style="font-size:0.79rem;color:var(--text-muted);margin-bottom:0.5rem;">
              Section: <?= e((string)$tracked['section_name']) ?> &rarr; <?= e((string)$tracked['subsection']) ?><br>
              Type: <?= e((string)$tracked['submission_type']) ?> &middot; Rating: <?= (int)$tracked['rating'] ?>/5 &middot; Updated: <?= e((string)$tracked['updated_at']) ?>
            </div>
            <?php if (!empty($tracked['routed_to_emails'])): ?>
              <div style="font-size:0.76rem;color:#1E3A8A;margin-bottom:0.5rem;">
                Routed Email: <code><?= e((string)$tracked['routed_to_emails']) ?></code>
                (Delivery: <strong><?= e(strtoupper((string)$tracked['email_dispatch_status'])) ?></strong>)
              </div>
            <?php endif; ?>
            <?php if (!empty($tracked['action_taken_note'])): ?>
              <div style="padding:0.65rem;border-radius:8px;background:#ECFDF5;border:1px solid #A7F3D0;color:#065F46;font-size:0.84rem;">
                <strong>Action Taken / Committee Remarks:</strong><br><?= nl2br(e((string)$tracked['action_taken_note'])) ?>
              </div>
            <?php else: ?>
              <p style="margin:0;font-size:0.83rem;color:var(--text-muted);">Your ticket is queued with the Section In-Charge for review and action remarks.</p>
            <?php endif; ?>
          </div>
        <?php else: ?>
          <div class="alert-err">No feedback ticket found matching code &ldquo;<?= e($trackQuery) ?>&rdquo;.</div>
        <?php endif; ?>
      <?php endif; ?>
    </div>

    <div class="card">
      <h3 style="margin-top:0;color:var(--primary-color);">Department &amp; Section Routing Directory</h3>
      <div style="display:flex;flex-direction:column;gap:0.6rem;">
        <?php foreach ($sections as $sec): ?>
          <div style="padding:0.65rem 0.75rem;border:1px solid var(--border-color);border-radius:8px;background:var(--surface-bg);font-size:0.8rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
              <strong style="color:var(--primary-color);"><?= e((string)$sec['section_name']) ?></strong>
              <span class="badge badge-ok"><?= (int)$sec['sla_days'] ?>d SLA</span>
            </div>
            <?php if (!empty($sec['incharge_name'])): ?>
              <div style="color:#44403C;margin-top:2px;"><?= e((string)$sec['incharge_name']) ?></div>
            <?php endif; ?>
            <div style="color:var(--text-muted);font-size:0.75rem;margin-top:2px;">
              Email: <code><?= e((string)$sec['recipient_emails']) ?></code>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    </div>
  </div>
</section>

<?= renderPhpSocialShareBar($pdo, 'Stakeholder Complaint & Feedback Cell', 'Submit section-wise academic, hostel, infrastructure, or examination feedback with automatic routing.', baseUrl('feedback.php'), 'portal', true) ?>

<script>
(function () {
  var sections = <?= json_encode(array_map(static function (array $s): array {
      return [
          'id'         => (int)$s['id'],
          'name'       => (string)$s['section_name'],
          'subs'       => array_values(is_array($s['subsections'] ?? null) ? $s['subsections'] : []),
          'recipients' => (string)($s['recipient_emails'] ?? ''),
          'cc'         => (string)($s['cc_emails'] ?? ''),
          'incharge'   => (string)($s['incharge_name'] ?? ''),
          'sla'        => (int)($s['sla_days'] ?? 5),
      ];
  }, $sections), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?>;

  var secSel = document.getElementById('fb-section-select');
  var subSel = document.getElementById('fb-subsection-select');
  var emEl   = document.getElementById('fb-route-emails');
  var incEl  = document.getElementById('fb-route-incharge');
  var slaEl  = document.getElementById('fb-route-sla');
  if (!secSel || !subSel) return;

  function syncSection() {
    var id = parseInt(secSel.value, 10);
    var found = sections.find(function (s) { return s.id === id; }) || sections[0];
    if (!found) return;
    var subs = found.subs && found.subs.length ? found.subs.concat(['Other / General']) : ['General'];
    subSel.innerHTML = subs.map(function (sb) {
      return '<option value="' + sb.replace(/"/g, '&quot;') + '">' + sb.replace(/</g, '&lt;') + '</option>';
    }).join('');
    if (emEl) emEl.textContent = (found.recipients || 'Admin Inbox') + (found.cc ? ' (CC: ' + found.cc + ')' : '');
    if (incEl) incEl.textContent = 'In-Charge: ' + (found.incharge || 'Section Coordinator');
    if (slaEl) slaEl.textContent = String(found.sla || 5);
  }
  secSel.addEventListener('change', syncSection);
  syncSection();
})();
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
