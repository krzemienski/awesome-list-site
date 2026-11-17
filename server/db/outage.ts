/**
 * Tells one dropped connection from a database that is down.
 *
 * A request that loses its connection is answered 503 + Retry-After and the client retries it,
 * so the visitor never notices and the log line is only a warning. A database that stays
 * unhealthy is a real incident, and its failures log at error.
 *
 * One state machine, no ring. An episode opens at its first failure and counts the failures and
 * successes seen since it opened; a success from before it never counts.
 *
 * What this guarantees, with ESCALATION = DATABASE_OUTAGE_ESCALATION_MS (30 s):
 *   a) A lone failure, or a failure followed by healthy traffic, logs warn only: the episode
 *      closes once two successes in a row follow the failure and the failure is 10 s old.
 *   b) A hard outage (no success) escalates at the first failure logged at least ESCALATION after
 *      the episode opened, at any request rate. One request every 90 s logs warn at t=0 and error
 *      from t=90 s on. At a high rate that is 30 s after the first failure.
 *   c) A partial outage escalates once ESCALATION has passed and the episode holds more failures
 *      than successes. Scattered successes do not close it: closing needs two in a row.
 *   d) After recovery the next failure logs warn again: the episode is closed, so it opens fresh.
 *
 * A failure more than EPISODE_IDLE_MS after the previous one opens a new episode instead of
 * extending the old one, so two drops hours apart, or a recovery nobody saw for lack of traffic,
 * each start with a warn.
 *
 * State is five numbers per process. Leaf module, no imports, so the logger, the pool and the
 * error rule can all read it. Every function takes `now` so a clock can be injected.
 */

/** How long a database must stay unhealthy before its failures are errors. */
export const DATABASE_OUTAGE_ESCALATION_MS = 30_000;

/** A failure this long after the previous one opens a new episode, whatever happened in between. */
const EPISODE_IDLE_MS = 10 * 60_000;

/** An episode closes only when its last failure is at least this old. */
const RECOVERY_QUIET_MS = 10_000;

/** ...and when this many successes in a row have followed that failure. */
const RECOVERY_SUCCESSES = 2;

let episodeStart: number | null = null;
let lastFailureAt = 0;
let epFailures = 0;
let epSuccesses = 0;
let successesSinceFailure = 0;

export function noteDatabaseUnreachable(now: number = Date.now()): void {
  if (episodeStart === null || now - lastFailureAt > EPISODE_IDLE_MS) {
    episodeStart = now;
    epFailures = 0;
    epSuccesses = 0;
  }
  epFailures++;
  successesSinceFailure = 0;
  lastFailureAt = now;
}

export function noteDatabaseReachable(now: number = Date.now()): void {
  if (episodeStart === null) return;
  epSuccesses++;
  successesSinceFailure++;
  if (successesSinceFailure >= RECOVERY_SUCCESSES && now - lastFailureAt >= RECOVERY_QUIET_MS) {
    episodeStart = null;
  }
}

/** warn for a transient drop, error once the database has stayed unhealthy past the escalation window. */
export function databaseOutageLevel(now: number = Date.now()): "warn" | "error" {
  const sustained =
    episodeStart !== null &&
    now - episodeStart >= DATABASE_OUTAGE_ESCALATION_MS &&
    epFailures > epSuccesses;
  return sustained ? "error" : "warn";
}

const failedAgainAfterRetry = new WeakSet<object>();

/** A job retried after a drop and failed again: the database stayed down, so its error log stays an error. */
export function markDatabaseFailurePersistent(error: unknown): void {
  if (error && typeof error === "object") failedAgainAfterRetry.add(error);
}

export const isDatabaseFailurePersistent = (error: unknown): boolean =>
  !!error && typeof error === "object" && failedAgainAfterRetry.has(error);
