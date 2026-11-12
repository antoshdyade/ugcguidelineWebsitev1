-- ============================================================================
-- SVCOER UGC NEP 2020 Public Self-Disclosure CMS — MySQL 8.x Schema & Seed Data
-- ============================================================================
CREATE DATABASE IF NOT EXISTS svcoer_ugc_cms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE svcoer_ugc_cms;

-- 1. Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  institution_name VARCHAR(255) NOT NULL,
  short_code VARCHAR(32) NOT NULL,
  affiliation VARCHAR(255) NOT NULL,
  aicte_code VARCHAR(64) NOT NULL,
  dte_code VARCHAR(64) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(120) NOT NULL,
  emergency_helpline VARCHAR(64) NOT NULL,
  anti_ragging_helpline VARCHAR(64) NOT NULL,
  default_palette_id VARCHAR(40) DEFAULT 'royal-navy',
  primary_color VARCHAR(16) DEFAULT '#0F294A',
  secondary_color VARCHAR(16) DEFAULT '#B45309',
  map_embed_query VARCHAR(255) DEFAULT 'Pandharpur,Maharashtra,India',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Academic Departments (Microsites)
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  short_name VARCHAR(60) NOT NULL,
  established_year SMALLINT NOT NULL,
  intake_capacity SMALLINT NOT NULL,
  nba_status VARCHAR(120) NOT NULL,
  hod_name VARCHAR(120) NOT NULL,
  hod_message TEXT,
  overview TEXT NOT NULL,
  vision TEXT,
  mission TEXT,
  hero_image_url VARCHAR(255) DEFAULT 'assets/images/hero_robotics.jpg',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

-- 3. RBAC Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'content_editor', 'department_admin', 'iqac_officer') NOT NULL,
  assigned_department_id INT NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_dept FOREIGN KEY (assigned_department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. UGC Categories
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  ugc_code VARCHAR(40) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

-- 5. Dynamic CMS Pages
CREATE TABLE IF NOT EXISTS pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) DEFAULT '',
  content_html MEDIUMTEXT NOT NULL,
  attached_pdf_url VARCHAR(255) NULL,
  attached_pdf_label VARCHAR(255) NULL,
  is_published TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 1,
  updated_by VARCHAR(120) DEFAULT 'Super Admin',
  updated_at DATE NOT NULL,
  FULLTEXT KEY ft_pages (title, subtitle, content_html),
  CONSTRAINT fk_page_cat FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Department Microsite Sub-Pages
CREATE TABLE IF NOT EXISTS department_subpages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(180) NOT NULL,
  content_html MEDIUMTEXT NOT NULL,
  sort_order INT DEFAULT 1,
  is_published TINYINT(1) DEFAULT 1,
  updated_at DATE NOT NULL,
  UNIQUE KEY uq_dept_sub (department_id, slug),
  CONSTRAINT fk_subpage_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Faculty Directory
CREATE TABLE IF NOT EXISTS faculty (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  designation VARCHAR(120) NOT NULL,
  qualification VARCHAR(150) NOT NULL,
  specialization VARCHAR(200) NOT NULL,
  email VARCHAR(160) NOT NULL,
  experience_years TINYINT UNSIGNED DEFAULT 1,
  photo_url VARCHAR(255) DEFAULT 'assets/images/faculty_default.jpg',
  is_hod TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 1,
  FULLTEXT KEY ft_faculty (name, designation, specialization),
  CONSTRAINT fk_faculty_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Department Laboratories
CREATE TABLE IF NOT EXISTS department_labs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  name VARCHAR(180) NOT NULL,
  area_sqft INT NOT NULL,
  equipment_summary TEXT NOT NULL,
  incharge VARCHAR(140) NOT NULL,
  CONSTRAINT fk_lab_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Leadership Profiles (Section 5(b))
CREATE TABLE IF NOT EXISTS leadership_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_title VARCHAR(150) NOT NULL,
  name VARCHAR(150) NOT NULL,
  qualification VARCHAR(150) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  photo_url VARCHAR(255) NOT NULL,
  bio TEXT,
  committee_group ENUM('statutory','governance','icc','academic_leadership') DEFAULT 'statutory',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

-- 10. Hero Sliders, Ticker & Events
CREATE TABLE IF NOT EXISTS sliders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  caption TEXT,
  image_url VARCHAR(255) NOT NULL,
  cta_label VARCHAR(100) DEFAULT 'Learn More',
  cta_link VARCHAR(255) DEFAULT 'page.php?slug=about-overview',
  sort_order INT DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticker_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  link_url VARCHAR(255) NOT NULL,
  badge_text VARCHAR(60) DEFAULT 'Notice',
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campus_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  category ENUM('Event','Notice','Achievement','Circular','Placement') DEFAULT 'Notice',
  summary TEXT NOT NULL,
  content_html MEDIUMTEXT,
  is_featured TINYINT(1) DEFAULT 1,
  FULLTEXT KEY ft_events (title, summary)
) ENGINE=InnoDB;

