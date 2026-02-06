/**
 * ============================================================================
 * HIERARCHY REPOSITORY - Generic CRUD Operations for Hierarchical Entities
 * ============================================================================
 *
 * This repository provides type-safe CRUD operations for hierarchical data
 * structures (categories, subcategories, sub-subcategories).
 *
 * DESIGN PATTERN:
 * - Generic repository pattern with TypeScript generics
 * - Supports both root entities (no parent) and child entities (with parentId)
 * - Enforces slug uniqueness (global for root, scoped to parent for children)
 * - Validates relationships before deletion (checks resources and children)
 *
 * TYPE PARAMETERS:
 * - TEntity: The full entity type (e.g., Category, Subcategory)
 * - TInsert: The insert type for creating new entities
 *
 * USAGE:
 * ```typescript
 * const categoryRepo = new HierarchyRepository<Category, InsertCategory>(
 *   db,
 *   categories,
 *   {
 *     idColumn: categories.id,
 *     nameColumn: categories.name,
 *     slugColumn: categories.slug,
 *     resourceColumn: resources.category,
 *   }
 * );
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, and, sql, asc } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import { resources } from "@shared/schema";

/**
 * Configuration for HierarchyRepository
 *
 * Defines the column mappings and validation functions needed for the repository
 * to perform CRUD operations on hierarchical entities.
 *
 * @template TTable - The Drizzle ORM table type
 * @property {PgColumn} idColumn - The primary key column of the entity table
 * @property {PgColumn} nameColumn - The name column used for display and lookups
 * @property {PgColumn} slugColumn - The URL-friendly slug column (must be unique within scope)
 * @property {PgColumn} [parentIdColumn] - Foreign key to parent entity. Omit for root-level entities.
 * @property {PgColumn} [resourceColumn] - Column in resources table that references this entity type
 * @property {Function} [checkChildrenFn] - Function to check if entity has child entities (prevents deletion)
 */
export interface HierarchyRepositoryConfig<TTable extends PgTable> {
  /** The ID column of the entity table */
  idColumn: TTable["_"]["columns"][string];
  /** The name column of the entity table */
  nameColumn: TTable["_"]["columns"][string];
  /** The slug column of the entity table */
  slugColumn: TTable["_"]["columns"][string];
  /** The parent ID column (e.g., categoryId, subcategoryId). Undefined for root entities. */
  parentIdColumn?: TTable["_"]["columns"][string];
  /** The column in the resources table (e.g., resources.category, resources.subcategory) */
  resourceColumn?: PgColumn;
  /** Function to check if entity has children (e.g., subcategories for a category) */
  checkChildrenFn?: (entityId: number) => Promise<{ count: number; childType: string }>;
}

/**
 * Generic repository for hierarchical CRUD operations
 *
 * Provides type-safe database operations for entities organized in a hierarchy.
 * Handles slug uniqueness, parent-child relationships, and cascading validations.
 *
 * @template TEntity - The full entity type with all columns (e.g., Category)
 * @template TInsert - The insert type for creating new entities (e.g., InsertCategory)
 */
export class HierarchyRepository<
  TEntity extends Record<string, any>,
  TInsert extends Record<string, any>
