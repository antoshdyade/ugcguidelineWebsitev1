<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('departments');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$isFullDeptAdmin = in_array($user['role'], ['super_admin', 'content_editor'], true);
$msg = '';
$err = '';

$pageTypes = [
    'general'               => 'General Rich Content Page',
    'gallery'               => 'Department Photo Gallery',
    'notice_board'          => 'Notice Board & Circulars',
    'events'                => 'Events & Technical Workshops',
    'notes_syllabus'        => 'Notes & Syllabus Repository',
    'celebrations'          => 'Celebrations & Cultural Highlights',
    'achievements_students' => 'Student Achievements',
    'achievements_faculty'  => 'Faculty Achievements & Patents',
    'library'               => 'Department Library Details',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = $_POST['action'] ?? '';
    $isSuper = cmsIsSuperAdmin($user);

    if ($action === 'add_department' && $isFullDeptAdmin) {
        $heroUrl = 'assets/images/hero_robotics.jpg';
        if (!empty($_FILES['hero_image']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['hero_image'], __DIR__ . '/../uploads', 'photo');
            if ($up['ok']) $heroUrl = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '') {
            $slug = trim(preg_replace('/[^a-z0-9-]+/', '-', strtolower(trim($_POST['slug']))), '-');
            $code = strtoupper(preg_replace('/[^A-Z0-9]/', '', strtoupper(trim($_POST['code']))));
            $deptName = trim($_POST['name']);
            $isShareable = isset($_POST['is_shareable']) ? 1 : 0;
            $deptStatus = $isSuper ? 'published' : 'pending_approval';
            $stmt = $pdo->prepare('INSERT INTO departments (slug, code, name, short_name, established_year, intake_capacity, nba_status, hod_name, overview, vision, mission, hero_image_url, faculty_field_schema_json, is_shareable, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $slug,
                $code,
                $deptName,
                trim($_POST['short_name'] ?: $code),
                (int)$_POST['established_year'],
                (int)$_POST['intake_capacity'],
                trim($_POST['nba_status'] ?: 'AICTE Approved'),
                trim($_POST['hod_name']),
                trim($_POST['overview']),
                trim($_POST['vision'] ?? ''),
                trim($_POST['mission'] ?? ''),
                $heroUrl,
                json_encode(['Google Scholar', 'ORCID ID', 'Patents Granted']),
                $isShareable,
                $deptStatus,
            ]);
            $newId = (int)$pdo->lastInsertId();
            $aboutHtml = '<h2>' . e($deptName) . '</h2><p>' . e(trim($_POST['overview'])) . '</p>';
            $pdo->prepare('INSERT INTO department_subpages (department_id, slug, title, page_type, content_html, sort_order, is_published, is_shareable, updated_at, status) VALUES (?, "about", "About Department", "general", ?, 1, ?, 1, CURDATE(), ?)')
                ->execute([$newId, $aboutHtml, $isSuper ? 1 : 0, $deptStatus]);
            $aboutId = (int)$pdo->lastInsertId();
            if ($isSuper) {
                logAudit($pdo, $user, 'CREATE_DEPARTMENT', 'Department', $deptName);
                header('Location: manage_departments.php?dept_id=' . $newId . '&msg=created');
                exit;
            }
            cmsQueuePendingCreate($pdo, $user, 'departments', $newId, $deptName, [
                'slug' => $slug, 'code' => $code, 'name' => $deptName, 'is_shareable' => $isShareable,
            ]);
            cmsQueuePendingCreate($pdo, $user, 'department_subpages', $aboutId, $deptName . ' — About Department', [
                'department_id' => $newId, 'slug' => 'about', 'title' => 'About Department', 'is_published' => 1, 'is_shareable' => 1,
            ]);
            $msg = 'Department microsite submitted for Super Admin approval.';
        }
    } elseif ($action === 'delete_department' && $isFullDeptAdmin) {
        $delId = (int)$_POST['department_id'];
        if ($isSuper) {
            $pdo->prepare('DELETE FROM departments WHERE id = ?')->execute([$delId]);
            logAudit($pdo, $user, 'DELETE_DEPARTMENT', 'Department', 'ID #' . $delId);
            header('Location: manage_departments.php?msg=deleted');
            exit;
        }
        $stCur = $pdo->prepare('SELECT * FROM departments WHERE id = ? LIMIT 1');
        $stCur->execute([$delId]);
        $cur = $stCur->fetch();
        if ($cur) {
            cmsQueuePendingDelete($pdo, $user, 'departments', $delId, (string)$cur['name'], $cur);
            $msg = 'Department deletion submitted for Super Admin approval.';
        }
    } else {
        $deptId = (int)$_POST['department_id'];
        requireRoleAccess('departments', $deptId);

        if ($action === 'update_department') {
            $heroUrl = trim($_POST['existing_hero_image'] ?? 'assets/images/hero_robotics.jpg');
            if (!empty($_FILES['hero_image']['name'])) {
                $up = handleCmsUpload($pdo, $_FILES['hero_image'], __DIR__ . '/../uploads', 'photo');
                if ($up['ok']) $heroUrl = $up['file_url'];
                else $err = $up['error'];
            }
            $isShareable = isset($_POST['is_shareable']) ? 1 : 0;
            if ($err === '') {
                $deptPayload = [
                    'name'             => trim((string)$_POST['name']),
                    'short_name'       => trim((string)$_POST['short_name']),
                    'established_year' => (int)$_POST['established_year'],
                    'intake_capacity'  => (int)$_POST['intake_capacity'],
                    'nba_status'       => trim((string)$_POST['nba_status']),
                    'hod_name'         => trim((string)$_POST['hod_name']),
                    'hod_message'      => trim((string)($_POST['hod_message'] ?? '')),
                    'overview'         => trim((string)$_POST['overview']),
                    'vision'           => trim((string)($_POST['vision'] ?? '')),
                    'mission'          => trim((string)($_POST['mission'] ?? '')),
                    'hero_image_url'   => $heroUrl,
                    'is_shareable'     => $isShareable,
                ];
                if ($isSuper) {
                    $stmt = $pdo->prepare("UPDATE departments SET name = ?, short_name = ?, established_year = ?, intake_capacity = ?, nba_status = ?, hod_name = ?, hod_message = ?, overview = ?, vision = ?, mission = ?, hero_image_url = ?, is_shareable = ?, status = 'published' WHERE id = ?");
                    $stmt->execute([
                        $deptPayload['name'], $deptPayload['short_name'], $deptPayload['established_year'],
                        $deptPayload['intake_capacity'], $deptPayload['nba_status'], $deptPayload['hod_name'],
                        $deptPayload['hod_message'], $deptPayload['overview'], $deptPayload['vision'],
                        $deptPayload['mission'], $deptPayload['hero_image_url'], $isShareable, $deptId,
                    ]);
                    logAudit($pdo, $user, 'UPDATE_DEPARTMENT', 'Department', $deptPayload['name']);
                    $msg = 'Department profile updated.';
                } else {
                    $stCur = $pdo->prepare('SELECT * FROM departments WHERE id = ? LIMIT 1');
                    $stCur->execute([$deptId]);
                    $cur = $stCur->fetch() ?: [];
                    cmsQueuePendingUpdate($pdo, $user, 'departments', $deptId, $deptPayload['name'], $cur, $deptPayload);
                    $msg = 'Department profile edits submitted for Super Admin approval. Live profile remains unchanged.';
                }
            }
        } elseif ($action === 'update_library_schema') {
            $libPhoto = trim($_POST['existing_library_photo'] ?? 'assets/images/hero_library.jpg');
            if (!empty($_FILES['library_photo']['name'])) {
                $up = handleCmsUpload($pdo, $_FILES['library_photo'], __DIR__ . '/../uploads', 'photo');
                if ($up['ok']) $libPhoto = $up['file_url'];
                else $err = $up['error'];
            }
            if ($err === '') {
                $libPayload = [
                    'name'              => trim($_POST['lib_name'] ?? ''),
                    'volumesCount'      => (int)($_POST['lib_volumes'] ?? 0),
                    'journalsCount'     => (int)($_POST['lib_journals'] ?? 0),
                    'eResourcesSummary' => trim($_POST['lib_eresources'] ?? ''),
                    'incharge'          => trim($_POST['lib_incharge'] ?? ''),
                    'timings'           => trim($_POST['lib_timings'] ?? ''),
                    'description'       => trim($_POST['lib_description'] ?? ''),
                    'photoUrl'          => $libPhoto,
                ];
                $schemaLines = array_values(array_filter(array_map('trim', explode(',', (string)($_POST['faculty_schema'] ?? '')))));
                $libJson = $libPayload['name'] !== '' ? json_encode($libPayload, JSON_UNESCAPED_UNICODE) : null;
                $schemaJson = json_encode($schemaLines, JSON_UNESCAPED_UNICODE);
                if ($isSuper) {
                    $pdo->prepare('UPDATE departments SET library_json = ?, faculty_field_schema_json = ? WHERE id = ?')
                        ->execute([$libJson, $schemaJson, $deptId]);
                    logAudit($pdo, $user, 'UPDATE_DEPT_LIBRARY_SCHEMA', 'Department', 'Dept #' . $deptId);
                    $msg = 'Department library photo/details & faculty field schema saved.';
                } else {
                    $stCur = $pdo->prepare('SELECT * FROM departments WHERE id = ? LIMIT 1');
                    $stCur->execute([$deptId]);
                    $cur = $stCur->fetch() ?: [];
                    cmsQueuePendingUpdate($pdo, $user, 'departments', $deptId, ((string)($cur['name'] ?? 'Department')) . ' (Library & Faculty Schema)', $cur, [
                        'library_json'              => $libJson,
                        'faculty_field_schema_json' => $schemaJson,
                    ]);
                    $msg = 'Library & faculty field schema update submitted for Super Admin approval.';
                }
            }
        } elseif ($action === 'save_subpage') {
            $slug = trim(preg_replace('/[^a-z0-9-]+/', '-', strtolower(trim($_POST['slug']))), '-');
            $ptype = array_key_exists($_POST['page_type'] ?? '', $pageTypes) ? $_POST['page_type'] : 'general';
            $sortOrder = max(1, (int)($_POST['sort_order'] ?? 1));
            $spTitle = trim((string)$_POST['title']);
            $spHtml = (string)($_POST['content_html'] ?? '<p></p>');
            $desiredPub = isset($_POST['is_published']) ? 1 : 0;
            $isShareable = isset($_POST['is_shareable']) ? 1 : 0;
            if (!empty($_POST['subpage_id'])) {
                $spId = (int)$_POST['subpage_id'];
                if ($isSuper) {
                    $stmt = $pdo->prepare("UPDATE department_subpages SET slug = ?, title = ?, page_type = ?, content_html = ?, sort_order = ?, is_published = ?, is_shareable = ?, updated_at = CURDATE(), status = 'published' WHERE id = ? AND department_id = ?");
                    $stmt->execute([$slug, $spTitle, $ptype, $spHtml, $sortOrder, $desiredPub, $isShareable, $spId, $deptId]);
                    logAudit($pdo, $user, 'UPDATE_DEPT_SUBPAGE', 'Department', $spTitle);
                    $msg = 'Department micro-page updated.';
                } else {
                    $stCur = $pdo->prepare('SELECT * FROM department_subpages WHERE id = ? AND department_id = ? LIMIT 1');
                    $stCur->execute([$spId, $deptId]);
                    $cur = $stCur->fetch() ?: [];
                    cmsQueuePendingUpdate($pdo, $user, 'department_subpages', $spId, $spTitle, $cur, [
                        'department_id' => $deptId,
                        'slug'          => $slug,
                        'title'         => $spTitle,
                        'page_type'     => $ptype,
                        'content_html'  => $spHtml,
                        'sort_order'    => $sortOrder,
                        'is_published'  => $desiredPub,
                        'is_shareable'  => $isShareable,
                        'updated_at'    => date('Y-m-d'),
                    ]);
                    $msg = 'Micro-page edits submitted for Super Admin approval. Live micro-page remains unchanged.';
                }
            } else {
                $stmt = $pdo->prepare('INSERT INTO department_subpages (department_id, slug, title, page_type, content_html, sort_order, is_published, is_shareable, updated_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)');
                $stmt->execute([$deptId, $slug, $spTitle, $ptype, $spHtml, $sortOrder, $isSuper ? $desiredPub : 0, $isShareable, $isSuper ? 'published' : 'pending_approval']);
                $newSpId = (int)$pdo->lastInsertId();
                if ($isSuper) {
                    logAudit($pdo, $user, 'CREATE_DEPT_SUBPAGE', 'Department', $spTitle);
                    $msg = 'Department micro-page created.';
                } else {
                    cmsQueuePendingCreate($pdo, $user, 'department_subpages', $newSpId, $spTitle, [
                        'department_id' => $deptId,
                        'slug'          => $slug,
                        'title'         => $spTitle,
                        'page_type'     => $ptype,
                        'is_published'  => $desiredPub,
                        'is_shareable'  => $isShareable,
                        'sort_order'    => $sortOrder,
                    ]);
                    $msg = 'Department micro-page submitted for Super Admin approval.';
                }
            }
        } elseif ($action === 'move_subpage' && !empty($_POST['subpage_id'])) {
            $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
            if (swapSortOrder($pdo, 'department_subpages', (int)$_POST['subpage_id'], $dir, 'department_id', $deptId, 'id ASC')) {
                $msg = 'Micro-page order updated.';
            }
        } elseif ($action === 'add_subpage_photo' && !empty($_POST['subpage_id'])) {
            $spId = (int)$_POST['subpage_id'];
            $st = $pdo->prepare('SELECT photos_json FROM department_subpages WHERE id = ? AND department_id = ?');
            $st->execute([$spId, $deptId]);
            $row = $st->fetch();
            if ($row && !empty($_FILES['gallery_photo']['name'])) {
                $up = handleCmsUpload($pdo, $_FILES['gallery_photo'], __DIR__ . '/../uploads', 'photo');
                if ($up['ok']) {
                    $photos = !empty($row['photos_json']) ? json_decode((string)$row['photos_json'], true) : [];
                    if (!is_array($photos)) $photos = [];
                    $photos[] = ['url' => $up['file_url'], 'caption' => trim($_POST['photo_caption'] ?? '')];
                    $pdo->prepare('UPDATE department_subpages SET photos_json = ?, updated_at = CURDATE() WHERE id = ? AND department_id = ?')
                        ->execute([json_encode($photos, JSON_UNESCAPED_UNICODE), $spId, $deptId]);
                    $msg = 'Photo added to department micro-page gallery.';
                } else {
                    $err = $up['error'];
                }
            } else {
                $err = 'Please select an image file to upload.';
            }
        } elseif ($action === 'delete_subpage_photo' && !empty($_POST['subpage_id'])) {
            $spId = (int)$_POST['subpage_id'];
            $idx = (int)($_POST['photo_index'] ?? -1);
            $st = $pdo->prepare('SELECT photos_json FROM department_subpages WHERE id = ? AND department_id = ?');
            $st->execute([$spId, $deptId]);
            $row = $st->fetch();
            if ($row) {
                $photos = !empty($row['photos_json']) ? json_decode((string)$row['photos_json'], true) : [];
                if (is_array($photos) && isset($photos[$idx])) {
                    array_splice($photos, $idx, 1);
                    $pdo->prepare('UPDATE department_subpages SET photos_json = ? WHERE id = ? AND department_id = ?')
                        ->execute([json_encode(array_values($photos), JSON_UNESCAPED_UNICODE), $spId, $deptId]);
                    $msg = 'Photo removed from micro-page.';
                }
            }
        } elseif ($action === 'add_subpage_item' && !empty($_POST['subpage_id'])) {
            $spId = (int)$_POST['subpage_id'];
            $st = $pdo->prepare('SELECT items_json FROM department_subpages WHERE id = ? AND department_id = ?');
            $st->execute([$spId, $deptId]);
            $row = $st->fetch();
            if ($row) {
                $itemPhoto = '';
                if (!empty($_FILES['item_photo']['name'])) {
                    $up = handleCmsUpload($pdo, $_FILES['item_photo'], __DIR__ . '/../uploads', 'photo');
                    if ($up['ok']) $itemPhoto = $up['file_url'];
                    else $err = $up['error'];
                }
                $itemLink = trim($_POST['item_link_url'] ?? '');
                if ($err === '' && !empty($_FILES['item_file']['name'])) {
                    $upDoc = handleCmsUpload($pdo, $_FILES['item_file'], __DIR__ . '/../uploads', 'document');
                    if ($upDoc['ok']) $itemLink = $upDoc['file_url'];
                    else $err = $upDoc['error'];
                } elseif ($err === '' && $itemLink !== '' && strpos($itemLink, 'uploads/') !== 0 && !validateExternalUrl($itemLink)) {
                    $err = 'Item link must be a valid https:// / http:// link (e.g. Google Drive) or uploaded file.';
                }
                if ($err === '') {
                    $items = !empty($row['items_json']) ? json_decode((string)$row['items_json'], true) : [];
                    if (!is_array($items)) $items = [];
                    $items[] = [
                        'id'        => 'item-' . bin2hex(random_bytes(4)),
                        'title'     => trim($_POST['item_title'] ?? 'Notice / Entry'),
                        'date'      => trim($_POST['item_date'] ?? date('Y-m-d')),
                        'badge'     => trim($_POST['item_badge'] ?? 'Update'),
                        'summary'   => trim($_POST['item_summary'] ?? ''),
                        'photoUrl'  => $itemPhoto,
                        'linkUrl'   => $itemLink,
                        'linkLabel' => trim($_POST['item_link_label'] ?? '') ?: 'Open Resource',
                    ];
                    $pdo->prepare('UPDATE department_subpages SET items_json = ?, updated_at = CURDATE() WHERE id = ? AND department_id = ?')
                        ->execute([json_encode($items, JSON_UNESCAPED_UNICODE), $spId, $deptId]);
                    $msg = 'Structured item added to micro-page.';
                }
            }
        } elseif ($action === 'delete_subpage_item' && !empty($_POST['subpage_id'])) {
            $spId = (int)$_POST['subpage_id'];
            $idx = (int)($_POST['item_index'] ?? -1);
            $st = $pdo->prepare('SELECT items_json FROM department_subpages WHERE id = ? AND department_id = ?');
            $st->execute([$spId, $deptId]);
            $row = $st->fetch();
            if ($row) {
                $items = !empty($row['items_json']) ? json_decode((string)$row['items_json'], true) : [];
                if (is_array($items) && isset($items[$idx])) {
                    array_splice($items, $idx, 1);
                    $pdo->prepare('UPDATE department_subpages SET items_json = ? WHERE id = ? AND department_id = ?')
                        ->execute([json_encode(array_values($items), JSON_UNESCAPED_UNICODE), $spId, $deptId]);
                    $msg = 'Item removed.';
                }
            }
        } elseif ($action === 'delete_subpage') {
            $spId = (int)$_POST['subpage_id'];
            if ($isSuper) {
                $pdo->prepare('DELETE FROM department_subpages WHERE id = ? AND department_id = ?')->execute([$spId, $deptId]);
                $msg = 'Micro-page deleted.';
            } else {
                $stCur = $pdo->prepare('SELECT * FROM department_subpages WHERE id = ? AND department_id = ? LIMIT 1');
                $stCur->execute([$spId, $deptId]);
                $cur = $stCur->fetch();
                if ($cur) {
                    cmsQueuePendingDelete($pdo, $user, 'department_subpages', $spId, (string)$cur['title'], $cur);
                    $msg = 'Micro-page deletion submitted for Super Admin approval.';
                }
            }
        } elseif ($action === 'add_faculty' || $action === 'update_faculty') {
            $photoUrl = trim($_POST['existing_photo'] ?? 'assets/images/principal.jpg');
            if (!empty($_FILES['photo']['name'])) {
                $up = handleCmsUpload($pdo, $_FILES['photo'], __DIR__ . '/../uploads', 'photo');
                if ($up['ok']) $photoUrl = $up['file_url'];
                else $err = $up['error'];
            }
            $extProfileUrl = trim($_POST['external_profile_url'] ?? '');
            if ($err === '' && $extProfileUrl !== '' && !validateExternalUrl($extProfileUrl)) {
                $err = 'External faculty profile URL must start with https:// or http://';
            }
            $customMap = [];
            $cfKeys = $_POST['cf_key'] ?? [];
            $cfVals = $_POST['cf_val'] ?? [];
            foreach ($cfKeys as $idx => $k) {
                $k = trim((string)$k);
                $v = trim((string)($cfVals[$idx] ?? ''));
                if ($k !== '' && $v !== '') {
                    $customMap[$k] = $v;
                }
            }
            $customJson = !empty($customMap) ? json_encode($customMap, JSON_UNESCAPED_UNICODE) : null;

            $facOrder = max(1, (int)($_POST['sort_order'] ?? 1));
            if ($err === '') {
                if ($action === 'update_faculty' && !empty($_POST['faculty_id'])) {
                    $stmt = $pdo->prepare('UPDATE faculty SET name = ?, designation = ?, qualification = ?, specialization = ?, email = ?, phone = ?, experience_years = ?, photo_url = ?, external_profile_url = ?, external_profile_label = ?, custom_fields_json = ?, is_hod = ?, sort_order = ? WHERE id = ? AND department_id = ?');
                    $stmt->execute([
                        trim($_POST['name']),
                        trim($_POST['designation']),
                        trim($_POST['qualification']),
                        trim($_POST['specialization']),
                        trim($_POST['email']),
                        trim($_POST['phone'] ?? '') ?: null,
                        (int)($_POST['experience_years'] ?? 5),
                        $photoUrl,
                        $extProfileUrl !== '' ? $extProfileUrl : null,
                        trim($_POST['external_profile_label'] ?? '') ?: null,
                        $customJson,
                        isset($_POST['is_hod']) ? 1 : 0,
                        $facOrder,
                        (int)$_POST['faculty_id'],
                        $deptId,
                    ]);
                    logAudit($pdo, $user, 'UPDATE_FACULTY', 'Faculty', $_POST['name']);
                    $msg = 'Faculty profile updated.';
                } else {
                    $stmt = $pdo->prepare('INSERT INTO faculty (department_id, name, designation, qualification, specialization, email, phone, experience_years, photo_url, external_profile_url, external_profile_label, custom_fields_json, is_hod, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    $stmt->execute([
                        $deptId,
                        trim($_POST['name']),
                        trim($_POST['designation']),
                        trim($_POST['qualification']),
                        trim($_POST['specialization']),
                        trim($_POST['email']),
                        trim($_POST['phone'] ?? '') ?: null,
                        (int)($_POST['experience_years'] ?? 5),
                        $photoUrl,
                        $extProfileUrl !== '' ? $extProfileUrl : null,
                        trim($_POST['external_profile_label'] ?? '') ?: null,
                        $customJson,
                        isset($_POST['is_hod']) ? 1 : 0,
                        $facOrder,
                    ]);
                    logAudit($pdo, $user, 'ADD_FACULTY', 'Faculty', $_POST['name']);
                    $msg = 'Faculty member added.';
                }
            }
        } elseif ($action === 'move_faculty' && !empty($_POST['faculty_id'])) {
            $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
            if (swapSortOrder($pdo, 'faculty', (int)$_POST['faculty_id'], $dir, 'department_id', $deptId, 'id ASC')) {
                logAudit($pdo, $user, 'REORDER_FACULTY', 'Faculty', 'Dept #' . $deptId);
                $msg = 'Faculty display order updated.';
            }
        } elseif ($action === 'delete_faculty') {
            $pdo->prepare('DELETE FROM faculty WHERE id = ? AND department_id = ?')->execute([(int)$_POST['faculty_id'], $deptId]);
            $msg = 'Faculty member removed.';
        } elseif ($action === 'add_lab' || $action === 'update_lab') {
            $labPhoto = trim($_POST['existing_lab_photo'] ?? '');
            $labOrder = max(1, (int)($_POST['sort_order'] ?? 1));
            if (!empty($_FILES['lab_photo']['name'])) {
                $up = handleCmsUpload($pdo, $_FILES['lab_photo'], __DIR__ . '/../uploads', 'photo');
                if ($up['ok']) $labPhoto = $up['file_url'];
                else $err = $up['error'];
            }
            if ($err === '') {
                if ($action === 'update_lab' && !empty($_POST['lab_id'])) {
                    $pdo->prepare('UPDATE department_labs SET name = ?, area_sqft = ?, equipment_summary = ?, incharge = ?, photo_url = ?, sort_order = ? WHERE id = ? AND department_id = ?')
                        ->execute([trim($_POST['name']), (int)$_POST['area_sqft'], trim($_POST['equipment_summary']), trim($_POST['incharge']), $labPhoto ?: null, $labOrder, (int)$_POST['lab_id'], $deptId]);
                    $msg = 'Laboratory updated.';
                } else {
                    $pdo->prepare('INSERT INTO department_labs (department_id, name, area_sqft, equipment_summary, incharge, photo_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
                        ->execute([$deptId, trim($_POST['name']), (int)$_POST['area_sqft'], trim($_POST['equipment_summary']), trim($_POST['incharge']), $labPhoto ?: null, $labOrder]);
                    $msg = 'Laboratory added.';
                }
            }
        } elseif ($action === 'move_lab' && !empty($_POST['lab_id'])) {
            $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
            if (swapSortOrder($pdo, 'department_labs', (int)$_POST['lab_id'], $dir, 'department_id', $deptId, 'id ASC')) {
                $msg = 'Laboratory order updated.';
            }
        } elseif ($action === 'delete_lab') {
            $pdo->prepare('DELETE FROM department_labs WHERE id = ? AND department_id = ?')->execute([(int)$_POST['lab_id'], $deptId]);
            $msg = 'Laboratory removed.';
        }
    }
}

