import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import { db } from '../db';
import { resources, categories, subcategories, subSubcategories, researchJobs, researchDiscoveries } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import type { ResearchJob, ResearchDiscovery } from '@shared/schema';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { ensureSubSubcategoryExists } from '../repositories/ensureSubSubcategory';

const RESEARCH_MODEL = "claude-sonnet-4-5";

const COST_PER_INPUT_TOKEN = 3.0 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15.0 / 1_000_000;
const COST_PER_WEB_SEARCH = 10.0 / 1000;

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
        suggested_sub_subcategory: { type: "string", description: "Best matching sub-subcategory (level-3), or empty string if none fits. Use get_category_tree to see available sub-subcategories." },
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
      .where(sql`LOWER(${resources.category}) LIKE LOWER(${'%' + category + '%'})`)
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
          suggestedSubSubcategory: toolInput.suggested_sub_subcategory || '',
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
        const msg = err?.message || String(err);
        console.error(`[research:${job.id}] FAILED:`, msg);
        if (err?.stack) console.error(err.stack);
        try {
          // Append a final 'error' log entry so the UI shows what happened
          // even when the failure happened before the loop persisted anything.
          const [cur] = await db.select({ agentLog: researchJobs.agentLog })
            .from(researchJobs).where(eq(researchJobs.id, job.id));
          const existing = Array.isArray(cur?.agentLog) ? cur!.agentLog as any[] : [];
          existing.push({
            role: 'error',
            content: `Job failed: ${msg}`,
            timestamp: new Date().toISOString(),
          });
          await db.update(researchJobs).set({
            status: 'failed',
            errorMessage: msg,
            agentLog: existing,
            completedAt: new Date(),
          }).where(eq(researchJobs.id, job.id));
        } catch (persistErr: any) {
          console.error(`[research:${job.id}] failed to persist failure:`, persistErr?.message);
        }
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
    // Prefer the direct ANTHROPIC_API_KEY so the native server-side `web_search`
    // tool (only available on the canonical Anthropic API endpoint) works. The
    // gateway URL set by the Replit AI integration does not currently support
    // the web_search server tool.
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "No Anthropic API key configured (ANTHROPIC_API_KEY or AI_INTEGRATIONS_ANTHROPIC_API_KEY). " +
        "Set ANTHROPIC_API_KEY in Secrets, then restart the workflow."
      );
    }

    const client = new Anthropic({ apiKey });

    await this.loadExistingUrls();

    const systemPrompt = `You are an expert resource researcher specializing in video streaming, video development, and multimedia technology. Your job is to discover NEW, high-quality resources (tools, libraries, platforms, tutorials, documentation) related to video streaming and development that are NOT already in our database.

YOUR TOOLS:
- web_search: Use the live web to find new resources. ALWAYS start here — do not rely on memory.
- get_category_tree: Inspect the site taxonomy so you can categorize correctly.
- get_existing_resources: Sample what's already in a category to identify gaps.
- check_duplicate: Required before every save_discovery. Skips URLs already in the DB.
- save_discovery: Persist a verified, non-duplicate resource for admin review.

WORKFLOW (every turn):
1. Plan or refine a web_search query targeted at the focus area.
2. Read the top results. For each candidate, call check_duplicate with the URL.
3. If new and high quality, call save_discovery with accurate metadata (title, url, description, suggested_category, suggested_subcategory, suggested_sub_subcategory, confidence 1-100, reasoning).
4. Repeat with refined queries until you've exhausted promising leads or hit the budget.

IMPORTANT RULES:
1. NEVER fabricate URLs. Only save what you actually verified via web_search.
2. ALWAYS check_duplicate before save_discovery.
3. Prefer actively maintained, high-quality resources (recent commits, real docs, working sites).
4. Variety matters: libraries, platforms, tutorials, docs, dev tools, APIs.
5. Confidence reflects quality + relevance, not your enthusiasm.

${categoryFocus ? `FOCUS AREA: Prioritize discovering resources related to "${categoryFocus}".` : 'Search across all video streaming and development categories.'}

Our database currently has ${this.existingUrls.size} resources. Begin by calling get_category_tree, then run your first web_search.`;

    let messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: prompt }
    ];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let webSearchCount = 0;
    let turnsUsed = 0;
    const agentLog: Array<{ role: string; content: string; timestamp: string }> = [];

    // Persist after every meaningful event so the UI can stream progress
    // and so a hung turn still leaves a trail.
    const persist = async (extra: Record<string, any> = {}) => {
      try {
        await db.update(researchJobs).set({
          turnsUsed,
          totalInputTokens,
          totalOutputTokens,
          estimatedCostUsd: this.calculateCost(totalInputTokens, totalOutputTokens, webSearchCount),
          agentLog,
          ...extra,
        }).where(eq(researchJobs.id, jobId));
      } catch (e: any) {
        console.error(`[research:${jobId}] persist failed:`, e.message);
      }
    };

    const addLog = async (role: string, content: string, persistNow = false) => {
      const entry = { role, content, timestamp: new Date().toISOString() };
      agentLog.push(entry);
      // Mirror to server console so workflow logs aren't silent.
      const preview = content.length > 240 ? content.slice(0, 240) + '…' : content;
      console.log(`[research:${jobId}] [${role}] ${preview}`);
      if (persistNow) await persist();
    };

    await addLog('system', `Research started. Model: ${RESEARCH_MODEL}, Budget: $${maxBudgetUsd}, Max turns: ${maxTurns}`, true);
    await addLog('user', prompt);

    // Tool set sent to Claude. Includes Anthropic's native server-side web_search
    // (executed on Anthropic's side; results are returned inline in the assistant
    // response, no client-side handler needed).
    const toolsForClaude: any[] = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: Math.max(5, maxTurns),
      },
      ...researchTools,
    ];

    while (turnsUsed < maxTurns) {
      const activeJob = this.activeJobs.get(jobId);
      if (!activeJob || activeJob.abortController.signal.aborted) {
        await addLog('system', 'Job cancelled by user');
        await persist({ status: 'cancelled', completedAt: new Date() });
        return;
      }

      let response: Anthropic.Messages.Message;
      try {
        response = await client.messages.create({
          model: RESEARCH_MODEL,
          max_tokens: 4096,
          system: systemPrompt,
          tools: toolsForClaude,
          messages,
        });
      } catch (err: any) {
        // Anthropic SDK errors stash structured info in err.error?.error or err.message
        const detail =
          err?.error?.error?.message ||
          err?.error?.message ||
          err?.message ||
          String(err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        const errorLine = `Anthropic API error${status}: ${detail}`;
        await addLog('error', errorLine, true);

        if (err?.status === 429) {
          await addLog('system', 'Rate limited, waiting 30s…', true);
          await new Promise(r => setTimeout(r, 30000));
          continue;
        }
        // Web-search-not-enabled or other 400s: surface and abort cleanly
        // rather than retrying forever.
        if (err?.status === 400 && /web_search/i.test(detail)) {
          await addLog(
            'error',
            'Your Anthropic account does not have web_search enabled. ' +
            'Enable it in https://console.anthropic.com/settings/usage or remove the web_search tool from researchService.ts.',
            true,
          );
        }
        throw new Error(errorLine);
      }

      turnsUsed++;
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
      // Count Anthropic-billed web_search invocations for accurate cost tracking.
      const turnWebSearches = response.content.filter(
        (b: any) => b.type === 'server_tool_use' && b.name === 'web_search'
      ).length;
      webSearchCount += turnWebSearches;

      const currentCost = parseFloat(this.calculateCost(totalInputTokens, totalOutputTokens, webSearchCount));
      await persist();

      if (currentCost >= maxBudgetUsd) {
        await addLog('system', `Budget limit reached ($${currentCost.toFixed(4)} >= $${maxBudgetUsd})`, true);
        break;
      }

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
      );
      const textBlocks = response.content.filter(
        (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
      );

      for (const tb of textBlocks) {
        if (tb.text?.trim()) await addLog('assistant', tb.text);
      }
      if (turnWebSearches > 0) {
        // Surface what the agent actually searched for, including snippets.
        for (const block of response.content as any[]) {
          if (block.type === 'server_tool_use' && block.name === 'web_search') {
            await addLog('web_search', `query: ${JSON.stringify(block.input)}`);
          }
          if (block.type === 'web_search_tool_result') {
            const items = Array.isArray(block.content) ? block.content : [];
            const summary = items
              .slice(0, 5)
              .map((it: any) => `• ${it.title || it.url || '(no title)'} — ${it.url || ''}`)
              .join('\n');
            await addLog('web_search_result', `${items.length} result(s)\n${summary}`);
          }
        }
      }

      // Always terminate when there are no client-side tool calls to answer.
      // - end_turn: agent is done.
      // - any other stop_reason with 0 client tool_use blocks: nothing to
      //   feed back to Claude, so continuing would push an invalid history
      //   (assistant-last with no user follow-up). Web_search runs entirely
      //   server-side, so its results are already in this response.
      if (toolUseBlocks.length === 0) {
        await addLog(
          'system',
          response.stop_reason === 'end_turn'
            ? 'Agent completed research (end_turn)'
            : `No client tool calls; stop reason: ${response.stop_reason}`,
          true,
        );
        break;
      }

      // Preserve the raw assistant content (including any server_tool_use +
      // web_search_tool_result blocks) so Anthropic's required history
      // contract is satisfied on the next request.
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const toolBlock of toolUseBlocks) {
        await addLog('tool_call', `${toolBlock.name}(${JSON.stringify(toolBlock.input).substring(0, 240)})`);
        try {
          const result = await this.handleToolCall(toolBlock.name, toolBlock.input, jobId);
          await addLog('tool_result', `${toolBlock.name} → ${result.substring(0, 240)}`);
          toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: result });
        } catch (err: any) {
          const errorMsg = err.message || String(err);
          await addLog('tool_error', `${toolBlock.name} failed: ${errorMsg}`, true);
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: JSON.stringify({ error: errorMsg }),
            is_error: true,
          });
        }
      }

      // toolResults.length === toolUseBlocks.length by construction above,
      // and toolUseBlocks.length > 0 (we'd have broken out otherwise).
      messages.push({ role: "user", content: toolResults });
    }

    const finalCost = this.calculateCost(totalInputTokens, totalOutputTokens, webSearchCount);
    await addLog(
      'system',
      `Research completed. Turns: ${turnsUsed}, Web searches: ${webSearchCount}, Cost: $${finalCost}`,
    );

    await persist({ status: 'completed', completedAt: new Date() });
  }

  private calculateCost(inputTokens: number, outputTokens: number, webSearchCount: number = 0): string {
    const cost =
      (inputTokens * COST_PER_INPUT_TOKEN) +
      (outputTokens * COST_PER_OUTPUT_TOKEN) +
      (webSearchCount * COST_PER_WEB_SEARCH);
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

    // Hierarchy guard (mirrors admin POST/PUT /api/admin/resources): if the AI
    // suggested a level-3 hint, auto-create the matching sub_subcategories row
    // so this direct-DB insert path can't reintroduce the orphaned-tag drift
    // that tasks #55/#57 closed.
    await ensureSubSubcategoryExists(
      new CategoryRepository(),
      discovery.suggestedCategory,
      discovery.suggestedSubcategory,
      discovery.suggestedSubSubcategory,
    );

    const [newResource] = await db.insert(resources).values({
      title: discovery.title,
      url: discovery.url,
      description: discovery.description || '',
      category: discovery.suggestedCategory || 'Uncategorized',
      subcategory: discovery.suggestedSubcategory || null,
      subSubcategory: discovery.suggestedSubSubcategory || null,
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
