import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const BASE = 'http://localhost:5000';
const ED = 'evidence/functional/pages';

async function w(rel, obj) {
  await fs.mkdir(path.dirname(path.join(ED, rel)), { recursive: true });
  await fs.writeFile(path.join(ED, rel), JSON.stringify(obj));
  console.log(`✓ ${rel}`);
}
async function shot(page, rel) {
  await fs.mkdir(path.dirname(path.join(ED, rel)), { recursive: true });
  await page.screenshot({ path: path.join(ED, rel), fullPage: false });
  console.log(`📸 ${rel}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

// LOGIN
console.log('--- LOGIN ---');
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('[data-testid="input-email"]', 'admin@example.com');
await page.fill('[data-testid="input-password"]', 'admin123');
await Promise.all([
  page.waitForURL('**/admin', { timeout: 10000 }),
  page.click('[data-testid="button-login"]'),
]);

// ===== SR-07: Valid submit → success toast =====
console.log('--- SR-07 ---');
await page.goto(`${BASE}/submit`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="input-title"]');
const uniq = Date.now();
await page.fill('[data-testid="input-title"]', `Audit Test Resource ${uniq}`);
await page.fill('[data-testid="input-url"]', `https://example-audit-${uniq}.test/`);
await page.fill('[data-testid="input-description"]', `Functional-validation audit synthetic resource ${uniq} — auto-submitted by scripts/audit-gap-fill-2.mjs to verify the SubmitResource success path.`);
// pick first real category in dropdown
await page.click('[data-testid="select-category"]');
await page.waitForSelector('[role="option"]');
const firstCat = await page.locator('[role="option"]').first().textContent();
await page.locator('[role="option"]').first().click();
console.log('picked category:', firstCat);
await page.waitForTimeout(500);
await page.click('[data-testid="button-submit"]');
// wait for success toast or showSuccess banner
await page.waitForFunction(() => {
  const toast = document.querySelector('[data-testid^="toast-"], [role="status"], li[role="status"]');
  const txt = document.body.innerText || '';
  return /Success/i.test(txt) || /submitted for review/i.test(txt);
}, { timeout: 10000 }).catch(() => null);
await page.waitForTimeout(1000);
const sr07 = await page.evaluate(() => {
  const txt = document.body.innerText || '';
  const hasSuccess = /Success!?/i.test(txt);
  const hasReviewMsg = /submitted for review/i.test(txt);
  const toastNodes = Array.from(document.querySelectorAll('[role="status"], li[role="status"], .Toaster *')).map(n => n.textContent?.trim()).filter(Boolean);
  return { url: location.pathname, hasSuccess, hasReviewMsg, toastNodes: toastNodes.slice(0, 5) };
});
console.log('sr07:', sr07);
await w('submit/SR-07-state.json', { ...sr07, pickedCategory: firstCat });
await shot(page, 'submit/SR-07-success.png');
await page.waitForTimeout(2500);

// ===== C-09: Category Suggest-Edit submit =====
console.log('--- C-09 ---');
await page.goto(`${BASE}/category/infrastructure-delivery`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid^="button-suggest-edit-"]');
await page.locator('[data-testid^="button-suggest-edit-"]').first().click();
await page.waitForSelector('[data-testid="input-edit-title"]', { timeout: 5000 });
const origTitle = await page.locator('[data-testid="input-edit-title"]').inputValue();
const newTitle = `${origTitle} [audit-${uniq}]`;
await page.fill('[data-testid="input-edit-title"]', newTitle);
await page.click('[data-testid="button-submit-edit"]');
await page.waitForTimeout(2500);
const c09 = await page.evaluate(() => {
  const txt = document.body.innerText || '';
  return {
    url: location.pathname,
    dialogStillOpen: !!document.querySelector('[data-testid="input-edit-title"]'),
    hasSubmittedToast: /submitted|thank|review|success/i.test(txt),
    toastNodes: Array.from(document.querySelectorAll('[role="status"], li[role="status"]')).map(n => n.textContent?.trim()).filter(Boolean).slice(0, 5),
  };
});
console.log('c09:', c09);
await w('category/C-09-state.json', { ...c09, origTitle, newTitle });
await shot(page, 'category/C-09-submitted.png');
await page.keyboard.press('Escape').catch(() => {});

// ===== R-04b: ResourceDetail authed Suggest-Edit open + submit =====
console.log('--- R-04b ---');
await page.goto(`${BASE}/resource/185090`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="button-suggest-edit"]', { timeout: 10000 });
await page.click('[data-testid="button-suggest-edit"]');
await page.waitForSelector('[data-testid="input-edit-title"]', { timeout: 5000 });
const r04bOpenState = await page.evaluate(() => ({
  hasDialog: !!document.querySelector('[role="dialog"]'),
  hasEditTitle: !!document.querySelector('[data-testid="input-edit-title"]'),
  hasEditUrl: !!document.querySelector('[data-testid="input-edit-url"]'),
  hasEditDesc: !!document.querySelector('[data-testid="input-edit-description"]'),
  hasEditCategory: !!document.querySelector('[data-testid="select-edit-category"]'),
  hasSubmitEdit: !!document.querySelector('[data-testid="button-submit-edit"]'),
  isLoginGate: /login required/i.test(document.querySelector('[role="dialog"]')?.textContent || ''),
}));
console.log('r04b-open:', r04bOpenState);
const origTitle2 = await page.locator('[data-testid="input-edit-title"]').inputValue();
const newTitle2 = `${origTitle2} [audit-${uniq}]`;
await page.fill('[data-testid="input-edit-title"]', newTitle2);
await page.click('[data-testid="button-submit-edit"]');
await page.waitForTimeout(2500);
const r04bSubmitState = await page.evaluate(() => {
  const txt = document.body.innerText || '';
  return {
    dialogStillOpen: !!document.querySelector('[data-testid="input-edit-title"]'),
    hasSubmittedToast: /submitted|thank|review|success/i.test(txt),
    toastNodes: Array.from(document.querySelectorAll('[role="status"], li[role="status"]')).map(n => n.textContent?.trim()).filter(Boolean).slice(0, 5),
  };
});
console.log('r04b-submit:', r04bSubmitState);
await w('resourcedetail/R-04b-state.json', { open: r04bOpenState, submit: r04bSubmitState, origTitle: origTitle2, newTitle: newTitle2 });
await shot(page, 'resourcedetail/R-04b-submitted.png');
await page.keyboard.press('Escape').catch(() => {});

// ===== C-10: Sort + filter persistence across view toggles =====
console.log('--- C-10 ---');
// Navigate with sort + filter via URL (Category reads sortBy/search from URL)
await page.goto(`${BASE}/category/infrastructure-delivery?sortBy=name-asc&search=cdn`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="text-results-count"]', { timeout: 10000 });
await page.waitForTimeout(800);

async function snap(label) {
  return await page.evaluate((lbl) => {
    const url = location.pathname + location.search;
    const search = new URLSearchParams(location.search);
    const firstCardText = document.querySelectorAll('[data-testid^="card-resource-"]')[0]?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 80);
    const resultsCount = document.querySelector('[data-testid="text-results-count"]')?.textContent?.trim();
    return {
      label: lbl,
      url,
      sortByParam: search.get('sortBy'),
      searchParam: search.get('search'),
      viewModeLS: localStorage.getItem('awesome-list-view-mode'),
      firstCardText,
      resultsCount,
    };
  }, label);
}

const beforeToggle = await snap('initial-grid');
console.log(beforeToggle);

// Toggle to list
await page.click('[data-testid="view-mode-list"]');
await page.waitForTimeout(500);
const afterList = await snap('after-list');
console.log(afterList);

// Toggle to compact
await page.click('[data-testid="view-mode-compact"]');
await page.waitForTimeout(500);
const afterCompact = await snap('after-compact');
console.log(afterCompact);

// Toggle back to grid
await page.click('[data-testid="view-mode-grid"]');
await page.waitForTimeout(500);
const afterGrid = await snap('after-grid');
console.log(afterGrid);

const c10 = {
  beforeToggle, afterList, afterCompact, afterGrid,
  sortPersistsAcrossToggles: beforeToggle.sortByParam === afterList.sortByParam &&
    afterList.sortByParam === afterCompact.sortByParam &&
    afterCompact.sortByParam === afterGrid.sortByParam,
  searchPersistsAcrossToggles: beforeToggle.searchParam === afterList.searchParam &&
    afterList.searchParam === afterCompact.searchParam &&
    afterCompact.searchParam === afterGrid.searchParam,
  resultsCountStable: beforeToggle.resultsCount === afterList.resultsCount &&
    afterList.resultsCount === afterCompact.resultsCount &&
    afterCompact.resultsCount === afterGrid.resultsCount,
  firstCardStable: beforeToggle.firstCardText === afterList.firstCardText &&
    afterList.firstCardText === afterCompact.firstCardText &&
    afterCompact.firstCardText === afterGrid.firstCardText,
};
console.log('c10:', c10);
await w('category/C-10-state.json', c10);
await shot(page, 'category/C-10-final-grid.png');

await browser.close();
console.log('=== DONE ===');
