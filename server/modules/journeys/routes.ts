/**
 * ============================================================================
 * JOURNEYS MODULE ROUTES - Learning Journey Endpoints
 * ============================================================================
 *
 * This module defines all learning journey-related API endpoints including
 * journey listing, detail retrieval, and progress tracking.
 *
 * ENDPOINTS:
 * - GET  /api/journeys           - List all learning journeys
 * - GET  /api/journeys/:id       - Get journey details with steps
 * - POST /api/journeys/:id/start - Start a journey (authenticated)
 * - PUT  /api/journeys/:id/progress - Update journey progress (authenticated)
 * - GET  /api/journeys/:id/progress - Get user's journey progress (authenticated)
 *
 * AUTHENTICATION:
 * - Public routes: journeys listing, journey details
 * - Auth required: start journey, update progress, get progress
 *
 * FEATURES:
 * - Journey categorization and filtering
 * - Batch fetching for performance optimization
 * - Progress tracking with completion percentages
 * - User-specific journey states
 * - Step-by-step resource sequencing
 *
 * ERROR HANDLING:
 * - 400 Bad Request: Missing required parameters
 * - 401 Unauthorized: Not authenticated when required
 * - 404 Not Found: Journey or progress not found
 * - 500 Internal Server Error: Server-side errors
 *
 * See /docs/JOURNEYS.md for complete documentation.
 * ============================================================================
 */

import type { Express, Response } from 'express';
import type { AuthenticatedRequest, Module } from '../types';
import { storage } from '../../storage';
import { isAuthenticated, sendError, sendSuccess } from '../middleware';

/**
 * GET /api/journeys - List all learning journeys
 *
 * Returns a list of all available learning journeys, optionally filtered
 * by category. Includes journey metadata, step count, and user progress
 * if authenticated.
 *
 * @query category - Optional category filter
 * @returns 200 - Array of journeys with metadata
 * @returns 500 - Server error
 */
async function listJourneys(req: AuthenticatedRequest, res: Response) {
  try {
    const category = req.query.category as string;
    const journeys = await storage.listLearningJourneys(category);

    // Early return if no journeys
    if (journeys.length === 0) {
      return sendSuccess(res, []);
    }

    // BATCH FETCH: Single query for all steps
    const journeyIds = journeys.map(j => j.id);
    const stepsMap = await storage.listJourneyStepsBatch(journeyIds);

    // If user is authenticated, batch fetch all progress
    if (req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      const progressMap = await storage.getUserJourneysProgressBatch(userId, journeyIds);

      // Enrich journeys with steps and progress
      const enrichedJourneys = journeys.map(journey => {
        const steps = stepsMap.get(journey.id) || [];
        const progress = progressMap.get(journey.id);

        // Count distinct stepNumbers for accurate step count
        const uniqueStepNumbers = new Set(
          steps
            .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
            .filter(n => !isNaN(n))
        );
        const stepCount = uniqueStepNumbers.size;

        return {
          ...journey,
          stepCount,
          userProgress: progress ? {
            status: progress.status,
            completedSteps: progress.completedSteps,
            completionPercentage: stepCount > 0 ? Math.round((progress.completedSteps / stepCount) * 100) : 0,
            lastAccessedAt: progress.lastAccessedAt
          } : null
        };
      });

      return sendSuccess(res, enrichedJourneys);
    }

    // Unauthenticated users get journeys with step counts only
    const enrichedJourneys = journeys.map(journey => {
      const steps = stepsMap.get(journey.id) || [];

      // Count distinct stepNumbers for accurate step count
      const uniqueStepNumbers = new Set(
        steps
          .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
          .filter(n => !isNaN(n))
      );
      const stepCount = uniqueStepNumbers.size;

      return {
        ...journey,
        stepCount,
        userProgress: null
      };
    });

    return sendSuccess(res, enrichedJourneys);
  } catch (error) {
    console.error('[GET /api/journeys] Error fetching journeys:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch journeys');
  }
}

/**
 * GET /api/journeys/:id - Get journey details
 *
 * Returns detailed information about a specific learning journey including
 * all steps, resources, and user progress if authenticated.
 *
 * @param id - Journey ID
 * @returns 200 - Journey details with steps
 * @returns 404 - Journey not found
 * @returns 500 - Server error
 */
