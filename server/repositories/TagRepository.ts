/**
 * ============================================================================
 * TAG REPOSITORY - Tag Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for tag operations.
 * It encapsulates all database queries related to tags and resource tagging.
 *
 * KEY OPERATIONS:
 * - listTags: Get all tags
 * - getTag: Retrieve tag by ID
 * - createTag: Create new tag
 * - deleteTag: Delete tag
 * - addTagToResource: Associate tag with resource
 * - removeTagFromResource: Remove tag from resource
 * - getResourceTags: Get all tags for a resource
 *
 * DESIGN NOTES:
 * - Tags are reusable metadata labels for resources
 * - Many-to-many relationship between tags and resources
 * - Uses Drizzle ORM for type-safe database operations
 * ============================================================================
 */

import {
  tags,
  resourceTags,
  type Tag,
  type InsertTag,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, asc } from "drizzle-orm";

/**
 * Repository class for tag-related database operations
 */
export class TagRepository {
  /**
   * List all tags
   * @returns Array of all tags ordered by name
   */
  async listTags(): Promise<Tag[]> {
    return await db.select().from(tags).orderBy(asc(tags.name));
  }

  /**
   * Get a tag by its ID
   * @param id - Tag ID
   * @returns Tag object or undefined if not found
   */
  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  /**
   * Create a new tag
   * @param tag - Tag data to create
   * @returns The created tag
   */
  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db.insert(tags).values(tag).returning();
    return newTag;
  }

  /**
   * Delete a tag
   * @param id - Tag ID to delete
   */
  async deleteTag(id: number): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  /**
   * Add a tag to a resource
   * Creates a many-to-many relationship between tag and resource
   * @param resourceId - Resource ID
   * @param tagId - Tag ID
   */
  async addTagToResource(resourceId: number, tagId: number): Promise<void> {
    await db
      .insert(resourceTags)
      .values({ resourceId, tagId })
      .onConflictDoNothing();
  }

  /**
   * Remove a tag from a resource
   * Removes the many-to-many relationship between tag and resource
   * @param resourceId - Resource ID
   * @param tagId - Tag ID
   */
  async removeTagFromResource(resourceId: number, tagId: number): Promise<void> {
    await db
      .delete(resourceTags)
      .where(
        and(
          eq(resourceTags.resourceId, resourceId),
          eq(resourceTags.tagId, tagId)
        )
      );
  }

  /**
   * Get all tags associated with a resource
   * @param resourceId - Resource ID
   * @returns Array of tags for the resource
   */
  async getResourceTags(resourceId: number): Promise<Tag[]> {
    const result = await db
      .select({ tag: tags })
      .from(resourceTags)
      .innerJoin(tags, eq(resourceTags.tagId, tags.id))
      .where(eq(resourceTags.resourceId, resourceId));

    return result.map(r => r.tag);
  }
}
