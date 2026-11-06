/**
 * POST /api/ops/run-due-jobs
 *
 * Called by an external cron (every 15 min) so the scheduled jobs run even when
 * the in-process timers do not (Autoscale with no instance up). Every job is
 * idempotent and decides for itself whether it is due; the timers in
 * server/jobs/* stay as the fallback.
 *
 * Auth: `Authorization: Bearer <OPS_CRON_TOKEN>`. 503 while the env var is unset.
 * Clerk's middleware leaves a non-session Bearer untouched (checked with a
 * throwaway server), so no custom header is needed.
 */
import crypto from "node:crypto";
import type { Express, Request, RequestHandler } from "express";
import { secretsMatch } from "../../clerkAuth";
import { runScheduledBackupIfDue } from "../../backup/scheduledBackup";
import { createLogger } from "../../lib/logger";
import { linkHealthIntervalHours } from "../../jobs/linkHealthScheduler";
import { asyncHandler } from "../../middleware/asyncHandler";
import { createRateLimiter } from "../../middleware/rateLimit";
import { purgeExpiredContactSubmissions } from "../../repositories";
import { runDigestCycle } from "../../services/digestService";
import { linkHealthService } from "../../services/linkHealthService";

const logger = createLogger("ops-cron");

const PURGE_BATCH_SIZE = 500;
const PURGE_MAX_BATCHES = 20;

interface JobResult {
  status: string;
  [detail: string]: unknown;
}

function bearerToken(req: Request): string | undefined {
  const [scheme, token, ...extra] = (req.get("authorization") ?? "").split(" ");
  return scheme?.toLowerCase() === "bearer" && token && extra.length === 0 ? token : undefined;
}

async function startLinkScan(): Promise<JobResult> {
  const hours = linkHealthIntervalHours();
  if (hours === 0) return { status: "skipped" };
  // The scan itself runs detached inside startCheck; only job creation is awaited.
  const job = await linkHealthService.startCheckIfDue(hours);
  return job ? { status: "started", jobId: job.id } : { status: "not_due" };
}

async function runDigest(): Promise<JobResult> {
  const result = await runDigestCycle({ workerId: `ops-cron-${crypto.randomUUID().slice(0, 8)}`, limit: 20 });
  return { status: "ran", processed: result.processed };
}

async function purgeContacts(): Promise<JobResult> {
  let deleted = 0;
  let batch: number;
  let batches = 0;
  do {
    batch = await purgeExpiredContactSubmissions(PURGE_BATCH_SIZE);
    deleted += batch;
    batches++;
  } while (batch === PURGE_BATCH_SIZE && batches < PURGE_MAX_BATCHES);
  return { status: "ran", deleted };
}

const DIGEST_TIMEOUT_MS = 60_000;
const PURGE_TIMEOUT_MS = 30_000;
const LINK_SCAN_TIMEOUT_MS = 30_000;
/** How long the request waits for the backup before answering "started" and letting it finish detached. */
const BACKUP_REQUEST_BUDGET_MS = 30_000;

/** Resolves with `onTimeout` if `work` is still running after `ms`; `work` itself keeps running (it cannot be cancelled). */
function within<T>(work: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const deadline = new Promise<T>((resolve) => { timer = setTimeout(() => resolve(onTimeout), ms); });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

async function timed(job: string, timeoutMs: number, run: () => Promise<JobResult>): Promise<JobResult> {
  const startedAt = Date.now();
  let result: JobResult;
  try {
    result = await within(run(), timeoutMs, { status: "timeout" });
  } catch (error) {
    // Error text can carry SQL parameters; log the class and code only.
    logger.error("Job failed", {
      job,
      errorClass: error instanceof Error ? error.name : "unknown",
      code: (error as { code?: unknown } | null)?.code ?? undefined,
    });
    result = { status: "error" };
  }
  logger.info("Job finished", { job, status: result.status, ms: Date.now() - startedAt });
  return result;
}

/**
 * A dump can outlast the request, so the backup runs detached once the request
 * budget is spent: the response says "started" and the final outcome is logged.
 * Like the link scan, it then depends on the instance staying up until it ends.
 */
function runBackup(): Promise<JobResult> {
  const finished = runScheduledBackupIfDue().then((r): JobResult => ({ ...r }));
  void finished.then((r) => logger.info("Backup finished", { status: r.status }));
  return within(finished, BACKUP_REQUEST_BUDGET_MS, { status: "started" });
}

export function registerOpsCronRoutes(app: Express): void {
  const limiter = createRateLimiter({ name: "ops-cron", max: 10, windowMs: 15 * 60_000 });
  // Counts failed authentication only, so guessing is throttled without letting
  // an attacker on a shared IP use up the real cron's budget.
  const failedAuthLimiter = createRateLimiter({ name: "ops-cron-auth", max: 20, windowMs: 15 * 60_000 });

  const authorize: RequestHandler = (req, res, next) => {
    const expected = process.env.OPS_CRON_TOKEN;
    if (!expected) {
      res.status(503).json({ message: "Scheduled jobs endpoint is not configured" });
      return;
    }
    const supplied = bearerToken(req);
    if (supplied && secretsMatch(supplied, expected)) {
      next();
      return;
    }
    failedAuthLimiter(req, res, () => {
      res.status(401).json({ message: "Unauthorized" });
    });
  };

  app.post("/api/ops/run-due-jobs", authorize, limiter, asyncHandler(async (_req, res) => {
    const jobs = {
      linkScan: await timed("linkScan", LINK_SCAN_TIMEOUT_MS, startLinkScan),
      digest: await timed("digest", DIGEST_TIMEOUT_MS, runDigest),
      contactPurge: await timed("contactPurge", PURGE_TIMEOUT_MS, purgeContacts),
      backup: await timed("backup", BACKUP_REQUEST_BUDGET_MS + 5_000, runBackup),
    };
    res.set("Cache-Control", "no-store");
    res.json({ ranAt: new Date().toISOString(), jobs });
  }));
}
