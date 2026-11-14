<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$settings = getSiteSettings($pdo);
$alumniSettings = getAlumniSettings($pdo);

$activeTab = $_GET['tab'] ?? 'directory';
if (!in_array($activeTab, ['directory', 'jobs', 'events', 'register'], true)) {
    $activeTab = 'directory';
}

$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'register_alumni') {
        $activeTab = 'register';
        if (empty($alumniSettings['allowSelfRegistration'])) {
            $err = 'Self-service alumni registration is currently closed by the administrator.';
        } else {
            $fullName = trim((string)($_POST['full_name'] ?? ''));
            $email = trim((string)($_POST['email'] ?? ''));
            $phone = trim((string)($_POST['phone'] ?? ''));
            $gradYear = (int)($_POST['graduation_year'] ?? 0);
            $deptCode = strtoupper(trim((string)($_POST['department_code'] ?? 'CSE')));
            $deptName = trim((string)($_POST['department_name'] ?? $deptCode));
            $degree = trim((string)($_POST['degree'] ?? 'B.Tech'));
            $company = trim((string)($_POST['current_company'] ?? ''));
            $designation = trim((string)($_POST['designation'] ?? ''));
            $location = trim((string)($_POST['location'] ?? ''));
            $chapter = trim((string)($_POST['chapter'] ?? 'Pandharpur Home Chapter')) ?: 'Pandharpur Home Chapter';
            $linkedin = trim((string)($_POST['linkedin_url'] ?? ''));
            $bio = trim((string)($_POST['bio'] ?? ''));
            $openToMentor = isset($_POST['open_to_mentorship']) ? 1 : 0;

            if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $gradYear < 1998 || $gradYear > 2035) {
                $err = 'Please enter a valid full name, institutional/personal email, and graduation year (1998–2035).';
            } elseif ($linkedin !== '' && !validateExternalUrl($linkedin)) {
                $err = 'LinkedIn / portfolio link must be a valid http(s) URL.';
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
                        'INSERT INTO alumni_profiles (full_name, email, phone, graduation_year, department_code, department_name, degree, current_company, designation, location, chapter, linkedin_url, photo_url, bio, open_to_mentorship, is_featured, status, sort_order, registered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,\'pending\',?,CURDATE())'
                    );
                    $stmt->execute([
                        $fullName, $email, $phone !== '' ? $phone : null, $gradYear, $deptCode, $deptName,
                        $degree, $company !== '' ? $company : null, $designation !== '' ? $designation : null,
                        $location !== '' ? $location : null, $chapter, $linkedin !== '' ? $linkedin : null,
                        $photoUrl, $bio !== '' ? $bio : null, $openToMentor, $nextSort,
                    ]);
                    $msg = 'Thank you! Your alumni profile has been submitted for verification and will appear in the Verified Directory once approved by the Alumni Cell.';
                }
            }
        }
    } elseif ($action === 'post_job') {
        $activeTab = 'jobs';
        if (empty($alumniSettings['allowPublicJobPosting'])) {
            $err = 'Public alumni job posting is currently disabled by the administrator.';
        } else {
            $title = trim((string)($_POST['title'] ?? ''));
            $company = trim((string)($_POST['company'] ?? ''));
            $location = trim((string)($_POST['location'] ?? ''));
            $jobType = in_array($_POST['job_type'] ?? 'Full-Time', ['Full-Time', 'Internship', 'Referral', 'Part-Time'], true)
                ? $_POST['job_type']
                : 'Full-Time';
            $deptFocus = strtoupper(trim((string)($_POST['department_focus'] ?? 'ALL'))) ?: 'ALL';
            $expRange = trim((string)($_POST['experience_range'] ?? '0-2 Years')) ?: '0-2 Years';
            $comp = trim((string)($_POST['compensation'] ?? ''));
            $desc = trim((string)($_POST['description'] ?? ''));
            $applyTarget = trim((string)($_POST['apply_url_or_email'] ?? ''));
            $posterName = trim((string)($_POST['posted_by_alumni_name'] ?? ''));
            $posterBatch = trim((string)($_POST['posted_by_batch'] ?? ''));
            $deadline = trim((string)($_POST['deadline_date'] ?? ''));

            if ($title === '' || $company === '' || $location === '' || $desc === '' || $applyTarget === '' || $posterName === '') {
                $err = 'Please fill in job title, company, location, description, application URL/email, and your name.';
            } else {
                $nextSort = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM alumni_jobs')->fetchColumn()) + 1;
                $stmt = $pdo->prepare(
                    'INSERT INTO alumni_jobs (title, company, location, job_type, department_focus, experience_range, compensation, description, apply_url_or_email, posted_by_alumni_name, posted_by_batch, deadline_date, status, posted_at, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),?)'
                );
                $stmt->execute([
                    $title, $company, $location, $jobType, $deptFocus, $expRange,
                    $comp !== '' ? $comp : null, $desc, $applyTarget, $posterName,
                    $posterBatch !== '' ? $posterBatch : 'Alumni',
                    $deadline !== '' ? $deadline : null, 'pending', $nextSort,
                ]);
                $msg = 'Opportunity submitted! It is queued for moderation and will go live on the Job Board once approved.';
            }
        }
    } elseif ($action === 'rsvp_event') {
        $activeTab = 'events';
        $eventId = (int)($_POST['event_id'] ?? 0);
        if ($eventId > 0) {
            $pdo->prepare('UPDATE alumni_events SET rsvp_count = rsvp_count + 1 WHERE id = ? AND is_active = 1')->execute([$eventId]);
            $msg = 'Your RSVP has been recorded! We look forward to welcoming you at the chapter meet.';
        }
    }
}

