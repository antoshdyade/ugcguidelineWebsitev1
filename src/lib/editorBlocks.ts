export type TableThemeId =
  | 'navy'
  | 'teal'
  | 'amber'
  | 'emerald'
  | 'slate'
  | 'minimal';

export interface TableThemeOption {
  id: TableThemeId;
  label: string;
  previewBg: string;
  previewText: string;
  className: string;
}

export interface EditorComponentBlock {
  id: string;
  title: string;
  category: 'Layouts' | 'Callouts & Banners' | 'Academic & UGC' | 'Interactive';
  description: string;
  accentColor: string;
  html: string;
}

export const TABLE_THEMES: TableThemeOption[] = [
  {
    id: 'navy',
    label: 'Royal Navy Header',
    previewBg: '#0F294A',
    previewText: '#FFFFFF',
    className: 'cms-table-navy',
  },
  {
    id: 'amber',
    label: 'Saffron / Gold Disclosure',
    previewBg: '#B45309',
    previewText: '#FFFFFF',
    className: 'cms-table-amber',
  },
  {
    id: 'teal',
    label: 'Teal Striped Ledger',
    previewBg: '#0F766E',
    previewText: '#FFFFFF',
    className: 'cms-table-teal',
  },
  {
    id: 'emerald',
    label: 'Emerald Academic',
    previewBg: '#047857',
    previewText: '#FFFFFF',
    className: 'cms-table-emerald',
  },
  {
    id: 'slate',
    label: 'Modern Slate',
    previewBg: '#334155',
    previewText: '#FFFFFF',
    className: 'cms-table-slate',
  },
  {
    id: 'minimal',
    label: 'Clean Minimal Hairline',
    previewBg: '#F5F5F4',
    previewText: '#1C1917',
    className: 'cms-table-minimal',
  },
];

export const TEXT_COLOR_SWATCHES = [
  { label: 'Default Ink', value: '#1C1917' },
  { label: 'Royal Navy', value: '#0F294A' },
  { label: 'Saffron Gold', value: '#B45309' },
  { label: 'Emerald', value: '#047857' },
  { label: 'Crimson', value: '#B91C1C' },
  { label: 'Deep Indigo', value: '#4338CA' },
  { label: 'Teal', value: '#0F766E' },
  { label: 'Muted Gray', value: '#57534E' },
  { label: 'Pure White', value: '#FFFFFF' },
];

export const HIGHLIGHT_COLOR_SWATCHES = [
  { label: 'Clear Highlight', value: 'transparent' },
  { label: 'Warm Amber', value: '#FEF3C7' },
  { label: 'Sky Tint', value: '#E0F2FE' },
  { label: 'Mint Green', value: '#D1FAE5' },
  { label: 'Rose Tint', value: '#FFE4E6' },
  { label: 'Soft Lavender', value: '#EDE9FE' },
  { label: 'Stone Paper', value: '#F5F5F4' },
];

