import { createLogger } from "../lib/logger";

const logger = createLogger("link-health");

const TICK_MS = 10 * 60_000;

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Hours between full link scans; 0 turns the schedule off. */
export function linkHealthIntervalHours(): number {
  const raw = Number(process.env.LINK_HEALTH_INTERVAL_HOURS ?? 24);
  return Number.isFinite(raw) && raw >= 0 ? raw : 24;
}

export function initializeLinkHealthScheduler(): void {
  // A restart kills any in-flight sweep, so mark stuck jobs failed before the
  // first tick looks for a due scan.
  const ready = import("../services/linkHealthService").then(async ({ linkHealthService }) => {
    await linkHealthService.recoverInterruptedJobs();
    return linkHealthService;
  });

  const hours = linkHealthIntervalHours();
  if (hours === 0) {
    logger.info("Link health schedule off (LINK_HEALTH_INTERVAL_HOURS=0)");
    ready.catch((err: unknown) => logger.error("Startup recovery failed:", messageOf(err)));
    return;
  }

  // The due check reads the newest job's age from the database, so the
  // schedule survives restarts and autoscale instances share one cadence.
  const tick = () => ready
    .then(service => service.startCheckIfDue(hours))
    .then(job => { if (job) logger.info(`Scheduled link scan started (job ${job.id}, every ${hours}h)`); })
    .catch((err: unknown) => logger.error("Scheduled link scan failed to start:", messageOf(err)));

  setTimeout(() => void tick(), 60_000).unref();
  setInterval(() => void tick(), TICK_MS).unref();
  logger.info(`Link health schedule on: a full scan every ${hours}h`);
}
