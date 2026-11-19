<?php
declare(strict_types=1);

/**
 * SVCOER PHP CMS — Transactional Email Dispatcher (PHP mail() / Pure-PHP SMTP TLS-SSL / Webhook Relay)
 * Zero external composer dependencies required on Ubuntu Webmin / Apache servers.
 */

if (!function_exists('defaultEmailPushConfig')) {
    function defaultEmailPushConfig(): array
    {
        return [
            'enabled'                      => true,
            'transportMode'                => 'php_mail',
            'fromName'                     => 'SVCOER Pandharpur (Autonomous) Portal',
            'fromEmail'                    => 'noreply@coe.sveri.ac.in',
            'replyToEmail'                 => 'principal@coe.sveri.ac.in',
            'smtpHost'                     => 'smtp.gmail.com',
            'smtpPort'                     => 587,
            'smtpEncryption'               => 'tls',
            'smtpUsername'                 => '',
            'smtpPassword'                 => '',
            'webhookRelayUrl'              => '',
            'alertRecipientEmails'         => 'principal@coe.sveri.ac.in, itadmin@coe.sveri.ac.in',
            'reportRecipientEmails'        => 'principal@coe.sveri.ac.in, iqac@coe.sveri.ac.in, itadmin@coe.sveri.ac.in',
            'pushOnNewFeedback'            => true,
            'pushOnNewGrievance'           => true,
            'pushOnSecurityAlert'          => true,
            'enableScheduledVisitorDigest' => false,
            'digestFrequency'              => 'daily',
            'lastDigestSentAt'             => '',
        ];
    }
}

if (!function_exists('getEmailPushConfig')) {
    function getEmailPushConfig(PDO $pdo): array
    {
        $def = defaultEmailPushConfig();
        try {
            $stmt = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'email_push_config' LIMIT 1");
            $stmt->execute();
            $raw = $stmt->fetchColumn();
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $merged = array_merge($def, $decoded);
                    $merged['enabled'] = !empty($merged['enabled']);
                    $merged['smtpPort'] = max(1, min(65535, (int)($merged['smtpPort'] ?? 587)));
                    if (!in_array($merged['transportMode'] ?? '', ['php_mail', 'smtp', 'webhook'], true)) {
                        $merged['transportMode'] = 'php_mail';
                    }
                    if (!in_array($merged['smtpEncryption'] ?? '', ['tls', 'ssl', 'none'], true)) {
                        $merged['smtpEncryption'] = 'tls';
                    }
                    $merged['pushOnNewFeedback'] = !empty($merged['pushOnNewFeedback']);
                    $merged['pushOnNewGrievance'] = !empty($merged['pushOnNewGrievance']);
                    $merged['pushOnSecurityAlert'] = !empty($merged['pushOnSecurityAlert']);
                    $merged['enableScheduledVisitorDigest'] = !empty($merged['enableScheduledVisitorDigest']);
                    $merged['digestFrequency'] = ($merged['digestFrequency'] ?? 'daily') === 'weekly' ? 'weekly' : 'daily';
                    return $merged;
                }
            }
        } catch (Throwable $ignored) {
        }
        return $def;
    }
}

