/**
 * ----------------------------------------------------------------------------
 * DOMAIN ROUTER: Learning Journeys & AI Recommendations
 * ----------------------------------------------------------------------------
 *
 * Task #303 (safer modular API architecture): this module owns two adjacent
 * surfaces that previously lived inline in server/routes.ts:
 *
 *   1. Learning journey routes — public listing/detail/start/progress plus the
 *      admin journey & step CRUD (former lines ~3866-4365).
 *   2. AI recommendation, learning-path and interaction routes (former lines
 *      ~7459-8014).
 *
 * The two blocks are registered by separate exported registrars so the
 * composition root in server/routes.ts can mount each at exactly the point in
 * the middleware pipeline it occupied before, preserving Express declaration
 * order. Handler bodies, status codes, response shapes and middleware chains
 * are copied verbatim; every dependency (repositories, middleware, limiters,
 * engines, helpers) is injected through an explicit context object.
 * ----------------------------------------------------------------------------
 */
import type { Express } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { LearningJourneyRepository, ResourceRepository, CategoryRepository, UserFeatureRepository } from "../../repositories";
import {
  insertJourneyStepSchema,
  insertLearningJourneySchema,
} from "@shared/schema";
import { summarizeLogicalJourneySteps } from "@shared/journeyProgress";
import { PG_INT_MAX } from "../../validation/inputs";
import {
  parseIntInRange,
  journeyTitleSchema,
  journeyDescriptionSchema,
} from "@shared/validation";
import type { RecommendationEngine } from "../../ai/recommendationEngine";
import type { UserProfile as AIUserProfile } from "../../ai/recommendationEngine";
import type { LearningPathGenerator } from "../../ai/learningPathGenerator";
import {
  RECOMMENDATION_FEEDBACK_VALUES,
  type RecommendationFeedbackValue,
} from "@shared/recommendations";
import { DEFAULT_LEARNING_PREFERENCES } from "@shared/onboarding";

// ---------------------------------------------------------------------------
// Journeys registrar
// ---------------------------------------------------------------------------

export interface JourneyRoutesContext {
  isAuthenticated: any;
  isAdmin: any;
  learningJourneyRepo: LearningJourneyRepository;
  parseBoundedInt: (value: unknown) => number | null;
}

