/**
 * ============================================================================
 * RESEARCH MODULE ROUTES - AI-Powered Research Endpoints
 * ============================================================================
 *
 * This module defines all research-related API endpoints including
 * research job management, status tracking, findings review, and cost analysis.
 *
 * ENDPOINTS:
 * - POST   /api/research/jobs              - Start new research job
 * - GET    /api/research/jobs              - List research jobs
 * - GET    /api/research/jobs/:id          - Get job status
 * - GET    /api/research/jobs/:id/report   - Get generated report
 * - DELETE /api/research/jobs/:id          - Cancel running job
 * - GET    /api/research/costs             - Get AI usage cost statistics
 * - POST   /api/research/findings/:id/apply   - Apply a research finding
 * - POST   /api/research/findings/:id/dismiss - Dismiss a research finding
 *
 * AUTHENTICATION:
 * - All research routes require authentication AND admin role
 * - Uses isAuthenticated + isAdmin middleware on all endpoints
 *
 * AUTHORIZATION:
 * - Admin role required for all operations
 * - Only admins can start, view, and manage research jobs
 *
 * ERROR HANDLING:
 * - 400 Bad Request: Invalid parameters or validation errors
 * - 401 Unauthorized: Authentication required
 * - 403 Forbidden: Admin access required
 * - 404 Not Found: Job or finding doesn't exist
 * - 500 Internal Server Error: Server-side errors
 *
 * See /docs/RESEARCH.md for research service documentation.
 * ============================================================================
 */

import type { Express, Response } from 'express';
import type { AuthenticatedRequest, Module } from '../types';
import { isAuthenticated, isAdmin, sendError, sendSuccess } from '../middleware';
import { researchService } from '../../ai/researchService';
import { z } from 'zod';
import { db } from '../../db';
import { researchJobs, researchFindings } from '@shared/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';

/**
 * Validation schema for starting a research job
 */
const startJobSchema = z.object({
  awesomeListId: z.number().int().positive(),
  jobType: z.enum(['validation', 'enrichment', 'discovery', 'trend_analysis']),
  model: z.enum(['claude-3-5-haiku', 'claude-3-5-sonnet', 'claude-3-opus']).optional(),
  config: z.object({
    depth: z.enum(['shallow', 'medium', 'deep']).optional(),
    focusAreas: z.array(z.string()).optional(),
    maxSources: z.number().int().min(1).max(50).optional(),
  }).optional(),
});

/**
 * POST /api/research/jobs - Start a new research job
 *
 * Starts a new AI research job to analyze resources or discover new ones.
 * Jobs can be configured with different types, models, and depth levels.
 *
 * @body awesomeListId - ID of the awesome list to research
 * @body jobType - Type of research: 'validation' | 'enrichment' | 'discovery' | 'trend_analysis'
 * @body model - Claude model to use (optional, defaults to Haiku)
 * @body config - Job configuration (depth, focus areas, max sources)
 * @returns 201 - Job ID and status
 * @returns 400 - Validation error
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function startResearchJob(req: AuthenticatedRequest, res: Response) {
  try {
    const parsed = startJobSchema.safeParse(req.body);

    if (!parsed.success) {
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid request parameters',
        parsed.error.errors
      );
    }

    const userId = req.user?.claims?.sub;
    const jobId = await researchService.queueResearchJob({
      ...parsed.data,
      startedBy: userId,
    });

    // Start processing in background (don't await)
    researchService.processJob(jobId).catch((err: any) => {
      console.error(`[Research] Job ${jobId} failed:`, err);
    });

    return sendSuccess(
      res,
      { jobId, status: 'pending' },
      'Research job queued successfully'
    );
  } catch (error: any) {
    console.error('[Research] Error starting research job:', error);
    return sendError(
      res,
      500,
      'JOB_START_ERROR',
      'Failed to start research job',
      error.message
    );
  }
}

/**
 * GET /api/research/jobs - List research jobs with optional filters
 *
 * Returns a paginated list of research jobs with their status,
 * progress, and metadata. Supports filtering by status and job type.
 *
 * @query status - Filter by job status (optional)
 * @query jobType - Filter by job type (optional)
 * @query limit - Maximum number of jobs to return (default: 20)
 * @query offset - Number of jobs to skip (default: 0)
 * @returns 200 - Array of research jobs with pagination
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function listResearchJobs(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, jobType, limit = '20', offset = '0' } = req.query;

    const filters = {
      status: status as string | undefined,
      jobType: jobType as string | undefined,
      limit: parseInt(limit as string) || 20,
      offset: parseInt(offset as string) || 0,
    };

    // Build query conditions
    const conditions = [];
    if (filters.status) {
      conditions.push(eq(researchJobs.status, filters.status));
    }
    if (filters.jobType) {
      conditions.push(eq(researchJobs.jobType, filters.jobType));
    }

    // Query jobs with filters
    const jobs = await db
      .select()
      .from(researchJobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(researchJobs.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);

    // Count total jobs with same filters
    const totalResult = await db
      .select({ count: count() })
      .from(researchJobs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = totalResult[0]?.count || 0;

    return sendSuccess(
      res,
      { jobs },
      undefined,
      {
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total,
        }
      }
    );
  } catch (error: any) {
    console.error('[Research] Error listing jobs:', error);
    return sendError(
      res,
      500,
      'JOB_LIST_ERROR',
      'Failed to list research jobs',
      error.message
    );
  }
}

/**
 * GET /api/research/jobs/:id - Get job status and details
 *
 * Returns detailed status information for a specific research job
 * including progress percentage, findings count, timing, and metadata.
 *
 * @param id - Job ID (path parameter)
 * @returns 200 - Job status with detailed information
 * @returns 400 - Invalid job ID
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 404 - Job not found
 * @returns 500 - Server error
 */
