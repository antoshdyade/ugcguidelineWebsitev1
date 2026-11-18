<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');
$user = requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
    exit;
}

$submitted = $_POST['csrf_token'] ?? '';
if (!$submitted || !hash_equals($_SESSION['csrf_token'] ?? '', $submitted)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Invalid CSRF token.']);
    exit;
}

if (empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No file uploaded.']);
    exit;
}

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$res = handleCmsUpload($pdo, $_FILES['file'], __DIR__ . '/../uploads', 'auto');
if (!$res['ok']) {
    http_response_code(400);
    echo json_encode($res);
    exit;
}

logAudit($pdo, $user, 'UPLOAD_MEDIA', 'Upload', $res['file_name']);
echo json_encode($res);
