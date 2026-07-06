/**
 * In-memory brute-force lockout for local login.
 *
 * Tracks consecutive failed attempts per email and locks the account for a cooldown
 * window once a threshold is crossed. State lives in a process-local Map, so it is
 * NON-DURABLE: it resets on restart and is not shared across processes/instances. For a
 * single-process deployment this is sufficient to blunt online password guessing; a
 * durable store would be needed for a multi-instance rollout.
 */

const MAX_FAILURES = 5; // lock on the 6th attempt within the window
const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const FAILURE_TTL_MS = 15 * 60 * 1000; // forget stale failure counts after inactivity

interface Attempt {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number; // epoch ms; 0 = not locked
}

const attempts = new Map<string, Attempt>();

function normalize(email: string): string {
  return (email || "").trim().toLowerCase();
}

/** Returns lock status for an email. retryAfterSec is seconds remaining when locked. */
export function checkLock(email: string): { locked: boolean; retryAfterSec: number } {
  const key = normalize(email);
  const rec = attempts.get(key);
  if (!rec) return { locked: false, retryAfterSec: 0 };

  const now = Date.now();
  if (rec.lockedUntil && rec.lockedUntil > now) {
    return { locked: true, retryAfterSec: Math.ceil((rec.lockedUntil - now) / 1000) };
  }

  // Lock expired, or stale failure window — clear so the next attempt starts fresh.
  if (rec.lockedUntil && rec.lockedUntil <= now) {
    attempts.delete(key);
  } else if (now - rec.firstFailureAt > FAILURE_TTL_MS) {
    attempts.delete(key);
  }
  return { locked: false, retryAfterSec: 0 };
}

/** Record a failed login. Engages a lock once MAX_FAILURES is exceeded. */
export function recordFailure(email: string): void {
  const key = normalize(email);
  const now = Date.now();
  const rec = attempts.get(key);

  if (!rec || now - rec.firstFailureAt > FAILURE_TTL_MS) {
    attempts.set(key, { failures: 1, firstFailureAt: now, lockedUntil: 0 });
    return;
  }

  rec.failures += 1;
  if (rec.failures > MAX_FAILURES) {
    rec.lockedUntil = now + LOCK_WINDOW_MS;
  }
  attempts.set(key, rec);
}

/** Clear all failure/lock state for an email after a successful login. */
export function clearOnSuccess(email: string): void {
  attempts.delete(normalize(email));
}

// Test/maintenance helper — not wired to any route.
export function _resetAll(): void {
  attempts.clear();
}

// ---- Forgot-password request throttle -------------------------------------
// Unlike the login lockout above (which counts FAILURES), forgot-password must
// throttle SUCCESSFUL requests: each accepted request sends an email and writes
// a token row, so an unthrottled endpoint is an email/DB-spam vector. Separate
// per-email and per-IP budgets over a sliding 15-minute window. Same in-memory,
// non-durable caveat as the lockout above.
const RESET_MAX_PER_EMAIL = 3;
const RESET_MAX_PER_IP = 15;
const RESET_WINDOW_MS = 15 * 60 * 1000;

interface ResetBucket {
  count: number;
  windowStart: number;
}

const resetByEmail = new Map<string, ResetBucket>();
const resetByIp = new Map<string, ResetBucket>();

function withinBudget(map: Map<string, ResetBucket>, key: string, max: number, now: number): boolean {
  const rec = map.get(key);
  return !rec || now - rec.windowStart > RESET_WINDOW_MS || rec.count < max;
}

function consume(map: Map<string, ResetBucket>, key: string, now: number): void {
  const rec = map.get(key);
  if (!rec || now - rec.windowStart > RESET_WINDOW_MS) {
    map.set(key, { count: 1, windowStart: now });
  } else {
    rec.count += 1;
  }
}

/**
 * Consume one forgot-password request budget for (email, ip). Returns false if
 * EITHER the per-email or per-IP budget is exhausted (and consumes from neither
 * in that case, so a full IP budget can't burn a fresh email's budget). Applied
 * BEFORE any account lookup so throttling never depends on — or leaks — whether
 * the account exists.
 */
export function allowResetRequest(email: string, ip: string): boolean {
  const now = Date.now();
  const e = normalize(email);
  const ipKey = ip || "unknown";
  if (!withinBudget(resetByEmail, e, RESET_MAX_PER_EMAIL, now)) return false;
  if (!withinBudget(resetByIp, ipKey, RESET_MAX_PER_IP, now)) return false;
  consume(resetByEmail, e, now);
  consume(resetByIp, ipKey, now);
  return true;
}
