import { createLogger } from "../lib/logger";
import { retryOnDatabaseDrop } from "../db/retryOnDatabaseDrop";
import { runWithJobContext } from "../ops/requestContext";
import { POST_BOOT_DELAY_MS, deferUntilServing } from "../ops/serviceActivity";
import { runScheduledBackupIfDue } from "../backup/scheduledBackup";
import { DatabaseBackupError } from "../backup/databaseBackup";
import { databaseErrorCode } from "../db/errors";

const logger = createLogger("backup-scheduler");

const RUN_EVERY_MS = 30 * 60 * 1000;
let timer: NodeJS.Timeout | null = null;
let running = false;

async function runCycle(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const result = await runWithJobContext("database-backup", "scheduler", () =>
      retryOnDatabaseDrop(logger, "Scheduled backup check", runScheduledBackupIfDue));
    if (result.status !== "skipped") logger.info("Scheduled backup check finished", { ...result });
  } catch (error) {
    logger.error("Scheduled backup check failed; retrying in 30 minutes", error, {
      code: databaseErrorCode(error) || undefined,
      stage: error instanceof DatabaseBackupError ? error.stage : undefined,
    });
  } finally {
    running = false;
  }
}

// The 24 h due check, the cross-instance advisory lock and age-based pruning all live in
// runScheduledBackupIfDue, so this timer may fire as often as it likes.
export function initializeBackupScheduler(): void {
  if (timer) return;
  const tick = deferUntilServing(runCycle);
  const startup = setTimeout(tick, POST_BOOT_DELAY_MS);
  startup.unref();
  timer = setInterval(tick, RUN_EVERY_MS);
  timer.unref();
  logger.info("Backup scheduler initialized (every 30 minutes)");
}
