// V16b — re-prove E012 backfill-suggestions after the orphan-label fix, plus the empty RESEED confirm guard.
// Same seed scratch DB and instance-C configuration as v16-seed-scratch.mjs.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep, PREFIX, token } from "./lib.mjs";
import { launch, newPage, signIn, shot, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1600)); writeJson("/tmp/v592out/v16b-backfill.json", out); };
const T = (s) => `${PREFIX}v16 ${s}`;
const fd = fs.openSync("/tmp/scrC-v16b.log", "a");
const cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5165", SEED_SOURCE_URL: "http://127.0.0.1:5198/unused.json" } });
let ADM;
const api = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE, Authorization: `Bearer ${await token(ADM)}` }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const rowsOf = () => q(`SELECT id, title, category, subcategory, sub_subcategory, metadata->>'suggestedSubcategory' s_sub, metadata->>'suggestedSubSubcategory' s_ss FROM resources WHERE id IN (2,3,6) ORDER BY id`);
const browser = await launch();
try {
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  ADM = await mintUser("v16badmin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);

  const orphanBefore = await q(`SELECT r.id, r.subcategory, r.sub_subcategory,
      EXISTS (SELECT 1 FROM subcategories s JOIN categories c ON c.id=s.category_id WHERE s.name=r.subcategory AND c.name=r.category) sub_row_exists
    FROM resources r WHERE r.id=6`);
  step("pre-fix-state-left-by-v16", { p6: orphanBefore[0] });

  // Fixtures: P6 back to "never promoted" (Cat C, no sub) — suggests a subcategory that has no row.
  //           P3 (Cat B, no sub) suggests "Sub A1", which exists only under Cat A.
  //           P2 (Cat A > Sub A1, no leaf) suggests a new leaf → must be created and promoted.
  await q(`UPDATE resources SET subcategory=NULL, sub_subcategory=NULL WHERE id=6`);
  await q(`UPDATE resources SET metadata = metadata || $2::jsonb WHERE id=$1`, [3, JSON.stringify({ suggestedSubcategory: T("Sub A1"), suggestedSubSubcategory: T("Leaf B wrong parent") })]);
  await q(`UPDATE resources SET metadata = metadata || $2::jsonb WHERE id=$1`, [2, JSON.stringify({ suggestedSubSubcategory: T("Leaf A1 second") })]);
  const before = await rowsOf();
  const ssBefore = await q(`SELECT id, name, subcategory_id FROM sub_subcategories ORDER BY id`);
  const a = await api("/api/admin/enrichment/backfill-suggestions", {});
  const mid = await rowsOf();
  const b = await api("/api/admin/enrichment/backfill-suggestions", {});
  const after = await rowsOf();
  const ssAfter = await q(`SELECT id, name, subcategory_id FROM sub_subcategories ORDER BY id`);
  const orphans = await q(`SELECT count(*)::int n FROM resources r WHERE r.subcategory IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM subcategories s JOIN categories c ON c.id=s.category_id WHERE s.name=r.subcategory AND c.name=r.category)`);
  const pub2 = await (await fetch(`${BASE}/api/resources/2`, { headers: { "Cache-Control": "no-cache" } })).json();
  step("E012-after-fix", { before, subSubBefore: ssBefore, first: a, afterFirst: mid, second: b, after, subSubAfter: ssAfter, orphanSubcategoryLabels: orphans[0].n,
    publicP2: { subcategory: pub2.subcategory, subSubcategory: pub2.subSubcategory } });

  // Empty / wrong confirmation keeps Clear & Re-seed disabled; Cancel writes nothing.
  const snap = async () => (await q(`SELECT md5(string_agg(id||title||category, ';' ORDER BY id)) m FROM resources`))[0].m;
  const s0 = await snap();
  const { page } = await newPage(browser, VPS.desktop);
  await signIn(page, ADM, "/admin/database");
  await page.goto(`${BASE}/admin/database`, { waitUntil: "domcontentloaded" });
  const d = page.locator("details.admin-ops-more").first(); await d.waitFor({ state: "attached", timeout: 45_000 });
  await d.locator("summary").click();
  await page.locator('[data-testid="button-clear-reseed"]').click();
  const input = page.locator('[data-testid="input-reseed-confirm"]'); await input.waitFor();
  const btn = page.locator('[data-testid="button-reseed-confirm"]');
  const states = { empty: await btn.isDisabled() };
  await input.fill("RESEE"); states.partial = await btn.isDisabled();
  await input.fill("delete"); states.wrongWord = await btn.isDisabled();
  await input.fill("  reseed "); states.caseInsensitiveTrimmed = await btn.isDisabled();
  await input.fill(""); await shot(page, "V16b-reseed-dialog-empty-disabled-desktop");
  await page.locator('[data-testid="button-reseed-cancel"]').click(); await sleep(800);
  step("reseed-confirm-guard", { disabled: states, dialogClosed: (await page.locator('[data-testid="dialog-clear-reseed"]').count()) === 0, unchanged: (await snap()) === s0 });
  await page.close();
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  await teardownAll();
  out.residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int qa_users`))[0];
  step("residue", out.residue);
  try { process.kill(-cProc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {}
  process.exit(0);
}
