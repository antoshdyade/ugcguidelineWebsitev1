import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUserAccessCategory,
  canUserAccessPage,
  canUserAccessResource,
  filterDocuments,
  formatBytes,
  formatCommitteeGroupLabel,
  searchCmsContent,
  sortByOrder,
  validateExternalDocumentUrl,
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

test('validateExternalDocumentUrl accepts Google Drive URLs and blocks javascript/data schemes', () => {
  const driveUrl = validateExternalDocumentUrl('https://drive.google.com/file/d/1AbCdEfG/view?usp=sharing');
  assert.equal(driveUrl.valid, true);
  assert.ok(driveUrl.normalizedUrl?.startsWith('https://drive.google.com/'));

  const localUpload = validateExternalDocumentUrl('/uploads/syllabus.pdf');
  assert.equal(localUpload.valid, true);

  const xssBlocked = validateExternalDocumentUrl('javascript:alert(1)');
  assert.equal(xssBlocked.valid, false);

  const dataBlocked = validateExternalDocumentUrl('data:text/html,<script>alert(1)</script>');
  assert.equal(dataBlocked.valid, false);

  const emptyBlocked = validateExternalDocumentUrl('   ');
  assert.equal(emptyBlocked.valid, false);
});

test('canUserAccessResource enforces strict multi-tier RBAC, exam_controller, and department scoping', () => {
  const superAdmin = { role: 'super_admin' as const, assignedDepartmentId: null, isActive: true };
  const deptAdminCSE = { role: 'department_admin' as const, assignedDepartmentId: 1, isActive: true };
  const iqacOfficer = { role: 'iqac_officer' as const, assignedDepartmentId: null, isActive: true };
  const contentEditor = { role: 'content_editor' as const, assignedDepartmentId: null, isActive: true };
  const examController = { role: 'exam_controller' as const, assignedDepartmentId: null, isActive: true };

  assert.equal(canUserAccessResource(superAdmin, 'users'), true);
  assert.equal(canUserAccessResource(deptAdminCSE, 'users'), false);
  assert.equal(canUserAccessResource(deptAdminCSE, 'departments', 1), true);
  assert.equal(canUserAccessResource(deptAdminCSE, 'departments', 2), false);
  assert.equal(canUserAccessResource(iqacOfficer, 'documents'), true);
  assert.equal(canUserAccessResource(iqacOfficer, 'leadership'), true);
  assert.equal(canUserAccessResource(iqacOfficer, 'sliders_events'), false);
  assert.equal(canUserAccessResource(contentEditor, 'sliders_events'), true);
  assert.equal(canUserAccessResource(contentEditor, 'directory'), true);
  assert.equal(canUserAccessResource(contentEditor, 'categories'), true);
  assert.equal(canUserAccessResource(iqacOfficer, 'categories'), true);
  assert.equal(canUserAccessResource(deptAdminCSE, 'categories'), false);
  assert.equal(canUserAccessResource(superAdmin, 'categories'), true);
  assert.equal(canUserAccessResource(contentEditor, 'settings'), false);

  assert.equal(canUserAccessResource(examController, 'pages'), true);
  assert.equal(canUserAccessResource(examController, 'documents'), true);
  assert.equal(canUserAccessResource(examController, 'users'), false);
  assert.equal(canUserAccessResource(examController, 'settings'), false);
});

test('canUserAccessCategory and canUserAccessPage enforce granular per-category and per-page RBAC', () => {
  const examController = {
    role: 'exam_controller' as const,
    assignedDepartmentId: null,
    allowedCategories: ['examination'],
    allowedPageIds: [],
    isActive: true,
  };
  assert.equal(canUserAccessCategory(examController, 'examination'), true);
  assert.equal(canUserAccessCategory(examController, 'about-hei'), false);
  assert.equal(canUserAccessPage(examController, { id: 10, categorySlug: 'examination' }), true);
  assert.equal(canUserAccessPage(examController, { id: 1, categorySlug: 'about-hei' }), false);

  const singlePageEditor = {
    role: 'department_admin' as const,
    assignedDepartmentId: 1,
    allowedCategories: [],
    allowedPageIds: [42, 43],
    isActive: true,
  };
  assert.equal(canUserAccessResource(singlePageEditor, 'pages'), true);
  assert.equal(canUserAccessCategory(singlePageEditor, 'about-hei'), false);
  assert.equal(canUserAccessPage(singlePageEditor, { id: 42, categorySlug: 'about-hei' }), true);
  assert.equal(canUserAccessPage(singlePageEditor, { id: 99, categorySlug: 'about-hei' }), false);

  const mixedOverrideUser = {
    role: 'content_editor' as const,
    assignedDepartmentId: null,
    allowedCategories: ['about-hei'],
    allowedPageIds: [101],
    isActive: true,
  };
  assert.equal(canUserAccessPage(mixedOverrideUser, { id: 101, categorySlug: 'about-hei' }), true);
  assert.equal(canUserAccessPage(mixedOverrideUser, { id: 102, categorySlug: 'about-hei' }), false);
});

test('formatCommitteeGroupLabel and sortByOrder handle custom leadership groups and manual serials', () => {
  assert.equal(formatCommitteeGroupLabel('statutory'), 'Statutory Officer');
  assert.equal(formatCommitteeGroupLabel('Board of Studies'), 'Board of Studies');
  assert.equal(formatCommitteeGroupLabel(''), 'Leadership & Governance');

  const sorted = sortByOrder([
    { id: 10, sortOrder: 3 },
    { id: 20, sortOrder: 1 },
    { id: 30, sortOrder: 2 },
  ]);
  assert.deepEqual(
    sorted.map((x) => x.id),
    [20, 30, 10],
  );
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
