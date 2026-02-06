/**
 * ============================================================================
 * FAVORITE REPOSITORY - Operations for User Favorites
 * ============================================================================
 *
 * This repository provides type-safe operations for managing user favorites.
 * Favorites allow users to mark resources for quick access and personal curation.
 *
 * DESIGN PATTERN:
 * - Repository pattern with TypeScript for type safety
 * - Many-to-many relationship between users and resources
 * - Composite primary key (userId, resourceId) prevents duplicates
 * - Cascade delete on user/resource deletion
 *
 * KEY OPERATIONS:
 * - add(): Add a resource to user's favorites
 * - remove(): Remove a resource from user's favorites
 * - getUserFavorites(): Get all favorited resources for a user
 * - isFavorited(): Check if a resource is favorited by a user
 *
 * USAGE:
 * ```typescript
 * const favoriteRepo = new FavoriteRepository(db);
 * await favoriteRepo.add('user-id', 123);
 * const favorites = await favoriteRepo.getUserFavorites('user-id');
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { userFavorites, resources, type Resource } from "@shared/schema";

/**
 * Repository for user favorite operations
 *
 * Provides type-safe database operations for managing user favorites.
 * Handles the many-to-many relationship between users and resources.
 */
export class FavoriteRepository {
  /**
   * Creates a new FavoriteRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {}

  /**
   * Add a resource to user's favorites
   *
   * Creates a favorite entry for the user-resource pair.
   * Uses onConflictDoNothing to safely handle duplicate attempts.
   *
   * @param userId - The user's unique identifier
   * @param resourceId - The resource ID to favorite
   *
   * @example
   * await favoriteRepo.add('user-123', 456);
   */
  async add(userId: string, resourceId: number): Promise<void> {
    await this.db
      .insert(userFavorites)
      .values({ userId, resourceId })
      .onConflictDoNothing();
  }

  /**
   * Remove a resource from user's favorites
   *
   * Deletes the favorite entry for the user-resource pair.
   * Safe to call even if the favorite doesn't exist.
   *
   * @param userId - The user's unique identifier
   * @param resourceId - The resource ID to unfavorite
   *
   * @example
   * await favoriteRepo.remove('user-123', 456);
   */
  async remove(userId: string, resourceId: number): Promise<void> {
    await this.db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.resourceId, resourceId)
        )
      );
  }

  /**
   * Get all favorited resources for a user
   *
   * Returns all resources that the user has favorited, ordered by
   * most recently favorited first. Includes the timestamp when each
   * resource was favorited.
   *
   * @param userId - The user's unique identifier
   * @returns Array of resources with favoritedAt timestamps
   *
   * @example
   * const favorites = await favoriteRepo.getUserFavorites('user-123');
   * favorites.forEach(fav => {
   *   console.log(`${fav.title} favorited at ${fav.favoritedAt}`);
   * });
   */
  async getUserFavorites(userId: string): Promise<Array<Resource & { favoritedAt: Date }>> {
    const result = await this.db
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
   * Check if a resource is favorited by a user
   *
   * Determines whether a specific user-resource favorite exists.
   * Useful for UI state (showing filled/unfilled heart icon).
   *
   * @param userId - The user's unique identifier
   * @param resourceId - The resource ID to check
   * @returns True if favorited, false otherwise
   *
   * @example
   * const isFavorited = await favoriteRepo.isFavorited('user-123', 456);
   * if (isFavorited) {
   *   // Show filled heart icon
   * }
   */
  async isFavorited(userId: string, resourceId: number): Promise<boolean> {
    const [result] = await this.db
      .select()
      .from(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.resourceId, resourceId)
        )
      )
      .limit(1);

    return !!result;
  }
}
