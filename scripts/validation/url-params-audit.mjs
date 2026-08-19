// Repeatable URL-parameter edge-case validation (guards the run27/task246 fixes).
// Sweeps the edge URLs so a future page edit can't silently regress them:
//   1. XSS-shaped query params are scrubbed pre-boot + a visible notice appears
//   2. /search ?page=99 clamps to the last page AND rewrites the URL
//   3. /category ?page=999 clamps to the last page with a visible notice (strict rule)
//   4. "Go to page" jump input clamps 0 -> 1 and 999 -> last page
//   5. /resource/abc (non-numeric id) breadcrumb reads "Not found"
//   6. ?subcategory=bogus is ignored with a visible notice
//   7. whitespace-only search: /search prompt; /category ?search=+++ shows all resources
//   8. API and UI parse repeated/legacy tags identically to comma lists
//   9. smart-search facets reject unsupported values and never leak unapproved rows
//  10. facet-only URLs restore all controlled state and expose explicit Unknown chips
//  11. singular/plural tag spellings return the same resources
//  12. combined facets return disjunctive counts for the selected category + tag
//  13. stable sorting produces repeatable, non-overlapping pages
//  14. exact-title and word-order-independent relevance remain intact
//  15. Back/Forward restores URL, chips, selected facets, and result rows
//  16. legacy ?search= links hydrate correctly and canonicalize to ?q=
// Anonymous-only (no login needed). Requires the dev server on :5000. Exits 1 on any failure.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowserWithLease } from './playwright-launch-lease.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:5000';
const OUT = '/tmp/validation/url-params-audit';
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  const cache = path.join(ROOT, '.cache/ms-playwright');
  const dir = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
  if (!dir) throw new Error('No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium');
  return path.join(cache, dir, 'chrome-linux64/chrome');
}

// Preflight: wait up to 120s for the server so this can run in parallel with app startup.
{
  const deadline = Date.now() + 120000;
  let up = false, lastErr = '';
  while (Date.now() < deadline && !up) {
    try {
      const ping = await fetch(`${BASE}/api/awesome-list`, { method: 'HEAD' });
      if (ping.ok || ping.status === 405) { up = true; break; }
      lastErr = `status ${ping.status}`;
    } catch (e) { lastErr = e.message; }
    await new Promise(r => setTimeout(r, 3000));
  }
  if (!up) { console.error(`FATAL: app not reachable at ${BASE} after 120s (${lastErr}) — start the "Start application" workflow`); process.exit(1); }
}

