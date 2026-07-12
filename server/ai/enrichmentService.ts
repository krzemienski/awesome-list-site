import { db } from '../db';
import { sql, eq } from 'drizzle-orm';
import { enrichmentQueue, enrichmentJobs } from '@shared/schema';
import { EnrichmentRepository } from '../repositories/EnrichmentRepository';
import { ResourceRepository } from '../repositories/ResourceRepository';
import { AuditRepository } from '../repositories/AuditRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { fetchUrlMetadata, type UrlMetadata } from './urlScraper';
import { promoteEnrichmentSuggestions } from './promoteEnrichmentSuggestions';
import { humanizeTitle, sanitizeDescription } from '../github/importHygiene';
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { AgentEventEmitter } from './agentEvents';
import { runAgentQuery } from './runAgentQuery';
import { DEFAULT_ENRICHMENT_MODEL, resolveModel, type AgentRunConfig } from './agentRuntime';
import type { EnrichmentJob, EnrichmentQueueItem } from '@shared/schema';

type EnrichmentOutcome = 'success' | 'skipped' | 'failed';

interface QueueBatchEnrichmentOptions {
  filter?: 'all' | 'unenriched';
  batchSize?: number;
  startedBy?: string;
  model?: string | null;
  baseUrl?: string | null;
  authTokenEncrypted?: string | null;
  authTokenLast4?: string | null;
}

