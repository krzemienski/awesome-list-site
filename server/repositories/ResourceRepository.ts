/**
 * ============================================================================
 * RESOURCE REPOSITORY - CRUD Operations for Resources
 * ============================================================================
 *
 * This repository provides type-safe CRUD operations for learning resources.
 * It handles resource lifecycle management including creation, updates, approval
 * workflow, and filtering.
 *
 * DESIGN PATTERN:
 * - Repository pattern with TypeScript for type safety
 * - Supports filtering by status, category, search terms, and user
 * - Implements approval workflow (pending → approved/rejected)
 * - Enforces URL uniqueness to prevent duplicate resources
 *
 * KEY FEATURES:
 * - Paginated listing with flexible filtering options
 * - Status management (pending, approved, rejected, archived)
 * - URL uniqueness validation
 * - Approval workflow with audit trail (approvedBy, approvedAt)
 * - Search functionality across title and description
 *
 * USAGE:
 * ```typescript
 * const resourceRepo = new ResourceRepository(db);
 *
 * // List resources with filtering
 * const { resources, total } = await resourceRepo.list({
 *   status: 'approved',
 *   category: 'JavaScript',
 *   page: 1,
 *   limit: 20
 * });
 *
 * // Approve a pending resource
 * const approved = await resourceRepo.updateStatus(
 *   resourceId,
 *   'approved',
 *   userId
 * );
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, and, sql, desc, like, or, inArray } from "drizzle-orm";
import {
  resources,
  type Resource,
  type InsertResource,
} from "@shared/schema";

/**
 * Options for filtering resources in list queries
 */
export interface ListResourceOptions {
  /** Page number for pagination (1-indexed) */
  page?: number;
  /** Number of resources per page */
  limit?: number;
  /** Filter by resource status (pending, approved, rejected, archived) */
  status?: string;
  /** Filter by category name */
  category?: string;
  /** Filter by subcategory name */
  subcategory?: string;
  /** Filter by user ID who submitted the resource */
  userId?: string;
  /** Search term to match against title and description */
  search?: string;
}

/**
 * Repository for resource CRUD operations
 *
 * Provides type-safe database operations for learning resources with
 * support for filtering, pagination, approval workflow, and validation.
 */
export class ResourceRepository {
  /**
   * Creates a new ResourceRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {}

  /**
   * List resources with optional filtering and pagination
   *
   * Returns a paginated list of resources matching the provided filter criteria.
   * Results are ordered by creation date (newest first).
   *
   * @param options - Filtering and pagination options
   * @returns Object containing resources array and total count
   *
   * @example
   * // Get first page of approved JavaScript resources
   * const result = await repo.list({
   *   status: 'approved',
   *   category: 'JavaScript',
   *   page: 1,
   *   limit: 20
   * });
   *
   * // Search across all resources
   * const searchResults = await repo.list({
   *   search: 'react hooks',
   *   page: 1,
   *   limit: 10
   * });
   */
  async list(
    options: ListResourceOptions = {}
  ): Promise<{ resources: Resource[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      subcategory,
      userId,
      search,
    } = options;

    // Build filter conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(resources.status, status));
    }

    if (category) {
      conditions.push(eq(resources.category, category));
    }

    if (subcategory) {
      conditions.push(eq(resources.subcategory, subcategory));
    }

    if (userId) {
      conditions.push(eq(resources.submittedBy, userId));
    }

    if (search) {
      conditions.push(
        or(
          like(resources.title, `%${search}%`),
          like(resources.description, `%${search}%`)
        )!
      );
    }

    // Build WHERE clause
    const whereClause =
      conditions.length > 0
        ? conditions.length === 1
          ? conditions[0]
          : and(...conditions)
        : undefined;

    // Get total count
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    // Get paginated resources
    const offset = (page - 1) * limit;
    let query = this.db
      .select()
      .from(resources)
      .orderBy(desc(resources.createdAt))
      .limit(limit)
      .offset(offset);

    if (whereClause) {
      query = query.where(whereClause) as any;
    }

    const resourceList = await query;

