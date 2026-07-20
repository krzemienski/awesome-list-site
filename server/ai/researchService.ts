import { db } from '../db';
import { resources, researchJobs, researchDiscoveries } from '@shared/schema';
import { and, eq, sql, getTableColumns } from 'drizzle-orm';
import type { ResearchJob, ResearchDiscovery } from '@shared/schema';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { ensureSubSubcategoryExists } from '../repositories/ensureSubSubcategory';
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { AgentEventEmitter } from './agentEvents';
import { cleanGithubSlugTitle } from '../lib/titleClean';
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

// Resilience knobs for the in-process research tools. Tool handlers must NEVER
// throw into the MCP layer and NEVER hang: a thrown handler surfaces to the
// model as a "tool server" failure (the agent then stalls/waits for recovery),
// and a hung DB call (wedged pool) stalls the whole run.
const TOOL_DB_TIMEOUT_MS = 8000;
const SAVE_RETRY_ATTEMPTS = 3;
const SAVE_RETRY_BASE_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    Promise.resolve(p).then(
      v => { clearTimeout(t); resolve(v); },
      e => { clearTimeout(t); reject(e); },
    );
  });
}

/** Run a non-essential DB side-effect (counters, log rows) without ever letting it fail the tool. */
async function bestEffort(p: PromiseLike<unknown>, label: string): Promise<void> {
  try {
    await withTimeout(p, TOOL_DB_TIMEOUT_MS, label);
  } catch (e: any) {
    console.error(`[research] best-effort ${label} failed:`, e?.message || e);
  }
}

/** After a failed flush round, skip opportunistic flushes for this long so a big queue can't slow every tool call. */
const FLUSH_BACKOFF_MS = 30_000;

/**
 * Postgres class 22 (data exception) and 23 (integrity violation) errors are
 * permanent input failures — retrying or queueing the identical row can never
 * succeed, so callers must fail fast instead.
 */
