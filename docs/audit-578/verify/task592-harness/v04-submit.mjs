// V04 — /submit validation, duplicate warning + 409, success state, draft cleared,
// own contributions timeline, cancel/confirm withdraw, reload, cross-user isolation.
import { BASE, q, mintUser, call, token, ensureLocal, teardownAll, residue, writeJson, sleep, PREFIX } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

const vpName = process.argv[2] ?? "desktop";
const out = { started: new Date().toISOString(), vp: vpName, steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1500)); };
const [existing] = await q(`SELECT url FROM resources WHERE status='approved' AND url LIKE 'https://%' ORDER BY id LIMIT 1`);
const created = [];
const browser = await launch();
try {
  const A = await mintUser("v04a"), B = await mintUser("v04b");
  const a = await ensureLocal(A); await ensureLocal(B);
  const { page } = await newPage(browser, VPS[vpName]);
  const submits = [];
  page.on("response", async (r) => { if (r.url().endsWith("/api/resources") && r.request().method() === "POST") submits.push({ status: r.status(), body: (await r.text().catch(() => "")).slice(0, 200) }); });
  await signIn(page, A, "/submit");
  await page.goto(`${BASE}/submit`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="input-title"]').waitFor({ timeout: 45_000 });
  const fieldErrors = () => page.locator('[id$="-form-item-message"]').allInnerTexts();
  // 1. Empty submit → field errors.
  await page.locator('[data-testid="button-submit"]').click();
  await sleep(600);
  step("empty-submit", { errors: await fieldErrors(), posts: submits.length });
  // 2. Invalid values.
  await page.locator('[data-testid="input-title"]').fill("<b>x</b>");
  await page.locator('[data-testid="input-url"]').fill("http://example.com/plain");
  await page.locator('[data-testid="input-description"]').fill("short");
  await page.locator('[data-testid="button-submit"]').click();
  await sleep(600);
  step("invalid-submit", { errors: await fieldErrors(), posts: submits.length });
  await shot(page, `V04-field-errors-${vpName}`);
  // 3. Valid fields + category.
  const title = `${PREFIX}v04 ${vpName} ${Date.now()}`;
  await page.locator('[data-testid="input-title"]').fill(title);
  await page.locator('[data-testid="input-description"]').fill("QA fixture for the task-592 submit round trip; safe to delete.");
  await page.locator('[data-testid="select-category"]').click();
  await page.getByRole("option").first().click();
  // 4. Duplicate (existing approved) URL → warning → server 409.
  await page.locator('[data-testid="input-url"]').fill(existing.url);
  await page.getByText("Duplicate URL Detected").waitFor({ timeout: 10_000 });
  await page.locator('[data-testid="button-submit"]').click();
  await page.waitForFunction((n) => true, null);
  await sleep(2500);
  step("duplicate", { url: existing.url, warning: true, posts: submits.slice(), toast: await toasts(page), errors: await fieldErrors() });
  await shot(page, `V04-duplicate-${vpName}`);
  // 5. Unique URL → success.
  const url = `https://example.com/${PREFIX}v04-${vpName}-${Date.now()}`;
  await page.locator('[data-testid="input-url"]').fill(url);
  await sleep(1200);
  await page.locator('[data-testid="button-submit"]').click();
  await page.getByText("Submission Successful!").waitFor({ timeout: 20_000 });
  await sleep(1200);
  const [row] = await q(`SELECT id, status, submitted_by FROM resources WHERE url=$1`, [url]);
  if (row) created.push(row.id);
  step("success", { lastPost: submits.at(-1), row, draft: await page.evaluate(() => localStorage.getItem("submit-resource-draft")), titleAfter: await page.locator('[data-testid="input-title"]').inputValue(), focused: await page.evaluate(() => document.activeElement?.getAttribute("role")) });
  await shot(page, `V04-success-${vpName}`);
  // 5b. Same URL again (now owned + pending) → duplicate warning.
  await page.locator('[data-testid="input-url"]').fill(url);
  const ownDup = await page.getByText("Duplicate URL Detected").waitFor({ timeout: 10_000 }).then(() => true, () => false);
  step("owned-duplicate-warning", { shown: ownDup, checkUrl: (await call("GET", `/api/resources/check-url?url=${encodeURIComponent(url)}`)).json });
  await page.locator('[data-testid="input-url"]').fill("");
  await sleep(1500);
  // 6. Contributions timeline.
  await page.locator('[data-testid="link-submission-contributions"]').click();
  await page.waitForURL(/\/contributions/);
  await page.locator('[data-testid="input-contributions-search"]').fill(title);
  const rowSel = `[data-testid="contribution-resource-${row.id}"]`;
  await page.locator(rowSel).waitFor({ timeout: 20_000 });
  step("timeline", { count: await page.locator('[data-testid="text-contribution-count"]').innerText().catch(() => ""), rowText: (await page.locator(rowSel).innerText()).slice(0, 300) });
  await page.locator(`[data-testid="button-withdraw-resource-${row.id}"]`).click();
  await page.locator('[data-testid="dialog-withdraw-contribution"]').waitFor();
  await page.getByRole("button", { name: "Keep pending" }).click();
  await sleep(800);
  step("withdraw-cancel", { status: (await q(`SELECT status FROM resources WHERE id=$1`, [row.id]))[0].status, focus: await page.evaluate(() => document.activeElement?.getAttribute("data-testid")) });
  await page.locator(`[data-testid="button-withdraw-resource-${row.id}"]`).click();
  await page.locator('[data-testid="button-confirm-withdraw-contribution"]').click();
  await sleep(1500);
  step("withdraw-confirm", { toast: await toasts(page), status: (await q(`SELECT status FROM resources WHERE id=$1`, [row.id]))[0].status });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="input-contributions-search"]').fill(title);
  await page.locator(rowSel).waitFor({ timeout: 20_000 });
  step("after-reload", { rowText: (await page.locator(rowSel).innerText()).slice(0, 300), withdrawButton: await page.locator(`[data-testid="button-withdraw-resource-${row.id}"]`).count() });
  await shot(page, `V04-withdrawn-${vpName}`);
  // 7. Other user B: never sees or withdraws A's row.
  const jB = await token(B);
  const bList = await call("GET", `/api/user/contributions?q=${encodeURIComponent(title)}`, { jwt: jB });
  const bWithdraw = await call("POST", `/api/user/contributions/resource/${row.id}/withdraw`, { jwt: jB });
  step("isolation", { bListStatus: bList.status, bSeesRow: JSON.stringify(bList.json).includes(String(row.id)) && JSON.stringify(bList.json).includes(title), bWithdraw: bWithdraw.status, bWithdrawBody: bWithdraw.json });
  out.pageErrors = page.__errors;
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  for (const id of created) { await q(`DELETE FROM resource_audit_log WHERE resource_id=$1`, [id]).catch(() => {}); await q(`DELETE FROM resources WHERE id=$1`, [id]); }
  await teardownAll();
  out.residue = await residue(); console.log("residue", JSON.stringify(out.residue));
  writeJson(`/tmp/v592out/V04-${vpName}.json`, out); process.exit(0);
}
