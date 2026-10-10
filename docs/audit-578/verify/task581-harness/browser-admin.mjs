// Admin step-editor browser proofs (B05, B06, B07, B08). Usage: node browser-admin.mjs <phase> <vp>
//   phase: b07 | edit | delete      vp: desktop | 390 | 402
import fs from "node:fs";
import { BASE, PREFIX, q, pool, mintUser, deleteUser } from "./lib.mjs";
import { launch, newPage, signIn } from "./browser-lib.mjs";

const [phase, vpName] = process.argv.slice(2);
const VPS = { desktop: { width: 1366, height: 900 }, 390: { width: 390, height: 844, mobile: true }, 402: { width: 402, height: 874, mobile: true } };
const vp = VPS[vpName];
const shots = "/tmp/b581shots";
const out = { phase, vp: vpName };
const T = Date.now();
const fx = { journey: null, resources: [], trigger: false };

const approved = (await q(`SELECT id, title FROM resources WHERE status='approved' ORDER BY id LIMIT 8`));
const stepsState = async () => q(`SELECT id, step_number, resource_id, title, description, is_optional FROM journey_steps WHERE journey_id=$1 ORDER BY step_number, id`, [fx.journey]);
const progressState = async () => q(`SELECT completed_steps, current_step_id, completed_at FROM user_journey_progress WHERE journey_id=$1`, [fx.journey]);
const shot = async (page, name, locator) => {
  const file = `${shots}/${name}-${vpName}.png`;
  await page.waitForTimeout(350);
  if (locator) await locator.screenshot({ path: file }); else await page.screenshot({ path: file });
  (out.screenshots ??= []).push(file);
  return file;
};
const toastText = async (page) => (await page.locator("li[data-state]").allInnerTexts().catch(() => [])).join(" | ");

