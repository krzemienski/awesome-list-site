import Anthropic from '@anthropic-ai/sdk';
import { createAnthropicClient, isAnthropicConfigured } from './anthropicClient';
import { storage } from '../storage';
import { db } from '../db';
import { resources, categories, subcategories, subSubcategories, researchJobs, researchDiscoveries } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import type { ResearchJob, ResearchDiscovery } from '@shared/schema';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { ensureSubSubcategoryExists } from '../repositories/ensureSubSubcategory';

const RESEARCH_MODEL = "claude-sonnet-4-5";

// Sonnet 4.5 pricing per million tokens
const COST_PER_INPUT_TOKEN = 3.0 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 15.0 / 1_000_000;
const COST_PER_CACHE_WRITE = 3.75 / 1_000_000;   // 1.25x base input (ephemeral 5-min cache)
const COST_PER_CACHE_READ = 0.30 / 1_000_000;    // 0.10x base input — the big lever
const COST_PER_WEB_SEARCH = 10.0 / 1000;

// Cap how much pre-computed context we inline. Caching makes this nearly free
// on repeat turns, but we still want a finite upper bound on the system prompt.
const MAX_TAXONOMY_LINES = 200;
const MAX_TOP_DOMAINS = 50;
const MAX_FOCUS_URLS = 80;

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

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

// Client-side tools. `get_category_tree` is intentionally removed — the full
// taxonomy is now baked into the cached system prompt so it doesn't replay as
// a 15k-char tool_result on every turn.
const researchTools: ResearchToolDefinition[] = [
  {
    name: "check_duplicate",
    description: "Check if a URL already exists in the database of known resources. Returns isDuplicate=true if already present. ALWAYS call this before save_discovery.",
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
    description: "Persist a verified, NON-DUPLICATE resource for admin review. Only call after check_duplicate returns false AND you've actually seen the resource via web_search (no fabricated URLs).",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the resource" },
        url: { type: "string", description: "URL of the resource" },
        description: { type: "string", description: "Brief description of what this resource offers for video streaming/development" },
        suggested_category: { type: "string", description: "Best matching category name from the taxonomy in the system prompt" },
        suggested_subcategory: { type: "string", description: "Best matching subcategory, or empty string if none fits" },
        suggested_sub_subcategory: { type: "string", description: "Best matching sub-subcategory (level-3), or empty string if none fits" },
        confidence: { type: "integer", description: "Confidence score 1-100. Only save if >= 70." },
        reasoning: { type: "string", description: "Why this is valuable AND why it's not redundant with the existing resources you've seen" }
      },
      required: ["title", "url", "description", "suggested_category", "confidence", "reasoning"]
    }
  },
  {
    name: "get_coverage_gaps",
    description: "Return the most under-represented subcategories (resource_count ASC) with sample existing URLs so you can target real gaps and avoid proposing duplicates. Call this once near the start of a job to refine your search targets.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "How many gap subcategories to return (default 15, max 30)" }
      },
      required: []
    }
  },
  {
    name: "get_existing_resources",
    description: "Sample existing resources in a specific category or subcategory so you can avoid proposing duplicates. Use this when you're about to search a topic and want to know what's already covered.",
    input_schema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Category or subcategory name to list resources from (case-insensitive substring match)" },
        limit: { type: "integer", description: "Max resources to return (default 30, max 100)" }
      },
      required: ["category"]
    }
  }
];

interface ActiveJob {
  jobId: number;
  abortController: AbortController;
}

interface ResearchContext {
  existingUrls: Set<string>;
  taxonomyBlock: string;
  domainsBlock: string;
  focusUrlsBlock: string;
  totalResources: number;
  totalDomains: number;
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

