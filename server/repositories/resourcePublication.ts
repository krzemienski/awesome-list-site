import { resources, resourceAuditLog, type InsertResource, type Resource } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { ensureMinDescription } from "../github/importHygiene";
import { invalidatePublicCache } from "../cache/publicCache";

type ResourceTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Commit boundary for publication and its dependent writes. Research approvals
 * should insert their pending resource and update the discovery inside this
 * callback, then call transitionResourceInTransaction with status approved.
 * Cache invalidation happens ONLY after the enclosing transaction commits.
 */
export async function withResourcePublication<T>(work: (tx: ResourceTransaction) => Promise<T>): Promise<T> {
  const result = await db.transaction(work);
  invalidatePublicCache('resource-mutation');
  return result;
}

/**
 * Shared publication/status transition, compatible with an enclosing transaction.
 * Caller MUST use withResourcePublication (or invalidate after its own commit).
 * The row lock makes moderation conflicts fail before description/audit writes.
 */
export async function transitionResourceInTransaction(
  tx: ResourceTransaction,
  id: number,
  patch: Partial<InsertResource>,
  actor?: string,
  options: { expectedStatus?: string; notes?: string; audit?: boolean; rejectionReason?: string } = {},
): Promise<Resource> {
  const [before] = await tx.select().from(resources).where(eq(resources.id, id)).for('update');
  if (!before) throw new Error('Resource not found');
  if (options.expectedStatus && before.status !== options.expectedStatus) {
    throw new Error(options.expectedStatus === 'pending' ? 'Resource is not pending approval' : 'Resource is not approved');
  }
  const now = new Date();
  const status = patch.status ?? before.status ?? 'pending';
  const changed = status !== before.status;
  const data: Partial<typeof resources.$inferInsert> = { ...patch, updatedAt: now };
  if (changed) {
    data.statusChangedAt = now;
    data.approvedAt = status === 'approved' ? now : null;
    data.approvedBy = status === 'approved' ? actor ?? null : null;
    data.contributorRejectionReason = status === 'rejected' ? options.rejectionReason ?? null : null;
  }
  if (status === 'approved') {
    data.description = ensureMinDescription(
      patch.description ?? before.description ?? '',
      patch.title ?? before.title,
      patch.url ?? before.url,
    );
  }
  const [updated] = await tx.update(resources).set(data).where(eq(resources.id, id)).returning();
  // Status changes are always audited, even when an internal caller suppresses
  // ordinary edit audits because it owns a separate edit-approval audit.
  if (changed || options.audit !== false) {
    await tx.insert(resourceAuditLog).values({
      resourceId: id,
      originalResourceId: id,
      action: changed ? status : 'updated',
      performedBy: actor,
      changes: { ...patch, previousStatus: before.status, newStatus: status,
        ...(options.rejectionReason ? { reason: options.rejectionReason } : {}) },
      notes: options.notes,
    });
  }
  return updated;
}
