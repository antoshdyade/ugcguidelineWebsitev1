<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$siteSettings = getSiteSettings($pdo);
$cp = getCreditsPageConfig($pdo);

$activeContributors = array_values(array_filter(
    $cp['contributors'] ?? [],
    static fn(array $c): bool => !empty($c['isActive']) && trim((string)($c['name'] ?? '')) !== ''
));

$pageTitle = $cp['pageTitle'] ?: 'Platform Creators, Developers & Contributors';
$pageDesc  = $cp['pageSubtitle'] ?: 'Meet the creators, lead developers, UI/UX designers, and institutional contributors behind the portal.';
$seoContext = [
    'canonicalPath' => 'credits.php',
    'description'   => $pageDesc,
];

$creditsInitials = static function (string $name): string {
    $parts = preg_split('/\s+/', trim($name)) ?: [];
    $out = '';
    foreach (array_slice($parts, 0, 2) as $p) {
        if ($p !== '') {
            $out .= strtoupper(substr($p, 0, 1));
        }
    }
    return $out !== '' ? $out : 'DEV';
};

require_once __DIR__ . '/includes/header.php';
?>
<div style="margin:0.75rem 0 1.25rem;">
  <a href="<?= e(baseUrl('index.php')) ?>" class="btn-secondary" style="font-size:0.82rem;padding:0.35rem 0.75rem;">
    &larr; Back to <?= e($siteSettings['short_code'] ?: 'Campus') ?> Home
  </a>
</div>

<section class="hero-banner" style="padding:1.85rem 2rem;margin-bottom:1.25rem;border-radius:14px;">
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1.25rem;">
    <div style="max-width:720px;">
      <p style="text-transform:uppercase;letter-spacing:0.12em;font-size:0.74rem;font-weight:700;color:#fde68a;margin:0 0 0.45rem;">
        <?= e((string)($cp['eyebrow'] ?: 'Portal Architecture & Attribution')) ?>
      </p>
      <h1 style="margin:0 0 0.5rem;color:#fff;font-size:2rem;line-height:1.18;">
        <?= e((string)($cp['pageTitle'] ?: 'Platform Creators, Developers & Contributors')) ?>
      </h1>
      <?php if (trim((string)($cp['pageSubtitle'] ?? '')) !== ''): ?>
        <p style="margin:0;color:#e2e8f0;font-size:0.96rem;line-height:1.6;">
          <?= e((string)$cp['pageSubtitle']) ?>
        </p>
      <?php endif; ?>
    </div>
    <div style="border:1px solid rgba(255,255,255,0.2);background:rgba(15,23,42,0.45);border-radius:10px;padding:0.85rem 1.05rem;min-width:220px;font-variant-numeric:tabular-nums;">
      <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.1em;color:#fde68a;font-weight:700;">Release Metadata</div>
      <div style="color:#fff;font-weight:700;font-size:0.96rem;margin-top:0.2rem;"><?= e((string)($cp['projectVersion'] ?: 'Enterprise Release')) ?></div>
      <div style="color:#cbd5e1;font-size:0.78rem;margin-top:0.2rem;"><?= e((string)($cp['organizationCredit'] ?: $siteSettings['institution_name'])) ?></div>
      <?php if (trim((string)($cp['releaseYear'] ?? '')) !== ''): ?>
        <div style="color:#94a3b8;font-size:0.74rem;margin-top:0.15rem;">Year: <?= e((string)$cp['releaseYear']) ?></div>
      <?php endif; ?>
    </div>
  </div>
</section>

<div class="card" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.85rem;margin-bottom:1.25rem;padding:0.95rem 1.25rem;">
  <div style="font-size:0.88rem;color:var(--text-muted);">
    <strong style="color:var(--text-color);"><?= e($siteSettings['institution_name']) ?></strong>
    <?php if (trim((string)($cp['licenseNote'] ?? '')) !== ''): ?>
      · <?= e((string)$cp['licenseNote']) ?>
    <?php endif; ?>
  </div>
  <?= renderPhpSocialShareBar($pdo, (string)$cp['pageTitle'], (string)$cp['pageSubtitle'], 'credits.php', 'page', !empty($cp['isShareable']), true) ?>
