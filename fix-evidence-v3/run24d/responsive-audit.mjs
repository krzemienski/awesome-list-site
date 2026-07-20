import { chromium } from '/home/runner/workspace/node_modules/playwright/index.mjs';
import fs from 'fs';

const BASE = 'http://localhost:5000';
const EXE = '/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const OUT = '/tmp/r24d/evidence';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const log = (k, pass, detail) => { results.push({ k, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${k} :: ${detail}`); };

const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext();
const res = await ctx.request.post(`${BASE}/api/auth/local/login`, { data: { email: 'admin@example.com', password: process.env.ADMIN_PASSWORD }, headers: { 'Content-Type': 'application/json' } });
console.log('login', res.status());

// ---- R5-026: profile header overlap 640..1024 ----
const page = await ctx.newPage();
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
await page.waitForTimeout(1200);
for (const w of [640, 700, 768, 812, 860, 900, 1024, 1280, 1440]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(350);
  const r = await page.evaluate(() => {
    const name = document.querySelector('h1');
    const emailEl = [...document.querySelectorAll('span')].find(s => s.textContent.includes('@') && s.querySelector('svg'));
    const settingsBtn = [...document.querySelectorAll('button, a')].find(b => /settings/i.test(b.textContent) && b.closest('.flex.flex-wrap.gap-2'));
    const logoutBtn = [...document.querySelectorAll('button')].find(b => /log ?out/i.test(b.textContent));
    const rect = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
    const overlap = (a, b) => a && b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
    const nr = rect(name), er = rect(emailEl), sr = rect(settingsBtn), lr = rect(logoutBtn);
    const nameVisible = nr && nr.w > 20 && nr.h > 5;
    const bad = [[er, sr, 'email-settings'], [er, lr, 'email-logout'], [nr, sr, 'name-settings'], [nr, lr, 'name-logout']].filter(([a, b]) => overlap(a, b)).map(x => x[2]);
    const doc = document.documentElement;
    const hOverflow = doc.scrollWidth - doc.clientWidth;
    return { nameVisible, nameW: nr?.w, bad, hOverflow, emailRect: er, settingsRect: sr };
  });
  log(`profile@${w}`, r.nameVisible && r.bad.length === 0 && r.hOverflow <= 0,
    `nameW=${Math.round(r.nameW || 0)} overlaps=[${r.bad}] hOverflow=${r.hOverflow} email=${JSON.stringify(r.emailRect && { l: Math.round(r.emailRect.l), r: Math.round(r.emailRect.r), t: Math.round(r.emailRect.t) })} settings=${JSON.stringify(r.settingsRect && { l: Math.round(r.settingsRect.l), t: Math.round(r.settingsRect.t) })}`);
  if ([700, 812, 900].includes(w)) await page.screenshot({ path: `${OUT}/profile-${w}.png` });
}

// ---- R5-054: tabs radius when wrapped ----
for (const [w, route, name] of [[375, '/profile', 'tabs-profile-375'], [500, '/profile', 'tabs-profile-500'], [768, '/admin', 'tabs-admin-768'], [1440, '/profile', 'tabs-profile-1440']]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const list = document.querySelector('[role="tablist"]');
    if (!list) return null;
    const s = getComputedStyle(list);
    const rows = new Set([...list.querySelectorAll('[role="tab"]')].map(t => Math.round(t.getBoundingClientRect().top)));
    return { radius: s.borderRadius, wrapped: rows.size > 1, h: list.getBoundingClientRect().height };
  });
  if (!r) { log(name, false, 'no tablist found'); continue; }
  const radPx = parseFloat(r.radius);
  const pass = w >= 1280 ? radPx > 100 || r.radius.includes('9999') : radPx <= 16;
  log(name, pass, `radius=${r.radius} wrapped=${r.wrapped} h=${Math.round(r.h)}`);
  await page.locator('[role="tablist"]').first().screenshot({ path: `${OUT}/${name}.png` }).catch(() => {});
}

// ---- R5-057: breadcrumb at <=375 ----
const resPage = await ctx.newPage();
await resPage.setViewportSize({ width: 375, height: 812 });
await resPage.goto(`${BASE}/resource/187906`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
await resPage.waitForTimeout(1000);
let r = await resPage.evaluate(() => {
  const m = document.querySelector('[data-testid="breadcrumb-mobile-current"]');
  const rect = m?.getBoundingClientRect();
  const span = m?.querySelector('span');
  return { exists: !!m, w: rect?.width, h: rect?.height, text: span?.textContent?.slice(0, 40), title: span?.getAttribute('title')?.slice(0, 40), ariaCurrent: span?.getAttribute('aria-current') };
});
log('breadcrumb-mobile@375', r.exists && r.w > 10 && r.h > 10, JSON.stringify(r));
await resPage.screenshot({ path: `${OUT}/breadcrumb-375.png` });
await resPage.setViewportSize({ width: 320, height: 700 });
await resPage.waitForTimeout(400);
r = await resPage.evaluate(() => {
  const m = document.querySelector('[data-testid="breadcrumb-mobile-current"]');
  const rect = m?.getBoundingClientRect();
  const doc = document.documentElement;
  return { w: rect?.width, h: rect?.height, hOverflow: doc.scrollWidth - doc.clientWidth };
});
log('breadcrumb-mobile@320', r.w > 10 && r.h > 10 && r.hOverflow <= 0, JSON.stringify(r));

// title attrs on desktop crumbs + no role="menu" misuse
await resPage.setViewportSize({ width: 1440, height: 900 });
await resPage.waitForTimeout(500);
r = await resPage.evaluate(() => {
  const crumbs = [...document.querySelectorAll('nav[aria-label="breadcrumb"] a, nav[aria-label="breadcrumb"] [aria-current="page"]')];
  const withTitle = crumbs.filter(c => c.getAttribute('title'));
  const menus = [...document.querySelectorAll('nav[aria-label="breadcrumb"] [role="menu"]')];
  return { crumbCount: crumbs.length, withTitle: withTitle.length, sample: withTitle[0]?.getAttribute('title')?.slice(0, 40), staticMenus: menus.length };
});
log('breadcrumb-titles@1440', r.crumbCount > 0 && r.withTitle === r.crumbCount && r.staticMenus === 0, JSON.stringify(r));

// ---- R5-056: forced-colors button borders ----
const fcPage = await ctx.newPage();
await fcPage.emulateMedia({ forcedColors: 'active' });
await fcPage.setViewportSize({ width: 1440, height: 900 });
await fcPage.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
await fcPage.waitForTimeout(1200);
r = await fcPage.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 10 && r.height > 10; }).slice(0, 30);
  const noBorder = btns.filter(b => { const s = getComputedStyle(b); return parseFloat(s.borderTopWidth) < 1; });
  return { checked: btns.length, noBorder: noBorder.length, sample: noBorder[0] ? (noBorder[0].textContent || noBorder[0].getAttribute('aria-label') || '?').slice(0, 30) : null };
});
log('forced-colors-home', r.checked > 0 && r.noBorder === 0, JSON.stringify(r));
await fcPage.screenshot({ path: `${OUT}/forced-colors-home.png` });

fs.writeFileSync(`${OUT}/responsive-audit.json`, JSON.stringify(results, null, 2));
console.log(`\nTOTAL ${results.length}, FAIL ${results.filter(x => !x.pass).length}`);
await browser.close();
