/**
 * ============================================================================
 * CATEGORY REPOSITORY - CRUD Operations for Categories
 * ============================================================================
 *
 * This repository provides type-safe CRUD operations for top-level categories.
 * Categories are the root level of the hierarchy and can contain subcategories.
 *
 * DESIGN PATTERN:
 * - Wraps HierarchyRepository with category-specific configuration
 * - Root-level entity (no parent ID)
 * - Validates against subcategories before deletion
 * - Enforces global slug uniqueness
 *
 * HIERARCHY POSITION:
 * - Categories (root)
 *   └── Subcategories
 *       └── Sub-subcategories
 *
 * USAGE:
 * ```typescript
 * const categoryRepo = new CategoryRepository(db);
 *
 * // List all categories
 * const categories = await categoryRepo.list();
 *
 * // Get category by slug
 * const category = await categoryRepo.getBySlug('javascript');
 *
 * // Create new category
 * const newCategory = await categoryRepo.create({
 *   name: 'JavaScript',
 *   slug: 'javascript'
 * });
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, sql } from "drizzle-orm";
import {
  categories,
  subcategories,
  resources,
  type Category,
  type InsertCategory,
} from "@shared/schema";
import { HierarchyRepository } from "./HierarchyRepository";

/**
 * Repository for category CRUD operations
 *
 * Provides type-safe database operations for categories with validation
 * against subcategories and resources before deletion.
 */
export class CategoryRepository {
  private hierarchyRepo: HierarchyRepository<Category, InsertCategory>;

  /**
   * Creates a new CategoryRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {
    // Initialize HierarchyRepository with category-specific configuration
    this.hierarchyRepo = new HierarchyRepository<Category, InsertCategory>(
      db,
      categories,
      {
        idColumn: categories.id,
        nameColumn: categories.name,
        slugColumn: categories.slug,
        // No parentIdColumn - categories are root level
        resourceColumn: resources.category,
        checkChildrenFn: async (categoryId: number) => {
          // Check if category has any subcategories
          const [result] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(subcategories)
            .where(eq(subcategories.categoryId, categoryId));

          return {
            count: result?.count ?? 0,
            childType: "subcategories",
          };
        },
      }
    );
  }

  /**
   * List all categories
   *
   * Returns all categories ordered by name (ascending).
   *
   * @returns Array of all categories
   *
   * @example
   * const categories = await repo.list();
   */
  async list(): Promise<Category[]> {
    return this.hierarchyRepo.list();
  }

  /**
   * Get category by ID
   *
   * Retrieves a single category by its primary key.
   *
   * @param id - The primary key of the category to retrieve
   * @returns The category if found, undefined otherwise
   *
   * @example
   * const category = await repo.getById(1);
   */
  async getById(id: number): Promise<Category | undefined> {
    return this.hierarchyRepo.getById(id);
  }

  /**
   * Get category by name
   *
   * Retrieves a category by its exact name. Names are globally unique.
   *
   * @param name - The exact name of the category to find
   * @returns The category if found, undefined otherwise
   *
   * @example
   * const category = await repo.getByName('JavaScript');
   */
  async getByName(name: string): Promise<Category | undefined> {
    return this.hierarchyRepo.getByName(name);
  }

  /**
   * Get category by slug
   *
   * Retrieves a category by its URL-friendly slug. Slugs are globally unique.
   *
   * @param slug - The URL-friendly slug to search for
   * @returns The category if found, undefined otherwise
   *
   * @example
   * const category = await repo.getBySlug('javascript');
   */
  async getBySlug(slug: string): Promise<Category | undefined> {
    return this.hierarchyRepo.getBySlug(slug);
  }

  /**
   * Create a new category
   *
   * Validates slug uniqueness before creating the category.
   * Slugs must be globally unique across all categories.
   *
   * @param data - The category data to insert (must include name and slug)
   * @returns The newly created category with all columns populated
   * @throws {Error} If a category with the same slug already exists
   *
   * @example
   * const newCategory = await repo.create({
   *   name: 'JavaScript',
   *   slug: 'javascript'
   * });
   */
  async create(data: InsertCategory): Promise<Category> {
    return this.hierarchyRepo.create(data);
  }

  /**
   * Update a category
   *
   * Updates one or more fields of an existing category. Only the fields
   * provided in the data object will be modified.
   *
   * @param id - The primary key of the category to update
   * @param data - Partial category data containing only the fields to update
   * @returns The updated category with all columns populated
   * @throws {Error} If the category with the given ID does not exist
   *
   * @example
   * const updated = await repo.update(1, {
   *   name: 'JavaScript & TypeScript'
   * });
   */
  async update(id: number, data: Partial<InsertCategory>): Promise<Category> {
    return this.hierarchyRepo.update(id, data);
  }

  /**
   * Delete a category (with validation)
   *
   * Performs validation before deletion to prevent orphaned data:
   * 1. Checks if category has any associated resources
   * 2. Checks if category has any subcategories
   *
   * Only deletes if both validations pass.
   *
   * @param id - The primary key of the category to delete
   * @throws {Error} If category not found
   * @throws {Error} If category has associated resources
   * @throws {Error} If category has subcategories
   *
   * @example
   * // This will fail if the category has subcategories or resources
   * await repo.delete(1);
   */
  async delete(id: number): Promise<void> {
    return this.hierarchyRepo.delete(id);
  }

  /**
   * Get count of resources in this category
   *
   * Counts how many resources are assigned to this category.
   *
   * @param name - The category name to count resources for
   * @returns Number of resources in this category
   *
   * @example
   * const count = await repo.getResourceCount('JavaScript');
   */
  async getResourceCount(name: string): Promise<number> {
    return this.hierarchyRepo.getResourceCount(name);
  }
}
