<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$tab = (string)($_GET['tab'] ?? 'all');
if (!in_array($tab, ['all', 'facilities', 'events', 'achievements', 'gallery', 'notices'], true)) {
    $tab = 'all';
}
$levelFilter = trim((string)($_GET['level'] ?? 'All'));

$configRow = [];
try {
    $kvStmt = $pdo->prepare("SELECT val_json FROM cms_kv_store WHERE key_name = 'sports_portal_config' LIMIT 1");
    $kvStmt->execute();
    $dec = json_decode((string)$kvStmt->fetchColumn(), true);
    if (is_array($dec)) {
        $configRow = $dec;
    }
} catch (Throwable $ignored) {
}
$config = array_merge([
    'heroBadge'          => 'Student Life · Directorate of Physical Education & Sports',
    'heroTitle'          => 'Athletics, Indoor Courts, Fitness & Sports Portal',
    'heroSubtitle'       => 'Indoor & outdoor infrastructure, university zonal tournaments, student medalists, action gallery, and trials schedules.',
    'directorName'       => 'Prof. R. S. Jadhav',
    'directorTitle'      => 'Director of Physical Education & Sports',
    'directorEmail'      => 'sports@coe.sveri.ac.in',
    'directorPhone'      => '+91-02186-216063',
    'gymkhanaTimings'    => '6:00 AM – 8:30 AM & 4:30 PM – 8:00 PM',
    'annualFlagshipName' => 'SVERI Krida Mahotsav',
    'customFields'       => [],
], $configRow);

