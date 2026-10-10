// V17 part C — re-proof of the orphan-taxonomy fix in the GitHub import: items whose category hierarchy cannot be
// resolved must be refused (one item error each) instead of being created/updated with category text that names no
// taxonomy row. Disposable PRIVATE repo krzemienski/__qa_test_plan_592_gh2 on the seed scratch DB; deleted at the end.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep, token } from "./lib.mjs";

if (!/awesome_scratch_592_seed/.test(process.env.DATABASE_URL ?? "")) throw new Error("refusing: not the seed scratch DB");
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ at: new Date().toISOString(), name, ...data }); console.log(new Date().toISOString().slice(11, 19), name, JSON.stringify(data).slice(0, 1800)); writeJson("/tmp/v592out/v17c-hierarchy.json", out); };

const GH = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const OWNER = "krzemienski", REPO = "__qa_test_plan_592_gh2", FULL = `${OWNER}/${REPO}`;
const gh = async (method, path, body) => {
  const r = await fetch(`https://api.github.com${path}`, { method, headers: { Authorization: `Bearer ${GH}`, Accept: "application/vnd.github+json", "User-Agent": "qa592" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j };
};
const putFile = async (path, content, message) => {
  const cur = await gh("GET", `/repos/${FULL}/contents/${path}`);
  const r = await gh("PUT", `/repos/${FULL}/contents/${path}`, { message, content: Buffer.from(content).toString("base64"), sha: cur.json?.sha });
  if (r.status >= 300) throw new Error(`PUT ${path} ${r.status}`);
  return r.json.commit.sha;
};
const rawUrl = `https://raw.githubusercontent.com/${FULL}/refs/heads/main/README.md`;
const waitRaw = async (needle) => {
  const t0 = Date.now();
  while (Date.now() - t0 < 420_000) { const r = await fetch(rawUrl, { headers: { Authorization: `token ${GH}` } }); if (r.ok && (await r.text()).includes(needle)) return Date.now() - t0; await sleep(10_000); }
  throw new Error("raw never served " + needle);
};
const RFC = (n) => `https://www.rfc-editor.org/rfc/rfc${n}.html`;
// Heading 1 normalizes to "qatestplan592v16 Cat A", whose slug collides with the existing "__qa_test_plan_592_v16 Cat A"
// category → hierarchy cannot be resolved. Heading 2 is a fresh, resolvable category.
const README = [
  `# Awesome QA 592 [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)`, "",
  "> Disposable private list for an isolated GitHub import proof.", "",
  "## Contents", "", "- [Colliding](#)", "- [Fresh](#)", "",
  "## __qa_test_plan_592_v16 Cat A", "",
  `- [__qa_test_plan_592_v16 P2](${RFC(9317)}) - Existing row under a colliding heading.`,
  `- [__qa_test_plan_592_v17c R7](${RFC(3261)}) - New row under a colliding heading.`, "",
  "## QA592 v17c Fresh", "",
  `- [__qa_test_plan_592_v17c R8](${RFC(2616)}) - New row under a resolvable heading.`, "",
].join("\n");

const fd = fs.openSync("/tmp/scrC-v17c.log", "a");
const cProc = spawn("node_modules/.bin/tsx", ["server/index.ts"], { cwd: "/home/runner/workspace", detached: true, stdio: ["ignore", fd, fd],
  env: { ...process.env, PORT: "5165", SEED_SOURCE_URL: "http://127.0.0.1:5198/unused.json" } });
const stopC = async () => { try { process.kill(-cProc.pid, "SIGTERM"); } catch {} await sleep(2500); try { process.kill(-cProc.pid, "SIGKILL"); } catch {} };
let ADM;
const api = async (method, path, body) => {
  const r = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json", Origin: BASE, Authorization: `Bearer ${await token(ADM)}` }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j };
};
const snap = () => q(`SELECT id, title, category, subcategory, sub_subcategory, updated_at FROM resources WHERE title LIKE '\\_\\_qa\\_test\\_plan\\_592\\_v1%' ORDER BY id`);
const orphans = async () => (await q(`SELECT count(*)::int n FROM resources r WHERE r.status='approved' AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.name=r.category)`))[0].n;

try {
  let repo = await gh("GET", `/repos/${FULL}`);
  if (repo.status === 404) repo = await gh("POST", "/user/repos", { name: REPO, private: true, auto_init: true, description: "Disposable QA repo; deleted after the run." });
  await sleep(3000);
  const c1 = await putFile("README.md", README, "QA 592: colliding + fresh headings");
  step("repo-ready", { status: repo.status, private: repo.json?.private, commit: c1, anonymousRawStatus: (await fetch(rawUrl)).status, rawWaitMs: await waitRaw("v17c R8") });
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {} await sleep(1000); }
  ADM = await mintUser("v17cadmin"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);
  const before = await snap(); const orphansBefore = await orphans();
  const dry = await api("POST", "/api/admin/import-github", { repoUrl: FULL, dryRun: true });
  const real = await api("POST", "/api/admin/import-github", { repoUrl: FULL });
  const after = await snap(); const orphansAfter = await orphans();
  const p2b = before.find((r) => r.title.endsWith("P2")), p2a = after.find((r) => r.title.endsWith("P2"));
  step("import", {
    dryRun: { status: dry.status, outcome: dry.json?.outcome, imported: dry.json?.imported, updated: dry.json?.updated, errors: dry.json?.errors },
    real: { status: real.status, success: real.json?.success, outcome: real.json?.outcome, imported: real.json?.imported, updated: real.json?.updated, skipped: real.json?.skipped, totalErrors: real.json?.totalErrors, errors: real.json?.errors, message: real.json?.message },
    p2Before: p2b, p2After: p2a, p2Unchanged: JSON.stringify(p2b) === JSON.stringify(p2a),
    r7Created: after.some((r) => r.title.endsWith("v17c R7")), r8: after.find((r) => r.title.endsWith("v17c R8")) ?? null,
    r8CategoryRow: (await q(`SELECT id, name, slug FROM categories WHERE name ILIKE '%v17c%'`)),
    orphansBefore, orphansAfter,
    log: fs.readFileSync("/tmp/scrC-v17c.log", "utf8").split("\n").filter((l) => /Error processing|Error creating hierarchy|Imported:/.test(l)).slice(-8),
  });
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await teardownAll();
  await stopC();
  const del = await gh("DELETE", `/repos/${FULL}`); await sleep(2000);
  const gone = await gh("GET", `/repos/${FULL}`);
  await q(`DELETE FROM resource_audit_log WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE '\\_\\_qa\\_test\\_plan\\_592\\_v17c%')`);
  await q(`DELETE FROM resources WHERE title LIKE '\\_\\_qa\\_test\\_plan\\_592\\_v17c%'`);
  await q(`DELETE FROM categories WHERE name ILIKE '%v17c%'`);
  await q(`DELETE FROM github_sync_queue`); await q(`DELETE FROM github_sync_history`);
  const residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE '\\_\\_qa\\_test\\_plan\\_592\\_%')::int qa_users,
    (SELECT count(*) FROM resources WHERE title LIKE '%v17c%')::int v17c_resources, (SELECT count(*) FROM categories WHERE name ILIKE '%v17c%')::int v17c_categories`))[0];
  step("cleanup", { repo: { deleteStatus: del.status, getAfter: gone.status }, residue });
  process.exit(0);
}
