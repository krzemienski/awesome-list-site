/**
 * ============================================================================
 * CATEGORY REPOSITORY - Category Hierarchy Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for category hierarchy operations.
 * It encapsulates all database queries related to the 3-level category hierarchy:
 * category → subcategory → sub-subcategory.
 *
 * KEY OPERATIONS:
 * - Categories: CRUD operations for top-level categories
 * - Subcategories: CRUD operations for second-level categories
 * - Sub-subcategories: CRUD operations for third-level categories
 * - Resource Counting: Get resource counts at each hierarchy level
 *
 * DESIGN NOTES:
 * - Enforces referential integrity (can't delete categories with resources)
 * - Validates slug uniqueness at each hierarchy level
 * - Uses Drizzle ORM for type-safe database operations
 * - Supports hierarchical queries and filtering
 * ============================================================================
 */

import {
  categories,
  subcategories,
  subSubcategories,
  resources,
  type Category,
  type InsertCategory,
  type Subcategory,
  type InsertSubcategory,
  type SubSubcategory,
  type InsertSubSubcategory,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql, asc } from "drizzle-orm";

/**
 * Repository class for category hierarchy database operations
 */
export class CategoryRepository {
  // =========================================================================
  // CATEGORY OPERATIONS
  // =========================================================================

  /**
   * List all categories
   * @returns Array of all categories ordered by name
   */
  async listCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  /**
   * Get a category by its ID
   * @param id - Category ID
   * @returns Category object or undefined if not found
   */
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  /**
   * Get a category by its name
   * @param name - Category name
   * @returns Category object or undefined if not found
   */
  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category;
  }

  /**
   * Get a category by its slug
   * @param slug - Category slug (URL-safe identifier)
   * @returns Category object or undefined if not found
   */
  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category;
  }

  /**
   * Create a new category
   * @param category - Category data to insert
   * @returns The created category
   * @throws Error if slug already exists
   */
  async createCategory(category: InsertCategory): Promise<Category> {
    // Check for slug uniqueness
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, category.slug));

    if (existing) {
      throw new Error(`Category with slug "${category.slug}" already exists`);
    }

    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  /**
   * Update an existing category
   * @param id - Category ID to update
   * @param category - Partial category data to update
   * @returns Updated category object
   */
  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  /**
   * Delete a category
   * @param id - Category ID to delete
   * @throws Error if category has resources or subcategories
   */
  async deleteCategory(id: number): Promise<void> {
    // Check if category has any resources
    const category = await this.getCategory(id);
    if (!category) {
      throw new Error('Category not found');
    }

    const resourceCount = await this.getCategoryResourceCount(category.name);
    if (resourceCount > 0) {
      throw new Error(`Cannot delete category "${category.name}" because it has ${resourceCount} resources`);
    }

    // Check if category has any subcategories
    const subcategoryList = await this.listSubcategories(id);
    if (subcategoryList.length > 0) {
      throw new Error(`Cannot delete category "${category.name}" because it has ${subcategoryList.length} subcategories`);
    }

    await db.delete(categories).where(eq(categories.id, id));
  }

  /**
   * Get the count of resources in a category
   * @param categoryName - Name of the category
   * @returns Number of resources in the category
   */
  async getCategoryResourceCount(categoryName: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.category, categoryName));
    return result?.count ?? 0;
  }

  // =========================================================================
  // SUBCATEGORY OPERATIONS
  // =========================================================================

  /**
   * List subcategories, optionally filtered by category
   * @param categoryId - Optional category ID to filter by
   * @returns Array of subcategories ordered by name
   */
  async listSubcategories(categoryId?: number): Promise<Subcategory[]> {
    let query = db.select().from(subcategories);

    if (categoryId) {
      query = query.where(eq(subcategories.categoryId, categoryId)) as any;
    }

    return await query.orderBy(asc(subcategories.name));
  }

  /**
   * Get a subcategory by its ID
   * @param id - Subcategory ID
   * @returns Subcategory object or undefined if not found
   */
  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    const [subcategory] = await db.select().from(subcategories).where(eq(subcategories.id, id));
    return subcategory;
  }

  /**
   * Get a subcategory by name and category
   * @param name - Subcategory name
   * @param categoryId - Parent category ID
   * @returns Subcategory object or undefined if not found
   */
  async getSubcategoryByName(name: string, categoryId: number): Promise<Subcategory | undefined> {
    const [subcategory] = await db
      .select()
      .from(subcategories)
      .where(and(eq(subcategories.name, name), eq(subcategories.categoryId, categoryId)));
    return subcategory;
  }

  /**
   * Create a new subcategory
   * @param subcategory - Subcategory data to insert
   * @returns The created subcategory
   * @throws Error if slug already exists in the same category
   */
  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    // Check for slug uniqueness within the same category
    if (subcategory.categoryId) {
      const [existing] = await db
        .select()
        .from(subcategories)
        .where(
          and(
            eq(subcategories.slug, subcategory.slug),
            eq(subcategories.categoryId, subcategory.categoryId)
          )
        );

      if (existing) {
        throw new Error(`Subcategory with slug "${subcategory.slug}" already exists in this category`);
      }
    }

    const [newSubcategory] = await db.insert(subcategories).values(subcategory).returning();
    return newSubcategory;
  }

  /**
   * Update an existing subcategory
   * @param id - Subcategory ID to update
   * @param subcategory - Partial subcategory data to update
   * @returns Updated subcategory object
   */
  async updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory> {
    const [updatedSubcategory] = await db
      .update(subcategories)
      .set(subcategory)
      .where(eq(subcategories.id, id))
      .returning();
    return updatedSubcategory;
  }

  /**
   * Delete a subcategory
   * @param id - Subcategory ID to delete
   * @throws Error if subcategory has resources or sub-subcategories
   */
  async deleteSubcategory(id: number): Promise<void> {
    // Check if subcategory has any resources
    const subcategory = await this.getSubcategory(id);
    if (!subcategory) {
      throw new Error('Subcategory not found');
    }

    const resourceCount = await this.getSubcategoryResourceCount(subcategory.name);
    if (resourceCount > 0) {
      throw new Error(`Cannot delete subcategory "${subcategory.name}" because it has ${resourceCount} resources`);
    }

    // Check if subcategory has any sub-subcategories
    const subSubcategoryList = await this.listSubSubcategories(id);
    if (subSubcategoryList.length > 0) {
      throw new Error(`Cannot delete subcategory "${subcategory.name}" because it has ${subSubcategoryList.length} sub-subcategories`);
    }

    await db.delete(subcategories).where(eq(subcategories.id, id));
  }

  /**
   * Get the count of resources in a subcategory
   * @param subcategoryName - Name of the subcategory
   * @returns Number of resources in the subcategory
   */
  async getSubcategoryResourceCount(subcategoryName: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.subcategory, subcategoryName));
    return result?.count ?? 0;
  }

  // =========================================================================
  // SUB-SUBCATEGORY OPERATIONS
  // =========================================================================

  /**
   * List sub-subcategories, optionally filtered by subcategory
   * @param subcategoryId - Optional subcategory ID to filter by
   * @returns Array of sub-subcategories ordered by name
   */
  async listSubSubcategories(subcategoryId?: number): Promise<SubSubcategory[]> {
    let query = db.select().from(subSubcategories);

    if (subcategoryId) {
      query = query.where(eq(subSubcategories.subcategoryId, subcategoryId)) as any;
    }

    return await query.orderBy(asc(subSubcategories.name));
  }

  /**
   * Get a sub-subcategory by its ID
   * @param id - Sub-subcategory ID
   * @returns Sub-subcategory object or undefined if not found
   */
  async getSubSubcategory(id: number): Promise<SubSubcategory | undefined> {
    const [subSubcategory] = await db.select().from(subSubcategories).where(eq(subSubcategories.id, id));
    return subSubcategory;
  }

  /**
   * Get a sub-subcategory by name and subcategory
   * @param name - Sub-subcategory name
   * @param subcategoryId - Parent subcategory ID
   * @returns Sub-subcategory object or undefined if not found
   */
  async getSubSubcategoryByName(name: string, subcategoryId: number): Promise<SubSubcategory | undefined> {
    const [subSubcategory] = await db
      .select()
      .from(subSubcategories)
      .where(and(eq(subSubcategories.name, name), eq(subSubcategories.subcategoryId, subcategoryId)));
    return subSubcategory;
  }

  /**
   * Create a new sub-subcategory
   * @param subSubcategory - Sub-subcategory data to insert
   * @returns The created sub-subcategory
   * @throws Error if slug already exists in the same subcategory
   */
  async createSubSubcategory(subSubcategory: InsertSubSubcategory): Promise<SubSubcategory> {
    // Check for slug uniqueness within the same subcategory
    if (subSubcategory.subcategoryId) {
      const [existing] = await db
        .select()
        .from(subSubcategories)
        .where(
          and(
            eq(subSubcategories.slug, subSubcategory.slug),
            eq(subSubcategories.subcategoryId, subSubcategory.subcategoryId)
          )
        );

      if (existing) {
        throw new Error(`Sub-subcategory with slug "${subSubcategory.slug}" already exists in this subcategory`);
      }
    }

    const [newSubSubcategory] = await db.insert(subSubcategories).values(subSubcategory).returning();
    return newSubSubcategory;
  }

  /**
   * Update an existing sub-subcategory
   * @param id - Sub-subcategory ID to update
   * @param subSubcategory - Partial sub-subcategory data to update
   * @returns Updated sub-subcategory object
   */
  async updateSubSubcategory(id: number, subSubcategory: Partial<InsertSubSubcategory>): Promise<SubSubcategory> {
    const [updatedSubSubcategory] = await db
      .update(subSubcategories)
      .set(subSubcategory)
      .where(eq(subSubcategories.id, id))
      .returning();
    return updatedSubSubcategory;
  }

  /**
   * Delete a sub-subcategory
   * @param id - Sub-subcategory ID to delete
   * @throws Error if sub-subcategory has resources
   */
  async deleteSubSubcategory(id: number): Promise<void> {
    // Check if sub-subcategory has any resources
    const subSubcategory = await this.getSubSubcategory(id);
    if (!subSubcategory) {
      throw new Error('Sub-subcategory not found');
    }

    const resourceCount = await this.getSubSubcategoryResourceCount(subSubcategory.name);
    if (resourceCount > 0) {
      throw new Error(`Cannot delete sub-subcategory "${subSubcategory.name}" because it has ${resourceCount} resources`);
    }

    await db.delete(subSubcategories).where(eq(subSubcategories.id, id));
  }

  /**
   * Get the count of resources in a sub-subcategory
   * @param subSubcategoryName - Name of the sub-subcategory
   * @returns Number of resources in the sub-subcategory
   */
  async getSubSubcategoryResourceCount(subSubcategoryName: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.subSubcategory, subSubcategoryName));
    return result?.count ?? 0;
  }
}
