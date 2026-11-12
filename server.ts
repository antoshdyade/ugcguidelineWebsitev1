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
import type { CmsCategory, CmsDatabase, CmsUser, UserRole } from './src/types/cms';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cms-db.json');
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(process.cwd()).digest('hex');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function loadDatabase(): CmsDatabase {
  const seed = createSeedDatabase();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as CmsDatabase;
      const isPreExamUpgrade = !parsed.settings?.homeSections;
      let categories: CmsCategory[] = (parsed.categories || seed.categories).map((c) => ({
        ...c,
        shortLabel: c.shortLabel || c.name,
        showInMenu: c.showInMenu !== false,
        showOnHome: c.showOnHome !== false,
      }));
      let pages = parsed.pages || seed.pages;

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

      const merged: CmsDatabase = {
        ...seed,
        ...parsed,
        categories,
        pages,
        settings: {
          ...seed.settings,
          ...(parsed.settings || {}),
          homeSections: {
            ...seed.settings.homeSections!,
            ...(parsed.settings?.homeSections || {}),
          },
        },
      };
      if (isPreExamUpgrade) {
        fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), 'utf-8');
      }
      return merged;
    } catch {
      // Fallback to fresh seed if file is corrupted
    }
  }
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

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '15mb' }));

  // Serve uploaded safe assets statically
  app.use('/uploads', express.static(UPLOAD_DIR));

  // Public bootstrap endpoint (unrestricted access per UGC Rule 4)
  app.get('/api/public/bootstrap', (_req, res) => {
    res.json({
      categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder),
      pages: db.pages.filter((p) => p.isPublished).sort((a, b) => a.sortOrder - b.sortOrder),
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
    res.json({
      categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder),
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
      createDefaultPage,
    } = req.body as {
      name?: string;
      shortLabel?: string;
      slug?: string;
      ugcCode?: string;
      description?: string;
      showInMenu?: boolean;
      showOnHome?: boolean;
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
    const cat = {
      id: nextId,
      slug: cleanSlug,
      name: String(name).trim(),
      shortLabel: String(shortLabel || name).trim(),
      ugcCode: String(ugcCode || 'Autonomous Portal').trim(),
      description: String(description || `Official institutional section and micro-pages for ${String(name).trim()}.`).trim(),
      sortOrder: nextSort,
      showInMenu: showInMenu !== false,
      showOnHome: showOnHome !== false,
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
    const { name, shortLabel, ugcCode, description, sortOrder, showInMenu, showOnHome } = req.body;
    if (name !== undefined) cat.name = String(name).trim();
    if (shortLabel !== undefined) cat.shortLabel = String(shortLabel).trim();
    if (ugcCode !== undefined) cat.ugcCode = String(ugcCode).trim();
    if (description !== undefined) cat.description = String(description).trim();
    if (sortOrder !== undefined) cat.sortOrder = Number(sortOrder);
    if (showInMenu !== undefined) cat.showInMenu = Boolean(showInMenu);
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
    const { title, subtitle, contentHtml, categorySlug, isPublished, attachedPdfUrl, attachedPdfLabel, sortOrder } = req.body;
    if (title !== undefined) page.title = String(title);
    if (subtitle !== undefined) page.subtitle = String(subtitle);
    if (contentHtml !== undefined) page.contentHtml = String(contentHtml);
    if (categorySlug !== undefined) page.categorySlug = categorySlug;
    if (isPublished !== undefined) page.isPublished = Boolean(isPublished);
    if (sortOrder !== undefined) page.sortOrder = Number(sortOrder);
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
      const { name, designation, qualification, specialization, email, experienceYears, photoUrl, isHod } = req.body;
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
        photoUrl: String(photoUrl || '/src/assets/images/leadership_principal_1794512597061.jpg'),
        isHod: Boolean(isHod ?? false),
        sortOrder: dept.faculty.length + 1,
      };
      dept.faculty.push(fac);
      addAudit(actor, 'ADD_FACULTY', dept.shortName, fac.name);
      saveDatabase();
      res.status(201).json(fac);
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
      if (req.body.experienceYears !== undefined) fac.experienceYears = Number(req.body.experienceYears);
      if (req.body.photoUrl !== undefined) fac.photoUrl = String(req.body.photoUrl);
      if (req.body.isHod !== undefined) fac.isHod = Boolean(req.body.isHod);
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
      const { name, areaSqFt, equipmentSummary, incharge } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Laboratory name is required.' });
        return;
      }
      const nextId = Math.max(2000, ...dept.labs.map((l) => l.id)) + 1;
      const lab = {
        id: nextId,
        departmentId: deptId,
        name: String(name),
        areaSqFt: Number(areaSqFt || 1200),
        equipmentSummary: String(equipmentSummary || ''),
        incharge: String(incharge || dept.hodName),
      };
      dept.labs.push(lab);
      addAudit(actor, 'ADD_LAB', dept.shortName, lab.name);
      saveDatabase();
      res.status(201).json(lab);
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
    const validation = validateUploadMeta(
      String(fileName),
      String(mimeType || 'image/jpeg'),
      Number(fileSizeBytes || 1024),
    );
    if (!validation.valid || !validation.safeFilename) {
      res.status(400).json({ error: validation.reason || 'File blocked by upload security validator.' });
      return;
    }
    const cleanBase64 = base64Content.includes(',') ? base64Content.split(',')[1] : base64Content;
    const buf = Buffer.from(cleanBase64, 'base64');
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
    const { title, eventDate, category, summary, contentHtml, imageUrl, isFeatured } = req.body;
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
      imageUrl: imageUrl ? String(imageUrl) : undefined,
      isFeatured: Boolean(isFeatured ?? true),
    };
    db.events.unshift(ev);
    addAudit(actor, 'CREATE_EVENT', ev.category, ev.title);
    saveDatabase();
    res.status(201).json(ev);
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
    const { roleTitle, name, qualification, email, phone, photoUrl, bio, committeeGroup } = req.body;
    if (!roleTitle || !name) {
      res.status(400).json({ error: 'Role title and officer name are required.' });
      return;
    }
    const nextId = Math.max(1, ...db.leadership.map((l) => l.id)) + 1;
    const profile = {
      id: nextId,
      roleTitle: String(roleTitle),
      name: String(name),
      qualification: String(qualification || ''),
      email: String(email || ''),
      phone: String(phone || ''),
      photoUrl: String(photoUrl || '/src/assets/images/leadership_principal_1794512597061.jpg'),
      bio: String(bio || ''),
      committeeGroup: committeeGroup || 'statutory',
      sortOrder: db.leadership.length + 1,
    };
    db.leadership.push(profile);
    addAudit(actor, 'CREATE_LEADERSHIP', 'Leadership', `${profile.name} (${profile.roleTitle})`);
    saveDatabase();
    res.status(201).json(profile);
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
    const cover = String(coverUrl || '/src/assets/images/hero_campus_aerial_1794512596442.jpg');
    const album = {
      id: nextId,
      title: String(title),
      category: String(category || 'Campus'),
      eventDate: String(eventDate || new Date().toISOString().slice(0, 10)),
      coverUrl: cover,
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
    const entry = {
      id: nextId,
      section: String(section),
      officerName: String(officerName),
      designation: String(designation || ''),
      extension: String(extension || ''),
      directPhone: String(directPhone || ''),
      email: String(email || ''),
    };
    db.telephoneDirectory.push(entry);
    addAudit(actor, 'ADD_DIRECTORY_ENTRY', 'Directory', `${entry.section} - ${entry.officerName}`);
    saveDatabase();
    res.status(201).json(entry);
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
