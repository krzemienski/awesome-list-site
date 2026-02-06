/**
 * ============================================================================
 * JOURNEYS ROUTES - Learning Journey Management
 * ============================================================================
 *
 * Endpoints for managing learning journeys and user progress.
 *
 * PUBLIC ROUTES:
 * - GET / - List all journeys (with optional category filter)
 * - GET /:id - Get journey details
 *
 * AUTHENTICATED ROUTES:
 * - POST /:id/start - Start a journey
 * - PUT /:id/progress - Update journey progress
 * - GET /:id/progress - Get user's progress for a journey
 * ============================================================================
 */

import { Router } from "express";
import type { Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

const router = Router();

// GET / - List all journeys
router.get('/', async (req: any, res: Response) => {
  try {
    const category = req.query.category as string;
    const journeys = await storage.listLearningJourneys(category);

    // Early return if no journeys
    if (journeys.length === 0) {
      return res.json([]);
    }

    // BATCH FETCH: Single query for all steps
    const journeyIds = journeys.map(j => j.id);
    const stepsMap = await storage.listJourneyStepsBatch(journeyIds);

    // If user is authenticated, batch fetch all progress
    if (req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      const allProgress = await storage.listUserJourneyProgress(userId);

      // Create progress map for O(1) lookup
      const progressMap = new Map();
      allProgress.forEach(p => {
        progressMap.set(p.journeyId, p);
      });

      // Enrich journeys with steps and progress
      const enrichedJourneys = journeys.map(journey => {
        const steps = stepsMap.get(journey.id) || [];
        const progress = progressMap.get(journey.id);

        // Count distinct stepNumbers instead of total database rows (defensive: handle both strings and numbers)
        const uniqueStepNumbers = new Set(
          steps
            .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
            .filter(n => !isNaN(n))
        );

        return {
          ...journey,
          stepCount: uniqueStepNumbers.size,
          completedStepCount: progress?.completedSteps?.length || 0,
          isEnrolled: !!progress
        };
      });

      res.json(enrichedJourneys);
    } else {
      // For unauthenticated users
      const enrichedJourneys = journeys.map(journey => {
        const steps = stepsMap.get(journey.id) || [];

        // Count distinct stepNumbers instead of total database rows (defensive: handle both strings and numbers)
        const uniqueStepNumbers = new Set(
          steps
            .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
            .filter(n => !isNaN(n))
        );

        return {
          ...journey,
          stepCount: uniqueStepNumbers.size,
          completedStepCount: 0,
          isEnrolled: false
        };
      });

      res.json(enrichedJourneys);
    }
  } catch (error) {
    console.error('Error fetching journeys:', error);
    res.status(500).json({ message: 'Failed to fetch journeys' });
  }
});

// GET /:id - Get journey details
router.get('/:id', async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const journey = await storage.getLearningJourney(id);

    if (!journey) {
      return res.status(404).json({ message: 'Journey not found' });
    }

    const steps = await storage.listJourneySteps(id);

    // Count distinct stepNumbers for accurate step count (defensive: handle both strings and numbers)
    const uniqueStepNumbers = new Set(
      steps
        .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
        .filter(n => !isNaN(n))
    );
    const stepCount = uniqueStepNumbers.size;

    // If user is authenticated, get their progress
    let progress = null;
    if (req.user?.claims?.sub) {
      progress = await storage.getUserJourneyProgress(req.user.claims.sub, id);
    }

    res.json({
      ...journey,
      stepCount,
      steps,
      progress: progress ? {
        completedSteps: progress.completedSteps || [],
        currentStepId: progress.currentStepId,
        completedAt: progress.completedAt
      } : null
    });
  } catch (error) {
    console.error('Error fetching journey:', error);
    res.status(500).json({ message: 'Failed to fetch journey' });
  }
});

// POST /:id/start - Start journey
router.post('/:id/start', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const journeyId = parseInt(req.params.id);

    const progress = await storage.startUserJourney(userId, journeyId);
    res.json(progress);
  } catch (error) {
    console.error('Error starting journey:', error);
    res.status(500).json({ message: 'Failed to start journey' });
  }
});

// PUT /:id/progress - Update progress
router.put('/:id/progress', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const journeyId = parseInt(req.params.id);
    const { stepId } = req.body;

    if (!stepId) {
      return res.status(400).json({ message: 'Step ID is required' });
    }

    const progress = await storage.updateUserJourneyProgress(userId, journeyId, stepId);
    res.json(progress);
  } catch (error) {
    console.error('Error updating journey progress:', error);
    res.status(500).json({ message: 'Failed to update journey progress' });
  }
});

// GET /:id/progress - Get user's progress
router.get('/:id/progress', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const journeyId = parseInt(req.params.id);

    const progress = await storage.getUserJourneyProgress(userId, journeyId);

    if (!progress) {
      return res.status(404).json({ message: 'Progress not found' });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error fetching journey progress:', error);
    res.status(500).json({ message: 'Failed to fetch journey progress' });
  }
});

export default router;
