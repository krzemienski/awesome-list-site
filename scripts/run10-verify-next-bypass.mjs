// Run10 architect follow-up: BUG-027 backslash bypass regression test.
// 1) ?next=/\evil.com must be REJECTED (fall back to role default /admin)
// 2) ?next=/submit must still work
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
const browser = await chromium.launch({ executablePath: EXE });
let fails = 0;

async function login(page) {
  await page.locator('input[type="email"], input[name="email"]').first().fill("admin@example.com");
  await page.locator('input[type="password"]').first().fill("devtest-run3-Pw1");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // %2F%5C = "/\" → the classic backslash open-redirect probe
  await page.goto(BASE + "/login?next=%2F%5Cevil.com", { waitUntil: "domcontentloaded", timeout: 30000 });
  await login(page);
  const url = new URL(page.url());
  const pass = url.host === "localhost:5000" && url.pathname === "/admin";
  console.log(`${pass ? "PASS" : "FAIL"} backslash bypass rejected — landed on ${page.url()}`);
  if (!pass) fails++;
  await ctx.close();
}

{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + "/login?next=%2Fsubmit", { waitUntil: "domcontentloaded", timeout: 30000 });
  await login(page);
  const url = new URL(page.url());
  const pass = url.host === "localhost:5000" && url.pathname === "/submit";
  console.log(`${pass ? "PASS" : "FAIL"} legit ?next=/submit still honored — landed on ${page.url()}`);
  if (!pass) fails++;
  await ctx.close();
}

await browser.close();
process.exit(fails ? 1 : 0);
