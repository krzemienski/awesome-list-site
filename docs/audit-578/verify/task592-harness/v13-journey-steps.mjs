// V13 — /admin/journeys StepEditor: add (empty journey), HTTP error with draft preservation, edit
// (single + three-row shared fields), publish → public content, step-up/step-down on a grouped card with
// boundary/focus/persistence, confirm-remove-resource with a progress pointer, confirm-delete-step on a
// three-row group with progress on the middle row. Real app, real Clerk admin session, owned fixtures only.
import { BASE, q, mintUser, ensureLocal, teardownAll, residue, sleep, PREFIX } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, pageFetch, VPS } from "./browser-lib.mjs";

const vp = process.argv[2] ?? "desktop";
const out = { started: new Date().toISOString(), vp, steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1500)); };
const focused = (page) => page.evaluate(() => { const a = document.activeElement; return a?.getAttribute("data-testid") || a?.getAttribute("aria-label") || a?.tagName; });
const T = `${PREFIX}v13_${vp}_${Date.now()}`;
const browser = await launch();
const journeyIds = [], resourceIds = [];
try {
  const ADM = await mintUser("v13adm"); await ensureLocal(ADM);
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);
  const P = await mintUser("v13prog"); await ensureLocal(P);
  const cat = (await q(`SELECT name FROM categories ORDER BY id LIMIT 1`))[0].name;
  for (let i = 1; i <= 4; i++) {
    const [r] = await q(`INSERT INTO resources (title, url, description, category, status) VALUES ($1,$2,'V13 QA fixture; safe to delete.',$3,'approved') RETURNING id`,
      [`${T} res${i}`, `https://example.com/${T}-r${i}`, cat]);
    resourceIds.push(r.id);
  }
  const [r1, r2, r3, r4] = resourceIds;
  const mkJourney = async (suffix, status) => {
    const [j] = await q(`INSERT INTO learning_journeys (title, description, category, status) VALUES ($1,'V13 QA journey; safe to delete.',$2,$3) RETURNING id`, [`${T} ${suffix}`, cat, status]);
    journeyIds.push(j.id); return j.id;
  };
  const addRow = async (jid, rid, n, title) => (await q(`INSERT INTO journey_steps (journey_id, resource_id, step_number, title, description) VALUES ($1,$2,$3,$4,'seeded') RETURNING id`, [jid, rid, n, title]))[0].id;
  const J1 = await mkJourney("J1 empty draft", "draft");
  const J2 = await mkJourney("J2 grouped", "published");
  const g2 = [await addRow(J2, r1, 1, "Triple A"), await addRow(J2, r2, 1, "Triple A"), await addRow(J2, r3, 1, "Triple A")];
  const s2 = await addRow(J2, r4, 2, "Single B");
  const J3 = await mkJourney("J3 delete", "published");
  const g3 = [await addRow(J3, r1, 1, "Del triple"), await addRow(J3, r2, 1, "Del triple"), await addRow(J3, r3, 1, "Del triple")];
  const s3 = await addRow(J3, r4, 2, "Del single");
  // Progress pointers: J2 current = middle row of the triple (target of remove-resource);
  // J3 current = middle row of the triple, completed = first + middle (target of delete-group).
  await q(`INSERT INTO user_journey_progress (user_id, journey_id, current_step_id, completed_steps) VALUES ($1,$2,$3,$4::jsonb)`, [P.bridgeId, J2, g2[1], JSON.stringify([g2[0], g2[1]])]);
  await q(`INSERT INTO user_journey_progress (user_id, journey_id, current_step_id, completed_steps) VALUES ($1,$2,$3,$4::jsonb)`, [P.bridgeId, J3, g3[1], JSON.stringify([g3[0], g3[1]])]);
  const rows = async (jid) => q(`SELECT id, resource_id, step_number, title, description, is_optional FROM journey_steps WHERE journey_id=$1 ORDER BY step_number, id`, [jid]);
  const prog = async (jid) => (await q(`SELECT current_step_id, completed_steps, completed_at FROM user_journey_progress WHERE user_id=$1 AND journey_id=$2`, [P.bridgeId, jid]))[0];
  step("fixtures", { J1, J2, J3, resources: resourceIds, g2, s2, g3, s3 });

  const { page } = await newPage(browser, VPS[vp]);
  await signIn(page, ADM, "/admin/journeys");
  await page.goto(`${BASE}/admin/journeys`, { waitUntil: "domcontentloaded" });
  const openSteps = async (jid) => {
    await page.locator(`[data-testid="edit-steps-${jid}"]`).waitFor({ timeout: 30_000 });
    await page.locator(`[data-testid="edit-steps-${jid}"]`).click();
    await page.locator('[data-testid="steps-dialog"]').waitFor();
    await page.locator('[data-testid="add-step-button"]:not([disabled])').waitFor({ timeout: 15_000 });
  };
  const closeSteps = async () => { await page.locator('[data-testid="steps-dialog"]').getByRole("button", { name: "Close" }).last().click(); await page.locator('[data-testid="steps-dialog"]').waitFor({ state: "detached" }); };
  const groupOrder = () => page.locator('[data-testid="steps-dialog"] [data-testid^="step-group-"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid").replace("step-group-", "")));
  const rowBadge = (jid) => page.locator(`[data-testid="journey-row-${jid}"]`).evaluate((e) => e.textContent).then((t) => (t.match(/(\d+)\s*steps/) || [null, t])[1]);
  const pickResource = async (rid) => {
    const search = page.locator('[data-testid="step-resource-search"]');
    if (!(await search.isVisible().catch(() => false))) await page.locator('[data-testid="step-resource-toggle"]').click();
    await search.fill(`${T} res`);
    await page.locator(`[data-testid="step-resource-option-${rid}"]`).click({ timeout: 20_000 });
    await page.locator('[data-testid="step-resource-selected"]').waitFor();
  };
  const waitToast = async (re) => { for (let i = 0; i < 40; i++) { const t = await toasts(page); if (re.test(t)) return t; await sleep(250); } return await toasts(page); };

  // ---- A. Empty draft journey: add-step-button ×2, HTTP error with draft preserved, edit, publish, delete.
  await openSteps(J1);
  const emptyText = await page.locator('[data-testid="steps-dialog"]').innerText();
  step("A0-empty", { emptyStateShown: /No steps yet/.test(emptyText), listBadgeBefore: await rowBadge(J1) });
  await page.locator('[data-testid="add-step-button"]').click();
  await page.locator('[data-testid="step-editor-dialog"]').waitFor();
  await page.locator('[data-testid="step-title-input"]').fill(`${T} step one`);
  await page.locator('[data-testid="step-description-input"]').fill("First QA step description");
  await pickResource(r1);
  await shot(page, `V13-add-editor-${vp}`);
  await page.locator('[data-testid="step-editor-submit"]').click();
  const tAdd = await waitToast(/Step added/);
  await page.locator('[data-testid="step-editor-dialog"]').waitFor({ state: "detached" });
  await sleep(800);
  step("A1-add-first", { toast: tAdd, groups: await groupOrder(), listBadge: await rowBadge(J1), focus: await focused(page), sql: await rows(J1) });
  await shot(page, `V13-after-add-${vp}`);

  // Second step with a real server 400 in between (picked resource goes non-approved before submit).
  await page.locator('[data-testid="add-step-button"]').click();
  await page.locator('[data-testid="step-editor-dialog"]').waitFor();
  await page.locator('[data-testid="step-title-input"]').fill(`${T} step two`);
  await page.locator('[data-testid="step-description-input"]').fill("Draft text that must survive an error");
  await pickResource(r4);
  await q(`UPDATE resources SET status='pending' WHERE id=$1`, [r4]);
  const postResp = page.waitForResponse((r) => r.url().endsWith(`/api/admin/journeys/${J1}/steps`) && r.request().method() === "POST");
  await page.locator('[data-testid="step-editor-submit"]').click();
  const pr = await postResp;
  await page.locator('[data-testid="step-editor-dialog"] [role="alert"]').waitFor({ timeout: 10_000 });
  const errState = {
    httpStatus: pr.status(),
    alert: await page.locator('[data-testid="step-editor-dialog"] [role="alert"]').innerText(),
    title: await page.locator('[data-testid="step-title-input"]').inputValue(),
    description: await page.locator('[data-testid="step-description-input"]').inputValue(),
    resourceStillSelected: await page.locator('[data-testid="step-resource-selected"]').isVisible(),
    sqlRowCount: (await rows(J1)).length,
  };
  await shot(page, `V13-add-error-draft-${vp}`);
  step("A2-http-error", errState);
  await q(`UPDATE resources SET status='approved' WHERE id=$1`, [r4]);
  await page.locator('[data-testid="step-editor-submit"]').click();
  const tAdd2 = await waitToast(/Step added/);
  await page.locator('[data-testid="step-editor-dialog"]').waitFor({ state: "detached" });
  await sleep(800);
  const a3rows = await rows(J1);
  step("A3-add-second-after-recovery", { toast: tAdd2, groups: await groupOrder(), listBadge: await rowBadge(J1), focus: await focused(page), stepNumbers: a3rows.map((r) => r.step_number), sql: a3rows });

  // Publish the owned journey through the admin API from the browser session, then read public content.
  const pub = await pageFetch(page, `/api/admin/journeys/${J1}`, { method: "PUT", body: JSON.stringify({ status: "published" }) });
  const pubGet = await pageFetch(page, `/api/journeys/${J1}`);
  step("A4-publish", { put: pub.status, status: pub.json?.status ?? pub.json?.journey?.status, publicStatus: pubGet.status, publicSteps: (pubGet.json?.steps ?? []).map((s) => [s.stepNumber, s.title, s.resourceId]) });

  // Edit step one (single-row: picker visible) and save.
  const firstId = a3rows[0].id;
  await page.locator(`[data-testid="step-edit-${firstId}"]`).click();
  await page.locator('[data-testid="step-editor-dialog"]').waitFor();
  const prefilled = await page.locator('[data-testid="step-title-input"]').inputValue();
  await page.locator('[data-testid="step-title-input"]').fill(`${T} step one EDITED`);
  await page.locator('[data-testid="step-optional-checkbox"]').click();
  await page.locator('[data-testid="step-editor-submit"]').click();
  const tSave = await waitToast(/Step saved/);
  await page.locator('[data-testid="step-editor-dialog"]').waitFor({ state: "detached" });
  await sleep(800);
  const pubAfterEdit = await pageFetch(page, `/api/journeys/${J1}`);
  step("A5-edit-single", { prefilled, toast: tSave, sql: (await rows(J1))[0], publicFirst: pubAfterEdit.json?.steps?.[0] && { title: pubAfterEdit.json.steps[0].title, isOptional: pubAfterEdit.json.steps[0].isOptional }, focus: await focused(page) });

  // Remove both steps through confirm-delete-step (no progress on J1 = empty-progress branch).
  for (const label of ["first", "second"]) {
    const order = await groupOrder();
    await page.locator(`[data-testid="step-delete-${order[0]}"]`).click();
    await page.getByRole("alertdialog").waitFor();
    await page.locator('[data-testid="confirm-delete-step"]').click();
    const tDel = await waitToast(/Step deleted/);
    await page.getByRole("alertdialog").waitFor({ state: "detached" });
    await sleep(900);
    const r = await rows(J1);
    step(`A6-delete-${label}`, { toast: tDel, groups: await groupOrder(), listBadge: await rowBadge(J1), focus: await focused(page), sqlNumbers: r.map((x) => x.step_number) });
  }
  await closeSteps();

  // ---- B. Grouped journey: shared-field edit, step-down / step-up, persistence, remove-resource with progress.
  await openSteps(J2);
  step("B0-initial", { groups: await groupOrder(), upDisabledFirst: await page.locator(`[data-testid="step-up-${g2[0]}"]`).isDisabled(), downDisabledLast: await page.locator(`[data-testid="step-down-${s2}"]`).isDisabled() });
  await page.locator(`[data-testid="step-edit-${g2[0]}"]`).click();
  await page.locator('[data-testid="step-editor-dialog"]').waitFor();
  const pickerHiddenNote = await page.locator('[data-testid="step-editor-dialog"]').innerText();
  await page.locator('[data-testid="step-title-input"]').fill("Triple A shared EDIT");
  await page.locator('[data-testid="step-description-input"]').fill("Shared description across three rows");
  await page.locator('[data-testid="step-editor-submit"]').click();
  const tGroupSave = await waitToast(/Step saved/);
  await page.locator('[data-testid="step-editor-dialog"]').waitFor({ state: "detached" });
  await sleep(800);
  step("B1-group-edit", { pickerHidden: /manage them from the step list/.test(pickerHiddenNote), toast: tGroupSave, sql: (await rows(J2)).map((r) => [r.id, r.step_number, r.title, r.description, r.resource_id]) });

  // step-down on the three-row group.
  await page.locator(`[data-testid="step-down-${g2[0]}"]`).click();
  await page.waitForFunction((id) => { const els = [...document.querySelectorAll('[data-testid="steps-dialog"] [data-testid^="step-group-"]')]; return els[1]?.getAttribute("data-testid") === `step-group-${id}`; }, g2[0], { timeout: 15_000 });
  await sleep(900);
  const focusAfterDown = await focused(page);
  await page.keyboard.press("Tab"); const focusAfterTab = await focused(page);
  const pubDown = await pageFetch(page, `/api/journeys/${J2}`);
  step("B2-step-down", {
    groups: await groupOrder(),
    downDisabledOnMovedLast: await page.locator(`[data-testid="step-down-${g2[0]}"]`).isDisabled(),
    upDisabledOnNewFirst: await page.locator(`[data-testid="step-up-${s2}"]`).isDisabled(),
    focusAfterDown, focusAfterTab,
    sql: (await rows(J2)).map((r) => [r.id, r.step_number]),
    publicOrder: (pubDown.json?.steps ?? []).map((s) => [s.id, s.stepNumber]),
  });
  await shot(page, `V13-after-step-down-${vp}`);

  // Reload: order persists.
  await page.reload({ waitUntil: "domcontentloaded" });
  await openSteps(J2);
  step("B3-reload-persist", { groups: await groupOrder() });

  // step-up on the (now second) three-row group.
  await page.locator(`[data-testid="step-up-${g2[0]}"]`).click();
  await page.waitForFunction((id) => { const els = [...document.querySelectorAll('[data-testid="steps-dialog"] [data-testid^="step-group-"]')]; return els[0]?.getAttribute("data-testid") === `step-group-${id}`; }, g2[0], { timeout: 15_000 });
  await sleep(900);
  const pubUp = await pageFetch(page, `/api/journeys/${J2}`);
  step("B4-step-up", {
    groups: await groupOrder(),
    upDisabledOnFirst: await page.locator(`[data-testid="step-up-${g2[0]}"]`).isDisabled(),
    focusAfterUp: await focused(page),
    sql: (await rows(J2)).map((r) => [r.id, r.step_number]),
    publicOrder: (pubUp.json?.steps ?? []).map((s) => [s.id, s.stepNumber]),
  });

  // Remove the middle resource (progress current_step_id points at it): cancel first, then confirm.
  const chipsBefore = await page.locator(`[data-testid="step-group-${g2[0]}"] [data-testid^="step-resource-link-"]`).count();
  await page.locator(`[data-testid="step-remove-resource-${g2[1]}"]`).click();
  await page.getByRole("alertdialog").waitFor();
  const removeText = (await page.getByRole("alertdialog").innerText()).replace(/\s+/g, " ");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await sleep(600);
  const afterCancel = (await rows(J2)).length;
  await page.locator(`[data-testid="step-remove-resource-${g2[1]}"]`).click();
  await page.getByRole("alertdialog").waitFor();
  await shot(page, `V13-remove-resource-confirm-${vp}`);
  await page.locator('[data-testid="confirm-remove-resource"]').click();
  const tRem = await waitToast(/Resource removed/);
  await page.getByRole("alertdialog").waitFor({ state: "detached" });
  await sleep(900);
  const b5 = await rows(J2);
  step("B5-remove-resource", {
    removeText, rowsAfterCancel: afterCancel, toast: tRem, chipsBefore,
    chipsAfter: await page.locator(`[data-testid="step-group-${g2[0]}"] [data-testid^="step-resource-link-"]`).count(),
    logicalGroups: (await groupOrder()).length, listBadge: await rowBadge(J2), focus: await focused(page),
    sql: b5.map((r) => [r.id, r.resource_id, r.step_number]),
    resourceStillExists: (await q(`SELECT count(*)::int c FROM resources WHERE id=$1`, [r2]))[0].c,
    progress: await prog(J2),
  });
  await shot(page, `V13-after-remove-resource-${vp}`);
  await closeSteps();

  // ---- C. Delete a three-row group with progress on its middle row.
  await openSteps(J3);
  await page.locator(`[data-testid="step-delete-${g3[0]}"]`).click();
  await page.getByRole("alertdialog").waitFor();
  const delText = (await page.getByRole("alertdialog").innerText()).replace(/\s+/g, " ");
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
  await sleep(600);
  const c0 = (await rows(J3)).length;
  await page.locator(`[data-testid="step-delete-${g3[0]}"]`).click();
  await page.getByRole("alertdialog").waitFor();
  await shot(page, `V13-delete-group-confirm-${vp}`);
  await page.locator('[data-testid="confirm-delete-step"]').click();
  const tDelG = await waitToast(/Step deleted|Could not delete/);
  await page.getByRole("alertdialog").waitFor({ state: "detached" });
  await sleep(900);
  step("C1-delete-group-with-progress", {
    delText, rowsAfterCancel: c0, toast: tDelG, groups: await groupOrder(),
    badge: await page.locator(`[data-testid="step-group-${s3}"] .badge, [data-testid="step-group-${s3}"] [class*="badge"]`).first().innerText().catch(() => null),
    listBadge: await rowBadge(J3), focus: await focused(page),
    sql: (await rows(J3)).map((r) => [r.id, r.step_number]),
    progress: await prog(J3),
  });
  await shot(page, `V13-after-delete-group-${vp}`);
  await closeSteps();
  step("page-errors", { errors: page.__errors });
} catch (e) {
  step("ERROR", { message: String(e.stack || e).slice(0, 1500) });
} finally {
  await browser.close().catch(() => {});
  if (journeyIds.length) {
    await q(`DELETE FROM user_journey_progress WHERE journey_id = ANY($1::int[])`, [journeyIds]);
    await q(`DELETE FROM journey_steps WHERE journey_id = ANY($1::int[])`, [journeyIds]);
    await q(`DELETE FROM learning_journeys WHERE id = ANY($1::int[])`, [journeyIds]);
  }
  if (resourceIds.length) {
    await q(`DELETE FROM resource_audit_log WHERE resource_id = ANY($1::int[])`, [resourceIds]).catch(() => {});
    await q(`DELETE FROM resources WHERE id = ANY($1::int[])`, [resourceIds]);
  }
  await teardownAll();
  out.residue = await residue();
  out.journeyStepResidue = (await q(`SELECT count(*)::int c FROM journey_steps WHERE title LIKE $1`, [`${PREFIX.replace(/_/g, "\\_")}%`]))[0].c;
  step("residue", { residue: out.residue, journeyStepResidue: out.journeyStepResidue });
  const fs = await import("node:fs");
  fs.mkdirSync("/tmp/v592out", { recursive: true });
  fs.writeFileSync(`/tmp/v592out/v13-${vp}.json`, JSON.stringify(out, null, 2));
  process.exit(0);
}
