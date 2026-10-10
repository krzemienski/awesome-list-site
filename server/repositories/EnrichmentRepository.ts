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
import { isJobOrphaned, livenessUnchangedSince, ORPHANED_BY_RESTART_MESSAGE, WORKER_ID } from "../ai/jobLiveness";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Queue-item status for resources a job never got to (job ended first). */
export const QUEUE_ITEM_CANCELLED_STATUS = 'cancelled';

/**
 * Close out a job's unfinished queue items once the job reaches a terminal
 * state (cancelled, failed, budget stop, orphaned). Without this the rows of
 * an ended job stay 'pending' forever and read as work still queued. Job
 * counters are deliberately untouched: these resources were never processed,
 * so they must not inflate processed/skipped totals.
 */
export async function closeOutEnrichmentQueue(executor: DbOrTx, jobId: number, reason: string): Promise<number> {
  const rows = await executor
    .update(enrichmentQueue)
    .set({
      status: QUEUE_ITEM_CANCELLED_STATUS,
      errorMessage: reason,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(enrichmentQueue.jobId, jobId), inArray(enrichmentQueue.status, ['pending', 'processing'])))
    .returning({ id: enrichmentQueue.id });
  return rows.length;
}

/**
 * Repository class for enrichment-related database operations
 */
/** The 409 admission refusal the start route maps by its `code`. */
function enrichmentJobActiveError(id: number, status: string): Error & { code: string } {
  return Object.assign(
    new Error(`Enrichment job #${id} is already ${status}. Wait for it to finish or cancel it before starting a new one.`),
    { code: "ENRICHMENT_JOB_ACTIVE" },
  );
}

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
   * must still block new admissions until it is cancelled/failed — UNLESS
   * its worker is provably gone (server/ai/jobLiveness.ts: dead owner pid in
   * this container, or a stale heartbeat). Such a restart-orphaned row is
   * reclaimed (failed + queue closed out) inside the same locked transaction,
   * so a restart never leaves a window where new starts 409 on a dead job.
   *
   * @param isLocallyOwned - whether a live worker in THIS process owns a job id
   */
  async createEnrichmentJobExclusive(
    data: InsertEnrichmentJob,
    isLocallyOwned: (jobId: number) => boolean = () => false,
  ): Promise<EnrichmentJob> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('enrichment_job_admission'))`);
      const activeRows = await tx
        .select({
          id: enrichmentJobs.id,
          status: enrichmentJobs.status,
          workerId: enrichmentJobs.workerId,
          heartbeatAt: enrichmentJobs.heartbeatAt,
          startedAt: enrichmentJobs.startedAt,
          createdAt: enrichmentJobs.createdAt,
        })
        .from(enrichmentJobs)
        .where(inArray(enrichmentJobs.status, ["pending", "processing"]));
      const now = Date.now();
      const live = activeRows.find((row) => !isJobOrphaned(row, isLocallyOwned(row.id), now));
      if (live) {
        throw enrichmentJobActiveError(live.id, live.status);
      }
      for (const orphan of activeRows) {
        const [reclaimed] = await tx
          .update(enrichmentJobs)
          .set({
            status: 'failed',
            errorMessage: ORPHANED_BY_RESTART_MESSAGE,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(and(
            eq(enrichmentJobs.id, orphan.id),
            inArray(enrichmentJobs.status, ['pending', 'processing']),
            livenessUnchangedSince(enrichmentJobs, orphan),
          ))
          .returning({ id: enrichmentJobs.id });
        if (reclaimed) {
          await closeOutEnrichmentQueue(tx, orphan.id, 'Not processed: the job was orphaned by a server restart');
          console.log(`🧹 Enrichment admission reclaimed orphaned job #${orphan.id} (worker gone)`);
          continue;
        }
        // No match: either it finished meanwhile (fine) or its worker just
        // heartbeated, which proves it alive — then it still blocks admission.
        const [still] = await tx
          .select({ status: enrichmentJobs.status })
          .from(enrichmentJobs)
          .where(and(eq(enrichmentJobs.id, orphan.id), inArray(enrichmentJobs.status, ['pending', 'processing'])));
        if (still) {
          throw enrichmentJobActiveError(orphan.id, still.status);
        }
      }
      const [job] = await tx
        .insert(enrichmentJobs)
        .values({ ...data, workerId: WORKER_ID, heartbeatAt: new Date() })
        .returning();
      return job;
    });
  }

  /**
   * Refresh the owning worker's heartbeat while the job is active. Returns the
   * row's current status (null when the row is gone) so the worker notices a
   * cancel issued on another instance or a reclaim.
   */
  async heartbeatEnrichmentJob(id: number): Promise<string | null> {
    const [beat] = await db
      .update(enrichmentJobs)
      .set({ heartbeatAt: new Date(), workerId: WORKER_ID })
      .where(and(eq(enrichmentJobs.id, id), inArray(enrichmentJobs.status, ['pending', 'processing'])))
      .returning({ status: enrichmentJobs.status });
    if (beat) return beat.status;
    const [row] = await db.select({ status: enrichmentJobs.status }).from(enrichmentJobs).where(eq(enrichmentJobs.id, id));
    return row?.status ?? null;
  }

  /** Mark a terminal job's remaining (never-processed) queue items cancelled. */
  async closeOutQueue(jobId: number, reason: string): Promise<number> {
    return closeOutEnrichmentQueue(db, jobId, reason);
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
      .set({
        ...data,
        ...(data.status ? { status: sql`case when ${enrichmentJobs.status} = 'cancelled' then 'cancelled' else ${data.status} end` } : {}),
        ...(data.completedAt ? { completedAt: sql`case when ${enrichmentJobs.status} = 'cancelled' then ${enrichmentJobs.completedAt} else ${data.completedAt.toISOString()}::timestamp end` } : {}),
        updatedAt: new Date()
      })
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
      const [initialized] = await tx
        .update(enrichmentJobs)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(enrichmentJobs.id, jobId), eq(enrichmentJobs.status, 'pending')))
        .returning({ id: enrichmentJobs.id });
      if (!initialized) throw new Error('Enrichment job is no longer pending');
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
    // Job + its unprocessed queue items flip together, so a cancelled job can
    // never be left with rows that still read as queued work.
    const changed = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(enrichmentJobs)
        .set({
          status: 'cancelled',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(eq(enrichmentJobs.id, id), inArray(enrichmentJobs.status, ['pending', 'processing'])))
        .returning({ id: enrichmentJobs.id });
      if (row) await closeOutEnrichmentQueue(tx, id, 'Not processed: the job was cancelled');
      return row;
    });
    if (!changed) {
      const job = await this.getEnrichmentJob(id);
      if (!job) throw Object.assign(new Error('Job not found'), { name: 'JobNotFoundError' });
      if (job.status !== 'cancelled') throw Object.assign(new Error('Only active jobs can be cancelled'), { name: 'JobConflictError' });
    }
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
