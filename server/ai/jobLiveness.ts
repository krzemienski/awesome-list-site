import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { and, eq, isNull, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Cross-instance liveness for long-running AI jobs (enrichment + research).
 *
 * A job row records the process that owns it (`worker_id`) and a heartbeat
 * (`heartbeat_at`) refreshed while it runs. Reclaim decisions use that instead
 * of the job's age, so a job orphaned by a restart is reclaimable as soon as
 * its owner is known to be gone — never a fixed multi-minute 409 window — while
 * a job owned by a live sibling Autoscale instance is never stolen.
 *
 * Worker id format: `<containerId>:<pid>:<bootNonce>`.
 *  - containerId is a random id persisted in the container's tmp dir, shared
 *    by every process in the same container (a workflow/server restart keeps
 *    it; a new container gets a fresh one). Hostnames are NOT used: serverless
 *    containers commonly share a hostname such as "localhost".
 *  - On the SAME container, a dead owner pid (ESRCH) proves the owner is gone
 *    → immediate reclaim.
 *  - On a different container, only a stale heartbeat proves it.
 */

export const HEARTBEAT_INTERVAL_MS = 10_000;
/** A heartbeat older than this means the owner stopped refreshing it. */
export const HEARTBEAT_STALE_MS = 45_000;
/** Rows written before liveness tracking (no worker_id) keep the old age rule. */
export const LEGACY_ORPHAN_THRESHOLD_MS = 5 * 60 * 1000;

export const ORPHANED_BY_RESTART_MESSAGE = "Orphaned by server restart";

function resolveContainerId(): string {
  const file = path.join(os.tmpdir(), ".awesome-video-worker-container-id");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    if (/^[0-9a-f-]{8,64}$/i.test(existing)) return existing;
  } catch {
    /* first process in this container */
  }
  const fresh = randomUUID();
  try {
    // wx: never clobber an id another process wrote concurrently.
    fs.writeFileSync(file, fresh, { flag: "wx" });
    return fresh;
  } catch {
    try {
      const raced = fs.readFileSync(file, "utf8").trim();
      if (/^[0-9a-f-]{8,64}$/i.test(raced)) return raced;
    } catch {
      /* unreadable tmp dir */
    }
  }
  // Unique per process: same-container death detection is simply unavailable
  // and reclaim falls back to heartbeat staleness (safe, just slower).
  return `p-${fresh}`;
}

const CONTAINER_ID = resolveContainerId();
const BOOT_NONCE = randomUUID().slice(0, 8);

/** Identity of THIS process, stamped on every job row it owns. */
export const WORKER_ID = `${CONTAINER_ID}:${process.pid}:${BOOT_NONCE}`;

interface ParsedWorkerId {
  containerId: string;
  pid: number;
  bootNonce: string;
}

function parseWorkerId(workerId: string): ParsedWorkerId | null {
  const parts = workerId.split(":");
  if (parts.length !== 3) return null;
  const pid = Number(parts[1]);
  if (!Number.isInteger(pid) || pid <= 0) return null;
  return { containerId: parts[0], pid, bootNonce: parts[2] };
}

/**
 * True only when the owning process is PROVABLY gone: it ran in this same
 * container and its pid no longer exists (or the pid is ours but from an
 * earlier boot). Anything uncertain returns false.
 */
export function isWorkerDefinitelyDead(workerId: string | null | undefined): boolean {
  if (!workerId || workerId === WORKER_ID) return false;
  const owner = parseWorkerId(workerId);
  if (owner?.containerId !== CONTAINER_ID || CONTAINER_ID.startsWith("p-")) return false;
  if (owner.pid === process.pid) return owner.bootNonce !== BOOT_NONCE;
  try {
    process.kill(owner.pid, 0);
    return false; // a live process holds that pid (possibly reused) — not provable
  } catch (err: unknown) {
    return (err as NodeJS.ErrnoException | null)?.code === "ESRCH";
  }
}

export interface LivenessRow {
  workerId: string | null;
  heartbeatAt: Date | null;
  startedAt: Date | null;
  createdAt: Date | null;
}

/**
 * Whether an active (pending/processing) job row has lost its worker.
 * `locallyOwned` = a live in-process worker in THIS process holds the job.
 */
export function isJobOrphaned(row: LivenessRow, locallyOwned: boolean, now = Date.now()): boolean {
  if (locallyOwned) return false;
  if (row.workerId) {
    if (isWorkerDefinitelyDead(row.workerId)) return true;
    const beat = row.heartbeatAt ?? row.startedAt ?? row.createdAt;
    return !beat || now - new Date(beat).getTime() > HEARTBEAT_STALE_MS;
  }
  const since = row.startedAt ?? row.createdAt;
  return !since || now - new Date(since).getTime() > LEGACY_ORPHAN_THRESHOLD_MS;
}

/**
 * Refresh a job's heartbeat every HEARTBEAT_INTERVAL_MS while it runs.
 * `beat` returns the row's current status after the refresh attempt, or null
 * when the row no longer exists. When the row has left the active states
 * (cancelled from another instance, or reclaimed as orphaned) `onLost` fires
 * once so the worker can stop. DB errors are logged and retried next tick.
 */
/**
 * WHERE fragment for an orphan flip: the row must still carry exactly the
 * owner and heartbeat the liveness verdict was based on. A heartbeat written
 * between the SELECT and the UPDATE means the worker is alive, and the flip
 * then matches nothing instead of reclaiming a live paid run.
 */
export function livenessUnchangedSince(
  cols: { workerId: AnyPgColumn; heartbeatAt: AnyPgColumn },
  row: Pick<LivenessRow, "workerId" | "heartbeatAt">,
): SQL {
  const sameWorker = row.workerId == null ? isNull(cols.workerId) : eq(cols.workerId, row.workerId);
  const sameBeat = row.heartbeatAt == null ? isNull(cols.heartbeatAt) : eq(cols.heartbeatAt, row.heartbeatAt);
  return and(sameWorker, sameBeat)!;
}

export function startJobHeartbeat(opts: {
  label: string;
  beat: () => Promise<string | null>;
  onLost: (status: string | null) => void;
}): () => void {
  let stopped = false;
  let inFlight = false;
  let warned = false;
  const timer = setInterval(() => {
    if (stopped || inFlight) return;
    inFlight = true;
    opts
      .beat()
      .then((status) => {
        if (stopped) return;
        if (status !== "pending" && status !== "processing") {
          stopped = true;
          clearInterval(timer);
          opts.onLost(status);
        }
      })
      .catch((err: unknown) => {
        if (!warned) {
          warned = true;
          console.warn(`[${opts.label}] heartbeat failed (will retry):`, err instanceof Error ? err.message : err);
        }
      })
      .finally(() => {
        inFlight = false;
      });
  }, HEARTBEAT_INTERVAL_MS);
  timer.unref?.();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
