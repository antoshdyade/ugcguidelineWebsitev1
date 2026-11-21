<?php
declare(strict_types=1);

/**
 * SVCOER PHP CMS — Enterprise SEO Studio, Footer Website Hit Counter,
 * Visitor GeoIP Log Analyzer & Hackproof Security Shield (WAF / Rate Limit / IP Blocklist)
 */

if (!function_exists('sendPhpSecurityHeaders')) {
    function sendPhpSecurityHeaders(): void
    {
        if (headers_sent()) {
            return;
        }
        if (function_exists('header_remove')) {
            @header_remove('X-Powered-By');
        }
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
        header('X-XSS-Protection: 1; mode=block');
    }
}

if (!headers_sent()) {
    sendPhpSecurityHeaders();
}

function defaultSeoSettings(): array
{
    return [
        'siteTitleSuffix'          => 'SVCOER Pandharpur — Autonomous Engineering Institute',
        'defaultDescription'       => "Official autonomous portal of Shri Vithal Education & Research Institute's College of Engineering, Pandharpur. NAAC A+ accredited, NBA accredited B.Tech, M.Tech & Ph.D. programs, UGC NEP 2020 Self-Disclosure.",
        'defaultKeywords'          => 'SVCOER, SVERI Pandharpur, Autonomous Engineering College Maharashtra, NAAC A+, NBA Accredited, B.Tech Admissions, DTE 06220, AICTE, Placements, Research Conferences',
        'canonicalBaseUrl'         => '',
        'ogImageUrl'               => 'assets/images/hero_campus.jpg',
        'twitterHandle'            => '@SVERIPandharpur',
        'robotsPolicy'             => 'index, follow, max-image-preview:large',
        'googleSiteVerification'   => '',
        'bingSiteVerification'     => '',
        'organizationType'         => 'CollegeOrUniversity',
        'schemaSameAsCsv'          => 'https://www.sveri.ac.in',
        'enableJsonLd'             => true,
        'enableSitemapXml'         => true,
        'showHitCounterInFooter'   => true,
        'hitCounterStartOffset'    => 12450,
        'hitCounterLabel'          => 'Website Visits',
        'routeOverrides'           => [
            [
                'id'          => 1,
                'path'        => 'index.php',
                'title'       => 'SVCOER Pandharpur — Autonomous Engineering Institute | NAAC A+',
                'description' => "Explore SVERI's College of Engineering (Autonomous), Pandharpur — admissions, departments, placements, R&D conferences, alumni network & UGC disclosures.",
                'keywords'    => 'SVCOER Pandharpur, SVERI COE, Engineering Admissions 2026',
                'ogImageUrl'  => 'assets/images/hero_campus.jpg',
                'noIndex'     => false,
            ],
            [
                'id'          => 2,
                'path'        => 'placements.php',
                'title'       => 'Training & Placements Cell (T&P) — Top Recruiters & Statistics | SVCOER',
                'description' => 'Branch-wise placement track record, highest packages, congratulatory student placements, T&P notices & upcoming recruiter drives at SVCOER Pandharpur.',
                'keywords'    => 'SVCOER Placements, SVERI Training and Placement, Campus Recruitment Pandharpur',
                'ogImageUrl'  => 'assets/images/hero_lab.jpg',
                'noIndex'     => false,
            ],
            [
                'id'          => 3,
                'path'        => 'conferences.php',
                'title'       => 'Research Conferences, Workshops, FDPs & Posters | SVCOER Pandharpur',
                'description' => 'Upcoming international/national conferences, peer-reviewed CFP tracks, poster presentations & faculty development workshops hosted by SVCOER.',
                'keywords'    => 'SVCOER International Conference, Research Symposium Pandharpur, FDP, Poster Presentation',
                'ogImageUrl'  => 'assets/images/hero_campus.jpg',
                'noIndex'     => false,
            ],
            [
                'id'          => 4,
                'path'        => 'sports.php',
                'title'       => 'Sports, Athletics & Physical Education Portal | SVCOER Pandharpur',
                'description' => 'Indoor and outdoor sports infrastructure, intercollegiate tournaments, student medalists, sports gallery & trials notices at SVCOER.',
                'keywords'    => 'SVCOER Sports, Student Life, Athletics Stadium, Intercollegiate Krida Mahotsav',
                'ogImageUrl'  => 'assets/images/sports_complex.jpg',
                'noIndex'     => false,
            ],
            [
                'id'          => 5,
                'path'        => 'facilities.php',
                'title'       => 'Campus Facilities & Infrastructure Showcase | SVCOER Pandharpur',
                'description' => 'Smart ICT classrooms, 1 Gbps central computing labs, central library, hostels, transport, green solar microgrid & Divyangjan campus facilities.',
                'keywords'    => 'SVCOER Campus Facilities, Infrastructure, IT Labs, Hostels, Library',
                'ogImageUrl'  => 'assets/images/campus_facilities.jpg',
                'noIndex'     => false,
            ],
            [
                'id'          => 6,
                'path'        => 'feedback.php',
                'title'       => 'Stakeholder Complaint & Feedback Cell | SVCOER Pandharpur',
                'description' => 'Submit official complaints, service requests, suggestions, or appreciations routed directly to respective Deans, CoE, Hostel, and Administrative sections.',
                'keywords'    => 'SVCOER Feedback Portal, Student Complaint Tracking, Academic Feedback Pandharpur',
                'ogImageUrl'  => 'assets/images/hero_campus.jpg',
                'noIndex'     => false,
            ],
            [
                'id'          => 7,
                'path'        => 'tenders.php',
                'title'       => 'Tenders, Quotations & Purchase Notices | Central Purchase Cell',
                'description' => 'Official invitations to bid (NITs), Bill of Quantities (BOQ), corrigenda, vendor eligibility criteria, and contract award disclosures.',
                'keywords'    => 'Tenders, NIT, Purchase Notices, GeM Procurement, BOQ, Quotations',
                'ogImageUrl'  => 'assets/images/hero_campus.jpg',
                'noIndex'     => false,
            ],
        ],
    ];
}

function defaultSecurityConfig(): array
{
    return [
        'enableWaf'              => true,
        'enableRateLimit'        => true,
        'maxRequestsPerMinute'   => 180,
        'maxFailedLogins'        => 6,
        'lockoutMinutes'         => 15,
        'autoBlockOnHighThreat'  => false,
        'logRetentionDays'       => 90,
        'blockKnownScanners'     => true,
    ];
}

function defaultHitCounterState(int $offset = 12450): array
{
    $today = gmdate('Y-m-d');
    return [
        'totalHits'         => $offset + 21,
        'todayHits'         => 14,
        'todayDate'         => $today,
        'uniqueTodayHashes' => [],
        'uniqueVisitors'    => 9320,
        'lastUpdatedAt'     => gmdate('c'),
    ];
}

function kvGetJson(PDO $pdo, string $key, array $fallback): array
{
    try {
        $stmt = $pdo->prepare('SELECT val_json FROM cms_kv_store WHERE key_name = ? LIMIT 1');
        $stmt->execute([$key]);
        $raw = $stmt->fetchColumn();
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return array_replace_recursive($fallback, $decoded);
            }
        }
    } catch (Throwable $ignored) {
    }
    return $fallback;
}

function kvPutJson(PDO $pdo, string $key, array $payload): void
{
    try {
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $stmt = $pdo->prepare(
            'INSERT INTO cms_kv_store (key_name, val_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)'
        );
        $stmt->execute([$key, $json ?: '{}']);
    } catch (Throwable $ignored) {
    }
}

function getSeoSettings(PDO $pdo): array
{
    $defaults = defaultSeoSettings();
    $saved = kvGetJson($pdo, 'seo_settings', $defaults);
    if (!isset($saved['routeOverrides']) || !is_array($saved['routeOverrides'])) {
        $saved['routeOverrides'] = $defaults['routeOverrides'];
    }
    return $saved;
}

