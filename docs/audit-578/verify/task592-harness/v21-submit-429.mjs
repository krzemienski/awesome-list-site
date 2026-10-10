// V21 — force the shared /api backstop (600 req/min per client IP) to 429 with real guest /api/submit traffic,
// on an ISOLATED instance whose rate_limit_hits table lives in the scratch DB (no shared bucket with :5000 or auditors).
// Same-origin (Origin header) invalid guest submissions: each one is a real request that the backstop counts and
// isAuthenticated rejects with 401, until the limiter answers 429. Then: no inserts, JSON body + Retry-After, recovery.
import fs from "node:fs";
import pg from "pg";
import { spawn } from "node:child_process";
import { writeJson, sleep } from "./lib.mjs";

const DB = process.env.DATABASE_URL ?? "";
if (!/awesome_scratch_592(?!_seed)/.test(DB)) throw new Error("refusing: not the DEV-clone scratch DB");
const BASE = "http://127.0.0.1:5167";
const OUT = "/tmp/v592out/v21-submit-429.json";
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1800)); writeJson(OUT, out); };
const sql = new pg.Pool({ connectionString: DB, max: 2 });
const counts = async () => (await sql.query(`SELECT
  (SELECT count(*) FROM resources)::int AS resources,
  (SELECT count(*) FROM resources WHERE title LIKE '\\_\\_qa\\_test\\_plan\\_592\\_v21%')::int AS v21_resources,
  (SELECT max(id) FROM resources)::int AS max_resource_id,
  (SELECT count(*) FROM resource_audit_log)::int AS audit_rows`)).rows[0];

const fd = fs.openSync("/tmp/scrE-v21.log", "a");
const proc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5167", DISABLE_BACKGROUND_JOBS: "1" } });

const body = JSON.stringify({ title: "__qa_test_plan_592_v21 invalid", url: "not-a-url", description: "", category: "" });
async function submit(extraHeaders = {}) {
  const r = await fetch(`${BASE}/api/submit`, { method: "POST", body,
    headers: { "Content-Type": "application/json", Accept: "application/json", Origin: BASE, ...extraHeaders } });
  const text = await r.text();
  const h = Object.fromEntries(r.headers);
  return { status: r.status, contentType: h["content-type"], retryAfter: h["retry-after"] ?? null,
    rateLimit: h["ratelimit"] ?? null, rateLimitPolicy: h["ratelimit-policy"] ?? null,
    limit: h["ratelimit-limit"] ?? null, remaining: h["ratelimit-remaining"] ?? null, reset: h["ratelimit-reset"] ?? null, body: text.slice(0, 200) };
}

try {
  const t0 = Date.now();
  while (Date.now() - t0 < 150_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  step("booted", { ms: Date.now() - t0 });
  // Start the burst at the top of a fresh window so the 60 s window cannot roll over mid-burst.
  const before = await counts();
  step("before", before);
  const first = await submit();
  step("first-guest-submit", first);

  const tally = {}; let first429 = null; let sent = 1; const tBurst = Date.now();
  while (!first429 && sent < 900) {
    const batch = await Promise.all(Array.from({ length: 25 }, () => submit()));
    sent += batch.length;
    for (const r of batch) { tally[r.status] = (tally[r.status] ?? 0) + 1; if (r.status === 429 && !first429) first429 = r; }
  }
  tally[first.status] = (tally[first.status] ?? 0) + 1;
  step("burst", { sent, ms: Date.now() - tBurst, tally, first429 });

  // While limited: the same bucket also refuses an HTML-accepting client and an unrelated /api read (shared backstop).
  const htmlAccept = await submit({ Accept: "text/html" });
  const navRead = await fetch(`${BASE}/api/awesome-list/nav`).then(async (r) => ({ status: r.status, retryAfter: r.headers.get("retry-after"), body: (await r.text()).slice(0, 120) }));
  step("while-limited", { htmlAccept, navRead });

  const after = await counts();
  step("no-inserts", { before, after, resourcesDelta: after.resources - before.resources, v21Rows: after.v21_resources,
    maxIdUnchanged: after.max_resource_id === before.max_resource_id, auditDelta: after.audit_rows - before.audit_rows });

  // Recovery: wait out Retry-After (+1 s), the next guest submit is back to 401 (not 429), with a fresh budget.
  const wait = (Number(first429?.retryAfter ?? 60) + 1) * 1000;
  step("waiting-for-reset", { waitMs: wait });
  await sleep(wait);
  const recovered = await submit();
  const navAfter = await fetch(`${BASE}/api/awesome-list/nav`).then((r) => r.status);
  step("recovered", { recovered, navAfter });
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  try { process.kill(-proc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-proc.pid, "SIGKILL"); } catch {}
  const residue = (await sql.query(`SELECT count(*)::int n FROM resources WHERE title LIKE '\\_\\_qa\\_test\\_plan\\_592%'`)).rows[0].n;
  const hits = (await sql.query(`SELECT count(*)::int n FROM rate_limit_hits`).catch(() => ({ rows: [{ n: "table n/a" }] }))).rows[0].n;
  step("cleanup", { residueResources: residue, rateLimitHitsRowsInScratch: hits });
  await sql.end(); process.exit(0);
}
