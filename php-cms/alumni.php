<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/captcha.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$settings = getSiteSettings($pdo);
$alumniSettings = getAlumniSettings($pdo);
$loggedAlumni = currentAlumni();

$activeTab = $_GET['tab'] ?? 'directory';
if (!in_array($activeTab, ['directory', 'achievers', 'jobs', 'events', 'pledge', 'discussions', 'register', 'login'], true)) {
    $activeTab = 'directory';
}

$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'alumni_login') {
        $activeTab = 'login';
        $email = strtolower(trim((string)($_POST['email'] ?? '')));
        $pass = (string)($_POST['password'] ?? '');
        $captchaAns = (string)($_POST['captcha_answer'] ?? '');
        $waitMins = isPhpLoginRateLimited($pdo, normalizePhpClientIp(), 'alumni');
        if ($waitMins !== null) {
            $err = "Too many failed alumni login attempts. Try again in {$waitMins} minute(s).";
        } elseif (!verifyCaptchaAnswer($captchaAns, 'alumni_login')) {
            $err = 'Incorrect or expired security CAPTCHA code. Please try again.';
        } else {
            $st = $pdo->prepare('SELECT * FROM alumni_profiles WHERE LOWER(email) = ? LIMIT 1');
            $st->execute([$email]);
            $prof = $st->fetch();
            if (!$prof || empty($prof['password_hash']) || !password_verify($pass, $prof['password_hash'])) {
                try {
                    recordPhpLoginFailure($pdo, normalizePhpClientIp(), 'alumni', $email);
                } catch (Throwable $ignored) {
                }
                $err = 'Invalid alumni email or password.';
            } elseif (($prof['status'] ?? 'pending') !== 'approved') {
                $err = 'Your alumni account is awaiting Alumni Cell verification (' . ($prof['status'] ?? 'pending') . ').';
            } else {
                try {
                    clearPhpLoginFailures($pdo, normalizePhpClientIp(), 'alumni');
                } catch (Throwable $ignored) {
                }
                if (session_status() === PHP_SESSION_ACTIVE) {
                    @session_regenerate_id(true);
                }
                setAlumniSession($prof);
                $loggedAlumni = currentAlumni();
                $activeTab = 'discussions';
                try {
                    logPhpVisitorEvent($pdo, [
                        'method'      => 'POST',
                        'path'        => 'alumni.php?tab=login',
                        'status_code' => 200,
                        'event_type'  => 'alumni_login',
                        'severity'    => 'info',
                        'actor_email' => $prof['email'],
                        'note'        => 'Verified Alumni Member Sign-In',
                    ]);
                } catch (Throwable $ignored) {
                }
                $msg = 'Welcome back, ' . $prof['full_name'] . '! You now have access to Job Posting & Members-Only Discussions.';
            }
        }
    } elseif ($action === 'alumni_logout') {
        logoutAlumniSession();
        $loggedAlumni = null;
        $activeTab = 'directory';
        $msg = 'You have been signed out of the Alumni Member portal.';
    } elseif ($action === 'register_alumni') {
        $activeTab = 'register';
        if (empty($alumniSettings['allowSelfRegistration'])) {
            $err = 'Self-service alumni registration is currently closed by the administrator.';
        } elseif (!verifyCaptchaAnswer($_POST['captcha_answer'] ?? null, 'alumni_register')) {
            $err = 'Incorrect or expired security CAPTCHA code. Please try again.';
        } else {
            $fullName = trim((string)($_POST['full_name'] ?? ''));
            $email = strtolower(trim((string)($_POST['email'] ?? '')));
            $pw = (string)($_POST['password'] ?? '');
            $pwConfirm = (string)($_POST['confirm_password'] ?? '');
            $phone = trim((string)($_POST['phone'] ?? ''));
            $gradYear = (int)($_POST['graduation_year'] ?? 0);
            $deptCode = strtoupper(trim((string)($_POST['department_code'] ?? 'CSE')));
            $deptName = trim((string)($_POST['department_name'] ?? $deptCode));
            $degreeSel = trim((string)($_POST['degree'] ?? 'B.Tech'));
            $degreeCustom = trim((string)($_POST['degree_custom'] ?? ''));
            $degree = ($degreeSel === '__custom__' ? $degreeCustom : $degreeSel) ?: 'B.Tech';
            $company = trim((string)($_POST['current_company'] ?? ''));
            $designation = trim((string)($_POST['designation'] ?? ''));
            $location = trim((string)($_POST['location'] ?? ''));
            $chapterSel = trim((string)($_POST['chapter'] ?? 'Pandharpur Home Chapter'));
            $chapterCustom = trim((string)($_POST['chapter_custom'] ?? ''));
            $chapter = ($chapterSel === '__custom__' ? $chapterCustom : $chapterSel) ?: 'Pandharpur Home Chapter';
            $linkedin = trim((string)($_POST['linkedin_url'] ?? ''));
            $bio = trim((string)($_POST['bio'] ?? ''));
            $openToMentor = isset($_POST['open_to_mentorship']) ? 1 : 0;

            if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $gradYear < 1998 || $gradYear > 2035) {
                $err = 'Please enter a valid full name, institutional/personal email, and graduation year (1998–2035).';
            } elseif (strlen($pw) < 6) {
                $err = 'Please set an account password of at least 6 characters for Alumni Login.';
            } elseif ($pwConfirm !== '' && $pw !== $pwConfirm) {
                $err = 'Portal password and confirm password do not match.';
            } elseif (!isset($_POST['confirm_password']) || $pw !== $pwConfirm) {
                $err = 'Please confirm your alumni portal password.';
            } elseif ($linkedin !== '' && !validateExternalUrl($linkedin)) {
                $err = 'LinkedIn / portfolio link must be a valid http(s) URL.';
            } else {
                $dupStmt = $pdo->prepare('SELECT id FROM alumni_profiles WHERE LOWER(email) = ? LIMIT 1');
                $dupStmt->execute([$email]);
                if ($dupStmt->fetch()) {
                    $err = 'An alumni profile with this email already exists.';
                } else {
                    $photoUrl = 'assets/images/principal.jpg';
                    if (!empty($_FILES['photo']['name'])) {
                        $up = handleCmsUpload($pdo, $_FILES['photo'], __DIR__ . '/uploads', 'photo');
                        if (!$up['ok']) {
                            $err = $up['error'];
                        } else {
                            $photoUrl = $up['file_url'];
                        }
                    }
                    if ($err === '') {
                        $nextSort = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM alumni_profiles')->fetchColumn()) + 1;
                        $stmt = $pdo->prepare(
                            'INSERT INTO alumni_profiles (full_name, email, password_hash, phone, graduation_year, department_code, department_name, degree, current_company, designation, location, chapter, linkedin_url, photo_url, bio, open_to_mentorship, is_featured, status, sort_order, registered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,\'pending\',?,CURDATE())'
                        );
                        $stmt->execute([
                            $fullName, $email, password_hash($pw, PASSWORD_DEFAULT), $phone !== '' ? $phone : null, $gradYear, $deptCode, $deptName,
                            $degree, $company !== '' ? $company : null, $designation !== '' ? $designation : null,
                            $location !== '' ? $location : null, $chapter, $linkedin !== '' ? $linkedin : null,
                            $photoUrl, $bio !== '' ? $bio : null, $openToMentor, $nextSort,
                        ]);
                        $msg = 'Thank you! Your alumni profile has been submitted for verification. Once approved, you can sign in using your email and password under Alumni Login.';
                    }
                }
            }
        }
    } elseif ($action === 'post_job') {
        $activeTab = 'jobs';
        if (!$loggedAlumni) {
            $err = 'Please sign in as a registered alumni before posting a job or referral.';
            $activeTab = 'login';
        } elseif (empty($alumniSettings['allowPublicJobPosting'])) {
            $err = 'Alumni job posting is currently disabled by the administrator.';
        } elseif (!verifyCaptchaAnswer($_POST['captcha_answer'] ?? null, 'alumni_job')) {
            $err = 'Incorrect or expired security CAPTCHA code. Please try again.';
        } else {
            $title = trim((string)($_POST['title'] ?? ''));
            $company = trim((string)($_POST['company'] ?? ''));
            $location = trim((string)($_POST['location'] ?? ''));
            $jtSel = trim((string)($_POST['job_type'] ?? 'Full-Time'));
            $jtCustom = trim((string)($_POST['job_type_custom'] ?? ''));
            $jobType = mb_substr(($jtSel === '__custom__' ? $jtCustom : $jtSel) ?: 'Full-Time', 0, 80);
            $deptFocus = strtoupper(trim((string)($_POST['department_focus'] ?? 'ALL'))) ?: 'ALL';
            $expRange = trim((string)($_POST['experience_range'] ?? '0-2 Years')) ?: '0-2 Years';
            $comp = trim((string)($_POST['compensation'] ?? ''));
            $desc = trim((string)($_POST['description'] ?? ''));
            $applyTarget = trim((string)($_POST['apply_url_or_email'] ?? ''));
            $posterName = $loggedAlumni['full_name'];
            $posterBatch = trim((string)($loggedAlumni['graduation_year'] . ' ' . $loggedAlumni['department_code']));
            $deadline = trim((string)($_POST['deadline_date'] ?? ''));

            if ($title === '' || $company === '' || $location === '' || $desc === '' || $applyTarget === '') {
                $err = 'Please fill in job title, company, location, description, and application URL/email.';
            } else {
                $nextSort = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM alumni_jobs')->fetchColumn()) + 1;
                $stmt = $pdo->prepare(
                    'INSERT INTO alumni_jobs (title, company, location, job_type, department_focus, experience_range, compensation, description, apply_url_or_email, posted_by_alumni_name, posted_by_batch, deadline_date, status, posted_at, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),?)'
                );
                $stmt->execute([
                    $title, $company, $location, $jobType, $deptFocus, $expRange,
                    $comp !== '' ? $comp : null, $desc, $applyTarget, $posterName,
                    $posterBatch, $deadline !== '' ? $deadline : null, 'pending', $nextSort,
                ]);
                $msg = 'Opportunity submitted! It is queued for moderation and will go live on the Job Board once approved.';
            }
        }
    } elseif ($action === 'create_discussion') {
        $activeTab = 'discussions';
        if (!$loggedAlumni) {
            $err = 'Members-Only Discussion Panel requires Alumni Login.';
            $activeTab = 'login';
        } elseif (isset($alumniSettings['enableDiscussions']) && !$alumniSettings['enableDiscussions']) {
            $err = 'The Members-Only Discussion Panel is currently paused by Admin.';
        } else {
            $topicId = (int)($_POST['topic_id'] ?? 0);
            $title = trim((string)($_POST['post_title'] ?? ''));
            $summary = trim((string)($_POST['post_summary'] ?? ''));
            $content = trim((string)($_POST['post_content'] ?? ''));
            if ($topicId <= 0 || $title === '' || $content === '') {
                $err = 'Please select a topic and enter a title and article body.';
            } else {
                $status = !empty($alumniSettings['requireDiscussionApproval']) ? 'pending' : 'approved';
                $nowStr = gmdate('Y-m-d H:i');
                $batchStr = $loggedAlumni['graduation_year'] . ' ' . $loggedAlumni['department_code'];
                $pdo->prepare(
                    'INSERT INTO alumni_discussion_posts (topic_id, author_alumni_id, author_name, author_batch, author_role, title, summary, content, status, is_pinned, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)'
                )->execute([
                    $topicId, (int)$loggedAlumni['id'], $loggedAlumni['full_name'], $batchStr,
                    $loggedAlumni['chapter'], $title, $summary, $content, $status, $nowStr, $nowStr,
                ]);
                $msg = $status === 'pending'
                    ? 'Article submitted for Alumni Cell approval.'
                    : 'Your article has been published in the Members-Only Discussion Panel!';
            }
        }
    } elseif ($action === 'post_comment') {
        $activeTab = 'discussions';
        if (!$loggedAlumni) {
            $err = 'Please sign in as an alumni to reply to threads.';
            $activeTab = 'login';
        } else {
            $postId = (int)($_POST['post_id'] ?? 0);
            $body = trim((string)($_POST['comment_body'] ?? ''));
            if ($postId > 0 && $body !== '') {
                $batchStr = $loggedAlumni['graduation_year'] . ' ' . $loggedAlumni['department_code'];
                $pdo->prepare(
                    'INSERT INTO alumni_discussion_comments (post_id, author_alumni_id, author_name, author_batch, body, created_at) VALUES (?,?,?,?,?,?)'
                )->execute([
                    $postId, (int)$loggedAlumni['id'], $loggedAlumni['full_name'], $batchStr, $body, gmdate('Y-m-d H:i'),
                ]);
                $msg = 'Reply posted.';
            }
        }
    } elseif ($action === 'rsvp_event') {
        $activeTab = 'events';
        $eventId = (int)($_POST['event_id'] ?? 0);
        if ($eventId > 0) {
            $pdo->prepare('UPDATE alumni_events SET rsvp_count = rsvp_count + 1 WHERE id = ? AND is_active = 1')->execute([$eventId]);
            $msg = 'Your RSVP has been recorded! We look forward to welcoming you at the chapter meet.';
        }
    } elseif ($action === 'submit_pledge') {
        $activeTab = 'pledge';
        if (!verifyCaptchaAnswer($_POST['captcha_answer'] ?? null, 'alumni_pledge')) {
            $err = 'Incorrect or expired security CAPTCHA code. Please try again.';
        } else {
            $plName = trim((string)($_POST['full_name'] ?? ''));
            $plEmail = strtolower(trim((string)($_POST['email'] ?? '')));
            $plPhone = trim((string)($_POST['phone'] ?? ''));
            $plBatch = (int)($_POST['batch_year'] ?? 2020);
            $plDept = strtoupper(trim((string)($_POST['department_code'] ?? 'CSE'))) ?: 'CSE';
            $plTypeSel = trim((string)($_POST['pledge_type'] ?? 'Laboratory / Equipment Sponsorship'));
            $plTypeCustom = trim((string)($_POST['pledge_type_custom'] ?? ''));
            $plType = mb_substr(($plTypeSel === '__custom__' ? $plTypeCustom : $plTypeSel) ?: 'Endowment Support', 0, 160);
            $plAmount = trim((string)($_POST['amount_or_support'] ?? ''));
            $plMsg = trim((string)($_POST['message'] ?? ''));

            if ($plName === '' || !filter_var($plEmail, FILTER_VALIDATE_EMAIL) || $plBatch < 1998 || $plBatch > 2035) {
                $err = 'Please provide a valid full name, email address, and batch year (1998–2035).';
            } elseif ($plAmount === '') {
                $err = 'Please specify your pledge amount or mentorship/equipment commitment details.';
            } else {
                $pdo->prepare(
                    'INSERT INTO alumni_pledges (full_name, email, phone, batch_year, department_code, pledge_type, amount_or_support, message, status, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
                )->execute([
                    $plName, $plEmail, $plPhone !== '' ? $plPhone : null, $plBatch, $plDept,
                    $plType, mb_substr($plAmount, 0, 255), $plMsg !== '' ? $plMsg : null,
                    'pending', gmdate('Y-m-d'),
                ]);
                $msg = 'Thank you for your generous commitment! Your Give Back pledge has been recorded and forwarded to the Alumni Coordinator.';
            }
        }
    }
}

