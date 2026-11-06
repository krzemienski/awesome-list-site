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

async function timed(job: string, run: () => Promise<JobResult>): Promise<JobResult> {
  const startedAt = Date.now();
  let result: JobResult;
  try {
    result = await run();
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

export function registerOpsCronRoutes(app: Express): void {
  const limiter = createRateLimiter({ name: "ops-cron", max: 10, windowMs: 15 * 60_000 });

  const authorize: RequestHandler = (req, res, next) => {
    const expected = process.env.OPS_CRON_TOKEN;
    if (!expected) {
      res.status(503).json({ message: "Scheduled jobs endpoint is not configured" });
      return;
    }
    const supplied = bearerToken(req);
    if (!supplied || !secretsMatch(supplied, expected)) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    next();
  };

  app.post("/api/ops/run-due-jobs", limiter, authorize, asyncHandler(async (_req, res) => {
    const jobs = {
      linkScan: await timed("linkScan", startLinkScan),
      digest: await timed("digest", runDigest),
      contactPurge: await timed("contactPurge", purgeContacts),
      backup: await timed("backup", async () => ({ ...(await runScheduledBackupIfDue()) })),
    };
    res.set("Cache-Control", "no-store");
    res.json({ ranAt: new Date().toISOString(), jobs });
  }));
}