export function registerJourneyRoutes(
  app: Express,
  ctx: JourneyRoutesContext,
): void {
  const {
    isAuthenticated,
    isAdmin,
    learningJourneyRepo,
    parseBoundedInt,
  } = ctx;

  // journey_steps stores multiple rows per logical stepNumber. The imported
  // helper is shared with write-time completion and Journey Detail so grouped
  // progress cannot drift across surfaces.
  function countLogicalJourneySteps(
    steps: Array<{ id: number; stepNumber: number | string; isOptional?: boolean | null }>,
    completedRowIds: Set<number>,
  ): { totalSteps: number; completedSteps: number } {
    const { totalSteps, completedSteps } = summarizeLogicalJourneySteps(
      steps,
      completedRowIds,
    );
    return { totalSteps, completedSteps };
  }

  // --- Learning Journey Routes ---
  
  // GET /api/journeys - List all journeys
  app.get('/api/journeys', async (req: any, res) => {
    try {
      const category = req.query.category as string;
      const journeys = await learningJourneyRepo.listLearningJourneys(category);
      
      // Early return if no journeys
      if (journeys.length === 0) {
        return res.json([]);
      }
      
      // BATCH FETCH: Single query for all steps
      const journeyIds = journeys.map(j => j.id);
      const stepsMap = await learningJourneyRepo.listJourneyStepsBatch(journeyIds);
      
      // If user is authenticated, batch fetch all progress
      if (req.dbUser?.id) {
        const userId = req.dbUser.id;
        const allProgress = await learningJourneyRepo.listUserJourneyProgress(userId);
        
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
          
          // Run17 BUG-003: completedSteps stores step ROW ids while stepCount
          // counts logical steps (distinct stepNumbers). Counting raw rows mixed
          // units and produced >100% progress (e.g. 18 rows / 6 steps = 300%).
          // BUG-063 (run25): delegated to the shared countLogicalJourneySteps
          // helper so /api/user/progress derives time from the SAME accounting.
          const completedRowIds = new Set<number>(progress?.completedSteps ?? []);
          const { completedSteps: completedStepCount } = countLogicalJourneySteps(steps, completedRowIds);
          
          return {
            ...journey,
            stepCount: uniqueStepNumbers.size,
            completedStepCount,
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
  
  // GET /api/journeys/:id - Get journey details
  app.get('/api/journeys/:id', async (req: any, res) => {
    try {
      // BUG-004 (run8): non-numeric ids (e.g. /api/journeys/some-slug) previously
      // reached the DB with NaN and threw -> 500. Treat them as not found.
      // NB-008 (run23): same for all-digit ids past int4 range (overflow → 500).
      const id = parseBoundedInt(req.params.id);
      if (id === null) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      const journey = await learningJourneyRepo.getLearningJourney(id);
      
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      
      const steps = await learningJourneyRepo.listJourneySteps(id);
      
      // Count distinct stepNumbers for accurate step count (defensive: handle both strings and numbers)
      const uniqueStepNumbers = new Set(
        steps
          .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
          .filter(n => !isNaN(n))
      );
      const stepCount = uniqueStepNumbers.size;
      
      // If user is authenticated, get their progress
      let progress = null;
      if (req.dbUser?.id) {
        progress = await learningJourneyRepo.getUserJourneyProgress(req.dbUser.id, id);
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
  
  // POST /api/journeys/:id/start - Start journey
  app.post('/api/journeys/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const journeyId = parseInt(req.params.id);
      if (isNaN(journeyId)) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      
      const progress = await learningJourneyRepo.startUserJourney(userId, journeyId);
      res.json(progress);
    } catch (error) {
      console.error('Error starting journey:', error);
      res.status(500).json({ message: 'Failed to start journey' });
    }
  });
  
  // PUT /api/journeys/:id/progress - Update progress
  app.put('/api/journeys/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const journeyId = parseInt(req.params.id);
      if (isNaN(journeyId)) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      // Run17 BUG-016: accept either a single stepId (legacy) or a stepIds
      // array so a logical step (up to 3 rows per stepNumber) completes in ONE
      // request instead of one PUT per row. `completed` (optional boolean)
      // makes the write idempotent; omitted = per-id toggle (legacy contract).
      // Run22 BUG-032: a progress write against a journey that doesn't exist
      // must be a 404, not a 200 no-op (and not a 422 "foreign step" — that
      // status is reserved for real journeys receiving another journey's step
      // ids). Check existence BEFORE any validation that could write.
      const journeyExists = await learningJourneyRepo.getLearningJourney(journeyId);
      if (!journeyExists) {
        return res.status(404).json({ message: 'Journey not found' });
      }

      const { stepId, stepIds, completed } = req.body ?? {};
      const ids: number[] = Array.isArray(stepIds)
        ? stepIds.filter((n: unknown) => Number.isInteger(n))
        : Number.isInteger(stepId) ? [stepId] : [];

      if (ids.length === 0) {
        return res.status(400).json({ message: 'Step ID is required' });
      }
      if (typeof completed !== 'boolean' && typeof completed !== 'undefined') {
        return res.status(400).json({ message: 'completed must be a boolean' });
      }

      const progress = await learningJourneyRepo.updateUserJourneyProgressBatch(
        userId, journeyId, ids, completed,
      );
      // Run22 BUG-032 (same no-op class): the batch update only UPDATEs an
      // existing progress row — if the user never started this journey there
      // is no row, nothing was written, and `progress` is undefined. That must
      // not masquerade as a 200 success.
      if (!progress) {
        return res.status(409).json({ message: 'Journey not started — start the journey before updating progress' });
      }
      res.json(progress);
    } catch (error: any) {
      // Run22 BUG-006: step ids that belong to a different journey are a
      // client error, not a server fault — reject without storing anything.
      if (error?.code === 'FOREIGN_STEP') {
        return res.status(422).json({
          message: `Step ID(s) do not belong to this journey: ${(error.foreignStepIds ?? []).join(', ')}`,
        });
      }
      console.error('Error updating journey progress:', error);
      res.status(500).json({ message: 'Failed to update journey progress' });
    }
  });
  
  // GET /api/journeys/:id/progress - Get user's progress
  app.get('/api/journeys/:id/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.dbUser.id;
      const journeyId = parseInt(req.params.id);
      if (isNaN(journeyId)) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      
      const progress = await learningJourneyRepo.getUserJourneyProgress(userId, journeyId);
      
      if (!progress) {
        return res.status(404).json({ message: 'Progress not found' });
      }
      
      res.json(progress);
    } catch (error) {
      console.error('Error fetching journey progress:', error);
      res.status(500).json({ message: 'Failed to fetch journey progress' });
    }
  });

  // --- Admin Journey & Step Routes ---

  // GET /api/admin/journeys - List ALL journeys (including drafts/archived)
  app.get('/api/admin/journeys', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const journeys = await learningJourneyRepo.listAllLearningJourneys();
      const stepsMap = await learningJourneyRepo.listJourneyStepsBatch(
        journeys.map((j) => j.id),
      );
      const enriched = journeys.map((j) => ({
        ...j,
        steps: stepsMap.get(j.id) || [],
        // Run15 BUG-010: count DISTINCT stepNumbers (a logical step stores up
        // to 3 rows — one per resource), matching the public /api/journeys
        // computation so admin and public step counts agree.
        stepCount: new Set(
          (stepsMap.get(j.id) || [])
            .map(s => typeof s.stepNumber === 'number' ? s.stepNumber : parseInt(s.stepNumber, 10))
            .filter(n => !isNaN(n))
        ).size,
      }));
      res.json({ journeys: enriched });
    } catch (error) {
      console.error('Error fetching admin journeys:', error);
      res.status(500).json({ message: 'Failed to fetch journeys' });
    }
  });

  // PUT /api/admin/journeys/:id - Update journey metadata (title, description,
  // difficulty, duration, etc.). NEW-005: added so template-boilerplate journey
  // descriptions can be corrected via the admin API (including on production,
  // which has no direct DB access).
  app.put('/api/admin/journeys/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const journeyId = parseInt(req.params.id, 10);
      if (isNaN(journeyId)) {
        return res.status(400).json({ message: 'Invalid journey ID' });
      }
      const parsed = insertLearningJourneySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid journey update', errors: parsed.error.issues });
      }
      if (Object.keys(parsed.data).length === 0) {
        return res.status(400).json({ message: 'Empty update: provide at least one updatable field' });
      }
      const journey = await learningJourneyRepo.getLearningJourney(journeyId);
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      const updated = await learningJourneyRepo.updateLearningJourney(journeyId, parsed.data);
      res.json(updated);
    } catch (error) {
      console.error('Error updating journey:', error);
      res.status(500).json({ message: 'Failed to update journey' });
    }
  });

  // GET /api/admin/journeys/:id/steps - List steps for a journey
  app.get('/api/admin/journeys/:id/steps', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const journeyId = parseInt(req.params.id, 10);
      if (isNaN(journeyId)) {
        return res.status(400).json({ message: 'Invalid journey ID' });
      }
      const journey = await learningJourneyRepo.getLearningJourney(journeyId);
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }
      const steps = await learningJourneyRepo.listJourneySteps(journeyId);
      res.json({ steps });
    } catch (error) {
      console.error('Error listing journey steps:', error);
      res.status(500).json({ message: 'Failed to list journey steps' });
    }
  });

  // POST /api/admin/journeys/:id/steps - Create a step (appended to end)
  app.post('/api/admin/journeys/:id/steps', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const journeyId = parseInt(req.params.id, 10);
      if (isNaN(journeyId)) {
        return res.status(400).json({ message: 'Invalid journey ID' });
      }
      const journey = await learningJourneyRepo.getLearningJourney(journeyId);
      if (!journey) {
        return res.status(404).json({ message: 'Journey not found' });
      }

      // R5-002 (run24): step title/description use the shared journey content
      // rules — bare .min(1) accepted invisible-only titles and unbounded text.
      const stepSchema = insertJourneyStepSchema.omit({ journeyId: true, stepNumber: true }).extend({
        title: journeyTitleSchema,
        description: journeyDescriptionSchema.nullable().optional(),
        resourceId: z.number().int().positive().max(PG_INT_MAX).nullable().optional(),
        isOptional: z.boolean().optional(),
      });
      const parsed = stepSchema.parse(req.body);

      const existing = await learningJourneyRepo.listJourneySteps(journeyId);
      const nextNumber = existing.length === 0
        ? 1
        : Math.max(...existing.map((s) => s.stepNumber)) + 1;

      const step = await learningJourneyRepo.createJourneyStep({
        journeyId,
        stepNumber: nextNumber,
        title: parsed.title,
        description: parsed.description ?? null,
        resourceId: parsed.resourceId ?? null,
        isOptional: parsed.isOptional ?? false,
      });
      res.status(201).json(step);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid step data', errors: error.issues });
      }
      console.error('Error creating journey step:', error);
      res.status(500).json({ message: 'Failed to create journey step' });
    }
  });

  // PATCH /api/admin/journeys/:journeyId/steps/:stepId - Update a step
  app.patch(
    '/api/admin/journeys/:journeyId/steps/:stepId',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const journeyId = parseInt(req.params.journeyId, 10);
        const stepId = parseInt(req.params.stepId, 10);
        if (isNaN(journeyId) || isNaN(stepId)) {
          return res.status(400).json({ message: 'Invalid journey or step ID' });
        }

        const steps = await learningJourneyRepo.listJourneySteps(journeyId);
        const existing = steps.find((s) => s.id === stepId);
        if (!existing) {
          return res.status(404).json({ message: 'Step not found for this journey' });
        }

        // R5-002 (run24): same shared journey content rules as step creation.
        const updateSchema = z.object({
          title: journeyTitleSchema.optional(),
          description: journeyDescriptionSchema.nullable().optional(),
          resourceId: z.number().int().positive().max(PG_INT_MAX).nullable().optional(),
          isOptional: z.boolean().optional(),
        });
        const parsed = updateSchema.parse(req.body);

        const updated = await learningJourneyRepo.updateJourneyStep(stepId, parsed);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: 'Invalid step data', errors: error.issues });
        }
        console.error('Error updating journey step:', error);
        res.status(500).json({ message: 'Failed to update journey step' });
      }
    },
  );

  // DELETE /api/admin/journeys/:journeyId/steps/:stepId - Delete a step
  app.delete(
    '/api/admin/journeys/:journeyId/steps/:stepId',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const journeyId = parseInt(req.params.journeyId, 10);
        const stepId = parseInt(req.params.stepId, 10);
        if (isNaN(journeyId) || isNaN(stepId)) {
          return res.status(400).json({ message: 'Invalid journey or step ID' });
        }

        const steps = await learningJourneyRepo.listJourneySteps(journeyId);
        const existing = steps.find((s) => s.id === stepId);
        if (!existing) {
          return res.status(404).json({ message: 'Step not found for this journey' });
        }

        await learningJourneyRepo.deleteJourneyStep(stepId);

        // Run16 BUG-013: renumber remaining steps GROUP-aware. Rows sharing a
        // stepNumber are one logical step (multi-resource); the old row-based
        // renumber (1..N per row) exploded 6 logical steps into 18 after any
        // single delete. Groups keep their membership; group numbers become
        // contiguous 1..G.
        const remaining = steps.filter((s) => s.id !== stepId);
        if (remaining.length > 0) {
          const groupNumbers = [...new Set(remaining.map((s) => s.stepNumber))].sort(
            (a, b) => a - b,
          );
          const newNumberByOld = new Map(groupNumbers.map((n, i) => [n, i + 1]));
          await learningJourneyRepo.setJourneyStepNumbers(
            journeyId,
            remaining.map((s) => ({
              id: s.id,
              stepNumber: newNumberByOld.get(s.stepNumber)!,
            })),
          );
        }
        res.json({ success: true });
      } catch (error) {
        console.error('Error deleting journey step:', error);
        res.status(500).json({ message: 'Failed to delete journey step' });
      }
    },
  );

  // POST /api/admin/journeys/:id/steps/reorder - Reorder steps
  app.post(
    '/api/admin/journeys/:id/steps/reorder',
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const journeyId = parseInt(req.params.id, 10);
        if (isNaN(journeyId)) {
          return res.status(400).json({ message: 'Invalid journey ID' });
        }

        // Run16 BUG-013: accepts either flat `stepIds` (legacy — every row is
        // its own group) or `stepGroups` (rows sharing a logical step travel
        // together and keep a shared stepNumber).
        const bodySchema = z
          .object({
            stepIds: z.array(z.number().int().positive()).min(1).optional(),
            stepGroups: z
              .array(z.array(z.number().int().positive()).min(1))
              .min(1)
              .optional(),
          })
          .refine((b) => !!b.stepIds !== !!b.stepGroups, {
            message: 'Provide exactly one of stepIds or stepGroups',
          });
        const body = bodySchema.parse(req.body);
        const groups: number[][] =
          body.stepGroups ?? body.stepIds!.map((id) => [id]);
        const flatIds = groups.flat();

        const existing = await learningJourneyRepo.listJourneySteps(journeyId);
        if (existing.length !== flatIds.length) {
          return res
            .status(400)
            .json({ message: 'Reorder must include exactly every step of the journey' });
        }
        const existingSet = new Set(existing.map((s) => s.id));
        const reorderSet = new Set(flatIds);
        if (
          existingSet.size !== reorderSet.size ||
          [...existingSet].some((id) => !reorderSet.has(id))
        ) {
          return res.status(400).json({ message: 'Reorder must reference the journey\'s existing steps exactly once each' });
        }

        const steps = await learningJourneyRepo.setJourneyStepNumbers(
          journeyId,
          groups.flatMap((groupIds, i) =>
            groupIds.map((id) => ({ id, stepNumber: i + 1 })),
          ),
        );
        res.json({ steps });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: 'Invalid reorder payload', errors: error.issues });
        }
        console.error('Error reordering journey steps:', error);
        res.status(500).json({ message: 'Failed to reorder journey steps' });
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Recommendations / learning-paths / interactions registrar
// ---------------------------------------------------------------------------

