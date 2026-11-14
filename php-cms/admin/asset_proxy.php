<?php
declare(strict_types=1);

/**
 * Self-healing static asset endpoint inside /admin/ so CSS and JS
 * always load even if Apache permissions (0600) or .htaccess block /assets/.
 */
$type = $_GET['f'] ?? '';
$map = [
    'css'           => ['path' => __DIR__ . '/../assets/css/style.css', 'mime' => 'text/css; charset=utf-8'],
    'editor'        => ['path' => __DIR__ . '/../assets/js/editor.js', 'mime' => 'application/javascript; charset=utf-8'],
    'accessibility' => ['path' => __DIR__ . '/../assets/js/accessibility.js', 'mime' => 'application/javascript; charset=utf-8'],
];

if (!isset($map[$type]) || !is_readable($map[$type]['path'])) {
    http_response_code(404);
    exit('Asset not found.');
}

header('Content-Type: ' . $map[$type]['mime']);
header('Cache-Control: public, max-age=3600');
header('X-Content-Type-Options: nosniff');
readfile($map[$type]['path']);