$departmentsList = $pdo->query('SELECT code, name FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();
$approvedProfiles = $pdo->query("SELECT * FROM alumni_profiles WHERE status = 'approved' ORDER BY sort_order ASC, id ASC")->fetchAll();
$openJobs = $pdo->query("SELECT * FROM alumni_jobs WHERE status = 'open' ORDER BY sort_order ASC, id DESC")->fetchAll();
$activeEvents = $pdo->query('SELECT * FROM alumni_events WHERE is_active = 1 ORDER BY sort_order ASC, event_date ASC')->fetchAll();
$achieversList = $pdo->query('SELECT * FROM alumni_achievers ORDER BY sort_order ASC, id DESC')->fetchAll();

// Filter directory
$dirQ = trim((string)($_GET['q'] ?? ''));
$dirDept = strtoupper(trim((string)($_GET['dept'] ?? 'ALL')));
$dirYear = trim((string)($_GET['year'] ?? 'ALL'));
$dirChapter = trim((string)($_GET['chapter'] ?? 'ALL'));
$dirMentors = isset($_GET['mentors']) && $_GET['mentors'] === '1';

$allYears = [];
$allChapters = [];
foreach ($approvedProfiles as $ap) {
    $allYears[(string)$ap['graduation_year']] = (int)$ap['graduation_year'];
    if (!empty($ap['chapter'])) {
        $allChapters[$ap['chapter']] = $ap['chapter'];
    }
}
rsort($allYears);
ksort($allChapters);

$filteredProfiles = array_values(array_filter($approvedProfiles, static function (array $p) use ($dirQ, $dirDept, $dirYear, $dirChapter, $dirMentors): bool {
    if ($dirMentors && empty($p['open_to_mentorship'])) return false;
    if ($dirDept !== 'ALL' && strtoupper((string)$p['department_code']) !== $dirDept) return false;
    if ($dirYear !== 'ALL' && (string)$p['graduation_year'] !== $dirYear) return false;
    if ($dirChapter !== 'ALL' && (string)$p['chapter'] !== $dirChapter) return false;
    if ($dirQ !== '') {
        $hay = strtolower(($p['full_name'] ?? '') . ' ' . ($p['current_company'] ?? '') . ' ' . ($p['designation'] ?? '') . ' ' . ($p['location'] ?? '') . ' ' . ($p['department_name'] ?? '') . ' ' . ($p['chapter'] ?? ''));
        if (!str_contains($hay, strtolower($dirQ))) return false;
    }
    return true;
}));

// Filter jobs
$jobQ = trim((string)($_GET['jq'] ?? ''));
$jobTypeFilter = trim((string)($_GET['jtype'] ?? 'ALL'));
$jobDeptFilter = strtoupper(trim((string)($_GET['jdept'] ?? 'ALL')));

$filteredJobs = array_values(array_filter($openJobs, static function (array $j) use ($jobQ, $jobTypeFilter, $jobDeptFilter): bool {
    if ($jobTypeFilter !== 'ALL' && (string)$j['job_type'] !== $jobTypeFilter) return false;
    if ($jobDeptFilter !== 'ALL' && strtoupper((string)$j['department_focus']) !== $jobDeptFilter && strtoupper((string)$j['department_focus']) !== 'ALL') return false;
    if ($jobQ !== '') {
        $hay = strtolower(($j['title'] ?? '') . ' ' . ($j['company'] ?? '') . ' ' . ($j['location'] ?? '') . ' ' . ($j['description'] ?? ''));
        if (!str_contains($hay, strtolower($jobQ))) return false;
    }
    return true;
}));

$uploadPolicy = getUploadLimits($pdo);
$pageTitle = 'Alumni Network, Jobs & Chapters — ' . ($settings['short_code'] ?? 'SVCOER');
require_once __DIR__ . '/includes/header.php';
?>
<script>
  window.SVCOER_UPLOAD_POLICY = <?= json_encode([
      'maxPhotoMb' => (float)$uploadPolicy['max_photo_mb'],
      'maxDocMb'   => (float)$uploadPolicy['max_doc_mb'],
      'autoCrop'   => !empty($uploadPolicy['auto_crop_enabled']),
  ], JSON_UNESCAPED_SLASHES) ?>;
</script>

<section class="alumni-hero">
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1rem;">
    <div style="max-width:760px;">
      <p style="margin:0 0 0.35rem;font-size:0.74rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FCD34D;">
        UGC Section 5(g) · Reg. No. <?= e($alumniSettings['associationRegNo']) ?>
      </p>
      <h1 style="margin:0 0 0.5rem;font-family:'Playfair Display',serif;font-size:clamp(1.6rem,3vw,2.25rem);color:#fff;">
        <?= e($alumniSettings['heroTitle']) ?>
      </h1>
      <p style="margin:0;color:#E2E8F0;font-size:0.94rem;line-height:1.55;">
        <?= e($alumniSettings['heroSubtitle']) ?>
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:0.55rem;margin-top:0.95rem;">
        <?php if ($loggedAlumni): ?>
          <a href="?tab=discussions" class="btn-primary" style="background:#D97706;border-color:#D97706;">Open Member Discussions &rarr;</a>
        <?php else: ?>
          <a href="?tab=login" class="btn-primary" style="background:#D97706;border-color:#D97706;">Alumni Member Sign In &rarr;</a>
        <?php endif; ?>
        <a href="?tab=register" class="btn-outline" style="background:rgba(255,255,255,0.12);color:#fff;border-color:rgba(255,255,255,0.35);">Register as Alumni</a>
        <a href="?tab=jobs" class="btn-outline" style="background:rgba(255,255,255,0.08);color:#fff;border-color:rgba(255,255,255,0.28);">Explore Jobs &amp; Referrals (<?= count($openJobs) ?>)</a>
      </div>
    </div>
    <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);border-radius:10px;padding:0.85rem 1.1rem;font-size:0.82rem;min-width:220px;">
      <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.07em;color:#FDE68A;font-weight:700;">Alumni Cell Coordinator</div>
      <div style="font-weight:700;margin-top:0.2rem;"><?= e($alumniSettings['coordinatorName']) ?></div>
      <div style="color:#E2E8F0;"><?= e($alumniSettings['coordinatorEmail']) ?></div>
    </div>
  </div>
