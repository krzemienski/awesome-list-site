/**
 * ============================================================================
 * GITHUB SYNC MODULE ROUTES - GitHub Synchronization Endpoints
 * ============================================================================
 *
 * This module defines all GitHub synchronization API endpoints including
 * import, export, queue management, and repository discovery.
 *
 * ENDPOINTS:
 * - POST /api/github/configure     - Configure GitHub repository
 * - POST /api/github/import        - Import resources from GitHub
 * - POST /api/github/export        - Export resources to GitHub
 * - GET  /api/github/sync-status   - Check sync queue status
 * - GET  /api/github/sync-status/:id - Get specific sync item
 * - GET  /api/github/sync-history  - Get all sync history
 * - POST /api/github/process-queue - Manually trigger queue processing
 * - GET  /api/github/awesome-lists - List awesome repositories
 * - GET  /api/github/search        - Search awesome repositories
 *
 * AUTHENTICATION:
 * - All routes require admin access (isAuthenticated + isAdmin)
 * - Exception: awesome-lists and search are public for discovery
 *
 * SYNC FLOW:
 * 1. Configure repository URL and optional auth token
 * 2. Import/Export operations are queued for async processing
 * 3. Monitor progress via sync-status endpoints
 * 4. Review history and results via sync-history endpoint
 *
 * QUEUE PROCESSING:
 * - Operations are processed asynchronously via queue
 * - Status transitions: pending → processing → completed/failed
 * - Automatic retry with exponential backoff on failures
 *
 * ERROR HANDLING:
 * - 400 Bad Request: Invalid data or missing required fields
 * - 401 Unauthorized: Authentication required
 * - 403 Forbidden: Admin access required
 * - 404 Not Found: Sync item or repository not found
 * - 500 Internal Server Error: Server-side sync errors
 *
 * See /docs/ADMIN-GUIDE.md for GitHub sync workflow documentation.
 * ============================================================================
 */

import type { Express, Response } from 'express';
import type { AuthenticatedRequest, Module } from '../types';
import { storage } from '../../storage';
import { isAuthenticated, isAdmin, sendError, sendSuccess } from '../middleware';
import { syncService } from '../../github/syncService';
import { fetchAwesomeLists, searchAwesomeLists } from '../../github-api';

/**
 * POST /api/github/configure - Configure GitHub repository
 *
 * Sets up repository URL and optional authentication token for sync operations.
 * This must be done before import/export operations.
 *
 * @body repositoryUrl - GitHub repository URL (required)
 * @body token - GitHub personal access token (optional, for private repos)
 * @returns 200 - Configuration successful
 * @returns 400 - Invalid repository URL or configuration failed
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function configureRepository(req: AuthenticatedRequest, res: Response) {
  try {
    const { repositoryUrl, token } = req.body;

    if (!repositoryUrl) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Repository URL is required');
    }

    const result = await syncService.configureRepository(repositoryUrl, token);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to configure GitHub repository', error);
  }
}

/**
 * POST /api/github/import - Import resources from GitHub awesome list
 *
 * Queues an import job to fetch and parse resources from a GitHub repository.
 * The import runs asynchronously and can be monitored via sync-status endpoint.
 *
 * Import process:
 * 1. Fetches raw markdown from repository
 * 2. Parses into structured resources
 * 3. Validates against awesome-lint rules
 * 4. Resolves conflicts with existing resources
 * 5. Inserts/updates database entries
 *
 * @body repositoryUrl - GitHub repository URL (required)
 * @body options - Import options (optional):
 *   - dryRun: Preview without saving
 *   - forceOverwrite: Overwrite existing resources
 * @returns 200 - Import queued successfully
 * @returns 400 - Invalid repository URL
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function importFromGitHub(req: AuthenticatedRequest, res: Response) {
  try {
    const { repositoryUrl, options = {} } = req.body;

    if (!repositoryUrl) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Repository URL is required');
    }

    // Add to queue for processing
    const queueItem = await storage.addToGithubSyncQueue({
      repositoryUrl,
      action: 'import',
      status: 'pending',
      metadata: options,
    });

    // Process queue in background
    syncService.processQueue()
      .catch(error => {
        console.error('GitHub sync queue processing failed:', error);
      });

    res.json({
      message: 'Import started',
      queueId: queueItem.id,
      status: 'processing'
    });
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to start GitHub import', error);
  }
}

/**
 * POST /api/github/export - Export approved resources to GitHub
 *
 * Queues an export job to format and commit resources to a GitHub repository.
 * The export runs asynchronously and can be monitored via sync-status endpoint.
 *
 * Export process:
 * 1. Fetches all approved resources from database
 * 2. Formats as awesome-lint compliant markdown
 * 3. Validates output before committing
 * 4. Creates GitHub commit or pull request
 * 5. Updates sync status on resources
 *
 * @body repositoryUrl - GitHub repository URL (required)
 * @body options - Export options (optional):
 *   - createPullRequest: Create PR instead of direct commit
 *   - branchName: Custom branch name
 * @returns 200 - Export queued successfully
 * @returns 400 - Invalid repository URL
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function exportToGitHub(req: AuthenticatedRequest, res: Response) {
  try {
    const { repositoryUrl, options = {} } = req.body;

    if (!repositoryUrl) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Repository URL is required');
    }

    // Add to queue for processing
    const queueItem = await storage.addToGithubSyncQueue({
      repositoryUrl,
      action: 'export',
      status: 'pending',
      metadata: options,
    });

    // Process queue in background
    syncService.processQueue()
      .catch(error => {
        console.error('GitHub sync queue processing failed:', error);
      });

    res.json({
      message: 'Export started',
      queueId: queueItem.id,
      status: 'processing'
    });
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to start GitHub export', error);
  }
}

/**
 * GET /api/github/sync-status - Check sync queue status
 *
 * Returns all queued sync operations, optionally filtered by status.
 *
 * Query params:
 * - status: Filter by status (pending, processing, completed, failed)
 *
 * @returns 200 - List of sync queue items
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function getSyncStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const status = req.query.status as string;
    const queueItems = await storage.getGithubSyncQueue(status);

    res.json({
      total: queueItems.length,
      items: queueItems
    });
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch sync status', error);
  }
}

/**
 * GET /api/github/sync-status/:id - Get specific sync item status
 *
 * Returns detailed status for a specific sync queue item.
 *
 * @param id - Queue item ID (path parameter)
 * @returns 200 - Sync item details
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 404 - Sync item not found
 * @returns 500 - Server error
 */
