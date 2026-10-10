// V10 — suggest-edit dialog end to end.
//  Non-admin U (free): card context on /bookmarks + /resource/:id context. Empty diff, invalid HTTPS, duplicate URL
//    (409 field error), valid submit → toast "View status" → /contributions pending row; catalog unchanged;
//    duplicate suggestion (409); API failure (network abort) → friendly toast; withdraw cancel + confirm; 390.
//  Admin A (paid, 1 call): /resource/:id → Analyze with AI → Apply AI Suggestions → submit → approve in
//    /admin (Edits tab) → catalog changes only after approval.
import { BASE, q, mintUser, ensureLocal, teardownAll, writeJson, sleep, PREFIX, residue } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, pageFetch, VPS } from "./browser-lib.mjs";

const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1500)); };
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const PAID = process.env.V10_PAID === "1";
const browser = await launch();
const resIds = [];
const editPosts = [];
try {
  const stamp = Date.now();
  const [sub] = await q(`SELECT s.name sub, c.name cat FROM subcategories s JOIN categories c ON c.id=s.category_id WHERE c.name='Encoding & Codecs' ORDER BY s.id LIMIT 1`);
  const mk = async (tag) => (await q(`INSERT INTO resources (title, url, description, category, subcategory, status, metadata)
      VALUES ($1,$2,$3,$4,$5,'approved','{"tags":["qa"]}'::jsonb) RETURNING id, title, url, description`,
    [`${PREFIX}v10 ${tag} resource`, `https://example.org/${PREFIX}v10_${tag}_${stamp}`, `QA fixture ${tag} for the suggest-edit proof.`, sub.cat, sub.sub]))[0];
  const R1 = await mk("r1"); const R2 = await mk("r2"); resIds.push(R1.id, R2.id);
  const U = await mintUser("v10user"); await ensureLocal(U);
  await q(`INSERT INTO user_bookmarks (user_id, resource_id) VALUES ($1,$2)`, [U.bridgeId, R1.id]);
  step("fixtures", { R1, R2, category: sub });

  const { context, page } = await newPage(browser, VPS.desktop);
  page.on("request", (r) => { if (r.method() === "POST" && /\/api\/resources\/\d+\/edits/.test(r.url())) editPosts.push({ at: new Date().toISOString(), url: r.url().replace(/^https?:\/\/[^/]+/, "") }); });
  await signIn(page, U, "/bookmarks");
  await page.goto(`${BASE}/bookmarks`, { waitUntil: "domcontentloaded" });
  const cardBtn = page.locator(`[data-testid="button-suggest-edit-${R1.id}"]`);
  await cardBtn.waitFor({ timeout: 30_000 });
  await cardBtn.click();
  const dlg = page.getByRole("dialog");
  await page.locator('[data-testid="input-edit-title"]').waitFor({ timeout: 20_000 });
  const analyzeVisibleForUser = await page.locator('[data-testid="button-analyze-ai"]').count();
  await shot(page, "V10-card-dialog-desktop");
  // Empty diff.
  const p0 = editPosts.length;
  await page.locator('[data-testid="button-submit-edit"]').click(); await sleep(1200);
  const emptyToast = await toasts(page);
  step("empty-diff", { analyzeButtonForNonAdmin: analyzeVisibleForUser, toast: emptyToast, postsSent: editPosts.length - p0 });
  // Invalid HTTPS.
  await page.locator('[data-testid="input-edit-url"]').fill(`http://example.org/${PREFIX}v10_plainhttp`);
  await page.locator('[data-testid="button-submit-edit"]').click(); await sleep(800);
  const httpsError = await dlg.locator('[id$="-form-item-message"], p.text-destructive, [role="alert"]').allInnerTexts();
  step("invalid-https", { fieldErrors: httpsError, postsSent: editPosts.length - p0 });
  // Duplicate URL (R2's URL) → 409 field error.
  await page.locator('[data-testid="input-edit-url"]').fill(R2.url);
  let r = page.waitForResponse((x) => /\/api\/resources\/\d+\/edits/.test(x.url()) && x.request().method() === "POST");
  await page.locator('[data-testid="button-submit-edit"]').click();
  const dupUrl = await r; await sleep(800);
  const dupUrlErr = await dlg.locator('[id$="-form-item-message"]').allInnerTexts();
  await shot(page, "V10-duplicate-url-desktop");
  step("duplicate-url", { status: dupUrl.status(), body: await dupUrl.json().catch(() => null), fieldErrors: dupUrlErr, dialogStillOpen: await dlg.isVisible() });
  // Valid change (description only).
  await page.locator('[data-testid="input-edit-url"]').fill(R1.url);
  const newDesc = `QA fixture r1 — improved description proposed by a contributor (${stamp}).`;
  await page.locator('[data-testid="input-edit-description"]').fill(newDesc);
  r = page.waitForResponse((x) => /\/api\/resources\/\d+\/edits/.test(x.url()) && x.request().method() === "POST");
  await page.locator('[data-testid="button-submit-edit"]').click();
  const created = await r; const editBody = await created.json().catch(() => null); await sleep(900);
  const okToast = await toasts(page);
  await shot(page, "V10-submitted-toast-desktop");
  const catalogAfterSubmit = (await pageFetch(page, `/api/resources/${R1.id}`)).json;
  step("valid-submit", { status: created.status(), editId: editBody?.id, proposedChanges: editBody?.proposedChanges, toast: okToast,
    catalogDescriptionUnchanged: catalogAfterSubmit?.description === R1.description });
  // Toast → View status.
  await page.locator("li[data-state]").getByRole("button", { name: /View status/ }).first().click();
  await page.waitForURL(/\/contributions/, { timeout: 15_000 });
  const row = page.locator(`[data-testid="contribution-edit-${editBody.id}"]`);
  await row.waitFor({ timeout: 20_000 });
  const rowText = (await row.innerText()).replace(/\s+/g, " ").slice(0, 300);
  await shot(page, "V10-contributions-pending-desktop");
  step("view-status", { url: page.url().replace(BASE, ""), row: rowText });
  // Duplicate suggestion from /resource/:id.
  await page.goto(`${BASE}/resource/${R1.id}`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="button-suggest-edit"]').first().click();
  await page.locator('[data-testid="input-edit-description"]').waitFor({ timeout: 20_000 });
  await page.locator('[data-testid="input-edit-description"]').fill(newDesc);
  r = page.waitForResponse((x) => /\/api\/resources\/\d+\/edits/.test(x.url()) && x.request().method() === "POST");
  await page.locator('[data-testid="button-submit-edit"]').click();
  const dupSug = await r; await sleep(1000);
  const dupToast = await toasts(page);
  await shot(page, "V10-duplicate-suggestion-desktop");
  step("duplicate-suggestion", { status: dupSug.status(), body: await dupSug.json().catch(() => null), toast: dupToast });
  // API failure (network layer).
  await page.route(/\/api\/resources\/\d+\/edits/, (x) => x.abort("internetdisconnected"));
  await page.locator('[data-testid="input-edit-title"]').fill(`${PREFIX}v10 r1 resource (renamed)`);
  await page.locator('[data-testid="button-submit-edit"]').click(); await sleep(1500);
  const failToast = await toasts(page);
  const failDialogOpen = await page.getByRole("dialog").isVisible();
  await shot(page, "V10-api-failure-desktop");
  await page.unroute(/\/api\/resources\/\d+\/edits/);
  const editsInDb = await q(`SELECT id, status FROM resource_edits WHERE resource_id=$1 ORDER BY id`, [R1.id]);
  step("api-failure", { toast: failToast, dialogStillOpen: failDialogOpen, editsInDb });
  await page.keyboard.press("Escape"); await sleep(500);
  // Withdraw: cancel, then confirm.
  await page.goto(`${BASE}/contributions`, { waitUntil: "domcontentloaded" });
  const wbtn = page.locator(`[data-testid="button-withdraw-edit-${editBody.id}"]`);
  await wbtn.waitFor({ timeout: 20_000 });
  await wbtn.click();
  await page.locator('[data-testid="dialog-withdraw-contribution"]').waitFor();
  await page.locator('[data-testid="dialog-withdraw-contribution"]').getByRole("button", { name: /Cancel|Keep/ }).first().click(); await sleep(600);
  const afterCancel = (await q(`SELECT status FROM resource_edits WHERE id=$1`, [editBody.id]))[0]?.status;
  await wbtn.click();
  r = page.waitForResponse((x) => /contributions/.test(x.url()) && ["POST", "DELETE", "PATCH"].includes(x.request().method()));
  await page.locator('[data-testid="button-confirm-withdraw-contribution"]').click();
  const wr = await r; await sleep(1200);
  await page.reload({ waitUntil: "domcontentloaded" });
  await row.waitFor({ timeout: 20_000 }).catch(() => {});
  const rowAfter = (await row.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
  await shot(page, "V10-withdrawn-desktop");
  step("withdraw", { afterCancel, confirm: [wr.request().method(), wr.status()], dbStatus: (await q(`SELECT status FROM resource_edits WHERE id=$1`, [editBody.id]))[0]?.status, rowAfterReload: rowAfter });
  await context.close();
  // 390 dialog.
  const { page: m } = await newPage(browser, VPS["390"]);
  await signIn(m, U, `/resource/${R1.id}`);
  await m.goto(`${BASE}/resource/${R1.id}`, { waitUntil: "domcontentloaded" });
  await m.locator('[data-testid="button-suggest-edit"]').first().click();
  await m.locator('[data-testid="input-edit-title"]').waitFor({ timeout: 20_000 });
  const mOverflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  const dlgBox = await m.getByRole("dialog").boundingBox();
  await shot(m, "V10-dialog-390");
  step("390", { horizontalOverflow: mOverflow, dialogWidth: dlgBox?.width });
  await m.close();

  // Admin: Analyze with AI → Apply → submit → approve.
  if (PAID) {
    const A = await mintUser("v10admin"); await ensureLocal(A);
    await q(`UPDATE users SET role='admin' WHERE id=$1`, [A.bridgeId]);
    const { page: a } = await newPage(browser, VPS.desktop);
    await signIn(a, A, `/resource/${R2.id}`);
    await a.goto(`${BASE}/resource/${R2.id}`, { waitUntil: "domcontentloaded" });
    await a.locator('[data-testid="button-suggest-edit"]').first().click();
    await a.locator('[data-testid="button-analyze-ai"]').waitFor({ timeout: 20_000 });
    const before = { title: await a.locator('[data-testid="input-edit-title"]').inputValue(), description: await a.locator('[data-testid="input-edit-description"]').inputValue() };
    // Analyze reads the URL field; point it at a real, fetchable page (VLC's repo) for the analysis only.
    await a.locator('[data-testid="input-edit-url"]').fill("https://github.com/videolan/vlc");
    r = a.waitForResponse((x) => x.url().includes("/api/claude/analyze"), { timeout: 120_000 });
    await a.locator('[data-testid="button-analyze-ai"]').click(); await sleep(300);
    const busy = await a.locator('[data-testid="button-analyze-ai"]').innerText();
    const an = await r; const anBody = await an.json().catch(() => null); await sleep(800);
    out.analyzeRaw = { status: an.status(), body: anBody };
    await shot(a, "V10-admin-analysis-desktop");
    await a.locator('[data-testid="button-apply-suggestions"]').click(); await sleep(800);
    await a.locator('[data-testid="input-edit-url"]').fill(R2.url);
    const applied = { title: await a.locator('[data-testid="input-edit-title"]').inputValue(), description: await a.locator('[data-testid="input-edit-description"]').inputValue() };
    await shot(a, "V10-admin-applied-desktop");
    r = a.waitForResponse((x) => /\/api\/resources\/\d+\/edits/.test(x.url()) && x.request().method() === "POST");
    await a.locator('[data-testid="button-submit-edit"]').click();
    const ac = await r; const aEdit = await ac.json().catch(() => null); await sleep(800);
    const catBefore = (await q(`SELECT title, description FROM resources WHERE id=$1`, [R2.id]))[0];
    step("admin-analyze-apply", { analyzeStatus: an.status(), busyLabel: busy, suggestion: anBody && { title: anBody.suggestedTitle, description: (anBody.suggestedDescription ?? "").slice(0, 160), confidence: anBody.confidence },
      before, applied, submit: ac.status(), editId: aEdit?.id, changedFields: Object.keys(aEdit?.proposedChanges ?? {}), catalogUnchangedBeforeApproval: catBefore.title === `${PREFIX}v10 r2 resource` });
    // Approve via the admin Edits tab.
    await a.goto(`${BASE}/admin/edits`, { waitUntil: "domcontentloaded" });
    const appr = a.locator(`[data-testid="button-approve-edit-${aEdit.id}"]`);
    await appr.waitFor({ timeout: 30_000 });
    await appr.click();
    r = a.waitForResponse((x) => x.url().includes(`/api/admin/resource-edits/${aEdit.id}/approve`));
    await a.locator('[data-testid="button-confirm-approve-edit"]').click();
    const ap = await r; await sleep(1200);
    await shot(a, "V10-admin-approved-desktop");
    const catAfter = (await q(`SELECT title, description FROM resources WHERE id=$1`, [R2.id]))[0];
    step("admin-approve", { status: ap.status(), catalogAfter: { title: catAfter.title, description: catAfter.description.slice(0, 160) },
      matchesApplied: catAfter.description === applied.description || catAfter.title === applied.title });
    await a.close();
  }
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  for (const id of resIds) {
    await q(`DELETE FROM resource_edits WHERE resource_id=$1`, [id]);
    await q(`DELETE FROM user_bookmarks WHERE resource_id=$1`, [id]);
    await q(`DELETE FROM resource_audit_log WHERE resource_id=$1`, [id]).catch(() => {});
    await q(`DELETE FROM resources WHERE id=$1`, [id]);
  }
  out.editPosts = editPosts;
  out.residue = await residue();
  out.residueByIds = (await q(`SELECT count(*)::int n FROM resources WHERE id = ANY($1::int[])`, [`{${resIds.join(",")}}`]))[0];
  console.log("residue", JSON.stringify(out.residue), JSON.stringify(out.residueByIds));
  writeJson(`/tmp/v592out/v10-edits${PAID ? "-paid" : ""}.json`, out); process.exit(0);
}
