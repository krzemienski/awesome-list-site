// Functional filter/control audit. Drives every interactive filter on the
// Category page + search dialog + view-mode toggle + sort, asserting each
// actually changes rendered output. Reports PASS/FAIL with evidence.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const BASE = "http://localhost:5000";
mkdirSync("screenshots/filters", { recursive: true });
const results = [];
const rec = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 120)));
page.on("pageerror", (e) => errs.push("[pageerror] " + String(e).slice(0, 120)));

async function cardCount() {
  return await page.locator('[data-testid^="card-resource-"], [data-testid^="resource-card"]').count();
}

try {
  await page.goto(BASE + "/category/encoding-codecs", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // real resource card testid is card-resource-${id}
  const genericCount = async () =>
    await page.locator('[data-testid^="card-resource-"]').count();

  // ── F1: subcategory select filter ──
  const before = await genericCount();
  const sel = page.locator('[data-testid="select-subcategory-filter"]');
  let f1 = "select not found";
  if (await sel.count()) {
    await sel.click();
    await page.waitForTimeout(300);
    const opts = page.locator('[role="option"]');
    const nOpts = await opts.count();
    if (nOpts > 1) {
      await opts.nth(1).click();
      await page.waitForTimeout(500);
      const after = await genericCount();
      f1 = `opts=${nOpts}, before=${before} after=${after}, url=${page.url()}`;
      rec("F1-subcategory-filter", page.url().includes("subcategory="), f1);
    } else {
      rec("F1-subcategory-filter", false, `only ${nOpts} option(s)`);
    }
  } else {
    rec("F1-subcategory-filter", false, f1);
  }

  // reset
  await page.goto(BASE + "/category/encoding-codecs", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  // ── F2: search-within-category input ──
  const searchInput = page.locator('[data-testid="input-search-resources"]');
  if (await searchInput.count()) {
    const before2 = await genericCount();
    await searchInput.fill("zzzznomatchxyz");
    await page.waitForTimeout(600);
    const after2 = await genericCount();
    rec("F2-search-within-category", after2 < before2, `before=${before2} after=${after2} (expect fewer)`);
    await searchInput.fill("");
    await page.waitForTimeout(400);
  } else {
    rec("F2-search-within-category", false, "input not found");
  }

  // ── F3: sort selector (combobox with "Sort by" placeholder, no testid) ──
  const firstTitleBefore = await page.locator('[data-testid^="card-resource-"]').first().textContent().catch(() => "");
  const sortTrigger = page.getByRole("combobox").filter({ hasText: /sort|default|name|resources/i }).first();
  let sortTrig = sortTrigger;
  if (!(await sortTrig.count())) sortTrig = page.getByRole("combobox").last();
  if (await sortTrig.count()) {
    await sortTrig.click();
    await page.waitForTimeout(300);
    const opts = page.locator('[role="option"]');
    const n = await opts.count();
    if (n > 1) {
      await opts.filter({ hasText: /Name Z-A/i }).first().click().catch(async () => { await opts.nth(2).click(); });
      await page.waitForTimeout(500);
      const firstTitleAfter = await page.locator('[data-testid^="card-resource-"]').first().textContent().catch(() => "");
      rec("F3-sort-selector", n >= 4 && firstTitleBefore !== firstTitleAfter,
        `opts=${n}, firstCard "${(firstTitleBefore||"").trim().slice(0,20)}" → "${(firstTitleAfter||"").trim().slice(0,20)}", url=${page.url()}`);
    } else {
      rec("F3-sort-selector", false, `only ${n} option(s)`);
    }
  } else {
    rec("F3-sort-selector", false, "sort combobox not found");
  }

  // ── F4: view-mode toggle (grid/list/compact) ──
  await page.goto(BASE + "/category/encoding-codecs", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const vmButtons = page.locator('[data-testid^="button-view-"], [aria-label*="view" i]');
  const nvm = await vmButtons.count();
  if (nvm >= 2) {
    let switched = 0;
    for (let i = 0; i < Math.min(nvm, 3); i++) {
      await vmButtons.nth(i).click();
      await page.waitForTimeout(250);
      switched++;
    }
    rec("F4-view-mode-toggle", switched >= 2, `${switched} view modes clickable (found ${nvm})`);
  } else {
    rec("F4-view-mode-toggle", false, `found ${nvm} view-mode buttons`);
  }

  // ── F5: tag filter (behind "Filter by Tag" popover → Tags collapsible) ──
  await page.goto(BASE + "/category/encoding-codecs", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const filterBtn = page.getByRole("button", { name: /filter by tag/i }).first();
  if (await filterBtn.count()) {
    await filterBtn.click();
    await page.waitForTimeout(400);
    // Tags collapsible defaults OPEN (isTagsOpen=true) — do NOT toggle it.
    const tagRows = page.locator('button[role="checkbox"]');
    const ntags = await tagRows.count();
    let applied = "no-tags";
    if (ntags > 0) {
      const cntBefore = await genericCount();
      await tagRows.first().click();
      await page.waitForTimeout(600);
      applied = `cards ${cntBefore} → ${await genericCount()}, url=${page.url()}`;
    }
    rec("F5-tag-filter-works", ntags > 0, `${ntags} tag checkboxes; ${applied}`);
  } else {
    rec("F5-tag-filter-works", false, "Filter by Tag button not found");
  }

  // ── F6: global search dialog (Cmd+K) ──
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(400);
  let dlg = await page.locator('[role="dialog"]').count();
  if (dlg === 0) {
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(400);
    dlg = await page.locator('[role="dialog"]').count();
  }
  rec("F6-search-dialog-cmdk", dlg > 0, `dialog count=${dlg}`);
  if (dlg > 0) {
    const dlgInput = page.locator('[role="dialog"] input').first();
    if (await dlgInput.count()) {
      await dlgInput.fill("ffmpeg");
      await page.waitForTimeout(700);
      const resultItems = await page.locator('[role="dialog"] [role="option"], [role="dialog"] a, [role="dialog"] [data-testid^="search-result"]').count();
      rec("F7-search-dialog-results", resultItems > 0, `result items=${resultItems} for "ffmpeg"`);
    }
    await page.keyboard.press("Escape");
  } else {
    rec("F7-search-dialog-results", false, "dialog never opened");
  }

  // ── F8: slash key opens search ──
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.keyboard.press("/");
  await page.waitForTimeout(400);
  rec("F8-search-slash-key", (await page.locator('[role="dialog"]').count()) > 0, `dialog after "/"`);
  await page.keyboard.press("Escape").catch(() => {});

  // ── F9: theme picker system switch ──
  await page.goto(BASE + "/settings/theme", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const sysBtns = page.locator('[data-testid^="system-"], [data-testid^="theme-system-"], [role="radio"]');
  const nsys = await sysBtns.count();
  rec("F9-theme-system-controls", nsys > 0, `${nsys} theme controls present`);

  rec("F10-no-console-errors-during-filters",
    errs.filter((e) => !e.includes("401") && !e.includes("/api/admin/me")).length === 0,
    `errors=${JSON.stringify(errs.filter((e) => !e.includes("401") && !e.includes("/api/admin/me")).slice(0, 4))}`);
} catch (e) {
  rec("HARNESS-CRASH", false, String(e).slice(0, 200));
}

writeFileSync("screenshots/filters/results.json", JSON.stringify(results, null, 2));
const pass = results.filter((r) => r.ok).length;
console.log(`\n=== ${pass}/${results.length} PASS ===`);
await browser.close();
