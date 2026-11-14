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
    $hasExplicitScope = !empty($user['allowed_categories']) || !empty($user['allowed_page_ids']);
    return match ($resource) {
        'users', 'settings', 'audit_logs' => false,
        'sliders_events', 'gallery', 'directory' => $role === 'content_editor',
        'categories'                      => in_array($role, ['content_editor', 'iqac_officer'], true),
        'pages'                           => in_array($role, ['content_editor', 'iqac_officer', 'exam_controller'], true) || $hasExplicitScope,
        'documents'                       => in_array($role, ['iqac_officer', 'content_editor', 'exam_controller'], true),
        'leadership'                      => in_array($role, ['iqac_officer', 'content_editor'], true),
        'departments'                     => $role === 'department_admin'
            && ($targetDeptId === null ? !empty($user['assigned_department_id']) : (int)$user['assigned_department_id'] === $targetDeptId),
        default                           => false,
    };
}

function canAccessCategory(array $user, string $categorySlug): bool
{
    $role = $user['role'] ?? '';
    if ($role === 'super_admin') {
        return true;
    }
    $allowedCats = $user['allowed_categories'] ?? null;
    if (is_array($allowedCats) && count($allowedCats) > 0) {
        return in_array($categorySlug, $allowedCats, true);
    }
    $allowedPages = $user['allowed_page_ids'] ?? null;
    if (is_array($allowedPages) && count($allowedPages) > 0) {
        return false;
    }
    if ($role === 'exam_controller') {
        return $categorySlug === 'examination';
    }
    return in_array($role, ['content_editor', 'iqac_officer'], true);
}

function canAccessPage(array $user, array $page, ?string $categorySlug = null): bool
{
    $role = $user['role'] ?? '';
    if ($role === 'super_admin') {
        return true;
    }
    $allowedPages = $user['allowed_page_ids'] ?? null;
    if (is_array($allowedPages) && count($allowedPages) > 0) {
        return in_array((int)($page['id'] ?? 0), array_map('intval', $allowedPages), true);
    }
    $catSlug = $categorySlug ?? ($page['category_slug'] ?? $page['cat_slug'] ?? '');
    if ($catSlug !== '') {
        return canAccessCategory($user, $catSlug);
    }
    return canAccessResource($user, 'pages');
}

function leadershipGroupPresets(): array
{
    return [
        'Statutory Officer',
        'Governing Body',
        'Internal Complaint Committee (ICC)',
        'Academic Leadership',
        'Board of Studies',
        'Finance Committee',
        'Academic Council',
    ];
}

function formatCommitteeGroupLabel(?string $group): string
{
    $raw = trim((string)$group);
    if ($raw === '') {
        return 'Leadership & Governance';
    }
    return match ($raw) {
        'statutory'           => 'Statutory Officer',
        'governance'          => 'Governing Body',
        'icc'                 => 'Internal Complaint Committee (ICC)',
        'academic_leadership' => 'Academic Leadership',
        default               => $raw,
    };
}

function swapSortOrder(PDO $pdo, string $table, int $id, string $dir, ?string $scopeCol = null, ?int $scopeVal = null, string $tieOrder = 'id ASC'): bool
{
    $allowedTables = [
        'categories',
        'pages',
        'department_subpages',
        'faculty',
        'department_labs',
        'leadership_profiles',
        'sliders',
        'ticker_items',
        'campus_events',
        'documents',
        'gallery_albums',
        'telephone_directory',
    ];
    $allowedScopes = [null, 'category_id', 'department_id'];
    $allowedTies   = ['id ASC', 'id DESC', 'event_date DESC, id DESC', 'uploaded_at DESC, id DESC'];

    if (!in_array($table, $allowedTables, true) || !in_array($scopeCol, $allowedScopes, true) || !in_array($tieOrder, $allowedTies, true)) {
        return false;
    }

    if ($scopeCol !== null && $scopeVal !== null) {
        $stmt = $pdo->prepare("SELECT id, sort_order FROM `$table` WHERE `$scopeCol` = ? ORDER BY sort_order ASC, $tieOrder");
        $stmt->execute([$scopeVal]);
    } else {
        $stmt = $pdo->query("SELECT id, sort_order FROM `$table` ORDER BY sort_order ASC, $tieOrder");
    }
    $rows = $stmt->fetchAll();
    if (count($rows) < 2) {
        return false;
    }

    $targetIdx = -1;
    foreach ($rows as $idx => $r) {
        if ((int)$r['id'] === $id) {
            $targetIdx = $idx;
            break;
        }
    }
    if ($targetIdx === -1) {
        return false;
    }

    $swapIdx = ($dir === 'down') ? $targetIdx + 1 : $targetIdx - 1;
    if (!isset($rows[$swapIdx])) {
        return false;
    }

    // Reorder sequentially 1..N so duplicate sort_order defaults always swap cleanly
    $tmp = $rows[$targetIdx];
    $rows[$targetIdx] = $rows[$swapIdx];
    $rows[$swapIdx] = $tmp;

    $upd = $pdo->prepare("UPDATE `$table` SET sort_order = ? WHERE id = ?");
    foreach ($rows as $seq => $r) {
        $upd->execute([$seq + 1, (int)$r['id']]);
    }
    return true;
}

function validateExternalUrl(string $url): bool
{
    $url = trim($url);
    if ($url === '') {
        return false;
    }
    if (!preg_match('#^https?://#i', $url)) {
        return false;
    }
    return filter_var($url, FILTER_VALIDATE_URL) !== false;
}

function isExternalHttpUrl(?string $url): bool
{
    return $url !== null && preg_match('#^https?://#i', trim($url)) === 1;
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
