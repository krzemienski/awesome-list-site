// J05 browser proof: admin taxonomy managers (GenericCrudManager) after the
// useQueries / exhaustive-deps / misused-promise fixes. Real app, real admin
// (audit-key header injected same-origin only), fixtures prefixed __qa_test_plan_.
import fs from "node:fs";
import path from "node:path";
const ROOT = "/home/runner/workspace";
const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));
const BASE = "http://127.0.0.1:5000";
const KEY = process.env.ADMIN_PASSWORD;
const OUT = "/tmp/j05/shots";
fs.mkdirSync(OUT, { recursive: true });
const [CAT, SUB, SUBSUB] = process.argv.slice(2).map(Number);
const cache = path.join(ROOT, ".cache/ms-playwright");
const dir = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
const browser = await chromium.launch({ headless: true, executablePath: path.join(cache, dir, "chrome-linux64/chrome"), args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.route("**/*", (route) => {
  let same = false;
  try { same = new URL(route.request().url()).origin === BASE; } catch {}
  if (same) route.continue({ headers: { ...route.request().headers(), "x-admin-audit-key": KEY } });
  else route.continue();
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error" || /hook/i.test(m.text())) consoleErrors.push(m.text().slice(0, 300)); });
page.on("pageerror", (e) => consoleErrors.push("PAGEERROR " + e.message.slice(0, 300)));
const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(pass ? "PASS" : "FAIL", name, detail); };
const api = async (u) => (await ctx.request.get(BASE + u, { headers: { "x-admin-audit-key": KEY } })).json();

async function search(plural) {
  const more = page.locator(`[data-testid="button-more-${plural}"]`);
  if ((await more.getAttribute("aria-expanded")) !== "true") await more.click();
  await page.fill(`[data-testid="input-search-${plural}"]`, "__qa_test_plan_j05");
  await page.waitForTimeout(600);
}
async function openTab(hash, plural) {
  await page.goto(`${BASE}/admin#${hash}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`[data-testid="table-${plural}"]`, { timeout: 60000 });
  await search(plural);
}

// --- Categories: list, create dialog, edit + undo/redo (button and keyboard)
await openTab("categories", "categories");
ok("categories row visible", await page.locator(`[data-testid="row-category-${CAT}"]`).isVisible());
await page.click('[data-testid="button-create-category"]');
await page.waitForSelector('[data-testid="dialog-create-category"]');
await page.screenshot({ path: `${OUT}/01-category-create.png` });
await page.click('[data-testid="button-cancel-create"]');
await page.click(`[data-testid="button-edit-${CAT}"]`);
await page.waitForSelector('[data-testid="dialog-edit-category"]');
await page.fill('[data-testid="input-edit-name"]', "__qa_test_plan_j05 Category edited");
await page.click('[data-testid="button-confirm-edit"]');
await page.waitForSelector('[data-testid="dialog-edit-category"]', { state: "detached", timeout: 15000 });
const nameOf = async () => (await api("/api/admin/categories")).find((c) => c.id === CAT)?.name;
await page.waitForTimeout(800);
ok("category edit saved", (await nameOf()) === "__qa_test_plan_j05 Category edited", await nameOf());
ok("undo/redo controls absent (undoRedoEnabled is off in every taxonomy config)", (await page.locator('[data-testid="button-undo"]').count()) === 0);
await page.click(`[data-testid="button-edit-${CAT}"]`);
await page.waitForSelector('[data-testid="dialog-edit-category"]');
await page.fill('[data-testid="input-edit-name"]', "__qa_test_plan_j05 Category");
await page.click('[data-testid="button-confirm-edit"]');
await page.waitForSelector('[data-testid="dialog-edit-category"]', { state: "detached", timeout: 15000 });
await page.waitForTimeout(800);
ok("category renamed back via edit form", (await nameOf()) === "__qa_test_plan_j05 Category", await nameOf());
await page.screenshot({ path: `${OUT}/02-category-after-revert.png` });

// --- Subcategories: panel switch via tab click, parent options in create + edit
await page.click('[data-testid="tab-subcategories"]');
await page.waitForSelector('[data-testid="table-subcategories"]', { timeout: 30000 });
await search("subcategories");
ok("panel switch categories→subcategories", await page.locator(`[data-testid="row-subcategory-${SUB}"]`).isVisible());
const rowText = await page.locator(`[data-testid="row-subcategory-${SUB}"]`).innerText();
ok("subcategory row shows parent name (parent query data)", rowText.includes("__qa_test_plan_j05 Category"), rowText.replace(/\s+/g, " ").slice(0, 120));
await page.click('[data-testid="button-create-subcategory"]');
await page.waitForSelector('[data-testid="dialog-create-subcategory"]');
await page.click('[data-testid="select-create-category-id"]');
const opt = page.getByRole("option", { name: "__qa_test_plan_j05 Category", exact: true });
ok("create: parent category option listed", await opt.isVisible().catch(() => false));
await opt.click();
const trig = await page.locator('[data-testid="select-create-category-id"]').innerText();
ok("create: parent selection sticks", trig.includes("__qa_test_plan_j05 Category"), trig);
await page.screenshot({ path: `${OUT}/03-subcategory-create-parent.png` });
await page.click('[data-testid="button-cancel-create"]');
await page.click(`[data-testid="button-edit-${SUB}"]`);
await page.waitForSelector('[data-testid="dialog-edit-subcategory"]');
const editTrig = await page.locator('[data-testid="select-edit-category-id"]').innerText();
ok("edit: existing parent preselected", editTrig.includes("__qa_test_plan_j05 Category"), editTrig);
await page.screenshot({ path: `${OUT}/04-subcategory-edit-parent.png` });
await page.click('[data-testid="button-cancel-edit"]');

// --- Sub-subcategories: two parent queries (category + filtered subcategory)
await page.goto(`${BASE}/admin#subsubcategories`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="table-sub-subcategories"], [data-testid="table-subsubcategories"]', { timeout: 60000 });
const plural = (await page.locator('[data-testid="table-sub-subcategories"]').count()) ? "sub-subcategories" : "subsubcategories";
await search(plural);
const ssRow = page.locator(`tr[data-testid$="-${SUBSUB}"]`).first();
ok("sub-subcategories row visible", await ssRow.isVisible());
const ssText = await ssRow.innerText();
ok("sub-subcategory row shows both parents", ssText.includes("__qa_test_plan_j05 Sub") && ssText.includes("__qa_test_plan_j05 Category"), ssText.replace(/\s+/g, " ").slice(0, 160));
const createBtn = page.locator('[data-testid^="button-create-sub"]').first();
await createBtn.click();
await page.waitForSelector('[role="dialog"]');
const subTrigger = page.locator('[data-testid="select-create-subcategory-id"]');
ok("create: subcategory select disabled until category chosen", await subTrigger.isDisabled());
await page.click('[data-testid="select-create-category-id"]');
await page.getByRole("option", { name: "__qa_test_plan_j05 Category", exact: true }).click();
ok("create: subcategory select enabled after category", await subTrigger.isEnabled());
await subTrigger.click();
const subOpts = await page.getByRole("option").allInnerTexts();
ok("create: subcategory options filtered to chosen category", subOpts.length === 1 && subOpts[0] === "__qa_test_plan_j05 Sub", JSON.stringify(subOpts));
await page.getByRole("option", { name: "__qa_test_plan_j05 Sub", exact: true }).click();
await page.screenshot({ path: `${OUT}/05-subsub-create-cascade.png` });
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.click(`[data-testid="button-edit-${SUBSUB}"]`);
await page.waitForSelector('[role="dialog"]');
const eCat = await page.locator('[data-testid="select-edit-category-id"]').innerText();
const eSub = await page.locator('[data-testid="select-edit-subcategory-id"]').innerText();
ok("edit: both parents preselected", eCat.includes("__qa_test_plan_j05 Category") && eSub.includes("__qa_test_plan_j05 Sub"), `${eCat} / ${eSub}`);
await page.screenshot({ path: `${OUT}/06-subsub-edit-parents.png` });
await page.keyboard.press("Escape");

// --- Switch back and forth between panels repeatedly (hook order must hold)
for (const t of ["categories", "subcategories", "subsubcategories", "categories", "subsubcategories"]) {
  await page.goto(`${BASE}/admin#${t}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
}
const hookErrs = consoleErrors.filter((e) => /hooks|Rendered (more|fewer)/i.test(e));
ok("no hook-order errors in console", hookErrs.length === 0, JSON.stringify(hookErrs));
fs.writeFileSync("/tmp/j05/admin-browser.json", JSON.stringify({ results, consoleErrors }, null, 2));
await browser.close();
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed; console errors: ${consoleErrors.length}`);
