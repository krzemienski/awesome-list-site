import { DrizzleQueryError } from "drizzle-orm/errors";
import nodePostgres from "pg";
import { AppError, ServiceUnavailableError } from "../middleware/errors";
import { causeChain, findPgError } from "../errors/pgErrors";
import type { Logger } from "../lib/logger";
import { databaseOutageLevel, isDatabaseFailurePersistent } from "./outage";

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
  // The readiness probe gave up waiting for pool.connect() (server/health.ts).
  "pool acquisition timeout",
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
  // libpq (pg_dump, pg_restore) words the same failures its own way.
  "connection refused",
  "server closed the connection unexpectedly",
  "terminating connection due to",
  "the database system is starting up",
  "the database system is shutting down",
  "timeout expired",
];

const isTransientCode = (code: string) => code.startsWith("08") || TRANSIENT_SQLSTATES.has(code);
const isConfigFatal = (code: string) => code.startsWith("28") || code === "3D000";

// Match stack frames, not the first line: an error message can contain arbitrary input.
// Drizzle transaction frames alone are not provenance: their callback can fail on fetch.
const DATABASE_DRIVER_FRAME = /^[ \t]+at .*[/\\]node_modules[/\\]pg(?:-(?:pool|protocol|native))?[/\\]/m;
const DATABASE_CONNECTION_MESSAGES = [
  /^(?:readiness )?pool acquisition timeout\b/i,
  /^(?:database|postgres(?:ql)?|node-postgres|pg(?:-pool)?|pool) (?:connection|connect|query|acquisition|error)\b/i,
  /^(?:failed|unable) to connect to (?:the )?(?:database|postgres(?:ql)?)\b/i,
  /^(?:pg_dump(?:all)?|pg_restore|psql)\b/i,
];

/** The first string or numeric `code` on the error or any of its causes. */
export function databaseErrorCode(error: unknown): string {
  for (const link of causeChain(error)) {
    const code = (link as { code?: unknown } | null)?.code;
    if (typeof code === "string" || typeof code === "number") return String(code);
  }
  return "";
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
  // Socket errors also come from fetch and other upstream services. Only inspect
  // connection failures at or below a database source; never read Drizzle's SQL/params.
  let databaseSource = false;
  for (const link of causeChain(error)) {
    if (link instanceof DrizzleQueryError) {
      databaseSource = true;
      continue;
    }
    const { code, message, stack, client } = (link ?? {}) as {
      code?: unknown; message?: unknown; stack?: unknown; client?: unknown;
    };
    const text = typeof message === "string" ? message : "";
    // pg-pool attaches its client to idle socket errors, whose stack may be Node-only.
    databaseSource ||= client instanceof nodePostgres.Client
      || DATABASE_CONNECTION_MESSAGES.some((pattern) => pattern.test(text))
      || (typeof stack === "string" && DATABASE_DRIVER_FRAME.test(stack));
    if (!databaseSource) continue;
    const failure = `${typeof code === "string" ? code : ""} ${text}`.toLowerCase();
    if (CONNECTION_FAILURE_PHRASES.some((phrase) => failure.includes(phrase))) return true;
  }
  return false;
}

/**
 * The one place that decides how loudly a database failure is logged: warn when the database
 * merely dropped or refused a connection (a restart, scale to zero, a reaped socket: a fresh
 * connection cures it), error for anything else, error for a drop a retry did not cure (marked
 * persistent), and error for a drop once it has lasted DATABASE_OUTAGE_ESCALATION_MS (see ./outage).
 */
export function databaseFailureLevel(error: unknown): "warn" | "error" {
  if (!isDatabaseUnavailableError(error) || isDatabaseFailurePersistent(error)) return "error";
  return databaseOutageLevel();
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
