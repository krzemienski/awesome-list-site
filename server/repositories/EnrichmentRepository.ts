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
import { eq, and, desc, asc } from "drizzle-orm";

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
