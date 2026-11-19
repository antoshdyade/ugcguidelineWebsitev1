import type {
  AlumniEndowmentPledge,
  BlockedIpEntry,
  CmsCategory,
  CmsDatabase,
  Conference,
  ConferenceRegistration,
  ConferenceSubmission,
  EmailDispatchLogEntry,
  EmailPushConfig,
  FeedbackEntry,
  FeedbackSectionConfig,
  GrievancePortalConfig,
  GrievanceTicket,
  HeaderPortalMenuItem,
  HitCounterStats,
  PlacementsData,
  PlacementNotice,
  PlacementStory,
  PlacementYearStat,
  ResearchPatentItem,
  ResearchPortfolioData,
  ResearchProjectItem,
  SanctionedIntakeProgram,
  SecurityConfig,
  SeoSettings,
  SiteSettings,
  SocialMediaLink,
  SocialSharingConfig,
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

export const CURRENT_SCHEMA_VERSION = 9;

export const SOCIAL_PLATFORM_PRESETS: { value: string; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'whatsapp', label: 'WhatsApp Channel' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'github', label: 'GitHub' },
  { value: 'custom', label: 'Custom Platform' },
];

export const DEFAULT_SOCIAL_MEDIA_LINKS: SocialMediaLink[] = [
  { id: 1, platform: 'facebook', label: 'Facebook', url: 'https://facebook.com', handle: '@svcoer', isActive: true, sortOrder: 1 },
  { id: 2, platform: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com', handle: 'svcoer-pandharpur', isActive: true, sortOrder: 2 },
  { id: 3, platform: 'instagram', label: 'Instagram', url: 'https://instagram.com', handle: '@svcoer_official', isActive: true, sortOrder: 3 },
  { id: 4, platform: 'youtube', label: 'YouTube', url: 'https://youtube.com', handle: '@svcoer_edu', isActive: true, sortOrder: 4 },
  { id: 5, platform: 'twitter', label: 'X (Twitter)', url: 'https://x.com', handle: '@svcoer_edu', isActive: true, sortOrder: 5 },
];

export const DEFAULT_SOCIAL_SHARING_CONFIG: SocialSharingConfig = {
  enabled: true,
  showIconsInHeader: true,
  showIconsInFooter: true,
  showOnPages: true,
  showOnResearch: true,
  showOnConferences: true,
  showOnPortals: true,
  shareHeading: 'Share this update',
  defaultHashtags: 'SVCOER,SVERI,Engineering,NEP2020,Pandharpur',
  twitterHandle: 'svcoer_edu',
  platforms: {
    whatsapp: true,
    linkedin: true,
    twitter: true,
    facebook: true,
    telegram: true,
    email: true,
    copyLink: true,
    nativeShare: true,
  },
};

export const RESEARCH_AGENCY_PRESETS = [
  'DST-SERB (Govt. of India)',
  'AICTE-MODROBS / RPS',
  'MSME Design Clinic',
  'DRDO / ISRO Extramural',
  'RGSTC Maharashtra',
  'AICTE IDEA Lab Grant',
  'Industry Sponsored R&D',
] as const;

export const RESEARCH_PATENT_TYPE_PRESETS = [
  'Journal / Conference Publication',
  'Patent Granted',
  'Patent Published',
  'Patent Filed',
  'Copyright / Design',
  'Industry / Academic MoU',
  'Incubated Start-up',
  'Industry Consultancy',
] as const;

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
  { id: 9, label: 'Complaint & Feedback', url: '/feedback', menuLocation: 'more', sortOrder: 9 },
];

export const FEEDBACK_SUBMISSION_TYPE_PRESETS = [
  'Complaint',
  'Feedback',
  'Suggestion',
  'Appreciation',
] as const;