$facilities = $pdo->query('SELECT * FROM sports_facilities WHERE is_published = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
$events     = $pdo->query('SELECT * FROM sports_events WHERE is_published = 1 ORDER BY sort_order ASC, id DESC')->fetchAll();
$achievs    = $pdo->query('SELECT * FROM sports_achievements ORDER BY sort_order ASC, id DESC')->fetchAll();
$gallery    = $pdo->query('SELECT * FROM sports_gallery WHERE is_published = 1 ORDER BY sort_order ASC, id DESC')->fetchAll();
$notices    = $pdo->query('SELECT * FROM sports_notices WHERE is_published = 1 ORDER BY is_pinned DESC, sort_order ASC, id DESC')->fetchAll();

$levels = ['All'];
foreach ($achievs as $a) {
    $lv = (string)($a['level'] ?? '');
    if ($lv !== '' && !in_array($lv, $levels, true)) {
        $levels[] = $lv;
    }
}
$filteredAchievs = $levelFilter === 'All'
    ? $achievs
    : array_values(array_filter($achievs, static fn(array $a): bool => (string)($a['level'] ?? '') === $levelFilter));

$extractYoutubeId = static function (string $url): ?string {
    if (preg_match('~(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([A-Za-z0-9_-]{6,})~', $url, $m)) {
        return $m[1];
    }
    return null;
};

$pageTitle = 'Sports, Athletics & Gymkhana — Student Life';
$pageDesc  = (string)$config['heroSubtitle'];
require_once __DIR__ . '/includes/header.php';
?>

<section class="card" style="background:var(--primary-color);color:#fff;border-color:transparent;margin-bottom:1.25rem;padding:1.5rem 1.75rem;">
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:1rem;">
    <div style="max-width:740px;">
      <p style="margin:0 0 0.35rem;font-size:0.74rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FCD34D;">
        <?= e((string)$config['heroBadge']) ?>
      </p>
      <h1 style="margin:0 0 0.45rem;color:#fff;font-size:1.85rem;"><?= e((string)$config['heroTitle']) ?></h1>
      <p style="margin:0;color:#E2E8F0;font-size:0.92rem;line-height:1.55;"><?= e((string)$config['heroSubtitle']) ?></p>
    </div>
    <div style="font-size:0.8rem;color:#E2E8F0;text-align:right;">
      <div><strong>Gymkhana Hours:</strong> <?= e((string)$config['gymkhanaTimings']) ?></div>
      <div><strong>Flagship Event:</strong> <?= e((string)$config['annualFlagshipName']) ?></div>
    </div>
  </div>
</section>

<!-- Sub-navigation Tabs -->
<div style="display:flex;flex-wrap:wrap;gap:0.45rem;margin-bottom:1.25rem;">
  <?php
  $tabs = [
      'all'          => 'All Sports Overview',
      'facilities'   => 'Facilities (' . count($facilities) . ')',
      'events'       => 'Events & Tournaments (' . count($events) . ')',
      'achievements' => 'Student Achievements (' . count($achievs) . ')',
      'gallery'      => 'Photo & Video Gallery (' . count($gallery) . ')',
      'notices'      => 'Notices & Trials (' . count($notices) . ')',
  ];
  foreach ($tabs as $tKey => $tLabel):
      $isActive = $tab === $tKey;
  ?>
    <a href="?tab=<?= e($tKey) ?>" class="<?= $isActive ? 'btn-primary' : 'btn-outline' ?> btn-sm" style="text-decoration:none;"><?= e($tLabel) ?></a>
  <?php endforeach; ?>
</div>

<!-- Physical Director & Institutional Info Bar -->
<?php if ($tab === 'all'): ?>
  <section class="card" style="margin-bottom:1.25rem;">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:1rem;align-items:center;">
      <div>
        <small style="text-transform:uppercase;font-weight:700;letter-spacing:0.05em;color:var(--secondary-color);">Sports Directorate Desk</small>
        <h2 style="margin:0.15rem 0 0.25rem;font-size:1.15rem;"><?= e((string)$config['directorName']) ?> — <?= e((string)$config['directorTitle']) ?></h2>
        <div style="font-size:0.84rem;color:var(--text-muted);">
          Email: <a href="mailto:<?= e((string)$config['directorEmail']) ?>"><?= e((string)$config['directorEmail']) ?></a>
          <?php if (!empty($config['directorPhone'])): ?> · Phone: <?= e((string)$config['directorPhone']) ?><?php endif; ?>
        </div>
      </div>
      <?php if (!empty($config['customFields']) && is_array($config['customFields'])): ?>
        <div style="display:flex;flex-wrap:wrap;gap:0.65rem;">
          <?php foreach ($config['customFields'] as $cf): ?>
            <div style="padding:0.45rem 0.75rem;border:1px solid var(--border-color);border-radius:8px;background:#FAFAF9;font-size:0.78rem;">
              <div style="color:var(--text-muted);font-weight:600;"><?= e((string)($cf['label'] ?? '')) ?></div>
              <strong style="color:var(--text-main);"><?= e((string)($cf['value'] ?? '')) ?></strong>
            </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </div>
  </section>
<?php endif; ?>

<!-- 1. Sports Facilities -->
<?php if ($tab === 'all' || $tab === 'facilities'): ?>
  <section style="margin-bottom:1.75rem;">
    <h2 style="margin:0 0 0.75rem;">Indoor &amp; Outdoor Sports Facilities</h2>
    <?php if (empty($facilities)): ?>
      <div class="card"><p style="margin:0;color:var(--text-muted);">No published sports facilities yet.</p></div>
    <?php else: ?>
      <div class="grid-3">
        <?php foreach ($facilities as $f):
            $cfs = json_decode((string)($f['custom_fields_json'] ?? '[]'), true) ?: [];
        ?>
          <article class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
            <img src="<?= e(mediaUrl((string)$f['image_url'], 'assets/images/sports_complex.jpg')) ?>" alt="<?= e($f['name']) ?>" style="width:100%;height:175px;object-fit:cover;display:block;border-bottom:1px solid var(--border-color);">
            <div style="padding:1rem;display:flex;flex-direction:column;gap:0.45rem;flex:1;">
              <small style="font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--secondary-color);"><?= e($f['facility_type']) ?></small>
              <h3 style="margin:0;font-size:1.05rem;"><?= e($f['name']) ?></h3>
              <?php if (!empty($f['dimensions_or_capacity'])): ?>
                <div style="font-size:0.8rem;font-weight:600;color:var(--primary-color);"><?= e($f['dimensions_or_capacity']) ?></div>
              <?php endif; ?>
              <?php if (!empty($f['description'])): ?>
                <p style="margin:0;font-size:0.84rem;color:var(--text-muted);line-height:1.5;"><?= e($f['description']) ?></p>
              <?php endif; ?>
              <div style="font-size:0.78rem;color:var(--text-muted);margin-top:auto;padding-top:0.45rem;border-top:1px solid var(--border-color);">
                <?php if (!empty($f['timings'])): ?><div><strong>Timings:</strong> <?= e($f['timings']) ?></div><?php endif; ?>
                <?php if (!empty($f['incharge_name'])): ?><div><strong>In-Charge:</strong> <?= e($f['incharge_name']) ?></div><?php endif; ?>
                <?php foreach ($cfs as $itemCf): ?>
                  <div><strong><?= e((string)($itemCf['label'] ?? '')) ?>:</strong> <?= e((string)($itemCf['value'] ?? '')) ?></div>
                <?php endforeach; ?>
              </div>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </section>
<?php endif; ?>

<!-- 2. Sports Activities & Events -->
<?php if ($tab === 'all' || $tab === 'events'): ?>
  <section style="margin-bottom:1.75rem;">
    <h2 style="margin:0 0 0.75rem;">Sports Activities, Tournaments &amp; Fitness Events</h2>
    <?php if (empty($events)): ?>
      <div class="card"><p style="margin:0;color:var(--text-muted);">No published sports events right now.</p></div>
    <?php else: ?>
      <div class="grid-2">
        <?php foreach ($events as $ev): ?>
          <article class="card" style="display:flex;gap:1rem;align-items:flex-start;">
            <img src="<?= e(mediaUrl((string)$ev['banner_url'], 'assets/images/sports_complex.jpg')) ?>" alt="<?= e($ev['title']) ?>" style="width:120px;height:86px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid var(--border-color);">
            <div style="min-width:0;flex:1;">
              <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:0.4rem;font-size:0.75rem;margin-bottom:0.2rem;">
                <span style="font-weight:700;color:var(--secondary-color);"><?= e($ev['event_type']) ?> · <?= e($ev['discipline']) ?></span>
                <span style="font-weight:700;color:var(--primary-color);"><?= e($ev['status']) ?></span>
              </div>
              <h3 style="margin:0 0 0.3rem;font-size:1.02rem;"><?= e($ev['title']) ?></h3>
              <div style="font-size:0.79rem;color:var(--text-muted);margin-bottom:0.35rem;">
                <?= e($ev['event_date']) ?> · <?= e($ev['venue']) ?>
              </div>
              <?php if (!empty($ev['description'])): ?>
                <p style="margin:0 0 0.45rem;font-size:0.83rem;color:var(--text-muted);"><?= e($ev['description']) ?></p>
              <?php endif; ?>
              <?php if (!empty($ev['registration_url'])): ?>
                <a href="<?= e(mediaUrl((string)$ev['registration_url'])) ?>" target="_blank" rel="noopener noreferrer" class="btn-primary btn-sm" style="text-decoration:none;">Team / Player Registration &rarr;</a>
              <?php endif; ?>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </section>
<?php endif; ?>

<!-- 3. Student Achievements -->
<?php if ($tab === 'all' || $tab === 'achievements'): ?>
  <section style="margin-bottom:1.75rem;">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
      <h2 style="margin:0;">Student Sports Achievements (University / State / National / International)</h2>
      <div style="display:flex;flex-wrap:wrap;gap:0.35rem;">
        <?php foreach ($levels as $lv): ?>
          <a href="?tab=<?= e($tab === 'all' ? 'achievements' : $tab) ?>&level=<?= urlencode($lv) ?>" class="<?= $levelFilter === $lv ? 'btn-primary' : 'btn-outline' ?> btn-sm" style="text-decoration:none;"><?= e($lv) ?></a>
        <?php endforeach; ?>
      </div>
    </div>
    <?php if (empty($filteredAchievs)): ?>
      <div class="card"><p style="margin:0;color:var(--text-muted);">No achievements found for selected level.</p></div>
    <?php else: ?>
      <div class="grid-3">
        <?php foreach ($filteredAchievs as $ac): ?>
          <article class="card" style="display:flex;flex-direction:column;gap:0.55rem;">
            <div style="display:flex;gap:0.75rem;align-items:center;">
              <img src="<?= e(mediaUrl((string)$ac['photo_url'], 'assets/images/principal.jpg')) ?>" alt="<?= e($ac['student_or_team_name']) ?>" style="width:60px;height:60px;object-fit:cover;border-radius:10px;border:1px solid var(--border-color);flex-shrink:0;">
              <div>
                <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--secondary-color);"><?= e($ac['level']) ?> Level · <?= e($ac['sport_name']) ?></div>
                <h3 style="margin:0.1rem 0;font-size:0.98rem;"><?= e($ac['student_or_team_name']) ?></h3>
                <div style="font-size:0.76rem;color:var(--text-muted);"><?= e($ac['department_code']) ?><?= !empty($ac['batch_year']) ? ' · Batch ' . e($ac['batch_year']) : '' ?></div>
              </div>
            </div>
            <div style="font-size:0.84rem;font-weight:700;color:var(--primary-color);"><?= e($ac['medal_or_rank']) ?></div>
            <div style="font-size:0.8rem;color:var(--text-main);font-weight:600;"><?= e($ac['event_name']) ?> (<?= e($ac['event_date']) ?>)</div>
            <?php if (!empty($ac['highlights'])): ?>
              <p style="margin:0;font-size:0.8rem;color:var(--text-muted);"><?= e($ac['highlights']) ?></p>
            <?php endif; ?>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </section>
