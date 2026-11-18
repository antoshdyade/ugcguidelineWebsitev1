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

// PHP 7.4 Compatibility Polyfills (prevents fatal Error on Ubuntu 20.04 / Webmin PHP 7.4)
if (!function_exists('str_contains')) {
    function str_contains($haystack, $needle): bool {
        return $needle === '' || strpos((string)$haystack, (string)$needle) !== false;
    }
}
if (!function_exists('str_starts_with')) {
    function str_starts_with($haystack, $needle): bool {
        $h = (string)$haystack;
        $n = (string)$needle;
        return $n === '' || strncmp($h, $n, strlen($n)) === 0;
    }
}
if (!function_exists('str_ends_with')) {
    function str_ends_with($haystack, $needle): bool {
        $h = (string)$haystack;
        $n = (string)$needle;
        if ($n === '') {
            return true;
        }
        $len = strlen($n);
        return strlen($h) >= $len && substr($h, -$len) === $n;
    }
}

// ext-mbstring Fallback Polyfills (prevents fatal Error on minimal Ubuntu PHP installs without php-mbstring)
if (!function_exists('mb_strlen')) {
    function mb_strlen($str, $encoding = null): int {
        $s = (string)$str;
        if (function_exists('iconv_strlen')) {
            $len = @iconv_strlen($s, $encoding ?: 'UTF-8');
            if ($len !== false) {
                return (int)$len;
            }
        }
        return strlen($s);
    }
}
if (!function_exists('mb_substr')) {
    function mb_substr($str, $start, $length = null, $encoding = null): string {
        $s = (string)$str;
        if (function_exists('iconv_substr')) {
            $res = $length === null
                ? @iconv_substr($s, (int)$start, strlen($s), $encoding ?: 'UTF-8')
                : @iconv_substr($s, (int)$start, (int)$length, $encoding ?: 'UTF-8');
            if ($res !== false) {
                return $res;
            }
        }
        return $length === null ? substr($s, (int)$start) : substr($s, (int)$start, (int)$length);
    }
}
if (!function_exists('mb_strtolower')) {
    function mb_strtolower($str, $encoding = null): string {
        return strtolower((string)$str);
    }
}
if (!function_exists('mb_strpos')) {
    function mb_strpos($haystack, $needle, $offset = 0, $encoding = null) {
        return strpos((string)$haystack, (string)$needle, (int)$offset);
    }
}
if (!function_exists('mb_strimwidth')) {
    function mb_strimwidth($str, $start, $width, $trimmarker = '', $encoding = null): string {
        $s = (string)$str;
        $st = (int)$start;
        $w = (int)$width;
        $slice = mb_substr($s, $st);
        if (mb_strlen($slice) <= $w) {
            return $slice;
        }
        $tm = (string)$trimmarker;
        $tmLen = mb_strlen($tm);
        $cutLen = max(0, $w - $tmLen);
        return mb_substr($slice, 0, $cutLen) . $tm;
    }
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

function baseUrl($path = ''): string
{
    $trimmed = ltrim((string)$path);
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

function assetUrl($path): string
{
    $clean = ltrim((string)$path, '/');
    $fullFile = __DIR__ . '/../' . $clean;
    $ver = file_exists($fullFile) ? (string)filemtime($fullFile) : '3';
    $sep = strpos($clean, '?') !== false ? '&' : '?';
    return baseUrl($clean . $sep . 'v=' . $ver);
}

function mediaUrl($path, string $fallback = 'assets/images/hero_campus.jpg'): string
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
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $hostsToTry = [DB_HOST];
        if (strtolower((string)DB_HOST) === 'localhost') {
            $hostsToTry[] = '127.0.0.1';
        }
        $lastEx = null;
        foreach ($hostsToTry as $tryHost) {
            try {
                $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $tryHost, DB_NAME, DB_CHARSET);
                $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
                $lastEx = null;
                break;
            } catch (PDOException $ex) {
                $lastEx = $ex;
                if (stripos($ex->getMessage(), '2002') === false && stripos($ex->getMessage(), 'No such file') === false) {
                    break;
                }
            }
        }
        if ($pdo === null && $lastEx !== null) {
            http_response_code(503);
            $setupPath = (strpos($_SERVER['SCRIPT_NAME'] ?? '', '/admin/') !== false) ? '../setup.php' : 'setup.php';
            echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Database Configuration Required</title>'
                . '<style>body{font-family:system-ui,sans-serif;background:#f5f5f4;color:#1c1917;padding:2rem;}'
                . '.box{max-width:640px;margin:2rem auto;background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:1.75rem;}'
                . 'code{background:#f5f5f4;padding:2px 6px;border-radius:4px;}</style></head><body>'
                . '<div class="box"><h1 style="margin-top:0;color:#0f294a;">Database Connection Not Configured</h1>'
                . '<p>Could not connect to MySQL database <code>' . htmlspecialchars(DB_NAME, ENT_QUOTES, 'UTF-8') . '</code> on <code>' . htmlspecialchars(DB_HOST, ENT_QUOTES, 'UTF-8') . '</code>.</p>'
                . '<p><strong>Webmin / Linux Fix:</strong> Create <code>config/config.local.php</code> with your MySQL credentials or run <a href="' . htmlspecialchars($setupPath, ENT_QUOTES, 'UTF-8') . '">setup.php</a> for pre-flight diagnostics.</p>'
                . '<p style="font-size:0.85rem;color:#78716c;">Detail: ' . htmlspecialchars($lastEx->getMessage(), ENT_QUOTES, 'UTF-8') . '</p>'
                . '</div></body></html>';
            exit;
        }
    }
    return $pdo;
}

