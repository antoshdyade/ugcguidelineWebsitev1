import crypto from 'node:crypto';
import type { CmsDatabase } from '../types/cms';
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_GRIEVANCE_PORTAL_CONFIG,
  DEFAULT_INTAKE_PROGRAMS,
  DEFAULT_PORTAL_MENU_ITEMS,
} from '../lib/collegeFeaturesLogic';
import { buildCustomSliderHtml, buildPhotoProfileCardHtml, buildSinglePhotoProfileCardInnerHtml } from '../lib/editorBlocks';
import {
  DEFAULT_SECURITY_CONFIG,
  DEFAULT_SEO_SETTINGS,
  createSeedHitCounter,
  createSeedVisitorLogs,
} from '../lib/securityAndSeoLogic';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

const UGC_PDF_URL =
  '/assets/aistudio/7822003_GUIDELINES-ON-PUBLIC-SELF-DISCLOSURE-BY-HIGHER-EDUCATION-INSTITUTIONS_1ee4b0ce.pdf';

export function createSeedDatabase(): CmsDatabase {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    categories: [
      {
        id: 1,
        slug: 'about-hei',
        name: 'About HEI',
        shortLabel: 'About HEI',
        ugcCode: 'Section 5(a)',
        sortOrder: 1,
        showInMenu: true,
        showOnHome: true,
        description:
          'Institutional overview, Act & Statutes, IDP, Affiliating University, NAAC/NBA/NIRF status, UGC 2(f)/12B, Annual Reports & Audited Accounts.',
      },
      {
        id: 2,
        slug: 'administration',
        name: 'Administration',
        shortLabel: 'Administration',
        ugcCode: 'Section 5(b)',
        sortOrder: 2,
        showInMenu: true,
        showOnHome: true,
        description:
          'Statutory officers, Governing Body, Academic Council, Board of Studies, Finance Committee, ICC & Academic Leadership profiles.',
      },
      {
        id: 3,
        slug: 'academics',
        name: 'Academics',
        shortLabel: 'Academics',
        ugcCode: 'Section 5(c)',
        sortOrder: 3,
        showInMenu: true,
        showOnHome: true,
        description:
          'Academic Programs, Academic Calendar, OBE Curriculum, Department Microsites, Faculty Directory, IQAC, Central Library & Collaborations.',
      },
      {
        id: 9,
        slug: 'examination',
        name: 'Examination',
        shortLabel: 'Examination',
        ugcCode: 'Autonomous · CoE',
        sortOrder: 4,
        showInMenu: true,
        showOnHome: true,
        description:
          'Controller of Examinations, Autonomous Exam Ordinances, Time Tables, Results, Photocopy/Revaluation, ABC/NAD Verification & Convocation.',
      },
      {
        id: 4,
        slug: 'admissions-fee',
        name: 'Admissions & Fee',
        shortLabel: 'Admissions & Fee',
        ugcCode: 'Section 5(d)',
        sortOrder: 5,
        showInMenu: true,
        showOnHome: true,
        description:
          'Information Brochure / Prospectus, FRA Approved Fee Structure, DTE/CAP Admission Process, and UGC Fee Refund Policy.',
      },
      {
        id: 5,
        slug: 'research',
        name: 'Research',
        shortLabel: 'Research',
        ugcCode: 'Section 5(e)',
        sortOrder: 6,
        showInMenu: true,
        showOnHome: true,
        description:
          'Research & Development Cell, Funded Projects, Consultancy, Foreign & Industry Collaborations, Incubation Centre & Central Facilities.',
      },
      {
        id: 6,
        slug: 'student-life',
        name: 'Student Life & Cells',
        shortLabel: 'Student Life',
        ugcCode: 'Section 5(f)',
        sortOrder: 7,
        showInMenu: true,
        showOnHome: true,
        description:
          'Sports, NCC/NSS, Hostels, Training & Placement, SGRC, Health Centre, Anti-Ragging, Equal Opportunity, SEDG & Barrier-Free Campus.',
      },
      {
        id: 7,
        slug: 'alumni',
        name: 'Alumni',
        shortLabel: 'Alumni',
        ugcCode: 'Section 5(g)',
        sortOrder: 8,
        showInMenu: true,
        showOnHome: true,
        description: 'Registered Alumni Association, chapter events, portal registration & distinguished alumni.',
      },
      {
        id: 8,
        slug: 'information-corner',
        name: 'Information Corner',
        shortLabel: 'Info Corner',
        ugcCode: 'Section 5(h)',
        sortOrder: 9,
        showInMenu: true,
        showOnHome: true,
        description:
          'RTI CPIO/Appellate details, Circulars & Notices, Announcements, Newsletters, Events, Job Openings, Reservation Roster & Study in India.',
      },
    ],

    pages: [
      // 5(a) About HEI
      {
        id: 101,
        categorySlug: 'about-hei',
        slug: 'about-overview',
        title: 'About Us: Institutional Overview',
        subtitle: 'UGC Section 5(a) · Vision, Mission & Heritage since 1998',
        contentHtml: `
          <h2>Institutional Profile</h2>
          <p><strong>SVERI&rsquo;s College of Engineering, Pandharpur (Autonomous)</strong> is a premier engineering institute established in <strong>1998</strong> under <strong>Shri Vitthal Education &amp; Research Institute (SVERI)</strong>. Conferred <strong>UGC Autonomous Status from Academic Year 2024&ndash;25</strong> and affiliated to <strong>Punyashlok Ahilyadevi Holkar Solapur University, Solapur</strong>, the institute offers AICTE-approved Undergraduate (B.Tech), Postgraduate (M.Tech, MBA, MCA), and Doctoral (Ph.D.) programs.</p>
          <table class="cms-table cms-table-navy">
            <thead><tr><th>Particulars</th><th>Institutional Record</th></tr></thead>
            <tbody>
              <tr><td>Name of Institution</td><td>SVERI&rsquo;s College of Engineering, Pandharpur (Autonomous)</td></tr>
              <tr><td>Sponsoring Trust</td><td>Shri Vitthal Education &amp; Research Institute (SVERI)</td></tr>
              <tr><td>Year of Establishment</td><td>1998 (Autonomous Status effective AY 2024&ndash;25)</td></tr>
              <tr><td>Affiliating University</td><td>Punyashlok Ahilyadevi Holkar Solapur University, Solapur</td></tr>
              <tr><td>DTE Institute Code</td><td>06220 (Maharashtra State CET Cell)</td></tr>
              <tr><td>NAAC Accreditation</td><td>Grade &lsquo;A+&rsquo; (CGPA 3.46 / 4.00)</td></tr>
              <tr><td>Contact &amp; Address</td><td>Gopalpur-Ranjani Road, P.B. No. 54, Gopalpur, Pandharpur &ndash; 413304 · +91-02186-216063</td></tr>
            </tbody>
          </table>
          <h3>Vision &amp; Mission</h3>
          <p><strong>Vision:</strong> To be nationally recognized among the best institutes in India for excellence in technical education.</p>
          <ul>
            <li>To impart value-based technical education through innovation and excellence, empowering individuals to become leaders in their fields to create a positive impact.</li>
            <li>To create an ambiance of academic excellence, research, and life skills by fostering a learning environment that empowers individuals to achieve their full potential.</li>
            <li>To foster strong relationships amongst all stakeholders by inculcating a personal touch and mutual respect in all interactions.</li>
          </ul>
        `,
        attachedPdfUrl: UGC_PDF_URL,
        attachedPdfLabel: 'UGC Guidelines on Public Self-Disclosure (NEP 2020)',
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-10-15',
        updatedBy: 'Super Admin',
      },
      {
        id: 102,
        categorySlug: 'about-hei',
        slug: 'act-statutes-moa',
        title: 'Act, Statutes & Memorandum of Association (MoA)',
        subtitle: 'UGC Section 5(a) · Trust Deed, Autonomous Statutes & Governance Charter',
        contentHtml: `
          <h2>Statutory Governance Instruments</h2>
          <p>SVCOER operates under the Public Trust Registration Act (Reg. No. F-4182/Solapur) and functions as an Autonomous Institution governed by the UGC (Conferment of Autonomous Status upon Colleges and Measures for Maintenance of Standards in Autonomous Colleges) Regulations, 2023 and Maharashtra Public Universities Act, 2016.</p>
          <ul>
            <li>Memorandum of Association &amp; Trust Constitution (Amended 2022)</li>
            <li>First Statutes for Autonomous Academic &amp; Examination Governance</li>
            <li>Service Rules &amp; Code of Professional Ethics for Faculty and Staff</li>
          </ul>
        `,
        attachedPdfUrl: UGC_PDF_URL,
        attachedPdfLabel: 'Download Autonomous Statutes & MoA Charter',
        isPublished: true,
        sortOrder: 2,
        updatedAt: '2026-10-10',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 103,
        categorySlug: 'about-hei',
        slug: 'institutional-development-plan',
        title: 'Institutional Development Plan (IDP 2025–2035)',
        subtitle: 'UGC Section 5(a) · NEP 2020 Strategic Roadmap & Multi-Disciplinary Expansion',
        contentHtml: `
          <h2>Strategic Priorities (NEP 2020 Aligned)</h2>
          <p>The Institutional Development Plan (IDP) charts a 10-year trajectory across academic flexibility (Academic Bank of Credits, Multiple Entry-Exit), research commercialization, industry-embedded Centers of Excellence, and 100% digital governance.</p>
          <table>
            <thead><tr><th>Strategic Pillar</th><th>2026–2028 Milestone</th><th>2029–2035 Target</th></tr></thead>
            <tbody>
              <tr><td>Academic Flexibility</td><td>100% NEP 2020 Honours &amp; Minor Degrees</td><td>Cross-disciplinary School of Computing &amp; Sustainability</td></tr>
              <tr><td>Research &amp; Patents</td><td>50+ Published Patents / Yr</td><td>INR 12 Cr Sponsored R&amp;D Corpus</td></tr>
              <tr><td>Global Immersion</td><td>10 International MoUs</td><td>Joint Dual-Degree &amp; Study in India Cohort (150+ seats)</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 3,
        updatedAt: '2026-09-22',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 104,
        categorySlug: 'about-hei',
        slug: 'affiliating-university',
        title: 'Constituent Units & Affiliating University',
        subtitle: 'UGC Section 5(a) · University Affiliation & Campus Units',
        contentHtml: `
          <h2>Affiliating University</h2>
          <p>All undergraduate, postgraduate, and doctoral degrees are awarded by <strong>Punyashlok Ahilyadevi Holkar Solapur University (PAHSUS), Solapur</strong>, with autonomous curriculum design, continuous internal assessment, and end-semester examinations conducted by SVCOER.</p>
          <h2>Sister &amp; Constituent Academic Units</h2>
          <ul>
            <li>Shri Vithal College of Engineering &amp; Research (Autonomous), Pandharpur — Main Campus</li>
            <li>SVCOER Polytechnic Wing (Diploma in Engineering — MSBTE Affiliated)</li>
            <li>Centre for Executive Management &amp; Innovation Studies (CEMIS)</li>
          </ul>
        `,
        isPublished: true,
        sortOrder: 4,
        updatedAt: '2026-08-18',
        updatedBy: 'Super Admin',
      },
      {
        id: 105,
        categorySlug: 'about-hei',
        slug: 'accreditation-ranking',
        title: 'Accreditation & Ranking Status (NAAC, NBA, NIRF)',
        subtitle: 'UGC Section 5(a) · Quality Benchmarks & National Rankings',
        contentHtml: `
          <h2>National Accreditation &amp; Ranking Scorecard</h2>
          <table>
            <thead><tr><th>Agency</th><th>Program / Scope</th><th>Status / Grade</th><th>Validity Period</th></tr></thead>
            <tbody>
              <tr><td>NAAC</td><td>Institutional Accreditation</td><td>A+ Grade (CGPA 3.46 / 4.00)</td><td>Active</td></tr>
              <tr><td>NBA</td><td>Core B.Tech Engineering Programs</td><td>Accredited</td><td>Active</td></tr>
              <tr><td>NIRF</td><td>Engineering Category</td><td>Ranked (151–200 Band)</td><td>Active</td></tr>
              <tr><td>UGC Autonomy</td><td>Autonomous Institute (PAHSUS Solapur)</td><td>Conferred from AY 2024–25</td><td>Active</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 5,
        updatedAt: '2026-10-02',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 106,
        categorySlug: 'about-hei',
        slug: 'recognition-approval',
        title: 'Recognition & Regulatory Approvals (UGC 2(f), 12B, AICTE)',
        subtitle: 'UGC Section 5(a) · Statutory Extensions of Approval',
        contentHtml: `
          <h2>Regulatory Approvals</h2>
          <p>SVERI&rsquo;s College of Engineering, Pandharpur holds continuous statutory approvals from all apex regulatory bodies:</p>
          <ul>
            <li><strong>UGC 2(f), 12(B) &amp; Autonomous Status:</strong> Conferred Autonomous Status effective from AY 2024&ndash;25 under Punyashlok Ahilyadevi Holkar Solapur University, Solapur.</li>
            <li><strong>AICTE Approval:</strong> Approved by All India Council for Technical Education (AICTE), New Delhi (Permanent ID: 1-49281724).</li>
            <li><strong>Government of Maharashtra &amp; DTE:</strong> DTE Institute Code <strong>06220</strong>.</li>
          </ul>
        `,
        isPublished: true,
        sortOrder: 6,
        updatedAt: '2026-09-12',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 107,
        categorySlug: 'about-hei',
        slug: 'annual-reports',
        title: 'Annual Reports',
        subtitle: 'UGC Section 5(a) · Yearly Academic, Research & Governance Reports',
        contentHtml: `
          <h2>Published Institutional Annual Reports</h2>
          <p>In compliance with UGC Public Self-Disclosure norms, complete institutional annual reports detailing admissions, examination outcomes, faculty publications, placement records, and extension activities are published openly below:</p>
          <table>
            <thead><tr><th>Academic Year</th><th>Document Title</th><th>Approval Date</th></tr></thead>
            <tbody>
              <tr><td>2025–26</td><td>28th Institutional Annual Report (IQAC Verified)</td><td>2026-08-20</td></tr>
              <tr><td>2024–25</td><td>27th Institutional Annual Report</td><td>2025-08-18</td></tr>
              <tr><td>2023–24</td><td>26th Institutional Annual Report</td><td>2024-08-14</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 7,
        updatedAt: '2026-08-25',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 108,
        categorySlug: 'about-hei',
        slug: 'annual-accounts-audit',
        title: 'Annual Accounts & Statutory Audit Reports',
        subtitle: 'UGC Section 5(a) · Balance Sheet, Income & Expenditure, Receipts & Payments',
        contentHtml: `
          <h2>Audited Financial Statements</h2>
          <p>Summary of audited financial statements certified by Statutory Chartered Accountants for FY 2025–26:</p>
          <table>
            <thead><tr><th>Statement Component</th><th>FY 2025–26 (INR Lakhs)</th><th>FY 2024–25 (INR Lakhs)</th></tr></thead>
            <tbody>
              <tr><td>Total Tuition &amp; Academic Receipts</td><td>3,482.50</td><td>3,190.20</td></tr>
              <tr><td>Faculty &amp; Staff Remuneration</td><td>2,045.10</td><td>1,895.40</td></tr>
              <tr><td>Laboratory Modernization &amp; Library Capex</td><td>482.75</td><td>412.60</td></tr>
              <tr><td>Student Scholarships &amp; R&amp;D Seed Grants</td><td>164.20</td><td>142.80</td></tr>
            </tbody>
          </table>
          <p>Complete Balance Sheets, Income &amp; Expenditure Accounts, and Receipts &amp; Payments Schedules are accessible via the Quick Links Document Center.</p>
        `,
        isPublished: true,
        sortOrder: 8,
        updatedAt: '2026-09-30',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 109,
        categorySlug: 'about-hei',
        slug: 'sponsoring-body',
        title: 'Sponsoring Body Details',
        subtitle: 'UGC Section 5(a) · Shri Vitthal Education & Research Institute (SVERI)',
        contentHtml: `
          <h2>Shri Vitthal Education &amp; Research Institute (SVERI)</h2>
          <p>Established as a charitable educational trust, <strong>Shri Vitthal Education &amp; Research Institute (SVERI)</strong> founded its flagship Engineering College in 1998 to deliver accessible, high-calibre technical and management education rooted in innovation and ethics.</p>
          <p><strong>Registered Office:</strong> Gopalpur-Ranjani Road, P.B. No. 54, Gopalpur, Pandharpur &ndash; 413304, Dist. Solapur, Maharashtra · Tel: +91-02186-216063.</p>
        `,
        isPublished: true,
        sortOrder: 9,
        updatedAt: '2026-07-15',
        updatedBy: 'Super Admin',
      },

      // 5(b) Administration
      {
        id: 201,
        categorySlug: 'administration',
        slug: 'statutory-officers',
        title: 'Statutory Officers & Administrative Leadership',
        subtitle: 'UGC Section 5(b) · Profiles, Contact Particulars & Executive Responsibilities',
        contentHtml: `
          <h2>Key Institutional Officers</h2>
          <p>All statutory and executive leadership profiles—including Principal, Registrar, Finance Officer, Controller of Examinations, Chief Vigilance Officer, and Ombudsperson—are displayed in the Administration Directory below with verified institutional contact details.</p>
        `,
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-10-05',
        updatedBy: 'Super Admin',
      },
      {
        id: 202,
        categorySlug: 'administration',
        slug: 'governing-bodies',
        title: 'Governing Body, Academic Council, BoS & Finance Committee',
        subtitle: 'UGC Section 5(b) · Statutory Committee Compositions & Particulars',
        contentHtml: `
          <h2>Governing Body (Board of Governors) &amp; Committee Profiles</h2>
          <p>Click any profile card below inside the Visual HTML Editor to upload/crop its 1:1 photograph, edit contact particulars, or add additional committee members alongside.</p>
          <div class="cms-block cms-grid-2" data-block="photo-profile-card">
            ${buildSinglePhotoProfileCardInnerHtml({
              roleBadge: 'Governing Body · Chairperson',
              name: 'Hon. Shri D. B. Patil',
              designation: 'Chairman, SVERI Trust & Board of Governors',
              department: 'Governing Body',
              email: 'chairman@coe.sveri.ac.in',
              phone: '+91-02186-216063',
              bio: 'Visionary educationist guiding strategic autonomous growth, research infrastructure, and rural engineering empowerment.',
              photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            })}
            ${buildSinglePhotoProfileCardInnerHtml({
              roleBadge: 'Governing Body & Academic Council · Member Secretary',
              name: 'Dr. Prashant M. Pawar',
              designation: 'Principal & Professor (Ph.D., IIT Bombay)',
              department: 'Academic Council & Governing Body',
              email: 'principal@coe.sveri.ac.in',
              phone: '+91-02186-216063',
              bio: 'Ex-Officio Member Secretary steering NEP 2020 curriculum, Academic Council ordinances, and Finance Committee planning.',
              photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            })}
          </div>
          <table>
            <thead><tr><th>Member Name</th><th>Designation / Affiliation</th><th>Role in Committee</th></tr></thead>
            <tbody>
              <tr><td>Hon. Shri D. B. Patil</td><td>Chairman, SVERI Trust</td><td>Chairperson</td></tr>
              <tr><td>Dr. Prashant M. Pawar</td><td>Principal, SVCOER Pandharpur</td><td>Member Secretary (Ex-Officio)</td></tr>
              <tr><td>Prof. S. K. Deshmukh</td><td>UGC Nominee (IIT Bombay)</td><td>UGC Representative</td></tr>
              <tr><td>Dr. R. V. Kulkarni</td><td>State Govt. / DTE Nominee</td><td>Government Nominee</td></tr>
              <tr><td>Mr. A. M. Joshi</td><td>VP Engineering, Persistent Systems</td><td>Industry Expert</td></tr>
            </tbody>
          </table>
          <h2>Academic Council, Board of Studies (BoS) &amp; Finance Committee</h2>
          <p>Each Academic Department maintains an autonomous Board of Studies (BoS) comprising all faculty, two university nominees, two industry experts, and one alumni representative. The Finance Committee reviews annual budgets, FRA fee proposals, and statutory audit compliance quarterly.</p>
          ${buildPhotoProfileCardHtml({
            roleBadge: 'Finance Committee & BoS Representative',
            name: 'Prof. S. V. Kulkarni',
            designation: 'Dean Administration & Finance Officer',
            department: 'Finance Committee & Board of Studies',
            email: 'finance@coe.sveri.ac.in',
            phone: '+91-02186-216065',
            bio: 'Oversees institutional budget allocations, scholarship disbursements, FRA compliance, and departmental BoS grants.',
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            columns: 1,
          })}
        `,
        isPublished: true,
        sortOrder: 2,
        updatedAt: '2026-09-28',
        updatedBy: 'Super Admin',
      },
      {
        id: 203,
        categorySlug: 'administration',
        slug: 'internal-complaint-committee',
        title: 'Internal Complaint Committee (ICC)',
        subtitle: 'UGC Section 5(b) & 5(f) · POSH Act Compliance & Zero-Tolerance Mechanism',
        contentHtml: `
          <h2>Internal Complaint Committee (ICC)</h2>
          <p>Constituted under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 and UGC Regulations 2015:</p>
          <table>
            <thead><tr><th>Name</th><th>Designation</th><th>Role in ICC</th><th>Contact</th></tr></thead>
            <tbody>
              <tr><td>Dr. Meenakshi S. Pawar</td><td>Professor &amp; Dean Student Affairs</td><td>Presiding Officer</td><td>icc@svcoer.edu.in</td></tr>
              <tr><td>Prof. Snehal R. Jadhav</td><td>Associate Professor, E&amp;TC</td><td>Faculty Member</td><td>+91 2186 225088</td></tr>
              <tr><td>Adv. Vandana Kulkarni</td><td>District Legal Services Authority</td><td>External NGO / Legal Member</td><td>legal.icc@svcoer.edu.in</td></tr>
              <tr><td>Ms. Rutuja Bhosale</td><td>Final Year B.Tech CSE</td><td>Student Representative</td><td>icc.student@svcoer.edu.in</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 3,
        updatedAt: '2026-09-14',
        updatedBy: 'IQAC Officer',
      },

      // 5(c) Academics
      {
        id: 301,
        categorySlug: 'academics',
        slug: 'academic-programs',
        title: 'Details of Academic Programs (UG, PG & Ph.D.)',
        subtitle: 'UGC Section 5(c) · Sanctioned Intake, Duration & NEP 2020 Honours Tracks',
        contentHtml: `
          <h2>Academic Programs Offered (AY 2026–27)</h2>
          <table class="cms-table cms-table-navy">
            <thead><tr><th>Program Level</th><th>Discipline</th><th>Duration</th><th>Sanctioned Intake</th><th>Accreditation / Recognition</th></tr></thead>
            <tbody>
              <tr><td>B.Tech</td><td>Computer Science &amp; Engineering (CSE)</td><td>4 Years</td><td>180</td><td>NBA Accredited</td></tr>
              <tr><td>B.Tech</td><td>Electronics &amp; Telecommunication Engg. (E&amp;TC)</td><td>4 Years</td><td>120</td><td>NBA Accredited</td></tr>
              <tr><td>B.Tech</td><td>Mechanical Engineering</td><td>4 Years</td><td>120</td><td>NBA Accredited</td></tr>
              <tr><td>B.Tech</td><td>Civil Engineering</td><td>4 Years</td><td>120</td><td>NBA Accredited</td></tr>
              <tr><td>B.Tech</td><td>Electrical Engineering</td><td>4 Years</td><td>60</td><td>AICTE Approved</td></tr>
              <tr><td>B.Tech</td><td>Electronics &amp; Computer Engineering</td><td>4 Years</td><td>60</td><td>AICTE Approved</td></tr>
              <tr><td>M.Tech</td><td>CSE / Structural / Design / E&amp;TC Engg.</td><td>2 Years</td><td>54</td><td>AICTE Approved</td></tr>
              <tr><td>MBA / MCA</td><td>Master of Business Administration &amp; Computer Applications</td><td>2 Years</td><td>60 + 60</td><td>AICTE Approved</td></tr>
              <tr><td>Ph.D. Centres</td><td>CSE, E&amp;TC, Mechanical Design &amp; Civil Engineering</td><td>3–5 Years</td><td>As per PAHSUS</td><td>Recognized Research Centres</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-10-08',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 302,
        categorySlug: 'academics',
        slug: 'academic-calendar',
        title: 'Academic Calendar (2026–27)',
        subtitle: 'UGC Section 5(c) · Semester Schedule, Examinations & Co-Curricular Dates',
        contentHtml: `
          <h2>Odd &amp; Even Semester Schedule (AY 2026–27)</h2>
          <table>
            <thead><tr><th>Academic Milestone</th><th>Odd Semester</th><th>Even Semester</th></tr></thead>
            <tbody>
              <tr><td>Commencement of Classes</td><td>15 July 2026</td><td>05 January 2027</td></tr>
              <tr><td>In-Semester Evaluation (ISE-I)</td><td>07–12 September 2026</td><td>22–27 February 2027</td></tr>
              <tr><td>End-Semester Theory Examinations</td><td>18 Nov – 05 Dec 2026</td><td>03–22 May 2027</td></tr>
              <tr><td>Declaration of Results</td><td>22 December 2026</td><td>08 June 2027</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 2,
        updatedAt: '2026-07-02',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 303,
        categorySlug: 'academics',
        slug: 'academic-statutes',
        title: 'Academic & Examination Ordinances',
        subtitle: 'UGC Section 5(c) · Credit Framework, Grading System & ABC Guidelines',
        contentHtml: `
          <h2>Autonomous Examination &amp; Grading Ordinances</h2>
          <p>SVCOER follows a 160-credit Outcome-Based Education (OBE) curriculum integrated with the National Credit Framework (NCrF) and Academic Bank of Credits (ABC). Continuous evaluation accounts for 40% weightage and End-Semester Examinations account for 60%.</p>
        `,
        isPublished: true,
        sortOrder: 3,
        updatedAt: '2026-08-10',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 304,
        categorySlug: 'academics',
        slug: 'iqac',
        title: 'Internal Quality Assurance Cell (IQAC)',
        subtitle: 'UGC Section 5(c) · AQAR Reports, Academic Audits & Best Practices',
        contentHtml: `
          <h2>IQAC Mandate &amp; Quality Initiatives</h2>
          <p>Established in 2012, the IQAC drives continuous quality enhancement across curriculum design, faculty development, student satisfaction surveys, and NAAC/NBA/NIRF institutional submissions.</p>
          <ul>
            <li><strong>IQAC Coordinator:</strong> Dr. M. M. Pawar (iqac@svcoer.edu.in)</li>
            <li><strong>Quarterly Meetings:</strong> Minutes and Action Taken Reports published in the Document Center.</li>
            <li><strong>Best Practices:</strong> 24x7 Central Library, Rural Technology Incubation, and Mentor-Mentee Cohort Tracking.</li>
          </ul>
        `,
        isPublished: true,
        sortOrder: 4,
        updatedAt: '2026-09-25',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 305,
        categorySlug: 'academics',
        slug: 'central-library',
        title: 'Central Library & Digital Knowledge Centre',
        subtitle: 'UGC Section 5(c) · Print Volumes, IEEE/Springer Access & 24x7 Reading Hall',
        contentHtml: `
          <h2>Library Resources at a Glance</h2>
          <table>
            <thead><tr><th>Resource Category</th><th>Holding / Subscription</th></tr></thead>
            <tbody>
              <tr><td>Total Print Volumes</td><td>68,450 Books (14,200+ Titles)</td></tr>
              <tr><td>E-Journals &amp; Databases</td><td>IEEE Xplore, SpringerLink, ASME, Elsevier ScienceDirect, DELNET</td></tr>
              <tr><td>Seating Capacity</td><td>450 Seats (Air-conditioned Digital &amp; Reference Halls)</td></tr>
              <tr><td>Library Automation</td><td>KOHA Integrated LMS with RFID Self-Check-In</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 5,
        updatedAt: '2026-08-30',
        updatedBy: 'Content Editor',
      },
      {
        id: 306,
        categorySlug: 'academics',
        slug: 'odl-online-programs',
        title: 'UGC-Recognized ODL / Online & Swayam-NPTEL Courses',
        subtitle: 'UGC Section 5(c) · Credit Transfer & MOOC Integration',
        contentHtml: `
          <h2>ODL &amp; Online Learning Compliance</h2>
          <p>SVCOER currently offers full-time on-campus regular degree programs and does not run standalone ODL degree programs. However, up to 40% credit transfer is facilitated via <strong>SWAYAM-NPTEL</strong> Local Chapter (rated AA National Top 50) under UGC Credit Framework for Online Learning Courses.</p>
        `,
        isPublished: true,
        sortOrder: 6,
        updatedAt: '2026-08-19',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 307,
        categorySlug: 'academics',
        slug: 'academic-collaborations',
        title: 'Academic & Industry Collaborations (MoUs)',
        subtitle: 'UGC Section 5(c) & 5(e) · Active Domestic & International Partnerships',
        contentHtml: `
          <h2>Active Academic MoUs</h2>
          <table>
            <thead><tr><th>Partner Institution / Industry</th><th>Scope of Collaboration</th><th>Valid Until</th></tr></thead>
            <tbody>
              <tr><td>IIT Bombay (FOSSEE &amp; Spoken Tutorial)</td><td>Open-Source Robotics &amp; Faculty FDP</td><td>2028</td></tr>
              <tr><td>Tata Technologies Ltd.</td><td>Centre for Invention, Innovation &amp; Incubation (CIII)</td><td>2029</td></tr>
              <tr><td>TU Dresden, Germany (Summer Exchange)</td><td>Sustainable Manufacturing Student Exchange</td><td>2027</td></tr>
              <tr><td>Persistent Systems &amp; Zensar</td><td>Industry-Certified Cloud &amp; AI Electives</td><td>2028</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 7,
        updatedAt: '2026-09-18',
        updatedBy: 'Content Editor',
      },

      // Autonomous Examination Section Micro-Pages
      {
        id: 901,
        categorySlug: 'examination',
        slug: 'examination-cell-coe',
        title: 'Examination Cell & Controller of Examinations (CoE)',
        subtitle: 'Autonomous Examination Governance · Confidential Evaluation & Result Processing',
        contentHtml: `
          <h2>Autonomous Examination Cell Structure</h2>
          <p>As a UGC Autonomous Engineering Institution, SVCOER operates an independent, technology-enabled Examination Cell led by the Controller of Examinations (CoE) and supervised by the Statutory Examination Committee and Board of Examinations.</p>
          <table>
            <thead><tr><th>Role / Designation</th><th>Officer Name</th><th>Contact &amp; Desk</th></tr></thead>
            <tbody>
              <tr><td>Controller of Examinations (CoE)</td><td>Dr. M. S. Kumbhar</td><td>coe@coe.sveri.ac.in · +91-02186-216063 (Ext. 112)</td></tr>
              <tr><td>Deputy CoE (Confidential &amp; Question Bank)</td><td>Prof. R. S. Bhosale</td><td>exam.cell@coe.sveri.ac.in · Ext. 113</td></tr>
              <tr><td>Assistant CoE (ABC / DigiLocker NAD &amp; Results)</td><td>Prof. S. A. More</td><td>abc.nad@coe.sveri.ac.in · Ext. 114</td></tr>
            </tbody>
          </table>
          <h3>Key Commitments</h3>
          <ul>
            <li>100% digital barcoded answer-book masking and double-evaluation audit checks.</li>
            <li>Mandatory declaration of End-Semester Examination (ESE) results within 15 working days.</li>
            <li>Zero-delay credit synchronization with Academic Bank of Credits (ABC) &amp; DigiLocker NAD.</li>
          </ul>
        `,
        attachedPdfUrl: UGC_PDF_URL,
        attachedPdfLabel: 'Download Autonomous Examination Manual (PDF)',
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-11-04',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 902,
        categorySlug: 'examination',
        slug: 'examination-ordinances',
        title: 'Autonomous Examination Ordinances & 10-Point Grading Rules',
        subtitle: 'UGC Autonomous Regulations · CIE (40%) + ESE (60%), SGPA/CGPA & ATKT Norms',
        contentHtml: `
          <h2>Assessment Pattern &amp; Credit Evaluation (R-24 NEP 2020 Pattern)</h2>
          <p>All B.Tech and M.Tech autonomous cohorts follow Outcome-Based Continuous Internal Evaluation (40 Marks CIE: In-Sem Tests + Assignments/Projects) and End-Semester Examination (60 Marks ESE).</p>
          <table>
            <thead><tr><th>Marks Range (%)</th><th>Letter Grade</th><th>Grade Point</th><th>Performance</th></tr></thead>
            <tbody>
              <tr><td>85 – 100</td><td>O</td><td>10</td><td>Outstanding</td></tr>
              <tr><td>75 – 84</td><td>A+</td><td>9</td><td>Excellent</td></tr>
              <tr><td>65 – 74</td><td>A</td><td>8</td><td>Very Good</td></tr>
              <tr><td>55 – 64</td><td>B+</td><td>7</td><td>Good</td></tr>
              <tr><td>50 – 54</td><td>B</td><td>6</td><td>Above Average</td></tr>
              <tr><td>40 – 49</td><td>P</td><td>4</td><td>Pass (Min. 40% combined &amp; 40% in ESE)</td></tr>
              <tr><td>Below 40</td><td>F</td><td>0</td><td>Fail / Re-Appear</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 2,
        updatedAt: '2026-10-20',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 903,
        categorySlug: 'examination',
        slug: 'exam-timetable-hallticket',
        title: 'Examination Time Tables, Seating Plans & Hall Tickets',
        subtitle: 'Autonomous ESE Winter / Summer Schedule & Practical Exam Calendar',
        contentHtml: `
          <h2>Winter 2026 End-Semester Examination Schedule</h2>
          <p>Theory and Practical schedules for B.Tech (Sem I–VII), M.Tech, and Backlog / Re-Exam cohorts are published 30 days prior to commencement. Hall tickets are generated digitally via the Autonomous ERP Student Portal.</p>
          <table>
            <thead><tr><th>Examination Phase</th><th>Window</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Practical / Oral / Project Viva-Voce</td><td>10 Nov – 20 Nov 2026</td><td>Published</td></tr>
              <tr><td>Regular &amp; Backlog Theory ESE (Odd Sem)</td><td>25 Nov – 18 Dec 2026</td><td>Published</td></tr>
              <tr><td>Supplementary / Make-Up Re-Exam</td><td>12 Jan – 22 Jan 2027</td><td>Tentative</td></tr>
            </tbody>
          </table>
        `,
        attachedPdfUrl: UGC_PDF_URL,
        attachedPdfLabel: 'Download Winter 2026 Master Exam Timetable (PDF)',
        isPublished: true,
        sortOrder: 3,
        updatedAt: '2026-11-04',
        updatedBy: 'Content Editor',
      },
      {
        id: 904,
        categorySlug: 'examination',
        slug: 'results-revaluation',
        title: 'Results, Answer-Book Photocopy & Revaluation Grievances',
        subtitle: '15-Day Result Declaration · Transparent Photocopy & Challenge Valuation SOP',
        contentHtml: `
          <h2>Results &amp; Student Examination Grievance Redressal</h2>
          <p>Students may apply online within 5 working days of result declaration for scanned answer-book inspection (Photocopy) and subsequent Revaluation or Moderation review by an independent subject expert panel.</p>
          <ul>
            <li><strong>Step 1 (Photocopy Request):</strong> Online application within 5 days of result publication.</li>
            <li><strong>Step 2 (Redressal / Revaluation):</strong> Submit reasoned question-wise appeal within 3 days of receiving scanned booklet.</li>
            <li><strong>Step 3 (Final Revised Grade Card):</strong> Discrepancies exceeding ±5% marks trigger automatic fee refund and revised grade card issuance.</li>
          </ul>
        `,
        isPublished: true,
        sortOrder: 4,
        updatedAt: '2026-10-28',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 905,
        categorySlug: 'examination',
        slug: 'abc-nad-verification',
        title: 'Academic Bank of Credits (ABC) & DigiLocker NAD Verification',
        subtitle: 'NEP 2020 Digital Credit Mobility & Employer Document Authentication',
        contentHtml: `
          <h2>Academic Bank of Credits (ABC) &amp; National Academic Depository (NAD)</h2>
          <p>SVCOER is registered on the UGC-NAD / DigiLocker portal. Every semester grade card and degree certificate is digitally signed and pushed directly to student ABC IDs for seamless credit accumulation, lateral entry, and SWAYAM-NPTEL credit transfer.</p>
          <p><strong>Employer / Background Verification:</strong> External agencies and universities seeking authenticity verification of SVCOER transcripts or provisional degrees may email <strong>coe@svcoer.edu.in</strong> with scanned certificate copies.</p>
        `,
        isPublished: true,
        sortOrder: 5,
        updatedAt: '2026-10-12',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 906,
        categorySlug: 'examination',
        slug: 'convocation-transcripts',
        title: 'Convocation, Provisional Degree & Official Transcript Services',
        subtitle: 'Graduating Batch Services · Degree Verification & Sealed Transcripts',
        contentHtml: `
          <h2>Annual Convocation &amp; Transcript Issuance</h2>
          <p>Official sealed transcripts for higher studies (MS/MBA/Ph.D.), migration certificates, CGPA-to-Percentage conversion certificates (formula: <code>Percentage = (CGPA - 0.75) × 10</code> or as per University ordinance), and duplicate grade cards are processed within 5 working days through the Examination Cell window.</p>
        `,
        isPublished: true,
        sortOrder: 6,
        updatedAt: '2026-10-08',
        updatedBy: 'Content Editor',
      },

      // 5(d) Admissions & Fee
      {
        id: 401,
        categorySlug: 'admissions-fee',
        slug: 'prospectus-fee-structure',
        title: 'Prospectus & FRA Approved Fee Structure (2026–27)',
        subtitle: 'UGC Section 5(d) · Transparent Tuition, Development & Category-Wise Fee Disclosure',
        contentHtml: `
          <h2>Fee Regulating Authority (FRA) Approved Fee Structure</h2>
          <p>As mandated by the Maharashtra Fee Regulating Authority (FRA) and UGC Public Self-Disclosure norms, the exact annual fee structure for Academic Year 2026–27 is published below with zero hidden charges:</p>
          <table>
            <thead><tr><th>Program</th><th>Tuition Fee (INR)</th><th>Development Fee (INR)</th><th>Total Annual Fee (INR)</th></tr></thead>
            <tbody>
              <tr><td>B.Tech (All Engineering Branches) — Open</td><td>98,214</td><td>14,786</td><td>1,13,000</td></tr>
              <tr><td>B.Tech — OBC / EWS / SEBC (50% Waiver)</td><td>49,107</td><td>14,786</td><td>63,893</td></tr>
              <tr><td>B.Tech — SC / ST / VJNT / TFWS</td><td>0</td><td>0</td><td>0 (Govt. Scholarship)</td></tr>
              <tr><td>M.Tech (Postgraduate Engineering)</td><td>76,522</td><td>11,478</td><td>88,000</td></tr>
              <tr><td>Hostel &amp; Mess (Optional Annual)</td><td>24,000</td><td>34,000 (Mess)</td><td>58,000</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-10-12',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 402,
        categorySlug: 'admissions-fee',
        slug: 'admission-process',
        title: 'Admission Process & Eligibility Guidelines',
        subtitle: 'UGC Section 5(d) · CAP Centralized Admissions & Institute Level Quota',
        contentHtml: `
          <h2>Admission Procedure</h2>
          <p>Admissions to First Year B.Tech and Direct Second Year (Lateral Entry) are conducted transparently through the Centralized Admission Process (CAP) of the State CET Cell, Government of Maharashtra, based on MHT-CET / JEE (Main) merit.</p>
          <ul>
            <li><strong>Step 1:</strong> Register on Maharashtra State CET Cell CAP Portal (DTE Code: 06220).</li>
            <li><strong>Step 2:</strong> Document Verification at Scrutiny Centre &amp; Option Form submission.</li>
            <li><strong>Step 3:</strong> Seat Allotment confirmation &amp; reporting at SVERI Admission Cell with original certificates.</li>
          </ul>
        `,
        isPublished: true,
        sortOrder: 2,
        updatedAt: '2026-09-01',
        updatedBy: 'Content Editor',
      },
      {
        id: 403,
        categorySlug: 'admissions-fee',
        slug: 'fee-refund-policy',
        title: 'UGC Fee Refund Policy',
        subtitle: 'UGC Section 5(d) · 100% Transparent Cancellation & Refund Timeline',
        contentHtml: `
          <h2>Fee Refund Schedule (As per UGC Notification)</h2>
          <table>
            <thead><tr><th>Withdrawal Window</th><th>Percentage of Fee Refunded</th><th>Processing Time</th></tr></thead>
            <tbody>
              <tr><td>15 days or more before formally notified last date of admission</td><td>100% (Max INR 1,000 processing deduction)</td><td>15 Working Days</td></tr>
              <tr><td>Less than 15 days before last date of admission</td><td>90%</td><td>15 Working Days</td></tr>
              <tr><td>15 days or less after last date of admission</td><td>80%</td><td>15 Working Days</td></tr>
              <tr><td>More than 15 days but up to 30 days after last date</td><td>50%</td><td>15 Working Days</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 3,
        updatedAt: '2026-08-21',
        updatedBy: 'IQAC Officer',
      },

      // 5(e) Research
      {
        id: 501,
        categorySlug: 'research',
        slug: 'research-development-cell',
        title: 'Research & Development Cell, Projects & Consultancy',
        subtitle: 'UGC Section 5(e) · DST, AICTE-MODROBS, Industry Consultancy & Patents',
        contentHtml: `
          <h2>Sponsored Research &amp; Consultancy</h2>
          <p>SVCOER's R&amp;D Cell fosters translational engineering research across Smart Agriculture IoT, Renewable Energy Microgrids, Structural Composites, and Vernacular AI.</p>
          <table>
            <thead><tr><th>Funding Agency</th><th>Project Title</th><th>Principal Investigator</th><th>Grant (INR Lakhs)</th></tr></thead>
            <tbody>
              <tr><td>DST-SERB</td><td>AI-Driven Precision Drip Irrigation for Arid Belts</td><td>Dr. A. K. Deshpande (CSE)</td><td>38.40</td></tr>
              <tr><td>AICTE-MODROBS</td><td>Industry 4.0 CNC &amp; Cobot Automation Lab</td><td>Dr. R. B. Kulkarni (Mech)</td><td>21.50</td></tr>
              <tr><td>MSME Design Clinic</td><td>Low-Cost Bio-Aggregate Concrete Blocks</td><td>Dr. S. V. Patwardhan (Civil)</td><td>14.20</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-09-29',
        updatedBy: 'Content Editor',
      },
      {
        id: 502,
        categorySlug: 'research',
        slug: 'incubation-cell',
        title: 'Incubation Centre, Start-ups & IIC Cell',
        subtitle: 'UGC Section 5(e) · SVCOER Technology Business Incubator (TBI)',
        contentHtml: `
          <h2>Entrepreneurship &amp; Start-up Ecosystem</h2>
          <p>Recognized with a <strong>4-Star Rating by MoE's Innovation Cell (IIC)</strong>, the SVCOER Technology Business Incubator provides seed funding up to INR 5 Lakhs, co-working prototyping labs, and IP filing support. Over 18 student-led start-ups have been incubated since 2021.</p>
        `,
        isPublished: true,
        sortOrder: 2,
        updatedAt: '2026-09-05',
        updatedBy: 'Content Editor',
      },
      {
        id: 503,
        categorySlug: 'research',
        slug: 'central-facilities',
        title: 'Central Research & Computing Facilities',
        subtitle: 'UGC Section 5(e) · HPC GPU Cluster, Material Testing & Central Workshop',
        contentHtml: `
          <h2>Central Instrumentation &amp; Shared Labs</h2>
          <ul>
            <li><strong>NVIDIA DGX / High-Performance Computing Node:</strong> 4x A100 GPUs for Deep Learning &amp; CFD simulations.</li>
            <li><strong>Central Material Testing Laboratory:</strong> 1000 kN Universal Testing Machine &amp; Scanning Electron Microscope access.</li>
            <li><strong>FabLab &amp; Rapid Prototyping Studio:</strong> Industrial 3D Printers, Laser Cutters &amp; PCB Milling.</li>
          </ul>
        `,
        isPublished: true,
        sortOrder: 3,
        updatedAt: '2026-08-29',
        updatedBy: 'Content Editor',
      },
      {
        id: 504,
        categorySlug: 'research',
        slug: 'conferences-workshops-events',
        title: 'National & International Conferences, Workshops & Symposia',
        subtitle: 'UGC Section 5(e) · Dedicated Microsites, Call for Papers, Keynotes & Research Events',
        contentHtml: `${buildCustomSliderHtml([
          {
            id: 'res-s1',
            imageUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
            title: 'ICAEST-2026: International Conference on Smart Technology',
            caption: 'Annual Flagship International Conference with IEEE/Springer proceedings and hybrid tracks.',
            ctaLabel: 'Open ICAEST-2026 Microsite',
            ctaLink: '/conference/icaest-2026',
          },
          {
            id: 'res-s2',
            imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
            title: 'National Workshops, FDPs & Edge AI Symposia',
            caption: 'Hands-on research workshops, STTPs, and patent filing clinics hosted year-round.',
            ctaLabel: 'Browse All Programs',
            ctaLink: '/conferences',
          },
        ])}
          <h2>Academic Conferences, Workshops &amp; Technical Events</h2>
          <p>SVCOER regularly hosts National &amp; International Conferences, AICTE/ISTE Faculty Development Programs (FDPs), Research Workshops, and Technical Symposia. Use the interactive portals below to inspect tracks, schedules, organizing committee profiles, or submit manuscripts online.</p>
        `,
        isPublished: true,
        sortOrder: 4,
        updatedAt: '2026-11-12',
        updatedBy: 'Super Admin',
      },

      // 5(f) Student Life & Cells
      {
        id: 601,
        categorySlug: 'student-life',
        slug: 'placement-cell',
        title: 'Training & Placement Cell',
        subtitle: 'UGC Section 5(f) · Placement Statistics, Top Recruiters & Career Readiness',
        contentHtml: `
          <h2>Placement Highlights (2025–26 Graduating Batch)</h2>
          <table>
            <thead><tr><th>Metric</th><th>2025–26</th><th>2024–25</th><th>2023–24</th></tr></thead>
            <tbody>
              <tr><td>Eligible Students Placed</td><td>492 / 540 (91.1%)</td><td>468 / 525 (89.1%)</td><td>441 / 510 (86.4%)</td></tr>
              <tr><td>Highest Package Offered</td><td>18.5 LPA</td><td>16.2 LPA</td><td>14.8 LPA</td></tr>
              <tr><td>Median Salary Package</td><td>5.40 LPA</td><td>4.95 LPA</td><td>4.60 LPA</td></tr>
              <tr><td>Recruiting Companies Visited</td><td>84 Corporates</td><td>76 Corporates</td><td>71 Corporates</td></tr>
            </tbody>
          </table>
          <p>Backed by over <strong>250+ visiting recruiters</strong>, structured Communication Improvement Programs (CIP), and dedicated language laboratories, SVERI prepares students for leading technology and core engineering careers.</p>
          <p><strong>Key Recruiters:</strong> TCS (Digital &amp; Ninja), Infosys, Accenture, Deloitte, Wipro, Tech Mahindra, Hexaware, Bharat Forge, Mahindra &amp; Mahindra, Atlas Copco.</p>
        `,
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-10-14',
        updatedBy: 'Content Editor',
      },
      {
        id: 602,
        categorySlug: 'student-life',
        slug: 'sgrc',
        title: 'Student Grievance Redressal Committee (SGRC) & Ombudsperson',
        subtitle: 'UGC Section 5(f) · UGC Redressal of Grievances of Students Regulations 2023',
        contentHtml: `
          <h2>Student Grievance Redressal Committee (SGRC)</h2>
          <p>Students can submit academic, examination, or campus grievances online or in person with guaranteed resolution within 15 working days.</p>
          <p><strong>University Ombudsperson:</strong> Hon. Justice (Retd.) V. R. Joshi (ombudsperson@pahsus.ac.in)</p>
          <p><strong>SGRC Chairperson:</strong> Dr. P. K. Deshmukh, Dean Academics (sgrc@svcoer.edu.in)</p>
        `,
        isPublished: true,
        sortOrder: 2,
        updatedAt: '2026-09-10',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 603,
        categorySlug: 'student-life',
        slug: 'anti-ragging-cell',
        title: 'Anti-Ragging Cell & Statutory Squad',
        subtitle: 'UGC Section 5(f) · Zero-Tolerance Policy & 24x7 National Helpline',
        contentHtml: `
          <h2>Anti-Ragging Compliance</h2>
          <p>Ragging is strictly prohibited inside and outside the campus under the Maharashtra Prohibition of Ragging Act, 1999 and UGC Regulations 2009.</p>
          <p><strong>24x7 Institutional Anti-Ragging Helpline:</strong> +91 2186 225099 | <strong>National Toll-Free:</strong> 1800-180-5522</p>
        `,
        isPublished: true,
        sortOrder: 3,
        updatedAt: '2026-08-05',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 604,
        categorySlug: 'student-life',
        slug: 'sports-ncc-nss',
        title: 'Sports Facilities, NCC, NSS & Hostels',
        subtitle: 'UGC Section 5(f) · Athletics, Community Service & Residential Campus',
        contentHtml: `
          <h2>Sports, NCC/NSS &amp; Residential Facilities</h2>
          <ul>
            <li><strong>Sports Complex:</strong> 400m synthetic athletic track, floodlit basketball/volleyball courts, cricket ground, and indoor badminton stadium.</li>
            <li><strong>NCC &amp; NSS:</strong> 200-cadet NCC Army Wing Unit and 250-volunteer NSS Unit conducting annual rural water-conservation camps.</li>
            <li><strong>Hostels:</strong> Separate Boys (650 beds) &amp; Girls (480 beds) hostels with solar hot water, Wi-Fi, and hygienic dining halls.</li>
            <li><strong>Health Centre:</strong> 10-bed campus clinic with resident medical officer and 24x7 ambulance.</li>
          </ul>
        `,
        isPublished: true,
        sortOrder: 4,
        updatedAt: '2026-08-12',
        updatedBy: 'Content Editor',
      },
      {
        id: 605,
        categorySlug: 'student-life',
        slug: 'equal-opportunity-sedg-barrier-free',
        title: 'Equal Opportunity, SEDG Cell & Barrier-Free Campus',
        subtitle: 'UGC Section 5(f) · Divyangjan Accessibility & Inclusive Support Systems',
        contentHtml: `
          <h2>Inclusivity &amp; Accessibility Commitment</h2>
          <ul>
            <li><strong>Equal Opportunity &amp; SC/ST/OBC Cell:</strong> Facilitates post-matric scholarships, remedial coaching, and competitive exam mentorship.</li>
            <li><strong>Socio-Economically Disadvantaged Groups (SEDG) Cell:</strong> Implements NEP 2020 equity initiatives, earn-while-learn schemes, and book-bank grants.</li>
            <li><strong>Facilities for Differently-Abled (Divyangjan):</strong> Ramps with railings across all academic blocks, elevators in every building, tactile paving, accessible washrooms, and screen-reader equipped library workstations.</li>
          </ul>
        `,
        isPublished: true,
        sortOrder: 5,
        updatedAt: '2026-09-03',
        updatedBy: 'IQAC Officer',
      },

      // 5(g) Alumni
      {
        id: 701,
        categorySlug: 'alumni',
        slug: 'alumni-association',
        title: 'Registered Alumni Association & Notable Alumni',
        subtitle: 'UGC Section 5(g) · Global Alumni Network (11,500+ Engineers)',
        contentHtml: `
          <h2>SVCOER Alumni Association (Reg. No. MH/SOL/4892)</h2>
          <p>Our global alumni chapters across Pune, Bengaluru, Hyderabad, Munich, and San Jose actively mentor students through mock interviews, endowment scholarships, and industry projects.</p>
          <table>
            <thead><tr><th>Alumnus Name</th><th>Batch &amp; Dept</th><th>Current Leadership Role</th></tr></thead>
            <tbody>
              <tr><td>Mr. Vikramaditya Patil</td><td>2006 · Mechanical</td><td>Director of Manufacturing, Bosch India</td></tr>
              <tr><td>Ms. Pallavi Deshmukh</td><td>2011 · CSE</td><td>Principal Cloud Architect, Microsoft</td></tr>
              <tr><td>Mr. Omkar Shinde</td><td>2014 · Civil</td><td>Chief Structural Lead, L&amp;T Infra</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-09-19',
        updatedBy: 'Content Editor',
      },

      // 5(h) Information Corner
      {
        id: 801,
        categorySlug: 'information-corner',
        slug: 'rti-disclosure',
        title: 'Right to Information (RTI) — CPIO & Appellate Authority',
        subtitle: 'UGC Section 5(h) · Statutory Public Information Officers under RTI Act 2005',
        contentHtml: `
          <h2>RTI Officers</h2>
          <table>
            <thead><tr><th>Role</th><th>Officer Name &amp; Designation</th><th>Contact Email &amp; Phone</th></tr></thead>
            <tbody>
              <tr><td>Central / Public Information Officer (PIO)</td><td>Shri S. G. Kulkarni, Registrar</td><td>pio.rti@coe.sveri.ac.in · +91-02186-216062</td></tr>
              <tr><td>First Appellate Authority (FAA)</td><td>Dr. B. P. Ronge, Principal</td><td>principal@coe.sveri.ac.in · +91-02186-216063</td></tr>
            </tbody>
          </table>
        `,
        isPublished: true,
        sortOrder: 1,
        updatedAt: '2026-09-11',
        updatedBy: 'IQAC Officer',
      },
      {
        id: 802,
        categorySlug: 'information-corner',
        slug: 'circulars-notices',
        title: 'Circulars, Notices, Announcements & Newsletters',
        subtitle: 'UGC Section 5(h) · Official Notifications, Job Openings & Campus Updates',
        contentHtml: `
          <h2>Official Institutional Circulars &amp; Notices</h2>
          <p>All active notices, examination timetables, scholarship circulars, quarterly newsletters, and faculty recruitment advertisements are dynamically indexed below and in the Quick Links Document Repository.</p>
        `,
        isPublished: true,
        sortOrder: 2,
        updatedAt: '2026-10-18',
        updatedBy: 'Content Editor',
      },
      {
        id: 803,
        categorySlug: 'information-corner',
        slug: 'reservation-roster-study-india',
        title: 'Reservation Roster & Study in India (International Cell)',
        subtitle: 'UGC Section 5(h) · Statutory Roster & International Student Admissions',
        contentHtml: `
          <h2>Reservation Roster Compliance</h2>
          <p>Faculty recruitment and student admissions strictly adhere to the Government of Maharashtra &amp; UGC Reservation Roster norms (SC, ST, VJNT, OBC, EWS, and PwD categories). Verified annual roster statements are published in the Document Center.</p>
          <h2>Study in India &amp; International Students Cell</h2>
          <p>SVCOER is registered on the Government of India <strong>Study in India (SII)</strong> portal with dedicated hostel wing, FRRO visa assistance, English bridge modules, and cultural orientation for international scholars.</p>
        `,
        isPublished: true,
        sortOrder: 3,
        updatedAt: '2026-09-20',
        updatedBy: 'IQAC Officer',
      },
    ],

    leadership: [
      {
        id: 1,
        roleTitle: 'Principal & Director',
        name: 'Dr. B. P. Ronge',
        qualification: 'Ph.D. (Mechanical Engg.), M.Tech (IIT)',
        email: 'principal@coe.sveri.ac.in',
        phone: '+91-02186-216063',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Leading SVERI’s College of Engineering, Pandharpur (Autonomous) in academic quality, NAAC A+ accreditation governance, and NEP 2020 institutional transformation.',
        committeeGroup: 'statutory',
        sortOrder: 1,
      },
      {
        id: 2,
        roleTitle: 'Chancellor / Trust Chairman',
        name: 'Hon. Shri D. B. Patil',
        qualification: 'M.E., Social & Educational Philanthropist',
        email: 'chairman@svcoer.edu.in',
        phone: '+91 2186 225080',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Founder Trustee guiding SVERT educational campuses across engineering, pharmacy, and management disciplines.',
        committeeGroup: 'statutory',
        sortOrder: 2,
      },
      {
        id: 3,
        roleTitle: 'Registrar',
        name: 'Shri S. G. Kulkarni',
        qualification: 'M.Com, LL.B., MBA (HR)',
        email: 'registrar@svcoer.edu.in',
        phone: '+91 2186 225084',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Custodian of institutional records, statutory compliance, DTE/AICTE liaison, and Public Information Officer (RTI).',
        committeeGroup: 'statutory',
        sortOrder: 3,
      },
      {
        id: 4,
        roleTitle: 'Controller of Examinations',
        name: 'Dr. M. S. Kumbhar',
        qualification: 'Ph.D. (E&TC), M.E.',
        email: 'coe@svcoer.edu.in',
        phone: '+91 2186 225085',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Heads autonomous examination governance, Academic Bank of Credits (ABC) sync, and timely result declarations.',
        committeeGroup: 'statutory',
        sortOrder: 4,
      },
      {
        id: 5,
        roleTitle: 'Finance & Accounts Officer',
        name: 'CA Rajeshwar V. Shinde',
        qualification: 'FCA, M.Com',
        email: 'finance@svcoer.edu.in',
        phone: '+91 2186 225086',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Oversees institutional budgeting, FRA fee proposals, statutory audits, and scholarship disbursements.',
        committeeGroup: 'statutory',
        sortOrder: 5,
      },
      {
        id: 6,
        roleTitle: 'Chief Vigilance Officer & Ombudsperson Liaison',
        name: 'Dr. P. K. Deshmukh',
        qualification: 'Ph.D. (Civil Engg.)',
        email: 'cvo@svcoer.edu.in',
        phone: '+91 2186 225087',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Ensures procurement transparency, ethical compliance, and coordination with the University Ombudsperson.',
        committeeGroup: 'statutory',
        sortOrder: 6,
      },
    ],

    departments: [
      {
        id: 1,
        slug: 'computer-science',
        code: 'CSE',
        name: 'Computer Science & Engineering',
        shortName: 'CSE',
        establishedYear: 1998,
        intakeCapacity: 180,
        nbaStatus: 'NBA Accredited (2024–2027)',
        hodName: 'Dr. Anjali K. Deshpande',
        hodMessage:
          'Welcome to the Department of Computer Science & Engineering. Our NEP 2020 Honours curriculum blends foundational systems engineering with AI, Cloud Security, and industry-mentored capstone projects.',
        overview:
          'Established in 1998, the CSE Department offers B.Tech (180 intake), M.Tech in CSE, and a PAHSUS-recognized Ph.D. Research Centre. Equipped with an NVIDIA GPU cluster and 8 specialized computing laboratories.',
        vision:
          'To nurture globally competitive computing professionals with strong algorithmic foundations and ethical innovation mindset.',
        mission:
          'Deliver outcome-based technical education, foster funded AI/Systems research, and partner with leading technology enterprises.',
        heroImageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        library: {
          title: 'CSE Departmental Knowledge & Reference Library',
          description:
            'Dedicated departmental library housing specialized textbooks in Algorithms, Artificial Intelligence, Distributed Systems, Cloud Security, IEEE/Springer proceedings, and GATE/placement preparation archives.',
          totalVolumes: 2850,
          seatingCapacity: 45,
          incharge: 'Prof. Neha V. Joshi',
          timings: 'Mon–Sat · 9:00 AM – 6:00 PM',
          photoUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
        },
        facultyFieldSchema: [
          'Patents & Grants',
          'Courses Taught',
          'ORCID / Scopus ID',
          'Industry Consultancies',
        ],
        subPages: [
          {
            id: 11,
            departmentId: 1,
            slug: 'about',
            title: 'About Department',
            pageType: 'general',
            contentHtml:
              '<h2>Department Overview</h2><p>The Department of Computer Science &amp; Engineering is NBA accredited and recognized for 94% placement consistency across product engineering and global IT enterprises. Students earn Honours in Artificial Intelligence &amp; Machine Learning or Cyber Security alongside their core B.Tech degree.</p>',
            sortOrder: 1,
            isPublished: true,
            updatedAt: '2026-10-01',
          },
          {
            id: 12,
            departmentId: 1,
            slug: 'hod-desk',
            title: 'HoD Desk',
            pageType: 'general',
            contentHtml:
              '<h2>Message from the Head of Department</h2><p><strong>Dr. Anjali K. Deshpande</strong> (Ph.D., IIT Kharagpur) leads a team of 28 dedicated faculty members. We emphasize first-principles coding, open-source contribution, and real-world rural-tech problem solving through our ACM &amp; CSI student chapters.</p>',
            sortOrder: 2,
            isPublished: true,
            updatedAt: '2026-09-25',
          },
          {
            id: 13,
            departmentId: 1,
            slug: 'syllabus',
            title: 'Notes & Syllabus',
            pageType: 'notes_syllabus',
            contentHtml:
              '<h2>NEP 2020 Autonomous Syllabus &amp; Course Notes</h2><p>160-Credit B.Tech CSE curriculum featuring mandatory 6-month industry internship in Semester VIII, Multidisciplinary Minors, and downloadable lecture notes.</p>',
            items: [
              {
                id: 1301,
                title: 'B.Tech CSE R-24 NEP 2020 Complete Syllabus Structure (Sem I–VIII)',
                date: '2026-08-20',
                badge: 'Syllabus',
                description: 'Official autonomous credit structure, Honours tracks in AI/ML and Cyber Security.',
                url: UGC_PDF_URL,
                sourceType: 'upload',
              },
              {
                id: 1302,
                title: 'Semester V Lecture Notes & Lab Manuals (Google Drive Archive)',
                date: '2026-09-10',
                badge: 'Drive Notes',
                description: 'Shared Google Drive repository for Algorithms, OS, Computer Networks & ML lab sheets.',
                url: 'https://drive.google.com/drive/folders/1SVCOER-CSE-Notes',
                sourceType: 'external',
              },
            ],
            sortOrder: 3,
            isPublished: true,
            updatedAt: '2026-08-20',
          },
          {
            id: 14,
            departmentId: 1,
            slug: 'achievements',
            title: 'Student Achievements',
            pageType: 'achievements_students',
            contentHtml:
              '<h2>Recent Student Laurels</h2><ul><li>Smart India Hackathon 2025 National Winner (Team VoidPointers — Ministry of Jal Shakti Problem Statement).</li><li>14 Research Papers published in IEEE / Scopus indexed conferences by UG students in 2025–26.</li></ul>',
            items: [
              {
                id: 1401,
                title: 'Team VoidPointers Wins Smart India Hackathon Grand Finale',
                date: '2026-10-22',
                badge: 'National Winner',
                description: 'Awarded INR 1,00,000 cash prize for AI Groundwater Telemetry Platform.',
                imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
              },
              {
                id: 1402,
                title: '14 IEEE / Scopus Student Conference Publications (2025–26)',
                date: '2026-09-15',
                badge: 'Research',
                description: 'Final-year UG cohorts published Peer-Reviewed papers in Applied AI & Edge Security.',
              },
            ],
            sortOrder: 4,
            isPublished: true,
            updatedAt: '2026-10-10',
          },
          {
            id: 15,
            departmentId: 1,
            slug: 'department-library',
            title: 'Department Library',
            pageType: 'library',
            contentHtml:
              '<h2>CSE Departmental Reference Library</h2><p>Equipped with core Computer Science reference titles, competitive GATE modules, and quiet reading carrels managed right beside the CSE Seminar Hall.</p>',
            photos: [
              {
                id: 1501,
                imageUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
                caption: 'CSE Departmental Library Reading Section & Reference Stacks',
              },
            ],
            sortOrder: 5,
            isPublished: true,
            updatedAt: '2026-10-12',
          },
          {
            id: 16,
            departmentId: 1,
            slug: 'notice-board',
            title: 'Notice Board',
            pageType: 'notice_board',
            contentHtml: '<h2>CSE Department Official Notices &amp; Timetables</h2>',
            items: [
              {
                id: 1601,
                title: 'B.Tech Final Year Capstone Project Phase-I Viva Schedule',
                date: '2026-11-05',
                badge: 'Urgent',
                description: 'All project groups must submit spiral-bound synopsis to Project Coordinator before 14 Nov.',
                url: UGC_PDF_URL,
                sourceType: 'upload',
              },
              {
                id: 1602,
                title: 'ACM Student Chapter Coding Contest & Mock Placement Drive',
                date: '2026-11-02',
                badge: 'Notice',
                description: 'Open for SY, TY & Final Year CSE cohorts; registration via Google Drive notice form.',
                url: 'https://drive.google.com/file/d/1SVCOER-CSE-ACM-Notice/view',
                sourceType: 'external',
              },
            ],
            sortOrder: 6,
            isPublished: true,
            updatedAt: '2026-11-05',
          },
          {
            id: 17,
            departmentId: 1,
            slug: 'gallery',
            title: 'Department Gallery',
            pageType: 'gallery',
            contentHtml: '<h2>Laboratories, Hackathons &amp; Campus Life in CSE</h2>',
            photos: [
              {
                id: 1701,
                imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
                caption: 'AI, IoT & Embedded Systems Project Studio',
              },
              {
                id: 1702,
                imageUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
                caption: 'CSE Graduating Cohort at Annual Convocation',
              },
              {
                id: 1703,
                imageUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
                caption: 'Knowledge Atrium & Reference Reading Hall',
              },
            ],
            sortOrder: 7,
            isPublished: true,
            updatedAt: '2026-10-20',
          },
          {
            id: 18,
            departmentId: 1,
            slug: 'celebrations',
            title: 'Celebrations & Events',
            pageType: 'celebrations',
            contentHtml:
              '<h2>Engineers Day, Technovate &amp; Farewell Celebrations</h2><p>Annual technical festivals, Engineers Day project expos, and student chapter cultural showcases organized by CESA &amp; ACM.</p>',
            photos: [
              {
                id: 1801,
                imageUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
                caption: 'Technovate & Felicitation of University Rank Holders',
              },
            ],
            sortOrder: 8,
            isPublished: true,
            updatedAt: '2026-10-18',
          },
          {
            id: 19,
            departmentId: 1,
            slug: 'faculty-achievements',
            title: 'Faculty Achievements',
            pageType: 'achievements_faculty',
            contentHtml: '<h2>Faculty Research Grants, Patents &amp; Recognitions</h2>',
            items: [
              {
                id: 1901,
                title: 'DST-SERB Research Grant Sanctioned (INR 38.40 Lakhs)',
                date: '2026-09-29',
                badge: 'Funded R&D',
                description: 'Awarded to Dr. Anjali K. Deshpande for Precision Agriculture NLP & Telemetry.',
              },
              {
                id: 1902,
                title: 'Two Utility Patents Published on Edge Computer Vision',
                date: '2026-08-14',
                badge: 'Patent',
                description: 'Authored by Dr. Siddharth R. Mane with B.Tech Honours student co-inventors.',
              },
            ],
            sortOrder: 9,
            isPublished: true,
            updatedAt: '2026-09-29',
          },
        ],
        faculty: [
          {
            id: 1001,
            departmentId: 1,
            name: 'Dr. Anjali K. Deshpande',
            designation: 'Professor & Head of Department',
            qualification: 'Ph.D. (CSE), M.Tech',
            specialization: 'Distributed Systems & Vernacular NLP',
            email: 'hod.cse@svcoer.edu.in',
            phone: '+91-02186-216063 (Ext. 201)',
            experienceYears: 21,
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            externalProfileUrl: 'https://scholar.google.com/',
            externalProfileLabel: 'Google Scholar Profile',
            customFields: [
              { id: 'cf-1', label: 'Patents & Grants', value: 'DST-SERB INR 38.4L Grant · 3 Patents', fieldType: 'text' },
              { id: 'cf-2', label: 'Courses Taught', value: 'Distributed Systems, Compiler Design', fieldType: 'text' },
              { id: 'cf-3', label: 'ORCID ID', value: 'https://orcid.org/0000-0002-1825-0097', fieldType: 'url' },
            ],
            isHod: true,
            sortOrder: 1,
          },
          {
            id: 1002,
            departmentId: 1,
            name: 'Dr. Siddharth R. Mane',
            designation: 'Associate Professor',
            qualification: 'Ph.D., M.E. (CSE)',
            specialization: 'Computer Vision & Edge AI',
            email: 'srmane@svcoer.edu.in',
            phone: '+91-02186-216063 (Ext. 204)',
            experienceYears: 15,
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            externalProfileUrl: 'https://scholar.google.com/',
            externalProfileLabel: 'Research Profile & Publications',
            customFields: [
              { id: 'cf-4', label: 'Patents & Grants', value: '2 Utility Patents Filed (Edge AI)', fieldType: 'text' },
              { id: 'cf-5', label: 'Courses Taught', value: 'Deep Learning, Computer Vision', fieldType: 'text' },
            ],
            isHod: false,
            sortOrder: 2,
          },
          {
            id: 1003,
            departmentId: 1,
            name: 'Prof. Neha V. Joshi',
            designation: 'Assistant Professor',
            qualification: 'M.Tech (Information Security)',
            specialization: 'Cloud Native Security & Cryptography',
            email: 'nvjoshi@svcoer.edu.in',
            phone: '+91-02186-216063 (Ext. 209)',
            experienceYears: 9,
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            customFields: [
              { id: 'cf-6', label: 'Roles', value: 'Dept Library Coordinator & Cloud Lab In-Charge', fieldType: 'text' },
            ],
            isHod: false,
            sortOrder: 3,
          },
        ],
        labs: [
          {
            id: 2001,
            departmentId: 1,
            name: 'High-Performance AI & Deep Learning Lab',
            areaSqFt: 1450,
            equipmentSummary: 'NVIDIA GPU Workstations, 60 Core i7 Nodes, Dual 10Gbps Fiber',
            incharge: 'Dr. Siddharth R. Mane',
          },
          {
            id: 2002,
            departmentId: 1,
            name: 'Cyber Security & Cloud Computing Studio',
            areaSqFt: 1200,
            equipmentSummary: 'Cisco Security Appliances, OpenStack Private Cloud Cluster',
            incharge: 'Prof. Neha V. Joshi',
          },
        ],
      },
      {
        id: 2,
        slug: 'mechanical',
        code: 'MECH',
        name: 'Mechanical Engineering',
        shortName: 'Mechanical',
        establishedYear: 1998,
        intakeCapacity: 120,
        nbaStatus: 'NBA Accredited (2024–2027)',
        hodName: 'Dr. Rajendra B. Kulkarni',
        hodMessage:
          'Our Mechanical Engineering department bridges classical thermo-fluid and machine design fundamentals with Industry 4.0 robotics, EV powertrains, and additive manufacturing.',
        overview:
          'Founding department of SVCOER featuring Tata Technologies CIII Robotics Lab, CNC Turning/Milling Centres, and Heat Transfer research facilities.',
        vision: 'To be a hub of excellence in sustainable manufacturing, robotics, and thermal systems engineering.',
        mission: 'Cultivate hands-on design thinking, industrial consultancy, and entrepreneurial manufacturing talent.',
        heroImageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        subPages: [
          {
            id: 21,
            departmentId: 2,
            slug: 'about',
            title: 'About Department',
            contentHtml:
              '<h2>Mechanical Engineering Excellence</h2><p>Consistently winning national awards at SAE BAJA and ROBOCON, the department houses 11 heavy engineering laboratories and an AICTE-MODROBS sponsored Automation Centre.</p>',
            sortOrder: 1,
            isPublished: true,
            updatedAt: '2026-09-12',
          },
          {
            id: 22,
            departmentId: 2,
            slug: 'syllabus',
            title: 'Syllabus & Curriculum',
            contentHtml:
              '<h2>Curriculum Structure</h2><p>Includes CAD/CAM/CAE, Electric Vehicle Systems, Finite Element Analysis, and Minor specialization in Robotics &amp; Mechatronics.</p>',
            sortOrder: 2,
            isPublished: true,
            updatedAt: '2026-08-18',
          },
        ],
        faculty: [
          {
            id: 1011,
            departmentId: 2,
            name: 'Dr. Rajendra B. Kulkarni',
            designation: 'Professor & Head of Department',
            qualification: 'Ph.D. (Design Engg.), M.E.',
            specialization: 'Robotics, Tribology & Vibration Analysis',
            email: 'hod.mech@svcoer.edu.in',
            experienceYears: 24,
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            isHod: true,
            sortOrder: 1,
          },
        ],
        labs: [
          {
            id: 2011,
            departmentId: 2,
            name: 'Tata CIII Industrial Robotics & CNC Lab',
            areaSqFt: 2400,
            equipmentSummary: 'KUKA 6-Axis Industrial Cobot, 5-Axis CNC Machining Centre',
            incharge: 'Dr. Rajendra B. Kulkarni',
          },
        ],
      },
      {
        id: 3,
        slug: 'civil',
        code: 'CIVIL',
        name: 'Civil Engineering',
        shortName: 'Civil',
        establishedYear: 2001,
        intakeCapacity: 120,
        nbaStatus: 'NBA Accredited',
        hodName: 'Dr. Suhas V. Patwardhan',
        hodMessage:
          'Civil Engineering at SVERI focuses on climate-resilient infrastructure, GIS surveying, and active regional soil/concrete testing consultancy.',
        overview:
          'Offering B.Tech Civil Engineering (120 intake) and M.Tech in Structural Engineering / Ph.D. Research Centre with NABL-aligned material testing laboratory serving PWD and municipal bodies.',
        vision: 'To engineer resilient, sustainable infrastructure through applied research and field consultancy.',
        mission: 'Train socially responsible civil engineers fluent in BIM, Geomatics, and Structural Safety.',
        heroImageUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
        subPages: [
          {
            id: 31,
            departmentId: 3,
            slug: 'about',
            title: 'About Department',
            contentHtml:
              '<h2>Civil &amp; Structural Engineering</h2><p>Generating over INR 28 Lakhs annually in third-party structural and geotechnical testing consultancy for regional infrastructure projects.</p>',
            sortOrder: 1,
            isPublished: true,
            updatedAt: '2026-09-09',
          },
        ],
        faculty: [
          {
            id: 1021,
            departmentId: 3,
            name: 'Dr. Suhas V. Patwardhan',
            designation: 'Professor & Head of Department',
            qualification: 'Ph.D. (Structural Engg.)',
            specialization: 'Earthquake Resistant Design & Bio-Concrete',
            email: 'hod.civil@svcoer.edu.in',
            experienceYears: 20,
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            isHod: true,
            sortOrder: 1,
          },
        ],
        labs: [
          {
            id: 2021,
            departmentId: 3,
            name: 'Heavy Structures & Concrete Testing Lab',
            areaSqFt: 2100,
            equipmentSummary: '1000 kN UTM, Rebound Hammer, Ultrasonic Pulse Velocity Tester',
            incharge: 'Dr. Suhas V. Patwardhan',
          },
        ],
      },
      {
        id: 4,
        slug: 'entc',
        code: 'ENTC',
        name: 'Electronics & Telecommunication Engineering',
        shortName: 'E&TC',
        establishedYear: 1998,
        intakeCapacity: 120,
        nbaStatus: 'NBA Accredited',
        hodName: 'Dr. Vandana P. Chavan',
        hodMessage:
          'From VLSI chip design and Embedded RTOS to 5G RF systems, our E&TC students build production hardware from semester two.',
        overview:
          'Equipped with Cadence VLSI tools, Texas Instruments Embedded Systems Centre, Ph.D. Research Centre, and RF Anechoic measurement bench.',
        vision: 'To excel in semiconductor design, embedded intelligence, and next-generation communication systems.',
        mission: 'Empower students with hardware-software co-design expertise aligned to India Semiconductor Mission.',
        heroImageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        subPages: [
          {
            id: 41,
            departmentId: 4,
            slug: 'about',
            title: 'About Department',
            contentHtml:
              '<h2>Semiconductor &amp; Embedded Focus</h2><p>Partnering with Texas Instruments University Program and Cadence Academic Network to deliver industry-ready VLSI &amp; Embedded Engineers.</p>',
            sortOrder: 1,
            isPublished: true,
            updatedAt: '2026-09-14',
          },
        ],
        faculty: [
          {
            id: 1031,
            departmentId: 4,
            name: 'Dr. Vandana P. Chavan',
            designation: 'Professor & Head of Department',
            qualification: 'Ph.D. (VLSI & Signal Processing)',
            specialization: 'Low-Power ASIC Design & Biomedical Signal Processing',
            email: 'hod.entc@svcoer.edu.in',
            experienceYears: 22,
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            isHod: true,
            sortOrder: 1,
          },
        ],
        labs: [
          {
            id: 2031,
            departmentId: 4,
            name: 'VLSI Design & FPGA Prototyping Lab',
            areaSqFt: 1350,
            equipmentSummary: 'Xilinx Vivado Boards, Cadence Virtuoso Suite, Logic Analyzers',
            incharge: 'Dr. Vandana P. Chavan',
          },
        ],
      },
      {
        id: 5,
        slug: 'electrical',
        code: 'ELEC',
        name: 'Electrical Engineering',
        shortName: 'Electrical',
        establishedYear: 2010,
        intakeCapacity: 60,
        nbaStatus: 'AICTE Approved',
        hodName: 'Dr. M. R. Joshi',
        hodMessage:
          'Preparing power system, smart grid, and electric vehicle drive engineers with strong laboratory and industrial field exposure.',
        overview:
          'Offers B.Tech in Electrical Engineering (60 intake) with dedicated High Voltage, Power Electronics, PLC/SCADA, and Renewable Microgrid laboratories.',
        vision: 'To build competent electrical engineers driving clean energy transition and industrial automation.',
        mission: 'Integrate hands-on power systems training with EV powertrain and smart grid research.',
        heroImageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        subPages: [
          {
            id: 51,
            departmentId: 5,
            slug: 'about',
            title: 'About Department',
            contentHtml:
              '<h2>Electrical Engineering Department</h2><p>B.Tech Electrical Engineering (Sanctioned Intake: 60) equips students in power generation, drives, PLC automation, and solar microgrids.</p>',
            sortOrder: 1,
            isPublished: true,
            updatedAt: '2026-09-18',
          },
          {
            id: 52,
            departmentId: 5,
            slug: 'syllabus',
            title: 'Syllabus & Curriculum',
            contentHtml:
              '<h2>NEP 2020 Autonomous Syllabus</h2><p>Covers Power Systems, Industrial Drives, EV Battery Management, and SCADA Automation.</p>',
            sortOrder: 2,
            isPublished: true,
            updatedAt: '2026-09-18',
          },
        ],
        faculty: [
          {
            id: 1041,
            departmentId: 5,
            name: 'Dr. M. R. Joshi',
            designation: 'Professor & Head of Department',
            qualification: 'Ph.D. (Electrical Engg.)',
            specialization: 'Smart Grids & Power Electronics',
            email: 'hod.elec@svcoer.edu.in',
            experienceYears: 18,
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            isHod: true,
            sortOrder: 1,
          },
        ],
        labs: [
          {
            id: 2041,
            departmentId: 5,
            name: 'Power Systems & EV Drives Lab',
            areaSqFt: 1650,
            equipmentSummary: 'MATLAB Simulink RT, Three-Phase Synchronous Machines, PLC Bench',
            incharge: 'Dr. M. R. Joshi',
          },
        ],
      },
      {
        id: 6,
        slug: 'electronics-computer',
        code: 'ECS',
        name: 'Electronics & Computer Engineering',
        shortName: 'ECS',
        establishedYear: 2022,
        intakeCapacity: 60,
        nbaStatus: 'AICTE Approved',
        hodName: 'Prof. P. S. Sawant',
        hodMessage:
          'Bridging embedded hardware architecture with modern software engineering, cloud IoT, and edge AI development.',
        overview:
          'Offers B.Tech in Electronics & Computer Engineering (60 intake) combining firmware, ARM/RISC-V systems, full-stack software, and edge computing.',
        vision: 'To develop versatile engineers fluent across silicon-to-cloud system stacks.',
        mission: 'Deliver project-based interdisciplinary training in Embedded IoT, Linux Kernel, and Cloud APIs.',
        heroImageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        subPages: [
          {
            id: 61,
            departmentId: 6,
            slug: 'about',
            title: 'About Department',
            contentHtml:
              '<h2>Electronics &amp; Computer Engineering</h2><p>B.Tech Electronics &amp; Computer Engineering (Sanctioned Intake: 60) unifies digital electronics, embedded Linux, and enterprise software engineering.</p>',
            sortOrder: 1,
            isPublished: true,
            updatedAt: '2026-09-20',
          },
          {
            id: 62,
            departmentId: 6,
            slug: 'syllabus',
            title: 'Syllabus & Curriculum',
            contentHtml:
              '<h2>NEP 2020 Hybrid Curriculum</h2><p>Core courses include Embedded C/RTOS, Computer Architecture, Full-Stack Web Systems, and Edge AI.</p>',
            sortOrder: 2,
            isPublished: true,
            updatedAt: '2026-09-20',
          },
        ],
        faculty: [
          {
            id: 1051,
            departmentId: 6,
            name: 'Prof. P. S. Sawant',
            designation: 'Associate Professor & Head of Department',
            qualification: 'M.Tech (Embedded Systems & CSE)',
            specialization: 'IoT Edge Computing & Embedded Linux',
            email: 'hod.ecs@svcoer.edu.in',
            experienceYears: 14,
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            isHod: true,
            sortOrder: 1,
          },
        ],
        labs: [
          {
            id: 2051,
            departmentId: 6,
            name: 'Embedded Computing & Cloud IoT Lab',
            areaSqFt: 1300,
            equipmentSummary: 'ARM Cortex Kits, Raspberry Pi Edge Clusters, Oscilloscopes',
            incharge: 'Prof. P. S. Sawant',
          },
        ],
      },
    ],

    sliders: [
      {
        id: 1,
        title: 'Empowering Engineering Excellence Under NEP 2020',
        caption:
          'Autonomous Institution (AY 2024–25) · NAAC A+ (CGPA 3.46) · NBA Accredited B.Tech Programs · DTE Code 06220 · UGC Public Self-Disclosure.',
        imageUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
        ctaLabel: 'Explore Admissions & FRA Fee Structure',
        ctaLink: '/page/prospectus-fee-structure',
        sortOrder: 1,
        isActive: true,
      },
      {
        id: 2,
        title: 'Industry 4.0 Robotics, AI & Semiconductor Innovation',
        caption:
          'Funded DST-SERB & AICTE-MODROBS laboratories driving real-world undergraduate research and 18+ incubated start-ups.',
        imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        ctaLabel: 'Visit CSE Department Microsite',
        ctaLink: '/department/computer-science',
        sortOrder: 2,
        isActive: true,
      },
      {
        id: 3,
        title: 'Central Knowledge Centre & 24x7 Research Atrium',
        caption:
          '68,450+ print volumes, IEEE/Springer digital subscriptions, and barrier-free assistive learning workstations.',
        imageUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
        ctaLabel: 'View Quick Links & Document Center',
        ctaLink: '/quick-links',
        sortOrder: 3,
        isActive: true,
      },
    ],

    ticker: [
      {
        id: 1,
        text: 'FRA-Fee Structure 2026–27 Approved & Published under Admissions & Fee',
        linkUrl: '/page/prospectus-fee-structure',
        badgeText: 'FRA Fee',
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 2,
        text: 'First Year B.Tech & Direct Second Year CAP Admissions 2026–27 Open (DTE Code: 06220)',
        linkUrl: '/page/admission-process',
        badgeText: 'Admissions',
        isActive: true,
        sortOrder: 2,
      },
      {
        id: 3,
        text: 'UGC Guidelines on Public Self-Disclosure (NEP 2020) Compliance Portal Live',
        linkUrl: '/quick-links',
        badgeText: 'UGC Mandatory',
        isActive: true,
        sortOrder: 3,
      },
      {
        id: 4,
        text: '91.1% Placement Achieved for 2025–26 Batch · Highest Offer 18.5 LPA',
        linkUrl: '/page/placement-cell',
        badgeText: 'Placements',
        isActive: true,
        sortOrder: 4,
      },
    ],

    events: [
      {
        id: 1,
        title: 'National Conference on Sustainable Engineering & NEP 2020 Pedagogy',
        eventDate: '2026-11-28',
        category: 'Event',
        summary:
          'Two-day IEEE & ISTE co-sponsored symposium hosting keynote speakers from IIT Bombay and Tata Technologies.',
        contentHtml:
          '<p>Call for papers open across CSE, Mechanical, Civil, and E&amp;TC tracks. Student registration waivers available for SEDG scholars.</p>',
        isFeatured: true,
      },
      {
        id: 2,
        title: 'Notification: Odd Semester End-Term Examination Timetable (Nov–Dec 2026)',
        eventDate: '2026-11-04',
        category: 'Circular',
        summary:
          'Controller of Examinations releases finalized theory and practical schedules for B.Tech Sem I–VII & M.Tech.',
        contentHtml:
          '<p>Hall tickets available on student ERP; zero-dues verification closes 12 November 2026.</p>',
        isFeatured: true,
      },
      {
        id: 3,
        title: 'Team VoidPointers (CSE) Wins Smart India Hackathon Grand Finale',
        eventDate: '2026-10-22',
        category: 'Achievement',
        departmentSlug: 'computer-science',
        summary:
          'Final-year Computer Science team awarded INR 1,00,000 national prize for AI Groundwater Telemetry Platform.',
        contentHtml:
          '<p>Mentored by Dr. Siddharth R. Mane in the High-Performance AI Lab.</p>',
        isFeatured: true,
      },
      {
        id: 4,
        title: 'Faculty Recruitment Notification (Assistant / Associate Professors — UGC Norms)',
        eventDate: '2026-10-18',
        category: 'Notice',
        summary:
          'Applications invited in CSE (AI/ML), VLSI, and Structural Engineering as per AICTE/UGC 7th Pay & Reservation Roster.',
        contentHtml:
          '<p>Apply within 21 days to registrar@svcoer.edu.in with attested academic credentials.</p>',
        isFeatured: false,
      },
    ],

    documents: [
      {
        id: 1,
        title: 'UGC Guidelines on Public Self-Disclosure by Higher Education Institutions (NEP 2020)',
        category: 'UGC & AICTE Approvals',
        fileUrl: UGC_PDF_URL,
        fileName: 'UGC-Public-Self-Disclosure-Guidelines.pdf',
        fileSizeBytes: 512400,
        mimeType: 'application/pdf',
        uploadedAt: '2026-10-01',
        uploadedBy: 'IQAC Officer',
        isQuickLink: true,
      },
      {
        id: 2,
        title: 'FRA Approved Fee Structure Notification (AY 2026–27)',
        category: 'Fee Structure',
        fileUrl: UGC_PDF_URL,
        fileName: 'FRA-Fee-Structure-2026-27.pdf',
        fileSizeBytes: 342100,
        mimeType: 'application/pdf',
        uploadedAt: '2026-09-24',
        uploadedBy: 'IQAC Officer',
        isQuickLink: true,
      },
      {
        id: 3,
        title: 'Academic Calendar 2026–27 (Odd & Even Semesters)',
        category: 'Academic Calendar',
        fileUrl: UGC_PDF_URL,
        fileName: 'SVCOER-Academic-Calendar-2026-27.pdf',
        fileSizeBytes: 284000,
        mimeType: 'application/pdf',
        uploadedAt: '2026-07-02',
        uploadedBy: 'IQAC Officer',
        isQuickLink: true,
      },
      {
        id: 4,
        title: 'Autonomous B.Tech CSE NEP 2020 Syllabus (R-24 Pattern)',
        category: 'Syllabus',
        fileUrl: UGC_PDF_URL,
        fileName: 'BTech-CSE-NEP2020-Syllabus.pdf',
        fileSizeBytes: 1420000,
        mimeType: 'application/pdf',
        uploadedAt: '2026-08-12',
        uploadedBy: 'CSE Dept Admin',
        isQuickLink: true,
      },
      {
        id: 5,
        title: 'NAAC Cycle 2 Self-Study Report & Accreditation Certificate (A+)',
        category: 'NAAC / NBA / NIRF',
        fileUrl: UGC_PDF_URL,
        fileName: 'NAAC-A-Plus-Certificate-SVCOER.pdf',
        fileSizeBytes: 890500,
        mimeType: 'application/pdf',
        uploadedAt: '2026-08-20',
        uploadedBy: 'IQAC Officer',
        isQuickLink: true,
      },
      {
        id: 6,
        title: 'Audited Balance Sheet, Income & Expenditure Account (FY 2025–26)',
        category: 'Annual Reports & Audits',
        fileUrl: UGC_PDF_URL,
        fileName: 'Statutory-Audit-Report-FY2025-26.pdf',
        fileSizeBytes: 645000,
        mimeType: 'application/pdf',
        uploadedAt: '2026-09-30',
        uploadedBy: 'Super Admin',
        isQuickLink: true,
      },
      {
        id: 7,
        title: 'AICTE Extension of Approval (EoA) 2026–27 & UGC 2(f)/12(B) Letter',
        category: 'UGC & AICTE Approvals',
        fileUrl: UGC_PDF_URL,
        fileName: 'AICTE-EoA-2026-27-UGC-2f-12B.pdf',
        fileSizeBytes: 428000,
        mimeType: 'application/pdf',
        uploadedAt: '2026-09-12',
        uploadedBy: 'IQAC Officer',
        isQuickLink: true,
      },
      {
        id: 8,
        title: 'Student Grievance & Anti-Ragging Affidavit Proforma',
        category: 'Circulars & Forms',
        fileUrl: UGC_PDF_URL,
        fileName: 'Anti-Ragging-Affidavit-Form.pdf',
        fileSizeBytes: 189000,
        mimeType: 'application/pdf',
        sourceType: 'upload',
        uploadedAt: '2026-08-05',
        uploadedBy: 'Content Editor',
        isQuickLink: false,
      },
      {
        id: 9,
        title: 'Autonomous Exam Question Bank & Syllabus Archive (Google Drive)',
        category: 'Syllabus',
        fileUrl: 'https://drive.google.com/drive/folders/1SVCOER-Autonomous-Repo',
        fileName: 'drive.google.com/folders/1SVCOER-Autonomous-Repo',
        fileSizeBytes: 0,
        mimeType: 'text/uri-list',
        sourceType: 'external',
        uploadedAt: '2026-11-04',
        uploadedBy: 'Dr. M. S. Kumbhar (CoE)',
        isQuickLink: true,
      },
    ],

    gallery: [
      {
        id: 1,
        title: 'Campus Infrastructure & Green Grounds',
        category: 'Campus',
        eventDate: '2026-09-10',
        coverUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
        photos: [
          {
            id: 101,
            imageUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
            caption: 'Main Academic Block & Landscaped Quadrangle',
            altText: 'Aerial architectural view of SVCOER main sandstone and glass engineering building',
          },
          {
            id: 102,
            imageUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
            caption: 'Central Library & Digital Knowledge Atrium',
            altText: 'Students studying inside the sunlit Central Library reading hall',
          },
        ],
      },
      {
        id: 2,
        title: 'Annual Convocation & Technovate Symposium 2026',
        category: 'Events',
        eventDate: '2026-10-04',
        coverUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
        photos: [
          {
            id: 201,
            imageUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
            caption: 'Degree Conferral Ceremony in Central Auditorium',
            altText: 'Graduating engineering students receiving degrees on stage in the auditorium',
          },
          {
            id: 202,
            imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
            caption: 'Robotics & AI Project Exhibition',
            altText: 'Engineering students demonstrating robotic arm projects in the laboratory',
          },
        ],
      },
      {
        id: 3,
        title: 'Research & Innovation Laboratories',
        category: 'Laboratories',
        eventDate: '2026-08-22',
        coverUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        photos: [
          {
            id: 301,
            imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
            caption: 'Industry 4.0 Cobot & Embedded Systems Lab',
            altText: 'Students collaborating with faculty around an industrial robotic arm',
          },
        ],
      },
    ],

    telephoneDirectory: [
      {
        id: 1,
        section: 'Principal Office',
        officerName: 'Dr. B. P. Ronge',
        designation: 'Principal & Director',
        extension: '101',
        directPhone: '+91-02186-216063',
        email: 'principal@coe.sveri.ac.in',
      },
      {
        id: 2,
        section: 'Registrar & RTI Cell',
        officerName: 'Shri S. G. Kulkarni',
        designation: 'Registrar & PIO',
        extension: '102',
        directPhone: '+91-02186-216062',
        email: 'coe@coe.sveri.ac.in',
      },
      {
        id: 3,
        section: 'Admissions & CAP Cell',
        officerName: 'Prof. S. M. Pawar',
        designation: 'Admission Coordinator',
        extension: '108',
        directPhone: '+91-9545553888',
        email: 'admissions@svcoer.edu.in',
      },
      {
        id: 4,
        section: 'Examination Cell',
        officerName: 'Dr. M. S. Kumbhar',
        designation: 'Controller of Examinations',
        extension: '112',
        directPhone: '+91-02186-216061',
        email: 'coe@coe.sveri.ac.in',
      },
      {
        id: 5,
        section: 'Training & Placement',
        officerName: 'Prof. A. D. Kale',
        designation: 'Training & Placement Officer',
        extension: '115',
        directPhone: '+91 2186 225092',
        email: 'tpo@svcoer.edu.in',
      },
      {
        id: 6,
        section: 'Accounts & Scholarship',
        officerName: 'CA Rajeshwar V. Shinde',
        designation: 'Finance Officer',
        extension: '118',
        directPhone: '+91 2186 225086',
        email: 'finance@svcoer.edu.in',
      },
      {
        id: 7,
        section: 'Anti-Ragging & Security',
        officerName: 'Dr. P. K. Deshmukh',
        designation: 'Chief Vigilance & Anti-Ragging Officer',
        extension: '199',
        directPhone: '+91 2186 225099',
        email: 'antiragging@svcoer.edu.in',
      },
    ],

    users: [
      {
        id: 1,
        fullName: 'Dr. Vikramaditya Kulkarni',
        email: 'admin@svcoer.edu.in',
        role: 'super_admin',
        assignedDepartmentId: null,
        isActive: true,
        passwordHash: hashPassword('Admin@123'),
        lastLoginAt: '2026-11-11 09:30',
      },
      {
        id: 2,
        fullName: 'Prof. Sneha Patwardhan (PRO)',
        email: 'pro@svcoer.edu.in',
        role: 'content_editor',
        assignedDepartmentId: null,
        isActive: true,
        passwordHash: hashPassword('Editor@123'),
        lastLoginAt: '2026-11-10 14:15',
      },
      {
        id: 3,
        fullName: 'Dr. Anjali K. Deshpande (CSE)',
        email: 'hod.cse@svcoer.edu.in',
        role: 'department_admin',
        assignedDepartmentId: 1,
        isActive: true,
        passwordHash: hashPassword('Dept@123'),
        lastLoginAt: '2026-11-10 11:05',
      },
      {
        id: 4,
        fullName: 'Dr. M. M. Pawar (IQAC)',
        email: 'iqac@svcoer.edu.in',
        role: 'iqac_officer',
        assignedDepartmentId: null,
        allowedCategories: [],
        allowedPageIds: [],
        isActive: true,
        passwordHash: hashPassword('Iqac@123'),
        lastLoginAt: '2026-11-11 08:45',
      },
      {
        id: 5,
        fullName: 'Dr. M. S. Kumbhar (Controller of Examinations)',
        email: 'coe@coe.sveri.ac.in',
        role: 'exam_controller',
        assignedDepartmentId: null,
        allowedCategories: ['examination'],
        allowedPageIds: [],
        isActive: true,
        passwordHash: hashPassword('Exam@123'),
        lastLoginAt: '2026-11-12 10:15',
      },
    ],

    auditLogs: [
      {
        id: 1,
        actorEmail: 'iqac@svcoer.edu.in',
        actorRole: 'iqac_officer',
        action: 'PUBLISH_DOCUMENT',
        entityType: 'Document',
        entityTitle: 'FRA Approved Fee Structure Notification (AY 2026–27)',
        timestamp: '2026-11-10 16:40:12',
      },
      {
        id: 2,
        actorEmail: 'hod.cse@svcoer.edu.in',
        actorRole: 'department_admin',
        action: 'UPDATE_DEPT_SUBPAGE',
        entityType: 'DepartmentSubPage',
        entityTitle: 'CSE · Student Achievements',
        timestamp: '2026-11-09 11:18:04',
      },
      {
        id: 3,
        actorEmail: 'admin@svcoer.edu.in',
        actorRole: 'super_admin',
        action: 'VERIFY_UGC_CHECKLIST',
        entityType: 'System',
        entityTitle: 'NEP 2020 Section 5(a)–5(j) Public Self-Disclosure Audit',
        timestamp: '2026-11-08 10:02:49',
      },
    ],

    settings: {
      trustName: 'Shri Vitthal Education & Research Institute (SVERI)',
      institutionName: "SVERI's College of Engineering, Pandharpur (Autonomous)",
      shortCode: 'SVERI',
      logoUrl: '',
      affiliation: 'Affiliated to PAHSUS Solapur · Approved by AICTE · Autonomous Status (AY 2024–25) · NAAC A+ (3.46)',
      aicteCode: '1-49281724',
      dteCode: '06220',
      address: 'Gopalpur-Ranjani Road, P.B. No. 54, Gopalpur, Pandharpur – 413304, Dist. Solapur, Maharashtra, India',
      phone: '+91-02186-216063',
      email: 'principal@coe.sveri.ac.in',
      emergencyHelpline: '+91-9545553888',
      antiRaggingHelpline: '1800-180-5522',
      defaultPaletteId: 'royal-navy',
      primaryColor: '#0F294A',
      secondaryColor: '#B45309',
      designPreset: 'heritage-navy',
      fontHeading: "'Playfair Display', Georgia, serif",
      fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
      cardRadius: 'rounded',
      headerStyle: 'classic',
      customCss: '',
      aboutSummary:
        "Established in 1998 under Shri Vitthal Education & Research Institute (SVERI), SVERI's College of Engineering, Pandharpur (Autonomous from AY 2024–25) is NAAC A+ (CGPA 3.46) accredited, offers NBA-accredited UG programs alongside MBA, MCA & Ph.D. centres, and upholds complete UGC public self-disclosure transparency.",
      aboutImageUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
      visionText:
        'To be nationally recognized among the best institutes in India for excellence in technical education.',
      missionItems: [
        'To impart value-based technical education through innovation and excellence, empowering individuals to become leaders in their fields to create a positive impact.',
        'To create an ambiance of academic excellence, research, and life skills by fostering a learning environment that empowers individuals to achieve their full potential.',
        'To foster strong relationships amongst all stakeholders by inculcating a personal touch and mutual respect in all interactions.',
      ],
      highlightsStats: [
        { label: 'Placement Rate', value: '91.1%' },
        { label: 'Recruiters', value: '250+' },
        { label: 'NAAC Grade', value: 'A+ (3.46)' },
        { label: 'DTE Code', value: '06220' },
        { label: 'Global Alumni', value: '11,500+' },
      ],
      approvedBodies: [
        { name: 'AICTE New Delhi', url: '/page/recognition-approval' },
        { name: 'UGC Autonomous', url: '/page/recognition-approval' },
        { name: 'NAAC A+ (3.46)', url: '/page/accreditation-ranking' },
        { name: 'PAHSUS Solapur', url: '/page/affiliating-university' },
        { name: 'DTE Code 06220', url: '/page/admission-process' },
      ],
      recruiters: [
        'TCS (Digital & Ninja)',
        'Infosys',
        'Accenture',
        'Deloitte',
        'Wipro',
        'Tech Mahindra',
        'Hexaware',
        'Bharat Forge',
        'Mahindra & Mahindra',
        'Atlas Copco',
      ],
      accreditationHighlights: [
        'Autonomous Status (AY 2024–25)',
        'NAAC A+ Accredited (CGPA 3.46)',
        'NBA Accredited Core Programs',
        'NIRF Ranked · DTE Code 06220',
        'AICTE Approved · 250+ Recruiters',
      ],
      topBarLinks: [
        { label: 'Quick Links', url: '/quick-links' },
        { label: 'Examination Cell', url: '/category/examination' },
        { label: 'FRA Fee Structure', url: '/page/prospectus-fee-structure' },
        { label: 'RTI Disclosure', url: '/page/rti-disclosure' },
        { label: 'Mandatory Disclosures', url: '/page/about-overview' },
        { label: 'Circulars & Notices', url: '/page/circulars-notices' },
        { label: 'Placements', url: '/page/placement-cell' },
      ],
      footerColumns: [
        {
          title: 'UGC Mandatory Disclosure',
          links: [
            { label: 'About HEI & Statutes', url: '/page/about-overview' },
            { label: 'Annual Reports & Audits', url: '/page/annual-accounts-audit' },
            { label: 'Statutory Officers', url: '/page/statutory-officers' },
            { label: 'IQAC Quality Cell', url: '/page/iqac' },
          ],
        },
        {
          title: 'Autonomous Academics & Exam',
          links: [
            { label: 'Examination Cell & CoE', url: '/category/examination' },
            { label: 'Exam Time Tables & Results', url: '/page/exam-timetable-hallticket' },
            { label: 'Computer Science & Engg.', url: '/department/computer-science' },
            { label: 'Mechanical & Core Depts', url: '/page/academic-programs' },
          ],
        },
        {
          title: 'Student Support & Cells',
          links: [
            { label: 'Training & Placement Cell', url: '/page/placement-cell' },
            { label: 'Student Grievance (SGRC)', url: '/page/sgrc' },
            { label: 'Anti-Ragging & ICC', url: '/page/anti-ragging-cell' },
            { label: 'Downloadable Repository', url: '/quick-links' },
          ],
        },
      ],
      socialLinks: {
        facebook: 'https://facebook.com',
        linkedin: 'https://linkedin.com',
        youtube: 'https://youtube.com',
        twitter: 'https://x.com',
      },
      mapEmbedQuery: 'Pandharpur,Maharashtra,India',
      maxPhotoUploadMb: 2,
      maxDocumentUploadMb: 10,
      autoCropImages: true,
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
        aboutHeading: 'ABOUT US',
        downloadsHeading: 'DOWNLOADS',
        leadershipHeading: 'OUR DESK & LEADERSHIP',
        examinationHeading: 'AUTONOMOUS EXAMINATION PORTAL',
        departmentsHeading: 'Academic Departments',
        categoriesHeading: 'Statutory Self-Disclosure & Autonomous Portals',
      },
      customHomeComponents: [],
      researchSliderSlides: [
        {
          id: 1,
          title: 'ICAEST-2026: 3rd International Conference on Engineering & Smart Technology',
          caption: 'Hybrid Flagship Conference · 18–19 Dec 2026 · Call for Papers Open',
          imageUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
          ctaLabel: 'Explore ICAEST-2026',
          ctaLink: '/conference/icaest-2026',
        },
        {
          id: 2,
          title: 'NCEI-2026: National Conference on NEP 2020 & Sustainable Innovations',
          caption: 'Indigenous Engineering Solutions, IDEA Lab Prototypes & ISBN Proceedings',
          imageUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
          ctaLabel: 'Explore NCEI-2026',
          ctaLink: '/conference/ncei-2026',
        },
        {
          id: 3,
          title: 'Hands-On Research Workshops, FDPs & Patent Clinics',
          caption: 'Department-hosted technical workshops in Edge AI, EV Powertrains & VLSI Design',
          imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
          ctaLabel: 'View Research Workshops',
          ctaLink: '/conference/ai-edge-workshop-2026',
        },
      ],
      portalMenuItems: structuredClone(DEFAULT_PORTAL_MENU_ITEMS),
      grievancePortal: structuredClone(DEFAULT_GRIEVANCE_PORTAL_CONFIG),
      intakePrograms: structuredClone(DEFAULT_INTAKE_PROGRAMS),
    },
    alumni: createSeedAlumniData(),
    conferences: [
      {
        id: 1,
        slug: 'icaest-2026',
        title: '3rd International Conference on Advances in Engineering & Smart Technology',
        shortName: 'ICAEST-2026',
        scope: 'International Conference',
        theme: 'AI-Driven Cyber-Physical Systems, Sustainable Civil Infrastructure & Clean Energy',
        startDate: '2026-12-18',
        endDate: '2026-12-19',
        venue: "SVERI's College of Engineering Auditorium, Gopalpur, Pandharpur",
        mode: 'Hybrid (On-Campus + Online)',
        organizingDepartment: 'CSE, E&TC, Mechanical, Electrical & Civil Engineering',
        indexingPartners: ['IEEE Xplore / Scopus (Proposed)', 'Springer Lecture Notes', 'UGC Care Group-II'],
        contactEmail: 'icaest2026@coe.sveri.ac.in',
        contactPhone: '+91-02186-216063',
        bannerUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
        heroSlides: [
          {
            id: 1,
            title: '3rd International Conference on Advances in Engineering & Smart Technology',
            caption: 'AI-Driven Cyber-Physical Systems, Sustainable Civil Infrastructure & Clean Energy',
            imageUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
          },
          {
            id: 2,
            title: 'Keynote Talks by IIT Bombay & TU Munich Researchers',
            caption: 'Double-blind peer review, 4 technical tracks, and Scopus/IEEE proceedings support.',
            imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
          },
          {
            id: 3,
            title: 'Hybrid Research Presentation & Industrial Networking',
            caption: 'Present in-person at Pandharpur or virtually via dedicated track rooms.',
            imageUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
          },
        ],
        brochureUrl: '/page/research-development-cell',
        templateUrl: '/quick-links',
        enablePosterPresentation: true,
        posterDimensions: 'A0 Portrait (841 x 1189 mm)',
        posterGuidelinesHtml: '<p>Accepted poster presenters must display an A0 vertical poster (841 &times; 1189 mm) in the Research Atrium Expo Hall. Include Title, Authors &amp; Affiliation, Problem Statement, Architecture/Methodology, Quantitative Benchmarks, and QR code to demo/repository.</p>',
        posterTemplateUrl: '/quick-links',
        posterPrizesText: 'Best Poster Awards (₹15,000 Prize Pool + Excellence Certificates per Track)',
        posterItems: [
          {
            id: 1,
            posterCode: 'PST-101',
            title: 'Federated TinyML Fault Diagnosis for Rural Microgrids',
            authors: 'S. V. Deshpande, Dr. A. K. Kulkarni',
            affiliation: 'Dept. of Electrical Engg., SVCOER Pandharpur',
            track: 'Track 3: EV Powertrains & Smart Microgrids',
            abstract: 'Edge inference quantization pipeline achieving 96.4% transformer fault detection accuracy on ESP32-S3 hardware.',
            imageUrl: '/src/assets/images/poster_session_1794991330669.jpg',
            awardNote: 'Featured Track-3 Poster',
            sortOrder: 1,
          },
          {
            id: 2,
            posterCode: 'PST-102',
            title: 'RISC-V Hardware Root-of-Trust Accelerator for Smart Sensors',
            authors: 'P. R. Kulkarni, Dr. R. B. Patwardhan',
            affiliation: 'Dept. of E&TC Engg., SVCOER Pandharpur',
            track: 'Track 2: VLSI, Embedded Robotics & 6G IoT Networks',
            abstract: 'Ultra-low-power AES-GCM + SHA-256 co-processor synthesized at 45nm technology node.',
            imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
            awardNote: 'Industry Jury Nominee',
            sortOrder: 2,
          },
        ],
        overviewHtml: `<p><strong>ICAEST-2026</strong> brings together international researchers, industry architects, and doctoral scholars to present peer-reviewed innovations across Artificial Intelligence, Edge Robotics, EV Powertrains, Microgrid Automation, and Resilient Smart Cities.</p><p>Selected peer-reviewed papers presented at the conference will be submitted for indexing and extended journal special issues.</p>`,
        cfpHtml: `<p>Original, unpublished full-length research papers (6–8 pages in double-column IEEE format) as well as Poster Presentation abstracts are invited across the four technical tracks listed below. All submissions undergo double-blind peer review and Turnitin plagiarism screening (&le; 15%).</p>`,
        isPublished: true,
        isFeatured: true,
        sortOrder: 1,
        tracks: [
          {
            id: 1,
            title: 'Track 1: Generative AI, Cloud Native Systems & Cybersecurity',
            chair: 'Dr. S. P. Deshmukh',
            description: 'Foundation models, edge ML optimization, zero-trust cloud architectures, and privacy-preserving federated learning.',
          },
          {
            id: 2,
            title: 'Track 2: VLSI, Embedded Robotics & 6G IoT Networks',
            chair: 'Dr. R. B. Patwardhan',
            description: 'Low-power ASIC/FPGA design, autonomous UAV navigation, RISC-V accelerators, and smart agricultural sensing.',
          },
          {
            id: 3,
            title: 'Track 3: EV Powertrains, Thermal Systems & Smart Microgrids',
            chair: 'Dr. A. K. Kulkarni',
            description: 'Battery management systems, digital twins in additive manufacturing, solar-wind hybrid microgrids, and HVDC protection.',
          },
          {
            id: 4,
            title: 'Track 4: Green Concrete, GIS & Resilient Infrastructure',
            chair: 'Dr. V. M. Jadhav',
            description: 'Low-carbon geopolymer concrete, structural health monitoring with drones, and watershed hydrological modeling.',
          },
        ],
        importantDates: [
          { id: 1, label: 'Full Paper Submission Deadline', date: '2026-11-25', statusNote: 'Open Now' },
          { id: 2, label: 'Notification of Acceptance', date: '2026-12-03', statusNote: 'Double-Blind Review' },
          { id: 3, label: 'Camera-Ready Paper & Registration', date: '2026-12-10', statusNote: 'Mandatory' },
          { id: 4, label: 'Conference Inauguration & Technical Sessions', date: '2026-12-18', statusNote: 'Hybrid Mode' },
        ],
        people: [
          {
            id: 1,
            kind: 'keynote',
            role: 'Keynote Speaker',
            name: 'Prof. Dr. Rajesh K. Sharma',
            designation: 'Professor, Dept. of Computer Science',
            affiliation: 'IIT Bombay, Mumbai',
            email: 'keynote.icaest@coe.sveri.ac.in',
            phone: '+91-022-2576-0000',
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            bio: 'IEEE Fellow specializing in trustworthy edge AI and autonomous cyber-physical systems.',
            sortOrder: 1,
          },
          {
            id: 2,
            kind: 'keynote',
            role: 'Keynote Speaker',
            name: 'Dr. Elena Rostova',
            designation: 'Director of Smart Grid Research',
            affiliation: 'TU Munich, Germany',
            email: 'elena.speaker@coe.sveri.ac.in',
            photoUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
            bio: 'Leading European consortium researcher on bidirectional EV grid balancing and renewable storage.',
            sortOrder: 2,
          },
          {
            id: 3,
            kind: 'committee',
            role: 'General Chair',
            name: 'Dr. Prashant M. Pawar',
            designation: 'Principal & Professor',
            affiliation: "SVERI's College of Engineering, Pandharpur",
            email: 'principal@coe.sveri.ac.in',
            phone: '+91-02186-216063',
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            bio: '24+ years in structural engineering, AICTE/DST funded R&D, and autonomous higher education.',
            sortOrder: 3,
          },
          {
            id: 4,
            kind: 'committee',
            role: 'Convener',
            name: 'Dr. M. S. Kadam',
            designation: 'Dean R&D & Professor',
            affiliation: 'R&D Cell, SVCOER Pandharpur',
            email: 'icaest2026@coe.sveri.ac.in',
            phone: '+91-02186-216066',
            photoUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
            bio: 'Coordinating international TPC reviewers, IEEE publication workflow, and hybrid track logistics.',
            sortOrder: 4,
          },
        ],
        schedule: [
          {
            id: 1,
            dayLabel: 'Day 1 (18 Dec)',
            timeSlot: '09:30 AM – 11:00 AM',
            trackTitle: 'Plenary',
            sessionTitle: 'Inaugural Ceremony & Keynote: Trustworthy Edge AI for Societal Scale',
            speakerOrChair: 'Prof. Dr. Rajesh K. Sharma (IIT Bombay)',
            venue: 'Central Auditorium & Zoom Live',
          },
          {
            id: 2,
            dayLabel: 'Day 1 (18 Dec)',
            timeSlot: '11:30 AM – 01:30 PM',
            trackTitle: 'Track 1 & Track 2',
            sessionTitle: 'Parallel Paper Presentations: AI, Cloud & VLSI Systems',
            speakerOrChair: 'Dr. S. P. Deshmukh & Dr. R. B. Patwardhan',
            venue: 'Seminar Halls A & B',
          },
          {
            id: 3,
            dayLabel: 'Day 2 (19 Dec)',
            timeSlot: '10:00 AM – 12:30 PM',
            trackTitle: 'Track 3 & Track 4',
            sessionTitle: 'Keynote & Technical Presentations: Smart Microgrids & Green Infrastructure',
            speakerOrChair: 'Dr. Elena Rostova (TU Munich)',
            venue: 'Central Auditorium & Online Room 2',
          },
        ],
        feeTiers: [
          {
            id: 1,
            categoryLabel: 'UG / PG Student & Research Scholar',
            inrAmount: '₹2,500',
            usdAmount: '$50',
            includesNote: 'Paper presentation, digital proceedings, certificate & conference kit',
          },
          {
            id: 2,
            categoryLabel: 'Academician / Faculty Member',
            inrAmount: '₹4,000',
            usdAmount: '$80',
            includesNote: 'Full access, IEEE/Scopus processing support & gala dinner',
          },
          {
            id: 3,
            categoryLabel: 'Industry / R&D Delegate',
            inrAmount: '₹6,000',
            usdAmount: '$120',
            includesNote: 'Includes industry networking roundtable & exhibition booth access',
          },
        ],
      },
      {
        id: 2,
        slug: 'ncei-2026',
        title: 'National Conference on NEP 2020 & Sustainable Rural Engineering Innovations',
        shortName: 'NCEI-2026',
        scope: 'National Conference',
        theme: 'Multidisciplinary Outcome-Based Education & Indigenous Engineering Solutions',
        startDate: '2027-02-06',
        endDate: '2027-02-07',
        venue: 'SVCOER Seminar Complex, Pandharpur',
        mode: 'On-Campus (In-Person)',
        organizingDepartment: 'IQAC & All Autonomous Engineering Departments',
        indexingPartners: ['ISBN Conference Proceedings', 'Institution Journal of Rural Tech'],
        contactEmail: 'ncei2026@coe.sveri.ac.in',
        contactPhone: '+91-02186-216063',
        bannerUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
        heroSlides: [
          {
            id: 1,
            title: 'National Conference on NEP 2020 & Sustainable Rural Engineering Innovations',
            caption: 'Multidisciplinary Outcome-Based Education & Indigenous Engineering Solutions',
            imageUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
          },
          {
            id: 2,
            title: 'IDEA Lab Working Prototype & Rural Tech Showcase',
            caption: 'Submit hardware demos, NEP pedagogy case studies, and student research papers.',
            imageUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
          },
        ],
        brochureUrl: '/page/iqac',
        templateUrl: '/quick-links',
        overviewHtml: `<p><strong>NCEI-2026</strong> provides a national forum for engineering educators, rural entrepreneurs, and AICTE IDEA Lab innovators to share best practices in NEP 2020 multidisciplinary curricula and appropriate technology deployment.</p>`,
        cfpHtml: `<p>Papers and working hardware prototype abstracts are invited from faculty, students, and polytechnic/industry practitioners across India.</p>`,
        isPublished: true,
        isFeatured: true,
        sortOrder: 2,
        tracks: [
          {
            id: 1,
            title: 'Track A: NEP 2020 Multidisciplinary Pedagogies & ABC Implementation',
            chair: 'IQAC Coordinator',
            description: 'Honours/Minor tracks, Apprenticeship Embedded Degrees (AEDP), and Outcome-Based Assessment.',
          },
          {
            id: 2,
            title: 'Track B: Agro-Tech, Clean Water & Rural Energy Solutions',
            chair: 'Dr. A. K. Kulkarni',
            description: 'Low-cost precision irrigation, solar cold storage, and assistive rural mobility devices.',
          },
        ],
        importantDates: [
          { id: 1, label: 'Abstract & Prototype Submission', date: '2027-01-10', statusNote: 'Upcoming' },
          { id: 2, label: 'Registration Closes', date: '2027-01-28', statusNote: 'Upcoming' },
        ],
        people: [
          {
            id: 1,
            kind: 'committee',
            role: 'Convener',
            name: 'Prof. S. R. Jadhav',
            designation: 'IQAC Coordinator & Associate Professor',
            affiliation: 'SVCOER Pandharpur',
            email: 'iqac@coe.sveri.ac.in',
            phone: '+91-02186-216064',
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            bio: 'Coordinating national academic delegates and NAAC/NEP quality track sessions.',
            sortOrder: 1,
          },
        ],
        schedule: [
          {
            id: 1,
            dayLabel: 'Day 1 (06 Feb)',
            timeSlot: '10:00 AM – 01:00 PM',
            trackTitle: 'Track A & Track B',
            sessionTitle: 'Opening Keynote & Innovation Poster Expo',
            speakerOrChair: 'Prof. S. R. Jadhav',
            venue: 'Central Seminar Hall',
          },
        ],
        feeTiers: [
          {
            id: 1,
            categoryLabel: 'Student / Faculty Delegate',
            inrAmount: '₹1,200',
            includesNote: 'Printed ISBN proceedings, lunch & participation certificate',
          },
        ],
      },
      {
        id: 3,
        slug: 'ai-edge-workshop-2026',
        title: 'National Research Workshop on Edge AI, Robotics & Embedded IoT Systems',
        shortName: 'EDGE-WS-2026',
        scope: 'Research Workshop',
        theme: '5-Day Hands-On Bootcamp on TinyML, ROS2 Autonomous Robotics & Patent Filing',
        startDate: '2027-01-19',
        endDate: '2027-01-23',
        venue: 'NVIDIA & Robotics CoE Lab, SVCOER Pandharpur',
        mode: 'Hybrid (On-Campus + Online)',
        organizingDepartment: 'CSE & E&TC Research Cell',
        indexingPartners: ['AICTE-ISTE Approved Workshop', 'Participation & Lab Certificate'],
        contactEmail: 'workshop.rnd@coe.sveri.ac.in',
        contactPhone: '+91-02186-216065',
        bannerUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        heroSlides: [
          {
            id: 1,
            title: 'National Research Workshop on Edge AI & Autonomous Robotics',
            caption: 'Hands-on hardware labs with STM32, Jetson Orin, and ROS2 simulation.',
            imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
          },
          {
            id: 2,
            title: 'Patent Drafting & Technology Transfer Clinic',
            caption: 'Live patent prior-art search and prototype commercialization sessions.',
            imageUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
          },
        ],
        brochureUrl: '/page/central-facilities',
        templateUrl: '/quick-links',
        overviewHtml: `<p><strong>EDGE-WS-2026</strong> is a 5-day intensive research workshop designed for faculty members, Ph.D. scholars, and final-year engineering students focusing on deploying quantized AI models onto embedded robotics hardware.</p>`,
        cfpHtml: `<p>Participants may optionally submit a 2-page lab project abstract for best prototype awards during Day 5.</p>`,
        isPublished: true,
        isFeatured: true,
        sortOrder: 3,
        tracks: [
          {
            id: 1,
            title: 'Module 1: Quantized Neural Networks on Edge MCUs & GPUs',
            chair: 'Dr. Anjali K. Deshpande',
            description: 'ONNX Runtime, TensorRT, and sensor fusion pipelines.',
          },
          {
            id: 2,
            title: 'Module 2: ROS2 Autonomous Navigation & Patent Clinic',
            chair: 'Dr. M. S. Kadam',
            description: 'SLAM mapping, LiDAR telemetry, and IP protection workflow.',
          },
        ],
        importantDates: [
          { id: 1, label: 'Early Bird Registration', date: '2027-01-08', statusNote: 'Limited Lab Seats' },
          { id: 2, label: 'Workshop Commences', date: '2027-01-19', statusNote: 'On-Campus & Virtual' },
        ],
        people: [
          {
            id: 1,
            kind: 'keynote',
            role: 'Resource Person',
            name: 'Dr. Anjali K. Deshpande',
            designation: 'Professor & Head, CSE',
            affiliation: 'SVCOER Pandharpur',
            email: 'hod.cse@svcoer.edu.in',
            photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
            bio: 'Lead PI for DST-SERB Precision IoT & Edge AI sponsored project.',
            sortOrder: 1,
          },
        ],
        schedule: [
          {
            id: 1,
            dayLabel: 'Days 1–5',
            timeSlot: '10:00 AM – 04:30 PM',
            trackTitle: 'Module 1 & 2',
            sessionTitle: 'Morning Theory Briefings + Afternoon Hardware CoE Lab Sprints',
            speakerOrChair: 'CoE Research Mentors',
            venue: 'Robotics & AI Lab',
          },
        ],
        feeTiers: [
          {
            id: 1,
            categoryLabel: 'Student / Scholar Participant',
            inrAmount: '₹600',
            includesNote: 'Kit access, dataset repo & e-certificate',
          },
          {
            id: 2,
            categoryLabel: 'Faculty / Industry Participant',
            inrAmount: '₹1,200',
            includesNote: 'FDP/STTP certificate & manual',
          },
        ],
      },
    ],
    conferenceSubmissions: [
      {
        id: 1,
        conferenceId: 1,
        trackingCode: 'CONF-2026-0001',
        paperTitle: 'Federated TinyML Anomaly Detection for Industrial Predictive Maintenance',
        trackTitle: 'Track 1: Generative AI, Cloud Native Systems & Cybersecurity',
        authorName: 'Prof. A. V. Deshpande',
        authorEmail: 'avd@example.edu',
        authorPhone: '+91-98221-55110',
        affiliation: 'College of Engineering Pune (COEP Tech)',
        coAuthors: 'K. R. Patil, S. N. Joshi',
        abstractText:
          'We present an ultra-compact quantized autoencoder running on ARM Cortex-M7 edge sensors federated across factory lines without transmitting raw vibration telemetry.',
        status: 'accepted',
        reviewerNote: 'Strong experimental validation; minor formatting edits requested for camera-ready PDF.',
        submittedAt: '2026-11-08',
      },
    ],
    conferenceRegistrations: [
      {
        id: 1,
        conferenceId: 1,
        regCode: 'REG-2026-0001',
        attendeeName: 'Prof. A. V. Deshpande',
        email: 'avd@example.edu',
        phone: '+91-98221-55110',
        affiliation: 'COEP Technological University, Pune',
        designation: 'Assistant Professor',
        feeCategory: 'Academician / Faculty Member',
        participationMode: 'On-Campus (In-Person)',
        paperTrackingCode: 'CONF-2026-0001',
        paymentRef: 'NEFT-20261110-8821',
        status: 'verified',
        registeredAt: '2026-11-10',
      },
    ],
    placements: {
      summaryNote:
        "SVERI's Training & Placement Cell works closely with 250+ core engineering and Fortune 500 technology employers, achieving 91.1% overall placement consistency alongside structured Aptitude, Japanese Language, GATE, and Coding Bootcamps from Second Year onwards.",
      coordinatorName: 'Prof. S. B. Kulkarni',
      coordinatorEmail: 'tnp@coe.sveri.ac.in',
      coordinatorPhone: '+91-02186-216063',
      brochureUrl: '/quick-links?q=Placement',
      brochureLabel: 'Download T&P Information Brochure & Recruiter Kit',
      stats: [
        {
          id: 1,
          academicYear: '2025-26',
          branch: 'Computer Science & Engineering (CSE)',
          eligibleStudents: 174,
          placedStudents: 162,
          highestPackageLpa: 22.5,
          averagePackageLpa: 6.4,
          topRecruitersList: 'TCS Digital, Infosys SP, Accenture, Deloitte, Persistent, KPIT',
          sortOrder: 1,
        },
        {
          id: 2,
          academicYear: '2025-26',
          branch: 'Electronics & Telecommunication (E&TC)',
          eligibleStudents: 112,
          placedStudents: 101,
          highestPackageLpa: 16.0,
          averagePackageLpa: 5.5,
          topRecruitersList: 'Qualcomm, Bosch, Tata Elxsi, Honeywell, Cognizant',
          sortOrder: 2,
        },
        {
          id: 3,
          academicYear: '2025-26',
          branch: 'Mechanical Engineering',
          eligibleStudents: 118,
          placedStudents: 106,
          highestPackageLpa: 12.0,
          averagePackageLpa: 4.9,
          topRecruitersList: 'Bharat Forge, Atlas Copco, Tata Motors, Mahindra & Mahindra, Thermax',
          sortOrder: 3,
        },
        {
          id: 4,
          academicYear: '2025-26',
          branch: 'Civil Engineering',
          eligibleStudents: 64,
          placedStudents: 56,
          highestPackageLpa: 8.5,
          averagePackageLpa: 4.3,
          topRecruitersList: 'Larsen & Toubro, Shapoorji Pallonji, UltraTech, Tata Projects',
          sortOrder: 4,
        },
        {
          id: 5,
          academicYear: '2025-26',
          branch: 'Electrical Engineering',
          eligibleStudents: 60,
          placedStudents: 54,
          highestPackageLpa: 11.2,
          averagePackageLpa: 4.8,
          topRecruitersList: 'Tata Power, Schneider Electric, ABB, Siemens, Torrent Power',
          sortOrder: 5,
        },
      ],
      stories: [
        {
          id: 1,
          studentName: 'Aishwarya N. Patil',
          branch: 'B.Tech CSE',
          company: 'Microsoft India',
          packageLpa: '₹22.5 LPA',
          batchYear: '2026',
          photoUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
          entryType: 'Dream / Super-Dream Offer',
          headline: 'Congratulations on Securing Product Engineering Offer!',
          roleOrAward: 'Software Development Engineer',
          isFeatured: true,
          quote:
            'Daily DSA peer groups and 6-month autonomous industrial internships gave me confidence to crack top product engineering rounds directly from Pandharpur.',
          sortOrder: 1,
        },
        {
          id: 2,
          studentName: 'Pratik S. Deshmukh',
          branch: 'B.Tech Mechanical',
          company: 'Atlas Copco India',
          packageLpa: '₹12.0 LPA',
          batchYear: '2026',
          photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
          entryType: 'Core Industry Offer',
          headline: 'Selected for Core R&D Graduate Trainee Track',
          roleOrAward: 'Graduate Engineer Trainee (R&D)',
          isFeatured: false,
          quote:
            'Hands-on CAD/FEA training in our Centre of Excellence prepared me thoroughly for core R&D technical interviews.',
          sortOrder: 2,
        },
        {
          id: 3,
          studentName: 'Sneha V. Kulkarni & Team',
          branch: 'B.Tech E&TC',
          company: 'Smart India Hackathon (MoE)',
          packageLpa: '1st Prize · ₹1,00,000',
          batchYear: '2026',
          photoUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
          entryType: 'National Hackathon / Award',
          headline: 'National Winner — Hardware & Embedded Systems Edition',
          roleOrAward: 'First Rank National Winner',
          isFeatured: true,
          quote:
            'Faculty mentorship from the Innovation & IPR Cell helped our student hardware prototype outperform 42 finalist teams nationwide.',
          sortOrder: 3,
        },
      ],
      upcomingDrives: [
        {
          id: 1,
          company: 'Persistent Systems',
          roleTitle: 'Software Engineer (Full Stack & Cloud)',
          packageLpa: '₹7.5 – ₹11.0 LPA',
          driveDate: '2026-12-08',
          eligibleBranches: 'B.Tech CSE, E&TC, Electrical (CGPA >= 7.0)',
          applyUrl: '/placements',
          status: 'open',
          sortOrder: 1,
        },
        {
          id: 2,
          company: 'Bharat Forge & Atlas Copco Joint Pool Drive',
          roleTitle: 'Graduate Engineer Trainee (R&D / Design)',
          packageLpa: '₹6.5 – ₹9.2 LPA',
          driveDate: '2026-12-14',
          eligibleBranches: 'B.Tech Mechanical, Civil, Electrical',
          applyUrl: '/placements',
          status: 'upcoming',
          sortOrder: 2,
        },
      ],
      notices: [
        {
          id: 1,
          title: 'Pre-Placement Talk & Technical Test Schedule — Persistent Systems (2026 Batch)',
          noticeDate: '2026-12-02',
          category: 'Campus Drive Notice',
          summary:
            'Eligible students from CSE, E&TC, and Electrical with >= 7.0 CGPA and zero active backlogs must carry two printed resumes and college ID cards by 09:00 AM at Seminar Hall A.',
          attachmentUrl: '/quick-links',
          linkLabel: 'View Preparation Kit',
          isPinned: true,
          sortOrder: 1,
        },
        {
          id: 2,
          title: 'Mandatory Final-Year Resume Verification & T&P Portal Profile Audit',
          noticeDate: '2026-11-28',
          category: 'Student Circular',
          summary:
            'All B.Tech & MBA 2026 graduating students must upload verified Semester VI mark sheets and AICTE/NPTEL certificates in the departmental T&P coordinator office.',
          attachmentUrl: '',
          linkLabel: '',
          isPinned: false,
          sortOrder: 2,
        },
        {
          id: 3,
          title: 'JLPT N5 / N4 Japanese Technical Language & Global Internship Batch Enrolment',
          noticeDate: '2026-11-24',
          category: 'Training Schedule',
          summary:
            'Registrations open for Third-Year Mechanical, CSE, and E&TC students opting for Indo-Japan industrial internship tracks and campus interviews.',
          attachmentUrl: '/contact',
          linkLabel: 'Contact T&P Office',
          isPinned: false,
          sortOrder: 3,
        },
      ],
      customSections: [
        {
          id: 1,
          title: 'Four-Year Employability & Career Readiness Roadmap',
          subtitle: 'Structured technical aptitude, communication, coding, and industry certification calendar',
          sectionType: 'table',
          tableHeaders: ['Academic Year', 'Focus Track', 'Key Modules & Certifications', 'Minimum Hours'],
          tableRows: [
            ['Second Year (SY)', 'Foundation & Communication', 'Soft Skills, Technical Writing, C/Python Lab, GitHub Portfolio', '60 Hours / Sem'],
            ['Third Year (TY)', 'Aptitude, DSA & Core Domain', 'Quantitative Aptitude, Data Structures, CAD/FEA & VLSI Tools, Mock Tests', '90 Hours / Sem'],
            ['Final Year (B.Tech)', 'Company-Specific Finishing School', 'Full-Stack Projects, GD/PI Panels, 6-Month Industry Internship', '120 Hours / Sem'],
          ],
          isPublished: true,
          sortOrder: 1,
        },
        {
          id: 2,
          title: 'Industry Collaboration, Internships & Assessment Infrastructure',
          subtitle: 'Dedicated facilities inside the Training & Placement Block',
          sectionType: 'cards',
          cards: [
            {
              title: '180-Seat Online Assessment Lab',
              subtitle: 'High-Speed LAN & Proctored Terminals',
              badge: 'Infrastructure',
              description: 'Conducts AMCAT, TCS NQT, CoCubes, and coding rounds simultaneously with UPS backup.',
            },
            {
              title: '6 Dedicated Interview & GD Suites',
              subtitle: 'Corporate Hospitality Wing',
              badge: 'Recruitment',
              description: 'Sound-insulated technical interview cabins, boardroom, and remote video conferencing facility.',
            },
            {
              title: 'Japanese & Foreign Language Cell',
              subtitle: 'JLPT N5 / N4 Training Partner',
              badge: 'Global Careers',
              description: 'Prepares engineering students for Japanese core manufacturing and IT placements.',
            },
          ],
          isPublished: true,
          sortOrder: 2,
        },
      ],
    },
    grievances: [
      {
        id: 1,
        ticketCode: 'GRV-2026-0001',
        complainantName: 'S. R. Mane',
        complainantRole: 'Student (UG / PG / Ph.D.)',
        email: 'srmane@student.sveri.ac.in',
        phone: '+91-98220-00001',
        departmentOrCell: 'Examination Cell & Academic Office',
        category: 'Academic & Examination',
        subject: 'DigiLocker ABC Credit Sync Verification',
        description:
          'Requesting re-sync of Semester IV Honours credits to my Academic Bank of Credits (ABC) ID before scholarship renewal deadline.',
        status: 'resolved',
        resolutionNote:
          'Verified with Examination Cell NAD Nodal Officer. Semester IV credits synced cleanly to DigiLocker ABC portal.',
        submittedAt: '2026-11-02',
        updatedAt: '2026-11-04',
      },
    ],
    seo: structuredClone(DEFAULT_SEO_SETTINGS),
    hitCounter: createSeedHitCounter(),
    visitorLogs: createSeedVisitorLogs(),
    blockedIps: [],
    securityConfig: structuredClone(DEFAULT_SECURITY_CONFIG),
    sports: createSeedSportsData(),
    facilities: createSeedFacilitiesData(),
  };
}

export function createSeedAlumniData(): import('../types/cms').AlumniData {
  const defaultAlumniHash = hashPassword('Alumni@123');
  return {
    settings: {
      heroTitle: "SVERI's COE Alumni Association & Global Network",
      heroSubtitle:
        'Connecting 11,500+ engineering graduates, mentors, industry leaders, and chapter communities across Pune, Bengaluru, Mumbai, USA, Europe & Pandharpur.',
      associationRegNo: 'MH/SOL/ALU-2016/06220',
      coordinatorName: 'Prof. D. B. Kulkarni',
      coordinatorEmail: 'alumni@coe.sveri.ac.in',
      allowSelfRegistration: true,
      allowPublicJobPosting: true,
      enableDiscussions: true,
      requireDiscussionApproval: false,
    },
    profiles: [
      {
        id: 1,
        fullName: 'Rohan Deshmukh',
        email: 'rohan.deshmukh@alumni.svcoer.edu.in',
        passwordHash: defaultAlumniHash,
        phone: '+91-98220-11201',
        graduationYear: 2016,
        departmentCode: 'CSE',
        departmentName: 'Computer Science & Engineering',
        degree: 'B.E. (CSE)',
        currentCompany: 'Microsoft India',
        designation: 'Principal Cloud Architect',
        location: 'Hyderabad, India',
        chapter: 'Hyderabad Chapter',
        linkedinUrl: 'https://linkedin.com',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Mentoring final-year CSE students in distributed systems, Azure architecture, and product engineering interviews.',
        openToMentorship: true,
        isFeatured: true,
        status: 'approved',
        sortOrder: 1,
        registeredAt: '2026-01-12',
      },
      {
        id: 2,
        fullName: 'Snehal Patwardhan',
        email: 'snehal.patwardhan@alumni.svcoer.edu.in',
        passwordHash: defaultAlumniHash,
        phone: '+91-98901-44310',
        graduationYear: 2018,
        departmentCode: 'ENTC',
        departmentName: 'Electronics & Telecommunication Engineering',
        degree: 'B.E. (E&TC)',
        currentCompany: 'Qualcomm',
        designation: 'Staff SoC Verification Engineer',
        location: 'Bengaluru, India',
        chapter: 'Bengaluru Chapter',
        linkedinUrl: 'https://linkedin.com',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Conducting annual VLSI & RTL verification bootcamps for E&TC undergraduates at Pandharpur.',
        openToMentorship: true,
        isFeatured: true,
        status: 'approved',
        sortOrder: 2,
        registeredAt: '2026-02-04',
      },
      {
        id: 3,
        fullName: 'Aditya Kulkarni',
        email: 'aditya.k@alumni.svcoer.edu.in',
        passwordHash: defaultAlumniHash,
        graduationYear: 2015,
        departmentCode: 'MECH',
        departmentName: 'Mechanical Engineering',
        degree: 'B.E. (Mechanical)',
        currentCompany: 'Bharat Forge Ltd.',
        designation: 'Deputy General Manager - EV Powertrain',
        location: 'Pune, India',
        chapter: 'Pune Chapter',
        linkedinUrl: 'https://linkedin.com',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Facilitating sponsored industrial projects and plant visits for SVERI Mechanical and Mechatronics cohorts.',
        openToMentorship: true,
        isFeatured: true,
        status: 'approved',
        sortOrder: 3,
        registeredAt: '2026-03-19',
      },
      {
        id: 4,
        fullName: 'Priya Joshi',
        email: 'priya.joshi@alumni.svcoer.edu.in',
        passwordHash: defaultAlumniHash,
        graduationYear: 2020,
        departmentCode: 'CIVIL',
        departmentName: 'Civil Engineering',
        degree: 'B.E. (Civil)',
        currentCompany: 'Larsen & Toubro',
        designation: 'Senior Structural Design Engineer',
        location: 'Mumbai, India',
        chapter: 'Mumbai Chapter',
        linkedinUrl: 'https://linkedin.com',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        bio: 'Infrastructure & metro rail structural design specialist supporting GATE aspirants.',
        openToMentorship: false,
        isFeatured: false,
        status: 'approved',
        sortOrder: 4,
        registeredAt: '2026-05-08',
      },
      {
        id: 5,
        fullName: 'Omkar Shinde',
        email: 'omkar.shinde@alumni.svcoer.edu.in',
        passwordHash: defaultAlumniHash,
        graduationYear: 2022,
        departmentCode: 'ELEC',
        departmentName: 'Electrical Engineering',
        degree: 'B.Tech (Electrical)',
        currentCompany: 'Tata Power',
        designation: 'Lead Smart Grid Automation Engineer',
        location: 'Pune, India',
        chapter: 'Pune Chapter',
        linkedinUrl: 'https://linkedin.com',
        photoUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
        bio: 'Working on SCADA renewable integration and helping pre-final students with core electrical internships.',
        openToMentorship: true,
        isFeatured: false,
        status: 'approved',
        sortOrder: 5,
        registeredAt: '2026-07-14',
      },
      {
        id: 6,
        fullName: 'Tanvi Mane',
        email: 'tanvi.mane@alumni.svcoer.edu.in',
        passwordHash: defaultAlumniHash,
        graduationYear: 2023,
        departmentCode: 'CSE',
        departmentName: 'Computer Science & Engineering',
        degree: 'B.Tech (CSE)',
        currentCompany: 'Infosys Finacle',
        designation: 'Systems Specialist - AI & Data',
        location: 'Pandharpur, India',
        chapter: 'Pandharpur Home Chapter',
        photoUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
        bio: 'Recent graduate eager to mentor coding club members on full-stack TypeScript and placements.',
        openToMentorship: true,
        isFeatured: false,
        status: 'pending',
        sortOrder: 6,
        registeredAt: '2026-11-01',
      },
    ],
    jobs: [
      {
        id: 1,
        title: 'Graduate Software Engineer (React & Cloud)',
        company: 'Infosys Digital',
        location: 'Pune / Hybrid',
        jobType: 'Full-Time',
        departmentFocus: 'CSE',
        experienceRange: '0–2 Years',
        compensation: '₹6.5 – 9.0 LPA',
        description:
          'Alumni referral drive for 2025/2026 batch CSE & E&TC graduates with strong TypeScript, Node.js, and SQL fundamentals.',
        applyUrlOrEmail: 'https://careers.infosys.com',
        postedByAlumniName: 'Rohan Deshmukh',
        postedByBatch: '2016 CSE',
        deadlineDate: '2026-12-20',
        status: 'open',
        postedAt: '2026-11-02',
        sortOrder: 1,
      },
      {
        id: 2,
        title: 'EV Battery Pack Thermal Design Intern',
        company: 'Bharat Forge EV',
        location: 'Chakan, Pune',
        jobType: 'Internship',
        departmentFocus: 'MECH',
        experienceRange: 'Final Year Students',
        compensation: '₹22,000 / month',
        description:
          '6-month industrial internship with PPO conversion opportunity in CAD/FEA thermal simulation.',
        applyUrlOrEmail: 'mailto:alumni.jobs@coe.sveri.ac.in',
        postedByAlumniName: 'Aditya Kulkarni',
        postedByBatch: '2015 MECH',
        deadlineDate: '2026-12-15',
        status: 'open',
        postedAt: '2026-10-28',
        sortOrder: 2,
      },
      {
        id: 3,
        title: 'VLSI RTL Verification Referral',
        company: 'Qualcomm India',
        location: 'Bengaluru',
        jobType: 'Referral',
        departmentFocus: 'ENTC',
        experienceRange: '1–3 Years',
        compensation: '₹14 – 20 LPA',
        description:
          'SystemVerilog / UVM verification openings for SVERI alumni and M.Tech microelectronics graduates.',
        applyUrlOrEmail: 'https://www.qualcomm.com/company/careers',
        postedByAlumniName: 'Snehal Patwardhan',
        postedByBatch: '2018 ENTC',
        deadlineDate: '2026-12-30',
        status: 'open',
        postedAt: '2026-10-20',
        sortOrder: 3,
      },
      {
        id: 4,
        title: 'Substation SCADA Commissioning Engineer',
        company: 'Tata Power',
        location: 'Maharashtra / Pan-India',
        jobType: 'Full-Time',
        departmentFocus: 'ELEC',
        experienceRange: '0–2 Years',
        compensation: '₹6.0 LPA',
        description:
          'Field & automation role covering smart grid protection relays and PLC telemetry.',
        applyUrlOrEmail: 'mailto:hr.grid@coe.sveri.ac.in',
        postedByAlumniName: 'Omkar Shinde',
        postedByBatch: '2022 ELEC',
        deadlineDate: '2026-12-10',
        status: 'open',
        postedAt: '2026-11-05',
        sortOrder: 4,
      },
    ],
    events: [
      {
        id: 1,
        title: 'Annual Grand Alumni Homecoming & Silver Jubilee Meet',
        chapter: 'Pandharpur Home Chapter',
        eventDate: '2026-12-26',
        venue: "SVERI Central Auditorium, Gopalpur, Pandharpur",
        organizer: 'SVERI Alumni Association & Principal Office',
        description:
          'Reunite on campus with batchmates, tour the new Autonomous Research Centres, felicitate Distinguished Alumni Awardees, and mentor current B.Tech students.',
        bannerUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
        registrationUrl: '',
        rsvpCount: 142,
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 2,
        title: 'Pune Chapter Industry Connect & Tech Networking Mixer',
        chapter: 'Pune Chapter',
        eventDate: '2026-11-29',
        venue: 'MCCIA Trade Tower, Senapati Bapat Road, Pune',
        organizer: 'Pune Chapter Committee (Batch 2010–2024)',
        description:
          'Evening networking mixer for Pune-based SVERI engineers across IT, Automotive EV, and Infrastructure sectors with live placement referral desks.',
        bannerUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
        registrationUrl: '',
        rsvpCount: 86,
        isActive: true,
        sortOrder: 2,
      },
      {
        id: 3,
        title: 'Bengaluru VLSI & Cloud Architecture Mentorship Roundtable',
        chapter: 'Bengaluru Chapter',
        eventDate: '2026-12-12',
        venue: 'Koramangala Tech Hub / Hybrid Live Stream',
        organizer: 'Bengaluru Chapter Leads',
        description:
          'Structured 1-on-1 career mentorship session pairing senior Bengaluru alumni with pre-final year students.',
        bannerUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
        registrationUrl: '',
        rsvpCount: 54,
        isActive: true,
        sortOrder: 3,
      },
    ],
    discussionTopics: [
      {
        id: 1,
        slug: 'career-guidance-placements',
        title: 'Career Guidance & Placements',
        description: 'Interview prep, resume reviews, and mentorship threads for graduating engineers.',
        isActive: true,
        sortOrder: 1,
      },
      {
        id: 2,
        slug: 'industry-trends-referrals',
        title: 'Industry Referrals & Tech Trends',
        description: 'Insights on AI/Cloud, EV powertrains, VLSI verification, and smart infrastructure.',
        isActive: true,
        sortOrder: 2,
      },
      {
        id: 3,
        slug: 'higher-studies-research',
        title: 'Higher Studies, GATE & Research',
        description: 'Peer advice on M.Tech, MS abroad, fellowships, and patent/paper publishing.',
        isActive: true,
        sortOrder: 3,
      },
      {
        id: 4,
        slug: 'campus-chapter-stories',
        title: 'Pandharpur Campus & Chapter Stories',
        description: 'Alumni reunions, endowment initiatives, and chapter meetup recaps.',
        isActive: true,
        sortOrder: 4,
      },
    ],
    discussions: [
      {
        id: 1,
        topicId: 1,
        title: '2026 Cloud & System Design Interview Roadmap for SVERI Juniors',
        content:
          'Over the past quarter I interviewed 30+ freshers and mid-level engineers. Strong fundamentals in Linux networking, SQL indexing, and clean REST API error handling matter far more than memorizing frameworks.\n\nIf any batchmates in Hyderabad or Pune would like to co-host mock interviews for our final-year CSE/E&TC students next month, drop a comment below!',
        authorAlumniId: 1,
        authorName: 'Rohan Deshmukh',
        authorBatch: '2016 CSE',
        authorDesignation: 'Principal Cloud Architect, Microsoft India',
        isPinned: true,
        status: 'approved',
        createdAt: '2026-11-04 10:30',
        comments: [
          {
            id: 1,
            postId: 1,
            authorAlumniId: 2,
            authorName: 'Snehal Patwardhan',
            authorBatch: '2018 ENTC',
            content:
              'Count me in for weekend mock interviews—especially for embedded C and digital design tracks!',
            createdAt: '2026-11-04 14:15',
          },
        ],
      },
      {
        id: 2,
        topicId: 2,
        title: 'EV Thermal & Powertrain Engineering Trends in Pune Manufacturing Hub',
        content:
          'Tier-1 automotive suppliers around Chakan and Pimpri-Chinchwad are actively hiring mechanical & electrical graduates skilled in battery thermal modeling, BMS calibration, and DFMEA.\n\nHappy to review resumes from verified alumni looking to transition into EV R&D teams.',
        authorAlumniId: 3,
        authorName: 'Aditya Kulkarni',
        authorBatch: '2015 MECH',
        authorDesignation: 'DGM - EV Powertrain, Bharat Forge Ltd.',
        isPinned: false,
        status: 'approved',
        createdAt: '2026-11-06 09:45',
        comments: [
          {
            id: 2,
            postId: 2,
            authorAlumniId: 5,
            authorName: 'Omkar Shinde',
            authorBatch: '2022 ELEC',
            content:
              'Great perspective, Aditya sir. High-voltage safety and CAN-bus diagnostics skills are also in huge demand.',
            createdAt: '2026-11-06 18:20',
          },
        ],
      },
    ],
    achievers: [
      {
        id: 1,
        fullName: 'Rohan Deshmukh',
        batchYear: 2016,
        departmentCode: 'CSE',
        designation: 'Principal Cloud Architect',
        organization: 'Microsoft India',
        awardTitle: 'Distinguished Young Engineer Alumni Award 2026',
        citation: 'Recognized for scaling enterprise cloud systems and sponsoring 15+ rural engineering internships annually.',
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        linkedinUrl: 'https://linkedin.com',
        sortOrder: 1,
      },
      {
        id: 2,
        fullName: 'Snehal Patwardhan',
        batchYear: 2018,
        departmentCode: 'ENTC',
        designation: 'Staff SoC Verification Engineer',
        organization: 'Qualcomm India',
        awardTitle: 'VLSI Innovation & Women in STEM Excellence Award',
        citation: 'Honored for multi-million-gate System-on-Chip verification leadership and annual student bootcamps.',
        photoUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
        linkedinUrl: 'https://linkedin.com',
        sortOrder: 2,
      },
    ],
    pledges: [
      {
        id: 1,
        fullName: 'Aditya Kulkarni',
        email: 'aditya.k@alumni.svcoer.edu.in',
        phone: '+91-98220-77112',
        batchYear: 2015,
        departmentCode: 'MECH',
        pledgeType: 'Laboratory / Equipment Sponsorship',
        amountOrSupport: 'EV Battery Thermal Bench & 2-Day CAD Industry Workshop',
        message: 'Committed to equipping our Mechanical Department EV Centre of Excellence for final-year B.Tech capstone teams.',
        status: 'acknowledged',
        submittedAt: '2026-10-18',
      },
    ],
  };
}

export function createSeedSportsData(): import('../types/cms').SportsData {
  return {
    config: {
      heroBadge: 'Student Life · Gymkhana & Athletics',
      heroTitle: 'Sports, Athletics & Campus Recreation Complex',
      heroSubtitle:
        'Showcasing indoor and outdoor sporting infrastructure, intercollegiate tournaments, PAHSUS university zonal trials, student medals, and fitness schedules at Pandharpur campus.',
      directorName: 'Prof. V. B. Shinde',
      directorTitle: 'Director of Physical Education & Gymkhana Coordinator',
      directorEmail: 'sports@coe.sveri.ac.in',
      directorPhone: '+91-02186-216068',
      gymkhanaTimings: 'Morning 06:00 AM – 08:30 AM | Evening 04:30 PM – 07:30 PM',
      annualFlagshipName: 'SVERI Champions Trophy & Annual Sports Meet',
      customFields: [
        { label: 'Total Playfield Area', value: '8.5 Acres Dedicated Athletics & Court Zone' },
        { label: 'University Affiliation', value: 'Punyashlok Ahilyadevi Holkar Solapur University (PAHSUS)' },
        { label: 'Scholarship & TA/DA', value: '100% Kit, Tracksuit & Travel Allowance for Zonal/National Players' },
      ],
    },
    facilities: [
      {
        id: 1,
        name: '400m Standard Athletics Track & Cricket Turf Ground',
        facilityType: 'Outdoor Ground / Track',
        dimensionsOrCapacity: '400m 8-Lane Track · Floodlit Pavilion (600 Spectators)',
        timings: '06:00 AM – 08:30 AM & 04:30 PM – 07:00 PM',
        inchargeName: 'Prof. V. B. Shinde',
        description:
          'Lush green campus athletics arena with standard 400m track markings, central turf cricket wicket, long-jump pits, and practice nets for intercollegiate tournaments.',
        imageUrl: '/src/assets/images/sports_complex_1794991330591.jpg',
        customFields: [
          { label: 'Surface', value: 'Rolled Red Clay Track & Natural Bermuda Turf' },
          { label: 'Lighting', value: 'High-Mast LED Floodlights for Evening Practice' },
        ],
        isPublished: true,
        sortOrder: 1,
      },
      {
        id: 2,
        name: 'Indoor Badminton, Table Tennis & Chess Arena',
        facilityType: 'Indoor Court / Hall',
        dimensionsOrCapacity: '4 Wooden Synthetic Badminton Courts · 6 ITTF TT Tables',
        timings: '06:30 AM – 09:00 AM & 04:00 PM – 08:00 PM',
        inchargeName: 'Coach S. M. Pawar',
        description:
          'All-weather acoustic indoor sports hall featuring anti-skid badminton courts, championship table tennis tables, carrom, and digital chess clocks for university selection trials.',
        imageUrl: '/src/assets/images/campus_facilities_1794991331724.jpg',
        customFields: [
          { label: 'Flooring', value: 'BWF-Grade Cushioned Maple & PVC Mat' },
          { label: 'Ventilation', value: 'High-Volume Louvered Daylight Hall' },
        ],
        isPublished: true,
        sortOrder: 2,
      },
      {
        id: 3,
        name: 'Synthetic Basketball, Volleyball & Kabaddi Floodlit Courts',
        facilityType: 'Outdoor Ground / Track',
        dimensionsOrCapacity: '2 Acrylic Basketball Courts · 2 Clay Kabaddi Arenas',
        timings: '04:30 PM – 08:00 PM Daily',
        inchargeName: 'Prof. R. G. Salunkhe',
        description:
          'Regulation-size synthetic basketball and volleyball courts alongside dedicated kabaddi and kho-kho grounds hosting annual inter-departmental and zonal championships.',
        imageUrl: '/src/assets/images/sports_complex_1794991330591.jpg',
        customFields: [
          { label: 'Safety Kit', value: 'First-Aid Station & Physiotherapist On-Call' },
        ],
        isPublished: true,
        sortOrder: 3,
      },
      {
        id: 4,
        name: 'Modern Gymnasium, Weight-Training & Yoga Studio',
        facilityType: 'Fitness & Gymnasium',
        dimensionsOrCapacity: '2,800 Sq.Ft. · Separate Timing Slots for Boys & Girls',
        timings: '06:00 AM – 09:00 AM & 04:30 PM – 08:30 PM',
        inchargeName: 'Trainer A. D. Jadhav',
        description:
          'Equipped with multi-gym stations, Olympic barbells, treadmills, ellipticals, and an adjoining yoga studio supporting holistic student fitness and wellness.',
        imageUrl: '/src/assets/images/campus_facilities_1794991331724.jpg',
        customFields: [
          { label: 'Access', value: 'Biometric Student ID Card Entry (Free for Hostellers & Day Scholars)' },
        ],
        isPublished: true,
        sortOrder: 4,
      },
    ],
    events: [
      {
        id: 1,
        title: 'PAHSUS Intercollegiate Kabaddi & Volleyball Zonal Championship',
        eventType: 'Intercollegiate Tournament',
        discipline: 'Kabaddi & Volleyball',
        eventDate: '2026-12-08',
        venue: 'SVCOER Main Floodlit Sports Arena, Pandharpur',
        organizer: 'Gymkhana Committee & PAHSUS Sports Board',
        status: 'Registrations Open',
        registrationUrl: '/contact',
        description:
          '24 affiliated engineering and degree college teams competing over three days in knockout league fixtures.',
        bannerUrl: '/src/assets/images/sports_complex_1794991330591.jpg',
        isPublished: true,
        sortOrder: 1,
      },
      {
        id: 2,
        title: 'SVERI Champions Trophy 2027 — Annual Inter-Departmental Meet',
        eventType: 'Annual Sports Meet',
        discipline: 'Cricket, Athletics, Badminton, Chess & Football',
        eventDate: '2027-01-22',
        venue: 'All Campus Playfields & Indoor Hall',
        organizer: 'Student Council & Physical Education Dept.',
        status: 'Upcoming',
        registrationUrl: '',
        description:
          'Week-long institutional sports festival culminating in General Championship Rolling Trophy award ceremony.',
        bannerUrl: '/src/assets/images/sports_complex_1794991330591.jpg',
        isPublished: true,
        sortOrder: 2,
      },
      {
        id: 3,
        title: 'Pandharpur Fit-Engineer 5K Unity Run & Yoga Shivir',
        eventType: 'Fitness & Marathon Drive',
        discipline: 'Road Running & Yoga',
        eventDate: '2026-10-15',
        venue: 'Campus Main Gate to Gopalpur Circuit',
        organizer: 'NSS Unit & Gymkhana',
        status: 'Completed',
        registrationUrl: '',
        description:
          'Over 650 students and faculty members completed the morning 5K unity run and guided pranayama workshop.',
        bannerUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
        isPublished: true,
        sortOrder: 3,
      },
    ],
    achievements: [
      {
        id: 1,
        studentOrTeamName: 'Omkar Patil & SVCOER Mens Kabaddi Squad',
        departmentCode: 'MECH',
        batchYear: '2026',
        sportName: 'Kabaddi',
        level: 'National',
        medalOrRank: 'Gold Medal & West Zone Runner-Up',
        eventName: 'All-India Inter-University West Zone Kabaddi Championship',
        eventDate: '2026-10-20',
        photoUrl: '/src/assets/images/sports_complex_1794991330591.jpg',
        highlights: 'Selected to represent PAHSUS University squad at Khelo India University Games.',
        isFeatured: true,
        sortOrder: 1,
      },
      {
        id: 2,
        studentOrTeamName: 'Shraddha Deshmukh',
        departmentCode: 'CSE',
        batchYear: '2027',
        sportName: 'Badminton (Women Singles)',
        level: 'State',
        medalOrRank: 'Silver Medal',
        eventName: 'Maharashtra State Krida Mahotsav (Ashwamedh)',
        eventDate: '2026-09-18',
        photoUrl: '/src/assets/images/campus_convocation_1794512597749.jpg',
        highlights: 'Unbeaten through Solapur District and Pune Division qualifiers.',
        isFeatured: true,
        sortOrder: 2,
      },
      {
        id: 3,
        studentOrTeamName: 'Prathamesh Kulkarni',
        departmentCode: 'ENTC',
        batchYear: '2026',
        sportName: '400m Hurdles & Relay',
        level: 'University',
        medalOrRank: 'Double Gold & Meet Record (52.4s)',
        eventName: 'PAHSUS Annual Athletics Meet 2026',
        eventDate: '2026-08-29',
        photoUrl: '/src/assets/images/sports_complex_1794991330591.jpg',
        highlights: 'Broke the 9-year-old university intercollegiate 400m track record.',
        isFeatured: true,
        sortOrder: 3,
      },
    ],
    gallery: [
      {
        id: 1,
        title: 'Floodlit Basketball & Athletics Opening Ceremony',
        mediaType: 'Photo',
        category: 'Annual Sports Meet',
        mediaUrl: '/src/assets/images/sports_complex_1794991330591.jpg',
        eventDate: '2026-10-15',
        caption: 'Students marching past the main sports pavilion during the institutional sports inaugural.',
        isPublished: true,
        sortOrder: 1,
      },
      {
        id: 2,
        title: 'PAHSUS Athletics Meet Highlights & Track Finals',
        mediaType: 'Video',
        category: 'University Tournaments',
        mediaUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        thumbnailUrl: '/src/assets/images/sports_complex_1794991330591.jpg',
        eventDate: '2026-09-22',
        caption: 'Highlight reel covering 4x100m relay finals and prize distribution.',
        isPublished: true,
        sortOrder: 2,
      },
    ],
    notices: [
      {
        id: 1,
        title: 'PAHSUS University Cricket & Badminton Selection Trials — Schedule',
        noticeDate: '2026-11-18',
        category: 'Trials & Selection',
        summary:
          'All bonafide UG/PG students wishing to represent the college team must report at 04:15 PM at Gymkhana Pavilion with college ID card and sports kit.',
        attachmentUrl: '',
        registrationLink: '/contact',
        isPinned: true,
        isPublished: true,
        sortOrder: 1,
      },
      {
        id: 2,
        title: 'Winter Gymnasium Membership & Morning Yoga Batch Timing Update',
        noticeDate: '2026-11-10',
        category: 'Fitness Schedule',
        summary:
          'Morning Yoga & Functional Fitness sessions start at 06:15 AM from Monday to Saturday at the Indoor Wellness Hall.',
        attachmentUrl: '',
        registrationLink: '',
        isPinned: false,
        isPublished: true,
        sortOrder: 2,
      },
    ],
  };
}

export function createSeedFacilitiesData(): import('../types/cms').FacilitiesData {
  return {
    config: {
      heroBadge: 'Campus Infrastructure & Resources',
      heroTitle: 'Institutional Facilities & Smart Campus Infrastructure',
      heroSubtitle:
        'Explore AICTE-compliant academic blocks, 10 Gbps IT & Cloud data centre, 24x7 central library, AICTE IDEA Lab, green solar microgrid, hostels, health centre, and barrier-free student amenities.',
      customFieldPresets: ['Floor Area', 'Equipment Highlight', 'Access Policy', 'Power Backup', 'Network Speed'],
    },
    items: [
      {
        id: 1,
        title: 'Smart Classrooms & Central Auditorium Complex',
        category: 'Infrastructural Facilities',
        shortSummary:
          '42 ICT-enabled lecture theatres with interactive smart boards and a 750-seat acoustically treated Central Auditorium.',
        descriptionHtml:
          '<p>Every engineering department features tiered lecture halls equipped with dual 4K laser projectors, lecture-capture recording systems, collar microphones, and high-lumen ergonomic seating.</p><p>The <strong>Central Auditorium</strong> hosts international conferences, convocations, and corporate recruitment drives with Dolby array audio and live streaming uplink.</p>',
        locationBlock: 'Main Academic Block & Auditorium Wing',
        capacity: '750-Seat Auditorium + 42 ICT Classrooms (60 Seats each)',
        timings: '08:00 AM – 06:30 PM (Monday – Saturday)',
        inchargeName: 'Prof. S. D. Jadhav (Estate Officer)',
        inchargeEmail: 'estate@coe.sveri.ac.in',
        inchargePhone: '+91-02186-216063',
        imageUrl: '/src/assets/images/campus_facilities_1794991331724.jpg',
        brochureUrl: '/quick-links',
        customFields: [
          { label: 'Floor Area', value: '68,000 Sq.Ft. Built-up Instructional Space' },
          { label: 'AV & Recording', value: 'Interactive Touch Panels & Lecture Capture Cameras' },
          { label: 'Accessibility', value: 'Ramps, Lifts & Tactile Path Guidance' },
        ],
        isFeatured: true,
        isPublished: true,
        sortOrder: 1,
      },
      {
        id: 2,
        title: 'Central Data Centre, High-Speed Wi-Fi & 1,150+ Computing Nodes',
        category: 'IT & Computing Facilities',
        shortSummary:
          '10 Gbps NKN/leased-line dual-ISP backbone, Wi-Fi 6 campus mesh, NVIDIA GPU AI cluster, and ERP/LMS portal.',
        descriptionHtml:
          '<p>The Central Computing Centre manages over 1,150 networked workstations running licensed MATLAB, Ansys, SolidWorks, Cadence VLSI, and JetBrains/Microsoft Azure Dev Tools.</p><p>Seamless roaming Wi-Fi 6 blankets all academic blocks, library reading halls, hostels, and outdoor plazas behind next-generation firewall protection.</p>',
        locationBlock: 'IT Block — Ground & First Floor',
        capacity: '1,150+ Workstations · 10 Gbps Redundant Leased Line',
        timings: '08:30 AM – 09:00 PM (Extended Exam Hours)',
        inchargeName: 'Mr. R. K. Pawar (System Administrator)',
        inchargeEmail: 'itadmin@coe.sveri.ac.in',
        inchargePhone: '+91-02186-216072',
        imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        brochureUrl: '',
        customFields: [
          { label: 'AI Compute Node', value: 'Dual NVIDIA A100/RTX Workstation Cluster for Deep Learning' },
          { label: 'LMS & ERP', value: 'Integrated Outcome-Based Education (OBE) & Attendance ERP' },
          { label: 'Power Redundancy', value: '240 kVA Online UPS + 500 kVA Auto-Synchronized DG' },
        ],
        isFeatured: true,
        isPublished: true,
        sortOrder: 2,
      },
      {
        id: 3,
        title: 'Boys & Girls Hostels, Hygienic Mess & 24x7 Medical Centre',
        category: 'Student Facilities',
        shortSummary:
          'On-campus residential hostels for 1,400+ students with solar hot water, RO drinking water, reading rooms, and campus ambulance.',
        descriptionHtml:
          '<p>Separate gated residential complexes for boys and girls ensure a safe, studious environment with 24x7 CCTV surveillance, resident rectors, Wi-Fi connectivity, indoor games, and multi-cuisine hygienic dining halls.</p><p>An on-campus Primary Health Centre staffed by a medical officer and nursing staff operates alongside a dedicated campus ambulance for emergency hospital transfers.</p>',
        locationBlock: 'East & West Residential Campus Enclave',
        capacity: '1,400+ Hostel Beds · 10-Bed Medical Clinic',
        timings: '24x7 Residential Support & Security',
        inchargeName: 'Dr. M. S. Kulkarni (Chief Rector)',
        inchargeEmail: 'hostel@coe.sveri.ac.in',
        inchargePhone: '+91-02186-216075',
        imageUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
        brochureUrl: '',
        customFields: [
          { label: 'Security & Safety', value: 'Biometric Hostel Gate, 24x7 Warden & Women Guard Desk' },
          { label: 'Banking & Stationery', value: 'On-Campus SBI ATM, Co-operative Store & Reprography' },
          { label: 'Campus Transport', value: '18 Dedicated Buses Covering Pandharpur, Sangola & Solapur' },
        ],
        isFeatured: true,
        isPublished: true,
        sortOrder: 3,
      },
      {
        id: 4,
        title: 'Central Knowledge Resource Centre & Digital E-Library',
        category: 'Library & Digital Resources',
        shortSummary:
          '92,000+ engineering volumes, IEEE/Springer/ScienceDirect e-journals, NPTEL local server, and 350-seat quiet reading hall.',
        descriptionHtml:
          '<p>Automated via KOHA Open-Source ILMS with RFID book check-out kiosks and remote Shibboleth/KNIMBUS access for students and faculty.</p>',
        locationBlock: 'Knowledge Atrium — Central Library Wing',
        capacity: '92,400+ Books · 350 Reading Seats · 40 Digital Terminals',
        timings: '08:00 AM – 11:00 PM (Extended till Midnight during Exams)',
        inchargeName: 'Mrs. S. P. Joshi (Chief Librarian)',
        inchargeEmail: 'library@coe.sveri.ac.in',
        inchargePhone: '+91-02186-216069',
        imageUrl: '/src/assets/images/hero_library_atrium_1794512596890.jpg',
        brochureUrl: '/page/central-library',
        customFields: [
          { label: 'E-Resources', value: 'IEEE ASPP, SpringerLink, Delnet, NDLI Club & Turnitin Access' },
          { label: 'Book Bank', value: 'Full-Set Semester Book Bank Facility for SC/ST & Merit Scholars' },
        ],
        isFeatured: false,
        isPublished: true,
        sortOrder: 4,
      },
      {
        id: 5,
        title: 'AICTE IDEA Lab & Interdisciplinary Prototyping FabLab',
        category: 'Research & Central Labs',
        shortSummary:
          '24x7 multidisciplinary maker space with 5-axis CNC router, CO2 laser cutter, SLA/FDM 3D printers, PCB milling, and welding bays.',
        descriptionHtml:
          '<p>Supports student startup prototypes, Smart India Hackathon hardware builds, MSME consultancy, and patent proof-of-concept fabrication.</p>',
        locationBlock: 'R&D and Innovation Annex',
        capacity: '85 Simultaneous Makers & Startup Pods',
        timings: '09:00 AM – 09:00 PM (24x7 with Mentor Approval)',
        inchargeName: 'Dr. A. K. Kulkarni (IDEA Lab Coordinator)',
        inchargeEmail: 'idealab@coe.sveri.ac.in',
        inchargePhone: '+91-02186-216080',
        imageUrl: '/src/assets/images/hero_robotics_lab_1794512596365.jpg',
        brochureUrl: '',
        customFields: [
          { label: 'Key Machines', value: 'Stratasys 3D Printers, LPKF PCB Protomat, Universal Testing Frame' },
          { label: 'Funding Support', value: 'Seed Micro-Grants up to ₹50,000 per Student Prototype' },
        ],
        isFeatured: true,
        isPublished: true,
        sortOrder: 5,
      },
      {
        id: 6,
        title: '520 kWp Solar Microgrid, Rainwater Harvesting & Divyangjan Access',
        category: 'Green & Barrier-Free Campus',
        shortSummary:
          'Rooftop grid-tied solar generation, 120 KLD sewage treatment plant for garden irrigation, EV charging bays, and step-free lifts.',
        descriptionHtml:
          '<p>Aligned with NEP 2020 and UGC Green Campus Charter, over 65% of daytime campus electricity is met via clean rooftop solar photovoltaic arrays alongside barrier-free elevators and accessible restrooms in every block.</p>',
        locationBlock: 'Campus-Wide Sustainability Grid',
        capacity: '520 kWp Solar Plant · 40 Lakh Litre Rainwater Percolation',
        timings: 'Continuous Campus Operation',
        inchargeName: 'Prof. V. M. Jadhav (Green Audit Coordinator)',
        inchargeEmail: 'greenaudit@coe.sveri.ac.in',
        inchargePhone: '+91-02186-216063',
        imageUrl: '/src/assets/images/campus_facilities_1794991331724.jpg',
        brochureUrl: '',
        customFields: [
          { label: 'Carbon Offset', value: '620+ Metric Tons CO2 Avoided Annually' },
          { label: 'Divyangjan Support', value: 'Wheelchairs, Brailled Signage & 6 Passenger Elevators' },
        ],
        isFeatured: false,
        isPublished: true,
        sortOrder: 6,
      },
    ],
  };
}


