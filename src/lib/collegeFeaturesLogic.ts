import type {
  AlumniEndowmentPledge,
  BlockedIpEntry,
  CmsCategory,
  CmsDatabase,
  Conference,
  ConferenceRegistration,
  ConferenceSubmission,
  GrievancePortalConfig,
  GrievanceTicket,
  HeaderPortalMenuItem,
  HitCounterStats,
  PlacementsData,
  PlacementNotice,
  PlacementStory,
  PlacementYearStat,
  SanctionedIntakeProgram,
  SecurityConfig,
  SeoSettings,
  SportsData,
  FacilitiesData,
  VisitorLogEntry,
} from '../types/cms';
import {
  DEFAULT_SECURITY_CONFIG,
  DEFAULT_SEO_SETTINGS,
  createSeedHitCounter,
  createSeedVisitorLogs,
} from './securityAndSeoLogic';

export const CURRENT_SCHEMA_VERSION = 7;

export const PLACEMENT_NOTICE_CATEGORY_PRESETS = [
  'Campus Drive Notice',
  'Interview Shortlist',
  'Pre-Placement Talk',
  'Training Schedule',
  'Internship Circular',
  'Student Circular',
] as const;

export const PLACEMENT_CONGRATULATION_TYPE_PRESETS = [
  'Campus Placement',
  'Dream / Super-Dream Offer',
  'National Hackathon / Award',
  'GATE / GRE / CAT Ranker',
  'Core Industry Offer',
  'Paid Internship Conversion',
] as const;

export const CONFERENCE_SUBMISSION_PLATFORM_PRESETS = [
  'Microsoft CMT',
  'EasyChair',
  'EDAS Conference System',
  'IEEE Conference Portal',
  'OpenConf',
  'Google Form',
] as const;

export const DEFAULT_PORTAL_MENU_ITEMS: HeaderPortalMenuItem[] = [
  { id: 1, label: 'Conferences', url: '/conferences', menuLocation: 'main', sortOrder: 1 },
  { id: 8, label: 'Facilities', url: '/facilities', menuLocation: 'main', sortOrder: 2 },
  { id: 2, label: 'Placements', url: '/placements', menuLocation: 'main', sortOrder: 3 },
  { id: 3, label: 'Grievance & Anti-Ragging', url: '/grievance', menuLocation: 'main', sortOrder: 4 },
  { id: 4, label: 'Alumni', url: '/alumni', menuLocation: 'main', sortOrder: 5 },
  { id: 5, label: 'Gallery', url: '/gallery', menuLocation: 'more', sortOrder: 6 },
  { id: 6, label: 'Contact Us', url: '/contact', menuLocation: 'more', sortOrder: 7 },
  { id: 7, label: 'Quick Links & Disclosures', url: '/quick-links', menuLocation: 'more', sortOrder: 8 },
];

