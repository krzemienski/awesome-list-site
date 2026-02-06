/**
 * ============================================================================
 * GITHUB SYNC MODULE STORAGE - GitHub Sync database operations
 * ============================================================================
 *
 * This module provides the data access layer for GitHub sync operations.
 * It implements the IGithubSyncStorage interface with Drizzle ORM and PostgreSQL.
 *
 * DESIGN PATTERN:
 * - Interface-based: IGithubSyncStorage defines all sync operations
 * - Modular: Separated from main storage for better organization
 * - Transaction-safe: Uses Drizzle's transaction support
 *
 * KEY OPERATIONS:
 * - GitHub Sync Queue: Async queue management for import/export jobs
 * - GitHub Sync History: Audit trail of all sync operations
 *
 * QUEUE OPERATIONS:
 * - addToGithubSyncQueue: Add new sync job to queue
 * - getGithubSyncQueue: Retrieve queue items, optionally filtered by status
 * - updateGithubSyncStatus: Update job status and completion time
 *
 * HISTORY OPERATIONS:
 * - getLastSyncHistory: Get most recent sync for a repository and direction
 * - saveSyncHistory: Record completed sync operation
 * - getSyncHistory: List sync history with optional filtering
 *
 * This module is part of the modularized architecture migration.
 * See /docs/ARCHITECTURE.md for data flow diagrams.
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
import { db } from "../../db";
import { eq, and, desc, asc } from "drizzle-orm";

/**
 * Storage interface for GitHub sync operations
 */
export interface IGithubSyncStorage {
  // GitHub Sync Queue
  addToGithubSyncQueue(item: InsertGithubSyncQueue): Promise<GithubSyncQueue>;
  getGithubSyncQueue(status?: string): Promise<GithubSyncQueue[]>;
  updateGithubSyncStatus(id: number, status: string, errorMessage?: string): Promise<void>;

  // GitHub Sync History
  getLastSyncHistory(repositoryUrl: string, direction: 'export' | 'import'): Promise<GithubSyncHistory | undefined>;
  saveSyncHistory(item: InsertGithubSyncHistory): Promise<GithubSyncHistory>;
  getSyncHistory(repositoryUrl?: string, limit?: number): Promise<GithubSyncHistory[]>;
}

/**
 * Implementation of GitHub sync storage operations
 */
export class GithubSyncStorage implements IGithubSyncStorage {
  // ==================== GitHub Sync Queue ====================

  /**
   * Add a new item to the GitHub sync queue
   *
   * @param item - The sync queue item to add
   * @returns The created queue item with ID
   */
  async addToGithubSyncQueue(item: InsertGithubSyncQueue): Promise<GithubSyncQueue> {
    const [queueItem] = await db.insert(githubSyncQueue).values(item as any).returning();
    return queueItem;
  }

  /**
   * Get GitHub sync queue items
   *
   * @param status - Optional status filter (pending, processing, completed, failed)
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
   * Update the status of a GitHub sync queue item
   *
   * @param id - Queue item ID
   * @param status - New status (pending, processing, completed, failed)
   * @param errorMessage - Optional error message if status is failed
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

  // ==================== GitHub Sync History ====================

  /**
   * Get the last sync history entry for a repository and direction
   *
   * @param repositoryUrl - GitHub repository URL
   * @param direction - Sync direction ('export' or 'import')
   * @returns The most recent sync history entry, or undefined if none exists
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
   * Save a GitHub sync history entry
   *
   * @param item - The sync history item to save
   * @returns The created history item with ID
   */
  async saveSyncHistory(item: InsertGithubSyncHistory): Promise<GithubSyncHistory> {
    const [historyItem] = await db.insert(githubSyncHistory).values(item).returning();
    return historyItem;
  }

  /**
   * Get GitHub sync history entries
   *
   * @param repositoryUrl - Optional repository URL filter
   * @param limit - Maximum number of entries to return (default: 20)
   * @returns Array of sync history entries ordered by creation time (newest first)
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

// Singleton instance
export const githubSyncStorage: IGithubSyncStorage = new GithubSyncStorage();
