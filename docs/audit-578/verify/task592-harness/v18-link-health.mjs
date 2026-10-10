// V18 — whole-catalog link checking + populated scan-result controls, on the seed scratch DB (instance C :5165,
// background jobs ENABLED so boot recovery runs). A real local HTTP origin (127.0.0.1:5196) serves live/404/redirect/
// slow/403/root-collapse/off-host responses; one URL points at a closed port (connection refused). No mocks.
import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep, token } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
if (process.env.DISABLE_BACKGROUND_JOBS) throw new Error("background jobs must be enabled for boot recovery");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [], originHits: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1500)); writeJson("/tmp/v592out/v18-link-health.json", out); };

// ---------- controlled origin ----------
const O = "http://127.0.0.1:5196";
const html = (t) => `<!doctype html><html><head><title>${t}</title></head><body><h1>${t}</h1><p>Controlled QA origin page for an isolated link-health proof. This page documents a video streaming resource.</p></body></html>`;
const origin = http.createServer((req, res) => {
  out.originHits.push(`${new Date().toISOString().slice(11, 19)} ${req.method} ${req.url} ${String(req.headers["user-agent"]).slice(0, 40)}`);
  const p = req.url.split("?")[0];
  if (p === "/ok/page" || p === "/ok/landing" || p === "/") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end(req.method === "HEAD" ? undefined : html("QA live " + p)); }
  if (p === "/gone/page") { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("not found"); }
  if (p === "/moved/page") { res.writeHead(301, { Location: "/ok/landing" }); return res.end(); }
  if (p === "/forbidden/page") { res.writeHead(403, { "Content-Type": "text/plain" }); return res.end("forbidden"); }
  if (p === "/collapse/deep/page") { res.writeHead(302, { Location: "/" }); return res.end(); }
  if (p === "/offhost/page") { res.writeHead(302, { Location: "http://localhost:5196/ok/page" }); return res.end(); }
  if (p === "/slow/page") { const t = setTimeout(() => { try { res.writeHead(200, { "Content-Type": "text/html" }); res.end(html("late")); } catch {} }, 40_000); req.on("close", () => clearTimeout(t)); return; }
  res.writeHead(404); res.end();
});
await new Promise((r) => origin.listen(5196, "127.0.0.1", r));

const FIX = [
  ["live", `${O}/ok/page`], ["gone404", `${O}/gone/page`], ["sameHostRedirect", `${O}/moved/page`],
  ["slow", `${O}/slow/page`], ["forbidden403", `${O}/forbidden/page`], ["rootCollapse", `${O}/collapse/deep/page`],
  ["offHost", `${O}/offhost/page`], ["refused", "http://127.0.0.1:5195/closed/page"],
];
const ids = {};
for (const [tag, url] of FIX) {
  const [r] = await q(`INSERT INTO resources (title, url, description, category, status) VALUES ($1,$2,$3,$4,'approved') RETURNING id`,
    [`__qa_test_plan_592_v18 ${tag}`, url, `QA link-health fixture (${tag}) served by a controlled local origin.`, "__qa_test_plan_592_v16 Cat B"]);
  ids[tag] = r.id;
}
step("fixtures", { ids, approvedTotal: (await q(`SELECT count(*)::int n FROM resources WHERE status='approved'`))[0].n, jobsBefore: (await q(`SELECT count(*)::int n FROM link_health_jobs`))[0].n });

