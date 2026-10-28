import { db } from '../db';
import { resources, researchJobs, researchDiscoveries, agentEvents, categories, subcategories, subSubcategories, resourceAuditLog } from '@shared/schema';
import { and, eq, inArray, ne, or, sql, getTableColumns } from 'drizzle-orm';
import type { ResearchJob, ResearchDiscovery, DiscoveryVerification } from '@shared/schema';
import { ensureSubSubcategoryExists, type SubSubcategoryTaxonomyAccess } from '../repositories/ensureSubSubcategory';
import { transitionResourceInTransaction, withResourcePublication } from '../repositories/resourcePublication';
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { AgentEventEmitter } from './agentEvents';
import { cleanGithubSlugTitle } from '../lib/titleClean';

/** Thrown when an approve/reject targets a discovery id that does not exist. */
export class DiscoveryNotFoundError extends Error {
  constructor() {
    super("Discovery not found");
    this.name = "DiscoveryNotFoundError";
  }
}
/** A research run is already active on some worker; the start route maps it to 409. */
export class ResearchJobActiveError extends Error {
  constructor(jobId: number) {
    super(`Research run #${jobId} is still running. Wait for it to finish or cancel it before starting another.`);
    this.name = "ResearchJobActiveError";
  }
}
export class DiscoveryConflictError extends Error {
  constructor(message = "Discovery has already been moderated") {
    super(message);
    this.name = "DiscoveryConflictError";
  }
}
import { decodeHtmlEntities, decodeResourceTextFields } from '../github/importHygiene';
import { runAgentQuery, agentUsageFromError, isBudgetCapStop, BUDGET_STOPPED_STATUS, type AgentDefinitionInput } from './runAgentQuery';
import { isJobOrphaned, livenessUnchangedSince, ORPHANED_BY_RESTART_MESSAGE, startJobHeartbeat, WORKER_ID } from './jobLiveness';
import { validateBaseUrl, type AgentRunConfig } from './agentRuntime';
import { KnownUrls, knownInDb, normalizeUrl, surfacedByScout } from './researchDedup';
import { ResearchPhaseTracker, extractUrls } from './researchPhases';
import { describeResearchRunConfig, researchPreflightMessage } from './researchRunConfig';
import type { CostBasis, ResolvedResearchConfig } from '@shared/researcherContract';
import { LinkChecker } from '../validation/linkChecker';
import { isPlausiblePublicUrl } from '@shared/validation';
import { invalidatePublicCache } from '../cache/publicCache';
import { classifyKindForStorage } from '../lib/resourceKinds';
import { createLogger } from "../lib/logger";
import { webResearchService } from './webResearch';

const logger = createLogger("research");

// Cap how much pre-computed context we inline into the orchestrator system prompt.
const MAX_TAXONOMY_LINES = 200;
const MAX_TOP_DOMAINS = 50;
const MAX_FOCUS_URLS = 80;

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
  known: KnownUrls;
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
  // Known-URL set covers ALL resources regardless of status (a rejected or
  // archived resource is still "known" — re-discovering it wastes the run)
  // plus every discovery across all jobs/statuses.
  const [allRes, allDisc] = await Promise.all([
    db.select({ id: resources.id, url: resources.url, category: resources.category, status: resources.status }).from(resources),
    db.select({ id: researchDiscoveries.id, url: researchDiscoveries.url }).from(researchDiscoveries),
  ]);
  const approvedRes = allRes.filter(r => r.status === 'approved');
  const known = new KnownUrls([
    ...allRes.map(r => ({ id: r.id, url: r.url, kind: 'resource' as const })),
    ...allDisc.map(d => ({ id: d.id, url: d.url, kind: 'discovery' as const })),
  ]);

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
    known,
    taxonomyBlock,
    domainsBlock,
    focusUrlsBlock,
    totalResources: approvedRes.length,
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
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  // The operation's own rejection reason passes through unchanged.
  return Promise.race([Promise.resolve(p), timeout]).finally(() => clearTimeout(t));
}

