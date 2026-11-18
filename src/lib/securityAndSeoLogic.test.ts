import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SECURITY_CONFIG,
  DEFAULT_SEO_SETTINGS,
  aggregateVisitorLogs,
  buildRobotsTxt,
  buildSitemapXml,
  createSeedHitCounter,
  createSeedVisitorLogs,
  detectRequestThreat,
  evaluateSeoAudit,
  filterVisitorLogs,
  formatVisitorLogsCombinedText,
  formatVisitorLogsCsv,
  normalizeClientIp,
  parseUserAgentSummary,
  resolveRouteSeo,
  resolveVisitorGeo,
} from './securityAndSeoLogic';
import { CURRENT_SCHEMA_VERSION, migrateDatabaseInPlace } from './collegeFeaturesLogic';
import { createSeedDatabase } from '../data/seedDatabase';

test('normalizeClientIp unwraps IPv6 loopback and IPv4-mapped addresses', () => {
  assert.equal(normalizeClientIp('::1'), '127.0.0.1');
  assert.equal(normalizeClientIp('::ffff:103.21.124.18'), '103.21.124.18');
  assert.equal(normalizeClientIp('10.0.0.1', '49.36.90.44, 172.16.0.2'), '49.36.90.44');
});

test('resolveVisitorGeo honors proxy headers, resolves LAN, and classifies public prefixes', () => {
  const fromHeaders = resolveVisitorGeo(
    {
      'cf-ipcountry': 'us',
      'x-appengine-region': 'New York',
      'x-appengine-city': 'Manhattan',
    },
    '104.28.1.2',
  );
  assert.equal(fromHeaders.countryCode, 'US');
  assert.equal(fromHeaders.country, 'United States');
  assert.equal(fromHeaders.state, 'New York');
  assert.equal(fromHeaders.area, 'Manhattan');

  const lanGeo = resolveVisitorGeo({}, '192.168.10.22');
  assert.equal(lanGeo.country, 'India');
  assert.equal(lanGeo.state, 'Maharashtra');
  assert.ok(lanGeo.area.includes('Pandharpur'));

  const puneGeo = resolveVisitorGeo({}, '49.36.120.5');
  assert.equal(puneGeo.country, 'India');
  assert.equal(puneGeo.state, 'Maharashtra');
  assert.ok(puneGeo.area.includes('Pune'));
});

test('parseUserAgentSummary accurately distinguishes desktop, mobile, tablet, and scanners', () => {
  const desktop = parseUserAgentSummary('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0');
  assert.equal(desktop.deviceType, 'Desktop');
  assert.equal(desktop.browser, 'Chrome');
  assert.equal(desktop.os, 'Windows');

  const mobile = parseUserAgentSummary('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Safari/604.1');
  assert.equal(mobile.deviceType, 'Mobile');
  assert.equal(mobile.browser, 'Safari Mobile');
  assert.equal(mobile.os, 'iOS');

  const bot = parseUserAgentSummary('sqlmap/1.8.2');
  assert.equal(bot.deviceType, 'Bot');
  assert.equal(bot.browser, 'sqlmap');
});

test('detectRequestThreat blocks SQLi, XSS, path traversal, scanner probes, while skipping HTML body on trusted editor routes', () => {
  const sqli = detectRequestThreat('GET', "/api/public/search?q=' UNION SELECT password_hash FROM users--", '', 'Mozilla/5.0');
  assert.equal(sqli.blocked, true);
  assert.equal(sqli.category, 'SQL Injection Attempt');

  const traversal = detectRequestThreat('GET', '/page/..%2f..%2fetc/passwd', '', 'Mozilla/5.0');
  assert.equal(traversal.blocked, true);

  const probe = detectRequestThreat('GET', '/.env', '', 'Mozilla/5.0');
  assert.equal(probe.blocked, true);

  const scannerUa = detectRequestThreat('GET', '/', '', 'Nikto/2.1.6');
  assert.equal(scannerUa.blocked, true);

  const publicXss = detectRequestThreat('POST', '/api/public/grievance', '{"description":"<script>alert(1)</script>"}', 'Mozilla/5.0');
  assert.equal(publicXss.blocked, true);

  const adminHtmlBody = detectRequestThreat(
    'PUT',
    '/api/admin/pages/1',
    JSON.stringify({ contentHtml: '<div class="cms-card"><h3>Governing Body</h3><p onclick="open()">Bio</p></div>' }),
    'Mozilla/5.0',
    DEFAULT_SECURITY_CONFIG,
    true,
  );
  assert.equal(adminHtmlBody.blocked, false);

  const adminQueryXss = detectRequestThreat(
    'PUT',
    '/api/admin/pages/1?test=<script>alert(1)</script>',
    JSON.stringify({ contentHtml: '<p>Safe</p>' }),
    'Mozilla/5.0',
    DEFAULT_SECURITY_CONFIG,
    true,
  );
  assert.equal(adminQueryXss.blocked, true);
});

