// V18 part B — re-proof after two fixes found in part A:
//  (1) registrableDomain() split IP literals on dots, so 127.0.0.1 -> 127.1.0.1 (both "0.1") was a missed off-host
//      redirect and suspicion details read "0.1 -> localhost";
//  (2) the /admin/export link-check summary omitted the suspect count, so its numbers did not add up to the total.
// Real origin on 0.0.0.0:5196 (reachable at 127.0.0.1 and 127.1.0.1), seed scratch DB, instance C :5165.
import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep } from "./lib.mjs";
import { launch, newPage, signIn, shot, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1500)); writeJson("/tmp/v592out/v18b-ip-suspicion.json", out); };

const origin = http.createServer((req, res) => {
  const p = req.url.split("?")[0];
  if (p === "/ok/page") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(req.method === "HEAD" ? undefined : "<!doctype html><title>QA live</title><h1>QA live page</h1><p>Controlled QA origin page.</p>"); }
  if (p === "/ipjump/page") { res.writeHead(302, { Location: "http://127.1.0.1:5196/ok/page" }); return res.end(); }
  if (p === "/offhost/page") { res.writeHead(302, { Location: "http://localhost:5196/ok/page" }); return res.end(); }
  res.writeHead(404); res.end();
});
await new Promise((r) => origin.listen(5196, "0.0.0.0", r));
const ids = {};
for (const [tag, url] of [["ipJump", "http://127.0.0.1:5196/ipjump/page"], ["offHost", "http://127.0.0.1:5196/offhost/page"]]) {
  ids[tag] = (await q(`INSERT INTO resources (title, url, description, category, status) VALUES ($1,$2,'QA link-health fixture.',$3,'approved') RETURNING id`,
    [`__qa_test_plan_592_v18b ${tag}`, url, "__qa_test_plan_592_v16 Cat B"]))[0].id;
}
const fd = fs.openSync("/tmp/scrC-v18b.log", "a");
const cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5165", SEED_SOURCE_URL: "http://127.0.0.1:5198/unused.json" } });
const browser = await launch();
try {
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  const ADM = await mintUser("v18badmin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);
  const { page } = await newPage(browser, VPS.desktop);
  await signIn(page, ADM, "/admin/export");
  await page.goto(`${BASE}/admin/export`, { waitUntil: "domcontentloaded" }); await sleep(4000);
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
  await page.locator('[data-testid="button-run-link-check"]').click();
  await page.locator('[data-testid="dialog-confirm-export-job"]').waitFor();
  const rp = page.waitForResponse((r) => r.url().endsWith("/api/admin/check-links") && r.request().method() === "POST");
  await page.locator('[data-testid="button-confirm-export-job"]').click();
  const jobId = (await (await rp).json()).job.id;
  let j; const t1 = Date.now();
  while (Date.now() - t1 < 180_000) { j = (await q(`SELECT * FROM link_health_jobs WHERE id=$1`, [jobId]))[0]; if (!["pending", "processing"].includes(j.status)) break; await sleep(2000); }
  await sleep(4000);
  const summary = (await page.locator('[data-testid="export-link-check-progress"]').innerText()).replace(/\s+/g, " ");
  await shot(page, "V18b-export-summary-with-suspect-desktop", page.locator('[data-testid="export-link-check-job"]'));
  const rows = await q(`SELECT r.title, c.status, c.http_status, c.final_url, c.error_message FROM link_health_checks c JOIN resources r ON r.id=c.resource_id WHERE c.job_id=$1 AND r.title LIKE '%v18b%' ORDER BY r.id`, [jobId]);
  await page.goto(`${BASE}/admin/linkhealth`, { waitUntil: "domcontentloaded" }); await sleep(5000);
  const flagged = (await page.locator(".ops-link-health__flagged-card").innerText()).replace(/\s+/g, " ");
  await shot(page, "V18b-linkhealth-ip-suspect-desktop", page.locator(".ops-link-health__flagged-card"));
  step("result", { ids, job: { id: j.id, status: j.status, total: j.total_links, healthy: j.healthy_links, broken: j.broken_links, redirect: j.redirect_links, timeout: j.timeout_links, suspect: j.suspect_links },
    summary, sumAddsUp: j.healthy_links + j.broken_links + j.redirect_links + j.timeout_links + j.suspect_links === j.total_links, fixtures: rows, flaggedExcerpt: flagged.match(/__qa_test_plan_592_v18b.{0,400}/)?.[0] });
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  await teardownAll();
  try { process.kill(-cProc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {}
  origin.close();
  await q(`DELETE FROM link_health_checks`); await q(`DELETE FROM link_health_jobs`);
  await q(`DELETE FROM resource_audit_log WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE '%592\\_v18b%')`);
  await q(`DELETE FROM resources WHERE title LIKE '%592\\_v18b%'`);
  const residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int qa_users, (SELECT count(*) FROM resources WHERE title LIKE '%v18%')::int v18_resources, (SELECT count(*) FROM link_health_jobs)::int jobs, (SELECT count(*) FROM link_health_checks)::int checks`))[0];
  step("cleanup", { residue });
  process.exit(0);
}