async function getJobStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const jobId = req.params.id;

    if (!jobId) {
      return sendError(res, 400, 'INVALID_JOB_ID', 'Job ID is required');
    }

    const status = await researchService.getJobStatus(jobId);

    if (!status) {
      return sendError(res, 404, 'JOB_NOT_FOUND', 'Research job not found');
    }

    return sendSuccess(res, status);
  } catch (error: any) {
    console.error('[Research] Error getting job status:', error);
    return sendError(
      res,
      500,
      'JOB_STATUS_ERROR',
      'Failed to get job status',
      error.message
    );
  }
}

/**
 * GET /api/research/jobs/:id/report - Get generated report for a completed job
 *
 * Returns the comprehensive research report for a completed job
 * including findings, analysis, and recommendations.
 *
 * @param id - Job ID (path parameter)
 * @returns 200 - Research report
 * @returns 400 - Invalid job ID
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 404 - Report not found or job not completed
 * @returns 500 - Server error
 */
async function getJobReport(req: AuthenticatedRequest, res: Response) {
  try {
    const jobId = req.params.id;

    if (!jobId) {
      return sendError(res, 400, 'INVALID_JOB_ID', 'Job ID is required');
    }

    const report = await researchService.generateReport(jobId);

    if (!report) {
      return sendError(
        res,
        404,
        'REPORT_NOT_FOUND',
        'Report not found or job not completed'
      );
    }

    return sendSuccess(res, report);
  } catch (error: any) {
    console.error('[Research] Error generating report:', error);
    return sendError(
      res,
      500,
      'REPORT_ERROR',
      'Failed to generate report',
      error.message
    );
  }
}

/**
 * DELETE /api/research/jobs/:id - Cancel a running job
 *
 * Cancels an in-progress research job. Jobs that are pending or
 * processing will be marked as cancelled and will stop processing.
 *
 * @param id - Job ID (path parameter)
 * @returns 200 - Success message
 * @returns 400 - Invalid job ID or job cannot be cancelled
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 404 - Job not found
 * @returns 500 - Server error
 */
async function cancelJob(req: AuthenticatedRequest, res: Response) {
  try {
    const jobId = req.params.id;

    if (!jobId) {
      return sendError(res, 400, 'INVALID_JOB_ID', 'Job ID is required');
    }

    const cancelled = await researchService.cancelJob(jobId);

    if (!cancelled) {
      return sendError(
        res,
        400,
        'CANCEL_ERROR',
        'Job cannot be cancelled (not found or already completed)'
      );
    }

    return sendSuccess(res, null, 'Job cancelled successfully');
  } catch (error: any) {
    console.error('[Research] Error cancelling job:', error);
    return sendError(
      res,
      500,
      'CANCEL_ERROR',
      'Failed to cancel job',
      error.message
    );
  }
}

/**
 * GET /api/research/costs - Get AI usage cost statistics
 *
 * Returns AI usage cost statistics for research jobs, optionally
 * filtered by date range. Includes token counts, model usage,
 * and estimated costs.
 *
 * @query startDate - Start date for cost analysis (optional)
 * @query endDate - End date for cost analysis (optional)
 * @returns 200 - Cost statistics
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function getCostStats(req: AuthenticatedRequest, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const stats = await researchService.getCostStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return sendSuccess(res, stats);
  } catch (error: any) {
    console.error('[Research] Error getting cost stats:', error);
    return sendError(
      res,
      500,
      'COST_STATS_ERROR',
      'Failed to get cost statistics',
      error.message
    );
  }
}

/**
 * POST /api/research/findings/:id/apply - Apply a research finding
 *
 * Applies a research finding to update resource metadata or
 * create new resources based on the finding.
 *
 * @param id - Finding ID (path parameter)
 * @returns 200 - Success message
 * @returns 400 - Invalid finding ID
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 404 - Finding not found
 * @returns 500 - Server error
 */
