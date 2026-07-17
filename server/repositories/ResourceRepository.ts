/**
 * ============================================================================
 * RESOURCE REPOSITORY - Resource Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for resource operations.
 * It encapsulates all database queries related to resources including
 * CRUD operations, status management, and approval workflows.
 *
 * KEY OPERATIONS:
 * - listResources: Paginated resource listing with filtering
 * - getResource: Retrieve resource by ID or URL
 * - createResource: Create new resource with audit logging
 * - updateResource: Update resource with audit logging
 * - deleteResource: Delete resource with audit logging
 * - getPendingResources: Get resources awaiting approval
 * - approveResource: Approve pending resource
 * - rejectResource: Reject pending resource with reason
 *
 * DESIGN NOTES:
 * - All modifications are logged to resource_audit_log table
 * - Status transitions: pending → approved/rejected
 * - Supports filtering by status, category, subcategory, user, and search
 * - Uses Drizzle ORM for type-safe database operations
 * ============================================================================
 */

import {
  resources,
  resourceAuditLog,
  resourceEdits,
  researchDiscoveries,
  users,
  type Resource,
  type InsertResource,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql, asc, desc, like, ilike, or, inArray } from "drizzle-orm";

/**
 * Options for listing resources with filtering and pagination
 */
export interface ListResourceOptions {
  page?: number;
  offset?: number;
  limit?: number;
  status?: string;
  category?: string;
  subcategory?: string;
  subSubcategory?: string;
  userId?: string;
  search?: string;
  /** R3-H08: whitelisted sort order; unknown/absent falls back to newest-first. */
  sort?: "name-asc" | "name-desc" | "newest" | "oldest";
}

/**
 * Repository class for resource-related database operations
 */
