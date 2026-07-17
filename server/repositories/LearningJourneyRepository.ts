/**
 * ============================================================================
 * LEARNING JOURNEY REPOSITORY - Learning Journey Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for learning journey operations.
 * It encapsulates all database queries related to learning journeys, journey
 * steps, and user progress tracking.
 *
 * KEY OPERATIONS:
 * - Learning Journeys: CRUD operations for journeys
 * - Journey Steps: CRUD operations for journey steps
 * - User Progress: Track user progress through journeys
 *
 * DESIGN NOTES:
 * - Journeys contain multiple steps in a specific order
 * - Steps can be required or optional
 * - User progress tracks completed steps and journey completion
 * - Uses Drizzle ORM for type-safe database operations
 * ============================================================================
 */

import {
  learningJourneys,
  journeySteps,
  userJourneyProgress,
  resources,
  type LearningJourney,
  type InsertLearningJourney,
  type JourneyStep,
  type InsertJourneyStep,
  type UserJourneyProgress,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, asc, desc, inArray } from "drizzle-orm";

/**
 * Repository class for learning journey-related database operations
 */
export class LearningJourneyRepository {
  /**
   * List all published learning journeys
   * @param category - Optional category filter
   * @returns Array of learning journeys ordered by index
   */
  async listLearningJourneys(category?: string): Promise<LearningJourney[]> {
    const conditions = [eq(learningJourneys.status, 'published')];
    if (category) {
      conditions.push(eq(learningJourneys.category, category));
    }

    return await db
      .select()
      .from(learningJourneys)
      .where(and(...conditions))
      .orderBy(asc(learningJourneys.orderIndex));
  }

  /**
   * List all learning journeys regardless of status (admin use).
   * Orders by orderIndex then id so unset orderIndex values are stable.
   */
  async listAllLearningJourneys(): Promise<LearningJourney[]> {
    return await db
      .select()
      .from(learningJourneys)
      .orderBy(asc(learningJourneys.orderIndex), asc(learningJourneys.id));
  }

  /**
   * Reorder steps for a journey.
   * Accepts an array of step IDs in their new order and rewrites
   * the stepNumber on each one (1-based). Performs the update inside
   * a single transaction so partial reorders cannot leak.
   *
   * @param journeyId - Journey owning the steps
   * @param orderedStepIds - Step IDs in their new desired order
   * @returns The journey's steps after reordering
   */
  async reorderJourneySteps(
    journeyId: number,
    orderedStepIds: number[],
  ): Promise<JourneyStep[]> {
    if (orderedStepIds.length === 0) {
      return this.listJourneySteps(journeyId);
    }

    // Verify every id belongs to this journey before touching anything.
    const existing = await db
      .select()
      .from(journeySteps)
      .where(eq(journeySteps.journeyId, journeyId));
    const existingIds = new Set(existing.map((s) => s.id));
    for (const id of orderedStepIds) {
      if (!existingIds.has(id)) {
        throw new Error(`Step ${id} does not belong to journey ${journeyId}`);
      }
    }

    await db.transaction(async (tx) => {
      // Two-phase update to avoid temporary uniqueness collisions if a
      // future migration adds a unique constraint on (journeyId, stepNumber).
      for (let i = 0; i < orderedStepIds.length; i++) {
        await tx
          .update(journeySteps)
          .set({ stepNumber: -(i + 1) })
          .where(eq(journeySteps.id, orderedStepIds[i]));
      }
      for (let i = 0; i < orderedStepIds.length; i++) {
        await tx
          .update(journeySteps)
          .set({ stepNumber: i + 1 })
          .where(eq(journeySteps.id, orderedStepIds[i]));
      }
    });

    return this.listJourneySteps(journeyId);
  }

  /**
   * Run16 BUG-013: set explicit stepNumbers on a journey's rows.
   * The data model stores up to 3 rows per LOGICAL step (one per linked
   * resource), so multiple rows legitimately share a stepNumber. Row-based
   * renumbering (1..N per row) would explode 6 logical steps into 18 —
   * callers pass group-preserving assignments instead.
   * Two-phase transactional update, same collision-safety as reorder.
   *
   * @param journeyId - Journey owning the steps
   * @param assignments - Explicit { id, stepNumber } pairs (ids must belong to the journey)
   * @returns The journey's steps after renumbering
   */
  async setJourneyStepNumbers(
    journeyId: number,
    assignments: { id: number; stepNumber: number }[],
  ): Promise<JourneyStep[]> {
    if (assignments.length === 0) {
      return this.listJourneySteps(journeyId);
    }

    const existing = await db
      .select()
      .from(journeySteps)
      .where(eq(journeySteps.journeyId, journeyId));
    const existingIds = new Set(existing.map((s) => s.id));
    for (const { id } of assignments) {
      if (!existingIds.has(id)) {
        throw new Error(`Step ${id} does not belong to journey ${journeyId}`);
      }
    }

    await db.transaction(async (tx) => {
      for (const { id, stepNumber } of assignments) {
        await tx
          .update(journeySteps)
          .set({ stepNumber: -stepNumber })
          .where(eq(journeySteps.id, id));
      }
      for (const { id, stepNumber } of assignments) {
        await tx
          .update(journeySteps)
          .set({ stepNumber })
          .where(eq(journeySteps.id, id));
      }
    });

    return this.listJourneySteps(journeyId);
  }

