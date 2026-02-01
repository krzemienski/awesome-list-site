/**
 * ============================================================================
 * TAG REPOSITORY - CRUD Operations for Tags
 * ============================================================================
 *
 * This repository provides type-safe CRUD operations for tag management.
 * Tags are used to categorize and label resources for improved discovery.
 *
 * DESIGN PATTERN:
 * - Repository pattern with TypeScript for type safety
 * - Enforces slug uniqueness globally
 * - Handles resource tag associations via resourceTags join table
 *
 * KEY OPERATIONS:
 * - list(): Get all tags ordered by name
 * - getById(): Retrieve tag by ID
 * - getByName(): Find tag by exact name match
 * - getBySlug(): Find tag by URL-friendly slug
 * - create(): Create new tag with unique slug validation
 * - update(): Update existing tag fields
 * - delete(): Delete tag (cascades to resourceTags)
 * - getResourceCount(): Count resources using this tag
 *
 * USAGE:
 * ```typescript
 * const tagRepo = new TagRepository(db);
 * const tag = await tagRepo.create({ name: "TypeScript", slug: "typescript" });
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, sql, asc } from "drizzle-orm";
import { tags, resourceTags, type Tag, type InsertTag } from "@shared/schema";

/**
 * Repository for tag CRUD operations
 *
 * Provides type-safe database operations for tags.
 * Handles slug uniqueness and resource associations.
 */
export class TagRepository {
  /**
   * Creates a new TagRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {}

  /**
   * List all tags ordered by name
   *
   * Returns all tags in alphabetical order by name.
   *
   * @returns Array of all tags
   *
   * @example
   * const allTags = await tagRepo.list();
   */
  async list(): Promise<Tag[]> {
    return await this.db.select().from(tags).orderBy(asc(tags.name));
  }

  /**
   * Get tag by ID
   *
   * Retrieves a single tag by its primary key.
   *
   * @param id - The primary key of the tag to retrieve
   * @returns The tag if found, undefined otherwise
   */
  async getById(id: number): Promise<Tag | undefined> {
    const [tag] = await this.db
      .select()
      .from(tags)
      .where(eq(tags.id, id));
    return tag;
  }

  /**
   * Get tag by name
   *
   * Finds a tag by its exact name (case-sensitive).
   *
   * @param name - The exact name of the tag to find
   * @returns The tag if found, undefined otherwise
   */
  async getByName(name: string): Promise<Tag | undefined> {
    const [tag] = await this.db
      .select()
      .from(tags)
      .where(eq(tags.name, name));
    return tag;
  }

  /**
   * Get tag by slug
   *
   * Finds a tag by its URL-friendly slug.
   *
   * @param slug - The URL-friendly slug to search for
   * @returns The tag if found, undefined otherwise
   */
  async getBySlug(slug: string): Promise<Tag | undefined> {
    const [tag] = await this.db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug));
    return tag;
  }

  /**
   * Create a new tag
   *
   * Validates slug uniqueness before creating the tag.
   * Slugs must be globally unique across all tags.
   *
   * @param data - The tag data to insert (name and slug required)
   * @returns The newly created tag with all columns populated
   * @throws {Error} If a tag with the same slug already exists
   *
   * @example
   * const newTag = await tagRepo.create({
   *   name: "TypeScript",
   *   slug: "typescript"
   * });
   */
  async create(data: InsertTag): Promise<Tag> {
    // Check for slug uniqueness
    const existing = await this.getBySlug(data.slug);

    if (existing) {
      throw new Error(`Tag with slug "${data.slug}" already exists`);
    }

    const [newTag] = await this.db
      .insert(tags)
      .values(data)
      .returning();

    return newTag;
  }

  /**
   * Update a tag
   *
   * Updates one or more fields of an existing tag.
   * Only the fields provided in the data object will be modified.
   *
   * @param id - The primary key of the tag to update
   * @param data - Partial tag data containing only the fields to update
   * @returns The updated tag with all columns populated
   * @throws {Error} If the tag with the given ID does not exist
   */
  async update(id: number, data: Partial<InsertTag>): Promise<Tag> {
    const [updatedTag] = await this.db
      .update(tags)
      .set(data)
      .where(eq(tags.id, id))
      .returning();

    return updatedTag;
  }

  /**
   * Delete a tag
   *
   * Deletes a tag from the database. This will cascade to resourceTags
   * due to the foreign key constraint with onDelete: "cascade".
   *
   * @param id - The primary key of the tag to delete
   * @throws {Error} If the tag with the given ID does not exist
   */
  async delete(id: number): Promise<void> {
    await this.db.delete(tags).where(eq(tags.id, id));
  }

  /**
   * Get count of resources using this tag
   *
   * Counts how many resources are associated with this tag
   * via the resourceTags join table.
   *
   * @param tagId - The tag ID to count resources for
   * @returns Number of resources using this tag
   *
   * @example
   * const count = await tagRepo.getResourceCount(5);
   */
  async getResourceCount(tagId: number): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(resourceTags)
      .where(eq(resourceTags.tagId, tagId));

    return result?.count ?? 0;
  }
}
