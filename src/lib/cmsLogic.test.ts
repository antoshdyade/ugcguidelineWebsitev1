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

import {
  computeAutoCropRect,
  computeOutputDimensions,
  getUploadSizeLimitBytes,
  getUploadSizeLimitMb,
  isImageFileMeta,
} from './imageCrop';

test('computeAutoCropRect maintains exact aspect ratio and bounds pan/zoom', () => {
  // 2000x1500 (4:3) cropped to 16:9 centered at zoom 1 -> 2000x1125
  const r169 = computeAutoCropRect(2000, 1500, 16 / 9, 1, 0, 0);
  assert.equal(r169.sw, 2000);
  assert.equal(r169.sh, 1125);
  assert.equal(r169.sx, 0);
  assert.equal(r169.sy, 188);
  assert.ok(Math.abs(r169.sw / r169.sh - 16 / 9) < 0.01);

  // 2000x1000 cropped to 1:1 centered at zoom 1 -> 1000x1000 at sx=500, sy=0
  const r11 = computeAutoCropRect(2000, 1000, 1, 1, 0, 0);
  assert.equal(r11.sw, 1000);
  assert.equal(r11.sh, 1000);
  assert.equal(r11.sx, 500);
  assert.equal(r11.sy, 0);

  // Zoomed 2x + panned bottom-right stays strictly within source bounds
  const zoomed = computeAutoCropRect(2000, 1000, 1, 2, 1.5, 1.5);
  assert.equal(zoomed.sw, 500);
  assert.equal(zoomed.sh, 500);
  assert.ok(zoomed.sx + zoomed.sw <= 2000);
  assert.ok(zoomed.sy + zoomed.sh <= 1000);
});

test('computeOutputDimensions downscales oversized crops while preserving ratio', () => {
  const scaled = computeOutputDimensions(3200, 1800, 1600);
  assert.deepEqual(scaled, { width: 1600, height: 900 });

  const untouched = computeOutputDimensions(800, 600, 1200);
  assert.deepEqual(untouched, { width: 800, height: 600 });
});

test('getUploadSizeLimitMb, getUploadSizeLimitBytes, and isImageFileMeta enforce separate photo vs document controls', () => {
  assert.equal(getUploadSizeLimitMb(undefined, 'photo'), 2);
  assert.equal(getUploadSizeLimitMb(undefined, 'document'), 10);

  const custom = { maxPhotoUploadMb: 3.5, maxDocumentUploadMb: 15 };
  assert.equal(getUploadSizeLimitBytes(custom, 'photo'), Math.round(3.5 * 1024 * 1024));
  assert.equal(getUploadSizeLimitBytes(custom, 'document'), 15 * 1024 * 1024);

  assert.equal(isImageFileMeta('slide.jpg', 'image/jpeg'), true);
  assert.equal(isImageFileMeta('brochure.pdf', 'application/pdf'), false);
});

import { buildPhotoProfileCardHtml } from './editorBlocks';

test('specific_page_editor role strictly limits access to assigned pages/categories only', () => {
  const pageOnlyUser = {
    role: 'specific_page_editor' as const,
    assignedDepartmentId: null,
    allowedCategories: [],
    allowedPageIds: [12, 15],
    isActive: true,
  };
  assert.equal(canUserAccessResource(pageOnlyUser, 'pages'), true);
  assert.equal(canUserAccessResource(pageOnlyUser, 'categories'), false);
  assert.equal(canUserAccessResource(pageOnlyUser, 'leadership'), false);
  assert.equal(canUserAccessResource(pageOnlyUser, 'alumni'), false);
  assert.equal(canUserAccessResource(pageOnlyUser, 'documents'), false);
  assert.equal(canUserAccessResource(pageOnlyUser, 'users'), false);
  assert.equal(canUserAccessResource(pageOnlyUser, 'settings'), false);
  assert.equal(canUserAccessPage(pageOnlyUser, { id: 12, categorySlug: 'academics' }), true);
  assert.equal(canUserAccessPage(pageOnlyUser, { id: 99, categorySlug: 'academics' }), false);
  assert.equal(canUserAccessCategory(pageOnlyUser, 'academics'), false);

  const unassignedSpecificUser = {
    role: 'specific_page_editor' as const,
    assignedDepartmentId: null,
    allowedCategories: [],
    allowedPageIds: [],
    isActive: true,
  };
  assert.equal(canUserAccessPage(unassignedSpecificUser, { id: 12, categorySlug: 'academics' }), false);
  assert.equal(canUserAccessCategory(unassignedSpecificUser, 'academics'), false);
});

