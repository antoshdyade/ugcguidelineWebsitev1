import type {
  CmsCategory,
  CmsDatabase,
  CmsPage,
  Conference,
  Department,
  HitCounterStats,
  SecurityConfig,
  SeoSettings,
  SiteSettings,
  VisitorLogEntry,
  VisitorLogEventType,
  VisitorLogSeverity,
} from '../types/cms';

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  defaultTitle: "SVERI's College of Engineering, Pandharpur (Autonomous)",
  titleSuffix: 'SVCOER Pandharpur (Autonomous)',
  defaultDescription:
    "Official institutional portal of SVERI's College of Engineering, Pandharpur (Autonomous). Explore B.Tech/M.Tech programs, Placements, R&D Conferences, Alumni Network, and UGC Disclosures.",
  defaultKeywords:
    'SVCOER Pandharpur, SVERI Engineering College, Autonomous Engineering College Maharashtra, Solapur University, B.Tech Pandharpur, Placements, NBA Accredited, NAAC',
  canonicalBaseUrl: 'https://coe.sveri.ac.in',
  ogImageUrl: '/src/assets/images/hero_campus_aerial_1794512596442.jpg',
  schemaOrgType: 'CollegeOrUniversity',
  enableJsonLd: true,
  allowIndexing: true,
  googleVerificationCode: '',
  bingVerificationCode: '',
  robotsTxtCustom: '',
  showHitCounterInFooter: true,
  hitCounterStartOffset: 12450,
  pageOverrides: [
    {
      id: 'seo-home',
      routePattern: '/',
      title: "SVERI's College of Engineering, Pandharpur (Autonomous) | Official Portal",
      description:
        "Empowered Autonomous Engineering Institute affiliated to PAH Solapur University with NBA/NAAC accreditation, 250+ campus recruiters, and UGC Self-Disclosure compliance.",
      keywords: 'SVERI Pandharpur, Autonomous Engineering College, Admissions, Placements, UGC NEP 2020',
    },
    {
      id: 'seo-placements',
      routePattern: '/placements',
      title: 'Training & Placement Cell (T&P) | Campus Drives & Statistics',
      description:
        'Explore SVERI Pandharpur branch-wise placement statistics, upcoming campus drives, student notices, and achiever offers across IT and Core Engineering.',
      keywords: 'SVERI Placements, Campus Drives, Training and Placement Cell, Engineering Packages',
    },
    {
      id: 'seo-conferences',
      routePattern: '/conferences',
      title: 'International Conferences, Workshops & Research Conclaves | SVCOER',
      description:
        'Submit peer-reviewed research papers, explore technical tracks, register as delegates, and attend IEEE/Scopus aligned conferences at SVERI Pandharpur.',
      keywords: 'Engineering Conference Pandharpur, Call for Papers, R&D Workshops, IEEE Conference',
    },
    {
      id: 'seo-alumni',
      routePattern: '/alumni',
      title: 'SVERI Alumni Association | Directory, Mentorship & Career Portal',
      description:
        'Connect with global SVCOER engineering alumni chapters, explore alumni job referrals, post discussions, and support student scholarships.',
      keywords: 'SVERI Alumni, Alumni Job Portal, Engineering Alumni Association Pandharpur',
    },
    {
      id: 'seo-sports',
      routePattern: '/sports',
      title: 'Sports, Athletics & Physical Education Portal | SVCOER Pandharpur',
      description:
        'Explore indoor and outdoor sports facilities, intercollegiate tournaments, university/state/national medalists, sports gallery, and trial notices.',
      keywords: 'SVCOER Sports, Student Life, Athletics Stadium, Krida Mahotsav, PAHSUS Sports',
      ogImageUrl: '/src/assets/images/sports_complex_1794991330591.jpg',
    },
    {
      id: 'seo-facilities',
      routePattern: '/facilities',
      title: 'Campus Facilities & Infrastructure Showcase | SVCOER Pandharpur',
      description:
        'Explore AICTE/UGC infrastructural facilities, 1 Gbps central IT computing labs, library, hostels, medical care & barrier-free green campus amenities.',
      keywords: 'SVCOER Campus Facilities, Infrastructure, IT Facilities, Hostels, Central Library',
      ogImageUrl: '/src/assets/images/campus_facilities_1794991331724.jpg',
    },
    {
      id: 'seo-feedback',
      routePattern: '/feedback',
      title: 'Stakeholder Complaint & Feedback Portal | SVCOER Pandharpur',
      description:
        'Submit academic, examination, hostel, infrastructure, IT, or placement feedback and complaints routed directly to concerned campus section heads.',
      keywords: 'SVCOER Feedback, Campus Complaint Portal, Student Suggestions, Section Email Routing',
    },
  ],
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  wafEnabled: true,
  rateLimitEnabled: true,
  autoBlockAttackers: true,
  maxRequestsPerMinute: 120,
  maxFailedLogins: 5,
  lockoutMinutes: 15,
  blockScannerProbes: true,
  maskExportedIps: false,
};

export function createSeedHitCounter(todayDate = new Date().toISOString().slice(0, 10)): HitCounterStats {
  return {
    totalHits: 12488,
    todayHits: 38,
    todayDate,
    uniqueVisitors: 4120,
    uniqueTodayHashes: [],
    lastHitAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
  };
}

