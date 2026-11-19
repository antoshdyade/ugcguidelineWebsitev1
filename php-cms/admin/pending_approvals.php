<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/auth.php';

$user = requireLogin();
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$msg = '';
$err = '';

if (!cmsIsSuperAdmin($user)) {
    http_response_code(403);
    $adminPageTitle = 'Super Admin Approval Queue';
    require_once __DIR__ . '/../includes/admin_layout_top.php';
    ?>
    <div class="card" style="max-width:680px;">
      <h2 style="margin-top:0;color:#9F1239;">403 — Super Admin Access Required</h2>
      <p style="font-size:0.9rem;color:#57534E;line-height:1.6;">
        Only a <strong>Super Admin</strong> can review, approve, or reject pending content revisions. Any creates, edits, or deletions you submit from your assigned modules are automatically queued here without altering live public pages until reviewed.
      </p>
      <a href="<?= e(baseUrl('admin/dashboard.php')) ?>" class="btn btn-outline">Return to Overview</a>
    </div>
    <?php
    require_once __DIR__ . '/../includes/admin_layout_bottom.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken($_POST['csrf_token'] ?? null);
    $action = (string)($_POST['moderation_action'] ?? '');
    $revId = (int)($_POST['revision_id'] ?? 0);
    $note = trim((string)($_POST['reviewer_note'] ?? ''));

    if ($action === 'approve' && $revId > 0) {
        $res = cmsApprovePendingRevision($pdo, $user, $revId, $note);
        if (!empty($res['ok'])) {
            $msg = (string)($res['message'] ?? 'Revision approved and published.');
        } else {
            $err = (string)($res['error'] ?? 'Could not approve revision.');
        }
    } elseif ($action === 'reject' && $revId > 0) {
        $res = cmsRejectPendingRevision($pdo, $user, $revId, $note);
        if (!empty($res['ok'])) {
            $msg = (string)($res['message'] ?? 'Revision rejected.');
        } else {
            $err = (string)($res['error'] ?? 'Could not reject revision.');
        }
    }
}

$statusFilter = (string)($_GET['status'] ?? 'pending_approval');
if (!in_array($statusFilter, ['pending_approval', 'approved', 'rejected', 'all'], true)) {
    $statusFilter = 'pending_approval';
}

$counts = ['pending_approval' => 0, 'approved' => 0, 'rejected' => 0, 'all' => 0];
try {
    foreach ($pdo->query("SELECT status, COUNT(*) AS cnt FROM content_pending_revisions GROUP BY status")->fetchAll() as $crow) {
        $k = (string)($crow['status'] ?? '');
        if (isset($counts[$k])) {
            $counts[$k] = (int)$crow['cnt'];
        }
        $counts['all'] += (int)$crow['cnt'];
    }
} catch (Throwable $ignored) {
}

if ($statusFilter === 'all') {
    $revisions = $pdo->query('SELECT * FROM content_pending_revisions ORDER BY id DESC LIMIT 200')->fetchAll();
} else {
    $st = $pdo->prepare('SELECT * FROM content_pending_revisions WHERE status = ? ORDER BY id DESC LIMIT 200');
    $st->execute([$statusFilter]);
    $revisions = $st->fetchAll();
}

$tableConfigs = cmsModerationTableConfig();
$adminPageTitle = 'Pending Content Approvals';
require_once __DIR__ . '/../includes/admin_layout_top.php';
?>

<div class="card" style="margin-bottom:1.25rem;">
  <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:1rem;">
    <div>
      <h2 style="margin:0 0 0.25rem;">Super Admin Moderation Queue</h2>
      <p style="margin:0;font-size:0.84rem;color:#57534E;">
        All creates, updates, and deletions submitted by non-Super Admin roles are held here. Live published records remain intact until you approve or reject each revision.
      </p>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
      <?php
      $tabs = [
          'pending_approval' => 'Pending (' . $counts['pending_approval'] . ')',
          'approved'         => 'Approved (' . $counts['approved'] . ')',
          'rejected'         => 'Rejected (' . $counts['rejected'] . ')',
          'all'              => 'All (' . $counts['all'] . ')',
      ];
      foreach ($tabs as $key => $label):
          $isActive = ($statusFilter === $key);
      ?>
        <a href="?status=<?= e($key) ?>" class="btn <?= $isActive ? 'btn-primary' : 'btn-outline' ?>" style="font-size:0.78rem;padding:0.42rem 0.78rem;"><?= e($label) ?></a>
      <?php endforeach; ?>
    </div>
  </div>
</div>

<?php if (empty($revisions)): ?>
  <div class="card" style="text-align:center;padding:2.5rem 1.5rem;color:#57534E;">
    <p style="margin:0;font-size:0.95rem;font-weight:600;">No revisions in &ldquo;<?= e(str_replace('_', ' ', $statusFilter)) ?>&rdquo; queue.</p>
  </div>