export const DEFAULT_GRIEVANCE_PORTAL_CONFIG: GrievancePortalConfig = {
  heroTitle: 'Online Student Grievance Redressal (SGRC) & Anti-Ragging Helpdesk',
  heroSubtitle:
    'AICTE & UGC Statutory 2023 Compliant Mechanism — Lodge confidential academic, examination, scholarship, hostel, ICC, or anti-ragging complaints and track committee action online.',
  ombudspersonName: 'Hon. Dr. S. R. Chougule (Retd. Vice-Chancellor)',
  ombudspersonDesignation: 'Appointed Institutional Ombudsperson (UGC SGRC Regulations 2023)',
  ombudspersonEmail: 'ombudsperson@coe.sveri.ac.in',
  ombudspersonPhone: '+91-02186-216063',
  ombudspersonPhotoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
  antiRaggingSquadPhone: '+91-94220-88100 (24x7 Squad)',
  iccCoordinatorName: 'Dr. M. S. Kulkarni',
  iccCoordinatorEmail: 'icc@coe.sveri.ac.in',
  ugcAffidavitUrl: 'https://www.antiragging.in/',
  slaAcknowledgementHours: '24 Hours',
  slaResolutionDays: '15 Working Days',
  charterHtml:
    '<h3>Statutory Escalation &amp; Redressal SLA</h3><table class="cms-table cms-table-navy"><thead><tr><th>Stage</th><th>Authority / Committee</th><th>Turnaround Timeline</th><th>Action Protocol</th></tr></thead><tbody><tr><td>Level 1</td><td>Departmental / Hostel Nodal Officer</td><td>Within 48 Hours</td><td>Ticket acknowledgement &amp; preliminary inquiry</td></tr><tr><td>Level 2</td><td>Institutional Student Grievance Redressal Committee (SGRC)</td><td>Within 15 Working Days</td><td>Formal hearing, documentary review &amp; written order</td></tr><tr><td>Level 3</td><td>Institutional Ombudsperson</td><td>Appeal within 15 Days</td><td>Independent appellate adjudication (UGC Guidelines)</td></tr><tr><td>Emergency</td><td>Anti-Ragging Squad / ICC Cell</td><td>Immediate (Zero Tolerance)</td><td>24x7 campus intervention, interim protection &amp; FIR protocol if warranted</td></tr></tbody></table>',
  committeeMembers: [
    {
      id: 1,
      name: 'Dr. Prashant M. Pawar',
      roleTitle: 'Chairperson, SGRC',
      designation: 'Principal & Professor',
      committeeName: 'Student Grievance Redressal Committee',
      email: 'principal@coe.sveri.ac.in',
      phone: '+91-02186-216063',
      photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
      sortOrder: 1,
    },
    {
      id: 2,
      name: 'Prof. S. S. Deshmukh',
      roleTitle: 'Convener, Anti-Ragging Squad',
      designation: 'Dean Student Affairs',
      committeeName: '24x7 Anti-Ragging Flying Squad',
      email: 'antiragging@coe.sveri.ac.in',
      phone: '+91-94220-88100',
      photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
      sortOrder: 2,
    },
    {
      id: 3,
      name: 'Dr. M. S. Kulkarni',
      roleTitle: 'Presiding Officer, ICC',
      designation: 'Professor, Electronics & Telecom',
      committeeName: 'Internal Complaint Committee (Women Safety)',
      email: 'icc@coe.sveri.ac.in',
      phone: '+91-02186-216065',
      photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
      sortOrder: 3,
    },
  ],
};

export const DEFAULT_INTAKE_PROGRAMS: SanctionedIntakeProgram[] = [
  { id: 1, code: '622024510', programName: 'B.Tech in Computer Science & Engineering', level: 'UG (4 Years)', sanctionedIntake: 180, accreditationStatus: 'NBA Accredited · Autonomous', annualFee: '₹1,14,500', sortOrder: 1 },
  { id: 2, code: '622037210', programName: 'B.Tech in Electronics & Telecommunication Engg.', level: 'UG (4 Years)', sanctionedIntake: 120, accreditationStatus: 'NBA Accredited · Autonomous', annualFee: '₹1,14,500', sortOrder: 2 },
  { id: 3, code: '622061210', programName: 'B.Tech in Mechanical Engineering', level: 'UG (4 Years)', sanctionedIntake: 120, accreditationStatus: 'NBA Accredited · Autonomous', annualFee: '₹1,14,500', sortOrder: 3 },
  { id: 4, code: '622019110', programName: 'B.Tech in Civil Engineering', level: 'UG (4 Years)', sanctionedIntake: 60, accreditationStatus: 'NAAC A+ · Autonomous', annualFee: '₹1,14,500', sortOrder: 4 },
  { id: 5, code: '622029310', programName: 'B.Tech in Electrical Engineering', level: 'UG (4 Years)', sanctionedIntake: 60, accreditationStatus: 'NAAC A+ · Autonomous', annualFee: '₹1,14,500', sortOrder: 5 },
  { id: 6, code: '622010110', programName: 'Master of Business Administration (MBA) & M.Tech', level: 'PG (2 Years)', sanctionedIntake: 96, accreditationStatus: 'AICTE & PAHSUS Approved', annualFee: '₹88,000', sortOrder: 6 },
];

export const DOCUMENT_CATEGORY_PRESETS = [
  'Fee Structure',
  'Academic Calendar',
  'Syllabus',
  'UGC & AICTE Approvals',
  'NAAC / NBA / NIRF',
  'Annual Reports & Audits',
  'Circulars & Forms',
  'Conference Proceedings',
  'Placement Brochures',
] as const;

export const EVENT_CATEGORY_PRESETS = [
  'Event',
  'Notice',
  'Achievement',
  'Circular',
  'Placement',
  'Conference',
  'Workshop / FDP',
] as const;

