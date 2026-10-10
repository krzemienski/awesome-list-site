// V17 — GitHub configure / Pull / repeat Pull / direct import (dryRun + real) / process-queue / partial / Sync now,
// against a disposable PRIVATE repo (krzemienski/__qa_test_plan_592_gh) and the QA-only seed scratch DB.
// Instance C (:5165) runs with NORMAL credentials and background jobs enabled.
// Env: DATABASE_URL = seed scratch URL, BASE_URL = http://127.0.0.1:5165, GITHUB_PERSONAL_ACCESS_TOKEN (repo admin).
// Safety: every /api/github/(import|export) request from the browser is aborted unless its body names the disposable repo.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep, PREFIX, token } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1800)); writeJson("/tmp/v592out/v17-github.json", out); };

// ---------- GitHub (disposable private repo) ----------
const GH = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = "krzemienski", REPO = "__qa_test_plan_592_gh", FULL = `${OWNER}/${REPO}`;
const gh = async (method, path, body) => {
  const r = await fetch(`https://api.github.com${path}`, { method, headers: { Authorization: `Bearer ${GH}`, Accept: "application/vnd.github+json", "User-Agent": "qa592" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j };
};
const putFile = async (path, content, message) => {
  const cur = await gh("GET", `/repos/${FULL}/contents/${path}`);
  const r = await gh("PUT", `/repos/${FULL}/contents/${path}`, { message, content: Buffer.from(content).toString("base64"), sha: cur.json?.sha });
  if (r.status >= 300) throw new Error(`PUT ${path} ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  return r.json.commit.sha;
};
const rawUrl = `https://raw.githubusercontent.com/${FULL}/refs/heads/main/README.md`;
// raw.githubusercontent.com is CDN-cached (~5 min); wait until the app's own read path would see the new commit.
const waitRaw = async (needle) => {
  const t0 = Date.now();
  while (Date.now() - t0 < 420_000) {
    const r = await fetch(rawUrl, { headers: { Authorization: `token ${GH}` } });
    if (r.ok && (await r.text()).includes(needle)) return Date.now() - t0;
    await sleep(10_000);
  }
  throw new Error("raw never served " + needle);
};

const T = (s) => `${PREFIX}v17 ${s}`;
const RFC = (n) => `https://www.rfc-editor.org/rfc/rfc${n}.html`;
const item = (t, n, d) => `- [${T(t)}](${RFC(n)}) - ${d}`;
const readme = (extra = []) => [
  `# Awesome QA 592 [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)`, "",
  "> Disposable private list for an isolated GitHub sync proof.", "",
  "## Contents", "", `- [${T("Cat X")}](#)`, "",
  `## ${T("Cat X")}`, "",
  item("R1", 6716, "Opus audio codec specification."),
  item("R2", 8216, "HTTP Live Streaming specification."), "",
  `### ${T("Sub X1")}`, "",
  item("R3", 7798, "RTP payload format for HEVC."),
  ...extra, "",
].join("\n");
const R4 = item("R4", 6184, "RTP payload format for H.264 video.");
const R5 = item("R5", 3550, "RTP transport protocol for real-time applications.");
const R6bad = item("R6", 7741, "Payload format for VP8\u0000 video.");

// ---------- Instance C ----------
const fd = fs.openSync("/tmp/scrC-v17.log", "a");
const cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5165", SEED_SOURCE_URL: "http://127.0.0.1:5198/unused.json" } });
const stopC = async () => { try { process.kill(-cProc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {} };

let ADM;
const api = async (method, path, body) => {
  const r = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json", Origin: BASE, Authorization: `Bearer ${await token(ADM)}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j, text: t.slice(0, 500) };
};
const v17Rows = () => q(`SELECT id, title, url, category, subcategory, status FROM resources WHERE title LIKE '\\_\\_qa\\_test\\_plan\\_592\\_v17%' ORDER BY id`);
const counts = async () => (await q(`SELECT (SELECT count(*) FROM github_sync_queue)::int queue, (SELECT count(*) FROM github_sync_history)::int history,
  (SELECT count(*) FROM resources)::int resources, (SELECT count(*) FROM resources WHERE title LIKE '\\_\\_qa\\_test\\_plan\\_592\\_v17%')::int v17`))[0];
const waitQueue = async (id, ms = 240_000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const [r] = await q(`SELECT id, action, status, branch, error_message, metadata FROM github_sync_queue WHERE id=$1`, [id]);
    if (r && !["pending", "processing"].includes(r.status)) return { ...r, ms: Date.now() - t0 };
    await sleep(1500);
  }
  return { id, status: "TIMEOUT" };
};

const browser = await launch();
try {
  // Disposable repo
  let repo = await gh("GET", `/repos/${FULL}`);
  if (repo.status === 404) repo = await gh("POST", "/user/repos", { name: REPO, private: true, auto_init: true, description: "Disposable QA repo for an isolated GitHub sync proof; deleted after the run." });
  await sleep(3000);
  const c1 = await putFile("README.md", readme(), "QA 592: list v1 (R1-R3)");
  const anon = await fetch(rawUrl);
  step("repo-ready", { status: repo.status, private: repo.json?.private, defaultBranch: repo.json?.default_branch, commitV1: c1, anonymousRawStatus: anon.status, rawWaitMs: await waitRaw(T("R3")) });

  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  ADM = await mintUser("v17admin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);

  // E107 configure
  const cfgOk = await api("POST", "/api/github/configure", { repositoryUrl: FULL });
  const cfgUrl = await api("POST", "/api/github/configure", { repositoryUrl: `https://github.com/${FULL}` });
  const cfgBad = await api("POST", "/api/github/configure", { repositoryUrl: "not a repo!!" });
  const cfgMissing = await api("POST", "/api/github/configure", { repositoryUrl: `${OWNER}/__qa_test_plan_592_missing` });
  const cfgBadTok = await api("POST", "/api/github/configure", { repositoryUrl: FULL, token: "ghp_qa592invalidtoken000000000000000000" });
  step("E107-configure", { ok: cfgOk, fullUrl: cfgUrl, malformed: cfgBad, missingRepo: cfgMissing, rejectedToken: cfgBadTok });

  // Browser at 1440, with the safety guard.
  const { page } = await newPage(browser, VPS.desktop);
  const guard = async (pg) => pg.route(/\/api\/github\/(import|export)$/, (route) => {
    const body = route.request().postData() ?? "";
    if (!body.includes(REPO)) { console.error("ABORTED unsafe github request", body); return route.abort(); }
    return route.continue();
  });
  await guard(page);
  await signIn(page, ADM, "/admin/github");
  await page.goto(`${BASE}/admin/github`, { waitUntil: "domcontentloaded" });
  const ui = async (pg, action) => {
    await pg.locator('[data-testid="button-github-more"]').waitFor({ timeout: 45_000 });
    if ((await pg.locator('[data-testid="input-repo-url"]').count()) === 0) await pg.locator('[data-testid="button-github-more"]').click();
    await pg.locator('[data-testid="input-repo-url"]').fill(FULL);
    await pg.locator(`[data-testid="button-${action === "import" ? "import" : "export"}-github"]`).click();
    const dlg = pg.getByRole("alertdialog"); await dlg.waitFor();
    const dlgText = (await dlg.innerText()).replace(/\s+/g, " ");
    if (!dlgText.includes(REPO)) throw new Error("confirm dialog does not name the disposable repo: " + dlgText);
    const rp = pg.waitForResponse((r) => r.url().endsWith(`/api/github/${action}`) && r.request().method() === "POST", { timeout: 60_000 });
    await pg.locator('[data-testid="button-confirm-sync-action"]').click();
    const r = await rp; const body = await r.json().catch(() => null);
    const final = await waitQueue(body?.queueId);
    // The panel polls on its own; wait for the job's terminal text to show, no interaction.
    let uiText = "";
    for (let i = 0; i < 20; i++) {
      uiText = (await pg.locator("body").innerText()).replace(/\s+/g, " ");
      const m = uiText.match(new RegExp(`(Import|Export) [^ ]* ?(COMPLETED|PARTIAL|FAILED)`));
      if (m && !/PROCESSING|PENDING/.test(uiText.slice(0, 4000))) break;
      await sleep(1000);
    }
    const counter = await pg.locator(`[data-testid="sync-queue-counts-${body?.queueId}"]`).innerText().catch(() => null);
    const errs = await pg.locator(`[data-testid="sync-queue-errors-${body?.queueId}"]`).innerText().catch(() => null);
    return { dialog: dlgText.slice(0, 300), status: r.status(), body, final, uiCounts: counter, uiErrors: errs, toasts: await toasts(pg) };
  };

  // Pull #1 (C1376/C1388/E109)
  const before1 = await counts();
  const p1 = await ui(page, "import"); await shot(page, "V17-pull1-desktop");
  const hist1 = await q(`SELECT id, direction, resources_added, resources_updated, total_resources, performed_by IS NOT NULL by_set, metadata->>'outcome' outcome FROM github_sync_history ORDER BY id DESC LIMIT 2`);
  step("pull-1-ui", { ...p1, before: before1, after: await counts(), rows: await v17Rows(), history: hist1,
    taxonomy: await q(`SELECT 'c' k, name FROM categories WHERE name LIKE '%592\\_v17%' UNION ALL SELECT 's', name FROM subcategories WHERE name LIKE '%592\\_v17%'`) });

  // Pull #2 — no duplicate rows
  await page.reload({ waitUntil: "domcontentloaded" });
  const before2 = await counts();
  const p2 = await ui(page, "import"); await shot(page, "V17-pull2-desktop");
  step("pull-2-ui-repeat", { ...p2, before: before2, after: await counts(), rows: await v17Rows() });

  // E018 direct import: dryRun then real (README v2 adds R4)
  const c2 = await putFile("README.md", readme([R4]), "QA 592: list v2 (+R4)");
  const w2 = await waitRaw(T("R4"));
  const bDry = await counts();
  const dry = await api("POST", "/api/admin/import-github", { repoUrl: FULL, dryRun: true });
  const aDry = await counts();
  const real = await api("POST", "/api/admin/import-github", { repoUrl: FULL });
  const aReal = await counts();
  step("E018-direct", { commitV2: c2, rawWaitMs: w2, dryRun: { status: dry.status, json: dry.json && { ...dry.json, validationWarnings: dry.json.validationWarnings?.length } }, beforeDry: bDry, afterDry: aDry,
    real: { status: real.status, json: real.json && { ...real.json, validationWarnings: real.json.validationWarnings?.length } }, afterReal: aReal, rows: await v17Rows() });

  // E110 process-queue with a QA pending queue row (README v3 adds R5)
  const c3 = await putFile("README.md", readme([R4, R5]), "QA 592: list v3 (+R5)");
  const w3 = await waitRaw(T("R5"));
  const [qrow] = await q(`INSERT INTO github_sync_queue (repository_url, branch, resource_ids, action, status, metadata, created_at)
     VALUES ($1, NULL, '[]'::jsonb, 'import', 'pending', $2::jsonb, now()) RETURNING id`, [FULL, JSON.stringify({ qa: T("pending row") })]);
  const bq = await counts();
  const pq = await api("POST", "/api/github/process-queue", {});
  const fq = await waitQueue(qrow.id);
  step("E110-process-queue", { commitV3: c3, rawWaitMs: w3, queueRowId: qrow.id, response: pq, final: fq, before: bq, after: await counts(), rows: await v17Rows() });

  // Partial import through the UI (README v4 adds R6 with a NUL byte Postgres rejects)
  const c4 = await putFile("README.md", readme([R4, R5, R6bad]), "QA 592: list v4 (+R6 with NUL)");
  const w4 = await waitRaw(T("R6"));
  await page.reload({ waitUntil: "domcontentloaded" });
  const bp = await counts();
  const pp = await ui(page, "import"); await shot(page, "V17-pull-partial-desktop");
  step("pull-partial-ui", { commitV4: c4, rawWaitMs: w4, ...pp, before: bp, after: await counts(), rows: await v17Rows() });

  // Sync now #1 — catalog still holds the v16 example.org URLs (404): the export link gate must block before any write.
  const headBefore = (await gh("GET", `/repos/${FULL}/commits/main`)).json?.sha;
  await page.reload({ waitUntil: "domcontentloaded" });
  const e1 = await ui(page, "export"); await shot(page, "V17-sync-blocked-desktop");
  const headAfterBlocked = (await gh("GET", `/repos/${FULL}/commits/main`)).json?.sha;
  step("sync-1-blocked", { ...e1, final: { ...e1.final, error_message: e1.final.error_message?.slice(0, 1200) }, remoteHeadBefore: headBefore, remoteHeadAfter: headAfterBlocked, remoteUnchanged: headBefore === headAfterBlocked });

  // Repair the QA catalog on scratch (live URLs, sentence descriptions) and Sync now at 390.
  const v16 = await q(`SELECT id FROM resources WHERE url LIKE 'https://example.org/\\_\\_qa\\_test\\_plan\\_592\\_v16/%' ORDER BY id`);
  const live = [9317, 6381, 7587, 2326, 4566, 8829];
  for (const [i, r] of v16.entries()) await q(`UPDATE resources SET url=$2, description=$3 WHERE id=$1`, [r.id, RFC(live[i]), `QA reference specification number ${i + 1}.`]);
  const approved = (await q(`SELECT count(*)::int n FROM resources WHERE status='approved'`))[0].n;
  const { page: m } = await newPage(browser, VPS["390"]);
  await guard(m);
  await signIn(m, ADM, "/admin/github");
  await m.goto(`${BASE}/admin/github`, { waitUntil: "domcontentloaded" });
  const e2 = await ui(m, "export"); await shot(m, "V17-sync-ok-390");
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const head = await gh("GET", `/repos/${FULL}/commits/main`);
  const rd = await gh("GET", `/repos/${FULL}/contents/README.md?ref=main`);
  const md = rd.json?.content ? Buffer.from(rd.json.content, "base64").toString("utf8") : "";
  const contrib = await gh("GET", `/repos/${FULL}/contents/CONTRIBUTING.md?ref=main`);
  const listItems = md.split("\n").filter((l) => /^\s*- \[[^\]]+\]\(https?:\/\/(?!awesome\.re)[^)]+\)/.test(l) && !l.includes("](#"));
  const hist2 = await q(`SELECT id, direction, commit_sha, commit_url, resources_added, total_resources FROM github_sync_history WHERE direction='export' ORDER BY id DESC LIMIT 1`);
  step("sync-2-ok-390", { ...e2, mobileOverflowPx: overflow, approvedInDb: approved,
    remote: { head: head.json?.sha, message: head.json?.commit?.message, files: head.json?.files?.map((f) => f.filename), readmeListItems: listItems.length, qaTitlesInReadme: (md.match(/__qa_test_plan_592_v1[67]/g) ?? []).length, contributing: contrib.status, readmeHead: md.slice(0, 300) },
    history: hist2, commitMatchesQueue: e2.final?.metadata?.commitSha === head.json?.sha });
  await m.close(); await page.close();
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close().catch(() => {});
  await teardownAll();
  out.residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int qa_users`))[0];
  step("residue", out.residue);
  await stopC();
  process.exit(0);
}
