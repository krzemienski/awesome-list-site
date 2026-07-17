/**
 * Run16 data fixes — LIVE PROD via admin API (prod DB is not directly
 * writable from the agent environment; every write goes through the live
 * admin HTTP API, mirroring scripts/run15-data-fixes-prod.ts).
 *
 *  BUG-003: QA test submission id 188454 ("QA Queue Verify 1784241269297",
 *           https://example.com/queue-1784241269327) is publicly listed.
 *           Fix: PUT /api/resources/188454/reject (approved -> rejected
 *           removes it from the public tree/search/recommendations).
 *           Refetched + status-checked live before the write, so a re-run
 *           is a no-op once rejected.
 *  BUG-007: resource 185407 "RTMP vs. WebRTC vs. HLS" points to
 *           https://dyte.io/blog/rtmp-webrtc-hls/ which 502s (dyte.io root
 *           is 200 — the blog path is gone). Fix: repoint the URL to the
 *           verified-200 Wayback snapshot
 *           (PUT /api/admin/resources/185407).
 *  BUG-056: resource 185741 "Hybrik Samples" carries the auto-generated
 *           placeholder description ("... — video development resource
 *           from github.com."). Fix: real description
 *           (PUT /api/admin/resources/185741). Only applied if the
 *           placeholder text is still present.
 *  BUG-054 (partial): normalize sub-subcategory name casing
 *           'FFMPEG' -> 'FFmpeg' (PATCH /api/admin/sub-subcategories/:id,
 *           slug untouched). The broader dup-name restructure is DECLINED
 *           (structural taxonomy redesign, out of scope).
 *
 * Idempotent + journaled to evidence/run16/data-fixes-prod.json.
 * Admin password read from ADMIN_PASSWORD env; never logged. Session cookie
 * is captured ONLY from the login response (GAESA affinity cookies ignored).
 *
 * Run AFTER republish: ADMIN_PASSWORD=... npx tsx scripts/run16-data-fixes-prod.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;

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

async function rejectQaResource(cookie: string) {
  const ID = 188454;
  const cur = await api(cookie, "GET", `/api/resources/${ID}`);
  if (cur.status === 404) {
    log("BUG-003", { id: ID, skip: "already gone (404)" });
    return;
  }
  if (!cur.ok) {
    log("BUG-003", { id: ID, error: `fetch ${cur.status}: ${cur.text}` });
    process.exitCode = 1;
    return;
  }
  // Journal full row contents before any status change (dedup-cascade-safety).
  const row = cur.json;
  if (row.status === "rejected") {
    log("BUG-003", { id: ID, skip: "already rejected" });
    return;
  }
  if (!/QA Queue Verify/.test(row.title || "") || !/example\.com/.test(row.url || "")) {
    log("BUG-003", { id: ID, skip: "row does not match expected QA artifact — NOT touching", row });
    process.exitCode = 1;
    return;
  }
  const rej = await api(cookie, "PUT", `/api/resources/${ID}/reject`, {
    reason: "QA test artifact (example.com placeholder URL) — must not be public",
  });
  log("BUG-003", {
    id: ID,
    beforeRow: row,
    action: "rejected",
    status: rej.status,
    ok: rej.ok,
    ...(rej.ok ? {} : { error: rej.text }),
  });
  if (!rej.ok) process.exitCode = 1;
}

async function repointDeadDyteUrl(cookie: string) {
  const ID = 185407;
  const OLD_URL = "https://dyte.io/blog/rtmp-webrtc-hls/";
  const NEW_URL =
    "https://web.archive.org/web/20250904075527/https://dyte.io/blog/rtmp-webrtc-hls/";
  const cur = await api(cookie, "GET", `/api/resources/${ID}`);
  if (!cur.ok) {
    log("BUG-007", { id: ID, error: `fetch ${cur.status}: ${cur.text}` });
    process.exitCode = 1;
    return;
  }
  if (cur.json.url === NEW_URL) {
    log("BUG-007", { id: ID, skip: "already repointed" });
    return;
  }
  if (cur.json.url !== OLD_URL) {
    log("BUG-007", { id: ID, skip: "url changed since audit — NOT touching", current: cur.json.url });
    return;
  }
  const upd = await api(cookie, "PUT", `/api/admin/resources/${ID}`, { url: NEW_URL });
  log("BUG-007", {
    id: ID,
    before: OLD_URL,
    after: NEW_URL,
    status: upd.status,
    ok: upd.ok,
    ...(upd.ok ? {} : { error: upd.text }),
  });
  if (!upd.ok) process.exitCode = 1;
}

async function fixPlaceholderDescription(cookie: string) {
  const ID = 185741;
  const PLACEHOLDER_RE = /—\s*video development resource from github\.com\.?$/i;
  const NEW_DESC =
    "Sample job JSON files and API integration scripts for Dolby Hybrik, a cloud-based media transcoding and QC platform. The repo demonstrates transcode presets, analysis/QC jobs, and workflow automation against the Hybrik API.";
  const cur = await api(cookie, "GET", `/api/resources/${ID}`);
  if (!cur.ok) {
    log("BUG-056", { id: ID, error: `fetch ${cur.status}: ${cur.text}` });
    process.exitCode = 1;
    return;
  }
  if (!PLACEHOLDER_RE.test(cur.json.description || "")) {
    log("BUG-056", { id: ID, skip: "placeholder no longer present", current: cur.json.description });
    return;
  }
  const upd = await api(cookie, "PUT", `/api/admin/resources/${ID}`, { description: NEW_DESC });
  log("BUG-056", {
    id: ID,
    before: cur.json.description,
    after: NEW_DESC,
    status: upd.status,
    ok: upd.ok,
    ...(upd.ok ? {} : { error: upd.text }),
  });
  if (!upd.ok) process.exitCode = 1;
}

async function normalizeFfmpegCasing(cookie: string) {
  const list = await api(cookie, "GET", "/api/admin/sub-subcategories");
  if (!list.ok) throw new Error(`list sub-subcategories failed ${list.status}`);
  const targets = (list.json as any[]).filter((s) => s.name === "FFMPEG");
  if (targets.length === 0) {
    log("BUG-054", { skip: "no 'FFMPEG' (all-caps) nodes remain" });
    return;
  }
  for (const t of targets) {
    // Name-only rename; slug untouched so no slug collisions are possible.
    const patch = await api(cookie, "PATCH", `/api/admin/sub-subcategories/${t.id}`, {
      name: "FFmpeg",
    });
    log("BUG-054", {
      id: t.id,
      slug: t.slug,
      from: "FFMPEG",
      to: "FFmpeg",
      status: patch.status,
      ok: patch.ok,
      ...(patch.ok ? {} : { error: patch.text }),
    });
    if (!patch.ok) process.exitCode = 1;
  }
}

async function main() {
  const cookie = await login();
  console.log("logged in — session acquired");
  await rejectQaResource(cookie);
  await repointDeadDyteUrl(cookie);
  await fixPlaceholderDescription(cookie);
  await normalizeFfmpegCasing(cookie);
  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run16", { recursive: true });
  const out = "evidence/run16/data-fixes-prod.json";
  fs.writeFileSync(out, JSON.stringify(journal, null, 2));
  console.log(`\nJournal written to ${out} (exit ${process.exitCode || 0})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
