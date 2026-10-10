// V17 part B — (1) re-proof of the repeat-import fix: importing the README the app itself just exported must be a no-op
// (updated 0); (2) invalid credentials on every source; (3) mid-job restart → orphan watchdog terminal failure; recovery.
// Same disposable PRIVATE repo + seed scratch DB as part A. The repo is deleted at the end.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep, token } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1800)); writeJson("/tmp/v592out/v17b-github.json", out); };

const GH = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = "krzemienski", REPO = "__qa_test_plan_592_gh", FULL = `${OWNER}/${REPO}`;
const gh = async (method, path, body) => {
  const r = await fetch(`https://api.github.com${path}`, { method, headers: { Authorization: `Bearer ${GH}`, Accept: "application/vnd.github+json", "User-Agent": "qa592" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j };
};
const rawUrl = `https://raw.githubusercontent.com/${FULL}/refs/heads/main/README.md`;
const waitRaw = async (needle) => {
  const t0 = Date.now();
  while (Date.now() - t0 < 420_000) {
    const r = await fetch(rawUrl, { headers: { Authorization: `token ${GH}` } });
    if (r.ok && (await r.text()).includes(needle)) return Date.now() - t0;
    await sleep(10_000);
  }
  throw new Error("raw never served " + needle);
};

let cProc = null;
const startC = async (label, extraEnv = {}) => {
  const fd = fs.openSync(`/tmp/scrC-v17b-${label}.log`, "a");
  cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
    env: { ...process.env, PORT: "5165", SEED_SOURCE_URL: "http://127.0.0.1:5198/unused.json", ...extraEnv } });
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) return Date.now() - t0; } catch {} await sleep(1000); }
  throw new Error("C did not come up: " + label);
};
const stopC = async (signal = "SIGTERM") => { if (!cProc) return; try { process.kill(-cProc.pid, signal); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {} cProc = null; await sleep(1500); };

let ADM;
const api = async (method, path, body) => {
  const r = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json", Origin: BASE, Authorization: `Bearer ${await token(ADM)}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, text: t.slice(0, 500) };
};
const qrow = async (id) => (await q(`SELECT id, action, status, branch, error_message, metadata, created_at, processed_at FROM github_sync_queue WHERE id=$1`, [id]))[0];
const waitQueue = async (id, ms = 240_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const r = await qrow(id); if (r && !["pending", "processing"].includes(r.status)) return { ...r, ms: Date.now() - t0 }; await sleep(1500); }
  return { ...(await qrow(id)), timeout: true };
};
const fp = () => q(`SELECT id, updated_at FROM resources ORDER BY id`);