export const DEPT_SUBPAGE_TYPE_PRESETS: { value: string; label: string }[] = [
  { value: 'general', label: 'General Editorial / Rich Page' },
  { value: 'gallery', label: 'Department Photo Gallery' },
  { value: 'library', label: 'Department Library & Books' },
  { value: 'notice_board', label: 'Department Notice Board' },
  { value: 'events', label: 'Workshops & Technical Events' },
  { value: 'notes_syllabus', label: 'Notes, Syllabus & Question Banks' },
  { value: 'achievements_students', label: 'Student Achievements & Hackathons' },
  { value: 'achievements_faculty', label: 'Faculty Research & Grants' },
  { value: 'celebrations', label: 'Department Days & Celebrations' },
];

export const TELEPHONE_SECTION_PRESETS = [
  'Principal & Administration',
  'Examination Cell',
  'Academic Departments',
  'Training & Placement',
  'Library & Hostels',
  'Student Grievance & Anti-Ragging',
  'Conference & R&D Cell',
] as const;

export const ALUMNI_DEGREE_PRESETS = [
  'B.Tech',
  'B.E.',
  'M.Tech',
  'M.E.',
  'MBA',
  'MCA',
  'Ph.D.',
  'Diploma in Engineering',
] as const;

export const ALUMNI_JOB_TYPE_PRESETS = [
  'Full-Time',
  'Internship',
  'Referral',
  'Consultancy',
  'Part-Time / Visiting Faculty',
] as const;

export const ALUMNI_CHAPTER_PRESETS = [
  'Pandharpur Home Chapter',
  'Pune Chapter',
  'Bengaluru Chapter',
  'Mumbai Chapter',
  'Hyderabad Chapter',
  'Delhi NCR Chapter',
  'North America Chapter',
  'Europe & UK Chapter',
] as const;

export const ALUMNI_PLEDGE_TYPE_PRESETS = [
  'Laboratory / Equipment Sponsorship',
  'Merit-cum-Means Student Scholarship',
  'Campus Expert Talk / Workshop',
  'Industrial Visit / Internship Host',
  'Library Book & Digital Archive Grant',
] as const;

export const CONFERENCE_SCOPE_PRESETS = [
  'International Conference',
  'National Conference',
  'Research Workshop',
  'Technical Event / Symposium',
  'Faculty Development Program (FDP)',
  'Short-Term Training Program (STTP)',
  'Poster Presentation',
  'Poster Presentation & Technical Expo',
  'Patent & IPR Clinic',
] as const;

export const CONFERENCE_PRESENTATION_TYPE_PRESETS = [
  'Oral Paper Presentation',
  'Poster Presentation',
  'Hardware / Prototype Demo',
] as const;

export const SPORTS_FACILITY_TYPE_PRESETS = [
  'Outdoor Ground / Track',
  'Indoor Court / Hall',
  'Fitness & Gymnasium',
  'Aquatic / Synthetic Court',
  'Yoga & Wellness Studio',
] as const;

export const SPORTS_EVENT_TYPE_PRESETS = [
  'Annual Sports Meet',
  'Intercollegiate Tournament',
  'University Zonal Trials',
  'Fitness & Marathon Drive',
  'Coaching Camp / Clinic',
] as const;

export const SPORTS_ACHIEVEMENT_LEVEL_PRESETS = [
  'University',
  'State',
  'National',
  'International',
  'Zonal / Intercollegiate',
] as const;

export const SPORTS_NOTICE_CATEGORY_PRESETS = [
  'Trials & Selection',
  'Tournament Schedule',
  'Fitness Schedule',
  'Gymkhana Circular',
  'Achievement Announcement',
] as const;

export const FACILITY_CATEGORY_PRESETS = [
  'Infrastructural Facilities',
  'IT & Computing Facilities',
  'Student Facilities',
  'Research & Central Labs',
  'Library & Digital Resources',
  'Green & Barrier-Free Campus',
] as const;

export const CONFERENCE_MODE_PRESETS = [
  'Hybrid (On-Campus + Online)',
  'On-Campus (In-Person)',
  'Online Virtual Conference',
] as const;

export const CONFERENCE_ROLE_PRESETS = [
  'Keynote Speaker',
  'Chief Patron',
  'General Chair',
  'Program Chair',
  'Convener',
  'Technical Program Committee (TPC)',
  'Organizing Secretary',
  'Advisory Board Member',
] as const;

export const GRIEVANCE_CATEGORY_PRESETS = [
  'Academic & Examination',
  'Scholarship & Fee Matters',
  'Anti-Ragging & Campus Safety',
  'Hostel, Transport & Canteen',
  'Library, Lab & Infrastructure',
  'Equal Opportunity / SC-ST Cell',
  'Internal Complaint Committee (ICC)',
] as const;

