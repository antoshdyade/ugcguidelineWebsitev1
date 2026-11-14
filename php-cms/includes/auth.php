<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    $currentSavePath = session_save_path() ?: sys_get_temp_dir();
    if (!@is_writable($currentSavePath)) {
        $fallbackSessions = __DIR__ . '/../uploads/.sessions';
        if (!is_dir($fallbackSessions)) {
            @mkdir($fallbackSessions, 0700, true);
        }
        if (is_dir($fallbackSessions) && is_writable($fallbackSessions)) {
            session_save_path($fallbackSessions);
        } else {
            session_save_path(sys_get_temp_dir());
        }
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params([
        'lifetime' => 43200,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(?string $submitted): void
{
    if (!$submitted || !hash_equals($_SESSION['csrf_token'] ?? '', $submitted)) {
        http_response_code(403);
        exit('Invalid or missing CSRF security token.');
    }
}

function currentUser(): ?array
{
    return $_SESSION['cms_user'] ?? null;
}

function requireLogin(): array
{
    $user = currentUser();
    if (!$user) {
        header('Location: login.php');
        exit;
    }
    return $user;
}

function canAccessResource(array $user, string $resource, ?int $targetDeptId = null): bool
{
    $role = $user['role'] ?? '';
    if ($role === 'super_admin') {
        return true;
    }
    $hasExplicitScope = !empty($user['allowed_categories']) || !empty($user['allowed_page_ids']);
    return match ($resource) {
        'users', 'settings', 'audit_logs' => false,
        'sliders_events', 'gallery', 'directory' => $role === 'content_editor',
        'categories'                      => in_array($role, ['content_editor', 'iqac_officer'], true),
        'pages'                           => in_array($role, ['content_editor', 'iqac_officer', 'exam_controller'], true) || $hasExplicitScope,
        'documents'                       => in_array($role, ['iqac_officer', 'content_editor', 'exam_controller'], true),
        'leadership'                      => in_array($role, ['iqac_officer', 'content_editor'], true),
        'alumni'                          => in_array($role, ['content_editor', 'iqac_officer'], true),
        'departments'                     => $role === 'department_admin'
            && ($targetDeptId === null ? !empty($user['assigned_department_id']) : (int)$user['assigned_department_id'] === $targetDeptId),
        default                           => false,
    };
}

function canAccessCategory(array $user, string $categorySlug): bool
{
    $role = $user['role'] ?? '';
    if ($role === 'super_admin') {
        return true;
    }
    $allowedCats = $user['allowed_categories'] ?? null;
    if (is_array($allowedCats) && count($allowedCats) > 0) {
        return in_array($categorySlug, $allowedCats, true);
    }
    $allowedPages = $user['allowed_page_ids'] ?? null;
    if (is_array($allowedPages) && count($allowedPages) > 0) {
        return false;
    }
    if ($role === 'exam_controller') {
        return $categorySlug === 'examination';
    }
    return in_array($role, ['content_editor', 'iqac_officer'], true);
}

function canAccessPage(array $user, array $page, ?string $categorySlug = null): bool
{
    $role = $user['role'] ?? '';
    if ($role === 'super_admin') {
        return true;
    }
    $allowedPages = $user['allowed_page_ids'] ?? null;
    if (is_array($allowedPages) && count($allowedPages) > 0) {
        return in_array((int)($page['id'] ?? 0), array_map('intval', $allowedPages), true);
    }
    $catSlug = $categorySlug ?? ($page['category_slug'] ?? $page['cat_slug'] ?? '');
    if ($catSlug !== '') {
        return canAccessCategory($user, $catSlug);
    }
    return canAccessResource($user, 'pages');
}

function leadershipGroupPresets(): array
{
    return [
        'Statutory Officer',
        'Governing Body',
        'Internal Complaint Committee (ICC)',
        'Academic Leadership',
        'Board of Studies',
        'Finance Committee',
        'Academic Council',
    ];
}

function formatCommitteeGroupLabel(?string $group): string
{
    $raw = trim((string)$group);
    if ($raw === '') {
        return 'Leadership & Governance';
    }
    return match ($raw) {
        'statutory'           => 'Statutory Officer',
        'governance'          => 'Governing Body',
        'icc'                 => 'Internal Complaint Committee (ICC)',
        'academic_leadership' => 'Academic Leadership',
        default               => $raw,
    };
}

function defaultAlumniSettings(): array
{
    return [
        'heroTitle'             => "SVERI's COE Alumni Association & Global Network",
        'heroSubtitle'          => 'Connecting 11,500+ engineering graduates, mentors, industry leaders, and chapter communities across Pune, Bengaluru, Mumbai, USA, Europe & Pandharpur.',
        'associationRegNo'      => 'MH/SOL/ALU-2016/06220',
        'coordinatorName'       => 'Prof. D. B. Kulkarni',
        'coordinatorEmail'      => 'alumni@coe.sveri.ac.in',
        'allowSelfRegistration' => true,
        'allowPublicJobPosting' => true,
    ];
}

function getAlumniSettings(PDO $pdo): array
{
    $def = defaultAlumniSettings();
    try {
        $stmt = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'alumni_settings' LIMIT 1");
        $stmt->execute();
        $raw = $stmt->fetchColumn();
        if ($raw) {
            $decoded = json_decode((string)$raw, true);
            if (is_array($decoded)) {
                return array_merge($def, $decoded);
            }
        }
    } catch (Throwable $ignored) {
    }
    return $def;
}

function ensureCmsSchemaUpgraded(PDO $pdo): void
{
    static $upgraded = false;
    if ($upgraded) {
        return;
    }
    $upgraded = true;

    try {
        $pdo->exec(
            'CREATE TABLE IF NOT EXISTS cms_kv_store (
                key_name VARCHAR(80) PRIMARY KEY,
                val_json MEDIUMTEXT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB'
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS custom_home_components (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(180) NOT NULL,
                placement ENUM('after-hero', 'after-about', 'after-depts', 'before-footer') DEFAULT 'after-hero',
                html_content MEDIUMTEXT NOT NULL,
                sort_order INT DEFAULT 1,
                is_active TINYINT(1) DEFAULT 1,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS alumni_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(150) NOT NULL,
                email VARCHAR(160) NOT NULL,
                phone VARCHAR(60) NULL,
                graduation_year SMALLINT NOT NULL,
                department_code VARCHAR(20) NOT NULL,
                department_name VARCHAR(160) NOT NULL,
                degree VARCHAR(120) NOT NULL,
                current_company VARCHAR(160) NULL,
                designation VARCHAR(160) NULL,
                location VARCHAR(160) NULL,
                chapter VARCHAR(120) DEFAULT 'Pandharpur Home Chapter',
                linkedin_url VARCHAR(500) NULL,
                photo_url VARCHAR(255) DEFAULT 'assets/images/principal.jpg',
                bio TEXT NULL,
                open_to_mentorship TINYINT(1) DEFAULT 0,
                is_featured TINYINT(1) DEFAULT 0,
                status ENUM('approved','pending','rejected') DEFAULT 'pending',
                sort_order INT DEFAULT 1,
                registered_at DATE NOT NULL
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS alumni_jobs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                company VARCHAR(160) NOT NULL,
                location VARCHAR(160) NOT NULL,
                job_type ENUM('Full-Time','Internship','Referral','Part-Time') DEFAULT 'Full-Time',
                department_focus VARCHAR(80) DEFAULT 'ALL',
                experience_range VARCHAR(80) DEFAULT '0-2 Years',
                compensation VARCHAR(100) NULL,
                description TEXT NOT NULL,
                apply_url_or_email VARCHAR(300) NOT NULL,
                posted_by_alumni_name VARCHAR(140) NOT NULL,
                posted_by_batch VARCHAR(80) NOT NULL,
                deadline_date DATE NULL,
                status ENUM('open','pending','closed') DEFAULT 'open',
                posted_at DATE NOT NULL,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS alumni_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(220) NOT NULL,
                chapter VARCHAR(120) NOT NULL,
                event_date DATE NOT NULL,
                venue VARCHAR(255) NOT NULL,
                organizer VARCHAR(180) NOT NULL,
                description TEXT NOT NULL,
                banner_url VARCHAR(255) DEFAULT 'assets/images/convocation.jpg',
                registration_url VARCHAR(500) NULL,
                rsvp_count INT UNSIGNED DEFAULT 0,
                is_active TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );

        $chkStmt = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'alumni_seeded_v1' LIMIT 1");
        $chkStmt->execute();
        $alreadySeeded = (bool)$chkStmt->fetchColumn();
        $profileCount = (int)$pdo->query('SELECT COUNT(*) FROM alumni_profiles')->fetchColumn();

        if (!$alreadySeeded && $profileCount === 0) {
            $insProf = $pdo->prepare(
                'INSERT INTO alumni_profiles (full_name, email, phone, graduation_year, department_code, department_name, degree, current_company, designation, location, chapter, linkedin_url, photo_url, bio, open_to_mentorship, is_featured, status, sort_order, registered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            );
            $seedProfiles = [
                ['Rohan Deshmukh', 'rohan.deshmukh@alumni.svcoer.edu.in', '+91-98220-11201', 2016, 'CSE', 'Computer Science & Engineering', 'B.E. (CSE)', 'Microsoft India', 'Principal Cloud Architect', 'Hyderabad, India', 'Hyderabad Chapter', 'https://linkedin.com', 'assets/images/principal.jpg', 'Mentoring final-year CSE students in distributed systems, Azure architecture, and product engineering interviews.', 1, 1, 'approved', 1, '2026-01-12'],
                ['Snehal Patwardhan', 'snehal.patwardhan@alumni.svcoer.edu.in', '+91-98901-44310', 2018, 'ENTC', 'Electronics & Telecommunication Engineering', 'B.E. (E&TC)', 'Qualcomm', 'Staff SoC Verification Engineer', 'Bengaluru, India', 'Bengaluru Chapter', 'https://linkedin.com', 'assets/images/faculty_default.jpg', 'Conducting annual VLSI & RTL verification bootcamps for E&TC undergraduates at Pandharpur.', 1, 1, 'approved', 2, '2026-02-04'],
                ['Aditya Kulkarni', 'aditya.k@alumni.svcoer.edu.in', null, 2015, 'MECH', 'Mechanical Engineering', 'B.E. (Mechanical)', 'Bharat Forge Ltd.', 'Deputy General Manager - EV Powertrain', 'Pune, India', 'Pune Chapter', 'https://linkedin.com', 'assets/images/principal.jpg', 'Facilitating sponsored industrial projects and plant visits for SVERI Mechanical and Mechatronics cohorts.', 1, 1, 'approved', 3, '2026-03-19'],
                ['Priya Joshi', 'priya.joshi@alumni.svcoer.edu.in', null, 2020, 'CIVIL', 'Civil Engineering', 'B.E. (Civil)', 'Larsen & Toubro', 'Senior Structural Design Engineer', 'Mumbai, India', 'Mumbai Chapter', 'https://linkedin.com', 'assets/images/faculty_default.jpg', 'Infrastructure & metro rail structural design specialist supporting GATE aspirants.', 0, 0, 'approved', 4, '2026-05-08'],
                ['Omkar Shinde', 'omkar.shinde@alumni.svcoer.edu.in', null, 2022, 'ELEC', 'Electrical Engineering', 'B.Tech (Electrical)', 'Tata Power', 'Lead Smart Grid Automation Engineer', 'Pune, India', 'Pune Chapter', 'https://linkedin.com', 'assets/images/hero_campus.jpg', 'Working on SCADA renewable integration and helping pre-final students with core electrical internships.', 1, 0, 'approved', 5, '2026-07-14'],
                ['Tanvi Mane', 'tanvi.mane@alumni.svcoer.edu.in', null, 2023, 'CSE', 'Computer Science & Engineering', 'B.Tech (CSE)', 'Infosys Finacle', 'Systems Specialist - AI & Data', 'Pandharpur, India', 'Pandharpur Home Chapter', null, 'assets/images/convocation.jpg', 'Recent graduate eager to mentor coding club members on full-stack TypeScript and placements.', 1, 0, 'pending', 6, '2026-11-01'],
            ];
            foreach ($seedProfiles as $sp) {
                $insProf->execute($sp);
            }

            if ((int)$pdo->query('SELECT COUNT(*) FROM alumni_jobs')->fetchColumn() === 0) {
                $insJob = $pdo->prepare(
                    'INSERT INTO alumni_jobs (title, company, location, job_type, department_focus, experience_range, compensation, description, apply_url_or_email, posted_by_alumni_name, posted_by_batch, deadline_date, status, posted_at, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
                );
                $seedJobs = [
                    ['Graduate Software Engineer (React & Cloud)', 'Infosys Digital', 'Pune / Hybrid', 'Full-Time', 'CSE', '0-2 Years', 'Rs. 6.5 - 9.0 LPA', 'Alumni referral drive for 2025/2026 batch CSE & E&TC graduates with strong TypeScript, Node.js, and SQL fundamentals.', 'https://careers.infosys.com', 'Rohan Deshmukh', '2016 CSE', '2026-12-20', 'open', '2026-11-02', 1],
                    ['EV Battery Pack Thermal Design Intern', 'Bharat Forge EV', 'Chakan, Pune', 'Internship', 'MECH', 'Final Year Students', 'Rs. 22,000 / month', '6-month industrial internship with PPO conversion opportunity in CAD/FEA thermal simulation.', 'mailto:alumni.jobs@coe.sveri.ac.in', 'Aditya Kulkarni', '2015 MECH', '2026-12-15', 'open', '2026-10-28', 2],
                    ['VLSI RTL Verification Referral', 'Qualcomm India', 'Bengaluru', 'Referral', 'ENTC', '1-3 Years', 'Rs. 14 - 20 LPA', 'SystemVerilog / UVM verification openings for SVERI alumni and M.Tech microelectronics graduates.', 'https://www.qualcomm.com/company/careers', 'Snehal Patwardhan', '2018 ENTC', '2026-12-30', 'open', '2026-10-20', 3],
                    ['Substation SCADA Commissioning Engineer', 'Tata Power', 'Maharashtra / Pan-India', 'Full-Time', 'ELEC', '0-2 Years', 'Rs. 6.0 LPA', 'Field & automation role covering smart grid protection relays and PLC telemetry.', 'mailto:hr.grid@coe.sveri.ac.in', 'Omkar Shinde', '2022 ELEC', '2026-12-10', 'open', '2026-11-05', 4],
                ];
                foreach ($seedJobs as $sj) {
                    $insJob->execute($sj);
                }
            }

            if ((int)$pdo->query('SELECT COUNT(*) FROM alumni_events')->fetchColumn() === 0) {
                $insEv = $pdo->prepare(
                    'INSERT INTO alumni_events (title, chapter, event_date, venue, organizer, description, banner_url, registration_url, rsvp_count, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
                );
                $seedEvs = [
                    ['Annual Grand Alumni Homecoming & Silver Jubilee Meet', 'Pandharpur Home Chapter', '2026-12-26', 'SVERI Central Auditorium, Gopalpur, Pandharpur', 'SVERI Alumni Association & Principal Office', 'Reunite on campus with batchmates, tour the new Autonomous Research Centres, felicitate Distinguished Alumni Awardees, and mentor current B.Tech students.', 'assets/images/convocation.jpg', '', 142, 1, 1],
                    ['Pune Chapter Industry Connect & Tech Networking Mixer', 'Pune Chapter', '2026-11-29', 'MCCIA Trade Tower, Senapati Bapat Road, Pune', 'Pune Chapter Committee (Batch 2010-2024)', 'Evening networking mixer for Pune-based SVERI engineers across IT, Automotive EV, and Infrastructure sectors with live placement referral desks.', 'assets/images/hero_campus.jpg', '', 86, 1, 2],
                    ['Bengaluru VLSI & Cloud Architecture Mentorship Roundtable', 'Bengaluru Chapter', '2026-12-12', 'Koramangala Tech Hub / Hybrid Live Stream', 'Bengaluru Chapter Leads', 'Structured 1-on-1 career mentorship session pairing senior Bengaluru alumni with pre-final year students.', 'assets/images/hero_library.jpg', '', 54, 1, 3],
                ];
                foreach ($seedEvs as $se) {
                    $insEv->execute($se);
                }
            }

            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('alumni_settings', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([json_encode(defaultAlumniSettings(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('alumni_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
                ->execute();
        }
    } catch (Throwable $ignoredSchema) {
    }
}

function swapSortOrder(PDO $pdo, string $table, int $id, string $dir, ?string $scopeCol = null, ?int $scopeVal = null, string $tieOrder = 'id ASC'): bool
{
    $allowedTables = [
        'categories',
        'pages',
        'department_subpages',
        'faculty',
        'department_labs',
        'leadership_profiles',
        'sliders',
        'ticker_items',
        'campus_events',
        'documents',
        'gallery_albums',
        'telephone_directory',
        'custom_home_components',
        'alumni_profiles',
        'alumni_jobs',
        'alumni_events',
    ];
    $allowedScopes = [null, 'category_id', 'department_id'];
    $allowedTies   = ['id ASC', 'id DESC', 'event_date DESC, id DESC', 'uploaded_at DESC, id DESC'];

    if (!in_array($table, $allowedTables, true) || !in_array($scopeCol, $allowedScopes, true) || !in_array($tieOrder, $allowedTies, true)) {
        return false;
    }

    if ($scopeCol !== null && $scopeVal !== null) {
        $stmt = $pdo->prepare("SELECT id, sort_order FROM `$table` WHERE `$scopeCol` = ? ORDER BY sort_order ASC, $tieOrder");
        $stmt->execute([$scopeVal]);
    } else {
        $stmt = $pdo->query("SELECT id, sort_order FROM `$table` ORDER BY sort_order ASC, $tieOrder");
    }
    $rows = $stmt->fetchAll();
    if (count($rows) < 2) {
        return false;
    }

    $targetIdx = -1;
    foreach ($rows as $idx => $r) {
        if ((int)$r['id'] === $id) {
            $targetIdx = $idx;
            break;
        }
    }
    if ($targetIdx === -1) {
        return false;
    }

    $swapIdx = ($dir === 'down') ? $targetIdx + 1 : $targetIdx - 1;
    if (!isset($rows[$swapIdx])) {
        return false;
    }

    // Reorder sequentially 1..N so duplicate sort_order defaults always swap cleanly
    $tmp = $rows[$targetIdx];
    $rows[$targetIdx] = $rows[$swapIdx];
    $rows[$swapIdx] = $tmp;

    $upd = $pdo->prepare("UPDATE `$table` SET sort_order = ? WHERE id = ?");
    foreach ($rows as $seq => $r) {
        $upd->execute([$seq + 1, (int)$r['id']]);
    }
    return true;
}

function validateExternalUrl(string $url): bool
{
    $url = trim($url);
    if ($url === '') {
        return false;
    }
    if (!preg_match('#^https?://#i', $url)) {
        return false;
    }
    return filter_var($url, FILTER_VALIDATE_URL) !== false;
}

function isExternalHttpUrl(?string $url): bool
{
    return $url !== null && preg_match('#^https?://#i', trim($url)) === 1;
}

function requireRoleAccess(string $resource, ?int $targetDeptId = null): array
{
    $user = requireLogin();
    if (!canAccessResource($user, $resource, $targetDeptId)) {
        http_response_code(403);
        exit('Access Denied: Insufficient RBAC privileges for this module.');
    }
    return $user;
}

function logAudit(PDO $pdo, array $user, string $action, string $entityType, string $entityTitle): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_title) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$user['email'], $user['role'], $action, $entityType, $entityTitle]);
}

/**
 * Strict Upload Security Validator:
 * - Blocks executable extensions (.php, .phtml, .exe, .sh, .js, .html) including double extensions
 * - Verifies actual server-side MIME type via finfo_file()
 * - Generates randomized safe filename
 */
function handleSecureUpload(array $file, string $uploadDir, int $maxBytes = 10485760): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'Upload error code: ' . ($file['error'] ?? 'unknown')];
    }
    if ($file['size'] <= 0 || $file['size'] > $maxBytes) {
        return ['ok' => false, 'error' => 'File exceeds configured ' . formatBytes($maxBytes) . ' upload limit.'];
    }

    $original = basename($file['name']);
    $parts = explode('.', strtolower($original));
    $blocked = ['php', 'phtml', 'php3', 'php4', 'php5', 'phar', 'exe', 'sh', 'bat', 'js', 'html', 'htm', 'svg', 'py', 'pl'];
    foreach (array_slice($parts, 1) as $seg) {
        if (in_array($seg, $blocked, true)) {
            return ['ok' => false, 'error' => "Executable extension '.$seg' is blocked."];
        }
    }

    $ext = end($parts);
    $allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx'];
    if (!in_array($ext, $allowedExts, true)) {
        return ['ok' => false, 'error' => 'Unsupported file extension.'];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $detectedMime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!in_array($detectedMime, $allowedMimes, true)) {
        return ['ok' => false, 'error' => "Disallowed MIME type: $detectedMime"];
    }

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    $safeName = bin2hex(random_bytes(8)) . '-' . preg_replace('/[^a-z0-9_-]/', '-', $parts[0]) . '.' . $ext;
    $dest = rtrim($uploadDir, '/') . '/' . $safeName;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        return ['ok' => false, 'error' => 'Failed to move uploaded file.'];
    }

    return [
        'ok'        => true,
        'file_name' => $safeName,
        'file_url'  => 'uploads/' . $safeName,
        'mime_type' => $detectedMime,
        'size'      => (int)$file['size'],
    ];
}

/**
 * Policy-aware upload wrapper reading configured Max Photo (MB) & Max Document (MB) limits.
 * $kind: 'photo' | 'document' | 'auto'
 */
function handleCmsUpload(PDO $pdo, array $file, string $uploadDir, string $kind = 'auto'): array
{
    $limits = function_exists('getUploadLimits')
        ? getUploadLimits($pdo)
        : ['max_photo_bytes' => 2097152, 'max_doc_bytes' => 10485760];

    $ext = strtolower(pathinfo((string)($file['name'] ?? ''), PATHINFO_EXTENSION));
    $resolvedKind = $kind;
    if ($resolvedKind === 'auto') {
        $resolvedKind = in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true) ? 'photo' : 'document';
    }
    if ($resolvedKind === 'photo' && !in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
        return ['ok' => false, 'error' => 'Only JPG, PNG, or WEBP image files are permitted for photo uploads.'];
    }

    $maxBytes = ($resolvedKind === 'photo')
        ? (int)($limits['max_photo_bytes'] ?? 2097152)
        : (int)($limits['max_doc_bytes'] ?? 10485760);

    return handleSecureUpload($file, $uploadDir, $maxBytes);
}

