<?php
declare(strict_types=1);

/**
 * Secure PDO Database Connection & Site Configuration
 * Deployable on Linux Webmin/Virtualmin, LAMP, cPanel & XAMPP (PHP 8.x & MySQL 8.x)
 */
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

if (!defined('DB_HOST')) {
    define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
}
if (!defined('DB_NAME')) {
    define('DB_NAME', getenv('DB_NAME') ?: 'svcoer_ugc_cms');
}
if (!defined('DB_USER')) {
    define('DB_USER', getenv('DB_USER') ?: 'root');
}
if (!defined('DB_PASS')) {
    define('DB_PASS', getenv('DB_PASS') ?: '');
}
if (!defined('DB_CHARSET')) {
    define('DB_CHARSET', 'utf8mb4');
}
if (!defined('BASE_URL')) {
    define('BASE_URL', getenv('BASE_URL') ?: '');
}

/**
 * Returns the base web path or configured BASE_URL (without trailing slash).
 * Automatically handles domain roots, Ubuntu Webmin VirtualHosts, and Windows XAMPP subfolders.
 */
function getBaseUrl(): string
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $configured = trim((string)BASE_URL);
    if ($configured !== '') {
        $cached = rtrim($configured, '/');
        return $cached;
    }

    // 1. Prefer SCRIPT_NAME when executing inside /admin/ or root .php entrypoints (reliable under Apache Alias & symlinks)
    $scriptName = str_replace('\\', '/', (string)($_SERVER['SCRIPT_NAME'] ?? ''));
    if ($scriptName !== '' && $scriptName[0] === '/') {
        $dir = rtrim(dirname($scriptName), '/');
        if ($dir === '/admin' || substr($dir, -6) === '/admin') {
            $dir = substr($dir, 0, -6);
            $cached = ($dir === '' || $dir === '/' || $dir === '.') ? '' : $dir;
            return $cached;
        }
        // Root-level scripts (index.php, page.php, setup.php, etc.)
        $scriptBase = basename($scriptName);
        if (file_exists(__DIR__ . '/../' . $scriptBase)) {
            $cached = ($dir === '/' || $dir === '.') ? '' : $dir;
            return $cached;
        }
    }

    // 2. Fallback: compare app directory against DOCUMENT_ROOT (case-insensitive on Windows XAMPP)
    $appRoot = realpath(__DIR__ . '/..');
    $docRoot = !empty($_SERVER['DOCUMENT_ROOT']) ? realpath((string)$_SERVER['DOCUMENT_ROOT']) : false;
    if ($appRoot !== false && $docRoot !== false) {
        $normApp = str_replace('\\', '/', $appRoot);
        $normDoc = rtrim(str_replace('\\', '/', $docRoot), '/');
        $isMatch = (DIRECTORY_SEPARATOR === '\\')
            ? ($normDoc !== '' && stripos($normApp, $normDoc) === 0)
            : ($normDoc !== '' && strpos($normApp, $normDoc) === 0);
        if ($isMatch) {
            $rel = substr($normApp, strlen($normDoc));
            $cached = ($rel === '' || $rel === '/') ? '' : rtrim($rel, '/');
            return $cached;
        }
    }

    $cached = '';
    return $cached;
}

function baseUrl(string $path = ''): string
{
    $trimmed = ltrim($path);
    if ($trimmed === '') {
        $base = getBaseUrl();
        return $base === '' ? '/' : $base . '/';
    }
    if (preg_match('#^(https?:)?//#i', $trimmed) || preg_match('#^(mailto:|tel:|data:|javascript:|\#)#i', $trimmed)) {
        return $trimmed;
    }
    $clean = ltrim($trimmed, '/');
    $prefix = getBaseUrl();
    return ($prefix === '' ? '' : $prefix) . '/' . $clean;
}

function assetUrl(string $path): string
{
    $clean = ltrim($path, '/');
    $fullFile = __DIR__ . '/../' . $clean;
    $ver = file_exists($fullFile) ? (string)filemtime($fullFile) : '3';
    $sep = strpos($clean, '?') !== false ? '&' : '?';
    return baseUrl($clean . $sep . 'v=' . $ver);
}

function mediaUrl(?string $path, string $fallback = 'assets/images/hero_campus.jpg'): string
{
    $p = trim((string)$path);
    if ($p === '') {
        $p = $fallback;
    }
    return baseUrl($p);
}

function getDB(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $ex) {
            http_response_code(503);
            $setupPath = (strpos($_SERVER['SCRIPT_NAME'] ?? '', '/admin/') !== false) ? '../setup.php' : 'setup.php';
            echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Database Configuration Required</title>'
                . '<style>body{font-family:system-ui,sans-serif;background:#f5f5f4;color:#1c1917;padding:2rem;}'
                . '.box{max-width:640px;margin:2rem auto;background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:1.75rem;}'
                . 'code{background:#f5f5f4;padding:2px 6px;border-radius:4px;}</style></head><body>'
                . '<div class="box"><h1 style="margin-top:0;color:#0f294a;">Database Connection Not Configured</h1>'
                . '<p>Could not connect to MySQL database <code>' . htmlspecialchars(DB_NAME, ENT_QUOTES, 'UTF-8') . '</code> on <code>' . htmlspecialchars(DB_HOST, ENT_QUOTES, 'UTF-8') . '</code>.</p>'
                . '<p><strong>Webmin / Linux Fix:</strong> Create <code>config/config.local.php</code> with your MySQL credentials or run <a href="' . htmlspecialchars($setupPath, ENT_QUOTES, 'UTF-8') . '">setup.php</a> for pre-flight diagnostics.</p>'
                . '<p style="font-size:0.85rem;color:#78716c;">Detail: ' . htmlspecialchars($ex->getMessage(), ENT_QUOTES, 'UTF-8') . '</p>'
                . '</div></body></html>';
            exit;
        }
    }
    return $pdo;
}

