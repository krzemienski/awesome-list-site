// V05 — journey start / complete grouped logical steps / Resume / milestone / Undo / reload,
// plus an owned prefixed journey (multi-row steps) unpublished while enrolled → recovery.
import { BASE, q, mintUser, call, token, ensureLocal, teardownAll, residue, writeJson, sleep, PREFIX } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS, pageFetch } from "./browser-lib.mjs";

const vpName = process.argv[2] ?? "desktop";
const out = { started: new Date().toISOString(), vp: vpName, steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1200)); };
const J = 7;
let ownedJourney = null;
const browser = await launch();
try {
  const A = await mintUser("v05a");
  const local = await ensureLocal(A);
  const { page } = await newPage(browser, VPS[vpName]);
  const progress = async () => { const [p] = await q(`SELECT completed_steps, completed_at FROM user_journey_progress WHERE user_id=$1 AND journey_id=$2`, [local.id, J]); return p ? { n: p.completed_steps.length, completedAt: p.completed_at } : null; };
  await signIn(page, A, `/journey/${J}`);
  await page.goto(`${BASE}/journey/${J}`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-start-journey"]').click();
  await page.locator('[data-testid="button-complete-step-1"]').waitFor({ timeout: 20_000 });
  step("start", { progress: await progress(), cards: await page.locator('[data-testid^="button-complete-step-"]').count() });
  for (const n of [1, 2, 3]) {
    await page.locator(`[data-testid="button-complete-step-${n}"]`).click();
    await page.locator(`[data-testid="button-uncomplete-step-${n}"]`).waitFor({ timeout: 15_000 });
  }
  step("after-3", { progress: await progress() });
  // Continue Learning: Resume opens the next unfinished anchor.
  await page.goto(`${BASE}/continue-learning`, { waitUntil: "domcontentloaded" });
  const resume = page.locator(`[data-testid="button-resume-journey-${J}"]`);
  await resume.waitFor({ timeout: 30_000 });
  const cl = await pageFetch(page, "/api/user/continue-learning");
  const item = (cl.json?.journeys ?? cl.json?.activeJourneys ?? cl.json?.inProgressJourneys ?? []).find?.((j) => j.journeyId === J);
  step("continue-learning", { resumeLabel: await resume.getAttribute("aria-label"), item: item ? { completedSteps: item.completedSteps, totalSteps: item.totalSteps, percent: item.percent ?? item.progressPercent, nextStep: item.nextStep } : Object.keys(cl.json ?? {}) });
  await shot(page, `V05-continue-learning-${vpName}`);
  await resume.click();
  await page.waitForURL(new RegExp(`/journey/${J}`), { timeout: 20_000 });
  await sleep(1500);
  step("resume", { url: page.url(), focusedOrHash: await page.evaluate(() => ({ hash: location.hash, active: document.activeElement?.id || document.activeElement?.getAttribute("data-testid") })) });
  for (const n of [4, 5, 6]) {
    await page.locator(`[data-testid="button-complete-step-${n}"]`).click();
    await page.locator(`[data-testid="button-uncomplete-step-${n}"]`).waitFor({ timeout: 15_000 });
  }
  await page.locator('[data-testid="badge-journey-completed"]').waitFor({ timeout: 15_000 }).catch(() => {});
  step("complete-all", { progress: await progress(), badge: await page.locator('[data-testid="badge-journey-completed"]').count(), toast: await toasts(page) });
  await shot(page, `V05-completed-${vpName}`);
  const cl2 = await pageFetch(page, "/api/user/continue-learning");
  step("milestone", { milestones: (cl2.json?.completedMilestones ?? []).map((m) => ({ journeyId: m.journeyId ?? m.id, title: m.title, completedAt: m.completedAt })) });
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="text-journeys-progress"]').waitFor({ timeout: 30_000 }).catch(() => {});
  step("profile", { journeysProgress: await page.locator('[data-testid="text-journeys-progress"]').innerText().catch(() => "n/a") });
  // Undo final step → milestone removed; reload keeps state.
  await page.goto(`${BASE}/journey/${J}`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-uncomplete-step-6"]').click();
  await page.locator('[data-testid="button-complete-step-6"]').waitFor({ timeout: 15_000 });
  await sleep(800);
  const cl3 = await pageFetch(page, "/api/user/continue-learning");
  step("undo", { progress: await progress(), milestones: (cl3.json?.completedMilestones ?? []).length, badge: await page.locator('[data-testid="badge-journey-completed"]').count() });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-complete-step-6"]').waitFor({ timeout: 30_000 });
  step("reload", { done: await page.locator('[data-testid^="button-uncomplete-step-"]').count(), open: await page.locator('[data-testid^="button-complete-step-"]').count() });
  await shot(page, `V05-after-undo-reload-${vpName}`);

  // Owned journey: 2 logical steps × 2 rows; enrolled, then unpublished by admin.
  const res = (await q(`SELECT id FROM resources WHERE status='approved' ORDER BY id LIMIT 4`)).map((r) => r.id);
  [ownedJourney] = await q(`INSERT INTO learning_journeys (title, description, category, status) VALUES ($1,'QA fixture journey','General','published') RETURNING id`, [`${PREFIX}v05 journey`]);
  for (let i = 0; i < 4; i++) await q(`INSERT INTO journey_steps (journey_id, resource_id, step_number, title) VALUES ($1,$2,$3,$4)`, [ownedJourney.id, res[i], i < 2 ? 1 : 2, `${PREFIX}step ${i < 2 ? 1 : 2}`]);
  await page.goto(`${BASE}/journey/${ownedJourney.id}`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-start-journey"]').click();
  await page.locator('[data-testid="button-complete-step-1"]').click();
  await page.locator('[data-testid="button-uncomplete-step-1"]').waitFor({ timeout: 15_000 });
  const [op] = await q(`SELECT completed_steps, completed_at FROM user_journey_progress WHERE user_id=$1 AND journey_id=$2`, [local.id, ownedJourney.id]);
  step("owned-grouped", { cards: await page.locator('[data-testid^="button-"][data-testid*="complete-step-"]').count(), completedSteps: op.completed_steps, completedAt: op.completed_at });
  const unpub = await call("PUT", `/api/admin/journeys/${ownedJourney.id}`, { admin: true, body: { status: "draft" } });
  await page.reload({ waitUntil: "domcontentloaded" });
  await sleep(3000);
  const bodyText = (await page.locator("main").innerText().catch(() => "")).slice(0, 400);
  await shot(page, `V05-unpublished-enrolled-${vpName}`);
  const anonApi = await call("GET", `/api/journeys/${ownedJourney.id}`);
  await page.goto(`${BASE}/continue-learning`, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  step("unpublished", { adminPut: unpub.status, detailText: bodyText, anonApi: anonApi.status, continueLearningListsIt: (await page.locator(`[data-testid="button-resume-journey-${ownedJourney.id}"]`).count()) > 0 });
  await shot(page, `V05-continue-after-unpublish-${vpName}`);
  out.pageErrors = page.__errors;
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  if (ownedJourney) await q(`DELETE FROM learning_journeys WHERE id=$1`, [ownedJourney.id]);
  out.residue = await residue(); console.log("residue", JSON.stringify(out.residue));
  writeJson(`/tmp/v592out/V05-${vpName}.json`, out); process.exit(0);
}
