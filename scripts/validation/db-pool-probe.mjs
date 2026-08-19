#!/usr/bin/env node
/**
 * Task #327 — DB pool concurrency probe.
 *
 * One faceted listing (`/api/resources?...&facets=true`) fans out into
 * THREE concurrent queries (count + page + facets). Under the old pool cap
 * (max=3, 3s acquire timeout) a single request could occupy the entire pool
 * and a burst of listings produced acquisition-timeout 500s. This probe
 * proves the resized pool (max=8) absorbs a realistic burst:
 *
 *   ROUNDS × CONCURRENCY faceted listings, every request cache-busted with a
 *   unique `search` value so each one really hits the database.
 *
 * Each virtual client gets a distinct X-Forwarded-For (the app runs behind
 * `trust proxy: 1`, so from loopback the header is honored) to keep the
 * resource-read limiter (240 req/min/IP) out of the measurement.
 *
 * PASS: zero non-200 responses and zero transport errors/timeouts.
 *
 * Usage: BASE_URL=http://127.0.0.1:5000 node scripts/validation/db-pool-probe.mjs
 */

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5000';
const CONCURRENCY = Number(process.env.PROBE_CONCURRENCY || 20);
const ROUNDS = Number(process.env.PROBE_ROUNDS || 3);
const TIMEOUT_MS = 15_000;

function quantile(sorted, q) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

async function probeOne(round, i, runTag) {
  const search = `poolprobe-${runTag}-${round}-${i}`;
  // `/api/public/resources` intentionally does not expose facets. The
  // catalog endpoint below is the real path whose repository call executes
  // count + page + facets concurrently when facets=true.
  const path = `/api/resources?page=1&limit=24&facets=true&search=${search}`;
  const started = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'X-Forwarded-For': `10.77.${round}.${i + 1}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = performance.now() - started;
    let ok = res.status === 200;
    let note = `HTTP ${res.status}`;
    if (ok) {
      try {
        const json = await res.json();
        if (!Array.isArray(json.resources) || !json.facets) {
          ok = false;
          note = 'malformed faceted payload (missing resources array or facets)';
        }
      } catch { ok = false; note = 'non-JSON 200 body'; }
    } else {
      note = `HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`;
    }
    return { ok, ms, note };
  } catch (e) {
    return { ok: false, ms: performance.now() - started, note: `transport: ${e.name === 'TimeoutError' ? `timeout>${TIMEOUT_MS}ms` : e.message}` };
  }
}

async function main() {
  try {
    await fetch(`${BASE}/api/awesome-list/nav`, { signal: AbortSignal.timeout(5000) });
  } catch {
    console.error(`FATAL: server not reachable at ${BASE}. Start the app workflow first.`);
    process.exit(1);
  }

  const runTag = Date.now().toString(36);
  console.log(`Pool probe against ${BASE}: ${ROUNDS} rounds × ${CONCURRENCY} concurrent faceted listings (each = 3 parallel DB ops)\n`);

  const all = [];
  for (let round = 1; round <= ROUNDS; round++) {
    const started = performance.now();
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) => probeOne(round, i, runTag)),
    );
    const wall = performance.now() - started;
    all.push(...results);
    const fails = results.filter((r) => !r.ok);
    const times = results.map((r) => r.ms).sort((a, b) => a - b);
    console.log(
      `  round ${round}: ${results.length - fails.length}/${results.length} OK  wall=${wall.toFixed(0)}ms  p50=${quantile(times, 0.5).toFixed(0)}ms  p95=${quantile(times, 0.95).toFixed(0)}ms${fails.length ? `  FAILURES: ${fails.map((f) => f.note).join(' | ')}` : ''}`,
    );
  }

  const fails = all.filter((r) => !r.ok);
  const times = all.map((r) => r.ms).sort((a, b) => a - b);
  console.log(`\nTotal: ${all.length - fails.length}/${all.length} OK  p50=${quantile(times, 0.5).toFixed(0)}ms  p75=${quantile(times, 0.75).toFixed(0)}ms  p95=${quantile(times, 0.95).toFixed(0)}ms  max=${times.at(-1).toFixed(0)}ms`);
  if (fails.length) {
    console.error(`\nFAIL: ${fails.length} request(s) failed — pool exhaustion or server errors under burst.`);
    process.exit(1);
  }
  console.log('\nPASS: zero pool-timeout/5xx errors under burst.');
  process.exit(0);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
