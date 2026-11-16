import { ServiceUnavailableError } from "../middleware/errors";
import { findPgError } from "../errors/pgErrors";

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

export function databaseErrorCode(error: unknown): string {
  const err = error as any;
  return String(err?.code ?? err?.cause?.code ?? "");
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (error instanceof ServiceUnavailableError) return true;
  const code = databaseErrorCode(error);
  if (code.startsWith("08") || TRANSIENT_SQLSTATES.has(code)) return true;
  // Postgres answered (an error with `severity` anywhere in the cause chain), so
  // the connection worked: only its own code decides. The phrases below would
  // otherwise match the query's params ("Fix RTMP connection timeout" in a
  // duplicate-title 23505 became a 503 instead of a 409).
  const pg = findPgError(error);
  if (pg) return pg.code.startsWith("08") || TRANSIENT_SQLSTATES.has(pg.code);
  // Drizzle wraps the pg error ("Failed query: ...") and keeps the cause, so
  // read both messages; the outer one alone hides "Connection terminated".
  const message = `${(error as any)?.message ?? ""} ${(error as any)?.cause?.message ?? ""}`.toLowerCase();
  return (
    message.includes("timeout exceeded when trying to connect") ||
    message.includes("connection timeout") ||
    message.includes("connection terminated") ||
    message.includes("connection ended unexpectedly") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    message.includes("socket hang up")
  );
}
