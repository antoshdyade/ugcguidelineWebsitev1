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
        'trust_name' => "Shri Vithal Education & Research Trust's",
        'institution_name' => 'Shri Vithal College of Engineering & Research (Autonomous)',
        'short_code' => 'SVCOER',
        'logo_url' => '',
        'affiliation' => 'Affiliated to PAHSUS Solapur · Approved by AICTE · UGC 2(f) & 12(B)',
        'aicte_code' => '1-49281724',
        'dte_code' => 'EN-6220',
        'address' => 'Pandharpur, Maharashtra',
        'phone' => '+91 2186 225083',
        'email' => 'principal@svcoer.edu.in',
        'emergency_helpline' => '+91 2186 225099',
        'anti_ragging_helpline' => '1800-180-5522',
        'primary_color' => '#0F294A',
        'secondary_color' => '#B45309',
        'about_summary' => 'Established in 1998, Shri Vithal College of Engineering & Research (Autonomous) empowers rural and urban engineering scholars through NAAC A+ accredited programs, funded R&D labs, and transparent UGC NEP 2020 public disclosures.',
        'about_image_url' => 'assets/images/hero_campus.jpg',
        'vision_text' => 'To emerge as a globally respected autonomous engineering institution driving inclusive technological innovation and ethical societal transformation under NEP 2020.',
        'mission_text' => "Deliver outcome-based engineering education with multidisciplinary minors and barrier-free access.\nFoster funded R&D, industrial consultancy, and entrepreneurship incubation.\nMaintain 100% institutional governance transparency aligned with UGC Public Self-Disclosure norms.",
        'recruiters' => "TCS\nInfosys\nPersistent Systems\nBosch India\nTata Technologies\nBharat Forge\nL&T Construction\nCapgemini",
        'map_embed_query' => 'Pandharpur,Maharashtra,India',
    ];
    try {
        $stmt = $pdo->query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
        $row = $stmt->fetch();
        if ($row) {
            return array_merge($defaults, array_filter($row, static fn($v) => $v !== null && $v !== ''));
        }
    } catch (Throwable $ignored) {
        // Fallback below if schema has not been imported yet
    }
    return $defaults;
}
