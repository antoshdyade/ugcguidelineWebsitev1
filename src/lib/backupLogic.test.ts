import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedDatabase } from '../data/seedDatabase';
import {
  applyBackupRestore,
  computeIncrementalDiff,
  computeNextRunIso,
  extractSnapshotData,
  validateBackupPackage,
} from './backupLogic';

test('computeIncrementalDiff detects only changed CMS sections relative to baseline', () => {
  const baseDb = createSeedDatabase();
  const baselineData = extractSnapshotData(baseDb);

  const modifiedDb = structuredClone(baseDb);
  modifiedDb.pages[0].title = 'Updated About HEI Title';

  const diff = computeIncrementalDiff(baselineData, modifiedDb);
  assert.deepEqual(diff.changedKeys, ['pages']);
  assert.equal(diff.changedData.categories, undefined);
  assert.equal(diff.changedData.pages?.[0].title, 'Updated About HEI Title');
});

test('validateBackupPackage rejects malformed archives and accepts valid full or incremental packages', () => {
  const invalid = validateBackupPackage({ format: 'wrong', data: {} });
  assert.equal(invalid.valid, false);

  const incompleteFull = validateBackupPackage({
    format: 'svcoer-cms-backup',
    version: 1,
    mode: 'full',
    data: { pages: [] },
  });
  assert.equal(incompleteFull.valid, false);

  const db = createSeedDatabase();
  const validFull = validateBackupPackage({
    format: 'svcoer-cms-backup',
    version: 1,
    mode: 'full',
    createdAt: '2026-11-13T10:00:00.000Z',
    data: extractSnapshotData(db),
  });
  assert.equal(validFull.valid, true);
  assert.ok((validFull.entityCounts?.pages ?? 0) > 0);
});

test('applyBackupRestore restores incremental and full snapshots while preserving backup metadata', () => {
  const currentDb = createSeedDatabase();
  currentDb.backups = [
    {
      id: 'bk-1',
      createdAt: '2026-11-13T09:00:00.000Z',
      createdBy: 'admin@svcoer.edu.in',
      mode: 'full',
      destination: 'local',
      filename: 'bk-1.json',
      sizeBytes: 1200,
      sha256: 'abc',
      entityCounts: { pages: 10 },
    },
  ];

  const corrupted = structuredClone(currentDb);
  corrupted.pages = [];
  corrupted.leadership[0].name = 'Corrupted Name';

  const restored = applyBackupRestore(corrupted, {
    format: 'svcoer-cms-backup',
    version: 1,
    mode: 'incremental',
    createdAt: '2026-11-13T10:00:00.000Z',
    data: {
      pages: currentDb.pages,
    },
  });

  assert.equal(restored.pages.length, currentDb.pages.length);
  assert.equal(restored.leadership[0].name, 'Corrupted Name');
  assert.equal(restored.backups?.length, 1);
});

test('computeNextRunIso computes hourly, daily, and weekly future timestamps', () => {
  const base = new Date('2026-11-13T00:00:00.000Z');
  assert.equal(computeNextRunIso('hourly', base), '2026-11-13T01:00:00.000Z');
  assert.equal(computeNextRunIso('daily', base), '2026-11-14T00:00:00.000Z');
  assert.equal(computeNextRunIso('weekly', base), '2026-11-20T00:00:00.000Z');
});