/** Run a non-essential DB side-effect (counters, log rows) without ever letting it fail the tool. */
async function bestEffort(p: PromiseLike<unknown>, label: string): Promise<void> {
  try {
    await withTimeout(p, TOOL_DB_TIMEOUT_MS, label);
  } catch (e: any) {
    logger.error(`[research] best-effort ${label} failed:`, e);
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

/**
 * WS1 dynamic prompt engine (July 30, 2026): rotating campaign angles so
 * consecutive auto-briefed runs attack the catalog from different directions
 * instead of re-running the same generic hunt. Rotation is deterministic —
 * total job count mod angles — so every angle gets its turn.
 */
const CAMPAIGN_ANGLES = [
  {
    id: 'github-deep-dive',
    label: 'GitHub deep-dive',
    directive: 'Bias this run toward GitHub: have the scout run "site:github.com <gap topic>" searches, mine GitHub topic pages, and chase tools named in the READMEs/awesome sections of known projects. Target actively-maintained repos (recent pushes, real documentation) that fill the gaps below.',
  },
  {
    id: 'conference-talks',
    label: 'Conference talks & videos',
    directive: 'Bias this run toward conference material: Demuxed, IBC, NAB, Mile High Video, Streaming Media, FOSDEM open-media devroom. Hunt talk pages/recordings AND the specific projects speakers present — both are savable when they fill a gap.',
  },
  {
    id: 'academic',
    label: 'Academic papers with code',
    directive: 'Bias this run toward research: arxiv.org, dl.acm.org, IEEE Xplore — papers on the gap topics that ship companion code. Save the paper page or its code repo, whichever is the durable resource.',
  },
  {
    id: 'vendor-engineering',
    label: 'Vendor & engineering blogs',
    directive: 'Bias this run toward deep technical blog posts and niche vendor documentation (engineering blogs of streaming platforms, codec vendors, CDN providers) — NOT marketing pages. Search "<gap topic> engineering blog" and "site:<vendor domain> <topic>".',
  },
  {
    id: 'awesome-mining',
    label: 'Curated-list mining',
    directive: 'Bias this run toward mining other curated lists: awesome-* repos, roundups, "top N tools" posts. The list itself is rarely savable — extract the INDIVIDUAL tools/projects it names and verify each one\'s official site or repo.',
  },
  {
    id: 'community',
    label: 'Community finds',
    directive: 'Bias this run toward community venues: Show HN threads, lobste.rs, r/videoengineering discussions. Chase the concrete tools/projects being discussed (their official sites/repos), not the discussion threads themselves.',
  },
];

/** Scouts that may run at once (parallel delegations in one turn, each on a different gap). */
const MAX_PARALLEL_SCOUTS = 2;
/** After the discovery target is hit, how long the orchestrator gets to end its turn before the run is aborted. */
const TARGET_STOP_GRACE_MS = 90_000;

const STALL_PIVOT_NUDGE =
`STRATEGY PIVOT REQUIRED. Recent candidates were all duplicates. Do NOT repeat similar searches — change approach now:
1. Delegate a search for a DIFFERENT under-served gap (call get_coverage_gaps again and pick a subcategory not yet searched this run).
2. Tell the scout to MINE aggregators: a "Top 10…"/awesome-list is not savable itself, but the individual tools it names usually are — have the scout extract specific project names and search each directly.
3. Point the scout at source-rich venues: "site:github.com <topic>", Show HN, Demuxed/Mux/Streaming Media talks, arxiv.org / dl.acm.org with companion code.`;

const COST_BASIS_LABEL: Record<CostBasis, string> = {
  reported: 'reported by the Agent SDK',
  lower_bound: 'lower bound priced from streamed usage — no SDK result after abort; excludes tool-internal model calls',
  unknown: 'unknown — no model had a known price',
};

/**
 * Terminal status of a finished run. A run the SDK stopped at its USD cap is
 * budget_stopped (distinct from completed or failed); reaching the discovery
 * target wins over both that and the backstop abort.
 */
function finalStatusOf(result: { aborted: boolean; subtype?: string; terminalReason?: string }, stoppedAtTarget: boolean): string {
  if (stoppedAtTarget) return 'completed';
  if (result.aborted) return 'cancelled';
  return isBudgetCapStop(result) ? BUDGET_STOPPED_STATUS : 'completed';
}

/** Terminal status of a run whose agent query threw (see finalStatusOf for runs that returned). */
function errorStatusOf(err: unknown): string {
  if (err && typeof err === 'object' && (err as { researchTargetReached?: boolean }).researchTargetReached) return 'completed';
  return isBudgetCapStop(err) ? BUDGET_STOPPED_STATUS : 'failed';
}

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
  phases: ResearchPhaseTracker;
  known: KnownUrls;
  /** Normalized URLs that appeared in a scout report this run; only these may be saved. */
  scoutSurfacedUrls: Set<string>;
  discoveryCap: number;
  discoveriesSaved: number;
  consecutiveDuplicates: number;
  /** Discoveries that could not be persisted immediately (transient DB failure); flushed opportunistically + at run end. */
  pendingDiscoveries: PendingDiscovery[];
  /** Epoch ms until which opportunistic (non-forced) flushes are skipped after a failed round. */
  flushBackoffUntil: number;
  /** Stop condition: end the run once this many NEW discoveries are saved (null = no target). */
  targetDiscoveries: number | null;
  /** Set once the target is hit so the aborted run is persisted as 'completed', not 'cancelled'. */
  targetReached: boolean;
  /** Backstop abort in case the orchestrator keeps working after the target was reached. */
  requestStop: () => void;
  addLog: (role: string, content: string, persistNow?: boolean) => Promise<void>;
}

type ApprovalTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Taxonomy access bound to the approval transaction (mirrors the
 * CategoryRepository reads used by ensureSubSubcategoryExists). The insert runs
 * in a savepoint so a concurrent-create unique violation can be absorbed and
 * re-read without aborting the enclosing approval.
 */
function transactionalTaxonomyAccess(tx: ApprovalTx, onCreate: () => void): SubSubcategoryTaxonomyAccess {
  return {
    async getCategoryByName(name) {
      const [row] = await tx.select().from(categories).where(eq(categories.name, name));
      return row;
    },
    async getSubcategoryByName(name, categoryId) {
      const [row] = await tx.select().from(subcategories)
        .where(and(eq(subcategories.name, name), eq(subcategories.categoryId, categoryId)));
      return row;
    },
    async getSubSubcategoryByName(name, subcategoryId) {
      const [row] = await tx.select().from(subSubcategories)
        .where(and(eq(subSubcategories.name, name), eq(subSubcategories.subcategoryId, subcategoryId)));
      return row;
    },
    async getSubSubcategoryBySlug(slug, subcategoryId) {
      const [row] = await tx.select().from(subSubcategories)
        .where(and(eq(subSubcategories.slug, slug), eq(subSubcategories.subcategoryId, subcategoryId)));
      return row;
    },
    async findSubSubcategoryDuplicateGlobal(name, slug, excludeId) {
      const [row] = await tx.select().from(subSubcategories)
        .where(and(
          excludeId === undefined ? undefined : ne(subSubcategories.id, excludeId),
          or(sql`lower(${subSubcategories.name}) = lower(${name})`, eq(subSubcategories.slug, slug)),
        ))
        .limit(1);
      return row;
    },
    async createSubSubcategory(values) {
      const created = await tx.transaction(async (sp) => {
        const [row] = await sp.insert(subSubcategories).values(values).returning();
        if (values.subcategoryId != null) {
          await sp.update(subcategories).set({ updatedAt: new Date() })
            .where(eq(subcategories.id, values.subcategoryId));
        }
        return row;
      });
      onCreate();
      return created;
    },
  };
}

class ResearchService {
  private static instance: ResearchService;
  private activeJobs: Map<number, ActiveJob> = new Map();
  // Jobs reclaimed as orphaned (by the watchdog or another instance) while
  // this process was still running them — their 'failed' verdict must not be
  // overwritten by this run's own terminal write.
  private reclaimedJobs = new Set<number>();

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

    // ── SCHEMA LENIENCY (July 24, 2026) ──────────────────────────────────
    // Research tools deliberately declare LENIENT input schemas
    // (fields optional, numbers accept strings) and re-validate INSIDE the
    // handler. Reason: the Agent SDK zod-validates tool input BEFORE the
    // handler runs; a strict schema means a slightly-off call (observed with
    // non-Anthropic models via custom base URLs, e.g. grok omitting
    // `reasoning` or sending confidence as a string) is rejected SDK-side —
    // the handler never runs, no tool_call/tool_result events are emitted,
    // nothing is saved, and the runAgentQuery circuit breaker counts the
    // silence as a dead MCP bridge and aborts the run. With lenient schemas
    // the handler ALWAYS runs: it emits events, resets the breaker, and
    // returns an instructive error the model can act on. Required fields are
    // marked "REQUIRED:" in their descriptions so well-behaved models still
    // see the contract.
    const looseNumber = (v: unknown): number => {
      const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
      return Number.isFinite(n) ? n : NaN;
    };
    const looseString = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

    const checkDuplicate = tool(
      'check_duplicate',
      'Check if a URL already exists in the database of known resources. Returns isDuplicate=true if already present. ALWAYS call this before save_discovery.',
      { url: z.string().optional().describe('REQUIRED: The URL to check for duplicates') },
      async (rawInput) => {
        const started = Date.now();
        const url = looseString(rawInput?.url);
        try {
          await emitCall('check_duplicate', { url: url || rawInput?.url });
          if (!url) {
            const text = JSON.stringify({
              error: 'Missing required field: url',
              guidance: 'Re-call check_duplicate with the candidate URL as the "url" string field. Never stop the run.',
            });
            await emitResult('check_duplicate', text, Date.now() - started);
            return { content: [{ type: 'text' as const, text }] };
          }
          await ctx.phases.enter('verifying', 'tool:check_duplicate');
          // Pick up rows another run or a submission added since this run
          // started (throttled; save_discovery re-checks the tables). The core
          // check stays in-memory, so a failed refresh only narrows it to the
          // run-start snapshot.
          try {
            await withTimeout(ctx.known.refresh(), TOOL_DB_TIMEOUT_MS, 'known-url refresh');
          } catch (e) {
            logger.warn({ jobId: ctx.jobId }, `known-url refresh failed (${e instanceof Error ? e.message : String(e)}) — checking against the run-start snapshot`);
          }
          const normalized = normalizeUrl(url);
          const isDuplicate = ctx.known.has(url);
          const sameProjectAs = isDuplicate ? [] : ctx.known.sameProject(url);
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
          let text = JSON.stringify({
            isDuplicate,
            normalizedUrl: normalized,
            ...(sameProjectAs.length > 0 ? {
              sameProjectAs,
              note: 'The catalog or review queue already has this project (repo or docs site). Save this URL only if it is a distinct resource such as a paper or talk, not another page of the same project.',
            } : {}),
          });
          if (isDuplicate && ctx.consecutiveDuplicates > 0 && ctx.consecutiveDuplicates % 3 === 0) {
            text += `\n\n${STALL_PIVOT_NUDGE}`;
            await ctx.addLog('system', `Stall nudge injected (${ctx.consecutiveDuplicates} consecutive duplicates).`);
          }
          await ctx.addLog('tool_result', `check_duplicate(${url}) → isDuplicate=${isDuplicate}${sameProjectAs.length > 0 ? `, same project as ${sameProjectAs.join(', ')}` : ''}`);
          await emitResult('check_duplicate', text, Date.now() - started);
          return { content: [{ type: 'text', text }] };
        } catch (err: any) {
          logger.error({ jobId: ctx.jobId }, `check_duplicate handler error:`, err);
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
        title: z.string().optional().describe('REQUIRED: The resource title'),
        url: z.string().optional().describe('REQUIRED: The exact URL the scout surfaced (never fabricated)'),
        description: z.string().optional().describe('REQUIRED: 1-2 sentence description of what the resource offers'),
        suggested_category: z.string().optional().describe('REQUIRED: Best matching category name from the taxonomy in the system prompt'),
        suggested_subcategory: z.string().optional().describe('Best matching subcategory, or omit if none fits'),
        suggested_sub_subcategory: z.string().optional().describe('Best matching sub-subcategory (level-3), or omit if none fits'),
        confidence: z.union([z.number(), z.string()]).optional().describe('REQUIRED: Confidence score 1-100 (number). Only save if >= 70.'),
        reasoning: z.string().optional().describe("REQUIRED: Why this is valuable AND why it's not redundant with existing resources"),
      },
      async (rawInput) => {
        const started = Date.now();
        const respond = async (payload: Record<string, any>) => {
          const text = JSON.stringify(payload);
          await emitResult('save_discovery', text, Date.now() - started);
          return { content: [{ type: 'text' as const, text }] };
        };
        try {
          await ctx.phases.enter('saving', 'tool:save_discovery');
          await emitCall('save_discovery', { url: rawInput?.url, title: rawInput?.title, confidence: rawInput?.confidence });
          if (ctx.targetReached) {
            return await respond({
              saved: false,
              targetReached: true,
              reason: `The discovery target of ${ctx.targetDiscoveries} was already reached. Do not save or search anything else — end your turn now with a one-line summary.`,
            });
          }

          // In-handler validation (see SCHEMA LENIENCY note above): reject
          // with an actionable error instead of letting the SDK reject the
          // call before this handler ever runs.
          const confidence = Math.round(looseNumber(rawInput?.confidence));
          const input: SaveDiscoveryInput = {
            title: looseString(rawInput?.title),
            url: looseString(rawInput?.url),
            description: looseString(rawInput?.description),
            suggested_category: looseString(rawInput?.suggested_category),
            suggested_subcategory: looseString(rawInput?.suggested_subcategory) || undefined,
            suggested_sub_subcategory: looseString(rawInput?.suggested_sub_subcategory) || undefined,
            confidence,
            reasoning: looseString(rawInput?.reasoning),
          };
          const missing: string[] = [];
          if (!input.title) missing.push('title');
          if (!input.url) missing.push('url');
          if (!input.description) missing.push('description');
          if (!input.suggested_category) missing.push('suggested_category');
          if (!Number.isFinite(confidence)) missing.push('confidence (number 1-100)');
          if (!input.reasoning) missing.push('reasoning');
          if (missing.length > 0) {
            return await respond({
              saved: false,
              error: `Missing or invalid required field(s): ${missing.join(', ')}`,
              guidance: 'Re-call save_discovery for this SAME resource with ALL required fields: title, url, description, suggested_category, confidence (number 1-100), reasoning. Never stop the run.',
            });
          }
          const normalized = normalizeUrl(input.url);
          if (ctx.discoveriesSaved >= ctx.discoveryCap) {
            return await respond({ saved: false, reason: `Discovery cap of ${ctx.discoveryCap} reached for this run. Wrap up and stop searching.` });
          }
          // The in-memory set can lag (throttled, watermark-based refresh), so
          // the last guard before a save reads the tables directly. If that
          // read fails the URL is not saved: the stale set can't prove it new.
          let duplicate = ctx.known.has(input.url);
          if (!duplicate) {
            try {
              duplicate = await withTimeout(knownInDb(input.url), TOOL_DB_TIMEOUT_MS, 'save duplicate check');
            } catch (e) {
              const message = e instanceof Error ? e.message : String(e);
              logger.warn({ jobId: ctx.jobId }, `save duplicate check failed (${message}) — discovery not saved`);
              return await respond({
                saved: false,
                retry: true,
                reason: `Couldn't verify this URL against the catalog (${preview(message, 200)}), so it was NOT saved. Retry this save_discovery call once; if it fails again, move on to other candidates. Never stop the run.`,
              });
            }
            if (duplicate) ctx.known.add(input.url);
          }
          if (duplicate) {
            return await respond({ saved: false, reason: 'URL already exists (duplicate — you should have caught this with check_duplicate)' });
          }
          if (!surfacedByScout(ctx.scoutSurfacedUrls, normalized)) {
            return await respond({
              saved: false,
              reason: 'This URL did not appear in any scout report this run. Only save URLs a scout returned from a real web search; delegate a scout search for it first, or move on.',
            });
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
              logger.error({ jobId: ctx.jobId }, `save_discovery attempt ${attempt}/${SAVE_RETRY_ATTEMPTS} failed:`, e);
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
          ctx.known.add(input.url);
          ctx.discoveriesSaved++;
          ctx.consecutiveDuplicates = 0;

          // Stop-after-N target: this save may be the one that hits it. Flag
          // first (later saves are refused and the run persists as
          // 'completed'), then tell the orchestrator to end its turn so the SDK
          // reports the run's real cost. requestStop is only a backstop abort.
          const targetHit = ctx.targetDiscoveries != null && !ctx.targetReached && ctx.discoveriesSaved >= ctx.targetDiscoveries;
          if (targetHit) {
            ctx.targetReached = true;
            await ctx.addLog('system', `Discovery target reached (${ctx.discoveriesSaved}/${ctx.targetDiscoveries}) — ending the run.`, true);
            ctx.requestStop();
          }
          const targetNote = targetHit
            ? { targetReached: true, note: `Discovery target of ${ctx.targetDiscoveries} reached. Do not search or save anything else — end your turn now with a one-line summary.` }
            : {};

          if (discoveryId !== null) {
            await ctx.addLog('discovery', `Saved: ${input.title} — ${input.url} (confidence ${input.confidence})`, true);
            return await respond({ saved: true, discoveryId, ...targetNote });
          }

          // Storage briefly unavailable: queue in-memory and keep the run moving.
          ctx.pendingDiscoveries.push({ input: { ...input }, normalizedUrl: normalized, queuedAt: new Date().toISOString() });
          await ctx.addLog('system', `save_discovery queued after ${SAVE_RETRY_ATTEMPTS} failed attempts (${preview(String(lastErr?.message || lastErr), 200)}): ${input.title} — ${input.url}. Auto-flush will retry.`, true);
          return await respond({
            saved: true,
            queued: true,
            note: 'Storage was briefly busy, so this discovery is QUEUED server-side and will be persisted automatically. Treat this as saved: do NOT retry this URL, do NOT wait, do NOT stop — continue researching.',
            ...targetNote,
          });
        } catch (err: any) {
          logger.error({ jobId: ctx.jobId }, `save_discovery handler error:`, err);
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
      { limit: z.union([z.number(), z.string()]).optional().describe('How many gap subcategories to return (default 15, max 30)') },
      async (rawInput) => {
        const started = Date.now();
        const limit = looseNumber(rawInput?.limit);
        try {
          await ctx.phases.enter('planning', 'tool:get_coverage_gaps');
          await emitCall('get_coverage_gaps', { limit: rawInput?.limit });
          const gaps = await withTimeout(getCoverageGaps(Number.isFinite(limit) && limit > 0 ? limit : 15), TOOL_DB_TIMEOUT_MS, 'get_coverage_gaps query');
          const text = JSON.stringify({ gaps });
          await emitResult('get_coverage_gaps', `${gaps.length} gaps`, Date.now() - started);
          return { content: [{ type: 'text', text }] };
        } catch (err: any) {
          logger.error({ jobId: ctx.jobId }, `get_coverage_gaps handler error:`, err);
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
        category: z.string().optional().describe('REQUIRED: Category or subcategory name (case-insensitive substring match)'),
        limit: z.union([z.number(), z.string()]).optional().describe('Max resources to return (default 30, max 100)'),
      },
      async (rawInput) => {
        const started = Date.now();
        const category = looseString(rawInput?.category);
        const limit = looseNumber(rawInput?.limit);
        try {
          await ctx.phases.enter('planning', 'tool:get_existing_resources');
          await emitCall('get_existing_resources', { category: category || rawInput?.category, limit: rawInput?.limit });
          if (!category) {
            const text = JSON.stringify({
              count: 0,
              resources: [],
              error: 'Missing required field: category',
              guidance: 'Re-call get_existing_resources with the category (or subcategory) name as the "category" string field.',
            });
            await emitResult('get_existing_resources', text, Date.now() - started);
            return { content: [{ type: 'text' as const, text }] };
          }
          const existing = await withTimeout(getExistingResourcesByCategory(category, Number.isFinite(limit) && limit > 0 ? limit : 30), TOOL_DB_TIMEOUT_MS, 'get_existing_resources query');
          const text = JSON.stringify({ count: existing.length, resources: existing });
          await emitResult('get_existing_resources', `${existing.length} resources`, Date.now() - started);
          return { content: [{ type: 'text', text }] };
        } catch (err: any) {
          logger.error({ jobId: ctx.jobId }, `get_existing_resources handler error:`, err);
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

    const searchPrimarySources = tool(
      'search_primary_sources',
      'Search GitHub\'s official REST API for open-source primary-source candidates. Returns real repository URLs, names and descriptions; use this instead of the built-in WebSearch tool.',
      {
        query: z.string().optional().describe('REQUIRED: Narrow search query, at most 500 characters'),
        limit: z.union([z.number(), z.string()]).optional().describe('Max results to return (default 10, max 15)'),
      },
      async (rawInput) => {
        const started = Date.now();
        const query = looseString(rawInput?.query);
        const limit = looseNumber(rawInput?.limit);
        await emitCall('search_primary_sources', { query: query || rawInput?.query, limit: rawInput?.limit });
        if (!query) {
          const text = JSON.stringify({ results: [], error: 'Missing required field: query', guidance: 'Re-call search_primary_sources with a narrow query string.' });
          await emitResult('search_primary_sources', text, Date.now() - started);
          return { content: [{ type: 'text' as const, text }] };
        }
        try {
          const results = await webResearchService.searchPrimarySources(query, Number.isFinite(limit) ? limit : 10);
          const text = JSON.stringify({ query, results });
          await emitResult('search_primary_sources', `${results.length} results`, Date.now() - started);
          return { content: [{ type: 'text' as const, text }] };
        } catch (err) {
          logger.error({ jobId: ctx.jobId }, `search_primary_sources handler error:`, err);
          const text = JSON.stringify({
            results: [],
            error: preview(err instanceof Error ? err.message : String(err), 300),
            recoverable: true,
            guidance: 'Retry once with a narrower query, then continue with other candidates. Do not stop or wait for recovery.',
          });
          await emitResult('search_primary_sources', text, Date.now() - started);
          return { content: [{ type: 'text' as const, text }] };
        }
      },
    );

    return [checkDuplicate, saveDiscovery, coverageGaps, existingResources, searchPrimarySources];
  }

  /** Insert one discovery row + bump the job counter. Throws on failure — callers decide retry/queue. */
  private async insertDiscovery(ctx: ResearchRunContext, input: SaveDiscoveryInput): Promise<number> {
    const taxonomy = decodeResourceTextFields({
      category: input.suggested_category || '',
      subcategory: input.suggested_subcategory || '',
      subSubcategory: input.suggested_sub_subcategory || '',
    });
    const rows = await withTimeout(
      db.insert(researchDiscoveries).values({
        jobId: ctx.jobId,
        // Run24 R5-041: scouts report GitHub results as "owner/repo — desc";
        // store the cleaned title (repo name, not full_name) at the choke
        // point every save path (direct, retry queue flush) funnels through.
        // Task #248: LLM output can arrive entity-escaped ("A &amp; B") —
        // decode at this choke point so "&amp;" never reaches storage.
        title: decodeHtmlEntities(cleanGithubSlugTitle(input.title)),
        url: input.url,
        description: decodeHtmlEntities(input.description || ''),
        suggestedCategory: taxonomy.category || '',
        suggestedSubcategory: taxonomy.subcategory || '',
        suggestedSubSubcategory: taxonomy.subSubcategory || '',
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
      logger.info({ jobId: ctx.jobId }, `save_discovery conflict — adopting existing row ${existing.id} for ${input.url}`);
      this.scheduleVerification(existing.id, input.url);
      return existing.id;
    }
    await bestEffort(
      db.update(researchJobs)
        .set({ totalDiscoveries: sql`${researchJobs.totalDiscoveries} + 1` })
        .where(eq(researchJobs.id, ctx.jobId)),
      'totalDiscoveries counter',
    );
    this.scheduleVerification(id, input.url);
    return id;
  }

  /**
   * WS3 quality verification (July 30, 2026): fire-and-forget post-save
   * verifier. Runs OUTSIDE the agent loop (the model never sees the result,
   * tool latency is unaffected); failures only log. Sequential saves keep
   * concurrency naturally bounded.
   */
  private scheduleVerification(discoveryId: number, url: string): void {
    void this.verifyDiscovery(discoveryId, url).catch((e: any) => {
      logger.error(`[research] verification for discovery ${discoveryId} failed:`, e);
    });
  }

  private async verifyDiscovery(discoveryId: number, url: string): Promise<void> {
    const verification: DiscoveryVerification = { checkedAt: new Date().toISOString(), liveness: 'unknown' };
    try {
      // SSRF guard: catalog-shape check (no bare IPs/localhost/dotless hosts)
      // + DNS resolution must not land on a private/loopback address.
      if (!isPlausiblePublicUrl(url)) {
        verification.liveness = 'skipped';
        verification.error = 'URL failed the public-URL guard';
      } else {
        try {
          await validateBaseUrl(new URL(url).origin);
        } catch (ssrfErr: any) {
          verification.liveness = 'skipped';
          verification.error = `SSRF guard: ${ssrfErr?.message || ssrfErr}`;
        }
      }

      if (verification.liveness !== 'skipped') {
        const checker = new LinkChecker({ timeout: 10000, retryCount: 1, concurrent: 1 });
        const report = await checker.checkLinks([{ url }]);
        const r = report.results[0];
        if (r) {
          verification.liveness = r.valid && !r.suspicion ? 'ok' : 'dead';
          verification.httpStatus = r.status || undefined;
          if (r.finalUrl && r.finalUrl !== url) verification.finalUrl = r.finalUrl;
          if (r.suspicion) verification.suspicion = `${r.suspicion}${r.suspicionDetail ? `: ${r.suspicionDetail}` : ''}`;
          if (r.error) verification.error = r.error;
        }

        // GitHub repo metadata (unauthenticated — 403/429 rate limits are
        // recorded as unavailable, never treated as a dead repo).
        const gh = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^\/?#]+)\/([^\/?#]+)/i);
        if (gh) {
          const owner = gh[1];
          const repo = gh[2].replace(/\.git$/i, '');
          try {
            const controller = new AbortController();
            const t = setTimeout(() => controller.abort(), 10000);
            const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
              headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'awesome-video-researcher' },
              signal: controller.signal,
            });
            clearTimeout(t);
            if (resp.ok) {
              const data: any = await resp.json();
              verification.github = {
                stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : undefined,
                archived: data.archived === true,
                pushedAt: typeof data.pushed_at === 'string' ? data.pushed_at : undefined,
              };
            } else {
              verification.github = { unavailable: true };
            }
          } catch {
            verification.github = { unavailable: true };
          }
        }
      }
    } catch (e: any) {
      verification.liveness = 'unknown';
      verification.error = String(e?.message || e).slice(0, 300);
    }
    await bestEffort(
      db.update(researchDiscoveries).set({ verification }).where(eq(researchDiscoveries.id, discoveryId)),
      `verification persist (discovery ${discoveryId})`,
    );
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
          logger.error({ jobId: ctx.jobId }, `queued discovery permanently rejected (${e?.message || e}) — manual recovery data: ${dump}`);
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
      logger.info({ jobId: ctx.jobId }, `pending-discovery flush: ${flushed} saved, ${still.length} still queued${halted ? ` (halted on transient failure, backoff ${FLUSH_BACKOFF_MS}ms)` : ''}`);
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
        logger.error({ jobId: ctx.jobId }, `UNRECOVERED queued discovery (manual recovery data): ${dump}`);
        await ctx.addLog('error', `Discovery could not be persisted after run-end retries — manual recovery data: ${dump}`, true);
      }
    }
  }

  /**
   * WS1 dynamic prompt engine: build a gap-aware, history-aware research brief.
   * Combines live coverage gaps, a deterministic rotating campaign angle,
   * queries recent runs already searched (mined from persisted WebSearch
   * tool-call events — orchestrator AND scout), and domains past discoveries
   * already plowed. Used by GET /api/researcher/brief (preview/fill the
   * textarea) and as the server-side prompt when a run starts with an empty
   * prompt. Every input degrades gracefully to nothing on empty history.
   */
  async generateBrief(): Promise<{ brief: string; angle: string }> {
    const [gaps, jobCountRow, searchEventRows, discRows] = await Promise.all([
      getCoverageGaps(8),
      db.select({ count: sql<number>`count(*)::int` }).from(researchJobs),
      db.select({ summary: agentEvents.summary }).from(agentEvents)
        .where(and(
          eq(agentEvents.jobType, 'research'),
          eq(agentEvents.eventType, 'tool_call'),
          inArray(agentEvents.targetActor, ['WebSearch', 'search_primary_sources']),
        ))
        .orderBy(sql`${agentEvents.id} DESC`)
        .limit(200),
      db.select({ url: researchDiscoveries.url, status: researchDiscoveries.status }).from(researchDiscoveries),
    ]);

    const angle = CAMPAIGN_ANGLES[(jobCountRow[0]?.count ?? 0) % CAMPAIGN_ANGLES.length];

    // Recent search queries — summaries are preview'd JSON like {"query":"..."}
    // (possibly truncated), so extract with a tolerant regex instead of JSON.parse.
    const recentQueries: string[] = [];
    const seenQueries = new Set<string>();
    for (const row of searchEventRows) {
      const m = row.summary?.match(/"query"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (!m) continue;
      let q = m[1];
      try { q = JSON.parse(`"${m[1]}"`); } catch { /* keep raw */ }
      const k = q.trim().toLowerCase();
      if (!k || seenQueries.has(k)) continue;
      seenQueries.add(k);
      recentQueries.push(q.trim());
      if (recentQueries.length >= 20) break;
    }

    // Domains past runs already mined (all discoveries) + venues that produced
    // approved finds (proven hunting grounds).
    const minedCounts = new Map<string, number>();
    const approvedCounts = new Map<string, number>();
    for (const d of discRows) {
      const dom = domainOf(d.url);
      if (!dom) continue;
      minedCounts.set(dom, (minedCounts.get(dom) || 0) + 1);
      if (d.status === 'approved') approvedCounts.set(dom, (approvedCounts.get(dom) || 0) + 1);
    }
    const minedTop = [...minedCounts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const approvedTop = [...approvedCounts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const sections: string[] = [];
    sections.push(`AUTO-GENERATED RESEARCH BRIEF (${new Date().toISOString().slice(0, 10)}) — campaign angle: ${angle.label}.`);
    sections.push(angle.directive);
    if (gaps.length > 0) {
      sections.push(
        `TARGET GAPS THIS RUN (most under-served first — rotate through several):\n` +
        gaps.map((g: any) => `- ${g.category} › ${g.subcategory} (${g.resource_count} existing)`).join('\n'),
      );
    }
    if (recentQueries.length > 0) {
      sections.push(
        `RECENT RUNS ALREADY SEARCHED these queries — do NOT repeat them or near-variants; find NEW ground:\n` +
        recentQueries.map(q => `- "${q}"`).join('\n'),
      );
    }
    if (minedTop.length > 0) {
      sections.push(
        `DOMAINS PAST RUNS ALREADY MINED heavily (skip unless a specific find is exceptional): ` +
        minedTop.map(([d, n]) => `${d} (${n})`).join(', '),
      );
    }
    if (approvedTop.length > 0) {
      sections.push(
        `VENUE TYPES THAT PRODUCED APPROVED FINDS before (proven hunting grounds worth revisiting with NEW queries): ` +
        approvedTop.map(([d]) => d).join(', '),
      );
    }
    sections.push('Goal: save NEW, high-quality resources (confidence ≥ 70) that fill the target gaps, biased toward the campaign angle.');

    return { brief: sections.join('\n\n'), angle: angle.label };
  }

  /**
   * Admit at most ONE active research run across every instance. Concurrent
   * starts serialize on a transaction-scoped advisory lock, so the second sees
   * the first's committed row. An active row blocks admission unless its
   * worker is provably gone (server/ai/jobLiveness.ts); such an orphan is
   * reclaimed as 'failed' inside the same transaction, so a restart never
   * leaves a window where starts 409 on a dead run.
   */
  private async admitResearchJob(values: Omit<typeof researchJobs.$inferInsert, 'workerId' | 'heartbeatAt'>): Promise<ResearchJob> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('research_job_admission'))`);
      const activeRows = await tx
        .select({
          id: researchJobs.id,
          status: researchJobs.status,
          workerId: researchJobs.workerId,
          heartbeatAt: researchJobs.heartbeatAt,
          startedAt: researchJobs.startedAt,
          createdAt: researchJobs.createdAt,
        })
        .from(researchJobs)
        .where(inArray(researchJobs.status, ['pending', 'processing']));
      const now = Date.now();
      const live = activeRows.find((row) => !isJobOrphaned(row, this.activeJobs.has(row.id), now));
      if (live) throw new ResearchJobActiveError(live.id);
      for (const orphan of activeRows) {
        const [reclaimed] = await tx
          .update(researchJobs)
          .set({ status: 'failed', errorMessage: ORPHANED_BY_RESTART_MESSAGE, completedAt: new Date() })
          .where(and(
            eq(researchJobs.id, orphan.id),
            inArray(researchJobs.status, ['pending', 'processing']),
            livenessUnchangedSince(researchJobs, orphan),
          ))
          .returning({ id: researchJobs.id });
        if (reclaimed) {
          logger.info(`🧹 Research admission reclaimed orphaned job #${orphan.id} (worker gone)`);
          continue;
        }
        // No match: it finished meanwhile (fine), or its worker just
        // heartbeated, which proves it alive, so it still blocks admission.
        const [still] = await tx
          .select({ id: researchJobs.id })
          .from(researchJobs)
          .where(and(eq(researchJobs.id, orphan.id), inArray(researchJobs.status, ['pending', 'processing'])));
        if (still) throw new ResearchJobActiveError(orphan.id);
      }
      const [job] = await tx
        .insert(researchJobs)
        .values({ ...values, workerId: WORKER_ID, heartbeatAt: new Date() })
        .returning();
      return job;
    });
  }

  async startResearchJob(options: {
    prompt: string;
    categoryFocus?: string;
    /** null/undefined => unlimited budget (no cap passed to the SDK). */
    maxBudgetUsd?: string | null;
    /** null/undefined => unlimited turns (no cap passed to the SDK). */
    maxTurns?: number | null;
    /** Optional minimum elapsed research time; early model completions resume with fresh work. */
    minDurationMs?: number | null;
    startedBy?: string;
    model?: string | null;
    /** Explicit scout (subagent) model. Null => auto (default scout, or 'inherit' with a custom model). */
    scoutModel?: string | null;
    /** Stop the run after this many NEW saved discoveries. Null => no target. */
    targetDiscoveries?: number | null;
    baseUrl?: string | null;
    authTokenEncrypted?: string | null;
    authTokenLast4?: string | null;
    /** Strict endpoint/credential/model resolution (researchRunConfig.ts); must pass preflight. */
    resolvedConfig: ResolvedResearchConfig;
  }): Promise<number> {
    const resolved = options.resolvedConfig;
    if (!resolved.preflight.ok) throw new Error(researchPreflightMessage(resolved));
    const job = await this.admitResearchJob({
      prompt: options.prompt,
      categoryFocus: options.categoryFocus || null,
      // NULL = unlimited (owner request July 24, 2026): no default caps.
      maxBudgetUsd: options.maxBudgetUsd ?? null,
      maxTurns: options.maxTurns ?? null,
      startedBy: options.startedBy || null,
      model: options.model || null,
      scoutModel: options.scoutModel || null,
      targetDiscoveries: options.targetDiscoveries ?? null,
      baseUrl: options.baseUrl || null,
      authTokenEncrypted: options.authTokenEncrypted || null,
      authTokenLast4: options.authTokenLast4 || null,
      resolvedConfig: resolved,
      status: 'processing',
      startedAt: new Date(),
    });

    const abortController = new AbortController();
    this.activeJobs.set(job.id, { jobId: job.id, abortController });

    // Liveness heartbeat (server/ai/jobLiveness.ts): lets a restarted or
    // sibling instance reclaim this row as soon as this worker is gone. If
    // the row leaves 'processing' under us (cancelled on another instance,
    // or reclaimed after missed heartbeats) stop the run.
    const stopHeartbeat = startJobHeartbeat({
      label: `research:${job.id}`,
      beat: async () => {
        const [beat] = await db.update(researchJobs)
          .set({ heartbeatAt: new Date(), workerId: WORKER_ID })
          .where(and(eq(researchJobs.id, job.id), sql`${researchJobs.status} in ('pending', 'processing')`))
          .returning({ status: researchJobs.status });
        if (beat) return beat.status;
        const [row] = await db.select({ status: researchJobs.status }).from(researchJobs).where(eq(researchJobs.id, job.id));
        return row?.status ?? null;
      },
      onLost: (status) => {
        if (status !== 'cancelled') this.reclaimedJobs.add(job.id);
        abortController.abort();
      },
    });

    const config: AgentRunConfig = {
      model: options.model || null,
      baseUrl: options.baseUrl || null,
      authTokenEncrypted: options.authTokenEncrypted || null,
    };

    logger.info('Research job started', {
      jobId: job.id,
      config: describeResearchRunConfig(resolved),
      categoryFocus: options.categoryFocus || undefined,
      maxTurns: options.maxTurns ?? undefined,
      maxBudgetUsd: options.maxBudgetUsd ?? undefined,
    });

    this.runResearchLoop(
      job.id,
      options.prompt,
      options.categoryFocus,
      options.maxTurns ?? null,
      options.maxBudgetUsd != null ? parseFloat(options.maxBudgetUsd) : null,
      config,
      resolved,
      abortController,
      options.targetDiscoveries ?? null,
      options.minDurationMs ?? null,
    )
      .catch(async (err) => {
        const msg = err?.message || String(err);
        const failStatus = errorStatusOf(err);
        if (failStatus === 'failed') {
          logger.error('Research job failed', { jobId: job.id, reason: msg }, err instanceof Error ? err : undefined);
        } else {
          logger.info('Research job finished', { jobId: job.id, status: failStatus, reason: String(msg) });
        }
        try {
          const [cur] = await db.select({ agentLog: researchJobs.agentLog }).from(researchJobs).where(eq(researchJobs.id, job.id));
          const existing = Array.isArray(cur?.agentLog) ? (cur!.agentLog as any[]) : [];
          existing.push(failStatus === 'failed'
            ? { role: 'error', content: `Job failed: ${msg}`, timestamp: new Date().toISOString() }
            : { role: 'system', content: `Run ended (${failStatus}): ${msg}`, timestamp: new Date().toISOString() });
          const usage = agentUsageFromError(err);
          const reclaimed = this.reclaimedJobs.has(job.id);
          await db.update(researchJobs).set({
            ...(reclaimed ? {} : {
              status: sql`case when ${researchJobs.status} = 'cancelled' then 'cancelled' else ${failStatus} end`,
              // A run that reached its discovery target is a success even if the
              // budget cap stopped its last turn; it carries no error banner.
              errorMessage: failStatus === 'completed' ? null : msg,
            }),
            ...(usage ? {
              turnsUsed: usage.numTurns,
              totalInputTokens: usage.tokensIn,
              totalOutputTokens: usage.tokensOut,
              estimatedCostUsd: usage.totalCostUsd.toFixed(4),
              costBasis: usage.costBasis,
            } : {}),
            agentLog: existing,
            completedAt: sql`coalesce(${researchJobs.completedAt}, now())`,
          }).where(eq(researchJobs.id, job.id));

          // Mirror the terminal state into the admin audit trail so a run's
          // cost and outcome are reviewable next to its launch entry.
          const [finished] = await db.select({
            status: researchJobs.status,
            model: researchJobs.model,
            turnsUsed: researchJobs.turnsUsed,
            estimatedCostUsd: researchJobs.estimatedCostUsd,
            totalDiscoveries: researchJobs.totalDiscoveries,
            startedBy: researchJobs.startedBy,
            startedAt: researchJobs.startedAt,
            completedAt: researchJobs.completedAt,
          }).from(researchJobs).where(eq(researchJobs.id, job.id));
          await db.insert(resourceAuditLog).values({
            action: 'research_finished',
            performedBy: finished?.startedBy ?? null,
            changes: {
              jobId: job.id,
              model: finished?.model ?? null,
              status: finished?.status ?? failStatus,
              turnsUsed: finished?.turnsUsed ?? null,
              estimatedCostUsd: finished?.estimatedCostUsd ?? null,
              totalDiscoveries: finished?.totalDiscoveries ?? null,
              startedAt: finished?.startedAt ?? null,
              completedAt: finished?.completedAt ?? null,
              durationMs: finished?.startedAt && finished?.completedAt
                ? new Date(finished.completedAt).getTime() - new Date(finished.startedAt).getTime()
                : null,
            },
            notes: `Research run #${job.id} finished (${finished?.status ?? failStatus})`,
          });
        } catch (persistErr: any) {
          logger.error({ jobId: job.id }, `failed to persist failure:`, persistErr?.message);
        }
      })
      .finally(() => {
        stopHeartbeat();
        this.activeJobs.delete(job.id);
        this.reclaimedJobs.delete(job.id);
      });

    return job.id;
  }

  private async runResearchLoop(
    jobId: number,
    prompt: string,
    categoryFocus: string | undefined,
    maxTurns: number | null,
    maxBudgetUsd: number | null,
    config: AgentRunConfig,
    resolved: ResolvedResearchConfig,
    abortController: AbortController,
    targetDiscoveries: number | null = null,
    minDurationMs: number | null = null,
  ): Promise<void> {
    const researchStartedAt = Date.now();
    const emitter = new AgentEventEmitter('research', jobId);
    const phases = new ResearchPhaseTracker(emitter);
    // Every run that emits a phase also emits 'finishing': a setup failure
    // (e.g. a DB timeout while reading the catalog) ends here as failed.
    await phases.enter('planning', 'run_started');
    let ctx: ResearchContext;
    try {
      ctx = await buildResearchContext(categoryFocus);
    } catch (err) {
      await phases.enter('finishing', 'run_error', errorStatusOf(err));
      throw err;
    }

    // Preflight guarantees both are set; the scout value is a tier alias the
    // CLI maps through ANTHROPIC_DEFAULT_<TIER>_MODEL, "inherit", or an
    // explicit override (see researchRunConfig.ts for the allowlist rules).
    const orchestratorModel = resolved.orchestrator.model!;
    const scoutModel = resolved.scout.value!;

    const agentLog: Array<{ role: string; content: string; timestamp: string }> = [];
    const persist = async (extra: Record<string, any> = {}) => {
      try {
        // Timeout-guarded: addLog(..., true) is awaited inside tool handlers,
        // so a wedged pool hanging this update would stall the whole run.
        await withTimeout(
          db.update(researchJobs).set({
            agentLog, ...extra,
            ...(extra.status ? { status: sql`case when ${researchJobs.status} = 'cancelled' then 'cancelled' else ${extra.status} end` } : {}),
            ...(extra.completedAt ? { completedAt: sql`coalesce(${researchJobs.completedAt}, ${extra.completedAt.toISOString()}::timestamp)` } : {}),
          }).where(eq(researchJobs.id, jobId)),
          TOOL_DB_TIMEOUT_MS,
          'agentLog persist',
        );
      } catch (e: any) {
        logger.error({ jobId: jobId }, `persist failed:`, e.message);
      }
    };
    const addLog = async (role: string, content: string, persistNow = false) => {
      const stored = content.length > 8000 ? content.slice(0, 8000) + `\n…[truncated, full ${content.length} chars in workflow logs]` : content;
      agentLog.push({ role, content: stored, timestamp: new Date().toISOString() });
      logger.info(`Agent ${role}: ${content}`, { jobId });
      if (persistNow) await persist();
    };

    // Discovery ceiling scales with budget (~5 discoveries per $1, bounded
    // 10..1000) when a budget is set. Unlimited budget (null) => unlimited
    // discoveries too — the run is deliberately unbounded per owner request
    // (July 24, 2026). A stop-after-N target raises the cap to at least N so
    // the budget-derived ceiling can never block reaching the explicit target.
    const baseCap = maxBudgetUsd == null
      ? Number.POSITIVE_INFINITY
      : Math.max(10, Math.min(1000, Math.round(maxBudgetUsd * 5)));
    const discoveryCap = targetDiscoveries != null ? Math.max(baseCap, targetDiscoveries) : baseCap;
    const discoveryCapLabel = Number.isFinite(discoveryCap) ? String(discoveryCap) : 'unlimited';
    const runCtx: ResearchRunContext = {
      jobId,
      emitter,
      phases,
      known: ctx.known,
      scoutSurfacedUrls: new Set<string>(),
      discoveryCap,
      discoveriesSaved: 0,
      consecutiveDuplicates: 0,
      pendingDiscoveries: [],
      flushBackoffUntil: 0,
      targetDiscoveries,
      targetReached: false,
      requestStop: () => {
        // The orchestrator is told to end its turn, which yields the SDK's
        // result message (real turns + cost). Abort only if it keeps going;
        // runResearchLoop reads that abort as a target-stop via targetReached.
        setTimeout(() => abortController.abort(), TARGET_STOP_GRACE_MS).unref();
      },
      addLog,
    };

    await addLog('system', `Research started. ${describeResearchRunConfig(resolved)}. Budget: ${maxBudgetUsd != null ? `$${maxBudgetUsd}` : 'unlimited'}, Discovery cap: ${discoveryCapLabel}, Discovery target: ${targetDiscoveries ?? 'none'}, Max turns: ${maxTurns ?? 'unlimited'}, Max parallel scouts: ${MAX_PARALLEL_SCOUTS}, Known URLs: ${ctx.known.size}, Distinct domains: ${ctx.totalDomains}`, true);
    if (categoryFocus) await addLog('system', `Focus: ${categoryFocus}`);
    await addLog('user', prompt);

    const tools = this.buildResearchTools(runCtx);
    const mcpServer = createSdkMcpServer({ name: 'research', version: '1.0.0', tools });

    const scout: AgentDefinitionInput = {
      description: 'Web research scout. Runs targeted web searches and reports back concrete candidate resources (URL, title, one-line description) for the orchestrator to dedup and save.',
      model: scoutModel,
      tools: ['mcp__research__search_primary_sources'],
      // Belt-and-braces alongside the PreToolUse sync-delegation hook: pin the
      // scout to foreground execution at the definition level too.
      background: false,
      prompt:
`You are a web research SCOUT for an "awesome video" curated list (video streaming, codecs, players, infrastructure, tools).

The orchestrator will hand you a specific gap or set of search targets. Your job:
1. Use the search_primary_sources tool for NARROW, specific GitHub searches (protocol + use-case + "open source"), not broad "best X 2025" phrasing. Do not use the built-in WebSearch tool.
2. MINE aggregators: a "Top 10…"/awesome-list/roundup is not itself a good result, but the individual tools/projects it names usually are — pull those names out and search each one's official site / GitHub repo.
3. High-yield GitHub queries: "<topic> in:name,description,readme", "<topic> topic:<topic>", "<topic> language:TypeScript", and "<topic> pushed:>2025-01-01". Mine repository READMEs and topic pages for related projects.
4. Report back a concise, structured list of CONCRETE candidates. For each: the real URL (exactly as it appeared in results — never fabricate), the title, and a one-line description of what it offers. Prefer actively-maintained OSS, official docs from niche vendors, conference talks, and academic papers with code. Skip generic intros, vendor marketing, and SEO listicles.

SEARCH BUDGET — STRICT: run AT MOST 3-4 web searches for one delegation, then STOP searching and return your consolidated candidate list as your final message. Do NOT keep searching to be thorough — the orchestrator needs control back to dedup and save. Returning 5-15 solid candidates from 3-4 searches is a success; running 8+ searches is a failure even if you find more.

REPORT FORMAT — your final message is ONLY a JSON array in a \`\`\`json fenced block, one object per candidate:
{"url": "<exact URL from a search result>", "title": "...", "description": "<one line: what it offers>", "fits_gap": "<the gap it fills>", "source_type": "repo|docs|paper|talk|blog|tool|other", "maintained": "yes|no|unknown"}

Return ONLY candidates you actually saw in real search results. Do not dedup or judge saturation — that is the orchestrator's job.`,
    };

    const systemPrompt =
`You are the ORCHESTRATOR of a two-agent research team for an "awesome video" curated list (1900+ resources on video streaming, video development, codecs, players, infrastructure, tools).

YOUR ONE JOB: discover resources that are NOT already in our database and that fill REAL GAPS in our taxonomy, then persist them for admin review.

${categoryFocus ? `FOCUS AREA THIS RUN: "${categoryFocus}".` : 'No focus area — pick the deepest gaps from the taxonomy below.'}

==== YOUR TEAM ====

You do NOT have direct web access. To search the web you MUST delegate to your "scout" subagent using the delegation tool — named "Task" (or "Agent" in newer builds) — with subagent_type: "scout". Give the scout a SPECIFIC gap and concrete search targets; it will return concrete candidate resources (URL, title, description). You then dedup and save the good ones.

Your own tools (in-process):
- get_coverage_gaps — the most under-served subcategories with sample URLs.
- get_existing_resources — sample what already exists in a category before delegating.
- check_duplicate — MUST be called on every candidate URL before saving.
- save_discovery — persist a NEW, quality (confidence ≥ 70) candidate for admin review. The server only accepts URLs that appeared in a scout report this run.

PARALLEL SCOUTS: you may run up to ${MAX_PARALLEL_SCOUTS} scouts at once — issue the delegation calls in the SAME turn, each on a DIFFERENT gap with distinct search targets so they do not repeat each other's searches. A third concurrent delegation is refused.

==== STATIC RESEARCH CONTEXT ====

${ctx.taxonomyBlock}

${ctx.domainsBlock}
${ctx.focusUrlsBlock}

==== WORKFLOW ====

1. Call get_coverage_gaps to confirm the top gaps. Keep the list — you will rotate through SEVERAL gaps in one run.
2. Pick ONE specific gap (low count). Optionally call get_existing_resources for it to see what's already covered.
3. Delegate to the scout (Task/Agent tool, subagent_type "scout") with that gap and concrete, narrow search targets.
4. For EACH candidate the scout returns: call check_duplicate(url). If it's new, relevant, and quality (confidence ≥ 70), call save_discovery RIGHT THEN — never leave a fresh non-duplicate unsaved.
5. Pivot, don't quit: when a gap yields only duplicates/listicles, get_coverage_gaps again, pick a DIFFERENT gap, and delegate a fresh scout search. Keep going across multiple gaps.

==== HARD RULES ====

R1. NEVER fabricate URLs. Only save URLs the scout surfaced from a real web search this run.
R2. ALWAYS check_duplicate BEFORE save_discovery.
R3. Skip anything from the SATURATED DOMAINS list unless the specific resource is exceptional.
R4. Skip generic intro articles, vendor marketing, and SEO listicles. Prefer maintained OSS, niche official docs, conference talks (Demuxed/IBC/NAB), academic papers (ACM/IEEE/arXiv), specialized tools, and technically-deep developer blogs.
R5. Confidence < 70 → don't save. Quality > quantity. Score confidence with this rubric: start at 50; +15 primary source (official repo, docs, paper, talk recording); +10 actively maintained or recent (scout says maintained: yes, or a 2024+ date); +15 fills a listed gap that has few resources; +10 technically deep for video engineers; −30 SEO listicle, content farm or vendor marketing; −20 same project as something check_duplicate reports in sameProjectAs.
R6. Be persistent — the best resources live in the long tail. When a vein runs dry, pivot (different gap, mine a listicle's named tools, GitHub/Show HN/arXiv) and keep delegating. Wind down only once you've genuinely exhausted varied attempts across multiple gaps.
R7. TOOLS ARE RESILIENT BUT NOT INDESTRUCTIBLE: check_duplicate / save_discovery / get_coverage_gaps / get_existing_resources are in-process — persistence retries and queueing are handled automatically on the server. If a tool result contains queued:true or degraded:true, that IS success: keep going. If a tool result contains an error field, retry that one call once, then move on to other candidates. NEVER wait for tools to "recover", never hold candidates back, and never end the run early because of a tool response. If tools truly stop responding entirely the server will terminate the run automatically — that is not your concern.

Database state: ${ctx.totalResources} approved resources across ${ctx.totalDomains} distinct domains. Discovery cap this run: ${discoveryCapLabel}.${targetDiscoveries != null ? `

STOP TARGET: this run ends AUTOMATICALLY once ${targetDiscoveries} new discoveries are saved. When a save_discovery result contains targetReached:true, stop: do not search, delegate or save anything else, and end your turn immediately with a one-line summary.` : ''}`;

    // Only the blocking `Task` primitive may be used for delegation — NOT the
    // async management set (TaskCreate/TaskList/TaskOutput/etc.). NOTE:
    // `allowedTools` alone does NOT enforce this under bypassPermissions — the
    // real enforcement lives in runAgentQuery: the async Task* set is in
    // BASELINE_DISALLOWED_TOOLS, and a PreToolUse hook forces
    // run_in_background:false on every Task/Agent delegation call (the SDK
    // defaults to background since ~0.3.2xx, which caused premature run
    // completion with scouts still in-flight + a dead-MCP auto-resume).
    const allowedTools = [
      'mcp__research__check_duplicate',
      'mcp__research__save_discovery',
      'mcp__research__get_coverage_gaps',
      'mcp__research__get_existing_resources',
      'mcp__research__search_primary_sources',
      'Task',
      'Agent',
    ];

    let result: Awaited<ReturnType<typeof runAgentQuery>> | undefined;
    let runError: unknown = null;
    const rounds: NonNullable<typeof result>[] = [];
    try {
      while (true) {
        const usedTurns = rounds.reduce((sum, round) => sum + round.numTurns, 0);
        const usedCost = rounds.reduce((sum, round) => sum + round.totalCostUsd, 0);
        const round = await runAgentQuery({
          jobType: 'research',
          jobId,
          emitter,
          prompt: rounds.length === 0 ? prompt :
            `Continue this research run with fresh, substantive work for at least ${Math.max(1, Math.ceil((researchStartedAt + (minDurationMs ?? 0) - Date.now()) / 60_000))} more minutes. Previous terminal summary: ${rounds[rounds.length - 1].resultText.slice(0, 4000)}\n\nDo not repeat prior queries or candidates. Pick the next under-served subcategories, retrieve existing resources, delegate fresh scouts, check duplicates and save only genuine new discoveries. Do not finalize just because one subcategory or a small set is complete.`,
          systemPrompt,
          model: orchestratorModel,
          config,
          approvedEndpointHost: resolved.endpoint.host,
          mcpServers: { research: mcpServer },
          agents: { scout },
          allowedTools,
          maxTurns: maxTurns === null ? null : Math.max(0, maxTurns - usedTurns),
          maxBudgetUsd: maxBudgetUsd === null ? null : Math.max(0, maxBudgetUsd - usedCost),
          abortController,
          log: addLog,
          maxConcurrentDelegations: MAX_PARALLEL_SCOUTS,
          onDelegation: async (e) => {
            if (e.kind === 'started') {
              await phases.scoutStarted(e);
              return;
            }
            const urls = extractUrls(e.output);
            for (const u of urls) runCtx.scoutSurfacedUrls.add(normalizeUrl(u));
            await phases.scoutEnded(e, urls.length);
          },
        });
        rounds.push(round);
        const remainingMs = minDurationMs === null ? 0 : researchStartedAt + minDurationMs - Date.now();
        const remainingTurns = maxTurns === null ? null : maxTurns - rounds.reduce((sum, item) => sum + item.numTurns, 0);
        const remainingBudget = maxBudgetUsd === null ? null : maxBudgetUsd - rounds.reduce((sum, item) => sum + item.totalCostUsd, 0);
        if (remainingMs <= 0 || round.aborted || runCtx.targetReached ||
            (remainingTurns !== null && remainingTurns <= 0) ||
            (remainingBudget !== null && remainingBudget <= 0.0001)) {
          result = round;
          break;
        }
        await addLog('system', `Continuing research for at least ${Math.ceil(remainingMs / 60_000)} more minute(s) with fresh gaps and candidates.`, true);
      }
      if (rounds.length > 1) {
        const last = rounds[rounds.length - 1];
        result = {
          ...last,
          numTurns: rounds.reduce((sum, round) => sum + round.numTurns, 0),
          totalCostUsd: rounds.reduce((sum, round) => sum + round.totalCostUsd, 0),
          tokensIn: rounds.reduce((sum, round) => sum + round.tokensIn, 0),
          tokensOut: rounds.reduce((sum, round) => sum + round.tokensOut, 0),
          webSearchCount: rounds.reduce((sum, round) => sum + round.webSearchCount, 0),
          durationMs: rounds.reduce((sum, round) => sum + round.durationMs, 0),
        };
      }
    } catch (err) {
      // runAgentQuery throws for SDK error results, including the budget cap
      // hit on the turn after the target was reached: the caller's status
      // logic must know the target was met.
      if (runCtx.targetReached && err && typeof err === 'object') {
        (err as { researchTargetReached?: boolean }).researchTargetReached = true;
      }
      const usage = agentUsageFromError(err);
      if (usage && rounds.length > 0 && err && typeof err === 'object') {
        // runAgentQuery attaches this trusted in-process usage payload to SDK errors.
        const sdkError = err as { agentUsage?: typeof usage };
        sdkError.agentUsage = {
          ...usage,
          numTurns: usage.numTurns + rounds.reduce((sum, round) => sum + round.numTurns, 0),
          tokensIn: usage.tokensIn + rounds.reduce((sum, round) => sum + round.tokensIn, 0),
          tokensOut: usage.tokensOut + rounds.reduce((sum, round) => sum + round.tokensOut, 0),
          totalCostUsd: usage.totalCostUsd + rounds.reduce((sum, round) => sum + round.totalCostUsd, 0),
        };
      }
      runError = err;
      throw err;
    } finally {
      await phases.abortRunningScouts();
      await phases.enter(
        'finishing',
        result ? 'run_ended' : 'run_error',
        result ? finalStatusOf(result, runCtx.targetReached) : errorStatusOf(runError),
      );
      // Whatever happened to the run (success, error, cancel), never lose
      // queued discoveries: retry persistence, then dump unrecovered ones
      // into the persisted agent log.
      await this.drainPendingDiscoveries(runCtx);
    }

    // Timeout-guarded with an in-memory fallback: a wedged pool at run end
    // must not hang the finalization path before the status is persisted.
    let finalJob: { totalDiscoveries: number | null; duplicatesSkipped: number | null } | undefined;
    try {
      [finalJob] = await withTimeout(
        db.select({
          totalDiscoveries: researchJobs.totalDiscoveries,
          duplicatesSkipped: researchJobs.duplicatesSkipped,
        }).from(researchJobs).where(eq(researchJobs.id, jobId)),
        TOOL_DB_TIMEOUT_MS,
        'final job counters select',
      );
    } catch (e: any) {
      logger.error({ jobId: jobId }, `final counters select failed (${e?.message}) — using in-memory counters`);
      finalJob = { totalDiscoveries: runCtx.discoveriesSaved, duplicatesSkipped: null };
    }

    // A target-stop aborts the SDK query on purpose — that is a successful
    // completion, not a cancellation.
    const stoppedAtTarget = runCtx.targetReached;
    await addLog(
      'system',
      `Research ${result.aborted ? (stoppedAtTarget ? 'completed (discovery target reached)' : 'cancelled') : (!stoppedAtTarget && isBudgetCapStop(result) ? 'stopped at budget cap' : 'completed')} (${result.subtype || 'done'}). Turns: ${result.numTurns}/${maxTurns ?? '∞'}, ` +
      `Web searches: ${result.webSearchCount}, Discoveries saved: ${finalJob?.totalDiscoveries || 0}, ` +
      `Duplicates skipped: ${finalJob?.duplicatesSkipped || 0}, ` +
      `Tokens: in=${result.tokensIn} out=${result.tokensOut}, Cost: $${result.totalCostUsd.toFixed(4)} (${COST_BASIS_LABEL[result.costBasis]})`,
    );

    // Run16 BUG-028: an aborted run can resolve before the SDK reports any
    // usage (numTurns/cost all zero). Don't stamp zeros over the row in that
    // case — keep whatever accounting was last persisted instead of
    // manufacturing a "0 turns / $0.0000" contradiction next to real finds.
    const abortedWithNoUsage =
      result.aborted && result.numTurns === 0 && result.totalCostUsd === 0 &&
      result.tokensIn === 0 && result.tokensOut === 0;
    const finalStatus = finalStatusOf(result, stoppedAtTarget);
    // Reclaimed as orphaned mid-run: persist usage/log, keep the 'failed' verdict.
    const reclaimed = this.reclaimedJobs.has(jobId);
    const usageFields = abortedWithNoUsage ? {} : {
      turnsUsed: result.numTurns,
      totalInputTokens: result.tokensIn,
      totalOutputTokens: result.tokensOut,
      estimatedCostUsd: result.totalCostUsd.toFixed(4),
      costBasis: result.costBasis,
    };

    // Persist the terminal status FIRST via a small dedicated retried UPDATE.
    // Previously status rode along on the single heavyweight agentLog persist
    // below; if that one write was lost (wedged pool, autoscale instance
    // freeze at run end — observed on prod job 48) the job stayed
    // 'processing' forever. Status + usage are a few bytes — land them
    // before attempting the big log payload.
    let statusPersisted = false;
    for (let attempt = 1; attempt <= 3 && !statusPersisted; attempt++) {
      try {
        await withTimeout(
          db.update(researchJobs)
            .set({
              ...(reclaimed ? {} : {
                status: sql`case when ${researchJobs.status} = 'cancelled' then 'cancelled' else ${finalStatus} end`,
              }),
              completedAt: sql`coalesce(${researchJobs.completedAt}, now())`,
              ...usageFields,
            })
            .where(eq(researchJobs.id, jobId)),
          TOOL_DB_TIMEOUT_MS,
          'final status update',
        );
        statusPersisted = true;
      } catch (e: any) {
        logger.error({ jobId: jobId }, `final status update attempt ${attempt}/3 failed:`, e);
        if (attempt < 3) await sleep(1000 * attempt);
      }
    }

    logger[statusPersisted ? 'info' : 'error']('Research job finished', {
      jobId,
      status: reclaimed ? 'reclaimed' : finalStatus,
      discoveries: finalJob?.totalDiscoveries || 0,
      duplicates: finalJob?.duplicatesSkipped || 0,
      turns: result.numTurns,
      costUsd: Number(result.totalCostUsd.toFixed(4)),
      costBasis: result.costBasis,
      ...(statusPersisted ? {} : { reason: 'final status update failed after 3 attempts' }),
    });

    // Then the heavyweight agentLog snapshot. It re-asserts status/usage as
    // belt-and-braces in case all three dedicated attempts above failed.
    await persist({
      ...(reclaimed ? {} : { status: finalStatus }),
      ...usageFields,
      completedAt: new Date(),
    });
  }

  async cancelJob(jobId: number): Promise<void> {
    const [changed] = await db.update(researchJobs)
      .set({ status: 'cancelled', completedAt: new Date() })
      .where(and(eq(researchJobs.id, jobId), sql`${researchJobs.status} in ('pending', 'processing')`))
      .returning({ id: researchJobs.id });
    if (!changed) {
      const job = await this.getJob(jobId);
      if (!job) throw Object.assign(new Error('Job not found'), { name: 'JobNotFoundError' });
      if (job.status !== 'cancelled') throw Object.assign(new Error('Only active jobs can be cancelled'), { name: 'JobConflictError' });
    }
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) activeJob.abortController.abort();
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
  /**
   * The cheapest run that ended on its own and saved at least one discovery,
   * over the whole history (not just the listed window). Estimated costs
   * count; cancelled and failed runs report a lower-bound cost and do not.
   */
  async cheapestSavingRun(): Promise<{ costUsd: number; costBasis: CostBasis | null } | null> {
    // The column is text; legacy or hand-edited rows may not be numeric, and
    // a bare cast would fail the whole query. CASE keeps the cast from being
    // evaluated for rows that fail the plain-decimal guard.
    const cost = sql`(case when ${researchJobs.estimatedCostUsd} ~ '^[0-9]+([.][0-9]+)?$' then cast(${researchJobs.estimatedCostUsd} as numeric) end)`;
    const [row] = await db
      .select({ costUsd: researchJobs.estimatedCostUsd, costBasis: researchJobs.costBasis })
      .from(researchJobs)
      .where(and(
        inArray(researchJobs.status, ['completed', 'budget_stopped']),
        sql`${researchJobs.totalDiscoveries} > 0`,
        sql`${cost} > 0`,
      ))
      .orderBy(cost)
      .limit(1);
    return row ? { costUsd: Number(row.costUsd), costBasis: row.costBasis ?? null } : null;
  }

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

  /**
   * Approve one discovery: create its resource, publish it through the shared
   * publication helper (description gate, approvedAt/approvedBy/statusChangedAt
   * and the one 'approved' audit row naming the acting admin), auto-create any
   * implied sub-subcategory, mark the discovery approved and bump the job's
   * counter — ALL in one transaction. A failure at any step leaves no resource,
   * no taxonomy node and a still-pending discovery, so a retry can finish the
   * original approval. Public caches are invalidated only after commit.
   * Idempotent: re-approving an already-approved discovery returns it unchanged
   * (no second resource, no second counter increment).
   */
  async approveDiscovery(
    discoveryId: number,
    opts: { skipDuplicateCheck?: boolean; actorId?: string } = {},
  ): Promise<ResearchDiscovery> {
    let createdTaxonomyNode = false;
    const result = await withResourcePublication(async (tx) => {
    const [discovery] = await tx.select().from(researchDiscoveries).where(eq(researchDiscoveries.id, discoveryId)).for('update');
    if (!discovery) throw new DiscoveryNotFoundError();
    if (discovery.status === 'approved' && discovery.createdResourceId != null) return discovery;
    if (discovery.status !== 'pending_review') throw new DiscoveryConflictError();

    // Normalized dedup guard (July 30, 2026): the per-job unique index only
    // stops exact same-job repeats — a single approve could still create a
    // duplicate resource (http/https, www, tracking-param variants). Bulk
    // approve pre-checks with its own shared set, so it opts out here.
    if (!opts.skipDuplicateCheck) {
      const norm = normalizeUrl(discovery.url);
      const existingRows = await tx.select({ id: resources.id, url: resources.url }).from(resources);
      const dup = existingRows.find(r => normalizeUrl(r.url) === norm);
      if (dup) {
        throw new DiscoveryConflictError(`URL already exists in the database (resource #${dup.id}) — reject this discovery instead of approving it`);
      }
    }

    // F201: split any "Parent › Child" path the model returned (including
    // discoveries saved before the save-time split) into its own columns.
    const taxonomy = decodeResourceTextFields({
      category: discovery.suggestedCategory || '',
      subcategory: discovery.suggestedSubcategory || '',
      subSubcategory: discovery.suggestedSubSubcategory || '',
    });

    // Tx-backed taxonomy access: an auto-created node commits or rolls back
    // with the approval. Run21 R4-037: an uncontainable label is stored null.
    const taxonomyAccess = transactionalTaxonomyAccess(tx, () => { createdTaxonomyNode = true; });
    const contained = await ensureSubSubcategoryExists(
      taxonomyAccess,
      taxonomy.category,
      taxonomy.subcategory,
      taxonomy.subSubcategory,
    );

    const approvedFields = {
      // Task #248: decode again at approval so discoveries saved BEFORE the
      // save-time decode (pre-existing pending rows) still land clean.
      title: decodeHtmlEntities(discovery.title),
      url: discovery.url,
      description: decodeHtmlEntities(discovery.description || ''),
      category: taxonomy.category || 'Uncategorized',
      subcategory: taxonomy.subcategory || null,
      subSubcategory: contained ? taxonomy.subSubcategory || null : null,
    };
    const [pendingResource] = await tx.insert(resources).values({
      ...approvedFields,
      // Task #661: AI-approved resources land with a stored kind too.
      kind: classifyKindForStorage(approvedFields),
      status: 'pending',
      metadata: { source: 'ai_researcher', discoveryId: discovery.id, confidence: discovery.confidence },
    }).returning();

    await transitionResourceInTransaction(
      tx,
      pendingResource.id,
      { status: 'approved' },
      opts.actorId,
      {
        expectedStatus: 'pending',
        notes: `AI researcher approval: discovery #${discovery.id}${discovery.jobId ? ` (research job #${discovery.jobId})` : ''}`,
      },
    );

    const [updated] = await tx.update(researchDiscoveries).set({
      status: 'approved',
      approvedAt: new Date(),
      createdResourceId: pendingResource.id,
    }).where(and(eq(researchDiscoveries.id, discoveryId), eq(researchDiscoveries.status, 'pending_review'))).returning();
    if (!updated) throw new DiscoveryConflictError();

    if (discovery.jobId) {
      await tx.update(researchJobs)
        .set({ approvedDiscoveries: sql`${researchJobs.approvedDiscoveries} + 1` })
        .where(eq(researchJobs.id, discovery.jobId));
    }

    return updated;
    });
    if (createdTaxonomyNode) invalidatePublicCache('category-mutation');
    return result;
  }

  /**
   * Bulk-approve every pending discovery (optionally scoped to one job).
   * Sequential on purpose: approveDiscovery runs ensureSubSubcategoryExists,
   * which must not race against itself creating the same taxonomy node.
   * Discoveries whose URL already exists in resources (possible across
   * jobs — the unique index is per-job) are auto-rejected instead of creating
   * a duplicate resource row. Duplicate detection uses normalizeUrl so it
   * matches save-time dedup semantics (www/trailing-slash/case variants),
   * and the set is updated as the batch approves so intra-batch dupes are
   * caught too.
   */
  async approveAllPendingDiscoveries(jobId?: number, actorId?: string): Promise<{
    approved: number;
    skippedDuplicates: number;
    failed: Array<{ id: number; title: string; error: string }>;
  }> {
    const where = jobId != null
      ? and(eq(researchDiscoveries.status, 'pending_review'), eq(researchDiscoveries.jobId, jobId))
      : eq(researchDiscoveries.status, 'pending_review');
    const pending = await db
      .select({ id: researchDiscoveries.id, url: researchDiscoveries.url, title: researchDiscoveries.title })
      .from(researchDiscoveries)
      .where(where)
      .orderBy(researchDiscoveries.id);

    const existingRows = await db
      .select({ id: resources.id, url: resources.url })
      .from(resources);
    const existingByNormUrl = new Map<string, number>();
    for (const r of existingRows) {
      const norm = normalizeUrl(r.url);
      if (!existingByNormUrl.has(norm)) existingByNormUrl.set(norm, r.id);
    }

    let approved = 0;
    let skippedDuplicates = 0;
    const failed: Array<{ id: number; title: string; error: string }> = [];
    for (const row of pending) {
      try {
        const norm = normalizeUrl(row.url);
        const existingId = existingByNormUrl.get(norm);
        if (existingId !== undefined) {
          await this.rejectDiscovery(row.id, `Bulk approve: URL already exists in the database (resource #${existingId})`);
          skippedDuplicates++;
          continue;
        }
        const created = await this.approveDiscovery(row.id, { skipDuplicateCheck: true, actorId });
        if (created?.createdResourceId != null) {
          existingByNormUrl.set(norm, created.createdResourceId);
        }
        approved++;
      } catch (err: any) {
        logger.error(`[research] approve-all failed for discovery ${row.id}:`, err);
        failed.push({ id: row.id, title: row.title, error: String(err?.message || err).slice(0, 300) });
      }
    }
    return { approved, skippedDuplicates, failed };
  }

  async rejectDiscovery(discoveryId: number, reason?: string): Promise<ResearchDiscovery> {
    return db.transaction(async (tx) => {
    const [discovery] = await tx.select().from(researchDiscoveries).where(eq(researchDiscoveries.id, discoveryId)).for('update');
    if (!discovery) throw new DiscoveryNotFoundError();
    if (discovery.status === 'rejected') return discovery;
    if (discovery.status !== 'pending_review') throw new DiscoveryConflictError();
    const [updated] = await tx.update(researchDiscoveries).set({
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: reason || null,
    }).where(and(eq(researchDiscoveries.id, discoveryId), eq(researchDiscoveries.status, 'pending_review'))).returning();

    if (!updated) throw new DiscoveryNotFoundError();
    if (updated.jobId) {
      await tx.update(researchJobs)
        .set({ rejectedDiscoveries: sql`${researchJobs.rejectedDiscoveries} + 1` })
        .where(eq(researchJobs.id, updated.jobId));
    }

    return updated;
    });
  }

  isJobActive(jobId: number): boolean {
    return this.activeJobs.has(jobId);
  }

  // Orphan watchdog exclusion: ids owned by a live in-process run. Research
  // runs (especially unlimited ones) routinely exceed any age threshold, so
  // the periodic sweep must never flip a job that is still actively running.
  getActiveJobIds(): number[] {
    return [...this.activeJobs.keys()];
  }
}

export const researchService = ResearchService.getInstance();
