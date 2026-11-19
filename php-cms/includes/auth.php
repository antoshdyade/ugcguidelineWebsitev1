<?php
declare(strict_types=1);

require_once __DIR__ . '/analytics_security.php';
require_once __DIR__ . '/mail_helper.php';
require_once __DIR__ . '/moderation_helper.php';

if (session_status() === PHP_SESSION_NONE) {
    $svcoerDirWritable = static function (string $dir): bool {
        if ($dir === '' || !@is_dir($dir)) {
            return false;
        }
        $probe = rtrim($dir, '/\\') . '/.svs_' . bin2hex(random_bytes(4));
        $fp = @fopen($probe, 'xb');
        if ($fp === false) {
            return false;
        }
        $written = @fwrite($fp, '1');
        @fclose($fp);
        @unlink($probe);
        return $written !== false;
    };

    $configuredPath = (string)session_save_path();
    // Strip optional "N;" depth prefix if php.ini specifies one
    if (strpos($configuredPath, ';') !== false) {
        $parts = explode(';', $configuredPath);
        $configuredPath = (string)end($parts);
    }

    $sessionConfigured = false;
    if ($configuredPath !== '' && $svcoerDirWritable($configuredPath)) {
        $sessionConfigured = true;
    } else {
        $candidates = [
            __DIR__ . '/../uploads/.sessions',
            sys_get_temp_dir(),
        ];
        foreach ($candidates as $cand) {
            if (!@is_dir($cand)) {
                @mkdir($cand, 0700, true);
            }
            if ($svcoerDirWritable($cand)) {
                @session_save_path($cand);
                $sessionConfigured = true;
                break;
            }
        }
    }

    // Automatic MySQL PDO SessionHandler fallback when Apache/Webmin blocks file session dirs
    if (!$sessionConfigured && defined('DB_HOST') && defined('DB_NAME') && defined('DB_USER')) {
        try {
            $sessPdo = null;
            $sessHosts = [DB_HOST];
            if (strtolower((string)DB_HOST) === 'localhost') {
                $sessHosts[] = '127.0.0.1';
            }
            foreach ($sessHosts as $trySessHost) {
                try {
                    $sessDsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $trySessHost, DB_NAME, defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4');
                    $sessPdo = new PDO($sessDsn, DB_USER, defined('DB_PASS') ? DB_PASS : '', [
                        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    ]);
                    break;
                } catch (PDOException $sessHostEx) {
                    $sessPdo = null;
                }
            }
            if ($sessPdo instanceof PDO) {
                $sessPdo->exec(
                    'CREATE TABLE IF NOT EXISTS php_sessions (
                        id VARCHAR(128) PRIMARY KEY,
                        data MEDIUMTEXT NOT NULL,
                        updated_at INT UNSIGNED NOT NULL,
                        INDEX idx_php_sess_updated (updated_at)
                    ) ENGINE=InnoDB'
                );
                $dbSessionHandler = new class ($sessPdo) implements SessionHandlerInterface {
                    private PDO $pdo;
                    public function __construct(PDO $pdo) { $this->pdo = $pdo; }
                    #[\ReturnTypeWillChange]
                    public function open($path, $name) { return true; }
                    #[\ReturnTypeWillChange]
                    public function close() { return true; }
                    #[\ReturnTypeWillChange]
                    public function read($id) {
                        try {
                            $st = $this->pdo->prepare('SELECT data FROM php_sessions WHERE id = ? LIMIT 1');
                            $st->execute([(string)$id]);
                            $val = $st->fetchColumn();
                            return is_string($val) ? $val : '';
                        } catch (Throwable $e) {
                            return '';
                        }
                    }
                    #[\ReturnTypeWillChange]
                    public function write($id, $data) {
                        try {
                            $st = $this->pdo->prepare(
                                'INSERT INTO php_sessions (id, data, updated_at) VALUES (?, ?, ?)
                                 ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)'
                            );
                            return (bool)$st->execute([(string)$id, (string)$data, time()]);
                        } catch (Throwable $e) {
                            return false;
                        }
                    }
                    #[\ReturnTypeWillChange]
                    public function destroy($id) {
                        try {
                            $this->pdo->prepare('DELETE FROM php_sessions WHERE id = ?')->execute([(string)$id]);
                        } catch (Throwable $e) {
                        }
                        return true;
                    }
                    #[\ReturnTypeWillChange]
                    public function gc($max_lifetime) {
                        try {
                            $st = $this->pdo->prepare('DELETE FROM php_sessions WHERE updated_at < ?');
                            $st->execute([time() - max(60, (int)$max_lifetime)]);
                            return (int)$st->rowCount();
                        } catch (Throwable $e) {
                            return 0;
                        }
                    }
                };
                @session_set_save_handler($dbSessionHandler, true);
            }
        } catch (Throwable $ignoredSess) {
            // Fall through to default PHP handler
        }
    }

    if (!headers_sent()) {
        $isHttps = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off')
            || ((int)($_SERVER['SERVER_PORT'] ?? 0) === 443)
            || (strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https');
        @session_set_cookie_params([
            'lifetime' => 43200,
            'path'     => '/',
            'secure'   => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        try {
            @session_start();
        } catch (Throwable $ignoredStart) {
        }
    }
    if (!isset($_SESSION) || !is_array($_SESSION)) {
        $_SESSION = [];
    }
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
    switch ($resource) {
        case 'users':
        case 'settings':
        case 'audit_logs':
            return false;
        case 'sliders_events':
        case 'gallery':
        case 'directory':
            return $role === 'content_editor';
        case 'categories':
            return in_array($role, ['content_editor', 'iqac_officer'], true);
        case 'pages':
            return in_array($role, ['content_editor', 'iqac_officer', 'exam_controller'], true) || $hasExplicitScope;
        case 'documents':
            return in_array($role, ['iqac_officer', 'content_editor', 'exam_controller'], true);
        case 'leadership':
        case 'alumni':
        case 'conferences':
        case 'placements':
        case 'sports':
        case 'facilities':
        case 'seo':
            return in_array($role, ['content_editor', 'iqac_officer'], true);
        case 'grievances':
            return in_array($role, ['iqac_officer', 'content_editor', 'exam_controller'], true);
        case 'analytics':
            return $role === 'iqac_officer';
        case 'departments':
            return $role === 'department_admin'
                && ($targetDeptId === null ? count($allowedDepts) > 0 : in_array($targetDeptId, $allowedDepts, true));
        default:
            return false;
    }
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
        'sports'         => 'Student Life — Sports Portal',
        'facilities'     => 'Campus Facilities & Infrastructure',
        'grievances'     => 'Grievance Redressal Desk',
        'seo'            => 'SEO Studio & Hit Counter',
        'analytics'      => 'Log Analyzer & Security Shield',
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
        'Poster Presentation',
        'Poster Presentation & Technical Expo',
        'Patent & IPR Clinic',
    ];
}

function conferencePresentationTypePresets(): array
{
    return [
        'Oral Paper Presentation',
        'Poster Presentation',
        'Hardware / Prototype Demo',
    ];
}

function sportsFacilityTypePresets(): array
{
    return [
        'Outdoor Ground / Track',
        'Indoor Court / Hall',
        'Fitness & Gymnasium',
        'Aquatic / Synthetic Court',
        'Yoga & Wellness Studio',
    ];
}

function sportsEventTypePresets(): array
{
    return [
        'Annual Sports Meet',
        'Intercollegiate Tournament',
        'University Zonal Trials',
        'Fitness & Marathon Drive',
        'Coaching Camp / Clinic',
    ];
}

function sportsAchievementLevelPresets(): array
{
    return [
        'University',
        'State',
        'National',
        'International',
        'Zonal / Intercollegiate',
    ];
}

function facilityCategoryPresets(): array
{
    return [
        'Infrastructural Facilities',
        'IT & Computing Facilities',
        'Student Facilities',
        'Research & Central Labs',
        'Library & Digital Resources',
        'Green & Barrier-Free Campus',
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

function conferenceSubmissionPlatformPresets(): array
{
    return [
        'Microsoft CMT Portal'      => 'https://cmt3.research.microsoft.com/',
        'EasyChair Conference System' => 'https://easychair.org/',
        'EDAS Conference System'    => 'https://edas.info/',
        'Google Form / Custom Portal' => 'https://forms.gle/',
    ];
}

function alumniDegreePresets(): array
{
    return [
        'B.Tech',
        'B.E.',
        'M.Tech',
        'M.E.',
        'MBA',
        'MCA',
        'Ph.D.',
        'Diploma in Engineering',
    ];
}

function alumniChapterPresets(): array
{
    return [
        'Pandharpur Home Chapter',
        'Pune Chapter',
        'Bengaluru Chapter',
        'Mumbai Chapter',
        'Hyderabad Chapter',
        'Delhi NCR Chapter',
        'North America Chapter',
        'Europe & UK Chapter',
    ];
}

function alumniJobTypePresets(): array
{
    return [
        'Full-Time',
        'Internship',
        'Referral',
        'Consultancy',
        'Part-Time / Visiting Faculty',
    ];
}

function alumniPledgeTypePresets(): array
{
    return [
        'Laboratory / Equipment Sponsorship',
        'Merit-cum-Means Student Scholarship',
        'Campus Expert Talk / Workshop',
        'Industrial Visit / Internship Host',
        'Library Book & Digital Archive Grant',
    ];
}

function isExternalConferenceSubmission(array $conf): bool
{
    $mode = (string)($conf['submission_mode'] ?? 'internal');
    if ($mode === 'closed') {
        return false;
    }
    $url = trim((string)($conf['external_submission_url'] ?? ''));
    return $url !== '' && preg_match('#^https?://#i', $url) === 1;
}

function defaultPortalMenuItems(): array
{
    return [
        ['id' => 'conferences', 'label' => 'Conferences', 'href' => 'conferences.php', 'matchScripts' => ['conferences.php', 'conference.php'], 'menuLocation' => 'main', 'sortOrder' => 1, 'isSystem' => true, 'openInNewTab' => false],
        ['id' => 'facilities',  'label' => 'Facilities',  'href' => 'facilities.php',  'matchScripts' => ['facilities.php'], 'menuLocation' => 'main', 'sortOrder' => 2, 'isSystem' => true, 'openInNewTab' => false],
        ['id' => 'placements',  'label' => 'Placements',  'href' => 'placements.php',  'matchScripts' => ['placements.php'], 'menuLocation' => 'main', 'sortOrder' => 3, 'isSystem' => true, 'openInNewTab' => false],
        ['id' => 'grievance',   'label' => 'Grievance & Anti-Ragging', 'href' => 'grievance.php', 'matchScripts' => ['grievance.php'], 'menuLocation' => 'main', 'sortOrder' => 4, 'isSystem' => true, 'openInNewTab' => false],
        ['id' => 'feedback',    'label' => 'Feedback Cell', 'href' => 'feedback.php', 'matchScripts' => ['feedback.php'], 'menuLocation' => 'more', 'sortOrder' => 5, 'isSystem' => true, 'openInNewTab' => false],
        ['id' => 'alumni',      'label' => 'Alumni',      'href' => 'alumni.php',      'matchScripts' => ['alumni.php'], 'menuLocation' => 'main', 'sortOrder' => 6, 'isSystem' => true, 'openInNewTab' => false],
        ['id' => 'gallery',     'label' => 'Gallery',     'href' => 'gallery.php',     'matchScripts' => ['gallery.php'], 'menuLocation' => 'more', 'sortOrder' => 7, 'isSystem' => true, 'openInNewTab' => false],
        ['id' => 'contact',     'label' => 'Contact Us',  'href' => 'contact.php',     'matchScripts' => ['contact.php'], 'menuLocation' => 'more', 'sortOrder' => 8, 'isSystem' => true, 'openInNewTab' => false],
        ['id' => 'quick-links', 'label' => 'Quick Links & Disclosures', 'href' => 'quick-links.php', 'matchScripts' => ['quick-links.php'], 'menuLocation' => 'more', 'sortOrder' => 9, 'isSystem' => true, 'openInNewTab' => false],
    ];
}

function getPortalMenuItems(PDO $pdo): array
{
    $defaults = defaultPortalMenuItems();
    $byId = [];
    foreach ($defaults as $d) {
        $byId[$d['id']] = $d;
    }
    try {
        $raw = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'portal_menu_items' LIMIT 1")->fetchColumn();
        if ($raw) {
            $decoded = json_decode((string)$raw, true);
            if (is_array($decoded)) {
                $seen = [];
                $out = [];
                foreach ($decoded as $item) {
                    if (!is_array($item) || empty($item['id']) || empty($item['label'])) {
                        continue;
                    }
                    $id = (string)$item['id'];
                    $seen[$id] = true;
                    $base = $byId[$id] ?? ['matchScripts' => [], 'isSystem' => false, 'openInNewTab' => false];
                    $loc = in_array($item['menuLocation'] ?? 'main', ['main', 'more', 'hidden'], true) ? $item['menuLocation'] : 'main';
                    $out[] = [
                        'id'           => $id,
                        'label'        => trim((string)$item['label']),
                        'href'         => trim((string)($item['href'] ?? $base['href'] ?? 'index.php')),
                        'matchScripts' => $base['matchScripts'] ?? [],
                        'menuLocation' => $loc,
                        'sortOrder'    => (int)($item['sortOrder'] ?? 99),
                        'isSystem'     => !empty($base['isSystem']),
                        'openInNewTab' => !empty($item['openInNewTab']),
                    ];
                }
                foreach ($defaults as $def) {
                    if (empty($seen[$def['id']])) {
                        $out[] = $def;
                    }
                }
                usort($out, static fn(array $a, array $b) => ($a['sortOrder'] <=> $b['sortOrder']));
                return $out;
            }
        }
    } catch (Throwable $ignored) {
    }
    return $defaults;
}

function savePortalMenuItems(PDO $pdo, array $items): void
{
    $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('portal_menu_items', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
        ->execute([json_encode(array_values($items), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

function partitionHeaderMenus(array $categories, array $portalItems): array
{
    $mainCats = [];
    $moreCats = [];
    foreach ($categories as $cat) {
        $loc = (string)($cat['menu_location'] ?? '');
        if (!in_array($loc, ['main', 'more', 'hidden'], true)) {
            $loc = !empty($cat['show_in_menu']) ? 'main' : 'hidden';
        }
        if ($loc === 'hidden' || (isset($cat['show_in_menu']) && (int)$cat['show_in_menu'] === 0 && $loc !== 'more')) {
            continue;
        }
        if ($loc === 'more') {
            $moreCats[] = $cat;
        } else {
            $mainCats[] = $cat;
        }
    }
    $mainPortals = [];
    $morePortals = [];
    foreach ($portalItems as $p) {
        $loc = (string)($p['menuLocation'] ?? 'main');
        if ($loc === 'main') {
            $mainPortals[] = $p;
        } elseif ($loc === 'more') {
            $morePortals[] = $p;
        }
    }
    return [
        'mainCats'    => $mainCats,
        'moreCats'    => $moreCats,
        'mainPortals' => $mainPortals,
        'morePortals' => $morePortals,
    ];
}

function defaultGrievancePortalConfig(): array
{
    return [
        'heroBadge'            => 'UGC SGRC (2023) & AICTE Statutory Redressal Helpdesk',
        'heroTitle'            => 'Online Grievance Redressal & Anti-Ragging Portal',
        'heroSubtitle'         => 'Statutory Student Grievance Redressal Committee (SGRC), Ombudsperson Escalation, 24x7 Anti-Ragging Squad, and Internal Complaint Committee (ICC) confidential portal.',
        'ombudspersonName'     => 'Hon. Justice / Prof. (Dr.) A. V. Deshmukh',
        'ombudspersonTitle'    => 'University Appointed Ombudsperson (PAHSUS)',
        'ombudspersonEmail'    => 'ombudsperson@coe.sveri.ac.in',
        'ombudspersonPhone'    => '+91-02186-216060',
        'ombudspersonPhoto'    => 'assets/images/principal.jpg',
        'antiRaggingSquadPhone' => '+91-9545553888 (24x7 Squad)',
        'womenCellOfficer'     => 'Dr. Pratibha S. Kulkarni (Presiding Officer - ICC)',
        'womenCellPhone'       => '+91-94230-62201',
        'ugcUndertakingUrl'    => 'https://www.antiragging.in/',
        'charterHtml'          => '<h3>Statutory Grievance Redressal SLA &amp; Escalation Matrix</h3><p>All grievances receive an automated tracking code immediately upon submission and are reviewed under strict UGC SGRC Regulations 2023 timelines.</p><table class="cms-table cms-table-navy"><thead><tr><th>Level</th><th>Authority / Committee</th><th>Mandated Response SLA</th><th>Jurisdiction</th></tr></thead><tbody><tr><td>Level 1</td><td>Departmental Mentor / Class Coordinator</td><td>Within 3 Working Days</td><td>Academic, attendance, lab &amp; timetable queries</td></tr><tr><td>Level 2</td><td>Student Grievance Redressal Committee (SGRC)</td><td>Within 10 Working Days</td><td>Exams, scholarships, hostel, fee refunds &amp; campus facilities</td></tr><tr><td>Level 3</td><td>Principal &amp; Institutional Ombudsperson</td><td>Within 15 Working Days</td><td>Appeals, ICC, Equal Opportunity &amp; SC/ST Cell review</td></tr><tr><td>Emergency</td><td>Anti-Ragging Squad / National UGC Helpline</td><td>Immediate (&lt; 2 Hours)</td><td>Zero-tolerance campus safety &amp; ragging complaints (1800-180-5522)</td></tr></tbody></table>',
        'committeeMembers'     => [
            ['id' => 'sgrc1', 'name' => 'Dr. B. P. Ronge', 'role' => 'Chairperson (SGRC)', 'designation' => 'Principal & Director', 'department' => 'Administration', 'email' => 'principal@coe.sveri.ac.in', 'phone' => '+91-02186-216063', 'photoUrl' => 'assets/images/principal.jpg'],
            ['id' => 'sgrc2', 'name' => 'Dr. P. K. Deshmukh', 'role' => 'Convener & Anti-Ragging Chief', 'designation' => 'Professor & Dean Student Welfare', 'department' => 'Student Affairs', 'email' => 'antiragging@coe.sveri.ac.in', 'phone' => '+91-9545553888', 'photoUrl' => 'assets/images/principal.jpg'],
            ['id' => 'sgrc3', 'name' => 'Dr. Pratibha S. Kulkarni', 'role' => 'Presiding Officer (ICC / Women Cell)', 'designation' => 'Associate Professor', 'department' => 'First Year Engineering', 'email' => 'icc@coe.sveri.ac.in', 'phone' => '+91-94230-62201', 'photoUrl' => 'assets/images/faculty_default.jpg'],
        ],
    ];
}

function getGrievancePortalConfig(PDO $pdo): array
{
    $def = defaultGrievancePortalConfig();
    try {
        $raw = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'grievance_portal_config' LIMIT 1")->fetchColumn();
        if ($raw) {
            $dec = json_decode((string)$raw, true);
            if (is_array($dec)) {
                return array_merge($def, $dec);
            }
        }
    } catch (Throwable $ignored) {
    }
    return $def;
}

function saveGrievancePortalConfig(PDO $pdo, array $cfg): void
{
    $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('grievance_portal_config', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
        ->execute([json_encode($cfg, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

function placementNoticeCategoryPresets(): array
{
    return [
        'Campus Drive Circular',
        'Pre-Placement Talk',
        'Training & CRT Schedule',
        'Internship Notice',
        'Shortlist & Result',
        'General Information',
    ];
}

function placementCongratulationTypePresets(): array
{
    return [
        'Campus Placement',
        'Dream / Super-Dream Offer',
        'National Hackathon / Award',
        'GATE / GRE / CAT Ranker',
        'Core Industry Offer',
        'Paid Internship Conversion',
    ];
}

function defaultPlacementNotices(): array
{
    return [
        [
            'title' => 'TCS Digital & Prime Campus Drive 2026 — Registration & Eligibility Guidelines',
            'notice_date' => '2026-11-18',
            'category' => 'Campus Drive Circular',
            'summary' => 'Final-year B.Tech (CSE, E&TC, ECS, Electrical) students with 6.5+ CGPA and zero active backlogs must register on the T&P Portal before 25 Nov 2026.',
            'attachment_url' => '',
            'link_label' => 'View Eligibility Circular',
            'is_pinned' => 1,
        ],
        [
            'title' => '7-Day Coding, Aptitude & Technical Interview Readiness Bootcamp (Batch 2026-27)',
            'notice_date' => '2026-11-14',
            'category' => 'Training & CRT Schedule',
            'summary' => 'Mandatory DSA, SQL, System Design, and Group Discussion mock panels conducted daily 2:00 PM – 5:00 PM at the T&P Innovation Centre.',
            'attachment_url' => '',
            'link_label' => '',
            'is_pinned' => 1,
        ],
        [
            'title' => 'Bharat Forge & Atlas Copco Core Engineering Pre-Placement Talk & Written Test',
            'notice_date' => '2026-11-10',
            'category' => 'Pre-Placement Talk',
            'summary' => 'Pre-placement briefing for Mechanical & Electrical eligible candidates will be held in Seminar Hall B followed by an online technical screening.',
            'attachment_url' => '',
            'link_label' => '',
            'is_pinned' => 0,
        ],
    ];
}

function defaultPlacementCustomSections(): array
{
    return [
        [
            'title' => 'Semester-Wise Career Readiness & Industry Training Matrix',
            'subtitle' => 'Structured four-year employability curriculum across aptitude, competitive coding, and core domain labs.',
            'section_type' => 'table',
            'html_content' => '',
            'payload_json' => json_encode([
                'headers' => ['Academic Stage', 'Core Training Module', 'Delivery Partner / Lab', 'Assessment Outcome'],
                'rows' => [
                    ['SY (Sem III & IV)', 'Quantitative Aptitude, Logic & C/Python Foundation', 'Internal CRT Wing', 'AMCAT / HackerRank Baseline'],
                    ['TY (Sem V & VI)', 'Full-Stack, DSA, Core CAD/FEA & Embedded Prototyping', 'Tata CIII / Industry Mentors', '2 Minor Live Industry Projects'],
                    ['B.Tech (Sem VII)', 'Company-Specific Coding Sprints & HR Panel Mock Drives', 'T&P Cell & Alumni Panel', 'Tier-1 & Core Drive Readiness'],
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'cta_label' => '',
            'cta_url' => '',
            'is_published' => 1,
        ],
        [
            'title' => 'T&P Infrastructure & Campus Recruitment Facilities',
            'subtitle' => 'Dedicated facilities supporting simultaneous corporate recruitment drives and proctored assessments.',
            'section_type' => 'cards',
            'html_content' => '',
            'payload_json' => json_encode([
                ['title' => 'Central Assessment Lab', 'metric' => '420 Thin-Client Nodes', 'description' => '1 Gbps leased line, UPS backup, and proctored online coding test environment.'],
                ['title' => 'Auditorium & GD Suites', 'metric' => '350-Seat Hall + 6 Rooms', 'description' => 'Acoustic auditorium for Pre-Placement Talks plus 6 air-conditioned interview cabins.'],
                ['title' => 'Industry Sponsored Labs', 'metric' => 'Tata CIII & Texas Instruments', 'description' => 'Real-time exposure to robotics, EV diagnostics, and cloud deployment toolchains.'],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'cta_label' => '',
            'cta_url' => '',
            'is_published' => 1,
        ],
    ];
}

function defaultPlacementDrives(): array
{
    return [
        ['id' => 'drv1', 'company' => 'TCS Digital & Prime Recruitment Drive', 'roleTitle' => 'Systems Engineer / Prime Developer', 'packageLpa' => '7.0 – 9.0 LPA', 'eligibleBranches' => 'CSE, E&TC, ECS, Electrical', 'driveDate' => '2026-11-28', 'venue' => 'Central T&P Auditorium', 'status' => 'Registrations Open', 'registrationUrl' => ''],
        ['id' => 'drv2', 'company' => 'Bharat Forge EV & Design Center', 'roleTitle' => 'Graduate Engineer Trainee (R&D)', 'packageLpa' => '6.5 LPA', 'eligibleBranches' => 'Mechanical, Electrical', 'driveDate' => '2026-12-06', 'venue' => 'T&P Seminar Hall B', 'status' => 'Upcoming', 'registrationUrl' => ''],
    ];
}

function getPlacementDrives(PDO $pdo): array
{
    try {
        $raw = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'placement_upcoming_drives' LIMIT 1")->fetchColumn();
        if ($raw) {
            $dec = json_decode((string)$raw, true);
            if (is_array($dec)) {
                return $dec;
            }
        }
    } catch (Throwable $ignored) {
    }
    return defaultPlacementDrives();
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
    switch ($raw) {
        case 'statutory':
            return 'Statutory Officer';
        case 'governance':
            return 'Governing Body';
        case 'icc':
            return 'Internal Complaint Committee (ICC)';
        case 'academic_leadership':
            return 'Academic Leadership';
        default:
            return $raw;
    }
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

function defaultSportsPortalConfig(): array
{
    return [
        'heroBadge'          => 'Student Life · Directorate of Physical Education & Sports',
        'heroTitle'          => 'Athletics, Indoor Courts, Fitness & Sports Portal',
        'heroSubtitle'       => 'Dedicated athletic grounds, indoor badminton & table-tennis arenas, university zonal championships, student medalists, and fitness schedules at SVERI Pandharpur.',
        'directorName'       => 'Prof. R. S. Jadhav',
        'directorTitle'      => 'Director of Physical Education & Sports',
        'directorEmail'      => 'sports@coe.sveri.ac.in',
        'directorPhone'      => '+91-02186-216063',
        'gymkhanaTimings'    => '6:00 AM – 8:30 AM & 4:30 PM – 8:00 PM (Mon – Sat)',
        'annualFlagshipName' => 'SVERI Utsav & Inter-Engineering Krida Mahotsav',
        'customFields'       => [
            ['label' => 'Campus Sports Area', 'value' => '8.5 Acres Dedicated Athletic Grounds'],
            ['label' => 'Affiliated Sports Board', 'value' => 'PAHSUS Solapur & AIU Inter-University'],
            ['label' => 'Medical & First-Aid Support', 'value' => 'On-Field Physiotherapist & Ambulance Standby'],
        ],
    ];
}

function getSportsPortalConfig(PDO $pdo): array
{
    $def = defaultSportsPortalConfig();
    try {
        $raw = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'sports_portal_config' LIMIT 1")->fetchColumn();
        if ($raw) {
            $dec = json_decode((string)$raw, true);
            if (is_array($dec)) {
                return array_merge($def, $dec);
            }
        }
    } catch (Throwable $ignored) {
    }
    return $def;
}

function defaultFacilitiesPortalConfig(): array
{
    return [
        'heroBadge'          => 'Institutional Infrastructure, IT & Student Support Campus',
        'heroTitle'          => 'Campus Facilities & Infrastructure Showcase',
        'heroSubtitle'       => 'Explore AICTE/UGC-compliant smart lecture theatres, 1 Gbps campus computing backbone, central library, hostels, research centres, green solar microgrids, and barrier-free student amenities.',
        'customFieldPresets' => ['Area (Sq. Ft.)', 'Equipment Highlights', 'Accessibility / Divyangjan Support', 'Power & Safety Compliance', 'Booking / Access Policy'],
    ];
}

function getFacilitiesPortalConfig(PDO $pdo): array
{
    $def = defaultFacilitiesPortalConfig();
    try {
        $raw = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'facilities_portal_config' LIMIT 1")->fetchColumn();
        if ($raw) {
            $dec = json_decode((string)$raw, true);
            if (is_array($dec)) {
                return array_merge($def, $dec);
            }
        }
    } catch (Throwable $ignored) {
    }
    return $def;
}

function normalizePhpSlug(string $raw): string
{
    $decoded = rawurldecode(trim($raw));
    $decoded = str_replace('&', ' and ', $decoded);
    $s = strtolower($decoded);
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    return trim($s, '-');
}

function extractPlainTextExcerpt(string $html, int $maxLen = 165): string
{
    $txt = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $txt = trim((string)(preg_replace('/\s+/', ' ', $txt) ?? ''));
    if (strlen($txt) <= $maxLen) {
        return $txt;
    }
    return rtrim(substr($txt, 0, $maxLen - 1)) . '…';
}

function resolvePageBySlugWithAliases(PDO $pdo, string $rawSlug): ?array
{
    $candidates = [];
    $trimRaw = trim($rawSlug);
    if ($trimRaw !== '') {
        $candidates[] = $trimRaw;
    }
    $norm = normalizePhpSlug($rawSlug);
    if ($norm !== '' && !in_array($norm, $candidates, true)) {
        $candidates[] = $norm;
    }
    $aliasMap = [
        'incubation-center'                         => 'incubation-cell',
        'incubation-centre'                         => 'incubation-cell',
        'startups-iic-cell'                         => 'incubation-cell',
        'start-ups-and-iic-cell'                    => 'incubation-cell',
        'incubation-center-start-ups-and-iic-cell'  => 'incubation-cell',
        'central-research-facilities'               => 'central-facilities',
        'central-research-and-computing-facilities' => 'central-facilities',
        'research-and-development-cell'             => 'research-development-cell',
        'conferences-and-workshops'                 => 'conferences-workshops-events',
        'national-international-conferences'        => 'conferences-workshops-events',
    ];
    if ($norm !== '' && isset($aliasMap[$norm])) {
        $candidates[] = $aliasMap[$norm];
    }

    $stmt = $pdo->prepare(
        "SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.ugc_code
         FROM pages p
         JOIN categories c ON p.category_id = c.id
         WHERE p.slug = ? AND p.is_published = 1 AND p.status = 'published'
         LIMIT 1"
    );
    foreach (array_values(array_unique($candidates)) as $cand) {
        $stmt->execute([$cand]);
        $found = $stmt->fetch();
        if ($found) {
            return $found;
        }
    }
    return null;
}

function socialPlatformCatalog(): array
{
    return [
        'facebook'  => 'Facebook',
        'linkedin'  => 'LinkedIn',
        'instagram' => 'Instagram',
        'youtube'   => 'YouTube',
        'twitter'   => 'X (Twitter)',
        'whatsapp'  => 'WhatsApp Channel',
        'telegram'  => 'Telegram Channel',
        'github'    => 'GitHub',
        'custom'    => 'Custom Social Link',
    ];
}

function defaultSocialMediaLinks(): array
{
    return [
        ['id' => 1, 'platform' => 'facebook',  'label' => 'Facebook',    'url' => 'https://facebook.com',  'handle' => '@svcoer',           'custom_svg' => '', 'is_active' => 1, 'sort_order' => 1],
        ['id' => 2, 'platform' => 'linkedin',  'label' => 'LinkedIn',    'url' => 'https://linkedin.com',  'handle' => 'svcoer-pandharpur', 'custom_svg' => '', 'is_active' => 1, 'sort_order' => 2],
        ['id' => 3, 'platform' => 'instagram', 'label' => 'Instagram',   'url' => 'https://instagram.com', 'handle' => '@svcoer_official',  'custom_svg' => '', 'is_active' => 1, 'sort_order' => 3],
        ['id' => 4, 'platform' => 'youtube',   'label' => 'YouTube',     'url' => 'https://youtube.com',   'handle' => '@svcoer_edu',       'custom_svg' => '', 'is_active' => 1, 'sort_order' => 4],
        ['id' => 5, 'platform' => 'twitter',   'label' => 'X (Twitter)', 'url' => 'https://x.com',         'handle' => '@svcoer_edu',       'custom_svg' => '', 'is_active' => 1, 'sort_order' => 5],
    ];
}

function getSocialMediaLinks(PDO $pdo, bool $onlyActive = false): array
{
    try {
        $sql = 'SELECT * FROM social_media_links' . ($onlyActive ? ' WHERE is_active = 1' : '') . ' ORDER BY sort_order ASC, id ASC';
        $rows = $pdo->query($sql)->fetchAll();
        if (is_array($rows) && count($rows) > 0) {
            return $rows;
        }
        if ($onlyActive) {
            $cnt = (int)$pdo->query('SELECT COUNT(*) FROM social_media_links')->fetchColumn();
            if ($cnt > 0) {
                return [];
            }
        }
    } catch (Throwable $ignored) {
    }
    return defaultSocialMediaLinks();
}

function defaultSocialSharingConfig(): array
{
    return [
        'enabled'           => true,
        'showIconsInHeader' => true,
        'showIconsInFooter' => true,
        'showOnPages'       => true,
        'showOnResearch'    => true,
        'showOnConferences' => true,
        'showOnPortals'     => true,
        'shareHeading'      => 'Share this update',
        'defaultHashtags'   => 'SVCOER,SVERI,Engineering,NEP2020,Pandharpur',
        'twitterHandle'     => 'svcoer_edu',
        'platforms'         => [
            'whatsapp'    => true,
            'linkedin'    => true,
            'twitter'     => true,
            'facebook'    => true,
            'telegram'    => true,
            'email'       => true,
            'copyLink'    => true,
            'nativeShare' => true,
        ],
    ];
}

function getSocialSharingConfig(PDO $pdo): array
{
    $def = defaultSocialSharingConfig();
    try {
        $raw = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'social_sharing_config' LIMIT 1")->fetchColumn();
        if (is_string($raw) && $raw !== '') {
            $dec = json_decode($raw, true);
            if (is_array($dec)) {
                $merged = array_replace_recursive($def, $dec);
                foreach (['enabled', 'showIconsInHeader', 'showIconsInFooter', 'showOnPages', 'showOnResearch', 'showOnConferences', 'showOnPortals'] as $bk) {
                    $merged[$bk] = !empty($merged[$bk]);
                }
                return $merged;
            }
        }
    } catch (Throwable $ignored) {
    }
    return $def;
}

function saveSocialSharingConfig(PDO $pdo, array $next): array
{
    $def = defaultSocialSharingConfig();
    $merged = array_replace_recursive($def, $next);
    foreach (['enabled', 'showIconsInHeader', 'showIconsInFooter', 'showOnPages', 'showOnResearch', 'showOnConferences', 'showOnPortals'] as $bk) {
        $merged[$bk] = !empty($merged[$bk]);
    }
    foreach (array_keys($def['platforms']) as $pk) {
        $merged['platforms'][$pk] = !empty($merged['platforms'][$pk]);
    }
    try {
        $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('social_sharing_config', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
            ->execute([json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    } catch (Throwable $ignored) {
    }
    return $merged;
}

function socialPlatformSvg(string $platform, string $customSvg = ''): string
{
    $p = strtolower(trim($platform));
    if ($p === 'custom' && trim($customSvg) !== '' && stripos($customSvg, '<svg') !== false && stripos($customSvg, '<script') === false) {
        return $customSvg;
    }
    switch ($p) {
        case 'facebook':
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 9H16V6h-2.5C11.6 6 10 7.6 10 9.5V11H8v3h2v7h3v-7h2.3l.7-3H13v-1.5c0-.3.2-.5.5-.5z"/></svg>';
        case 'linkedin':
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.9 8.5A1.9 1.9 0 1 1 6.9 4.7a1.9 1.9 0 0 1 0 3.8zM5.3 10h3.2v9.5H5.3V10zm5.2 0h3.1v1.3h.1c.4-.8 1.5-1.6 3.1-1.6 3.3 0 3.9 2.1 3.9 4.9v4.9h-3.2v-4.4c0-1 0-2.4-1.5-2.4s-1.7 1.1-1.7 2.3v4.5h-3.2V10z"/></svg>';
        case 'instagram':
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
        case 'youtube':
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2C2 9 2 12 2 12s0 3 .4 4.8a2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2C22 15 22 12 22 12s0-3-.4-4.8zM10 15.2V8.8l5.5 3.2-5.5 3.2z"/></svg>';
        case 'twitter':
            return '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.3 3H21l-6.6 7.5L22 21h-6l-4.7-6.1L6 21H3.2l7-8L2.8 3h6.1l4.2 5.6L18.3 3z"/></svg>';
        case 'whatsapp':
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.6 14.1c-.2.7-1.4 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.7-3-1.3-5-4.3-5.1-4.5-.2-.2-1.2-1.6-1.2-3.1s.8-2.2 1.1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5.3.7.9 2.1 1 2.3.1.2.1.4 0 .6-.1.2-.2.4-.4.6l-.4.5c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.8 1.8.3.1.5.1.7-.1.2-.2.8-.9 1-1.3.2-.3.4-.3.7-.2.3.1 1.9.9 2.2 1.1.3.2.5.3.6.4.1.2.1.8-.1 1.5z"/></svg>';
        case 'telegram':
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.4 4.2L2.9 11.4c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 11-6.9c.5-.3 1-.1.6.2L10.1 15.8l-.4 5c.6 0 .8-.3 1.1-.6l2.6-2.5 5.4 4c1 .5 1.7.3 1.9-.9l3.3-15.4c.3-1.4-.5-2-1.6-1.2z"/></svg>';
        case 'github':
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.6 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c2-1.3 2.8-1 2.8-1 .5 1.4.2 2.5.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 22 12c0-5.5-4.5-10-10-10z"/></svg>';
        default:
            return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>';
    }
}

function renderPhpSocialIcons(PDO $pdo, string $variant = 'header'): string
{
    $cfg = getSocialSharingConfig($pdo);
    if ($variant === 'header' && empty($cfg['showIconsInHeader'])) {
        return '';
    }
    if ($variant === 'footer' && empty($cfg['showIconsInFooter'])) {
        return '';
    }
    $links = getSocialMediaLinks($pdo, true);
    if (empty($links)) {
        return '';
    }

    if ($variant === 'contact') {
        $out = '<div class="card" style="margin-top:1.25rem;"><h3 style="margin-top:0;">Official Social Media Channels</h3><div style="display:flex;flex-wrap:wrap;gap:0.65rem;">';
        foreach ($links as $lk) {
            $svg = socialPlatformSvg((string)$lk['platform'], (string)($lk['custom_svg'] ?? ''));
            $handle = trim((string)($lk['handle'] ?? ''));
            $out .= '<a href="' . e((string)$lk['url']) . '" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.55rem 0.9rem;border:1px solid var(--border-color);border-radius:8px;text-decoration:none;color:var(--primary-color);background:var(--surface-bg);font-weight:600;font-size:0.86rem;">'
                . $svg
                . '<span>' . e((string)$lk['label']) . ($handle !== '' ? ' <small style="color:var(--text-muted);font-weight:500;">(' . e($handle) . ')</small>' : '') . '</span>'
                . '</a>';
        }
        $out .= '</div></div>';
        return $out;
    }

    if ($variant === 'footer') {
        $out = '<div style="display:flex;flex-wrap:wrap;gap:0.45rem;margin-top:0.75rem;" aria-label="Social Media Channels">';
        foreach ($links as $lk) {
            $svg = socialPlatformSvg((string)$lk['platform'], (string)($lk['custom_svg'] ?? ''));
            $out .= '<a href="' . e((string)$lk['url']) . '" target="_blank" rel="noopener noreferrer" title="' . e((string)$lk['label']) . '" aria-label="' . e((string)$lk['label']) . '" style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;border:1px solid #334155;background:rgba(255,255,255,0.06);color:#e2e8f0;text-decoration:none;">' . $svg . '</a>';
        }
        $out .= '</div>';
        return $out;
    }

    // Compact header ribbon icons
    $out = '<div class="a11y-social-group" style="display:inline-flex;align-items:center;gap:0.35rem;" aria-label="Official Social Channels">';
    foreach ($links as $lk) {
        $svg = socialPlatformSvg((string)$lk['platform'], (string)($lk['custom_svg'] ?? ''));
        $out .= '<a href="' . e((string)$lk['url']) . '" target="_blank" rel="noopener noreferrer" title="' . e((string)$lk['label']) . '" aria-label="' . e((string)$lk['label']) . '" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:5px;background:rgba(255,255,255,0.12);color:#fff;text-decoration:none;">' . $svg . '</a>';
    }
    $out .= '</div>';
    return $out;
}

function renderPhpSocialShareBar(PDO $pdo, string $title, string $summary = '', string $url = '', string $location = 'page', bool $pageEnabled = true, bool $compact = false): string
{
    if (!$pageEnabled) {
        return '';
    }
    $cfg = getSocialSharingConfig($pdo);
    if (empty($cfg['enabled'])) {
        return '';
    }
    if ($location === 'page' && empty($cfg['showOnPages'])) {
        return '';
    }
    if ($location === 'research' && empty($cfg['showOnResearch'])) {
        return '';
    }
    if ($location === 'conference' && empty($cfg['showOnConferences'])) {
        return '';
    }
    if ($location === 'portal' && empty($cfg['showOnPortals'])) {
        return '';
    }

    $shareUrl = trim($url);
    if ($shareUrl === '') {
        $scheme = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') ? 'https' : 'http';
        $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
        $uri = (string)($_SERVER['REQUEST_URI'] ?? '/index.php');
        $shareUrl = $scheme . '://' . $host . $uri;
    } elseif (!preg_match('#^https?://#i', $shareUrl)) {
        $shareUrl = rtrim(resolvePhpCanonicalBase(function_exists('getSeoSettings') ? getSeoSettings($pdo) : []), '/') . '/' . ltrim($shareUrl, '/');
    }

    $p = $cfg['platforms'] ?? [];
    $heading = trim((string)($cfg['shareHeading'] ?? 'Share this update')) ?: 'Share this update';
    $encUrl = rawurlencode($shareUrl);
    $encTitle = rawurlencode($title);
    $encText = rawurlencode(trim($title . ($summary !== '' ? ' — ' . $summary : '')));
    $via = trim(ltrim((string)($cfg['twitterHandle'] ?? ''), '@'));
    $hashtags = trim((string)($cfg['defaultHashtags'] ?? ''));

    $mailSvg  = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
    $copySvg  = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    $shareSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';

    $btnCls = 'share-icon-btn' . ($compact ? ' is-compact' : '');
    $buttons = '';
    if (!empty($p['whatsapp'])) {
        $buttons .= '<a class="' . $btnCls . ' share-wa" title="Share on WhatsApp" aria-label="Share on WhatsApp" target="_blank" rel="noopener noreferrer" href="https://api.whatsapp.com/send?text=' . $encText . '%20' . $encUrl . '">' . socialPlatformSvg('whatsapp') . '</a>';
    }
    if (!empty($p['linkedin'])) {
        $buttons .= '<a class="' . $btnCls . ' share-li" title="Share on LinkedIn" aria-label="Share on LinkedIn" target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/sharing/share-offsite/?url=' . $encUrl . '">' . socialPlatformSvg('linkedin') . '</a>';
    }
    if (!empty($p['twitter'])) {
        $tw = 'https://twitter.com/intent/tweet?text=' . $encTitle . '&url=' . $encUrl
            . ($via !== '' ? '&via=' . rawurlencode($via) : '')
            . ($hashtags !== '' ? '&hashtags=' . rawurlencode($hashtags) : '');
        $buttons .= '<a class="' . $btnCls . ' share-tw" title="Share on X (Twitter)" aria-label="Share on X (Twitter)" target="_blank" rel="noopener noreferrer" href="' . e($tw) . '">' . socialPlatformSvg('twitter') . '</a>';
    }
    if (!empty($p['facebook'])) {
        $buttons .= '<a class="' . $btnCls . ' share-fb" title="Share on Facebook" aria-label="Share on Facebook" target="_blank" rel="noopener noreferrer" href="https://www.facebook.com/sharer/sharer.php?u=' . $encUrl . '">' . socialPlatformSvg('facebook') . '</a>';
    }
    if (!empty($p['telegram'])) {
        $buttons .= '<a class="' . $btnCls . ' share-tg" title="Share on Telegram" aria-label="Share on Telegram" target="_blank" rel="noopener noreferrer" href="https://t.me/share/url?url=' . $encUrl . '&text=' . $encTitle . '">' . socialPlatformSvg('telegram') . '</a>';
    }
    if (!empty($p['email'])) {
        $mailBody = rawurlencode(($summary !== '' ? $summary . "\n\n" : '') . $shareUrl);
        $buttons .= '<a class="' . $btnCls . ' share-em" title="Share via Email" aria-label="Share via Email" href="mailto:?subject=' . $encTitle . '&body=' . $mailBody . '">' . $mailSvg . '</a>';
    }
    if (!empty($p['copyLink'])) {
        $buttons .= '<button type="button" class="' . $btnCls . ' share-cp" title="Copy link to clipboard" aria-label="Copy link to clipboard" onclick="svcoerCopyShareUrl(' . htmlspecialchars(json_encode($shareUrl), ENT_QUOTES, 'UTF-8') . ', this)">' . $copySvg . '</button>';
    }
    if (!empty($p['nativeShare'])) {
        $buttons .= '<button type="button" class="' . $btnCls . ' share-nat" title="Share" aria-label="Share" onclick="if(navigator.share){navigator.share({title:' . htmlspecialchars(json_encode($title), ENT_QUOTES, 'UTF-8') . ',text:' . htmlspecialchars(json_encode($summary ?: $title), ENT_QUOTES, 'UTF-8') . ',url:' . htmlspecialchars(json_encode($shareUrl), ENT_QUOTES, 'UTF-8') . '}).catch(function(){});}else{svcoerCopyShareUrl(' . htmlspecialchars(json_encode($shareUrl), ENT_QUOTES, 'UTF-8') . ', this);}">' . $shareSvg . '</button>';
    }

    if ($buttons === '') {
        return '';
    }

    $script = '<script>if(typeof window.svcoerCopyShareUrl!=="function"){window.svcoerCopyShareUrl=function(u,btn){var showToast=function(){var t=document.getElementById("svcoer-share-toast");if(!t){t=document.createElement("div");t.id="svcoer-share-toast";t.className="share-toast";t.setAttribute("role","status");t.setAttribute("aria-live","polite");document.body.appendChild(t);}t.textContent="Link copied to clipboard";t.classList.add("is-visible");clearTimeout(window._svcoerToastTimer);window._svcoerToastTimer=setTimeout(function(){t.classList.remove("is-visible");},2300);if(btn){btn.classList.add("is-copied");setTimeout(function(){btn.classList.remove("is-copied");},1800);}};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(u).then(showToast).catch(function(){});}else{var ta=document.createElement("textarea");ta.value=u;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");showToast();}catch(e){}document.body.removeChild(ta);}};}</script>';

    if ($compact) {
        return '<div class="share-icon-bar is-compact" role="group" aria-label="Share ' . e($title) . '">'
            . '<span class="share-icon-label">Share</span>'
            . '<div class="share-icon-group">' . $buttons . '</div>'
            . '</div>' . $script;
    }

    return '<div class="card share-icon-bar" role="group" aria-label="Share ' . e($title) . '">'
        . '<strong class="share-icon-heading">' . e($heading) . '</strong>'
        . '<div class="share-icon-group">' . $buttons . '</div>'
        . '</div>' . $script;
}

function researchPatentTypePresets(): array
{
    return [
        'Patent Granted',
        'Patent Published',
        'Patent Filed',
        'Copyright / Design',
        'Journal / Conference Publication',
        'Industry Consultancy',
        'Incubated Start-up',
        'Industry / Academic MoU',
    ];
}

function defaultResearchPortfolioConfig(): array
{
    return [
        'heroBadge'            => 'UGC Section 5(e) · Sponsored R&D, IPR & Innovation Ecosystem',
        'heroTitle'            => 'Research, Funded Grants, Patents & Incubation Cell',
        'heroSubtitle'         => 'Autonomous R&D ecosystem driving DST-SERB, AICTE-MODROBS, MSME Design Clinic grants, filed/granted Indian patents, industry consultancy, and AICTE IDEA Lab hardware startups.',
        'deanName'             => 'Dr. M. S. Kadam',
        'deanTitle'            => 'Dean Research & Development (R&D) & IPR Cell',
        'deanEmail'            => 'dean.rd@coe.sveri.ac.in',
        'deanPhone'            => '+91-02186-216066',
        'totalGrantsHighlight' => 'Rs. 3.85 Cr+ Sponsored Grants',
        'activeLabsHighlight'  => '4 Approved Ph.D. Centres & 18+ Active Labs',
        'consultancyPolicyUrl' => 'quick-links.php',
    ];
}

function getResearchPortfolioConfig(PDO $pdo): array
{
    $def = defaultResearchPortfolioConfig();
    try {
        $raw = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'research_portfolio_config' LIMIT 1")->fetchColumn();
        if (is_string($raw) && $raw !== '') {
            $dec = json_decode($raw, true);
            if (is_array($dec)) {
                return array_merge($def, $dec);
            }
        }
    } catch (Throwable $ignored) {
    }
    return $def;
}

function saveResearchPortfolioConfig(PDO $pdo, array $cfg): void
{
    $merged = array_merge(defaultResearchPortfolioConfig(), $cfg);
    $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('research_portfolio_config', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
        ->execute([json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
}

function getResearchPortfolioData(PDO $pdo, bool $onlyPublished = true): array
{
    $cfg = getResearchPortfolioConfig($pdo);
    $projects = [];
    $patents = [];
    try {
        $pSql = 'SELECT * FROM research_projects' . ($onlyPublished ? " WHERE is_published = 1 AND moderation_status = 'published'" : '') . ' ORDER BY sort_order ASC, id ASC';
        $projects = $pdo->query($pSql)->fetchAll() ?: [];
    } catch (Throwable $ignored) {
    }
    try {
        $iSql = 'SELECT * FROM research_patents' . ($onlyPublished ? " WHERE is_published = 1 AND moderation_status = 'published'" : '') . ' ORDER BY sort_order ASC, id ASC';
        $patents = $pdo->query($iSql)->fetchAll() ?: [];
    } catch (Throwable $ignored) {
    }
    return ['config' => $cfg, 'projects' => $projects, 'patents' => $patents];
}

function feedbackSubmissionTypePresets(): array
{
    return ['Suggestion', 'Complaint', 'Appreciation', 'Service Request'];
}

function defaultFeedbackSections(): array
{
    return [
        ['id' => 1, 'slug' => 'academics', 'section_name' => 'Academics & Classroom Teaching', 'subsections' => ['Curriculum & OBE Syllabus', 'Faculty Teaching & Mentoring', 'Laboratory Equipment & Practicals', 'Academic Timetable & Workload'], 'recipient_emails' => 'dean.academics@coe.sveri.ac.in, principal@coe.sveri.ac.in', 'cc_emails' => 'iqac@coe.sveri.ac.in', 'incharge_name' => 'Dr. S. B. Kulkarni (Dean Academics)', 'incharge_designation' => 'Dean Academics & IQAC', 'sla_days' => 5, 'auto_email_enabled' => 1, 'is_active' => 1, 'sort_order' => 1],
        ['id' => 2, 'slug' => 'examination', 'section_name' => 'Examination & Evaluation Cell', 'subsections' => ['Exam Form & Hall Ticket', 'Result & Grade Card Verification', 'Photocopy / Revaluation', 'Transcripts & Migration'], 'recipient_emails' => 'coe@coe.sveri.ac.in', 'cc_emails' => 'principal@coe.sveri.ac.in', 'incharge_name' => 'Dr. M. S. Kumbhar (Controller of Examinations)', 'incharge_designation' => 'Autonomous Examination Cell', 'sla_days' => 4, 'auto_email_enabled' => 1, 'is_active' => 1, 'sort_order' => 2],
        ['id' => 3, 'slug' => 'infrastructure', 'section_name' => 'Infrastructure & Campus Maintenance', 'subsections' => ['Classroom & Auditorium Facilities', 'Power Supply, AC & Lighting', 'Cleanliness & Restrooms', 'Campus Security & Parking'], 'recipient_emails' => 'estate@coe.sveri.ac.in', 'cc_emails' => 'registrar@coe.sveri.ac.in', 'incharge_name' => 'Prof. S. D. Jadhav (Estate Officer)', 'incharge_designation' => 'Campus Estate & Works', 'sla_days' => 3, 'auto_email_enabled' => 1, 'is_active' => 1, 'sort_order' => 3],
        ['id' => 4, 'slug' => 'hostel-mess', 'section_name' => 'Hostel, Mess & Health Centre', 'subsections' => ['Boys / Girls Hostel Allotment & Rooms', 'Dining Mess Hygiene & Menu', 'Drinking Water & Solar Hot Water', 'Medical & Ambulance Support'], 'recipient_emails' => 'hostel@coe.sveri.ac.in', 'cc_emails' => 'antiragging@coe.sveri.ac.in', 'incharge_name' => 'Dr. P. K. Deshmukh (Chief Rector)', 'incharge_designation' => 'Hostel & Residential Care', 'sla_days' => 2, 'auto_email_enabled' => 1, 'is_active' => 1, 'sort_order' => 4],
        ['id' => 5, 'slug' => 'library-it', 'section_name' => 'Library, Wi-Fi & IT Services', 'subsections' => ['Central Library & E-Journals', 'Campus Wi-Fi & Network Speed', 'ERP / LMS Account Access', 'Central Computing Lab'], 'recipient_emails' => 'library@coe.sveri.ac.in, itadmin@coe.sveri.ac.in', 'cc_emails' => '', 'incharge_name' => 'Mrs. S. P. Joshi & Mr. R. K. Pawar', 'incharge_designation' => 'Library & IT Systems', 'sla_days' => 3, 'auto_email_enabled' => 1, 'is_active' => 1, 'sort_order' => 5],
        ['id' => 6, 'slug' => 'transport-canteen', 'section_name' => 'Transport & Campus Canteen', 'subsections' => ['Bus Routes & Timings', 'Bus Pass & Safety', 'Canteen Food Quality & Pricing', 'On-Campus Stationery & Store'], 'recipient_emails' => 'transport@coe.sveri.ac.in, estate@coe.sveri.ac.in', 'cc_emails' => '', 'incharge_name' => 'Mr. V. S. More (Transport Officer)', 'incharge_designation' => 'Campus Transport & Hospitality', 'sla_days' => 3, 'auto_email_enabled' => 1, 'is_active' => 1, 'sort_order' => 6],
        ['id' => 7, 'slug' => 'accounts-scholarship', 'section_name' => 'Accounts, Fees & Scholarships', 'subsections' => ['Tuition Fee Receipt & Ledger', 'MahaDBT / EBC / Minority Scholarship', 'Caution Money Refund', 'Education Loan Bonafide Letter'], 'recipient_emails' => 'accounts@coe.sveri.ac.in, registrar@coe.sveri.ac.in', 'cc_emails' => '', 'incharge_name' => 'Mr. A. P. Deshmukh (Accounts Officer)', 'incharge_designation' => 'Finance & Scholarship Cell', 'sla_days' => 5, 'auto_email_enabled' => 1, 'is_active' => 1, 'sort_order' => 7],
        ['id' => 8, 'slug' => 'placement-alumni', 'section_name' => 'Training, Placement & Alumni Relations', 'subsections' => ['Campus Recruitment Drives', 'Aptitude & Soft Skills Training', 'Industry Internship NOC', 'Alumni Networking & Mentorship'], 'recipient_emails' => 'tnp@coe.sveri.ac.in, alumni@coe.sveri.ac.in', 'cc_emails' => '', 'incharge_name' => 'Dr. S. B. Kulkarni (Dean T&P)', 'incharge_designation' => 'Training & Placement Cell', 'sla_days' => 4, 'auto_email_enabled' => 1, 'is_active' => 1, 'sort_order' => 8],
    ];
}

function getFeedbackSections(PDO $pdo, bool $onlyActive = false): array
{
    try {
        $sql = 'SELECT * FROM feedback_sections' . ($onlyActive ? ' WHERE is_active = 1' : '') . ' ORDER BY sort_order ASC, id ASC';
        $rows = $pdo->query($sql)->fetchAll() ?: [];
        foreach ($rows as &$r) {
            $subs = json_decode((string)($r['subsections_json'] ?? '[]'), true);
            $r['subsections'] = is_array($subs) ? $subs : [];
        }
        unset($r);
        if (count($rows) > 0) {
            return $rows;
        }
    } catch (Throwable $ignored) {
    }
    return defaultFeedbackSections();
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
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS alumni_achievers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(160) NOT NULL,
                batch_year SMALLINT UNSIGNED NOT NULL,
                department_code VARCHAR(32) NOT NULL,
                designation VARCHAR(160) NULL,
                organization VARCHAR(160) NULL,
                award_title VARCHAR(220) NOT NULL,
                citation TEXT NULL,
                photo_url VARCHAR(255) DEFAULT 'assets/images/principal.jpg',
                linkedin_url VARCHAR(500) NULL,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS alumni_pledges (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(160) NOT NULL,
                email VARCHAR(160) NOT NULL,
                phone VARCHAR(40) NULL,
                batch_year SMALLINT UNSIGNED NOT NULL,
                department_code VARCHAR(32) NOT NULL,
                pledge_type VARCHAR(160) NOT NULL,
                amount_or_support VARCHAR(255) NOT NULL,
                message TEXT NULL,
                status ENUM('pending','acknowledged','fulfilled') DEFAULT 'pending',
                submitted_at VARCHAR(32) NOT NULL
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

        // Seed Distinguished Achievers & Endowment Pledges once
        $extChkStmt = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'alumni_extras_seeded_v1' LIMIT 1");
        $extChkStmt->execute();
        $extrasSeeded = (bool)$extChkStmt->fetchColumn();
        if (!$extrasSeeded) {
            if ((int)$pdo->query('SELECT COUNT(*) FROM alumni_achievers')->fetchColumn() === 0) {
                $insAch = $pdo->prepare(
                    'INSERT INTO alumni_achievers (full_name, batch_year, department_code, designation, organization, award_title, citation, photo_url, linkedin_url, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)'
                );
                $insAch->execute([
                    'Rohan Deshmukh', 2016, 'CSE', 'Principal Cloud Architect', 'Microsoft India',
                    'Distinguished Young Engineer Alumni Award 2026',
                    'Recognized for scaling enterprise cloud systems and sponsoring 15+ rural engineering internships annually.',
                    'assets/images/principal.jpg', 'https://linkedin.com', 1,
                ]);
                $insAch->execute([
                    'Snehal Patwardhan', 2018, 'ENTC', 'Staff SoC Verification Engineer', 'Qualcomm India',
                    'VLSI Innovation & Women in STEM Excellence Award',
                    'Honored for multi-million-gate System-on-Chip verification leadership and annual student bootcamps.',
                    'assets/images/hero_library.jpg', 'https://linkedin.com', 2,
                ]);
            }
            if ((int)$pdo->query('SELECT COUNT(*) FROM alumni_pledges')->fetchColumn() === 0) {
                $pdo->prepare(
                    'INSERT INTO alumni_pledges (full_name, email, phone, batch_year, department_code, pledge_type, amount_or_support, message, status, submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
                )->execute([
                    'Aditya Kulkarni', 'aditya.k@alumni.svcoer.edu.in', '+91-98220-77112', 2015, 'MECH',
                    'Laboratory / Equipment Sponsorship',
                    'EV Battery Thermal Bench & 2-Day CAD Industry Workshop',
                    'Committed to equipping our Mechanical Department EV Centre of Excellence for final-year B.Tech capstone teams.',
                    'acknowledged', '2026-10-18',
                ]);
            }
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('alumni_extras_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
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
        foreach ([
            "ALTER TABLE categories ADD COLUMN menu_location ENUM('main','more','hidden') DEFAULT 'main' AFTER show_in_menu",
            "ALTER TABLE conferences ADD COLUMN hero_slides_json LONGTEXT NULL AFTER banner_url",
            "ALTER TABLE conferences ADD COLUMN submission_mode ENUM('internal','external','closed') DEFAULT 'internal' AFTER fee_tiers_json",
            "ALTER TABLE conferences ADD COLUMN external_submission_url VARCHAR(500) NULL AFTER submission_mode",
            "ALTER TABLE conferences ADD COLUMN external_submission_label VARCHAR(160) NULL AFTER external_submission_url",
            "ALTER TABLE conferences ADD COLUMN submission_instructions_html MEDIUMTEXT NULL AFTER external_submission_label",
            "ALTER TABLE conferences ADD COLUMN enable_poster_presentation TINYINT(1) DEFAULT 1 AFTER submission_instructions_html",
            "ALTER TABLE conferences ADD COLUMN poster_dimensions VARCHAR(160) DEFAULT 'A0 Portrait (841 x 1189 mm)' AFTER enable_poster_presentation",
            "ALTER TABLE conferences ADD COLUMN poster_guidelines_html MEDIUMTEXT NULL AFTER poster_dimensions",
            "ALTER TABLE conferences ADD COLUMN poster_template_url VARCHAR(500) NULL AFTER poster_guidelines_html",
            "ALTER TABLE conferences ADD COLUMN poster_prizes_text VARCHAR(300) NULL AFTER poster_template_url",
            "ALTER TABLE conferences ADD COLUMN poster_items_json MEDIUMTEXT NULL AFTER poster_prizes_text",
            "ALTER TABLE conference_submissions ADD COLUMN presentation_type VARCHAR(80) DEFAULT 'Oral Paper Presentation' AFTER track_title",
            "ALTER TABLE alumni_jobs MODIFY COLUMN job_type VARCHAR(80) DEFAULT 'Full-Time'",
            "ALTER TABLE grievances ADD COLUMN is_anonymous TINYINT(1) DEFAULT 0 AFTER urgency",
            "ALTER TABLE grievances ADD COLUMN attachment_url VARCHAR(300) NULL AFTER is_anonymous",
        ] as $alterSql) {
            try {
                $pdo->exec($alterSql);
            } catch (Throwable $ignoredCol) {
            }
        }
        try {
            $pdo->exec("UPDATE categories SET menu_location = 'hidden' WHERE show_in_menu = 0 AND menu_location = 'main'");
        } catch (Throwable $ignoredSyncLoc) {
        }
        foreach ([
            'portal_menu_items'         => defaultPortalMenuItems(),
            'grievance_portal_config'   => defaultGrievancePortalConfig(),
            'placement_upcoming_drives' => defaultPlacementDrives(),
        ] as $kvKey => $kvDefault) {
            $chk = $pdo->prepare("SELECT key_name FROM cms_kv_store WHERE key_name = ? LIMIT 1");
            $chk->execute([$kvKey]);
            if (!$chk->fetchColumn()) {
                $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                    ->execute([$kvKey, json_encode($kvDefault, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
            }
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
                entry_type VARCHAR(80) NOT NULL DEFAULT 'Campus Placement',
                headline VARCHAR(240) NULL,
                student_name VARCHAR(160) NOT NULL,
                batch_year VARCHAR(30) NOT NULL,
                branch VARCHAR(120) NOT NULL,
                company VARCHAR(160) NOT NULL,
                role_title VARCHAR(160) NOT NULL,
                package_lpa VARCHAR(40) NOT NULL,
                photo_url VARCHAR(255) DEFAULT 'assets/images/principal.jpg',
                quote_text TEXT NULL,
                is_featured TINYINT(1) DEFAULT 0,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );

        foreach ([
            "ALTER TABLE placement_stories ADD COLUMN entry_type VARCHAR(80) NOT NULL DEFAULT 'Campus Placement' AFTER id",
            "ALTER TABLE placement_stories ADD COLUMN headline VARCHAR(240) NULL AFTER entry_type",
            "ALTER TABLE placement_stories ADD COLUMN is_featured TINYINT(1) DEFAULT 0 AFTER quote_text",
        ] as $plAlter) {
            try {
                $pdo->exec($plAlter);
            } catch (Throwable $ignoredCol) {
            }
        }

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS placement_notices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(260) NOT NULL,
                notice_date VARCHAR(30) NOT NULL,
                category VARCHAR(100) NOT NULL DEFAULT 'Campus Drive Circular',
                summary TEXT NULL,
                attachment_url VARCHAR(500) NULL,
                link_label VARCHAR(120) NULL,
                is_pinned TINYINT(1) DEFAULT 0,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );

        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS placement_custom_sections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(240) NOT NULL,
                subtitle VARCHAR(320) NULL,
                section_type ENUM('table','cards','brochure','html') DEFAULT 'table',
                html_content MEDIUMTEXT NULL,
                payload_json MEDIUMTEXT NULL,
                cta_label VARCHAR(140) NULL,
                cta_url VARCHAR(500) NULL,
                is_published TINYINT(1) DEFAULT 1,
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

            $insSt = $pdo->prepare('INSERT INTO placement_stories (entry_type, headline, student_name, batch_year, branch, company, role_title, package_lpa, photo_url, quote_text, is_featured, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
            $insSt->execute(['Dream / Super-Dream Offer', 'Super-Dream Cloud Offer at Deloitte India', 'Atharva Deshpande', '2026', 'CSE', 'Deloitte India', 'Analyst — Cloud & Data Engg.', '14.5 LPA', 'assets/images/principal.jpg', 'Coding bootcamps and alumni mock interviews prepared me thoroughly.', 1, 1]);
            $insSt->execute(['Core Industry Offer', 'Core Design & Automation Selection', 'Pranjal Kulkarni', '2026', 'MECH', 'Atlas Copco', 'Graduate Engineer Trainee', '8.2 LPA', 'assets/images/principal.jpg', 'Hands-on CNC and Robotics lab exposure set our batch apart during technical rounds.', 1, 2]);
            $insSt->execute(['National Hackathon / Award', 'National Winner — Smart India Hackathon 2026', 'Team Astra (CSE & E&TC)', '2026', 'CSE / E&TC', 'Ministry of Education, GoI', 'First Prize — Smart Agri-Grid Track', 'INR 1,00,000 Award', 'assets/images/principal.jpg', 'Campus R&D prototyping mentorship helped our team edge out 38 finalist squads nationwide.', 1, 3]);
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('placements_summary', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([json_encode([
                    'summaryNote'      => 'With a 91.1% placement track record and 250+ visiting recruiters, our Training & Placement Cell delivers structured aptitude, coding, Communication Improvement Programs (CIP), and industry internship mentorship.',
                    'coordinatorName'  => 'Dr. S. B. Kulkarni',
                    'coordinatorEmail' => 'tnp@coe.sveri.ac.in',
                    'coordinatorPhone' => '+91-02186-216063',
                    'brochureUrl'      => '',
                    'brochureLabel'    => 'Download T&P Brochure (PDF)',
                ], JSON_UNESCAPED_UNICODE)]);
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('placements_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
                ->execute();
        }

        // Seed Placement Notices, Congratulations metadata backfill & Custom Sections once (non-destructive)
        $plEnhChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'placements_enhanced_seeded_v1' LIMIT 1");
        $plEnhChk->execute();
        if (!$plEnhChk->fetchColumn()) {
            try {
                if ((int)$pdo->query('SELECT COUNT(*) FROM placement_notices')->fetchColumn() === 0) {
                    $insNot = $pdo->prepare('INSERT INTO placement_notices (title, notice_date, category, summary, attachment_url, link_label, is_pinned, sort_order) VALUES (?,?,?,?,?,?,?,?)');
                    foreach (defaultPlacementNotices() as $nIdx => $nr) {
                        $insNot->execute([
                            $nr['title'],
                            $nr['notice_date'],
                            $nr['category'],
                            $nr['summary'],
                            $nr['attachment_url'],
                            $nr['link_label'],
                            $nr['is_pinned'],
                            $nIdx + 1,
                        ]);
                    }
                }
                if ((int)$pdo->query('SELECT COUNT(*) FROM placement_custom_sections')->fetchColumn() === 0) {
                    $insCs = $pdo->prepare('INSERT INTO placement_custom_sections (title, subtitle, section_type, html_content, payload_json, cta_label, cta_url, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?)');
                    foreach (defaultPlacementCustomSections() as $cIdx => $cr) {
                        $insCs->execute([
                            $cr['title'],
                            $cr['subtitle'],
                            $cr['section_type'],
                            $cr['html_content'],
                            $cr['payload_json'],
                            $cr['cta_label'],
                            $cr['cta_url'],
                            $cr['is_published'],
                            $cIdx + 1,
                        ]);
                    }
                }
                $pdo->prepare("UPDATE placement_stories SET headline = CONCAT(company, ' — ', role_title) WHERE headline IS NULL OR headline = ''")->execute();
            } catch (Throwable $ignoredPlEnh) {
            }
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('placements_enhanced_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
                ->execute();
        }

        // Sports & Campus Facilities Tables (Schema v7, non-destructive)
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS sports_facilities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                facility_type VARCHAR(100) NOT NULL DEFAULT 'Outdoor Ground / Track',
                dimensions_or_capacity VARCHAR(160) NULL,
                timings VARCHAR(160) NULL,
                incharge_name VARCHAR(150) NULL,
                description TEXT NULL,
                image_url VARCHAR(300) DEFAULT 'assets/images/sports_complex.jpg',
                custom_fields_json MEDIUMTEXT NULL,
                is_published TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS sports_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(240) NOT NULL,
                event_type VARCHAR(100) NOT NULL DEFAULT 'Annual Sports Meet',
                discipline VARCHAR(120) NOT NULL DEFAULT 'Multi-Sport',
                event_date VARCHAR(60) NOT NULL,
                venue VARCHAR(220) NOT NULL,
                organizer VARCHAR(180) NULL,
                status ENUM('Upcoming','Registrations Open','Completed') DEFAULT 'Upcoming',
                registration_url VARCHAR(500) NULL,
                description TEXT NULL,
                banner_url VARCHAR(300) DEFAULT 'assets/images/sports_complex.jpg',
                is_published TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS sports_achievements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_or_team_name VARCHAR(200) NOT NULL,
                department_code VARCHAR(32) NOT NULL,
                batch_year VARCHAR(30) NULL,
                sport_name VARCHAR(120) NOT NULL,
                level ENUM('University','State','National','International','Zonal / Intercollegiate') DEFAULT 'State',
                medal_or_rank VARCHAR(120) NOT NULL,
                event_name VARCHAR(240) NOT NULL,
                event_date VARCHAR(40) NOT NULL,
                photo_url VARCHAR(300) DEFAULT 'assets/images/sports_complex.jpg',
                highlights TEXT NULL,
                is_featured TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS sports_gallery (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(220) NOT NULL,
                media_type ENUM('Photo','Video') DEFAULT 'Photo',
                category VARCHAR(120) DEFAULT 'Annual Sports Meet',
                media_url VARCHAR(500) NOT NULL,
                thumbnail_url VARCHAR(300) NULL,
                event_date VARCHAR(40) NULL,
                caption TEXT NULL,
                is_published TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS sports_notices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(260) NOT NULL,
                notice_date VARCHAR(40) NOT NULL,
                category VARCHAR(100) DEFAULT 'Trials & Selection',
                summary TEXT NULL,
                attachment_url VARCHAR(500) NULL,
                registration_link VARCHAR(500) NULL,
                is_pinned TINYINT(1) DEFAULT 0,
                is_published TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS facilities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(220) NOT NULL,
                category VARCHAR(140) NOT NULL DEFAULT 'Infrastructural Facilities',
                short_summary VARCHAR(320) NULL,
                description_html MEDIUMTEXT NULL,
                location_block VARCHAR(180) NULL,
                capacity VARCHAR(140) NULL,
                timings VARCHAR(160) NULL,
                incharge_name VARCHAR(150) NULL,
                incharge_email VARCHAR(160) NULL,
                incharge_phone VARCHAR(60) NULL,
                image_url VARCHAR(300) DEFAULT 'assets/images/campus_facilities.jpg',
                brochure_url VARCHAR(500) NULL,
                custom_fields_json MEDIUMTEXT NULL,
                is_featured TINYINT(1) DEFAULT 0,
                is_published TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );

        // Seed Sports Portal config & initial items once (non-destructive)
        $spChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'sports_seeded_v1' LIMIT 1");
        $spChk->execute();
        if (!$spChk->fetchColumn()) {
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('sports_portal_config', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([json_encode([
                    'heroBadge'          => 'Student Life · Directorate of Physical Education & Sports',
                    'heroTitle'          => 'Athletics, Indoor Courts, Fitness & Sports Portal',
                    'heroSubtitle'       => 'Dedicated athletic grounds, indoor badminton & table-tennis arenas, university zonal championships, student medalists, and fitness schedules at SVERI Pandharpur.',
                    'directorName'       => 'Prof. R. S. Jadhav',
                    'directorTitle'      => 'Director of Physical Education & Sports',
                    'directorEmail'      => 'sports@coe.sveri.ac.in',
                    'directorPhone'      => '+91-02186-216063',
                    'gymkhanaTimings'    => '6:00 AM – 8:30 AM & 4:30 PM – 8:00 PM (Mon – Sat)',
                    'annualFlagshipName' => 'SVERI Utsav & Inter-Engineering Krida Mahotsav',
                    'customFields'       => [
                        ['label' => 'Campus Sports Area', 'value' => '8.5 Acres Dedicated Athletic Grounds'],
                        ['label' => 'Affiliated Sports Board', 'value' => 'PAHSUS Solapur & AIU Inter-University'],
                        ['label' => 'Medical & First-Aid Support', 'value' => 'On-Field Physiotherapist & Ambulance Standby'],
                    ],
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);

            if ((int)$pdo->query('SELECT COUNT(*) FROM sports_facilities')->fetchColumn() === 0) {
                $insSf = $pdo->prepare('INSERT INTO sports_facilities (name, facility_type, dimensions_or_capacity, timings, incharge_name, description, image_url, custom_fields_json, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)');
                $insSf->execute([
                    'SVERI Floodlit Cricket & 400m Athletic Stadium', 'Outdoor Ground / Track',
                    '8-Lane 400m Track · Turf Cricket Pitch', '6:00 AM – 8:00 PM', 'Prof. R. S. Jadhav',
                    'Full-size turf cricket oval surrounded by an 8-lane athletic track, long-jump pits, and pavilion seating.',
                    'assets/images/sports_complex.jpg',
                    json_encode([['label' => 'Lighting', 'value' => 'High-Mast LED Floodlights'], ['label' => 'Surface', 'value' => 'Natural Bermuda Grass']], JSON_UNESCAPED_UNICODE),
                    1, 1,
                ]);
                $insSf->execute([
                    'Indoor Wooden Badminton & Table Tennis Arena', 'Indoor Court / Hall',
                    '4 BWF-Grade Courts · 6 Stag TT Tables', '6:30 AM – 8:30 PM', 'Prof. M. V. Kulkarni',
                    'Cushioned maple-wood indoor stadium for badminton, table tennis, chess, and carrom championships.',
                    'assets/images/campus_facilities.jpg',
                    json_encode([['label' => 'Flooring', 'value' => 'Maple Wood Cushioned'], ['label' => 'Ventilation', 'value' => 'Acoustic High-Bay Exhaust']], JSON_UNESCAPED_UNICODE),
                    1, 2,
                ]);
                $insSf->execute([
                    'Multi-Station Gymnasium & Conditioning Centre', 'Fitness & Gymnasium',
                    '3,200 Sq. Ft. · 40 Student Capacity', '6:00 AM – 9:00 AM & 4:30 PM – 8:00 PM', 'Mr. S. K. Pawar (Certified Trainer)',
                    'Separate strength and cardio training zones equipped with Olympic barbells, treadmills, rowers, and wellness assessment.',
                    'assets/images/sports_complex.jpg',
                    json_encode([['label' => 'Batches', 'value' => 'Dedicated Men & Women Slots'], ['label' => 'Entry', 'value' => 'Student Smart ID Enabled']], JSON_UNESCAPED_UNICODE),
                    1, 3,
                ]);
            }
            if ((int)$pdo->query('SELECT COUNT(*) FROM sports_events')->fetchColumn() === 0) {
                $insSe = $pdo->prepare('INSERT INTO sports_events (title, event_type, discipline, event_date, venue, organizer, status, registration_url, description, banner_url, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
                $insSe->execute(['PAHSUS Solapur Inter-Collegiate Volleyball & Kabaddi Zonal Championship', 'Intercollegiate Tournament', 'Volleyball & Kabaddi', '2026-12-04', 'SVERI Outdoor Courts, Pandharpur', 'Sports Cell & PAHSUS Board', 'Registrations Open', '', '24 engineering & degree colleges competing across men and women brackets.', 'assets/images/sports_complex.jpg', 1, 1]);
                $insSe->execute(['Annual SVERI Krida Mahotsav 2026–27 & 5K Fitness Run', 'Annual Sports Meet', 'Athletics, Cricket, Badminton & Chess', '2027-01-18', 'Main Athletic Stadium & Indoor Arena', 'Student Gymkhana Council', 'Upcoming', '', 'Week-long inter-departmental championship featuring 14 indoor and outdoor sporting disciplines.', 'assets/images/sports_complex.jpg', 1, 2]);
            }
            if ((int)$pdo->query('SELECT COUNT(*) FROM sports_achievements')->fetchColumn() === 0) {
                $insSa = $pdo->prepare('INSERT INTO sports_achievements (student_or_team_name, department_code, batch_year, sport_name, level, medal_or_rank, event_name, event_date, photo_url, highlights, is_featured, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
                $insSa->execute(['Aarav Patil & SVERI Men\'s Kabaddi Squad', 'MECH', '2026', 'Kabaddi', 'State', 'Gold Medal (Champions)', 'Maharashtra State Inter-Engineering Krida Mahotsav', '2026-10-12', 'assets/images/sports_complex.jpg', 'Undefeated across 6 knockout matches against 28 autonomous engineering colleges.', 1, 1]);
                $insSa->execute(['Sneha Deshmukh', 'CSE', '2027', 'Badminton (Singles)', 'National', 'Silver Medal (Runner-Up)', 'All-India Inter-University West Zone Championship', '2026-09-22', 'assets/images/principal.jpg', 'Selected to represent PAHSUS Solapur at the All-India Inter-University Nationals.', 1, 2]);
                $insSa->execute(['Rohan Shinde', 'ENTC', '2026', '400m Hurdles Athletics', 'University', 'Gold Medal · Meet Record (52.8s)', 'PAHSUS Annual Inter-Collegiate Athletic Meet', '2026-11-01', 'assets/images/principal.jpg', 'Broke the 7-year university meet record in 400m hurdles.', 1, 3]);
            }
            if ((int)$pdo->query('SELECT COUNT(*) FROM sports_gallery')->fetchColumn() === 0) {
                $insSg = $pdo->prepare('INSERT INTO sports_gallery (title, media_type, category, media_url, thumbnail_url, event_date, caption, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?)');
                $insSg->execute(['Floodlit Athletics Stadium & Main Cricket Turf', 'Photo', 'Campus Infrastructure', 'assets/images/sports_complex.jpg', 'assets/images/sports_complex.jpg', '2026-11-05', 'Evening athletics conditioning session at Gopalpur campus.', 1, 1]);
                $insSg->execute(['Annual Krida Mahotsav Highlights & Opening March Past', 'Photo', 'Annual Sports Meet', 'assets/images/convocation.jpg', 'assets/images/convocation.jpg', '2026-10-15', 'Department contingents during the ceremonial sports parade.', 1, 2]);
            }
            if ((int)$pdo->query('SELECT COUNT(*) FROM sports_notices')->fetchColumn() === 0) {
                $insSn = $pdo->prepare('INSERT INTO sports_notices (title, notice_date, category, summary, attachment_url, registration_link, is_pinned, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?)');
                $insSn->execute(['University Zonal Selection Trials: Cricket, Basketball & Chess (Men/Women)', '2026-11-22', 'Trials & Selection', 'All eligible B.Tech & M.Tech students must report in proper sports kit with institutional ID card at 4:15 PM.', '', '', 1, 1, 1]);
                $insSn->execute(['Morning Yoga & Marathon Conditioning Registration Open for AY 2026–27', '2026-11-16', 'Fitness Schedule', 'Daily 6:15 AM sessions led by certified physical trainers; certificates issued for 80%+ attendance.', '', '', 0, 1, 2]);
            }
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('sports_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
                ->execute();
        }

        // Seed Campus Facilities Portal once (non-destructive)
        $facChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'facilities_seeded_v1' LIMIT 1");
        $facChk->execute();
        if (!$facChk->fetchColumn()) {
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('facilities_portal_config', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([json_encode([
                    'heroBadge'          => 'Institutional Infrastructure, IT & Student Support Campus',
                    'heroTitle'          => 'Campus Facilities & Infrastructure Showcase',
                    'heroSubtitle'       => 'Explore AICTE/UGC-compliant smart lecture theatres, 1 Gbps campus computing backbone, central library, hostels, research centres, green solar microgrids, and barrier-free student amenities.',
                    'customFieldPresets' => ['Area (Sq. Ft.)', 'Equipment Highlights', 'Accessibility / Divyangjan Support', 'Power & Safety Compliance', 'Booking / Access Policy'],
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);

            if ((int)$pdo->query('SELECT COUNT(*) FROM facilities')->fetchColumn() === 0) {
                $insFac = $pdo->prepare('INSERT INTO facilities (title, category, short_summary, description_html, location_block, capacity, timings, incharge_name, incharge_email, incharge_phone, image_url, brochure_url, custom_fields_json, is_featured, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
                $insFac->execute([
                    'Smart ICT Lecture Complexes & Acoustic Seminar Auditoriums', 'Infrastructural Facilities',
                    '42 ICT-enabled smart classrooms, 350-seat central auditorium, and department seminar halls with hybrid recording.',
                    '<p>Every classroom integrates short-throw 4K laser projection, podium audio, gigabit Wi-Fi 6 access, and automated lecture capture supporting OBE &amp; NEP 2020 pedagogy.</p>',
                    'Academic Wings A, B & C', '350-Seat Auditorium + 42 Classrooms', '8:00 AM – 6:30 PM',
                    'Prof. V. P. Chavan', 'infra@coe.sveri.ac.in', '+91-02186-216063',
                    'assets/images/campus_facilities.jpg', '',
                    json_encode([['label' => 'Area (Sq. Ft.)', 'value' => '68,400 Sq. Ft. Built-Up Instructional Area'], ['label' => 'Power Backup', 'value' => '320 kVA DG + 500 kWp Rooftop Solar']], JSON_UNESCAPED_UNICODE),
                    1, 1, 1,
                ]);
                $insFac->execute([
                    'Central Data Centre, High-Speed Wi-Fi 6 Campus & 1,250+ Workstations', 'IT & Computing Facilities',
                    'Dual 1 Gbps NKN/leased fibre backbone, GPU AI Cluster, licensed CAD/MATLAB suites, and campus ERP.',
                    '<p>Redundant multi-ISP fiber links serve academic blocks, hostels, and digital examination centres with enterprise firewall protection, NVIDIA CUDA AI labs, and 24x7 UPS backup.</p>',
                    'IT & Central Computing Block', '1,250 Workstations + 2.0 Gbps Redundant Link', '8:00 AM – 9:00 PM (Labs) · 24x7 Wi-Fi',
                    'Mr. A. B. Kadam (System Manager)', 'itcell@coe.sveri.ac.in', '+91-02186-216063',
                    'assets/images/hero_lab.jpg', '',
                    json_encode([['label' => 'Network Speed', 'value' => 'Dual 1 Gbps Leased Fiber'], ['label' => 'Software Stack', 'value' => 'MATLAB, ANSYS, SolidWorks, Oracle, Python/CUDA']], JSON_UNESCAPED_UNICODE),
                    1, 1, 2,
                ]);
                $insFac->execute([
                    'Residential Hostels, Hygienic Mess, Medical Clinic & Transport Fleet', 'Student Facilities',
                    'Separate boys and girls hostels for 1,600+ residents, RO drinking water, solar hot water, campus clinic, and 18 buses.',
                    '<p>Full residential care featuring reading rooms, high-speed hostel Wi-Fi, 24x7 resident rectors, on-campus ambulance &amp; medical officer, SBI ATM, and subsidized cafeteria.</p>',
                    'East & West Residential Campus', '1,650 Hostel Beds · 18 Campus Buses', '24x7 Residential Support',
                    'Dr. P. K. Deshmukh (Chief Warden)', 'hostel@coe.sveri.ac.in', '+91-9545553888',
                    'assets/images/campus_facilities.jpg', '',
                    json_encode([['label' => 'Medical Facility', 'value' => 'Daily Visiting Physician + Ambulance'], ['label' => 'Security', 'value' => '24x7 CCTV & Biometric Turnstiles']], JSON_UNESCAPED_UNICODE),
                    1, 1, 3,
                ]);
                $insFac->execute([
                    'Central Knowledge Resource Centre & 24x7 Digital Library', 'Library & Digital Resources',
                    '74,000+ print volumes, IEEE/ASME/Springer e-journals, DELNET, NPTEL video servers, and quiet reading halls.',
                    '<p>Automated Koha RFID circulation, plagiarism screening desk (Turnitin/DrillBit), book-bank scheme for reserved categories, and air-conditioned research cubicles.</p>',
                    'Knowledge Block — Ground & First Floor', '450 Reading Seats + 60 Digital Terminals', '8:00 AM – 10:00 PM (Exam Weeks till Midnight)',
                    'Mr. S. S. Kulkarni (Librarian)', 'library@coe.sveri.ac.in', '+91-02186-216063',
                    'assets/images/hero_library.jpg', '',
                    json_encode([['label' => 'E-Resources', 'value' => 'IEEE, ScienceDirect, Springer, NDLI'], ['label' => 'Circulation', 'value' => 'RFID Smart Card Self-Kiosk']], JSON_UNESCAPED_UNICODE),
                    0, 1, 4,
                ]);
                $insFac->execute([
                    '500 kWp Solar Microgrid, Rainwater Harvesting & Divyangjan Ramps', 'Green & Barrier-Free Campus',
                    'ISO 14001 green campus practices, STP water recycling, tactile paths, lifts, and wheelchair accessibility across blocks.',
                    '<p>Sustainable campus infrastructure with grid-tied solar generation, zero-liquid-discharge sewage treatment for gardens, e-waste collection tie-ups, and tactile Divyangjan signage.</p>',
                    'Across All Academic & Hostel Blocks', '500 kWp Clean Energy + 100% Barrier-Free Lifts', 'All Campus Hours',
                    'Green Audit & Estate Office', 'estate@coe.sveri.ac.in', '+91-02186-216063',
                    'assets/images/hero_campus.jpg', '',
                    json_encode([['label' => 'Green Certification', 'value' => 'NAAC Green & Energy Audited'], ['label' => 'Divyangjan Support', 'value' => 'Ramps, Lifts & Accessible Restrooms in Every Wing']], JSON_UNESCAPED_UNICODE),
                    0, 1, 5,
                ]);
            }
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('facilities_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
                ->execute();
        }

        // Seed Poster Showcase items on initial ICAEST-2026 conference if missing (non-destructive)
        try {
            $posterEmpty = (int)$pdo->query("SELECT COUNT(*) FROM conferences WHERE slug = 'icaest-2026' AND (poster_items_json IS NULL OR poster_items_json = '')")->fetchColumn();
            if ($posterEmpty > 0) {
                $defaultPosters = [
                    [
                        'id' => 'pst1',
                        'posterCode' => 'PST-101',
                        'title' => 'Edge-AI Transformer Inspection for 132kV Rural Substations',
                        'authors' => 'Pranav Kulkarni, Dr. S. R. Mane',
                        'affiliation' => 'SVCOER Pandharpur (CSE & Electrical)',
                        'track' => 'Track 1: AI & Edge Systems',
                        'abstract' => 'Lightweight quantized vision pipeline detecting bushing hotspots at 28 FPS on Jetson Orin Nano.',
                        'imageUrl' => 'assets/images/poster_session.jpg',
                        'posterPdfUrl' => '',
                        'awardNote' => 'Best Poster Nominee',
                    ],
                    [
                        'id' => 'pst2',
                        'posterCode' => 'PST-102',
                        'title' => 'Bio-Composite Phase-Change Thermal Cooling for EV Battery Packs',
                        'authors' => 'Rutuja Deshmukh, Dr. R. B. Kulkarni',
                        'affiliation' => 'SVCOER Pandharpur (Mechanical Engg.)',
                        'track' => 'Track 3: EV Powertrains & Sustainable Tech',
                        'abstract' => 'Experimental thermal runaway mitigation achieving 9.4 C peak cell drop under 2C fast discharge.',
                        'imageUrl' => 'assets/images/poster_session.jpg',
                        'posterPdfUrl' => '',
                        'awardNote' => 'Industry Jury Choice',
                    ],
                ];
                $pdo->prepare("UPDATE conferences SET enable_poster_presentation = 1, poster_dimensions = 'A0 Portrait (841 x 1189 mm)', poster_guidelines_html = ?, poster_prizes_text = 'Best Poster Awards: INR 10,000 + Certificates per Track', poster_items_json = ? WHERE slug = 'icaest-2026' AND (poster_items_json IS NULL OR poster_items_json = '')")
                    ->execute([
                        '<p>Authors selected for the <strong>Poster Presentation &amp; Prototype Demo Track</strong> must prepare an A0 vertical poster (841 &times; 1189 mm) highlighting problem statement, methodology, experimental metrics, and key conclusions. Print display boards and easels are provided in the SVERI Exhibition Atrium.</p>',
                        json_encode($defaultPosters, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]);
            }
        } catch (Throwable $ignoredPosters) {
        }

        // Schema v8: Pages parity + Social Media + Research Portfolio + Stakeholder Feedback & Email Push (non-destructive)
        foreach ([
            "ALTER TABLE pages ADD COLUMN meta_description VARCHAR(320) DEFAULT '' AFTER content_html",
            "ALTER TABLE pages ADD COLUMN show_share_bar TINYINT(1) DEFAULT 1 AFTER is_published",
        ] as $pgAlter) {
            try {
                $pdo->exec($pgAlter);
            } catch (Throwable $ignoredCol) {
            }
        }

        // Backfill all 17 missing UGC & Research micro-pages safely once (fixes Research subpages 404 after Webmin import)
        $pgParityChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'pages_parity_seeded_v2' LIMIT 1");
        $pgParityChk->execute();
        if (!$pgParityChk->fetchColumn()) {
            try {
                $insMissingPage = $pdo->prepare(
                    'INSERT IGNORE INTO pages (category_id, slug, title, subtitle, content_html, is_published, sort_order, updated_at) VALUES (?,?,?,?,?,?,?,?)'
                );
                $missingPagesSeed = [
                    [1, 'affiliating-university', 'Constituent Units & Affiliating University', 'UGC Section 5(a) · University Affiliation & Campus Units', '<h2>Affiliating University</h2><p>All undergraduate, postgraduate, and doctoral degrees are awarded by <strong>Punyashlok Ahilyadevi Holkar Solapur University (PAHSUS), Solapur</strong>, with autonomous curriculum design, continuous internal assessment, and end-semester examinations conducted by SVCOER.</p><h2>Sister &amp; Constituent Academic Units</h2><ul><li>Shri Vithal College of Engineering &amp; Research (Autonomous), Pandharpur — Main Campus</li><li>SVCOER Polytechnic Wing (Diploma in Engineering — MSBTE Affiliated)</li><li>Centre for Executive Management &amp; Innovation Studies (CEMIS)</li></ul>', 1, 4, '2026-08-18'],
                    [1, 'recognition-approval', 'Recognition & Regulatory Approvals (UGC 2(f), 12B, AICTE)', 'UGC Section 5(a) · Statutory Extensions of Approval', '<h2>Regulatory Approvals</h2><p>SVERI&rsquo;s College of Engineering, Pandharpur holds continuous statutory approvals from all apex regulatory bodies:</p><ul><li><strong>UGC 2(f), 12(B) &amp; Autonomous Status:</strong> Conferred Autonomous Status effective from AY 2024&ndash;25 under Punyashlok Ahilyadevi Holkar Solapur University, Solapur.</li><li><strong>AICTE Approval:</strong> Approved by All India Council for Technical Education (AICTE), New Delhi (Permanent ID: 1-49281724).</li><li><strong>Government of Maharashtra &amp; DTE:</strong> DTE Institute Code <strong>06220</strong>.</li></ul>', 1, 6, '2026-09-12'],
                    [1, 'annual-reports', 'Annual Reports', 'UGC Section 5(a) · Yearly Academic, Research & Governance Reports', '<h2>Published Institutional Annual Reports</h2><p>In compliance with UGC Public Self-Disclosure norms, complete institutional annual reports detailing admissions, examination outcomes, faculty publications, placement records, and extension activities are published openly below:</p><table><thead><tr><th>Academic Year</th><th>Document Title</th><th>Approval Date</th></tr></thead><tbody><tr><td>2025–26</td><td>28th Institutional Annual Report (IQAC Verified)</td><td>2026-08-20</td></tr><tr><td>2024–25</td><td>27th Institutional Annual Report</td><td>2025-08-18</td></tr><tr><td>2023–24</td><td>26th Institutional Annual Report</td><td>2024-08-14</td></tr></tbody></table>', 1, 7, '2026-08-25'],
                    [1, 'sponsoring-body', 'Sponsoring Body Details', 'UGC Section 5(a) · Shri Vitthal Education & Research Institute (SVERI)', '<h2>Shri Vitthal Education &amp; Research Institute (SVERI)</h2><p>Established as a charitable educational trust, <strong>Shri Vitthal Education &amp; Research Institute (SVERI)</strong> founded its flagship Engineering College in 1998 to deliver accessible, high-calibre technical and management education rooted in innovation and ethics.</p><p><strong>Registered Office:</strong> Gopalpur-Ranjani Road, P.B. No. 54, Gopalpur, Pandharpur &ndash; 413304, Dist. Solapur, Maharashtra · Tel: +91-02186-216063.</p>', 1, 9, '2026-07-15'],
                    [2, 'internal-complaint-committee', 'Internal Complaint Committee (ICC)', 'UGC Section 5(b) & 5(f) · POSH Act Compliance & Zero-Tolerance Mechanism', '<h2>Internal Complaint Committee (ICC)</h2><p>Constituted under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 and UGC Regulations 2015:</p><table><thead><tr><th>Name</th><th>Designation</th><th>Role in ICC</th><th>Contact</th></tr></thead><tbody><tr><td>Dr. Meenakshi S. Pawar</td><td>Professor &amp; Dean Student Affairs</td><td>Presiding Officer</td><td>icc@svcoer.edu.in</td></tr><tr><td>Prof. Snehal R. Jadhav</td><td>Associate Professor, E&amp;TC</td><td>Faculty Member</td><td>+91 2186 225088</td></tr><tr><td>Adv. Vandana Kulkarni</td><td>District Legal Services Authority</td><td>External NGO / Legal Member</td><td>legal.icc@svcoer.edu.in</td></tr><tr><td>Ms. Rutuja Bhosale</td><td>Final Year B.Tech CSE</td><td>Student Representative</td><td>icc.student@svcoer.edu.in</td></tr></tbody></table>', 1, 3, '2026-09-14'],
                    [3, 'academic-calendar', 'Academic Calendar (2026–27)', 'UGC Section 5(c) · Semester Schedule, Examinations & Co-Curricular Dates', '<h2>Odd &amp; Even Semester Schedule (AY 2026–27)</h2><table><thead><tr><th>Academic Milestone</th><th>Odd Semester</th><th>Even Semester</th></tr></thead><tbody><tr><td>Commencement of Classes</td><td>15 July 2026</td><td>05 January 2027</td></tr><tr><td>In-Semester Evaluation (ISE-I)</td><td>07–12 September 2026</td><td>22–27 February 2027</td></tr><tr><td>End-Semester Theory Examinations</td><td>18 Nov – 05 Dec 2026</td><td>03–22 May 2027</td></tr><tr><td>Declaration of Results</td><td>22 December 2026</td><td>08 June 2027</td></tr></tbody></table>', 1, 2, '2026-07-02'],
                    [3, 'academic-statutes', 'Academic & Examination Ordinances', 'UGC Section 5(c) · Credit Framework, Grading System & ABC Guidelines', '<h2>Autonomous Examination &amp; Grading Ordinances</h2><p>SVCOER follows a 160-credit Outcome-Based Education (OBE) curriculum integrated with the National Credit Framework (NCrF) and Academic Bank of Credits (ABC). Continuous evaluation accounts for 40% weightage and End-Semester Examinations account for 60%.</p>', 1, 3, '2026-08-10'],
                    [3, 'central-library', 'Central Library & Digital Knowledge Centre', 'UGC Section 5(c) · Print Volumes, IEEE/Springer Access & 24x7 Reading Hall', '<h2>Library Resources at a Glance</h2><table><thead><tr><th>Resource Category</th><th>Holding / Subscription</th></tr></thead><tbody><tr><td>Total Print Volumes</td><td>68,450 Books (14,200+ Titles)</td></tr><tr><td>E-Journals &amp; Databases</td><td>IEEE Xplore, SpringerLink, ASME, Elsevier ScienceDirect, DELNET</td></tr><tr><td>Seating Capacity</td><td>450 Seats (Air-conditioned Digital &amp; Reference Halls)</td></tr><tr><td>Library Automation</td><td>KOHA Integrated LMS with RFID Self-Check-In</td></tr></tbody></table>', 1, 5, '2026-08-30'],
                    [3, 'odl-online-programs', 'UGC-Recognized ODL / Online & Swayam-NPTEL Courses', 'UGC Section 5(c) · Credit Transfer & MOOC Integration', '<h2>ODL &amp; Online Learning Compliance</h2><p>SVCOER currently offers full-time on-campus regular degree programs and does not run standalone ODL degree programs. However, up to 40% credit transfer is facilitated via <strong>SWAYAM-NPTEL</strong> Local Chapter (rated AA National Top 50) under UGC Credit Framework for Online Learning Courses.</p>', 1, 6, '2026-08-19'],
                    [3, 'academic-collaborations', 'Academic & Industry Collaborations (MoUs)', 'UGC Section 5(c) & 5(e) · Active Domestic & International Partnerships', '<h2>Active Academic MoUs</h2><table><thead><tr><th>Partner Institution / Industry</th><th>Scope of Collaboration</th><th>Valid Until</th></tr></thead><tbody><tr><td>IIT Bombay (FOSSEE &amp; Spoken Tutorial)</td><td>Open-Source Robotics &amp; Faculty FDP</td><td>2028</td></tr><tr><td>Tata Technologies Ltd.</td><td>Centre for Invention, Innovation &amp; Incubation (CIII)</td><td>2029</td></tr><tr><td>TU Dresden, Germany (Summer Exchange)</td><td>Sustainable Manufacturing Student Exchange</td><td>2027</td></tr><tr><td>Persistent Systems &amp; Zensar</td><td>Industry-Certified Cloud &amp; AI Electives</td><td>2028</td></tr></tbody></table>', 1, 7, '2026-09-18'],
                    [4, 'admission-process', 'Admission Process & Eligibility Guidelines', 'UGC Section 5(d) · CAP Centralized Admissions & Institute Level Quota', '<h2>Admission Procedure</h2><p>Admissions to First Year B.Tech and Direct Second Year (Lateral Entry) are conducted transparently through the Centralized Admission Process (CAP) of the State CET Cell, Government of Maharashtra, based on MHT-CET / JEE (Main) merit.</p><ul><li><strong>Step 1:</strong> Register on Maharashtra State CET Cell CAP Portal (DTE Code: 06220).</li><li><strong>Step 2:</strong> Document Verification at Scrutiny Centre &amp; Option Form submission.</li><li><strong>Step 3:</strong> Seat Allotment confirmation &amp; reporting at SVERI Admission Cell with original certificates.</li></ul>', 1, 2, '2026-09-01'],
                    [5, 'incubation-cell', 'Incubation Centre, Start-ups & IIC Cell', 'UGC Section 5(e) · SVCOER Technology Business Incubator (TBI)', '<h2>Entrepreneurship &amp; Start-up Ecosystem</h2><p>Recognized with a <strong>4-Star Rating by MoE\'s Innovation Cell (IIC)</strong>, the SVCOER Technology Business Incubator provides seed funding up to INR 5 Lakhs, co-working prototyping labs, and IP filing support. Over 18 student-led start-ups have been incubated since 2021.</p>', 1, 2, '2026-09-05'],
                    [5, 'central-facilities', 'Central Research & Computing Facilities', 'UGC Section 5(e) · HPC GPU Cluster, Material Testing & Central Workshop', '<h2>Central Instrumentation &amp; Shared Labs</h2><ul><li><strong>NVIDIA DGX / High-Performance Computing Node:</strong> 4x A100 GPUs for Deep Learning &amp; CFD simulations.</li><li><strong>Central Material Testing Laboratory:</strong> 1000 kN Universal Testing Machine &amp; Scanning Electron Microscope access.</li><li><strong>FabLab &amp; Rapid Prototyping Studio:</strong> Industrial 3D Printers, Laser Cutters &amp; PCB Milling.</li></ul>', 1, 3, '2026-08-29'],
                    [5, 'conferences-workshops-events', 'National & International Conferences, Workshops & Symposia', 'UGC Section 5(e) · Dedicated Microsites, Call for Papers, Keynotes & Research Events', '<div class="cms-block cms-slider" data-block="custom-slider" data-autoplay="5" data-height="380"><div class="cms-slider-viewport" style="height:380px;"><div class="cms-slide is-active" data-slide-index="0"><img src="assets/images/hero_campus.jpg" alt="ICAEST-2026: International Conference on Smart Technology" /><div class="cms-slide-overlay"><h3 class="cms-slide-title">ICAEST-2026: International Conference on Smart Technology</h3><p class="cms-slide-caption">Annual Flagship International Conference with IEEE/Springer proceedings and hybrid tracks.</p><p class="cms-slide-cta-row"><a class="cms-btn cms-btn-amber cms-slide-cta" href="conference.php?slug=icaest-2026">Open ICAEST-2026 Microsite</a></p></div></div><div class="cms-slide" data-slide-index="1"><img src="assets/images/hero_lab.jpg" alt="National Workshops, FDPs &amp; Edge AI Symposia" /><div class="cms-slide-overlay"><h3 class="cms-slide-title">National Workshops, FDPs &amp; Edge AI Symposia</h3><p class="cms-slide-caption">Hands-on research workshops, STTPs, and patent filing clinics hosted year-round.</p><p class="cms-slide-cta-row"><a class="cms-btn cms-btn-amber cms-slide-cta" href="conferences.php">Browse All Programs</a></p></div></div></div><button type="button" class="cms-slider-prev" aria-label="Previous slide">&#8249;</button><button type="button" class="cms-slider-next" aria-label="Next slide">&#8250;</button><div class="cms-slider-dots"><button type="button" class="cms-slider-dot is-active" data-slide-to="0" aria-label="Go to slide 1"></button><button type="button" class="cms-slider-dot" data-slide-to="1" aria-label="Go to slide 2"></button></div></div><p></p><h2>Academic Conferences, Workshops &amp; Technical Events</h2><p>SVCOER regularly hosts National &amp; International Conferences, AICTE/ISTE Faculty Development Programs (FDPs), Research Workshops, and Technical Symposia. Use the interactive portals below to inspect tracks, schedules, organizing committee profiles, or submit manuscripts online.</p>', 1, 4, '2026-11-12'],
                    [6, 'sports-ncc-nss', 'Sports Facilities, NCC, NSS & Hostels', 'UGC Section 5(f) · Athletics, Community Service & Residential Campus', '<h2>Sports, NCC/NSS &amp; Residential Facilities</h2><ul><li><strong>Sports Complex:</strong> 400m synthetic athletic track, floodlit basketball/volleyball courts, cricket ground, and indoor badminton stadium.</li><li><strong>NCC &amp; NSS:</strong> 200-cadet NCC Army Wing Unit and 250-volunteer NSS Unit conducting annual rural water-conservation camps.</li><li><strong>Hostels:</strong> Separate Boys (650 beds) &amp; Girls (480 beds) hostels with solar hot water, Wi-Fi, and hygienic dining halls.</li><li><strong>Health Centre:</strong> 10-bed campus clinic with resident medical officer and 24x7 ambulance.</li></ul>', 1, 4, '2026-08-12'],
                    [6, 'equal-opportunity-sedg-barrier-free', 'Equal Opportunity, SEDG Cell & Barrier-Free Campus', 'UGC Section 5(f) · Divyangjan Accessibility & Inclusive Support Systems', '<h2>Inclusivity &amp; Accessibility Commitment</h2><ul><li><strong>Equal Opportunity &amp; SC/ST/OBC Cell:</strong> Facilitates post-matric scholarships, remedial coaching, and competitive exam mentorship.</li><li><strong>Socio-Economically Disadvantaged Groups (SEDG) Cell:</strong> Implements NEP 2020 equity initiatives, earn-while-learn schemes, and book-bank grants.</li><li><strong>Facilities for Differently-Abled (Divyangjan):</strong> Ramps with railings across all academic blocks, elevators in every building, tactile paving, accessible washrooms, and screen-reader equipped library workstations.</li></ul>', 1, 5, '2026-09-03'],
                    [8, 'reservation-roster-study-india', 'Reservation Roster & Study in India (International Cell)', 'UGC Section 5(h) · Statutory Roster & International Student Admissions', '<h2>Reservation Roster Compliance</h2><p>Faculty recruitment and student admissions strictly adhere to the Government of Maharashtra &amp; UGC Reservation Roster norms (SC, ST, VJNT, OBC, EWS, and PwD categories). Verified annual roster statements are published in the Document Center.</p><h2>Study in India &amp; International Students Cell</h2><p>SVCOER is registered on the Government of India <strong>Study in India (SII)</strong> portal with dedicated hostel wing, FRRO visa assistance, English bridge modules, and cultural orientation for international scholars.</p>', 1, 3, '2026-09-20'],
                ];
                foreach ($missingPagesSeed as $mp) {
                    $insMissingPage->execute($mp);
                }
            } catch (Throwable $ignoredParity) {
            }
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('pages_parity_seeded_v2', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
                ->execute();
        }

        // Social Media Links table & default seed
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS social_media_links (
                id INT AUTO_INCREMENT PRIMARY KEY,
                platform VARCHAR(40) NOT NULL DEFAULT 'custom',
                label VARCHAR(80) NOT NULL,
                url VARCHAR(500) NOT NULL,
                handle VARCHAR(120) DEFAULT '',
                custom_svg TEXT NULL,
                is_active TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $socChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'social_seeded_v1' LIMIT 1");
        $socChk->execute();
        if (!$socChk->fetchColumn()) {
            if ((int)$pdo->query('SELECT COUNT(*) FROM social_media_links')->fetchColumn() === 0) {
                $insSoc = $pdo->prepare('INSERT INTO social_media_links (platform, label, url, handle, is_active, sort_order) VALUES (?,?,?,?,?,?)');
                foreach (defaultSocialMediaLinks() as $sl) {
                    $insSoc->execute([$sl['platform'], $sl['label'], $sl['url'], $sl['handle'], $sl['is_active'], $sl['sort_order']]);
                }
            }
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('social_sharing_config', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([json_encode(defaultSocialSharingConfig(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('social_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")->execute();
        }

        // Research Projects & Patents/Publications/MoUs tables + seed
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS research_projects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(280) NOT NULL,
                funding_agency VARCHAR(180) NOT NULL,
                principal_investigator VARCHAR(160) NOT NULL,
                co_investigator VARCHAR(200) DEFAULT '',
                department_code VARCHAR(32) NOT NULL DEFAULT 'ALL',
                grant_amount_lakhs VARCHAR(80) DEFAULT '',
                sanction_year VARCHAR(30) DEFAULT '2025-26',
                duration VARCHAR(80) DEFAULT '24 Months',
                status ENUM('Ongoing','Completed','Sanctioned','Submitted') DEFAULT 'Ongoing',
                project_code VARCHAR(120) DEFAULT '',
                summary TEXT NULL,
                document_url VARCHAR(500) DEFAULT '',
                is_published TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS research_patents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                item_type VARCHAR(80) NOT NULL DEFAULT 'Patent Granted',
                title VARCHAR(280) NOT NULL,
                inventors_or_lead VARCHAR(240) NOT NULL,
                department_code VARCHAR(32) NOT NULL DEFAULT 'ALL',
                reference_number VARCHAR(140) DEFAULT '',
                filing_or_grant_date VARCHAR(40) DEFAULT '',
                status VARCHAR(120) DEFAULT '',
                partner_or_agency VARCHAR(180) DEFAULT '',
                summary TEXT NULL,
                external_url VARCHAR(500) DEFAULT '',
                is_published TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $resChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'research_portfolio_seeded_v1' LIMIT 1");
        $resChk->execute();
        if (!$resChk->fetchColumn()) {
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('research_portfolio_config', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([json_encode(defaultResearchPortfolioConfig(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
            if ((int)$pdo->query('SELECT COUNT(*) FROM research_projects')->fetchColumn() === 0) {
                $insRp = $pdo->prepare('INSERT INTO research_projects (title, funding_agency, principal_investigator, co_investigator, department_code, grant_amount_lakhs, sanction_year, duration, status, project_code, summary, document_url, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
                $insRp->execute(['AI-Assisted Solar Microgrid Fault Prediction & Edge Relay Controller for Rural Feeders', 'DST-SERB (Govt. of India)', 'Dr. M. R. Joshi', 'Dr. A. K. Kulkarni', 'ELEC', 'Rs. 28.50 Lakhs', '2025-26', '36 Months (Ongoing)', 'Ongoing', 'SERB/CRG/2025/001942', 'Edge-deployed TinyML relay controller protecting rural 11 kV solar feeders with sub-cycle harmonic isolation.', 'quick-links.php', 1, 1]);
                $insRp->execute(['Modernization of Autonomous GPU & Embedded Vision Research Laboratory (MODROBS)', 'AICTE-MODROBS / RPS', 'Dr. Anjali K. Deshpande', 'Dr. Siddharth R. Mane', 'CSE', 'Rs. 19.40 Lakhs', '2024-25', '24 Months (Completed)', 'Completed', 'AICTE/MODROBS/2024/CSE-118', 'Established high-throughput NVIDIA A5000 compute nodes and ROS-2 edge camera rigs for M.Tech/Ph.D. scholars.', 'quick-links.php', 1, 2]);
                $insRp->execute(['Autonomous Precision Cotton-Pod Harvester Mechanism for Smallholder Farmers', 'RGSTC Maharashtra', 'Dr. Rajendra B. Kulkarni', 'Prof. P. S. Sawant', 'MECH', 'Rs. 16.25 Lakhs', '2025-26', '24 Months (Ongoing)', 'Ongoing', 'RGSTC/SOL/2025/AGRI-44', 'Vision-guided pneumatic picker head tested across Solapur district agrarian clusters.', '', 1, 3]);
                $insRp->execute(['RISC-V Hardware Cryptography Co-Processor for Low-Power Industrial IoT Nodes', 'DRDO / ISRO Extramural', 'Dr. Vandana P. Chavan', 'Dr. R. B. Patwardhan', 'ENTC', 'Rs. 24.80 Lakhs', '2026-27', '30 Months (Sanctioned)', 'Sanctioned', 'ERIPR/DFT/2026/VLSI-09', 'Side-channel resistant AES-GCM hardware macro taped out in 45nm CMOS node.', '', 1, 4]);
                $insRp->execute(['High-Early-Strength Sugarcane Bagasse Ash Geopolymer Concrete for Canal Linings', 'MSME Design Clinic', 'Dr. Suhas V. Patwardhan', 'Prof. V. M. Jadhav', 'CIVIL', 'Rs. 11.60 Lakhs', '2024-25', '18 Months (Completed)', 'Completed', 'MSME/DC/2024/MAT-72', 'Reduced cement carbon footprint by 48% while meeting M40 sulfate resistance benchmarks.', '', 1, 5]);
            }
            if ((int)$pdo->query('SELECT COUNT(*) FROM research_patents')->fetchColumn() === 0) {
                $insRi = $pdo->prepare('INSERT INTO research_patents (item_type, title, inventors_or_lead, department_code, reference_number, filing_or_grant_date, status, partner_or_agency, summary, external_url, is_published, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
                $insRi->execute(['Patent Granted', 'Smart Self-Calibrating Soil Moisture & NPK Drip Fertigation Controller', 'Dr. Vandana P. Chavan, Prof. P. S. Sawant, S. R. Mane', 'ENTC', 'IN-PAT-518942', '2026-03-14', 'Granted (20 Years)', 'Indian Patent Office, Mumbai', 'Autonomous closed-loop valve telemetry reducing sugarcane water consumption by 34%.', '', 1, 1]);
                $insRi->execute(['Patent Granted', 'Regenerative Eddy-Current Braking Actuator for Light Electric Three-Wheelers', 'Dr. Rajendra B. Kulkarni, Dr. M. R. Joshi', 'MECH', 'IN-PAT-492107', '2025-11-22', 'Granted', 'Indian Patent Office', 'Compact dual-stator auxiliary retarder recovering up to 14% kinetic energy on gradients.', '', 1, 2]);
                $insRi->execute(['Patent Published', 'Federated Privacy-Preserving Medical MRI Triage Appliance on Edge TPU', 'Dr. Anjali K. Deshpande, Dr. Siddharth R. Mane', 'CSE', 'APP-202621018442', '2026-06-19', 'Published · FER Under Examination', 'Journal of the Patent Office', 'Enables district hospitals to train diagnostic models without exporting patient DICOM records.', '', 1, 3]);
                $insRi->execute(['Incubated Start-up', 'KrishiPulse Agro-Robotics Pvt. Ltd. (SVERI-IIC Cohort 2026)', 'Rohan Patil (B.Tech Mech), Pranav Deshmukh (CSE)', 'MECH', 'CIN-U29200PN2026PTC', '2026-02-05', 'MSME Seed Funded (Rs. 15 Lakhs)', 'SVERI IIC & AICTE IDEA Lab', 'Commercializing solar-powered inter-row weeders for pomegranate and grape orchards across Solapur.', '', 1, 4]);
                $insRi->execute(['Industry Consultancy', 'Non-Destructive Structural Audit & Mix-Design Testing for Pandharpur PWD Division', 'Dr. Suhas V. Patwardhan & Civil Testing Cell', 'CIVIL', 'SVCOER/CON/2026/114', '2026-08-11', 'Rs. 9.80 Lakhs Consultancy Realized', 'Public Works Department, Solapur', 'NABL-calibrated Rebound Hammer, Ultrasonic Pulse Velocity, and core strength certification.', '', 1, 5]);
                $insRi->execute(['Journal / Conference Publication', 'Sub-Cycle Harmonic Protection for Solar-Integrated Rural Microgrids using Edge TinyML', 'Dr. M. R. Joshi, Dr. A. K. Kulkarni', 'ELEC', 'IEEE Trans. Ind. Appl. (SCI Q1)', '2026-05-18', 'Published (SCIE / Scopus Q1 · IF 4.4)', 'IEEE Industry Applications Society', 'Demonstrated 98.6% arc-fault detection accuracy under 4ms latency on ARM Cortex-M7 relay hardware.', 'https://ieeexplore.ieee.org/', 1, 6]);
                $insRi->execute(['Industry / Academic MoU', 'Center of Excellence in Industrial Robotics, Digital Twin & Smart Manufacturing', 'Dr. Rajendra B. Kulkarni & Tata Technologies CIII Team', 'MECH', 'MOU/SVCOER/TTL/2025-08', '2025-09-10', 'Active Collaboration (5 Years)', 'Tata Technologies & Dassault Systemes', 'Joint certified training tracks, live industrial capstone projects, and sponsored EV & cobot workstations.', '', 1, 7]);
            }
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('research_portfolio_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")->execute();
        }

        // Feedback Sections, Tickets & Email Dispatch Audit Logs
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS feedback_sections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                slug VARCHAR(80) NOT NULL UNIQUE,
                section_name VARCHAR(160) NOT NULL,
                subsections_json TEXT NULL,
                recipient_emails VARCHAR(400) NOT NULL,
                cc_emails VARCHAR(400) DEFAULT '',
                incharge_name VARCHAR(160) DEFAULT '',
                incharge_designation VARCHAR(160) DEFAULT '',
                sla_days INT DEFAULT 5,
                auto_email_enabled TINYINT(1) DEFAULT 1,
                is_active TINYINT(1) DEFAULT 1,
                sort_order INT DEFAULT 1
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS feedback_entries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tracking_code VARCHAR(40) NOT NULL UNIQUE,
                section_id INT NOT NULL DEFAULT 1,
                section_name VARCHAR(160) NOT NULL,
                subsection VARCHAR(180) DEFAULT 'General',
                submission_type ENUM('Complaint','Suggestion','Appreciation','Service Request') DEFAULT 'Suggestion',
                stakeholder_role VARCHAR(100) NOT NULL DEFAULT 'Student',
                sender_name VARCHAR(160) NOT NULL,
                sender_email VARCHAR(160) NOT NULL,
                sender_phone VARCHAR(60) DEFAULT '',
                department_or_batch VARCHAR(120) DEFAULT '',
                rating TINYINT UNSIGNED DEFAULT 5,
                subject VARCHAR(240) NOT NULL,
                message TEXT NOT NULL,
                is_anonymous TINYINT(1) DEFAULT 0,
                attachment_url VARCHAR(300) DEFAULT '',
                routed_to_emails VARCHAR(400) DEFAULT '',
                email_dispatch_status ENUM('sent','queued','disabled','failed') DEFAULT 'queued',
                email_dispatch_detail VARCHAR(400) DEFAULT '',
                status ENUM('New','Acknowledged','In Progress','Resolved','Closed') DEFAULT 'New',
                action_taken_note TEXT NULL,
                submitted_at VARCHAR(32) NOT NULL,
                updated_at VARCHAR(32) NOT NULL
            ) ENGINE=InnoDB"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS email_dispatch_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category VARCHAR(80) NOT NULL,
                recipients VARCHAR(500) NOT NULL,
                subject VARCHAR(260) NOT NULL,
                transport_mode VARCHAR(32) DEFAULT 'php_mail',
                status ENUM('sent','queued','failed') DEFAULT 'queued',
                detail VARCHAR(480) DEFAULT '',
                sent_at VARCHAR(32) NOT NULL
            ) ENGINE=InnoDB"
        );
        $fbChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'feedback_seeded_v1' LIMIT 1");
        $fbChk->execute();
        if (!$fbChk->fetchColumn()) {
            if ((int)$pdo->query('SELECT COUNT(*) FROM feedback_sections')->fetchColumn() === 0) {
                $insFb = $pdo->prepare('INSERT IGNORE INTO feedback_sections (slug, section_name, subsections_json, recipient_emails, cc_emails, incharge_name, incharge_designation, sla_days, auto_email_enabled, is_active, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
                foreach (defaultFeedbackSections() as $fs) {
                    $insFb->execute([
                        $fs['slug'], $fs['section_name'], json_encode($fs['subsections'], JSON_UNESCAPED_UNICODE),
                        $fs['recipient_emails'], $fs['cc_emails'], $fs['incharge_name'], $fs['incharge_designation'],
                        $fs['sla_days'], $fs['auto_email_enabled'], $fs['is_active'], $fs['sort_order'],
                    ]);
                }
            }
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('feedback_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")->execute();
        }

        // Ensure Feedback appears cleanly in saved portal_menu_items even on already-seeded DBs
        try {
            $pmRaw = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'portal_menu_items' LIMIT 1")->fetchColumn();
            if (is_string($pmRaw) && $pmRaw !== '') {
                $pmArr = json_decode($pmRaw, true);
                if (is_array($pmArr)) {
                    $hasFb = false;
                    foreach ($pmArr as $pmRow) {
                        if (($pmRow['id'] ?? '') === 'feedback') {
                            $hasFb = true;
                            break;
                        }
                    }
                    if (!$hasFb) {
                        $pmArr[] = ['id' => 'feedback', 'label' => 'Feedback Cell', 'href' => 'feedback.php', 'menuLocation' => 'more', 'sortOrder' => 5, 'isSystem' => true, 'openInNewTab' => false];
                        savePortalMenuItems($pdo, $pmArr);
                    }
                }
            }
        } catch (Throwable $ignoredPm) {
        }

        // Schema v10: Super Admin Content Approval Workflow + 3-Level Social Share Control
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS content_pending_revisions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                entity_table VARCHAR(64) NOT NULL,
                entity_id INT NULL,
                action_type ENUM('create','update','delete') NOT NULL,
                entity_title VARCHAR(260) NOT NULL,
                current_snapshot_json LONGTEXT NULL,
                proposed_payload_json LONGTEXT NULL,
                submitted_by_user_id INT NULL,
                submitted_by_name VARCHAR(160) NOT NULL DEFAULT '',
                submitted_by_email VARCHAR(160) NOT NULL DEFAULT '',
                submitted_by_role VARCHAR(64) NOT NULL DEFAULT 'content_editor',
                status ENUM('pending_approval','approved','rejected') NOT NULL DEFAULT 'pending_approval',
                reviewer_email VARCHAR(160) NULL,
                reviewer_note TEXT NULL,
                submitted_at VARCHAR(40) NOT NULL,
                reviewed_at VARCHAR(40) NULL,
                INDEX idx_cpr_status (status),
                INDEX idx_cpr_table (entity_table)
            ) ENGINE=InnoDB"
        );

        foreach ([
            "ALTER TABLE pages ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1 AFTER show_share_bar",
            "ALTER TABLE pages ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published' AFTER is_published",
            "ALTER TABLE departments ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE departments ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE department_subpages ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE department_subpages ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE conferences ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE conferences ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE sliders ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE ticker_items ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE campus_events ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE campus_events ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE documents ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE gallery_albums ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE leadership_profiles ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE telephone_directory ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE custom_home_components ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE placement_stats ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE placement_stories ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE placement_stories ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE placement_notices ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE placement_notices ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE placement_custom_sections ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE research_projects ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE research_projects ADD COLUMN moderation_status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE research_patents ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE research_patents ADD COLUMN moderation_status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE sports_facilities ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE sports_events ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE sports_events ADD COLUMN moderation_status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE sports_achievements ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE sports_gallery ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE sports_notices ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
            "ALTER TABLE facilities ADD COLUMN is_shareable TINYINT(1) NOT NULL DEFAULT 1",
            "ALTER TABLE facilities ADD COLUMN status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'",
        ] as $v10Alter) {
            try {
                $pdo->exec($v10Alter);
            } catch (Throwable $ignoredV10) {
            }
        }

        try {
            $syncChk = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'shareable_synced_v1' LIMIT 1")->fetchColumn();
            if (!$syncChk) {
                $pdo->exec("UPDATE pages SET is_shareable = COALESCE(show_share_bar, 1)");
                $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('shareable_synced_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")->execute();
            }
        } catch (Throwable $ignoredShareSync) {
        }

        // Analytics, SEO, Hit Counter & Security WAF tables + firewall execution
        if (function_exists('ensureAnalyticsTables')) {
            ensureAnalyticsTables($pdo);
        }
        if (function_exists('runPhpSecurityFirewall')) {
            runPhpSecurityFirewall($pdo);
        }
        if (function_exists('cms_maybe_run_scheduled_digest')) {
            cms_maybe_run_scheduled_digest($pdo);
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
        'alumni_achievers',
        'conferences',
        'placement_stats',
        'placement_stories',
        'placement_notices',
        'placement_custom_sections',
        'sports_facilities',
        'sports_events',
        'sports_achievements',
        'sports_gallery',
        'sports_notices',
        'facilities',
        'social_media_links',
        'research_projects',
        'research_patents',
        'feedback_sections',
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

