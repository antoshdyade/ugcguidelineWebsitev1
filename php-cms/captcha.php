<?php
declare(strict_types=1);

/**
 * SVCOER PHP CMS — Public CAPTCHA Refresh Endpoint
 * Lives outside /includes/ so Apache .htaccess RewriteRule ^(config|includes|backups)/ never blocks AJAX refresh.
 */
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/captcha.php';

$ctx = preg_replace('/[^a-z0-9_-]/i', '_', (string)($_GET['ctx'] ?? 'default')) ?: 'default';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
echo json_encode(generateCaptchaChallenge($ctx), JSON_UNESCAPED_SLASHES);
exit;