// ---------- instance C ----------
let cProc = null;
const startC = async (label) => {
  const fd = fs.openSync(`/tmp/scrC-v18-${label}.log`, "a");
  cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
    env: { ...process.env, PORT: "5165", SEED_SOURCE_URL: "http://127.0.0.1:5198/unused.json" } });
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) return Date.now() - t0; } catch {} await sleep(1000); }
  throw new Error("C did not come up: " + label);
};
const stopC = async (signal = "SIGTERM") => { if (!cProc) return; try { process.kill(-cProc.pid, signal); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {} cProc = null; await sleep(1500); };
let ADM;
const api = async (method, path, body) => {
  const r = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json", Origin: BASE, Authorization: `Bearer ${await token(ADM)}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, text: t };
};
const job = async (id) => (await q(`SELECT id, status, total_links, checked_links, healthy_links, broken_links, redirect_links, timeout_links, suspect_links, error_message FROM link_health_jobs WHERE id=$1`, [id]))[0];
const waitJob = async (id, ms = 240_000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const j = await job(id); if (j && !["pending", "processing"].includes(j.status)) return { ...j, ms: Date.now() - t0 }; await sleep(2000); } return { ...(await job(id)), timeout: true }; };
const latestJobId = async () => (await q(`SELECT max(id)::int id FROM link_health_jobs`))[0].id;
const checkRows = (jobId) => q(`SELECT c.resource_id, r.title, c.url, r.url AS stored_url, c.status, c.http_status, c.final_url, c.error_message FROM link_health_checks c JOIN resources r ON r.id=c.resource_id WHERE c.job_id=$1 ORDER BY c.resource_id`, [jobId]);
const bodyText = async (pg, sel = "body") => (await pg.locator(sel).first().innerText().catch(() => "")).replace(/\s+/g, " ");
const openAdmin = async (browser, tab, vp = VPS.desktop) => {
  const { page } = await newPage(browser, vp);
  await signIn(page, ADM, `/admin/${tab}`);
  await page.goto(`${BASE}/admin/${tab}`, { waitUntil: "domcontentloaded" });
  await sleep(4000);
  return page;
};

