<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$settings = getSiteSettings($pdo);

$summary = [
    'summaryNote'      => 'With a 91.1% placement track record and 250+ visiting recruiters, our Training & Placement Cell delivers structured aptitude, coding, Communication Improvement Programs (CIP), and industry internship mentorship.',
    'coordinatorName'  => 'Dr. S. B. Kulkarni',
    'coordinatorEmail' => 'tnp@coe.sveri.ac.in',
    'coordinatorPhone' => '+91-02186-216063',
    'recruiters'       => $settings['recruiters'] ?? 'TCS Digital, Infosys, Accenture, Deloitte, Qualcomm, KPIT, Bharat Forge, Atlas Copco, Tata Power, Wipro, Tech Mahindra, L&T',
];
try {
    $rawSum = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'placements_summary' LIMIT 1")->fetchColumn();
    if ($rawSum) {
        $dec = json_decode((string)$rawSum, true);
        if (is_array($dec)) {
            $summary = array_merge($summary, array_filter($dec, static fn($v) => $v !== null && $v !== ''));
        }
    }
} catch (Throwable $ignored) {
}

$stats = $pdo->query('SELECT * FROM placement_stats ORDER BY sort_order ASC, id ASC')->fetchAll();
$stories = $pdo->query('SELECT * FROM placement_stories ORDER BY sort_order ASC, id ASC')->fetchAll();
$drives = getPlacementDrives($pdo);
$intakePrograms = getSanctionedIntakePrograms($pdo);

$totalEligible = 0;
$totalPlaced = 0;
$maxPkg = 0.0;
foreach ($stats as $st) {
    $totalEligible += (int)$st['eligible_students'];
    $totalPlaced += (int)$st['placed_students'];
    $maxPkg = max($maxPkg, (float)$st['highest_package_lpa']);
}
$ratio = $totalEligible > 0 ? round(($totalPlaced / $totalEligible) * 100, 1) : 0.0;
$totalIntake = array_sum(array_map(static fn(array $r): int => (int)($r['intake'] ?? 0), $intakePrograms));
$recruiterList = array_values(array_filter(array_map('trim', explode(',', (string)($summary['recruiters'] ?? '')))));

$pageTitle = 'Training & Placement Cell (T&P) & Academic Programs';
require_once __DIR__ . '/includes/header.php';
?>

<section class="alumni-hero" style="margin-bottom:1.25rem;">
  <span style="display:inline-block;padding:0.2rem 0.65rem;border-radius:999px;background:rgba(255,255,255,0.14);font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Training &amp; Placement Desk (T&amp;P) · Autonomous Cell</span>
  <h1 style="margin:0.45rem 0 0.35rem;font-family:'Playfair Display',serif;font-size:clamp(1.45rem,2.6vw,2.05rem);color:#fff;">
    Campus Placements, Drives, Recruiters &amp; Sanctioned Intake
  </h1>
  <p style="margin:0;color:#E2E8F0;max-width:780px;font-size:0.93rem;"><?= e((string)$summary['summaryNote']) ?></p>
</section>

<section class="grid-4" style="margin-bottom:1.5rem;">
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Total Placed Scholars</div><div style="font-size:1.75rem;font-weight:700;color:var(--primary-color);"><?= (int)$totalPlaced ?></div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Placement Ratio</div><div style="font-size:1.75rem;font-weight:700;color:#047857;"><?= e((string)$ratio) ?>%</div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Highest Package</div><div style="font-size:1.75rem;font-weight:700;color:var(--secondary-color);"><?= e(number_format($maxPkg, 1)) ?> LPA</div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">T&amp;P Officer</div><div style="font-size:0.95rem;font-weight:700;color:var(--primary-color);"><?= e((string)$summary['coordinatorName']) ?></div><small style="color:var(--text-muted);"><?= e((string)$summary['coordinatorEmail']) ?> · <?= e((string)$summary['coordinatorPhone']) ?></small></div>
</section>