  /**
   * Build the cacheable research context block injected into the system prompt.
   * This replaces the old `get_category_tree` tool call entirely — the taxonomy
   * lives in the cached system message so it costs ~10% of base on repeat turns
   * instead of replaying as a 15k-char tool_result every turn.
   */
  private async buildResearchContext(categoryFocus: string | undefined): Promise<ResearchContext> {
    // 1. Existing URL set (for the in-memory check_duplicate tool)
    const [approvedRes, pendingDisc] = await Promise.all([
      db.select({ url: resources.url, category: resources.category }).from(resources).where(eq(resources.status, 'approved')),
      db.select({ url: researchDiscoveries.url }).from(researchDiscoveries),
    ]);
    const existingUrls = new Set<string>();
    for (const r of approvedRes) existingUrls.add(normalizeUrl(r.url));
    for (const d of pendingDisc) existingUrls.add(normalizeUrl(d.url));

    // 2. Taxonomy with per-leaf counts, sorted gap-first.
    //    Built in JS from two queries so resources stored at subcategory level
    //    (no sub_subcategory) are counted correctly even when the subcategory
    //    has child sub_subcategories. Single SQL with LEFT JOIN to ssc would
    //    drop those bare-subcategory rows.
    const [taxRows, countRows] = await Promise.all([
      db.execute<{ category: string; subcategory: string | null; sub_subcategory: string | null }>(sql`
        SELECT c.name AS category, sc.name AS subcategory, ssc.name AS sub_subcategory
          FROM categories c
          LEFT JOIN subcategories sc ON sc.category_id = c.id
          LEFT JOIN sub_subcategories ssc ON ssc.subcategory_id = sc.id
         ORDER BY c.name, sc.name NULLS FIRST, ssc.name NULLS FIRST
      `),
      db.execute<{ category: string; subcategory: string | null; sub_subcategory: string | null; n: number }>(sql`
        SELECT category,
               subcategory,
               sub_subcategory,
               COUNT(*)::int AS n
          FROM resources
         WHERE status = 'approved'
         GROUP BY category, subcategory, sub_subcategory
      `),
    ]);
    const key = (c?: string | null, s?: string | null, ss?: string | null) =>
      `${(c || '').toLowerCase()}||${(s || '').toLowerCase()}||${(ss || '').toLowerCase()}`;
    const countMap = new Map<string, number>();
    for (const r of countRows.rows) {
      countMap.set(key(r.category, r.subcategory, r.sub_subcategory), r.n);
    }
    // Emit a row for every official taxonomy leaf PLUS a synthetic "bare subcat"
    // row (ssc=null) so resources at subcategory level are surfaced too.
    const seen = new Set<string>();
    const taxonomyEntries: Array<{ path: string; n: number }> = [];
    const push = (cat: string, sub: string | null, ssc: string | null) => {
      const k = key(cat, sub, ssc);
      if (seen.has(k)) return;
      seen.add(k);
      const n = countMap.get(k) || 0;
      const path = [cat, sub, ssc].filter(Boolean).join(' › ');
      taxonomyEntries.push({ path, n });
    };
    for (const r of taxRows.rows) {
      if (r.subcategory) push(r.category, r.subcategory, null); // bare-subcat synthetic row
      push(r.category, r.subcategory, r.sub_subcategory);
    }
    taxonomyEntries.sort((a, b) => a.n - b.n || a.path.localeCompare(b.path));
    const taxonomyLines = taxonomyEntries
      .slice(0, MAX_TAXONOMY_LINES)
      .map(e => `  ${String(e.n).padStart(3)}  ${e.path}`);
    const taxonomyBlock = `TAXONOMY (resource_count  path) — sorted GAP-FIRST. Prioritize the top of this list:\n${taxonomyLines.join('\n')}`;

    // 3. Top saturated domains (soft blocklist)
    const domainCounts = new Map<string, number>();
    for (const r of approvedRes) {
      const d = domainOf(r.url);
      if (d) domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
    }
    const topDomains = [...domainCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TOP_DOMAINS);
    const domainsBlock =
      `SATURATED DOMAINS (already heavily covered — DO NOT propose anything from these unless the specific resource is exceptional and clearly unique):\n` +
      topDomains.map(([d, n]) => `  ${String(n).padStart(4)}  ${d}`).join('\n');

    // 4. If focused, dump existing URLs in that focus so the agent can read
    //    BEFORE searching and refuse to propose what's already covered.
    let focusUrlsBlock = '';
    if (categoryFocus) {
      const focusResources = approvedRes.filter(r =>
        r.category.toLowerCase().includes(categoryFocus.toLowerCase())
      );
      const sample = focusResources.slice(0, MAX_FOCUS_URLS).map(r => `  ${r.url}`).join('\n');
      focusUrlsBlock =
        `\nEXISTING URLS IN FOCUS "${categoryFocus}" (${focusResources.length} total, showing ${Math.min(MAX_FOCUS_URLS, focusResources.length)}):\n${sample}`;
    }

    return {
      existingUrls,
      taxonomyBlock,
      domainsBlock,
      focusUrlsBlock,
      totalResources: existingUrls.size,
      totalDomains: domainCounts.size,
    };
  }

