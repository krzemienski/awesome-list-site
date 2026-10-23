import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '../../shared/schema';
import {
  queryCommand,
  recordDatabaseQuery,
  recordPoolError,
  recordPoolSnapshot,
} from '../ops/operationalTelemetry';
import { isDatabaseUnavailableError } from './errors';
import { markRequestDatabaseUnavailable } from '../ops/requestContext';
import { createLogger } from "../lib/logger";

const logger = createLogger("db");

// Create PostgreSQL connection pool for Neon serverless.
//
// Task #327 pool sizing, justified against measured endpoint concurrency:
// - One faceted listing (ResourceRepository.listResources) runs THREE
//   concurrent queries (count + page + facets via Promise.all), so the old
//   max=3 let a SINGLE request occupy the whole pool and a handful of
//   concurrent listings exhaust it (3s acquisition timeouts under burst).
// - A cold catalog-tree rebuild takes 4 sequential queries; taxonomy loaders
//   add 1-2 more. max=8 lets ~2-3 faceted listings plus background work
//   overlap without queueing anywhere near the 3s acquisition bound
//   (measured with 20 concurrent
//   faceted listings, zero acquisition timeouts).
// - Budget per instance = 8 here + 2 in the rate-limit store's dedicated
//   pool (server/middleware/pgRateLimitStore.ts) = 10; even several
//   Autoscale instances stay far below Neon's >100 connection ceiling.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8,
  idleTimeoutMillis: 30000,
  // Bound pool acquisition and server execution. A saturated pool must fail
  // predictably instead of leaving HTTP requests hanging.
  connectionTimeoutMillis: 3000,
  statement_timeout: 8000,
  query_timeout: 10000,
  options: "-c lock_timeout=2000",
  idle_in_transaction_session_timeout: 10000,
});

// Add error handler for connection issues
pool.on('error', (err) => {
  recordPoolError();
  logger.error('Database pool error:', { code: (err as any)?.code ?? 'unknown' });
});

function markTransientRequestFailure(error: unknown): void {
  if (isDatabaseUnavailableError(error)) {
    markRequestDatabaseUnavailable();
  }
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
  // connection-level event and records it.
  client.on('error', (err: unknown) => {
    recordPoolError();
    markTransientRequestFailure(err);
    logger.error('Database client error:', { code: (err as any)?.code ?? 'unknown' });
  });
  const originalQuery = client.query.bind(client);
  client.query = (...args: any[]) => {
    const startedAt = Date.now();
    const command = queryCommand(args[0]);
    const callbackIndex =
      typeof args[args.length - 1] === 'function' ? args.length - 1 : -1;
    let finished = false;
    const finish = (error?: unknown) => {
      if (finished) return;
      finished = true;
      if (error) markTransientRequestFailure(error);
      recordDatabaseQuery(command, Date.now() - startedAt, error);
      recordPoolSnapshot({
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      });
    };

    if (callbackIndex >= 0) {
      const callback = args[callbackIndex];
      args[callbackIndex] = (error: unknown, ...callbackArgs: unknown[]) => {
        finish(error);
        return callback(error, ...callbackArgs);
      };
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
(pool as any).query = (...args: any[]) => {
  const callbackIndex =
    typeof args[args.length - 1] === 'function' ? args.length - 1 : -1;
  if (callbackIndex >= 0) {
    const callback = args[callbackIndex];
    args[callbackIndex] = (error: unknown, ...callbackArgs: unknown[]) => {
      if (error) markTransientRequestFailure(error);
      return callback(error, ...callbackArgs);
    };
  }
  try {
    const result = (originalPoolQuery as any)(...args);
    if (callbackIndex < 0 && result && typeof (result as any).then === 'function') {
      return (result as Promise<unknown>).catch((error) => {
        markTransientRequestFailure(error);
        throw error;
      });
    }
    return result;
  } catch (error) {
    markTransientRequestFailure(error);
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