/**
 * Run15 data fixes — LIVE PROD via admin API (prod DB is not directly
 * writable from the agent environment; every write goes through the live
 * admin HTTP API, mirroring scripts/prod-cleanup.ts).
 *
 *  BUG-009: decode one level of HTML entities in resource title/description
 *           (PUT /api/admin/resources/:id). Affected ids are detected live
 *           by refetching each candidate and re-testing, so a re-run is a
 *           no-op once clean.
 *  BUG-046: rename dup sub-subcategory "Podcasts & Webinars" under
 *           "Webinars & Conference Talks" -> "Podcasts"
 *           (PATCH /api/admin/sub-subcategories/:id), then repoint the
 *           resources still naming the old node in that hierarchy
 *           (PUT /api/admin/resources/:id).
 *  BUG-011: no direct write path — the republished build's boot watchdog
 *           sweeps stuck jobs. This script only VERIFIES via
 *           GET /api/github/sync-status that no non-terminal rows remain
 *           (exit 1 if any survive past the sweep).
 *
 * Idempotent + journaled to evidence/run15/data-fixes-prod.json.
 * Admin password read from ADMIN_PASSWORD env; never logged. Session cookie
 * is captured ONLY from the login response (GAESA affinity cookies ignored).
 *
 * Run: ADMIN_PASSWORD=... npx tsx scripts/run15-data-fixes-prod.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set in env — aborting.");
  process.exit(1);
}

// Candidate ids from the read-only prod replica scan (2026-07-17). Each is
// refetched and re-tested live before any write, so stale ids are harmless.
const BUG009_CANDIDATE_IDS = [188392, 188458];

const journal: any = { startedAt: new Date().toISOString(), base: BASE, steps: {} };
function log(step: string, entry: any) {
  journal.steps[step] = journal.steps[step] || [];
  journal.steps[step].push(entry);
  console.log(`[${step}]`, JSON.stringify(entry).slice(0, 300));
}

const ENTITY_RE = /&(lt|gt|quot|#39|#x27|amp);/;
function decodeOnce(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
}

async function login(): Promise<string> {
  // Right after a republish the boot admin-password sync runs async — retry.
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${BASE}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (r.ok) {
      const anyHeaders = r.headers as any;
      const cookies: string[] =
        typeof anyHeaders.getSetCookie === "function"
          ? anyHeaders.getSetCookie()
          : ([r.headers.get("set-cookie")].filter(Boolean) as string[]);
      const sid = cookies
        .map((c) => c.split(";")[0])
        .filter((c) => c.startsWith("connect.sid="))
        .join("; ");
      if (!sid) throw new Error("login ok but no connect.sid cookie");
      return sid;
    }
    const body = (await r.text()).slice(0, 200);
    if (attempt === 4) throw new Error(`login failed ${r.status}: ${body}`);
    console.log(`login attempt ${attempt} failed (${r.status}) — retrying in 15s`);
    await new Promise((res) => setTimeout(res, 15_000));
  }
  throw new Error("unreachable");
}

async function api(cookie: string, method: string, path: string, body?: any) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, ok: r.ok, json, text: text.slice(0, 300) };
}

async function fixDoubleEscapedEntities(cookie: string) {
  for (const id of BUG009_CANDIDATE_IDS) {
    const cur = await api(cookie, "GET", `/api/resources/${id}`);
    if (!cur.ok) {
      log("BUG-009", { id, skip: `fetch ${cur.status}` });
      continue;
    }
    const { title, description } = cur.json;
    const newTitle = ENTITY_RE.test(title) ? decodeOnce(title) : title;
    const newDesc = ENTITY_RE.test(description) ? decodeOnce(description) : description;
    if (newTitle === title && newDesc === description) {
      log("BUG-009", { id, skip: "already clean" });
      continue;
    }
    const upd = await api(cookie, "PUT", `/api/admin/resources/${id}`, {
      title: newTitle,
      description: newDesc,
    });
    log("BUG-009", {
      id,
      before: { title, description },
      after: { title: newTitle, description: newDesc },
      status: upd.status,
      ok: upd.ok,
      ...(upd.ok ? {} : { error: upd.text }),
    });
    if (!upd.ok) process.exitCode = 1;
  }
}

async function renameDupPodcastNode(cookie: string) {
  const list = await api(cookie, "GET", "/api/admin/sub-subcategories");
  if (!list.ok) throw new Error(`list sub-subcategories failed ${list.status}`);
  const dupes = (list.json as any[]).filter((s) => s.name === "Podcasts & Webinars");
  // Target = the one whose slug is NOT the canonical keep-node slug.
  const target = dupes.find((s) => s.slug !== "podcasts-webinars");
  if (dupes.length < 2 || !target) {
    log("BUG-046", { skip: "no duplicate node (already renamed?)", dupes });
    return;
  }
  const slugTaken = (list.json as any[]).some(
    (s) => s.slug === "podcasts" && s.id !== target.id,
  );
  const newSlug = slugTaken ? `podcasts-sc-${target.id}` : "podcasts";
  const patch = await api(cookie, "PATCH", `/api/admin/sub-subcategories/${target.id}`, {
    name: "Podcasts",
    slug: newSlug,
  });
  log("BUG-046", {
    renamedNode: { id: target.id, from: target.name, to: "Podcasts", slug: newSlug },
    status: patch.status,
    ok: patch.ok,
    ...(patch.ok ? {} : { error: patch.text }),
  });
  if (!patch.ok) { process.exitCode = 1; return; }

  // Repoint resources that still carry the old NAME within the renamed
  // node's hierarchy (Intro & Learning / Webinars & Conference Talks).
  const RESOURCE_IDS_TO_REPOINT = [185847];
  for (const id of RESOURCE_IDS_TO_REPOINT) {
    const cur = await api(cookie, "GET", `/api/resources/${id}`);
    if (!cur.ok) { log("BUG-046", { id, skip: `fetch ${cur.status}` }); continue; }
    if (cur.json.subSubcategory !== "Podcasts & Webinars"
        || cur.json.subcategory !== "Webinars & Conference Talks") {
      log("BUG-046", { id, skip: "not under old node name", current: cur.json.subSubcategory });
      continue;
    }
    const upd = await api(cookie, "PUT", `/api/admin/resources/${id}`, {
      subSubcategory: "Podcasts",
    });
    log("BUG-046", { repointedResource: id, status: upd.status, ok: upd.ok,
      ...(upd.ok ? {} : { error: upd.text }) });
    if (!upd.ok) process.exitCode = 1;
  }
}

async function verifyNoStuckSyncJobs(cookie: string) {
  const r = await api(cookie, "GET", "/api/github/sync-status");
  if (!r.ok) throw new Error(`sync-status failed ${r.status}`);
  const nonTerminal = (r.json.items as any[]).filter(
    (i) => i.status !== "completed" && i.status !== "failed",
  );
  log("BUG-011", {
    totalQueueRows: r.json.total,
    nonTerminal: nonTerminal.map((i) => ({ id: i.id, status: i.status, createdAt: i.createdAt })),
    verdict: nonTerminal.length === 0 ? "PASS — watchdog swept all stuck jobs" : "FAIL — stuck rows remain",
  });
  if (nonTerminal.length > 0) process.exitCode = 1;
}

async function main() {
  const cookie = await login();
  console.log("logged in — session acquired");
  await fixDoubleEscapedEntities(cookie);
  await renameDupPodcastNode(cookie);
  await verifyNoStuckSyncJobs(cookie);
  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run15", { recursive: true });
  const out = "evidence/run15/data-fixes-prod.json";
  fs.writeFileSync(out, JSON.stringify(journal, null, 2));
  console.log(`\nJournal written to ${out} (exit ${process.exitCode || 0})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