<?php endif; ?>

<!-- 4. Sports Gallery (Photos & Videos) -->
<?php if ($tab === 'all' || $tab === 'gallery'): ?>
  <section style="margin-bottom:1.75rem;">
    <h2 style="margin:0 0 0.75rem;">Sports Photo &amp; Video Gallery</h2>
    <?php if (empty($gallery)): ?>
      <div class="card"><p style="margin:0;color:var(--text-muted);">No gallery items published yet.</p></div>
    <?php else: ?>
      <div class="grid-3">
        <?php foreach ($gallery as $g):
            $isVideo = ($g['media_type'] ?? 'Photo') === 'Video';
            $ytId = $isVideo ? $extractYoutubeId((string)$g['media_url']) : null;
        ?>
          <article class="card" style="padding:0;overflow:hidden;">
            <?php if ($isVideo && $ytId): ?>
              <div style="aspect-ratio:16/9;background:#0F172A;">
                <iframe src="https://www.youtube.com/embed/<?= e($ytId) ?>" title="<?= e($g['title']) ?>" allowfullscreen style="width:100%;height:100%;border:0;"></iframe>
              </div>
            <?php elseif ($isVideo): ?>
              <div style="padding:1.25rem;background:#0F172A;color:#fff;text-align:center;">
                <p style="margin:0 0 0.5rem;font-size:0.82rem;">Video Highlight</p>
                <a href="<?= e(mediaUrl((string)$g['media_url'])) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm" style="background:#fff;color:#0F172A;">Watch Video &nearr;</a>
              </div>
            <?php else: ?>
              <img src="<?= e(mediaUrl((string)$g['media_url'], 'assets/images/sports_complex.jpg')) ?>" alt="<?= e($g['title']) ?>" style="width:100%;height:185px;object-fit:cover;display:block;border-bottom:1px solid var(--border-color);">
            <?php endif; ?>
            <div style="padding:0.85rem 1rem;">
              <div style="font-size:0.72rem;font-weight:700;color:var(--secondary-color);"><?= e($g['media_type']) ?> · <?= e((string)$g['category']) ?></div>
              <h3 style="margin:0.15rem 0 0.25rem;font-size:0.96rem;"><?= e($g['title']) ?></h3>
              <?php if (!empty($g['caption'])): ?><p style="margin:0;font-size:0.8rem;color:var(--text-muted);"><?= e($g['caption']) ?></p><?php endif; ?>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </section>
