<?php
declare(strict_types=1);

/**
 * SVCOER PHP CMS — Server-Side SVG CAPTCHA Generator & Single-Use Verifier
 * Works everywhere (Ubuntu Webmin / Windows XAMPP) with zero GD/ImageMagick dependency.
 * Uses dual-layer validation: PHP Session + HMAC-SHA256 stateless single-use token fallback
 * so reverse-proxies or strict directory permissions cannot break authentication.
 */

if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    require_once __DIR__ . '/auth.php';
}

function svcoerCaptchaSecret(): string
{
    static $cached = null;
    if (is_string($cached) && $cached !== '') {
        return $cached;
    }
    try {
        if (function_exists('getDB')) {
            $pdo = getDB();
            $stmt = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'captcha_hmac_secret' LIMIT 1");
            $stmt->execute();
            $val = $stmt->fetchColumn();
            if (is_string($val) && strlen($val) >= 32) {
                $cached = $val;
                return $cached;
            }
            $generated = bin2hex(random_bytes(32));
            $pdo->prepare(
                "INSERT INTO cms_kv_store (key_name, val_json) VALUES ('captcha_hmac_secret', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)"
            )->execute([$generated]);
            $cached = $generated;
            return $cached;
        }
    } catch (Throwable $ignored) {
    }
    $cached = hash('sha256', (defined('DB_PASS') ? DB_PASS : '') . '|' . (defined('DB_NAME') ? DB_NAME : '') . '|' . __FILE__);
    return $cached;
}

function svcoerIsCaptchaNonceConsumed(string $nonce): bool
{
    if ($nonce === '') {
        return false;
    }
    if (!empty($_SESSION['svcoer_captcha_used'][$nonce])) {
        return true;
    }
    try {
        if (function_exists('getDB')) {
            $pdo = getDB();
            $key = 'cap_used_' . substr(hash('sha256', $nonce), 0, 40);
            $stmt = $pdo->prepare('SELECT val_json FROM cms_kv_store WHERE key_name = ? LIMIT 1');
            $stmt->execute([$key]);
            if ($stmt->fetchColumn()) {
                return true;
            }
        }
    } catch (Throwable $ignored) {
    }
    return false;
}

function svcoerMarkCaptchaNonceConsumed(string $nonce): void
{
    if ($nonce === '') {
        return;
    }
    if (!isset($_SESSION['svcoer_captcha_used']) || !is_array($_SESSION['svcoer_captcha_used'])) {
        $_SESSION['svcoer_captcha_used'] = [];
    }
    $_SESSION['svcoer_captcha_used'][$nonce] = time();
    if (count($_SESSION['svcoer_captcha_used']) > 100) {
        $_SESSION['svcoer_captcha_used'] = array_slice($_SESSION['svcoer_captcha_used'], -50, null, true);
    }
    try {
        if (function_exists('getDB')) {
            $pdo = getDB();
            $key = 'cap_used_' . substr(hash('sha256', $nonce), 0, 40);
            $pdo->prepare(
                'INSERT INTO cms_kv_store (key_name, val_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)'
            )->execute([$key, (string)(time() + 900)]);
        }
    } catch (Throwable $ignored) {
    }
}