export const DEFAULT_FEEDBACK_SECTIONS: FeedbackSectionConfig[] = [
  {
    id: 1,
    slug: 'academics',
    sectionName: 'Academics & Classroom Teaching',
    subsections: ['Curriculum & OBE Syllabus', 'Faculty Teaching & Mentoring', 'Laboratory Equipment & Practicals', 'Academic Timetable & Workload'],
    recipientEmails: 'dean.academics@coe.sveri.ac.in, principal@coe.sveri.ac.in',
    ccEmails: 'iqac@coe.sveri.ac.in',
    inchargeName: 'Dr. S. B. Kulkarni (Dean Academics)',
    inchargeDesignation: 'Dean Academics & IQAC',
    slaDays: 5,
    autoEmailEnabled: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 2,
    slug: 'examination',
    sectionName: 'Examination & Evaluation Cell',
    subsections: ['Exam Form & Hall Ticket', 'Result & Grade Card Verification', 'Photocopy / Revaluation', 'Transcripts & Migration'],
    recipientEmails: 'coe@coe.sveri.ac.in',
    ccEmails: 'principal@coe.sveri.ac.in',
    inchargeName: 'Dr. R. B. Patwardhan (Controller of Examinations)',
    inchargeDesignation: 'Autonomous Examination Cell',
    slaDays: 4,
    autoEmailEnabled: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 3,
    slug: 'infrastructure',
    sectionName: 'Infrastructure & Campus Maintenance',
    subsections: ['Classroom & Auditorium Facilities', 'Power Supply, AC & Lighting', 'Cleanliness & Restrooms', 'Campus Security & Parking'],
    recipientEmails: 'estate@coe.sveri.ac.in',
    ccEmails: 'registrar@coe.sveri.ac.in',
    inchargeName: 'Prof. S. D. Jadhav (Estate Officer)',
    inchargeDesignation: 'Campus Estate & Works',
    slaDays: 3,
    autoEmailEnabled: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 4,
    slug: 'hostel-mess',
    sectionName: 'Hostel, Mess & Health Centre',
    subsections: ['Boys / Girls Hostel Allotment & Rooms', 'Dining Mess Hygiene & Menu', 'Drinking Water & Solar Hot Water', 'Medical & Ambulance Support'],
    recipientEmails: 'hostel@coe.sveri.ac.in',
    ccEmails: 'antiragging@coe.sveri.ac.in',
    inchargeName: 'Dr. M. S. Kulkarni (Chief Rector)',
    inchargeDesignation: 'Hostel & Residential Care',
    slaDays: 2,
    autoEmailEnabled: true,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 5,
    slug: 'library-it',
    sectionName: 'Library, Wi-Fi & IT Services',
    subsections: ['Central Library & E-Journals', 'Campus Wi-Fi & Network Speed', 'ERP / LMS Account Access', 'Central Computing Lab'],
    recipientEmails: 'library@coe.sveri.ac.in, itadmin@coe.sveri.ac.in',
    ccEmails: '',
    inchargeName: 'Mrs. S. P. Joshi & Mr. R. K. Pawar',
    inchargeDesignation: 'Library & IT Systems',
    slaDays: 3,
    autoEmailEnabled: true,
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 6,
    slug: 'transport-canteen',
    sectionName: 'Transport & Campus Canteen',
    subsections: ['Bus Routes & Timings', 'Bus Pass & Safety', 'Canteen Food Quality & Pricing', 'On-Campus Stationery & Store'],
    recipientEmails: 'transport@coe.sveri.ac.in, estate@coe.sveri.ac.in',
    ccEmails: '',
    inchargeName: 'Mr. V. S. More (Transport Officer)',
    inchargeDesignation: 'Campus Transport & Hospitality',
    slaDays: 3,
    autoEmailEnabled: true,
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 7,
    slug: 'accounts-scholarship',
    sectionName: 'Accounts, Fees & Scholarships',
    subsections: ['Tuition Fee Receipt & Ledger', 'MahaDBT / EBC / Minority Scholarship', 'Caution Money Refund', 'Education Loan Bonafide Letter'],
    recipientEmails: 'accounts@coe.sveri.ac.in, registrar@coe.sveri.ac.in',
    ccEmails: '',
    inchargeName: 'Mr. A. P. Deshmukh (Accounts Officer)',
    inchargeDesignation: 'Finance & Scholarship Cell',
    slaDays: 5,
    autoEmailEnabled: true,
    isActive: true,
    sortOrder: 7,
  },
  {
    id: 8,
    slug: 'placement-alumni',
    sectionName: 'Training, Placement & Alumni Relations',
    subsections: ['Campus Recruitment Drives', 'Aptitude & Soft Skills Training', 'Industry Internship NOC', 'Alumni Networking & Mentorship'],
    recipientEmails: 'tnp@coe.sveri.ac.in, alumni@coe.sveri.ac.in',
    ccEmails: '',
    inchargeName: 'Dr. S. B. Kulkarni (Dean T&P)',
    inchargeDesignation: 'Training & Placement Cell',
    slaDays: 4,
    autoEmailEnabled: true,
    isActive: true,
    sortOrder: 8,
  },
];

