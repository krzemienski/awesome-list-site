import { storage } from '../storage';
import { generateResourceTags } from './tagging';
import { fetchUrlMetadata, type UrlMetadata } from './urlScraper';
import type { EnrichmentJob } from '@shared/schema';
import { createSystemAuditContext } from '../middleware/requestContext';

type EnrichmentOutcome = 'success' | 'skipped' | 'failed';

interface QueueBatchEnrichmentOptions {
  filter?: 'all' | 'unenriched';
  batchSize?: number;
  startedBy?: string;
}

interface JobStatus {
  id: string;
  status: string;
  totalResources: number;
  processedResources: number;
  successfulResources: number;
  failedResources: number;
  skippedResources: number;
  progress: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: string;
}

export class EnrichmentService {
  private static instance: EnrichmentService;
  private processingJobs: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): EnrichmentService {
    if (!EnrichmentService.instance) {
      EnrichmentService.instance = new EnrichmentService();
    }
    return EnrichmentService.instance;
  }

  async queueBatchEnrichment(options: QueueBatchEnrichmentOptions): Promise<string> {
    const {
      filter = 'unenriched',
      batchSize = 10,
      startedBy
    } = options;

    const { resources } = await storage.listResources({
      status: 'approved',
      limit: 10000
    });

    let resourcesToEnrich = resources;
    
    if (filter === 'unenriched') {
      resourcesToEnrich = resources.filter(resource => {
        const metadata = resource.metadata || {};
        return !metadata.aiEnriched && 
               (!resource.description || resource.description.trim() === '');
      });
    }

    const job = await storage.createEnrichmentJob({
      filter,
      batchSize,
      startedBy: startedBy || undefined
    });

    await storage.updateEnrichmentJob(job.id, {
      totalResources: resourcesToEnrich.length,
      status: 'pending'
    });

    for (const resource of resourcesToEnrich) {
      await storage.createEnrichmentQueueItem({
        jobId: job.id,
        resourceId: resource.id,
        status: 'pending'
      });
    }

    this.startProcessing(job.id).catch(error => {
      console.error(`Error processing enrichment job ${job.id}:`, error);
      storage.updateEnrichmentJob(job.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });
    });

    return job.id;
  }

  private async startProcessing(jobId: string): Promise<void> {
    if (this.processingJobs.has(jobId)) {
      console.log(`Job ${jobId} is already being processed`);
      return;
    }

    this.processingJobs.add(jobId);

    try {
      const job = await storage.getEnrichmentJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.status === 'cancelled') {
        console.log(`Job ${jobId} was cancelled`);
        return;
      }

      await storage.updateEnrichmentJob(jobId, {
        status: 'processing',
        startedAt: new Date()
      });

      await this.processJobBatches(jobId, job.batchSize || 10);

      const updatedJob = await storage.getEnrichmentJob(jobId);
      if (updatedJob && updatedJob.status !== 'cancelled') {
        await storage.updateEnrichmentJob(jobId, {
          status: 'completed',
          completedAt: new Date()
        });
      }
    } catch (error: any) {
      console.error(`Error processing job ${jobId}:`, error);
      await storage.updateEnrichmentJob(jobId, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  private async processJobBatches(jobId: string, batchSize: number): Promise<void> {
    while (true) {
      const job = await storage.getEnrichmentJob(jobId);
      if (!job || job.status === 'cancelled') {
        console.log(`Job ${jobId} was cancelled or not found`);
        break;
      }

      const pendingItems = await storage.getPendingEnrichmentQueueItems(jobId, batchSize);
      
      if (pendingItems.length === 0) {
        break;
      }

      await this.processBatch(jobId, pendingItems);
      
      await this.delay(2000);
    }
  }

  async processBatch(jobId: string, batch: any[]): Promise<void> {
    const job = await storage.getEnrichmentJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    for (const queueItem of batch) {
      if (job.status === 'cancelled') {
        console.log(`Job ${jobId} was cancelled, stopping batch processing`);
        break;
      }

      try {
        const outcome = await this.enrichResource(queueItem.resourceId, jobId);
        
        // Get current job state ONCE
        const currentJob = await storage.getEnrichmentJob(jobId);
        if (!currentJob) continue;
        
        // Update counters and queue item based on outcome
        if (outcome === 'success') {
          // Success: Update processed, successful, and resource IDs
          await storage.updateEnrichmentJob(jobId, {
            processedResources: (currentJob.processedResources || 0) + 1,
            successfulResources: (currentJob.successfulResources || 0) + 1,
            processedResourceIds: [...(currentJob.processedResourceIds || []), queueItem.resourceId]
          });
          
          await storage.updateEnrichmentQueueItem(queueItem.id, {
            status: 'completed',
            processedAt: new Date()
          });
          
        } else if (outcome === 'skipped') {
          // Skipped: Update processed and skipped counters
          await storage.updateEnrichmentJob(jobId, {
            processedResources: (currentJob.processedResources || 0) + 1,
            skippedResources: (currentJob.skippedResources || 0) + 1
          });
          
          // CRITICAL: Update queue item status to 'skipped'
          await storage.updateEnrichmentQueueItem(queueItem.id, {
            status: 'skipped',
            errorMessage: 'Invalid URL or manually curated',
            processedAt: new Date()
          });
          
        } else if (outcome === 'failed') {
          // Failed: Update processed, failed, and failed IDs
          await storage.updateEnrichmentJob(jobId, {
            processedResources: (currentJob.processedResources || 0) + 1,
            failedResources: (currentJob.failedResources || 0) + 1,
            failedResourceIds: [...(currentJob.failedResourceIds || []), queueItem.resourceId]
          });
          
          await storage.updateEnrichmentQueueItem(queueItem.id, {
            status: 'failed',
            errorMessage: 'Failed after retries',
            processedAt: new Date()
          });
        }
        
      } catch (error: any) {
        // Unexpected errors (like resource not found)
        console.error(`Error processing resource ${queueItem.resourceId}:`, error);
        
        const currentJob = await storage.getEnrichmentJob(jobId);
        if (currentJob) {
          await storage.updateEnrichmentJob(jobId, {
            processedResources: (currentJob.processedResources || 0) + 1,
            failedResources: (currentJob.failedResources || 0) + 1,
            failedResourceIds: [...(currentJob.failedResourceIds || []), queueItem.resourceId]
          });
        }
        
        await storage.updateEnrichmentQueueItem(queueItem.id, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date()
        });
      }
    }
  }

  async enrichResource(resourceId: string, jobId?: string): Promise<EnrichmentOutcome> {
    const resource = await storage.getResource(resourceId);
    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }

    // Skip resources with invalid URLs (like "#readme", "mailto:", etc.)
    if (!this.isValidUrl(resource.url)) {
      console.log(`Skipping resource ${resourceId} - invalid URL: ${resource.url}`);
      return 'skipped';
    }

    const metadata = resource.metadata || {};
    if (metadata.manuallyEnriched) {
      console.log(`Skipping resource ${resourceId} - manually curated`);
      return 'skipped';
    }

    let retryCount = 0;
    const maxRetries = 3;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        // Fetch URL metadata first
        let urlMetadata: UrlMetadata | null = null;
        try {
          console.log(`Fetching metadata from URL: ${resource.url}`);
          urlMetadata = await fetchUrlMetadata(resource.url);
          
          if (urlMetadata.error) {
            console.log(`URL metadata fetch failed: ${urlMetadata.error}`);
          } else {
            console.log(`Successfully fetched metadata: ${urlMetadata.title || 'No title'}`);
          }
        } catch (error) {
          console.error(`Error fetching URL metadata:`, error);
        }

        // Then call Claude AI with existing code
        const aiResult = await generateResourceTags(
          resource.title,
          resource.description,
          resource.url
        );

        // Merge URL metadata with AI results
        const enhancedMetadata = {
          ...metadata,
          aiEnriched: true,
          aiEnrichedAt: new Date().toISOString(),
          suggestedTags: aiResult.tags,
          suggestedCategory: aiResult.category,
          suggestedSubcategory: aiResult.subcategory,
          confidence: aiResult.confidence,
          aiModel: 'claude-haiku-4-5',
          
          // Add URL metadata if available
          ...(urlMetadata && !urlMetadata.error && {
            urlScraped: true,
            urlScrapedAt: new Date().toISOString(),
            scrapedTitle: urlMetadata.title,
            scrapedDescription: urlMetadata.description,
            ogImage: urlMetadata.ogImage,
            ogTitle: urlMetadata.ogTitle,
            ogDescription: urlMetadata.ogDescription,
            twitterCard: urlMetadata.twitterCard,
            twitterImage: urlMetadata.twitterImage,
            favicon: urlMetadata.favicon,
            author: urlMetadata.author,
            keywords: urlMetadata.keywords,
          }),
        };

        const updates: any = {
          metadata: enhancedMetadata
        };

        if (!resource.description || resource.description.trim() === '') {
          const description = this.generateDescriptionFromUrl(resource.url, resource.title);
          if (description) {
            updates.description = description;
          }
        }

        const titleNeedsImprovement = this.needsTitleImprovement(resource.title);
        if (titleNeedsImprovement) {
          const improvedTitle = this.improveTitle(resource.title, resource.url);
          if (improvedTitle) {
            updates.title = improvedTitle;
          }
        }

        await storage.updateResource(resourceId, updates);

        await storage.logResourceAudit(
          resourceId,
          'ai_enriched',
          undefined,
          { aiResult, updates },
          `AI enrichment completed with confidence ${aiResult.confidence}`,
          createSystemAuditContext('ai-enrichment')
        );

        return 'success';
      } catch (error: any) {
        lastError = error;
        retryCount++;
        
        if (retryCount < maxRetries) {
          console.log(`Retry ${retryCount}/${maxRetries} for resource ${resourceId}`);
          await this.delay(1000 * retryCount);
        } else {
          await storage.logResourceAudit(
            resourceId,
            'ai_enrichment_failed',
            undefined,
            { error: error.message },
            `AI enrichment failed after ${maxRetries} retries`,
            createSystemAuditContext('ai-enrichment-failed')
          );
          
          return 'failed';
        }
      }
    }
    
    return 'failed';
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const job = await storage.getEnrichmentJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const totalResources = job.totalResources || 0;
    const processedResources = job.processedResources || 0;

    const progress = totalResources > 0 
      ? Math.round((processedResources / totalResources) * 100)
      : 0;

    let estimatedTimeRemaining: string | undefined;
    if (job.status === 'processing' && job.startedAt && processedResources > 0) {
      const elapsedMs = Date.now() - new Date(job.startedAt).getTime();
      const avgTimePerResource = elapsedMs / processedResources;
      const remainingResources = totalResources - processedResources;
      const estimatedRemainingMs = avgTimePerResource * remainingResources;
      
      const minutes = Math.floor(estimatedRemainingMs / 60000);
      const seconds = Math.floor((estimatedRemainingMs % 60000) / 1000);
      estimatedTimeRemaining = `${minutes}m ${seconds}s`;
    }

    return {
      id: job.id,
      status: job.status || 'unknown',
      totalResources: job.totalResources || 0,
      processedResources: job.processedResources || 0,
      successfulResources: job.successfulResources || 0,
      failedResources: job.failedResources || 0,
      skippedResources: job.skippedResources || 0,
      progress,
      errorMessage: job.errorMessage || undefined,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      estimatedTimeRemaining
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    await storage.cancelEnrichmentJob(jobId);
  }

  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const deletedCount = await storage.deleteOldEnrichmentJobs(daysOld);
    console.log(`Cleaned up ${deletedCount} enrichment jobs older than ${daysOld} days`);
    return deletedCount;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private needsTitleImprovement(title: string): boolean {
    const patterns = [
      /^[a-z0-9-]+\/[a-z0-9-]+$/i,
      /^https?:\/\//i,
      /github\.com/i
    ];
    
    return patterns.some(pattern => pattern.test(title)) || title.length < 3;
  }

  private improveTitle(title: string, url: string): string | null {
    if (url.includes('github.com')) {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const repoName = match[2].replace(/\.git$/, '');
        return repoName
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
    
    return null;
  }

  private generateDescriptionFromUrl(url: string, title: string): string | null {
    if (url.includes('github.com')) {
      return `${title} - A GitHub repository for video/multimedia development`;
    }
    
    const domain = this.extractDomain(url);
    if (domain) {
      return `${title} - Resource from ${domain}`;
    }
    
    return null;
  }

  private extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const enrichmentService = EnrichmentService.getInstance();
