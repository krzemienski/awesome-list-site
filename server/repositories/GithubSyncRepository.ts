/**
 * ============================================================================
 * GITHUB SYNC REPOSITORY - GitHub Sync Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for GitHub sync operations.
 * It encapsulates all database queries related to GitHub import/export sync.
 *
 * KEY OPERATIONS:
 * - Queue Management: Add, retrieve, and update sync queue items
 * - History Tracking: Save and retrieve sync history records
 * - Status Updates: Track sync operation status (pending/processing/completed/failed)
 *
 * DESIGN NOTES:
 * - Queue items represent pending import/export operations
 * - History items provide audit trail of completed syncs
 * - Supports both import (GitHub → Database) and export (Database → GitHub)
 * ============================================================================
 */

import {
  githubSyncQueue,
  githubSyncHistory,
  type GithubSyncQueue,
  type InsertGithubSyncQueue,
  type GithubSyncHistory,
  type InsertGithubSyncHistory,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, desc, asc } from "drizzle-orm";

/**
 * Repository class for GitHub sync-related database operations
 */
export class GithubSyncRepository {
  /**
   * Add an item to the GitHub sync queue
   * @param item - Sync queue item data (repository URL, direction, metadata)
   * @returns The created queue item with ID
   */
  async addToGithubSyncQueue(item: InsertGithubSyncQueue): Promise<GithubSyncQueue> {
    const [queueItem] = await db.insert(githubSyncQueue).values(item as any).returning();
    return queueItem;
  }

  /**
   * Get sync queue items, optionally filtered by status
   * @param status - Optional status filter ('pending', 'processing', 'completed', 'failed')
   * @returns Array of queue items ordered by creation time
   */
  async getGithubSyncQueue(status?: string): Promise<GithubSyncQueue[]> {
    let query = db.select().from(githubSyncQueue);

    if (status) {
      query = query.where(eq(githubSyncQueue.status, status)) as any;
    }

    return await query.orderBy(asc(githubSyncQueue.createdAt));
  }

  /**
   * Update the status of a sync queue item
   * @param id - Queue item ID
   * @param status - New status ('pending', 'processing', 'completed', 'failed')
   * @param errorMessage - Optional error message if status is 'failed'
   */
  async updateGithubSyncStatus(id: number, status: string, errorMessage?: string): Promise<void> {
    await db
      .update(githubSyncQueue)
      .set({
        status,
        errorMessage,
        processedAt: status === 'completed' || status === 'failed' ? new Date() : null
      })
      .where(eq(githubSyncQueue.id, id));
  }

  /**
   * Get the last sync history record for a repository and direction
   * @param repositoryUrl - GitHub repository URL
   * @param direction - Sync direction ('import' or 'export')
   * @returns Most recent sync history or undefined if none found
   */
  async getLastSyncHistory(repositoryUrl: string, direction: 'export' | 'import'): Promise<GithubSyncHistory | undefined> {
    const results = await db
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
   * @param item - Sync history data (repository URL, direction, status, metadata)
   * @returns The created history item with ID
   */
  async saveSyncHistory(item: InsertGithubSyncHistory): Promise<GithubSyncHistory> {
    const [historyItem] = await db.insert(githubSyncHistory).values(item).returning();
    return historyItem;
  }

  /**
   * Get sync history, optionally filtered by repository URL
   * @param repositoryUrl - Optional repository URL filter
   * @param limit - Maximum number of records to return (default: 20)
   * @returns Array of sync history records ordered by creation time (newest first)
   */
  async getSyncHistory(repositoryUrl?: string, limit: number = 20): Promise<GithubSyncHistory[]> {
    let query = db.select().from(githubSyncHistory);

    if (repositoryUrl) {
      query = query.where(eq(githubSyncHistory.repositoryUrl, repositoryUrl)) as any;
    }

    return await query
      .orderBy(desc(githubSyncHistory.createdAt))
      .limit(limit);
  }
}
