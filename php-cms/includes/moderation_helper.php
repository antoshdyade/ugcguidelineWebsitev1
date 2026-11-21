<?php
declare(strict_types=1);

/**
 * SVCOER PHP CMS — Super Admin Content Moderation & Approval Workflow Helper
 * Non-super-admin roles queue creates, updates, and deletes in `content_pending_revisions`
 * without altering live published records until a Super Admin approves.
 */

function cmsIsSuperAdmin(?array $user): bool
{
    return is_array($user) && (($user['role'] ?? '') === 'super_admin');
}

function cmsModerationTableConfig(): array
{
    return [
        'pages' => [
            'label'      => 'CMS Page',
            'status_col' => 'status',
            'pub_col'    => 'is_published',
            'share_col'  => 'is_shareable',
            'title_cols' => ['title', 'slug'],
            'allowed_cols' => [
                'category_id', 'slug', 'title', 'subtitle', 'content_html', 'meta_description',
                'attached_pdf_url', 'attached_pdf_label', 'is_published', 'show_share_bar',
                'is_shareable', 'sort_order', 'updated_by', 'updated_at', 'status',
            ],
        ],
        'departments' => [
            'label'      => 'Department Microsite',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => 'is_shareable',
            'title_cols' => ['name', 'code'],
            'allowed_cols' => [
                'slug', 'code', 'name', 'short_name', 'established_year', 'intake_capacity',
                'nba_status', 'hod_name', 'hod_message', 'overview', 'vision', 'mission',
                'hero_image_url', 'library_json', 'faculty_field_schema_json', 'is_shareable',
                'sort_order', 'status',
            ],
        ],
        'department_subpages' => [
            'label'      => 'Department Sub-Page',
            'status_col' => 'status',
            'pub_col'    => 'is_published',
            'share_col'  => 'is_shareable',
            'title_cols' => ['title', 'slug'],
            'allowed_cols' => [
                'department_id', 'slug', 'title', 'page_type', 'content_html',
                'photos_json', 'items_json', 'sort_order', 'is_published',
                'is_shareable', 'updated_at', 'status',
            ],
        ],
        'conferences' => [
            'label'      => 'Conference / Workshop / FDP',
            'status_col' => 'status',
            'pub_col'    => 'is_published',
            'share_col'  => 'is_shareable',
            'title_cols' => ['short_name', 'title'],
            'allowed_cols' => [
                'slug', 'title', 'short_name', 'scope', 'theme', 'start_date', 'end_date',
                'venue', 'mode', 'organizing_department', 'indexing_partners_json',
                'contact_email', 'contact_phone', 'banner_url', 'hero_slides_json',
                'overview_html', 'cfp_html', 'tracks_json', 'important_dates_json',
                'people_json', 'schedule_json', 'fee_tiers_json', 'submission_mode',
                'external_submission_url', 'external_submission_label',
                'submission_instructions_html', 'enable_poster_presentation',
                'poster_dimensions', 'poster_guidelines_html', 'poster_template_url',
                'poster_prizes_text', 'poster_items_json', 'custom_sections_json',
                'is_published', 'is_featured', 'is_shareable', 'sort_order', 'status',
            ],
        ],
        'sliders' => [
            'label'      => 'Hero Slider',
            'status_col' => 'status',
            'pub_col'    => 'is_active',
            'share_col'  => null,
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'caption', 'image_url', 'cta_label', 'cta_link', 'sort_order', 'is_active', 'status'],
        ],
        'ticker_items' => [
            'label'      => 'Ticker Announcement',
            'status_col' => 'status',
            'pub_col'    => 'is_active',
            'share_col'  => null,
            'title_cols' => ['text'],
            'allowed_cols' => ['text', 'link_url', 'badge_text', 'is_active', 'sort_order', 'status'],
        ],
        'campus_events' => [
            'label'      => 'Campus News / Event',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => 'is_shareable',
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'event_date', 'category', 'summary', 'content_html', 'image_url', 'is_featured', 'is_shareable', 'sort_order', 'status'],
        ],
        'documents' => [
            'label'      => 'Repository Document',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => null,
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'category', 'source_type', 'file_url', 'file_name', 'file_size_bytes', 'mime_type', 'uploaded_at', 'uploaded_by', 'is_quick_link', 'sort_order', 'status'],
        ],
        'gallery_albums' => [
            'label'      => 'Gallery Album',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => null,
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'category', 'event_date', 'cover_url', 'sort_order', 'status'],
        ],
        'leadership_profiles' => [
            'label'      => 'Leadership Profile',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => null,
            'title_cols' => ['name', 'role_title'],
            'allowed_cols' => ['role_title', 'name', 'qualification', 'email', 'phone', 'photo_url', 'bio', 'committee_group', 'sort_order', 'status'],
        ],
        'telephone_directory' => [
            'label'      => 'Directory Entry',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => null,
            'title_cols' => ['officer_name', 'section'],
            'allowed_cols' => ['section', 'officer_name', 'designation', 'extension', 'direct_phone', 'email', 'sort_order', 'status'],
        ],
        'custom_home_components' => [
            'label'      => 'Home HTML Component',
            'status_col' => 'status',
            'pub_col'    => 'is_active',
            'share_col'  => null,
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'placement', 'html_content', 'sort_order', 'is_active', 'status'],
        ],
        'placement_stats' => [
            'label'      => 'Placement Statistic Row',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => null,
            'title_cols' => ['academic_year', 'branch'],
            'allowed_cols' => ['academic_year', 'branch', 'eligible_students', 'placed_students', 'highest_package_lpa', 'average_package_lpa', 'top_recruiters_list', 'sort_order', 'status'],
        ],
        'placement_stories' => [
            'label'      => 'Congratulations Story',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => 'is_shareable',
            'title_cols' => ['student_name', 'company'],
            'allowed_cols' => ['entry_type', 'headline', 'student_name', 'batch_year', 'branch', 'company', 'role_title', 'package_lpa', 'photo_url', 'quote_text', 'is_featured', 'is_shareable', 'sort_order', 'status'],
        ],
        'placement_notices' => [
            'label'      => 'Placement Notice',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => 'is_shareable',
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'notice_date', 'category', 'summary', 'attachment_url', 'link_label', 'is_pinned', 'is_shareable', 'sort_order', 'status'],
        ],
        'placement_custom_sections' => [
            'label'      => 'Placement Custom Section',
            'status_col' => 'status',
            'pub_col'    => 'is_published',
            'share_col'  => null,
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'subtitle', 'section_type', 'html_content', 'payload_json', 'cta_label', 'cta_url', 'is_published', 'sort_order', 'status'],
        ],
        'research_projects' => [
            'label'      => 'Funded Research Project',
            'status_col' => 'moderation_status',
            'pub_col'    => 'is_published',
            'share_col'  => 'is_shareable',
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'funding_agency', 'principal_investigator', 'co_investigator', 'department_code', 'grant_amount_lakhs', 'sanction_year', 'duration', 'status', 'project_code', 'summary', 'document_url', 'is_published', 'is_shareable', 'sort_order', 'moderation_status'],
        ],
        'research_patents' => [
            'label'      => 'Patent / Publication / MoU',
            'status_col' => 'moderation_status',
            'pub_col'    => 'is_published',
            'share_col'  => 'is_shareable',
            'title_cols' => ['title'],
            'allowed_cols' => ['item_type', 'title', 'inventors_or_lead', 'department_code', 'reference_number', 'filing_or_grant_date', 'status', 'partner_or_agency', 'summary', 'external_url', 'is_published', 'is_shareable', 'sort_order', 'moderation_status'],
        ],
        'sports_facilities' => [
            'label'      => 'Sports Facility',
            'status_col' => 'status',
            'pub_col'    => 'is_published',
            'share_col'  => null,
            'title_cols' => ['name'],
            'allowed_cols' => ['name', 'facility_type', 'dimensions_or_capacity', 'timings', 'incharge_name', 'description', 'image_url', 'custom_fields_json', 'is_published', 'sort_order', 'status'],
        ],
        'sports_events' => [
            'label'      => 'Sports Event / Meet',
            'status_col' => 'moderation_status',
            'pub_col'    => 'is_published',
            'share_col'  => 'is_shareable',
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'event_type', 'discipline', 'event_date', 'venue', 'organizer', 'status', 'registration_url', 'description', 'banner_url', 'is_published', 'is_shareable', 'sort_order', 'moderation_status'],
        ],
        'sports_achievements' => [
            'label'      => 'Sports Achievement',
            'status_col' => 'status',
            'pub_col'    => null,
            'share_col'  => null,
            'title_cols' => ['student_or_team_name', 'event_name'],
            'allowed_cols' => ['student_or_team_name', 'department_code', 'batch_year', 'sport_name', 'level', 'medal_or_rank', 'event_name', 'event_date', 'photo_url', 'highlights', 'is_featured', 'sort_order', 'status'],
        ],
        'sports_gallery' => [
            'label'      => 'Sports Gallery Item',
            'status_col' => 'status',
            'pub_col'    => 'is_published',
            'share_col'  => null,
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'media_type', 'category', 'media_url', 'thumbnail_url', 'event_date', 'caption', 'is_published', 'sort_order', 'status'],
        ],
        'sports_notices' => [
            'label'      => 'Sports Notice',
            'status_col' => 'status',
            'pub_col'    => 'is_published',
            'share_col'  => null,
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'notice_date', 'category', 'summary', 'attachment_url', 'registration_link', 'is_pinned', 'is_published', 'sort_order', 'status'],
        ],
        'facilities' => [
            'label'      => 'Campus Facility',
            'status_col' => 'status',
            'pub_col'    => 'is_published',
            'share_col'  => 'is_shareable',
            'title_cols' => ['title'],
            'allowed_cols' => ['title', 'category', 'short_summary', 'description_html', 'location_block', 'capacity', 'timings', 'incharge_name', 'incharge_email', 'incharge_phone', 'image_url', 'brochure_url', 'custom_fields_json', 'is_featured', 'is_published', 'is_shareable', 'sort_order', 'status'],
        ],
        'tender_notices' => [
            'label'      => 'Tender / Purchase Notice',
            'status_col' => 'moderation_status',
            'pub_col'    => 'is_published',
            'share_col'  => 'is_shareable',
            'title_cols' => ['reference_number', 'title'],
            'allowed_cols' => [
                'reference_number', 'title', 'category', 'department_name', 'procurement_mode',
                'estimated_value', 'emd_amount', 'tender_fee', 'publish_date', 'pre_bid_date',
                'submission_deadline', 'bid_opening_date', 'lifecycle_status', 'summary',
                'eligibility_html', 'nit_pdf_url', 'boq_url', 'corrigendum_note',
                'corrigendum_url', 'awarded_to', 'awarded_value', 'po_reference',
                'custom_fields_json', 'is_pinned', 'is_published', 'is_shareable',
                'sort_order', 'moderation_status',
            ],
        ],
    ];
}

