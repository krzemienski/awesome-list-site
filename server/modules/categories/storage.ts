/**
 * ============================================================================
 * CATEGORIES MODULE STORAGE - Category hierarchy database operations
 * ============================================================================
 *
 * This module provides the data access layer for category hierarchy operations.
 * It implements the ICategoryStorage interface with Drizzle ORM and PostgreSQL.
 *
 * DESIGN PATTERN:
 * - Interface-based: ICategoryStorage defines all category operations
 * - Modular: Separated from main storage for better organization
 * - Transaction-safe: Uses Drizzle's transaction support
 *
 * KEY OPERATIONS:
 * - Categories: CRUD operations for top-level categories
 * - Subcategories: CRUD operations for second-level categories
 * - Sub-subcategories: CRUD operations for third-level categories
 * - Resource counting: Get resource counts at each hierarchy level
 *
 * HIERARCHY STRUCTURE:
 * - Category (Level 1): Top-level groupings (e.g., "Infrastructure & Delivery")
 * - Subcategory (Level 2): Refinements (e.g., "CDN & Edge Delivery")
 * - Sub-subcategory (Level 3): Specific topics (e.g., "Multi-CDN Solutions")
 *
 * This module is part of the modularized architecture migration.
 * See /docs/ARCHITECTURE.md for data flow diagrams.
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
import { db } from "../../db";
import { eq, and, sql, asc } from "drizzle-orm";

/**
 * Storage interface for category hierarchy operations
 */
export interface ICategoryStorage {
  // Category management
  listCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  getCategoryResourceCount(categoryName: string): Promise<number>;

  // Subcategory management
  listSubcategories(categoryId?: number): Promise<Subcategory[]>;
  getSubcategory(id: number): Promise<Subcategory | undefined>;
  getSubcategoryByName(name: string, categoryId: number): Promise<Subcategory | undefined>;
  createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory>;
  updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory>;
  deleteSubcategory(id: number): Promise<void>;
  getSubcategoryResourceCount(subcategoryName: string): Promise<number>;

  // Sub-subcategory management
  listSubSubcategories(subcategoryId?: number): Promise<SubSubcategory[]>;
  getSubSubcategory(id: number): Promise<SubSubcategory | undefined>;
  getSubSubcategoryByName(name: string, subcategoryId: number): Promise<SubSubcategory | undefined>;
  createSubSubcategory(subSubcategory: InsertSubSubcategory): Promise<SubSubcategory>;
  updateSubSubcategory(id: number, subSubcategory: Partial<InsertSubSubcategory>): Promise<SubSubcategory>;
  deleteSubSubcategory(id: number): Promise<void>;
  getSubSubcategoryResourceCount(subSubcategoryName: string): Promise<number>;
}

/**
 * Implementation of category hierarchy storage operations
 */
export class CategoryStorage implements ICategoryStorage {
  // ============================================================================
  // CATEGORY MANAGEMENT
  // ============================================================================

  /**
   * List all top-level categories
   * @returns Array of categories ordered by name
   */
  async listCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  /**
   * Get a category by ID
   * @param id - Category ID
   * @returns Category or undefined if not found
   */
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  /**
   * Get a category by name
   * @param name - Category name
   * @returns Category or undefined if not found
   */
  async getCategoryByName(name: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.name, name));
    return category;
  }

  /**
   * Get a category by slug
   * @param slug - Category slug (URL-friendly name)
   * @returns Category or undefined if not found
   */
  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category;
  }

  /**
   * Create a new category
   * @param category - Category data to insert
   * @returns Created category
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
   * @param id - Category ID
   * @param category - Partial category data to update
   * @returns Updated category
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
   * @param id - Category ID
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
    const subcategoriesList = await this.listSubcategories(id);
    if (subcategoriesList.length > 0) {
      throw new Error(`Cannot delete category "${category.name}" because it has ${subcategoriesList.length} subcategories`);
    }

    await db.delete(categories).where(eq(categories.id, id));
  }

  /**
   * Get resource count for a category
   * @param categoryName - Category name
   * @returns Number of resources in this category
   */
  async getCategoryResourceCount(categoryName: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.category, categoryName));
    return result?.count ?? 0;
  }

  // ============================================================================
  // SUBCATEGORY MANAGEMENT
  // ============================================================================

  /**
   * List subcategories
   * @param categoryId - Optional parent category ID to filter by
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
   * Get a subcategory by ID
   * @param id - Subcategory ID
   * @returns Subcategory or undefined if not found
   */
  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    const [subcategory] = await db.select().from(subcategories).where(eq(subcategories.id, id));
    return subcategory;
  }

  /**
   * Get a subcategory by name within a category
   * @param name - Subcategory name
   * @param categoryId - Parent category ID
   * @returns Subcategory or undefined if not found
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
   * @returns Created subcategory
   * @throws Error if slug already exists in this category
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
   * @param id - Subcategory ID
   * @param subcategory - Partial subcategory data to update
   * @returns Updated subcategory
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
   * @param id - Subcategory ID
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
    const subSubcategoriesList = await this.listSubSubcategories(id);
    if (subSubcategoriesList.length > 0) {
      throw new Error(`Cannot delete subcategory "${subcategory.name}" because it has ${subSubcategoriesList.length} sub-subcategories`);
    }

    await db.delete(subcategories).where(eq(subcategories.id, id));
  }

  /**
   * Get resource count for a subcategory
   * @param subcategoryName - Subcategory name
   * @returns Number of resources in this subcategory
   */
  async getSubcategoryResourceCount(subcategoryName: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.subcategory, subcategoryName));
    return result?.count ?? 0;
  }

  // ============================================================================
  // SUB-SUBCATEGORY MANAGEMENT
  // ============================================================================

  /**
   * List sub-subcategories
   * @param subcategoryId - Optional parent subcategory ID to filter by
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
   * Get a sub-subcategory by ID
   * @param id - Sub-subcategory ID
   * @returns Sub-subcategory or undefined if not found
   */
  async getSubSubcategory(id: number): Promise<SubSubcategory | undefined> {
    const [subSubcategory] = await db.select().from(subSubcategories).where(eq(subSubcategories.id, id));
    return subSubcategory;
  }

  /**
   * Get a sub-subcategory by name within a subcategory
   * @param name - Sub-subcategory name
   * @param subcategoryId - Parent subcategory ID
   * @returns Sub-subcategory or undefined if not found
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
   * @returns Created sub-subcategory
   * @throws Error if slug already exists in this subcategory
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
   * @param id - Sub-subcategory ID
   * @param subSubcategory - Partial sub-subcategory data to update
   * @returns Updated sub-subcategory
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
   * @param id - Sub-subcategory ID
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
   * Get resource count for a sub-subcategory
   * @param subSubcategoryName - Sub-subcategory name
   * @returns Number of resources in this sub-subcategory
   */
  async getSubSubcategoryResourceCount(subSubcategoryName: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.subSubcategory, subSubcategoryName));
    return result?.count ?? 0;
  }
}

/**
 * Singleton instance of category storage
 * Used across the application for all category hierarchy operations
 */
export const categoryStorage = new CategoryStorage();
