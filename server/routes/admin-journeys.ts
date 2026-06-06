// Admin Journey & Step Routes extracted from registerRoutes (behavior-preserving).
import type { Express } from "express";
import { isAuthenticated } from "../session";
import { insertJourneyStepSchema } from "@shared/schema";
import { z } from "zod";
import { isAdmin, learningJourneyRepo } from "./deps";

export function registerAdminJourneyRoutes(app: Express): void {
  // ============= Admin Journey & Step Routes =============

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
        stepCount: (stepsMap.get(j.id) || []).length,
      }));
      res.json({ journeys: enriched });
    } catch (error) {
      console.error('Error fetching admin journeys:', error);
      res.status(500).json({ message: 'Failed to fetch journeys' });
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

      const stepSchema = insertJourneyStepSchema.omit({ journeyId: true, stepNumber: true }).extend({
        title: z.string().min(1, 'Title is required'),
        description: z.string().nullable().optional(),
        resourceId: z.number().int().positive().nullable().optional(),
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
        return res.status(400).json({ message: 'Invalid step data', errors: error.errors });
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

        const updateSchema = z.object({
          title: z.string().min(1).optional(),
          description: z.string().nullable().optional(),
          resourceId: z.number().int().positive().nullable().optional(),
          isOptional: z.boolean().optional(),
        });
        const parsed = updateSchema.parse(req.body);

        const updated = await learningJourneyRepo.updateJourneyStep(stepId, parsed);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: 'Invalid step data', errors: error.errors });
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

        // Renumber remaining steps so order stays contiguous.
        const remaining = steps.filter((s) => s.id !== stepId);
        if (remaining.length > 0) {
          await learningJourneyRepo.reorderJourneySteps(
            journeyId,
            remaining.map((s) => s.id),
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

        const bodySchema = z.object({
          stepIds: z.array(z.number().int().positive()).min(1),
        });
        const { stepIds } = bodySchema.parse(req.body);

        const existing = await learningJourneyRepo.listJourneySteps(journeyId);
        if (existing.length !== stepIds.length) {
          return res
            .status(400)
            .json({ message: 'Reorder must include exactly every step of the journey' });
        }
        const existingSet = new Set(existing.map((s) => s.id));
        const reorderSet = new Set(stepIds);
        if (
          existingSet.size !== reorderSet.size ||
          [...existingSet].some((id) => !reorderSet.has(id))
        ) {
          return res.status(400).json({ message: 'Reorder must reference the journey\'s existing steps exactly once each' });
        }

        const steps = await learningJourneyRepo.reorderJourneySteps(journeyId, stepIds);
        res.json({ steps });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ message: 'Invalid reorder payload', errors: error.errors });
        }
        console.error('Error reordering journey steps:', error);
        res.status(500).json({ message: 'Failed to reorder journey steps' });
      }
    },
  );

}
