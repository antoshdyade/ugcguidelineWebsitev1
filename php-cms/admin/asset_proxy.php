<?php
declare(strict_types=1);

/**
 * Self-healing static asset & media endpoint inside /admin/ so CSS, JS,
 * and uploaded/seeded images always load even if Apache file perms (0600)
 * or .htaccess rules block /assets/ or /uploads/ on Ubuntu Webmin.
 */
if (isset($_GET['img'])) {
    $rel = str_replace('\\', '/', ltrim((string)$_GET['img'], '/'));
    if ($rel === '' || strpos($rel, '..') !== false) {
        http_response_code(400);
        exit('Invalid asset path.');
    }
    $allowedPrefix = (strpos($rel, 'assets/images/') === 0 || strpos($rel, 'uploads/') === 0);
    if (!$allowedPrefix) {
        http_response_code(403);
        exit('Forbidden path.');
    }
    $rootDir = realpath(__DIR__ . '/..');
    $fullPath = $rootDir ? realpath($rootDir . '/' . $rel) : false;
    if (!$rootDir || !$fullPath || strpos($fullPath, $rootDir . DIRECTORY_SEPARATOR) !== 0 || !is_file($fullPath) || !is_readable($fullPath)) {
        http_response_code(404);
        exit('Media not found.');
    }
    $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
    $mimeMap = [
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'webp' => 'image/webp',
        'pdf'  => 'application/pdf',
    ];
    if (!isset($mimeMap[$ext])) {
        http_response_code(403);
        exit('Unsupported media type.');
    }
    header('Content-Type: ' . $mimeMap[$ext]);
    header('Cache-Control: public, max-age=3600');
    header('X-Content-Type-Options: nosniff');
    readfile($fullPath);
    exit;
}

$type = $_GET['f'] ?? '';
$map = [
    'css'           => ['path' => __DIR__ . '/../assets/css/style.css', 'mime' => 'text/css; charset=utf-8'],
    'editor'        => ['path' => __DIR__ . '/../assets/js/editor.js', 'mime' => 'application/javascript; charset=utf-8'],
    'accessibility' => ['path' => __DIR__ . '/../assets/js/accessibility.js', 'mime' => 'application/javascript; charset=utf-8'],
    'upload_guard'  => ['path' => __DIR__ . '/../assets/js/upload_guard.js', 'mime' => 'application/javascript; charset=utf-8'],
];

if (!isset($map[$type]) || !is_readable($map[$type]['path'])) {
    http_response_code(404);
    exit('Asset not found.');
}

header('Content-Type: ' . $map[$type]['mime']);
header('Cache-Control: public, max-age=3600');
header('X-Content-Type-Options: nosniff');
readfile($map[$type]['path']);
