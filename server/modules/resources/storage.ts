/**
 * ============================================================================
 * RESOURCES MODULE STORAGE - Resource-specific database operations
 * ============================================================================
 *
 * This module provides the data access layer for resource-specific operations.
 * It implements the IResourceStorage interface with Drizzle ORM and PostgreSQL.
 *
 * DESIGN PATTERN:
 * - Interface-based: IResourceStorage defines all resource operations
 * - Modular: Separated from main storage for better organization
 * - Transaction-safe: Uses Drizzle's transaction support
 *
 * KEY OPERATIONS:
 * - Resources: CRUD + status management (pending/approved/rejected)
 * - Resource Tags: Association management
 * - Resource Audit Log: Complete change tracking
 * - Resource Edits: User-submitted edit suggestions
 *
 * This module is part of the modularized architecture migration.
 * See /docs/ARCHITECTURE.md for data flow diagrams.
 * ============================================================================
 */

import {
  resources,
  tags,
  resourceTags,
  resourceAuditLog,
  resourceEdits,
  type Resource,
  type InsertResource,
  type Tag,
  type InsertTag,
  type ResourceEdit,
  type InsertResourceEdit,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and, sql, desc, asc, like, or } from "drizzle-orm";

// Interface for resource storage operations
export interface IResourceStorage {
  // Resource CRUD operations
  listResources(options: ListResourceOptions): Promise<{ resources: Resource[]; total: number }>;
  getResource(id: number): Promise<Resource | undefined>;
  getResourceByUrl(url: string): Promise<Resource | undefined>;
  getResourceCount(): Promise<number>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, resource: Partial<InsertResource>): Promise<Resource>;
  updateResourceStatus(id: number, status: string, approvedBy?: string): Promise<Resource>;
  deleteResource(id: number): Promise<void>;

  // Pending resource approval
  getPendingResources(): Promise<{ resources: Resource[]; total: number }>;
  approveResource(id: number, approvedBy: string): Promise<Resource>;
  rejectResource(id: number, adminId: string, reason: string): Promise<void>;

  // Resource Tags
  addTagToResource(resourceId: number, tagId: number): Promise<void>;
  removeTagFromResource(resourceId: number, tagId: number): Promise<void>;
  getResourceTags(resourceId: number): Promise<Tag[]>;

  // Tag management
  listTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: number): Promise<void>;

  // Resource Audit Log
  logResourceAudit(resourceId: number | null, action: string, performedBy?: string, changes?: any, notes?: string): Promise<void>;
  getResourceAuditLog(resourceId: number | null, limit?: number): Promise<any[]>;

  // Resource Edits
  createResourceEdit(data: InsertResourceEdit): Promise<ResourceEdit>;
  getResourceEdit(id: number): Promise<ResourceEdit | undefined>;
  getResourceEditsByResource(resourceId: number): Promise<ResourceEdit[]>;
  getResourceEditsByUser(userId: string): Promise<ResourceEdit[]>;
  getPendingResourceEdits(): Promise<ResourceEdit[]>;
  approveResourceEdit(editId: number, adminId: string): Promise<void>;
  rejectResourceEdit(editId: number, adminId: string, reason: string): Promise<void>;

  // Validation and Export
  getAllApprovedResources(): Promise<Resource[]>;
}

// Types
export interface ListResourceOptions {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  subcategory?: string;
  userId?: string;
  search?: string;
}

export class ResourceStorage implements IResourceStorage {
  // Resource CRUD operations
  async listResources(options: ListResourceOptions): Promise<{ resources: Resource[]; total: number }> {
    const { page = 1, limit = 20, status, category, subcategory, userId, search } = options;
    const offset = (page - 1) * limit;

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
      query = query.where(and(...conditions)) as any;
      countQuery = countQuery.where(and(...conditions)) as any;
    }

    const [totalResult] = await countQuery;

    const resourceList = await query
      .orderBy(desc(resources.createdAt))
      .limit(limit)
      .offset(offset);