export const DEFAULT_EMAIL_PUSH_CONFIG: EmailPushConfig = {
  enabled: true,
  transportMode: 'php_mail',
  fromName: "SVCOER Pandharpur (Autonomous) Portal",
  fromEmail: 'noreply@coe.sveri.ac.in',
  replyToEmail: 'principal@coe.sveri.ac.in',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpEncryption: 'tls',
  smtpUsername: '',
  smtpPassword: '',
  webhookRelayUrl: '',
  alertRecipientEmails: 'principal@coe.sveri.ac.in, itadmin@coe.sveri.ac.in',
  reportRecipientEmails: 'principal@coe.sveri.ac.in, iqac@coe.sveri.ac.in, itadmin@coe.sveri.ac.in',
  pushOnNewFeedback: true,
  pushOnNewGrievance: true,
  pushOnSecurityAlert: true,
  enableScheduledVisitorDigest: false,
  digestFrequency: 'daily',
  lastDigestSentAt: '',
};

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
    socialMediaLinks:
      Array.isArray(existing.settings?.socialMediaLinks)
        ? existing.settings.socialMediaLinks
        : structuredClone(seed.settings.socialMediaLinks || DEFAULT_SOCIAL_MEDIA_LINKS),
    socialSharing: normalizeSocialSharingConfig(existing.settings?.socialSharing || seed.settings.socialSharing),
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
  if (!existing.settings?.socialMediaLinks || !existing.settings?.socialSharing) {
    upgraded = true;
  }

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

  const mergedResearchPortfolio: ResearchPortfolioData =
    existing.researchPortfolio && Array.isArray(existing.researchPortfolio.projects)
      ? {
          config: existing.researchPortfolio.config || structuredClone(seed.researchPortfolio!.config),
          projects: existing.researchPortfolio.projects,
          patents: Array.isArray(existing.researchPortfolio.patents)
            ? existing.researchPortfolio.patents
            : structuredClone(seed.researchPortfolio!.patents),
        }
      : ((upgraded = true), structuredClone(seed.researchPortfolio!));

  const feedbackSections: FeedbackSectionConfig[] = Array.isArray(existing.feedbackSections)
    ? existing.feedbackSections
    : ((upgraded = true), structuredClone(seed.feedbackSections || DEFAULT_FEEDBACK_SECTIONS));

  const feedbackEntries: FeedbackEntry[] = Array.isArray(existing.feedbackEntries)
    ? existing.feedbackEntries
    : ((upgraded = true), structuredClone(seed.feedbackEntries || []));

  const emailPushConfig: EmailPushConfig = existing.emailPushConfig
    ? {
        ...DEFAULT_EMAIL_PUSH_CONFIG,
        ...(seed.emailPushConfig || {}),
        ...existing.emailPushConfig,
      }
    : ((upgraded = true), structuredClone(seed.emailPushConfig || DEFAULT_EMAIL_PUSH_CONFIG));

  const emailDispatchLogs: EmailDispatchLogEntry[] = Array.isArray(existing.emailDispatchLogs)
    ? existing.emailDispatchLogs
    : ((upgraded = true), structuredClone(seed.emailDispatchLogs || []));

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
    researchPortfolio: mergedResearchPortfolio,
    grievances,
    feedbackSections,
    feedbackEntries,
    emailPushConfig,
    emailDispatchLogs,
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

