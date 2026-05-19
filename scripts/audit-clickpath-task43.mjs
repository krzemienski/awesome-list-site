import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
const BASE = "http://localhost:5000";
const out = "evidence/functional/_after_task43/clickpath";
mkdirSync(out, { recursive: true });
const r = {};
const b = await chromium.launch({ args: ["--no-sandbox","--disable-dev-shm-usage"] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
try {
  await page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/theme_initial_after.jpg`, type: "jpeg", quality: 75 });
  r.theme_radios = await page.locator('[role="radio"]').count();
  r.theme_active_readout = await page.locator("text=/Active:/").first().textContent({ timeout: 2000 }).catch(() => null);
  if (r.theme_radios >= 8) {
    await page.locator('[role="radio"]').nth(7).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/theme_after_color_click.jpg`, type: "jpeg", quality: 75 });
    r.theme_active_after_click = await page.locator("text=/Active:/").first().textContent({ timeout: 2000 }).catch(() => null);
  }

  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.keyboard.press("Meta+k");
  await page.waitForTimeout(400);
  r.search_via_cmdk = (await page.locator('[role="dialog"]').count()) > 0;
  if (r.search_via_cmdk) await page.screenshot({ path: `${out}/search_via_cmdk_after.jpg`, type: "jpeg", quality: 75 });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("/");
  await page.waitForTimeout(400);
  r.search_via_slash = (await page.locator('[role="dialog"]').count()) > 0;
  if (r.search_via_slash) await page.screenshot({ path: `${out}/search_via_slash_after.jpg`, type: "jpeg", quality: 75 });
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}/advanced`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  r.advanced_tabs = await page.locator('[role="tab"]').count();
  if (r.advanced_tabs >= 3) {
    await page.locator('[role="tab"]').nth(2).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/advanced_tab2_clicked_after.jpg`, type: "jpeg", quality: 75 });
    r.advanced_tab2_selected = await page.locator('[role="tab"][aria-selected="true"]').first().textContent({ timeout: 2000 }).catch(() => null);
  }

  await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  r.category_view_details = await page.locator('button:has-text("View Details")').count();
  await page.screenshot({ path: `${out}/category_grid_after.jpg`, type: "jpeg", quality: 75 });

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const email = page.locator('input[type="email"], input[name="email"]').first();
  const pw = page.locator('input[type="password"]').first();
  if ((await email.count()) && (await pw.count())) {
    await email.fill("nobody@nowhere.test");
    await pw.fill("wrongpass");
    await page.locator('button[type="submit"]').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(2000);
    r.login_wrongcreds_feedback = await page.locator('[role="status"], [aria-live]').count();
    await page.screenshot({ path: `${out}/login_wrongcreds_after.jpg`, type: "jpeg", quality: 75 });
  }
} catch (e) { r.error = String(e.message || e); }
await b.close();
writeFileSync(`${out}/clickpath_results.json`, JSON.stringify(r, null, 2));
console.log(JSON.stringify(r, null, 2));
