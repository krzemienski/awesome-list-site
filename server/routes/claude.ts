/**
 * ============================================================================
 * CLAUDE ROUTES - AI Services & Enrichment
 * ============================================================================
 *
 * This module handles all Claude AI-related routes:
 * - URL analysis with Claude AI
 * - Batch enrichment job management
 * - Resource metadata enhancement
 *
 * All routes require authentication; most require admin privileges.
 * ============================================================================
 */

import type { Router } from "express";
import { storage } from "../storage";
import { claudeService } from "../ai/claudeService";
import { enrichmentService } from "../ai/enrichmentService";

export function registerClaudeRoutes(
  router: Router,
  isAuthenticated: any,
  isAdmin: any
): void {
  // POST /api/claude/analyze - Analyze URL with Claude AI (authenticated)
  router.post('/api/claude/analyze', isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }

      if (!claudeService.isAvailable()) {
        return res.status(503).json({
          message: 'Claude AI service is not available',
          available: false
        });
      }

      const analysis = await claudeService.analyzeURL(url);

      if (!analysis) {
        return res.status(500).json({ message: 'Failed to analyze URL' });
      }

      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing URL:', error);
      res.status(500).json({ message: 'Failed to analyze URL' });
    }
  });

  // POST /api/enrichment/start - Start batch enrichment job
  router.post('/api/enrichment/start', isAuthenticated, isAdmin, async (req: any, res) => {
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
  router.get('/api/enrichment/jobs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const jobs = await storage.listEnrichmentJobs(limit);

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
  router.get('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);

      if (isNaN(jobId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid job ID'
        });
      }

      const job = await storage.getEnrichmentJob(jobId);

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
  router.delete('/api/enrichment/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
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
}
