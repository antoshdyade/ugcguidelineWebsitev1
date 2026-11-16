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

    $allowedDepts = array_values(array_unique(array_filter(array_map('intval', array_merge(
        is_array($user['allowed_department_ids'] ?? null) ? $user['allowed_department_ids'] : [],
        !empty($user['assigned_department_id']) ? [(int)$user['assigned_department_id']] : []
    )))));

    $allowedModules = is_array($user['allowed_modules'] ?? null) ? $user['allowed_modules'] : [];
    if (count($allowedModules) > 0) {
        if ($resource === 'departments') {
            if (in_array('departments', $allowedModules, true)) {
                return $targetDeptId === null || empty($allowedDepts) || in_array($targetDeptId, $allowedDepts, true);
            }
            return false;
        }
        return in_array($resource, $allowedModules, true);
    }

    $hasExplicitScope = !empty($user['allowed_categories']) || !empty($user['allowed_page_ids']);
    if ($role === 'specific_page_editor') {
        return $resource === 'pages' && $hasExplicitScope;
    }
    return match ($resource) {
        'users', 'settings', 'audit_logs' => false,
        'sliders_events', 'gallery', 'directory' => $role === 'content_editor',
        'categories'                      => in_array($role, ['content_editor', 'iqac_officer'], true),
        'pages'                           => in_array($role, ['content_editor', 'iqac_officer', 'exam_controller'], true) || $hasExplicitScope,
        'documents'                       => in_array($role, ['iqac_officer', 'content_editor', 'exam_controller'], true),
        'leadership'                      => in_array($role, ['iqac_officer', 'content_editor'], true),
        'alumni'                          => in_array($role, ['content_editor', 'iqac_officer'], true),
        'conferences'                     => in_array($role, ['content_editor', 'iqac_officer'], true),
        'placements'                      => in_array($role, ['content_editor', 'iqac_officer'], true),
        'grievances'                      => in_array($role, ['iqac_officer', 'content_editor', 'exam_controller'], true),
        'departments'                     => $role === 'department_admin'
            && ($targetDeptId === null ? count($allowedDepts) > 0 : in_array($targetDeptId, $allowedDepts, true)),
        default                           => false,
    };
}

function rbacModuleOptions(): array
{
    return [
        'categories'     => 'Categories & Menus',
        'pages'          => 'Pages & UGC Content',
        'departments'    => 'Departments & Microsites',
        'sliders_events' => 'Sliders, Ticker & Events',
        'leadership'     => 'Leadership & Governance',
        'alumni'         => 'Alumni Network & Portal',
        'conferences'    => 'Conferences, Workshops & R&D',
        'placements'     => 'Placements Desk (T&P)',
        'grievances'     => 'Grievance Redressal Desk',
        'gallery'        => 'Picture Gallery',
        'documents'      => 'Document Repository',
        'directory'      => 'Telephone Directory',
    ];
}

function conferenceScopePresets(): array
{
    return [
        'International Conference',
        'National Conference',
        'Research Workshop',
        'Technical Event / Symposium',
        'Faculty Development Program (FDP)',
        'Short-Term Training Program (STTP)',
        'Patent & IPR Clinic',
    ];
}

function conferenceModePresets(): array
{
    return [
        'Hybrid (On-Campus + Online)',
        'On-Campus (In-Person)',
        'Online Virtual Conference',
    ];
}

function conferenceRolePresets(): array
{
    return [
        'Keynote Speaker',
        'Chief Patron',
        'General Chair',
        'Program Chair',
        'Convener',
        'Technical Program Committee (TPC)',
        'Organizing Secretary',
        'Advisory Board Member',
    ];
}

function grievanceCategoryPresets(): array
{
    return [
        'Academic & Examination',
        'Scholarship & Fee Matters',
        'Anti-Ragging & Campus Safety',
        'Hostel, Transport & Canteen',
        'Library, Lab & Infrastructure',
        'Equal Opportunity / SC-ST Cell',
        'Internal Complaint Committee (ICC)',
    ];
}

function grievanceRolePresets(): array
{
    return [
        'Student (UG / PG / Ph.D.)',
        'Parent / Guardian',
        'Faculty / Staff Member',
        'Alumni / Visitor',
    ];
}

