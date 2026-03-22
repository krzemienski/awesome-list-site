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
    let query = db.select().from(learningJourneys);

    if (category) {
      query = query.where(eq(learningJourneys.category, category)) as any;
    }

    return await query
      .where(eq(learningJourneys.status, 'published'))
      .orderBy(asc(learningJourneys.orderIndex));
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
  async listJourneySteps(journeyId: number): Promise<JourneyStep[]> {
    return await db
      .select()
      .from(journeySteps)
      .where(eq(journeySteps.journeyId, journeyId))
      .orderBy(asc(journeySteps.stepNumber));
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

    const completedSteps = current?.completedSteps || [];
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }

    // Check if all steps are completed
    const allSteps = await this.listJourneySteps(journeyId);
    const allCompleted = allSteps.every(step =>
      step.isOptional || completedSteps.includes(step.id)
    );

    const [updated] = await db
      .update(userJourneyProgress)
      .set({
        currentStepId: stepId,
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
