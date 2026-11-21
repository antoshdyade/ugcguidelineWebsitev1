-- ============================================================================
-- SVCOER UGC NEP 2020 Public Self-Disclosure CMS — MySQL 8.x Schema & Seed Data
-- Webmin Note: Create your database first in Webmin -> Servers -> MySQL Database Server,
-- select that database, and then execute/import this SQL file.
-- ============================================================================

-- 1. Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  trust_name VARCHAR(255) DEFAULT 'Shri Vithal Education & Research Trust''s',
  institution_name VARCHAR(255) NOT NULL,
  short_code VARCHAR(32) NOT NULL,
  logo_url VARCHAR(255) DEFAULT '',
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
  about_summary TEXT,
  about_image_url VARCHAR(255) DEFAULT 'assets/images/hero_campus.jpg',
  vision_text TEXT,
  mission_text TEXT,
  recruiters TEXT,
  home_sections_json TEXT,
  highlights_json TEXT,
  approved_bodies_json TEXT,
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
  library_json TEXT NULL,
  faculty_field_schema_json TEXT NULL,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

-- 3. RBAC Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'content_editor', 'department_admin', 'iqac_officer', 'exam_controller', 'specific_page_editor') NOT NULL,
  assigned_department_id INT NULL,
  allowed_categories_json TEXT NULL,
  allowed_page_ids_json TEXT NULL,
  allowed_modules_json TEXT NULL,
  allowed_department_ids_json TEXT NULL,
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
  short_label VARCHAR(80) DEFAULT '',
  ugc_code VARCHAR(40) NOT NULL,
  description TEXT,
  show_in_menu TINYINT(1) DEFAULT 1,
  menu_location ENUM('main','more','hidden') DEFAULT 'main',
  show_on_home TINYINT(1) DEFAULT 1,
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
  meta_description VARCHAR(320) DEFAULT '',
  attached_pdf_url VARCHAR(500) NULL,
  attached_pdf_label VARCHAR(255) NULL,
  is_published TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  show_share_bar TINYINT(1) DEFAULT 1,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
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
  page_type VARCHAR(40) DEFAULT 'general',
  content_html MEDIUMTEXT NOT NULL,
  photos_json MEDIUMTEXT NULL,
  items_json MEDIUMTEXT NULL,
  sort_order INT DEFAULT 1,
  is_published TINYINT(1) DEFAULT 1,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
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
  phone VARCHAR(40) NULL,
  experience_years TINYINT UNSIGNED DEFAULT 1,
  photo_url VARCHAR(255) DEFAULT 'assets/images/principal.jpg',
  external_profile_url VARCHAR(500) NULL,
  external_profile_label VARCHAR(120) NULL,
  custom_fields_json TEXT NULL,
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
  photo_url VARCHAR(255) NULL,
  sort_order INT DEFAULT 1,
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
  committee_group VARCHAR(120) NOT NULL DEFAULT 'Statutory Officer',
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
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
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published'
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ticker_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text VARCHAR(255) NOT NULL,
  link_url VARCHAR(255) NOT NULL,
  badge_text VARCHAR(60) DEFAULT 'Notice',
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campus_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  category ENUM('Event','Notice','Achievement','Circular','Placement') DEFAULT 'Notice',
  summary TEXT NOT NULL,
  content_html MEDIUMTEXT,
  image_url VARCHAR(255) DEFAULT '',
  is_featured TINYINT(1) DEFAULT 1,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1,
  FULLTEXT KEY ft_events (title, summary)
) ENGINE=InnoDB;

-- 11. Downloadable Document Repository (Quick Links — Upload OR External Link)
CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  source_type VARCHAR(20) DEFAULT 'upload',
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes INT UNSIGNED NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  uploaded_at DATE NOT NULL,
  uploaded_by VARCHAR(120) NOT NULL,
  is_quick_link TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1,
  FULLTEXT KEY ft_docs (title, category, file_name)
) ENGINE=InnoDB;

-- 12. Picture Gallery
CREATE TABLE IF NOT EXISTS gallery_albums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(80) NOT NULL,
  event_date DATE NOT NULL,
  cover_url VARCHAR(255) NOT NULL,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
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
  email VARCHAR(160) NOT NULL,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
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

-- 14. Homepage Custom HTML Components
CREATE TABLE IF NOT EXISTS custom_home_components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  placement ENUM('after-hero', 'after-about', 'after-depts', 'before-footer') DEFAULT 'after-hero',
  html_content MEDIUMTEXT NOT NULL,
  sort_order INT DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 15. CMS Key-Value Store (Backup Schedules & Snapshot Metadata)
