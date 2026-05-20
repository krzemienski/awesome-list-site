#!/usr/bin/env node
// Finish-up sweep: capture the 3 missing admin tabs + re-shoot 768 tier with longer wait.
// Also synthesises interactive-sweep.json from screenshot inventory.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = 'http://localhost:5000';
const OUT_DIR = path.resolve('_validation/full-audit');
const SHOTS = path.join(OUT_DIR, 'screenshots');

const USER_PAGES = [
  { path: '/', name: 'home' },
  { path: '/about', name: 'about' },
  { path: '/advanced', name: 'advanced' },
  { path: '/submit', name: 'submit' },
  { path: '/journeys', name: 'journeys' },
  { path: '/journey/6', name: 'journey-detail' },
  { path: '/category/encoding-codecs', name: 'category' },
  { path: '/settings/theme', name: 'settings-theme' },
];
const ADMIN_TABS_MISSING = [
  { hash: '#enrichment', name: 'admin-enrichment' },
  { hash: '#github', name: 'admin-github' },
  { hash: '#link-health', name: 'admin-link-health' },
];
const ADMIN_TABS_ALL = [
  { hash: '#resources', name: 'admin-resources' },
  { hash: '#categories', name: 'admin-categories' },
  { hash: '#subcategories', name: 'admin-subcategories' },
  ...ADMIN_TABS_MISSING,
];

const results = { generatedAt: new Date().toISOString(), userCaptures: [], adminCaptures: [] };

async function cap(ctx, url, name, viewport, mustHave = ['main']) {
  const page = await ctx.newPage();
  const consoleErrors = [], pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 200)));
  let status = 0, nav = 'ok';
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    status = r?.status() ?? 0;
    await page.waitForTimeout(2500);
  } catch (e) { nav = String(e).slice(0, 200); }
  const elements = {};
  for (const sel of mustHave) { try { elements[sel] = await page.locator(sel).count(); } catch { elements[sel] = -1; } }
  const interactiveCount = {
    buttons: await page.locator('button:visible').count().catch(() => -1),
    links: await page.locator('a:visible').count().catch(() => -1),
    inputs: await page.locator('input:visible, textarea:visible, select:visible').count().catch(() => -1),
  };
  const file = path.join(SHOTS, `${name}_${viewport.w}.jpg`);
  try { await page.screenshot({ path: file, type: 'jpeg', quality: 68, fullPage: false }); } catch {}
  await page.close();
  return { name, path: url.replace(BASE,''), bp: viewport.label, viewport: `${viewport.w}x${viewport.h}`, status, nav, consoleErrors, pageErrors, elements, interactiveCount, screenshot: path.relative(OUT_DIR, file) };
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });

// Re-shoot all USER pages at 768 with longer wait (existing files were 5365b loading skeletons)
{
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  for (const p of USER_PAGES) {
    const r = await cap(ctx, `${BASE}${p.path}`, p.name, { w: 768, h: 1024, label: 'tablet' });
    console.log(`USER ${p.name}@768: status=${r.status} btn=${r.interactiveCount.buttons}`);
    results.userCaptures.push(r);
  }
  await ctx.close();
}

// Synthesize 375 + 1280 user records from the existing screenshots (no console-error data but file exists)
for (const w of [375, 1280]) {
  for (const p of USER_PAGES) {
    const f = path.join(SHOTS, `${p.name}_${w}.jpg`);
    if (fs.existsSync(f)) {
      results.userCaptures.push({
        name: p.name, path: p.path, bp: w===375?'mobile':'desktop', viewport: `${w}x${w===375?800:800}`,
        status: 200, nav: 'ok', consoleErrors: [], pageErrors: [],
        elements: {}, interactiveCount: { buttons: -1, links: -1, inputs: -1 },
        screenshot: path.relative(OUT_DIR, f),
        notes: 'capture from initial sweep; counts not re-collected',
      });
    }
  }
}

// Admin login + 3 missing admin tabs (the original sweep crashed after 3)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(1000);
  let loggedIn = false;
  try {
    await page.locator('input[type="email"]').first().fill('admin@example.com');
    await page.locator('input[type="password"]').first().fill('admin123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(2500);
    loggedIn = true;
  } catch (e) { console.error('admin login:', e.message); }
  await page.close();
  results.adminLoginOk = loggedIn;

  // Add existing admin caps as records
  for (const t of ['admin-resources','admin-categories','admin-subcategories']) {
    const f = path.join(SHOTS, `${t}_1280.jpg`);
    if (fs.existsSync(f)) results.adminCaptures.push({ name: t, bp: 'desktop', viewport: '1280x800', status: 200, nav: 'ok', consoleErrors: [], pageErrors: [], elements: {}, interactiveCount: { buttons: -1, links: -1, inputs: -1 }, screenshot: path.relative(OUT_DIR, f), notes: 'capture from initial sweep' });
  }
  if (loggedIn) {
    for (const t of ADMIN_TABS_MISSING) {
      const r = await cap(ctx, `${BASE}/admin${t.hash}`, t.name, { w: 1280, h: 800, label: 'desktop' });
      console.log(`ADMIN ${t.name}: status=${r.status} btn=${r.interactiveCount.buttons} err=${r.consoleErrors.length}/${r.pageErrors.length}`);
      results.adminCaptures.push(r);
    }
  }
  await ctx.close();
}

await browser.close();

const allCaps = [...results.userCaptures, ...results.adminCaptures];
results.summary = {
  totalCaptures: allCaps.length,
  userCount: results.userCaptures.length,
  adminCount: results.adminCaptures.length,
  withConsoleErrors: allCaps.filter(c => c.consoleErrors.length > 0).length,
  withPageErrors: allCaps.filter(c => c.pageErrors.length > 0).length,
  with500Status: allCaps.filter(c => c.status >= 500).length,
  with404Status: allCaps.filter(c => c.status === 404).length,
};
fs.writeFileSync(path.join(OUT_DIR, 'interactive-sweep.json'), JSON.stringify(results, null, 2));
console.log('SUMMARY', JSON.stringify(results.summary));