function generateCaptchaChallenge(string $context = 'default'): array
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $len = strlen($alphabet);
    $code = '';
    for ($i = 0; $i < 5; $i++) {
        $code .= $alphabet[random_int(0, $len - 1)];
    }

    $expiresAt = time() + 600;
    $nonce = bin2hex(random_bytes(10));

    $_SESSION['svcoer_captcha'][$context] = [
        'answer'    => $code,
        'expiresAt' => $expiresAt,
        'nonce'     => $nonce,
    ];

    $sig = hash_hmac('sha256', $context . '|' . $expiresAt . '|' . $nonce . '|' . $code, svcoerCaptchaSecret());
    $tokenPayload = json_encode(['ctx' => $context, 'exp' => $expiresAt, 'n' => $nonce, 'sig' => $sig]);
    $token = rtrim(strtr(base64_encode($tokenPayload ?: '{}'), '+/', '-_'), '=');

    $charsSvg = '';
    for ($i = 0; $i < strlen($code); $i++) {
        $x = 20 + ($i * 28) + random_int(-2, 3);
        $y = 33 + random_int(-3, 4);
        $rot = random_int(-14, 14);
        $colors = ['#0F294A', '#B45309', '#0F766E', '#1E3A8A', '#9A3412'];
        $fill = $colors[$i % count($colors)];
        $ch = htmlspecialchars($code[$i], ENT_QUOTES, 'UTF-8');
        $charsSvg .= "<text x=\"{$x}\" y=\"{$y}\" font-family=\"monospace\" font-size=\"24\" font-weight=\"800\" fill=\"{$fill}\" transform=\"rotate({$rot} {$x} {$y})\">{$ch}</text>";
    }

    $linesSvg = '';
    for ($j = 0; $j < 5; $j++) {
        $x1 = random_int(2, 40);
        $y1 = random_int(4, 46);
        $x2 = random_int(120, 174);
        $y2 = random_int(4, 46);
        $stroke = $j % 2 === 0 ? '#CBD5E1' : '#FCD34D';
        $linesSvg .= "<line x1=\"{$x1}\" y1=\"{$y1}\" x2=\"{$x2}\" y2=\"{$y2}\" stroke=\"{$stroke}\" stroke-width=\"1.4\" opacity=\"0.7\"/>";
    }

    $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="176" height="48" viewBox="0 0 176 48" role="img" aria-label="Security Verification Code">'
        . '<rect width="176" height="48" rx="8" fill="#F8FAFC" stroke="#CBD5E1"/>'
        . $linesSvg
        . $charsSvg
        . '</svg>';

    return [
        'context'    => $context,
        'token'      => $token,
        'svgDataUrl' => 'data:image/svg+xml;base64,' . base64_encode($svg),
    ];
}

function verifyCaptchaAnswer(?string $submitted, string $context = 'default', ?string $submittedToken = null): bool
{
    $clean = strtoupper(preg_replace('/\s+/', '', (string)$submitted));
    $entry = $_SESSION['svcoer_captcha'][$context] ?? null;
    unset($_SESSION['svcoer_captcha'][$context]); // strictly single-use in session

    if ($clean === '') {
        return false;
    }

    // Primary check: PHP Session state
    if (is_array($entry) && !empty($entry['answer']) && (int)($entry['expiresAt'] ?? 0) >= time()) {
        $ok = hash_equals((string)$entry['answer'], $clean);
        if ($ok && !empty($entry['nonce'])) {
            svcoerMarkCaptchaNonceConsumed((string)$entry['nonce']);
        }
        if ($ok) {
            return true;
        }
    }

    // Secondary fail-safe check: Signed single-use HMAC token (prevents false failures if Apache/Webmin drops session cookie or temp dir)
    $rawTok = trim((string)($submittedToken ?? $_POST['captcha_token'] ?? ''));
    if ($rawTok !== '') {
        $padded = strtr($rawTok, '-_', '+/');
        $mod = strlen($padded) % 4;
        if ($mod > 0) {
            $padded .= str_repeat('=', 4 - $mod);
        }
        $decoded = json_decode((string)base64_decode($padded, true), true);
        if (is_array($decoded) && ($decoded['ctx'] ?? '') === $context && (int)($decoded['exp'] ?? 0) >= time()) {
            $nonce = (string)($decoded['n'] ?? '');
            $sig = (string)($decoded['sig'] ?? '');
            if ($nonce !== '' && $sig !== '' && !svcoerIsCaptchaNonceConsumed($nonce)) {
                $expectedSig = hash_hmac(
                    'sha256',
                    $context . '|' . (int)$decoded['exp'] . '|' . $nonce . '|' . $clean,
                    svcoerCaptchaSecret()
                );
                if (hash_equals($expectedSig, $sig)) {
                    svcoerMarkCaptchaNonceConsumed($nonce);
                    return true;
                }
            }
        }
    }

    return false;
}

