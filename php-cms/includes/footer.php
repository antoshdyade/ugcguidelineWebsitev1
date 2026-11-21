</main>
<?php
$footerCfg = getFooterConfig($pdo);
$footerCols = getFooterColumns($pdo);
$totalFooterBlocks = (!empty($footerCfg['showContactBlock']) ? 1 : 0) + count($footerCols);
?>
<footer class="site-footer">
  <?php if ($totalFooterBlocks > 0): ?>
  <div class="container" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1.5rem;">
    <?php if (!empty($footerCfg['showContactBlock'])): ?>
    <div>
      <h3 style="color:#fff;margin-top:0;"><?= e($settings['institution_name']) ?></h3>
      <p style="font-size:0.85rem;"><?= e($settings['address']) ?></p>
      <p style="font-size:0.85rem;">Phone: <?= e($settings['phone']) ?> · Email: <?= e($settings['email']) ?></p>
      <p style="font-size:0.85rem;">Anti-Ragging Helpline: <?= e($settings['anti_ragging_helpline']) ?></p>
      <?= renderPhpSocialIcons($pdo, 'footer') ?>
    </div>
    <?php endif; ?>
    <?php foreach ($footerCols as $fCol): ?>
    <div>
      <h4 style="color:#fff;"><?= e((string)($fCol['title'] ?? 'Links')) ?></h4>
      <?php foreach (($fCol['links'] ?? []) as $fLk):
        $fHref = resolveConfigurableLinkUrl((string)($fLk['url'] ?? ''));
        $isExtF = preg_match('#^https?://#i', $fHref) === 1;
        $isStaffLink = str_contains($fHref, 'admin/');
      ?>
        <p><a href="<?= e($fHref) ?>" style="color:<?= $isStaffLink ? '#fde68a' : '#cbd5e1' ?>;"<?= $isExtF ? ' target="_blank" rel="noopener noreferrer"' : '' ?>><?= e((string)($fLk['label'] ?? '')) ?></a></p>
      <?php endforeach; ?>
    </div>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>

  <div class="container" style="border-top:1px solid #1e293b;margin-top:1.5rem;padding-top:1rem;font-size:0.8rem;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.75rem;">
    <span>
      <?php if (trim((string)($footerCfg['copyrightText'] ?? '')) !== ''): ?>
        <?= e((string)$footerCfg['copyrightText']) ?>
      <?php else: ?>
        &copy; <?= date('Y') ?> <?= e($settings['institution_name']) ?>.
      <?php endif; ?>
      <?php if (trim((string)($footerCfg['complianceNote'] ?? '')) !== ''): ?>
        <?= e((string)$footerCfg['complianceNote']) ?>
      <?php endif; ?>
    </span>
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
      <?php if (!empty($footerCfg['showBottomLinks']) && !empty($footerCfg['bottomBarLinks'])): ?>
      <span>
        <?php foreach ($footerCfg['bottomBarLinks'] as $bIdx => $bLk):
          $bHref = resolveConfigurableLinkUrl((string)($bLk['url'] ?? ''));
          $isExtB = preg_match('#^https?://#i', $bHref) === 1;
        ?>
          <?php if ($bIdx > 0): ?> · <?php endif; ?>
          <a href="<?= e($bHref) ?>" style="color:#cbd5e1;"<?= $isExtB ? ' target="_blank" rel="noopener noreferrer"' : '' ?>><?= e((string)($bLk['label'] ?? '')) ?></a>
        <?php endforeach; ?>
      </span>
      <?php endif; ?>
    </span>
  </div>

  <?php if (!empty($footerCfg['showCreatorCreditBar'])): ?>
  <div class="container" style="border-top:1px solid rgba(51,65,85,0.65);margin-top:0.85rem;padding-top:0.75rem;font-size:0.76rem;color:#94a3b8;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.5rem;">
    <span>
      <?= e((string)($footerCfg['creatorCreditLabel'] ?: 'Designed & Developed by')) ?>:
      <?php
        $cUrl = trim((string)($footerCfg['creatorCreditUrl'] ?? ''));
        $cName = trim((string)($footerCfg['creatorCreditName'] ?? 'Campus Web & Software Engineering Team'));
      ?>
      <?php if ($cUrl !== ''): ?>
        <a href="<?= e(resolveConfigurableLinkUrl($cUrl)) ?>" style="color:#f8fafc;font-weight:600;text-decoration:none;border-bottom:1px dotted rgba(253,230,138,0.6);"><?= e($cName) ?></a>
      <?php else: ?>
        <strong style="color:#f8fafc;"><?= e($cName) ?></strong>
      <?php endif; ?>
    </span>
    <a href="<?= e(baseUrl('credits.php')) ?>" style="color:#fde68a;font-weight:600;text-decoration:none;">View Developers &amp; Contributors &rarr;</a>
  </div>
  <?php endif; ?>
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
