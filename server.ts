import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { createServer as createViteServer } from 'vite';
import { createSeedAlumniData, createSeedDatabase, hashPassword, verifyPassword } from './src/data/seedDatabase';
import {
  canUserAccessCategory,
  canUserAccessPage,
  canUserAccessResource,
  searchCmsContent,
  sortByOrder,
  validateExternalDocumentUrl,
  validateUploadMeta,
  type AdminResource,
} from './src/lib/cmsLogic';
import {
  applyBackupRestore,
  computeIncrementalDiff,
  computeNextRunIso,
  countDatabaseEntities,
  defaultBackupSchedule,
  extractSnapshotData,
  rewriteDomainUrlsInValue,
  validateBackupPackage,
  validateSafeRestoreAssetPath,
} from './src/lib/backupLogic';
import {
  clampUploadLimitMb,
  getUploadSizeLimitBytes,
  isImageFileMeta,
} from './src/lib/imageCrop';
import {
  filterAlumniDiscussions,
  stripAlumniCredentials,
  validateAlumniJobInput,
  validateAlumniRegistrationInput,
  validateDiscussionCommentInput,
  validateDiscussionPostInput,
} from './src/lib/alumniLogic';
import {
  createCaptchaChallenge,
  verifyCaptchaChallenge,
} from './src/lib/captchaLogic';
import {
  DEFAULT_GRIEVANCE_PORTAL_CONFIG,
  generateReferenceCode,
  isExternalPaperSubmissionActive,
  migrateDatabaseInPlace,
  validateAlumniPledgeInput,
  validateConferenceRegistrationInput,
  validateConferenceSubmissionInput,
  validateGrievanceInput,
} from './src/lib/collegeFeaturesLogic';
import { buildZipBuffer, parseZipBuffer, type ZipInputEntry } from './src/lib/zipArchive';
import type {
  AdminModuleKey,
  AlumniAchiever,
  AlumniApprovalStatus,
  AlumniData,
  AlumniDiscussionComment,
  AlumniDiscussionPost,
  AlumniDiscussionTopic,
  AlumniEndowmentPledge,
  AlumniEventChapter,
  AlumniJob,
  AlumniJobStatus,
  AlumniProfile,
  BackupDestination,
  BackupMode,
  BackupPackage,
  BackupRecord,
  BackupScheduleConfig,
  CmsCategory,
  CmsDatabase,
  CmsUser,
  Conference,
  ConferencePaperStatus,
  ConferenceRegistration,
  ConferenceSubmission,
  CustomHomeComponent,
  GrievanceStatus,
  GrievanceTicket,
  HomeComponentPlacement,
  PlacementStory,
  PlacementYearStat,
  ScpConfig,
  SiteMigrationManifest,
  UserRole,
} from './src/types/cms';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cms-db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(process.cwd()).digest('hex');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function loadDatabase(): CmsDatabase {
  const seed = createSeedDatabase();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as CmsDatabase;
      const isPreExamUpgrade = !parsed.settings?.homeSections;
      let needsSave = isPreExamUpgrade;

      let categories: CmsCategory[] = (parsed.categories || seed.categories).map((c) => ({
        ...c,
        shortLabel: c.shortLabel || c.name,
        showInMenu: c.showInMenu !== false,
        showOnHome: c.showOnHome !== false,
      }));
      const pages = parsed.pages || seed.pages;

      if (isPreExamUpgrade) {
        const examCat = seed.categories.find((c) => c.slug === 'examination');
        if (examCat && !categories.some((c) => c.slug === 'examination')) {
          categories.push({ ...examCat });
          categories = categories
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c, idx) => ({ ...c, sortOrder: idx + 1 }));
        }
        const existingSlugs = new Set(pages.map((p) => p.slug));
        for (const sp of seed.pages.filter((p) => p.categorySlug === 'examination')) {
          if (!existingSlugs.has(sp.slug)) {
            pages.push(sp);
          }
        }
      }

      const users = [...(parsed.users || seed.users)];
      const seedCoe = seed.users.find((u) => u.email === 'coe@coe.sveri.ac.in');
      if (seedCoe && !users.some((u) => u.email.toLowerCase() === seedCoe.email.toLowerCase())) {
        users.push(seedCoe);
        needsSave = true;
      }

      const customHomeComponents = parsed.settings?.customHomeComponents ?? seed.settings.customHomeComponents ?? [];
      if (!parsed.settings?.customHomeComponents) {
        needsSave = true;
      }

      const seedAlumni = createSeedAlumniData();
      const healAssetPath = (url: string | undefined, fallback: string): string => {
        if (!url) return fallback;
        if (url.includes('portrait_')) return '/src/assets/images/leadership_principal_1794512597061.jpg';
        if (url.includes('campus_convocation_ceremony_')) return '/src/assets/images/campus_convocation_1794512597749.jpg';
        if (url.includes('campus_students_library_')) return '/src/assets/images/hero_library_atrium_1794512596890.jpg';
        return url;
      };
      const defaultSeedAlumniPw = hashPassword('Alumni@123');
      const alumni: AlumniData = parsed.alumni
        ? {
            settings: {
              ...seedAlumni.settings,
              ...(parsed.alumni.settings || {}),
              enableDiscussions: parsed.alumni.settings?.enableDiscussions !== false,
              requireDiscussionApproval: Boolean(parsed.alumni.settings?.requireDiscussionApproval ?? false),
            },
            profiles: Array.isArray(parsed.alumni.profiles)
              ? parsed.alumni.profiles.map((p) => ({
                  ...p,
                  passwordHash: p.passwordHash || defaultSeedAlumniPw,
                  photoUrl: healAssetPath(p.photoUrl, '/src/assets/images/leadership_principal_1794512597061.jpg'),
                }))
              : seedAlumni.profiles,
            jobs: Array.isArray(parsed.alumni.jobs) ? parsed.alumni.jobs : seedAlumni.jobs,
            events: Array.isArray(parsed.alumni.events)
              ? parsed.alumni.events.map((ev) => ({
                  ...ev,
                  bannerUrl: healAssetPath(ev.bannerUrl, '/src/assets/images/campus_convocation_1794512597749.jpg'),
                }))
              : seedAlumni.events,
            discussionTopics: Array.isArray(parsed.alumni.discussionTopics)
              ? parsed.alumni.discussionTopics
              : seedAlumni.discussionTopics,
            discussions: Array.isArray(parsed.alumni.discussions)
              ? parsed.alumni.discussions
              : seedAlumni.discussions,
          }
        : seedAlumni;
      if (!parsed.alumni || JSON.stringify(alumni) !== JSON.stringify(parsed.alumni)) {
        needsSave = true;
      }

      const migrated = migrateDatabaseInPlace(
        {
          ...parsed,
          categories,
          pages,
          users,
          alumni,
          backups: Array.isArray(parsed.backups) ? parsed.backups : [],
          backupSchedule: {
            ...defaultBackupSchedule(),
            ...(parsed.backupSchedule || {}),
            scpConfig: {
              ...defaultBackupSchedule().scpConfig!,
              ...(parsed.backupSchedule?.scpConfig || {}),
            },
          },
          settings: {
            ...seed.settings,
            ...(parsed.settings || {}),
            homeSections: {
              ...seed.settings.homeSections!,
              ...(parsed.settings?.homeSections || {}),
            },
            customHomeComponents,
          },
        },
        seed,
      );
      if (needsSave || migrated.upgraded) {
        fs.writeFileSync(DB_FILE, JSON.stringify(migrated.db, null, 2), 'utf-8');
      }
      return migrated.db;
    } catch {
      // Fallback to fresh seed if file is corrupted
    }
  }
  const initialSeed: CmsDatabase = {
    ...seed,
    backups: [],
    backupSchedule: defaultBackupSchedule(),
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialSeed, null, 2), 'utf-8');
  return initialSeed;
}

let db: CmsDatabase = loadDatabase();

function saveDatabase() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function addAudit(actor: CmsUser, action: string, entityType: string, entityTitle: string) {
  const nextId = Math.max(0, ...db.auditLogs.map((entry) => entry.id)) + 1;
  db.auditLogs.unshift({
    id: nextId,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    entityType,
    entityTitle,
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
  });
  db.auditLogs = db.auditLogs.slice(0, 200);
}

interface SessionPayload {
  userId: number;
  csrfToken: string;
  exp: number;
}

function signSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifySession(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as SessionPayload;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function extractSessionToken(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies.svcoer_session;
}

function buildSessionCookie(req: express.Request, value: string, maxAgeSeconds: number): string {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const isHttps = req.secure || proto === 'https';
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';
  return `svcoer_session=${encodeURIComponent(value)}; Path=/; HttpOnly; ${sameSite}; Max-Age=${maxAgeSeconds}`;
}

function sanitizeUser(u: CmsDatabase['users'][number]): CmsUser {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

interface AlumniSessionPayload {
  alumniId: number;
  csrfToken: string;
  exp: number;
  kind: 'alumni';
}

function signAlumniSession(payload: AlumniSessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyAlumniSession(token: string | undefined): AlumniSessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as AlumniSessionPayload;
    if (parsed.kind !== 'alumni' || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractAlumniToken(req: express.Request): string | undefined {
  const hdr = req.headers['x-alumni-token'];
  if (typeof hdr === 'string' && hdr.trim()) {
    return hdr.trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies.svcoer_alumni_session;
}

function buildAlumniCookie(req: express.Request, value: string, maxAgeSeconds: number): string {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const isHttps = req.secure || proto === 'https';
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';
  return `svcoer_alumni_session=${encodeURIComponent(value)}; Path=/; HttpOnly; ${sameSite}; Max-Age=${maxAgeSeconds}`;
}

function sanitizeAlumniProfile(profile: AlumniProfile): Omit<AlumniProfile, 'passwordHash'> {
  const { passwordHash: _omit, ...rest } = profile;
  return rest;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '150mb' }));

  // Serve uploaded safe assets statically
  app.use('/uploads', express.static(UPLOAD_DIR));

  function ensureAlumniState(): AlumniData {
    if (!db.alumni) {
      db.alumni = createSeedAlumniData();
    }
    if (!Array.isArray(db.alumni.discussionTopics)) {
      db.alumni.discussionTopics = createSeedAlumniData().discussionTopics ?? [];
    }
    if (!Array.isArray(db.alumni.discussions)) {
      db.alumni.discussions = createSeedAlumniData().discussions ?? [];
    }
    return db.alumni;
  }

  // Server-generated single-use SVG CAPTCHA challenge
  app.get('/api/captcha', (_req, res) => {
    res.json(createCaptchaChallenge());
  });

  // Public bootstrap endpoint (unrestricted access per UGC Rule 4; strips credentials & private member discussions)
  app.get('/api/public/bootstrap', (_req, res) => {
    const alumniState = ensureAlumniState();
    res.json({
      categories: sortByOrder(db.categories),
      pages: sortByOrder(db.pages.filter((p) => p.isPublished)),
      leadership: sortByOrder(db.leadership),
      departments: db.departments.map((d) => ({
        ...d,
        subPages: sortByOrder(d.subPages.filter((sp) => sp.isPublished)),
        faculty: sortByOrder(d.faculty),
        labs: sortByOrder(d.labs),
      })),
      sliders: sortByOrder(db.sliders.filter((s) => s.isActive)),
      ticker: sortByOrder(db.ticker.filter((t) => t.isActive)),
      events: sortByOrder(db.events),
      documents: sortByOrder(db.documents),
      gallery: sortByOrder(db.gallery),
      telephoneDirectory: sortByOrder(db.telephoneDirectory),
      alumni: {
        settings: alumniState.settings,
        profiles: stripAlumniCredentials(sortByOrder(alumniState.profiles.filter((p) => p.status === 'approved'))),
        jobs: sortByOrder(alumniState.jobs.filter((j) => j.status === 'open')),
        events: sortByOrder(alumniState.events.filter((e) => e.isActive)),
        achievers: sortByOrder(alumniState.achievers ?? []),
      },
      conferences: sortByOrder((db.conferences ?? []).filter((c) => c.isPublished)),
      placements: db.placements ?? createSeedDatabase().placements,
      settings: db.settings,
    });
  });

  // Public Conferences: Paper Submission & Registration (CAPTCHA protected)
  app.post('/api/public/conferences/upload-manuscript', (req, res) => {
    const { filename, mimeType, base64Data } = req.body as {
      filename?: string;
      mimeType?: string;
      base64Data?: string;
    };
    if (!filename || !mimeType || !base64Data) {
      res.status(400).json({ error: 'Missing manuscript filename, MIME type, or file data.' });
      return;
    }
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const maxBytes = getUploadSizeLimitBytes(db.settings, 'document');
    const check = validateUploadMeta(filename, mimeType, buffer.length, maxBytes);
    if (!check.valid || !check.safeFilename) {
      res.status(400).json({ error: check.reason || 'Manuscript upload rejected.' });
      return;
    }
    const safeName = `conf-paper-${check.safeFilename}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);
    res.json({ url: `/uploads/${safeName}`, filename: safeName, sizeBytes: buffer.length });
  });

  app.post('/api/public/conferences/submit-paper', (req, res) => {
    const body = req.body as Partial<ConferenceSubmission> & {
      captchaId?: string;
      captchaAnswer?: string;
    };
    const captchaCheck = verifyCaptchaChallenge(body.captchaId, body.captchaAnswer);
    if (!captchaCheck.valid) {
      res.status(400).json({ error: captchaCheck.reason || 'Invalid CAPTCHA verification.' });
      return;
    }
    const validation = validateConferenceSubmissionInput(body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.reason });
      return;
    }
    const conf = (db.conferences ?? []).find((c) => c.id === Number(body.conferenceId) && c.isPublished);
    if (!conf) {
      res.status(404).json({ error: 'Target conference not found or closed.' });
      return;
    }
    if (conf.submissionMode === 'closed') {
      res.status(403).json({ error: 'Paper submissions are closed for this conference.' });
      return;
    }
    if (isExternalPaperSubmissionActive(conf)) {
      res.status(403).json({
        error: `Local paper submission is disabled for ${conf.shortName}. Submissions are accepted exclusively via ${conf.externalSubmissionLabel || 'the external submission portal'} (${conf.externalSubmissionUrl}).`,
      });
      return;
    }
    if (body.manuscriptUrl && body.manuscriptUrl.trim()) {
      const uCheck = validateExternalDocumentUrl(body.manuscriptUrl);
      if (!uCheck.valid) {
        res.status(400).json({ error: uCheck.reason || 'Invalid manuscript URL.' });
        return;
      }
    }
    db.conferenceSubmissions = db.conferenceSubmissions ?? [];
    const nextId = Math.max(0, ...db.conferenceSubmissions.map((s) => s.id)) + 1;
    const trackingCode = generateReferenceCode('CONF', nextId);
    const submission: ConferenceSubmission = {
      id: nextId,
      conferenceId: conf.id,
      trackingCode,
      paperTitle: String(body.paperTitle).trim(),
      trackTitle: String(body.trackTitle).trim(),
      authorName: String(body.authorName).trim(),
      authorEmail: String(body.authorEmail).trim().toLowerCase(),
      authorPhone: String(body.authorPhone || '').trim(),
      affiliation: String(body.affiliation).trim(),
      coAuthors: body.coAuthors ? String(body.coAuthors).trim() : '',
      abstractText: String(body.abstractText).trim(),
      manuscriptUrl: body.manuscriptUrl ? String(body.manuscriptUrl).trim() : undefined,
      status: 'submitted',
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    db.conferenceSubmissions.unshift(submission);
    saveDatabase();
    res.status(201).json({
      ok: true,
      trackingCode,
      submission,
      message: `Manuscript submitted successfully! Your tracking ID is ${trackingCode}.`,
    });
  });

  app.post('/api/public/conferences/register', (req, res) => {
    const body = req.body as Partial<ConferenceRegistration> & {
      captchaId?: string;
      captchaAnswer?: string;
    };
    const captchaCheck = verifyCaptchaChallenge(body.captchaId, body.captchaAnswer);
    if (!captchaCheck.valid) {
      res.status(400).json({ error: captchaCheck.reason || 'Invalid CAPTCHA verification.' });
      return;
    }
    const validation = validateConferenceRegistrationInput(body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.reason });
      return;
    }
    const conf = (db.conferences ?? []).find((c) => c.id === Number(body.conferenceId) && c.isPublished);
    if (!conf) {
      res.status(404).json({ error: 'Selected conference not found or registration closed.' });
      return;
    }
    db.conferenceRegistrations = db.conferenceRegistrations ?? [];
    const nextId = Math.max(0, ...db.conferenceRegistrations.map((r) => r.id)) + 1;
    const regCode = generateReferenceCode('REG', nextId);
    const reg: ConferenceRegistration = {
      id: nextId,
      conferenceId: conf.id,
      regCode,
      attendeeName: String(body.attendeeName).trim(),
      email: String(body.email).trim().toLowerCase(),
      phone: String(body.phone || '').trim(),
      affiliation: String(body.affiliation).trim(),
      designation: String(body.designation || 'Delegate').trim(),
      feeCategory: String(body.feeCategory).trim(),
      participationMode: String(body.participationMode || conf.mode).trim(),
      paperTrackingCode: body.paperTrackingCode ? String(body.paperTrackingCode).trim() : '',
      paymentRef: body.paymentRef ? String(body.paymentRef).trim() : '',
      status: 'registered',
      registeredAt: new Date().toISOString().slice(0, 10),
    };
    db.conferenceRegistrations.unshift(reg);
    saveDatabase();
    res.status(201).json({
      ok: true,
      regCode,
      registration: reg,
      message: `Conference registration confirmed! Your delegate ID is ${regCode}.`,
    });
  });

  // Public Grievance Redressal & Status Tracking
  app.get('/api/public/grievances/summary', (_req, res) => {
    const tickets = db.grievances ?? [];
    const total = tickets.length;
    const resolved = tickets.filter((g) => g.status === 'resolved').length;
    const closed = tickets.filter((g) => g.status === 'closed').length;
    const inReview = tickets.filter((g) => g.status === 'in_review').length;
    const submitted = tickets.filter((g) => g.status === 'submitted').length;
    res.json({
      total,
      submitted,
      underReview: inReview,
      inReview,
      resolved,
      closed,
      resolutionRatePct: total > 0 ? Math.round(((resolved + closed) / total) * 100) : 100,
    });
  });

  app.post('/api/public/grievances/upload-attachment', (req, res) => {
    const { filename, mimeType, base64Data } = req.body as {
      filename?: string;
      mimeType?: string;
      base64Data?: string;
    };
    if (!filename || !mimeType || !base64Data) {
      res.status(400).json({ error: 'Missing attachment filename, MIME type, or file data.' });
      return;
    }
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const maxBytes = getUploadSizeLimitBytes(db.settings, 'document');
    const check = validateUploadMeta(filename, mimeType, buffer.length, maxBytes);
    if (!check.valid || !check.safeFilename) {
      res.status(400).json({ error: check.reason || 'Evidence upload rejected.' });
      return;
    }
    const safeName = `grievance-${check.safeFilename}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);
    res.json({ url: `/uploads/${safeName}`, filename: safeName, sizeBytes: buffer.length });
  });

  app.get('/api/public/grievances/status', (req, res) => {
    const code = String(req.query.code || '').trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'Please enter a valid Ticket Code (e.g. GRV-2026-0001).' });
      return;
    }
    const ticket = (db.grievances ?? []).find((g) => g.ticketCode.toUpperCase() === code);
    if (!ticket) {
      res.status(404).json({ error: `No grievance ticket found matching "${code}".` });
      return;
    }
    res.json({
      ticketCode: ticket.ticketCode,
      category: ticket.category,
      urgency: ticket.urgency || 'Normal',
      isAnonymous: Boolean(ticket.isAnonymous),
      subject: ticket.subject,
      departmentOrCell: ticket.departmentOrCell,
      status: ticket.status,
      resolutionNote: ticket.resolutionNote || 'Under review by the Institutional Grievance Committee.',
      submittedAt: ticket.submittedAt,
      updatedAt: ticket.updatedAt,
    });
  });

  app.post('/api/public/grievances', (req, res) => {
    const body = req.body as Partial<GrievanceTicket> & {
      captchaId?: string;
      captchaAnswer?: string;
    };
    const captchaCheck = verifyCaptchaChallenge(body.captchaId, body.captchaAnswer);
    if (!captchaCheck.valid) {
      res.status(400).json({ error: captchaCheck.reason || 'Invalid CAPTCHA verification.' });
      return;
    }
    const isAnon = Boolean(body.isAnonymous);
    const effectiveName = isAnon && !(body.complainantName || '').trim()
      ? 'Confidential Whistleblower'
      : String(body.complainantName || '').trim();
    const validation = validateGrievanceInput({
      ...body,
      complainantName: effectiveName,
    });
    if (!validation.valid) {
      res.status(400).json({ error: validation.reason });
      return;
    }
    if (body.attachmentUrl && body.attachmentUrl.trim()) {
      const uCheck = validateExternalDocumentUrl(body.attachmentUrl);
      if (!uCheck.valid) {
        res.status(400).json({ error: uCheck.reason || 'Invalid attachment URL.' });
        return;
      }
    }
    db.grievances = db.grievances ?? [];
    const nextId = Math.max(0, ...db.grievances.map((g) => g.id)) + 1;
    const ticketCode = generateReferenceCode('GRV', nextId);
    const today = new Date().toISOString().slice(0, 10);
    const urgencyVal = body.urgency === 'High' || body.urgency === 'Urgent' ? body.urgency : 'Normal';
    const ticket: GrievanceTicket = {
      id: nextId,
      ticketCode,
      complainantName: isAnon ? 'Confidential (Protected Identity)' : effectiveName,
      complainantRole: String(body.complainantRole || 'Student (UG / PG / Ph.D.)').trim(),
      email: String(body.email).trim().toLowerCase(),
      phone: String(body.phone || '').trim(),
      departmentOrCell: String(body.departmentOrCell || 'General Administration').trim(),
      category: String(body.category).trim(),
      urgency: urgencyVal,
      isAnonymous: isAnon,
      subject: String(body.subject).trim(),
      description: String(body.description).trim(),
      attachmentUrl: body.attachmentUrl ? String(body.attachmentUrl).trim() : undefined,
      status: 'submitted',
      submittedAt: today,
      updatedAt: today,
    };
    db.grievances.unshift(ticket);
    saveDatabase();
    res.status(201).json({
      ok: true,
      ticketCode,
      message: `Grievance registered securely! Use tracking ID ${ticketCode} to check resolution status.`,
    });
  });

  // Public Alumni Endowment / Support Pledge
  app.post('/api/public/alumni/pledge', (req, res) => {
    const alumniState = ensureAlumniState();
    const body = req.body as Partial<AlumniEndowmentPledge> & {
      captchaId?: string;
      captchaAnswer?: string;
    };
    const captchaCheck = verifyCaptchaChallenge(body.captchaId, body.captchaAnswer);
    if (!captchaCheck.valid) {
      res.status(400).json({ error: captchaCheck.reason || 'Invalid CAPTCHA verification.' });
      return;
    }
    const validation = validateAlumniPledgeInput(body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.reason });
      return;
    }
    alumniState.pledges = alumniState.pledges ?? [];
    const nextId = Math.max(0, ...alumniState.pledges.map((p) => p.id)) + 1;
    const created: AlumniEndowmentPledge = {
      id: nextId,
      fullName: String(body.fullName).trim(),
      email: String(body.email).trim().toLowerCase(),
      phone: String(body.phone || '').trim(),
      batchYear: Number(body.batchYear || new Date().getFullYear()),
      departmentCode: String(body.departmentCode || 'All Branches').trim(),
      pledgeType: String(body.pledgeType).trim(),
      amountOrSupport: String(body.amountOrSupport).trim(),
      message: String(body.message || '').trim(),
      status: 'pending',
      submittedAt: new Date().toISOString().slice(0, 10),
    };
    alumniState.pledges.unshift(created);
    saveDatabase();
    res.status(201).json({
      ok: true,
      pledge: created,
      message: 'Thank you! Your alumni mentorship/endowment pledge has been recorded for coordinator follow-up.',
    });
  });

  // Public Alumni Network interactive endpoints
  app.post('/api/public/alumni/upload-photo', (req, res) => {
    const alumniState = ensureAlumniState();
    if (!alumniState.settings.allowSelfRegistration) {
      res.status(403).json({ error: 'Public alumni photo upload is disabled.' });
      return;
    }
    const { filename, mimeType, base64Data } = req.body as {
      filename?: string;
      mimeType?: string;
      base64Data?: string;
    };
    if (!filename || !mimeType || !base64Data) {
      res.status(400).json({ error: 'Missing filename, mimeType, or file data.' });
      return;
    }
    if (!isImageFileMeta(filename, mimeType)) {
      res.status(400).json({ error: 'Only JPEG, PNG, or WEBP photos are permitted.' });
      return;
    }
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');
    const maxBytes = getUploadSizeLimitBytes(db.settings, 'photo');
    const check = validateUploadMeta(filename, mimeType, buffer.length, maxBytes);
    if (!check.valid || !check.safeFilename) {
      res.status(400).json({ error: check.reason || 'Photo upload rejected.' });
      return;
    }
    const safeName = `alumni-${check.safeFilename}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);
    res.json({ url: `/uploads/${safeName}`, filename: safeName, sizeBytes: buffer.length });
  });

  app.post('/api/public/alumni/register', (req, res) => {
    const alumniState = ensureAlumniState();
    if (!alumniState.settings.allowSelfRegistration) {
      res.status(403).json({ error: 'Public alumni registration is currently closed by Administrator.' });
      return;
    }
    const body = req.body as Partial<AlumniProfile> & {
      password?: string;
      captchaId?: string;
      captchaAnswer?: string;
    };
    const captchaCheck = verifyCaptchaChallenge(body.captchaId, body.captchaAnswer);
    if (!captchaCheck.valid) {
      res.status(400).json({ error: captchaCheck.reason || 'Invalid CAPTCHA verification.' });
      return;
    }
    const validation = validateAlumniRegistrationInput({ ...body, requirePassword: true });
    if (!validation.valid) {
      res.status(400).json({ error: validation.reason });
      return;
    }
    const normalizedEmail = String(body.email).trim().toLowerCase();
    if (alumniState.profiles.some((p) => p.email.trim().toLowerCase() === normalizedEmail)) {
      res.status(409).json({ error: 'An alumni account with this email already exists. Please sign in instead.' });
      return;
    }
    if (body.photoUrl && body.photoUrl.trim()) {
      const pCheck = validateExternalDocumentUrl(body.photoUrl);
      if (!pCheck.valid) {
        res.status(400).json({ error: pCheck.reason || 'Invalid photo URL.' });
        return;
      }
    }
    if (body.linkedinUrl && body.linkedinUrl.trim()) {
      const lCheck = validateExternalDocumentUrl(body.linkedinUrl);
      if (!lCheck.valid) {
        res.status(400).json({ error: lCheck.reason || 'Invalid LinkedIn URL.' });
        return;
      }
    }
    const nextId = Math.max(0, ...alumniState.profiles.map((p) => p.id)) + 1;
    const nextSort = Math.max(0, ...alumniState.profiles.map((p) => p.sortOrder)) + 1;
    const matchedDept = db.departments.find((d) => d.code === body.departmentCode);
    const created: AlumniProfile = {
      id: nextId,
      fullName: String(body.fullName).trim(),
      email: normalizedEmail,
      passwordHash: hashPassword(String(body.password)),
      phone: body.phone ? String(body.phone).trim() : '',
      graduationYear: Number(body.graduationYear),
      departmentCode: String(body.departmentCode).trim(),
      departmentName: matchedDept ? matchedDept.name : String(body.departmentName || body.departmentCode).trim(),
      degree: String(body.degree || 'B.Tech').trim(),
      currentCompany: String(body.currentCompany).trim(),
      designation: String(body.designation).trim(),
      location: String(body.location || 'India').trim(),
      chapter: String(body.chapter || 'Pandharpur Home Chapter').trim(),
      linkedinUrl: body.linkedinUrl ? String(body.linkedinUrl).trim() : '',
      websiteUrl: body.websiteUrl ? String(body.websiteUrl).trim() : '',
      photoUrl: body.photoUrl ? String(body.photoUrl).trim() : '/src/assets/images/leadership_principal_1794512597061.jpg',
      bio: String(body.bio || '').trim(),
      mentorshipAreas: Array.isArray(body.mentorshipAreas) ? body.mentorshipAreas.map((s) => String(s).trim()).filter(Boolean) : [],
      openToMentorship: Boolean(body.openToMentorship),
      isFeatured: false,
      status: 'pending',
      sortOrder: nextSort,
      registeredAt: new Date().toISOString().slice(0, 10),
    };
    alumniState.profiles.push(created);
    saveDatabase();
    res.status(201).json({
      ok: true,
      message: 'Registration received! Once approved by the Administrator, sign in with your email and password to post jobs & join discussions.',
      profile: sanitizeAlumniProfile(created),
    });
  });

  // Unauthenticated direct job posting is disabled — Alumni must log in first
  app.post('/api/public/alumni/jobs', (_req, res) => {
    res.status(401).json({
      error: 'Alumni login is required to post jobs or referrals. Please sign in with your verified Alumni credentials.',
    });
  });

  app.post('/api/public/alumni/events/:id/rsvp', (req, res) => {
    const alumniState = ensureAlumniState();
    const id = Number(req.params.id);
    const ev = alumniState.events.find((e) => e.id === id);
    if (!ev) {
      res.status(404).json({ error: 'Alumni event not found.' });
      return;
    }
    ev.rsvpCount = Number(ev.rsvpCount || 0) + 1;
    saveDatabase();
    res.json({ ok: true, event: ev });
  });

  // Alumni Member Login, Authenticated Job Posting & Private Blogger Discussion Panel
  function authenticateAlumni(req: express.Request): {
    profile: AlumniProfile;
    csrfToken: string;
  } | null {
    const session = verifyAlumniSession(extractAlumniToken(req));
    if (!session) return null;
    const alumniState = ensureAlumniState();
    const prof = alumniState.profiles.find((p) => p.id === session.alumniId);
    if (!prof || prof.status !== 'approved') return null;
    if (req.method !== 'GET') {
      const csrfHeader = req.headers['x-csrf-token'];
      if (csrfHeader !== session.csrfToken) return null;
    }
    return { profile: prof, csrfToken: session.csrfToken };
  }

  app.post('/api/alumni/login', (req, res) => {
    const { email, password, captchaId, captchaAnswer } = req.body as {
      email?: string;
      password?: string;
      captchaId?: string;
      captchaAnswer?: string;
    };
    const captchaCheck = verifyCaptchaChallenge(captchaId, captchaAnswer);
    if (!captchaCheck.valid) {
      res.status(400).json({ error: captchaCheck.reason || 'Invalid CAPTCHA verification.' });
      return;
    }
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const alumniState = ensureAlumniState();
    const profile = alumniState.profiles.find(
      (p) => p.email.trim().toLowerCase() === email.trim().toLowerCase(),
    );
    if (!profile || !profile.passwordHash || !verifyPassword(password, profile.passwordHash)) {
      res.status(401).json({ error: 'Invalid alumni email or password.' });
      return;
    }
    if (profile.status !== 'approved') {
      res.status(403).json({
        error:
          profile.status === 'pending'
            ? 'Your alumni registration is awaiting Administrator approval.'
            : 'Your alumni account has been suspended or rejected by Administrator.',
      });
      return;
    }
    const csrfToken = crypto.randomBytes(20).toString('hex');
    const token = signAlumniSession({
      alumniId: profile.id,
      csrfToken,
      exp: Date.now() + 1000 * 60 * 60 * 12,
      kind: 'alumni',
    });
    res.setHeader('Set-Cookie', buildAlumniCookie(req, token, 43200));
    res.json({
      alumni: sanitizeAlumniProfile(profile),
      csrfToken,
      sessionToken: token,
    });
  });

  app.post('/api/alumni/logout', (req, res) => {
    res.setHeader('Set-Cookie', buildAlumniCookie(req, '', 0));
    res.json({ ok: true });
  });

  app.get('/api/alumni/me', (req, res) => {
    const session = verifyAlumniSession(extractAlumniToken(req));
    if (!session) {
      res.json({ authenticated: false, alumni: null, csrfToken: null });
      return;
    }
    const alumniState = ensureAlumniState();
    const prof = alumniState.profiles.find((p) => p.id === session.alumniId);
    if (!prof || prof.status !== 'approved') {
      res.json({ authenticated: false, alumni: null, csrfToken: null });
      return;
    }
    res.json({
      authenticated: true,
      alumni: sanitizeAlumniProfile(prof),
      csrfToken: session.csrfToken,
    });
  });

  app.post('/api/alumni/jobs', (req, res) => {
    const auth = authenticateAlumni(req);
    if (!auth) {
      res.status(401).json({ error: 'Approved alumni login is required to post jobs.' });
      return;
    }
    const alumniState = ensureAlumniState();
    if (!alumniState.settings.allowPublicJobPosting) {
      res.status(403).json({ error: 'Alumni job posting is currently disabled by Administrator.' });
      return;
    }
    const body = req.body as Partial<AlumniJob> & {
      captchaId?: string;
      captchaAnswer?: string;
    };
    const captchaCheck = verifyCaptchaChallenge(body.captchaId, body.captchaAnswer);
    if (!captchaCheck.valid) {
      res.status(400).json({ error: captchaCheck.reason || 'Invalid CAPTCHA verification.' });
      return;
    }
    const jobInput = {
      ...body,
      postedByAlumniName: auth.profile.fullName,
      postedByBatch: `${auth.profile.graduationYear} ${auth.profile.departmentCode}`,
    };
    const validation = validateAlumniJobInput(jobInput);
    if (!validation.valid) {
      res.status(400).json({ error: validation.reason });
      return;
    }
    const nextId = Math.max(0, ...alumniState.jobs.map((j) => j.id)) + 1;
    const nextSort = Math.max(0, ...alumniState.jobs.map((j) => j.sortOrder)) + 1;
    const created: AlumniJob = {
      id: nextId,
      title: String(body.title).trim(),
      company: String(body.company).trim(),
      location: String(body.location || 'India / Remote').trim(),
      jobType: (body.jobType || 'Full-Time') as AlumniJob['jobType'],
      departmentFocus: String(body.departmentFocus || 'All Branches').trim(),
      experienceRange: String(body.experienceRange || '0–2 Years').trim(),
      compensation: String(body.compensation || 'As per industry norms').trim(),
      description: String(body.description || '').trim(),
      applyUrlOrEmail: String(body.applyUrlOrEmail).trim(),
      postedByAlumniName: auth.profile.fullName,
      postedByBatch: `${auth.profile.graduationYear} ${auth.profile.departmentCode}`,
      deadlineDate: String(body.deadlineDate || '').trim(),
      status: 'pending',
      postedAt: new Date().toISOString().slice(0, 10),
      sortOrder: nextSort,
    };
    alumniState.jobs.push(created);
    saveDatabase();
    res.status(201).json({
      ok: true,
      message: 'Job opportunity submitted for administrator review and will appear on the board once approved.',
      job: created,
    });
  });

  app.get('/api/alumni/discussions', (req, res) => {
    const alumniAuth = authenticateAlumni(req);
    let isAdminAlumni = false;
    if (!alumniAuth) {
      const adminSession = verifySession(extractSessionToken(req));
      if (adminSession) {
        const userRec = db.users.find((u) => u.id === adminSession.userId);
        if (userRec && userRec.isActive && canUserAccessResource(sanitizeUser(userRec), 'alumni')) {
          isAdminAlumni = true;
        }
      }
    }
    if (!alumniAuth && !isAdminAlumni) {
      res.status(401).json({ error: 'Members-only area. Please sign in as a verified Alumni to view discussions.' });
      return;
    }
    const alumniState = ensureAlumniState();
    const topics = sortByOrder(alumniState.discussionTopics ?? []).filter(
      (t) => isAdminAlumni || t.isActive,
    );
    const topicIdParam = req.query.topicId ? Number(req.query.topicId) : undefined;
    const q = String(req.query.q || '');
    const allPosts = alumniState.discussions ?? [];
    const visiblePosts = isAdminAlumni
      ? filterAlumniDiscussions(allPosts, { topicId: topicIdParam, query: q, includeUnapproved: true })
      : filterAlumniDiscussions(
          allPosts.filter(
            (p) => p.status === 'approved' || (alumniAuth && p.authorAlumniId === alumniAuth.profile.id),
          ),
          { topicId: topicIdParam, query: q, includeUnapproved: true },
        );
    res.json({
      enableDiscussions: alumniState.settings.enableDiscussions !== false,
      requireDiscussionApproval: Boolean(alumniState.settings.requireDiscussionApproval),
      topics,
      posts: visiblePosts,
    });
  });

  app.post('/api/alumni/discussions', (req, res) => {
    const alumniAuth = authenticateAlumni(req);
    if (!alumniAuth) {
      res.status(401).json({ error: 'Please sign in as an approved Alumni member to start a discussion.' });
      return;
    }
    const alumniState = ensureAlumniState();
    if (alumniState.settings.enableDiscussions === false) {
      res.status(403).json({ error: 'Alumni discussion panel is currently disabled by Administrator.' });
      return;
    }
    const body = req.body as { topicId?: number; title?: string; content?: string };
    const check = validateDiscussionPostInput(body);
    if (!check.valid) {
      res.status(400).json({ error: check.reason });
      return;
    }
    const topic = (alumniState.discussionTopics ?? []).find(
      (t) => t.id === Number(body.topicId) && t.isActive,
    );
    if (!topic) {
      res.status(404).json({ error: 'Selected discussion topic is unavailable.' });
      return;
    }
    const posts = alumniState.discussions ?? [];
    const nextId = Math.max(0, ...posts.map((p) => p.id)) + 1;
    const created: AlumniDiscussionPost = {
      id: nextId,
      topicId: topic.id,
      title: String(body.title).trim(),
      content: String(body.content).trim(),
      authorAlumniId: alumniAuth.profile.id,
      authorName: alumniAuth.profile.fullName,
      authorBatch: `${alumniAuth.profile.graduationYear} ${alumniAuth.profile.departmentCode}`,
      authorDesignation: `${alumniAuth.profile.designation}, ${alumniAuth.profile.currentCompany}`,
      isPinned: false,
      status: alumniState.settings.requireDiscussionApproval ? 'pending' : 'approved',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      comments: [],
    };
    posts.unshift(created);
    alumniState.discussions = posts;
    saveDatabase();
    res.status(201).json({
      ok: true,
      post: created,
      message:
        created.status === 'pending'
          ? 'Discussion post submitted for administrator moderation.'
          : 'Discussion post published to the Alumni Forum.',
    });
  });

  app.post('/api/alumni/discussions/:id/comments', (req, res) => {
    const alumniAuth = authenticateAlumni(req);
    if (!alumniAuth) {
      res.status(401).json({ error: 'Please sign in as an approved Alumni member to reply.' });
      return;
    }
    const alumniState = ensureAlumniState();
    if (alumniState.settings.enableDiscussions === false) {
      res.status(403).json({ error: 'Alumni discussions are currently disabled by Administrator.' });
      return;
    }
    const post = (alumniState.discussions ?? []).find((p) => p.id === Number(req.params.id));
    if (!post || post.status !== 'approved') {
      res.status(404).json({ error: 'Discussion thread not found or awaiting approval.' });
      return;
    }
    const check = validateDiscussionCommentInput(req.body || {});
    if (!check.valid) {
      res.status(400).json({ error: check.reason });
      return;
    }
    const nextCommentId = Math.max(0, ...post.comments.map((c) => c.id)) + 1;
    const comment: AlumniDiscussionComment = {
      id: nextCommentId,
      postId: post.id,
      authorAlumniId: alumniAuth.profile.id,
      authorName: alumniAuth.profile.fullName,
      authorBatch: `${alumniAuth.profile.graduationYear} ${alumniAuth.profile.departmentCode}`,
      content: String(req.body.content).trim(),
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    post.comments.push(comment);
    saveDatabase();
    res.status(201).json({ ok: true, comment });
  });

  // Fast Global AJAX Search endpoint (UGC Rule 4)
  app.get('/api/search', (req, res) => {
    const q = String(req.query.q || '');
    const results = searchCmsContent(q, db);
    res.json({ query: q, results });
  });

  // Auth endpoints (with single-use CAPTCHA protection)
  app.post('/api/auth/login', (req, res) => {
    const { email, password, captchaId, captchaAnswer } = req.body as {
      email?: string;
      password?: string;
      captchaId?: string;
      captchaAnswer?: string;
    };
    const captchaCheck = verifyCaptchaChallenge(captchaId, captchaAnswer);
    if (!captchaCheck.valid) {
      res.status(400).json({ error: captchaCheck.reason || 'CAPTCHA verification failed.' });
      return;
    }
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid credentials or inactive account.' });
      return;
    }
    user.lastLoginAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const csrfToken = crypto.randomBytes(24).toString('hex');
    const token = signSession({
      userId: user.id,
      csrfToken,
      exp: Date.now() + 1000 * 60 * 60 * 12,
    });
    addAudit(sanitizeUser(user), 'LOGIN', 'Session', user.email);
    saveDatabase();

    res.setHeader('Set-Cookie', buildSessionCookie(req, token, 43200));
    res.json({ user: sanitizeUser(user), csrfToken, sessionToken: token });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', buildSessionCookie(req, '', 0));
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const session = verifySession(extractSessionToken(req));
    if (!session) {
      res.json({ authenticated: false, user: null, csrfToken: null });
      return;
    }
    const user = db.users.find((u) => u.id === session.userId);
    if (!user || !user.isActive) {
      res.json({ authenticated: false, user: null, csrfToken: null });
      return;
    }
    res.json({ authenticated: true, user: sanitizeUser(user), csrfToken: session.csrfToken });
  });

  // Auth + CSRF + RBAC middleware
  function requireAdmin(resource?: AdminResource, getDeptId?: (req: express.Request) => number | null) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const session = verifySession(extractSessionToken(req));
      if (!session) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      if (req.method !== 'GET') {
        const csrfHeader = req.headers['x-csrf-token'];
        if (csrfHeader !== session.csrfToken) {
          res.status(403).json({ error: 'Invalid CSRF token.' });
          return;
        }
      }
      const userRecord = db.users.find((u) => u.id === session.userId);
      if (!userRecord || !userRecord.isActive) {
        res.status(401).json({ error: 'Account inactive.' });
        return;
      }
      const user = sanitizeUser(userRecord);
      if (resource) {
        const targetDept = getDeptId ? getDeptId(req) : undefined;
        if (!canUserAccessResource(user, resource, targetDept)) {
          res.status(403).json({ error: 'Insufficient RBAC permissions for this module.' });
          return;
        }
      }
      (req as express.Request & { currentUser: CmsUser }).currentUser = user;
      next();
    };
  }

  // Admin overview data (all pages including unpublished, users, audit logs)
  app.get('/api/admin/state', requireAdmin(), (req, res) => {
    const currentUser = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    res.json({
      categories: sortByOrder(db.categories),
      pages: sortByOrder(db.pages),
      departments: db.departments.map((d) => ({
        ...d,
        subPages: sortByOrder(d.subPages),
        faculty: sortByOrder(d.faculty),
        labs: sortByOrder(d.labs),
      })),
      sliders: sortByOrder(db.sliders),
      ticker: sortByOrder(db.ticker),
      events: sortByOrder(db.events),
      documents: sortByOrder(db.documents),
      gallery: sortByOrder(db.gallery),
      leadership: sortByOrder(db.leadership),
      telephoneDirectory: sortByOrder(db.telephoneDirectory),
      alumni: {
        settings: alumniState.settings,
        profiles: stripAlumniCredentials(sortByOrder(alumniState.profiles)),
        jobs: sortByOrder(alumniState.jobs),
        events: sortByOrder(alumniState.events),
        discussionTopics: sortByOrder(alumniState.discussionTopics ?? []),
        discussions: alumniState.discussions ?? [],
        achievers: sortByOrder(alumniState.achievers ?? []),
        pledges: alumniState.pledges ?? [],
      },
      conferences: sortByOrder(db.conferences ?? []),
      conferenceSubmissions: db.conferenceSubmissions ?? [],
      conferenceRegistrations: db.conferenceRegistrations ?? [],
      placements: db.placements ?? createSeedDatabase().placements,
      grievances: db.grievances ?? [],
      settings: db.settings,
      users: canUserAccessResource(currentUser, 'users') ? db.users.map(sanitizeUser) : [],
      auditLogs: canUserAccessResource(currentUser, 'audit_logs') ? db.auditLogs : [],
    });
  });

  function applyReorderIds<T extends { id: number; sortOrder?: number }>(list: T[], orderedIds: number[]): T[] {
    const pos = new Map<number, number>();
    orderedIds.forEach((id, idx) => pos.set(Number(id), idx + 1));
    const maxPos = orderedIds.length + 1;
    const sorted = [...list].sort((a, b) => {
      const pa = pos.get(a.id) ?? (maxPos + (a.sortOrder ?? a.id));
      const pb = pos.get(b.id) ?? (maxPos + (b.sortOrder ?? b.id));
      return pa - pb;
    });
    sorted.forEach((item, idx) => {
      item.sortOrder = idx + 1;
    });
    return sorted;
  }

  // Categories & Navigation Builder CRUD
  app.post('/api/admin/categories', requireAdmin('categories'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const {
      name,
      shortLabel,
      slug,
      ugcCode,
      description,
      showInMenu,
      showOnHome,
      menuLocation,
      createDefaultPage,
    } = req.body as {
      name?: string;
      shortLabel?: string;
      slug?: string;
      ugcCode?: string;
      description?: string;
      showInMenu?: boolean;
      showOnHome?: boolean;
      menuLocation?: 'main' | 'more' | 'hidden';
      createDefaultPage?: boolean;
    };
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const rawSlug = slug && String(slug).trim() ? String(slug) : String(name);
    const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `section-${Date.now()}`;
    if (db.categories.some((c) => c.slug === cleanSlug)) {
      res.status(409).json({ error: `A category with slug "${cleanSlug}" already exists.` });
      return;
    }
    const nextId = Math.max(1, ...db.categories.map((c) => c.id)) + 1;
    const nextSort = Math.max(0, ...db.categories.map((c) => c.sortOrder)) + 1;
    const loc =
      menuLocation === 'main' || menuLocation === 'more' || menuLocation === 'hidden'
        ? menuLocation
        : showInMenu === false
          ? 'hidden'
          : 'more';
    const cat = {
      id: nextId,
      slug: cleanSlug,
      name: String(name).trim(),
      shortLabel: String(shortLabel || name).trim(),
      ugcCode: String(ugcCode || 'Autonomous Portal').trim(),
      description: String(description || `Official institutional section and micro-pages for ${String(name).trim()}.`).trim(),
      sortOrder: nextSort,
      showInMenu: loc !== 'hidden',
      showOnHome: showOnHome !== false,
      menuLocation: loc,
    };
    db.categories.push(cat);

    if (createDefaultPage !== false) {
      const pageSlug = `${cleanSlug}-overview`;
      if (!db.pages.some((p) => p.slug === pageSlug)) {
        const nextPageId = Math.max(100, ...db.pages.map((p) => p.id)) + 1;
        db.pages.push({
          id: nextPageId,
          categorySlug: cat.slug,
          slug: pageSlug,
          title: `${cat.name}: Overview`,
          subtitle: `${cat.ugcCode} · Official Information`,
          contentHtml: `<h2>${cat.name}</h2><p>${cat.description}</p><h3>Highlights &amp; Guidelines</h3><ul><li>Managed dynamically via Admin Dashboard &rarr; Pages &amp; UGC Content.</li><li>Add more micro-pages under the <strong>${cat.name}</strong> category to expand the left sidebar menu automatically.</li></ul>`,
          isPublished: true,
          sortOrder: 1,
          updatedAt: new Date().toISOString().slice(0, 10),
          updatedBy: actor.fullName,
        });
      }
    }

    addAudit(actor, 'CREATE_CATEGORY', 'Category', cat.name);
    saveDatabase();
    res.status(201).json(cat);
  });

  app.put('/api/admin/categories/reorder', requireAdmin('categories'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    orderedIds.forEach((id, idx) => {
      const cat = db.categories.find((c) => c.id === Number(id));
      if (cat) cat.sortOrder = idx + 1;
    });
    db.categories.sort((a, b) => a.sortOrder - b.sortOrder);
    addAudit(actor, 'REORDER_CATEGORIES', 'Category', 'Updated navigation sort order');
    saveDatabase();
    res.json(db.categories);
  });

  app.put('/api/admin/categories/:id', requireAdmin('categories'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const cat = db.categories.find((c) => c.id === Number(req.params.id));
    if (!cat) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    const { name, shortLabel, ugcCode, description, sortOrder, showInMenu, showOnHome, menuLocation } = req.body;
    if (name !== undefined) cat.name = String(name).trim();
    if (shortLabel !== undefined) cat.shortLabel = String(shortLabel).trim();
    if (ugcCode !== undefined) cat.ugcCode = String(ugcCode).trim();
    if (description !== undefined) cat.description = String(description).trim();
    if (sortOrder !== undefined) cat.sortOrder = Number(sortOrder);
    if (menuLocation === 'main' || menuLocation === 'more' || menuLocation === 'hidden') {
      cat.menuLocation = menuLocation;
      cat.showInMenu = menuLocation !== 'hidden';
    } else if (showInMenu !== undefined) {
      cat.showInMenu = Boolean(showInMenu);
      cat.menuLocation = Boolean(showInMenu)
        ? (cat.menuLocation === 'hidden' || !cat.menuLocation ? 'more' : cat.menuLocation)
        : 'hidden';
    }
    if (showOnHome !== undefined) cat.showOnHome = Boolean(showOnHome);
    db.categories.sort((a, b) => a.sortOrder - b.sortOrder);
    addAudit(actor, 'UPDATE_CATEGORY', 'Category', cat.name);
    saveDatabase();
    res.json(cat);
  });

  app.delete('/api/admin/categories/:id', requireAdmin('categories'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    if (db.categories.length <= 1) {
      res.status(400).json({ error: 'At least one navigation category must remain.' });
      return;
    }
    const idx = db.categories.findIndex((c) => c.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    const [removed] = db.categories.splice(idx, 1);
    db.pages = db.pages.filter((p) => p.categorySlug !== removed.slug);
    addAudit(actor, 'DELETE_CATEGORY', 'Category', removed.name);
    saveDatabase();
    res.json({ ok: true });
  });

  // Pages CRUD (enforces granular per-category & per-page RBAC)
  app.post('/api/admin/pages', requireAdmin('pages'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { categorySlug, slug, title, subtitle, contentHtml, attachedPdfUrl, attachedPdfLabel, isPublished } =
      req.body;
    if (!title || !slug || !categorySlug) {
      res.status(400).json({ error: 'Category, slug, and title are required.' });
      return;
    }
    if (!canUserAccessCategory(actor, String(categorySlug))) {
      res.status(403).json({
        error: `RBAC Restriction: Your account does not have permission to create pages inside "${categorySlug}".`,
      });
      return;
    }
    if (attachedPdfUrl && String(attachedPdfUrl).trim()) {
      const urlCheck = validateExternalDocumentUrl(String(attachedPdfUrl));
      if (!urlCheck.valid) {
        res.status(400).json({ error: urlCheck.reason || 'Invalid attached document URL.' });
        return;
      }
    }
    const cleanSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (db.pages.some((p) => p.slug === cleanSlug)) {
      res.status(409).json({ error: 'A page with this slug already exists.' });
      return;
    }
    const nextId = Math.max(100, ...db.pages.map((p) => p.id)) + 1;
    const created = {
      id: nextId,
      categorySlug,
      slug: cleanSlug,
      title: String(title),
      subtitle: String(subtitle || ''),
      contentHtml: String(contentHtml || '<p></p>'),
      attachedPdfUrl: attachedPdfUrl ? String(attachedPdfUrl).trim() : undefined,
      attachedPdfLabel: attachedPdfLabel ? String(attachedPdfLabel).trim() : undefined,
      isPublished: Boolean(isPublished ?? true),
      sortOrder: db.pages.filter((p) => p.categorySlug === categorySlug).length + 1,
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: actor.fullName,
    };
    db.pages.push(created);
    addAudit(actor, 'CREATE_PAGE', 'Page', created.title);
    saveDatabase();
    res.status(201).json(created);
  });

  app.put('/api/admin/pages/reorder', requireAdmin('pages'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    orderedIds.forEach((id, idx) => {
      const pg = db.pages.find((p) => p.id === Number(id));
      if (pg && canUserAccessPage(actor, pg)) {
        pg.sortOrder = idx + 1;
      }
    });
    db.pages = sortByOrder(db.pages);
    addAudit(actor, 'REORDER_PAGES', 'Page', 'Updated page display order');
    saveDatabase();
    res.json(db.pages);
  });

  app.put('/api/admin/pages/:id', requireAdmin('pages'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const id = Number(req.params.id);
    const page = db.pages.find((p) => p.id === id);
    if (!page) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }
    if (!canUserAccessPage(actor, page)) {
      res.status(403).json({ error: 'RBAC Restriction: You are not authorized to edit this page.' });
      return;
    }
    const { title, subtitle, contentHtml, categorySlug, isPublished, attachedPdfUrl, attachedPdfLabel, sortOrder } = req.body;
    if (categorySlug !== undefined && categorySlug !== page.categorySlug && !canUserAccessCategory(actor, String(categorySlug))) {
      res.status(403).json({
        error: `RBAC Restriction: Your account cannot move pages into "${categorySlug}".`,
      });
      return;
    }
    if (attachedPdfUrl && String(attachedPdfUrl).trim()) {
      const urlCheck = validateExternalDocumentUrl(String(attachedPdfUrl));
      if (!urlCheck.valid) {
        res.status(400).json({ error: urlCheck.reason || 'Invalid attached document URL.' });
        return;
      }
    }
    if (title !== undefined) page.title = String(title);
    if (subtitle !== undefined) page.subtitle = String(subtitle);
    if (contentHtml !== undefined) page.contentHtml = String(contentHtml);
    if (categorySlug !== undefined) page.categorySlug = categorySlug;
    if (isPublished !== undefined) page.isPublished = Boolean(isPublished);
    if (sortOrder !== undefined) page.sortOrder = Number(sortOrder);
    if (attachedPdfUrl !== undefined) page.attachedPdfUrl = String(attachedPdfUrl).trim() || undefined;
    if (attachedPdfLabel !== undefined) page.attachedPdfLabel = String(attachedPdfLabel).trim() || undefined;
    page.updatedAt = new Date().toISOString().slice(0, 10);
    page.updatedBy = actor.fullName;
    addAudit(actor, 'UPDATE_PAGE', 'Page', page.title);
    saveDatabase();
    res.json(page);
  });

  app.delete('/api/admin/pages/:id', requireAdmin('pages'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const id = Number(req.params.id);
    const idx = db.pages.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }
    if (!canUserAccessPage(actor, db.pages[idx])) {
      res.status(403).json({ error: 'RBAC Restriction: You are not authorized to delete this page.' });
      return;
    }
    const [removed] = db.pages.splice(idx, 1);
    addAudit(actor, 'DELETE_PAGE', 'Page', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  // Department microsite sub-pages, faculty & labs CRUD (enforces department_admin scoping!)
  app.post(
    '/api/admin/departments/:deptId/subpages',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const deptId = Number(req.params.deptId);
      const dept = db.departments.find((d) => d.id === deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
      const { title, slug, pageType, contentHtml, photos, items, isPublished } = req.body;
      if (!title || !slug) {
        res.status(400).json({ error: 'Title and slug are required.' });
        return;
      }
      const cleanSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const nextId = Math.max(100, ...dept.subPages.map((s) => s.id)) + 1;
      const subPage = {
        id: nextId,
        departmentId: deptId,
        slug: cleanSlug,
        title: String(title),
        pageType: pageType || 'general',
        contentHtml: String(contentHtml || '<p></p>'),
        photos: Array.isArray(photos) ? photos : [],
        items: Array.isArray(items) ? items : [],
        sortOrder: dept.subPages.length + 1,
        isPublished: Boolean(isPublished ?? true),
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      dept.subPages.push(subPage);
      addAudit(actor, 'CREATE_DEPT_SUBPAGE', dept.shortName, subPage.title);
      saveDatabase();
      res.status(201).json(subPage);
    },
  );

  app.put(
    '/api/admin/departments/:deptId/subpages/reorder',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const dept = db.departments.find((d) => d.id === Number(req.params.deptId));
      const { orderedIds } = req.body as { orderedIds?: number[] };
      if (!dept || !Array.isArray(orderedIds)) {
        res.status(400).json({ error: 'Department and orderedIds array are required.' });
        return;
      }
      dept.subPages = applyReorderIds(dept.subPages, orderedIds);
      addAudit(actor, 'REORDER_DEPT_SUBPAGES', dept.shortName, 'Updated micro-page menu order');
      saveDatabase();
      res.json(dept.subPages);
    },
  );

  app.put(
    '/api/admin/departments/:deptId/subpages/:subId',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const deptId = Number(req.params.deptId);
      const subId = Number(req.params.subId);
      const dept = db.departments.find((d) => d.id === deptId);
      const sub = dept?.subPages.find((s) => s.id === subId);
      if (!dept || !sub) {
        res.status(404).json({ error: 'Department sub-page not found.' });
        return;
      }
      if (req.body.title !== undefined) sub.title = String(req.body.title);
      if (req.body.slug !== undefined) {
        sub.slug = String(req.body.slug).toLowerCase().replace(/[^a-z0-9-]/g, '-');
      }
      if (req.body.pageType !== undefined) sub.pageType = req.body.pageType;
      if (req.body.contentHtml !== undefined) sub.contentHtml = String(req.body.contentHtml);
      if (Array.isArray(req.body.photos)) sub.photos = req.body.photos;
      if (Array.isArray(req.body.items)) sub.items = req.body.items;
      if (req.body.sortOrder !== undefined) sub.sortOrder = Number(req.body.sortOrder);
      if (req.body.isPublished !== undefined) sub.isPublished = Boolean(req.body.isPublished);
      sub.updatedAt = new Date().toISOString().slice(0, 10);
      addAudit(actor, 'UPDATE_DEPT_SUBPAGE', dept.shortName, sub.title);
      saveDatabase();
      res.json(sub);
    },
  );

  app.delete(
    '/api/admin/departments/:deptId/subpages/:subId',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const deptId = Number(req.params.deptId);
      const subId = Number(req.params.subId);
      const dept = db.departments.find((d) => d.id === deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
      const idx = dept.subPages.findIndex((s) => s.id === subId);
      if (idx === -1) {
        res.status(404).json({ error: 'Sub-page not found.' });
        return;
      }
      const [removed] = dept.subPages.splice(idx, 1);
      addAudit(actor, 'DELETE_DEPT_SUBPAGE', dept.shortName, removed.title);
      saveDatabase();
      res.json({ ok: true });
    },
  );

  app.post(
    '/api/admin/departments/:deptId/faculty',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const deptId = Number(req.params.deptId);
      const dept = db.departments.find((d) => d.id === deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
      const {
        name,
        designation,
        qualification,
        specialization,
        email,
        phone,
        experienceYears,
        photoUrl,
        externalProfileUrl,
        externalProfileLabel,
        customFields,
        isHod,
        sortOrder,
      } = req.body;
      if (!name || !designation) {
        res.status(400).json({ error: 'Faculty name and designation are required.' });
        return;
      }
      const nextId = Math.max(1000, ...dept.faculty.map((f) => f.id)) + 1;
      const maxOrder = Math.max(0, ...dept.faculty.map((f) => f.sortOrder ?? 0));
      const fac = {
        id: nextId,
        departmentId: deptId,
        name: String(name),
        designation: String(designation),
        qualification: String(qualification || 'M.Tech'),
        specialization: String(specialization || 'Engineering'),
        email: String(email || ''),
        phone: phone ? String(phone) : undefined,
        experienceYears: Number(experienceYears || 1),
        photoUrl: String(photoUrl || '/src/assets/images/leadership_principal_1794512597061.jpg'),
        externalProfileUrl: externalProfileUrl ? String(externalProfileUrl).trim() : undefined,
        externalProfileLabel: externalProfileLabel ? String(externalProfileLabel).trim() : undefined,
        customFields: Array.isArray(customFields) ? customFields : [],
        isHod: Boolean(isHod ?? false),
        sortOrder: sortOrder !== undefined && Number(sortOrder) > 0 ? Number(sortOrder) : maxOrder + 1,
      };
      dept.faculty.push(fac);
      dept.faculty = sortByOrder(dept.faculty);
      addAudit(actor, 'ADD_FACULTY', dept.shortName, fac.name);
      saveDatabase();
      res.status(201).json(fac);
    },
  );

  app.put(
    '/api/admin/departments/:deptId/faculty/reorder',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const dept = db.departments.find((d) => d.id === Number(req.params.deptId));
      const { orderedIds } = req.body as { orderedIds?: number[] };
      if (!dept || !Array.isArray(orderedIds)) {
        res.status(400).json({ error: 'Department and orderedIds array are required.' });
        return;
      }
      dept.faculty = applyReorderIds(dept.faculty, orderedIds);
      addAudit(actor, 'REORDER_FACULTY', dept.shortName, 'Updated faculty serial numbers');
      saveDatabase();
      res.json(dept.faculty);
    },
  );

  app.put(
    '/api/admin/departments/:deptId/faculty/:facultyId',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const dept = db.departments.find((d) => d.id === Number(req.params.deptId));
      const fac = dept?.faculty.find((f) => f.id === Number(req.params.facultyId));
      if (!dept || !fac) {
        res.status(404).json({ error: 'Faculty member not found.' });
        return;
      }
      if (req.body.name !== undefined) fac.name = String(req.body.name);
      if (req.body.designation !== undefined) fac.designation = String(req.body.designation);
      if (req.body.qualification !== undefined) fac.qualification = String(req.body.qualification);
      if (req.body.specialization !== undefined) fac.specialization = String(req.body.specialization);
      if (req.body.email !== undefined) fac.email = String(req.body.email);
      if (req.body.phone !== undefined) fac.phone = String(req.body.phone).trim() || undefined;
      if (req.body.experienceYears !== undefined) fac.experienceYears = Number(req.body.experienceYears);
      if (req.body.photoUrl !== undefined) fac.photoUrl = String(req.body.photoUrl);
      if (req.body.externalProfileUrl !== undefined) {
        fac.externalProfileUrl = String(req.body.externalProfileUrl).trim() || undefined;
      }
      if (req.body.externalProfileLabel !== undefined) {
        fac.externalProfileLabel = String(req.body.externalProfileLabel).trim() || undefined;
      }
      if (Array.isArray(req.body.customFields)) fac.customFields = req.body.customFields;
      if (req.body.isHod !== undefined) fac.isHod = Boolean(req.body.isHod);
      if (req.body.sortOrder !== undefined && Number(req.body.sortOrder) > 0) {
        fac.sortOrder = Number(req.body.sortOrder);
      }
      dept.faculty = sortByOrder(dept.faculty);
      addAudit(actor, 'UPDATE_FACULTY', dept.shortName, fac.name);
      saveDatabase();
      res.json(fac);
    },
  );

  app.delete(
    '/api/admin/departments/:deptId/faculty/:facultyId',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const dept = db.departments.find((d) => d.id === Number(req.params.deptId));
      if (!dept) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
      const idx = dept.faculty.findIndex((f) => f.id === Number(req.params.facultyId));
      if (idx === -1) {
        res.status(404).json({ error: 'Faculty not found.' });
        return;
      }
      const [removed] = dept.faculty.splice(idx, 1);
      addAudit(actor, 'DELETE_FACULTY', dept.shortName, removed.name);
      saveDatabase();
      res.json({ ok: true });
    },
  );

  // Department Labs CRUD
  app.post(
    '/api/admin/departments/:deptId/labs',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const deptId = Number(req.params.deptId);
      const dept = db.departments.find((d) => d.id === deptId);
      if (!dept) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
      const { name, areaSqFt, equipmentSummary, incharge, photoUrl, sortOrder } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Laboratory name is required.' });
        return;
      }
      const nextId = Math.max(2000, ...dept.labs.map((l) => l.id)) + 1;
      const maxOrder = Math.max(0, ...dept.labs.map((l) => l.sortOrder ?? 0));
      const lab = {
        id: nextId,
        departmentId: deptId,
        name: String(name),
        areaSqFt: Number(areaSqFt || 1200),
        equipmentSummary: String(equipmentSummary || ''),
        incharge: String(incharge || dept.hodName),
        photoUrl: photoUrl ? String(photoUrl) : undefined,
        sortOrder: sortOrder !== undefined ? Number(sortOrder) : maxOrder + 1,
      };
      dept.labs.push(lab);
      addAudit(actor, 'ADD_LAB', dept.shortName, lab.name);
      saveDatabase();
      res.status(201).json(lab);
    },
  );

  app.put(
    '/api/admin/departments/:deptId/labs/reorder',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const dept = db.departments.find((d) => d.id === Number(req.params.deptId));
      const { orderedIds } = req.body as { orderedIds?: number[] };
      if (!dept || !Array.isArray(orderedIds)) {
        res.status(400).json({ error: 'Department and orderedIds array are required.' });
        return;
      }
      dept.labs = applyReorderIds(dept.labs, orderedIds);
      addAudit(actor, 'REORDER_LABS', dept.shortName, 'Updated laboratory order');
      saveDatabase();
      res.json(dept.labs);
    },
  );

  app.put(
    '/api/admin/departments/:deptId/labs/:labId',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const dept = db.departments.find((d) => d.id === Number(req.params.deptId));
      const lab = dept?.labs.find((l) => l.id === Number(req.params.labId));
      if (!dept || !lab) {
        res.status(404).json({ error: 'Laboratory not found.' });
        return;
      }
      if (req.body.name !== undefined) lab.name = String(req.body.name);
      if (req.body.areaSqFt !== undefined) lab.areaSqFt = Number(req.body.areaSqFt);
      if (req.body.equipmentSummary !== undefined) lab.equipmentSummary = String(req.body.equipmentSummary);
      if (req.body.incharge !== undefined) lab.incharge = String(req.body.incharge);
      if (req.body.photoUrl !== undefined) lab.photoUrl = req.body.photoUrl ? String(req.body.photoUrl) : undefined;
      if (req.body.sortOrder !== undefined) lab.sortOrder = Number(req.body.sortOrder);
      addAudit(actor, 'UPDATE_LAB', dept.shortName, lab.name);
      saveDatabase();
      res.json(lab);
    },
  );

  app.delete(
    '/api/admin/departments/:deptId/labs/:labId',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const dept = db.departments.find((d) => d.id === Number(req.params.deptId));
      if (!dept) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
      const idx = dept.labs.findIndex((l) => l.id === Number(req.params.labId));
      if (idx === -1) {
        res.status(404).json({ error: 'Laboratory not found.' });
        return;
      }
      const [removed] = dept.labs.splice(idx, 1);
      addAudit(actor, 'DELETE_LAB', dept.shortName, removed.name);
      saveDatabase();
      res.json({ ok: true });
    },
  );

  // Full Department Create / Edit / Delete (Super Admin creates/deletes; Dept Admin & Super Admin can edit assigned dept)
  app.post('/api/admin/departments', requireAdmin('settings'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const {
      name,
      shortName,
      code,
      slug,
      establishedYear,
      intakeCapacity,
      nbaStatus,
      hodName,
      hodMessage,
      overview,
      vision,
      mission,
      heroImageUrl,
    } = req.body;
    if (!name || !code || !slug) {
      res.status(400).json({ error: 'Department name, code, and slug are required.' });
      return;
    }
    const cleanSlug = String(slug).toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (db.departments.some((d) => d.slug === cleanSlug || d.code.toLowerCase() === String(code).trim().toLowerCase())) {
      res.status(409).json({ error: 'A department with this slug or code already exists.' });
      return;
    }
    const nextId = Math.max(1, ...db.departments.map((d) => d.id)) + 1;
    const created = {
      id: nextId,
      slug: cleanSlug,
      code: String(code).trim().toUpperCase(),
      name: String(name).trim(),
      shortName: String(shortName || code).trim(),
      establishedYear: Number(establishedYear || new Date().getFullYear()),
      intakeCapacity: Number(intakeCapacity || 60),
      nbaStatus: String(nbaStatus || 'AICTE Approved'),
      hodName: String(hodName || 'To Be Appointed'),
      hodMessage: String(hodMessage || `Welcome to the Department of ${String(name).trim()}.`),
      overview: String(overview || `Dedicated academic microsite for ${String(name).trim()}.`),
      vision: String(vision || 'To deliver excellence in technical education and applied research.'),
      mission: String(mission || 'Prepare industry-ready engineers with strong ethical foundations.'),
      heroImageUrl: String(heroImageUrl || '/src/assets/images/hero_robotics_lab_1794512596365.jpg'),
      subPages: [
        {
          id: nextId * 100 + 1,
          departmentId: nextId,
          slug: 'about',
          title: 'About Department',
          contentHtml: `<h2>About ${String(name).trim()}</h2><p>${String(overview || 'Department profile and academic highlights.')}</p>`,
          sortOrder: 1,
          isPublished: true,
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        {
          id: nextId * 100 + 2,
          departmentId: nextId,
          slug: 'hod-desk',
          title: 'HoD Desk',
          contentHtml: `<h2>Message from ${String(hodName || 'Head of Department')}</h2><p>${String(hodMessage || 'Welcome to our department.')}</p>`,
          sortOrder: 2,
          isPublished: true,
          updatedAt: new Date().toISOString().slice(0, 10),
        },
      ],
      faculty: [],
      labs: [],
    };
    db.departments.push(created);
    addAudit(actor, 'CREATE_DEPARTMENT', 'Department', created.name);
    saveDatabase();
    res.status(201).json(created);
  });

  app.put(
    '/api/admin/departments/:deptId',
    requireAdmin('departments', (req) => Number(req.params.deptId)),
    (req, res) => {
      const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
      const dept = db.departments.find((d) => d.id === Number(req.params.deptId));
      if (!dept) {
        res.status(404).json({ error: 'Department not found.' });
        return;
      }
      const fields = [
        'name',
        'shortName',
        'code',
        'nbaStatus',
        'hodName',
        'hodMessage',
        'overview',
        'vision',
        'mission',
        'heroImageUrl',
      ] as const;
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          (dept as unknown as Record<string, string>)[f] = String(req.body[f]);
        }
      }
      if (req.body.establishedYear !== undefined) dept.establishedYear = Number(req.body.establishedYear);
      if (req.body.intakeCapacity !== undefined) dept.intakeCapacity = Number(req.body.intakeCapacity);
      if (req.body.library !== undefined) {
        dept.library = req.body.library ? { ...req.body.library } : undefined;
      }
      if (Array.isArray(req.body.facultyFieldSchema)) {
        dept.facultyFieldSchema = req.body.facultyFieldSchema.map((s: unknown) => String(s).trim()).filter(Boolean);
      }
      addAudit(actor, 'UPDATE_DEPARTMENT', 'Department', dept.name);
      saveDatabase();
      res.json(dept);
    },
  );

  app.delete('/api/admin/departments/:deptId', requireAdmin('settings'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const idx = db.departments.findIndex((d) => d.id === Number(req.params.deptId));
    if (idx === -1) {
      res.status(404).json({ error: 'Department not found.' });
      return;
    }
    const [removed] = db.departments.splice(idx, 1);
    addAudit(actor, 'DELETE_DEPARTMENT', 'Department', removed.name);
    saveDatabase();
    res.json({ ok: true });
  });

  // Centralized Image & Media Binary Upload Endpoint (strict MIME + extension checks)
  app.post('/api/admin/upload', requireAdmin(), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { fileName, mimeType, fileSizeBytes, base64Content } = req.body as {
      fileName?: string;
      mimeType?: string;
      fileSizeBytes?: number;
      base64Content?: string;
    };
    if (!fileName || !base64Content) {
      res.status(400).json({ error: 'Filename and file content are required.' });
      return;
    }
    const isImg = isImageFileMeta(String(fileName), String(mimeType || 'image/jpeg'));
    const maxBytes = getUploadSizeLimitBytes(db.settings, isImg ? 'photo' : 'document');
    const validation = validateUploadMeta(
      String(fileName),
      String(mimeType || 'image/jpeg'),
      Number(fileSizeBytes || 1024),
      maxBytes,
    );
    if (!validation.valid || !validation.safeFilename) {
      res.status(400).json({ error: validation.reason || 'File blocked by upload security validator.' });
      return;
    }
    const cleanBase64 = base64Content.includes(',') ? base64Content.split(',')[1] : base64Content;
    const buf = Buffer.from(cleanBase64, 'base64');
    if (buf.length <= 0 || buf.length > maxBytes) {
      res.status(400).json({
        error: `Uploaded ${isImg ? 'photo' : 'file'} exceeds configured limit (${isImg ? db.settings.maxPhotoUploadMb ?? 2 : db.settings.maxDocumentUploadMb ?? 10} MB).`,
      });
      return;
    }
    fs.writeFileSync(path.join(UPLOAD_DIR, validation.safeFilename), buf);
    const fileUrl = `/uploads/${validation.safeFilename}`;
    addAudit(actor, 'UPLOAD_MEDIA', 'Upload', validation.safeFilename);
    saveDatabase();
    res.status(201).json({
      fileUrl,
      fileName: validation.safeFilename,
      mimeType: String(mimeType || 'image/jpeg'),
      fileSizeBytes: buf.length,
    });
  });

  // Sliders, Ticker & Events CRUD
  app.post('/api/admin/sliders', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { title, caption, imageUrl, ctaLabel, ctaLink, isActive } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Slide title is required.' });
      return;
    }
    const nextId = Math.max(1, ...db.sliders.map((s) => s.id)) + 1;
    const slide = {
      id: nextId,
      title: String(title),
      caption: String(caption || ''),
      imageUrl: String(imageUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg'),
      ctaLabel: String(ctaLabel || 'Learn More'),
      ctaLink: String(ctaLink || '/page/about-overview'),
      sortOrder: db.sliders.length + 1,
      isActive: Boolean(isActive ?? true),
    };
    db.sliders.push(slide);
    addAudit(actor, 'CREATE_SLIDE', 'Slider', slide.title);
    saveDatabase();
    res.status(201).json(slide);
  });

  app.put('/api/admin/sliders/reorder', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    db.sliders = applyReorderIds(db.sliders, orderedIds);
    addAudit(actor, 'REORDER_SLIDERS', 'Slider', 'Updated hero slider order');
    saveDatabase();
    res.json(db.sliders);
  });

  app.put('/api/admin/sliders/:id', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const slide = db.sliders.find((s) => s.id === Number(req.params.id));
    if (!slide) {
      res.status(404).json({ error: 'Slide not found.' });
      return;
    }
    if (req.body.title !== undefined) slide.title = String(req.body.title);
    if (req.body.caption !== undefined) slide.caption = String(req.body.caption);
    if (req.body.imageUrl !== undefined) slide.imageUrl = String(req.body.imageUrl);
    if (req.body.ctaLabel !== undefined) slide.ctaLabel = String(req.body.ctaLabel);
    if (req.body.ctaLink !== undefined) slide.ctaLink = String(req.body.ctaLink);
    if (req.body.isActive !== undefined) slide.isActive = Boolean(req.body.isActive);
    addAudit(actor, 'UPDATE_SLIDE', 'Slider', slide.title);
    saveDatabase();
    res.json(slide);
  });

  app.delete('/api/admin/sliders/:id', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const idx = db.sliders.findIndex((s) => s.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Slide not found.' });
      return;
    }
    const [removed] = db.sliders.splice(idx, 1);
    addAudit(actor, 'DELETE_SLIDE', 'Slider', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  app.post('/api/admin/ticker', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { text, linkUrl, badgeText } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Ticker text is required.' });
      return;
    }
    const nextId = Math.max(1, ...db.ticker.map((t) => t.id)) + 1;
    db.ticker.forEach((t, idx) => {
      t.sortOrder = (t.sortOrder ?? idx + 1) + 1;
    });
    const item = {
      id: nextId,
      text: String(text),
      linkUrl: String(linkUrl || '/page/circulars-notices'),
      badgeText: badgeText ? String(badgeText) : 'Notice',
      isActive: true,
      sortOrder: 1,
    };
    db.ticker.unshift(item);
    addAudit(actor, 'CREATE_TICKER', 'Ticker', item.text);
    saveDatabase();
    res.status(201).json(item);
  });

  app.put('/api/admin/ticker/reorder', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    db.ticker = applyReorderIds(db.ticker, orderedIds);
    addAudit(actor, 'REORDER_TICKER', 'Ticker', 'Updated scrolling ticker order');
    saveDatabase();
    res.json(db.ticker);
  });

  app.delete('/api/admin/ticker/:id', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const idx = db.ticker.findIndex((t) => t.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Ticker item not found.' });
      return;
    }
    const [removed] = db.ticker.splice(idx, 1);
    addAudit(actor, 'DELETE_TICKER', 'Ticker', removed.text);
    saveDatabase();
    res.json({ ok: true });
  });

  app.post('/api/admin/events', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { title, eventDate, category, summary, contentHtml, imageUrl, isFeatured } = req.body;
    if (!title || !eventDate) {
      res.status(400).json({ error: 'Event title and date are required.' });
      return;
    }
    const nextId = Math.max(1, ...db.events.map((e) => e.id)) + 1;
    db.events.forEach((e, idx) => {
      e.sortOrder = (e.sortOrder ?? idx + 1) + 1;
    });
    const ev = {
      id: nextId,
      title: String(title),
      eventDate: String(eventDate),
      category: category || 'Notice',
      summary: String(summary || ''),
      contentHtml: String(contentHtml || `<p>${summary || ''}</p>`),
      imageUrl: imageUrl ? String(imageUrl) : undefined,
      isFeatured: Boolean(isFeatured ?? true),
      sortOrder: 1,
    };
    db.events.unshift(ev);
    addAudit(actor, 'CREATE_EVENT', ev.category, ev.title);
    saveDatabase();
    res.status(201).json(ev);
  });

  app.put('/api/admin/events/reorder', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    db.events = applyReorderIds(db.events, orderedIds);
    addAudit(actor, 'REORDER_EVENTS', 'Event', 'Updated events & circulars order');
    saveDatabase();
    res.json(db.events);
  });

  app.put('/api/admin/events/:id', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const ev = db.events.find((e) => e.id === Number(req.params.id));
    if (!ev) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    if (req.body.title !== undefined) ev.title = String(req.body.title);
    if (req.body.eventDate !== undefined) ev.eventDate = String(req.body.eventDate);
    if (req.body.category !== undefined) ev.category = req.body.category;
    if (req.body.summary !== undefined) ev.summary = String(req.body.summary);
    if (req.body.contentHtml !== undefined) ev.contentHtml = String(req.body.contentHtml);
    if (req.body.imageUrl !== undefined) ev.imageUrl = req.body.imageUrl ? String(req.body.imageUrl) : undefined;
    if (req.body.isFeatured !== undefined) ev.isFeatured = Boolean(req.body.isFeatured);
    if (req.body.sortOrder !== undefined) ev.sortOrder = Number(req.body.sortOrder);
    addAudit(actor, 'UPDATE_EVENT', ev.category, ev.title);
    saveDatabase();
    res.json(ev);
  });

  app.delete('/api/admin/events/:id', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const idx = db.events.findIndex((e) => e.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    const [removed] = db.events.splice(idx, 1);
    addAudit(actor, 'DELETE_EVENT', 'Event', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  // Leadership & Statutory Officers CRUD
  app.post('/api/admin/leadership', requireAdmin('leadership'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { roleTitle, name, qualification, email, phone, photoUrl, bio, committeeGroup, sortOrder } = req.body;
    if (!roleTitle || !name) {
      res.status(400).json({ error: 'Role title and officer name are required.' });
      return;
    }
    const nextId = Math.max(1, ...db.leadership.map((l) => l.id)) + 1;
    const maxOrder = Math.max(0, ...db.leadership.map((l) => l.sortOrder ?? 0));
    const profile = {
      id: nextId,
      roleTitle: String(roleTitle),
      name: String(name),
      qualification: String(qualification || ''),
      email: String(email || ''),
      phone: String(phone || ''),
      photoUrl: String(photoUrl || '/src/assets/images/leadership_principal_1794512597061.jpg'),
      bio: String(bio || ''),
      committeeGroup: String(committeeGroup || 'Statutory Officer').trim() || 'Statutory Officer',
      sortOrder: sortOrder !== undefined && Number(sortOrder) > 0 ? Number(sortOrder) : maxOrder + 1,
    };
    db.leadership.push(profile);
    db.leadership = sortByOrder(db.leadership);
    addAudit(actor, 'CREATE_LEADERSHIP', 'Leadership', `${profile.name} (${profile.roleTitle})`);
    saveDatabase();
    res.status(201).json(profile);
  });

  app.put('/api/admin/leadership/reorder', requireAdmin('leadership'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    db.leadership = applyReorderIds(db.leadership, orderedIds);
    addAudit(actor, 'REORDER_LEADERSHIP', 'Leadership', 'Updated leadership & governance order');
    saveDatabase();
    res.json(db.leadership);
  });

  app.put('/api/admin/leadership/:id', requireAdmin('leadership'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const profile = db.leadership.find((l) => l.id === Number(req.params.id));
    if (!profile) {
      res.status(404).json({ error: 'Leadership profile not found.' });
      return;
    }
    for (const f of ['roleTitle', 'name', 'qualification', 'email', 'phone', 'photoUrl', 'bio', 'committeeGroup'] as const) {
      if (req.body[f] !== undefined) {
        (profile as unknown as Record<string, string>)[f] = String(req.body[f]);
      }
    }
    if (req.body.sortOrder !== undefined && Number(req.body.sortOrder) > 0) {
      profile.sortOrder = Number(req.body.sortOrder);
    }
    db.leadership = sortByOrder(db.leadership);
    addAudit(actor, 'UPDATE_LEADERSHIP', 'Leadership', profile.name);
    saveDatabase();
    res.json(profile);
  });

  app.delete('/api/admin/leadership/:id', requireAdmin('leadership'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const idx = db.leadership.findIndex((l) => l.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Leadership profile not found.' });
      return;
    }
    const [removed] = db.leadership.splice(idx, 1);
    addAudit(actor, 'DELETE_LEADERSHIP', 'Leadership', removed.name);
    saveDatabase();
    res.json({ ok: true });
  });

  // Picture Gallery Albums & Photos CRUD
  app.post('/api/admin/gallery/albums', requireAdmin('gallery'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { title, category, eventDate, coverUrl } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Album title is required.' });
      return;
    }
    const nextId = Math.max(1, ...db.gallery.map((g) => g.id)) + 1;
    db.gallery.forEach((g, idx) => {
      g.sortOrder = (g.sortOrder ?? idx + 1) + 1;
    });
    const cover = String(coverUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg');
    const album = {
      id: nextId,
      title: String(title),
      category: String(category || 'Campus'),
      eventDate: String(eventDate || new Date().toISOString().slice(0, 10)),
      coverUrl: cover,
      sortOrder: 1,
      photos: [
        {
          id: nextId * 100 + 1,
          imageUrl: cover,
          caption: String(title),
          altText: String(title),
        },
      ],
    };
    db.gallery.unshift(album);
    addAudit(actor, 'CREATE_ALBUM', 'Gallery', album.title);
    saveDatabase();
    res.status(201).json(album);
  });

  app.put('/api/admin/gallery/albums/reorder', requireAdmin('gallery'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    db.gallery = applyReorderIds(db.gallery, orderedIds);
    addAudit(actor, 'REORDER_GALLERY', 'Gallery', 'Updated album order');
    saveDatabase();
    res.json(db.gallery);
  });

  app.delete('/api/admin/gallery/albums/:id', requireAdmin('gallery'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const idx = db.gallery.findIndex((g) => g.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Album not found.' });
      return;
    }
    const [removed] = db.gallery.splice(idx, 1);
    addAudit(actor, 'DELETE_ALBUM', 'Gallery', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  app.post('/api/admin/gallery/albums/:id/photos', requireAdmin('gallery'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const album = db.gallery.find((g) => g.id === Number(req.params.id));
    if (!album) {
      res.status(404).json({ error: 'Album not found.' });
      return;
    }
    const { imageUrl, caption, altText } = req.body;
    if (!imageUrl) {
      res.status(400).json({ error: 'Photo image URL is required.' });
      return;
    }
    const nextPhotoId = Math.max(100, ...album.photos.map((p) => p.id)) + 1;
    const photo = {
      id: nextPhotoId,
      imageUrl: String(imageUrl),
      caption: String(caption || album.title),
      altText: String(altText || caption || album.title),
    };
    album.photos.push(photo);
    addAudit(actor, 'ADD_GALLERY_PHOTO', 'Gallery', `${album.title}: ${photo.caption}`);
    saveDatabase();
    res.status(201).json(photo);
  });

  app.delete('/api/admin/gallery/albums/:id/photos/:photoId', requireAdmin('gallery'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const album = db.gallery.find((g) => g.id === Number(req.params.id));
    if (!album) {
      res.status(404).json({ error: 'Album not found.' });
      return;
    }
    const idx = album.photos.findIndex((p) => p.id === Number(req.params.photoId));
    if (idx === -1) {
      res.status(404).json({ error: 'Photo not found.' });
      return;
    }
    album.photos.splice(idx, 1);
    addAudit(actor, 'DELETE_GALLERY_PHOTO', 'Gallery', album.title);
    saveDatabase();
    res.json({ ok: true });
  });

  // Telephone Directory CRUD
  app.post('/api/admin/directory', requireAdmin('directory'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { section, officerName, designation, extension, directPhone, email } = req.body;
    if (!section || !officerName) {
      res.status(400).json({ error: 'Section and officer name are required.' });
      return;
    }
    const nextId = Math.max(1, ...db.telephoneDirectory.map((t) => t.id)) + 1;
    const maxOrder = Math.max(0, ...db.telephoneDirectory.map((t) => t.sortOrder ?? t.id));
    const entry = {
      id: nextId,
      section: String(section),
      officerName: String(officerName),
      designation: String(designation || ''),
      extension: String(extension || ''),
      directPhone: String(directPhone || ''),
      email: String(email || ''),
      sortOrder: maxOrder + 1,
    };
    db.telephoneDirectory.push(entry);
    addAudit(actor, 'ADD_DIRECTORY_ENTRY', 'Directory', `${entry.section} - ${entry.officerName}`);
    saveDatabase();
    res.status(201).json(entry);
  });

  app.put('/api/admin/directory/reorder', requireAdmin('directory'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    db.telephoneDirectory = applyReorderIds(db.telephoneDirectory, orderedIds);
    addAudit(actor, 'REORDER_DIRECTORY', 'Directory', 'Updated telephone directory order');
    saveDatabase();
    res.json(db.telephoneDirectory);
  });

  app.delete('/api/admin/directory/:id', requireAdmin('directory'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const idx = db.telephoneDirectory.findIndex((t) => t.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Directory entry not found.' });
      return;
    }
    const [removed] = db.telephoneDirectory.splice(idx, 1);
    addAudit(actor, 'DELETE_DIRECTORY_ENTRY', 'Directory', removed.officerName);
    saveDatabase();
    res.json({ ok: true });
  });

  // Documents / Media Manager with strict MIME & executable upload blocking OR validated external link
  app.post('/api/admin/documents', requireAdmin('documents'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const {
      title,
      category,
      sourceType,
      externalUrl,
      fileName,
      mimeType,
      fileSizeBytes,
      base64Content,
      isQuickLink,
    } = req.body;
    if (!title || !category) {
      res.status(400).json({ error: 'Document title and category are required.' });
      return;
    }

    const nextId = Math.max(1, ...db.documents.map((d) => d.id)) + 1;
    db.documents.forEach((d, idx) => {
      d.sortOrder = (d.sortOrder ?? idx + 1) + 1;
    });

    if (sourceType === 'external') {
      const urlCheck = validateExternalDocumentUrl(String(externalUrl || ''));
      if (!urlCheck.valid || !urlCheck.normalizedUrl) {
        res.status(400).json({ error: urlCheck.reason || 'Invalid external document URL.' });
        return;
      }
      let displayFileName = urlCheck.normalizedUrl;
      try {
        const parsed = new URL(urlCheck.normalizedUrl);
        displayFileName = `${parsed.hostname}${parsed.pathname}`.slice(0, 80);
      } catch {
        displayFileName = urlCheck.normalizedUrl.slice(0, 80);
      }
      const doc = {
        id: nextId,
        title: String(title).trim(),
        category,
        fileUrl: urlCheck.normalizedUrl,
        fileName: displayFileName,
        fileSizeBytes: 0,
        mimeType: 'text/uri-list',
        sourceType: 'external' as const,
        uploadedAt: new Date().toISOString().slice(0, 10),
        uploadedBy: actor.fullName,
        isQuickLink: Boolean(isQuickLink ?? true),
        sortOrder: 1,
      };
      db.documents.unshift(doc);
      addAudit(actor, 'ADD_EXTERNAL_DOCUMENT', 'Document', doc.title);
      saveDatabase();
      res.status(201).json(doc);
      return;
    }

    if (!fileName) {
      res.status(400).json({ error: 'File name is required for uploaded documents.' });
      return;
    }
    const isImgDoc = isImageFileMeta(String(fileName), String(mimeType || 'application/pdf'));
    const docMaxBytes = getUploadSizeLimitBytes(db.settings, isImgDoc ? 'photo' : 'document');
    const validation = validateUploadMeta(
      String(fileName),
      String(mimeType || 'application/pdf'),
      Number(fileSizeBytes || 1024),
      docMaxBytes,
    );
    if (!validation.valid || !validation.safeFilename) {
      res.status(400).json({ error: validation.reason || 'Invalid file upload.' });
      return;
    }

    let fileUrl =
      '/assets/aistudio/7822003_GUIDELINES-ON-PUBLIC-SELF-DISCLOSURE-BY-HIGHER-EDUCATION-INSTITUTIONS_1ee4b0ce.pdf';
    if (base64Content && typeof base64Content === 'string') {
      const cleanBase64 = base64Content.includes(',') ? base64Content.split(',')[1] : base64Content;
      const buf = Buffer.from(cleanBase64, 'base64');
      if (buf.length > docMaxBytes) {
        res.status(400).json({
          error: `Document exceeds configured ${db.settings.maxDocumentUploadMb ?? 10} MB upload limit.`,
        });
        return;
      }
      fs.writeFileSync(path.join(UPLOAD_DIR, validation.safeFilename), buf);
      fileUrl = `/uploads/${validation.safeFilename}`;
    }

    const doc = {
      id: nextId,
      title: String(title).trim(),
      category,
      fileUrl,
      fileName: validation.safeFilename,
      fileSizeBytes: Number(fileSizeBytes || 204800),
      mimeType: String(mimeType || 'application/pdf'),
      sourceType: 'upload' as const,
      uploadedAt: new Date().toISOString().slice(0, 10),
      uploadedBy: actor.fullName,
      isQuickLink: Boolean(isQuickLink ?? true),
      sortOrder: 1,
    };
    db.documents.unshift(doc);
    addAudit(actor, 'UPLOAD_DOCUMENT', 'Document', doc.title);
    saveDatabase();
    res.status(201).json(doc);
  });

  app.put('/api/admin/documents/reorder', requireAdmin('documents'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    db.documents = applyReorderIds(db.documents, orderedIds);
    addAudit(actor, 'REORDER_DOCUMENTS', 'Document', 'Updated documents repository order');
    saveDatabase();
    res.json(db.documents);
  });

  app.delete('/api/admin/documents/:id', requireAdmin('documents'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const idx = db.documents.findIndex((d) => d.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    const [removed] = db.documents.splice(idx, 1);
    addAudit(actor, 'DELETE_DOCUMENT', 'Document', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  // Homepage Custom HTML Components Builder CRUD (Super Admin or Content Editor)
  app.post('/api/admin/home-components', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { title, placement, contentHtml, isActive } = req.body as {
      title?: string;
      placement?: HomeComponentPlacement;
      contentHtml?: string;
      isActive?: boolean;
    };
    if (!title || !contentHtml) {
      res.status(400).json({ error: 'Component title and HTML content are required.' });
      return;
    }
    const validPlacements: HomeComponentPlacement[] = [
      'after-hero',
      'after-about',
      'after-depts',
      'before-footer',
    ];
    const safePlacement: HomeComponentPlacement = validPlacements.includes(placement as HomeComponentPlacement)
      ? (placement as HomeComponentPlacement)
      : 'after-about';
    const list = db.settings.customHomeComponents ?? [];
    const nextId = Math.max(0, ...list.map((c) => c.id)) + 1;
    const created: CustomHomeComponent = {
      id: nextId,
      title: String(title).trim(),
      placement: safePlacement,
      sortOrder: list.length + 1,
      isActive: Boolean(isActive ?? true),
      contentHtml: String(contentHtml),
    };
    db.settings.customHomeComponents = [...list, created];
    addAudit(actor, 'CREATE_HOME_COMPONENT', 'HomeComponent', created.title);
    saveDatabase();
    res.status(201).json(created);
  });

  app.put('/api/admin/home-components/reorder', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    const list = db.settings.customHomeComponents ?? [];
    orderedIds.forEach((id, idx) => {
      const item = list.find((c) => c.id === Number(id));
      if (item) item.sortOrder = idx + 1;
    });
    list.sort((a, b) => a.sortOrder - b.sortOrder);
    db.settings.customHomeComponents = list;
    addAudit(actor, 'REORDER_HOME_COMPONENTS', 'HomeComponent', 'Updated homepage custom components order');
    saveDatabase();
    res.json(list);
  });

  app.put('/api/admin/home-components/:id', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const list = db.settings.customHomeComponents ?? [];
    const comp = list.find((c) => c.id === Number(req.params.id));
    if (!comp) {
      res.status(404).json({ error: 'Homepage component not found.' });
      return;
    }
    if (req.body.title !== undefined) comp.title = String(req.body.title).trim();
    if (req.body.placement !== undefined) comp.placement = req.body.placement;
    if (req.body.contentHtml !== undefined) comp.contentHtml = String(req.body.contentHtml);
    if (req.body.isActive !== undefined) comp.isActive = Boolean(req.body.isActive);
    if (req.body.sortOrder !== undefined) comp.sortOrder = Number(req.body.sortOrder);
    addAudit(actor, 'UPDATE_HOME_COMPONENT', 'HomeComponent', comp.title);
    saveDatabase();
    res.json(comp);
  });

  app.delete('/api/admin/home-components/:id', requireAdmin('sliders_events'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const list = db.settings.customHomeComponents ?? [];
    const idx = list.findIndex((c) => c.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Homepage component not found.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    db.settings.customHomeComponents = list;
    addAudit(actor, 'DELETE_HOME_COMPONENT', 'HomeComponent', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  // Users & RBAC management (Super Admin only)
  app.post('/api/admin/users', requireAdmin('users'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const {
      fullName,
      email,
      password,
      role,
      assignedDepartmentId,
      allowedCategories,
      allowedPageIds,
      allowedModules,
      allowedDepartmentIds,
    } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      assignedDepartmentId?: number | null;
      allowedCategories?: string[];
      allowedPageIds?: number[];
      allowedModules?: AdminModuleKey[];
      allowedDepartmentIds?: number[];
    };
    if (!fullName || !email || !password || !role) {
      res.status(400).json({ error: 'Name, email, password, and role are required.' });
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      res.status(409).json({ error: 'User with this email already exists.' });
      return;
    }
    const cleanCats = Array.isArray(allowedCategories)
      ? allowedCategories.map(String)
      : role === 'exam_controller'
      ? ['examination']
      : [];
    const cleanPageIds = Array.isArray(allowedPageIds) ? allowedPageIds.map(Number).filter(Number.isFinite) : [];
    const cleanModules = Array.isArray(allowedModules) ? allowedModules.map(String) as AdminModuleKey[] : [];
    const cleanDeptIds = Array.isArray(allowedDepartmentIds) ? allowedDepartmentIds.map(Number).filter(Number.isFinite) : [];
    if (
      role === 'specific_page_editor' &&
      cleanCats.length === 0 &&
      cleanPageIds.length === 0 &&
      cleanModules.length === 0 &&
      cleanDeptIds.length === 0
    ) {
      res.status(400).json({
        error: 'Assign at least one Page, Category, Admin Module, or Department for a Specific Page / Portal User.',
      });
      return;
    }
    const nextId = Math.max(1, ...db.users.map((u) => u.id)) + 1;
    const newUser = {
      id: nextId,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      assignedDepartmentId: role === 'department_admin' ? Number(assignedDepartmentId || cleanDeptIds[0] || 1) : null,
      allowedCategories: cleanCats,
      allowedPageIds: cleanPageIds,
      allowedModules: cleanModules,
      allowedDepartmentIds: cleanDeptIds,
      isActive: true,
      passwordHash: hashPassword(password),
    };
    db.users.push(newUser);
    addAudit(actor, 'CREATE_USER', 'User', `${newUser.email} (${newUser.role})`);
    saveDatabase();
    res.status(201).json(sanitizeUser(newUser));
  });

  app.put('/api/admin/users/:id/permissions', requireAdmin('users'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const target = db.users.find((u) => u.id === Number(req.params.id));
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const { role, assignedDepartmentId, allowedCategories, allowedPageIds, allowedModules, allowedDepartmentIds } = req.body as {
      role?: UserRole;
      assignedDepartmentId?: number | null;
      allowedCategories?: string[];
      allowedPageIds?: number[];
      allowedModules?: AdminModuleKey[];
      allowedDepartmentIds?: number[];
    };
    if (role !== undefined && target.id !== actor.id) {
      target.role = role;
    }
    if (assignedDepartmentId !== undefined) {
      target.assignedDepartmentId =
        target.role === 'department_admin' ? Number(assignedDepartmentId || 1) : null;
    }
    if (Array.isArray(allowedCategories)) {
      target.allowedCategories = allowedCategories.map(String);
    }
    if (Array.isArray(allowedPageIds)) {
      target.allowedPageIds = allowedPageIds.map(Number).filter(Number.isFinite);
    }
    if (Array.isArray(allowedModules)) {
      target.allowedModules = allowedModules.map(String) as AdminModuleKey[];
    }
    if (Array.isArray(allowedDepartmentIds)) {
      target.allowedDepartmentIds = allowedDepartmentIds.map(Number).filter(Number.isFinite);
    }
    addAudit(
      actor,
      'UPDATE_USER_PERMISSIONS',
      'User',
      `${target.email} (${(target.allowedModules ?? []).length} modules, ${(target.allowedCategories ?? []).length} cats, ${(target.allowedPageIds ?? []).length} pages)`,
    );
    saveDatabase();
    res.json(sanitizeUser(target));
  });

  app.put('/api/admin/users/:id/toggle', requireAdmin('users'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const target = db.users.find((u) => u.id === Number(req.params.id));
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (target.id === actor.id) {
      res.status(400).json({ error: 'Cannot deactivate your own active session account.' });
      return;
    }
    target.isActive = !target.isActive;
    addAudit(actor, target.isActive ? 'ENABLE_USER' : 'DISABLE_USER', 'User', target.email);
    saveDatabase();
    res.json(sanitizeUser(target));
  });

  app.delete('/api/admin/users/:id', requireAdmin('users'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const id = Number(req.params.id);
    const idx = db.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const target = db.users[idx];
    if (target.id === actor.id) {
      res.status(400).json({ error: 'Cannot delete your own active session account.' });
      return;
    }
    if (target.role === 'super_admin' && target.isActive) {
      const otherActiveSuperAdmins = db.users.filter(
        (u) => u.id !== target.id && u.role === 'super_admin' && u.isActive,
      );
      if (otherActiveSuperAdmins.length === 0) {
        res.status(400).json({ error: 'Cannot delete the last remaining active Super Admin account.' });
        return;
      }
    }
    const [removed] = db.users.splice(idx, 1);
    addAudit(actor, 'DELETE_USER', 'User', `${removed.email} (${removed.role})`);
    saveDatabase();
    res.json({ ok: true });
  });

  // Site Settings (Super Admin only)
  app.put('/api/admin/settings', requireAdmin('settings'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const incoming = req.body || {};
    const nextPhotoMb = clampUploadLimitMb(
      incoming.maxPhotoUploadMb,
      db.settings.maxPhotoUploadMb ?? 2,
      0.25,
      25,
    );
    const nextDocMb = clampUploadLimitMb(
      incoming.maxDocumentUploadMb,
      db.settings.maxDocumentUploadMb ?? 10,
      0.5,
      50,
    );
    db.settings = {
      ...db.settings,
      ...incoming,
      maxPhotoUploadMb: nextPhotoMb,
      maxDocumentUploadMb: nextDocMb,
      autoCropImages:
        typeof incoming.autoCropImages === 'boolean'
          ? incoming.autoCropImages
          : (db.settings.autoCropImages ?? true),
    };
    addAudit(actor, 'UPDATE_SITE_SETTINGS', 'Settings', db.settings.institutionName);
    saveDatabase();
    res.json(db.settings);
  });

  // ============================================================================
  // BACKUP, INCREMENTAL SNAPSHOT, SCHEDULED AUTO-BACKUP, SCP, WEBHOOK & RESTORE
  // ============================================================================
  function getUploadInventory(): { filename: string; sizeBytes: number; mtimeMs: number }[] {
    try {
      const files = fs.readdirSync(UPLOAD_DIR);
      return files
        .map((fn) => {
          const full = path.join(UPLOAD_DIR, fn);
          const st = fs.statSync(full);
          if (!st.isFile()) return null;
          return { filename: fn, sizeBytes: st.size, mtimeMs: Math.round(st.mtimeMs) };
        })
        .filter((x): x is { filename: string; sizeBytes: number; mtimeMs: number } => Boolean(x));
    } catch {
      return [];
    }
  }

  function loadBackupFilePackage(filename: string): BackupPackage | null {
    const safeName = path.basename(filename);
    const full = path.join(BACKUP_DIR, safeName);
    if (!fs.existsSync(full)) return null;
    try {
      return JSON.parse(fs.readFileSync(full, 'utf-8')) as BackupPackage;
    } catch {
      return null;
    }
  }

  async function executeScpPush(localFilePath: string, scp: ScpConfig): Promise<{ ok: boolean; message: string }> {
    const host = (scp.host || '').trim();
    const user = (scp.username || '').trim();
    const remoteDir = (scp.remoteDir || '').trim() || '/tmp';
    const port = Number(scp.port || 22);
    if (!/^[a-zA-Z0-9._-]+$/.test(host) || !/^[a-zA-Z0-9._-]+$/.test(user)) {
      return { ok: false, message: 'Invalid SCP host or username format.' };
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { ok: false, message: 'Invalid SSH/SCP port number.' };
    }
    const args: string[] = ['-P', String(port), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8'];
    if (scp.keyPath && scp.keyPath.trim()) {
      if (!fs.existsSync(scp.keyPath.trim())) {
        return { ok: false, message: `SSH identity key not found at ${scp.keyPath.trim()}` };
      }
      args.push('-i', scp.keyPath.trim());
    }
    const remoteTarget = `${user}@${host}:${remoteDir.replace(/\/$/, '')}/${path.basename(localFilePath)}`;
    args.push(localFilePath, remoteTarget);

    return new Promise((resolve) => {
      execFile('scp', args, { timeout: 15000 }, (err, _stdout, stderr) => {
        if (err) {
          resolve({
            ok: false,
            message: (stderr || err.message || 'SCP transfer failed (verify SSH key & remote host reachability).').trim(),
          });
        } else {
          resolve({ ok: true, message: `Transferred via SCP to ${remoteTarget}` });
        }
      });
    });
  }

  async function pushWebhookBackup(
    webhookUrl: string,
    payload: {
      pkg?: BackupPackage;
      binaryArchive?: { filename: string; buf: Buffer; sha256: string; archiveType?: string; createdAt?: string };
    },
  ): Promise<{ ok: boolean; message: string }> {
    const urlCheck = validateExternalDocumentUrl(webhookUrl);
    if (!urlCheck.valid || !urlCheck.normalizedUrl) {
      return { ok: false, message: urlCheck.reason || 'Invalid webhook / Google Drive Apps Script URL.' };
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const bodyPayload = payload.binaryArchive
        ? {
            event: 'svcoer_cms_site_archive',
            createdAt: payload.binaryArchive.createdAt || new Date().toISOString(),
            archiveType: payload.binaryArchive.archiveType || 'site-zip',
            filename: payload.binaryArchive.filename,
            mimeType: 'application/zip',
            sha256: payload.binaryArchive.sha256,
            sizeBytes: payload.binaryArchive.buf.length,
            contentBase64: payload.binaryArchive.buf.toString('base64'),
          }
        : {
            event: 'svcoer_cms_backup',
            createdAt: payload.pkg?.createdAt || new Date().toISOString(),
            mode: payload.pkg?.mode || 'full',
            package: payload.pkg,
          };
      const resp = await fetch(urlCheck.normalizedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) {
        return { ok: false, message: `Webhook returned HTTP ${resp.status}` };
      }
      return { ok: true, message: `Pushed backup to remote endpoint (HTTP ${resp.status})` };
    } catch (err) {
      return { ok: false, message: `Webhook push error: ${(err as Error).message}` };
    }
  }

  async function createBackupSnapshot(opts: {
    mode: BackupMode;
    destination: BackupDestination;
    createdBy: string;
    notes?: string;
    scpOverride?: ScpConfig;
    webhookOverride?: string;
  }): Promise<BackupRecord> {
    const now = new Date();
    const createdAt = now.toISOString();
    const stamp = createdAt.replace(/[:.]/g, '-').slice(0, 19);
    const id = `bk-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const existing = db.backups ?? [];
    const baselineRecord = existing.find((b) => b.mode === 'full') || existing[0];
    const baselinePkg = baselineRecord ? loadBackupFilePackage(baselineRecord.filename) : null;

    let effectiveMode: BackupMode = opts.mode;
    let payloadData: Partial<Omit<CmsDatabase, 'backups' | 'backupSchedule'>>;
    let changedKeys: string[] | undefined;
    let baseBackupId: string | null = null;

    if (opts.mode === 'incremental' && baselineRecord && baselinePkg?.data) {
      const diff = computeIncrementalDiff(baselinePkg.data, db);
      payloadData = diff.changedData;
      changedKeys = diff.changedKeys;
      baseBackupId = baselineRecord.id;
    } else {
      effectiveMode = 'full';
      payloadData = extractSnapshotData(db);
    }

    const pkg: BackupPackage = {
      format: 'svcoer-cms-backup',
      version: 1,
      mode: effectiveMode,
      createdAt,
      baseBackupId,
      data: payloadData,
      uploadManifest: getUploadInventory(),
    };
    const rawJson = JSON.stringify(pkg, null, 2);
    const sha256 = crypto.createHash('sha256').update(rawJson).digest('hex');
    pkg.sha256 = sha256;
    const finalJson = JSON.stringify(pkg, null, 2);

    const filename = `svcoer-${effectiveMode}-${stamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filePath, finalJson, 'utf-8');

    let remoteStatus: string | undefined;
    if (opts.destination === 'scp') {
      const scpCfg = opts.scpOverride || db.backupSchedule?.scpConfig;
      if (scpCfg) {
        const res = await executeScpPush(filePath, scpCfg);
        remoteStatus = res.message;
      } else {
        remoteStatus = 'SCP destination selected, but no SCP host configured.';
      }
    } else if (opts.destination === 'webhook') {
      const hookUrl = opts.webhookOverride || db.backupSchedule?.webhookUrl || '';
      if (hookUrl) {
        const res = await pushWebhookBackup(hookUrl, { pkg });
        remoteStatus = res.message;
      } else {
        remoteStatus = 'Webhook / Drive Script destination selected, but no URL configured.';
      }
    }

    const record: BackupRecord = {
      id,
      createdAt,
      createdBy: opts.createdBy,
      mode: effectiveMode,
      destination: opts.destination,
      filename,
      sizeBytes: Buffer.byteLength(finalJson, 'utf-8'),
      sha256,
      baseBackupId,
      notes: opts.notes,
      entityCounts: countDatabaseEntities(payloadData),
      changedKeys,
      remoteStatus,
    };

    const nextList = [record, ...existing];
    const retention = Math.max(3, Number(db.backupSchedule?.retentionCount || 14));
    if (nextList.length > retention) {
      const keep = nextList.slice(0, retention);
      const removed = nextList.slice(retention);
      for (const old of removed) {
        try {
          const oldPath = path.join(BACKUP_DIR, path.basename(old.filename));
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch {
          // ignore cleanup failure
        }
      }
      db.backups = keep;
    } else {
      db.backups = nextList;
    }

    return record;
  }

  app.get('/api/admin/backups', requireAdmin('settings'), (_req, res) => {
    res.json({
      backups: db.backups ?? [],
      schedule: db.backupSchedule ?? defaultBackupSchedule(),
      uploadsInventory: getUploadInventory(),
    });
  });

  app.post('/api/admin/backups/create', requireAdmin('settings'), async (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { mode, destination, notes } = req.body as {
      mode?: BackupMode;
      destination?: BackupDestination;
      notes?: string;
    };
    const record = await createBackupSnapshot({
      mode: mode === 'incremental' ? 'incremental' : 'full',
      destination: destination === 'scp' || destination === 'webhook' ? destination : 'local',
      createdBy: actor.email,
      notes: notes ? String(notes).trim() : undefined,
    });
    addAudit(actor, `CREATE_${record.mode.toUpperCase()}_BACKUP`, 'Backup', `${record.filename} (${record.destination})`);
    saveDatabase();
    res.status(201).json(record);
  });

  app.get('/api/admin/export', requireAdmin('settings'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const data = extractSnapshotData(db);
    const createdAt = new Date().toISOString();
    const pkg: BackupPackage = {
      format: 'svcoer-cms-backup',
      version: 1,
      mode: 'full',
      createdAt,
      data,
      uploadManifest: getUploadInventory(),
    };
    const json = JSON.stringify(pkg, null, 2);
    pkg.sha256 = crypto.createHash('sha256').update(json).digest('hex');
    const finalJson = JSON.stringify(pkg, null, 2);
    addAudit(actor, 'EXPORT_CMS_DATA', 'Backup', 'Instant Full JSON Export');
    saveDatabase();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="svcoer-export-${createdAt.slice(0, 10)}.json"`,
    );
    res.send(finalJson);
  });

  app.get('/api/admin/backups/:id/download', requireAdmin('settings'), (req, res) => {
    const record = (db.backups ?? []).find((b) => b.id === req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Backup record not found.' });
      return;
    }
    const safeName = path.basename(record.filename);
    const full = path.join(BACKUP_DIR, safeName);
    if (!fs.existsSync(full)) {
      res.status(404).json({ error: 'Backup file no longer exists on disk.' });
      return;
    }
    const isZip = safeName.toLowerCase().endsWith('.zip') || record.archiveType === 'site-zip';
    res.setHeader(
      'Content-Type',
      isZip ? 'application/zip' : 'application/json; charset=utf-8',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.sendFile(full);
  });

  // Alumni Network Admin CRUD & Moderation
  app.post('/api/admin/alumni/profiles', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const body = req.body as Partial<AlumniProfile> & { password?: string };
    const validation = validateAlumniRegistrationInput(body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.reason });
      return;
    }
    const nextId = Math.max(0, ...alumniState.profiles.map((p) => p.id)) + 1;
    const nextSort = Math.max(0, ...alumniState.profiles.map((p) => p.sortOrder)) + 1;
    const matchedDept = db.departments.find((d) => d.code === body.departmentCode);
    const pwRaw = String(body.password || 'Alumni@123').trim();
    const profile: AlumniProfile = {
      id: nextId,
      fullName: String(body.fullName).trim(),
      email: String(body.email).trim().toLowerCase(),
      passwordHash: hashPassword(pwRaw.length >= 6 ? pwRaw : 'Alumni@123'),
      phone: body.phone ? String(body.phone).trim() : '',
      graduationYear: Number(body.graduationYear),
      departmentCode: String(body.departmentCode).trim(),
      departmentName: matchedDept ? matchedDept.name : String(body.departmentName || body.departmentCode).trim(),
      degree: String(body.degree || 'B.Tech').trim(),
      currentCompany: String(body.currentCompany).trim(),
      designation: String(body.designation).trim(),
      location: String(body.location || 'India').trim(),
      chapter: String(body.chapter || 'Pandharpur Home Chapter').trim(),
      linkedinUrl: body.linkedinUrl ? String(body.linkedinUrl).trim() : '',
      websiteUrl: body.websiteUrl ? String(body.websiteUrl).trim() : '',
      photoUrl: body.photoUrl ? String(body.photoUrl).trim() : '/src/assets/images/leadership_principal_1794512597061.jpg',
      bio: String(body.bio || '').trim(),
      openToMentorship: Boolean(body.openToMentorship),
      isFeatured: Boolean(body.isFeatured),
      status: (body.status || 'approved') as AlumniApprovalStatus,
      sortOrder: Number(body.sortOrder ?? nextSort),
      registeredAt: new Date().toISOString().slice(0, 10),
    };
    alumniState.profiles.push(profile);
    addAudit(actor, 'CREATE_ALUMNI_PROFILE', 'AlumniProfile', profile.fullName);
    saveDatabase();
    res.status(201).json(sanitizeAlumniProfile(profile));
  });

  app.put('/api/admin/alumni/profiles/reorder', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    alumniState.profiles = applyReorderIds(alumniState.profiles, orderedIds);
    addAudit(actor, 'REORDER_ALUMNI_PROFILES', 'AlumniProfile', `${orderedIds.length} profiles reordered`);
    saveDatabase();
    res.json(stripAlumniCredentials(alumniState.profiles));
  });

  app.put('/api/admin/alumni/profiles/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const id = Number(req.params.id);
    const prof = alumniState.profiles.find((p) => p.id === id);
    if (!prof) {
      res.status(404).json({ error: 'Alumni profile not found.' });
      return;
    }
    const patch = req.body as Partial<AlumniProfile> & { newPassword?: string; password?: string };
    const { newPassword, password, passwordHash: _ignoredHash, ...restPatch } = patch;
    Object.assign(prof, restPatch);
    const nextPw = String(newPassword || password || '').trim();
    if (nextPw) {
      if (nextPw.length < 6) {
        res.status(400).json({ error: 'New alumni password must be at least 6 characters.' });
        return;
      }
      prof.passwordHash = hashPassword(nextPw);
    }
    if (patch.departmentCode) {
      const matchedDept = db.departments.find((d) => d.code === patch.departmentCode);
      if (matchedDept) prof.departmentName = matchedDept.name;
    }
    addAudit(actor, 'UPDATE_ALUMNI_PROFILE', 'AlumniProfile', prof.fullName);
    saveDatabase();
    res.json(sanitizeAlumniProfile(prof));
  });

  app.put('/api/admin/alumni/profiles/:id/status', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const id = Number(req.params.id);
    const prof = alumniState.profiles.find((p) => p.id === id);
    if (!prof) {
      res.status(404).json({ error: 'Alumni profile not found.' });
      return;
    }
    const { status } = req.body as { status?: AlumniApprovalStatus };
    if (!status || !['approved', 'pending', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }
    prof.status = status;
    addAudit(actor, `ALUMNI_${status.toUpperCase()}`, 'AlumniProfile', prof.fullName);
    saveDatabase();
    res.json(prof);
  });

  app.delete('/api/admin/alumni/profiles/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const id = Number(req.params.id);
    const idx = alumniState.profiles.findIndex((p) => p.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Alumni profile not found.' });
      return;
    }
    const [removed] = alumniState.profiles.splice(idx, 1);
    addAudit(actor, 'DELETE_ALUMNI_PROFILE', 'AlumniProfile', removed.fullName);
    saveDatabase();
    res.json({ ok: true });
  });

  app.post('/api/admin/alumni/jobs', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const body = req.body as Partial<AlumniJob>;
    const check = validateAlumniJobInput(body);
    if (!check.valid) {
      res.status(400).json({ error: check.reason });
      return;
    }
    const nextId = Math.max(0, ...alumniState.jobs.map((j) => j.id)) + 1;
    const nextSort = Math.max(0, ...alumniState.jobs.map((j) => j.sortOrder)) + 1;
    const job: AlumniJob = {
      id: nextId,
      title: String(body.title).trim(),
      company: String(body.company).trim(),
      location: String(body.location || 'India').trim(),
      jobType: (body.jobType || 'Full-Time') as AlumniJob['jobType'],
      departmentFocus: String(body.departmentFocus || 'All Branches').trim(),
      experienceRange: String(body.experienceRange || '0–2 Years').trim(),
      compensation: String(body.compensation || '').trim(),
      description: String(body.description || '').trim(),
      applyUrlOrEmail: String(body.applyUrlOrEmail).trim(),
      postedByAlumniName: String(body.postedByAlumniName).trim(),
      postedByBatch: String(body.postedByBatch || '').trim(),
      deadlineDate: String(body.deadlineDate || '').trim(),
      status: (body.status || 'open') as AlumniJobStatus,
      postedAt: new Date().toISOString().slice(0, 10),
      sortOrder: Number(body.sortOrder ?? nextSort),
    };
    alumniState.jobs.push(job);
    addAudit(actor, 'CREATE_ALUMNI_JOB', 'AlumniJob', `${job.title} (${job.company})`);
    saveDatabase();
    res.status(201).json(job);
  });

  app.put('/api/admin/alumni/jobs/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const id = Number(req.params.id);
    const job = alumniState.jobs.find((j) => j.id === id);
    if (!job) {
      res.status(404).json({ error: 'Alumni job not found.' });
      return;
    }
    Object.assign(job, req.body);
    addAudit(actor, 'UPDATE_ALUMNI_JOB', 'AlumniJob', job.title);
    saveDatabase();
    res.json(job);
  });

  app.put('/api/admin/alumni/jobs/:id/status', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const id = Number(req.params.id);
    const job = alumniState.jobs.find((j) => j.id === id);
    if (!job) {
      res.status(404).json({ error: 'Alumni job not found.' });
      return;
    }
    const { status } = req.body as { status?: AlumniJobStatus };
    if (!status || !['open', 'closed', 'pending'].includes(status)) {
      res.status(400).json({ error: 'Invalid job status.' });
      return;
    }
    job.status = status;
    addAudit(actor, `ALUMNI_JOB_${status.toUpperCase()}`, 'AlumniJob', job.title);
    saveDatabase();
    res.json(job);
  });

  app.delete('/api/admin/alumni/jobs/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const id = Number(req.params.id);
    const idx = alumniState.jobs.findIndex((j) => j.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Alumni job not found.' });
      return;
    }
    const [removed] = alumniState.jobs.splice(idx, 1);
    addAudit(actor, 'DELETE_ALUMNI_JOB', 'AlumniJob', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  app.post('/api/admin/alumni/events', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const body = req.body as Partial<AlumniEventChapter>;
    if (!body.title || !String(body.title).trim()) {
      res.status(400).json({ error: 'Event title is required.' });
      return;
    }
    const nextId = Math.max(0, ...alumniState.events.map((e) => e.id)) + 1;
    const nextSort = Math.max(0, ...alumniState.events.map((e) => e.sortOrder)) + 1;
    const ev: AlumniEventChapter = {
      id: nextId,
      title: String(body.title).trim(),
      chapter: String(body.chapter || 'Pandharpur Home Chapter').trim(),
      eventDate: String(body.eventDate || new Date().toISOString().slice(0, 10)).trim(),
      venue: String(body.venue || 'Campus Auditorium').trim(),
      organizer: String(body.organizer || 'Alumni Association').trim(),
      description: String(body.description || '').trim(),
      bannerUrl: String(body.bannerUrl || '/src/assets/images/campus_convocation_1794512597749.jpg').trim(),
      registrationUrl: body.registrationUrl ? String(body.registrationUrl).trim() : '',
      rsvpCount: Number(body.rsvpCount ?? 0),
      isActive: body.isActive !== false,
      sortOrder: Number(body.sortOrder ?? nextSort),
    };
    alumniState.events.push(ev);
    addAudit(actor, 'CREATE_ALUMNI_EVENT', 'AlumniEvent', ev.title);
    saveDatabase();
    res.status(201).json(ev);
  });

  app.put('/api/admin/alumni/events/reorder', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required.' });
      return;
    }
    alumniState.events = applyReorderIds(alumniState.events, orderedIds);
    addAudit(actor, 'REORDER_ALUMNI_EVENTS', 'AlumniEvent', `${orderedIds.length} events reordered`);
    saveDatabase();
    res.json(alumniState.events);
  });

  app.put('/api/admin/alumni/events/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const id = Number(req.params.id);
    const ev = alumniState.events.find((e) => e.id === id);
    if (!ev) {
      res.status(404).json({ error: 'Alumni event not found.' });
      return;
    }
    Object.assign(ev, req.body);
    addAudit(actor, 'UPDATE_ALUMNI_EVENT', 'AlumniEvent', ev.title);
    saveDatabase();
    res.json(ev);
  });

  app.delete('/api/admin/alumni/events/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const id = Number(req.params.id);
    const idx = alumniState.events.findIndex((e) => e.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Alumni event not found.' });
      return;
    }
    const [removed] = alumniState.events.splice(idx, 1);
    addAudit(actor, 'DELETE_ALUMNI_EVENT', 'AlumniEvent', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  app.put('/api/admin/alumni/settings', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    alumniState.settings = {
      ...alumniState.settings,
      ...(req.body as Partial<AlumniData['settings']>),
    };
    addAudit(actor, 'UPDATE_ALUMNI_SETTINGS', 'AlumniSettings', 'Portal Configuration');
    saveDatabase();
    res.json(alumniState.settings);
  });

  // Alumni Discussion Topics & Blogger Posts Admin Moderation
  app.post('/api/admin/alumni/topics', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const { title, description, isActive } = req.body as Partial<AlumniDiscussionTopic>;
    if (!title || !String(title).trim()) {
      res.status(400).json({ error: 'Discussion topic title is required.' });
      return;
    }
    const topics = alumniState.discussionTopics ?? [];
    const nextId = Math.max(0, ...topics.map((t) => t.id)) + 1;
    const nextSort = Math.max(0, ...topics.map((t) => t.sortOrder)) + 1;
    const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `topic-${nextId}`;
    const created: AlumniDiscussionTopic = {
      id: nextId,
      slug,
      title: String(title).trim(),
      description: String(description || '').trim(),
      isActive: isActive !== false,
      sortOrder: nextSort,
    };
    topics.push(created);
    alumniState.discussionTopics = topics;
    addAudit(actor, 'CREATE_ALUMNI_TOPIC', 'AlumniTopic', created.title);
    saveDatabase();
    res.status(201).json(created);
  });

  app.put('/api/admin/alumni/topics/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const topic = (alumniState.discussionTopics ?? []).find((t) => t.id === Number(req.params.id));
    if (!topic) {
      res.status(404).json({ error: 'Discussion topic not found.' });
      return;
    }
    if (req.body.title !== undefined) topic.title = String(req.body.title).trim();
    if (req.body.description !== undefined) topic.description = String(req.body.description).trim();
    if (req.body.isActive !== undefined) topic.isActive = Boolean(req.body.isActive);
    if (req.body.sortOrder !== undefined) topic.sortOrder = Number(req.body.sortOrder);
    addAudit(actor, 'UPDATE_ALUMNI_TOPIC', 'AlumniTopic', topic.title);
    saveDatabase();
    res.json(topic);
  });

  app.delete('/api/admin/alumni/topics/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const topics = alumniState.discussionTopics ?? [];
    const idx = topics.findIndex((t) => t.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Discussion topic not found.' });
      return;
    }
    const [removed] = topics.splice(idx, 1);
    alumniState.discussions = (alumniState.discussions ?? []).filter((p) => p.topicId !== removed.id);
    addAudit(actor, 'DELETE_ALUMNI_TOPIC', 'AlumniTopic', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  app.put('/api/admin/alumni/discussions/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const post = (alumniState.discussions ?? []).find((p) => p.id === Number(req.params.id));
    if (!post) {
      res.status(404).json({ error: 'Discussion post not found.' });
      return;
    }
    if (req.body.status && ['approved', 'pending', 'rejected'].includes(String(req.body.status))) {
      post.status = req.body.status as AlumniApprovalStatus;
    }
    if (req.body.isPinned !== undefined) post.isPinned = Boolean(req.body.isPinned);
    if (req.body.title !== undefined) post.title = String(req.body.title).trim();
    if (req.body.content !== undefined) post.content = String(req.body.content).trim();
    if (req.body.topicId !== undefined) post.topicId = Number(req.body.topicId);
    post.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    addAudit(actor, 'MODERATE_ALUMNI_POST', 'AlumniDiscussion', `${post.title} (${post.status})`);
    saveDatabase();
    res.json(post);
  });

  app.delete('/api/admin/alumni/discussions/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const posts = alumniState.discussions ?? [];
    const idx = posts.findIndex((p) => p.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Discussion post not found.' });
      return;
    }
    const [removed] = posts.splice(idx, 1);
    addAudit(actor, 'DELETE_ALUMNI_POST', 'AlumniDiscussion', removed.title);
    saveDatabase();
    res.json({ ok: true });
  });

  app.delete('/api/admin/alumni/discussions/:postId/comments/:commentId', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const post = (alumniState.discussions ?? []).find((p) => p.id === Number(req.params.postId));
    if (!post) {
      res.status(404).json({ error: 'Discussion post not found.' });
      return;
    }
    const idx = post.comments.findIndex((c) => c.id === Number(req.params.commentId));
    if (idx === -1) {
      res.status(404).json({ error: 'Comment not found.' });
      return;
    }
    post.comments.splice(idx, 1);
    addAudit(actor, 'DELETE_ALUMNI_COMMENT', 'AlumniDiscussion', post.title);
    saveDatabase();
    res.json({ ok: true });
  });

  // Alumni Distinguished Achievers & Endowment Pledges Admin CRUD
  app.post('/api/admin/alumni/achievers', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const b = req.body as Partial<AlumniAchiever>;
    if (!b.fullName || !b.awardTitle) {
      res.status(400).json({ error: 'Achiever full name and award title are required.' });
      return;
    }
    alumniState.achievers = alumniState.achievers ?? [];
    const nextId = Math.max(0, ...alumniState.achievers.map((a) => a.id)) + 1;
    const nextSort = Math.max(0, ...alumniState.achievers.map((a) => a.sortOrder)) + 1;
    const created: AlumniAchiever = {
      id: nextId,
      fullName: String(b.fullName).trim(),
      batchYear: Number(b.batchYear || 2015),
      departmentCode: String(b.departmentCode || 'CSE').trim(),
      designation: String(b.designation || 'Alumni Leader').trim(),
      organization: String(b.organization || 'Industry Partner').trim(),
      awardTitle: String(b.awardTitle).trim(),
      citation: String(b.citation || '').trim(),
      photoUrl: String(b.photoUrl || '/src/assets/images/leadership_principal_1794512597061.jpg').trim(),
      linkedinUrl: b.linkedinUrl ? String(b.linkedinUrl).trim() : '',
      sortOrder: Number(b.sortOrder ?? nextSort),
    };
    alumniState.achievers.push(created);
    addAudit(actor, 'CREATE_ALUMNI_ACHIEVER', 'AlumniAchiever', created.fullName);
    saveDatabase();
    res.status(201).json(created);
  });

  app.put('/api/admin/alumni/achievers/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const item = (alumniState.achievers ?? []).find((a) => a.id === Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: 'Alumni achiever not found.' });
      return;
    }
    Object.assign(item, req.body);
    addAudit(actor, 'UPDATE_ALUMNI_ACHIEVER', 'AlumniAchiever', item.fullName);
    saveDatabase();
    res.json(item);
  });

  app.delete('/api/admin/alumni/achievers/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const list = alumniState.achievers ?? [];
    const idx = list.findIndex((a) => a.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Alumni achiever not found.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    addAudit(actor, 'DELETE_ALUMNI_ACHIEVER', 'AlumniAchiever', removed.fullName);
    saveDatabase();
    res.json({ ok: true });
  });

  app.put('/api/admin/alumni/pledges/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const pledge = (alumniState.pledges ?? []).find((p) => p.id === Number(req.params.id));
    if (!pledge) {
      res.status(404).json({ error: 'Endowment pledge not found.' });
      return;
    }
    if (req.body.status && ['pending', 'acknowledged', 'fulfilled'].includes(String(req.body.status))) {
      pledge.status = req.body.status;
    }
    addAudit(actor, 'UPDATE_ALUMNI_PLEDGE', 'AlumniPledge', `${pledge.fullName} (${pledge.status})`);
    saveDatabase();
    res.json(pledge);
  });

  app.delete('/api/admin/alumni/pledges/:id', requireAdmin('alumni'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const alumniState = ensureAlumniState();
    const list = alumniState.pledges ?? [];
    const idx = list.findIndex((p) => p.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Endowment pledge not found.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    addAudit(actor, 'DELETE_ALUMNI_PLEDGE', 'AlumniPledge', removed.fullName);
    saveDatabase();
    res.json({ ok: true });
  });

  // ============================================================================
  // INTERNATIONAL & NATIONAL CONFERENCES ADMIN CRUD + REVIEW WORKFLOW
  // ============================================================================
  app.post('/api/admin/conferences', requireAdmin('conferences'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const b = req.body as Partial<Conference>;
    if (!b.title || !b.shortName) {
      res.status(400).json({ error: 'Conference title and short name are required.' });
      return;
    }
    db.conferences = db.conferences ?? [];
    const cleanSlug = (b.slug && String(b.slug).trim() ? String(b.slug) : String(b.shortName))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `conf-${Date.now()}`;
    if (db.conferences.some((c) => c.slug === cleanSlug)) {
      res.status(409).json({ error: `Conference slug "${cleanSlug}" already exists.` });
      return;
    }
    const nextId = Math.max(0, ...db.conferences.map((c) => c.id)) + 1;
    const nextSort = Math.max(0, ...db.conferences.map((c) => c.sortOrder)) + 1;
    const created: Conference = {
      id: nextId,
      slug: cleanSlug,
      title: String(b.title).trim(),
      shortName: String(b.shortName).trim(),
      scope: String(b.scope || 'International Conference').trim(),
      theme: String(b.theme || '').trim(),
      startDate: String(b.startDate || new Date().toISOString().slice(0, 10)).trim(),
      endDate: String(b.endDate || b.startDate || new Date().toISOString().slice(0, 10)).trim(),
      venue: String(b.venue || "SVERI's COE Auditorium, Pandharpur").trim(),
      mode: String(b.mode || 'Hybrid (On-Campus + Online)').trim(),
      organizingDepartment: String(b.organizingDepartment || 'All Engineering Departments').trim(),
      indexingPartners: Array.isArray(b.indexingPartners) ? b.indexingPartners.map(String) : [],
      contactEmail: String(b.contactEmail || 'conference@coe.sveri.ac.in').trim(),
      contactPhone: String(b.contactPhone || '+91-02186-216063').trim(),
      bannerUrl: String(b.bannerUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg').trim(),
      heroSlides:
        Array.isArray(b.heroSlides) && b.heroSlides.length > 0
          ? b.heroSlides
          : [
              {
                id: 1,
                title: String(b.title).trim(),
                caption: String(b.theme || b.venue || 'Research Program & Technical Sessions').trim(),
                imageUrl: String(b.bannerUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg').trim(),
                ctaLabel: 'Register / Submit Paper',
                ctaLink: `#register`,
              },
            ],
      brochureUrl: b.brochureUrl ? String(b.brochureUrl).trim() : '',
      templateUrl: b.templateUrl ? String(b.templateUrl).trim() : '',
      overviewHtml: String(b.overviewHtml || '<p>Conference overview and technical scope.</p>'),
      cfpHtml: String(b.cfpHtml || '<p>Original unpublished research papers are invited.</p>'),
      isPublished: b.isPublished !== false,
      isFeatured: Boolean(b.isFeatured ?? true),
      sortOrder: Number(b.sortOrder ?? nextSort),
      tracks: Array.isArray(b.tracks) ? b.tracks : [],
      importantDates: Array.isArray(b.importantDates) ? b.importantDates : [],
      people: Array.isArray(b.people) ? b.people : [],
      schedule: Array.isArray(b.schedule) ? b.schedule : [],
      feeTiers: Array.isArray(b.feeTiers) ? b.feeTiers : [],
    };
    db.conferences.push(created);
    addAudit(actor, 'CREATE_CONFERENCE', 'Conference', `${created.shortName} (${created.scope})`);
    saveDatabase();
    res.status(201).json(created);
  });

  app.put('/api/admin/conferences/research-slider', requireAdmin('conferences'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const incoming = req.body as { researchSliderSlides?: unknown[] };
    if (!Array.isArray(incoming.researchSliderSlides)) {
      res.status(400).json({ error: 'researchSliderSlides array is required.' });
      return;
    }
    const cleanSlides = incoming.researchSliderSlides.map((s: any, idx: number) => ({
      id: Number(s?.id) || idx + 1,
      title: String(s?.title || '').trim(),
      caption: String(s?.caption || '').trim(),
      imageUrl: String(s?.imageUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg').trim(),
      ctaLabel: s?.ctaLabel ? String(s.ctaLabel).trim() : '',
      ctaLink: s?.ctaLink ? String(s.ctaLink).trim() : '',
    }));
    db.settings = {
      ...db.settings,
      researchSliderSlides: cleanSlides,
    };
    addAudit(actor, 'UPDATE_RESEARCH_SLIDER', 'Settings', `${cleanSlides.length} slides`);
    saveDatabase();
    res.json({ ok: true, researchSliderSlides: cleanSlides });
  });

  app.put('/api/admin/conferences/:id', requireAdmin('conferences'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const conf = (db.conferences ?? []).find((c) => c.id === Number(req.params.id));
    if (!conf) {
      res.status(404).json({ error: 'Conference not found.' });
      return;
    }
    const patch = req.body as Partial<Conference>;
    const { id: _ignoreId, ...rest } = patch;
    Object.assign(conf, rest);
    addAudit(actor, 'UPDATE_CONFERENCE', 'Conference', conf.shortName);
    saveDatabase();
    res.json(conf);
  });

  app.delete('/api/admin/conferences/:id', requireAdmin('conferences'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const list = db.conferences ?? [];
    const idx = list.findIndex((c) => c.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Conference not found.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    db.conferenceSubmissions = (db.conferenceSubmissions ?? []).filter((s) => s.conferenceId !== removed.id);
    db.conferenceRegistrations = (db.conferenceRegistrations ?? []).filter((r) => r.conferenceId !== removed.id);
    addAudit(actor, 'DELETE_CONFERENCE', 'Conference', removed.shortName);
    saveDatabase();
    res.json({ ok: true });
  });

  app.put('/api/admin/conferences/:id/submissions/:subId', requireAdmin('conferences'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const sub = (db.conferenceSubmissions ?? []).find(
      (s) => s.id === Number(req.params.subId) && s.conferenceId === Number(req.params.id),
    );
    if (!sub) {
      res.status(404).json({ error: 'Paper submission not found.' });
      return;
    }
    const { status, reviewerNote } = req.body as { status?: ConferencePaperStatus; reviewerNote?: string };
    if (status && ['submitted', 'under_review', 'accepted', 'revision_required', 'rejected'].includes(status)) {
      sub.status = status;
    }
    if (reviewerNote !== undefined) sub.reviewerNote = String(reviewerNote).trim();
    addAudit(actor, 'REVIEW_CONF_PAPER', 'ConferencePaper', `${sub.trackingCode} -> ${sub.status}`);
    saveDatabase();
    res.json(sub);
  });

  app.delete('/api/admin/conferences/:id/submissions/:subId', requireAdmin('conferences'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const list = db.conferenceSubmissions ?? [];
    const idx = list.findIndex(
      (s) => s.id === Number(req.params.subId) && s.conferenceId === Number(req.params.id),
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Paper submission not found.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    addAudit(actor, 'DELETE_CONF_PAPER', 'ConferencePaper', removed.trackingCode);
    saveDatabase();
    res.json({ ok: true });
  });

  app.put('/api/admin/conferences/:id/registrations/:regId', requireAdmin('conferences'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const reg = (db.conferenceRegistrations ?? []).find(
      (r) => r.id === Number(req.params.regId) && r.conferenceId === Number(req.params.id),
    );
    if (!reg) {
      res.status(404).json({ error: 'Delegate registration not found.' });
      return;
    }
    if (req.body.status && ['registered', 'verified', 'cancelled'].includes(String(req.body.status))) {
      reg.status = req.body.status;
    }
    addAudit(actor, 'UPDATE_CONF_REG', 'ConferenceReg', `${reg.regCode} -> ${reg.status}`);
    saveDatabase();
    res.json(reg);
  });

  app.delete('/api/admin/conferences/:id/registrations/:regId', requireAdmin('conferences'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const list = db.conferenceRegistrations ?? [];
    const idx = list.findIndex(
      (r) => r.id === Number(req.params.regId) && r.conferenceId === Number(req.params.id),
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Delegate registration not found.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    addAudit(actor, 'DELETE_CONF_REG', 'ConferenceReg', removed.regCode);
    saveDatabase();
    res.json({ ok: true });
  });

  // ============================================================================
  // TRAINING & PLACEMENT CELL + GRIEVANCE REDRESSAL ADMIN ROUTES
  // ============================================================================
  function ensurePlacementsState() {
    if (!db.placements) {
      db.placements = createSeedDatabase().placements!;
    }
    return db.placements;
  }

  app.put('/api/admin/placements/settings', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    const { summaryNote, coordinatorName, coordinatorEmail, coordinatorPhone } = req.body;
    if (summaryNote !== undefined) pl.summaryNote = String(summaryNote);
    if (coordinatorName !== undefined) pl.coordinatorName = String(coordinatorName);
    if (coordinatorEmail !== undefined) pl.coordinatorEmail = String(coordinatorEmail);
    if (coordinatorPhone !== undefined) pl.coordinatorPhone = String(coordinatorPhone);
    addAudit(actor, 'UPDATE_PLACEMENT_INFO', 'Placements', pl.coordinatorName);
    saveDatabase();
    res.json(pl);
  });

  app.post('/api/admin/placements/stats', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    const b = req.body as Partial<PlacementYearStat>;
    if (!b.academicYear || !b.branch) {
      res.status(400).json({ error: 'Academic year and branch are required.' });
      return;
    }
    const nextId = Math.max(0, ...pl.stats.map((s) => s.id)) + 1;
    const stat: PlacementYearStat = {
      id: nextId,
      academicYear: String(b.academicYear).trim(),
      branch: String(b.branch).trim(),
      eligibleStudents: Number(b.eligibleStudents || 60),
      placedStudents: Number(b.placedStudents || 50),
      highestPackageLpa: Number(b.highestPackageLpa || 10),
      averagePackageLpa: Number(b.averagePackageLpa || 4.8),
      topRecruitersList: String(b.topRecruitersList || '').trim(),
      sortOrder: Number(b.sortOrder ?? pl.stats.length + 1),
    };
    pl.stats.push(stat);
    addAudit(actor, 'CREATE_PLACEMENT_STAT', 'Placements', `${stat.branch} (${stat.academicYear})`);
    saveDatabase();
    res.status(201).json(stat);
  });

  app.put('/api/admin/placements/stats/:id', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    const item = pl.stats.find((s) => s.id === Number(req.params.id));
    if (!item) {
      res.status(404).json({ error: 'Placement stat not found.' });
      return;
    }
    Object.assign(item, req.body);
    addAudit(actor, 'UPDATE_PLACEMENT_STAT', 'Placements', item.branch);
    saveDatabase();
    res.json(item);
  });

  app.delete('/api/admin/placements/stats/:id', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    const idx = pl.stats.findIndex((s) => s.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Placement stat not found.' });
      return;
    }
    const [removed] = pl.stats.splice(idx, 1);
    addAudit(actor, 'DELETE_PLACEMENT_STAT', 'Placements', removed.branch);
    saveDatabase();
    res.json({ ok: true });
  });

  app.post('/api/admin/placements/stories', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    const b = req.body as Partial<PlacementStory>;
    if (!b.studentName || !b.company) {
      res.status(400).json({ error: 'Student name and company are required.' });
      return;
    }
    const nextId = Math.max(0, ...pl.stories.map((s) => s.id)) + 1;
    const story: PlacementStory = {
      id: nextId,
      studentName: String(b.studentName).trim(),
      branch: String(b.branch || 'B.Tech').trim(),
      company: String(b.company).trim(),
      packageLpa: String(b.packageLpa || '').trim(),
      batchYear: String(b.batchYear || '2026').trim(),
      photoUrl: String(b.photoUrl || '/src/assets/images/campus_convocation_1794512597749.jpg').trim(),
      quote: String(b.quote || '').trim(),
      sortOrder: Number(b.sortOrder ?? pl.stories.length + 1),
    };
    pl.stories.push(story);
    addAudit(actor, 'CREATE_PLACEMENT_STORY', 'Placements', story.studentName);
    saveDatabase();
    res.status(201).json(story);
  });

  app.delete('/api/admin/placements/stories/:id', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    const idx = pl.stories.findIndex((s) => s.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Placement story not found.' });
      return;
    }
    const [removed] = pl.stories.splice(idx, 1);
    addAudit(actor, 'DELETE_PLACEMENT_STORY', 'Placements', removed.studentName);
    saveDatabase();
    res.json({ ok: true });
  });

  app.put('/api/admin/grievances/:id', requireAdmin('grievances'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const ticket = (db.grievances ?? []).find((g) => g.id === Number(req.params.id));
    if (!ticket) {
      res.status(404).json({ error: 'Grievance ticket not found.' });
      return;
    }
    const { status, resolutionNote } = req.body as { status?: GrievanceStatus; resolutionNote?: string };
    if (status && ['submitted', 'in_review', 'resolved', 'closed'].includes(status)) {
      ticket.status = status;
    }
    if (resolutionNote !== undefined) ticket.resolutionNote = String(resolutionNote).trim();
    ticket.updatedAt = new Date().toISOString().slice(0, 10);
    addAudit(actor, 'UPDATE_GRIEVANCE', 'Grievance', `${ticket.ticketCode} -> ${ticket.status}`);
    saveDatabase();
    res.json(ticket);
  });

  app.delete('/api/admin/grievances/:id', requireAdmin('grievances'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const list = db.grievances ?? [];
    const idx = list.findIndex((g) => g.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Grievance ticket not found.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    addAudit(actor, 'DELETE_GRIEVANCE', 'Grievance', removed.ticketCode);
    saveDatabase();
    res.json({ ok: true });
  });

  app.put('/api/admin/grievances/config', requireAdmin('grievances'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const cur = db.settings.grievancePortal || DEFAULT_GRIEVANCE_PORTAL_CONFIG;
    const incoming = req.body || {};
    db.settings = {
      ...db.settings,
      grievancePortal: {
        ...cur,
        ...incoming,
        committeeMembers: Array.isArray(incoming.committeeMembers)
          ? incoming.committeeMembers
          : cur.committeeMembers,
      },
    };
    addAudit(actor, 'UPDATE_GRIEVANCE_CONFIG', 'Grievance', 'Updated SGRC & Anti-Ragging Portal Config');
    saveDatabase();
    res.json(db.settings.grievancePortal);
  });

  app.put('/api/admin/placements/stats/reorder', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (Array.isArray(orderedIds)) {
      orderedIds.forEach((id, idx) => {
        const s = pl.stats.find((x) => x.id === Number(id));
        if (s) s.sortOrder = idx + 1;
      });
      pl.stats.sort((a, b) => a.sortOrder - b.sortOrder);
      addAudit(actor, 'REORDER_PLACEMENT_STATS', 'Placements', 'Updated placement stats order');
      saveDatabase();
    }
    res.json(pl.stats);
  });

  app.put('/api/admin/placements/stories/reorder', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (Array.isArray(orderedIds)) {
      orderedIds.forEach((id, idx) => {
        const s = pl.stories.find((x) => x.id === Number(id));
        if (s) s.sortOrder = idx + 1;
      });
      pl.stories.sort((a, b) => a.sortOrder - b.sortOrder);
      addAudit(actor, 'REORDER_PLACEMENT_STORIES', 'Placements', 'Updated placement stories order');
      saveDatabase();
    }
    res.json(pl.stories);
  });

  app.put('/api/admin/placements/stories/:id', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    const story = pl.stories.find((s) => s.id === Number(req.params.id));
    if (!story) {
      res.status(404).json({ error: 'Placement story not found.' });
      return;
    }
    Object.assign(story, req.body);
    addAudit(actor, 'UPDATE_PLACEMENT_STORY', 'Placements', story.studentName);
    saveDatabase();
    res.json(story);
  });

  app.put('/api/admin/placements/recruiters', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { recruiters } = req.body as { recruiters?: string[] };
    if (Array.isArray(recruiters)) {
      db.settings.recruiters = recruiters.map((r) => String(r).trim()).filter(Boolean);
      addAudit(actor, 'UPDATE_RECRUITERS', 'Placements', `${db.settings.recruiters.length} recruiters`);
      saveDatabase();
    }
    res.json({ recruiters: db.settings.recruiters || [] });
  });

  app.post('/api/admin/placements/drives', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    pl.upcomingDrives = pl.upcomingDrives ?? [];
    const b = req.body;
    if (!b.company || !b.roleTitle) {
      res.status(400).json({ error: 'Company name and role title are required.' });
      return;
    }
    const nextId = Math.max(0, ...pl.upcomingDrives.map((d) => d.id)) + 1;
    const drive = {
      id: nextId,
      company: String(b.company).trim(),
      roleTitle: String(b.roleTitle).trim(),
      packageLpa: String(b.packageLpa || 'Competitive').trim(),
      driveDate: String(b.driveDate || new Date().toISOString().slice(0, 10)).trim(),
      eligibleBranches: String(b.eligibleBranches || 'All B.Tech Branches').trim(),
      applyUrl: b.applyUrl ? String(b.applyUrl).trim() : '',
      status: (b.status === 'ongoing' || b.status === 'completed' ? b.status : 'upcoming') as 'upcoming' | 'ongoing' | 'completed',
      sortOrder: pl.upcomingDrives.length + 1,
    };
    pl.upcomingDrives.push(drive);
    addAudit(actor, 'CREATE_PLACEMENT_DRIVE', 'Placements', drive.company);
    saveDatabase();
    res.status(201).json(drive);
  });

  app.delete('/api/admin/placements/drives/:id', requireAdmin('placements'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const pl = ensurePlacementsState();
    pl.upcomingDrives = pl.upcomingDrives ?? [];
    const idx = pl.upcomingDrives.findIndex((d) => d.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Placement drive not found.' });
      return;
    }
    const [removed] = pl.upcomingDrives.splice(idx, 1);
    addAudit(actor, 'DELETE_PLACEMENT_DRIVE', 'Placements', removed.company);
    saveDatabase();
    res.json({ ok: true });
  });

  // Complete Website Migration Package (.zip: Code + DB + Uploaded Photos/Media)
  function collectFilesForMigrationZip(
    rootDir: string,
    relSubdir: string,
    archivePrefix: string,
    excludeDirs: Set<string>,
    excludeFiles: Set<string>,
  ): ZipInputEntry[] {
    const out: ZipInputEntry[] = [];
    const startDir = relSubdir ? path.join(rootDir, relSubdir) : rootDir;
    if (!fs.existsSync(startDir)) return out;

    const walk = (absDir: string, currentRel: string) => {
      const items = fs.readdirSync(absDir, { withFileTypes: true });
      for (const item of items) {
        const nextRel = currentRel ? `${currentRel}/${item.name}` : item.name;
        const absPath = path.join(absDir, item.name);
        if (item.isDirectory()) {
          if (excludeDirs.has(item.name) || excludeDirs.has(nextRel)) continue;
          walk(absPath, nextRel);
        } else if (item.isFile()) {
          if (excludeFiles.has(item.name) || excludeFiles.has(nextRel)) continue;
          if (item.name.startsWith('.env')) continue;
          const entryName = archivePrefix ? `${archivePrefix}/${nextRel}` : nextRel;
          out.push({ name: entryName, data: fs.readFileSync(absPath) });
        }
      }
    };

    walk(startDir, '');
    return out;
  }

  app.post('/api/admin/backups/export-site', requireAdmin('settings'), async (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const rootDir = process.cwd();
    const now = new Date();
    const createdAt = now.toISOString();
    const stamp = createdAt.replace(/[:.]/g, '-').slice(0, 19);
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0].trim();
    const sourceOrigin = `${proto}://${host}`;
    const sourceBaseUrl = String(req.body?.sourceBaseUrl || sourceOrigin).trim().replace(/\/+$/, '');

    const includeData = req.body?.includeData !== false;
    const includeMedia = req.body?.includeMedia !== false;
    const includeCode = req.body?.includeCode !== false;
    const rawDest = String(req.body?.destination || 'local');
    const destination: BackupDestination =
      rawDest === 'scp' || rawDest === 'webhook' ? rawDest : 'local';

    if (!includeData && !includeMedia && !includeCode) {
      res.status(400).json({ error: 'Select at least one component (Data/Credentials, Images/Uploads, or Codebase) to package.' });
      return;
    }

    const excludeDirs = new Set([
      'node_modules',
      'dist',
      '.git',
      '.playwright-cli',
      '.aistudio',
      'data',
      'php-cms/backups',
      'backups',
      'public/uploads',
      'src/assets/images',
    ]);
    const excludeFiles = new Set([
      'php-cms/config/config.local.php',
      'config.local.php',
    ]);

    const entries: ZipInputEntry[] = [];
    // 1. Source Code Directories & Root Configs (optional)
    if (includeCode) {
      for (const dir of ['src', 'public', 'php-cms']) {
        const prefix = `code/${dir}`;
        entries.push(...collectFilesForMigrationZip(rootDir, dir, prefix, excludeDirs, excludeFiles));
      }
      for (const rootFile of ['server.ts', 'package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'metadata.json', '.env.example']) {
        const full = path.join(rootDir, rootFile);
        if (fs.existsSync(full) && fs.statSync(full).isFile()) {
          entries.push({ name: `code/${rootFile}`, data: fs.readFileSync(full) });
        }
      }
    }
    const codeFilesCount = entries.length;

    // 2. Uploaded Photos, PDFs & Institutional Media Assets (optional)
    const mediaFiles: string[] = [];
    if (includeMedia) {
      if (fs.existsSync(UPLOAD_DIR)) {
        for (const fn of fs.readdirSync(UPLOAD_DIR)) {
          const full = path.join(UPLOAD_DIR, fn);
          if (fs.statSync(full).isFile()) {
            const entryName = `media/uploads/${fn}`;
            entries.push({ name: entryName, data: fs.readFileSync(full) });
            mediaFiles.push(entryName);
          }
        }
      }
      const assetsImgDir = path.join(rootDir, 'src', 'assets', 'images');
      if (fs.existsSync(assetsImgDir)) {
        for (const fn of fs.readdirSync(assetsImgDir)) {
          const full = path.join(assetsImgDir, fn);
          if (fs.statSync(full).isFile()) {
            const entryName = `media/assets/${fn}`;
            entries.push({ name: entryName, data: fs.readFileSync(full) });
            mediaFiles.push(entryName);
          }
        }
      }
    }

    // 3. Structured Database Snapshot JSON (includes hashed user & alumni credentials)
    let dbSha = crypto.createHash('sha256').update(createdAt).digest('hex');
    let databaseSummary: Record<string, number> = {};
    if (includeData) {
      const snapshotData = extractSnapshotData(db);
      databaseSummary = countDatabaseEntities(snapshotData);
      const dbPkg: BackupPackage = {
        format: 'svcoer-cms-backup',
        version: 1,
        mode: 'full',
        createdAt,
        data: snapshotData,
        uploadManifest: getUploadInventory(),
      };
      const rawDbJson = JSON.stringify(dbPkg, null, 2);
      dbSha = crypto.createHash('sha256').update(rawDbJson).digest('hex');
      dbPkg.sha256 = dbSha;
      const finalDbJson = JSON.stringify(dbPkg, null, 2);
      entries.push({ name: 'database-backup.json', data: Buffer.from(finalDbJson, 'utf-8') });
    }

    // 4. Migration Manifest
    const manifest: SiteMigrationManifest & {
      options?: { includeData: boolean; includeMedia: boolean; includeCode: boolean };
    } = {
      format: 'svcoer-full-site-migration',
      version: 1,
      createdAt,
      createdBy: actor.email,
      sourceOrigin,
      sourceBaseUrl,
      databaseSummary,
      mediaFiles,
      codeFilesCount,
      sha256: dbSha,
      options: { includeData, includeMedia, includeCode },
    };
    entries.push({
      name: 'migration-manifest.json',
      data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'),
    });

    const zipBuf = buildZipBuffer(entries);
    const zipSha = crypto.createHash('sha256').update(zipBuf).digest('hex');
    const prefixLabel = includeCode ? 'full-site' : 'data-media';
    const filename = `svcoer-${prefixLabel}-${stamp}.zip`;
    const filePath = path.join(BACKUP_DIR, filename);
    fs.writeFileSync(filePath, zipBuf);

    let remoteStatus: string | undefined;
    if (destination === 'scp') {
      const scpCfg: ScpConfig = {
        ...(db.backupSchedule?.scpConfig || { host: '', port: 22, username: '', remoteDir: '/var/backups/svcoer-cms' }),
        ...(req.body?.scpConfig || {}),
      };
      const transfer = await executeScpPush(filePath, scpCfg);
      remoteStatus = transfer.message;
    } else if (destination === 'webhook') {
      const hookUrl = String(req.body?.webhookUrl || db.backupSchedule?.webhookUrl || '');
      if (hookUrl) {
        const push = await pushWebhookBackup(hookUrl, {
          binaryArchive: { filename, buf: zipBuf, sha256: zipSha, archiveType: 'site-zip', createdAt },
        });
        remoteStatus = push.message;
      } else {
        remoteStatus = 'Webhook / Drive Script destination selected, but no URL configured.';
      }
    }

    const partsSummary = [
      includeCode ? `${codeFilesCount} code files` : null,
      includeMedia ? `${mediaFiles.length} media/photos` : null,
      includeData ? 'DB + hashed credentials' : null,
    ]
      .filter(Boolean)
      .join(' + ');

    const record: BackupRecord = {
      id: `site-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      createdAt,
      createdBy: actor.email,
      mode: 'full',
      destination,
      filename,
      sizeBytes: zipBuf.length,
      sha256: zipSha,
      notes: `Migration ZIP (${partsSummary})`,
      entityCounts: databaseSummary,
      remoteStatus,
      archiveType: 'site-zip',
      mediaCount: mediaFiles.length,
      codeCount: codeFilesCount,
    };

    db.backups = [record, ...(db.backups ?? [])];
    addAudit(actor, 'EXPORT_COMPLETE_SITE_ZIP', 'Backup', `${filename} (${partsSummary})`);
    saveDatabase();
    res.status(201).json({ record, manifest });
  });

  app.post('/api/admin/backups/inspect-site', requireAdmin('settings'), (req, res) => {
    const { base64Zip } = req.body as { base64Zip?: string };
    if (!base64Zip) {
      res.status(400).json({ error: 'Missing ZIP archive payload.' });
      return;
    }
    try {
      const cleanB64 = base64Zip.includes(',') ? base64Zip.split(',')[1] : base64Zip;
      const buf = Buffer.from(cleanB64, 'base64');
      const entries = parseZipBuffer(buf);
      const manifestEntry = entries.find((e) => e.name === 'migration-manifest.json');
      const dbEntry = entries.find(
        (e) => e.name === 'database-backup.json' || e.name === 'migration-data.json',
      );
      const manifest = manifestEntry
        ? (JSON.parse(manifestEntry.data.toString('utf-8')) as Partial<SiteMigrationManifest>)
        : null;
      const mediaEntries = entries.filter((e) => validateSafeRestoreAssetPath(e.name).safe);
      const codeEntries = entries.filter((e) => e.name.startsWith('code/'));

      if (!dbEntry && mediaEntries.length === 0) {
        res.status(400).json({ error: 'ZIP archive does not contain database-backup.json or restorable media files.' });
        return;
      }

      let dbSummary: Record<string, number> = {};
      let createdAt = manifest?.createdAt || '';
      if (dbEntry) {
        const parsedDb = JSON.parse(dbEntry.data.toString('utf-8')) as unknown;
        const dbValidation = validateBackupPackage(parsedDb);
        if (!dbValidation.valid) {
          res.status(400).json({ error: dbValidation.reason || 'Database snapshot inside ZIP is invalid.' });
          return;
        }
        dbSummary = dbValidation.entityCounts || {};
        createdAt = createdAt || dbValidation.pkg?.createdAt || '';
      }

      res.json({
        ok: true,
        sourceOrigin: manifest?.sourceOrigin || manifest?.sourceBaseUrl || '',
        createdAt,
        databaseSummary: dbSummary,
        mediaCount: mediaEntries.length,
        codeFilesCount: codeEntries.length,
        totalEntries: entries.length,
      });
    } catch (err) {
      res.status(400).json({ error: `Failed to inspect ZIP archive: ${(err as Error).message}` });
    }
  });

  app.post('/api/admin/backups/import-site', requireAdmin('settings'), async (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { base64Zip, oldDomainUrl, newDomainUrl, restoreMedia } = req.body as {
      base64Zip?: string;
      oldDomainUrl?: string;
      newDomainUrl?: string;
      restoreMedia?: boolean;
    };
    if (!base64Zip) {
      res.status(400).json({ error: 'Missing ZIP archive payload.' });
      return;
    }
    try {
      const cleanB64 = base64Zip.includes(',') ? base64Zip.split(',')[1] : base64Zip;
      const buf = Buffer.from(cleanB64, 'base64');
      const entries = parseZipBuffer(buf);
      const manifestEntry = entries.find((e) => e.name === 'migration-manifest.json');
      const dbEntry = entries.find(
        (e) => e.name === 'database-backup.json' || e.name === 'migration-data.json',
      );
      const mediaEntries = entries.filter((e) => validateSafeRestoreAssetPath(e.name).safe);
      if (!dbEntry && mediaEntries.length === 0) {
        res.status(400).json({ error: 'ZIP archive does not contain database-backup.json or media assets.' });
        return;
      }

      const manifest = manifestEntry
        ? (JSON.parse(manifestEntry.data.toString('utf-8')) as Partial<SiteMigrationManifest>)
        : null;

      let safetyFilename: string | null = null;
      let entityCounts: Record<string, number> = {};
      const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0].trim();
      const detectedOldUrl = (oldDomainUrl || manifest?.sourceBaseUrl || manifest?.sourceOrigin || '').trim();
      const targetNewUrl = (newDomainUrl || `${proto}://${host}`).trim();

      if (dbEntry) {
        const rawDbPayload = JSON.parse(dbEntry.data.toString('utf-8')) as unknown;
        const validation = validateBackupPackage(rawDbPayload);
        if (!validation.valid || !validation.pkg) {
          res.status(400).json({ error: validation.reason || 'Invalid database payload in ZIP.' });
          return;
        }

        const safetyBackup = await createBackupSnapshot({
          mode: 'full',
          destination: 'local',
          createdBy: actor.email,
          notes: 'Automatic pre-migration safety snapshot before Site ZIP Import',
        });
        safetyFilename = safetyBackup.filename;

        let pkgToRestore = validation.pkg;
        if (detectedOldUrl && targetNewUrl && detectedOldUrl !== targetNewUrl) {
          pkgToRestore = {
            ...validation.pkg,
            data: rewriteDomainUrlsInValue(validation.pkg.data, detectedOldUrl, targetNewUrl),
          };
        }

        db = migrateDatabaseInPlace(applyBackupRestore(db, pkgToRestore), createSeedDatabase()).db;
        entityCounts = countDatabaseEntities(pkgToRestore.data);
      }

      let restoredMediaCount = 0;
      if (restoreMedia !== false) {
        const assetsImgDir = path.join(process.cwd(), 'src', 'assets', 'images');
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        fs.mkdirSync(assetsImgDir, { recursive: true });
        for (const entry of entries) {
          const assetCheck = validateSafeRestoreAssetPath(entry.name);
          if (!assetCheck.safe || !assetCheck.relativeName || !assetCheck.targetSubdir) continue;
          const destDir = assetCheck.targetSubdir === 'uploads' ? UPLOAD_DIR : assetsImgDir;
          fs.writeFileSync(path.join(destDir, path.basename(assetCheck.relativeName)), entry.data);
          restoredMediaCount += 1;
        }
      }

      addAudit(
        actor,
        'IMPORT_COMPLETE_SITE_ZIP',
        'Backup',
        `Migrated site archive (${restoredMediaCount} media files${safetyFilename ? `, safety: ${safetyFilename}` : ''})`,
      );
      saveDatabase();

      res.json({
        ok: true,
        restoredMediaCount,
        entityCounts,
        rewrittenFrom: detectedOldUrl || null,
        rewrittenTo: targetNewUrl || null,
        safetyFilename,
      });
    } catch (err) {
      res.status(400).json({ error: `Failed to import site migration ZIP: ${(err as Error).message}` });
    }
  });

  app.delete('/api/admin/backups/:id', requireAdmin('settings'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const list = db.backups ?? [];
    const idx = list.findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Backup not found.' });
      return;
    }
    const [removed] = list.splice(idx, 1);
    db.backups = list;
    try {
      const p = path.join(BACKUP_DIR, path.basename(removed.filename));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // ignore missing file
    }
    addAudit(actor, 'DELETE_BACKUP', 'Backup', removed.filename);
    saveDatabase();
    res.json({ ok: true });
  });

  app.post('/api/admin/backups/:id/transfer-scp', requireAdmin('settings'), async (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const record = (db.backups ?? []).find((b) => b.id === req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Backup not found.' });
      return;
    }
    const scpCfg: ScpConfig = {
      ...(db.backupSchedule?.scpConfig || { host: '', port: 22, username: '', remoteDir: '/var/backups/svcoer-cms' }),
      ...(req.body?.scpConfig || {}),
    };
    const filePath = path.join(BACKUP_DIR, path.basename(record.filename));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Backup archive missing on disk.' });
      return;
    }
    const transfer = await executeScpPush(filePath, scpCfg);
    record.remoteStatus = transfer.message;
    addAudit(actor, 'SCP_BACKUP_TRANSFER', 'Backup', `${record.filename}: ${transfer.ok ? 'OK' : 'FAILED'}`);
    saveDatabase();
    if (!transfer.ok) {
      res.status(400).json({ error: transfer.message, record });
      return;
    }
    res.json({ ok: true, message: transfer.message, record });
  });

  app.post('/api/admin/backups/:id/push-webhook', requireAdmin('settings'), async (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const record = (db.backups ?? []).find((b) => b.id === req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Backup not found.' });
      return;
    }
    const hookUrl = String(req.body?.webhookUrl || db.backupSchedule?.webhookUrl || '');
    const safeName = path.basename(record.filename);
    const fullPath = path.join(BACKUP_DIR, safeName);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Backup file missing on disk.' });
      return;
    }
    const isZip = safeName.toLowerCase().endsWith('.zip') || record.archiveType === 'site-zip';
    let pushRes: { ok: boolean; message: string };
    if (isZip) {
      const zipBuf = fs.readFileSync(fullPath);
      pushRes = await pushWebhookBackup(hookUrl, {
        binaryArchive: {
          filename: safeName,
          buf: zipBuf,
          sha256: record.sha256,
          archiveType: 'site-zip',
          createdAt: record.createdAt,
        },
      });
    } else {
      const pkg = loadBackupFilePackage(record.filename);
      if (!pkg) {
        res.status(404).json({ error: 'Backup archive unreadable.' });
        return;
      }
      pushRes = await pushWebhookBackup(hookUrl, { pkg });
    }
    record.remoteStatus = pushRes.message;
    addAudit(actor, 'WEBHOOK_BACKUP_PUSH', 'Backup', `${record.filename}: ${pushRes.ok ? 'OK' : 'FAILED'}`);
    saveDatabase();
    if (!pushRes.ok) {
      res.status(400).json({ error: pushRes.message, record });
      return;
    }
    res.json({ ok: true, message: pushRes.message, record });
  });

  app.put('/api/admin/backups/schedule', requireAdmin('settings'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const incoming = req.body as Partial<BackupScheduleConfig>;
    const prev = db.backupSchedule ?? defaultBackupSchedule();
    const frequency = incoming.frequency || prev.frequency || 'daily';
    const enabled = incoming.enabled !== undefined ? Boolean(incoming.enabled) : prev.enabled;
    const nextSchedule: BackupScheduleConfig = {
      ...prev,
      ...incoming,
      enabled,
      frequency,
      retentionCount: Math.max(3, Number(incoming.retentionCount ?? prev.retentionCount ?? 14)),
      scpConfig: {
        ...(prev.scpConfig || { host: '', port: 22, username: '', remoteDir: '/var/backups/svcoer-cms' }),
        ...(incoming.scpConfig || {}),
      },
      nextRunAt: enabled ? computeNextRunIso(frequency) : undefined,
    };
    db.backupSchedule = nextSchedule;
    addAudit(
      actor,
      'UPDATE_BACKUP_SCHEDULE',
      'Backup',
      `${nextSchedule.enabled ? 'Enabled' : 'Paused'} (${nextSchedule.frequency} · ${nextSchedule.mode} -> ${nextSchedule.destination})`,
    );
    saveDatabase();
    res.json(nextSchedule);
  });

  app.post('/api/admin/backups/run-scheduled-now', requireAdmin('settings'), async (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const sched = db.backupSchedule ?? defaultBackupSchedule();
    const record = await createBackupSnapshot({
      mode: sched.mode,
      destination: sched.destination,
      createdBy: `${actor.email} (Manual Schedule Run)`,
      notes: `Scheduled job trigger (${sched.frequency})`,
    });
    sched.lastRunAt = record.createdAt;
    sched.nextRunAt = sched.enabled ? computeNextRunIso(sched.frequency) : undefined;
    sched.lastStatus = record.remoteStatus || `Completed ${record.mode} backup (${record.filename})`;
    db.backupSchedule = sched;
    addAudit(actor, 'RUN_SCHEDULED_BACKUP', 'Backup', record.filename);
    saveDatabase();
    res.json({ record, schedule: sched });
  });

  app.post('/api/admin/backups/restore', requireAdmin('settings'), async (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { packageData, backupId } = req.body as { packageData?: unknown; backupId?: string };

    let rawPayload: unknown = packageData;
    if (!rawPayload && backupId) {
      const targetRec = (db.backups ?? []).find((b) => b.id === backupId);
      if (!targetRec) {
        res.status(404).json({ error: 'Selected server backup archive not found.' });
        return;
      }
      rawPayload = loadBackupFilePackage(targetRec.filename);
    }

    const validation = validateBackupPackage(rawPayload);
    if (!validation.valid || !validation.pkg) {
      res.status(400).json({ error: validation.reason || 'Invalid or corrupted backup file.' });
      return;
    }

    // Create automatic safety snapshot before overwriting live state
    const safetyBackup = await createBackupSnapshot({
      mode: 'full',
      destination: 'local',
      createdBy: actor.email,
      notes: `Automatic pre-restore safety snapshot before restoring ${validation.pkg.mode} archive`,
    });

    db = migrateDatabaseInPlace(applyBackupRestore(db, validation.pkg), createSeedDatabase()).db;
    addAudit(
      actor,
      'RESTORE_BACKUP',
      'Backup',
      `Restored ${validation.pkg.mode} backup (safety snapshot: ${safetyBackup.filename})`,
    );
    saveDatabase();
    res.json({
      ok: true,
      restoredMode: validation.pkg.mode,
      entityCounts: validation.entityCounts,
      safetyBackupId: safetyBackup.id,
      safetyFilename: safetyBackup.filename,
    });
  });

  // Periodic background scheduler for Automatic Backups & Scheduled Exports
  let backupJobRunning = false;
  setInterval(async () => {
    if (backupJobRunning) return;
    const sched = db.backupSchedule;
    if (!sched || !sched.enabled) return;
    const now = Date.now();
    const dueAt = sched.nextRunAt ? Date.parse(sched.nextRunAt) : 0;
    if (dueAt > now) return;

    backupJobRunning = true;
    try {
      const record = await createBackupSnapshot({
        mode: sched.mode,
        destination: sched.destination,
        createdBy: 'system-scheduler',
        notes: `Automatic scheduled ${sched.frequency} backup`,
      });
      sched.lastRunAt = record.createdAt;
      sched.nextRunAt = computeNextRunIso(sched.frequency);
      sched.lastStatus = record.remoteStatus || `Auto-backup saved (${record.filename})`;
      db.backupSchedule = sched;
      saveDatabase();
    } catch (err) {
      if (db.backupSchedule) {
        db.backupSchedule.lastStatus = `Auto-backup error: ${(err as Error).message}`;
        db.backupSchedule.nextRunAt = computeNextRunIso(db.backupSchedule.frequency);
        saveDatabase();
      }
    } finally {
      backupJobRunning = false;
    }
  }, 60_000);

  // Vite middleware in development, static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SVCOER UGC CMS running on http://localhost:${PORT}`);
  });
}

startServer();