if (!function_exists('saveEmailPushConfig')) {
    function saveEmailPushConfig(PDO $pdo, array $next, bool $preservePasswordIfBlank = true): array
    {
        $current = getEmailPushConfig($pdo);
        $merged = array_merge($current, $next);
        if ($preservePasswordIfBlank && isset($next['smtpPassword']) && trim((string)$next['smtpPassword']) === '' && empty($next['clearSmtpPassword'])) {
            $merged['smtpPassword'] = (string)($current['smtpPassword'] ?? '');
        }
        unset($merged['clearSmtpPassword']);
        $merged['enabled'] = !empty($merged['enabled']);
        $merged['smtpPort'] = max(1, min(65535, (int)($merged['smtpPort'] ?? 587)));
        if (!in_array($merged['transportMode'] ?? '', ['php_mail', 'smtp', 'webhook'], true)) {
            $merged['transportMode'] = 'php_mail';
        }
        if (!in_array($merged['smtpEncryption'] ?? '', ['tls', 'ssl', 'none'], true)) {
            $merged['smtpEncryption'] = 'tls';
        }
        $merged['pushOnNewFeedback'] = !empty($merged['pushOnNewFeedback']);
        $merged['pushOnNewGrievance'] = !empty($merged['pushOnNewGrievance']);
        $merged['pushOnSecurityAlert'] = !empty($merged['pushOnSecurityAlert']);
        $merged['enableScheduledVisitorDigest'] = !empty($merged['enableScheduledVisitorDigest']);
        $merged['digestFrequency'] = ($merged['digestFrequency'] ?? 'daily') === 'weekly' ? 'weekly' : 'daily';

        try {
            $json = json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $pdo->prepare("INSERT INTO cms_kv_store (key_name, val_json) VALUES ('email_push_config', ?) ON DUPLICATE KEY UPDATE val_json = VALUES(val_json)")
                ->execute([$json ?: '{}']);
        } catch (Throwable $ignored) {
        }
        return $merged;
    }
}

if (!function_exists('cms_sanitize_header_value')) {
    function cms_sanitize_header_value(string $val): string
    {
        $clean = str_ireplace(["\r", "\n", "%0a", "%0d", "\0"], ' ', $val);
        return trim($clean);
    }
}

if (!function_exists('cms_parse_email_list')) {
    function cms_parse_email_list(string $csv): array
    {
        $parts = preg_split('/[,;\s]+/', trim($csv)) ?: [];
        $valid = [];
        foreach ($parts as $raw) {
            $em = cms_sanitize_header_value($raw);
            if ($em !== '' && filter_var($em, FILTER_VALIDATE_EMAIL) !== false) {
                $valid[$em] = $em;
            }
        }
        return array_values($valid);
    }
}

if (!function_exists('cms_smtp_expect')) {
    function cms_smtp_expect($fp, array $expectedCodes, string &$lastLine = ''): bool
    {
        $response = '';
        while (!feof($fp)) {
            $line = @fgets($fp, 1024);
            if ($line === false) {
                break;
            }
            $response .= $line;
            $lastLine = trim($line);
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }
        if ($response === '') {
            $lastLine = 'Empty SMTP server response';
            return false;
        }
        $code = (int)substr($response, 0, 3);
        return in_array($code, $expectedCodes, true);
    }
}

