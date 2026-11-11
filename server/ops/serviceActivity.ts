// Replit Autoscale gives an instance CPU only while it is serving requests. A
// background tick on an idle instance stalls (queries take 7-23 s, connects
// time out), so job ticks run only on instances that served a request lately.
const SERVING_WINDOW_MS = 60_000;

let lastRequestAt = 0;

export function markRequestServed(): void {
  lastRequestAt = Date.now();
}

export function isServingTraffic(now = Date.now()): boolean {
  return lastRequestAt > 0 && now - lastRequestAt <= SERVING_WINDOW_MS;
}
