<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireRoleAccess('settings');
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$msg = '';
$err = '';
$s = getSiteSettings($pdo);
$allowedTabs = ['general', 'header_footer', 'credits', 'social'];
$rawTab = (string)($_GET['tab'] ?? 'general');
$tab = in_array($rawTab, $allowedTabs, true) ? $rawTab : 'general';
if (isset($_GET['edit_social'])) {
    $tab = 'social';
} elseif (isset($_GET['edit_contrib'])) {
    $tab = 'credits';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = (string)($_POST['action'] ?? 'save_site_settings');

    if ($action === 'save_social_link') {
        $tab = 'social';
        $sid = (int)($_POST['social_id'] ?? 0);
        $platform = strtolower(trim((string)($_POST['platform'] ?? 'custom')));
        if (!array_key_exists($platform, socialPlatformCatalog())) {
            $platform = 'custom';
        }
        $label = trim((string)($_POST['label'] ?? ''));
        $url = trim((string)($_POST['url'] ?? ''));
        $handle = trim((string)($_POST['handle'] ?? ''));
        $customSvg = trim((string)($_POST['custom_svg'] ?? ''));
        $isActive = isset($_POST['is_active']) ? 1 : 0;

        if ($label === '' || ($url !== '' && !validateExternalUrl($url))) {
            $err = 'Please provide a valid Social Channel Label and a valid https:// / http:// profile URL.';
        } else {
            if ($sid > 0) {
                $pdo->prepare('UPDATE social_media_links SET platform = ?, label = ?, url = ?, handle = ?, custom_svg = ?, is_active = ? WHERE id = ?')
                    ->execute([$platform, $label, $url, $handle, $customSvg, $isActive, $sid]);
                logAudit($pdo, $user, 'UPDATE_SOCIAL_LINK', 'Social Media', $label);
                $msg = 'Social media profile link updated.';
            } else {
                $nextOrder = ((int)$pdo->query('SELECT COALESCE(MAX(sort_order), 0) FROM social_media_links')->fetchColumn()) + 1;
                $pdo->prepare('INSERT INTO social_media_links (platform, label, url, handle, custom_svg, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    ->execute([$platform, $label, $url, $handle, $customSvg, $isActive, $nextOrder]);
                logAudit($pdo, $user, 'ADD_SOCIAL_LINK', 'Social Media', $label);
                $msg = 'Social media profile link added.';
            }
        }
    } elseif ($action === 'move_social_link' && !empty($_POST['id'])) {
        $tab = 'social';
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 'down' : 'up';
        if (swapSortOrder($pdo, 'social_media_links', (int)$_POST['id'], $dir, null, null, 'id ASC')) {
            $msg = 'Social icon order updated.';
        }
    } elseif ($action === 'toggle_social_link' && !empty($_POST['id'])) {
        $tab = 'social';
        $pdo->prepare('UPDATE social_media_links SET is_active = 1 - is_active WHERE id = ?')->execute([(int)$_POST['id']]);
        logAudit($pdo, $user, 'TOGGLE_SOCIAL_LINK', 'Social Media', 'ID #' . (int)$_POST['id']);
        $msg = 'Social icon visibility toggled.';
    } elseif ($action === 'delete_social_link' && !empty($_POST['id'])) {
        $tab = 'social';
        $pdo->prepare('DELETE FROM social_media_links WHERE id = ?')->execute([(int)$_POST['id']]);
        logAudit($pdo, $user, 'DELETE_SOCIAL_LINK', 'Social Media', 'ID #' . (int)$_POST['id']);
        $msg = 'Social media profile link deleted.';
    } elseif ($action === 'save_social_sharing') {
        $tab = 'social';
        $platformsPosted = $_POST['platforms'] ?? [];
        $platKeys = ['whatsapp', 'linkedin', 'twitter', 'facebook', 'telegram', 'email', 'copyLink', 'nativeShare'];
        $platMap = [];
        foreach ($platKeys as $pk) {
            $platMap[$pk] = !empty($platformsPosted[$pk]);
        }
        saveSocialSharingConfig($pdo, [
            'enabled'           => isset($_POST['sharing_enabled']),
            'showIconsInHeader' => isset($_POST['show_icons_header']),
            'showIconsInFooter' => isset($_POST['show_icons_footer']),
            'showOnPages'       => isset($_POST['show_on_pages']),
            'showOnResearch'    => isset($_POST['show_on_research']),
            'showOnConferences' => isset($_POST['show_on_conferences']),
            'showOnPortals'     => isset($_POST['show_on_portals']),
            'shareHeading'      => trim((string)($_POST['share_heading'] ?? 'Share this update')) ?: 'Share this update',
            'defaultHashtags'   => trim((string)($_POST['default_hashtags'] ?? '')),
            'twitterHandle'     => trim(ltrim((string)($_POST['twitter_handle'] ?? ''), '@')),
            'platforms'         => $platMap,
        ]);
        logAudit($pdo, $user, 'UPDATE_SOCIAL_SHARING', 'Social Sharing', 'Updated global sharing settings');
        $msg = 'Social sharing & OpenGraph governance settings saved.';
    } elseif ($action === 'save_header_config') {
        $tab = 'header_footer';
        saveHeaderConfig($pdo, [
            'showTopUtilityBar'      => isset($_POST['show_top_utility_bar']),
            'utilityTagline'         => trim((string)($_POST['utility_tagline'] ?? 'Autonomous Engineering Campus')),
            'showRegulatoryCodes'    => isset($_POST['show_regulatory_codes']),
            'showAdminButton'        => isset($_POST['show_admin_button']),
            'showInstituteCodeBadge' => isset($_POST['show_institute_code_badge']),
            'showSearchBar'          => isset($_POST['show_search_bar']),
            'showStatutoryBar'       => isset($_POST['show_statutory_bar']),
            'statutoryBarLabel'      => trim((string)($_POST['statutory_bar_label'] ?? 'Statutory & Quick Access:')),
        ]);
        $topLabels = $_POST['tbl_label'] ?? [];
        $topUrls   = $_POST['tbl_url'] ?? [];
        $newTopLinks = [];
        foreach ($topLabels as $idx => $lbl) {
            $l = trim((string)$lbl);
            $u = trim((string)($topUrls[$idx] ?? ''));
            if ($l !== '' || $u !== '') {
                $newTopLinks[] = ['label' => $l ?: $u, 'url' => $u ?: '#'];
            }
        }
        saveTopBarLinks($pdo, $newTopLinks);
        logAudit($pdo, $user, 'UPDATE_HEADER_CONFIG', 'Header Studio', count($newTopLinks) . ' statutory quick links');
        $msg = 'Header visibility settings & statutory quick-access bar saved.';
    } elseif ($action === 'save_footer_config') {
        $tab = 'header_footer';
        $bLabels = $_POST['bbl_label'] ?? [];
        $bUrls   = $_POST['bbl_url'] ?? [];
        $bottomLinks = [];
        foreach ($bLabels as $idx => $lbl) {
            $l = trim((string)$lbl);
            $u = trim((string)($bUrls[$idx] ?? ''));
            if ($l !== '' || $u !== '') {
                $bottomLinks[] = ['label' => $l ?: $u, 'url' => $u ?: '#'];
            }
        }
        saveFooterConfig($pdo, [
            'showContactBlock'     => isset($_POST['show_contact_block']),
            'copyrightText'        => trim((string)($_POST['copyright_text'] ?? '')),
            'complianceNote'       => trim((string)($_POST['compliance_note'] ?? '')),
            'showBottomLinks'      => isset($_POST['show_bottom_links']),
            'bottomBarLinks'       => $bottomLinks,
            'showCreatorCreditBar' => isset($_POST['show_creator_credit_bar']),
            'creatorCreditLabel'   => trim((string)($_POST['creator_credit_label'] ?? 'Designed & Developed by')),
            'creatorCreditName'    => trim((string)($_POST['creator_credit_name'] ?? 'Campus Web & Software Engineering Team')),
            'creatorCreditUrl'     => trim((string)($_POST['creator_credit_url'] ?? 'credits.php')),
        ]);
        if (isset($_POST['footer_columns_json'])) {
            $decodedCols = json_decode((string)$_POST['footer_columns_json'], true);
            if (is_array($decodedCols)) {
                saveFooterColumns($pdo, $decodedCols);
            }
        }
        logAudit($pdo, $user, 'UPDATE_FOOTER_CONFIG', 'Footer Studio', 'Updated footer columns, copyright & creator bar');
        $msg = 'Footer columns, legal/compliance text, bottom links & creator attribution bar saved.';
    } elseif ($action === 'save_credits_meta') {
        $tab = 'credits';
        $currCredits = getCreditsPageConfig($pdo);
        $tsNames = $_POST['ts_name'] ?? [];
        $tsCats  = $_POST['ts_category'] ?? [];
        $tsDescs = $_POST['ts_description'] ?? [];
        $nextStack = [];
        foreach ($tsNames as $idx => $tn) {
            $name = trim((string)$tn);
            if ($name === '') continue;
            $nextStack[] = [
                'name'        => $name,
                'category'    => trim((string)($tsCats[$idx] ?? '')),
                'description' => trim((string)($tsDescs[$idx] ?? '')),
            ];
        }
        saveCreditsPageConfig($pdo, [
            ...$currCredits,
            'eyebrow'                 => trim((string)($_POST['eyebrow'] ?? 'Portal Architecture & Attribution')),
            'pageTitle'               => trim((string)($_POST['page_title'] ?? 'Platform Creators, Developers & Contributors')),
            'pageSubtitle'            => trim((string)($_POST['page_subtitle'] ?? '')),
            'projectVersion'          => trim((string)($_POST['project_version'] ?? '')),
            'releaseYear'             => trim((string)($_POST['release_year'] ?? '')),
            'organizationCredit'      => trim((string)($_POST['organization_credit'] ?? '')),
            'licenseNote'             => trim((string)($_POST['license_note'] ?? '')),
            'acknowledgementsHtml'    => (string)($_POST['acknowledgements_html'] ?? ''),
            'isShareable'             => isset($_POST['is_shareable']),
            'showContributorsSection' => isset($_POST['show_contributors_section']),
            'showTechStackSection'    => isset($_POST['show_tech_stack_section']),
            'techStack'               => $nextStack,
        ]);
        logAudit($pdo, $user, 'UPDATE_CREDITS_META', 'Creators & Credits Page', trim((string)($_POST['page_title'] ?? 'Credits Page')));
        $msg = 'Developers & Contributors page metadata, visibility & tech stack saved.';
    } elseif ($action === 'save_contributor') {
        $tab = 'credits';
        $currCredits = getCreditsPageConfig($pdo);
        $contribs = $currCredits['contributors'] ?? [];
        $cid = (int)($_POST['contrib_id'] ?? 0);
        $cName = trim((string)($_POST['c_name'] ?? ''));
        $cRole = trim((string)($_POST['c_role'] ?? ''));
        $cCatSelect = trim((string)($_POST['c_category'] ?? 'Core Contributor'));
        $cCatCustom = trim((string)($_POST['c_category_custom'] ?? ''));
        $cCategory = ($cCatSelect === '__custom__' && $cCatCustom !== '') ? $cCatCustom : ($cCatSelect !== '__custom__' ? $cCatSelect : 'Core Contributor');
        $cPhoto = trim((string)($_POST['c_photo_url'] ?? ''));
        if (!empty($_FILES['c_photo_file']['name'])) {
            $up = handleCmsUpload($pdo, $_FILES['c_photo_file'], __DIR__ . '/../uploads', 'photo');
            if ($up['ok']) $cPhoto = $up['file_url'];
            else $err = $up['error'];
        }
        if ($err === '') {
            if ($cName === '' || $cRole === '') {
                $err = 'Contributor Name and Role / Title are required.';
            } else {
                $entry = [
                    'id'            => $cid > 0 ? $cid : (max(array_merge([0], array_column($contribs, 'id'))) + 1),
                    'name'          => $cName,
                    'role'          => $cRole,
                    'category'      => $cCategory,
                    'affiliation'   => trim((string)($_POST['c_affiliation'] ?? '')),
                    'email'         => trim((string)($_POST['c_email'] ?? '')),
                    'websiteUrl'    => trim((string)($_POST['c_website_url'] ?? '')),
                    'githubUrl'     => trim((string)($_POST['c_github_url'] ?? '')),
                    'linkedinUrl'   => trim((string)($_POST['c_linkedin_url'] ?? '')),
                    'photoUrl'      => $cPhoto,
                    'bio'           => trim((string)($_POST['c_bio'] ?? '')),
                    'contributions' => trim((string)($_POST['c_contributions'] ?? '')),
                    'isActive'      => isset($_POST['c_is_active']),
                    'sortOrder'     => (int)($_POST['c_sort_order'] ?? (count($contribs) + 1)),
                ];
                $replaced = false;
                foreach ($contribs as $idx => $existingC) {
                    if ((int)($existingC['id'] ?? 0) === $entry['id']) {
                        $contribs[$idx] = $entry;
                        $replaced = true;
                        break;
                    }
                }
                if (!$replaced) {
                    $contribs[] = $entry;
                }
                $currCredits['contributors'] = $contribs;
                saveCreditsPageConfig($pdo, $currCredits);
                logAudit($pdo, $user, $replaced ? 'UPDATE_CONTRIBUTOR' : 'ADD_CONTRIBUTOR', 'Creators & Credits Page', $cName);
                $msg = $replaced ? 'Contributor profile updated.' : 'New contributor added to Developers & Creators page.';
            }
        }
    } elseif ($action === 'move_contributor' && !empty($_POST['cid'])) {
        $tab = 'credits';
        $currCredits = getCreditsPageConfig($pdo);
        $contribs = $currCredits['contributors'] ?? [];
        $cid = (int)$_POST['cid'];
        $dir = ($_POST['dir'] ?? 'up') === 'down' ? 1 : -1;
        foreach ($contribs as $idx => $c) {
            if ((int)($c['id'] ?? 0) === $cid) {
                $targetIdx = $idx + $dir;
                if ($targetIdx >= 0 && $targetIdx < count($contribs)) {
                    $tmp = $contribs[$targetIdx];
                    $contribs[$targetIdx] = $contribs[$idx];
                    $contribs[$idx] = $tmp;
                    foreach ($contribs as $ord => &$row) {
                        $row['sortOrder'] = $ord + 1;
                    }
                    unset($row);
                    $currCredits['contributors'] = $contribs;
                    saveCreditsPageConfig($pdo, $currCredits);
                    $msg = 'Contributor display order updated.';
                }
                break;
            }
        }
    } elseif ($action === 'toggle_contributor' && !empty($_POST['cid'])) {
        $tab = 'credits';
        $currCredits = getCreditsPageConfig($pdo);
        $cid = (int)$_POST['cid'];
        foreach ($currCredits['contributors'] as &$c) {
            if ((int)($c['id'] ?? 0) === $cid) {
                $c['isActive'] = empty($c['isActive']);
                break;
            }
        }
        unset($c);
        saveCreditsPageConfig($pdo, $currCredits);
        $msg = 'Contributor visibility toggled.';
    } elseif ($action === 'delete_contributor' && !empty($_POST['cid'])) {
        $tab = 'credits';
        $currCredits = getCreditsPageConfig($pdo);
        $cid = (int)$_POST['cid'];
        $currCredits['contributors'] = array_values(array_filter(
            $currCredits['contributors'] ?? [],
            static fn(array $c): bool => (int)($c['id'] ?? 0) !== $cid
        ));
        saveCreditsPageConfig($pdo, $currCredits);
        logAudit($pdo, $user, 'DELETE_CONTRIBUTOR', 'Creators & Credits Page', 'Contributor ID #' . $cid);
        $msg = 'Contributor removed from Credits page.';
    } else {
        $tab = 'general';
        $logoUrl = $s['logo_url'] ?? '';
    if (!empty($_FILES['logo_file']['name'])) {
        $up = handleCmsUpload($pdo, $_FILES['logo_file'], __DIR__ . '/../uploads', 'photo');
        if ($up['ok']) $logoUrl = $up['file_url'];
        else $err = $up['error'];
    }
    $aboutImg = $s['about_image_url'] ?? 'assets/images/hero_campus.jpg';
    if (!empty($_FILES['about_image_file']['name'])) {
        $up = handleCmsUpload($pdo, $_FILES['about_image_file'], __DIR__ . '/../uploads', 'photo');
        if ($up['ok']) $aboutImg = $up['file_url'];
        else $err = $up['error'];
    }

    if ($err === '') {
        $homeSections = [
            'showTicker' => isset($_POST['sec_ticker']) ? 1 : 0,
            'showSlider' => isset($_POST['sec_slider']) ? 1 : 0,
            'showStatsAndRecognitions' => isset($_POST['sec_stats']) ? 1 : 0,
            'showAboutAndDownloads' => isset($_POST['sec_about']) ? 1 : 0,
            'showApprovedAndVision' => isset($_POST['sec_approved']) ? 1 : 0,
            'showLeadershipDesk' => isset($_POST['sec_leadership']) ? 1 : 0,
            'showExaminationSpotlight' => isset($_POST['sec_exam']) ? 1 : 0,
            'showDepartments' => isset($_POST['sec_departments']) ? 1 : 0,
            'showCategoriesDirectory' => isset($_POST['sec_categories']) ? 1 : 0,
            'showEventsAndRecruiters' => isset($_POST['sec_events']) ? 1 : 0,
            'examSpotlightTitle' => trim($_POST['exam_spotlight_title'] ?? 'Autonomous Examination Portal (CoE)'),
            'departmentsTitle' => trim($_POST['departments_title'] ?? 'Academic Departments'),
            'categoriesTitle' => trim($_POST['categories_title'] ?? 'Statutory Self-Disclosure & Autonomous Portals'),
        ];
        $statsRows = [];
        $statLabels = $_POST['stat_label'] ?? [];
        $statValues = $_POST['stat_value'] ?? [];
        foreach ($statLabels as $idx => $lbl) {
            $lbl = trim((string)$lbl);
            $val = trim((string)($statValues[$idx] ?? ''));
            if ($lbl !== '' && $val !== '') {
                $statsRows[] = ['label' => $lbl, 'value' => $val];
            }
        }

        $approvedBodiesRows = [];
        $abNames = $_POST['ab_name'] ?? [];
        $abSubtitles = $_POST['ab_subtitle'] ?? [];
        $abHrefs = $_POST['ab_href'] ?? [];
        foreach ($abNames as $idx => $abName) {
            $abName = trim((string)$abName);
            $abSub = trim((string)($abSubtitles[$idx] ?? ''));
            $abHref = trim((string)($abHrefs[$idx] ?? ''));
            if ($abName !== '') {
                $approvedBodiesRows[] = [
                    'name' => $abName,
                    'subtitle' => $abSub,
                    'href' => $abHref !== '' ? $abHref : 'page.php?slug=about-overview',
                ];
            }
        }

        $prevShort = trim((string)($s['short_code'] ?? 'SVCOER'));
        $prevName  = trim((string)($s['institution_name'] ?? ''));
        $newShort  = trim((string)($_POST['short_code'] ?? ''));
        $newName   = trim((string)($_POST['institution_name'] ?? ''));

        $stmt = $pdo->prepare(
            'UPDATE site_settings SET trust_name = ?, institution_name = ?, short_code = ?, logo_url = ?, affiliation = ?, aicte_code = ?, dte_code = ?, address = ?, phone = ?, email = ?, emergency_helpline = ?, anti_ragging_helpline = ?, primary_color = ?, secondary_color = ?, about_summary = ?, about_image_url = ?, vision_text = ?, mission_text = ?, recruiters = ?, home_sections_json = ?, highlights_json = ?, approved_bodies_json = ? WHERE id = 1'
        );
        $stmt->execute([
            trim($_POST['trust_name']),
            $newName,
            $newShort,
            $logoUrl,
            trim($_POST['affiliation']),
            trim($_POST['aicte_code']),
            trim($_POST['dte_code']),
            trim($_POST['address']),
            trim($_POST['phone']),
            trim($_POST['email']),
            trim($_POST['emergency_helpline']),
            trim($_POST['anti_ragging_helpline']),
            trim($_POST['primary_color']),
            trim($_POST['secondary_color']),
            trim($_POST['about_summary']),
            $aboutImg,
            trim($_POST['vision_text']),
            trim($_POST['mission_text']),
            trim($_POST['recruiters']),
            json_encode($homeSections, JSON_UNESCAPED_UNICODE),
            json_encode($statsRows, JSON_UNESCAPED_UNICODE),
            json_encode($approvedBodiesRows, JSON_UNESCAPED_UNICODE),
        ]);
        $maxPhotoMb = max(0.25, min(25.0, (float)($_POST['max_photo_mb'] ?? ($s['max_photo_mb'] ?? 2.0))));
        $maxDocMb   = max(0.5, min(50.0, (float)($_POST['max_doc_mb'] ?? ($s['max_doc_mb'] ?? 10.0))));
        $autoCrop   = isset($_POST['auto_crop_enabled']) ? 1 : 0;
        $designPayload = [
            'design_preset' => trim((string)($_POST['design_preset'] ?? 'heritage-navy')),
            'font_heading'  => trim((string)($_POST['font_heading'] ?? "'Playfair Display', Georgia, serif")),
            'font_body'     => trim((string)($_POST['font_body'] ?? "'Plus Jakarta Sans', system-ui, sans-serif")),
            'card_radius'   => in_array($_POST['card_radius'] ?? 'rounded', ['sharp', 'rounded', 'soft'], true) ? $_POST['card_radius'] : 'rounded',
            'header_style'  => ($_POST['header_style'] ?? 'classic') === 'compact' ? 'compact' : 'classic',
            'custom_css'    => trim((string)($_POST['custom_css'] ?? '')),
        ];
        try {
            $pdo->exec('CREATE TABLE IF NOT EXISTS cms_kv_store (key_name VARCHAR(80) PRIMARY KEY, val_json MEDIUMTEXT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)');
            $pdo->prepare("REPLACE INTO cms_kv_store (key_name, val_json) VALUES ('upload_policy', ?)")
                ->execute([json_encode(['max_photo_mb' => $maxPhotoMb, 'max_doc_mb' => $maxDocMb, 'auto_crop_enabled' => $autoCrop])]);
            $pdo->prepare("REPLACE INTO cms_kv_store (key_name, val_json) VALUES ('design_settings', ?)")
                ->execute([json_encode($designPayload, JSON_UNESCAPED_UNICODE)]);

            if (($newShort !== '' && $newShort !== $prevShort) || ($newName !== '' && $newName !== $prevName)) {
                $targetShort = $newShort !== '' ? $newShort : $prevShort;
                $targetName  = $newName !== '' ? $newName : $prevName;
                if (function_exists('getEmailPushConfig') && function_exists('saveEmailPushConfig')) {
                    $epCurr = getEmailPushConfig($pdo);
                    $fn = trim((string)($epCurr['fromName'] ?? ''));
                    if ($fn === '' || $fn === ($prevShort . ' Portal') || str_contains($fn, 'SVCOER') || ($prevShort !== '' && str_starts_with($fn, $prevShort))) {
                        saveEmailPushConfig($pdo, ['fromName' => $targetShort . ' Portal'], true);
                    }
                }
                if (function_exists('getSeoSettings') && function_exists('saveSeoSettings')) {
                    $seoCurr = getSeoSettings($pdo);
                    $replaceBrandStr = static function (string $val) use ($prevShort, $targetShort, $prevName, $targetName): string {
                        $out = $val;
                        if ($prevName !== '' && $targetName !== '') {
                            $out = str_replace($prevName, $targetName, $out);
                        }
                        if ($prevShort !== '' && $targetShort !== '') {
                            $out = (string)preg_replace('/\b' . preg_quote($prevShort, '/') . '\b/', $targetShort, $out);
                        }
                        return $out;
                    };
                    if (!empty($seoCurr['siteTitleSuffix'])) {
                        $seoCurr['siteTitleSuffix'] = $replaceBrandStr((string)$seoCurr['siteTitleSuffix']);
                    }
                    if (!empty($seoCurr['defaultDescription'])) {
                        $seoCurr['defaultDescription'] = $replaceBrandStr((string)$seoCurr['defaultDescription']);
                    }
                    if (!empty($seoCurr['routeOverrides']) && is_array($seoCurr['routeOverrides'])) {
                        foreach ($seoCurr['routeOverrides'] as &$ov) {
                            if (!empty($ov['title'])) $ov['title'] = $replaceBrandStr((string)$ov['title']);
                            if (!empty($ov['description'])) $ov['description'] = $replaceBrandStr((string)$ov['description']);
                        }
                        unset($ov);
                    }
                    saveSeoSettings($pdo, $seoCurr);
                }
            }
        } catch (Throwable $ignoredKv) {}

        logAudit($pdo, $user, 'UPDATE_SETTINGS', 'Settings', $newName);
        $msg = 'Site settings, design presets, SEO/email branding, upload limits & homepage layout saved.';
        $s = getSiteSettings($pdo);
    }
    }
}
$hs = $s['home_sections'] ?? [];
$stats = $s['highlights_stats'] ?? [];
$approvedBodies = $s['approved_bodies'] ?? [];
$headerCfg = getHeaderConfig($pdo);
$topBarLinks = getTopBarLinks($pdo);
$footerCfg = getFooterConfig($pdo);
$footerCols = getFooterColumns($pdo);
$creditsCfg = getCreditsPageConfig($pdo);
$editingContrib = null;
if (!empty($_GET['edit_contrib'])) {
    foreach (($creditsCfg['contributors'] ?? []) as $cRow) {
        if ((int)($cRow['id'] ?? 0) === (int)$_GET['edit_contrib']) {
            $editingContrib = $cRow;
            break;
        }
    }
}
$socialLinks = getSocialMediaLinks($pdo, false);
$socialShareCfg = getSocialSharingConfig($pdo);
$editingSocial = null;
if (!empty($_GET['edit_social'])) {
    foreach ($socialLinks as $slRow) {
        if ((int)$slRow['id'] === (int)$_GET['edit_social']) {
            $editingSocial = $slRow;
            break;
        }
    }
}
$adminPageTitle = 'Site Settings, Header/Footer Studio, Creators Page & Social Media';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="admin-subtabs" style="margin-bottom:1.1rem;">
  <a href="?tab=general" class="admin-subtab <?= $tab === 'general' ? 'is-active' : '' ?>">1. Branding, Theme &amp; Homepage</a>
  <a href="?tab=header_footer" class="admin-subtab <?= $tab === 'header_footer' ? 'is-active' : '' ?>">2. Header &amp; Footer Manager</a>
  <a href="?tab=credits" class="admin-subtab <?= $tab === 'credits' ? 'is-active' : '' ?>">3. Creators &amp; Developers Page (<?= count($creditsCfg['contributors'] ?? []) ?>)</a>
  <a href="?tab=social" class="admin-subtab <?= $tab === 'social' ? 'is-active' : '' ?>">4. Social Icons &amp; Sharing (<?= count($socialLinks) ?>)</a>
</div>

<?php if ($tab === 'general'): ?>
  <form method="post" enctype="multipart/form-data" class="card" style="max-width:860px;">
    <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
    <input type="hidden" name="action" value="save_site_settings">
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Trust / Society Name <input type="text" name="trust_name" value="<?= e($s['trust_name'] ?? '') ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Short Code <input type="text" name="short_code" value="<?= e($s['short_code'] ?? 'SVCOER') ?>" style="width:100%;padding:0.5rem;"></label>
    </div>
    <label style="display:block;margin-bottom:0.65rem;">Institution Name
      <input type="text" name="institution_name" value="<?= e($s['institution_name']) ?>" style="width:100%;padding:0.5rem;">
    </label>
    <label style="display:block;margin-bottom:0.65rem;">Affiliation Subtitle
      <input type="text" name="affiliation" value="<?= e($s['affiliation']) ?>" style="width:100%;padding:0.5rem;">
    </label>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>DTE Institute Code <input type="text" name="dte_code" value="<?= e($s['dte_code']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>AICTE Permanent ID <input type="text" name="aicte_code" value="<?= e($s['aicte_code']) ?>" style="width:100%;padding:0.5rem;"></label>
    </div>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Upload Institution Logo (PNG/JPG/WEBP): <input type="file" name="logo_file" accept="image/jpeg,image/png,image/webp" data-aspect="1:1"></label>
      <label>Upload About Us Campus Photo: <input type="file" name="about_image_file" accept="image/jpeg,image/png,image/webp" data-aspect="4:3"></label>
    </div>
    <label style="display:block;margin-bottom:0.65rem;">About Us Homepage Summary
      <textarea name="about_summary" rows="3" style="width:100%;padding:0.5rem;"><?= e($s['about_summary'] ?? '') ?></textarea>
    </label>
    <label style="display:block;margin-bottom:0.65rem;">Vision Statement
      <textarea name="vision_text" rows="2" style="width:100%;padding:0.5rem;"><?= e($s['vision_text'] ?? '') ?></textarea>
    </label>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Mission Statements (1 per line)
        <textarea name="mission_text" rows="4" style="width:100%;padding:0.5rem;"><?= e($s['mission_text'] ?? '') ?></textarea>
      </label>
      <label>Top Recruiters (1 company per line)
        <textarea name="recruiters" rows="4" style="width:100%;padding:0.5rem;"><?= e($s['recruiters'] ?? '') ?></textarea>
      </label>
    </div>
    <label style="display:block;margin-bottom:0.65rem;">Address <input type="text" name="address" value="<?= e($s['address']) ?>" style="width:100%;padding:0.5rem;"></label>
    <div class="grid-2" style="margin-bottom:0.65rem;">
      <label>Phone <input type="text" name="phone" value="<?= e($s['phone']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Email <input type="email" name="email" value="<?= e($s['email']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Emergency Helpline <input type="text" name="emergency_helpline" value="<?= e($s['emergency_helpline']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Anti-Ragging Helpline <input type="text" name="anti_ragging_helpline" value="<?= e($s['anti_ragging_helpline']) ?>" style="width:100%;padding:0.5rem;"></label>
      <label>Default Primary Hex <input id="setting-primary-hex" type="color" name="primary_color" value="<?= e($s['primary_color']) ?>"></label>
      <label>Default Secondary Hex <input id="setting-secondary-hex" type="color" name="secondary_color" value="<?= e($s['secondary_color']) ?>"></label>
    </div>

    <hr style="border:none;border-top:1px solid var(--border-color);margin:1.25rem 0;">
    <h2 style="margin-top:0;">Design &amp; Typography Studio (Zero-Data-Loss Updates)</h2>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-top:-0.35rem;margin-bottom:0.85rem;">
      Switch site-wide aesthetic presets, typography, corner radii, and header style at any time without disturbing any uploaded pages, PDFs, or media.
    </p>
    <div class="grid-3" style="margin-bottom:0.85rem;">
      <label>Design Preset
        <select name="design_preset" onchange="applyDesignPresetHex(this.value)" style="width:100%;padding:0.45rem;margin-top:4px;">
          <?php foreach ([
            'heritage-navy'   => 'Heritage Navy & Saffron Gold',
            'modern-slate'    => 'Executive Slate & Indigo',
            'emerald-campus'  => 'Emerald Green & Teal',
            'crimson-scholar' => 'Academic Crimson & Bronze',
          ] as $pk => $pl): ?>
            <option value="<?= e($pk) ?>" <?= ($s['design_preset'] ?? 'heritage-navy') === $pk ? 'selected' : '' ?>><?= e($pl) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Card Corner Radius
        <select name="card_radius" style="width:100%;padding:0.45rem;margin-top:4px;">
          <option value="rounded" <?= ($s['card_radius'] ?? 'rounded') === 'rounded' ? 'selected' : '' ?>>Standard Rounded</option>
          <option value="sharp" <?= ($s['card_radius'] ?? '') === 'sharp' ? 'selected' : '' ?>>Sharp Executive</option>
          <option value="soft" <?= ($s['card_radius'] ?? '') === 'soft' ? 'selected' : '' ?>>Soft Modern</option>
        </select>
      </label>
      <label>Header Layout
        <select name="header_style" style="width:100%;padding:0.45rem;margin-top:4px;">
          <option value="classic" <?= ($s['header_style'] ?? 'classic') === 'classic' ? 'selected' : '' ?>>Classic Crest + Brand</option>
          <option value="compact" <?= ($s['header_style'] ?? '') === 'compact' ? 'selected' : '' ?>>Compact Strip</option>
        </select>
      </label>
    </div>
    <div class="grid-2" style="margin-bottom:0.85rem;">
      <label>Heading Font Family
        <select name="font_heading" data-custom-select="1" style="width:100%;padding:0.45rem;margin-top:4px;">
          <?php
            $curHeadFont = (string)($s['font_heading'] ?? "'Playfair Display', Georgia, serif");
            $headFonts = [
              "'Playfair Display', Georgia, serif" => 'Playfair Display (Editorial Serif)',
              "'Plus Jakarta Sans', system-ui, sans-serif" => 'Plus Jakarta Sans (Modern Geometric)',
              "Georgia, Cambria, serif" => 'Georgia (Classic Academic)',
            ];
            if (!isset($headFonts[$curHeadFont])) $headFonts[$curHeadFont] = $curHeadFont;
            foreach ($headFonts as $fk => $fl):
          ?>
            <option value="<?= e($fk) ?>" <?= $curHeadFont === $fk ? 'selected' : '' ?>><?= e($fl) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>Body Font Family
        <select name="font_body" data-custom-select="1" style="width:100%;padding:0.45rem;margin-top:4px;">
          <?php
            $curBodyFont = (string)($s['font_body'] ?? "'Plus Jakarta Sans', system-ui, sans-serif");
            $bodyFonts = [
              "'Plus Jakarta Sans', system-ui, sans-serif" => 'Plus Jakarta Sans (Clean UI)',
              "'Atkinson Hyperlegible', sans-serif" => 'Atkinson Hyperlegible (High Readability)',
              "system-ui, -apple-system, sans-serif" => 'System Native Sans',
            ];
            if (!isset($bodyFonts[$curBodyFont])) $bodyFonts[$curBodyFont] = $curBodyFont;
            foreach ($bodyFonts as $bk => $bl):
          ?>
            <option value="<?= e($bk) ?>" <?= $curBodyFont === $bk ? 'selected' : '' ?>><?= e($bl) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
    </div>
    <label style="display:block;margin-bottom:0.85rem;">Custom CSS Overrides (Optional)
      <textarea name="custom_css" rows="3" placeholder="/* e.g. .hero-title { letter-spacing: -0.01em; } */" style="width:100%;padding:0.5rem;font-family:monospace;font-size:0.8rem;"><?= e($s['custom_css'] ?? '') ?></textarea>
    </label>

    <hr style="border:none;border-top:1px solid var(--border-color);margin:1.25rem 0;">
    <h2 style="margin-top:0;">Homepage Sections Visibility &amp; Headings</h2>
    <div class="grid-2" style="margin-bottom:0.75rem;font-size:0.9rem;">
      <label><input type="checkbox" name="sec_ticker" <?= !empty($hs['showTicker']) ? 'checked' : '' ?>> Show News / Notices Ticker</label>
      <label><input type="checkbox" name="sec_slider" <?= !empty($hs['showSlider']) ? 'checked' : '' ?>> Show Hero Image Slider</label>
      <label><input type="checkbox" name="sec_stats" <?= !empty($hs['showStatsAndRecognitions']) ? 'checked' : '' ?>> Show Key Highlights Bar</label>
      <label><input type="checkbox" name="sec_about" <?= !empty($hs['showAboutAndDownloads']) ? 'checked' : '' ?>> Show About Us &amp; Downloads</label>
      <label><input type="checkbox" name="sec_approved" <?= !empty($hs['showApprovedAndVision']) ? 'checked' : '' ?>> Show Approved Bodies &amp; Vision</label>
      <label><input type="checkbox" name="sec_leadership" <?= !empty($hs['showLeadershipDesk']) ? 'checked' : '' ?>> Show Leadership &amp; Our Desk</label>
      <label><input type="checkbox" name="sec_exam" <?= !empty($hs['showExaminationSpotlight']) ? 'checked' : '' ?>> Show Examination Cell Spotlight</label>
      <label><input type="checkbox" name="sec_departments" <?= !empty($hs['showDepartments']) ? 'checked' : '' ?>> Show Academic Departments</label>
      <label><input type="checkbox" name="sec_categories" <?= !empty($hs['showCategoriesDirectory']) ? 'checked' : '' ?>> Show Disclosure &amp; Category Portals</label>
      <label><input type="checkbox" name="sec_events" <?= !empty($hs['showEventsAndRecruiters']) ? 'checked' : '' ?>> Show Events &amp; Top Recruiters</label>
    </div>
    <div class="grid-3" style="margin-bottom:0.75rem;">
      <label>Examination Heading <input type="text" name="exam_spotlight_title" value="<?= e($hs['examSpotlightTitle'] ?? 'Autonomous Examination Portal (CoE)') ?>" style="width:100%;padding:0.45rem;"></label>
      <label>Departments Heading <input type="text" name="departments_title" value="<?= e($hs['departmentsTitle'] ?? 'Academic Departments') ?>" style="width:100%;padding:0.45rem;"></label>
      <label>Portals Directory Heading <input type="text" name="categories_title" value="<?= e($hs['categoriesTitle'] ?? 'Statutory Self-Disclosure & Autonomous Portals') ?>" style="width:100%;padding:0.45rem;"></label>
    </div>

    <h3>Key Highlight Metrics</h3>
    <div class="grid-2" style="margin-bottom:1rem;">
      <?php for ($i = 0; $i < 4; $i++): $stRow = $stats[$i] ?? ['label' => '', 'value' => '']; ?>
        <div style="display:flex;gap:0.5rem;">
          <input type="text" name="stat_value[]" value="<?= e($stRow['value'] ?? '') ?>" placeholder="28+" style="width:90px;padding:0.4rem;">
          <input type="text" name="stat_label[]" value="<?= e($stRow['label'] ?? '') ?>" placeholder="Metric Label" style="flex:1;padding:0.4rem;">
        </div>
      <?php endfor; ?>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
      <h3 style="margin:0;">Approved &amp; Affiliated Bodies Cards</h3>
      <button type="button" class="btn-secondary" style="font-size:0.78rem;" onclick="addApprovedBodyRow()">+ Add Statutory Body</button>
    </div>
    <div id="approved-bodies-list" style="display:grid;gap:0.45rem;margin-bottom:1rem;">
      <?php foreach ($approvedBodies as $ab): ?>
        <div class="approved-body-row" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:0.45rem;align-items:center;">
          <input type="text" name="ab_name[]" value="<?= e($ab['name'] ?? '') ?>" placeholder="Body Name (e.g. AICTE New Delhi)" style="padding:0.42rem;">
          <input type="text" name="ab_subtitle[]" value="<?= e($ab['subtitle'] ?? '') ?>" placeholder="Subtitle (e.g. Statutory Approval)" style="padding:0.42rem;">
          <input type="text" name="ab_href[]" value="<?= e($ab['href'] ?? 'page.php?slug=about-overview') ?>" placeholder="Target Link" style="padding:0.42rem;">
          <button type="button" class="btn-secondary" style="padding:0.4rem 0.65rem;" onclick="this.parentNode.remove()">&times;</button>
        </div>
      <?php endforeach; ?>
    </div>

    <hr style="border:none;border-top:1px solid var(--border-color);margin:1.25rem 0;">
    <h2 style="margin-top:0;">Upload Size Controls &amp; Image Auto-Crop Policy</h2>
    <p style="font-size:0.84rem;color:var(--text-muted);margin-top:-0.35rem;margin-bottom:0.85rem;">
      Applies globally across all Admin photo uploaders (sliders, gallery, faculty, leadership, labs, library, editor) and document repositories.
    </p>
    <div class="grid-3" style="margin-bottom:1rem;">
      <label style="font-size:0.88rem;font-weight:600;">Max Photo Upload Size (MB)
        <input type="number" step="0.25" min="0.25" max="25" name="max_photo_mb" value="<?= e((string)($s['max_photo_mb'] ?? 2.0)) ?>" style="width:100%;padding:0.45rem;margin-top:4px;">
      </label>
      <label style="font-size:0.88rem;font-weight:600;">Max Document Upload Size (MB)
        <input type="number" step="0.5" min="0.5" max="50" name="max_doc_mb" value="<?= e((string)($s['max_doc_mb'] ?? 10.0)) ?>" style="width:100%;padding:0.45rem;margin-top:4px;">
      </label>
      <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.88rem;font-weight:600;padding-top:1.1rem;">
        <input type="checkbox" name="auto_crop_enabled" <?= !empty($s['auto_crop_enabled']) ? 'checked' : '' ?>>
        Enable Auto-Crop &amp; Aspect Ratio Lock
      </label>
    </div>

    <button type="submit" class="btn-primary">Save Complete Settings &amp; Homepage Layout</button>
  </form>
<script>
function applyDesignPresetHex(preset) {
  var map = {
    'heritage-navy':   ['#0F294A', '#B45309'],
    'modern-slate':    ['#1E293B', '#2563EB'],
    'emerald-campus':  ['#064E3B', '#0F766E'],
    'crimson-scholar': ['#7F1D1D', '#B45309']
  };
  var pair = map[preset];
  if (!pair) return;
  var p = document.getElementById('setting-primary-hex');
  var s = document.getElementById('setting-secondary-hex');
  if (p) p.value = pair[0];
  if (s) s.value = pair[1];
}
function addApprovedBodyRow() {
  var list = document.getElementById('approved-bodies-list');
  if (!list) return;
  var div = document.createElement('div');
  div.className = 'approved-body-row';
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:0.45rem;align-items:center;';
  div.innerHTML = '<input type="text" name="ab_name[]" placeholder="Body Name" style="padding:0.42rem;">'
    + '<input type="text" name="ab_subtitle[]" placeholder="Subtitle" style="padding:0.42rem;">'
    + '<input type="text" name="ab_href[]" value="page.php?slug=about-overview" placeholder="Target Link" style="padding:0.42rem;">'
    + '<button type="button" class="btn-secondary" style="padding:0.4rem 0.65rem;" onclick="this.parentNode.remove()">&times;</button>';
  list.appendChild(div);
}
</script>
<?php elseif ($tab === 'header_footer'): ?>
  <div class="grid-2" style="gap:1.25rem;align-items:start;">
    <!-- Header Settings & Statutory Quick-Access Bar -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.65rem;">
        <h2 style="margin:0;">Header &amp; Top Utility Ribbon</h2>
        <a href="manage_menus.php" class="btn-secondary btn-sm">Primary Nav Menus &rarr;</a>
      </div>
      <form method="post">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_header_config">

        <div class="grid-2" style="margin-bottom:0.85rem;font-size:0.86rem;gap:0.45rem;">
          <label><input type="checkbox" name="show_top_utility_bar" <?= !empty($headerCfg['showTopUtilityBar']) ? 'checked' : '' ?>> Show Top Accessibility &amp; Utility Bar</label>
          <label><input type="checkbox" name="show_regulatory_codes" <?= !empty($headerCfg['showRegulatoryCodes']) ? 'checked' : '' ?>> Show DTE &amp; AICTE Codes</label>
          <label><input type="checkbox" name="show_admin_button" <?= !empty($headerCfg['showAdminButton']) ? 'checked' : '' ?>> Show Top-Right CMS Admin Link</label>
          <label><input type="checkbox" name="show_institute_code_badge" <?= !empty($headerCfg['showInstituteCodeBadge']) ? 'checked' : '' ?>> Show Institute Code Badge</label>
          <label><input type="checkbox" name="show_search_bar" <?= !empty($headerCfg['showSearchBar']) ? 'checked' : '' ?>> Show Global Search Input</label>
          <label><input type="checkbox" name="show_statutory_bar" <?= !empty($headerCfg['showStatutoryBar']) ? 'checked' : '' ?>> Show Statutory &amp; Quick Access Strip</label>
        </div>

        <div class="grid-2" style="margin-bottom:0.85rem;">
          <label style="font-size:0.84rem;font-weight:600;">Utility Ribbon Tagline
            <input type="text" name="utility_tagline" value="<?= e((string)($headerCfg['utilityTagline'] ?? '')) ?>" placeholder="Autonomous Engineering Campus" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.84rem;font-weight:600;">Statutory Bar Heading Label
            <input type="text" name="statutory_bar_label" value="<?= e((string)($headerCfg['statutoryBarLabel'] ?? '')) ?>" placeholder="Statutory &amp; Quick Access:" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin:0.85rem 0 0.5rem;">
          <h3 style="margin:0;font-size:0.96rem;">Statutory &amp; Top Quick-Access Links</h3>
          <button type="button" class="btn-secondary btn-sm" onclick="addHeaderTopLinkRow()">+ Add Link</button>
        </div>
        <div id="header-top-links-list" style="display:grid;gap:0.45rem;margin-bottom:1rem;">
          <?php foreach ($topBarLinks as $tl): ?>
            <div class="hf-link-row" style="display:grid;grid-template-columns:1fr 1.2fr auto auto auto;gap:0.35rem;align-items:center;">
              <input type="text" name="tbl_label[]" value="<?= e((string)$tl['label']) ?>" placeholder="Link Label" style="padding:0.4rem;">
              <input type="text" name="tbl_url[]" value="<?= e((string)$tl['url']) ?>" placeholder="e.g. credits.php or page.php?slug=..." style="padding:0.4rem;">
              <button type="button" class="btn-secondary btn-sm" title="Move Up" onclick="moveDomRow(this.parentNode,-1)">&uarr;</button>
              <button type="button" class="btn-secondary btn-sm" title="Move Down" onclick="moveDomRow(this.parentNode,1)">&darr;</button>
              <button type="button" class="btn-danger btn-sm" title="Remove" onclick="this.parentNode.remove()">&times;</button>
            </div>
          <?php endforeach; ?>
        </div>

        <button type="submit" class="btn-primary">Save Header Configuration &amp; Links</button>
      </form>
    </div>

    <!-- Footer Settings, Bottom Strip, Creator Attribution & Columns -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.65rem;">
        <h2 style="margin:0;">Footer Layout, Columns &amp; Creator Credit</h2>
        <a href="../credits.php" target="_blank" class="btn-secondary btn-sm">Preview /credits &rarr;</a>
      </div>
      <form method="post" onsubmit="return syncFooterColumnsJsonBeforeSubmit()">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_footer_config">
        <input type="hidden" name="footer_columns_json" id="footer-columns-json-input" value="<?= e(json_encode($footerCols, JSON_UNESCAPED_UNICODE) ?: '[]') ?>">

        <div class="grid-3" style="margin-bottom:0.8rem;font-size:0.85rem;">
          <label><input type="checkbox" name="show_contact_block" <?= !empty($footerCfg['showContactBlock']) ? 'checked' : '' ?>> Show Institution Contact Column</label>
          <label><input type="checkbox" name="show_bottom_links" <?= !empty($footerCfg['showBottomLinks']) ? 'checked' : '' ?>> Show Bottom Utility Links</label>
          <label><input type="checkbox" name="show_creator_credit_bar" <?= !empty($footerCfg['showCreatorCreditBar']) ? 'checked' : '' ?>> Show Creator Attribution Strip</label>
        </div>

        <div class="grid-2" style="margin-bottom:0.75rem;">
          <label style="font-size:0.84rem;font-weight:600;">Custom Copyright Line (Optional)
            <input type="text" name="copyright_text" value="<?= e((string)($footerCfg['copyrightText'] ?? '')) ?>" placeholder="Leave blank for &copy; Year + Institution Name" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.84rem;font-weight:600;">Statutory Compliance Note
            <input type="text" name="compliance_note" value="<?= e((string)($footerCfg['complianceNote'] ?? '')) ?>" placeholder="UGC NEP 2020 Public Self-Disclosure Compliant." style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
        </div>

        <div style="background:#f8fafc;border:1px solid var(--border-color);border-radius:10px;padding:0.8rem;margin-bottom:0.9rem;">
          <strong style="display:block;font-size:0.85rem;margin-bottom:0.5rem;">Creator / Developer Attribution Strip</strong>
          <div class="grid-3" style="gap:0.45rem;">
            <label style="font-size:0.78rem;font-weight:600;">Prefix Label
              <input type="text" name="creator_credit_label" value="<?= e((string)($footerCfg['creatorCreditLabel'] ?? '')) ?>" placeholder="Designed &amp; Developed by" style="width:100%;padding:0.4rem;margin-top:2px;">
            </label>
            <label style="font-size:0.78rem;font-weight:600;">Team / Creator Name
              <input type="text" name="creator_credit_name" value="<?= e((string)($footerCfg['creatorCreditName'] ?? '')) ?>" placeholder="Campus Web Team" style="width:100%;padding:0.4rem;margin-top:2px;">
            </label>
            <label style="font-size:0.78rem;font-weight:600;">Target URL
              <input type="text" name="creator_credit_url" value="<?= e((string)($footerCfg['creatorCreditUrl'] ?? 'credits.php')) ?>" placeholder="credits.php" style="width:100%;padding:0.4rem;margin-top:2px;">
            </label>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin:0.85rem 0 0.45rem;">
          <h3 style="margin:0;font-size:0.95rem;">Footer Link Columns</h3>
          <button type="button" class="btn-secondary btn-sm" onclick="addFooterColumnCard()">+ Add Column</button>
        </div>
        <div id="footer-columns-editor" style="display:grid;gap:0.75rem;margin-bottom:1rem;"></div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin:0.85rem 0 0.45rem;">
          <h3 style="margin:0;font-size:0.95rem;">Bottom Legal &amp; Quick Links Row</h3>
          <button type="button" class="btn-secondary btn-sm" onclick="addFooterBottomLinkRow()">+ Add Bottom Link</button>
        </div>
        <div id="footer-bottom-links-list" style="display:grid;gap:0.45rem;margin-bottom:1rem;">
          <?php foreach (($footerCfg['bottomBarLinks'] ?? []) as $bl): ?>
            <div class="hf-link-row" style="display:grid;grid-template-columns:1fr 1.2fr auto auto auto;gap:0.35rem;align-items:center;">
              <input type="text" name="bbl_label[]" value="<?= e((string)$bl['label']) ?>" placeholder="Link Label" style="padding:0.4rem;">
              <input type="text" name="bbl_url[]" value="<?= e((string)$bl['url']) ?>" placeholder="e.g. credits.php or page.php?slug=..." style="padding:0.4rem;">
              <button type="button" class="btn-secondary btn-sm" title="Move Up" onclick="moveDomRow(this.parentNode,-1)">&uarr;</button>
              <button type="button" class="btn-secondary btn-sm" title="Move Down" onclick="moveDomRow(this.parentNode,1)">&darr;</button>
              <button type="button" class="btn-danger btn-sm" title="Remove" onclick="this.parentNode.remove()">&times;</button>
            </div>
          <?php endforeach; ?>
        </div>

        <button type="submit" class="btn-primary">Save Complete Footer Settings</button>
      </form>
    </div>
  </div>

  <script>
  function moveDomRow(el, delta) {
    if (!el || !el.parentNode) return;
    var parent = el.parentNode;
    if (delta < 0 && el.previousElementSibling) {
      parent.insertBefore(el, el.previousElementSibling);
    } else if (delta > 0 && el.nextElementSibling) {
      parent.insertBefore(el.nextElementSibling, el);
    }
  }
  function makeLinkRowHtml(labelName, urlName) {
    return '<input type="text" name="' + labelName + '" placeholder="Link Label" style="padding:0.4rem;">'
      + '<input type="text" name="' + urlName + '" placeholder="Target URL (e.g. credits.php)" style="padding:0.4rem;">'
      + '<button type="button" class="btn-secondary btn-sm" title="Move Up" onclick="moveDomRow(this.parentNode,-1)">&uarr;</button>'
      + '<button type="button" class="btn-secondary btn-sm" title="Move Down" onclick="moveDomRow(this.parentNode,1)">&darr;</button>'
      + '<button type="button" class="btn-danger btn-sm" title="Remove" onclick="this.parentNode.remove()">&times;</button>';
  }
  function addHeaderTopLinkRow() {
    var box = document.getElementById('header-top-links-list');
    if (!box) return;
    var row = document.createElement('div');
    row.className = 'hf-link-row';
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1.2fr auto auto auto;gap:0.35rem;align-items:center;';
    row.innerHTML = makeLinkRowHtml('tbl_label[]', 'tbl_url[]');
    box.appendChild(row);
  }
  function addFooterBottomLinkRow() {
    var box = document.getElementById('footer-bottom-links-list');
    if (!box) return;
    var row = document.createElement('div');
    row.className = 'hf-link-row';
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1.2fr auto auto auto;gap:0.35rem;align-items:center;';
    row.innerHTML = makeLinkRowHtml('bbl_label[]', 'bbl_url[]');
    box.appendChild(row);
  }
  var initialFooterCols = <?= json_encode($footerCols, JSON_UNESCAPED_UNICODE) ?: '[]' ?>;
  function createFooterColLinkRow(labelVal, urlVal) {
    var r = document.createElement('div');
    r.className = 'fc-link-row';
    r.style.cssText = 'display:grid;grid-template-columns:1fr 1.2fr auto auto auto;gap:0.3rem;align-items:center;';
    var inL = document.createElement('input');
    inL.type = 'text'; inL.className = 'fc-lk-label'; inL.placeholder = 'Link Label'; inL.value = labelVal || ''; inL.style.padding = '0.35rem';
    var inU = document.createElement('input');
    inU.type = 'text'; inU.className = 'fc-lk-url'; inU.placeholder = 'URL'; inU.value = urlVal || ''; inU.style.padding = '0.35rem';
    var bUp = document.createElement('button');
    bUp.type = 'button'; bUp.className = 'btn-secondary btn-sm'; bUp.textContent = '\u2191'; bUp.onclick = function () { moveDomRow(r, -1); };
    var bDn = document.createElement('button');
    bDn.type = 'button'; bDn.className = 'btn-secondary btn-sm'; bDn.textContent = '\u2193'; bDn.onclick = function () { moveDomRow(r, 1); };
    var bRm = document.createElement('button');
    bRm.type = 'button'; bRm.className = 'btn-danger btn-sm'; bRm.textContent = '\u00d7'; bRm.onclick = function () { r.remove(); };
    r.appendChild(inL); r.appendChild(inU); r.appendChild(bUp); r.appendChild(bDn); r.appendChild(bRm);
    return r;
  }
  function addFooterColumnCard(colData) {
    var ed = document.getElementById('footer-columns-editor');
    if (!ed) return;
    var data = colData || { title: 'New Section', links: [{ label: 'Home', url: 'index.php' }] };
    var card = document.createElement('div');
    card.className = 'fc-col-card';
    card.style.cssText = 'border:1px solid var(--border-color);border-radius:8px;padding:0.75rem;background:#fff;';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;gap:0.4rem;align-items:center;margin-bottom:0.55rem;';
    var tIn = document.createElement('input');
    tIn.type = 'text'; tIn.className = 'fc-col-title'; tIn.placeholder = 'Column Heading'; tIn.value = data.title || '';
    tIn.style.cssText = 'flex:1;padding:0.4rem;font-weight:700;';
    var bAddLk = document.createElement('button');
    bAddLk.type = 'button'; bAddLk.className = 'btn-secondary btn-sm'; bAddLk.textContent = '+ Link';
    var bUp = document.createElement('button');
    bUp.type = 'button'; bUp.className = 'btn-secondary btn-sm'; bUp.textContent = '\u2191'; bUp.onclick = function () { moveDomRow(card, -1); };
    var bDn = document.createElement('button');
    bDn.type = 'button'; bDn.className = 'btn-secondary btn-sm'; bDn.textContent = '\u2193'; bDn.onclick = function () { moveDomRow(card, 1); };
    var bDel = document.createElement('button');
    bDel.type = 'button'; bDel.className = 'btn-danger btn-sm'; bDel.textContent = 'Delete Col'; bDel.onclick = function () { card.remove(); };
    head.appendChild(tIn); head.appendChild(bAddLk); head.appendChild(bUp); head.appendChild(bDn); head.appendChild(bDel);
    var linksWrap = document.createElement('div');
    linksWrap.className = 'fc-links-wrap';
    linksWrap.style.cssText = 'display:grid;gap:0.35rem;';
    bAddLk.onclick = function () { linksWrap.appendChild(createFooterColLinkRow('', '')); };
    (data.links || []).forEach(function (lk) {
      linksWrap.appendChild(createFooterColLinkRow(lk.label || '', lk.url || ''));
    });
    card.appendChild(head);
    card.appendChild(linksWrap);
    ed.appendChild(card);
  }
  function syncFooterColumnsJsonBeforeSubmit() {
    var ed = document.getElementById('footer-columns-editor');
    var hidden = document.getElementById('footer-columns-json-input');
    if (!ed || !hidden) return true;
    var cols = [];
    ed.querySelectorAll('.fc-col-card').forEach(function (card) {
      var title = (card.querySelector('.fc-col-title') || {}).value || '';
      var links = [];
      card.querySelectorAll('.fc-link-row').forEach(function (r) {
        var lbl = (r.querySelector('.fc-lk-label') || {}).value || '';
        var url = (r.querySelector('.fc-lk-url') || {}).value || '';
        if (lbl.trim() || url.trim()) {
          links.push({ label: lbl.trim() || url.trim(), url: url.trim() || '#' });
        }
      });
      if (title.trim() || links.length > 0) {
        cols.push({ title: title.trim() || 'Links', links: links });
      }
    });
    hidden.value = JSON.stringify(cols);
    return true;
  }
  (function initFooterEditor() {
    (initialFooterCols || []).forEach(function (c) { addFooterColumnCard(c); });
  })();
  </script>

<?php elseif ($tab === 'credits'): ?>
  <div class="grid-2" style="gap:1.25rem;align-items:start;">
    <!-- Left Column: Page Metadata, Visibility, Acknowledgements & Tech Stack -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
        <h2 style="margin:0;">Developers &amp; Creators Page Settings</h2>
        <a href="../credits.php" target="_blank" class="btn-secondary btn-sm">Open Public /credits Page &rarr;</a>
      </div>
      <form method="post">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_credits_meta">

        <div class="grid-2" style="margin-bottom:0.65rem;">
          <label style="font-size:0.84rem;font-weight:600;">Eyebrow Tag
            <input type="text" name="eyebrow" value="<?= e((string)($creditsCfg['eyebrow'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.84rem;font-weight:600;">Page Title
            <input type="text" name="page_title" value="<?= e((string)($creditsCfg['pageTitle'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
        </div>
        <label style="display:block;font-size:0.84rem;font-weight:600;margin-bottom:0.65rem;">Subtitle / Intro Description
          <textarea name="page_subtitle" rows="2" style="width:100%;padding:0.45rem;margin-top:3px;"><?= e((string)($creditsCfg['pageSubtitle'] ?? '')) ?></textarea>
        </label>
        <div class="grid-3" style="margin-bottom:0.65rem;">
          <label style="font-size:0.82rem;font-weight:600;">Release Version
            <input type="text" name="project_version" value="<?= e((string)($creditsCfg['projectVersion'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.82rem;font-weight:600;">Release Year
            <input type="text" name="release_year" value="<?= e((string)($creditsCfg['releaseYear'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.82rem;font-weight:600;">Organization / Cell Credit
            <input type="text" name="organization_credit" value="<?= e((string)($creditsCfg['organizationCredit'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
        </div>
        <label style="display:block;font-size:0.84rem;font-weight:600;margin-bottom:0.65rem;">Compliance / License Note
          <input type="text" name="license_note" value="<?= e((string)($creditsCfg['licenseNote'] ?? '')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
        </label>

        <div class="grid-3" style="margin-bottom:0.75rem;font-size:0.85rem;">
          <label><input type="checkbox" name="show_contributors_section" <?= !empty($creditsCfg['showContributorsSection']) ? 'checked' : '' ?>> Show Contributors Directory</label>
          <label><input type="checkbox" name="show_tech_stack_section" <?= !empty($creditsCfg['showTechStackSection']) ? 'checked' : '' ?>> Show Technology Stack</label>
          <label><input type="checkbox" name="is_shareable" <?= !empty($creditsCfg['isShareable']) ? 'checked' : '' ?>> Enable Social Sharing Bar</label>
        </div>

        <label style="display:block;font-size:0.84rem;font-weight:600;margin-bottom:0.85rem;">Acknowledgements &amp; Governance Note (HTML supported)
          <textarea name="acknowledgements_html" rows="4" style="width:100%;padding:0.5rem;margin-top:3px;font-family:monospace;font-size:0.82rem;"><?= e((string)($creditsCfg['acknowledgementsHtml'] ?? '')) ?></textarea>
        </label>

        <div style="display:flex;justify-content:space-between;align-items:center;margin:0.85rem 0 0.5rem;">
          <h3 style="margin:0;font-size:0.96rem;">Platform Architecture &amp; Tech Stack Cards</h3>
          <button type="button" class="btn-secondary btn-sm" onclick="addTechStackRow()">+ Add Stack Item</button>
        </div>
        <div id="credits-techstack-list" style="display:grid;gap:0.5rem;margin-bottom:1rem;">
          <?php foreach (($creditsCfg['techStack'] ?? []) as $ts): ?>
            <div style="display:grid;grid-template-columns:1fr 0.85fr 1.4fr auto;gap:0.35rem;align-items:center;">
              <input type="text" name="ts_name[]" value="<?= e((string)($ts['name'] ?? '')) ?>" placeholder="Stack Name" style="padding:0.4rem;">
              <input type="text" name="ts_category[]" value="<?= e((string)($ts['category'] ?? '')) ?>" placeholder="Layer / Category" style="padding:0.4rem;">
              <input type="text" name="ts_description[]" value="<?= e((string)($ts['description'] ?? '')) ?>" placeholder="Short Description" style="padding:0.4rem;">
              <button type="button" class="btn-danger btn-sm" onclick="this.parentNode.remove()">&times;</button>
            </div>
          <?php endforeach; ?>
        </div>

        <button type="submit" class="btn-primary">Save Credits Page Settings &amp; Stack</button>
      </form>
    </div>

    <!-- Right Column: Add / Edit Contributor & Roster Management -->
    <div>
      <div class="card" style="margin-bottom:1.1rem;">
        <h2 style="margin-top:0;"><?= $editingContrib ? 'Edit Contributor: ' . e((string)$editingContrib['name']) : 'Add Creator, Developer or Contributor' ?></h2>
        <form method="post" enctype="multipart/form-data">
          <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
          <input type="hidden" name="action" value="save_contributor">
          <input type="hidden" name="contrib_id" value="<?= (int)($editingContrib['id'] ?? 0) ?>">

          <div class="grid-2" style="margin-bottom:0.55rem;">
            <label style="font-size:0.82rem;font-weight:600;">Full Name *
              <input type="text" name="c_name" required value="<?= e((string)($editingContrib['name'] ?? '')) ?>" placeholder="e.g. Dr. Rajesh Kulkarni" style="width:100%;padding:0.42rem;margin-top:3px;">
            </label>
            <label style="font-size:0.82rem;font-weight:600;">Role / Designation *
              <input type="text" name="c_role" required value="<?= e((string)($editingContrib['role'] ?? '')) ?>" placeholder="e.g. Lead Full-Stack Architect" style="width:100%;padding:0.42rem;margin-top:3px;">
            </label>
          </div>

          <div class="grid-2" style="margin-bottom:0.55rem;">
            <?php
              $curCat = (string)($editingContrib['category'] ?? 'Core Contributor');
              $presets = contributorRolePresets();
              $isCustomCat = !in_array($curCat, $presets, true);
            ?>
            <label style="font-size:0.82rem;font-weight:600;">Contributor Category
              <select name="c_category" id="c-cat-select" onchange="document.getElementById('c-cat-custom-wrap').style.display=this.value==='__custom__'?'block':'none'" style="width:100%;padding:0.42rem;margin-top:3px;">
                <?php foreach ($presets as $pr): ?>
                  <option value="<?= e($pr) ?>" <?= (!$isCustomCat && $curCat === $pr) ? 'selected' : '' ?>><?= e($pr) ?></option>
                <?php endforeach; ?>
                <option value="__custom__" <?= $isCustomCat ? 'selected' : '' ?>>Custom Category...</option>
              </select>
            </label>
            <div id="c-cat-custom-wrap" style="display:<?= $isCustomCat ? 'block' : 'none' ?>;">
              <label style="font-size:0.82rem;font-weight:600;">Custom Category Name
                <input type="text" name="c_category_custom" value="<?= e($isCustomCat ? $curCat : '') ?>" placeholder="e.g. Security Auditor" style="width:100%;padding:0.42rem;margin-top:3px;">
              </label>
            </div>
            <label style="font-size:0.82rem;font-weight:600;">Department / Affiliation
              <input type="text" name="c_affiliation" value="<?= e((string)($editingContrib['affiliation'] ?? '')) ?>" placeholder="Campus IT &amp; CSE Dept." style="width:100%;padding:0.42rem;margin-top:3px;">
            </label>
          </div>

          <div class="grid-2" style="margin-bottom:0.55rem;">
            <label style="font-size:0.82rem;font-weight:600;">Email Address
              <input type="email" name="c_email" value="<?= e((string)($editingContrib['email'] ?? '')) ?>" style="width:100%;padding:0.42rem;margin-top:3px;">
            </label>
            <label style="font-size:0.82rem;font-weight:600;">Contributions / Modules Owned
              <input type="text" name="c_contributions" value="<?= e((string)($editingContrib['contributions'] ?? '')) ?>" placeholder="Security Shield · PHP/MySQL Engine" style="width:100%;padding:0.42rem;margin-top:3px;">
            </label>
          </div>

          <div class="grid-3" style="margin-bottom:0.55rem;">
            <label style="font-size:0.8rem;font-weight:600;">GitHub URL
              <input type="url" name="c_github_url" value="<?= e((string)($editingContrib['githubUrl'] ?? '')) ?>" placeholder="https://github.com/..." style="width:100%;padding:0.4rem;margin-top:2px;">
            </label>
            <label style="font-size:0.8rem;font-weight:600;">LinkedIn URL
              <input type="url" name="c_linkedin_url" value="<?= e((string)($editingContrib['linkedinUrl'] ?? '')) ?>" placeholder="https://linkedin.com/in/..." style="width:100%;padding:0.4rem;margin-top:2px;">
            </label>
            <label style="font-size:0.8rem;font-weight:600;">Website / Portfolio URL
              <input type="url" name="c_website_url" value="<?= e((string)($editingContrib['websiteUrl'] ?? '')) ?>" placeholder="https://..." style="width:100%;padding:0.4rem;margin-top:2px;">
            </label>
          </div>

          <div class="grid-2" style="margin-bottom:0.55rem;">
            <label style="font-size:0.8rem;font-weight:600;">Photo URL (Optional)
              <input type="text" name="c_photo_url" value="<?= e((string)($editingContrib['photoUrl'] ?? '')) ?>" placeholder="uploads/... or https://..." style="width:100%;padding:0.4rem;margin-top:2px;">
            </label>
            <label style="font-size:0.8rem;font-weight:600;">Or Upload Portrait Photo
              <input type="file" name="c_photo_file" accept="image/jpeg,image/png,image/webp" data-aspect="1:1" style="margin-top:2px;">
            </label>
          </div>

          <label style="display:block;font-size:0.82rem;font-weight:600;margin-bottom:0.55rem;">Short Bio / Attribution Summary
            <textarea name="c_bio" rows="2" style="width:100%;padding:0.42rem;margin-top:3px;"><?= e((string)($editingContrib['bio'] ?? '')) ?></textarea>
          </label>

          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;">
            <label style="font-size:0.84rem;font-weight:600;"><input type="checkbox" name="c_is_active" <?= (!$editingContrib || !empty($editingContrib['isActive'])) ? 'checked' : '' ?>> Visible on Public /credits Page</label>
            <div style="display:flex;gap:0.5rem;">
              <?php if ($editingContrib): ?>
                <a href="?tab=credits" class="btn-secondary btn-sm">Cancel Edit</a>
              <?php endif; ?>
              <button type="submit" class="btn-primary"><?= $editingContrib ? 'Update Contributor' : 'Add Contributor' ?></button>
            </div>
          </div>
        </form>
      </div>

      <div class="card">
        <h3 style="margin-top:0;">Contributors Roster (<?= count($creditsCfg['contributors'] ?? []) ?>)</h3>
        <div style="display:grid;gap:0.65rem;">
          <?php foreach (($creditsCfg['contributors'] ?? []) as $cRow): ?>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;padding:0.65rem 0.75rem;border:1px solid var(--border-color);border-radius:8px;background:#fff;flex-wrap:wrap;">
              <div>
                <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--secondary-color);font-weight:700;">
                  <?= e((string)($cRow['category'] ?? 'Contributor')) ?> <?= empty($cRow['isActive']) ? '· Hidden' : '' ?>
                </div>
                <strong><?= e((string)$cRow['name']) ?></strong>
                <div style="font-size:0.78rem;color:var(--text-muted);"><?= e((string)$cRow['role']) ?></div>
              </div>
              <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
                <a href="?tab=credits&amp;edit_contrib=<?= (int)$cRow['id'] ?>" class="btn-secondary btn-sm">Edit</a>
                <form method="post" style="display:inline;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="move_contributor">
                  <input type="hidden" name="cid" value="<?= (int)$cRow['id'] ?>">
                  <input type="hidden" name="dir" value="up">
                  <button type="submit" class="btn-secondary btn-sm" title="Move Up">&uarr;</button>
                </form>
                <form method="post" style="display:inline;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="move_contributor">
                  <input type="hidden" name="cid" value="<?= (int)$cRow['id'] ?>">
                  <input type="hidden" name="dir" value="down">
                  <button type="submit" class="btn-secondary btn-sm" title="Move Down">&darr;</button>
                </form>
                <form method="post" style="display:inline;">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="toggle_contributor">
                  <input type="hidden" name="cid" value="<?= (int)$cRow['id'] ?>">
                  <button type="submit" class="btn-secondary btn-sm"><?= empty($cRow['isActive']) ? 'Show' : 'Hide' ?></button>
                </form>
                <form method="post" style="display:inline;" onsubmit="return confirm('Remove this contributor from Credits page?');">
                  <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
                  <input type="hidden" name="action" value="delete_contributor">
                  <input type="hidden" name="cid" value="<?= (int)$cRow['id'] ?>">
                  <button type="submit" class="btn-danger btn-sm">Delete</button>
                </form>
              </div>
            </div>
          <?php endforeach; ?>
        </div>
      </div>
    </div>
  </div>
  <script>
  function addTechStackRow() {
    var box = document.getElementById('credits-techstack-list');
    if (!box) return;
    var row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 0.85fr 1.4fr auto;gap:0.35rem;align-items:center;';
    row.innerHTML = '<input type="text" name="ts_name[]" placeholder="Stack Name" style="padding:0.4rem;">'
      + '<input type="text" name="ts_category[]" placeholder="Layer / Category" style="padding:0.4rem;">'
      + '<input type="text" name="ts_description[]" placeholder="Short Description" style="padding:0.4rem;">'
      + '<button type="button" class="btn-danger btn-sm" onclick="this.parentNode.remove()">&times;</button>';
    box.appendChild(row);
  }
  </script>
<?php else: ?>
  <?php
    $pubPagesList = $pdo->query('SELECT slug, title FROM pages WHERE is_published = 1 ORDER BY sort_order ASC, id ASC LIMIT 60')->fetchAll() ?: [];
    $canonBase = rtrim(resolvePhpCanonicalBase(function_exists('getSeoSettings') ? getSeoSettings($pdo) : []), '/');
  ?>
  <div class="grid-2" style="gap:1.25rem;align-items:start;">
    <!-- Left Column: Social Media Profile Links CRUD -->
    <div class="card">
      <h2 style="margin-top:0;"><?= $editingSocial ? 'Edit Social Channel: ' . e((string)$editingSocial['label']) : 'Add Official Social Media Profile Link' ?></h2>
      <form method="post" style="background:#FAFAF9;border:1px solid var(--border-color);border-radius:10px;padding:0.9rem;margin-bottom:1.1rem;">
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_social_link">
        <input type="hidden" name="social_id" value="<?= (int)($editingSocial['id'] ?? 0) ?>">

        <div class="grid-2" style="margin-bottom:0.55rem;">
          <label style="font-size:0.8rem;font-weight:600;">Platform Icon *
            <select name="platform" style="width:100%;padding:0.45rem;margin-top:3px;">
              <?php foreach (socialPlatformCatalog() as $pKey => $pLbl): ?>
                <option value="<?= e($pKey) ?>" <?= ($editingSocial['platform'] ?? 'linkedin') === $pKey ? 'selected' : '' ?>><?= e($pLbl) ?></option>
              <?php endforeach; ?>
            </select>
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Display Label *
            <input type="text" name="label" required value="<?= e((string)($editingSocial['label'] ?? '')) ?>" placeholder="e.g. LinkedIn Official" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
        </div>

        <div class="grid-2" style="margin-bottom:0.55rem;">
          <label style="font-size:0.8rem;font-weight:600;">Profile URL (https://...) *
            <input type="url" name="url" required value="<?= e((string)($editingSocial['url'] ?? '')) ?>" placeholder="https://linkedin.com/school/..." style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Handle / Username
            <input type="text" name="handle" value="<?= e((string)($editingSocial['handle'] ?? '')) ?>" placeholder="@svcoer_official" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
        </div>

        <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.55rem;">Custom SVG Icon Markup (Optional, used when Platform = Custom Social Link)
          <textarea name="custom_svg" rows="2" placeholder="<svg width='16' height='16' viewBox='0 0 24 24'>...</svg>" style="width:100%;padding:0.45rem;font-family:monospace;font-size:0.78rem;margin-top:3px;"><?= e((string)($editingSocial['custom_svg'] ?? '')) ?></textarea>
        </label>

        <label style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;font-weight:600;margin-bottom:0.65rem;">
          <input type="checkbox" name="is_active" value="1" <?= ($editingSocial === null || !empty($editingSocial['is_active'])) ? 'checked' : '' ?>>
          Visible in Header, Footer &amp; Contact Page
        </label><br>

        <button type="submit" class="btn-primary btn-sm"><?= $editingSocial ? 'Update Social Channel' : 'Add Social Channel' ?></button>
        <?php if ($editingSocial): ?><a href="?tab=social" class="btn-outline btn-sm" style="margin-left:0.4rem;">Cancel</a><?php endif; ?>
      </form>

      <h3 style="margin-top:0;">Configured Social Media Icons (<?= count($socialLinks) ?>)</h3>
      <?php foreach ($socialLinks as $lk): ?>
        <div class="admin-list-row">
          <div style="display:flex;align-items:center;gap:0.65rem;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:var(--surface-bg);border:1px solid var(--border-color);color:var(--primary-color);">
              <?= socialPlatformSvg((string)$lk['platform'], (string)($lk['custom_svg'] ?? '')) ?>
            </span>
            <div>
              <strong><?= e((string)$lk['label']) ?></strong>
              <?php if (!empty($lk['handle'])): ?><small style="color:#78716C;">(<?= e((string)$lk['handle']) ?>)</small><?php endif; ?>
              <span class="badge <?= !empty($lk['is_active']) ? 'badge-ok' : 'badge-warn' ?>" style="margin-left:4px;">
                <?= !empty($lk['is_active']) ? 'Visible' : 'Hidden' ?>
              </span>
              <div style="font-size:0.75rem;color:#57534E;word-break:break-all;"><?= e((string)$lk['url']) ?></div>
            </div>
          </div>
          <div style="display:flex;gap:0.35rem;flex-wrap:wrap;">
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="move_social_link"><input type="hidden" name="id" value="<?= (int)$lk['id'] ?>"><button type="submit" name="dir" value="up" class="btn-outline btn-sm">&uarr;</button><button type="submit" name="dir" value="down" class="btn-outline btn-sm">&darr;</button></form>
            <form method="post" style="display:inline;"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="toggle_social_link"><input type="hidden" name="id" value="<?= (int)$lk['id'] ?>"><button type="submit" class="btn-secondary btn-sm"><?= !empty($lk['is_active']) ? 'Hide' : 'Show' ?></button></form>
            <a href="?tab=social&edit_social=<?= (int)$lk['id'] ?>" class="btn-primary btn-sm">Edit</a>
            <form method="post" style="display:inline;" onsubmit="return confirm('Delete this social channel?');"><input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>"><input type="hidden" name="action" value="delete_social_link"><input type="hidden" name="id" value="<?= (int)$lk['id'] ?>"><button type="submit" class="btn-danger btn-sm">Delete</button></form>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <!-- Right Column: Social Sharing Governance & Broadcast Composer -->
    <div style="display:flex;flex-direction:column;gap:1.25rem;">
      <form method="post" class="card">
        <h2 style="margin-top:0;">Social Sharing &amp; OpenGraph Controls</h2>
        <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
        <input type="hidden" name="action" value="save_social_sharing">

        <div style="display:grid;gap:0.45rem;font-size:0.84rem;margin-bottom:0.85rem;">
          <label style="font-weight:700;color:var(--primary-color);"><input type="checkbox" name="sharing_enabled" <?= !empty($socialShareCfg['enabled']) ? 'checked' : '' ?>> Master Toggle: Enable Social Share Buttons Across Website</label>
          <label><input type="checkbox" name="show_icons_header" <?= !empty($socialShareCfg['showIconsInHeader']) ? 'checked' : '' ?>> Show Official Social Icons in Top Utility Header</label>
          <label><input type="checkbox" name="show_icons_footer" <?= !empty($socialShareCfg['showIconsInFooter']) ? 'checked' : '' ?>> Show Official Social Icons in Website Footer</label>
          <label><input type="checkbox" name="show_on_pages" <?= !empty($socialShareCfg['showOnPages']) ? 'checked' : '' ?>> Enable Share Bar on Autonomous Micro-Pages</label>
          <label><input type="checkbox" name="show_on_research" <?= !empty($socialShareCfg['showOnResearch']) ? 'checked' : '' ?>> Enable Share Bar on Research Grants &amp; Patents Portal</label>
          <label><input type="checkbox" name="show_on_conferences" <?= !empty($socialShareCfg['showOnConferences']) ? 'checked' : '' ?>> Enable Share Bar on Conferences, Workshops &amp; FDPs</label>
          <label><input type="checkbox" name="show_on_portals" <?= !empty($socialShareCfg['showOnPortals']) ? 'checked' : '' ?>> Enable Share Bar on Placements, Sports, Facilities &amp; Feedback Portals</label>
        </div>

        <strong style="display:block;font-size:0.82rem;margin-bottom:0.4rem;">Enabled Sharing Platforms:</strong>
        <div class="grid-3" style="font-size:0.82rem;margin-bottom:0.85rem;">
          <?php
            $platNames = [
              'whatsapp' => 'WhatsApp', 'linkedin' => 'LinkedIn', 'twitter' => 'X / Twitter',
              'facebook' => 'Facebook', 'telegram' => 'Telegram', 'email' => 'Email',
              'copyLink' => 'Copy Link', 'nativeShare' => 'Native Web Share',
            ];
            $curPlats = $socialShareCfg['platforms'] ?? [];
            foreach ($platNames as $pk => $pn):
          ?>
            <label><input type="checkbox" name="platforms[<?= e($pk) ?>]" value="1" <?= !empty($curPlats[$pk]) ? 'checked' : '' ?>> <?= e($pn) ?></label>
          <?php endforeach; ?>
        </div>

        <div class="grid-2" style="margin-bottom:0.75rem;">
          <label style="font-size:0.8rem;font-weight:600;">Share Strip Heading
            <input type="text" name="share_heading" value="<?= e((string)($socialShareCfg['shareHeading'] ?? 'Share this update')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">X / Twitter @Handle
            <input type="text" name="twitter_handle" value="<?= e((string)($socialShareCfg['twitterHandle'] ?? 'campus_official')) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
        </div>
        <label style="display:block;font-size:0.8rem;font-weight:600;margin-bottom:0.75rem;">Default Hashtags (comma-separated)
          <input type="text" name="default_hashtags" value="<?= e((string)($socialShareCfg['defaultHashtags'] ?? (trim((string)($s['short_code'] ?? 'Campus')) . ',Engineering,NEP2020'))) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
        </label>

        <button type="submit" class="btn-primary">Save Social Sharing Settings</button>
      </form>

      <!-- Direct Social Post & Broadcast Composer -->
      <div class="card">
        <h2 style="margin-top:0;">Direct Social Post &amp; Broadcast Composer</h2>
        <p style="font-size:0.82rem;color:#57534E;margin-top:-0.25rem;margin-bottom:0.75rem;">
          Draft a campus announcement or research milestone once and publish directly to LinkedIn, X, Facebook, WhatsApp, or Telegram with OpenGraph URL preview.
        </p>
        <div style="display:grid;gap:0.55rem;">
          <label style="font-size:0.8rem;font-weight:600;">Pick Published Page / Portal Link
            <select id="sc-page-picker" style="width:100%;padding:0.45rem;margin-top:3px;">
              <option value="<?= e($canonBase . '/index.php') ?>">Institution Homepage</option>
              <option value="<?= e($canonBase . '/conferences.php') ?>">Conferences &amp; Workshops Hub</option>
              <option value="<?= e($canonBase . '/placements.php') ?>">Training &amp; Placements Portal</option>
              <option value="<?= e($canonBase . '/feedback.php') ?>">Complaint &amp; Feedback Cell</option>
              <?php foreach ($pubPagesList as $pp): ?>
                <option value="<?= e($canonBase . '/page.php?slug=' . urlencode((string)$pp['slug'])) ?>"><?= e((string)$pp['title']) ?></option>
              <?php endforeach; ?>
            </select>
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Target URL
            <input type="url" id="sc-url" value="<?= e($canonBase . '/index.php') ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Announcement Headline
            <input type="text" id="sc-headline" value="<?= e((string)($s['institution_name'] ?? $s['short_code'] ?? 'Institution')) ?> — Institutional Update" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Summary / Caption
            <textarea id="sc-summary" rows="3" style="width:100%;padding:0.45rem;margin-top:3px;" placeholder="Key highlights, dates, or accreditation achievement..."></textarea>
          </label>
          <label style="font-size:0.8rem;font-weight:600;">Hashtags
            <input type="text" id="sc-tags" value="<?= e((string)($socialShareCfg['defaultHashtags'] ?? (trim((string)($s['short_code'] ?? 'Campus')) . ',Engineering'))) ?>" style="width:100%;padding:0.45rem;margin-top:3px;">
          </label>
          <div style="display:flex;flex-wrap:wrap;gap:0.45rem;margin-top:0.25rem;" id="sc-actions">
            <a id="sc-btn-wa" href="#" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm">Post to WhatsApp</a>
            <a id="sc-btn-li" href="#" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm">Post to LinkedIn</a>
            <a id="sc-btn-tw" href="#" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm">Post to X</a>
            <a id="sc-btn-fb" href="#" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm">Post to Facebook</a>
            <a id="sc-btn-tg" href="#" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm">Post to Telegram</a>
            <button type="button" id="sc-btn-copy" class="btn-primary btn-sm">Copy Post Text</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
  (function () {
    var pick = document.getElementById('sc-page-picker');
    var urlEl = document.getElementById('sc-url');
    var headEl = document.getElementById('sc-headline');
    var sumEl = document.getElementById('sc-summary');
    var tagsEl = document.getElementById('sc-tags');
    if (!urlEl || !headEl) return;

    function buildText() {
      var tags = (tagsEl.value || '').split(',').map(function (t) { return t.trim().replace(/^#/, ''); }).filter(Boolean).map(function (t) { return '#' + t; }).join(' ');
      return [headEl.value.trim(), sumEl.value.trim(), tags, urlEl.value.trim()].filter(Boolean).join('\n\n');
    }
    function syncLinks() {
      var u = encodeURIComponent(urlEl.value.trim());
      var txt = encodeURIComponent(buildText());
      var ttl = encodeURIComponent(headEl.value.trim());
      var ht = encodeURIComponent((tagsEl.value || '').replace(/#/g, '').trim());
      document.getElementById('sc-btn-wa').href = 'https://api.whatsapp.com/send?text=' + txt;
      document.getElementById('sc-btn-li').href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + u;
      document.getElementById('sc-btn-tw').href = 'https://twitter.com/intent/tweet?text=' + ttl + '&url=' + u + (ht ? '&hashtags=' + ht : '');
      document.getElementById('sc-btn-fb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + u;
      document.getElementById('sc-btn-tg').href = 'https://t.me/share/url?url=' + u + '&text=' + ttl;
    }
    if (pick) {
      pick.addEventListener('change', function () { urlEl.value = pick.value; syncLinks(); });
    }
    [urlEl, headEl, sumEl, tagsEl].forEach(function (el) { el.addEventListener('input', syncLinks); });
    document.getElementById('sc-btn-copy').addEventListener('click', function () {
      var btn = this;
      var text = buildText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = 'Copied Post!';
          setTimeout(function () { btn.textContent = 'Copy Post Text'; }, 1600);
        });
      }
    });
    syncLinks();
  })();
  </script>
<?php endif; ?>
<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
