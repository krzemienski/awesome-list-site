import crypto from "crypto";
import { runDigestCycle } from "../services/digestService";

const RUN_EVERY_MS = 60 * 60 * 1000;
let timer: NodeJS.Timeout | null = null;
let running = false;

async function runScheduledCycle(workerId: string): Promise<void> {
  if (running) return;
  running = true;
  try {
    const result = await runDigestCycle({ workerId, limit: 20 });
    if (result.recovered || result.queued || result.processed) {
      console.log(
        `[digest] cycle recovered=${result.recovered} queued=${result.queued} processed=${result.processed}`,
      );
    }
  } catch (error) {
    console.error(
      "[digest] scheduled cycle failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  } finally {
    running = false;
  }
}

export function initializeDigestScheduler(): void {
  if (timer) return;
  const workerId = `server-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  // Let startup and migrations settle before the first claim.
  const startup = setTimeout(() => {
    void runScheduledCycle(workerId);
  }, 15_000);
  startup.unref();
  timer = setInterval(() => {
    void runScheduledCycle(workerId);
  }, RUN_EVERY_MS);
  timer.unref();
  console.log("Digest scheduler initialized (hourly)");
}