function renderCaptchaWidget(string $context, string $refreshEndpoint = '', string $label = 'Security CAPTCHA Verification *'): string
{
    $resolvedEndpoint = function_exists('baseUrl') ? baseUrl('captcha.php') : 'captcha.php';
    if ($refreshEndpoint !== '' && !str_contains($refreshEndpoint, 'includes/captcha.php')) {
        $resolvedEndpoint = $refreshEndpoint;
    }
    $ch = generateCaptchaChallenge($context);
    $uid = preg_replace('/[^a-z0-9_-]/i', '_', $context);
    $safeRefresh = htmlspecialchars($resolvedEndpoint, ENT_QUOTES, 'UTF-8');
    $safeCtx = htmlspecialchars($context, ENT_QUOTES, 'UTF-8');
    $safeLabel = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
    $safeImg = htmlspecialchars($ch['svgDataUrl'], ENT_QUOTES, 'UTF-8');
    $safeToken = htmlspecialchars($ch['token'], ENT_QUOTES, 'UTF-8');

    return '<div class="captcha-box" style="padding:0.7rem 0.85rem;border:1px solid #D6D3D1;border-radius:10px;background:#FAFAF9;margin-bottom:0.85rem;">'
        . '<div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">'
        . '<label for="captcha-input-' . $uid . '" style="font-size:0.75rem;font-weight:700;color:#44403C;margin:0;">' . $safeLabel . '</label>'
        . '<button type="button" data-captcha-refresh="' . $safeCtx . '" data-captcha-target="captcha-img-' . $uid . '" data-captcha-token="captcha-token-' . $uid . '" data-captcha-url="' . $safeRefresh . '" style="font-size:0.72rem;font-weight:600;padding:0.22rem 0.55rem;border:1px solid #D6D3D1;border-radius:6px;background:#FFFFFF;color:#1C1917;cursor:pointer;">&#8635; Refresh</button>'
        . '</div>'
        . '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.65rem;">'
        . '<img id="captcha-img-' . $uid . '" src="' . $safeImg . '" alt="CAPTCHA security image" style="height:46px;width:176px;border-radius:7px;border:1px solid #CBD5E1;background:#FFFFFF;display:block;flex-shrink:0;">'
        . '<input type="hidden" name="captcha_context" value="' . $safeCtx . '">'
        . '<input id="captcha-token-' . $uid . '" type="hidden" name="captcha_token" value="' . $safeToken . '">'
        . '<input id="captcha-input-' . $uid . '" type="text" name="captcha_answer" required maxlength="8" autocomplete="off" placeholder="Enter 5-character code" style="flex:1;min-width:150px;padding:0.52rem 0.7rem;border:1px solid #D6D3D1;border-radius:8px;background:#FFFFFF;text-transform:uppercase;letter-spacing:0.12em;font-family:monospace;font-size:0.9rem;">'
        . '</div>'
        . '</div>'
        . '<script>(function(){var btn=document.querySelector(\'[data-captcha-target="captcha-img-' . $uid . '"]\');if(!btn||btn.dataset.bound==="1")return;btn.dataset.bound="1";btn.addEventListener("click",function(){var u=btn.getAttribute("data-captcha-url")+"?refresh=1&ctx="+encodeURIComponent(btn.getAttribute("data-captcha-refresh"));fetch(u,{credentials:"same-origin"}).then(function(r){return r.json();}).then(function(d){if(d&&d.svgDataUrl){var img=document.getElementById("captcha-img-' . $uid . '");if(img)img.src=d.svgDataUrl;var tok=document.getElementById("captcha-token-' . $uid . '");if(tok&&d.token)tok.value=d.token;var inp=document.getElementById("captcha-input-' . $uid . '");if(inp){inp.value="";inp.focus();}}});});})();</script>';
}
