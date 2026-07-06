// VG-5: real-browser validation of content link fix, breadcrumbs, About feature list.
// Usage: node scripts/vg-content.mjs <BASE_URL>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';

const EXEC = '/home/runner/workspace/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const BASE = process.argv[2] || 'https://awesome.video';
mkdirSync('evidence', { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 1400 } });

// 1) resource 185811 — link must be a direct URL, no shortener
let page = await ctx.newPage();
try {
  await page.goto(`${BASE}/resource/185811`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const hrefs = await page.locator('a[href^="http"]').evaluateAll((as) => as.map((a) => a.href));
  const shortener = hrefs.filter((h) => /link\.medium\.com|bit\.ly|t\.co\/|goo\.gl|tinyurl/i.test(h));
  const target = hrefs.filter((h) => /inca-message-tracing|netflixtechblog|NetflixTechBlog/i.test(h));
  await page.screenshot({ path: 'evidence/vg5-resource-185811.png' });
  console.log(JSON.stringify({ resource185811: { shortenerCount: shortener.length, directTargetFound: target.length > 0, sample: target[0] || null } }));
} catch (e) {
  console.log(JSON.stringify({ resource185811: { error: String(e).slice(0, 200) } }));
}
await page.close();

// 2) subcategory breadcrumb (peer-to-peer-streaming-solutions — where QUANTEEC now lives)
page = await ctx.newPage();
try {
  await page.goto(`${BASE}/subcategory/peer-to-peer-streaming-solutions`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const showing = await page.locator('[data-testid="text-results-count"]').first().innerText().catch(() => null);
  const crumb = await page.locator('nav[aria-label="Breadcrumb"], [data-testid="breadcrumb"], nav').first().innerText().catch(() => null);
  await page.screenshot({ path: 'evidence/vg5-subcategory-p2p.png' });
  console.log(JSON.stringify({ subcategoryP2P: { showing, breadcrumb: (crumb || '').replace(/\s+/g, ' ').slice(0, 160) } }));
} catch (e) {
  console.log(JSON.stringify({ subcategoryP2P: { error: String(e).slice(0, 200) } }));
}
await page.close();

// 3) About feature list — must not over-claim
page = await ctx.newPage();
try {
  await page.goto(`${BASE}/about`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);
  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  await page.screenshot({ path: 'evidence/vg5-about.png' });
  console.log(JSON.stringify({ about: { hasFeaturesHeading: /Features/.test(body), mentionsFuzzySearch: /Fuzzy Search/i.test(body) } }));
} catch (e) {
  console.log(JSON.stringify({ about: { error: String(e).slice(0, 200) } }));
}
await page.close();

await browser.close();
