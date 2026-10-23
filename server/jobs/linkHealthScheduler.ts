import { createLogger } from "../lib/logger";

const logger = createLogger("link-health");

export function initializeLinkHealthScheduler(): void {
  logger.info("Link health scheduler initialized (disabled)");

  // Boot-time recovery: a restart kills any in-flight link-health sweep, so
  // mark jobs stuck in 'pending'/'processing' as failed instead of letting
  // them linger forever (they would also block new scans).
  import("../services/linkHealthService")
    .then(({ linkHealthService }) => linkHealthService.recoverInterruptedJobs())
    .catch(err => logger.error("Startup recovery failed:", err.message));
}
