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
import { eq, and, asc, sql } from "drizzle-orm";
import { getPublicCacheValue, invalidatePublicCache } from "../cache/publicCache";
import { normalizeTagFilter } from "@shared/tagNormalize";

/**
 * Canonical public vocabulary: tags belong to approved resource metadata.
 * Buckets use normalizeTagFilter, the same key /tag/:slug pages, filters and
 * the client chips use; SQL only folds case and separators, so "codecs" and
 * "codec" were two buckets here and one everywhere else (1,657 vs 1,650).
 * A resource counts once per canonical tag even if it lists two spellings.
 */
export async function listApprovedResourceTags(): Promise<{ total: number; tags: Array<{ tag: string; count: number }> }> {
  const result = await db.execute(sql`
    SELECT r.id AS id, btrim(tag) AS tag
    FROM resources r,
         jsonb_array_elements_text(
           CASE WHEN jsonb_typeof(r.metadata->'tags') = 'array'
                THEN r.metadata->'tags' ELSE '[]'::jsonb END
         ) AS tag
    WHERE r.status = 'approved' AND btrim(tag) <> ''
  `);
  const resourcesByTag = new Map<string, Set<number>>();
  for (const row of result.rows) {
    const tag = normalizeTagFilter(String(row.tag));
    if (!tag) continue;
    const ids = resourcesByTag.get(tag) ?? new Set<number>();
    ids.add(Number(row.id));
    resourcesByTag.set(tag, ids);
  }
  const counted = Array.from(resourcesByTag, ([tag, ids]) => ({ tag, count: ids.size }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  return { total: counted.length, tags: counted };
}

/** The tag vocabulary through the public cache; /api/tags and /api/public/tags share one entry. */
export function loadPublicTagVocabulary() {
  return getPublicCacheValue({
    namespace: "catalog-taxonomy",
    key: "tags",
    ttlMs: 60_000,
    load: listApprovedResourceTags,
  });
}

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
    invalidatePublicCache('tag-mutation');
    return newTag;
  }

  /**
   * Delete a tag
   * @param id - Tag ID to delete
   */
  async deleteTag(id: number): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
    invalidatePublicCache('tag-mutation');
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
    invalidatePublicCache('tag-mutation');
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
    invalidatePublicCache('tag-mutation');
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
