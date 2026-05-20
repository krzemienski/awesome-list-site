import { db } from "../db";
import { enrichmentJobs, githubSyncQueue } from "@shared/schema";
import { sql, and, inArray, lt, or, isNull } from "drizzle-orm";

const ORPHAN_THRESHOLD_MS = 5 * 60 * 1000;

export interface OrphanSweepResult {
  enrichmentJobsFailed: number;
  githubSyncQueueFailed: number;
  cutoff: Date;
}

export async function sweepOrphanedJobs(thresholdMs = ORPHAN_THRESHOLD_MS): Promise<OrphanSweepResult> {
  const cutoff = new Date(Date.now() - thresholdMs);

  const eResult = await db
    .update(enrichmentJobs)
    .set({
      status: 'failed',
      errorMessage: 'Orphaned by server restart',
      completedAt: new Date(),
    })
    .where(
      and(
        inArray(enrichmentJobs.status, ['pending', 'processing']),
        or(
          and(isNull(enrichmentJobs.startedAt), lt(enrichmentJobs.createdAt, cutoff)),
          lt(enrichmentJobs.startedAt, cutoff),
        ),
      ),
    )
    .returning({ id: enrichmentJobs.id });

  // Queue rows: only flip 'processing' rows whose start predates the cutoff —
  // those are the genuine orphans whose worker died. 'pending' rows are a
  // legitimate backlog and must NOT be failed just because no worker has
  // picked them up yet (architect review: avoid failing untouched backlog by age).
  const gResult = await db
    .update(githubSyncQueue)
    .set({
      status: 'failed',
      errorMessage: 'Orphaned by server restart',
      processedAt: new Date(),
    })
    .where(
      and(
        inArray(githubSyncQueue.status, ['processing']),
        lt(githubSyncQueue.createdAt, cutoff),
      ),
    )
    .returning({ id: githubSyncQueue.id });

  return {
    enrichmentJobsFailed: eResult.length,
    githubSyncQueueFailed: gResult.length,
    cutoff,
  };
}

export async function runOrphanWatchdogStartup(): Promise<void> {
  try {
    const r = await sweepOrphanedJobs();
    if (r.enrichmentJobsFailed > 0 || r.githubSyncQueueFailed > 0) {
      console.log(
        `🧹 Orphan watchdog: flipped ${r.enrichmentJobsFailed} enrichment_jobs + ${r.githubSyncQueueFailed} github_sync_queue rows to failed (older than ${r.cutoff.toISOString()})`,
      );
    } else {
      console.log('✅ Orphan watchdog: no stuck jobs found');
    }
  } catch (err: any) {
    console.error('❌ Orphan watchdog failed (non-fatal):', err?.message || err);
  }
}