export function normalizeSocialSharingConfig(cfg?: Partial<SocialSharingConfig>): SocialSharingConfig {
  return {
    ...DEFAULT_SOCIAL_SHARING_CONFIG,
    ...(cfg || {}),
    platforms: {
      ...DEFAULT_SOCIAL_SHARING_CONFIG.platforms,
      ...(cfg?.platforms || {}),
    },
  };
}

export function getActiveSocialLinks(settings?: Partial<SiteSettings>): SocialMediaLink[] {
  if (Array.isArray(settings?.socialMediaLinks)) {
    return [...settings.socialMediaLinks]
      .filter((item) => item.isActive !== false && Boolean(String(item.url || '').trim()))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  }
  const legacy = settings?.socialLinks;
  if (!legacy) return DEFAULT_SOCIAL_MEDIA_LINKS.filter((item) => item.isActive);
  const mapped: SocialMediaLink[] = [
    { id: 1, platform: 'facebook', label: 'Facebook', url: legacy.facebook || '', isActive: Boolean(legacy.facebook), sortOrder: 1 },
    { id: 2, platform: 'linkedin', label: 'LinkedIn', url: legacy.linkedin || '', isActive: Boolean(legacy.linkedin), sortOrder: 2 },
    { id: 3, platform: 'youtube', label: 'YouTube', url: legacy.youtube || '', isActive: Boolean(legacy.youtube), sortOrder: 3 },
    { id: 4, platform: 'twitter', label: 'X (Twitter)', url: legacy.twitter || '', isActive: Boolean(legacy.twitter), sortOrder: 4 },
  ];
  return mapped.filter((item) => item.isActive);
}

export function syncLegacySocialLinks(links: SocialMediaLink[]): SiteSettings['socialLinks'] {
  const findUrl = (platform: string) =>
    links.find((l) => l.platform === platform && l.isActive !== false && l.url.trim())?.url.trim() || '';
  return {
    facebook: findUrl('facebook'),
    linkedin: findUrl('linkedin'),
    youtube: findUrl('youtube'),
    twitter: findUrl('twitter'),
  };
}

