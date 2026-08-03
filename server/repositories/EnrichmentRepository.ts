/**
 * ============================================================================
 * ENRICHMENT REPOSITORY - Enrichment Data Access Layer
 * ============================================================================
 *
 * This module provides the data access layer for enrichment operations.
 * It encapsulates all database queries related to AI-powered resource enrichment.
 *
 * KEY OPERATIONS:
 * - Job Management: Create, retrieve, update, and cancel enrichment jobs
 * - Queue Management: Create and retrieve enrichment queue items
 * - Status Tracking: Update job and queue item status (pending/processing/completed/failed)
 *
 * DESIGN NOTES:
 * - Jobs represent bulk enrichment operations (e.g., "enrich all resources")
 * - Queue items are individual resources within a job awaiting enrichment
 * - Supports batch processing with configurable limits
 * - Uses AI to extract metadata, tags, and improve descriptions
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
import { db } from "../db";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";

/**
 * Repository class for enrichment-related database operations
 */
export class EnrichmentRepository {
  /**
   * Create a new enrichment job
   * @param data - Job data (job type, configuration, filters)
   * @returns The created job with ID
   */
  async createEnrichmentJob(data: InsertEnrichmentJob): Promise<EnrichmentJob> {
    const [job] = await db
      .insert(enrichmentJobs)
      .values(data)
      .returning();
    return job;
  }

  /**
   * BUG-047 (run25): admit at most ONE active enrichment job, atomically.
   * Concurrent start requests serialize on a transaction-scoped advisory
   * lock, so the second request sees the first's committed row and gets a
   * distinctive ENRICHMENT_JOB_ACTIVE error. The active-status query is
   * unbounded (no recency window) — an old stuck pending/processing row
   * must still block new admissions until it is cancelled/failed.
   */
  async createEnrichmentJobExclusive(data: InsertEnrichmentJob): Promise<EnrichmentJob> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('enrichment_job_admission'))`);
      const [active] = await tx
        .select({ id: enrichmentJobs.id, status: enrichmentJobs.status })
        .from(enrichmentJobs)
        .where(inArray(enrichmentJobs.status, ["pending", "processing"]))
        .limit(1);
      if (active) {
        const err: any = new Error(
          `Enrichment job #${active.id} is already ${active.status}. Wait for it to finish or cancel it before starting a new one.`
        );
        err.code = "ENRICHMENT_JOB_ACTIVE";
        throw err;
      }
      const [job] = await tx.insert(enrichmentJobs).values(data).returning();
      return job;
    });
  }

  /**
   * Get an enrichment job by ID
   * @param id - Job ID
   * @returns Enrichment job or undefined if not found
   */
  async getEnrichmentJob(id: number): Promise<EnrichmentJob | undefined> {
    const [job] = await db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.id, id));
    return job;
  }

  /**
   * List enrichment jobs
   * @param limit - Maximum number of jobs to return (default: 50)
   * @returns Array of enrichment jobs ordered by creation time (newest first)
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
   * @param id - Job ID
   * @param data - Partial job data to update (status, progress, etc.)
   * @returns Updated job object
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
   * BUG-047 (run25): initialize an admitted job (totals/token fields) and
   * enqueue its resources in ONE transaction, so a mid-initialization failure
   * can never leave a half-enqueued job. Queue rows are batch-inserted in
   * chunks instead of one round trip per resource.
   */
  async initializeEnrichmentJob(
    jobId: number,
    data: Partial<EnrichmentJob>,
    queueItems: InsertEnrichmentQueue[]
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(enrichmentJobs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(enrichmentJobs.id, jobId));
      for (let i = 0; i < queueItems.length; i += 500) {
        await tx.insert(enrichmentQueue).values(queueItems.slice(i, i + 500));
      }
    });
  }

  /**
   * Cancel an enrichment job
   * @param id - Job ID to cancel
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

  /**
   * Create an enrichment queue item
   * @param data - Queue item data (job ID, resource ID, status)
   * @returns The created queue item with ID
   */
  async createEnrichmentQueueItem(data: InsertEnrichmentQueue): Promise<EnrichmentQueueItem> {
    const [item] = await db
      .insert(enrichmentQueue)
      .values(data)
      .returning();
    return item;
  }

  /**
   * Get all enrichment queue items for a specific job
   * @param jobId - Job ID
   * @returns Array of queue items ordered by ID
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
   * Get pending enrichment queue items for a job
   * @param jobId - Job ID
   * @param limit - Maximum number of items to return (default: 10)
   * @returns Array of pending queue items ordered by ID
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
   * @param id - Queue item ID
   * @param data - Partial queue item data to update (status, error, enriched data, etc.)
   * @returns Updated queue item object
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
