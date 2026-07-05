import { chromium } from 'playwright-core';
import fs from 'fs';

const EXEC = '/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const BASE = 'http://localhost:5000';
const OUT = 'evidence';
fs.mkdirSync(OUT, { recursive: true });

const seg = process.argv[2] || 'home';
const VP = { width: 1440, height: 900 };
const R = {};
const rec = (k, v) => { R[k] = v; console.log(k, '=>', JSON.stringify(v)); };

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: VP });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('PAGEERR: ' + String(e).slice(0, 160)));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: false, type: 'png' }).catch(() => {});
const settle = (ms = 1500) => page.waitForTimeout(ms);

async function setSort(label) {
  await page.getByRole('combobox', { name: 'Sort resources' }).first().click();
  await settle(400);
  await page.getByRole('option', { name: label }).click();
  await settle(800);
}

try {
  if (seg === 'home') {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await settle(2200);
    const cards = () => page.locator('[data-testid^="link-category-"]');
    const titles = async () => (await cards().allInnerTexts()).map(t => t.split('\n')[0].trim());
    const nCards = await cards().count();
    rec('DV001_cardCount', nCards);
    rec('DV001_titles', await titles());
    // counts per card
    const counts = await page.locator('[data-testid^="badge-count-"]').allInnerTexts();
    rec('DV002_counts', counts.map(c => c.trim()));
    rec('DV002_allNumeric', counts.every(c => /\d+/.test(c)));
    await shot('DV-001-home');
    // DV-005 sort name asc/desc
    await setSort('Name A-Z'); const az = await titles(); rec('DV005_az', az);
    await shot('DV-005-az');
    await setSort('Name Z-A'); const za = await titles(); rec('DV005_za', za);
    await shot('DV-005-za');
    rec('DV005_azSorted', JSON.stringify(az) === JSON.stringify([...az].sort((a,b)=>a.localeCompare(b))));
    rec('DV005_zaReversed', JSON.stringify(za) === JSON.stringify([...az].reverse()));
    // DV-006 sort count
    await setSort('Most Resources');
    const mostCounts = (await page.locator('[data-testid^="badge-count-"]').allInnerTexts()).map(c=>parseInt(c.replace(/\D/g,''),10));
    rec('DV006_most', mostCounts);
    rec('DV006_mostDesc', JSON.stringify(mostCounts) === JSON.stringify([...mostCounts].sort((a,b)=>b-a)));
    await shot('DV-006-most');
    await setSort('Fewest Resources');
    const fewCounts = (await page.locator('[data-testid^="badge-count-"]').allInnerTexts()).map(c=>parseInt(c.replace(/\D/g,''),10));
    rec('DV006_few', fewCounts);
    rec('DV006_fewAsc', JSON.stringify(fewCounts) === JSON.stringify([...fewCounts].sort((a,b)=>a-b)));
    await shot('DV-006-fewest');
    // DV-016 default restore
    await setSort('Default'); rec('DV016_default', await titles());
    // DV-004 tag filter
    const beforeTag = await cards().count();
    await page.getByRole('button', { name: /Filter by Tag/i }).click(); await settle(600);
    const firstTag = page.locator('[aria-label^="Filter by "]').first();
    const tagLabel = await firstTag.getAttribute('aria-label');
    await firstTag.click(); await settle(900);
    await page.keyboard.press('Escape'); await settle(500);
    const afterTag = await cards().count();
    rec('DV004_tag', tagLabel); rec('DV004_before', beforeTag); rec('DV004_after', afterTag);
    rec('DV004_narrowed', afterTag <= beforeTag && afterTag > 0);
    await shot('DV-004-after-tag-filter');
    // clear via Active badge / clear all
    const activeBadge = page.locator('text=Active:').first();
    if (await activeBadge.count()) {
      // click the selected tag badge to remove
      await page.getByRole('button', { name: /Filter by Tag/i }).click(); await settle(400);
      await page.getByRole('button', { name: /Clear all/i }).click().catch(()=>{});
      await page.keyboard.press('Escape'); await settle(600);
    }
    rec('DV013_restored', await cards().count());
    // DV-008 nav
    const firstHref = await cards().first().getAttribute('href');
    await cards().first().click(); await settle(1600);
    rec('DV008_url', page.url()); rec('DV008_expectedHref', firstHref);
    const h1 = await page.locator('h1').first().innerText().catch(()=>'');
    rec('DV008_heading', h1.slice(0,60));
    await shot('DV-008-category-navigation');
  }

  if (seg === 'category') {
    await page.goto(BASE + '/category/encoding-codecs', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await settle(2200);
    const resultsCount = async () => (await page.getByTestId('text-results-count').innerText()).trim();
    const cardCount = () => page.locator('[data-testid^="card-resource-"]').count();
    rec('DV009_heading', (await page.locator('h1').first().innerText()).slice(0,60));
    rec('DV009_resultsText', await resultsCount());
    rec('DV009_renderedCards', await cardCount());
    await shot('DV-009-category-count');
    // DV-010/020 in-page search title
    const before = await cardCount();
    await page.getByTestId('input-search-resources').fill('FFMPEG'); await settle(1200);
    rec('DV020_searchTermUpper', 'FFMPEG');
    rec('DV010_before', before); rec('DV020_afterCards', await cardCount());
    rec('DV020_resultsText', await resultsCount());
    rec('DV022_urlHasSearch', page.url());
    await shot('DV-020-title-search');
    // reload persists
    await page.reload({ waitUntil: 'domcontentloaded' }); await settle(1800);
    rec('DV022_reloadUrl', page.url());
    rec('DV022_reloadInput', await page.getByTestId('input-search-resources').inputValue());
    rec('DV022_reloadCards', await cardCount());
    await shot('DV-022-search-reload');
    // clear search
    await page.getByTestId('input-search-resources').fill(''); await settle(1000);
    rec('DV023_afterClearCards', await cardCount());
    rec('DV023_urlAfterClear', page.url());
    // DV-021 description search (term unlikely in titles)
    await page.getByTestId('input-search-resources').fill('transcoding'); await settle(1200);
    rec('DV021_descSearchCards', await cardCount());
    rec('DV021_resultsText', await resultsCount());
    await shot('DV-021-description-search');
    await page.getByTestId('input-search-resources').fill(''); await settle(800);
    // DV-017/018 subcategory dropdown + filter
    await page.getByTestId('select-subcategory-filter').click(); await settle(500);
    const opts = await page.getByRole('option').allInnerTexts();
    rec('DV017_subOptions', opts.slice(0,25));
    // pick 2nd option (first real subcategory after "All")
    const target = opts.find(o => !/all sub/i.test(o)) || opts[1];
    await page.getByRole('option', { name: target, exact: true }).click().catch(async()=>{ await page.getByRole('option').nth(1).click(); });
    await settle(1000);
    rec('DV018_subChosen', target);
    rec('DV018_resultsText', await resultsCount());
    rec('DV018_cards', await cardCount());
    await shot('DV-018-subcategory-filter');
    // reset subcategory
    await page.getByTestId('select-subcategory-filter').click(); await settle(400);
    await page.getByRole('option').first().click(); await settle(800);
    // DV-024/025/026/027 view modes
    await page.getByTestId('view-mode-list').click(); await settle(700); await shot('DV-025-list-view');
    rec('DV025_listActive', await page.getByTestId('view-mode-list').getAttribute('data-state').catch(()=>null));
    await page.getByTestId('view-mode-compact').click(); await settle(700); await shot('DV-026-compact-view');
    await page.getByTestId('view-mode-grid').click(); await settle(700); await shot('DV-024-grid-view');
    // persist list across reload
    await page.getByTestId('view-mode-list').click(); await settle(600);
    const lsView = await page.evaluate(() => localStorage.getItem('awesome-list-view-mode'));
    rec('DV027_lsBefore', lsView);
    await page.reload({ waitUntil: 'domcontentloaded' }); await settle(1800);
    const lsAfter = await page.evaluate(() => localStorage.getItem('awesome-list-view-mode'));
    rec('DV027_lsAfter', lsAfter);
    rec('DV027_listStillActive', await page.getByTestId('view-mode-list').getAttribute('data-state').catch(()=>null));
    await shot('DV-027-after-reload');
    await page.getByTestId('view-mode-grid').click(); await settle(500);
  }

  if (seg === 'subnav') {
    // DV-028 subcategory page
    await page.goto(BASE + '/subcategory/encoding-tools', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(()=>{});
    await settle(2000);
    rec('DV028_url', page.url());
    rec('DV028_heading', (await page.locator('h1').first().innerText().catch(()=>'')).slice(0,60));
    rec('DV028_cards', await page.locator('[data-testid^="card-resource-"]').count());
    const rc = await page.getByTestId('text-results-count').innerText().catch(()=>'n/a');
    rec('DV028_resultsText', rc);
    await shot('DV-028-subcategory-page');
    // breadcrumbs
    const crumbs = await page.locator('nav a, [aria-label="breadcrumb"] a').allInnerTexts().catch(()=>[]);
    rec('DV030_breadcrumbs', crumbs.slice(0,10));
    await shot('DV-030-breadcrumbs');
    // sidebar counts (desktop) - open a category accordion & read a row count
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await settle(1800);
    const sideRows = await page.locator('[data-testid^="row-cat-"]').allInnerTexts().catch(()=>[]);
    rec('DV032_sidebarRows', sideRows.slice(0,12).map(t=>t.replace(/\n/g,' ').trim()));
    await shot('DV-032-sidebar-counts');
  }

  if (seg === 'search') {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await settle(2200);
    // DV-033 open via '/'
    await page.keyboard.press('/'); await settle(700);
    let dlg = page.getByRole('dialog');
    rec('DV033_slashOpened', await dlg.count() > 0);
    const focused1 = await page.evaluate(() => document.activeElement?.getAttribute('placeholder') || document.activeElement?.tagName);
    rec('DV033_focusOnInput', focused1);
    await shot('DV-033-slash-key');
    await page.keyboard.press('Escape'); await settle(600);
    // DV-033 open via Cmd+K (Meta+k)
    await page.keyboard.press('Control+k'); await settle(700);
    rec('DV033_cmdkOpened', await page.getByRole('dialog').count() > 0);
    await shot('DV-033-cmdk');
    // DV-034 min chars
    await page.getByPlaceholder(/Search packages/i).fill('f'); await settle(700);
    rec('DV034_oneCharText', await page.getByText(/at least 2 characters/i).count() > 0);
    await shot('DV-034-min-chars');
    // DV-035 title match
    await page.getByPlaceholder(/Search packages/i).fill('ffmpeg'); await settle(1200);
    const resTitles = await page.locator('[data-testid^="search-result-"] .font-medium').allInnerTexts().catch(()=>[]);
    rec('DV035_titleResults', resTitles.slice(0,5));
    // hierarchy shown
    const hier = await page.locator('[data-testid^="search-result-"] .text-muted-foreground').allInnerTexts().catch(()=>[]);
    rec('DV038_hierarchy', hier.slice(0,3));
    await shot('DV-035-title-match');
    // DV-036 description match term
    await page.getByPlaceholder(/Search packages/i).fill('transcoding'); await settle(1200);
    rec('DV036_descResults', await page.locator('[data-testid^="search-result-"]').count());
    await shot('DV-036-description-match');
    // DV-037 category match
    await page.getByPlaceholder(/Search packages/i).fill('encoding'); await settle(1200);
    rec('DV037_catResults', await page.locator('[data-testid^="search-result-"]').count());
    await shot('DV-037-category-match');
    // DV-039 no results
    await page.getByPlaceholder(/Search packages/i).fill('zzzqqxxnobodyhasthis'); await settle(1200);
    rec('DV039_noResults', await page.getByText(/No quick results found/i).count() > 0);
    await shot('DV-039-no-results');
    // DV-040 esc closes
    await page.keyboard.press('Escape'); await settle(600);
    rec('DV040_escClosed', await page.getByRole('dialog').count() === 0);
    await shot('DV-040-esc-closed');
  }
} catch (e) {
  rec('FATAL', String(e).slice(0, 300));
}
R._errors = errors;
fs.writeFileSync(`${OUT}/wave1_${seg}.json`, JSON.stringify(R, null, 2));
console.log('ERRORS', errors.length, errors.slice(0,5).join(' || '));
await browser.close();
console.log('DONE', seg);
