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

// Create PostgreSQL connection with limited pool for Neon serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3, // Conservative limit for Neon free tier
  idleTimeoutMillis: 30000,
  // Bound pool acquisition and server execution. A blocked three-connection
  // pool must fail predictably instead of leaving HTTP requests hanging.
  connectionTimeoutMillis: 3000,
  statement_timeout: 8000,
  query_timeout: 10000,
  options: "-c lock_timeout=2000",
  idle_in_transaction_session_timeout: 10000,
});

// Add error handler for connection issues
pool.on('error', (err) => {
  recordPoolError();
  console.error('Database pool error:', { code: (err as any)?.code ?? 'unknown' });
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

// Create Drizzle ORM instance
export const db = drizzle(pool, { schema });

// Export pool for connection testing
export { pool };