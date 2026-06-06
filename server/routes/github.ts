// GitHub Sync Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { syncService } from "../github/syncService";
import { isAuthenticated } from "../session";
import { githubSyncRepo, isAdmin } from "./deps";

export function registerGithubRoutes(app: Express): void {
  // ============= GitHub Sync Routes =============
  
  // POST /api/github/configure - Configure GitHub repository
  app.post('/api/github/configure', isAuthenticated, isAdmin, async (req: any, res) => {
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
  app.post('/api/github/import', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, options = {} } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      // Add to queue for processing
      const queueItem = await githubSyncRepo.addToGithubSyncQueue({
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
  app.post('/api/github/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { repositoryUrl, options = {} } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ message: 'Repository URL is required' });
      }
      
      // Add to queue for processing
      const queueItem = await githubSyncRepo.addToGithubSyncQueue({
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
  app.get('/api/github/sync-status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = req.query.status as string;
      const queueItems = await githubSyncRepo.getGithubSyncQueue(status);
      
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
      const history = await githubSyncRepo.getSyncHistory();
      
      res.json(history.sort((a, b) => 
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

}