const browser = await launch();
const guard = async (pg) => pg.route(/\/api\/github\/(import|export)$/, (route) => {
  const body = route.request().postData() ?? "";
  if (!body.includes(REPO)) { console.error("ABORTED unsafe github request", body); return route.abort(); }
  return route.continue();
});
const openPanel = async (label) => {
  const { page } = await newPage(browser, VPS.desktop);
  await guard(page);
  await signIn(page, ADM, "/admin/github");
  await page.goto(`${BASE}/admin/github`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-github-more"]').waitFor({ timeout: 45_000 });
  if ((await page.locator('[data-testid="input-repo-url"]').count()) === 0) await page.locator('[data-testid="button-github-more"]').click();
  return page;
};
const ui = async (pg, action) => {
  await pg.locator('[data-testid="input-repo-url"]').fill(FULL);
  await pg.locator(`[data-testid="button-${action}-github"]`).click();
  const dlg = pg.getByRole("alertdialog"); await dlg.waitFor();
  const dlgText = (await dlg.innerText()).replace(/\s+/g, " ");
  if (!dlgText.includes(REPO)) throw new Error("dialog does not name the disposable repo");
  const rp = pg.waitForResponse((r) => r.url().endsWith(`/api/github/${action}`) && r.request().method() === "POST", { timeout: 60_000 });
  await pg.locator('[data-testid="button-confirm-sync-action"]').click();
  const r = await rp; const body = await r.json().catch(() => null);
  const final = await waitQueue(body?.queueId);
  await sleep(4000);
  const counter = await pg.locator(`[data-testid="sync-queue-counts-${body?.queueId}"]`).innerText().catch(() => null);
  const errs = await pg.locator(`[data-testid="sync-queue-errors-${body?.queueId}"]`).innerText().catch(() => null);
  const jobsText = (await pg.locator("body").innerText()).replace(/\s+/g, " ").match(/Jobs?.{0,600}/)?.[0] ?? null;
  return { status: r.status(), body, final, uiCounts: counter, uiErrors: errs, toasts: await toasts(pg), jobsText };
};

try {
  // (1) Round trip: the remote README is now the app's own export. Re-importing it must change nothing.
  const head = await gh("GET", `/repos/${FULL}/commits/main`);
  const rawWait = await waitRaw("View on Website");
  step("C-normal-up", { upMs: await startC("normal"), remoteHead: head.json?.sha, remoteMessage: head.json?.commit?.message, rawWaitMs: rawWait });
  ADM = await mintUser("v17badmin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);
  const fpBefore = await fp();
  const auditBefore = (await q(`SELECT count(*)::int n FROM resource_audit_log WHERE action='updated'`))[0].n;
  let page = await openPanel("normal");
  const rt = await ui(page, "import"); await shot(page, "V17-roundtrip-pull-noop-desktop");
  const fpAfter = await fp();
  const changed = fpAfter.filter((r) => String(r.updated_at) !== String(fpBefore.find((b) => b.id === r.id)?.updated_at)).map((r) => r.id);
  const auditAfter = (await q(`SELECT count(*)::int n FROM resource_audit_log WHERE action='updated'`))[0].n;
  step("roundtrip-pull-after-fix", { ...rt, resourcesBefore: fpBefore.length, resourcesAfter: fpAfter.length, updatedAtChangedIds: changed, updatedAuditRowsAdded: auditAfter - auditBefore });
  await page.close();
  await stopC();

  // (2) Every credential source broken: connector host unresolvable + all three PATs rejected by GitHub.
  const BAD = "ghp_qa592invalid0000000000000000000000";
  step("C-badcreds-up", { upMs: await startC("badcreds", { REPLIT_CONNECTORS_HOSTNAME: "qa592-connector.invalid", GITHUB_PERSONAL_ACCESS_TOKEN: BAD, GITHUB_PUSH_TOKEN: BAD, GITHUB_TOKEN: BAD }) });
  const cfg = await api("POST", "/api/github/configure", { repositoryUrl: FULL });
  page = await openPanel("badcreds");
  const headB = (await gh("GET", `/repos/${FULL}/commits/main`)).json?.sha;
  const ex = await ui(page, "export"); await shot(page, "V17-badcreds-sync-desktop");
  const im = await ui(page, "import"); await shot(page, "V17-badcreds-pull-desktop");
  const headA = (await gh("GET", `/repos/${FULL}/commits/main`)).json?.sha;
  step("bad-credentials", { configure: cfg, export: ex, import: im, remoteUnchanged: headB === headA,
    log: fs.readFileSync("/tmp/scrC-v17b-badcreds.log", "utf8").split("\n").filter((l) => /connector unavailable|rejected by GitHub|No working GitHub/.test(l)).slice(0, 6) });
  await page.close();
  await stopC();

  // (3) Mid-job restart: the connector points at a real local server that accepts and never answers, so the export
  //     sits in "processing". Kill the instance (no graceful shutdown), boot normally, wait for the watchdog.
  step("C-hang-up", { upMs: await startC("hang", { REPLIT_CONNECTORS_HOSTNAME: "http://127.0.0.1:5199" }) });
  const st = await api("POST", "/api/github/export", { repositoryUrl: FULL });
  await sleep(20_000);
  const during = await qrow(st.json?.queueId);
  await stopC("SIGKILL");
  const afterKill = await qrow(st.json?.queueId);
  step("killed-mid-job", { start: st, during, afterKill });
  const up = await startC("recover");
  const t0 = Date.now(); let fin = null;
  while (Date.now() - t0 < 720_000) { fin = await qrow(st.json?.queueId); if (fin.status !== "processing") break; await sleep(10_000); }
  page = await openPanel("recover");
  await sleep(3000); await shot(page, "V17-orphaned-export-desktop");
  const orphanUi = (await page.locator("body").innerText()).replace(/\s+/g, " ").match(/.{0,200}Orphaned by server restart.{0,80}/)?.[0] ?? null;
  step("orphan-watchdog", { upMs: up, waitedMs: Date.now() - t0, final: fin, uiExcerpt: orphanUi });
  // Recovery: a fresh Pull on the restarted instance completes normally.
  const rec = await ui(page, "import");
  step("recovery-pull", rec);
  await page.close();
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  await teardownAll();
  await stopC();
  // Delete the disposable repo.
  const del = await gh("DELETE", `/repos/${FULL}`);
  await sleep(2000);
  const gone = await gh("GET", `/repos/${FULL}`);
  out.repoDeleted = { deleteStatus: del.status, getAfter: gone.status };
  out.residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int qa_users`))[0];
  step("cleanup", { repo: out.repoDeleted, residue: out.residue });
  process.exit(0);
}
