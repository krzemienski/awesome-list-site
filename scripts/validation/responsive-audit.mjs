// Repeatable responsive/a11y validation (from fix-evidence-v3/run24d/responsive-audit.mjs).
// Guards: profile header overlap 640..1440 (R5-026), tablist radius when wrapped (R5-054),
// mobile breadcrumb at 375/320 + desktop crumb titles (R5-057), forced-colors button borders (R5-056).
// Requires the dev server on :5000 and ADMIN_PASSWORD. Exits 1 on any failure.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:5000';
const OUT = '/tmp/validation/responsive-audit';
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  const cache = path.join(ROOT, '.cache/ms-playwright');
  const dir = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
  if (!dir) throw new Error('No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium');
  return path.join(cache, dir, 'chrome-linux64/chrome');
}

// Wait up to 120s for the server so this can run in parallel with app startup.
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
  if (!up) { console.error(`FATAL: app not reachable at ${BASE} after 120s (${lastErr}) — start the "Start application" workflow`); process.exit(1); }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const retryableStatus = (status) => status === 429 || status === 503;

async function fetchJsonWithRetry(route) {
  const deadline = Date.now() + 90_000;
  let last = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}${route}`);
      if (!retryableStatus(response.status)) return await response.json();
      last = `status ${response.status}`;
      const retryAfter = Number(response.headers.get('retry-after') || 1);
      await sleep(Math.max(1000, Math.min(retryAfter * 1000, 5000)));
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      await sleep(1500);
    }
  }
  throw new Error(`Unable to fetch ${route} (${last})`);
}

async function waitForReadiness() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/health/ready`);
      if (response.ok) return;
      const retryAfter = Number(response.headers.get('retry-after') || 1);
      await sleep(Math.max(1000, Math.min(retryAfter * 1000, 5000)));
    } catch {
      await sleep(1500);
    }
  }
  throw new Error('Application did not regain readiness for responsive audit');
}

async function firstResourceId() {
  const r = await fetchJsonWithRetry('/api/resources?limit=1');
  const id = r?.resources?.[0]?.id ?? r?.[0]?.id;
  if (!id) throw new Error('Catalog returned no resource for responsive audit');
  return id;
}

