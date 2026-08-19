// Repeatable print-stylesheet validation (from fix-evidence-v3/run24d/print-audit.mjs).
// Guards the delicate @media print rules: select un-clamp exception, sidebar/header
// shell hide, no-print/print-only pairs, print-keep-text button exemption.
// Requires the dev server on :5000 and ADMIN_PASSWORD. Exits 1 on any failure.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowserWithLease } from './playwright-launch-lease.mjs';

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

const browser = await launchBrowserWithLease(
  chromium,
  { headless: true, executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage'] },
  'print-audit',
);

// Auth: the Clerk migration removed /api/auth/local/login and express-session,
// so there is no password+cookie login anymore. Authenticated checks instead
// send `X-Admin-Audit-Key: <ADMIN_PASSWORD>` on every request; the server
// (server/clerkAuth.ts) honors the header only when ADMIN_PASSWORD is set in
// ITS environment and is >= 8 chars (mirrors the seedAdminUser length guard).
// If ADMIN_PASSWORD is too short the server ignores the header, so warn and
// SKIP authenticated checks instead of silently degrading to anonymous runs.
async function newAdminContext() {
  if (process.env.ADMIN_PASSWORD.length < 8) {
    console.warn('WARN: ADMIN_PASSWORD is shorter than 8 characters — the server ignores the audit-key header (fail-closed guard); SKIPPING authenticated page checks.');
    return null;
  }
  const KEY = process.env.ADMIN_PASSWORD;
  const APP_ORIGIN = new URL(BASE).origin;
  const ctx = await browser.newContext();
  // Inject the audit key ONLY into same-origin requests. A context-wide
  // extraHTTPHeaders would attach the admin credential to EVERY request the
  // SPA makes — Clerk-hosted scripts, external images, any third-party origin
  // — leaking an admin bearer credential off-site. Route interception scopes
  // the header to the app origin and nothing else.
  await ctx.route('**/*', (route) => {
    let sameOrigin = false;
    try { sameOrigin = new URL(route.request().url()).origin === APP_ORIGIN; } catch { /* opaque scheme (data:, about:) — never inject */ }
    if (sameOrigin) route.continue({ headers: { ...route.request().headers(), 'x-admin-audit-key': KEY } });
    else route.continue();
  });
  // Regression probe: prove a cross-origin request does NOT carry the audit
  // key. Fulfilled locally (no real network); registered AFTER the injector so
  // it matches first (Playwright checks newest routes first).
  let probeHeaders = null;
  await ctx.route('https://audit-key-leak-probe.invalid/**', (route) => {
    probeHeaders = route.request().headers();
    route.fulfill({ status: 200, contentType: 'text/plain', body: 'probe' });
  });
  const probePage = await ctx.newPage();
  await probePage.goto('https://audit-key-leak-probe.invalid/probe').catch(() => {});
  await probePage.close();
  await ctx.unroute('https://audit-key-leak-probe.invalid/**');
  if (!probeHeaders) { console.error('FATAL: cross-origin leak probe never ran — cannot prove the audit key stays same-origin'); process.exit(1); }
  if (Object.keys(probeHeaders).some(h => h.toLowerCase() === 'x-admin-audit-key')) {
    console.error('FATAL: audit key LEAKED to a cross-origin request — refusing to run');
    process.exit(1);
  }
  console.log('leak probe OK: audit key absent from cross-origin request');
  // API-context calls bypass route interception, so pass the header explicitly.
  const me = await ctx.request.get(`${BASE}/api/auth/user`, { headers: { 'x-admin-audit-key': KEY } }).then(r => r.json()).catch(() => null);
  if (me?.user?.role !== 'admin') {
    console.error('FATAL: audit-key auth failed — /api/auth/user did not return the admin. Is ADMIN_PASSWORD set (>=8 chars) in the SERVER environment and the admin user seeded?');
    process.exit(1);
  }
  console.log('admin auth OK via X-Admin-Audit-Key header');
  return ctx;
}
const authCtx = await newAdminContext();
const anonCtx = await browser.newContext();
// Wrapper for auth-only routes: SKIP (not FAIL) when the audit key is unusable.
async function authedPrintCheck(route, name, checks, pdfOpts = {}) {
  if (!authCtx) { console.log(`SKIP ${name} :: authenticated check skipped (ADMIN_PASSWORD < 8 chars)`); return; }
  await printCheck(authCtx, route, name, checks, pdfOpts);
}

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
await authedPrintCheck('/recommendations', 'recommendations', [
  { id: 'helpful-hidden', fn: new Function(`
      const nodes = [...document.querySelectorAll('.no-print')].filter(e => /helpful/i.test(e.textContent));
      const vis = nodes.filter(e => getComputedStyle(e).display !== 'none');
      return { pass: vis.length === 0, detail: nodes.length + ' helpful blocks marked no-print, ' + vis.length + ' visible' };`) },
]);

// Theme settings (auth) — R5-027: pickers/swatches hidden.
await authedPrintCheck('/settings/theme', 'theme-settings', [
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
await authedPrintCheck('/profile', 'profile', chromeChecks);

// Admin — R4-070: prints without blank overflow pages.
await authedPrintCheck('/admin', 'admin', chromeChecks.slice(0, 2));

fs.writeFileSync(`${OUT}/print-audit.json`, JSON.stringify(results, null, 2));
const fails = results.filter(r => !r.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${fails.length} (evidence: ${OUT})`);
await browser.close();
process.exit(fails.length ? 1 : 0);