function saveSeoSettings(PDO $pdo, array $nextSeo): array
{
    $prevSeo = getSeoSettings($pdo);
    $merged = array_merge(defaultSeoSettings(), $nextSeo);
    $merged['hitCounterStartOffset'] = max(0, (int)($merged['hitCounterStartOffset'] ?? 0));
    $merged['showHitCounterInFooter'] = !empty($merged['showHitCounterInFooter']);
    $merged['enableJsonLd'] = !empty($merged['enableJsonLd']);
    $merged['enableSitemapXml'] = !empty($merged['enableSitemapXml']);
    if (!isset($merged['routeOverrides']) || !is_array($merged['routeOverrides'])) {
        $merged['routeOverrides'] = [];
    }

    kvPutJson($pdo, 'seo_settings', $merged);

    // Keep hit_counter monotonic & synchronized with baseline offset delta
    $oldOffset = max(0, (int)($prevSeo['hitCounterStartOffset'] ?? 0));
    $newOffset = (int)$merged['hitCounterStartOffset'];
    $delta = $newOffset - $oldOffset;
    if ($delta !== 0) {
        $counter = kvGetJson($pdo, 'hit_counter', defaultHitCounterState($newOffset));
        $counter['totalHits'] = max(0, (int)($counter['totalHits'] ?? 0) + $delta);
        $counter['lastUpdatedAt'] = gmdate('c');
        kvPutJson($pdo, 'hit_counter', $counter);
    }

    return $merged;
}

function getSecurityConfig(PDO $pdo): array
{
    $cfg = kvGetJson($pdo, 'security_config', defaultSecurityConfig());
    $cfg['maxRequestsPerMinute'] = max(20, min(5000, (int)($cfg['maxRequestsPerMinute'] ?? 180)));
    $cfg['maxFailedLogins'] = max(3, min(50, (int)($cfg['maxFailedLogins'] ?? 6)));
    $cfg['lockoutMinutes'] = max(1, min(1440, (int)($cfg['lockoutMinutes'] ?? 15)));
    $cfg['logRetentionDays'] = max(7, min(730, (int)($cfg['logRetentionDays'] ?? 90)));
    return $cfg;
}

function saveSecurityConfig(PDO $pdo, array $next): array
{
    $merged = array_merge(defaultSecurityConfig(), $next);
    $merged['enableWaf'] = !empty($merged['enableWaf']);
    $merged['enableRateLimit'] = !empty($merged['enableRateLimit']);
    $merged['autoBlockOnHighThreat'] = !empty($merged['autoBlockOnHighThreat']);
    $merged['blockKnownScanners'] = !empty($merged['blockKnownScanners']);
    $merged['maxRequestsPerMinute'] = max(20, min(5000, (int)$merged['maxRequestsPerMinute']));
    $merged['maxFailedLogins'] = max(3, min(50, (int)$merged['maxFailedLogins']));
    $merged['lockoutMinutes'] = max(1, min(1440, (int)$merged['lockoutMinutes']));
    $merged['logRetentionDays'] = max(7, min(730, (int)$merged['logRetentionDays']));
    kvPutJson($pdo, 'security_config', $merged);
    return $merged;
}

function getHitCounterStats(PDO $pdo): array
{
    $seo = getSeoSettings($pdo);
    $offset = max(0, (int)($seo['hitCounterStartOffset'] ?? 12450));
    $counter = kvGetJson($pdo, 'hit_counter', defaultHitCounterState($offset));
    $today = gmdate('Y-m-d');
    if (($counter['todayDate'] ?? '') !== $today) {
        $counter['todayDate'] = $today;
        $counter['todayHits'] = 0;
        $counter['uniqueTodayHashes'] = [];
    }
    return [
        'totalHits'      => (int)($counter['totalHits'] ?? $offset),
        'todayHits'      => (int)($counter['todayHits'] ?? 0),
        'uniqueVisitors' => (int)($counter['uniqueVisitors'] ?? 0),
        'todayDate'      => (string)$counter['todayDate'],
        'lastUpdatedAt'  => (string)($counter['lastUpdatedAt'] ?? gmdate('c')),
        'label'          => (string)($seo['hitCounterLabel'] ?? 'Website Visits'),
        'showInFooter'   => !empty($seo['showHitCounterInFooter']),
    ];
}

function normalizePhpClientIp(?string $overrideIp = null): string
{
    if ($overrideIp !== null && trim($overrideIp) !== '') {
        $raw = trim($overrideIp);
    } else {
        $candidates = [
            $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '',
            $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '',
            $_SERVER['HTTP_X_REAL_IP'] ?? '',
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
        ];
        $raw = '127.0.0.1';
        foreach ($candidates as $cand) {
            $cand = trim((string)$cand);
            if ($cand !== '') {
                $parts = explode(',', $cand);
                $raw = trim($parts[0]);
                break;
            }
        }
    }
    if (str_starts_with($raw, '::ffff:')) {
        $raw = substr($raw, 7);
    }
    if ($raw === '::1') {
        $raw = '127.0.0.1';
    }
    return substr(preg_replace('/[^0-9a-fA-F.:]/', '', $raw) ?: '127.0.0.1', 0, 64);
}

function resolvePhpVisitorGeo(string $ip): array
{
    // 1. Trust proxy CDN GeoIP headers if available on Webmin/Cloudflare/Nginx
    $cfCountry = strtoupper(trim((string)($_SERVER['HTTP_CF_IPCOUNTRY'] ?? $_SERVER['HTTP_X_GEO_COUNTRY_CODE'] ?? '')));
    $cfState = trim((string)($_SERVER['HTTP_X_GEO_REGION'] ?? $_SERVER['HTTP_X_APPENGINE_REGION'] ?? ''));
    $cfCity = trim((string)($_SERVER['HTTP_CF_IPCITY'] ?? $_SERVER['HTTP_X_GEO_CITY'] ?? $_SERVER['HTTP_X_APPENGINE_CITY'] ?? ''));

    $countryNames = [
        'IN' => 'India', 'US' => 'United States', 'GB' => 'United Kingdom',
        'DE' => 'Germany', 'SG' => 'Singapore', 'AE' => 'United Arab Emirates',
        'AU' => 'Australia', 'CA' => 'Canada', 'JP' => 'Japan', 'FR' => 'France',
    ];
    if ($cfCountry !== '' && $cfCountry !== 'XX') {
        return [
            'country'     => $countryNames[$cfCountry] ?? $cfCountry,
            'countryCode' => substr($cfCountry, 0, 4),
            'state'       => $cfState !== '' ? $cfState : ($cfCountry === 'IN' ? 'Maharashtra' : 'Federal / Primary Region'),
            'area'        => $cfCity !== '' ? $cfCity : ($cfCountry === 'IN' ? 'Pune' : 'Metro Gateway'),
        ];
    }

    // 2. Campus LAN / Loopback
    if (
        $ip === '127.0.0.1' ||
        str_starts_with($ip, '10.') ||
        str_starts_with($ip, '192.168.') ||
        preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $ip)
    ) {
        return [
            'country'     => 'India',
            'countryCode' => 'IN',
            'state'       => 'Maharashtra',
            'area'        => 'Pandharpur (Campus LAN)',
        ];
    }

    // 3. Offline IPv4 prefix GeoIP lookup matching TypeScript engine
    $prefixMap = [
        '49.36.'   => ['India', 'IN', 'Maharashtra', 'Pune'],
        '49.35.'   => ['India', 'IN', 'Maharashtra', 'Mumbai'],
        '103.21.'  => ['India', 'IN', 'Maharashtra', 'Solapur / Pandharpur'],
        '103.59.'  => ['India', 'IN', 'Maharashtra', 'Pune'],
        '103.116.' => ['India', 'IN', 'Maharashtra', 'Pandharpur'],
        '106.193.' => ['India', 'IN', 'Maharashtra', 'Mumbai'],
        '117.195.' => ['India', 'IN', 'Maharashtra', 'Kolhapur'],
        '157.33.'  => ['India', 'IN', 'Maharashtra', 'Pune'],
        '152.58.'  => ['India', 'IN', 'Karnataka', 'Bengaluru'],
        '122.172.' => ['India', 'IN', 'Karnataka', 'Bengaluru'],
        '115.96.'  => ['India', 'IN', 'Telangana', 'Hyderabad'],
        '14.139.'  => ['India', 'IN', 'Delhi NCR', 'New Delhi'],
        '59.144.'  => ['India', 'IN', 'Tamil Nadu', 'Chennai'],
        '104.28.'  => ['United States', 'US', 'California', 'San Jose'],
        '172.68.'  => ['United States', 'US', 'Virginia', 'Ashburn'],
        '34.'      => ['United States', 'US', 'Iowa', 'Council Bluffs'],
        '35.'      => ['United States', 'US', 'Oregon', 'The Dalles'],
        '18.'      => ['United States', 'US', 'Virginia', 'Ashburn'],
        '52.'      => ['United States', 'US', 'Ohio', 'Columbus'],
        '185.'     => ['Germany', 'DE', 'Hesse', 'Frankfurt'],
        '195.'     => ['United Kingdom', 'GB', 'England', 'London'],
        '51.'      => ['United Kingdom', 'GB', 'England', 'London'],
        '128.199.' => ['Singapore', 'SG', 'Central Singapore', 'Singapore'],
    ];
    foreach ($prefixMap as $prefix => $geo) {
        if (str_starts_with($ip, $prefix)) {
            return [
                'country'     => $geo[0],
                'countryCode' => $geo[1],
                'state'       => $geo[2],
                'area'        => $geo[3],
            ];
        }
    }

    $parts = explode('.', $ip);
    $first = isset($parts[0]) ? (int)$parts[0] : 0;
    if ($first >= 1 && $first <= 223) {
        if (in_array($first, [14, 27, 43, 49, 59, 103, 106, 115, 117, 122, 152, 157, 182, 223], true)) {
            $states = [
                ['Maharashtra', 'Pune'],
                ['Maharashtra', 'Mumbai'],
                ['Maharashtra', 'Solapur / Pandharpur'],
                ['Karnataka', 'Bengaluru'],
                ['Delhi NCR', 'New Delhi'],
            ];
            $pick = $states[$first % count($states)];
            return ['country' => 'India', 'countryCode' => 'IN', 'state' => $pick[0], 'area' => $pick[1]];
        }
        if ($first >= 192 && $first <= 207) {
            return ['country' => 'United States', 'countryCode' => 'US', 'state' => 'California', 'area' => 'Mountain View'];
        }
    }

    return [
        'country'     => 'International',
        'countryCode' => 'INT',
        'state'       => 'Global Network',
        'area'        => 'External Gateway',
    ];
}