<!-- Formatted Branch-Wise Campus Placement Statistics -->
<section class="card" style="margin-bottom:1.5rem;">
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
    <h2 style="margin:0;color:var(--primary-color);">Branch-Wise Campus Placement Statistics</h2>
    <span class="badge badge-ok">Overall Placed: <?= (int)$totalPlaced ?> / <?= (int)$totalEligible ?> (<?= e((string)$ratio) ?>%)</span>
  </div>
  <div class="cms-table-wrap">
    <table class="cms-table cms-table-navy">
      <thead>
        <tr>
          <th>Academic Year</th>
          <th>Department / Branch</th>
          <th>Eligible</th>
          <th>Placed</th>
          <th>Placement %</th>
          <th>Highest (LPA)</th>
          <th>Average (LPA)</th>
          <th>Key Recruiting Partners</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($stats as $row):
          $el = max(0, (int)$row['eligible_students']);
          $pl = max(0, (int)$row['placed_students']);
          $pct = $el > 0 ? round(($pl / $el) * 100, 1) : 0.0;
          $barW = min(100, max(0, $pct));
        ?>
          <tr>
            <td><?= e($row['academic_year']) ?></td>
            <td><strong><?= e($row['branch']) ?></strong></td>
            <td><?= $el ?></td>
            <td><strong style="color:#047857;"><?= $pl ?></strong></td>
            <td>
              <div style="display:flex;align-items:center;gap:0.45rem;">
                <span class="cms-progress-track"><span class="cms-progress-fill" style="width:<?= $barW ?>%;"></span></span>
                <strong style="font-size:0.8rem;"><?= e((string)$pct) ?>%</strong>
              </div>
            </td>
            <td><?= e(number_format((float)$row['highest_package_lpa'], 2)) ?></td>
            <td><?= e(number_format((float)$row['average_package_lpa'], 2)) ?></td>
            <td><?= e((string)$row['top_recruiters_list']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</section>

<!-- Upcoming Campus Placement Drives -->
<?php if (!empty($drives)): ?>
  <section style="margin-bottom:1.5rem;">
    <h2 style="color:var(--primary-color);margin-bottom:0.75rem;">Upcoming &amp; Active Campus Recruitment Drives</h2>
    <div class="grid-2">
      <?php foreach ($drives as $drv): ?>
        <article class="card" style="border-left:4px solid <?= ($drv['status'] ?? '') === 'Registrations Open' ? '#047857' : 'var(--secondary-color)' ?>;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;">
            <div>
              <h3 style="margin:0 0 0.2rem;font-size:1.05rem;color:var(--primary-color);"><?= e((string)($drv['company'] ?? '')) ?></h3>
              <div style="font-size:0.85rem;font-weight:600;color:var(--secondary-color);"><?= e((string)($drv['roleTitle'] ?? '')) ?> · <?= e((string)($drv['packageLpa'] ?? '')) ?></div>
            </div>
            <span class="badge <?= ($drv['status'] ?? '') === 'Registrations Open' ? 'badge-ok' : 'badge-warn' ?>"><?= e((string)($drv['status'] ?? 'Upcoming')) ?></span>
          </div>
          <div style="margin-top:0.6rem;font-size:0.82rem;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:0.35rem 1rem;">
            <span><strong>Date:</strong> <?= e((string)($drv['driveDate'] ?? '')) ?></span>
            <span><strong>Eligible:</strong> <?= e((string)($drv['eligibleBranches'] ?? '')) ?></span>
            <span><strong>Venue:</strong> <?= e((string)($drv['venue'] ?? '')) ?></span>
          </div>
          <?php if (!empty($drv['registrationUrl']) && validateExternalUrl((string)$drv['registrationUrl'])): ?>
            <div style="margin-top:0.75rem;">
              <a href="<?= e((string)$drv['registrationUrl']) ?>" target="_blank" rel="noopener noreferrer" class="btn-primary btn-sm">Apply / Register for Drive &#8599;</a>
            </div>
          <?php endif; ?>
        </article>
      <?php endforeach; ?>
    </div>
  </section>
<?php endif; ?>

<!-- Esteemed Recruiters Directory -->
<?php if (!empty($recruiterList)): ?>
  <section class="card" style="margin-bottom:1.5rem;">
    <h2 style="margin-top:0;color:var(--primary-color);">Esteemed Corporate &amp; Core Industry Recruiters</h2>
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
      <?php foreach ($recruiterList as $rec): ?>
        <span style="padding:0.38rem 0.8rem;border:1px solid var(--border-color);border-radius:8px;background:var(--surface-bg);font-size:0.83rem;font-weight:600;color:var(--primary-color);"><?= e($rec) ?></span>
      <?php endforeach; ?>
    </div>
  </section>
<?php endif; ?>

<!-- AICTE Sanctioned Intake & FRA Fee Matrix -->
<?php if (!empty($intakePrograms)): ?>
  <section class="card" style="margin-bottom:1.5rem;">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.5rem;">
      <h2 style="margin:0;color:var(--primary-color);">AICTE Sanctioned Programs, Annual Intake &amp; FRA Fee Matrix</h2>
      <span class="badge badge-ok">Total Sanctioned Intake: <?= (int)$totalIntake ?> Seats</span>
    </div>
    <div class="cms-table-wrap">
      <table class="cms-table cms-table-navy">
        <thead>
          <tr>
            <th>Level</th>
            <th>Program / Branch Name</th>
            <th>DTE Choice Code</th>
            <th>Sanctioned Intake</th>
            <th>Accreditation Status</th>
            <th>FRA Approved Fee / Year</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($intakePrograms as $prog): ?>
            <tr>
              <td><span class="alumni-pill"><?= e((string)($prog['degreeLevel'] ?? 'UG')) ?></span></td>
              <td><strong><?= e((string)($prog['programName'] ?? '')) ?></strong></td>
              <td><code><?= e((string)($prog['code'] ?? '')) ?></code></td>
              <td><strong><?= (int)($prog['intake'] ?? 0) ?></strong></td>
              <td><?= e((string)($prog['nbaStatus'] ?? '')) ?></td>
              <td><strong><?= e((string)($prog['annualFee'] ?? '')) ?></strong></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </section>
<?php endif; ?>

<?php if (!empty($stories)): ?>
  <section style="margin-bottom:2rem;">
    <h2 style="color:var(--primary-color);">Placed Student Highlights &amp; Offers</h2>
    <div class="grid-3">
      <?php foreach ($stories as $st): ?>
        <article class="card" style="display:flex;flex-direction:column;gap:0.65rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <img src="<?= e(mediaUrl($st['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="<?= e($st['student_name']) ?>" style="width:62px;height:62px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);">
            <div>
              <h3 style="margin:0;font-size:1rem;"><?= e($st['student_name']) ?></h3>
              <div style="font-size:0.78rem;color:var(--secondary-color);font-weight:700;"><?= e($st['company']) ?> · <?= e($st['package_lpa']) ?></div>
              <small style="color:var(--text-muted);"><?= e($st['branch']) ?> · Batch <?= e($st['batch_year']) ?></small>
            </div>
          </div>
          <div style="font-size:0.82rem;font-weight:600;color:var(--primary-color);"><?= e($st['role_title']) ?></div>
          <?php if (!empty($st['quote_text'])): ?>
            <p style="margin:0;font-size:0.83rem;color:var(--text-muted);font-style:italic;">&ldquo;<?= e($st['quote_text']) ?>&rdquo;</p>
          <?php endif; ?>
        </article>
      <?php endforeach; ?>
    </div>
  </section>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
