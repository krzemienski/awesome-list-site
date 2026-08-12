/**
 * ----------------------------------------------------------------------------
 * DOMAIN ROUTER: catalog-contributions
 * ----------------------------------------------------------------------------
 *
 * Task #303 (Major improvement 10: safer modular API architecture).
 *
 * EXACT extraction of the public catalog / search / resource-detail /
 * contribution / taxonomy surface from server/routes.ts (source lines
 * ~1442-2468). Route order, middleware arrays, and status/header/body
 * behavior are preserved verbatim. The endpoints are wrapped in a registrar
 * that accepts `app` and an explicit `CatalogContributionsRoutesContext`
 * carrying the limiters, middleware, and repositories the copied handlers
 * reference (which live in the `registerRoutes` closure in routes.ts).
 *
 * The two request-scoped local helpers the original block defines inline
 * (`toPublicResource`, `firstQueryValue`) and the shared local handlers
 * (`getResourceByIdHandler`, `createResourceHandler`) are reproduced here
 * verbatim. `sendOperationalFailure` is a module-level helper in routes.ts;
 * it is copied exactly (a duplicated helper) so this module is self-contained.
 *
 * Nothing here is wired into routes.ts yet — this is a self-contained module
 * that typechecks against the same imports the original handlers used.
 *
 * Endpoints (in original order):
 *   GET    /api/resources                      (resourceReadLimiter)
 *   GET    /api/search                         (resourceReadLimiter)
 *   POST   /api/telemetry/dead-link
 *   GET    /api/resources/check-url
 *   GET    /api/resources/:id(\d+)             (resourceReadLimiter) [shared handler]
 *   GET    /api/resource/:id(\d+)              (resourceReadLimiter) [shared handler]
 *   GET    /api/resources/:id/related          (resourceReadLimiter)
 *   POST   /api/resources                      (isAuthenticated) [shared handler]
 *   POST   /api/submit                         (isAuthenticated) [shared handler]
 *   GET    /api/resources/pending              (isAuthenticated, isAdmin)
 *   PUT    /api/resources/:id/approve          (isAuthenticated, isAdmin)
 *   PUT    /api/resources/:id/reject           (isAuthenticated, isAdmin)
 *   POST   /api/resources/:id/edits            (isAuthenticated)
 *   GET    /api/categories
 *   GET    /api/tags
 *   GET    /api/subcategories
 *   GET    /api/sub-subcategories
 * ----------------------------------------------------------------------------
 */

import type { Express, Response, RequestHandler } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import {
  UserRepository,
  ResourceRepository,
  CategoryRepository,
  AuditRepository,
} from "../../repositories";
import { insertResourceSchema, EDITABLE_RESOURCE_FIELDS } from "@shared/schema";
import {
  TAG_MAX_LENGTH,
  NO_HTML_RE,
  stripInvisible,
  SINGLE_LINE_CONTROL_RE,
  httpsUrlSchema,
  webUrlSchema,
  resourceTitleSchema,
  resourceDescriptionSchema,
  tagSchema,
} from "@shared/validation";
import { normalizeSearchQuery } from "@shared/searchNormalize";
import {
  RESOURCE_FORMAT_VALUES,
  RESOURCE_PROVIDER_VALUES,
  RESOURCE_SEARCH_SORT_VALUES,
  RESOURCE_SKILL_LEVEL_VALUES,
  resourceFormatSchema,
  resourceProviderSchema,
  resourceSkillLevelSchema,
} from "@shared/resourceFacets";
import { parseTagFilterValues } from "@shared/tagNormalize";
import { parseBoundedInt, PG_INT_MAX } from "../../validation/inputs";
import { trackServerEvent } from "../../lib/mixpanelServer";
import { ensureSubSubcategoryExists } from "../../repositories/ensureSubSubcategory";
import { ensureMinDescription, decodeResourceTextFields } from "../../github/importHygiene";
import { buildRelatedResources } from "../../services/relatedResources";
import { stripInternalResourceFields } from "../../lib/publicResource";
import { claudeService } from "../../ai/claudeService";
import { getPublicCacheValue } from "../../cache/publicCache";
import { isDatabaseUnavailableError } from "../../db/errors";
import { ServiceUnavailableError } from "../../middleware/errors";

/**
 * Copied verbatim from server/routes.ts (module-level helper). Duplicated here
 * so the extracted handlers keep byte-identical operational-failure behavior
 * without importing from routes.ts.
 */
function sendOperationalFailure(
  res: Response,
  error: unknown,
  fallbackMessage: string,
) {
  if (
    error instanceof ServiceUnavailableError ||
    isDatabaseUnavailableError(error)
  ) {
    return res
      .status(503)
      .set("Retry-After", "1")
      .json({ message: "Service is temporarily unavailable" });
  }
  return res.status(500).json({ message: fallbackMessage });
}

/**
 * Everything the copied catalog/contribution handlers reference from the
 * `registerRoutes` closure in server/routes.ts.
 */
export interface CatalogContributionsRoutesContext {
  /** Public resource-read limiter (240/min/IP). */
  resourceReadLimiter: RequestHandler;
  /** Passport-session auth guard. */
  isAuthenticated: RequestHandler;
  /** Admin-role guard. */
  isAdmin: RequestHandler;
  userRepo: UserRepository;
  resourceRepo: ResourceRepository;
  categoryRepo: CategoryRepository;
  auditRepo: AuditRepository;
}

