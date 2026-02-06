/**
 * ============================================================================
 * ENRICHMENT MODULE - Storage Interface
 * ============================================================================
 *
 * This module provides the data access layer for enrichment-related
 * database operations. It implements a focused interface for managing
 * enrichment jobs and queue items.
 *
 * DESIGN PATTERN:
 * - Singleton pattern: Single storage instance exported for module-wide use
 * - Interface-based: IEnrichmentStorage defines all operations for testability
 * - Separation of Concerns: Isolated from main storage for modularity
 *
 * KEY OPERATIONS:
 * - Enrichment Jobs: Create, read, update, list, and cancel jobs
 * - Enrichment Queue: Manage individual resource enrichment tasks
 * - Status Management: Track job progress and queue item states
 *
 * JOB LIFECYCLE:
 * 1. Create job with filter and batch size configuration
 * 2. Update job with total resource count
 * 3. Queue individual resources for processing
 * 4. Process queue items sequentially with status updates
 * 5. Mark job as completed or cancelled when done
 *
 * QUEUE ITEM STATES:
 * - pending: Waiting to be processed
 * - processing: Currently being enriched
 * - completed: Successfully enriched
 * - failed: Enrichment failed
 * - skipped: Skipped due to job cancellation or errors
 *
 * See /docs/ENRICHMENT.md for enrichment workflow documentation.
 * ============================================================================
 */

import {
  enrichmentJobs,
  enrichmentQueue,
  type EnrichmentJob,
  type InsertEnrichmentJob,
  type EnrichmentQueueItem,
  type InsertEnrichmentQueue,
} from "@shared/schema";
import { db } from "../../db";
import { eq, and, desc, asc } from "drizzle-orm";

/**
 * Interface for enrichment storage operations
 *
 * This interface defines all database operations needed for the
 * enrichment module to manage jobs and queue items.
 */
export interface IEnrichmentStorage {
  // Enrichment Jobs
  createEnrichmentJob(data: InsertEnrichmentJob): Promise<EnrichmentJob>;
  getEnrichmentJob(id: number): Promise<EnrichmentJob | undefined>;
  listEnrichmentJobs(limit?: number): Promise<EnrichmentJob[]>;
  updateEnrichmentJob(id: number, data: Partial<EnrichmentJob>): Promise<EnrichmentJob>;
  cancelEnrichmentJob(id: number): Promise<void>;

  // Enrichment Queue
  createEnrichmentQueueItem(data: InsertEnrichmentQueue): Promise<EnrichmentQueueItem>;
  getEnrichmentQueueItemsByJob(jobId: number): Promise<EnrichmentQueueItem[]>;
  getPendingEnrichmentQueueItems(jobId: number, limit?: number): Promise<EnrichmentQueueItem[]>;
  updateEnrichmentQueueItem(id: number, data: Partial<EnrichmentQueueItem>): Promise<EnrichmentQueueItem>;
}

/**
 * DatabaseEnrichmentStorage - Drizzle ORM implementation
 *
 * This class provides database access for enrichment operations
 * using Drizzle ORM with PostgreSQL.
 */
export class DatabaseEnrichmentStorage implements IEnrichmentStorage {
  // ========================================================================
  // ENRICHMENT JOBS
  // ========================================================================

  /**
   * Create a new enrichment job
   *
   * @param data - Job configuration (filter, batchSize, startedBy)
   * @returns The created enrichment job with generated ID
   */
  async createEnrichmentJob(data: InsertEnrichmentJob): Promise<EnrichmentJob> {
    const [job] = await db
      .insert(enrichmentJobs)
      .values(data)
      .returning();
    return job;
  }

