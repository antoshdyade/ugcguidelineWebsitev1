<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$seo = getSeoSettings($pdo);
$baseUrl = resolvePhpCanonicalBase($seo);

if (empty($seo['enableSitemapXml'])) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Sitemap disabled in SEO Studio.\n";
    exit;
}

header('Content-Type: application/xml; charset=utf-8');
echo buildPhpSitemapXml($pdo, $baseUrl);