export interface RecommendationRoutesContext {
  isAuthenticated: any;
  aiLimiter: RequestHandler;
  suggestedReadLimiter: RequestHandler;
  recommendationEngine: RecommendationEngine;
  learningPathGenerator: LearningPathGenerator;
  userFeatureRepo: UserFeatureRepository;
  resourceRepo: ResourceRepository;
  categoryRepo: CategoryRepository;
  stripInternalResourceFields: (resource: any) => any;
  parseBoundedInt: (value: unknown) => number | null;
}

export function registerRecommendationRoutes(
  app: Express,
  ctx: RecommendationRoutesContext,
): void {
  const {
    isAuthenticated,
    aiLimiter,
    suggestedReadLimiter,
    recommendationEngine,
    learningPathGenerator,
    userFeatureRepo,
    resourceRepo,
    categoryRepo,
    stripInternalResourceFields,
    parseBoundedInt,
  } = ctx;

  // --- AI Recommendation Routes ---

  // GET /api/recommendations/init - Initialize recommendation engine
  app.get("/api/recommendations/init", async (req, res) => {
    try {
      res.json({ status: 'ready', message: 'Recommendation engine initialized' });
    } catch (error) {
      console.error('Error initializing recommendations:', error);
      res.status(500).json({ message: 'Failed to initialize recommendations' });
    }
  });

  // NB-007/NB-015 (run23): recommendation responses embed full resource rows —
  // they must pass the same public serializer as every other resource surface.
  const stripRecommendationInternals = (items: any[]): any[] =>
    (items || []).map((r) =>
      r && typeof r === 'object' && r.resource
        ? { ...r, resource: stripInternalResourceFields(r.resource) }
        : r
    );

  // Learning-path payloads carry resources at the top level and inside
  // milestones — strip both.
  const stripPathInternals = (p: any): any => {
    if (!p || typeof p !== 'object') return p;
    const out: any = { ...p };
    if (Array.isArray(out.resources)) {
      out.resources = out.resources.map(stripInternalResourceFields);
    }
    if (Array.isArray(out.milestones)) {
      out.milestones = out.milestones.map((m: any) =>
        m && typeof m === 'object' && Array.isArray(m.resources)
          ? { ...m, resources: m.resources.map(stripInternalResourceFields) }
          : m
      );
    }
    return out;
  };

  // NB-007 (run23): limit must be validated — ?limit=500 returned 500 rows and
  // ?limit=-5 fell through to the entire corpus. 400 on invalid, cap at 50.
  const parseRecommendationLimit = (raw: unknown, fallback: number): number | null => {
    if (raw === undefined || raw === '') return fallback;
    const parsed = parseBoundedInt(raw);
    if (parsed === null) return null;
    return Math.min(parsed, 50);
  };

  // GET /api/recommendations - Get personalized recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const limit = parseRecommendationLimit(req.query.limit, 10);
      if (limit === null) {
        return res.status(400).json({ message: 'limit must be a positive integer (max 50)' });
      }
      
      // Create a user profile for anonymous users from query params
      const userProfile: AIUserProfile = {
        userId: 'anonymous',
        preferredCategories: (req.query.categories as string)?.split(',').filter(Boolean) || [],
        skillLevel: (req.query.skillLevel as string || 'intermediate') as 'beginner' | 'intermediate' | 'advanced',
        learningGoals: (req.query.goals as string)?.split(',').filter(Boolean) || [],
        preferredResourceTypes: (req.query.types as string)?.split(',').filter(Boolean) || [],
        timeCommitment: (req.query.timeCommitment as string || 'flexible') as 'daily' | 'weekly' | 'flexible',
        viewHistory: [],
        bookmarks: [],
        completedResources: [],
        completedJourneys: [],
        journeyProgress: [],
        ratings: {}
      };

      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit,
        false,
        false // learning paths aren't used by this endpoint — skip the blocking AI call
      );

      // NB-015 (run23): pass embedded resources through the public serializer.
      res.json(stripRecommendationInternals(result.recommendations || []));
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ message: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations - Get personalized recommendations for authenticated users
  app.post("/api/recommendations", isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const userId = req.dbUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (req.body?.userId !== undefined && req.body.userId !== userId) {
        return res.status(403).json({
          message: 'userId does not match the authenticated session',
        });
      }
      // NB-007 (run23): same limit validation as the GET.
      const limit = parseRecommendationLimit(req.query.limit, 10);
      if (limit === null) {
        return res.status(400).json({ message: 'limit must be a positive integer (max 50)' });
      }
      const forceRefresh = req.query.refresh === 'true';
      const saved = await userFeatureRepo.getUserPreferences(userId);
      const userProfile: AIUserProfile = {
        userId,
        preferredCategories:
          saved?.preferredCategories ??
          DEFAULT_LEARNING_PREFERENCES.preferredCategories,
        skillLevel:
          saved?.skillLevel ?? DEFAULT_LEARNING_PREFERENCES.skillLevel,
        learningGoals:
          saved?.learningGoals ?? DEFAULT_LEARNING_PREFERENCES.learningGoals,
        preferredResourceTypes:
          saved?.preferredResourceTypes ??
          DEFAULT_LEARNING_PREFERENCES.preferredResourceTypes,
        timeCommitment:
          saved?.timeCommitment ??
          DEFAULT_LEARNING_PREFERENCES.timeCommitment,
        // Activity is loaded by RecommendationEngine using the session-derived
        // identity. Client-supplied history is deliberately ignored.
        viewHistory: [],
        bookmarks: [],
        completedResources: [],
        completedJourneys: [],
        journeyProgress: [],
        ratings: {},
      };

      const result = await recommendationEngine.generateRecommendations(
        userProfile,
        limit,
        forceRefresh,
        false // learning paths aren't used by this endpoint — skip the blocking AI call
      );

      // NB-015 (run23): pass embedded resources through the public serializer.
      res.json(stripRecommendationInternals(result.recommendations || []));
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      res.status(500).json({ message: 'Failed to generate recommendations' });
    }
  });

  // POST /api/recommendations/feedback - Record user feedback on recommendations
  // NB-016 (run23): was an unauthenticated write with a spoofable body userId —
  // the sibling /api/interactions was hardened in Run22 but this was missed.
  // Require a session and derive the identity from it; body userId is ignored.
  app.post("/api/recommendations/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.dbUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { resourceId, feedback, rating } = req.body ?? {};

      // R5-019 (run24): a body userId that contradicts the session is an
      // explicit spoof attempt — refuse loudly instead of silently ignoring.
      if (req.body?.userId !== undefined && req.body.userId !== userId) {
        return res.status(403).json({ message: 'userId does not match the authenticated session' });
      }

      // R5-019: full contract — bounded existing resourceId (strings/1e20/
      // floats used to flow into PG), feedback enum, bounded integer rating.
      const rid = parseIntInRange(resourceId, { min: 1 });
      if (rid === null) {
        return res.status(400).json({ message: 'resourceId must be a positive integer' });
      }
      if (
        feedback !== 'clicked'
        && feedback !== 'dismissed'
        && feedback !== 'completed'
        && !RECOMMENDATION_FEEDBACK_VALUES.includes(feedback)
      ) {
        return res.status(400).json({
          message: "feedback must be a supported recommendation feedback value",
        });
      }
      if (rating !== undefined && rating !== null) {
        if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
          return res.status(400).json({ message: 'rating must be an integer between 1 and 5' });
        }
      }
      const target = await resourceRepo.getResource(rid);
      if (!target) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Record the feedback
      if (RECOMMENDATION_FEEDBACK_VALUES.includes(feedback)) {
        await recommendationEngine.setFeedbackState(userId, rid, feedback);
      } else {
        await recommendationEngine.recordFeedback(
          userId,
          rid,
          feedback,
          rating ?? undefined,
        );
      }

      res.json({ status: 'success', message: 'Feedback recorded' });
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
      res.status(500).json({ message: 'Failed to record feedback' });
    }
  });

  // One current-state read and mutation contract is shared by every signed-in
  // recommendation surface. Identity always comes from the session.
  app.get("/api/recommendations/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.dbUser?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const rows = await userFeatureRepo.getRecommendationFeedback(userId);
      const states = await Promise.all(rows.map(async (row) => {
        const resource = await resourceRepo.getResource(row.resourceId);
        return {
          resourceId: row.resourceId,
          feedback: row.feedback,
          updatedAt: row.updatedAt.toISOString(),
          resource: resource && resource.status === 'approved'
            ? stripInternalResourceFields(resource)
            : undefined,
        };
      }));
      res.json(states);
    } catch (error) {
      console.error('Error listing recommendation feedback:', error);
      res.status(500).json({ message: 'Failed to load recommendation feedback' });
    }
  });

  app.put("/api/recommendations/:resourceId/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.dbUser?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const resourceId = parseIntInRange(req.params.resourceId, { min: 1 });
      if (resourceId === null) {
        return res.status(400).json({ message: 'Invalid resource id' });
      }
      const feedback = req.body?.feedback;
      if (
        feedback !== null
        && !RECOMMENDATION_FEEDBACK_VALUES.includes(feedback)
      ) {
        return res.status(400).json({
          message: `feedback must be null or one of ${RECOMMENDATION_FEEDBACK_VALUES.join(', ')}`,
        });
      }
      const target = await resourceRepo.getResource(resourceId);
      if (!target || target.status !== 'approved') {
        return res.status(404).json({ message: 'Resource not found' });
      }
      await recommendationEngine.setFeedbackState(
        userId,
        resourceId,
        feedback as RecommendationFeedbackValue | null,
      );
      res.json({
        resourceId,
        feedback,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating recommendation feedback:', error);
      res.status(500).json({ message: 'Failed to update recommendation feedback' });
    }
  });

  // POST /api/recommendations/:resourceId/feedback - Record thumbs up/down feedback on a recommendation
  app.post("/api/recommendations/:resourceId/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.dbUser?.id;
      if (!userId) {
        // BUG-051 (run14): canonical 401 envelope.
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // R5-019/020 (run24): bound to int4 (parseInt accepted 1e20-style ids
      // that overflow inside PG) and require the resource to exist.
      const resourceId = parseIntInRange(req.params.resourceId, { min: 1 });
      if (resourceId === null) {
        return res.status(400).json({ message: 'Invalid resource id' });
      }

      const { feedback } = req.body ?? {};
      if (feedback !== 'helpful' && feedback !== 'not_helpful') {
        return res.status(400).json({ error: "feedback must be 'helpful' or 'not_helpful'" });
      }

      const target = await resourceRepo.getResource(resourceId);
      if (!target) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      await recommendationEngine.recordDetailedFeedback(
        userId,
        resourceId,
        feedback === 'not_helpful' ? 'irrelevant' : feedback,
      );

      res.json({ status: 'success', message: 'Feedback recorded' });
    } catch (error) {
      console.error('Error recording recommendation feedback:', error);
      res.status(500).json({ message: 'Failed to record feedback' });
    }
  });

  // GET /api/learning-paths/suggested - Get suggested learning paths
  // NB-002 (run23): every distinct sanitized param combo is a generation cache
  // key, and a miss runs ~15-45s of paid Claude calls. Anonymous requests are
  // therefore PINNED to the boot-warmed default profile — no unauthenticated
  // input can mint a new cache key or trigger generation. Signed-in users get
  // personalization (bounded params) behind the strict aiLimiter.
  // Task-178: split the limiter by auth — anonymous requests only ever read
  // the warmed cache, so they get the generous suggestedReadLimiter; signed-in
  // requests (which can trigger paid generation) stay behind the strict
  // aiLimiter.
  app.get("/api/learning-paths/suggested", (req: any, res, next) => {
    const isAuthed = Boolean(req.dbUser);
    return (isAuthed ? aiLimiter : suggestedReadLimiter)(req, res, next);
  }, async (req: any, res) => {
    try {
      const rawLimit = parseInt(req.query.limit as string);
      const requestedLimit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 5, 1), 10);

      const isAuthed = Boolean(req.dbUser);

      if (!isAuthed) {
        // Must mirror warmDefaultSuggestedPaths() exactly so this always hits
        // the warmed cache entry (key: default profile + limit 5).
        const anonProfile: AIUserProfile = {
          userId: 'anonymous',
          preferredCategories: [],
          skillLevel: 'intermediate',
          learningGoals: [],
          preferredResourceTypes: [],
          timeCommitment: 'flexible',
          viewHistory: [],
          bookmarks: [],
          completedResources: [],
          completedJourneys: [],
          journeyProgress: [],
          ratings: {}
        };
        const paths = await learningPathGenerator.getSuggestedPaths(anonProfile, 5);
        // NB-015 (run23): strip internal resource fields before sending.
        return res.json(paths.slice(0, requestedLimit).map(stripPathInternals));
      }

      const skillLevels = ['beginner', 'intermediate', 'advanced'];
      const skillLevel = (skillLevels.includes(req.query.skillLevel as string)
        ? req.query.skillLevel : 'intermediate') as 'beginner' | 'intermediate' | 'advanced';

      const timeCommitments = ['daily', 'weekly', 'flexible'];
      const timeCommitment = (timeCommitments.includes(req.query.timeCommitment as string)
        ? req.query.timeCommitment : 'flexible') as 'daily' | 'weekly' | 'flexible';

      // Only accept categories that actually exist in the taxonomy.
      const requestedCategories = ((req.query.categories as string)?.split(',') || [])
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 10);
      let preferredCategories: string[] = [];
      if (requestedCategories.length > 0) {
        const known = new Set((await categoryRepo.listCategories()).map((c) => c.name));
        preferredCategories = requestedCategories.filter((c) => known.has(c));
      }

      const learningGoals = ((req.query.goals as string)?.split(',') || [])
        .map((g) => g.trim())
        .filter(Boolean)
        .slice(0, 5)
        .map((g) => g.slice(0, 100));

      // Identity comes from the session, never from the query string.
      const userProfile: AIUserProfile = {
        userId: req.dbUser?.id || 'anonymous',
        preferredCategories,
        skillLevel,
        learningGoals,
        preferredResourceTypes: [],
        timeCommitment,
        viewHistory: [],
        bookmarks: [],
        completedResources: [],
        completedJourneys: [],
        journeyProgress: [],
        ratings: {}
      };

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, requestedLimit);

      // NB-015 (run23): strip internal resource fields before sending.
      res.json(paths.map(stripPathInternals));
    } catch (error) {
      console.error('Error generating suggested learning paths:', error);
      res.status(500).json({ message: 'Failed to generate suggested learning paths' });
    }
  });

  // NB-002 (run23): shared sanitizer for body-supplied profiles on the paid
  // generation POSTs — whitelists fields, clamps enums/arrays/lengths, and
  // forces the identity to the session user. Raw client bodies must never
  // reach the generator (unbounded prompt/cache-key material).
  const sanitizeBodyProfile = (body: any, sessionUserId: string): AIUserProfile => {
    const skillLevels = ['beginner', 'intermediate', 'advanced'];
    const timeCommitments = ['daily', 'weekly', 'flexible'];
    const strArr = (v: unknown, maxItems: number, maxLen: number): string[] =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === 'string')
            .map((x) => x.trim())
            .filter(Boolean)
            .slice(0, maxItems)
            .map((x) => x.slice(0, maxLen))
        : [];
    return {
      userId: sessionUserId,
      preferredCategories: strArr(body?.preferredCategories, 10, 100),
      skillLevel: (skillLevels.includes(body?.skillLevel) ? body.skillLevel : 'intermediate'),
      learningGoals: strArr(body?.learningGoals, 5, 100),
      preferredResourceTypes: strArr(body?.preferredResourceTypes, 10, 50),
      timeCommitment: (timeCommitments.includes(body?.timeCommitment) ? body.timeCommitment : 'flexible'),
      viewHistory: [],
      bookmarks: [],
      completedResources: [],
      completedJourneys: [],
      journeyProgress: [],
      ratings: {}
    } as AIUserProfile;
  };

  // POST /api/learning-paths/generate - Generate custom learning path
  // NB-002 (run23): was fully anonymous — any visitor could trigger a paid
  // ~25s Claude generation with arbitrary prompt material. Now requires a
  // signed-in session and rides the strict AI limiter.
  app.post("/api/learning-paths/generate", isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const { userProfile, category, customGoals } = req.body ?? {};

      if (!userProfile) {
        return res.status(400).json({ message: 'User profile is required' });
      }

      const sessionUserId = req.dbUser?.id;
      const safeProfile = sanitizeBodyProfile(userProfile, sessionUserId);
      const safeCategory = typeof category === 'string' ? category.trim().slice(0, 100) : undefined;
      const safeGoals = Array.isArray(customGoals)
        ? customGoals.filter((g): g is string => typeof g === 'string')
            .map((g) => g.trim()).filter(Boolean).slice(0, 5).map((g) => g.slice(0, 100))
        : undefined;

      const path = await learningPathGenerator.generateLearningPath(
        safeProfile,
        safeCategory,
        safeGoals
      );

      // NB-015 (run23): strip internal resource fields before sending.
      res.json(stripPathInternals(path));
    } catch (error) {
      console.error('Error generating custom learning path:', error);
      res.status(500).json({ message: 'Failed to generate custom learning path' });
    }
  });

  // POST /api/learning-paths - Legacy route for compatibility
  // NB-002 (run23): auth-gated + sanitized like /generate (was: raw body
  // straight into the generator with no auth and no limiter).
  app.post("/api/learning-paths", isAuthenticated, aiLimiter, async (req: any, res) => {
    try {
      const sessionUserId = req.dbUser?.id;
      const userProfile = sanitizeBodyProfile(req.body, sessionUserId);
      const rawLimit = parseInt(req.query.limit as string);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 5, 1), 10);

      const paths = await learningPathGenerator.getSuggestedPaths(userProfile, limit);

      // NB-015 (run23): strip internal resource fields before sending.
      res.json(paths.map(stripPathInternals));
    } catch (error) {
      console.error('Error generating AI learning paths:', error);
      res.status(500).json({ message: 'Failed to generate learning paths' });
    }
  });

  // Track user interaction for improving recommendations.
  // Run22 BUG-050: this write endpoint was fully anonymous — any client could
  // POST unlimited events with an arbitrary userId. Interactions only make
  // sense for signed-in users (both client call sites already gate on a
  // logged-in user), so require authentication and derive the identity from
  // the session — the spoofable body `userId` is ignored.
  app.post("/api/interactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.dbUser?.id;
      const { resourceId, interactionType } = req.body ?? {};
      const parsedResourceId =
        typeof resourceId === 'number'
          ? resourceId
          : typeof resourceId === 'string' && /^\d+$/.test(resourceId)
            ? Number(resourceId)
            : NaN;
      if (
        !Number.isInteger(parsedResourceId) ||
        parsedResourceId < 1 ||
        parsedResourceId > PG_INT_MAX
      ) {
        return res.status(400).json({ error: "A valid resourceId is required" });
      }
      const allowedTypes = new Set([
        'view',
        'click',
        'bookmark',
        'rate',
        'complete',
        'dismiss',
        'start_path',
      ]);
      if (
        typeof interactionType !== "string" ||
        !allowedTypes.has(interactionType)
      ) {
        return res.status(400).json({ error: "Unsupported interactionType" });
      }
      const resource = await resourceRepo.getResource(parsedResourceId);
      if (!resource || resource.status !== 'approved') {
        return res.status(404).json({ error: "Resource not found" });
      }

      const interaction = await userFeatureRepo.trackUserInteraction(
        userId,
        parsedResourceId,
        interactionType,
        typeof req.body?.interactionValue === 'number'
          ? req.body.interactionValue
          : null,
        req.body?.metadata &&
          typeof req.body.metadata === 'object' &&
          !Array.isArray(req.body.metadata)
          ? req.body.metadata
          : {},
      );

      res.status(201).json({
        status: "recorded",
        id: interaction.id,
        timestamp: interaction.timestamp,
      });
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ message: 'Failed to record interaction' });
    }
  });
}
