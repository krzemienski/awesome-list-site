// Task 592 step 1: spot-reproduce one recipe per earlier task group (A–J) against the restarted :5000.
// Read-only or rejected-write only: every write probe is designed to be refused before anything is stored.
import { call, q, pool, writeJson } from "./lib.mjs";

const out = { at: new Date().toISOString(), base: process.env.BASE_URL ?? "http://127.0.0.1:5000", checks: [] };
const check = (item, recipe, pass, observed) => { out.checks.push({ item, recipe, pass, observed }); console.log(pass ? "PASS" : "FAIL", item, recipe, JSON.stringify(observed).slice(0, 300)); };

// A05 — public tag API equals the internal tag API and is non-empty.
{ const a = await call("GET", "/api/public/tags"); const b = await call("GET", "/api/tags");
  check("A05", "GET /api/public/tags vs /api/tags", a.status === 200 && a.text === b.text && (a.json?.total ?? 0) > 0, { status: [a.status, b.status], identical: a.text === b.text, total: a.json?.total }); }
// A01 — public resource payload never carries internal metadata keys.
{ const r = await call("GET", "/api/resources?limit=24"); const keys = new Set();
  for (const res of r.json?.resources ?? []) for (const k of Object.keys(res.metadata ?? {})) keys.add(k);
  const banned = ["agent", "cost", "costUsd", "email", "ip", "ipAddress", "internalNotes", "submitterEmail"].filter((k) => keys.has(k));
  check("A01", "GET /api/resources?limit=24 metadata keys", r.status === 200 && banned.length === 0, { status: r.status, banned, sampleKeys: [...keys].slice(0, 12) }); }
// B01 — an unpublished journey is 404 to anonymous visitors.
{ const [draft] = await q(`SELECT id FROM learning_journeys WHERE status <> 'published' ORDER BY id LIMIT 1`);
  if (draft) { const r = await call("GET", `/api/journeys/${draft.id}`); check("B01", `anon GET /api/journeys/${draft.id} (status<>published)`, r.status === 404, { status: r.status, body: r.text.slice(0, 80) }); }
  else check("B01", "no unpublished journey in DEV to probe", true, { note: "skipped: no draft row" }); }
// B09 — repeated recommendation query params no longer 500.
{ const r = await call("GET", "/api/recommendations?categories=a&categories=b&limit=2");
  check("B09", "anon GET /api/recommendations?categories=a&categories=b", r.status < 500, { status: r.status }); }
// C04 — malformed edit shape is a 400, never 500 (admin key; rejected before any write).
{ const [res] = await q(`SELECT id FROM resources WHERE status='approved' ORDER BY id LIMIT 1`);
  const before = (await q(`SELECT count(*)::int n FROM resource_edits`))[0].n;
  const r = await call("POST", `/api/resources/${res.id}/edits`, { admin: true, body: { proposedData: "string", proposedChanges: "string" } });
  const after = (await q(`SELECT count(*)::int n FROM resource_edits`))[0].n;
  check("C04", `POST /api/resources/${res.id}/edits malformed`, r.status === 400 && before === after, { status: r.status, body: r.text.slice(0, 120), editsDelta: after - before }); }
// D02 — duplicate taxonomy name is a 409 with field errors (no row created).
{ const [cat] = await q(`SELECT name FROM categories ORDER BY id LIMIT 1`);
  const before = (await q(`SELECT count(*)::int n FROM categories`))[0].n;
  const r = await call("POST", "/api/admin/categories", { admin: true, body: { name: cat.name, slug: "qa-test-plan-592-spot-dup" } });
  const after = (await q(`SELECT count(*)::int n FROM categories`))[0].n;
  check("D02", `POST /api/admin/categories duplicate name "${cat.name}"`, r.status === 409 && before === after, { status: r.status, body: r.text.slice(0, 160), categoriesDelta: after - before }); }
// E04/E05 — admin freshness endpoints answer with live data for the admin key.
{ const r = await call("GET", "/api/admin/digests/health", { admin: true });
  check("E05", "GET /api/admin/digests/health (admin)", r.status === 200, { status: r.status, keys: Object.keys(r.json ?? {}).slice(0, 8) }); }
// F04 — the removed SQL-dump/API-token export controls have no endpoint behind them.
{ const r = await call("GET", "/api/admin/export/sql", { admin: true }); const t = await call("POST", "/api/admin/export/api-token", { admin: true, body: {} });
  check("F04", "GET /api/admin/export/sql, POST /api/admin/export/api-token", r.status === 404 && t.status === 404, { status: [r.status, t.status] }); }
// G — research workspace endpoints are honestly read-only for GET and respond.
{ const r = await call("GET", "/api/researcher/jobs", { admin: true });
  check("G06", "GET /api/researcher/jobs (admin)", r.status === 200, { status: r.status, sample: r.text.slice(0, 100) }); }
// H05 — compatibility redirects keep pagination and filters.
for (const [from, to] of [["/subsubcategory/av1?page=2", "/sub-subcategory/av1?page=2"], ["/explore?q=ffmpeg&tags=open-source&page=2", "/search?q=ffmpeg&tags=open-source&page=2"]]) {
  const r = await fetch(`${out.base}${from}`, { redirect: "manual", headers: { Accept: "text/html" } });
  check("H05", `GET ${from}`, r.status === 301 && r.headers.get("location") === to, { status: r.status, location: r.headers.get("location") }); }
// H04 — an escaped taxonomy URL redirects to the single canonical path.
{ const r = await fetch(`${out.base}/category/encoding%2Dcodecs`, { redirect: "manual", headers: { Accept: "text/html" } });
  check("H04", "GET /category/encoding%2Dcodecs", [301, 308].includes(r.status) && r.headers.get("location") === "/category/encoding-codecs", { status: r.status, location: r.headers.get("location") }); }

const residue = (await q(`SELECT count(*)::int n FROM categories WHERE slug = 'qa-test-plan-592-spot-dup'`))[0].n;
out.residue = residue; console.log("residue categories", residue);
writeJson("/tmp/v592out/spot-reproduce.json", out);
await pool.end();
