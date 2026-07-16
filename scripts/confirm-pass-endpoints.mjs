// Confirmation-pass endpoint contract matrix against prod. Read-only / anon-safe only.
// Usage: node scripts/confirm-pass-endpoints.mjs <pass-dir>
import fs from "fs";
const BASE = "https://awesome.video";
const passDir = process.argv[2] || "audit-evidence/confirm-pass-1";
const results = [];
const ok = (n, p, d = "") => { results.push({ n, p, d }); console.log(`${p ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };
const req = async (method, path, opts = {}) => {
  const res = await fetch(BASE + path, { method, redirect: "manual", ...opts });
  let body = null; try { body = await res.text(); } catch {}
  return { s: res.status, h: res.headers, b: body };
};
const j = (b) => { try { return JSON.parse(b); } catch { return null; } };

// public 200s
for (const p of ["/api/resources", "/api/search?q=ffmpeg", "/api/tags", "/api/categories", "/api/subcategories", "/api/sub-subcategories", "/api/journeys", "/api/awesome-list", "/api/health", "/sitemap.xml", "/robots.txt"]) {
  const r = await req("GET", p);
  ok(`GET ${p} -> 200`, r.s === 200, `got ${r.s}`);
}
// gzip on the big payload
{
  const res = await fetch(BASE + "/api/awesome-list", { headers: { "Accept-Encoding": "gzip" } });
  ok("awesome-list served compressed", ["gzip","br","zstd"].includes(res.headers.get("content-encoding") || ""), `content-encoding=${res.headers.get("content-encoding")}`);
}
// admin guards (anon)
for (const [m, p] of [["GET", "/api/admin/users"], ["GET", "/api/admin/users/export"], ["DELETE", "/api/admin/resources/1"], ["PUT", "/api/admin/journeys/1"], ["GET", "/api/resources/pending"]]) {
  const r = await req(m, p, m === "PUT" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {});
  ok(`${m} ${p} anon -> 401/403`, r.s === 401 || r.s === 403, `got ${r.s}`);
}
// error contracts
{
  const r = await req("POST", "/api/auth/local/login", { headers: { "Content-Type": "application/json" }, body: "{bad json" });
  ok("malformed JSON -> 400", r.s === 400, `got ${r.s}`);
}
{
  const r = await req("GET", "/api/resources?sort=bogus");
  ok("invalid sort -> 400 invalid_sort", r.s === 400 && /invalid_sort/.test(r.b || ""), `got ${r.s}`);
}
{
  const r = await req("GET", "/api/resources/NaN");
  ok("NaN resource id -> 404", r.s === 404, `got ${r.s}`);
}
{
  const r = await req("GET", "/api/journeys/99999999");
  ok("missing journey id -> 404", r.s === 404, `got ${r.s}`);
}
{
  const r = await req("GET", "/api/resources/188037");
  ok("deleted QA resource 188037 -> 404", r.s === 404, `got ${r.s}`);
}
{
  const r = await req("GET", "/api/search?q=a&q=b");
  ok("duplicate ?q= -> 200 first value", r.s === 200, `got ${r.s}`);
}
{
  const r = await req("PATCH", "/api/auth/login");
  ok("unsupported method on known route -> 405+Allow or 404", r.s === 405 ? !!r.h.get("allow") : r.s === 404, `got ${r.s} allow=${r.h.get("allow")}`);
}
{
  const r = await req("GET", "/api/resources/check-url?url=https://example.com/definitely-not-submitted");
  const d = j(r.b) || {};
  ok("check-url leaks no moderation status", r.s === 200 && !("status" in d), `keys=${Object.keys(d).join(",")}`);
}
{
  const r = await req("GET", "/api/resources?status=pending");
  const d = j(r.b);
  const leaked = Array.isArray(d?.resources) ? d.resources.some((x) => x.status && x.status !== "approved") : false;
  ok("?status=pending anon -> 403 or approved-only", r.s === 403 || !leaked, `got ${r.s}`);
}
// public serializer: no submitter/pipeline metadata
{
  const r = await req("GET", "/api/resources?limit=5");
  const d = j(r.b);
  const rows = d?.resources || d || [];
  const bad = (Array.isArray(rows) ? rows : []).some((x) => "submittedBy" in x || "submitted_by" in x || "enrichmentStatus" in x);
  ok("public serializer strips submitter/pipeline fields", !bad);
}
// soft-404 status on missing category page
{
  const r = await req("GET", "/category/test");
  ok("/category/test -> HTTP 404", r.s === 404, `got ${r.s}`);
}
{
  const r = await req("GET", "/resource/188037");
  ok("/resource/188037 page -> HTTP 404", r.s === 404, `got ${r.s}`);
}
// nonce'd HTML never 304
{
  const r1 = await fetch(BASE + "/", { redirect: "manual" });
  const etag = r1.headers.get("etag");
  const cc = r1.headers.get("cache-control") || "";
  ok("HTML no ETag + no-store", !etag && /no-store/.test(cc), `etag=${etag} cc=${cc}`);
  const r2 = await fetch(BASE + "/", { headers: { "If-None-Match": '"anything"' }, redirect: "manual" });
  ok("HTML If-None-Match -> 200 not 304", r2.status === 200, `got ${r2.status}`);
}

const fails = results.filter((x) => !x.p);
fs.mkdirSync(passDir, { recursive: true });
fs.writeFileSync(`${passDir}/endpoints.json`, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
console.log(`\n[endpoints] ${results.length - fails.length}/${results.length} PASS`);
process.exit(fails.length ? 1 : 0);
