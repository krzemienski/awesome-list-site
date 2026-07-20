import { chromium } from 'playwright';

const BASE = 'http://localhost:5000';
const EXEC = '.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';

const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function auditCards(url, label) {
  await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForSelector('[data-testid^="card-resource-"], [data-testid^="row-resource-"], [data-testid^="compact-resource-"]', { timeout: 20000 });
  await page.waitForTimeout(800);
  const summary = await page.evaluate(() => {
    const grid = document.querySelectorAll('[data-testid^="card-resource-"]');
    const rows = document.querySelectorAll('[data-testid^="row-resource-"]');
    const compact = document.querySelectorAll('[data-testid^="compact-resource-"]');
    const first = grid[0] || rows[0] || compact[0];
    const inFirst = (sel) => !!first?.querySelector(sel);
    return {
      gridCards: grid.length,
      listRows: rows.length,
      compactCards: compact.length,
      firstCard: first ? {
        testid: first.getAttribute('data-testid'),
        hasFavorite: inFirst('[data-testid="button-favorite"]'),
        hasBookmark: inFirst('[data-testid="button-bookmark"]'),
        hasOpenLink: inFirst('[data-testid^="button-visit-"]') || inFirst('[data-testid^="button-external-"]'),
        openLinkText: first.querySelector('[data-testid^="button-visit-"]')?.textContent?.trim() ?? null,
        hasSuggestEdit: inFirst('[data-testid^="button-suggest-edit-"]'),
        hasViewDetails: inFirst('[data-testid^="link-view-details-"]'),
        titleIsAnchor: !!first.querySelector('h2 a, span a'),
      } : null,
    };
  });
  console.log(label, JSON.stringify(summary, null, 2));
  return summary;
}

// grid parity: category vs subcategory
const cat = await auditCards('/category/community-events', 'CATEGORY /category/community-events (grid):');
await page.screenshot({ path: '/tmp/r08-category-grid.png', fullPage: false });

const sub = await auditCards('/subcategory/encoding-tools', 'SUBCATEGORY /subcategory/encoding-tools (grid):');
await page.screenshot({ path: '/tmp/r08-subcategory-grid.png', fullPage: false });

// list + compact on category
await auditCards('/category/community-events?view=list', 'CATEGORY list view:');
await page.screenshot({ path: '/tmp/r08-category-list.png' });
await auditCards('/category/community-events?view=compact', 'CATEGORY compact view:');
await page.screenshot({ path: '/tmp/r08-category-compact.png' });

// tag-pill filter still works on category grid
await page.goto(BASE + '/category/community-events', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForSelector('[data-testid^="card-resource-"]', { timeout: 20000 });
const pill = page.locator('[data-testid^="tag-pill-"]').first();
let tagFilter = { pillFound: false };
if (await pill.count()) {
  const tagName = (await pill.textContent())?.replace('#', '').trim();
  const before = await page.locator('[data-testid="text-results-count"]').textContent();
  await pill.click();
  await page.waitForTimeout(1200);
  const after = await page.locator('[data-testid="text-results-count"]').textContent();
  tagFilter = { pillFound: true, tagName, before: before?.trim(), after: after?.trim(), changed: before !== after };
}
console.log('TAG FILTER:', JSON.stringify(tagFilter));

// parity verdict
const same = cat.firstCard && sub.firstCard &&
  ['hasFavorite', 'hasBookmark', 'hasOpenLink', 'hasSuggestEdit', 'hasViewDetails']
    .every(k => cat.firstCard[k] === sub.firstCard[k]);
console.log('PARITY (category card features === subcategory card features):', same);

await browser.close();
