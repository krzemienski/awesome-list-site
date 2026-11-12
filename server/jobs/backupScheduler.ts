import { createLogger } from "../lib/logger";
import { runWithJobContext } from "../ops/requestContext";
import { POST_BOOT_DELAY_MS, isServingTraffic } from "../ops/serviceActivity";
import { runScheduledBackupIfDue } from "../backup/scheduledBackup";

const logger = createLogger("backup-scheduler");

const RUN_EVERY_MS = 30 * 60 * 1000;
let timer: NodeJS.Timeout | null = null;
let running = false;

async function runCycle(): Promise<void> {
  if (!isServingTraffic()) return;
  if (running) return;
  running = true;
  try {
    const result = await runWithJobContext("database-backup", "scheduler", runScheduledBackupIfDue);
    if (result.status !== "skipped") logger.info("Scheduled backup check finished", { ...result });
  } catch (error) {
    logger.error("Scheduled backup check failed; retrying in 30 minutes", {
      reason: error instanceof Error ? error.message : "unknown error",
    });
  } finally {
    running = false;
  }
}

// The 24 h due check, the cross-instance advisory lock and age-based pruning all live in
// runScheduledBackupIfDue, so this timer may fire as often as it likes.
export function initializeBackupScheduler(): void {
  if (timer) return;
  const startup = setTimeout(() => void runCycle(), POST_BOOT_DELAY_MS);
  startup.unref();
  timer = setInterval(() => void runCycle(), RUN_EVERY_MS);
  timer.unref();
  logger.info("Backup scheduler initialized (every 30 minutes)");
}
