/**
 * ============================================================================
 * GITHUB ROUTES - GitHub Integration & Awesome List Sync
 * ============================================================================
 *
 * This module handles all GitHub-related routes:
 * - Repository configuration and sync setup
 * - Import/export with awesome lists
 * - Sync queue management and status tracking
 * - Awesome lists discovery and search
 *
 * All routes require admin authentication except discovery endpoints.
 * ============================================================================
 */

import type { Router } from "express";
import { storage } from "../storage";
import { syncService } from "../github/syncService";
import { fetchAwesomeLists, searchAwesomeLists } from "../github-api";

export function registerGitHubRoutes(
  router: Router,
  isAuthenticated: any,
  isAdmin: any
): void {
  // POST /api/github/configure - Configure GitHub repository
  router.post('/api/github/configure', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, token } = req.body;

      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }

      const result = await syncService.configureRepository(repositoryUrl, token);

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
  router.post('/api/github/import', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, options = {} } = req.body;

      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }

      // Add to queue for processing
      const queueItem = await storage.addToGithubSyncQueue({
        repositoryUrl,
        action: 'import',
        status: 'pending',
        resourceIds: [],
        metadata: options
      });

      // Process immediately in background
      syncService.importFromGitHub(repositoryUrl, options)
        .then(result => {
          console.log('GitHub import completed:', result);
        })
        .catch(error => {
          console.error('GitHub import failed:', error);
        });

      res.json({
        message: 'Import started',
        queueId: queueItem.id,
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting GitHub import:', error);
      res.status(500).json({ message: 'Failed to start GitHub import' });
    }
  });

  // POST /api/github/export - Export approved resources to GitHub
  router.post('/api/github/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, options = {} } = req.body;

      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }

      // Add to queue for processing
      const queueItem = await storage.addToGithubSyncQueue({
        repositoryUrl,
        action: 'export',
        status: 'pending',
        resourceIds: [],
        metadata: options
      });

      // Process immediately in background
      syncService.exportToGitHub(repositoryUrl, options)
        .then(result => {
          console.log('GitHub export completed:', result);
        })
        .catch(error => {
          console.error('GitHub export failed:', error);
        });

      res.json({
        message: 'Export started',
        queueId: queueItem.id,
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting GitHub export:', error);
      res.status(500).json({ message: 'Failed to start GitHub export' });
    }
  });

  // GET /api/github/sync-status - Check sync queue status
  router.get('/api/github/sync-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      const queueItems = await storage.getGithubSyncQueue(status);

      res.json({
        total: queueItems.length,
        items: queueItems
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
      res.status(500).json({ message: 'Failed to fetch sync status' });
    }
  });

  // GET /api/github/sync-status/:id - Get specific sync item status
  router.get('/api/github/sync-status/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const queueItems = await storage.getGithubSyncQueue();
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
  router.get('/api/github/sync-history', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const history = await storage.getSyncHistory();

      res.json(history.sort((a, b) =>
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      ));
    } catch (error) {
      console.error('Error fetching sync history:', error);
      res.status(500).json({ message: 'Failed to fetch sync history' });
    }
  });

  // POST /api/github/process-queue - Manually trigger queue processing
  router.post('/api/github/process-queue', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Process queue in background
      syncService.processQueue()
        .then(() => {
          console.log('GitHub sync queue processing completed');
        })
        .catch(error => {
          console.error('GitHub sync queue processing failed:', error);
        });

      res.json({
        message: 'Queue processing started',
        status: 'processing'
      });
    } catch (error) {
      console.error('Error starting queue processing:', error);
      res.status(500).json({ message: 'Failed to start queue processing' });
    }
  });

  // POST /api/admin/import-github - Import resources from GitHub (legacy route)
  router.post('/api/admin/import-github', isAuthenticated, isAdmin, async (req, res) => {
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

  // GET /api/github/awesome-lists - Discover awesome lists on GitHub
  router.get("/api/github/awesome-lists", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.per_page as string) || 30;

      const result = await fetchAwesomeLists(page, perPage);
      res.json(result);
    } catch (error) {
      console.error('Error fetching awesome lists from GitHub:', error);
      res.status(500).json({ error: 'Failed to fetch awesome lists' });
    }
  });

  // GET /api/github/search - Search for awesome lists on GitHub
  router.get("/api/github/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;

      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const result = await searchAwesomeLists(query, page);
      res.json(result);
    } catch (error) {
      console.error('Error searching awesome lists:', error);
      res.status(500).json({ error: 'Failed to search awesome lists' });
    }
  });
}
