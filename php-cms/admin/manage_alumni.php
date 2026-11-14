<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/backup_helper.php';

$user = requireRoleAccess('alumni');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$subTab = $_GET['sub'] ?? 'profiles';
if (!in_array($subTab, ['profiles', 'jobs', 'events', 'settings'], true)) {
    $subTab = 'profiles';
}

$msg = '';
$err = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';

    if ($action === 'move_alumni') {
        $tbl = $_POST['table'] ?? '';
        $id = (int)($_POST['id'] ?? 0);
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (in_array($tbl, ['alumni_profiles', 'alumni_jobs', 'alumni_events'], true) && swapSortOrder($pdo, $tbl, $id, $dir)) {
            $msg = 'Display order updated.';
        }
    } elseif ($action === 'save_profile') {
        $subTab = 'profiles';
        $editId = (int)($_POST['edit_id'] ?? 0);
        $fullName = trim((string)($_POST['full_name'] ?? ''));
        $email = trim((string)($_POST['email'] ?? ''));
        $phone = trim((string)($_POST['phone'] ?? ''));
        $gradYear = (int)($_POST['graduation_year'] ?? 2020);
        $deptCode = strtoupper(trim((string)($_POST['department_code'] ?? 'CSE')));
        $deptName = trim((string)($_POST['department_name'] ?? $deptCode));
        $degree = trim((string)($_POST['degree'] ?? 'B.Tech'));
        $company = trim((string)($_POST['current_company'] ?? ''));
        $designation = trim((string)($_POST['designation'] ?? ''));
        $location = trim((string)($_POST['location'] ?? ''));
        $chapter = trim((string)($_POST['chapter'] ?? 'Pandharpur Home Chapter')) ?: 'Pandharpur Home Chapter';
        $linkedin = trim((string)($_POST['linkedin_url'] ?? ''));
        $bio = trim((string)($_POST['bio'] ?? ''));
        $status = in_array($_POST['status'] ?? 'approved', ['approved', 'pending', 'rejected'], true) ? $_POST['status'] : 'approved';
        $mentor = isset($_POST['open_to_mentorship']) ? 1 : 0;
        $featured = isset($_POST['is_featured']) ? 1 : 0;
        $photoUrl = trim((string)($_POST['existing_photo_url'] ?? 'assets/images/principal.jpg')) ?: 'assets/images/principal.jpg';

        if (!empty($_FILES['photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['photo'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) {
                $err = $up['error'];
            } else {
                $photoUrl = $up['file_url'];
            }
        }

        if ($err === '') {
            if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $err = 'Full name and valid email are required.';
            } elseif ($editId > 0) {
                $pdo->prepare(
                    'UPDATE alumni_profiles SET full_name=?, email=?, phone=?, graduation_year=?, department_code=?, department_name=?, degree=?, current_company=?, designation=?, location=?, chapter=?, linkedin_url=?, photo_url=?, bio=?, open_to_mentorship=?, is_featured=?, status=? WHERE id=?'
                )->execute([
                    $fullName, $email, $phone !== '' ? $phone : null, $gradYear, $deptCode, $deptName, $degree,
                    $company !== '' ? $company : null, $designation !== '' ? $designation : null,
                    $location !== '' ? $location : null, $chapter, $linkedin !== '' ? $linkedin : null,
                    $photoUrl, $bio !== '' ? $bio : null, $mentor, $featured, $status, $editId,
                ]);
                logAudit($pdo, $user, 'UPDATE_ALUMNI_PROFILE', 'AlumniProfile', $fullName);
                $msg = 'Alumni profile updated: ' . $fullName;
            } else {
                $nextSort = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order),0) FROM alumni_profiles')->fetchColumn()) + 1;
                $pdo->prepare(
                    'INSERT INTO alumni_profiles (full_name, email, phone, graduation_year, department_code, department_name, degree, current_company, designation, location, chapter, linkedin_url, photo_url, bio, open_to_mentorship, is_featured, status, sort_order, registered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE())'
                )->execute([
                    $fullName, $email, $phone !== '' ? $phone : null, $gradYear, $deptCode, $deptName, $degree,
                    $company !== '' ? $company : null, $designation !== '' ? $designation : null,
                    $location !== '' ? $location : null, $chapter, $linkedin !== '' ? $linkedin : null,
                    $photoUrl, $bio !== '' ? $bio : null, $mentor, $featured, $status, $nextSort,
                ]);
                logAudit($pdo, $user, 'CREATE_ALUMNI_PROFILE', 'AlumniProfile', $fullName);
                $msg = 'Alumni profile added: ' . $fullName;
            }
        }
    } elseif ($action === 'set_profile_status') {
        $subTab = 'profiles';
        $id = (int)($_POST['id'] ?? 0);
        $st = in_array($_POST['status'] ?? '', ['approved', 'pending', 'rejected'], true) ? $_POST['status'] : 'approved';
        $pdo->prepare('UPDATE alumni_profiles SET status = ? WHERE id = ?')->execute([$st, $id]);
        logAudit($pdo, $user, 'MODERATE_ALUMNI_PROFILE', 'AlumniProfile', "#$id -> $st");
        $msg = "Alumni profile #$id marked as $st.";
    } elseif ($action === 'delete_profile') {
        $subTab = 'profiles';
        $id = (int)($_POST['id'] ?? 0);
        $pdo->prepare('DELETE FROM alumni_profiles WHERE id = ?')->execute([$id]);
        logAudit($pdo, $user, 'DELETE_ALUMNI_PROFILE', 'AlumniProfile', "#$id");
        $msg = 'Alumni profile deleted.';
    } elseif ($action === 'save_job') {
        $subTab = 'jobs';
        $editId = (int)($_POST['edit_job_id'] ?? 0);
        $title = trim((string)($_POST['title'] ?? ''));
        $company = trim((string)($_POST['company'] ?? ''));
        $location = trim((string)($_POST['location'] ?? ''));
        $jobType = in_array($_POST['job_type'] ?? 'Full-Time', ['Full-Time', 'Internship', 'Referral', 'Part-Time'], true) ? $_POST['job_type'] : 'Full-Time';
        $deptFocus = strtoupper(trim((string)($_POST['department_focus'] ?? 'ALL'))) ?: 'ALL';
        $expRange = trim((string)($_POST['experience_range'] ?? '0-2 Years')) ?: '0-2 Years';
        $comp = trim((string)($_POST['compensation'] ?? ''));
        $desc = trim((string)($_POST['description'] ?? ''));
        $applyTarget = trim((string)($_POST['apply_url_or_email'] ?? ''));
        $posterName = trim((string)($_POST['posted_by_alumni_name'] ?? 'Alumni Cell'));
        $posterBatch = trim((string)($_POST['posted_by_batch'] ?? 'Official'));
        $deadline = trim((string)($_POST['deadline_date'] ?? ''));
        $status = in_array($_POST['status'] ?? 'open', ['open', 'pending', 'closed'], true) ? $_POST['status'] : 'open';

        if ($title === '' || $company === '') {
            $err = 'Job title and company are required.';
        } elseif ($editId > 0) {
            $pdo->prepare(
                'UPDATE alumni_jobs SET title=?, company=?, location=?, job_type=?, department_focus=?, experience_range=?, compensation=?, description=?, apply_url_or_email=?, posted_by_alumni_name=?, posted_by_batch=?, deadline_date=?, status=? WHERE id=?'
            )->execute([
                $title, $company, $location, $jobType, $deptFocus, $expRange, $comp !== '' ? $comp : null,
                $desc, $applyTarget, $posterName, $posterBatch, $deadline !== '' ? $deadline : null, $status, $editId,
            ]);
            $msg = 'Alumni job updated: ' . $title;
        } else {
            $nextSort = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order),0) FROM alumni_jobs')->fetchColumn()) + 1;
            $pdo->prepare(
                'INSERT INTO alumni_jobs (title, company, location, job_type, department_focus, experience_range, compensation, description, apply_url_or_email, posted_by_alumni_name, posted_by_batch, deadline_date, status, posted_at, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURDATE(),?)'
            )->execute([
                $title, $company, $location, $jobType, $deptFocus, $expRange, $comp !== '' ? $comp : null,
                $desc, $applyTarget, $posterName, $posterBatch, $deadline !== '' ? $deadline : null, $status, $nextSort,
            ]);
            $msg = 'Alumni job published: ' . $title;
        }
    } elseif ($action === 'set_job_status') {
        $subTab = 'jobs';
        $id = (int)($_POST['id'] ?? 0);
        $st = in_array($_POST['status'] ?? '', ['open', 'pending', 'closed'], true) ? $_POST['status'] : 'open';
        $pdo->prepare('UPDATE alumni_jobs SET status = ? WHERE id = ?')->execute([$st, $id]);
        $msg = "Job #$id marked as $st.";
    } elseif ($action === 'delete_job') {
        $subTab = 'jobs';
        $id = (int)($_POST['id'] ?? 0);
        $pdo->prepare('DELETE FROM alumni_jobs WHERE id = ?')->execute([$id]);
        $msg = 'Job posting deleted.';
    } elseif ($action === 'save_event') {
        $subTab = 'events';
        $editId = (int)($_POST['edit_event_id'] ?? 0);
        $title = trim((string)($_POST['title'] ?? ''));
        $chapter = trim((string)($_POST['chapter'] ?? 'Pandharpur Home Chapter'));
        $eventDate = trim((string)($_POST['event_date'] ?? date('Y-m-d')));
        $venue = trim((string)($_POST['venue'] ?? ''));
        $organizer = trim((string)($_POST['organizer'] ?? 'SVERI Alumni Association'));
        $desc = trim((string)($_POST['description'] ?? ''));
        $regUrl = trim((string)($_POST['registration_url'] ?? ''));
        $rsvpCount = max(0, (int)($_POST['rsvp_count'] ?? 0));
        $isActive = isset($_POST['is_active']) ? 1 : 0;
        $bannerUrl = trim((string)($_POST['existing_banner_url'] ?? 'assets/images/convocation.jpg')) ?: 'assets/images/convocation.jpg';

        if (!empty($_FILES['slide_image']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['slide_image'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) {
                $err = $up['error'];
            } else {
                $bannerUrl = $up['file_url'];
            }
        }

        if ($err === '') {
            if ($title === '' || $venue === '') {
                $err = 'Event title and venue are required.';
            } elseif ($editId > 0) {
                $pdo->prepare(
                    'UPDATE alumni_events SET title=?, chapter=?, event_date=?, venue=?, organizer=?, description=?, banner_url=?, registration_url=?, rsvp_count=?, is_active=? WHERE id=?'
                )->execute([$title, $chapter, $eventDate, $venue, $organizer, $desc, $bannerUrl, $regUrl, $rsvpCount, $isActive, $editId]);
                $msg = 'Chapter event updated: ' . $title;
            } else {
                $nextSort = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order),0) FROM alumni_events')->fetchColumn()) + 1;
                $pdo->prepare(
                    'INSERT INTO alumni_events (title, chapter, event_date, venue, organizer, description, banner_url, registration_url, rsvp_count, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
                )->execute([$title, $chapter, $eventDate, $venue, $organizer, $desc, $bannerUrl, $regUrl, $rsvpCount, $isActive, $nextSort]);
                $msg = 'Chapter event added: ' . $title;
            }
        }
    } elseif ($action === 'delete_event') {
        $subTab = 'events';
        $id = (int)($_POST['id'] ?? 0);
        $pdo->prepare('DELETE FROM alumni_events WHERE id = ?')->execute([$id]);
        $msg = 'Chapter event deleted.';
    } elseif ($action === 'save_alumni_settings') {
        $subTab = 'settings';
        $newSettings = [
            'heroTitle'             => trim((string)($_POST['hero_title'] ?? '')),
            'heroSubtitle'          => trim((string)($_POST['hero_subtitle'] ?? '')),
            'associationRegNo'      => trim((string)($_POST['assoc_reg_no'] ?? '')),
            'coordinatorName'       => trim((string)($_POST['coordinator_name'] ?? '')),
            'coordinatorEmail'      => trim((string)($_POST['coordinator_email'] ?? '')),
            'allowSelfRegistration' => isset($_POST['allow_self_reg']),
            'allowPublicJobPosting' => isset($_POST['allow_public_jobs']),
        ];
        kvSet($pdo, 'alumni_settings', $newSettings);
        logAudit($pdo, $user, 'UPDATE_ALUMNI_SETTINGS', 'AlumniSettings', 'Portal settings saved');
        $msg = 'Alumni portal settings updated.';
    }
}

