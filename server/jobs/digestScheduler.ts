import crypto from "crypto";
import { runDigestCycle } from "../services/digestService";
import { createLogger } from "../lib/logger";
import { runWithJobContext } from "../ops/requestContext";

const logger = createLogger("digest");

const RUN_EVERY_MS = 60 * 60 * 1000;
// A freshly booted Autoscale instance is starved for its first ~3 minutes: pool
// connects time out at 3 s and queries take seconds. Start after that window.
const STARTUP_DELAY_MS = 5 * 60 * 1000;
let timer: NodeJS.Timeout | null = null;
let running = false;

const runScheduledCycle = (workerId: string): Promise<void> =>
  runWithJobContext("digest", workerId, () => runCycle(workerId));

async function runCycle(workerId: string): Promise<void> {
  if (running) return;
  running = true;
  const startedAt = Date.now();
  logger.info("Digest cycle started");
  try {
    const result = await runDigestCycle({ workerId, limit: 20 });
    logger.info("Digest cycle finished", {
      recovered: result.recovered,
      queued: result.queued,
      processed: result.processed,
      cleaned: result.cleaned,
      ms: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error("Digest cycle failed; retrying next hour", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
  } finally {
    running = false;
  }
}

export function initializeDigestScheduler(): void {
  if (timer) return;
  const workerId = `server-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  const startup = setTimeout(() => {
    void runScheduledCycle(workerId);
  }, STARTUP_DELAY_MS);
  startup.unref();
  timer = setInterval(() => {
    void runScheduledCycle(workerId);
  }, RUN_EVERY_MS);
  timer.unref();
  logger.info("Digest scheduler initialized (hourly)");
}