if (!function_exists('cms_smtp_send')) {
    function cms_smtp_send(array $config, array $toList, array $ccList, string $subject, string $bodyText): array
    {
        $host = trim((string)($config['smtpHost'] ?? ''));
        $port = max(1, min(65535, (int)($config['smtpPort'] ?? 587)));
        $enc  = (string)($config['smtpEncryption'] ?? 'tls');
        $user = trim((string)($config['smtpUsername'] ?? ''));
        $pass = (string)($config['smtpPassword'] ?? '');

        if ($host === '') {
            return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP host is empty.'];
        }

        $remote = ($enc === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
        $ctx = stream_context_create([
            'ssl' => [
                'verify_peer'       => false,
                'verify_peer_name'  => false,
                'allow_self_signed' => true,
            ],
        ]);
        $errno = 0;
        $errstr = '';
        $fp = @stream_socket_client($remote, $errno, $errstr, 12, STREAM_CLIENT_CONNECT, $ctx);
        if (!$fp) {
            return ['ok' => false, 'status' => 'failed', 'detail' => "SMTP connect error ($errno): $errstr"];
        }
        @stream_set_timeout($fp, 12);

        $last = '';
        if (!cms_smtp_expect($fp, [220], $last)) {
            @fclose($fp);
            return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP greeting failed: ' . $last];
        }

        $ehloHost = preg_replace('/[^a-zA-Z0-9.-]/', '', (string)($_SERVER['HTTP_HOST'] ?? 'localhost')) ?: 'localhost';
        fwrite($fp, "EHLO {$ehloHost}\r\n");
        if (!cms_smtp_expect($fp, [250], $last)) {
            @fclose($fp);
            return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP EHLO failed: ' . $last];
        }

        if ($enc === 'tls') {
            fwrite($fp, "STARTTLS\r\n");
            if (!cms_smtp_expect($fp, [220], $last)) {
                @fclose($fp);
                return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP STARTTLS failed: ' . $last];
            }
            $cryptoOk = @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if (!$cryptoOk) {
                @fclose($fp);
                return ['ok' => false, 'status' => 'failed', 'detail' => 'Unable to negotiate TLS encryption with SMTP server.'];
            }
            fwrite($fp, "EHLO {$ehloHost}\r\n");
            if (!cms_smtp_expect($fp, [250], $last)) {
                @fclose($fp);
                return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP post-TLS EHLO failed: ' . $last];
            }
        }

        if ($user !== '') {
            fwrite($fp, "AUTH LOGIN\r\n");
            if (!cms_smtp_expect($fp, [334], $last)) {
                @fclose($fp);
                return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP AUTH LOGIN rejected: ' . $last];
            }
            fwrite($fp, base64_encode($user) . "\r\n");
            if (!cms_smtp_expect($fp, [334], $last)) {
                @fclose($fp);
                return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP username rejected: ' . $last];
            }
            fwrite($fp, base64_encode($pass) . "\r\n");
            if (!cms_smtp_expect($fp, [235], $last)) {
                @fclose($fp);
                return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP authentication failed: ' . $last];
            }
        }

        $fromEmail = cms_sanitize_header_value((string)($config['fromEmail'] ?? 'noreply@coe.sveri.ac.in'));
        if (filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false) {
            $fromEmail = 'noreply@coe.sveri.ac.in';
        }
        $fromName = cms_sanitize_header_value((string)($config['fromName'] ?? 'SVCOER Portal'));
        $replyTo  = cms_sanitize_header_value((string)($config['replyToEmail'] ?? $fromEmail));
        if (filter_var($replyTo, FILTER_VALIDATE_EMAIL) === false) {
            $replyTo = $fromEmail;
        }

        fwrite($fp, "MAIL FROM:<{$fromEmail}>\r\n");
        if (!cms_smtp_expect($fp, [250], $last)) {
            @fclose($fp);
            return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP MAIL FROM rejected: ' . $last];
        }

        $allRcpts = array_values(array_unique(array_merge($toList, $ccList)));
        foreach ($allRcpts as $rcpt) {
            fwrite($fp, "RCPT TO:<{$rcpt}>\r\n");
            if (!cms_smtp_expect($fp, [250, 251], $last)) {
                @fclose($fp);
                return ['ok' => false, 'status' => 'failed', 'detail' => "SMTP RCPT TO <{$rcpt}> rejected: {$last}"];
            }
        }

        fwrite($fp, "DATA\r\n");
        if (!cms_smtp_expect($fp, [354], $last)) {
            @fclose($fp);
            return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP DATA rejected: ' . $last];
        }

        $cleanSubject = cms_sanitize_header_value($subject);
        $encodedSubject = '=?UTF-8?B?' . base64_encode($cleanSubject) . '?=';
        $msgId = '<' . bin2hex(random_bytes(8)) . '@' . $ehloHost . '>';
        $headers = [
            'Date: ' . gmdate('r'),
            'Message-ID: ' . $msgId,
            'From: "' . addslashes($fromName) . "\" <{$fromEmail}>",
            'Reply-To: ' . $replyTo,
            'To: ' . implode(', ', $toList),
        ];
        if (!empty($ccList)) {
            $headers[] = 'Cc: ' . implode(', ', $ccList);
        }
        $headers[] = 'Subject: ' . $encodedSubject;
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
        $headers[] = 'Content-Transfer-Encoding: 8bit';

        $normalizedBody = str_replace(["\r\n", "\r"], "\n", $bodyText);
        $normalizedBody = str_replace("\n.", "\n..", $normalizedBody);
        $crlfBody = str_replace("\n", "\r\n", $normalizedBody);

        $wire = implode("\r\n", $headers) . "\r\n\r\n" . $crlfBody . "\r\n.\r\n";
        fwrite($fp, $wire);
        if (!cms_smtp_expect($fp, [250], $last)) {
            @fclose($fp);
            return ['ok' => false, 'status' => 'failed', 'detail' => 'SMTP message body rejected: ' . $last];
        }

        fwrite($fp, "QUIT\r\n");
        @fclose($fp);
        return ['ok' => true, 'status' => 'sent', 'detail' => 'Delivered via SMTP (' . $host . ':' . $port . ')'];
    }
}

if (!function_exists('cms_send_raw_email')) {
    function cms_send_raw_email(array $config, string $toCsv, string $subject, string $bodyText, string $ccCsv = ''): array
    {
        $mode = (string)($config['transportMode'] ?? 'php_mail');
        if (empty($config['enabled'])) {
            return ['ok' => false, 'mode' => $mode, 'status' => 'queued', 'detail' => 'Automated email push disabled in Admin Settings; logged locally only.'];
        }

        $toList = cms_parse_email_list($toCsv);
        $ccList = cms_parse_email_list($ccCsv);
        if (empty($toList) && !empty($ccList)) {
            $toList = [array_shift($ccList)];
        }
        if (empty($toList)) {
            return ['ok' => false, 'mode' => $mode, 'status' => 'failed', 'detail' => 'No valid recipient email address provided.'];
        }

        $cleanSubject = cms_sanitize_header_value($subject);
        $fromEmail = cms_sanitize_header_value((string)($config['fromEmail'] ?? 'noreply@coe.sveri.ac.in'));
        if (filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false) {
            $fromEmail = 'noreply@coe.sveri.ac.in';
        }
        $fromName = cms_sanitize_header_value((string)($config['fromName'] ?? 'SVCOER Portal'));
        $replyTo  = cms_sanitize_header_value((string)($config['replyToEmail'] ?? $fromEmail));
        if (filter_var($replyTo, FILTER_VALIDATE_EMAIL) === false) {
            $replyTo = $fromEmail;
        }

        if ($mode === 'webhook') {
            $hook = trim((string)($config['webhookRelayUrl'] ?? ''));
            if ($hook === '' || preg_match('#^https?://#i', $hook) !== 1) {
                return ['ok' => false, 'mode' => 'webhook', 'status' => 'failed', 'detail' => 'Webhook relay URL is missing or invalid.'];
            }
            $payload = json_encode([
                'to'           => $toList,
                'cc'           => $ccList,
                'fromName'     => $fromName,
                'fromEmail'    => $fromEmail,
                'replyToEmail' => $replyTo,
                'subject'      => $cleanSubject,
                'text'         => $bodyText,
                'sentAt'       => gmdate('c'),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            $httpCode = 0;
            $errText = '';
            if (function_exists('curl_init')) {
                $ch = curl_init($hook);
                curl_setopt_array($ch, [
                    CURLOPT_POST           => true,
                    CURLOPT_POSTFIELDS     => $payload,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT        => 10,
                    CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'Accept: application/json'],
                ]);
                @curl_exec($ch);
                $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $errText = (string)curl_error($ch);
                curl_close($ch);
            } else {
                $ctx = stream_context_create([
                    'http' => [
                        'method'  => 'POST',
                        'header'  => "Content-Type: application/json\r\n",
                        'content' => $payload,
                        'timeout' => 10,
                        'ignore_errors' => true,
                    ],
                ]);
                @file_get_contents($hook, false, $ctx);
                if (!empty($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0], $m)) {
                    $httpCode = (int)$m[1];
                }
            }
            if ($httpCode >= 200 && $httpCode < 300) {
                return ['ok' => true, 'mode' => 'webhook', 'status' => 'sent', 'detail' => "Dispatched via Webhook HTTP {$httpCode}"];
            }
            return ['ok' => false, 'mode' => 'webhook', 'status' => 'failed', 'detail' => 'Webhook dispatch failed' . ($httpCode > 0 ? " (HTTP {$httpCode})" : '') . ($errText !== '' ? ": {$errText}" : '')];
        }

        if ($mode === 'smtp') {
            $res = cms_smtp_send($config, $toList, $ccList, $cleanSubject, $bodyText);
            $res['mode'] = 'smtp';
            return $res;
        }

        // Default: php_mail() (Ubuntu Postfix / Sendmail via Webmin)
        $headers = [
            'From: "' . addslashes($fromName) . "\" <{$fromEmail}>",
            'Reply-To: ' . $replyTo,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'X-Mailer: SVCOER-CMS-PHP/' . PHP_VERSION,
        ];
        if (!empty($ccList)) {
            $headers[] = 'Cc: ' . implode(', ', $ccList);
        }
        $encodedSubject = '=?UTF-8?B?' . base64_encode($cleanSubject) . '?=';
        $sent = @mail(implode(', ', $toList), $encodedSubject, $bodyText, implode("\r\n", $headers));
        if ($sent) {
            return ['ok' => true, 'mode' => 'php_mail', 'status' => 'sent', 'detail' => 'Accepted by server PHP mail()/sendmail daemon.'];
        }
        return ['ok' => false, 'mode' => 'php_mail', 'status' => 'queued', 'detail' => 'Local mail() returned false (check Postfix/Sendmail on Webmin or switch to SMTP/Webhook).'];
    }
}

if (!function_exists('cms_dispatch_and_log_email')) {
    function cms_dispatch_and_log_email(PDO $pdo, string $category, string $toCsv, string $subject, string $bodyText, string $detailPrefix = '', string $ccCsv = '', ?array $overrideConfig = null): array
    {
        $config = $overrideConfig ?: getEmailPushConfig($pdo);
        $res = cms_send_raw_email($config, $toCsv, $subject, $bodyText, $ccCsv);

        $allRecipients = trim($toCsv . ($ccCsv !== '' ? ' (CC: ' . $ccCsv . ')' : ''));
        $detail = ($detailPrefix !== '' ? $detailPrefix . ' · ' : '') . ($res['detail'] ?? '');

        try {
            $pdo->prepare(
                'INSERT INTO email_dispatch_logs (category, recipients, subject, transport_mode, status, detail, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )->execute([
                substr($category, 0, 80),
                substr($allRecipients, 0, 500),
                substr($subject, 0, 260),
                substr((string)($res['mode'] ?? 'php_mail'), 0, 32),
                in_array($res['status'] ?? '', ['sent', 'queued', 'failed'], true) ? $res['status'] : 'queued',
                substr($detail, 0, 480),
                gmdate('Y-m-d H:i:s'),
            ]);
        } catch (Throwable $ignored) {
        }

        $res['detail'] = $detail;
        return $res;
    }
}

