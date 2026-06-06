// Enrichment API Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { enrichmentService } from "../ai/enrichmentService";
import { db } from "../db";
import { isAuthenticated } from "../session";
import { sql } from "drizzle-orm";
import { categoryRepo, enrichmentRepo, isAdmin, resourceRepo } from "./deps";

export function registerEnrichmentRoutes(app: Express): void {
  // ============= Enrichment API Routes =============
  
  // POST /api/enrichment/start - Start batch enrichment job
  app.post('/api/enrichment/start', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { filter = 'unenriched', batchSize = 10 } = req.body;
      const userId = req.user?.claims?.sub;
      
      const jobId = await enrichmentService.queueBatchEnrichment({
        filter,
        batchSize,
        startedBy: userId
      });
      
      res.json({
        success: true,
        jobId,
        message: 'Batch enrichment job started successfully'
      });
    } catch (error: any) {
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
      const limit = parseInt(req.query.limit as string) || 50;
      const jobs = await enrichmentRepo.listEnrichmentJobs(limit);
      
      res.json({
        success: true,
        jobs
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
        job
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
      const { promoteEnrichmentSuggestions } = await import('../ai/promoteEnrichmentSuggestions');

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

}