    return { resources: resourceList, total: totalResult.count };
  }

  async getResource(id: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.id, id));
    return resource;
  }

  async getResourceByUrl(url: string): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources).where(eq(resources.url, url));
    return resource;
  }

  async getResourceCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(resources);
    return result.count;
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [newResource] = await db.insert(resources).values(resource).returning();

    // Log the creation
    await this.logResourceAudit(newResource.id, 'created', resource.submittedBy ?? undefined);

    return newResource;
  }

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

  async deleteResource(id: number): Promise<void> {
    // Get resource before deletion for audit log
    const resource = await this.getResource(id);
    if (!resource) {
      throw new Error('Resource not found');
    }

    // Log the deletion BEFORE deleting (foreign key constraint)
    await this.logResourceAudit(
      id,
      'deleted',
      undefined,
      { resource: { title: resource.title, url: resource.url, category: resource.category } },
      `Deleted resource: ${resource.title}`
    );

    await db.delete(resources).where(eq(resources.id, id));
  }

  // Pending resource approval
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

  // Resource Tags
  async addTagToResource(resourceId: number, tagId: number): Promise<void> {
    await db
      .insert(resourceTags)
      .values({ resourceId, tagId })
      .onConflictDoNothing();
  }

  async removeTagFromResource(resourceId: number, tagId: number): Promise<void> {
    await db
      .delete(resourceTags)
      .where(
        and(
          eq(resourceTags.resourceId, resourceId),
          eq(resourceTags.tagId, tagId)
        )
      );
  }

  async getResourceTags(resourceId: number): Promise<Tag[]> {
    const result = await db
      .select({ tag: tags })
      .from(resourceTags)
      .innerJoin(tags, eq(resourceTags.tagId, tags.id))
      .where(eq(resourceTags.resourceId, resourceId));

    return result.map(r => r.tag);
  }

  // Tag management
  async listTags(): Promise<Tag[]> {
    return await db.select().from(tags).orderBy(asc(tags.name));
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db.insert(tags).values(tag).returning();
    return newTag;
  }

  async deleteTag(id: number): Promise<void> {
    await db.delete(tags).where(eq(tags.id, id));
  }

  // Resource Audit Log
  async logResourceAudit(
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

  async getResourceAuditLog(resourceId: number | null, limit = 50): Promise<any[]> {
    // If resourceId is null, return all audit logs
    if (resourceId === null) {
      return await db
        .select()
        .from(resourceAuditLog)
        .orderBy(desc(resourceAuditLog.createdAt))
        .limit(limit);
    }

    // Return logs for this resource using both originalResourceId and resourceId
    // This handles both:
    // - New logs (have originalResourceId set)
    // - Old logs from before migration (only have resourceId set)
    // Note: Logs for deleted resources created before migration are lost (both fields NULL)
    return await db
      .select()
      .from(resourceAuditLog)
      .where(
        or(
          eq(resourceAuditLog.originalResourceId, resourceId),
          eq(resourceAuditLog.resourceId, resourceId)
        )
      )
      .orderBy(desc(resourceAuditLog.createdAt))
      .limit(limit);
  }

  // Resource Edits
  async createResourceEdit(data: InsertResourceEdit): Promise<ResourceEdit> {
    const [edit] = await db.insert(resourceEdits).values([data as any]).returning();

    await this.logResourceAudit(
      data.resourceId,
      'edit_suggested',
      data.submittedBy,
      { proposedChanges: data.proposedChanges },
      'User submitted edit suggestion'
    );

    return edit;
  }

  async getResourceEdit(id: number): Promise<ResourceEdit | undefined> {
    const [edit] = await db.select().from(resourceEdits).where(eq(resourceEdits.id, id));
    return edit;
  }

  async getResourceEditsByResource(resourceId: number): Promise<ResourceEdit[]> {
    return await db
      .select()
      .from(resourceEdits)
      .where(eq(resourceEdits.resourceId, resourceId))
      .orderBy(desc(resourceEdits.createdAt));
  }

  async getResourceEditsByUser(userId: string): Promise<ResourceEdit[]> {
    return await db
      .select()
      .from(resourceEdits)
      .where(eq(resourceEdits.submittedBy, userId))
      .orderBy(desc(resourceEdits.createdAt));
  }

  async getPendingResourceEdits(): Promise<ResourceEdit[]> {
    return await db
      .select()
      .from(resourceEdits)
      .where(eq(resourceEdits.status, 'pending'))
      .orderBy(asc(resourceEdits.createdAt));
  }

  async approveResourceEdit(editId: number, adminId: string): Promise<void> {
    const edit = await this.getResourceEdit(editId);
    if (!edit || edit.status !== 'pending') {
      throw new Error('Edit not found or already processed');
    }

    // SECURITY FIX: Re-fetch CURRENT resource state (not cached) (ISSUE 2)
    const currentResource = await this.getResource(edit.resourceId);
    if (!currentResource) {
      throw new Error('Resource not found');
    }

    // CONFLICT CHECK: Compare timestamps
    const editTimestamp = new Date(edit.originalResourceUpdatedAt).getTime();
    const currentTimestamp = new Date(currentResource.updatedAt ? currentResource.updatedAt : new Date()).getTime();

    if (editTimestamp < currentTimestamp) {
      // Resource was modified after edit was created - REJECT merge
      throw new Error('Merge conflict detected: Resource was modified after this edit was submitted. Please review and resubmit.');
    }

    // SAFE MERGE: Only update whitelisted fields from proposedData
    const EDITABLE_FIELDS = ['title', 'description', 'url', 'tags', 'category', 'subcategory', 'subSubcategory'];
    const updates: Record<string, any> = {};

    const proposedData = edit.proposedData as any;
    for (const field of EDITABLE_FIELDS) {
      if (proposedData && field in proposedData) {
        updates[field] = proposedData[field];
      }
    }

    // Apply vetted updates only
    await this.updateResource(edit.resourceId, updates);

    await db
      .update(resourceEdits)
      .set({
        status: 'approved',
        handledBy: adminId,
        handledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(resourceEdits.id, editId));

    await this.logResourceAudit(
      edit.resourceId,
      'edit_approved',
      adminId,
      { changes: edit.proposedChanges },
      `Edit #${editId} approved and merged`
    );
  }

  async rejectResourceEdit(editId: number, adminId: string, reason: string): Promise<void> {
    const edit = await this.getResourceEdit(editId);
    if (!edit) {
      throw new Error('Edit not found');
    }

    if (edit.status !== 'pending') {
      throw new Error('Edit is not pending');
    }

    if (!reason || reason.trim().length < 10) {
      throw new Error('Rejection reason must be at least 10 characters');
    }

    await db
      .update(resourceEdits)
      .set({
        status: 'rejected',
        handledBy: adminId,
        handledAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(resourceEdits.id, editId));

    await this.logResourceAudit(
      edit.resourceId,
      'edit_rejected',
      adminId,
      { reason },
      `Edit #${editId} rejected: ${reason}`
    );
  }

  // Validation and Export
  async getAllApprovedResources(): Promise<Resource[]> {
    return await db
      .select()
      .from(resources)
      .where(eq(resources.status, 'approved'))
      .orderBy(resources.category, resources.subcategory, resources.title);
  }
}

// Singleton instance
export const resourceStorage = new ResourceStorage();
