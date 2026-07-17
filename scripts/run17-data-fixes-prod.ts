/**
 * Run17 data fixes — applied via the live admin HTTP API (prod DB is not
 * directly writable from the agent environment; mirrors
 * scripts/run16-data-fixes-prod.ts). Base-configurable so the exact same
 * code path is validated against dev first (PROD_BASE=http://localhost:5000).
 *
 *  BUG-004: journey 8 steps reference dead/duplicate medium.com mirrors
 *           186146/186147 (prod: hard-404; dev: dup of live twitch.tv
 *           185759/185760). Fix: DELETE those step rows via
 *           DELETE /api/admin/journeys/8/steps/:stepId (group-aware
 *           renumbering happens server-side).
 *  BUG-062: journey 8 lists VCT twice (185310 github + 185466 sourceforge
 *           mirror). Fix: if BOTH are present, delete the 185466 step row.
 *           (The Twitch Part I/Part 2 rows 185759/185760 are DISTINCT
 *           articles — kept.)
 *  BUG-047: learning journey 8 titled "FFMPEG Mastery" -> "FFmpeg Mastery"
 *           (PUT /api/admin/journeys/8).
 *  BUG-026: ~65 prod resources carry the auto-generated placeholder
 *           description "A tool or resource for <slug>." rendered as real
 *           copy. Fix: clear description to "" (ResourceCard omits empty
 *           descriptions; column is NOT NULL DEFAULT ''). Swept via the
 *           admin list search, verified against the exact prefix before
 *           each write.
 *  BUG-057: resource 186159 description is import-truncated mid-word
 *           ("… hosting compe"). Fix: complete the sentence
 *           (PUT /api/admin/resources/186159), only if the truncated tail
 *           is still present.
 *  BUG-061: resource 185850 titled "Awesome Smart Tv" (prod description
 *           also starts with a raw ":zap:" shortcode glued to the text).
 *           Fix: title -> "Awesome Smart TV"; strip leading ":zap:" from
 *           the description if present. Also 185907 "Tv Subtitle
 *           Extraction" -> "TV Subtitle Extraction" for casing consistency.
 *
 * Idempotent: every write is preceded by a live re-check; re-runs are
 * no-ops. Journaled to evidence/run17/data-fixes-<env>.json.
 * Admin password read from ADMIN_PASSWORD env; never logged. Session cookie
 * is captured ONLY from the login response (GAESA affinity cookies ignored).
 *
 * Run AFTER republish: ADMIN_PASSWORD=... npx tsx scripts/run17-data-fixes-prod.ts
 * Dev validation:      PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run17-data-fixes-prod.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const ENV_TAG = BASE.includes("localhost") ? "dev" : "prod";

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set in env — aborting.");
  process.exit(1);
}

const journal: any = { startedAt: new Date().toISOString(), base: BASE, steps: {} };
function log(step: string, entry: any) {
  journal.steps[step] = journal.steps[step] || [];
  journal.steps[step].push(entry);
  console.log(`[${step}]`, JSON.stringify(entry).slice(0, 300));
}

let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(init.headers || {}),
    },
  });
  let body: any = null;
  try {
    body = await r.json();
  } catch {
    /* non-JSON */
  }
  return { status: r.status, body };
}

async function login(): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${BASE}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (r.ok) {
      const setCookies: string[] =
        (r.headers as any).getSetCookie?.() ??
        [r.headers.get("set-cookie")].filter(Boolean);
      const sid = setCookies.find((c) => c.startsWith("connect.sid="));
      if (!sid) throw new Error("login OK but no connect.sid in response");
      cookie = sid.split(";")[0];
      log("login", { attempt, ok: true });
      return;
    }
    log("login", { attempt, status: r.status });
    await new Promise((res) => setTimeout(res, 5000 * attempt));
  }
  throw new Error("login failed after retries");
}

const DEAD_MEDIUM_DUPES = [186146, 186147]; // BUG-004
const VCT_GITHUB = 185310;
const VCT_SOURCEFORGE = 185466; // BUG-062

async function fixJourney8Steps() {
  const { status, body } = await api("/api/admin/journeys/8/steps");
  if (status !== 200) {
    log("BUG-004/062", { error: `list steps -> ${status}` });
    return;
  }
  const steps: any[] = body.steps || body;
  const rids = steps.map((s) => s.resourceId);
  log("BUG-004/062", { before: steps.map((s) => ({ id: s.id, sn: s.stepNumber, rid: s.resourceId })) });

  const toDelete: any[] = steps.filter((s) => DEAD_MEDIUM_DUPES.includes(s.resourceId));
  if (rids.includes(VCT_GITHUB) && rids.includes(VCT_SOURCEFORGE)) {
    toDelete.push(...steps.filter((s) => s.resourceId === VCT_SOURCEFORGE));
  }
  if (toDelete.length === 0) {
    log("BUG-004/062", { noop: "no dead/dup step rows present" });
    return;
  }
  for (const s of toDelete) {
    const del = await api(`/api/admin/journeys/8/steps/${s.id}`, { method: "DELETE" });
    log("BUG-004/062", { deletedStep: s.id, resourceId: s.resourceId, status: del.status });
  }
  const after = await api("/api/admin/journeys/8/steps");
  const arr: any[] = after.body.steps || after.body;
  log("BUG-004/062", { after: arr.map((s) => ({ id: s.id, sn: s.stepNumber, rid: s.resourceId })) });
}

