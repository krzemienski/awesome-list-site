// AI Researcher Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { isAuthenticated } from "../session";
import { isAdmin } from "./deps";

export function registerResearcherRoutes(app: Express): void {
  // ============= AI Researcher Routes =============

  app.post('/api/researcher/start', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { researchService } = await import('../ai/researchService');
      const { prompt, categoryFocus, maxBudgetUsd, maxTurns } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
        return res.status(400).json({ success: false, message: 'Prompt must be at least 10 characters' });
      }

      const userId = req.user?.claims?.sub;
      const jobId = await researchService.startResearchJob({
        prompt: prompt.trim(),
        categoryFocus: categoryFocus || undefined,
        maxBudgetUsd: maxBudgetUsd || '1.00',
        maxTurns: maxTurns || 30,
        startedBy: userId,
      });

      res.json({ success: true, jobId, message: 'Research job started' });
    } catch (error: any) {
      console.error('Error starting research job:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to start research job' });
    }
  });

  app.get('/api/researcher/jobs', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../ai/researchService');
      const jobs = await researchService.listJobs();
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to list research jobs', error: error.message });
    }
  });

  app.get('/api/researcher/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../ai/researchService');
      const job = await researchService.getJob(parseInt(req.params.id));
      if (!job) return res.status(404).json({ message: 'Job not found' });
      res.json({ ...job, isActive: researchService.isJobActive(job.id) });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get job', error: error.message });
    }
  });

  app.delete('/api/researcher/jobs/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../ai/researchService');
      await researchService.cancelJob(parseInt(req.params.id));
      res.json({ success: true, message: 'Job cancelled' });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to cancel job', error: error.message });
    }
  });

  app.get('/api/researcher/discoveries', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../ai/researchService');
      const jobId = req.query.jobId ? parseInt(req.query.jobId as string) : undefined;
      const discoveries = jobId
        ? await researchService.getDiscoveries(jobId)
        : await researchService.getAllPendingDiscoveries();
      res.json(discoveries);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get discoveries', error: error.message });
    }
  });

  app.post('/api/researcher/discoveries/:id/approve', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../ai/researchService');
      const discovery = await researchService.approveDiscovery(parseInt(req.params.id));
      res.json({ success: true, discovery });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to approve discovery', error: error.message });
    }
  });

  app.post('/api/researcher/discoveries/:id/reject', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { researchService } = await import('../ai/researchService');
      const { reason } = req.body;
      const discovery = await researchService.rejectDiscovery(parseInt(req.params.id), reason);
      res.json({ success: true, discovery });
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to reject discovery', error: error.message });
    }
  });

}