test('buildPhotoProfileCardHtml renders portrait card and neutralizes XSS schemes', () => {
  const html = buildPhotoProfileCardHtml({
    roleBadge: 'Statutory Officer',
    name: 'Dr. <script>alert(1)</script> Patil',
    designation: 'Principal',
    department: 'Civil Engineering',
    email: 'principal@coe.sveri.ac.in',
    phone: '02186-216063',
    photoUrl: 'javascript:alert(1)',
    profileUrl: 'https://coe.sveri.ac.in/faculty/patil',
    columns: 2,
  });
  assert.ok(html.includes('cms-photo-profile-card'));
  assert.ok(html.includes('cms-grid-2'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('javascript:alert(1)'));
});

test('canUserAccessResource honors explicit allowedModules and allowedDepartmentIds for any staff role', () => {
  const conferenceChairUser = {
    role: 'specific_page_editor' as const,
    assignedDepartmentId: null,
    allowedCategories: [],
    allowedPageIds: [1],
    allowedModules: ['conferences', 'placements', 'departments'] as any,
    allowedDepartmentIds: [2, 3],
    isActive: true,
  };
  assert.equal(canUserAccessResource(conferenceChairUser, 'conferences'), true);
  assert.equal(canUserAccessResource(conferenceChairUser, 'placements'), true);
  assert.equal(canUserAccessResource(conferenceChairUser, 'grievances'), false);
  assert.equal(canUserAccessResource(conferenceChairUser, 'pages'), true);
  assert.equal(canUserAccessResource(conferenceChairUser, 'departments', 2), true);
  assert.equal(canUserAccessResource(conferenceChairUser, 'departments', 3), true);
  assert.equal(canUserAccessResource(conferenceChairUser, 'departments', 1), false);
});

test('searchCmsContent indexes published conferences and excludes unpublished ones', () => {
  const results = searchCmsContent('ICAEST', {
    pages: [],
    departments: [],
    documents: [],
    events: [],
    conferences: [
      {
        id: 1,
        slug: 'icaest-2026',
        title: 'International Conference on Advances in Engineering & Smart Technology',
        shortName: 'ICAEST-2026',
        scope: 'International Conference',
        theme: 'AI, Sustainable Infrastructure & Robotics',
        startDate: '2026-12-18',
        endDate: '2026-12-19',
        venue: 'SVCOER Auditorium',
        mode: 'Hybrid (On-Campus + Online)',
        organizingDepartment: 'CSE',
        indexingPartners: ['IEEE Xplore'],
        contactEmail: 'icaest@coe.sveri.ac.in',
        contactPhone: '02186-216063',
        bannerUrl: '/uploads/conf.jpg',
        overviewHtml: '<p>Overview</p>',
        cfpHtml: '<p>CFP</p>',
        isPublished: true,
        isFeatured: true,
        sortOrder: 1,
        tracks: [],
        importantDates: [],
        people: [],
        schedule: [],
        feeTiers: [],
      },
      {
        id: 2,
        slug: 'draft-conf',
        title: 'ICAEST Draft Conference',
        shortName: 'DRAFT-2026',
        scope: 'National Conference',
        theme: 'Draft',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        venue: 'Campus',
        mode: 'On-Campus',
        organizingDepartment: 'MECH',
        indexingPartners: [],
        contactEmail: 'c@coe.sveri.ac.in',
        contactPhone: '123',
        bannerUrl: '',
        overviewHtml: '',
        cfpHtml: '',
        isPublished: false,
        isFeatured: false,
        sortOrder: 2,
        tracks: [],
        importantDates: [],
        people: [],
        schedule: [],
        feeTiers: [],
      },
    ],
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].type, 'conference');
  assert.equal(results[0].url, '/conference/icaest-2026');
});