async function fixJourneyTitle() {
  const { status, body } = await api("/api/admin/journeys");
  if (status !== 200) {
    log("BUG-047", { error: `list journeys -> ${status}` });
    return;
  }
  const journeys: any[] = body.journeys || body;
  const j8 = journeys.find((j) => j.id === 8);
  if (!j8) {
    log("BUG-047", { error: "journey 8 not found" });
    return;
  }
  if (j8.title !== "FFMPEG Mastery") {
    log("BUG-047", { noop: `title already "${j8.title}"` });
    return;
  }
  const put = await api("/api/admin/journeys/8", {
    method: "PUT",
    body: JSON.stringify({ title: "FFmpeg Mastery" }),
  });
  log("BUG-047", { status: put.status, newTitle: put.body?.title ?? put.body?.journey?.title });
}

const PLACEHOLDER_PREFIX = "A tool or resource for ";

async function fixPlaceholderDescriptions() {
  const matches: { id: number; description: string }[] = [];
  let page = 1;
  for (;;) {
    const { status, body } = await api(
      `/api/admin/resources?search=${encodeURIComponent(PLACEHOLDER_PREFIX.trim())}&limit=100&page=${page}`,
    );
    if (status !== 200) {
      log("BUG-026", { error: `list page ${page} -> ${status}` });
      return;
    }
    for (const r of body.resources) {
      if (typeof r.description === "string" && r.description.startsWith(PLACEHOLDER_PREFIX)) {
        matches.push({ id: r.id, description: r.description });
      }
    }
    if (page >= (body.totalPages || 1)) break;
    page++;
  }
  log("BUG-026", { placeholderCount: matches.length, ids: matches.map((m) => m.id) });
  for (const m of matches) {
    const put = await api(`/api/admin/resources/${m.id}`, {
      method: "PUT",
      body: JSON.stringify({ description: "" }),
    });
    log("BUG-026", { id: m.id, cleared: put.status === 200, status: put.status });
  }
}

const FULL_186159_DESC =
  "Although the traditional sports world has come to a standstill due to the coronavirus pandemic, many major esports organizations are still going strong, hosting competitions remotely. Riot Games keeps League of Legends esports rolling with a fully cloud-based, virtualized production workflow.";

async function fixTruncatedDescription() {
  const { status, body } = await api("/api/resources/186159");
  if (status !== 200) {
    log("BUG-057", { error: `fetch 186159 -> ${status}` });
    return;
  }
  const res = body.resource || body;
  if (!/hosting compe$/.test(res.description || "")) {
    log("BUG-057", { noop: "truncated tail no longer present", tail: (res.description || "").slice(-20) });
    return;
  }
  const put = await api("/api/admin/resources/186159", {
    method: "PUT",
    body: JSON.stringify({ description: FULL_186159_DESC }),
  });
  log("BUG-057", { status: put.status, newLen: FULL_186159_DESC.length });
}

async function fixSmartTvCasing() {
  // 185850: title casing + possible raw ":zap:" shortcode in prod description
  {
    const { status, body } = await api("/api/resources/185850");
    if (status !== 200) {
      log("BUG-061", { error: `fetch 185850 -> ${status}` });
    } else {
      const res = body.resource || body;
      const update: Record<string, string> = {};
      if (res.title === "Awesome Smart Tv") update.title = "Awesome Smart TV";
      if (typeof res.description === "string" && res.description.startsWith(":zap:")) {
        update.description = res.description.replace(/^:zap:\s*/, "");
      }
      if (Object.keys(update).length === 0) {
        log("BUG-061", { id: 185850, noop: "already clean" });
      } else {
        const put = await api("/api/admin/resources/185850", {
          method: "PUT",
          body: JSON.stringify(update),
        });
        log("BUG-061", { id: 185850, update: Object.keys(update), status: put.status });
      }
    }
  }
  // 185907: same "Tv" casing pattern
  {
    const { status, body } = await api("/api/resources/185907");
    if (status !== 200) {
      log("BUG-061", { error: `fetch 185907 -> ${status}` });
      return;
    }
    const res = body.resource || body;
    if (res.title !== "Tv Subtitle Extraction") {
      log("BUG-061", { id: 185907, noop: `title already "${res.title}"` });
      return;
    }
    const put = await api("/api/admin/resources/185907", {
      method: "PUT",
      body: JSON.stringify({ title: "TV Subtitle Extraction" }),
    });
    log("BUG-061", { id: 185907, status: put.status });
  }
}

async function main() {
  await login();
  await fixJourney8Steps();
  await fixJourneyTitle();
  await fixPlaceholderDescriptions();
  await fixTruncatedDescription();
  await fixSmartTvCasing();
  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run17", { recursive: true });
  fs.writeFileSync(`evidence/run17/data-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  console.log(`DONE — journaled to evidence/run17/data-fixes-${ENV_TAG}.json`);
}

main().catch((e) => {
  console.error("FATAL", e);
  journal.fatal = String(e);
  fs.mkdirSync("evidence/run17", { recursive: true });
  fs.writeFileSync(`evidence/run17/data-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  process.exit(1);
});
