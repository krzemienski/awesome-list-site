// Run15 P0 smoke — core journeys at desktop 1440 and mobile 375 (dev)
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  cond ? pass++ : fail++;
};

const browser = await chromium.launch({ executablePath: EXE });

for (const [label, viewport, mobile] of [
  ["desktop@1440", { width: 1440, height: 900 }, false],
  ["mobile@375", { width: 375, height: 812 }, true],
]) {
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));

  // Home (renders category explorer cards, not resource cards)
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('main a[href^="/category/"], a[href^="/resource/"]', { timeout: 20000 }).catch(() => {});
  const homeCat = await page.locator('main a[href^="/category/"]').count();
  const homeRes = await page.locator('a[href^="/resource/"]').count();
  ok(`${label} home renders content`, homeCat + homeRes > 0, `category links=${homeCat} resource links=${homeRes}`);

  // Category page
  await page.goto(BASE + "/category/encoding-codecs", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('main a[href^="/resource/"]', { timeout: 20000 }).catch(() => {});
  const catCards = await page.locator('main a[href^="/resource/"]').count();
  const h1 = await page.locator("h1").first().textContent().catch(() => "");
  ok(`${label} category page`, catCards > 0 && /encoding/i.test(h1 || ""), `cards=${catCards} h1="${(h1 || "").trim()}"`);

  // Resource detail (first card)
  const href = await page.locator('main a[href^="/resource/"]').first().getAttribute("href");
  await page.goto(BASE + href, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="button-visit"]', { timeout: 20000 }).catch(() => {});
  const visit = await page.locator('[data-testid="button-visit"]').count();
  ok(`${label} resource detail`, visit > 0, `${href} visit-cta=${visit}`);

  // Search
  await page.goto(BASE + "/search", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('[data-testid="input-search-page"]').fill("ffmpeg");
  await page.waitForSelector('[data-testid="text-result-count"], main a[href^="/resource/"]', { timeout: 20000 }).catch(() => {});
  const results = await page.locator('main a[href^="/resource/"]').count();
  ok(`${label} search "ffmpeg"`, results > 0, `results=${results}`);

  // Login page renders
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="input-email"]', { timeout: 20000 }).catch(() => {});
  const loginForm = await page.locator('[data-testid="input-email"], input[type="email"]').count();
  ok(`${label} login form`, loginForm > 0, `email inputs=${loginForm}`);

  ok(`${label} zero page errors`, errors.length === 0, errors.join(" | ") || "clean");
  await ctx.close();
}

await browser.close();
console.log(`\n${pass}/${pass + fail} PASS (P0 smoke)`);
process.exit(fail ? 1 : 0);