export function registerCatalogContributionsRoutes(
  app: Express,
  ctx: CatalogContributionsRoutesContext,
): void {
  const {
    resourceReadLimiter,
    isAuthenticated,
    isAdmin,
    userRepo,
    resourceRepo,
    categoryRepo,
    auditRepo,
  } = ctx;

  // NEW-019 / BUG-027 (run13): public resource serializer. Strips internal
  // fields from any resource returned on a public endpoint: `searchTsv`,
  // moderation/audit columns (submittedBy, approvedBy), GitHub sync-pipeline
  // state (githubSynced, lastSyncedAt), and enrichment-pipeline internals in
  // metadata (source, confidence, discoveryId, researchJobId,
  // enrichmentError). `status` stays (client soft-404/pending views key off
  // it); admin surfaces read the unstripped rows via /api/admin/* routes.
  const toPublicResource = <T extends Record<string, any>>(r: T) =>
    stripInternalResourceFields(r);

  // BUG-v3-M07 (run12): duplicated query params (?q=a&q=b) arrive as arrays,
  // and `(array as string).replace(...)` threw → 500. Coerce every scalar
  // query param through this helper: first value wins, non-strings drop to
  // undefined (e.g. the qs "?q[a]=b" object form).
  const firstQueryValue = (v: unknown): string | undefined => {
    if (Array.isArray(v)) v = v[0];
    return typeof v === 'string' ? v : undefined;
  };

  // GET /api/resources - List approved resources (public)
  app.get('/api/resources', resourceReadLimiter, async (req, res) => {
    try {
      // Support explicit offset/limit for pagination (BUG-003). When offset is
      // provided, it overrides `page`. Clamp to safe integers; reject non-numeric
      // values with 400. Run3 audit R3-06: the cap is 1000 (was 200, which
      // silently truncated limit=2000 requests) and the response now carries
      // `limit` / `offset` / `nextOffset` so callers can page the full catalog:
      // repeat with offset=nextOffset until nextOffset is null.
      // BUG-039: `cursor` is accepted as an alias for `offset` (and the
      // response carries a matching `nextCursor`), since API consumers
      // reasonably probe for cursor-style paging. offset wins if both given.
      const rawCursor = firstQueryValue(req.query.cursor);
      const rawOffset = firstQueryValue(req.query.offset) ?? rawCursor;
      const rawLimit = firstQueryValue(req.query.limit);
      const rawPage = firstQueryValue(req.query.page);
      // Run16 BUG-090 + Audit2 BUG-025: ONE consistent pagination contract —
      // non-numeric values are 400 (invalid_offset / invalid_limit /
      // invalid_page) and numeric out-of-range values are 400 too (limit
      // outside [1,100], offset < 0, page < 1). Nothing is silently clamped
      // anymore: the clamp contradicted the documented "between 1 and 100"
      // error text (limit=0→1, limit=100000→100, offset=-3→0).
      // Run16 BUG-091: error bodies carry `message` alongside the machine code.
      // NB-019 (run23): strict integer forms + hard bounds. "1e20" passed the
      // old isNaN() check and then parseInt silently read it as 1; all-digit
      // values past Number.MAX_SAFE_INTEGER / PG int4 range overflowed inside
      // PG (offset → 500) or produced absurd page metadata (page=1e18).
      // Non-integer forms and out-of-bound magnitudes are caller bugs → 400.
      const INT_RE = /^-?\d+$/;
      const outOfBounds = (s: string) =>
        !INT_RE.test(s) || !Number.isSafeInteger(Number(s)) || Math.abs(Number(s)) > PG_INT_MAX;
      if (rawOffset !== undefined && outOfBounds(String(rawOffset).trim())) {
        return res.status(400).json({ error: 'invalid_offset', message: 'offset must be an integer between 0 and 2147483647' });
      }
      if (rawLimit !== undefined && outOfBounds(String(rawLimit).trim())) {
        return res.status(400).json({ error: 'invalid_limit', message: 'limit must be an integer between 1 and 100' });
      }
      if (rawPage !== undefined && outOfBounds(rawPage.trim())) {
        return res.status(400).json({ error: 'invalid_page', message: 'page must be an integer between 1 and 2147483647' });
      }
      // BUG-053 (run18): a negative/zero page is a caller bug, not something
      // to silently coerce to page 1 — reject it explicitly.
      if (rawPage !== undefined && parseInt(rawPage.trim()) < 1) {
        return res.status(400).json({ error: 'invalid_page', message: 'page must be >= 1' });
      }
      // BUG-050 (run14): cap page size at 100 (was 1000 — full-catalog scrape
      // in 3 requests). Paging via nextOffset/nextCursor still walks the whole
      // catalog; bulk consumers should use /api/awesome-list.
      // Audit2 BUG-025: numeric out-of-range values now REJECT (400) instead
      // of clamping, matching the error message this endpoint has always sent.
      const limit = rawLimit !== undefined ? parseInt(String(rawLimit).trim()) : 20;
      if (limit < 1 || limit > 100) {
        return res.status(400).json({ error: 'invalid_limit', message: 'limit must be an integer between 1 and 100' });
      }
      const parsedOffset = rawOffset !== undefined ? parseInt(String(rawOffset).trim()) : undefined;
      if (parsedOffset !== undefined && parsedOffset < 0) {
        return res.status(400).json({ error: 'invalid_offset', message: 'offset must be an integer between 0 and 2147483647' });
      }
      const offset = parsedOffset !== undefined
        ? parsedOffset
        : Math.max((parseInt(rawPage as string) || 1) - 1, 0) * limit;
      let category = firstQueryValue(req.query.category) as string;
      let subcategory = firstQueryValue(req.query.subcategory) as string;
      // BUG-015: accept `q` as an alias for `search` so /api/resources?q=… reaches
      // the real filter layer. `search` wins if both are present (explicit param).
      // NEW-012 + audit2 BUG-019: ONE shared normalization (control chars incl.
      // NUL — which Postgres rejects in text params — count as whitespace;
      // whitespace collapses; edge quotes drop). A query that normalizes to
      // empty ("%00", "%20%20%20") behaves EXACTLY like an absent search param,
      // instead of NUL → full catalog while spaces → zero rows.
      const rawSearch = firstQueryValue(req.query.search) ?? firstQueryValue(req.query.q);
      const search = typeof rawSearch === 'string'
        ? normalizeSearchQuery(rawSearch) || undefined
        : undefined;

      // Task #294: controlled public facet contract. Unknown is a valid,
      // explicit selection; unsupported controlled values are caller errors,
      // not silent empty-result filters. Tags keep the established comma-
      // separated or repeated URL forms (including legacy `tag`) and are
      // canonicalized for singular/plural parity.
      const parseControlledFacet = <T extends string>(
        param: string,
        schema: z.ZodType<T>,
        allowed: readonly T[],
      ): T | undefined | false => {
        const raw = firstQueryValue(req.query[param]);
        if (raw === undefined || raw.trim() === '') return undefined;
        const parsed = schema.safeParse(raw.trim().toLowerCase());
        if (!parsed.success) {
          res.status(400).json({
            error: `invalid_${param}`,
            message: `${param} must be one of: ${allowed.join(', ')}`,
            allowed,
          });
          return false;
        }
        return parsed.data;
      };
      const provider = parseControlledFacet('provider', resourceProviderSchema, RESOURCE_PROVIDER_VALUES);
      if (provider === false) return;
      const resourceFormat = parseControlledFacet('format', resourceFormatSchema, RESOURCE_FORMAT_VALUES);
      if (resourceFormat === false) return;
      const skillLevel = parseControlledFacet('skillLevel', resourceSkillLevelSchema, RESOURCE_SKILL_LEVEL_VALUES);
      if (skillLevel === false) return;

      const rawTagValues = [
        ...(Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]),
        ...(Array.isArray(req.query.tag) ? req.query.tag : [req.query.tag]),
      ];
      const hasTagParam = req.query.tags !== undefined || req.query.tag !== undefined;
      const tags = parseTagFilterValues(rawTagValues);
      if (hasTagParam && (tags.length === 0 || tags.length > 10 || tags.some((tag) => tag.length > TAG_MAX_LENGTH))) {
        return res.status(400).json({
          error: 'invalid_tags',
          message: `tags/tag must contain 1 to 10 repeated or comma-separated values of at most ${TAG_MAX_LENGTH} characters each`,
        });
      }

      const rawFacets = firstQueryValue(req.query.facets);
      if (rawFacets !== undefined && rawFacets !== 'true' && rawFacets !== 'false') {
        return res.status(400).json({
          error: 'invalid_facets',
          message: 'facets must be true or false',
          allowed: ['true', 'false'],
        });
      }
      const includeFacets = rawFacets === 'true';

      // Accept category/subcategory as either the display NAME (what the client
      // sends) or a URL slug (e.g. ?category=encoding-codecs — BUG-022). Real
      // names contain spaces/capitals/'&', so a value matching the slug shape is
      // resolved to its canonical name; anything else passes through unchanged
      // (no wasted query for the common name-based calls). Subcategory slugs are
      // unique only per category, so they resolve only once the category does.
      const SLUG_SHAPE = /^[a-z0-9-]+$/;
      let resolvedCategory: { id: number; name: string } | undefined;
      if (category && SLUG_SHAPE.test(category)) {
        const cat = await categoryRepo.getCategoryBySlug(category);
        if (cat) {
          resolvedCategory = cat;
          category = cat.name;
        }
      }
      if (subcategory && SLUG_SHAPE.test(subcategory)) {
        // Prefer the category-scoped lookup when the category is known;
        // otherwise (NEW-008) resolve the slug globally so
        // `?subcategory=<slug>` filters even without a category param.
        const sub = resolvedCategory
          ? await categoryRepo.getSubcategoryBySlug(subcategory, resolvedCategory.id)
          : await categoryRepo.getSubcategoryBySlugGlobal(subcategory);
        if (sub) subcategory = sub.name;
      }

      // BUG-002: sub-subcategory filter. The audit's reproduction passes the
      // display NAME (e.g. subSubcategory=AV1), matching the existing
      // subcategory behaviour, so pass it straight through to listResources.
      const subSubcategory = firstQueryValue(req.query.subSubcategory);

      // R3-H08: server-side sort with allow-list; unknown values 400 (mirrors
      // the invalid_status pattern) so callers learn the valid options.
      const ALLOWED_SORTS = RESOURCE_SEARCH_SORT_VALUES;
      const requestedSort = firstQueryValue(req.query.sort);
      if (requestedSort !== undefined && !ALLOWED_SORTS.includes(requestedSort as any)) {
        return res.status(400).json({ error: 'invalid_sort', message: `sort must be one of: ${ALLOWED_SORTS.join(', ')}`, allowed: ALLOWED_SORTS });
      }
      const sort = requestedSort as (typeof ALLOWED_SORTS)[number] | undefined;

      // BUG-004: respect ?status= with allow-list; default 'approved' for public.
      const ALLOWED_STATUSES = new Set(['approved', 'pending', 'rejected']);
      const requestedStatus = firstQueryValue(req.query.status);
      let statusFilter: string | undefined = 'approved';
      if (requestedStatus !== undefined) {
        if (!ALLOWED_STATUSES.has(requestedStatus)) {
          return res.status(400).json({ error: 'invalid_status', message: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`, allowed: Array.from(ALLOWED_STATUSES) });
        }
        // NEW-006 companion: non-approved listings are admin-only, otherwise
        // the detail endpoint's status gate is bypassable via bulk listing.
        // (The admin UI uses /api/resources/pending, which already requires
        // admin; this path only ever served anonymous probes.)
        if (requestedStatus !== 'approved') {
          // Clerk migration: req.dbUser IS the resolved user row.
          const requester = req.dbUser;
          if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ error: 'forbidden', message: 'Non-approved listings require admin access' });
          }
        }
        statusFilter = requestedStatus;
      }

      const result = await resourceRepo.listResources({
        offset,
        limit,
        status: statusFilter,
        category,
        subcategory,
        subSubcategory,
        search,
        tags,
        provider: provider || undefined,
        resourceFormat: resourceFormat || undefined,
        skillLevel: skillLevel || undefined,
        includeFacets,
        sort,
      });

      // R3-06: explicit paging metadata. nextOffset is null on the last page.
      const nextOffset = offset + result.resources.length < result.total
        ? offset + result.resources.length
        : null;
      // NEW-019: strip the internal `searchTsv` full-text vector from public
      // responses (never consumed by any client; it is an implementation
      // detail of the search index).
      const publicResources = result.resources.map(toPublicResource);
      // NEW-033: structured pagination metadata alongside the legacy
      // offset/nextOffset fields, so API consumers get page/totalPages/hasMore.
      const currentPage = Math.floor(offset / limit) + 1;
      const totalPages = Math.max(Math.ceil(result.total / limit), 1);
      res.json({
        ...result,
        resources: publicResources,
        limit,
        offset,
        nextOffset,
        nextCursor: nextOffset,
        pagination: {
          page: currentPage,
          limit,
          total: result.total,
          totalPages,
          hasMore: nextOffset !== null,
        },
      });
    } catch (error) {
      console.error('Error fetching resources:', error);
      sendOperationalFailure(res, error, 'Failed to fetch resources');
    }
  });

  // GET /api/search?q= - Public JSON search across approved resources. A thin
  // alias over listResources so the /search UI page and external/API callers
  // share one search path (and /api/search no longer 404s). Results are deduped
  // by normalized URL so near-duplicate rows never surface twice. Shape:
  // { query, total, results }.
  // BUG-v3-M14 (run12): the public search endpoint shares the resource-read
  // rate limit (100 req/min/IP, 429 + Retry-After) like the other public
  // GET resource surfaces.
  app.get('/api/search', resourceReadLimiter, async (req, res) => {
    try {
      // NEW-012 + audit2: the same shared normalization as /api/resources and
      // the /search page (control chars incl. NUL count as whitespace, runs
      // collapse, edge quotes drop) — so NUL/space/quote junk behaves
      // identically across every search surface.
      // BUG-v3-M07 (run12): duplicate ?q= params arrive as an array — coerce
      // to the first value instead of crashing on .replace.
      const q = normalizeSearchQuery(
        firstQueryValue(req.query.q) || firstQueryValue(req.query.search) || ''
      );
      if (q.length < 2) {
        return res.json({ query: q, total: 0, results: [] });
      }
      const limit = Math.min(Math.max(parseInt(firstQueryValue(req.query.limit) as string) || 100, 1), 200);
      // NB-021 (run23): offset pagination — `total` used to promise 1,275
      // matches for ?q=video while only the first `limit` (max 200) rows were
      // ever retrievable. Walk the full match set via offset/nextOffset.
      let offset = 0;
      const rawSearchOffset = firstQueryValue(req.query.offset);
      if (rawSearchOffset !== undefined && String(rawSearchOffset).trim() !== '') {
        const s = String(rawSearchOffset).trim();
        if (!/^\d+$/.test(s) || !Number.isSafeInteger(Number(s)) || Number(s) > PG_INT_MAX) {
          return res.status(400).json({ message: 'offset must be an integer between 0 and 2147483647' });
        }
        offset = Number(s);
      }
      const { resources, total } = await resourceRepo.listResources({
        page: 1,
        offset,
        limit,
        status: 'approved',
        search: q,
      });
      const seen = new Set<string>();
      const results = [] as typeof resources;
      for (const r of resources) {
        const key = (r.url || '').trim().toLowerCase().replace(/\/+$/, '') || `id:${r.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(r);
      }
      // `total` is the true match count from the repo (post-cleanup there are no
      // URL-duplicate rows, so it equals the deduped count); `results` is this page.
      // NEW-019: strip internal `searchTsv` from each public result.
      // NB-021: honest pagination metadata — repeat with offset=nextOffset
      // until nextOffset is null to retrieve every promised match.
      const nextOffset = offset + resources.length < total ? offset + resources.length : null;
      res.json({ query: q, total, limit, offset, nextOffset, results: results.map(toPublicResource) });
    } catch (error) {
      console.error('Error searching resources:', error);
      sendOperationalFailure(res, error, 'Failed to search resources');
    }
  });

  // POST /api/telemetry/dead-link - Client-side 404 telemetry (public, fire-and-forget)
  app.post('/api/telemetry/dead-link', (req, res) => {
    // R5-018 (run24): the client only ever sends its own location.pathname —
    // so the server contract matches: a rooted path ≤200 chars with no
    // protocol-relative form, no control characters; referrer must be a
    // same-origin http(s) URL or it is dropped to null (foreign strings were
    // an arbitrary-content log-injection channel).
    const deadLinkSchema = z.object({
      path: z.string().min(1).max(200)
        .regex(/^\/(?![/\\])/, 'path must be a rooted local path')
        .refine((p) => !SINGLE_LINE_CONTROL_RE.test(p), 'path must not contain control characters'),
      referrer: z.string().max(2000).nullable().optional(),
      ts: z.string().max(64).regex(/^[0-9TZ:.+-]*$/).optional(),
    });
    const parsed = deadLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    const { path, referrer, ts } = parsed.data;
    let safeReferrer: string | null = null;
    if (referrer) {
      try {
        const u = new URL(referrer);
        if ((u.protocol === 'https:' || u.protocol === 'http:') && u.host === req.get('host')) {
          safeReferrer = u.toString();
        }
      } catch {
        safeReferrer = null;
      }
    }
    console.warn(
      `[dead-link] path=${JSON.stringify(path)} referrer=${JSON.stringify(safeReferrer ?? '')} ts=${ts ?? new Date().toISOString()}`
    );
    res.status(204).end();
  });

  // GET /api/resources/check-url - Check if URL already exists (public)
  app.get('/api/resources/check-url', async (req, res) => {
    try {
      // Run15 BUG-037: trim like the submit schema does — a pasted URL with a
      // trailing space must resolve to the same duplicate-check result.
      const url = typeof req.query.url === 'string' ? req.query.url.trim() : '';

      if (!url) {
        return res.status(400).json({ message: 'URL parameter is required' });
      }

      // R5-016 (run24): mirror the submit path's normalization so the
      // pre-submit duplicate probe and the actual submit agree — probe the
      // normalized form too (corpus is pre-normalization until Run24E).
      let existingResource = await resourceRepo.getResourceByUrl(url);
      if (!existingResource) {
        const normalized = webUrlSchema.safeParse(url);
        if (normalized.success && normalized.data !== url) {
          existingResource = await resourceRepo.getResourceByUrl(normalized.data);
        }
      }

      // R5-045 (run24): answer is now {exists} ONLY. The old payload returned
      // id/title/category for ANY row — including pending and rejected
      // submissions, which are admin-only detail (BUG-025 stripped `status`
      // but the row's existence + title still leaked moderation-queue
      // contents to anonymous probes).
      res.json({ exists: !!existingResource });
    } catch (error) {
      console.error('Error checking URL:', error);
      sendOperationalFailure(res, error, 'Failed to check URL');
    }
  });

  // GET /api/resources/:id - Get single resource
  // :id constrained to digits so literal sub-routes like /api/resources/pending and
  // /api/resources/check-url are not shadowed by this dynamic param route.
  // Mounted on both the canonical plural path and the singular alias
  // /api/resource/:id (BUG-014) via a shared handler.
  const getResourceByIdHandler = async (req: any, res: any) => {
    try {
      // NB-008 (run23): all-digit ids past int4 range pass the \d+ route
      // regex and overflow inside PG → 500. Bound-check before the DB.
      const id = parseBoundedInt(req.params.id);
      if (id === null) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      const resource = await resourceRepo.getResource(id);

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // NEW-006: non-approved (pending/rejected) resources are not public.
      // Serve them only to admins (the admin UI deep-links into detail pages);
      // everyone else gets the same 404 as a missing id so status is not
      // leaked. This mirrors og-middleware, which already soft-404s
      // non-approved /resource/:id routes for crawlers.
      if (resource.status !== 'approved') {
        const userId = req.dbUser?.id;
        const user = userId ? await userRepo.getUser(userId) : undefined;
        if (!user || user.role !== 'admin') {
          return res.status(404).json({ message: 'Resource not found' });
        }
      }

      // NEW-019: strip internal `searchTsv` from the public detail response.
      res.json(toPublicResource(resource));
    } catch (error) {
      console.error('Error fetching resource:', error);
      sendOperationalFailure(res, error, 'Failed to fetch resource');
    }
  };
  app.get('/api/resources/:id(\\d+)', resourceReadLimiter, getResourceByIdHandler);
  app.get('/api/resource/:id(\\d+)', resourceReadLimiter, getResourceByIdHandler);

  app.get('/api/resources/:id/related', resourceReadLimiter, async (req, res) => {
    const empty = { similar: [], prerequisites: [], nextSteps: [], totalFound: 0 };
    try {
      // NB-008 (run23): bound-check (int4 overflow → 500 otherwise).
      const id = parseBoundedInt(req.params.id);
      if (id === null) {
        return res.json(empty);
      }
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 10);
      const resource = await resourceRepo.getResource(id);
      if (!resource) {
        return res.json(empty);
      }
      // NEW-006 companion: for a non-approved seed id, return the empty shape
      // to non-admins — a populated `similar` list would confirm the hidden
      // id exists and leak its category.
      if (resource.status !== 'approved') {
        // Clerk migration: req.dbUser IS the resolved user row.
        const requester = req.dbUser;
        if (!requester || requester.role !== 'admin') {
          return res.json(empty);
        }
      }
      // Pull a pool of approved resources in the same category to rank against.
      const { resources: pool } = await resourceRepo.listResources({
        page: 1,
        limit: 60,
        status: 'approved',
        category: resource.category ?? undefined,
      });
      const related = buildRelatedResources(resource, pool, limit);
      const sanitizeItems = (items: any[]) =>
        items.map((item) => ({
          ...item,
          resource: stripInternalResourceFields(item.resource),
        }));
      res.json({
        ...related,
        similar: sanitizeItems(related.similar),
        prerequisites: sanitizeItems(related.prerequisites),
        nextSteps: sanitizeItems(related.nextSteps),
      });
    } catch (error) {
      console.error('Error fetching related resources:', error);
      sendOperationalFailure(res, error, 'Failed to fetch related resources');
    }
  });

  // POST /api/resources - Submit new resource (authenticated)
  // Mounted on both the canonical path and the /api/submit alias (BUG-019) via a
  // shared handler so both inherit the identical auth + validation chain.
  const createResourceHandler = async (req: any, res: any) => {
    try {
      const userId = req.dbUser.id;

      // BUG-008: explicit server-side validation before DB insert
      // BUG-009 (run10): reject raw HTML/script markup in text fields. React
      // escapes on render so this is defense-in-depth, not an XSS patch —
      // markup in titles/descriptions is never legitimate catalog content.
      // Run21 R4-015/016/047/048/076: ALL content rules come from the shared
      // validation module (same schemas the client mounts via zodResolver):
      // - title: visible chars required (ZWSP/whitespace-only → 400), ≤200, no HTML
      // - url: https-only, ≤2048, no userinfo/control chars, dotted hostname
      // - description: required 10–1000 visible chars (mirrors the client rule)
      const submitSchema = z.object({
        url: httpsUrlSchema,
        title: resourceTitleSchema,
        category: z.string().min(1, 'Category is required'),
        description: resourceDescriptionSchema,
        subcategory: z.string().optional(),
        subSubcategory: z.string().optional(),
        // BUG-029 (run14): tags reach the DB via metadata.tags. Markup is
        // never legitimate tag content; cap count/length server-side.
        metadata: z.object({
          tags: z.array(tagSchema).max(10, 'At most 10 tags allowed').optional(),
        }).passthrough().optional(),
      });
      const submitValidation = submitSchema.safeParse(req.body);
      if (!submitValidation.success) {
        // BUG-019 (run18): surface per-field messages so the client can map
        // them onto form fields (metadata.tags → "tags") instead of a
        // generic field-less toast. `errors` kept for back-compat.
        const fieldErrors: Record<string, string> = {};
        for (const issue of submitValidation.error.issues) {
          let key = String(issue.path[0] ?? 'form');
          if (key === 'metadata' && issue.path[1] === 'tags') key = 'tags';
          if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        }
        return res.status(400).json({
          error: 'validation_failed',
          message: 'Validation failed',
          fieldErrors,
          errors: submitValidation.error.issues
        });
      }

      // BUG-008: validate category against known category slugs or names
      const knownCategories = await categoryRepo.listCategories();
      const validCategorySlugs = new Set(knownCategories.map(c => c.slug));
      const validCategoryNames = new Set(knownCategories.map(c => c.name));
      const submittedCategory = submitValidation.data.category;
      if (!validCategorySlugs.has(submittedCategory) && !validCategoryNames.has(submittedCategory)) {
        return res.status(400).json({ error: 'invalid_category', message: `Unknown category: ${submittedCategory}` });
      }

      // BUG-012: pre-check for duplicate URL → 409
      // R5-016 (run24): httpsUrlSchema now normalizes (tracking params
      // stripped, punycode host) — data.url is the POST-transform form and is
      // what gets stored. The corpus predates normalization (Run24E backfills
      // it), so until then the dup-check probes BOTH forms: the normalized
      // URL and the raw submitted one.
      const rawSubmittedUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
      const existingResource =
        (await resourceRepo.getResourceByUrl(submitValidation.data.url)) ||
        (rawSubmittedUrl && rawSubmittedUrl !== submitValidation.data.url
          ? await resourceRepo.getResourceByUrl(rawSubmittedUrl)
          : null);
      if (existingResource) {
        // BUG-v3-M11 (run12): no internal identifiers in the duplicate
        // response — the client only needs to know the URL already exists
        // (and never consumed existingId).
        return res.status(409).json({
          error: 'duplicate_url',
          message: 'This URL is already in the catalog'
        });
      }

      // Run19 BUG-013: exact duplicate titles pollute the catalog (the audit
      // found pairs like "Plyr" twice). Block them at submit with a clear
      // message — the existing entry should be edited instead.
      const existingTitle = await resourceRepo.getLiveResourceByTitle(submitValidation.data.title);
      if (existingTitle) {
        return res.status(409).json({
          error: 'duplicate_title',
          message: 'A resource with this exact title is already in the catalog. Pick a more specific title (e.g. add the platform or format) or suggest an edit to the existing entry.'
        });
      }

      // Use the NORMALIZED values (trimmed/zero-width-stripped) from the
      // shared validators — never the raw body — so " title " and ZWSP
      // padding can't reach the DB (R4-015/069).
      // Task #248: decode HTML entities ("&amp;" pasted from web pages /
      // LLM output) at EVERY resource write path so literal entity text
      // never reaches the DB (shared with admin create/edit + AI imports).
      const resourceData = decodeResourceTextFields({
        ...insertResourceSchema.parse(req.body),
        title: submitValidation.data.title,
        url: submitValidation.data.url,
        description: submitValidation.data.description,
        metadata: submitValidation.data.metadata,
      });

      // Run21 R4-037: if the label can't be contained under the resource's
      // own category > subcategory chain, store null instead of an orphan.
      const submitContained = await ensureSubSubcategoryExists(
        categoryRepo,
        resourceData.category,
        resourceData.subcategory,
        resourceData.subSubcategory,
      );
      if (!submitContained) resourceData.subSubcategory = null;

      // BUG-012: unique-constraint safety net (Postgres error code 23505)
      try {
        const resource = await resourceRepo.createResource({
          ...resourceData,
          submittedBy: userId,
          status: 'pending'
        });

        // Task #233: server-side conversion event — survives ad blockers.
        // Consent-gated inside trackServerEvent; props mirror the client's
        // former resource_submitted payload (docs/MIXPANEL.md). No PII.
        trackServerEvent(req, 'resource_submitted', userId, {
          content_type: 'resource_submission',
          category: resourceData.category,
        });

        res.status(201).json(resource);
      } catch (createError: any) {
        if (createError.code === '23505' || (createError.message && createError.message.includes('unique'))) {
          return res.status(409).json({ error: 'duplicate_url', message: 'This URL is already in the catalog' });
        }
        throw createError;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid resource data', errors: error.issues });
      }
      console.error('Error creating resource:', error);
      sendOperationalFailure(res, error, 'Failed to create resource');
    }
  };
  app.post('/api/resources', isAuthenticated, createResourceHandler);
  app.post('/api/submit', isAuthenticated, createResourceHandler);
  
  // GET /api/resources/pending - List pending resources (admin only)
  app.get('/api/resources/pending', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await resourceRepo.listResources({
        page,
        limit,
        status: 'pending'
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching pending resources:', error);
      res.status(500).json({ message: 'Failed to fetch pending resources' });
    }
  });
  
  // PUT /api/resources/:id/approve - Approve resource (admin)
  app.put('/api/resources/:id/approve', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.dbUser.id;
      
      // BUG-010: NaN guard → 400
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      // BUG-010: resource-not-found → 404 (not 500)
      const existing = await resourceRepo.getResource(id);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      // Run3 audit R3-28: approval gate — a resource never goes live with a
      // stub description; sanitize (entities/emails) or backfill a fallback.
      const cleanDescription = ensureMinDescription(existing.description || '', existing.title, existing.url);
      if (cleanDescription !== (existing.description || '')) {
        await resourceRepo.updateResource(id, { description: cleanDescription });
      }
      
      const resource = await resourceRepo.updateResourceStatus(id, 'approved', userId);
      res.json(resource);
    } catch (error: any) {
      console.error('Error approving resource:', error);
      if (error?.message?.includes('not pending approval')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to approve resource' });
    }
  });
  
  // PUT /api/resources/:id/reject - Reject resource (admin)
  app.put('/api/resources/:id/reject', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.dbUser.id;
      
      // BUG-010: NaN guard → 400
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      // BUG-010: resource-not-found → 404 (not 500)
      const existing = await resourceRepo.getResource(id);
      if (!existing) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      const resource = await resourceRepo.updateResourceStatus(id, 'rejected', userId);
      res.json(resource);
    } catch (error: any) {
      console.error('Error rejecting resource:', error);
      if (error?.message?.includes('not pending approval')) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to reject resource' });
    }
  });
  
  // POST /api/resources/:id/edits - Submit edit suggestion for a resource (authenticated)
  app.post('/api/resources/:id/edits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const resourceId = parseInt(req.params.id);
      const { proposedChanges, proposedData, claudeMetadata, triggerClaudeAnalysis } = req.body;
      
      if (isNaN(resourceId)) {
        return res.status(400).json({ message: 'Invalid resource ID' });
      }
      
      const resource = await resourceRepo.getResource(resourceId);
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }
      
      if (!proposedChanges || !proposedData) {
        return res.status(400).json({ message: 'proposedChanges and proposedData are required' });
      }
      
      // SECURITY FIX: Whitelist of editable fields only (ISSUE 1)
      // Shared with AuditRepository merge path — see @shared/schema EDITABLE_RESOURCE_FIELDS
      const sanitizedProposedData: Record<string, any> = {};
      for (const field of EDITABLE_RESOURCE_FIELDS) {
        if (proposedData && field in proposedData) {
          sanitizedProposedData[field] = proposedData[field];
        }
      }
      
      // Sanitize proposedChanges
      const sanitizedChanges: Record<string, any> = {};
      for (const field of EDITABLE_RESOURCE_FIELDS) {
        if (proposedChanges && field in proposedChanges) {
          sanitizedChanges[field] = proposedChanges[field];
        }
      }
      
      // Run21 R4-015/016: suggest-edit is a WRITE PATH — approved edits land
      // verbatim on the live resource, so it mounts the SAME shared validators
      // as submit (visible title, bounded description, sane URL, clean tags).
      if (sanitizedProposedData.title !== undefined) {
        const parsedTitle = resourceTitleSchema.safeParse(String(sanitizedProposedData.title));
        if (!parsedTitle.success) {
          return res.status(400).json({ message: parsedTitle.error.issues[0]?.message || 'Invalid title' });
        }
        sanitizedProposedData.title = parsedTitle.data;
      }

      if (sanitizedProposedData.description !== undefined) {
        const parsedDesc = resourceDescriptionSchema.safeParse(String(sanitizedProposedData.description));
        if (!parsedDesc.success) {
          return res.status(400).json({ message: parsedDesc.error.issues[0]?.message || 'Invalid description' });
        }
        sanitizedProposedData.description = parsedDesc.data;
      }

      const controlledEditFacets = [
        ['resourceFormat', resourceFormatSchema],
        ['provider', resourceProviderSchema],
        ['skillLevel', resourceSkillLevelSchema],
      ] as const;
      for (const [field, schema] of controlledEditFacets) {
        if (sanitizedProposedData[field] !== undefined) {
          const parsedFacet = schema.safeParse(sanitizedProposedData[field]);
          if (!parsedFacet.success) {
            return res.status(400).json({
              message: `${field} contains an unsupported value`,
              field,
            });
          }
          sanitizedProposedData[field] = parsedFacet.data;
        }
      }

      // Run16 BUG-001 / BUG-018 / Run21 R4-048/076: a proposed URL *change* must
      // be a plausible, bounded URL with no embedded credentials. Run24 R4-016:
      // edits must be https-only (httpsUrlSchema) — you cannot introduce/keep an
      // http:// destination via an edit. Byte-equal to the stored URL skips
      // validation entirely, so unrelated edits on legacy http:// rows still work.
      if (sanitizedProposedData.url !== undefined && String(sanitizedProposedData.url) !== resource.url) {
        const parsedUrl = httpsUrlSchema.safeParse(String(sanitizedProposedData.url));
        if (!parsedUrl.success) {
          return res.status(400).json({ message: parsedUrl.error.issues[0]?.message || 'Invalid URL' });
        }
        sanitizedProposedData.url = parsedUrl.data;
      }
      
      // tags is stored in metadata.tags (not a column). Reject non-array shapes
      // up front and normalize to a clean string[] so malformed input can never
      // be persisted and later break the tag filters that read metadata.tags.
      if ('tags' in sanitizedProposedData) {
        if (!Array.isArray(sanitizedProposedData.tags)) {
          return res.status(400).json({ message: 'tags must be an array of strings' });
        }
        const normalizedTags = sanitizedProposedData.tags
          .filter((t: unknown): t is string => typeof t === 'string')
          .map((t: string) => stripInvisible(t))
          .filter((t: string) => t.length > 0);
        if (normalizedTags.length > 20) {
          return res.status(400).json({ message: 'Too many tags (max 20)' });
        }
        for (const tag of normalizedTags) {
          if (tag.length > TAG_MAX_LENGTH) {
            return res.status(400).json({ message: `Tags must be at most ${TAG_MAX_LENGTH} characters` });
          }
          if (NO_HTML_RE.test(tag)) {
            return res.status(400).json({ message: 'Tags must not contain HTML tags' });
          }
        }
        sanitizedProposedData.tags = normalizedTags;
      }

      // Task #248: approved edits land verbatim on the live resource, so
      // decode HTML entities here (shared step with every other write path)
      // or "&amp;" pasted into a suggestion resurfaces site-wide on approval.
      decodeResourceTextFields(sanitizedProposedData);
      
      let aiMetadata = claudeMetadata;
      if (triggerClaudeAnalysis && resource.url) {
        try {
          aiMetadata = await claudeService.analyzeURL(resource.url);
        } catch (error) {
          console.error('Error analyzing URL with Claude:', error);
        }
      }
      
      // Use sanitized versions in createResourceEdit call
      // BUG-041 (run25): re-submitting the exact same suggestion must not pile
      // identical rows into the review queue — compare the proposed change set
      // against every edit still pending for this resource and 409 on a match.
      // NOTE: jsonb round-trips reorder object keys ({old,new} comes back as
      // {new,old}), so the fingerprint must sort keys RECURSIVELY.
      const stableStringify = (v: any): string => {
        if (v === null || typeof v !== 'object') return JSON.stringify(v);
        if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
        return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
      };
      const existingEdits = await auditRepo.getResourceEditsByResource(resourceId);
      const changesFingerprint = stableStringify(sanitizedChanges);
      const duplicatePending = existingEdits.find(
        (e) => e.status === 'pending' && stableStringify(e.proposedChanges || {}) === changesFingerprint
      );
      if (duplicatePending) {
        return res.status(409).json({
          message: 'An identical edit suggestion is already pending review for this resource.',
          existingEditId: duplicatePending.id,
        });
      }

      const edit = await auditRepo.createResourceEdit({
        resourceId,
        submittedBy: userId,
        status: 'pending',
        originalResourceUpdatedAt: resource.updatedAt ?? new Date(),
        proposedChanges: sanitizedChanges,
        proposedData: sanitizedProposedData,
        claudeMetadata: aiMetadata,
        claudeAnalyzedAt: aiMetadata ? new Date() : undefined,
      });

      // Run19 BUG-015: the "AI Analysis" column in the admin Edits queue was
      // permanently "No AI" because nothing ever ran analysis for suggested
      // edits. Kick it off in the background (never blocks the 201 response;
      // failures just leave the column honest about having no analysis).
      if (!aiMetadata && resource.url) {
        claudeService
          .analyzeURL(resource.url)
          .then((analysis) => {
            if (analysis) {
              // analyzeURL's return shape matches the claudeMetadata column
              // type (suggestedTitle/suggestedDescription/…/keyTopics).
              return auditRepo.updateResourceEditAnalysis(edit.id, analysis);
            }
          })
          .catch((error) => {
            console.error(`Background Claude analysis for edit ${edit.id} failed:`, error);
          });
      }

      res.status(201).json(edit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid edit data', errors: error.issues });
      }
      console.error('Error creating edit suggestion:', error);
      res.status(500).json({ message: 'Failed to create edit suggestion' });
    }
  });

  // --- Category Routes ---
  
  // GET /api/categories - List all categories (public)
  app.get('/api/categories', async (req, res) => {
    try {
      const enriched = await getPublicCacheValue({
        namespace: 'catalog-taxonomy',
        key: 'categories',
        ttlMs: 60_000,
        load: async () => {
          const categories = await categoryRepo.listCategories();
          // Attach the authoritative approved-resource count per category.
          const counts = await categoryRepo.getResourceCountsByCategory();
          return categories.map((cat) => ({
            ...cat,
            resourceCount: counts[cat.name] ?? 0,
          }));
        },
      });
      res.set('Cache-Control', 'public, max-age=0, must-revalidate');
      res.json(enriched);
    } catch (error) {
      console.error('Error fetching categories:', error);
      sendOperationalFailure(res, error, 'Failed to fetch categories');
    }
  });

  // GET /api/tags - Aggregated tag counts (public, R2-M02). Tags live in
  // resources.metadata->'tags' (jsonb string array), not the (empty) tags
  // table, so aggregate over approved resources. ~2k rows → single-digit ms.
  app.get('/api/tags', async (_req, res) => {
    try {
      // run9 BUG-018: canonicalize before aggregating — lowercase and collapse
      // spaces/underscores to hyphens so "open source", "Open Source" and
      // "open-source" merge into one "open-source" bucket instead of showing
      // as three near-duplicate filter chips.
      const payload = await getPublicCacheValue({
        namespace: 'catalog-taxonomy',
        key: 'tags',
        ttlMs: 60_000,
        load: async () => {
          const result = await db.execute(sql`
            SELECT lower(regexp_replace(btrim(tag), '[[:space:]_]+', '-', 'g')) AS tag,
                   count(*)::int AS count
            FROM resources r,
                 jsonb_array_elements_text(r.metadata->'tags') AS tag
            WHERE r.status = 'approved'
              AND jsonb_typeof(r.metadata->'tags') = 'array'
              AND btrim(tag) <> ''
            GROUP BY 1
            ORDER BY count DESC, tag ASC
          `);
          return {
            total: result.rows.length,
            tags: result.rows.map((r: any) => ({ tag: r.tag, count: r.count })),
          };
        },
      });
      res.set('Cache-Control', 'public, max-age=0, must-revalidate');
      res.json(payload);
    } catch (error) {
      console.error('Error aggregating tags:', error);
      sendOperationalFailure(res, error, 'Failed to fetch tags');
    }
  });

  // GET /api/subcategories - List all subcategories (public)
  app.get('/api/subcategories', async (req, res) => {
    try {
      let categoryId: number | undefined = undefined;
      
      // Validate categoryId query parameter if provided
      if (req.query.categoryId) {
        const categoryIdSchema = z.string().regex(/^\d+$/, "categoryId must be a valid number");
        const validation = categoryIdSchema.safeParse(req.query.categoryId);
        
        if (!validation.success) {
          return res.status(400).json({ 
            message: 'Invalid categoryId parameter', 
            errors: validation.error.issues
          });
        }
        
        // NB-008 (run23): bound-check — all-digit values past int4 range pass
        // the regex, then overflow inside PG → 500.
        const parsed = parseBoundedInt(validation.data);
        if (parsed === null) {
          return res.status(400).json({ 
            message: 'categoryId must be a positive number within integer range' 
          });
        }
        categoryId = parsed;
      }
      
      const subcategories = await getPublicCacheValue({
        namespace: 'catalog-taxonomy',
        key: `subcategories:${categoryId ?? 'all'}`,
        ttlMs: 60_000,
        load: () => categoryRepo.listSubcategories(categoryId),
      });
      res.set('Cache-Control', 'public, max-age=0, must-revalidate');
      res.json(subcategories);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      sendOperationalFailure(res, error, 'Failed to fetch subcategories');
    }
  });

  // GET /api/sub-subcategories - List all sub-subcategories (public)
  app.get('/api/sub-subcategories', async (req, res) => {
    try {
      let subcategoryId: number | undefined = undefined;
      
      // Validate subcategoryId query parameter if provided
      if (req.query.subcategoryId) {
        const subcategoryIdSchema = z.string().regex(/^\d+$/, "subcategoryId must be a valid number");
        const validation = subcategoryIdSchema.safeParse(req.query.subcategoryId);
        
        if (!validation.success) {
          return res.status(400).json({ 
            message: 'Invalid subcategoryId parameter', 
            errors: validation.error.issues
          });
        }
        
        // NB-008 (run23): bound-check — see /api/subcategories above.
        const parsed = parseBoundedInt(validation.data);
        if (parsed === null) {
          return res.status(400).json({ 
            message: 'subcategoryId must be a positive number within integer range' 
          });
        }
        subcategoryId = parsed;
      }
      
      const subSubcategories = await getPublicCacheValue({
        namespace: 'catalog-taxonomy',
        key: `sub-subcategories:${subcategoryId ?? 'all'}`,
        ttlMs: 60_000,
        load: () => categoryRepo.listSubSubcategories(subcategoryId),
      });
      res.set('Cache-Control', 'public, max-age=0, must-revalidate');
      res.json(subSubcategories);
    } catch (error) {
      console.error('Error fetching sub-subcategories:', error);
      sendOperationalFailure(res, error, 'Failed to fetch sub-subcategories');
    }
  });
}
