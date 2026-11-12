import type { PoolClient } from "pg";
import { pool } from "./db";
import { classifyDatabaseError } from "./ops/operationalTelemetry";
import {
  getMigrationBootState,
  migrationsAreReady,
} from "./ops/bootState";

const ACQUIRE_TIMEOUT_MS = 750;
const QUERY_TIMEOUT_MS = 500;
const READY_CACHE_MS = 250;

type ProbeResult = {
  ready: boolean;
  durationMs: number;
  checkedAt: string;
  reason?: "database" | "migrations";
  errorClass?: string;
};

let inFlight: Promise<ProbeResult> | null = null;
let lastResult: ProbeResult | null = null;
let lastCompletedAt = 0;

// pool.connect() cannot be cancelled, so a probe that gives up after
// ACQUIRE_TIMEOUT_MS leaves its acquisition holding a pool slot for up to the
// pool's connect timeout. Only one such abandoned acquisition may exist at a
// time; until it settles, probes report not-ready without opening another, so
// repeated probes against a cold database cannot fill the application pool.
let abandonedAcquisition: Promise<unknown> | null = null;

async function acquireProbeClient(): Promise<PoolClient> {
  if (abandonedAcquisition) {
    throw new Error("readiness pool acquisition still pending from an earlier probe");
  }
  const acquisition = pool.connect();
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      acquisition,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("readiness pool acquisition timeout")),
          ACQUIRE_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error) {
    // If the late client arrives after our deadline, release it immediately.
    const abandoned = acquisition
      .then((client) => client.release())
      .catch(() => undefined)
      .finally(() => {
        if (abandonedAcquisition === abandoned) abandonedAcquisition = null;
      });
    abandonedAcquisition = abandoned;
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runProbe(): Promise<ProbeResult> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  if (!migrationsAreReady()) {
    return {
      ready: false,
      reason: "migrations",
      durationMs: Date.now() - startedAt,
      checkedAt,
    };
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;
  try {
    client = await acquireProbeClient();
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query(`SET LOCAL statement_timeout = '${QUERY_TIMEOUT_MS}ms'`);
    await client.query(`SET LOCAL lock_timeout = '${QUERY_TIMEOUT_MS}ms'`);
    // Deliberately touch a critical catalog table: SELECT 1 would stay green
    // while an ACCESS EXCLUSIVE lock makes the application unusable.
    await client.query("SELECT id FROM resources LIMIT 1");
    await client.query("ROLLBACK");
    transactionStarted = false;
    return {
      ready: true,
      durationMs: Date.now() - startedAt,
      checkedAt,
    };
  } catch (error) {
    if (client && transactionStarted) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    return {
      ready: false,
      reason: "database",
      errorClass: classifyDatabaseError(error),
      durationMs: Date.now() - startedAt,
      checkedAt,
    };
  } finally {
    client?.release();
  }
}

export async function checkReadiness(): Promise<ProbeResult> {
  if (lastResult && Date.now() - lastCompletedAt < READY_CACHE_MS) {
    return lastResult;
  }
  if (inFlight) return inFlight;
  inFlight = runProbe()
    .then((result) => {
      lastResult = result;
      lastCompletedAt = Date.now();
      return result;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export function getReadinessSnapshot() {
  return {
    migrations: getMigrationBootState(),
    lastProbe: lastResult ? { ...lastResult } : null,
    probeInFlight: !!inFlight,
    policy: {
      acquireTimeoutMs: ACQUIRE_TIMEOUT_MS,
      queryTimeoutMs: QUERY_TIMEOUT_MS,
    },
  };
}