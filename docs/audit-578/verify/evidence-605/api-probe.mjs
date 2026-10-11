// Read-only production API probe for F03/F05/F09–F13. Only GETs, plus the
// owner admin-login/logout pair (no data writes besides a rate-limit hit).
import { request } from "@playwright/test";
const BASE = process.env.BASE || "https://awesome.video";
const ctx = await request.newContext({ baseURL: BASE });
const login = await ctx.post("/api/auth/admin-login", { headers: { Origin: BASE, "Content-Type": "application/json" }, data: { password: process.env.OWNER_PASSWORD } });
console.log("admin-login", login.status());
const me = await (await ctx.get("/api/auth/user")).json().catch(() => ({}));
console.log("auth/user role=", me?.role ?? me?.user?.role);
const j = async (p) => { const r = await ctx.get(p); let b = null; try { b = await r.json(); } catch {} return { s: r.status(), b }; };
console.log("version", JSON.stringify((await j("/api/version")).b));

const st = await j("/api/admin/link-health/status");
console.log("\n== GET /api/admin/link-health/status", st.s, "job keys:", Object.keys(st.b?.job ?? {}).join(","));
const { id, status, errorMessage, totalLinks, checkedLinks, startedAt, completedAt } = st.b?.job ?? {};
console.log(JSON.stringify({ id, status, errorMessage, totalLinks, checkedLinks, startedAt, completedAt }));
const hist = await j("/api/admin/link-health/history");
const jobs = hist.b?.jobs ?? hist.b?.history ?? hist.b ?? [];
console.log("\n== GET /api/admin/link-health/history", hist.s, "top keys:", Array.isArray(hist.b) ? "array" : Object.keys(hist.b ?? {}).join(","));
for (const x of (Array.isArray(jobs) ? jobs : []).slice(0, 12)) console.log(`  #${x.id} ${x.status} err=${JSON.stringify(x.errorMessage ?? null)} ${x.completedAt ?? ""}`);

const ss = await j("/api/github/sync-status");
console.log("\n== GET /api/github/sync-status", ss.s, "total", ss.b?.total);
const keyUnion = new Set(); (ss.b?.items ?? []).forEach((i) => Object.keys(i).forEach((k) => keyUnion.add(k)));
console.log("item key union:", [...keyUnion].join(","));
for (const i of (ss.b?.items ?? []).slice(0, 15)) console.log(`  #${i.id} ${i.action} ${i.status} importResult=${JSON.stringify(i.importResult ?? null)?.slice(0, 260)} err=${JSON.stringify(i.errorMessage)?.slice(0, 160)}`);
const imports = (ss.b?.items ?? []).filter((i) => i.action === "import" && !["pending", "processing"].includes(i.status));
console.log("terminal imports:", imports.length, "with importResult:", imports.filter((i) => i.importResult).length,
  "with errorMessages array:", imports.filter((i) => Array.isArray(i.importResult?.errorMessages)).length,
  "partial:", imports.filter((i) => i.status === "partial").length);

const sh = await j("/api/github/sync-history");
const hrows = Array.isArray(sh.b) ? sh.b : sh.b?.history ?? sh.b?.items ?? [];
console.log("\n== GET /api/github/sync-history", sh.s, "rows", hrows.length);
for (const h of hrows.slice(0, 6)) console.log("  ", JSON.stringify(h).slice(0, 300));

const al = await j("/api/admin/audit-logs?limit=50&offset=0");
const EXP = new Set(["catalog.exported", "database.exported", "resources.exported", "categories.exported"]);
const exp = (al.b?.logs ?? []).filter((l) => EXP.has(l.action));
console.log("\n== GET /api/admin/audit-logs?limit=50&offset=0", al.s, "total", al.b?.total, "export rows in window:", exp.length);
for (const l of exp) console.log(`  #${l.id} ${l.action} ${l.createdAt} ${JSON.stringify(l.changes ?? l.metadata ?? {}).slice(0, 140)}`);
const al500 = await j("/api/admin/audit-logs?limit=500&offset=0");
const counts = {}; (al500.b?.logs ?? []).filter((l) => EXP.has(l.action)).forEach((l) => counts[l.action] = (counts[l.action] || 0) + 1);
console.log("export actions in last 500 audit rows:", JSON.stringify(counts));
const out = await ctx.post("/api/auth/admin-logout", { headers: { Origin: BASE } });
console.log("\nadmin-logout", out.status());