<?php endif; ?>

<!-- 5. Sports Notices & Updates -->
<?php if ($tab === 'all' || $tab === 'notices'): ?>
  <section style="margin-bottom:1.5rem;">
    <h2 style="margin:0 0 0.75rem;">Sports Notices, Trials &amp; Registrations</h2>
    <?php if (empty($notices)): ?>
      <div class="card"><p style="margin:0;color:var(--text-muted);">No active notices at this time.</p></div>
    <?php else: ?>
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        <?php foreach ($notices as $nt): ?>
          <article class="card" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.85rem;">
            <div style="flex:1;min-width:260px;">
              <div style="font-size:0.74rem;font-weight:700;color:var(--secondary-color);">
                <?= !empty($nt['is_pinned']) ? '[PINNED] ' : '' ?><?= e((string)$nt['category']) ?> · <?= e((string)$nt['notice_date']) ?>
              </div>
              <h3 style="margin:0.15rem 0 0.3rem;font-size:1rem;"><?= e($nt['title']) ?></h3>
              <?php if (!empty($nt['summary'])): ?><p style="margin:0;font-size:0.83rem;color:var(--text-muted);"><?= e($nt['summary']) ?></p><?php endif; ?>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              <?php if (!empty($nt['attachment_url'])): ?>
                <a href="<?= e(mediaUrl((string)$nt['attachment_url'])) ?>" target="_blank" rel="noopener noreferrer" class="btn-outline btn-sm" style="text-decoration:none;">Circular PDF &darr;</a>
              <?php endif; ?>
              <?php if (!empty($nt['registration_link'])): ?>
                <a href="<?= e(mediaUrl((string)$nt['registration_link'])) ?>" target="_blank" rel="noopener noreferrer" class="btn-primary btn-sm" style="text-decoration:none;">Register &rarr;</a>
              <?php endif; ?>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </section>
<?php endif; ?>

<?= renderPhpSocialShareBar($pdo, $pageTitle, (string)$config['heroSubtitle'], baseUrl('sports.php'), 'portal', true) ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