  /** Tool: gap-finder. Returns the N most under-represented subcategories with sample URLs. */
  private async getCoverageGaps(limit: number): Promise<any> {
    const lim = Math.max(1, Math.min(30, limit || 15));
    const gapRows = await db.execute<{
      category: string; subcategory: string; n: number; sample_urls: string[];
    }>(sql`
      SELECT c.name AS category,
             sc.name AS subcategory,
             COUNT(r.id)::int AS n,
             COALESCE(ARRAY_AGG(r.url) FILTER (WHERE r.url IS NOT NULL), ARRAY[]::text[]) AS sample_urls
        FROM categories c
        JOIN subcategories sc ON sc.category_id = c.id
        LEFT JOIN resources r ON r.status = 'approved'
                              AND LOWER(r.category) = LOWER(c.name)
                              AND LOWER(COALESCE(r.subcategory, '')) = LOWER(sc.name)
       GROUP BY c.name, sc.name
       ORDER BY n ASC, c.name, sc.name
       LIMIT ${lim}
    `);
    return gapRows.rows.map(row => ({
      category: row.category,
      subcategory: row.subcategory,
      resource_count: row.n,
      sample_existing_urls: (row.sample_urls || []).slice(0, 5),
    }));
  }

  private async getExistingResourcesByCategory(category: string, limit: number = 30): Promise<any[]> {
    const lim = Math.max(1, Math.min(100, limit || 30));
    const result = await db.select({ title: resources.title, url: resources.url, description: resources.description })
      .from(resources)
      .where(sql`(LOWER(${resources.category}) LIKE LOWER(${'%' + category + '%'})
              OR LOWER(COALESCE(${resources.subcategory},'')) LIKE LOWER(${'%' + category + '%'}))
             AND ${resources.status} = 'approved'`)
      .limit(lim);
    return result;
  }

  private async handleToolCall(toolName: string, toolInput: any, jobId: number): Promise<string> {
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
          return JSON.stringify({ saved: false, reason: "URL already exists (duplicate detected — you should have caught this with check_duplicate)" });
        }
        const conf = toolInput.confidence || 0;
        if (conf < 70) {
          return JSON.stringify({ saved: false, reason: `Confidence ${conf} < 70 threshold. Either find a higher-quality resource or raise confidence with justification.` });
        }

        const [discovery] = await db.insert(researchDiscoveries).values({
          jobId,
          title: toolInput.title,
          url: toolInput.url,
          description: toolInput.description || '',
          suggestedCategory: toolInput.suggested_category || '',
          suggestedSubcategory: toolInput.suggested_subcategory || '',
          suggestedSubSubcategory: toolInput.suggested_sub_subcategory || '',
          confidence: conf,
          reasoning: toolInput.reasoning || '',
          status: 'pending_review',
        }).returning();

        this.existingUrls.add(normalized);

