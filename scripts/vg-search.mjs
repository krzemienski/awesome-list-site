// VG-4: real-browser validation of the search UI + /?q= redirect (dev server).
// Usage: node scripts/vg-search.mjs <BASE_URL>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';

const EXEC = '/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const BASE = process.argv[2] || 'http://localhost:5000';
mkdirSync('evidence', { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 1200 } });

for (const q of ['ffmpeg', 'codec', 'HLS']) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/search?q=${q}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('[data-testid="text-result-count"],[data-testid="text-no-results"]', { timeout: 20000 }).catch(() => {});
  const count = await page.locator('[data-testid="text-result-count"]').first().innerText().catch(() => null);
  const isSearchPage = (await page.locator('h1', { hasText: 'Search' }).count()) > 0;
  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
  const resourceLinks = await page.locator('a[href^="/resource/"]').count();
  await page.screenshot({ path: `evidence/vg4-search-${q}.png` });
  console.log(JSON.stringify({
    q, count, isSearchPage, resourceLinks,
    mentionsQueryTerm: new RegExp(q, 'i').test(bodyText),
  }));
  await page.close();
}

// /?q= redirect → /search?q=
const page = await ctx.newPage();
await page.goto(`${BASE}/?q=ffmpeg`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1800);
console.log(JSON.stringify({ redirectTest: '/?q=ffmpeg', finalUrl: page.url() }));
await page.close();

await browser.close();