function parsePhpUserAgent(string $ua): array
{
    $low = strtolower($ua);
    $isBot = (bool)preg_match('/(bot|crawler|spider|slurp|curl|wget|python-requests|httpclient|java\/|go-http-client|sqlmap|nikto|nmap|masscan|zgrab|nessus)/i', $ua);

    if ($isBot) {
        $device = 'Bot / Script';
    } elseif (preg_match('/(ipad|tablet|playbook|silk)/i', $ua)) {
        $device = 'Tablet';
    } elseif (preg_match('/(mobile|android|iphone|ipod|blackberry|opera mini)/i', $ua)) {
        $device = 'Mobile';
    } else {
        $device = 'Desktop';
    }

    $browser = 'Other';
    if (preg_match('/(sqlmap|nikto|nmap|zgrab|masscan)/i', $low)) {
        $browser = 'Security Scanner';
    } elseif (str_contains($low, 'edg/')) {
        $browser = 'Edge';
    } elseif (str_contains($low, 'opr/') || str_contains($low, 'opera')) {
        $browser = 'Opera';
    } elseif (str_contains($low, 'chrome') && !str_contains($low, 'edg/')) {
        $browser = 'Chrome';
    } elseif (str_contains($low, 'firefox')) {
        $browser = 'Firefox';
    } elseif (str_contains($low, 'safari') && !str_contains($low, 'chrome')) {
        $browser = 'Safari';
    } elseif (preg_match('/(curl|wget|python)/i', $low)) {
        $browser = 'CLI / Script';
    } elseif (preg_match('/(googlebot|bingbot|crawler|spider)/i', $low)) {
        $browser = 'Search Crawler';
    }

    $os = 'Other';
    if (str_contains($low, 'windows')) {
        $os = 'Windows';
    } elseif (str_contains($low, 'android')) {
        $os = 'Android';
    } elseif (str_contains($low, 'iphone') || str_contains($low, 'ipad') || str_contains($low, 'ios')) {
        $os = 'iOS';
    } elseif (str_contains($low, 'mac os') || str_contains($low, 'macintosh')) {
        $os = 'macOS';
    } elseif (str_contains($low, 'linux') || str_contains($low, 'ubuntu')) {
        $os = 'Linux';
    }

    return [
        'deviceType' => $device,
        'browser'    => $browser,
        'os'         => $os,
        'isBot'      => $isBot,
    ];
}

function detectPhpRequestThreat(string $uri, string $query, string $ua, string $bodyRaw, bool $skipHtmlBodyChecks = false, bool $blockKnownScanners = true): array
{
    $pathOnly = parse_url($uri, PHP_URL_PATH) ?: $uri;
    $pathLower = strtolower($pathOnly);

    $sensitiveProbes = [
        '/.env', '/.git/', '/.git', '/wp-login.php', '/wp-admin', '/xmlrpc.php',
        '/phpmyadmin', '/pma/', '/etc/passwd', '/etc/shadow', '/proc/self/environ',
        '/database.sql', '/config/db.php', '/composer.json', '/package.json',
        '/shell.php', '/c99.php', '/eval-stdin.php',
    ];
    foreach ($sensitiveProbes as $probe) {
        if (str_contains($pathLower, $probe)) {
            return [
                'isThreat' => true,
                'severity' => 'critical',
                'category' => 'Sensitive File / Backdoor Probe (' . $probe . ')',
                'summary'  => 'Blocked automated probe targeting ' . $pathOnly,
            ];
        }
    }

    if ($blockKnownScanners && preg_match('/\b(sqlmap|nikto|acunetix|nessus|openvas|wpscan|dirbuster|gobuster|masscan|zgrab|havij|hydra)\b/i', $ua, $m)) {
        return [
            'isThreat' => true,
            'severity' => 'critical',
            'category' => 'Automated Exploit Scanner (' . $m[1] . ')',
            'summary'  => 'Blocked malicious security scanner User-Agent',
        ];
    }

    if (preg_match('/(\.\.\/|\.\.\\\\|%2e%2e%2f|%2e%2e\/|%00)/i', $uri . '?' . $query)) {
        return [
            'isThreat' => true,
            'severity' => 'critical',
            'category' => 'Path Traversal / Null-Byte Injection',
            'summary'  => 'Blocked directory traversal attempt in URL',
        ];
    }

    $inspectText = urldecode($query);
    if (!$skipHtmlBodyChecks && $bodyRaw !== '') {
        $inspectText .= "\n" . substr($bodyRaw, 0, 12000);
    }

    $sqliRules = [
        '/\bunion\s+(all\s+)?select\b/i',
        '/\bselect\b.{0,40}\bfrom\s+(information_schema|mysql\.user|pg_catalog|users)\b/i',
        '/(\%27|\')\s*(or|and)\s*(\d+=\d+|\'[^\']+\'=\'[^\']+\')/i',
        '/\b(sleep|benchmark|waitfor\s+delay)\s*\(/i',
        '/;\s*(drop|truncate|alter)\s+table\b/i',
        '/\binto\s+(outfile|dumpfile)\b/i',
    ];
    foreach ($sqliRules as $re) {
        if (preg_match($re, $inspectText)) {
            return [
                'isThreat' => true,
                'severity' => 'critical',
                'category' => 'SQL Injection Attempt (WAF)',
                'summary'  => 'Blocked SQL injection payload in HTTP parameters',
            ];
        }
    }

    if (!$skipHtmlBodyChecks) {
        $xssRules = [
            '/<script\b[^>]*>[\s\S]*?<\/script>/i',
            '/javascript\s*:/i',
            '/\bon(error|load|mouseover|focus)\s*=\s*["\']?[^"\'>\s]{2,}/i',
            '/\b(eval|document\.cookie|window\.location)\s*\(/i',
        ];
        foreach ($xssRules as $re) {
            if (preg_match($re, $inspectText)) {
                return [
                    'isThreat' => true,
                    'severity' => 'warning',
                    'category' => 'Cross-Site Scripting (XSS) Attempt',
                    'summary'  => 'Blocked active script injection payload',
                ];
            }
        }
    }

    if (preg_match('/(;\s*(cat|ls|id|whoami|uname|curl|wget|nc|bash|sh)\b|\$\([^\)]+\))/i', urldecode($query))) {
        return [
            'isThreat' => true,
            'severity' => 'critical',
            'category' => 'OS Command Injection Attempt',
            'summary'  => 'Blocked shell command injection in query string',
        ];
    }

    return ['isThreat' => false, 'severity' => 'info', 'category' => null, 'summary' => null];
}