function isNonRetryableDbError(err: any): boolean {
  const code = err?.code ?? err?.cause?.code;
  return typeof code === 'string' && (code.startsWith('22') || code.startsWith('23'));
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

interface SaveDiscoveryInput {
  title: string;
  url: string;
  description: string;
  suggested_category: string;
  suggested_subcategory?: string;
  suggested_sub_subcategory?: string;
  confidence: number;
  reasoning: string;
}

interface PendingDiscovery {
  input: SaveDiscoveryInput;
  normalizedUrl: string;
  queuedAt: string;
}

interface ResearchRunContext {
  jobId: number;
  emitter: AgentEventEmitter;
  existingUrls: Set<string>;
  discoveryCap: number;
  discoveriesSaved: number;
  consecutiveDuplicates: number;
  /** Discoveries that could not be persisted immediately (transient DB failure); flushed opportunistically + at run end. */
  pendingDiscoveries: PendingDiscovery[];
  /** Epoch ms until which opportunistic (non-forced) flushes are skipped after a failed round. */
  flushBackoffUntil: number;
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
        try {
          await emitCall('check_duplicate', { url });
          // Core check is in-memory (existingUrls Set) — it cannot fail on DB issues.
          const normalized = normalizeUrl(url);
          const isDuplicate = ctx.existingUrls.has(normalized);
          if (isDuplicate) {
            ctx.consecutiveDuplicates++;
            await bestEffort(
              db.update(researchJobs)
                .set({ duplicatesSkipped: sql`${researchJobs.duplicatesSkipped} + 1` })
                .where(eq(researchJobs.id, ctx.jobId)),
              'duplicatesSkipped counter',
            );
          } else {
            ctx.consecutiveDuplicates = 0;
          }
          // Opportunistic flush: if earlier saves were queued, retry them now.
          await this.flushPendingDiscoveries(ctx);
          let text = JSON.stringify({ isDuplicate, normalizedUrl: normalized });
          if (isDuplicate && ctx.consecutiveDuplicates > 0 && ctx.consecutiveDuplicates % 3 === 0) {
            text += `\n\n${STALL_PIVOT_NUDGE}`;
            await ctx.addLog('system', `Stall nudge injected (${ctx.consecutiveDuplicates} consecutive duplicates).`);
          }
          await ctx.addLog('tool_result', `check_duplicate(${url}) → isDuplicate=${isDuplicate}`);
          await emitResult('check_duplicate', text, Date.now() - started);
          return { content: [{ type: 'text', text }] };
        } catch (err: any) {
          console.error(`[research:${ctx.jobId}] check_duplicate handler error:`, err?.message || err);
          const text = JSON.stringify({
            error: preview(String(err?.message || err), 300),
            recoverable: true,
            guidance: 'Transient internal issue — call check_duplicate once more for this URL; if it fails again, move on to other candidates. Never stop the run or wait for recovery.',
          });
          await emitResult('check_duplicate', text, Date.now() - started);
          return { content: [{ type: 'text', text }] };
        }
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
        const respond = async (payload: Record<string, any>) => {
          const text = JSON.stringify(payload);
          await emitResult('save_discovery', text, Date.now() - started);
          return { content: [{ type: 'text' as const, text }] };
        };
        try {
          await emitCall('save_discovery', { url: input.url, title: input.title, confidence: input.confidence });
          const normalized = normalizeUrl(input.url);
          if (ctx.discoveriesSaved >= ctx.discoveryCap) {
            return await respond({ saved: false, reason: `Discovery cap of ${ctx.discoveryCap} reached for this run. Wrap up and stop searching.` });
          }
          if (ctx.existingUrls.has(normalized)) {
            return await respond({ saved: false, reason: 'URL already exists (duplicate — you should have caught this with check_duplicate)' });
          }
          if ((input.confidence || 0) < 70) {
            return await respond({ saved: false, reason: `Confidence ${input.confidence} < 70 threshold. Find a higher-quality resource or justify a higher confidence.` });
          }

          // Flush older queued items first so ordering is roughly preserved.
          await this.flushPendingDiscoveries(ctx);

          let discoveryId: number | null = null;
          let lastErr: any = null;
          for (let attempt = 1; attempt <= SAVE_RETRY_ATTEMPTS; attempt++) {
            try {
              discoveryId = await this.insertDiscovery(ctx, input);
              lastErr = null;
              break;
            } catch (e: any) {
              lastErr = e;
              console.error(`[research:${ctx.jobId}] save_discovery attempt ${attempt}/${SAVE_RETRY_ATTEMPTS} failed:`, e?.message || e);
              if (isNonRetryableDbError(e)) break; // permanent input failure — retrying identical input can never succeed
              if (attempt < SAVE_RETRY_ATTEMPTS) await sleep(SAVE_RETRY_BASE_MS * attempt);
            }
          }

          // Permanent rejection (Postgres data/integrity error): the row can
          // never persist as-is, so do NOT queue it and do NOT mark the URL as
          // saved — the model may fix the input (e.g. category) and retry.
          if (discoveryId === null && isNonRetryableDbError(lastErr)) {
            await ctx.addLog('system', `save_discovery permanently rejected by storage (${preview(String(lastErr?.message || lastErr), 200)}): ${input.title} — ${input.url}`, true);
            return await respond({
              saved: false,
              reason: `Storage permanently rejected this save (${preview(String(lastErr?.message || lastErr), 200)}). Do NOT retry the identical input — fix the input or move on to other candidates. Never stop the run.`,
            });
          }

          // Bookkeeping happens regardless of persistence outcome so the agent
          // never re-saves the same URL and the cap semantics stay intact.
          ctx.existingUrls.add(normalized);
          ctx.discoveriesSaved++;
          ctx.consecutiveDuplicates = 0;

          if (discoveryId !== null) {
            await ctx.addLog('discovery', `Saved: ${input.title} — ${input.url} (confidence ${input.confidence})`, true);
            return await respond({ saved: true, discoveryId });
          }

          // Storage briefly unavailable: queue in-memory and keep the run moving.
          ctx.pendingDiscoveries.push({ input: { ...input }, normalizedUrl: normalized, queuedAt: new Date().toISOString() });
          await ctx.addLog('system', `save_discovery queued after ${SAVE_RETRY_ATTEMPTS} failed attempts (${preview(String(lastErr?.message || lastErr), 200)}): ${input.title} — ${input.url}. Auto-flush will retry.`, true);
          return await respond({
            saved: true,
            queued: true,
            note: 'Storage was briefly busy, so this discovery is QUEUED server-side and will be persisted automatically. Treat this as saved: do NOT retry this URL, do NOT wait, do NOT stop — continue researching.',
          });
        } catch (err: any) {
          console.error(`[research:${ctx.jobId}] save_discovery handler error:`, err?.message || err);
          return await respond({
            error: preview(String(err?.message || err), 300),
            recoverable: true,
            guidance: 'Transient internal issue — retry this save_discovery call once; if it fails again, continue with other candidates. Never stop the run or wait for recovery.',
          });
        }
      },
    );

    const coverageGaps = tool(
      'get_coverage_gaps',
      'Return the most under-represented subcategories (resource_count ASC) with sample existing URLs so you can target real gaps. Call this near the start and again when pivoting.',
      { limit: z.number().optional().describe('How many gap subcategories to return (default 15, max 30)') },
      async ({ limit }) => {
        const started = Date.now();
        try {
          await emitCall('get_coverage_gaps', { limit });
          const gaps = await withTimeout(getCoverageGaps(limit || 15), TOOL_DB_TIMEOUT_MS, 'get_coverage_gaps query');
          const text = JSON.stringify({ gaps });
          await emitResult('get_coverage_gaps', `${gaps.length} gaps`, Date.now() - started);
          return { content: [{ type: 'text', text }] };
        } catch (err: any) {
          console.error(`[research:${ctx.jobId}] get_coverage_gaps handler error:`, err?.message || err);
          const text = JSON.stringify({
            gaps: [],
            degraded: true,
            note: 'Gap data temporarily unavailable — use the TAXONOMY block in your system prompt (already sorted gap-first) and continue. Do not stop or wait.',
          });
          await emitResult('get_coverage_gaps', text, Date.now() - started);
          return { content: [{ type: 'text', text }] };
        }
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
        try {
          await emitCall('get_existing_resources', { category, limit });
          const existing = await withTimeout(getExistingResourcesByCategory(category, limit || 30), TOOL_DB_TIMEOUT_MS, 'get_existing_resources query');
          const text = JSON.stringify({ count: existing.length, resources: existing });
          await emitResult('get_existing_resources', `${existing.length} resources`, Date.now() - started);
          return { content: [{ type: 'text', text }] };
        } catch (err: any) {
          console.error(`[research:${ctx.jobId}] get_existing_resources handler error:`, err?.message || err);
          const text = JSON.stringify({
            count: 0,
            resources: [],
            degraded: true,
            note: 'Sample data temporarily unavailable — rely on check_duplicate per candidate (in-memory, always available) and continue. Do not stop or wait.',
          });
          await emitResult('get_existing_resources', text, Date.now() - started);
          return { content: [{ type: 'text', text }] };
        }
      },
    );

    return [checkDuplicate, saveDiscovery, coverageGaps, existingResources];
  }

  /** Insert one discovery row + bump the job counter. Throws on failure — callers decide retry/queue. */
  private async insertDiscovery(ctx: ResearchRunContext, input: SaveDiscoveryInput): Promise<number> {
    const rows = await withTimeout(
      db.insert(researchDiscoveries).values({
        jobId: ctx.jobId,
        // Run24 R5-041: scouts report GitHub results as "owner/repo — desc";
        // store the cleaned title (repo name, not full_name) at the choke
        // point every save path (direct, retry queue flush) funnels through.
        title: cleanGithubSlugTitle(input.title),
        url: input.url,
        description: input.description || '',
        suggestedCategory: input.suggested_category || '',
        suggestedSubcategory: input.suggested_subcategory || '',
        suggestedSubSubcategory: input.suggested_sub_subcategory || '',
        // Clamp to the 1–100 contract so out-of-range model values can never
        // trigger a permanent DB rejection (e.g. int4 overflow).
        confidence: Math.min(100, Math.max(1, Math.round(input.confidence || 1))),
        reasoning: input.reasoning || '',
        status: 'pending_review',
      }).onConflictDoNothing({ target: [researchDiscoveries.jobId, researchDiscoveries.url] }).returning(),
      TOOL_DB_TIMEOUT_MS,
      'save_discovery insert',
    );
    let id = rows[0]?.id;
    if (id === undefined) {
      // Conflict: an earlier timed-out attempt for this exact (job, url) already
      // committed. Adopt that row instead of failing — closes the retry/flush
      // double-insert race (backed by research_discoveries_job_url_uq).
      const [existing] = await withTimeout(
        db.select({ id: researchDiscoveries.id })
          .from(researchDiscoveries)
          .where(and(eq(researchDiscoveries.jobId, ctx.jobId), eq(researchDiscoveries.url, input.url)))
          .limit(1),
        TOOL_DB_TIMEOUT_MS,
        'save_discovery conflict lookup',
      );
      if (!existing) throw new Error('save_discovery insert conflicted but no existing row was found');
      console.log(`[research:${ctx.jobId}] save_discovery conflict — adopting existing row ${existing.id} for ${input.url}`);
      return existing.id;
    }
    await bestEffort(
      db.update(researchJobs)
        .set({ totalDiscoveries: sql`${researchJobs.totalDiscoveries} + 1` })
        .where(eq(researchJobs.id, ctx.jobId)),
      'totalDiscoveries counter',
    );
    return id;
  }

  /**
   * Retry persisting queued discoveries. Never throws; leaves unrecovered items
   * in the queue. Bounded so a large queue can never wedge a tool call: stops
   * at the FIRST transient failure (DB still unhealthy — the rest would fail
   * too) and then backs off for FLUSH_BACKOFF_MS so subsequent tool calls skip
   * flushing entirely. Permanently-rejected items are dumped to the persisted
   * agent log (manual recovery data) and dropped instead of retrying forever.
   */
  private async flushPendingDiscoveries(ctx: ResearchRunContext, opts: { force?: boolean } = {}): Promise<{ flushed: number; remaining: number }> {
    if (ctx.pendingDiscoveries.length === 0) return { flushed: 0, remaining: 0 };
    if (!opts.force && Date.now() < ctx.flushBackoffUntil) {
      return { flushed: 0, remaining: ctx.pendingDiscoveries.length };
    }
    const still: PendingDiscovery[] = [];
    let flushed = 0;
    let halted = false;
    for (const item of ctx.pendingDiscoveries) {
      if (halted) { still.push(item); continue; }
      try {
        const id = await this.insertDiscovery(ctx, item.input);
        flushed++;
        await ctx.addLog('discovery', `Saved (auto-flushed from retry queue, queued ${item.queuedAt}): ${item.input.title} — ${item.input.url} (discoveryId ${id})`, true);
      } catch (e: any) {
        if (isNonRetryableDbError(e)) {
          const dump = JSON.stringify(item.input);
          console.error(`[research:${ctx.jobId}] queued discovery permanently rejected (${e?.message || e}) — manual recovery data: ${dump}`);
          await ctx.addLog('error', `Queued discovery permanently rejected by storage (${preview(String(e?.message || e), 200)}) — manual recovery data: ${dump}`, true);
        } else {
          still.push(item);
          halted = true; // one bounded timeout per flush, not N×timeout
        }
      }
    }
    ctx.pendingDiscoveries.length = 0;
    ctx.pendingDiscoveries.push(...still);
    ctx.flushBackoffUntil = halted ? Date.now() + FLUSH_BACKOFF_MS : 0;
    if (flushed > 0 || still.length > 0) {
      console.log(`[research:${ctx.jobId}] pending-discovery flush: ${flushed} saved, ${still.length} still queued${halted ? ` (halted on transient failure, backoff ${FLUSH_BACKOFF_MS}ms)` : ''}`);
    }
    return { flushed, remaining: still.length };
  }

  /**
   * Run-end safety net: retry the queue with backoff; anything STILL unsaved is
   * dumped verbatim into the persisted agent log so no discovery is ever lost.
   */
  private async drainPendingDiscoveries(ctx: ResearchRunContext): Promise<void> {
    for (let round = 0; round < 3 && ctx.pendingDiscoveries.length > 0; round++) {
      if (round > 0) await sleep(2000 * round);
      await this.flushPendingDiscoveries(ctx, { force: true });
    }
    if (ctx.pendingDiscoveries.length > 0) {
      for (const item of ctx.pendingDiscoveries) {
        const dump = JSON.stringify(item.input);
        console.error(`[research:${ctx.jobId}] UNRECOVERED queued discovery (manual recovery data): ${dump}`);
        await ctx.addLog('error', `Discovery could not be persisted after run-end retries — manual recovery data: ${dump}`, true);
      }
    }
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
        // Timeout-guarded: addLog(..., true) is awaited inside tool handlers,
        // so a wedged pool hanging this update would stall the whole run.
        await withTimeout(
          db.update(researchJobs).set({ agentLog, ...extra }).where(eq(researchJobs.id, jobId)),
          TOOL_DB_TIMEOUT_MS,
          'agentLog persist',
        );
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

    // Discovery ceiling scales with budget (~5 discoveries per $1) so larger
    // budgets can actually yield more resources (budgets are uncapped per user
    // request). Safety bound of 1000 per run protects the DB/review queue from
    // a runaway job created with an enormous budget.
    const discoveryCap = Math.max(10, Math.min(1000, Math.round(maxBudgetUsd * 5)));
    const runCtx: ResearchRunContext = {
      jobId,
      emitter,
      existingUrls: ctx.existingUrls,
      discoveryCap,
      discoveriesSaved: 0,
      consecutiveDuplicates: 0,
      pendingDiscoveries: [],
      flushBackoffUntil: 0,
      addLog,
    };

    await addLog('system', `Research started. Orchestrator: ${orchestratorModel}, Scout: ${scoutModel}, Budget: $${maxBudgetUsd}, Discovery cap: ${discoveryCap}, Max turns: ${maxTurns}, Existing URLs: ${ctx.existingUrls.size}, Distinct domains: ${ctx.totalDomains}${config.baseUrl ? `, Base URL: ${config.baseUrl}` : ''}`, true);
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
R7. TOOLS ARE RESILIENT BUT NOT INDESTRUCTIBLE: check_duplicate / save_discovery / get_coverage_gaps / get_existing_resources are in-process — persistence retries and queueing are handled automatically on the server. If a tool result contains queued:true or degraded:true, that IS success: keep going. If a tool result contains an error field, retry that one call once, then move on to other candidates. NEVER wait for tools to "recover", never hold candidates back, and never end the run early because of a tool response. If tools truly stop responding entirely the server will terminate the run automatically — that is not your concern.

Database state: ${ctx.totalResources} approved resources across ${ctx.totalDomains} distinct domains. Discovery cap this run: ${discoveryCap}.`;

    // Only the blocking `Task` primitive is allowed for delegation — NOT the
    // async management set (TaskCreate/TaskList/TaskOutput/etc.). Async
    // delegation lets the orchestrator end its turn while scouts are still
    // running; the SDK treats that as run completion and the subsequent
    // auto-resume kills the in-process MCP bridge (tools go dead for the
    // remainder of the run). Blocking Task keeps the entire run inside a single
    // SDK lifecycle event, so the MCP bridge stays alive throughout.
    const allowedTools = [
      'mcp__research__check_duplicate',
      'mcp__research__save_discovery',
      'mcp__research__get_coverage_gaps',
      'mcp__research__get_existing_resources',
      'Task',
    ];

    let result!: Awaited<ReturnType<typeof runAgentQuery>>;
    try {
      result = await runAgentQuery({
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
    } finally {
      // Whatever happened to the run (success, error, cancel), never lose
      // queued discoveries: retry persistence, then dump unrecovered ones
      // into the persisted agent log.
      await this.drainPendingDiscoveries(runCtx);
    }

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

    // Run16 BUG-028: an aborted run can resolve before the SDK reports any
    // usage (numTurns/cost all zero). Don't stamp zeros over the row in that
    // case — keep whatever accounting was last persisted instead of
    // manufacturing a "0 turns / $0.0000" contradiction next to real finds.
    const abortedWithNoUsage =
      result.aborted && result.numTurns === 0 && result.totalCostUsd === 0;
    await persist({
      status: result.aborted ? 'cancelled' : 'completed',
      ...(abortedWithNoUsage ? {} : {
        turnsUsed: result.numTurns,
        totalInputTokens: result.tokensIn,
        totalOutputTokens: result.tokensOut,
        estimatedCostUsd: result.totalCostUsd.toFixed(4),
      }),
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

  // Run16 BUG-027: the jobs LIST used to ship every job's FULL agentLog
  // (hundreds of KB per response). The list view only needs a count and the
  // latest entry (active-job ticker); the detail dialog fetches /jobs/:id
  // separately and still gets the complete log via getJob().
  async listJobs(limit = 20): Promise<Array<Omit<ResearchJob, 'agentLog'> & {
    agentLogCount: number;
    agentLogLast: { role: string; content: string; timestamp: string } | null;
  }>> {
    const { agentLog: _omit, ...summaryCols } = getTableColumns(researchJobs);
    return db
      .select({
        ...summaryCols,
        agentLogCount: sql<number>`coalesce(jsonb_array_length(${researchJobs.agentLog}), 0)`,
        agentLogLast: sql<{ role: string; content: string; timestamp: string } | null>`
          case when coalesce(jsonb_array_length(${researchJobs.agentLog}), 0) > 0
          then ${researchJobs.agentLog} -> (jsonb_array_length(${researchJobs.agentLog}) - 1)
          else null end`,
      })
      .from(researchJobs)
      .orderBy(sql`${researchJobs.createdAt} DESC`)
      .limit(limit) as any;
  }

  // Run23 NB-039: total job count so the UI can label the truncated list
  // ("showing latest 20 of N") instead of silently capping.
  async countJobs(): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(researchJobs);
    return row?.count ?? 0;
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
