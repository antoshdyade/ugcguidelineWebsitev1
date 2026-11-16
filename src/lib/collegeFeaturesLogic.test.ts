import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFERENCE_SCOPE_PRESETS,
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

test('CONFERENCE_SCOPE_PRESETS covers conferences/workshops/events and migrateDatabaseInPlace backfills sliders non-destructively', () => {
  assert.ok(CONFERENCE_SCOPE_PRESETS.includes('International Conference'));
  assert.ok(CONFERENCE_SCOPE_PRESETS.includes('National Conference'));
  assert.ok(CONFERENCE_SCOPE_PRESETS.includes('Research Workshop'));
  assert.ok(CONFERENCE_SCOPE_PRESETS.includes('Technical Event / Symposium'));
  assert.ok(CONFERENCE_SCOPE_PRESETS.includes('Short-Term Training Program (STTP)'));
  assert.ok(CONFERENCE_SCOPE_PRESETS.includes('Patent & IPR Clinic'));

  const seed = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    categories: [],
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
        slug: 'conf-1',
        title: 'National Symposium',
        shortName: 'NS-2026',
        scope: 'National Conference',
        theme: 'Smart Systems',
        startDate: '2026-11-10',
        endDate: '2026-11-11',
        venue: 'Main Auditorium',
        mode: 'Hybrid',
        organizingDepartment: 'CSE',
        indexingPartners: [],
        contactEmail: 'conf@coe.sveri.ac.in',
        contactPhone: '123',
        bannerUrl: '/uploads/banner.jpg',
        heroSlides: [
          {
            id: 1,
            title: 'Seed Slide',
            caption: 'Seed Caption',
            imageUrl: '/uploads/banner.jpg',
            ctaLabel: 'Register',
            ctaLink: '/conference/conf-1',
          },
        ],
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
      researchSliderSlides: [
        {
          id: 10,
          title: 'Seed Research Slider',
          caption: 'Conferences & R&D',
          imageUrl: '/uploads/res.jpg',
          ctaLabel: 'Explore',
          ctaLink: '/conferences',
        },
      ],
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

  const existingLegacy: Partial<CmsDatabase> = {
    schemaVersion: 2,
    conferences: [
      {
        ...(seed.conferences![0]),
        heroSlides: undefined,
      },
      {
        ...(seed.conferences![0]),
        id: 2,
        slug: 'custom-workshop-99',
        title: 'Custom Robotics Workshop',
        shortName: 'CRW-2026',
        scope: 'Research Workshop',
        bannerUrl: '/uploads/custom-ws.jpg',
        heroSlides: [
          {
            id: 99,
            title: 'Preserved Custom Slide',
            caption: 'Never overwritten',
            imageUrl: '/uploads/custom-ws.jpg',
          },
        ],
      },
    ],
    settings: {
      ...seed.settings,
      researchSliderSlides: undefined,
    },
  };

  const { db, upgraded } = migrateDatabaseInPlace(existingLegacy, seed);
  assert.equal(upgraded, true);
  assert.equal(db.conferences?.[0].heroSlides?.length, 1);
  assert.equal(db.conferences?.[0].heroSlides?.[0].title, 'Seed Slide');
  assert.equal(db.conferences?.[1].heroSlides?.[0].title, 'Preserved Custom Slide');
  assert.equal(db.settings.researchSliderSlides?.length, 1);
  assert.equal(db.settings.researchSliderSlides?.[0].title, 'Seed Research Slider');
  assert.ok((db.settings.portalMenuItems?.length || 0) >= 6);
  assert.ok((db.settings.grievancePortal?.committeeMembers?.length || 0) >= 1);
});

import {
  computePlacementMetrics,
  isExternalPaperSubmissionActive,
  partitionHeaderMenus,
} from './collegeFeaturesLogic';

test('partitionHeaderMenus splits main bar vs More Portals vs hidden menus cleanly', () => {
  const cats = [
    { id: 1, slug: 'about', name: 'About HEI', ugcCode: '5a', sortOrder: 1, description: '', showInMenu: true, menuLocation: 'main' as const },
    { id: 2, slug: 'iqac', name: 'IQAC Cell', ugcCode: '5a', sortOrder: 2, description: '', showInMenu: true, menuLocation: 'more' as const },
    { id: 3, slug: 'draft', name: 'Draft', ugcCode: '5a', sortOrder: 3, description: '', showInMenu: false, menuLocation: 'hidden' as const },
  ];
  const portals = [
    { id: 1, label: 'Conferences', url: '/conferences', menuLocation: 'main' as const, sortOrder: 1 },
    { id: 2, label: 'Gallery', url: '/gallery', menuLocation: 'more' as const, sortOrder: 2 },
    { id: 3, label: 'Hidden Portal', url: '/hidden', menuLocation: 'hidden' as const, sortOrder: 3 },
  ];
  const res = partitionHeaderMenus(cats, portals);
  assert.deepEqual(res.mainCategories.map((c) => c.slug), ['about']);
  assert.deepEqual(res.moreCategories.map((c) => c.slug), ['iqac']);
  assert.deepEqual(res.mainPortalLinks.map((p) => p.label), ['Conferences']);
  assert.deepEqual(res.morePortalLinks.map((p) => p.label), ['Gallery']);
});

test('isExternalPaperSubmissionActive disables local submission whenever external link is configured', () => {
  assert.equal(isExternalPaperSubmissionActive({ submissionMode: 'portal', externalSubmissionUrl: '' }), false);
  assert.equal(
    isExternalPaperSubmissionActive({
      submissionMode: 'external',
      externalSubmissionUrl: 'https://cmt3.research.microsoft.com/ICAEST2026',
    }),
    true,
  );
  // Even if mode wasn't toggled yet, presence of valid external URL enforces lock on local submission
  assert.equal(
    isExternalPaperSubmissionActive({
      submissionMode: 'portal',
      externalSubmissionUrl: 'https://easychair.org/conferences/?conf=icaest26',
    }),
    true,
  );
  // Closed mode disables external portal submission too
  assert.equal(
    isExternalPaperSubmissionActive({
      submissionMode: 'closed',
      externalSubmissionUrl: 'https://cmt3.research.microsoft.com/ICAEST2026',
    }),
    false,
  );
});

test('computePlacementMetrics computes percentage and aggregate KPIs accurately', () => {
  const m = computePlacementMetrics([
    {
      id: 1,
      academicYear: '2025-26',
      branch: 'CSE',
      eligibleStudents: 100,
      placedStudents: 92,
      highestPackageLpa: 21,
      averagePackageLpa: 6.5,
      topRecruitersList: 'TCS',
      sortOrder: 1,
    },
    {
      id: 2,
      academicYear: '2025-26',
      branch: 'MECH',
      eligibleStudents: 100,
      placedStudents: 80,
      highestPackageLpa: 12,
      averagePackageLpa: 5.5,
      topRecruitersList: 'Bosch',
      sortOrder: 2,
    },
  ]);
  assert.equal(m.eligible, 200);
  assert.equal(m.placed, 172);
  assert.equal(m.overallRate, '86.0');
  assert.equal(m.highest, 21);
  assert.equal(m.avg, '6.00');
  assert.equal(m.rowsWithPct[0].placementRatePct, 92);
});