> {
  /**
   * Creates a new HierarchyRepository instance
   *
   * @param db - Drizzle database instance
   * @param table - The Drizzle table schema for this entity type
   * @param config - Column mappings and validation configuration
   */
  constructor(
    private db: typeof dbInstance,
    private table: PgTable,
    private config: HierarchyRepositoryConfig<any>
  ) {}

  /**
   * List all entities, optionally filtered by parent ID
   *
   * Returns entities ordered by name (ascending). For child entities,
   * provide parentId to filter results to a specific parent.
   *
   * @param parentId - Optional parent ID to filter by (ignored for root entities)
   * @returns Array of entities matching the filter criteria
   *
   * @example
   * // List all categories (root entities)
   * const categories = await repo.list();
   *
   * // List subcategories under a specific category
   * const subcategories = await repo.list(categoryId);
   */
  async list(parentId?: number): Promise<TEntity[]> {
    let query = this.db.select().from(this.table);

    if (parentId !== undefined && this.config.parentIdColumn) {
      query = query.where(eq(this.config.parentIdColumn, parentId)) as any;
    }

    return (await query.orderBy(asc(this.config.nameColumn))) as TEntity[];
  }

  /**
   * Get entity by ID
   *
   * Retrieves a single entity by its primary key.
   *
   * @param id - The primary key of the entity to retrieve
   * @returns The entity if found, undefined otherwise
   */
  async getById(id: number): Promise<TEntity | undefined> {
    const [entity] = await this.db
      .select()
      .from(this.table)
      .where(eq(this.config.idColumn, id));
    return entity as TEntity | undefined;
  }

  /**
   * Get entity by name, optionally scoped to parent
   *
   * For root entities, searches globally by name. For child entities,
   * provide parentId to scope the search within that parent.
   *
   * @param name - The exact name of the entity to find
   * @param parentId - Optional parent ID to scope the search (for child entities)
   * @returns The entity if found, undefined otherwise
   */
  async getByName(name: string, parentId?: number): Promise<TEntity | undefined> {
    const conditions = [eq(this.config.nameColumn, name)];

    if (parentId !== undefined && this.config.parentIdColumn) {
      conditions.push(eq(this.config.parentIdColumn, parentId));
    }

    const [entity] = await this.db
      .select()
      .from(this.table)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    return entity as TEntity | undefined;
  }

  /**
   * Get entity by slug, optionally scoped to parent
   *
   * Slugs are URL-friendly identifiers. For root entities, slugs must be
   * globally unique. For child entities, slugs must be unique within their parent.
   *
   * @param slug - The URL-friendly slug to search for
   * @param parentId - Optional parent ID to scope the search (for child entities)
   * @returns The entity if found, undefined otherwise
   */
  async getBySlug(slug: string, parentId?: number): Promise<TEntity | undefined> {
    const conditions = [eq(this.config.slugColumn, slug)];

    if (parentId !== undefined && this.config.parentIdColumn) {
      conditions.push(eq(this.config.parentIdColumn, parentId));
    }

    const [entity] = await this.db
      .select()
      .from(this.table)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    return entity as TEntity | undefined;
  }

  /**
   * Create a new entity
   *
   * Validates slug uniqueness before creating the entity:
   * - For root entities: slug must be globally unique
   * - For child entities: slug must be unique within the parent
   *
   * @param data - The entity data to insert (must include all required fields)
   * @returns The newly created entity with all columns populated
   * @throws {Error} If an entity with the same slug already exists in the same scope
   *
   * @example
   * const newCategory = await repo.create({
   *   name: "Programming Languages",
   *   slug: "programming-languages",
   *   description: "Resources for learning programming languages"
   * });
   */
  async create(data: TInsert): Promise<TEntity> {
    // Check for slug uniqueness
    const slugValue = (data as any)[this.config.slugColumn.name];
    const parentIdValue = this.config.parentIdColumn
      ? (data as any)[this.config.parentIdColumn.name]
      : undefined;

    const conditions = [eq(this.config.slugColumn, slugValue)];

    // For child entities, check uniqueness within the same parent
    if (parentIdValue !== undefined && this.config.parentIdColumn) {
      conditions.push(eq(this.config.parentIdColumn, parentIdValue));
    }

    const [existing] = await this.db
      .select()
      .from(this.table)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    if (existing) {
      const scope = parentIdValue !== undefined ? " in this parent" : "";
      throw new Error(
        `Entity with slug "${slugValue}" already exists${scope}`
      );
    }

    const [newEntity] = await this.db
      .insert(this.table)
      .values(data)
      .returning();

    return newEntity as TEntity;
  }

  /**
   * Update an entity
   *
   * Updates one or more fields of an existing entity. Only the fields
   * provided in the data object will be modified.
   *
   * @param id - The primary key of the entity to update
   * @param data - Partial entity data containing only the fields to update
   * @returns The updated entity with all columns populated
   * @throws {Error} If the entity with the given ID does not exist
   */
  async update(id: number, data: Partial<TInsert>): Promise<TEntity> {
    const [updatedEntity] = await this.db
      .update(this.table)
      .set(data)
      .where(eq(this.config.idColumn, id))
      .returning();

    return updatedEntity as TEntity;
  }

  /**
   * Delete an entity (with validation)
   *
   * Performs validation before deletion to prevent orphaned data:
   * 1. Checks if entity has any associated resources
   * 2. Checks if entity has any child entities (via checkChildrenFn)
   *
   * Only deletes if both validations pass.
   *
   * @param id - The primary key of the entity to delete
   * @throws {Error} If entity not found
   * @throws {Error} If entity has associated resources
   * @throws {Error} If entity has child entities
   *
   * @example
   * // This will fail if the category has subcategories or resources
   * await categoryRepo.delete(categoryId);
   */
  async delete(id: number): Promise<void> {
    // Get the entity to check its name
    const entity = await this.getById(id);
    if (!entity) {
      throw new Error("Entity not found");
    }

    const entityName = entity[this.config.nameColumn.name];

    // Check if entity has any resources
    if (this.config.resourceColumn) {
      const resourceCount = await this.getResourceCount(entityName);
      if (resourceCount > 0) {
        throw new Error(
          `Cannot delete "${entityName}" because it has ${resourceCount} resources`
        );
      }
    }

    // Check if entity has any children
    if (this.config.checkChildrenFn) {
      const childCheck = await this.config.checkChildrenFn(id);
      if (childCheck.count > 0) {
        throw new Error(
          `Cannot delete "${entityName}" because it has ${childCheck.count} ${childCheck.childType}`
        );
      }
    }

    await this.db.delete(this.table).where(eq(this.config.idColumn, id));
  }

  /**
   * Get count of resources associated with this entity
   *
   * Counts how many resources reference this entity in the configured
   * resourceColumn. Returns 0 if no resourceColumn is configured.
   *
   * @param name - The entity name to count resources for
   * @returns Number of resources associated with this entity
   *
   * @example
   * // Count resources in the "JavaScript" category
   * const count = await categoryRepo.getResourceCount("JavaScript");
   */
  async getResourceCount(name: string): Promise<number> {
    if (!this.config.resourceColumn) {
      return 0;
    }

    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(this.config.resourceColumn, name));

    return result?.count ?? 0;
  }
}