export function createSeedVisitorLogs(todayDate = new Date().toISOString().slice(0, 10)): VisitorLogEntry[] {
  return [
    {
      id: 1,
      timestamp: `${todayDate} 09:42:18`,
      ipAddress: '103.21.124.18',
      country: 'India',
      countryCode: 'IN',
      state: 'Maharashtra',
      area: 'Pandharpur (Solapur District)',
      method: 'GET',
      path: '/',
      statusCode: 200,
      deviceType: 'Desktop',
      browser: 'Chrome',
      os: 'Windows',
      referrer: 'https://www.google.com/',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0',
      responseTimeMs: 14,
      severity: 'info',
      eventType: 'page_view',
    },
    {
      id: 2,
      timestamp: `${todayDate} 09:51:04`,
      ipAddress: '49.36.90.44',
      country: 'India',
      countryCode: 'IN',
      state: 'Maharashtra',
      area: 'Pune (Hinjewadi IT Park)',
      method: 'GET',
      path: '/placements',
      statusCode: 200,
      deviceType: 'Mobile',
      browser: 'Chrome Mobile',
      os: 'Android',
      referrer: 'https://www.linkedin.com/',
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/125.0 Mobile',
      responseTimeMs: 19,
      severity: 'info',
      eventType: 'page_view',
    },
    {
      id: 3,
      timestamp: `${todayDate} 10:05:37`,
      ipAddress: '103.54.18.92',
      country: 'India',
      countryCode: 'IN',
      state: 'Maharashtra',
      area: 'Mumbai (BKC / Andheri)',
      method: 'GET',
      path: '/department/computer-science',
      statusCode: 200,
      deviceType: 'Desktop',
      browser: 'Edge',
      os: 'Windows',
      referrer: 'Direct',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0) Edg/126.0',
      responseTimeMs: 12,
      severity: 'info',
      eventType: 'page_view',
    },
    {
      id: 4,
      timestamp: `${todayDate} 10:18:22`,
      ipAddress: '106.51.72.14',
      country: 'India',
      countryCode: 'IN',
      state: 'Karnataka',
      area: 'Bengaluru (Electronic City)',
      method: 'GET',
      path: '/alumni',
      statusCode: 200,
      deviceType: 'Desktop',
      browser: 'Safari',
      os: 'macOS',
      referrer: 'https://coe.sveri.ac.in/',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605.1.15',
      responseTimeMs: 16,
      severity: 'info',
      eventType: 'page_view',
    },
    {
      id: 5,
      timestamp: `${todayDate} 10:29:11`,
      ipAddress: '14.139.120.5',
      country: 'India',
      countryCode: 'IN',
      state: 'Maharashtra',
      area: 'Solapur (University Road)',
      method: 'GET',
      path: '/conferences',
      statusCode: 200,
      deviceType: 'Desktop',
      browser: 'Firefox',
      os: 'Linux',
      referrer: 'https://scholar.google.com/',
      userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Firefox/127.0',
      responseTimeMs: 11,
      severity: 'info',
      eventType: 'page_view',
    },
    {
      id: 6,
      timestamp: `${todayDate} 10:44:02`,
      ipAddress: '104.28.42.19',
      country: 'United States',
      countryCode: 'US',
      state: 'California',
      area: 'Santa Clara (Silicon Valley)',
      method: 'GET',
      path: '/conference/icaest-2026',
      statusCode: 200,
      deviceType: 'Desktop',
      browser: 'Chrome',
      os: 'macOS',
      referrer: 'https://ieeexplore.ieee.org/',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/126.0',
      responseTimeMs: 22,
      severity: 'info',
      eventType: 'page_view',
    },
    {
      id: 7,
      timestamp: `${todayDate} 10:52:49`,
      ipAddress: '185.220.101.4',
      country: 'Germany',
      countryCode: 'DE',
      state: 'Bavaria',
      area: 'Munich',
      method: 'GET',
      path: '/.env?cmd=cat+/etc/passwd',
      statusCode: 403,
      deviceType: 'Bot',
      browser: 'Automated Scanner',
      os: 'Linux',
      referrer: 'Direct',
      userAgent: 'zgrab/0.x',
      responseTimeMs: 2,
      severity: 'critical',
      eventType: 'security_block',
      threatCategory: 'Sensitive File & Path Traversal Probe',
    },
    {
      id: 8,
      timestamp: `${todayDate} 11:03:15`,
      ipAddress: '122.172.81.66',
      country: 'India',
      countryCode: 'IN',
      state: 'Telangana',
      area: 'Hyderabad (HITEC City)',
      method: 'GET',
      path: '/quick-links',
      statusCode: 200,
      deviceType: 'Mobile',
      browser: 'Safari Mobile',
      os: 'iOS',
      referrer: 'https://www.google.com/',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Safari/604.1',
      responseTimeMs: 15,
      severity: 'info',
      eventType: 'page_view',
    },
    {
      id: 9,
      timestamp: `${todayDate} 11:12:40`,
      ipAddress: '45.142.212.10',
      country: 'Singapore',
      countryCode: 'SG',
      state: 'Central Region',
      area: 'Singapore (Marina Bay)',
      method: 'GET',
      path: '/api/public/search?q=%27%20UNION%20SELECT%20password_hash%20FROM%20users--',
      statusCode: 403,
      deviceType: 'Bot',
      browser: 'sqlmap',
      os: 'Linux',
      referrer: 'Direct',
      userAgent: 'sqlmap/1.8.2',
      responseTimeMs: 1,
      severity: 'critical',
      eventType: 'security_block',
      threatCategory: 'SQL Injection Attempt',
    },
  ];
}

