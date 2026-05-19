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

// ===== LOGIN =====
console.log('--- LOGIN ---');
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
await page.fill('[data-testid="input-email"]', 'admin@example.com');
await page.fill('[data-testid="input-password"]', 'admin123');
await Promise.all([
  page.waitForURL('**/admin', { timeout: 10000 }),
  page.click('[data-testid="button-login"]'),
]);
const authStatus = await page.evaluate(async () => {
  const r = await fetch('/api/auth/user', { credentials: 'include' });
  const u = (await r.json())?.user;
  return { status: r.status, email: u?.email, role: u?.role };
});
console.log('auth:', authStatus);
await w('submit/SR-AUTH-state.json', authStatus);

// ===== SR-04: Authed submit form render =====
console.log('--- SR-04 ---');
await page.goto(`${BASE}/submit`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="input-title"]', { timeout: 15000 });
const sr04 = await page.evaluate(() => ({
  url: location.pathname,
  hasForm: !!document.querySelector('[data-testid="input-title"]'),
  hasUrl: !!document.querySelector('[data-testid="input-url"]'),
  hasDesc: !!document.querySelector('[data-testid="input-description"]'),
  hasCat: !!document.querySelector('[data-testid="select-category"]'),
  hasSub: !!document.querySelector('[data-testid="select-subcategory"]'),
  hasSubSub: !!document.querySelector('[data-testid="select-subsubcategory"]'),
  hasTags: !!document.querySelector('[data-testid="input-tags"]'),
  hasSubmit: !!document.querySelector('[data-testid="button-submit"]'),
  hasCancel: !!document.querySelector('[data-testid="button-cancel"]'),
}));
console.log('sr04:', sr04);
await w('submit/SR-04-state.json', sr04);
await shot(page, 'submit/SR-04-authed-form.png');

// ===== SR-05: Empty submit => zod errors =====
console.log('--- SR-05 ---');
await page.click('[data-testid="button-submit"]');
await page.waitForTimeout(1500);
const sr05 = await page.evaluate(() => ({
  errors: Array.from(document.querySelectorAll('p[id$="-form-item-message"], p.text-destructive, [role="alert"]'))
    .map(e => e.textContent.trim()).filter(Boolean).slice(0, 10),
  url: location.pathname,
}));
console.log('sr05:', sr05);
await w('submit/SR-05-state.json', sr05);
await shot(page, 'submit/SR-05-empty-submit.png');

// ===== SR-06: Cancel => / =====
console.log('--- SR-06 ---');
await Promise.all([
  page.waitForURL('**/', { timeout: 5000 }).catch(() => {}),
  page.click('[data-testid="button-cancel"]'),
]);
await page.waitForTimeout(1000);
const sr06 = await page.evaluate(() => ({ url: location.pathname }));
console.log('sr06:', sr06);
await w('submit/SR-06-state.json', sr06);

// ===== C-08: Authed Suggest-Edit modal =====
console.log('--- C-08 ---');
await page.goto(`${BASE}/category/infrastructure-delivery`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid^="card-resource-"]', { timeout: 15000 });
await page.locator('[data-testid^="button-suggest-edit-"]').first().click();
await page.waitForTimeout(1500);
const c08 = await page.evaluate(() => {
  const d = document.querySelector('[role="dialog"]');
  const title = d?.querySelector('h2, [class*="DialogTitle"], [id*="title"]')?.textContent?.trim();
  return {
    hasDialog: !!d,
    title,
    isLoginGate: /login required/i.test(d?.textContent || ''),
    fieldCount: d?.querySelectorAll('input, textarea, select, [role="combobox"]').length || 0,
    bodyHead: d?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 220),
  };
});
console.log('c08:', c08);
await w('category/C-08-state.json', c08);
await shot(page, 'category/C-08-authed-suggest.png');
await page.keyboard.press('Escape');

// ===== S-04: Subcategory sidebar active rail =====
console.log('--- S-04 ---');
await page.goto(`${BASE}/subcategory/live-streaming-servers`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const s04 = await page.evaluate(() => {
  const activeBtns = Array.from(document.querySelectorAll('[data-sidebar="menu-button"][data-active="true"]'));
  const openCollapsibles = Array.from(document.querySelectorAll('[data-state="open"]'));
  return {
    url: location.pathname,
    activeRailItems: activeBtns.map(b => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)),
    activeRailCount: activeBtns.length,
    openCollapsibleCount: openCollapsibles.length,
    totalSidebarBtns: document.querySelectorAll('[data-sidebar="menu-button"]').length,
  };
});
console.log('s04:', s04);
await w('subcategory/S-04-rail-state.json', s04);
await shot(page, 'subcategory/S-04-sidebar-rail.png');

// ===== SS-03: SubSubcategory sidebar active rail =====
console.log('--- SS-03 ---');
await page.goto(`${BASE}/sub-subcategory/online-forums`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const ss03 = await page.evaluate(() => {
  const activeBtns = Array.from(document.querySelectorAll('[data-sidebar="menu-button"][data-active="true"]'));
  const openCollapsibles = Array.from(document.querySelectorAll('[data-state="open"]'));
  return {
    url: location.pathname,
    activeRailItems: activeBtns.map(b => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)),
    activeRailCount: activeBtns.length,
    openCollapsibleCount: openCollapsibles.length,
    totalSidebarBtns: document.querySelectorAll('[data-sidebar="menu-button"]').length,
  };
});
console.log('ss03:', ss03);
await w('subsubcategory/SS-03-rail-state.json', ss03);
await shot(page, 'subsubcategory/SS-03-sidebar-rail.png');

// ===== R-06b: Related resources positive case =====
console.log('--- R-06b ---');
const candidates = [185090, 186811, 186800, 186750, 186700, 186500, 186000, 185500, 185000, 184500];
let r06b = null;
for (const id of candidates) {
  try {
    const apiResp = await page.evaluate(async (i) => {
      const r = await fetch(`/api/resources/${i}/related`, { credentials: 'include' });
      const d = await r.json();
      return { status: r.status, count: d?.resources?.length || 0 };
    }, id);
    console.log(`resource ${id}: api related count = ${apiResp.count}`);
    if (apiResp.count > 0) {
      await page.goto(`${BASE}/resource/${id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      r06b = await page.evaluate((i) => ({
        resourceId: String(i),
        title: document.querySelector('[data-testid="text-resource-title"]')?.textContent?.trim(),
        relatedCount: document.querySelectorAll('[data-testid^="related-resource-"]').length,
        firstRelatedTestId: document.querySelector('[data-testid^="related-resource-"]')?.getAttribute('data-testid'),
        hasRelatedHeading: !!Array.from(document.querySelectorAll('div, h2, h3')).find(h => /^Related Resources/.test(h.textContent?.trim() || '')),
      }), id);
      console.log('r06b:', r06b);
      await shot(page, 'resourcedetail/R-06b-related-positive.png');
      break;
    }
  } catch (e) { console.log(`err on ${id}: ${e.message}`); }
}
if (!r06b) r06b = { swept: candidates, allReturnedZero: true };
await w('resourcedetail/R-06b-positive-state.json', r06b);

await browser.close();
console.log('=== DONE ===');
