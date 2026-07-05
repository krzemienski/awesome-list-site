import { chromium } from 'playwright-core';
import fs from 'fs';
const EXEC = '/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const OUT = 'evidence';
const R = {}; const rec = (k, v) => { R[k] = v; console.log(k, '=>', JSON.stringify(v)); };
const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
page.on('pageerror', (e) => errors.push('PAGEERR: ' + String(e).slice(0, 140)));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, type: 'png' }).catch(() => {});
const settle = (ms = 900) => page.waitForTimeout(ms);
const openTags = async () => { await page.getByRole('button', { name: /Filter by Tag/i }).click(); await settle(500); };
const closePop = async () => { await page.keyboard.press('Escape'); await settle(400); };

try {
  // ---- Home DV-004: tag narrows resource counts ----
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 }); await settle(2200);
  const homeCounts = async () => (await page.locator('[data-testid^="badge-count-"]').allInnerTexts()).map(c => parseInt(c.replace(/\D/g,''),10));
  const beforeCounts = await homeCounts();
  await openTags();
  const firstTag = page.locator('[aria-label^="Filter by "]').first();
  const tagLabel = await firstTag.getAttribute('aria-label');
  await firstTag.click(); await settle(700); await closePop();
  const afterCounts = await homeCounts();
  rec('DV004_tag', tagLabel);
  rec('DV004_beforeSum', beforeCounts.reduce((a,b)=>a+b,0));
  rec('DV004_afterSum', afterCounts.reduce((a,b)=>a+b,0));
  rec('DV004_countsChanged', JSON.stringify(beforeCounts) !== JSON.stringify(afterCounts));
  rec('DV004_afterNarrowed', afterCounts.reduce((a,b)=>a+b,0) < beforeCounts.reduce((a,b)=>a+b,0));
  await shot('DV-004-after-tag-filter');

  // ---- Category encoding-codecs DV-011/012/013/019 ----
  await page.goto(BASE + '/category/encoding-codecs', { waitUntil: 'domcontentloaded', timeout: 20000 }); await settle(2000);
  const results = async () => parseInt((await page.getByTestId('text-results-count').innerText()).replace(/Showing (\d+).*/,'$1'),10);
  const total = await results(); rec('DV011_total', total);
  await openTags();
  const tagEls = page.locator('[aria-label^="Filter by "]');
  const tagA = await tagEls.nth(0).getAttribute('aria-label');
  const tagB = await tagEls.nth(1).getAttribute('aria-label');
  await tagEls.nth(0).click(); await settle(700); await closePop();
  const cA = await results(); rec('DV011_tagA', tagA); rec('DV011_countA', cA);
  rec('DV011_narrowed', cA < total && cA > 0);
  await shot('DV-011-one-tag');
  // second tag -> union
  await openTags(); await page.locator('[aria-label^="Filter by "]').nth(1).click(); await settle(700); await closePop();
  const cAB = await results(); rec('DV012_tagB', tagB); rec('DV012_countAB', cAB);
  // clear A to get B alone
  await openTags(); await page.getByRole('button', { name: /Clear all/i }).click().catch(()=>{}); await settle(500);
  await page.locator('[aria-label^="Filter by "]').nth(1).click(); await settle(700); await closePop();
  const cB = await results(); rec('DV012_countB', cB);
  rec('DV012_union', cAB >= Math.max(cA, cB) && cAB <= cA + cB);
  await shot('DV-012-two-tags-union');
  // DV-013 clear all restores
  await openTags(); await page.getByRole('button', { name: /Clear all/i }).click().catch(()=>{}); await closePop(); await settle(700);
  rec('DV013_restored', await results());
  // DV-019 subcategory + tag combine
  await page.getByTestId('select-subcategory-filter').click(); await settle(400);
  await page.getByRole('option').nth(1).click(); await settle(700);
  const subOnly = await results(); rec('DV019_subOnly', subOnly);
  await openTags(); await page.locator('[aria-label^="Filter by "]').nth(0).click(); await settle(700); await closePop();
  const subPlusTag = await results();
  rec('DV019_subPlusTag', subPlusTag);
  rec('DV019_combined', subPlusTag <= subOnly);
  await shot('DV-019-combined-filters');

  // ---- SubSubcategory page DV-029 ----
  await page.goto(BASE + '/subsubcategory/hevc', { waitUntil: 'domcontentloaded', timeout: 20000 }); await settle(2000);
  rec('DV029_url', page.url());
  rec('DV029_heading', (await page.locator('h1').first().innerText().catch(()=>'')).slice(0,50));
  rec('DV029_cards', await page.locator('[data-testid^="card-resource-"]').count());
  rec('DV029_resultsText', await page.getByTestId('text-results-count').innerText().catch(()=>'n/a'));
  await shot('DV-029-subsubcategory-page');
} catch (e) { rec('FATAL', String(e).slice(0,300)); }
R._errors = errors;
fs.writeFileSync(`${OUT}/wave1b.json`, JSON.stringify(R, null, 2));
console.log('ERRORS', errors.length, errors.slice(0,4).join(' || '));
await browser.close(); console.log('DONE');
