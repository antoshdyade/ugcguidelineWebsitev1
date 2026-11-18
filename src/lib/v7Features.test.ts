import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDatabase } from '../data/seedDatabase';
import type { CmsDatabase } from '../types/cms';
import { canUserAccessResource, searchCmsContent } from './cmsLogic';
import { CURRENT_SCHEMA_VERSION, migrateDatabaseInPlace } from './collegeFeaturesLogic';
import { countDatabaseEntities } from './backupLogic';
import { buildSitemapXml } from './securityAndSeoLogic';

test('migrateDatabaseInPlace v6 -> v7 non-destructively adds sports, facilities, portal menu item, and conference posters', () => {
  const seed = createSeedDatabase();
  const v6Db: Partial<CmsDatabase> = {
    ...structuredClone(seed),
    schemaVersion: 6,
    sports: undefined,
    facilities: undefined,
    settings: {
      ...structuredClone(seed.settings),
      portalMenuItems: seed.settings.portalMenuItems?.filter((item) => item.url !== '/facilities'),
    },
    conferences: (seed.conferences || []).map((c) => {
      const clone = structuredClone(c);
      delete clone.enablePosterPresentation;
      delete clone.posterItems;
      return clone;
    }),
    pages: [
      ...seed.pages,
      {
        id: 9999,
        slug: 'custom-preserved-page',
        title: 'Custom Preserved Institutional Page',
        categorySlug: 'about-hei',
        subtitle: 'Should never be lost on upgrade',
        contentHtml: '<p>Preserved</p>',
        isPublished: true,
        updatedAt: '2026-11-18',
        updatedBy: 'test-suite',
        sortOrder: 999,
      },
    ],
  };

  const { db, upgraded } = migrateDatabaseInPlace(v6Db, seed);
  assert.equal(upgraded, true);
  assert.equal(db.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.ok(db.sports && db.sports.facilities.length >= 4);
  assert.ok(db.facilities && db.facilities.items.length >= 6);
  assert.ok(db.settings.portalMenuItems?.some((item) => item.url === '/facilities'));
  assert.ok(db.pages.some((p) => p.slug === 'custom-preserved-page'));
  const icaest = db.conferences?.find((c) => c.slug === 'icaest-2026');
  assert.equal(icaest?.enablePosterPresentation, true);
  assert.ok((icaest?.posterItems?.length ?? 0) >= 2);
});

test('RBAC enforces sports and facilities resources properly across roles and explicit modules', () => {
  assert.equal(canUserAccessResource({ role: 'super_admin', isActive: true }, 'sports'), true);
  assert.equal(canUserAccessResource({ role: 'super_admin', isActive: true }, 'facilities'), true);
  assert.equal(canUserAccessResource({ role: 'content_editor', isActive: true }, 'sports'), true);
  assert.equal(canUserAccessResource({ role: 'content_editor', isActive: true }, 'facilities'), true);
  assert.equal(canUserAccessResource({ role: 'exam_controller', isActive: true }, 'sports'), false);

  const sportsOnlyUser = {
    role: 'department_admin' as const,
    isActive: true,
    allowedModules: ['sports'] as ('sports')[],
  };
  assert.equal(canUserAccessResource(sportsOnlyUser, 'sports'), true);
  assert.equal(canUserAccessResource(sportsOnlyUser, 'facilities'), false);
  assert.equal(canUserAccessResource(sportsOnlyUser, 'users'), false);
});

test('searchCmsContent, countDatabaseEntities, and buildSitemapXml include sports, facilities, and conference posters', () => {
  const db = createSeedDatabase();
  const sportsHits = searchCmsContent('Kabaddi', db);
  assert.ok(sportsHits.some((r) => r.type === 'sports' && r.url.startsWith('/sports')));

  const facilityHits = searchCmsContent('Solar Microgrid', db);
  assert.ok(facilityHits.some((r) => r.type === 'facility' && r.url.startsWith('/facilities')));

  const posterHits = searchCmsContent('TinyML', db);
  assert.ok(posterHits.some((r) => r.type === 'conference'));

  const counts = countDatabaseEntities(db);
  assert.ok(counts.sports >= 4);
  assert.ok(counts.facilities >= 6);

  const sitemap = buildSitemapXml('https://coe.sveri.ac.in', db);
  assert.ok(sitemap.includes('/sports</loc>'));
  assert.ok(sitemap.includes('/facilities</loc>'));
});