export interface ResolvedGeo {
  ipAddress: string;
  country: string;
  countryCode: string;
  state: string;
  area: string;
}

const GEO_IP_PREFIX_TABLE: Array<{
  prefix: string;
  country: string;
  countryCode: string;
  state: string;
  area: string;
}> = [
  { prefix: '103.21.', country: 'India', countryCode: 'IN', state: 'Maharashtra', area: 'Pandharpur (Solapur District)' },
  { prefix: '14.139.', country: 'India', countryCode: 'IN', state: 'Maharashtra', area: 'Solapur (University Road)' },
  { prefix: '49.36.', country: 'India', countryCode: 'IN', state: 'Maharashtra', area: 'Pune (Metro Area)' },
  { prefix: '103.54.', country: 'India', countryCode: 'IN', state: 'Maharashtra', area: 'Mumbai (BKC / Suburbs)' },
  { prefix: '117.200.', country: 'India', countryCode: 'IN', state: 'Maharashtra', area: 'Nagpur (Vidarbha Region)' },
  { prefix: '106.51.', country: 'India', countryCode: 'IN', state: 'Karnataka', area: 'Bengaluru (IT Corridor)' },
  { prefix: '122.172.', country: 'India', countryCode: 'IN', state: 'Telangana', area: 'Hyderabad (HITEC City)' },
  { prefix: '115.96.', country: 'India', countryCode: 'IN', state: 'Tamil Nadu', area: 'Chennai (Guindy / OMR)' },
  { prefix: '182.73.', country: 'India', countryCode: 'IN', state: 'Delhi NCR', area: 'New Delhi / Noida' },
  { prefix: '104.28.', country: 'United States', countryCode: 'US', state: 'California', area: 'Santa Clara (Silicon Valley)' },
  { prefix: '172.64.', country: 'United States', countryCode: 'US', state: 'Virginia', area: 'Ashburn (East Coast)' },
  { prefix: '185.220.', country: 'Germany', countryCode: 'DE', state: 'Bavaria', area: 'Munich' },
  { prefix: '51.140.', country: 'United Kingdom', countryCode: 'GB', state: 'England', area: 'London' },
  { prefix: '45.142.', country: 'Singapore', countryCode: 'SG', state: 'Central Region', area: 'Singapore' },
];

const COUNTRY_CODE_NAMES: Record<string, { country: string; defaultState: string; defaultArea: string }> = {
  IN: { country: 'India', defaultState: 'Maharashtra', defaultArea: 'Pandharpur / Pune Region' },
  US: { country: 'United States', defaultState: 'California', defaultArea: 'San Jose / Bay Area' },
  GB: { country: 'United Kingdom', defaultState: 'England', defaultArea: 'London' },
  DE: { country: 'Germany', defaultState: 'Bavaria', defaultArea: 'Munich' },
  SG: { country: 'Singapore', defaultState: 'Central Region', defaultArea: 'Singapore' },
  AE: { country: 'United Arab Emirates', defaultState: 'Dubai', defaultArea: 'Dubai Internet City' },
  CA: { country: 'Canada', defaultState: 'Ontario', defaultArea: 'Toronto' },
  AU: { country: 'Australia', defaultState: 'New South Wales', defaultArea: 'Sydney' },
  JP: { country: 'Japan', defaultState: 'Tokyo', defaultArea: 'Minato-ku' },
};

export function normalizeClientIp(rawIp: string | undefined, forwardedFor?: string): string {
  const firstFwd = (forwardedFor || '').split(',')[0].trim();
  const candidate = (firstFwd || rawIp || '127.0.0.1').trim();
  if (candidate === '::1') return '127.0.0.1';
  if (candidate.startsWith('::ffff:')) return candidate.slice(7);
  return candidate.slice(0, 64) || '127.0.0.1';
}

