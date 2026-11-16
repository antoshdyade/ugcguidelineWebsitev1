<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$summary = [
    'summaryNote'      => 'With a 91.1% placement track record and 250+ visiting recruiters, our Training & Placement Cell delivers structured aptitude, coding, Communication Improvement Programs (CIP), and industry internship mentorship.',
    'coordinatorName'  => 'Dr. S. B. Kulkarni',
    'coordinatorEmail' => 'tnp@coe.sveri.ac.in',
    'coordinatorPhone' => '+91-02186-216063',
];
try {
    $rawSum = $pdo->query("SELECT val_json FROM cms_kv_store WHERE key_name = 'placements_summary' LIMIT 1")->fetchColumn();
    if ($rawSum) {
        $dec = json_decode((string)$rawSum, true);
        if (is_array($dec)) $summary = array_merge($summary, $dec);
    }
} catch (Throwable $ignored) {
}

$stats = $pdo->query('SELECT * FROM placement_stats ORDER BY sort_order ASC, id ASC')->fetchAll();
$stories = $pdo->query('SELECT * FROM placement_stories ORDER BY sort_order ASC, id ASC')->fetchAll();

$totalEligible = 0;
$totalPlaced = 0;
$maxPkg = 0.0;
foreach ($stats as $st) {
    $totalEligible += (int)$st['eligible_students'];
    $totalPlaced += (int)$st['placed_students'];
    $maxPkg = max($maxPkg, (float)$st['highest_package_lpa']);
}
$ratio = $totalEligible > 0 ? round(($totalPlaced / $totalEligible) * 100, 1) : 0.0;

$pageTitle = 'Training & Placement Cell (T&P)';
require_once __DIR__ . '/includes/header.php';
?>

<section class="alumni-hero" style="margin-bottom:1.25rem;">
  <span style="display:inline-block;padding:0.2rem 0.65rem;border-radius:999px;background:rgba(255,255,255,0.14);font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Training &amp; Placement Desk (T&amp;P)</span>
  <h1 style="margin:0.45rem 0 0.35rem;font-family:'Playfair Display',serif;font-size:clamp(1.45rem,2.6vw,2.05rem);color:#fff;">
    Campus Placements, Recruiter Outcomes &amp; Corporate Relations
  </h1>
  <p style="margin:0;color:#E2E8F0;max-width:780px;font-size:0.93rem;"><?= e((string)$summary['summaryNote']) ?></p>
</section>

<section class="grid-4" style="margin-bottom:1.5rem;">
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Total Placed Scholars</div><div style="font-size:1.75rem;font-weight:700;color:var(--primary-color);"><?= (int)$totalPlaced ?></div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Placement Ratio</div><div style="font-size:1.75rem;font-weight:700;color:#047857;"><?= e((string)$ratio) ?>%</div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">Highest Package</div><div style="font-size:1.75rem;font-weight:700;color:var(--secondary-color);"><?= e(number_format($maxPkg, 1)) ?> LPA</div></div>
  <div class="card"><div style="font-size:0.75rem;color:var(--text-muted);font-weight:700;">T&amp;P Officer</div><div style="font-size:0.95rem;font-weight:700;color:var(--primary-color);"><?= e((string)$summary['coordinatorName']) ?></div><small style="color:var(--text-muted);"><?= e((string)$summary['coordinatorEmail']) ?></small></div>
</section>

<section class="card" style="margin-bottom:1.5rem;">
  <h2 style="margin-top:0;color:var(--primary-color);">Branch-Wise Campus Placement Records</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th>Academic Year</th>
        <th>Department / Branch</th>
        <th>Eligible</th>
        <th>Placed</th>
        <th>Highest (LPA)</th>
        <th>Average (LPA)</th>
        <th>Key Recruiting Partners</th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($stats as $row): ?>
        <tr>
          <td><?= e($row['academic_year']) ?></td>
          <td><strong><?= e($row['branch']) ?></strong></td>
          <td><?= (int)$row['eligible_students'] ?></td>
          <td><strong style="color:#047857;"><?= (int)$row['placed_students'] ?></strong></td>
          <td><?= e(number_format((float)$row['highest_package_lpa'], 2)) ?></td>
          <td><?= e(number_format((float)$row['average_package_lpa'], 2)) ?></td>
          <td><?= e((string)$row['top_recruiters_list']) ?></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
</section>

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