const browser = await launch();
try {
  step("C-up", { upMs: await startC("main") });
  ADM = await mintUser("v18admin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);

  // ---- (1) /admin/export: Run Validation (C1066) ----
  let page = await openAdmin(browser, "export");
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
  const valBefore = (await bodyText(page)).match(/No validation results yet|Validation Results.{0,120}/)?.[0];
  await page.getByRole("button", { name: /Run Validation/ }).click();
  const vdlg = page.locator('[data-testid="dialog-confirm-export-job"]'); await vdlg.waitFor();
  const vdlgText = await bodyText(page, '[data-testid="dialog-confirm-export-job"]');
  const vResp = page.waitForResponse((r) => r.url().endsWith("/api/admin/validate") && r.request().method() === "POST", { timeout: 120_000 });
  await page.locator('[data-testid="button-confirm-export-job"]').click();
  const vr = await vResp; const vj = await vr.json().catch(() => null);
  await sleep(2500);
  await page.evaluate(() => document.querySelectorAll("details").forEach((d) => { d.open = true; }));
  for (const name of [/^Errors \(/, /^Warnings \(/]) { const b = page.getByRole("button", { name }); if (await b.count()) await b.first().click(); }
  await sleep(800);
  const panel = page.locator(".admin-ops-validation-panel").first();
  await panel.scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, "V18-export-validation-results-desktop", panel);
  step("export-validate-ui", { before: valBefore, dialog: vdlgText, status: vr.status(), valid: vj?.valid, errors: vj?.errors?.length, warnings: vj?.warnings?.length, stats: vj?.stats,
    firstErrors: vj?.errors?.slice(0, 4), firstWarnings: vj?.warnings?.slice(0, 4), panelText: (await panel.innerText()).replace(/\s+/g, " ").slice(0, 900), toasts: await toasts(page) });

  // ---- (2) /admin/export: Run Link Check (E009) ----
  await page.locator('[data-testid="button-run-link-check"]').click();
  await page.locator('[data-testid="dialog-confirm-export-job"]').waitFor();
  const lResp = page.waitForResponse((r) => r.url().endsWith("/api/admin/check-links") && r.request().method() === "POST");
  await page.locator('[data-testid="button-confirm-export-job"]').click();
  const lr = await lResp; const lj = await lr.json().catch(() => null);
  const job1 = lj?.job?.id;
  await sleep(6000);
  const progressRunning = await bodyText(page, '[data-testid="export-link-check-progress"]');
  await shot(page, "V18-export-linkcheck-running-desktop", page.locator('[data-testid="export-link-check-job"]'));
  // second click while running → 409 "already running" path through the API
  const dup = await api("POST", "/api/admin/check-links");
  const fin1 = await waitJob(job1);
  await sleep(4000);
  const progressDone = await bodyText(page, '[data-testid="export-link-check-progress"]');
  await shot(page, "V18-export-linkcheck-completed-desktop", page.locator('[data-testid="export-link-check-job"]'));
  const rows1 = await checkRows(job1);
  const approved = await q(`SELECT id, url FROM resources WHERE status='approved' ORDER BY id`);
  const md = await api("POST", "/api/admin/export", {});
  const mdText = md.text ?? "";
  step("export-linkcheck", { start: { status: lr.status(), started: lj?.started, scope: lj?.scope, jobId: job1 }, progressRunning, duplicateStart: { status: dup.status, message: dup.json?.message },
    final: fin1, progressDone, toasts: await toasts(page),
    scope: { approvedResources: approved.length, checkRows: rows1.length, everyApprovedChecked: approved.every((a) => rows1.some((r) => r.resource_id === a.id)), urlsEqualStored: rows1.every((r) => r.url === r.stored_url) },
    fixtureVerdicts: rows1.filter((r) => r.title.includes("v18")).map((r) => ({ t: r.title.replace("__qa_test_plan_592_v18 ", ""), status: r.status, http: r.http_status, final: r.final_url, msg: (r.error_message ?? "").slice(0, 140) })),
    dbCountsByStatus: await q(`SELECT status, count(*)::int n FROM link_health_checks WHERE job_id=$1 GROUP BY status ORDER BY status`, [job1]),
    exportMarkdown: { status: md.status, fixtureUrlsInExport: FIX.filter(([, u]) => mdText.includes(u)).map(([t]) => t), length: mdText.length } });
  await page.close();

  // ---- (3) /admin/linkhealth: populated counters, table, filters ----
  page = await openAdmin(browser, "linkhealth");
  const statText = await bodyText(page, ".ops-link-health__stat-grid");
  const failuresText = await bodyText(page, ".ops-link-health__flagged-card");
  await shot(page, "V18-linkhealth-populated-desktop");
  await page.locator('[data-testid="button-link-health-more"]').click(); await sleep(2500);
  const filters = {};
  for (const [value, label] of [["all", /All Issues/], ["broken", /Broken Links/], ["timeout", /Timeouts/], ["redirect", /Redirects/], ["suspect", /Suspect/]]) {
    await page.getByRole("combobox", { name: "Filter by link status" }).click();
    const rp = page.waitForResponse((r) => r.url().includes("/api/admin/link-health/broken-links"), { timeout: 8000 }).catch(() => null);
    await page.getByRole("option", { name: label }).click();
    await rp; await sleep(1200);
    const card = page.locator(".ops-link-health__problem-card");
    const apiRes = await api("GET", `/api/admin/link-health/broken-links?status=${value}`);
    filters[value] = { ui: (await card.innerText()).replace(/\s+/g, " ").slice(0, 600), api: (apiRes.json?.checks ?? []).map((l) => `${l.status}:${(l.resourceTitle ?? l.resource?.title ?? l.title ?? l.url ?? '').replace("__qa_test_plan_592_v18 ", "")}`) };
    if (value === "broken" || value === "suspect") await shot(page, `V18-linkhealth-filter-${value}-desktop`, card);
  }
  step("linkhealth-populated", { statText, failuresText: failuresText.slice(0, 700), filters });

  // ---- (4) Run full check from the dashboard, then cancel it ----
  await page.locator('[data-testid="button-link-health-run-full"]').click();
  await page.locator('[data-testid="dialog-confirm-link-check"]').waitFor();
  await page.locator('[data-testid="button-confirm-link-check"]').click();
  await page.locator('[data-testid="link-health-job-running"]').waitFor({ timeout: 20_000 });
  await sleep(4000);
  const runningText = await bodyText(page, '[data-testid="link-health-job-running"]');
  await shot(page, "V18-linkhealth-running-desktop");
  const job2 = await latestJobId();
  await page.locator('[data-testid="button-cancel-running-scan"]').click();
  await page.locator('[data-testid="dialog-confirm-cancel-scan"]').waitFor();
  await shot(page, "V18-linkhealth-cancel-dialog-desktop", page.locator('[data-testid="dialog-confirm-cancel-scan"]'));
  await page.locator('[data-testid="button-confirm-cancel-scan"]').click();
  await page.locator('[data-testid="link-health-job-cancelled"]').waitFor({ timeout: 20_000 });
  const cancelledText = await bodyText(page, '[data-testid="link-health-job-cancelled"]');
  const statAfterCancel = await bodyText(page, ".ops-link-health__stat-grid");
  await shot(page, "V18-linkhealth-cancelled-desktop");
  await sleep(35_000); // let any in-flight request settle; results must NOT be published for the cancelled job
  step("dashboard-run-cancel", { job2, runningText, cancelledText, statAfterCancel, dbJob2: await job(job2), checksOfJob2: (await q(`SELECT count(*)::int n FROM link_health_checks WHERE job_id=$1`, [job2]))[0].n, checksOfJob1Retained: (await q(`SELECT count(*)::int n FROM link_health_checks WHERE job_id=$1`, [job1]))[0].n, toasts: await toasts(page) });

  // ---- (5) Rerun, then owner-authorized SIGKILL mid-scan → boot recovery marks it interrupted ----
  await page.locator('[data-testid="button-link-health-rerun"]').click();
  await page.locator('[data-testid="dialog-confirm-link-check"]').waitFor();
  await page.locator('[data-testid="button-confirm-link-check"]').click();
  await page.locator('[data-testid="link-health-job-running"]').waitFor({ timeout: 20_000 });
  const job3 = await latestJobId();
  await sleep(7000);
  const duringKill = await job(job3);
  await page.close();
  await stopC("SIGKILL");
  const afterKill = await job(job3);
  const up = await startC("recover");
  await sleep(3000);
  const recovered = await job(job3);
  page = await openAdmin(browser, "linkhealth");
  const failedText = await bodyText(page, '[data-testid="link-health-job-failed"]');
  await shot(page, "V18-linkhealth-interrupted-desktop");
  const recLog = fs.readFileSync("/tmp/scrC-v18-recover.log", "utf8").split("\n").filter((l) => /\[LinkHealth\]/.test(l)).slice(0, 4);
  step("restart-interrupted", { job3, duringKill, afterKill, upMs: up, recovered, failedText, recLog });

  // ---- (6) Recovery: rerun to completion; history + trend ----
  await page.locator('[data-testid="button-link-health-rerun"]').click();
  await page.locator('[data-testid="dialog-confirm-link-check"]').waitFor();
  await page.locator('[data-testid="button-confirm-link-check"]').click();
  await sleep(3000);
  const job4 = await latestJobId();
  const fin4 = await waitJob(job4);
  await page.reload({ waitUntil: "domcontentloaded" }); await sleep(5000);
  await page.locator('[data-testid="button-link-health-more"]').click(); await sleep(4000);
  const trend = page.getByText("Link Health Trends").first();
  await trend.scrollIntoViewIfNeeded().catch(() => {});
  const trendText = await bodyText(page, ".ops-link-health");
  await shot(page, "V18-linkhealth-recovered-trend-desktop");
  const hist = await api("GET", "/api/admin/link-health/history");
  step("recovery-complete", { job4, fin4, statText: await bodyText(page, ".ops-link-health__stat-grid"),
    trendExcerpt: trendText.match(/Link Health Trends.{0,200}/)?.[0] ?? null,
    history: (hist.json?.jobs ?? []).map((j) => `${j.id}:${j.status}:${j.healthyLinks}/${j.brokenLinks}/${j.suspectLinks}/${j.timeoutLinks}${j.errorMessage ? ":" + j.errorMessage : ""}`),
    checksPrunedToLatest: await q(`SELECT job_id, count(*)::int n FROM link_health_checks GROUP BY job_id`) });
  await page.close();

  // ---- (7) mobile 390 ----
  page = await openAdmin(browser, "linkhealth", VPS[390]);
  await shot(page, "V18-linkhealth-390");
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  step("mobile", { horizontalOverflowPx: ov, errors: page.__errors.slice(0, 3) });
  await page.close();
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  await teardownAll();
  await stopC();
  origin.close();
  await q(`DELETE FROM link_health_checks`); await q(`DELETE FROM link_health_jobs`);
  await q(`DELETE FROM resource_audit_log WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE '\\_\\_qa\\_test\\_plan\\_592\\_v18%')`);
  await q(`DELETE FROM resources WHERE title LIKE '\\_\\_qa\\_test\\_plan\\_592\\_v18%'`);
  const residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int qa_users,
    (SELECT count(*) FROM resources WHERE title LIKE '%592\\_v18%')::int v18_resources, (SELECT count(*) FROM link_health_jobs)::int jobs, (SELECT count(*) FROM link_health_checks)::int checks`))[0];
  step("cleanup", { residue, originHitCount: out.originHits.length });
  process.exit(0);
}
