import { db } from "../db";
import { enrichmentJobs, githubSyncQueue, researchJobs } from "@shared/schema";
import { and, eq, inArray, notInArray, lt, sql } from "drizzle-orm";
import { isJobOrphaned, livenessUnchangedSince, ORPHANED_BY_RESTART_MESSAGE } from "../ai/jobLiveness";
import { closeOutEnrichmentQueue } from "../repositories/EnrichmentRepository";
import { createLogger } from "../lib/logger";
import { runWithJobContext } from "../ops/requestContext";

const logger = createLogger("job-watchdog");

// GitHub sync queue rows have no worker liveness columns; they keep the
// fixed age threshold, measured from their last metadata heartbeat (see
// runStartupSweep). AI jobs (enrichment/research) use worker liveness
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

// Epoch ms of a sync's last sign of life from its queue-row metadata:
// heartbeatAt, else processingStartedAt. Only strings in the exact toISOString
// form the writer uses count; anything else (missing, non-string, another
// format, an impossible date that Date.parse would roll over, metadata that is
// not an object) is absent.
function lastSyncSignOfLife(metadata: unknown): number | undefined {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return undefined;
  const fields = metadata as Record<string, unknown>;
  for (const key of ['heartbeatAt', 'processingStartedAt']) {
    const value = fields[key];
    if (typeof value !== 'string') continue;
    const ms = Date.parse(value);
    if (Number.isFinite(ms) && new Date(ms).toISOString() === value) return ms;
  }
  return undefined;
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

  // Queue rows: only flip 'processing' rows that have shown no sign of life
  // since the cutoff — those are the genuine orphans whose worker died.
  // 'pending' rows are a legitimate backlog and must NOT be failed just because
  // no worker has picked them up yet (architect review: avoid failing untouched
  // backlog by age).
  // A sync records metadata.processingStartedAt when it starts and refreshes
  // metadata.heartbeatAt at its progress points, so the last sign of life is
  // heartbeatAt, else processingStartedAt. Rows written before that change have
  // neither key and keep the old rule: created_at older than the cutoff.
  // The metadata is caller-supplied JSON (the import routes store the request's
  // options as it), so the timestamps are parsed here, not cast in SQL, where one
  // impossible value would abort the whole statement. A value that is not a
  // string, or is not an exact ISO timestamp, counts as absent; a metadata
  // that is not an object has no keys, so it falls back to created_at.
  const stalePendingCutoff = new Date(Date.now() - STALE_PENDING_THRESHOLD_MS);
  const gCandidateConditions = [eq(githubSyncQueue.status, 'processing')];
  if (liveSyncIds.length > 0) {
    gCandidateConditions.push(notInArray(githubSyncQueue.id, liveSyncIds));
  }
  const gCandidates = await db
    .select({
      id: githubSyncQueue.id,
      metadata: githubSyncQueue.metadata,
      heartbeatText: sql<string | null>`${githubSyncQueue.metadata}->>'heartbeatAt'`,
      createdAt: githubSyncQueue.createdAt,
    })
    .from(githubSyncQueue)
    .where(and(...gCandidateConditions));

  const failedValues = {
    status: 'failed',
    errorMessage: ORPHANED_BY_RESTART_MESSAGE,
    processedAt: new Date(),
  };
  let syncFailed = 0;
  for (const row of gCandidates) {
    const lastSignOfLife = lastSyncSignOfLife(row.metadata) ?? row.createdAt?.getTime();
    // A row with no usable time at all (null created_at) is left alone.
    if (lastSignOfLife === undefined || lastSignOfLife >= cutoff.getTime()) continue;
    // Per-row UPDATE guarded by the heartbeat text read above (text compare, no
    // cast): a sync that finished, or beat, since the select keeps its row. A
    // failure on one row is logged and must not skip the rest of the sweep.
    try {
      const hit = await db
        .update(githubSyncQueue)
        .set(failedValues)
        .where(and(
          eq(githubSyncQueue.id, row.id),
          eq(githubSyncQueue.status, 'processing'),
          sql`${githubSyncQueue.metadata}->>'heartbeatAt' IS NOT DISTINCT FROM ${row.heartbeatText}`,
        ))
        .returning({ id: githubSyncQueue.id });
      syncFailed += hit.length;
    } catch (err) {
      logger.warn(`Orphan watchdog: could not fail github_sync_queue row ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // Abandoned backlog: pending for over a week is never legitimate. Decided by
  // condition, not by an id list, so no ids are expanded into bind parameters.
  const pendingConditions = [
    eq(githubSyncQueue.status, 'pending'),
    lt(githubSyncQueue.createdAt, stalePendingCutoff),
  ];
  if (liveSyncIds.length > 0) {
    pendingConditions.push(notInArray(githubSyncQueue.id, liveSyncIds));
  }
  const pendingHit = await db
    .update(githubSyncQueue)
    .set(failedValues)
    .where(and(...pendingConditions))
    .returning({ id: githubSyncQueue.id });
  syncFailed += pendingHit.length;

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
    githubSyncQueueFailed: syncFailed,
    researchJobsFailed: researchFailed,
    cutoff,
  };
}

export const runOrphanWatchdogStartup = (): Promise<void> =>
  runWithJobContext('orphan-watchdog', 'startup', runStartupSweep);

// The boot sweep has no exclusions, so it cannot know which rows this process
// owns. github_sync_queue has no liveness columns, so a sync records its own in
// the row's metadata jsonb: processingStartedAt when GithubSyncRepository marks
// it 'processing', heartbeatAt refreshed (at most every 30 s, no timer) by
// syncService at each imported item and export step. A sibling instance's
// running sync keeps a fresh heartbeat and is left alone; a row whose worker
// died stops beating and is failed once its last sign of life is older than the
// cutoff. Rows written before this change carry neither key and are judged by
// created_at as before.
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
