// V14 — enrichment on the scratch DB (awesome_scratch_592), background jobs enabled.
//  Instance A (:5161, real AI creds): run 1 completes one genuine paid enrichment of the single untagged fixture,
//    started through /admin/enrichment (1440 + 390 captures), ordered /events?afterSeq polling, concurrent-start 409.
//  Instance B (:5163, spawned here; AI base URL → local server that accepts and never answers, so no paid calls):
//    run 2 cancelled through the UI (Keep running first, then confirm); run 3 interrupted by restarting B mid-run →
//    watchdog flips it to failed, events retained; run 4 admitted afterwards and cancelled by DELETE.
// Env: DATABASE_URL = scratch URL, BASE_URL = http://127.0.0.1:5161.
import { spawn } from "node:child_process";
import fs from "node:fs";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep, PREFIX, call } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: DATABASE_URL is not the scratch DB");
const A = BASE, B = "http://127.0.0.1:5163";
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1800)); writeJson(process.env.OUT_JSON ?? "/tmp/v592out/v14-enrichment.json", out); };
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const SECRET_VALUES = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "AI_INTEGRATIONS_ANTHROPIC_API_KEY", "CLERK_SECRET_KEY", "ADMIN_PASSWORD", "SESSION_SECRET"]
  .map((k) => process.env[k]).filter((v) => v && v.length >= 8);
const leaks = (text) => SECRET_VALUES.some((v) => text.includes(v)) || /auth_?token_?encrypted/i.test(text);

let bProc = null;
function startB(tag) {
  const fd = fs.openSync(`/tmp/scrB-${tag}.log`, "a");
  bProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], {
    cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
    env: { ...process.env, PORT: "5163", ANTHROPIC_BASE_URL: "http://127.0.0.1:5199", AI_INTEGRATIONS_ANTHROPIC_BASE_URL: "http://127.0.0.1:5199" },
  });
  return bProc.pid;
}
async function waitUp(base, ms = 90_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if ((await fetch(`${base}/api/health`)).ok) return Date.now() - t0; } catch {} await sleep(1000); }
  throw new Error(`${base} did not come up`);
}
async function stopB() {
  if (!bProc) return;
  try { process.kill(-bProc.pid, "SIGTERM"); } catch {}
  await sleep(3000);
  try { process.kill(-bProc.pid, "SIGKILL"); } catch {}
  bProc = null;
}
async function fetchJson(base, path, init = {}) {
  const r = await fetch(`${base}${path}`, { ...init, headers: { "Content-Type": "application/json", Origin: base, "X-Admin-Audit-Key": process.env.ADMIN_PASSWORD, ...(init.headers ?? {}) } });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, text: t, ...(j && typeof j === "object" && !Array.isArray(j) ? j : { body: j }) };
}
const events = async (base, id, afterSeq) => (await fetchJson(base, `/api/enrichment/jobs/${id}/events${afterSeq !== undefined ? `?afterSeq=${afterSeq}` : ""}`)).body ?? [];
const hangHits = () => (fs.existsSync("/tmp/hang-ai.log") ? fs.readFileSync("/tmp/hang-ai.log", "utf8").split("\n").filter((l) => /POST|GET/.test(l)).length : 0);