CREATE TABLE IF NOT EXISTS cms_kv_store (
  key_name VARCHAR(80) PRIMARY KEY,
  val_json MEDIUMTEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 16. Alumni Network Profiles, Jobs & Chapter Events
CREATE TABLE IF NOT EXISTS alumni_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  phone VARCHAR(60) NULL,
  graduation_year SMALLINT NOT NULL,
  department_code VARCHAR(20) NOT NULL,
  department_name VARCHAR(160) NOT NULL,
  degree VARCHAR(120) NOT NULL,
  current_company VARCHAR(160) NULL,
  designation VARCHAR(160) NULL,
  location VARCHAR(160) NULL,
  chapter VARCHAR(120) DEFAULT 'Pandharpur Home Chapter',
  linkedin_url VARCHAR(500) NULL,
  photo_url VARCHAR(255) DEFAULT 'assets/images/principal.jpg',
  bio TEXT NULL,
  open_to_mentorship TINYINT(1) DEFAULT 0,
  is_featured TINYINT(1) DEFAULT 0,
  status ENUM('approved','pending','rejected') DEFAULT 'pending',
  sort_order INT DEFAULT 1,
  registered_at DATE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alumni_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  company VARCHAR(160) NOT NULL,
  location VARCHAR(160) NOT NULL,
  job_type VARCHAR(80) DEFAULT 'Full-Time',
  department_focus VARCHAR(80) DEFAULT 'ALL',
  experience_range VARCHAR(80) DEFAULT '0-2 Years',
  compensation VARCHAR(100) NULL,
  description TEXT NOT NULL,
  apply_url_or_email VARCHAR(300) NOT NULL,
  posted_by_alumni_name VARCHAR(140) NOT NULL,
  posted_by_batch VARCHAR(80) NOT NULL,
  deadline_date DATE NULL,
  status ENUM('open','pending','closed') DEFAULT 'open',
  posted_at DATE NOT NULL,
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alumni_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  chapter VARCHAR(120) NOT NULL,
  event_date DATE NOT NULL,
  venue VARCHAR(255) NOT NULL,
  organizer VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  banner_url VARCHAR(255) DEFAULT 'assets/images/convocation.jpg',
  registration_url VARCHAR(500) NULL,
  rsvp_count INT UNSIGNED DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alumni_discussion_topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alumni_discussion_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  author_alumni_id INT NOT NULL,
  author_name VARCHAR(150) NOT NULL,
  author_batch VARCHAR(80) NOT NULL,
  author_role VARCHAR(180) NULL,
  title VARCHAR(240) NOT NULL,
  summary VARCHAR(500) NULL,
  content MEDIUMTEXT NOT NULL,
  status ENUM('approved','pending','rejected') DEFAULT 'approved',
  is_pinned TINYINT(1) DEFAULT 0,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alumni_discussion_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  author_alumni_id INT NOT NULL,
  author_name VARCHAR(150) NOT NULL,
  author_batch VARCHAR(80) NOT NULL,
  body TEXT NOT NULL,
  created_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alumni_achievers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  batch_year SMALLINT UNSIGNED NOT NULL,
  department_code VARCHAR(32) NOT NULL,
  designation VARCHAR(160) NULL,
  organization VARCHAR(160) NULL,
  award_title VARCHAR(220) NOT NULL,
  citation TEXT NULL,
  photo_url VARCHAR(255) DEFAULT 'assets/images/principal.jpg',
  linkedin_url VARCHAR(500) NULL,
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alumni_pledges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NULL,
  batch_year SMALLINT UNSIGNED NOT NULL,
  department_code VARCHAR(32) NOT NULL,
  pledge_type VARCHAR(160) NOT NULL,
  amount_or_support VARCHAR(255) NOT NULL,
  message TEXT NULL,
  status ENUM('pending','acknowledged','fulfilled') DEFAULT 'pending',
  submitted_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB;

-- ============================================================================
-- Seed Data
-- ============================================================================
INSERT INTO site_settings (id, trust_name, institution_name, short_code, affiliation, aicte_code, dte_code, address, phone, email, emergency_helpline, anti_ragging_helpline, about_summary, about_image_url, vision_text, mission_text, recruiters, home_sections_json, highlights_json, approved_bodies_json)
VALUES (
  1,
  'Shri Vitthal Education & Research Institute (SVERI)',
  'SVERI''s College of Engineering, Pandharpur (Autonomous)',
  'SVERI',
  'Affiliated to PAHSUS Solapur · Approved by AICTE · Autonomous Status (AY 2024-25) · NAAC A+ (3.46)',
  '1-49281724',
  '06220',
  'Gopalpur-Ranjani Road, P.B. No. 54, Gopalpur, Pandharpur - 413304, Dist. Solapur, Maharashtra, India',
  '+91-02186-216063',
  'principal@coe.sveri.ac.in',
  '+91-9545553888',
  '1800-180-5522',
  'Established in 1998 under Shri Vitthal Education & Research Institute (SVERI), SVERI''s College of Engineering, Pandharpur (Autonomous from AY 2024-25) is NAAC A+ (CGPA 3.46) accredited and upholds full UGC NEP 2020 public disclosures.',
  'assets/images/hero_campus.jpg',
  'To be nationally recognized among the best institutes in India for excellence in technical education.',
  'To impart value-based technical education through innovation and excellence, empowering individuals to become leaders in their fields to create a positive impact.\nTo create an ambiance of academic excellence, research, and life skills by fostering a learning environment that empowers individuals to achieve their full potential.\nTo foster strong relationships amongst all stakeholders by inculcating a personal touch and mutual respect in all interactions.',
  'TCS (Digital & Ninja)\nInfosys\nAccenture\nDeloitte\nWipro\nTech Mahindra\nHexaware\nBharat Forge\nMahindra & Mahindra\nAtlas Copco',
  '{"showTicker":1,"showSlider":1,"showStatsAndRecognitions":1,"showAboutAndDownloads":1,"showApprovedAndVision":1,"showLeadershipDesk":1,"showExaminationSpotlight":1,"showDepartments":1,"showCategoriesDirectory":1,"showEventsAndRecruiters":1,"examSpotlightTitle":"Autonomous Examination Portal (CoE)","departmentsTitle":"Academic Departments","categoriesTitle":"Statutory Self-Disclosure & Autonomous Portals"}',
  '[{"label":"Placement Track","value":"91.1%"},{"label":"Recruiters","value":"250+"},{"label":"NAAC A+ Grade","value":"3.46"},{"label":"DTE Code","value":"06220"}]',
  '[{"name":"AICTE New Delhi","subtitle":"Statutory Technical Approval","href":"page.php?slug=act-statutes-moa"},{"name":"UGC Autonomous","subtitle":"Autonomous from AY 2024-25","href":"page.php?slug=about-overview"},{"name":"NAAC A+ Grade","subtitle":"CGPA 3.46 / 4.00","href":"page.php?slug=accreditation-ranking"},{"name":"PAHSUS Solapur","subtitle":"Affiliating University","href":"page.php?slug=about-overview"}]'
);

INSERT INTO departments (id, slug, code, name, short_name, established_year, intake_capacity, nba_status, hod_name, overview, vision, mission, library_json, faculty_field_schema_json) VALUES
(1, 'computer-science', 'CSE', 'Computer Science & Engineering', 'CSE', 1998, 180, 'NBA Accredited', 'Dr. Anjali K. Deshpande', 'NBA accredited flagship computing department with 180 B.Tech intake, AI/GPU cluster & Ph.D. Research Centre.', 'To nurture globally competitive computing professionals.', 'Deliver outcome-based technical education and funded AI research.', '{"name":"CSE Departmental Knowledge Resource Library","volumesCount":3850,"journalsCount":24,"eResourcesSummary":"IEEE Xplore, ACM Digital Library, NPTEL Offline Archive & GATE Prep Bank","incharge":"Prof. S. P. Kulkarni","timings":"Mon–Sat, 8:30 AM – 6:30 PM","photoUrl":"assets/images/hero_library.jpg","description":"Dedicated computing reference library housing B.Tech/M.Tech project theses, ACM/IEEE proceedings, and quiet study carrels."}', '["Google Scholar","ORCID ID","Scopus Author ID","NPTEL Certification","Patents Granted"]'),
(2, 'mechanical', 'MECH', 'Mechanical Engineering', 'Mechanical', 1998, 120, 'NBA Accredited', 'Dr. Rajendra B. Kulkarni', 'Founding department with 120 B.Tech intake, Tata CIII Robotics Lab, CNC Centre & Ph.D. Centre.', 'To excel in sustainable manufacturing and robotics.', 'Cultivate hands-on design thinking and industrial consultancy.', NULL, '["Google Scholar","ORCID ID","Patents Granted"]'),
(3, 'civil', 'CIVIL', 'Civil Engineering', 'Civil', 2001, 120, 'NBA Accredited', 'Dr. Suhas V. Patwardhan', 'Offers B.Tech Civil Engineering (120 intake), M.Tech Structural & Ph.D. Centre with material testing consultancy.', 'To engineer resilient, sustainable infrastructure.', 'Train socially responsible civil engineers.', NULL, '["Google Scholar","Consultancy Projects"]'),
(4, 'entc', 'ENTC', 'Electronics & Telecommunication Engineering', 'E&TC', 1998, 120, 'NBA Accredited', 'Dr. Vandana P. Chavan', 'Offers B.Tech E&TC (120 intake), VLSI chip design, Embedded Centre & Ph.D. Research Centre.', 'To excel in semiconductor design and embedded intelligence.', 'Empower students with hardware-software co-design expertise.', NULL, '["Google Scholar","ORCID ID"]'),
(5, 'electrical', 'ELEC', 'Electrical Engineering', 'Electrical', 2010, 60, 'AICTE Approved', 'Dr. M. R. Joshi', 'B.Tech Electrical Engineering (60 intake) with Power Systems, EV Drives & PLC/SCADA automation labs.', 'To develop competent electrical engineers driving clean energy.', 'Integrate hands-on power systems training with EV & smart grid research.', NULL, '["Google Scholar","ORCID ID"]'),
(6, 'electronics-computer', 'ECS', 'Electronics & Computer Engineering', 'ECS', 2022, 60, 'AICTE Approved', 'Prof. P. S. Sawant', 'B.Tech Electronics & Computer Engineering (60 intake) combining embedded hardware, RTOS, cloud IoT & full-stack software.', 'To develop versatile engineers across silicon-to-cloud stacks.', 'Deliver project-based training in Embedded IoT, Linux & Cloud APIs.', NULL, '["Google Scholar","GitHub"]' );

-- Default RBAC Passwords (real bcrypt hashes; also re-initializable via setup.php):
-- admin@svcoer.edu.in   / Admin@123
-- pro@svcoer.edu.in     / Editor@123
-- hod.cse@svcoer.edu.in / Dept@123
-- iqac@svcoer.edu.in    / Iqac@123
-- coe@coe.sveri.ac.in   / Exam@123
INSERT INTO users (full_name, email, password_hash, role, assigned_department_id, allowed_categories_json, allowed_page_ids_json) VALUES
('Dr. Vikramaditya Kulkarni', 'admin@svcoer.edu.in', '$2y$12$jJ07I06ebDMeJEN7QsY4uev.xxoHmgN40Xv76YkLti6qYm0OH5tpa', 'super_admin', NULL, NULL, NULL),
('Prof. Sneha Patwardhan (PRO)', 'pro@svcoer.edu.in', '$2y$12$MvanoDnpi8VLqiGnv0aaqO4zdMoaqtfNV0n7yUHQm.JjoAHxpov3u', 'content_editor', NULL, NULL, NULL),
('Dr. Anjali K. Deshpande (CSE)', 'hod.cse@svcoer.edu.in', '$2y$12$IuYIZs0/0nNl5UBpoIcBoO2F8MAYzpAR1khT64OdYwWocLJAxIMfu', 'department_admin', 1, NULL, NULL),
('Dr. M. M. Pawar (IQAC)', 'iqac@svcoer.edu.in', '$2y$12$BsZtjgY0Plf8R1M3Asu3iuV8BfaIwSoS.7elVQNYjaWxjrp1mB7z2', 'iqac_officer', NULL, '["about-hei","administration","academics"]', NULL),
('Dr. M. S. Kumbhar (Controller of Examinations)', 'coe@coe.sveri.ac.in', '$2y$12$jJ07I06ebDMeJEN7QsY4uev.xxoHmgN40Xv76YkLti6qYm0OH5tpa', 'exam_controller', NULL, '["examination"]', NULL);

INSERT INTO categories (id, slug, name, short_label, ugc_code, description, show_in_menu, show_on_home, sort_order) VALUES
(1, 'about-hei', 'About HEI', 'About HEI', 'Section 5(a)', 'Overview, Act & Statutes, IDP, Affiliating University, NAAC/NBA/NIRF, UGC 2(f)/12B, Annual Reports & Accounts.', 1, 1, 1),
(2, 'administration', 'Administration', 'Administration', 'Section 5(b)', 'Statutory officers, Governing Body, Academic Council, Finance Committee, ICC & Academic Leadership.', 1, 1, 2),
(3, 'academics', 'Academics', 'Academics', 'Section 5(c)', 'Programs, Calendar, Ordinances, Department Microsites, Faculty Directory, IQAC, Library & Collaborations.', 1, 1, 3),
(9, 'examination', 'Examination', 'Examination', 'Autonomous · CoE', 'Controller of Examinations, Autonomous Ordinances, Timetables, Hall Tickets, Results, Revaluation, ABC/NAD & Convocation.', 1, 1, 4),
(4, 'admissions-fee', 'Admissions & Fee', 'Admissions', 'Section 5(d)', 'Prospectus, FRA Fee Structure, Admission Process & UGC Fee Refund Policy.', 1, 1, 5),
(5, 'research', 'Research', 'Research', 'Section 5(e)', 'R&D Cell, Consultancy, Foreign/Industry Collaborations, Incubation Centre & Central Facilities.', 1, 1, 6),
(6, 'student-life', 'Student Life & Cells', 'Student Life', 'Section 5(f)', 'Sports, NCC/NSS, Hostels, Placements, SGRC, Health, Anti-Ragging, Equal Opportunity, SEDG & Barrier-Free Campus.', 1, 1, 7),
(7, 'alumni', 'Alumni', 'Alumni', 'Section 5(g)', 'Alumni Association details, registration and notable alumni.', 1, 1, 8),
(8, 'information-corner', 'Information Corner', 'Info Corner', 'Section 5(h)', 'RTI CPIO/Appellate, Circulars, Announcements, Newsletters, Events, Jobs, Reservation Roster & Study in India.', 1, 1, 9);

INSERT IGNORE INTO pages (category_id, slug, title, subtitle, content_html, is_published, sort_order, updated_at) VALUES
(1, 'about-overview', 'About Us: Institutional Overview', 'UGC Section 5(a)', '<h2>Institutional Profile</h2><p>SVERI''s College of Engineering, Pandharpur (Autonomous), established in 1998 under Shri Vitthal Education &amp; Research Institute (SVERI), holds NAAC A+ (CGPA 3.46 / 4.00), Autonomous status from AY 2024&ndash;25, and DTE Institute Code 06220 under Punyashlok Ahilyadevi Holkar Solapur University, Solapur.</p>', 1, 1, '2026-10-15'),
(1, 'act-statutes-moa', 'Act, Statutes & MoA', 'UGC Section 5(a)', '<h2>Statutory Governance Instruments</h2><p>Governed by UGC Autonomous Colleges Regulations 2023 and Maharashtra Public Trust Act under Shri Vitthal Education &amp; Research Institute (SVERI).</p>', 1, 2, '2026-10-10'),
(1, 'institutional-development-plan', 'Institutional Development Plan (IDP)', 'UGC Section 5(a)', '<h2>NEP 2020 Strategic Roadmap</h2><p>10-year roadmap covering Academic Bank of Credits, Interdisciplinary Minors, and Research Incubation.</p>', 1, 3, '2026-09-22'),
(1, 'affiliating-university', 'Constituent Units & Affiliating University', 'UGC Section 5(a) · University Affiliation & Campus Units', '<h2>Affiliating University</h2><p>All undergraduate, postgraduate, and doctoral degrees are awarded by <strong>Punyashlok Ahilyadevi Holkar Solapur University (PAHSUS), Solapur</strong>, with autonomous curriculum design, continuous internal assessment, and end-semester examinations conducted by SVCOER.</p><h2>Sister &amp; Constituent Academic Units</h2><ul><li>Shri Vithal College of Engineering &amp; Research (Autonomous), Pandharpur — Main Campus</li><li>SVCOER Polytechnic Wing (Diploma in Engineering — MSBTE Affiliated)</li><li>Centre for Executive Management &amp; Innovation Studies (CEMIS)</li></ul>', 1, 4, '2026-08-18'),
(1, 'accreditation-ranking', 'Accreditation & Ranking (NAAC, NBA, NIRF)', 'UGC Section 5(a)', '<h2>NAAC A+ (CGPA 3.46) · NBA Accredited · NIRF 151-200</h2><p>Institutional quality benchmarks verified by IQAC.</p>', 1, 5, '2026-10-02'),
(1, 'recognition-approval', 'Recognition & Regulatory Approvals (UGC 2(f), 12B, AICTE)', 'UGC Section 5(a) · Statutory Extensions of Approval', '<h2>Regulatory Approvals</h2><p>SVERI&rsquo;s College of Engineering, Pandharpur holds continuous statutory approvals from all apex regulatory bodies:</p><ul><li><strong>UGC 2(f), 12(B) &amp; Autonomous Status:</strong> Conferred Autonomous Status effective from AY 2024&ndash;25 under Punyashlok Ahilyadevi Holkar Solapur University, Solapur.</li><li><strong>AICTE Approval:</strong> Approved by All India Council for Technical Education (AICTE), New Delhi (Permanent ID: 1-49281724).</li><li><strong>Government of Maharashtra &amp; DTE:</strong> DTE Institute Code <strong>06220</strong>.</li></ul>', 1, 6, '2026-09-12'),
(1, 'annual-reports', 'Annual Reports', 'UGC Section 5(a) · Yearly Academic, Research & Governance Reports', '<h2>Published Institutional Annual Reports</h2><p>In compliance with UGC Public Self-Disclosure norms, complete institutional annual reports detailing admissions, examination outcomes, faculty publications, placement records, and extension activities are published openly below:</p><table><thead><tr><th>Academic Year</th><th>Document Title</th><th>Approval Date</th></tr></thead><tbody><tr><td>2025–26</td><td>28th Institutional Annual Report (IQAC Verified)</td><td>2026-08-20</td></tr><tr><td>2024–25</td><td>27th Institutional Annual Report</td><td>2025-08-18</td></tr><tr><td>2023–24</td><td>26th Institutional Annual Report</td><td>2024-08-14</td></tr></tbody></table>', 1, 7, '2026-08-25'),
(1, 'annual-accounts-audit', 'Annual Accounts & Audit Reports', 'UGC Section 5(a)', '<h2>Audited Financial Statements</h2><p>Balance Sheet, Income &amp; Expenditure, and Receipts &amp; Payments certified by Statutory Auditors.</p>', 1, 8, '2026-09-30'),
(1, 'sponsoring-body', 'Sponsoring Body Details', 'UGC Section 5(a) · Shri Vitthal Education & Research Institute (SVERI)', '<h2>Shri Vitthal Education &amp; Research Institute (SVERI)</h2><p>Established as a charitable educational trust, <strong>Shri Vitthal Education &amp; Research Institute (SVERI)</strong> founded its flagship Engineering College in 1998 to deliver accessible, high-calibre technical and management education rooted in innovation and ethics.</p><p><strong>Registered Office:</strong> Gopalpur-Ranjani Road, P.B. No. 54, Gopalpur, Pandharpur &ndash; 413304, Dist. Solapur, Maharashtra · Tel: +91-02186-216063.</p>', 1, 9, '2026-07-15'),
(2, 'statutory-officers', 'Statutory Officers & Administrative Leadership', 'UGC Section 5(b)', '<h2>Key Statutory Officers</h2><p>Complete profiles of Principal, Registrar, Finance Officer, Controller of Examinations, CVO, and Ombudsperson.</p>', 1, 1, '2026-10-05'),
(2, 'governing-bodies', 'Governing Body, Academic Council & Committees', 'UGC Section 5(b)', '<h2>Governing Body Composition</h2><p>Includes Trust Chairperson, Principal, UGC Nominee, State Govt Nominee, and Industry Representatives.</p>', 1, 2, '2026-09-28'),
(2, 'internal-complaint-committee', 'Internal Complaint Committee (ICC)', 'UGC Section 5(b) & 5(f) · POSH Act Compliance & Zero-Tolerance Mechanism', '<h2>Internal Complaint Committee (ICC)</h2><p>Constituted under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 and UGC Regulations 2015:</p><table><thead><tr><th>Name</th><th>Designation</th><th>Role in ICC</th><th>Contact</th></tr></thead><tbody><tr><td>Dr. Meenakshi S. Pawar</td><td>Professor &amp; Dean Student Affairs</td><td>Presiding Officer</td><td>icc@svcoer.edu.in</td></tr><tr><td>Prof. Snehal R. Jadhav</td><td>Associate Professor, E&amp;TC</td><td>Faculty Member</td><td>+91 2186 225088</td></tr><tr><td>Adv. Vandana Kulkarni</td><td>District Legal Services Authority</td><td>External NGO / Legal Member</td><td>legal.icc@svcoer.edu.in</td></tr><tr><td>Ms. Rutuja Bhosale</td><td>Final Year B.Tech CSE</td><td>Student Representative</td><td>icc.student@svcoer.edu.in</td></tr></tbody></table>', 1, 3, '2026-09-14'),
(3, 'academic-programs', 'Details of Academic Programs', 'UGC Section 5(c)', '<h2>UG, PG &amp; Doctoral Programs</h2><p>B.Tech: CSE (180), E&amp;TC (120), Mechanical (120), Civil (120), Electrical (60), ECS (60); M.Tech, MBA (60), MCA (60) &amp; Ph.D. Research Centres (CSE, E&amp;TC, Mechanical Design, Civil).</p>', 1, 1, '2026-10-08'),
(3, 'academic-calendar', 'Academic Calendar (2026–27)', 'UGC Section 5(c) · Semester Schedule, Examinations & Co-Curricular Dates', '<h2>Odd &amp; Even Semester Schedule (AY 2026–27)</h2><table><thead><tr><th>Academic Milestone</th><th>Odd Semester</th><th>Even Semester</th></tr></thead><tbody><tr><td>Commencement of Classes</td><td>15 July 2026</td><td>05 January 2027</td></tr><tr><td>In-Semester Evaluation (ISE-I)</td><td>07–12 September 2026</td><td>22–27 February 2027</td></tr><tr><td>End-Semester Theory Examinations</td><td>18 Nov – 05 Dec 2026</td><td>03–22 May 2027</td></tr><tr><td>Declaration of Results</td><td>22 December 2026</td><td>08 June 2027</td></tr></tbody></table>', 1, 2, '2026-07-02'),
(3, 'academic-statutes', 'Academic & Examination Ordinances', 'UGC Section 5(c) · Credit Framework, Grading System & ABC Guidelines', '<h2>Autonomous Examination &amp; Grading Ordinances</h2><p>SVCOER follows a 160-credit Outcome-Based Education (OBE) curriculum integrated with the National Credit Framework (NCrF) and Academic Bank of Credits (ABC). Continuous evaluation accounts for 40% weightage and End-Semester Examinations account for 60%.</p>', 1, 3, '2026-08-10'),
(3, 'iqac', 'Internal Quality Assurance Cell (IQAC)', 'UGC Section 5(c)', '<h2>IQAC Quality Mandate</h2><p>Coordinator: Dr. M. M. Pawar. AQAR &amp; Academic Audit reports published in Document Repository.</p>', 1, 4, '2026-09-25'),
(3, 'central-library', 'Central Library & Digital Knowledge Centre', 'UGC Section 5(c) · Print Volumes, IEEE/Springer Access & 24x7 Reading Hall', '<h2>Library Resources at a Glance</h2><table><thead><tr><th>Resource Category</th><th>Holding / Subscription</th></tr></thead><tbody><tr><td>Total Print Volumes</td><td>68,450 Books (14,200+ Titles)</td></tr><tr><td>E-Journals &amp; Databases</td><td>IEEE Xplore, SpringerLink, ASME, Elsevier ScienceDirect, DELNET</td></tr><tr><td>Seating Capacity</td><td>450 Seats (Air-conditioned Digital &amp; Reference Halls)</td></tr><tr><td>Library Automation</td><td>KOHA Integrated LMS with RFID Self-Check-In</td></tr></tbody></table>', 1, 5, '2026-08-30'),
(3, 'odl-online-programs', 'UGC-Recognized ODL / Online & Swayam-NPTEL Courses', 'UGC Section 5(c) · Credit Transfer & MOOC Integration', '<h2>ODL &amp; Online Learning Compliance</h2><p>SVCOER currently offers full-time on-campus regular degree programs and does not run standalone ODL degree programs. However, up to 40% credit transfer is facilitated via <strong>SWAYAM-NPTEL</strong> Local Chapter (rated AA National Top 50) under UGC Credit Framework for Online Learning Courses.</p>', 1, 6, '2026-08-19'),
(3, 'academic-collaborations', 'Academic & Industry Collaborations (MoUs)', 'UGC Section 5(c) & 5(e) · Active Domestic & International Partnerships', '<h2>Active Academic MoUs</h2><table><thead><tr><th>Partner Institution / Industry</th><th>Scope of Collaboration</th><th>Valid Until</th></tr></thead><tbody><tr><td>IIT Bombay (FOSSEE &amp; Spoken Tutorial)</td><td>Open-Source Robotics &amp; Faculty FDP</td><td>2028</td></tr><tr><td>Tata Technologies Ltd.</td><td>Centre for Invention, Innovation &amp; Incubation (CIII)</td><td>2029</td></tr><tr><td>TU Dresden, Germany (Summer Exchange)</td><td>Sustainable Manufacturing Student Exchange</td><td>2027</td></tr><tr><td>Persistent Systems &amp; Zensar</td><td>Industry-Certified Cloud &amp; AI Electives</td><td>2028</td></tr></tbody></table>', 1, 7, '2026-09-18'),
(4, 'prospectus-fee-structure', 'Prospectus & FRA Fee Structure (2026-27)', 'UGC Section 5(d)', '<h2>FRA Approved Fee Structure</h2><p>DTE Code 06220 · B.Tech Open Annual Fee: INR 1,13,000 (Tuition INR 98,214 + Development INR 14,786).</p>', 1, 1, '2026-10-12'),
(4, 'admission-process', 'Admission Process & Eligibility Guidelines', 'UGC Section 5(d) · CAP Centralized Admissions & Institute Level Quota', '<h2>Admission Procedure</h2><p>Admissions to First Year B.Tech and Direct Second Year (Lateral Entry) are conducted transparently through the Centralized Admission Process (CAP) of the State CET Cell, Government of Maharashtra, based on MHT-CET / JEE (Main) merit.</p><ul><li><strong>Step 1:</strong> Register on Maharashtra State CET Cell CAP Portal (DTE Code: 06220).</li><li><strong>Step 2:</strong> Document Verification at Scrutiny Centre &amp; Option Form submission.</li><li><strong>Step 3:</strong> Seat Allotment confirmation &amp; reporting at SVERI Admission Cell with original certificates.</li></ul>', 1, 2, '2026-09-01'),
(4, 'fee-refund-policy', 'UGC Fee Refund Policy', 'UGC Section 5(d)', '<h2>100% Transparent Refund Policy</h2><p>Full refund within 15 working days for cancellations 15+ days prior to admission cutoff.</p>', 1, 3, '2026-08-21'),
(5, 'research-development-cell', 'Research & Development Cell', 'UGC Section 5(e)', '<h2>Sponsored R&amp;D Projects</h2><p>DST-SERB, AICTE-MODROBS, and MSME Design Clinic funded research projects.</p>', 1, 1, '2026-09-29'),
(5, 'incubation-cell', 'Incubation Centre, Start-ups & IIC Cell', 'UGC Section 5(e) · SVCOER Technology Business Incubator (TBI)', '<h2>Entrepreneurship &amp; Start-up Ecosystem</h2><p>Recognized with a <strong>4-Star Rating by MoE''s Innovation Cell (IIC)</strong>, the SVCOER Technology Business Incubator provides seed funding up to INR 5 Lakhs, co-working prototyping labs, and IP filing support. Over 18 student-led start-ups have been incubated since 2021.</p>', 1, 2, '2026-09-05'),
(5, 'central-facilities', 'Central Research & Computing Facilities', 'UGC Section 5(e) · HPC GPU Cluster, Material Testing & Central Workshop', '<h2>Central Instrumentation &amp; Shared Labs</h2><ul><li><strong>NVIDIA DGX / High-Performance Computing Node:</strong> 4x A100 GPUs for Deep Learning &amp; CFD simulations.</li><li><strong>Central Material Testing Laboratory:</strong> 1000 kN Universal Testing Machine &amp; Scanning Electron Microscope access.</li><li><strong>FabLab &amp; Rapid Prototyping Studio:</strong> Industrial 3D Printers, Laser Cutters &amp; PCB Milling.</li></ul>', 1, 3, '2026-08-29'),
(5, 'conferences-workshops-events', 'National & International Conferences, Workshops & Symposia', 'UGC Section 5(e) · Dedicated Microsites, Call for Papers, Keynotes & Research Events', '<div class="cms-block cms-slider" data-block="custom-slider" data-autoplay="5" data-height="380"><div class="cms-slider-viewport" style="height:380px;"><div class="cms-slide is-active" data-slide-index="0"><img src="assets/images/hero_campus.jpg" alt="ICAEST-2026: International Conference on Smart Technology" /><div class="cms-slide-overlay"><h3 class="cms-slide-title">ICAEST-2026: International Conference on Smart Technology</h3><p class="cms-slide-caption">Annual Flagship International Conference with IEEE/Springer proceedings and hybrid tracks.</p><p class="cms-slide-cta-row"><a class="cms-btn cms-btn-amber cms-slide-cta" href="conference.php?slug=icaest-2026">Open ICAEST-2026 Microsite</a></p></div></div><div class="cms-slide" data-slide-index="1"><img src="assets/images/hero_lab.jpg" alt="National Workshops, FDPs &amp; Edge AI Symposia" /><div class="cms-slide-overlay"><h3 class="cms-slide-title">National Workshops, FDPs &amp; Edge AI Symposia</h3><p class="cms-slide-caption">Hands-on research workshops, STTPs, and patent filing clinics hosted year-round.</p><p class="cms-slide-cta-row"><a class="cms-btn cms-btn-amber cms-slide-cta" href="conferences.php">Browse All Programs</a></p></div></div></div><button type="button" class="cms-slider-prev" aria-label="Previous slide">&#8249;</button><button type="button" class="cms-slider-next" aria-label="Next slide">&#8250;</button><div class="cms-slider-dots"><button type="button" class="cms-slider-dot is-active" data-slide-to="0" aria-label="Go to slide 1"></button><button type="button" class="cms-slider-dot" data-slide-to="1" aria-label="Go to slide 2"></button></div></div><p></p><h2>Academic Conferences, Workshops &amp; Technical Events</h2><p>SVCOER regularly hosts National &amp; International Conferences, AICTE/ISTE Faculty Development Programs (FDPs), Research Workshops, and Technical Symposia. Use the interactive portals below to inspect tracks, schedules, organizing committee profiles, or submit manuscripts online.</p>', 1, 4, '2026-11-12'),
(6, 'placement-cell', 'Training & Placement Cell', 'UGC Section 5(f)', '<h2>91.1% Placement Track · 250+ Recruiters</h2><p>Supported by Communication Improvement Programs (CIP) and language labs with top recruiters including TCS, Infosys, Accenture, Deloitte, Wipro, Tech Mahindra, Hexaware &amp; Bharat Forge.</p>', 1, 1, '2026-10-14'),
(6, 'sgrc', 'Student Grievance Redressal Committee (SGRC)', 'UGC Section 5(f)', '<h2>SGRC &amp; Ombudsperson</h2><p>Guaranteed resolution within 15 working days under UGC Redressal of Grievances Regulations 2023.</p>', 1, 2, '2026-09-10'),
(6, 'anti-ragging-cell', 'Anti-Ragging, ICC, Equal Opportunity & SEDG Cells', 'UGC Section 5(f)', '<h2>Zero Tolerance &amp; Barrier-Free Campus</h2><p>24x7 Anti-Ragging Helpline: 1800-180-5522. Ramps, elevators, tactile paths &amp; assistive tech enabled.</p>', 1, 3, '2026-09-03'),
(6, 'sports-ncc-nss', 'Sports Facilities, NCC, NSS & Hostels', 'UGC Section 5(f) · Athletics, Community Service & Residential Campus', '<h2>Sports, NCC/NSS &amp; Residential Facilities</h2><ul><li><strong>Sports Complex:</strong> 400m synthetic athletic track, floodlit basketball/volleyball courts, cricket ground, and indoor badminton stadium.</li><li><strong>NCC &amp; NSS:</strong> 200-cadet NCC Army Wing Unit and 250-volunteer NSS Unit conducting annual rural water-conservation camps.</li><li><strong>Hostels:</strong> Separate Boys (650 beds) &amp; Girls (480 beds) hostels with solar hot water, Wi-Fi, and hygienic dining halls.</li><li><strong>Health Centre:</strong> 10-bed campus clinic with resident medical officer and 24x7 ambulance.</li></ul>', 1, 4, '2026-08-12'),
(6, 'equal-opportunity-sedg-barrier-free', 'Equal Opportunity, SEDG Cell & Barrier-Free Campus', 'UGC Section 5(f) · Divyangjan Accessibility & Inclusive Support Systems', '<h2>Inclusivity &amp; Accessibility Commitment</h2><ul><li><strong>Equal Opportunity &amp; SC/ST/OBC Cell:</strong> Facilitates post-matric scholarships, remedial coaching, and competitive exam mentorship.</li><li><strong>Socio-Economically Disadvantaged Groups (SEDG) Cell:</strong> Implements NEP 2020 equity initiatives, earn-while-learn schemes, and book-bank grants.</li><li><strong>Facilities for Differently-Abled (Divyangjan):</strong> Ramps with railings across all academic blocks, elevators in every building, tactile paving, accessible washrooms, and screen-reader equipped library workstations.</li></ul>', 1, 5, '2026-09-03'),
(7, 'alumni-association', 'Registered Alumni Association', 'UGC Section 5(g)', '<h2>SVERI Alumni Network</h2><p>11,500+ engineering alumni across global chapters.</p>', 1, 1, '2026-09-19'),
(8, 'rti-disclosure', 'RTI: CPIO & Appellate Authority', 'UGC Section 5(h)', '<h2>Right to Information Act 2005</h2><p>PIO: Shri S. G. Kulkarni (Registrar) · First Appellate Authority: Dr. B. P. Ronge (Principal, principal@coe.sveri.ac.in, +91-02186-216063).</p>', 1, 1, '2026-09-11'),
(8, 'circulars-notices', 'Circulars, Notices & Announcements', 'UGC Section 5(h)', '<h2>Official Notices</h2><p>Exam schedules, job openings, reservation roster &amp; Study in India disclosures.</p>', 1, 2, '2026-10-18'),
(8, 'reservation-roster-study-india', 'Reservation Roster & Study in India (International Cell)', 'UGC Section 5(h) · Statutory Roster & International Student Admissions', '<h2>Reservation Roster Compliance</h2><p>Faculty recruitment and student admissions strictly adhere to the Government of Maharashtra &amp; UGC Reservation Roster norms (SC, ST, VJNT, OBC, EWS, and PwD categories). Verified annual roster statements are published in the Document Center.</p><h2>Study in India &amp; International Students Cell</h2><p>SVCOER is registered on the Government of India <strong>Study in India (SII)</strong> portal with dedicated hostel wing, FRRO visa assistance, English bridge modules, and cultural orientation for international scholars.</p>', 1, 3, '2026-09-20'),
(9, 'examination-cell-coe', 'Examination Cell & Controller of Examinations', 'Autonomous Examination Section', '<h2>Autonomous Examination Governance</h2><p>Independent Evaluation Cell headed by Dr. M. S. Kumbhar (Controller of Examinations, coe@coe.sveri.ac.in). Publishes End-Semester results within 20 working days and oversees question bank moderation and double-valuation integrity.</p>', 1, 1, '2026-10-18'),
(9, 'examination-ordinances', 'Autonomous Ordinances, Credit System & 10-Point Grading', 'UGC Autonomous Regulations', '<h2>NEP 2020 Credit &amp; Grading Framework</h2><p>Follows Continuous Internal Evaluation (CIE 40%) + End Semester Examination (ESE 60%) across a 10-point absolute/relative grading scale with ATKT/Grace ordinances.</p>', 1, 2, '2026-10-12'),
(9, 'exam-timetable-hallticket', 'Exam Time Tables, Forms & Hall Tickets', 'Winter / Summer Sessions', '<h2>Theory &amp; Practical Examination Schedules</h2><p>Exam registration forms, hall ticket download schedules, and scribe/extra-time provisions for Divyangjan candidates.</p>', 1, 3, '2026-10-15'),
(9, 'results-revaluation', 'Results, Photocopy & Revaluation Grievances', '20-Day Result Mandate', '<h2>Transparent Result Declaration &amp; Revaluation</h2><p>Students may apply for answer-script photocopy within 7 days and revaluation within 12 days via the Examination Cell portal.</p>', 1, 4, '2026-10-16'),
(9, 'abc-nad-verification', 'Academic Bank of Credits (ABC) & DigiLocker NAD', 'NEP 2020 Digital Credits', '<h2>ABC ID &amp; NAD Degree Verification</h2><p>All autonomous semester credits and provisional certificates are deposited directly into DigiLocker NAD under NEP 2020.</p>', 1, 5, '2026-10-10'),
(9, 'convocation-transcripts', 'Convocation, Provisional Degree & Transcripts', 'Degrees & Academic Verification', '<h2>Convocation &amp; Employer Verification</h2><p>Online portal for official sealed transcripts, migration certificates, medium-of-instruction letters, and degree verification.</p>', 1, 6, '2026-10-14');

INSERT INTO department_subpages (department_id, slug, title, page_type, content_html, photos_json, items_json, sort_order, updated_at) VALUES
(1, 'about', 'About Department', 'general', '<h2>CSE Department</h2><p>NBA Accredited department (180 intake) offering Honours in AI/ML and Cyber Security.</p>', NULL, NULL, 1, '2026-10-01'),
(1, 'hod-desk', 'HoD Desk', 'general', '<h2>Message from Dr. Anjali K. Deshpande</h2><p>Focused on first-principles computing and industry-ready engineering.</p>', NULL, NULL, 2, '2026-09-25'),
(1, 'notice-board', 'Department Notice Board', 'notice_board', '<p>Official circulars, unit test schedules, and project review notices for B.Tech &amp; M.Tech CSE.</p>', NULL, '[{"id":"cse-nb-1","title":"BE / B.Tech Semester VII Project Review Phase-II Schedule","date":"2026-10-20","badge":"Project Review","summary":"All Final Year project batches must submit synopsis & IEEE progress draft to guides.","linkUrl":"https://drive.google.com/file/d/1example-cse-notice/view","linkLabel":"Open Circular (Google Drive)"},{"id":"cse-nb-2","title":"Autonomous Internal Assessment-II Timetable (CSE)","date":"2026-10-14","badge":"Examination","summary":"IA-II starts Nov 4 in Academic Block B. Check seating allocation.","linkUrl":""}]', 3, '2026-10-20'),
(1, 'syllabus', 'Notes & Syllabus Repository', 'notes_syllabus', '<h2>160-Credit NEP 2020 Pattern &amp; Courseware</h2><p>Download autonomous syllabi and curated faculty lecture notes via direct upload or Google Drive links.</p>', NULL, '[{"id":"cse-syl-1","title":"B.Tech CSE Autonomous Syllabus (NEP 2020 160 Credits)","date":"2026-08-20","badge":"Syllabus","summary":"Complete First to Final Year Autonomous structure & course outcomes.","linkUrl":"https://drive.google.com/file/d/1example-cse-syllabus/view","linkLabel":"Download via Google Drive"},{"id":"cse-syl-2","title":"Deep Learning & NLP Lecture Notes Bundle (Sem VII)","date":"2026-09-12","badge":"Lecture Notes","summary":"Module 1–5 slides, PyTorch notebooks & previous question banks.","linkUrl":"https://drive.google.com/drive/folders/1example-dl-notes","linkLabel":"Open Drive Folder"}]', 4, '2026-09-15'),
(1, 'events', 'Events & Celebrations', 'events', '<p>Hackathons, Technical Symposia, Engineer''s Day &amp; Departmental Celebrations.</p>', '[{"url":"assets/images/hero_campus.jpg","caption":"Annual TechFest & Coding Hackathon Inauguration"}]', '[{"id":"cse-ev-1","title":"Smart India Hackathon Campus Bootcamp","date":"2026-10-08","badge":"Hackathon","summary":"36-hour problem ideation workshop mentored by TCS & Persistent alumni."}]', 5, '2026-10-08'),
(1, 'achievements', 'Student & Faculty Achievements', 'achievements_students', '<p>National hackathon wins, GATE top rankers, patents granted &amp; indexed publications.</p>', NULL, '[{"id":"cse-ach-1","title":"SIH Hardware Edition National Winners","date":"2026-09-20","badge":"National Rank 1","summary":"Team ByteKnights (CSE) won INR 1,00,000 first prize in Smart Agriculture IoT track."}]', 6, '2026-09-20'),
(1, 'gallery', 'Department Photo Gallery', 'gallery', '<p>Glimpses of GPU Computing Lab, Hackathon Teams, and Department Celebrations.</p>', '[{"url":"assets/images/hero_lab.jpg","caption":"NVIDIA GPU & Deep Learning Research Lab"},{"url":"assets/images/hero_library.jpg","caption":"CSE Departmental Reference Library"},{"url":"assets/images/convocation.jpg","caption":"CSE Top Rankers at Autonomous Convocation"}]', NULL, 7, '2026-10-05'),
(2, 'about', 'About Department', 'general', '<h2>Mechanical Engineering</h2><p>120 intake · Equipped with Tata Technologies CIII Robotics Lab and CNC Centres.</p>', NULL, NULL, 1, '2026-09-12'),
(3, 'about', 'About Department', 'general', '<h2>Civil Engineering</h2><p>120 intake · Structural Engineering and material testing consultancy.</p>', NULL, NULL, 1, '2026-09-09'),
(4, 'about', 'About Department', 'general', '<h2>E&amp;TC Engineering</h2><p>120 intake · Cadence VLSI tools and Texas Instruments Embedded Centre.</p>', NULL, NULL, 1, '2026-09-14'),
(5, 'about', 'About Department', 'general', '<h2>Electrical Engineering</h2><p>60 intake · Power Systems, Smart Grids &amp; EV Drives Laboratories.</p>', NULL, NULL, 1, '2026-09-18'),
(6, 'about', 'About Department', 'general', '<h2>Electronics &amp; Computer Engineering</h2><p>60 intake · Embedded Systems, RTOS, Cloud IoT &amp; Software Engineering.</p>', NULL, NULL, 1, '2026-09-20');

INSERT INTO faculty (department_id, name, designation, qualification, specialization, email, phone, experience_years, photo_url, external_profile_url, external_profile_label, custom_fields_json, is_hod) VALUES
(1, 'Dr. Anjali K. Deshpande', 'Professor & Head of Department', 'Ph.D. (CSE), M.Tech', 'Distributed Systems & NLP', 'hod.cse@svcoer.edu.in', '+91-9822011234', 21, 'assets/images/principal.jpg', 'https://scholar.google.com/', 'Google Scholar Profile', '{"ORCID ID":"0000-0002-1825-0097","Scopus Publications":"42 Indexed Papers","Patents Granted":"3 Indian Patents"}', 1),
(1, 'Dr. Siddharth R. Mane', 'Associate Professor', 'Ph.D., M.E. (CSE)', 'Computer Vision & Edge AI', 'srmane@svcoer.edu.in', '+91-9765412390', 15, 'assets/images/principal.jpg', 'https://scholar.google.com/', 'Google Scholar & GitHub', '{"NPTEL Certification":"Elite Gold — Deep Learning","Funded Grants":"AICTE RPS INR 14.5 Lakhs"}', 0),
(2, 'Dr. Rajendra B. Kulkarni', 'Professor & Head of Department', 'Ph.D. (Design Engg.)', 'Robotics & Tribology', 'hod.mech@svcoer.edu.in', NULL, 24, 'assets/images/principal.jpg', NULL, NULL, NULL, 1),
(3, 'Dr. Suhas V. Patwardhan', 'Professor & Head of Department', 'Ph.D. (Structural Engg.)', 'Earthquake Resistant Design', 'hod.civil@svcoer.edu.in', NULL, 20, 'assets/images/principal.jpg', NULL, NULL, NULL, 1),
(4, 'Dr. Vandana P. Chavan', 'Professor & Head of Department', 'Ph.D. (VLSI)', 'Low-Power ASIC Design', 'hod.entc@svcoer.edu.in', NULL, 22, 'assets/images/principal.jpg', NULL, NULL, NULL, 1),
(5, 'Dr. M. R. Joshi', 'Professor & Head of Department', 'Ph.D. (Electrical Engg.)', 'Smart Grids & Power Electronics', 'hod.elec@svcoer.edu.in', NULL, 18, 'assets/images/principal.jpg', NULL, NULL, NULL, 1),
(6, 'Prof. P. S. Sawant', 'Associate Professor & Head of Department', 'M.Tech (Embedded & CSE)', 'IoT Edge Computing & Embedded Linux', 'hod.ecs@svcoer.edu.in', NULL, 14, 'assets/images/principal.jpg', NULL, NULL, NULL, 1);

INSERT INTO department_labs (department_id, name, area_sqft, equipment_summary, incharge, photo_url) VALUES
(1, 'High-Performance AI & Deep Learning Lab', 1450, 'NVIDIA GPU Workstations, 60 Core i7 Nodes', 'Dr. Siddharth R. Mane', 'assets/images/hero_lab.jpg'),
(2, 'Tata CIII Industrial Robotics & CNC Lab', 2400, 'KUKA 6-Axis Cobot, 5-Axis CNC Centre', 'Dr. Rajendra B. Kulkarni', 'assets/images/hero_lab.jpg'),
(3, 'Heavy Structures & Concrete Testing Lab', 2100, '1000 kN UTM, Rebound Hammer, UPV Tester', 'Dr. Suhas V. Patwardhan', NULL),
(4, 'VLSI Design & FPGA Prototyping Lab', 1350, 'Xilinx Vivado Boards, Cadence Virtuoso Suite', 'Dr. Vandana P. Chavan', NULL),
(5, 'Power Systems & EV Drives Lab', 1650, 'MATLAB Simulink RT, Three-Phase Synchronous Machines', 'Dr. M. R. Joshi', NULL),
(6, 'Embedded Computing & Cloud IoT Lab', 1300, 'ARM Cortex Kits, Raspberry Pi Edge Clusters', 'Prof. P. S. Sawant', NULL);

INSERT INTO leadership_profiles (role_title, name, qualification, email, phone, photo_url, bio, committee_group, sort_order) VALUES
('Principal & Director', 'Dr. B. P. Ronge', 'Ph.D. (Mech), M.Tech (IIT)', 'principal@coe.sveri.ac.in', '+91-02186-216063', 'assets/images/principal.jpg', 'Leading SVERI''s College of Engineering, Pandharpur in NAAC A+ quality governance and autonomy.', 'Statutory Officer', 1),
('Registrar & PIO (RTI)', 'Shri S. G. Kulkarni', 'M.Com, LL.B., MBA', 'coe@coe.sveri.ac.in', '+91-02186-216062', 'assets/images/principal.jpg', 'Custodian of institutional records and statutory compliance.', 'Statutory Officer', 2),
('Controller of Examinations', 'Dr. M. S. Kumbhar', 'Ph.D. (E&TC)', 'coe@coe.sveri.ac.in', '+91-02186-216061', 'assets/images/principal.jpg', 'Heads autonomous examination and ABC credit governance.', 'Statutory Officer', 3);

INSERT INTO sliders (title, caption, image_url, cta_label, cta_link, sort_order) VALUES
('Empowering Engineering Excellence Under NEP 2020', 'Autonomous Institution (AY 2024-25) · NAAC A+ (CGPA 3.46) · DTE Code 06220 · Complete UGC Public Self-Disclosure.', 'assets/images/hero_campus.jpg', 'View FRA Fee Structure', 'page.php?slug=prospectus-fee-structure', 1),
('Industry 4.0 Robotics, AI & Semiconductor Innovation', 'Funded DST-SERB & AICTE-MODROBS laboratories driving real-world undergraduate research.', 'assets/images/hero_lab.jpg', 'Visit CSE Microsite', 'department.php?dept=computer-science', 2);

INSERT INTO ticker_items (text, link_url, badge_text, sort_order) VALUES
('FRA-Fee Structure 2026-27 Approved & Published', 'page.php?slug=prospectus-fee-structure', 'FRA Fee', 1),
('First Year B.Tech & Direct Second Year CAP Admissions 2026-27 Open (DTE Code: 06220)', 'page.php?slug=prospectus-fee-structure', 'Admissions', 2),
('UGC Guidelines on Public Self-Disclosure (NEP 2020) Portal Active', 'quick-links.php', 'UGC Mandatory', 3);

INSERT INTO documents (title, category, source_type, file_url, file_name, file_size_bytes, mime_type, uploaded_at, uploaded_by) VALUES
('UGC Guidelines on Public Self-Disclosure (NEP 2020)', 'UGC & AICTE Approvals', 'upload', 'uploads/UGC-Public-Self-Disclosure-Guidelines.pdf', 'UGC-Public-Self-Disclosure-Guidelines.pdf', 512400, 'application/pdf', '2026-10-01', 'IQAC Officer'),
('FRA Approved Fee Structure 2026-27', 'Fee Structure', 'upload', 'uploads/FRA-Fee-Structure-2026-27.pdf', 'FRA-Fee-Structure-2026-27.pdf', 342100, 'application/pdf', '2026-09-24', 'IQAC Officer'),
('Academic Calendar 2026-27', 'Academic Calendar', 'upload', 'uploads/SVCOER-Academic-Calendar-2026-27.pdf', 'SVCOER-Academic-Calendar-2026-27.pdf', 284000, 'application/pdf', '2026-07-02', 'IQAC Officer'),
('Autonomous NEP 2020 Examination & Academic Rules (Google Drive)', 'Circulars & Forms', 'external', 'https://drive.google.com/file/d/1svcoer-autonomous-rules/view', 'Google Drive Link', 0, 'text/html', '2026-10-18', 'Dr. M. S. Kumbhar (CoE)');

INSERT INTO campus_events (title, event_date, category, summary, content_html, is_featured) VALUES
('FRA Approved Fee Structure 2026-27 Published', '2026-10-12', 'Notice', 'Fees Regulating Authority approved B.Tech and M.Tech tuition & development fees.', '<p>Fees Regulating Authority approved fee structure published for AY 2026-27.</p>', 1),
('National Conference on Sustainable Engineering (NCSE-2026)', '2026-11-18', 'Event', 'Two-day AICTE-sponsored conference hosted by Mechanical & Civil departments.', '<p>Call for papers open for UG, PG, and Ph.D. scholars.</p>', 1),
('SVERI CSE Team Wins Smart India Hackathon Hardware Edition', '2026-09-20', 'Achievement', 'First prize in Smart Agriculture IoT Edge Analytics track.', '<p>Team ByteKnights secured national first rank with INR 1,00,000 prize.</p>', 1),
('End Semester Examination Form Submission Schedule (Winter 2026)', '2026-10-25', 'Circular', 'Online exam form submission via Autonomous ERP portal.', '<p>Students must verify ABC ID before submitting forms.</p>', 1);

INSERT INTO gallery_albums (id, title, category, event_date, cover_url) VALUES
(1, 'Campus Infrastructure & Central Library', 'Campus', '2026-08-15', 'assets/images/hero_campus.jpg'),
(2, 'Annual Convocation Ceremony 2026', 'Convocation', '2026-06-22', 'assets/images/convocation.jpg'),
(3, 'Industry 4.0 Robotics & AI Laboratories', 'Laboratories', '2026-09-10', 'assets/images/hero_lab.jpg'),
(4, 'Central Reading Atrium & Digital Knowledge Center', 'Library', '2026-07-18', 'assets/images/hero_library.jpg');

INSERT INTO gallery_photos (album_id, image_url, caption, alt_text) VALUES
(1, 'assets/images/hero_campus.jpg', 'Aerial view of SVERI Autonomous Academic Complex', 'Aerial campus complex'),
(2, 'assets/images/convocation.jpg', 'Graduating B.Tech batch receiving autonomous degrees', 'Convocation ceremony'),
(3, 'assets/images/hero_lab.jpg', 'Students experimenting in Tata CIII Robotics & AI Lab', 'Robotics laboratory'),
(4, 'assets/images/hero_library.jpg', 'Central Library reading atrium with 68,450+ volumes', 'Central library atrium');

INSERT INTO telephone_directory (section, officer_name, designation, extension, direct_phone, email) VALUES
('Principal Office', 'Dr. B. P. Ronge', 'Principal & Director', '101', '+91-02186-216063', 'principal@coe.sveri.ac.in'),
('Registrar & RTI Cell', 'Shri S. G. Kulkarni', 'Registrar & PIO', '102', '+91-02186-216062', 'coe@coe.sveri.ac.in'),
('Anti-Ragging Helpline', 'Dr. P. K. Deshmukh', 'Chief Vigilance Officer', '199', '+91-9545553888', 'antiragging@svcoer.edu.in');

INSERT INTO custom_home_components (title, placement, html_content, sort_order, is_active) VALUES
('Autonomous Admissions & NEP 2020 Accreditation Ribbon', 'after-hero', '<div class="cms-prose"><div class="cms-block cms-banner-navy"><p class="cms-kicker">Autonomous · NAAC A+ (3.46) · DTE Code 06220</p><h2>Admissions Open 2026–27 &amp; Autonomous Examination Cell</h2><p>Direct Second Year &amp; First Year B.Tech Admissions, ABC/DigiLocker NAD Credit Transfers, and FRA-Approved Fee Disclosures available publicly without login.</p><div class="cms-btn-row"><a href="page.php?slug=prospectus-fee-structure" class="cms-btn cms-btn-amber">Fee Structure &amp; Admissions</a><a href="page.php?cat=examination" class="cms-btn cms-btn-light">Examination Portal</a></div></div></div>', 1, 1);

INSERT INTO alumni_profiles (id, full_name, email, phone, graduation_year, department_code, department_name, degree, current_company, designation, location, chapter, linkedin_url, photo_url, bio, open_to_mentorship, is_featured, status, sort_order, registered_at) VALUES
(1, 'Rohan Deshmukh', 'rohan.deshmukh@alumni.svcoer.edu.in', '+91-98220-11201', 2016, 'CSE', 'Computer Science & Engineering', 'B.E. (CSE)', 'Microsoft India', 'Principal Cloud Architect', 'Hyderabad, India', 'Hyderabad Chapter', 'https://linkedin.com', 'assets/images/principal.jpg', 'Mentoring final-year CSE students in distributed systems, Azure architecture, and product engineering interviews.', 1, 1, 'approved', 1, '2026-01-12'),
(2, 'Snehal Patwardhan', 'snehal.patwardhan@alumni.svcoer.edu.in', '+91-98901-44310', 2018, 'ENTC', 'Electronics & Telecommunication Engineering', 'B.E. (E&TC)', 'Qualcomm', 'Staff SoC Verification Engineer', 'Bengaluru, India', 'Bengaluru Chapter', 'https://linkedin.com', 'assets/images/faculty_default.jpg', 'Conducting annual VLSI & RTL verification bootcamps for E&TC undergraduates at Pandharpur.', 1, 1, 'approved', 2, '2026-02-04'),
(3, 'Aditya Kulkarni', 'aditya.k@alumni.svcoer.edu.in', NULL, 2015, 'MECH', 'Mechanical Engineering', 'B.E. (Mechanical)', 'Bharat Forge Ltd.', 'Deputy General Manager - EV Powertrain', 'Pune, India', 'Pune Chapter', 'https://linkedin.com', 'assets/images/principal.jpg', 'Facilitating sponsored industrial projects and plant visits for SVERI Mechanical and Mechatronics cohorts.', 1, 1, 'approved', 3, '2026-03-19'),
(4, 'Priya Joshi', 'priya.joshi@alumni.svcoer.edu.in', NULL, 2020, 'CIVIL', 'Civil Engineering', 'B.E. (Civil)', 'Larsen & Toubro', 'Senior Structural Design Engineer', 'Mumbai, India', 'Mumbai Chapter', 'https://linkedin.com', 'assets/images/faculty_default.jpg', 'Infrastructure & metro rail structural design specialist supporting GATE aspirants.', 0, 0, 'approved', 4, '2026-05-08'),
(5, 'Omkar Shinde', 'omkar.shinde@alumni.svcoer.edu.in', NULL, 2022, 'ELEC', 'Electrical Engineering', 'B.Tech (Electrical)', 'Tata Power', 'Lead Smart Grid Automation Engineer', 'Pune, India', 'Pune Chapter', 'https://linkedin.com', 'assets/images/hero_campus.jpg', 'Working on SCADA renewable integration and helping pre-final students with core electrical internships.', 1, 0, 'approved', 5, '2026-07-14'),
(6, 'Tanvi Mane', 'tanvi.mane@alumni.svcoer.edu.in', NULL, 2023, 'CSE', 'Computer Science & Engineering', 'B.Tech (CSE)', 'Infosys Finacle', 'Systems Specialist - AI & Data', 'Pandharpur, India', 'Pandharpur Home Chapter', NULL, 'assets/images/convocation.jpg', 'Recent graduate eager to mentor coding club members on full-stack TypeScript and placements.', 1, 0, 'pending', 6, '2026-11-01');

INSERT INTO alumni_jobs (id, title, company, location, job_type, department_focus, experience_range, compensation, description, apply_url_or_email, posted_by_alumni_name, posted_by_batch, deadline_date, status, posted_at, sort_order) VALUES
(1, 'Graduate Software Engineer (React & Cloud)', 'Infosys Digital', 'Pune / Hybrid', 'Full-Time', 'CSE', '0-2 Years', 'Rs. 6.5 - 9.0 LPA', 'Alumni referral drive for 2025/2026 batch CSE & E&TC graduates with strong TypeScript, Node.js, and SQL fundamentals.', 'https://careers.infosys.com', 'Rohan Deshmukh', '2016 CSE', '2026-12-20', 'open', '2026-11-02', 1),
(2, 'EV Battery Pack Thermal Design Intern', 'Bharat Forge EV', 'Chakan, Pune', 'Internship', 'MECH', 'Final Year Students', 'Rs. 22,000 / month', '6-month industrial internship with PPO conversion opportunity in CAD/FEA thermal simulation.', 'mailto:alumni.jobs@coe.sveri.ac.in', 'Aditya Kulkarni', '2015 MECH', '2026-12-15', 'open', '2026-10-28', 2),
(3, 'VLSI RTL Verification Referral', 'Qualcomm India', 'Bengaluru', 'Referral', 'ENTC', '1-3 Years', 'Rs. 14 - 20 LPA', 'SystemVerilog / UVM verification openings for SVERI alumni and M.Tech microelectronics graduates.', 'https://www.qualcomm.com/company/careers', 'Snehal Patwardhan', '2018 ENTC', '2026-12-30', 'open', '2026-10-20', 3),
(4, 'Substation SCADA Commissioning Engineer', 'Tata Power', 'Maharashtra / Pan-India', 'Full-Time', 'ELEC', '0-2 Years', 'Rs. 6.0 LPA', 'Field & automation role covering smart grid protection relays and PLC telemetry.', 'mailto:hr.grid@coe.sveri.ac.in', 'Omkar Shinde', '2022 ELEC', '2026-12-10', 'open', '2026-11-05', 4);

INSERT INTO alumni_events (id, title, chapter, event_date, venue, organizer, description, banner_url, registration_url, rsvp_count, is_active, sort_order) VALUES
(1, 'Annual Grand Alumni Homecoming & Silver Jubilee Meet', 'Pandharpur Home Chapter', '2026-12-26', 'SVERI Central Auditorium, Gopalpur, Pandharpur', 'SVERI Alumni Association & Principal Office', 'Reunite on campus with batchmates, tour the new Autonomous Research Centres, felicitate Distinguished Alumni Awardees, and mentor current B.Tech students.', 'assets/images/convocation.jpg', '', 142, 1, 1),
(2, 'Pune Chapter Industry Connect & Tech Networking Mixer', 'Pune Chapter', '2026-11-29', 'MCCIA Trade Tower, Senapati Bapat Road, Pune', 'Pune Chapter Committee (Batch 2010-2024)', 'Evening networking mixer for Pune-based SVERI engineers across IT, Automotive EV, and Infrastructure sectors with live placement referral desks.', 'assets/images/hero_campus.jpg', '', 86, 1, 2),
(3, 'Bengaluru VLSI & Cloud Architecture Mentorship Roundtable', 'Bengaluru Chapter', '2026-12-12', 'Koramangala Tech Hub / Hybrid Live Stream', 'Bengaluru Chapter Leads', 'Structured 1-on-1 career mentorship session pairing senior Bengaluru alumni with pre-final year students.', 'assets/images/hero_library.jpg', '', 54, 1, 3);

INSERT INTO alumni_achievers (id, full_name, batch_year, department_code, designation, organization, award_title, citation, photo_url, linkedin_url, sort_order) VALUES
(1, 'Rohan Deshmukh', 2016, 'CSE', 'Principal Cloud Architect', 'Microsoft India', 'Distinguished Young Engineer Alumni Award 2026', 'Recognized for scaling enterprise cloud systems and sponsoring 15+ rural engineering internships annually.', 'assets/images/principal.jpg', 'https://linkedin.com', 1),
(2, 'Snehal Patwardhan', 2018, 'ENTC', 'Staff SoC Verification Engineer', 'Qualcomm India', 'VLSI Innovation & Women in STEM Excellence Award', 'Honored for multi-million-gate System-on-Chip verification leadership and annual student bootcamps.', 'assets/images/hero_library.jpg', 'https://linkedin.com', 2);

INSERT INTO alumni_pledges (id, full_name, email, phone, batch_year, department_code, pledge_type, amount_or_support, message, status, submitted_at) VALUES
(1, 'Aditya Kulkarni', 'aditya.k@alumni.svcoer.edu.in', '+91-98220-77112', 2015, 'MECH', 'Laboratory / Equipment Sponsorship', 'EV Battery Thermal Bench & 2-Day CAD Industry Workshop', 'Committed to equipping our Mechanical Department EV Centre of Excellence for final-year B.Tech capstone teams.', 'acknowledged', '2026-10-18');

INSERT INTO cms_kv_store (key_name, val_json) VALUES
('alumni_settings', '{"heroTitle":"SVERI''s COE Alumni Association & Global Network","heroSubtitle":"Connecting 11,500+ engineering graduates, mentors, industry leaders, and chapter communities across Pune, Bengaluru, Mumbai, USA, Europe & Pandharpur.","associationRegNo":"MH/SOL/ALU-2016/06220","coordinatorName":"Prof. D. B. Kulkarni","coordinatorEmail":"alumni@coe.sveri.ac.in","allowSelfRegistration":true,"allowPublicJobPosting":true,"enableDiscussions":true,"requireDiscussionApproval":false}'),
('alumni_seeded_v1', '1'),
('alumni_extras_seeded_v1', '1')
ON DUPLICATE KEY UPDATE val_json = VALUES(val_json);

-- 17. Conferences, Workshops, FDPs & Events + Placements + Grievances
CREATE TABLE IF NOT EXISTS conferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(140) NOT NULL UNIQUE,
  title VARCHAR(260) NOT NULL,
  short_name VARCHAR(80) NOT NULL,
  scope VARCHAR(120) NOT NULL DEFAULT 'International Conference',
  theme VARCHAR(300) NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  venue VARCHAR(240) NOT NULL DEFAULT '',
  mode VARCHAR(120) NOT NULL DEFAULT 'Hybrid (On-Campus + Online)',
  organizing_department VARCHAR(160) NOT NULL DEFAULT '',
  indexing_partners_json TEXT NULL,
  contact_email VARCHAR(160) NOT NULL DEFAULT '',
  contact_phone VARCHAR(80) NOT NULL DEFAULT '',
  banner_url VARCHAR(300) DEFAULT 'assets/images/hero_campus.jpg',
  hero_slides_json LONGTEXT NULL,
  overview_html MEDIUMTEXT NULL,
  cfp_html MEDIUMTEXT NULL,
  tracks_json MEDIUMTEXT NULL,
  important_dates_json MEDIUMTEXT NULL,
  people_json MEDIUMTEXT NULL,
  schedule_json MEDIUMTEXT NULL,
  fee_tiers_json MEDIUMTEXT NULL,
  submission_mode ENUM('internal','external','closed') DEFAULT 'internal',
  external_submission_url VARCHAR(500) NULL,
  external_submission_label VARCHAR(160) NULL,
  submission_instructions_html MEDIUMTEXT NULL,
  enable_poster_presentation TINYINT(1) DEFAULT 1,
  poster_dimensions VARCHAR(160) NULL,
  poster_guidelines_html MEDIUMTEXT NULL,
  poster_template_url VARCHAR(400) NULL,
  poster_prizes_text VARCHAR(240) NULL,
  poster_items_json MEDIUMTEXT NULL,
  custom_sections_json MEDIUMTEXT NULL,
  is_published TINYINT(1) DEFAULT 1,
  is_featured TINYINT(1) DEFAULT 0,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS conference_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conference_id INT NOT NULL,
  tracking_code VARCHAR(40) NOT NULL,
  paper_title VARCHAR(280) NOT NULL,
  track_title VARCHAR(180) NOT NULL,
  presentation_type VARCHAR(100) NOT NULL DEFAULT 'Oral Paper Presentation',
  author_name VARCHAR(160) NOT NULL,
  author_email VARCHAR(160) NOT NULL,
  author_phone VARCHAR(60) NULL,
  affiliation VARCHAR(220) NOT NULL,
  co_authors VARCHAR(300) NULL,
  abstract_text TEXT NOT NULL,
  manuscript_url VARCHAR(300) NULL,
  status ENUM('Submitted','Under Review','Revision Requested','Accepted','Rejected') DEFAULT 'Submitted',
  reviewer_notes TEXT NULL,
  submitted_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS conference_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conference_id INT NOT NULL,
  registration_code VARCHAR(40) NOT NULL,
  attendee_name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(60) NULL,
  affiliation VARCHAR(220) NOT NULL,
  fee_category VARCHAR(140) NOT NULL,
  paper_id_ref VARCHAR(60) NULL,
  payment_ref VARCHAR(120) NULL,
  status ENUM('Pending','Confirmed','Cancelled') DEFAULT 'Pending',
  registered_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS placement_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  academic_year VARCHAR(30) NOT NULL,
  branch VARCHAR(120) NOT NULL,
  eligible_students INT DEFAULT 0,
  placed_students INT DEFAULT 0,
  highest_package_lpa DECIMAL(6,2) DEFAULT 0.00,
  average_package_lpa DECIMAL(6,2) DEFAULT 0.00,
  top_recruiters_list VARCHAR(400) NULL,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS placement_stories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_type VARCHAR(80) NOT NULL DEFAULT 'Campus Placement',
  headline VARCHAR(240) NULL,
  student_name VARCHAR(160) NOT NULL,
  batch_year VARCHAR(30) NOT NULL,
  branch VARCHAR(120) NOT NULL,
  company VARCHAR(160) NOT NULL,
  role_title VARCHAR(160) NOT NULL,
  package_lpa VARCHAR(40) NOT NULL,
  photo_url VARCHAR(255) DEFAULT 'assets/images/principal.jpg',
  quote_text TEXT NULL,
  is_featured TINYINT(1) DEFAULT 0,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS placement_notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(260) NOT NULL,
  notice_date VARCHAR(30) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Campus Drive Circular',
  summary TEXT NULL,
  attachment_url VARCHAR(500) NULL,
  link_label VARCHAR(120) NULL,
  is_pinned TINYINT(1) DEFAULT 0,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS placement_custom_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(240) NOT NULL,
  subtitle VARCHAR(320) NULL,
  section_type ENUM('table','cards','brochure','html') DEFAULT 'table',
  html_content MEDIUMTEXT NULL,
  payload_json MEDIUMTEXT NULL,
  cta_label VARCHAR(140) NULL,
  cta_url VARCHAR(500) NULL,
  is_published TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS grievances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_code VARCHAR(40) NOT NULL UNIQUE,
  complainant_name VARCHAR(160) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(60) NULL,
  reporter_role VARCHAR(100) NOT NULL,
  category VARCHAR(140) NOT NULL,
  subject VARCHAR(240) NOT NULL,
  description TEXT NOT NULL,
  urgency ENUM('Normal','High','Urgent') DEFAULT 'Normal',
  is_anonymous TINYINT(1) DEFAULT 0,
  attachment_url VARCHAR(300) NULL,
  status ENUM('Open','Under Review','Escalated','Resolved') DEFAULT 'Open',
  resolution_note TEXT NULL,
  submitted_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS visitor_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp_iso VARCHAR(40) NOT NULL,
  ip VARCHAR(64) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  country_code VARCHAR(12) NOT NULL DEFAULT 'IN',
  state VARCHAR(120) NOT NULL DEFAULT 'Maharashtra',
  area VARCHAR(140) NOT NULL DEFAULT 'Pandharpur',
  method VARCHAR(12) NOT NULL DEFAULT 'GET',
  path VARCHAR(260) NOT NULL DEFAULT '/',
  query_string VARCHAR(500) NULL,
  status_code INT NOT NULL DEFAULT 200,
  latency_ms INT NOT NULL DEFAULT 8,
  referrer VARCHAR(320) NULL,
  user_agent VARCHAR(320) NULL,
  device_type VARCHAR(32) NOT NULL DEFAULT 'Desktop',
  browser VARCHAR(64) NOT NULL DEFAULT 'Chrome',
  os VARCHAR(64) NOT NULL DEFAULT 'Windows',
  event_type VARCHAR(40) NOT NULL DEFAULT 'page_view',
  severity VARCHAR(16) NOT NULL DEFAULT 'info',
  threat_category VARCHAR(160) NULL,
  actor_email VARCHAR(160) NULL,
  note VARCHAR(320) NULL,
  INDEX idx_vl_country_state (country, state),
  INDEX idx_vl_severity (severity),
  INDEX idx_vl_event (event_type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS security_blocked_ips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(64) NOT NULL,
  reason VARCHAR(260) NOT NULL,
  blocked_by VARCHAR(160) NOT NULL,
  blocked_at VARCHAR(40) NOT NULL,
  expires_at VARCHAR(40) NULL,
  INDEX idx_blk_ip (ip)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS php_sessions (
  sess_id VARCHAR(128) PRIMARY KEY,
  sess_data MEDIUMTEXT NOT NULL,
  updated_at INT UNSIGNED NOT NULL,
  INDEX idx_sess_upd (updated_at)
) ENGINE=InnoDB;

-- 18. Sports Portal & Campus Facilities Tables
CREATE TABLE IF NOT EXISTS sports_facilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  facility_type VARCHAR(100) NOT NULL DEFAULT 'Outdoor Ground / Track',
  dimensions_or_capacity VARCHAR(160) NULL,
  timings VARCHAR(160) NULL,
  incharge_name VARCHAR(150) NULL,
  description TEXT NULL,
  image_url VARCHAR(300) DEFAULT 'assets/images/sports_complex.jpg',
  custom_fields_json MEDIUMTEXT NULL,
  is_published TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sports_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(240) NOT NULL,
  event_type VARCHAR(100) NOT NULL DEFAULT 'Annual Sports Meet',
  discipline VARCHAR(120) NOT NULL DEFAULT 'Multi-Sport',
  event_date VARCHAR(60) NOT NULL,
  venue VARCHAR(220) NOT NULL,
  organizer VARCHAR(180) NULL,
  status ENUM('Upcoming','Registrations Open','Completed') DEFAULT 'Upcoming',
  registration_url VARCHAR(500) NULL,
  description TEXT NULL,
  banner_url VARCHAR(300) DEFAULT 'assets/images/sports_complex.jpg',
  is_published TINYINT(1) DEFAULT 1,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  moderation_status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sports_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_or_team_name VARCHAR(200) NOT NULL,
  department_code VARCHAR(32) NOT NULL,
  batch_year VARCHAR(30) NULL,
  sport_name VARCHAR(120) NOT NULL,
  level ENUM('University','State','National','International','Zonal / Intercollegiate') DEFAULT 'State',
  medal_or_rank VARCHAR(120) NOT NULL,
  event_name VARCHAR(240) NOT NULL,
  event_date VARCHAR(40) NOT NULL,
  photo_url VARCHAR(300) DEFAULT 'assets/images/sports_complex.jpg',
  highlights TEXT NULL,
  is_featured TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sports_gallery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  media_type ENUM('Photo','Video') DEFAULT 'Photo',
  category VARCHAR(120) DEFAULT 'Annual Sports Meet',
  media_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(300) NULL,
  event_date VARCHAR(40) NULL,
  caption TEXT NULL,
  is_published TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sports_notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(260) NOT NULL,
  notice_date VARCHAR(40) NOT NULL,
  category VARCHAR(100) DEFAULT 'Trials & Selection',
  summary TEXT NULL,
  attachment_url VARCHAR(500) NULL,
  registration_link VARCHAR(500) NULL,
  is_pinned TINYINT(1) DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS facilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(220) NOT NULL,
  category VARCHAR(140) NOT NULL DEFAULT 'Infrastructural Facilities',
  short_summary VARCHAR(320) NULL,
  description_html MEDIUMTEXT NULL,
  location_block VARCHAR(180) NULL,
  capacity VARCHAR(140) NULL,
  timings VARCHAR(160) NULL,
  incharge_name VARCHAR(150) NULL,
  incharge_email VARCHAR(160) NULL,
  incharge_phone VARCHAR(60) NULL,
  image_url VARCHAR(300) DEFAULT 'assets/images/campus_facilities.jpg',
  brochure_url VARCHAR(500) NULL,
  custom_fields_json MEDIUMTEXT NULL,
  is_featured TINYINT(1) DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

-- 19. Social Media Links & Sharing Governance
CREATE TABLE IF NOT EXISTS social_media_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(40) NOT NULL DEFAULT 'custom',
  label VARCHAR(80) NOT NULL,
  url VARCHAR(500) NOT NULL,
  handle VARCHAR(120) DEFAULT '',
  custom_svg TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

INSERT IGNORE INTO social_media_links (id, platform, label, url, handle, is_active, sort_order) VALUES
(1, 'facebook', 'Facebook', 'https://facebook.com', '@svcoer', 1, 1),
(2, 'linkedin', 'LinkedIn', 'https://linkedin.com', 'svcoer-pandharpur', 1, 2),
(3, 'instagram', 'Instagram', 'https://instagram.com', '@svcoer_official', 1, 3),
(4, 'youtube', 'YouTube', 'https://youtube.com', '@svcoer_edu', 1, 4),
(5, 'twitter', 'X (Twitter)', 'https://x.com', '@svcoer_edu', 1, 5);

-- 20. Research Projects, Publications, Patents, MoUs & Consultancy
CREATE TABLE IF NOT EXISTS research_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(280) NOT NULL,
  funding_agency VARCHAR(180) NOT NULL,
  principal_investigator VARCHAR(160) NOT NULL,
  co_investigator VARCHAR(200) DEFAULT '',
  department_code VARCHAR(32) NOT NULL DEFAULT 'ALL',
  grant_amount_lakhs VARCHAR(80) DEFAULT '',
  sanction_year VARCHAR(30) DEFAULT '2025-26',
  duration VARCHAR(80) DEFAULT '24 Months',
  status ENUM('Ongoing','Completed','Sanctioned','Submitted') DEFAULT 'Ongoing',
  project_code VARCHAR(120) DEFAULT '',
  summary TEXT NULL,
  document_url VARCHAR(500) DEFAULT '',
  is_published TINYINT(1) DEFAULT 1,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  moderation_status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

INSERT IGNORE INTO research_projects (id, title, funding_agency, principal_investigator, co_investigator, department_code, grant_amount_lakhs, sanction_year, duration, status, project_code, summary, document_url, is_published, sort_order) VALUES
(1, 'AI-Assisted Solar Microgrid Fault Prediction & Edge Relay Controller for Rural Feeders', 'DST-SERB (Govt. of India)', 'Dr. M. R. Joshi', 'Dr. A. K. Kulkarni', 'ELEC', 'Rs. 28.50 Lakhs', '2025-26', '36 Months (Ongoing)', 'Ongoing', 'SERB/CRG/2025/001942', 'Edge-deployed TinyML relay controller protecting rural 11 kV solar feeders with sub-cycle harmonic isolation.', 'quick-links.php', 1, 1),
(2, 'Modernization of Autonomous GPU & Embedded Vision Research Laboratory (MODROBS)', 'AICTE-MODROBS / RPS', 'Dr. Anjali K. Deshpande', 'Dr. Siddharth R. Mane', 'CSE', 'Rs. 19.40 Lakhs', '2024-25', '24 Months (Completed)', 'Completed', 'AICTE/MODROBS/2024/CSE-118', 'Established high-throughput NVIDIA A5000 compute nodes and ROS-2 edge camera rigs for M.Tech/Ph.D. scholars.', 'quick-links.php', 1, 2),
(3, 'Autonomous Precision Cotton-Pod Harvester Mechanism for Smallholder Farmers', 'RGSTC Maharashtra', 'Dr. Rajendra B. Kulkarni', 'Prof. P. S. Sawant', 'MECH', 'Rs. 16.25 Lakhs', '2025-26', '24 Months (Ongoing)', 'Ongoing', 'RGSTC/SOL/2025/AGRI-44', 'Vision-guided pneumatic picker head tested across Solapur district agrarian clusters.', '', 1, 3),
(4, 'RISC-V Hardware Cryptography Co-Processor for Low-Power Industrial IoT Nodes', 'DRDO / ISRO Extramural', 'Dr. Vandana P. Chavan', 'Dr. R. B. Patwardhan', 'ENTC', 'Rs. 24.80 Lakhs', '2026-27', '30 Months (Sanctioned)', 'Sanctioned', 'ERIPR/DFT/2026/VLSI-09', 'Side-channel resistant AES-GCM hardware macro taped out in 45nm CMOS node.', '', 1, 4),
(5, 'High-Early-Strength Sugarcane Bagasse Ash Geopolymer Concrete for Canal Linings', 'MSME Design Clinic', 'Dr. Suhas V. Patwardhan', 'Prof. V. M. Jadhav', 'CIVIL', 'Rs. 11.60 Lakhs', '2024-25', '18 Months (Completed)', 'Completed', 'MSME/DC/2024/MAT-72', 'Reduced cement carbon footprint by 48% while meeting M40 sulfate resistance benchmarks.', '', 1, 5);

CREATE TABLE IF NOT EXISTS research_patents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_type VARCHAR(80) NOT NULL DEFAULT 'Patent Granted',
  title VARCHAR(280) NOT NULL,
  inventors_or_lead VARCHAR(240) NOT NULL,
  department_code VARCHAR(32) NOT NULL DEFAULT 'ALL',
  reference_number VARCHAR(140) DEFAULT '',
  filing_or_grant_date VARCHAR(40) DEFAULT '',
  status VARCHAR(120) DEFAULT '',
  partner_or_agency VARCHAR(180) DEFAULT '',
  summary TEXT NULL,
  external_url VARCHAR(500) DEFAULT '',
  is_published TINYINT(1) DEFAULT 1,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  moderation_status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

INSERT IGNORE INTO research_patents (id, item_type, title, inventors_or_lead, department_code, reference_number, filing_or_grant_date, status, partner_or_agency, summary, external_url, is_published, sort_order) VALUES
(1, 'Patent Granted', 'Smart Self-Calibrating Soil Moisture & NPK Drip Fertigation Controller', 'Dr. Vandana P. Chavan, Prof. P. S. Sawant, S. R. Mane', 'ENTC', 'IN-PAT-518942', '2026-03-14', 'Granted (20 Years)', 'Indian Patent Office, Mumbai', 'Autonomous closed-loop valve telemetry reducing sugarcane water consumption by 34%.', '', 1, 1),
(2, 'Patent Granted', 'Regenerative Eddy-Current Braking Actuator for Light Electric Three-Wheelers', 'Dr. Rajendra B. Kulkarni, Dr. M. R. Joshi', 'MECH', 'IN-PAT-492107', '2025-11-22', 'Granted', 'Indian Patent Office', 'Compact dual-stator auxiliary retarder recovering up to 14% kinetic energy on gradients.', '', 1, 2),
(3, 'Patent Published', 'Federated Privacy-Preserving Medical MRI Triage Appliance on Edge TPU', 'Dr. Anjali K. Deshpande, Dr. Siddharth R. Mane', 'CSE', 'APP-202621018442', '2026-06-19', 'Published · FER Under Examination', 'Journal of the Patent Office', 'Enables district hospitals to train diagnostic models without exporting patient DICOM records.', '', 1, 3),
(4, 'Incubated Start-up', 'KrishiPulse Agro-Robotics Pvt. Ltd. (SVERI-IIC Cohort 2026)', 'Rohan Patil (B.Tech Mech), Pranav Deshmukh (CSE)', 'MECH', 'CIN-U29200PN2026PTC', '2026-02-05', 'MSME Seed Funded (Rs. 15 Lakhs)', 'SVERI IIC & AICTE IDEA Lab', 'Commercializing solar-powered inter-row weeders for pomegranate and grape orchards across Solapur.', '', 1, 4),
(5, 'Industry Consultancy', 'Non-Destructive Structural Audit & Mix-Design Testing for Pandharpur PWD Division', 'Dr. Suhas V. Patwardhan & Civil Testing Cell', 'CIVIL', 'SVCOER/CON/2026/114', '2026-08-11', 'Rs. 9.80 Lakhs Consultancy Realized', 'Public Works Department, Solapur', 'NABL-calibrated Rebound Hammer, Ultrasonic Pulse Velocity, and core strength certification.', '', 1, 5),
(6, 'Journal / Conference Publication', 'Sub-Cycle Harmonic Protection for Solar-Integrated Rural Microgrids using Edge TinyML', 'Dr. M. R. Joshi, Dr. A. K. Kulkarni', 'ELEC', 'IEEE Trans. Ind. Appl. (SCI Q1)', '2026-05-18', 'Published (SCIE / Scopus Q1 · IF 4.4)', 'IEEE Industry Applications Society', 'Demonstrated 98.6% arc-fault detection accuracy under 4ms latency on ARM Cortex-M7 relay hardware.', 'https://ieeexplore.ieee.org/', 1, 6),
(7, 'Industry / Academic MoU', 'Center of Excellence in Industrial Robotics, Digital Twin & Smart Manufacturing', 'Dr. Rajendra B. Kulkarni & Tata Technologies CIII Team', 'MECH', 'MOU/SVCOER/TTL/2025-08', '2025-09-10', 'Active Collaboration (5 Years)', 'Tata Technologies & Dassault Systemes', 'Joint certified training tracks, live industrial capstone projects, and sponsored EV & cobot workstations.', '', 1, 7);

-- 21. Stakeholder Feedback Sections, Tickets & Email Push Audit Logs
CREATE TABLE IF NOT EXISTS feedback_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  section_name VARCHAR(160) NOT NULL,
  subsections_json TEXT NULL,
  recipient_emails VARCHAR(400) NOT NULL,
  cc_emails VARCHAR(400) DEFAULT '',
  incharge_name VARCHAR(160) DEFAULT '',
  incharge_designation VARCHAR(160) DEFAULT '',
  sla_days INT DEFAULT 5,
  auto_email_enabled TINYINT(1) DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

INSERT IGNORE INTO feedback_sections (id, slug, section_name, subsections_json, recipient_emails, cc_emails, incharge_name, incharge_designation, sla_days, auto_email_enabled, is_active, sort_order) VALUES
(1, 'academics', 'Academics & Classroom Teaching', '["Curriculum & OBE Syllabus","Faculty Teaching & Mentoring","Laboratory Equipment & Practicals","Academic Timetable & Workload"]', 'dean.academics@coe.sveri.ac.in, principal@coe.sveri.ac.in', 'iqac@coe.sveri.ac.in', 'Dr. S. B. Kulkarni (Dean Academics)', 'Dean Academics & IQAC', 5, 1, 1, 1),
(2, 'examination', 'Examination & Evaluation Cell', '["Exam Form & Hall Ticket","Result & Grade Card Verification","Photocopy / Revaluation","Transcripts & Migration"]', 'coe@coe.sveri.ac.in', 'principal@coe.sveri.ac.in', 'Dr. M. S. Kumbhar (Controller of Examinations)', 'Autonomous Examination Cell', 4, 1, 1, 2),
(3, 'infrastructure', 'Infrastructure & Campus Maintenance', '["Classroom & Auditorium Facilities","Power Supply, AC & Lighting","Cleanliness & Restrooms","Campus Security & Parking"]', 'estate@coe.sveri.ac.in', 'registrar@coe.sveri.ac.in', 'Prof. S. D. Jadhav (Estate Officer)', 'Campus Estate & Works', 3, 1, 1, 3),
(4, 'hostel-mess', 'Hostel, Mess & Health Centre', '["Boys / Girls Hostel Allotment & Rooms","Dining Mess Hygiene & Menu","Drinking Water & Solar Hot Water","Medical & Ambulance Support"]', 'hostel@coe.sveri.ac.in', 'antiragging@coe.sveri.ac.in', 'Dr. P. K. Deshmukh (Chief Rector)', 'Hostel & Residential Care', 2, 1, 1, 4),
(5, 'library-it', 'Library, Wi-Fi & IT Services', '["Central Library & E-Journals","Campus Wi-Fi & Network Speed","ERP / LMS Account Access","Central Computing Lab"]', 'library@coe.sveri.ac.in, itadmin@coe.sveri.ac.in', '', 'Mrs. S. P. Joshi & Mr. R. K. Pawar', 'Library & IT Systems', 3, 1, 1, 5),
(6, 'transport-canteen', 'Transport & Campus Canteen', '["Bus Routes & Timings","Bus Pass & Safety","Canteen Food Quality & Pricing","On-Campus Stationery & Store"]', 'transport@coe.sveri.ac.in, estate@coe.sveri.ac.in', '', 'Mr. V. S. More (Transport Officer)', 'Campus Transport & Hospitality', 3, 1, 1, 6),
(7, 'accounts-scholarship', 'Accounts, Fees & Scholarships', '["Tuition Fee Receipt & Ledger","MahaDBT / EBC / Minority Scholarship","Caution Money Refund","Education Loan Bonafide Letter"]', 'accounts@coe.sveri.ac.in, registrar@coe.sveri.ac.in', '', 'Mr. A. P. Deshmukh (Accounts Officer)', 'Finance & Scholarship Cell', 5, 1, 1, 7),
(8, 'placement-alumni', 'Training, Placement & Alumni Relations', '["Campus Recruitment Drives","Aptitude & Soft Skills Training","Industry Internship NOC","Alumni Networking & Mentorship"]', 'tnp@coe.sveri.ac.in, alumni@coe.sveri.ac.in', '', 'Dr. S. B. Kulkarni (Dean T&P)', 'Training & Placement Cell', 4, 1, 1, 8);

CREATE TABLE IF NOT EXISTS feedback_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tracking_code VARCHAR(40) NOT NULL UNIQUE,
  section_id INT NOT NULL DEFAULT 1,
  section_name VARCHAR(160) NOT NULL,
  subsection VARCHAR(180) DEFAULT 'General',
  submission_type ENUM('Complaint','Suggestion','Appreciation','Service Request') DEFAULT 'Suggestion',
  stakeholder_role VARCHAR(100) NOT NULL DEFAULT 'Student',
  sender_name VARCHAR(160) NOT NULL,
  sender_email VARCHAR(160) NOT NULL,
  sender_phone VARCHAR(60) DEFAULT '',
  department_or_batch VARCHAR(120) DEFAULT '',
  rating TINYINT UNSIGNED DEFAULT 5,
  subject VARCHAR(240) NOT NULL,
  message TEXT NOT NULL,
  is_anonymous TINYINT(1) DEFAULT 0,
  attachment_url VARCHAR(300) DEFAULT '',
  routed_to_emails VARCHAR(400) DEFAULT '',
  email_dispatch_status ENUM('sent','queued','disabled','failed') DEFAULT 'queued',
  email_dispatch_detail VARCHAR(400) DEFAULT '',
  status ENUM('New','Acknowledged','In Progress','Resolved','Closed') DEFAULT 'New',
  action_taken_note TEXT NULL,
  submitted_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_dispatch_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(80) NOT NULL,
  recipients VARCHAR(500) NOT NULL,
  subject VARCHAR(260) NOT NULL,
  transport_mode VARCHAR(32) DEFAULT 'php_mail',
  status ENUM('sent','queued','failed') DEFAULT 'queued',
  detail VARCHAR(480) DEFAULT '',
  sent_at VARCHAR(32) NOT NULL
) ENGINE=InnoDB;

INSERT INTO cms_kv_store (key_name, val_json) VALUES
('social_sharing_config', '{"enabled":true,"showIconsInHeader":true,"showIconsInFooter":true,"showOnPages":true,"showOnResearch":true,"showOnConferences":true,"showOnPortals":true,"shareHeading":"Share this update","defaultHashtags":"SVCOER,SVERI,Engineering,NEP2020,Pandharpur","twitterHandle":"svcoer_edu","platforms":{"whatsapp":true,"linkedin":true,"twitter":true,"facebook":true,"telegram":true,"email":true,"copyLink":true,"nativeShare":true}}'),
('research_portfolio_config', '{"heroBadge":"UGC Section 5(e) · Sponsored R&D, IPR & Innovation Ecosystem","heroTitle":"Research, Funded Grants, Patents & Incubation Cell","heroSubtitle":"Autonomous R&D ecosystem driving DST-SERB, AICTE-MODROBS, MSME Design Clinic grants, filed/granted Indian patents, industry consultancy, and AICTE IDEA Lab hardware startups.","deanName":"Dr. M. S. Kadam","deanTitle":"Dean Research & Development (R&D) & IPR Cell","deanEmail":"dean.rd@coe.sveri.ac.in","deanPhone":"+91-02186-216066","totalGrantsHighlight":"Rs. 3.85 Cr+ Sponsored Grants","activeLabsHighlight":"4 Approved Ph.D. Centres & 18+ Active Labs","consultancyPolicyUrl":"quick-links.php"}'),
('email_push_config', '{"enabled":true,"transportMode":"php_mail","fromName":"SVCOER Pandharpur (Autonomous) Portal","fromEmail":"noreply@coe.sveri.ac.in","replyToEmail":"principal@coe.sveri.ac.in","smtpHost":"smtp.gmail.com","smtpPort":587,"smtpEncryption":"tls","smtpUsername":"","smtpPassword":"","webhookRelayUrl":"","alertRecipientEmails":"principal@coe.sveri.ac.in, itadmin@coe.sveri.ac.in","reportRecipientEmails":"principal@coe.sveri.ac.in, iqac@coe.sveri.ac.in, itadmin@coe.sveri.ac.in","pushOnNewFeedback":true,"pushOnNewGrievance":true,"pushOnSecurityAlert":true,"enableScheduledVisitorDigest":false,"digestFrequency":"daily","lastDigestSentAt":""}'),
('pages_parity_seeded_v2', '1'),
('social_seeded_v1', '1'),
('research_portfolio_seeded_v1', '1'),
('feedback_seeded_v1', '1'),
('tenders_seeded_v1', '1'),
('shareable_synced_v1', '1'),
('header_config', '{"showTopUtilityBar":true,"utilityTagline":"Autonomous Engineering Campus","showRegulatoryCodes":true,"showAdminButton":true,"showInstituteCodeBadge":true,"showSearchBar":true,"showStatutoryBar":true,"statutoryBarLabel":"Statutory & Quick Access:"}'),
('top_bar_links', '[{"label":"Quick Links","url":"quick-links.php"},{"label":"Tenders & Notices","url":"tenders.php"},{"label":"Conferences & Workshops","url":"conferences.php"},{"label":"Examination Cell","url":"page.php?cat=examination"},{"label":"Alumni Network","url":"alumni.php"},{"label":"Placements","url":"placements.php"},{"label":"Grievance Helpdesk","url":"grievance.php"},{"label":"FRA Fee Structure","url":"page.php?slug=prospectus-fee-structure"},{"label":"RTI Disclosure","url":"page.php?slug=rti-disclosure"}]'),
('footer_columns', '[{"title":"Mandatory Self-Disclosure","links":[{"label":"About HEI & Statutes","url":"page.php?slug=about-overview"},{"label":"FRA Fee Structure","url":"page.php?slug=prospectus-fee-structure"},{"label":"RTI Disclosure","url":"page.php?slug=rti-disclosure"},{"label":"Statutory Officers","url":"page.php?slug=statutory-officers"}]},{"title":"Academics & Departments","links":[{"label":"Examination Cell & CoE","url":"page.php?cat=examination"},{"label":"Computer Science & Engg.","url":"department.php?dept=computer-science"},{"label":"Mechanical Engineering","url":"department.php?dept=mechanical"},{"label":"Civil & E&TC Engg.","url":"department.php?dept=civil"}]},{"title":"Repositories & Contact","links":[{"label":"Campus Facilities","url":"facilities.php"},{"label":"Tenders & Purchase Notices","url":"tenders.php"},{"label":"Sports & Gymkhana","url":"sports.php"},{"label":"Downloadable Repository","url":"quick-links.php"},{"label":"Conferences & Events","url":"conferences.php"},{"label":"Training & Placements","url":"placements.php"},{"label":"Complaint & Feedback Cell","url":"feedback.php"},{"label":"Alumni Network & Jobs","url":"alumni.php"},{"label":"Picture Gallery","url":"gallery.php"},{"label":"Telephone Directory","url":"contact.php"},{"label":"Staff CMS Login","url":"admin/login.php"}]}]'),
('tender_portal_config', '{"heroBadge":"Central Purchase & Procurement Cell · Store & Finance Division","heroTitle":"Tenders, Quotations & Purchase Notices","heroSubtitle":"Official invitations to bid (NITs), Bill of Quantities (BOQ), corrigenda, vendor eligibility criteria, pre-bid schedules, and contract award disclosures for laboratory, IT, civil, and campus services.","officerName":"Prof. A. B. Deshpande","officerTitle":"Purchase Officer & Convenor, Central Purchase Committee","officerEmail":"purchase@coe.sveri.ac.in","officerPhone":"+91-02186-216063","officeAddress":"Central Store & Purchase Office, Administrative Block, Gopalpur, Pandharpur - 413304","eProcurementPortalUrl":"https://gem.gov.in/","eProcurementPortalLabel":"GeM / e-Tendering Portal","generalTermsHtml":"<ul><li>All sealed quotations / technical &amp; financial bids must quote the exact <strong>NIT Reference Number</strong> on the envelope and reach the Central Purchase Office before the notified deadline.</li><li>GST registration, PAN copy, OEM authorization, and Earnest Money Deposit (EMD) DD drawn in favour of the Principal are mandatory unless exempted under MSME/NSIC norms.</li><li>The Central Purchase Committee reserves the right to accept, split, or reject any tender without assigning reasons.</li></ul>","customFieldPresets":["Technical Specifications","Delivery Period","Warranty / DLP","Bid Validity","Payment Terms"]}'),
('footer_config', '{"showContactBlock":true,"copyrightText":"","complianceNote":"UGC NEP 2020 Public Self-Disclosure Compliant.","showBottomLinks":true,"bottomBarLinks":[{"label":"Tenders & Notices","url":"tenders.php"},{"label":"Sitemap","url":"sitemap.php"},{"label":"Robots.txt","url":"robots.php"},{"label":"RTI Cell","url":"page.php?slug=rti-disclosure"},{"label":"Feedback Cell","url":"feedback.php"},{"label":"Grievance Redressal","url":"grievance.php"},{"label":"Developers & Contributors","url":"credits.php"}],"showCreatorCreditBar":true,"creatorCreditLabel":"Designed & Developed by","creatorCreditName":"Campus Web & Software Engineering Team","creatorCreditUrl":"credits.php"}'),
('credits_page_config', '{"eyebrow":"Portal Architecture & Attribution","pageTitle":"Platform Creators, Developers & Contributors","pageSubtitle":"Meet the system architects, full-stack engineers, institutional coordinators, and content contributors who designed, built, and maintain the official web portal.","projectVersion":"2026 Enterprise Release","releaseYear":"2026","organizationCredit":"Institutional Web & Digital Systems Cell","licenseNote":"Built for UGC Public Self-Disclosure, Autonomous Governance & Security Compliance.","acknowledgementsHtml":"<p>This institutional digital portal was engineered to deliver transparent UGC NEP 2020 self-disclosure, departmental microsites, examination updates, research &amp; placement portals, and hardened RBAC administration. Every contributor, developer, faculty coordinator, and department administrator listed here plays an ongoing role in keeping public academic information accurate, accessible, and secure.</p>","isShareable":true,"showContributorsSection":true,"showTechStackSection":true,"contributors":[{"id":1,"name":"Institutional Web & ERP Engineering Team","role":"Platform Creator & Systems Architect","category":"Creator","affiliation":"Centre for Digital Governance & Campus IT","email":"webmaster@coe.sveri.ac.in","websiteUrl":"","githubUrl":"","linkedinUrl":"","photoUrl":"","bio":"Conceptualized the modular UGC-compliant architecture, RBAC governance workflow, Super Admin content moderation queue, and full-stack backup/security stack.","contributions":"System Architecture · Security Shield · Dual-Stack React & PHP/MySQL Engine","isActive":true,"sortOrder":1},{"id":2,"name":"Departmental CMS & IQAC Content Cell","role":"Editorial Coordinators & Disclosure Leads","category":"Core Contributor","affiliation":"Internal Quality Assurance Cell (IQAC) & HOD Desk","email":"iqac@coe.sveri.ac.in","websiteUrl":"","githubUrl":"","linkedinUrl":"","photoUrl":"","bio":"Curates statutory documentation, NAAC/NBA/NIRF disclosures, academic syllabi, and verified departmental micro-pages.","contributions":"Academic Governance · Statutory Disclosures · Accessibility Audits","isActive":true,"sortOrder":2},{"id":3,"name":"Accessibility, SEO & Visual Experience Guild","role":"UI/UX & WCAG Compliance Contributors","category":"UI/UX Designer","affiliation":"Digital Media & Student Portal Group","email":"","websiteUrl":"","githubUrl":"","linkedinUrl":"","photoUrl":"","bio":"Designed bilingual support, dyslexia-friendly reading controls, screen-reader landmarks, OpenGraph cards, and responsive mobile-first layouts.","contributions":"Design System · WCAG AA Contrast · Multi-Language & TTS Controls","isActive":true,"sortOrder":3}],"techStack":[{"name":"Apache 2.4 + PHP 8.x PDO","category":"Deployment Runtime","description":"Webmin/Virtualmin-ready server runtime with prepared SQL statements, single-use SVG CAPTCHA, and clean .htaccess routing."},{"name":"MySQL 8.0 / MariaDB","category":"Relational Storage","description":"ACID-compliant storage for UGC pages, departments, conferences, alumni, logs, and the Super Admin approval revision queue."},{"name":"React + TypeScript + Vite","category":"Interactive Preview","description":"Real-time modular workspace and instant preview parity paired with Tailwind typography and accessible controls."},{"name":"Security Shield & Audit Trail","category":"AppSec & Monitoring","description":"WAF threat inspection, CSRF tokens, IP blocklisting, rate limiting, GeoIP analytics, and Super Admin revision diffs."}]}')
ON DUPLICATE KEY UPDATE val_json = VALUES(val_json);

-- 22. Content Moderation & Super Admin Approval Queue
CREATE TABLE IF NOT EXISTS content_pending_revisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_table VARCHAR(64) NOT NULL,
  entity_id INT NULL,
  action_type ENUM('create','update','delete') NOT NULL,
  entity_title VARCHAR(260) NOT NULL,
  current_snapshot_json LONGTEXT NULL,
  proposed_payload_json LONGTEXT NULL,
  submitted_by_user_id INT NULL,
  submitted_by_name VARCHAR(160) NOT NULL DEFAULT '',
  submitted_by_email VARCHAR(160) NOT NULL DEFAULT '',
  submitted_by_role VARCHAR(64) NOT NULL DEFAULT 'content_editor',
  status ENUM('pending_approval','approved','rejected') NOT NULL DEFAULT 'pending_approval',
  reviewer_email VARCHAR(160) NULL,
  reviewer_note TEXT NULL,
  submitted_at VARCHAR(40) NOT NULL,
  reviewed_at VARCHAR(40) NULL,
  INDEX idx_cpr_status (status),
  INDEX idx_cpr_table (entity_table)
) ENGINE=InnoDB;

