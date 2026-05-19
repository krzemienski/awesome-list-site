import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

const BASE = "http://localhost:5000";
const VIEWPORTS = [
  { name: "400", width: 400, height: 900 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
];

const ROUTES = [
  { path: "/", slug: "home", dir: "landing" },
  { path: "/about", slug: "about", dir: "landing" },
  { path: "/login", slug: "login", dir: "landing" },
  { path: "/settings/theme", slug: "theme", dir: "landing" },
  { path: "/submit", slug: "submit", dir: "landing" },
  { path: "/not-a-real-route", slug: "notfound", dir: "landing" },
  { path: "/category/encoding-codecs", slug: "encoding-codecs", dir: "category" },
  { path: "/category/community-events", slug: "community-events", dir: "category" },
  { path: "/category/general-tools", slug: "general-tools", dir: "category" },
  { path: "/advanced", slug: "advanced", dir: "advanced-journeys" },
  { path: "/journeys", slug: "journeys", dir: "advanced-journeys" },
  { path: "/journey/6", slug: "journey-6", dir: "advanced-journeys" },
];

const argRange = process.argv[2] || "all";
const captures = [];
const consoleErrors = {};

function ensureDir(p) { mkdirSync(dirname(p), { recursive: true }); }

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      const t = msg.text();
      const url = page.url().replace(BASE, "");
      const vp = page.viewportSize();
      const key = `${url}@${vp ? vp.width : "?"}`;
      if (t.includes("data-replit-metadata") || t.includes("unique \"key\"") || t.includes("Each child in a list")) {
        (consoleErrors[key] ||= []).push(`[${msg.type()}] ${t.slice(0, 200)}`);
      }
    }
  });

  let routes = ROUTES;
  if (argRange !== "all") {
    const [s, e] = argRange.split(":").map(Number);
    routes = ROUTES.slice(s, e);
  }

  for (const route of routes) {
    for (const vp of VIEWPORTS) {
      const dest = `screenshots/audit/${route.dir}/${route.slug}_${vp.name}_after.jpg`;
      ensureDir(dest);
      try {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
        await page.waitForTimeout(400);
        await page.screenshot({ path: dest, type: "jpeg", quality: 75, fullPage: false });
        captures.push({ route: route.path, vp: vp.name, file: dest, ok: true });
        process.stdout.write(`  ✓ ${route.path} @ ${vp.width}\n`);
      } catch (e) {
        captures.push({ route: route.path, vp: vp.name, error: String(e.message || e).slice(0, 200), ok: false });
        process.stdout.write(`  ✗ ${route.path} @ ${vp.width}: ${(e.message || e).toString().slice(0, 80)}\n`);
      }
    }
  }

  // Functional click-path (only when running "all")
  let clickResults = {};
  if (argRange === "all") {
    process.stdout.write("\n=== click-path ===\n");
    const out = "evidence/functional/_after_task43/clickpath";
    mkdirSync(out, { recursive: true });
    try {
      await page.setViewportSize({ width: 1280, height: 800 });

      // theme picker
      await page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/theme_initial_after.jpg`, type: "jpeg", quality: 75 });
      clickResults.theme_radios_total = await page.locator('[role="radio"]').count();
      const activeReadout = await page.locator("text=/Active:/").first().textContent({ timeout: 2000 }).catch(() => null);
      clickResults.theme_active_readout = activeReadout;
      if (clickResults.theme_radios_total >= 8) {
        await page.locator('[role="radio"]').nth(7).click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${out}/theme_after_color_click.jpg`, type: "jpeg", quality: 75 });
      }

      // Cmd+K + "/"
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(400);
      clickResults.search_dialog_via_cmdk = (await page.locator('[role="dialog"]').count()) > 0;
      if (clickResults.search_dialog_via_cmdk) await page.screenshot({ path: `${out}/search_via_cmdk_after.jpg`, type: "jpeg", quality: 75 });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      await page.keyboard.press("/");
      await page.waitForTimeout(400);
      clickResults.search_dialog_via_slash = (await page.locator('[role="dialog"]').count()) > 0;
      if (clickResults.search_dialog_via_slash) await page.screenshot({ path: `${out}/search_via_slash_after.jpg`, type: "jpeg", quality: 75 });
      await page.keyboard.press("Escape");

      // Advanced tab cycle
      await page.goto(`${BASE}/advanced`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      clickResults.advanced_tab_count = await page.locator('[role="tab"]').count();
      if (clickResults.advanced_tab_count >= 3) {
        await page.locator('[role="tab"]').nth(2).click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${out}/advanced_tab2_clicked_after.jpg`, type: "jpeg", quality: 75 });
        clickResults.advanced_tab2_selected = await page.locator('[role="tab"][aria-selected="true"]').first().textContent({ timeout: 2000 }).catch(() => null);
      }

      // Category View Details count
      await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      clickResults.category_view_details_buttons = await page.locator('button:has-text("View Details")').count();
      await page.screenshot({ path: `${out}/category_grid_after.jpg`, type: "jpeg", quality: 75 });

      // Login wrong-creds
      await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);
      const email = page.locator('input[type="email"], input[name="email"]').first();
      const pw = page.locator('input[type="password"]').first();
      if ((await email.count()) && (await pw.count())) {
        await email.fill("nobody@nowhere.test");
        await pw.fill("wrongpass");
        await page.locator('button[type="submit"]').first().click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(2000);
        clickResults.login_wrongcreds_feedback_count = await page.locator('[role="status"], [aria-live]').count();
        await page.screenshot({ path: `${out}/login_wrongcreds_after.jpg`, type: "jpeg", quality: 75 });
      }

      writeFileSync(`${out}/clickpath_results.json`, JSON.stringify(clickResults, null, 2));
    } catch (e) {
      clickResults.error = String(e.message || e);
    }
  }

  await browser.close();

  mkdirSync("evidence/functional/_after_task43", { recursive: true });
  writeFileSync("evidence/functional/_after_task43/capture_manifest.json", JSON.stringify({
    timestamp: new Date().toISOString(),
    range: argRange,
    captures,
    consoleErrors,
    clickResults,
    summary: {
      visual_total: captures.length,
      visual_ok: captures.filter(c => c.ok).length,
      visual_fail: captures.filter(c => !c.ok).length,
      console_warnings_total: Object.values(consoleErrors).flat().length,
    },
  }, null, 2));

  process.stdout.write(`\n=== ${captures.filter(c => c.ok).length}/${captures.length} OK ; ${Object.values(consoleErrors).flat().length} console-warns ===\n`);
})();