export class ResourceRepository {
  /**
   * List resources with filtering and pagination
   * @param options - Filter and pagination options
   * @returns Object containing resources array and total count
   */
  async listResources(options: ListResourceOptions): Promise<{ resources: Resource[]; total: number }> {
    const { page = 1, limit = 20, status, category, subcategory, subSubcategory, userId, search, sort } = options;
    const offset = options.offset ?? ((page - 1) * limit);

    let query = db.select().from(resources).$dynamic();
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(resources).$dynamic();

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

    if (subSubcategory) {
      conditions.push(eq(resources.subSubcategory, subSubcategory));
    }

    if (userId) {
      conditions.push(eq(resources.submittedBy, userId));
    }

    if (search) {
      // Run16 BUG-044: %, _ and \ are LIKE metacharacters — a search for "___"
      // used to match EVERY 3+-char row (66KB response). Escape them so the
      // user's literal text is what gets matched (PG default escape is \).
      const escapedSearch = search.replace(/[\\%_]/g, (m) => `\\${m}`);
      conditions.push(
        or(
          ilike(resources.title, `%${escapedSearch}%`),
          ilike(resources.description, `%${escapedSearch}%`),
          ilike(resources.url, `%${escapedSearch}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    // R3-H08: server-side sort. Title sorts are case-insensitive; id is a
    // deterministic tiebreaker (createdAt is identical for bulk-seeded rows).
    const orderBy = (() => {
      switch (sort) {
        case "name-asc":
          return [asc(sql`lower(${resources.title})`), asc(resources.id)];
        case "name-desc":
          return [desc(sql`lower(${resources.title})`), desc(resources.id)];
        case "oldest":
          return [asc(resources.createdAt), asc(resources.id)];
        case "newest":
        default:
          return [desc(resources.createdAt), desc(resources.id)];
      }
    })();

    const [totalResult] = await countQuery;
    const resourceList = await query
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    return { resources: resourceList, total: totalResult.count };
  }

  /**
   * Get a resource by its ID
   * @param id - Resource ID
   * @returns Resource object or undefined if not found
   */
  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }

  /**
   * Get a resource by its URL
   * @param url - Resource URL
   * @returns Resource object or undefined if not found
   */
  async getResourceByUrl(url: string): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.url, url));
    return resource;
  }

  /**
   * Get total count of all resources
   * @returns Total number of resources in database
   */
  async getResourceCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(resources);
    return result.count;
  }

  /**
   * Create a new resource
   * Automatically logs the creation to audit log
   * @param resource - Resource data to create
   * @returns The created resource
   */
  async createResource(resource: InsertResource): Promise<Resource> {
    const [newResource] = await db.insert(resources).values(resource).returning();

    // Log the creation
    await this.logResourceAudit(newResource.id, 'created', resource.submittedBy ?? undefined);

    return newResource;
  }

  /**
   * Update an existing resource
   * Automatically logs the update to audit log
   * @param id - Resource ID to update
   * @param resource - Partial resource data to update
   * @returns The updated resource
   */
  async updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource> {
    const [updatedResource] = await db
      .update(resources)
      .set({ ...resource, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning();

    // Log the update
    await this.logResourceAudit(id, 'updated', resource.submittedBy ?? undefined, resource);

    return updatedResource;
  }

  /**
   * Bulk-mark resources as synced to GitHub in a single UPDATE.
   * Replaces the previous per-resource Promise.all pattern, which opened
   * thousands of parallel connections and exhausted the pg pool
   * ("timeout exceeded when trying to connect") on large exports.
   * @param ids - Resource IDs to flag as synced
   * @param syncedAt - Timestamp to record as lastSyncedAt
   */
  async markResourcesSynced(ids: number[], syncedAt: Date = new Date()): Promise<void> {
    if (ids.length === 0) return;
    const CHUNK = 5000;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      await db
        .update(resources)
        .set({ githubSynced: true, lastSyncedAt: syncedAt, updatedAt: syncedAt })
        .where(inArray(resources.id, chunk));
    }
  }

  /**
   * Update resource status (pending/approved/rejected)
   * When approving, sets approvedBy and approvedAt fields
   * @param id - Resource ID to update
   * @param status - New status value
   * @param approvedBy - User ID who approved (optional)
   * @returns The updated resource
   */
  async updateResourceStatus(id: number, status: string, approvedBy?: string): Promise<Resource> {
    const updateData: Partial<typeof resources.$inferInsert> = { status, updatedAt: new Date() };

    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    }

    const [updatedResource] = await db
      .update(resources)
      .set(updateData)
      .where(eq(resources.id, id))
      .returning();

    // Log the status change
    await this.logResourceAudit(id, status, approvedBy, { status });

    return updatedResource;
  }

  /**
   * Delete a resource
   * Logs deletion to audit log before removing the resource
   * @param id - Resource ID to delete
   * @throws Error if resource not found
   */
  async deleteResource(id: number, performedBy?: string): Promise<void> {
    // Get resource before deletion for audit log
    const resource = await this.getResource(id);
    if (!resource) {
      throw new Error('Resource not found');
    }

    // Log the deletion BEFORE deleting: the audit row's resource_id FK references
    // resources(id), so it must be written while the row still exists. This is the
    // single source of the 'deleted' audit entry — callers must NOT log it again
    // afterward, or the post-delete insert violates the FK and the delete reports a
    // false 500 despite having succeeded.
    await this.logResourceAudit(
      id,
      'deleted',
      performedBy,
      { resource: { title: resource.title, url: resource.url, category: resource.category } },
      `Deleted resource: ${resource.title}`
    );

    // resource_edits FK to resources(id) has no ON DELETE CASCADE (unlike the
    // other child tables), so any suggested/approved edit rows must be removed
    // first or the resource delete fails with a foreign-key violation (false 500).
    await db.delete(resourceEdits).where(eq(resourceEdits.resourceId, id));

    // research_discoveries.created_resource_id is a nullable FK to resources(id)
    // with no ON DELETE action, so it would also block the delete with a
    // foreign-key violation (false 500). The discovery record itself is history
    // worth keeping, so null the back-reference rather than deleting the row.
    await db
      .update(researchDiscoveries)
      .set({ createdResourceId: null })
      .where(eq(researchDiscoveries.createdResourceId, id));

    await db.delete(resources).where(eq(resources.id, id));
  }

  /**
   * Get all resources with pending status
   * @returns Object containing pending resources array and total count
   */
  async getPendingResources(): Promise<{ resources: (Resource & { submittedByEmail: string | null })[]; total: number }> {
    // Join the submitter so the admin approval queue can show a human-readable
    // identity (email) instead of the raw user UUID.
    const rows = await db
      .select({ resource: resources, submittedByEmail: users.email })
      .from(resources)
      .leftJoin(users, eq(resources.submittedBy, users.id))
      .where(eq(resources.status, 'pending'))
      .orderBy(desc(resources.createdAt));

    const pendingResources = rows.map((row) => ({
      ...row.resource,
      submittedByEmail: row.submittedByEmail ?? null,
    }));

    return {
      resources: pendingResources,
      total: pendingResources.length
    };
  }

  /**
   * Get every approved resource as a flat array.
   * Used by export, link-health, and awesome-lint validation, which operate on the
   * full published set rather than a paginated page.
   */
  async getAllApprovedResources(): Promise<Resource[]> {
    return await db
      .select()
      .from(resources)
      .where(eq(resources.status, 'approved'))
      .orderBy(desc(resources.createdAt));
  }

  /**
   * Approve a pending resource
   * Sets status to 'approved' and records approver and timestamp
   * @param id - Resource ID to approve
   * @param approvedBy - User ID who is approving
   * @returns The approved resource
   * @throws Error if resource not found or not pending
   */
  async approveResource(id: number, approvedBy: string): Promise<Resource> {
    const resource = await this.getResource(id);
    if (!resource) {
      throw new Error('Resource not found');
    }

    if (resource.status !== 'pending') {
      throw new Error('Resource is not pending approval');
    }

    const [updated] = await db
      .update(resources)
      .set({
        status: 'approved',
        approvedBy: approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(resources.id, id))
      .returning();

    // Log the approval action
    await this.logResourceAudit(
      id,
      'approved',
      approvedBy,
      { previousStatus: resource.status, newStatus: 'approved' },
      'Resource approved by admin'
    );

    return updated;
  }

  /**
   * Reject a pending resource
   * Sets status to 'rejected' and logs the reason
   * @param id - Resource ID to reject
   * @param adminId - User ID who is rejecting
   * @param reason - Rejection reason (minimum 10 characters)
   * @throws Error if resource not found, not pending, or reason too short
   */
  async rejectResource(id: number, adminId: string, reason: string): Promise<void> {
    const resource = await this.getResource(id);
    if (!resource) {
      throw new Error('Resource not found');
    }

    if (resource.status !== 'pending') {
      throw new Error('Resource is not pending approval');
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error('Rejection reason must be at least 10 characters');
    }

    await db
      .update(resources)
      .set({
        status: 'rejected',
        updatedAt: new Date()
      })
      .where(eq(resources.id, id));

    // Log the rejection action
    await this.logResourceAudit(
      id,
      'rejected',
      adminId,
      { previousStatus: resource.status, newStatus: 'rejected', reason },
      `Resource rejected: ${reason}`
    );
  }

  /**
   * Log a resource audit event
   * Private helper method for tracking all resource changes
   * @param resourceId - Resource ID (can be null for system-level events)
   * @param action - Action performed (created/updated/deleted/approved/rejected)
   * @param performedBy - User ID who performed the action
   * @param changes - Object containing the changes made
   * @param notes - Additional notes about the action
   */
  private async logResourceAudit(
    resourceId: number | null,
    action: string,
    performedBy?: string,
    changes?: Record<string, unknown>,
    notes?: string
  ): Promise<void> {
    await db.insert(resourceAuditLog).values({
      resourceId,
      originalResourceId: resourceId, // Preserve original ID even if resource is deleted later
      action,
      performedBy,
      changes,
      notes
    });
  }
}
