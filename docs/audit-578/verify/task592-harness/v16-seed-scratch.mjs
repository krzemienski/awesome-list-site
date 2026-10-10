// V16 — Seed, typed RESEED, rollback/refusal and global maintenance, on an EMPTY scratch DB (awesome_scratch_592_seed)
// that holds only QA data. Instance C (:5165) reads its seed source from a real local HTTP server (:5198) whose
// payload we switch between modes (SEED_SOURCE_URL is the app's supported override). Background jobs enabled.
// Env: DATABASE_URL = seed scratch URL, BASE_URL = http://127.0.0.1:5165.
import http from "node:http";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep, PREFIX, token } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1600)); writeJson("/tmp/v592out/v16-seed.json", out); };

// ---------- Seed source (real HTTP server) ----------
const T = (s) => `${PREFIX}v16 ${s}`;
const U = (p) => `https://example.org/__qa_test_plan_592_v16/${p}`;
const cats = [
  { id: "c1", title: T("Cat A") }, { id: "c2", title: T("Cat B") },
  { id: "s1", title: T("Sub A1"), parent: "c1" }, { id: "ss1", title: T("Leaf A1x"), parent: "s1" },
];
const proj = (t, p, c, tags) => ({ title: T(t), homepage: U(p), description: `${T(t)} description`, category: c, tags });
const V1 = { categories: cats, projects: [
  proj("P1", "p1", ["ss1"], ["FFmpeg", "ffmpeg"]),
  proj("P2", "p2", ["s1"], ["live_streaming", "Live Streaming"]),
  proj("P3", "p3", ["c2"], ["codecs"]),
  proj("P4", "p4", ["c1"], ["codec"]),
  { ...proj("P5 dup of P1", "p1", ["c1"], []), homepage: "https://EXAMPLE.org/__qa_test_plan_592_v16/p1/" },
] };
const V2 = { categories: [...cats, { id: "c3", title: T("Cat C") }], projects: [
  proj("P2 v2", "p2", ["s1"], ["x"]),
  proj("P3 v2", "p3", ["c2"], ["x"]),
  proj("P6", "p6", ["c3"], ["Codec", "FFMPEG"]),
  proj("P7", "p7", ["ss1"], ["live-streaming"]),
  proj("P8", "p8", ["c1"], ["Live Streaming"]),
] };
const BADCAT = { categories: cats, projects: [proj("P9", "p9", ["nope"], [])] };
const EMPTYTITLE = { categories: [...cats, { id: "c9", title: "" }], projects: [proj("P10", "p10", ["c2"], []), proj("P11", "p11", ["c9"], [])] };
let mode = "down"; const hits = [];
const src = http.createServer((req, res) => {
  hits.push({ at: new Date().toISOString(), mode, url: req.url });
  if (mode === "down") { res.writeHead(503, { "Content-Type": "text/plain" }); return res.end("source down"); }
  if (mode === "badjson") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end("{ not json"); }
  const body = { v1: V1, v2: V2, badcat: BADCAT, emptytitle: EMPTYTITLE }[mode];
  res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(body));
});
await new Promise((r) => src.listen(5198, "127.0.0.1", r));

