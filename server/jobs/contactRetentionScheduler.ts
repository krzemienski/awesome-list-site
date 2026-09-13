import { config } from "../config";
import { ContactRepository, purgeExpiredContactSubmissions } from "../repositories/ContactRepository";

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
    let batches = 0;
    let deleted: number;
    do {
      deleted = await purgeExpiredContactSubmissions(BATCH_SIZE);
      deletedCount += deleted;
      batches++;
    } while (deleted === BATCH_SIZE && batches < MAX_BATCHES);
    console.log(JSON.stringify({
      event: "ops.contact_retention_completed",
      deletedCount,
      batches,
      batchLimitReached: batches === MAX_BATCHES && deleted === BATCH_SIZE,
    }));
  } catch {
    // DB exceptions can contain SQL parameters/PII. Keep this failure loud but
    // bounded, including the count from batches that committed before failure.
    console.error(JSON.stringify({
      event: "ops.contact_retention_failed",
      deletedCount,
      message: "Contact retention failed; inspect database health. Retrying next hour.",
    }));
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