import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_SCHEMA_VERSION,
  generateReferenceCode,
  migrateDatabaseInPlace,
  normalizeCustomOption,
  validateAlumniPledgeInput,
  validateConferenceRegistrationInput,
  validateConferenceSubmissionInput,
  validateGrievanceInput,
} from './collegeFeaturesLogic';
import type { CmsDatabase } from '../types/cms';

test('normalizeCustomOption preserves custom text and applies fallback on empty input', () => {
  assert.equal(normalizeCustomOption('  Board of Governance  ', 'Committee'), 'Board of Governance');
  assert.equal(normalizeCustomOption('   ', 'General'), 'General');
  assert.equal(normalizeCustomOption(undefined, 'General'), 'General');
});

test('generateReferenceCode produces deterministic formatted tracking IDs', () => {
  assert.equal(generateReferenceCode('CONF', 7, 2026), 'CONF-2026-0007');
  assert.equal(generateReferenceCode('GRV-!!', 124, 2026), 'GRV-2026-0124');
});

test('conference, grievance, and alumni pledge validators reject invalid fields and accept complete data', () => {
  assert.equal(
    validateConferenceSubmissionInput({
      conferenceId: 1,
      paperTitle: 'Hi',
      trackTitle: 'AI',
      authorName: 'A',
      authorEmail: 'bad',
      affiliation: '',
      abstractText: 'short',
    }).valid,
    false,
  );
  assert.equal(
    validateConferenceSubmissionInput({
      conferenceId: 1,
      paperTitle: 'Edge AI Fault Diagnosis in Microgrids',
      trackTitle: 'Smart Grid & Renewable Systems',
      authorName: 'Prof. R. S. Deshmukh',
      authorEmail: 'rsd@coe.sveri.ac.in',
      affiliation: 'SVCOER Pandharpur',
      abstractText: 'This paper proposes a lightweight quantized CNN deployed on edge nodes for real-time microgrid fault isolation.',
    }).valid,
    true,
  );

  assert.equal(
    validateConferenceRegistrationInput({
      conferenceId: 1,
      attendeeName: 'Dr. M. K. Kulkarni',
      email: 'mkk@example.edu',
      affiliation: 'NIT Surathkal',
      feeCategory: 'Academician / Faculty',
    }).valid,
    true,
  );

  assert.equal(
    validateGrievanceInput({
      complainantName: 'S. P. Jadhav',
      email: 'spj@student.sveri.ac.in',
      category: 'Academic & Examination',
      subject: 'ABC Credit Sync Query',
      description: 'My DigiLocker ABC ID credits from Semester 5 need re-verification on the portal.',
    }).valid,
    true,
  );

  assert.equal(
    validateAlumniPledgeInput({
      fullName: 'Vikram Pawar',
      email: 'vikram@alumni.org',
      pledgeType: 'Laboratory / Equipment Sponsorship',
      amountOrSupport: '2 Embedded Systems Trainer Kits for ECE Lab',
    }).valid,
    true,
  );
});