$profiles = $pdo->query('SELECT * FROM alumni_profiles ORDER BY sort_order ASC, id ASC')->fetchAll();
$jobs = $pdo->query('SELECT * FROM alumni_jobs ORDER BY sort_order ASC, id DESC')->fetchAll();
$events = $pdo->query('SELECT * FROM alumni_events ORDER BY sort_order ASC, event_date ASC')->fetchAll();
$departmentsList = $pdo->query('SELECT code, name FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();
$alumniSettings = getAlumniSettings($pdo);

$editProfile = null;
if (!empty($_GET['edit_profile'])) {
    $epId = (int)$_GET['edit_profile'];
    foreach ($profiles as $pr) {
        if ((int)$pr['id'] === $epId) { $editProfile = $pr; break; }
    }
}
$editJob = null;
if (!empty($_GET['edit_job'])) {
    $ejId = (int)$_GET['edit_job'];
    foreach ($jobs as $jb) {
        if ((int)$jb['id'] === $ejId) { $editJob = $jb; break; }
    }
}
$editEvent = null;
if (!empty($_GET['edit_event'])) {
    $eeId = (int)$_GET['edit_event'];
    foreach ($events as $ev) {
        if ((int)$ev['id'] === $eeId) { $editEvent = $ev; break; }
    }
}

$pendingProfilesCount = count(array_filter($profiles, static fn($r) => ($r['status'] ?? '') === 'pending'));
$pendingJobsCount = count(array_filter($jobs, static fn($r) => ($r['status'] ?? '') === 'pending'));

$adminPageTitle = 'Alumni Network, Jobs & Chapters';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="admin-subtabs">
  <a href="?sub=profiles" class="admin-subtab <?= $subTab === 'profiles' ? 'is-active' : '' ?>">
    Alumni Directory &amp; Queue (<?= count($profiles) ?><?= $pendingProfilesCount > 0 ? " · {$pendingProfilesCount} Pending" : '' ?>)
  </a>
  <a href="?sub=jobs" class="admin-subtab <?= $subTab === 'jobs' ? 'is-active' : '' ?>">
    Jobs &amp; Referrals (<?= count($jobs) ?><?= $pendingJobsCount > 0 ? " · {$pendingJobsCount} Pending" : '' ?>)
  </a>
  <a href="?sub=events" class="admin-subtab <?= $subTab === 'events' ? 'is-active' : '' ?>">
    Chapters &amp; Reunions (<?= count($events) ?>)
  </a>
  <a href="?sub=settings" class="admin-subtab <?= $subTab === 'settings' ? 'is-active' : '' ?>">
    Portal Settings
  </a>
</div>

<?php if ($subTab === 'profiles'): ?>
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;"><?= $editProfile ? 'Edit Alumni Profile: ' . e($editProfile['full_name']) : 'Add Verified Alumni Profile' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_profile">
    <input type="hidden" name="edit_id" value="<?= (int)($editProfile['id'] ?? 0) ?>">
    <input type="hidden" name="existing_photo_url" value="<?= e($editProfile['photo_url'] ?? 'assets/images/principal.jpg') ?>">

    <div class="grid-3" style="margin-bottom:0.75rem;">
      <label>Full Name *<input type="text" name="full_name" required value="<?= e($editProfile['full_name'] ?? '') ?>" style="width:100%;"></label>
      <label>Email *<input type="email" name="email" required value="<?= e($editProfile['email'] ?? '') ?>" style="width:100%;"></label>
      <label>Phone<input type="text" name="phone" value="<?= e($editProfile['phone'] ?? '') ?>" style="width:100%;"></label>
      <label>Graduation Year<input type="number" name="graduation_year" min="1998" max="2035" value="<?= (int)($editProfile['graduation_year'] ?? 2020) ?>" style="width:100%;"></label>
      <label>Department Code
        <select name="department_code" style="width:100%;">
          <?php foreach ($departmentsList as $dl): ?>
            <option value="<?= e($dl['code']) ?>" <?= ($editProfile['department_code'] ?? '') === $dl['code'] ? 'selected' : '' ?>><?= e($dl['code']) ?> — <?= e($dl['name']) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Department Full Name<input type="text" name="department_name" value="<?= e($editProfile['department_name'] ?? 'Computer Science & Engineering') ?>" style="width:100%;"></label>
      <label>Degree<input type="text" name="degree" value="<?= e($editProfile['degree'] ?? 'B.Tech') ?>" style="width:100%;"></label>
      <label>Current Company<input type="text" name="current_company" value="<?= e($editProfile['current_company'] ?? '') ?>" style="width:100%;"></label>
      <label>Designation<input type="text" name="designation" value="<?= e($editProfile['designation'] ?? '') ?>" style="width:100%;"></label>
      <label>Location<input type="text" name="location" value="<?= e($editProfile['location'] ?? '') ?>" style="width:100%;"></label>
      <label>Chapter<input type="text" name="chapter" value="<?= e($editProfile['chapter'] ?? 'Pune Chapter') ?>" style="width:100%;"></label>
      <label>Status
        <select name="status" style="width:100%;">
          <?php foreach (['approved', 'pending', 'rejected'] as $st): ?>
            <option value="<?= $st ?>" <?= ($editProfile['status'] ?? 'approved') === $st ? 'selected' : '' ?>><?= ucfirst($st) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>LinkedIn URL<input type="url" name="linkedin_url" value="<?= e($editProfile['linkedin_url'] ?? '') ?>" style="width:100%;"></label>
      <label>Profile Photo (1:1 Auto-Crop)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" data-aspect="1:1" style="display:block;margin-top:4px;"></label>
    </div>
    <label style="display:block;margin-bottom:0.75rem;">Bio
      <textarea name="bio" rows="2" style="width:100%;"><?= e($editProfile['bio'] ?? '') ?></textarea>
    </label>
    <div style="display:flex;gap:1.25rem;flex-wrap:wrap;align-items:center;margin-bottom:0.85rem;">
      <label><input type="checkbox" name="open_to_mentorship" <?= !isset($editProfile) || !empty($editProfile['open_to_mentorship']) ? 'checked' : '' ?>> Open to Mentorship</label>
      <label><input type="checkbox" name="is_featured" <?= !empty($editProfile['is_featured']) ? 'checked' : '' ?>> Featured Alumni</label>
    </div>
    <div style="display:flex;gap:0.5rem;">
      <button type="submit" class="btn-primary"><?= $editProfile ? 'Update Profile' : 'Save Alumni Profile' ?></button>
      <?php if ($editProfile): ?><a href="?sub=profiles" class="btn-outline">Cancel</a><?php endif; ?>
    </div>
  </form>

  <div class="card">
    <h2 style="margin-top:0;">Alumni Directory &amp; Approval Queue (<?= count($profiles) ?>)</h2>
    <?php foreach ($profiles as $idx => $p):
      $st = $p['status'] ?? 'pending';
      $badgeCls = $st === 'approved' ? 'badge-ok' : ($st === 'pending' ? 'badge-warn' : 'badge-err');
    ?>
      <div class="admin-list-row">
        <div style="display:flex;gap:0.85rem;align-items:center;flex:1;min-width:240px;">
          <img src="<?= e(mediaUrl($p['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="" style="width:46px;height:46px;border-radius:10px;object-fit:cover;">
          <div>
            <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
              <strong>#<?= (int)$idx + 1 ?> · <?= e($p['full_name']) ?></strong>
              <span class="badge <?= $badgeCls ?>"><?= strtoupper(e($st)) ?></span>
              <?php if (!empty($p['is_featured'])): ?><span class="badge badge-warn">Featured</span><?php endif; ?>
            </div>
            <div style="font-size:0.78rem;color:#57534E;">
              <?= e($p['department_code']) ?> <?= (int)$p['graduation_year'] ?> · <?= e($p['designation'] ?: $p['degree']) ?> <?= !empty($p['current_company']) ? '@ ' . e($p['current_company']) : '' ?> · <?= e($p['chapter']) ?>
            </div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_alumni"><input type="hidden" name="table" value="alumni_profiles"><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="dir" value="up"><button type="submit" class="btn-outline btn-sm">&uarr;</button></form>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_alumni"><input type="hidden" name="table" value="alumni_profiles"><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="dir" value="down"><button type="submit" class="btn-outline btn-sm">&darr;</button></form>
          <?php if ($st !== 'approved'): ?>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="set_profile_status"><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="status" value="approved"><button type="submit" class="btn-primary btn-sm">Approve</button></form>
          <?php endif; ?>
          <?php if ($st !== 'rejected'): ?>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="set_profile_status"><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="status" value="rejected"><button type="submit" class="btn-outline btn-sm">Reject</button></form>
          <?php endif; ?>
          <a href="?sub=profiles&edit_profile=<?= (int)$p['id'] ?>" class="btn-outline btn-sm">Edit</a>
          <form method="post" style="display:inline;" onsubmit="return confirm('Delete this alumni profile?');"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_profile"><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($subTab === 'jobs'): ?>
  <form method="post" class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;"><?= $editJob ? 'Edit Job Posting: ' . e($editJob['title']) : 'Add Alumni Job / Internship Referral' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_job">
    <input type="hidden" name="edit_job_id" value="<?= (int)($editJob['id'] ?? 0) ?>">
    <div class="grid-3" style="margin-bottom:0.75rem;">
      <label>Title *<input type="text" name="title" required value="<?= e($editJob['title'] ?? '') ?>" style="width:100%;"></label>
      <label>Company *<input type="text" name="company" required value="<?= e($editJob['company'] ?? '') ?>" style="width:100%;"></label>
      <label>Location *<input type="text" name="location" required value="<?= e($editJob['location'] ?? '') ?>" style="width:100%;"></label>
      <label>Job Type
        <select name="job_type" style="width:100%;">
          <?php foreach (['Full-Time', 'Internship', 'Referral', 'Part-Time'] as $jt): ?>
            <option value="<?= e($jt) ?>" <?= ($editJob['job_type'] ?? 'Full-Time') === $jt ? 'selected' : '' ?>><?= e($jt) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Department Focus
        <select name="department_focus" style="width:100%;">
          <option value="ALL">ALL</option>
          <?php foreach ($departmentsList as $dl): ?><option value="<?= e($dl['code']) ?>" <?= ($editJob['department_focus'] ?? '') === $dl['code'] ? 'selected' : '' ?>><?= e($dl['code']) ?></option><?php endforeach; ?>
        </select>
      </label>
      <label>Status
        <select name="status" style="width:100%;">
          <?php foreach (['open', 'pending', 'closed'] as $jst): ?><option value="<?= $jst ?>" <?= ($editJob['status'] ?? 'open') === $jst ? 'selected' : '' ?>><?= ucfirst($jst) ?></option><?php endforeach; ?>
        </select>
      </label>
      <label>Experience Range<input type="text" name="experience_range" value="<?= e($editJob['experience_range'] ?? '0-2 Years') ?>" style="width:100%;"></label>
      <label>Compensation<input type="text" name="compensation" value="<?= e($editJob['compensation'] ?? '') ?>" style="width:100%;"></label>
      <label>Deadline<input type="date" name="deadline_date" value="<?= e($editJob['deadline_date'] ?? '') ?>" style="width:100%;"></label>
      <label>Apply URL or Email *<input type="text" name="apply_url_or_email" required value="<?= e($editJob['apply_url_or_email'] ?? '') ?>" style="width:100%;"></label>
      <label>Posted By Alumni<input type="text" name="posted_by_alumni_name" value="<?= e($editJob['posted_by_alumni_name'] ?? $user['full_name']) ?>" style="width:100%;"></label>
      <label>Batch<input type="text" name="posted_by_batch" value="<?= e($editJob['posted_by_batch'] ?? 'Alumni Cell') ?>" style="width:100%;"></label>
    </div>
    <label style="display:block;margin-bottom:0.8rem;">Description *
      <textarea name="description" rows="2" required style="width:100%;"><?= e($editJob['description'] ?? '') ?></textarea>
    </label>
    <div style="display:flex;gap:0.5rem;">
      <button type="submit" class="btn-primary"><?= $editJob ? 'Update Job' : 'Publish Job Posting' ?></button>
      <?php if ($editJob): ?><a href="?sub=jobs" class="btn-outline">Cancel</a><?php endif; ?>
    </div>
  </form>

  <div class="card">
    <h2 style="margin-top:0;">Job &amp; Referral Listings (<?= count($jobs) ?>)</h2>
    <?php foreach ($jobs as $j):
      $st = $j['status'] ?? 'pending';
      $badgeCls = $st === 'open' ? 'badge-ok' : ($st === 'pending' ? 'badge-warn' : 'badge-err');
    ?>
      <div class="admin-list-row">
        <div>
          <div style="display:flex;align-items:center;gap:0.45rem;flex-wrap:wrap;">
            <strong><?= e($j['title']) ?></strong>
            <span class="badge <?= $badgeCls ?>"><?= strtoupper(e($st)) ?></span>
            <span class="alumni-pill"><?= e($j['job_type']) ?> · <?= e($j['department_focus']) ?></span>
          </div>
          <div style="font-size:0.78rem;color:#57534E;"><?= e($j['company']) ?> · <?= e($j['location']) ?> · By <?= e($j['posted_by_alumni_name']) ?> (<?= e($j['posted_by_batch']) ?>)</div>
        </div>
        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
          <?php if ($st !== 'open'): ?>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="set_job_status"><input type="hidden" name="id" value="<?= (int)$j['id'] ?>"><input type="hidden" name="status" value="open"><button type="submit" class="btn-primary btn-sm">Approve / Open</button></form>
          <?php endif; ?>
          <?php if ($st !== 'closed'): ?>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="set_job_status"><input type="hidden" name="id" value="<?= (int)$j['id'] ?>"><input type="hidden" name="status" value="closed"><button type="submit" class="btn-outline btn-sm">Close</button></form>
          <?php endif; ?>
          <a href="?sub=jobs&edit_job=<?= (int)$j['id'] ?>" class="btn-outline btn-sm">Edit</a>
          <form method="post" style="display:inline;" onsubmit="return confirm('Delete this job posting?');"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_job"><input type="hidden" name="id" value="<?= (int)$j['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($subTab === 'events'): ?>
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;"><?= $editEvent ? 'Edit Chapter Event: ' . e($editEvent['title']) : 'Add Alumni Chapter Meet / Reunion' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_event">
    <input type="hidden" name="edit_event_id" value="<?= (int)($editEvent['id'] ?? 0) ?>">
    <input type="hidden" name="existing_banner_url" value="<?= e($editEvent['banner_url'] ?? 'assets/images/convocation.jpg') ?>">
    <div class="grid-3" style="margin-bottom:0.75rem;">
      <label>Event Title *<input type="text" name="title" required value="<?= e($editEvent['title'] ?? '') ?>" style="width:100%;"></label>
      <label>Chapter<input type="text" name="chapter" value="<?= e($editEvent['chapter'] ?? 'Pandharpur Home Chapter') ?>" style="width:100%;"></label>
      <label>Event Date *<input type="date" name="event_date" required value="<?= e($editEvent['event_date'] ?? date('Y-m-d')) ?>" style="width:100%;"></label>
      <label>Venue *<input type="text" name="venue" required value="<?= e($editEvent['venue'] ?? '') ?>" style="width:100%;"></label>
      <label>Organizer<input type="text" name="organizer" value="<?= e($editEvent['organizer'] ?? 'SVERI Alumni Association') ?>" style="width:100%;"></label>
      <label>RSVP Count<input type="number" name="rsvp_count" min="0" value="<?= (int)($editEvent['rsvp_count'] ?? 0) ?>" style="width:100%;"></label>
      <label>External Registration URL (Optional)<input type="url" name="registration_url" value="<?= e($editEvent['registration_url'] ?? '') ?>" style="width:100%;"></label>
      <label>Banner Image (16:9 Auto-Crop)<input type="file" name="slide_image" accept="image/jpeg,image/png,image/webp" data-aspect="16:9" style="display:block;margin-top:4px;"></label>
    </div>
    <label style="display:block;margin-bottom:0.75rem;">Description
      <textarea name="description" rows="2" style="width:100%;"><?= e($editEvent['description'] ?? '') ?></textarea>
    </label>
    <label style="display:block;margin-bottom:0.85rem;">
      <input type="checkbox" name="is_active" <?= !isset($editEvent) || !empty($editEvent['is_active']) ? 'checked' : '' ?>> Visible on Public Alumni Portal
    </label>
    <div style="display:flex;gap:0.5rem;">
      <button type="submit" class="btn-primary"><?= $editEvent ? 'Update Event' : 'Save Chapter Event' ?></button>
      <?php if ($editEvent): ?><a href="?sub=events" class="btn-outline">Cancel</a><?php endif; ?>
    </div>
  </form>

  <div class="card">
    <h2 style="margin-top:0;">Chapters &amp; Reunions (<?= count($events) ?>)</h2>
    <?php foreach ($events as $ev): ?>
      <div class="admin-list-row">
        <div style="display:flex;gap:0.85rem;align-items:center;">
          <img src="<?= e(mediaUrl($ev['banner_url'] ?? '', 'assets/images/convocation.jpg')) ?>" alt="" style="width:74px;height:44px;border-radius:6px;object-fit:cover;">
          <div>
            <strong><?= e($ev['title']) ?></strong>
            <span class="badge <?= !empty($ev['is_active']) ? 'badge-ok' : 'badge-warn' ?>"><?= !empty($ev['is_active']) ? 'Active' : 'Hidden' ?></span>
            <div style="font-size:0.78rem;color:#57534E;"><?= e($ev['chapter']) ?> · <?= e($ev['event_date']) ?> · <?= (int)$ev['rsvp_count'] ?> RSVPs</div>
          </div>
        </div>
        <div style="display:flex;gap:0.35rem;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_alumni"><input type="hidden" name="table" value="alumni_events"><input type="hidden" name="id" value="<?= (int)$ev['id'] ?>"><input type="hidden" name="dir" value="up"><button type="submit" class="btn-outline btn-sm">&uarr;</button></form>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_alumni"><input type="hidden" name="table" value="alumni_events"><input type="hidden" name="id" value="<?= (int)$ev['id'] ?>"><input type="hidden" name="dir" value="down"><button type="submit" class="btn-outline btn-sm">&darr;</button></form>
          <a href="?sub=events&edit_event=<?= (int)$ev['id'] ?>" class="btn-outline btn-sm">Edit</a>
          <form method="post" style="display:inline;" onsubmit="return confirm('Delete this event?');"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_event"><input type="hidden" name="id" value="<?= (int)$ev['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

<?php else: ?>
  <form method="post" class="card" style="max-width:780px;">
    <h2 style="margin-top:0;">Alumni Portal Governance &amp; Intake Settings</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_alumni_settings">
    <div style="display:grid;gap:0.85rem;">
      <label>Hero Banner Title<input type="text" name="hero_title" value="<?= e($alumniSettings['heroTitle']) ?>" style="width:100%;"></label>
      <label>Hero Banner Subtitle<textarea name="hero_subtitle" rows="2" style="width:100%;"><?= e($alumniSettings['heroSubtitle']) ?></textarea></label>
      <div class="grid-3">
        <label>Association Reg. No.<input type="text" name="assoc_reg_no" value="<?= e($alumniSettings['associationRegNo']) ?>" style="width:100%;"></label>
        <label>Coordinator Name<input type="text" name="coordinator_name" value="<?= e($alumniSettings['coordinatorName']) ?>" style="width:100%;"></label>
        <label>Coordinator Email<input type="email" name="coordinator_email" value="<?= e($alumniSettings['coordinatorEmail']) ?>" style="width:100%;"></label>
      </div>
      <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
        <label><input type="checkbox" name="allow_self_reg" <?= !empty($alumniSettings['allowSelfRegistration']) ? 'checked' : '' ?>> Allow Self-Service Alumni Registration</label>
        <label><input type="checkbox" name="allow_public_jobs" <?= !empty($alumniSettings['allowPublicJobPosting']) ? 'checked' : '' ?>> Allow Public Alumni Job Referrals</label>
      </div>
      <div><button type="submit" class="btn-primary">Save Portal Settings</button></div>
    </div>
  </form>
<?php endif; ?>

<script src="<?= e(assetUrl('assets/js/upload_guard.js')) ?>"></script>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
