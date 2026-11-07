/**
 * In-memory tally of error-level log records since boot, grouped by a
 * normalised signature (`area: message template`). The logger feeds it from the
 * single place that emits records; /api/ops/signals reads it. Counts and
 * timestamps only: the signature is built from the already-scrubbed message
 * with ids, numbers and URLs removed.
 */

const MAX_SIGNATURES = 200;
const OVERFLOW_SIGNATURE = "(other signatures)";
const MAX_SIGNATURE_LENGTH = 160;

interface Tally {
  count: number;
  lastAt: string;
}

const tallies = new Map<string, Tally>();
let total = 0;

export function errorSignature(area: string, message: string): string {
  const template = message
    .replace(/https?:\/\/\S+/gi, "<url>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>")
    .replace(/\b[0-9a-f]{12,}\b/gi, "<id>")
    .replace(/\d+/g, "<n>")
    .replace(/\s+/g, " ")
    .trim();
  return `${area}: ${template}`.slice(0, MAX_SIGNATURE_LENGTH);
}

export function recordErrorSignature(area: string, message: string, at: string): void {
  total++;
  let key = errorSignature(area, message);
  if (!tallies.has(key) && tallies.size >= MAX_SIGNATURES) key = OVERFLOW_SIGNATURE;
  const tally = tallies.get(key) ?? { count: 0, lastAt: at };
  tally.count++;
  tally.lastAt = at;
  tallies.set(key, tally);
}

export function getErrorSignatureSnapshot(top = 20) {
  const signatures = [...tallies.entries()]
    .map(([signature, { count, lastAt }]) => ({ signature, count, lastAt }))
    .sort((a, b) => b.count - a.count || a.signature.localeCompare(b.signature))
    .slice(0, top);
  return { total, signatures };
}
