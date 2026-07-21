import type { LinkHealthJob, LinkHealthCheck, LinkHealthJobRow, LinkHealthCheckRow } from "@shared/schema";
import { linkHealthJobs, linkHealthChecks } from "@shared/schema";
import { db } from "../db";
import { desc, eq, ne, and, inArray, lt } from "drizzle-orm";
import { storage } from "../storage";
import { checkResourceLinks, browserVerifyLink, type LinkCheckResult } from "../validation/linkChecker";

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

      // Second verification pass (strict dead-link policy, see
      // .agents/memory/link-scan-false-positives.md): the pass-1 sweep from
      // this datacenter IP over-flags bot-blocked sites (403/429/timeouts)
      // by ~100x. Re-check every pass-1 failure with a real browser UA and
      // only keep it as a problem link if the strict policy confirms it dead
      // (DNS/refused/404-410/SSL). Everything else is reclassified healthy
      // with the verification verdict recorded in errorMessage.
      const statuses = new Map<LinkCheckResult, LinkHealthCheck['status']>();
      for (const r of report.results) statuses.set(r, mapResultToStatus(r));
      const toVerify = report.results.filter(r => {
        const s = statuses.get(r)!;
        return s === 'broken' || s === 'timeout' || s === 'dns_failure';
      });
      console.log(`[LinkHealth] Job ${jobId}: pass 1 flagged ${toVerify.length} link(s); starting browser-UA verification pass`);
      const verdicts = new Map<LinkCheckResult, string>();
      const VERIFY_CONC = 10;
      let verified = 0;
      for (let i = 0; i < toVerify.length; i += VERIFY_CONC) {
        const batch = toVerify.slice(i, i + VERIFY_CONC);
        await Promise.all(batch.map(async (r) => {
          const v = await browserVerifyLink(r.url);
          if (v.confirmedDead) {
            // Keep the pass-1 status unless the browser check refined it
            // (e.g. timeout in pass 1, 404 under browser UA -> broken).
            if (typeof v.status === 'number') statuses.set(r, 'broken');
            else if (String(v.status).includes('ENOTFOUND')) statuses.set(r, 'dns_failure');
            else statuses.set(r, 'broken');
          } else {
            // Bot-block / auth wall / transient — alive per policy.
            statuses.set(r, 'healthy');
          }
          verdicts.set(r, v.verdict);
        }));
        verified += batch.length;
        // Reuse checkedLinks-style progress logging (throttled by batch).
        if (verified % 50 < VERIFY_CONC) {
          console.log(`[LinkHealth] Job ${jobId}: verification pass ${verified}/${toVerify.length}`);
        }
      }

      // Re-check cancellation after the (potentially minutes-long) pass 2.
      const [afterVerify] = await db
        .select({ status: linkHealthJobs.status })
        .from(linkHealthJobs)
        .where(eq(linkHealthJobs.id, jobId));
      if (!afterVerify || afterVerify.status !== 'processing') {
        console.log(`[LinkHealth] Job ${jobId} is no longer processing after verification pass; discarding results`);
        return;
      }

      const checkRows = report.results.map(result => {
        const status = statuses.get(result)!;
        const verdict = verdicts.get(result);
        return {
          jobId,
          resourceId: result.resourceId || 0,
          url: result.url,
          status,
          httpStatus: result.status,
          responseTime: result.responseTime,
          redirectUrl: result.redirectUrl,
          finalUrl: result.finalUrl,
          errorMessage: verdict
            ? [verdict, result.error].filter(Boolean).join(' | ')
            : (result.suspicionDetail || result.error),
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

      // Counters derive from the post-verification statuses so they always
      // match the persisted rows (R4-044: one dataset).
      const countBy = (s: LinkHealthCheck['status']) => checkRows.filter(r => r.status === s).length;
      const healthyCount = countBy('healthy');
      const suspectCount = countBy('suspect');
      const brokenCount = countBy('broken') + countBy('dns_failure');
      const redirectCount = countBy('redirect');
      const timeoutCount = countBy('timeout');
      await db
        .update(linkHealthJobs)
        .set({
          checkedLinks: report.totalLinks,
          healthyLinks: healthyCount,
          suspectLinks: suspectCount,
          brokenLinks: brokenCount,
          redirectLinks: redirectCount,
          timeoutLinks: timeoutCount,
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(linkHealthJobs.id, jobId));

      // Prune per-link rows of older jobs: only the latest completed scan's
      // checks are ever served, and each scan writes ~1,800 rows.
      await db.delete(linkHealthChecks).where(lt(linkHealthChecks.jobId, jobId));

      console.log(`[LinkHealth] Check completed for job ${jobId}: ${healthyCount} healthy, ${suspectCount} suspect, ${brokenCount} broken, ${redirectCount} redirects, ${timeoutCount} timeouts out of ${report.totalLinks} total (verification pass cleared ${toVerify.length - (brokenCount + timeoutCount)} bot-block false positives)`);
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