export const GRIEVANCE_ROLE_PRESETS = [
  'Student (UG / PG / Ph.D.)',
  'Parent / Guardian',
  'Faculty / Staff Member',
  'Alumni / Visitor',
] as const;

export const DESIGN_PRESETS: {
  id: 'heritage-navy' | 'modern-slate' | 'emerald-campus' | 'crimson-scholar';
  label: string;
  primary: string;
  secondary: string;
  fontHeading: string;
  fontBody: string;
}[] = [
  {
    id: 'heritage-navy',
    label: 'Heritage Navy & Saffron Gold',
    primary: '#0F294A',
    secondary: '#B45309',
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  {
    id: 'modern-slate',
    label: 'Executive Slate & Indigo',
    primary: '#1E293B',
    secondary: '#2563EB',
    fontHeading: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  {
    id: 'emerald-campus',
    label: 'Emerald Green & Teal',
    primary: '#064E3B',
    secondary: '#0F766E',
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  {
    id: 'crimson-scholar',
    label: 'Academic Crimson & Bronze',
    primary: '#7F1D1D',
    secondary: '#B45309',
    fontHeading: "'Playfair Display', Georgia, serif",
    fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
];

export function normalizeCustomOption(val: string | undefined, fallback: string): string {
  const cleaned = (val || '').trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

export function generateReferenceCode(prefix: string, seqNum: number, year = new Date().getFullYear()): string {
  const cleanPrefix = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'REF';
  const padded = String(Math.max(1, Math.floor(seqNum))).padStart(4, '0');
  return `${cleanPrefix}-${year}-${padded}`;
}

export function validateConferenceSubmissionInput(input: {
  conferenceId?: number;
  paperTitle?: string;
  trackTitle?: string;
  authorName?: string;
  authorEmail?: string;
  affiliation?: string;
  abstractText?: string;
}): { valid: boolean; reason?: string } {
  if (!Number.isInteger(Number(input.conferenceId)) || Number(input.conferenceId) <= 0) {
    return { valid: false, reason: 'Valid target conference is required.' };
  }
  if ((input.paperTitle || '').trim().length < 5) {
    return { valid: false, reason: 'Paper title must be at least 5 characters.' };
  }
  if (!(input.trackTitle || '').trim()) {
    return { valid: false, reason: 'Please select or enter a technical track.' };
  }
  if ((input.authorName || '').trim().length < 2) {
    return { valid: false, reason: 'Corresponding author full name is required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input.authorEmail || '').trim())) {
    return { valid: false, reason: 'Valid author email address is required.' };
  }
  if (!(input.affiliation || '').trim()) {
    return { valid: false, reason: 'Author institution / organization affiliation is required.' };
  }
  if ((input.abstractText || '').trim().length < 25) {
    return { valid: false, reason: 'Abstract must be at least 25 characters.' };
  }
  return { valid: true };
}

export function validateConferenceRegistrationInput(input: {
  conferenceId?: number;
  attendeeName?: string;
  email?: string;
  affiliation?: string;
  feeCategory?: string;
}): { valid: boolean; reason?: string } {
  if (!Number.isInteger(Number(input.conferenceId)) || Number(input.conferenceId) <= 0) {
    return { valid: false, reason: 'Valid conference selection is required.' };
  }
  if ((input.attendeeName || '').trim().length < 2) {
    return { valid: false, reason: 'Delegate full name is required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input.email || '').trim())) {
    return { valid: false, reason: 'Valid delegate email address is required.' };
  }
  if (!(input.affiliation || '').trim()) {
    return { valid: false, reason: 'Institution / Industry affiliation is required.' };
  }
  if (!(input.feeCategory || '').trim()) {
    return { valid: false, reason: 'Please select or specify a registration category.' };
  }
  return { valid: true };
}

export function validateGrievanceInput(input: {
  complainantName?: string;
  email?: string;
  category?: string;
  subject?: string;
  description?: string;
}): { valid: boolean; reason?: string } {
  if ((input.complainantName || '').trim().length < 2) {
    return { valid: false, reason: 'Complainant full name is required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input.email || '').trim())) {
    return { valid: false, reason: 'Valid contact email is required for ticket updates.' };
  }
  if (!(input.category || '').trim()) {
    return { valid: false, reason: 'Please select or enter a grievance category.' };
  }
  if ((input.subject || '').trim().length < 4) {
    return { valid: false, reason: 'Grievance subject must be at least 4 characters.' };
  }
  if ((input.description || '').trim().length < 15) {
    return { valid: false, reason: 'Please describe your concern in at least 15 characters.' };
  }
  return { valid: true };
}

export function validateAlumniPledgeInput(input: {
  fullName?: string;
  email?: string;
  pledgeType?: string;
  amountOrSupport?: string;
}): { valid: boolean; reason?: string } {
  if ((input.fullName || '').trim().length < 2) {
    return { valid: false, reason: 'Alumni full name is required.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input.email || '').trim())) {
    return { valid: false, reason: 'Valid email address is required.' };
  }
  if (!(input.pledgeType || '').trim()) {
    return { valid: false, reason: 'Please select or specify a contribution/support area.' };
  }
  if (!(input.amountOrSupport || '').trim()) {
    return { valid: false, reason: 'Please describe the support or commitment.' };
  }
  return { valid: true };
}

export function partitionHeaderMenus(
  categories: CmsCategory[],
  portalMenuItems?: HeaderPortalMenuItem[],
): {
  mainCategories: CmsCategory[];
  moreCategories: CmsCategory[];
  mainPortalLinks: HeaderPortalMenuItem[];
  morePortalLinks: HeaderPortalMenuItem[];
} {
  const orderedCats = [...(categories || [])]
    .filter((c) => c.showInMenu !== false && c.menuLocation !== 'hidden')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const mainCategories: CmsCategory[] = [];
  const moreCategories: CmsCategory[] = [];

  orderedCats.forEach((cat, idx) => {
    const loc = cat.menuLocation || (idx < 6 ? 'main' : 'more');
    if (loc === 'main') {
      mainCategories.push(cat);
    } else if (loc === 'more') {
      moreCategories.push(cat);
    }
  });

  const orderedPortals = [...(portalMenuItems && portalMenuItems.length > 0 ? portalMenuItems : DEFAULT_PORTAL_MENU_ITEMS)]
    .filter((item) => item.menuLocation !== 'hidden')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    mainCategories,
    moreCategories,
    mainPortalLinks: orderedPortals.filter((item) => item.menuLocation === 'main'),
    morePortalLinks: orderedPortals.filter((item) => item.menuLocation === 'more'),
  };
}

export function isExternalPaperSubmissionActive(conf?: Pick<Conference, 'submissionMode' | 'externalSubmissionUrl'> | null): boolean {
  if (!conf) return false;
  if (conf.submissionMode === 'closed') return false;
  const rawUrl = (conf.externalSubmissionUrl || '').trim();
  return /^https?:\/\//i.test(rawUrl);
}

export function computePlacementMetrics(stats: PlacementYearStat[]) {
  const eligible = stats.reduce((sum, s) => sum + Number(s.eligibleStudents || 0), 0);
  const placed = stats.reduce((sum, s) => sum + Number(s.placedStudents || 0), 0);
  const highest = Math.max(0, ...stats.map((s) => Number(s.highestPackageLpa || 0)));
  const avg =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + Number(s.averagePackageLpa || 0), 0) / stats.length
      : 0;
  const overallRate = eligible > 0 ? ((placed / eligible) * 100).toFixed(1) : '0.0';
  const rowsWithPct = stats.map((row) => ({
    ...row,
    placementRatePct:
      row.eligibleStudents > 0
        ? Number(((Number(row.placedStudents) / Number(row.eligibleStudents)) * 100).toFixed(1))
        : 0,
  }));
  return { eligible, placed, highest, avg: avg.toFixed(2), overallRate, rowsWithPct };
}

export function filterPlacementNotices(
  notices: PlacementNotice[] | undefined,
  category = 'All',
  query = '',
): PlacementNotice[] {
  const list = [...(notices || [])];
  const catNorm = category.trim().toLowerCase();
  const qNorm = query.trim().toLowerCase();
  return list
    .filter((n) => {
      if (catNorm && catNorm !== 'all' && (n.category || '').trim().toLowerCase() !== catNorm) {
        return false;
      }
      if (qNorm) {
        const hay = `${n.title} ${n.category} ${n.summary} ${n.noticeDate}`.toLowerCase();
        if (!hay.includes(qNorm)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
      if (pinDiff !== 0) return pinDiff;
      return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
    });
}

export function filterCongratulationsStories(
  stories: PlacementStory[] | undefined,
  entryType = 'All',
  query = '',
): PlacementStory[] {
  const list = [...(stories || [])];
  const typeNorm = entryType.trim().toLowerCase();
  const qNorm = query.trim().toLowerCase();
  return list
    .filter((s) => {
      const itemType = (s.entryType || 'Campus Placement').trim().toLowerCase();
      if (typeNorm && typeNorm !== 'all' && itemType !== typeNorm) {
        return false;
      }
      if (qNorm) {
        const hay = `${s.studentName} ${s.company} ${s.branch} ${s.packageLpa} ${s.roleOrAward || ''} ${s.headline || ''}`.toLowerCase();
        if (!hay.includes(qNorm)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const featDiff = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
      if (featDiff !== 0) return featDiff;
      return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
    });
}

/**
 * Non-destructive forward-compatible database schema upgrader.
 * Guarantees ZERO data loss on code updates, design changes, feature additions,
 * or older backup restores: preserves all user records, pages, uploads, and credentials
 * while backfilling only missing collections or newly introduced settings defaults.
 */
export function migrateDatabaseInPlace(
  existing: Partial<CmsDatabase>,
  seed: CmsDatabase,
): { db: CmsDatabase; upgraded: boolean } {
  let upgraded = false;
  const currentVersion = typeof existing.schemaVersion === 'number' ? existing.schemaVersion : 1;
  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    upgraded = true;
  }

  const rawConferences: Conference[] = Array.isArray(existing.conferences)
    ? existing.conferences
    : ((upgraded = true), structuredClone(seed.conferences || []));

  const conferences: Conference[] = rawConferences.map((conf) => {
    const seedMatch = (seed.conferences || []).find((sc) => sc.id === conf.id || sc.slug === conf.slug);
    let nextConf = conf;
    if (!Array.isArray(conf.heroSlides) || conf.heroSlides.length === 0) {
      upgraded = true;
      nextConf = {
        ...nextConf,
        heroSlides: seedMatch?.heroSlides
          ? structuredClone(seedMatch.heroSlides)
          : [
              {
                id: 1,
                title: `${conf.shortName}: ${conf.title}`,
                caption: conf.theme || `${conf.scope} · ${conf.venue}`,
                imageUrl: conf.bannerUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
                ctaLabel: 'Explore Tracks & Submit Paper',
                ctaLink: `/conference/${conf.slug}`,
              },
            ],
      };
    }
    if (
      nextConf.enablePosterPresentation === undefined ||
      (!Array.isArray(nextConf.posterItems) && seedMatch?.posterItems)
    ) {
      upgraded = true;
      nextConf = {
        ...nextConf,
        enablePosterPresentation: nextConf.enablePosterPresentation ?? seedMatch?.enablePosterPresentation ?? true,
        posterDimensions: nextConf.posterDimensions || seedMatch?.posterDimensions || 'A0 Portrait (841 x 1189 mm)',
        posterGuidelinesHtml:
          nextConf.posterGuidelinesHtml ??
          seedMatch?.posterGuidelinesHtml ??
          '<p>Authors presenting in the Poster Presentation track should prepare an A0 vertical poster (841 &times; 1189 mm) covering problem statement, methodology, experimental results, and key takeaways.</p>',
        posterTemplateUrl: nextConf.posterTemplateUrl ?? seedMatch?.posterTemplateUrl ?? '',
        posterPrizesText:
          nextConf.posterPrizesText ??
          seedMatch?.posterPrizesText ??
          'Best Poster Awards & Certificates per Track',
        posterItems: Array.isArray(nextConf.posterItems)
          ? nextConf.posterItems
          : structuredClone(seedMatch?.posterItems || []),
      };
    }
    return nextConf;
  });

  const conferenceSubmissions: ConferenceSubmission[] = Array.isArray(existing.conferenceSubmissions)
    ? existing.conferenceSubmissions
    : ((upgraded = true), structuredClone(seed.conferenceSubmissions || []));

  const conferenceRegistrations: ConferenceRegistration[] = Array.isArray(existing.conferenceRegistrations)
    ? existing.conferenceRegistrations
    : ((upgraded = true), structuredClone(seed.conferenceRegistrations || []));

  const placements: PlacementsData =
    existing.placements && Array.isArray(existing.placements.stats)
      ? existing.placements
      : ((upgraded = true), structuredClone(seed.placements || {
          summaryNote: '',
          coordinatorName: 'Dr. S. B. Kulkarni',
          coordinatorEmail: 'tnp@coe.sveri.ac.in',
          coordinatorPhone: '+91-02186-216063',
          stats: [],
          stories: [],
        }));

  const grievances: GrievanceTicket[] = Array.isArray(existing.grievances)
    ? existing.grievances
    : ((upgraded = true), structuredClone(seed.grievances || []));

  const existingAlumni = existing.alumni || seed.alumni;
  const alumniAchievers = existingAlumni && Array.isArray(existingAlumni.achievers)
    ? existingAlumni.achievers
    : ((upgraded = true), structuredClone(seed.alumni?.achievers || []));
  const alumniPledges: AlumniEndowmentPledge[] = existingAlumni && Array.isArray(existingAlumni.pledges)
    ? existingAlumni.pledges
    : ((upgraded = true), structuredClone(seed.alumni?.pledges || []));

  const rawCategories = Array.isArray(existing.categories) ? existing.categories : seed.categories;
  const categories = rawCategories.map((cat, idx) => ({
    ...cat,
    menuLocation:
      cat.menuLocation ||
      (cat.showInMenu === false ? 'hidden' : idx < 6 ? 'main' : 'more'),
  }));

  const basePortalItems =
    Array.isArray(existing.settings?.portalMenuItems) && existing.settings.portalMenuItems.length > 0
      ? [...existing.settings.portalMenuItems]
      : structuredClone(seed.settings.portalMenuItems || DEFAULT_PORTAL_MENU_ITEMS);
  const existingPortalUrls = new Set(basePortalItems.map((p) => (p.url || '').trim().toLowerCase()));
  for (const defItem of DEFAULT_PORTAL_MENU_ITEMS) {
    if (!existingPortalUrls.has(defItem.url.trim().toLowerCase())) {
      basePortalItems.push(structuredClone(defItem));
      upgraded = true;
    }
  }
  const mergedPortalMenuItems = basePortalItems;

  const mergedGrievancePortal: GrievancePortalConfig = {
    ...DEFAULT_GRIEVANCE_PORTAL_CONFIG,
    ...(seed.settings.grievancePortal || {}),
    ...(existing.settings?.grievancePortal || {}),
    committeeMembers:
      Array.isArray(existing.settings?.grievancePortal?.committeeMembers) &&
      existing.settings.grievancePortal.committeeMembers.length > 0
        ? existing.settings.grievancePortal.committeeMembers
        : structuredClone(
            seed.settings.grievancePortal?.committeeMembers ||
              DEFAULT_GRIEVANCE_PORTAL_CONFIG.committeeMembers,
          ),
  };

  const mergedIntakePrograms =
    Array.isArray(existing.settings?.intakePrograms) && existing.settings.intakePrograms.length > 0
      ? existing.settings.intakePrograms
      : structuredClone(seed.settings.intakePrograms || DEFAULT_INTAKE_PROGRAMS);

  const rawStories = Array.isArray(placements.stories)
    ? placements.stories
    : ((upgraded = true), structuredClone(seed.placements?.stories || []));
  const normalizedStories = rawStories.map((st) => {
    if (st.entryType && st.headline !== undefined && st.roleOrAward !== undefined) {
      return st;
    }
    upgraded = true;
    return {
      ...st,
      entryType: st.entryType || 'Campus Placement',
      headline: st.headline ?? `${st.company} — ${st.packageLpa}`,
      roleOrAward: st.roleOrAward || 'Selected Scholar',
      isFeatured: st.isFeatured ?? true,
    };
  });

  const mergedPlacements: PlacementsData = {
    ...placements,
    stories: normalizedStories,
    brochureUrl: placements.brochureUrl ?? seed.placements?.brochureUrl ?? '',
    brochureLabel: placements.brochureLabel ?? seed.placements?.brochureLabel ?? 'Download Placement Brochure & Profile',
    upcomingDrives: Array.isArray(placements.upcomingDrives)
      ? placements.upcomingDrives
      : ((upgraded = true), structuredClone(seed.placements?.upcomingDrives || [])),
    notices: Array.isArray(placements.notices)
      ? placements.notices
      : ((upgraded = true), structuredClone(seed.placements?.notices || [])),
    customSections: Array.isArray(placements.customSections)
      ? placements.customSections
      : ((upgraded = true), structuredClone(seed.placements?.customSections || [])),
  };

  const mergedSettings = {
    ...seed.settings,
    ...(existing.settings || {}),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    designPreset: existing.settings?.designPreset || seed.settings.designPreset || 'heritage-navy',
    fontHeading: existing.settings?.fontHeading || seed.settings.fontHeading || "'Playfair Display', Georgia, serif",
    fontBody: existing.settings?.fontBody || seed.settings.fontBody || "'Plus Jakarta Sans', system-ui, sans-serif",
    cardRadius: existing.settings?.cardRadius || seed.settings.cardRadius || 'rounded',
    headerStyle: existing.settings?.headerStyle || seed.settings.headerStyle || 'classic',
    researchSliderSlides:
      Array.isArray(existing.settings?.researchSliderSlides) && existing.settings.researchSliderSlides.length > 0
        ? existing.settings.researchSliderSlides
        : structuredClone(seed.settings.researchSliderSlides || []),
    portalMenuItems: mergedPortalMenuItems,
    grievancePortal: mergedGrievancePortal,
    intakePrograms: mergedIntakePrograms,
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
      ...(seed.settings.homeSections || {}),
      ...(existing.settings?.homeSections || {}),
    },
    customHomeComponents:
      existing.settings?.customHomeComponents ?? seed.settings.customHomeComponents ?? [],
  };

  const mergedSeo: SeoSettings = {
    ...DEFAULT_SEO_SETTINGS,
    ...(seed.seo || {}),
    ...(existing.seo || {}),
    pageOverrides: Array.isArray(existing.seo?.pageOverrides)
      ? existing.seo.pageOverrides
      : structuredClone(seed.seo?.pageOverrides || DEFAULT_SEO_SETTINGS.pageOverrides),
  };
  if (!existing.seo) upgraded = true;

  const mergedHitCounter: HitCounterStats =
    existing.hitCounter && typeof existing.hitCounter.totalHits === 'number'
      ? {
          ...createSeedHitCounter(),
          ...existing.hitCounter,
          uniqueTodayHashes: Array.isArray(existing.hitCounter.uniqueTodayHashes)
            ? existing.hitCounter.uniqueTodayHashes
            : [],
        }
      : ((upgraded = true), structuredClone(seed.hitCounter || createSeedHitCounter()));

  const visitorLogs: VisitorLogEntry[] = Array.isArray(existing.visitorLogs)
    ? existing.visitorLogs
    : ((upgraded = true), structuredClone(seed.visitorLogs || createSeedVisitorLogs()));

  const blockedIps: BlockedIpEntry[] = Array.isArray(existing.blockedIps)
    ? existing.blockedIps
    : ((upgraded = true), structuredClone(seed.blockedIps || []));

  const mergedSecurityConfig: SecurityConfig = {
    ...DEFAULT_SECURITY_CONFIG,
    ...(seed.securityConfig || {}),
    ...(existing.securityConfig || {}),
  };
  if (!existing.securityConfig) upgraded = true;

  const mergedSports: SportsData =
    existing.sports && Array.isArray(existing.sports.facilities)
      ? {
          config: existing.sports.config || structuredClone(seed.sports!.config),
          facilities: existing.sports.facilities,
          events: Array.isArray(existing.sports.events) ? existing.sports.events : [],
          achievements: Array.isArray(existing.sports.achievements) ? existing.sports.achievements : [],
          gallery: Array.isArray(existing.sports.gallery) ? existing.sports.gallery : [],
          notices: Array.isArray(existing.sports.notices) ? existing.sports.notices : [],
        }
      : ((upgraded = true), structuredClone(seed.sports!));

  const mergedFacilities: FacilitiesData =
    existing.facilities && Array.isArray(existing.facilities.items)
      ? {
          config: existing.facilities.config || structuredClone(seed.facilities!.config),
          items: existing.facilities.items,
        }
      : ((upgraded = true), structuredClone(seed.facilities!));

  const mergedDb: CmsDatabase = {
    ...seed,
    ...existing,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    categories,
    conferences,
    conferenceSubmissions,
    conferenceRegistrations,
    placements: mergedPlacements,
    sports: mergedSports,
    facilities: mergedFacilities,
    grievances,
    alumni: existingAlumni
      ? {
          ...existingAlumni,
          achievers: alumniAchievers,
          pledges: alumniPledges,
        }
      : seed.alumni,
    settings: mergedSettings,
    seo: mergedSeo,
    hitCounter: mergedHitCounter,
    visitorLogs,
    blockedIps,
    securityConfig: mergedSecurityConfig,
  };

  return { db: mergedDb, upgraded };
}
