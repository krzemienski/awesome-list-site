import { AsyncLocalStorage, AsyncResource } from 'node:async_hooks';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import type { PoolClient } from 'pg';
const { Pool } = pkg;
import * as schema from '../../shared/schema';
import {
  queryCommand,
  recordDatabaseQuery,
  recordPoolError,
  recordPoolSnapshot,
} from '../ops/operationalTelemetry';
import { isDatabaseUnavailableError, logDatabaseError } from './errors';
import { markRequestDatabaseUnavailable, startRequestDatabaseOperation } from '../ops/requestContext';
import type { RequestDatabaseOperation } from '../ops/requestContext';
import { noteDatabaseReachable, noteDatabaseUnreachable } from './outage';
import { createLogger } from "../lib/logger";
import { DB_CONNECT_TIMEOUT_MS } from "./connect-timeout";

const logger = createLogger("db");

// Create PostgreSQL connection pool for Neon serverless.
//
// Task #327 pool sizing, justified against measured endpoint concurrency:
// - One faceted listing (ResourceRepository.listResources) runs THREE
//   concurrent queries (count + page + facets via Promise.all), so the old
//   max=3 let a SINGLE request occupy the whole pool and a handful of
//   concurrent listings exhaust it (8s acquisition timeouts under burst).
// - A cold catalog-tree rebuild takes 4 sequential queries; taxonomy loaders
//   add 1-2 more. max=8 lets ~2-3 faceted listings plus background work
//   overlap without queueing anywhere near the 8s acquisition bound
//   (measured with 20 concurrent
//   faceted listings, zero acquisition timeouts).
// - Budget per instance = 8 here + 2 in the rate-limit store's dedicated
//   pool (server/middleware/pgRateLimitStore.ts) = 10; even several
//   Autoscale instances stay far below Neon's >100 connection ceiling.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  // Keep one client warm so the first request after a quiet spell does not pay
  // a fresh Neon connect (idle clients above the floor drop after 30 s).
  min: 1,
  idleTimeoutMillis: 30000,
  // pg sets TCP keepalive only when asked (Client defaults keepAlive to false).
  // The warm min client and any idle client sit silent between bursts; a proxy or
  // NAT that drops a silent socket leaves it looking open, so the next query hangs
  // to query_timeout (10.3-11.3 s "Query read timeout" in production) or all idle
  // sockets die at once ("Connection terminated unexpectedly", 2026-11-12 22:39Z).
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Bound pool acquisition and server execution. A saturated pool must fail
  // predictably instead of leaving HTTP requests hanging. pg also applies this
  // value to a NEW client's TCP+TLS+startup.
  connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
  statement_timeout: 8000,
  query_timeout: 10000,
  options: "-c lock_timeout=2000",
  idle_in_transaction_session_timeout: 10000,
});

// Add error handler for connection issues
// The pool emits this only for an idle client. A server-side drop (restart, scale to zero,
// reaped socket) is a normal state, not a fault: pg-pool discards the client and the next
// query opens a fresh one, so it logs at warn. Anything else stays an error.
pool.on('error', (err) => {
  recordPoolError();
  logDatabaseError(logger, 'Database pool error:', err);
});

// A failed query is seen twice: by the client wrapper (finish) and by the pool.query wrapper that
// also sees acquisition failures no client wrapper can. The outage tracker counts each error once.
// Request-owned work is noted once after response close and all operations settle
// (ops/requestContext.ts); other work, including new post-outcome operations, is noted per query.
const notedFailures = new WeakSet<object>();

// A ROLLBACK that fails after its transaction's connection died is the same incident, not a second one.
function markTransientRequestFailure(
  error: unknown,
  followsFailure = false,
  requestOperation?: RequestDatabaseOperation,
): void {
  if (!isDatabaseUnavailableError(error)) return;
  if (requestOperation) requestOperation.markUnavailable();
  else markRequestDatabaseUnavailable();
  if (requestOperation || followsFailure) return;
  if (error && typeof error === 'object') {
    if (notedFailures.has(error)) return;
    notedFailures.add(error);
  }
  noteDatabaseUnreachable();
}