async function applyFinding(req: AuthenticatedRequest, res: Response) {
  try {
    const findingId = req.params.id;

    if (!findingId) {
      return sendError(res, 400, 'INVALID_FINDING_ID', 'Invalid finding ID');
    }

    const userId = req.user?.claims?.sub;

    // Check if finding exists
    const finding = await db
      .select()
      .from(researchFindings)
      .where(eq(researchFindings.id, findingId))
      .limit(1);

    if (!finding || finding.length === 0) {
      return sendError(res, 404, 'FINDING_NOT_FOUND', 'Finding not found');
    }

    // Update finding to mark as applied
    await db
      .update(researchFindings)
      .set({
        applied: true,
        appliedAt: new Date(),
        appliedBy: userId,
      })
      .where(eq(researchFindings.id, findingId));

    return sendSuccess(res, null, 'Finding applied successfully');
  } catch (error: any) {
    console.error('[Research] Error applying finding:', error);
    return sendError(
      res,
      500,
      'APPLY_ERROR',
      'Failed to apply finding',
      error.message
    );
  }
}

/**
 * POST /api/research/findings/:id/dismiss - Dismiss a research finding
 *
 * Dismisses a research finding, marking it as reviewed but not applied.
 *
 * @param id - Finding ID (path parameter)
 * @returns 200 - Success message
 * @returns 400 - Invalid finding ID
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 404 - Finding not found
 * @returns 500 - Server error
 */
async function dismissFinding(req: AuthenticatedRequest, res: Response) {
  try {
    const findingId = req.params.id;

    if (!findingId) {
      return sendError(res, 400, 'INVALID_FINDING_ID', 'Invalid finding ID');
    }

    const userId = req.user?.claims?.sub;

    // Check if finding exists
    const finding = await db
      .select()
      .from(researchFindings)
      .where(eq(researchFindings.id, findingId))
      .limit(1);

    if (!finding || finding.length === 0) {
      return sendError(res, 404, 'FINDING_NOT_FOUND', 'Finding not found');
    }

    // Update finding to mark as dismissed
    await db
      .update(researchFindings)
      .set({
        dismissed: true,
        dismissedAt: new Date(),
        dismissedBy: userId,
      })
      .where(eq(researchFindings.id, findingId));

    return sendSuccess(res, null, 'Finding dismissed successfully');
  } catch (error: any) {
    console.error('[Research] Error dismissing finding:', error);
    return sendError(
      res,
      500,
      'DISMISS_ERROR',
      'Failed to dismiss finding',
      error.message
    );
  }
}

/**
 * Register all research routes with the Express app
 *
 * All routes require both authentication and admin role.
 * Middleware is applied in order: isAuthenticated → isAdmin → handler
 *
 * @param app - Express application instance
 */
function registerRoutes(app: Express): void {
  // POST /api/research/jobs - Start new research job
  app.post('/api/research/jobs', isAuthenticated, isAdmin, startResearchJob);

  // GET /api/research/jobs - List research jobs
  app.get('/api/research/jobs', isAuthenticated, isAdmin, listResearchJobs);

  // GET /api/research/jobs/:id - Get job status
  app.get('/api/research/jobs/:id', isAuthenticated, isAdmin, getJobStatus);

  // GET /api/research/jobs/:id/report - Get job report
  app.get('/api/research/jobs/:id/report', isAuthenticated, isAdmin, getJobReport);

  // DELETE /api/research/jobs/:id - Cancel job
  app.delete('/api/research/jobs/:id', isAuthenticated, isAdmin, cancelJob);

  // GET /api/research/costs - Get cost statistics
  app.get('/api/research/costs', isAuthenticated, isAdmin, getCostStats);

  // POST /api/research/findings/:id/apply - Apply finding
  app.post('/api/research/findings/:id/apply', isAuthenticated, isAdmin, applyFinding);

  // POST /api/research/findings/:id/dismiss - Dismiss finding
  app.post('/api/research/findings/:id/dismiss', isAuthenticated, isAdmin, dismissFinding);

  console.log('[Research Module] Routes registered: 8 research endpoints');
}

/**
 * Research module export
 * Implements the Module interface for registration with the module system
 */
export const researchModule: Module = {
  name: 'research',
  description: 'AI-powered research jobs for resource analysis and discovery',
  version: '1.0.0',
  registerRoutes,
};