const openControls = async (pg) => {
  const d = pg.locator("details.queues-agent__more").first();
  await d.waitFor({ state: "attached", timeout: 45_000 });
  if (!(await d.evaluate((el) => el.open))) await d.locator("summary").click();
};
const browser = await launch();
const fixtures = [];
try {
  // Isolate: park every approved catalog resource (ids saved in qa592_parked) so the run can only see the fixtures.
  await q(`UPDATE resources SET status='archived' WHERE id IN (SELECT id FROM qa592_parked) AND status='approved'`);
  const mk = async (tag, url, tags) => (await q(`INSERT INTO resources (title, url, description, category, subcategory, status, metadata)
      VALUES ($1,$2,'',$3,$4,'approved',$5::jsonb) RETURNING id, title, url, metadata, updated_at`,
    [`${PREFIX}v14 ${tag}`, url, "Encoding & Codecs", "Encoding Tools", JSON.stringify(tags ? { tags } : {})]))[0];
  const R1 = await mk("untagged", "https://github.com/Netflix/vmaf", null);
  const R2 = await mk("tagged", "https://github.com/shaka-project/shaka-packager", ["qa-existing-tag"]);
  fixtures.push(R1.id, R2.id);
  const approved = (await q(`SELECT count(*)::int n FROM resources WHERE status='approved'`))[0].n;
  step("fixtures", { R1: { id: R1.id, url: R1.url }, R2: { id: R2.id, url: R2.url, metadata: R2.metadata }, approvedResourcesVisibleToRun: approved });

  const ADM = await mintUser("v14admin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);

  // ---------- Run 1 (A, paid): start through the UI ----------
  const { page } = await newPage(browser, VPS.desktop);
  await signIn(page, ADM, "/admin/enrichment");
  await page.goto(`${A}/admin/enrichment`, { waitUntil: "domcontentloaded" });
  await openControls(page);
  await page.locator('[data-testid="button-start-enrichment"]').waitFor({ timeout: 45_000 });
  await page.locator('[data-testid="select-filter"]').click();
  await page.getByRole("option", { name: "Unenriched Only" }).click();
  await page.locator('[data-testid="input-batch-size"]').fill("1");
  await shot(page, "V14-run1-configured-desktop");
  await page.locator('[data-testid="button-start-enrichment"]').click();
  await page.locator('[data-testid="dialog-confirm-enrichment"]').waitFor();
  const confirmText = (await page.locator('[data-testid="dialog-confirm-enrichment"]').innerText()).replace(/\s+/g, " ");
  await shot(page, "V14-run1-confirm-desktop");
  const startResp = page.waitForResponse((r) => r.url().includes("/api/enrichment/start"));
  await page.locator('[data-testid="button-confirm-enrichment-start"]').click();
  const sr = await startResp; const sj = await sr.json();
  const id1 = sj.jobId;
  step("run1-start", { confirmDialog: confirmText.slice(0, 300), status: sr.status(), body: sj });
  const conc = await fetchJson(A, "/api/enrichment/start", { method: "POST", body: JSON.stringify({ filter: "unenriched", batchSize: 1 }) });
  step("run1-concurrent-start", { status: conc.status, message: conc.message });
  await sleep(4000);
  await shot(page, "V14-run1-processing-desktop");
  const { page: m } = await newPage(browser, VPS["390"]);
  await signIn(m, ADM, "/admin/enrichment");
  await m.goto(`${A}/admin/enrichment`, { waitUntil: "domcontentloaded" });
  await openControls(m);
  await m.locator('[data-testid="progress-bar"]').waitFor({ timeout: 30_000 }).catch(() => {});
  const mOverflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await shot(m, "V14-run1-processing-390");
  await m.close();
  // Poll job + ordered events.
  let lastSeq = undefined; const seqs = []; const types = []; let polls = 0; let j1;
  const t0 = Date.now();
  while (Date.now() - t0 < 12 * 60_000) {
    const ev = await events(A, id1, lastSeq);
    for (const e of ev) { seqs.push(e.seq); types.push(e.eventType ?? e.event_type); }
    if (ev.length) lastSeq = ev[ev.length - 1].seq;
    j1 = (await fetchJson(A, `/api/enrichment/jobs/${id1}`)).job;
    polls++;
    if (polls % 5 === 1) step("run1-poll", { status: j1?.status, processed: j1?.processedResources, total: j1?.totalResources, events: seqs.length, lastSeq });
    if (["completed", "failed", "cancelled"].includes(j1?.status)) break;
    await sleep(5000);
  }
  const allEv = await events(A, id1);
  const ordered = seqs.every((s, i) => i === 0 || s > seqs[i - 1]);
  const afterTail = await events(A, id1, allEv.at(-1)?.seq);
  const jobText = JSON.stringify(await fetchJson(A, `/api/enrichment/jobs/${id1}`)) + JSON.stringify(allEv);
  const r1 = (await q(`SELECT title, description, metadata, category, subcategory, updated_at FROM resources WHERE id=$1`, [R1.id]))[0];
  const r2 = (await q(`SELECT metadata, updated_at FROM resources WHERE id=$1`, [R2.id]))[0];
  const audit = await q(`SELECT action, performed_by, left(coalesce(notes,''),160) notes FROM resource_audit_log WHERE resource_id=$1 ORDER BY id`, [R1.id]);
  const cost = allEv.reduce((a, e) => a + Number(e.costUsd ?? e.cost_usd ?? 0), 0);
  await page.reload({ waitUntil: "domcontentloaded" }); await openControls(page); await sleep(3000);
  await shot(page, "V14-run1-done-desktop");
  step("run1-result", {
    job: { status: j1?.status, total: j1?.totalResources, processed: j1?.processedResources, successful: j1?.successfulResources, failed: j1?.failedResources, skipped: j1?.skippedResources, error: j1?.errorMessage, hasAuthSecretField: "authTokenEncrypted" in (j1 ?? {}) },
    events: { count: allEv.length, polledInOrder: ordered, afterSeqTailEmpty: afterTail.length === 0, types: [...new Set(types)], first: allEv.slice(0, 3).map((e) => `${e.seq}:${e.eventType}:${(e.summary ?? "").slice(0, 80)}`), costUsd: cost },
    secretsInJobOrEvents: leaks(jobText),
    R1: { tags: r1.metadata?.tags ?? null, suggestedTags: r1.metadata?.suggestedTags, aiEnriched: r1.metadata?.aiEnriched, description: (r1.description ?? "").slice(0, 200), category: r1.category, subcategory: r1.subcategory },
    R2unchanged: JSON.stringify(r2.metadata) === JSON.stringify(R2.metadata),
    auditR1: audit,
  });
  await page.close();
  out.jobIds = [id1];
  // Second "unenriched" start: with R1 now tagged there must be nothing left to (re-)enrich.
  const rerun = await fetchJson(A, "/api/enrichment/start", { method: "POST", body: JSON.stringify({ filter: "unenriched", batchSize: 1 }) });
  if (rerun.jobId) { out.jobIds.push(rerun.jobId); await sleep(3000); }
  const rerunJob = rerun.jobId ? (await fetchJson(A, `/api/enrichment/jobs/${rerun.jobId}`)).job : null;
  step("rerun-unenriched", { status: rerun.status, message: rerun.message, jobId: rerun.jobId, total: rerunJob?.totalResources, jobStatus: rerunJob?.status });
  bpart: { if (process.env.ONLY_RUN1) break bpart;
  // ---------- B: hanging provider ----------
  const R3 = await mk("cancel-restart", "https://github.com/HandBrake/HandBrake", null); fixtures.push(R3.id);
  startB("1"); step("B-started", { pid: bProc.pid, upMs: await waitUp(B) });
  // Run 2: start + cancel through the UI at 390.
  const { page: b } = await newPage(browser, VPS["390"]);
  await b.goto(`${B}/admin/enrichment`, { waitUntil: "domcontentloaded" });
  await signIn(b, ADM, null);
  await b.goto(`${B}/admin/enrichment`, { waitUntil: "domcontentloaded" });
  await openControls(b);
  await b.locator('[data-testid="button-start-enrichment"]').waitFor({ timeout: 45_000 });
  await b.locator('[data-testid="input-batch-size"]').fill("1");
  await b.locator('[data-testid="button-start-enrichment"]').click();
  const sr2p = b.waitForResponse((r) => r.url().includes("/api/enrichment/start"));
  await b.locator('[data-testid="button-confirm-enrichment-start"]').click();
  const id2 = (await (await sr2p).json()).jobId;
  const h0 = hangHits();
  for (let i = 0; i < 40 && !((await fetchJson(B, `/api/enrichment/jobs/${id2}`)).job?.status === "processing" && hangHits() > h0); i++) await sleep(1500);
  const before2 = (await fetchJson(B, `/api/enrichment/jobs/${id2}`)).job;
  const cancelBtn = b.locator(`[data-testid="button-cancel-job-${id2}"]`);
  await cancelBtn.waitFor({ timeout: 20_000 });
  await cancelBtn.click();
  await b.locator('[data-testid="dialog-cancel-job"]').waitFor();
  await shot(b, "V14-run2-cancel-dialog-390");
  await b.locator('[data-testid="button-cancel-job-dismiss"]').click(); await sleep(1500);
  const afterKeep = (await fetchJson(B, `/api/enrichment/jobs/${id2}`)).job?.status;
  await cancelBtn.click();
  const dr = b.waitForResponse((r) => r.url().includes(`/api/enrichment/jobs/${id2}`) && r.request().method() === "DELETE");
  await b.locator('[data-testid="button-cancel-job-confirm"]').click();
  const delStatus = (await dr).status(); await sleep(2000);
  const cancelToast = await toasts(b);
  await shot(b, "V14-run2-cancelled-390");
  const r3AtCancel = (await q(`SELECT updated_at, metadata FROM resources WHERE id=$1`, [R3.id]))[0];
  await sleep(20_000);
  const r3Later = (await q(`SELECT updated_at, metadata FROM resources WHERE id=$1`, [R3.id]))[0];
  const j2 = (await fetchJson(B, `/api/enrichment/jobs/${id2}`)).job;
  const q2 = await q(`SELECT status, count(*)::int n FROM enrichment_queue WHERE job_id=$1 GROUP BY 1`, [id2]);
  step("run2-cancel", { jobId: id2, statusBeforeCancel: before2?.status, providerRequestsSeen: hangHits() - h0, afterKeepRunning: afterKeep, deleteStatus: delStatus, toast: cancelToast,
    finalStatus: j2?.status, completedAt: j2?.completedAt, queue: q2, noWritesToR3After20s: String(r3AtCancel.updated_at) === String(r3Later.updated_at) && !r3Later.metadata?.tags,
    eventsRetained: (await events(B, id2)).length });
  await b.close();

  // Run 3: start via API on B, restart B mid-run.
  const s3 = await fetchJson(B, "/api/enrichment/start", { method: "POST", body: JSON.stringify({ filter: "unenriched", batchSize: 1 }) });
  const id3 = s3.jobId; const h1 = hangHits();
  for (let i = 0; i < 40 && !((await fetchJson(B, `/api/enrichment/jobs/${id3}`)).job?.status === "processing" && hangHits() > h1); i++) await sleep(1500);
  const ev3Before = await events(B, id3);
  const st3 = (await fetchJson(B, `/api/enrichment/jobs/${id3}`)).job;
  step("run3-mid-run", { start: s3.status, jobId: id3, status: st3?.status, startedAt: st3?.startedAt, events: ev3Before.length, providerRequestsSeen: hangHits() - h1 });
  await stopB(); const killedAt = Date.now();
  startB("2"); step("B-restarted", { pid: bProc.pid, upMs: await waitUp(B) });
  const afterBoot = (await fetchJson(B, `/api/enrichment/jobs/${id3}`)).job;
  const blocked = await fetchJson(B, "/api/enrichment/start", { method: "POST", body: JSON.stringify({ filter: "unenriched", batchSize: 1 }) });
  step("run3-after-restart", { status: afterBoot?.status, newStartWhileOrphanPending: { status: blocked.status, message: blocked.message } });
  let j3; const tw = Date.now();
  while (Date.now() - tw < 12 * 60_000) {
    j3 = (await fetchJson(B, `/api/enrichment/jobs/${id3}`)).job;
    if (j3?.status !== "processing" && j3?.status !== "pending") break;
    await sleep(15_000);
  }
  const ev3After = await events(B, id3);
  step("run3-recovered", { status: j3?.status, error: j3?.errorMessage, minutesAfterRestart: ((Date.now() - killedAt) / 60000).toFixed(1),
    eventsBefore: ev3Before.length, eventsAfter: ev3After.length, priorEventsRetained: ev3Before.every((e) => ev3After.some((x) => x.seq === e.seq)) });
  // Run 4: admitted again, then cancelled by DELETE.
  const s4 = await fetchJson(B, "/api/enrichment/start", { method: "POST", body: JSON.stringify({ filter: "unenriched", batchSize: 1 }) });
  await sleep(4000);
  const d4 = await fetchJson(B, `/api/enrichment/jobs/${s4.jobId}`, { method: "DELETE" });
  await sleep(2000);
  const j4 = (await fetchJson(B, `/api/enrichment/jobs/${s4.jobId}`)).job;
  step("run4-new-run-after-recovery", { start: s4.status, jobId: s4.jobId, deleteStatus: d4.status, finalStatus: j4?.status });
  out.jobIds = [id1, id2, id3, s4.jobId];
  } // bpart
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  await stopB();
  await teardownAll();
  const ids = `{${fixtures.join(",")}}`;
  if (out.jobIds) {
    const jids = `{${out.jobIds.filter(Boolean).join(",")}}`;
    await q(`DELETE FROM agent_events WHERE job_type='enrichment' AND job_id = ANY($1::int[])`, [jids]);
    await q(`DELETE FROM enrichment_queue WHERE job_id = ANY($1::int[])`, [jids]);
    await q(`DELETE FROM enrichment_jobs WHERE id = ANY($1::int[])`, [jids]);
  }
  await q(`DELETE FROM resource_audit_log WHERE resource_id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM enrichment_queue WHERE resource_id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM resources WHERE id = ANY($1::int[])`, [ids]);
  await q(`UPDATE resources SET status='approved' WHERE id IN (SELECT id FROM qa592_parked) AND status='archived'`);
  out.residue = (await q(`SELECT (SELECT count(*) FROM resources WHERE id = ANY($1::int[]))::int fixtures,
     (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int users,
     (SELECT count(*) FROM resources WHERE status='approved')::int approved_restored,
     (SELECT count(*) FROM enrichment_jobs WHERE status IN ('pending','processing'))::int active_jobs`, [ids]))[0];
  step("residue", out.residue);
  process.exit(0);
}