// ---------- Instance C ----------
const fd = fs.openSync("/tmp/scrC-v16.log", "a");
const cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5165", SEED_SOURCE_URL: "http://127.0.0.1:5198/seed.json" } });
const stopC = async () => { try { process.kill(-cProc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {} };

const snapshot = async () => (await q(`SELECT md5(
   coalesce((SELECT string_agg(id||'|'||url||'|'||title||'|'||category||'|'||coalesce(subcategory,'')||'|'||coalesce(sub_subcategory,'')||'|'||coalesce(metadata->>'tags',''), ';' ORDER BY id) FROM resources),'') ||
   coalesce((SELECT string_agg(id||'|'||name, ';' ORDER BY id) FROM categories),'') ||
   coalesce((SELECT string_agg(id||'|'||name, ';' ORDER BY id) FROM subcategories),'') ||
   coalesce((SELECT string_agg(id||'|'||name, ';' ORDER BY id) FROM sub_subcategories),'')) AS md5,
  (SELECT count(*) FROM resources)::int resources, (SELECT count(*) FROM categories)::int categories,
  (SELECT count(*) FROM subcategories)::int subcategories, (SELECT count(*) FROM sub_subcategories)::int sub_subcategories`))[0];
let ADM;
const api = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: body === undefined ? "GET" : "POST", headers: { "Content-Type": "application/json", Origin: BASE, Authorization: `Bearer ${await token(ADM)}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, text: t.slice(0, 400) };
};
const pub = async (path) => { const r = await fetch(`${BASE}${path}`, { headers: { "Cache-Control": "no-cache" } }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { status: r.status, json: j }; };
const pubCats = async () => { const r = await pub("/api/categories"); const arr = Array.isArray(r.json) ? r.json : (r.json?.categories ?? []); return { status: r.status, names: arr.map((c) => c.name).filter((n) => n?.startsWith(PREFIX)).sort() }; };
const byUrl = async (p) => (await q(`SELECT id, title, category, subcategory, sub_subcategory, metadata->'tags' tags, approved_at FROM resources WHERE url=$1`, [U(p)]))[0] ?? null;

const browser = await launch();
try {
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) { up = true; break; } } catch {} await sleep(1000); }
  if (!up) throw new Error("C did not come up");
  await sleep(4000);
  const bootLog = fs.readFileSync("/tmp/scrC-v16.log", "utf8").split("\n").filter((l) => /seed|Seed/.test(l)).slice(-6);
  step("boot-autoseed-aborted", { upMs: Date.now() - t0, sourceHits: hits.length, bootLog, snapshot: await snapshot() });

  ADM = await mintUser("v16admin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);
  const { page } = await newPage(browser, VPS.desktop);
  await signIn(page, ADM, "/admin/database");
  await page.goto(`${BASE}/admin/database`, { waitUntil: "domcontentloaded" });
  const openSeeding = async (pg) => {
    const d = pg.locator("details.admin-ops-more").first(); await d.waitFor({ state: "attached", timeout: 45_000 });
    if (!(await d.evaluate((el) => el.open))) await d.locator("summary").click();
    await pg.locator('[data-testid="button-seed-database"]').waitFor({ timeout: 20_000 });
  };
  const uiSeed = async (pg, reseed, typed = "RESEED") => {
    await openSeeding(pg);
    if (!reseed) {
      await pg.locator('[data-testid="button-seed-database"]').click();
      await pg.locator('[data-testid="button-seed-confirm"]').waitFor();
      const rp = pg.waitForResponse((r) => r.url().includes("/api/admin/seed-database"), { timeout: 120_000 });
      await pg.locator('[data-testid="button-seed-confirm"]').click();
      const r = await rp; return { status: r.status(), body: await r.json().catch(() => null) };
    }
    await pg.locator('[data-testid="button-clear-reseed"]').click();
    const input = pg.locator('[data-testid="input-reseed-confirm"]'); await input.waitFor();
    await input.fill("reseed");
    const disabledLower = await pg.locator('[data-testid="button-reseed-confirm"]').isDisabled();
    await input.fill(typed);
    const disabledTyped = await pg.locator('[data-testid="button-reseed-confirm"]').isDisabled();
    const rp = pg.waitForResponse((r) => r.url().includes("/api/admin/seed-database"), { timeout: 120_000 });
    await pg.locator('[data-testid="button-reseed-confirm"]').click();
    const r = await rp; return { disabledLower, disabledTyped, status: r.status(), body: await r.json().catch(() => null) };
  };
  const card = async (pg) => (await pg.locator('[data-testid^="seed-result-"]').first().innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 600);

  // F1: additive seed while the source is down → UI failure card, unchanged.
  const s0 = await snapshot();
  const f1 = await uiSeed(page, false); await sleep(800);
  const f1card = await card(page); await shot(page, "V16-seed-source-down-desktop");
  step("F1-source-down-ui", { ...f1, card: f1card, unchanged: (await snapshot()).md5 === s0.md5 });

  // Seed v1 through the UI.
  mode = "v1";
  const catsBefore = await pubCats();
  const s1 = await uiSeed(page, false); await sleep(800);
  const s1card = await card(page); await shot(page, "V16-seed-v1-desktop");
  const snap1 = await snapshot();
  const rows1 = await q(`SELECT id, title, url, category, subcategory, sub_subcategory, metadata->'tags' tags, status FROM resources ORDER BY id`);
  const catsAfter = await pubCats();
  const adminRow = (await q(`SELECT count(*)::int n FROM users WHERE email='admin@example.com'`))[0].n;
  step("seed-v1-ui", { ...s1, card: s1card, snapshot: snap1, rows: rows1, publicCategories: { before: catsBefore, after: catsAfter }, auditAdminRow: adminRow });

  // Duplicate-safe rerun through the UI.
  await page.reload({ waitUntil: "domcontentloaded" });
  const s2 = await uiSeed(page, false); await sleep(800);
  const s2card = await card(page); await shot(page, "V16-seed-rerun-desktop");
  step("seed-rerun-ui", { ...s2, card: s2card, unchanged: (await snapshot()).md5 === snap1.md5 });

  // Dependent data: bookmark P2 through the real API; a pending edit on P3 by SQL (the edit API starts paid AI analysis).
  const P2 = await byUrl("p2"), P3 = await byUrl("p3");
  const bm = await fetch(`${BASE}/api/bookmarks/${P2.id}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE, Authorization: `Bearer ${await token(ADM)}` }, body: JSON.stringify({ notes: T("bookmark note") }) });
  const [ed] = await q(`INSERT INTO resource_edits (resource_id, submitted_by, status, original_resource_updated_at, proposed_changes, proposed_data)
     VALUES ($1,$2,'pending',now(),$3,$4) RETURNING id`, [P3.id, ADM.bridgeId, JSON.stringify({ description: { old: "x", new: T("edit") } }), JSON.stringify({ description: T("edit") })]);
  step("dependents", { P2: P2.id, P3: P3.id, bookmarkStatus: bm.status, editId: ed.id });

  // Reseed failures, each must leave the DB byte-identical.
  const before = await snapshot();
  const fail = async (label, m, viaUi) => {
    mode = m;
    const r = viaUi ? await uiSeed(page, true) : await api("/api/admin/seed-database", { clearExisting: true });
    await sleep(800);
    let c = null; if (viaUi) { c = await card(page); await shot(page, `V16-reseed-${label}-desktop`); }
    step(`reseed-fail-${label}`, { status: r.status, body: r.body ?? r.json, card: c, unchanged: (await snapshot()).md5 === before.md5 });
  };
  await fail("source-503", "down", false);
  await fail("invalid-json", "badjson", false);
  await fail("unknown-category", "badcat", false);
  await page.reload({ waitUntil: "domcontentloaded" });
  await fail("rollback-empty-title", "emptytitle", true);
  // FK refusal: an external table referencing the taxonomy.
  await q(`CREATE TABLE qa592_taxo_ref (id serial primary key, category_id int REFERENCES categories(id))`);
  await q(`INSERT INTO qa592_taxo_ref (category_id) SELECT min(id) FROM categories`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await fail("fk-refused", "v2", true);
  await q(`DROP TABLE qa592_taxo_ref`);

  // Typed RESEED with v2 through the UI at 390.
  mode = "v2";
  const { page: m } = await newPage(browser, VPS["390"]);
  await signIn(m, ADM, "/admin/database");
  await m.goto(`${BASE}/admin/database`, { waitUntil: "domcontentloaded" });
  const rs = await uiSeed(m, true); await sleep(800);
  const rscard = await card(m); await shot(m, "V16-reseed-v2-390");
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const rows2 = await q(`SELECT id, title, url, category, subcategory, sub_subcategory, metadata->'tags' tags FROM resources ORDER BY id`);
  const bm2 = (await q(`SELECT resource_id, notes FROM user_bookmarks WHERE user_id=$1`, [ADM.bridgeId]));
  const ed2 = (await q(`SELECT resource_id, status FROM resource_edits WHERE id=$1`, [ed.id]))[0];
  const taxo2 = await q(`SELECT 'c' k, id, name FROM categories UNION ALL SELECT 's', id, name FROM subcategories UNION ALL SELECT 'ss', id, name FROM sub_subcategories ORDER BY 1, 2`);
  const pubP2 = await pub(`/api/resources/${P2.id}`), pubP1 = rows1.find((r) => r.url === U("p1")) ? await pub(`/api/resources/${rows1.find((r) => r.url === U("p1")).id}`) : null;
  step("reseed-v2-ui-390", { disabledLower: rs.disabledLower, disabledTyped: rs.disabledTyped, status: rs.status, body: rs.body, card: rscard, mobileOverflowPx: overflow, rows: rows2, bookmarks: bm2, edit: ed2, taxonomy: taxo2,
    publicCategories: await pubCats(), publicP2: { status: pubP2.status, title: pubP2.json?.title }, publicDeletedP1: pubP1?.status, snapshot: await snapshot() });
  await m.close();

  // ---------- Maintenance (each run twice) ----------
  // E030 backfill-approved-at
  const nullBefore = (await q(`SELECT count(*)::int n FROM resources WHERE status='approved' AND approved_at IS NULL`))[0].n;
  const P6 = await byUrl("p6");
  const pubP6a = await pub(`/api/resources/${P6.id}`);
  const e030a = await api("/api/admin/maintenance/backfill-approved-at", {});
  const e030b = await api("/api/admin/maintenance/backfill-approved-at", {});
  const pubP6b = await pub(`/api/resources/${P6.id}`);
  const e030sql = await q(`SELECT count(*) FILTER (WHERE approved_at = created_at)::int eq_created, count(*) FILTER (WHERE approved_at IS NULL)::int still_null FROM resources WHERE status='approved'`);
  step("E030-backfill-approved-at", { nullBefore, first: e030a, second: e030b, sql: e030sql[0], publicP6approvedAt: { before: pubP6a.json?.approvedAt ?? null, after: pubP6b.json?.approvedAt ?? null } });

  // E031 canonicalize-tags
  const tagsBefore = await q(`SELECT id, title, metadata->'tags' tags FROM resources WHERE jsonb_array_length(coalesce(metadata->'tags','[]'::jsonb))>0 ORDER BY id`);
  const pubP7a = await pub(`/api/resources/${(await byUrl("p7")).id}`);
  const e031a = await api("/api/admin/maintenance/canonicalize-tags", {});
  const e031b = await api("/api/admin/maintenance/canonicalize-tags", {});
  const tagsAfter = await q(`SELECT id, title, metadata->'tags' tags FROM resources WHERE jsonb_array_length(coalesce(metadata->'tags','[]'::jsonb))>0 ORDER BY id`);
  const pubP7b = await pub(`/api/resources/${(await byUrl("p7")).id}`);
  step("E031-canonicalize-tags", { first: e031a, second: e031b, before: tagsBefore, after: tagsAfter, publicP7tags: { before: pubP7a.json?.metadata?.tags ?? pubP7a.json?.tags, after: pubP7b.json?.metadata?.tags ?? pubP7b.json?.tags } });

  // E012 backfill-suggestions: P8 (Cat A, no sub) suggests existing Sub A1 + new leaf; P6 (Cat C) suggests a sub that has no row.
  const P8 = await byUrl("p8");
  await q(`UPDATE resources SET metadata = metadata || $2::jsonb WHERE id=$1`, [P8.id, JSON.stringify({ suggestedSubcategory: T("Sub A1"), suggestedSubSubcategory: T("Leaf A1 new") })]);
  await q(`UPDATE resources SET metadata = metadata || $2::jsonb WHERE id=$1`, [P6.id, JSON.stringify({ suggestedSubcategory: T("Sub C1"), suggestedSubSubcategory: T("Leaf C1x") })]);
  const ssBefore = await q(`SELECT id, name, subcategory_id FROM sub_subcategories ORDER BY id`);
  const pubCatTreeA = await pub("/api/categories");
  const e012a = await api("/api/admin/enrichment/backfill-suggestions", {});
  const e012b = await api("/api/admin/enrichment/backfill-suggestions", {});
  const ssAfter = await q(`SELECT id, name, subcategory_id FROM sub_subcategories ORDER BY id`);
  const p68 = await q(`SELECT id, title, category, subcategory, sub_subcategory FROM resources WHERE id = ANY($1::int[]) ORDER BY id`, [`{${P6.id},${P8.id}}`]);
  const pubP8 = await pub(`/api/resources/${P8.id}`);
  const subsC = await q(`SELECT count(*)::int n FROM subcategories WHERE name=$1`, [T("Sub C1")]);
  step("E012-backfill-suggestions", { first: e012a, second: e012b, subSubBefore: ssBefore, subSubAfter: ssAfter, resources: p68, subcategoryRowForSubC1: subsC[0].n,
    publicP8: { subcategory: pubP8.json?.subcategory, subSubcategory: pubP8.json?.subSubcategory }, categoriesStatusBefore: pubCatTreeA.status });
  await page.close();
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  await teardownAll();
  await q(`DROP TABLE IF EXISTS qa592_taxo_ref`).catch(() => {});
  out.sourceHits = hits;
  out.residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int qa_users,
    (SELECT count(*) FROM user_bookmarks)::int bookmarks, (SELECT count(*) FROM resource_edits)::int edits,
    (SELECT count(*) FROM pg_tables WHERE tablename='qa592_taxo_ref')::int fk_table`))[0];
  step("residue", out.residue);
  await stopC(); src.close();
  process.exit(0);
}
