/**
 * Tells one dropped connection from a database that is down.
 *
 * A request that loses its connection is answered 503 + Retry-After and the client retries it,
 * so the visitor never notices and the log line is only a warning. A database that stays
 * unhealthy is a real incident, and its failures log at error.
 *
 * What this guarantees, with ESCALATION = DATABASE_OUTAGE_ESCALATION_MS (30 s):
 *   a) A lone failure, or a failure followed by healthy traffic, logs warn only. An episode
 *      begins at the first failure and ends at the first success that finds the recent window
 *      (see WINDOW) mostly healthy, so one success inside a flapping outage does not end it.
 *   b) A hard outage escalates at the first failure logged at least ESCALATION after the
 *      episode began, at any request rate: the episode stays open until a success shows
 *      recovery, never because the next failure came late. One request every 90 s logs warn
 *      at t=0 and error from t=90 s on, for as long as the outage lasts. At a high request
 *      rate that is 30 s after the first failure.
 *   c) A partial outage in which most queries fail (more than half of the last 60 s) escalates
 *      after ESCALATION, because the scattered successes leave the window mostly failing.
 *   d) After recovery the level drops back to warn at once: error needs a failure within the
 *      last 60 s, and the first success that finds the window mostly healthy (or empty of
 *      failures) closes the episode.
 *
 * Failures more than EPISODE_IDLE_MS apart with no success between them are two episodes, not
 * one outage: two drops hours apart on a quiet site each start with a warn.
 *
 * State is a few numbers per process: the episode start, the last failure, and success and
 * failure counts in a six-slot ring of ten-second slots. Leaf module, no imports, so the
 * logger, the pool and the error rule can all read it. Every function takes `now` so a clock
 * can be injected.
 */

/** How long a database must stay unhealthy before its failures are errors. */
export const DATABASE_OUTAGE_ESCALATION_MS = 30_000;

/** An episode with no failure for this long is over even if no success was seen (no traffic). */
const EPISODE_IDLE_MS = 10 * 60_000;

/** Failures and successes are counted over the last SLOT_MS * SLOTS (60 s). */
const SLOT_MS = 10_000;
const SLOTS = 6;

const failures = new Array<number>(SLOTS).fill(0);
const successes = new Array<number>(SLOTS).fill(0);
let currentSlot = 0;
let episodeStart: number | null = null;
let lastFailureAt = 0;

/** Moves the ring to `now`, clearing every slot that has aged out. */
function advance(now: number): number {
  const slot = Math.floor(now / SLOT_MS);
  if (slot < currentSlot) return currentSlot % SLOTS;
  const steps = Math.min(slot - currentSlot, SLOTS);
  for (let i = 1; i <= steps; i++) {
    failures[(currentSlot + i) % SLOTS] = 0;
    successes[(currentSlot + i) % SLOTS] = 0;
  }
  currentSlot = slot;
  return slot % SLOTS;
}

const sum = (counts: number[]) => counts.reduce((a, b) => a + b, 0);

export function noteDatabaseUnreachable(now: number = Date.now()): void {
  failures[advance(now)]++;
  if (episodeStart === null || now - lastFailureAt > EPISODE_IDLE_MS) episodeStart = now;
  lastFailureAt = now;
}

export function noteDatabaseReachable(now: number = Date.now()): void {
  successes[advance(now)]++;
  const failed = sum(failures);
  if (episodeStart !== null && (failed === 0 || failed <= sum(successes))) episodeStart = null;
}

/** warn for a transient drop, error once the database has stayed unhealthy past the escalation window. */
export function databaseOutageLevel(now: number = Date.now()): "warn" | "error" {
  const sustained =
    episodeStart !== null &&
    now - lastFailureAt <= SLOT_MS * SLOTS &&
    now - episodeStart >= DATABASE_OUTAGE_ESCALATION_MS;
  return sustained ? "error" : "warn";
}
