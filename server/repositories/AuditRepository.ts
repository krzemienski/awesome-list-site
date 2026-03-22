/**
 * ============================================================================
 * AUDIT REPOSITORY - Audit Log and Resource Edits Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for audit logging and resource edits.
 * It encapsulates all database queries related to tracking changes and suggested edits.
 *
 * KEY OPERATIONS:
 * - logResourceAudit: Record audit log entries for resource changes
 * - getResourceAuditLog: Retrieve audit history for resources
 * - createResourceEdit: Create a suggested edit for a resource
 * - getResourceEdit: Retrieve a specific edit by ID
 * - getResourceEditsByResource: Get all edits for a specific resource
 * - getResourceEditsByUser: Get all edits submitted by a user
 * - getPendingResourceEdits: Get all pending edit suggestions
 * - approveResourceEdit: Approve and apply an edit suggestion
 * - rejectResourceEdit: Reject an edit suggestion with reason
 *
 * DESIGN NOTES:
 * - Audit logs preserve originalResourceId for deleted resources
 * - Resource edits support conflict detection via timestamp comparison
 * - Security: Only whitelisted fields can be modified via edits
 * - Uses Drizzle ORM for type-safe database operations
 * ============================================================================
 */

import {
  resourceAuditLog,
  resourceEdits,
  resources,
  type ResourceEdit,
  type InsertResourceEdit,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc, asc, or } from "drizzle-orm";

/**
 * Repository class for audit log and resource edit operations
 */
export class AuditRepository {
  /**
   * Log an audit entry for a resource action
   * @param resourceId - Resource ID (null for system-wide actions)
   * @param action - Action performed (e.g., 'created', 'updated', 'deleted', 'approved')
   * @param performedBy - User ID who performed the action (optional)
   * @param changes - Object containing the changes made (optional)
   * @param notes - Additional notes about the action (optional)
   */
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

  /**
   * Get audit log entries for a resource
   * @param resourceId - Resource ID to get logs for (null for all logs)
   * @param limit - Maximum number of entries to return (default: 50)
   * @returns Array of audit log entries, ordered by most recent first
   */
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

  /**
   * Create a new resource edit suggestion
   * @param data - Resource edit data including resourceId, submittedBy, and proposed changes
   * @returns The created resource edit object
   */
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

  /**
   * Get a specific resource edit by ID
   * @param id - Resource edit ID
   * @returns ResourceEdit object or undefined if not found
   */
  async getResourceEdit(id: number): Promise<ResourceEdit | undefined> {
    const [edit] = await db.select().from(resourceEdits).where(eq(resourceEdits.id, id));
    return edit;
  }

  /**
   * Get all edits for a specific resource
   * @param resourceId - Resource ID to get edits for
   * @returns Array of resource edits, ordered by most recent first
   */
  async getResourceEditsByResource(resourceId: number): Promise<ResourceEdit[]> {
    return await db
      .select()
      .from(resourceEdits)
      .where(eq(resourceEdits.resourceId, resourceId))
      .orderBy(desc(resourceEdits.createdAt));
  }

  /**
   * Get all edits submitted by a specific user
   * @param userId - User ID who submitted the edits
   * @returns Array of resource edits, ordered by most recent first
   */
  async getResourceEditsByUser(userId: string): Promise<ResourceEdit[]> {
    return await db
      .select()
      .from(resourceEdits)
      .where(eq(resourceEdits.submittedBy, userId))
      .orderBy(desc(resourceEdits.createdAt));
  }

  /**
   * Get all pending resource edit suggestions
   * @returns Array of pending resource edits, ordered by oldest first
   */
  async getPendingResourceEdits(): Promise<ResourceEdit[]> {
    return await db
      .select()
      .from(resourceEdits)
      .where(eq(resourceEdits.status, 'pending'))
      .orderBy(asc(resourceEdits.createdAt));
  }

  /**
   * Approve a resource edit and apply the changes
   * @param editId - Resource edit ID to approve
   * @param adminId - Admin user ID approving the edit
   * @throws Error if edit not found, already processed, resource not found, or merge conflict detected
   */
  async approveResourceEdit(editId: number, adminId: string): Promise<void> {
    const edit = await this.getResourceEdit(editId);
    if (!edit || edit.status !== 'pending') {
      throw new Error('Edit not found or already processed');
    }

    // SECURITY FIX: Re-fetch CURRENT resource state (not cached) (ISSUE 2)
    const [currentResource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, edit.resourceId));

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
    await db
      .update(resources)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(resources.id, edit.resourceId));

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

  /**
   * Reject a resource edit suggestion
   * @param editId - Resource edit ID to reject
   * @param adminId - Admin user ID rejecting the edit
   * @param reason - Reason for rejection (minimum 10 characters)
   * @throws Error if edit not found, not pending, or reason too short
   */
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
}