if (!function_exists('cms_send_visitor_logs_report')) {
    function cms_send_visitor_logs_report(PDO $pdo, string $trigger = 'manual', ?array $overrideConfig = null): array
    {
        $config = $overrideConfig ?: getEmailPushConfig($pdo);
        $hits = function_exists('getHitCounterStats') ? getHitCounterStats($pdo) : ['totalHits' => 0, 'todayHits' => 0, 'uniqueVisitors' => 0];
        $logs = function_exists('queryFilteredVisitorLogs') ? queryFilteredVisitorLogs($pdo, ['dateRange' => 'all'], 350) : [];
        $agg  = function_exists('aggregatePhpVisitorLogs') ? aggregatePhpVisitorLogs($logs) : [
            'totalMatched' => count($logs), 'uniqueIps' => 0, 'threats' => 0, 'byCountry' => [], 'byState' => [], 'byPath' => []
        ];

        $lines = [
            'SVCOER PANDHARPUR — VISITOR TRAFFIC & LOG ANALYZER REPORT',
            'Trigger: ' . strtoupper($trigger) . ' | Generated (UTC): ' . gmdate('Y-m-d H:i:s'),
            str_repeat('=', 66),
            sprintf('Cumulative Site Hits: %s | Today: %s | Unique Visitors: %s', number_format((int)$hits['totalHits']), number_format((int)$hits['todayHits']), number_format((int)$hits['uniqueVisitors'])),
            sprintf('Analyzed Log Window: %d requests | Unique IPs: %d | Blocked/Security Alerts: %d', (int)$agg['totalMatched'], (int)$agg['uniqueIps'], (int)$agg['threats']),
            '',
            '--- Top Countries ---',
        ];
        foreach (array_slice($agg['byCountry'] ?? [], 0, 8) as $c) {
            $lines[] = sprintf('  - %s (%s): %d hits · %d unique IPs · %d threats', $c['country'], $c['countryCode'], $c['hits'], $c['uniqueIps'], $c['threats']);
        }
        $lines[] = '';
        $lines[] = '--- Top States / Regions ---';
        foreach (array_slice($agg['byState'] ?? [], 0, 8) as $s) {
            $lines[] = sprintf('  - %s, %s: %d hits (%d alerts)', $s['state'], $s['country'], $s['hits'], $s['threats']);
        }
        $lines[] = '';
        $lines[] = '--- Most Visited Routes ---';
        foreach (array_slice($agg['byPath'] ?? [], 0, 10, true) as $p => $cnt) {
            $lines[] = sprintf('  - %s : %d visits', $p, $cnt);
        }
        $lines[] = '';
        $lines[] = 'Managed via SVCOER Admin Console -> Log Analyzer & Email Push Center.';

        $subject = '[SVCOER Analytics] Website Traffic & GeoIP Log Report (' . gmdate('Y-m-d') . ')';
        $to = trim((string)($config['reportRecipientEmails'] ?? ''));
        $res = cms_dispatch_and_log_email($pdo, 'visitor_logs_report', $to, $subject, implode("\n", $lines), 'Trigger: ' . $trigger, '', $config);

        saveEmailPushConfig($pdo, ['lastDigestSentAt' => gmdate('c')], true);
        return $res;
    }
}