-- 11. Downloadable Document Repository (Quick Links)
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes INT UNSIGNED NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  uploaded_at DATE NOT NULL,
  uploaded_by VARCHAR(120) NOT NULL,
  is_quick_link TINYINT(1) DEFAULT 1,
  FULLTEXT KEY ft_docs (title, category, file_name)
) ENGINE=InnoDB;

-- 12. Picture Gallery
CREATE TABLE IF NOT EXISTS gallery_albums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  event_date DATE NOT NULL,
  cover_url VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS gallery_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  album_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  caption VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  CONSTRAINT fk_photo_album FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 13. Telephone Directory & Audit Logs
CREATE TABLE IF NOT EXISTS telephone_directory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section VARCHAR(120) NOT NULL,
  officer_name VARCHAR(140) NOT NULL,
  designation VARCHAR(140) NOT NULL,
  extension VARCHAR(20) NOT NULL,
  direct_phone VARCHAR(60) NOT NULL,
  email VARCHAR(160) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_email VARCHAR(160) NOT NULL,
  actor_role VARCHAR(40) NOT NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- Seed Data
-- ============================================================================
INSERT INTO site_settings (id, institution_name, short_code, affiliation, aicte_code, dte_code, address, phone, email, emergency_helpline, anti_ragging_helpline)
VALUES (
  1,
  'Shri Vithal College of Engineering & Research (Autonomous)',
  'SVCOER',
  'Affiliated to PAHSUS Solapur · Approved by AICTE · Recognized u/s 2(f) & 12(B) of UGC Act',
  '1-49281724',
  'EN-6220',
  'Gopalpur-Ranjani Road, Pandharpur, Dist. Solapur - 413304, Maharashtra, India',
  '+91 2186 225083',
  'principal@svcoer.edu.in',
  '+91 2186 225099',
  '1800-180-5522'
);

INSERT INTO departments (id, slug, code, name, short_name, established_year, intake_capacity, nba_status, hod_name, overview, vision, mission) VALUES
(1, 'computer-science', 'CSE', 'Computer Science & Engineering', 'CSE', 1998, 180, 'NBA Accredited (2024-2027)', 'Dr. Anjali K. Deshpande', 'NBA accredited flagship computing department with AI/GPU cluster and 94% placements.', 'To nurture globally competitive computing professionals.', 'Deliver outcome-based technical education and funded AI research.'),
(2, 'mechanical', 'MECH', 'Mechanical Engineering', 'Mechanical', 1998, 120, 'NBA Accredited (2024-2027)', 'Dr. Rajendra B. Kulkarni', 'Founding department featuring Tata CIII Robotics Lab and CNC Centre.', 'To excel in sustainable manufacturing and robotics.', 'Cultivate hands-on design thinking and industrial consultancy.'),
(3, 'civil', 'CIVIL', 'Civil Engineering', 'Civil', 2001, 60, 'NBA Accredited (2024-2027)', 'Dr. Suhas V. Patwardhan', 'Structural engineering and NABL-aligned material testing consultancy.', 'To engineer resilient, sustainable infrastructure.', 'Train socially responsible civil engineers.'),
(4, 'entc', 'ENTC', 'Electronics & Telecommunication Engineering', 'E&TC', 1998, 120, 'NBA Accredited (2024-2027)', 'Dr. Vandana P. Chavan', 'VLSI chip design, Texas Instruments Embedded Centre, and 5G RF Lab.', 'To excel in semiconductor design and embedded intelligence.', 'Empower students with hardware-software co-design expertise.');

