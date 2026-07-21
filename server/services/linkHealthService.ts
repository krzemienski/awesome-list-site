import type { LinkHealthJob, LinkHealthCheck, LinkHealthJobRow, LinkHealthCheckRow } from "@shared/schema";
import { linkHealthJobs, linkHealthChecks } from "@shared/schema";
import { db } from "../db";
import { desc, eq, ne, and, inArray, lt } from "drizzle-orm";
import { storage } from "../storage";
import { checkResourceLinks, type LinkCheckResult } from "../validation/linkChecker";

function mapResultToStatus(result: LinkCheckResult): LinkHealthCheck['status'] {
  // 200-at-face-value but takeover/intent-flip/parked heuristics fired:
  // surface for review instead of counting as healthy (R4-001/023 class).
  if (result.valid && result.suspicion) return 'suspect';
  if (result.valid) return 'healthy';
  if (result.statusText === 'Timeout') return 'timeout';
  if (result.statusText === 'DNS Not Found') return 'dns_failure';
  if (result.redirectUrl) return 'redirect';
  return 'broken';
}

function jobRowToApi(row: LinkHealthJobRow): LinkHealthJob {
  return {
    id: row.id,
    status: row.status as LinkHealthJob['status'],
    totalLinks: row.totalLinks,
    checkedLinks: row.checkedLinks,
    healthyLinks: row.healthyLinks,
    brokenLinks: row.brokenLinks,
    redirectLinks: row.redirectLinks,
    timeoutLinks: row.timeoutLinks,
    suspectLinks: row.suspectLinks,
    errorMessage: row.errorMessage ?? undefined,
    startedAt: row.startedAt?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function checkRowToApi(row: LinkHealthCheckRow): LinkHealthCheck {
  return {
    id: row.id,
    resourceId: row.resourceId,
    url: row.url,
    status: row.status as LinkHealthCheck['status'],
    httpStatus: row.httpStatus ?? undefined,
    responseTime: row.responseTime ?? undefined,
    redirectUrl: row.redirectUrl ?? undefined,
    finalUrl: row.finalUrl ?? undefined,
    errorMessage: row.errorMessage ?? undefined,
    consecutiveFailures: row.consecutiveFailures,
    flaggedForReview: row.flaggedForReview,
    lastCheckedAt: row.lastCheckedAt.toISOString(),
  };
}

export const linkHealthService = {
  /**
   * Boot-time recovery: any job left in 'pending'/'processing' by a server
   * restart can never finish (the background loop died with the process),
   * so mark it failed instead of letting it linger as an eternal
   * "processing" that also blocks new scans.
   */
  async recoverInterruptedJobs(): Promise<void> {
    const interrupted = await db
      .update(linkHealthJobs)
      .set({
        status: 'failed',
        errorMessage: 'Interrupted by server restart',
        completedAt: new Date(),
      })
      .where(inArray(linkHealthJobs.status, ['pending', 'processing']))
      .returning({ id: linkHealthJobs.id });
    if (interrupted.length > 0) {
      console.log(`[LinkHealth] Marked ${interrupted.length} interrupted job(s) as failed after restart: ${interrupted.map(j => j.id).join(', ')}`);
    }
  },

  async getLatestJob(): Promise<LinkHealthJob | null> {
    const [row] = await db
      .select()
      .from(linkHealthJobs)
      .orderBy(desc(linkHealthJobs.id))
      .limit(1);
    return row ? jobRowToApi(row) : null;
  },

  async getJobHistory(): Promise<LinkHealthJob[]> {
    const rows = await db
      .select()
      .from(linkHealthJobs)
      .orderBy(desc(linkHealthJobs.id))
      .limit(50);
    return rows.map(jobRowToApi);
  },

  async getBrokenLinks(filter?: string): Promise<LinkHealthCheck[]> {
    // Problem links belong to the latest completed scan (checks of older
    // jobs are pruned on completion, but scope by jobId anyway for safety).
    const [latestCompleted] = await db
      .select({ id: linkHealthJobs.id })
      .from(linkHealthJobs)
      .where(eq(linkHealthJobs.status, 'completed'))
      .orderBy(desc(linkHealthJobs.id))
      .limit(1);
    if (!latestCompleted) return [];

    const conditions = [
      eq(linkHealthChecks.jobId, latestCompleted.id),
      ne(linkHealthChecks.status, 'healthy'),
    ];
    if (filter && filter !== 'all') {
      conditions.push(eq(linkHealthChecks.status, filter));
    }
    const rows = await db
      .select()
      .from(linkHealthChecks)
      .where(and(...conditions));
    return rows.map(checkRowToApi);
  },

  async startCheck(): Promise<LinkHealthJob> {
    const [activeJob] = await db
      .select({ id: linkHealthJobs.id })
      .from(linkHealthJobs)
      .where(inArray(linkHealthJobs.status, ['pending', 'processing']))
      .limit(1);
    if (activeJob) {
      throw new Error('A link health check is already running');
    }

    const [row] = await db
      .insert(linkHealthJobs)
      .values({ status: 'processing', startedAt: new Date() })
      .returning();

    this.runCheckInBackground(row.id).catch(err => {
      console.error('[LinkHealth] Background check failed:', err);
    });

    return jobRowToApi(row);
  },

  async runCheckInBackground(jobId: number): Promise<void> {
    try {
      const resources = await storage.getAllApprovedResources();
      const resourcesToCheck = resources.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url
      }));

      await db
        .update(linkHealthJobs)
        .set({ totalLinks: resourcesToCheck.length })
        .where(eq(linkHealthJobs.id, jobId));

      // R5-008 (run24): persist incremental progress after every batch so
      // /status reflects a moving checkedLinks count during the ~20-minute
      // sweep instead of 0 until the final commit. Throttled to ~1 write/2s.
      let lastProgressWrite = 0;
      const report = await checkResourceLinks(resourcesToCheck, {
        timeout: 15000,
        concurrent: 10,
        retryCount: 1,
        onProgress: (checked) => {
          const now = Date.now();
          if (now - lastProgressWrite >= 2000) {
            lastProgressWrite = now;
            db.update(linkHealthJobs)
              .set({ checkedLinks: checked })
              .where(and(eq(linkHealthJobs.id, jobId), eq(linkHealthJobs.status, 'processing')))
              .catch(err => console.error('[LinkHealth] Progress write failed:', err.message));
          }
        }
      });

      // If the job was cancelled while the sweep ran, don't overwrite that.
      const [current] = await db
        .select({ status: linkHealthJobs.status })
        .from(linkHealthJobs)
        .where(eq(linkHealthJobs.id, jobId));
      if (!current || current.status !== 'processing') {
        console.log(`[LinkHealth] Job ${jobId} is no longer processing (${current?.status ?? 'gone'}); discarding results`);
        return;
      }

      const checkRows = report.results.map(result => {
        const status = mapResultToStatus(result);
        return {
          jobId,
          resourceId: result.resourceId || 0,
          url: result.url,
          status,
          httpStatus: result.status,
          responseTime: result.responseTime,
          redirectUrl: result.redirectUrl,
          finalUrl: result.finalUrl,
          errorMessage: result.suspicionDetail || result.error,
          consecutiveFailures: status === 'healthy' ? 0 : 1,
          flaggedForReview: status === 'broken' || status === 'dns_failure' || status === 'suspect',
          lastCheckedAt: new Date(),
        };
      });

      // Insert in chunks to stay well under Postgres parameter limits.
      const CHUNK = 500;
      for (let i = 0; i < checkRows.length; i += CHUNK) {
        await db.insert(linkHealthChecks).values(checkRows.slice(i, i + CHUNK));
      }

      const suspectCount = report.results.filter(r => r.valid && r.suspicion).length;
      await db
        .update(linkHealthJobs)
        .set({
          checkedLinks: report.totalLinks,
          healthyLinks: report.validLinks - suspectCount,
          suspectLinks: suspectCount,
          brokenLinks: report.brokenLinks,
          redirectLinks: report.redirects,
          timeoutLinks: report.results.filter(r => r.statusText === 'Timeout').length,
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(linkHealthJobs.id, jobId));

      // Prune per-link rows of older jobs: only the latest completed scan's
      // checks are ever served, and each scan writes ~1,800 rows.
      await db.delete(linkHealthChecks).where(lt(linkHealthChecks.jobId, jobId));

      console.log(`[LinkHealth] Check completed for job ${jobId}: ${report.validLinks - suspectCount} healthy, ${suspectCount} suspect, ${report.brokenLinks} broken, ${report.redirects} redirects out of ${report.totalLinks} total`);
    } catch (err: any) {
      await db
        .update(linkHealthJobs)
        .set({
          status: 'failed',
          errorMessage: err.message,
          completedAt: new Date(),
        })
        .where(and(eq(linkHealthJobs.id, jobId), eq(linkHealthJobs.status, 'processing')))
        .catch(e => console.error('[LinkHealth] Failed to mark job failed:', e.message));
      throw err;
    }
  },

  async cancelJob(jobId: number): Promise<void> {
    await db
      .update(linkHealthJobs)
      .set({ status: 'cancelled', completedAt: new Date() })
      .where(and(eq(linkHealthJobs.id, jobId), eq(linkHealthJobs.status, 'processing')));
  }
};