interface JobStatus {
  id: number;
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

// A resource pre-loaded + pre-scraped for the current agent batch. The scraped
// UrlMetadata is cached here so submit_enrichment reuses the exact scrape that
// get_pending_batch surfaced (no double fetch) and the media-preservation
// contract in buildScrapedFields is honored.
interface BatchItem {
  queueItemId: number;
  resourceId: number;
  title: string;
  description: string;
  url: string;
  category: string | null;
  subcategory: string | null;
  subSubcategory: string | null;
  metadata: Record<string, any>;
  urlMetadata: UrlMetadata | null;
  submitted: boolean;
}

function preview(text: string, n = 500): string {
  const t = (text || '').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

/**
 * Build the scraped-metadata patch that gets merged over a resource's existing
 * metadata during enrichment.
 *
 * Media-preservation contract: only fields the scrape actually returned are
 * included, so spreading the result over existing metadata can never wipe media
 * saved by an earlier successful run (a partial re-scrape leaves old values
 * intact). ogImage + ogImageBlurhash are handled as a coupled unit:
 *  - no fresh ogImage  → neither key is written (existing image + hash preserved)
 *  - fresh ogImage + new hash → both written
 *  - fresh, CHANGED ogImage but no new hash → hash is explicitly cleared
 *    (undefined) so the stale placeholder can't outlive its image
 *  - fresh, UNCHANGED ogImage but no new hash → hash left untouched (a transient
 *    blurhash failure must not drop a good existing placeholder)
 */
export function buildScrapedFields(
  urlMetadata: UrlMetadata | null,
  existingMetadata: Record<string, any> = {}
): Record<string, any> {
  const scrapedFields: Record<string, any> = {};
  if (urlMetadata && !urlMetadata.error) {
    scrapedFields.urlScraped = true;
    scrapedFields.urlScrapedAt = new Date().toISOString();
    if (urlMetadata.ogImage) {
      scrapedFields.ogImage = urlMetadata.ogImage;
      if (urlMetadata.ogImageBlurhash) {
        scrapedFields.ogImageBlurhash = urlMetadata.ogImageBlurhash;
      } else if (urlMetadata.ogImage !== existingMetadata.ogImage) {
        // Image changed but no new blurhash → drop the stale placeholder
        // rather than keep a blur that no longer matches the image.
        scrapedFields.ogImageBlurhash = undefined;
      }
    }
    if (urlMetadata.title) scrapedFields.scrapedTitle = urlMetadata.title;
    if (urlMetadata.description) scrapedFields.scrapedDescription = urlMetadata.description;
    if (urlMetadata.ogTitle) scrapedFields.ogTitle = urlMetadata.ogTitle;
    if (urlMetadata.ogDescription) scrapedFields.ogDescription = urlMetadata.ogDescription;
    if (urlMetadata.twitterCard) scrapedFields.twitterCard = urlMetadata.twitterCard;
    if (urlMetadata.twitterImage) scrapedFields.twitterImage = urlMetadata.twitterImage;
    if (urlMetadata.favicon) scrapedFields.favicon = urlMetadata.favicon;
    if (urlMetadata.author) scrapedFields.author = urlMetadata.author;
    if (urlMetadata.keywords && urlMetadata.keywords.length > 0) {
      scrapedFields.keywords = urlMetadata.keywords;
    }
  }
  return scrapedFields;
}

interface ActiveJob {
  jobId: number;
  abortController: AbortController;
}

interface EnrichmentRunTotals {
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
  turns: number;
  batches: number;
}

export class EnrichmentService {
  private static instance: EnrichmentService;
  private processingJobs: Set<number> = new Set();
  private activeJobs: Map<number, ActiveJob> = new Map();
  private enrichmentRepo: EnrichmentRepository;
  private resourceRepo: ResourceRepository;
  private auditRepo: AuditRepository;
  private categoryRepo: CategoryRepository;

  private constructor() {
    this.enrichmentRepo = new EnrichmentRepository();
    this.resourceRepo = new ResourceRepository();
    this.auditRepo = new AuditRepository();
    this.categoryRepo = new CategoryRepository();
  }

  public static getInstance(): EnrichmentService {
    if (!EnrichmentService.instance) {
      EnrichmentService.instance = new EnrichmentService();
    }
    return EnrichmentService.instance;
  }

  async queueBatchEnrichment(options: QueueBatchEnrichmentOptions): Promise<number> {
    const {
      filter = 'unenriched',
      batchSize = 10,
      startedBy
    } = options;

    const { resources } = await this.resourceRepo.listResources({
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

    const job = await this.enrichmentRepo.createEnrichmentJob({
      filter,
      batchSize,
      startedBy: startedBy || undefined,
      model: options.model || undefined,
      baseUrl: options.baseUrl || undefined,
    });

    await this.enrichmentRepo.updateEnrichmentJob(job.id, {
      totalResources: resourcesToEnrich.length,
      status: 'pending',
      authTokenEncrypted: options.authTokenEncrypted || null,
      authTokenLast4: options.authTokenLast4 || null,
    });

    for (const resource of resourcesToEnrich) {
      await this.enrichmentRepo.createEnrichmentQueueItem({
        jobId: job.id,
        resourceId: resource.id,
        status: 'pending'
      });
    }

    this.startProcessing(job.id).catch(error => {
      console.error(`Error processing enrichment job ${job.id}:`, error);
      this.enrichmentRepo.updateEnrichmentJob(job.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });
    });

    return job.id;
  }

  private async startProcessing(jobId: number): Promise<void> {
    if (this.processingJobs.has(jobId)) {
      console.log(`Job ${jobId} is already being processed`);
      return;
    }

    this.processingJobs.add(jobId);
    const abortController = new AbortController();
    this.activeJobs.set(jobId, { jobId, abortController });

    const emitter = new AgentEventEmitter('enrichment', jobId);
    const totals: EnrichmentRunTotals = { costUsd: 0, tokensIn: 0, tokensOut: 0, turns: 0, batches: 0 };
    const agentLog: Array<{ role: string; content: string; timestamp: string }> = [];

    try {
      const job = await this.enrichmentRepo.getEnrichmentJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.status === 'cancelled') {
        console.log(`Job ${jobId} was cancelled`);
        return;
      }

      await this.enrichmentRepo.updateEnrichmentJob(jobId, {
        status: 'processing',
        startedAt: new Date()
      });

      const config: AgentRunConfig = {
        model: job.model || null,
        baseUrl: job.baseUrl || null,
        authTokenEncrypted: job.authTokenEncrypted || null,
      };
      const model = resolveModel(config, DEFAULT_ENRICHMENT_MODEL);

      await this.processJobBatches(jobId, job.batchSize || 10, model, config, abortController, emitter, totals, agentLog);

      const updatedJob = await this.enrichmentRepo.getEnrichmentJob(jobId);
      const cancelled = updatedJob?.status === 'cancelled' || abortController.signal.aborted;
      await this.enrichmentRepo.updateEnrichmentJob(jobId, {
        status: cancelled ? 'cancelled' : 'completed',
        completedAt: new Date(),
        metadata: this.buildJobMetadata(updatedJob, model, totals, agentLog),
      });
    } catch (error: any) {
      console.error(`Error processing job ${jobId}:`, error);
      const cur = await this.enrichmentRepo.getEnrichmentJob(jobId);
      agentLog.push({ role: 'error', content: `Job failed: ${error.message}`, timestamp: new Date().toISOString() });
      await this.enrichmentRepo.updateEnrichmentJob(jobId, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
        metadata: this.buildJobMetadata(cur, cur?.model || DEFAULT_ENRICHMENT_MODEL, totals, agentLog),
      });
    } finally {
      this.processingJobs.delete(jobId);
      this.activeJobs.delete(jobId);
    }
  }

  private buildJobMetadata(
    job: EnrichmentJob | undefined,
    model: string,
    totals: EnrichmentRunTotals,
    agentLog: Array<{ role: string; content: string; timestamp: string }>,
  ): Record<string, any> {
    return {
      ...(job?.metadata || {}),
      agent: {
        model,
        batches: totals.batches,
        turns: totals.turns,
        totalInputTokens: totals.tokensIn,
        totalOutputTokens: totals.tokensOut,
        estimatedCostUsd: totals.costUsd.toFixed(4),
      },
      // Keep only the most recent lines; agent_events holds the full structured trace.
      agentLog: agentLog.slice(-100),
    };
  }

  private async processJobBatches(
    jobId: number,
    batchSize: number,
    model: string,
    config: AgentRunConfig,
    abortController: AbortController,
    emitter: AgentEventEmitter,
    totals: EnrichmentRunTotals,
    agentLog: Array<{ role: string; content: string; timestamp: string }>,
  ): Promise<void> {
    while (true) {
      if (abortController.signal.aborted) break;

      const job = await this.enrichmentRepo.getEnrichmentJob(jobId);
      if (!job || job.status === 'cancelled') {
        console.log(`Job ${jobId} was cancelled or not found`);
        break;
      }

      const pendingItems = await this.enrichmentRepo.getPendingEnrichmentQueueItems(jobId, batchSize);
      if (pendingItems.length === 0) break;

      // Prepare the batch: load resources, apply skip rules, pre-scrape.
      const batch = await this.prepareBatch(jobId, pendingItems);

      if (batch.length === 0) {
        // Every pending item in this window was skipped/failed during prep.
        continue;
      }

      await this.runEnrichmentBatch(jobId, batch, model, config, abortController, emitter, totals, agentLog);

      // A user cancel mid-run must not count as a retry (which could force-fail
      // an item at maxRetries-1); leave unsubmitted items pending and stop.
      if (abortController.signal.aborted) break;

      // Anything still pending after the run didn't get submitted this pass →
      // count a retry; fail items that have exhausted their retry budget so the
      // job can terminate instead of looping on a stuck resource forever.
      for (const item of batch) {
        if (item.submitted) continue;
        const fresh = await db
          .select()
          .from(enrichmentQueue)
          .where(eq(enrichmentQueue.id, item.queueItemId));
        const current = fresh[0] as EnrichmentQueueItem | undefined;
        if (!current || current.status !== 'pending') continue;
        const retryCount = (current.retryCount || 0) + 1;
        const maxRetries = current.maxRetries || 3;
        if (retryCount >= maxRetries) {
          await this.enrichmentRepo.updateEnrichmentQueueItem(item.queueItemId, {
            status: 'failed',
            retryCount,
            errorMessage: 'Agent did not enrich this resource after maximum retries',
            processedAt: new Date(),
          });
          await this.bumpJobCounters(jobId, 'failed', item.resourceId);
        } else {
          await this.enrichmentRepo.updateEnrichmentQueueItem(item.queueItemId, { retryCount });
        }
      }

      await this.delay(1500);
    }
  }

  /**
   * Load each pending queue item's resource, apply the skip rules (invalid URL /
   * manually curated / missing resource) directly, and pre-scrape the survivors
   * so the agent works from real page content.
   */
  private async prepareBatch(jobId: number, pendingItems: EnrichmentQueueItem[]): Promise<BatchItem[]> {
    const enrichable: BatchItem[] = [];

    for (const queueItem of pendingItems) {
      const resource = await this.resourceRepo.getResource(queueItem.resourceId);
      if (!resource) {
        await this.enrichmentRepo.updateEnrichmentQueueItem(queueItem.id, {
          status: 'failed',
          errorMessage: `Resource ${queueItem.resourceId} not found`,
          processedAt: new Date(),
        });
        await this.bumpJobCounters(jobId, 'failed', queueItem.resourceId);
        continue;
      }

      const metadata = (resource.metadata || {}) as Record<string, any>;

      if (!this.isValidUrl(resource.url) || metadata.manuallyEnriched) {
        await this.enrichmentRepo.updateEnrichmentQueueItem(queueItem.id, {
          status: 'skipped',
          errorMessage: 'Invalid URL or manually curated',
          processedAt: new Date(),
        });
        await this.bumpJobCounters(jobId, 'skipped', queueItem.resourceId);
        continue;
      }

      let urlMetadata: UrlMetadata | null = null;
      try {
        urlMetadata = await fetchUrlMetadata(resource.url);
      } catch (error) {
        console.error(`Error fetching URL metadata for ${resource.url}:`, error);
      }

      enrichable.push({
        queueItemId: queueItem.id,
        resourceId: resource.id,
        title: resource.title,
        description: resource.description || '',
        url: resource.url,
        category: resource.category,
        subcategory: resource.subcategory,
        subSubcategory: resource.subSubcategory,
        metadata,
        urlMetadata,
        submitted: false,
      });
    }

    return enrichable;
  }

  /**
   * ONE Claude Agent SDK run per batch. The orchestrator pulls the batch via the
   * get_pending_batch tool and calls submit_enrichment for each resource; the
   * tool does the deterministic scrape-merge + hierarchy promotion + persistence.
   */
  private async runEnrichmentBatch(
    jobId: number,
    batch: BatchItem[],
    model: string,
    config: AgentRunConfig,
    abortController: AbortController,
    emitter: AgentEventEmitter,
    totals: EnrichmentRunTotals,
    agentLog: Array<{ role: string; content: string; timestamp: string }>,
  ): Promise<void> {
    const byResourceId = new Map<number, BatchItem>();
    for (const item of batch) byResourceId.set(item.resourceId, item);

    const addLog = async (role: string, content: string) => {
      const stored = content.length > 8000 ? content.slice(0, 8000) + `\n…[truncated]` : content;
      agentLog.push({ role, content: stored, timestamp: new Date().toISOString() });
      console.log(`[enrichment:${jobId}] [${role}] ${content}`);
    };
    const emitCall = (name: string, input: any) =>
      emitter.emit({ actor: 'orchestrator', actorType: 'orchestrator', eventType: 'tool_call', targetActor: name, summary: preview(JSON.stringify(input)) });
    const emitResult = (name: string, out: string, ms: number) =>
      emitter.emit({ actor: name, actorType: 'tool', eventType: 'tool_result', targetActor: 'orchestrator', summary: preview(out), durationMs: ms });

    const getPendingBatch = tool(
      'get_pending_batch',
      'Return the resources awaiting enrichment in this batch, with the scraped page title/description/keywords and the current categorization. Call this ONCE at the start.',
      {},
      async () => {
        const started = Date.now();
        await emitCall('get_pending_batch', { count: batch.filter(b => !b.submitted).length });
        const resourcesOut = batch
          .filter(b => !b.submitted)
          .map(b => ({
            resourceId: b.resourceId,
            title: b.title,
            description: preview(b.description, 400),
            url: b.url,
            current_category: b.category || null,
            current_subcategory: b.subcategory || null,
            current_sub_subcategory: b.subSubcategory || null,
            scraped_title: b.urlMetadata?.error ? null : preview(b.urlMetadata?.title || '', 200) || null,
            scraped_description: b.urlMetadata?.error ? null : preview(b.urlMetadata?.description || '', 400) || null,
            keywords: b.urlMetadata?.keywords?.slice(0, 12) || [],
          }));
        const text = JSON.stringify({ count: resourcesOut.length, resources: resourcesOut });
        await emitResult('get_pending_batch', `${resourcesOut.length} resources`, Date.now() - started);
        return { content: [{ type: 'text', text }] };
      },
    );

    const submitEnrichment = tool(
      'submit_enrichment',
      'Persist your categorization for ONE resource from the batch. Call once per resource.',
      {
        resourceId: z.number().describe('The resourceId from get_pending_batch'),
        tags: z.array(z.string()).describe('3-5 relevant tags (video technologies, codecs, streaming, processing features)'),
        category: z.string().describe('Primary category (e.g. Video Processing, Streaming, Codecs, Players, Editing). Prefer an existing category from the guidance list.'),
        subcategory: z.string().optional().describe('Subcategory if applicable'),
        subSubcategory: z.string().optional().describe('Sub-subcategory (more specific topic) if applicable'),
        confidence: z.number().describe('Confidence 1-100 in this categorization'),
      },
      async (input) => {
        const started = Date.now();
        await emitCall('submit_enrichment', { resourceId: input.resourceId, category: input.category, confidence: input.confidence });
        const item = byResourceId.get(input.resourceId);
        let text: string;
        if (!item) {
          text = JSON.stringify({ saved: false, reason: `resourceId ${input.resourceId} is not part of this batch` });
        } else if (item.submitted) {
          text = JSON.stringify({ saved: false, reason: 'already submitted' });
        } else {
          try {
            await this.applyEnrichment(jobId, item, {
              tags: input.tags || [],
              category: input.category,
              subcategory: input.subcategory,
              subSubcategory: input.subSubcategory,
              confidence: input.confidence,
            }, model);
            item.submitted = true;
            const remaining = batch.filter(b => !b.submitted).length;
            text = JSON.stringify({ saved: true, remaining });
            await addLog('enriched', `Resource ${item.resourceId} "${item.title}" → ${input.category}${input.subcategory ? ' › ' + input.subcategory : ''} (confidence ${input.confidence})`);
          } catch (err: any) {
            text = JSON.stringify({ saved: false, reason: err?.message || 'persist failed' });
          }
        }
        await emitResult('submit_enrichment', text, Date.now() - started);
        return { content: [{ type: 'text', text }] };
      },
    );

    const mcpServer = createSdkMcpServer({ name: 'enrichment', version: '1.0.0', tools: [getPendingBatch, submitEnrichment] });

    const taxonomyHint = await this.buildTaxonomyHint();
    const systemPrompt =
`You are the ENRICHMENT agent for an "awesome video" curated resource database (video streaming, codecs, players, infrastructure, tools). Your job is to categorize and tag resources.

YOUR TOOLS (in-process):
- get_pending_batch — returns the resources to enrich in this batch, each with its scraped page title/description/keywords and current categorization. Call ONCE.
- submit_enrichment — save your categorization (tags + category + optional subcategory/sub-subcategory + confidence) for ONE resource.

WORKFLOW:
1. Call get_pending_batch once to see every resource in the batch.
2. For EACH resource: read its title, description and scraped page content, then decide:
   - 3-5 relevant tags (video technologies, codecs, streaming, processing features).
   - A primary category. Prefer an EXISTING category/subcategory from the guidance below over inventing a new one.
   - A subcategory and sub-subcategory when a more specific fit clearly applies.
   - A confidence score from 1-100.
3. Call submit_enrichment for that resource with your decision.
4. Repeat until you have submitted EVERY resource returned by get_pending_batch, then stop.

RULES:
- Process ALL resources in the batch — do not stop early.
- Base your tags and categories on the ACTUAL title/description/scraped content. Never invent facts about a resource.
- Prefer specific, accurate categories over generic ones. Reuse existing taxonomy paths when they fit.

==== EXISTING TAXONOMY (prefer these paths) ====
${taxonomyHint}`;

    const items = batch.length;
    const maxTurns = Math.min(80, items * 4 + 12);
    const maxBudgetUsd = Math.min(2.0, +(items * 0.03 + 0.05).toFixed(2));

    await addLog('system', `Enrichment batch started. Model: ${model}, Items: ${items}, Budget: $${maxBudgetUsd}, Max turns: ${maxTurns}${config.baseUrl ? `, Base URL: ${config.baseUrl}` : ''}`);

    const result = await runAgentQuery({
      jobType: 'enrichment',
      jobId,
      emitter,
      prompt: `Enrich the ${items} resource${items === 1 ? '' : 's'} in this batch. Start by calling get_pending_batch.`,
      systemPrompt,
      model,
      config,
      mcpServers: { enrichment: mcpServer },
      allowedTools: ['mcp__enrichment__get_pending_batch', 'mcp__enrichment__submit_enrichment'],
      // Single-agent flow: no delegation, no web access.
      extraDisallowedTools: [
        'WebSearch', 'Task', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskOutput', 'TaskStop', 'TaskUpdate', 'SendMessage', 'ReportFindings',
      ],
      maxTurns,
      maxBudgetUsd,
      abortController,
      log: addLog,
    });

    totals.batches += 1;
    totals.turns += result.numTurns;
    totals.tokensIn += result.tokensIn;
    totals.tokensOut += result.tokensOut;
    totals.costUsd += result.totalCostUsd;

    const submitted = batch.filter(b => b.submitted).length;
    await addLog('system', `Batch ${result.aborted ? 'cancelled' : (result.subtype || 'done')}: ${submitted}/${items} enriched, turns ${result.numTurns}, cost $${result.totalCostUsd.toFixed(4)}`);

    // Persist running aggregates so the admin UI reflects progress mid-job.
    const cur = await this.enrichmentRepo.getEnrichmentJob(jobId);
    await this.enrichmentRepo.updateEnrichmentJob(jobId, {
      metadata: this.buildJobMetadata(cur, model, totals, agentLog),
    });
  }

  /**
   * Deterministic persistence for one enriched resource: merge the scraped
   * fields, promote hierarchy suggestions (blanks only), backfill title/description,
   * write the resource + audit log, and advance the queue-item + job counters.
   */
  private async applyEnrichment(
    jobId: number,
    item: BatchItem,
    ai: { tags: string[]; category: string; subcategory?: string; subSubcategory?: string; confidence: number },
    model: string,
  ): Promise<void> {
    // Tool contract is a 1-100 scale, so always normalize by 100 (a model
    // sending 1 = lowest, not 100%). Clamp to guard out-of-range values.
    const confidence01 = Math.max(0, Math.min(1, (ai.confidence || 0) / 100));

    const scrapedFields = buildScrapedFields(item.urlMetadata, item.metadata);

    const enhancedMetadata = {
      ...item.metadata,
      aiEnriched: true,
      aiEnrichedAt: new Date().toISOString(),
      suggestedTags: ai.tags,
      suggestedCategory: ai.category,
      suggestedSubcategory: ai.subcategory,
      suggestedSubSubcategory: ai.subSubcategory,
      confidence: confidence01,
      aiModel: model,
      ...scrapedFields,
    };

    const updates: any = { metadata: enhancedMetadata };

    const hierarchyUpdates = await promoteEnrichmentSuggestions(
      this.categoryRepo,
      {
        category: item.category,
        subcategory: item.subcategory,
        subSubcategory: item.subSubcategory,
      },
      {
        category: ai.category,
        subcategory: ai.subcategory,
        subSubcategory: ai.subSubcategory,
      },
    );
    Object.assign(updates, hierarchyUpdates);

    if (!item.description || item.description.trim() === '') {
      const description = this.generateDescriptionFromUrl(item.url, item.title);
      if (description) updates.description = description;
    }

    if (this.needsTitleImprovement(item.title)) {
      const improvedTitle = this.improveTitle(item.title, item.url);
      if (improvedTitle) updates.title = improvedTitle;
    }

    // Run3 audit R3-25/26/27: enrichment must never persist slug titles,
    // HTML entities, or email bylines into the live columns.
    if (updates.title) updates.title = humanizeTitle(updates.title);
    if (updates.description) updates.description = sanitizeDescription(updates.description);

    await this.resourceRepo.updateResource(item.resourceId, updates);

    await this.auditRepo.logResourceAudit(
      item.resourceId,
      'ai_enriched',
      undefined,
      { aiResult: { ...ai, confidence: confidence01 }, updates },
      `AI enrichment completed with confidence ${confidence01}`
    );

    await this.enrichmentRepo.updateEnrichmentQueueItem(item.queueItemId, {
      status: 'completed',
      processedAt: new Date(),
      aiMetadata: {
        suggestedTags: ai.tags,
        suggestedCategory: ai.category,
        suggestedSubcategory: ai.subcategory,
        suggestedSubSubcategory: ai.subSubcategory,
        confidence: confidence01,
      },
    });

    await this.bumpJobCounters(jobId, 'success', item.resourceId);
  }

  /**
   * Advance the per-job counters for one processed resource with a single
   * SQL-atomic UPDATE. The Agent SDK can execute several submit_enrichment tool
   * calls concurrently within one assistant turn, so a read-then-write here
   * would lose increments / drop ids; DB-side `+ 1` and jsonb `||` are race-safe.
   */
  private async bumpJobCounters(jobId: number, outcome: EnrichmentOutcome, resourceId: number): Promise<void> {
    if (outcome === 'success') {
      await db.update(enrichmentJobs).set({
        processedResources: sql`COALESCE(${enrichmentJobs.processedResources}, 0) + 1`,
        successfulResources: sql`COALESCE(${enrichmentJobs.successfulResources}, 0) + 1`,
        processedResourceIds: sql`COALESCE(${enrichmentJobs.processedResourceIds}, '[]'::jsonb) || ${JSON.stringify([resourceId])}::jsonb`,
      }).where(eq(enrichmentJobs.id, jobId));
    } else if (outcome === 'skipped') {
      await db.update(enrichmentJobs).set({
        processedResources: sql`COALESCE(${enrichmentJobs.processedResources}, 0) + 1`,
        skippedResources: sql`COALESCE(${enrichmentJobs.skippedResources}, 0) + 1`,
      }).where(eq(enrichmentJobs.id, jobId));
    } else if (outcome === 'failed') {
      await db.update(enrichmentJobs).set({
        processedResources: sql`COALESCE(${enrichmentJobs.processedResources}, 0) + 1`,
        failedResources: sql`COALESCE(${enrichmentJobs.failedResources}, 0) + 1`,
        failedResourceIds: sql`COALESCE(${enrichmentJobs.failedResourceIds}, '[]'::jsonb) || ${JSON.stringify([resourceId])}::jsonb`,
      }).where(eq(enrichmentJobs.id, jobId));
    }
  }

  /** Compact "Category › Subcategory" list to steer the agent toward existing taxonomy paths. */
  private async buildTaxonomyHint(): Promise<string> {
    try {
      const rows = await db.execute<{ category: string; subcategory: string | null }>(sql`
        SELECT c.name AS category, sc.name AS subcategory
          FROM categories c
          LEFT JOIN subcategories sc ON sc.category_id = c.id
         ORDER BY c.name, sc.name NULLS FIRST
         LIMIT 200
      `);
      const lines = rows.rows.map(r => (r.subcategory ? `  ${r.category} › ${r.subcategory}` : `  ${r.category}`));
      return lines.length ? lines.join('\n') : '  (no categories defined yet — choose sensible video/multimedia categories)';
    } catch {
      return '  (taxonomy unavailable — choose sensible video/multimedia categories)';
    }
  }

  async getJobStatus(jobId: number): Promise<JobStatus> {
    const job = await this.enrichmentRepo.getEnrichmentJob(jobId);
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

  async cancelJob(jobId: number): Promise<void> {
    const active = this.activeJobs.get(jobId);
    if (active) active.abortController.abort();
    await this.enrichmentRepo.cancelEnrichmentJob(jobId);
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