-- Default RBAC Passwords:
-- admin@svcoer.edu.in / Admin@123
-- pro@svcoer.edu.in / Editor@123
-- hod.cse@svcoer.edu.in / Dept@123
-- iqac@svcoer.edu.in / Iqac@123
INSERT INTO users (full_name, email, password_hash, role, assigned_department_id) VALUES
('Dr. Vikramaditya Kulkarni', 'admin@svcoer.edu.in', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', NULL),
('Prof. Sneha Patwardhan (PRO)', 'pro@svcoer.edu.in', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'content_editor', NULL),
('Dr. Anjali K. Deshpande (CSE)', 'hod.cse@svcoer.edu.in', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'department_admin', 1),
('Dr. M. M. Pawar (IQAC)', 'iqac@svcoer.edu.in', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'iqac_officer', NULL);

INSERT INTO categories (id, slug, name, ugc_code, description, sort_order) VALUES
(1, 'about-hei', 'About HEI', 'Section 5(a)', 'Overview, Act & Statutes, IDP, Affiliating University, NAAC/NBA/NIRF, UGC 2(f)/12B, Annual Reports & Accounts.', 1),
(2, 'administration', 'Administration', 'Section 5(b)', 'Statutory officers, Governing Body, Academic Council, Finance Committee, ICC & Academic Leadership.', 2),
(3, 'academics', 'Academics', 'Section 5(c)', 'Programs, Calendar, Ordinances, Department Microsites, Faculty Directory, IQAC, Library & Collaborations.', 3),
(4, 'admissions-fee', 'Admissions & Fee', 'Section 5(d)', 'Prospectus, FRA Fee Structure, Admission Process & UGC Fee Refund Policy.', 4),
(5, 'research', 'Research', 'Section 5(e)', 'R&D Cell, Consultancy, Foreign/Industry Collaborations, Incubation Centre & Central Facilities.', 5),
(6, 'student-life', 'Student Life & Cells', 'Section 5(f)', 'Sports, NCC/NSS, Hostels, Placements, SGRC, Health, Anti-Ragging, Equal Opportunity, SEDG & Barrier-Free Campus.', 6),
(7, 'alumni', 'Alumni', 'Section 5(g)', 'Alumni Association details, registration and notable alumni.', 7),
(8, 'information-corner', 'Information Corner', 'Section 5(h)', 'RTI CPIO/Appellate, Circulars, Announcements, Newsletters, Events, Jobs, Reservation Roster & Study in India.', 8);

INSERT INTO pages (category_id, slug, title, subtitle, content_html, is_published, sort_order, updated_at) VALUES
(1, 'about-overview', 'About Us: Institutional Overview', 'UGC Section 5(a)', '<h2>Institutional Profile</h2><p>Shri Vithal College of Engineering &amp; Research (Autonomous), established in 1998, is accredited with NAAC A+ (CGPA 3.42) and recognized under UGC 2(f) &amp; 12(B).</p>', 1, 1, '2026-10-15'),
(1, 'act-statutes-moa', 'Act, Statutes & MoA', 'UGC Section 5(a)', '<h2>Statutory Governance Instruments</h2><p>Governed by UGC Autonomous Colleges Regulations 2023 and Maharashtra Public Trust Act.</p>', 1, 2, '2026-10-10'),
(1, 'institutional-development-plan', 'Institutional Development Plan (IDP)', 'UGC Section 5(a)', '<h2>NEP 2020 Strategic Roadmap</h2><p>10-year roadmap covering Academic Bank of Credits, Interdisciplinary Minors, and Research Incubation.</p>', 1, 3, '2026-09-22'),
(1, 'accreditation-ranking', 'Accreditation & Ranking (NAAC, NBA, NIRF)', 'UGC Section 5(a)', '<h2>NAAC A+ · NBA 4 Programs · NIRF 151-200</h2><p>Institutional quality benchmarks verified by IQAC.</p>', 1, 4, '2026-10-02'),
(1, 'annual-accounts-audit', 'Annual Accounts & Audit Reports', 'UGC Section 5(a)', '<h2>Audited Financial Statements</h2><p>Balance Sheet, Income &amp; Expenditure, and Receipts &amp; Payments certified by Statutory Auditors.</p>', 1, 5, '2026-09-30'),
(2, 'statutory-officers', 'Statutory Officers & Administrative Leadership', 'UGC Section 5(b)', '<h2>Key Statutory Officers</h2><p>Complete profiles of Principal, Registrar, Finance Officer, Controller of Examinations, CVO, and Ombudsperson.</p>', 1, 1, '2026-10-05'),
(2, 'governing-bodies', 'Governing Body, Academic Council & Committees', 'UGC Section 5(b)', '<h2>Governing Body Composition</h2><p>Includes Trust Chairperson, Principal, UGC Nominee, State Govt Nominee, and Industry Representatives.</p>', 1, 2, '2026-09-28'),
(3, 'academic-programs', 'Details of Academic Programs', 'UGC Section 5(c)', '<h2>UG, PG &amp; Doctoral Programs</h2><p>B.Tech (CSE, Mechanical, Civil, E&amp;TC), M.Tech, and Ph.D. programs aligned with NEP 2020.</p>', 1, 1, '2026-10-08'),
(3, 'iqac', 'Internal Quality Assurance Cell (IQAC)', 'UGC Section 5(c)', '<h2>IQAC Quality Mandate</h2><p>Coordinator: Dr. M. M. Pawar (iqac@svcoer.edu.in). AQAR &amp; Academic Audit reports published in Document Repository.</p>', 1, 2, '2026-09-25'),
(4, 'prospectus-fee-structure', 'Prospectus & FRA Fee Structure (2026-27)', 'UGC Section 5(d)', '<h2>FRA Approved Fee Structure</h2><p>B.Tech Open Annual Fee: INR 1,13,000 (Tuition INR 98,214 + Development INR 14,786).</p>', 1, 1, '2026-10-12'),
(4, 'fee-refund-policy', 'UGC Fee Refund Policy', 'UGC Section 5(d)', '<h2>100% Transparent Refund Policy</h2><p>Full refund within 15 working days for cancellations 15+ days prior to admission cutoff.</p>', 1, 2, '2026-08-21'),
(5, 'research-development-cell', 'Research & Development Cell', 'UGC Section 5(e)', '<h2>Sponsored R&amp;D Projects</h2><p>DST-SERB, AICTE-MODROBS, and MSME Design Clinic funded research projects.</p>', 1, 1, '2026-09-29'),
(6, 'placement-cell', 'Training & Placement Cell', 'UGC Section 5(f)', '<h2>91.1% Placement Record</h2><p>Highest offer 18.5 LPA · Median 5.40 LPA across 84 visiting recruiters.</p>', 1, 1, '2026-10-14'),
(6, 'sgrc', 'Student Grievance Redressal Committee (SGRC)', 'UGC Section 5(f)', '<h2>SGRC &amp; Ombudsperson</h2><p>Guaranteed resolution within 15 working days under UGC Redressal of Grievances Regulations 2023.</p>', 1, 2, '2026-09-10'),
(6, 'anti-ragging-cell', 'Anti-Ragging, ICC, Equal Opportunity & SEDG Cells', 'UGC Section 5(f)', '<h2>Zero Tolerance &amp; Barrier-Free Campus</h2><p>24x7 Anti-Ragging Helpline: 1800-180-5522. Ramps, elevators, tactile paths &amp; assistive tech enabled.</p>', 1, 3, '2026-09-03'),
(7, 'alumni-association', 'Registered Alumni Association', 'UGC Section 5(g)', '<h2>SVCOER Alumni Network</h2><p>11,500+ engineering alumni across global chapters.</p>', 1, 1, '2026-09-19'),
(8, 'rti-disclosure', 'RTI: CPIO & Appellate Authority', 'UGC Section 5(h)', '<h2>Right to Information Act 2005</h2><p>PIO: Shri S. G. Kulkarni (Registrar) · First Appellate Authority: Dr. B. P. Ronge (Principal).</p>', 1, 1, '2026-09-11'),
(8, 'circulars-notices', 'Circulars, Notices & Announcements', 'UGC Section 5(h)', '<h2>Official Notices</h2><p>Exam schedules, job openings, reservation roster &amp; Study in India disclosures.</p>', 1, 2, '2026-10-18');

INSERT INTO department_subpages (department_id, slug, title, content_html, sort_order, updated_at) VALUES
(1, 'about', 'About Department', '<h2>CSE Department</h2><p>NBA Accredited department offering Honours in AI/ML and Cyber Security.</p>', 1, '2026-10-01'),
(1, 'hod-desk', 'HoD Desk', '<h2>Message from Dr. Anjali K. Deshpande</h2><p>Focused on first-principles computing and industry-ready engineering.</p>', 2, '2026-09-25'),
(1, 'syllabus', 'Syllabus & Curriculum', '<h2>160-Credit NEP 2020 Pattern</h2><p>Includes 6-month industry internship and multidisciplinary minors.</p>', 3, '2026-08-20'),
(2, 'about', 'About Department', '<h2>Mechanical Engineering</h2><p>Equipped with Tata Technologies CIII Robotics Lab and CNC Centres.</p>', 1, '2026-09-12'),
(3, 'about', 'About Department', '<h2>Civil Engineering</h2><p>Structural Engineering and NABL-aligned material testing consultancy.</p>', 1, '2026-09-09'),
(4, 'about', 'About Department', '<h2>E&amp;TC Engineering</h2><p>Cadence VLSI tools and Texas Instruments Embedded Centre.</p>', 1, '2026-09-14');

INSERT INTO faculty (department_id, name, designation, qualification, specialization, email, experience_years, is_hod) VALUES
(1, 'Dr. Anjali K. Deshpande', 'Professor & Head of Department', 'Ph.D. (CSE), M.Tech', 'Distributed Systems & NLP', 'hod.cse@svcoer.edu.in', 21, 1),
(1, 'Dr. Siddharth R. Mane', 'Associate Professor', 'Ph.D., M.E. (CSE)', 'Computer Vision & Edge AI', 'srmane@svcoer.edu.in', 15, 0),
(2, 'Dr. Rajendra B. Kulkarni', 'Professor & Head of Department', 'Ph.D. (Design Engg.)', 'Robotics & Tribology', 'hod.mech@svcoer.edu.in', 24, 1),
(3, 'Dr. Suhas V. Patwardhan', 'Professor & Head of Department', 'Ph.D. (Structural Engg.)', 'Earthquake Resistant Design', 'hod.civil@svcoer.edu.in', 20, 1),
(4, 'Dr. Vandana P. Chavan', 'Professor & Head of Department', 'Ph.D. (VLSI)', 'Low-Power ASIC Design', 'hod.entc@svcoer.edu.in', 22, 1);

INSERT INTO department_labs (department_id, name, area_sqft, equipment_summary, incharge) VALUES
(1, 'High-Performance AI & Deep Learning Lab', 1450, 'NVIDIA GPU Workstations, 60 Core i7 Nodes', 'Dr. Siddharth R. Mane'),
(2, 'Tata CIII Industrial Robotics & CNC Lab', 2400, 'KUKA 6-Axis Cobot, 5-Axis CNC Centre', 'Dr. Rajendra B. Kulkarni'),
(3, 'Heavy Structures & Concrete Testing Lab', 2100, '1000 kN UTM, Rebound Hammer, UPV Tester', 'Dr. Suhas V. Patwardhan'),
(4, 'VLSI Design & FPGA Prototyping Lab', 1350, 'Xilinx Vivado Boards, Cadence Virtuoso Suite', 'Dr. Vandana P. Chavan');

INSERT INTO leadership_profiles (role_title, name, qualification, email, phone, photo_url, bio, sort_order) VALUES
('Principal & Director', 'Dr. B. P. Ronge', 'Ph.D. (Mech), M.Tech (IIT)', 'principal@svcoer.edu.in', '+91 2186 225083', 'assets/images/principal.jpg', '28 years of academic governance and accreditation leadership.', 1),
('Registrar & PIO (RTI)', 'Shri S. G. Kulkarni', 'M.Com, LL.B., MBA', 'registrar@svcoer.edu.in', '+91 2186 225084', 'assets/images/principal.jpg', 'Custodian of institutional records and statutory compliance.', 2),
('Controller of Examinations', 'Dr. M. S. Kumbhar', 'Ph.D. (E&TC)', 'coe@svcoer.edu.in', '+91 2186 225085', 'assets/images/principal.jpg', 'Heads autonomous examination and ABC credit governance.', 3);

INSERT INTO sliders (title, caption, image_url, cta_label, cta_link, sort_order) VALUES
('Empowering Engineering Excellence Under NEP 2020', 'Autonomous Institution · NAAC A+ · 4 NBA Accredited Programs · Complete UGC Public Self-Disclosure.', 'assets/images/hero_campus.jpg', 'View FRA Fee Structure', 'page.php?slug=prospectus-fee-structure', 1),
('Industry 4.0 Robotics, AI & Semiconductor Innovation', 'Funded DST-SERB & AICTE-MODROBS laboratories driving real-world undergraduate research.', 'assets/images/hero_lab.jpg', 'Visit CSE Microsite', 'department.php?dept=computer-science', 2);

INSERT INTO ticker_items (text, link_url, badge_text, sort_order) VALUES
('FRA-Fee Structure 2026-27 Approved & Published', 'page.php?slug=prospectus-fee-structure', 'FRA Fee', 1),
('First Year B.Tech & Direct Second Year CAP Admissions 2026-27 Open', 'page.php?slug=prospectus-fee-structure', 'Admissions', 2),
('UGC Guidelines on Public Self-Disclosure (NEP 2020) Portal Active', 'quick-links.php', 'UGC Mandatory', 3);

INSERT INTO documents (title, category, file_url, file_name, file_size_bytes, mime_type, uploaded_at, uploaded_by) VALUES
('UGC Guidelines on Public Self-Disclosure (NEP 2020)', 'UGC & AICTE Approvals', 'uploads/UGC-Public-Self-Disclosure-Guidelines.pdf', 'UGC-Public-Self-Disclosure-Guidelines.pdf', 512400, 'application/pdf', '2026-10-01', 'IQAC Officer'),
('FRA Approved Fee Structure 2026-27', 'Fee Structure', 'uploads/FRA-Fee-Structure-2026-27.pdf', 'FRA-Fee-Structure-2026-27.pdf', 342100, 'application/pdf', '2026-09-24', 'IQAC Officer'),
('Academic Calendar 2026-27', 'Academic Calendar', 'uploads/SVCOER-Academic-Calendar-2026-27.pdf', 'SVCOER-Academic-Calendar-2026-27.pdf', 284000, 'application/pdf', '2026-07-02', 'IQAC Officer');

INSERT INTO telephone_directory (section, officer_name, designation, extension, direct_phone, email) VALUES
('Principal Office', 'Dr. B. P. Ronge', 'Principal & Director', '101', '+91 2186 225083', 'principal@svcoer.edu.in'),
('Registrar & RTI Cell', 'Shri S. G. Kulkarni', 'Registrar & PIO', '102', '+91 2186 225084', 'registrar@svcoer.edu.in'),
('Anti-Ragging Helpline', 'Dr. P. K. Deshmukh', 'Chief Vigilance Officer', '199', '+91 2186 225099', 'antiragging@svcoer.edu.in');
