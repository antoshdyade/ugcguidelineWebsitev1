<?php
declare(strict_types=1);
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/auth.php';

$pdo = getDB();
ensureCmsSchemaUpgraded($pdo);
$q = trim($_GET['q'] ?? '');
$results = [];

if (mb_strlen($q) >= 2) {
    $like = '%' . $q . '%';

    $pStmt = $pdo->prepare("SELECT title, slug FROM pages WHERE is_published = 1 AND status = 'published' AND (title LIKE ? OR content_html LIKE ?) LIMIT 8");
    $pStmt->execute([$like, $like]);
    foreach ($pStmt->fetchAll() as $r) {
        $results[] = ['type' => 'UGC Page', 'title' => $r['title'], 'url' => 'page.php?slug=' . urlencode($r['slug'])];
    }

    $fStmt = $pdo->prepare("SELECT f.name, f.designation, d.slug FROM faculty f JOIN departments d ON f.department_id = d.id WHERE d.status = 'published' AND (f.name LIKE ? OR f.specialization LIKE ?) LIMIT 8");
    $fStmt->execute([$like, $like]);
    foreach ($fStmt->fetchAll() as $r) {
        $results[] = ['type' => 'Faculty · ' . $r['designation'], 'title' => $r['name'], 'url' => 'department.php?dept=' . urlencode($r['slug']) . '&sub=faculty'];
    }

    $dStmt = $pdo->prepare("SELECT title, category, file_url FROM documents WHERE status = 'published' AND (title LIKE ? OR category LIKE ?) LIMIT 8");
    $dStmt->execute([$like, $like]);
    foreach ($dStmt->fetchAll() as $r) {
        $results[] = ['type' => 'Document · ' . $r['category'], 'title' => $r['title'], 'url' => $r['file_url']];
    }

    try {
        $facStmt = $pdo->prepare("SELECT title, category FROM facilities WHERE is_published = 1 AND status = 'published' AND (title LIKE ? OR category LIKE ? OR short_summary LIKE ? OR custom_fields_json LIKE ?) LIMIT 6");
        $facStmt->execute([$like, $like, $like, $like]);
        foreach ($facStmt->fetchAll() as $r) {
            $results[] = ['type' => 'Campus Facility · ' . $r['category'], 'title' => $r['title'], 'url' => 'facilities.php?cat=' . urlencode($r['category'])];
        }

        $sfStmt = $pdo->prepare("SELECT name, facility_type FROM sports_facilities WHERE is_published = 1 AND status = 'published' AND (name LIKE ? OR facility_type LIKE ? OR description LIKE ?) LIMIT 5");
        $sfStmt->execute([$like, $like, $like]);
        foreach ($sfStmt->fetchAll() as $r) {
            $results[] = ['type' => 'Sports Facility · ' . $r['facility_type'], 'title' => $r['name'], 'url' => 'sports.php?tab=facilities'];
        }

        $seStmt = $pdo->prepare("SELECT title, event_type FROM sports_events WHERE is_published = 1 AND moderation_status = 'published' AND (title LIKE ? OR discipline LIKE ? OR description LIKE ?) LIMIT 5");
        $seStmt->execute([$like, $like, $like]);
        foreach ($seStmt->fetchAll() as $r) {
            $results[] = ['type' => 'Sports Event · ' . $r['event_type'], 'title' => $r['title'], 'url' => 'sports.php?tab=events'];
        }

        $saStmt = $pdo->prepare("SELECT student_or_team_name, sport_name, level FROM sports_achievements WHERE status = 'published' AND (student_or_team_name LIKE ? OR sport_name LIKE ? OR event_name LIKE ?) LIMIT 5");
        $saStmt->execute([$like, $like, $like]);
        foreach ($saStmt->fetchAll() as $r) {
            $results[] = ['type' => 'Sports Achievement · ' . $r['level'], 'title' => $r['student_or_team_name'] . ' (' . $r['sport_name'] . ')', 'url' => 'sports.php?tab=achievements'];
        }

        $cfStmt = $pdo->prepare("SELECT slug, short_name, title, scope FROM conferences WHERE is_published = 1 AND status = 'published' AND (title LIKE ? OR short_name LIKE ? OR poster_guidelines_html LIKE ? OR poster_items_json LIKE ?) LIMIT 5");
        $cfStmt->execute([$like, $like, $like, $like]);
        foreach ($cfStmt->fetchAll() as $r) {
            $results[] = ['type' => 'Conference · ' . $r['scope'], 'title' => $r['short_name'] . ' — ' . $r['title'], 'url' => 'conference.php?slug=' . urlencode($r['slug'])];
        }

        $rpStmt = $pdo->prepare("SELECT title, funding_agency, project_code FROM research_projects WHERE is_published = 1 AND moderation_status = 'published' AND (title LIKE ? OR funding_agency LIKE ? OR principal_investigator LIKE ? OR project_code LIKE ?) LIMIT 5");
        $rpStmt->execute([$like, $like, $like, $like]);
        foreach ($rpStmt->fetchAll() as $r) {
            $results[] = ['type' => 'Funded R&D Project · ' . $r['funding_agency'], 'title' => $r['title'], 'url' => 'page.php?slug=research-development-cell'];
        }

        $riStmt = $pdo->prepare("SELECT item_type, title, inventors_or_lead FROM research_patents WHERE is_published = 1 AND moderation_status = 'published' AND (title LIKE ? OR item_type LIKE ? OR inventors_or_lead LIKE ? OR reference_number LIKE ?) LIMIT 5");
        $riStmt->execute([$like, $like, $like, $like]);
        foreach ($riStmt->fetchAll() as $r) {
            $results[] = ['type' => 'Research · ' . $r['item_type'], 'title' => $r['title'], 'url' => 'page.php?slug=research-development-cell'];
        }
    } catch (Throwable $ignoredSearch) {
    }
}

if (isset($_GET['ajax'])) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($results);
    exit;
}

$pageTitle = 'Search Results';
require_once __DIR__ . '/includes/header.php';
?>
<h1>Global Search Results for &ldquo;<?= e($q) ?>&rdquo;</h1>
<div class="card">
  <?php if (!$results): ?>
    <p>No matching disclosures, faculty profiles, or downloadable documents found.</p>
  <?php else: ?>
    <ul>
      <?php foreach ($results as $item): ?>
        <li style="margin-bottom:0.65rem;">
          <a href="<?= e(baseUrl($item['url'])) ?>"><strong><?= e($item['title']) ?></strong></a>
          <small style="color:var(--text-muted);"> (<?= e($item['type']) ?>)</small>
        </li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>
</div>
<?php require_once __DIR__ . '/includes/footer.php'; ?>