-- 23. Tenders & Purchase Notices Portal
CREATE TABLE IF NOT EXISTS tender_notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_number VARCHAR(120) NOT NULL,
  title VARCHAR(280) NOT NULL,
  category VARCHAR(140) NOT NULL DEFAULT 'Lab Equipment & Machinery',
  department_name VARCHAR(180) NOT NULL DEFAULT 'Central Purchase Cell',
  procurement_mode VARCHAR(140) NOT NULL DEFAULT 'Open Tender (Two-Bid System)',
  estimated_value VARCHAR(100) DEFAULT '',
  emd_amount VARCHAR(100) DEFAULT '',
  tender_fee VARCHAR(100) DEFAULT '',
  publish_date VARCHAR(40) NOT NULL,
  pre_bid_date VARCHAR(140) DEFAULT '',
  submission_deadline VARCHAR(100) NOT NULL,
  bid_opening_date VARCHAR(100) DEFAULT '',
  lifecycle_status VARCHAR(60) NOT NULL DEFAULT 'Open',
  summary TEXT NULL,
  eligibility_html MEDIUMTEXT NULL,
  nit_pdf_url VARCHAR(500) DEFAULT '',
  boq_url VARCHAR(500) DEFAULT '',
  corrigendum_note TEXT NULL,
  corrigendum_url VARCHAR(500) DEFAULT '',
  awarded_to VARCHAR(220) DEFAULT '',
  awarded_value VARCHAR(100) DEFAULT '',
  po_reference VARCHAR(160) DEFAULT '',
  custom_fields_json MEDIUMTEXT NULL,
  is_pinned TINYINT(1) DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  is_shareable TINYINT(1) NOT NULL DEFAULT 1,
  moderation_status ENUM('published','pending_approval','rejected','draft') NOT NULL DEFAULT 'published',
  sort_order INT DEFAULT 1
) ENGINE=InnoDB;