export function buildSocialShareUrls(params: {
  url: string;
  title: string;
  summary?: string;
  hashtags?: string;
  via?: string;
}) {
  const cleanUrl = (params.url || '').trim();
  const cleanTitle = (params.title || '').trim();
  const cleanSummary = (params.summary || '').trim();
  const tagList = (params.hashtags || '')
    .split(',')
    .map((t) => t.trim().replace(/^#+/, '').replace(/\s+/g, ''))
    .filter(Boolean);
  const hashLine = tagList.map((t) => `#${t}`).join(' ');
  const combinedText = [cleanTitle, cleanSummary].filter(Boolean).join(' — ');
  const encodedUrl = encodeURIComponent(cleanUrl);
  const encodedTitle = encodeURIComponent(cleanTitle);
  const encodedWhatsapp = encodeURIComponent([combinedText, cleanUrl, hashLine].filter(Boolean).join('\n\n'));
  const encodedTweet = encodeURIComponent(cleanTitle + (cleanSummary ? `: ${cleanSummary.slice(0, 120)}` : ''));
  const xParams = new URLSearchParams({ text: cleanTitle + (cleanSummary ? ` — ${cleanSummary.slice(0, 120)}` : ''), url: cleanUrl });
  if (tagList.length > 0) xParams.set('hashtags', tagList.slice(0, 5).join(','));
  if (params.via && params.via.trim()) xParams.set('via', params.via.trim().replace(/^@/, ''));

  const mailSubject = encodeURIComponent(cleanTitle);
  const mailBody = encodeURIComponent([cleanTitle, cleanSummary, cleanUrl].filter(Boolean).join('\n\n'));

  return {
    whatsapp: `https://wa.me/?text=${encodedWhatsapp}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?${xParams.toString()}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTweet}`,
    email: `mailto:?subject=${mailSubject}&body=${mailBody}`,
    formattedPost: [cleanTitle, cleanSummary, cleanUrl, hashLine].filter(Boolean).join('\n\n'),
    encodedTitle,
  };
}

export function filterResearchProjects(
  projects: ResearchProjectItem[],
  statusFilter: string,
  agencyFilter: string,
  query: string,
): ResearchProjectItem[] {
  const q = query.trim().toLowerCase();
  return [...projects]
    .filter((p) => {
      if (statusFilter && statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (agencyFilter && agencyFilter !== 'All' && p.fundingAgency !== agencyFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.fundingAgency.toLowerCase().includes(q) ||
        p.principalInvestigator.toLowerCase().includes(q) ||
        (p.coInvestigator || '').toLowerCase().includes(q) ||
        p.departmentCode.toLowerCase().includes(q) ||
        (p.projectCode || '').toLowerCase().includes(q) ||
        (p.summary || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
}

export function filterResearchPatents(
  patents: ResearchPatentItem[],
  typeFilter: string,
  query: string,
  yearFilter = 'All',
): ResearchPatentItem[] {
  const q = query.trim().toLowerCase();
  const yr = (yearFilter || 'All').trim();
  return [...patents]
    .filter((item) => {
      if (typeFilter && typeFilter !== 'All' && item.itemType !== typeFilter) return false;
      if (yr && yr !== 'All' && !(item.filingOrGrantDate || '').startsWith(yr)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.itemType.toLowerCase().includes(q) ||
        item.inventorsOrLead.toLowerCase().includes(q) ||
        item.departmentCode.toLowerCase().includes(q) ||
        item.referenceNumber.toLowerCase().includes(q) ||
        (item.partnerOrAgency || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
}

export function validateFeedbackInput(input: {
  senderName?: string;
  senderEmail?: string;
  sectionSlug?: string;
  subsection?: string;
  subject?: string;
  message?: string;
  rating?: number;
}): { valid: boolean; reason?: string } {
  if ((input.senderName || '').trim().length < 2) {
    return { valid: false, reason: 'Sender full name is required (min 2 characters).' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((input.senderEmail || '').trim())) {
    return { valid: false, reason: 'A valid contact email address is required.' };
  }
  if (!(input.sectionSlug || '').trim()) {
    return { valid: false, reason: 'Please select a campus section or department.' };
  }
  if (!(input.subsection || '').trim()) {
    return { valid: false, reason: 'Please select or enter a specific subsection.' };
  }
  if ((input.subject || '').trim().length < 4) {
    return { valid: false, reason: 'Feedback subject must be at least 4 characters.' };
  }
  if ((input.message || '').trim().length < 15) {
    return { valid: false, reason: 'Detailed remarks must be at least 15 characters.' };
  }
  const rating = Number(input.rating ?? 5);
  if (Number.isNaN(rating) || rating < 1 || rating > 5) {
    return { valid: false, reason: 'Rating must be between 1 and 5 stars.' };
  }
  return { valid: true };
}

export function filterFeedbackEntries(
  entries: FeedbackEntry[],
  sectionFilter = 'All',
  typeFilter = 'All',
  statusFilter = 'All',
  query = '',
): FeedbackEntry[] {
  const q = query.trim().toLowerCase();
  return [...entries].filter((e) => {
    if (sectionFilter !== 'All' && e.sectionSlug !== sectionFilter) return false;
    if (typeFilter !== 'All' && e.submissionType !== typeFilter) return false;
    if (statusFilter !== 'All' && e.status !== statusFilter) return false;
    if (!q) return true;
    const hay = `${e.ticketCode} ${e.subject} ${e.message} ${e.senderName} ${e.senderEmail} ${e.sectionName} ${e.subsection}`.toLowerCase();
    return hay.includes(q);
  });
}

export function computeFeedbackMetrics(entries: FeedbackEntry[]) {
  const total = entries.length;
  const resolved = entries.filter((e) => e.status === 'resolved' || e.status === 'closed').length;
  const complaints = entries.filter((e) => e.submissionType === 'Complaint').length;
  const avgRating =
    total > 0
      ? Number((entries.reduce((sum, e) => sum + Number(e.rating || 0), 0) / total).toFixed(1))
      : 5.0;
  return {
    total,
    resolved,
    open: total - resolved,
    complaints,
    avgRating,
    resolutionRatePct: total > 0 ? Math.round((resolved / total) * 100) : 100,
  };
}
