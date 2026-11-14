import { db } from "../db";
import { enrichmentJobs, githubSyncQueue, researchJobs } from "@shared/schema";
import { and, eq, inArray, notInArray, lt, or, sql } from "drizzle-orm";
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
  // metadata.heartbeatAt at its progress points, so the last sign of life is the
  // newer of the two. Rows written before that change have neither key and keep
  // the old rule: created_at older than the cutoff.
  // Only ISO-shaped strings are cast; anything else counts as absent, so one
  // malformed value cannot abort the sweep. A metadata that is not an object
  // yields null from ->>, so it falls back to created_at.
  const isoOrNull = (key: string) =>
    sql`(CASE WHEN ${githubSyncQueue.metadata}->>${sql.raw("'" + key + "'")} ~ '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])T([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(\\.\\d+)?(Z|[+-]\\d{2}:?\\d{2})$' THEN ${githubSyncQueue.metadata}->>${sql.raw("'" + key + "'")} END)`;
  const lastSignOfLife = sql`coalesce(${isoOrNull('heartbeatAt')}, ${isoOrNull('processingStartedAt')})`;
  const stalePendingCutoff = new Date(Date.now() - STALE_PENDING_THRESHOLD_MS);
  const gConditions = [
    or(
      and(
        inArray(githubSyncQueue.status, ['processing']),
        or(
          and(
            sql`${lastSignOfLife} is not null`,
            sql`(${lastSignOfLife})::timestamptz < ${cutoff.toISOString()}::timestamptz`,
          ),
          and(
            sql`${lastSignOfLife} is null`,
            lt(githubSyncQueue.createdAt, cutoff),
          ),
        ),
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

// The boot sweep has no exclusions, so it cannot know which rows this process
// owns. github_sync_queue has no liveness columns, so a sync records its own in
// the row's metadata jsonb: processingStartedAt when GithubSyncRepository marks
// it 'processing', heartbeatAt refreshed (at most every 30 s, no timer) by
// syncService at each imported item and export step. A sibling instance's
// running sync keeps a fresh heartbeat and is left alone; a row whose worker
// died stops beating and is failed once its last sign of life is older than the
// cutoff. Rows written before this change carry neither key and are judged by
// created_at as before. An import started through the admin route that does not
// pass its queueId has no heartbeat, so only its processingStartedAt counts.
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
