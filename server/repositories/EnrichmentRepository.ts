/**
 * ENRICHMENT REPOSITORY - AI-Powered Resource Metadata Enrichment
 *
 * Repository for managing enrichment jobs, queue items, embeddings, and related resources.
 */

import { db as dbInstance } from "../db";
import { eq, and, desc, asc, isNull } from "drizzle-orm";
import {
  enrichmentJobs,
  enrichmentQueue,
  resourceEmbeddings,
  relatedResourcesCache,
  resources,
  type EnrichmentJob,
  type InsertEnrichmentJob,
  type EnrichmentQueueItem,
  type InsertEnrichmentQueue,
  type ResourceEmbedding,
  type InsertResourceEmbedding,
  type RelatedResourcesCache,
  type InsertRelatedResourcesCache,
  type Resource,
} from "@shared/schema";

/** Repository for AI enrichment operations */
export class EnrichmentRepository {
  constructor(private db: typeof dbInstance) {}

  // JOB OPERATIONS

  /** Create a new enrichment job */
  async createJob(data: InsertEnrichmentJob): Promise<EnrichmentJob> {
    const [job] = await this.db
      .insert(enrichmentJobs)
      .values(data)
      .returning();
    return job;
  }

  /** Get an enrichment job by ID */
  async getJob(id: number): Promise<EnrichmentJob | undefined> {
    const [job] = await this.db
      .select()
      .from(enrichmentJobs)
      .where(eq(enrichmentJobs.id, id));
    return job;
  }

  /** List enrichment jobs ordered by creation time (newest first) */
  async listJobs(limit: number = 50): Promise<EnrichmentJob[]> {
    const jobs = await this.db
      .select()
      .from(enrichmentJobs)
      .orderBy(desc(enrichmentJobs.createdAt))
      .limit(limit);
    return jobs;
  }

  /** Update an enrichment job */
  async updateJob(id: number, data: Partial<EnrichmentJob>): Promise<EnrichmentJob> {
    const [job] = await this.db
      .update(enrichmentJobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(enrichmentJobs.id, id))
      .returning();
    return job;
  }

  /** Cancel an enrichment job */
  async cancelJob(id: number): Promise<void> {
    await this.db
      .update(enrichmentJobs)
      .set({
        status: "cancelled",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(enrichmentJobs.id, id));
  }

  // QUEUE ITEM OPERATIONS

  /** Create a queue item for a resource */
  async createItem(data: InsertEnrichmentQueue): Promise<EnrichmentQueueItem> {
    const [item] = await this.db
      .insert(enrichmentQueue)
      .values(data)
      .returning();
    return item;
  }

  /** Get all queue items for a job */
  async getItemsByJob(jobId: number): Promise<EnrichmentQueueItem[]> {
    const items = await this.db
      .select()
      .from(enrichmentQueue)
      .where(eq(enrichmentQueue.jobId, jobId))
      .orderBy(asc(enrichmentQueue.id));
    return items;
  }

  /** Get pending queue items for processing */
  async getPendingItems(jobId: number, limit: number = 10): Promise<EnrichmentQueueItem[]> {
    const items = await this.db
      .select()
      .from(enrichmentQueue)
      .where(
        and(
          eq(enrichmentQueue.jobId, jobId),
          eq(enrichmentQueue.status, "pending")
        )
      )
      .orderBy(asc(enrichmentQueue.id))
      .limit(limit);
    return items;
  }

  /** Update a queue item */
  async updateItem(id: number, data: Partial<EnrichmentQueueItem>): Promise<EnrichmentQueueItem> {
    const [item] = await this.db
      .update(enrichmentQueue)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(enrichmentQueue.id, id))
      .returning();
    return item;
  }

  // EMBEDDING OPERATIONS

  /** Store or update a resource embedding */
  async storeEmbedding(data: InsertResourceEmbedding): Promise<ResourceEmbedding> {
    const [embedding] = await this.db
      .insert(resourceEmbeddings)
      .values(data)
      .onConflictDoUpdate({
        target: resourceEmbeddings.resourceId,
        set: {
          embedding: data.embedding,
          model: data.model,
          createdAt: new Date(),
        },
      })
      .returning();
    return embedding;
  }

  /** Get embedding for a resource */
  async getEmbedding(resourceId: number): Promise<ResourceEmbedding | undefined> {
    const [embedding] = await this.db
      .select()
      .from(resourceEmbeddings)
      .where(eq(resourceEmbeddings.resourceId, resourceId));
    return embedding;
  }

  /** Delete embedding for a resource */
  async deleteEmbedding(resourceId: number): Promise<void> {
    await this.db
      .delete(resourceEmbeddings)
      .where(eq(resourceEmbeddings.resourceId, resourceId));
  }

  /** Get resources without embeddings */
  async getResourcesWithoutEmbeddings(limit?: number): Promise<Resource[]> {
    const query = this.db
      .select()
      .from(resources)
      .leftJoin(resourceEmbeddings, eq(resources.id, resourceEmbeddings.resourceId))
      .where(
        and(
          eq(resources.status, "approved"),
          isNull(resourceEmbeddings.id)
        )
      )
      .orderBy(asc(resources.id));

    if (limit) {
      const results = await query.limit(limit);
      return results.map((r) => r.resources);
    }

    const results = await query;
    return results.map((r) => r.resources);
  }

  /** Queue resources for embedding generation */
  async queueEmbeddingGeneration(options: { batchSize?: number; startedBy?: string }): Promise<number> {
    const { batchSize = 10, startedBy } = options;

    // Get all resources without embeddings
    const resourcesToProcess = await this.getResourcesWithoutEmbeddings();

    // Create a job for embedding generation
    const job = await this.createJob({
      filter: "embedding_generation",
      batchSize,
      startedBy: startedBy || undefined,
    });

    // Update job with total count
    await this.updateJob(job.id, {
      totalResources: resourcesToProcess.length,
      status: "pending",
    });

    // Queue each resource for processing
    for (const resource of resourcesToProcess) {
      await this.createItem({
        jobId: job.id,
        resourceId: resource.id,
        status: "pending",
      });
    }

    return resourcesToProcess.length;
  }

  // RELATED RESOURCES CACHE OPERATIONS

  /** Store or update related resources cache */
  async storeRelatedCache(data: InsertRelatedResourcesCache): Promise<RelatedResourcesCache> {
    const [cache] = await this.db
      .insert(relatedResourcesCache)
      .values(data)
      .onConflictDoUpdate({
        target: relatedResourcesCache.resourceId,
        set: {
          relatedResourceIds: data.relatedResourceIds,
          scores: data.scores,
          metadata: data.metadata,
          lastUpdatedAt: new Date(),
        },
      })
      .returning();
    return cache;
  }

  /** Get related resources cache */
  async getRelatedCache(resourceId: number): Promise<RelatedResourcesCache | undefined> {
    const [cache] = await this.db
      .select()
      .from(relatedResourcesCache)
      .where(eq(relatedResourcesCache.resourceId, resourceId));
    return cache;
  }

  /** Delete related resources cache */
  async deleteRelatedCache(resourceId: number): Promise<void> {
    await this.db
      .delete(relatedResourcesCache)
      .where(eq(relatedResourcesCache.resourceId, resourceId));
  }
}
