/**
 * ============================================================================
 * AUDIT LOG REPOSITORY - Operations for Resource Audit Logging
 * ============================================================================
 *
 * This repository provides type-safe operations for managing resource audit logs.
 * Audit logs track all changes to resources for compliance, debugging, and history.
 *
 * DESIGN PATTERN:
 * - Repository pattern with TypeScript for type safety
 * - Append-only log pattern - entries are never modified or deleted
 * - Preserves history even after resource deletion via originalResourceId
 * - Supports null resourceId for system-wide audit events
 *
 * KEY OPERATIONS:
 * - log(): Create a new audit log entry
 * - getByResourceId(): Get audit logs for a specific resource
 * - getAll(): Get all audit logs (system-wide)
 * - getRecent(): Get recent audit logs with optional limit
 *
 * AUDIT LOG PRESERVATION:
 * - resourceId: References the resource (SET NULL on delete)
 * - originalResourceId: Preserves the original ID (never changes)
 * - This dual-ID approach ensures audit history survives resource deletion
 *
 * USAGE:
 * ```typescript
 * const auditRepo = new AuditLogRepository(db);
 *
 * // Log a resource creation
 * await auditRepo.log({
 *   resourceId: 123,
 *   action: 'created',
 *   performedBy: 'user-id',
 *   notes: 'New resource added'
 * });
 *
 * // Get audit history for a resource
 * const logs = await auditRepo.getByResourceId(123, 50);
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, and, desc, or } from "drizzle-orm";
import { resourceAuditLog } from "@shared/schema";

/**
 * Parameters for creating an audit log entry
 */
export interface AuditLogEntry {
  /** Resource ID (can be null for system-wide events) */
  resourceId: number | null;
  /** Action performed (created, updated, approved, rejected, synced, deleted) */
  action: string;
  /** User ID who performed the action (optional for system actions) */
  performedBy?: string;
  /** JSON object with change details (e.g., { field: { old: 'value', new: 'value2' } }) */
  changes?: Record<string, any>;
  /** Optional notes or description of the action */
  notes?: string;
}

/**
 * Audit log entry as returned from database
 */
export interface AuditLogRecord {
  id: number;
  resourceId: number | null;
  originalResourceId: number | null;
  action: string;
  performedBy: string | null;
  changes: Record<string, any> | null;
  notes: string | null;
  createdAt: Date | null;
}

/**
 * Repository for resource audit log operations
 *
 * Provides type-safe database operations for managing audit logs.
 * Implements append-only logging with preservation of deleted resource history.
 */
export class AuditLogRepository {
  /**
   * Creates a new AuditLogRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {}

  /**
   * Create a new audit log entry
   *
   * Records an action performed on a resource or system-wide event.
   * The originalResourceId is set to preserve history even if the
   * resource is later deleted.
   *
   * @param entry - Audit log entry parameters
   *
   * @example
   * // Log resource creation
   * await auditRepo.log({
   *   resourceId: 123,
   *   action: 'created',
   *   performedBy: 'user-id',
   *   notes: 'Resource created via API'
   * });
   *
   * @example
   * // Log resource update with changes
   * await auditRepo.log({
   *   resourceId: 123,
   *   action: 'updated',
   *   performedBy: 'user-id',
   *   changes: {
   *     title: { old: 'Old Title', new: 'New Title' },
   *     description: { old: 'Old Desc', new: 'New Desc' }
   *   }
   * });
   *
   * @example
   * // Log system-wide event
   * await auditRepo.log({
   *   resourceId: null,
   *   action: 'bulk_import',
   *   performedBy: 'admin-id',
   *   notes: 'Imported 100 resources from GitHub'
   * });
   */
  async log(entry: AuditLogEntry): Promise<void> {
    await this.db.insert(resourceAuditLog).values({
      resourceId: entry.resourceId,
      originalResourceId: entry.resourceId, // Preserve original ID even if resource is deleted later
      action: entry.action,
      performedBy: entry.performedBy,
      changes: entry.changes,
      notes: entry.notes
    });
  }

  /**
   * Get audit logs for a specific resource
   *
   * Returns audit logs for a resource, including logs that remain after
   * the resource has been deleted (by matching originalResourceId).
   * Results are ordered by most recent first.
   *
   * @param resourceId - The resource ID to get audit logs for
   * @param limit - Maximum number of logs to return (default: 50)
   * @returns Array of audit log records
   *
   * @example
   * const logs = await auditRepo.getByResourceId(123);
   * logs.forEach(log => {
   *   console.log(`${log.action} at ${log.createdAt} by ${log.performedBy}`);
   * });
   */
  async getByResourceId(resourceId: number, limit = 50): Promise<AuditLogRecord[]> {
    return await this.db
      .select()
      .from(resourceAuditLog)
      .where(
        or(
          eq(resourceAuditLog.resourceId, resourceId),
          eq(resourceAuditLog.originalResourceId, resourceId)
        )
      )
      .orderBy(desc(resourceAuditLog.createdAt))
      .limit(limit) as AuditLogRecord[];
  }

  /**
   * Get all audit logs (system-wide)
   *
   * Returns all audit logs across all resources and system events.
   * Useful for admin dashboards and compliance reporting.
   * Results are ordered by most recent first.
   *
   * @param limit - Maximum number of logs to return (default: 50)
   * @returns Array of audit log records
   *
   * @example
   * const recentLogs = await auditRepo.getAll(100);
   * // Process logs for admin dashboard
   */
  async getAll(limit = 50): Promise<AuditLogRecord[]> {
    return await this.db
      .select()
      .from(resourceAuditLog)
      .orderBy(desc(resourceAuditLog.createdAt))
      .limit(limit) as AuditLogRecord[];
  }

  /**
   * Get recent audit logs with optional filtering
   *
   * Convenience method to get the most recent audit logs.
   * Alias for getAll() with configurable limit.
   *
   * @param limit - Maximum number of logs to return (default: 50)
   * @returns Array of audit log records
   *
   * @example
   * const recent = await auditRepo.getRecent(20);
   */
  async getRecent(limit = 50): Promise<AuditLogRecord[]> {
    return this.getAll(limit);
  }
}
