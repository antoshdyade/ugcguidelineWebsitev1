import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDatabase } from '../data/seedDatabase';
import {
  buildRevisionDiffRows,
  canPublishDirectly,
  CURRENT_SCHEMA_VERSION,
  isEntityShareable,
  isRecordPublished,
  migrateDatabaseInPlace,
  normalizeCreditsPageConfig,
  normalizeFooterConfig,
  normalizeHeaderConfig,
  queuePendingRevision,
} from './collegeFeaturesLogic';
import { searchCmsContent } from './cmsLogic';
import { buildSitemapXml, DEFAULT_SEO_SETTINGS, resolveRouteSeo } from './securityAndSeoLogic';

test('canPublishDirectly allows only super_admin to bypass content moderation queue', () => {
  assert.equal(canPublishDirectly('super_admin'), true);
  assert.equal(canPublishDirectly('content_editor'), false);
  assert.equal(canPublishDirectly('department_admin'), false);
  assert.equal(canPublishDirectly('iqac_officer'), false);
  assert.equal(canPublishDirectly('exam_controller'), false);
  assert.equal(canPublishDirectly('specific_page_editor'), false);
  assert.equal(canPublishDirectly(null), false);
});

test('isRecordPublished validates both status and moderationStatus fields', () => {
  assert.equal(isRecordPublished({ status: 'published' }), true);
  assert.equal(isRecordPublished({}), true);
  assert.equal(isRecordPublished({ status: 'pending_approval' }), false);
  assert.equal(isRecordPublished({ status: 'rejected' }), false);
  assert.equal(isRecordPublished(null), false);

  assert.equal(isRecordPublished({ moderationStatus: 'published' }, 'moderationStatus'), true);
  assert.equal(isRecordPublished({ moderationStatus: 'pending_approval' }, 'moderationStatus'), false);
  assert.equal(isRecordPublished({ moderationStatus: 'rejected' }, 'moderationStatus'), false);
});

test('isEntityShareable respects isShareable and legacy showShareBar flags', () => {
  assert.equal(isEntityShareable(undefined), true);
  assert.equal(isEntityShareable({}), true);
  assert.equal(isEntityShareable({ isShareable: true }), true);
  assert.equal(isEntityShareable({ isShareable: false }), false);
  assert.equal(isEntityShareable({ showShareBar: false }), false);
  assert.equal(isEntityShareable({ isShareable: true, showShareBar: false }), false);
});

test('queuePendingRevision and buildRevisionDiffRows track create, update, and delete diffs cleanly', () => {
  const step1 = queuePendingRevision(undefined, {
    entityTable: 'pages',
    entityId: 101,
    actionType: 'create',
    entityTitle: 'New Autonomous Disclosure',
    currentSnapshot: null,
    proposedPayload: { title: 'New Autonomous Disclosure', slug: 'new-disclosure', isShareable: true },
    submittedByUserId: 2,
    submittedByName: 'Campus Editor',
    submittedByEmail: 'editor@campus.edu.in',
    submittedByRole: 'content_editor',
  });
  assert.equal(step1.revisions.length, 1);
  assert.equal(step1.created.id, 1);
  assert.equal(step1.created.status, 'pending_approval');

  const createDiffs = buildRevisionDiffRows(step1.created);
  assert.ok(createDiffs.every((d) => d.before === '— (New)' && d.changed));

  const step2 = queuePendingRevision(step1.revisions, {
    entityTable: 'conferences',
    entityId: 5,
    actionType: 'update',
    entityTitle: 'ICAEST 2026',
    currentSnapshot: { title: 'ICAEST 2026', venue: 'Old Hall', isShareable: true },
    proposedPayload: { title: 'ICAEST 2026', venue: 'Main Auditorium', isShareable: false },
    submittedByUserId: 3,
    submittedByName: 'CSE HoD',
    submittedByEmail: 'hod.cse@campus.edu.in',
    submittedByRole: 'department_admin',
  });
  assert.equal(step2.created.id, 2);
  const updateDiffs = buildRevisionDiffRows(step2.created);
  const titleRow = updateDiffs.find((r) => r.field === 'title');
  const venueRow = updateDiffs.find((r) => r.field === 'venue');
  const shareRow = updateDiffs.find((r) => r.field === 'isShareable');
  assert.equal(titleRow?.changed, false);
  assert.equal(venueRow?.changed, true);
  assert.equal(venueRow?.before, 'Old Hall');
  assert.equal(venueRow?.after, 'Main Auditorium');
  assert.equal(shareRow?.before, 'Yes');
  assert.equal(shareRow?.after, 'No');

  const deleteDiffs = buildRevisionDiffRows({
    actionType: 'delete',
    currentSnapshot: { title: 'Obsolete Notice' },
    proposedPayload: null,
  });
  assert.equal(deleteDiffs[0].after, '— (Delete)');
  assert.equal(deleteDiffs[0].changed, true);
});

