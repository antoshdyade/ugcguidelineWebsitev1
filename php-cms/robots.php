<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$seo = getSeoSettings($pdo);
$baseUrl = resolvePhpCanonicalBase($seo);

header('Content-Type: text/plain; charset=utf-8');
echo buildPhpRobotsTxt($baseUrl, $seo);