        await db.update(researchJobs)
          .set({ totalDiscoveries: sql`${researchJobs.totalDiscoveries} + 1` })
          .where(eq(researchJobs.id, jobId));

        return JSON.stringify({ saved: true, discoveryId: discovery.id });
      }

      case "get_coverage_gaps": {
        const gaps = await this.getCoverageGaps(toolInput.limit || 15);
        return JSON.stringify({ gaps });
      }

      case "get_existing_resources": {
        const existing = await this.getExistingResourcesByCategory(
          toolInput.category,
          toolInput.limit || 30
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
    const client = createAnthropicClient();
    if (!client || !isAnthropicConfigured()) {
      throw new Error("Anthropic is not configured. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN (with ANTHROPIC_BASE_URL for a gateway) and restart.");
    }

    // Build the gap-aware, cacheable research context ONCE up front.
    const ctx = await this.buildResearchContext(categoryFocus);
    this.existingUrls = ctx.existingUrls;

    // The system prompt is split into TWO blocks: a tiny dynamic intro + a
    // large cacheable context block. Only the cacheable block gets a
    // cache_control breakpoint, so every turn after the first reads it back
    // at ~10% of base input cost.
    const dynamicIntro =
`You are an expert resource researcher for an "awesome video" curated list (1900+ resources on video streaming, video development, codecs, players, infrastructure, tools).

YOUR ONE JOB: discover resources that are NOT already in our database and that fill REAL GAPS in our taxonomy.

${categoryFocus ? `FOCUS AREA THIS RUN: "${categoryFocus}".` : 'No focus area — pick the deepest gap from the taxonomy below.'}`;

    const cacheableContext =
`==== STATIC RESEARCH CONTEXT (cached) ====

${ctx.taxonomyBlock}

${ctx.domainsBlock}
${ctx.focusUrlsBlock}

==== WORKFLOW ====

1. If you haven't already, call get_coverage_gaps to confirm the top 3-5 gaps.
2. Pick ONE specific gap (a subcategory with low count). Plan a web_search that targets THAT gap. Examples of good queries:
   • "open source AV1 encoder benchmark 2025"   (gap: Benchmarking & Performance Tools for Codecs, n=1)
   • "WebRTC player smart TV embedded"            (gap: Embedded Players, n=1)
   • "peer-to-peer HLS streaming library"         (gap: Peer-to-Peer Streaming Solutions, n=1)
3. AVOID queries that will return obvious already-covered hits (mediasoup, hls.js, ffmpeg, Bitmovin, etc — see SATURATED DOMAINS).
4. For each candidate from web_search results, call check_duplicate(url) BEFORE saving.
5. If new AND confidence ≥ 70, call save_discovery with full metadata.
6. Pivot: if a search yields only duplicates, do NOT re-search the same term — pick a different gap from get_coverage_gaps.

==== HARD RULES ====

R1. NEVER fabricate URLs. Only save URLs that appeared in a real web_search result this run.
R2. ALWAYS check_duplicate BEFORE save_discovery.
R3. Skip anything from the SATURATED DOMAINS list unless the specific resource is exceptional.
R4. Skip generic "what is WebRTC" intro articles, marketing blog posts from streaming vendors, and SEO listicles. Prefer: actively maintained open-source projects, official docs from niche vendors, conference talks (Demuxed, IBC, NAB), academic papers (ACM/IEEE/arXiv), small specialized tools, individual developer blogs with real technical depth.
R5. Confidence < 70 → don't save. Quality > quantity.
R6. STOP early if you've saved 5+ high-quality discoveries OR if you've hit two consecutive search rounds with only duplicates.

Database state: ${ctx.totalResources} approved resources across ${ctx.totalDomains} distinct domains.`;

    // Anthropic system prompt as structured blocks so we can attach a cache
    // breakpoint to the large static block only.
    const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
      { type: 'text', text: dynamicIntro },
      { type: 'text', text: cacheableContext, cache_control: { type: 'ephemeral' } },
    ];

    let messages: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: prompt }
    ];

    let totalInputTokens = 0;       // non-cached input
    let totalOutputTokens = 0;
    let totalCacheCreate = 0;
    let totalCacheRead = 0;
    let webSearchCount = 0;
    let turnsUsed = 0;
    let consecutiveZeroDiscoveryTurns = 0;
    let lastDiscoveryCount = 0;
    const agentLog: Array<{ role: string; content: string; timestamp: string }> = [];

    const persist = async (extra: Record<string, any> = {}) => {
      try {
        await db.update(researchJobs).set({
          turnsUsed,
          totalInputTokens,
          totalOutputTokens,
          estimatedCostUsd: this.calculateCost(totalInputTokens, totalOutputTokens, webSearchCount, totalCacheCreate, totalCacheRead),
          agentLog,
          ...extra,
        }).where(eq(researchJobs.id, jobId));
      } catch (e: any) {
        console.error(`[research:${jobId}] persist failed:`, e.message);
      }
    };

    const addLog = async (role: string, content: string, persistNow = false) => {
      const stored = content.length > 8000 ? content.slice(0, 8000) + `\n…[truncated, full ${content.length} chars in workflow logs]` : content;
      const entry = { role, content: stored, timestamp: new Date().toISOString() };
      agentLog.push(entry);
      console.log(`[research:${jobId}] [${role}] ${content}`);
      if (persistNow) await persist();
    };

    await addLog('system', `Research started. Model: ${RESEARCH_MODEL}, Budget: $${maxBudgetUsd}, Max turns: ${maxTurns}, Existing URLs: ${ctx.existingUrls.size}, Distinct domains: ${ctx.totalDomains}`, true);
    if (categoryFocus) await addLog('system', `Focus: ${categoryFocus} (${ctx.focusUrlsBlock ? 'existing URLs inlined into cached context' : 'no existing URLs in focus'})`);
    await addLog('system', `System prompt: dynamic_intro=${dynamicIntro.length} chars + cached_context=${cacheableContext.length} chars (taxonomy=${ctx.taxonomyBlock.length}, domains=${ctx.domainsBlock.length}, focus_urls=${ctx.focusUrlsBlock.length})`);
    await addLog('user', prompt);

    // Cache the tools array too (breakpoint on the last tool).
    const toolsForClaude: any[] = [
      { type: "web_search_20250305", name: "web_search", max_uses: Math.min(maxTurns, 12) },
      ...researchTools.slice(0, -1),
      { ...researchTools[researchTools.length - 1], cache_control: { type: 'ephemeral' } },
    ];

    const HARD_STOP_DISCOVERIES = 5;

    while (turnsUsed < maxTurns) {
      const activeJob = this.activeJobs.get(jobId);
      if (!activeJob || activeJob.abortController.signal.aborted) {
        await addLog('system', 'Job cancelled by user');
        await persist({ status: 'cancelled', completedAt: new Date() });
        return;
      }

      // Budget gate at the TOP of the loop (not after the API response) so we
      // never abort a turn that has already produced save_discovery tool_use
      // blocks — those would be lost without execution.
      const preTurnCost = parseFloat(this.calculateCost(totalInputTokens, totalOutputTokens, webSearchCount, totalCacheCreate, totalCacheRead));
      if (preTurnCost >= maxBudgetUsd) {
        await addLog('system', `Budget limit reached before turn ${turnsUsed + 1} ($${preTurnCost.toFixed(4)} >= $${maxBudgetUsd})`, true);
        break;
      }
      if (lastDiscoveryCount >= HARD_STOP_DISCOVERIES) {
        await addLog('system', `Hard stop: reached ${lastDiscoveryCount} discoveries (threshold ${HARD_STOP_DISCOVERIES}). Ending run to preserve quality and budget.`, true);
        break;
      }

      const turnNumber = turnsUsed + 1;
      await addLog(
        'system',
        `→ Turn ${turnNumber}/${maxTurns} — request (messages: ${messages.length}, tools: ${toolsForClaude.length}, max_tokens: 1500, cache: enabled)`,
        true,
      );
      const turnStartedAt = Date.now();

      let response: Anthropic.Messages.Message;
      try {
        response = await client.messages.create({
          model: RESEARCH_MODEL,
          max_tokens: 1500,
          system: systemBlocks,
          tools: toolsForClaude,
          messages,
        });
      } catch (err: any) {
        const detail =
          err?.error?.error?.message || err?.error?.message || err?.message || String(err);
        const status = err?.status ? ` (HTTP ${err.status})` : '';
        const errorLine = `Anthropic API error${status}: ${detail}`;
        await addLog('error', errorLine, true);

        if (err?.status === 429) {
          await addLog('system', 'Rate limited, waiting 30s…', true);
          await new Promise(r => setTimeout(r, 30000));
          continue;
        }
        if (err?.status === 400 && /web_search/i.test(detail)) {
          await addLog('error',
            'Your Anthropic account does not have web_search enabled. Enable it at https://console.anthropic.com/settings/usage.',
            true);
        }
        throw new Error(errorLine);
      }

      turnsUsed++;
      const turnDurationMs = Date.now() - turnStartedAt;
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
      totalCacheCreate += response.usage.cache_creation_input_tokens || 0;
      totalCacheRead += response.usage.cache_read_input_tokens || 0;
      const turnWebSearches = response.content.filter(
        (b: any) => b.type === 'server_tool_use' && b.name === 'web_search'
      ).length;
      webSearchCount += turnWebSearches;

      const currentCost = parseFloat(this.calculateCost(totalInputTokens, totalOutputTokens, webSearchCount, totalCacheCreate, totalCacheRead));

      const blockTypeCounts: Record<string, number> = {};
      for (const b of response.content as any[]) {
        blockTypeCounts[b.type] = (blockTypeCounts[b.type] || 0) + 1;
      }
      await addLog(
        'system',
        `← Turn ${turnNumber} in ${turnDurationMs}ms — stop: ${response.stop_reason}, ` +
        `tokens: in=${response.usage.input_tokens} out=${response.usage.output_tokens}` +
        (response.usage.cache_creation_input_tokens ? ` cache_write=${response.usage.cache_creation_input_tokens}` : '') +
        (response.usage.cache_read_input_tokens ? ` cache_read=${response.usage.cache_read_input_tokens}` : '') +
        ` | blocks: ${JSON.stringify(blockTypeCounts)} | cost: $${currentCost.toFixed(4)}`,
      );
      await persist();

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
      );

      for (const block of response.content as any[]) {
        switch (block.type) {
          case 'text':
            if (block.text?.trim()) await addLog('assistant', block.text);
            break;
          case 'thinking':
            if (block.thinking?.trim()) await addLog('thinking', block.thinking);
            break;
          case 'server_tool_use':
            if (block.name === 'web_search') {
              await addLog('web_search', `query: ${JSON.stringify(block.input)}`);
            } else {
              await addLog('server_tool_use', `${block.name}(${JSON.stringify(block.input)})`);
            }
            break;
          case 'web_search_tool_result': {
            const items = Array.isArray(block.content) ? block.content : [];
            if (items.length === 0 && block.content?.type === 'web_search_tool_result_error') {
              await addLog('tool_error', `web_search error: ${block.content.error_code || JSON.stringify(block.content)}`);
            } else {
              const lines = items.map((it: any, i: number) => {
                const url = it.url || '';
                const title = it.title || '(no title)';
                const page = it.page_age ? ` [page_age=${it.page_age}]` : '';
                return `  ${i + 1}. ${title}\n     ${url}${page}`;
              }).join('\n');
              await addLog('web_search_result', `${items.length} result(s):\n${lines}`);
            }
            break;
          }
          case 'tool_use':
            break;
          default:
            await addLog('system', `Unrecognized content block type: ${block.type}`);
        }
      }

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

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      let turnDiscoveries = 0;
      for (const toolBlock of toolUseBlocks) {
        await addLog('tool_call', `${toolBlock.name}(${JSON.stringify(toolBlock.input)})`);
        const toolStarted = Date.now();
        try {
          const result = await this.handleToolCall(toolBlock.name, toolBlock.input, jobId);
          await addLog('tool_result', `${toolBlock.name} (${Date.now() - toolStarted}ms) → ${result}`);
          if (toolBlock.name === 'save_discovery' && JSON.parse(result).saved) turnDiscoveries++;
          toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: result });
        } catch (err: any) {
          const errorMsg = err.message || String(err);
          await addLog('tool_error', `${toolBlock.name} failed after ${Date.now() - toolStarted}ms: ${errorMsg}`, true);
          toolResults.push({
            type: "tool_result", tool_use_id: toolBlock.id,
            content: JSON.stringify({ error: errorMsg }), is_error: true,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });

      // Early-stop heuristic: 2 consecutive turns with web_search but 0 new
      // discoveries → agent is stuck in a duplicate loop, bail.
      const [jobRow] = await db.select({ totalDiscoveries: researchJobs.totalDiscoveries })
        .from(researchJobs).where(eq(researchJobs.id, jobId));
      const newSinceLast = (jobRow?.totalDiscoveries || 0) - lastDiscoveryCount;
      lastDiscoveryCount = jobRow?.totalDiscoveries || 0;
      if (turnWebSearches > 0 && newSinceLast === 0) {
        consecutiveZeroDiscoveryTurns++;
        if (consecutiveZeroDiscoveryTurns >= 2) {
          await addLog('system', `Early stop: ${consecutiveZeroDiscoveryTurns} consecutive search turns with 0 new discoveries — agent is hitting duplicates only.`, true);
          break;
        }
      } else if (newSinceLast > 0) {
        consecutiveZeroDiscoveryTurns = 0;
      }
    }

    const finalCost = this.calculateCost(totalInputTokens, totalOutputTokens, webSearchCount, totalCacheCreate, totalCacheRead);
    const [finalJob] = await db.select({
      totalDiscoveries: researchJobs.totalDiscoveries,
      duplicatesSkipped: researchJobs.duplicatesSkipped,
    }).from(researchJobs).where(eq(researchJobs.id, jobId));

    const cacheHitRate = (totalCacheRead + totalInputTokens) > 0
      ? (totalCacheRead / (totalCacheRead + totalInputTokens) * 100).toFixed(1)
      : '0.0';
    await addLog(
      'system',
      `Research completed. Turns: ${turnsUsed}/${maxTurns}, ` +
      `Web searches: ${webSearchCount}, ` +
      `Discoveries saved: ${finalJob?.totalDiscoveries || 0}, ` +
      `Duplicates skipped: ${finalJob?.duplicatesSkipped || 0}, ` +
      `Tokens: in=${totalInputTokens} out=${totalOutputTokens} cache_write=${totalCacheCreate} cache_read=${totalCacheRead} (cache hit rate ${cacheHitRate}%), ` +
      `Cost: $${finalCost}`,
    );

    await persist({ status: 'completed', completedAt: new Date() });
  }

  private calculateCost(
    inputTokens: number,
    outputTokens: number,
    webSearchCount: number = 0,
    cacheCreateTokens: number = 0,
    cacheReadTokens: number = 0,
  ): string {
    const cost =
      (inputTokens * COST_PER_INPUT_TOKEN) +
      (outputTokens * COST_PER_OUTPUT_TOKEN) +
      (cacheCreateTokens * COST_PER_CACHE_WRITE) +
      (cacheReadTokens * COST_PER_CACHE_READ) +
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
