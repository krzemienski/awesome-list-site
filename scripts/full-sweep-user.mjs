import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:5000';
const OUT = '_validation/full-sweep';
const SHOTS = `${OUT}/screenshots/user`;
fs.mkdirSync(SHOTS, { recursive: true });

const routes = [
  { path: '/', name: 'home', mustSee: ['Awesome', /Resources|video/i] },
  { path: '/about', name: 'about', mustSee: [/about/i] },
  { path: '/login', name: 'login', mustSee: ['Welcome', /Email/i] },
  { path: '/advanced', name: 'advanced', mustSee: [/Advanced|Filter|Export/i] },
  { path: '/submit', name: 'submit', mustSee: [/Submit|Resource/i] },
  { path: '/journeys', name: 'journeys', mustSee: [/Journey|Learning/i] },
  { path: '/journey/6', name: 'journey-detail', mustSee: [/Streaming|Fundamentals|Step/i] },
  { path: '/settings/theme', name: 'theme', mustSee: [/Theme|Font|Color/i] },
  { path: '/category/intro-learning', name: 'category', mustSee: [/View Details|Intro/i] },
  { path: '/subcategory/learning-resources', name: 'subcategory', mustSee: [/Learning/i] },
  { path: '/not-a-real-route', name: '404', mustSee: [/.+/] },
];

const VIEWPORT = process.env.VIEWPORT || 'desktop';
const breakpoints = VIEWPORT === 'mobile'
  ? [{ w: 375, h: 800, label: 'mobile' }]
  : [{ w: 1280, h: 800, label: 'desktop' }];

const results = [];
const browser = await chromium.launch({ headless: true });

for (const bp of breakpoints) {
  const ctx = await browser.newContext({ viewport: { width: bp.w, height: bp.h } });
  for (const r of routes) {
    const page = await ctx.newPage();
    const consoleErrs = [];
    const pageErrs = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 200)); });
    page.on('pageerror', e => pageErrs.push(e.message.slice(0, 200)));
    let status = 'PASS';
    let mustSeeFound = [];
    let mustSeeMissing = [];
    try {
      const resp = await page.goto(BASE + r.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const httpStatus = resp?.status() || 0;
      await page.waitForTimeout(500);
      const bodyText = await page.evaluate(() => document.body.innerText);
      for (const m of r.mustSee) {
        const ok = typeof m === 'string' ? bodyText.includes(m) : m.test(bodyText);
        (ok ? mustSeeFound : mustSeeMissing).push(String(m));
      }
      if (mustSeeMissing.length && r.name !== '404') status = 'PARTIAL';
      if (consoleErrs.length || pageErrs.length) status = 'FAIL';
      await page.screenshot({ path: `${SHOTS}/${r.name}_${bp.label}.jpg`, quality: 70, fullPage: false });
      results.push({ route: r.path, viewport: bp.label, httpStatus, status, mustSeeFound, mustSeeMissing, consoleErrs, pageErrs });
    } catch (e) {
      results.push({ route: r.path, viewport: bp.label, status: 'FAIL', error: e.message.slice(0, 200) });
    } finally {
      await page.close();
    }
  }
  await ctx.close();
}

// Interactive: search dialog
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx2.newPage();
const ie = []; p.on('pageerror', e => ie.push(e.message));
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p.keyboard.press('Meta+K');
await p.waitForTimeout(500);
const cmdkOpen = await p.evaluate(() => !!document.querySelector('[role="dialog"]'));
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
await p.evaluate(() => document.body.focus());
await p.keyboard.press('/');
await p.waitForTimeout(500);
const slashOpen = await p.evaluate(() => !!document.querySelector('[role="dialog"]'));
await p.keyboard.press('Escape');
results.push({ test: 'search-keys', cmdkOpen, slashOpen, pageErrs: ie, status: cmdkOpen && slashOpen ? 'PASS' : 'PARTIAL' });

// Category drilldown
await p.goto(BASE + '/category/intro-learning', { waitUntil: 'domcontentloaded' });
const viewDetailsCount = await p.evaluate(() => {
  const links = document.querySelectorAll('a[href^="/resource/"]').length;
  const viewBtns = Array.from(document.querySelectorAll('button')).filter(b => /view details/i.test(b.textContent || '')).length;
  return links + viewBtns;
});
results.push({ test: 'category-resources-rendered', viewDetailsCount, status: viewDetailsCount > 0 ? 'PASS' : 'FAIL' });

// Resource detail (pick first real resource)
const apiRes = await fetch(BASE + '/api/resources?limit=1').then(r => r.json()).catch(() => null);
const firstId = apiRes?.resources?.[0]?.id || apiRes?.[0]?.id;
if (firstId) {
  await p.goto(BASE + `/resource/${firstId}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(500);
  const txt = await p.evaluate(() => document.body.innerText);
  results.push({ test: 'resource-detail', resourceId: firstId, hasTitle: txt.length > 100, status: txt.length > 100 ? 'PASS' : 'FAIL' });
}

await ctx2.close();
await browser.close();

const suffix = VIEWPORT === 'mobile' ? '-mobile' : '-desktop';
fs.writeFileSync(`${OUT}/05-user-playwright${suffix}.json`, JSON.stringify(results, null, 2));
const fails = results.filter(r => r.status === 'FAIL').length;
const partials = results.filter(r => r.status === 'PARTIAL').length;
const passes = results.filter(r => r.status === 'PASS').length;
console.log(`USER SWEEP: pass=${passes} partial=${partials} fail=${fails}`);
results.filter(r => r.status !== 'PASS').forEach(r => console.log('  ', JSON.stringify(r).slice(0, 300)));