<?php else: ?>
  <div style="display:flex;flex-direction:column;gap:1rem;">
    <?php foreach ($revisions as $rev):
      $tbl = (string)$rev['entity_table'];
      $tblLabel = (string)($tableConfigs[$tbl]['label'] ?? $tbl);
      $act = (string)$rev['action_type'];
      $actBg = $act === 'delete' ? '#FFE4E6' : ($act === 'update' ? '#EFF6FF' : '#ECFDF5');
      $actColor = $act === 'delete' ? '#9F1239' : ($act === 'update' ? '#1D4ED8' : '#065F46');
      $diffs = cmsFormatRevisionFieldDiffs($rev);
    ?>
      <div class="card" style="border-left:4px solid <?= $rev['status'] === 'pending_approval' ? '#F59E0B' : ($rev['status'] === 'approved' ? '#059669' : '#E11D48') ?>;">
        <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:0.75rem;margin-bottom:0.85rem;">
          <div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.45rem;margin-bottom:0.3rem;">
              <span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:6px;font-size:0.7rem;font-weight:800;text-transform:uppercase;background:<?= $actBg ?>;color:<?= $actColor ?>;">
                <?= e($act) ?>
              </span>
              <span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:6px;font-size:0.7rem;font-weight:700;background:#F5F5F4;color:#44403C;border:1px solid #E7E5E4;">
                <?= e($tblLabel) ?> <?= !empty($rev['entity_id']) ? ('#' . (int)$rev['entity_id']) : '' ?>
              </span>
              <?= cmsModerationStatusBadge((string)$rev['status']) ?>
            </div>
            <h3 style="margin:0;font-size:1.05rem;color:#1C1917;"><?= e((string)$rev['entity_title']) ?></h3>
            <p style="margin:0.2rem 0 0;font-size:0.78rem;color:#78716C;">
              Submitted by <strong><?= e((string)$rev['submitted_by_name']) ?></strong>
              (<?= e((string)$rev['submitted_by_email']) ?> · <?= e(str_replace('_', ' ', (string)$rev['submitted_by_role'])) ?>)
              on <?= e((string)$rev['submitted_at']) ?>
            </p>
            <?php if (!empty($rev['reviewed_at'])): ?>
              <p style="margin:0.2rem 0 0;font-size:0.78rem;color:#57534E;">
                Reviewed by <strong><?= e((string)$rev['reviewer_email']) ?></strong> at <?= e((string)$rev['reviewed_at']) ?>
                <?php if (!empty($rev['reviewer_note'])): ?> — Note: <em><?= e((string)$rev['reviewer_note']) ?></em><?php endif; ?>
              </p>
            <?php endif; ?>
          </div>
        </div>

        <?php if (!empty($diffs)): ?>
          <div style="overflow-x:auto;border:1px solid #E7E5E4;border-radius:8px;margin-bottom:0.85rem;">
            <table class="cms-table" style="margin:0;font-size:0.78rem;">
              <thead>
                <tr>
                  <th style="width:18%;">Field</th>
                  <th style="width:41%;">Live Value (Before)</th>
                  <th style="width:41%;">Proposed Value (After)</th>
                </tr>
              </thead>
              <tbody>
                <?php foreach ($diffs as $df): ?>
                  <tr style="<?= !empty($df['changed']) ? 'background:#FFFBEB;' : '' ?>">
                    <td style="font-family:monospace;font-weight:700;color:#1C1917;">
                      <?= e((string)$df['field']) ?>
                      <?php if (!empty($df['changed']) && $act === 'update'): ?>
                        <span style="display:inline-block;margin-left:4px;font-size:0.65rem;color:#B45309;font-family:sans-serif;">[CHANGED]</span>
                      <?php endif; ?>
                    </td>
                    <td style="color:#57534E;word-break:break-word;"><?= e((string)$df['before']) ?></td>
                    <td style="color:#1C1917;font-weight:<?= !empty($df['changed']) ? '600' : '400' ?>;word-break:break-word;"><?= e((string)$df['after']) ?></td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        <?php endif; ?>

        <?php if ($rev['status'] === 'pending_approval'): ?>
          <form method="post" style="display:flex;flex-wrap:wrap;align-items:center;gap:0.6rem;padding-top:0.5rem;border-top:1px solid #F5F5F4;">
            <input type="hidden" name="csrf_token" value="<?= e(csrfToken()) ?>">
            <input type="hidden" name="revision_id" value="<?= (int)$rev['id'] ?>">
            <input type="text" name="reviewer_note" placeholder="Optional reviewer note / feedback..." style="flex:1;min-width:220px;padding:0.45rem 0.65rem;border:1px solid #D6D3D1;border-radius:8px;font-size:0.8rem;">
            <button type="submit" name="moderation_action" value="approve" class="btn btn-primary" style="background:#059669;border-color:#059669;">Approve &amp; Publish</button>
            <button type="submit" name="moderation_action" value="reject" class="btn btn-outline" style="color:#BE123C;border-color:#FDA4AF;" onclick="return confirm('Reject this revision? Live published data will not change.');">Reject Revision</button>
          </form>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
  </div>
<?php endif; ?>

<?php require_once __DIR__ . '/../includes/admin_layout_bottom.php'; ?>
