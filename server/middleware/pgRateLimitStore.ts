import pkg from "pg";
import type { Store, Options, IncrementResponse, ClientRateLimitInfo } from "express-rate-limit";
import { MemoryStore } from "express-rate-limit";

const { Pool } = pkg;

/**
 * Postgres-backed store for express-rate-limit (Task #279).
 *
 * WHY: production Autoscale runs several instances, and the library's default
 * MemoryStore is per-process — prod verification for task 268 showed a
 * single-IP burst of 260 requests against a documented 240/min limit never
 * tripped 429 because the hits were spread across instances (each instance
 * saw only a fraction). Every limiter in the app now shares ONE fixed-window
 * counter per (limiter, client) in the `rate_limit_hits` table, so the
 * documented limit is the real global limit no matter how many instances are
 * serving, and the RateLimit-* headers computed from `totalHits`/`resetTime`
 * are accurate cluster-wide.
 *
 * DESIGN:
 * - Fixed window via a single atomic INSERT ... ON CONFLICT upsert that
 *   rolls the window when `reset_at` has passed (one round-trip per request).
 * - Dedicated tiny pool (max 2) so limiter traffic can never starve the main
 *   app pool (server/db keeps max 3 for Neon).
 * - FAIL-OPEN with a circuit breaker: if Postgres errors or the query exceeds
 *   QUERY_TIMEOUT_MS, the store falls back to a per-process MemoryStore for
 *   BREAKER_OPEN_MS. Degraded mode = the old per-instance semantics (still
 *   throttles bursts hitting one instance); a DB blip must never 429 or block
 *   legitimate traffic, and must never wedge requests behind a dead DB.
 * - Expired rows are garbage-collected opportunistically (~1 in 500
 *   increments deletes rows whose window ended over an hour ago).
 */

const QUERY_TIMEOUT_MS = 2000;
const BREAKER_OPEN_MS = 30_000;
const GC_PROBABILITY = 1 / 500;

// One shared pool + breaker across every PgRateLimitStore instance (a store
// is created per limiter — and per request for the dynamic tier limiter).
let sharedPool: InstanceType<typeof Pool> | null = null;
let breakerOpenUntil = 0;
let lastBreakerLogAt = 0;

function getPool(): InstanceType<typeof Pool> {
  if (!sharedPool) {
    sharedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: QUERY_TIMEOUT_MS,
      // Server-side guard so a stuck statement can't hold a slot beyond the
      // client-side race timeout.
      statement_timeout: QUERY_TIMEOUT_MS,
    });
    sharedPool.on("error", (err) => {
      console.error("[rate-limit] pg pool error:", err.message);
    });
  }
  return sharedPool;
}

function openBreaker(reason: string): void {
  breakerOpenUntil = Date.now() + BREAKER_OPEN_MS;
  // Log at most once per breaker window to avoid flooding during an outage.
  if (Date.now() - lastBreakerLogAt > BREAKER_OPEN_MS) {
    lastBreakerLogAt = Date.now();
    console.error(
      `[rate-limit] Postgres store unavailable (${reason}); ` +
        `falling back to per-instance in-memory limiting for ${BREAKER_OPEN_MS / 1000}s`,
    );
  }
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("query timeout")), QUERY_TIMEOUT_MS);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export class PgRateLimitStore implements Store {
  /** Keys are NOT local to this process — counters are shared via Postgres. */
  localKeys = false;

  /**
   * Distinct prefix per limiter. With localKeys=false, express-rate-limit's
   * ERR_ERL_DOUBLE_COUNT validation groups stores by constructor NAME, so the
   * layered limiters on one route (login burst + auth cluster + backstop) all
   * look like one store double-counting the same IP unless prefixes differ.
   */
  prefix: string;

  private limiterName: string;
  private windowMs = 60_000;
  /** Per-instance degraded-mode fallback while the breaker is open. */
  private fallback = new MemoryStore();

  constructor(limiterName: string) {
    this.limiterName = limiterName;
    this.prefix = `${limiterName}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    this.fallback.init(options);
  }

  async increment(key: string): Promise<IncrementResponse> {
    if (Date.now() < breakerOpenUntil) {
      return this.fallback.increment(key);
    }
    try {
      const result = await withTimeout(
        getPool().query(
          `INSERT INTO rate_limit_hits (limiter, key, hits, reset_at)
           VALUES ($1, $2, 1, now() + ($3 || ' milliseconds')::interval)
           ON CONFLICT (limiter, key) DO UPDATE SET
             hits = CASE WHEN rate_limit_hits.reset_at <= now()
                         THEN 1 ELSE rate_limit_hits.hits + 1 END,
             reset_at = CASE WHEN rate_limit_hits.reset_at <= now()
                             THEN now() + ($3 || ' milliseconds')::interval
                             ELSE rate_limit_hits.reset_at END
           RETURNING hits, reset_at`,
          [this.limiterName, key.slice(0, 256), String(this.windowMs)],
        ),
      );
      this.maybeGc();
      const row = result.rows[0];
      return { totalHits: Number(row.hits), resetTime: new Date(row.reset_at) };
    } catch (err: any) {
      openBreaker(err?.message ?? "unknown error");
      return this.fallback.increment(key);
    }
  }

  async decrement(key: string): Promise<void> {
    if (Date.now() < breakerOpenUntil) {
      return this.fallback.decrement(key);
    }
    try {
      await withTimeout(
        getPool().query(
          `UPDATE rate_limit_hits SET hits = GREATEST(hits - 1, 0)
           WHERE limiter = $1 AND key = $2`,
          [this.limiterName, key.slice(0, 256)],
        ),
      );
    } catch (err: any) {
      openBreaker(err?.message ?? "unknown error");
    }
  }

  async resetKey(key: string): Promise<void> {
    this.fallback.resetKey(key);
    try {
      await withTimeout(
        getPool().query(
          `DELETE FROM rate_limit_hits WHERE limiter = $1 AND key = $2`,
          [this.limiterName, key.slice(0, 256)],
        ),
      );
    } catch (err: any) {
      openBreaker(err?.message ?? "unknown error");
    }
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    if (Date.now() < breakerOpenUntil) {
      return this.fallback.get(key);
    }
    try {
      const result = await withTimeout(
        getPool().query(
          `SELECT hits, reset_at FROM rate_limit_hits
           WHERE limiter = $1 AND key = $2 AND reset_at > now()`,
          [this.limiterName, key.slice(0, 256)],
        ),
      );
      const row = result.rows[0];
      if (!row) return undefined;
      return { totalHits: Number(row.hits), resetTime: new Date(row.reset_at) };
    } catch (err: any) {
      openBreaker(err?.message ?? "unknown error");
      return this.fallback.get(key);
    }
  }

  /** Opportunistic cleanup of long-expired windows (fire-and-forget). */
  private maybeGc(): void {
    if (Math.random() >= GC_PROBABILITY) return;
    getPool()
      .query(`DELETE FROM rate_limit_hits WHERE reset_at < now() - interval '1 hour'`)
      .catch((err) => console.error("[rate-limit] GC failed:", err.message));
  }
}
