import { config } from "../config";
import { ContactRepository, purgeExpiredContactSubmissions } from "../repositories/ContactRepository";
import { createLogger } from "../lib/logger";

const logger = createLogger("contact-retention");

const RUN_EVERY_MS = 60 * 60 * 1000;
const BATCH_SIZE = 500;
const MAX_BATCHES = 20;
let timer: NodeJS.Timeout | undefined;
let running = false;

async function runScheduledCycle(): Promise<void> {
  if (process.env.NODE_ENV === "test" || process.env.VITEST || running) return;
  running = true;
  let deletedCount = 0;
  try {
    if (!config.contact.enabled && !(await new ContactRepository().countSubmissions())) return;
    logger.info("Contact retention purge started");
    let batches = 0;
    let deleted: number;
    do {
      deleted = await purgeExpiredContactSubmissions(BATCH_SIZE);
      deletedCount += deleted;
      batches++;
    } while (deleted === BATCH_SIZE && batches < MAX_BATCHES);
    logger.info("Contact retention purge finished", {
      deleted: deletedCount,
      batches,
      batchLimitReached: batches === MAX_BATCHES && deleted === BATCH_SIZE,
    });
  } catch (error) {
    // DB exceptions can contain SQL parameters/PII, so only the error class
    // and code are logged, plus the count from batches that committed.
    logger.error("Contact retention purge failed; retrying next hour", {
      deleted: deletedCount,
      errorClass: error instanceof Error ? error.name : "unknown",
      code: (error as { code?: unknown } | null)?.code ?? undefined,
    });
  } finally {
    running = false;
  }
}

export function initializeContactRetentionScheduler(): void {
  if (process.env.NODE_ENV === "test" || process.env.VITEST || timer) return;
  const startup = setTimeout(() => { void runScheduledCycle(); }, 30_000);
  startup.unref();
  timer = setInterval(() => { void runScheduledCycle(); }, RUN_EVERY_MS);
  timer.unref();
}