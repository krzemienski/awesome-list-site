/**
 * ============================================================================
 * JOURNEY REPOSITORY - CRUD Operations for Learning Journeys
 * ============================================================================
 *
 * This repository provides type-safe CRUD operations for learning journeys.
 * Learning journeys are structured learning paths that guide users through
 * curated resources in a specific order.
 *
 * DESIGN PATTERN:
 * - Repository pattern with TypeScript for type safety
 * - Supports filtering by category and status
 * - Automatically updates the updatedAt timestamp on modifications
 * - Maintains ordering via orderIndex for consistent journey sequences
 *
 * KEY OPERATIONS:
 * - list(): Get journeys, optionally filtered by category
 * - getById(): Retrieve journey by ID
 * - getByCategory(): Get all journeys in a category
 * - getPublished(): Get only published journeys (filtered by status)
 * - create(): Create new journey
 * - update(): Update existing journey (auto-updates timestamp)
 * - delete(): Delete journey (cascades to journey steps)
 * - getStepCount(): Count steps in a journey
 *
 * USAGE:
 * ```typescript
 * const journeyRepo = new JourneyRepository(db);
 * const journey = await journeyRepo.create({
 *   title: "Learn TypeScript",
 *   description: "Master TypeScript fundamentals",
 *   category: "Programming",
 *   difficulty: "beginner",
 *   status: "published"
 * });
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, and, sql, asc } from "drizzle-orm";
import {
  learningJourneys,
  journeySteps,
  type LearningJourney,
  type InsertLearningJourney,
} from "@shared/schema";

/**
 * Repository for learning journey CRUD operations
 *
 * Provides type-safe database operations for learning journeys.
 * Handles category filtering, status management, and step associations.
 */
export class JourneyRepository {
  /**
   * Creates a new JourneyRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {}

  /**
   * List journeys, optionally filtered by category
   *
   * Returns journeys ordered by orderIndex (ascending).
   * Optionally filter by category to get journeys for a specific topic.
   *
   * @param category - Optional category name to filter by
   * @returns Array of learning journeys matching the filter
   *
   * @example
   * // List all journeys
   * const allJourneys = await journeyRepo.list();
   *
   * // List journeys in Programming category
   * const programmingJourneys = await journeyRepo.list("Programming");
   */
  async list(category?: string): Promise<LearningJourney[]> {
    let query = this.db.select().from(learningJourneys);

    if (category) {
      query = query.where(eq(learningJourneys.category, category)) as any;
    }

    return await query.orderBy(asc(learningJourneys.orderIndex));
  }

  /**
   * Get published journeys only
   *
   * Returns only journeys with status='published', optionally filtered by category.
   * This is useful for public-facing journey listings.
   *
   * @param category - Optional category name to filter by
   * @returns Array of published learning journeys
   *
   * @example
   * const publishedJourneys = await journeyRepo.getPublished("Programming");
   */
  async getPublished(category?: string): Promise<LearningJourney[]> {
    const conditions = [eq(learningJourneys.status, "published")];

    if (category) {
      conditions.push(eq(learningJourneys.category, category));
    }

    return await this.db
      .select()
      .from(learningJourneys)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(asc(learningJourneys.orderIndex));
  }

  /**
   * Get journey by ID
   *
   * Retrieves a single learning journey by its primary key.
   *
   * @param id - The primary key of the journey to retrieve
   * @returns The journey if found, undefined otherwise
   */
  async getById(id: number): Promise<LearningJourney | undefined> {
    const [journey] = await this.db
      .select()
      .from(learningJourneys)
      .where(eq(learningJourneys.id, id));
    return journey;
  }

  /**
   * Get journeys by category
   *
   * Retrieves all journeys for a specific category, regardless of status.
   *
   * @param category - The category name to filter by
   * @returns Array of journeys in the category
   */
  async getByCategory(category: string): Promise<LearningJourney[]> {
    return await this.db
      .select()
      .from(learningJourneys)
      .where(eq(learningJourneys.category, category))
      .orderBy(asc(learningJourneys.orderIndex));
  }

  /**
   * Create a new learning journey
   *
   * Creates a new journey with the provided data.
   * Timestamps (createdAt, updatedAt) are set automatically.
   *
   * @param data - The journey data to insert (title, description, category required)
   * @returns The newly created journey with all columns populated
   *
   * @example
   * const newJourney = await journeyRepo.create({
   *   title: "Learn TypeScript",
   *   description: "Master TypeScript from basics to advanced",
   *   category: "Programming",
   *   difficulty: "beginner",
   *   estimatedDuration: "20 hours",
   *   status: "published",
   *   orderIndex: 1
   * });
   */
  async create(data: InsertLearningJourney): Promise<LearningJourney> {
    const [newJourney] = await this.db
      .insert(learningJourneys)
      .values(data)
      .returning();

    return newJourney;
  }

  /**
   * Update a learning journey
   *
   * Updates one or more fields of an existing journey.
   * Automatically updates the updatedAt timestamp.
   * Only the fields provided in the data object will be modified.
   *
   * @param id - The primary key of the journey to update
   * @param data - Partial journey data containing only the fields to update
   * @returns The updated journey with all columns populated
   * @throws {Error} If the journey with the given ID does not exist
   *
   * @example
   * const updated = await journeyRepo.update(journeyId, {
   *   difficulty: "intermediate",
   *   estimatedDuration: "30 hours"
   * });
   */
  async update(
    id: number,
    data: Partial<InsertLearningJourney>
  ): Promise<LearningJourney> {
    const [updatedJourney] = await this.db
      .update(learningJourneys)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(learningJourneys.id, id))
      .returning();

    return updatedJourney;
  }

  /**
   * Delete a learning journey
   *
   * Deletes a journey from the database. This will cascade to journeySteps
   * due to the foreign key constraint with onDelete: "cascade".
   *
   * @param id - The primary key of the journey to delete
   * @throws {Error} If the journey with the given ID does not exist
   */
  async delete(id: number): Promise<void> {
    await this.db
      .delete(learningJourneys)
      .where(eq(learningJourneys.id, id));
  }

  /**
   * Get count of steps in a journey
   *
   * Counts how many steps are associated with this journey.
   *
   * @param journeyId - The journey ID to count steps for
   * @returns Number of steps in this journey
   *
   * @example
   * const stepCount = await journeyRepo.getStepCount(journeyId);
   */
  async getStepCount(journeyId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(journeySteps)
      .where(eq(journeySteps.journeyId, journeyId));

    return result?.count ?? 0;
  }
}
