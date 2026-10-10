// V15 — researcher on the scratch DB (awesome_scratch_592), background jobs enabled.
//  Instance B (:5163, AI base URL → local server that accepts and never answers): free brief generation through the UI
//    (proves no model call: the brief returns while the provider would hang, and the provider log sees no request),
//    cancel-by-DELETE of a live run, and a mid-run restart recovered by the orphan watchdog.
//  Instance A (:5161, real AI creds): ONE tightly bounded paid run launched through the UI (budget/turns/target),
//    ordered /events?afterSeq polling, usage + discoveries + terminal state.
//  Seeded QA job + discoveries (incl. normalized duplicates): individual approve/reject in the UI, scoped approve-all
//    by API, other jobs untouched, non-admin 403.
// Env: DATABASE_URL = scratch URL, BASE_URL = http://127.0.0.1:5161.
import { spawn } from "node:child_process";
import fs from "node:fs";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep, PREFIX, token } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: DATABASE_URL is not the scratch DB");
const A = BASE, B = "http://127.0.0.1:5163";
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1800)); writeJson("/tmp/v592out/v15-research.json", out); };
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const SECRET_VALUES = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "AI_INTEGRATIONS_ANTHROPIC_API_KEY", "CLERK_SECRET_KEY", "ADMIN_PASSWORD", "SESSION_SECRET"]
  .map((k) => process.env[k]).filter((v) => v && v.length >= 8);
const leaks = (text) => SECRET_VALUES.some((v) => text.includes(v)) || /auth_?token_?encrypted/i.test(text);

