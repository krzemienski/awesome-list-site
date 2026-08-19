/**
 * ----------------------------------------------------------------------------
 * DOMAIN ROUTER: export-link-health
 * ----------------------------------------------------------------------------
 *
 * Task #303 (safer modular API architecture). Verbatim extraction from
 * server/routes.ts of two adjacent-but-related surfaces, in source order:
 *
 *  1. The GitHub sync / awesome-list export / validation / link-health /
 *     admin-maintenance block — the routes that begin at the
 *     `// --- GitHub Sync Routes ---` marker and end just before the
 *     `// --- Enrichment API Routes ---` marker.
 *
 *  2. The public awesome-list + GitHub discovery block — the routes that begin
 *     at the `// --- Database-Driven Routes ---` marker (`/api/awesome-list`)
 *     and end just before the security.txt route.
 *
 * Endpoints registered here (order preserved exactly as in routes.ts):
 *   Block 1 (GitHub sync / export / link-health / maintenance):
 *     - POST /api/github/configure
 *     - POST /api/github/import
 *     - POST /api/github/export
 *     - GET  /api/github/sync-status
 *     - GET  /api/github/sync-status/:id
 *     - GET  /api/github/sync-history
 *     - POST /api/github/process-queue
 *     - POST /api/admin/export
 *     - GET  /api/admin/export-json
 *     - POST /api/admin/validate
 *     - POST /api/admin/check-links
 *     - GET  /api/admin/validation-status
 *     - GET  /api/admin/link-health/status
 *     - POST /api/admin/link-health/run
 *     - GET  /api/admin/link-health/history
 *     - GET  /api/admin/link-health/broken-links
 *     - POST /api/admin/seed-database
 *     - POST /api/admin/import-github
 *     - GET  /api/admin/enrichment/coverage
 *     - POST /api/admin/maintenance/backfill-approved-at
 *     - POST /api/admin/maintenance/canonicalize-tags
 *   Block 2 (awesome-list + GitHub discovery):
 *     - GET  /api/awesome-list                    (resourceReadLimiter)
 *     - GET  /api/awesome-list/nav                (resourceReadLimiter)
 *     - POST /api/switch-list
 *     - GET  /api/github/awesome-lists
 *     - GET  /api/github/search                   (isAuthenticated, isAdmin)
 *
 * Middleware, statuses, headers and per-route comments are copied byte-for-byte
 * from routes.ts. Every symbol the handlers close over is supplied through the
 * explicit `ExportLinkHealthContext` so this module never depends on
 * module-scoped state inside routes.ts.
 *
 * NOTE ON ROUTE ORDER: block 1 and block 2 are NOT contiguous in routes.ts
 * (the enrichment/researcher blocks sit between them). The two registrar
 * functions are exported separately so the caller can mount each at the exact
 * position it occupied in the original file, preserving Express first-match
 * ordering.
 */
import type { Express, Response } from "express";
import type { RequestHandler } from "express";
import crypto from "crypto";
import { sql } from "drizzle-orm";
import type { Resource } from "@shared/schema";
import { taxonomyScopeIntro } from "@shared/seo-content-templates";
import { normalizeGithubRepoInput } from "@shared/validation";
import { db } from "../../db";
import { storage } from "../../storage";
import { fetchAwesomeList } from "../../parser";
import { fetchAwesomeLists, searchAwesomeLists } from "../../github-api";
import { syncService } from "../../github/syncService";
import { AwesomeListFormatter } from "../../github/formatter";
import { validateAwesomeList, formatValidationReport } from "../../validation/awesomeLint";
import { checkResourceLinks, formatLinkCheckReport } from "../../validation/linkChecker";
import { seedDatabase } from "../../seed";
import { buildCanonicalTagMap, canonicalizeTagArray } from "../../lib/tagCanonicalize";
import { getPublicCacheValue } from "../../cache/publicCache";
import {
  CATALOG_CACHE_CONTROL,
  UNCACHED_CATALOG_CACHE_CONTROL,
} from "../../http-cache-policy";
import {
  LISTING_PAGE_SIZE,
  countNodeResources,
  findCategory,
  findSubcategory,
  findSubSubcategory,
  flattenListingResources,
  type ListingLevel,
} from "../../seo-content";
import { normalizeTagFilter } from "@shared/tagNormalize";
import { isDatabaseUnavailableError } from "../../db/errors";
import { ServiceUnavailableError } from "../../middleware/errors";
import { runHeavyWork, startHeavyWork } from "../../ops/heavyWork";
import type {
  UserRepository,
  ResourceRepository,
  CategoryRepository,
  TagRepository,
  LearningJourneyRepository,
  AuditRepository,
  GithubSyncRepository,
  AdminRepository,
  LegacyRepository,
} from "../../repositories";
/**
 * Explicit dependency context for the export/link-health/GitHub-sync routes
 * and the public awesome-list/discovery routes. Everything the handlers need —
 * repositories, auth/limiter middleware, and the shared helpers that live in
 * routes.ts module scope — is passed in so this module is decoupled from
 * routes.ts internals.
 */
export interface ExportLinkHealthContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
  resourceReadLimiter: RequestHandler;
  userRepo: UserRepository;
  resourceRepo: ResourceRepository;
  categoryRepo: CategoryRepository;
  tagRepo: TagRepository;
  learningJourneyRepo: LearningJourneyRepository;
  auditRepo: AuditRepository;
  githubSyncRepo: GithubSyncRepository;
  adminRepo: AdminRepository;
  legacyRepo: LegacyRepository;
  sendOperationalFailure: (
    res: Response,
    error: unknown,
    fallbackMessage: string,
  ) => void;
  getPublicCatalogResources: () => Promise<Resource[]>;
  getCategoryTitleFromSlug: (slug: string) => string;
  getSubcategoryTitleFromSlug: (slug: string) => string;
  getSubSubcategoryTitleFromSlug: (slug: string) => string;
}

/**
 * Block 1: GitHub sync, awesome-list export/validation, link-health, and
 * admin-maintenance routes. Mount at the original `// --- GitHub Sync Routes
 * ---` position (immediately after the admin content routes).
 */
