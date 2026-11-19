<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireLogin();
$canPlacements = canAccessResource($user, 'placements');
$canGrievances = canAccessResource($user, 'grievances');
if (!$canPlacements && !$canGrievances) {
    http_response_code(403);
    exit('Access Denied: Insufficient RBAC privileges for Placements or Grievances.');
}

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$tab = (string)($_GET['tab'] ?? ($canPlacements ? 'placements' : 'grievances'));
if (!in_array($tab, ['placements', 'grievances', 'feedback'], true)) {
    $tab = $canPlacements ? 'placements' : 'grievances';
}
if ($tab === 'placements' && !$canPlacements) $tab = 'grievances';
if (($tab === 'grievances' || $tab === 'feedback') && !$canGrievances) $tab = 'placements';
if (!empty($_GET['edit_fb_sec'])) {
    $tab = 'feedback';
}

$section = (string)($_GET['section'] ?? 'stats');
$allowedSections = ['stats', 'notices', 'congratulations', 'drives', 'custom_data'];
if (!in_array($section, $allowedSections, true)) {
    $section = 'stats';
}
if (!empty($_GET['edit_stat'])) $section = 'stats';
if (!empty($_GET['edit_notice'])) $section = 'notices';
if (!empty($_GET['edit_story'])) $section = 'congratulations';
if (isset($_GET['edit_drive']) && $_GET['edit_drive'] !== '') $section = 'drives';
if (!empty($_GET['edit_custom'])) $section = 'custom_data';

// CSV Export for Grievance Moderation Log or Feedback Inbox (before any HTML)
if ($canGrievances && $tab === 'grievances' && !empty($_GET['export_csv'])) {
    $rows = $pdo->query('SELECT ticket_code, submitted_at, complainant_name, email, phone, reporter_role, category, urgency, is_anonymous, subject, status, resolution_note, updated_at FROM grievances ORDER BY id DESC')->fetchAll();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="svcoer-grievance-log-' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Ticket Code', 'Submitted At', 'Reporter Name', 'Email', 'Phone', 'Role', 'Category', 'Urgency', 'Anonymous', 'Subject', 'Status', 'Resolution Remarks', 'Updated At']);
    foreach ($rows as $r) {
        fputcsv($out, [
            $r['ticket_code'],
            $r['submitted_at'],
            !empty($r['is_anonymous']) ? '[CONFIDENTIAL] ' . $r['complainant_name'] : $r['complainant_name'],
            $r['email'],
            $r['phone'],
            $r['reporter_role'],
            $r['category'],
            $r['urgency'],
            !empty($r['is_anonymous']) ? 'Yes' : 'No',
            $r['subject'],
            $r['status'],
            $r['resolution_note'],
            $r['updated_at'],
        ]);
    }
    fclose($out);
    exit;
}

if ($canGrievances && $tab === 'feedback' && !empty($_GET['export_feedback_csv'])) {
    $rows = $pdo->query('SELECT tracking_code, submitted_at, section_name, subsection, submission_type, stakeholder_role, sender_name, sender_email, sender_phone, department_or_batch, rating, is_anonymous, subject, message, routed_to_emails, email_dispatch_status, status, action_taken_note, updated_at FROM feedback_entries ORDER BY id DESC')->fetchAll();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="svcoer-feedback-inbox-' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Tracking Code', 'Submitted At', 'Section', 'Subsection', 'Type', 'Role', 'Sender Name', 'Email', 'Phone', 'Dept/Batch', 'Rating', 'Anonymous', 'Subject', 'Message', 'Routed Emails', 'Email Status', 'Status', 'Action Taken', 'Updated At']);
    foreach ($rows as $r) {
        fputcsv($out, [
            $r['tracking_code'],
            $r['submitted_at'],
            $r['section_name'],
            $r['subsection'],
            $r['submission_type'],
            $r['stakeholder_role'],
            !empty($r['is_anonymous']) ? '[CONFIDENTIAL]' : $r['sender_name'],
            $r['sender_email'],
            $r['sender_phone'],
            $r['department_or_batch'],
            $r['rating'],
            !empty($r['is_anonymous']) ? 'Yes' : 'No',
            $r['subject'],
            $r['message'],
            $r['routed_to_emails'],
            $r['email_dispatch_status'],
            $r['status'],
            $r['action_taken_note'],
            $r['updated_at'],
        ]);
    }
    fclose($out);
    exit;
}

$msg = '';
$err = '';

$drives = getPlacementDrives($pdo);
$gCfg = getGrievancePortalConfig($pdo);