test('migrateDatabaseInPlace upgrades v1 data non-destructively without losing custom uploads, pages, or credentials', () => {
  const minimalSeed = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    categories: [{ id: 1, slug: 'about-hei', name: 'About HEI', ugcCode: '5(a)', sortOrder: 1, description: 'About' }],
    pages: [],
    leadership: [],
    departments: [],
    sliders: [],
    ticker: [],
    events: [],
    documents: [],
    gallery: [],
    telephoneDirectory: [],
    conferences: [
      {
        id: 1,
        slug: 'icaest-2026',
        title: 'Seed Conference',
        shortName: 'ICAEST-2026',
        scope: 'International Conference',
        theme: 'AI',
        startDate: '2026-12-18',
        endDate: '2026-12-19',
        venue: 'Auditorium',
        mode: 'Hybrid',
        organizingDepartment: 'CSE',
        indexingPartners: [],
        contactEmail: 'conf@coe.sveri.ac.in',
        contactPhone: '123',
        bannerUrl: '',
        overviewHtml: '',
        cfpHtml: '',
        isPublished: true,
        isFeatured: true,
        sortOrder: 1,
        tracks: [],
        importantDates: [],
        people: [],
        schedule: [],
        feeTiers: [],
      },
    ],
    conferenceSubmissions: [],
    conferenceRegistrations: [],
    placements: {
      summaryNote: 'Seed note',
      coordinatorName: 'TPO',
      coordinatorEmail: 'tnp@coe.sveri.ac.in',
      coordinatorPhone: '123',
      stats: [{ id: 1, academicYear: '2025-26', branch: 'CSE', eligibleStudents: 120, placedStudents: 110, highestPackageLpa: 18, averagePackageLpa: 6.2, topRecruitersList: 'TCS', sortOrder: 1 }],
      stories: [],
    },
    grievances: [],
    alumni: {
      settings: {
        heroTitle: 'Alumni',
        heroSubtitle: 'Sub',
        associationRegNo: 'REG',
        coordinatorName: 'Coord',
        coordinatorEmail: 'a@b.c',
        allowSelfRegistration: true,
        allowPublicJobPosting: true,
      },
      profiles: [],
      jobs: [],
      events: [],
      achievers: [{ id: 1, fullName: 'Seed Achiever', batchYear: 2012, departmentCode: 'CSE', designation: 'VP', organization: 'Corp', awardTitle: 'Distinguished', citation: 'Gold', photoUrl: '/a.jpg', sortOrder: 1 }],
      pledges: [],
    },
    users: [],
    auditLogs: [],
    settings: {
      institutionName: 'Seed Inst',
      shortCode: 'SV',
      affiliation: 'Uni',
      aicteCode: '1',
      dteCode: '2',
      address: 'Addr',
      phone: '1',
      email: 'a@b.c',
      emergencyHelpline: '1',
      antiRaggingHelpline: '1',
      defaultPaletteId: 'royal-navy',
      primaryColor: '#0F294A',
      secondaryColor: '#B45309',
      designPreset: 'heritage-navy' as const,
      accreditationHighlights: [],
      topBarLinks: [],
      footerColumns: [],
      socialLinks: { facebook: '', linkedin: '', youtube: '', twitter: '' },
      mapEmbedQuery: 'Pandharpur',
      homeSections: {
        showTicker: true,
        showSlider: true,
        showStatsAndRecognitions: true,
        showAboutAndDownloads: true,
        showApprovedAndVision: true,
        showLeadershipDesk: true,
        showExaminationSpotlight: true,
        showDepartments: true,
        showCategoriesDirectory: true,
        showEventsAndRecruiters: true,
      },
      customHomeComponents: [],
    },
  } as unknown as CmsDatabase;

  const legacyUploadedDb: Partial<CmsDatabase> = {
    pages: [
      {
        id: 999,
        categorySlug: 'about-hei',
        slug: 'custom-user-page',
        title: 'User Uploaded Custom Committee Page',
        subtitle: 'Preserved forever',
        contentHtml: '<p>Uploaded Data</p>',
        attachedPdfUrl: '/uploads/my-custom-doc.pdf',
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-01-01',
        updatedBy: 'staff@coe.sveri.ac.in',
      },
    ],
    users: [
      {
        id: 50,
        fullName: 'Custom Staff',
        email: 'custom@coe.sveri.ac.in',
        role: 'specific_page_editor',
        allowedCategories: [],
        allowedPageIds: [999],
        isActive: true,
        passwordHash: 'sha256_preserved_hash',
      },
    ],
    settings: {
      ...minimalSeed.settings,
      institutionName: 'My Custom Uploaded Institution Name',
    },
  };

  const { db, upgraded } = migrateDatabaseInPlace(legacyUploadedDb, minimalSeed);
  assert.equal(upgraded, true);
  assert.equal(db.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(db.pages[0].slug, 'custom-user-page');
  assert.equal(db.pages[0].attachedPdfUrl, '/uploads/my-custom-doc.pdf');
  assert.equal(db.users[0].passwordHash, 'sha256_preserved_hash');
  assert.equal(db.settings.institutionName, 'My Custom Uploaded Institution Name');
  assert.equal(db.conferences?.length, 1);
  assert.equal(db.placements?.stats.length, 1);
  assert.equal(db.alumni?.achievers?.length, 1);
});
