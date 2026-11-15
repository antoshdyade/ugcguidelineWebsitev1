<?php
declare(strict_types=1);

/**
 * SVCOER PHP CMS — Server-Side SVG CAPTCHA Generator & Single-Use Verifier
 * Works everywhere (Ubuntu Webmin / Windows XAMPP) with zero GD/ImageMagick dependency.
 */

if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    require_once __DIR__ . '/auth.php';
}

function generateCaptchaChallenge(string $context = 'default'): array
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $len = strlen($alphabet);
    $code = '';
    for ($i = 0; $i < 5; $i++) {
        $code .= $alphabet[random_int(0, $len - 1)];
    }

    $_SESSION['svcoer_captcha'][$context] = [
        'answer'    => $code,
        'expiresAt' => time() + 600,
    ];

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
        'svgDataUrl' => 'data:image/svg+xml;base64,' . base64_encode($svg),
    ];
}

function verifyCaptchaAnswer(?string $submitted, string $context = 'default'): bool
{
    $entry = $_SESSION['svcoer_captcha'][$context] ?? null;
    unset($_SESSION['svcoer_captcha'][$context]); // strictly single-use
    if (!is_array($entry) || empty($entry['answer'])) {
        return false;
    }
    if ((int)($entry['expiresAt'] ?? 0) < time()) {
        return false;
    }
    $clean = strtoupper(preg_replace('/\s+/', '', (string)$submitted));
    return $clean !== '' && hash_equals((string)$entry['answer'], $clean);
}

function renderCaptchaWidget(string $context, string $refreshEndpoint, string $label = 'Security CAPTCHA Verification *'): string
{
    $ch = generateCaptchaChallenge($context);
    $uid = preg_replace('/[^a-z0-9_-]/i', '_', $context);
    $safeRefresh = htmlspecialchars($refreshEndpoint, ENT_QUOTES, 'UTF-8');
    $safeCtx = htmlspecialchars($context, ENT_QUOTES, 'UTF-8');
    $safeLabel = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
    $safeImg = htmlspecialchars($ch['svgDataUrl'], ENT_QUOTES, 'UTF-8');

    return '<div class="captcha-box" style="padding:0.7rem 0.85rem;border:1px solid #D6D3D1;border-radius:10px;background:#FAFAF9;margin-bottom:0.85rem;">'
        . '<div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.45rem;">'
        . '<label for="captcha-input-' . $uid . '" style="font-size:0.75rem;font-weight:700;color:#44403C;margin:0;">' . $safeLabel . '</label>'
        . '<button type="button" data-captcha-refresh="' . $safeCtx . '" data-captcha-target="captcha-img-' . $uid . '" data-captcha-url="' . $safeRefresh . '" style="font-size:0.72rem;font-weight:600;padding:0.22rem 0.55rem;border:1px solid #D6D3D1;border-radius:6px;background:#FFFFFF;color:#1C1917;cursor:pointer;">&#8635; Refresh</button>'
        . '</div>'
        . '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.65rem;">'
        . '<img id="captcha-img-' . $uid . '" src="' . $safeImg . '" alt="CAPTCHA security image" style="height:46px;width:176px;border-radius:7px;border:1px solid #CBD5E1;background:#FFFFFF;display:block;flex-shrink:0;">'
        . '<input type="hidden" name="captcha_context" value="' . $safeCtx . '">'
        . '<input id="captcha-input-' . $uid . '" type="text" name="captcha_answer" required maxlength="8" autocomplete="off" placeholder="Enter 5-character code" style="flex:1;min-width:150px;padding:0.52rem 0.7rem;border:1px solid #D6D3D1;border-radius:8px;background:#FFFFFF;text-transform:uppercase;letter-spacing:0.12em;font-family:monospace;font-size:0.9rem;">'
        . '</div>'
        . '</div>'
        . '<script>(function(){var btn=document.querySelector(\'[data-captcha-target="captcha-img-' . $uid . '"]\');if(!btn||btn.dataset.bound==="1")return;btn.dataset.bound="1";btn.addEventListener("click",function(){var u=btn.getAttribute("data-captcha-url")+"?refresh=1&ctx="+encodeURIComponent(btn.getAttribute("data-captcha-refresh"));fetch(u,{credentials:"same-origin"}).then(function(r){return r.json();}).then(function(d){if(d&&d.svgDataUrl){var img=document.getElementById("captcha-img-' . $uid . '");if(img)img.src=d.svgDataUrl;var inp=document.getElementById("captcha-input-' . $uid . '");if(inp)inp.value="";}});});})();</script>';
}

// Direct AJAX JSON refresh endpoint when called directly via includes/captcha.php?refresh=1&ctx=...
if (isset($_GET['refresh']) && basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'captcha.php') {
    $ctx = preg_replace('/[^a-z0-9_-]/i', '_', (string)($_GET['ctx'] ?? 'default')) ?: 'default';
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(generateCaptchaChallenge($ctx), JSON_UNESCAPED_SLASHES);
    exit;
}