export function resolveVisitorGeo(
  headers: Record<string, string | string[] | undefined>,
  rawIp: string,
): ResolvedGeo {
  const pickHdr = (name: string): string => {
    const val = headers[name.toLowerCase()];
    if (Array.isArray(val)) return (val[0] || '').trim();
    return (val || '').trim();
  };

  const ip = normalizeClientIp(rawIp, pickHdr('x-forwarded-for'));

  // 1. Honor verified CDN / Cloud Run / Proxy Geo headers when deployed behind reverse proxy
  const hdrCountryCode = (
    pickHdr('cf-ipcountry') ||
    pickHdr('x-appengine-country') ||
    pickHdr('x-vercel-ip-country') ||
    pickHdr('x-geo-country-code')
  ).toUpperCase();
  const hdrCountry = pickHdr('x-geo-country');
  const hdrState = pickHdr('x-appengine-region') || pickHdr('x-vercel-ip-country-region') || pickHdr('x-geo-state');
  const hdrArea = pickHdr('x-appengine-city') || pickHdr('x-vercel-ip-city') || pickHdr('x-geo-area');

  if (hdrCountryCode && hdrCountryCode !== 'ZZ' && hdrCountryCode !== 'XX') {
    const mapped = COUNTRY_CODE_NAMES[hdrCountryCode];
    return {
      ipAddress: ip,
      country: hdrCountry || mapped?.country || hdrCountryCode,
      countryCode: hdrCountryCode,
      state: hdrState || mapped?.defaultState || 'Regional Zone',
      area: hdrArea || mapped?.defaultArea || 'Metropolitan Area',
    };
  }

  // 2. Campus LAN / Loopback attribution
  if (
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  ) {
    return {
      ipAddress: ip,
      country: 'India',
      countryCode: 'IN',
      state: 'Maharashtra',
      area: 'Pandharpur (Campus LAN / Local Gateway)',
    };
  }

  // 3. Deterministic prefix table lookup
  for (const row of GEO_IP_PREFIX_TABLE) {
    if (ip.startsWith(row.prefix)) {
      return {
        ipAddress: ip,
        country: row.country,
        countryCode: row.countryCode,
        state: row.state,
        area: row.area,
      };
    }
  }

  // 4. Deterministic octet hash distribution across regional ISP zones for unknown public IPs
  const firstOctet = parseInt(ip.split('.')[0] || '0', 10) || 103;
  const idx = firstOctet % GEO_IP_PREFIX_TABLE.length;
  const fallback = GEO_IP_PREFIX_TABLE[idx];
  return {
    ipAddress: ip,
    country: fallback.country,
    countryCode: fallback.countryCode,
    state: fallback.state,
    area: `${fallback.area} (ISP Subnet)`,
  };
}

export function parseUserAgentSummary(uaRaw: string | undefined): {
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Bot';
  browser: string;
  os: string;
} {
  const ua = uaRaw || '';
  const low = ua.toLowerCase();

  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Bot' = 'Desktop';
  if (/bot|crawl|spider|sqlmap|nikto|zgrab|curl\/|python-requests|scanner|wget/i.test(low)) {
    deviceType = 'Bot';
  } else if (/ipad|tablet|playbook|silk/i.test(low)) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|android.*mobile|windows phone/i.test(low)) {
    deviceType = 'Mobile';
  }

  let browser = 'Other';
  if (low.includes('sqlmap')) browser = 'sqlmap';
  else if (low.includes('zgrab')) browser = 'zgrab Scanner';
  else if (low.includes('edg/')) browser = 'Edge';
  else if (low.includes('opr/') || low.includes('opera')) browser = 'Opera';
  else if (low.includes('chrome/') || low.includes('crios')) browser = deviceType === 'Mobile' ? 'Chrome Mobile' : 'Chrome';
  else if (low.includes('firefox/')) browser = 'Firefox';
  else if (low.includes('safari/') && !low.includes('chrome')) browser = deviceType === 'Mobile' ? 'Safari Mobile' : 'Safari';
  else if (low.includes('curl/')) browser = 'cURL';

  let os = 'Other';
  if (low.includes('windows')) os = 'Windows';
  else if (low.includes('android')) os = 'Android';
  else if (low.includes('iphone') || low.includes('ipad')) os = 'iOS';
  else if (low.includes('mac os x') || low.includes('macintosh')) os = 'macOS';
  else if (low.includes('linux') || low.includes('ubuntu')) os = 'Linux';

  return { deviceType, browser, os };
}

export interface ThreatDetectionResult {
  blocked: boolean;
  category: string;
  matchedRule?: string;
}

