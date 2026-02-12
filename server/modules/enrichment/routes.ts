/**
 * ============================================================================
 * ENRICHMENT MODULE ROUTES - AI-Powered Resource Enrichment Endpoints
 * ============================================================================
 *
 * This module defines all enrichment-related API endpoints including
 * batch job management, job status tracking, and enrichment operations.
 *
 * ENDPOINTS:
 * - POST   /api/enrichment/start      - Start batch enrichment job
 * - GET    /api/enrichment/jobs       - List all enrichment jobs
 * - GET    /api/enrichment/jobs/:id   - Get job status with progress
 * - DELETE /api/enrichment/jobs/:id   - Cancel a running job
 *
 * AUTHENTICATION:
 * - All enrichment routes require authentication AND admin role
 * - Uses isAuthenticated + isAdmin middleware on all endpoints
 *
 * AUTHORIZATION:
 * - Admin role required for all operations
 * - Only admins can start, view, and cancel enrichment jobs
 *
 * ERROR HANDLING:
 * - 400 Bad Request: Invalid job ID or parameters
 * - 401 Unauthorized: Authentication required
 * - 403 Forbidden: Admin access required
 * - 404 Not Found: Job doesn't exist
 * - 500 Internal Server Error: Server-side errors
 *
 * See /docs/ENRICHMENT.md for enrichment service documentation.
 * ============================================================================
 */

import type { Express, Response } from 'express';
import type { AuthenticatedRequest, Module } from '../types';
import { storage } from '../../storage';
import { enrichmentService } from '../../ai/enrichmentService';
import { isAuthenticated, isAdmin, sendError, sendSuccess } from '../middleware';

/**
 * POST /api/enrichment/start - Start batch enrichment job
 *
 * Starts a new AI enrichment job to process resources in batches.
 * Jobs can filter resources by enrichment status and process them
 * with configurable batch sizes.
 *
 * @body filter - Filter type: 'all' | 'unenriched' (default: 'unenriched')
 * @body batchSize - Number of resources per batch (default: 10)
 * @returns 200 - Job ID and success message
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function startEnrichmentJob(req: AuthenticatedRequest, res: Response) {
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
    console.error('[Enrichment] Error starting enrichment job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start enrichment job',
      error: error.message
    });
  }
}

/**
 * GET /api/enrichment/jobs - List all enrichment jobs
 *
 * Returns a paginated list of enrichment jobs with their status,
 * progress, and metadata. Most recent jobs are returned first.
 *
 * @query limit - Maximum number of jobs to return (default: 50)
 * @returns 200 - Array of enrichment jobs
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function listEnrichmentJobs(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const jobs = await storage.listEnrichmentJobs(limit);

    res.json({
      success: true,
      jobs
    });
  } catch (error: any) {
    console.error('[Enrichment] Error listing enrichment jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list enrichment jobs',
      error: error.message
    });
  }
}

/**
 * GET /api/enrichment/jobs/:id - Get job status with progress
 *
 * Returns detailed status information for a specific enrichment job
 * including progress percentage, resource counts, timing estimates,
 * and detailed queue item information.
 *
 * @param id - Job ID (path parameter)
 * @returns 200 - Job status with detailed progress
 * @returns 400 - Invalid job ID
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 404 - Job not found
 * @returns 500 - Server error
 */
async function getJobStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const jobId = parseInt(req.params.id);

    if (isNaN(jobId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID'
      });
    }

    const job = await enrichmentService.getJobStatus(jobId);
    const queueItems = await storage.getEnrichmentQueueItemsByJob(jobId);

    res.json({
      success: true,
      job,
      queueItems
    });
  } catch (error: any) {
    console.error('[Enrichment] Error getting job status:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get job status',
      error: error.message
    });
  }
}

/**
 * DELETE /api/enrichment/jobs/:id - Cancel a running job
 *
 * Cancels an in-progress enrichment job. Jobs that are pending or
 * processing will be marked as cancelled and will stop processing
 * new resources.
 *
 * @param id - Job ID (path parameter)
 * @returns 200 - Success message
 * @returns 400 - Invalid job ID
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 404 - Job not found
 * @returns 500 - Server error
 */
async function cancelJob(req: AuthenticatedRequest, res: Response) {
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
      message: 'Job cancelled successfully'
    });
  } catch (error: any) {
    console.error('[Enrichment] Error cancelling job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel job',
      error: error.message
    });
  }
}

/**
 * Register all enrichment routes with the Express app
 *
 * All routes require both authentication and admin role.
 * Middleware is applied in order: isAuthenticated → isAdmin → handler
 *
 * @param app - Express application instance
 */
function registerRoutes(app: Express): void {
  // POST /api/enrichment/start - Start batch enrichment job
  app.post('/api/enrichment/start', isAuthenticated, isAdmin, startEnrichmentJob);

  // GET /api/enrichment/jobs - List all enrichment jobs
  app.get('/api/enrichment/jobs', isAuthenticated, isAdmin, listEnrichmentJobs);

  // GET /api/enrichment/jobs/:id - Get job status with progress
  app.get('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, getJobStatus);

  // DELETE /api/enrichment/jobs/:id - Cancel a job
  app.delete('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, cancelJob);

  console.log('[Enrichment Module] Routes registered: 4 enrichment endpoints');
}

/**
 * Enrichment module export
 * Implements the Module interface for registration with the module system
 */
export const enrichmentModule: Module = {
  name: 'enrichment',
  description: 'AI-powered resource enrichment and batch processing',
  version: '1.0.0',
  registerRoutes,
};