async function getSyncItemStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const queueItems = await storage.getGithubSyncQueue();
    const item = queueItems.find(q => q.id === id);

    if (!item) {
      return sendError(res, 404, 'NOT_FOUND', 'Sync item not found');
    }

    res.json(item);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch sync item', error);
  }
}

/**
 * GET /api/github/sync-history - Get all sync history
 *
 * Returns audit trail of all completed sync operations.
 * Sorted by creation date (most recent first).
 *
 * @returns 200 - List of sync history records
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function getSyncHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const history = await storage.getSyncHistory();

    res.json(history.sort((a, b) =>
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    ));
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch sync history', error);
  }
}

/**
 * POST /api/github/process-queue - Manually trigger queue processing
 *
 * Manually triggers processing of pending sync queue items.
 * Useful for retrying failed operations or forcing immediate processing.
 *
 * @returns 200 - Queue processing started
 * @returns 401 - Not authenticated
 * @returns 403 - Not admin
 * @returns 500 - Server error
 */
async function processQueue(req: AuthenticatedRequest, res: Response) {
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
      success: true,
      message: 'Queue processing started'
    });
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to trigger queue processing', error);
  }
}

/**
 * GET /api/github/awesome-lists - List awesome repositories
 *
 * Fetches list of awesome repositories from GitHub for discovery.
 * Public endpoint - no authentication required.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - per_page: Items per page (default: 30)
 *
 * @returns 200 - Paginated list of awesome repositories
 * @returns 500 - Server error
 */
async function listAwesomeLists(req: AuthenticatedRequest, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 30;

    const result = await fetchAwesomeLists(page, perPage);
    res.json(result);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch awesome lists', error);
  }
}

/**
 * GET /api/github/search - Search awesome repositories
 *
 * Searches GitHub for awesome repositories matching query.
 * Public endpoint - no authentication required.
 *
 * Query params:
 * - q: Search query (required)
 * - page: Page number (default: 1)
 *
 * @returns 200 - Search results
 * @returns 400 - Missing search query
 * @returns 500 - Server error
 */
async function searchAwesomeRepositories(req: AuthenticatedRequest, res: Response) {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;

    if (!query) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Search query is required');
    }

    const result = await searchAwesomeLists(query, page);
    res.json(result);
  } catch (error) {
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to search awesome lists', error);
  }
}

/**
 * Register all GitHub sync routes with the Express app
 *
 * Routes are organized by authentication requirements:
 * 1. Public routes (discovery): awesome-lists, search
 * 2. Admin routes (sync operations): all others
 *
 * @param app - Express application instance
 */
function registerRoutes(app: Express): void {
  // Admin-only sync management routes
  app.post('/api/github/configure', isAuthenticated, isAdmin, configureRepository);
  app.post('/api/github/import', isAuthenticated, isAdmin, importFromGitHub);
  app.post('/api/github/export', isAuthenticated, isAdmin, exportToGitHub);
  app.get('/api/github/sync-status', isAuthenticated, isAdmin, getSyncStatus);
  app.get('/api/github/sync-status/:id', isAuthenticated, isAdmin, getSyncItemStatus);
  app.get('/api/github/sync-history', isAuthenticated, isAdmin, getSyncHistory);
  app.post('/api/github/process-queue', isAuthenticated, isAdmin, processQueue);

  // Public discovery routes
  app.get('/api/github/awesome-lists', listAwesomeLists);
  app.get('/api/github/search', searchAwesomeRepositories);

  console.log('[GitHub Sync Module] Routes registered: 9 GitHub sync endpoints');
}

/**
 * GitHub Sync module export
 * Implements the Module interface for registration with the module system
 */
export const githubSyncModule: Module = {
  name: 'github-sync',
  description: 'GitHub repository synchronization and awesome list discovery',
  version: '1.0.0',
  registerRoutes,
};