function e(?string $value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function formatBytes(int $bytes): string
{
    if ($bytes <= 0) {
        return '0 B';
    }
    $units = ['B', 'KB', 'MB', 'GB'];
    $idx = (int)min(floor(log($bytes, 1024)), count($units) - 1);
    $val = $bytes / (1024 ** $idx);
    return ($val >= 10 || $idx === 0 ? number_format($val, 0) : number_format($val, 1)) . ' ' . $units[$idx];
}

function getSiteSettings(PDO $pdo): array
{
    $defaults = [
        'trust_name' => 'Shri Vitthal Education & Research Institute (SVERI)',
        'institution_name' => "SVERI's College of Engineering, Pandharpur (Autonomous)",
        'short_code' => 'SVERI',
        'logo_url' => '',
        'affiliation' => 'Affiliated to PAHSUS Solapur · Approved by AICTE · Autonomous Status (AY 2024-25) · NAAC A+ (3.46)',
        'aicte_code' => '1-49281724',
        'dte_code' => '06220',
        'address' => 'Gopalpur-Ranjani Road, P.B. No. 54, Gopalpur, Pandharpur - 413304, Dist. Solapur, Maharashtra, India',
        'phone' => '+91-02186-216063',
        'email' => 'principal@coe.sveri.ac.in',
        'emergency_helpline' => '+91-9545553888',
        'anti_ragging_helpline' => '1800-180-5522',
        'primary_color' => '#0F294A',
        'secondary_color' => '#B45309',
        'about_summary' => "Established in 1998 under Shri Vitthal Education & Research Institute (SVERI), SVERI's College of Engineering, Pandharpur (Autonomous from AY 2024-25) is NAAC A+ (CGPA 3.46) accredited and upholds full UGC NEP 2020 public disclosures.",
        'about_image_url' => 'assets/images/hero_campus.jpg',
        'vision_text' => 'To be nationally recognized among the best institutes in India for excellence in technical education.',
        'mission_text' => "To impart value-based technical education through innovation and excellence, empowering individuals to become leaders in their fields to create a positive impact.\nTo create an ambiance of academic excellence, research, and life skills by fostering a learning environment that empowers individuals to achieve their full potential.\nTo foster strong relationships amongst all stakeholders by inculcating a personal touch and mutual respect in all interactions.",
        'recruiters' => "TCS (Digital & Ninja)\nInfosys\nAccenture\nDeloitte\nWipro\nTech Mahindra\nHexaware\nBharat Forge\nMahindra & Mahindra\nAtlas Copco",
        'map_embed_query' => 'Pandharpur,Maharashtra,India',
        'home_sections' => [
            'showTicker' => 1,
            'showSlider' => 1,
            'showStatsAndRecognitions' => 1,
            'showAboutAndDownloads' => 1,
            'showApprovedAndVision' => 1,
            'showLeadershipDesk' => 1,
            'showExaminationSpotlight' => 1,
            'showDepartments' => 1,
            'showCategoriesDirectory' => 1,
            'showEventsAndRecruiters' => 1,
            'examSpotlightTitle' => 'Autonomous Examination Portal (CoE)',
            'departmentsTitle' => 'Academic Departments',
            'categoriesTitle' => 'Statutory Self-Disclosure & Autonomous Portals',
        ],
        'highlights_stats' => [
            ['label' => 'Placement Track', 'value' => '91.1%'],
            ['label' => 'Recruiters', 'value' => '250+'],
            ['label' => 'NAAC A+ Grade', 'value' => '3.46'],
            ['label' => 'DTE Code', 'value' => '06220'],
        ],
        'approved_bodies' => [
            ['name' => 'AICTE New Delhi', 'subtitle' => 'Statutory Technical Approval', 'href' => 'page.php?slug=act-statutes-moa'],
            ['name' => 'UGC Autonomous', 'subtitle' => 'Autonomous from AY 2024-25', 'href' => 'page.php?slug=about-overview'],
            ['name' => 'NAAC A+ Grade', 'subtitle' => 'CGPA 3.46 / 4.00', 'href' => 'page.php?slug=accreditation-ranking'],
            ['name' => 'PAHSUS Solapur', 'subtitle' => 'Affiliating University', 'href' => 'page.php?slug=about-overview'],
        ],
    ];
    try {
        $stmt = $pdo->query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
        $row = $stmt->fetch();
        if ($row) {
            $merged = array_merge($defaults, array_filter($row, static fn($v) => $v !== null && $v !== ''));
            if (!empty($row['home_sections_json'])) {
                $decoded = json_decode((string)$row['home_sections_json'], true);
                if (is_array($decoded)) {
                    $merged['home_sections'] = array_merge($defaults['home_sections'], $decoded);
                }
            }
            if (!empty($row['highlights_json'])) {
                $decoded = json_decode((string)$row['highlights_json'], true);
                if (is_array($decoded) && count($decoded) > 0) {
                    $merged['highlights_stats'] = $decoded;
                }
            }
            if (!empty($row['approved_bodies_json'])) {
                $decoded = json_decode((string)$row['approved_bodies_json'], true);
                if (is_array($decoded) && count($decoded) > 0) {
                    $merged['approved_bodies'] = $decoded;
                }
            }
            return $merged;
        }
    } catch (Throwable $ignored) {
        // Fallback below if schema has not been imported yet
    }
    return $defaults;
}
