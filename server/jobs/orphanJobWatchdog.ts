import { db, pool } from "../db";
import { enrichmentJobs, githubSyncQueue, researchJobs } from "@shared/schema";
import { and, eq, inArray, notInArray, lt, or } from "drizzle-orm";
import { isJobOrphaned, livenessUnchangedSince, ORPHANED_BY_RESTART_MESSAGE } from "../ai/jobLiveness";
import { closeOutEnrichmentQueue } from "../repositories/EnrichmentRepository";
import { createLogger } from "../lib/logger";
import { runWithJobContext } from "../ops/requestContext";
import { isServingTraffic } from "../ops/serviceActivity";

const logger = createLogger("job-watchdog");

// GitHub sync queue rows have no worker liveness columns; they keep the
// fixed age threshold. AI jobs (enrichment/research) use worker liveness
// (server/ai/jobLiveness.ts) instead — see sweepOrphanedJobs.
const ORPHAN_THRESHOLD_MS = 5 * 60 * 1000;
// Run15 BUG-011 prod follow-up: 'pending' queue rows are legitimate short-term
// backlog (never age-swept at 5 min), but rows pending for over a week were
// abandoned by a dead worker or a long-gone admin session and would otherwise
// sit "in progress" in the admin GitHub tab forever. 7 days is far beyond any
// real processing delay (the queue is drained on demand within minutes).
const STALE_PENDING_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export interface OrphanSweepResult {
  enrichmentJobsFailed: number;
  githubSyncQueueFailed: number;
  researchJobsFailed: number;
  cutoff: Date;
}

// Run15 BUG-011 follow-up (architect review): ids currently owned by a live
// in-process worker. startedAt/createdAt are written once — long enrichment
// runs and sync imports routinely exceed the 5-minute threshold, so an
// age-only periodic sweep would falsely fail genuine in-flight jobs. Owned
// ids are excluded; truly orphaned rows (worker died, registry empty) still
// match.
export interface OrphanSweepExclusions {
  enrichmentJobIds?: number[];
  syncQueueIds?: number[];
  researchJobIds?: number[];
}

