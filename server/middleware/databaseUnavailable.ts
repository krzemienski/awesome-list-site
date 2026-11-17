import type { Response } from "express";
import { createLogger } from "../lib/logger";
import { databaseFailureLevel } from "../db/errors";
import { noteDatabaseUnreachable } from "../db/outage";

const logger = createLogger("errors");

/**
 * The one answer to a request whose database connection dropped or was refused: 503 with
 * Retry-After 1 (the client retries it), logged at databaseFailureLevel, which is a warning
 * until the outage is sustained. Used by the central error handler and by route catches.
 */
export function sendDatabaseUnavailable(res: Response, error: unknown, message = "Database is temporarily unavailable"): void {
  noteDatabaseUnreachable();
  res.locals.databaseUnavailable = true;
  res.status(503).set("Retry-After", "1").json({ message });
  logger[databaseFailureLevel(error)]("Database unavailable", {
    status: 503,
    code: (error as any)?.code ?? (error as any)?.cause?.code ?? "timeout",
  });
}
