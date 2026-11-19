<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/captcha.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$slug = trim((string)($_GET['slug'] ?? ''));
$stmt = $pdo->prepare('SELECT * FROM conferences WHERE slug = ? AND is_published = 1 LIMIT 1');
$stmt->execute([$slug]);
$conf = $stmt->fetch();

if (!$conf) {
    $fallback = $pdo->query('SELECT * FROM conferences WHERE is_published = 1 ORDER BY sort_order ASC, id ASC LIMIT 1')->fetch();
    if ($fallback && $slug === '') {
        $conf = $fallback;
    } else {
        http_response_code(404);
        $pageTitle = 'Event / Conference Not Found';
        require_once __DIR__ . '/includes/header.php';
        echo '<section class="card" style="margin:2rem 0;"><h1>Conference / Workshop Not Found</h1><p>The requested event is unpublished or unavailable.</p><a href="' . e(baseUrl('conferences.php')) . '" class="btn-primary">Back to Conferences Portal</a></section>';
        require_once __DIR__ . '/includes/footer.php';
        exit;
    }
}

$confId = (int)$conf['id'];
$msg = '';
$err = '';
$submissionMode = (string)($conf['submission_mode'] ?? 'internal');
$isExternalSubmission = isExternalConferenceSubmission($conf);
$isSubmissionsClosed = ($submissionMode === 'closed');
$externalLabel = trim((string)($conf['external_submission_label'] ?? '')) ?: 'External Conference Portal (e.g. Microsoft CMT)';
$externalUrl = trim((string)($conf['external_submission_url'] ?? ''));

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $formAction = (string)($_POST['form_action'] ?? '');

    if ($formAction === 'submit_paper') {
        if ($isExternalSubmission) {
            http_response_code(403);
            $err = 'Local manuscript submission is disabled for this event because papers are managed via the external portal (' . $externalLabel . ').';
        } elseif ($isSubmissionsClosed) {
            http_response_code(403);
            $err = 'Paper submissions for this conference/event are currently closed by the organizer.';
        } elseif (!verifyCaptchaAnswer($_POST['captcha_answer'] ?? null, 'conf_paper')) {
            $err = 'Invalid CAPTCHA verification code for paper submission. Please try again.';
        } else {
            $paperTitle = trim((string)($_POST['paper_title'] ?? ''));
            $trackTitle = trim((string)($_POST['track_title'] ?? 'General Track'));
            $presSel = trim((string)($_POST['presentation_type'] ?? 'Oral Paper Presentation'));
            $presCustom = trim((string)($_POST['presentation_type_custom'] ?? ''));
            $presentationType = ($presSel === '__custom__' ? $presCustom : $presSel) ?: 'Oral Paper Presentation';
            $authorName = trim((string)($_POST['author_name'] ?? ''));
            $authorEmail = trim((string)($_POST['author_email'] ?? ''));
            $authorPhone = trim((string)($_POST['author_phone'] ?? ''));
            $affiliation = trim((string)($_POST['affiliation'] ?? ''));
            $coAuthors = trim((string)($_POST['co_authors'] ?? ''));
            $abstractText = trim((string)($_POST['abstract_text'] ?? ''));

            if ($paperTitle === '' || $authorName === '' || !filter_var($authorEmail, FILTER_VALIDATE_EMAIL) || $affiliation === '' || $abstractText === '') {
                $err = 'Please fill in all required manuscript submission fields and a valid email address.';
            } else {
                $manuscriptUrl = null;
                if (!empty($_FILES['manuscript']['name'])) {
                    $up = handleCmsUpload($pdo, $_FILES['manuscript'], __DIR__ . '/uploads', 'document');
                    if (!$up['ok']) {
                        $err = $up['error'];
                    } else {
                        $manuscriptUrl = $up['file_url'];
                    }
                }
                if ($err === '') {
                    $trackCode = strtoupper(substr(preg_replace('/[^A-Z0-9]/i', '', $conf['short_name']), 0, 8) ?: 'CONF')
                        . '-P' . random_int(1000, 9999);
                    $pdo->prepare(
                        'INSERT INTO conference_submissions (conference_id, tracking_code, paper_title, track_title, presentation_type, author_name, author_email, author_phone, affiliation, co_authors, abstract_text, manuscript_url, status, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                    )->execute([
                        $confId, $trackCode, $paperTitle, $trackTitle, $presentationType, $authorName, $authorEmail,
                        $authorPhone, $affiliation, $coAuthors, $abstractText, $manuscriptUrl,
                        'Submitted', date('Y-m-d H:i'),
                    ]);
                    $msg = 'Submission recorded (' . $presentationType . ')! Your Tracking ID is: ' . $trackCode;
                }
            }
        }
    } elseif ($formAction === 'register_delegate') {
        if (!verifyCaptchaAnswer($_POST['captcha_answer'] ?? null, 'conf_reg')) {
            $err = 'Invalid CAPTCHA verification code for delegate registration. Please try again.';
        } else {
            $attendeeName = trim((string)($_POST['attendee_name'] ?? ''));
            $email = trim((string)($_POST['email'] ?? ''));
            $phone = trim((string)($_POST['phone'] ?? ''));
            $affiliation = trim((string)($_POST['affiliation'] ?? ''));
            $feeCategory = trim((string)($_POST['fee_category'] ?? 'Student Participant'));
            $paperRef = trim((string)($_POST['paper_id_ref'] ?? ''));
            $paymentRef = trim((string)($_POST['payment_ref'] ?? ''));

            if ($attendeeName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $affiliation === '') {
                $err = 'Please complete your Name, valid Email, and Institution/Affiliation.';
            } else {
                $regCode = 'REG-' . strtoupper(bin2hex(random_bytes(3)));
                $pdo->prepare(
                    'INSERT INTO conference_registrations (conference_id, registration_code, attendee_name, email, phone, affiliation, fee_category, paper_id_ref, payment_ref, status, registered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
                )->execute([
                    $confId, $regCode, $attendeeName, $email, $phone, $affiliation,
                    $feeCategory, $paperRef, $paymentRef, 'Pending', date('Y-m-d H:i'),
                ]);
                $msg = 'Registration recorded! Your Delegate Registration Code is: ' . $regCode . ' (Status: Pending verification).';
            }
        }
    }
}