function defaultResearchSliderSlides(): array
{
    return [
        [
            'id' => 1,
            'title' => 'International & National Conferences at SVERI',
            'caption' => 'Host peer-reviewed Scopus/IEEE-aligned conferences, keynote sessions, and call-for-papers under Research.',
            'imageUrl' => 'assets/images/hero_campus.jpg',
            'ctaLabel' => 'Explore Conferences',
            'ctaLink' => 'conferences.php',
        ],
        [
            'id' => 2,
            'title' => 'Research Workshops, FDPs & STTPs',
            'caption' => 'Hands-on AI, Robotics, VLSI, Renewable Energy, and Outcome-Based Education workshops managed dynamically.',
            'imageUrl' => 'assets/images/hero_lab.jpg',
            'ctaLabel' => 'Browse Workshops & Events',
            'ctaLink' => 'conferences.php',
        ],
        [
            'id' => 3,
            'title' => 'Funded R&D Projects, Patents & Symposia',
            'caption' => 'DST-SERB, AICTE-MODROBS & industry consultancy driving faculty and student technical publications.',
            'imageUrl' => 'assets/images/hero_library.jpg',
            'ctaLabel' => 'R&D Disclosures',
            'ctaLink' => 'page.php?slug=research-development-cell',
        ],
    ];
}

function getResearchSliderSlides(PDO $pdo): array
{
    $s = getSiteSettings($pdo);
    $slides = $s['research_slider_slides'] ?? [];
    if (is_array($slides) && count($slides) > 0) {
        return $slides;
    }
    return defaultResearchSliderSlides();
}

function renderCustomSliderBlock(array $slides, int $heightPx = 360, int $autoplaySec = 5): string
{
    if (empty($slides)) {
        return '';
    }
    $heightPx = max(240, min(620, $heightPx));
    $autoplaySec = max(0, min(30, $autoplaySec));
    $out = '<div class="cms-prose"><div class="cms-block cms-slider" data-block="custom-slider" data-autoplay="' . $autoplaySec . '" data-height="' . $heightPx . '">';
    $out .= '<div class="cms-slider-viewport" style="height:' . $heightPx . 'px;">';
    foreach ($slides as $idx => $sl) {
        $img = mediaUrl($sl['imageUrl'] ?? '', 'assets/images/hero_campus.jpg');
        $title = trim((string)($sl['title'] ?? 'Featured Highlight'));
        $caption = trim((string)($sl['caption'] ?? ''));
        $ctaLabel = trim((string)($sl['ctaLabel'] ?? ''));
        $ctaLink = trim((string)($sl['ctaLink'] ?? ''));
        $out .= '<div class="cms-slide' . ($idx === 0 ? ' is-active' : '') . '" data-slide-index="' . $idx . '">';
        $out .= '<img src="' . e($img) . '" alt="' . e($title) . '">';
        $out .= '<div class="cms-slide-overlay">';
        $out .= '<h3 class="cms-slide-title">' . e($title) . '</h3>';
        if ($caption !== '') {
            $out .= '<p class="cms-slide-caption">' . e($caption) . '</p>';
        }
        if ($ctaLabel !== '' && $ctaLink !== '') {
            $out .= '<p class="cms-slide-cta-row"><a class="cms-btn cms-btn-amber cms-slide-cta" href="' . e(baseUrl($ctaLink)) . '">' . e($ctaLabel) . '</a></p>';
        }
        $out .= '</div></div>';
    }
    $out .= '</div>';
    if (count($slides) > 1) {
        $out .= '<button type="button" class="cms-slider-prev" aria-label="Previous slide">&#8249;</button>';
        $out .= '<button type="button" class="cms-slider-next" aria-label="Next slide">&#8250;</button>';
        $out .= '<div class="cms-slider-dots">';
        foreach ($slides as $idx => $_) {
            $out .= '<button type="button" class="cms-slider-dot' . ($idx === 0 ? ' is-active' : '') . '" data-slide-to="' . $idx . '" aria-label="Go to slide ' . ($idx + 1) . '"></button>';
        }
        $out .= '</div>';
    }
    $out .= '</div></div>';
    return $out;
}