</div>

<?php if (!empty($cp['showContributorsSection'])): ?>
<section style="margin-bottom:1.75rem;">
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:0.75rem;margin-bottom:0.85rem;border-bottom:1px solid var(--border-color);padding-bottom:0.5rem;">
    <h2 style="margin:0;font-size:1.35rem;">Creators, Developers &amp; Contributors</h2>
    <span style="font-size:0.82rem;color:var(--text-muted);font-variant-numeric:tabular-nums;"><?= count($activeContributors) ?> active member<?= count($activeContributors) === 1 ? '' : 's' ?></span>
  </div>
  <?php if (empty($activeContributors)): ?>
    <div class="card" style="text-align:center;color:var(--text-muted);padding:2rem;">
      No active contributors listed yet. Administrators can add Creators, Lead Developers, and Contributors from Site Settings.
    </div>
  <?php else: ?>
    <div class="grid-3" style="gap:1.1rem;">
      <?php foreach ($activeContributors as $c):
        $photo = trim((string)($c['photoUrl'] ?? ''));
        $email = trim((string)($c['email'] ?? ''));
        $github = trim((string)($c['githubUrl'] ?? ''));
        $linkedin = trim((string)($c['linkedinUrl'] ?? ''));
        $website = trim((string)($c['websiteUrl'] ?? ''));
        $init = $creditsInitials((string)$c['name']);
      ?>
      <article class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:0.85rem;">
        <div>
          <div style="display:flex;align-items:flex-start;gap:0.85rem;margin-bottom:0.75rem;">
            <?php if ($photo !== ''): ?>
              <img src="<?= e(mediaUrl($photo)) ?>" alt="<?= e((string)$c['name']) ?>" style="width:56px;height:56px;border-radius:12px;object-fit:cover;border:1px solid var(--border-color);flex-shrink:0;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
              <div style="display:none;width:56px;height:56px;border-radius:12px;background:var(--primary-color);color:#fff;font-weight:700;font-size:1.05rem;align-items:center;justify-content:center;flex-shrink:0;"><?= e($init) ?></div>
            <?php else: ?>
              <div style="display:flex;width:56px;height:56px;border-radius:12px;background:var(--primary-color);color:#fff;font-weight:700;font-size:1.05rem;align-items:center;justify-content:center;flex-shrink:0;"><?= e($init) ?></div>
            <?php endif; ?>
            <div style="min-width:0;flex:1;">
              <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-color);margin-bottom:0.15rem;">
                <?= e((string)($c['category'] ?: 'Contributor')) ?>
              </div>
              <h3 style="margin:0;font-size:1.06rem;line-height:1.28;color:var(--primary-color);"><?= e((string)$c['name']) ?></h3>
              <?php if (trim((string)($c['role'] ?? '')) !== ''): ?>
                <div style="font-size:0.82rem;font-weight:600;color:var(--text-color);margin-top:0.15rem;"><?= e((string)$c['role']) ?></div>
              <?php endif; ?>
            </div>
          </div>

          <?php if (trim((string)($c['affiliation'] ?? '')) !== ''): ?>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.45rem;"><?= e((string)$c['affiliation']) ?></div>
          <?php endif; ?>
          <?php if (trim((string)($c['bio'] ?? '')) !== ''): ?>
            <p style="font-size:0.86rem;line-height:1.58;color:var(--text-color);margin:0 0 0.65rem;"><?= e((string)$c['bio']) ?></p>
          <?php endif; ?>
          <?php if (trim((string)($c['contributions'] ?? '')) !== ''): ?>
            <div style="border-top:1px solid var(--border-color);padding-top:0.5rem;font-size:0.78rem;color:var(--text-muted);">
              <strong style="color:var(--text-color);">Focus Areas:</strong> <?= e((string)$c['contributions']) ?>
            </div>
          <?php endif; ?>
        </div>

        <?php if ($email !== '' || $github !== '' || $linkedin !== '' || $website !== ''): ?>
          <div style="border-top:1px solid var(--border-color);padding-top:0.65rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
            <?php if ($email !== ''): ?>
              <a href="mailto:<?= e($email) ?>" class="share-icon-btn is-compact" title="Email <?= e((string)$c['name']) ?>" aria-label="Email <?= e((string)$c['name']) ?>">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </a>
            <?php endif; ?>
            <?php if ($github !== '' && validateExternalUrl($github)): ?>
              <a href="<?= e($github) ?>" target="_blank" rel="noopener noreferrer" class="share-icon-btn is-compact" title="GitHub profile of <?= e((string)$c['name']) ?>" aria-label="GitHub profile of <?= e((string)$c['name']) ?>">
                <?= socialPlatformSvg('github') ?>
              </a>
            <?php endif; ?>
            <?php if ($linkedin !== '' && validateExternalUrl($linkedin)): ?>
              <a href="<?= e($linkedin) ?>" target="_blank" rel="noopener noreferrer" class="share-icon-btn is-compact" title="LinkedIn profile of <?= e((string)$c['name']) ?>" aria-label="LinkedIn profile of <?= e((string)$c['name']) ?>">
                <?= socialPlatformSvg('linkedin') ?>
              </a>
            <?php endif; ?>
            <?php if ($website !== '' && validateExternalUrl($website)): ?>
              <a href="<?= e($website) ?>" target="_blank" rel="noopener noreferrer" class="share-icon-btn is-compact" title="Website of <?= e((string)$c['name']) ?>" aria-label="Website of <?= e((string)$c['name']) ?>">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
              </a>
            <?php endif; ?>
          </div>
        <?php endif; ?>
      </article>
      <?php endforeach; ?>
    </div>
  <?php endif; ?>
