// Replit Autoscale gives an instance CPU only while it is serving requests. A
// background tick on an idle instance stalls (queries take 7-23 s, connects
// time out), so job ticks run only on instances that served a request lately.
const SERVING_WINDOW_MS = 60_000;

/**
 * A freshly booted Autoscale instance is starved for its first ~3 minutes: pool
 * connects time out at 3 s and queries take seconds. Scheduled jobs make their
 * first tick after this delay.
 */
export const POST_BOOT_DELAY_MS = 5 * 60_000;

/** How often a deferred tick re-checks whether the instance is serving traffic. */
export const DEFERRED_TICK_RETRY_MS = 60_000;

let lastRequestAt = 0;

// Platform liveness/readiness probes keep an instance up without giving it CPU
// for real work, so they must not count as traffic.
function isProbePath(path: string): boolean {
  return path === "/api/health" || path.startsWith("/api/health/") || path === "/api/version";
}

export function markRequestServed(path: string): void {
  if (isProbePath(path)) return;
  lastRequestAt = Date.now();
}

export function isServingTraffic(now = Date.now()): boolean {
  return lastRequestAt > 0 && now - lastRequestAt <= SERVING_WINDOW_MS;
}

/**
 * Wraps a job tick so an idle instance defers it instead of dropping it: the
 * tick re-checks every DEFERRED_TICK_RETRY_MS until the instance serves
 * traffic. The next regular tick replaces any pending retry.
 */
export function deferUntilServing(tick: () => void | Promise<void>): () => void {
  let retry: NodeJS.Timeout | null = null;
  const fire = (): void => {
    if (retry) {
      clearTimeout(retry);
      retry = null;
    }
    if (isServingTraffic()) {
      void tick();
      return;
    }
    retry = setTimeout(fire, DEFERRED_TICK_RETRY_MS);
    retry.unref();
  };
  return fire;
}
