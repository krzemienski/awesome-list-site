import { ServiceUnavailableError } from "../middleware/errors";

export type HeavyWorkLabel =
  | "catalog-export"
  | "catalog-validation"
  | "database-export"
  | "github-sync"
  | "link-health"
  | "automatic-seed"
  | "manual-seed";

type Waiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

const MAX_ACTIVE = 1;
const MAX_QUEUED = 2;
const QUEUE_TIMEOUT_MS = 2_000;

let active = 0;
const queue: Waiter[] = [];
const counts = new Map<
  HeavyWorkLabel,
  { started: number; completed: number; failed: number; rejected: number; totalMs: number }
>();
let peakQueued = 0;

function metric(label: HeavyWorkLabel) {
  const value = counts.get(label) ?? {
    started: 0,
    completed: 0,
    failed: 0,
    rejected: 0,
    totalMs: 0,
  };
  counts.set(label, value);
  return value;
}

async function acquire(label: HeavyWorkLabel): Promise<void> {
  if (active < MAX_ACTIVE) {
    active++;
    return;
  }
  if (queue.length >= MAX_QUEUED) {
    metric(label).rejected++;
    throw new ServiceUnavailableError("A heavy operation is already in progress");
  }
  await new Promise<void>((resolve, reject) => {
    const waiter: Waiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = queue.indexOf(waiter);
        if (index >= 0) queue.splice(index, 1);
        metric(label).rejected++;
        reject(new ServiceUnavailableError("Heavy operation capacity is temporarily full"));
      }, QUEUE_TIMEOUT_MS),
    };
    queue.push(waiter);
    peakQueued = Math.max(peakQueued, queue.length);
  });
  active++;
}

function release(): void {
  active = Math.max(0, active - 1);
  const next = queue.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve();
  }
}

export async function runHeavyWork<T>(
  label: HeavyWorkLabel,
  work: () => Promise<T>,
): Promise<T> {
  await acquire(label);
  const startedAt = Date.now();
  const stats = metric(label);
  stats.started++;
  try {
    const result = await work();
    stats.completed++;
    return result;
  } catch (error) {
    stats.failed++;
    throw error;
  } finally {
    stats.totalMs += Date.now() - startedAt;
    release();
  }
}

export async function startHeavyWork(
  label: HeavyWorkLabel,
  work: () => Promise<unknown>,
): Promise<void> {
  await acquire(label);
  const startedAt = Date.now();
  const stats = metric(label);
  stats.started++;
  Promise.resolve()
    .then(work)
    .then(
      () => {
        stats.completed++;
      },
      (error) => {
        stats.failed++;
        console.error(
          JSON.stringify({
            event: "ops.heavy_work_failed",
            label,
            errorClass: error instanceof Error ? error.name : "unknown",
          }),
        );
      },
    )
    .finally(() => {
      stats.totalMs += Date.now() - startedAt;
      release();
    });
}

export function getHeavyWorkSnapshot() {
  return {
    policy: {
      maxActive: MAX_ACTIVE,
      maxQueued: MAX_QUEUED,
      queueTimeoutMs: QUEUE_TIMEOUT_MS,
    },
    active,
    queued: queue.length,
    peakQueued,
    operations: Object.fromEntries(counts.entries()),
  };
}