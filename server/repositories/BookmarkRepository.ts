/**
 * ============================================================================
 * BOOKMARK REPOSITORY - Operations for User Bookmarks
 * ============================================================================
 *
 * This repository provides type-safe operations for managing user bookmarks.
 * Bookmarks allow users to save resources with optional personal notes for
 * later reference and study.
 *
 * DESIGN PATTERN:
 * - Repository pattern with TypeScript for type safety
 * - Many-to-many relationship between users and resources
 * - Composite primary key (userId, resourceId) prevents duplicates
 * - Supports optional notes field for personal annotations
 * - Cascade delete on user/resource deletion
 *
 * KEY OPERATIONS:
 * - add(): Add a resource to user's bookmarks with optional notes
 * - remove(): Remove a resource from user's bookmarks
 * - getUserBookmarks(): Get all bookmarked resources for a user
 * - updateNotes(): Update the notes for an existing bookmark
 * - isBookmarked(): Check if a resource is bookmarked by a user
 *
 * USAGE:
 * ```typescript
 * const bookmarkRepo = new BookmarkRepository(db);
 * await bookmarkRepo.add('user-id', 123, 'Great tutorial!');
 * const bookmarks = await bookmarkRepo.getUserBookmarks('user-id');
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { userBookmarks, resources, type Resource } from "@shared/schema";

/**
 * Repository for user bookmark operations
 *
 * Provides type-safe database operations for managing user bookmarks.
 * Handles the many-to-many relationship between users and resources
 * with optional personal notes.
 */
export class BookmarkRepository {
  /**
   * Creates a new BookmarkRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {}

  /**
   * Add a resource to user's bookmarks
   *
   * Creates a bookmark entry for the user-resource pair with optional notes.
   * If the bookmark already exists, updates it with new notes and timestamp.
   *
   * @param userId - The user's unique identifier
   * @param resourceId - The resource ID to bookmark
   * @param notes - Optional personal notes about the resource
   *
   * @example
   * await bookmarkRepo.add('user-123', 456, 'Read this for React hooks');
   */
  async add(userId: string, resourceId: number, notes?: string): Promise<void> {
    await this.db
      .insert(userBookmarks)
      .values({ userId, resourceId, notes })
      .onConflictDoUpdate({
        target: [userBookmarks.userId, userBookmarks.resourceId],
        set: { notes, createdAt: new Date() }
      });
  }

  /**
   * Remove a resource from user's bookmarks
   *
   * Deletes the bookmark entry for the user-resource pair.
   * Safe to call even if the bookmark doesn't exist.
   *
   * @param userId - The user's unique identifier
   * @param resourceId - The resource ID to remove from bookmarks
   *
   * @example
   * await bookmarkRepo.remove('user-123', 456);
   */
  async remove(userId: string, resourceId: number): Promise<void> {
    await this.db
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
   *
   * Returns all resources that the user has bookmarked, ordered by
   * most recently bookmarked first. Includes notes and timestamp for
   * each bookmark.
   *
   * @param userId - The user's unique identifier
   * @returns Array of resources with notes and bookmarkedAt timestamps
   *
   * @example
   * const bookmarks = await bookmarkRepo.getUserBookmarks('user-123');
   * bookmarks.forEach(bookmark => {
   *   console.log(`${bookmark.title}: ${bookmark.notes}`);
   * });
   */
  async getUserBookmarks(userId: string): Promise<Array<Resource & { notes?: string; bookmarkedAt: Date }>> {
    const result = await this.db
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
   * Update notes for an existing bookmark
   *
   * Updates the personal notes for a user's bookmark.
   * Also updates the createdAt timestamp to reflect the modification.
   *
   * @param userId - The user's unique identifier
   * @param resourceId - The resource ID of the bookmark
   * @param notes - New notes content (can be empty string to clear)
   *
   * @example
   * await bookmarkRepo.updateNotes('user-123', 456, 'Updated: finished reading');
   */
  async updateNotes(userId: string, resourceId: number, notes: string): Promise<void> {
    await this.db
      .update(userBookmarks)
      .set({ notes, createdAt: new Date() })
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId)
        )
      );
  }

  /**
   * Check if a resource is bookmarked by a user
   *
   * Determines whether a specific user-resource bookmark exists.
   * Useful for UI state (showing bookmarked/unbookmarked icon).
   *
   * @param userId - The user's unique identifier
   * @param resourceId - The resource ID to check
   * @returns True if bookmarked, false otherwise
   *
   * @example
   * const isBookmarked = await bookmarkRepo.isBookmarked('user-123', 456);
   * if (isBookmarked) {
   *   // Show bookmark icon
   * }
   */
  async isBookmarked(userId: string, resourceId: number): Promise<boolean> {
    const [result] = await this.db
      .select()
      .from(userBookmarks)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId)
        )
      )
      .limit(1);

    return !!result;
  }
}
