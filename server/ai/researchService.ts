import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import { db } from '../db';
import { resources, categories, subcategories, subSubcategories, researchJobs, researchDiscoveries } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import type { ResearchJob, ResearchDiscovery } from '@shared/schema';

const RESEARCH_MODEL = "claude-sonnet-4-20250514";

const COST_PER_INPUT_TOKEN = 3.0 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15.0 / 1_000_000;

interface ResearchToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let normalized = parsed.protocol + '//' + parsed.hostname.replace(/^www\./, '') + parsed.pathname;
    normalized = normalized.replace(/\/+$/, '');
    return normalized.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

const researchTools: ResearchToolDefinition[] = [
  {
    name: "check_duplicate",
    description: "Check if a URL already exists in the database of known resources. Returns true if duplicate, false if new. Always use this before saving a discovery.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to check for duplicates" }
      },
      required: ["url"]
    }
  },
  {
    name: "save_discovery",
    description: "Save a newly discovered video streaming resource to the database for admin review. Only call this after confirming the URL is not a duplicate and the resource is relevant to video streaming/development.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the resource" },
        url: { type: "string", description: "URL of the resource" },
        description: { type: "string", description: "Brief description of what this resource offers for video streaming/development" },
        suggested_category: { type: "string", description: "Best matching category from the existing category tree" },
        suggested_subcategory: { type: "string", description: "Best matching subcategory, or empty string if none fits" },
        confidence: { type: "integer", description: "Confidence score 1-100 that this is a quality, relevant resource" },
        reasoning: { type: "string", description: "Brief explanation of why this resource is valuable and how you found it" }
      },
      required: ["title", "url", "description", "suggested_category", "confidence", "reasoning"]
    }
  },
  {
    name: "get_category_tree",
    description: "Get the full category hierarchy (categories > subcategories > sub-subcategories) to understand how resources are organized. Use this to determine which category a discovered resource belongs to.",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_existing_resources",
    description: "Get a sample of existing resources in a specific category to understand what's already covered and find gaps.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category name to list resources from" },
        limit: { type: "integer", description: "Maximum number of resources to return (default 20)" }
      },
      required: ["category"]
    }
  }
];

interface ActiveJob {
  jobId: number;
  abortController: AbortController;
}

class ResearchService {
  private static instance: ResearchService;
  private activeJobs: Map<number, ActiveJob> = new Map();
  private existingUrls: Set<string> = new Set();

  private constructor() {}

  static getInstance(): ResearchService {
    if (!ResearchService.instance) {
      ResearchService.instance = new ResearchService();
    }
    return ResearchService.instance;
  }

  private async loadExistingUrls(): Promise<void> {
    const allResources = await db.select({ url: resources.url }).from(resources).where(eq(resources.status, 'approved'));
    this.existingUrls = new Set(allResources.map(r => normalizeUrl(r.url)));

    const discoveries = await db.select({ url: researchDiscoveries.url }).from(researchDiscoveries);
    for (const d of discoveries) {
      this.existingUrls.add(normalizeUrl(d.url));
    }
  }

  private async getCategoryTree(): Promise<any> {
    const cats = await db.select().from(categories);
    const subs = await db.select().from(subcategories);
    const subSubs = await db.select().from(subSubcategories);

    return cats.map(cat => ({
      name: cat.name,
      slug: cat.slug,
      subcategories: subs
        .filter(s => s.categoryId === cat.id)
        .map(sub => ({
          name: sub.name,
          slug: sub.slug,
          subSubcategories: subSubs
            .filter(ss => ss.subcategoryId === sub.id)
            .map(ss => ({ name: ss.name, slug: ss.slug }))
        }))
    }));
  }

  private async getExistingResourcesByCategory(category: string, limit: number = 20): Promise<any[]> {
    const result = await db.select({ title: resources.title, url: resources.url, description: resources.description })
      .from(resources)
      .where(eq(resources.category, category))
      .limit(limit);
    return result;
  }

