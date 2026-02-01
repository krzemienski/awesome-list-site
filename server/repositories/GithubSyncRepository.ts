/**
 * ============================================================================
 * GITHUB SYNC REPOSITORY - GitHub Sync Queue and History Management
 * ============================================================================
 *
 * This repository provides database operations for GitHub synchronization,
 * managing both the sync queue (pending/processing jobs) and sync history
 * (completed sync records).
 *
 * DESIGN PATTERN:
 * - Repository pattern with focused responsibility
 * - Separates queue management from history tracking
 * - Provides type-safe database operations using Drizzle ORM
 *
 * KEY OPERATIONS:
 * Queue Management:
 * - addToQueue: Create new sync jobs (import/export)
 * - getQueue: Retrieve queue items, optionally filtered by status
 * - updateStatus: Update job status and handle completion timestamps
 *
 * History Tracking:
 * - getLastSync: Get most recent sync for a repository/direction
 * - saveHistory: Record completed sync operations with stats
 * - getHistory: Retrieve historical sync records
 *
 * USAGE:
 * ```typescript
 * const syncRepo = new GithubSyncRepository(db);
 *
 * // Add to queue
 * const job = await syncRepo.addToQueue({
 *   repositoryUrl: 'https://github.com/user/repo',
 *   action: 'export',
 *   branch: 'main'
 * });
 *
 * // Update status
 * await syncRepo.updateStatus(job.id, 'completed');
 *
 * // Get history
 * const history = await syncRepo.getHistory('https://github.com/user/repo');
 * ```
 * ============================================================================
 */

import { db as dbInstance } from "../db";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  githubSyncQueue,
  githubSyncHistory,
  type GithubSyncQueue,
  type InsertGithubSyncQueue,
  type GithubSyncHistory,
  type InsertGithubSyncHistory,
} from "@shared/schema";

/**
 * Repository for GitHub synchronization operations
 *
 * Manages the queue of pending/processing sync jobs and maintains
 * a historical record of all completed synchronization operations.
 */
export class GithubSyncRepository {
  /**
   * Creates a new GithubSyncRepository instance
   *
   * @param db - Drizzle database instance
   */
  constructor(private db: typeof dbInstance) {}

  // ============================================================================
  // QUEUE OPERATIONS
  // ============================================================================

  /**
   * Add a new sync job to the queue
   *
   * Creates a new sync job for either importing resources from GitHub
   * or exporting resources to GitHub. Jobs start in 'pending' status.
   *
   * @param item - The sync queue item to create
   * @returns The created queue item with ID and timestamps
   *
   * @example
   * const job = await repo.addToQueue({
   *   repositoryUrl: 'https://github.com/user/awesome-list',
   *   action: 'export',
   *   branch: 'main',
   *   resourceIds: [1, 2, 3]
   * });
   */
  async addToQueue(item: InsertGithubSyncQueue): Promise<GithubSyncQueue> {
    const [queueItem] = await this.db
      .insert(githubSyncQueue)
      .values(item as any)
      .returning();
    return queueItem;
  }

  /**
   * Get sync queue items, optionally filtered by status
   *
   * Retrieves all queue items or filters by status (pending, processing,
   * completed, failed). Results are ordered by creation time (oldest first).
   *
   * @param status - Optional status filter (pending, processing, completed, failed)
   * @returns Array of sync queue items matching the filter
   *
   * @example
   * // Get all pending jobs
   * const pending = await repo.getQueue('pending');
   *
   * // Get all jobs regardless of status
   * const all = await repo.getQueue();
   */
  async getQueue(status?: string): Promise<GithubSyncQueue[]> {
    let query = this.db.select().from(githubSyncQueue);

    if (status) {
      query = query.where(eq(githubSyncQueue.status, status)) as any;
    }

    return await query.orderBy(asc(githubSyncQueue.createdAt));
  }

