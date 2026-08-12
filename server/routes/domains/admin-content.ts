/**
 * ----------------------------------------------------------------------------
 * DOMAIN ROUTER: admin-content
 * ----------------------------------------------------------------------------
 *
 * Task #303 (safer modular API architecture). This module is a verbatim
 * extraction of the admin "content" surface from server/routes.ts — the
 * routes originally registered in source order across the block that begins
 * at the `// --- Admin Routes ---` marker and ends just before the
 * `// --- GitHub Sync Routes ---` marker.
 *
 * Endpoints registered here (order preserved exactly as in routes.ts):
 *   - GET    /api/admin/stats
 *   - GET    /api/admin/users
 *   - GET    /api/admin/users/export
 *   - PATCH  /api/admin/users/:id/name
 *   - PUT    /api/admin/users/:id/role
 *   - DELETE /api/admin/users/:id
 *   - GET    /api/admin/audit-logs
 *   - GET    /api/admin/pending-resources
 *   - POST   /api/admin/resources/:id(\d+)/approve
 *   - POST   /api/admin/resources/:id(\d+)/reject
 *   - POST   /api/admin/resources/:id(\d+)/unapprove
 *   - PUT    /api/admin/resources/:id
 *   - DELETE /api/admin/resources/:id
 *   - POST   /api/admin/resources/bulk/approve
 *   - POST   /api/admin/resources/bulk/reject
 *   - POST   /api/admin/resources/bulk/delete
 *   - GET    /api/admin/resources
 *   - POST   /api/admin/resources
 *   - GET    /api/admin/resource-edits
 *   - POST   /api/admin/resource-edits/:id/approve
 *   - POST   /api/admin/resource-edits/:id/reject
 *   - POST   /api/claude/analyze
 *   - GET    /api/admin/categories
 *   - POST   /api/admin/categories
 *   - PATCH  /api/admin/categories/:id
 *   - DELETE /api/admin/categories/:id
 *   - GET    /api/admin/subcategories
 *   - POST   /api/admin/subcategories
 *   - PATCH  /api/admin/subcategories/:id
 *   - DELETE /api/admin/subcategories/:id
 *   - GET    /api/admin/sub-subcategories
 *   - POST   /api/admin/sub-subcategories
 *   - PATCH  /api/admin/sub-subcategories/:id
 *   - DELETE /api/admin/sub-subcategories/:id
 *
 * Middleware, statuses, headers and per-route comments are copied byte-for-byte
 * from routes.ts. Every symbol the handlers close over is supplied through the
 * explicit `AdminContentContext` so this module never depends on module-scoped
 * state inside routes.ts.
 */
import type { Express, Response } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { insertResourceSchema } from "@shared/schema";
import {
  httpsUrlSchema,
  resourceTitleSchema,
  resourceDescriptionSchema,
  DISPLAY_NAME_MAX,
  stripInvisible,
  parseIntInRange,
} from "@shared/validation";
import { sanitizeUser, parseBoundedInt, PG_INT_MAX } from "../../validation/inputs";
import { ensureMinDescription, decodeResourceTextFields } from "../../github/importHygiene";
import { ensureSubSubcategoryExists } from "../../repositories/ensureSubSubcategory";
import { isDatabaseUnavailableError } from "../../db/errors";
import { claudeService } from "../../ai/claudeService";
import { send429 } from "../../middleware/rateLimit";
import type {
  UserRepository,
  ResourceRepository,
  CategoryRepository,
  AuditRepository,
  AdminRepository,
} from "../../repositories";

/**
 * Explicit dependency context for the admin-content routes. Everything the
 * handlers need — repositories, auth/limiter middleware, and the shared
 * operational-failure helper — is passed in so this module is decoupled from
 * routes.ts internals.
 */
export interface AdminContentContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
  aiLimiter: RequestHandler;
  userRepo: UserRepository;
  resourceRepo: ResourceRepository;
  categoryRepo: CategoryRepository;
  auditRepo: AuditRepository;
  adminRepo: AdminRepository;
  sendOperationalFailure: (
    res: Response,
    error: unknown,
    fallbackMessage: string,
  ) => void;
}