export function registerExportLinkHealthRoutes(
  app: Express,
  ctx: ExportLinkHealthContext,
): void {
  const {
    isAuthenticated,
    isAdmin,
    userRepo,
    resourceRepo,
    categoryRepo,
    tagRepo,
    learningJourneyRepo,
    auditRepo,
    githubSyncRepo,
    adminRepo,
    sendOperationalFailure,
    getPublicCatalogResources,
  } = ctx;

  // --- GitHub Sync Routes ---
  
  // POST /api/github/configure - Configure GitHub repository
  app.post('/api/github/configure', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, token } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      // BUG-042 (run25): reject malformed repo references up front.
      const normalizedConfigRepo = normalizeGithubRepoInput(repositoryUrl);
      if (!normalizedConfigRepo) {
        return res.status(400).json({ message: 'Invalid repository. Use owner/repository (e.g. krzemienski/awesome-video) or a github.com URL.' });
      }
      
      const result = await syncService.configureRepository(normalizedConfigRepo, token);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error configuring GitHub repository:', error);
      res.status(500).json({ message: 'Failed to configure GitHub repository' });
    }
  });
  
  // POST /api/github/import - Import resources from GitHub awesome list
  app.post('/api/github/import', isAuthenticated, isAdmin, async (req: any, res) => {
    let queueItemId: number | undefined;
    try {
      const { repositoryUrl: rawImportRepo, options = {} } = req.body;
      
      if (!rawImportRepo) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      // BUG-042 (run25): "not a repo!!" must 400 here, not fail later in the queue.
      const repositoryUrl = normalizeGithubRepoInput(rawImportRepo);
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Invalid repository. Use owner/repository (e.g. krzemienski/awesome-video) or a github.com URL.' });
      }
      
      // Add to queue for processing
      const queueItem = await githubSyncRepo.addToGithubSyncQueue({
        repositoryUrl,
        action: 'import',
        status: 'pending',
        resourceIds: [],
        metadata: options
      });
      queueItemId = queueItem.id;
      
      // Acquire bounded capacity before acknowledging background processing.
      await startHeavyWork('github-sync', async () => {
        await githubSyncRepo.updateGithubSyncStatus(queueItem.id, 'processing');
        try {
          const result = await syncService.importFromGitHub(repositoryUrl, options);
          console.log('GitHub import completed:', result);
          const completed = result.errors.length === 0 || result.imported > 0 || result.updated > 0;
          await githubSyncRepo.updateGithubSyncStatus(
            queueItem.id,
            completed ? 'completed' : 'failed',
            completed ? undefined : result.errors.slice(0, 3).join('; '),
            {
              imported: result.imported,
              updated: result.updated,
              skipped: result.skipped,
              errors: result.errors.length,
            },
          );
        } catch (error) {
          console.error('GitHub import failed:', error);
          await githubSyncRepo.updateGithubSyncStatus(
            queueItem.id,
            'failed',
            error instanceof Error ? error.message : String(error),
          ).catch(() => undefined);
          throw error;
        }
      });
      
      res.json({
        message: 'Import started',
        queueId: queueItem.id,
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting GitHub import:', error);
      if (queueItemId !== undefined) {
        await githubSyncRepo.updateGithubSyncStatus(
          queueItemId,
          'failed',
          'Heavy operation capacity was unavailable',
        ).catch(() => undefined);
      }
      sendOperationalFailure(res, error, 'Failed to start GitHub import');
    }
  });
  
  // POST /api/github/export - Export approved resources to GitHub
  app.post('/api/github/export', isAuthenticated, isAdmin, async (req: any, res) => {
    let queueItemId: number | undefined;
    try {
      const { repositoryUrl: rawExportRepo, options = {} } = req.body;
      
      if (!rawExportRepo) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      // BUG-042 (run25): "not a repo!!" must 400 here, not fail later in the queue.
      const repositoryUrl = normalizeGithubRepoInput(rawExportRepo);
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Invalid repository. Use owner/repository (e.g. krzemienski/awesome-video) or a github.com URL.' });
      }
      
      // Add to queue for processing
      const queueItem = await githubSyncRepo.addToGithubSyncQueue({
        repositoryUrl,
        action: 'export',
        status: 'pending',
        resourceIds: [],
        metadata: options
      });
      queueItemId = queueItem.id;

      // R5-029 (run24) sweep: every bulk-export-shaped admin action leaves an
      // audit-trail entry (who, what, when) like users/export.
      await auditRepo.logResourceAudit(
        null,
        'catalog.exported_github',
        req.dbUser?.id,
        { repositoryUrl, queueId: queueItem.id },
        `Admin started GitHub export to ${repositoryUrl}`
      );
      
      // Process immediately in the bounded background gate.
      await startHeavyWork('github-sync', async () => {
        await githubSyncRepo.updateGithubSyncStatus(queueItem.id, 'processing');
        try {
          const result = await syncService.exportToGitHub(repositoryUrl, options);
          if (result.errors.length > 0) {
            console.error('GitHub export failed:', result.errors);
            await githubSyncRepo.updateGithubSyncStatus(queueItem.id, 'failed', result.errors.join('; '));
            return;
          }
          console.log('GitHub export completed:', result);
          await githubSyncRepo.updateGithubSyncStatus(queueItem.id, 'completed', undefined, {
            exported: result.exported,
            commitSha: result.commitSha,
            commitUrl: result.commitUrl
          });
        } catch (error) {
          console.error('GitHub export failed:', error);
          await githubSyncRepo.updateGithubSyncStatus(
            queueItem.id,
            'failed',
            error instanceof Error ? error.message : String(error)
          ).catch(() => undefined);
          throw error;
        }
      });
      
      res.json({
        message: 'Export started',
        queueId: queueItem.id,
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting GitHub export:', error);
      if (queueItemId !== undefined) {
        await githubSyncRepo.updateGithubSyncStatus(
          queueItemId,
          'failed',
          'Heavy operation capacity was unavailable',
        ).catch(() => undefined);
      }
      sendOperationalFailure(res, error, 'Failed to start GitHub export');
    }
  });
  
  // GET /api/github/sync-status - Check sync queue status
  app.get('/api/github/sync-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      const queueItems = await githubSyncRepo.getGithubSyncQueue(status);

      // Run23 NB-038: the queue list used to ship every row's full
      // resourceIds array (thousands of ids per export row) + raw metadata —
      // megabytes on long-lived deployments. The panel only renders summary
      // fields; full detail stays available per-row via /sync-status/:id.
      res.json({
        total: queueItems.length,
        items: queueItems.map(q => ({
          id: q.id,
          repositoryUrl: q.repositoryUrl,
          branch: q.branch,
          action: q.action,
          status: q.status,
          errorMessage: q.errorMessage,
          resourceCount: Array.isArray(q.resourceIds) ? q.resourceIds.length : 0,
          createdAt: q.createdAt,
          processedAt: q.processedAt,
        }))
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
      res.status(500).json({ message: 'Failed to fetch sync status' });
    }
  });
  
  // GET /api/github/sync-status/:id - Get specific sync item status
  app.get('/api/github/sync-status/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const queueItems = await githubSyncRepo.getGithubSyncQueue();
      const item = queueItems.find(q => q.id === id);
      
      if (!item) {
        return res.status(404).json({ message: 'Sync item not found' });
      }
      
      res.json(item);
    } catch (error) {
      console.error('Error fetching sync item:', error);
      res.status(500).json({ message: 'Failed to fetch sync item' });
    }
  });
  
  // GET /api/github/sync-history - Get all sync history
  app.get('/api/github/sync-history', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Run16 BUG-038: older sync runs were only recorded in github_sync_queue
      // (the canonical github_sync_history table came later and is empty on
      // long-lived deployments), so the panel showed "no syncs" despite
      // completed runs. Merge terminal queue rows into the history shape,
      // skipping any queue row that has a matching canonical history row
      // (same repo + direction within 10 min) to avoid double-counting runs
      // recorded in BOTH tables.
      const [history, queueItems] = await Promise.all([
        githubSyncRepo.getSyncHistory(),
        githubSyncRepo.getGithubSyncQueue(),
      ]);

      const unwrap = (v: any): number => Array.isArray(v) ? (Number(v[0]) || 0) : (Number(v) || 0);
      const TEN_MIN = 10 * 60 * 1000;
      const fromQueue = queueItems
        .filter(q => q.status === 'completed' || q.status === 'failed')
        .filter(q => !history.some(h =>
          h.repositoryUrl === q.repositoryUrl &&
          h.direction === q.action &&
          Math.abs(new Date(h.createdAt!).getTime() - new Date((q.processedAt ?? q.createdAt)!).getTime()) < TEN_MIN
        ))
        .map(q => {
          const md = (q.metadata ?? {}) as Record<string, any>;
          const added = md.diff?.added ?? unwrap(md.imported);
          const updated = md.diff?.updated ?? unwrap(md.updated);
          const removed = md.diff?.removed ?? 0;
          return {
            // Offset keeps queue-derived ids from colliding with real history ids.
            id: 1_000_000 + q.id,
            repositoryUrl: q.repositoryUrl,
            direction: q.action,
            commitSha: md.commitSha ?? null,
            commitMessage: md.commitMessage ?? (q.status === 'failed' ? (q.errorMessage || 'Sync failed') : null),
            commitUrl: null,
            resourcesAdded: added,
            resourcesUpdated: updated,
            resourcesRemoved: removed,
            totalResources: unwrap(md.exported) || (added + updated + unwrap(md.skipped)) || (Array.isArray(q.resourceIds) ? q.resourceIds.length : 0),
            performedBy: null,
            createdAt: q.processedAt ?? q.createdAt,
          };
        });

      // Run23 NB-038: canonical history rows carry a full resource `snapshot`
      // jsonb (2.7MB total on prod). The list view only needs summary fields;
      // snapshots remain in the DB for on-demand use.
      const historySummaries = history.map(h => ({
        id: h.id,
        repositoryUrl: h.repositoryUrl,
        direction: h.direction,
        commitSha: h.commitSha,
        commitMessage: h.commitMessage,
        commitUrl: h.commitUrl,
        resourcesAdded: h.resourcesAdded,
        resourcesUpdated: h.resourcesUpdated,
        resourcesRemoved: h.resourcesRemoved,
        totalResources: h.totalResources,
        performedBy: h.performedBy,
        createdAt: h.createdAt,
      }));

      res.json([...historySummaries, ...fromQueue].sort((a: any, b: any) =>
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      ));
    } catch (error) {
      console.error('Error fetching sync history:', error);
      res.status(500).json({ message: 'Failed to fetch sync history' });
    }
  });
  
  // POST /api/github/process-queue - Manually trigger queue processing
  app.post('/api/github/process-queue', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Acquire bounded heavy-work capacity before acknowledging the job.
      await startHeavyWork('github-sync', async () => {
        await syncService.processQueue();
        console.log('GitHub sync queue processing completed');
      });
      
      res.json({
        message: 'Queue processing started',
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting queue processing:', error);
      sendOperationalFailure(res, error, 'Failed to start queue processing');
    }
  });

  // --- Awesome List Export & Validation Routes ---

  // POST /api/admin/export - Generate and download awesome list markdown
  app.post('/api/admin/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { resources, markdown } = await runHeavyWork('catalog-export', async () => {
        // Export the public catalog (deduped, orphan-excluded).
        const resources = await getPublicCatalogResources();
        const {
          title = 'Awesome Video',
          description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
          includeContributing = false,
          includeLicense = false,
          websiteUrl = undefined,
          repoUrl = process.env.GITHUB_REPO_URL
        } = req.body;
        const formatter = new AwesomeListFormatter(resources, {
          title,
          description,
          includeContributing,
          includeLicense,
          websiteUrl,
          repoUrl
        });
        return { resources, markdown: formatter.generate() };
      });

      // R5-029 (run24) sweep: bulk-export actions are audit-logged.
      await auditRepo.logResourceAudit(
        null,
        'catalog.exported',
        req.dbUser?.id,
        { rowCount: resources.length, format: 'markdown' },
        `Admin exported ${resources.length} catalog rows as awesome-list markdown`
      );

      // Set headers for file download
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', 'attachment; filename="awesome-list.md"');
      
      res.send(markdown);
    } catch (error) {
      console.error('Error generating awesome list export:', error);
      sendOperationalFailure(res, error, 'Failed to generate awesome list export');
    }
  });

  // GET /api/admin/export-json - Export full database as JSON for backup
  app.get('/api/admin/export-json', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const exportData = await runHeavyWork('database-export', async () => {
        // Sequential reads intentionally use at most one pool connection at a
        // time. This private backup never enters a public cache entry.
        const allResources = await resourceRepo.listResources({ limit: 100000 });
        const categories = await categoryRepo.listCategories();
        const subcategories = await categoryRepo.listSubcategories();
        const subSubcategories = await categoryRepo.listSubSubcategories();
        const tags = await tagRepo.listTags();
        const learningJourneys = await learningJourneyRepo.listLearningJourneys();
        const syncQueue = await githubSyncRepo.getGithubSyncQueue();
        const users = await userRepo.listUsers(1, 10000);
      
      const resources = allResources.resources;
      const usersList = users.users;

      // Get journey steps for each journey
      const journeyIds = learningJourneys.map((j: any) => j.id);
      const stepsMap = await learningJourneyRepo.listJourneyStepsBatch(journeyIds);
      
      // Attach steps to journeys
      const journeysWithSteps = learningJourneys.map((journey: any) => ({
        ...journey,
        steps: stepsMap.get(journey.id) || []
      }));

      // Build hierarchy structure
      const categoryHierarchy = categories.map((cat: any) => ({
        ...cat,
        subcategories: subcategories
          .filter((sub: any) => sub.categoryId === cat.id)
          .map((sub: any) => ({
            ...sub,
            subSubcategories: subSubcategories.filter(
              (ssub: any) => ssub.subcategoryId === sub.id
            )
          }))
      }));

      // Count resources by status
      const resourcesByStatus = resources.reduce((acc: Record<string, number>, r: any) => {
        acc[r.status || 'unknown'] = (acc[r.status || 'unknown'] || 0) + 1;
        return acc;
      }, {});
      
      // Sanitize users for export (remove sensitive data)
      const sanitizedUsers = usersList.map((u: any) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt
      }));

      // R5-029 (run24) sweep: full-database backup export (includes user
      // rows) is audit-logged like users/export.
      await auditRepo.logResourceAudit(
        null,
        'database.exported',
        req.dbUser?.id,
        { resources: resources.length, users: usersList.length, format: 'json' },
        `Admin exported full database JSON backup (${resources.length} resources, ${usersList.length} users)`
      );

      return {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        schema: {
          resources: "id, title, url, description, category, subcategory, subSubcategory, status, submittedBy, approvedBy, approvedAt, githubSynced, lastSyncedAt, metadata, createdAt, updatedAt",
          categories: "id, name, slug",
          subcategories: "id, name, slug, categoryId",
          subSubcategories: "id, name, slug, subcategoryId",
          tags: "id, name, slug",
          learningJourneys: "id, title, description, category, difficulty, estimatedHours, createdBy, createdAt, updatedAt"
        },
        stats: {
          resources: resources.length,
          resourcesByStatus,
          categories: categories.length,
          subcategories: subcategories.length,
          subSubcategories: subSubcategories.length,
          tags: tags.length,
          learningJourneys: learningJourneys.length,
          users: usersList.length,
          syncQueueItems: syncQueue.length
        },
        data: {
          resources,
          categoryHierarchy,
          tags,
          learningJourneys: journeysWithSteps,
          syncQueue,
          users: sanitizedUsers
        }
      };
      });

      // Set headers for JSON download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="awesome-list-backup-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(exportData);
    } catch (error) {
      console.error('Error generating JSON export:', error);
      sendOperationalFailure(res, error, 'Failed to generate JSON export');
    }
  });

  // POST /api/admin/validate - Run awesome-lint validation on current data
  app.post('/api/admin/validate', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { markdown, validationResult } = await runHeavyWork('catalog-validation', async () => {
        const resources = await getPublicCatalogResources();
        const {
          title = 'Awesome Video',
          description = 'A curated list of awesome video resources, tools, frameworks, and learning materials.',
          includeContributing = false,
          includeLicense = false,
          websiteUrl = undefined,
          repoUrl = process.env.GITHUB_REPO_URL
        } = req.body;
        const formatter = new AwesomeListFormatter(resources, {
          title,
          description,
          includeContributing,
          includeLicense,
          websiteUrl,
          repoUrl
        });
        const markdown = formatter.generate();
        return { markdown, validationResult: validateAwesomeList(markdown) };
      });
      
      // Store validation result for later retrieval
      await adminRepo.storeValidationResult({
        type: 'awesome-lint',
        result: validationResult,
        markdown,
        timestamp: new Date().toISOString()
      });
      
      // Return validation results
      res.json({
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        stats: validationResult.stats,
        report: formatValidationReport(validationResult)
      });
    } catch (error) {
      console.error('Error validating awesome list:', error);
      sendOperationalFailure(res, error, 'Failed to validate awesome list');
    }
  });

  // POST /api/admin/check-links - Run link checker on all resources
  app.post('/api/admin/check-links', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const linkCheckReport = await runHeavyWork('link-health', async () => {
        const resources = await resourceRepo.getAllApprovedResources();
        const {
          timeout = 10000,
          concurrent = 5,
          retryCount = 1
        } = req.body;
        const resourcesToCheck = resources.map(r => ({
          id: r.id,
          title: r.title,
          url: r.url
        }));
        return checkResourceLinks(resourcesToCheck, {
          timeout,
          concurrent,
          retryCount
        });
      });
      
      // Store link check result for later retrieval
      await adminRepo.storeValidationResult({
        type: 'link-check',
        result: linkCheckReport,
        timestamp: linkCheckReport.timestamp
      });
      
      // Return link check results
      res.json({
        totalLinks: linkCheckReport.totalLinks,
        validLinks: linkCheckReport.validLinks,
        brokenLinks: linkCheckReport.brokenLinks,
        redirects: linkCheckReport.redirects,
        errors: linkCheckReport.errors,
        summary: linkCheckReport.summary,
        report: formatLinkCheckReport(linkCheckReport),
        brokenResources: linkCheckReport.results.filter(r => !r.valid && r.status >= 400)
      });
    } catch (error) {
      console.error('Error checking links:', error);
      sendOperationalFailure(res, error, 'Failed to check links');
    }
  });

  // GET /api/admin/validation-status - Get last validation results
  app.get('/api/admin/validation-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const fn = (adminRepo as any).getLatestValidationResults;
      const validationResults = typeof fn === 'function'
        ? await fn.call(adminRepo)
        : { awesomeLint: null, linkCheck: null, lastUpdated: null };
      res.json({
        awesomeLint: validationResults?.awesomeLint ?? null,
        linkCheck: validationResults?.linkCheck ?? null,
        lastUpdated: validationResults?.lastUpdated ?? null,
      });
    } catch (error) {
      console.error('Error fetching validation status:', error);
      sendOperationalFailure(res, error, 'Failed to fetch validation status');
    }
  });

  // --- Link Health Check Routes ---
  
  // GET /api/admin/link-health/status - Get current/latest job status
  app.get('/api/admin/link-health/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('../../services/linkHealthService');
      const job = await linkHealthService.getLatestJob();
      res.json({ success: true, job: job || null });
    } catch (error) {
      console.error('Error fetching link health status:', error);
      sendOperationalFailure(res, error, 'Failed to fetch link health status');
    }
  });

  // POST /api/admin/link-health/run - Start a new link health check
  app.post('/api/admin/link-health/run', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('../../services/linkHealthService');
      const job = await linkHealthService.startCheck();
      res.json({ success: true, job });
    } catch (error: any) {
      console.error('Error starting link health check:', error);
      if (error.message?.includes('already running')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      sendOperationalFailure(res, error, 'Failed to start link health check');
    }
  });

  // GET /api/admin/link-health/history - Get job history
  app.get('/api/admin/link-health/history', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('../../services/linkHealthService');
      const history = await linkHealthService.getJobHistory();
      res.json({ success: true, jobs: history });
    } catch (error) {
      console.error('Error fetching link health history:', error);
      sendOperationalFailure(res, error, 'Failed to fetch link health history');
    }
  });

  // GET /api/admin/link-health/broken-links - Get broken links with optional filter
  app.get('/api/admin/link-health/broken-links', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('../../services/linkHealthService');
      const filter = req.query.status as string;
      const brokenLinks = await linkHealthService.getBrokenLinks(filter);
      res.json({ success: true, checks: brokenLinks });
    } catch (error) {
      console.error('Error fetching broken links:', error);
      sendOperationalFailure(res, error, 'Failed to fetch broken links');
    }
  });

  // POST /api/admin/seed-database - Manual database seeding (optional)
  // Note: Database is automatically seeded on first startup. This endpoint is for:
  // - Re-seeding after data changes
  // - Clearing and rebuilding the database
  // - Manual admin intervention when needed
  app.post('/api/admin/seed-database', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('Starting manual database seeding...');
      
      // Get options from request body
      const { clearExisting = false } = req.body;
      
      // Run seeding
      const result = await runHeavyWork(
        'manual-seed',
        () => seedDatabase({ clearExisting }),
      );
      
      // Return results
      res.json({
        success: true,
        message: 'Database seeding completed successfully',
        counts: {
          categoriesInserted: result.categoriesInserted,
          subcategoriesInserted: result.subcategoriesInserted,
          subSubcategoriesInserted: result.subSubcategoriesInserted,
          resourcesInserted: result.resourcesInserted,
        },
        errors: result.errors,
        totalErrors: result.errors.length
      });
    } catch (error: any) {
      console.error('Error seeding database:', error);
      if (
        error instanceof ServiceUnavailableError ||
        isDatabaseUnavailableError(error)
      ) {
        return res
          .status(503)
          .set('Retry-After', '1')
          .json({ success: false, message: 'Service is temporarily unavailable' });
      }
      res.status(500).json({ success: false, message: 'Failed to seed database' });
    }
  });

  // POST /api/admin/import-github - Import awesome list from GitHub URL
  app.post('/api/admin/import-github', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { repoUrl, dryRun = false, strictMode = false } = req.body;
      
      if (!repoUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }

      console.log(`Starting GitHub import from: ${repoUrl}`);
      
      // Use the sync service to import
      const result = await runHeavyWork(
        'github-sync',
        () => syncService.importFromGitHub(repoUrl, { dryRun, strictMode }),
      );
      
      console.log(`GitHub import completed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`);
      
      // If validation failed, return 400 with validation details
      if (!result.validationPassed && result.errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Import rejected: awesome-lint validation failed',
          validationPassed: result.validationPassed,
          validationStats: result.validationStats,
          validationErrors: result.validationErrors.filter(e => e.severity === 'error'),
          validationWarnings: result.validationErrors.filter(e => e.severity === 'warning'),
          errors: result.errors
        });
      }
      
      res.json({
        success: true,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        warnings: result.warnings,
        validationPassed: result.validationPassed,
        validationStats: result.validationStats,
        validationErrors: result.validationErrors.filter(e => e.severity === 'error'),
        validationWarnings: result.validationErrors.filter(e => e.severity === 'warning'),
        message: `Successfully imported ${result.imported} resources from ${repoUrl}`
      });
    } catch (error: any) {
      console.error('Error importing from GitHub:', error);
      if (
        error instanceof ServiceUnavailableError ||
        isDatabaseUnavailableError(error)
      ) {
        return sendOperationalFailure(res, error, 'Failed to import from GitHub');
      }
      res.status(500).json({ 
        success: false,
        message: 'Failed to import from GitHub',
        error: error.message 
      });
    }
  });

  // --- Admin Maintenance Routes (Run23) ---

  // Run23 NB-046: tag-coverage visibility — the July bulk import left more
  // than half the catalog untagged and the gap was invisible in the admin.
  // This read-only census powers a coverage line in the enrichment panel.
  app.get('/api/admin/enrichment/coverage', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          count(*)::int AS approved_total,
          count(*) FILTER (
            WHERE jsonb_typeof(metadata->'tags') = 'array'
              AND jsonb_array_length(metadata->'tags') > 0
          )::int AS tagged
        FROM resources
        WHERE status = 'approved'
      `);
      const row = (result.rows as any[])[0];
      const approvedTotal = row.approved_total as number;
      const tagged = row.tagged as number;
      res.json({
        approvedTotal,
        tagged,
        untagged: approvedTotal - tagged,
        coveragePct: approvedTotal > 0 ? Math.round((tagged / approvedTotal) * 1000) / 10 : 0,
      });
    } catch (error) {
      console.error('Error computing tag coverage:', error);
      res.status(500).json({ message: 'Failed to compute tag coverage' });
    }
  });

  // Run23 NB-054: 2,283/2,292 approved resources carry approved_at = null
  // (bulk imports were created already-approved without stamping the field).
  // Backfill approved_at from created_at — the moment an imported row was
  // created IS the moment it became approved. Idempotent: second run is a
  // no-op (0 rows).
  app.post('/api/admin/maintenance/backfill-approved-at', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const result = await db.execute(sql`
        UPDATE resources
        SET approved_at = created_at
        WHERE status = 'approved' AND approved_at IS NULL AND created_at IS NOT NULL
        RETURNING id
      `);
      const backfilled = (result.rows as any[]).length;
      const remaining = await db.execute(sql`
        SELECT count(*)::int AS n FROM resources
        WHERE status = 'approved' AND approved_at IS NULL
      `);
      await auditRepo.logResourceAudit(
        null,
        'maintenance_backfill_approved_at',
        req.dbUser.id,
        { backfilled },
        `Backfilled approved_at from created_at on ${backfilled} approved resources`
      );
      res.json({ backfilled, remainingNull: (remaining.rows as any[])[0].n });
    } catch (error) {
      console.error('Error backfilling approved_at:', error);
      res.status(500).json({ message: 'Failed to backfill approved_at' });
    }
  });

  // Run23 NB-055: tag-value casing chaos — the same tag exists in up to three
  // spellings (FFMPEG/FFmpeg/ffmpeg, NGINX/Nginx/nginx, ...), splitting filter
  // facets. Canonicalize every family (grouped case-insensitively) to one
  // spelling: a curated brand map wins; otherwise the most frequent spelling
  // in the corpus (ties broken lexicographically) so reruns are deterministic.
  // Idempotent: second run updates 0 resources.
  // Run24 R5-063 + NB-015: canonicalization now also folds separator variants
  // (live streaming/live_streaming/live-streaming), merges singular/plural
  // families, and applies the extended brand-casing map. Logic lives in
  // server/lib/tagCanonicalize.ts.
  app.post('/api/admin/maintenance/canonicalize-tags', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const rowsResult = await db.execute(sql`
        SELECT id, metadata->'tags' AS tags
        FROM resources
        WHERE status = 'approved'
          AND jsonb_typeof(metadata->'tags') = 'array'
          AND jsonb_array_length(metadata->'tags') > 0
      `);
      const rows = rowsResult.rows as Array<{ id: number; tags: string[] }>;

      const allTags: string[] = [];
      for (const r of rows) {
        for (const t of r.tags) if (typeof t === 'string') allTags.push(t);
      }
      const { canonicalByRaw, variantFamilies, pluralMerges } = buildCanonicalTagMap(allTags);

      // Rewrite arrays that change (canonicalize + dedupe, keep order).
      let resourcesUpdated = 0;
      for (const r of rows) {
        const next = canonicalizeTagArray(r.tags, canonicalByRaw);
        if (JSON.stringify(next) !== JSON.stringify(r.tags)) {
          await db.execute(sql`
            UPDATE resources
            SET metadata = jsonb_set(metadata, '{tags}', ${JSON.stringify(next)}::jsonb)
            WHERE id = ${r.id}
          `);
          resourcesUpdated++;
        }
      }
      await auditRepo.logResourceAudit(
        null,
        'maintenance_canonicalize_tags',
        req.dbUser.id,
        { variantFamilies, pluralMerges, resourcesUpdated },
        `Canonicalized tags: ${variantFamilies} variant families, ${pluralMerges} plural merges, ${resourcesUpdated} resources rewritten`
      );
      res.json({ variantFamiliesFound: variantFamilies, pluralMerges, resourcesUpdated });
    } catch (error) {
      console.error('Error canonicalizing tags:', error);
      res.status(500).json({ message: 'Failed to canonicalize tags' });
    }
  });
}

/**
 * Block 2: public awesome-list corpus/nav, list switching, and GitHub
 * discovery. Mount at the original `// --- Database-Driven Routes ---`
 * position (after the researcher discovery routes).
 */
export function registerAwesomeListDiscoveryRoutes(
  app: Express,
  ctx: ExportLinkHealthContext,
): void {
  const {
    isAuthenticated,
    isAdmin,
    resourceReadLimiter,
    legacyRepo,
    sendOperationalFailure,
    getCategoryTitleFromSlug,
    getSubcategoryTitleFromSlug,
    getSubSubcategoryTitleFromSlug,
  } = ctx;

  // --- Database-Driven Routes ---

  // The complete tree, serialized body, nav projection, taxonomy endpoints,
  // and SEO metadata all share one generation-aware public cache. Successful
  // repository mutations invalidate the generation immediately.

  // R4-031: the heaviest public read now shares the resource-read rate limit
  // (100 req/min/IP, 429 + Retry-After) — the server cache + ETag/304 make
  // real browsing cheap, so only scripted hammering ever hits the cap.
  app.get("/api/awesome-list", resourceReadLimiter, async (req, res) => {
    try {
      // Extract query parameters for filtering
      const { category, subcategory, subSubcategory } = req.query;
      const isUnfiltered = !category && !subcategory && !subSubcategory;

      if (isUnfiltered) {
        const payload = await getPublicCacheValue({
          namespace: 'catalog-body',
          key: 'complete',
          ttlMs: 60_000,
          load: async () => {
            // The source tree must be obtained inside this generation-checked
            // loader. Capturing it before getPublicCacheValue would let a
            // mutation invalidate between the two awaits and publish the old
            // tree as a fresh derived entry in the new generation.
            const data = await legacyRepo.getAwesomeListFromDatabase();
            if (!data?.resources?.length) {
              throw new Error('No awesome list data available');
            }
            const body = JSON.stringify(data);
            return {
              body,
              etag: '"' + crypto.createHash('sha1').update(body).digest('hex') + '"',
            };
          },
        });
        res.set('ETag', payload.etag);
        res.set('Cache-Control', CATALOG_CACHE_CONTROL);
        if (req.headers['if-none-match'] === payload.etag) {
          return res.status(304).end();
        }
        return res.type('application/json').send(payload.body);
      }

      // Task #327: filtered variants used to bypass the server cache entirely
      // — every request re-fetched the tree, re-filtered it, and paid a full
      // multi-MB JSON.stringify + weak-ETag digest. The taxonomy is a small
      // fixed set, so any variant whose every provided slug resolves through
      // the static slug→title maps is cached under a filter-aware key with
      // the same generation/TTL/coalescing machinery as the unfiltered body.
      // Slugs OUTSIDE the maps (typos, probes, array-shaped params) would
      // hand attackers an unbounded cache-key space, so they keep the
      // uncached legacy path below.
      const categorySlug = typeof category === 'string' ? category : undefined;
      const subcategorySlug = typeof subcategory === 'string' ? subcategory : undefined;
      const subSubcategorySlug =
        typeof subSubcategory === 'string' ? subSubcategory : undefined;

      // The slug→title helpers return their input verbatim when it is not in
      // the map, so `resolved !== slug` doubles as a membership test. A
      // hypothetical identity mapping would merely leave that variant
      // uncached — a safe degradation.
      const categoryTitle = categorySlug ? getCategoryTitleFromSlug(categorySlug) : undefined;
      const subcategoryTitle = subcategorySlug
        ? getSubcategoryTitleFromSlug(subcategorySlug)
        : undefined;
      const subSubcategoryTitle = subSubcategorySlug
        ? getSubSubcategoryTitleFromSlug(subSubcategorySlug)
        : undefined;

      const allProvidedSlugsKnown = Boolean(
        (!category || (categorySlug && categoryTitle !== categorySlug)) &&
          (!subcategory || (subcategorySlug && subcategoryTitle !== subcategorySlug)) &&
          (!subSubcategory ||
            (subSubcategorySlug && subSubcategoryTitle !== subSubcategorySlug)),
      );

      if (allProvidedSlugsKnown) {
        const variantKey = `filtered:${categorySlug ?? ''}|${subcategorySlug ?? ''}|${subSubcategorySlug ?? ''}`;
        const payload = await getPublicCacheValue({
          namespace: 'catalog-body',
          key: variantKey,
          ttlMs: 60_000,
          load: async () => {
            // Tree fetch stays INSIDE the generation-checked loader (see the
            // unfiltered branch above for why).
            const data = await legacyRepo.getAwesomeListFromDatabase();
            if (!data?.resources?.length) {
              throw new Error('No awesome list data available');
            }
            let filteredResources = data.resources;
            if (categoryTitle) {
              filteredResources = filteredResources.filter(
                (resource: any) => resource.category === categoryTitle,
              );
            }
            if (subcategoryTitle) {
              filteredResources = filteredResources.filter(
                (resource: any) => resource.subcategory === subcategoryTitle,
              );
            }
            if (subSubcategoryTitle) {
              filteredResources = filteredResources.filter(
                (resource: any) => resource.subSubcategory === subSubcategoryTitle,
              );
            }
            // Key order matches the legacy res.json path below: the spread
            // keeps `resources` in its original position, so cached and
            // uncached bodies are byte-identical for the same filter set.
            const body = JSON.stringify({ ...data, resources: filteredResources });
            console.log(
              `📊 /api/awesome-list rebuild [${variantKey}]: ${filteredResources.length} resources, ${data.categories.length} categories`,
            );
            return {
              body,
              etag: '"' + crypto.createHash('sha1').update(body).digest('hex') + '"',
            };
          },
        });
        res.set('ETag', payload.etag);
        res.set('Cache-Control', CATALOG_CACHE_CONTROL);
        if (req.headers['if-none-match'] === payload.etag) {
          return res.status(304).end();
        }
        return res.type('application/json').send(payload.body);
      }

      // Variants outside the known taxonomy are request-specific and
      // deliberately not server-cached (unbounded key space).
      const data = await legacyRepo.getAwesomeListFromDatabase();
      if (!data?.resources?.length) {
        console.warn('⚠️ No resources in database - database may need seeding');
        return res.status(500).json({ message: 'No awesome list data available' });
      }

      let filteredResources = data.resources;

      // Apply filtering based on query parameters
      if (category) {
        // Convert category slug back to title for filtering
        const categoryTitle = getCategoryTitleFromSlug(category as string);
        filteredResources = filteredResources.filter((resource: any) => 
          resource.category === categoryTitle
        );
        console.log(`📁 Filtered by category "${categoryTitle}": ${filteredResources.length} resources`);
      }

      if (subcategory) {
        // Convert subcategory slug back to title for filtering
        const subcategoryTitle = getSubcategoryTitleFromSlug(subcategory as string);
        filteredResources = filteredResources.filter((resource: any) => 
          resource.subcategory === subcategoryTitle
        );
        console.log(`📂 Filtered by subcategory "${subcategoryTitle}": ${filteredResources.length} resources`);
      }

      if (subSubcategory) {
        // Convert sub-subcategory slug back to title for filtering
        const subSubcategoryTitle = getSubSubcategoryTitleFromSlug(subSubcategory as string);
        filteredResources = filteredResources.filter((resource: any) => 
          resource.subSubcategory === subSubcategoryTitle
        );
        console.log(`🎯 Filtered by sub-subcategory "${subSubcategoryTitle}": ${filteredResources.length} resources`);
      }

      // Return filtered data
      const filteredData = {
        ...data,
        resources: filteredResources
      };
      
      console.log(`📊 /api/awesome-list: ${filteredResources.length} resources, ${data.categories.length} categories`);
      // Task #327 cache contract: see server/http-cache-policy.ts.
      res.set('Cache-Control', UNCACHED_CATALOG_CACHE_CONTROL);
      res.json(filteredData);
    } catch (error) {
      console.error('Error processing awesome list:', error);
      sendOperationalFailure(res, error, 'Failed to process awesome list');
    }
  });

  // Run22 BUG-008: lightweight taxonomy/nav payload. The sidebar, header
  // breadcrumbs, and resource-detail slug resolution only need names, slugs,
  // and per-node counts — but every cold page load was pulling the full
  // ~2.7MB corpus for them. This serves a ~few-KB tree with the same 60s
  // TTL + ETag/304 discipline as the corpus route, so pages that don't
  // render resource listings never download the corpus at all.
  app.get("/api/awesome-list/nav", resourceReadLimiter, async (req, res) => {
    try {
      // Run23 R-06: each category carries a tiny teaser (first direct
      // resource's title/description) so the Home grid renders card blurbs
      // from the nav tree alone — without downloading the full corpus.
      const payload = await getPublicCacheValue({
        namespace: 'catalog-nav',
        key: 'complete',
        ttlMs: 60_000,
        load: async () => {
          // Keep the source read inside the derived cache loader so generation
          // invalidation covers both the tree read and this projection.
          const data = await legacyRepo.getAwesomeListFromDatabase();
          if (!data?.categories?.length) {
            throw new Error('No awesome list data available');
          }
          const nav = {
            title: data.title,
            totalResources: (data.resources || []).length,
            categories: (data.categories || []).map((cat: any) => ({
          name: cat.name,
          slug: cat.slug,
          resourceCount: (cat.resources || []).length,
          teaser: (() => {
            // Run25 C-03: categories with no DIRECT resources (e.g. Community
            // & Events — everything lives in subcategories) got no teaser, so
            // their Home card was the only one missing a "Featured:" line.
            // Fall back to the first subcategory (then sub-subcategory)
            // resource in tree order.
            const first =
              cat.resources?.[0] ??
              (cat.subcategories || [])
                .flatMap((sub: any) => [
                  ...(sub.resources || []),
                  ...(sub.subSubcategories || []).flatMap((ss: any) => ss.resources || []),
                ])
                .find(Boolean);
            return first
              ? {
                  title: String(first.title || ''),
                  description: String(first.description || '').slice(0, 200),
                }
              : undefined;
          })(),
          subcategories: (cat.subcategories || []).map((sub: any) => ({
            name: sub.name,
            slug: sub.slug,
            resourceCount: (sub.resources || []).length,
            subSubcategories: (sub.subSubcategories || []).map((ss: any) => ({
              name: ss.name,
              slug: ss.slug,
              resourceCount: (ss.resources || []).length,
            })),
          })),
            })),
          };
          const body = JSON.stringify(nav);
          return {
            body,
            etag: '"' + crypto.createHash('sha1').update(body).digest('hex') + '"',
          };
        },
      });
      res.set('ETag', payload.etag);
      // Task #327 cache contract: see server/http-cache-policy.ts.
      res.set('Cache-Control', CATALOG_CACHE_CONTROL);
      if (req.headers['if-none-match'] === payload.etag) {
        return res.status(304).end();
      }
      return res.type('application/json').send(payload.body);
    } catch (error) {
      console.error('Error building awesome-list nav:', error);
      sendOperationalFailure(res, error, 'Failed to build navigation tree');
    }
  });

  // Taxonomy pages need exactly one tree-ordered resource slice. The crawler
  // uses the same cached tree and flattenListingResources(), so page N has one
  // authoritative order for both SSR and the live React view.
  app.get("/api/awesome-list/listing", resourceReadLimiter, async (req, res) => {
    try {
      const level = req.query.level;
      const slug = req.query.slug;
      if (
        (level !== "category" && level !== "subcategory" && level !== "sub-subcategory") ||
        typeof slug !== "string"
      ) {
        return res.status(400).json({ message: "level and slug are required" });
      }

      const parsedPage = Number(req.query.page ?? "1");
      if (!Number.isSafeInteger(parsedPage) || parsedPage < 1) {
        return res.status(400).json({ message: "page must be a positive integer" });
      }

      const tree = await legacyRepo.getAwesomeListFromDatabase();
      const match =
        level === "category"
          ? findCategory(tree, slug)
          : level === "subcategory"
            ? findSubcategory(tree, slug)
            : findSubSubcategory(tree, slug);
      if (!match) return res.status(404).json({ message: "Taxonomy node not found" });

      const allResources = flattenListingResources(match.node, level as ListingLevel);
      const requestedSubcategory =
        typeof req.query.subcategory === "string" ? req.query.subcategory : undefined;
      const requestedSubSubcategory =
        typeof req.query.subSubcategory === "string" ? req.query.subSubcategory : undefined;
      const requestedGeneral = req.query.general === "1";
      const directResources = new Set(
        (match.node?.resources ?? []).map((item: any) => `${item?.id ?? ""}|${item?.url ?? ""}`),
      );

      const children =
        level === "category"
          ? (match.node.subcategories ?? []).map((sub: any) => ({
              name: sub.name,
              slug: sub.slug,
              count: countNodeResources(sub),
              subSubcategories: (sub.subSubcategories ?? []).map((subSub: any) => ({
                name: subSub.name,
                slug: subSub.slug,
                count: countNodeResources(subSub),
              })),
            }))
          : level === "subcategory"
            ? (match.node.subSubcategories ?? []).map((subSub: any) => ({
                name: subSub.name,
                slug: subSub.slug,
                count: countNodeResources(subSub),
              }))
            : [];
      const validSubcategory =
        level === "category" &&
        requestedSubcategory &&
        children.some((child: any) => child.name === requestedSubcategory);
      const validSubSubcategory =
        level === "category" &&
        requestedSubcategory &&
        requestedSubSubcategory &&
        children.some((child: any) =>
          child.name === requestedSubcategory &&
          child.subSubcategories.some((subSub: any) => subSub.name === requestedSubSubcategory),
        );
      const validChild =
        level === "subcategory" &&
        requestedSubcategory &&
        children.some((child: any) => child.name === requestedSubcategory);
      const ignoredSubcategory = Boolean(
        requestedSubcategory &&
          !((level === "category" && validSubcategory) || (level === "subcategory" && validChild)),
      );
      const ignoredSubSubcategory = Boolean(
        requestedSubSubcategory && !(level === "category" && validSubSubcategory),
      );
      const generalIgnored = requestedGeneral && directResources.size === 0;

      let scoped = allResources;
      if (requestedGeneral && !generalIgnored) {
        scoped = scoped.filter((item: any) => directResources.has(`${item?.id ?? ""}|${item?.url ?? ""}`));
      } else if (level === "category" && validSubcategory) {
        scoped = scoped.filter((item: any) =>
          item.subcategory === requestedSubcategory &&
          (!requestedSubSubcategory || !validSubSubcategory || item.subSubcategory === requestedSubSubcategory),
        );
      } else if (level === "subcategory" && validChild) {
        scoped = scoped.filter((item: any) => item.subSubcategory === requestedSubcategory);
      }

      const tagCounts = new Map<string, number>();
      for (const item of allResources) {
        const seen = new Set<string>();
        for (const rawTag of item.metadata?.tags ?? item.tags ?? []) {
          const tag = level === "category" ? normalizeTagFilter(String(rawTag)) : String(rawTag);
          if (!tag || seen.has(tag)) continue;
          seen.add(tag);
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
      const tags = [...tagCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
      const total = scoped.length;
      const totalPages = Math.max(1, Math.ceil(total / LISTING_PAGE_SIZE));
      const start = (parsedPage - 1) * LISTING_PAGE_SIZE;
      const scopeIntro = taxonomyScopeIntro({
        name: match.name,
        level,
        totalResources: allResources.length,
        parentNames:
          level === "category"
            ? []
            : [
                match.category?.name,
                level === "sub-subcategory" ? match.subcategory?.name : undefined,
              ].filter((name): name is string => Boolean(name)),
        childNames: children
          .filter((child: any) => child.count > 0)
          .map((child: any) => child.name),
        formats: allResources.map((resource: any) => resource.resourceFormat),
      });
      const body = JSON.stringify({
        level,
        node: { name: match.name, slug },
        parents: {
          category: match.category ? { name: match.category.name, slug: match.category.slug } : undefined,
          subcategory: match.subcategory
            ? { name: match.subcategory.name, slug: match.subcategory.slug }
            : undefined,
        },
        page: parsedPage,
        pageSize: LISTING_PAGE_SIZE,
        total,
        totalPages,
        totalAll: allResources.length,
        generalCount: directResources.size,
        scopeIntro,
        scope: { ignoredSubcategory, ignoredSubSubcategory, generalIgnored },
        children,
        tags,
        resources: scoped.slice(start, start + LISTING_PAGE_SIZE),
      });
      const etag = '"' + crypto.createHash("sha1").update(body).digest("hex") + '"';
      res.set("ETag", etag);
      res.set("Cache-Control", "public, max-age=0, must-revalidate");
      if (req.headers["if-none-match"] === etag) return res.status(304).end();
      return res.type("application/json").send(body);
    } catch (error) {
      console.error("Error building awesome-list listing:", error);
      sendOperationalFailure(res, error, "Failed to build taxonomy listing");
    }
  });

  // New endpoint to switch lists
  app.post("/api/switch-list", async (req, res) => {
    try {
      const { rawUrl } = req.body;
      
      if (!rawUrl) {
        return res.status(400).json({ message: 'Raw URL is required' });
      }
      
      console.log(`Switching to list: ${rawUrl}`);
      const data = await fetchAwesomeList(rawUrl);
      storage.setAwesomeListData(data);
      
      console.log(`Successfully switched to list with ${data.resources.length} resources`);
      res.json(data);
    } catch (error) {
      console.error('Error switching list:', error);
      res.status(500).json({ message: 'Failed to switch list' });
    }
  });

  // GitHub awesome lists discovery routes
  app.get("/api/github/awesome-lists", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.per_page as string) || 30;
      
      const result = await fetchAwesomeLists(page, perPage);
      res.json(result);
    } catch (error) {
      console.error('Error fetching awesome lists from GitHub:', error);
      res.status(500).json({ message: 'Failed to fetch awesome lists' });
    }
  });

  // NB-006 (run23): this proxy hits GitHub's search API, which is a shared
  // 10-req/min quota per IP when unauthenticated. It only serves the admin
  // GitHub-import discovery surface, so require admin (anonymous → 401) and
  // send the server-side token from searchAwesomeLists when configured.
  app.get("/api/github/search", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const query = req.query.q as string;
      const page = Math.min(Math.max(parseInt(req.query.page as string) || 1, 1), 50);

      if (!query) {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const result = await searchAwesomeLists(query, page);
      res.json(result);
    } catch (error) {
      console.error('Error searching awesome lists:', error);
      res.status(500).json({ message: 'Failed to search awesome lists' });
    }
  });
}
