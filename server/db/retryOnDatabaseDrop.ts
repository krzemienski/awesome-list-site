import { isDatabaseUnavailableError } from "./errors";
import type { Logger } from "../lib/logger";

/** Long enough for the pool to discard the dead clients and open fresh ones. */
export const DATABASE_DROP_RETRY_DELAY_MS = 3000;

/**
 * Runs a scheduled job's work, and once more if it failed because the database
 * dropped its connections (a server restart, Neon scaling to zero, a proxy
 * reaping idle sockets). The first attempt is a warning; only a second failure
 * rejects, so the caller's error log means the database stayed down or the job
 * has a real fault. Any other error rejects at once. `run` must be safe to repeat.
 */
export async function retryOnDatabaseDrop<T>(
  logger: Logger,
  job: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isDatabaseUnavailableError(error)) throw error;
    logger.warn(`${job} lost its database connection; retrying once on a fresh one`, {
      retryInMs: DATABASE_DROP_RETRY_DELAY_MS,
    });
    await new Promise((resolve) => setTimeout(resolve, DATABASE_DROP_RETRY_DELAY_MS));
    return run();
  }
}
