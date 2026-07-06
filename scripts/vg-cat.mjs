// VG-3: real-browser validation of category rendering + pagination.
// Usage: node scripts/vg-cat.mjs <BASE_URL> <slug1,slug2,...>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';

const EXEC = '/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const BASE = process.argv[2];
const slugs = (process.argv[3] || '').split(',').filter(Boolean);
mkdirSync('evidence', { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 1200 } });

for (const slug of slugs) {
  const page = await ctx.newPage();
  const url = `${BASE}/category/${slug}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('[data-testid="text-results-count"]', { timeout: 30000 });
    await page.waitForSelector('[data-testid^="card-resource-"]', { timeout: 30000 }).catch(() => {});
    const showing = await page.locator('[data-testid="text-results-count"]').first().innerText().catch(() => null);
    const badge = await page.locator('[data-testid="badge-count"]').first().innerText().catch(() => null);
    const hasPag = await page.locator('[data-testid="pagination-controls"]').count();
    const pageInd = hasPag ? await page.locator('[data-testid="text-page-indicator"]').first().innerText().catch(() => null) : null;
    const cards = await page.locator('[data-testid^="card-resource-"]').count();
    let advanced = 'n/a';
    if (hasPag) {
      const first1 = await page.locator('[data-testid^="card-resource-"]').first().getAttribute('data-testid').catch(() => null);
      await page.locator('[data-testid="button-next-page"]').click().catch(() => {});
      await page.waitForTimeout(600);
      const first2 = await page.locator('[data-testid^="card-resource-"]').first().getAttribute('data-testid').catch(() => null);
      advanced = first1 !== first2;
      // go back to page 1 before screenshot
      await page.locator('[data-testid="button-prev-page"]').click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: `evidence/vg3-${slug}.png` });
    console.log(JSON.stringify({ slug, badge, showing, pageInd, cardsOnPage: cards, paginationAdvances: advanced }));
  } catch (e) {
    console.log(JSON.stringify({ slug, error: String(e).slice(0, 200) }));
  }
  await page.close();
}
await browser.close();
