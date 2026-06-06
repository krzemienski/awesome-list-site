// Link Health Check Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { syncService } from "../github/syncService";
import { seedDatabase } from "../seed";
import { isAuthenticated } from "../session";
import { isAdmin } from "./deps";

export function registerLinkHealthRoutes(app: Express): void {
  // ============= Link Health Check Routes =============
  
  // GET /api/admin/link-health/status - Get current/latest job status
  app.get('/api/admin/link-health/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('../services/linkHealthService');
      const job = linkHealthService.getLatestJob();
      res.json({ success: true, job: job || null });
    } catch (error) {
      console.error('Error fetching link health status:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch link health status' });
    }
  });

  // POST /api/admin/link-health/run - Start a new link health check
  app.post('/api/admin/link-health/run', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('../services/linkHealthService');
      const job = await linkHealthService.startCheck();
      res.json({ success: true, job });
    } catch (error: any) {
      console.error('Error starting link health check:', error);
      if (error.message?.includes('already running')) {
        return res.status(409).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: 'Failed to start link health check' });
    }
  });

  // GET /api/admin/link-health/history - Get job history
  app.get('/api/admin/link-health/history', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('../services/linkHealthService');
      const history = linkHealthService.getJobHistory();
      res.json({ success: true, jobs: history });
    } catch (error) {
      console.error('Error fetching link health history:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch link health history' });
    }
  });

  // GET /api/admin/link-health/broken-links - Get broken links with optional filter
  app.get('/api/admin/link-health/broken-links', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { linkHealthService } = await import('../services/linkHealthService');
      const filter = req.query.status as string;
      const brokenLinks = linkHealthService.getBrokenLinks(filter);
      res.json({ success: true, checks: brokenLinks });
    } catch (error) {
      console.error('Error fetching broken links:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch broken links' });
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
      const result = await seedDatabase({ clearExisting });
      
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
      res.status(500).json({ 
        success: false,
        message: 'Failed to seed database',
        error: error.message 
      });
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
      const result = await syncService.importFromGitHub(repoUrl, { dryRun, strictMode });
      
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
      res.status(500).json({ 
        success: false,
        message: 'Failed to import from GitHub',
        error: error.message 
      });
    }
  });

}
