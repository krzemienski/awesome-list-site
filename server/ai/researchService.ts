/**
 * ============================================================================
 * RESEARCH SERVICE - AI-Powered Research Job Queue
 * ============================================================================
 *
 * This service manages AI research jobs for awesome lists including:
 * - URL validation (dead link detection, redirect tracking)
 * - Resource enrichment (metadata enhancement, description generation)
 * - Discovery (finding new resources via AI analysis)
 * - Trend analysis (analyzing category trends and patterns)
 *
 * Features:
 * - Job queue with status tracking
 * - Multi-model support with cost optimization
 * - Daily usage aggregation for budgeting
 * - Markdown report generation
 *
 * ============================================================================
 */

import { db } from '../db';
import { researchJobs, researchFindings, aiUsageDaily, resources, categories, awesomeLists } from '@shared/schema';
import { ClaudeService, CLAUDE_MODELS, ClaudeModelKey, APICallResult } from './claudeService';
import { eq, and, sql, desc, gte, lte, between } from 'drizzle-orm';

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export type ResearchJobType = 'validation' | 'enrichment' | 'discovery' | 'trend_analysis';

const JOB_TYPE_CONFIG: Record<ResearchJobType, {
  defaultModel: ClaudeModelKey;
  maxDuration: number; // seconds
  maxSources: number;
  description: string;
}> = {
  validation: {
    defaultModel: 'claude-3-5-haiku',
    maxDuration: 300,
    maxSources: 5,
    description: 'Validate resource URLs and metadata'
  },
  enrichment: {
    defaultModel: 'claude-3-opus',
    maxDuration: 600,
    maxSources: 10,
    description: 'Deep enrichment with AI analysis'
  },
  discovery: {
    defaultModel: 'claude-3-opus',
    maxDuration: 900,
    maxSources: 20,
    description: 'Discover new resources'
  },
  trend_analysis: {
    defaultModel: 'claude-3-5-sonnet',
    maxDuration: 600,
    maxSources: 15,
    description: 'Analyze trends in category'
  },
};

export interface StartResearchJobParams {
  awesomeListId: number;
  jobType: ResearchJobType;
  model?: ClaudeModelKey;
  config?: {
    depth?: 'shallow' | 'medium' | 'deep';
    focusAreas?: string[];
    maxSources?: number;
  };
  startedBy?: string;
}

export interface ResearchJobStatus {
  id: string;
  status: string;
  jobType: ResearchJobType;
  modelUsed: string;
  progress: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  webSourcesScraped: number;
  totalFindings: number;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
}

export interface ResearchReport {
  jobId: string;
  title: string;
  jobType: ResearchJobType;
  model: string;
  generatedAt: Date;
  costUsd: number;
  executiveSummary: string;
  methodology: {
    sourcesAnalyzed: number;
    webPagesScraped: number;
    duration: string;
  };
  findings: Array<{
    type: string;
    severity: string;
    description: string;
    confidence: number;
    data: any;
  }>;
  recommendations: string[];
  sources: Array<{ url: string; title: string }>;
  confidenceScore: number;
}

interface FindingInsert {
  jobId: string;
  findingType: string;
  targetResourceId?: number;
  targetCategoryId?: number;
  data: Record<string, any>;
  confidence?: number;
  severity?: string;
}

// ============================================================================
// RESEARCH SERVICE CLASS
// ============================================================================

export class ResearchService {
  private static instance: ResearchService;
  private claudeService: ClaudeService;
  private processingJobs: Set<string> = new Set();

  private constructor() {
    this.claudeService = ClaudeService.getInstance();
  }

