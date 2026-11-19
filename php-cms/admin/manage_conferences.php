<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('conferences');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$msg = '';
$err = '';
$tab = (string)($_GET['tab'] ?? 'events');
if (!in_array($tab, ['events', 'projects', 'patents', 'research_slider', 'submissions'], true)) {
    $tab = 'events';
}
if (!empty($_GET['edit_project'])) {
    $tab = 'projects';
}
if (!empty($_GET['edit_patent'])) {
    $tab = 'patents';
}

function saveResearchSliderSlides(PDO $pdo, array $slides): void
{
    $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('research_slider_slides', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
        ->execute([json_encode(array_values($slides), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = (string)($_POST['action'] ?? '');

    if ($action === 'save_conference') {
        $editId = (int)($_POST['edit_id'] ?? 0);
        $title = trim((string)($_POST['title'] ?? ''));
        $shortName = trim((string)($_POST['short_name'] ?? ''));
        $scope = trim((string)($_POST['scope'] ?? 'International Conference')) ?: 'International Conference';
        $theme = trim((string)($_POST['theme'] ?? ''));
        $startDate = trim((string)($_POST['start_date'] ?? date('Y-m-d')));
        $endDate = trim((string)($_POST['end_date'] ?? $startDate));
        $venue = trim((string)($_POST['venue'] ?? ''));
        $mode = trim((string)($_POST['mode'] ?? 'Hybrid (On-Campus + Online)')) ?: 'Hybrid (On-Campus + Online)';
        $orgDept = trim((string)($_POST['organizing_department'] ?? ''));
        $contactEmail = trim((string)($_POST['contact_email'] ?? ''));
        $contactPhone = trim((string)($_POST['contact_phone'] ?? ''));
        $isPublished = !empty($_POST['is_published']) ? 1 : 0;
        $isFeatured = !empty($_POST['is_featured']) ? 1 : 0;
        $overviewHtml = (string)($_POST['overview_html'] ?? '');
        $cfpHtml = (string)($_POST['cfp_html'] ?? '');
        $submissionMode = in_array($_POST['submission_mode'] ?? 'internal', ['internal', 'external', 'closed'], true)
            ? (string)$_POST['submission_mode']
            : 'internal';
        $extSubUrl = trim((string)($_POST['external_submission_url'] ?? ''));
        $extSubLabel = trim((string)($_POST['external_submission_label'] ?? ''));
        $subInstructions = (string)($_POST['submission_instructions_html'] ?? '');
        if ($extSubUrl !== '' && preg_match('#^https?://#i', $extSubUrl) === 1 && $submissionMode === 'internal') {
            $submissionMode = 'external';
        }
        if ($submissionMode === 'external' && $extSubUrl !== '' && !filter_var($extSubUrl, FILTER_VALIDATE_URL)) {
            $err = 'Please enter a valid https:// external paper submission portal URL (e.g. Microsoft CMT / EasyChair).';
        }

        $slugRaw = trim((string)($_POST['slug'] ?? ''));
        if ($slugRaw === '') {
            $slugRaw = $shortName !== '' ? $shortName : $title;
        }
        $slug = trim((string)preg_replace('/[^a-z0-9]+/', '-', strtolower($slugRaw)), '-');
        if ($slug === '') {
            $slug = 'event-' . random_int(100, 999);
        }

        $bannerUrl = trim((string)($_POST['existing_banner_url'] ?? 'assets/images/hero_campus.jpg'));
        if (!empty($_FILES['banner_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['banner_file'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) {
                $err = $up['error'];
            } else {
                $bannerUrl = $up['file_url'];
            }
        }

        $partnersRaw = trim((string)($_POST['indexing_partners_csv'] ?? ''));
        $partners = array_values(array_filter(array_map('trim', explode(',', $partnersRaw))));

        $decodeJsonArr = static function (string $key): string {
            $dec = json_decode((string)($_POST[$key] ?? '[]'), true);
            return json_encode(is_array($dec) ? array_values($dec) : [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        };

        $heroSlidesJson = $decodeJsonArr('hero_slides_json');
        $tracksJson     = $decodeJsonArr('tracks_json');
        $datesJson      = $decodeJsonArr('important_dates_json');
        $peopleJson     = $decodeJsonArr('people_json');
        $scheduleJson   = $decodeJsonArr('schedule_json');
        $feesJson       = $decodeJsonArr('fee_tiers_json');
        $posterItemsJson = $decodeJsonArr('poster_items_json');
        $enablePoster   = !empty($_POST['enable_poster_presentation']) ? 1 : 0;
        $posterDim      = trim((string)($_POST['poster_dimensions'] ?? 'A0 Portrait (841 x 1189 mm)'));
        $posterPrizes   = trim((string)($_POST['poster_prizes_text'] ?? ''));
        $posterTplUrl   = trim((string)($_POST['poster_template_url'] ?? ''));
        $posterGuideHtml = (string)($_POST['poster_guidelines_html'] ?? '');

        if ($title === '' || $shortName === '') {
            $err = 'Event Title and Short Name / Acronym are required.';
        }

        if ($err === '') {
            if ($editId > 0) {
                $pdo->prepare(
                    'UPDATE conferences SET slug=?, title=?, short_name=?, scope=?, theme=?, start_date=?, end_date=?, venue=?, mode=?, organizing_department=?, indexing_partners_json=?, contact_email=?, contact_phone=?, banner_url=?, hero_slides_json=?, overview_html=?, cfp_html=?, tracks_json=?, important_dates_json=?, people_json=?, schedule_json=?, fee_tiers_json=?, submission_mode=?, external_submission_url=?, external_submission_label=?, submission_instructions_html=?, enable_poster_presentation=?, poster_dimensions=?, poster_guidelines_html=?, poster_template_url=?, poster_prizes_text=?, poster_items_json=?, is_published=?, is_featured=? WHERE id=?'
                )->execute([
                    $slug, $title, $shortName, $scope, $theme, $startDate, $endDate, $venue, $mode, $orgDept,
                    json_encode($partners, JSON_UNESCAPED_UNICODE), $contactEmail, $contactPhone, $bannerUrl,
                    $heroSlidesJson, $overviewHtml, $cfpHtml, $tracksJson, $datesJson, $peopleJson, $scheduleJson, $feesJson,
                    $submissionMode, $extSubUrl !== '' ? $extSubUrl : null, $extSubLabel !== '' ? $extSubLabel : null, $subInstructions,
                    $enablePoster, $posterDim, $posterGuideHtml, $posterTplUrl, $posterPrizes, $posterItemsJson,
                    $isPublished, $isFeatured, $editId,
                ]);
                logAudit($pdo, $user, 'UPDATE_CONFERENCE', 'Conference', $shortName . ': ' . $title);
                $msg = 'Conference / Research Event "' . $shortName . '" updated successfully.';
            } else {
                $nextOrder = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM conferences')->fetchColumn()) + 1;
                $pdo->prepare(
                    'INSERT INTO conferences (slug, title, short_name, scope, theme, start_date, end_date, venue, mode, organizing_department, indexing_partners_json, contact_email, contact_phone, banner_url, hero_slides_json, overview_html, cfp_html, tracks_json, important_dates_json, people_json, schedule_json, fee_tiers_json, submission_mode, external_submission_url, external_submission_label, submission_instructions_html, enable_poster_presentation, poster_dimensions, poster_guidelines_html, poster_template_url, poster_prizes_text, poster_items_json, is_published, is_featured, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                )->execute([
                    $slug, $title, $shortName, $scope, $theme, $startDate, $endDate, $venue, $mode, $orgDept,
                    json_encode($partners, JSON_UNESCAPED_UNICODE), $contactEmail, $contactPhone, $bannerUrl,
                    $heroSlidesJson, $overviewHtml, $cfpHtml, $tracksJson, $datesJson, $peopleJson, $scheduleJson, $feesJson,
                    $submissionMode, $extSubUrl !== '' ? $extSubUrl : null, $extSubLabel !== '' ? $extSubLabel : null, $subInstructions,
                    $enablePoster, $posterDim, $posterGuideHtml, $posterTplUrl, $posterPrizes, $posterItemsJson,
                    $isPublished, $isFeatured, $nextOrder,
                ]);
                logAudit($pdo, $user, 'ADD_CONFERENCE', 'Conference', $shortName . ': ' . $title);
                $msg = 'Conference / Research Event "' . $shortName . '" published to portal.';
            }
        }
    } elseif ($action === 'move_conference' && !empty($_POST['id'])) {
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'conferences', (int)$_POST['id'], $dir, null, null, 'id ASC')) {
            logAudit($pdo, $user, 'REORDER_CONFERENCE', 'Conference', 'Event #' . (int)$_POST['id']);
            $msg = 'Conference / Event display order updated.';
        }
    } elseif ($action === 'delete_conference' && !empty($_POST['id'])) {
        $cid = (int)$_POST['id'];
        $pdo->prepare('DELETE FROM conference_submissions WHERE conference_id = ?')->execute([$cid]);
        $pdo->prepare('DELETE FROM conference_registrations WHERE conference_id = ?')->execute([$cid]);
        $pdo->prepare('DELETE FROM conferences WHERE id = ?')->execute([$cid]);
        logAudit($pdo, $user, 'DELETE_CONFERENCE', 'Conference', 'Event #' . $cid);
        $msg = 'Conference / Research Event and its records deleted.';
    } elseif ($action === 'save_research_slide') {
        $tab = 'research_slider';
        $slides = getResearchSliderSlides($pdo);
        $slideIdx = isset($_POST['slide_idx']) && $_POST['slide_idx'] !== '' ? (int)$_POST['slide_idx'] : -1;
        $imgUrl = trim((string)($_POST['existing_image'] ?? 'assets/images/hero_campus.jpg'));
        if (!empty($_FILES['slide_photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['slide_photo'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) {
                $err = $up['error'];
            } else {
                $imgUrl = $up['file_url'];
            }
        }
        if ($err === '') {
            $newSlide = [
                'id'       => ($slideIdx >= 0 && isset($slides[$slideIdx]['id'])) ? $slides[$slideIdx]['id'] : time(),
                'title'    => trim((string)($_POST['slide_title'] ?? 'Research Highlight')) ?: 'Research Highlight',
                'caption'  => trim((string)($_POST['slide_caption'] ?? '')),
                'imageUrl' => $imgUrl,
                'ctaLabel' => trim((string)($_POST['cta_label'] ?? '')),
                'ctaLink'  => trim((string)($_POST['cta_link'] ?? '')),
            ];
            if ($slideIdx >= 0 && isset($slides[$slideIdx])) {
                $slides[$slideIdx] = $newSlide;
                $msg = 'Research slider slide updated.';
            } else {
                $slides[] = $newSlide;
                $msg = 'Research slider slide added.';
            }
            saveResearchSliderSlides($pdo, $slides);
            logAudit($pdo, $user, 'UPDATE_RESEARCH_SLIDER', 'Research Slider', $newSlide['title']);
        }
    } elseif ($action === 'move_research_slide') {
        $tab = 'research_slider';
        $slides = getResearchSliderSlides($pdo);
        $idx = (int)($_POST['slide_idx'] ?? -1);
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 1 : -1;
        $swap = $idx + $dir;
        if (isset($slides[$idx], $slides[$swap])) {
            $tmp = $slides[$idx];
            $slides[$idx] = $slides[$swap];
            $slides[$swap] = $tmp;
            saveResearchSliderSlides($pdo, $slides);
            $msg = 'Research slider slide reordered.';
        }
    } elseif ($action === 'delete_research_slide') {
        $tab = 'research_slider';
        $slides = getResearchSliderSlides($pdo);
        $idx = (int)($_POST['slide_idx'] ?? -1);
        if (isset($slides[$idx])) {
            array_splice($slides, $idx, 1);
            saveResearchSliderSlides($pdo, $slides);
            $msg = 'Research slider slide deleted.';
        }
    } elseif ($action === 'update_paper_status' && !empty($_POST['sub_id'])) {
        $tab = 'submissions';
        $st = (string)($_POST['status'] ?? 'Submitted');
        $notes = trim((string)($_POST['reviewer_notes'] ?? ''));
        $pdo->prepare('UPDATE conference_submissions SET status = ?, reviewer_notes = ? WHERE id = ?')
            ->execute([$st, $notes, (int)$_POST['sub_id']]);
        $msg = 'Paper submission status updated.';
    } elseif ($action === 'update_reg_status' && !empty($_POST['reg_id'])) {
        $tab = 'submissions';
        $st = (string)($_POST['status'] ?? 'Pending');
        $pdo->prepare('UPDATE conference_registrations SET status = ? WHERE id = ?')
            ->execute([$st, (int)$_POST['reg_id']]);
        $msg = 'Delegate registration status updated.';
    } elseif ($action === 'save_research_config') {
        $tab = 'projects';
        saveResearchPortfolioConfig($pdo, [
            'heroBadge'            => trim((string)($_POST['heroBadge'] ?? '')),
            'heroTitle'            => trim((string)($_POST['heroTitle'] ?? '')),
            'heroSubtitle'         => trim((string)($_POST['heroSubtitle'] ?? '')),
            'deanName'             => trim((string)($_POST['deanName'] ?? '')),
            'deanTitle'            => trim((string)($_POST['deanTitle'] ?? '')),
            'deanEmail'            => trim((string)($_POST['deanEmail'] ?? '')),
            'deanPhone'            => trim((string)($_POST['deanPhone'] ?? '')),
            'totalGrantsHighlight' => trim((string)($_POST['totalGrantsHighlight'] ?? '')),
            'activeLabsHighlight'  => trim((string)($_POST['activeLabsHighlight'] ?? '')),
            'consultancyPolicyUrl' => trim((string)($_POST['consultancyPolicyUrl'] ?? 'quick-links.php')),
        ]);
        logAudit($pdo, $user, 'UPDATE_RESEARCH_CONFIG', 'Research Portfolio', (string)($_POST['deanName'] ?? 'R&D Config'));
        $msg = 'R&D Dean desk & Research Portfolio banner saved.';
    } elseif ($action === 'save_research_project') {
        $tab = 'projects';
        $pid = (int)($_POST['project_id'] ?? 0);
        $title = trim((string)($_POST['title'] ?? ''));
        $agency = trim((string)($_POST['funding_agency'] ?? ''));
        $pi = trim((string)($_POST['principal_investigator'] ?? ''));
        $coPi = trim((string)($_POST['co_investigator'] ?? ''));
        $dept = trim((string)($_POST['department_code'] ?? 'ALL')) ?: 'ALL';
        $amount = trim((string)($_POST['grant_amount_lakhs'] ?? ''));
        $year = trim((string)($_POST['sanction_year'] ?? '2025-26'));
        $duration = trim((string)($_POST['duration'] ?? '24 Months'));
        $status = in_array($_POST['status'] ?? 'Ongoing', ['Ongoing', 'Completed', 'Sanctioned', 'Submitted'], true) ? (string)$_POST['status'] : 'Ongoing';
        $projCode = trim((string)($_POST['project_code'] ?? ''));
        $summary = trim((string)($_POST['summary'] ?? ''));
        $docUrl = trim((string)($_POST['document_url'] ?? ''));
        if (!empty($_FILES['project_doc']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['project_doc'], __DIR__ . '/../uploads', 'document');
            if (!$up['ok']) $err = $up['error'];
            else $docUrl = $up['file_url'];
        }
        $isPub = isset($_POST['is_published']) ? 1 : 0;
        if ($err === '') {
            if ($title === '' || $agency === '' || $pi === '') {
                $err = 'Project Title, Funding Agency, and Principal Investigator are required.';
            } elseif ($pid > 0) {
                $pdo->prepare('UPDATE research_projects SET title=?, funding_agency=?, principal_investigator=?, co_investigator=?, department_code=?, grant_amount_lakhs=?, sanction_year=?, duration=?, status=?, project_code=?, summary=?, document_url=?, is_published=? WHERE id=?')
                    ->execute([$title, $agency, $pi, $coPi, $dept, $amount, $year, $duration, $status, $projCode, $summary, $docUrl, $isPub, $pid]);
                logAudit($pdo, $user, 'UPDATE_RESEARCH_PROJECT', 'Research Project', $title);
                $msg = 'Funded research project updated.';
            } else {
                $next = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM research_projects')->fetchColumn()) + 1;
                $pdo->prepare('INSERT INTO research_projects (title, funding_agency, principal_investigator, co_investigator, department_code, grant_amount_lakhs, sanction_year, duration, status, project_code, summary, document_url, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
                    ->execute([$title, $agency, $pi, $coPi, $dept, $amount, $year, $duration, $status, $projCode, $summary, $docUrl, $isPub, $next]);
                logAudit($pdo, $user, 'ADD_RESEARCH_PROJECT', 'Research Project', $title);
                $msg = 'Funded research project added.';
            }
        }
    } elseif ($action === 'move_research_project' && !empty($_POST['id'])) {
        $tab = 'projects';
        swapSortOrder($pdo, 'research_projects', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up', null, null, 'id ASC');
        $msg = 'Research project order updated.';
    } elseif ($action === 'toggle_research_project' && !empty($_POST['id'])) {
        $tab = 'projects';
        $pdo->prepare('UPDATE research_projects SET is_published = 1 - is_published WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Research project visibility toggled.';
    } elseif ($action === 'delete_research_project' && !empty($_POST['id'])) {
        $tab = 'projects';
        $pdo->prepare('DELETE FROM research_projects WHERE id = ?')->execute([(int)$_POST['id']]);
        logAudit($pdo, $user, 'DELETE_RESEARCH_PROJECT', 'Research Project', 'ID #' . (int)$_POST['id']);
        $msg = 'Research project deleted.';
    } elseif ($action === 'save_research_patent') {
        $tab = 'patents';
        $ipid = (int)($_POST['patent_id'] ?? 0);
        $iType = trim((string)($_POST['item_type'] ?? 'Patent Granted')) ?: 'Patent Granted';
        $title = trim((string)($_POST['title'] ?? ''));
        $inv = trim((string)($_POST['inventors_or_lead'] ?? ''));
        $dept = trim((string)($_POST['department_code'] ?? 'ALL')) ?: 'ALL';
        $refNo = trim((string)($_POST['reference_number'] ?? ''));
        $dt = trim((string)($_POST['filing_or_grant_date'] ?? ''));
        $status = trim((string)($_POST['status'] ?? ''));
        $partner = trim((string)($_POST['partner_or_agency'] ?? ''));
        $summary = trim((string)($_POST['summary'] ?? ''));
        $extUrl = trim((string)($_POST['external_url'] ?? ''));
        $isPub = isset($_POST['is_published']) ? 1 : 0;

        if ($title === '' || $inv === '') {
            $err = 'Title and Inventors / Authors / Lead are required.';
        } elseif ($ipid > 0) {
            $pdo->prepare('UPDATE research_patents SET item_type=?, title=?, inventors_or_lead=?, department_code=?, reference_number=?, filing_or_grant_date=?, status=?, partner_or_agency=?, summary=?, external_url=?, is_published=? WHERE id=?')
                ->execute([$iType, $title, $inv, $dept, $refNo, $dt, $status, $partner, $summary, $extUrl, $isPub, $ipid]);
            logAudit($pdo, $user, 'UPDATE_RESEARCH_PATENT', 'Research IPR', $title);
            $msg = 'Research publication / patent / IPR record updated.';
        } else {
            $next = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM research_patents')->fetchColumn()) + 1;
            $pdo->prepare('INSERT INTO research_patents (item_type, title, inventors_or_lead, department_code, reference_number, filing_or_grant_date, status, partner_or_agency, summary, external_url, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([$iType, $title, $inv, $dept, $refNo, $dt, $status, $partner, $summary, $extUrl, $isPub, $next]);
            logAudit($pdo, $user, 'ADD_RESEARCH_PATENT', 'Research IPR', $title);
            $msg = 'Research publication / patent / IPR record added.';
        }
    } elseif ($action === 'move_research_patent' && !empty($_POST['id'])) {
        $tab = 'patents';
        swapSortOrder($pdo, 'research_patents', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up', null, null, 'id ASC');
        $msg = 'IPR / Publication display order updated.';
    } elseif ($action === 'toggle_research_patent' && !empty($_POST['id'])) {
        $tab = 'patents';
        $pdo->prepare('UPDATE research_patents SET is_published = 1 - is_published WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'IPR / Publication visibility toggled.';
    } elseif ($action === 'delete_research_patent' && !empty($_POST['id'])) {
        $tab = 'patents';
        $pdo->prepare('DELETE FROM research_patents WHERE id = ?')->execute([(int)$_POST['id']]);
        logAudit($pdo, $user, 'DELETE_RESEARCH_PATENT', 'Research IPR', 'ID #' . (int)$_POST['id']);
        $msg = 'IPR / Publication record deleted.';
    }
}

$editingConf = null;
if (!empty($_GET['edit_id'])) {
    $s = $pdo->prepare('SELECT * FROM conferences WHERE id = ?');
    $s->execute([(int)$_GET['edit_id']]);
    $editingConf = $s->fetch() ?: null;
}

$conferences = $pdo->query('SELECT * FROM conferences ORDER BY sort_order ASC, id ASC')->fetchAll();
$researchSlides = getResearchSliderSlides($pdo);
$researchPortfolio = getResearchPortfolioData($pdo, false);
$rCfg = $researchPortfolio['config'];
$rProjects = $researchPortfolio['projects'];
$rPatents = $researchPortfolio['patents'];
$editingProject = null;
if (!empty($_GET['edit_project'])) {
    foreach ($rProjects as $pr) {
        if ((int)$pr['id'] === (int)$_GET['edit_project']) {
            $editingProject = $pr;
            break;
        }
    }
}
$editingPatent = null;
if (!empty($_GET['edit_patent'])) {
    foreach ($rPatents as $pt) {
        if ((int)$pt['id'] === (int)$_GET['edit_patent']) {
            $editingPatent = $pt;
            break;
        }
    }
}

$submissions = $pdo->query('SELECT cs.*, c.short_name AS conf_short FROM conference_submissions cs LEFT JOIN conferences c ON c.id = cs.conference_id ORDER BY cs.id DESC')->fetchAll();
$registrations = $pdo->query('SELECT cr.*, c.short_name AS conf_short FROM conference_registrations cr LEFT JOIN conferences c ON c.id = cr.conference_id ORDER BY cr.id DESC')->fetchAll();

$scopeOptions = conferenceScopePresets();
if ($editingConf && !in_array($editingConf['scope'], $scopeOptions, true)) {
    $scopeOptions[] = $editingConf['scope'];
}
$modeOptions = conferenceModePresets();
if ($editingConf && !in_array($editingConf['mode'], $modeOptions, true)) {
    $modeOptions[] = $editingConf['mode'];
}

$initHeroSlides = $editingConf ? (json_decode((string)$editingConf['hero_slides_json'], true) ?: []) : [
    ['title' => 'Featured Conference / Workshop Highlight', 'caption' => 'Custom banner and call-to-action displayed atop the event microsite.', 'imageUrl' => 'assets/images/hero_campus.jpg', 'ctaLabel' => 'Register Now', 'ctaLink' => '#register'],
];
$initTracks = $editingConf ? (json_decode((string)$editingConf['tracks_json'], true) ?: []) : [
    ['code' => 'Track 1', 'title' => 'Core Engineering & Applied Research', 'description' => 'Peer-reviewed technical session', 'chairName' => 'Convener'],
];
$initDates = $editingConf ? (json_decode((string)$editingConf['important_dates_json'], true) ?: []) : [
    ['label' => 'Abstract / Registration Deadline', 'dateText' => date('Y-m-d', strtotime('+20 days')), 'isHighlight' => true],
];
$initPeople = $editingConf ? (json_decode((string)$editingConf['people_json'], true) ?: []) : [
    ['name' => 'Dr. Principal / Convener', 'role' => 'Convener', 'designation' => 'Professor & Head', 'affiliation' => 'SVCOER Pandharpur', 'bio' => 'Organizing chair', 'photoUrl' => 'assets/images/principal.jpg'],
];
$initSchedule = $editingConf ? (json_decode((string)$editingConf['schedule_json'], true) ?: []) : [
    ['day' => 'Day 1', 'timeSlot' => '10:00 – 12:30', 'sessionTitle' => 'Inaugural & Technical Session', 'speaker' => 'Keynote Speaker', 'hall' => 'Auditorium'],
];
$initFees = $editingConf ? (json_decode((string)$editingConf['fee_tiers_json'], true) ?: []) : [
    ['category' => 'Student / Research Scholar', 'earlyBirdFee' => 'INR 500', 'regularFee' => 'INR 800', 'notes' => 'Includes certificate & kit'],
];
$initPosters = $editingConf ? (json_decode((string)($editingConf['poster_items_json'] ?? '[]'), true) ?: []) : [];
$initPartnersCsv = $editingConf ? implode(', ', json_decode((string)($editingConf['indexing_partners_json'] ?? '[]'), true) ?: []) : 'IEEE Proceedings, Scopus Indexed';

$adminPageTitle = 'Conferences, Workshops, FDPs & Research Slider';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="admin-subtabs">
  <a href="?tab=events" class="admin-subtab <?= $tab === 'events' ? 'is-active' : '' ?>">Conferences &amp; Events (<?= count($conferences) ?>)</a>
  <a href="?tab=projects" class="admin-subtab <?= $tab === 'projects' ? 'is-active' : '' ?>">Funded Projects &amp; R&amp;D Desk (<?= count($rProjects) ?>)</a>
  <a href="?tab=patents" class="admin-subtab <?= $tab === 'patents' ? 'is-active' : '' ?>">Patents, Publications, MoUs &amp; Start-ups (<?= count($rPatents) ?>)</a>
  <a href="?tab=research_slider" class="admin-subtab <?= $tab === 'research_slider' ? 'is-active' : '' ?>">Research Slider (<?= count($researchSlides) ?>)</a>
  <a href="?tab=submissions" class="admin-subtab <?= $tab === 'submissions' ? 'is-active' : '' ?>">Papers (<?= count($submissions) ?>) &amp; Registrations (<?= count($registrations) ?>)</a>
  <a href="<?= e(baseUrl('conferences.php')) ?>" target="_blank" class="btn-outline btn-sm" style="margin-left:auto;">Open Research Portal &rarr;</a>
</div>

<?php if ($tab === 'events'): ?>
  <div class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;"><?= $editingConf ? 'Edit Event: ' . e($editingConf['short_name']) : 'Create New Conference / Workshop / FDP / Custom Event' ?></h2>
    <form id="conf-admin-form" method="post" enctype="multipart/form-data">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_conference">
      <input type="hidden" name="edit_id" value="<?= (int)($editingConf['id'] ?? 0) ?>">
      <input type="hidden" name="existing_banner_url" value="<?= e($editingConf['banner_url'] ?? 'assets/images/hero_campus.jpg') ?>">

      <input type="hidden" name="hero_slides_json" id="inp_hero_slides_json">
      <input type="hidden" name="tracks_json" id="inp_tracks_json">
      <input type="hidden" name="important_dates_json" id="inp_important_dates_json">
      <input type="hidden" name="people_json" id="inp_people_json">
      <input type="hidden" name="schedule_json" id="inp_schedule_json">
      <input type="hidden" name="fee_tiers_json" id="inp_fee_tiers_json">
      <input type="hidden" name="poster_items_json" id="inp_poster_items_json">

      <div class="grid-3" style="margin-bottom:0.65rem;">
        <label style="font-size:0.82rem;font-weight:600;">Event / Conference Full Title *
          <input type="text" name="title" required value="<?= e($editingConf['title'] ?? '') ?>" placeholder="International Conference on..." style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
        <label style="font-size:0.82rem;font-weight:600;">Short Acronym *
          <input type="text" name="short_name" required value="<?= e($editingConf['short_name'] ?? '') ?>" placeholder="ICAEST-2026" style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
        <label style="font-size:0.82rem;font-weight:600;">URL Slug (auto if blank)
          <input type="text" name="slug" value="<?= e($editingConf['slug'] ?? '') ?>" placeholder="icaest-2026" style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
      </div>

      <div class="grid-3" style="margin-bottom:0.65rem;">
        <label style="font-size:0.82rem;font-weight:600;">Category / Scope (Custom Enabled) *
          <select name="scope" data-custom-select="1" style="width:100%;padding:0.5rem;margin-top:3px;">
            <?php foreach ($scopeOptions as $scOpt): ?>
              <option value="<?= e($scOpt) ?>" <?= ($editingConf['scope'] ?? 'International Conference') === $scOpt ? 'selected' : '' ?>><?= e($scOpt) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label style="font-size:0.82rem;font-weight:600;">Delivery Mode (Custom Enabled) *
          <select name="mode" data-custom-select="1" style="width:100%;padding:0.5rem;margin-top:3px;">
            <?php foreach ($modeOptions as $mOpt): ?>
              <option value="<?= e($mOpt) ?>" <?= ($editingConf['mode'] ?? '') === $mOpt ? 'selected' : '' ?>><?= e($mOpt) ?></option>
            <?php endforeach; ?>
          </select>
        </label>
        <label style="font-size:0.82rem;font-weight:600;">Organizing Department / Cell
          <input type="text" name="organizing_department" value="<?= e($editingConf['organizing_department'] ?? 'R&D Cell & Engineering Departments') ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
      </div>

      <div class="grid-4" style="margin-bottom:0.65rem;">
        <label style="font-size:0.82rem;font-weight:600;">Start Date
          <input type="date" name="start_date" value="<?= e($editingConf['start_date'] ?? date('Y-m-d')) ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
        <label style="font-size:0.82rem;font-weight:600;">End Date
          <input type="date" name="end_date" value="<?= e($editingConf['end_date'] ?? date('Y-m-d')) ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
        <label style="font-size:0.82rem;font-weight:600;">Venue / Auditorium
          <input type="text" name="venue" value="<?= e($editingConf['venue'] ?? 'SVERI Central Auditorium, Pandharpur') ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
        <label style="font-size:0.82rem;font-weight:600;">Banner Photo (16:9 Crop)
          <input type="file" name="banner_file" data-aspect="16:9" accept="image/jpeg,image/png,image/webp" style="width:100%;margin-top:3px;">
        </label>
      </div>

      <div class="grid-3" style="margin-bottom:0.65rem;">
        <label style="font-size:0.82rem;font-weight:600;">Event Theme / Sub-headline
          <input type="text" name="theme" value="<?= e($editingConf['theme'] ?? '') ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
        <label style="font-size:0.82rem;font-weight:600;">Contact Email
          <input type="email" name="contact_email" value="<?= e($editingConf['contact_email'] ?? 'rnd@coe.sveri.ac.in') ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
        <label style="font-size:0.82rem;font-weight:600;">Indexing / Certificate Partners (comma-separated)
          <input type="text" name="indexing_partners_csv" value="<?= e($initPartnersCsv) ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
        </label>
      </div>

      <div style="display:flex;gap:1.25rem;margin-bottom:0.85rem;font-size:0.85rem;font-weight:600;">
        <label><input type="checkbox" name="is_published" value="1" <?= (!isset($editingConf['is_published']) || !empty($editingConf['is_published'])) ? 'checked' : '' ?>> Published on Website</label>
        <label><input type="checkbox" name="is_featured" value="1" <?= !empty($editingConf['is_featured']) ? 'checked' : '' ?>> Highlight as Featured</label>
      </div>

      <?php
      $curSubMode = (string)($editingConf['submission_mode'] ?? 'internal');
      if (!empty($editingConf['external_submission_url']) && $curSubMode === 'internal') {
          $curSubMode = 'external';
      }
      ?>
      <div class="card" style="background:#EFF6FF;border-color:#BFDBFE;margin-bottom:1rem;">
        <strong style="display:block;font-size:0.9rem;color:#0F294A;margin-bottom:0.35rem;">
          Paper Submission Mode &amp; Third-Party Link (Microsoft CMT / EasyChair / EDAS / Custom)
        </strong>
        <p style="font-size:0.79rem;color:#334155;margin:0 0 0.65rem;">
          When an external paper submission URL (e.g. Microsoft CMT) is entered, the local manuscript submission form on the public conference page is <strong>automatically disabled and replaced with an external portal button</strong>.
        </p>
        <div class="grid-3" style="margin-bottom:0.65rem;">
          <label style="font-size:0.82rem;font-weight:600;">Submission Mode
            <select name="submission_mode" id="sel_sub_mode" style="width:100%;padding:0.5rem;margin-top:3px;">
              <option value="internal" <?= $curSubMode === 'internal' ? 'selected' : '' ?>>Built-in CMS Paper Submission Form</option>
              <option value="external" <?= $curSubMode === 'external' ? 'selected' : '' ?>>Third-Party External Link (Disables Local Form)</option>
              <option value="closed" <?= $curSubMode === 'closed' ? 'selected' : '' ?>>Closed (Disable Submissions)</option>
            </select>
          </label>
          <label style="font-size:0.82rem;font-weight:600;">External Portal Platform Label
            <input type="text" name="external_submission_label" value="<?= e((string)($editingConf['external_submission_label'] ?? 'Microsoft CMT Portal')) ?>" placeholder="e.g. Microsoft CMT / EasyChair" style="width:100%;padding:0.5rem;margin-top:3px;">
          </label>
          <label style="font-size:0.82rem;font-weight:600;">External Submission Portal URL (https://...)
            <input type="url" name="external_submission_url" value="<?= e((string)($editingConf['external_submission_url'] ?? '')) ?>" placeholder="https://cmt3.research.microsoft.com/..." style="width:100%;padding:0.5rem;margin-top:3px;">
          </label>
        </div>
        <label style="display:block;font-size:0.82rem;font-weight:600;">Author Submission Guidelines / Track Instructions (Optional)
          <textarea name="submission_instructions_html" rows="2" placeholder="Formatting template link, plagiarism threshold (&lt; 15%), or Microsoft CMT track instructions..." style="width:100%;padding:0.45rem;margin-top:3px;"><?= e((string)($editingConf['submission_instructions_html'] ?? '')) ?></textarea>
        </label>
      </div>

      <div style="margin-bottom:1rem;">
        <strong style="display:block;font-size:0.85rem;margin-bottom:0.35rem;">Overview &amp; Event Details (Visual Word Editor + Slider &amp; Profile Blocks)</strong>
        <textarea name="overview_html" class="rich-editor" data-csrf="<?= e(csrfToken()) ?>"><?= e((string)($editingConf['overview_html'] ?? '<p>Write complete event objectives, target audience, and highlights here...</p>')) ?></textarea>
      </div>

      <div style="margin-bottom:1rem;">
        <strong style="display:block;font-size:0.85rem;margin-bottom:0.35rem;">Call for Papers / Submission Guidelines (Visual Editor)</strong>
        <textarea name="cfp_html" class="rich-editor" data-csrf="<?= e(csrfToken()) ?>"><?= e((string)($editingConf['cfp_html'] ?? '<p>Submit original manuscripts or lab posters using the online submission form below.</p>')) ?></textarea>
      </div>

      <!-- Structured Interactive Sub-Editors -->
      <div class="card" style="background:#FAFAF9;margin-bottom:0.85rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <strong>Dedicated Event Hero Slider Slides (<?= count($initHeroSlides) ?>+)</strong>
          <button type="button" class="btn-outline btn-sm" onclick="addConfSlideRow()">+ Add Slider Slide</button>
        </div>
        <div id="conf-slides-list" style="display:flex;flex-direction:column;gap:0.5rem;"></div>
      </div>

      <div class="card" style="background:#FAFAF9;margin-bottom:0.85rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <strong>Speakers, Chairs &amp; Organizing Committee (With Photographs)</strong>
          <button type="button" class="btn-outline btn-sm" onclick="addConfPersonRow()">+ Add Committee Member / Speaker</button>
        </div>
        <div id="conf-people-list" style="display:flex;flex-direction:column;gap:0.5rem;"></div>
      </div>

      <div class="grid-2" style="margin-bottom:0.85rem;">
        <div class="card" style="background:#FAFAF9;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <strong>Technical Tracks / Modules</strong>
            <button type="button" class="btn-outline btn-sm" onclick="addConfTrackRow()">+ Add Track</button>
          </div>
          <div id="conf-tracks-list" style="display:flex;flex-direction:column;gap:0.45rem;"></div>
        </div>
        <div class="card" style="background:#FAFAF9;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <strong>Important Dates &amp; Deadlines</strong>
            <button type="button" class="btn-outline btn-sm" onclick="addConfDateRow()">+ Add Date</button>
          </div>
          <div id="conf-dates-list" style="display:flex;flex-direction:column;gap:0.45rem;"></div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:1rem;">
        <div class="card" style="background:#FAFAF9;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <strong>Program Schedule Sessions</strong>
            <button type="button" class="btn-outline btn-sm" onclick="addConfSchedRow()">+ Add Session</button>
          </div>
          <div id="conf-schedule-list" style="display:flex;flex-direction:column;gap:0.45rem;"></div>
        </div>
        <div class="card" style="background:#FAFAF9;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <strong>Registration Fee Tiers</strong>
            <button type="button" class="btn-outline btn-sm" onclick="addConfFeeRow()">+ Add Fee Tier</button>
          </div>
          <div id="conf-fees-list" style="display:flex;flex-direction:column;gap:0.45rem;"></div>
        </div>
      </div>

      <!-- Poster Presentation & Expo Track Configuration -->
      <div class="card" style="background:#FAFAF9;margin-bottom:1rem;">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.65rem;">
          <div>
            <strong style="font-size:0.92rem;color:#0F294A;">Poster Presentation &amp; Technical Expo Track</strong>
            <div style="font-size:0.78rem;color:#57534E;">Configure A0/A1 dimensions, prizes, template PDF, guidelines, and showcase accepted posters.</div>
          </div>
          <label style="font-size:0.84rem;font-weight:600;">
            <input type="checkbox" name="enable_poster_presentation" value="1" <?= (!isset($editingConf['enable_poster_presentation']) || !empty($editingConf['enable_poster_presentation'])) ? 'checked' : '' ?>> Enable Poster Track
          </label>
        </div>
        <div class="grid-3" style="margin-bottom:0.65rem;">
          <label style="font-size:0.82rem;font-weight:600;">Poster Dimensions
            <input type="text" name="poster_dimensions" value="<?= e((string)($editingConf['poster_dimensions'] ?? 'A0 Portrait (841 x 1189 mm)')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.82rem;font-weight:600;">Best Poster Prizes / Awards
            <input type="text" name="poster_prizes_text" value="<?= e((string)($editingConf['poster_prizes_text'] ?? 'Best Poster Awards + Certificates per Track')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.82rem;font-weight:600;">Poster Template URL (PPTX/PDF)
            <input type="text" name="poster_template_url" value="<?= e((string)($editingConf['poster_template_url'] ?? '')) ?>" placeholder="uploads/... or https://..." style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
        </div>
        <div style="margin-bottom:0.75rem;">
          <strong style="display:block;font-size:0.82rem;margin-bottom:0.3rem;">Poster Presentation Guidelines (HTML)</strong>
          <textarea name="poster_guidelines_html" rows="3" style="width:100%;padding:0.45rem;"><?= e((string)($editingConf['poster_guidelines_html'] ?? '<p>Prepare an A0 vertical poster (841 x 1189 mm) summarizing research methodology and experimental findings.</p>')) ?></textarea>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">
          <strong style="font-size:0.84rem;">Accepted Poster Showcase Cards</strong>
          <button type="button" class="btn-outline btn-sm" onclick="addConfPosterRow()">+ Add Poster Exhibit</button>
        </div>
        <div id="conf-posters-list" style="display:flex;flex-direction:column;gap:0.45rem;"></div>
      </div>

      <div style="display:flex;gap:0.6rem;">
        <button type="submit" class="btn-primary"><?= $editingConf ? 'Update Conference / Event' : 'Save & Publish Conference / Event' ?></button>
        <?php if ($editingConf): ?><a href="manage_conferences.php" class="btn-outline">Cancel Editing</a><?php endif; ?>
      </div>
    </form>
  </div>

  <div class="card">
    <h2 style="margin-top:0;">Existing Research Conferences, Workshops &amp; Events</h2>
    <?php foreach ($conferences as $c): ?>
      <div class="admin-list-row">
        <div style="display:flex;align-items:center;gap:0.8rem;">
          <img src="<?= e(mediaUrl($c['banner_url'] ?? '', 'assets/images/hero_campus.jpg')) ?>" alt="" style="width:72px;height:48px;object-fit:cover;border-radius:8px;">
          <div>
            <strong><?= e($c['short_name']) ?> — <?= e($c['title']) ?></strong>
            <div style="font-size:0.78rem;color:#78716C;"><?= e($c['scope']) ?> · <?= e($c['start_date']) ?> · <?= e($c['mode']) ?> · <?= !empty($c['is_published']) ? 'Published' : 'Draft' ?></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <form method="post" style="display:inline;">
            <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="action" value="move_conference">
            <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
            <button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button>
            <button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button>
          </form>
          <a href="<?= e(baseUrl('conference.php?slug=' . urlencode($c['slug']))) ?>" target="_blank" class="btn-outline btn-sm">View</a>
          <a href="?edit_id=<?= (int)$c['id'] ?>" class="btn-primary btn-sm">Edit</a>
          <form method="post" style="display:inline;">
            <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="action" value="delete_conference">
            <input type="hidden" name="id" value="<?= (int)$c['id'] ?>">
            <button type="submit" class="btn-danger btn-sm">Delete</button>
          </form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

  <script>
    (function () {
      var slides = <?= json_encode($initHeroSlides, JSON_UNESCAPED_SLASHES) ?>;
      var tracks = <?= json_encode($initTracks, JSON_UNESCAPED_SLASHES) ?>;
      var dates  = <?= json_encode($initDates, JSON_UNESCAPED_SLASHES) ?>;
      var people = <?= json_encode($initPeople, JSON_UNESCAPED_SLASHES) ?>;
      var sched  = <?= json_encode($initSchedule, JSON_UNESCAPED_SLASHES) ?>;
      var fees   = <?= json_encode($initFees, JSON_UNESCAPED_SLASHES) ?>;
      var posters = <?= json_encode($initPosters, JSON_UNESCAPED_SLASHES) ?>;

      function esc(v) { return String(v || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

      function uploadInlineImage(fileInput, aspect, onUrl) {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        var pol = window.SVCOER_UPLOAD_POLICY || {};
        function sendFile(f) {
          var fd = new FormData();
          fd.append('csrf_token', pol.csrfToken || '');
          fd.append('file', f);
          fetch(pol.uploadUrl || 'upload_handler.php', { method: 'POST', body: fd, credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (d) { if (d && d.ok && d.file_url) onUrl(d.file_url); })
            .finally(function () { fileInput.value = ''; });
        }
        if (typeof window.svcoerOpenCropModal === 'function') {
          window.svcoerOpenCropModal(file, { aspectRatio: aspect, maxPhotoMb: pol.maxPhotoMb || 2 }, sendFile, function () { fileInput.value = ''; });
        } else {
          sendFile(file);
        }
      }

      window.renderConfSubLists = function () {
        var sBox = document.getElementById('conf-slides-list');
        sBox.innerHTML = slides.map(function (sl, i) {
          return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto auto;gap:6px;background:#fff;padding:6px;border:1px solid #E7E5E4;border-radius:8px;align-items:center;">' +
            '<input type="text" placeholder="Slide Title" value="' + esc(sl.title) + '" oninput="window._confSlides[' + i + '].title=this.value" style="padding:4px 7px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Caption" value="' + esc(sl.caption) + '" oninput="window._confSlides[' + i + '].caption=this.value" style="padding:4px 7px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" id="csl-img-' + i + '" placeholder="Image URL" value="' + esc(sl.imageUrl) + '" oninput="window._confSlides[' + i + '].imageUrl=this.value" style="padding:4px 7px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<label class="btn-outline btn-sm" style="cursor:pointer;">Upload 16:9<input type="file" accept="image/*" style="display:none;" onchange="window._uploadSlidePhoto(this,' + i + ')"></label>' +
            '<button type="button" class="btn-danger btn-sm" onclick="window._confSlides.splice(' + i + ',1);window.renderConfSubLists()">&times;</button>' +
            '</div>';
        }).join('');

        var pBox = document.getElementById('conf-people-list');
        pBox.innerHTML = people.map(function (p, i) {
          return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto auto;gap:6px;background:#fff;padding:6px;border:1px solid #E7E5E4;border-radius:8px;align-items:center;">' +
            '<input type="text" placeholder="Name" value="' + esc(p.name) + '" oninput="window._confPeople[' + i + '].name=this.value" style="padding:4px 7px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Role (e.g. Keynote Speaker)" value="' + esc(p.role) + '" oninput="window._confPeople[' + i + '].role=this.value" style="padding:4px 7px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Affiliation" value="' + esc(p.affiliation) + '" oninput="window._confPeople[' + i + '].affiliation=this.value" style="padding:4px 7px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Photo URL" value="' + esc(p.photoUrl) + '" oninput="window._confPeople[' + i + '].photoUrl=this.value" style="padding:4px 7px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<label class="btn-outline btn-sm" style="cursor:pointer;">1:1 Photo<input type="file" accept="image/*" style="display:none;" onchange="window._uploadPersonPhoto(this,' + i + ')"></label>' +
            '<button type="button" class="btn-danger btn-sm" onclick="window._confPeople.splice(' + i + ',1);window.renderConfSubLists()">&times;</button>' +
            '</div>';
        }).join('');

        document.getElementById('conf-tracks-list').innerHTML = tracks.map(function (t, i) {
          return '<div style="display:grid;grid-template-columns:80px 1fr 1fr auto;gap:5px;background:#fff;padding:5px;border:1px solid #E7E5E4;border-radius:6px;">' +
            '<input type="text" placeholder="Code" value="' + esc(t.code) + '" oninput="window._confTracks[' + i + '].code=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Track Title" value="' + esc(t.title) + '" oninput="window._confTracks[' + i + '].title=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Chair" value="' + esc(t.chairName) + '" oninput="window._confTracks[' + i + '].chairName=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<button type="button" class="btn-danger btn-sm" onclick="window._confTracks.splice(' + i + ',1);window.renderConfSubLists()">&times;</button>' +
            '</div>';
        }).join('');

        document.getElementById('conf-dates-list').innerHTML = dates.map(function (d, i) {
          return '<div style="display:grid;grid-template-columns:1fr 140px auto;gap:5px;background:#fff;padding:5px;border:1px solid #E7E5E4;border-radius:6px;">' +
            '<input type="text" placeholder="Milestone Label" value="' + esc(d.label) + '" oninput="window._confDates[' + i + '].label=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="YYYY-MM-DD" value="' + esc(d.dateText) + '" oninput="window._confDates[' + i + '].dateText=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<button type="button" class="btn-danger btn-sm" onclick="window._confDates.splice(' + i + ',1);window.renderConfSubLists()">&times;</button>' +
            '</div>';
        }).join('');

        document.getElementById('conf-schedule-list').innerHTML = sched.map(function (s, i) {
          return '<div style="display:grid;grid-template-columns:90px 100px 1fr auto;gap:5px;background:#fff;padding:5px;border:1px solid #E7E5E4;border-radius:6px;">' +
            '<input type="text" placeholder="Day" value="' + esc(s.day) + '" oninput="window._confSched[' + i + '].day=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Time" value="' + esc(s.timeSlot) + '" oninput="window._confSched[' + i + '].timeSlot=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Session Title" value="' + esc(s.sessionTitle) + '" oninput="window._confSched[' + i + '].sessionTitle=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<button type="button" class="btn-danger btn-sm" onclick="window._confSched.splice(' + i + ',1);window.renderConfSubLists()">&times;</button>' +
            '</div>';
        }).join('');

        document.getElementById('conf-fees-list').innerHTML = fees.map(function (f, i) {
          return '<div style="display:grid;grid-template-columns:1fr 90px 90px auto;gap:5px;background:#fff;padding:5px;border:1px solid #E7E5E4;border-radius:6px;">' +
            '<input type="text" placeholder="Category" value="' + esc(f.category) + '" oninput="window._confFees[' + i + '].category=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Early Fee" value="' + esc(f.earlyBirdFee) + '" oninput="window._confFees[' + i + '].earlyBirdFee=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<input type="text" placeholder="Regular" value="' + esc(f.regularFee) + '" oninput="window._confFees[' + i + '].regularFee=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
            '<button type="button" class="btn-danger btn-sm" onclick="window._confFees.splice(' + i + ',1);window.renderConfSubLists()">&times;</button>' +
            '</div>';
        }).join('');

        var poBox = document.getElementById('conf-posters-list');
        if (poBox) {
          poBox.innerHTML = posters.map(function (po, i) {
            return '<div style="display:grid;grid-template-columns:80px 1fr 1fr 1fr 1fr auto auto;gap:5px;background:#fff;padding:5px;border:1px solid #E7E5E4;border-radius:6px;align-items:center;">' +
              '<input type="text" placeholder="Code" value="' + esc(po.posterCode) + '" oninput="window._confPosters[' + i + '].posterCode=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
              '<input type="text" placeholder="Poster Title" value="' + esc(po.title) + '" oninput="window._confPosters[' + i + '].title=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
              '<input type="text" placeholder="Authors" value="' + esc(po.authors) + '" oninput="window._confPosters[' + i + '].authors=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
              '<input type="text" placeholder="Track / Award" value="' + esc(po.awardNote || po.track) + '" oninput="window._confPosters[' + i + '].awardNote=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
              '<input type="text" placeholder="Preview Image URL" value="' + esc(po.imageUrl) + '" oninput="window._confPosters[' + i + '].imageUrl=this.value" style="padding:4px;border:1px solid #D6D3D1;border-radius:5px;">' +
              '<label class="btn-outline btn-sm" style="cursor:pointer;">16:9 Photo<input type="file" accept="image/*" style="display:none;" onchange="window._uploadPosterPhoto(this,' + i + ')"></label>' +
              '<button type="button" class="btn-danger btn-sm" onclick="window._confPosters.splice(' + i + ',1);window.renderConfSubLists()">&times;</button>' +
              '</div>';
          }).join('');
        }
      };

      window._confSlides = slides;
      window._confTracks = tracks;
      window._confDates  = dates;
      window._confPeople = people;
      window._confSched  = sched;
      window._confFees   = fees;
      window._confPosters = posters;

      window._uploadSlidePhoto = function (inp, idx) {
        uploadInlineImage(inp, '16:9', function (url) { slides[idx].imageUrl = url; window.renderConfSubLists(); });
      };
      window._uploadPersonPhoto = function (inp, idx) {
        uploadInlineImage(inp, '1:1', function (url) { people[idx].photoUrl = url; window.renderConfSubLists(); });
      };
      window._uploadPosterPhoto = function (inp, idx) {
        uploadInlineImage(inp, '16:9', function (url) { posters[idx].imageUrl = url; window.renderConfSubLists(); });
      };

      window.addConfSlideRow  = function () { slides.push({ title: 'Highlight Slide', caption: '', imageUrl: 'assets/images/hero_campus.jpg', ctaLabel: '', ctaLink: '' }); window.renderConfSubLists(); };
      window.addConfPersonRow = function () { people.push({ name: 'Dr. Member', role: 'Organizing Committee', designation: 'Professor', affiliation: 'SVCOER', bio: '', photoUrl: 'assets/images/principal.jpg' }); window.renderConfSubLists(); };
      window.addConfTrackRow  = function () { tracks.push({ code: 'Track ' + (tracks.length + 1), title: 'New Track', description: '', chairName: '' }); window.renderConfSubLists(); };
      window.addConfDateRow   = function () { dates.push({ label: 'Submission Cutoff', dateText: '2026-12-01', isHighlight: true }); window.renderConfSubLists(); };
      window.addConfSchedRow  = function () { sched.push({ day: 'Day 1', timeSlot: '10:00 – 11:30', sessionTitle: 'Technical Session', speaker: '', hall: 'Hall A' }); window.renderConfSubLists(); };
      window.addConfFeeRow    = function () { fees.push({ category: 'Industry Delegate', earlyBirdFee: 'INR 2,000', regularFee: 'INR 2,500', notes: '' }); window.renderConfSubLists(); };
      window.addConfPosterRow = function () { posters.push({ id: 'pst-' + (posters.length + 1), posterCode: 'PST-10' + (posters.length + 1), title: 'Research Poster Title', authors: 'Student Authors', affiliation: 'SVCOER Pandharpur', track: 'Engineering Innovation', awardNote: '', abstract: '', imageUrl: 'assets/images/poster_session.jpg', posterPdfUrl: '' }); window.renderConfSubLists(); };

      window.renderConfSubLists();

      document.getElementById('conf-admin-form').addEventListener('submit', function () {
        document.getElementById('inp_hero_slides_json').value = JSON.stringify(slides);
        document.getElementById('inp_tracks_json').value = JSON.stringify(tracks);
        document.getElementById('inp_important_dates_json').value = JSON.stringify(dates);
        document.getElementById('inp_people_json').value = JSON.stringify(people);
        document.getElementById('inp_schedule_json').value = JSON.stringify(sched);
        document.getElementById('inp_fee_tiers_json').value = JSON.stringify(fees);
        var poInp = document.getElementById('inp_poster_items_json');
        if (poInp) poInp.value = JSON.stringify(posters);
      });
    })();
  </script>

<?php elseif ($tab === 'research_slider'): ?>
  <?php
  $editSlideIdx = isset($_GET['edit_slide']) ? (int)$_GET['edit_slide'] : -1;
  $editingSlide = ($editSlideIdx >= 0 && isset($researchSlides[$editSlideIdx])) ? $researchSlides[$editSlideIdx] : null;
  ?>
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;"><?= $editingSlide ? 'Edit Research Landing Page Slide #' . ($editSlideIdx + 1) : 'Add New Slide to Research & Conferences Hero Slider' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_research_slide">
    <input type="hidden" name="slide_idx" value="<?= $editingSlide ? $editSlideIdx : '' ?>">
    <input type="hidden" name="existing_image" value="<?= e((string)($editingSlide['imageUrl'] ?? 'assets/images/hero_campus.jpg')) ?>">

    <div class="grid-2" style="margin-bottom:0.6rem;">
      <label style="font-size:0.82rem;font-weight:600;">Slide Heading *
        <input type="text" name="slide_title" required value="<?= e((string)($editingSlide['title'] ?? '')) ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
      </label>
      <label style="font-size:0.82rem;font-weight:600;">Caption / Description
        <input type="text" name="slide_caption" value="<?= e((string)($editingSlide['caption'] ?? '')) ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
      </label>
      <label style="font-size:0.82rem;font-weight:600;">CTA Button Label
        <input type="text" name="cta_label" value="<?= e((string)($editingSlide['ctaLabel'] ?? 'Explore Conferences')) ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
      </label>
      <label style="font-size:0.82rem;font-weight:600;">CTA Link
        <input type="text" name="cta_link" value="<?= e((string)($editingSlide['ctaLink'] ?? 'conferences.php')) ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
      </label>
    </div>
    <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.75rem;">Upload Slide Banner Image (16:9 Crop):
      <input type="file" name="slide_photo" data-aspect="16:9" accept="image/jpeg,image/png,image/webp">
    </label>
    <button type="submit" class="btn-primary"><?= $editingSlide ? 'Update Slide' : 'Add Slide to Research Portal' ?></button>
    <?php if ($editingSlide): ?><a href="?tab=research_slider" class="btn-outline">Cancel</a><?php endif; ?>
  </form>

  <div class="card">
    <h2 style="margin-top:0;">Active Research Page Slider Slides</h2>
    <?php foreach ($researchSlides as $idx => $sl): ?>
      <div class="admin-list-row">
        <div style="display:flex;align-items:center;gap:0.8rem;">
          <img src="<?= e(mediaUrl($sl['imageUrl'] ?? '', 'assets/images/hero_campus.jpg')) ?>" alt="" style="width:88px;height:52px;object-fit:cover;border-radius:8px;">
          <div>
            <strong>#<?= $idx + 1 ?> · <?= e((string)($sl['title'] ?? '')) ?></strong>
            <div style="font-size:0.78rem;color:#78716C;"><?= e((string)($sl['caption'] ?? '')) ?></div>
          </div>
        </div>
        <div style="display:flex;gap:0.4rem;">
          <form method="post" style="display:inline;">
            <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="action" value="move_research_slide">
            <input type="hidden" name="slide_idx" value="<?= $idx ?>">
            <button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button>
            <button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button>
          </form>
          <a href="?tab=research_slider&edit_slide=<?= $idx ?>" class="btn-primary btn-sm">Edit</a>
          <form method="post" style="display:inline;">
            <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="action" value="delete_research_slide">
            <input type="hidden" name="slide_idx" value="<?= $idx ?>">
            <button type="submit" class="btn-danger btn-sm">Delete</button>
          </form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($tab === 'projects'): ?>
  <!-- R&D Governance Banner & Dean R&D Profile -->
  <form method="post" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">R&amp;D Governance Banner, Dean R&amp;D Profile &amp; Grants Highlights</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_research_config">
    <div class="grid-3" style="margin-bottom:0.55rem;">
      <label style="font-size:0.8rem;font-weight:600;">Portal Badge
        <input type="text" name="heroBadge" value="<?= e((string)$rCfg['heroBadge']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Research Portfolio Heading
        <input type="text" name="heroTitle" value="<?= e((string)$rCfg['heroTitle']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Consultancy / R&amp;D Policy Link
        <input type="text" name="consultancyPolicyUrl" value="<?= e((string)$rCfg['consultancyPolicyUrl']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
    </div>
    <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.55rem;">Portfolio Subtitle
      <input type="text" name="heroSubtitle" value="<?= e((string)$rCfg['heroSubtitle']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
    </label>
    <div class="grid-3" style="margin-bottom:0.55rem;">
      <label style="font-size:0.8rem;font-weight:600;">Dean R&amp;D Name
        <input type="text" name="deanName" value="<?= e((string)$rCfg['deanName']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Dean Title
        <input type="text" name="deanTitle" value="<?= e((string)$rCfg['deanTitle']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Dean Email
        <input type="email" name="deanEmail" value="<?= e((string)$rCfg['deanEmail']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Dean Phone
        <input type="text" name="deanPhone" value="<?= e((string)$rCfg['deanPhone']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Total Grants Highlight
        <input type="text" name="totalGrantsHighlight" value="<?= e((string)$rCfg['totalGrantsHighlight']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Ph.D. Centres &amp; Active Labs Highlight
        <input type="text" name="activeLabsHighlight" value="<?= e((string)$rCfg['activeLabsHighlight']) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
    </div>
    <button type="submit" class="btn-primary btn-sm">Save R&amp;D Portfolio Config</button>
  </form>

  <!-- Add / Edit Funded Research Project -->
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;"><?= $editingProject ? 'Edit Funded Project: ' . e((string)$editingProject['title']) : 'Add Sponsored / Funded Research Project' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_research_project">
    <input type="hidden" name="project_id" value="<?= (int)($editingProject['id'] ?? 0) ?>">

    <div class="grid-3" style="margin-bottom:0.55rem;">
      <label style="font-size:0.8rem;font-weight:600;grid-column:span 2;">Project Title *
        <input type="text" name="title" required value="<?= e((string)($editingProject['title'] ?? '')) ?>" placeholder="DST-SERB / AICTE-MODROBS / RGSTC Project Title" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Funding Agency *
        <input type="text" name="funding_agency" required value="<?= e((string)($editingProject['funding_agency'] ?? '')) ?>" placeholder="DST-SERB / AICTE / DRDO / MSME" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
    </div>
    <div class="grid-4" style="margin-bottom:0.55rem;">
      <label style="font-size:0.8rem;font-weight:600;">Principal Investigator (PI) *
        <input type="text" name="principal_investigator" required value="<?= e((string)($editingProject['principal_investigator'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Co-Investigator(s)
        <input type="text" name="co_investigator" value="<?= e((string)($editingProject['co_investigator'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Department Code
        <input type="text" name="department_code" value="<?= e((string)($editingProject['department_code'] ?? 'CSE')) ?>" placeholder="CSE / MECH / ENTC / CIVIL / ELEC" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Sanctioned Grant Amount
        <input type="text" name="grant_amount_lakhs" value="<?= e((string)($editingProject['grant_amount_lakhs'] ?? '')) ?>" placeholder="Rs. 24.50 Lakhs" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Sanction Year
        <input type="text" name="sanction_year" value="<?= e((string)($editingProject['sanction_year'] ?? '2025-26')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Duration
        <input type="text" name="duration" value="<?= e((string)($editingProject['duration'] ?? '24 Months')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Status
        <select name="status" style="width:100%;padding:0.45rem;margin-top:3px;">
          <?php foreach (['Ongoing', 'Completed', 'Sanctioned', 'Submitted'] as $ps): ?>
            <option value="<?= e($ps) ?>" <?= ($editingProject['status'] ?? 'Ongoing') === $ps ? 'selected' : '' ?>><?= e($ps) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Sanction Order / File No.
        <input type="text" name="project_code" value="<?= e((string)($editingProject['project_code'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
    </div>
    <div class="grid-2" style="margin-bottom:0.55rem;">
      <label style="font-size:0.8rem;font-weight:600;">Sanction Order URL / Link
        <input type="text" name="document_url" value="<?= e((string)($editingProject['document_url'] ?? '')) ?>" placeholder="uploads/... or https://..." style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Upload Sanction Letter PDF (Optional)
        <input type="file" name="project_doc" accept=".pdf,.doc,.docx" style="width:100%;margin-top:6px;">
      </label>
    </div>
    <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.55rem;">Project Scope &amp; Outcomes Summary
      <textarea name="summary" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"><?= e((string)($editingProject['summary'] ?? '')) ?></textarea>
    </label>
    <label style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">
      <input type="checkbox" name="is_published" value="1" <?= ($editingProject === null || !empty($editingProject['is_published'])) ? 'checked' : '' ?>> Visible on Research Portal
    </label><br>
    <button type="submit" class="btn-primary"><?= $editingProject ? 'Update Funded Project' : 'Add Funded Project' ?></button>
    <?php if ($editingProject): ?><a href="?tab=projects" class="btn-outline" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
  </form>

  <div class="card">
    <h2 style="margin-top:0;">Funded Research Projects (<?= count($rProjects) ?>)</h2>
    <?php foreach ($rProjects as $pr): ?>
      <div class="admin-list-row">
        <div>
          <span style="font-size:0.72rem;font-weight:700;color:var(--secondary-color);text-transform:uppercase;"><?= e((string)$pr['funding_agency']) ?> · <?= e((string)$pr['status']) ?> · <?= e((string)$pr['department_code']) ?></span>
          <span class="badge <?= !empty($pr['is_published']) ? 'badge-ok' : 'badge-warn' ?>" style="margin-left:4px;"><?= !empty($pr['is_published']) ? 'Visible' : 'Hidden' ?></span><br>
          <strong><?= e((string)$pr['title']) ?></strong>
          <div style="font-size:0.78rem;color:#57534E;">PI: <?= e((string)$pr['principal_investigator']) ?> · Grant: <strong><?= e((string)$pr['grant_amount_lakhs']) ?></strong> (<?= e((string)$pr['sanction_year']) ?>)</div>
        </div>
        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_research_project"><input type="hidden" name="id" value="<?= (int)$pr['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="toggle_research_project"><input type="hidden" name="id" value="<?= (int)$pr['id'] ?>"><button type="submit" class="btn-secondary btn-sm"><?= !empty($pr['is_published']) ? 'Hide' : 'Show' ?></button></form>
          <a href="?tab=projects&edit_project=<?= (int)$pr['id'] ?>" class="btn-primary btn-sm">Edit</a>
          <form method="post" style="display:inline;" onsubmit="return confirm('Delete this research project?');"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_research_project"><input type="hidden" name="id" value="<?= (int)$pr['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($tab === 'patents'): ?>
  <form method="post" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;"><?= $editingPatent ? 'Edit IPR / Publication Record' : 'Add Patent, Publication, Copyright, Start-up, Consultancy or MoU' ?></h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_research_patent">
    <input type="hidden" name="patent_id" value="<?= (int)($editingPatent['id'] ?? 0) ?>">

    <div class="grid-3" style="margin-bottom:0.55rem;">
      <label style="font-size:0.8rem;font-weight:600;">Record Category *
        <select name="item_type" data-custom-select="1" style="width:100%;padding:0.45rem;margin-top:3px;">
          <?php
            $patTypes = researchPatentTypePresets();
            if ($editingPatent && !in_array($editingPatent['item_type'], $patTypes, true)) {
                $patTypes[] = $editingPatent['item_type'];
            }
            foreach ($patTypes as $ptOpt):
          ?>
            <option value="<?= e($ptOpt) ?>" <?= ($editingPatent['item_type'] ?? 'Patent Granted') === $ptOpt ? 'selected' : '' ?>><?= e($ptOpt) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label style="font-size:0.8rem;font-weight:600;grid-column:span 2;">Title *
        <input type="text" name="title" required value="<?= e((string)($editingPatent['title'] ?? '')) ?>" placeholder="Patent / Journal Paper / Incubated Start-up / MoU Title" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
    </div>

    <div class="grid-4" style="margin-bottom:0.55rem;">
      <label style="font-size:0.8rem;font-weight:600;">Inventors / Authors / Founders *
        <input type="text" name="inventors_or_lead" required value="<?= e((string)($editingPatent['inventors_or_lead'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Department Code
        <input type="text" name="department_code" value="<?= e((string)($editingPatent['department_code'] ?? 'CSE')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Patent / DOI / Ref No.
        <input type="text" name="reference_number" value="<?= e((string)($editingPatent['reference_number'] ?? '')) ?>" placeholder="IN-PAT-... or DOI / CIN" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Date (YYYY-MM-DD)
        <input type="text" name="filing_or_grant_date" value="<?= e((string)($editingPatent['filing_or_grant_date'] ?? date('Y-m-d'))) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Status / Indexing / Value
        <input type="text" name="status" value="<?= e((string)($editingPatent['status'] ?? '')) ?>" placeholder="Granted / Scopus Q1 / MSME Seed" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Partner / Publisher / Agency
        <input type="text" name="partner_or_agency" value="<?= e((string)($editingPatent['partner_or_agency'] ?? '')) ?>" placeholder="Indian Patent Office / IEEE / Industry" style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;grid-column:span 2;">External Link / DOI / Certificate URL
        <input type="url" name="external_url" value="<?= e((string)($editingPatent['external_url'] ?? '')) ?>" placeholder="https://..." style="width:100%;padding:0.45rem;margin-top:3px;">
      </label>
    </div>

    <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.55rem;">Brief Impact / Technical Summary
      <textarea name="summary" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"><?= e((string)($editingPatent['summary'] ?? '')) ?></textarea>
    </label>
    <label style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">
      <input type="checkbox" name="is_published" value="1" <?= ($editingPatent === null || !empty($editingPatent['is_published'])) ? 'checked' : '' ?>> Visible on Research Portal
    </label><br>
    <button type="submit" class="btn-primary"><?= $editingPatent ? 'Update IPR / Publication' : 'Save IPR / Publication Record' ?></button>
    <?php if ($editingPatent): ?><a href="?tab=patents" class="btn-outline" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
  </form>

  <div class="card">
    <h2 style="margin-top:0;">Patents, Publications, MoUs, Consultancy &amp; Start-ups (<?= count($rPatents) ?>)</h2>
    <?php foreach ($rPatents as $pt): ?>
      <div class="admin-list-row">
        <div>
          <span style="font-size:0.72rem;font-weight:700;color:var(--secondary-color);text-transform:uppercase;"><?= e((string)$pt['item_type']) ?> · <?= e((string)$pt['department_code']) ?> · <?= e((string)$pt['filing_or_grant_date']) ?></span>
          <span class="badge <?= !empty($pt['is_published']) ? 'badge-ok' : 'badge-warn' ?>" style="margin-left:4px;"><?= !empty($pt['is_published']) ? 'Visible' : 'Hidden' ?></span><br>
          <strong><?= e((string)$pt['title']) ?></strong>
          <div style="font-size:0.78rem;color:#57534E;"><?= e((string)$pt['inventors_or_lead']) ?> · Ref: <code><?= e((string)$pt['reference_number']) ?></code> · <?= e((string)$pt['status']) ?></div>
        </div>
        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_research_patent"><input type="hidden" name="id" value="<?= (int)$pt['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="toggle_research_patent"><input type="hidden" name="id" value="<?= (int)$pt['id'] ?>"><button type="submit" class="btn-secondary btn-sm"><?= !empty($pt['is_published']) ? 'Hide' : 'Show' ?></button></form>
          <a href="?tab=patents&edit_patent=<?= (int)$pt['id'] ?>" class="btn-primary btn-sm">Edit</a>
          <form method="post" style="display:inline;" onsubmit="return confirm('Delete this record?');"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_research_patent"><input type="hidden" name="id" value="<?= (int)$pt['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>

<?php elseif ($tab === 'submissions'): ?>
  <div class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">Submitted Conference Papers &amp; Abstracts (<?= count($submissions) ?>)</h2>
    <table class="data-table">
      <thead><tr><th>Tracking ID</th><th>Event &amp; Mode</th><th>Paper Title &amp; Author</th><th>Manuscript</th><th>Decision</th></tr></thead>
      <tbody>
        <?php foreach ($submissions as $sb): ?>
          <tr>
            <td><strong><?= e($sb['tracking_code']) ?></strong><br><small><?= e($sb['submitted_at']) ?></small></td>
            <td><?= e((string)$sb['conf_short']) ?><br><small style="color:#0369A1;font-weight:700;"><?= e((string)($sb['presentation_type'] ?? 'Oral Paper Presentation')) ?></small></td>
            <td><strong><?= e($sb['paper_title']) ?></strong><br><small><?= e($sb['author_name']) ?> (<?= e($sb['affiliation']) ?>)</small></td>
            <td><?php if (!empty($sb['manuscript_url'])): ?><a href="<?= e(baseUrl($sb['manuscript_url'])) ?>" target="_blank" class="btn-outline btn-sm">Open File</a><?php else: ?>—<?php endif; ?></td>
            <td>
              <form method="post" style="display:flex;gap:0.35rem;flex-wrap:wrap;align-items:center;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="update_paper_status">
                <input type="hidden" name="sub_id" value="<?= (int)$sb['id'] ?>">
                <select name="status" style="padding:4px 6px;">
                  <?php foreach (['Submitted','Under Review','Revision Requested','Accepted','Rejected'] as $stOpt): ?>
                    <option value="<?= e($stOpt) ?>" <?= $sb['status'] === $stOpt ? 'selected' : '' ?>><?= e($stOpt) ?></option>
                  <?php endforeach; ?>
                </select>
                <input type="text" name="reviewer_notes" value="<?= e((string)$sb['reviewer_notes']) ?>" placeholder="Reviewer notes" style="padding:4px 6px;width:140px;">
                <button type="submit" class="btn-primary btn-sm">Save</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2 style="margin-top:0;">Delegate Registrations (<?= count($registrations) ?>)</h2>
    <table class="data-table">
      <thead><tr><th>Reg Code</th><th>Event</th><th>Delegate</th><th>Category &amp; UTR</th><th>Status</th></tr></thead>
      <tbody>
        <?php foreach ($registrations as $rg): ?>
          <tr>
            <td><strong><?= e($rg['registration_code']) ?></strong><br><small><?= e($rg['registered_at']) ?></small></td>
            <td><?= e((string)$rg['conf_short']) ?></td>
            <td><strong><?= e($rg['attendee_name']) ?></strong><br><small><?= e($rg['email']) ?> · <?= e($rg['affiliation']) ?></small></td>
            <td><?= e($rg['fee_category']) ?><br><small>UTR: <?= e((string)($rg['payment_ref'] ?: '—')) ?></small></td>
            <td>
              <form method="post" style="display:flex;gap:0.35rem;align-items:center;">
                <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                <input type="hidden" name="action" value="update_reg_status">
                <input type="hidden" name="reg_id" value="<?= (int)$rg['id'] ?>">
                <select name="status" style="padding:4px 6px;">
                  <?php foreach (['Pending','Confirmed','Cancelled'] as $rs): ?>
                    <option value="<?= e($rs) ?>" <?= $rg['status'] === $rs ? 'selected' : '' ?>><?= e($rs) ?></option>
                  <?php endforeach; ?>
                </select>
                <button type="submit" class="btn-primary btn-sm">Update</button>
              </form>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