  /**
   * Get a learning journey by its ID
   * @param id - Journey ID
   * @returns Journey object or undefined if not found
   */
  async getLearningJourney(id: number): Promise<LearningJourney | undefined> {
    const [journey] = await db.select().from(learningJourneys).where(eq(learningJourneys.id, id));
    return journey;
  }

  /**
   * Create a new learning journey
   * @param journey - Journey data to create
   * @returns The created journey
   */
  async createLearningJourney(journey: InsertLearningJourney): Promise<LearningJourney> {
    const [newJourney] = await db.insert(learningJourneys).values(journey).returning();
    return newJourney;
  }

  /**
   * Update an existing learning journey
   * @param id - Journey ID to update
   * @param journey - Partial journey data to update
   * @returns The updated journey
   */
  async updateLearningJourney(id: number, journey: Partial<InsertLearningJourney>): Promise<LearningJourney> {
    const [updatedJourney] = await db
      .update(learningJourneys)
      .set({ ...journey, updatedAt: new Date() })
      .where(eq(learningJourneys.id, id))
      .returning();
    return updatedJourney;
  }

  /**
   * Delete a learning journey
   * @param id - Journey ID to delete
   */
  async deleteLearningJourney(id: number): Promise<void> {
    await db.delete(learningJourneys).where(eq(learningJourneys.id, id));
  }

  /**
   * List all steps for a journey
   * @param journeyId - Journey ID
   * @returns Array of journey steps ordered by step number
   */
  async listJourneySteps(
    journeyId: number
  ): Promise<(JourneyStep & { resource?: { id: number; title: string; url: string; description: string | null } })[]> {
    // Hydrate each step with its linked resource so the journey detail UI can
    // render real, clickable resource links (the frontend reads step.resource).
    const rows = await db
      .select({
        step: journeySteps,
        resource: {
          id: resources.id,
          title: resources.title,
          url: resources.url,
          description: resources.description,
        },
      })
      .from(journeySteps)
      .leftJoin(resources, eq(journeySteps.resourceId, resources.id))
      .where(eq(journeySteps.journeyId, journeyId))
      .orderBy(asc(journeySteps.stepNumber));

    return rows.map((r) => ({
      ...r.step,
      resource: r.resource && r.resource.id != null ? r.resource : undefined,
    }));
  }

  /**
   * Create a new journey step
   * @param step - Step data to create
   * @returns The created step
   */
  async createJourneyStep(step: InsertJourneyStep): Promise<JourneyStep> {
    const [newStep] = await db.insert(journeySteps).values(step).returning();
    return newStep;
  }

  /**
   * Update an existing journey step
   * @param id - Step ID to update
   * @param step - Partial step data to update
   * @returns The updated step
   */
  async updateJourneyStep(id: number, step: Partial<InsertJourneyStep>): Promise<JourneyStep> {
    const [updatedStep] = await db
      .update(journeySteps)
      .set(step)
      .where(eq(journeySteps.id, id))
      .returning();
    return updatedStep;
  }

  /**
   * Delete a journey step
   * @param id - Step ID to delete
   */
  async deleteJourneyStep(id: number): Promise<void> {
    await db.delete(journeySteps).where(eq(journeySteps.id, id));
  }

  /**
   * Get steps for multiple journeys in a single batch query
   * Optimized for loading steps for many journeys at once
   * @param journeyIds - Array of journey IDs
   * @returns Map of journey ID to array of steps
   */
  async listJourneyStepsBatch(journeyIds: number[]): Promise<Map<number, JourneyStep[]>> {
    if (journeyIds.length === 0) {
      return new Map();
    }

    const steps = await db
      .select()
      .from(journeySteps)
      .where(inArray(journeySteps.journeyId, journeyIds))
      .orderBy(asc(journeySteps.stepNumber));

    // Group steps by journeyId
    const grouped = new Map<number, JourneyStep[]>();
    for (const step of steps) {
      if (!grouped.has(step.journeyId)) {
        grouped.set(step.journeyId, []);
      }
      grouped.get(step.journeyId)!.push(step);
    }

    return grouped;
  }