const WAF_RULES: Array<{ category: string; regex: RegExp; rule: string; pathOnly?: boolean }> = [
  {
    category: 'Null Byte Injection',
    regex: /\0|%00/i,
    rule: 'null-byte',
  },
  {
    category: 'Path Traversal Attack',
    regex: /(?:^|[\\/])\.\.(?:[\\/]|%2f|%5c)|%2e%2e%2f|%2e%2e\/|\.\.%2f|\/etc\/passwd|\/proc\/self\/environ|c:\\windows\\system32/i,
    rule: 'path-traversal',
  },
  {
    category: 'Sensitive File / Scanner Probe',
    regex: /^\/(?:\.env|\.git\/|wp-login\.php|wp-admin|wp-content|xmlrpc\.php|phpmyadmin|pma\/|shell\.php|c99\.php|cgi-bin\/|actuator\/env|backup\.sql|database\.sql|config\.php\.bak)(?:$|[/?])/i,
    rule: 'scanner-probe',
    pathOnly: true,
  },
  {
    category: 'SQL Injection Attempt',
    regex: /(?:union(?:\s+all)?\s+select\b|select\s+.+?\s+from\s+(?:users|information_schema|mysql)|'\s*(?:or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+|benchmark\s*\(|sleep\s*\(\s*\d+\s*\)|waitfor\s+delay|drop\s+table\b|into\s+(?:outfile|dumpfile))/i,
    rule: 'sqli-signature',
  },
  {
    category: 'XSS Script Injection',
    regex: /(?:<\s*script\b|javascript\s*:|on(?:error|load|mouseover|focus|click)\s*=\s*['"]?\s*(?:alert|confirm|prompt|eval|fetch|document\.cookie))/i,
    rule: 'xss-payload',
  },
  {
    category: 'Command Injection Attempt',
    regex: /(?:;\s*(?:cat|ls|id|whoami|uname|wget|curl|nc|bash|sh)\s+|\$\(\s*(?:cat|curl|wget|id|whoami)\b|`\s*(?:id|whoami|cat)\s*`)/i,
    rule: 'cmd-injection',
  },
];

export function detectRequestThreat(
  method: string,
  fullUrlPath: string,
  rawBodyPayload = '',
  userAgent = '',
  config: Partial<SecurityConfig> = DEFAULT_SECURITY_CONFIG,
  skipHtmlBodyInspection = false,
): ThreatDetectionResult {
  if (config.wafEnabled === false) {
    return { blocked: false, category: 'None' };
  }

  let decodedUrl = fullUrlPath;
  try {
    decodedUrl = decodeURIComponent(fullUrlPath);
  } catch {
    decodedUrl = fullUrlPath;
  }

  const uaLow = (userAgent || '').toLowerCase();
  if (config.blockScannerProbes !== false && /(sqlmap|nikto|acunetix|nessus|masscan|zgrab|havij|dirbuster)/i.test(uaLow)) {
    return {
      blocked: true,
      category: 'Malicious Security Scanner',
      matchedRule: 'scanner-ua',
    };
  }

  const combinedInput = skipHtmlBodyInspection
    ? `${fullUrlPath}\n${decodedUrl}`
    : `${fullUrlPath}\n${decodedUrl}\n${rawBodyPayload}`;

  for (const rule of WAF_RULES) {
    if (rule.pathOnly) {
      if (config.blockScannerProbes !== false && (rule.regex.test(fullUrlPath) || rule.regex.test(decodedUrl))) {
        return { blocked: true, category: rule.category, matchedRule: rule.rule };
      }
      continue;
    }
    if (rule.category === 'XSS Script Injection' && skipHtmlBodyInspection) {
      // Still verify query/URL path even for authenticated rich-HTML editors
      if (rule.regex.test(fullUrlPath) || rule.regex.test(decodedUrl)) {
        return { blocked: true, category: rule.category, matchedRule: rule.rule };
      }
      continue;
    }
    if (rule.regex.test(combinedInput)) {
      return { blocked: true, category: rule.category, matchedRule: rule.rule };
    }
  }

  void method;
  return { blocked: false, category: 'None' };
}

export interface LogFilterOptions {
  search?: string;
  country?: string;
  state?: string;
  area?: string;
  severity?: VisitorLogSeverity | 'all';
  eventType?: VisitorLogEventType | 'all';
  dateRange?: 'today' | '7d' | '30d' | 'all';
}

export function filterVisitorLogs(
  logs: VisitorLogEntry[],
  filters: LogFilterOptions,
  todayDate = new Date().toISOString().slice(0, 10),
): VisitorLogEntry[] {
  const q = (filters.search || '').trim().toLowerCase();
  const country = (filters.country || 'All').trim();
  const state = (filters.state || 'All').trim();
  const area = (filters.area || 'All').trim();
  const severity = filters.severity || 'all';
  const eventType = filters.eventType || 'all';
  const dateRange = filters.dateRange || 'all';

  let cutoffDate = '';
  if (dateRange === 'today') {
    cutoffDate = todayDate;
  } else if (dateRange === '7d' || dateRange === '30d') {
    const days = dateRange === '7d' ? 7 : 30;
    const dt = new Date(`${todayDate}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - days);
    cutoffDate = dt.toISOString().slice(0, 10);
  }

  return logs.filter((entry) => {
    if (cutoffDate && entry.timestamp.slice(0, 10) < cutoffDate) return false;
    if (country !== 'All' && entry.country !== country) return false;
    if (state !== 'All' && entry.state !== state) return false;
    if (area !== 'All' && entry.area !== area) return false;
    if (severity !== 'all' && entry.severity !== severity) return false;
    if (eventType !== 'all' && entry.eventType !== eventType) return false;
    if (q) {
      const hay = `${entry.ipAddress} ${entry.country} ${entry.state} ${entry.area} ${entry.path} ${entry.browser} ${entry.os} ${entry.threatCategory || ''} ${entry.actorEmail || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export interface GeoBucket {
  name: string;
  subLabel?: string;
  hits: number;
  sharePct: number;
  blockedHits: number;
}

export interface LogAnalyticsSummary {
  totalHits: number;
  uniqueIps: number;
  todayHits: number;
  avgLatencyMs: number;
  blockedCount: number;
  failedLoginCount: number;
  warningCount: number;
  byCountry: GeoBucket[];
  byState: GeoBucket[];
  byArea: GeoBucket[];
  byPath: { path: string; hits: number }[];
  byDevice: { deviceType: string; hits: number }[];
  byBrowser: { browser: string; hits: number }[];
  byStatus: { statusCode: number; hits: number }[];
}

export function aggregateVisitorLogs(
  logs: VisitorLogEntry[],
  todayDate = new Date().toISOString().slice(0, 10),
): LogAnalyticsSummary {
  const totalHits = logs.length;
  const uniqueIpSet = new Set<string>();
  let todayHits = 0;
  let latencySum = 0;
  let blockedCount = 0;
  let failedLoginCount = 0;
  let warningCount = 0;

  const countryMap = new Map<string, { subLabel: string; hits: number; blockedHits: number }>();
  const stateMap = new Map<string, { subLabel: string; hits: number; blockedHits: number }>();
  const areaMap = new Map<string, { subLabel: string; hits: number; blockedHits: number }>();
  const pathMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const browserMap = new Map<string, number>();
  const statusMap = new Map<number, number>();

  for (const log of logs) {
    uniqueIpSet.add(log.ipAddress);
    if (log.timestamp.startsWith(todayDate)) todayHits++;
    latencySum += Number(log.responseTimeMs || 0);
    const isBlocked = log.eventType === 'security_block' || log.eventType === 'rate_limit' || log.statusCode === 403;
    if (isBlocked) blockedCount++;
    if (log.eventType === 'failed_login') failedLoginCount++;
    if (log.severity === 'warning' || log.severity === 'critical') warningCount++;

    const cKey = log.country || 'Unknown';
    const cEntry = countryMap.get(cKey) || { subLabel: log.countryCode || '', hits: 0, blockedHits: 0 };
    cEntry.hits++;
    if (isBlocked) cEntry.blockedHits++;
    countryMap.set(cKey, cEntry);

    const sKey = log.state || 'Unknown';
    const sEntry = stateMap.get(sKey) || { subLabel: cKey, hits: 0, blockedHits: 0 };
    sEntry.hits++;
    if (isBlocked) sEntry.blockedHits++;
    stateMap.set(sKey, sEntry);

    const aKey = log.area || 'Unknown';
    const aEntry = areaMap.get(aKey) || { subLabel: `${sKey}, ${cKey}`, hits: 0, blockedHits: 0 };
    aEntry.hits++;
    if (isBlocked) aEntry.blockedHits++;
    areaMap.set(aKey, aEntry);

    pathMap.set(log.path, (pathMap.get(log.path) || 0) + 1);
    deviceMap.set(log.deviceType, (deviceMap.get(log.deviceType) || 0) + 1);
    browserMap.set(log.browser, (browserMap.get(log.browser) || 0) + 1);
    statusMap.set(log.statusCode, (statusMap.get(log.statusCode) || 0) + 1);
  }

  const toBuckets = (map: Map<string, { subLabel: string; hits: number; blockedHits: number }>): GeoBucket[] =>
    Array.from(map.entries())
      .map(([name, info]) => ({
        name,
        subLabel: info.subLabel,
        hits: info.hits,
        sharePct: totalHits > 0 ? Number(((info.hits / totalHits) * 100).toFixed(1)) : 0,
        blockedHits: info.blockedHits,
      }))
      .sort((a, b) => b.hits - a.hits);

  return {
    totalHits,
    uniqueIps: uniqueIpSet.size,
    todayHits,
    avgLatencyMs: totalHits > 0 ? Math.round(latencySum / totalHits) : 0,
    blockedCount,
    failedLoginCount,
    warningCount,
    byCountry: toBuckets(countryMap),
    byState: toBuckets(stateMap),
    byArea: toBuckets(areaMap),
    byPath: Array.from(pathMap.entries())
      .map(([path, hits]) => ({ path, hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 15),
    byDevice: Array.from(deviceMap.entries())
      .map(([deviceType, hits]) => ({ deviceType, hits }))
      .sort((a, b) => b.hits - a.hits),
    byBrowser: Array.from(browserMap.entries())
      .map(([browser, hits]) => ({ browser, hits }))
      .sort((a, b) => b.hits - a.hits),
    byStatus: Array.from(statusMap.entries())
      .map(([statusCode, hits]) => ({ statusCode, hits }))
      .sort((a, b) => b.hits - a.hits),
  };
}

function csvCell(val: string | number | undefined): string {
  const s = String(val ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function formatVisitorLogsCsv(logs: VisitorLogEntry[], maskIps = false): string {
  const mask = (ip: string): string => {
    if (!maskIps) return ip;
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.xxx` : ip;
  };
  const header = [
    'ID',
    'Timestamp (UTC)',
    'IP Address',
    'Country',
    'Country Code',
    'State / Region',
    'Area / City',
    'Method',
    'Path',
    'HTTP Status',
    'Latency (ms)',
    'Severity',
    'Event Type',
    'Threat Category',
    'Device',
    'Browser',
    'OS',
    'Referrer',
    'Actor Email',
  ].join(',');

  const lines = logs.map((l) =>
    [
      l.id,
      l.timestamp,
      mask(l.ipAddress),
      l.country,
      l.countryCode,
      l.state,
      l.area,
      l.method,
      l.path,
      l.statusCode,
      l.responseTimeMs,
      l.severity,
      l.eventType,
      l.threatCategory || 'None',
      l.deviceType,
      l.browser,
      l.os,
      l.referrer,
      l.actorEmail || '',
    ]
      .map(csvCell)
      .join(','),
  );
  return `${header}\n${lines.join('\n')}`;
}

export function formatVisitorLogsCombinedText(logs: VisitorLogEntry[]): string {
  return logs
    .map(
      (l) =>
        `${l.ipAddress} - "${l.country}/${l.state}/${l.area}" [${l.timestamp}] "${l.method} ${l.path} HTTP/1.1" ${l.statusCode} ${l.responseTimeMs}ms "${l.referrer}" "${l.userAgent}" [${l.severity.toUpperCase()}:${l.eventType}${l.threatCategory ? `:${l.threatCategory}` : ''}]`,
    )
    .join('\n');
}

export interface ResolvedSeoMeta {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogType: string;
  ogImageUrl: string;
  robots: string;
  jsonLd: Record<string, unknown> | null;
}

export function resolveRouteSeo(
  pathname: string,
  origin: string,
  settings: SiteSettings,
  seo: SeoSettings,
  categories: CmsCategory[],
  pages: CmsPage[],
  departments: Department[],
  conferences: Conference[],
): ResolvedSeoMeta {
  const cleanPath = pathname.split('?')[0] || '/';
  const baseOrigin = (seo.canonicalBaseUrl || origin || 'https://coe.sveri.ac.in').replace(/\/+$/, '');
  const canonicalUrl = `${baseOrigin}${cleanPath === '/' ? '' : cleanPath}`;
  const customShort = (settings.shortCode || '').trim();
  const customName = (settings.institutionName || '').trim();
  const brandShort = customShort || customName || 'Campus';
  const applyBrandDefaults = (val: string): string => {
    let out = val;
    if (customName && customName !== DEFAULT_SEO_SETTINGS.defaultTitle) {
      out = out
        .replace(/SVERI's College of Engineering, Pandharpur \(Autonomous\)/g, customName)
        .replace(/SVERI's College of Engineering, Pandharpur/g, customName);
    }
    if (customShort && customShort !== 'SVCOER') {
      out = out.replace(/\bSVCOER\b/g, customShort);
    }
    return out;
  };

  const suffix =
    seo.titleSuffix && seo.titleSuffix !== DEFAULT_SEO_SETTINGS.titleSuffix
      ? applyBrandDefaults(seo.titleSuffix)
      : customShort && customShort !== 'SVCOER'
        ? `${customShort} — ${customName || customShort}`
        : seo.titleSuffix || brandShort;

  let title = applyBrandDefaults(
    seo.defaultTitle && seo.defaultTitle !== DEFAULT_SEO_SETTINGS.defaultTitle
      ? seo.defaultTitle
      : customName || DEFAULT_SEO_SETTINGS.defaultTitle,
  );
  let description = applyBrandDefaults(seo.defaultDescription || '');
  let keywords = applyBrandDefaults(seo.defaultKeywords || '');
  let ogImageUrl = seo.ogImageUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg';
  let noIndex = !seo.allowIndexing || cleanPath.startsWith('/admin');

  const override = (seo.pageOverrides || []).find(
    (ov) => ov.routePattern === cleanPath || (ov.routePattern !== '/' && cleanPath.startsWith(ov.routePattern)),
  );
  if (cleanPath.startsWith('/admin')) {
    title = `${brandShort} Admin Portal | ${customName || brandShort}`;
    description = `Administrative CMS console for ${customName || brandShort}.`;
  } else if (override) {
    if (override.title) title = applyBrandDefaults(override.title);
    if (override.description) description = applyBrandDefaults(override.description);
    if (override.keywords) keywords = applyBrandDefaults(override.keywords);
    if (override.ogImageUrl) ogImageUrl = override.ogImageUrl;
    if (override.noIndex) noIndex = true;
  } else if (cleanPath.startsWith('/page/')) {
    const slug = cleanPath.replace('/page/', '').split('/')[0];
    const pg = pages.find((p) => p.slug === slug);
    if (pg) {
      title = `${pg.title} | ${suffix}`;
      description = pg.subtitle || `${pg.title} — Official information and statutory disclosure at ${customName || brandShort}.`;
    }
  } else if (cleanPath.startsWith('/category/')) {
    const slug = cleanPath.replace('/category/', '').split('/')[0];
    const cat = categories.find((c) => c.slug === slug);
    if (cat) {
      title = `${cat.name} | ${suffix}`;
      description = cat.description || description;
    }
  } else if (cleanPath.startsWith('/department/')) {
    const slug = cleanPath.replace('/department/', '').split('/')[0];
    const dept = departments.find((d) => d.slug === slug);
    if (dept) {
      title = `${dept.name} (${dept.shortName}) | ${suffix}`;
      description = dept.overview || description;
    }
  } else if (cleanPath.startsWith('/conference/')) {
    const slug = cleanPath.replace('/conference/', '').split('/')[0];
    const conf = conferences.find((c) => c.slug === slug);
    if (conf) {
      title = `${conf.shortName}: ${conf.title} | ${suffix}`;
      description = `${conf.scope} (${conf.startDate} to ${conf.endDate}) — ${conf.theme}`;
    }
  } else if (cleanPath === '/credits' || cleanPath === '/developer' || cleanPath === '/developers') {
    const cp = settings.creditsPage;
    title = `${cp?.pageTitle || 'Platform Creators, Developers & Contributors'} | ${suffix}`;
    description =
      cp?.pageSubtitle ||
      `Platform architecture, developers, faculty coordinators, and contributors behind ${customName || brandShort}.`;
    keywords = `${brandShort} Developers, Portal Creators, Contributors, Web Engineering Team, Open Source Attribution`;
  }

  const resolvedOgImage = /^https?:\/\//i.test(ogImageUrl)
    ? ogImageUrl
    : `${baseOrigin}${ogImageUrl.startsWith('/') ? ogImageUrl : `/${ogImageUrl}`}`;

  const jsonLd = seo.enableJsonLd
    ? {
        '@context': 'https://schema.org',
        '@type': seo.schemaOrgType || 'CollegeOrUniversity',
        name: settings.institutionName,
        alternateName: settings.shortCode,
        url: canonicalUrl,
        description,
        telephone: settings.phone,
        email: settings.email,
        address: {
          '@type': 'PostalAddress',
          streetAddress: settings.address,
          addressLocality: 'Pandharpur',
          addressRegion: 'Maharashtra',
          addressCountry: 'IN',
        },
      }
    : null;

  return {
    title,
    description: description.slice(0, 320),
    keywords,
    canonicalUrl,
    ogType: 'website',
    ogImageUrl: resolvedOgImage,
    robots: noIndex ? 'noindex, nofollow' : 'index, follow',
    jsonLd,
  };
}

export interface SeoAuditCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export function evaluateSeoAudit(settings: SiteSettings, seo: SeoSettings, pages: CmsPage[]): SeoAuditCheck[] {
  const titleLen = (seo.defaultTitle || '').trim().length;
  const descLen = (seo.defaultDescription || '').trim().length;
  const publishedPages = pages.filter((p) => p.isPublished);
  const overrideSet = new Set((seo.pageOverrides || []).map((o) => o.routePattern));
  const pagesWithSubtitle = publishedPages.filter((p) => (p.subtitle || '').trim().length >= 20 || overrideSet.has(`/page/${p.slug}`));

  return [
    {
      id: 'title-length',
      label: 'Homepage SEO Title Length (30–70 chars recommended)',
      passed: titleLen >= 30 && titleLen <= 75,
      detail: `Current length: ${titleLen} chars ("${(seo.defaultTitle || '').slice(0, 60)}")`,
    },
    {
      id: 'meta-desc',
      label: 'Meta Description Present (120–165 chars optimal)',
      passed: descLen >= 100 && descLen <= 200,
      detail: `Current length: ${descLen} chars`,
    },
    {
      id: 'canonical',
      label: 'Canonical Domain Configured',
      passed: /^https?:\/\/[^/]+/i.test(seo.canonicalBaseUrl || ''),
      detail: seo.canonicalBaseUrl || 'Not configured',
    },
    {
      id: 'og-image',
      label: 'OpenGraph & Twitter Social Card Image Set',
      passed: Boolean((seo.ogImageUrl || '').trim()),
      detail: seo.ogImageUrl || 'Missing OpenGraph preview image',
    },
    {
      id: 'json-ld',
      label: 'Schema.org Structured Data (CollegeOrUniversity JSON-LD)',
      passed: Boolean(seo.enableJsonLd),
      detail: seo.enableJsonLd ? `Active (@type: ${seo.schemaOrgType})` : 'Disabled',
    },
    {
      id: 'indexing',
      label: 'Search Engine Indexing (robots index,follow)',
      passed: Boolean(seo.allowIndexing),
      detail: seo.allowIndexing ? 'Public search engines allowed to index' : 'Blocked by noindex policy',
    },
    {
      id: 'page-coverage',
      label: 'Published Pages Meta Coverage',
      passed: publishedPages.length === 0 || pagesWithSubtitle.length >= Math.ceil(publishedPages.length * 0.7),
      detail: `${pagesWithSubtitle.length} of ${publishedPages.length} published pages have descriptive subtitles/overrides`,
    },
  ];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(baseUrl: string, db: CmsDatabase): string {
  const origin = baseUrl.replace(/\/+$/, '');
  const urls: Array<{ loc: string; priority: string; changefreq: string }> = [
    { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${origin}/facilities`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${origin}/sports`, priority: '0.85', changefreq: 'weekly' },
    { loc: `${origin}/placements`, priority: '0.9', changefreq: 'daily' },
    { loc: `${origin}/conferences`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${origin}/alumni`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${origin}/quick-links`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${origin}/gallery`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${origin}/grievance`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${origin}/feedback`, priority: '0.75', changefreq: 'weekly' },
    { loc: `${origin}/contact`, priority: '0.7', changefreq: 'monthly' },
    { loc: `${origin}/credits`, priority: '0.6', changefreq: 'monthly' },
  ];

  for (const cat of db.categories || []) {
    if (cat.menuLocation !== 'hidden') {
      urls.push({ loc: `${origin}/category/${cat.slug}`, priority: '0.8', changefreq: 'weekly' });
    }
  }
  for (const pg of db.pages || []) {
    if (pg.isPublished && (!pg.status || pg.status === 'published')) {
      urls.push({ loc: `${origin}/page/${pg.slug}`, priority: '0.8', changefreq: 'weekly' });
    }
  }
  for (const dept of db.departments || []) {
    if (!dept.status || dept.status === 'published') {
      urls.push({ loc: `${origin}/department/${dept.slug}`, priority: '0.85', changefreq: 'weekly' });
    }
  }
  for (const conf of db.conferences || []) {
    if (conf.isPublished && (!conf.status || conf.status === 'published')) {
      urls.push({ loc: `${origin}/conference/${conf.slug}`, priority: '0.85', changefreq: 'weekly' });
    }
  }

  const entries = urls
    .map(
      (u) =>
        `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export function buildRobotsTxt(baseUrl: string, seo: SeoSettings): string {
  const origin = (seo.canonicalBaseUrl || baseUrl || 'https://coe.sveri.ac.in').replace(/\/+$/, '');
  if ((seo.robotsTxtCustom || '').trim()) {
    return seo.robotsTxtCustom!.trim() + '\n';
  }
  if (!seo.allowIndexing) {
    return `User-agent: *\nDisallow: /\n`;
  }
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/admin/',
    'Disallow: /data/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}
