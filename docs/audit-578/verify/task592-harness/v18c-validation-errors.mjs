// V18 part C — the Run Validation "Errors" branch. Part A's catalog produced 0 errors, so this run inserts an owned
// approved resource whose description breaks two awesome-lint error rules (lowercase start, no final period) and
// checks whether the export path carries it into the validated markdown (Errors expander with line numbers) or
// normalises it away. Seed scratch DB, instance C :5165.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 2500)); writeJson("/tmp/v592out/v18c-validation-errors.json", out); };

const DESC = "qa lint fixture with a lowercase start and no final period";
const [fx] = await q(`INSERT INTO resources (title, url, description, category, status) VALUES ($1,$2,$3,$4,'approved') RETURNING id`,
  ["__qa_test_plan_592_v18c lintfail", "https://example.com/qa-592-v18c-lint", DESC, "__qa_test_plan_592_v16 Cat B"]);
const fd = fs.openSync("/tmp/scrC-v18c.log", "a");
const cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5165", DISABLE_BACKGROUND_JOBS: "1", SEED_SOURCE_URL: "http://127.0.0.1:5198/unused.json" } });
const browser = await launch();
try {
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  const ADM = await mintUser("v18cadmin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);
  const { page } = await newPage(browser, VPS.desktop);
  await signIn(page, ADM, "/admin/export");
  await page.goto(`${BASE}/admin/export`, { waitUntil: "domcontentloaded" }); await sleep(4000);
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
  await page.getByRole("button", { name: /Run Validation/ }).click();
  await page.locator('[data-testid="dialog-confirm-export-job"]').waitFor();
  const vResp = page.waitForResponse((r) => r.url().endsWith("/api/admin/validate") && r.request().method() === "POST", { timeout: 120_000 });
  await page.locator('[data-testid="button-confirm-export-job"]').click();
  const vr = await vResp; const vj = await vr.json().catch(() => null);
  await sleep(2500);
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
  const errBtn = page.getByRole("button", { name: /^Errors \(/ });
  const hasErrBtn = await errBtn.count();
  if (hasErrBtn) await errBtn.first().click();
  await sleep(800);
  const panel = page.locator(".admin-ops-validation-panel").first();
  await panel.scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, "V18c-export-validation-errors-desktop", panel);
  step("validate", { fixtureId: fx.id, status: vr.status(), valid: vj?.valid, errors: vj?.errors, warningsCount: vj?.warnings?.length, hasErrorsExpander: hasErrBtn,
    panelText: (await panel.innerText()).replace(/\s+/g, " ").slice(0, 1200), toasts: await toasts(page) });
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  await teardownAll();
  try { process.kill(-cProc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {}
  await q(`DELETE FROM resource_audit_log WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE '%592\\_v18c%')`);
  await q(`DELETE FROM resources WHERE title LIKE '%592\\_v18c%'`);
  const residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int qa_users, (SELECT count(*) FROM resources WHERE title LIKE '%v18%')::int v18_resources`))[0];
  step("cleanup", { residue });
  process.exit(0);
}
