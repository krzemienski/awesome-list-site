// Repeatable URL-parameter edge-case validation (guards the run27/task246 fixes).
// Sweeps the edge URLs so a future page edit can't silently regress them:
//   1. XSS-shaped query params are scrubbed pre-boot + a visible notice appears
//   2. /search ?page=99 clamps to the last page AND rewrites the URL
//   3. /category ?page=999 clamps to the last page with a visible notice (strict rule)
//   4. "Go to page" jump input clamps 0 -> 1 and 999 -> last page
//   5. /resource/abc (non-numeric id) breadcrumb reads "Not found"
//   6. ?subcategory=bogus is ignored with a visible notice
//   7. whitespace-only search: /search prompt; /category ?search=+++ shows all resources
//   8. ?tags=RTMP&tags=HLS parses identically to ?tags=RTMP,HLS
// Anonymous-only (no login needed). Requires the dev server on :5000. Exits 1 on any failure.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

const browser = await chromium.launch({ headless: true, executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
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

fs.writeFileSync(`${OUT}/url-params-audit.json`, JSON.stringify(results, null, 2));
const fails = results.filter(r => !r.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${fails.length} (evidence: ${OUT})`);
await browser.close();
process.exit(fails.length ? 1 : 0);