  private async handleToolCall(
    toolName: string,
    toolInput: any,
    jobId: number
  ): Promise<string> {
    switch (toolName) {
      case "check_duplicate": {
        const normalized = normalizeUrl(toolInput.url);
        const isDuplicate = this.existingUrls.has(normalized);
        if (isDuplicate) {
          await db.update(researchJobs)
            .set({ duplicatesSkipped: sql`${researchJobs.duplicatesSkipped} + 1` })
            .where(eq(researchJobs.id, jobId));
        }
        return JSON.stringify({ isDuplicate, normalizedUrl: normalized });
      }

      case "save_discovery": {
        const normalized = normalizeUrl(toolInput.url);
        if (this.existingUrls.has(normalized)) {
          return JSON.stringify({ saved: false, reason: "URL already exists (duplicate detected)" });
        }

        const [discovery] = await db.insert(researchDiscoveries).values({
          jobId,
          title: toolInput.title,
          url: toolInput.url,
          description: toolInput.description || '',
          suggestedCategory: toolInput.suggested_category || '',
          suggestedSubcategory: toolInput.suggested_subcategory || '',
          confidence: toolInput.confidence || 50,
          reasoning: toolInput.reasoning || '',
          status: 'pending_review',
        }).returning();

        this.existingUrls.add(normalized);

        await db.update(researchJobs)
          .set({ totalDiscoveries: sql`${researchJobs.totalDiscoveries} + 1` })
          .where(eq(researchJobs.id, jobId));

        return JSON.stringify({ saved: true, discoveryId: discovery.id });
      }

      case "get_category_tree": {
        const tree = await this.getCategoryTree();
        return JSON.stringify(tree);
      }

      case "get_existing_resources": {
        const existing = await this.getExistingResourcesByCategory(
          toolInput.category,
          toolInput.limit || 20
        );
        return JSON.stringify({ count: existing.length, resources: existing });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  }

  async startResearchJob(options: {
    prompt: string;
    categoryFocus?: string;
    maxBudgetUsd?: string;
    maxTurns?: number;
    startedBy?: string;
  }): Promise<number> {
    const [job] = await db.insert(researchJobs).values({
      prompt: options.prompt,
      categoryFocus: options.categoryFocus || null,
      maxBudgetUsd: options.maxBudgetUsd || '1.00',
      maxTurns: options.maxTurns || 30,
      startedBy: options.startedBy || null,
      status: 'processing',
      startedAt: new Date(),
    }).returning();

    const abortController = new AbortController();
    this.activeJobs.set(job.id, { jobId: job.id, abortController });

    this.runResearchLoop(job.id, options.prompt, options.categoryFocus, options.maxTurns || 30, parseFloat(options.maxBudgetUsd || '1.00'))
      .catch(async (err) => {
        console.error(`Research job ${job.id} failed:`, err);
        await db.update(researchJobs).set({
          status: 'failed',
          errorMessage: err.message || String(err),
          completedAt: new Date(),
        }).where(eq(researchJobs.id, job.id));
      })
      .finally(() => {
        this.activeJobs.delete(job.id);
      });

    return job.id;
  }

  private async runResearchLoop(
    jobId: number,
    prompt: string,
    categoryFocus: string | undefined,
    maxTurns: number,
    maxBudgetUsd: number
  ): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const client = new Anthropic({ apiKey });

    await this.loadExistingUrls();

    const systemPrompt = `You are an expert resource researcher specializing in video streaming, video development, and multimedia technology. Your job is to discover NEW, high-quality resources (tools, libraries, platforms, tutorials, documentation) related to video streaming and development that are NOT already in our database.

IMPORTANT RULES:
1. ALWAYS use check_duplicate before saving any resource to avoid duplicates
2. Focus on finding resources that are actively maintained and high-quality
3. Search for various types: open-source libraries, commercial platforms, tutorials, documentation, developer tools, APIs
4. Provide accurate descriptions and proper categorization
5. Be thorough but efficient - aim for quality over quantity
6. When you find a promising domain or topic, explore related resources
7. Your confidence score should reflect how relevant and high-quality the resource is for video streaming/development

${categoryFocus ? `FOCUS AREA: Prioritize discovering resources related to "${categoryFocus}"` : 'Search across all video streaming and development categories.'}

Our database currently has ${this.existingUrls.size} resources. Start by getting the category tree to understand our taxonomy, then systematically search for new resources.`;

    let messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: prompt }
    ];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let turnsUsed = 0;
    const agentLog: Array<{ role: string; content: string; timestamp: string }> = [];

    const addLog = (role: string, content: string) => {
      agentLog.push({ role, content, timestamp: new Date().toISOString() });
    };

    addLog('system', `Research started. Budget: $${maxBudgetUsd}, Max turns: ${maxTurns}`);
    addLog('user', prompt);