function cmsModerationStatusBadge(string $status): string
{
    switch ($status) {
        case 'pending_approval':
            return '<span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.7rem;font-weight:700;background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;">Pending Approval</span>';
        case 'rejected':
            return '<span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.7rem;font-weight:700;background:#FFE4E6;color:#9F1239;border:1px solid #FDA4AF;">Rejected</span>';
        case 'draft':
            return '<span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.7rem;font-weight:700;background:#F5F5F4;color:#57534E;border:1px solid #D6D3D1;">Draft</span>';
        default:
            return '<span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.7rem;font-weight:700;background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;">Published</span>';
    }
}

function cmsCountPendingApprovals(PDO $pdo): int
{
    try {
        return (int)$pdo->query("SELECT COUNT(*) FROM content_pending_revisions WHERE status = 'pending_approval'")->fetchColumn();
    } catch (Throwable $ignored) {
        return 0;
    }
}

function cmsInsertRevisionRow(
    PDO $pdo,
    array $user,
    string $table,
    ?int $entityId,
    string $actionType,
    string $title,
    ?array $currentSnapshot,
    ?array $proposedPayload
): int {
    $stmt = $pdo->prepare(
        'INSERT INTO content_pending_revisions
         (entity_table, entity_id, action_type, entity_title, current_snapshot_json, proposed_payload_json, submitted_by_user_id, submitted_by_name, submitted_by_email, submitted_by_role, status, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $table,
        $entityId,
        $actionType,
        mb_substr(trim($title) ?: ($table . ' #' . ($entityId ?? 0)), 0, 250),
        $currentSnapshot !== null ? json_encode($currentSnapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
        $proposedPayload !== null ? json_encode($proposedPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
        isset($user['id']) ? (int)$user['id'] : null,
        (string)($user['full_name'] ?? $user['email'] ?? 'Editor'),
        (string)($user['email'] ?? ''),
        (string)($user['role'] ?? 'content_editor'),
        'pending_approval',
        gmdate('Y-m-d\TH:i:s\Z'),
    ]);
    $revId = (int)$pdo->lastInsertId();
    if (function_exists('logAudit')) {
        logAudit($pdo, $user, 'submitted_for_approval:' . $actionType, $table, $title);
    }
    return $revId;
}

function cmsQueuePendingCreate(PDO $pdo, array $user, string $table, int $insertedId, string $title, array $payload): int
{
    return cmsInsertRevisionRow($pdo, $user, $table, $insertedId, 'create', $title, null, $payload);
}

function cmsQueuePendingUpdate(PDO $pdo, array $user, string $table, int $entityId, string $title, array $currentSnapshot, array $proposedPayload): int
{
    return cmsInsertRevisionRow($pdo, $user, $table, $entityId, 'update', $title, $currentSnapshot, $proposedPayload);
}

function cmsQueuePendingDelete(PDO $pdo, array $user, string $table, int $entityId, string $title, array $currentSnapshot): int
{
    return cmsInsertRevisionRow($pdo, $user, $table, $entityId, 'delete', $title, $currentSnapshot, null);
}

function cmsApprovePendingRevision(PDO $pdo, array $reviewer, int $revisionId, string $note = ''): array
{
    if (!cmsIsSuperAdmin($reviewer)) {
        return ['ok' => false, 'error' => 'Only Super Admin can approve content revisions.'];
    }
    $configs = cmsModerationTableConfig();
    $st = $pdo->prepare('SELECT * FROM content_pending_revisions WHERE id = ? LIMIT 1');
    $st->execute([$revisionId]);
    $rev = $st->fetch();
    if (!$rev) {
        return ['ok' => false, 'error' => 'Revision record not found.'];
    }
    if (($rev['status'] ?? '') !== 'pending_approval') {
        return ['ok' => false, 'error' => 'This revision has already been reviewed (' . ($rev['status'] ?? '') . ').'];
    }
    $table = (string)$rev['entity_table'];
    if (!isset($configs[$table])) {
        return ['ok' => false, 'error' => 'Unsupported table in revision: ' . $table];
    }
    $cfg = $configs[$table];
    $statusCol = $cfg['status_col'];
    $pubCol = $cfg['pub_col'];
    $entityId = (int)($rev['entity_id'] ?? 0);
    $action = (string)$rev['action_type'];
    $proposed = json_decode((string)($rev['proposed_payload_json'] ?? '{}'), true);
    if (!is_array($proposed)) {
        $proposed = [];
    }

    try {
        $pdo->beginTransaction();

        if ($action === 'create') {
            $sets = ["`$statusCol` = 'published'"];
            if ($pubCol !== null) {
                $desiredPub = array_key_exists($pubCol, $proposed) ? (int)!empty($proposed[$pubCol]) : 1;
                $sets[] = "`$pubCol` = " . ($desiredPub === 1 ? '1' : '0');
            }
            if ($entityId > 0) {
                $pdo->prepare("UPDATE `$table` SET " . implode(', ', $sets) . ' WHERE id = ?')->execute([$entityId]);
            }
        } elseif ($action === 'update') {
            if ($entityId <= 0) {
                $pdo->rollBack();
                return ['ok' => false, 'error' => 'Missing target entity ID for update approval.'];
            }
            $allowed = array_flip($cfg['allowed_cols']);
            $proposed[$statusCol] = 'published';
            if ($table === 'pages') {
                if (array_key_exists('is_shareable', $proposed)) {
                    $proposed['show_share_bar'] = (int)!empty($proposed['is_shareable']);
                } elseif (array_key_exists('show_share_bar', $proposed)) {
                    $proposed['is_shareable'] = (int)!empty($proposed['show_share_bar']);
                }
            }
            $setParts = [];
            $vals = [];
            foreach ($proposed as $col => $val) {
                if (!isset($allowed[$col]) || $col === 'id') {
                    continue;
                }
                $setParts[] = "`$col` = ?";
                $vals[] = $val;
            }
            if (!empty($setParts)) {
                $vals[] = $entityId;
                $pdo->prepare("UPDATE `$table` SET " . implode(', ', $setParts) . ' WHERE id = ?')->execute($vals);
            }
        } elseif ($action === 'delete') {
            if ($entityId > 0) {
                $pdo->prepare("DELETE FROM `$table` WHERE id = ?")->execute([$entityId]);
            }
        }

        $pdo->prepare(
            "UPDATE content_pending_revisions
             SET status = 'approved', reviewer_email = ?, reviewer_note = ?, reviewed_at = ?
             WHERE id = ?"
        )->execute([
            (string)($reviewer['email'] ?? ''),
            trim($note),
            gmdate('Y-m-d\TH:i:s\Z'),
            $revisionId,
        ]);

        $pdo->commit();
        if (function_exists('logAudit')) {
            logAudit($pdo, $reviewer, 'approved_revision:' . $action, $table, (string)$rev['entity_title']);
        }
        return ['ok' => true, 'message' => 'Approved and published ' . $cfg['label'] . ': ' . ($rev['entity_title'] ?? '')];
    } catch (Throwable $ex) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => 'Approval failed: ' . $ex->getMessage()];
    }
}

