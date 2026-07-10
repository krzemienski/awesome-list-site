import { chromium } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch({
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const out = [];
const log = (id, pass, detail) => { out.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };

// C1: Login page — OAuth buttons removed, local form present
await page.goto('http://localhost:5000/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="login-card"]', { timeout: 10000 });
const loginInfo = await page.evaluate(() => ({
  text: document.body.innerText,
  hasEmail: !!document.querySelector('[data-testid="input-email"]'),
  hasPassword: !!document.querySelector('[data-testid="input-password"]'),
  hasLoginBtn: !!document.querySelector('[data-testid="button-login"]'),
  buttons: [...document.querySelectorAll('button, a')].map(b => b.textContent.trim()).filter(Boolean),
}));
const oauthPresent = /sign in with|continue with|github|google|apple|replit/i.test(loginInfo.buttons.join('|'));
log('C1-oauth-removed', !oauthPresent, `oauth-like buttons: ${oauthPresent ? loginInfo.buttons.filter(b => /sign in with|continue with|github|google|apple|replit/i.test(b)).join(',') : 'none'}`);
log('C1-local-form', loginInfo.hasEmail && loginInfo.hasPassword && loginInfo.hasLoginBtn, `email=${loginInfo.hasEmail} pw=${loginInfo.hasPassword} btn=${loginInfo.hasLoginBtn}`);

// C2: anon /submit — login-gated
await page.goto('http://localhost:5000/submit', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const submitInfo = await page.evaluate(() => ({
  path: location.pathname,
  alert: document.querySelector('[data-testid="alert-login-required"]')?.textContent?.trim() || '',
  hasLoginLink: !!document.querySelector('[data-testid="link-login"]'),
  submitDisabled: document.querySelector('[data-testid="button-submit"]')?.disabled ?? null,
}));
const gated = submitInfo.path === '/login' || (submitInfo.alert.length > 0 && submitInfo.hasLoginLink);
log('C2-submit-anon-gated', gated, `path=${submitInfo.path} alert="${submitInfo.alert.slice(0, 60)}" loginLink=${submitInfo.hasLoginLink} submitDisabled=${submitInfo.submitDisabled}`);

// C3: ⌘K search dialog
await page.goto('http://localhost:5000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.querySelector('h1'), { timeout: 10000 });
await page.waitForTimeout(1500);
await page.keyboard.press('Control+k');
await page.waitForTimeout(800);
let dialogOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"], [cmdk-root]'));
if (!dialogOpen) { await page.keyboard.press('Meta+k'); await page.waitForTimeout(800); dialogOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"], [cmdk-root]')); }
log('C3-cmdk-opens', dialogOpen, `dialog after Ctrl/Meta+K: ${dialogOpen}`);
if (dialogOpen) {
  await page.keyboard.type('ffmpeg', { delay: 30 });
  await page.waitForTimeout(2000);
  const results = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"], [cmdk-root]');
    const items = dlg ? dlg.querySelectorAll('[cmdk-item], [role="option"], a[href*="/resource/"]') : [];
    return { count: items.length, first: items[0]?.textContent?.replace(/\s+/g, ' ').slice(0, 80) || '' };
  });
  log('C3-cmdk-results', results.count > 0, `${results.count} results for "ffmpeg", first="${results.first}"`);
  await page.keyboard.press('Escape');
}

// C4: theme switcher — 5 systems via /settings/theme
await page.goto('http://localhost:5000/settings/theme', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const systems = ['editorial', 'terminal', 'geist', 'brutalist', 'swiss'];
const switched = [];
for (const sys of systems) {
  const clicked = await page.evaluate((s) => {
    const els = [...document.querySelectorAll('button, [role="radio"], [data-testid]')];
    const el = els.find(e => (e.getAttribute('data-testid') || '').toLowerCase().includes(s) || e.textContent.trim().toLowerCase() === s);
    if (el) { el.click(); return true; }
    return false;
  }, sys);
  await page.waitForTimeout(600);
  const attr = await page.evaluate(() => document.documentElement.getAttribute('data-system'));
  switched.push(`${sys}:clicked=${clicked},attr=${attr}`);
  if (clicked && attr !== sys) log(`C4-system-${sys}`, false, `clicked but data-system=${attr}`);
  else if (clicked) log(`C4-system-${sys}`, true, `data-system=${attr}`);
  else log(`C4-system-${sys}`, false, `no clickable element found`);
}
// restore default
await page.evaluate(() => {
  const els = [...document.querySelectorAll('button, [role="radio"], [data-testid]')];
  const el = els.find(e => (e.getAttribute('data-testid') || '').toLowerCase().includes('editorial') || e.textContent.trim().toLowerCase() === 'editorial');
  el?.click();
});
await page.waitForTimeout(500);

// C5: pagination on encoding-codecs (14 pages @ 24/page for 325)
await page.goto('http://localhost:5000/category/encoding-codecs', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => (document.querySelector('[data-testid="text-results-count"]')?.textContent || '').includes('325'), { timeout: 15000 }).catch(() => {});
const pageInfo1 = await page.evaluate(() => ({
  badge: document.querySelector('[data-testid="text-results-count"]')?.textContent?.trim() || '',
  pageLabel: (document.body.innerText.match(/Page \d+ of \d+/) || [''])[0],
  firstTitle: document.querySelector('[data-testid*="card"] h3, [data-testid*="card"] a, .card h3')?.textContent?.trim().slice(0, 60) || '',
}));
log('C5-page1', /Page 1 of 14/.test(pageInfo1.pageLabel) && /325/.test(pageInfo1.badge), `badge="${pageInfo1.badge}" label="${pageInfo1.pageLabel}" first="${pageInfo1.firstTitle}"`);
const titles = [pageInfo1.firstTitle];
for (let i = 2; i <= 3; i++) {
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, a')];
    const next = btns.find(b => /next/i.test(b.getAttribute('aria-label') || '') || /^next$/i.test(b.textContent.trim()) || (b.getAttribute('data-testid') || '').includes('next'));
    next?.click();
  });
  await page.waitForTimeout(1500);
  const pi = await page.evaluate(() => ({
    pageLabel: (document.body.innerText.match(/Page \d+ of \d+/) || [''])[0],
    firstTitle: document.querySelector('[data-testid*="card"] h3, [data-testid*="card"] a, .card h3')?.textContent?.trim().slice(0, 60) || '',
  }));
  titles.push(pi.firstTitle);
  log(`C5-page${i}`, new RegExp(`Page ${i} of 14`).test(pi.pageLabel) && pi.firstTitle !== titles[i - 2], `label="${pi.pageLabel}" first="${pi.firstTitle}"`);
}

fs.writeFileSync('_validation/audit2/phaseC-anon.json', JSON.stringify(out, null, 1));
const fails = out.filter(o => !o.pass);
console.log(`\nANON PHASE C: ${out.length - fails.length}/${out.length} pass`);
await browser.close();