    while (turnsUsed < maxTurns) {
      const activeJob = this.activeJobs.get(jobId);
      if (!activeJob || activeJob.abortController.signal.aborted) {
        addLog('system', 'Job cancelled by user');
        await db.update(researchJobs).set({
          status: 'cancelled',
          turnsUsed,
          totalInputTokens,
          totalOutputTokens,
          estimatedCostUsd: this.calculateCost(totalInputTokens, totalOutputTokens),
          agentLog,
          completedAt: new Date(),
        }).where(eq(researchJobs.id, jobId));
        return;
      }

      try {
        const response = await client.messages.create({
          model: RESEARCH_MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          tools: researchTools as any,
          messages,
        });

        turnsUsed++;
        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;

        const currentCost = parseFloat(this.calculateCost(totalInputTokens, totalOutputTokens));

        await db.update(researchJobs).set({
          turnsUsed,
          totalInputTokens,
          totalOutputTokens,
          estimatedCostUsd: currentCost.toFixed(4),
          agentLog,
        }).where(eq(researchJobs.id, jobId));

        if (currentCost >= maxBudgetUsd) {
          addLog('system', `Budget limit reached ($${currentCost.toFixed(4)} >= $${maxBudgetUsd})`);
          break;
        }

        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
        );
        const textBlocks = response.content.filter(
          (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
        );

        for (const tb of textBlocks) {
          addLog('assistant', tb.text);
        }

        if (response.stop_reason === 'end_turn' && toolUseBlocks.length === 0) {
          addLog('system', 'Agent completed research (end_turn)');
          break;
        }

        if (toolUseBlocks.length === 0) {
          addLog('system', 'No tool calls and stop reason: ' + response.stop_reason);
          break;
        }

        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

        for (const toolBlock of toolUseBlocks) {
          addLog('tool_call', `${toolBlock.name}(${JSON.stringify(toolBlock.input).substring(0, 200)})`);

          try {
            const result = await this.handleToolCall(toolBlock.name, toolBlock.input, jobId);
            addLog('tool_result', `${toolBlock.name} → ${result.substring(0, 200)}`);
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: result,
            });
          } catch (err: any) {
            const errorMsg = err.message || String(err);
            addLog('tool_error', `${toolBlock.name} failed: ${errorMsg}`);
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: JSON.stringify({ error: errorMsg }),
              is_error: true,
            });
          }
        }

        messages.push({ role: "user", content: toolResults });

      } catch (err: any) {
        addLog('error', `API error: ${err.message || String(err)}`);
        if (err.status === 429) {
          addLog('system', 'Rate limited, waiting 30s...');
          await new Promise(r => setTimeout(r, 30000));
          continue;
        }
        throw err;
      }
    }

    const finalCost = this.calculateCost(totalInputTokens, totalOutputTokens);
    addLog('system', `Research completed. Turns: ${turnsUsed}, Cost: $${finalCost}`);

    await db.update(researchJobs).set({
      status: 'completed',
      turnsUsed,
      totalInputTokens,
      totalOutputTokens,
      estimatedCostUsd: finalCost,
      agentLog,
      completedAt: new Date(),
    }).where(eq(researchJobs.id, jobId));
  }

  private calculateCost(inputTokens: number, outputTokens: number): string {
    const cost = (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN);
    return cost.toFixed(4);
  }

  async cancelJob(jobId: number): Promise<void> {
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      activeJob.abortController.abort();
    }
    await db.update(researchJobs).set({
      status: 'cancelled',
      completedAt: new Date(),
    }).where(eq(researchJobs.id, jobId));
    this.activeJobs.delete(jobId);
  }

  async getJob(jobId: number): Promise<ResearchJob | undefined> {
    const [job] = await db.select().from(researchJobs).where(eq(researchJobs.id, jobId));
    return job;
  }

  async listJobs(limit: number = 20): Promise<ResearchJob[]> {
    return db.select().from(researchJobs).orderBy(sql`${researchJobs.createdAt} DESC`).limit(limit);
  }

  async getDiscoveries(jobId: number): Promise<ResearchDiscovery[]> {
    return db.select().from(researchDiscoveries).where(eq(researchDiscoveries.jobId, jobId)).orderBy(sql`${researchDiscoveries.createdAt} DESC`);
  }

  async getAllPendingDiscoveries(): Promise<ResearchDiscovery[]> {
    return db.select().from(researchDiscoveries).where(eq(researchDiscoveries.status, 'pending_review')).orderBy(sql`${researchDiscoveries.createdAt} DESC`);
  }

  async approveDiscovery(discoveryId: number): Promise<ResearchDiscovery> {
    const [discovery] = await db.select().from(researchDiscoveries).where(eq(researchDiscoveries.id, discoveryId));
    if (!discovery) throw new Error("Discovery not found");

    const [newResource] = await db.insert(resources).values({
      title: discovery.title,
      url: discovery.url,
      description: discovery.description || '',
      category: discovery.suggestedCategory || 'Uncategorized',
      subcategory: discovery.suggestedSubcategory || null,
      status: 'approved',
      metadata: { source: 'ai_researcher', discoveryId: discovery.id, confidence: discovery.confidence },
    }).returning();

    const [updated] = await db.update(researchDiscoveries).set({
      status: 'approved',
      approvedAt: new Date(),
      createdResourceId: newResource.id,
    }).where(eq(researchDiscoveries.id, discoveryId)).returning();

    if (discovery.jobId) {
      await db.update(researchJobs)
        .set({ approvedDiscoveries: sql`${researchJobs.approvedDiscoveries} + 1` })
        .where(eq(researchJobs.id, discovery.jobId));
    }

    return updated;
  }

  async rejectDiscovery(discoveryId: number, reason?: string): Promise<ResearchDiscovery> {
    const [updated] = await db.update(researchDiscoveries).set({
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: reason || null,
    }).where(eq(researchDiscoveries.id, discoveryId)).returning();

    if (updated.jobId) {
      await db.update(researchJobs)
        .set({ rejectedDiscoveries: sql`${researchJobs.rejectedDiscoveries} + 1` })
        .where(eq(researchJobs.id, updated.jobId));
    }

    return updated;
  }

  isJobActive(jobId: number): boolean {
    return this.activeJobs.has(jobId);
  }
}

export const researchService = ResearchService.getInstance();
