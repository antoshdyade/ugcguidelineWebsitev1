import type {
  AlumniEndowmentPledge,
  CmsDatabase,
  Conference,
  ConferenceRegistration,
  ConferenceSubmission,
  GrievanceTicket,
  PlacementsData,
} from '../types/cms';

export const CURRENT_SCHEMA_VERSION = 3;

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
  'Patent & IPR Clinic',
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
    if (Array.isArray(conf.heroSlides) && conf.heroSlides.length > 0) {
      return conf;
    }
    const seedMatch = (seed.conferences || []).find((sc) => sc.id === conf.id || sc.slug === conf.slug);
    upgraded = true;
    return {
      ...conf,
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

  const mergedDb: CmsDatabase = {
    ...seed,
    ...existing,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    conferences,
    conferenceSubmissions,
    conferenceRegistrations,
    placements,
    grievances,
    alumni: existingAlumni
      ? {
          ...existingAlumni,
          achievers: alumniAchievers,
          pledges: alumniPledges,
        }
      : seed.alumni,
    settings: mergedSettings,
  };

  return { db: mergedDb, upgraded };
}