$allowedDeptIds = array_values(array_unique(array_filter(array_map('intval', array_merge(
    is_array($user['allowed_department_ids'] ?? null) ? $user['allowed_department_ids'] : [],
    !empty($user['assigned_department_id']) ? [(int)$user['assigned_department_id']] : []
)))));
if (!$isFullDeptAdmin && !empty($allowedDeptIds)) {
    $placeholders = implode(',', array_fill(0, count($allowedDeptIds), '?'));
    $stDepts = $pdo->prepare("SELECT * FROM departments WHERE id IN ($placeholders) ORDER BY sort_order ASC, id ASC");
    $stDepts->execute($allowedDeptIds);
    $deptList = $stDepts->fetchAll();
} else {
    $deptList = $pdo->query('SELECT * FROM departments ORDER BY sort_order ASC, id ASC')->fetchAll();
}

$activeDeptId = (int)($_GET['dept_id'] ?? ($deptList[0]['id'] ?? 1));
requireRoleAccess('departments', $activeDeptId);
$activeDept = null;
foreach ($deptList as $d) { if ((int)$d['id'] === $activeDeptId) { $activeDept = $d; break; } }

$editSub = null;
if (!empty($_GET['edit_sub'])) {
    $st = $pdo->prepare('SELECT * FROM department_subpages WHERE id = ? AND department_id = ?');
    $st->execute([(int)$_GET['edit_sub'], $activeDeptId]);
    $editSub = $st->fetch() ?: null;
}

