<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    $currentSavePath = session_save_path() ?: sys_get_temp_dir();
    if (!@is_writable($currentSavePath)) {
        $fallbackSessions = __DIR__ . '/../uploads/.sessions';
        if (!is_dir($fallbackSessions)) {
            @mkdir($fallbackSessions, 0700, true);
        }
        if (is_dir($fallbackSessions) && is_writable($fallbackSessions)) {
            session_save_path($fallbackSessions);
        } else {
            session_save_path(sys_get_temp_dir());
        }
    }
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params([
        'lifetime' => 43200,
        'path'     => '/',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(?string $submitted): void
{
    if (!$submitted || !hash_equals($_SESSION['csrf_token'] ?? '', $submitted)) {
        http_response_code(403);
        exit('Invalid or missing CSRF security token.');
    }
}

function currentUser(): ?array
{
    return $_SESSION['cms_user'] ?? null;
}

function requireLogin(): array
{
    $user = currentUser();
    if (!$user) {
        header('Location: login.php');
        exit;
    }
    return $user;
}

function canAccessResource(array $user, string $resource, ?int $targetDeptId = null): bool
{
    $role = $user['role'] ?? '';
    if ($role === 'super_admin') {
        return true;
    }
    return match ($resource) {
        'users', 'settings', 'audit_logs' => false,
        'sliders_events', 'gallery'       => $role === 'content_editor',
        'pages'                           => in_array($role, ['content_editor', 'iqac_officer'], true),
        'documents'                       => in_array($role, ['iqac_officer', 'content_editor'], true),
        'departments'                     => $role === 'department_admin'
            && ($targetDeptId === null ? !empty($user['assigned_department_id']) : (int)$user['assigned_department_id'] === $targetDeptId),
        default                           => false,
    };
}

function requireRoleAccess(string $resource, ?int $targetDeptId = null): array
{
    $user = requireLogin();
    if (!canAccessResource($user, $resource, $targetDeptId)) {
        http_response_code(403);
        exit('Access Denied: Insufficient RBAC privileges for this module.');
    }
    return $user;
}

function logAudit(PDO $pdo, array $user, string $action, string $entityType, string $entityTitle): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO audit_logs (actor_email, actor_role, action, entity_type, entity_title) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$user['email'], $user['role'], $action, $entityType, $entityTitle]);
}

/**
 * Strict Upload Security Validator:
 * - Blocks executable extensions (.php, .phtml, .exe, .sh, .js, .html) including double extensions
 * - Verifies actual server-side MIME type via finfo_file()
 * - Generates randomized safe filename
 */
function handleSecureUpload(array $file, string $uploadDir, int $maxBytes = 10485760): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'Upload error code: ' . ($file['error'] ?? 'unknown')];
    }
    if ($file['size'] <= 0 || $file['size'] > $maxBytes) {
        return ['ok' => false, 'error' => 'File exceeds allowed 10 MB limit.'];
    }

    $original = basename($file['name']);
    $parts = explode('.', strtolower($original));
    $blocked = ['php', 'phtml', 'php3', 'php4', 'php5', 'phar', 'exe', 'sh', 'bat', 'js', 'html', 'htm', 'svg', 'py', 'pl'];
    foreach (array_slice($parts, 1) as $seg) {
        if (in_array($seg, $blocked, true)) {
            return ['ok' => false, 'error' => "Executable extension '.$seg' is blocked."];
        }
    }

    $ext = end($parts);
    $allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx'];
    if (!in_array($ext, $allowedExts, true)) {
        return ['ok' => false, 'error' => 'Unsupported file extension.'];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $detectedMime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!in_array($detectedMime, $allowedMimes, true)) {
        return ['ok' => false, 'error' => "Disallowed MIME type: $detectedMime"];
    }

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    $safeName = bin2hex(random_bytes(8)) . '-' . preg_replace('/[^a-z0-9_-]/', '-', $parts[0]) . '.' . $ext;
    $dest = rtrim($uploadDir, '/') . '/' . $safeName;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        return ['ok' => false, 'error' => 'Failed to move uploaded file.'];
    }

    return [
        'ok'        => true,
        'file_name' => $safeName,
        'file_url'  => 'uploads/' . $safeName,
        'mime_type' => $detectedMime,
        'size'      => (int)$file['size'],
    ];
}