export async function sweepOrphanedJobs(
  thresholdMs = ORPHAN_THRESHOLD_MS,
  exclude: OrphanSweepExclusions = {},
): Promise<OrphanSweepResult> {
  const cutoff = new Date(Date.now() - thresholdMs);
  const liveEnrichmentIds = new Set(exclude.enrichmentJobIds ?? []);
  const liveSyncIds = exclude.syncQueueIds ?? [];
  const now = Date.now();

  // AI jobs: decided by worker liveness, not age. A row whose owner process
  // is provably dead (same container, pid gone — i.e. a restart) is reclaimed
  // on the very next sweep, including the boot sweep; a row owned by a live
  // sibling instance is kept as long as its heartbeat is fresh. Rows written
  // before liveness tracking keep the old 5-minute age rule. Ids owned by a
  // live in-process worker are never touched. Each flip is a guarded
  // per-row UPDATE so a row that finished meanwhile is left alone.
  const enrichmentActive = await db
    .select({
      id: enrichmentJobs.id,
      workerId: enrichmentJobs.workerId,
      heartbeatAt: enrichmentJobs.heartbeatAt,
      startedAt: enrichmentJobs.startedAt,
      createdAt: enrichmentJobs.createdAt,
    })
    .from(enrichmentJobs)
    .where(inArray(enrichmentJobs.status, ['pending', 'processing']));
  let enrichmentFailed = 0;
  for (const row of enrichmentActive) {
    if (!isJobOrphaned(row, liveEnrichmentIds.has(row.id), now)) continue;
    const flipped = await db.transaction(async (tx) => {
      const [hit] = await tx
        .update(enrichmentJobs)
        .set({ status: 'failed', errorMessage: ORPHANED_BY_RESTART_MESSAGE, completedAt: new Date(), updatedAt: new Date() })
        .where(and(
          eq(enrichmentJobs.id, row.id),
          inArray(enrichmentJobs.status, ['pending', 'processing']),
          livenessUnchangedSince(enrichmentJobs, row),
        ))
        .returning({ id: enrichmentJobs.id });
      // Its never-processed queue rows must not keep reading as queued work.
      if (hit) await closeOutEnrichmentQueue(tx, row.id, 'Not processed: the job was orphaned by a server restart');
      return !!hit;
    });
    if (flipped) enrichmentFailed++;
  }

  // Queue rows: only flip 'processing' rows whose start predates the cutoff —
  // those are the genuine orphans whose worker died. 'pending' rows are a
  // legitimate backlog and must NOT be failed just because no worker has
  // picked them up yet (architect review: avoid failing untouched backlog by age).
  const stalePendingCutoff = new Date(Date.now() - STALE_PENDING_THRESHOLD_MS);
  const gConditions = [
    or(
      and(
        inArray(githubSyncQueue.status, ['processing']),
        lt(githubSyncQueue.createdAt, cutoff),
      ),
      // Abandoned backlog: pending for over a week is never legitimate.
      and(
        inArray(githubSyncQueue.status, ['pending']),
        lt(githubSyncQueue.createdAt, stalePendingCutoff),
      ),
    ),
  ];
  if (liveSyncIds.length > 0) {
    gConditions.push(notInArray(githubSyncQueue.id, liveSyncIds));
  }

  const gResult = await db
    .update(githubSyncQueue)
    .set({
      status: 'failed',
      errorMessage: ORPHANED_BY_RESTART_MESSAGE,
      processedAt: new Date(),
    })
    .where(and(...gConditions))
    .returning({ id: githubSyncQueue.id });

  // Research jobs: a server restart mid-run would otherwise strand a job in
  // 'processing' forever (the SDK subprocess dies with the server, so no cost
  // accrues, but the row never resolves). Same liveness rules as enrichment;
  // unlimited runs legitimately run for hours, so age alone never decides.
  const liveResearchIds = new Set(exclude.researchJobIds ?? []);
  const researchActive = await db
    .select({
      id: researchJobs.id,
      workerId: researchJobs.workerId,
      heartbeatAt: researchJobs.heartbeatAt,
      startedAt: researchJobs.startedAt,
      createdAt: researchJobs.createdAt,
    })
    .from(researchJobs)
    .where(inArray(researchJobs.status, ['pending', 'processing']));
  let researchFailed = 0;
  for (const row of researchActive) {
    if (!isJobOrphaned(row, liveResearchIds.has(row.id), now)) continue;
    const [hit] = await db
      .update(researchJobs)
      .set({ status: 'failed', errorMessage: ORPHANED_BY_RESTART_MESSAGE, completedAt: new Date() })
      .where(and(
        eq(researchJobs.id, row.id),
        inArray(researchJobs.status, ['pending', 'processing']),
        livenessUnchangedSince(researchJobs, row),
      ))
      .returning({ id: researchJobs.id });
    if (hit) researchFailed++;
  }

  return {
    enrichmentJobsFailed: enrichmentFailed,
    githubSyncQueueFailed: gResult.length,
    researchJobsFailed: researchFailed,
    cutoff,
  };
}

export const runOrphanWatchdogStartup = (): Promise<void> =>
  runWithJobContext('orphan-watchdog', 'startup', runStartupSweep);

async function runStartupSweep(): Promise<void> {
  try {
    const r = await sweepOrphanedJobs();
    if (r.enrichmentJobsFailed > 0 || r.githubSyncQueueFailed > 0 || r.researchJobsFailed > 0) {
      logger.info(
        `🧹 Orphan watchdog: flipped ${r.enrichmentJobsFailed} enrichment_jobs + ${r.githubSyncQueueFailed} github_sync_queue + ${r.researchJobsFailed} research_jobs rows to failed (AI jobs: owner worker gone; sync queue: older than ${r.cutoff.toISOString()})`,
      );
    } else {
      logger.info('✅ Orphan watchdog: no stuck jobs found');
    }
  } catch (err) {
    logger.error('❌ Orphan watchdog failed (non-fatal):', err);
  }
}

