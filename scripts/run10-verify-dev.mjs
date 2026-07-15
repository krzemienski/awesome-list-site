// Run10 dev verification: client fixes (BUG-013/017/019/021/027/042/043/045)
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const browser = await chromium.launch({ executablePath: EXE });

// --- Mobile: sidebar sheet width (BUG-013) + home count format (BUG-043)
{
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="mobile-drawer-trigger"]', { timeout: 15000 });

  const heroText = await page.locator("p", { hasText: "curated resources" }).first().textContent();
  ok("BUG-043 formatted count", /\d{1,3},\d{3} curated resources/.test(heroText || ""), (heroText || "").trim());

  await page.click('[data-testid="mobile-drawer-trigger"]');
  await page.waitForSelector('[data-sidebar="sidebar"][data-mobile="true"]', { state: "visible", timeout: 10000 });
  const w = await page.locator('[data-sidebar="sidebar"][data-mobile="true"]').evaluate((el) => el.getBoundingClientRect().width);
  ok("BUG-013 mobile sheet width", w <= 375 * 0.85 + 1, `width=${w}px (cap ${375 * 0.85}px)`);
  await ctx.close();
}

// --- Desktop: breadcrumb title (BUG-017), anon status badge hidden (BUG-019), card title tooltip (BUG-021/036)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/resource/185077", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);

  const crumbs = await page.locator("nav[aria-label='Breadcrumb'], nav.breadcrumb, [data-testid*='breadcrumb']").first().textContent().catch(() => null);
  const bodyCrumb = crumbs ?? (await page.locator("header").first().textContent());
  ok("BUG-017 breadcrumb resource title", !!bodyCrumb && !/\b185077\b/.test(bodyCrumb) && /Awesome Video/i.test(bodyCrumb), (bodyCrumb || "").replace(/\s+/g, " ").slice(0, 120));

  const badgeCount = await page.locator("span, div").filter({ hasText: /^approved$/i }).count();
  ok("BUG-019 anon status badge hidden", badgeCount === 0, `elements with exact text 'approved': ${badgeCount}`);

  await page.goto(BASE + "/category/learning-resources", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);
  const tooltipCount = await page.locator("span[title], h3[title], [class*='line-clamp'][title]").count();
  ok("BUG-021/036 card title tooltips", tooltipCount > 0, `elements with title attr: ${tooltipCount}`);
  await ctx.close();
}

// --- Login page: guest link (BUG-045), onTouched validation (BUG-042), ?next redirect (BUG-027)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/login?next=%2Fsubmit", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-testid="link-browse-guest"]', { timeout: 15000 }).catch(() => {});
  const guest = await page.locator('[data-testid="link-browse-guest"]').count();
  ok("BUG-045 guest browse link", guest === 1, `count=${guest}`);

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  await emailInput.fill("not-an-email");
  await emailInput.blur();
  await page.waitForTimeout(800);
  const errVisible = await page.locator("text=/valid email|invalid email/i").count();
  ok("BUG-042 onTouched blur validation", errVisible > 0, `error msgs after blur: ${errVisible}`);

  await emailInput.fill("admin@example.com");
  await page.locator('input[type="password"]').first().fill("devtest-run3-Pw1");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL("**/submit", { timeout: 15000 }).catch(() => {});
  ok("BUG-027 ?next= redirect", page.url().endsWith("/submit"), `landed on ${page.url()}`);
  await ctx.close();
}

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} PASS`);
process.exit(fails.length ? 1 : 0);
