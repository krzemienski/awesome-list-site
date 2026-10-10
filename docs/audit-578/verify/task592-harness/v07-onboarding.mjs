// V07 — onboarding invitation dismissal, wizard persistence (reload, save-and-browse-later,
// browser Back/Forward), completion stability, /settings layout + values + stale-tab conflict,
// server-side validation, and fresh-account empty states.
import { BASE, q, mintUser, call, token, ensureLocal, teardownAll, residue, writeJson, sleep } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS, pageFetch } from "./browser-lib.mjs";

const vpName = process.argv[2] ?? "desktop";
const out = { started: new Date().toISOString(), vp: vpName, steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1000)); };
const browser = await launch();
try {
  const A = await mintUser("v07a");
  await ensureLocal(A);
  const { context, page } = await newPage(browser, VPS[vpName]);
  const pf = (p) => ({ preferredCategories: p.preferredCategories, skillLevel: p.skillLevel, learningGoals: p.learningGoals, preferredResourceTypes: p.preferredResourceTypes, timeCommitment: p.timeCommitment });
  const prefs = async () => (await pageFetch(page, "/api/user/preferences")).json;
  const stepLabel = () => page.getByText(/^Step \d of 5$/).first().innerText().catch(() => "?");
  const pick = async (n = 0) => { await page.locator("fieldset label").nth(n).click(); await sleep(200); };
  const next = async () => { await page.locator('[data-testid="button-onboarding-next"]').click(); await page.waitForFunction((s) => !new URL(location.href).searchParams.get("step") || true, null); await sleep(900); };

  // Fresh-account empty states.
  await signIn(page, A, "/?context=account");
  const empties = {};
  for (const p of ["/bookmarks", "/contributions", "/continue-learning", "/notifications"]) {
    await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
    await sleep(3500);
    empties[p] = (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 260);
    await shot(page, `V07-empty${p.replace(/\//g, "-")}-${vpName}`);
  }
  step("empty-states", empties);

  // 1. Invitation → Not now.
  await page.goto(`${BASE}/?context=account`, { waitUntil: "domcontentloaded" });
  const card = page.locator('[data-testid="card-onboarding-invitation"]');
  await card.waitFor({ timeout: 30_000 });
  await shot(page, `V07-invitation-${vpName}`);
  await page.locator('[data-testid="button-dismiss-onboarding-invitation"]').click();
  await card.waitFor({ state: "detached", timeout: 15_000 });
  const p1 = await prefs();
  await page.reload({ waitUntil: "domcontentloaded" }); await sleep(4000);
  step("not-now", { status: p1.preferences?.onboardingStatus, dismissedAt: p1.preferences?.onboardingDismissedAt, cardAfterReload: await card.count() });

  // 2. Wizard: steps 1→3, reload halfway.
  await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-onboarding-next"]').waitFor({ timeout: 30_000 });
  await next(); // step 1 → validation? skill has default
  const afterStep1 = await stepLabel();
  await pick(0); const catChosen = await page.locator("fieldset label").nth(0).innerText();
  await next();
  await pick(0); const goalChosen = await page.locator("fieldset label").nth(0).innerText();
  // try Continue on step 3 with goal chosen → step 4 ; then reload mid-flow
  await next();
  const urlBefore = page.url(), labelBefore = await stepLabel();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-onboarding-next"]').waitFor({ timeout: 30_000 });
  const p2 = await prefs();
  step("reload-halfway", { afterStep1, catChosen, goalChosen, urlBefore, labelBefore, urlAfter: page.url(), labelAfter: await stepLabel(), saved: { status: p2.preferences?.onboardingStatus, step: p2.preferences?.onboardingStep, cats: p2.preferences?.preferredCategories, goals: p2.preferences?.learningGoals } });
  // Empty-step validation on step 4 (no format chosen yet)
  const fmtCheckedBefore = await page.locator('fieldset [role="checkbox"][data-state="checked"]').count();
  if (fmtCheckedBefore === 0) { await page.locator('[data-testid="button-onboarding-next"]').click(); await sleep(500); }
  const stepErr = (await page.locator("fieldset").innerText()).match(/Choose|Select|at least[^\n]*/i)?.[0] ?? null;
  await pick(0); const fmtChosen = await page.locator("fieldset label").nth(0).innerText();
  // 3. Save and browse later.
  await page.locator('[data-testid="button-skip-onboarding"]').click();
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 20_000 });
  await sleep(1500);
  const p3 = await prefs();
  step("save-browse-later", { emptyStepValidation: { checkedBefore: fmtCheckedBefore, message: stepErr }, fmtChosen, status: p3.preferences?.onboardingStatus, step: p3.preferences?.onboardingStep, formats: p3.preferences?.preferredResourceTypes });
  // 4. Re-enter: lands on saved step with choices; Continue → 5; Back/Forward.
  await page.goto(`${BASE}/onboarding`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-onboarding-next"]').waitFor({ timeout: 30_000 });
  const reenter = { label: await stepLabel(), checked: await page.locator('fieldset [role="checkbox"][data-state="checked"]').count() };
  await next();
  const at5 = await stepLabel();
  await page.goBack(); await sleep(800);
  const afterBack = { label: await stepLabel(), url: page.url() };
  await page.goForward(); await sleep(800);
  const afterFwd = { label: await stepLabel(), url: page.url() };
  step("reenter-back-forward", { reenter, at5, afterBack, afterFwd });
  // 5. Finish.
  await pick(0);
  await page.locator('[data-testid="button-onboarding-save"]').click();
  await sleep(2000);
  const p4 = await prefs();
  await shot(page, `V07-completed-${vpName}`);
  const completedAt = p4.preferences?.onboardingCompletedAt;
  // 6. Dismiss afterwards (same payload as Not now) must not erase completion.
  const jwt = await token(A);
  const dismiss = await call("PUT", "/api/user/preferences", { jwt, body: { ...pf(p4.preferences), onboardingStatus: "dismissed", onboardingStep: 2, expectedRevision: p4.revision } });
  const p5 = await prefs();
  step("complete-then-dismiss", { completedText: (await page.locator("main").innerText()).slice(0, 160), status: p4.preferences?.onboardingStatus, step: p4.preferences?.onboardingStep, completedAt, dismissPut: dismiss.status, after: { status: p5.preferences?.onboardingStatus, step: p5.preferences?.onboardingStep, completedAt: p5.preferences?.onboardingCompletedAt } });

  // 7. /settings: layout Curated, values, stale-tab conflict.
  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-save-learning-preferences"]').waitFor({ timeout: 30_000 });
  await page.locator('label[for="home-layout-curated"]').click();
  await sleep(1500);
  const layoutSaved = (await prefs()).homeLayout;
  const page2 = await context.newPage();
  await page2.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await page2.locator('[data-testid="button-save-learning-preferences"]').waitFor({ timeout: 30_000 });
  // tab 2: toggle a goal and save (newer)
  const goalBoxes2 = page2.locator('[data-testid="preferences-section-goals"] label');
  const newerGoal = await goalBoxes2.nth(1).innerText();
  await goalBoxes2.nth(1).click();
  await page2.locator('[data-testid="button-save-learning-preferences"]').click();
  await page2.waitForTimeout(1500);
  const t2toast = await toasts(page2);
  // tab 1 (stale): toggle a different goal and save
  await page.locator('[data-testid="preferences-section-goals"] label').nth(2).click();
  await page.locator('[data-testid="button-save-learning-preferences"]').click();
  await sleep(1500);
  const conflict = await page.locator('[data-testid="card-learning-preferences"] [role="alert"]').innerText().catch(() => null);
  const p6 = await prefs();
  await shot(page, `V07-settings-conflict-${vpName}`);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-save-learning-preferences"]').waitFor({ timeout: 30_000 });
  step("settings", { layoutSaved, tab2: { newerGoal, toast: t2toast }, tab1Conflict: conflict, serverGoals: p6.preferences?.learningGoals, revision: p6.revision });
  // Home shows curated layout.
  await page.goto(`${BASE}/?context=account`, { waitUntil: "domcontentloaded" });
  await sleep(5000);
  step("home-layout", { curatedGrid: await page.locator(".home-curated-category-grid, [class*='home-curated']").count(), indexGrid: await page.locator(".home-index-grid").count(), invitation: await card.count() });
  await shot(page, `V07-home-curated-${vpName}`);
  // 8. Server validation.
  const cur = (await prefs());
  const badCat = await call("PUT", "/api/user/preferences", { jwt, body: { ...pf(cur.preferences), preferredCategories: ["__qa_test_plan_592_no_such_category"], expectedRevision: cur.revision } });
  const incomplete = await call("PUT", "/api/user/preferences", { jwt, body: { ...pf(cur.preferences), learningGoals: [], onboardingStatus: "completed", expectedRevision: cur.revision } });
  step("server-validation", { badCategory: [badCat.status, badCat.json?.message], incompleteCompleted: [incomplete.status, incomplete.json?.message, incomplete.json?.errors] });
  out.pageErrors = page.__errors;
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  out.residue = await residue(); console.log("residue", JSON.stringify(out.residue));
  writeJson(`/tmp/v592out/V07-${vpName}.json`, out); process.exit(0);
}
