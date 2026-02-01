/**
 * ============================================================================
 * SUB-SUBCATEGORY REPOSITORY - CRUD Operations for Sub-subcategories
 * ============================================================================
 *
 * This repository provides type-safe CRUD operations for sub-subcategories.
 * Sub-subcategories are the third and deepest level of the hierarchy,
 * belonging to subcategories. They are leaf nodes with no children.
 *
 * DESIGN PATTERN:
 * - Wraps HierarchyRepository with sub-subcategory-specific configuration
 * - Child entity (has subcategoryId as parent)
 * - Leaf node (no children to validate against)
 * - Enforces slug uniqueness within parent subcategory
 *
 * HIERARCHY POSITION:
 * - Categories
 *   └── Subcategories
 *       └── Sub-subcategories (this level - leaf nodes)
 *
 * USAGE:
 * ```typescript
 * const subSubcategoryRepo = new SubSubcategoryRepository(db);
 *
 * // List sub-subcategories for a subcategory
 * const subSubcategories = await subSubcategoryRepo.list(subcategoryId);
 *
 * // Get sub-subcategory by slug within a subcategory
 * const subSubcategory = await subSubcategoryRepo.getBySlug('hooks', subcategoryId);
 *
 * // Create new sub-subcategory
 * const newSubSubcategory = await subSubcategoryRepo.create({
 *   name: 'React Hooks',
 *   slug: 'hooks',
 *   subcategoryId: 1
 * });
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import {
  subSubcategories,
  resources,
  type SubSubcategory,
  type InsertSubSubcategory,
} from "@shared/schema";
import { HierarchyRepository } from "./HierarchyRepository";

/**
 * Repository for sub-subcategory CRUD operations
 *
 * Provides type-safe database operations for sub-subcategories with validation
 * against resources before deletion. Sub-subcategories are leaf nodes, so
 * they have no child entities to check.
 */
export class SubSubcategoryRepository {
  private hierarchyRepo: HierarchyRepository<SubSubcategory, InsertSubSubcategory>;

  /**
   * Creates a new SubSubcategoryRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {
    // Initialize HierarchyRepository with sub-subcategory-specific configuration
    this.hierarchyRepo = new HierarchyRepository<SubSubcategory, InsertSubSubcategory>(
      db,
      subSubcategories,
      {
        idColumn: subSubcategories.id,
        nameColumn: subSubcategories.name,
        slugColumn: subSubcategories.slug,
        parentIdColumn: subSubcategories.subcategoryId,
        resourceColumn: resources.subSubcategory,
        // No checkChildrenFn - sub-subcategories are leaf nodes
      }
    );
  }

  /**
   * List sub-subcategories, optionally filtered by subcategory
   *
   * Returns sub-subcategories ordered by name (ascending). Provide subcategoryId
   * to filter results to a specific subcategory.
   *
   * @param subcategoryId - Optional subcategory ID to filter by
   * @returns Array of sub-subcategories matching the filter criteria
   *
   * @example
   * // List all sub-subcategories
   * const allSubSubcategories = await repo.list();
   *
   * // List sub-subcategories for a specific subcategory
   * const subSubcategories = await repo.list(subcategoryId);
   */
  async list(subcategoryId?: number): Promise<SubSubcategory[]> {
    return this.hierarchyRepo.list(subcategoryId);
  }

  /**
   * Get sub-subcategory by ID
   *
   * Retrieves a single sub-subcategory by its primary key.
   *
   * @param id - The primary key of the sub-subcategory to retrieve
   * @returns The sub-subcategory if found, undefined otherwise
   *
   * @example
   * const subSubcategory = await repo.getById(1);
   */
  async getById(id: number): Promise<SubSubcategory | undefined> {
    return this.hierarchyRepo.getById(id);
  }

