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
  type Resource,
  type InsertResource,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, sql, desc, like, or, inArray } from "drizzle-orm";

/**
 * Options for listing resources with filtering and pagination
 */
export interface ListResourceOptions {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  subcategory?: string;
  subSubcategory?: string;
  userId?: string;
  search?: string;
  tags?: string[]; // OR semantics; post-DB filter via resource_tags join
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
    const { page = 1, limit = 20, status, category, subcategory, subSubcategory, userId, search, tags, tag } = options;
    const offset = (page - 1) * limit;
    // Normalize tag filter (CSV -> array)
    const tagFilter: string[] = Array.isArray(tags)
      ? tags
      : (typeof tag === "string" && tag.includes(","))
        ? tag.split(",").map(t => t.trim()).filter(Boolean)
        : (typeof tag === "string" && tag.length > 0 ? [tag] : []);

    let query = db.select().from(resources);
    let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(resources);

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
      conditions.push(
        or(
          like(resources.title, `%${search}%`),
          like(resources.description, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
      countQuery = countQuery.where(and(...conditions));
    }

    // Fetch a wider slice when filtering by tag so the final pagination reflects
    // post-DB tag-join matches, not the narrower pre-join slice.
    const expandedLimit = tagFilter.length > 0 ? Math.max(limit * 5, 200) : limit;
    const expandedOffset = tagFilter.length > 0 ? 0 : offset;
    const resourceList = await query
      .orderBy(desc(resources.createdAt))
      .limit(expandedLimit)
      .offset(expandedOffset);

    if (tagFilter.length === 0) {
      const [totalResult] = await countQuery;
      return { resources: resourceList, total: totalResult.count };
    }

    // Tag filter: OR semantics (matches any tag). Resolve tag IDs by name or slug,
    // intersect against the junction table, then re-paginate in-memory.
    const { tags: tagsTable, resourceTags } = await import("@shared/schema");
    const tagRows = await db.select().from(tagsTable);
    const wanted = new Set(tagFilter.map(t => t.toLowerCase()));
    const tagIdByNameOrSlug = new Map<number, string>();
    for (const row of tagRows) {
      if (wanted.has(row.name.toLowerCase()) || wanted.has(row.slug.toLowerCase())) {
        tagIdByNameOrSlug.set(row.id, row.slug);
      }
    }
    if (tagIdByNameOrSlug.size === 0) {
      return { resources: [], total: 0 };
    }
    const tagIds = Array.from(tagIdByNameOrSlug.keys());
    const linkRows = await db.select().from(resourceTags).where(inArray(resourceTags.tagId, tagIds));
    const allowedIds = new Set(linkRows.map(r => r.resourceId));
    const filtered = resourceList.filter(r => allowedIds.has(r.id));
    const total = filtered.length;
    const start = offset;
    const paged = filtered.slice(start, start + limit);
    return { resources: paged, total };
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
   * Update resource status (pending/approved/rejected)
   * When approving, sets approvedBy and approvedAt fields
   * @param id - Resource ID to update
   * @param status - New status value
   * @param approvedBy - User ID who approved (optional)
   * @returns The updated resource
   */
  async updateResourceStatus(id: number, status: string, approvedBy?: string): Promise<Resource> {
    const updateData: any = { status, updatedAt: new Date() };

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

    // The `resource_edits.resource_id` and `resource_audit_log.resource_id` FKs
    // lack ON DELETE CASCADE in the migration, so a DELETE on resources would
    // 500 with an FK violation when prior suggest-edit or audit rows exist.
    // Strategy: insert a 'deleted' tombstone first (resourceId=null) so the
    // permanent record survives; then drop the dependent rows; then drop the
    // resource itself. resource_tags already cascades.
    const { resourceEdits, resourceAuditLog } = await import("@shared/schema");

    // Permanent 'deleted' tombstone — FK-safe (resourceId=null) so it outlives
    // the actual row.
    await db.insert(resourceAuditLog).values({
      resourceId: null,
      originalResourceId: id,
      action: 'deleted',
      performedBy,
      changes: { resource: { title: resource.title, url: resource.url, category: resource.category } },
      notes: `Deleted resource: ${resource.title}`
    });

    await db.delete(resourceEdits).where(eq(resourceEdits.resourceId, id));
    await db.delete(resourceAuditLog).where(eq(resourceAuditLog.resourceId, id));

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
  async getPendingResources(): Promise<{ resources: Resource[]; total: number }> {
    const pendingResources = await db
      .select()
      .from(resources)
      .where(eq(resources.status, 'pending'))
      .orderBy(desc(resources.createdAt));

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
    changes?: any,
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
