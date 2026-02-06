/**
 * ============================================================================
 * SUBCATEGORY REPOSITORY - CRUD Operations for Subcategories
 * ============================================================================
 *
 * This repository provides type-safe CRUD operations for subcategories.
 * Subcategories are the second level of the hierarchy, belonging to categories
 * and containing sub-subcategories.
 *
 * DESIGN PATTERN:
 * - Wraps HierarchyRepository with subcategory-specific configuration
 * - Child entity (has categoryId as parent)
 * - Validates against sub-subcategories before deletion
 * - Enforces slug uniqueness within parent category
 *
 * HIERARCHY POSITION:
 * - Categories
 *   └── Subcategories (this level)
 *       └── Sub-subcategories
 *
 * USAGE:
 * ```typescript
 * const subcategoryRepo = new SubcategoryRepository(db);
 *
 * // List subcategories for a category
 * const subcategories = await subcategoryRepo.list(categoryId);
 *
 * // Get subcategory by slug within a category
 * const subcategory = await subcategoryRepo.getBySlug('react', categoryId);
 *
 * // Create new subcategory
 * const newSubcategory = await subcategoryRepo.create({
 *   name: 'React',
 *   slug: 'react',
 *   categoryId: 1
 * });
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, sql } from "drizzle-orm";
import {
  subcategories,
  subSubcategories,
  resources,
  type Subcategory,
  type InsertSubcategory,
} from "@shared/schema";
import { HierarchyRepository } from "./HierarchyRepository";

/**
 * Repository for subcategory CRUD operations
 *
 * Provides type-safe database operations for subcategories with validation
 * against sub-subcategories and resources before deletion.
 */
export class SubcategoryRepository {
  private hierarchyRepo: HierarchyRepository<Subcategory, InsertSubcategory>;

  /**
   * Creates a new SubcategoryRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {
    // Initialize HierarchyRepository with subcategory-specific configuration
    this.hierarchyRepo = new HierarchyRepository<Subcategory, InsertSubcategory>(
      db,
      subcategories,
      {
        idColumn: subcategories.id,
        nameColumn: subcategories.name,
        slugColumn: subcategories.slug,
        parentIdColumn: subcategories.categoryId,
        resourceColumn: resources.subcategory,
        checkChildrenFn: async (subcategoryId: number) => {
          // Check if subcategory has any sub-subcategories
          const [result] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(subSubcategories)
            .where(eq(subSubcategories.subcategoryId, subcategoryId));

          return {
            count: result?.count ?? 0,
            childType: "sub-subcategories",
          };
        },
      }
    );
  }

  /**
   * List subcategories, optionally filtered by category
   *
   * Returns subcategories ordered by name (ascending). Provide categoryId
   * to filter results to a specific category.
   *
   * @param categoryId - Optional category ID to filter by
   * @returns Array of subcategories matching the filter criteria
   *
   * @example
   * // List all subcategories
   * const allSubcategories = await repo.list();
   *
   * // List subcategories for a specific category
   * const subcategories = await repo.list(categoryId);
   */
  async list(categoryId?: number): Promise<Subcategory[]> {
    return this.hierarchyRepo.list(categoryId);
  }

  /**
   * Get subcategory by ID
   *
   * Retrieves a single subcategory by its primary key.
   *
   * @param id - The primary key of the subcategory to retrieve
   * @returns The subcategory if found, undefined otherwise
   *
   * @example
   * const subcategory = await repo.getById(1);
   */
  async getById(id: number): Promise<Subcategory | undefined> {
    return this.hierarchyRepo.getById(id);
  }

  /**
   * Get subcategory by name, optionally scoped to category
   *
   * Retrieves a subcategory by its exact name. Provide categoryId to scope
   * the search within that category.
   *
   * @param name - The exact name of the subcategory to find
   * @param categoryId - Optional category ID to scope the search
   * @returns The subcategory if found, undefined otherwise
   *
   * @example
   * // Find subcategory by name within a category
   * const subcategory = await repo.getByName('React', categoryId);
   */
  async getByName(name: string, categoryId?: number): Promise<Subcategory | undefined> {
    return this.hierarchyRepo.getByName(name, categoryId);
  }

  /**
   * Get subcategory by slug, optionally scoped to category
   *
   * Retrieves a subcategory by its URL-friendly slug. Slugs must be unique
   * within their parent category. Provide categoryId to scope the search.
   *
   * @param slug - The URL-friendly slug to search for
   * @param categoryId - Optional category ID to scope the search
   * @returns The subcategory if found, undefined otherwise
   *
   * @example
   * const subcategory = await repo.getBySlug('react', categoryId);
   */
  async getBySlug(slug: string, categoryId?: number): Promise<Subcategory | undefined> {
    return this.hierarchyRepo.getBySlug(slug, categoryId);
  }

  /**
   * Create a new subcategory
   *
   * Validates slug uniqueness before creating the subcategory.
   * Slugs must be unique within the parent category.
   *
   * @param data - The subcategory data to insert (must include name, slug, and categoryId)
   * @returns The newly created subcategory with all columns populated
   * @throws {Error} If a subcategory with the same slug already exists in the same category
   *
   * @example
   * const newSubcategory = await repo.create({
   *   name: 'React',
   *   slug: 'react',
   *   categoryId: 1
   * });
   */
  async create(data: InsertSubcategory): Promise<Subcategory> {
    return this.hierarchyRepo.create(data);
  }

  /**
   * Update a subcategory
   *
   * Updates one or more fields of an existing subcategory. Only the fields
   * provided in the data object will be modified.
   *
   * @param id - The primary key of the subcategory to update
   * @param data - Partial subcategory data containing only the fields to update
   * @returns The updated subcategory with all columns populated
   * @throws {Error} If the subcategory with the given ID does not exist
   *
   * @example
   * const updated = await repo.update(1, {
   *   name: 'React & React Native'
   * });
   */
  async update(id: number, data: Partial<InsertSubcategory>): Promise<Subcategory> {
    return this.hierarchyRepo.update(id, data);
  }

  /**
   * Delete a subcategory (with validation)
   *
   * Performs validation before deletion to prevent orphaned data:
   * 1. Checks if subcategory has any associated resources
   * 2. Checks if subcategory has any sub-subcategories
   *
   * Only deletes if both validations pass.
   *
   * @param id - The primary key of the subcategory to delete
   * @throws {Error} If subcategory not found
   * @throws {Error} If subcategory has associated resources
   * @throws {Error} If subcategory has sub-subcategories
   *
   * @example
   * // This will fail if the subcategory has sub-subcategories or resources
   * await repo.delete(1);
   */
  async delete(id: number): Promise<void> {
    return this.hierarchyRepo.delete(id);
  }

  /**
   * Get count of resources in this subcategory
   *
   * Counts how many resources are assigned to this subcategory.
   *
   * @param name - The subcategory name to count resources for
   * @returns Number of resources in this subcategory
   *
   * @example
   * const count = await repo.getResourceCount('React');
   */
  async getResourceCount(name: string): Promise<number> {
    return this.hierarchyRepo.getResourceCount(name);
  }
}