INSERT INTO tender_notices (id, reference_number, title, category, department_name, procurement_mode, estimated_value, emd_amount, tender_fee, publish_date, pre_bid_date, submission_deadline, bid_opening_date, lifecycle_status, summary, eligibility_html, nit_pdf_url, boq_url, corrigendum_note, corrigendum_url, awarded_to, awarded_value, po_reference, custom_fields_json, is_pinned, is_published, is_shareable, moderation_status, sort_order) VALUES
(1, 'SVCOER/PUR/2026-27/014', 'Supply, Installation & Commissioning of 5-Axis CNC Machining Centre & Metrology Bench', 'Lab Equipment & Machinery', 'Mechanical Engineering & IDEA Lab', 'Open Tender (Two-Bid System)', 'Rs. 24,50,000', 'Rs. 49,000', 'Rs. 2,000 (Non-Refundable)', '2026-11-10', '2026-11-22 11:30 AM · R&D Seminar Hall', '2026-12-08 05:00 PM', '2026-12-10 11:00 AM', 'Open', 'Sealed two-bid technical and commercial offers are invited from OEMs or authorized dealers for a 5-axis CNC milling trainer and digital coordinate measuring arm.', '<ul><li>Minimum 3 years OEM/authorized supply track record in AICTE engineering institutions or R&amp;D centres.</li><li>Average annual turnover &ge; Rs. 75 Lakhs over preceding 3 FYs.</li><li>On-site commissioning and 36-month comprehensive warranty included.</li></ul>', 'quick-links.php', 'quick-links.php', '', '', '', '', '', '[{"label":"Delivery Period","value":"6 Weeks from Purchase Order"},{"label":"Warranty / DLP","value":"36 Months Comprehensive On-Site"}]', 1, 1, 1, 'published', 1),
(2, 'SVCOER/IT/2026-27/011', 'Campus Wi-Fi 6 Access Points, Layer-3 Core Switches & Next-Gen Firewall Upgrade', 'IT Hardware, Networking & Software', 'Central Computing & Network Cell', 'GeM Portal Bid', 'Rs. 18,20,000', 'Rs. 36,000', 'Exempted (GeM)', '2026-11-04', '2026-11-18 03:00 PM · IT Data Centre', '2026-12-02 04:00 PM', '2026-12-03 12:00 PM', 'Corrigendum Issued', 'Procurement of 48 enterprise Wi-Fi 6 indoor access points, 4 stackable 10G SFP+ L3 switches, and HA cluster firewall appliance with 5-year UTM license.', '<ul><li>OEM Authorization Form (MAF) referencing Tender No. SVCOER/IT/2026-27/011 is mandatory.</li><li>Bidder must have executed at least 2 campus LAN/Wi-Fi deployments of Rs. 10 Lakhs+ in Maharashtra.</li></ul>', 'quick-links.php', 'quick-links.php', 'Corrigendum-1 (15 Nov 2026): Submission deadline extended to 02 Dec 2026; SFP+ transceiver quantity revised from 24 to 32 units.', 'quick-links.php', '', '', '', '[{"label":"Technical Specifications","value":"802.11ax Dual-Band MU-MIMO + 10G Uplink"},{"label":"Warranty / DLP","value":"5 Years OEM Back-to-Back Support"}]', 1, 1, 1, 'published', 2),
(3, 'SVCOER/EST/2026-27/008', 'Annual Maintenance Contract (AMC) for 520 kWp Rooftop Solar PV & Substation Switchgear', 'AMC & Campus Services', 'Campus Estate & Electrical Division', 'Sealed Quotation Invite', 'Rs. 6,40,000', 'Rs. 12,000', 'Rs. 1,000', '2026-10-25', '2026-11-02 11:00 AM', '2026-11-28 05:00 PM', '2026-11-30 11:30 AM', 'Under Evaluation', 'Preventive quarterly servicing, thermal imaging inspection, string inverter calibration, and 11 kV HT/LT transformer filtration across campus solar blocks.', '<ul><li>Valid PWD Electrical Contractor License (HT Category) mandatory.</li><li>Monthly preventive maintenance report and emergency 4-hour fault response SLA.</li></ul>', 'quick-links.php', '', '', '', '', '', '', '[{"label":"Contract Tenure","value":"12 Months (Extendable by 1 Year)"}]', 0, 1, 1, 'published', 3),
(4, 'SVCOER/LIB/2026-27/003', 'Central Library RFID Self-Check Kiosk, Security Gate & UHF Smart Tagging Supply', 'Stationery, Books & Consumables', 'Central Knowledge Resource Centre', 'Limited Tender Enquiry', 'Rs. 9,80,000', 'Rs. 20,000', 'Rs. 1,000', '2026-09-12', '', '2026-10-05 05:00 PM', '2026-10-07 11:00 AM', 'Awarded', 'Turnkey integration of 2 self-issue/return kiosks, dual-aisle UHF theft detection gate, and 25,000 RFID book tags integrated via SIP2 with KOHA ILMS.', '<ul><li>Full SIP2 compatibility with existing KOHA v23.11 server required.</li></ul>', 'quick-links.php', '', '', '', 'M/s LibTech Automation Systems Pvt. Ltd., Pune', 'Rs. 9,18,500 (Incl. GST)', 'PO/SVCOER/2026-27/118 (Dt. 2026-10-19)', '[{"label":"Integration Standard","value":"ISO 18000-6C UHF / KOHA SIP2"}]', 0, 1, 1, 'published', 4);

