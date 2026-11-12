<?php
declare(strict_types=1);

/**
 * Secure PDO Database Connection & Site Configuration
 * Deployable on XAMPP / LAMP / cPanel with PHP 8.x & MySQL 8.x
 */
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: 'svcoer_ugc_cms');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

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
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
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
    $stmt = $pdo->query('SELECT * FROM site_settings WHERE id = 1 LIMIT 1');
    return $stmt->fetch() ?: [
        'institution_name' => 'Shri Vithal College of Engineering & Research (Autonomous)',
        'short_code' => 'SVCOER',
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
        'map_embed_query' => 'Pandharpur,Maharashtra,India',
    ];
}
