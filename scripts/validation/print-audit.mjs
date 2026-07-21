// Repeatable print-stylesheet validation (from fix-evidence-v3/run24d/print-audit.mjs).
// Guards the delicate @media print rules: select un-clamp exception, sidebar/header
// shell hide, no-print/print-only pairs, print-keep-text button exemption.
// Requires the dev server on :5000 and ADMIN_PASSWORD. Exits 1 on any failure.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));

const BASE = process.env.AUDIT_BASE_URL || 'http://localhost:5000';
const OUT = '/tmp/validation/print-audit';
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  const cache = path.join(ROOT, '.cache/ms-playwright');
  const dir = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
  if (!dir) throw new Error('No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium');
  return path.join(cache, dir, 'chrome-linux64/chrome');
}

// Preflight: ADMIN_PASSWORD must be set; wait up to 120s for the server so this
// can run in parallel with app startup without racing it.
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

// Resolve live sample ids instead of hardcoding (data changes over time).
async function firstResourceId() {
  const r = await fetch(`${BASE}/api/resources?limit=1`).then(x => x.json()).catch(() => null);
  const id = r?.resources?.[0]?.id ?? r?.[0]?.id;
  return id ?? 187906;
}
async function firstJourneyRoute() {
  const r = await fetch(`${BASE}/api/journeys`).then(x => x.json()).catch(() => null);
  const list = Array.isArray(r) ? r : r?.journeys;
  const id = list?.find(j => j.status === 'published')?.id ?? list?.[0]?.id;
  return id ? `/journey/${id}` : '/journey/7';
}
async function firstCategoryRoute() {
  const r = await fetch(`${BASE}/api/awesome-list`).then(x => x.json()).catch(() => null);
  const slug = r?.categories?.[0]?.slug;
  return slug ? `/category/${slug}` : '/category/encoding-codecs';
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
      const ctx = await browser.newContext({ storageState: SESSION_FILE });
      const me = await ctx.request.get(`${BASE}/api/auth/user`).then(r => r.json()).catch(() => null);
      if (me?.user?.role === 'admin') { console.log('admin session reused from cache'); return ctx; }
      await ctx.close();
    } catch { /* stale/corrupt state — fall through to fresh login */ }
  }
  const ctx = await browser.newContext();
  let loggedIn = false;
  for (let i = 0; i < 8 && !loggedIn; i++) {
    const res = await ctx.request.post(`${BASE}/api/auth/local/login`, { data: { email: 'admin@example.com', password: process.env.ADMIN_PASSWORD }, headers: { 'Content-Type': 'application/json' } });
    if (res.ok()) { loggedIn = true; break; }
    if (res.status() !== 429) { console.error('FATAL: admin login failed', res.status()); process.exit(1); }
    const retryAfter = Number(res.headers()['retry-after']);
    const wait = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 15000 * (i + 1)) + Math.floor(Math.random() * 5000);
    console.log(`login 429, retrying in ${Math.round(wait / 1000)}s...`);
    await new Promise(r => setTimeout(r, wait));
  }
  if (!loggedIn) { console.error('FATAL: admin login still rate-limited after retries'); process.exit(1); }
  fsm.mkdirSync('/tmp/validation', { recursive: true });
  await ctx.storageState({ path: SESSION_FILE });
  return ctx;
}
const authCtx = await newAdminContext();
const anonCtx = await browser.newContext();

// Positive blank-page guard, run on EVERY audited route: a print render must keep
// a meaningful amount of visible text. A route where the print stylesheet hides
// everything (the "silently blanked page" regression) fails here even if all
// hide-assertions pass.
const contentPrints = new Function(`
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let visibleChars = 0, blocks = 0, n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim();
    if (!t) continue;
    const el = n.parentElement;
    if (!el) continue;
    let hidden = false, p = el;
    while (p && p !== document.body) {
      const s = getComputedStyle(p);
      if (s.display === 'none' || s.visibility === 'hidden') { hidden = true; break; }
      p = p.parentElement;
    }
    if (!hidden) { visibleChars += t.length; blocks++; }
  }
  return { pass: visibleChars >= 200 && blocks >= 5, detail: visibleChars + ' visible chars in ' + blocks + ' text nodes under print media' };`);

async function printCheck(ctx, route, name, checks, pdfOpts = {}) {
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForSelector('main, [role="main"], h1', { timeout: 15000 }).catch(() => {});
  // Wait for the SPA to actually mount meaningful content into #root — a fixed
  // sleep flakes under CPU contention (e.g. audits running in parallel with app
  // startup): the page can still be showing only the NOSCRIPT/skeleton text,
  // which makes content-prints/pdf-not-blank fail spuriously (seen on /admin).
  await page.waitForFunction(
    () => ((document.getElementById('root')?.innerText || '').trim().length > 300),
    null, { timeout: 30000 }
  ).catch(() => {});
  await page.waitForTimeout(1500);
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);
  for (const c of checks) {
    const r = await page.evaluate(c.fn);
    log(`${name}:${c.id}`, r.pass, r.detail);
  }
  const rc = await page.evaluate(contentPrints);
  log(`${name}:content-prints`, rc.pass, rc.detail);
  const pdfPath = `${OUT}/${name}.pdf`;
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, ...pdfOpts }).catch(e => log(`${name}:pdf`, false, e.message));
  // Blank-output guard: an all-blank A4 PDF is ~1-6KB; real content pages are far larger.
  try {
    const size = fs.statSync(pdfPath).size;
    log(`${name}:pdf-not-blank`, size > 8000, `pdf ${size} bytes`);
  } catch (e) { log(`${name}:pdf-not-blank`, false, e.message); }
  await page.close();
}

