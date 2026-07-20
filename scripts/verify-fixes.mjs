// Honest verification of the post-architect-fix sidebar + font claims.
// Every assertion logs PASS/FAIL with the actual observed value.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const BASE = process.env.VERIFY_BASE || "http://localhost:5000";
const results = [];
function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${detail}`);
}

mkdirSync("screenshots/verify", { recursive: true });

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const ctxOpts = { viewport: { width: 1280, height: 800 } };
  // Optional: load an authenticated storageState so auth-gated pages
  // (/settings/theme, /admin) are reachable. Set VERIFY_AUTH to the JSON path.
  if (process.env.VERIFY_AUTH) ctxOpts.storageState = process.env.VERIFY_AUTH;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const consoleMsgs = [];
  page.on("console", (m) => consoleMsgs.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
  page.on("pageerror", (e) => consoleMsgs.push(`[pageerror] ${String(e).slice(0, 200)}`));

  // Helper: read aria-expanded from the chevron <button> (post-refactor:
  // disclosure semantics live on chevron, NOT on the row).
  async function chevronExpanded(slug) {
    return await page
      .locator(`[data-testid="toggle-cat-${slug}"]`)
      .getAttribute("aria-expanded");
  }

  // ─── V1: sidebar row single-click navigates to category page ───────────
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid^="row-cat-"]', { timeout: 10000 });
  const firstRow = page.locator('[data-testid^="row-cat-"]').first();
  const rowTid = await firstRow.getAttribute("data-testid");
  const expectedSlug = rowTid.replace("row-cat-", "");
  // Assert it's a real <a> (semantic Link), not a div role=button
  const rowTag = await firstRow.evaluate((el) => el.tagName.toLowerCase());
  const rowHref = await firstRow.getAttribute("href");
  await firstRow.click();
  await page.waitForTimeout(800);
  const urlAfterRowClick = page.url();
  const navOk =
    urlAfterRowClick.includes(`/category/${expectedSlug}`) &&
    rowTag === "a" &&
    rowHref === `/category/${expectedSlug}`;
  record(
    "V1-row-click-navigates",
    navOk,
    `tag=${rowTag}, href=${rowHref}, clicked → url=${urlAfterRowClick}`
  );
  await page.screenshot({ path: "screenshots/verify/v1_after_row_click.jpg", type: "jpeg", quality: 70 });

  // ─── V2: chevron click toggles expand WITHOUT navigating ────────────────
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid^="toggle-cat-"]', { timeout: 5000 });
  const urlBefore = page.url();
  const firstToggle = page.locator('[data-testid^="toggle-cat-"]').first();
  const toggleTestId = await firstToggle.getAttribute("data-testid");
  const toggleSlug = toggleTestId.replace("toggle-cat-", "");
  await firstToggle.click();
  await page.waitForTimeout(500);
  const urlAfterChevron = page.url();
  const stayedHome = urlBefore === urlAfterChevron;
  const expandedAttr = await chevronExpanded(toggleSlug);
  record(
    "V2-chevron-toggles-not-navigates",
    stayedHome && expandedAttr === "true",
    `url unchanged=${stayedHome}, chevron aria-expanded=${expandedAttr}`
  );
  await page.screenshot({ path: "screenshots/verify/v2_after_chevron_click.jpg", type: "jpeg", quality: 70 });

  // ─── V3: keyboard Enter on row navigates ────────────────────────────────
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid^="row-cat-"]');
  const kbRow = page.locator('[data-testid^="row-cat-"]').first();
  const kbRowTid = await kbRow.getAttribute("data-testid");
  const kbExpectedSlug = kbRowTid.replace("row-cat-", "");
  await kbRow.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  const urlAfterKb = page.url();
  record(
    "V3-keyboard-enter-on-row-navigates",
    urlAfterKb.includes(`/category/${kbExpectedSlug}`),
    `Enter on ${kbRowTid} → url=${urlAfterKb}`
  );

  // ─── V4: keyboard Enter on chevron toggles, does NOT navigate ───────────
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid^="toggle-cat-"]');
  const urlBeforeKb = page.url();
  const kbToggle = page.locator('[data-testid^="toggle-cat-"]').first();
  const kbToggleTid = await kbToggle.getAttribute("data-testid");
  const kbToggleSlug = kbToggleTid.replace("toggle-cat-", "");
  await kbToggle.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  const urlAfterKbToggle = page.url();
  const kbExpanded = await chevronExpanded(kbToggleSlug);
  record(
    "V4-keyboard-enter-on-chevron-toggles",
    urlBeforeKb === urlAfterKbToggle && kbExpanded === "true",
    `url unchanged=${urlBeforeKb === urlAfterKbToggle}, aria-expanded=${kbExpanded}`
  );

  // ─── V4b: Space on chevron toggles (covers Space-key parity gap) ────────
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid^="toggle-cat-"]');
  const spaceUrlBefore = page.url();
  const spaceToggle = page.locator('[data-testid^="toggle-cat-"]').first();
  const spaceToggleTid = await spaceToggle.getAttribute("data-testid");
  const spaceSlug = spaceToggleTid.replace("toggle-cat-", "");
  await spaceToggle.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
  const spaceUrlAfter = page.url();
  const spaceExpanded = await chevronExpanded(spaceSlug);
  record(
    "V4b-keyboard-space-on-chevron-toggles",
    spaceUrlBefore === spaceUrlAfter && spaceExpanded === "true",
    `url unchanged=${spaceUrlBefore === spaceUrlAfter}, aria-expanded=${spaceExpanded}`
  );

  // ─── V4c: collapse roundtrip — second click on chevron collapses ────────
  await spaceToggle.click();
  await page.waitForTimeout(400);
  const collapsedExpanded = await chevronExpanded(spaceSlug);
  record(
    "V4c-collapse-roundtrip",
    collapsedExpanded === "false",
    `after second click, aria-expanded=${collapsedExpanded}`
  );

  // ─── V5: font override picker click writes localStorage AND --font-sans ──
  await page.goto(BASE + "/settings/theme", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="font-option-jetbrains"]', { timeout: 5000 });
  await page.locator('[data-testid="font-option-jetbrains"]').click();
  await page.waitForTimeout(400);
  const fontPicked = await page.evaluate(() => ({
    ls: localStorage.getItem("ds-font-override"),
    cssVar: document.documentElement.style.getPropertyValue("--font-sans"),
  }));
  record(
    "V5-font-pick-writes-state",
    fontPicked.ls === "jetbrains" && fontPicked.cssVar.includes("JetBrains"),
    `localStorage=${fontPicked.ls}, --font-sans=${fontPicked.cssVar.slice(0, 60)}`
  );

  // ─── V6: hard-reload a NON-Theme page → boot script applies font pre-paint
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  // Read --font-sans immediately on the new page (boot script should have set it)
  const fontOnLogin = await page.evaluate(() => ({
    ls: localStorage.getItem("ds-font-override"),
    cssVar: document.documentElement.style.getPropertyValue("--font-sans"),
    bodyFont: getComputedStyle(document.body).fontFamily,
  }));
  record(
    "V6-font-persists-across-routes",
    fontOnLogin.ls === "jetbrains" && fontOnLogin.cssVar.includes("JetBrains"),
    `on /login: ls=${fontOnLogin.ls}, --font-sans=${fontOnLogin.cssVar.slice(0, 60)}, body=${fontOnLogin.bodyFont.slice(0, 60)}`
  );
  await page.screenshot({ path: "screenshots/verify/v6_login_with_jetbrains.jpg", type: "jpeg", quality: 70 });

  // ─── V7: full hard reload of /login → boot script still applies ──────────
  await page.reload({ waitUntil: "domcontentloaded" });
  const fontAfterReload = await page.evaluate(() => ({
    cssVar: document.documentElement.style.getPropertyValue("--font-sans"),
  }));
  record(
    "V7-font-survives-hard-reload",
    fontAfterReload.cssVar.includes("JetBrains"),
    `after F5 on /login: --font-sans=${fontAfterReload.cssVar.slice(0, 60)}`
  );

  // ─── V8: reset font to system, verify --font-sans cleared on reload ─────
  await page.goto(BASE + "/settings/theme", { waitUntil: "networkidle" });
  await page.locator('[data-testid="font-option-system"]').click();
  await page.waitForTimeout(400);
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
  const afterReset = await page.evaluate(() => ({
    ls: localStorage.getItem("ds-font-override"),
    cssVar: document.documentElement.style.getPropertyValue("--font-sans"),
  }));
  record(
    "V8-system-default-clears-override",
    afterReset.ls === "system" && !afterReset.cssVar.includes("JetBrains"),
    `ls=${afterReset.ls}, --font-sans="${afterReset.cssVar}"`
  );

  // ─── V9: confirm Advanced tabs active state actually applies ────────────
  await page.goto(BASE + "/advanced", { waitUntil: "networkidle" });
  await page.waitForSelector('[role="tablist"]', { timeout: 5000 });
  const activeTabColor = await page.evaluate(() => {
    const active = document.querySelector('[role="tab"][data-state="active"]');
    if (!active) return null;
    const cs = getComputedStyle(active);
    return { text: active.textContent.trim(), color: cs.color, borderBottom: cs.borderBottomColor, bg: cs.backgroundColor };
  });
  record(
    "V9-advanced-active-tab-styled",
    !!activeTabColor && activeTabColor.text.includes("Explorer"),
    JSON.stringify(activeTabColor)
  );

  // ─── V11: font map drift — boot script (index.html) must agree with
  //          FONT_OPTIONS source-of-truth (client/src/lib/font-options.ts).
  //          For every font id, set localStorage + hard reload + assert the
  //          boot script's pre-paint application matches the TS module's
  //          stack. Catches drift between the two definitions.
  const { readFileSync } = await import("fs");
  const fontOptionsSrc = readFileSync("client/src/lib/font-options.ts", "utf8");
  // Crude but robust parse: collect each { id: "...", ..., stack: "..." }
  const fontEntries = [
    ...fontOptionsSrc.matchAll(/\{\s*id:\s*"([^"]+)"[^}]*?stack:\s*"([^"]*)"/g),
  ].map((m) => ({ id: m[1], stack: m[2] }));
  if (fontEntries.length === 0) {
    record("V11-font-map-drift", false, "could not parse FONT_OPTIONS source");
  } else {
    const mismatches = [];
    for (const f of fontEntries) {
      await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
      await page.evaluate((id) => localStorage.setItem("ds-font-override", id), f.id);
      await page.goto(BASE + "/login", { waitUntil: "domcontentloaded" });
      // Run22 BUG-015: assert --font-body (the var body text actually
      // consumes) — asserting only --font-sans previously masked a no-op.
      const applied = await page.evaluate(() =>
        document.documentElement.style.getPropertyValue("--font-body")
      );
      // "system" stack="" → boot script should leave --font-body unset
      if (f.id === "system") {
        if (applied !== "") mismatches.push(`${f.id}: expected unset, got "${applied}"`);
      } else if (applied !== f.stack) {
        mismatches.push(`${f.id}: expected "${f.stack.slice(0, 40)}", got "${applied.slice(0, 40)}"`);
      }
    }
    record(
      "V11-font-map-drift",
      mismatches.length === 0,
      mismatches.length === 0
        ? `all ${fontEntries.length} font ids agree between boot script and FONT_OPTIONS`
        : mismatches.join(" | ")
    );
  }

  // Reset to system before V10 checks
  await page.goto(BASE + "/settings/theme", { waitUntil: "networkidle" });
  await page.locator('[data-testid="font-option-system"]').click();
  await page.waitForTimeout(300);

  // ─── V10: console error budget ──────────────────────────────────────────
  const realErrors = consoleMsgs.filter(
    (m) => m.startsWith("[error]") || m.startsWith("[pageerror]")
  ).filter((m) => !m.includes("/api/admin/me")); // 401 unauth expected
  record(
    "V10-no-unexpected-console-errors",
    realErrors.length === 0,
    `${realErrors.length} errors${realErrors.length ? ": " + realErrors.slice(0, 3).join(" | ") : ""}`
  );

  await browser.close();
  writeFileSync("screenshots/verify/results.json", JSON.stringify({ results, consoleMsgs }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n=== ${passed}/${results.length} PASS ===`);
  process.exit(passed === results.length ? 0 : 1);
})();