  /**
   * Start a user's journey
   * Creates or updates progress tracking for the user on a specific journey
   * @param userId - User ID
   * @param journeyId - Journey ID
   * @returns The created or updated progress record
   */
  async startUserJourney(userId: string, journeyId: number): Promise<UserJourneyProgress> {
    const [progress] = await db
      .insert(userJourneyProgress)
      .values({
        userId,
        journeyId,
        completedSteps: []
      })
      .onConflictDoUpdate({
        target: [userJourneyProgress.userId, userJourneyProgress.journeyId],
        set: { lastAccessedAt: new Date() }
      })
      .returning();

    return progress;
  }

  /**
   * Update user's journey progress
   * Marks a step as completed and checks if journey is finished
   * @param userId - User ID
   * @param journeyId - Journey ID
   * @param stepId - Step ID that was just completed
   * @returns The updated progress record
   */
  async updateUserJourneyProgress(userId: string, journeyId: number, stepId: number): Promise<UserJourneyProgress> {
    return this.updateUserJourneyProgressBatch(userId, journeyId, [stepId]);
  }

  /**
   * Batch-update user's journey progress in a single read+write (Run17 BUG-016:
   * a logical step maps to up to 3 rows sharing a stepNumber; completing it
   * previously issued one PUT per row — 3 round trips and 3 UPDATEs).
   * @param stepIds - All step row ids of the logical step being toggled
   * @param completed - Explicit target state; when omitted, each id is toggled
   *                    (back-compat with the single-step API contract).
   */
  async updateUserJourneyProgressBatch(
    userId: string,
    journeyId: number,
    stepIds: number[],
    completed?: boolean,
  ): Promise<UserJourneyProgress> {
    // First get current progress
    const [current] = await db
      .select()
      .from(userJourneyProgress)
      .where(
        and(
          eq(userJourneyProgress.userId, userId),
          eq(userJourneyProgress.journeyId, journeyId)
        )
      );

    // Toggle: adding a step marks it complete; sending the same step id again
    // removes it so users can un-complete a step and reduce their progress.
    // With an explicit `completed` flag the ids are unioned/removed instead,
    // which is idempotent even if rows drifted into a mixed state.
    const completedSet = new Set(current?.completedSteps ?? []);
    for (const stepId of stepIds) {
      if (completed === true) {
        completedSet.add(stepId);
      } else if (completed === false) {
        completedSet.delete(stepId);
      } else if (completedSet.has(stepId)) {
        completedSet.delete(stepId);
      } else {
        completedSet.add(stepId);
      }
    }
    const completedSteps = Array.from(completedSet);

    // Check if all steps are completed
    const allSteps = await this.listJourneySteps(journeyId);
    const allCompleted = allSteps.every(step =>
      step.isOptional || completedSet.has(step.id)
    );

    const [updated] = await db
      .update(userJourneyProgress)
      .set({
        currentStepId: stepIds[stepIds.length - 1],
        completedSteps,
        lastAccessedAt: new Date(),
        completedAt: allCompleted ? new Date() : null
      })
      .where(
        and(
          eq(userJourneyProgress.userId, userId),
          eq(userJourneyProgress.journeyId, journeyId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Get user's progress for a specific journey
   * @param userId - User ID
   * @param journeyId - Journey ID
   * @returns Progress record or undefined if not found
   */
  async getUserJourneyProgress(userId: string, journeyId: number): Promise<UserJourneyProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userJourneyProgress)
      .where(
        and(
          eq(userJourneyProgress.userId, userId),
          eq(userJourneyProgress.journeyId, journeyId)
        )
      );

    // Normalize completedSteps to numbers
    if (progress && progress.completedSteps) {
      progress.completedSteps = progress.completedSteps.map(id => Number(id));
    }

    return progress;
  }

  /**
   * List all journey progress for a user
   * @param userId - User ID
   * @returns Array of progress records ordered by last access
   */
  async listUserJourneyProgress(userId: string): Promise<UserJourneyProgress[]> {
    const progressList = await db
      .select()
      .from(userJourneyProgress)
      .where(eq(userJourneyProgress.userId, userId))
      .orderBy(desc(userJourneyProgress.lastAccessedAt));

    // Normalize completedSteps to numbers for each progress entry
    return progressList.map(progress => ({
      ...progress,
      completedSteps: progress.completedSteps ? progress.completedSteps.map(id => Number(id)) : []
    }));
  }
}