function e($value = ''): string
{
    return htmlspecialchars((string)($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function formatBytes($bytes): string
{
    $b = (int)$bytes;
    if ($b <= 0) {
        return '0 B';
    }
    $units = ['B', 'KB', 'MB', 'GB'];
    $idx = (int)min(floor(log($b, 1024)), count($units) - 1);
    $val = $b / (1024 ** $idx);
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
        'max_photo_mb' => 2.0,
        'max_doc_mb' => 10.0,
        'auto_crop_enabled' => 1,
        'design_preset' => 'heritage-navy',
        'font_heading' => "'Playfair Display', Georgia, serif",
        'font_body' => "'Plus Jakarta Sans', system-ui, sans-serif",
        'card_radius' => 'rounded',
        'header_style' => 'classic',
        'custom_css' => '',
        'research_slider_slides' => [],
    ];
    try {
        $stmt = $pdo->query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
        $row = $stmt->fetch();
        $merged = $defaults;
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
        }
        try {
            $kvStmt = $pdo->query("SELECT key_name, val_json FROM cms_kv_store WHERE key_name IN ('upload_policy', 'design_settings', 'research_slider_slides')");
            foreach ($kvStmt->fetchAll() as $kvRow) {
                $kName = $kvRow['key_name'] ?? '';
                $decoded = json_decode((string)($kvRow['val_json'] ?? ''), true);
                if (!is_array($decoded)) continue;
                if ($kName === 'upload_policy') {
                    if (isset($decoded['max_photo_mb']) && is_numeric($decoded['max_photo_mb'])) {
                        $merged['max_photo_mb'] = max(0.25, min(25.0, (float)$decoded['max_photo_mb']));
                    }
                    if (isset($decoded['max_doc_mb']) && is_numeric($decoded['max_doc_mb'])) {
                        $merged['max_doc_mb'] = max(0.5, min(50.0, (float)$decoded['max_doc_mb']));
                    }
                    if (isset($decoded['auto_crop_enabled'])) {
                        $merged['auto_crop_enabled'] = !empty($decoded['auto_crop_enabled']) ? 1 : 0;
                    }
                } elseif ($kName === 'design_settings') {
                    foreach (['design_preset', 'font_heading', 'font_body', 'card_radius', 'header_style', 'custom_css'] as $dk) {
                        if (isset($decoded[$dk]) && is_string($decoded[$dk])) {
                            $merged[$dk] = $decoded[$dk];
                        }
                    }
                } elseif ($kName === 'research_slider_slides') {
                    $merged['research_slider_slides'] = $decoded;
                }
            }
        } catch (Throwable $ignoredKv) {
            // cms_kv_store optional on older schemas
        }
        return $merged;
    } catch (Throwable $ignored) {
        // Fallback below if schema has not been imported yet
    }
    return $defaults;
}

function getUploadLimits(PDO $pdo): array
{
    $s = getSiteSettings($pdo);
    $photoMb = max(0.25, min(25.0, (float)($s['max_photo_mb'] ?? 2.0)));
    $docMb   = max(0.5, min(50.0, (float)($s['max_doc_mb'] ?? 10.0)));
    return [
        'max_photo_mb'      => $photoMb,
        'max_doc_mb'        => $docMb,
        'auto_crop_enabled' => !empty($s['auto_crop_enabled']) ? 1 : 0,
        'max_photo_bytes'   => (int)round($photoMb * 1024 * 1024),
        'max_doc_bytes'     => (int)round($docMb * 1024 * 1024),
    ];
}
