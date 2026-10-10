// B04: rapid clicks across different steps on /journey/7 (signed in), desktop + 390px.
import fs from "node:fs";
import { BASE, q, pool, mintUser, deleteUser } from "./lib.mjs";
import { launch, newPage, signIn } from "./browser-lib.mjs";

const shots = process.env.B04_SHOTS || "/tmp/b04-shots";
const out = {};
const browser = await launch();
let user;
const stepRows = Object.fromEntries((await q(`SELECT step_number, array_agg(id ORDER BY id) ids FROM journey_steps WHERE journey_id=7 GROUP BY 1`)).map((r) => [r.step_number, r.ids]));
const dbCompletedGroups = async () => {
  const [p] = await q(`SELECT completed_steps FROM user_journey_progress WHERE user_id=$1 AND journey_id=7`, [user.bridgeId]);
  const done = new Set((p?.completed_steps ?? []).map(Number));
  return Object.entries(stepRows).filter(([, ids]) => ids.every((i) => done.has(i))).map(([n]) => Number(n));
};
const uiCompleted = async (page) => (await page.locator('[data-testid^="button-uncomplete-step-"]').evaluateAll((els) => els.map((e) => Number(e.dataset.testid.split("-").pop())))).sort();

try {
  user = await mintUser("b04");
  for (const vp of [{ name: "desktop", width: 1366, height: 900 }, { name: "390", width: 390, height: 844, mobile: true }]) {
    const r = {};
    const { page, context } = await newPage(browser, vp);
    await signIn(page, user, "/journey/7");
    await q(`DELETE FROM user_journey_progress WHERE user_id=$1`, [user.bridgeId]);
    await page.goto(`${BASE}/journey/7`, { waitUntil: "networkidle" });
    await page.locator('[data-testid="button-start-journey"]').click();
    await page.locator('[data-testid="button-complete-step-1"]').waitFor({ timeout: 20_000 });
    await page.waitForLoadState("networkidle");

    // Throttle every progress PUT by 2.5s (real server, delayed request).
    const puts = [];
    let failNext = false;
    let failStepIds = null; // fail only the PUT carrying exactly these row ids
    await page.route("**/api/journeys/7/progress", async (route) => {
      const body = route.request().postDataJSON();
      const entry = { body, startedAt: Date.now() };
      puts.push(entry);
      await new Promise((res) => setTimeout(res, 2500));
      const matchesFailStep = failStepIds && JSON.stringify(body.stepIds) === JSON.stringify(failStepIds);
      if (failNext || matchesFailStep) {
        failNext = false;
        if (matchesFailStep) failStepIds = null;
        entry.result = "forced-500";
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "forced failure" }) });
      }
      entry.result = "continued";
      return route.continue();
    });

    page.on("response", (resp) => {
      if (resp.url().endsWith("/api/journeys/7/progress") && resp.request().method() === "PUT") {
        const body = resp.request().postDataJSON();
        const e = puts.find((p) => p.result === "continued" && JSON.stringify(p.body) === JSON.stringify(body));
        if (e) e.result = resp.status();
      }
    });
    // Scenario 1: A, then B and C while A is in flight.
    for (const n of [1, 2, 3]) {
      await page.locator(`[data-testid="button-complete-step-${n}"]`).click({ force: true });
      await page.waitForTimeout(150);
    }
    r.uiImmediatelyAfterClicks = await uiCompleted(page);
    await page.waitForTimeout(9000);
    await page.waitForLoadState("networkidle");
    r.puts1 = puts.splice(0).map((p) => ({ stepIds: p.body.stepIds, completed: p.body.completed, result: p.result }));
    r.dbAfterScenario1 = await dbCompletedGroups();
    r.uiAfterScenario1 = await uiCompleted(page);
    console.log("S1", JSON.stringify(r));

    // Scenario 2: same-step toggles converge (4: on/off/on → on, 5: on/off → off).
    await page.locator('[data-testid="button-complete-step-4"]').click({ force: true });
    await page.waitForTimeout(150);
    await page.locator('[data-testid="button-complete-step-5"]').click({ force: true });
    await page.waitForTimeout(150);
    await page.locator('[data-testid="button-uncomplete-step-4"]').click({ force: true });
    await page.waitForTimeout(150);
    await page.locator('[data-testid="button-uncomplete-step-5"]').click({ force: true });
    await page.waitForTimeout(150);
    await page.locator('[data-testid="button-complete-step-4"]').click({ force: true });
    await page.waitForTimeout(12000);
    await page.waitForLoadState("networkidle");
    r.puts2 = puts.splice(0).map((p) => ({ stepIds: p.body.stepIds, completed: p.body.completed, result: p.result }));
    r.dbAfterScenario2 = await dbCompletedGroups();
    r.uiAfterScenario2 = await uiCompleted(page);
    console.log("S2", JSON.stringify(r));

    // Scenario 3: in-flight PUT fails while another step is queued → queued step still persists.
    failNext = true;
    await page.locator('[data-testid="button-complete-step-6"]').click({ force: true });
    await page.waitForTimeout(150);
    await page.locator('[data-testid="button-uncomplete-step-1"]').click({ force: true });
    await page.waitForTimeout(400);
    r.uiDuringFailure = await uiCompleted(page);
    await page.waitForTimeout(9000);
    await page.waitForLoadState("networkidle");
    r.puts3 = puts.splice(0).map((p) => ({ stepIds: p.body.stepIds, completed: p.body.completed, result: p.result }));
    r.dbAfterScenario3 = await dbCompletedGroups();
    r.uiAfterScenario3 = await uiCompleted(page);

    // Scenario 4 (review regression): A succeeds, queued B fails, and the
    // reconciling detail refetch is unavailable. B must show incomplete
    // without a reload; A stays complete.
    const before4 = await uiCompleted(page);
    const incomplete = [1, 2, 3, 4, 5, 6].filter((n) => !before4.includes(n));
    const [stepA, stepB] = incomplete;
    r.scenario4Steps = { stepA, stepB, before: before4 };
    failStepIds = stepRows[stepB].map(Number);
    let blockedDetailGets = 0;
    await page.route(/\/api\/journeys\/7(\?.*)?$/, (route) => {
      if (route.request().method() !== "GET") return route.continue();
      blockedDetailGets++;
      return route.abort("internetdisconnected");
    });
    await page.locator(`[data-testid="button-complete-step-${stepA}"]`).click({ force: true });
    await page.waitForTimeout(150);
    await page.locator(`[data-testid="button-complete-step-${stepB}"]`).click({ force: true });
    await page.waitForTimeout(400);
    r.uiDuringScenario4 = await uiCompleted(page);
    await page.waitForTimeout(9000);
    r.puts4 = puts.splice(0).map((p) => ({ stepIds: p.body.stepIds, completed: p.body.completed, result: p.result }));
    r.blockedDetailGets4 = blockedDetailGets;
    r.uiAfterScenario4NoReload = await uiCompleted(page);
    r.dbAfterScenario4 = await dbCompletedGroups();
    r.scenario4Pass =
      r.uiAfterScenario4NoReload.includes(stepA) &&
      !r.uiAfterScenario4NoReload.includes(stepB) &&
      r.dbAfterScenario4.includes(stepA) &&
      !r.dbAfterScenario4.includes(stepB);
    const s4file = `${shots}/B04-queued-failure-no-reload-${vp.name}.png`;
    r.stepCardsVisible4 = await page.locator('[data-testid^="card-step-"]').count();
    if (r.stepCardsVisible4 === 0) {
      r.pageTextScenario4 = (await page.locator("main").first().innerText().catch(() => "")).slice(0, 600);
      r.scenario4Pass = false;
    } else {
      await page.locator(`[data-testid="card-step-${stepB}"]`).scrollIntoViewIfNeeded();
    }
    await page.screenshot({ path: s4file });
    r.scenario4Screenshot = s4file;
    console.log("S4", JSON.stringify({ steps: r.scenario4Steps, during: r.uiDuringScenario4, puts: r.puts4, blocked: blockedDetailGets, ui: r.uiAfterScenario4NoReload, db: r.dbAfterScenario4, pass: r.scenario4Pass }));
    await page.unroute(/\/api\/journeys\/7(\?.*)?$/);

    await page.unroute("**/api/journeys/7/progress");
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-testid^="card-step-"]').first().waitFor();
    r.uiAfterReload = await uiCompleted(page);
    const file = `${shots}/B04-journey7-after-reload-${vp.name}.png`;
    await page.locator('[data-testid="card-step-1"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: file, fullPage: vp.name === "desktop" ? false : false });
    r.screenshot = file;
    out[vp.name] = r;
    console.log(vp.name, JSON.stringify(r, null, 1));
    await context.close();
  }
} catch (e) {
  out.error = String(e?.stack ?? e);
  console.error(e);
} finally {
  await browser.close();
  if (user) {
    await deleteUser(user).catch((e) => console.error("clerk delete", e));
    out.cleanup = { clerkDeleted: user.clerkUserId, bridgeId: user.bridgeId };
  }
  fs.writeFileSync(".cache/b581/out/browser-b04.json", JSON.stringify(out, null, 2));
  await pool.end();
}