$departmentsList = $pdo->query('SELECT code, name FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();
$approvedProfiles = $pdo->query("SELECT * FROM alumni_profiles WHERE status = 'approved' ORDER BY sort_order ASC, id ASC")->fetchAll();
$openJobs = $pdo->query("SELECT * FROM alumni_jobs WHERE status = 'open' ORDER BY sort_order ASC, id DESC")->fetchAll();
$activeEvents = $pdo->query('SELECT * FROM alumni_events WHERE is_active = 1 ORDER BY sort_order ASC, event_date ASC')->fetchAll();

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

<nav class="alumni-tabbar" aria-label="Alumni Portal Sections">
  <a href="?tab=directory" class="alumni-tabbtn <?= $activeTab === 'directory' ? 'is-active' : '' ?>">Verified Alumni Directory (<?= count($approvedProfiles) ?>)</a>
  <a href="?tab=jobs" class="alumni-tabbtn <?= $activeTab === 'jobs' ? 'is-active' : '' ?>">Job &amp; Internship Board (<?= count($openJobs) ?>)</a>
  <a href="?tab=events" class="alumni-tabbtn <?= $activeTab === 'events' ? 'is-active' : '' ?>">Chapters &amp; Reunions (<?= count($activeEvents) ?>)</a>
  <a href="?tab=register" class="alumni-tabbtn <?= $activeTab === 'register' ? 'is-active' : '' ?>">Register as Alumni</a>
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
        <option value="ALL">All Types</option>
        <?php foreach (['Full-Time', 'Internship', 'Referral', 'Part-Time'] as $jt): ?>
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
    <form method="post" class="card">
      <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Post an Alumni Job / Internship Referral</h2>
      <p style="font-size:0.84rem;color:var(--text-muted);margin-top:0;">Share hiring openings at your organization with SVERI students and graduates. Submissions undergo quick Alumni Cell moderation.</p>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="post_job">
      <div class="grid-3" style="margin-bottom:0.75rem;">
        <label style="font-size:0.8rem;font-weight:600;">Job / Internship Title *<input type="text" name="title" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
        <label style="font-size:0.8rem;font-weight:600;">Company / Organization *<input type="text" name="company" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
        <label style="font-size:0.8rem;font-weight:600;">Location *<input type="text" name="location" required placeholder="Pune / Hybrid" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
        <label style="font-size:0.8rem;font-weight:600;">Opportunity Type
          <select name="job_type" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
            <option value="Full-Time">Full-Time</option><option value="Internship">Internship</option><option value="Referral">Referral</option><option value="Part-Time">Part-Time</option>
          </select>
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
        <label style="font-size:0.8rem;font-weight:600;">Your Name (Alumni) *<input type="text" name="posted_by_alumni_name" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
        <label style="font-size:0.8rem;font-weight:600;">Your Batch &amp; Dept<input type="text" name="posted_by_batch" placeholder="2018 CSE" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
      </div>
      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.85rem;">Role Description &amp; Referral Instructions *
        <textarea name="description" rows="3" required style="width:100%;padding:0.55rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></textarea>
      </label>
      <button type="submit" class="btn-primary">Submit Opportunity for Moderation</button>
    </form>
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

<?php else: ?>
  <div class="card" style="max-width:860px;">
    <h2 style="margin-top:0;font-family:'Playfair Display',serif;">Alumni Association Membership &amp; Directory Registration</h2>
    <?php if (empty($alumniSettings['allowSelfRegistration'])): ?>
      <div class="alert-err">Self-service alumni registration is currently paused. Contact <?= e($alumniSettings['coordinatorEmail']) ?>.</div>
    <?php else: ?>
      <p style="font-size:0.86rem;color:var(--text-muted);margin-top:0;">Register to join the verified SVERI Alumni Directory, connect with regional chapters, and optionally volunteer as a student mentor.</p>
      <form method="post" enctype="multipart/form-data">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="register_alumni">
        <div class="grid-3" style="margin-bottom:0.75rem;">
          <label style="font-size:0.8rem;font-weight:600;">Full Name *<input type="text" name="full_name" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Email Address *<input type="email" name="email" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Mobile / Phone<input type="text" name="phone" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Graduation Year *<input type="number" name="graduation_year" min="1998" max="2035" value="2020" required style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Department *
            <select name="department_code" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;">
              <?php foreach ($departmentsList as $dl): ?><option value="<?= e($dl['code']) ?>"><?= e($dl['code']) ?> — <?= e($dl['name']) ?></option><?php endforeach; ?>
            </select>
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Degree Program<input type="text" name="degree" value="B.Tech" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Current Company / Organization<input type="text" name="current_company" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Current Role / Designation<input type="text" name="designation" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">City &amp; Country<input type="text" name="location" placeholder="Pune, India" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Regional Chapter<input type="text" name="chapter" value="Pune Chapter" style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">LinkedIn / Website URL<input type="url" name="linkedin_url" placeholder="https://linkedin.com/in/..." style="width:100%;padding:0.48rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></label>
          <label style="font-size:0.8rem;font-weight:600;">Profile Photo (1:1 Auto-Crop)
            <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" data-aspect="1:1" style="display:block;margin-top:4px;">
          </label>
        </div>
        <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.75rem;">Short Bio / Career Highlights
          <textarea name="bio" rows="3" style="width:100%;padding:0.55rem;border:1px solid var(--border-color);border-radius:7px;margin-top:4px;"></textarea>
        </label>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.86rem;font-weight:600;margin-bottom:1rem;">
          <input type="checkbox" name="open_to_mentorship" value="1"> Willing to mentor current students &amp; provide career guidance
        </label>
        <button type="submit" class="btn-primary">Submit Alumni Registration</button>
      </form>
    <?php endif; ?>
  </div>
<?php endif; ?>

<script src="<?= e(assetUrl('assets/js/upload_guard.js')) ?>"></script>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