const results = [];
const log = (k, pass, detail) => { results.push({ k, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${k} :: ${detail}`); };

// Resolve a category with enough resources to paginate (>24) and at least one
// real subcategory, from the live tree — data changes over time, never hardcode.
function countResources(node) {
  let n = Array.isArray(node?.resources) ? node.resources.length : 0;
  for (const child of node?.subcategories ?? node?.subSubcategories ?? []) n += countResources(child);
  return n;
}
async function pickCategory() {
  const list = await fetch(`${BASE}/api/awesome-list`).then(r => r.json());
  const cats = (list?.categories ?? [])
    .map(c => ({ slug: c.slug, name: c.name, count: countResources(c), subs: (c.subcategories ?? []).length }))
    .sort((a, b) => b.count - a.count);
  const best = cats.find(c => c.count > 48 && c.subs > 0) ?? cats[0];
  if (!best) { console.error('FATAL: no categories in /api/awesome-list'); process.exit(1); }
  console.log(`using category /${best.slug} (${best.count} resources, ${best.subs} subcategories)`);
  return best;
}
const cat = await pickCategory();
const catRoute = `/category/${cat.slug}`;

const browser = await launchBrowserWithLease(
  chromium,
  { headless: true, executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage'] },
  'url-params-audit',
);
const ctx = await browser.newContext();

async function openPage(route, waitSel) {
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForFunction(
    () => ((document.getElementById('root')?.innerText || '').trim().length > 100),
    null, { timeout: 30000 }
  ).catch(() => {});
  if (waitSel) await page.waitForSelector(waitSel, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  return page;
}
const text = async (page, sel) => (await page.locator(sel).first().textContent().catch(() => null))?.trim() ?? null;
const visible = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);

// ---- 1. Scrubbed-param notice: XSS-shaped ?q= removed pre-boot + banner shown.
{
  const page = await openPage('/search?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E');
  const bannerVis = await visible(page, '[data-testid="banner-scrubbed-params"]');
  const bannerTxt = await text(page, '[data-testid="banner-scrubbed-params"]');
  log('scrub:banner', bannerVis, `banner visible=${bannerVis}; text: ${(bannerTxt || '').slice(0, 90)}`);
  const search = await page.evaluate(() => window.location.search);
  log('scrub:param-removed', !/onerror|%3C|</i.test(search), `location.search after boot: "${search}"`);
  await page.screenshot({ path: `${OUT}/scrub.png` }).catch(() => {});
  await page.close();
}

// ---- 2. /search ?page=99 clamps to the last page AND rewrites the URL (lenient rule).
{
  const page = await openPage('/search?q=video&page=99', '[data-testid="text-result-count"]');
  const noticeVis = await visible(page, '[data-testid="notice-page-adjusted"]');
  const noticeTxt = await text(page, '[data-testid="notice-page-adjusted"]');
  log('search-clamp:notice', noticeVis, `notice visible=${noticeVis}; text: ${(noticeTxt || '').slice(0, 100)}`);
  const search = await page.evaluate(() => window.location.search);
  const rewritten = new URLSearchParams(search).get('page');
  log('search-clamp:url-rewritten', rewritten !== '99', `?page after load: ${rewritten} (search: "${search}")`);
  await page.screenshot({ path: `${OUT}/search-clamp.png` }).catch(() => {});
  await page.close();
}

// ---- 3. /category ?page=999 clamps with a visible notice (strict rule, no silent rewrite).
{
  const page = await openPage(`${catRoute}?page=999`, '[data-testid="text-results-count"]');
  const noticeVis = await visible(page, '[data-testid="notice-page-adjusted"]');
  const noticeTxt = await text(page, '[data-testid="notice-page-adjusted"]');
  log('category-clamp:notice', noticeVis, `notice visible=${noticeVis}; text: ${(noticeTxt || '').slice(0, 100)}`);
  const cards = await page.locator('[data-testid^="link-resource-title-"]').count();
  log('category-clamp:content', cards > 0, `${cards} resource cards rendered on clamped page`);
  await page.screenshot({ path: `${OUT}/category-clamp.png` }).catch(() => {});
  await page.close();
}

// ---- 4. Page-jump input clamps 0 -> 1 and 999 -> last page (category paginator).
{
  const page = await openPage(`${catRoute}?page=2`, '[data-testid="input-page-jump"]');
  const jump = page.locator('[data-testid="input-page-jump"]').first();
  const indicator = () => text(page, '[data-testid="text-page-indicator"]');
  const before = await indicator();
  if (!(await jump.isVisible().catch(() => false))) {
    log('jump:present', false, `no paginator jump input on ${catRoute}?page=2 (indicator: ${before})`);
  } else {
    log('jump:present', true, `paginator indicator: ${before}`);
    const totalPages = Number((before || '').match(/of\s+(\d+)/i)?.[1] || 0);
    await jump.fill('0'); await jump.press('Enter'); await page.waitForTimeout(800);
    const afterZero = await indicator();
    log('jump:zero-clamps-to-1', /page\s*1\b/i.test(afterZero || ''), `after jump "0": ${afterZero}`);
    await jump.fill('999'); await jump.press('Enter'); await page.waitForTimeout(800);
    const afterBig = await indicator();
    const lastOk = totalPages > 0
      ? new RegExp(`page\\s*${totalPages}\\b`, 'i').test(afterBig || '')
      : afterBig !== null && !/999/.test(afterBig);
    log('jump:999-clamps-to-last', lastOk, `after jump "999": ${afterBig} (totalPages=${totalPages})`);
  }
  await page.screenshot({ path: `${OUT}/jump.png` }).catch(() => {});
  await page.close();
}

// ---- 5. /resource/abc breadcrumb reads "Not found".
{
  const page = await openPage('/resource/abc');
  const crumbs = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="breadcrumb" i], nav[aria-label="Breadcrumb"]');
    const mobile = document.querySelector('[data-testid="breadcrumb-mobile-current"]');
    return `${nav?.innerText || ''} | ${mobile?.textContent || ''}`;
  });
  log('breadcrumb:not-found', /not found/i.test(crumbs), `breadcrumb text: "${crumbs.replace(/\s+/g, ' ').trim().slice(0, 100)}"`);
  await page.screenshot({ path: `${OUT}/breadcrumb.png` }).catch(() => {});
  await page.close();
}

// ---- 6. ?subcategory=bogus is ignored with a visible notice.
{
  const page = await openPage(`${catRoute}?subcategory=bogus`, '[data-testid="text-results-count"]');
  const noticeVis = await visible(page, '[data-testid="notice-unknown-subcategory"]');
  const noticeTxt = await text(page, '[data-testid="notice-unknown-subcategory"]');
  log('subcategory:notice', noticeVis, `notice visible=${noticeVis}; text: ${(noticeTxt || '').slice(0, 100)}`);
  const cards = await page.locator('[data-testid^="link-resource-title-"]').count();
  log('subcategory:full-category-shown', cards > 0, `${cards} resource cards (filter ignored, category still renders)`);
  await page.screenshot({ path: `${OUT}/subcategory.png` }).catch(() => {});
  await page.close();
}

// ---- 7. Whitespace-only search.
{
  // /search?q=+++ -> explicit prompt, not a broken empty state.
  const page = await openPage('/search?q=%20%20%20');
  const promptVis = await visible(page, '[data-testid="text-search-prompt"]');
  log('whitespace:search-prompt', promptVis, `text-search-prompt visible=${promptVis}`);
  await page.close();

  // /category?search=+++ behaves as NO search: same results count as the bare page.
  const bare = await openPage(catRoute, '[data-testid="text-results-count"]');
  const bareCount = await text(bare, '[data-testid="text-results-count"]');
  await bare.close();
  const ws = await openPage(`${catRoute}?search=%20%20%20`, '[data-testid="text-results-count"]');
  const wsCount = await text(ws, '[data-testid="text-results-count"]');
  log('whitespace:category-shows-all', bareCount !== null && wsCount === bareCount,
    `bare: "${bareCount}" vs ?search=+++: "${wsCount}"`);
  await ws.screenshot({ path: `${OUT}/whitespace.png` }).catch(() => {});
  await ws.close();
}

// ---- 8. Repeated ?tags= params parse identically to a comma-joined value.
{
  async function tagState(route) {
    const page = await openPage(route, '[data-testid="text-results-count"]');
    const count = await text(page, '[data-testid="text-results-count"]');
    const pressed = await page.evaluate(() =>
      [...document.querySelectorAll('[aria-pressed="true"], [data-state="on"]')]
        .map(e => e.textContent.trim()).filter(Boolean).sort().join('|'));
    await page.close();
    return { count, pressed };
  }
  const a = await tagState(`${catRoute}?tags=RTMP&tags=HLS`);
  const b = await tagState(`${catRoute}?tags=RTMP,HLS`);
  log('tags:repeated-equals-comma', a.count === b.count && a.pressed === b.pressed,
    `repeated {count:"${a.count}", chips:"${a.pressed}"} vs comma {count:"${b.count}", chips:"${b.pressed}"}`);
}

{
  const get = async (query) => {
    const response = await fetch(`${BASE}/api/resources?${query}&limit=100&sort=name-asc`);
    const body = await response.json();
    return {
      status: response.status,
      total: body.total,
      ids: (body.resources || []).map((resource) => resource.id),
    };
  };
  const [repeated, comma, mixedAlias] = await Promise.all([
    get('tags=RTMP&tags=HLS'),
    get('tags=RTMP,HLS'),
    get('tags=RTMP&tag=HLS'),
  ]);
  log('tags:api-repeated-comma-alias-parity',
    repeated.status === 200 &&
      comma.status === 200 &&
      mixedAlias.status === 200 &&
      repeated.total === comma.total &&
      mixedAlias.total === comma.total &&
      JSON.stringify(repeated.ids) === JSON.stringify(comma.ids) &&
      JSON.stringify(mixedAlias.ids) === JSON.stringify(comma.ids),
    `repeated=${JSON.stringify(repeated)} comma=${JSON.stringify(comma)} mixedAlias=${JSON.stringify(mixedAlias)}`);
}

// ---- 9. Controlled facet values + approved-only public contract.
let initialFacets = null;
{
  const invalidCases = [
    ['provider', 'definitely-not-a-provider'],
    ['format', 'definitely-not-a-format'],
    ['skillLevel', 'definitely-not-a-level'],
    ['sort', 'definitely-not-a-sort'],
  ];
  const invalidResults = await Promise.all(invalidCases.map(async ([key, value]) => {
    const response = await fetch(`${BASE}/api/resources?${key}=${value}`);
    const body = await response.json().catch(() => ({}));
    return { key, status: response.status, message: body.message || '' };
  }));
  log('facets:invalid-controlled-values-400',
    invalidResults.every(result => result.status === 400 && result.message.toLowerCase().includes(result.key.toLowerCase())),
    invalidResults.map(result => `${result.key}=${result.status}`).join(', '));

  const unknown = await fetch(`${BASE}/api/resources?format=unknown&facets=true&limit=100`);
  const unknownBody = await unknown.json().catch(() => ({}));
  const rows = Array.isArray(unknownBody.resources) ? unknownBody.resources : [];
  initialFacets = unknownBody.facets ?? null;
  const approvedOnly = rows.length > 0 && rows.every(r => r.status === 'approved');
  const formatOnly = rows.length > 0 && rows.every(r => r.resourceFormat === 'unknown');
  log('facets:approved-only', unknown.ok && approvedOnly,
    `status=${unknown.status}; rows=${rows.length}; statuses=${[...new Set(rows.map(r => r.status))].join(',')}`);
  log('facets:unknown-filter', unknown.ok && formatOnly,
    `rows=${rows.length}; formats=${[...new Set(rows.map(r => r.resourceFormat))].join(',')}`);
  log('facets:counts-returned', !!initialFacets && Array.isArray(initialFacets.formats) && Array.isArray(initialFacets.tags),
    `facet groups=${initialFacets ? Object.keys(initialFacets).join(',') : 'none'}`);
}

// ---- 10. Facet-only URL restoration: all state survives the shareable URL.
{
  const route = '/search?format=unknown&provider=unknown&skillLevel=unknown&sort=name-asc';
  const page = await openPage(route, '[data-testid="active-filter-chips"]');
  const search = await page.evaluate(() => window.location.search);
  const params = new URLSearchParams(search);
  const chips = await text(page, '[data-testid="active-filter-chips"]');
  const cards = await page.locator('[data-testid^="link-resource-title-"]').count();
  const restored =
    params.get('format') === 'unknown' &&
    params.get('provider') === 'unknown' &&
    params.get('skillLevel') === 'unknown' &&
    params.get('sort') === 'name-asc';
  log('facets:url-state-restored', restored,
    `location.search="${search}"`);
  // F011 renamed the unknown-bucket chip label from "Unknown" to "Not yet
  // classified" — assert the new canonical label (intent unchanged: all three
  // unknown-bucket chips must be visible and labeled).
  log('facets:unknown-chips-visible', /Format: Not yet classified/i.test(chips || '') &&
    /Provider: Not yet classified/i.test(chips || '') && /Skill level: Not yet classified/i.test(chips || ''),
    `chips="${(chips || '').replace(/\s+/g, ' ').slice(0, 180)}"`);
  log('facets:filter-only-results', cards > 0, `${cards} cards rendered without q`);
  await page.screenshot({ path: `${OUT}/smart-facets.png`, fullPage: true }).catch(() => {});
  await page.close();
}

// ---- 11. Singular/plural tag normalization keeps the same result set.
{
  const tags = (initialFacets?.tags ?? []).map(item => item.value).filter(Boolean);
  const keepPlural = new Set([
    'hls', 'obs', 'oss', 'os', 'css', 'mss', 'cbcs', 'cbs', 'dts', 'ts',
    'graphics', 'analytics', 'analysis', 'ios', 'tvos', 'macos', 'nas',
    'kubernetes', 'less', 'sass', 'aws', 'cors', 'https', 'dns', 'tls',
    'sas', 'saas', 'paas', 'iaas', 'ffmpeg-libs', 'canvas', 'atmos',
    'axios', 'redis', 'postgres', 'jenkins', 'devops', 'chaos',
  ]);
  const singularTag = tags.find(tag =>
    /^[a-z0-9-]{4,}$/i.test(tag) &&
    !tag.endsWith('s') &&
    !tag.endsWith('y') &&
    !keepPlural.has(tag));
  if (!singularTag) {
    log('facets:singular-plural-tags', false, 'no suitable canonical singular tag was present in live facet counts');
  } else {
    const pluralTag = `${singularTag}s`;
    async function resourceIds(tag) {
      const response = await fetch(`${BASE}/api/resources?tags=${encodeURIComponent(tag)}&limit=100`);
      const body = await response.json().catch(() => ({}));
      return {
        status: response.status,
        ids: (body.resources ?? []).map(r => r.id).sort((a, b) => a - b),
        total: body.total,
      };
    }
    const plural = await resourceIds(pluralTag);
    const singular = await resourceIds(singularTag);
    log('facets:singular-plural-tags',
      plural.status === 200 && singular.status === 200 &&
        plural.total > 0 && plural.total === singular.total &&
        JSON.stringify(plural.ids) === JSON.stringify(singular.ids),
      `"${pluralTag}" total=${plural.total} vs "${singularTag}" total=${singular.total}`);
  }
}

// ---- 12. Combination-aware facet counts omit only their own selection.
{
  const categoryResponse = await fetch(
    `${BASE}/api/resources?category=${encodeURIComponent(cat.name)}&facets=true&limit=1`,
  );
  const categoryBody = await categoryResponse.json().catch(() => ({}));
  const tag = (categoryBody.facets?.tags ?? []).find(item => item.value && item.count > 0)?.value;
  if (!categoryResponse.ok || !tag) {
    log('facets:disjunctive-counts', false,
      `could not find a nonzero tag for category "${cat.name}" (status=${categoryResponse.status})`);
  } else {
    const [combinedResponse, tagOnlyResponse] = await Promise.all([
      fetch(`${BASE}/api/resources?category=${encodeURIComponent(cat.name)}&tags=${encodeURIComponent(tag)}&facets=true&limit=1`),
      fetch(`${BASE}/api/resources?tags=${encodeURIComponent(tag)}&facets=true&limit=1`),
    ]);
    const [combined, tagOnly] = await Promise.all([
      combinedResponse.json().catch(() => ({})),
      tagOnlyResponse.json().catch(() => ({})),
    ]);
    const categoryCount = combined.facets?.categories?.find(item => item.value === cat.name)?.count;
    const tagCount = combined.facets?.tags?.find(item => item.value === tag)?.count;
    const sameCategoryCounts =
      JSON.stringify(combined.facets?.categories ?? []) ===
      JSON.stringify(tagOnly.facets?.categories ?? []);
    const sameTagCounts =
      JSON.stringify(combined.facets?.tags ?? []) ===
      JSON.stringify(categoryBody.facets?.tags ?? []);
    log('facets:disjunctive-counts',
      combinedResponse.ok && tagOnlyResponse.ok && combined.total > 0 &&
        categoryCount === combined.total && tagCount === combined.total &&
        sameCategoryCounts && sameTagCounts,
      `category="${cat.name}", tag="${tag}", combined=${combined.total}, selectedCounts=${categoryCount}/${tagCount}, categoryFacetMatchesTagOnly=${sameCategoryCounts}, tagFacetMatchesCategoryOnly=${sameTagCounts}`);
  }
}

// ---- 13. Stable sorting gives repeatable page 1 and no page overlap.
{
  const loadPage = async page => {
    const response = await fetch(`${BASE}/api/resources?sort=name-asc&page=${page}&limit=24`);
    const body = await response.json().catch(() => ({}));
    return { status: response.status, ids: (body.resources ?? []).map(resource => resource.id) };
  };
  const [first, firstAgain, second] = await Promise.all([loadPage(1), loadPage(1), loadPage(2)]);
  const overlap = first.ids.filter(id => second.ids.includes(id));
  log('facets:stable-pagination',
    first.status === 200 && firstAgain.status === 200 && second.status === 200 &&
      first.ids.length === 24 && second.ids.length > 0 &&
      JSON.stringify(first.ids) === JSON.stringify(firstAgain.ids) && overlap.length === 0,
    `page1=${first.ids.length}, repeated=${JSON.stringify(first.ids) === JSON.stringify(firstAgain.ids)}, page2=${second.ids.length}, overlap=${overlap.length}`);
}

// ---- 14. Relevance: exact title first; multi-word ranking ignores word order.
{
  const search = async query => {
    const response = await fetch(`${BASE}/api/resources?search=${encodeURIComponent(query)}&sort=relevance&limit=20`);
    const body = await response.json().catch(() => ({}));
    return { status: response.status, rows: body.resources ?? [] };
  };
  const [exact, forward, reversed] = await Promise.all([
    search('ffmpeg'),
    search('video processing'),
    search('processing video'),
  ]);
  const forwardIds = forward.rows.map(resource => resource.id);
  const reversedIds = reversed.rows.map(resource => resource.id);
  log('facets:relevance-parity',
    exact.status === 200 && exact.rows[0]?.title?.toLowerCase() === 'ffmpeg' &&
      forward.status === 200 && reversed.status === 200 &&
      forwardIds.length > 0 && JSON.stringify(forwardIds) === JSON.stringify(reversedIds),
    `exactFirst="${exact.rows[0]?.title ?? ''}", multiWordRows=${forwardIds.length}, reversedSame=${JSON.stringify(forwardIds) === JSON.stringify(reversedIds)}`);
}

// ---- 15. Real history traversal restores filters, chips, and result rows.
{
  const page = await openPage('/search?format=unknown&sort=name-asc', '[data-testid="text-result-count"]');
  const categoryButton = page.getByTestId(/^facet-category-/).first();
  if (!(await categoryButton.isVisible().catch(() => false))) {
    log('facets:back-forward-restores', false, 'no visible category facet button');
  } else {
    await categoryButton.click();
    await page.waitForFunction(() => new URLSearchParams(location.search).has('category'));
    const categoryValue = await page.evaluate(() => new URLSearchParams(location.search).get('category'));
    const categoryFirstHref = await page.locator('[data-testid^="link-resource-title-"]').first().getAttribute('href');
    const providerButton = page.getByTestId('facet-provider-unknown').first();
    await providerButton.click();
    await page.waitForFunction(() => new URLSearchParams(location.search).get('provider') === 'unknown');
    const forwardHref = await page.locator('[data-testid^="link-resource-title-"]').first().getAttribute('href');
    await page.goBack();
    await page.waitForFunction(expected =>
      new URLSearchParams(location.search).get('category') === expected &&
      !new URLSearchParams(location.search).has('provider'), categoryValue);
    const backChips = await text(page, '[data-testid="active-filter-chips"]');
    const backHref = await page.locator('[data-testid^="link-resource-title-"]').first().getAttribute('href');
    await page.goForward();
    await page.waitForFunction(() => new URLSearchParams(location.search).get('provider') === 'unknown');
    const restoredChips = await text(page, '[data-testid="active-filter-chips"]');
    const restoredHref = await page.locator('[data-testid^="link-resource-title-"]').first().getAttribute('href');
    log('facets:back-forward-restores',
      !!categoryValue && /Category:/i.test(backChips || '') && !/Provider:/i.test(backChips || '') &&
        /Provider: Not yet classified/i.test(restoredChips || '') &&
        backHref === categoryFirstHref && restoredHref === forwardHref,
      `category="${categoryValue}", backRowsMatch=${backHref === categoryFirstHref}, forwardRowsMatch=${restoredHref === forwardHref}`);
  }
  await page.screenshot({ path: `${OUT}/back-forward.png`, fullPage: true }).catch(() => {});
  await page.close();
}

// ---- 16. Legacy/external ?search= links hydrate and replace to canonical ?q=.
{
  const page = await openPage('/search?search=ffmpeg', '[data-testid="text-result-count"]');
  const value = await page.getByTestId('input-search-page').inputValue().catch(() => '');
  const params = new URLSearchParams(await page.evaluate(() => window.location.search));
  const firstTitle = await text(page, '[data-testid^="link-resource-title-"]');
  log('search-alias:input-hydrated', value === 'ffmpeg', `input="${value}"`);
  log('search-alias:url-canonicalized',
    params.get('q') === 'ffmpeg' && !params.has('search'),
    `location.search="?${params.toString()}"`);
  log('search-alias:matching-results',
    /^ffmpeg$/i.test(firstTitle || ''),
    `first result="${firstTitle || ''}"`);
  await page.screenshot({ path: `${OUT}/search-alias.png`, fullPage: true }).catch(() => {});
  await page.close();
}

fs.writeFileSync(`${OUT}/url-params-audit.json`, JSON.stringify(results, null, 2));
const fails = results.filter(r => !r.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${fails.length} (evidence: ${OUT})`);
await browser.close();
process.exit(fails.length ? 1 : 0);