function saveKvArray(PDO $pdo, string $key, array $data): void
{
    $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
        ->execute([$key, json_encode(array_values($data), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = (string)($_POST['action'] ?? '');

    if ($canPlacements && $action === 'save_placement_summary') {
        $tab = 'placements';
        $section = 'stats';
        $brochureUrl = trim((string)($_POST['brochureUrl'] ?? ''));
        if (!empty($_POST['clear_brochure'])) {
            $brochureUrl = '';
        }
        if (!empty($_FILES['brochure_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['brochure_file'], __DIR__ . '/../uploads', 'document');
            if (!$up['ok']) {
                $err = $up['error'];
            } else {
                $brochureUrl = $up['file_url'];
            }
        }
        if ($err === '') {
            $sum = [
                'summaryNote'      => trim((string)($_POST['summaryNote'] ?? '')),
                'coordinatorName'  => trim((string)($_POST['coordinatorName'] ?? '')),
                'coordinatorEmail' => trim((string)($_POST['coordinatorEmail'] ?? '')),
                'coordinatorPhone' => trim((string)($_POST['coordinatorPhone'] ?? '')),
                'brochureUrl'      => $brochureUrl,
                'brochureLabel'    => trim((string)($_POST['brochureLabel'] ?? '')) ?: 'Download T&P Brochure (PDF)',
                'recruiters'       => trim((string)($_POST['recruiters'] ?? '')),
            ];
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('placements_summary', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([json_encode($sum, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
            if ($sum['recruiters'] !== '') {
                $pdo->prepare('UPDATE site_settings SET recruiters = ? WHERE id = 1')->execute([$sum['recruiters']]);
            }
            logAudit($pdo, $user, 'UPDATE_PLACEMENTS_SUMMARY', 'Placements', $sum['coordinatorName']);
            $msg = 'T&P Coordinator profile, Brochure PDF & Overview saved.';
        }
    } elseif ($canPlacements && $action === 'save_recruiters_only') {
        $tab = 'placements';
        $section = 'drives';
        $rawSum = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'placements_summary' LIMIT 1")->fetchColumn();
        $cur = $rawSum ? (json_decode((string)$rawSum, true) ?: []) : [];
        $cur['recruiters'] = trim((string)($_POST['recruiters'] ?? ''));
        $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('placements_summary', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
            ->execute([json_encode($cur, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        if ($cur['recruiters'] !== '') {
            $pdo->prepare('UPDATE site_settings SET recruiters = ? WHERE id = 1')->execute([$cur['recruiters']]);
        }
        $msg = 'Esteemed Corporate Recruiters directory updated.';
    } elseif ($canPlacements && $action === 'save_stat') {
        $tab = 'placements';
        $section = 'stats';
        $sid = (int)($_POST['id'] ?? 0);
        $vals = [
            trim((string)$_POST['academic_year']),
            trim((string)$_POST['branch']),
            (int)$_POST['eligible_students'],
            (int)$_POST['placed_students'],
            (float)$_POST['highest_package_lpa'],
            (float)$_POST['average_package_lpa'],
            trim((string)$_POST['top_recruiters_list']),
        ];
        if ($sid > 0) {
            $pdo->prepare('UPDATE placement_stats SET academic_year=?, branch=?, eligible_students=?, placed_students=?, highest_package_lpa=?, average_package_lpa=?, top_recruiters_list=? WHERE id=?')
                ->execute(array_merge($vals, [$sid]));
            $msg = 'Branch placement statistic updated.';
        } else {
            $next = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM placement_stats')->fetchColumn()) + 1;
            $pdo->prepare('INSERT INTO placement_stats (academic_year, branch, eligible_students, placed_students, highest_package_lpa, average_package_lpa, top_recruiters_list, sort_order) VALUES (?,?,?,?,?,?,?,?)')
                ->execute(array_merge($vals, [$next]));
            $msg = 'Branch placement statistic added.';
        }
    } elseif ($canPlacements && $action === 'move_stat' && !empty($_POST['id'])) {
        $tab = 'placements';
        $section = 'stats';
        swapSortOrder($pdo, 'placement_stats', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up', null, null, 'id ASC');
        $msg = 'Placement statistic order updated.';
    } elseif ($canPlacements && $action === 'delete_stat' && !empty($_POST['id'])) {
        $tab = 'placements';
        $section = 'stats';
        $pdo->prepare('DELETE FROM placement_stats WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Placement statistic row deleted.';
    } elseif ($canPlacements && $action === 'save_notice') {
        $tab = 'placements';
        $section = 'notices';
        $nid = (int)($_POST['notice_id'] ?? 0);
        $title = trim((string)($_POST['title'] ?? ''));
        $noticeDate = trim((string)($_POST['notice_date'] ?? date('Y-m-d')));
        $category = trim((string)($_POST['category'] ?? 'Campus Drive Circular')) ?: 'General Information';
        $summaryText = trim((string)($_POST['summary'] ?? ''));
        $attachmentUrl = trim((string)($_POST['attachment_url'] ?? ''));
        if (!empty($_POST['clear_notice_file'])) {
            $attachmentUrl = '';
        }
        if (!empty($_FILES['notice_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['notice_file'], __DIR__ . '/../uploads', 'document');
            if (!$up['ok']) {
                $err = $up['error'];
            } else {
                $attachmentUrl = $up['file_url'];
            }
        }
        $linkLabel = trim((string)($_POST['link_label'] ?? ''));
        $isPinned = !empty($_POST['is_pinned']) ? 1 : 0;

        if ($err === '') {
            if ($title === '') {
                $err = 'Notice title is required.';
            } elseif ($nid > 0) {
                $pdo->prepare('UPDATE placement_notices SET title=?, notice_date=?, category=?, summary=?, attachment_url=?, link_label=?, is_pinned=? WHERE id=?')
                    ->execute([$title, $noticeDate, $category, $summaryText, $attachmentUrl, $linkLabel, $isPinned, $nid]);
                logAudit($pdo, $user, 'UPDATE_PLACEMENT_NOTICE', 'Placements Notice', $title);
                $msg = 'Student notice updated.';
            } else {
                $next = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM placement_notices')->fetchColumn()) + 1;
                $pdo->prepare('INSERT INTO placement_notices (title, notice_date, category, summary, attachment_url, link_label, is_pinned, sort_order) VALUES (?,?,?,?,?,?,?,?)')
                    ->execute([$title, $noticeDate, $category, $summaryText, $attachmentUrl, $linkLabel, $isPinned, $next]);
                logAudit($pdo, $user, 'ADD_PLACEMENT_NOTICE', 'Placements Notice', $title);
                $msg = 'Student notice published.';
            }
        }
    } elseif ($canPlacements && $action === 'move_notice' && !empty($_POST['id'])) {
        $tab = 'placements';
        $section = 'notices';
        swapSortOrder($pdo, 'placement_notices', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up', null, null, 'id DESC');
        $msg = 'Student notice order updated.';
    } elseif ($canPlacements && $action === 'delete_notice' && !empty($_POST['id'])) {
        $tab = 'placements';
        $section = 'notices';
        $pdo->prepare('DELETE FROM placement_notices WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Student notice removed.';
    } elseif ($canPlacements && $action === 'save_story') {
        $tab = 'placements';
        $section = 'congratulations';
        $srId = (int)($_POST['story_id'] ?? 0);
        $photoUrl = trim((string)($_POST['existing_photo'] ?? 'assets/images/principal.jpg'));
        if (!empty($_FILES['photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['photo'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $photoUrl = $up['file_url'];
        }
        $entryType = trim((string)($_POST['entry_type'] ?? 'Campus Placement')) ?: 'Campus Placement';
        $headline = trim((string)($_POST['headline'] ?? ''));
        $isFeatured = !empty($_POST['is_featured']) ? 1 : 0;

        if ($err === '') {
            if ($srId > 0) {
                $pdo->prepare('UPDATE placement_stories SET entry_type=?, headline=?, student_name=?, batch_year=?, branch=?, company=?, role_title=?, package_lpa=?, photo_url=?, quote_text=?, is_featured=? WHERE id=?')
                    ->execute([
                        $entryType,
                        $headline,
                        trim((string)$_POST['student_name']),
                        trim((string)$_POST['batch_year']),
                        trim((string)$_POST['branch']),
                        trim((string)$_POST['company']),
                        trim((string)$_POST['role_title']),
                        trim((string)$_POST['package_lpa']),
                        $photoUrl,
                        trim((string)$_POST['quote_text']),
                        $isFeatured,
                        $srId,
                    ]);
                $msg = 'Congratulations Desk entry updated.';
            } else {
                $next = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM placement_stories')->fetchColumn()) + 1;
                $pdo->prepare('INSERT INTO placement_stories (entry_type, headline, student_name, batch_year, branch, company, role_title, package_lpa, photo_url, quote_text, is_featured, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                    ->execute([
                        $entryType,
                        $headline,
                        trim((string)$_POST['student_name']),
                        trim((string)$_POST['batch_year']),
                        trim((string)$_POST['branch']),
                        trim((string)$_POST['company']),
                        trim((string)$_POST['role_title']),
                        trim((string)$_POST['package_lpa']),
                        $photoUrl,
                        trim((string)$_POST['quote_text']),
                        $isFeatured,
                        $next,
                    ]);
                $msg = 'Congratulations Desk student entry added.';
            }
        }
    } elseif ($canPlacements && $action === 'move_story' && !empty($_POST['id'])) {
        $tab = 'placements';
        $section = 'congratulations';
        swapSortOrder($pdo, 'placement_stories', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up', null, null, 'id ASC');
        $msg = 'Congratulations Desk order updated.';
    } elseif ($canPlacements && $action === 'delete_story' && !empty($_POST['id'])) {
        $tab = 'placements';
        $section = 'congratulations';
        $pdo->prepare('DELETE FROM placement_stories WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Congratulations Desk entry removed.';
    } elseif ($canPlacements && $action === 'save_drive') {
        $tab = 'placements';
        $section = 'drives';
        $idx = isset($_POST['drive_idx']) && $_POST['drive_idx'] !== '' ? (int)$_POST['drive_idx'] : -1;
        $newDrive = [
            'id'               => ($idx >= 0 && isset($drives[$idx]['id'])) ? $drives[$idx]['id'] : ('drv-' . time()),
            'company'          => trim((string)($_POST['company'] ?? '')),
            'roleTitle'        => trim((string)($_POST['roleTitle'] ?? '')),
            'packageLpa'       => trim((string)($_POST['packageLpa'] ?? '')),
            'eligibleBranches' => trim((string)($_POST['eligibleBranches'] ?? '')),
            'driveDate'        => trim((string)($_POST['driveDate'] ?? '')),
            'venue'            => trim((string)($_POST['venue'] ?? '')),
            'status'           => trim((string)($_POST['status'] ?? 'Upcoming')),
            'registrationUrl'  => trim((string)($_POST['registrationUrl'] ?? '')),
        ];
        if ($newDrive['company'] === '') {
            $err = 'Company name is required for a campus drive.';
        } else {
            if ($idx >= 0 && isset($drives[$idx])) {
                $drives[$idx] = $newDrive;
                $msg = 'Campus placement drive updated.';
            } else {
                $drives[] = $newDrive;
                $msg = 'Campus placement drive added.';
            }
            saveKvArray($pdo, 'placement_upcoming_drives', $drives);
        }
    } elseif ($canPlacements && $action === 'move_drive') {
        $tab = 'placements';
        $section = 'drives';
        $idx = (int)($_POST['drive_idx'] ?? -1);
        $swap = $idx + (($_POST['dir'] ?? 'up') === 'down' ? 1 : -1);
        if (isset($drives[$idx], $drives[$swap])) {
            $tmp = $drives[$idx];
            $drives[$idx] = $drives[$swap];
            $drives[$swap] = $tmp;
            saveKvArray($pdo, 'placement_upcoming_drives', $drives);
            $msg = 'Campus drive order updated.';
        }
    } elseif ($canPlacements && $action === 'delete_drive') {
        $tab = 'placements';
        $section = 'drives';
        $idx = (int)($_POST['drive_idx'] ?? -1);
        if (isset($drives[$idx])) {
            array_splice($drives, $idx, 1);
            saveKvArray($pdo, 'placement_upcoming_drives', $drives);
            $msg = 'Campus drive deleted.';
        }
    } elseif ($canPlacements && $action === 'save_custom_section') {
        $tab = 'placements';
        $section = 'custom_data';
        $csId = (int)($_POST['custom_id'] ?? 0);
        $csTitle = trim((string)($_POST['title'] ?? ''));
        $csSubtitle = trim((string)($_POST['subtitle'] ?? ''));
        $csType = (string)($_POST['section_type'] ?? 'table');
        if (!in_array($csType, ['table', 'cards', 'brochure', 'html'], true)) {
            $csType = 'table';
        }
        $csHtml = (string)($_POST['html_content'] ?? '');
        $csPayload = trim((string)($_POST['payload_json'] ?? ''));
        $csCtaLabel = trim((string)($_POST['cta_label'] ?? ''));
        $csCtaUrl = trim((string)($_POST['cta_url'] ?? ''));
        if (!empty($_FILES['custom_doc_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['custom_doc_file'], __DIR__ . '/../uploads', 'document');
            if (!$up['ok']) {
                $err = $up['error'];
            } else {
                $csCtaUrl = $up['file_url'];
            }
        }
        $isPublished = !empty($_POST['is_published']) ? 1 : 0;

        if ($err === '') {
            if ($csTitle === '') {
                $err = 'Custom section title is required.';
            } else {
                if ($csPayload !== '') {
                    $decoded = json_decode($csPayload, true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        $err = 'Invalid JSON structure in table/cards payload.';
                    } else {
                        $csPayload = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    }
                }
            }
        }
        if ($err === '') {
            if ($csId > 0) {
                $pdo->prepare('UPDATE placement_custom_sections SET title=?, subtitle=?, section_type=?, html_content=?, payload_json=?, cta_label=?, cta_url=?, is_published=? WHERE id=?')
                    ->execute([$csTitle, $csSubtitle, $csType, $csHtml, $csPayload, $csCtaLabel, $csCtaUrl, $isPublished, $csId]);
                logAudit($pdo, $user, 'UPDATE_PLACEMENT_CUSTOM', 'Placements Custom', $csTitle);
                $msg = 'Custom placement section updated.';
            } else {
                $next = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM placement_custom_sections')->fetchColumn()) + 1;
                $pdo->prepare('INSERT INTO placement_custom_sections (title, subtitle, section_type, html_content, payload_json, cta_label, cta_url, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?)')
                    ->execute([$csTitle, $csSubtitle, $csType, $csHtml, $csPayload, $csCtaLabel, $csCtaUrl, $isPublished, $next]);
                logAudit($pdo, $user, 'ADD_PLACEMENT_CUSTOM', 'Placements Custom', $csTitle);
                $msg = 'Custom placement section added.';
            }
        }
    } elseif ($canPlacements && $action === 'move_custom_section' && !empty($_POST['id'])) {
        $tab = 'placements';
        $section = 'custom_data';
        swapSortOrder($pdo, 'placement_custom_sections', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up', null, null, 'id ASC');
        $msg = 'Custom section order updated.';
    } elseif ($canPlacements && $action === 'toggle_custom_section' && !empty($_POST['id'])) {
        $tab = 'placements';
        $section = 'custom_data';
        $pdo->prepare('UPDATE placement_custom_sections SET is_published = 1 - is_published WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Custom section visibility toggled.';
    } elseif ($canPlacements && $action === 'delete_custom_section' && !empty($_POST['id'])) {
        $tab = 'placements';
        $section = 'custom_data';
        $pdo->prepare('DELETE FROM placement_custom_sections WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Custom placement section deleted.';
    } elseif ($canGrievances && $action === 'update_grievance' && !empty($_POST['id'])) {
        $tab = 'grievances';
        $pdo->prepare('UPDATE grievances SET status = ?, resolution_note = ?, updated_at = ? WHERE id = ?')
            ->execute([trim((string)$_POST['status']), trim((string)$_POST['resolution_note']), date('Y-m-d H:i'), (int)$_POST['id']]);
        logAudit($pdo, $user, 'UPDATE_GRIEVANCE', 'Grievance', 'Ticket #' . (int)$_POST['id']);
        $msg = 'Grievance ticket status updated.';
    } elseif ($canGrievances && $action === 'delete_grievance' && !empty($_POST['id'])) {
        $tab = 'grievances';
        $pdo->prepare('DELETE FROM grievances WHERE id = ?')->execute([(int)$_POST['id']]);
        logAudit($pdo, $user, 'DELETE_GRIEVANCE', 'Grievance', 'Ticket #' . (int)$_POST['id']);
        $msg = 'Grievance ticket deleted.';
    } elseif ($canGrievances && $action === 'save_grievance_config') {
        $tab = 'grievances';
        $ombPhoto = trim((string)($_POST['existing_ombudsperson_photo'] ?? ($gCfg['ombudspersonPhoto'] ?? 'assets/images/principal.jpg')));
        if (!empty($_FILES['ombudsperson_photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['ombudsperson_photo'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $ombPhoto = $up['file_url'];
        }
        if ($err === '') {
            $gCfg['heroBadge']             = trim((string)($_POST['heroBadge'] ?? $gCfg['heroBadge']));
            $gCfg['heroTitle']             = trim((string)($_POST['heroTitle'] ?? $gCfg['heroTitle']));
            $gCfg['heroSubtitle']          = trim((string)($_POST['heroSubtitle'] ?? $gCfg['heroSubtitle']));
            $gCfg['ombudspersonName']      = trim((string)($_POST['ombudspersonName'] ?? ''));
            $gCfg['ombudspersonTitle']     = trim((string)($_POST['ombudspersonTitle'] ?? ''));
            $gCfg['ombudspersonEmail']     = trim((string)($_POST['ombudspersonEmail'] ?? ''));
            $gCfg['ombudspersonPhone']     = trim((string)($_POST['ombudspersonPhone'] ?? ''));
            $gCfg['ombudspersonPhoto']     = $ombPhoto;
            $gCfg['antiRaggingSquadPhone'] = trim((string)($_POST['antiRaggingSquadPhone'] ?? ''));
            $gCfg['womenCellOfficer']      = trim((string)($_POST['womenCellOfficer'] ?? ''));
            $gCfg['womenCellPhone']        = trim((string)($_POST['womenCellPhone'] ?? ''));
            $gCfg['ugcUndertakingUrl']     = trim((string)($_POST['ugcUndertakingUrl'] ?? ''));
            $gCfg['charterHtml']           = (string)($_POST['charterHtml'] ?? '');
            saveGrievancePortalConfig($pdo, $gCfg);
            logAudit($pdo, $user, 'UPDATE_GRIEVANCE_CONFIG', 'Grievance Portal', $gCfg['ombudspersonName']);
            $msg = 'SGRC Charter, Ombudsperson & Helpline details saved.';
        }
    } elseif ($canGrievances && $action === 'save_committee_member') {
        $tab = 'grievances';
        $members = is_array($gCfg['committeeMembers'] ?? null) ? $gCfg['committeeMembers'] : [];
        $idx = isset($_POST['member_idx']) && $_POST['member_idx'] !== '' ? (int)$_POST['member_idx'] : -1;
        $mPhoto = trim((string)($_POST['existing_member_photo'] ?? 'assets/images/principal.jpg'));
        if (!empty($_FILES['member_photo']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['member_photo'], __DIR__ . '/../uploads', 'photo');
            if (!$up['ok']) $err = $up['error'];
            else $mPhoto = $up['file_url'];
        }
        if ($err === '') {
            $mRow = [
                'id'          => ($idx >= 0 && isset($members[$idx]['id'])) ? $members[$idx]['id'] : ('sgrc-' . time()),
                'name'        => trim((string)($_POST['name'] ?? '')),
                'role'        => trim((string)($_POST['role'] ?? 'SGRC Member')),
                'designation' => trim((string)($_POST['designation'] ?? '')),
                'department'  => trim((string)($_POST['department'] ?? '')),
                'email'       => trim((string)($_POST['email'] ?? '')),
                'phone'       => trim((string)($_POST['phone'] ?? '')),
                'photoUrl'    => $mPhoto,
            ];
            if ($idx >= 0 && isset($members[$idx])) {
                $members[$idx] = $mRow;
                $msg = 'SGRC committee member updated.';
            } else {
                $members[] = $mRow;
                $msg = 'SGRC committee member added.';
            }
            $gCfg['committeeMembers'] = $members;
            saveGrievancePortalConfig($pdo, $gCfg);
        }
    } elseif ($canGrievances && $action === 'move_committee_member') {
        $tab = 'grievances';
        $members = is_array($gCfg['committeeMembers'] ?? null) ? $gCfg['committeeMembers'] : [];
        $idx = (int)($_POST['member_idx'] ?? -1);
        $swap = $idx + (($_POST['dir'] ?? 'up') === 'down' ? 1 : -1);
        if (isset($members[$idx], $members[$swap])) {
            $tmp = $members[$idx];
            $members[$idx] = $members[$swap];
            $members[$swap] = $tmp;
            $gCfg['committeeMembers'] = $members;
            saveGrievancePortalConfig($pdo, $gCfg);
            $msg = 'Committee member order updated.';
        }
    } elseif ($canGrievances && $action === 'delete_committee_member') {
        $tab = 'grievances';
        $members = is_array($gCfg['committeeMembers'] ?? null) ? $gCfg['committeeMembers'] : [];
        $idx = (int)($_POST['member_idx'] ?? -1);
        if (isset($members[$idx])) {
            array_splice($members, $idx, 1);
            $gCfg['committeeMembers'] = $members;
            saveGrievancePortalConfig($pdo, $gCfg);
            $msg = 'Committee member removed.';
        }
    } elseif ($canGrievances && $action === 'save_feedback_section') {
        $tab = 'feedback';
        $fbSecId = (int)($_POST['fb_section_id'] ?? 0);
        $secName = trim((string)($_POST['section_name'] ?? ''));
        $slugRaw = trim((string)($_POST['slug'] ?? ''));
        $slug = normalizePhpSlug($slugRaw !== '' ? $slugRaw : $secName);
        if ($slug === '') $slug = 'section-' . random_int(100, 999);
        $subsRaw = trim((string)($_POST['subsections_raw'] ?? ''));
        $subsArr = array_values(array_filter(array_map('trim', preg_split('/[\r\n,]+/', $subsRaw) ?: [])));
        $recEmails = trim((string)($_POST['recipient_emails'] ?? ''));
        $ccEmails = trim((string)($_POST['cc_emails'] ?? ''));
        $inchargeName = trim((string)($_POST['incharge_name'] ?? ''));
        $inchargeDesig = trim((string)($_POST['incharge_designation'] ?? ''));
        $slaDays = max(1, min(60, (int)($_POST['sla_days'] ?? 5)));
        $autoEmail = isset($_POST['auto_email_enabled']) ? 1 : 0;
        $isActive = isset($_POST['is_active']) ? 1 : 0;

        if ($secName === '' || $recEmails === '') {
            $err = 'Section Name and at least one Recipient Email are required.';
        } elseif ($fbSecId > 0) {
            $pdo->prepare('UPDATE feedback_sections SET slug=?, section_name=?, subsections_json=?, recipient_emails=?, cc_emails=?, incharge_name=?, incharge_designation=?, sla_days=?, auto_email_enabled=?, is_active=? WHERE id=?')
                ->execute([$slug, $secName, json_encode($subsArr, JSON_UNESCAPED_UNICODE), $recEmails, $ccEmails, $inchargeName, $inchargeDesig, $slaDays, $autoEmail, $isActive, $fbSecId]);
            logAudit($pdo, $user, 'UPDATE_FEEDBACK_SECTION', 'Feedback Routing', $secName);
            $msg = 'Feedback section & email routing updated.';
        } else {
            $next = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM feedback_sections')->fetchColumn()) + 1;
            $pdo->prepare('INSERT INTO feedback_sections (slug, section_name, subsections_json, recipient_emails, cc_emails, incharge_name, incharge_designation, sla_days, auto_email_enabled, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([$slug, $secName, json_encode($subsArr, JSON_UNESCAPED_UNICODE), $recEmails, $ccEmails, $inchargeName, $inchargeDesig, $slaDays, $autoEmail, $isActive, $next]);
            logAudit($pdo, $user, 'ADD_FEEDBACK_SECTION', 'Feedback Routing', $secName);
            $msg = 'Feedback section & email routing added.';
        }
    } elseif ($canGrievances && $action === 'move_feedback_section' && !empty($_POST['id'])) {
        $tab = 'feedback';
        swapSortOrder($pdo, 'feedback_sections', (int)$_POST['id'], ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up', null, null, 'id ASC');
        $msg = 'Feedback section order updated.';
    } elseif ($canGrievances && $action === 'toggle_feedback_section' && !empty($_POST['id'])) {
        $tab = 'feedback';
        $pdo->prepare('UPDATE feedback_sections SET is_active = 1 - is_active WHERE id = ?')->execute([(int)$_POST['id']]);
        $msg = 'Feedback section active status toggled.';
    } elseif ($canGrievances && $action === 'delete_feedback_section' && !empty($_POST['id'])) {
        $tab = 'feedback';
        $pdo->prepare('DELETE FROM feedback_sections WHERE id = ?')->execute([(int)$_POST['id']]);
        logAudit($pdo, $user, 'DELETE_FEEDBACK_SECTION', 'Feedback Routing', 'ID #' . (int)$_POST['id']);
        $msg = 'Feedback section deleted.';
    } elseif ($canGrievances && $action === 'update_feedback_entry' && !empty($_POST['id'])) {
        $tab = 'feedback';
        $st = in_array($_POST['status'] ?? 'New', ['New', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'], true) ? (string)$_POST['status'] : 'New';
        $note = trim((string)($_POST['action_taken_note'] ?? ''));
        $pdo->prepare('UPDATE feedback_entries SET status = ?, action_taken_note = ?, updated_at = ? WHERE id = ?')
            ->execute([$st, $note, date('Y-m-d H:i'), (int)$_POST['id']]);
        logAudit($pdo, $user, 'UPDATE_FEEDBACK_ENTRY', 'Feedback Ticket', 'ID #' . (int)$_POST['id'] . ' -> ' . $st);
        $msg = 'Feedback ticket status & action remarks updated.';
    } elseif ($canGrievances && $action === 'repush_feedback_email' && !empty($_POST['id'])) {
        $tab = 'feedback';
        $st = $pdo->prepare('SELECT * FROM feedback_entries WHERE id = ? LIMIT 1');
        $st->execute([(int)$_POST['id']]);
        $entry = $st->fetch();
        if ($entry) {
            $secStmt = $pdo->prepare('SELECT recipient_emails, cc_emails FROM feedback_sections WHERE id = ? LIMIT 1');
            $secStmt->execute([(int)$entry['section_id']]);
            $secRow = $secStmt->fetch();
            $toCsv = $secRow ? (string)$secRow['recipient_emails'] : (string)$entry['routed_to_emails'];
            $ccCsv = $secRow ? (string)$secRow['cc_emails'] : '';
            $body = "MANUAL ADMIN RE-DISPATCH — FEEDBACK TICKET {$entry['tracking_code']}\n"
                . "Section: {$entry['section_name']} -> {$entry['subsection']}\n"
                . "Type: {$entry['submission_type']} · Rating: {$entry['rating']}/5 · Status: {$entry['status']}\n"
                . "Subject: {$entry['subject']}\n\n{$entry['message']}\n";
            $res = cms_dispatch_and_log_email(
                $pdo,
                'feedback_repush',
                $toCsv,
                "[Re-Dispatched · {$entry['section_name']}] {$entry['tracking_code']}: {$entry['subject']}",
                $body,
                'Re-Push Ticket: ' . $entry['tracking_code'],
                $ccCsv
            );
            $dStat = in_array($res['status'] ?? '', ['sent', 'queued', 'failed'], true) ? (string)$res['status'] : 'queued';
            $pdo->prepare('UPDATE feedback_entries SET email_dispatch_status = ?, email_dispatch_detail = ? WHERE id = ?')
                ->execute([$dStat, substr((string)($res['detail'] ?? ''), 0, 400), (int)$entry['id']]);
            if ($res['ok']) $msg = 'Feedback notification email re-sent: ' . $res['detail'];
            else $err = 'Email dispatch notice: ' . ($res['detail'] ?? 'Check Email Push Config in Log Analyzer & Email Push.');
        }
    } elseif ($canGrievances && $action === 'delete_feedback_entry' && !empty($_POST['id'])) {
        $tab = 'feedback';
        $pdo->prepare('DELETE FROM feedback_entries WHERE id = ?')->execute([(int)$_POST['id']]);
        logAudit($pdo, $user, 'DELETE_FEEDBACK_ENTRY', 'Feedback Ticket', 'ID #' . (int)$_POST['id']);
        $msg = 'Feedback entry deleted.';
    }
}

$settings = getSiteSettings($pdo);
$summary = [
    'summaryNote'      => '',
    'coordinatorName'  => 'Dr. S. B. Kulkarni',
    'coordinatorEmail' => 'tnp@coe.sveri.ac.in',
    'coordinatorPhone' => '+91-02186-216063',
    'brochureUrl'      => '',
    'brochureLabel'    => 'Download T&P Brochure (PDF)',
    'recruiters'       => $settings['recruiters'] ?? '',
];
$rawSum = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'placements_summary' LIMIT 1")->fetchColumn();
if ($rawSum) {
    $dec = json_decode((string)$rawSum, true);
    if (is_array($dec)) $summary = array_merge($summary, array_filter($dec, static fn($v) => $v !== null));
}

$stats = $pdo->query('SELECT * FROM placement_stats ORDER BY sort_order ASC, id ASC')->fetchAll();
$stories = $pdo->query('SELECT * FROM placement_stories ORDER BY sort_order ASC, id ASC')->fetchAll();
$notices = $pdo->query('SELECT * FROM placement_notices ORDER BY is_pinned DESC, sort_order ASC, id DESC')->fetchAll();
$customSections = $pdo->query('SELECT * FROM placement_custom_sections ORDER BY sort_order ASC, id ASC')->fetchAll();
$grievances = $pdo->query('SELECT * FROM grievances ORDER BY id DESC')->fetchAll();
$feedbackSections = getFeedbackSections($pdo, false);
$feedbackEntries = $pdo->query('SELECT * FROM feedback_entries ORDER BY id DESC')->fetchAll() ?: [];
$editingFbSec = null;
if (!empty($_GET['edit_fb_sec'])) {
    foreach ($feedbackSections as $fs) {
        if ((int)$fs['id'] === (int)$_GET['edit_fb_sec']) {
            $editingFbSec = $fs;
            break;
        }
    }
}
$fbStatusFilter = trim((string)($_GET['fb_status'] ?? 'All'));
$fbSecFilter = (int)($_GET['fb_sec'] ?? 0);
$filteredFeedback = array_values(array_filter($feedbackEntries, static function (array $fe) use ($fbStatusFilter, $fbSecFilter): bool {
    if ($fbStatusFilter !== 'All' && ($fe['status'] ?? '') !== $fbStatusFilter) return false;
    if ($fbSecFilter > 0 && (int)($fe['section_id'] ?? 0) !== $fbSecFilter) return false;
    return true;
}));

$gStatusFilter = trim((string)($_GET['g_status'] ?? 'All'));
$filteredGrievances = $gStatusFilter === 'All'
    ? $grievances
    : array_values(array_filter($grievances, static fn(array $r): bool => ($r['status'] ?? '') === $gStatusFilter));

$editingStat = null;
if (!empty($_GET['edit_stat'])) {
    foreach ($stats as $st) {
        if ((int)$st['id'] === (int)$_GET['edit_stat']) {
            $editingStat = $st;
            break;
        }
    }
}
$editingNotice = null;
if (!empty($_GET['edit_notice'])) {
    foreach ($notices as $nr) {
        if ((int)$nr['id'] === (int)$_GET['edit_notice']) {
            $editingNotice = $nr;
            break;
        }
    }
}
$editingStory = null;
if (!empty($_GET['edit_story'])) {
    foreach ($stories as $sr) {
        if ((int)$sr['id'] === (int)$_GET['edit_story']) {
            $editingStory = $sr;
            break;
        }
    }
}
$editDriveIdx = isset($_GET['edit_drive']) && $_GET['edit_drive'] !== '' ? (int)$_GET['edit_drive'] : -1;
$editingDrive = ($editDriveIdx >= 0 && isset($drives[$editDriveIdx])) ? $drives[$editDriveIdx] : null;

$editingCustom = null;
if (!empty($_GET['edit_custom'])) {
    foreach ($customSections as $cs) {
        if ((int)$cs['id'] === (int)$_GET['edit_custom']) {
            $editingCustom = $cs;
            break;
        }
    }
}

$members = is_array($gCfg['committeeMembers'] ?? null) ? $gCfg['committeeMembers'] : [];
$editMemberIdx = isset($_GET['edit_member']) ? (int)$_GET['edit_member'] : -1;
$editingMember = ($editMemberIdx >= 0 && isset($members[$editMemberIdx])) ? $members[$editMemberIdx] : null;

$noticePresets = placementNoticeCategoryPresets();
$congratsPresets = placementCongratulationTypePresets();

$adminPageTitle = 'Placements Portal (T&P) & SGRC Grievance Desk';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:0.85rem;">
  <div class="admin-subtabs" style="margin-bottom:0;">
    <?php if ($canPlacements): ?>
      <a href="?tab=placements" class="admin-subtab <?= $tab === 'placements' ? 'is-active' : '' ?>">Placements Portal (T&amp;P)</a>
    <?php endif; ?>
    <?php if ($canGrievances): ?>
      <a href="?tab=grievances" class="admin-subtab <?= $tab === 'grievances' ? 'is-active' : '' ?>">Grievance &amp; Anti-Ragging (<?= count($grievances) ?>)</a>
      <a href="?tab=feedback" class="admin-subtab <?= $tab === 'feedback' ? 'is-active' : '' ?>">Feedback Cell &amp; Email Routing (<?= count($feedbackEntries) ?>)</a>
    <?php endif; ?>
  </div>
  <?php
    $livePortalHref = $tab === 'grievances' ? 'grievance.php' : ($tab === 'feedback' ? 'feedback.php' : 'placements.php');
    $livePortalLbl = $tab === 'grievances' ? 'View Live Grievance Portal' : ($tab === 'feedback' ? 'View Live Feedback Portal' : 'View Live Placements Portal');
  ?>
  <a href="<?= e(baseUrl($livePortalHref)) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm">
    <?= e($livePortalLbl) ?> &#8599;
  </a>
</div>

<?php if ($msg): ?><div class="alert-ok"><?= e($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="alert-err"><?= e($err) ?></div><?php endif; ?>

<?php if ($tab === 'placements' && $canPlacements): ?>
  <!-- 5-Tab Placements Management Sub-Navigation -->
  <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1.15rem;padding:0.55rem;background:#F5F5F4;border:1px solid #E7E5E4;border-radius:10px;">
    <?php
      $plSections = [
          'stats'           => '1. T&P Overview & Branch Stats (' . count($stats) . ')',
          'notices'         => '2. Student Notices & Info (' . count($notices) . ')',
          'congratulations' => '3. Congratulations Desk (' . count($stories) . ')',
          'drives'          => '4. Campus Drives & Recruiters (' . count($drives) . ')',
          'custom_data'     => '5. Custom Placement Data (' . count($customSections) . ')',
      ];
      foreach ($plSections as $sKey => $sLabel):
    ?>
      <a href="?tab=placements&section=<?= e($sKey) ?>"
         style="padding:0.45rem 0.8rem;border-radius:7px;font-size:0.8rem;font-weight:700;text-decoration:none;<?= $section === $sKey ? 'background:var(--primary-color);color:#fff;' : 'background:#fff;color:#44403C;border:1px solid #D6D3D1;' ?>">
        <?= e($sLabel) ?>
      </a>
    <?php endforeach; ?>
  </div>

  <?php if ($section === 'stats'): ?>
    <!-- Section 1: T&P Overview, Brochure PDF Upload & Branch Statistics -->
    <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
      <h2 style="margin-top:0;">T&amp;P Coordinator Profile, Summary &amp; Placement Brochure PDF</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_placement_summary">
      <div class="grid-3" style="margin-bottom:0.6rem;">
        <label style="font-size:0.8rem;font-weight:600;">T&amp;P Officer Name
          <input type="text" name="coordinatorName" value="<?= e((string)$summary['coordinatorName']) ?>" style="width:100%;padding:0.5rem;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Official Desk Email
          <input type="email" name="coordinatorEmail" value="<?= e((string)$summary['coordinatorEmail']) ?>" style="width:100%;padding:0.5rem;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Direct Phone / Extension
          <input type="text" name="coordinatorPhone" value="<?= e((string)$summary['coordinatorPhone']) ?>" style="width:100%;padding:0.5rem;">
        </label>
      </div>
      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.6rem;">T&amp;P Vision &amp; Placement Track Summary
        <textarea name="summaryNote" rows="2" style="width:100%;padding:0.5rem;margin-top:3px;"><?= e((string)$summary['summaryNote']) ?></textarea>
      </label>

      <div style="border:1px solid var(--border-color);border-radius:8px;padding:0.85rem;background:#FAFAF9;margin-bottom:0.75rem;">
        <div class="grid-3" style="align-items:end;">
          <label style="font-size:0.8rem;font-weight:600;">Brochure Button Label
            <input type="text" name="brochureLabel" value="<?= e((string)($summary['brochureLabel'] ?? 'Download T&P Brochure (PDF)')) ?>" style="width:100%;padding:0.45rem;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Brochure PDF Path or External URL
            <input type="text" name="brochureUrl" value="<?= e((string)($summary['brochureUrl'] ?? '')) ?>" placeholder="uploads/tp-brochure.pdf or https://..." style="width:100%;padding:0.45rem;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Upload Brochure PDF / Doc
            <input type="file" name="brochure_file" accept=".pdf,.doc,.docx" style="width:100%;">
          </label>
        </div>
        <?php if (!empty($summary['brochureUrl'])): ?>
          <label style="display:inline-flex;align-items:center;gap:0.35rem;margin-top:0.5rem;font-size:0.78rem;color:#B91C1C;font-weight:600;">
            <input type="checkbox" name="clear_brochure" value="1"> Remove attached brochure link
          </label>
        <?php endif; ?>
      </div>

      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.65rem;">Esteemed Recruiters List (comma-separated)
        <input type="text" name="recruiters" value="<?= e((string)($summary['recruiters'] ?? '')) ?>" style="width:100%;padding:0.5rem;margin-top:3px;">
      </label>
      <button type="submit" class="btn-primary">Save T&amp;P Overview &amp; Brochure</button>
    </form>

    <form method="post" class="card" style="margin-bottom:1.25rem;">
      <h2 style="margin-top:0;"><?= $editingStat ? 'Edit Branch Statistic: ' . e($editingStat['branch']) : 'Add Branch-Wise Placement Statistic' ?></h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_stat">
      <input type="hidden" name="id" value="<?= (int)($editingStat['id'] ?? 0) ?>">
      <div class="grid-4" style="margin-bottom:0.55rem;">
        <input type="text" name="academic_year" required value="<?= e((string)($editingStat['academic_year'] ?? '2025-26')) ?>" placeholder="Academic Year *" style="padding:0.5rem;">
        <input type="text" name="branch" required value="<?= e((string)($editingStat['branch'] ?? '')) ?>" placeholder="Branch / Department *" style="padding:0.5rem;">
        <input type="number" name="eligible_students" required value="<?= (int)($editingStat['eligible_students'] ?? 0) ?>" placeholder="Eligible Count" style="padding:0.5rem;">
        <input type="number" name="placed_students" required value="<?= (int)($editingStat['placed_students'] ?? 0) ?>" placeholder="Placed Count" style="padding:0.5rem;">
        <input type="number" step="0.01" name="highest_package_lpa" required value="<?= e((string)($editingStat['highest_package_lpa'] ?? '')) ?>" placeholder="Highest LPA" style="padding:0.5rem;">
        <input type="number" step="0.01" name="average_package_lpa" required value="<?= e((string)($editingStat['average_package_lpa'] ?? '')) ?>" placeholder="Average LPA" style="padding:0.5rem;">
        <input type="text" name="top_recruiters_list" value="<?= e((string)($editingStat['top_recruiters_list'] ?? '')) ?>" placeholder="Top Recruiting Companies" style="grid-column:span 2;padding:0.5rem;">
      </div>
      <button type="submit" class="btn-primary"><?= $editingStat ? 'Update Branch Statistic' : 'Add Branch Statistic' ?></button>
      <?php if ($editingStat): ?><a href="?tab=placements&section=stats" class="btn-outline" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <div class="card">
      <h2 style="margin-top:0;">Published Branch-Wise Placement Statistics (<?= count($stats) ?>)</h2>
      <div class="cms-table-wrap">
        <table class="cms-table cms-table-navy">
          <thead>
            <tr><th>Order</th><th>Year</th><th>Branch</th><th>Eligible</th><th>Placed</th><th>%</th><th>Highest / Avg (LPA)</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <?php foreach ($stats as $st):
              $el = max(0, (int)$st['eligible_students']);
              $pl = max(0, (int)$st['placed_students']);
              $pct = $el > 0 ? round(($pl / $el) * 100, 1) : 0.0;
            ?>
              <tr>
                <td>
                  <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_stat"><input type="hidden" name="id" value="<?= (int)$st['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
                </td>
                <td><?= e($st['academic_year']) ?></td>
                <td><strong><?= e($st['branch']) ?></strong></td>
                <td><?= $el ?></td>
                <td><strong><?= $pl ?></strong></td>
                <td><strong><?= e((string)$pct) ?>%</strong></td>
                <td><?= e((string)$st['highest_package_lpa']) ?> / <?= e((string)$st['average_package_lpa']) ?> LPA</td>
                <td style="white-space:nowrap;">
                  <a href="?tab=placements&section=stats&edit_stat=<?= (int)$st['id'] ?>" class="btn-primary btn-sm">Edit</a>
                  <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_stat"><input type="hidden" name="id" value="<?= (int)$st['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>

  <?php elseif ($section === 'notices'): ?>
    <!-- Section 2: Student Notices & T&P Information Desk -->
    <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
      <h2 style="margin-top:0;"><?= $editingNotice ? 'Edit Student Notice' : 'Publish Student Notice / T&P Circular' ?></h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_notice">
      <input type="hidden" name="notice_id" value="<?= (int)($editingNotice['id'] ?? 0) ?>">

      <div class="grid-3" style="margin-bottom:0.55rem;">
        <label style="font-size:0.8rem;font-weight:600;grid-column:span 2;">Notice Title *
          <input type="text" name="title" required value="<?= e((string)($editingNotice['title'] ?? '')) ?>" placeholder="e.g. Infosys SP/DSE Campus Drive — Registration Circular" style="width:100%;padding:0.5rem;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Notice Date *
          <input type="date" name="notice_date" required value="<?= e((string)($editingNotice['notice_date'] ?? date('Y-m-d'))) ?>" style="width:100%;padding:0.5rem;">
        </label>
      </div>

      <div class="grid-3" style="margin-bottom:0.5rem;">
        <label style="font-size:0.8rem;font-weight:600;">Category (Select Preset or Type Custom)
          <input type="text" id="notice-cat-input" name="category" list="notice-cat-presets" required value="<?= e((string)($editingNotice['category'] ?? 'Campus Drive Circular')) ?>" style="width:100%;padding:0.5rem;">
          <datalist id="notice-cat-presets">
            <?php foreach ($noticePresets as $np): ?>
              <option value="<?= e($np) ?>">
            <?php endforeach; ?>
          </datalist>
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Circular Button Label (Optional)
          <input type="text" name="link_label" value="<?= e((string)($editingNotice['link_label'] ?? '')) ?>" placeholder="View Eligibility Circular" style="width:100%;padding:0.5rem;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Attachment URL / Uploaded File Path
          <input type="text" name="attachment_url" value="<?= e((string)($editingNotice['attachment_url'] ?? '')) ?>" placeholder="https://... or uploads/..." style="width:100%;padding:0.5rem;">
        </label>
      </div>

      <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.65rem;">
        <small style="color:var(--text-muted);align-self:center;">Quick Category Presets:</small>
        <?php foreach ($noticePresets as $np): ?>
          <button type="button" class="btn-outline btn-sm" style="padding:2px 8px;font-size:0.74rem;" onclick="document.getElementById('notice-cat-input').value=this.textContent"><?= e($np) ?></button>
        <?php endforeach; ?>
      </div>

      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.55rem;">Notice Details / Student Instructions
        <textarea name="summary" rows="3" placeholder="Eligibility criteria, reporting venue, deadline, and documents required..." style="width:100%;padding:0.5rem;margin-top:3px;"><?= e((string)($editingNotice['summary'] ?? '')) ?></textarea>
      </label>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:0.75rem;">
        <label style="font-size:0.8rem;font-weight:600;">Upload Circular PDF / Doc (Optional):
          <input type="file" name="notice_file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
        </label>
        <label style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;font-weight:700;color:#B45309;">
          <input type="checkbox" name="is_pinned" value="1" <?= !empty($editingNotice['is_pinned']) ? 'checked' : '' ?>>
          Pin as Priority Notice (Shown at Top)
        </label>
      </div>
      <?php if (!empty($editingNotice['attachment_url'])): ?>
        <label style="display:inline-flex;align-items:center;gap:0.35rem;margin-bottom:0.65rem;font-size:0.78rem;color:#B91C1C;font-weight:600;">
          <input type="checkbox" name="clear_notice_file" value="1"> Remove current circular attachment
        </label><br>
      <?php endif; ?>

      <button type="submit" class="btn-primary"><?= $editingNotice ? 'Update Notice' : 'Publish Notice' ?></button>
      <?php if ($editingNotice): ?><a href="?tab=placements&section=notices" class="btn-outline" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <div class="card">
      <h2 style="margin-top:0;">Published Student Notices &amp; Circulars (<?= count($notices) ?>)</h2>
      <?php if (empty($notices)): ?>
        <p style="color:#78716C;">No placement notices published yet.</p>
      <?php else: ?>
        <?php foreach ($notices as $nr): ?>
          <div class="admin-list-row">
            <div style="flex:1;padding-right:0.75rem;">
              <div style="font-size:0.74rem;font-weight:700;color:var(--secondary-color);text-transform:uppercase;">
                <?= !empty($nr['is_pinned']) ? '[PINNED] ' : '' ?><?= e((string)$nr['category']) ?> · <?= e((string)$nr['notice_date']) ?>
              </div>
              <strong><?= e((string)$nr['title']) ?></strong>
              <?php if (!empty($nr['summary'])): ?>
                <div style="font-size:0.8rem;color:#57534E;margin-top:2px;"><?= e(mb_strimwidth((string)$nr['summary'], 0, 160, '...')) ?></div>
              <?php endif; ?>
            </div>
            <div style="display:flex;gap:0.4rem;flex-shrink:0;">
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_notice"><input type="hidden" name="id" value="<?= (int)$nr['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
              <a href="?tab=placements&section=notices&edit_notice=<?= (int)$nr['id'] ?>" class="btn-primary btn-sm">Edit</a>
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_notice"><input type="hidden" name="id" value="<?= (int)$nr['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
            </div>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>

  <?php elseif ($section === 'congratulations'): ?>
    <!-- Section 3: Congratulations Desk with 1:1 Student Photographs -->
    <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
      <h2 style="margin-top:0;"><?= $editingStory ? 'Edit Congratulations Entry: ' . e($editingStory['student_name']) : 'Add Student to Congratulations Desk (With 1:1 Auto-Crop Photo)' ?></h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_story">
      <input type="hidden" name="story_id" value="<?= (int)($editingStory['id'] ?? 0) ?>">
      <input type="hidden" name="existing_photo" value="<?= e((string)($editingStory['photo_url'] ?? 'assets/images/principal.jpg')) ?>">

      <div class="grid-3" style="margin-bottom:0.5rem;">
        <label style="font-size:0.8rem;font-weight:600;">Recognition Type (Preset or Custom)
          <input type="text" id="congrats-type-input" name="entry_type" list="congrats-type-presets" required value="<?= e((string)($editingStory['entry_type'] ?? 'Campus Placement')) ?>" style="width:100%;padding:0.5rem;">
          <datalist id="congrats-type-presets">
            <?php foreach ($congratsPresets as $cp): ?>
              <option value="<?= e($cp) ?>">
            <?php endforeach; ?>
          </datalist>
        </label>
        <label style="font-size:0.8rem;font-weight:600;grid-column:span 2;">Congratulatory Headline
          <input type="text" name="headline" value="<?= e((string)($editingStory['headline'] ?? '')) ?>" placeholder="e.g. Dream Offer at Deloitte India / National Winner — SIH 2026" style="width:100%;padding:0.5rem;">
        </label>
      </div>

      <div style="display:flex;gap:0.35rem;flex-wrap:wrap;margin-bottom:0.65rem;">
        <small style="color:var(--text-muted);align-self:center;">Quick Type Presets:</small>
        <?php foreach ($congratsPresets as $cp): ?>
          <button type="button" class="btn-outline btn-sm" style="padding:2px 8px;font-size:0.74rem;" onclick="document.getElementById('congrats-type-input').value=this.textContent"><?= e($cp) ?></button>
        <?php endforeach; ?>
      </div>

      <div class="grid-3" style="margin-bottom:0.55rem;">
        <input type="text" name="student_name" required value="<?= e((string)($editingStory['student_name'] ?? '')) ?>" placeholder="Student / Team Full Name *" style="padding:0.5rem;">
        <input type="text" name="batch_year" required value="<?= e((string)($editingStory['batch_year'] ?? '2026')) ?>" placeholder="Batch Year (e.g. 2026)" style="padding:0.5rem;">
        <input type="text" name="branch" required value="<?= e((string)($editingStory['branch'] ?? 'CSE')) ?>" placeholder="Branch / Dept" style="padding:0.5rem;">
        <input type="text" name="company" required value="<?= e((string)($editingStory['company'] ?? '')) ?>" placeholder="Company / Awarding Body *" style="padding:0.5rem;">
        <input type="text" name="role_title" required value="<?= e((string)($editingStory['role_title'] ?? '')) ?>" placeholder="Role / Award Title *" style="padding:0.5rem;">
        <input type="text" name="package_lpa" required value="<?= e((string)($editingStory['package_lpa'] ?? '')) ?>" placeholder="Package or Prize (e.g. 14.5 LPA)" style="padding:0.5rem;">
      </div>

      <textarea name="quote_text" rows="2" placeholder="Student quote or faculty commendation note..." style="width:100%;padding:0.5rem;margin-bottom:0.55rem;"><?= e((string)($editingStory['quote_text'] ?? '')) ?></textarea>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:0.75rem;">
        <label style="font-size:0.82rem;font-weight:600;">Student Photograph (1:1 Auto-Crop):
          <input type="file" name="photo" data-aspect="1:1" accept="image/jpeg,image/png,image/webp">
        </label>
        <label style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;font-weight:700;color:var(--primary-color);">
          <input type="checkbox" name="is_featured" value="1" <?= !empty($editingStory['is_featured']) ? 'checked' : '' ?>>
          Highlight as Featured Achiever
        </label>
      </div>

      <button type="submit" class="btn-primary"><?= $editingStory ? 'Update Congratulations Card' : 'Add to Congratulations Desk' ?></button>
      <?php if ($editingStory): ?><a href="?tab=placements&section=congratulations" class="btn-outline" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <div class="card">
      <h2 style="margin-top:0;">Congratulations Desk Entries (<?= count($stories) ?>)</h2>
      <?php foreach ($stories as $sr): ?>
        <div class="admin-list-row">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <img src="<?= e(mediaUrl($sr['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="" style="width:52px;height:52px;border-radius:10px;object-fit:cover;border:1px solid var(--border-color);">
            <div>
              <div style="font-size:0.72rem;font-weight:700;color:var(--secondary-color);text-transform:uppercase;">
                <?= e((string)($sr['entry_type'] ?? 'Campus Placement')) ?><?= !empty($sr['is_featured']) ? ' · FEATURED' : '' ?>
              </div>
              <strong><?= e($sr['student_name']) ?> — <?= e($sr['company']) ?> (<?= e($sr['package_lpa']) ?>)</strong>
              <div style="font-size:0.78rem;color:#78716C;"><?= e($sr['role_title']) ?> · <?= e($sr['branch']) ?> Batch <?= e($sr['batch_year']) ?></div>
            </div>
          </div>
          <div style="display:flex;gap:0.4rem;">
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_story"><input type="hidden" name="id" value="<?= (int)$sr['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
            <a href="?tab=placements&section=congratulations&edit_story=<?= (int)$sr['id'] ?>" class="btn-primary btn-sm">Edit</a>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_story"><input type="hidden" name="id" value="<?= (int)$sr['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

  <?php elseif ($section === 'drives'): ?>
    <!-- Section 4: Upcoming Campus Placement Drives & Recruiters -->
    <div class="card" style="margin-bottom:1.25rem;">
      <h2 style="margin-top:0;">Upcoming &amp; Active Campus Placement Drives (<?= count($drives) ?>)</h2>
      <form method="post" style="background:#FAFAF9;border:1px solid var(--border-color);border-radius:10px;padding:0.9rem;margin-bottom:1rem;">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_drive">
        <input type="hidden" name="drive_idx" value="<?= $editingDrive ? $editDriveIdx : '' ?>">
        <div class="grid-4" style="margin-bottom:0.55rem;">
          <input type="text" name="company" required value="<?= e((string)($editingDrive['company'] ?? '')) ?>" placeholder="Company Name *" style="padding:0.45rem;">
          <input type="text" name="roleTitle" value="<?= e((string)($editingDrive['roleTitle'] ?? '')) ?>" placeholder="Role / Profile" style="padding:0.45rem;">
          <input type="text" name="packageLpa" value="<?= e((string)($editingDrive['packageLpa'] ?? '')) ?>" placeholder="CTC (e.g. 7.0 LPA)" style="padding:0.45rem;">
          <input type="text" name="eligibleBranches" value="<?= e((string)($editingDrive['eligibleBranches'] ?? 'CSE, E&TC, ECS')) ?>" placeholder="Eligible Branches" style="padding:0.45rem;">
          <input type="date" name="driveDate" value="<?= e((string)($editingDrive['driveDate'] ?? date('Y-m-d', strtotime('+10 days')))) ?>" style="padding:0.45rem;">
          <input type="text" name="venue" value="<?= e((string)($editingDrive['venue'] ?? 'Central T&P Auditorium')) ?>" placeholder="Venue" style="padding:0.45rem;">
          <select name="status" style="padding:0.45rem;">
            <?php foreach (['Registrations Open', 'Upcoming', 'Ongoing', 'Completed'] as $ds): ?>
              <option value="<?= e($ds) ?>" <?= ($editingDrive['status'] ?? 'Upcoming') === $ds ? 'selected' : '' ?>><?= e($ds) ?></option>
            <?php endforeach; ?>
          </select>
          <input type="url" name="registrationUrl" value="<?= e((string)($editingDrive['registrationUrl'] ?? '')) ?>" placeholder="Registration URL (Optional)" style="padding:0.45rem;">
        </div>
        <button type="submit" class="btn-primary btn-sm"><?= $editingDrive ? 'Update Drive' : 'Add Campus Drive' ?></button>
        <?php if ($editingDrive): ?><a href="?tab=placements&section=drives" class="btn-outline btn-sm" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
      </form>

      <?php foreach ($drives as $idx => $drv): ?>
        <div class="admin-list-row">
          <div>
            <strong><?= e((string)$drv['company']) ?></strong> · <?= e((string)$drv['roleTitle']) ?> (<?= e((string)$drv['packageLpa']) ?>)
            <div style="font-size:0.78rem;color:#78716C;"><?= e((string)$drv['driveDate']) ?> · <?= e((string)$drv['eligibleBranches']) ?> · <strong style="color:var(--primary-color);"><?= e((string)$drv['status']) ?></strong></div>
          </div>
          <div style="display:flex;gap:0.4rem;">
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_drive"><input type="hidden" name="drive_idx" value="<?= $idx ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
            <a href="?tab=placements&section=drives&edit_drive=<?= $idx ?>" class="btn-primary btn-sm">Edit</a>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_drive"><input type="hidden" name="drive_idx" value="<?= $idx ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <form method="post" class="card">
      <h2 style="margin-top:0;">Esteemed Corporate &amp; Core Industry Recruiters</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_recruiters_only">
      <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.6rem;">Comma-separated list of recruiting partners shown on Placements Portal &amp; Homepage
        <textarea name="recruiters" rows="2" style="width:100%;padding:0.5rem;margin-top:4px;"><?= e((string)($summary['recruiters'] ?? '')) ?></textarea>
      </label>
      <button type="submit" class="btn-primary btn-sm">Save Recruiters Directory</button>
    </form>

  <?php elseif ($section === 'custom_data'): ?>
    <!-- Section 5: Unlimited Custom Placement Data Sections Builder -->
    <?php
      $csEditType = (string)($editingCustom['section_type'] ?? 'table');
      $csRawPayload = (string)($editingCustom['payload_json'] ?? '');
      if ($csRawPayload === '') {
          $csRawPayload = json_encode([
              'headers' => ['Column 1', 'Column 2', 'Column 3'],
              'rows'    => [['Item A', 'Details', 'Metric']],
          ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
      }
    ?>
    <form method="post" enctype="multipart/form-data" id="custom-placement-form" class="card" style="margin-bottom:1.25rem;">
      <h2 style="margin-top:0;"><?= $editingCustom ? 'Edit Custom Placement Section: ' . e((string)$editingCustom['title']) : 'Add Custom Placement Data Section (Table, Cards, Brochure Kit or Rich HTML)' ?></h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_custom_section">
      <input type="hidden" name="custom_id" value="<?= (int)($editingCustom['id'] ?? 0) ?>">
      <input type="hidden" name="payload_json" id="custom-payload-json" value="<?= e($csRawPayload) ?>">

      <div class="grid-3" style="margin-bottom:0.55rem;">
        <label style="font-size:0.8rem;font-weight:600;">Section Heading *
          <input type="text" name="title" required value="<?= e((string)($editingCustom['title'] ?? '')) ?>" placeholder="e.g. Internship Partner Matrix / Training Roadmap" style="width:100%;padding:0.5rem;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Display Type
          <select name="section_type" id="custom-section-type" style="width:100%;padding:0.5rem;">
            <option value="table" <?= $csEditType === 'table' ? 'selected' : '' ?>>Formatted Data Table (Columns &amp; Rows)</option>
            <option value="cards" <?= $csEditType === 'cards' ? 'selected' : '' ?>>Highlight Cards Grid (3-Column)</option>
            <option value="brochure" <?= $csEditType === 'brochure' ? 'selected' : '' ?>>Downloadable Document / Brochure Strip</option>
            <option value="html" <?= $csEditType === 'html' ? 'selected' : '' ?>>Rich Visual HTML Editor Block</option>
          </select>
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Subtitle / Lead Description
          <input type="text" name="subtitle" value="<?= e((string)($editingCustom['subtitle'] ?? '')) ?>" placeholder="Brief section overview..." style="width:100%;padding:0.5rem;">
        </label>
      </div>

      <!-- Dynamic Table Builder Panel -->
      <div id="cs-panel-table" style="border:1px solid var(--border-color);border-radius:8px;padding:0.9rem;background:#FAFAF9;margin-bottom:0.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.65rem;">
          <strong style="font-size:0.86rem;color:var(--primary-color);">Structured Table Columns &amp; Rows Builder</strong>
          <div style="display:flex;gap:0.4rem;">
            <button type="button" id="cs-add-col" class="btn-outline btn-sm">+ Add Column</button>
            <button type="button" id="cs-add-row" class="btn-primary btn-sm">+ Add Row</button>
          </div>
        </div>
        <div id="cs-table-editor" class="cms-table-wrap"></div>
      </div>

      <!-- Dynamic Cards Builder Panel -->
      <div id="cs-panel-cards" style="border:1px solid var(--border-color);border-radius:8px;padding:0.9rem;background:#FAFAF9;margin-bottom:0.75rem;display:none;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.65rem;">
          <strong style="font-size:0.86rem;color:var(--primary-color);">Highlight Cards Builder</strong>
          <button type="button" id="cs-add-card" class="btn-primary btn-sm">+ Add Card</button>
        </div>
        <div id="cs-cards-editor" style="display:flex;flex-direction:column;gap:0.55rem;"></div>
      </div>

      <!-- CTA / Document Attachment Row -->
      <div id="cs-panel-cta" style="border:1px solid var(--border-color);border-radius:8px;padding:0.85rem;background:#FAFAF9;margin-bottom:0.75rem;">
        <div class="grid-3" style="align-items:end;">
          <label style="font-size:0.8rem;font-weight:600;">CTA / Document Button Label (Optional)
            <input type="text" name="cta_label" value="<?= e((string)($editingCustom['cta_label'] ?? '')) ?>" placeholder="Download Booklet (PDF)" style="width:100%;padding:0.45rem;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">CTA Link or File Path
            <input type="text" name="cta_url" value="<?= e((string)($editingCustom['cta_url'] ?? '')) ?>" placeholder="uploads/... or https://..." style="width:100%;padding:0.45rem;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Upload Section PDF / Doc (Optional)
            <input type="file" name="custom_doc_file" accept=".pdf,.doc,.docx,.xlsx,.csv" style="width:100%;">
          </label>
        </div>
      </div>

      <!-- Visual HTML Editor Panel (kept visible until ready so mount succeeds) -->
      <div id="cs-panel-html" style="margin-bottom:0.75rem;">
        <strong style="display:block;font-size:0.82rem;margin-bottom:0.35rem;">Section Notes / Visual HTML Content</strong>
        <textarea name="html_content" class="rich-editor" data-csrf="<?= e(csrfToken()) ?>"><?= e((string)($editingCustom['html_content'] ?? '')) ?></textarea>
      </div>

      <label style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;font-weight:700;margin-bottom:0.75rem;">
        <input type="checkbox" name="is_published" value="1" <?= ($editingCustom === null || !empty($editingCustom['is_published'])) ? 'checked' : '' ?>>
        Publish this section on live Placements Portal
      </label><br>

      <button type="submit" class="btn-primary"><?= $editingCustom ? 'Update Custom Section' : 'Save Custom Section' ?></button>
      <?php if ($editingCustom): ?><a href="?tab=placements&section=custom_data" class="btn-outline" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <div class="card">
      <h2 style="margin-top:0;">Custom Placement Data Sections (<?= count($customSections) ?>)</h2>
      <?php if (empty($customSections)): ?>
        <p style="color:#78716C;">No custom placement data sections created yet.</p>
      <?php else: ?>
        <?php foreach ($customSections as $cs): ?>
          <div class="admin-list-row">
            <div>
              <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--secondary-color);"><?= e((string)$cs['section_type']) ?></span>
              · <span style="font-size:0.72rem;font-weight:700;color:<?= !empty($cs['is_published']) ? '#047857' : '#B91C1C' ?>;"><?= !empty($cs['is_published']) ? 'Published' : 'Draft / Hidden' ?></span><br>
              <strong><?= e((string)$cs['title']) ?></strong>
              <?php if (!empty($cs['subtitle'])): ?>
                <div style="font-size:0.78rem;color:#78716C;"><?= e((string)$cs['subtitle']) ?></div>
              <?php endif; ?>
            </div>
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_custom_section"><input type="hidden" name="id" value="<?= (int)$cs['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="toggle_custom_section"><input type="hidden" name="id" value="<?= (int)$cs['id'] ?>"><button type="submit" class="btn-outline btn-sm"><?= !empty($cs['is_published']) ? 'Hide' : 'Publish' ?></button></form>
              <a href="?tab=placements&section=custom_data&edit_custom=<?= (int)$cs['id'] ?>" class="btn-primary btn-sm">Edit</a>
              <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_custom_section"><input type="hidden" name="id" value="<?= (int)$cs['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
            </div>
          </div>
        <?php endforeach; ?>
      <?php endif; ?>
    </div>

    <script>
      (function () {
        var typeSelect = document.getElementById('custom-section-type');
        var payloadInput = document.getElementById('custom-payload-json');
        var panelTable = document.getElementById('cs-panel-table');
        var panelCards = document.getElementById('cs-panel-cards');
        var panelHtml = document.getElementById('cs-panel-html');
        var tableWrap = document.getElementById('cs-table-editor');
        var cardsWrap = document.getElementById('cs-cards-editor');
        if (!typeSelect || !payloadInput) return;

        var tableData = { headers: ['Column 1', 'Column 2', 'Column 3'], rows: [['Value 1', 'Value 2', 'Value 3']] };
        var cardsData = [{ title: 'Dedicated Facility', metric: '100+ Seats', description: 'Details visible on the Placement Portal.' }];

        try {
          var parsed = JSON.parse(payloadInput.value || '{}');
          if (Array.isArray(parsed)) {
            if (parsed.length > 0) cardsData = parsed;
          } else if (parsed && Array.isArray(parsed.headers)) {
            tableData = {
              headers: parsed.headers.length ? parsed.headers : ['Column 1'],
              rows: Array.isArray(parsed.rows) && parsed.rows.length ? parsed.rows : [parsed.headers.map(function () { return ''; })]
            };
          }
        } catch (e) {}

        function syncPayload() {
          if (typeSelect.value === 'cards') {
            payloadInput.value = JSON.stringify(cardsData);
          } else if (typeSelect.value === 'table') {
            payloadInput.value = JSON.stringify(tableData);
          }
        }

        function renderTableEditor() {
          if (!tableWrap) return;
          var html = '<table class="cms-table"><thead><tr>';
          tableData.headers.forEach(function (h, cIdx) {
            html += '<th><div style="display:flex;gap:4px;align-items:center;">'
              + '<input type="text" data-hdr="' + cIdx + '" value="' + escapeAttr(h) + '" style="width:100%;padding:4px;font-weight:700;">'
              + (tableData.headers.length > 1 ? '<button type="button" data-delcol="' + cIdx + '" class="btn-danger btn-sm" style="padding:2px 6px;">&times;</button>' : '')
              + '</div></th>';
          });
          html += '<th style="width:70px;">Row</th></tr></thead><tbody>';
          tableData.rows.forEach(function (row, rIdx) {
            html += '<tr>';
            tableData.headers.forEach(function (_, cIdx) {
              var val = row[cIdx] !== undefined ? row[cIdx] : '';
              html += '<td><input type="text" data-row="' + rIdx + '" data-col="' + cIdx + '" value="' + escapeAttr(val) + '" style="width:100%;padding:4px;"></td>';
            });
            html += '<td><button type="button" data-delrow="' + rIdx + '" class="btn-danger btn-sm">Del</button></td></tr>';
          });
          html += '</tbody></table>';
          tableWrap.innerHTML = html;
          syncPayload();
        }

        function renderCardsEditor() {
          if (!cardsWrap) return;
          cardsWrap.innerHTML = '';
          cardsData.forEach(function (card, idx) {
            var box = document.createElement('div');
            box.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1.6fr auto;gap:0.45rem;align-items:center;background:#fff;padding:0.55rem;border:1px solid var(--border-color);border-radius:6px;';
            box.innerHTML = '<input type="text" data-card="' + idx + '" data-field="title" value="' + escapeAttr(card.title || '') + '" placeholder="Card Title *" style="padding:0.4rem;">'
              + '<input type="text" data-card="' + idx + '" data-field="metric" value="' + escapeAttr(card.metric || '') + '" placeholder="Highlight Metric" style="padding:0.4rem;">'
              + '<input type="text" data-card="' + idx + '" data-field="description" value="' + escapeAttr(card.description || '') + '" placeholder="Short Description" style="padding:0.4rem;">'
              + '<button type="button" data-delcard="' + idx + '" class="btn-danger btn-sm">Delete</button>';
            cardsWrap.appendChild(box);
          });
          syncPayload();
        }

        function escapeAttr(str) {
          return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        if (tableWrap) {
          tableWrap.addEventListener('input', function (ev) {
            var t = ev.target;
            if (t.dataset.hdr !== undefined) {
              tableData.headers[parseInt(t.dataset.hdr, 10)] = t.value;
              syncPayload();
            } else if (t.dataset.row !== undefined) {
              var r = parseInt(t.dataset.row, 10);
              var c = parseInt(t.dataset.col, 10);
              tableData.rows[r][c] = t.value;
              syncPayload();
            }
          });
          tableWrap.addEventListener('click', function (ev) {
            var t = ev.target;
            if (t.dataset.delcol !== undefined) {
              var c = parseInt(t.dataset.delcol, 10);
              if (tableData.headers.length > 1) {
                tableData.headers.splice(c, 1);
                tableData.rows.forEach(function (r) { r.splice(c, 1); });
                renderTableEditor();
              }
            } else if (t.dataset.delrow !== undefined) {
              var r = parseInt(t.dataset.delrow, 10);
              tableData.rows.splice(r, 1);
              renderTableEditor();
            }
          });
        }

        if (cardsWrap) {
          cardsWrap.addEventListener('input', function (ev) {
            var t = ev.target;
            if (t.dataset.card !== undefined) {
              cardsData[parseInt(t.dataset.card, 10)][t.dataset.field] = t.value;
              syncPayload();
            }
          });
          cardsWrap.addEventListener('click', function (ev) {
            var t = ev.target;
            if (t.dataset.delcard !== undefined) {
              cardsData.splice(parseInt(t.dataset.delcard, 10), 1);
              renderCardsEditor();
            }
          });
        }

        document.getElementById('cs-add-col').addEventListener('click', function () {
          tableData.headers.push('Column ' + (tableData.headers.length + 1));
          tableData.rows.forEach(function (r) { r.push(''); });
          renderTableEditor();
        });
        document.getElementById('cs-add-row').addEventListener('click', function () {
          tableData.rows.push(tableData.headers.map(function () { return ''; }));
          renderTableEditor();
        });
        document.getElementById('cs-add-card').addEventListener('click', function () {
          cardsData.push({ title: '', metric: '', description: '' });
          renderCardsEditor();
        });

        function updatePanels() {
          var v = typeSelect.value;
          panelTable.style.display = (v === 'table') ? 'block' : 'none';
          panelCards.style.display = (v === 'cards') ? 'block' : 'none';
          panelHtml.style.display  = (v === 'html' || v === 'brochure') ? 'block' : 'none';
          syncPayload();
        }

        renderTableEditor();
        renderCardsEditor();
        setTimeout(updatePanels, 80);
        typeSelect.addEventListener('change', updatePanels);
        document.getElementById('custom-placement-form').addEventListener('submit', syncPayload);
      })();
    </script>
  <?php endif; ?>

<?php elseif ($tab === 'grievances' && $canGrievances): ?>
  <!-- Grievance Moderation Queue with Status Filter, Delete Ticket & CSV Export -->
  <div class="card" style="margin-bottom:1.25rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
      <h2 style="margin:0;">Online Grievance Tickets &amp; Committee Resolution (<?= count($filteredGrievances) ?>)</h2>
      <a href="?tab=grievances&export_csv=1" class="btn-secondary btn-sm">Export Grievance Register (CSV) &darr;</a>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.85rem;">
      <?php foreach (['All', 'Open', 'Under Review', 'Escalated', 'Resolved'] as $gsf): ?>
        <a href="?tab=grievances&g_status=<?= urlencode($gsf) ?>"
           style="padding:0.32rem 0.7rem;border-radius:6px;font-size:0.78rem;font-weight:700;text-decoration:none;<?= $gStatusFilter === $gsf ? 'background:var(--primary-color);color:#fff;' : 'background:#FAFAF9;color:#44403C;border:1px solid #D6D3D1;' ?>">
          <?= e($gsf) ?>
        </a>
      <?php endforeach; ?>
    </div>

    <?php if (empty($filteredGrievances)): ?>
      <p style="color:#78716C;">No grievance tickets matching the selected status.</p>
    <?php else: ?>
      <div class="cms-table-wrap">
        <table class="cms-table cms-table-navy">
          <thead><tr><th>Ticket</th><th>Complainant</th><th>Subject, Urgency &amp; Evidence</th><th>Update Status &amp; Resolution</th></tr></thead>
          <tbody>
            <?php foreach ($filteredGrievances as $g): ?>
              <tr>
                <td>
                  <strong><?= e($g['ticket_code']) ?></strong><br>
                  <span class="badge <?= $g['urgency'] === 'Urgent' ? 'badge-warn' : 'badge-ok' ?>"><?= e($g['urgency']) ?></span><br>
                  <small><?= e($g['submitted_at']) ?></small>
                </td>
                <td>
                  <strong><?= e($g['complainant_name']) ?></strong>
                  <?php if (!empty($g['is_anonymous'])): ?><br><span class="badge badge-warn">Confidential</span><?php endif; ?>
                  <br><small><?= e($g['reporter_role']) ?></small>
                  <br><small><?= e($g['email']) ?></small>
                </td>
                <td>
                  <strong><?= e($g['subject']) ?></strong> (<?= e($g['category']) ?>)<br>
                  <small><?= e($g['description']) ?></small>
                  <?php if (!empty($g['attachment_url'])): ?>
                    <div style="margin-top:0.35rem;"><a href="<?= e(baseUrl((string)$g['attachment_url'])) ?>" target="_blank" class="btn-outline btn-sm">View Evidence Attachment &#8599;</a></div>
                  <?php endif; ?>
                </td>
                <td>
                  <form method="post" style="display:flex;flex-direction:column;gap:0.35rem;min-width:210px;">
                    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                    <input type="hidden" name="action" value="update_grievance">
                    <input type="hidden" name="id" value="<?= (int)$g['id'] ?>">
                    <select name="status" style="padding:4px 6px;">
                      <?php foreach (['Open','Under Review','Escalated','Resolved'] as $gs): ?>
                        <option value="<?= e($gs) ?>" <?= $g['status'] === $gs ? 'selected' : '' ?>><?= e($gs) ?></option>
                      <?php endforeach; ?>
                    </select>
                    <input type="text" name="resolution_note" value="<?= e((string)$g['resolution_note']) ?>" placeholder="Committee remarks..." style="padding:4px 6px;">
                    <div style="display:flex;gap:0.35rem;">
                      <button type="submit" class="btn-primary btn-sm" style="flex:1;">Update Ticket</button>
                    </div>
                  </form>
                  <form method="post" style="margin-top:0.35rem;">
                    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                    <input type="hidden" name="action" value="delete_grievance">
                    <input type="hidden" name="id" value="<?= (int)$g['id'] ?>">
                    <button type="submit" class="btn-danger btn-sm" style="width:100%;">Delete Ticket</button>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>

  <!-- SGRC Charter, Ombudsperson & 24x7 Helplines Config -->
  <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.25rem;">
    <h2 style="margin-top:0;">SGRC Portal, Ombudsperson &amp; Anti-Ragging Helpline Settings</h2>
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_grievance_config">
    <input type="hidden" name="existing_ombudsperson_photo" value="<?= e((string)$gCfg['ombudspersonPhoto']) ?>">

    <div class="grid-3" style="margin-bottom:0.55rem;">
      <label style="font-size:0.8rem;font-weight:600;">Portal Badge
        <input type="text" name="heroBadge" value="<?= e((string)$gCfg['heroBadge']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Portal Heading
        <input type="text" name="heroTitle" value="<?= e((string)$gCfg['heroTitle']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">UGC Undertaking Portal URL
        <input type="url" name="ugcUndertakingUrl" value="<?= e((string)$gCfg['ugcUndertakingUrl']) ?>" style="width:100%;padding:0.45rem;">
      </label>
    </div>
    <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.65rem;">Portal Subtitle
      <input type="text" name="heroSubtitle" value="<?= e((string)$gCfg['heroSubtitle']) ?>" style="width:100%;padding:0.45rem;">
    </label>

    <div class="grid-3" style="margin-bottom:0.65rem;">
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Full Name
        <input type="text" name="ombudspersonName" value="<?= e((string)$gCfg['ombudspersonName']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Designation
        <input type="text" name="ombudspersonTitle" value="<?= e((string)$gCfg['ombudspersonTitle']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Photo (1:1 Crop)
        <input type="file" name="ombudsperson_photo" data-aspect="1:1" accept="image/jpeg,image/png,image/webp" style="width:100%;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Email
        <input type="email" name="ombudspersonEmail" value="<?= e((string)$gCfg['ombudspersonEmail']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Ombudsperson Phone
        <input type="text" name="ombudspersonPhone" value="<?= e((string)$gCfg['ombudspersonPhone']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Campus Anti-Ragging Squad Helpline
        <input type="text" name="antiRaggingSquadPhone" value="<?= e((string)$gCfg['antiRaggingSquadPhone']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">Women Cell / ICC Presiding Officer
        <input type="text" name="womenCellOfficer" value="<?= e((string)$gCfg['womenCellOfficer']) ?>" style="width:100%;padding:0.45rem;">
      </label>
      <label style="font-size:0.8rem;font-weight:600;">ICC Helpline Phone
        <input type="text" name="womenCellPhone" value="<?= e((string)$gCfg['womenCellPhone']) ?>" style="width:100%;padding:0.45rem;">
      </label>
    </div>

    <div style="margin-bottom:0.85rem;">
      <strong style="display:block;font-size:0.82rem;margin-bottom:0.35rem;">Statutory Escalation SLA Matrix &amp; SGRC Charter (Visual Rich Editor)</strong>
      <textarea name="charterHtml" class="rich-editor" data-csrf="<?= e(csrfToken()) ?>"><?= e((string)$gCfg['charterHtml']) ?></textarea>
    </div>
    <button type="submit" class="btn-primary">Save SGRC Charter &amp; Ombudsperson Config</button>
  </form>

  <!-- SGRC & Anti-Ragging Committee Photo Cards CRUD -->
  <div class="card">
    <h2 style="margin-top:0;">SGRC &amp; Anti-Ragging Squad Committee Photo Cards (<?= count($members) ?>)</h2>
    <form method="post" enctype="multipart/form-data" style="background:#FAFAF9;border:1px solid var(--border-color);border-radius:10px;padding:0.9rem;margin-bottom:1rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_committee_member">
      <input type="hidden" name="member_idx" value="<?= $editingMember ? $editMemberIdx : '' ?>">
      <input type="hidden" name="existing_member_photo" value="<?= e((string)($editingMember['photoUrl'] ?? 'assets/images/principal.jpg')) ?>">
      <div class="grid-3" style="margin-bottom:0.5rem;">
        <input type="text" name="name" required value="<?= e((string)($editingMember['name'] ?? '')) ?>" placeholder="Member Name *" style="padding:0.45rem;">
        <input type="text" name="role" required value="<?= e((string)($editingMember['role'] ?? 'SGRC Member')) ?>" placeholder="Committee Role *" style="padding:0.45rem;">
        <input type="text" name="designation" value="<?= e((string)($editingMember['designation'] ?? '')) ?>" placeholder="Designation" style="padding:0.45rem;">
        <input type="text" name="department" value="<?= e((string)($editingMember['department'] ?? '')) ?>" placeholder="Department" style="padding:0.45rem;">
        <input type="email" name="email" value="<?= e((string)($editingMember['email'] ?? '')) ?>" placeholder="Email" style="padding:0.45rem;">
        <input type="text" name="phone" value="<?= e((string)($editingMember['phone'] ?? '')) ?>" placeholder="Phone" style="padding:0.45rem;">
      </div>
      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.6rem;">Member Portrait Photo (1:1 Crop): <input type="file" name="member_photo" data-aspect="1:1" accept="image/jpeg,image/png,image/webp"></label>
      <button type="submit" class="btn-primary btn-sm"><?= $editingMember ? 'Update Committee Member' : 'Add Committee Member' ?></button>
      <?php if ($editingMember): ?><a href="?tab=grievances" class="btn-outline btn-sm" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <?php foreach ($members as $idx => $cm): ?>
      <div class="admin-list-row">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <img src="<?= e(mediaUrl((string)($cm['photoUrl'] ?? ''), 'assets/images/principal.jpg')) ?>" alt="" style="width:46px;height:46px;border-radius:10px;object-fit:cover;">
          <div>
            <strong><?= e((string)$cm['name']) ?></strong> · <span class="badge badge-ok"><?= e((string)$cm['role']) ?></span>
            <div style="font-size:0.78rem;color:#78716C;"><?= e((string)$cm['designation']) ?> · <?= e((string)$cm['department']) ?> · <?= e((string)$cm['phone']) ?></div>
          </div>
        </div>
        <div style="display:flex;gap:0.4rem;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_committee_member"><input type="hidden" name="member_idx" value="<?= $idx ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
          <a href="?tab=grievances&edit_member=<?= $idx ?>" class="btn-primary btn-sm">Edit</a>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_committee_member"><input type="hidden" name="member_idx" value="<?= $idx ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
<?php elseif ($tab === 'feedback' && $canGrievances): ?>
  <!-- Stakeholder Feedback Inbox + Customizable Section Email Routing -->
  <div class="card" style="margin-bottom:1.25rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
      <h2 style="margin:0;">Stakeholder Feedback &amp; Complaint Inbox (<?= count($filteredFeedback) ?>)</h2>
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
        <a href="?tab=feedback&export_feedback_csv=1" class="btn-secondary btn-sm">Export Feedback Inbox (CSV) &darr;</a>
        <a href="<?= e(baseUrl('admin/manage_logs_security.php#email-push')) ?>" class="btn-outline btn-sm">Configure SMTP / Email Push &rarr;</a>
      </div>
    </div>

    <form method="get" style="display:flex;flex-wrap:wrap;gap:0.45rem;align-items:center;margin-bottom:0.9rem;">
      <input type="hidden" name="tab" value="feedback">
      <select name="fb_status" style="padding:0.4rem 0.6rem;border-radius:6px;border:1px solid #D6D3D1;">
        <option value="All">All Statuses</option>
        <?php foreach (['New', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'] as $fbs): ?>
          <option value="<?= e($fbs) ?>" <?= $fbStatusFilter === $fbs ? 'selected' : '' ?>><?= e($fbs) ?></option>
        <?php endforeach; ?>
      </select>
      <select name="fb_sec" style="padding:0.4rem 0.6rem;border-radius:6px;border:1px solid #D6D3D1;">
        <option value="0">All Campus Sections</option>
        <?php foreach ($feedbackSections as $fs): ?>
          <option value="<?= (int)$fs['id'] ?>" <?= $fbSecFilter === (int)$fs['id'] ? 'selected' : '' ?>><?= e((string)$fs['section_name']) ?></option>
        <?php endforeach; ?>
      </select>
      <button type="submit" class="btn-primary btn-sm">Filter</button>
    </form>

    <?php if (empty($filteredFeedback)): ?>
      <p style="color:#78716C;">No feedback or complaint tickets matching the selected filter.</p>
    <?php else: ?>
      <div class="cms-table-wrap">
        <table class="cms-table cms-table-navy">
          <thead><tr><th>Ticket &amp; Rating</th><th>Section &amp; Sender</th><th>Feedback / Complaint &amp; Email Delivery</th><th>Status, Remarks &amp; Re-Push</th></tr></thead>
          <tbody>
            <?php foreach ($filteredFeedback as $fe): ?>
              <tr>
                <td>
                  <strong><?= e((string)$fe['tracking_code']) ?></strong><br>
                  <span class="badge <?= ($fe['submission_type'] ?? '') === 'Complaint' ? 'badge-warn' : 'badge-ok' ?>"><?= e((string)$fe['submission_type']) ?></span><br>
                  <small style="font-weight:700;"><?= (int)$fe['rating'] ?>/5 Stars</small><br>
                  <small><?= e((string)$fe['submitted_at']) ?></small>
                </td>
                <td>
                  <strong><?= e((string)$fe['section_name']) ?></strong><br>
                  <small style="color:var(--secondary-color);"><?= e((string)$fe['subsection']) ?></small><br>
                  <strong><?= e((string)$fe['sender_name']) ?></strong>
                  <?php if (!empty($fe['is_anonymous'])): ?><span class="badge badge-warn">Anonymous</span><?php endif; ?><br>
                  <small><?= e((string)$fe['stakeholder_role']) ?></small><br>
                  <small><?= e((string)$fe['sender_email']) ?></small>
                </td>
                <td>
                  <strong><?= e((string)$fe['subject']) ?></strong><br>
                  <small><?= e((string)$fe['message']) ?></small>
                  <?php if (!empty($fe['attachment_url'])): ?>
                    <div style="margin-top:0.35rem;"><a href="<?= e(baseUrl((string)$fe['attachment_url'])) ?>" target="_blank" class="btn-outline btn-sm">Open Attachment &#8599;</a></div>
                  <?php endif; ?>
                  <div style="margin-top:0.35rem;font-size:0.74rem;color:#44403C;">
                    Routed: <code><?= e((string)($fe['routed_to_emails'] ?: 'Admin Inbox')) ?></code> ·
                    Email: <strong style="text-transform:uppercase;color:<?= ($fe['email_dispatch_status'] ?? '') === 'sent' ? '#047857' : '#B45309' ?>;"><?= e((string)$fe['email_dispatch_status']) ?></strong>
                  </div>
                </td>
                <td>
                  <form method="post" style="display:flex;flex-direction:column;gap:0.35rem;min-width:210px;">
                    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                    <input type="hidden" name="action" value="update_feedback_entry">
                    <input type="hidden" name="id" value="<?= (int)$fe['id'] ?>">
                    <select name="status" style="padding:4px 6px;">
                      <?php foreach (['New', 'Acknowledged', 'In Progress', 'Resolved', 'Closed'] as $fst): ?>
                        <option value="<?= e($fst) ?>" <?= ($fe['status'] ?? '') === $fst ? 'selected' : '' ?>><?= e($fst) ?></option>
                      <?php endforeach; ?>
                    </select>
                    <input type="text" name="action_taken_note" value="<?= e((string)($fe['action_taken_note'] ?? '')) ?>" placeholder="Action taken / reply..." style="padding:4px 6px;">
                    <button type="submit" class="btn-primary btn-sm">Update Ticket</button>
                  </form>
                  <div style="display:flex;gap:0.35rem;margin-top:0.35rem;">
                    <form method="post" style="flex:1;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="repush_feedback_email"><input type="hidden" name="id" value="<?= (int)$fe['id'] ?>"><button type="submit" class="btn-outline btn-sm" style="width:100%;">Re-Push Email</button></form>
                    <form method="post" onsubmit="return confirm('Delete this feedback entry?');"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_feedback_entry"><input type="hidden" name="id" value="<?= (int)$fe['id'] ?>"><button type="submit" class="btn-danger btn-sm">Del</button></form>
                  </div>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>

  <!-- Feedback Sections & Department Email Routing Builder -->
  <div class="card">
    <h2 style="margin-top:0;"><?= $editingFbSec ? 'Edit Feedback Section Routing: ' . e((string)$editingFbSec['section_name']) : 'Add Customizable Campus Feedback Section & Email Routing' ?></h2>
    <form method="post" style="background:#FAFAF9;border:1px solid var(--border-color);border-radius:10px;padding:0.9rem;margin-bottom:1.1rem;">
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="save_feedback_section">
      <input type="hidden" name="fb_section_id" value="<?= (int)($editingFbSec['id'] ?? 0) ?>">

      <div class="grid-3" style="margin-bottom:0.55rem;">
        <label style="font-size:0.8rem;font-weight:600;">Section Name *
          <input type="text" name="section_name" required value="<?= e((string)($editingFbSec['section_name'] ?? '')) ?>" placeholder="e.g. Hostel, Mess & Health Centre" style="width:100%;padding:0.45rem;margin-top:3px;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">URL / Routing Slug
          <input type="text" name="slug" value="<?= e((string)($editingFbSec['slug'] ?? '')) ?>" placeholder="auto if blank" style="width:100%;padding:0.45rem;margin-top:3px;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">Target SLA (Working Days)
          <input type="number" name="sla_days" min="1" max="60" value="<?= (int)($editingFbSec['sla_days'] ?? 5) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
        </label>
      </div>

      <div class="grid-2" style="margin-bottom:0.55rem;">
        <label style="font-size:0.8rem;font-weight:600;">Primary Recipient Emails (comma-separated) *
          <input type="text" name="recipient_emails" required value="<?= e((string)($editingFbSec['recipient_emails'] ?? '')) ?>" placeholder="dean.academics@coe.sveri.ac.in, principal@coe.sveri.ac.in" style="width:100%;padding:0.45rem;margin-top:3px;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">CC Oversight Emails (comma-separated)
          <input type="text" name="cc_emails" value="<?= e((string)($editingFbSec['cc_emails'] ?? '')) ?>" placeholder="iqac@coe.sveri.ac.in" style="width:100%;padding:0.45rem;margin-top:3px;">
        </label>
      </div>

      <div class="grid-2" style="margin-bottom:0.55rem;">
        <label style="font-size:0.8rem;font-weight:600;">Section In-Charge Name
          <input type="text" name="incharge_name" value="<?= e((string)($editingFbSec['incharge_name'] ?? '')) ?>" placeholder="Dr. S. B. Kulkarni" style="width:100%;padding:0.45rem;margin-top:3px;">
        </label>
        <label style="font-size:0.8rem;font-weight:600;">In-Charge Designation / Cell
          <input type="text" name="incharge_designation" value="<?= e((string)($editingFbSec['incharge_designation'] ?? '')) ?>" placeholder="Dean Academics & IQAC" style="width:100%;padding:0.45rem;margin-top:3px;">
        </label>
      </div>

      <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.55rem;">Subsections / Selectable Topics (1 per line or comma-separated)
        <textarea name="subsections_raw" rows="2" placeholder="Curriculum & Syllabus, Lab Equipment, Timetable" style="width:100%;padding:0.45rem;margin-top:3px;"><?= e(implode("\n", is_array($editingFbSec['subsections'] ?? null) ? $editingFbSec['subsections'] : [])) ?></textarea>
      </label>

      <div style="display:flex;gap:1.25rem;flex-wrap:wrap;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">
        <label><input type="checkbox" name="auto_email_enabled" value="1" <?= ($editingFbSec === null || !empty($editingFbSec['auto_email_enabled'])) ? 'checked' : '' ?>> Auto-Dispatch Email Immediately on Submission</label>
        <label><input type="checkbox" name="is_active" value="1" <?= ($editingFbSec === null || !empty($editingFbSec['is_active'])) ? 'checked' : '' ?>> Active on Public Feedback Portal</label>
      </div>

      <button type="submit" class="btn-primary btn-sm"><?= $editingFbSec ? 'Update Section Routing' : 'Add Feedback Section' ?></button>
      <?php if ($editingFbSec): ?><a href="?tab=feedback" class="btn-outline btn-sm" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
    </form>

    <h3 style="margin-top:0;">Configured Campus Feedback Sections (<?= count($feedbackSections) ?>)</h3>
    <?php foreach ($feedbackSections as $fs): ?>
      <div class="admin-list-row">
        <div>
          <strong><?= e((string)$fs['section_name']) ?></strong> · <span class="badge <?= !empty($fs['is_active']) ? 'badge-ok' : 'badge-warn' ?>"><?= !empty($fs['is_active']) ? 'Active' : 'Hidden' ?></span>
          <div style="font-size:0.78rem;color:#57534E;">
            To: <code><?= e((string)$fs['recipient_emails']) ?></code>
            <?= !empty($fs['cc_emails']) ? ' · CC: <code>' . e((string)$fs['cc_emails']) . '</code>' : '' ?>
            · SLA: <?= (int)$fs['sla_days'] ?>d
          </div>
        </div>
        <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_feedback_section"><input type="hidden" name="id" value="<?= (int)$fs['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
          <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="toggle_feedback_section"><input type="hidden" name="id" value="<?= (int)$fs['id'] ?>"><button type="submit" class="btn-secondary btn-sm"><?= !empty($fs['is_active']) ? 'Hide' : 'Show' ?></button></form>
          <a href="?tab=feedback&edit_fb_sec=<?= (int)$fs['id'] ?>" class="btn-primary btn-sm">Edit</a>
          <form method="post" style="display:inline;" onsubmit="return confirm('Delete this feedback section?');"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_feedback_section"><input type="hidden" name="id" value="<?= (int)$fs['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
        </div>
      </div>
    <?php endforeach; ?>
  </div>
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
