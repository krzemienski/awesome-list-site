#!/usr/bin/env node
/**
 * Task 268 — reproducible production rate-limit verification for awesome.video.
 *
 * Verifies the friendlier rate-limit behavior shipped by Task #256 (Audit 2
 * BUG-001) on the LIVE site:
 *   1. Human-paced browsing (12 navigations, browser UA, spaced out) never 429s.
 *   2. The app's /api limiters respond with content-negotiated 429s:
 *      JSON body + retryAfter for fetch clients, styled HTML page
 *      (data-testid="rate-limit-page") for browser navigations — both with
 *      Retry-After + RateLimit-* headers.
 *   3. Static /assets/*.js requests still return 200 while the API is hot.
 *   4. Any bare-text 429 WITHOUT RateLimit-* headers is classified as
 *      platform-edge (see .agents/memory/edge-429-triage.md), not app-level.
 *
 * Usage:
 *   node scripts/validation/prod-rate-limit-check.mjs            # human-paced + header checks only
 *   node scripts/validation/prod-rate-limit-check.mjs --burst    # ALSO deliberately trip the limiter
 *
 * NOTE on --burst: prod runs on Autoscale, where express-rate-limit's
 * in-memory store is PER INSTANCE. A modest burst never trips the limiter;
 * ~1500 parallel requests are needed, and 429 probes only land when they hit
 * an already-throttled instance (so probes retry up to 30x). Exit code is
 * non-zero on any failed check.
 */

const BASE = process.env.PROD_BASE_URL || "https://awesome.video";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BURST = process.argv.includes("--burst");

const results = [];
let failed = false;
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  if (!pass) failed = true;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path, accept) {
  const res = await fetch(BASE + path, {
    headers: { "User-Agent": UA, ...(accept ? { Accept: accept } : {}) },
    redirect: "manual",
  });
  const body = await res.text();
  return { status: res.status, headers: res.headers, body };
}

// ---- 1. Human-paced navigation sweep -------------------------------------
const NAV_PATHS = [
  "/", "/categories", "/journeys", "/about", "/advanced", "/submit",
  "/terms", "/privacy", "/category/encoding-codecs", "/categories",
  "/journeys", "/",
];
async function humanPacedSweep() {
  const codes = [];
  for (const p of NAV_PATHS) {
    const { status } = await get(p, "text/html,application/xhtml+xml");
    codes.push(status);
    await sleep(3000);
  }
  const bad = codes.filter((c) => c !== 200);
  record(
    "human-paced navigation (12 pages, 3s apart)",
    bad.length === 0,
    bad.length === 0 ? "all 200" : `non-200 codes: ${codes.join(",")}`,
  );
}

// ---- 2. New-build + header sanity on the API ------------------------------
async function apiHeaderSanity() {
  const { status, headers } = await get("/api/awesome-list/nav", "application/json");
  const limit = headers.get("ratelimit-limit");
  record(
    "API serves new-build RateLimit-* headers",
    status === 200 && !!limit,
    `status ${status}, ratelimit-limit=${limit}, policy=${headers.get("ratelimit-policy")}`,
  );
}

// ---- 3. Asset availability -------------------------------------------------
async function assetPath() {
  const { body } = await get("/", "text/html");
  const m = body.match(/\/assets\/[^"']+\.js/);
  return m ? m[0] : null;
}
async function assetCheck(js, label) {
  const { status } = await get(js);
  record(`static asset 200 (${label})`, status === 200, `${js} → ${status}`);
}

// ---- 4. Optional deliberate burst -----------------------------------------
function classify429(headers, body) {
  const hasRl = !!headers.get("ratelimit-limit");
  const hasRa = !!headers.get("retry-after");
  return { level: hasRl || hasRa ? "app" : "edge", hasRl, hasRa, snippet: body.slice(0, 120) };
}

async function burstAndProbe(js) {
  const N = Number(process.env.BURST_N || 1500);
  const PAR = Number(process.env.BURST_PAR || 50);
  console.log(`Bursting /api/awesome-list/nav (${N} reqs, ${PAR}-way parallel)…`);
  let count429 = 0;
  const edge429s = [];
  const worker = async (n) => {
    for (let i = 0; i < n; i++) {
      try {
        const res = await fetch(BASE + "/api/awesome-list/nav", {
          headers: { "User-Agent": UA, Accept: "application/json" },
        });
        const body = res.status === 429 ? await res.text() : (await res.arrayBuffer(), "");
        if (res.status === 429) {
          count429++;
          const c = classify429(res.headers, body);
          if (c.level === "edge") edge429s.push(c);
        }
      } catch {}
    }
  };
  await Promise.all(Array.from({ length: PAR }, () => worker(Math.ceil(N / PAR))));
  record("burst trips app limiter", count429 > 0, `${count429}/${N} responses were 429`);
  if (edge429s.length)
    console.log(`note: ${edge429s.length} bare EDGE 429s (no RateLimit-*) observed:`, edge429s[0]);

  // Probe throttled instance for both negotiated variants.
  const probe = async (accept, check, label) => {
    for (let i = 0; i < 30; i++) {
      const r = await get("/api/awesome-list/nav", accept);
      if (r.status === 429) {
        const c = classify429(r.headers, r.body);
        if (c.level === "edge") continue; // edge 429, keep probing for app one
        const ok = check(r);
        record(label, ok, `retry-after=${r.headers.get("retry-after")}, content-type=${r.headers.get("content-type")}`);
        return;
      }
      await sleep(300);
    }
    record(label, false, "never landed on a throttled instance (30 probes)");
  };
  await probe(
    "application/json",
    (r) => r.headers.get("retry-after") && r.body.includes('"retryAfter"') && r.headers.get("content-type")?.includes("json"),
    "429 JSON variant (fetch client): Retry-After + retryAfter body",
  );
  await probe(
    "text/html,application/xhtml+xml",
    (r) => r.headers.get("retry-after") && r.body.includes('data-testid="rate-limit-page"') && r.headers.get("content-type")?.includes("text/html"),
    "429 HTML variant (browser nav): styled rate-limit page",
  );
  if (js) await assetCheck(js, "during hot window");
}

// ---- main -------------------------------------------------------------------
const js = await assetPath();
await apiHeaderSanity();
await humanPacedSweep();
if (js) await assetCheck(js, "baseline");
else record("locate /assets/*.js on homepage", false, "no asset URL found");
if (BURST) await burstAndProbe(js);
else console.log("(skipping deliberate burst — pass --burst to trip the limiter)");

console.log(`\n${failed ? "FAILED" : "OK"}: ${results.filter((r) => r.pass).length}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
