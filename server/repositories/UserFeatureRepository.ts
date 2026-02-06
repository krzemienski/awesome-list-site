/**
 * ============================================================================
 * USER FEATURE REPOSITORY - User Feature Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for user-specific features.
 * It encapsulates all database queries related to user favorites, bookmarks,
 * journey progress tracking, and user preferences.
 *
 * KEY OPERATIONS:
 * - Favorites: Add, remove, and list user favorite resources
 * - Bookmarks: Add, remove, and list user bookmarked resources (with notes)
 * - Journey Progress: Track user progress through learning journeys
 * - User Preferences: Retrieve user preferences
 *
 * DESIGN NOTES:
 * - All operations are scoped to a specific user ID
 * - Favorites and bookmarks support duplicate-free insertion (onConflict)
 * - Journey progress tracks completed steps and completion status
 * - Uses Drizzle ORM for type-safe database operations
 * ============================================================================
 */

import {
  resources,
  userFavorites,
  userBookmarks,
  userJourneyProgress,
  userPreferences,
  type Resource,
  type UserJourneyProgress,
  type InsertUserJourneyProgress,
  type UserPreferences,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Repository class for user feature-related database operations
 */
export class UserFeatureRepository {
  /**
   * Add a resource to user's favorites
   * @param userId - User ID
   * @param resourceId - Resource ID to favorite
   */
  async addFavorite(userId: string, resourceId: number): Promise<void> {
    await db
      .insert(userFavorites)
      .values({ userId, resourceId })
      .onConflictDoNothing();
  }

  /**
   * Remove a resource from user's favorites
   * @param userId - User ID
   * @param resourceId - Resource ID to unfavorite
   */
  async removeFavorite(userId: string, resourceId: number): Promise<void> {
    await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.resourceId, resourceId)
        )
      );
  }

  /**
   * Get all favorite resources for a user
   * @param userId - User ID
   * @returns Array of resources with favorited timestamp
   */
  async getUserFavorites(userId: string): Promise<Array<Resource & { favoritedAt: Date }>> {
    const result = await db
      .select({
        resource: resources,
        favoritedAt: userFavorites.createdAt
      })
      .from(userFavorites)
      .innerJoin(resources, eq(userFavorites.resourceId, resources.id))
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.createdAt));

    return result.map(r => ({
      ...r.resource,
      favoritedAt: r.favoritedAt!
    }));
  }

  /**
   * Add a resource to user's bookmarks (or update existing bookmark)
   * @param userId - User ID
   * @param resourceId - Resource ID to bookmark
   * @param notes - Optional notes about the bookmark
   */
  async addBookmark(userId: string, resourceId: number, notes?: string): Promise<void> {
    await db
      .insert(userBookmarks)
      .values({ userId, resourceId, notes })
      .onConflictDoUpdate({
        target: [userBookmarks.userId, userBookmarks.resourceId],
        set: { notes, createdAt: new Date() }
      });
  }

  /**
   * Remove a resource from user's bookmarks
   * @param userId - User ID
   * @param resourceId - Resource ID to unbookmark
   */
  async removeBookmark(userId: string, resourceId: number): Promise<void> {
    await db
      .delete(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId)
        )
      );
  }

  /**
   * Get all bookmarked resources for a user
   * @param userId - User ID
   * @returns Array of resources with notes and bookmarked timestamp
   */
  async getUserBookmarks(userId: string): Promise<Array<Resource & { notes?: string; bookmarkedAt: Date }>> {
    const result = await db
      .select({
        resource: resources,
        notes: userBookmarks.notes,
        bookmarkedAt: userBookmarks.createdAt
      })
      .from(userBookmarks)
      .innerJoin(resources, eq(userBookmarks.resourceId, resources.id))
      .where(eq(userBookmarks.userId, userId))
      .orderBy(desc(userBookmarks.createdAt));

    return result.map(r => ({
      ...r.resource,
      notes: r.notes || undefined,
      bookmarkedAt: r.bookmarkedAt!
    }));
  }

  /**
   * Start a learning journey for a user (or update last accessed time)
   * @param userId - User ID
   * @param journeyId - Journey ID to start
   * @returns UserJourneyProgress record
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
   * Update user progress on a learning journey by marking a step complete
   * @param userId - User ID
   * @param journeyId - Journey ID
   * @param stepId - Step ID to mark as complete
   * @param listJourneySteps - Function to list all steps in the journey
   * @returns Updated UserJourneyProgress record
   */
  async updateUserJourneyProgress(
    userId: string,
    journeyId: number,
    stepId: number,
    listJourneySteps: (journeyId: number) => Promise<any[]>
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

    const completedSteps = current?.completedSteps || [];
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }

    // Check if all steps are completed
    const allSteps = await listJourneySteps(journeyId);
    const allCompleted = allSteps.every(step =>
      step.isOptional || completedSteps.includes(step.id)
    );

    const [progress] = await db
      .update(userJourneyProgress)
      .set({
        completedSteps,
        isCompleted: allCompleted,
        completedAt: allCompleted ? new Date() : null,
        lastAccessedAt: new Date()
      })
      .where(
        and(
          eq(userJourneyProgress.userId, userId),
          eq(userJourneyProgress.journeyId, journeyId)
        )
      )
      .returning();

    return progress;
  }

  /**
   * Get user progress for a specific learning journey
   * @param userId - User ID
   * @param journeyId - Journey ID
   * @returns UserJourneyProgress record or undefined if not found
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
   * @returns Array of UserJourneyProgress records ordered by last access
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

  /**
   * Get user preferences
   * @param userId - User ID
   * @returns UserPreferences record or undefined if not found
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs;
  }
}

// Export singleton instance
export const userFeatureRepository = new UserFeatureRepository();
