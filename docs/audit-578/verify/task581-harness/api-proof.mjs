// Task 581 API-level proofs (B01, B02, B03, B05-api, B06-api, B09).
// Real dev app + real Clerk sessions + real DEV DB. All fixtures prefixed.
import fs from "node:fs";
import { BASE, PREFIX, q, pool, call, mintUser, token, deleteUser, log } from "./lib.mjs";

const out = {};
const rec = (item, label, value) => { (out[item] ??= []).push({ label, ...value }); log(`[${item}] ${label}`, JSON.stringify(value).slice(0, 400)); };
const created = { journeys: [], resources: [] };
let user;

async function mkJourney(tag, status) {
  const [j] = await q(
    `INSERT INTO learning_journeys (title, description, category, status) VALUES ($1,$2,'Encoding & Codecs',$3) RETURNING id`,
    [`${PREFIX}${tag}`, `${PREFIX}${tag} PRIVATE description`, status],
  );
  created.journeys.push(j.id);
  return j.id;
}
async function mkStep(journeyId, stepNumber, resourceId, title, isOptional = false) {
  const [s] = await q(
    `INSERT INTO journey_steps (journey_id, resource_id, step_number, title, description, is_optional) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [journeyId, resourceId, stepNumber, `${PREFIX}${title}`, `${PREFIX}${title} desc`, isOptional],
  );
  return s.id;
}
async function mkResource(tag, status) {
  const [r] = await q(
    `INSERT INTO resources (title, url, description, category, status) VALUES ($1,$2,$3,'Encoding & Codecs',$4) RETURNING id`,
    [`${PREFIX}res_${tag}`, `https://example.com/${PREFIX}${tag}`, `${PREFIX}res_${tag} SECRET description`, status],
  );
  created.resources.push(r.id);
  return r.id;
}
const approvedIds = (await q(`SELECT id FROM resources WHERE status='approved' ORDER BY id LIMIT 6`)).map((r) => r.id);