  /**
   * Get sub-subcategory by name, optionally scoped to subcategory
   *
   * Retrieves a sub-subcategory by its exact name. Provide subcategoryId to scope
   * the search within that subcategory.
   *
   * @param name - The exact name of the sub-subcategory to find
   * @param subcategoryId - Optional subcategory ID to scope the search
   * @returns The sub-subcategory if found, undefined otherwise
   *
   * @example
   * // Find sub-subcategory by name within a subcategory
   * const subSubcategory = await repo.getByName('React Hooks', subcategoryId);
   */
  async getByName(name: string, subcategoryId?: number): Promise<SubSubcategory | undefined> {
    return this.hierarchyRepo.getByName(name, subcategoryId);
  }

  /**
   * Get sub-subcategory by slug, optionally scoped to subcategory
   *
   * Retrieves a sub-subcategory by its URL-friendly slug. Slugs must be unique
   * within their parent subcategory. Provide subcategoryId to scope the search.
   *
   * @param slug - The URL-friendly slug to search for
   * @param subcategoryId - Optional subcategory ID to scope the search
   * @returns The sub-subcategory if found, undefined otherwise
   *
   * @example
   * const subSubcategory = await repo.getBySlug('hooks', subcategoryId);
   */
  async getBySlug(slug: string, subcategoryId?: number): Promise<SubSubcategory | undefined> {
    return this.hierarchyRepo.getBySlug(slug, subcategoryId);
  }

  /**
   * Create a new sub-subcategory
   *
   * Validates slug uniqueness before creating the sub-subcategory.
   * Slugs must be unique within the parent subcategory.
   *
   * @param data - The sub-subcategory data to insert (must include name, slug, and subcategoryId)
   * @returns The newly created sub-subcategory with all columns populated
   * @throws {Error} If a sub-subcategory with the same slug already exists in the same subcategory
   *
   * @example
   * const newSubSubcategory = await repo.create({
   *   name: 'React Hooks',
   *   slug: 'hooks',
   *   subcategoryId: 1
   * });
   */
  async create(data: InsertSubSubcategory): Promise<SubSubcategory> {
    return this.hierarchyRepo.create(data);
  }

  /**
   * Update a sub-subcategory
   *
   * Updates one or more fields of an existing sub-subcategory. Only the fields
   * provided in the data object will be modified.
   *
   * @param id - The primary key of the sub-subcategory to update
   * @param data - Partial sub-subcategory data containing only the fields to update
   * @returns The updated sub-subcategory with all columns populated
   * @throws {Error} If the sub-subcategory with the given ID does not exist
   *
   * @example
   * const updated = await repo.update(1, {
   *   name: 'React Hooks & Custom Hooks'
   * });
   */
  async update(id: number, data: Partial<InsertSubSubcategory>): Promise<SubSubcategory> {
    return this.hierarchyRepo.update(id, data);
  }

  /**
   * Delete a sub-subcategory (with validation)
   *
   * Performs validation before deletion to prevent orphaned data:
   * 1. Checks if sub-subcategory has any associated resources
   *
   * Only deletes if validation passes. Sub-subcategories are leaf nodes
   * so no child entity check is needed.
   *
   * @param id - The primary key of the sub-subcategory to delete
   * @throws {Error} If sub-subcategory not found
   * @throws {Error} If sub-subcategory has associated resources
   *
   * @example
   * // This will fail if the sub-subcategory has resources
   * await repo.delete(1);
   */
  async delete(id: number): Promise<void> {
    return this.hierarchyRepo.delete(id);
  }

  /**
   * Get count of resources in this sub-subcategory
   *
   * Counts how many resources are assigned to this sub-subcategory.
   *
   * @param name - The sub-subcategory name to count resources for
   * @returns Number of resources in this sub-subcategory
   *
   * @example
   * const count = await repo.getResourceCount('React Hooks');
   */
  async getResourceCount(name: string): Promise<number> {
    return this.hierarchyRepo.getResourceCount(name);
  }
}