// Run15 BUG-011: the startup sweep only catches jobs orphaned BEFORE the
// current boot. A worker that dies mid-run while the server stays up (e.g.
// unhandled rejection inside the GitHub sync loop) left rows in 'processing'
// forever, so the admin GitHub tab showed perpetual in-progress jobs. Sweep
// periodically too. AI jobs are judged by worker liveness (a dead owner or a
// heartbeat stale for >45 s), so the sweep runs every minute to reclaim them
// promptly; the GitHub queue keeps its 5-minute age threshold.
// The periodic sweep excludes ids owned by live in-process workers (architect
// review: a genuine enrichment run regularly exceeds 5 minutes and startedAt
// is never refreshed — without the exclusion every real run would be flipped
// to failed mid-flight). The startup sweep needs no exclusion: at boot no
// worker has started yet, so nothing is legitimately owned.
const PERIODIC_SWEEP_INTERVAL_MS = 60 * 1000;
let periodicTimer: NodeJS.Timeout | null = null;
// A cold sweep reconnects every minute and the pool's connect timeout
// sometimes loses: retry once, and call it an ERROR only after repeated misses.
const RETRY_DELAY_MS = 1000;
const ERROR_AFTER_CONSECUTIVE_FAILURES = 3;
let consecutiveFailures = 0;

const CONNECTION_TIMEOUT = /connection terminated due to connection timeout|timeout exceeded when trying to connect/i;
const MAX_CAUSE_DEPTH = 5;

/** Drizzle wraps the pg error in `.cause`, so walk the chain. */
export function isConnectionTimeout(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    if (CONNECTION_TIMEOUT.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}

async function runPeriodicSweep(): Promise<OrphanSweepResult> {
  // Dynamic imports keep the watchdog free of load-order coupling.
  const [{ enrichmentService }, { syncService }, { researchService }] = await Promise.all([
    import('../ai/enrichmentService'),
    import('../github/syncService'),
    import('../ai/researchService'),
  ]);
  const sweep = () =>
    sweepOrphanedJobs(undefined, {
      enrichmentJobIds: enrichmentService.getActiveJobIds(),
      syncQueueIds: syncService.getActiveQueueIds(),
      researchJobIds: researchService.getActiveJobIds(),
    });
  try {
    return await sweep();
  } catch (err) {
    if (!isConnectionTimeout(err)) throw err;
    const atTimeout = poolState();
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    let result: OrphanSweepResult;
    try {
      result = await sweep();
    } catch (retryErr) {
      if (typeof retryErr === 'object' && retryErr !== null) retryFailures.add(retryErr);
      throw retryErr;
    }
    logger.warn('Orphan watchdog periodic sweep hit a connect timeout; the retry succeeded', atTimeout);
    return result;
  }
}

/** Errors thrown by the retry: the failure log marks them retried without wrapping, so the pg error stays readable. */
const retryFailures = new WeakSet<object>();

function poolState() {
  return { poolTotal: pool.totalCount, poolIdle: pool.idleCount, poolWaiting: pool.waitingCount };
}

function reportSweepFailure(err: unknown): void {
  consecutiveFailures += 1;
  const details = {
    consecutiveFailures,
    retried: typeof err === 'object' && err !== null && retryFailures.has(err),
    ...poolState(),
  };
  const message = 'Orphan watchdog periodic sweep failed (non-fatal):';
  if (consecutiveFailures >= ERROR_AFTER_CONSECUTIVE_FAILURES) logger.error(message, err, details);
  else logger.warn(message, err, details);
}

export function startOrphanWatchdogPeriodic(): void {
  if (periodicTimer) return; // idempotent — never double-schedule
  periodicTimer = setInterval(() => void runWithJobContext('orphan-watchdog', 'periodic', async () => {
    if (!isServingTraffic()) return;
    try {
      const r = await runPeriodicSweep();
      consecutiveFailures = 0;
      if (r.enrichmentJobsFailed > 0 || r.githubSyncQueueFailed > 0 || r.researchJobsFailed > 0) {
        logger.info(
          `🧹 Orphan watchdog (periodic): flipped ${r.enrichmentJobsFailed} enrichment_jobs + ${r.githubSyncQueueFailed} github_sync_queue + ${r.researchJobsFailed} research_jobs rows to failed`,
        );
      }
    } catch (err) {
      reportSweepFailure(err);
    }
  }), PERIODIC_SWEEP_INTERVAL_MS);
  // Never keep the process alive just for the watchdog.
  periodicTimer.unref?.();
}