$heroSlides = json_decode((string)($conf['hero_slides_json'] ?? '[]'), true);
if (!is_array($heroSlides) || empty($heroSlides)) {
    $heroSlides = [[
        'title'    => $conf['title'],
        'caption'  => $conf['theme'] ?: ($conf['scope'] . ' · ' . $conf['venue']),
        'imageUrl' => $conf['banner_url'] ?: 'assets/images/hero_campus.jpg',
        'ctaLabel' => 'Submit Paper / Register',
        'ctaLink'  => '#register',
    ]];
}

$partners = json_decode((string)($conf['indexing_partners_json'] ?? '[]'), true) ?: [];
$tracks   = json_decode((string)($conf['tracks_json'] ?? '[]'), true) ?: [];
$dates    = json_decode((string)($conf['important_dates_json'] ?? '[]'), true) ?: [];
$people   = json_decode((string)($conf['people_json'] ?? '[]'), true) ?: [];
$schedule = json_decode((string)($conf['schedule_json'] ?? '[]'), true) ?: [];
$fees        = json_decode((string)($conf['fee_tiers_json'] ?? '[]'), true) ?: [];
$posterItems = json_decode((string)($conf['poster_items_json'] ?? '[]'), true) ?: [];
$hasPosterTrack = !isset($conf['enable_poster_presentation']) || !empty($conf['enable_poster_presentation']) || !empty($posterItems);

$pageTitle = $conf['short_name'] . ' — ' . $conf['title'];
$pageDesc  = trim((string)($conf['theme'] ?: extractPlainTextExcerpt((string)($conf['overview_html'] ?? ''), 160)));
$seoContext = [
    'description'   => $pageDesc,
    'ogImage'       => (string)($conf['banner_url'] ?: 'assets/images/hero_campus.jpg'),
    'ogType'        => 'article',
    'canonicalPath' => 'conference.php?slug=' . rawurlencode((string)$conf['slug']),
];
require_once __DIR__ . '/includes/header.php';
?>

<div style="margin-bottom:0.85rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
  <a href="<?= e(baseUrl('conferences.php')) ?>" class="btn-outline btn-sm">&larr; All Conferences, Workshops &amp; Events</a>
  <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
    <?php if ($isExternalSubmission): ?>
      <a href="<?= e($externalUrl) ?>" target="_blank" rel="noopener noreferrer" class="btn-primary btn-sm">Submit Paper on <?= e($externalLabel) ?> &#8599;</a>
    <?php elseif ($isSubmissionsClosed): ?>
      <span class="badge badge-warn">Paper Submissions Closed</span>
    <?php else: ?>
      <a href="#submit-paper" class="btn-primary btn-sm">Submit Abstract / Paper</a>
    <?php endif; ?>
    <a href="#register" class="btn-secondary btn-sm">Delegate Registration</a>
  </div>
