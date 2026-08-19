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
  bookmarkCollectionItems,
  userJourneyProgress,
  userPreferences,
  userInteractions,
  userRecommendationFeedback,
  type Resource,
  type UserJourneyProgress,
  type InsertUserJourneyProgress,
  type UserPreferences,
  type UserInteraction,
  type UserRecommendationFeedback,
} from "@shared/schema";
import type { RecommendationFeedbackValue } from "@shared/recommendations";
import type {
  LearningFormat,
  LearningGoal,
  LearningSkillLevel,
  LearningTimeCommitment,
  OnboardingStatus,
} from "@shared/onboarding";
import {
  DEFAULT_LEARNING_PREFERENCES,
  normalizeLearningFormats,
  normalizeLearningGoals,
} from "@shared/onboarding";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";

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
  async getUserFavorites(
    userId: string,
  ): Promise<Array<Resource & { resourceId: number; favoritedAt: Date }>> {
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
      // Keep the legacy alias consumed by older clients and integration
      // surfaces while `id` remains the canonical flattened resource id.
      resourceId: r.resource.id,
      favoritedAt: r.favoritedAt!
    }));
  }

  /**
   * Add a resource to user's bookmarks (or update existing bookmark)
   * @param userId - User ID
   * @param resourceId - Resource ID to bookmark
   * @param notes - Optional notes about the bookmark
   */
  async addBookmark(userId: string, resourceId: number, notes?: string): Promise<typeof userBookmarks.$inferSelect> {
    // BUG-021: return the canonical row so the API can echo the saved state
    // (POST /api/bookmarks/:id used to return only { message }, leaving
    // surfaces with hand-held local state stuck on stale notes).
    const [row] = await db
      .insert(userBookmarks)
      .values({ userId, resourceId, notes })
      .onConflictDoUpdate({
        target: [userBookmarks.userId, userBookmarks.resourceId],
        // A bare POST means “save this resource”, not “erase any existing
        // annotation”. Keeping the row's values when notes is omitted makes
        // duplicate saves idempotent and closes the guest-merge race where
        // another tab creates a noted bookmark after the merge's pre-dedupe
        // read but before its POST reaches PostgreSQL. An explicit empty
        // string still intentionally clears notes via the editor.
        set: notes === undefined
          ? {
              notes: sql`${userBookmarks.notes}`,
              createdAt: sql`${userBookmarks.createdAt}`,
            }
          : { notes, createdAt: new Date() }
      })
      .returning();
    return row;
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
        bookmarkedAt: userBookmarks.createdAt,
        queueStatus: userBookmarks.queueStatus,
        archivedAt: userBookmarks.archivedAt,
        personalTags: userBookmarks.personalTags,
      })
      .from(userBookmarks)
      .innerJoin(resources, eq(userBookmarks.resourceId, resources.id))
      .where(eq(userBookmarks.userId, userId))
      .orderBy(desc(userBookmarks.createdAt));

    const memberships = await db
      .select({
        resourceId: bookmarkCollectionItems.resourceId,
        collectionId: bookmarkCollectionItems.collectionId,
      })
      .from(bookmarkCollectionItems)
      .where(eq(bookmarkCollectionItems.userId, userId));
    const collectionIdsByResource = new Map<number, number[]>();
    for (const membership of memberships) {
      const ids = collectionIdsByResource.get(membership.resourceId) ?? [];
      ids.push(membership.collectionId);
      collectionIdsByResource.set(membership.resourceId, ids);
    }

    return result.map(r => ({
      ...r.resource,
      resourceId: r.resource.id,
      notes: r.notes || undefined,
      bookmarkedAt: r.bookmarkedAt!,
      queueStatus: r.queueStatus,
      archivedAt: r.archivedAt,
      personalTags: r.personalTags,
      collectionIds: collectionIdsByResource.get(r.resource.id) ?? [],
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
    if (!prefs) return undefined;
    const learningGoals = normalizeLearningGoals(prefs.learningGoals);
    const preferredResourceTypes = normalizeLearningFormats(
      prefs.preferredResourceTypes,
    );
    const complete =
      prefs.preferredCategories.length > 0 &&
      learningGoals.length > 0 &&
      preferredResourceTypes.length > 0;
    const downgradeCompleted = prefs.onboardingStatus === "completed" && !complete;
    return {
      ...prefs,
      learningGoals,
      preferredResourceTypes,
      onboardingStatus: downgradeCompleted ? "in_progress" : prefs.onboardingStatus,
      onboardingStep: downgradeCompleted
        ? prefs.preferredCategories.length === 0
          ? 2
          : learningGoals.length === 0
            ? 3
            : 4
        : prefs.onboardingStep,
      onboardingCompletedAt: downgradeCompleted ? null : prefs.onboardingCompletedAt,
    };
  }

  /**
   * Create or update the user's single canonical preference row.
   *
   * The unique user_id constraint prevents duplicates. First-party callers also
   * supply the version they observed so overlapping tabs fail with a conflict
   * instead of silently replacing one another.
   */
  async upsertUserPreferences(
    userId: string,
    values: {
      preferredCategories: string[];
      skillLevel: LearningSkillLevel;
      learningGoals: LearningGoal[];
      preferredResourceTypes: LearningFormat[];
      timeCommitment: LearningTimeCommitment;
      onboardingStatus: OnboardingStatus;
      onboardingStep: number;
      onboardingCompletedAt: Date | null;
      onboardingDismissedAt: Date | null;
    },
    expectedRevision?: number | null,
  ): Promise<UserPreferences | undefined> {
    const updateValues = {
      ...values,
      updatedAt: new Date(),
      revision: sql`${userPreferences.revision} + 1`,
    };

    // A first-party client that observed an existing row must update that exact
    // version. This is atomic and cannot recreate a row deleted by another tab.
    if (typeof expectedRevision === "number") {
      const [preferences] = await db
        .update(userPreferences)
        .set(updateValues)
        .where(
          and(
            eq(userPreferences.userId, userId),
            eq(userPreferences.revision, expectedRevision),
          ),
        )
        .returning();
      return preferences;
    }

    // Null means the client observed no row. Insert once, but never overwrite a
    // row another tab created in the meantime.
    if (expectedRevision === null) {
      return db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
        );
        const [preferences] = await tx
          .insert(userPreferences)
          .values({ userId, ...values })
          .onConflictDoNothing({ target: userPreferences.userId })
          .returning();
        return preferences;
      });
    }

    // Backward-compatible callers without a version retain idempotent upsert
    // semantics. The first-party onboarding and Settings clients never use it.
    const [preferences] = await db
      .insert(userPreferences)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: updateValues,
      })
      .returning();
    return preferences;
  }

  /**
   * Clear learning preferences without touching the account or activity data.
   */
  async resetUserPreferences(
    userId: string,
    expectedRevision?: number | null,
  ): Promise<UserPreferences | undefined> {
    const resetValues = {
      ...DEFAULT_LEARNING_PREFERENCES,
      onboardingStatus: "not_started" as const,
      onboardingStep: 1,
      onboardingCompletedAt: null,
      onboardingDismissedAt: null,
      updatedAt: new Date(),
    };
    const resetUpdateValues = {
      ...resetValues,
      revision: sql`${userPreferences.revision} + 1`,
    };

    if (expectedRevision === null) {
      // A cleared row is an API-hidden tombstone. It preserves a version after
      // reset so a concurrent first save cannot recreate stale preferences.
      // The same advisory lock is used by the expected-null insert path above.
      return db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`,
        );
        const [preferences] = await tx
          .insert(userPreferences)
          .values({ userId, ...resetValues })
          .onConflictDoUpdate({
            target: userPreferences.userId,
            set: resetUpdateValues,
          })
          .returning();
        return preferences;
      });
    }

    if (typeof expectedRevision === "number") {
      const [preferences] = await db
        .update(userPreferences)
        .set(resetUpdateValues)
        .where(
          and(
            eq(userPreferences.userId, userId),
            eq(userPreferences.revision, expectedRevision),
          ),
        )
        .returning();
      return preferences;
    }

    const [preferences] = await db
      .insert(userPreferences)
      .values({ userId, ...resetValues })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: resetUpdateValues,
      })
      .returning();
    return preferences;
  }

  /**
   * Get all interactions recorded for a resource
   * @param resourceId - Resource ID
   * @returns Array of UserInteraction records (most recent first)
   */
  async getResourceInteractions(resourceId: number): Promise<UserInteraction[]> {
    return db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.resourceId, resourceId))
      .orderBy(desc(userInteractions.timestamp));
  }

  /**
   * Get aggregate popularity scores for all resources in a SINGLE query.
   * Replaces an N+1 pattern (one interactions query per resource) that
   * saturated the DB connection pool for cold-start recommendations.
   * Score weighting: view=1, bookmark=3, complete=5.
   * @returns Array of { resourceId, score } for resources that have interactions
   */
  async getResourcePopularityScores(): Promise<Array<{ resourceId: number; score: number }>> {
    const rows = await db
      .select({
        resourceId: userInteractions.resourceId,
        viewCount: sql<number>`count(*) filter (where ${userInteractions.interactionType} = 'view')`,
        bookmarkCount: sql<number>`count(*) filter (where ${userInteractions.interactionType} = 'bookmark')`,
        completeCount: sql<number>`count(*) filter (where ${userInteractions.interactionType} = 'complete')`,
      })
      .from(userInteractions)
      .groupBy(userInteractions.resourceId);

    return rows.map((r) => ({
      resourceId: r.resourceId,
      score:
        Number(r.viewCount) + Number(r.bookmarkCount) * 3 + Number(r.completeCount) * 5,
    }));
  }

  /**
   * Get all interactions recorded for a user
   * @param userId - User ID
   * @returns Array of UserInteraction records (most recent first)
   */
  async getUserInteractions(userId: string): Promise<UserInteraction[]> {
    return db
      .select()
      .from(userInteractions)
      .where(eq(userInteractions.userId, userId))
      .orderBy(desc(userInteractions.timestamp));
  }

  async getRecommendationFeedback(
    userId: string,
  ): Promise<UserRecommendationFeedback[]> {
    return db
      .select()
      .from(userRecommendationFeedback)
      .where(eq(userRecommendationFeedback.userId, userId))
      .orderBy(desc(userRecommendationFeedback.updatedAt));
  }

  async setRecommendationFeedback(
    userId: string,
    resourceId: number,
    feedback: RecommendationFeedbackValue | null,
  ): Promise<UserRecommendationFeedback | undefined> {
    if (feedback === null) {
      const [removed] = await db
        .delete(userRecommendationFeedback)
        .where(
          and(
            eq(userRecommendationFeedback.userId, userId),
            eq(userRecommendationFeedback.resourceId, resourceId),
          ),
        )
        .returning();
      return removed;
    }

    const [saved] = await db
      .insert(userRecommendationFeedback)
      .values({ userId, resourceId, feedback })
      .onConflictDoUpdate({
        target: [
          userRecommendationFeedback.userId,
          userRecommendationFeedback.resourceId,
        ],
        set: {
          feedback,
          updatedAt: new Date(),
        },
      })
      .returning();
    return saved;
  }

  /**
   * Return one recent-view row per resource. MAX(timestamp) deduplicates page
   * reloads and repeated opens at the database boundary, while the stable
   * resource-id tiebreaker keeps cards from reordering unpredictably.
   */
  async getRecentResourceViews(
    userId: string,
    limit = 8,
  ): Promise<Array<{
    resourceId: number;
    viewedAt: Date;
    resource: {
      id: number;
      title: string;
      category: string;
      status: string | null;
    } | null;
  }>> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);
    const viewedAt = sql<Date>`max(${userInteractions.timestamp})`.as("viewed_at");
    const rows = await db
      .select({
        resourceId: userInteractions.resourceId,
        viewedAt,
        resource: {
          id: resources.id,
          title: resources.title,
          category: resources.category,
          status: resources.status,
        },
      })
      .from(userInteractions)
      .leftJoin(resources, eq(userInteractions.resourceId, resources.id))
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.interactionType, "view"),
        ),
      )
      .groupBy(userInteractions.resourceId, resources.id)
      .orderBy(desc(viewedAt), desc(userInteractions.resourceId))
      .limit(safeLimit);

    return rows.map((row) => ({
      ...row,
      viewedAt: new Date(row.viewedAt),
      resource:
        row.resource && row.resource.id != null ? row.resource : null,
    }));
  }

  /**
   * Record a user interaction with a resource
   * @param userId - User ID
   * @param resourceId - Resource ID
   * @param interactionType - Interaction type (view, click, bookmark, rate, complete, dismiss)
   * @param interactionValue - Optional numeric value (e.g. rating or time spent)
   * @param metadata - Optional metadata object
   * @returns The inserted UserInteraction record
   */
  async trackUserInteraction(
    userId: string,
    resourceId: number,
    interactionType: string,
    interactionValue?: number | null,
    metadata?: Record<string, any>
  ): Promise<UserInteraction> {
    const [interaction] = await db
      .insert(userInteractions)
      .values({
        userId,
        resourceId,
        interactionType,
        interactionValue: interactionValue ?? null,
        metadata: metadata ?? {},
      })
      .returning();
    return interaction;
  }
}

// Export singleton instance
export const userFeatureRepository = new UserFeatureRepository();