let bProc = null;
function startB(tag) {
  const fd = fs.openSync(`/tmp/scrB-v15-${tag}.log`, "a");
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
const events = async (base, id, afterSeq) => (await fetchJson(base, `/api/researcher/jobs/${id}/events${afterSeq !== undefined ? `?afterSeq=${afterSeq}` : ""}`)).body ?? [];
const job = async (base, id) => fetchJson(base, `/api/researcher/jobs/${id}`);
const hangHits = () => (fs.existsSync("/tmp/hang-ai.log") ? fs.readFileSync("/tmp/hang-ai.log", "utf8").split("\n").filter((l) => /POST|GET/.test(l)).length : 0);
const openAdvanced = async (pg) => {
  const d = pg.locator("details.queues-agent__more").first();
  await d.waitFor({ state: "attached", timeout: 45_000 });
  if (!(await d.evaluate((el) => el.open))) await d.locator("summary").click();
};

const browser = await launch();
const jobIds = []; const createdResources = [];
try {
  const ADM = await mintUser("v15admin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);
  const USR = await mintUser("v15user"); await ensureLocal(USR);
  const pendingOtherBefore = (await q(`SELECT count(*)::int n FROM research_discoveries WHERE status='pending_review'`))[0].n;

  // ---------- Free brief through the UI on B (hanging provider) ----------
  startB("1"); step("B-started", { pid: bProc.pid, upMs: await waitUp(B) });
  const { page: bp } = await newPage(browser, VPS.desktop);
  await bp.goto(`${B}/admin/researcher`, { waitUntil: "domcontentloaded" });
  await signIn(bp, ADM, null);
  await bp.goto(`${B}/admin/researcher`, { waitUntil: "domcontentloaded" });
  await openAdvanced(bp);
  const briefBtn = bp.locator('[data-testid="button-generate-brief"]');
  await briefBtn.waitFor({ timeout: 45_000 });
  const h0 = hangHits(); const tb = Date.now();
  const briefResp = bp.waitForResponse((r) => r.url().includes("/api/researcher/brief"), { timeout: 30_000 });
  await briefBtn.click();
  const br = await briefResp; const bj = await br.json();
  await sleep(800);
  const textarea = await bp.locator("#prompt").inputValue();
  await bp.locator("#prompt").press("End"); await bp.locator("#prompt").type(" __qa_edit");
  const edited = (await bp.locator("#prompt").inputValue()).endsWith(" __qa_edit");
  await shot(bp, "V15-brief-generated-desktop");
  step("brief", { status: br.status(), ms: Date.now() - tb, angle: bj.angle, briefChars: bj.brief?.length, briefHead: bj.brief?.slice(0, 260), textareaFilled: textarea === bj.brief, editable: edited, providerRequests: hangHits() - h0 });
  await bp.close();

  // ---------- Paid bounded run on A through the UI ----------
  const { page } = await newPage(browser, VPS.desktop);
  await signIn(page, ADM, "/admin/researcher");
  await page.goto(`${A}/admin/researcher`, { waitUntil: "domcontentloaded" });
  await openAdvanced(page);
  await page.locator("#prompt").waitFor({ timeout: 45_000 });
  await page.locator("#prompt").fill("Find ONE open-source video quality metrics tool (for example a VMAF or SSIM implementation) that is not already in the database. __qa_test_plan_592_v15 bounded acceptance run.");
  await page.locator("#budget").fill("0.30");
  await page.locator("#turns").fill("12");
  await page.locator("#target-discoveries").fill("1");
  await shot(page, "V15-launch-configured-desktop");
  await page.getByRole("button", { name: "Launch Researcher" }).click();
  await page.locator('[data-testid="button-confirm-launch"]').waitFor();
  const dialogText = (await page.getByRole("alertdialog").innerText()).replace(/\s+/g, " ");
  await shot(page, "V15-launch-confirm-desktop");
  const sp = page.waitForResponse((r) => r.url().includes("/api/researcher/start"));
  await page.locator('[data-testid="button-confirm-launch"]').click();
  const sr = await sp; const sj = await sr.json(); const idP = sj.jobId; jobIds.push(idP);
  step("paid-start", { dialog: dialogText.slice(0, 400), status: sr.status(), body: sj });
  let lastSeq; const seqs = []; const types = new Set(); let jp; let polls = 0; const tp = Date.now();
  while (Date.now() - tp < 9 * 60_000) {
    const ev = await events(A, idP, lastSeq);
    for (const e of ev) { seqs.push(e.seq); types.add(e.eventType); }
    if (ev.length) lastSeq = ev.at(-1).seq;
    jp = await job(A, idP); polls++;
    if (polls % 6 === 1) step("paid-poll", { status: jp.status, turns: jp.turnsUsed, discoveries: jp.totalDiscoveries, events: seqs.length, cost: jp.estimatedCostUsd });
    if (["completed", "failed", "cancelled"].includes(jp.status)) break;
    await sleep(5000);
  }
  if (!["completed", "failed", "cancelled"].includes(jp.status)) { step("paid-timeout-cancel", (await fetchJson(A, `/api/researcher/jobs/${idP}`, { method: "DELETE" }))); await sleep(4000); jp = await job(A, idP); }
  const allEv = await events(A, idP);
  const tail = await events(A, idP, allEv.at(-1)?.seq);
  const disc = (await fetchJson(A, `/api/researcher/discoveries?jobId=${idP}`)).body ?? [];
  await page.reload({ waitUntil: "domcontentloaded" }); await openAdvanced(page); await sleep(2500);
  await shot(page, "V15-paid-done-desktop");
  step("paid-result", {
    job: { status: jp.status, turnsUsed: jp.turnsUsed, maxTurns: jp.maxTurns, maxBudgetUsd: jp.maxBudgetUsd, targetDiscoveries: jp.targetDiscoveries, totalDiscoveries: jp.totalDiscoveries, duplicatesSkipped: jp.duplicatesSkipped, inTok: jp.totalInputTokens, outTok: jp.totalOutputTokens, cost: jp.estimatedCostUsd, error: jp.errorMessage, model: jp.model },
    events: { count: allEv.length, polledInOrder: seqs.every((s, i) => i === 0 || s > seqs[i - 1]), afterSeqTailEmpty: tail.length === 0, types: [...types], last: allEv.slice(-3).map((e) => `${e.seq}:${e.eventType}:${(e.summary ?? "").slice(0, 120)}`) },
    discoveries: disc.map((d) => ({ id: d.id, title: d.title, url: d.url, status: d.status, category: d.suggestedCategory, confidence: d.confidence })),
    secretsInJobOrEvents: leaks(JSON.stringify(jp) + JSON.stringify(allEv)),
  });

  // ---------- Seeded QA moderation ----------
  const [ex] = await q(`SELECT id, url FROM resources WHERE status='approved' AND url LIKE 'https://github.com/%' AND url NOT LIKE '%/' ORDER BY id LIMIT 1`);
  const dupVariant = ex.url.replace("https://github.com/", "http://www.github.com/") + "/?utm_source=qa592";
  const [qj] = await q(`INSERT INTO research_jobs (status, prompt, started_by, completed_at, total_discoveries) VALUES ('completed', $1, $2, now(), 5) RETURNING id`, [`${PREFIX}v15 seeded QA job`, ADM.bridgeId]);
  const [oj] = await q(`INSERT INTO research_jobs (status, prompt, started_by, completed_at, total_discoveries) VALUES ('completed', $1, $2, now(), 1) RETURNING id`, [`${PREFIX}v15 other QA job`, ADM.bridgeId]);
  jobIds.push(qj.id, oj.id);
  const D = async (job, tag, url) => (await q(`INSERT INTO research_discoveries (job_id, title, url, description, suggested_category, suggested_subcategory, confidence, reasoning, status)
      VALUES ($1,$2,$3,$4,'Encoding & Codecs','Encoding Tools',80,'QA seeded','pending_review') RETURNING id, url`, [job, `${PREFIX}v15 ${tag}`, url, `${PREFIX}v15 ${tag} description`]))[0];
  const D1 = await D(qj.id, "new", "https://example.org/__qa_test_plan_592_v15/one");
  const D2 = await D(qj.id, "catalog-dup", dupVariant);
  const D3 = await D(qj.id, "in-batch-dup", "https://WWW.example.org/__qa_test_plan_592_v15/one/?utm_source=qa592");
  const D4 = await D(qj.id, "individual-approve", "https://example.org/__qa_test_plan_592_v15/four");
  const D5 = await D(qj.id, "individual-reject", "https://example.org/__qa_test_plan_592_v15/five");
  const D6 = await D(oj.id, "other-job", "https://example.org/__qa_test_plan_592_v15/six");
  step("seeded", { qaJob: qj.id, otherJob: oj.id, existing: ex, D1, D2, D3, D4, D5, D6 });

  // Individual approve / reject through the review UI at 390.
  const { page: m } = await newPage(browser, VPS["390"]);
  await signIn(m, ADM, "/admin/researcher");
  await m.goto(`${A}/admin/researcher`, { waitUntil: "domcontentloaded" });
  await openAdvanced(m);
  await m.getByRole("tab", { name: /Review Discoveries/ }).click();
  const row4 = m.locator(`[data-testid="row-research-discovery-${D4.id}"]`);
  await row4.waitFor({ timeout: 30_000 });
  await row4.scrollIntoViewIfNeeded();
  await shot(m, "V15-review-390");
  const ap = m.waitForResponse((r) => r.url().includes(`/api/researcher/discoveries/${D4.id}/approve`));
  await row4.getByRole("button", { name: "Approve" }).click();
  const apr = await ap; const apj = await apr.json(); await sleep(1500);
  const apToast = await toasts(m);
  const row5 = m.locator(`[data-testid="row-research-discovery-${D5.id}"]`);
  await row5.scrollIntoViewIfNeeded();
  await row5.getByRole("button", { name: "Reject" }).click();
  const rd = m.getByRole("alertdialog").or(m.getByRole("dialog")).last();
  await rd.waitFor();
  const reasonBox = rd.locator("textarea, input").first();
  if (await reasonBox.count()) await reasonBox.fill(`${PREFIX}v15 not relevant`);
  await shot(m, "V15-reject-dialog-390");
  const rp = m.waitForResponse((r) => r.url().includes(`/api/researcher/discoveries/${D5.id}/reject`));
  await rd.getByRole("button", { name: /Reject/ }).last().click();
  const rr = await rp; await sleep(1500);
  await shot(m, "V15-after-moderation-390");
  const mOverflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await m.close();
  const d4 = (await q(`SELECT status, created_resource_id FROM research_discoveries WHERE id=$1`, [D4.id]))[0];
  if (d4.created_resource_id) createdResources.push(d4.created_resource_id);
  const r4 = d4.created_resource_id ? (await q(`SELECT id, status, title, approved_by, approved_at FROM resources WHERE id=$1`, [d4.created_resource_id]))[0] : null;
  const pub4 = r4 ? await fetch(`${A}/api/resources/${r4.id}`).then(async (r) => ({ status: r.status, title: (await r.json().catch(() => ({}))).title })) : null;
  const d5 = (await q(`SELECT status, rejection_reason FROM research_discoveries WHERE id=$1`, [D5.id]))[0];
  step("individual", { approveStatus: apr.status(), approveBody: { status: apj.discovery?.status, createdResourceId: apj.discovery?.createdResourceId }, toast: apToast, resource: r4, publicGet: pub4, rejectStatus: rr.status(), d5, mobileOverflowPx: mOverflow });

  // Non-admin call → 403 (real Clerk session, no audit key).
  const nonAdmin = await fetch(`${A}/api/researcher/discoveries/approve-all`, { method: "POST", headers: { "Content-Type": "application/json", Origin: A, Authorization: `Bearer ${await token(USR)}` }, body: JSON.stringify({ jobId: qj.id }) });
  const stillPending = (await q(`SELECT count(*)::int n FROM research_discoveries WHERE job_id=$1 AND status='pending_review'`, [qj.id]))[0].n;
  step("non-admin", { status: nonAdmin.status, body: (await nonAdmin.text()).slice(0, 200), qaPendingAfter: stillPending });

  // Scoped approve-all by API.
  const otherPendingBefore = (await q(`SELECT count(*)::int n FROM research_discoveries WHERE status='pending_review' AND job_id <> $1`, [qj.id]))[0].n;
  const aa = await fetchJson(A, "/api/researcher/discoveries/approve-all", { method: "POST", body: JSON.stringify({ jobId: qj.id }) });
  const rows = await q(`SELECT id, status, created_resource_id, left(coalesce(rejection_reason,''),120) reason FROM research_discoveries WHERE job_id=$1 ORDER BY id`, [qj.id]);
  for (const r of rows) if (r.created_resource_id && !createdResources.includes(r.created_resource_id)) createdResources.push(r.created_resource_id);
  const d1r = rows.find((r) => r.id === D1.id);
  const r1 = d1r?.created_resource_id ? (await q(`SELECT id, status, url, approved_by FROM resources WHERE id=$1`, [d1r.created_resource_id]))[0] : null;
  const pub1 = r1 ? await fetch(`${A}/api/resources/${r1.id}`).then((r) => r.status) : null;
  const otherPendingAfter = (await q(`SELECT count(*)::int n FROM research_discoveries WHERE status='pending_review' AND job_id <> $1`, [qj.id]))[0].n;
  const d6 = (await q(`SELECT status FROM research_discoveries WHERE id=$1`, [D6.id]))[0];
  const qjCounts = (await q(`SELECT approved_discoveries, rejected_discoveries FROM research_jobs WHERE id=$1`, [qj.id]))[0];
  const audit = r1 ? await q(`SELECT action, performed_by, left(coalesce(notes,''),120) notes FROM resource_audit_log WHERE resource_id=$1 ORDER BY id`, [r1.id]) : [];
  const dupResourceRows = (await q(`SELECT count(*)::int n FROM resources WHERE url ILIKE '%__qa_test_plan_592_v15/one%'`))[0].n;
  step("approve-all", { status: aa.status, result: { approved: aa.approved, skippedDuplicates: aa.skippedDuplicates, failed: aa.failed }, rows, createdD1: r1, publicGetD1: pub1, auditD1: audit, qaJobCounts: qjCounts,
    otherPending: { before: otherPendingBefore, after: otherPendingAfter, d6: d6.status }, resourceRowsForOneUrlFamily: dupResourceRows });

  // ---------- Cancel by DELETE on B ----------
  const s2 = await fetchJson(B, "/api/researcher/start", { method: "POST", body: JSON.stringify({ prompt: `${PREFIX}v15 cancel run — find a video tool`, maxTurns: 5, maxBudgetUsd: 0.05 }) });
  const id2 = s2.jobId; jobIds.push(id2); const hc = hangHits();
  for (let i = 0; i < 30 && !((await job(B, id2)).status === "processing" && hangHits() > hc); i++) await sleep(1500);
  const before2 = await job(B, id2); const ev2Before = await events(B, id2);
  const del2 = await fetchJson(B, `/api/researcher/jobs/${id2}`, { method: "DELETE" });
  await sleep(3000);
  const after2 = await job(B, id2); const ev2After = await events(B, id2);
  const del2again = await fetchJson(B, `/api/researcher/jobs/${id2}`, { method: "DELETE" });
  step("cancel", { start: s2.status, jobId: id2, statusBefore: before2.status, isActiveBefore: before2.isActive, providerRequests: hangHits() - hc, deleteStatus: del2.status, finalStatus: after2.status, isActiveAfter: after2.isActive, completedAt: after2.completedAt,
    eventsBefore: ev2Before.length, eventsAfter: ev2After.length, lastEvent: ev2After.at(-1)?.summary?.slice(0, 120), secondDelete: { status: del2again.status, message: del2again.message } });

  // ---------- Mid-run restart on B ----------
  const s3 = await fetchJson(B, "/api/researcher/start", { method: "POST", body: JSON.stringify({ prompt: `${PREFIX}v15 restart run — find a video tool`, maxTurns: 5, maxBudgetUsd: 0.05 }) });
  const id3 = s3.jobId; jobIds.push(id3); const hr = hangHits();
  for (let i = 0; i < 30 && !((await job(B, id3)).status === "processing" && hangHits() > hr); i++) await sleep(1500);
  const ev3Before = await events(B, id3); const st3 = await job(B, id3);
  step("restart-mid-run", { start: s3.status, jobId: id3, status: st3.status, isActive: st3.isActive, events: ev3Before.length });
  await stopB(); const killedAt = Date.now();
  startB("2"); step("B-restarted", { pid: bProc.pid, upMs: await waitUp(B) });
  const ab = await job(B, id3);
  step("restart-after-boot", { status: ab.status, isActive: ab.isActive });
  let j3; const tw = Date.now();
  while (Date.now() - tw < 12 * 60_000) { j3 = await job(B, id3); if (!["processing", "pending"].includes(j3.status)) break; await sleep(15_000); }
  const ev3After = await events(B, id3);
  const s4 = await fetchJson(B, "/api/researcher/start", { method: "POST", body: JSON.stringify({ prompt: `${PREFIX}v15 post-recovery run — find a video tool`, maxTurns: 5, maxBudgetUsd: 0.05 }) });
  if (s4.jobId) jobIds.push(s4.jobId);
  await sleep(3000);
  const d4b = s4.jobId ? await fetchJson(B, `/api/researcher/jobs/${s4.jobId}`, { method: "DELETE" }) : null;
  const { page: hp } = await newPage(browser, VPS.desktop);
  await hp.goto(`${B}/admin/researcher`, { waitUntil: "domcontentloaded" });
  await signIn(hp, ADM, null);
  await hp.goto(`${B}/admin/researcher`, { waitUntil: "domcontentloaded" });
  await openAdvanced(hp);
  await hp.getByRole("tab", { name: /Job History/ }).click(); await sleep(2500);
  await shot(hp, "V15-history-after-restart-desktop");
  await hp.close();
  step("restart-recovered", { status: j3.status, error: j3.errorMessage, minutesAfterRestart: ((Date.now() - killedAt) / 60000).toFixed(1), priorEventsRetained: ev3Before.every((e) => ev3After.some((x) => x.seq === e.seq)), eventsAfter: ev3After.length,
    newRunAfterRecovery: { start: s4.status, jobId: s4.jobId, deleteStatus: d4b?.status } });
  out.pendingOtherBefore = pendingOtherBefore;
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  await stopB();
  // Cleanup: created resources (+ their audit rows), discoveries, jobs, events, then users.
  const disc = jobIds.length ? await q(`SELECT created_resource_id FROM research_discoveries WHERE job_id = ANY($1::int[]) AND created_resource_id IS NOT NULL`, [`{${jobIds.join(",")}}`]) : [];
  for (const d of disc) if (!createdResources.includes(d.created_resource_id)) createdResources.push(d.created_resource_id);
  const rids = `{${createdResources.join(",")}}`; const jids = `{${jobIds.join(",")}}`;
  await q(`UPDATE research_discoveries SET created_resource_id=NULL WHERE created_resource_id = ANY($1::int[])`, [rids]);
  await q(`DELETE FROM resource_audit_log WHERE resource_id = ANY($1::int[])`, [rids]);
  await q(`DELETE FROM resources WHERE id = ANY($1::int[])`, [rids]);
  await q(`DELETE FROM research_discoveries WHERE job_id = ANY($1::int[])`, [jids]);
  await q(`DELETE FROM agent_events WHERE job_type='research' AND job_id = ANY($1::int[])`, [jids]);
  await q(`DELETE FROM research_jobs WHERE id = ANY($1::int[])`, [jids]);
  await teardownAll();
  out.jobIds = jobIds; out.createdResources = createdResources;
  out.residue = (await q(`SELECT (SELECT count(*) FROM resources WHERE id = ANY($1::int[]) OR url ILIKE '%__qa_test_plan_592%')::int resources,
     (SELECT count(*) FROM research_jobs WHERE id = ANY($2::int[]) OR prompt LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int jobs,
     (SELECT count(*) FROM research_discoveries WHERE job_id = ANY($2::int[]) OR title LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int discoveries,
     (SELECT count(*) FROM agent_events WHERE job_type='research' AND job_id = ANY($2::int[]))::int events,
     (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int users,
     (SELECT count(*) FROM research_jobs WHERE status IN ('pending','processing'))::int active_jobs`, [rids, jids]))[0];
  step("residue", out.residue);
  process.exit(0);
}