$editFac = null;
if (!empty($_GET['edit_fac'])) {
    $st = $pdo->prepare('SELECT * FROM faculty WHERE id = ? AND department_id = ?');
    $st->execute([(int)$_GET['edit_fac'], $activeDeptId]);
    $editFac = $st->fetch() ?: null;
}

$editLab = null;
if (!empty($_GET['edit_lab'])) {
    $st = $pdo->prepare('SELECT * FROM department_labs WHERE id = ? AND department_id = ?');
    $st->execute([(int)$_GET['edit_lab'], $activeDeptId]);
    $editLab = $st->fetch() ?: null;
}

$subPages = $pdo->prepare('SELECT * FROM department_subpages WHERE department_id = ? ORDER BY sort_order ASC, id ASC');
$subPages->execute([$activeDeptId]);
$subs = $subPages->fetchAll();

$facStmt = $pdo->prepare('SELECT * FROM faculty WHERE department_id = ? ORDER BY sort_order ASC, id ASC');
$facStmt->execute([$activeDeptId]);
$facultyList = $facStmt->fetchAll();

$labStmt = $pdo->prepare('SELECT * FROM department_labs WHERE department_id = ? ORDER BY sort_order ASC, id ASC');
$labStmt->execute([$activeDeptId]);
$labs = $labStmt->fetchAll();

