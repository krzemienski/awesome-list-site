import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:5000';
const OUT = '_validation/full-sweep';
const SHOTS = `${OUT}/screenshots/admin`;
fs.mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const allConsole = [];
const allPageErr = [];
page.on('console', m => { if (m.type() === 'error') allConsole.push({ where: page.url(), msg: m.text().slice(0, 200) }); });
page.on('pageerror', e => allPageErr.push({ where: page.url(), msg: e.message.slice(0, 200) }));

const results = [];
async function record(name, fn) {
  const before = { c: allConsole.length, p: allPageErr.length };
  let status = 'PASS', info = {};
  try { info = (await fn()) || {}; }
  catch (e) { status = 'FAIL'; info.error = e.message.slice(0, 200); }
  const cNew = allConsole.slice(before.c);
  const pNew = allPageErr.slice(before.p);
  if (cNew.length || pNew.length) status = 'FAIL';
  await page.screenshot({ path: `${SHOTS}/${name}.jpg`, quality: 70 });
  results.push({ name, status, ...info, consoleErrs: cNew, pageErrs: pNew });
  console.log(`${status} ${name}`, JSON.stringify(info).slice(0, 150));
}

// Login
await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' });
await page.fill('input[type="email"]', 'admin@example.com');
await page.fill('input[type="password"]', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(1500);
await record('login-result', async () => ({ url: page.url() }));

// Visit admin dashboard
await record('admin-dashboard', async () => {
  await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const tabs = await page.$$eval('[role="tab"], button[data-tab], a[href*="/admin"]', els => els.map(e => e.textContent?.trim()).filter(Boolean));
  return { url: page.url(), tabCount: tabs.length, tabs: tabs.slice(0, 30) };
});

// Tab walk: click each tab role=tab and screenshot
const tabSelectors = await page.$$eval('[role="tab"]', els =>
  els.map((el, i) => ({ idx: i, text: el.textContent?.trim().slice(0, 40), id: el.id || null }))
).catch(() => []);

for (const t of tabSelectors) {
  await record(`tab-${(t.text || `idx-${t.idx}`).replace(/[^a-z0-9]/gi, '_').toLowerCase()}`, async () => {
    const tabs = await page.$$('[role="tab"]');
    if (!tabs[t.idx]) return { skipped: true };
    await tabs[t.idx].click();
    await page.waitForTimeout(1200);
    const panelText = await page.evaluate(() => document.querySelector('[role="tabpanel"]:not([hidden])')?.innerText.slice(0, 300) || '');
    const buttonCount = await page.$$eval('[role="tabpanel"]:not([hidden]) button', b => b.length).catch(() => 0);
    return { tab: t.text, panelExcerpt: panelText.slice(0, 150), buttonCount };
  });
}

// Direct admin sub-routes
for (const r of ['/admin/researcher', '/admin/enrichment', '/admin/github', '/admin/database', '/admin/link-health']) {
  await record(`route_${r.replace(/\//g, '_')}`, async () => {
    const resp = await page.goto(BASE + r, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(600);
    return { route: r, http: resp?.status() };
  });
}

await ctx.close();
await browser.close();

fs.writeFileSync(`${OUT}/06-admin-playwright.json`, JSON.stringify({ results, totalConsoleErrs: allConsole.length, totalPageErrs: allPageErr.length }, null, 2));
const pass = results.filter(r => r.status === 'PASS').length;
const fail = results.filter(r => r.status === 'FAIL').length;
console.log(`\nADMIN SWEEP: pass=${pass} fail=${fail} consoleErrs=${allConsole.length} pageErrs=${allPageErr.length}`);
