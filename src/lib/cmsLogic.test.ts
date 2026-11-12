import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUserAccessResource,
  filterDocuments,
  formatBytes,
  searchCmsContent,
  validateUploadMeta,
} from './cmsLogic';
import type { CmsDocument } from '../types/cms';

test('formatBytes formats sizes cleanly with units', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1024 * 45), '45 KB');
  assert.equal(formatBytes(1024 * 1024 * 2.4), '2.4 MB');
});

test('validateUploadMeta blocks executable extensions and double extensions', () => {
  const phpBlocked = validateUploadMeta('exploit.php', 'application/pdf', 1024);
  assert.equal(phpBlocked.valid, false);

  const doubleExtBlocked = validateUploadMeta('shell.php.jpg', 'image/jpeg', 2048);
  assert.equal(doubleExtBlocked.valid, false);

  const validPdf = validateUploadMeta('FRA Fee Structure 2026.pdf', 'application/pdf', 250_000);
  assert.equal(validPdf.valid, true);
  assert.ok(validPdf.safeFilename?.endsWith('.pdf'));

  const validPng = validateUploadMeta('campus-logo.png', 'image/png', 120_000);
  assert.equal(validPng.valid, true);
  assert.ok(validPng.safeFilename?.endsWith('.png'));
});

test('canUserAccessResource enforces strict multi-tier RBAC and department scoping', () => {
  const superAdmin = { role: 'super_admin' as const, assignedDepartmentId: null, isActive: true };
  const deptAdminCSE = { role: 'department_admin' as const, assignedDepartmentId: 1, isActive: true };
  const iqacOfficer = { role: 'iqac_officer' as const, assignedDepartmentId: null, isActive: true };
  const contentEditor = { role: 'content_editor' as const, assignedDepartmentId: null, isActive: true };

  assert.equal(canUserAccessResource(superAdmin, 'users'), true);
  assert.equal(canUserAccessResource(deptAdminCSE, 'users'), false);
  assert.equal(canUserAccessResource(deptAdminCSE, 'departments', 1), true);
  assert.equal(canUserAccessResource(deptAdminCSE, 'departments', 2), false);
  assert.equal(canUserAccessResource(iqacOfficer, 'documents'), true);
  assert.equal(canUserAccessResource(iqacOfficer, 'leadership'), true);
  assert.equal(canUserAccessResource(iqacOfficer, 'sliders_events'), false);
  assert.equal(canUserAccessResource(contentEditor, 'sliders_events'), true);
  assert.equal(canUserAccessResource(contentEditor, 'directory'), true);
  assert.equal(canUserAccessResource(contentEditor, 'settings'), false);
});

test('searchCmsContent finds published pages, faculty, and documents while excluding unpublished pages', () => {
  const results = searchCmsContent('FRA', {
    pages: [
      {
        id: 1,
        categorySlug: 'admissions-fee',
        slug: 'prospectus-fee-structure',
        title: 'Prospectus & FRA Fee Structure',
        subtitle: 'Approved tuition & development fee',
        contentHtml: '<p>FRA approved fee schedule 2026-27</p>',
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-08-01',
        updatedBy: 'admin',
      },
      {
        id: 2,
        categorySlug: 'about-hei',
        slug: 'draft-fra',
        title: 'Draft FRA Internal Note',
        subtitle: 'Hidden draft',
        contentHtml: '<p>FRA draft</p>',
        isPublished: false,
        sortOrder: 2,
        updatedAt: '2026-08-01',
        updatedBy: 'admin',
      },
    ],
    departments: [],
    documents: [
      {
        id: 10,
        title: 'FRA Fee Approval Letter 2026-27',
        category: 'Fee Structure',
        fileUrl: '/uploads/fra.pdf',
        fileName: 'fra.pdf',
        fileSizeBytes: 340000,
        mimeType: 'application/pdf',
        uploadedAt: '2026-07-15',
        uploadedBy: 'iqac',
        isQuickLink: true,
      },
    ],
    events: [],
  });

  assert.equal(results.length, 2);
  assert.equal(results.some((r) => r.title.includes('Draft')), false);
});

test('filterDocuments filters by category and search query', () => {
  const docs: CmsDocument[] = [
    {
      id: 1,
      title: 'Academic Calendar 2026-27',
      category: 'Academic Calendar',
      fileUrl: '/a.pdf',
      fileName: 'a.pdf',
      fileSizeBytes: 1000,
      mimeType: 'application/pdf',
      uploadedAt: '2026-06-01',
      uploadedBy: 'admin',
      isQuickLink: true,
    },
    {
      id: 2,
      title: 'NAAC SSR Cycle 2',
      category: 'NAAC / NBA / NIRF',
      fileUrl: '/b.pdf',
      fileName: 'b.pdf',
      fileSizeBytes: 2000,
      mimeType: 'application/pdf',
      uploadedAt: '2026-06-02',
      uploadedBy: 'iqac',
      isQuickLink: true,
    },
  ];
  assert.equal(filterDocuments(docs, 'NAAC / NBA / NIRF', '').length, 1);
  assert.equal(filterDocuments(docs, 'All', 'calendar').length, 1);
});