</section>

<div class="kpi-strip" style="margin-top:1rem;">
  <div class="kpi-cell">
    <div class="kpi-value"><?= count($approvedProfiles) ?></div>
    <div class="kpi-label">Verified Profiles</div>
  </div>
  <div class="kpi-cell">
    <div class="kpi-value"><?= count(array_filter($approvedProfiles, static fn($p) => !empty($p['open_to_mentorship']))) ?></div>
    <div class="kpi-label">Active Mentors</div>
  </div>
  <div class="kpi-cell">
    <div class="kpi-value"><?= count($openJobs) ?></div>
    <div class="kpi-label">Open Job Referrals</div>
  </div>
  <div class="kpi-cell">
    <div class="kpi-value"><?= count($activeEvents) ?></div>
    <div class="kpi-label">Upcoming Meets</div>
  </div>
</div>

<?php if ($msg): ?><div class="alert-ok" style="margin-top:1rem;"><?= e($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert-err" style="margin-top:1rem;"><?= e($err) ?></div><?php endif; ?>

<?php if ($loggedAlumni): ?>
  <div class="alert-ok" style="margin-top:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
    <span>Signed in as <strong><?= e($loggedAlumni['full_name']) ?></strong> (<?= (int)$loggedAlumni['graduation_year'] ?> <?= e($loggedAlumni['department_code']) ?>)</span>
    <form method="post" style="display:inline;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="alumni_logout">
      <button type="submit" class="btn-outline btn-sm">Sign Out</button>
    </form>
  </div>
<?php endif; ?>

<nav class="alumni-tabbar" aria-label="Alumni Portal Sections">
  <a href="?tab=directory" class="alumni-tabbtn <?= $activeTab === 'directory' ? 'is-active' : '' ?>">Alumni Directory (<?= count($approvedProfiles) ?>)</a>
  <a href="?tab=achievers" class="alumni-tabbtn <?= $activeTab === 'achievers' ? 'is-active' : '' ?>">Distinguished Achievers (<?= count($achieversList) ?>)</a>
  <a href="?tab=jobs" class="alumni-tabbtn <?= $activeTab === 'jobs' ? 'is-active' : '' ?>">Jobs &amp; Internships (<?= count($openJobs) ?>)</a>
  <a href="?tab=events" class="alumni-tabbtn <?= $activeTab === 'events' ? 'is-active' : '' ?>">Chapters &amp; Reunions (<?= count($activeEvents) ?>)</a>
  <a href="?tab=pledge" class="alumni-tabbtn <?= $activeTab === 'pledge' ? 'is-active' : '' ?>">Give Back / Endowment</a>
  <a href="?tab=discussions" class="alumni-tabbtn <?= $activeTab === 'discussions' ? 'is-active' : '' ?>">Discussions (Members Only)</a>
  <a href="?tab=register" class="alumni-tabbtn <?= $activeTab === 'register' ? 'is-active' : '' ?>">Alumni Registration</a>
  <?php if (!$loggedAlumni): ?>
    <a href="?tab=login" class="alumni-tabbtn <?= $activeTab === 'login' ? 'is-active' : '' ?>">Alumni Login</a>
  <?php endif; ?>
</nav>

<?php if ($activeTab === 'directory'): ?>
  <form method="get" class="card" style="margin-bottom:1.25rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:0.75rem;align-items:end;">
    <input type="hidden" name="tab" value="directory">
    <label style="font-size:0.8rem;font-weight:600;">Search Alumni
      <input type="search" name="q" value="<?= e($dirQ) ?>" placeholder="Name, company, city..." style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
    </label>
    <label style="font-size:0.8rem;font-weight:600;">Department
      <select name="dept" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        <option value="ALL">All Departments</option>
        <?php foreach ($departmentsList as $dl): ?>
          <option value="<?= e($dl['code']) ?>" <?= $dirDept === strtoupper($dl['code']) ? 'selected' : '' ?>><?= e($dl['code']) ?> — <?= e($dl['name']) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label style="font-size:0.8rem;font-weight:600;">Batch Year
      <select name="year" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        <option value="ALL">All Batches</option>
        <?php foreach ($allYears as $yr): ?>
          <option value="<?= $yr ?>" <?= $dirYear === (string)$yr ? 'selected' : '' ?>>Class of <?= $yr ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label style="font-size:0.8rem;font-weight:600;">Chapter
      <select name="chapter" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        <option value="ALL">All Chapters</option>
        <?php foreach ($allChapters as $ch): ?>
          <option value="<?= e($ch) ?>" <?= $dirChapter === $ch ? 'selected' : '' ?>><?= e($ch) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label style="font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:0.45rem;padding-bottom:0.45rem;">
      <input type="checkbox" name="mentors" value="1" <?= $dirMentors ? 'checked' : '' ?>> Mentors Only
    </label>
    <div style="display:flex;gap:0.45rem;">
      <button type="submit" class="btn-primary">Filter Directory</button>
      <a href="?tab=directory" class="btn-outline">Reset</a>
    </div>
  </form>

  <div class="grid-3">
    <?php foreach ($filteredProfiles as $p): ?>
      <article class="alumni-card">
        <div>
          <div style="display:flex;gap:0.85rem;align-items:center;margin-bottom:0.75rem;">
            <img src="<?= e(mediaUrl($p['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="<?= e($p['full_name']) ?>" style="width:64px;height:64px;border-radius:12px;object-fit:cover;border:1px solid var(--border-color);flex-shrink:0;">
            <div style="min-width:0;">
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">
                <span class="alumni-pill"><?= e($p['department_code']) ?> · <?= (int)$p['graduation_year'] ?></span>
                <?php if (!empty($p['open_to_mentorship'])): ?><span class="badge badge-ok">Mentor</span><?php endif; ?>
                <?php if (!empty($p['is_featured'])): ?><span class="badge badge-warn">Featured</span><?php endif; ?>
              </div>
              <h3 style="margin:0;font-size:1.02rem;"><?= e($p['full_name']) ?></h3>
              <small style="color:var(--secondary-color);font-weight:600;display:block;"><?= e($p['designation'] ?: $p['degree']) ?><?= !empty($p['current_company']) ? ' · ' . e($p['current_company']) : '' ?></small>
            </div>
          </div>
          <?php if (!empty($p['bio'])): ?>
            <p style="font-size:0.84rem;color:var(--text-muted);margin:0 0 0.65rem;line-height:1.5;"><?= e($p['bio']) ?></p>
          <?php endif; ?>
        </div>
        <div style="border-top:1px solid var(--border-color);padding-top:0.6rem;display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;color:var(--text-muted);gap:0.5rem;">
          <span><?= e($p['chapter']) ?><?= !empty($p['location']) ? ' · ' . e($p['location']) : '' ?></span>
          <?php if (!empty($p['linkedin_url'])): ?>
            <a href="<?= e($p['linkedin_url']) ?>" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:var(--primary-color);text-decoration:none;">Connect &nearr;</a>
          <?php endif; ?>
        </div>
      </article>
    <?php endforeach; ?>
    <?php if (empty($filteredProfiles)): ?>
      <div class="card" style="grid-column:1/-1;text-align:center;color:var(--text-muted);">No verified alumni profiles match the selected filters.</div>
    <?php endif; ?>
  </div>

<?php elseif ($activeTab === 'jobs'): ?>
  <form method="get" class="card" style="margin-bottom:1.25rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.75rem;align-items:end;">
    <input type="hidden" name="tab" value="jobs">
    <label style="font-size:0.8rem;font-weight:600;">Search Opportunities
      <input type="search" name="jq" value="<?= e($jobQ) ?>" placeholder="Role, company, skill..." style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
    </label>
    <label style="font-size:0.8rem;font-weight:600;">Type
      <select name="jtype" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        <option value="ALL">All Opportunity Types</option>
        <?php foreach (alumniJobTypePresets() as $jt): ?>
          <option value="<?= e($jt) ?>" <?= $jobTypeFilter === $jt ? 'selected' : '' ?>><?= e($jt) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <label style="font-size:0.8rem;font-weight:600;">Department Focus
      <select name="jdept" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        <option value="ALL">All Departments</option>
        <?php foreach ($departmentsList as $dl): ?>
          <option value="<?= e($dl['code']) ?>" <?= $jobDeptFilter === strtoupper($dl['code']) ? 'selected' : '' ?>><?= e($dl['code']) ?></option>
        <?php endforeach; ?>
      </select>
    </label>
    <div style="display:flex;gap:0.45rem;">
      <button type="submit" class="btn-primary">Filter Jobs</button>
      <a href="?tab=jobs" class="btn-outline">Reset</a>
    </div>
  </form>

  <div class="grid-2" style="margin-bottom:1.75rem;">
    <?php foreach ($filteredJobs as $j):
      $applyRaw = trim((string)$j['apply_url_or_email']);
      $isMail = str_contains($applyRaw, '@') && !str_starts_with(strtolower($applyRaw), 'http') && !str_starts_with(strtolower($applyRaw), 'mailto:');
      $applyHref = $isMail ? ('mailto:' . $applyRaw) : $applyRaw;
    ?>
      <article class="alumni-card">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">
            <span class="alumni-pill"><?= e($j['job_type']) ?> · <?= e($j['department_focus']) ?></span>
            <?php if (!empty($j['compensation'])): ?><strong style="font-size:0.82rem;color:#047857;"><?= e($j['compensation']) ?></strong><?php endif; ?>
          </div>
          <h3 style="margin:0 0 0.2rem;font-size:1.08rem;"><?= e($j['title']) ?></h3>
          <div style="font-size:0.84rem;font-weight:600;color:var(--secondary-color);margin-bottom:0.5rem;">
            <?= e($j['company']) ?> · <?= e($j['location']) ?> · Exp: <?= e($j['experience_range']) ?>
          </div>
          <p style="font-size:0.86rem;color:var(--text-muted);margin:0 0 0.75rem;line-height:1.55;"><?= e($j['description']) ?></p>
        </div>
        <div style="border-top:1px solid var(--border-color);padding-top:0.65rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
          <small style="color:var(--text-muted);">Posted by <?= e($j['posted_by_alumni_name']) ?> (<?= e($j['posted_by_batch']) ?>)<?= !empty($j['deadline_date']) ? ' · Apply by ' . e($j['deadline_date']) : '' ?></small>
          <a href="<?= e($applyHref) ?>" target="_blank" rel="noopener noreferrer" class="btn-primary btn-sm">Apply / Refer &nearr;</a>
        </div>
      </article>
    <?php endforeach; ?>
    <?php if (empty($filteredJobs)): ?>
      <div class="card" style="grid-column:1/-1;text-align:center;color:var(--text-muted);">No open alumni job postings match your filter.</div>
    <?php endif; ?>
  </div>

  <?php if (!empty($alumniSettings['allowPublicJobPosting'])): ?>
    <?php if (!$loggedAlumni): ?>
      <div class="card" style="border:1px solid #FDE68A;background:#FFFBEB;">
        <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Alumni Sign-In Required to Post Jobs or Referrals</h2>
        <p style="font-size:0.86rem;color:#78350F;margin-bottom:0.85rem;">To prevent spam, direct anonymous job submissions are disabled. Please sign in with your verified alumni account to publish job openings or referrals.</p>
        <a href="?tab=login" class="btn-primary">Sign In to Alumni Portal &rarr;</a>
      </div>
    <?php else: ?>
      <form method="post" class="card">
        <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Post an Alumni Job / Internship Referral</h2>
        <p style="font-size:0.84rem;color:var(--text-muted);margin-top:0;">Posting as <strong><?= e($loggedAlumni['full_name']) ?></strong> (<?= (int)$loggedAlumni['graduation_year'] ?> <?= e($loggedAlumni['department_code']) ?>). Submissions undergo Alumni Cell moderation.</p>
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="post_job">
        <div class="grid-3" style="margin-bottom:0.75rem;">
          <label style="font-size:0.8rem;font-weight:600;">Job / Internship Title *<input type="text" name="title" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Company / Organization *<input type="text" name="company" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Location *<input type="text" name="location" required placeholder="Pune / Hybrid" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Opportunity Type
            <select name="job_type" onchange="var c=this.parentNode.querySelector('.custom-opt-inp');if(c){c.style.display=this.value==='__custom__'?'block':'none';c.required=this.value==='__custom__';}" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
              <?php foreach (alumniJobTypePresets() as $jtOpt): ?>
                <option value="<?= e($jtOpt) ?>"><?= e($jtOpt) ?></option>
              <?php endforeach; ?>
              <option value="__custom__">+ Custom Opportunity Type...</option>
            </select>
            <input type="text" name="job_type_custom" class="custom-opt-inp" placeholder="Enter custom opportunity type..." style="display:none;width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Department Focus
            <select name="department_focus" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
              <option value="ALL">All Engineering Branches</option>
              <?php foreach ($departmentsList as $dl): ?><option value="<?= e($dl['code']) ?>"><?= e($dl['code']) ?> — <?= e($dl['name']) ?></option><?php endforeach; ?>
            </select>
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Experience / Batch Eligibility<input type="text" name="experience_range" value="0-2 Years" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Compensation / Stipend<input type="text" name="compensation" placeholder="e.g. Rs. 7.5 LPA" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Application Link or HR Email *<input type="text" name="apply_url_or_email" required placeholder="https://... or hr@company.com" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Application Deadline<input type="date" name="deadline_date" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
        </div>
        <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.85rem;">Role Description &amp; Referral Instructions *
          <textarea name="description" rows="3" required style="width:100%;padding:0.55rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></textarea>
        </label>
        <?= renderCaptchaWidget('alumni_job', baseUrl('captcha.php'), 'Security CAPTCHA Verification *') ?>
        <button type="submit" class="btn-primary">Submit Opportunity for Moderation</button>
      </form>
    <?php endif; ?>
  <?php endif; ?>

<?php elseif ($activeTab === 'events'): ?>
  <div class="grid-3">
    <?php foreach ($activeEvents as $ev): ?>
      <article class="alumni-card" style="padding:0;overflow:hidden;">
        <img src="<?= e(mediaUrl($ev['banner_url'] ?? '', 'assets/images/convocation.jpg')) ?>" alt="<?= e($ev['title']) ?>" style="width:100%;height:175px;object-fit:cover;display:block;">
        <div style="padding:1.15rem;flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:0.75rem;">
          <div>
            <span class="alumni-pill"><?= e($ev['chapter']) ?> · <?= e($ev['event_date']) ?></span>
            <h3 style="margin:0.5rem 0 0.25rem;"><?= e($ev['title']) ?></h3>
            <div style="font-size:0.8rem;color:var(--secondary-color);font-weight:600;margin-bottom:0.45rem;"><?= e($ev['venue']) ?></div>
            <p style="font-size:0.84rem;color:var(--text-muted);margin:0;"><?= e($ev['description']) ?></p>
          </div>
          <div style="border-top:1px solid var(--border-color);padding-top:0.65rem;display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
            <strong style="font-size:0.82rem;color:var(--primary-color);"><?= (int)$ev['rsvp_count'] ?> RSVPs</strong>
            <form method="post" style="display:inline;">
              <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="action" value="rsvp_event">
              <input type="hidden" name="event_id" value="<?= (int)$ev['id'] ?>">
              <button type="submit" class="btn-primary btn-sm">RSVP Attending</button>
            </form>
          </div>
        </div>
      </article>
    <?php endforeach; ?>
    <?php if (empty($activeEvents)): ?>
      <div class="card" style="grid-column:1/-1;text-align:center;color:var(--text-muted);">No upcoming alumni chapter meets published right now.</div>
    <?php endif; ?>
  </div>

<?php elseif ($activeTab === 'achievers'): ?>
  <div class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin:0 0 0.25rem;font-family:'Playfair Display',serif;">Distinguished Alumni Achievers &amp; Hall of Pride</h2>
    <p style="margin:0;font-size:0.86rem;color:var(--text-muted);">Recognizing outstanding engineering graduates leading technology, research, public service, and entrepreneurship worldwide.</p>
  </div>
  <div class="grid-2">
    <?php foreach ($achieversList as $ach): ?>
      <article class="alumni-card">
        <div style="display:flex;gap:1rem;align-items:flex-start;">
          <img src="<?= e(mediaUrl($ach['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="<?= e($ach['full_name']) ?>" style="width:78px;height:78px;border-radius:12px;object-fit:cover;border:1px solid var(--border-color);flex-shrink:0;">
          <div style="min-width:0;flex:1;">
            <span class="badge badge-warn" style="margin-bottom:0.35rem;display:inline-block;"><?= e($ach['award_title']) ?></span>
            <h3 style="margin:0 0 0.2rem;font-size:1.05rem;"><?= e($ach['full_name']) ?></h3>
            <div style="font-size:0.84rem;font-weight:600;color:var(--secondary-color);"><?= e($ach['designation'] ?: '') ?><?= !empty($ach['organization']) ? ' · ' . e($ach['organization']) : '' ?></div>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">Class of <?= (int)$ach['batch_year'] ?> · <?= e($ach['department_code']) ?></div>
            <?php if (!empty($ach['citation'])): ?>
              <p style="font-size:0.84rem;color:var(--text-muted);margin:0.5rem 0 0;line-height:1.5;"><?= e($ach['citation']) ?></p>
            <?php endif; ?>
            <?php if (!empty($ach['linkedin_url'])): ?>
              <div style="margin-top:0.55rem;"><a href="<?= e($ach['linkedin_url']) ?>" target="_blank" rel="noopener noreferrer" style="font-size:0.78rem;font-weight:700;color:var(--primary-color);text-decoration:none;">LinkedIn Profile &nearr;</a></div>
            <?php endif; ?>
          </div>
        </div>
      </article>
    <?php endforeach; ?>
    <?php if (empty($achieversList)): ?>
      <div class="card" style="grid-column:1/-1;text-align:center;color:var(--text-muted);">No distinguished alumni achievers published yet.</div>
    <?php endif; ?>
  </div>

<?php elseif ($activeTab === 'pledge'): ?>
  <div class="card" style="max-width:780px;margin:0 auto;">
    <h2 style="margin:0 0 0.25rem;font-family:'Playfair Display',serif;">Give Back: Endowment, Lab Equipment &amp; Scholarship Pledge</h2>
    <p style="margin:0 0 1rem;font-size:0.86rem;color:var(--text-muted);">Support departmental Centres of Excellence, student merit scholarships, industrial visits, library grants, and guest expert lectures.</p>
    <form method="post">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="submit_pledge">
      <div class="grid-2" style="margin-bottom:0.75rem;">
        <label style="font-size:0.8rem;font-weight:600;">Alumni Full Name *
          <input type="text" name="full_name" required value="<?= e($_POST['full_name'] ?? ($loggedAlumni['full_name'] ?? '')) ?>" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Email Address *
          <input type="email" name="email" required value="<?= e($_POST['email'] ?? ($loggedAlumni['email'] ?? '')) ?>" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Phone / WhatsApp
          <input type="text" name="phone" value="<?= e($_POST['phone'] ?? ($loggedAlumni['phone'] ?? '')) ?>" placeholder="+91-98..." style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        </label>
        <div class="grid-2">
          <label style="font-size:0.8rem;font-weight:600;">Batch Year
            <input type="number" name="batch_year" min="1998" max="2035" required value="<?= (int)($_POST['batch_year'] ?? ($loggedAlumni['graduation_year'] ?? 2018)) ?>" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Department
            <select name="department_code" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
              <?php foreach ($departmentsList as $dl): ?>
                <option value="<?= e($dl['code']) ?>" <?= ($loggedAlumni['department_code'] ?? '') === $dl['code'] ? 'selected' : '' ?>><?= e($dl['code']) ?></option>
              <?php endforeach; ?>
            </select>
          </label>
        </div>
      </div>
      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.75rem;">Contribution / Support Area *
        <select name="pledge_type" onchange="var c=this.parentNode.querySelector('.custom-opt-inp');if(c){c.style.display=this.value==='__custom__'?'block':'none';c.required=this.value==='__custom__';}" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
          <?php foreach (alumniPledgeTypePresets() as $pt): ?>
            <option value="<?= e($pt) ?>"><?= e($pt) ?></option>
          <?php endforeach; ?>
          <option value="__custom__">+ Custom Contribution / Mentorship Area...</option>
        </select>
        <input type="text" name="pledge_type_custom" class="custom-opt-inp" placeholder="Enter custom contribution or mentorship pledge..." style="display:none;width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
      </label>
      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.75rem;">Pledge Amount / Commitment Details *
        <input type="text" name="amount_or_support" required value="<?= e($_POST['amount_or_support'] ?? '') ?>" placeholder="e.g. Rs. 50,000 Scholarship Fund / 2 IoT Kits / 3 Guest Lectures" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
      </label>
      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.85rem;">Message / Department Note
        <textarea name="message" rows="2" style="width:100%;padding:0.55rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"><?= e($_POST['message'] ?? '') ?></textarea>
      </label>
      <?= renderCaptchaWidget('alumni_pledge', baseUrl('captcha.php'), 'Endowment Pledge CAPTCHA *') ?>
      <button type="submit" class="btn-primary">Submit Endowment / Mentorship Pledge</button>
    </form>
  </div>

<?php elseif ($activeTab === 'discussions'): ?>
  <?php if (!$loggedAlumni): ?>
    <div class="card" style="max-width:640px;margin:0 auto;text-align:center;padding:2rem;">
      <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Members-Only Alumni Discussion Panel</h2>
      <p style="font-size:0.9rem;color:var(--text-muted);">Topic blogs, technical career guides, and peer discussions are private to signed-in alumni members and are never exposed publicly.</p>
      <div style="display:flex;justify-content:center;gap:0.65rem;flex-wrap:wrap;margin-top:1rem;">
        <a href="?tab=login" class="btn-primary">Sign In as Alumni &rarr;</a>
        <a href="?tab=register" class="btn-outline">Register for Membership</a>
      </div>
    </div>
  <?php elseif (isset($alumniSettings['enableDiscussions']) && !$alumniSettings['enableDiscussions']): ?>
    <div class="card">The Members-Only Discussion Panel is currently paused by the administrator.</div>
  <?php else:
    $topics = $pdo->query('SELECT * FROM alumni_discussion_topics WHERE is_active = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
    $topicFilterId = isset($_GET['topic']) ? (int)$_GET['topic'] : 0;
    $discQ = trim((string)($_GET['dq'] ?? ''));
    $postSql = "SELECT * FROM alumni_discussion_posts WHERE status = 'approved'";
    $postParams = [];
    if ($topicFilterId > 0) {
        $postSql .= ' AND topic_id = ?';
        $postParams[] = $topicFilterId;
    }
    if ($discQ !== '') {
        $postSql .= ' AND (title LIKE ? OR content LIKE ? OR author_name LIKE ?)';
        $likeDq = '%' . $discQ . '%';
        $postParams[] = $likeDq;
        $postParams[] = $likeDq;
        $postParams[] = $likeDq;
    }
    $postSql .= ' ORDER BY is_pinned DESC, id DESC';
    $stPosts = $pdo->prepare($postSql);
    $stPosts->execute($postParams);
    $visiblePosts = $stPosts->fetchAll();
    $allComs = $pdo->query('SELECT * FROM alumni_discussion_comments ORDER BY id ASC')->fetchAll();
    $comMap = [];
    foreach ($allComs as $cRow) {
        $comMap[(int)$cRow['post_id']][] = $cRow;
    }
    $topicTitleMap = [];
    foreach ($topics as $tRow) {
        $topicTitleMap[(int)$tRow['id']] = $tRow['title'];
    }
  ?>
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.65rem;margin-bottom:1.15rem;">
      <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
        <a href="?tab=discussions" class="alumni-tabbtn <?= $topicFilterId === 0 ? 'is-active' : '' ?>" style="padding:0.38rem 0.75rem;font-size:0.78rem;">All Topics</a>
        <?php foreach ($topics as $tp): ?>
          <a href="?tab=discussions&topic=<?= (int)$tp['id'] ?>" class="alumni-tabbtn <?= $topicFilterId === (int)$tp['id'] ? 'is-active' : '' ?>" style="padding:0.38rem 0.75rem;font-size:0.78rem;"><?= e($tp['title']) ?></a>
        <?php endforeach; ?>
      </div>
      <form method="get" style="display:flex;gap:0.4rem;align-items:center;">
        <input type="hidden" name="tab" value="discussions">
        <?php if ($topicFilterId > 0): ?><input type="hidden" name="topic" value="<?= $topicFilterId ?>"><?php endif; ?>
        <input type="search" name="dq" value="<?= e($discQ) ?>" placeholder="Search member threads..." style="padding:0.4rem 0.65rem;border:1px solid var(--border-color);border-radius:7px;font-size:0.82rem;min-width:190px;">
        <button type="submit" class="btn-outline btn-sm">Search</button>
      </form>
    </div>

    <div class="grid-2" style="align-items:start;">
      <div style="display:grid;gap:1rem;">
        <?php foreach ($visiblePosts as $vp):
          $pComments = $comMap[(int)$vp['id']] ?? [];
        ?>
          <article class="card">
            <div style="display:flex;gap:0.45rem;flex-wrap:wrap;margin-bottom:0.45rem;">
              <?php if (!empty($vp['is_pinned'])): ?><span class="badge badge-warn">Pinned</span><?php endif; ?>
              <span class="alumni-pill"><?= e($topicTitleMap[(int)$vp['topic_id']] ?? 'General Topic') ?></span>
            </div>
            <h3 style="margin:0 0 0.3rem;font-family:'Playfair Display',serif;"><?= e($vp['title']) ?></h3>
            <div style="font-size:0.78rem;color:#57534E;margin-bottom:0.65rem;">
              <strong><?= e($vp['author_name']) ?></strong> · <?= e($vp['author_batch']) ?> · <?= e($vp['created_at']) ?>
            </div>
            <?php if (!empty($vp['summary'])): ?>
              <p style="font-size:0.86rem;font-style:italic;color:var(--secondary-color);margin:0 0 0.5rem;"><?= e($vp['summary']) ?></p>
            <?php endif; ?>
            <div style="font-size:0.88rem;line-height:1.65;white-space:pre-line;margin-bottom:0.85rem;"><?= e($vp['content']) ?></div>
            <div style="border-top:1px solid var(--border-color);padding-top:0.75rem;">
              <strong style="font-size:0.78rem;">Alumni Replies (<?= count($pComments) ?>)</strong>
              <div style="display:grid;gap:0.45rem;margin:0.5rem 0 0.75rem;">
                <?php foreach ($pComments as $cm): ?>
                  <div style="background:#FAF9F6;border:1px solid var(--border-color);border-radius:8px;padding:0.55rem 0.75rem;font-size:0.82rem;">
                    <strong><?= e($cm['author_name']) ?></strong> <small style="color:#78716C;">(<?= e($cm['author_batch']) ?> · <?= e($cm['created_at']) ?>)</small>
                    <div style="margin-top:2px;"><?= e($cm['body']) ?></div>
                  </div>
                <?php endforeach; ?>
              </div>
              <form method="post" style="display:flex;gap:0.45rem;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="post_comment">
                <input type="hidden" name="post_id" value="<?= (int)$vp['id'] ?>">
                <input type="text" name="comment_body" required placeholder="Write a helpful reply..." style="flex:1;padding:0.45rem 0.65rem;border:1px solid var(--border-color);border-radius:7px;">
                <button type="submit" class="btn-primary btn-sm">Reply</button>
              </form>
            </div>
          </article>
        <?php endforeach; ?>
        <?php if (empty($visiblePosts)): ?>
          <div class="card" style="color:var(--text-muted);">No articles in this topic yet. Start the conversation on the right!</div>
        <?php endif; ?>
      </div>

      <form method="post" class="card">
        <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Write a Discussion / Blog Post</h2>
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="create_discussion">
        <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.65rem;">Topic *
          <select name="topic_id" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
            <?php foreach ($topics as $tp): ?>
              <option value="<?= (int)$tp['id'] ?>"><?= e($tp['title']) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.65rem;">Article Headline *
          <input type="text" name="post_title" required placeholder="e.g., How to Prepare for Cloud Architect Interviews" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        </label>
        <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.65rem;">Short Summary (Optional)
          <input type="text" name="post_summary" placeholder="One-line takeaway for alumni readers" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
        </label>
        <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.85rem;">Article Body *
          <textarea name="post_content" rows="5" required placeholder="Share experiences, technical notes, mentorship advice..." style="width:100%;padding:0.55rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></textarea>
        </label>
        <button type="submit" class="btn-primary">Publish to Members Panel</button>
      </form>
    </div>
  <?php endif; ?>

<?php elseif ($activeTab === 'login'): ?>
  <div class="card" style="max-width:480px;">
    <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Alumni Member Sign In</h2>
    <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0;">Sign in with your approved alumni credentials to post job referrals and access the Members-Only Discussion Panel.</p>
    <form method="post">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="alumni_login">
      <label class="login-field">
        <span class="login-label">Registered Alumni Email *</span>
        <input class="login-input" type="email" name="email" required value="<?= e($_POST['email'] ?? '') ?>" placeholder="rohan.deshmukh@alumni.svcoer.edu.in">
      </label>
      <label class="login-field">
        <span class="login-label">Password *</span>
        <input class="login-input" type="password" name="password" required placeholder="••••••••">
      </label>
      <?= renderCaptchaWidget('alumni_login', baseUrl('captcha.php'), 'Security CAPTCHA Verification *') ?>
      <button type="submit" class="login-submit">Sign In to Alumni Portal</button>
    </form>
    <p style="font-size:0.76rem;color:#78716C;margin:0.85rem 0 0;">
      Demo Approved Alumni: <code>rohan.deshmukh@alumni.svcoer.edu.in</code> / <code>Alumni@123</code>
    </p>
  </div>

<?php else: ?>
  <div class="card" style="max-width:860px;">
    <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Alumni Association Membership &amp; Directory Registration</h2>
    <?php if (empty($alumniSettings['allowSelfRegistration'])): ?>
      <div class="alert-err">Self-service alumni registration is currently paused. Contact <?= e($alumniSettings['coordinatorEmail']) ?>.</div>
    <?php else: ?>
      <p style="font-size:0.86rem;color:var(--text-muted);margin-top:0;">Register to join the verified SVERI Alumni Directory and create your login credentials for Job Posting &amp; Members-Only Discussions.</p>
      <form method="post" enctype="multipart/form-data">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="register_alumni">
        <div class="grid-3" style="margin-bottom:0.75rem;">
          <label style="font-size:0.8rem;font-weight:600;">Full Name *<input type="text" name="full_name" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Email Address *<input type="email" name="email" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Portal Password (Min 6 chars) *<input type="password" name="password" required minlength="6" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Confirm Password *<input type="password" name="confirm_password" required minlength="6" placeholder="Re-enter password" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Mobile / Phone<input type="text" name="phone" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Graduation Year *<input type="number" name="graduation_year" min="1998" max="2035" value="2020" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Department *
            <select name="department_code" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
              <?php foreach ($departmentsList as $dl): ?><option value="<?= e($dl['code']) ?>"><?= e($dl['code']) ?> — <?= e($dl['name']) ?></option><?php endforeach; ?>
            </select>
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Degree Program
            <select name="degree" onchange="var c=this.parentNode.querySelector('.custom-opt-inp');if(c){c.style.display=this.value==='__custom__'?'block':'none';c.required=this.value==='__custom__';}" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
              <?php foreach (alumniDegreePresets() as $degOpt): ?><option value="<?= e($degOpt) ?>"><?= e($degOpt) ?></option><?php endforeach; ?>
              <option value="__custom__">+ Custom Degree...</option>
            </select>
            <input type="text" name="degree_custom" class="custom-opt-inp" placeholder="Enter custom degree..." style="display:none;width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Current Company / Organization *<input type="text" name="current_company" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Current Role / Designation *<input type="text" name="designation" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">City &amp; Country<input type="text" name="location" placeholder="Pune, India" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Preferred Alumni Chapter
            <select name="chapter" onchange="var c=this.parentNode.querySelector('.custom-opt-inp');if(c){c.style.display=this.value==='__custom__'?'block':'none';c.required=this.value==='__custom__';}" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
              <?php foreach (alumniChapterPresets() as $chOpt): ?><option value="<?= e($chOpt) ?>" <?= $chOpt === 'Pune Chapter' ? 'selected' : '' ?>><?= e($chOpt) ?></option><?php endforeach; ?>
              <option value="__custom__">+ Custom City / Global Chapter...</option>
            </select>
            <input type="text" name="chapter_custom" class="custom-opt-inp" placeholder="Enter custom city / global chapter..." style="display:none;width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">LinkedIn / Website URL<input type="url" name="linkedin_url" placeholder="https://linkedin.com/in/..." style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Profile Photo (1:1 Auto-Crop)
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" data-aspect="1:1" style="display:block;margin-top:4px;">
          </label>
        </div>
        <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.75rem;">Short Bio / Career Highlights
          <textarea name="bio" rows="3" style="width:100%;padding:0.55rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></textarea>
        </label>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.86rem;font-weight:600;margin-bottom:0.85rem;">
          <input type="checkbox" name="open_to_mentorship" value="1"> Willing to mentor current students &amp; provide career guidance
        </label>
        <?= renderCaptchaWidget('alumni_register', baseUrl('captcha.php'), 'Security CAPTCHA Verification *') ?>
        <button type="submit" class="btn-primary">Submit Alumni Registration</button>
      </form>
    <?php endif; ?>
  </div>
<?php endif; ?>

<script src="<?= e(assetUrl('assets/js/upload_guard.js')) ?>"></script>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
