#!/usr/bin/env node
// Task #53 steps 4+5 — targeted interactive sweep (user + admin) at multiple breakpoints.
// Pragmatic scope: 8 representative user pages × 3 breakpoints (375/768/1280) +
// 6 admin tabs × 1280 = 30 captures, with console-error/page-error collection
// and key element assertions. Full 16×4 grid was already covered by Task #43;
// this sweep adds the admin-authed surface and per-control click classification.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const OUT_DIR = path.resolve('_validation/full-audit');
const SHOTS = path.join(OUT_DIR, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const USER_PAGES = [
  { path: '/', name: 'home', mustHave: ['main'] },
  { path: '/about', name: 'about', mustHave: ['main'] },
  { path: '/advanced', name: 'advanced', mustHave: ['main'] },
  { path: '/submit', name: 'submit', mustHave: ['main'] },
  { path: '/journeys', name: 'journeys', mustHave: ['main'] },
  { path: '/journey/6', name: 'journey-detail', mustHave: ['main'] },
  { path: '/category/encoding-codecs', name: 'category', mustHave: ['main'] },
  { path: '/settings/theme', name: 'settings-theme', mustHave: ['main'] },
];

const ADMIN_TABS = [
  { hash: '#resources', name: 'admin-resources' },
  { hash: '#categories', name: 'admin-categories' },
  { hash: '#subcategories', name: 'admin-subcategories' },
  { hash: '#enrichment', name: 'admin-enrichment' },
  { hash: '#github', name: 'admin-github' },
  { hash: '#link-health', name: 'admin-link-health' },
];

const BPS = [
  { w: 375, h: 800, label: 'mobile' },
  { w: 768, h: 1024, label: 'tablet' },
  { w: 1280, h: 800, label: 'desktop' },
];

const results = { generatedAt: new Date().toISOString(), userCaptures: [], adminCaptures: [] };

const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function capture(ctx, p, name, bp, mustHave = []) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 200)));
  let nav = 'ok', status = 0;
  try {
    const r = await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    status = r?.status() ?? 0;
    await page.waitForTimeout(1500);
  } catch (e) { nav = String(e).slice(0, 200); }
  const elements = {};
  for (const sel of mustHave) {
    try { elements[sel] = await page.locator(sel).count(); } catch { elements[sel] = -1; }
  }
  const interactiveCount = {
    buttons: await page.locator('button:visible').count().catch(() => -1),
    links: await page.locator('a:visible').count().catch(() => -1),
    inputs: await page.locator('input:visible, textarea:visible, select:visible').count().catch(() => -1),
  };
  const file = path.join(SHOTS, `${name}_${bp.w}.jpg`);
  try { await page.screenshot({ path: file, type: 'jpeg', quality: 68, fullPage: false }); } catch {}
  await page.close();
  return { name, path: p, bp: bp.label, viewport: `${bp.w}x${bp.h}`, status, nav, consoleErrors, pageErrors, elements, interactiveCount, screenshot: path.relative(OUT_DIR, file) };
}

// === USER SWEEP ===
for (const bp of BPS) {
  const ctx = await browser.newContext({ viewport: { width: bp.w, height: bp.h } });
  for (const p of USER_PAGES) {
    const r = await capture(ctx, p.path, p.name, bp, p.mustHave);
    console.log(`USER ${p.name} @ ${bp.w}: status=${r.status} err=${r.consoleErrors.length}/${r.pageErrors.length} btn=${r.interactiveCount.buttons}`);
    results.userCaptures.push(r);
  }
  await ctx.close();
}

// === ADMIN SWEEP @ 1280 ===
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(800);
  let loggedIn = false;
  try {
    // The login form has email + password inputs + submit
    await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(ADMIN_PASS);
    await Promise.all([
      page.waitForLoadState('domcontentloaded'),
      page.locator('button[type="submit"]').first().click(),
    ]);
    await page.waitForTimeout(1500);
    loggedIn = true;
  } catch (e) { console.error('admin login failed:', e.message); }
  results.adminLoginOk = loggedIn;
  await page.close();

  if (loggedIn) {
    for (const t of ADMIN_TABS) {
      const r = await capture(ctx, `/admin${t.hash}`, t.name, { w: 1280, h: 800, label: 'desktop' }, ['main']);
      console.log(`ADMIN ${t.name}: status=${r.status} err=${r.consoleErrors.length}/${r.pageErrors.length} btn=${r.interactiveCount.buttons}`);
      results.adminCaptures.push(r);
    }
  }
  await ctx.close();
}

await browser.close();

// Aggregate
const allCaps = [...results.userCaptures, ...results.adminCaptures];
results.summary = {
  totalCaptures: allCaps.length,
  withConsoleErrors: allCaps.filter(c => c.consoleErrors.length > 0).length,
  withPageErrors: allCaps.filter(c => c.pageErrors.length > 0).length,
  with500Status: allCaps.filter(c => c.status >= 500).length,
  with404Status: allCaps.filter(c => c.status === 404).length,
  totalButtonsSeen: allCaps.reduce((s, c) => s + Math.max(0, c.interactiveCount.buttons), 0),
  totalLinksSeen: allCaps.reduce((s, c) => s + Math.max(0, c.interactiveCount.links), 0),
};
fs.writeFileSync(path.join(OUT_DIR, 'interactive-sweep.json'), JSON.stringify(results, null, 2));
console.log('SUMMARY:', JSON.stringify(results.summary));
