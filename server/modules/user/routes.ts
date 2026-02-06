/**
 * ============================================================================
 * USER MODULE ROUTES - User Favorites, Bookmarks & Progress Endpoints
 * ============================================================================
 *
 * This module defines all user-related API endpoints including favorites,
 * bookmarks, learning progress, and submission tracking.
 *
 * ENDPOINTS:
 * - GET    /api/favorites              - Get user's favorite resources (auth required)
 * - POST   /api/favorites/:resourceId  - Add resource to favorites (auth required)
 * - DELETE /api/favorites/:resourceId  - Remove resource from favorites (auth required)
 * - GET    /api/bookmarks              - Get user's bookmarked resources (auth required)
 * - POST   /api/bookmarks/:resourceId  - Add resource to bookmarks (auth required)
 * - DELETE /api/bookmarks/:resourceId  - Remove resource from bookmarks (auth required)
 * - GET    /api/user/progress          - Get user's learning progress (auth required)
 * - GET    /api/user/submissions       - Get user's submitted resources and edits (auth required)
 *
 * AUTHENTICATION:
 * - All endpoints require authentication via isAuthenticated middleware
 * - User ID is extracted from session: req.user.claims.sub
 *
 * FAVORITES VS BOOKMARKS:
 * - Favorites: Quick way to mark resources you like
 * - Bookmarks: Saves resources with optional notes for later reference
 *
 * PROGRESS TRACKING:
 * - Tracks resources viewed and completed
 * - Calculates learning streaks from user activity
 * - Shows current learning path and statistics
 *
 * SUBMISSIONS:
 * - Lists resources submitted by the user
 * - Shows edit suggestions made by the user
 * - Includes status for each submission (pending/approved/rejected)
 *
 * ERROR HANDLING:
 * - 400 Bad Request: Invalid resource ID
 * - 401 Unauthorized: Not authenticated
 * - 500 Internal Server Error: Server-side errors
 *
 * See /docs/API.md for complete endpoint documentation.
 * ============================================================================
 */

import type { Express, Response } from 'express';
import type { AuthenticatedRequest, Module } from '../types';
import { storage } from '../../storage';
import { isAuthenticated, sendError, sendSuccess } from '../middleware';