const browser = await launch();
let user;
try {
  // Fixtures: draft QA journey, group1 = 3 rows, group2 = 2 rows, group3 = 1 row.
  const [j] = await q(`INSERT INTO learning_journeys (title, description, category, status) VALUES ($1,'QA journey for task 581','Encoding & Codecs','draft') RETURNING id`, [`${PREFIX}${phase}_${T}`]);
  fx.journey = j.id;
  const ins = async (n, rid, title) => (await q(`INSERT INTO journey_steps (journey_id, resource_id, step_number, title, description, is_optional) VALUES ($1,$2,$3,$4,$5,false) RETURNING id`, [fx.journey, rid, n, `${PREFIX}${title}`, `${PREFIX}${title} description`]))[0].id;
  const a = [await ins(1, approved[0].id, "group1"), await ins(1, approved[1].id, "group1"), await ins(1, approved[2].id, "group1")];
  const b = [await ins(2, approved[3].id, "group2"), await ins(2, approved[4].id, "group2")];
  const c = [await ins(3, approved[5].id, "group3")];
  out.fixtureRows = { a, b, c };

  user = await mintUser(`adm_${phase}`);
  const { page, context } = await newPage(browser, vp);
  await signIn(page, user, "/journeys");
  for (let i = 0; ; i++) {
    const upd = await q(`UPDATE users SET role='admin' WHERE id=$1 RETURNING id`, [user.bridgeId]);
    if (upd.length) break;
    if (i > 40) throw new Error("local user row never provisioned");
    await page.evaluate(() => fetch("/api/auth/user", { credentials: "include" }).then((r) => r.status));
    await page.waitForTimeout(500);
  }
  if (phase === "delete") {
    await q(`INSERT INTO user_journey_progress (user_id, journey_id, current_step_id, completed_steps) VALUES ($1,$2,$3,$4::jsonb)`, [user.bridgeId, fx.journey, a[1], JSON.stringify([...a, ...b])]);
  }

  const openSteps = async () => {
    await page.goto(`${BASE}/admin/journeys`, { waitUntil: "domcontentloaded" });
    const btn = page.locator(`[data-testid="edit-steps-${fx.journey}"]`);
    await btn.waitFor({ timeout: 45_000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.locator('[data-testid="steps-dialog"]').waitFor();
  };

  if (phase === "b07") {
    // 1) Fail GET steps.
    let failSteps = true;
    await page.route(`**/api/admin/journeys/${fx.journey}/steps`, (route) =>
      failSteps && route.request().method() === "GET"
        ? route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"Service Unavailable"}' })
        : route.continue());
    await openSteps();
    const dialog = page.locator('[data-testid="steps-dialog"]');
    const alert = dialog.locator('[role="alert"]').first();
    await alert.waitFor({ timeout: 30_000 });
    out.stepsFailure = { alert: await alert.innerText(), noStepsTextShown: await dialog.getByText("No steps yet").count() };
    await shot(page, "B07-steps-load-failure", dialog);
    failSteps = false;
    await alert.getByRole("button", { name: "Retry" }).click();
    await dialog.locator(`[data-testid="step-group-${a[0]}"]`).waitFor({ timeout: 20_000 });
    out.stepsRecovered = { groups: await dialog.locator('[data-testid^="step-group-"]').count(), alertGone: (await dialog.locator('[role="alert"]').count()) === 0 };
    await shot(page, "B07-steps-after-retry", dialog);

    // 2) Fail picker GET (resource search) inside the Add-step editor, with typed input.
    let failPicker = true;
    await page.route("**/api/resources?*", (route) =>
      failPicker ? route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"Internal Server Error"}' }) : route.continue());
    await dialog.locator('[data-testid="add-step-button"]').click();
    const editor = page.locator('[data-testid="step-editor-dialog"]');
    await editor.waitFor();
    await editor.locator('[data-testid="step-title-input"]').fill(`${PREFIX}typed title survives`);
    await editor.locator('[data-testid="step-resource-toggle"]').click();
    await editor.locator('[data-testid="step-resource-search"]').fill("Streaming");
    const pAlert = editor.locator('[role="alert"]').filter({ hasText: /could not be loaded|offline/i });
    await pAlert.waitFor({ timeout: 30_000 });
    out.pickerFailure = { alert: await pAlert.innerText(), noResultsShown: await editor.getByText("No results.").count() };
    await shot(page, "B07-picker-load-failure", editor);
    failPicker = false;
    await pAlert.getByRole("button", { name: "Retry" }).click();
    await editor.locator('[data-testid^="step-resource-option-"]').first().waitFor({ timeout: 20_000 });
    out.pickerRecovered = {
      options: await editor.locator('[data-testid^="step-resource-option-"]').count(),
      titleKept: await editor.locator('[data-testid="step-title-input"]').inputValue(),
      searchKept: await editor.locator('[data-testid="step-resource-search"]').inputValue(),
    };
    await shot(page, "B07-picker-after-retry", editor);
  }

  if (phase === "edit") {
    await openSteps();
    const dialog = page.locator('[data-testid="steps-dialog"]');
    // ---- B08 single-row edit: hold PATCH, keep draft, forced 500 → inline error, then real save.
    let hold = null; let mode = "fail";
    await page.route(`**/api/admin/journeys/${fx.journey}/steps/*`, async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await new Promise((r) => { hold = r; });
      if (mode === "fail") return route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"Could not save the step — nothing was changed. Try again."}' });
      return route.continue();
    });
    await dialog.locator(`[data-testid="step-edit-${c[0]}"]`).click();
    const editor = page.locator('[data-testid="step-editor-dialog"]');
    await editor.waitFor();
    const draft = { title: `${PREFIX}edited title ${T}`, description: `${PREFIX}edited description` };
    await editor.locator('[data-testid="step-title-input"]').fill(draft.title);
    await editor.locator('[data-testid="step-description-input"]').fill(draft.description);
    await editor.locator('[data-testid="step-optional-checkbox"]').click();
    await editor.locator('[data-testid="step-resource-toggle"]').click();
    await editor.locator('[data-testid="step-resource-search"]').fill(approved[6].title.slice(0, 20));
    const opt = editor.locator(`[data-testid="step-resource-option-${approved[6].id}"]`);
    await opt.waitFor({ timeout: 20_000 });
    await opt.click();
    const readDraft = async () => ({
      title: await editor.locator('[data-testid="step-title-input"]').inputValue(),
      description: await editor.locator('[data-testid="step-description-input"]').inputValue(),
      optional: await editor.locator('[data-testid="step-optional-checkbox"]').getAttribute("data-state"),
      resource: await editor.locator('[data-testid="step-resource-selected"]').innerText().catch(() => null),
      submit: await editor.locator('[data-testid="step-editor-submit"]').innerText(),
    });
    await editor.locator('[data-testid="step-editor-submit"]').click();
    await page.waitForTimeout(1200);
    out.b08_pending = await readDraft();
    await shot(page, "B08-save-pending-draft-kept", editor);
    hold();
    const errAlert = editor.locator('p[role="alert"]');
    await errAlert.waitFor({ timeout: 15_000 });
    out.b08_afterForced500 = { ...(await readDraft()), dialogOpen: await editor.isVisible(), inlineError: await errAlert.innerText(), toasts: await toastText(page), rows: await stepsState() };
    await shot(page, "B08-forced-500-inline-error", editor);
    mode = "pass";
    await editor.locator('[data-testid="step-editor-submit"]').click();
    await page.waitForTimeout(500);
    hold();
    await editor.waitFor({ state: "hidden", timeout: 15_000 });
    out.b08_success = { rows: (await stepsState()).filter((r) => r.id === c[0]) };

    // ---- B06 stale selection: pick QA resource, delete it in DB, Save → real 400 inline, draft kept.
    const [qr] = await q(`INSERT INTO resources (title, url, description, category, status) VALUES ($1,$2,'QA resource','Encoding & Codecs','approved') RETURNING id`, [`${PREFIX}stale_pick_${T}`, `https://example.com/${PREFIX}stale_${T}`]);
    fx.resources.push(qr.id);
    await page.unroute(`**/api/admin/journeys/${fx.journey}/steps/*`);
    await dialog.locator(`[data-testid="step-edit-${c[0]}"]`).click();
    await editor.waitFor();
    await editor.locator('[data-testid="step-title-input"]').fill(`${PREFIX}stale attempt ${T}`);
    await editor.locator('[data-testid="step-resource-toggle"]').click();
    await editor.locator('[data-testid="step-resource-search"]').fill(`${PREFIX}stale_pick_${T}`);
    const qopt = editor.locator(`[data-testid="step-resource-option-${qr.id}"]`);
    await qopt.waitFor({ timeout: 20_000 });
    await qopt.click();
    await q(`DELETE FROM resources WHERE id=$1`, [qr.id]);
    const before06 = JSON.stringify(await stepsState());
    const patchResp = page.waitForResponse((r) => r.request().method() === "PATCH");
    await editor.locator('[data-testid="step-editor-submit"]').click();
    const pr = await patchResp;
    const err06 = editor.locator('p[role="alert"]');
    await err06.waitFor({ timeout: 15_000 });
    out.b06_staleSelection = { httpStatus: pr.status(), body: await pr.text(), inlineError: await err06.innerText(), draft: await readDraft(), dialogOpen: await editor.isVisible(), rowsUnchanged: JSON.stringify(await stepsState()) === before06 };
    await shot(page, "B06-stale-resource-inline-error", editor);
    // Recover: clear the stale resource and save.
    await editor.locator('[data-testid="step-resource-clear"]').click();
    await editor.locator('[data-testid="step-editor-submit"]').click();
    await editor.waitFor({ state: "hidden", timeout: 15_000 });
    out.b06_recovered = { rows: (await stepsState()).filter((r) => r.id === c[0]) };

    // ---- B08 three-row group edit with a held PATCH.
    let hold2 = null;
    await page.route(`**/api/admin/journeys/${fx.journey}/steps/*`, async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await new Promise((r) => { hold2 = r; });
      return route.continue();
    });
    await dialog.locator(`[data-testid="step-edit-${a[0]}"]`).click();
    await editor.waitFor();
    await editor.locator('[data-testid="step-title-input"]').fill(`${PREFIX}group edit ${T}`);
    await editor.locator('[data-testid="step-optional-checkbox"]').click();
    await editor.locator('[data-testid="step-editor-submit"]').click();
    await page.waitForTimeout(1200);
    out.b08_group_pending = { title: await editor.locator('[data-testid="step-title-input"]').inputValue(), optional: await editor.locator('[data-testid="step-optional-checkbox"]').getAttribute("data-state"), submit: await editor.locator('[data-testid="step-editor-submit"]').innerText() };
    await shot(page, "B08-group-save-pending", editor);
    hold2();
    await editor.waitFor({ state: "hidden", timeout: 15_000 });
    out.b08_group_saved = { rows: (await stepsState()).filter((r) => a.includes(r.id)) };
    await shot(page, "B08-after-saves-list", dialog);
  }

  if (phase === "delete") {
    // ---- Failure path: a DEV-only trigger makes deleting the THIRD row of group 1 fail
    // mid-transaction (after rows 1–2 were already deleted inside the same tx).
    await q(`CREATE OR REPLACE FUNCTION qa581_block_delete() RETURNS trigger AS $$ BEGIN IF OLD.id = ${a[2]} THEN RAISE EXCEPTION 'qa581 injected failure'; END IF; RETURN OLD; END $$ LANGUAGE plpgsql`);
    await q(`CREATE TRIGGER qa581_block_delete BEFORE DELETE ON journey_steps FOR EACH ROW EXECUTE FUNCTION qa581_block_delete()`);
    fx.trigger = true;
    out.beforeDelete = { steps: await stepsState(), progress: await progressState() };
    await openSteps();
    const dialog = page.locator('[data-testid="steps-dialog"]');
    await shot(page, "B05-before-delete", dialog);
    await dialog.locator(`[data-testid="step-delete-${a[0]}"]`).click();
    let respP = page.waitForResponse((r) => r.request().method() === "DELETE");
    await page.locator('[data-testid="confirm-delete-step"]').click();
    let resp = await respP;
    await page.locator("li[data-state]").first().waitFor({ timeout: 10_000 });
    out.failurePath = { httpStatus: resp.status(), body: await resp.text(), toast: await toastText(page), steps: await stepsState(), progress: await progressState() };
    await page.waitForTimeout(800);
    out.failurePath.uiGroups = await dialog.locator('[data-testid^="step-group-"]').count();
    await shot(page, "B05-delete-failure-group-intact");
    await q(`DROP TRIGGER IF EXISTS qa581_block_delete ON journey_steps`);
    await q(`DROP FUNCTION IF EXISTS qa581_block_delete()`);
    fx.trigger = false;
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(4000); // let toasts clear

    // ---- Success path: delete the whole group.
    await openSteps();
    await dialog.locator(`[data-testid="step-delete-${a[0]}"]`).click();
    respP = page.waitForResponse((r) => r.request().method() === "DELETE");
    await page.locator('[data-testid="confirm-delete-step"]').click();
    resp = await respP;
    await dialog.locator(`[data-testid="step-group-${a[0]}"]`).waitFor({ state: "detached", timeout: 15_000 });
    out.successPath = { httpStatus: resp.status(), steps: await stepsState(), progress: await progressState(), uiBadges: await dialog.locator('[data-testid^="step-group-"] >> .flex.flex-col.items-center >> nth=0').count() };
    out.successPath.uiGroupTitles = await dialog.locator('[data-testid^="step-group-"]').allInnerTexts();
    await shot(page, "B05-delete-success-renumbered", dialog);

    // ---- Remove resource on the referenced row (progress current pointer → b[1]).
    await q(`UPDATE user_journey_progress SET current_step_id=$1 WHERE journey_id=$2`, [b[1], fx.journey]);
    out.beforeRemove = { steps: await stepsState(), progress: await progressState() };
    await page.waitForTimeout(3000);
    await dialog.locator(`[data-testid="step-remove-resource-${b[1]}"]`).click();
    respP = page.waitForResponse((r) => r.request().method() === "DELETE");
    await page.locator('[data-testid="confirm-remove-resource"]').click();
    resp = await respP;
    await dialog.locator(`[data-testid="step-remove-resource-${b[1]}"]`).waitFor({ state: "detached", timeout: 15_000 });
    out.removeResource = { httpStatus: resp.status(), steps: await stepsState(), progress: await progressState(), toast: await toastText(page) };
    await shot(page, "B05-remove-referenced-resource", dialog);
  }
  await context.close();
} catch (e) {
  out.error = String(e?.stack ?? e);
  console.error(e);
} finally {
  if (fx.trigger) { await q(`DROP TRIGGER IF EXISTS qa581_block_delete ON journey_steps`); await q(`DROP FUNCTION IF EXISTS qa581_block_delete()`); }
  await browser.close();
  if (fx.journey) await q(`DELETE FROM learning_journeys WHERE id=$1`, [fx.journey]);
  if (fx.resources.length) await q(`DELETE FROM resources WHERE id = ANY($1)`, [fx.resources]);
  if (user) { await deleteUser(user).catch((e) => console.error("clerk delete", e)); out.cleanup = { clerkDeleted: user.clerkUserId, bridgeId: user.bridgeId, journey: fx.journey, resources: fx.resources }; }
  fs.writeFileSync(`/tmp/b581shots/browser-admin-${phase}-${vpName}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 1).slice(0, 6000));
  await pool.end();
}