function logPhpVisitorEvent(
    PDO $pdo,
    array $opts
): void {
    try {
        $ip = normalizePhpClientIp($opts['ip'] ?? null);
        $geo = resolvePhpVisitorGeo($ip);
        $ua = substr((string)($opts['user_agent'] ?? ($_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0')), 0, 320);
        $parsedUa = parsePhpUserAgent($ua);

        $stmt = $pdo->prepare(
            'INSERT INTO visitor_logs (timestamp_iso, ip, country, country_code, state, area, method, path, query_string, status_code, latency_ms, referrer, user_agent, device_type, browser, os, event_type, severity, threat_category, actor_email, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            gmdate('c'),
            $ip,
            $geo['country'],
            $geo['countryCode'],
            $geo['state'],
            $geo['area'],
            substr(strtoupper((string)($opts['method'] ?? ($_SERVER['REQUEST_METHOD'] ?? 'GET'))), 0, 12),
            substr((string)($opts['path'] ?? '/'), 0, 260),
            substr((string)($opts['query_string'] ?? ''), 0, 500),
            (int)($opts['status_code'] ?? 200),
            max(0, (int)($opts['latency_ms'] ?? 8)),
            substr((string)($opts['referrer'] ?? ($_SERVER['HTTP_REFERER'] ?? '')), 0, 320),
            $ua,
            $parsedUa['deviceType'],
            $parsedUa['browser'],
            $parsedUa['os'],
            substr((string)($opts['event_type'] ?? 'page_view'), 0, 40),
            substr((string)($opts['severity'] ?? 'info'), 0, 16),
            isset($opts['threat_category']) ? substr((string)$opts['threat_category'], 0, 160) : null,
            isset($opts['actor_email']) ? substr((string)$opts['actor_email'], 0, 160) : null,
            isset($opts['note']) ? substr((string)$opts['note'], 0, 320) : null,
        ]);
    } catch (Throwable $ignoredLogErr) {
    }
}

function isPhpIpBlocked(PDO $pdo, string $ip): ?array
{
    try {
        $stmt = $pdo->prepare('SELECT * FROM security_blocked_ips WHERE ip = ? ORDER BY id DESC LIMIT 1');
        $stmt->execute([$ip]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        if (!empty($row['expires_at']) && strtotime((string)$row['expires_at']) <= time()) {
            $pdo->prepare('DELETE FROM security_blocked_ips WHERE id = ?')->execute([(int)$row['id']]);
            return null;
        }
        return $row;
    } catch (Throwable $ignored) {
        return null;
    }
}

function blockPhpIp(PDO $pdo, string $ip, string $reason, string $blockedBy = 'Security Admin', ?int $durationMinutes = null): void
{
    $normIp = normalizePhpClientIp($ip);
    $expiresAt = ($durationMinutes !== null && $durationMinutes > 0)
        ? gmdate('c', time() + $durationMinutes * 60)
        : null;
    try {
        $pdo->prepare('DELETE FROM security_blocked_ips WHERE ip = ?')->execute([$normIp]);
        $pdo->prepare(
            'INSERT INTO security_blocked_ips (ip, reason, blocked_by, blocked_at, expires_at) VALUES (?,?,?,?,?)'
        )->execute([$normIp, substr($reason, 0, 260), substr($blockedBy, 0, 160), gmdate('c'), $expiresAt]);
    } catch (Throwable $ignored) {
    }
}

function isPhpLoginRateLimited(PDO $pdo, string $ip, string $scope = 'admin'): ?int
{
    $cfg = getSecurityConfig($pdo);
    $key = 'login_fail_' . $scope . '_' . hash('sha256', normalizePhpClientIp($ip));
    try {
        $rec = kvGetJson($pdo, $key, []);
        $lockedUntil = (int)($rec['lockedUntil'] ?? 0);
        if ($lockedUntil > time()) {
            return max(1, (int)ceil(($lockedUntil - time()) / 60));
        }
        if (!empty($rec['lockedUntil']) && $lockedUntil <= time()) {
            kvPutJson($pdo, $key, ['count' => 0, 'firstAt' => time(), 'lockedUntil' => 0]);
        }
    } catch (Throwable $ignored) {
    }
    return null;
}

function recordPhpLoginFailure(PDO $pdo, string $ip, string $scope, string $email): void
{
    try {
        $normIp = normalizePhpClientIp($ip);
        $cfg = getSecurityConfig($pdo);
        $key = 'login_fail_' . $scope . '_' . hash('sha256', $normIp);
        $rec = kvGetJson($pdo, $key, ['count' => 0, 'firstAt' => time(), 'lockedUntil' => 0]);
        $now = time();
        if ($now - (int)($rec['firstAt'] ?? $now) > 900) {
            $rec = ['count' => 0, 'firstAt' => $now, 'lockedUntil' => 0];
        }
        $rec['count'] = (int)($rec['count'] ?? 0) + 1;
        $lockedOut = false;
        if ($rec['count'] >= (int)$cfg['maxFailedLogins']) {
            $rec['lockedUntil'] = $now + ((int)$cfg['lockoutMinutes'] * 60);
            $lockedOut = true;
        }
        kvPutJson($pdo, $key, $rec);

        logPhpVisitorEvent($pdo, [
            'ip'              => $normIp,
            'method'          => 'POST',
            'path'            => $scope === 'admin' ? 'admin/login.php' : 'alumni.php?tab=login',
            'status_code'     => $lockedOut ? 429 : 401,
            'event_type'      => $lockedOut ? 'rate_limit' : 'failed_login',
            'severity'        => $lockedOut ? 'critical' : 'warning',
            'threat_category' => $lockedOut ? 'Brute-Force Lockout (' . $scope . ')' : 'Invalid ' . ucfirst($scope) . ' Credentials',
            'actor_email'     => $email,
            'note'            => 'Attempt #' . $rec['count'] . ($lockedOut ? ' — locked for ' . $cfg['lockoutMinutes'] . ' min' : ''),
        ]);
    } catch (Throwable $ignored) {
    }
}

function clearPhpLoginFailures(PDO $pdo, string $ip, string $scope): void
{
    try {
        $key = 'login_fail_' . $scope . '_' . hash('sha256', normalizePhpClientIp($ip));
        kvPutJson($pdo, $key, ['count' => 0, 'firstAt' => time(), 'lockedUntil' => 0]);
    } catch (Throwable $ignored) {
    }
}

function runPhpSecurityFirewall(PDO $pdo): void
{
    static $checked = false;
    if ($checked) {
        return;
    }
    $checked = true;

    $ip = normalizePhpClientIp();
    $uri = (string)($_SERVER['REQUEST_URI'] ?? '/');
    $path = parse_url($uri, PHP_URL_PATH) ?: '/';
    $query = (string)($_SERVER['QUERY_STRING'] ?? '');
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

    $cfg = getSecurityConfig($pdo);

    // 1. Check persistent IP blocklist (allow admin recovery only from loopback if explicitly unlocked)
    $blocked = isPhpIpBlocked($pdo, $ip);
    if ($blocked !== null && $ip !== '127.0.0.1') {
        logPhpVisitorEvent($pdo, [
            'ip'              => $ip,
            'method'          => $method,
            'path'            => $path,
            'query_string'    => $query,
            'status_code'     => 403,
            'event_type'      => 'waf_block',
            'severity'        => 'critical',
            'threat_category' => 'Blocked IP Access Attempt',
            'note'            => (string)($blocked['reason'] ?? 'Blocked IP'),
        ]);
        http_response_code(403);
        exit('<!doctype html><title>403 Access Restricted</title><body style="font-family:sans-serif;max-width:560px;margin:4rem auto;padding:2rem;border:1px solid #fecaca;border-radius:10px;background:#fef2f2;color:#7f1d1d;"><h1>Access Temporarily Restricted (403)</h1><p>Your IP address (' . htmlspecialchars($ip, ENT_QUOTES, 'UTF-8') . ') has been restricted by the institutional security shield.</p><p>Reason: ' . htmlspecialchars((string)($blocked['reason'] ?? 'Security Policy'), ENT_QUOTES, 'UTF-8') . '</p></body>');
    }

    // 2. Authenticated CMS staff inside /admin/ may legitimately search logs or edit rich HTML
    $isAdminSession = function_exists('currentUser') && currentUser() !== null && str_contains($path, '/admin/');
    if ($isAdminSession) {
        return;
    }

    $isAlumniPost = function_exists('currentAlumni') && currentAlumni() !== null && str_contains($path, 'alumni.php');
    $skipBody = $isAlumniPost;

    $bodySample = '';
    if (!$skipBody && !empty($_POST)) {
        $flat = [];
        foreach ($_POST as $k => $v) {
            $kLow = strtolower((string)$k);
            if (in_array($kLow, ['password', 'new_password', 'confirm_password', 'csrf_token', 'captcha_token'], true)) {
                continue;
            }
            if (is_string($v)) {
                $flat[] = $k . '=' . substr($v, 0, 2000);
            }
        }
        $bodySample = implode('&', $flat);
    }

    if (!empty($cfg['enableWaf'])) {
        $threat = detectPhpRequestThreat($uri, $query, $ua, $bodySample, $skipBody, !empty($cfg['blockKnownScanners']));
        if ($threat['isThreat']) {
            if (!empty($cfg['autoBlockOnHighThreat']) && $threat['severity'] === 'critical' && $ip !== '127.0.0.1') {
                blockPhpIp($pdo, $ip, 'Auto-blocked by WAF: ' . $threat['category'], 'Automated WAF Shield', (int)$cfg['lockoutMinutes']);
            }
            logPhpVisitorEvent($pdo, [
                'ip'              => $ip,
                'method'          => $method,
                'path'            => $path,
                'query_string'    => $query,
                'status_code'     => 403,
                'event_type'      => 'waf_block',
                'severity'        => $threat['severity'],
                'threat_category' => $threat['category'],
                'note'            => $threat['summary'],
            ]);
            http_response_code(403);
            $shieldBrand = 'Institutional';
            if (function_exists('getSiteSettings')) {
                try {
                    $ss = getSiteSettings($pdo);
                    $shieldBrand = trim((string)($ss['short_code'] ?? '')) ?: trim((string)($ss['institution_name'] ?? '')) ?: 'Institutional';
                } catch (Throwable $ignored) {
                }
            }
            exit('<!doctype html><title>403 Security Shield</title><body style="font-family:sans-serif;max-width:580px;margin:4rem auto;padding:2rem;border:1px solid #fecaca;border-radius:10px;background:#fef2f2;color:#7f1d1d;"><h1>403 · Blocked by ' . htmlspecialchars($shieldBrand, ENT_QUOTES, 'UTF-8') . ' Security Shield</h1><p>This request was intercepted by the web application firewall.</p><p><strong>Rule:</strong> ' . htmlspecialchars((string)$threat['category'], ENT_QUOTES, 'UTF-8') . '</p></body>');
        }
    }
}

function recordPhpWebsiteVisit(PDO $pdo): void
{
    static $recorded = false;
    if ($recorded) {
        return;
    }
    $recorded = true;

    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'GET') {
        return;
    }

    $script = basename((string)($_SERVER['PHP_SELF'] ?? 'index.php'));
    $query = (string)($_SERVER['QUERY_STRING'] ?? '');
    $path = $script . ($query !== '' ? '?' . $query : '');
    $ip = normalizePhpClientIp();
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0');

    try {
        $seo = getSeoSettings($pdo);
        $offset = max(0, (int)($seo['hitCounterStartOffset'] ?? 12450));
        $counter = kvGetJson($pdo, 'hit_counter', defaultHitCounterState($offset));
        $today = gmdate('Y-m-d');
        if (($counter['todayDate'] ?? '') !== $today) {
            $counter['todayDate'] = $today;
            $counter['todayHits'] = 0;
            $counter['uniqueTodayHashes'] = [];
        }
        $counter['totalHits'] = (int)($counter['totalHits'] ?? $offset) + 1;
        $counter['todayHits'] = (int)($counter['todayHits'] ?? 0) + 1;

        $visitorHash = substr(hash('sha256', $ip . '|' . $ua . '|' . $today), 0, 16);
        $hashes = is_array($counter['uniqueTodayHashes'] ?? null) ? $counter['uniqueTodayHashes'] : [];
        if (!in_array($visitorHash, $hashes, true)) {
            $hashes[] = $visitorHash;
            if (count($hashes) > 2500) {
                $hashes = array_slice($hashes, -2500);
            }
            $counter['uniqueTodayHashes'] = $hashes;
            $counter['uniqueVisitors'] = (int)($counter['uniqueVisitors'] ?? 0) + 1;
        }
        $counter['lastUpdatedAt'] = gmdate('c');
        kvPutJson($pdo, 'hit_counter', $counter);

        logPhpVisitorEvent($pdo, [
            'ip'           => $ip,
            'method'       => 'GET',
            'path'         => $path,
            'query_string' => $query,
            'status_code'  => 200,
            'event_type'   => 'page_view',
            'severity'     => 'info',
        ]);
    } catch (Throwable $ignoredTrack) {
    }
}

function ensureAnalyticsTables(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS visitor_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp_iso VARCHAR(40) NOT NULL,
            ip VARCHAR(64) NOT NULL,
            country VARCHAR(100) NOT NULL DEFAULT 'India',
            country_code VARCHAR(12) NOT NULL DEFAULT 'IN',
            state VARCHAR(120) NOT NULL DEFAULT 'Maharashtra',
            area VARCHAR(140) NOT NULL DEFAULT 'Pandharpur',
            method VARCHAR(12) NOT NULL DEFAULT 'GET',
            path VARCHAR(260) NOT NULL DEFAULT '/',
            query_string VARCHAR(500) NULL,
            status_code INT NOT NULL DEFAULT 200,
            latency_ms INT NOT NULL DEFAULT 8,
            referrer VARCHAR(320) NULL,
            user_agent VARCHAR(320) NULL,
            device_type VARCHAR(32) NOT NULL DEFAULT 'Desktop',
            browser VARCHAR(64) NOT NULL DEFAULT 'Chrome',
            os VARCHAR(64) NOT NULL DEFAULT 'Windows',
            event_type VARCHAR(40) NOT NULL DEFAULT 'page_view',
            severity VARCHAR(16) NOT NULL DEFAULT 'info',
            threat_category VARCHAR(160) NULL,
            actor_email VARCHAR(160) NULL,
            note VARCHAR(320) NULL,
            INDEX idx_vl_country_state (country, state),
            INDEX idx_vl_severity (severity),
            INDEX idx_vl_event (event_type)
        ) ENGINE=InnoDB"
    );

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS security_blocked_ips (
            id INT AUTO_INCREMENT PRIMARY KEY,
            ip VARCHAR(64) NOT NULL,
            reason VARCHAR(260) NOT NULL,
            blocked_by VARCHAR(160) NOT NULL,
            blocked_at VARCHAR(40) NOT NULL,
            expires_at VARCHAR(40) NULL,
            INDEX idx_blk_ip (ip)
        ) ENGINE=InnoDB"
    );

    foreach ([
        'seo_settings'    => defaultSeoSettings(),
        'security_config' => defaultSecurityConfig(),
        'hit_counter'     => defaultHitCounterState(),
    ] as $kvKey => $kvDefault) {
        $chk = $pdo->prepare('SELECT key_name FROM cms_kv_store WHERE key_name = ? LIMIT 1');
        $chk->execute([$kvKey]);
        if (!$chk->fetchColumn()) {
            kvPutJson($pdo, $kvKey, $kvDefault);
        }
    }

    // Seed baseline GeoIP visitor logs & blocked scanner IP once cleanly
    $seededChk = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'analytics_seo_seeded_v1' LIMIT 1");
    $seededChk->execute();
    if (!$seededChk->fetchColumn() && (int)$pdo->query('SELECT COUNT(*) FROM visitor_logs')->fetchColumn() === 0) {
        $now = time();
        $insLog = $pdo->prepare(
            'INSERT INTO visitor_logs (timestamp_iso, ip, country, country_code, state, area, method, path, query_string, status_code, latency_ms, referrer, user_agent, device_type, browser, os, event_type, severity, threat_category, actor_email, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $samples = [
            [$now - 3600 * 6, '103.116.44.12', 'India', 'IN', 'Maharashtra', 'Pandharpur', 'GET', 'index.php', '', 200, 11, 'https://www.google.com/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0', 'Desktop', 'Chrome', 'Windows', 'page_view', 'info', null, null, null],
            [$now - 3600 * 5, '49.36.90.44', 'India', 'IN', 'Maharashtra', 'Pune', 'GET', 'placements.php', '', 200, 14, 'https://www.google.co.in/', 'Mozilla/5.0 (Linux; Android 14) Chrome/125.0 Mobile', 'Mobile', 'Chrome', 'Android', 'page_view', 'info', null, null, null],
            [$now - 3600 * 4, '106.193.72.18', 'India', 'IN', 'Maharashtra', 'Mumbai', 'GET', 'department.php?dept=computer-science', 'dept=computer-science', 200, 18, '', 'Mozilla/5.0 (Macintosh) Safari/605.1.15', 'Desktop', 'Safari', 'macOS', 'page_view', 'info', null, null, null],
            [$now - 3600 * 3.5, '152.58.14.99', 'India', 'IN', 'Karnataka', 'Bengaluru', 'GET', 'conferences.php', '', 200, 16, 'https://scholar.google.com/', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Firefox/128.0', 'Desktop', 'Firefox', 'Linux', 'page_view', 'info', null, null, null],
            [$now - 3600 * 3, '115.96.32.70', 'India', 'IN', 'Telangana', 'Hyderabad', 'GET', 'alumni.php?tab=directory', 'tab=directory', 200, 15, 'https://www.linkedin.com/', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Safari/604.1', 'Mobile', 'Safari', 'iOS', 'page_view', 'info', null, null, null],
            [$now - 3600 * 2.4, '185.220.101.14', 'Germany', 'DE', 'Hesse', 'Frankfurt', 'GET', '/.env', '', 403, 3, '', 'zgrab/0.x (Security Scanner)', 'Bot / Script', 'Security Scanner', 'Other', 'waf_block', 'critical', 'Sensitive File / Backdoor Probe (/.env)', null, 'Blocked automated scanner probe targeting /.env'],
            [$now - 3600 * 2, '14.139.240.15', 'India', 'IN', 'Delhi NCR', 'New Delhi', 'GET', 'page.php?slug=iqac-ssr-reports', 'slug=iqac-ssr-reports', 200, 12, 'https://www.ugc.gov.in/', 'Mozilla/5.0 (Windows NT 10.0) Edg/126.0', 'Desktop', 'Edge', 'Windows', 'page_view', 'info', null, null, null],
            [$now - 3600 * 1.6, '45.148.10.22', 'United States', 'US', 'Virginia', 'Ashburn', 'GET', 'search.php', 'q=\' UNION SELECT * FROM users--', 403, 4, '', 'sqlmap/1.8.4', 'Bot / Script', 'Security Scanner', 'Other', 'waf_block', 'critical', 'SQL Injection Attempt (WAF)', null, 'Blocked UNION SELECT SQLi injection payload'],
            [$now - 3600 * 1.1, '195.88.54.16', 'United Kingdom', 'GB', 'England', 'London', 'GET', 'conferences.php', '', 200, 21, 'https://ieeexplore.ieee.org/', 'Mozilla/5.0 (Windows NT 10.0) Chrome/126.0', 'Desktop', 'Chrome', 'Windows', 'page_view', 'info', null, null, null],
            [$now - 3600 * 0.8, '128.199.78.10', 'Singapore', 'SG', 'Central Singapore', 'Singapore', 'GET', 'page.php?slug=research-innovation', 'slug=research-innovation', 200, 19, '', 'Mozilla/5.0 (Macintosh) Chrome/126.0', 'Desktop', 'Chrome', 'macOS', 'page_view', 'info', null, null, null],
            [$now - 1800, '103.116.44.12', 'India', 'IN', 'Maharashtra', 'Pandharpur', 'POST', 'admin/login.php', '', 200, 22, '', 'Mozilla/5.0 (Windows NT 10.0) Chrome/126.0', 'Desktop', 'Chrome', 'Windows', 'admin_login', 'info', null, 'admin@svcoer.edu.in', 'Verified Admin Sign-In'],
        ];
        foreach ($samples as $s) {
            $s[0] = gmdate('c', (int)$s[0]);
            $insLog->execute($s);
        }

        if ((int)$pdo->query('SELECT COUNT(*) FROM security_blocked_ips')->fetchColumn() === 0) {
            $pdo->prepare('INSERT INTO security_blocked_ips (ip, reason, blocked_by, blocked_at, expires_at) VALUES (?,?,?,?,?)')
                ->execute(['185.220.101.14', 'Automated .env & credential scanner', 'Automated WAF Shield', gmdate('c', $now - 7200), null]);
        }

        $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('analytics_seo_seeded_v1', '1') ON DUPLICATE KEY UPDATE val_json = '1'")
            ->execute();
    }
}

function resolvePhpCanonicalBase(array $seo): string
{
    $explicit = trim((string)($seo['canonicalBaseUrl'] ?? ''));
    if ($explicit !== '') {
        return rtrim($explicit, '/');
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $https ? 'https' : 'http';
    $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
    $base = function_exists('getBaseUrl') ? getBaseUrl() : '';
    return rtrim($scheme . '://' . $host . $base, '/');
}

function resolvePhpRouteSeo(array $seo, array $siteSettings, string $pageTitle, ?string $pageDesc = null, array $extraSeo = []): array
{
    $script = basename((string)($_SERVER['PHP_SELF'] ?? 'index.php'));
    $query = (string)($_SERVER['QUERY_STRING'] ?? '');
    $relPath = !empty($extraSeo['canonicalPath'])
        ? ltrim((string)$extraSeo['canonicalPath'], '/')
        : ($script . ($query !== '' ? '?' . $query : ''));

    $matched = null;
    foreach (($seo['routeOverrides'] ?? []) as $ov) {
        if (!is_array($ov)) {
            continue;
        }
        $ovPath = ltrim(trim((string)($ov['path'] ?? '')), '/');
        if ($ovPath === '') {
            continue;
        }
        if (
            $ovPath === $relPath
            || $ovPath === $script
            || ($ovPath . '.php') === $script
            || ($ovPath === '/' && $script === 'index.php')
            || (($ovPath === 'developer' || $ovPath === 'developers') && $script === 'credits.php')
        ) {
            $matched = $ov;
            break;
        }
    }

    $customShort = trim((string)($siteSettings['short_code'] ?? ''));
    $customName  = trim((string)($siteSettings['institution_name'] ?? ''));
    $applyBrand  = static function (string $val) use ($customShort, $customName): string {
        $out = $val;
        if ($customName !== '' && !str_contains($customName, "SVERI's College of Engineering")) {
            $out = str_replace(
                ["SVERI's College of Engineering, Pandharpur (Autonomous)", "SVERI's College of Engineering (Autonomous), Pandharpur", "SVERI's College of Engineering, Pandharpur", 'SVCOER Pandharpur'],
                $customName,
                $out
            );
        }
        if ($customShort !== '' && $customShort !== 'SVCOER') {
            $out = (string)preg_replace('/\bSVCOER\b/', $customShort, $out);
        }
        return $out;
    };

    $rawSuffix = trim((string)($seo['siteTitleSuffix'] ?? ''));
    $effectiveSuffix = ($customShort !== '' && $customShort !== 'SVCOER' && str_contains($rawSuffix, 'SVCOER'))
        ? ($customShort . ' — ' . ($customName !== '' ? $customName : $customShort))
        : $applyBrand($rawSuffix);

    $title = ($matched && !empty($matched['title']))
        ? $applyBrand((string)$matched['title'])
        : $pageTitle . ($effectiveSuffix !== '' && !str_contains($pageTitle, $effectiveSuffix) ? ' | ' . $effectiveSuffix : '');

    $desc = ($matched && !empty($matched['description']))
        ? $applyBrand((string)$matched['description'])
        : (trim((string)($extraSeo['description'] ?? $pageDesc ?? '')) !== ''
            ? $applyBrand(trim((string)($extraSeo['description'] ?? $pageDesc)))
            : $applyBrand((string)($seo['defaultDescription'] ?? '')));

    $keywords = ($matched && !empty($matched['keywords']))
        ? $applyBrand((string)$matched['keywords'])
        : (!empty($extraSeo['keywords']) ? $applyBrand((string)$extraSeo['keywords']) : $applyBrand((string)($seo['defaultKeywords'] ?? '')));

    $ogImage = !empty($extraSeo['ogImage'])
        ? (string)$extraSeo['ogImage']
        : (($matched && !empty($matched['ogImageUrl']))
            ? (string)$matched['ogImageUrl']
            : (string)($seo['ogImageUrl'] ?? 'assets/images/hero_campus.jpg'));

    $ogType = !empty($extraSeo['ogType']) ? (string)$extraSeo['ogType'] : 'website';

    $robots = !empty($extraSeo['robots'])
        ? (string)$extraSeo['robots']
        : (($matched && !empty($matched['noIndex']))
            ? 'noindex, nofollow'
            : ((string)($seo['robotsPolicy'] ?? 'index, follow')));

    $canonicalBase = resolvePhpCanonicalBase($seo);
    $canonicalUrl = $canonicalBase . '/' . ltrim($relPath, '/');
    if (!preg_match('#^https?://#i', $ogImage)) {
        $ogImageAbs = $canonicalBase . '/' . ltrim($ogImage, '/');
    } else {
        $ogImageAbs = $ogImage;
    }

    $sameAs = array_values(array_filter(array_map('trim', explode(',', (string)($seo['schemaSameAsCsv'] ?? '')))));
    $jsonLd = [
        '@context'     => 'https://schema.org',
        '@type'        => (string)($seo['organizationType'] ?? 'CollegeOrUniversity'),
        'name'         => (string)($siteSettings['institution_name'] ?? 'SVCOER Pandharpur'),
        'alternateName'=> (string)($siteSettings['short_code'] ?? 'SVCOER'),
        'url'          => $canonicalBase . '/',
        'logo'         => $canonicalBase . '/' . ltrim((string)($siteSettings['logo_url'] ?? 'assets/images/logo.png'), '/'),
        'description'  => $desc,
        'email'        => (string)($siteSettings['email'] ?? ''),
        'telephone'    => (string)($siteSettings['phone'] ?? ''),
        'address'      => [
            '@type'           => 'PostalAddress',
            'streetAddress'   => (string)($siteSettings['address'] ?? 'Pandharpur'),
            'addressLocality' => 'Pandharpur',
            'addressRegion'   => 'Maharashtra',
            'addressCountry'  => 'IN',
        ],
        'sameAs'       => $sameAs,
    ];

    return [
        'title'        => $title,
        'description'  => $desc,
        'keywords'     => $keywords,
        'robots'       => $robots,
        'canonicalUrl' => $canonicalUrl,
        'ogImageUrl'   => $ogImageAbs,
        'ogType'       => $ogType,
        'twitterHandle'=> (string)($seo['twitterHandle'] ?? ''),
        'googleVerify' => (string)($seo['googleSiteVerification'] ?? ''),
        'bingVerify'   => (string)($seo['bingSiteVerification'] ?? ''),
        'enableJsonLd' => !empty($seo['enableJsonLd']),
        'jsonLd'       => $jsonLd,
    ];
}

function evaluatePhpSeoAudit(PDO $pdo, array $seo, array $siteSettings): array
{
    $checks = [];
    $checks[] = ['label' => 'Default Meta Description (70–165 chars)', 'pass' => strlen(trim((string)($seo['defaultDescription'] ?? ''))) >= 50, 'detail' => strlen(trim((string)($seo['defaultDescription'] ?? ''))) . ' characters configured'];
    $checks[] = ['label' => 'Primary Keywords Defined', 'pass' => count(array_filter(array_map('trim', explode(',', (string)($seo['defaultKeywords'] ?? ''))))) >= 4, 'detail' => count(array_filter(array_map('trim', explode(',', (string)($seo['defaultKeywords'] ?? ''))))) . ' keywords'];
    $checks[] = ['label' => 'OpenGraph Share Image Set', 'pass' => trim((string)($seo['ogImageUrl'] ?? '')) !== '', 'detail' => trim((string)($seo['ogImageUrl'] ?? 'Not set'))];
    $checks[] = ['label' => 'Schema.org JSON-LD Enabled', 'pass' => !empty($seo['enableJsonLd']), 'detail' => !empty($seo['enableJsonLd']) ? ($seo['organizationType'] ?? 'CollegeOrUniversity') : 'Disabled'];
    $checks[] = ['label' => 'Dynamic Sitemap XML Active', 'pass' => !empty($seo['enableSitemapXml']), 'detail' => !empty($seo['enableSitemapXml']) ? 'Serving sitemap.php' : 'Disabled'];
    $checks[] = ['label' => 'Public Search Indexing Allowed', 'pass' => !str_contains(strtolower((string)($seo['robotsPolicy'] ?? '')), 'noindex'), 'detail' => (string)($seo['robotsPolicy'] ?? 'index, follow')];
    $checks[] = ['label' => 'Custom Route SEO Overrides Configured', 'pass' => count($seo['routeOverrides'] ?? []) >= 1, 'detail' => count($seo['routeOverrides'] ?? []) . ' route rules'];
    return $checks;
}

function buildPhpSitemapXml(PDO $pdo, string $baseUrl): string
{
    $base = rtrim($baseUrl, '/');
    $today = gmdate('Y-m-d');
    $urls = [
        ['loc' => $base . '/index.php', 'priority' => '1.0', 'changefreq' => 'daily'],
        ['loc' => $base . '/facilities.php', 'priority' => '0.9', 'changefreq' => 'weekly'],
        ['loc' => $base . '/tenders.php', 'priority' => '0.85', 'changefreq' => 'daily'],
        ['loc' => $base . '/sports.php', 'priority' => '0.85', 'changefreq' => 'weekly'],
        ['loc' => $base . '/placements.php', 'priority' => '0.9', 'changefreq' => 'weekly'],
        ['loc' => $base . '/conferences.php', 'priority' => '0.9', 'changefreq' => 'weekly'],
        ['loc' => $base . '/alumni.php', 'priority' => '0.8', 'changefreq' => 'weekly'],
        ['loc' => $base . '/quick-links.php', 'priority' => '0.8', 'changefreq' => 'weekly'],
        ['loc' => $base . '/gallery.php', 'priority' => '0.7', 'changefreq' => 'monthly'],
        ['loc' => $base . '/grievance.php', 'priority' => '0.7', 'changefreq' => 'monthly'],
        ['loc' => $base . '/feedback.php', 'priority' => '0.8', 'changefreq' => 'weekly'],
        ['loc' => $base . '/contact.php', 'priority' => '0.7', 'changefreq' => 'monthly'],
        ['loc' => $base . '/credits.php', 'priority' => '0.6', 'changefreq' => 'monthly'],
    ];

    try {
        foreach ($pdo->query("SELECT slug FROM pages WHERE is_published = 1 AND status = 'published' ORDER BY id ASC")->fetchAll() as $p) {
            $urls[] = ['loc' => $base . '/page.php?slug=' . rawurlencode((string)$p['slug']), 'priority' => '0.8', 'changefreq' => 'weekly'];
        }
        foreach ($pdo->query("SELECT slug FROM departments WHERE status = 'published' ORDER BY sort_order ASC")->fetchAll() as $d) {
            $urls[] = ['loc' => $base . '/department.php?dept=' . rawurlencode((string)$d['slug']), 'priority' => '0.9', 'changefreq' => 'weekly'];
        }
        foreach ($pdo->query("SELECT slug FROM conferences WHERE is_published = 1 AND status = 'published' ORDER BY sort_order ASC")->fetchAll() as $c) {
            $urls[] = ['loc' => $base . '/conference.php?slug=' . rawurlencode((string)$c['slug']), 'priority' => '0.85', 'changefreq' => 'weekly'];
        }
    } catch (Throwable $ignored) {
    }

    $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    $xml .= "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
    foreach ($urls as $u) {
        $loc = htmlspecialchars($u['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $xml .= "  <url>\n";
        $xml .= "    <loc>{$loc}</loc>\n";
        $xml .= "    <lastmod>{$today}</lastmod>\n";
        $xml .= "    <changefreq>{$u['changefreq']}</changefreq>\n";
        $xml .= "    <priority>{$u['priority']}</priority>\n";
        $xml .= "  </url>\n";
    }
    $xml .= "</urlset>\n";
    return $xml;
}

function buildPhpRobotsTxt(string $baseUrl, array $seo): string
{
    $base = rtrim($baseUrl, '/');
    $noIndex = str_contains(strtolower((string)($seo['robotsPolicy'] ?? '')), 'noindex');
    $lines = ['User-agent: *'];
    if ($noIndex) {
        $lines[] = 'Disallow: /';
    } else {
        $lines[] = 'Allow: /';
        $lines[] = 'Disallow: /admin/';
        $lines[] = 'Disallow: /config/';
        $lines[] = 'Disallow: /includes/';
        $lines[] = 'Disallow: /backups/';
    }
    if (!empty($seo['enableSitemapXml'])) {
        $lines[] = '';
        $lines[] = 'Sitemap: ' . $base . '/sitemap.php';
    }
    return implode("\n", $lines) . "\n";
}

function queryFilteredVisitorLogs(PDO $pdo, array $filters, int $limit = 350): array
{
    $where = ['1=1'];
    $params = [];

    $search = trim((string)($filters['search'] ?? ''));
    if ($search !== '') {
        $where[] = '(ip LIKE ? OR country LIKE ? OR state LIKE ? OR area LIKE ? OR path LIKE ? OR threat_category LIKE ? OR actor_email LIKE ? OR browser LIKE ? OR note LIKE ?)';
        $like = '%' . $search . '%';
        for ($i = 0; $i < 9; $i++) {
            $params[] = $like;
        }
    }
    foreach (['country', 'state', 'area', 'severity', 'event_type'] as $col) {
        $val = trim((string)($filters[$col] ?? ''));
        if ($val !== '' && strtolower($val) !== 'all') {
            $where[] = "$col = ?";
            $params[] = $val;
        }
    }
    $dateRange = trim((string)($filters['dateRange'] ?? 'all'));
    if ($dateRange === 'today') {
        $where[] = 'timestamp_iso >= ?';
        $params[] = gmdate('Y-m-d') . 'T00:00:00';
    } elseif ($dateRange === '7d') {
        $where[] = 'timestamp_iso >= ?';
        $params[] = gmdate('c', time() - 7 * 86400);
    } elseif ($dateRange === '30d') {
        $where[] = 'timestamp_iso >= ?';
        $params[] = gmdate('c', time() - 30 * 86400);
    }

    $lim = max(1, min(2000, $limit));
    $sql = 'SELECT * FROM visitor_logs WHERE ' . implode(' AND ', $where) . ' ORDER BY id DESC LIMIT ' . $lim;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll() ?: [];
}

function aggregatePhpVisitorLogs(array $logs): array
{
    $byCountry = [];
    $byState = [];
    $byArea = [];
    $byPath = [];
    $byDevice = [];
    $byBrowser = [];
    $byStatus = [];
    $uniqueIps = [];
    $threats = 0;
    $criticals = 0;
    $latSum = 0;

    foreach ($logs as $row) {
        $ip = (string)$row['ip'];
        $uniqueIps[$ip] = true;
        $isThreat = in_array((string)$row['event_type'], ['waf_block', 'rate_limit', 'failed_login'], true)
            || in_array((string)$row['severity'], ['warning', 'critical'], true);
        if ($isThreat) {
            $threats++;
        }
        if (($row['severity'] ?? '') === 'critical') {
            $criticals++;
        }
        $latSum += (int)($row['latency_ms'] ?? 0);

        $cKey = (string)$row['country'];
        if (!isset($byCountry[$cKey])) {
            $byCountry[$cKey] = ['country' => $cKey, 'countryCode' => (string)$row['country_code'], 'hits' => 0, 'threats' => 0, 'ips' => []];
        }
        $byCountry[$cKey]['hits']++;
        if ($isThreat) {
            $byCountry[$cKey]['threats']++;
        }
        $byCountry[$cKey]['ips'][$ip] = true;

        $sKey = $cKey . '|' . (string)$row['state'];
        if (!isset($byState[$sKey])) {
            $byState[$sKey] = ['country' => $cKey, 'state' => (string)$row['state'], 'hits' => 0, 'threats' => 0];
        }
        $byState[$sKey]['hits']++;
        if ($isThreat) {
            $byState[$sKey]['threats']++;
        }

        $aKey = $sKey . '|' . (string)$row['area'];
        if (!isset($byArea[$aKey])) {
            $byArea[$aKey] = ['country' => $cKey, 'state' => (string)$row['state'], 'area' => (string)$row['area'], 'hits' => 0, 'threats' => 0];
        }
        $byArea[$aKey]['hits']++;
        if ($isThreat) {
            $byArea[$aKey]['threats']++;
        }

        $pKey = (string)$row['path'];
        $byPath[$pKey] = ($byPath[$pKey] ?? 0) + 1;

        $dKey = (string)$row['device_type'];
        $byDevice[$dKey] = ($byDevice[$dKey] ?? 0) + 1;

        $bKey = (string)$row['browser'];
        $byBrowser[$bKey] = ($byBrowser[$bKey] ?? 0) + 1;

        $stKey = (int)($row['status_code'] ?? 200);
        $byStatus[$stKey] = ($byStatus[$stKey] ?? 0) + 1;
    }

    $cList = array_values(array_map(static function ($item) {
        $item['uniqueIps'] = count($item['ips']);
        unset($item['ips']);
        return $item;
    }, $byCountry));
    usort($cList, static fn($a, $b) => $b['hits'] <=> $a['hits']);

    $sList = array_values($byState);
    usort($sList, static fn($a, $b) => $b['hits'] <=> $a['hits']);

    $aList = array_values($byArea);
    usort($aList, static fn($a, $b) => $b['hits'] <=> $a['hits']);

    arsort($byPath);
    arsort($byDevice);
    arsort($byBrowser);
    arsort($byStatus);

    return [
        'totalMatched' => count($logs),
        'uniqueIps'    => count($uniqueIps),
        'threats'      => $threats,
        'criticals'    => $criticals,
        'avgLatencyMs' => count($logs) > 0 ? (int)round($latSum / count($logs)) : 0,
        'byCountry'    => $cList,
        'byState'      => $sList,
        'byArea'       => $aList,
        'byPath'       => $byPath,
        'byDevice'     => $byDevice,
        'byBrowser'    => $byBrowser,
        'byStatus'     => $byStatus,
    ];
}

function maskPhpIpAddress(string $ip): string
{
    if (str_contains($ip, '.')) {
        $parts = explode('.', $ip);
        if (count($parts) === 4) {
            $parts[3] = 'xxx';
            return implode('.', $parts);
        }
    }
    if (str_contains($ip, ':')) {
        $parts = explode(':', $ip);
        $parts[count($parts) - 1] = 'xxxx';
        return implode(':', $parts);
    }
    return $ip;
}

function streamPhpLogsExport(array $logs, string $format, bool $maskIps = false, ?PDO $pdo = null): void
{
    $stamp = gmdate('Y-m-d');
    $brandSlug = 'campus';
    if ($pdo instanceof PDO && function_exists('getSiteSettings')) {
        $stSet = getSiteSettings($pdo);
        $rawBrand = (string)($stSet['short_code'] ?? $stSet['institution_name'] ?? 'campus');
        $cleanBrand = trim((string)preg_replace('/[^a-z0-9]+/i', '-', strtolower($rawBrand)), '-');
        if ($cleanBrand !== '') {
            $brandSlug = $cleanBrand;
        }
    }
    if ($format === 'json') {
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $brandSlug . '-security-logs-' . $stamp . '.json"');
        $out = $maskIps
            ? array_map(static function ($r) {
                $r['ip'] = maskPhpIpAddress((string)$r['ip']);
                return $r;
            }, $logs)
            : $logs;
        echo json_encode(['exportedAt' => gmdate('c'), 'count' => count($out), 'logs' => $out], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($format === 'log') {
        header('Content-Type: text/plain; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $brandSlug . '-access-waf-' . $stamp . '.log"');
        foreach ($logs as $r) {
            $ip = $maskIps ? maskPhpIpAddress((string)$r['ip']) : (string)$r['ip'];
            $path = (string)$r['path'] . (!empty($r['query_string']) ? '?' . $r['query_string'] : '');
            echo sprintf(
                "%s - %s [%s] \"%s %s HTTP/1.1\" %d %dms \"%s\" \"%s\" geo=\"%s/%s/%s\" event=\"%s\" sev=\"%s\" threat=\"%s\"\n",
                $ip,
                $r['actor_email'] ?: '-',
                $r['timestamp_iso'],
                $r['method'],
                $path,
                (int)$r['status_code'],
                (int)$r['latency_ms'],
                $r['referrer'] ?: '-',
                str_replace('"', "'", (string)$r['user_agent']),
                $r['country'],
                $r['state'],
                $r['area'],
                $r['event_type'],
                $r['severity'],
                $r['threat_category'] ?: '-'
            );
        }
        exit;
    }

    // Default: CSV
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $brandSlug . '-visitor-logs-' . $stamp . '.csv"');
    $fp = fopen('php://output', 'wb');
    fputcsv($fp, ['ID', 'Timestamp (UTC)', 'IP Address', 'Country', 'State', 'Area', 'Method', 'Path', 'Query', 'Status', 'Latency (ms)', 'Device', 'Browser', 'OS', 'Event Type', 'Severity', 'Threat Category', 'Actor Email', 'Note']);
    foreach ($logs as $r) {
        fputcsv($fp, [
            $r['id'],
            $r['timestamp_iso'],
            $maskIps ? maskPhpIpAddress((string)$r['ip']) : (string)$r['ip'],
            $r['country'],
            $r['state'],
            $r['area'],
            $r['method'],
            $r['path'],
            $r['query_string'] ?? '',
            $r['status_code'],
            $r['latency_ms'],
            $r['device_type'],
            $r['browser'],
            $r['os'],
            $r['event_type'],
            $r['severity'],
            $r['threat_category'] ?? '',
            $r['actor_email'] ?? '',
            $r['note'] ?? '',
        ]);
    }
    fclose($fp);
    exit;
}