</section>
<?php endif; ?>

<?php if (!empty($cp['showTechStackSection']) && !empty($cp['techStack'])): ?>
<section style="margin-bottom:1.75rem;">
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:0.75rem;margin-bottom:0.85rem;border-bottom:1px solid var(--border-color);padding-bottom:0.5rem;">
    <h2 style="margin:0;font-size:1.35rem;">Platform Architecture &amp; Technology Stack</h2>
    <span style="font-size:0.82rem;color:var(--text-muted);">Production Engineering Standards</span>
  </div>
  <div class="grid-2" style="gap:1rem;">
    <?php foreach ($cp['techStack'] as $st): ?>
      <div class="card">
        <?php if (trim((string)($st['category'] ?? '')) !== ''): ?>
          <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--secondary-color);margin-bottom:0.2rem;"><?= e((string)$st['category']) ?></div>
        <?php endif; ?>
        <h3 style="margin:0 0 0.35rem;font-size:1.02rem;color:var(--primary-color);"><?= e((string)($st['name'] ?? '')) ?></h3>
        <p style="margin:0;font-size:0.86rem;line-height:1.55;color:var(--text-muted);"><?= e((string)($st['description'] ?? '')) ?></p>
      </div>
    <?php endforeach; ?>
  </div>
</section>
<?php endif; ?>

<?php if (trim((string)($cp['acknowledgementsHtml'] ?? '')) !== ''): ?>
<section class="card" style="margin-bottom:1.5rem;">
  <h2 style="margin-top:0;font-size:1.25rem;">Institutional Acknowledgements &amp; Governance Note</h2>
  <div class="cms-prose">
    <?= sanitizeCmsHtml((string)$cp['acknowledgementsHtml']) ?>
  </div>
</section>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