export function registerAdminContentRoutes(
  app: Express,
  ctx: AdminContentContext,
): void {
  const {
    isAuthenticated,
    isAdmin,
    aiLimiter,
    userRepo,
    resourceRepo,
    categoryRepo,
    auditRepo,
    adminRepo,
    sendOperationalFailure,
  } = ctx;

  // --- Admin Routes ---
  
  // GET /api/admin/stats - Dashboard statistics
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await adminRepo.getAdminStats();
      // Map backend property names to frontend expectations
      res.json({
        users: stats.totalUsers,
        resources: stats.totalResources,
        journeys: stats.totalJourneys,
        pendingApprovals: stats.pendingResources,
        pendingEdits: stats.pendingEdits,
        totalPublic: stats.totalPublic,
        totalPending: stats.totalPending,
        // Audit2 BUG-050: this count is rows with status='rejected', but it
        // shipped under the name `totalDeleted` while the dashboard labeled it
        // "rejected" — field name now matches what is actually counted.
        totalRejected: stats.totalRejected,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin statistics' });
    }
  });
  
  // GET /api/admin/users - List users
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // NB-024 (run23): validate pagination like every public surface —
      // page=-1 previously drove a negative OFFSET into PG → 500, and
      // limit=-1 fell through as PG "LIMIT -1" → every user in one response.
      let page = 1;
      if (req.query.page !== undefined && req.query.page !== '') {
        const parsedPage = parseBoundedInt(req.query.page);
        if (parsedPage === null) {
          return res.status(400).json({ message: 'page must be a positive integer' });
        }
        page = parsedPage;
      }
      let limit = 20;
      if (req.query.limit !== undefined && req.query.limit !== '') {
        const parsedLimit = parseBoundedInt(req.query.limit);
        if (parsedLimit === null) {
          return res.status(400).json({ message: 'limit must be a positive integer between 1 and 100' });
        }
        limit = Math.min(parsedLimit, 100);
      }
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      // Run16 BUG-087: optional sort params (whitelisted in the repository).
      const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined;
      const sortDir = typeof req.query.sortDir === 'string' ? req.query.sortDir : undefined;

      const result = await userRepo.listUsers(page, limit, q, sortBy, sortDir);
      // Never expose password hashes over the API, even to admins. Run21
      // R4-019: whitelist serializer (not destructure-strip) so any future
      // sensitive column is safe by default.
      const sanitizedUsers = result.users.map((u) => sanitizeUser(u));
      res.json({ ...result, users: sanitizedUsers });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  // GET /api/admin/users/export - CSV export of all users (R2-L08).
  // Password hashes are never included. Cells that could be interpreted as
  // spreadsheet formulas (= + - @ prefixes) are quoted with a leading
  // apostrophe to prevent CSV-injection when opened in Excel/Sheets.
  app.get('/api/admin/users/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allUsers = await userRepo.listAllUsers();
      // R5-029 (run24): a bulk unmasked-PII export is the highest-sensitivity
      // admin action on the site — it must appear in the audit trail like
      // every other privileged action. Logged BEFORE the response is sent so
      // a failed send still leaves the access on record.
      await auditRepo.logResourceAudit(
        null,
        'users.exported',
        req.dbUser?.id,
        { rowCount: allUsers.length },
        `Admin exported ${allUsers.length} user rows (unmasked emails, CSV)`
      );
      const csvCell = (value: unknown): string => {
        let s = value === null || value === undefined ? '' : String(value);
        if (/^[=+\-@]/.test(s)) s = `'${s}`;
        if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      // NB-012 (run23, supersedes Run15 BUG-042 masking): the export is an
      // admin-only endpoint and the admin UI already has a reveal toggle that
      // shows the real address — a masked CSV was strictly less useful than
      // the screen it mirrors while gating nothing. Export real emails; the
      // on-screen table stays masked by default.
      const header = ['id', 'email', 'firstName', 'lastName', 'role', 'authProvider', 'createdAt'];
      const lines = [header.join(',')];
      for (const u of allUsers) {
        const provider = u.password ? 'local' : 'replit';
        lines.push([
          csvCell(u.id),
          csvCell(u.email ?? ''),
          csvCell(u.firstName),
          csvCell(u.lastName),
          csvCell(u.role),
          csvCell(provider),
          csvCell(u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt),
        ].join(','));
      }
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="users-export-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(lines.join('\r\n') + '\r\n');
    } catch (error) {
      console.error('Error exporting users:', error);
      res.status(500).json({ message: 'Failed to export users' });
    }
  });

  // PUT /api/admin/users/:id/role - Change user role
  // PATCH /api/admin/users/:id/name — admin-set display name (BUG-009 run19).
  // Exists primarily so the prod data-fix script can backfill names for
  // accounts registered before names were derived at signup (prod DB is not
  // agent-writable; all prod data fixes go through the live admin API).
  app.patch('/api/admin/users/:id/name', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { firstName, lastName } = req.body ?? {};
      // Run21 R4-049/050: same rules as the profile editor — zero-width chars
      // stripped, ONE shared cap (DISPLAY_NAME_MAX) so admin-set names always
      // round-trip through the self-service editor.
      const clean = (v: unknown): string | null | undefined => {
        if (v === undefined) return undefined;
        if (v === null) return null;
        if (typeof v !== 'string') return undefined;
        const t = stripInvisible(v).slice(0, DISPLAY_NAME_MAX);
        return t.length > 0 ? t : null;
      };
      const first = clean(firstName);
      const last = clean(lastName);
      if (first === undefined && last === undefined) {
        return res.status(400).json({ message: 'firstName or lastName (string or null) is required' });
      }
      const existing = await userRepo.getUser(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: 'User not found' });
      }
      const updated = await userRepo.updateUserProfile(req.params.id, {
        ...(first !== undefined ? { firstName: first } : {}),
        ...(last !== undefined ? { lastName: last } : {}),
      });
      res.json(sanitizeUser(updated));
    } catch (error) {
      console.error('Error updating user name:', error);
      res.status(500).json({ message: 'Failed to update user name' });
    }
  });

  app.put('/api/admin/users/:id/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { role } = req.body;
      
      if (!role || !['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
      // Run16 BUG-014: block self role changes server-side — a one-click
      // self-demotion would lock the last admin out (mirrors the existing
      // self-delete guard below).
      if (req.dbUser?.id === userId) {
        return res.status(400).json({ message: 'You cannot change your own role' });
      }
      
      const user = await userRepo.updateUserRole(userId, role);
      // Run21 R4-019: this endpoint used to serialize the FULL user row —
      // including the bcrypt hash. Field-whitelist serializer only.
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  });
  
  // DELETE /api/admin/users/:id - Delete a user (NEW-004: QA/test account
  // cleanup). Self-deletion is blocked. Content is preserved: the user's
  // submitted/approved resources are detached (attribution nulled) rather than
  // cascade-deleted; their pending edit suggestions are removed. Personal data
  // (bookmarks, favorites, progress, preferences, API keys) cascades away.
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const targetId = req.params.id;
      if (req.dbUser?.id === targetId) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
      }
      const target = await userRepo.getUser(targetId);
      if (!target) {
        return res.status(404).json({ message: 'User not found' });
      }
      const summary = await userRepo.deleteUserWithCleanup(targetId);
      res.json({ success: true, deletedUserId: targetId, email: target.email, ...summary });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // --- Audit Log Routes ---

  // GET /api/admin/audit-logs - List audit log entries
  app.get('/api/admin/audit-logs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Run16 BUG-041: honor offset + return the REAL total.
      // Run21 R4-079: invalid pagination/filter params are a CLIENT error —
      // answer 400 instead of silently clamping/ignoring them (offset=-1 and
      // resourceId=0 used to be swallowed and return page 1 unfiltered).
      const rawLimit = req.query.limit as string | undefined;
      const rawOffset = req.query.offset as string | undefined;
      const rawPage = req.query.page as string | undefined;
      const rawResourceId = req.query.resourceId as string | undefined;

      // R5-020 (run24): Number.isInteger(1e20) is TRUE — exponent-notation and
      // beyond-int4 values sailed through and 500'd inside PG. parseIntInRange
      // enforces digit-only strings bounded to int4.
      let limit = 50;
      let rid: number | null = null;
      if (rawResourceId !== undefined) {
        rid = parseIntInRange(rawResourceId, { min: 1 });
        if (rid === null) {
          return res.status(400).json({ message: 'resourceId must be a positive integer' });
        }
      }
      if (rawLimit !== undefined) {
        const n = parseIntInRange(rawLimit, { min: 1, max: 500 });
        if (n === null) {
          return res.status(400).json({ message: 'limit must be an integer between 1 and 500' });
        }
        limit = n;
      }
      let offset = 0;
      if (rawOffset !== undefined) {
        const n = parseIntInRange(rawOffset, { min: 0 });
        if (n === null) {
          return res.status(400).json({ message: 'offset must be a non-negative integer' });
        }
        offset = n;
      }
      // Task-201: `page` used to be silently ignored — a probe sending
      // page=1e20 got page 1 back (and on the pre-Run24 prod build, a PG
      // bigint range error). Validate it like the other list endpoints and,
      // when offset isn't given, translate it to an offset (capped to int4
      // so PG never sees an out-of-range value).
      if (rawPage !== undefined) {
        const p = parseIntInRange(rawPage, { min: 1 });
        if (p === null) {
          return res.status(400).json({ message: 'page must be an integer between 1 and 2147483647' });
        }
        if (rawOffset === undefined) {
          offset = Math.min((p - 1) * limit, PG_INT_MAX);
        }
      }

      const [logs, total] = await Promise.all([
        auditRepo.getResourceAuditLog(rid, limit, offset),
        auditRepo.countAuditLogs(rid),
      ]);
      res.json({ logs, total, limit, offset });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  // --- Resource Approval Routes ---
  
  // GET /api/admin/pending-resources - Get all pending resources for approval
  app.get('/api/admin/pending-resources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await resourceRepo.getPendingResources();
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching pending resources:', error);
      res.status(500).json({ message: 'Failed to fetch pending resources' });
    }
  });
  
  // POST /api/admin/resources/:id/approve - Approve a pending resource
  // :id is constrained to digits so it cannot shadow the literal /resources/bulk/* routes
  // registered later (Express matches first-registered; an unconstrained :id would capture "bulk").
  app.post('/api/admin/resources/:id(\\d+)/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.dbUser.id;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      // BUG-010: no body required; if a body is present it must be a plain object
      const approveBodySchema = z.object({}).optional();
      if (req.body !== undefined && req.body !== null && !approveBodySchema.safeParse(req.body).success) {
        return res.status(400).json({ message: 'Invalid request body' });
      }
      
      // BUG-010: resource-not-found → 404 (not 500)
      const existing = await resourceRepo.getResource(resourceId);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      // Run3 audit R3-28: approval gate — sanitize or backfill a fallback
      // description so no live resource has a stub under 20 chars.
      const cleanDescription = ensureMinDescription(existing.description || '', existing.title, existing.url);
      if (cleanDescription !== (existing.description || '')) {
        await resourceRepo.updateResource(resourceId, { description: cleanDescription });
      }
      
      const updatedResource = await resourceRepo.approveResource(resourceId, userId);
      
      res.json(updatedResource);
    } catch (error: any) {
      console.error('Error approving resource:', error);
      if (error?.message?.includes('not pending approval')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to approve resource' });
    }
  });
  
  // POST /api/admin/resources/:id/reject - Reject a pending resource
  // :id constrained to digits so it cannot shadow the literal /resources/bulk/* routes.
  app.post('/api/admin/resources/:id(\\d+)/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.dbUser.id;
      const { reason } = req.body;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      // BUG-010: resource-not-found → 404 (not 500)
      const existing = await resourceRepo.getResource(resourceId);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }

      // Run16 BUG-046: rejecting a non-pending resource used to fall through
      // to the catch → 500. It is a state conflict, not a server error.
      if (existing.status !== 'pending') {
        return res.status(409).json({
          message: `Only pending resources can be rejected here (this resource is '${existing.status}'). Use the resource status controls to change an approved resource.`,
        });
      }

      await resourceRepo.rejectResource(resourceId, userId, reason);
      const updatedResource = await resourceRepo.getResource(resourceId);
      
      res.json(updatedResource);
    } catch (error: any) {
      console.error('Error rejecting resource:', error);
      if (error?.message?.includes('not pending approval')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to reject resource' });
    }
  });

  // POST /api/admin/resources/:id/unapprove - Revert an approved resource to pending
  // BUG-010: safe reversal of approval. :id constrained to digits to avoid shadowing bulk routes.
  app.post('/api/admin/resources/:id(\\d+)/unapprove', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.dbUser.id;

      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }

      // BUG-010: no body required; if a body is present it must be a plain object
      const unapproveBodySchema = z.object({}).optional();
      if (req.body !== undefined && req.body !== null && !unapproveBodySchema.safeParse(req.body).success) {
        return res.status(400).json({ message: 'Invalid request body' });
      }

      const existing = await resourceRepo.getResource(resourceId);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      const updatedResource = await resourceRepo.updateResourceStatus(resourceId, 'pending', userId);
      res.json(updatedResource);
    } catch (error: any) {
      console.error('Error unapproving resource:', error);
      if (error?.message?.includes('not approved')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to unapprove resource' });
    }
  });

  // PUT /api/admin/resources/:id - Update a resource (admin only)
  app.put('/api/admin/resources/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.dbUser.id;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      // Run21 R4-016: the admin edit path mounts the SAME shared validators as
      // submit — <script> titles, whitespace-only titles, 5000-char
      // descriptions and 100k URLs all 400 here now. Run24 R4-016: a URL
      // *change* must be https-only (httpsUrlSchema) — no http:// destination
      // may be introduced/kept via an edit. If the submitted URL is byte-equal
      // to what's already stored, the field is skipped entirely, so unrelated
      // edits on legacy http:// rows still succeed and never churn the URL.
      const bodyForValidation = { ...(req.body ?? {}) };
      if (typeof bodyForValidation.url === 'string' && bodyForValidation.url === resource.url) {
        delete bodyForValidation.url;
      }
      const updateSchema = insertResourceSchema.partial().extend({
        title: resourceTitleSchema.optional(),
        description: resourceDescriptionSchema.optional(),
        url: httpsUrlSchema.optional(),
      });
      const validationResult = updateSchema.safeParse(bodyForValidation);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      // Task #248: entity-escaped text must never be stored (shared decode
      // step with submit/admin-create/AI imports).
      const validatedData = decodeResourceTextFields(validationResult.data);

      // Task #212: resources.url is UNIQUE. A URL change that collides with
      // another resource used to surface as an unhandled 23505 -> opaque 500
      // (all 66 QA-residue rows repointed to one URL in the run25 prod run).
      // Pre-check and answer with an actionable 409 instead.
      if (validatedData.url !== undefined && validatedData.url !== resource.url) {
        const conflicting = await resourceRepo.getResourceByUrl(validatedData.url);
        if (conflicting && conflicting.id !== resourceId) {
          return res.status(409).json({
            message: `Another resource already uses this URL (id ${conflicting.id}: "${conflicting.title}"). URLs must be unique.`,
            conflictingResourceId: conflicting.id,
          });
        }
      }

      const updateData: Record<string, any> = {};
      
      if (validatedData.title !== undefined) updateData.title = validatedData.title;
      if (validatedData.url !== undefined) updateData.url = validatedData.url;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.category !== undefined) updateData.category = validatedData.category;
      if (validatedData.subcategory !== undefined) updateData.subcategory = validatedData.subcategory;
      if (validatedData.subSubcategory !== undefined) updateData.subSubcategory = validatedData.subSubcategory;
      if (validatedData.resourceFormat !== undefined) updateData.resourceFormat = validatedData.resourceFormat;
      if (validatedData.provider !== undefined) updateData.provider = validatedData.provider;
      if (validatedData.skillLevel !== undefined) updateData.skillLevel = validatedData.skillLevel;
      if (validatedData.status !== undefined) updateData.status = validatedData.status;

      // Auto-create the implied sub_subcategories row so the resource never
      // disappears from the category drilldown (task #57). Uses the post-update
      // hierarchy values: prefer the incoming value, fall back to the resource's
      // existing value. Run21 R4-037: when the label can't be contained under
      // the effective category > subcategory chain, persist null instead of
      // leaving an orphan label on the row.
      const updateContained = await ensureSubSubcategoryExists(
        categoryRepo,
        updateData.category ?? resource.category,
        updateData.subcategory ?? resource.subcategory,
        updateData.subSubcategory ?? resource.subSubcategory,
      );
      if (!updateContained && (updateData.subSubcategory ?? resource.subSubcategory)) {
        updateData.subSubcategory = null;
      }

      const updatedResource = await resourceRepo.updateResource(resourceId, updateData);
      
      await auditRepo.logResourceAudit(
        resourceId,
        'updated',
        userId,
        updateData,
        'Resource updated by admin'
      );
      
      res.json(updatedResource);
    } catch (error: any) {
      // Task #212 safety net: a concurrent writer can still win the race past
      // the pre-check — map the unique-URL violation to the same 409.
      if (error?.code === '23505' && String(error?.constraint || '').includes('resources_url')) {
        return res.status(409).json({
          message: 'Another resource already uses this URL. URLs must be unique.',
        });
      }
      console.error('Error updating resource:', error);
      res.status(500).json({ message: 'Failed to update resource' });
    }
  });

  // DELETE /api/admin/resources/:id - Delete a resource (admin only)
  app.delete('/api/admin/resources/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const resourceId = parseInt(req.params.id);
      const userId = req.dbUser.id;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      // deleteResource writes the 'deleted' audit row itself, before the row is
      // removed, so the audit FK stays valid. Logging again here would insert a row
      // referencing the now-deleted resource and throw, masking a successful delete
      // as a 500.
      await resourceRepo.deleteResource(resourceId, userId);

      res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
      console.error('Error deleting resource:', error);
      res.status(500).json({ message: 'Failed to delete resource' });
    }
  });

  // POST /api/admin/resources/bulk/approve - Bulk approve resources
  app.post('/api/admin/resources/bulk/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { ids } = req.body as { ids?: unknown };

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array of resource IDs' });
      }

      const numericIds = ids
        .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return res.status(400).json({ message: 'No valid resource IDs provided' });
      }

      let succeeded = 0;
      let failed = 0;
      // Sequential on purpose: a bulk moderation request must not monopolize
      // all three database connections and starve sessions/catalog reads.
      for (const id of numericIds) {
        try {
          await resourceRepo.approveResource(id, userId);
          succeeded++;
        } catch (error) {
          if (isDatabaseUnavailableError(error)) throw error;
          failed++;
        }
      }

      res.json({ message: `Approved ${succeeded} resource(s)`, succeeded, failed });
    } catch (error) {
      console.error('Error in bulk approve:', error);
      sendOperationalFailure(res, error, 'Failed to bulk approve resources');
    }
  });

  // POST /api/admin/resources/bulk/reject - Bulk reject resources
  app.post('/api/admin/resources/bulk/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { ids, reason } = req.body as { ids?: unknown; reason?: string };

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array of resource IDs' });
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }

      const numericIds = ids
        .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return res.status(400).json({ message: 'No valid resource IDs provided' });
      }

      let succeeded = 0;
      let failed = 0;
      for (const id of numericIds) {
        try {
          await resourceRepo.rejectResource(id, userId, reason);
          succeeded++;
        } catch (error) {
          if (isDatabaseUnavailableError(error)) throw error;
          failed++;
        }
      }

      res.json({ message: `Rejected ${succeeded} resource(s)`, succeeded, failed });
    } catch (error) {
      console.error('Error in bulk reject:', error);
      sendOperationalFailure(res, error, 'Failed to bulk reject resources');
    }
  });

  // POST /api/admin/resources/bulk/delete - Bulk delete resources
  app.post('/api/admin/resources/bulk/delete', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const { ids } = req.body as { ids?: unknown };

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'ids must be a non-empty array of resource IDs' });
      }

      const numericIds = ids
        .map((id) => (typeof id === 'number' ? id : parseInt(String(id), 10)))
        .filter((id) => !Number.isNaN(id));

      if (numericIds.length === 0) {
        return res.status(400).json({ message: 'No valid resource IDs provided' });
      }

      let succeeded = 0;
      let failed = 0;
      for (const id of numericIds) {
        try {
          const resource = await resourceRepo.getResource(id);
          if (!resource) {
            failed++;
            continue;
          }
          // deleteResource records the 'deleted' audit row before removing the row,
          // keeping the audit FK valid; a second log here would reference the deleted
          // id and throw.
          await resourceRepo.deleteResource(id, userId);
          succeeded++;
        } catch (err) {
          console.error(`Error deleting resource ${id} in bulk:`, err);
          if (isDatabaseUnavailableError(err)) throw err;
          failed++;
        }
      }

      res.json({ message: `Deleted ${succeeded} resource(s)`, succeeded, failed });
    } catch (error) {
      console.error('Error in bulk delete:', error);
      sendOperationalFailure(res, error, 'Failed to bulk delete resources');
    }
  });

  // GET /api/admin/resources - Get all resources for admin (with pagination and filters)
  app.get('/api/admin/resources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Audit2 BUG-046 + BUG-013: validate pagination like /api/admin/users —
      // page=-5 previously drove a negative OFFSET into PG → 500, and
      // limit=100000 dumped the entire table in one response. Invalid values
      // are 400; limit is clamped to [1,100] (same ceiling as the public
      // /api/resources contract).
      let page = 1;
      if (req.query.page !== undefined && req.query.page !== '') {
        const parsedPage = parseBoundedInt(req.query.page);
        if (parsedPage === null) {
          return res.status(400).json({ message: 'page must be a positive integer' });
        }
        page = parsedPage;
      }
      let limit = 50;
      if (req.query.limit !== undefined && req.query.limit !== '') {
        const parsedLimit = parseBoundedInt(req.query.limit);
        if (parsedLimit === null) {
          return res.status(400).json({ message: 'limit must be a positive integer between 1 and 100' });
        }
        limit = Math.min(parsedLimit, 100);
      }
      const search = req.query.search as string;
      const category = req.query.category as string;
      const status = req.query.status as string;
      // Run16 BUG-035: pass the whitelisted sort through to the repo
      // (unknown values fall back to newest-first inside listResources).
      const sort = req.query.sort as "name-asc" | "name-desc" | "newest" | "oldest" | undefined;
      
      const result = await resourceRepo.listResources({
        page,
        limit,
        search,
        category,
        status: status || undefined,
        sort
      });
      
      res.json({
        resources: result.resources,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      });
    } catch (error) {
      console.error('Error fetching admin resources:', error);
      res.status(500).json({ message: 'Failed to fetch resources' });
    }
  });

  // POST /api/admin/resources - Create a new resource (admin only)
  app.post('/api/admin/resources', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      
      // Run16 BUG-001/BUG-031 + Run21 R4-016: admin-created resources go live
      // immediately — full shared validation (https-only bounded URL, visible
      // title, bounded description when provided).
      const createSchema = insertResourceSchema.extend({
        title: resourceTitleSchema,
        url: httpsUrlSchema,
        description: resourceDescriptionSchema.optional(),
      });
      
      const validationResult = createSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      // Task #248: entity-escaped text must never be stored (shared decode
      // step with submit/admin-edit/AI imports).
      const validatedData = decodeResourceTextFields(validationResult.data);

      const resolvedCategory = validatedData.category || 'General Tools';
      const resolvedSubcategory = validatedData.subcategory || null;
      let resolvedSubSubcategory = validatedData.subSubcategory || null;

      // Run21 R4-037: null out labels that can't be contained under the
      // resolved category > subcategory chain instead of storing orphans.
      const createContained = await ensureSubSubcategoryExists(
        categoryRepo,
        resolvedCategory,
        resolvedSubcategory,
        resolvedSubSubcategory,
      );
      if (!createContained) resolvedSubSubcategory = null;

      const newResource = await resourceRepo.createResource({
        title: validatedData.title,
        url: validatedData.url,
        description: validatedData.description || '',
        category: resolvedCategory,
        subcategory: resolvedSubcategory,
        subSubcategory: resolvedSubSubcategory,
        resourceFormat: validatedData.resourceFormat,
        provider: validatedData.provider,
        skillLevel: validatedData.skillLevel,
        status: validatedData.status || 'approved',
        submittedBy: userId
      });
      
      await auditRepo.logResourceAudit(
        newResource.id,
        'created',
        userId,
        { title: validatedData.title, url: validatedData.url },
        'Resource created by admin'
      );
      
      res.status(201).json(newResource);
    } catch (error) {
      console.error('Error creating resource:', error);
      res.status(500).json({ message: 'Failed to create resource' });
    }
  });
  
  // --- Resource Edit Management Routes ---
  
  // GET /api/admin/resource-edits - Get all pending resource edits (admin only)
  app.get('/api/admin/resource-edits', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const edits = await auditRepo.getPendingResourceEdits();
      
      const editsWithResources = await Promise.all(
        edits.map(async (edit) => {
          const resource = await resourceRepo.getResource(edit.resourceId);
          return {
            ...edit,
            resource
          };
        })
      );
      
      res.json(editsWithResources);
    } catch (error) {
      console.error('Error fetching pending edits:', error);
      res.status(500).json({ message: 'Failed to fetch pending edits' });
    }
  });
  
  // POST /api/admin/resource-edits/:id/approve - Approve an edit (admin only)
  app.post('/api/admin/resource-edits/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const editId = parseInt(req.params.id);
      const userId = req.dbUser.id;
      
      if (isNaN(editId)) {
        return res.status(400).json({ message: 'Invalid edit ID' });
      }
      
      await auditRepo.approveResourceEdit(editId, userId);
      
      res.json({ message: 'Edit approved and merged successfully' });
    } catch (error: any) {
      console.error('Error approving edit:', error);
      
      if (
        error.message &&
        (error.message.includes('Conflict detected') ||
          error.message.includes('Merge conflict detected') ||
          error.message.includes('already processed'))
      ) {
        return res.status(409).json({ 
          message: error.message,
          conflict: true
        });
      }
      
      res.status(500).json({ message: error.message || 'Failed to approve edit' });
    }
  });
  
  // POST /api/admin/resource-edits/:id/reject - Reject an edit (admin only)
  app.post('/api/admin/resource-edits/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const editId = parseInt(req.params.id);
      const userId = req.dbUser.id;
      const { reason } = req.body;
      
      if (isNaN(editId)) {
        return res.status(400).json({ message: 'Invalid edit ID' });
      }
      
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({ message: 'Rejection reason is required (minimum 10 characters)' });
      }
      
      await auditRepo.rejectResourceEdit(editId, userId, reason);
      
      res.json({ message: 'Edit rejected successfully' });
    } catch (error: any) {
      console.error('Error rejecting edit:', error);
      if (error?.message?.includes('not pending')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: error.message || 'Failed to reject edit' });
    }
  });
  
  // POST /api/claude/analyze - Analyze URL with Claude AI (ADMIN ONLY)
  // NB-022 (run23): this endpoint runs a paid Claude call per request; behind
  // the shared aiLimiter (10 req / 15 min / IP), caller errors are 4xx not 5xx.
  // R5-030 (run25): OWNER DECISION — restricted to admins. A signed-up free
  // account could previously mint live paid Claude analyses (20/day quota);
  // the owner chose zero non-admin paid exposure over keeping AI-assisted
  // suggestions for regular users. Non-admin authenticated callers now get
  // 403 (the suggest-edit dialog hides the button for them). The per-user
  // daily quota is kept as defense-in-depth for admin accounts.
  const CLAUDE_ANALYZE_DAILY_LIMIT = 20;
  const claudeAnalyzeQuota = new Map<string, { day: string; count: number }>();
  app.post('/api/claude/analyze', isAuthenticated, isAdmin, aiLimiter, async (req: any, res) => {
    try {
      const { url } = req.body ?? {};

      const quotaUserId = req.dbUser?.id;
      if (!quotaUserId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const today = new Date().toISOString().slice(0, 10);
      // Lazy prune: entries from previous days are dead weight.
      if (claudeAnalyzeQuota.size > 5000) {
        for (const [k, v] of claudeAnalyzeQuota) {
          if (v.day !== today) claudeAnalyzeQuota.delete(k);
        }
      }
      const quota = claudeAnalyzeQuota.get(quotaUserId);
      const used = quota && quota.day === today ? quota.count : 0;
      if (used >= CLAUDE_ANALYZE_DAILY_LIMIT) {
        // BUG-001 (Audit 2): every 429 carries Retry-After — here, seconds
        // until the daily quota resets at UTC midnight — and shares the
        // negotiated response contract.
        const nextUtcMidnight = new Date(`${today}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000;
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil((nextUtcMidnight - Date.now()) / 1000))));
        return send429(req, res, `Daily AI analysis limit reached (${CLAUDE_ANALYZE_DAILY_LIMIT}/day). Try again tomorrow.`);
      }

      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ message: 'URL is required' });
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url.trim());
      } catch {
        return res.status(400).json({ message: 'URL must be a valid absolute http(s) URL' });
      }
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ message: 'URL must use http or https' });
      }

      if (!claudeService.isAvailable()) {
        return res.status(503).json({ 
          message: 'Claude AI service is not available',
          available: false
        });
      }

      // Count the attempt BEFORE the paid call — a failed/aborted analysis
      // still consumed a Claude request.
      claudeAnalyzeQuota.set(quotaUserId, { day: today, count: used + 1 });

      const analysis = await claudeService.analyzeURL(url.trim());
      
      if (!analysis) {
        // R5-030: an allowlisted-but-unretrievable URL (or an empty/unparseable
        // model response) is not a server outage — the paid call already ran or
        // the target could not be fetched. Return a 4xx (never 502) so callers
        // fall back to manual entry instead of retrying against a "server error".
        return res.status(422).json({
          message: "Couldn't analyze that URL — the site may be blocking automated access or returned nothing usable. You can fill in the details manually.",
        });
      }
      
      res.json(analysis);
    } catch (error: any) {
      // R5-030 (run24): caller-side failures are 4xx, never 500 — an
      // unreachable-but-valid URL is not a server outage.
      const msg = String(error?.message ?? '');
      if (
        msg === 'Invalid URL format' ||
        msg === 'Only HTTPS URLs are allowed' ||
        msg.includes('not in the allowlist')
      ) {
        return res.status(400).json({ message: msg });
      }
      if (msg === 'Request timeout' || msg.startsWith('URL fetch failed') || msg.includes('Content too large')) {
        return res.status(422).json({
          message: "Couldn't retrieve that URL — the site may be blocking automated access. You can fill in the details manually.",
        });
      }
      console.error('Error analyzing URL:', error);
      res.status(500).json({ message: 'Failed to analyze URL' });
    }
  });

  // --- Category Management Routes ---
  
  // GET /api/admin/categories - List all categories
  app.get('/api/admin/categories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categories = await categoryRepo.listCategories();

      // Run3 audit R3-16: use the approved-only per-category counts (single
      // GROUP BY query) so the admin Categories tab matches the public
      // /api/categories resourceCount exactly. getCategoryResourceCount
      // (all-statuses) is intentionally left unchanged — it backs the
      // taxonomy delete guard, which must see pending/rejected rows too.
      const approvedCounts = await categoryRepo.getResourceCountsByCategory();
      const categoriesWithCounts = categories.map((cat) => ({
        ...cat,
        resourceCount: approvedCounts[cat.name] ?? 0,
      }));

      res.json(categoriesWithCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });
  
  // POST /api/admin/categories - Create a new category
  app.post('/api/admin/categories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { insertCategorySchema } = await import('@shared/schema');
      
      const validationResult = insertCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const newCategory = await categoryRepo.createCategory(validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'category_created',
        req.dbUser.id,
        { category: newCategory },
        `Created category: ${newCategory.name}`
      );
      
      res.status(201).json(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create category' });
    }
  });
  
  // PATCH /api/admin/categories/:id - Update a category
  app.patch('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const { updateCategorySchema } = await import('@shared/schema');
      
      const validationResult = updateCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const existingCategory = await categoryRepo.getCategory(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const updatedCategory = await categoryRepo.updateCategory(categoryId, validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'category_updated',
        req.dbUser.id,
        { before: existingCategory, after: updatedCategory },
        `Updated category: ${existingCategory.name}`
      );
      
      res.json(updatedCategory);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: 'Failed to update category' });
    }
  });
  
  // DELETE /api/admin/categories/:id - Delete a category
  app.delete('/api/admin/categories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const category = await categoryRepo.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      const resourceCount = await categoryRepo.getCategoryResourceCount(category.name);
      if (resourceCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete category with ${resourceCount} resources. Please reassign or delete resources first.` 
        });
      }
      
      await categoryRepo.deleteCategory(categoryId);
      
      await auditRepo.logResourceAudit(
        null,
        'category_deleted',
        req.dbUser.id,
        { category },
        `Deleted category: ${category.name}`
      );
      
      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ message: 'Failed to delete category' });
    }
  });
  
  // --- Subcategory Management Routes ---
  
  // GET /api/admin/subcategories - List all subcategories (optionally filtered by category)
  app.get('/api/admin/subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      
      const subcategories = await categoryRepo.listSubcategories(categoryId);
      
      const subcategoriesWithCounts = await Promise.all(
        subcategories.map(async (sub) => {
          const count = await categoryRepo.getSubcategoryResourceCount(sub.name);
          return { ...sub, resourceCount: count };
        })
      );
      
      res.json(subcategoriesWithCounts);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch subcategories' });
    }
  });
  
  // POST /api/admin/subcategories - Create a new subcategory
  app.post('/api/admin/subcategories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { insertSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = insertSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const categoryId = validationResult.data.categoryId;
      if (!categoryId) {
        return res.status(400).json({ message: 'Category ID is required' });
      }
      
      const category = await categoryRepo.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Parent category not found' });
      }
      
      // BUG-056 (run25): duplicate display names under the same parent were
      // accepted whenever the caller supplied a different slug — two
      // identically-named siblings are indistinguishable in every picker.
      const siblingSubcategories = await categoryRepo.listSubcategories(categoryId);
      const requestedName = String(validationResult.data.name || '').trim().toLowerCase();
      const nameDup = siblingSubcategories.find(
        (s) => s.name.trim().toLowerCase() === requestedName
      );
      if (nameDup) {
        return res.status(409).json({
          message: `A subcategory named "${nameDup.name}" already exists under ${category.name} (id ${nameDup.id}). Rename it or reuse the existing one.`,
        });
      }
      
      const newSubcategory = await categoryRepo.createSubcategory(validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'subcategory_created',
        req.dbUser.id,
        { subcategory: newSubcategory },
        `Created subcategory: ${newSubcategory.name} under ${category.name}`
      );
      
      res.status(201).json(newSubcategory);
    } catch (error) {
      console.error('Error creating subcategory:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create subcategory' });
    }
  });
  
  // PATCH /api/admin/subcategories/:id - Update a subcategory
  app.patch('/api/admin/subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subcategoryId = parseInt(req.params.id);
      
      if (isNaN(subcategoryId)) {
        return res.status(400).json({ message: 'Invalid subcategory ID' });
      }
      
      const { updateSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = updateSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const existingSubcategory = await categoryRepo.getSubcategory(subcategoryId);
      if (!existingSubcategory) {
        return res.status(404).json({ message: 'Subcategory not found' });
      }
      
      if (validationResult.data.categoryId !== undefined && validationResult.data.categoryId !== null) {
        const category = await categoryRepo.getCategory(validationResult.data.categoryId);
        if (!category) {
          return res.status(404).json({ message: 'Parent category not found' });
        }
      }
      
      // BUG-056 (run25): neither renames NOR category moves may create
      // duplicate sibling display names — a move with no rename lands the
      // EXISTING name among new siblings, so check the destination whenever
      // either field changes, using the effective (new ?? current) values.
      if (validationResult.data.name !== undefined || validationResult.data.categoryId != null) {
        const targetCategoryId = validationResult.data.categoryId ?? existingSubcategory.categoryId;
        const effectiveName = String(validationResult.data.name ?? existingSubcategory.name ?? '').trim().toLowerCase();
        const siblings = await categoryRepo.listSubcategories(targetCategoryId ?? undefined);
        const nameDup = siblings.find(
          (s) => s.id !== subcategoryId && s.name.trim().toLowerCase() === effectiveName
        );
        if (nameDup) {
          return res.status(409).json({
            message: `A subcategory named "${nameDup.name}" already exists under this category (id ${nameDup.id}).`,
          });
        }
      }
      
      const updatedSubcategory = await categoryRepo.updateSubcategory(subcategoryId, validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'subcategory_updated',
        req.dbUser.id,
        { before: existingSubcategory, after: updatedSubcategory },
        `Updated subcategory: ${existingSubcategory.name}`
      );
      
      res.json(updatedSubcategory);
    } catch (error) {
      console.error('Error updating subcategory:', error);
      res.status(500).json({ message: 'Failed to update subcategory' });
    }
  });
  
  // DELETE /api/admin/subcategories/:id - Delete a subcategory
  app.delete('/api/admin/subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subcategoryId = parseInt(req.params.id);
      
      if (isNaN(subcategoryId)) {
        return res.status(400).json({ message: 'Invalid subcategory ID' });
      }
      
      const subcategory = await categoryRepo.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: 'Subcategory not found' });
      }
      
      const resourceCount = await categoryRepo.getSubcategoryResourceCount(subcategory.name);
      if (resourceCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete subcategory with ${resourceCount} resources. Please reassign or delete resources first.` 
        });
      }
      
      await categoryRepo.deleteSubcategory(subcategoryId);
      
      await auditRepo.logResourceAudit(
        null,
        'subcategory_deleted',
        req.dbUser.id,
        { subcategory },
        `Deleted subcategory: ${subcategory.name}`
      );
      
      res.json({ message: 'Subcategory deleted successfully' });
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      res.status(500).json({ message: 'Failed to delete subcategory' });
    }
  });
  
  // --- Sub-subcategory Management Routes ---
  
  // GET /api/admin/sub-subcategories - List all sub-subcategories (optionally filtered by subcategory)
  app.get('/api/admin/sub-subcategories', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const subcategoryId = req.query.subcategoryId ? parseInt(req.query.subcategoryId as string) : undefined;
      
      const subSubcategories = await categoryRepo.listSubSubcategories(subcategoryId);
      
      const subSubcategoriesWithCounts = await Promise.all(
        subSubcategories.map(async (subSub) => {
          const count = await categoryRepo.getSubSubcategoryResourceCount(subSub.name);
          return { ...subSub, resourceCount: count };
        })
      );
      
      res.json(subSubcategoriesWithCounts);
    } catch (error) {
      console.error('Error fetching sub-subcategories:', error);
      res.status(500).json({ message: 'Failed to fetch sub-subcategories' });
    }
  });
  
  // POST /api/admin/sub-subcategories - Create a new sub-subcategory
  app.post('/api/admin/sub-subcategories', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { insertSubSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = insertSubSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const subcategoryId = validationResult.data.subcategoryId;
      if (!subcategoryId) {
        return res.status(400).json({ message: 'Subcategory ID is required' });
      }
      
      const subcategory = await categoryRepo.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: 'Parent subcategory not found' });
      }
      
      // BUG-003 (run19): block creating a duplicate-name/slug row under a
      // different parent — per-import copies fragment the taxonomy (HLS x11).
      const globalDup = await categoryRepo.findSubSubcategoryDuplicateGlobal(
        validationResult.data.name,
        validationResult.data.slug,
      );
      if (globalDup) {
        return res.status(409).json({
          message: `A sub-subcategory named "${globalDup.name}" (slug "${globalDup.slug}") already exists (id ${globalDup.id}). Duplicate sub-subcategories fragment the taxonomy — reuse the existing one or rename it instead.`,
        });
      }
      
      const newSubSubcategory = await categoryRepo.createSubSubcategory(validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'sub_subcategory_created',
        req.dbUser.id,
        { subSubcategory: newSubSubcategory },
        `Created sub-subcategory: ${newSubSubcategory.name} under ${subcategory.name}`
      );
      
      res.status(201).json(newSubSubcategory);
    } catch (error) {
      console.error('Error creating sub-subcategory:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      
      res.status(500).json({ message: 'Failed to create sub-subcategory' });
    }
  });
  
  // PATCH /api/admin/sub-subcategories/:id - Update a sub-subcategory
  app.patch('/api/admin/sub-subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subSubcategoryId = parseInt(req.params.id);
      
      if (isNaN(subSubcategoryId)) {
        return res.status(400).json({ message: 'Invalid sub-subcategory ID' });
      }
      
      const { updateSubSubcategorySchema } = await import('@shared/schema');
      
      const validationResult = updateSubSubcategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: validationResult.error.issues
        });
      }
      
      const existingSubSubcategory = await categoryRepo.getSubSubcategory(subSubcategoryId);
      if (!existingSubSubcategory) {
        return res.status(404).json({ message: 'Sub-subcategory not found' });
      }
      
      if (validationResult.data.subcategoryId !== undefined && validationResult.data.subcategoryId !== null) {
        const subcategory = await categoryRepo.getSubcategory(validationResult.data.subcategoryId);
        if (!subcategory) {
          return res.status(404).json({ message: 'Parent subcategory not found' });
        }
      }
      
      const updatedSubSubcategory = await categoryRepo.updateSubSubcategory(subSubcategoryId, validationResult.data);
      
      await auditRepo.logResourceAudit(
        null,
        'sub_subcategory_updated',
        req.dbUser.id,
        { before: existingSubSubcategory, after: updatedSubSubcategory },
        `Updated sub-subcategory: ${existingSubSubcategory.name}`
      );
      
      res.json(updatedSubSubcategory);
    } catch (error) {
      console.error('Error updating sub-subcategory:', error);
      res.status(500).json({ message: 'Failed to update sub-subcategory' });
    }
  });
  
  // DELETE /api/admin/sub-subcategories/:id - Delete a sub-subcategory
  app.delete('/api/admin/sub-subcategories/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const subSubcategoryId = parseInt(req.params.id);
      
      if (isNaN(subSubcategoryId)) {
        return res.status(400).json({ message: 'Invalid sub-subcategory ID' });
      }
      
      const subSubcategory = await categoryRepo.getSubSubcategory(subSubcategoryId);
      if (!subSubcategory) {
        return res.status(404).json({ message: 'Sub-subcategory not found' });
      }
      
      const resourceCount = await categoryRepo.getSubSubcategoryResourceCount(subSubcategory.name);
      if (resourceCount > 0) {
        return res.status(400).json({ 
          message: `Cannot delete sub-subcategory with ${resourceCount} resources. Please reassign or delete resources first.` 
        });
      }
      
      await categoryRepo.deleteSubSubcategory(subSubcategoryId);
      
      await auditRepo.logResourceAudit(
        null,
        'sub_subcategory_deleted',
        req.dbUser.id,
        { subSubcategory },
        `Deleted sub-subcategory: ${subSubcategory.name}`
      );
      
      res.json({ message: 'Sub-subcategory deleted successfully' });
    } catch (error) {
      console.error('Error deleting sub-subcategory:', error);
      res.status(500).json({ message: 'Failed to delete sub-subcategory' });
    }
  });
}