function cmsRejectPendingRevision(PDO $pdo, array $reviewer, int $revisionId, string $note = ''): array
{
    if (!cmsIsSuperAdmin($reviewer)) {
        return ['ok' => false, 'error' => 'Only Super Admin can reject content revisions.'];
    }
    $configs = cmsModerationTableConfig();
    $st = $pdo->prepare('SELECT * FROM content_pending_revisions WHERE id = ? LIMIT 1');
    $st->execute([$revisionId]);
    $rev = $st->fetch();
    if (!$rev) {
        return ['ok' => false, 'error' => 'Revision record not found.'];
    }
    if (($rev['status'] ?? '') !== 'pending_approval') {
        return ['ok' => false, 'error' => 'This revision has already been reviewed (' . ($rev['status'] ?? '') . ').'];
    }
    $table = (string)$rev['entity_table'];
    $cfg = $configs[$table] ?? null;
    $entityId = (int)($rev['entity_id'] ?? 0);

    try {
        $pdo->beginTransaction();
        if ($cfg && ($rev['action_type'] ?? '') === 'create' && $entityId > 0) {
            $statusCol = $cfg['status_col'];
            $pubCol = $cfg['pub_col'];
            $sets = ["`$statusCol` = 'rejected'"];
            if ($pubCol !== null) {
                $sets[] = "`$pubCol` = 0";
            }
            $pdo->prepare("UPDATE `$table` SET " . implode(', ', $sets) . ' WHERE id = ?')->execute([$entityId]);
        }
        $pdo->prepare(
            "UPDATE content_pending_revisions
             SET status = 'rejected', reviewer_email = ?, reviewer_note = ?, reviewed_at = ?
             WHERE id = ?"
        )->execute([
            (string)($reviewer['email'] ?? ''),
            trim($note),
            gmdate('Y-m-d\TH:i:s\Z'),
            $revisionId,
        ]);
        $pdo->commit();
        if (function_exists('logAudit')) {
            logAudit($pdo, $reviewer, 'rejected_revision:' . ($rev['action_type'] ?? ''), $table, (string)$rev['entity_title']);
        }
        return ['ok' => true, 'message' => 'Revision rejected cleanly. Existing live content remains unchanged.'];
    } catch (Throwable $ex) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        return ['ok' => false, 'error' => 'Rejection failed: ' . $ex->getMessage()];
    }
}

