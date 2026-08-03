// Task #254: 375px touch-target sweep (32px floor, WCAG 2.5.8 inline-link
// exception) across the surfaces run26 never measured: /profile, /admin,
// /journeys/:id, /submit, /theme-settings, /advanced, /resource/:id.
// Requires the dev server on :5000 and ADMIN_PASSWORD. Exits 1 on any violation.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:5000';
const OUT = '/tmp/validation/touch-target-sweep';
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  const cache = path.join(ROOT, '.cache/ms-playwright');
  const dir = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
  if (!dir) throw new Error('No chromium-* dir in .cache/ms-playwright');
  return path.join(cache, dir, 'chrome-linux64/chrome');
}

if (!process.env.ADMIN_PASSWORD) { console.error('FATAL: ADMIN_PASSWORD env var not set'); process.exit(1); }
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
  if (!up) { console.error(`FATAL: app not reachable (${lastErr})`); process.exit(1); }
}

async function firstResourceId() {
  const r = await fetch(`${BASE}/api/resources?limit=1`).then(x => x.json()).catch(() => null);
  return r?.resources?.[0]?.id ?? r?.[0]?.id ?? 187906;
}
async function firstJourneyId() {
  const r = await fetch(`${BASE}/api/journeys`).then(x => x.json()).catch(() => null);
  return r?.[0]?.id ?? 7;
}

const browser = await chromium.launch({ headless: true, executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage'] });

const SESSION_FILE = '/tmp/validation/admin-session.json';
async function newAdminContext() {
  if (fs.existsSync(SESSION_FILE)) {
    try {
      const c = await browser.newContext({ storageState: SESSION_FILE, viewport: { width: 375, height: 800 } });
      const me = await c.request.get(`${BASE}/api/auth/user`).then(r => r.json()).catch(() => null);
      if (me?.user?.role === 'admin' || me?.role === 'admin') { console.log('admin session reused from cache'); return c; }
      await c.close();
    } catch { /* fall through */ }
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    const c = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const res = await c.request.post(`${BASE}/api/auth/local/login`, { data: { email: 'admin@example.com', password: process.env.ADMIN_PASSWORD }, headers: { 'Content-Type': 'application/json', Origin: BASE } });
    if (res.ok()) {
      await c.storageState({ path: SESSION_FILE });
      return c;
    }
    await c.close();
    if (res.status() !== 429) { console.error('FATAL: admin login failed', res.status()); process.exit(1); }
    const wait = (Number(res.headers()['retry-after']) || 20) * 1000 + Math.random() * 2000;
    console.log(`login 429, retrying in ${Math.round(wait / 1000)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  console.error('FATAL: admin login still rate-limited'); process.exit(1);
}

// Same probe as run26 BUG-024: every visible a/button/input(+select/textarea),
// min dimension < 32 is a violation, EXCEPT inline links inside a text block
// (WCAG 2.5.8 inline exception).
const PROBE = `(() => {
  const els = Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="radio"], [role="tab"]'));
  const out = [];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none' && el.tagName !== 'INPUT') continue;
    // Radix renders hidden native <select>s (aria-hidden, clipped to 1x1) behind
    // its custom triggers — they are not touch targets.
    if (el.closest('[aria-hidden="true"]') || el.getAttribute('aria-hidden') === 'true') continue;
    // off-screen elements (sr-only, moved out of flow) don't count
    if (r.bottom < 0 || r.right < 0) continue;
    // WCAG 2.5.8 inline exception: an inline element whose parent is a text block
    const isInline = cs.display.startsWith('inline') && !cs.display.includes('flex') && !cs.display.includes('block') && !cs.display.includes('grid');
    if (el.tagName === 'A' && isInline) {
      const p = el.parentElement;
      if (p) {
        const textLen = Array.from(p.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim().length).reduce((a,b)=>a+b,0);
        if (textLen > 0) continue; // sits inline within a sentence
      }
    }
    if (Math.min(r.width, r.height) < 31.5) {
      out.push({
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
        text: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 60),
        testid: el.getAttribute('data-testid') || '',
        cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().slice(0, 120),
      });
    }
  }
  return out;
})()`;

const ctx = await newAdminContext();
const page = await ctx.newPage();
const rid = await firstResourceId();
const jid = await firstJourneyId();

const routes = [
  '/profile',
  '/admin',
  `/journey/${jid}`,
  '/journeys',
  '/submit',
  '/theme-settings',
  '/advanced',
  `/resource/${rid}`,
];

let failures = 0;
const report = {};
for (const route of routes) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // dismiss consent banner if present (it eats clicks / adds its own controls once)
  const consent = page.locator('[data-testid="button-consent-accept"], button:has-text("Accept all")').first();
  if (await consent.isVisible().catch(() => false)) { await consent.click().catch(() => {}); await page.waitForTimeout(400); }
  const violations = await page.evaluate(PROBE);
  report[route] = violations;
  const pass = violations.length === 0;
  if (!pass) failures += violations.length;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${route} :: ${violations.length} violations`);
  for (const v of violations) console.log(`   - <${v.tag}> ${v.w}x${v.h} "${v.text}" [${v.testid}] ${v.cls}`);

  // Admin: also sweep each tab panel
  if (route === '/admin') {
    const tabs = await page.locator('[role="tab"]').all();
    for (let i = 0; i < tabs.length; i++) {
      const label = ((await tabs[i].textContent()) || `tab${i}`).trim();
      await tabs[i].click().catch(() => {});
      await page.waitForTimeout(900);
      const sel = await tabs[i].getAttribute('aria-selected');
      if (sel !== 'true') { console.log(`   (skip tab "${label}" — did not activate)`); continue; }
      const tv = await page.evaluate(PROBE);
      report[`/admin::${label}`] = tv;
      if (tv.length) failures += tv.length;
      console.log(`${tv.length === 0 ? 'PASS' : 'FAIL'} /admin tab "${label}" :: ${tv.length} violations`);
      for (const v of tv) console.log(`   - <${v.tag}> ${v.w}x${v.h} "${v.text}" [${v.testid}] ${v.cls}`);
    }
  }
  // Profile: sweep each tab too
  if (route === '/profile') {
    const tabs = await page.locator('[role="tab"]').all();
    for (let i = 0; i < tabs.length; i++) {
      const label = ((await tabs[i].textContent()) || `tab${i}`).trim();
      await tabs[i].click().catch(() => {});
      await page.waitForTimeout(700);
      const sel = await tabs[i].getAttribute('aria-selected');
      if (sel !== 'true') { console.log(`   (skip tab "${label}" — did not activate)`); continue; }
      const tv = await page.evaluate(PROBE);
      report[`/profile::${label}`] = tv;
      if (tv.length) failures += tv.length;
      console.log(`${tv.length === 0 ? 'PASS' : 'FAIL'} /profile tab "${label}" :: ${tv.length} violations`);
      for (const v of tv) console.log(`   - <${v.tag}> ${v.w}x${v.h} "${v.text}" [${v.testid}] ${v.cls}`);
    }
  }
}

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
console.log(failures === 0 ? 'SWEEP PASS — zero violations' : `SWEEP FAIL — ${failures} violations`);
process.exit(failures === 0 ? 0 : 1);
