/**
 * ============================================================================
 * JOURNEYS MODULE STORAGE INTERFACE
 * ============================================================================
 *
 * This module defines the storage interface for learning journey operations.
 * It provides a focused subset of the main IStorage interface specifically
 * for learning journeys, journey steps, and user progress tracking.
 *
 * DESIGN PATTERN:
 * - Interface-based: Defines all journey-related operations for testability
 * - Delegation: Can be implemented by delegating to main storage instance
 * - Separation of Concerns: Journeys module only depends on journey operations
 *
 * KEY OPERATIONS:
 * - Learning Journeys: list, get, create, update, delete journeys
 * - Journey Steps: list, batch fetch, create, update, delete steps
 * - User Progress: start, update, get, list user journey progress
 * - Batch Operations: Optimized fetching for multiple journeys/steps
 *
 * USAGE:
 * - Import this interface in journey routes/handlers
 * - Pass main storage instance (which implements IStorage) to journeys module
 * - Journeys module uses only the methods defined here
 *
 * See /docs/ARCHITECTURE.md for module architecture diagrams.
 * ============================================================================
 */

import {
  type LearningJourney,
  type InsertLearningJourney,
  type JourneyStep,
  type InsertJourneyStep,
  type UserJourneyProgress,
} from "@shared/schema";

/**
 * Storage interface for learning journey operations
 */
export interface IJourneysStorage {
  // Learning Journeys
  // ============================================================================

  /**
   * List all learning journeys, optionally filtered by category
   *
   * Returns journeys matching the provided category filter.
   * If no category is provided, returns all journeys.
   * Ordered by creation date descending.
   *
   * @param category - Optional category filter
   * @returns Array of learning journey records
   */
  listLearningJourneys(category?: string): Promise<LearningJourney[]>;

  /**
   * Get a learning journey by ID
   *
   * Returns journey details including title, description, category.
   * Used for displaying journey details and metadata.
   *
   * @param id - Journey ID
   * @returns Learning journey record or undefined if not found
   */
  getLearningJourney(id: number): Promise<LearningJourney | undefined>;

  /**
   * Create a new learning journey
   *
   * Creates a journey with title, description, category, difficulty level.
   * Admin operation for creating curated learning paths.
   *
   * @param journey - Journey data to insert
   * @returns Created learning journey record
   */
  createLearningJourney(journey: InsertLearningJourney): Promise<LearningJourney>;

  /**
   * Update an existing learning journey
   *
   * Updates journey metadata like title, description, category.
   * Admin operation for maintaining curated learning paths.
   *
   * @param id - Journey ID to update
   * @param journey - Partial journey data to update
   * @returns Updated learning journey record
   */
  updateLearningJourney(id: number, journey: Partial<InsertLearningJourney>): Promise<LearningJourney>;

  /**
   * Delete a learning journey
   *
   * Deletes the journey and all associated steps.
   * Admin operation - use with caution.
   *
   * @param id - Journey ID to delete
   */
  deleteLearningJourney(id: number): Promise<void>;

  // Journey Steps
  // ============================================================================

  /**
   * List all steps for a specific learning journey
   *
   * Returns steps in sequential order (by stepNumber).
   * Each step includes resource references and completion requirements.
   *
   * @param journeyId - Journey ID to get steps for
   * @returns Array of journey step records
   */
  listJourneySteps(journeyId: number): Promise<JourneyStep[]>;

  /**
   * Batch fetch steps for multiple journeys
   *
   * PERFORMANCE OPTIMIZATION: Single query to fetch steps for many journeys.
   * Used in journey list endpoints to avoid N+1 queries.
   *
   * @param journeyIds - Array of journey IDs to fetch steps for
   * @returns Map of journeyId -> steps array
   */
  listJourneyStepsBatch(journeyIds: number[]): Promise<Map<number, JourneyStep[]>>;

  /**
   * Create a new journey step
   *
   * Adds a step to a learning journey with title, description, resources.
   * Admin operation for building curated learning sequences.
   *
   * @param step - Step data to insert
   * @returns Created journey step record
   */
  createJourneyStep(step: InsertJourneyStep): Promise<JourneyStep>;

  /**
   * Update an existing journey step
   *
   * Updates step metadata like title, description, resources.
   * Admin operation for maintaining learning sequences.
   *
   * @param id - Step ID to update
   * @param step - Partial step data to update
   * @returns Updated journey step record
   */
  updateJourneyStep(id: number, step: Partial<InsertJourneyStep>): Promise<JourneyStep>;

  /**
   * Delete a journey step
   *
   * Removes the step from the journey.
   * Admin operation - use with caution.
   *
   * @param id - Step ID to delete
   */
  deleteJourneyStep(id: number): Promise<void>;

  // User Journey Progress
  // ============================================================================

  /**
   * Start a learning journey for a user
   *
   * Creates a new journey progress entry with startedAt timestamp.
   * If user already started this journey, returns existing progress.
   *
   * @param userId - User ID from auth session
   * @param journeyId - Learning journey ID to start
   * @returns User journey progress record
   */
  startUserJourney(userId: string, journeyId: number): Promise<UserJourneyProgress>;

  /**
   * Update user's progress on a learning journey
   *
   * Updates the current step and optionally marks journey as completed.
   * Tracks which step the user is currently on.
   *
   * @param userId - User ID from auth session
   * @param journeyId - Learning journey ID
   * @param stepId - Current/completed step ID
   * @returns Updated user journey progress record
   */
  updateUserJourneyProgress(userId: string, journeyId: number, stepId: number): Promise<UserJourneyProgress>;

  /**
   * Get user's progress for a specific learning journey
   *
   * Returns progress record with current step and completion status.
   * Used to resume learning where user left off.
   *
   * @param userId - User ID from auth session
   * @param journeyId - Learning journey ID
   * @returns User journey progress record or undefined if not started
   */
  getUserJourneyProgress(userId: string, journeyId: number): Promise<UserJourneyProgress | undefined>;

  /**
   * List all learning journeys started by a user
   *
   * Returns all journey progress records for the user.
   * Ordered by most recently accessed first.
   * Used for dashboard display and progress tracking.
   *
   * @param userId - User ID from auth session
   * @returns Array of user journey progress records
   */
  listUserJourneyProgress(userId: string): Promise<UserJourneyProgress[]>;

  /**
   * Batch fetch progress for multiple journeys
   *
   * PERFORMANCE OPTIMIZATION: Single query to fetch progress for many journeys.
   * Used in journey list endpoints to avoid N+1 queries when showing user progress.
   *
   * @param userId - User ID from auth session
   * @param journeyIds - Array of journey IDs to fetch progress for
   * @returns Map of journeyId -> progress record
   */
  getUserJourneysProgressBatch?(userId: string, journeyIds: number[]): Promise<Map<number, UserJourneyProgress>>;
}

/**
 * Export main storage instance typed as IJourneysStorage
 *
 * This allows the journeys module to use the main storage instance
 * while only depending on the IJourneysStorage interface.
 */
import { storage } from "../../storage";
export const journeysStorage: IJourneysStorage = storage;
