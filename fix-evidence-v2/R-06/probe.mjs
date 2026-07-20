import { chromium } from 'playwright';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const browser = await chromium.launch({ executablePath: EXEC });
const out = { steps: [] };

async function freshPage() {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const reqs = [];
  const errs = [];
  page.on('request', r => { const u = r.url(); if (u.includes('/api/')) reqs.push(u.replace(BASE, '')); });
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).slice(0, 200)));
  return { ctx, page, reqs, errs };
}

// STEP 1: cold home load — corpus must NOT be fetched
{
  const { ctx, page, reqs, errs } = await freshPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('[data-testid^="card-category"], [data-testid="text-total-resources"], main', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const corpusFetched = reqs.some(u => u.startsWith('/api/awesome-list') && !u.includes('/nav'));
  const navFetched = reqs.some(u => u.includes('/api/awesome-list/nav'));
  const cardCount = await page.locator('[data-testid^="card-category"]').count();
  const bodyText = await page.locator('main').innerText().catch(() => '');
  const statsLine = (bodyText.match(/[\d,]+\s+resources/i) || [''])[0];
  await page.screenshot({ path: '/tmp/r06-home-cold.png', fullPage: false });
  out.steps.push({ step: 'home-cold', corpusFetched, navFetched, cardCount, statsLine, apiRequests: reqs, consoleErrors: errs });
  await ctx.close();
}

// STEP 2: home with a tag filter activated — corpus SHOULD lazy-load
{
  const { ctx, page, reqs, errs } = await freshPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1000);
  const before = reqs.filter(u => u.startsWith('/api/awesome-list') && !u.includes('/nav')).length;
  // open the tag filter and click the first tag
  const tagBtn = page.locator('[data-testid="button-tag-filter"], button:has-text("Filter by tag"), [data-testid="button-filter-tags"]').first();
  let clicked = false;
  if (await tagBtn.count()) { await tagBtn.click(); clicked = true; }
  let tagClicked = false;
  if (clicked) {
    const opt = page.locator('[role="option"], [data-testid^="tag-option"], [data-testid^="badge-tag"]').first();
    if (await opt.count()) { await opt.click(); tagClicked = true; }
  }
  await page.waitForTimeout(2500);
  const after = reqs.filter(u => u.startsWith('/api/awesome-list') && !u.includes('/nav')).length;
  const cardCount = await page.locator('[data-testid^="card-category"]').count();
  await page.screenshot({ path: '/tmp/r06-home-tagfilter.png', fullPage: false });
  out.steps.push({ step: 'home-tag-filter', clickedFilterControl: clicked, tagClicked, corpusReqBefore: before, corpusReqAfter: after, cardCount, apiRequests: reqs, consoleErrors: errs });
  await ctx.close();
}

// STEP 3: /categories cold — renders from nav, no corpus
{
  const { ctx, page, reqs, errs } = await freshPage();
  await page.goto(BASE + '/categories', { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1500);
  const corpusFetched = reqs.some(u => u.startsWith('/api/awesome-list') && !u.includes('/nav'));
  const cardCount = await page.locator('[data-testid^="card-category"]').count();
  const bodyText = await page.locator('main').innerText().catch(() => '');
  const counts = (bodyText.match(/\d+\s+resources/gi) || []).slice(0, 12);
  await page.screenshot({ path: '/tmp/r06-categories.png', fullPage: false });
  out.steps.push({ step: 'categories-cold', corpusFetched, cardCount, visibleCounts: counts, apiRequests: reqs, consoleErrors: errs });
  await ctx.close();
}

// STEP 4: /category/:slug still uses corpus (must keep working)
{
  const { ctx, page, reqs, errs } = await freshPage();
  await page.goto(BASE + '/category/intro-learning', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('[data-testid^="card-resource"]', { timeout: 20000 }).catch(() => {});
  const corpusFetched = reqs.some(u => u.startsWith('/api/awesome-list') && !u.includes('/nav'));
  const resourceCards = await page.locator('[data-testid^="card-resource"]').count();
  await page.screenshot({ path: '/tmp/r06-category-page.png', fullPage: false });
  out.steps.push({ step: 'category-page', corpusFetched, resourceCards, consoleErrors: errs });
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(out, null, 2));