function canAccessCategory(array $user, string $categorySlug): bool
{
    $role = $user['role'] ?? '';
    if ($role === 'super_admin') {
        return true;
    }
    $allowedPages = $user['allowed_page_ids'] ?? null;
    if (is_array($allowedPages) && count($allowedPages) > 0) {
        return false;
    }
    $allowedCats = $user['allowed_categories'] ?? null;
    if (is_array($allowedCats) && count($allowedCats) > 0) {
        return in_array($categorySlug, $allowedCats, true);
    }
    if ($role === 'specific_page_editor') {
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
    $allowedCats = $user['allowed_categories'] ?? null;
    if (is_array($allowedCats) && count($allowedCats) > 0) {
        $catSlug = $categorySlug ?? ($page['category_slug'] ?? $page['cat_slug'] ?? '');
        return $catSlug !== '' && in_array($catSlug, $allowedCats, true);
    }
    if ($role === 'specific_page_editor') {
        return false;
    }
    $catSlug = $categorySlug ?? ($page['category_slug'] ?? $page['cat_slug'] ?? '');
    if ($catSlug !== '') {
        return canAccessCategory($user, $catSlug);
    }
    return canAccessResource($user, 'pages');
}

function currentAlumni(): ?array
{
    return $_SESSION['svcoer_alumni'] ?? null;
}

function setAlumniSession(array $profile): void
{
    $_SESSION['svcoer_alumni'] = [
        'id'              => (int)$profile['id'],
        'full_name'       => $profile['full_name'],
        'email'           => $profile['email'],
        'graduation_year' => (int)$profile['graduation_year'],
        'department_code' => $profile['department_code'],
        'chapter'         => $profile['chapter'] ?? 'Pandharpur Home Chapter',
    ];
}

function logoutAlumniSession(): void
{
    unset($_SESSION['svcoer_alumni']);
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
        'heroTitle'                 => "SVERI's COE Alumni Association & Global Network",
        'heroSubtitle'              => 'Connecting 11,500+ engineering graduates, mentors, industry leaders, and chapter communities across Pune, Bengaluru, Mumbai, USA, Europe & Pandharpur.',
        'associationRegNo'          => 'MH/SOL/ALU-2016/06220',
        'coordinatorName'           => 'Prof. D. B. Kulkarni',
        'coordinatorEmail'          => 'alumni@coe.sveri.ac.in',
        'allowSelfRegistration'     => true,
        'allowPublicJobPosting'     => true,
        'enableDiscussions'         => true,
        'requireDiscussionApproval' => false,
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
        try {
            $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'content_editor', 'department_admin', 'iqac_officer', 'exam_controller', 'specific_page_editor') NOT NULL");
        } catch (Throwable $ignoredEnum) {
        }
        foreach ([
            "ALTER TABLE users ADD COLUMN allowed_modules_json TEXT NULL AFTER allowed_page_ids_json",
            "ALTER TABLE users ADD COLUMN allowed_department_ids_json TEXT NULL AFTER allowed_modules_json",
        ] as $alterSql) {
            try {
                $pdo->exec($alterSql);
            } catch (Throwable $ignoredCol) {
            }
        }
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS alumni_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(150) NOT NULL,
                email VARCHAR(160) NOT NULL,
                password_hash VARCHAR(255) NOT NULL DEFAULT '',
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
        try {
            $pdo->exec("ALTER TABLE alumni_profiles ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '' AFTER email");
        } catch (Throwable $ignoredCol) {
        }
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
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS alumni_discussion_topics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slug VARCHAR(100) NOT NULL UNIQUE,
                title VARCHAR(180) NOT NULL,
                description TEXT NULL,
                is_active TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS alumni_discussion_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                topic_id INT NOT NULL,
                author_alumni_id INT NOT NULL,
                author_name VARCHAR(150) NOT NULL,
                author_batch VARCHAR(80) NOT NULL,
                author_role VARCHAR(180) NULL,
                title VARCHAR(240) NOT NULL,
                summary VARCHAR(500) NULL,
                content MEDIUMTEXT NOT NULL,
                status ENUM('approved','pending','rejected') DEFAULT 'approved',
                is_pinned TINYINT(1) DEFAULT 0,
                created_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS alumni_discussion_comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                post_id INT NOT NULL,
                author_alumni_id INT NOT NULL,
                author_name VARCHAR(150) NOT NULL,
                author_batch VARCHAR(80) NOT NULL,
                body TEXT NOT NULL,
                created_at VARCHAR(32) NOT NULL
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

        // Ensure all alumni_profiles without a password hash get default 'Alumni@123' hash cleanly
        $blankPwCount = (int)$pdo->query("SELECT COUNT(*) FROM alumni_profiles WHERE password_hash IS NULL OR password_hash = ''")->fetchColumn();
        if ($blankPwCount > 0) {
            $defaultAlumniHash = password_hash('Alumni@123', PASSWORD_DEFAULT);
            $pdo->prepare("UPDATE alumni_profiles SET password_hash = ? WHERE password_hash IS NULL OR password_hash = ''")
                ->execute([$defaultAlumniHash]);
        }

        // Seed Members-Only Discussion Topics & Blogger Posts once
        $discChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'alumni_discussions_seeded_v1' LIMIT 1");
        $discChk->execute();
        $discSeeded = (bool)$discChk->fetchColumn();
        $topicCount = (int)$pdo->query('SELECT COUNT(*) FROM alumni_discussion_topics')->fetchColumn();
        if (!$discSeeded && $topicCount === 0) {
            $insTop = $pdo->prepare('INSERT INTO alumni_discussion_topics (id, slug, title, description, is_active, sort_order) VALUES (?,?,?,?,?,?)');
            $seedTopics = [
                [1, 'career-architecture', 'Cloud, AI & System Architecture', 'Deep-dive technical notes, interview frameworks, and distributed architecture discussions by senior alumni.', 1, 1],
                [2, 'core-engineering', 'EV Powertrain, VLSI & Smart Grid Careers', 'Domain insights on core mechanical, E&TC, civil infrastructure, and electrical power systems.', 1, 2],
                [3, 'mentorship-higher-studies', 'Mentorship, Startups & Higher Studies', 'SOP reviews, GATE / GRE / MBA strategies, entrepreneurship lessons, and campus mentoring threads.', 1, 3],
            ];
            foreach ($seedTopics as $st) {
                $insTop->execute($st);
            }

            $insPost = $pdo->prepare(
                'INSERT INTO alumni_discussion_posts (id, topic_id, author_alumni_id, author_name, author_batch, author_role, title, summary, content, status, is_pinned, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
            );
            $insPost->execute([
                1, 1, 1, 'Rohan Deshmukh', '2016 CSE', 'Principal Cloud Architect · Microsoft India',
                'Designing Resilient Multi-Region APIs: Field Notes for SVERI Alumni & Pre-Final Mentees',
                'Practical trade-offs between idempotency keys, circuit breakers, and read replicas from 10 years of production incidents.',
                "Over the past decade building distributed cloud platforms, three architectural habits saved our teams during peak traffic events:\n1. Treat every write endpoint as retryable using deterministic idempotency keys.\n2. Separate read-heavy catalog queries onto cached replicas so dashboard spikes never starve transactional writes.\n3. Run game-day chaos drills before major releases.\nDrop your system design questions below and our Hyderabad & Bengaluru chapters will review them together.",
                'approved', 1, '2026-11-04 10:15', '2026-11-04 10:15',
            ]);
            $insPost->execute([
                2, 2, 2, 'Snehal Patwardhan', '2018 ENTC', 'Staff SoC Verification Engineer · Qualcomm',
                'How E&TC Graduates Can Transition Into SoC Design Verification & UVM',
                'Recommended SystemVerilog projects, simulation tools, and technical topics to showcase before referral rounds.',
                "Students and recent graduates frequently ask what separates a shortlisted VLSI verification candidate. Focus on building a clean UVM testbench from scratch for an AXI4-Lite or SPI controller, write functional coverage bins, and document assertion failures clearly on GitHub.",
                'approved', 0, '2026-11-06 16:40', '2026-11-06 16:40',
            ]);

            $insCom = $pdo->prepare(
                'INSERT INTO alumni_discussion_comments (id, post_id, author_alumni_id, author_name, author_batch, body, created_at) VALUES (?,?,?,?,?,?,?)'
            );
            $insCom->execute([1, 1, 2, 'Snehal Patwardhan', '2018 ENTC', 'Great write-up Rohan! Idempotency + backpressure also applies to telemetry ingestion pipelines.', '2026-11-05 09:20']);
            $insCom->execute([2, 2, 3, 'Aditya Kulkarni', '2015 MECH', 'Sharing this thread with our Mechatronics & Embedded Systems interns in Pune.', '2026-11-07 14:05']);

            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('alumni_discussions_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
                ->execute();
        }

        // Phase 2: Conferences, Workshops, FDPs, Events, Placements & Grievances (non-destructive)
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS conferences (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slug VARCHAR(140) NOT NULL UNIQUE,
                title VARCHAR(260) NOT NULL,
                short_name VARCHAR(80) NOT NULL,
                scope VARCHAR(120) NOT NULL DEFAULT 'International Conference',
                theme VARCHAR(300) NOT NULL DEFAULT '',
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                venue VARCHAR(240) NOT NULL DEFAULT '',
                mode VARCHAR(120) NOT NULL DEFAULT 'Hybrid (On-Campus + Online)',
                organizing_department VARCHAR(160) NOT NULL DEFAULT '',
                indexing_partners_json TEXT NULL,
                contact_email VARCHAR(160) NOT NULL DEFAULT '',
                contact_phone VARCHAR(80) NOT NULL DEFAULT '',
                banner_url VARCHAR(300) DEFAULT 'assets/images/hero_campus.jpg',
                hero_slides_json LONGTEXT NULL,
                overview_html MEDIUMTEXT NULL,
                cfp_html MEDIUMTEXT NULL,
                tracks_json MEDIUMTEXT NULL,
                important_dates_json MEDIUMTEXT NULL,
                people_json MEDIUMTEXT NULL,
                schedule_json MEDIUMTEXT NULL,
                fee_tiers_json MEDIUMTEXT NULL,
                is_published TINYINT(1) DEFAULT 1,
                is_featured TINYINT(1) DEFAULT 0,
                sort_order INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB"
        );
        try {
            $pdo->exec("ALTER TABLE conferences ADD COLUMN hero_slides_json LONGTEXT NULL AFTER banner_url");
        } catch (Throwable $ignoredHeroCol) {
        }

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS conference_submissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conference_id INT NOT NULL,
                tracking_code VARCHAR(40) NOT NULL,
                paper_title VARCHAR(280) NOT NULL,
                track_title VARCHAR(180) NOT NULL,
                author_name VARCHAR(160) NOT NULL,
                author_email VARCHAR(160) NOT NULL,
                author_phone VARCHAR(60) NULL,
                affiliation VARCHAR(220) NOT NULL,
                co_authors VARCHAR(300) NULL,
                abstract_text TEXT NOT NULL,
                manuscript_url VARCHAR(300) NULL,
                status ENUM('Submitted','Under Review','Revision Requested','Accepted','Rejected') DEFAULT 'Submitted',
                reviewer_notes TEXT NULL,
                submitted_at VARCHAR(32) NOT NULL
            ) ENGINE=InnoDB"
        );

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS conference_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                conference_id INT NOT NULL,
                registration_code VARCHAR(40) NOT NULL,
                attendee_name VARCHAR(160) NOT NULL,
                email VARCHAR(160) NOT NULL,
                phone VARCHAR(60) NULL,
                affiliation VARCHAR(220) NOT NULL,
                fee_category VARCHAR(140) NOT NULL,
                paper_id_ref VARCHAR(60) NULL,
                payment_ref VARCHAR(120) NULL,
                status ENUM('Pending','Confirmed','Cancelled') DEFAULT 'Pending',
                registered_at VARCHAR(32) NOT NULL
            ) ENGINE=InnoDB"
        );

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS placement_stats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                academic_year VARCHAR(30) NOT NULL,
                branch VARCHAR(120) NOT NULL,
                eligible_students INT DEFAULT 0,
                placed_students INT DEFAULT 0,
                highest_package_lpa DECIMAL(6,2) DEFAULT 0.00,
                average_package_lpa DECIMAL(6,2) DEFAULT 0.00,
                top_recruiters_list VARCHAR(400) NULL,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS placement_stories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_name VARCHAR(160) NOT NULL,
                batch_year VARCHAR(30) NOT NULL,
                branch VARCHAR(120) NOT NULL,
                company VARCHAR(160) NOT NULL,
                role_title VARCHAR(160) NOT NULL,
                package_lpa VARCHAR(40) NOT NULL,
                photo_url VARCHAR(255) DEFAULT 'assets/images/principal.jpg',
                quote_text TEXT NULL,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS grievances (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_code VARCHAR(40) NOT NULL UNIQUE,
                complainant_name VARCHAR(160) NOT NULL,
                email VARCHAR(160) NOT NULL,
                phone VARCHAR(60) NULL,
                reporter_role VARCHAR(100) NOT NULL,
                category VARCHAR(140) NOT NULL,
                subject VARCHAR(240) NOT NULL,
                description TEXT NOT NULL,
                urgency ENUM('Normal','High','Urgent') DEFAULT 'Normal',
                status ENUM('Open','Under Review','Escalated','Resolved') DEFAULT 'Open',
                resolution_note TEXT NULL,
                submitted_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL
            ) ENGINE=InnoDB"
        );

        // Seed Research Slider Slides if absent
        $resSliderChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'research_slider_slides' LIMIT 1");
        $resSliderChk->execute();
        if (!$resSliderChk->fetchColumn()) {
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('research_slider_slides', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([json_encode(defaultResearchSliderSlides(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
        }

        // Seed Conferences / Workshops / Events once
        $confSeedChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'conferences_seeded_v1' LIMIT 1");
        $confSeedChk->execute();
        if (!$confSeedChk->fetchColumn() && (int)$pdo->query('SELECT COUNT(*) FROM conferences')->fetchColumn() === 0) {
            $insConf = $pdo->prepare(
                'INSERT INTO conferences (slug, title, short_name, scope, theme, start_date, end_date, venue, mode, organizing_department, indexing_partners_json, contact_email, contact_phone, banner_url, hero_slides_json, overview_html, cfp_html, tracks_json, important_dates_json, people_json, schedule_json, fee_tiers_json, is_published, is_featured, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            );
            $insConf->execute([
                'icaest-2026',
                'International Conference on Advances in Engineering, Science & Sustainable Technology',
                'ICAEST-2026',
                'International Conference',
                'AI-Driven Autonomous Systems, Clean Energy Microgrids & Smart Manufacturing',
                '2026-12-18',
                '2026-12-19',
                'SVERI Central Auditorium, Gopalpur, Pandharpur',
                'Hybrid (On-Campus + Online)',
                'All Engineering Departments & R&D Cell',
                json_encode(['IEEE Xplore (Planned)', 'Scopus Proceedings', 'UGC Care Journal']),
                'icaest2026@coe.sveri.ac.in',
                '+91-02186-216063',
                'assets/images/hero_campus.jpg',
                json_encode([
                    ['id' => 1, 'title' => 'ICAEST-2026: International Research Conclave', 'caption' => 'Bringing researchers, IEEE fellows, and industry leaders together at SVERI Pandharpur.', 'imageUrl' => 'assets/images/hero_campus.jpg', 'ctaLabel' => 'Submit Manuscript', 'ctaLink' => 'conference.php?slug=icaest-2026#submit-paper'],
                    ['id' => 2, 'title' => 'Peer-Reviewed Proceedings & Keynotes', 'caption' => 'Dedicated tracks spanning AI, Edge Computing, Smart Grids, VLSI & Structural Materials.', 'imageUrl' => 'assets/images/hero_lab.jpg', 'ctaLabel' => 'Register as Delegate', 'ctaLink' => 'conference.php?slug=icaest-2026#register'],
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                '<p>ICAEST-2026 provides a premier international interdisciplinary forum for researchers, academicians, and industry practitioners to present breakthroughs in AI, Embedded VLSI, Clean Energy, Robotics, and Sustainable Infrastructure.</p>',
                '<p>Original unpublished full-length papers (6–8 pages in IEEE double-column format) are invited. All accepted and presented papers will undergo plagiarism screening and double-blind peer review.</p>',
                json_encode([
                    ['id' => 't1', 'code' => 'Track 1', 'title' => 'Artificial Intelligence, Cloud & Cyber Security', 'description' => 'LLMs, edge analytics, computer vision, and privacy-preserving cloud architectures.', 'chairName' => 'Dr. Anjali K. Deshpande'],
                    ['id' => 't2', 'code' => 'Track 2', 'title' => 'VLSI Design, Embedded IoT & Communication Systems', 'description' => 'Low-power ASIC, RF antennas, RTOS, and 5G/6G networks.', 'chairName' => 'Dr. Vandana P. Chavan'],
                    ['id' => 't3', 'code' => 'Track 3', 'title' => 'EV Powertrains, Robotics & Sustainable Structures', 'description' => 'Smart manufacturing, clean energy storage, and resilient civil materials.', 'chairName' => 'Dr. Rajendra B. Kulkarni'],
                ], JSON_UNESCAPED_UNICODE),
                json_encode([
                    ['id' => 'd1', 'label' => 'Full Paper Submission Deadline', 'dateText' => '2026-11-25', 'isHighlight' => true],
                    ['id' => 'd2', 'label' => 'Acceptance Notification', 'dateText' => '2026-12-05', 'isHighlight' => false],
                    ['id' => 'd3', 'label' => 'Camera-Ready & Registration', 'dateText' => '2026-12-10', 'isHighlight' => true],
                    ['id' => 'd4', 'label' => 'Conference Dates', 'dateText' => '18–19 Dec 2026', 'isHighlight' => true],
                ], JSON_UNESCAPED_UNICODE),
                json_encode([
                    ['id' => 'p1', 'name' => 'Dr. B. P. Ronge', 'role' => 'Chief Patron', 'designation' => 'Principal & Director', 'affiliation' => 'SVCOER Pandharpur', 'bio' => 'Presiding chair driving autonomous research quality.', 'photoUrl' => 'assets/images/principal.jpg'],
                    ['id' => 'p2', 'name' => 'Dr. Aravind S. Nadkarni', 'role' => 'Keynote Speaker', 'designation' => 'Professor & IEEE Fellow', 'affiliation' => 'IIT Bombay', 'bio' => 'Specialist in trustworthy edge AI and autonomous cyber-physical systems.', 'photoUrl' => 'assets/images/principal.jpg'],
                ], JSON_UNESCAPED_UNICODE),
                json_encode([
                    ['id' => 's1', 'day' => 'Day 1 · 18 Dec', 'timeSlot' => '09:30 – 11:00', 'sessionTitle' => 'Inauguration & Keynote Address', 'speaker' => 'Dr. Aravind S. Nadkarni', 'hall' => 'SVERI Central Auditorium'],
                    ['id' => 's2', 'day' => 'Day 1 · 18 Dec', 'timeSlot' => '11:30 – 13:30', 'sessionTitle' => 'Parallel Technical Paper Sessions (Tracks 1–3)', 'speaker' => 'Track Chairs', 'hall' => 'Seminar Halls A, B & C'],
                    ['id' => 's3', 'day' => 'Day 2 · 19 Dec', 'timeSlot' => '14:30 – 16:30', 'sessionTitle' => 'Best Paper Awards & Valedictory Ceremony', 'speaker' => 'Organizing Committee', 'hall' => 'Central Auditorium'],
                ], JSON_UNESCAPED_UNICODE),
                json_encode([
                    ['id' => 'f1', 'category' => 'UG / PG Student / Research Scholar', 'earlyBirdFee' => 'INR 2,500', 'regularFee' => 'INR 3,000', 'notes' => 'Includes proceedings kit & certificate'],
                    ['id' => 'f2', 'category' => 'Academician / Faculty Delegate', 'earlyBirdFee' => 'INR 3,500', 'regularFee' => 'INR 4,500', 'notes' => 'Includes lunch & digital proceedings'],
                    ['id' => 'f3', 'category' => 'Industry Professional / Foreign Delegate', 'earlyBirdFee' => 'INR 5,500 / USD 120', 'regularFee' => 'INR 6,500 / USD 150', 'notes' => 'Full access + publication support'],
                ], JSON_UNESCAPED_UNICODE),
                1, 1, 1
            ]);
            $insConf->execute([
                'ai-robotics-workshop-2026',
                '5-Day Hands-On Research Workshop on Generative AI, Edge Vision & Industrial Robotics',
                'WORKSHOP-AI-2026',
                'Research Workshop',
                'Practical ROS2, edge inference optimization, and KUKA cobot cell programming',
                '2026-11-24',
                '2026-11-28',
                'Tata CIII Robotics Lab & GPU Cluster, Pandharpur',
                'On-Campus (In-Person)',
                'CSE & Mechanical Engineering',
                json_encode(['AICTE ATAL Approved', 'SVERI R&D Certificate']),
                'workshop.ai@coe.sveri.ac.in',
                '+91-02186-216063',
                'assets/images/hero_lab.jpg',
                json_encode([
                    ['id' => 1, 'title' => 'Hands-On Generative AI & Robotics Bootcamp', 'caption' => 'Build end-to-end vision pipelines and cobot automation cells in 5 intensive days.', 'imageUrl' => 'assets/images/hero_lab.jpg', 'ctaLabel' => 'Register Now', 'ctaLink' => 'conference.php?slug=ai-robotics-workshop-2026#register'],
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                '<p>Designed for B.Tech/M.Tech students, Ph.D. scholars, and engineering faculty seeking hands-on implementation skills on GPU clusters and industrial cobots.</p>',
                '<p>Participants may optionally submit a 2-page lab project abstract for showcase evaluation on Day 5.</p>',
                json_encode([
                    ['id' => 'w1', 'code' => 'Module 1', 'title' => 'Quantized Vision Models & Edge Deployment', 'description' => 'ONNX Runtime, TensorRT & Jetson deployment labs.', 'chairName' => 'Dr. Siddharth R. Mane'],
                ], JSON_UNESCAPED_UNICODE),
                json_encode([
                    ['id' => 'wd1', 'label' => 'Seat Confirmation Cutoff', 'dateText' => '2026-11-20', 'isHighlight' => true],
                ], JSON_UNESCAPED_UNICODE),
                json_encode([
                    ['id' => 'wp1', 'name' => 'Dr. Siddharth R. Mane', 'role' => 'Convener', 'designation' => 'Associate Professor', 'affiliation' => 'CSE Dept', 'bio' => 'AICTE RPS grantee leading GPU Vision lab.', 'photoUrl' => 'assets/images/principal.jpg'],
                ], JSON_UNESCAPED_UNICODE),
                json_encode([
                    ['id' => 'ws1', 'day' => 'Days 1–5', 'timeSlot' => '10:00 – 17:00', 'sessionTitle' => 'Interactive Coding & Hardware Lab Practicum', 'speaker' => 'Faculty & Industry Mentors', 'hall' => 'AI & Tata CIII Labs'],
                ], JSON_UNESCAPED_UNICODE),
                json_encode([
                    ['id' => 'wf1', 'category' => 'Student Participant', 'earlyBirdFee' => 'INR 500', 'regularFee' => 'INR 750', 'notes' => 'Includes lab manual & certificate'],
                    ['id' => 'wf2', 'category' => 'Faculty / Industry Participant', 'earlyBirdFee' => 'INR 1,200', 'regularFee' => 'INR 1,500', 'notes' => 'Full 5-day lab access'],
                ], JSON_UNESCAPED_UNICODE),
                1, 1, 2
            ]);
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('conferences_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
                ->execute();
        }

        // Seed Placements stats & stories once
        $plChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'placements_seeded_v1' LIMIT 1");
        $plChk->execute();
        if (!$plChk->fetchColumn() && (int)$pdo->query('SELECT COUNT(*) FROM placement_stats')->fetchColumn() === 0) {
            $insPl = $pdo->prepare('INSERT INTO placement_stats (academic_year, branch, eligible_students, placed_students, highest_package_lpa, average_package_lpa, top_recruiters_list, sort_order) VALUES (?,?,?,?,?,?,?,?)');
            $insPl->execute(['2025-26', 'Computer Science & Engg.', 172, 161, 18.50, 6.20, 'TCS Digital, Infosys, Accenture, Deloitte', 1]);
            $insPl->execute(['2025-26', 'Electronics & Telecom', 112, 98, 12.00, 5.10, 'Qualcomm, KPIT, Wipro, Tech Mahindra', 2]);
            $insPl->execute(['2025-26', 'Mechanical Engineering', 108, 94, 10.50, 4.90, 'Bharat Forge, Atlas Copco, Mahindra & Mahindra', 3]);

            $insSt = $pdo->prepare('INSERT INTO placement_stories (student_name, batch_year, branch, company, role_title, package_lpa, photo_url, quote_text, sort_order) VALUES (?,?,?,?,?,?,?,?,?)');
            $insSt->execute(['Atharva Deshpande', '2026', 'CSE', 'Deloitte India', 'Analyst — Cloud & Data Engg.', '14.5 LPA', 'assets/images/principal.jpg', 'Coding bootcamps and alumni mock interviews prepared me thoroughly.', 1]);
            $insSt->execute(['Pranjal Kulkarni', '2026', 'MECH', 'Atlas Copco', 'Graduate Engineer Trainee', '8.2 LPA', 'assets/images/principal.jpg', 'Hands-on CNC and Robotics lab exposure set our batch apart during technical rounds.', 2]);
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('placements_summary', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([json_encode([
                    'summaryNote'      => 'With a 91.1% placement track record and 250+ visiting recruiters, our Training & Placement Cell delivers structured aptitude, coding, Communication Improvement Programs (CIP), and industry internship mentorship.',
                    'coordinatorName'  => 'Dr. S. B. Kulkarni',
                    'coordinatorEmail' => 'tnp@coe.sveri.ac.in',
                    'coordinatorPhone' => '+91-02186-216063',
                ], JSON_UNESCAPED_UNICODE)]);
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('placements_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
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
        'conferences',
        'placement_stats',
        'placement_stories',
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