  public static getInstance(): ResearchService {
    if (!ResearchService.instance) {
      ResearchService.instance = new ResearchService();
    }
    return ResearchService.instance;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Queue a new research job
   */
  public async queueResearchJob(params: StartResearchJobParams): Promise<string> {
    const { awesomeListId, jobType, model, config, startedBy } = params;

    // Validate awesome list exists
    const [awesomeList] = await db
      .select()
      .from(awesomeLists)
      .where(eq(awesomeLists.id, awesomeListId))
      .limit(1);

    if (!awesomeList) {
      throw new Error(`Awesome list with ID ${awesomeListId} not found`);
    }

    // Use default model for job type if not specified
    const selectedModel = model || JOB_TYPE_CONFIG[jobType].defaultModel;

    // Insert job with pending status
    const [job] = await db
      .insert(researchJobs)
      .values({
        awesomeListId,
        jobType,
        status: 'pending',
        config: config || {},
        modelUsed: selectedModel,
        startedBy: startedBy || null,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostUsd: 0,
        webSourcesScraped: 0,
        totalFindings: 0,
        appliedFindings: 0,
        agentLogs: [],
      })
      .returning();

    console.log(`Research job ${job.id} queued: ${jobType} for list ${awesomeListId}`);

    // Start processing in background
    this.processJob(job.id).catch(error => {
      console.error(`Error processing research job ${job.id}:`, error);
    });

    return job.id;
  }

  /**
   * Process a queued research job
   */
  public async processJob(jobId: string): Promise<void> {
    // Check if already processing
    if (this.processingJobs.has(jobId)) {
      console.log(`Job ${jobId} is already being processed`);
      return;
    }

    this.processingJobs.add(jobId);

    try {
      // Get job details
      const [job] = await db
        .select()
        .from(researchJobs)
        .where(eq(researchJobs.id, jobId))
        .limit(1);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.status === 'cancelled') {
        console.log(`Job ${jobId} was cancelled`);
        return;
      }

      // Update status to processing
      await db
        .update(researchJobs)
        .set({
          status: 'processing',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(researchJobs.id, jobId));

      // Run appropriate handler based on job type
      const jobType = job.jobType as ResearchJobType;
      const config = job.config || {};

      switch (jobType) {
        case 'validation':
          await this.runValidationJob(jobId, config);
          break;
        case 'enrichment':
          await this.runEnrichmentJob(jobId, config);
          break;
        case 'discovery':
          await this.runDiscoveryJob(jobId, config);
          break;
        case 'trend_analysis':
          await this.runTrendAnalysisJob(jobId, config);
          break;
        default:
          throw new Error(`Unknown job type: ${jobType}`);
      }

      // Mark as completed
      await db
        .update(researchJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(researchJobs.id, jobId));

      console.log(`Research job ${jobId} completed successfully`);

    } catch (error: any) {
      console.error(`Research job ${jobId} failed:`, error);

      await db
        .update(researchJobs)
        .set({
          status: 'failed',
          errorMessage: error.message || 'Unknown error',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(researchJobs.id, jobId));

    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  /**
   * Get job status
   */
  public async getJobStatus(jobId: string): Promise<ResearchJobStatus | null> {
    const [job] = await db
      .select()
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId))
      .limit(1);

    if (!job) {
      return null;
    }

    // Calculate progress based on job type and status
    let progress = 0;
    if (job.status === 'completed') {
      progress = 100;
    } else if (job.status === 'processing' && job.startedAt) {
      const elapsed = Date.now() - new Date(job.startedAt).getTime();
      const maxDuration = JOB_TYPE_CONFIG[job.jobType as ResearchJobType]?.maxDuration || 600;
      progress = Math.min(90, Math.round((elapsed / (maxDuration * 1000)) * 100));
    } else if (job.status === 'failed') {
      progress = 0;
    }

    return {
      id: job.id,
      status: job.status,
      jobType: job.jobType as ResearchJobType,
      modelUsed: job.modelUsed || 'unknown',
      progress,
      totalInputTokens: job.totalInputTokens,
      totalOutputTokens: job.totalOutputTokens,
      totalCostUsd: job.totalCostUsd,
      webSourcesScraped: job.webSourcesScraped,
      totalFindings: job.totalFindings,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    };
  }

  /**
   * Cancel a running job
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    const [job] = await db
      .select()
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId))
      .limit(1);

    if (!job) {
      return false;
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    await db
      .update(researchJobs)
      .set({
        status: 'cancelled',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(researchJobs.id, jobId));

    return true;
  }

  /**
   * Generate a report for a completed job
   */
  public async generateReport(jobId: string): Promise<ResearchReport | null> {
    const [job] = await db
      .select()
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId))
      .limit(1);

    if (!job) {
      return null;
    }

    // Get all findings for this job
    const findings = await db
      .select()
      .from(researchFindings)
      .where(eq(researchFindings.jobId, jobId))
      .orderBy(desc(researchFindings.confidence));

    // Calculate duration
    let duration = 'N/A';
    if (job.startedAt && job.completedAt) {
      const durationMs = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      duration = `${minutes}m ${seconds}s`;
    }

    // Generate executive summary based on findings
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const warningCount = findings.filter(f => f.severity === 'warning').length;
    const infoCount = findings.filter(f => f.severity === 'info').length;

    const executiveSummary = this.generateExecutiveSummary(
      job.jobType as ResearchJobType,
      findings.length,
      criticalCount,
      warningCount,
      job.totalCostUsd
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(findings);

    // Extract sources from findings
    const sources: Array<{ url: string; title: string }> = [];
    for (const finding of findings) {
      const data = finding.data as Record<string, any>;
      if (data.url) {
        sources.push({ url: data.url, title: data.title || data.url });
      }
    }

    // Calculate average confidence
    const avgConfidence = findings.length > 0
      ? findings.reduce((sum, f) => sum + (f.confidence || 0), 0) / findings.length
      : 0;

    return {
      jobId: job.id,
      title: `${JOB_TYPE_CONFIG[job.jobType as ResearchJobType]?.description || job.jobType} Report`,
      jobType: job.jobType as ResearchJobType,
      model: job.modelUsed || 'unknown',
      generatedAt: new Date(),
      costUsd: job.totalCostUsd,
      executiveSummary,
      methodology: {
        sourcesAnalyzed: findings.length,
        webPagesScraped: job.webSourcesScraped,
        duration,
      },
      findings: findings.map(f => ({
        type: f.findingType,
        severity: f.severity,
        description: (f.data as any)?.description || (f.data as any)?.reason || 'No description',
        confidence: f.confidence || 0,
        data: f.data,
      })),
      recommendations,
      sources: sources.slice(0, 20), // Limit to 20 sources
      confidenceScore: Math.round(avgConfidence * 100) / 100,
    };
  }

  /**
   * List research jobs with filters
   */
  public async listJobs(
    filters?: { status?: string; jobType?: string; awesomeListId?: number },
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    let query = db.select().from(researchJobs);

    if (filters?.status) {
      query = query.where(eq(researchJobs.status, filters.status)) as any;
    }
    if (filters?.jobType) {
      query = query.where(eq(researchJobs.jobType, filters.jobType)) as any;
    }
    if (filters?.awesomeListId) {
      query = query.where(eq(researchJobs.awesomeListId, filters.awesomeListId)) as any;
    }

    return query
      .orderBy(desc(researchJobs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Count research jobs with filters
   */
  public async countJobs(filters?: { status?: string; jobType?: string; awesomeListId?: number }): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)::int` }).from(researchJobs);

    if (filters?.status) {
      query = query.where(eq(researchJobs.status, filters.status)) as any;
    }
    if (filters?.jobType) {
      query = query.where(eq(researchJobs.jobType, filters.jobType)) as any;
    }
    if (filters?.awesomeListId) {
      query = query.where(eq(researchJobs.awesomeListId, filters.awesomeListId)) as any;
    }

    const result = await query;
    return result[0]?.count || 0;
  }

  /**
   * Apply a finding (mark as applied)
   */
  public async applyFinding(findingId: string, userId: string): Promise<boolean> {
    const [finding] = await db
      .select()
      .from(researchFindings)
      .where(eq(researchFindings.id, findingId))
      .limit(1);

    if (!finding || finding.applied) {
      return false;
    }

    await db
      .update(researchFindings)
      .set({
        applied: true,
        appliedAt: new Date(),
        appliedBy: userId,
      })
      .where(eq(researchFindings.id, findingId));

    // Increment applied findings count on the job
    await db
      .update(researchJobs)
      .set({
        appliedFindings: sql`${researchJobs.appliedFindings} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(researchJobs.id, finding.jobId));

    return true;
  }

  /**
   * Dismiss a finding
   */
  public async dismissFinding(findingId: string, userId: string): Promise<boolean> {
    const [finding] = await db
      .select()
      .from(researchFindings)
      .where(eq(researchFindings.id, findingId))
      .limit(1);

    if (!finding || finding.dismissed) {
      return false;
    }

    await db
      .update(researchFindings)
      .set({
        dismissed: true,
        dismissedAt: new Date(),
        dismissedBy: userId,
      })
      .where(eq(researchFindings.id, findingId));

    return true;
  }

  /**
   * Get cost statistics for a date range
   */
  public async getCostStats(startDate?: Date, endDate?: Date): Promise<{
    byModel: Record<string, { calls: number; tokens: number; costUsd: number }>;
    byDay: Array<{ date: string; costUsd: number }>;
    total: { costUsd: number; jobCount: number };
  }> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate || new Date();

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Get daily usage aggregates
    const dailyUsage = await db
      .select()
      .from(aiUsageDaily)
      .where(
        and(
          gte(aiUsageDaily.date, startStr),
          lte(aiUsageDaily.date, endStr)
        )
      )
      .orderBy(aiUsageDaily.date);

    // Aggregate by model
    const byModel: Record<string, { calls: number; tokens: number; costUsd: number }> = {};
    for (const row of dailyUsage) {
      if (!byModel[row.model]) {
        byModel[row.model] = { calls: 0, tokens: 0, costUsd: 0 };
      }
      byModel[row.model].calls += row.jobCount;
      byModel[row.model].tokens += row.totalInputTokens + row.totalOutputTokens;
      byModel[row.model].costUsd += row.totalCostUsd;
    }

    // Aggregate by day
    const byDayMap: Record<string, number> = {};
    for (const row of dailyUsage) {
      byDayMap[row.date] = (byDayMap[row.date] || 0) + row.totalCostUsd;
    }
    const byDay = Object.entries(byDayMap)
      .map(([date, costUsd]) => ({ date, costUsd }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals
    const total = {
      costUsd: dailyUsage.reduce((sum, r) => sum + r.totalCostUsd, 0),
      jobCount: dailyUsage.reduce((sum, r) => sum + r.jobCount, 0),
    };

    return { byModel, byDay, total };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Update daily usage aggregates
   */
  private async updateDailyUsage(
    model: ClaudeModelKey,
    inputTokens: number,
    outputTokens: number,
    costUsd: number
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Try to update existing record
    const result = await db
      .update(aiUsageDaily)
      .set({
        totalInputTokens: sql`${aiUsageDaily.totalInputTokens} + ${inputTokens}`,
        totalOutputTokens: sql`${aiUsageDaily.totalOutputTokens} + ${outputTokens}`,
        totalCostUsd: sql`${aiUsageDaily.totalCostUsd} + ${costUsd}`,
        jobCount: sql`${aiUsageDaily.jobCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiUsageDaily.date, today),
          eq(aiUsageDaily.model, model)
        )
      )
      .returning();

    // If no record exists, insert new one
    if (result.length === 0) {
      await db
        .insert(aiUsageDaily)
        .values({
          date: today,
          model,
          totalInputTokens: inputTokens,
          totalOutputTokens: outputTokens,
          totalCostUsd: costUsd,
          jobCount: 1,
        });
    }
  }

  /**
   * Update job token/cost tracking
   */
  private async updateJobCosts(
    jobId: string,
    inputTokens: number,
    outputTokens: number,
    costUsd: number
  ): Promise<void> {
    await db
      .update(researchJobs)
      .set({
        totalInputTokens: sql`${researchJobs.totalInputTokens} + ${inputTokens}`,
        totalOutputTokens: sql`${researchJobs.totalOutputTokens} + ${outputTokens}`,
        totalCostUsd: sql`${researchJobs.totalCostUsd} + ${costUsd}`,
        updatedAt: new Date(),
      })
      .where(eq(researchJobs.id, jobId));
  }

  /**
   * Create a finding record
   */
  private async createFinding(finding: FindingInsert): Promise<void> {
    await db
      .insert(researchFindings)
      .values({
        jobId: finding.jobId,
        findingType: finding.findingType,
        targetResourceId: finding.targetResourceId || null,
        targetCategoryId: finding.targetCategoryId || null,
        data: finding.data,
        confidence: finding.confidence || null,
        severity: finding.severity || 'info',
      });

    // Increment total findings count
    await db
      .update(researchJobs)
      .set({
        totalFindings: sql`${researchJobs.totalFindings} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(researchJobs.id, finding.jobId));
  }

  /**
   * Check if job is cancelled
   */
  private async isJobCancelled(jobId: string): Promise<boolean> {
    const [job] = await db
      .select({ status: researchJobs.status })
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId))
      .limit(1);

    return job?.status === 'cancelled';
  }

  /**
   * Get resources for an awesome list
   */
  private async getResourcesForList(awesomeListId: number, limit: number = 100): Promise<any[]> {
    // Note: resources.category is a text field, not a foreign key
    // We'll get all resources since there's no direct link to awesomeListId
    const result = await db
      .select({
        id: resources.id,
        title: resources.title,
        url: resources.url,
        description: resources.description,
        category: resources.category,
      })
      .from(resources)
      .limit(limit);

    return result;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    jobType: ResearchJobType,
    totalFindings: number,
    criticalCount: number,
    warningCount: number,
    totalCost: number
  ): string {
    const typeDescriptions: Record<ResearchJobType, string> = {
      validation: 'URL validation and health check',
      enrichment: 'AI-powered metadata enrichment',
      discovery: 'new resource discovery',
      trend_analysis: 'trend and pattern analysis',
    };

    let summary = `This ${typeDescriptions[jobType]} identified ${totalFindings} findings. `;

    if (criticalCount > 0) {
      summary += `${criticalCount} critical issues require immediate attention. `;
    }
    if (warningCount > 0) {
      summary += `${warningCount} warnings should be reviewed. `;
    }

    summary += `Total cost: $${totalCost.toFixed(4)}.`;

    return summary;
  }

  /**
   * Generate recommendations from findings
   */
  private generateRecommendations(findings: any[]): string[] {
    const recommendations: string[] = [];

    const deadLinks = findings.filter(f => f.findingType === 'dead_link');
    const outdated = findings.filter(f => f.findingType === 'outdated');
    const missingDesc = findings.filter(f => f.findingType === 'missing_description');
    const newResources = findings.filter(f => f.findingType === 'new_resource');

    if (deadLinks.length > 0) {
      recommendations.push(`Review and update ${deadLinks.length} dead or broken links`);
    }
    if (outdated.length > 0) {
      recommendations.push(`Update ${outdated.length} potentially outdated resources`);
    }
    if (missingDesc.length > 0) {
      recommendations.push(`Add descriptions to ${missingDesc.length} resources`);
    }
    if (newResources.length > 0) {
      recommendations.push(`Consider adding ${newResources.length} newly discovered resources`);
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate actions required - list is well maintained');
    }

    return recommendations;
  }

  // ==========================================================================
  // JOB HANDLERS
  // ==========================================================================

  /**
   * Run validation job - check URLs for dead links
   */
  private async runValidationJob(jobId: string, config: any): Promise<void> {
    const [job] = await db
      .select()
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId))
      .limit(1);

    if (!job) return;

    const resourceList = await this.getResourcesForList(
      job.awesomeListId,
      config.maxSources || JOB_TYPE_CONFIG.validation.maxSources * 20
    );

    const model = (job.modelUsed as ClaudeModelKey) || 'claude-3-5-haiku';

    for (const resource of resourceList) {
      if (await this.isJobCancelled(jobId)) break;

      try {
        // Check URL validity
        const response = await fetch(resource.url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          await this.createFinding({
            jobId,
            findingType: 'dead_link',
            targetResourceId: resource.id,
            data: {
              url: resource.url,
              httpStatus: response.status,
              lastChecked: new Date().toISOString(),
              suggestedAction: response.status === 404 ? 'remove' : 'update',
            },
            confidence: 1.0,
            severity: 'critical',
          });
        } else if (response.redirected) {
          await this.createFinding({
            jobId,
            findingType: 'redirect',
            targetResourceId: resource.id,
            data: {
              url: resource.url,
              redirectedTo: response.url,
              httpStatus: response.status,
              lastChecked: new Date().toISOString(),
              suggestedAction: 'update',
            },
            confidence: 1.0,
            severity: 'warning',
          });
        }

        // Update web sources scraped count
        await db
          .update(researchJobs)
          .set({
            webSourcesScraped: sql`${researchJobs.webSourcesScraped} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(researchJobs.id, jobId));

      } catch (error: any) {
        await this.createFinding({
          jobId,
          findingType: 'dead_link',
          targetResourceId: resource.id,
          data: {
            url: resource.url,
            httpStatus: 0,
            errorMessage: error.message,
            lastChecked: new Date().toISOString(),
            suggestedAction: 'review',
          },
          confidence: 0.8,
          severity: 'warning',
        });
      }

      // Small delay between requests
      await this.delay(100);
    }
  }

  /**
   * Run enrichment job - enhance resource metadata with AI
   */
  private async runEnrichmentJob(jobId: string, config: any): Promise<void> {
    const [job] = await db
      .select()
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId))
      .limit(1);

    if (!job) return;

    const resourceList = await this.getResourcesForList(
      job.awesomeListId,
      config.maxSources || JOB_TYPE_CONFIG.enrichment.maxSources
    );

    const model = (job.modelUsed as ClaudeModelKey) || 'claude-3-opus';

    // Filter resources that need enrichment
    const needsEnrichment = resourceList.filter(r => !r.description || r.description.trim() === '');

    for (const resource of needsEnrichment) {
      if (await this.isJobCancelled(jobId)) break;

      const prompt = `Analyze this resource and suggest improvements:

Title: ${resource.title}
URL: ${resource.url}
Current Description: ${resource.description || 'None'}

Please provide:
1. A suggested description (2-3 sentences)
2. Suggested tags (3-5 relevant keywords)
3. Any quality concerns

Format as JSON:
{
  "suggestedDescription": "...",
  "suggestedTags": ["...", "..."],
  "qualityConcerns": "..." or null
}`;

      const result = await this.claudeService.generateResponse(
        prompt,
        500,
        'You are a technical content curator specializing in developer resources.',
        model
      );

      // Track costs
      if (result.usage) {
        await this.updateJobCosts(jobId, result.usage.inputTokens, result.usage.outputTokens, result.usage.costUsd);
        await this.updateDailyUsage(model, result.usage.inputTokens, result.usage.outputTokens, result.usage.costUsd);
      }

      if (result.data) {
        try {
          const jsonMatch = result.data.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.suggestedDescription) {
              await this.createFinding({
                jobId,
                findingType: 'missing_description',
                targetResourceId: resource.id,
                data: {
                  field: 'description',
                  currentValue: resource.description || '',
                  suggestedValue: parsed.suggestedDescription,
                  suggestedTags: parsed.suggestedTags,
                  reason: 'AI-generated description suggestion',
                },
                confidence: 0.85,
                severity: 'info',
              });
            }
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
        }
      }

      await this.delay(1000); // Rate limiting
    }
  }

  /**
   * Run discovery job - find new resources
   */
  private async runDiscoveryJob(jobId: string, config: any): Promise<void> {
    const [job] = await db
      .select()
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId))
      .limit(1);

    if (!job) return;

    // Get existing resources to understand the list context
    const existingResources = await this.getResourcesForList(job.awesomeListId, 50);
    const existingUrls = existingResources.map(r => r.url);

    // Get categories for context
    const categoryList = await db
      .select()
      .from(categories);

    const model = (job.modelUsed as ClaudeModelKey) || 'claude-3-opus';

    const prompt = `You are analyzing an awesome list with the following categories:
${categoryList.map(c => `- ${c.name}`).join('\n')}

Sample existing resources:
${existingResources.slice(0, 10).map(r => `- ${r.title}: ${r.url}`).join('\n')}

Based on this context, suggest 5-10 new resources that would be valuable additions to this list.
Focus on well-known, high-quality resources that are missing.

Format as JSON array:
[
  {
    "title": "Resource Name",
    "url": "https://...",
    "description": "Brief description",
    "suggestedCategory": "Category name from list above",
    "reason": "Why this resource should be added"
  }
]`;

    const result = await this.claudeService.generateResponse(
      prompt,
      2000,
      'You are an expert curator of technical resources.',
      model
    );

    // Track costs
    if (result.usage) {
      await this.updateJobCosts(jobId, result.usage.inputTokens, result.usage.outputTokens, result.usage.costUsd);
      await this.updateDailyUsage(model, result.usage.inputTokens, result.usage.outputTokens, result.usage.costUsd);
    }

    if (result.data) {
      try {
        const jsonMatch = result.data.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);

          for (const suggestion of suggestions) {
            // Skip if URL already exists
            if (existingUrls.includes(suggestion.url)) continue;

            await this.createFinding({
              jobId,
              findingType: 'new_resource',
              data: {
                title: suggestion.title,
                url: suggestion.url,
                description: suggestion.description,
                suggestedCategory: suggestion.suggestedCategory,
                source: 'AI Discovery',
                reason: suggestion.reason,
              },
              confidence: 0.7,
              severity: 'info',
            });
          }
        }
      } catch (parseError) {
        console.error('Failed to parse AI discovery response:', parseError);
      }
    }
  }

  /**
   * Run trend analysis job - analyze patterns and trends
   */
  private async runTrendAnalysisJob(jobId: string, config: any): Promise<void> {
    const [job] = await db
      .select()
      .from(researchJobs)
      .where(eq(researchJobs.id, jobId))
      .limit(1);

    if (!job) return;

    const resourceList = await this.getResourcesForList(job.awesomeListId, 100);
    const categoryList = await db
      .select()
      .from(categories);

    const model = (job.modelUsed as ClaudeModelKey) || 'claude-3-5-sonnet';

    const prompt = `Analyze the following awesome list structure and identify trends, gaps, and recommendations:

Categories:
${categoryList.map(c => `- ${c.name} (${resourceList.filter(r => r.category === c.name).length} resources)`).join('\n')}

Sample Resources:
${resourceList.slice(0, 30).map(r => `- ${r.title} (${r.url})`).join('\n')}

Please analyze:
1. Category balance - are some categories over/under-represented?
2. Technology trends - what areas are well-covered vs missing?
3. Resource quality indicators
4. Recommendations for list improvement

Format as JSON:
{
  "categoryAnalysis": [
    {"category": "...", "status": "balanced|overcrowded|sparse", "recommendation": "..."}
  ],
  "trendingTopics": ["...", "..."],
  "missingTopics": ["...", "..."],
  "overallHealth": "excellent|good|needs_improvement",
  "recommendations": ["...", "..."]
}`;

    const result = await this.claudeService.generateResponse(
      prompt,
      1500,
      'You are an expert in developer ecosystem analysis and technical curation.',
      model
    );

    // Track costs
    if (result.usage) {
      await this.updateJobCosts(jobId, result.usage.inputTokens, result.usage.outputTokens, result.usage.costUsd);
      await this.updateDailyUsage(model, result.usage.inputTokens, result.usage.outputTokens, result.usage.costUsd);
    }

    if (result.data) {
      try {
        const jsonMatch = result.data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);

          // Create findings for category issues
          if (analysis.categoryAnalysis) {
            for (const cat of analysis.categoryAnalysis) {
              if (cat.status !== 'balanced') {
                const category = categoryList.find(c => c.name === cat.category);
                await this.createFinding({
                  jobId,
                  findingType: 'category_suggestion',
                  targetCategoryId: category?.id,
                  data: {
                    category: cat.category,
                    status: cat.status,
                    recommendation: cat.recommendation,
                  },
                  confidence: 0.75,
                  severity: cat.status === 'sparse' ? 'warning' : 'info',
                });
              }
            }
          }

          // Create overall analysis finding
          await this.createFinding({
            jobId,
            findingType: 'trend_analysis',
            data: {
              overallHealth: analysis.overallHealth,
              trendingTopics: analysis.trendingTopics,
              missingTopics: analysis.missingTopics,
              recommendations: analysis.recommendations,
            },
            confidence: 0.8,
            severity: analysis.overallHealth === 'needs_improvement' ? 'warning' : 'info',
          });
        }
      } catch (parseError) {
        console.error('Failed to parse trend analysis response:', parseError);
      }
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const researchService = ResearchService.getInstance();