/**
 * GET /api/favorites - Get user's favorite resources
 *
 * Returns all resources the user has marked as favorites.
 * Requires authentication.
 *
 * @returns 200 - Array of favorite resources
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function getUserFavorites(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const favorites = await storage.getUserFavorites(userId);
    res.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch favorites', error);
  }
}

/**
 * POST /api/favorites/:resourceId - Add resource to favorites
 *
 * Adds a resource to the user's favorites list.
 * Requires authentication.
 *
 * @param resourceId - Resource ID (path parameter)
 * @returns 200 - Success message
 * @returns 400 - Invalid resource ID
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function addFavorite(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const resourceId = parseInt(req.params.resourceId);

    if (isNaN(resourceId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid resource ID');
    }

    await storage.addFavorite(userId, resourceId);
    return sendSuccess(res, {}, 'Favorite added successfully');
  } catch (error) {
    console.error('Error adding favorite:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to add favorite', error);
  }
}

/**
 * DELETE /api/favorites/:resourceId - Remove resource from favorites
 *
 * Removes a resource from the user's favorites list.
 * Requires authentication.
 *
 * @param resourceId - Resource ID (path parameter)
 * @returns 200 - Success message
 * @returns 400 - Invalid resource ID
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function removeFavorite(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const resourceId = parseInt(req.params.resourceId);

    if (isNaN(resourceId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid resource ID');
    }

    await storage.removeFavorite(userId, resourceId);
    return sendSuccess(res, {}, 'Favorite removed successfully');
  } catch (error) {
    console.error('Error removing favorite:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to remove favorite', error);
  }
}

/**
 * GET /api/bookmarks - Get user's bookmarked resources
 *
 * Returns all resources the user has bookmarked with optional notes.
 * Requires authentication.
 *
 * @returns 200 - Array of bookmarked resources
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function getUserBookmarks(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const bookmarks = await storage.getUserBookmarks(userId);
    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch bookmarks', error);
  }
}

/**
 * POST /api/bookmarks/:resourceId - Add resource to bookmarks
 *
 * Adds a resource to the user's bookmarks with optional notes.
 * Requires authentication.
 *
 * @param resourceId - Resource ID (path parameter)
 * @body notes - Optional notes about the bookmark
 * @returns 200 - Success message
 * @returns 400 - Invalid resource ID
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function addBookmark(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const resourceId = parseInt(req.params.resourceId);

    if (isNaN(resourceId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid resource ID');
    }

    const { notes } = req.body;

    await storage.addBookmark(userId, resourceId, notes);
    return sendSuccess(res, {}, 'Bookmark added successfully');
  } catch (error) {
    console.error('Error adding bookmark:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to add bookmark', error);
  }
}

/**
 * DELETE /api/bookmarks/:resourceId - Remove resource from bookmarks
 *
 * Removes a resource from the user's bookmarks.
 * Requires authentication.
 *
 * @param resourceId - Resource ID (path parameter)
 * @returns 200 - Success message
 * @returns 400 - Invalid resource ID
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function removeBookmark(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    const resourceId = parseInt(req.params.resourceId);

    if (isNaN(resourceId)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Invalid resource ID');
    }

    await storage.removeBookmark(userId, resourceId);
    return sendSuccess(res, {}, 'Bookmark removed successfully');
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to remove bookmark', error);
  }
}

/**
 * GET /api/user/progress - Get user's learning progress
 *
 * Returns comprehensive learning progress including:
 * - Total resources completed
 * - Current learning path
 * - Learning streak (consecutive days of activity)
 * - Progress statistics
 *
 * Requires authentication.
 *
 * @returns 200 - Progress object with statistics
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function getUserProgress(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Get total resources in catalog
    const totalResourcesResult = await storage.listResources({ status: 'approved', limit: 1 });
    const totalResources = totalResourcesResult.total;

    // Get user's journey progress to count completed resources
    const journeyProgress = await storage.listUserJourneyProgress(userId);
    const completedResources = journeyProgress.filter(p => p.completedAt !== null).length;

    // Get current learning path (most recently accessed journey)
    let currentPath: string | undefined;
    if (journeyProgress.length > 0) {
      const latestJourney = journeyProgress[0];
      const journey = await storage.getLearningJourney(latestJourney.journeyId);
      currentPath = journey?.title;
    }

    // Calculate streak days from favorites and bookmarks
    const favorites = await storage.getUserFavorites(userId);
    const bookmarks = await storage.getUserBookmarks(userId);

    // Combine all activity timestamps
    const activityTimestamps = [
      ...favorites.map(f => f.createdAt).filter(Boolean),
      ...bookmarks.map(b => b.createdAt).filter(Boolean),
      ...journeyProgress.map(p => p.startedAt).filter(Boolean),
    ].sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

    // Calculate streak
    let streakDays = 0;
    if (activityTimestamps.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let currentDate = today;
      const uniqueDates = new Set<string>();

      for (const timestamp of activityTimestamps) {
        if (!timestamp) continue;
        const activityDate = new Date(timestamp);
        activityDate.setHours(0, 0, 0, 0);
        uniqueDates.add(activityDate.toISOString().split('T')[0]);
      }

      const sortedDates = Array.from(uniqueDates).sort().reverse();

      for (const dateStr of sortedDates) {
        const activityDate = new Date(dateStr);
        const diffDays = Math.floor((currentDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === streakDays) {
          streakDays++;
        } else if (diffDays > streakDays) {
          break;
        }
      }
    }

    const progress = {
      completedResources,
      totalResources,
      currentPath,
      streakDays,
      favoriteCount: favorites.length,
      bookmarkCount: bookmarks.length,
      journeyCount: journeyProgress.length,
    };

    res.json(progress);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch user progress', error);
  }
}

/**
 * GET /api/user/submissions - Get user's submitted resources and edits
 *
 * Returns resources and edit suggestions submitted by the user.
 * Includes status for each submission (pending/approved/rejected).
 * Requires authentication.
 *
 * @returns 200 - Object with resources and edits arrays
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function getUserSubmissions(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Get user's submitted resources
    const submittedResources = await storage.listResources({
      userId,
      page: 1,
      limit: 100
    });

    // Get user's suggested edits
    const resourceEdits = await storage.getResourceEditsByUser(userId);

    res.json({
      resources: submittedResources.resources,
      edits: resourceEdits,
      totalResources: submittedResources.total,
      totalEdits: resourceEdits.length
    });
  } catch (error) {
    console.error('Error fetching user submissions:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch user submissions', error);
  }
}

/**
 * Register all user routes with the Express app
 *
 * Routes are registered in logical order:
 * 1. Favorites endpoints
 * 2. Bookmarks endpoints
 * 3. User progress and submissions
 *
 * All routes require authentication via isAuthenticated middleware.
 *
 * @param app - Express application instance
 */
function registerRoutes(app: Express): void {
  // Favorites routes
  app.get('/api/favorites', isAuthenticated, getUserFavorites);
  app.post('/api/favorites/:resourceId', isAuthenticated, addFavorite);
  app.delete('/api/favorites/:resourceId', isAuthenticated, removeFavorite);

  // Bookmarks routes
  app.get('/api/bookmarks', isAuthenticated, getUserBookmarks);
  app.post('/api/bookmarks/:resourceId', isAuthenticated, addBookmark);
  app.delete('/api/bookmarks/:resourceId', isAuthenticated, removeBookmark);

  // User progress and submissions
  app.get('/api/user/progress', isAuthenticated, getUserProgress);
  app.get('/api/user/submissions', isAuthenticated, getUserSubmissions);

  console.log('[User Module] Routes registered: 8 user endpoints (favorites, bookmarks, progress, submissions)');
}

/**
 * User module export
 * Implements the Module interface for registration with the module system
 */
export const userModule: Module = {
  name: 'user',
  description: 'User favorites, bookmarks, progress, and submissions',
  version: '1.0.0',
  registerRoutes,
};
