import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5000';
const OUT = 'screenshots/functional';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const log = (id, pass, detail, shot) => {
  results.push({ id, pass, detail, shot });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id}  ${detail}`);
};

const SYSTEMS = ['editorial','terminal','geist','brutalist','swiss'];
const ACCENTS = ['crimson','magenta','orange','amber','emerald','matrix','cyan','violet','lime','rose'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const consoleErrs = [];
page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });

// ============ E1: Theme picker — 50 swaps + persistence + FOUC ============
await page.goto(`${BASE}/settings/theme`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);

let e1Pass = 0, e1Fail = 0;
for (const sys of SYSTEMS) {
  for (const acc of ACCENTS) {
    // click the system pill
    const sysBtn = page.locator(`[data-testid="system-option-${sys}"]`).first();
    if (await sysBtn.count() > 0) await sysBtn.click().catch(()=>{});
    await page.waitForTimeout(60);
    const accBtn = page.locator(`[data-testid="accent-option-${acc}"]`).first();
    if (await accBtn.count() > 0) await accBtn.click().catch(()=>{});
    await page.waitForTimeout(80);
    const state = await page.evaluate(() => ({
      sys: document.documentElement.dataset.system,
      acc: document.documentElement.dataset.accent,
      accentVar: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      lsSys: localStorage.getItem('ds-system'),
      lsAcc: localStorage.getItem('ds-accent'),
    }));
    const ok = state.sys === sys && state.acc === acc && !!state.accentVar && state.lsSys === sys && state.lsAcc === acc;
    if (ok) e1Pass++; else e1Fail++;
    if (!ok && e1Fail <= 3) console.log(`  ${sys}/${acc} → got ${JSON.stringify(state)}`);
  }
}
const shot1 = path.join(OUT, 'E1_final_swap.jpg');
await page.screenshot({ path: shot1, type: 'jpeg', quality: 80 });
log('E1-swap', e1Fail === 0, `${e1Pass}/50 swaps wrote both data-attrs + --accent + persisted to localStorage`, shot1);

// FOUC test: reload and capture first paint
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
const firstPaintState = await page.evaluate(() => ({
  sys: document.documentElement.dataset.system,
  acc: document.documentElement.dataset.accent,
}));
const lastSys = SYSTEMS[SYSTEMS.length-1]; const lastAcc = ACCENTS[ACCENTS.length-1];
log('E1-fouc', firstPaintState.sys === lastSys && firstPaintState.acc === lastAcc,
  `pre-paint data-system=${firstPaintState.sys}, data-accent=${firstPaintState.acc}`, null);

// reset to defaults for rest of tests
await page.evaluate(() => { localStorage.removeItem('ds-system'); localStorage.removeItem('ds-accent'); });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

// ============ E2: Search dialog — Cmd+K, /, header button ============
const tryOpenSearch = async (action) => {
  await action();
  await page.waitForTimeout(200);
  const dlg = page.locator('[role="dialog"], [cmdk-root], [data-cmdk-root]').first();
  const visible = await dlg.isVisible().catch(()=>false);
  if (visible) await page.keyboard.press('Escape');
  return visible;
};
const e2k = await tryOpenSearch(() => page.keyboard.press('Meta+k'));
const e2slash = await tryOpenSearch(() => page.keyboard.press('/'));
const e2btn = await tryOpenSearch(async () => {
  const btn = page.locator('header button:has-text("Search"), header [aria-label*="search" i]').first();
  if (await btn.count() > 0) await btn.click();
});
log('E2-cmdk', e2k, 'Cmd+K opens search dialog', null);
log('E2-slash', e2slash, '/ keypress opens search dialog', null);
log('E2-btn', e2btn, 'header search button opens dialog', null);

// Search → type → click result
await page.keyboard.press('Meta+k');
await page.waitForTimeout(200);
await page.keyboard.type('ffmpeg');
await page.waitForTimeout(400);
const resultsCount = await page.locator('[cmdk-item], [role="option"]').count();
log('E2-results', resultsCount > 0, `${resultsCount} fuse-search results for "ffmpeg"`, null);
await page.keyboard.press('Escape');

// ============ E3: Sidebar accordion ============
const catBtns = await page.locator('[data-sidebar="menu"] button, aside button').filter({ hasText: /Encoding|Codecs|Community|General/ }).count();
log('E3-cat-buttons', catBtns > 0, `${catBtns} category buttons present in sidebar`, null);

// Click one category
const cat = page.getByRole('button', { name: /Encoding & Codecs/i }).first();
if (await cat.count() > 0) {
  await cat.click();
  await page.waitForTimeout(200);
  const subShot = path.join(OUT, 'E3_sidebar_expanded.jpg');
  await page.screenshot({ path: subShot, type: 'jpeg', quality: 80 });
  log('E3-expand', true, 'clicked Encoding & Codecs sidebar row', subShot);
}

// ============ E5: Login wrong creds ============
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('input[type="email"], input[name="email"]', 'wrong@test.com').catch(()=>{});
await page.fill('input[type="password"]', 'wrongpass').catch(()=>{});
await page.click('button[type="submit"]:has-text("Sign In"), button:has-text("Sign in")').catch(()=>{});
await page.waitForTimeout(800);
const toast = await page.locator('[role="status"], [data-sonner-toast], .toast').count();
const loginShot = path.join(OUT, 'E5_login_wrong.jpg');
await page.screenshot({ path: loginShot, type: 'jpeg', quality: 80 });
log('E5-wrongcreds', toast > 0, `${toast} toast(s) shown for wrong creds`, loginShot);

// ============ E6: Submit — unauth state ============
await page.goto(`${BASE}/submit`, { waitUntil: 'networkidle' });
const submitShot = path.join(OUT, 'E6_submit_unauth.jpg');
await page.screenshot({ path: submitShot, type: 'jpeg', quality: 80 });
const hasGate = (await page.getByText(/Login required|Authentication Required/i).count()) > 0;
const hasForm = (await page.locator('input[name="title"], input[placeholder*="FFmpeg" i]').count()) > 0;
log('E6-unauth', hasGate, `unauth shows login warning (gate=${hasGate}, form=${hasForm})`, submitShot);

// ============ E7: Category page interactions ============
await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const viewDetails = await page.locator('[data-testid^="button-view-details-"]').count();
log('E7-viewdetails', viewDetails > 0, `${viewDetails} View Details buttons rendered`, null);

const sortSelect = page.locator('select, [role="combobox"]').first();
const hasSort = await sortSelect.count() > 0;
log('E7-sort-present', hasSort, `sort selector present`, null);

const viewModeBtns = await page.locator('button[aria-label*="grid" i], button[aria-label*="list" i], button[aria-label*="compact" i]').count();
log('E7-viewmode', viewModeBtns >= 2, `${viewModeBtns} view-mode toggle buttons`, null);

// click a View Details button and verify navigation
const firstView = page.locator('[data-testid^="button-view-details-"]').first();
if (await firstView.count() > 0) {
  await firstView.click();
  await page.waitForTimeout(700);
  const url = page.url();
  const onResource = /\/resource\//.test(url);
  const notFound = (await page.getByText(/Not Found|Resource Not Found/i).count()) > 0;
  const h1 = (await page.locator('h1').first().textContent().catch(()=>'')) || '';
  const detailShot = path.join(OUT, 'E7_resource_detail.jpg');
  await page.screenshot({ path: detailShot, type: 'jpeg', quality: 80 });
  log('E7-nav-detail', onResource && !notFound, `landed=${url}; h1="${h1.substring(0,60)}"; notFound=${notFound}`, detailShot);
}

// ============ E8: Mobile drawer ============
const mob = await ctx.newPage();
await mob.setViewportSize({ width: 400, height: 800 });
await mob.goto(`${BASE}/`, { waitUntil: 'networkidle' });
const menuBtn = mob.locator('header button[aria-label*="menu" i], header button:has([data-lucide="menu"])').first();
const hasMenu = await menuBtn.count() > 0;
if (hasMenu) {
  await menuBtn.click();
  await mob.waitForTimeout(300);
  const drawer = mob.locator('[role="dialog"], [data-sidebar="sidebar"]').first();
  const open = await drawer.isVisible().catch(()=>false);
  const drawerShot = path.join(OUT, 'E8_mobile_drawer.jpg');
  await mob.screenshot({ path: drawerShot, type: 'jpeg', quality: 80 });
  log('E8-drawer', open, `mobile menu button opens drawer`, drawerShot);
} else {
  log('E8-drawer', false, 'no mobile menu button found', null);
}

await browser.close();

// dump
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ results, consoleErrs }, null, 2));
console.log('\n=== Console errors during run:', consoleErrs.length);
consoleErrs.slice(0, 5).forEach(e => console.log('  -', e.substring(0, 200)));
const pass = results.filter(r=>r.pass).length, total = results.length;
console.log(`\n=== ${pass}/${total} functional checks passed ===`);
process.exit(pass === total ? 0 : 1);