function cmsFormatRevisionFieldDiffs(array $rev): array
{
    $curr = json_decode((string)($rev['current_snapshot_json'] ?? '{}'), true);
    $prop = json_decode((string)($rev['proposed_payload_json'] ?? '{}'), true);
    if (!is_array($curr)) {
        $curr = [];
    }
    if (!is_array($prop)) {
        $prop = [];
    }
    $keys = array_values(array_unique(array_merge(array_keys($curr), array_keys($prop))));
    $ignore = ['id', 'sort_order', 'updated_at', 'updated_by', 'created_at', 'status', 'moderation_status'];
    $action = (string)($rev['action_type'] ?? 'update');

    $fmt = static function ($v): string {
        if ($v === null || $v === '') {
            return '—';
        }
        if (is_array($v)) {
            $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        $s = trim(strip_tags((string)$v));
        if ($s === '') {
            $s = (string)$v;
        }
        return mb_strlen($s) > 260 ? (mb_substr($s, 0, 260) . '…') : $s;
    };

    $diffs = [];
    foreach ($keys as $k) {
        if (in_array($k, $ignore, true)) {
            continue;
        }
        $before = $action === 'create' ? '— (New Record)' : $fmt($curr[$k] ?? null);
        $after = $action === 'delete' ? '— (Queued Delete)' : $fmt($prop[$k] ?? ($curr[$k] ?? null));
        $diffs[] = [
            'field'   => $k,
            'before'  => $before,
            'after'   => $after,
            'changed' => ($action !== 'update') || ($before !== $after),
        ];
    }
    return $diffs;
}