const results = [];
const log = (k, pass, detail) => { results.push({ k, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${k} :: ${detail}`); };

const browser = await chromium.launch({ headless: true, executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
// Login is rate-limited (429, 5/min burst + 20/15min window). Repeated validation
// runs exhaust the 15-minute window, so cache the admin session cookie across runs
// (shared by print-audit + responsive-audit) and only log in when the cached
// session is missing/expired. On 429, honor Retry-After and back off with jitter.
const SESSION_FILE = '/tmp/validation/admin-session.json';
async function newAdminContext() {
  const fsm = await import('node:fs');
  if (fsm.existsSync(SESSION_FILE)) {
    try {
      const c = await browser.newContext({ storageState: SESSION_FILE });
      const me = await c.request.get(`${BASE}/api/auth/user`).then(r => r.json()).catch(() => null);
      if (me?.user?.role === 'admin') { console.log('admin session reused from cache'); return c; }
      await c.close();
    } catch { /* stale/corrupt state — fall through to fresh login */ }
  }
  const c = await browser.newContext();
  let loggedIn = false;
  for (let i = 0; i < 8 && !loggedIn; i++) {
    const res = await c.request.post(`${BASE}/api/auth/local/login`, { data: { email: 'admin@example.com', password: process.env.ADMIN_PASSWORD }, headers: { 'Content-Type': 'application/json', Origin: BASE } });
    if (res.ok()) { loggedIn = true; break; }
    if (res.status() !== 429) { console.error('FATAL: admin login failed', res.status()); process.exit(1); }
    const retryAfter = Number(res.headers()['retry-after']);
    const wait = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 15000 * (i + 1)) + Math.floor(Math.random() * 5000);
    console.log(`login 429, retrying in ${Math.round(wait / 1000)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  if (!loggedIn) { console.error('FATAL: admin login still rate-limited after retries'); process.exit(1); }
  fsm.mkdirSync('/tmp/validation', { recursive: true });
  await c.storageState({ path: SESSION_FILE });
  return c;
}
const ctx = await newAdminContext();

async function gotoPage(page, route) {
  const deadline = Date.now() + 90_000;
  let last = 'no response';
  while (Date.now() < deadline) {
    try {
      await waitForReadiness();
      const response = await page.goto(`${BASE}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      const status = response?.status() ?? 0;
      if (status > 0 && !retryableStatus(status)) {
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        return;
      }
      last = `status ${status}`;
      const retryAfter = Number(response?.headers()['retry-after'] || 1);
      await page.waitForTimeout(Math.max(1000, Math.min(retryAfter * 1000, 5000)));
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
      await page.waitForTimeout(1500);
    }
  }
  throw new Error(`Unable to load ${route} for responsive audit (${last})`);
}

async function requestWithRetry(request, method, route, data) {
  const deadline = Date.now() + 90_000;
  let last = 'no response';
  while (Date.now() < deadline) {
    const response = await request.fetch(`${BASE}${route}`, {
      method,
      data,
      headers: { 'Content-Type': 'application/json', Origin: BASE },
    });
    if (!retryableStatus(response.status())) return response;
    last = `status ${response.status()}`;
    const retryAfter = Number(response.headers()['retry-after'] || 1);
    await sleep(Math.max(1000, Math.min(retryAfter * 1000, 5000)));
  }
  throw new Error(`${method} ${route} remained unavailable (${last})`);
}

// ---- R5-026: profile header overlap 640..1440 ----
const page = await ctx.newPage();
await gotoPage(page, '/profile');
await page.waitForTimeout(1200);
// Cold-boot guard: right after a server (re)start the profile page can still be
// showing its loading skeleton when the first viewports are measured, which reads
// nameW=0 and false-fails. Wait for the h1 to carry real text before measuring.
let profileReady = await page.waitForFunction(
  () => (document.querySelector('h1')?.textContent || '').trim().length > 0,
  { timeout: 30000 },
).then(() => true).catch(() => false);
if (!profileReady) {
  console.log('profile h1 empty after dependency pressure — waiting for readiness and reloading');
  await waitForReadiness();
  await gotoPage(page, '/profile');
  profileReady = await page.waitForFunction(
    () => (document.querySelector('h1')?.textContent || '').trim().length > 0,
    { timeout: 30000 },
  ).then(() => true).catch(() => false);
  if (!profileReady) {
    console.log('profile h1 still empty after a ready reload — measuring as genuine failure');
  }
}
const measureProfile = () => page.evaluate(() => {
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
    return { nameVisible, nameW: nr?.w, bad, hOverflow };
  });
for (const w of [640, 700, 768, 812, 860, 900, 1024, 1280, 1440]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.waitForTimeout(350);
  let r = await measureProfile();
  if (!r.nameW) {
    // one-shot retry: the skeleton may have just swapped in; give it a moment
    await page.waitForFunction(
      () => (document.querySelector('h1')?.textContent || '').trim().length > 0,
      { timeout: 10000 },
    ).catch(() => {});
    await page.waitForTimeout(350);
    r = await measureProfile();
  }
  log(`profile@${w}`, r.nameVisible && r.bad.length === 0 && r.hOverflow <= 0,
    `nameW=${Math.round(r.nameW || 0)} overlaps=[${r.bad}] hOverflow=${r.hOverflow}`);
  if ([700, 812, 900].includes(w)) await page.screenshot({ path: `${OUT}/profile-${w}.png` });
}

// ---- R5-054: tabs radius when wrapped ----
for (const [w, route, name] of [[375, '/profile', 'tabs-profile-375'], [500, '/profile', 'tabs-profile-500'], [768, '/admin', 'tabs-admin-768'], [1440, '/profile', 'tabs-profile-1440']]) {
  await page.setViewportSize({ width: w, height: 900 });
  await gotoPage(page, route);
  await page.waitForSelector('[role="tablist"]', { timeout: 15000 }).catch(() => {});
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
const resourceRoute = `/resource/${await firstResourceId()}`;
const resPage = await ctx.newPage();
await resPage.setViewportSize({ width: 375, height: 812 });
await gotoPage(resPage, resourceRoute);
await resPage.waitForTimeout(1000);
let r = await resPage.evaluate(() => {
  const m = document.querySelector('[data-testid="breadcrumb-mobile-current"]');
  const rect = m?.getBoundingClientRect();
  const span = m?.querySelector('span');
  return { exists: !!m, w: rect?.width, h: rect?.height, text: span?.textContent?.slice(0, 40) };
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

// Title attrs on desktop crumbs + no role="menu" misuse.
await resPage.setViewportSize({ width: 1440, height: 900 });
await resPage.waitForTimeout(500);
r = await resPage.evaluate(() => {
  const crumbs = [...document.querySelectorAll('nav[aria-label="breadcrumb"] a, nav[aria-label="breadcrumb"] [aria-current="page"]')];
  const withTitle = crumbs.filter(c => c.getAttribute('title'));
  const menus = [...document.querySelectorAll('nav[aria-label="breadcrumb"] [role="menu"]')];
  return { crumbCount: crumbs.length, withTitle: withTitle.length, staticMenus: menus.length };
});
log('breadcrumb-titles@1440', r.crumbCount > 0 && r.withTitle === r.crumbCount && r.staticMenus === 0, JSON.stringify(r));

// ---- R5-056: forced-colors button borders ----
const fcPage = await ctx.newPage();
await fcPage.emulateMedia({ forcedColors: 'active' });
await fcPage.setViewportSize({ width: 1440, height: 900 });
await gotoPage(fcPage, '/');
await fcPage.waitForTimeout(1200);
r = await fcPage.evaluate(() => {
  const btns = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 10 && r.height > 10; }).slice(0, 30);
  const noBorder = btns.filter(b => { const s = getComputedStyle(b); return parseFloat(s.borderTopWidth) < 1; });
  return { checked: btns.length, noBorder: noBorder.length, sample: noBorder[0] ? (noBorder[0].textContent || noBorder[0].getAttribute('aria-label') || '?').slice(0, 30) : null };
});
log('forced-colors-home', r.checked > 0 && r.noBorder === 0, JSON.stringify(r));
await fcPage.screenshot({ path: `${OUT}/forced-colors-home.png` });

// ---- R4-017: seeded pathological-URL admin dialog overflow guard ----
// Seeds a pending resource with an unbroken ~1,950-char URL through the real
// submission API, opens the three admin approval dialogs (view details /
// approve / reject) at 1440/768/375, and asserts the dialog never scrolls
// horizontally and the document never overflows the viewport. The seed is
// deleted through the admin API at the end regardless of pass/fail.
{
  // Unique per run in BOTH url and title: POST /api/resources 409s on
  // duplicate url AND duplicate title, and this audit can run concurrently
  // (workflow + validation step) — a shared title would collide.
  const runTag = `${Date.now()}_${process.pid}`;
  const longUrl = `https://example.com/__qa_test_r4017_${runTag}/` + 'a'.repeat(1900);
  const catRes = await fetchJsonWithRetry('/api/resources?limit=1');
  const category = catRes?.resources?.[0]?.category ?? catRes?.[0]?.category ?? 'Learning Resources';
  let seedId = null;
  // try/finally: the DELETE must run even if a Playwright wait/click throws
  // mid-probe, or the __qa_test seed would linger in the pending queue (and in
  // the publish build container that queue is the PRODUCTION admin queue).
  try {
    const create = await requestWithRetry(ctx.request, 'POST', '/api/resources', {
      title: `__qa_test_r4017 dialog overflow probe ${runTag}`,
      url: longUrl,
      description: 'Seeded by responsive-audit to guard against dialog blowout from unbroken URLs; deleted at end of run.',
      category,
    });
    if (!create.ok()) {
      log('r4017-seed-create', false, `POST /api/resources -> ${create.status()}`);
    } else {
      seedId = (await create.json()).id;
      log('r4017-seed-create', true, `seeded pending resource ${seedId} (url ${longUrl.length} chars)`);
      const dlgPage = await ctx.newPage();
      // Radix keeps body{pointer-events:none} while a dialog's close animation
      // runs. The old fixed 300ms/500ms waits were enough in the workspace but
      // not in the slower publish build container (r4017-reject@375 flaked with
      // "dialog did not open" and blocked a publish on 2026-07-25): the force
      // click dispatched into the lingering pointer-events lock, so the next
      // dialog never opened. Condition-wait on real state instead of sleeping.
      const OPEN_DLG = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';
      // Returns true when no dialog is open and the lock is released; false on
      // timeout, so callers can FAIL instead of measuring a stale dialog under
      // the next check's name (false-pass guard).
      const waitDialogsClosed = async () => {
        return dlgPage.waitForFunction((sel) => {
          return !document.querySelector(sel) && getComputedStyle(document.body).pointerEvents !== 'none';
        }, OPEN_DLG, { timeout: 10000 }).then(() => true).catch(() => false);
      };
      try {
        for (const vw of [1440, 768, 375]) {
          await dlgPage.setViewportSize({ width: vw, height: 900 });
          await gotoPage(dlgPage, '/admin?tab=approvals');
          const rowOk = await dlgPage.waitForSelector(`[data-testid="row-pending-resource-${seedId}"]`, { timeout: 20000 }).then(() => true).catch(() => false);
          if (!rowOk) { log(`r4017-row@${vw}`, false, 'seeded pending row not rendered'); continue; }
          for (const [name, testid] of [
            ['details', `button-view-details-${seedId}`],
            ['approve', `button-approve-${seedId}`],
            ['reject', `button-reject-${seedId}`],
          ]) {
            const btn = dlgPage.locator(`[data-testid="${testid}"]`);
            if (!(await btn.count())) { log(`r4017-${name}@${vw}`, false, 'trigger not found'); continue; }
            await btn.scrollIntoViewIfNeeded().catch(() => {});
            // Ensure the previous dialog's close animation fully released the
            // pointer-events lock before clicking, then wait for the new
            // dialog to reach data-state="open" — with one retry click for
            // slow containers where the first click can still race the lock.
            const cleared = await waitDialogsClosed();
            if (!cleared) { log(`r4017-${name}@${vw}`, false, 'previous dialog never closed'); continue; }
            let clicked = false;
            let opened = false;
            for (let attempt = 0; attempt < 2 && !opened; attempt++) {
              clicked = await btn.click({ force: true, timeout: 10000 }).then(() => true).catch(() => false);
              if (!clicked) break;
              opened = await dlgPage.waitForSelector(OPEN_DLG, { timeout: 7000 }).then(() => true).catch(() => false);
            }
            if (!clicked) { log(`r4017-${name}@${vw}`, false, 'trigger not clickable'); continue; }
            const m = opened ? await dlgPage.evaluate((sel) => {
              const dlg = document.querySelector(sel);
              if (!dlg) return null;
              const doc = document.documentElement;
              return { sw: dlg.scrollWidth, cw: dlg.clientWidth, docOver: doc.scrollWidth - doc.clientWidth };
            }, OPEN_DLG).catch(() => null) : null;
            const pass = !!m && m.sw <= m.cw + 1 && m.docOver <= 0;
            log(`r4017-${name}@${vw}`, pass, m ? `dialog sw=${m.sw} cw=${m.cw} docOverflow=${m.docOver}` : 'dialog did not open');
            if (!pass) await dlgPage.screenshot({ path: `${OUT}/r4017-${name}-${vw}.png` }).catch(() => {});
            await dlgPage.keyboard.press('Escape').catch(() => {});
            await waitDialogsClosed();
          }
        }
      } finally {
        await dlgPage.close().catch(() => {});
      }
    }
  } finally {
    if (seedId != null) {
      const del = await requestWithRetry(ctx.request, 'DELETE', `/api/admin/resources/${seedId}`).catch(() => null);
      log('r4017-seed-delete', !!del && del.ok(), `DELETE /api/admin/resources/${seedId} -> ${del ? del.status() : 'request failed'}`);
    }
  }
}

// ---- Task 253: mobile drawer keyboard trap guard ----
// Guards the two silent focus-trap breakers fixed in task #245:
// (1) onOpenAutoFocus targeting a hidden zero-size link (trap never engages,
//     Tab walks the aria-hidden background), and
// (2) SidebarMenuButton tooltip mount/unmount on focus/blur tripping Radix
//     FocusScope's MutationObserver (Tab ping-pongs between the sheet
//     container and the first control — nav links unreachable).
// Opens the drawer at 375px, walks >=10 Tabs, and asserts BOTH zero focus
// escapes AND a growing count of unique focus stops ("0 escapes" alone passes
// when focus is stuck in a 2-element cycle). Then asserts Escape closes the
// drawer and returns focus to the hamburger trigger.
{
  const kbPage = await ctx.newPage();
  try {
    await kbPage.setViewportSize({ width: 375, height: 812 });
    await gotoPage(kbPage, '/');
    await kbPage.waitForTimeout(800);
    const trigger = kbPage.locator('button[data-sidebar="trigger"]').first();
    const trigOk = await trigger.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    if (!trigOk) {
      log('drawer-trap-open@375', false, 'hamburger trigger not visible at 375px');
    } else {
      await trigger.click();
      const SHEET = '[data-sidebar="sidebar"][data-mobile="true"][data-state="open"]';
      const opened = await kbPage.waitForSelector(SHEET, { timeout: 10000 }).then(() => true).catch(() => false);
      log('drawer-trap-open@375', opened, opened ? 'mobile drawer opened' : 'drawer did not open after trigger click');
      if (opened) {
        // Let the open animation + autofocus settle before sampling focus.
        await kbPage.waitForTimeout(600);
        const initial = await kbPage.evaluate((sel) => {
          const sheet = document.querySelector(sel);
          const ae = document.activeElement;
          return {
            inside: !!(sheet && ae && ae !== document.body && sheet.contains(ae)),
            tag: ae ? `${ae.tagName.toLowerCase()}${ae.getAttribute('data-testid') ? `[${ae.getAttribute('data-testid')}]` : ''}` : 'none',
          };
        }, SHEET);
        log('drawer-trap-autofocus@375', initial.inside, `initial focus=${initial.tag} insideSheet=${initial.inside}`);

        const TABS = 12;
        const stops = [];
        let escapes = 0;
        for (let i = 0; i < TABS; i++) {
          await kbPage.keyboard.press('Tab');
          await kbPage.waitForTimeout(120);
          const s = await kbPage.evaluate((sel) => {
            const sheet = document.querySelector(sel);
            const ae = document.activeElement;
            if (!ae || ae === document.body) return { inside: false, id: 'body' };
            const id = `${ae.tagName.toLowerCase()}#${ae.id || ''}@${ae.getAttribute('href') || ae.getAttribute('data-testid') || (ae.textContent || '').trim().slice(0, 30)}`;
            return { inside: !!(sheet && sheet.contains(ae)), id };
          }, SHEET);
          if (!s.inside) escapes++;
          stops.push(s.id);
        }
        const unique = new Set(stops).size;
        // Trap engaged + no 2-element ping-pong: require zero escapes and at
        // least 4 distinct stops across 12 Tabs (a stuck container<->link
        // cycle yields exactly 2; a healthy drawer has close btn + many links).
        const walkPass = escapes === 0 && unique >= 4;
        log('drawer-trap-walk@375', walkPass, `tabs=${TABS} escapes=${escapes} uniqueStops=${unique} stops=[${[...new Set(stops)].slice(0, 6).join(' | ')}...]`);
        if (!walkPass) await kbPage.screenshot({ path: `${OUT}/drawer-trap-walk.png` }).catch(() => {});

        // Escape closes the drawer and returns focus to the trigger.
        await kbPage.keyboard.press('Escape');
        const closed = await kbPage.waitForFunction((sel) => !document.querySelector(sel), SHEET, { timeout: 8000 }).then(() => true).catch(() => false);
        await kbPage.waitForTimeout(400); // onCloseAutoFocus re-resolves the live trigger
        const focusBack = await kbPage.evaluate(() => {
          const ae = document.activeElement;
          return { onTrigger: !!(ae && ae.getAttribute && ae.getAttribute('data-sidebar') === 'trigger'), tag: ae ? ae.tagName.toLowerCase() + (ae.getAttribute('data-sidebar') ? `[data-sidebar=${ae.getAttribute('data-sidebar')}]` : '') : 'none' };
        });
        log('drawer-trap-escape@375', closed && focusBack.onTrigger, `closed=${closed} focusAfterClose=${focusBack.tag}`);
        if (!(closed && focusBack.onTrigger)) await kbPage.screenshot({ path: `${OUT}/drawer-trap-escape.png` }).catch(() => {});
      }
    }
  } finally {
    await kbPage.close().catch(() => {});
  }
}

fs.writeFileSync(`${OUT}/responsive-audit.json`, JSON.stringify(results, null, 2));
const fails = results.filter(x => !x.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${fails.length} (evidence: ${OUT})`);
await browser.close();
process.exit(fails.length ? 1 : 0);
