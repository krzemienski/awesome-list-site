import { db } from "../db";
import { enrichmentJobs, githubSyncQueue, researchJobs } from "@shared/schema";
import { sql, and, inArray, notInArray, lt, or, isNull } from "drizzle-orm";

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
  const liveEnrichmentIds = exclude.enrichmentJobIds ?? [];
  const liveSyncIds = exclude.syncQueueIds ?? [];

  const eConditions = [
    inArray(enrichmentJobs.status, ['pending', 'processing']),
    or(
      and(isNull(enrichmentJobs.startedAt), lt(enrichmentJobs.createdAt, cutoff)),
      lt(enrichmentJobs.startedAt, cutoff),
    ),
  ];
  if (liveEnrichmentIds.length > 0) {
    eConditions.push(notInArray(enrichmentJobs.id, liveEnrichmentIds));
  }

  const eResult = await db
    .update(enrichmentJobs)
    .set({
      status: 'failed',
      errorMessage: 'Orphaned by server restart',
      completedAt: new Date(),
    })
    .where(and(...eConditions))
    .returning({ id: enrichmentJobs.id });

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
      errorMessage: 'Orphaned by server restart',
      processedAt: new Date(),
    })
    .where(and(...gConditions))
    .returning({ id: githubSyncQueue.id });

  // Research jobs: now that budget/turns can be unlimited (July 24, 2026),
  // a server restart mid-run would otherwise strand a job in 'processing'
  // forever (the SDK subprocess dies with the server, so no cost accrues,
  // but the row never resolves). Same rules as enrichment: only flip rows
  // older than the cutoff and never flip ids owned by a live in-process run
  // (unlimited runs legitimately exceed any age threshold).
  const rConditions = [
    inArray(researchJobs.status, ['pending', 'processing']),
    or(
      and(isNull(researchJobs.startedAt), lt(researchJobs.createdAt, cutoff)),
      lt(researchJobs.startedAt, cutoff),
    ),
  ];
  const liveResearchIds = exclude.researchJobIds ?? [];
  if (liveResearchIds.length > 0) {
    rConditions.push(notInArray(researchJobs.id, liveResearchIds));
  }

  const rResult = await db
    .update(researchJobs)
    .set({
      status: 'failed',
      errorMessage: 'Orphaned by server restart',
      completedAt: new Date(),
    })
    .where(and(...rConditions))
    .returning({ id: researchJobs.id });

  return {
    enrichmentJobsFailed: eResult.length,
    githubSyncQueueFailed: gResult.length,
    researchJobsFailed: rResult.length,
    cutoff,
  };
}

export async function runOrphanWatchdogStartup(): Promise<void> {
  try {
    const r = await sweepOrphanedJobs();
    if (r.enrichmentJobsFailed > 0 || r.githubSyncQueueFailed > 0 || r.researchJobsFailed > 0) {
      console.log(
        `🧹 Orphan watchdog: flipped ${r.enrichmentJobsFailed} enrichment_jobs + ${r.githubSyncQueueFailed} github_sync_queue + ${r.researchJobsFailed} research_jobs rows to failed (older than ${r.cutoff.toISOString()})`,
      );
    } else {
      console.log('✅ Orphan watchdog: no stuck jobs found');
    }
  } catch (err: any) {
    console.error('❌ Orphan watchdog failed (non-fatal):', err?.message || err);
  }
}

// Run15 BUG-011: the startup sweep only catches jobs orphaned BEFORE the
// current boot. A worker that dies mid-run while the server stays up (e.g.
// unhandled rejection inside the GitHub sync loop) left rows in 'processing'
// forever, so the admin GitHub tab showed perpetual in-progress jobs. Sweep
// periodically too — same 5-minute orphan threshold, checked every 5 minutes.
// The periodic sweep excludes ids owned by live in-process workers (architect
// review: a genuine enrichment run regularly exceeds 5 minutes and startedAt
// is never refreshed — without the exclusion every real run would be flipped
// to failed mid-flight). The startup sweep needs no exclusion: at boot no
// worker has started yet, so nothing is legitimately owned.
const PERIODIC_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let periodicTimer: NodeJS.Timeout | null = null;

export function startOrphanWatchdogPeriodic(): void {
  if (periodicTimer) return; // idempotent — never double-schedule
  periodicTimer = setInterval(async () => {
    try {
      // Dynamic imports keep the watchdog free of load-order coupling.
      const [{ enrichmentService }, { syncService }, { researchService }] = await Promise.all([
        import('../ai/enrichmentService'),
        import('../github/syncService'),
        import('../ai/researchService'),
      ]);
      const r = await sweepOrphanedJobs(undefined, {
        enrichmentJobIds: enrichmentService.getActiveJobIds(),
        syncQueueIds: syncService.getActiveQueueIds(),
        researchJobIds: researchService.getActiveJobIds(),
      });
      if (r.enrichmentJobsFailed > 0 || r.githubSyncQueueFailed > 0 || r.researchJobsFailed > 0) {
        console.log(
          `🧹 Orphan watchdog (periodic): flipped ${r.enrichmentJobsFailed} enrichment_jobs + ${r.githubSyncQueueFailed} github_sync_queue + ${r.researchJobsFailed} research_jobs rows to failed`,
        );
      }
    } catch (err: any) {
      console.error('❌ Orphan watchdog periodic sweep failed (non-fatal):', err?.message || err);
    }
  }, PERIODIC_SWEEP_INTERVAL_MS);
  // Never keep the process alive just for the watchdog.
  periodicTimer.unref?.();
}