$activeLib = ($activeDept && !empty($activeDept['library_json'])) ? json_decode((string)$activeDept['library_json'], true) : [];
if (!is_array($activeLib)) $activeLib = [];
$activeSchema = ($activeDept && !empty($activeDept['faculty_field_schema_json'])) ? json_decode((string)$activeDept['faculty_field_schema_json'], true) : ['Google Scholar', 'ORCID ID'];
if (!is_array($activeSchema)) $activeSchema = [];

if (!$msg && !empty($_GET['msg'])) {
    $msg = 'Department action completed.';
}

$adminPageTitle = 'Departments & Customizable Micro-Pages';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>
  <div style="margin-bottom:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
    <?php foreach ($deptList as $d): ?>
      <a href="?dept_id=<?= (int)$d['id'] ?>" class="btn-primary" style="<?= (int)$d['id'] === $activeDeptId ? '' : 'opacity:0.62;' ?>"><?= e($d['name']) ?> (<?= e($d['code']) ?>)</a>
    <?php endforeach; ?>
  </div>

  <?php if ($isFullDeptAdmin): ?>
    <details class="card" style="margin-bottom:1.5rem;">
      <summary style="cursor:pointer;font-weight:700;font-size:1.05rem;">+ Add Additional Academic Department</summary>
      <form method="post" enctype="multipart/form-data" style="margin-top:1rem;">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="add_department">
        <div class="grid-2" style="margin-bottom:0.5rem;">
          <input type="text" name="name" required placeholder="Department Name (e.g. AI & Data Science)" style="padding:0.5rem;">
          <input type="text" name="code" required placeholder="Code (e.g. AIDS)" style="padding:0.5rem;">
          <input type="text" name="slug" required placeholder="URL Slug (e.g. ai-data-science)" style="padding:0.5rem;">
          <input type="text" name="short_name" placeholder="Short Name" style="padding:0.5rem;">
          <input type="number" name="established_year" value="2026" placeholder="Established Year" style="padding:0.5rem;">
          <input type="number" name="intake_capacity" value="60" placeholder="Intake Capacity" style="padding:0.5rem;">
          <input type="text" name="hod_name" required placeholder="HoD Full Name" style="padding:0.5rem;">
          <input type="text" name="nba_status" value="AICTE Approved" placeholder="NBA / Accreditation Status" style="padding:0.5rem;">
        </div>
        <textarea name="overview" rows="2" required placeholder="Department overview..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"></textarea>
        <label style="display:block;margin-bottom:0.5rem;font-size:0.85rem;">Upload Department Hero Banner (JPG/PNG/WEBP):
          <input type="file" name="hero_image" accept="image/jpeg,image/png,image/webp" data-aspect="16:9">
        </label>
        <label style="display:block;margin-bottom:0.75rem;font-size:0.85rem;font-weight:600;">
          <input type="checkbox" name="is_shareable" value="1" checked> Enable Social Share Buttons on Department Microsite
        </label>
        <button type="submit" class="btn-primary">Create Department Microsite</button>
      </form>
    </details>
  <?php endif; ?>

  <?php if ($activeDept): ?>
    <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
      <h2 style="margin-top:0;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">Department Profile &amp; Banner Image <?= cmsModerationStatusBadge((string)($activeDept['status'] ?? 'published')) ?></h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="update_department">
      <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
      <input type="hidden" name="existing_hero_image" value="<?= e($activeDept['hero_image_url']) ?>">
      <div class="grid-2" style="margin-bottom:0.5rem;">
        <input type="text" name="name" required value="<?= e($activeDept['name']) ?>" style="padding:0.5rem;">
        <input type="text" name="short_name" required value="<?= e($activeDept['short_name']) ?>" style="padding:0.5rem;">
        <input type="number" name="established_year" value="<?= (int)$activeDept['established_year'] ?>" style="padding:0.5rem;">
        <input type="number" name="intake_capacity" value="<?= (int)$activeDept['intake_capacity'] ?>" style="padding:0.5rem;">
        <input type="text" name="hod_name" value="<?= e($activeDept['hod_name']) ?>" style="padding:0.5rem;">
        <input type="text" name="nba_status" value="<?= e($activeDept['nba_status']) ?>" style="padding:0.5rem;">
      </div>
      <textarea name="overview" rows="2" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e($activeDept['overview']) ?></textarea>
      <textarea name="hod_message" rows="2" placeholder="HoD Message" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e($activeDept['hod_message'] ?? '') ?></textarea>
      <div class="grid-2" style="margin-bottom:0.5rem;">
        <textarea name="vision" rows="2" placeholder="Vision" style="padding:0.5rem;"><?= e($activeDept['vision'] ?? '') ?></textarea>
        <textarea name="mission" rows="2" placeholder="Mission" style="padding:0.5rem;"><?= e($activeDept['mission'] ?? '') ?></textarea>
      </div>
      <label style="display:block;margin-bottom:0.55rem;font-size:0.85rem;">Upload New Hero Banner Image (Current: <code><?= e($activeDept['hero_image_url']) ?></code>):
        <input type="file" name="hero_image" accept="image/jpeg,image/png,image/webp" data-aspect="16:9">
      </label>
      <label style="display:block;margin-bottom:0.75rem;font-size:0.85rem;font-weight:600;">
        <input type="checkbox" name="is_shareable" value="1" <?= (!isset($activeDept['is_shareable']) || !empty($activeDept['is_shareable'])) ? 'checked' : '' ?>> Enable Social Share Buttons on this Department Microsite
      </label>
      <button type="submit" class="btn-primary">Save Department Profile</button>
    </form>

    <!-- Department Library Photo & Faculty Custom Field Schema -->
    <form method="post" enctype="multipart/form-data" class="card" style="margin-bottom:1.5rem;">
      <h2 style="margin-top:0;">Department Library (With Photo Upload) &amp; Faculty Custom Field Presets</h2>
      <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
      <input type="hidden" name="action" value="update_library_schema">
      <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
      <input type="hidden" name="existing_library_photo" value="<?= e($activeLib['photoUrl'] ?? 'assets/images/hero_library.jpg') ?>">

      <div class="grid-3" style="margin-bottom:0.6rem;">
        <label>Library Title
          <input type="text" name="lib_name" value="<?= e($activeLib['name'] ?? '') ?>" placeholder="CSE Departmental Library" style="width:100%;padding:0.45rem;">
        </label>
        <label>Volumes Count
          <input type="number" name="lib_volumes" value="<?= (int)($activeLib['volumesCount'] ?? 0) ?>" style="width:100%;padding:0.45rem;">
        </label>
        <label>Journals Count
          <input type="number" name="lib_journals" value="<?= (int)($activeLib['journalsCount'] ?? 0) ?>" style="width:100%;padding:0.45rem;">
        </label>
        <label>Library In-Charge
          <input type="text" name="lib_incharge" value="<?= e($activeLib['incharge'] ?? '') ?>" style="width:100%;padding:0.45rem;">
        </label>
        <label>Timings
          <input type="text" name="lib_timings" value="<?= e($activeLib['timings'] ?? 'Mon–Sat, 8:30 AM – 6:30 PM') ?>" style="width:100%;padding:0.45rem;">
        </label>
        <label>Library Photo Upload (JPG/PNG/WEBP)
          <input type="file" name="library_photo" accept="image/jpeg,image/png,image/webp" data-aspect="4:3" style="display:block;margin-top:4px;">
        </label>
      </div>
      <div class="grid-2" style="margin-bottom:0.6rem;">
        <label>E-Resources Summary
          <input type="text" name="lib_eresources" value="<?= e($activeLib['eResourcesSummary'] ?? '') ?>" placeholder="IEEE Xplore, ACM, NPTEL..." style="width:100%;padding:0.45rem;">
        </label>
        <label>Department Custom Faculty Profile Fields (comma-separated presets)
          <input type="text" name="faculty_schema" value="<?= e(implode(', ', $activeSchema)) ?>" placeholder="Google Scholar, ORCID ID, Scopus Author ID, Patents" style="width:100%;padding:0.45rem;">
        </label>
      </div>
      <label style="display:block;margin-bottom:0.75rem;">Library Description
        <textarea name="lib_description" rows="2" style="width:100%;padding:0.45rem;"><?= e($activeLib['description'] ?? '') ?></textarea>
      </label>
      <button type="submit" class="btn-primary">Save Library &amp; Faculty Field Schema</button>
    </form>

    <!-- Customizable Micro-Pages (Gallery, Notice Board, Notes/Syllabus, Events, Celebrations, Achievements) -->
    <div class="card" style="margin-bottom:1.5rem;">
      <h2 style="margin-top:0;"><?= $editSub ? 'Edit Micro-Page: ' . e($editSub['title']) : 'Add / Manage Department Micro-Pages (Gallery, Notice Board, Notes/Syllabus, Achievements)' ?></h2>
      <form method="post" style="margin-bottom:1rem;">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_subpage">
        <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
        <?php if ($editSub): ?><input type="hidden" name="subpage_id" value="<?= (int)$editSub['id'] ?>"><?php endif; ?>
        <div class="grid-3" style="margin-bottom:0.5rem;">
          <input type="text" name="title" required value="<?= e($editSub['title'] ?? '') ?>" placeholder="Micro-Page Title (e.g. Department Gallery)" style="padding:0.5rem;">
          <div style="display:flex;gap:0.4rem;">
            <input type="text" name="slug" required value="<?= e($editSub['slug'] ?? '') ?>" placeholder="url-slug (e.g. gallery)" style="flex:1;padding:0.5rem;">
            <input type="number" name="sort_order" min="1" value="<?= (int)($editSub['sort_order'] ?? (count($subs) + 1)) ?>" title="Sr. No." style="width:68px;padding:0.5rem;">
          </div>
          <select name="page_type" style="padding:0.5rem;">
            <?php foreach ($pageTypes as $pk => $pl): ?>
              <option value="<?= e($pk) ?>" <?= (($editSub['page_type'] ?? 'general') === $pk) ? 'selected' : '' ?>><?= e($pl) ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <textarea class="rich-editor" data-csrf="<?= e(csrfToken()) ?>" data-upload-url="<?= e(baseUrl('admin/upload_handler.php')) ?>" name="content_html" rows="8"><?= htmlspecialchars($editSub['content_html'] ?? '<p>Department micro-page content...</p>', ENT_QUOTES, 'UTF-8') ?></textarea>
        <div style="display:flex;flex-wrap:wrap;gap:1.25rem;margin:0.55rem 0;font-size:0.86rem;font-weight:600;">
          <label><input type="checkbox" name="is_published" <?= (!$editSub || !empty($editSub['is_published'])) ? 'checked' : '' ?>> Published</label>
          <label><input type="checkbox" name="is_shareable" value="1" <?= (!$editSub || !isset($editSub['is_shareable']) || !empty($editSub['is_shareable'])) ? 'checked' : '' ?>> Enable Social Share Buttons</label>
        </div>
        <button type="submit" class="btn-primary"><?= $editSub ? 'Update Micro-Page' : 'Save Micro-Page' ?></button>
        <?php if ($editSub): ?><a href="?dept_id=<?= $activeDeptId ?>" class="btn-secondary">Finish Editing</a><?php endif; ?>
      </form>

      <?php if ($editSub):
        $editPhotos = !empty($editSub['photos_json']) ? json_decode((string)$editSub['photos_json'], true) : [];
        if (!is_array($editPhotos)) $editPhotos = [];
        $editItems = !empty($editSub['items_json']) ? json_decode((string)$editSub['items_json'], true) : [];
        if (!is_array($editItems)) $editItems = [];
      ?>
        <div class="grid-2" style="margin:1.25rem 0;padding:1rem;background:var(--surface-bg);border:1px solid var(--border-color);border-radius:10px;">
          <div>
            <h3 style="margin-top:0;">Photos Inside "<?= e($editSub['title']) ?>" (<?= count($editPhotos) ?>)</h3>
            <form method="post" enctype="multipart/form-data" style="margin-bottom:0.75rem;">
              <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="action" value="add_subpage_photo">
              <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
              <input type="hidden" name="subpage_id" value="<?= (int)$editSub['id'] ?>">
              <input type="text" name="photo_caption" placeholder="Photo Caption" style="width:100%;padding:0.45rem;margin-bottom:0.4rem;">
              <input type="file" name="gallery_photo" accept="image/jpeg,image/png,image/webp" data-aspect="4:3" required style="margin-bottom:0.4rem;display:block;">
              <button type="submit" class="btn-primary" style="font-size:0.8rem;">+ Upload Photo to Micro-Page</button>
            </form>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:0.5rem;">
              <?php foreach ($editPhotos as $pIdx => $ph): ?>
                <div style="border:1px solid var(--border-color);border-radius:6px;overflow:hidden;background:#fff;">
                  <img src="<?= e(mediaUrl($ph['url'] ?? '')) ?>" alt="" style="width:100%;height:70px;object-fit:cover;">
                  <div style="padding:4px;font-size:0.72rem;"><?= e($ph['caption'] ?? '') ?></div>
                  <form method="post" style="padding:0 4px 4px;">
                    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                    <input type="hidden" name="action" value="delete_subpage_photo">
                    <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
                    <input type="hidden" name="subpage_id" value="<?= (int)$editSub['id'] ?>">
                    <input type="hidden" name="photo_index" value="<?= $pIdx ?>">
                    <button type="submit" class="btn-secondary" style="width:100%;padding:2px;font-size:0.7rem;">Remove</button>
                  </form>
                </div>
              <?php endforeach; ?>
            </div>
          </div>

          <div>
            <h3 style="margin-top:0;">Notices / Notes / Achievements Items (<?= count($editItems) ?>)</h3>
            <form method="post" enctype="multipart/form-data" style="margin-bottom:0.75rem;">
              <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
              <input type="hidden" name="action" value="add_subpage_item">
              <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
              <input type="hidden" name="subpage_id" value="<?= (int)$editSub['id'] ?>">
              <input type="text" name="item_title" required placeholder="Item Title (e.g. Sem VI Notes / SIH Winner)" style="width:100%;padding:0.45rem;margin-bottom:0.35rem;">
              <div class="grid-2" style="margin-bottom:0.35rem;">
                <input type="date" name="item_date" value="<?= date('Y-m-d') ?>" style="padding:0.4rem;">
                <input type="text" name="item_badge" value="Notice" placeholder="Badge (Notice / Syllabus / Winner)" style="padding:0.4rem;">
              </div>
              <textarea name="item_summary" rows="2" placeholder="Summary details..." style="width:100%;padding:0.4rem;margin-bottom:0.35rem;"></textarea>
              <label style="display:block;font-size:0.78rem;margin-bottom:0.35rem;">Item Thumbnail Photo (Optional): <input type="file" name="item_photo" accept="image/jpeg,image/png,image/webp" data-aspect="4:3"></label>
              <label style="display:block;font-size:0.78rem;margin-bottom:0.35rem;">Attach File (PDF/DOCX): <input type="file" name="item_file"></label>
              <input type="url" name="item_link_url" placeholder="Or Paste Google Drive / External Download URL (https://...)" style="width:100%;padding:0.4rem;margin-bottom:0.35rem;">
              <input type="text" name="item_link_label" placeholder="Button Label (e.g. Open Google Drive)" style="width:100%;padding:0.4rem;margin-bottom:0.45rem;">
              <button type="submit" class="btn-primary" style="font-size:0.8rem;">+ Add Structured Item</button>
            </form>
            <?php foreach ($editItems as $iIdx => $it): ?>
              <div style="padding:0.4rem 0.5rem;border:1px solid var(--border-color);border-radius:6px;background:#fff;margin-bottom:0.35rem;display:flex;justify-content:space-between;align-items:center;gap:6px;">
                <div style="font-size:0.78rem;"><strong><?= e($it['title'] ?? '') ?></strong> <small>(<?= e($it['badge'] ?? '') ?>)</small></div>
                <form method="post">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="delete_subpage_item">
                  <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
                  <input type="hidden" name="subpage_id" value="<?= (int)$editSub['id'] ?>">
                  <input type="hidden" name="item_index" value="<?= $iIdx ?>">
                  <button type="submit" class="btn-secondary" style="padding:2px 6px;font-size:0.72rem;">Remove</button>
                </form>
              </div>
            <?php endforeach; ?>
          </div>
        </div>
      <?php endif; ?>

      <table class="data-table">
        <thead><tr><th>Order</th><th>Micro-Page Title</th><th>Type</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <?php foreach ($subs as $s): ?>
            <tr>
              <td style="white-space:nowrap;">
                <form method="post" style="display:inline;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="move_subpage">
                  <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
                  <input type="hidden" name="subpage_id" value="<?= (int)$s['id'] ?>">
                  <button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;" title="Move Up">&uarr;</button>
                  <button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;" title="Move Down">&darr;</button>
                </form>
                <span style="margin-left:4px;font-size:0.8rem;">#<?= (int)($s['sort_order'] ?? 1) ?></span>
              </td>
              <td><?= e($s['title']) ?></td>
              <td><?= e($pageTypes[$s['page_type'] ?? 'general'] ?? ($s['page_type'] ?? 'general')) ?></td>
              <td><?= e($s['slug']) ?></td>
              <td><?= !empty($s['is_published']) ? 'Published' : 'Draft' ?> <?= cmsModerationStatusBadge((string)($s['status'] ?? 'published')) ?></td>
              <td style="white-space:nowrap;">
                <a href="?dept_id=<?= $activeDeptId ?>&edit_sub=<?= (int)$s['id'] ?>" class="btn-primary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Edit &amp; Media</a>
                <form method="post" style="display:inline;" onsubmit="return confirm('Delete micro-page?');">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="delete_subpage">
                  <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
                  <input type="hidden" name="subpage_id" value="<?= (int)$s['id'] ?>">
                  <button type="submit" class="btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.8rem;">Delete</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>

    <!-- Faculty & Laboratories -->
    <div class="grid-2" style="align-items:start;">
      <div class="card">
        <?php
        $editFacCustom = ($editFac && !empty($editFac['custom_fields_json'])) ? json_decode((string)$editFac['custom_fields_json'], true) : [];
        if (!is_array($editFacCustom)) $editFacCustom = [];
        $mergedCustomKeys = array_unique(array_merge($activeSchema, array_keys($editFacCustom)));
        ?>
        <h2 style="margin-top:0;"><?= $editFac ? 'Edit Faculty: ' . e($editFac['name']) : 'Add Customizable Faculty Profile' ?></h2>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
          <input type="hidden" name="action" value="<?= $editFac ? 'update_faculty' : 'add_faculty' ?>">
          <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
          <?php if ($editFac): ?><input type="hidden" name="faculty_id" value="<?= (int)$editFac['id'] ?>"><?php endif; ?>
          <input type="hidden" name="existing_photo" value="<?= e($editFac['photo_url'] ?? 'assets/images/principal.jpg') ?>">

          <div style="display:flex;gap:0.45rem;margin-bottom:0.45rem;">
            <input type="number" min="1" name="sort_order" value="<?= (int)($editFac['sort_order'] ?? (count($facultyList) + 1)) ?>" placeholder="Sr. No." title="Manual Serial Number (Sr. No.)" style="width:92px;padding:0.45rem;">
            <input type="text" name="name" required value="<?= e($editFac['name'] ?? '') ?>" placeholder="Faculty Full Name" style="flex:1;padding:0.45rem;">
          </div>
          <input type="text" name="designation" required value="<?= e($editFac['designation'] ?? '') ?>" placeholder="Designation" style="width:100%;padding:0.45rem;margin-bottom:0.45rem;">
          <input type="text" name="qualification" required value="<?= e($editFac['qualification'] ?? '') ?>" placeholder="Qualification (e.g. Ph.D., M.Tech)" style="width:100%;padding:0.45rem;margin-bottom:0.45rem;">
          <input type="text" name="specialization" required value="<?= e($editFac['specialization'] ?? '') ?>" placeholder="Area of Expertise / Specialization" style="width:100%;padding:0.45rem;margin-bottom:0.45rem;">
          <div class="grid-2" style="margin-bottom:0.45rem;">
            <input type="email" name="email" required value="<?= e($editFac['email'] ?? '') ?>" placeholder="Email" style="padding:0.45rem;">
            <input type="text" name="phone" value="<?= e($editFac['phone'] ?? '') ?>" placeholder="Phone (Optional)" style="padding:0.45rem;">
          </div>
          <div class="grid-2" style="margin-bottom:0.45rem;">
            <input type="number" name="experience_years" value="<?= (int)($editFac['experience_years'] ?? 10) ?>" placeholder="Years Experience" style="padding:0.45rem;">
            <input type="url" name="external_profile_url" value="<?= e($editFac['external_profile_url'] ?? '') ?>" placeholder="External Profile URL (Scholar/LinkedIn)" style="padding:0.45rem;">
          </div>
          <input type="text" name="external_profile_label" value="<?= e($editFac['external_profile_label'] ?? '') ?>" placeholder="External Link Label (e.g. Google Scholar Profile)" style="width:100%;padding:0.45rem;margin-bottom:0.45rem;">

          <div style="border:1px solid var(--border-color);border-radius:8px;padding:0.65rem;margin-bottom:0.5rem;background:var(--surface-bg);">
            <strong style="display:block;font-size:0.82rem;margin-bottom:0.4rem;">Custom Faculty Fields (Add/Edit Values):</strong>
            <?php foreach ($mergedCustomKeys as $ck): ?>
              <div style="display:flex;gap:0.4rem;margin-bottom:0.35rem;">
                <input type="text" name="cf_key[]" value="<?= e($ck) ?>" placeholder="Field Label" style="width:42%;padding:0.35rem;font-size:0.8rem;">
                <input type="text" name="cf_val[]" value="<?= e((string)($editFacCustom[$ck] ?? '')) ?>" placeholder="Value (leave blank to omit)" style="flex:1;padding:0.35rem;font-size:0.8rem;">
              </div>
            <?php endforeach; ?>
            <div style="display:flex;gap:0.4rem;">
              <input type="text" name="cf_key[]" placeholder="+ Extra Field Name" style="width:42%;padding:0.35rem;font-size:0.8rem;">
              <input type="text" name="cf_val[]" placeholder="Value" style="flex:1;padding:0.35rem;font-size:0.8rem;">
            </div>
          </div>

          <label style="display:block;font-size:0.85rem;margin-bottom:0.45rem;">Faculty Photo: <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" data-aspect="1:1"></label>
          <label style="display:block;margin-bottom:0.5rem;"><input type="checkbox" name="is_hod" <?= !empty($editFac['is_hod']) ? 'checked' : '' ?>> Mark as HoD</label>
          <button type="submit" class="btn-primary"><?= $editFac ? 'Update Faculty' : 'Add Faculty' ?></button>
          <?php if ($editFac): ?><a href="?dept_id=<?= $activeDeptId ?>" class="btn-secondary">Cancel</a><?php endif; ?>
        </form>
        <ul style="margin-top:1rem;padding-left:0;list-style:none;">
          <?php foreach ($facultyList as $fIdx => $f): ?>
            <li style="margin-bottom:0.5rem;font-size:0.86rem;display:flex;justify-content:space-between;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--border-color);">
              <div>
                <span style="display:inline-block;padding:1px 6px;border-radius:4px;background:var(--surface-bg);border:1px solid var(--border-color);font-weight:700;font-size:0.74rem;margin-right:4px;">Sr. No. <?= (int)($f['sort_order'] ?? ($fIdx + 1)) ?></span>
                <strong><?= e($f['name']) ?></strong> — <?= e($f['designation']) ?>
              </div>
              <div style="white-space:nowrap;">
                <form method="post" style="display:inline;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="move_faculty">
                  <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
                  <input type="hidden" name="faculty_id" value="<?= (int)$f['id'] ?>">
                  <button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;font-size:0.74rem;" title="Move Up">&uarr;</button>
                  <button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;font-size:0.74rem;" title="Move Down">&darr;</button>
                </form>
                <a href="?dept_id=<?= $activeDeptId ?>&edit_fac=<?= (int)$f['id'] ?>" class="btn-primary" style="padding:2px 7px;font-size:0.74rem;margin-left:4px;">Edit</a>
                <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_faculty"><input type="hidden" name="department_id" value="<?= $activeDeptId ?>"><input type="hidden" name="faculty_id" value="<?= (int)$f['id'] ?>"><button type="submit" class="btn-secondary" style="padding:2px 7px;font-size:0.74rem;">Remove</button></form>
              </div>
            </li>
          <?php endforeach; ?>
        </ul>
      </div>

      <div class="card">
        <h2 style="margin-top:0;"><?= $editLab ? 'Edit Laboratory: ' . e($editLab['name']) : 'Add Laboratory (With Photo Upload)' ?></h2>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
          <input type="hidden" name="action" value="<?= $editLab ? 'update_lab' : 'add_lab' ?>">
          <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
          <?php if ($editLab): ?><input type="hidden" name="lab_id" value="<?= (int)$editLab['id'] ?>"><?php endif; ?>
          <input type="hidden" name="existing_lab_photo" value="<?= e($editLab['photo_url'] ?? '') ?>">

          <div style="display:flex;gap:0.45rem;margin-bottom:0.5rem;">
            <input type="number" min="1" name="sort_order" value="<?= (int)($editLab['sort_order'] ?? (count($labs) + 1)) ?>" placeholder="Sr. No." title="Display Order" style="width:92px;padding:0.5rem;">
            <input type="text" name="name" required value="<?= e($editLab['name'] ?? '') ?>" placeholder="Laboratory Name" style="flex:1;padding:0.5rem;">
          </div>
          <input type="number" name="area_sqft" required value="<?= (int)($editLab['area_sqft'] ?? 1200) ?>" placeholder="Area (Sq.Ft.)" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
          <input type="text" name="incharge" required value="<?= e($editLab['incharge'] ?? '') ?>" placeholder="Lab In-Charge" style="width:100%;padding:0.5rem;margin-bottom:0.5rem;">
          <textarea name="equipment_summary" rows="3" required placeholder="Equipment & software details..." style="width:100%;padding:0.5rem;margin-bottom:0.5rem;"><?= e($editLab['equipment_summary'] ?? '') ?></textarea>
          <label style="display:block;font-size:0.85rem;margin-bottom:0.65rem;">Laboratory Photo (JPG/PNG/WEBP): <input type="file" name="lab_photo" accept="image/jpeg,image/png,image/webp" data-aspect="4:3"></label>
          <button type="submit" class="btn-primary"><?= $editLab ? 'Update Laboratory' : 'Add Laboratory' ?></button>
          <?php if ($editLab): ?><a href="?dept_id=<?= $activeDeptId ?>" class="btn-secondary">Cancel</a><?php endif; ?>
        </form>
        <ul style="margin-top:1rem;padding-left:0;list-style:none;">
          <?php foreach ($labs as $lIdx => $l): ?>
            <li style="margin-bottom:0.5rem;font-size:0.86rem;display:flex;justify-content:space-between;align-items:center;gap:0.5rem;padding:0.4rem 0;border-bottom:1px solid var(--border-color);">
              <div>
                <span style="display:inline-block;padding:1px 6px;border-radius:4px;background:var(--surface-bg);border:1px solid var(--border-color);font-weight:700;font-size:0.74rem;margin-right:4px;">#<?= (int)($l['sort_order'] ?? ($lIdx + 1)) ?></span>
                <strong><?= e($l['name']) ?></strong> (<?= (int)$l['area_sqft'] ?> sq.ft.)
              </div>
              <div style="white-space:nowrap;">
                <form method="post" style="display:inline;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="move_lab">
                  <input type="hidden" name="department_id" value="<?= $activeDeptId ?>">
                  <input type="hidden" name="lab_id" value="<?= (int)$l['id'] ?>">
                  <button type="submit" name="dir" value="up" class="btn-secondary" style="padding:2px 6px;font-size:0.74rem;" title="Move Up">&uarr;</button>
                  <button type="submit" name="dir" value="down" class="btn-secondary" style="padding:2px 6px;font-size:0.74rem;" title="Move Down">&darr;</button>
                </form>
                <a href="?dept_id=<?= $activeDeptId ?>&edit_lab=<?= (int)$l['id'] ?>" class="btn-primary" style="padding:2px 7px;font-size:0.74rem;margin-left:4px;">Edit</a>
                <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_lab"><input type="hidden" name="department_id" value="<?= $activeDeptId ?>"><input type="hidden" name="lab_id" value="<?= (int)$l['id'] ?>"><button type="submit" class="btn-secondary" style="padding:2px 7px;font-size:0.74rem;">Remove</button></form>
              </div>
            </li>
          <?php endforeach; ?>
        </ul>
      </div>
    </div>
  <?php endif; ?>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
