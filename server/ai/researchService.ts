import { db } from '../db';
import { resources, researchJobs, researchDiscoveries } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import type { ResearchJob, ResearchDiscovery } from '@shared/schema';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { ensureSubSubcategoryExists } from '../repositories/ensureSubSubcategory';
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { AgentEventEmitter } from './agentEvents';
import { runAgentQuery, type AgentDefinitionInput } from './runAgentQuery';
import { DEFAULT_RESEARCH_MODEL, DEFAULT_ENRICHMENT_MODEL, resolveModel, type AgentRunConfig } from './agentRuntime';

// Cap how much pre-computed context we inline into the orchestrator system prompt.
const MAX_TAXONOMY_LINES = 200;
const MAX_TOP_DOMAINS = 50;
const MAX_FOCUS_URLS = 80;

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

function preview(text: string, n = 600): string {
  const t = (text || '').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

interface ResearchContext {
  existingUrls: Set<string>;
  taxonomyBlock: string;
  domainsBlock: string;
  focusUrlsBlock: string;
  totalResources: number;
  totalDomains: number;
}

/**
 * Build the gap-aware research context inlined into the orchestrator system
 * prompt (taxonomy sorted gap-first, saturated domains, optional focus URLs)
 * plus the in-memory existing-URL Set used by the check_duplicate tool.
 */
async function buildResearchContext(categoryFocus: string | undefined): Promise<ResearchContext> {
  const [approvedRes, pendingDisc] = await Promise.all([
    db.select({ url: resources.url, category: resources.category }).from(resources).where(eq(resources.status, 'approved')),
    db.select({ url: researchDiscoveries.url }).from(researchDiscoveries),
  ]);
  const existingUrls = new Set<string>();
  for (const r of approvedRes) existingUrls.add(normalizeUrl(r.url));
  for (const d of pendingDisc) existingUrls.add(normalizeUrl(d.url));

  const [taxRows, countRows] = await Promise.all([
    db.execute<{ category: string; subcategory: string | null; sub_subcategory: string | null }>(sql`
      SELECT c.name AS category, sc.name AS subcategory, ssc.name AS sub_subcategory
        FROM categories c
        LEFT JOIN subcategories sc ON sc.category_id = c.id
        LEFT JOIN sub_subcategories ssc ON ssc.subcategory_id = sc.id
       ORDER BY c.name, sc.name NULLS FIRST, ssc.name NULLS FIRST
    `),
    db.execute<{ category: string; subcategory: string | null; sub_subcategory: string | null; n: number }>(sql`
      SELECT category, subcategory, sub_subcategory, COUNT(*)::int AS n
        FROM resources
       WHERE status = 'approved'
       GROUP BY category, subcategory, sub_subcategory
    `),
  ]);
  const key = (c?: string | null, s?: string | null, ss?: string | null) =>
    `${(c || '').toLowerCase()}||${(s || '').toLowerCase()}||${(ss || '').toLowerCase()}`;
  const countMap = new Map<string, number>();
  for (const r of countRows.rows) countMap.set(key(r.category, r.subcategory, r.sub_subcategory), r.n);

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
    if (r.subcategory) push(r.category, r.subcategory, null);
    push(r.category, r.subcategory, r.sub_subcategory);
  }
  taxonomyEntries.sort((a, b) => a.n - b.n || a.path.localeCompare(b.path));
  const taxonomyLines = taxonomyEntries
    .slice(0, MAX_TAXONOMY_LINES)
    .map(e => `  ${String(e.n).padStart(3)}  ${e.path}`);
  const taxonomyBlock = `TAXONOMY (resource_count  path) — sorted GAP-FIRST. Prioritize the top of this list:\n${taxonomyLines.join('\n')}`;

  const domainCounts = new Map<string, number>();
  for (const r of approvedRes) {
    const d = domainOf(r.url);
    if (d) domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
  }
  const topDomains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_TOP_DOMAINS);
  const domainsBlock =
    `SATURATED DOMAINS (already heavily covered — DO NOT propose anything from these unless the specific resource is exceptional and clearly unique):\n` +
    topDomains.map(([d, n]) => `  ${String(n).padStart(4)}  ${d}`).join('\n');

  let focusUrlsBlock = '';
  if (categoryFocus) {
    const focusResources = approvedRes.filter(r => r.category.toLowerCase().includes(categoryFocus.toLowerCase()));
    const sample = focusResources.slice(0, MAX_FOCUS_URLS).map(r => `  ${r.url}`).join('\n');
    focusUrlsBlock = `\nEXISTING URLS IN FOCUS "${categoryFocus}" (${focusResources.length} total, showing ${Math.min(MAX_FOCUS_URLS, focusResources.length)}):\n${sample}`;
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

/** Gap-finder: the N most under-represented subcategories with sample existing URLs. */
async function getCoverageGaps(limit: number): Promise<any[]> {
  const lim = Math.max(1, Math.min(30, limit || 15));
  const gapRows = await db.execute<{ category: string; subcategory: string; n: number; sample_urls: string[] }>(sql`
    SELECT c.name AS category, sc.name AS subcategory, COUNT(r.id)::int AS n,
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

async function getExistingResourcesByCategory(category: string, limit = 30): Promise<any[]> {
  const lim = Math.max(1, Math.min(100, limit || 30));
  return db.select({ title: resources.title, url: resources.url, description: resources.description })
    .from(resources)
    .where(sql`(LOWER(${resources.category}) LIKE LOWER(${'%' + category + '%'})
            OR LOWER(COALESCE(${resources.subcategory},'')) LIKE LOWER(${'%' + category + '%'}))
           AND ${resources.status} = 'approved'`)
    .limit(lim);
}

const STALL_PIVOT_NUDGE =
`STRATEGY PIVOT REQUIRED. Recent candidates were all duplicates. Do NOT repeat similar searches — change approach now:
1. Delegate a search for a DIFFERENT under-served gap (call get_coverage_gaps again and pick a subcategory not yet searched this run).
2. Tell the scout to MINE aggregators: a "Top 10…"/awesome-list is not savable itself, but the individual tools it names usually are — have the scout extract specific project names and search each directly.
3. Point the scout at source-rich venues: "site:github.com <topic>", Show HN, Demuxed/Mux/Streaming Media talks, arxiv.org / dl.acm.org with companion code.`;

interface ActiveJob {
  jobId: number;
  abortController: AbortController;
}

interface ResearchRunContext {
  jobId: number;
  emitter: AgentEventEmitter;
  existingUrls: Set<string>;
  discoveryCap: number;
  discoveriesSaved: number;
  consecutiveDuplicates: number;
  addLog: (role: string, content: string, persistNow?: boolean) => Promise<void>;
}

class ResearchService {
  private static instance: ResearchService;
  private activeJobs: Map<number, ActiveJob> = new Map();

  private constructor() {}

  static getInstance(): ResearchService {
    if (!ResearchService.instance) ResearchService.instance = new ResearchService();
    return ResearchService.instance;
  }

  /**
   * Per-run custom in-process MCP tools. Each tool closes over the run context
   * (existing-URL set, counters, emitter) so there is NO shared singleton state
   * across concurrent jobs. Tools emit their own tool_call/tool_result events.
   */
  private buildResearchTools(ctx: ResearchRunContext) {
    const emitCall = (name: string, input: any) =>
      ctx.emitter.emit({ actor: 'orchestrator', actorType: 'orchestrator', eventType: 'tool_call', targetActor: name, summary: preview(JSON.stringify(input)) });
    const emitResult = (name: string, out: string, ms: number) =>
      ctx.emitter.emit({ actor: name, actorType: 'tool', eventType: 'tool_result', targetActor: 'orchestrator', summary: preview(out), durationMs: ms });

    const checkDuplicate = tool(
      'check_duplicate',
      'Check if a URL already exists in the database of known resources. Returns isDuplicate=true if already present. ALWAYS call this before save_discovery.',
      { url: z.string().describe('The URL to check for duplicates') },
      async ({ url }) => {
        const started = Date.now();
        await emitCall('check_duplicate', { url });
        const normalized = normalizeUrl(url);
        const isDuplicate = ctx.existingUrls.has(normalized);
        if (isDuplicate) {
          ctx.consecutiveDuplicates++;
          await db.update(researchJobs)
            .set({ duplicatesSkipped: sql`${researchJobs.duplicatesSkipped} + 1` })
            .where(eq(researchJobs.id, ctx.jobId));
        } else {
          ctx.consecutiveDuplicates = 0;
        }
        let text = JSON.stringify({ isDuplicate, normalizedUrl: normalized });
        if (isDuplicate && ctx.consecutiveDuplicates > 0 && ctx.consecutiveDuplicates % 3 === 0) {
          text += `\n\n${STALL_PIVOT_NUDGE}`;
          await ctx.addLog('system', `Stall nudge injected (${ctx.consecutiveDuplicates} consecutive duplicates).`);
        }
        await ctx.addLog('tool_result', `check_duplicate(${url}) → isDuplicate=${isDuplicate}`);
        await emitResult('check_duplicate', text, Date.now() - started);
        return { content: [{ type: 'text', text }] };
      },
    );

    const saveDiscovery = tool(
      'save_discovery',
      "Persist a verified, NON-DUPLICATE resource for admin review. Only call after check_duplicate returns false AND the scout actually surfaced the resource via a real web search (no fabricated URLs).",
      {
        title: z.string(),
        url: z.string(),
        description: z.string(),
        suggested_category: z.string().describe('Best matching category name from the taxonomy in the system prompt'),
        suggested_subcategory: z.string().optional().describe('Best matching subcategory, or omit if none fits'),
        suggested_sub_subcategory: z.string().optional().describe('Best matching sub-subcategory (level-3), or omit if none fits'),
        confidence: z.number().describe('Confidence score 1-100. Only save if >= 70.'),
        reasoning: z.string().describe("Why this is valuable AND why it's not redundant with existing resources"),
      },
      async (input) => {
        const started = Date.now();
        await emitCall('save_discovery', { url: input.url, title: input.title, confidence: input.confidence });
        const normalized = normalizeUrl(input.url);
        let text: string;
        if (ctx.discoveriesSaved >= ctx.discoveryCap) {
          text = JSON.stringify({ saved: false, reason: `Discovery cap of ${ctx.discoveryCap} reached for this run. Wrap up and stop searching.` });
        } else if (ctx.existingUrls.has(normalized)) {
          text = JSON.stringify({ saved: false, reason: 'URL already exists (duplicate — you should have caught this with check_duplicate)' });
        } else if ((input.confidence || 0) < 70) {
          text = JSON.stringify({ saved: false, reason: `Confidence ${input.confidence} < 70 threshold. Find a higher-quality resource or justify a higher confidence.` });
        } else {
          const [discovery] = await db.insert(researchDiscoveries).values({
            jobId: ctx.jobId,
            title: input.title,
            url: input.url,
            description: input.description || '',
            suggestedCategory: input.suggested_category || '',
            suggestedSubcategory: input.suggested_subcategory || '',
            suggestedSubSubcategory: input.suggested_sub_subcategory || '',
            confidence: Math.round(input.confidence),
            reasoning: input.reasoning || '',
            status: 'pending_review',
          }).returning();
          ctx.existingUrls.add(normalized);
          ctx.discoveriesSaved++;
          ctx.consecutiveDuplicates = 0;
          await db.update(researchJobs)
            .set({ totalDiscoveries: sql`${researchJobs.totalDiscoveries} + 1` })
            .where(eq(researchJobs.id, ctx.jobId));
          text = JSON.stringify({ saved: true, discoveryId: discovery.id });
          await ctx.addLog('discovery', `Saved: ${input.title} — ${input.url} (confidence ${input.confidence})`, true);
        }
        await emitResult('save_discovery', text, Date.now() - started);
        return { content: [{ type: 'text', text }] };
      },
    );

    const coverageGaps = tool(
      'get_coverage_gaps',
      'Return the most under-represented subcategories (resource_count ASC) with sample existing URLs so you can target real gaps. Call this near the start and again when pivoting.',
      { limit: z.number().optional().describe('How many gap subcategories to return (default 15, max 30)') },
      async ({ limit }) => {
        const started = Date.now();
        await emitCall('get_coverage_gaps', { limit });
        const gaps = await getCoverageGaps(limit || 15);
        const text = JSON.stringify({ gaps });
        await emitResult('get_coverage_gaps', `${gaps.length} gaps`, Date.now() - started);
        return { content: [{ type: 'text', text }] };
      },
    );

    const existingResources = tool(
      'get_existing_resources',
      'Sample existing resources in a specific category/subcategory so you can avoid proposing duplicates before delegating a search.',
      {
        category: z.string().describe('Category or subcategory name (case-insensitive substring match)'),
        limit: z.number().optional().describe('Max resources to return (default 30, max 100)'),
      },
      async ({ category, limit }) => {
        const started = Date.now();
        await emitCall('get_existing_resources', { category, limit });
        const existing = await getExistingResourcesByCategory(category, limit || 30);
        const text = JSON.stringify({ count: existing.length, resources: existing });
        await emitResult('get_existing_resources', `${existing.length} resources`, Date.now() - started);
        return { content: [{ type: 'text', text }] };
      },
    );

    return [checkDuplicate, saveDiscovery, coverageGaps, existingResources];
  }

  async startResearchJob(options: {
    prompt: string;
    categoryFocus?: string;
    maxBudgetUsd?: string;
    maxTurns?: number;
    startedBy?: string;
    model?: string | null;
    baseUrl?: string | null;
    authTokenEncrypted?: string | null;
    authTokenLast4?: string | null;
  }): Promise<number> {
    const [job] = await db.insert(researchJobs).values({
      prompt: options.prompt,
      categoryFocus: options.categoryFocus || null,
      maxBudgetUsd: options.maxBudgetUsd || '1.00',
      maxTurns: options.maxTurns || 30,
      startedBy: options.startedBy || null,
      model: options.model || null,
      baseUrl: options.baseUrl || null,
      authTokenEncrypted: options.authTokenEncrypted || null,
      authTokenLast4: options.authTokenLast4 || null,
      status: 'processing',
      startedAt: new Date(),
    }).returning();

    const abortController = new AbortController();
    this.activeJobs.set(job.id, { jobId: job.id, abortController });

    const config: AgentRunConfig = {
      model: options.model || null,
      baseUrl: options.baseUrl || null,
      authTokenEncrypted: options.authTokenEncrypted || null,
    };

    this.runResearchLoop(
      job.id,
      options.prompt,
      options.categoryFocus,
      options.maxTurns || 30,
      parseFloat(options.maxBudgetUsd || '1.00'),
      config,
      abortController,
    )
      .catch(async (err) => {
        const msg = err?.message || String(err);
        console.error(`[research:${job.id}] FAILED:`, msg);
        if (err?.stack) console.error(err.stack);
        try {
          const [cur] = await db.select({ agentLog: researchJobs.agentLog }).from(researchJobs).where(eq(researchJobs.id, job.id));
          const existing = Array.isArray(cur?.agentLog) ? (cur!.agentLog as any[]) : [];
          existing.push({ role: 'error', content: `Job failed: ${msg}`, timestamp: new Date().toISOString() });
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
    maxBudgetUsd: number,
    config: AgentRunConfig,
    abortController: AbortController,
  ): Promise<void> {
    const emitter = new AgentEventEmitter('research', jobId);
    const ctx = await buildResearchContext(categoryFocus);

    const orchestratorModel = resolveModel(config, DEFAULT_RESEARCH_MODEL);
    // When no custom model is set, use a cheaper model for the search scout.
    // With a custom model/endpoint, use the same model for both so a single
    // model needs to be served by the custom base URL.
    const scoutModel = config.model && config.model.trim() ? orchestratorModel : DEFAULT_ENRICHMENT_MODEL;

    const agentLog: Array<{ role: string; content: string; timestamp: string }> = [];
    const persist = async (extra: Record<string, any> = {}) => {
      try {
        await db.update(researchJobs).set({ agentLog, ...extra }).where(eq(researchJobs.id, jobId));
      } catch (e: any) {
        console.error(`[research:${jobId}] persist failed:`, e.message);
      }
    };
    const addLog = async (role: string, content: string, persistNow = false) => {
      const stored = content.length > 8000 ? content.slice(0, 8000) + `\n…[truncated, full ${content.length} chars in workflow logs]` : content;
      agentLog.push({ role, content: stored, timestamp: new Date().toISOString() });
      console.log(`[research:${jobId}] [${role}] ${content}`);
      if (persistNow) await persist();
    };

    const discoveryCap = Math.max(10, Math.min(200, Math.round(maxBudgetUsd * 5)));
    const runCtx: ResearchRunContext = {
      jobId,
      emitter,
      existingUrls: ctx.existingUrls,
      discoveryCap,
      discoveriesSaved: 0,
      consecutiveDuplicates: 0,
      addLog,
    };

    await addLog('system', `Research started. Orchestrator: ${orchestratorModel}, Scout: ${scoutModel}, Budget: $${maxBudgetUsd}, Max turns: ${maxTurns}, Existing URLs: ${ctx.existingUrls.size}, Distinct domains: ${ctx.totalDomains}${config.baseUrl ? `, Base URL: ${config.baseUrl}` : ''}`, true);
    if (categoryFocus) await addLog('system', `Focus: ${categoryFocus}`);
    await addLog('user', prompt);

    const tools = this.buildResearchTools(runCtx);
    const mcpServer = createSdkMcpServer({ name: 'research', version: '1.0.0', tools });

    const scout: AgentDefinitionInput = {
      description: 'Web research scout. Runs targeted web searches and reports back concrete candidate resources (URL, title, one-line description) for the orchestrator to dedup and save.',
      model: scoutModel,
      tools: ['WebSearch'],
      prompt:
`You are a web research SCOUT for an "awesome video" curated list (video streaming, codecs, players, infrastructure, tools).

The orchestrator will hand you a specific gap or set of search targets. Your job:
1. Run NARROW, specific web searches for those targets (protocol + use-case + "open source"/"github"), not broad "best X 2025" phrasing.
2. MINE aggregators: a "Top 10…"/awesome-list/roundup is not itself a good result, but the individual tools/projects it names usually are — pull those names out and search each one's official site / GitHub repo.
3. High-yield venues: "site:github.com <topic>", "<topic> site:news.ycombinator.com" (Show HN), Demuxed/Mux/Streaming Media talks, arxiv.org / dl.acm.org research with companion code, other awesome-* lists.
4. Report back a concise, structured list of CONCRETE candidates. For each: the real URL (exactly as it appeared in results — never fabricate), the title, and a one-line description of what it offers. Prefer actively-maintained OSS, official docs from niche vendors, conference talks, and academic papers with code. Skip generic intros, vendor marketing, and SEO listicles.

SEARCH BUDGET — STRICT: run AT MOST 3-4 web searches for one delegation, then STOP searching and return your consolidated candidate list as your final message. Do NOT keep searching to be thorough — the orchestrator needs control back to dedup and save. Returning 5-15 solid candidates from 3-4 searches is a success; running 8+ searches is a failure even if you find more.

Return ONLY candidates you actually saw in real search results. Do not dedup or judge saturation — that is the orchestrator's job.`,
    };

    const systemPrompt =
`You are the ORCHESTRATOR of a two-agent research team for an "awesome video" curated list (1900+ resources on video streaming, video development, codecs, players, infrastructure, tools).

YOUR ONE JOB: discover resources that are NOT already in our database and that fill REAL GAPS in our taxonomy, then persist them for admin review.

${categoryFocus ? `FOCUS AREA THIS RUN: "${categoryFocus}".` : 'No focus area — pick the deepest gaps from the taxonomy below.'}

==== YOUR TEAM ====

You do NOT have direct web access. To search the web you MUST delegate to your "scout" subagent using the Task tool (subagent_type: "scout"). Give the scout a SPECIFIC gap and concrete search targets; it will return concrete candidate resources (URL, title, description). You then dedup and save the good ones.

Your own tools (in-process):
- get_coverage_gaps — the most under-served subcategories with sample URLs.
- get_existing_resources — sample what already exists in a category before delegating.
- check_duplicate — MUST be called on every candidate URL before saving.
- save_discovery — persist a NEW, quality (confidence ≥ 70) candidate for admin review.

==== STATIC RESEARCH CONTEXT ====

${ctx.taxonomyBlock}

${ctx.domainsBlock}
${ctx.focusUrlsBlock}

==== WORKFLOW ====

1. Call get_coverage_gaps to confirm the top gaps. Keep the list — you will rotate through SEVERAL gaps in one run.
2. Pick ONE specific gap (low count). Optionally call get_existing_resources for it to see what's already covered.
3. Delegate to the scout (Task tool, subagent_type "scout") with that gap and concrete, narrow search targets.
4. For EACH candidate the scout returns: call check_duplicate(url). If it's new, relevant, and quality (confidence ≥ 70), call save_discovery RIGHT THEN — never leave a fresh non-duplicate unsaved.
5. Pivot, don't quit: when a gap yields only duplicates/listicles, get_coverage_gaps again, pick a DIFFERENT gap, and delegate a fresh scout search. Keep going across multiple gaps.

==== HARD RULES ====

R1. NEVER fabricate URLs. Only save URLs the scout surfaced from a real web search this run.
R2. ALWAYS check_duplicate BEFORE save_discovery.
R3. Skip anything from the SATURATED DOMAINS list unless the specific resource is exceptional.
R4. Skip generic intro articles, vendor marketing, and SEO listicles. Prefer maintained OSS, niche official docs, conference talks (Demuxed/IBC/NAB), academic papers (ACM/IEEE/arXiv), specialized tools, and technically-deep developer blogs.
R5. Confidence < 70 → don't save. Quality > quantity.
R6. Be persistent — the best resources live in the long tail. When a vein runs dry, pivot (different gap, mine a listicle's named tools, GitHub/Show HN/arXiv) and keep delegating. Wind down only once you've genuinely exhausted varied attempts across multiple gaps.

Database state: ${ctx.totalResources} approved resources across ${ctx.totalDomains} distinct domains. Discovery cap this run: ${discoveryCap}.`;

    const allowedTools = [
      'mcp__research__check_duplicate',
      'mcp__research__save_discovery',
      'mcp__research__get_coverage_gaps',
      'mcp__research__get_existing_resources',
      'Task', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskOutput', 'TaskStop', 'TaskUpdate',
      'SendMessage', 'ReportFindings',
    ];

    const result = await runAgentQuery({
      jobType: 'research',
      jobId,
      emitter,
      prompt,
      systemPrompt,
      model: orchestratorModel,
      config,
      mcpServers: { research: mcpServer },
      agents: { scout },
      allowedTools,
      maxTurns,
      maxBudgetUsd,
      abortController,
      log: addLog,
    });

    const [finalJob] = await db.select({
      totalDiscoveries: researchJobs.totalDiscoveries,
      duplicatesSkipped: researchJobs.duplicatesSkipped,
    }).from(researchJobs).where(eq(researchJobs.id, jobId));

    await addLog(
      'system',
      `Research ${result.aborted ? 'cancelled' : 'completed'} (${result.subtype || 'done'}). Turns: ${result.numTurns}/${maxTurns}, ` +
      `Web searches: ${result.webSearchCount}, Discoveries saved: ${finalJob?.totalDiscoveries || 0}, ` +
      `Duplicates skipped: ${finalJob?.duplicatesSkipped || 0}, ` +
      `Tokens: in=${result.tokensIn} out=${result.tokensOut}, Cost: $${result.totalCostUsd.toFixed(4)}`,
    );

    await persist({
      status: result.aborted ? 'cancelled' : 'completed',
      turnsUsed: result.numTurns,
      totalInputTokens: result.tokensIn,
      totalOutputTokens: result.tokensOut,
      estimatedCostUsd: result.totalCostUsd.toFixed(4),
      completedAt: new Date(),
    });
  }

  async cancelJob(jobId: number): Promise<void> {
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) activeJob.abortController.abort();
    await db.update(researchJobs).set({ status: 'cancelled', completedAt: new Date() }).where(eq(researchJobs.id, jobId));
    this.activeJobs.delete(jobId);
  }

  async getJob(jobId: number): Promise<ResearchJob | undefined> {
    const [job] = await db.select().from(researchJobs).where(eq(researchJobs.id, jobId));
    return job;
  }

  async listJobs(limit = 20): Promise<ResearchJob[]> {
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