test('filterVisitorLogs, aggregateVisitorLogs, CSV, and Combined .log formats compute Country/State/Area stats', () => {
  const today = '2026-11-17';
  const logs = createSeedVisitorLogs(today);
  const summary = aggregateVisitorLogs(logs, today);

  assert.equal(summary.totalHits, logs.length);
  assert.equal(summary.blockedCount, 2);
  assert.ok(summary.byCountry.some((c) => c.name === 'India' && c.hits >= 5));
  assert.ok(summary.byState.some((s) => s.name === 'Maharashtra'));
  assert.ok(summary.byArea.some((a) => a.name.includes('Pandharpur')));

  const maharashtraOnly = filterVisitorLogs(logs, { state: 'Maharashtra' }, today);
  assert.ok(maharashtraOnly.length >= 4);
  assert.ok(maharashtraOnly.every((l) => l.state === 'Maharashtra'));

  const criticalOnly = filterVisitorLogs(logs, { severity: 'critical' }, today);
  assert.equal(criticalOnly.length, 2);

  const csvUnmasked = formatVisitorLogsCsv(logs, false);
  assert.ok(csvUnmasked.includes('103.21.124.18'));

  const csvMasked = formatVisitorLogsCsv(logs, true);
  assert.ok(csvMasked.includes('103.21.124.xxx'));
  assert.ok(!csvMasked.includes('103.21.124.18'));

  const logTxt = formatVisitorLogsCombinedText(logs);
  assert.ok(logTxt.includes('"GET / HTTP/1.1" 200'));
});

test('resolveRouteSeo, evaluateSeoAudit, buildSitemapXml, and buildRobotsTxt generate complete SEO metadata', () => {
  const seed = createSeedDatabase();
  const homeMeta = resolveRouteSeo(
    '/',
    'https://coe.sveri.ac.in',
    seed.settings,
    DEFAULT_SEO_SETTINGS,
    seed.categories,
    seed.pages,
    seed.departments,
    seed.conferences || [],
  );
  assert.ok(homeMeta.title.includes("SVERI's College of Engineering"));
  assert.equal(homeMeta.canonicalUrl, 'https://coe.sveri.ac.in');
  assert.equal(homeMeta.robots, 'index, follow');
  assert.equal(homeMeta.jsonLd?.['@type'], 'CollegeOrUniversity');

  const adminMeta = resolveRouteSeo(
    '/admin',
    'https://coe.sveri.ac.in',
    seed.settings,
    DEFAULT_SEO_SETTINGS,
    seed.categories,
    seed.pages,
    seed.departments,
    seed.conferences || [],
  );
  assert.equal(adminMeta.robots, 'noindex, nofollow');

  const audit = evaluateSeoAudit(seed.settings, DEFAULT_SEO_SETTINGS, seed.pages);
  assert.ok(audit.every((item) => item.passed));

  const sitemap = buildSitemapXml('https://coe.sveri.ac.in', seed);
  assert.ok(sitemap.includes('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(sitemap.includes('https://coe.sveri.ac.in/placements'));
  assert.ok(sitemap.includes('https://coe.sveri.ac.in/conference/icaest-2026'));

  const robots = buildRobotsTxt('https://coe.sveri.ac.in', DEFAULT_SEO_SETTINGS);
  assert.ok(robots.includes('Disallow: /admin'));
  assert.ok(robots.includes('Sitemap: https://coe.sveri.ac.in/sitemap.xml'));
});

test('migrateDatabaseInPlace preserves existing data while non-destructively backfilling v6 SEO and Log fields', () => {
  const seed = createSeedDatabase();
  const legacyDb: any = {
    ...seed,
    schemaVersion: 4,
    pages: seed.pages.slice(0, 2),
  };
  delete legacyDb.seo;
  delete legacyDb.hitCounter;
  delete legacyDb.visitorLogs;
  delete legacyDb.blockedIps;
  delete legacyDb.securityConfig;

  const { db, upgraded } = migrateDatabaseInPlace(legacyDb, seed);
  assert.equal(upgraded, true);
  assert.equal(db.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(db.pages.length, 2);
  assert.equal(db.seo!.defaultTitle, DEFAULT_SEO_SETTINGS.defaultTitle);
  assert.equal(db.hitCounter!.totalHits, createSeedHitCounter().totalHits);
  assert.ok(db.visitorLogs!.length >= 5);
  assert.equal(db.securityConfig!.wafEnabled, true);
});
