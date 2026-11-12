import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { createSeedDatabase, hashPassword, verifyPassword } from './src/data/seedDatabase';
import {
  canUserAccessResource,
  searchCmsContent,
  validateUploadMeta,
  type AdminResource,
} from './src/lib/cmsLogic';
import type { CmsDatabase, CmsUser, UserRole } from './src/types/cms';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cms-db.json');
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(process.cwd()).digest('hex');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function loadDatabase(): CmsDatabase {
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw) as CmsDatabase;
    } catch {
      // Fallback to fresh seed if file is corrupted
    }
  }
  const seed = createSeedDatabase();
  fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
  return seed;
}

let db: CmsDatabase = loadDatabase();

function saveDatabase() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function addAudit(actor: CmsUser, action: string, entityType: string, entityTitle: string) {
  const nextId = (db.auditLogs[0]?.id ?? 0) + 1;
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

function sanitizeUser(u: CmsDatabase['users'][number]): CmsUser {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Serve uploaded safe assets statically
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Public bootstrap endpoint (unrestricted access per UGC Rule 4)
  app.get('/api/public/bootstrap', (_req, res) => {
    res.json({
      categories: db.categories,
      pages: db.pages.filter((p) => p.isPublished),
      leadership: db.leadership,
      departments: db.departments.map((d) => ({
        ...d,
        subPages: d.subPages.filter((sp) => sp.isPublished),
      })),
      sliders: db.sliders.filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
      ticker: db.ticker.filter((t) => t.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
      events: db.events,
      documents: db.documents,
      gallery: db.gallery,
      telephoneDirectory: db.telephoneDirectory,
      settings: db.settings,
    });
  });

  // Fast Global AJAX Search endpoint (UGC Rule 4)
  app.get('/api/search', (req, res) => {
    const q = String(req.query.q || '');
    const results = searchCmsContent(q, db);
    res.json({ query: q, results });
  });

  // Auth endpoints
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
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

    res.setHeader(
      'Set-Cookie',
      `svcoer_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`,
    );
    res.json({ user: sanitizeUser(user), csrfToken });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', 'svcoer_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const session = verifySession(cookies.svcoer_session);
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
      const cookies = parseCookies(req.headers.cookie);
      const session = verifySession(cookies.svcoer_session);
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
    res.json({
      categories: db.categories,
      pages: db.pages,
      departments: db.departments,
      sliders: db.sliders,
      ticker: db.ticker,
      events: db.events,
      documents: db.documents,
      gallery: db.gallery,
      leadership: db.leadership,
      telephoneDirectory: db.telephoneDirectory,
      settings: db.settings,
      users: canUserAccessResource(currentUser, 'users') ? db.users.map(sanitizeUser) : [],
      auditLogs: canUserAccessResource(currentUser, 'audit_logs') ? db.auditLogs : [],
    });
  });

  // Pages CRUD
  app.post('/api/admin/pages', requireAdmin('pages'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { categorySlug, slug, title, subtitle, contentHtml, attachedPdfUrl, attachedPdfLabel, isPublished } =
      req.body;
    if (!title || !slug || !categorySlug) {
      res.status(400).json({ error: 'Category, slug, and title are required.' });
      return;
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
      attachedPdfUrl: attachedPdfUrl ? String(attachedPdfUrl) : undefined,
      attachedPdfLabel: attachedPdfLabel ? String(attachedPdfLabel) : undefined,
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

  app.put('/api/admin/pages/:id', requireAdmin('pages'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const id = Number(req.params.id);
    const page = db.pages.find((p) => p.id === id);
    if (!page) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }
    const { title, subtitle, contentHtml, categorySlug, isPublished, attachedPdfUrl, attachedPdfLabel } = req.body;
    if (title !== undefined) page.title = String(title);
    if (subtitle !== undefined) page.subtitle = String(subtitle);
    if (contentHtml !== undefined) page.contentHtml = String(contentHtml);
    if (categorySlug !== undefined) page.categorySlug = categorySlug;
    if (isPublished !== undefined) page.isPublished = Boolean(isPublished);
    if (attachedPdfUrl !== undefined) page.attachedPdfUrl = attachedPdfUrl || undefined;
    if (attachedPdfLabel !== undefined) page.attachedPdfLabel = attachedPdfLabel || undefined;
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
      const { title, slug, contentHtml, isPublished } = req.body;
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
        contentHtml: String(contentHtml || '<p></p>'),
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
      if (req.body.contentHtml !== undefined) sub.contentHtml = String(req.body.contentHtml);
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
      const { name, designation, qualification, specialization, email, experienceYears } = req.body;
      if (!name || !designation) {
        res.status(400).json({ error: 'Faculty name and designation are required.' });
        return;
      }
      const nextId = Math.max(1000, ...dept.faculty.map((f) => f.id)) + 1;
      const fac = {
        id: nextId,
        departmentId: deptId,
        name: String(name),
        designation: String(designation),
        qualification: String(qualification || 'M.Tech'),
        specialization: String(specialization || 'Engineering'),
        email: String(email || ''),
        experienceYears: Number(experienceYears || 1),
        photoUrl: '/src/assets/images/leadership_principal_1794512597061.jpg',
        isHod: false,
        sortOrder: dept.faculty.length + 1,
      };
      dept.faculty.push(fac);
      addAudit(actor, 'ADD_FACULTY', dept.shortName, fac.name);
      saveDatabase();
      res.status(201).json(fac);
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
    const item = {
      id: nextId,
      text: String(text),
      linkUrl: String(linkUrl || '/page/circulars-notices'),
      badgeText: badgeText ? String(badgeText) : 'Notice',
      isActive: true,
      sortOrder: db.ticker.length + 1,
    };
    db.ticker.unshift(item);
    addAudit(actor, 'CREATE_TICKER', 'Ticker', item.text);
    saveDatabase();
    res.status(201).json(item);
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
    const { title, eventDate, category, summary, contentHtml, isFeatured } = req.body;
    if (!title || !eventDate) {
      res.status(400).json({ error: 'Event title and date are required.' });
      return;
    }
    const nextId = Math.max(1, ...db.events.map((e) => e.id)) + 1;
    const ev = {
      id: nextId,
      title: String(title),
      eventDate: String(eventDate),
      category: category || 'Notice',
      summary: String(summary || ''),
      contentHtml: String(contentHtml || `<p>${summary || ''}</p>`),
      isFeatured: Boolean(isFeatured ?? true),
    };
    db.events.unshift(ev);
    addAudit(actor, 'CREATE_EVENT', ev.category, ev.title);
    saveDatabase();
    res.status(201).json(ev);
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

  // Documents / Media Manager with strict MIME & executable upload blocking
  app.post('/api/admin/documents', requireAdmin('documents'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { title, category, fileName, mimeType, fileSizeBytes, base64Content, isQuickLink } = req.body;
    if (!title || !category || !fileName) {
      res.status(400).json({ error: 'Document title, category, and filename are required.' });
      return;
    }
    const validation = validateUploadMeta(
      String(fileName),
      String(mimeType || 'application/pdf'),
      Number(fileSizeBytes || 1024),
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
      fs.writeFileSync(path.join(UPLOAD_DIR, validation.safeFilename), buf);
      fileUrl = `/uploads/${validation.safeFilename}`;
    }

    const nextId = Math.max(1, ...db.documents.map((d) => d.id)) + 1;
    const doc = {
      id: nextId,
      title: String(title),
      category,
      fileUrl,
      fileName: validation.safeFilename,
      fileSizeBytes: Number(fileSizeBytes || 204800),
      mimeType: String(mimeType || 'application/pdf'),
      uploadedAt: new Date().toISOString().slice(0, 10),
      uploadedBy: actor.fullName,
      isQuickLink: Boolean(isQuickLink ?? true),
    };
    db.documents.unshift(doc);
    addAudit(actor, 'UPLOAD_DOCUMENT', 'Document', doc.title);
    saveDatabase();
    res.status(201).json(doc);
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

  // Users & RBAC management (Super Admin only)
  app.post('/api/admin/users', requireAdmin('users'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    const { fullName, email, password, role, assignedDepartmentId } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      assignedDepartmentId?: number | null;
    };
    if (!fullName || !email || !password || !role) {
      res.status(400).json({ error: 'Name, email, password, and role are required.' });
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      res.status(409).json({ error: 'User with this email already exists.' });
      return;
    }
    const nextId = Math.max(1, ...db.users.map((u) => u.id)) + 1;
    const newUser = {
      id: nextId,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      role,
      assignedDepartmentId: role === 'department_admin' ? Number(assignedDepartmentId || 1) : null,
      isActive: true,
      passwordHash: hashPassword(password),
    };
    db.users.push(newUser);
    addAudit(actor, 'CREATE_USER', 'User', `${newUser.email} (${newUser.role})`);
    saveDatabase();
    res.status(201).json(sanitizeUser(newUser));
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

  // Site Settings (Super Admin only)
  app.put('/api/admin/settings', requireAdmin('settings'), (req, res) => {
    const actor = (req as express.Request & { currentUser: CmsUser }).currentUser;
    db.settings = { ...db.settings, ...req.body };
    addAudit(actor, 'UPDATE_SITE_SETTINGS', 'Settings', db.settings.institutionName);
    saveDatabase();
    res.json(db.settings);
  });

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
