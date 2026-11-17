/**
 * Tells one dropped connection from a database that is down.
 *
 * A request that loses its connection is answered 503 + Retry-After and the client retries it,
 * so the visitor never notices and the log line is only a warning. An outage that outlasts
 * DATABASE_OUTAGE_ESCALATION_MS (failures with no query succeeding in between) is a real
 * incident: from then on the same failures log at error until a query succeeds again.
 *
 * Leaf module, no imports, so the logger, the pool and the error rule can all read it.
 */

/** How long the database must keep failing before its failures are errors. */
export const DATABASE_OUTAGE_ESCALATION_MS = 30_000;

/** A gap this long between failures means the earlier ones were separate drops, not one outage. */
const DATABASE_OUTAGE_GAP_MS = 60_000;

let unreachableSince: number | null = null;
let lastFailureAt = 0;

export function noteDatabaseUnreachable(now: number = Date.now()): void {
  if (unreachableSince === null || now - lastFailureAt > DATABASE_OUTAGE_GAP_MS) unreachableSince = now;
  lastFailureAt = now;
}

export function noteDatabaseReachable(): void {
  unreachableSince = null;
}

/** warn for a transient drop, error once the database has been failing past the escalation window. */
export function databaseOutageLevel(now: number = Date.now()): "warn" | "error" {
  const sustained =
    unreachableSince !== null &&
    now - lastFailureAt <= DATABASE_OUTAGE_GAP_MS &&
    now - unreachableSince >= DATABASE_OUTAGE_ESCALATION_MS;
  return sustained ? "error" : "warn";
}