const hiddenInPrint = (sel) => new Function(`
  const els = [...document.querySelectorAll(${JSON.stringify(sel)})];
  if (!els.length) return { pass: true, detail: 'selector absent (0 matches): ${sel}' };
  const visible = els.filter(e => getComputedStyle(e).display !== 'none');
  return { pass: visible.length === 0, detail: els.length + ' matched, ' + visible.length + ' still visible in print' };`);

// Card-grid pages — R5-053: interactive chrome hidden, titles + print-only URLs visible.
const cardChecks = [
  { id: 'openlink-hidden', fn: new Function(`
      const els = [...document.querySelectorAll('a')].filter(a => /open link/i.test(a.textContent));
      const vis = els.filter(e => { let n = e; while (n && n !== document.body) { if (getComputedStyle(n).display === 'none') return false; n = n.parentElement; } return true; });
      return { pass: vis.length === 0, detail: els.length + ' Open Link anchors, ' + vis.length + ' visible in print' };`) },
  { id: 'title-prints', fn: new Function(`
      const els = [...document.querySelectorAll('[data-testid^="link-resource-title-"]')];
      const vis = els.filter(e => { let n = e; while (n && n !== document.body) { if (getComputedStyle(n).display === 'none') return false; n = n.parentElement; } return true; });
      return { pass: vis.length > 0, detail: els.length + ' card titles, ' + vis.length + ' visible in print' };`) },
  { id: 'viewdetails-hidden', fn: hiddenInPrint('[data-testid^="link-view-details-"]') },
  { id: 'favrow-hidden', fn: hiddenInPrint('.no-print.relative.z-10.flex.items-center') },
  { id: 'badgecount-hidden', fn: hiddenInPrint('[data-testid="badge-count"]') },
  { id: 'url-printed', fn: new Function(`
      const els = [...document.querySelectorAll('.print-only')].filter(e => getComputedStyle(e).display !== 'none' && /https?:\\/\\//.test(e.textContent));
      return { pass: els.length > 0, detail: els.length + ' visible print-only URLs, sample: ' + (els[0]?.textContent||'').slice(0,60) };`) },
  { id: 'buttons-hidden', fn: new Function(`
      const btns = [...document.querySelectorAll('main button')].filter(e => getComputedStyle(e).display !== 'none' && !e.classList.contains('print-keep-text'));
      return { pass: btns.length === 0, detail: btns.length + ' non-exempt buttons visible in print' + (btns[0] ? ' e.g. ' + (btns[0].textContent||btns[0].getAttribute('aria-label')||'?').slice(0,40) : '') };`) },
];
await printCheck(anonCtx, await firstCategoryRoute(), 'category', cardChecks);
await printCheck(anonCtx, '/search?q=ffmpeg', 'search', cardChecks.slice(0, 2).concat(cardChecks.slice(4)));

// Journey — R5-027: login button prints as inline text (print-keep-text exemption).
await printCheck(anonCtx, await firstJourneyRoute(), 'journey-anon', [
  { id: 'login-inline-visible', fn: new Function(`
      const b = [...document.querySelectorAll('button.print-keep-text')];
      const vis = b.filter(e => getComputedStyle(e).display !== 'none');
      const txt = document.body.innerText;
      const hasSentence = /log in/i.test(txt);
      return { pass: vis.length > 0 && hasSentence, detail: b.length + ' print-keep-text btns, ' + vis.length + ' visible; sentence present: ' + hasSentence };`) },
]);

// Recommendations (auth) — R5-027: "helpful" feedback row hidden.
await printCheck(authCtx, '/recommendations', 'recommendations', [
  { id: 'helpful-hidden', fn: new Function(`
      const nodes = [...document.querySelectorAll('.no-print')].filter(e => /helpful/i.test(e.textContent));
      const vis = nodes.filter(e => getComputedStyle(e).display !== 'none');
      return { pass: vis.length === 0, detail: nodes.length + ' helpful blocks marked no-print, ' + vis.length + ' visible' };`) },
]);

// Theme settings (auth) — R5-027: pickers/swatches hidden.
await printCheck(authCtx, '/settings/theme', 'theme-settings', [
  { id: 'pickers-hidden', fn: new Function(`
      const cards = [...document.querySelectorAll('.no-print')];
      const vis = cards.filter(e => getComputedStyle(e).display !== 'none');
      return { pass: cards.length >= 3 && vis.length === 0, detail: cards.length + ' no-print sections, ' + vis.length + ' visible in print' };`) },
]);

// Shell chrome hidden on detail/home/advanced/profile — R4-039.
const chromeChecks = [
  { id: 'header-hidden', fn: hiddenInPrint('header') },
  { id: 'sidebar-hidden', fn: hiddenInPrint('[data-sidebar="sidebar"], aside') },
  { id: 'buttons-hidden', fn: cardChecks[6].fn },
];
await printCheck(anonCtx, `/resource/${await firstResourceId()}`, 'resource', chromeChecks);
await printCheck(anonCtx, '/', 'home', chromeChecks);
await printCheck(anonCtx, '/advanced', 'advanced', chromeChecks);
await printCheck(authCtx, '/profile', 'profile', chromeChecks);

// Admin — R4-070: prints without blank overflow pages.
await printCheck(authCtx, '/admin', 'admin', chromeChecks.slice(0, 2));

fs.writeFileSync(`${OUT}/print-audit.json`, JSON.stringify(results, null, 2));
const fails = results.filter(r => !r.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${fails.length} (evidence: ${OUT})`);
await browser.close();
process.exit(fails.length ? 1 : 0);