if (!function_exists('cms_send_security_alert_report')) {
    function cms_send_security_alert_report(PDO $pdo, string $trigger = 'manual', ?array $overrideConfig = null): array
    {
        $config = $overrideConfig ?: getEmailPushConfig($pdo);
        $logs = function_exists('queryFilteredVisitorLogs') ? queryFilteredVisitorLogs($pdo, ['dateRange' => 'all'], 350) : [];
        $threats = array_values(array_filter($logs, static function ($r): bool {
            return in_array((string)($r['event_type'] ?? ''), ['waf_block', 'rate_limit', 'failed_login'], true)
                || in_array((string)($r['severity'] ?? ''), ['warning', 'critical'], true);
        }));
        $blockedIps = [];
        try {
            $blockedIps = $pdo->query('SELECT ip, reason, blocked_at FROM security_blocked_ips ORDER BY id DESC LIMIT 20')->fetchAll() ?: [];
        } catch (Throwable $ignored) {
        }

        $lines = [
            'SVCOER PANDHARPUR — WAF & SECURITY AUDIT DIGEST',
            'Trigger: ' . strtoupper($trigger) . ' | Generated (UTC): ' . gmdate('Y-m-d H:i:s'),
            str_repeat('=', 66),
            'Flagged Security Events (recent window): ' . count($threats),
            'Actively Blocked IPs: ' . count($blockedIps),
            '',
            '--- Recent Threats & Auth Anomalies ---',
        ];
        if (empty($threats)) {
            $lines[] = '  No WAF blocks, rate-limit events, or failed login bursts recorded.';
        } else {
            foreach (array_slice($threats, 0, 15) as $t) {
                $lines[] = sprintf(
                    '  [%s] %s | IP %s (%s/%s) | %s | %s',
                    strtoupper((string)$t['severity']),
                    $t['timestamp_iso'],
                    $t['ip'],
                    $t['country'],
                    $t['state'],
                    $t['event_type'],
                    $t['threat_category'] ?: ($t['note'] ?: $t['path'])
                );
            }
        }
        $lines[] = '';
        $lines[] = '--- Blocked IP Blocklist ---';
        foreach ($blockedIps as $b) {
            $lines[] = sprintf('  - %s : %s (at %s)', $b['ip'], $b['reason'], $b['blocked_at']);
        }

        $subject = '[SVCOER Security Shield] WAF & Intrusion Digest (' . count($threats) . ' events)';
        $to = trim((string)($config['alertRecipientEmails'] ?? ''));
        return cms_dispatch_and_log_email($pdo, 'security_alert', $to, $subject, implode("\n", $lines), 'Trigger: ' . $trigger, '', $config);
    }
}