try {
  user = await mintUser("api");
  let jwt = await token(user);
  // JIT-provision the local row.
  rec("setup", "auth user", { status: (await call("GET", "/api/auth/user", { jwt })).status, bridgeId: user.bridgeId });

  // ---------------- B01 ----------------
  const draft = await mkJourney("b01_draft", "draft");
  const archived = await mkJourney("b01_archived", "archived");
  await mkStep(draft, 1, approvedIds[0], "b01_draft_step");
  await mkStep(archived, 1, approvedIds[0], "b01_archived_step");
  const missing = 2147483000;
  for (const [name, id] of [["draft", draft], ["archived", archived], ["missing", missing]]) {
    const api = await call("GET", `/api/journeys/${id}`);
    const html = await call("GET", `/journey/${id}`);
    rec("B01", `anon GET /api/journeys/${id} (${name})`, { status: api.status, body: api.text, leaksPrivate: api.text.includes("PRIVATE") });
    rec("B01", `anon GET /journey/${id} HTML (${name})`, { status: html.status, leaksPrivate: html.text.includes("PRIVATE") || html.text.includes(`${PREFIX}b01`) });
    jwt = await token(user);
    const start = await call("POST", `/api/journeys/${id}/start`, { jwt });
    const put = await call("PUT", `/api/journeys/${id}/progress`, { jwt, body: { stepIds: [1], completed: true } });
    const getp = await call("GET", `/api/journeys/${id}/progress`, { jwt });
    const userGet = await call("GET", `/api/journeys/${id}`, { jwt });
    rec("B01", `signed-in user on ${name}`, { detail: userGet.status, start: start.status, startBody: start.text, putProgress: put.status, getProgress: getp.status });
  }
  rec("B01", "progress rows created for draft/archived", { rows: (await q(`SELECT count(*)::int n FROM user_journey_progress WHERE journey_id = ANY($1)`, [[draft, archived]]))[0].n });
  const adminList = await call("GET", "/api/admin/journeys", { admin: true });
  const adminIds = (adminList.json?.journeys ?? []).filter((j) => [draft, archived].includes(j.id)).map((j) => `${j.id}:${j.status}`);
  const adminSteps = await call("GET", `/api/admin/journeys/${draft}/steps`, { admin: true });
  rec("B01", "admin list + steps editor still load drafts", { listStatus: adminList.status, adminIds, stepsStatus: adminSteps.status, stepCount: adminSteps.json?.steps?.length });
  const pub = await call("PUT", `/api/admin/journeys/${draft}`, { admin: true, body: { status: "published" } });
  jwt = await token(user);
  const pubDetail = await call("GET", `/api/journeys/${draft}`);
  const pubStart = await call("POST", `/api/journeys/${draft}/start`, { jwt });
  rec("B01", "after admin publishes the draft", { publish: pub.status, anonDetail: pubDetail.status, title: pubDetail.json?.title, start: pubStart.status, created: pubStart.json?.created });
  rec("B01", "published journey 7 unaffected", { status: (await call("GET", "/api/journeys/7")).status });

  // ---------------- B02 ----------------
  const rejected = await q(`SELECT r.id, r.title, r.url FROM journey_steps js JOIN resources r ON r.id=js.resource_id WHERE r.status<>'approved'`);
  for (const jid of [6, 9, 10]) {
    const api = await call("GET", `/api/journeys/${jid}`);
    const html = await call("GET", `/journey/${jid}`);
    const leaksApi = rejected.filter((r) => api.text.includes(r.title) || api.text.includes(r.url)).map((r) => r.id);
    const leaksHtml = rejected.filter((r) => html.text.includes(r.title) || html.text.includes(r.url) || html.text.includes(`/resource/${r.id}"`)).map((r) => r.id);
    const unavailableRows = (api.json?.steps ?? []).filter((s) => s.resourceId != null && !s.resource).map((s) => ({ id: s.id, stepNumber: s.stepNumber, resourceId: s.resourceId, resource: s.resource ?? null }));
    const logical = new Set((api.json?.steps ?? []).map((s) => s.stepNumber)).size;
    rec("B02", `journey ${jid}`, { apiStatus: api.status, htmlStatus: html.status, stepCount: api.json?.stepCount, logicalGroups: logical, unavailableRows, rejectedFieldsInApi: leaksApi, rejectedFieldsInHtml: leaksHtml, htmlHasUnavailableNote: html.text.includes("no longer available") });
  }
  // QA fixture: published journey referencing pending/rejected/withdrawn/approved QA resources.
  const qaJourney = await mkJourney("b02_published", "published");
  const st = {};
  for (const s of ["pending", "rejected", "withdrawn", "archived", "approved"]) st[s] = await mkResource(`b02_${s}`, s);
  let n = 1;
  for (const s of Object.keys(st)) await mkStep(qaJourney, n++, st[s], `b02_step_${s}`);
  const qa = await call("GET", `/api/journeys/${qaJourney}`);
  const qaHtml = await call("GET", `/journey/${qaJourney}`);
  const qaRes = await call("GET", `/api/journeys/${qaJourney}`);
  const byStatus = Object.fromEntries(Object.entries(st).map(([s, rid]) => {
    const step = qa.json.steps.find((x) => x.resourceId === rid);
    return [s, { resource: step?.resource ? { id: step.resource.id, title: step.resource.title } : null }];
  }));
  rec("B02", "QA journey with mixed-status resources (anon API)", { status: qa.status, byStatus, secretInApi: ["pending", "rejected", "withdrawn", "archived"].filter((s) => qa.text.includes(`res_b02_${s}`)) , approvedInApi: qa.text.includes("res_b02_approved") });
  rec("B02", "QA journey server HTML", { status: qaHtml.status, secretInHtml: ["pending", "rejected", "withdrawn", "archived"].filter((s) => qaHtml.text.includes(`res_b02_${s}`)), approvedInHtml: qaHtml.text.includes("res_b02_approved"), unavailableNote: qaHtml.text.includes("no longer available") });
  void qaRes;
  const adminQa = await call("GET", `/api/admin/journeys/${qaJourney}/steps`, { admin: true });
  rec("B02", "admin editor still hydrates non-approved resources", { status: adminQa.status, hydrated: adminQa.json.steps.filter((s) => s.resource).length, of: adminQa.json.steps.length });
  rec("B02", "six rejected linked resources still rejected", { rows: await q(`SELECT id, status FROM resources WHERE id = ANY($1) ORDER BY id`, [[184980, 186453, 184773, 186448, 185324, 185082]]) });

  // ---------------- B03 ----------------
  jwt = await token(user);
  const start7 = await call("POST", "/api/journeys/7/start", { jwt });
  const g1 = [181, 182, 183];
  const first = await call("PUT", "/api/journeys/7/progress", { jwt, body: { stepIds: g1, completed: true } });
  const again = await call("PUT", "/api/journeys/7/progress", { jwt, body: { stepIds: g1, completed: true } });
  rec("B03", "valid three-row group", { start: start7.status, first: first.status, firstFlags: { logical: first.json?.logicalStepBecameComplete, journey: first.json?.journeyBecameComplete }, completedSteps: first.json?.completedSteps, repeatFlags: { logical: again.json?.logicalStepBecameComplete } });
  const snapshot = async () => JSON.stringify((await call("GET", "/api/journeys/7/progress", { jwt: await token(user) })).json?.completedSteps);
  const before = await snapshot();
  const cases = [
    ["mixed string", '{"stepIds":[181,"bad"],"completed":false}'],
    ["null member", '{"stepIds":[181,null],"completed":false}'],
    ["fraction", '{"stepIds":[181,1.5],"completed":false}'],
    ["int overflow", '{"stepIds":[181,2147483648],"completed":false}'],
    ["negative", '{"stepIds":[181,-4],"completed":false}'],
    ["empty array", '{"stepIds":[],"completed":false}'],
    ["duplicates", '{"stepIds":[181,181],"completed":false}'],
    ["string ids", '{"stepIds":"181","completed":false}'],
    ["101 ids", JSON.stringify({ stepIds: Array.from({ length: 101 }, (_, i) => i + 1), completed: false })],
    ["stepId+stepIds", '{"stepId":181,"stepIds":[181],"completed":false}'],
    ["completed not boolean", '{"stepIds":[181],"completed":"no"}'],
  ];
  for (const [label, raw] of cases) {
    const r = await call("PUT", "/api/journeys/7/progress", { jwt: await token(user), raw });
    const afterSnap = await snapshot();
    rec("B03", label, { body: raw.slice(0, 80), status: r.status, message: r.json?.message, progressUnchanged: afterSnap === before });
  }
  const foreign = await call("PUT", "/api/journeys/7/progress", { jwt: await token(user), body: { stepIds: [181, 199], completed: false } });
  rec("B03", "foreign step id keeps 422", { status: foreign.status, message: foreign.json?.message, progressUnchanged: (await snapshot()) === before });

  // ---------------- B06 (API) ----------------
  const b06 = await mkJourney("b06", "draft");
  const b06Step = await mkStep(b06, 1, approvedIds[1], "b06_step");
  const rowsBefore = JSON.stringify(await q(`SELECT id, step_number, resource_id, title FROM journey_steps WHERE journey_id=$1 ORDER BY id`, [b06]));
  const post = await call("POST", `/api/admin/journeys/${b06}/steps`, { admin: true, body: { title: `${PREFIX}b06_new`, resourceId: 2147483647 } });
  const patch = await call("PATCH", `/api/admin/journeys/${b06}/steps/${b06Step}`, { admin: true, body: { resourceId: 2147483647 } });
  const rejectedPatch = await call("PATCH", `/api/admin/journeys/${b06}/steps/${b06Step}`, { admin: true, body: { resourceId: 184980 } });
  const stalePatch = await call("PATCH", `/api/admin/journeys/${b06}/steps/999999999`, { admin: true, body: { title: `${PREFIX}x` } });
  const rowsAfter = JSON.stringify(await q(`SELECT id, step_number, resource_id, title FROM journey_steps WHERE journey_id=$1 ORDER BY id`, [b06]));
  rec("B06", "POST step with missing resourceId 2147483647", { status: post.status, message: post.json?.message });
  rec("B06", "PATCH step with missing resourceId 2147483647", { status: patch.status, message: patch.json?.message });
  rec("B06", "PATCH step with rejected resource 184980", { status: rejectedPatch.status, message: rejectedPatch.json?.message });
  rec("B06", "PATCH a step id that does not exist", { status: stalePatch.status, message: stalePatch.json?.message });
  rec("B06", "step rows unchanged", { unchanged: rowsBefore === rowsAfter, rows: JSON.parse(rowsAfter) });

  // ---------------- B05 (API) ----------------
  const b05 = await mkJourney("b05_api", "published");
  const a1 = await mkStep(b05, 1, approvedIds[2], "b05_g1");
  const a2 = await mkStep(b05, 1, approvedIds[3], "b05_g1");
  const a3 = await mkStep(b05, 1, approvedIds[4], "b05_g1");
  const b1 = await mkStep(b05, 2, approvedIds[5], "b05_g2");
  const c1 = await mkStep(b05, 3, approvedIds[0], "b05_g3");
  jwt = await token(user);
  await call("POST", `/api/journeys/${b05}/start`, { jwt });
  await call("PUT", `/api/journeys/${b05}/progress`, { jwt: await token(user), body: { stepIds: [b1], completed: true } });
  await q(`UPDATE user_journey_progress SET completed_steps = $1::jsonb, current_step_id = $2 WHERE journey_id=$3`, [JSON.stringify([a1, a2, a3, b1]), a2, b05]);
  const stateQ = async () => ({
    steps: await q(`SELECT id, step_number FROM journey_steps WHERE journey_id=$1 ORDER BY step_number, id`, [b05]),
    progress: await q(`SELECT completed_steps, current_step_id, completed_at FROM user_journey_progress WHERE journey_id=$1`, [b05]),
  });
  rec("B05", "before group delete", await stateQ());
  const del = await call("DELETE", `/api/admin/journeys/${b05}/steps/${a2}?group=true`, { admin: true });
  rec("B05", `DELETE middle row ${a2} ?group=true`, { status: del.status, body: del.json, ...(await stateQ()) });
  // Remove a single referenced row (current pointer) from a group.
  const d1 = await mkStep(b05, 3, approvedIds[1], "b05_g3");
  await q(`UPDATE user_journey_progress SET completed_steps = $1::jsonb, current_step_id = $2 WHERE journey_id=$3`, [JSON.stringify([b1, c1, d1]), d1, b05]);
  rec("B05", "before single-row remove", await stateQ());
  const delRow = await call("DELETE", `/api/admin/journeys/${b05}/steps/${d1}`, { admin: true });
  rec("B05", `DELETE referenced single row ${d1}`, { status: delRow.status, ...(await stateQ()) });
  const apiAfter = await call("GET", `/api/journeys/${b05}/progress`, { jwt: await token(user) });
  rec("B05", "user GET progress after deletes", { status: apiAfter.status, completedSteps: apiAfter.json?.completedSteps, currentStepId: apiAfter.json?.currentStepId });

  // ---------------- B09 ----------------
  const recCases = [
    "categories=a&categories=b", "goals=x&goals=y", "types=video&types=article",
    "categories[a]=b", "goals[]=x", "skillLevel=beginner&skillLevel=advanced",
    "timeCommitment[x]=1", "limit=5&limit=6", "limit[a]=1", "skillLevel=expert",
    "categories=Encoding%20%26%20Codecs,Streaming&limit=5", "skillLevel=beginner&goals=learn-fundamentals&types=video&limit=3", "",
  ];
  for (const qs of recCases) {
    const r = await call("GET", `/api/recommendations${qs ? `?${qs}` : ""}`);
    rec("B09", `GET /api/recommendations?${qs}`, { status: r.status, message: r.json?.message, items: Array.isArray(r.json) ? r.json.length : undefined, firstType: Array.isArray(r.json) ? r.json[0]?.recommendationType ?? r.json[0]?.type : undefined });
  }
} catch (e) {
  console.error("SCRIPT ERROR", e);
  out.error = String(e?.stack ?? e);
} finally {
  // Cleanup: fixtures by exact id (journeys cascade steps + progress).
  if (created.journeys.length) await q(`DELETE FROM learning_journeys WHERE id = ANY($1)`, [created.journeys]);
  if (created.resources.length) {
    await q(`DELETE FROM journey_steps WHERE resource_id = ANY($1)`, [created.resources]);
    await q(`DELETE FROM resources WHERE id = ANY($1)`, [created.resources]);
  }
  await q(`DELETE FROM user_journey_progress WHERE user_id LIKE $1`, [`${PREFIX}%`]);
  if (user) {
    await deleteUser(user).catch((e) => log("clerk delete failed", String(e)));
    out.cleanup = { fixtures: created, clerkDeleted: user.clerkUserId };
  }
  fs.writeFileSync(new URL("./out/api-proof.json", import.meta.url), JSON.stringify(out, null, 2));
  await pool.end();
}