    return {
      resources: resourceList,
      total,
    };
  }

  /**
   * Get total count of resources
   *
   * Returns the total number of resources in the database, regardless of status.
   *
   * @returns Total number of resources
   */
  async getCount(): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources);

    return result?.count ?? 0;
  }

  /**
   * Get resource by ID
   *
   * Retrieves a single resource by its primary key.
   *
   * @param id - The primary key of the resource to retrieve
   * @returns The resource if found, undefined otherwise
   */
  async getById(id: number): Promise<Resource | undefined> {
    const [resource] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.id, id));

    return resource;
  }

  /**
   * Get resource by URL
   *
   * Retrieves a resource by its URL. Useful for checking if a URL
   * has already been submitted to prevent duplicates.
   *
   * @param url - The exact URL to search for
   * @returns The resource if found, undefined otherwise
   */
  async getByUrl(url: string): Promise<Resource | undefined> {
    const [resource] = await this.db
      .select()
      .from(resources)
      .where(eq(resources.url, url));

    return resource;
  }

  /**
   * Create a new resource
   *
   * Validates URL uniqueness before creating the resource.
   * The URL must be unique across all resources.
   *
   * @param data - The resource data to insert (must include required fields)
   * @returns The newly created resource with all columns populated
   * @throws {Error} If a resource with the same URL already exists
   *
   * @example
   * const newResource = await repo.create({
   *   title: "React Documentation",
   *   url: "https://react.dev",
   *   description: "Official React documentation",
   *   category: "JavaScript",
   *   subcategory: "React",
   *   status: "pending",
   *   submittedBy: userId
   * });
   */
  async create(data: InsertResource): Promise<Resource> {
    // Check for URL uniqueness
    const existing = await this.getByUrl(data.url);
    if (existing) {
      throw new Error(`Resource with URL "${data.url}" already exists`);
    }

    const [newResource] = await this.db
      .insert(resources)
      .values(data)
      .returning();

    return newResource;
  }

  /**
   * Update a resource
   *
   * Updates one or more fields of an existing resource. Only the fields
   * provided in the data object will be modified. The updatedAt timestamp
   * is automatically updated.
   *
   * @param id - The primary key of the resource to update
   * @param data - Partial resource data containing only the fields to update
   * @returns The updated resource with all columns populated
   * @throws {Error} If the resource with the given ID does not exist
   *
   * @example
   * // Update just the description
   * const updated = await repo.update(resourceId, {
   *   description: "Updated description"
   * });
   */
  async update(id: number, data: Partial<InsertResource>): Promise<Resource> {
    const [updatedResource] = await this.db
      .update(resources)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id))
      .returning();

    if (!updatedResource) {
      throw new Error(`Resource with ID ${id} not found`);
    }

    return updatedResource;
  }

  /**
   * Update resource status (for approval workflow)
   *
   * Changes the status of a resource and optionally records who approved it.
   * This is the primary method for the approval workflow:
   * - pending → approved (with approvedBy user ID)
   * - pending → rejected
   * - approved → archived
   *
   * When approving a resource (status = 'approved'), automatically sets
   * approvedBy and approvedAt fields.
   *
   * @param id - The primary key of the resource to update
   * @param status - The new status (approved, rejected, archived, etc.)
   * @param approvedBy - Optional user ID who performed the status change
   * @returns The updated resource with all columns populated
   * @throws {Error} If the resource with the given ID does not exist
   *
   * @example
   * // Approve a pending resource
   * const approved = await repo.updateStatus(
   *   resourceId,
   *   'approved',
   *   adminUserId
   * );
   *
   * // Reject a pending resource
   * const rejected = await repo.updateStatus(
   *   resourceId,
   *   'rejected',
   *   adminUserId
   * );
   */
  async updateStatus(
    id: number,
    status: string,
    approvedBy?: string
  ): Promise<Resource> {
    const updateData: Partial<Resource> = {
      status,
      updatedAt: new Date(),
    };

    // If approving, set approval metadata
    if (status === "approved" && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }

    const [updatedResource] = await this.db
      .update(resources)
      .set(updateData)
      .where(eq(resources.id, id))
      .returning();

    if (!updatedResource) {
      throw new Error(`Resource with ID ${id} not found`);
    }

    return updatedResource;
  }

  /**
   * Delete a resource
   *
   * Permanently removes a resource from the database. This operation
   * cannot be undone. Consider using status = 'archived' instead for
   * soft deletion.
   *
   * @param id - The primary key of the resource to delete
   * @throws {Error} If the resource with the given ID does not exist
   *
   * @example
   * await repo.delete(resourceId);
   */
  async delete(id: number): Promise<void> {
    const result = await this.db
      .delete(resources)
      .where(eq(resources.id, id))
      .returning();

    if (result.length === 0) {
      throw new Error(`Resource with ID ${id} not found`);
    }
  }

  /**
   * Get pending resources for approval
   *
   * Returns all resources with status = 'pending', ordered by creation date
   * (oldest first) so admins can review them in submission order.
   *
   * @returns Object containing pending resources array and total count
   *
   * @example
   * const { resources: pending, total } = await repo.getPendingResources();
   */
  async getPendingResources(): Promise<{
    resources: Resource[];
    total: number;
  }> {
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.status, "pending"));

    const total = countResult?.count ?? 0;

    const resourceList = await this.db
      .select()
      .from(resources)
      .where(eq(resources.status, "pending"))
      .orderBy(resources.createdAt); // Oldest first for review

    return {
      resources: resourceList,
      total,
    };
  }

  /**
   * Approve a resource
   *
   * Convenience method for approving a pending resource. Updates status
   * to 'approved' and records the approver and approval timestamp.
   *
   * @param id - The primary key of the resource to approve
   * @param approvedBy - User ID of the person approving the resource
   * @returns The approved resource with all columns populated
   * @throws {Error} If the resource with the given ID does not exist
   *
   * @example
   * const approved = await repo.approve(resourceId, adminUserId);
   */
  async approve(id: number, approvedBy: string): Promise<Resource> {
    return this.updateStatus(id, "approved", approvedBy);
  }

  /**
   * Reject a resource
   *
   * Convenience method for rejecting a pending resource. Updates status
   * to 'rejected'. Note: This does not store a rejection reason - use
   * the audit log for detailed rejection tracking.
   *
   * @param id - The primary key of the resource to reject
   * @returns The rejected resource with all columns populated
   * @throws {Error} If the resource with the given ID does not exist
   *
   * @example
   * const rejected = await repo.reject(resourceId);
   */
  async reject(id: number): Promise<Resource> {
    return this.updateStatus(id, "rejected");
  }
}