  /**
   * Update the status of a sync job
   *
   * Updates the job status and automatically sets the processedAt timestamp
   * when the job reaches a terminal state (completed or failed).
   *
   * @param id - The ID of the sync job to update
   * @param status - The new status (pending, processing, completed, failed)
   * @param errorMessage - Optional error message for failed jobs
   *
   * @example
   * // Mark job as completed
   * await repo.updateStatus(jobId, 'completed');
   *
   * // Mark job as failed with error
   * await repo.updateStatus(jobId, 'failed', 'Connection timeout');
   */
  async updateStatus(
    id: number,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await this.db
      .update(githubSyncQueue)
      .set({
        status,
        errorMessage,
        processedAt: status === "completed" || status === "failed" ? new Date() : null,
      })
      .where(eq(githubSyncQueue.id, id));
  }

  // ============================================================================
  // HISTORY OPERATIONS
  // ============================================================================

  /**
   * Get the most recent sync history for a repository and direction
   *
   * Retrieves the last sync operation (import or export) performed on
   * a specific repository. Useful for checking last sync time and stats.
   *
   * @param repositoryUrl - The GitHub repository URL
   * @param direction - The sync direction ('export' or 'import')
   * @returns The most recent sync history record, or undefined if none exists
   *
   * @example
   * const lastExport = await repo.getLastSync(
   *   'https://github.com/user/repo',
   *   'export'
   * );
   * console.log(`Last export: ${lastExport?.createdAt}`);
   */
  async getLastSync(
    repositoryUrl: string,
    direction: "export" | "import"
  ): Promise<GithubSyncHistory | undefined> {
    const results = await this.db
      .select()
      .from(githubSyncHistory)
      .where(
        and(
          eq(githubSyncHistory.repositoryUrl, repositoryUrl),
          eq(githubSyncHistory.direction, direction)
        )
      )
      .orderBy(desc(githubSyncHistory.createdAt))
      .limit(1);

    return results[0];
  }

  /**
   * Save a sync history record
   *
   * Records a completed sync operation with statistics about resources
   * added, updated, and removed. Creates a permanent historical record
   * that can be used for auditing and troubleshooting.
   *
   * @param item - The history record to save
   * @returns The saved history record with ID and timestamps
   *
   * @example
   * const history = await repo.saveHistory({
   *   repositoryUrl: 'https://github.com/user/repo',
   *   direction: 'export',
   *   commitSha: 'abc123',
   *   resourcesAdded: 5,
   *   resourcesUpdated: 3,
   *   resourcesRemoved: 1,
   *   totalResources: 100,
   *   performedBy: userId
   * });
   */
  async saveHistory(item: InsertGithubSyncHistory): Promise<GithubSyncHistory> {
    const [historyItem] = await this.db
      .insert(githubSyncHistory)
      .values(item)
      .returning();
    return historyItem;
  }

  /**
   * Get sync history, optionally filtered by repository
   *
   * Retrieves historical sync records, most recent first. Can be filtered
   * to a specific repository or retrieve all sync history.
   *
   * @param repositoryUrl - Optional repository URL to filter by
   * @param limit - Maximum number of records to return (default: 20)
   * @returns Array of sync history records
   *
   * @example
   * // Get last 20 syncs for a specific repo
   * const repoHistory = await repo.getHistory(
   *   'https://github.com/user/repo',
   *   20
   * );
   *
   * // Get last 50 syncs across all repos
   * const allHistory = await repo.getHistory(undefined, 50);
   */
  async getHistory(
    repositoryUrl?: string,
    limit: number = 20
  ): Promise<GithubSyncHistory[]> {
    let query = this.db.select().from(githubSyncHistory);

    if (repositoryUrl) {
      query = query.where(eq(githubSyncHistory.repositoryUrl, repositoryUrl)) as any;
    }

    return await query
      .orderBy(desc(githubSyncHistory.createdAt))
      .limit(limit);
  }
}
