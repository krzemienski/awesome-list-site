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
  userInteractions,
  users,
  EDITABLE_RESOURCE_FIELDS,
  type ResourceEdit,
  type InsertResourceEdit,
} from "@shared/schema";
import { db } from "../db";
import { decodeHtmlEntities } from "../github/importHygiene";
import {
  resourceFormatSchema,
  resourceProviderSchema,
  resourceSkillLevelSchema,
} from "@shared/resourceFacets";
import { and, eq, desc, asc, or, sql } from "drizzle-orm";

export type ContributorLifecycleStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "superseded";

type ContributorChangeValue =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null>;

export interface ContributorChange {
  field: string;
  old: ContributorChangeValue;
  new: ContributorChangeValue;
}

export interface ContributorItem {
  id: number;
  kind: "resource" | "edit";
  status: ContributorLifecycleStatus;
  title: string;
  submittedAt: Date;
  changedAt: Date;
  canWithdraw: boolean;
  rejectionReason: string | null;
  publicResource: { id: number; title: string; path: string } | null;
  submission?: {
    url: string;
    description: string;
    category: string;
    subcategory: string | null;
    subSubcategory: string | null;
    tags: string[];
  };
  changes?: ContributorChange[];
}

export interface ContributorImpact {
  acceptedContributions: number;
  publicResources: number;
  recordedViews: number;
}

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
  // Run16 BUG-041: real offset-based pagination (the endpoint used to ignore
  // offset entirely and report total = page size). Run16 BUG-084: LEFT JOIN
  // users so the admin UI can show WHO acted (email) instead of a raw UUID.
  //
  // Matching on resourceId uses both originalResourceId and resourceId:
  // - New logs (have originalResourceId set)
  // - Old logs from before migration (only have resourceId set)
  // Note: Logs for deleted resources created before migration are lost (both fields NULL)
  private auditLogWhere(resourceId: number | null) {
    if (resourceId === null) return undefined;
    return or(
      eq(resourceAuditLog.originalResourceId, resourceId),
      eq(resourceAuditLog.resourceId, resourceId)
    );
  }

  async getResourceAuditLog(resourceId: number | null, limit = 50, offset = 0): Promise<any[]> {
    const whereClause = this.auditLogWhere(resourceId);
    let query = db
      .select({
        id: resourceAuditLog.id,
        resourceId: resourceAuditLog.resourceId,
        originalResourceId: resourceAuditLog.originalResourceId,
        action: resourceAuditLog.action,
        performedBy: resourceAuditLog.performedBy,
        performedByEmail: users.email,
        changes: resourceAuditLog.changes,
        notes: resourceAuditLog.notes,
        createdAt: resourceAuditLog.createdAt,
      })
      .from(resourceAuditLog)
      .leftJoin(users, eq(resourceAuditLog.performedBy, users.id));

    if (whereClause) {
      query = query.where(whereClause) as any;
    }

    return await query
      .orderBy(desc(resourceAuditLog.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Count audit log entries (same matching semantics as getResourceAuditLog)
   * so the admin UI can paginate against the REAL total, not the page size.
   */
  async countAuditLogs(resourceId: number | null): Promise<number> {
    const whereClause = this.auditLogWhere(resourceId);
    let query = db
      .select({ count: sql<number>`count(*)::int` })
      .from(resourceAuditLog);
    if (whereClause) {
      query = query.where(whereClause) as any;
    }
    const [row] = await query;
    return row?.count ?? 0;
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
   * Run19 BUG-015: attach AI analysis to an edit after the fact. The suggest
   * endpoint responds immediately and runs Claude analysis in the background,
   * so the admin Edits queue's "AI Analysis" column actually populates.
   */
  async updateResourceEditAnalysis(
    editId: number,
    claudeMetadata: NonNullable<ResourceEdit['claudeMetadata']>,
  ): Promise<void> {
    await db
      .update(resourceEdits)
      .set({ claudeMetadata, claudeAnalyzedAt: new Date() })
      .where(eq(resourceEdits.id, editId));
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
   * Build the contributor dashboard from ownership-scoped selects only.
   *
   * This is deliberately a safe serializer rather than `select *`: moderator
   * identity, audit notes, Claude metadata, proposedData, and contributor
   * identity never enter the response shape.
   */
  async getContributorDashboardData(userId: string): Promise<{
    items: ContributorItem[];
    impact: ContributorImpact;
  }> {
    const [resourceRows, editRows, impactResult] = await Promise.all([
      db
        .select({
          id: resources.id,
          title: resources.title,
          url: resources.url,
          description: resources.description,
          category: resources.category,
          subcategory: resources.subcategory,
          subSubcategory: resources.subSubcategory,
          metadata: resources.metadata,
          status: resources.status,
          contributorRejectionReason: resources.contributorRejectionReason,
          createdAt: resources.createdAt,
          updatedAt: resources.updatedAt,
          approvedAt: resources.approvedAt,
          statusChangedAt: resources.statusChangedAt,
        })
        .from(resources)
        .where(eq(resources.submittedBy, userId)),
      db
        .select({
          id: resourceEdits.id,
          resourceId: resourceEdits.resourceId,
          status: resourceEdits.status,
          proposedChanges: resourceEdits.proposedChanges,
          rejectionReason: resourceEdits.rejectionReason,
          originalResourceUpdatedAt: resourceEdits.originalResourceUpdatedAt,
          createdAt: resourceEdits.createdAt,
          updatedAt: resourceEdits.updatedAt,
          handledAt: resourceEdits.handledAt,
          withdrawnAt: resourceEdits.withdrawnAt,
          resourceTitle: resources.title,
          currentResourceStatus: resources.status,
          currentResourceUpdatedAt: resources.updatedAt,
        })
        .from(resourceEdits)
        .innerJoin(resources, eq(resourceEdits.resourceId, resources.id))
        .where(eq(resourceEdits.submittedBy, userId)),
      db.execute(sql`
        WITH impacted_resources AS (
          SELECT ${resources.id} AS id
          FROM ${resources}
          WHERE ${resources.submittedBy} = ${userId}
            AND ${resources.status} = 'approved'
          UNION
          SELECT current_resource.id
          FROM ${resourceEdits} contribution_edit
          INNER JOIN ${resources} current_resource
            ON current_resource.id = contribution_edit.resource_id
          WHERE contribution_edit.submitted_by = ${userId}
            AND contribution_edit.status = 'approved'
            AND current_resource.status = 'approved'
        )
        SELECT
          (
            (SELECT count(*) FROM ${resources}
             WHERE ${resources.submittedBy} = ${userId}
               AND ${resources.status} = 'approved')
            +
            (SELECT count(*) FROM ${resourceEdits}
             WHERE ${resourceEdits.submittedBy} = ${userId}
               AND ${resourceEdits.status} = 'approved')
          )::int AS accepted_contributions,
          (SELECT count(*) FROM impacted_resources)::int AS public_resources,
          (
             SELECT count(DISTINCT interaction.user_id)
            FROM ${userInteractions} interaction
            INNER JOIN impacted_resources impacted
              ON impacted.id = interaction.resource_id
            WHERE interaction.interaction_type = 'view'
          )::int AS recorded_views
      `),
    ]);

    const contributorStatuses = new Set<ContributorLifecycleStatus>([
      "pending",
      "approved",
      "rejected",
      "withdrawn",
      "superseded",
    ]);
    const asLifecycleStatus = (
      status: string | null,
    ): ContributorLifecycleStatus =>
      contributorStatuses.has(status as ContributorLifecycleStatus)
        ? (status as ContributorLifecycleStatus)
        : "superseded";
    const asDate = (value: Date | null | undefined, fallback: Date): Date =>
      value instanceof Date ? value : fallback;
    const safeReason = (value: string | null | undefined): string | null => {
      const trimmed = value?.trim();
      return trimmed ? trimmed.slice(0, 1000) : null;
    };
    const safeValue = (value: unknown): ContributorChangeValue => {
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return typeof value === "string" ? value.slice(0, 2048) : value;
      }
      if (Array.isArray(value)) {
        return value
          .filter(
            (entry): entry is string | number | boolean | null =>
              entry === null ||
              typeof entry === "string" ||
              typeof entry === "number" ||
              typeof entry === "boolean",
          )
          .slice(0, 20)
          .map((entry) =>
            typeof entry === "string" ? entry.slice(0, 2048) : entry,
          );
      }
      return String(value ?? "").slice(0, 2048);
    };

    const resourceItems: ContributorItem[] = resourceRows.map((resource) => {
      const status = asLifecycleStatus(resource.status);
      const submittedAt = asDate(resource.createdAt, new Date(0));
      const changedAt =
        status === "approved"
          ? asDate(resource.approvedAt, asDate(resource.updatedAt, submittedAt))
          : status === "pending"
            ? submittedAt
            : asDate(
                resource.statusChangedAt,
                asDate(resource.updatedAt, submittedAt),
              );
      const metadata = resource.metadata as Record<string, unknown> | null;
      const tags = Array.isArray(metadata?.tags)
        ? metadata.tags
            .filter((tag): tag is string => typeof tag === "string")
            .slice(0, 20)
        : [];

      return {
        id: resource.id,
        kind: "resource",
        status,
        title: resource.title,
        submittedAt,
        changedAt,
        canWithdraw: status === "pending",
        rejectionReason:
          status === "rejected"
            ? safeReason(resource.contributorRejectionReason)
            : null,
        publicResource:
          status === "approved"
            ? {
                id: resource.id,
                title: resource.title,
                path: `/resource/${resource.id}`,
              }
            : null,
        submission: {
          url: resource.url,
          description: resource.description,
          category: resource.category,
          subcategory: resource.subcategory,
          subSubcategory: resource.subSubcategory,
          tags,
        },
      };
    });

    const editItems: ContributorItem[] = editRows.map((edit) => {
      const submittedAt = edit.createdAt;
      const resourceChangedAfterSubmission =
        !!edit.currentResourceUpdatedAt &&
        edit.currentResourceUpdatedAt.getTime() >
          edit.originalResourceUpdatedAt.getTime();
      const storedStatus = asLifecycleStatus(edit.status);
      const status: ContributorLifecycleStatus =
        storedStatus === "pending" && resourceChangedAfterSubmission
          ? "superseded"
          : storedStatus;
      const changedAt =
        status === "pending"
          ? submittedAt
          : status === "withdrawn"
            ? asDate(edit.withdrawnAt, edit.updatedAt)
            : status === "superseded"
              ? asDate(edit.currentResourceUpdatedAt, edit.updatedAt)
              : asDate(edit.handledAt, edit.updatedAt);
      const changes: ContributorChange[] = [];
      const proposedChanges = edit.proposedChanges as Record<
        string,
        { old?: unknown; new?: unknown }
      >;
      for (const field of EDITABLE_RESOURCE_FIELDS) {
        const change = proposedChanges?.[field];
        if (!change || typeof change !== "object") continue;
        if (!("old" in change) && !("new" in change)) continue;
        changes.push({
          field,
          old: safeValue(change.old),
          new: safeValue(change.new),
        });
      }

      return {
        id: edit.id,
        kind: "edit",
        status,
        title: edit.resourceTitle,
        submittedAt,
        changedAt,
        canWithdraw: status === "pending",
        rejectionReason:
          status === "rejected" ? safeReason(edit.rejectionReason) : null,
        publicResource:
          status === "approved" && edit.currentResourceStatus === "approved"
            ? {
                id: edit.resourceId,
                title: edit.resourceTitle,
                path: `/resource/${edit.resourceId}`,
              }
            : null,
        changes,
      };
    });

    const impactRow = impactResult.rows[0] as
      | {
          accepted_contributions: number | string;
          public_resources: number | string;
          recorded_views: number | string;
        }
      | undefined;

    return {
      items: [...resourceItems, ...editItems],
      impact: {
        acceptedContributions: Number(
          impactRow?.accepted_contributions ?? 0,
        ),
        publicResources: Number(impactRow?.public_resources ?? 0),
        recordedViews: Number(impactRow?.recorded_views ?? 0),
      },
    };
  }

  /**
   * Atomically withdraw a contributor's own still-pending edit suggestion.
   */
  async withdrawPendingResourceEdit(
    editId: number,
    userId: string,
  ): Promise<ResourceEdit | undefined> {
    return db.transaction(async (tx) => {
      const [withdrawn] = await tx
        .update(resourceEdits)
        .set({
          status: "withdrawn",
          withdrawnAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(resourceEdits.id, editId),
            eq(resourceEdits.submittedBy, userId),
            eq(resourceEdits.status, "pending"),
            sql`EXISTS (
              SELECT 1
              FROM ${resources} current_resource
              WHERE current_resource.id = ${resourceEdits.resourceId}
                AND current_resource.updated_at <= ${resourceEdits.originalResourceUpdatedAt}
            )`,
          ),
        )
        .returning();

      if (!withdrawn) return undefined;

      await tx.insert(resourceAuditLog).values({
        resourceId: withdrawn.resourceId,
        originalResourceId: withdrawn.resourceId,
        action: "edit_withdrawn",
        performedBy: userId,
        changes: {
          editId,
          previousStatus: "pending",
          newStatus: "withdrawn",
        },
        notes: "Contributor withdrew pending edit suggestion",
      });

      return withdrawn;
    });
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
    const outcome = await db.transaction(async (tx) => {
      // Lock the contribution before inspecting it. A contributor withdrawal
      // racing this moderation action will either commit first (and be seen
      // here) or wait until this transaction commits and then lose its
      // status='pending' predicate. Neither path can overwrite the other.
      const [edit] = await tx
        .select()
        .from(resourceEdits)
        .where(eq(resourceEdits.id, editId))
        .for('update');
      if (!edit || edit.status !== 'pending') {
        return { kind: 'not_pending' as const };
      }

      // Lock the resource too, so no content write can land between the
      // version check and applying this proposal.
      const [currentResource] = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, edit.resourceId))
        .for('update');
      if (!currentResource) {
        return { kind: 'missing_resource' as const };
      }

      const editTimestamp = edit.originalResourceUpdatedAt.getTime();
      const currentTimestamp = (currentResource.updatedAt ?? new Date()).getTime();
      const now = new Date();
      if (editTimestamp < currentTimestamp) {
        await tx
          .update(resourceEdits)
          .set({
            status: 'superseded',
            handledBy: adminId,
            handledAt: now,
            updatedAt: now,
          })
          .where(and(eq(resourceEdits.id, editId), eq(resourceEdits.status, 'pending')));
        await tx.insert(resourceAuditLog).values({
          resourceId: edit.resourceId,
          originalResourceId: edit.resourceId,
          action: 'edit_superseded',
          performedBy: adminId,
          changes: { editId },
          notes: `Edit #${editId} superseded by a newer resource version`,
        });
        return { kind: 'superseded' as const };
      }

      // SAFE MERGE: Only update whitelisted fields from proposedData.
      const updates: Record<string, any> = {};
      const proposedData = edit.proposedData as any;
      for (const field of EDITABLE_RESOURCE_FIELDS) {
        if (!proposedData || !(field in proposedData)) continue;
        if (field === 'tags') {
          if (Array.isArray(proposedData.tags)) {
            const normalizedTags = proposedData.tags
              .filter((tag: unknown): tag is string => typeof tag === 'string')
              .map((tag: string) => tag.trim())
              .filter((tag: string) => tag.length > 0)
              .slice(0, 20);
            updates.metadata = {
              ...((currentResource.metadata as Record<string, any> | null) ?? {}),
              ...((updates.metadata as Record<string, any> | undefined) ?? {}),
              tags: normalizedTags,
            };
          }
        } else if (field === 'resourceFormat') {
          updates[field] = resourceFormatSchema.parse(proposedData[field]);
        } else if (field === 'provider') {
          updates[field] = resourceProviderSchema.parse(proposedData[field]);
        } else if (field === 'skillLevel') {
          updates[field] = resourceSkillLevelSchema.parse(proposedData[field]);
        } else {
          updates[field] =
            typeof proposedData[field] === 'string' && field !== 'url'
              ? decodeHtmlEntities(proposedData[field])
              : proposedData[field];
        }
      }

      await tx
        .update(resources)
        .set({ ...updates, updatedAt: now })
        .where(eq(resources.id, edit.resourceId));
      await tx
        .update(resourceEdits)
        .set({
          status: 'approved',
          handledBy: adminId,
          handledAt: now,
          updatedAt: now,
        })
        .where(and(eq(resourceEdits.id, editId), eq(resourceEdits.status, 'pending')));
      await tx.insert(resourceAuditLog).values({
        resourceId: edit.resourceId,
        originalResourceId: edit.resourceId,
        action: 'edit_approved',
        performedBy: adminId,
        changes: { changes: edit.proposedChanges },
        notes: `Edit #${editId} approved and merged`,
      });
      return { kind: 'approved' as const };
    });

    if (outcome.kind === 'superseded') {
      throw new Error('Merge conflict detected: Resource was modified after this edit was submitted. Please review and resubmit.');
    }
    if (outcome.kind === 'missing_resource') {
      throw new Error('Resource not found');
    }
    if (outcome.kind === 'not_pending') {
      throw new Error('Edit not found or already processed');
    }
  }

  /**
   * Reject a resource edit suggestion
   * @param editId - Resource edit ID to reject
   * @param adminId - Admin user ID rejecting the edit
   * @param reason - Reason for rejection (minimum 10 characters)
   * @throws Error if edit not found, not pending, or reason too short
   */
  async rejectResourceEdit(editId: number, adminId: string, reason: string): Promise<void> {
    if (!reason || reason.trim().length < 10) {
      throw new Error('Rejection reason must be at least 10 characters');
    }

    const rejected = await db.transaction(async (tx) => {
      const now = new Date();
      const contributorReason = reason.trim();
      const [updated] = await tx
        .update(resourceEdits)
        .set({
          status: 'rejected',
          handledBy: adminId,
          handledAt: now,
          rejectionReason: contributorReason,
          updatedAt: now,
        })
        .where(
          and(
            eq(resourceEdits.id, editId),
            eq(resourceEdits.status, 'pending'),
          ),
        )
        .returning();
      if (!updated) return undefined;

      await tx.insert(resourceAuditLog).values({
        resourceId: updated.resourceId,
        originalResourceId: updated.resourceId,
        action: 'edit_rejected',
        performedBy: adminId,
        changes: { reason: contributorReason },
        notes: `Edit #${editId} rejected: ${contributorReason}`,
      });
      return updated;
    });
    if (!rejected) throw new Error('Edit is not pending');
  }
}
