/**
 * Task 287: apply the task-286 dead-link fixes to the LIVE site via the admin
 * HTTP API (prod DB is read-only from the workspace). Rules match by exact
 * OLD URL, not by dev ids. Idempotent: no match = no-op. Only rows that still
 * carry the old URL are touched; if the target URL is already owned by another
 * row, the fix is skipped and reported (resources.url is UNIQUE).
 *
 * Run: npx tsx scripts/fix-dead-links-task287-prod.ts
 * Dev validation: PROD_BASE=http://localhost:5000 npx tsx scripts/fix-dead-links-task287-prod.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const ENV_TAG = BASE.includes("localhost") ? "dev" : "prod";

if (!PASSWORD) { console.error("ADMIN_PASSWORD not set"); process.exit(1); }

// old URL -> new URL (same replacements as scripts/fix-dead-links-task286.ts)
const FIXES: Array<{ from: string; to: string; note: string }> = [
  { from: "https://github.com/THEOplayer/documentation/blob/main/theoplayer/how-to-guides/04-drm/00-introduction.md",
    to: "https://optiview.dolby.com/docs/theoplayer/how-to-guides/drm/introduction/",
    note: "THEOplayer docs moved off GitHub; theoplayer.com now redirects to Dolby OptiView, so point at the final host to avoid a suspect off-domain-redirect flag" },
  // second hop: the intermediate theoplayer.com URL applied earlier in this run
  { from: "https://www.theoplayer.com/docs/theoplayer/how-to-guides/drm/introduction/",
    to: "https://optiview.dolby.com/docs/theoplayer/how-to-guides/drm/introduction/",
    note: "theoplayer.com redirects off-domain to optiview.dolby.com (acquisition); use final URL" },
  { from: "https://www.adobe.com/devnet/rtmp.html",
    to: "https://en.wikipedia.org/wiki/Real-Time_Messaging_Protocol",
    note: "adobe devnet retired; veriskope mirror fails DNS" },
  { from: "http://www.cinepaint.org/",
    to: "https://sourceforge.net/projects/cinepaint/",
    note: "cinepaint.org DNS dead" },
  { from: "http://example.com/x",
    to: "https://github.com/ThibaultBee/StreamPack",
    note: "placeholder -> real StreamPack repo" },
  { from: "https://www.haivision.com/resources/white-paper/srt-protocol-technical-overview/",
    to: "https://www.haivision.com/white-papers/srt-protocol-technical-overview/",
    note: "white paper moved" },
  { from: "https://www.panopto.com/features/video-recording/video-capture-hardware/",
    to: "https://www.panopto.com/features/video-recording/",
    note: "capture-hardware page 404s slashless" },
];

const journal: any = { startedAt: new Date().toISOString(), base: BASE, actions: [] };
const log = (e: any) => { journal.actions.push(e); console.log(JSON.stringify(e)); };

let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Origin: BASE, Cookie: cookie, ...(init.headers || {}) },
  });
  let body: any = null;
  try { body = await r.json(); } catch { /* non-JSON */ }
  return { status: r.status, body };
}

async function login(): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${BASE}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: BASE },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (r.ok) {
      const setCookies: string[] =
        (r.headers as any).getSetCookie?.() ?? [r.headers.get("set-cookie")].filter(Boolean);
      const sid = setCookies.find((c) => c.startsWith("connect.sid="));
      if (!sid) throw new Error("login OK but no connect.sid");
      cookie = sid.split(";")[0];
      console.log(`[login] ok (attempt ${attempt})`);
      return;
    }
    console.log(`[login] attempt ${attempt} -> ${r.status}`);
    await new Promise((res) => setTimeout(res, 5000 * attempt));
  }
  throw new Error("login failed after retries");
}

async function fetchAllResources() {
  const out: Array<{ id: number; url: string; title: string; status: string }> = [];
  let page = 1;
  for (;;) {
    const { status, body } = await api(`/api/admin/resources?limit=100&page=${page}`);
    if (status !== 200) throw new Error(`admin resources page ${page} -> ${status}`);
    const rows = body.resources || body.data || body;
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) out.push({ id: r.id, url: r.url, title: r.title, status: r.status });
    if (rows.length < 100) break;
    page++;
  }
  return out;
}

async function main() {
  await login();
  const resources = await fetchAllResources();
  console.log(`fetched ${resources.length} resources from ${BASE}`);
  const urlOwner = new Map<string, number>();
  for (const r of resources) if (r.url) urlOwner.set(r.url, r.id);

  for (const fix of FIXES) {
    const matches = resources.filter((r) => r.url === fix.from);
    if (matches.length === 0) {
      log({ from: fix.from, action: "noop-no-match", note: fix.note });
      continue;
    }
    for (const res of matches) {
      const owner = urlOwner.get(fix.to);
      if (owner !== undefined && owner !== res.id) {
        log({ id: res.id, title: res.title, status: res.status, from: fix.from, to: fix.to, action: "skip-target-taken", ownerId: owner, note: fix.note });
        continue;
      }
      const put = await api(`/api/admin/resources/${res.id}`, { method: "PUT", body: JSON.stringify({ url: fix.to }) });
      if (put.status === 200) { urlOwner.delete(fix.from); urlOwner.set(fix.to, res.id); }
      log({ id: res.id, title: res.title, status: res.status, from: fix.from, to: fix.to, action: "repoint", httpStatus: put.status, note: fix.note });
    }
  }

  journal.finishedAt = new Date().toISOString();
  const failures = journal.actions.filter((a: any) => a.httpStatus && a.httpStatus >= 400);
  journal.failureCount = failures.length;
  fs.mkdirSync("evidence/task287", { recursive: true });
  fs.writeFileSync(`evidence/task287/link-fixes-${ENV_TAG}.json`, JSON.stringify(journal, null, 2));
  console.log(`\nDone. ${journal.actions.length} actions, ${failures.length} failures.`);
  if (failures.length) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
