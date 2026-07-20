import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const browser = await chromium.launch({ executablePath: EXEC });
const out = {};

// A) hydration parity: client title/description vs server-injected
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  const title = await page.title();
  const desc = await page.locator('meta[name="description"]').getAttribute('content');
  const titleCount = await page.locator('title').count();
  const descCount = await page.locator('meta[name="description"]').count();
  out.hydrated = { title, desc, titleCount, descCount };
  await ctx.close();
}

// B) authed home — recommendations panel with NO corpus prop
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  const login = await page.request.post(BASE + '/api/auth/local/login', {
    data: { email: 'admin@example.com', password: process.env.ADMIN_PASSWORD },
  });
  out.loginStatus = login.status();
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(2500);
  const mainText = await page.locator('main').innerText().catch(() => '');
  const hasRecsHeading = /Personalized Recommendations/i.test(mainText);
  const externalBadges = await page.locator('main :text-is("External")').count();
  const feedbackBtns = await page.locator('[data-testid^="feedback-"]').count();
  const recCards = mainText.match(/Was this helpful\?/g)?.length ?? 0;
  await page.screenshot({ path: '/tmp/r06-home-authed.png', fullPage: false });
  out.authedHome = { hasRecsHeading, externalBadges, feedbackHelpfulRows: recCards, feedbackBtns, pageErrors: errs };
  await ctx.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
