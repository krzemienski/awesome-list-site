/**
 * Task 290 pass 2: resolve the 12 rows skipped in pass 1 because their target
 * URL was owned by another resource. Each gets a distinct verified-live URL.
 * Four pure GitHub duplicates have no archive snapshot; retry their canonical
 * target in case the duplicate owner was removed (task 289 dedup just merged),
 * otherwise report as delete-candidates.
 */
import fs from "fs";
const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
if (!PASSWORD) { console.error("ADMIN_PASSWORD not set"); process.exit(1); }

const FIXES: Array<{ id: number; to: string; fallback?: string; note: string }> = [
  { id: 190019, to: "https://professional.dolby.com/content-creation/dolby-vision/", note: "distinct Dolby Vision pro page" },
  { id: 189955, to: "https://code.videolan.org/rist/librist", note: "canonical GitLab (pure dup; only if owner gone)" },
  { id: 189303, to: "https://github.com/bfansports/CloudTranscode", note: "canonical repo (pure dup; only if owner gone)" },
  { id: 189233, to: "https://github.com/Eyevinn/mp4ff", note: "canonical repo (pure dup; only if owner gone)" },
  { id: 189213, to: "https://web.archive.org/web/2024/https://github.com/Axinom/Axinom.Drm.BearerAuthLicenseServerProxy", note: "archive snapshot of removed repo" },
  { id: 189074, to: "https://web.archive.org/web/2023/https://videoservicesforum.net/RIST.shtml", note: "archive of VSF RIST spec index" },
  { id: 188796, to: "https://web.archive.org/web/2026/https://developer.android.com/media/media3/transformer", note: "archive; live URL owned by sibling row" },
  { id: 188633, to: "https://github.com/cta-wave/common-media-client-data", note: "CMCD spec repo (dup; only if owner gone)" },
  { id: 189160, to: "https://hlsjs.video-dev.org/api-docs/", note: "hls.js API docs index (distinct from sibling deep link)" },
  { id: 186243, to: "https://web.archive.org/web/2024/https://opensource.google/projects/shaka-packager", note: "archive of retired opensource.google page" },
  { id: 186176, to: "https://www.svta.org/about-the-svta/", note: "SVTA about page (root owned by sibling row)" },
  { id: 186010, to: "https://www.mpeg.org/about-mpeg/", note: "MPEG about page (root owned by sibling row)" },
];

let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json", Origin: BASE, Cookie: cookie, ...(init.headers || {}) } });
  let body: any = null; try { body = await r.json(); } catch {}
  return { status: r.status, body };
}
async function login() {
  const r = await fetch(`${BASE}/api/auth/local/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  if (!r.ok) throw new Error(`login ${r.status}`);
  const sc: string[] = (r.headers as any).getSetCookie?.() ?? [r.headers.get("set-cookie")].filter(Boolean);
  cookie = sc.find((c) => c.startsWith("connect.sid="))!.split(";")[0];
}
async function fetchAllResources() {
  const out: Array<{ id: number; url: string; title: string }> = [];
  for (let page = 1; ; page++) {
    const { status, body } = await api(`/api/admin/resources?limit=100&page=${page}`);
    if (status !== 200) throw new Error(`page ${page} -> ${status}`);
    const rows = body.resources || body.data || body;
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) out.push({ id: r.id, url: r.url, title: r.title });
    if (rows.length < 100) break;
  }
  return out;
}
async function main() {
  await login();
  const resources = await fetchAllResources();
  console.log(`fetched ${resources.length}`);
  const byId = new Map(resources.map((r) => [r.id, r]));
  const urlOwner = new Map(resources.filter((r) => r.url).map((r) => [r.url, r.id]));
  const journal: any = { startedAt: new Date().toISOString(), actions: [] };
  const log = (e: any) => { journal.actions.push(e); console.log(JSON.stringify(e)); };
  for (const f of FIXES) {
    const res = byId.get(f.id);
    if (!res) { log({ id: f.id, action: "gone-row-deleted", note: f.note }); continue; }
    const owner = urlOwner.get(f.to);
    if (owner !== undefined && owner !== f.id) { log({ id: f.id, title: res.title, to: f.to, action: "still-dup-delete-candidate", ownerId: owner, note: f.note }); continue; }
    const put = await api(`/api/admin/resources/${f.id}`, { method: "PUT", body: JSON.stringify({ url: f.to }) });
    if (put.status === 200) urlOwner.set(f.to, f.id);
    log({ id: f.id, title: res.title, from: res.url, to: f.to, action: "repoint", httpStatus: put.status, note: f.note });
  }
  journal.finishedAt = new Date().toISOString();
  fs.writeFileSync("evidence/task290/link-fixes-prod-pass2.json", JSON.stringify(journal, null, 2));
  const fails = journal.actions.filter((a: any) => a.httpStatus && a.httpStatus >= 400);
  console.log(`Done. ${journal.actions.length} actions, ${fails.length} failures.`);
  if (fails.length) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
