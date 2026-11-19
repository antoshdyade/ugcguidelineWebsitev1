<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';
$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);

$slug = $_GET['slug'] ?? '';
$catSlug = $_GET['cat'] ?? '';
$page = null;
$emptyCategory = null;

if ($slug !== '') {
    $page = resolvePageBySlugWithAliases($pdo, $slug);
    if ($page) {
        $slug = (string)$page['slug'];
    }
} elseif ($catSlug !== '') {
    $normCat = normalizePhpSlug($catSlug);
    $catStmt = $pdo->prepare('SELECT * FROM categories WHERE slug = ? OR slug = ? LIMIT 1');
    $catStmt->execute([$catSlug, $normCat]);
    $catRow = $catStmt->fetch();
    if ($catRow) {
        $pgStmt = $pdo->prepare('SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.ugc_code FROM pages p JOIN categories c ON p.category_id = c.id WHERE c.id = ? AND p.is_published = 1 ORDER BY p.sort_order ASC, p.id ASC LIMIT 1');
        $pgStmt->execute([(int)$catRow['id']]);
        $page = $pgStmt->fetch() ?: null;
        if ($page) {
            $slug = (string)$page['slug'];
        } else {
            $emptyCategory = $catRow;
        }
    }
} else {
    $stmt = $pdo->prepare('SELECT p.*, c.slug AS category_slug, c.name AS category_name, c.ugc_code FROM pages p JOIN categories c ON p.category_id = c.id WHERE p.is_published = 1 ORDER BY c.sort_order ASC, p.sort_order ASC LIMIT 1');
    $stmt->execute();
    $page = $stmt->fetch() ?: null;
    if ($page) $slug = (string)$page['slug'];
}

