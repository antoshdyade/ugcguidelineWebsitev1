</main>
<footer class="site-footer">
  <div class="container grid-4">
    <div>
      <h3 style="color:#fff;margin-top:0;"><?= e($settings['institution_name']) ?></h3>
      <p style="font-size:0.85rem;"><?= e($settings['address']) ?></p>
      <p style="font-size:0.85rem;">Phone: <?= e($settings['phone']) ?> · Email: <?= e($settings['email']) ?></p>
      <p style="font-size:0.85rem;">Anti-Ragging Helpline: <?= e($settings['anti_ragging_helpline']) ?></p>
    </div>
    <div>
      <h4 style="color:#fff;">Mandatory Self-Disclosure</h4>
      <p><a href="<?= e(baseUrl('page.php?slug=about-overview')) ?>" style="color:#cbd5e1;">About HEI &amp; Statutes</a></p>
      <p><a href="<?= e(baseUrl('page.php?slug=prospectus-fee-structure')) ?>" style="color:#cbd5e1;">FRA Fee Structure</a></p>
      <p><a href="<?= e(baseUrl('page.php?slug=rti-disclosure')) ?>" style="color:#cbd5e1;">RTI Disclosure</a></p>
      <p><a href="<?= e(baseUrl('page.php?slug=statutory-officers')) ?>" style="color:#cbd5e1;">Statutory Officers</a></p>
    </div>
    <div>
      <h4 style="color:#fff;">Academics &amp; Departments</h4>
      <p><a href="<?= e(baseUrl('page.php?cat=examination')) ?>" style="color:#cbd5e1;">Examination Cell &amp; CoE</a></p>
      <p><a href="<?= e(baseUrl('department.php?dept=computer-science')) ?>" style="color:#cbd5e1;">Computer Science &amp; Engg.</a></p>
      <p><a href="<?= e(baseUrl('department.php?dept=mechanical')) ?>" style="color:#cbd5e1;">Mechanical Engineering</a></p>
      <p><a href="<?= e(baseUrl('department.php?dept=civil')) ?>" style="color:#cbd5e1;">Civil &amp; E&amp;TC Engg.</a></p>
    </div>
    <div>
      <h4 style="color:#fff;">Repositories &amp; Contact</h4>
      <p><a href="<?= e(baseUrl('facilities.php')) ?>" style="color:#cbd5e1;">Campus Facilities</a></p>
      <p><a href="<?= e(baseUrl('sports.php')) ?>" style="color:#cbd5e1;">Sports &amp; Gymkhana</a></p>
      <p><a href="<?= e(baseUrl('quick-links.php')) ?>" style="color:#cbd5e1;">Downloadable Repository</a></p>
      <p><a href="<?= e(baseUrl('conferences.php')) ?>" style="color:#cbd5e1;">Conferences &amp; Events</a></p>
      <p><a href="<?= e(baseUrl('placements.php')) ?>" style="color:#cbd5e1;">Training &amp; Placements</a></p>
      <p><a href="<?= e(baseUrl('alumni.php')) ?>" style="color:#cbd5e1;">Alumni Network &amp; Jobs</a></p>
      <p><a href="<?= e(baseUrl('gallery.php')) ?>" style="color:#cbd5e1;">Picture Gallery</a></p>
      <p><a href="<?= e(baseUrl('contact.php')) ?>" style="color:#cbd5e1;">Telephone Directory</a></p>
      <p><a href="<?= e(baseUrl('admin/login.php')) ?>" style="color:#fde68a;">Staff CMS Login</a></p>
    </div>
  </div>
  <div class="container" style="border-top:1px solid #1e293b;margin-top:1.5rem;padding-top:1rem;font-size:0.8rem;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.75rem;">
    <span>&copy; <?= date('Y') ?> <?= e($settings['institution_name']) ?>. UGC NEP 2020 Public Self-Disclosure Compliant.</span>
    <span style="display:flex;flex-wrap:wrap;align-items:center;gap:0.9rem;">
      <?php
        $__hitFooter = isset($hitStats) && is_array($hitStats) ? $hitStats : (function_exists('getHitCounterStats') ? getHitCounterStats($pdo) : null);
        if ($__hitFooter && !empty($__hitFooter['showInFooter'])):
      ?>
        <span style="display:inline-flex;align-items:center;gap:0.55rem;padding:0.32rem 0.7rem;border:1px solid #334155;border-radius:6px;background:rgba(15,23,42,0.72);color:#e2e8f0;font-variant-numeric:tabular-nums;" title="Standard Website Visit Counter managed from Admin SEO Studio">
          <span style="color:#94a3b8;font-size:0.74rem;text-transform:uppercase;letter-spacing:0.05em;"><?= e($__hitFooter['label'] ?: 'Website Visits') ?>:</span>
          <strong style="color:#fbbf24;font-size:0.86rem;"><?= number_format((int)$__hitFooter['totalHits']) ?></strong>
          <span style="color:#475569;">|</span>
          <span style="font-size:0.74rem;color:#cbd5e1;">Today: <strong><?= number_format((int)$__hitFooter['todayHits']) ?></strong></span>
          <span style="color:#475569;">|</span>
          <span style="font-size:0.74rem;color:#cbd5e1;">Unique: <strong><?= number_format((int)$__hitFooter['uniqueVisitors']) ?></strong></span>
        </span>
      <?php endif; ?>
      <span>
        <a href="<?= e(baseUrl('sitemap.php')) ?>" style="color:#94a3b8;">Sitemap</a> ·
        <a href="<?= e(baseUrl('robots.php')) ?>" style="color:#94a3b8;">Robots.txt</a> ·
        <a href="<?= e(baseUrl('page.php?slug=rti-disclosure')) ?>" style="color:#cbd5e1;">RTI Cell</a> ·
        <a href="<?= e(baseUrl('grievance.php')) ?>" style="color:#cbd5e1;">Grievance Redressal</a>
      </span>
    </span>
  </div>
</footer>
<script src="<?= e(assetUrl('assets/js/accessibility.js')) ?>"></script>
<script>
  if (typeof window.svcoerFont !== 'function') {
    <?php
    $__a11yJsFile = __DIR__ . '/../assets/js/accessibility.js';
    if (is_readable($__a11yJsFile)) {
        echo str_ireplace('</script>', '<\/script>', (string)file_get_contents($__a11yJsFile));
    }
    ?>
  }
</script>
</body>
</html>