</div>

<?php if ($msg): ?><div class="alert-ok"><?= e($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert-err"><?= e($err) ?></div><?php endif; ?>

<section style="margin-bottom:1.35rem;" aria-label="Event Hero Slider">
  <?= renderCustomSliderBlock($heroSlides, 380, 5) ?>
</section>

<section class="card" style="margin-bottom:1.25rem;border-left:4px solid var(--secondary-color);">
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;">
    <div style="flex:1 1 420px;">
      <span class="alumni-pill"><?= e($conf['scope']) ?> · <?= e($conf['mode']) ?></span>
      <h1 style="margin:0.45rem 0 0.3rem;font-family:'Playfair Display',serif;font-size:1.55rem;color:var(--primary-color);"><?= e($conf['title']) ?></h1>
      <?php if (!empty($conf['theme'])): ?>
        <p style="margin:0 0 0.55rem;font-weight:600;color:var(--secondary-color);">Theme: <?= e($conf['theme']) ?></p>
      <?php endif; ?>
      <div style="display:flex;flex-wrap:wrap;gap:0.45rem 1.25rem;font-size:0.84rem;color:var(--text-muted);">
        <span><strong>Dates:</strong> <?= e($conf['start_date']) ?><?= $conf['end_date'] !== $conf['start_date'] ? ' – ' . e($conf['end_date']) : '' ?></span>
        <span><strong>Venue:</strong> <?= e($conf['venue']) ?></span>
        <span><strong>Organizer:</strong> <?= e($conf['organizing_department']) ?></span>
        <?php if (!empty($conf['contact_email'])): ?><span><strong>Email:</strong> <?= e($conf['contact_email']) ?></span><?php endif; ?>
        <?php if (!empty($conf['contact_phone'])): ?><span><strong>Phone:</strong> <?= e($conf['contact_phone']) ?></span><?php endif; ?>
      </div>
    </div>
    <?php if (!empty($partners)): ?>
      <div style="display:flex;flex-direction:column;gap:0.35rem;min-width:200px;">
        <small style="font-weight:700;text-transform:uppercase;color:var(--text-muted);">Indexing &amp; Proceedings Partners</small>
        <div style="display:flex;flex-wrap:wrap;gap:0.35rem;">
          <?php foreach ($partners as $p): ?><span class="badge badge-ok"><?= e((string)$p) ?></span><?php endforeach; ?>
        </div>
      </div>
    <?php endif; ?>
  </div>
</section>

<div class="layout-sidebar" style="margin-bottom:1.5rem;">
  <div style="display:flex;flex-direction:column;gap:1.25rem;">
    <section class="card">
      <h2 style="margin-top:0;color:var(--primary-color);">About &amp; Call for Papers</h2>
      <div class="cms-prose">
        <?= (string)($conf['overview_html'] ?? '') ?>
        <?php if (!empty($conf['cfp_html'])): ?>
          <hr style="border:none;border-top:1px solid var(--border-color);margin:1rem 0;">
          <?= (string)$conf['cfp_html'] ?>
        <?php endif; ?>
      </div>
    </section>

    <?php if (!empty($tracks)): ?>
      <section class="card">
        <h2 style="margin-top:0;color:var(--primary-color);">Technical Tracks &amp; Modules</h2>
        <div class="grid-2">
          <?php foreach ($tracks as $tr): ?>
            <div style="border:1px solid var(--border-color);border-radius:10px;padding:0.9rem;background:var(--surface-bg);">
              <small style="font-weight:700;color:var(--secondary-color);text-transform:uppercase;"><?= e((string)($tr['code'] ?? 'Track')) ?></small>
              <h3 style="margin:0.2rem 0 0.35rem;font-size:1rem;"><?= e((string)($tr['title'] ?? '')) ?></h3>
              <p style="margin:0 0 0.35rem;font-size:0.84rem;color:var(--text-muted);"><?= e((string)($tr['description'] ?? '')) ?></p>
              <?php if (!empty($tr['chairName'])): ?>
                <small style="font-weight:600;color:var(--primary-color);">Track Chair: <?= e((string)$tr['chairName']) ?></small>
              <?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
      </section>
    <?php endif; ?>

    <?php if (!empty($people)): ?>
      <section class="card">
        <h2 style="margin-top:0;color:var(--primary-color);">Keynote Speakers, Chairs &amp; Organizing Committee</h2>
        <div class="grid-2">
          <?php foreach ($people as $pe): ?>
            <div style="display:flex;gap:0.85rem;align-items:flex-start;border:1px solid var(--border-color);border-radius:12px;padding:0.9rem;">
              <img src="<?= e(mediaUrl($pe['photoUrl'] ?? '', 'assets/images/principal.jpg')) ?>" alt="<?= e((string)($pe['name'] ?? '')) ?>" style="width:76px;height:76px;border-radius:10px;object-fit:cover;flex-shrink:0;border:1px solid var(--border-color);">
              <div>
                <span class="alumni-pill" style="font-size:0.68rem;"><?= e((string)($pe['role'] ?? 'Committee Member')) ?></span>
                <h3 style="margin:0.25rem 0 0.1rem;font-size:1rem;"><?= e((string)($pe['name'] ?? '')) ?></h3>
                <div style="font-size:0.8rem;font-weight:600;color:var(--secondary-color);"><?= e((string)($pe['designation'] ?? '')) ?></div>
                <div style="font-size:0.78rem;color:var(--text-muted);"><?= e((string)($pe['affiliation'] ?? '')) ?></div>
                <?php if (!empty($pe['bio'])): ?><p style="margin:0.35rem 0 0;font-size:0.79rem;color:var(--text-muted);"><?= e((string)$pe['bio']) ?></p><?php endif; ?>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      </section>
    <?php endif; ?>

    <?php if ($hasPosterTrack): ?>
      <section id="poster-presentation" class="card">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:0.75rem;margin-bottom:0.85rem;">
          <div>
            <small style="font-weight:700;text-transform:uppercase;color:var(--secondary-color);letter-spacing:0.05em;">Research Expo &amp; Visual Showcase</small>
            <h2 style="margin:0.15rem 0 0;color:var(--primary-color);">Poster Presentation Track &amp; Showcase</h2>
          </div>
          <?php if (!empty($conf['poster_template_url'])): ?>
            <a href="<?= e(mediaUrl($conf['poster_template_url'])) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm">Download Poster Template &darr;</a>
          <?php endif; ?>
        </div>
        <div class="grid-2" style="margin-bottom:0.85rem;">
          <div style="padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;background:var(--surface-bg);">
            <small style="font-weight:700;text-transform:uppercase;color:var(--text-muted);display:block;">Poster Format &amp; Dimensions</small>
            <strong style="font-size:0.9rem;color:var(--primary-color);"><?= e((string)($conf['poster_dimensions'] ?: 'A0 Portrait (841 x 1189 mm)')) ?></strong>
          </div>
          <?php if (!empty($conf['poster_prizes_text'])): ?>
            <div style="padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;background:#FFFBEB;">
              <small style="font-weight:700;text-transform:uppercase;color:#92400E;display:block;">Best Poster Awards</small>
              <strong style="font-size:0.9rem;color:#78350F;"><?= e((string)$conf['poster_prizes_text']) ?></strong>
            </div>
          <?php endif; ?>
        </div>
        <?php if (!empty($conf['poster_guidelines_html'])): ?>
          <div class="cms-prose" style="font-size:0.88rem;margin-bottom:0.95rem;">
            <?= (string)$conf['poster_guidelines_html'] ?>
          </div>
        <?php endif; ?>
        <?php if (!empty($posterItems)): ?>
          <h3 style="margin:0 0 0.65rem;font-size:1rem;color:var(--primary-color);">Selected Poster Presentations (<?= count($posterItems) ?>)</h3>
          <div class="grid-2">
            <?php foreach ($posterItems as $pi): ?>
              <article style="border:1px solid var(--border-color);border-radius:10px;overflow:hidden;background:var(--card-bg);display:flex;flex-direction:column;">
                <?php if (!empty($pi['imageUrl'])): ?>
                  <img src="<?= e(mediaUrl($pi['imageUrl'], 'assets/images/poster_session.jpg')) ?>" alt="<?= e((string)($pi['title'] ?? 'Poster')) ?>" style="width:100%;height:150px;object-fit:cover;display:block;">
                <?php endif; ?>
                <div style="padding:0.85rem;flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:0.45rem;">
                  <div>
                    <div style="display:flex;justify-content:space-between;gap:0.4rem;flex-wrap:wrap;font-size:0.74rem;font-weight:700;color:var(--secondary-color);">
                      <span><?= e((string)($pi['posterCode'] ?? 'POSTER')) ?></span>
                      <?php if (!empty($pi['awardNote'])): ?><span><?= e((string)$pi['awardNote']) ?></span><?php endif; ?>
                    </div>
                    <h4 style="margin:0.2rem 0 0.25rem;font-size:0.95rem;color:var(--primary-color);"><?= e((string)($pi['title'] ?? '')) ?></h4>
                    <div style="font-size:0.8rem;font-weight:600;color:var(--text-main);"><?= e((string)($pi['authors'] ?? '')) ?></div>
                    <div style="font-size:0.76rem;color:var(--text-muted);"><?= e((string)($pi['affiliation'] ?? '')) ?><?= !empty($pi['track']) ? ' · ' . e((string)$pi['track']) : '' ?></div>
                    <?php if (!empty($pi['abstract'])): ?>
                      <p style="margin:0.4rem 0 0;font-size:0.8rem;color:var(--text-muted);"><?= e((string)$pi['abstract']) ?></p>
                    <?php endif; ?>
                  </div>
                  <?php if (!empty($pi['posterPdfUrl'])): ?>
                    <div><a href="<?= e(mediaUrl($pi['posterPdfUrl'])) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm">View Poster PDF &nearr;</a></div>
                  <?php endif; ?>
                </div>
              </article>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </section>
    <?php endif; ?>

    <?php if (!empty($schedule)): ?>
      <section class="card">
        <h2 style="margin-top:0;color:var(--primary-color);">Program Schedule</h2>
        <div class="cms-table-wrap">
          <table class="cms-table cms-table-navy">
            <thead><tr><th>Day</th><th>Time</th><th>Session</th><th>Speaker / Chair</th><th>Hall</th></tr></thead>
            <tbody>
              <?php foreach ($schedule as $sc): ?>
                <tr>
                  <td><strong><?= e((string)($sc['day'] ?? '')) ?></strong></td>
                  <td><?= e((string)($sc['timeSlot'] ?? '')) ?></td>
                  <td><?= e((string)($sc['sessionTitle'] ?? '')) ?></td>
                  <td><?= e((string)($sc['speaker'] ?? '')) ?></td>
                  <td><?= e((string)($sc['hall'] ?? '')) ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      </section>
    <?php endif; ?>
  </div>

  <aside style="display:flex;flex-direction:column;gap:1.1rem;">
    <?php if (!empty($dates)): ?>
      <div class="card">
        <h3 style="margin-top:0;color:var(--primary-color);">Important Dates</h3>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.55rem;">
          <?php foreach ($dates as $dt): ?>
            <li style="padding:0.55rem 0.7rem;border-radius:8px;border:1px solid <?= !empty($dt['isHighlight']) ? '#FCD34D' : 'var(--border-color)' ?>;background:<?= !empty($dt['isHighlight']) ? '#FFFBEB' : 'var(--surface-bg)' ?>;">
              <div style="font-size:0.78rem;font-weight:600;color:var(--text-muted);"><?= e((string)($dt['label'] ?? '')) ?></div>
              <div style="font-size:0.92rem;font-weight:700;color:var(--primary-color);"><?= e((string)($dt['dateText'] ?? '')) ?></div>
            </li>
          <?php endforeach; ?>
        </ul>
      </div>
    <?php endif; ?>

    <?php if (!empty($fees)): ?>
      <div class="card">
        <h3 style="margin-top:0;color:var(--primary-color);">Registration Fee Structure</h3>
        <div style="display:flex;flex-direction:column;gap:0.55rem;">
          <?php foreach ($fees as $ft): ?>
            <div style="padding:0.65rem;border:1px solid var(--border-color);border-radius:8px;">
              <strong style="font-size:0.86rem;display:block;color:var(--primary-color);"><?= e((string)($ft['category'] ?? '')) ?></strong>
              <div style="font-size:0.8rem;margin-top:0.2rem;">Early Bird: <strong><?= e((string)($ft['earlyBirdFee'] ?? '')) ?></strong> · Regular: <?= e((string)($ft['regularFee'] ?? '')) ?></div>
              <?php if (!empty($ft['notes'])): ?><small style="color:var(--text-muted);"><?= e((string)$ft['notes']) ?></small><?php endif; ?>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    <?php endif; ?>
  </aside>
</div>

<section class="grid-2" style="margin-bottom:2rem;align-items:start;">
  <?php if ($isExternalSubmission): ?>
    <div id="submit-paper" class="card" style="border-top:4px solid var(--primary-color);background:#F8FAFC;">
      <span class="badge badge-ok" style="margin-bottom:0.5rem;">Third-Party Paper Submission Portal Active</span>
      <h2 style="margin:0.2rem 0 0.5rem;color:var(--primary-color);">Submit Paper via <?= e($externalLabel) ?></h2>
      <p style="font-size:0.86rem;color:var(--text-muted);margin-bottom:0.85rem;">
        Local portal manuscript submission is automatically disabled for this conference because peer review and camera-ready uploads are managed through <strong><?= e($externalLabel) ?></strong>.
      </p>
      <?php if (!empty($conf['submission_instructions_html'])): ?>
        <div class="cms-prose" style="padding:0.75rem;border:1px solid var(--border-color);border-radius:8px;background:var(--card-bg);margin-bottom:0.9rem;font-size:0.85rem;">
          <?= (string)$conf['submission_instructions_html'] ?>
        </div>
      <?php endif; ?>
      <a href="<?= e($externalUrl) ?>" target="_blank" rel="noopener noreferrer" class="btn-primary" style="display:inline-flex;align-items:center;gap:0.4rem;">
        Open <?= e($externalLabel) ?> Submission Portal &#8599;
      </a>
      <div style="margin-top:0.65rem;font-size:0.76rem;color:var(--text-muted);word-break:break-all;">
        Official Portal Link: <a href="<?= e($externalUrl) ?>" target="_blank" rel="noopener noreferrer"><?= e($externalUrl) ?></a>
      </div>
    </div>
  <?php elseif ($isSubmissionsClosed): ?>
    <div id="submit-paper" class="card" style="border-top:4px solid #B45309;background:#FFFBEB;">
      <span class="badge badge-warn" style="margin-bottom:0.5rem;">Paper Submissions Closed</span>
      <h2 style="margin:0.2rem 0 0.5rem;color:#78350F;">Manuscript Submissions Currently Closed</h2>
      <p style="font-size:0.86rem;color:#78350F;margin-bottom:0.75rem;">
        The paper submission window for <?= e($conf['short_name']) ?> is closed. Please contact the conference organizing chair (<?= e((string)$conf['contact_email']) ?>) or complete attendee delegate registration alongside.
      </p>
      <?php if (!empty($conf['submission_instructions_html'])): ?>
        <div class="cms-prose" style="font-size:0.84rem;"><?= (string)$conf['submission_instructions_html'] ?></div>
      <?php endif; ?>
    </div>
  <?php else: ?>
  <form id="submit-paper" method="post" enctype="multipart/form-data" class="card">
    <h2 style="margin-top:0;color:var(--primary-color);">Submit Paper / Research Abstract</h2>
    <?php if (!empty($conf['submission_instructions_html'])): ?>
      <div class="cms-prose" style="margin-bottom:0.75rem;font-size:0.84rem;"><?= (string)$conf['submission_instructions_html'] ?></div>
    <?php endif; ?>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="form_action" value="submit_paper">

    <label class="login-field"><span class="login-label">Paper / Abstract Title *</span>
      <input type="text" name="paper_title" required class="login-input" placeholder="Full manuscript title">
    </label>
    <label class="login-field"><span class="login-label">Select Track / Module *</span>
      <select name="track_title" class="login-input">
        <?php if (empty($tracks)): ?>
          <option value="General Track">General Track</option>
        <?php else: ?>
          <?php foreach ($tracks as $tr): ?>
            <option value="<?= e((string)($tr['code'] . ': ' . $tr['title'])) ?>"><?= e((string)($tr['code'] . ': ' . $tr['title'])) ?></option>
          <?php endforeach; ?>
        <?php endif; ?>
      </select>
    </label>
    <label class="login-field"><span class="login-label">Presentation Mode / Category *</span>
      <select name="presentation_type" class="login-input" onchange="var c=this.parentNode.querySelector('.custom-opt-inp');if(c){c.style.display=this.value==='__custom__'?'block':'none';c.required=this.value==='__custom__';}">
        <?php foreach (conferencePresentationTypePresets() as $pt): ?>
          <option value="<?= e($pt) ?>"><?= e($pt) ?></option>
        <?php endforeach; ?>
        <option value="__custom__">+ Custom Presentation Format...</option>
      </select>
      <input type="text" name="presentation_type_custom" class="custom-opt-inp login-input" placeholder="Enter custom presentation format..." style="display:none;margin-top:4px;">
    </label>
    <div class="grid-2">
      <label class="login-field"><span class="login-label">Corresponding Author *</span>
        <input type="text" name="author_name" required class="login-input">
      </label>
      <label class="login-field"><span class="login-label">Author Email *</span>
        <input type="email" name="author_email" required class="login-input">
      </label>
    </div>
    <div class="grid-2">
      <label class="login-field"><span class="login-label">Mobile / Phone</span>
        <input type="text" name="author_phone" class="login-input">
      </label>
      <label class="login-field"><span class="login-label">Affiliation / Institution *</span>
        <input type="text" name="affiliation" required class="login-input">
      </label>
    </div>
    <label class="login-field"><span class="login-label">Co-Authors (comma-separated)</span>
      <input type="text" name="co_authors" class="login-input">
    </label>
    <label class="login-field"><span class="login-label">Abstract Summary *</span>
      <textarea name="abstract_text" rows="3" required class="login-input"></textarea>
    </label>
    <label class="login-field"><span class="login-label">Upload Manuscript PDF / DOCX (Optional)</span>
      <input type="file" name="manuscript" accept=".pdf,.docx" class="login-input">
    </label>
    <?= renderCaptchaWidget('conf_paper', baseUrl('captcha.php'), 'Paper Submission CAPTCHA *') ?>
    <button type="submit" class="btn-primary" style="width:100%;">Submit Paper &amp; Generate Tracking ID</button>
  </form>
  <?php endif; ?>

  <form id="register" method="post" class="card">
    <h2 style="margin-top:0;color:var(--primary-color);">Delegate / Attendee Registration</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="form_action" value="register_delegate">

    <label class="login-field"><span class="login-label">Full Name *</span>
      <input type="text" name="attendee_name" required class="login-input">
    </label>
    <div class="grid-2">
      <label class="login-field"><span class="login-label">Email Address *</span>
        <input type="email" name="email" required class="login-input">
      </label>
      <label class="login-field"><span class="login-label">Phone / WhatsApp</span>
        <input type="text" name="phone" class="login-input">
      </label>
    </div>
    <label class="login-field"><span class="login-label">Institution / Organization *</span>
      <input type="text" name="affiliation" required class="login-input">
    </label>
    <label class="login-field"><span class="login-label">Fee Category *</span>
      <select name="fee_category" class="login-input">
        <?php if (empty($fees)): ?>
          <option value="Student Participant">Student Participant</option>
          <option value="Faculty / Academic">Faculty / Academic</option>
          <option value="Industry Delegate">Industry Delegate</option>
        <?php else: ?>
          <?php foreach ($fees as $ft): ?>
            <option value="<?= e((string)$ft['category']) ?>"><?= e((string)$ft['category'] . ' (' . ($ft['earlyBirdFee'] ?? '') . ')') ?></option>
          <?php endforeach; ?>
        <?php endif; ?>
      </select>
    </label>
    <div class="grid-2">
      <label class="login-field"><span class="login-label">Paper Tracking ID (if Author)</span>
        <input type="text" name="paper_id_ref" class="login-input" placeholder="Optional">
      </label>
      <label class="login-field"><span class="login-label">UTR / Transaction Reference</span>
        <input type="text" name="payment_ref" class="login-input" placeholder="Optional">
      </label>
    </div>
    <?= renderCaptchaWidget('conf_reg', baseUrl('captcha.php'), 'Delegate Registration CAPTCHA *') ?>
    <button type="submit" class="btn-secondary" style="width:100%;">Complete Delegate Registration</button>
  </form>
</section>

<?= renderPhpSocialShareBar($pdo, $conf['short_name'] . ' — ' . $conf['title'], (string)$pageDesc, baseUrl('conference.php?slug=' . urlencode((string)$conf['slug'])), 'conference', true) ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