export const FONT_FAMILY_OPTIONS = [
  { label: 'Default Sans (Plus Jakarta)', value: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { label: 'Editorial Serif (Playfair)', value: "'Playfair Display', Georgia, serif" },
  { label: 'Academic Serif (Georgia)', value: 'Georgia, Cambria, serif' },
  { label: 'Tabular Mono (JetBrains)', value: "'JetBrains Mono', monospace" },
];

export function buildStyledTableHtml(
  rowsInput: number,
  colsInput: number,
  themeId: TableThemeId = 'navy',
  hasHeader = true,
): string {
  const rows = Math.max(1, Math.min(20, Math.floor(Number.isFinite(rowsInput) ? rowsInput : 3)));
  const cols = Math.max(1, Math.min(10, Math.floor(Number.isFinite(colsInput) ? colsInput : 3)));
  const theme = TABLE_THEMES.find((t) => t.id === themeId) || TABLE_THEMES[0];

  const headerCells = Array.from({ length: cols }, (_, i) => `<th>Column ${i + 1}</th>`).join('');
  const bodyRowsCount = hasHeader ? Math.max(1, rows - 1) : rows;
  const bodyRows = Array.from({ length: bodyRowsCount }, (_, rIdx) => {
    const cells = Array.from(
      { length: cols },
      (__, cIdx) => `<td>Row ${rIdx + 1}, Col ${cIdx + 1}</td>`,
    ).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const thead = hasHeader ? `<thead><tr>${headerCells}</tr></thead>` : '';
  return `<div class="cms-block cms-table-wrap" data-block="table"><table class="cms-table ${theme.className}">${thead}<tbody>${bodyRows}</tbody></table></div><p></p>`;
}

export const EDITOR_COMPONENT_BLOCKS: EditorComponentBlock[] = [
  {
    id: 'hero-banner',
    title: 'Colorful Hero Banner',
    category: 'Callouts & Banners',
    description: 'Rich gradient header card with heading, subtitle & button',
    accentColor: '#0F294A',
    html: `<div class="cms-block cms-banner-navy" data-block="hero-banner">
  <p class="cms-kicker">INSTITUTIONAL ANNOUNCEMENT</p>
  <h3>Autonomous Academic Excellence &amp; Student Support</h3>
  <p>Edit this banner text directly in the Visual Editor. Highlight key notices, admissions deadlines, or NEP 2020 initiatives.</p>
  <p><a class="cms-btn cms-btn-amber" href="/quick-links">Explore Documents &rarr;</a></p>
</div><p></p>`,
  },
  {
    id: 'two-col-cards',
    title: '2-Column Feature Cards',
    category: 'Layouts',
    description: 'Side-by-side colorful feature cards',
    accentColor: '#0F766E',
    html: `<div class="cms-block cms-grid-2" data-block="two-col-cards">
  <div class="cms-card cms-card-blue">
    <h4>Academic Highlights</h4>
    <p>160-Credit NEP 2020 Honours &amp; Minor degree structure with 6-month industry internships.</p>
  </div>
  <div class="cms-card cms-card-amber">
    <h4>Research &amp; Innovation</h4>
    <p>Funded R&amp;D laboratories, patent filing cell, and AICTE/DST-SERB consultancy grants.</p>
  </div>
</div><p></p>`,
  },
  {
    id: 'three-col-stats',
    title: '3-Column Metrics Strip',
    category: 'Academic & UGC',
    description: 'Three color-coded key statistics boxes',
    accentColor: '#B45309',
    html: `<div class="cms-block cms-grid-3" data-block="three-col-stats">
  <div class="cms-stat-box cms-stat-navy">
    <div class="cms-stat-num">3.46</div>
    <div class="cms-stat-label">NAAC A+ CGPA Grade</div>
  </div>
  <div class="cms-stat-box cms-stat-emerald">
    <div class="cms-stat-num">250+</div>
    <div class="cms-stat-label">Visiting Campus Recruiters</div>
  </div>
  <div class="cms-stat-box cms-stat-amber">
    <div class="cms-stat-num">20 Days</div>
    <div class="cms-stat-label">Autonomous Result Declaration</div>
  </div>
</div><p></p>`,
  },
  {
    id: 'callout-info',
    title: 'Blue Notice Callout',
    category: 'Callouts & Banners',
    description: 'Highlighted info box for circulars & rules',
    accentColor: '#0284C7',
    html: `<div class="cms-block cms-callout cms-callout-info" data-block="callout-info">
  <h4>Important Student &amp; Parent Notice</h4>
  <p>All statutory disclosures, scholarship circulars, and FRA fee orders are openly accessible without login per UGC NEP 2020 norms.</p>
</div><p></p>`,
  },
  {
    id: 'callout-success',
    title: 'Emerald Highlight Box',
    category: 'Callouts & Banners',
    description: 'Green card for approvals, achievements & grants',
    accentColor: '#047857',
    html: `<div class="cms-block cms-callout cms-callout-success" data-block="callout-success">
  <h4>Approved &amp; Verified Status</h4>
  <p>NBA accredited engineering programs with Academic Bank of Credits (ABC) and DigiLocker NAD verification enabled.</p>
</div><p></p>`,
  },
  {
    id: 'callout-warning',
    title: 'Amber Deadline / Helpline Box',
    category: 'Callouts & Banners',
    description: 'Warm amber notice box for schedules & helplines',
    accentColor: '#D97706',
    html: `<div class="cms-block cms-callout cms-callout-warning" data-block="callout-warning">
  <h4>Important Dates &amp; Helpline</h4>
  <p>Students must verify their ABC ID before submitting online examination forms. Helpdesk: +91-02186-216063.</p>
</div><p></p>`,
  },
  {
    id: 'split-media-text',
    title: 'Image + Text Feature Split',
    category: 'Layouts',
    description: 'Side-by-side campus visual and editorial prose',
    accentColor: '#4338CA',
    html: `<div class="cms-block cms-split" data-block="split-media-text">
  <div class="cms-split-media">
    <img src="/src/assets/images/hero_campus_aerial_1794512596442.jpg" alt="Campus view" />
  </div>
  <div class="cms-split-body">
    <h4>Modern Campus &amp; Central Library</h4>
    <p>Upload any campus or event photo to replace the image on the left, and edit this narrative directly in Visual mode.</p>
    <p><a class="cms-btn cms-btn-navy" href="/gallery">View Photo Gallery</a></p>
  </div>
</div><p></p>`,
  },
  {
    id: 'accordion-faq',
    title: 'Collapsible FAQ / Ordinance',
    category: 'Interactive',
    description: 'Expandable <details> section for FAQs & rules',
    accentColor: '#7C3AED',
    html: `<div class="cms-block cms-accordion-group" data-block="accordion-faq">
  <details class="cms-accordion" open>
    <summary>How is Continuous Internal Evaluation (CIE) + ESE graded?</summary>
    <div class="cms-accordion-body">Autonomous courses follow 40% Continuous Internal Evaluation and 60% End-Semester Examination on a 10-point CGPA grading scale.</div>
  </details>
  <details class="cms-accordion">
    <summary>How do students apply for answer-script photocopy or revaluation?</summary>
    <div class="cms-accordion-body">Applications are submitted online via the Examination Cell portal within 7 working days of result declaration.</div>
  </details>
</div><p></p>`,
  },
  {
    id: 'officer-card',
    title: 'Officer / Coordinator Card',
    category: 'Academic & UGC',
    description: 'Clean profile block for HoD, CoE, or Cell In-charge',
    accentColor: '#0F294A',
    html: `<div class="cms-block cms-profile-card" data-block="officer-card">
  <div class="cms-profile-avatar">SV</div>
  <div class="cms-profile-info">
    <p class="cms-profile-role">CELL COORDINATOR / OFFICER</p>
    <h4>Dr. Name Surname</h4>
    <p>Qualification · Department · Email: officer@coe.sveri.ac.in · Phone: +91-02186-216063</p>
  </div>
</div><p></p>`,
  },
  {
    id: 'photo-profile-card',
    title: 'Photo Profile Card (Statutory / Faculty)',
    category: 'Academic & UGC',
    description: 'Portrait photo with statutory role, qualification, department & contact details',
    accentColor: '#0F294A',
    html: buildPhotoProfileCardHtml({
      roleBadge: 'Statutory Officer / Faculty Profile',
      name: 'Dr. Prashant M. Pawar',
      designation: 'Principal & Professor (Ph.D., IIT Bombay)',
      department: 'Governing Body / Civil Engineering',
      email: 'principal@coe.sveri.ac.in',
      phone: '+91-02186-216063',
      bio: '24+ years of academic leadership, autonomous curriculum design, and sponsored R&D.',
      photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
    }),
  },
  {
    id: 'cta-buttons-row',
    title: 'Colorful Button Group',
    category: 'Interactive',
    description: 'Primary Navy, Gold & Outline action buttons',
    accentColor: '#B45309',
    html: `<div class="cms-block cms-btn-row" data-block="cta-buttons-row">
  <a class="cms-btn cms-btn-navy" href="/quick-links">Download Circular (PDF)</a>
  <a class="cms-btn cms-btn-amber" href="/category/examination">Open Exam Portal</a>
  <a class="cms-btn cms-btn-outline" href="/contact">Contact Office</a>
</div><p></p>`,
  },
  {
    id: 'checklist-card',
    title: 'Styled Eligibility Checklist',
    category: 'Academic & UGC',
    description: 'Clean highlighted bullet list for criteria & outcomes',
    accentColor: '#047857',
    html: `<div class="cms-block cms-card cms-card-emerald" data-block="checklist-card">
  <h4>Key Highlights &amp; Eligibility Criteria</h4>
  <ul class="cms-checklist">
    <li>Approved by AICTE New Delhi and affiliated to PAH Solapur University.</li>
    <li>Autonomous NEP 2020 curriculum with multidisciplinary Honours &amp; Minor tracks.</li>
    <li>100% transparent fee structure approved by Fees Regulating Authority (FRA).</li>
  </ul>
</div><p></p>`,
  },
];

function escapeHtmlText(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPhotoProfileCardHtml(input: {
  roleBadge: string;
  name: string;
  designation: string;
  department?: string;
  email?: string;
  phone?: string;
  profileUrl?: string;
  bio?: string;
  photoUrl?: string;
  columns?: 1 | 2;
}): string {
  const safePhoto =
    input.photoUrl && !/^(javascript|data:text|vbscript):/i.test(input.photoUrl.trim())
      ? input.photoUrl.trim()
      : '/src/assets/images/leadership_principal_1794512597061.jpg';
  const contactParts: string[] = [];
  if (input.email?.trim()) {
    contactParts.push(
      `<span><strong>Email:</strong> ${escapeHtmlText(input.email.trim())}</span>`,
    );
  }
  if (input.phone?.trim()) {
    contactParts.push(
      `<span><strong>Phone:</strong> ${escapeHtmlText(input.phone.trim())}</span>`,
    );
  }
  const safeLink =
    input.profileUrl && !/^(javascript|data|vbscript):/i.test(input.profileUrl.trim())
      ? input.profileUrl.trim()
      : '';
  const cardInner = `<div class="cms-photo-profile-card">
  <div class="cms-photo-profile-media">
    <img src="${escapeHtmlText(safePhoto)}" alt="${escapeHtmlText(input.name || 'Profile Photo')}" />
  </div>
  <div class="cms-photo-profile-body">
    <p class="cms-profile-role">${escapeHtmlText(input.roleBadge || 'Statutory / Faculty Profile')}</p>
    <h4>${escapeHtmlText(input.name || 'Faculty / Officer Name')}</h4>
    <p class="cms-photo-profile-desig">${escapeHtmlText(input.designation || 'Professor & Officer')}</p>
    ${input.department?.trim() ? `<p class="cms-photo-profile-dept">${escapeHtmlText(input.department.trim())}</p>` : ''}
    ${input.bio?.trim() ? `<p class="cms-photo-profile-bio">${escapeHtmlText(input.bio.trim())}</p>` : ''}
    ${contactParts.length > 0 ? `<div class="cms-photo-profile-meta">${contactParts.join('')}</div>` : ''}
    ${safeLink ? `<p class="cms-photo-profile-link"><a class="cms-btn cms-btn-outline" href="${escapeHtmlText(safeLink)}" target="_blank" rel="noopener noreferrer">View Full Profile &rarr;</a></p>` : ''}
  </div>
</div>`;

  if (input.columns === 2) {
    return `<div class="cms-block cms-grid-2" data-block="photo-profile-card">${cardInner}${cardInner}</div><p></p>`;
  }
  return `<div class="cms-block" data-block="photo-profile-card">${cardInner}</div><p></p>`;
}

export function swapTableThemeInHtml(tableHtml: string, nextThemeId: TableThemeId): string {
  const theme = TABLE_THEMES.find((t) => t.id === nextThemeId) || TABLE_THEMES[0];
  const allThemeClasses = TABLE_THEMES.map((t) => t.className).join('|');
  const classRegex = new RegExp(`\\b(${allThemeClasses})\\b`, 'g');
  if (classRegex.test(tableHtml)) {
    return tableHtml.replace(classRegex, theme.className);
  }
  return tableHtml.replace(/<table([^>]*)>/i, (_, attrs: string) => {
    if (/class="/i.test(attrs)) {
      return `<table${attrs.replace(/class="([^"]*)"/i, `class="$1 cms-table ${theme.className}"`)}>`;
    }
    return `<table${attrs} class="cms-table ${theme.className}">`;
  });
}