// Instrument the actual pg clients used by both pool.query() and Drizzle
// transactions. Only the SQL command is retained; SQL text, parameters,
// connection strings, and row data are never logged or exposed.
pool.on('connect', (client: any) => {
  // A checked-out client (e.g. mid-Drizzle-transaction) that receives a
  // server-side FATAL (25P03 idle-in-transaction timeout, Neon connection
  // termination) emits 'error' on the Client itself, not the pool. Without a
  // listener that unhandled 'error' event crashes the whole process — seen
  // under full validation-gate load. The in-flight query still rejects
  // through the normal promise path; this listener only absorbs the
  // connection-level event and records it. It must not flag the request: an
  // EventEmitter listener runs in the async context the socket was opened under,
  // which may be a different request than the one using the client now. That
  // request learns of the failure from its own query rejection (finish() below).
  client.on('error', (err: unknown) => {
    recordPoolError();
    // A query running on this client rejects through its own path and is reported there.
    logDatabaseError(logger, 'Database client error:', err);
  });
  const originalQuery = client.query.bind(client);
  client.query = (...args: any[]) => {
    const startedAt = Date.now();
    const requestOperation = startRequestDatabaseOperation();
    const command = queryCommand(args[0]);
    const callbackIndex =
      typeof args[args.length - 1] === 'function' ? args.length - 1 : -1;
    let finished = false;
    const finish = (error?: unknown) => {
      if (finished) return;
      finished = true;
      if (error) markTransientRequestFailure(error, command === 'rollback', requestOperation);
      else if (!requestOperation) noteDatabaseReachable();
      requestOperation?.finish(!error);
      recordDatabaseQuery(command, Date.now() - startedAt, error);
      recordPoolSnapshot({
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      });
    };

    if (callbackIndex >= 0) {
      const callback = args[callbackIndex];
      // pg-pool runs a callback-style query's completion in the async context
      // of whichever request opened the pooled socket, so a slow query would be
      // logged (and a transient failure flagged) under that request. Bind the
      // wrapper to the context of the call.
      args[callbackIndex] = AsyncResource.bind((error: unknown, ...callbackArgs: unknown[]) => {
        finish(error);
        return callback(error, ...callbackArgs);
      });
    }

    try {
      const result = originalQuery(...args);
      if (callbackIndex < 0 && result && typeof result.then === 'function') {
        return result.then(
          (value: unknown) => {
            finish();
            return value;
          },
          (error: unknown) => {
            finish(error);
            throw error;
          },
        );
      }
      return result;
    } catch (error) {
      finish(error);
      throw error;
    }
  };
});

// A pool-acquisition timeout occurs before a client exists, so the client
// wrapper above cannot observe it. Wrap pool.query only to propagate those
// failures into the current request context; successful query instrumentation
// remains exclusively client-level to avoid double-counting.
const originalPoolQuery = pool.query.bind(pool);

// pool.query() acquires its client through this.connect(cb). A caller that has
// to queue gets its callback invoked from whichever request releases a client,
// so the query would be dispatched, timed and logged under that request's
// context. Run connect callbacks in the context of the caller that asked.
const originalPoolConnect = pool.connect.bind(pool) as (cb?: unknown) => unknown;

export function startReadinessAcquisition() {
  // The readiness deadline and pg's late rejection are one outcome, with different errors.
  const requestOperation = startRequestDatabaseOperation();
  let failureNoted = false;
  const noteFailure = (error: unknown): void => {
    if (failureNoted) return;
    failureNoted = true;
    markTransientRequestFailure(error, false, requestOperation);
  };
  let acquisition: Promise<PoolClient>;
  try {
    acquisition = (originalPoolConnect() as Promise<PoolClient>).catch((error: unknown) => {
      noteFailure(error);
      throw error;
    }).finally(() => requestOperation?.finish());
  } catch (error) {
    noteFailure(error);
    requestOperation?.finish();
    throw error;
  }
  return { acquisition, noteFailure };
}

