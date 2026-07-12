/**
 * Run4 dev verification sweep — browser-level checks for the Master Fix
 * Prompt remediation (July 12, 2026):
 *  NEW-015  search dialog shows total match count above top-15 results
 *  NEW-013  ResourceDetail "Edit in Admin" deep-links to the edit dialog
 *  NEW-004  admin Users tab has delete buttons (not for self) + confirm dialog
 *  NEW-005  /journeys shows 5 unique real descriptions (no template copy)
 *  NEW-003  approvals tab exposes Reject actions (stale-finding re-proof)
 *  NEW-012  /submit category select drives a dependent subcategory select
 *  NEW-014  screenshot of bottom-right corner (feedback badge provenance)
 *
 * Usage: node scripts/run4-verify-dev.mjs [BASE]
 * Needs dev admin creds via env: ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:5000";
const EMAIL = process.env.ADMIN_TEST_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;
const EXEC = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";

// ONLY=NEW-015,NEW-013 runs a subset (full-goto sweeps exceed the 120s shell
// budget — see run3; keep ≤4 page.goto per invocation).
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const run = (id) => !ONLY || ONLY.includes(id);

const results = [];
const ok = (id, name, pass, detail) => {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${name} — ${detail}`);
};

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

if (PASSWORD) {
  const r = await ctx.request.post(`${BASE}/api/auth/local/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!r.ok()) {
    console.error("admin login failed:", r.status(), await r.text());
    process.exit(1);
  }
}

// ---- NEW-015: search dialog total-match count ----
if (run("NEW-015")) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.locator('button[aria-label="Open search"]').click();
  await page.locator('input[placeholder="Search resources..."]').fill("codec");
  await page.waitForTimeout(700);
  const countEl = page.locator('[data-testid="search-result-count"]');
  const countText = (await countEl.textContent().catch(() => "")) || "";
  const m = countText.match(/(\d+) match/);
  const total = m ? parseInt(m[1]) : 0;
  const items = await page.locator('[role="option"]').count();
  ok("NEW-015", "search count above quick results", total > 15 && /showing top 15/.test(countText),
    `"${countText.trim()}" (options rendered incl. view-all: ${items})`);
  await page.keyboard.press("Escape");
}

// ---- NEW-013: Edit in Admin deep-link opens edit dialog ----
if (run("NEW-013")) {
  const r = await ctx.request.get(`${BASE}/api/resources?limit=1`);
  const body = await r.json();
  const res0 = body.resources[0];
  await page.goto(`${BASE}/resource/${res0.id}`, { waitUntil: "networkidle" });
  const btn = page.locator('[data-testid="button-edit-admin"]');
  const visible = await btn.isVisible().catch(() => false);
  if (!visible) {
    ok("NEW-013", "Edit-in-Admin deep-link", false, "button not visible (admin session missing?)");
  } else {
    await btn.click();
    await page.waitForURL(/\/admin\/resources/, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const dialogTitle = await page
      .locator('[role="dialog"] input#title, [role="dialog"] input[name="title"], [role="dialog"] input')
      .first()
      .inputValue()
      .catch(() => "");
    const paramStripped = !page.url().includes("resourceId=");
    ok("NEW-013", "Edit-in-Admin deep-link", dialogTitle === res0.title && paramStripped,
      `url=${page.url()} dialogTitle="${dialogTitle}" expected="${res0.title}" paramStripped=${paramStripped}`);
    await page.keyboard.press("Escape");
  }
}

// ---- NEW-004: users tab delete buttons + confirm dialog ----
if (run("NEW-004")) {
  await page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const delBtns = page.locator('[data-testid^="button-delete-user-"]');
  const nDel = await delBtns.count();
  const rows = await page.locator("table tbody tr").count();
  // self row must have no delete button: rows >= nDel and nDel === rows - 1 when self is on page
  let dialogShown = false;
  if (nDel > 0) {
    await delBtns.first().click();
    dialogShown = await page
      .locator('[role="alertdialog"]')
      .isVisible()
      .catch(() => false);
    const txt = (await page.locator('[role="alertdialog"]').textContent().catch(() => "")) || "";
    dialogShown = dialogShown && /cannot be undone/i.test(txt);
    await page.getByRole("button", { name: "Cancel" }).click().catch(() => {});
  }
  ok("NEW-004", "users tab delete + confirm dialog", nDel > 0 && nDel === rows - 1 && dialogShown,
    `rows=${rows} deleteButtons=${nDel} (self excluded) confirmDialog=${dialogShown}`);
}

// ---- NEW-005: unique journey descriptions ----
if (run("NEW-005")) {
  await page.goto(`${BASE}/journeys`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  const text = (await page.locator("main").textContent()) || "";
  const snippets = [
    "camera to a screen",
    "end-to-end streaming stack",
    "FFmpeg as a production tool",
    "hold up at scale",
    "Widevine, FairPlay, and PlayReady",
  ];
  const found = snippets.filter((s) => text.includes(s));
  const template = /Master the fundamentals|Comprehensive learning path/i.test(text);
  ok("NEW-005", "5 unique journey descriptions render", found.length === 5 && !template,
    `${found.length}/5 snippets found, templateCopyPresent=${template}`);
}

// ---- NEW-003 (stale re-proof): approvals tab has Reject actions ----
if (run("NEW-003")) {
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  const bodyText = (await page.locator("main").textContent()) || "";
  const rejectCount = await page.getByRole("button", { name: /reject/i }).count();
  const emptyState = /no pending|nothing to review|all caught up/i.test(bodyText);
  ok("NEW-003", "approvals tab exposes Reject (or empty state)", rejectCount > 0 || emptyState,
    `rejectButtons=${rejectCount} emptyState=${emptyState}`);
}

// ---- NEW-012 (stale re-proof): dependent subcategory select on /submit ----
if (run("NEW-012")) {
  await page.goto(`${BASE}/submit`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const combos = page.locator('[role="combobox"]');
  const before = await combos.count();
  // open the category select and pick the first option
  await combos.first().click();
  await page.waitForTimeout(400);
  await page.locator('[role="option"]').first().click();
  await page.waitForTimeout(600);
  const after = await page.locator('[role="combobox"]').count();
  ok("NEW-012", "submit form dependent subcategory select", after > before,
    `comboboxes before category pick=${before}, after=${after}`);
}

// ---- NEW-014: feedback badge provenance screenshot ----
if (run("NEW-014")) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "evidence/run4/new-014-bottom-right.png", clip: { x: 880, y: 500, width: 400, height: 400 } });
  const feedbackEls = await page.locator('text=/feedback/i').count();
  ok("NEW-014", "no app-rendered feedback widget", feedbackEls === 0,
    `elements matching /feedback/i in DOM: ${feedbackEls} (screenshot evidence/run4/new-014-bottom-right.png)`);
}

console.log("\npage errors:", errors.length ? errors : "none");
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
