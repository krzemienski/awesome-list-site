import { createLogger } from "../lib/logger";

const logger = createLogger("link-health");

const TICK_MS = 10 * 60_000;

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Hours between full link scans; 0 turns the schedule off. */
export function linkHealthIntervalHours(): number {
  const raw = Number(process.env.LINK_HEALTH_INTERVAL_HOURS ?? 24);
  return Number.isFinite(raw) && raw >= 0 ? raw : 24;
}

async function service() {
  return (await import("../services/linkHealthService")).linkHealthService;
}

export function initializeLinkHealthScheduler(): void {
  const hours = linkHealthIntervalHours();
  if (hours === 0) {
    logger.info("Link health schedule off (LINK_HEALTH_INTERVAL_HOURS=0)");
    void service()
      .then(s => s.recoverInterruptedJobs())
      .catch((err: unknown) => logger.error("Interrupted-job recovery failed:", messageOf(err)));
    return;
  }

  // Each tick recovers stale jobs and reads the last completed scan's age from
  // the database, so the schedule survives restarts and every autoscale
  // instance shares one cadence; startCheck's lock stops overlapping scans.
  const tick = async () => {
    try {
      const job = await (await service()).startCheckIfDue(hours);
      if (job) logger.info(`Scheduled link scan started (job ${job.id}, every ${hours}h)`);
    } catch (err) {
      logger.error("Scheduled link scan failed to start:", messageOf(err));
    }
  };

  setTimeout(() => void tick(), 60_000).unref();
  setInterval(() => void tick(), TICK_MS).unref();
  logger.info(`Link health schedule on: a full scan every ${hours}h`);
}