test('migrateDatabaseInPlace initializes pendingContentRevisions and normalizes isShareable + status', () => {
  const seed = createSeedDatabase();
  const legacyDb = {
    ...structuredClone(seed),
    schemaVersion: 7,
    pendingContentRevisions: undefined,
    pages: seed.pages.slice(0, 2).map((p) => {
      const copy = { ...p };
      delete copy.isShareable;
      delete copy.status;
      return copy;
    }),
  };

  const { db, upgraded } = migrateDatabaseInPlace(legacyDb, seed);
  assert.equal(upgraded, true);
  assert.equal(db.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.ok(Array.isArray(db.pendingContentRevisions));
  assert.ok(db.pages.every((p) => typeof p.isShareable === 'boolean' && p.status === 'published'));
  assert.ok(db.departments.every((d) => typeof d.isShareable === 'boolean' && d.status === 'published'));
  assert.ok((db.conferences || []).every((c) => typeof c.isShareable === 'boolean' && c.status === 'published'));
});

test('resolveRouteSeo uses customizable shortCode/institutionName instead of hardcoded SVCOER and buildSitemapXml excludes unapproved records', () => {
  const seed = createSeedDatabase();
  const customSettings = {
    ...structuredClone(seed.settings),
    institutionName: 'Bharat Institute of Technology, Pune',
    shortCode: 'BITP',
  };
  const customSeo = {
    ...structuredClone(DEFAULT_SEO_SETTINGS),
    pageOverrides: [
      {
        id: 'ov-home',
        routePattern: '/',
        title: 'SVCOER — Welcome',
        description: 'Official SVCOER portal.',
        keywords: 'SVCOER, Engineering',
      },
    ],
  };

  const homeSeo = resolveRouteSeo(
    '/',
    'https://bitp.edu.in',
    customSettings,
    customSeo,
    seed.categories,
    seed.pages,
    seed.departments,
    seed.conferences || [],
  );
  assert.equal(homeSeo.title.includes('SVCOER'), false);
  assert.equal(homeSeo.title.includes('BITP'), true);
  assert.equal(homeSeo.description.includes('BITP'), true);
  assert.equal(homeSeo.keywords.includes('BITP'), true);

  const adminSeo = resolveRouteSeo(
    '/admin',
    'https://bitp.edu.in',
    customSettings,
    customSeo,
    seed.categories,
    seed.pages,
    seed.departments,
    seed.conferences || [],
  );
  assert.equal(adminSeo.title, 'BITP Admin Portal | Bharat Institute of Technology, Pune');
  assert.equal(adminSeo.robots, 'noindex, nofollow');

  const moderatedDb = structuredClone(seed);
  moderatedDb.pages[0].status = 'pending_approval';
  moderatedDb.departments[0].status = 'rejected';
  if (moderatedDb.conferences && moderatedDb.conferences[0]) {
    moderatedDb.conferences[0].status = 'pending_approval';
  }
  const xml = buildSitemapXml('https://bitp.edu.in', moderatedDb);
  assert.equal(xml.includes(`/page/${moderatedDb.pages[0].slug}`), false);
  assert.equal(xml.includes(`/department/${moderatedDb.departments[0].slug}`), false);
  if (moderatedDb.conferences && moderatedDb.conferences[0]) {
    assert.equal(xml.includes(`/conference/${moderatedDb.conferences[0].slug}`), false);
  }
});

test('Header, Footer, and Credits normalizers preserve explicit customization and intentionally cleared arrays', () => {
  const hdr = normalizeHeaderConfig({
    showTopUtilityBar: false,
    utilityTagline: 'Research & Innovation Hub',
    showSearchBar: false,
  });
  assert.equal(hdr.showTopUtilityBar, false);
  assert.equal(hdr.utilityTagline, 'Research & Innovation Hub');
  assert.equal(hdr.showSearchBar, false);
  assert.equal(hdr.showStatutoryBar, true);

  const ftr = normalizeFooterConfig({
    copyrightText: '© 2026 Custom Trust',
    bottomBarLinks: [],
    showCreatorCreditBar: true,
    creatorCreditName: 'Campus Tech Guild',
  });
  assert.equal(ftr.copyrightText, '© 2026 Custom Trust');
  assert.equal(ftr.bottomBarLinks.length, 0);
  assert.equal(ftr.creatorCreditName, 'Campus Tech Guild');

  const cp = normalizeCreditsPageConfig({
    pageTitle: 'Engineering Team & Contributors',
    contributors: [],
    techStack: [{ name: 'Apache + PHP 8.2', category: 'Runtime', description: 'Production stack' }],
  });
  assert.equal(cp.pageTitle, 'Engineering Team & Contributors');
  assert.equal(cp.contributors.length, 0);
  assert.equal(cp.techStack.length, 1);
  assert.equal(cp.techStack[0].name, 'Apache + PHP 8.2');
});

test('migrateDatabaseInPlace upgrades pre-v11 databases with Header, Footer & Credits configs and /credits SEO + search work', () => {
  const seed = createSeedDatabase();
  const legacyDb = {
    ...structuredClone(seed),
    schemaVersion: 10,
    settings: {
      ...structuredClone(seed.settings),
      headerConfig: undefined,
      footerConfig: undefined,
      creditsPage: undefined,
    },
  };
  const { db, upgraded } = migrateDatabaseInPlace(legacyDb, seed);
  assert.equal(upgraded, true);
  assert.equal(db.schemaVersion, 11);
  assert.ok(db.settings.headerConfig);
  assert.ok(db.settings.footerConfig);
  assert.ok((db.settings.creditsPage?.contributors.length || 0) >= 1);

  const devSeo = resolveRouteSeo(
    '/developer',
    'https://portal.example.edu.in',
    db.settings,
    DEFAULT_SEO_SETTINGS,
    db.categories,
    db.pages,
    db.departments,
    db.conferences || [],
  );
  assert.ok(devSeo.title.includes('Creators'));

  const xml = buildSitemapXml('https://portal.example.edu.in', db);
  assert.equal(xml.includes('https://portal.example.edu.in/credits'), true);

  const searchHits = searchCmsContent('developer', db);
  assert.equal(searchHits.some((h) => h.url === '/credits'), true);
});

