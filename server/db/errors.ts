import { DrizzleQueryError } from "drizzle-orm/errors";
import { AppError, ServiceUnavailableError } from "../middleware/errors";
import { causeChain, findPgError } from "../errors/pgErrors";
import type { Logger } from "../lib/logger";
import { databaseOutageLevel } from "./outage";

const TRANSIENT_SQLSTATES = new Set([
  "40001", // serialization_failure
  "40P01", // deadlock_detected
  "53300", // too_many_connections
  "53400", // configuration_limit_exceeded
  "55000", // object_not_in_prerequisite_state
  "55P03", // lock_not_available / lock timeout
  "57014", // query_canceled / statement timeout
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
]);

/** What node-postgres, pg-pool and Node's socket layer say when the connection, not the query, failed. */
const CONNECTION_FAILURE_PHRASES = [
  "timeout exceeded when trying to connect",
  "connection timeout",
  "connection terminated",
  "connection ended unexpectedly",
  "query read timeout",
  "not queryable",
  "econnreset",
  "econnrefused",
  "ehostunreach",
  "eai_again",
  "etimedout",
  "epipe",
  "socket hang up",
];

const isTransientCode = (code: string) => code.startsWith("08") || TRANSIENT_SQLSTATES.has(code);
const isConfigFatal = (code: string) => code.startsWith("28") || code === "3D000";

export function databaseErrorCode(error: unknown): string {
  const err = error as any;
  return String(err?.code ?? err?.cause?.code ?? "");
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  // An app error already chose its status; its message can echo user input.
  if (error instanceof AppError) return error instanceof ServiceUnavailableError;
  // Postgres answered, so its own code decides. A FATAL mid-session (idle timeout,
  // termination, a Neon compute failure) is cured by a fresh connection; a FATAL at
  // connect for credentials (class 28) or a missing database (3D000) is config.
  const pg = findPgError(error);
  if (pg) return (pg.severity === "FATAL" && !isConfigFatal(pg.code)) || isTransientCode(pg.code);
  if (isTransientCode(databaseErrorCode(error))) return true;
  // No server answer: read every error in the chain except Drizzle's wrapper,
  // whose message embeds the query's params ("Fix RTMP connection timeout").
  const text = causeChain(error)
    .filter((e) => !(e instanceof DrizzleQueryError))
    .map((e) => {
      const { code, message } = (e ?? {}) as { code?: unknown; message?: unknown };
      return `${typeof code === "string" ? code : ""} ${typeof message === "string" ? message : ""}`;
    })
    .join(" ")
    .toLowerCase();
  return CONNECTION_FAILURE_PHRASES.some((phrase) => text.includes(phrase));
}

/**
 * The one place that decides how loudly a database failure is logged: warn when the database
 * merely dropped or refused a connection (a restart, scale to zero, a reaped socket: a fresh
 * connection cures it), error for anything else, and error for a drop once it has lasted
 * DATABASE_OUTAGE_ESCALATION_MS (see ./outage).
 */
export function databaseFailureLevel(error: unknown): "warn" | "error" {
  return isDatabaseUnavailableError(error) ? databaseOutageLevel() : "error";
}

/**
 * Logs `error` at its databaseFailureLevel plus `extra`. A warning carries the code and message.
 * An error passes the Error itself, so the line also gets its cause and scrubbed stack.
 */
export function logDatabaseError(
  logger: Logger,
  message: string,
  error: unknown,
  extra: Record<string, unknown> = {},
): void {
  const code = databaseErrorCode(error) || "unknown";
  if (databaseFailureLevel(error) === "error" && error instanceof Error) {
    // The logger reads an own `code` off the Error; a Drizzle wrapper keeps it on its cause.
    const ownCode = typeof (error as { code?: unknown }).code === "string";
    logger.error(message, error, ownCode ? extra : { code, ...extra });
    return;
  }
  logger[databaseFailureLevel(error)](message, {
    code,
    message: error instanceof Error ? error.message : String(error),
    ...extra,
  });
}
