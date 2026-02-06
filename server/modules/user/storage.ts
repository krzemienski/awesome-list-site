/**
 * ============================================================================
 * USER MODULE STORAGE INTERFACE
 * ============================================================================
 *
 * This module defines the storage interface for user-related operations.
 * It provides a focused subset of the main IStorage interface specifically
 * for user favorites, bookmarks, preferences, and learning progress.
 *
 * DESIGN PATTERN:
 * - Interface-based: Defines all user-related operations for testability
 * - Delegation: Can be implemented by delegating to main storage instance
 * - Separation of Concerns: User module only depends on user operations
 *
 * KEY OPERATIONS:
 * - User Favorites: addFavorite, removeFavorite, getUserFavorites
 * - User Bookmarks: addBookmark, removeBookmark, getUserBookmarks
 * - User Journey Progress: start, update, get, and list journey progress
 * - User Preferences: getUserPreferences
 * - User Submissions: getResourceEditsByUser (for tracking user contributions)
 * - Learning Journeys: getLearningJourney (for progress display)
 * - Resources: listResources (for submission history)
 *
 * USAGE:
 * - Import this interface in user routes/handlers
 * - Pass main storage instance (which implements IStorage) to user module
 * - User module uses only the methods defined here
 *
 * See /docs/ARCHITECTURE.md for module architecture diagrams.
 * ============================================================================
 */

import {
  type Resource,
  type UserJourneyProgress,
  type UserPreferences,
  type ResourceEdit,
  type LearningJourney,
} from "@shared/schema";

/**
 * Options for listing resources
 * Used by getUserSubmissions to fetch user's submitted resources
 */
export interface ListResourceOptions {
  userId?: string;
  page?: number;
  limit?: number;
  status?: string;
  categoryId?: number;
  subcategoryId?: number;
  subSubcategoryId?: number;
  search?: string;
}

/**
 * Storage interface for user operations
 */
export interface IUserStorage {
  // User Favorites
  // ============================================================================

  /**
   * Add a resource to user's favorites
   *
   * Creates a favorite entry if it doesn't exist, no-op if already exists.
   *
   * @param userId - User ID from auth session
   * @param resourceId - Resource ID to favorite
   */
  addFavorite(userId: string, resourceId: number): Promise<void>;

  /**
   * Remove a resource from user's favorites
   *
   * Deletes the favorite entry if it exists, no-op if it doesn't.
   *
   * @param userId - User ID from auth session
   * @param resourceId - Resource ID to unfavorite
   */
  removeFavorite(userId: string, resourceId: number): Promise<void>;

  /**
   * Get all resources favorited by a user
   *
   * Returns resources with favoritedAt timestamp for display.
   * Ordered by most recently favorited first.
   *
   * @param userId - User ID from auth session
   * @returns Array of resources with favoritedAt timestamp
   */
  getUserFavorites(userId: string): Promise<Array<Resource & { favoritedAt: Date }>>;

  // User Bookmarks
  // ============================================================================

  /**
   * Add a resource to user's bookmarks with optional notes
   *
   * Creates or updates a bookmark. If bookmark exists, updates notes and timestamp.
   *
   * @param userId - User ID from auth session
   * @param resourceId - Resource ID to bookmark
   * @param notes - Optional notes about why this was bookmarked
   */
  addBookmark(userId: string, resourceId: number, notes?: string): Promise<void>;

  /**
   * Remove a resource from user's bookmarks
   *
   * Deletes the bookmark entry if it exists, no-op if it doesn't.
   *
   * @param userId - User ID from auth session
   * @param resourceId - Resource ID to remove bookmark from
   */
  removeBookmark(userId: string, resourceId: number): Promise<void>;

  /**
   * Get all resources bookmarked by a user
   *
   * Returns resources with optional notes and bookmarkedAt timestamp.
   * Ordered by most recently bookmarked first.
   *
   * @param userId - User ID from auth session
   * @returns Array of resources with notes and bookmarkedAt timestamp
   */
  getUserBookmarks(userId: string): Promise<Array<Resource & { notes?: string; bookmarkedAt: Date }>>;

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

  // User Preferences
  // ============================================================================

  /**
   * Get user's preferences
   *
   * Returns user preferences including theme, notifications, display settings.
   * Used for personalizing the user experience.
   *
   * @param userId - User ID from auth session
   * @returns User preferences object or undefined if not set
   */
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;

  // Resource Edits (User Submissions)
  // ============================================================================

  /**
   * Get all resource edit suggestions submitted by a user
   *
   * Returns edit suggestions with their status (pending/approved/rejected).
   * Used in getUserSubmissions endpoint to show contribution history.
   * Ordered by most recently created first.
   *
   * @param userId - User ID from auth session
   * @returns Array of resource edit records
   */
  getResourceEditsByUser(userId: string): Promise<ResourceEdit[]>;

  // Learning Journeys (for progress display)
  // ============================================================================

  /**
   * Get a learning journey by ID
   *
   * Returns journey details including title, description, category.
   * Used in getUserProgress to display current learning path name.
   *
   * @param id - Journey ID
   * @returns Learning journey record or undefined if not found
   */
  getLearningJourney(id: number): Promise<LearningJourney | undefined>;

  // Resources (for submission history)
  // ============================================================================

  /**
   * List resources with filtering and pagination
   *
   * Returns resources matching the provided filters.
   * Used in getUserSubmissions to fetch resources submitted by the user.
   *
   * @param options - Filtering and pagination options
   * @returns Object with resources array and total count
   */
  listResources(options: ListResourceOptions): Promise<{ resources: Resource[]; total: number }>;
}

/**
 * Export main storage instance typed as IUserStorage
 *
 * This allows the user module to use the main storage instance
 * while only depending on the IUserStorage interface.
 */
import { storage } from "../../storage";
export const userStorage: IUserStorage = storage;
