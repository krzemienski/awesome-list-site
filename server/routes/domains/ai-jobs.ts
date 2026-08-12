/**
 * ----------------------------------------------------------------------------
 * AI-JOBS.TS - Enrichment + AI Researcher Route Registrar
 * ----------------------------------------------------------------------------
 *
 * Domain router module extracted from server/routes.ts (Task #303). It mounts
 * the admin-only AI job surfaces that were previously registered inline inside
 * registerRoutes():
 *
 *   - Enrichment API routes    (/api/enrichment/*, /api/admin/enrichment/*)
 *   - AI Researcher routes      (/api/researcher/*)
 *
 * Behavior is copied verbatim from the original inline handlers (former
 * routes.ts lines ~6704-7183); route ordering is preserved exactly. The
 * registrar accepts an `app` plus a context object supplying the shared
 * middleware, repositories, and services the handlers depend on so nothing has
 * to be re-instantiated here.
 * ----------------------------------------------------------------------------
 */

import type { Express, RequestHandler } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { enrichmentService } from "../../ai/enrichmentService";
import {
  parseAgentConfigFromRequest,
  stripJobAuthSecret,
} from "../../ai/agentRuntime";
import type { EnrichmentRepository } from "../../repositories";
import type { CategoryRepository } from "../../repositories";
import type { ResourceRepository } from "../../repositories";
import {
  MULTILINE_CONTROL_RE,
  BIDI_CONTROL_RE,
  BIDI_CONTROL_MESSAGE,
  SINGLE_LINE_CONTROL_RE,
  visibleLength,
} from "@shared/validation";

/**
 * Dependencies the AI job handlers need from the composing module. These mirror
 * the values that live in the registerRoutes() closure so the extracted
 * handlers keep behaving identically.
 */
export interface AiJobsRouteContext {
  isAuthenticated: RequestHandler;
  isAdmin: RequestHandler;
  enrichmentRepo: EnrichmentRepository;
  categoryRepo: CategoryRepository;
  resourceRepo: ResourceRepository;
}

/**
 * Registers the enrichment + AI researcher route surfaces onto `app`.
 * Ordering is identical to the original inline registration.
 */
