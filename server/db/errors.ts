import { DrizzleQueryError } from "drizzle-orm/errors";
import { AppError, ServiceUnavailableError } from "../middleware/errors";
import { causeChain, findPgError } from "../errors/pgErrors";

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