if (!function_exists('cms_send_feedback_digest_report')) {
    function cms_send_feedback_digest_report(PDO $pdo, ?array $overrideConfig = null): array
    {
        $config = $overrideConfig ?: getEmailPushConfig($pdo);
        $entries = [];
        try {
            $entries = $pdo->query('SELECT tracking_code, section_name, subsection, submission_type, rating, status, subject, submitted_at FROM feedback_entries ORDER BY id DESC LIMIT 40')->fetchAll() ?: [];
        } catch (Throwable $ignored) {
        }

        $lines = [
            'SVCOER PANDHARPUR — STAKEHOLDER COMPLAINT & FEEDBACK DIGEST',
            'Generated (UTC): ' . gmdate('Y-m-d H:i:s'),
            str_repeat('=', 66),
            'Recent Submissions Count: ' . count($entries),
            '',
        ];
        if (empty($entries)) {
            $lines[] = 'No stakeholder feedback or complaint tickets recorded yet.';
        } else {
            foreach ($entries as $f) {
                $lines[] = sprintf(
                    '  - [%s] %s | %s -> %s | %s (%d/5) | %s (%s)',
                    $f['status'],
                    $f['tracking_code'],
                    $f['section_name'],
                    $f['subsection'],
                    $f['submission_type'],
                    (int)$f['rating'],
                    $f['subject'],
                    $f['submitted_at']
                );
            }
        }

        $subject = '[SVCOER Feedback Cell] Stakeholder Feedback & Complaint Summary (' . gmdate('Y-m-d') . ')';
        $to = trim((string)($config['reportRecipientEmails'] ?? ''));
        return cms_dispatch_and_log_email($pdo, 'feedback_digest', $to, $subject, implode("\n", $lines), 'Feedback Digest', '', $config);
    }
}

if (!function_exists('cms_maybe_run_scheduled_digest')) {
    function cms_maybe_run_scheduled_digest(PDO $pdo): void
    {
        static $checked = false;
        if ($checked) {
            return;
        }
        $checked = true;
        $cfg = getEmailPushConfig($pdo);
        if (empty($cfg['enabled']) || empty($cfg['enableScheduledVisitorDigest'])) {
            return;
        }
        $interval = ($cfg['digestFrequency'] ?? 'daily') === 'weekly' ? 604800 : 86400;
        $lastTs = !empty($cfg['lastDigestSentAt']) ? (int)@strtotime((string)$cfg['lastDigestSentAt']) : 0;
        if ($lastTs > 0 && (time() - $lastTs) < $interval) {
            return;
        }
        // Mark timestamp immediately to avoid stampede across concurrent requests
        saveEmailPushConfig($pdo, ['lastDigestSentAt' => gmdate('c')], true);
        cms_send_visitor_logs_report($pdo, 'scheduled_' . ($cfg['digestFrequency'] ?? 'daily'), $cfg);
    }
}