export function registerAiJobsRoutes(
  app: Express,
  context: AiJobsRouteContext,
): void {
  const { isAuthenticated, isAdmin, enrichmentRepo, categoryRepo, resourceRepo } =
    context;

  // --- Enrichment API Routes ---

  // POST /api/enrichment/start - Start batch enrichment job
  app.post('/api/enrichment/start', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { filter = 'unenriched', batchSize = 10 } = req.body;
      const userId = req.user?.claims?.sub;

      // Run15 BUG-019 companion: the client guard alone is bypassable —
      // reject out-of-range batch sizes at the API too.
      const parsedBatchSize = Number(batchSize);
      if (!Number.isInteger(parsedBatchSize) || parsedBatchSize < 1 || parsedBatchSize > 50) {
        return res.status(400).json({
          success: false,
          message: 'Batch size must be an integer between 1 and 50.'
        });
      }

      let agentConfig;
      try {
        agentConfig = await parseAgentConfigFromRequest(req.body);
      } catch (cfgErr: any) {
        return res.status(400).json({ success: false, message: cfgErr.message || 'Invalid agent configuration' });
      }

      const jobId = await enrichmentService.queueBatchEnrichment({
        filter,
        batchSize,
        startedBy: userId,
        model: agentConfig.model,
        baseUrl: agentConfig.baseUrl,
        authTokenEncrypted: agentConfig.authTokenEncrypted,
        authTokenLast4: agentConfig.authTokenLast4,
      });
      
      res.json({
        success: true,
        jobId,
        message: 'Batch enrichment job started successfully'
      });
    } catch (error: any) {
      // BUG-047 (run25): a second concurrent run is a client conflict, not a
      // server failure — surface it as 409 with the explanatory message.
      if (error?.code === 'ENRICHMENT_JOB_ACTIVE') {
        return res.status(409).json({ success: false, message: error.message });
      }
      console.error('Error starting enrichment job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start enrichment job',
        error: error.message
      });
    }
  });
  
  // GET /api/enrichment/jobs - List all enrichment jobs
  app.get('/api/enrichment/jobs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const rawLimit = String(req.query.limit ?? '');
      const limit = rawLimit === ''
        ? 50
        : Number(rawLimit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'limit must be a positive integer between 1 and 100',
        });
      }
      const jobs = await enrichmentRepo.listEnrichmentJobs(limit);
      
      res.json({
        success: true,
        jobs: jobs.map(stripJobAuthSecret)
      });
    } catch (error: any) {
      console.error('Error listing enrichment jobs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list enrichment jobs',
        error: error.message
      });
    }
  });
  
  // GET /api/enrichment/jobs/:id - Get job status with progress
  app.get('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }
      
      const job = await enrichmentRepo.getEnrichmentJob(jobId);
      
      if (!job) {
        return res.json({
          success: false,
          message: 'Job not found'
        });
      }
      
      res.json({
        success: true,
        job: stripJobAuthSecret(job)
      });
    } catch (error: any) {
      console.error('Error getting job status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get job status',
        error: error.message
      });
    }
  });

  app.get('/api/enrichment/jobs/:id/events', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (Number.isNaN(jobId)) return res.status(400).json({ message: 'Invalid job ID' });
      const { getAgentEvents } = await import('../../ai/agentEvents');
      const afterSeq = req.query.afterSeq !== undefined ? parseInt(req.query.afterSeq as string) : undefined;
      const events = await getAgentEvents('enrichment', jobId, afterSeq);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get agent events', error: error.message });
    }
  });
  
  // DELETE /api/enrichment/jobs/:id - Cancel a job
  app.delete('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      
      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }
      
      await enrichmentService.cancelJob(jobId);
      
      res.json({
        success: true,
        message: `Enrichment job ${jobId} cancelled successfully`
      });
    } catch (error: any) {
      console.error('Error cancelling job:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel job',
        error: error.message
      });
    }
  });

  // POST /api/admin/enrichment/backfill-suggestions
  // One-shot backfill: take resources that were enriched BEFORE task #59
  // (so their AI category/subcategory guesses sit only in
  // `metadata.suggestedCategory` / `suggestedSubcategory` /
  // `suggestedSubSubcategory`) and promote those guesses onto the real
  // hierarchy columns via `promoteEnrichmentSuggestions`, auto-creating any
  // implied `sub_subcategories` rows. Idempotent — safe to re-run; only
  // touches rows where a corresponding hierarchy column is still blank.
  app.post('/api/admin/enrichment/backfill-suggestions', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const { promoteEnrichmentSuggestions } = await import('../../ai/promoteEnrichmentSuggestions');

      const candidates = await db.execute(sql`
        SELECT id, category, subcategory, sub_subcategory AS "subSubcategory", metadata
        FROM resources
        WHERE status = 'approved'
        AND (
          (metadata->>'suggestedCategory' IS NOT NULL AND length(trim(metadata->>'suggestedCategory')) > 0)
          OR (metadata->>'suggestedSubcategory' IS NOT NULL AND length(trim(metadata->>'suggestedSubcategory')) > 0)
          OR (metadata->>'suggestedSubSubcategory' IS NOT NULL AND length(trim(metadata->>'suggestedSubSubcategory')) > 0)
        )
        AND (
          category IS NULL OR length(trim(category)) = 0
          OR subcategory IS NULL OR length(trim(subcategory)) = 0
          OR sub_subcategory IS NULL OR length(trim(sub_subcategory)) = 0
        )
      `);

      const rows: any[] = (candidates as any).rows ?? (candidates as any);

      const subSubBefore = (await categoryRepo.listSubSubcategories()).length;

      let scanned = 0;
      let resourcesUpdated = 0;
      const updatedIds: number[] = [];
      const errors: { id: number; error: string }[] = [];

      for (const row of rows) {
        scanned++;
        try {
          const metadata = (row.metadata ?? {}) as Record<string, any>;
          const updates = await promoteEnrichmentSuggestions(
            categoryRepo,
            {
              category: row.category,
              subcategory: row.subcategory,
              subSubcategory: row.subSubcategory,
            },
            {
              category: metadata.suggestedCategory,
              subcategory: metadata.suggestedSubcategory,
              subSubcategory: metadata.suggestedSubSubcategory,
            },
          );

          if (Object.keys(updates).length > 0) {
            await resourceRepo.updateResource(row.id, updates);
            resourcesUpdated++;
            updatedIds.push(row.id);
          }
        } catch (err: any) {
          errors.push({ id: row.id, error: err?.message ?? String(err) });
        }
      }

      const subSubAfter = (await categoryRepo.listSubSubcategories()).length;
      const subSubcategoriesCreated = Math.max(0, subSubAfter - subSubBefore);

      const report = {
        scanned,
        resourcesUpdated,
        subSubcategoriesCreated,
        updatedIds,
        errors,
      };

      console.log('[backfill-suggestions] report:', JSON.stringify(report));

      res.json({
        success: true,
        message: `Backfill complete: ${resourcesUpdated}/${scanned} resources updated, ${subSubcategoriesCreated} sub_subcategories created`,
        report,
      });
    } catch (error: any) {
      console.error('Error backfilling enrichment suggestions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to backfill enrichment suggestions',
        error: error.message,
      });
    }
  });

  // --- AI Researcher Routes ---

  app.post('/api/researcher/start', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { researchService } = await import('../../ai/researchService');
      const { prompt, categoryFocus, maxBudgetUsd, maxTurns } = req.body ?? {};

      // WS1 (July 30, 2026): an EMPTY/omitted prompt means "auto-generate the
      // brief server-side" (gap-aware, history-aware, rotating campaign angle).
      // A NON-empty prompt still gets the full R5-021 input contract below —
      // visible prompt (invisible Unicode runs used to pass .trim()), 4000-char
      // cap, no control characters, NUMBER types for the numeric knobs.
      let effectivePrompt: string;
      const promptIsEmpty = prompt === undefined || prompt === null || (typeof prompt === 'string' && prompt.trim() === '');
      if (promptIsEmpty) {
        const generated = await researchService.generateBrief();
        effectivePrompt = generated.brief;
      } else {
        if (typeof prompt !== 'string' || prompt.trim().length < 10) {
          return res.status(400).json({ success: false, message: 'Prompt must be at least 10 characters (or left empty to auto-generate a brief)' });
        }
        if (prompt.length > 4000) {
          return res.status(400).json({ success: false, message: 'Prompt must be at most 4000 characters' });
        }
        if (MULTILINE_CONTROL_RE.test(prompt)) {
          return res.status(400).json({ success: false, message: 'Prompt must not contain control characters' });
        }
        if (BIDI_CONTROL_RE.test(prompt)) {
          return res.status(400).json({ success: false, message: `Prompt ${BIDI_CONTROL_MESSAGE}` });
        }
        if (visibleLength(prompt) < 10) {
          return res.status(400).json({ success: false, message: 'Prompt must contain at least 10 visible characters' });
        }
        effectivePrompt = prompt.trim();
      }
      if (categoryFocus !== undefined && categoryFocus !== null && categoryFocus !== '') {
        if (typeof categoryFocus !== 'string' || categoryFocus.length > 200 || SINGLE_LINE_CONTROL_RE.test(categoryFocus)) {
          return res.status(400).json({ success: false, message: 'categoryFocus must be a string of at most 200 characters' });
        }
      }

      // Budget/turns are UNBOUNDED per explicit owner request (July 24, 2026):
      // omitted/blank => unlimited (stored as NULL, no cap passed to the SDK).
      // When a value IS provided it still must be a sane positive number so
      // garbage like NaN/-5/5.5-turns can't silently start a run (type checks
      // from R5-021 retained; the old $100 / 100-turn ceilings and $0.25 / 5
      // floors are deliberately removed — this supersedes Run16 BUG-008 and
      // the R5-021 cost-amplification ceiling).
      let budget: string | null = null;
      if (maxBudgetUsd !== undefined && maxBudgetUsd !== null && String(maxBudgetUsd).trim() !== '') {
        const n = Number(maxBudgetUsd);
        if (typeof maxBudgetUsd !== 'number' || !Number.isFinite(n) || n <= 0) {
          return res.status(400).json({ success: false, message: 'maxBudgetUsd must be a positive number, or omitted for unlimited' });
        }
        budget = n.toFixed(2);
      }
      let turns: number | null = null;
      if (maxTurns !== undefined && maxTurns !== null && String(maxTurns).trim() !== '') {
        const n = Number(maxTurns);
        if (typeof maxTurns !== 'number' || !Number.isInteger(n) || n <= 0) {
          return res.status(400).json({ success: false, message: 'maxTurns must be a positive integer, or omitted for unlimited' });
        }
        turns = n;
      }
      // Stop-after-N target: omitted/blank => no target. Bounded to the
      // per-run discovery ceiling (1000) so a typo can't demand a month-long run.
      const { targetDiscoveries, scoutModel } = req.body ?? {};
      let target: number | null = null;
      if (targetDiscoveries !== undefined && targetDiscoveries !== null && String(targetDiscoveries).trim() !== '') {
        const n = Number(targetDiscoveries);
        if (typeof targetDiscoveries !== 'number' || !Number.isInteger(n) || n <= 0 || n > 1000) {
          return res.status(400).json({ success: false, message: 'targetDiscoveries must be a positive integer up to 1000, or omitted for no target' });
        }
        target = n;
      }
      // Explicit scout model: same single-line contract as categoryFocus.
      let scout: string | null = null;
      if (scoutModel !== undefined && scoutModel !== null && scoutModel !== '') {
        if (typeof scoutModel !== 'string' || scoutModel.trim() === '' || scoutModel.length > 200 || SINGLE_LINE_CONTROL_RE.test(scoutModel)) {
          return res.status(400).json({ success: false, message: 'scoutModel must be a non-empty string of at most 200 characters' });
        }
        scout = scoutModel.trim();
      }

      let agentConfig;
      try {
        agentConfig = await parseAgentConfigFromRequest(req.body);
      } catch (cfgErr: any) {
        return res.status(400).json({ success: false, message: cfgErr.message || 'Invalid agent configuration' });
      }

      const userId = req.user?.claims?.sub;
      const jobId = await researchService.startResearchJob({
        prompt: effectivePrompt,
        categoryFocus: categoryFocus || undefined,
        maxBudgetUsd: budget,
        maxTurns: turns,
        startedBy: userId,
        model: agentConfig.model,
        scoutModel: scout,
        targetDiscoveries: target,
        baseUrl: agentConfig.baseUrl,
        authTokenEncrypted: agentConfig.authTokenEncrypted,
        authTokenLast4: agentConfig.authTokenLast4,
      });

      res.json({ success: true, jobId, message: 'Research job started' });
    } catch (error: any) {
      console.error('Error starting research job:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to start research job' });
    }
  });

  // WS1 (July 30, 2026): preview the auto-generated research brief so the
  // admin can inspect/edit it in the textarea before launching.
  app.get('/api/researcher/brief', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const { researchService } = await import('../../ai/researchService');
      const { brief, angle } = await researchService.generateBrief();
      res.json({ success: true, brief, angle });
    } catch (error: any) {
      console.error('Error generating research brief:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to generate research brief' });
    }
  });

  app.get('/api/researcher/jobs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../../ai/researchService');
      // Run23 NB-039: ship the total alongside the latest-20 list so the UI
      // can say "showing latest 20 of N" instead of silently truncating.
      // R5-011 (run24): honor a bounded ?limit so the admin UI can "Load
      // more" past the latest 20 (still capped to keep responses sane).
      const rawLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
      const limit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(rawLimit, 1), 200)
        : 20;
      const [jobs, total] = await Promise.all([
        researchService.listJobs(limit),
        researchService.countJobs(),
      ]);
      res.json({ jobs: jobs.map(stripJobAuthSecret), total });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to list research jobs', error: error.message });
    }
  });

  app.get('/api/researcher/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../../ai/researchService');
      const job = await researchService.getJob(parseInt(req.params.id));
      if (!job) return res.status(404).json({ message: 'Job not found' });
      res.json({ ...stripJobAuthSecret(job), isActive: researchService.isJobActive(job.id) });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get job', error: error.message });
    }
  });

  app.get('/api/researcher/jobs/:id/events', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      if (Number.isNaN(jobId)) return res.status(400).json({ message: 'Invalid job ID' });
      const { getAgentEvents } = await import('../../ai/agentEvents');
      const afterSeq = req.query.afterSeq !== undefined ? parseInt(req.query.afterSeq as string) : undefined;
      const events = await getAgentEvents('research', jobId, afterSeq);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get agent events', error: error.message });
    }
  });

  app.delete('/api/researcher/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../../ai/researchService');
      await researchService.cancelJob(parseInt(req.params.id));
      res.json({ success: true, message: 'Job cancelled' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to cancel job', error: error.message });
    }
  });

  app.get('/api/researcher/discoveries', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../../ai/researchService');
      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
      const discoveries = jobId
        ? await researchService.getDiscoveries(jobId)
        : await researchService.getAllPendingDiscoveries();
      res.json(discoveries);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get discoveries', error: error.message });
    }
  });

  // Bulk approve: every pending discovery (optionally scoped to one job).
  // Registered before the /:id routes are matched by method+path anyway, but
  // 'approve-all' would also parse as :id — keep it above them for clarity.
  app.post('/api/researcher/discoveries/approve-all', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../../ai/researchService');
      const rawJobId = req.body?.jobId;
      let jobId: number | undefined;
      if (rawJobId !== undefined && rawJobId !== null && rawJobId !== '') {
        const n = Number(rawJobId);
        if (!Number.isInteger(n) || n <= 0) {
          return res.status(400).json({ success: false, message: 'jobId must be a positive integer' });
        }
        jobId = n;
      }
      const result = await researchService.approveAllPendingDiscoveries(jobId);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to bulk-approve discoveries', error: error.message });
    }
  });

  app.post('/api/researcher/discoveries/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../../ai/researchService');
      const discovery = await researchService.approveDiscovery(parseInt(req.params.id));
      res.json({ success: true, discovery });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to approve discovery', error: error.message });
    }
  });

  app.post('/api/researcher/discoveries/:id/reject', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../../ai/researchService');
      const { reason } = req.body;
      const discovery = await researchService.rejectDiscovery(parseInt(req.params.id), reason);
      res.json({ success: true, discovery });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to reject discovery', error: error.message });
    }
  });
}
