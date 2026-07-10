// WP-6 AC-6.2 / G4.6-b — focus-visible ring walk.
// Real keyboard Tab-walks (focus-visible requires keyboard focus; programmatic
// .focus() lies). Captures a clipped screenshot + computed ring styles for each
// target class. reducedMotion:'reduce' context snaps transitions so computed
// values are settled, not mid-transition.
// Usage: node _validation/phase-5/wp-6/focus-walk.mjs <anon|admin>
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "fs";

const BASE = "http://localhost:5000";
const OUT = "_validation/phase-5/focus";
const EXEC = ".cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell";
mkdirSync(OUT, { recursive: true });
const mode = process.argv[2] || "anon";
const results = [];

async function styleOf(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    return {
      tag: el.tagName.toLowerCase(),
      testid: el.getAttribute("data-testid"),
      role: el.getAttribute("role"),
      cls: (typeof el.className === "string" ? el.className : "").slice(0, 100),
      outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
      outlineOffset: cs.outlineOffset,
      boxShadow: cs.boxShadow.slice(0, 200),
      borderColor: cs.borderColor,
      accentVar: accent,
      matchesFocusVisible: el.matches(":focus-visible"),
    };
  });
}

async function shotActive(page, route, target) {
  const box = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  if (!box || box.width === 0) return false;
  const pad = 14;
  const clip = {
    x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
    width: Math.min(1280, box.width + pad * 2), height: Math.min(800, box.height + pad * 2),
  };
  await page.screenshot({ path: `${OUT}/focus-ring.${route}.${target}.png`, clip });
  return true;
}

// Land keyboard-modality focus on a specific element: focus it programmatically,
// then Shift+Tab away and Tab back — the final movement is keyboard-driven, so
// :focus-visible applies (programmatic .focus() alone does not trigger it).
async function keyboardFocus(page, selector) {
  const handle = await page.$(selector);
  if (!handle) return null;
  await handle.evaluate((el) => el.focus());
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(60);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(200);
  const ok = await handle.evaluate((el) => el === document.activeElement);
  if (!ok) {
    // fallback: one more Tab (some containers insert a focus sentinel)
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);
    if (!(await handle.evaluate((el) => el === document.activeElement))) return null;
  }
  return handle;
}

async function settle(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForFunction(() => document.body && document.body.innerText.length > 20, null, { timeout: 10000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function capture(page, route, target, selector) {
  const handle = await keyboardFocus(page, selector);
  if (!handle) { results.push({ route, target, selector, found: false }); console.log(`MISS ${route}.${target} (${selector})`); return; }
  const st = await styleOf(page);
  const shot = await shotActive(page, route, target);
  results.push({ route, target, selector, found: true, shot, style: st });
  console.log(`OK ${route}.${target} fv=${st?.matchesFocusVisible} outline="${st?.outline}" offset=${st?.outlineOffset} shadow=${(st?.boxShadow || "").slice(0, 80)}`);
}

const browser = await chromium.launch({ executablePath: EXEC, args: ["--no-sandbox"] });
const ctxOpts = { reducedMotion: "reduce", viewport: { width: 1280, height: 800 } };

if (mode === "anon") {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();

  await settle(page, BASE + "/");
  await capture(page, "home", "skip-link", "a.skip-link");
  await capture(page, "home", "sidebar-nav-row", '[data-sidebar="menu-button"]');
  await capture(page, "home", "link", "main a[href]");
  await capture(page, "home", "button", "main button:not([disabled])");

  await settle(page, BASE + "/category/encoding-codecs");
  await capture(page, "category", "input", '[data-testid="input-search-resources"]');
  await capture(page, "category", "select-trigger", '[data-testid="select-subcategory-filter"]');
  await capture(page, "category", "toggle-item", '[role="group"] button');
  await ctx.close();
} else {
  const QA_EMAIL = readFileSync("/tmp/qa_wp6_email.txt", "utf8").trim();
  const QA_PASS = readFileSync("/tmp/qa_wp6_pass.txt", "utf8").trim();
  const ctx = await browser.newContext(ctxOpts);
  const login = await ctx.request.post(BASE + "/api/auth/local/login", {
    data: { email: QA_EMAIL, password: QA_PASS }, headers: { "Content-Type": "application/json" },
  });
  if (!login.ok()) throw new Error("qa admin login failed " + login.status());
  const page = await ctx.newPage();

  await settle(page, BASE + "/admin");
  await capture(page, "admin", "tab", '[role="tab"]');

  // menu-item: open the header user dropdown with keyboard
  const trig = await page.$('[data-testid="button-user-menu"], header [data-state][aria-haspopup="menu"], [aria-haspopup="menu"]');
  if (trig) {
    await trig.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector('[role="menuitem"]', { timeout: 4000 }).catch(() => {});
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(250);
    const st = await styleOf(page);
    if (st && st.role === "menuitem") {
      const shot = await shotActive(page, "admin", "menu-item");
      results.push({ route: "admin", target: "menu-item", found: true, shot, style: st });
      console.log(`OK admin.menu-item fv=${st.matchesFocusVisible} outline="${st.outline}"`);
    } else {
      // Radix menus highlight via data-highlighted rather than focus-visible; capture highlighted item
      const hl = await page.$('[role="menuitem"][data-highlighted]');
      if (hl) {
        const box = await hl.boundingBox();
        if (box) await page.screenshot({ path: `${OUT}/focus-ring.admin.menu-item.png`, clip: { x: Math.max(0, box.x - 14), y: Math.max(0, box.y - 14), width: box.width + 28, height: box.height + 28 } });
        const info = await hl.evaluate((el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}` }; });
        results.push({ route: "admin", target: "menu-item", found: true, shot: true, style: info, note: "radix data-highlighted (roving aria-activedescendant pattern)" });
        console.log("OK admin.menu-item (data-highlighted)", JSON.stringify(info));
      } else { results.push({ route: "admin", target: "menu-item", found: false }); console.log("MISS admin.menu-item"); }
    }
    await page.keyboard.press("Escape");
  } else { results.push({ route: "admin", target: "menu-item", found: false, note: "no menu trigger" }); console.log("MISS admin.menu-item (no trigger)"); }

  await settle(page, BASE + "/submit");
  await capture(page, "submit", "textarea", "textarea:not([disabled])");
  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT}/focus-walk.${mode}.json`, JSON.stringify({ mode, results }, null, 2));
const misses = results.filter((r) => !r.found);
console.log(`DONE ${mode}: ${results.length - misses.length}/${results.length} captured${misses.length ? " MISSES: " + misses.map((m) => m.route + "." + m.target).join(", ") : ""}`);