if (!$page && $emptyCategory) {
    $pageTitle = (string)$emptyCategory['name'];
    $pageDesc = trim((string)($emptyCategory['description'] ?? ''));
    $seoContext = [
        'description'   => $pageDesc,
        'ogType'        => 'website',
        'canonicalPath' => 'page.php?cat=' . rawurlencode((string)$emptyCategory['slug']),
    ];
    require_once __DIR__ . '/includes/header.php';
    echo '<div class="card"><h1>' . e((string)$emptyCategory['name']) . '</h1><p>' . e((string)($emptyCategory['description'] ?: 'Content for this portal is being updated via the CMS Admin Portal.')) . '</p><a href="' . e(baseUrl('index.php')) . '" class="btn-primary">Return Home</a></div>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

if (!$page) {
    http_response_code(404);
    $pageTitle = 'Page Not Found';
    $seoContext = ['robots' => 'noindex, nofollow'];
    require_once __DIR__ . '/includes/header.php';
    echo '<div class="card"><h1>Disclosure Page Not Found</h1><p style="color:var(--text-muted);">The requested page could not be located or is currently hidden by the administrator.</p><a href="' . e(baseUrl('index.php')) . '" class="btn-primary">Return Home</a></div>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

$sibStmt = $pdo->prepare('SELECT slug, title FROM pages WHERE category_id = ? AND is_published = 1 ORDER BY sort_order ASC, id ASC');
$sibStmt->execute([$page['category_id']]);
$siblings = $sibStmt->fetchAll();

$leaders = ($slug === 'statutory-officers')
    ? $pdo->query('SELECT * FROM leadership_profiles ORDER BY sort_order ASC')->fetchAll()
    : [];

$isResearchCat = ($page['category_slug'] ?? '') === 'research';
$researchConfs = [];
$researchSliderSlides = [];
$researchPortfolio = null;
if ($isResearchCat) {
    $researchSliderSlides = getResearchSliderSlides($pdo);
    $researchPortfolio = getResearchPortfolioData($pdo, true);
    try {
        $researchConfs = $pdo->query('SELECT id, slug, short_name, title, scope, theme, start_date, end_date, venue, mode, organizing_department, banner_url FROM conferences WHERE is_published = 1 ORDER BY sort_order ASC, id ASC')->fetchAll();
    } catch (Throwable $ignoredConf) {
        $researchConfs = [];
    }
}

$pageTitle = (string)$page['title'];
$metaDesc = trim((string)($page['meta_description'] ?? ''));
$pageDesc = $metaDesc !== '' ? $metaDesc : extractPlainTextExcerpt((string)$page['content_html'], 165);
$seoContext = [
    'description'   => $pageDesc,
    'ogType'        => 'article',
    'canonicalPath' => 'page.php?slug=' . rawurlencode((string)$page['slug']),
];
require_once __DIR__ . '/includes/header.php';
?>
<div class="layout-sidebar">
  <aside class="card">
    <p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-top:0;">
      <?= e((string)$page['category_name']) ?>
    </p>
    <ul style="list-style:none;padding:0;margin:0;">
      <?php foreach ($siblings as $sib): ?>
        <li style="margin-bottom:0.35rem;">
          <a href="<?= e(baseUrl('page.php?slug=' . urlencode((string)$sib['slug']))) ?>"
             style="display:block;padding:0.45rem 0.65rem;border-radius:6px;text-decoration:none;<?= $sib['slug'] === $slug ? 'background:var(--primary-color);color:#fff;font-weight:600;' : 'color:var(--text-main);' ?>">
            <?= e((string)$sib['title']) ?>
          </a>
        </li>
      <?php endforeach; ?>
      <?php if ($isResearchCat): ?>
        <li style="margin-top:0.65rem;padding-top:0.65rem;border-top:1px solid var(--border-color);">
          <a href="<?= e(baseUrl('conferences.php')) ?>" style="display:block;padding:0.5rem 0.65rem;border-radius:6px;background:var(--secondary-color);color:#fff;font-weight:700;text-decoration:none;text-align:center;">
            All Conferences, Workshops &amp; Events &rarr;
          </a>
        </li>
      <?php endif; ?>
    </ul>
  </aside>

  <article class="card">
    <small style="color:var(--text-muted);"><?= e((string)$page['subtitle']) ?> · Updated <?= e((string)$page['updated_at']) ?></small>
    <h1 style="font-family:var(--font-display);margin-top:0.25rem;"><?= e((string)$page['title']) ?></h1>

    <?php if ($isResearchCat && !empty($researchSliderSlides)): ?>
      <div style="margin-bottom:1.25rem;">
        <?= renderCustomSliderBlock($researchSliderSlides, 340, 5) ?>
      </div>
    <?php endif; ?>

    <div class="cms-prose"><?= $page['content_html'] ?></div>

    <?php
      $shareEnabledForPage = !isset($page['show_share_bar']) || (int)$page['show_share_bar'] === 1;
      echo renderPhpSocialShareBar(
          $pdo,
          (string)$page['title'],
          (string)($page['subtitle'] ?: $pageDesc),
          baseUrl('page.php?slug=' . urlencode((string)$page['slug'])),
          $isResearchCat ? 'research' : 'page',
          $shareEnabledForPage
      );
    ?>

    <?php if ($isResearchCat && is_array($researchPortfolio)):
      $rCfg = $researchPortfolio['config'];
      $rProjects = $researchPortfolio['projects'] ?? [];
      $rPatents = $researchPortfolio['patents'] ?? [];
      $projAgencies = array_values(array_unique(array_filter(array_map(static fn($p) => (string)($p['funding_agency'] ?? ''), $rProjects))));
      $patTypes = array_values(array_unique(array_filter(array_map(static fn($pt) => (string)($pt['item_type'] ?? ''), $rPatents))));
      $patYears = [];
      foreach ($rPatents as $ptRow) {
          if (preg_match('/\b(20\d{2}|19\d{2})\b/', (string)($ptRow['filing_or_grant_date'] ?? ''), $ym)) {
              $patYears[$ym[1]] = $ym[1];
          }
      }
      rsort($patYears, SORT_STRING);
    ?>
      <section style="margin-top:1.75rem;padding-top:1.25rem;border-top:1px solid var(--border-color);">
        <div class="card" style="background:linear-gradient(135deg,#0f294a 0%,#1e3a5f 100%);color:#fff;margin-bottom:1.25rem;">
          <small style="text-transform:uppercase;letter-spacing:0.06em;color:#fbbf24;font-weight:700;"><?= e((string)$rCfg['heroBadge']) ?></small>
          <h2 style="color:#fff;margin:0.35rem 0 0.45rem;font-family:var(--font-display);"><?= e((string)$rCfg['heroTitle']) ?></h2>
          <p style="margin:0 0 0.9rem;color:#e2e8f0;font-size:0.9rem;"><?= e((string)$rCfg['heroSubtitle']) ?></p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0.75rem;border-top:1px solid rgba(255,255,255,0.16);padding-top:0.85rem;font-size:0.84rem;">
            <div><strong style="color:#fbbf24;">R&amp;D Head:</strong> <?= e((string)$rCfg['deanName']) ?><br><span style="color:#cbd5e1;"><?= e((string)$rCfg['deanTitle']) ?></span></div>
            <div><strong style="color:#fbbf24;">Sponsored Grants:</strong><br><?= e((string)$rCfg['totalGrantsHighlight']) ?></div>
            <div><strong style="color:#fbbf24;">Research Ecosystem:</strong><br><?= e((string)$rCfg['activeLabsHighlight']) ?></div>
            <div><strong style="color:#fbbf24;">R&amp;D Office:</strong><br><?= e((string)$rCfg['deanEmail']) ?> · <?= e((string)$rCfg['deanPhone']) ?></div>
          </div>
          <?php if (!empty($rCfg['consultancyPolicyUrl'])): ?>
            <div style="margin-top:0.85rem;">
              <a href="<?= e(baseUrl((string)$rCfg['consultancyPolicyUrl'])) ?>" class="btn-secondary" style="background:#fff;color:#0f294a;">R&amp;D / Consultancy Policy Documents &rarr;</a>
            </div>
          <?php endif; ?>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:0.75rem;margin-bottom:0.75rem;">
          <div>
            <h2 style="margin:0;font-family:var(--font-display);">Sponsored Research Projects &amp; Funded Grants</h2>
            <p style="margin:0.2rem 0 0;font-size:0.84rem;color:var(--text-muted);">Filter grants by funding agency, sanction status, or keyword (DST-SERB, AICTE-MODROBS, DRDO, RGSTC, MSME).</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
            <input id="rp-proj-search" type="search" placeholder="Search title, PI, code…" oninput="svcoerFilterResProjects()" style="padding:0.42rem 0.65rem;border:1px solid var(--border-color);border-radius:6px;font-size:0.84rem;">
            <select id="rp-proj-agency" onchange="svcoerFilterResProjects()" style="padding:0.42rem 0.65rem;border:1px solid var(--border-color);border-radius:6px;font-size:0.84rem;">
              <option value="ALL">All Funding Agencies</option>
              <?php foreach ($projAgencies as $ag): ?>
                <option value="<?= e($ag) ?>"><?= e($ag) ?></option>
              <?php endforeach; ?>
            </select>
            <select id="rp-proj-status" onchange="svcoerFilterResProjects()" style="padding:0.42rem 0.65rem;border:1px solid var(--border-color);border-radius:6px;font-size:0.84rem;">
              <option value="ALL">All Statuses</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Sanctioned">Sanctioned</option>
              <option value="Submitted">Submitted</option>
            </select>
          </div>
        </div>
        <?php if (empty($rProjects)): ?>
          <p style="color:var(--text-muted);font-size:0.9rem;">No funded projects published yet.</p>
        <?php else: ?>
          <div style="overflow-x:auto;">
            <table id="rp-proj-table" class="cms-table cms-table-navy">
              <thead>
                <tr>
                  <th>Project Title &amp; Ref Code</th>
                  <th>Funding Agency</th>
                  <th>Principal Investigator (Dept)</th>
                  <th>Grant &amp; Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <?php foreach ($rProjects as $rp):
                  $searchHay = strtolower((string)$rp['title'] . ' ' . $rp['principal_investigator'] . ' ' . $rp['project_code'] . ' ' . $rp['funding_agency'] . ' ' . $rp['department_code']);
                ?>
                  <tr data-agency="<?= e((string)$rp['funding_agency']) ?>" data-status="<?= e((string)$rp['status']) ?>" data-search="<?= e($searchHay) ?>">
                    <td>
                      <strong><?= e((string)$rp['title']) ?></strong>
                      <?php if (!empty($rp['project_code'])): ?><br><small style="color:var(--text-muted);font-variant-numeric:tabular-nums;"><?= e((string)$rp['project_code']) ?> · <?= e((string)$rp['sanction_year']) ?></small><?php endif; ?>
                      <?php if (!empty($rp['summary'])): ?><br><small><?= e((string)$rp['summary']) ?></small><?php endif; ?>
                      <?php if (!empty($rp['document_url'])): ?><br><a href="<?= e(baseUrl((string)$rp['document_url'])) ?>" style="font-size:0.78rem;">Sanction Order / Details &rarr;</a><?php endif; ?>
                    </td>
                    <td><?= e((string)$rp['funding_agency']) ?></td>
                    <td><?= e((string)$rp['principal_investigator']) ?> <small style="color:var(--text-muted);">(<?= e((string)$rp['department_code']) ?>)</small><?php if (!empty($rp['co_investigator'])): ?><br><small style="color:var(--text-muted);">Co-PI: <?= e((string)$rp['co_investigator']) ?></small><?php endif; ?></td>
                    <td style="font-variant-numeric:tabular-nums;"><strong><?= e((string)$rp['grant_amount_lakhs']) ?></strong><br><small style="color:var(--text-muted);"><?= e((string)$rp['duration']) ?></small></td>
                    <td><span class="alumni-pill"><?= e((string)$rp['status']) ?></span></td>
                  </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
          </div>
        <?php endif; ?>

        <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:0.75rem;margin:1.75rem 0 0.85rem;">
          <div>
            <h2 style="margin:0;font-family:var(--font-display);">Publications, Patents, MoUs, Start-ups &amp; Consultancy</h2>
            <p style="margin:0.2rem 0 0;font-size:0.84rem;color:var(--text-muted);">Filter by category, grant/publication year, or keyword across indexed journals, granted/published patents, and MoUs.</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
            <input id="rp-pat-search" type="search" placeholder="Search title, inventor, ref…" oninput="svcoerFilterResPatents()" style="padding:0.42rem 0.65rem;border:1px solid var(--border-color);border-radius:6px;font-size:0.84rem;">
            <select id="rp-pat-type" onchange="svcoerFilterResPatents()" style="padding:0.42rem 0.65rem;border:1px solid var(--border-color);border-radius:6px;font-size:0.84rem;">
              <option value="ALL">All Categories</option>
              <?php foreach ($patTypes as $pt): ?>
                <option value="<?= e($pt) ?>"><?= e($pt) ?></option>
              <?php endforeach; ?>
            </select>
            <select id="rp-pat-year" onchange="svcoerFilterResPatents()" style="padding:0.42rem 0.65rem;border:1px solid var(--border-color);border-radius:6px;font-size:0.84rem;">
              <option value="ALL">All Years</option>
              <?php foreach ($patYears as $py): ?>
                <option value="<?= e($py) ?>"><?= e($py) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>
        <?php if (empty($rPatents)): ?>
          <p style="color:var(--text-muted);font-size:0.9rem;">No patents, publications, or MoUs recorded yet.</p>
        <?php else: ?>
          <div id="rp-pat-grid" class="grid-2">
            <?php foreach ($rPatents as $ip):
              $ipYear = '';
              if (preg_match('/\b(20\d{2}|19\d{2})\b/', (string)($ip['filing_or_grant_date'] ?? ''), $ym)) {
                  $ipYear = $ym[1];
              }
              $ipSearch = strtolower((string)$ip['title'] . ' ' . $ip['inventors_or_lead'] . ' ' . $ip['reference_number'] . ' ' . $ip['partner_or_agency'] . ' ' . $ip['department_code']);
            ?>
              <div class="card rp-pat-card" data-type="<?= e((string)$ip['item_type']) ?>" data-year="<?= e($ipYear) ?>" data-search="<?= e($ipSearch) ?>" style="display:flex;flex-direction:column;justify-content:space-between;gap:0.5rem;">
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.35rem;">
                    <span class="alumni-pill"><?= e((string)$ip['item_type']) ?></span>
                    <small style="color:var(--text-muted);font-variant-numeric:tabular-nums;"><?= e((string)$ip['department_code']) ?><?= !empty($ip['filing_or_grant_date']) ? ' · ' . e((string)$ip['filing_or_grant_date']) : '' ?></small>
                  </div>
                  <h3 style="margin:0.2rem 0 0.35rem;font-size:1.02rem;"><?= e((string)$ip['title']) ?></h3>
                  <p style="margin:0 0 0.35rem;font-size:0.83rem;color:var(--primary-color);font-weight:600;"><?= e((string)$ip['inventors_or_lead']) ?></p>
                  <?php if (!empty($ip['summary'])): ?>
                    <p style="margin:0 0 0.4rem;font-size:0.82rem;color:var(--text-muted);"><?= e((string)$ip['summary']) ?></p>
                  <?php endif; ?>
                </div>
                <div style="border-top:1px solid var(--border-color);padding-top:0.5rem;font-size:0.78rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;">
                  <span><strong><?= e((string)$ip['status']) ?></strong><?php if (!empty($ip['reference_number'])): ?> · <?= e((string)$ip['reference_number']) ?><?php endif; ?></span>
                  <?php if (!empty($ip['external_url'])): ?>
                    <a href="<?= e((string)$ip['external_url']) ?>" target="_blank" rel="noopener noreferrer">Open Link &nearr;</a>
                  <?php endif; ?>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </section>

      <script>
        function svcoerFilterResProjects() {
          var q = (document.getElementById('rp-proj-search')?.value || '').trim().toLowerCase();
          var ag = document.getElementById('rp-proj-agency')?.value || 'ALL';
          var st = document.getElementById('rp-proj-status')?.value || 'ALL';
          document.querySelectorAll('#rp-proj-table tbody tr').forEach(function (tr) {
            var okAg = ag === 'ALL' || tr.dataset.agency === ag;
            var okSt = st === 'ALL' || tr.dataset.status === st;
            var okQ = q === '' || (tr.dataset.search || '').indexOf(q) !== -1;
            tr.style.display = (okAg && okSt && okQ) ? '' : 'none';
          });
        }
        function svcoerFilterResPatents() {
          var q = (document.getElementById('rp-pat-search')?.value || '').trim().toLowerCase();
          var tp = document.getElementById('rp-pat-type')?.value || 'ALL';
          var yr = document.getElementById('rp-pat-year')?.value || 'ALL';
          document.querySelectorAll('#rp-pat-grid .rp-pat-card').forEach(function (card) {
            var okT = tp === 'ALL' || card.dataset.type === tp;
            var okY = yr === 'ALL' || card.dataset.year === yr;
            var okQ = q === '' || (card.dataset.search || '').indexOf(q) !== -1;
            card.style.display = (okT && okY && okQ) ? 'flex' : 'none';
          });
        }
      </script>

      <section style="margin-top:1.75rem;padding-top:1.25rem;border-top:1px solid var(--border-color);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:0.9rem;">
          <div>
            <h2 style="margin:0;font-family:var(--font-display);">National / International Conferences, Workshops &amp; Events</h2>
            <p style="margin:0.2rem 0 0;font-size:0.84rem;color:var(--text-muted);">Click any program below to view tracks, speakers, schedule, fee structure &amp; registration forms.</p>
          </div>
          <a href="<?= e(baseUrl('conferences.php')) ?>" class="btn-primary">Open Full Conferences Hub &rarr;</a>
        </div>
        <?php if (empty($researchConfs)): ?>
          <p style="color:var(--text-muted);font-size:0.9rem;">No conferences or workshops published yet. Add programs from Admin &rarr; Conferences, Workshops &amp; R&amp;D.</p>
        <?php else: ?>
          <div class="grid-2">
            <?php foreach ($researchConfs as $rc): ?>
              <div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
                <img src="<?= e(mediaUrl($rc['banner_url'] ?? '', 'assets/images/hero_campus.jpg')) ?>" alt="<?= e((string)$rc['title']) ?>" style="width:100%;height:160px;object-fit:cover;display:block;">
                <div style="padding:1rem;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
                  <div>
                    <span class="alumni-pill"><?= e((string)$rc['scope']) ?></span>
                    <h3 style="margin:0.45rem 0 0.35rem;font-size:1.02rem;"><?= e((string)$rc['short_name']) ?>: <?= e((string)$rc['title']) ?></h3>
                    <p style="font-size:0.8rem;color:var(--text-muted);margin:0 0 0.65rem;"><?= e((string)$rc['start_date']) ?> &ndash; <?= e((string)$rc['end_date']) ?> · <?= e((string)$rc['mode']) ?></p>
                  </div>
                  <a href="<?= e(baseUrl('conference.php?slug=' . urlencode((string)$rc['slug']))) ?>" class="btn-primary" style="justify-content:center;">Open Microsite &amp; Register &rarr;</a>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>
      </section>
    <?php endif; ?>

    <?php if (!empty($page['attached_pdf_url'])):
      $isExtPdf = preg_match('#^https?://#i', (string)$page['attached_pdf_url']) === 1;
    ?>
      <div class="card" style="margin-top:1.5rem;background:var(--surface-bg);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;">
        <strong><?= e($page['attached_pdf_label'] ?: 'Attached Statutory Document') ?></strong>
        <?php if ($isExtPdf): ?>
          <a href="<?= e((string)$page['attached_pdf_url']) ?>" target="_blank" rel="noopener noreferrer" class="btn-secondary">Open Document Link &nearr;</a>
        <?php else: ?>
          <a href="<?= e(baseUrl((string)$page['attached_pdf_url'])) ?>" download class="btn-primary">Download PDF</a>
        <?php endif; ?>
      </div>
    <?php endif; ?>

    <?php if ($leaders): ?>
      <h2 style="margin-top:2rem;">Statutory Officers &amp; Leadership Profiles</h2>
      <div class="grid-2">
        <?php foreach ($leaders as $l): ?>
          <div class="card">
            <div style="display:flex;gap:0.75rem;align-items:flex-start;">
              <img src="<?= e(mediaUrl($l['photo_url'] ?? '', 'assets/images/principal.jpg')) ?>" alt="<?= e((string)$l['name']) ?>" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;">
              <div>
                <small style="color:var(--secondary-color);font-weight:700;"><?= e(formatCommitteeGroupLabel($l['committee_group'] ?? '')) ?> · <?= e((string)$l['role_title']) ?></small>
                <h3 style="margin:0.2rem 0;"><?= e((string)$l['name']) ?></h3>
                <p style="font-size:0.84rem;margin:0;"><?= e((string)$l['qualification']) ?></p>
                <p style="font-size:0.8rem;color:var(--text-muted);margin:0.2rem 0 0;"><?= e((string)$l['email']) ?> · <?= e((string)$l['phone']) ?></p>
              </div>
            </div>
            <?php if (!empty($l['bio'])): ?>
              <p style="font-size:0.82rem;color:var(--text-muted);margin:0.6rem 0 0;"><?= e((string)$l['bio']) ?></p>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </article>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