// The promise form (Drizzle transactions, pool.connect() in routes) fails before any client
// exists, so its rejection is noted here like pool.query's.
(pool as unknown as { connect: typeof originalPoolConnect }).connect = (cb) => {
  const requestOperation = startRequestDatabaseOperation();
  try {
    if (typeof cb === 'function') {
      return originalPoolConnect(AsyncResource.bind((error: unknown, ...callbackArgs: unknown[]) => {
        try {
          if (error) markTransientRequestFailure(error, false, requestOperation);
          const callback = cb as (...args: unknown[]) => unknown;
          return callback(error, ...callbackArgs);
        } finally {
          requestOperation?.finish();
        }
      }));
    }
    return (originalPoolConnect() as Promise<unknown>).catch((error) => {
      markTransientRequestFailure(error, false, requestOperation);
      throw error;
    }).finally(() => requestOperation?.finish());
  } catch (error) {
    markTransientRequestFailure(error, false, requestOperation);
    requestOperation?.finish();
    throw error;
  }
};
(pool as any).query = (...args: any[]) => {
  const requestOperation = startRequestDatabaseOperation();
  const callbackIndex =
    typeof args[args.length - 1] === 'function' ? args.length - 1 : -1;
  let finished = false;
  const finish = (error?: unknown) => {
    if (finished) return;
    finished = true;
    if (error) markTransientRequestFailure(error, false, requestOperation);
    requestOperation?.finish();
  };
  if (callbackIndex >= 0) {
    const callback = args[callbackIndex];
    args[callbackIndex] = AsyncResource.bind((error: unknown, ...callbackArgs: unknown[]) => {
      finish(error);
      return callback(error, ...callbackArgs);
    });
  }
  try {
    const result = (originalPoolQuery as any)(...args);
    if (callbackIndex < 0 && result && typeof (result as any).then === 'function') {
      return (result as Promise<unknown>).then(
        (value) => {
          finish();
          return value;
        },
        (error) => {
          finish(error);
          throw error;
        },
      );
    }
    return result;
  } catch (error) {
    finish(error);
    throw error;
  }
};

const baseDb = drizzle(pool, { schema });
type Database = typeof baseDb;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
interface TransactionScope {
  tx: Transaction;
  open: boolean;
  afterCommit: Array<() => void>;
}
const transactionScope = new AsyncLocalStorage<TransactionScope>();

/**
 * Every repository imports `db`. Inside runInTransaction() it resolves to the
 * open transaction, so a write and its audit row commit or roll back together
 * without threading `tx` through each repository. Work that outlives the scope
 * (un-awaited promises) falls back to the pool once the transaction closes.
 */
export const db: Database = new Proxy(baseDb, {
  get(target, prop) {
    const scope = transactionScope.getStore();
    const active = scope?.open ? (scope.tx as unknown as Database) : target;
    const value = Reflect.get(active, prop, active);
    return typeof value === 'function' ? value.bind(active) : value;
  },
});

export async function runInTransaction<T>(work: () => Promise<T>): Promise<T> {
  if (transactionScope.getStore()?.open) return work();
  let scope: TransactionScope | undefined;
  try {
    const result = await baseDb.transaction((tx) => {
      scope = { tx, open: true, afterCommit: [] };
      return transactionScope.run(scope, work);
    });
    scope!.open = false;
    for (const callback of scope!.afterCommit) callback();
    return result;
  } finally {
    if (scope) scope.open = false;
  }
}

/** Run now, or after the surrounding runInTransaction() commits (never on rollback). */
export function afterCommit(callback: () => void): void {
  const scope = transactionScope.getStore();
  if (scope?.open) scope.afterCommit.push(callback);
  else callback();
}

// Export pool for connection testing
export { pool };