async function getJourneyDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const journey = await storage.getLearningJourney(id);

    if (!journey) {
      return sendError(res, 404, 'NOT_FOUND', 'Journey not found');
    }

    const steps = await storage.listJourneySteps(id);

    // Count distinct stepNumbers for accurate step count
    const uniqueStepNumbers = new Set(
      steps
        .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
        .filter(n => !isNaN(n))
    );
    const stepCount = uniqueStepNumbers.size;

    // If user is authenticated, include their progress
    let userProgress = null;
    if (req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserJourneyProgress(userId, id);

      if (progress) {
        userProgress = {
          status: progress.status,
          completedSteps: progress.completedSteps,
          completionPercentage: stepCount > 0 ? Math.round((progress.completedSteps / stepCount) * 100) : 0,
          lastAccessedAt: progress.lastAccessedAt
        };
      }
    }

    return sendSuccess(res, {
      ...journey,
      steps,
      stepCount,
      userProgress
    });
  } catch (error) {
    console.error('[GET /api/journeys/:id] Error fetching journey:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch journey');
  }
}

/**
 * POST /api/journeys/:id/start - Start a learning journey
 *
 * Creates a new progress record for the user to track their journey.
 * Requires authentication.
 *
 * @param id - Journey ID
 * @returns 200 - Progress record created
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function startJourney(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.claims!.sub;
    const journeyId = parseInt(req.params.id);

    const progress = await storage.startUserJourney(userId, journeyId);
    return sendSuccess(res, progress, 'Journey started successfully');
  } catch (error) {
    console.error('[POST /api/journeys/:id/start] Error starting journey:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to start journey');
  }
}

/**
 * PUT /api/journeys/:id/progress - Update journey progress
 *
 * Updates the user's progress for a specific journey by marking a step
 * as completed. Requires authentication.
 *
 * @param id - Journey ID
 * @body stepId - Step ID to mark as completed
 * @returns 200 - Progress updated
 * @returns 400 - Missing stepId
 * @returns 401 - Not authenticated
 * @returns 500 - Server error
 */
async function updateJourneyProgress(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.claims!.sub;
    const journeyId = parseInt(req.params.id);
    const { stepId } = req.body;

    if (!stepId) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Step ID is required');
    }

    const progress = await storage.updateUserJourneyProgress(userId, journeyId, stepId);
    return sendSuccess(res, progress, 'Progress updated successfully');
  } catch (error) {
    console.error('[PUT /api/journeys/:id/progress] Error updating journey progress:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to update journey progress');
  }
}

/**
 * GET /api/journeys/:id/progress - Get user's journey progress
 *
 * Returns the user's progress for a specific journey including completed
 * steps and completion percentage. Requires authentication.
 *
 * @param id - Journey ID
 * @returns 200 - Progress data
 * @returns 401 - Not authenticated
 * @returns 404 - Progress not found
 * @returns 500 - Server error
 */
async function getJourneyProgress(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user!.claims!.sub;
    const journeyId = parseInt(req.params.id);

    const progress = await storage.getUserJourneyProgress(userId, journeyId);

    if (!progress) {
      return sendError(res, 404, 'NOT_FOUND', 'Progress not found');
    }

    return sendSuccess(res, progress);
  } catch (error) {
    console.error('[GET /api/journeys/:id/progress] Error fetching journey progress:', error);
    return sendError(res, 500, 'SERVER_ERROR', 'Failed to fetch journey progress');
  }
}

/**
 * Register all journeys routes with the Express app
 *
 * @param app - Express application instance
 */
function registerRoutes(app: Express): void {
  // GET /api/journeys - List all journeys
  app.get('/api/journeys', listJourneys);

  // GET /api/journeys/:id - Get journey details
  app.get('/api/journeys/:id', getJourneyDetails);

  // POST /api/journeys/:id/start - Start journey (authenticated)
  app.post('/api/journeys/:id/start', isAuthenticated, startJourney);

  // PUT /api/journeys/:id/progress - Update progress (authenticated)
  app.put('/api/journeys/:id/progress', isAuthenticated, updateJourneyProgress);

  // GET /api/journeys/:id/progress - Get user's progress (authenticated)
  app.get('/api/journeys/:id/progress', isAuthenticated, getJourneyProgress);

  console.log('[Journeys Module] Routes registered: GET /api/journeys, GET /api/journeys/:id, POST /api/journeys/:id/start, PUT /api/journeys/:id/progress, GET /api/journeys/:id/progress');
}

/**
 * Journeys module export
 * Implements the Module interface for registration with the module system
 */
export const journeysModule: Module = {
  name: 'journeys',
  description: 'Learning journey tracking and progress management',
  version: '1.0.0',
  registerRoutes,
};