  /**
   * Get a specific enrichment job by ID
   *
   * @param id - Job ID
   * @returns The enrichment job or undefined if not found
   */
  async getEnrichmentJob(id: number): Promise<EnrichmentJob | undefined> {
    const [job] = await db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.id, id));
    return job;
  }

  /**
   * List enrichment jobs ordered by creation date (newest first)
   *
   * @param limit - Maximum number of jobs to return (default: 50)
   * @returns Array of enrichment jobs
   */
  async listEnrichmentJobs(limit: number = 50): Promise<EnrichmentJob[]> {
    const jobs = await db
      .select()
      .from(enrichmentJobs)
      .orderBy(desc(enrichmentJobs.createdAt))
      .limit(limit);
    return jobs;
  }

  /**
   * Update an enrichment job
   *
   * Updates the job with new data and automatically sets updatedAt timestamp.
   *
   * @param id - Job ID
   * @param data - Partial job data to update
   * @returns The updated enrichment job
   */
  async updateEnrichmentJob(id: number, data: Partial<EnrichmentJob>): Promise<EnrichmentJob> {
    const [job] = await db
      .update(enrichmentJobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(enrichmentJobs.id, id))
      .returning();
    return job;
  }

  /**
   * Cancel an enrichment job
   *
   * Marks the job as cancelled and sets completion timestamp.
   * Does not cancel individual queue items - this should be handled
   * by the enrichment service.
   *
   * @param id - Job ID
   */
  async cancelEnrichmentJob(id: number): Promise<void> {
    await db
      .update(enrichmentJobs)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(enrichmentJobs.id, id));
  }

  // ========================================================================
  // ENRICHMENT QUEUE
  // ========================================================================

  /**
   * Create a new enrichment queue item
   *
   * @param data - Queue item data (jobId, resourceId, status)
   * @returns The created queue item with generated ID
   */
  async createEnrichmentQueueItem(data: InsertEnrichmentQueue): Promise<EnrichmentQueueItem> {
    const [item] = await db
      .insert(enrichmentQueue)
      .values(data)
      .returning();
    return item;
  }

  /**
   * Get all queue items for a specific job
   *
   * Returns items ordered by ID (FIFO processing order).
   *
   * @param jobId - Job ID
   * @returns Array of all queue items for the job
   */
  async getEnrichmentQueueItemsByJob(jobId: number): Promise<EnrichmentQueueItem[]> {
    const items = await db
      .select()
      .from(enrichmentQueue)
      .where(eq(enrichmentQueue.jobId, jobId))
      .orderBy(asc(enrichmentQueue.id));
    return items;
  }

  /**
   * Get pending queue items for a specific job
   *
   * Returns only items with 'pending' status, ordered by ID (FIFO).
   * Used by the enrichment service to fetch the next batch of items to process.
   *
   * @param jobId - Job ID
   * @param limit - Maximum number of items to return (default: 10)
   * @returns Array of pending queue items
   */
  async getPendingEnrichmentQueueItems(jobId: number, limit: number = 10): Promise<EnrichmentQueueItem[]> {
    const items = await db
      .select()
      .from(enrichmentQueue)
      .where(
        and(
          eq(enrichmentQueue.jobId, jobId),
          eq(enrichmentQueue.status, 'pending')
        )
      )
      .orderBy(asc(enrichmentQueue.id))
      .limit(limit);
    return items;
  }

  /**
   * Update an enrichment queue item
   *
   * Updates the queue item with new data and automatically sets updatedAt timestamp.
   * Typically used to update status (processing, completed, failed, skipped)
   * and error messages.
   *
   * @param id - Queue item ID
   * @param data - Partial queue item data to update
   * @returns The updated queue item
   */
  async updateEnrichmentQueueItem(id: number, data: Partial<EnrichmentQueueItem>): Promise<EnrichmentQueueItem> {
    const [item] = await db
      .update(enrichmentQueue)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(enrichmentQueue.id, id))
      .returning();
    return item;
  }
}

/**
 * Singleton instance of enrichment storage
 *
 * Export a single instance for use throughout the enrichment module.
 * This ensures consistent database access and prevents connection issues.
 */
export const enrichmentStorage = new DatabaseEnrichmentStorage();
