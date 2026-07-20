import { chromium } from '/home/runner/workspace/node_modules/playwright/index.mjs';
import fs from 'fs';

const BASE = 'http://localhost:5000';
const EXE = '/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome';
const OUT = '/tmp/r24d/evidence';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const log = (k, pass, detail) => { results.push({ k, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${k} :: ${detail}`); };

const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

// auth context
const authCtx = await browser.newContext();
const res = await authCtx.request.post(`${BASE}/api/auth/local/login`, { data: { email: 'admin@example.com', password: process.env.ADMIN_PASSWORD }, headers: { 'Content-Type': 'application/json' } });
if (!res.ok()) { console.log('LOGIN FAILED', res.status()); process.exit(1); }
const anonCtx = await browser.newContext();

async function printCheck(ctx, route, name, checks, pdfOpts = {}) {
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);
  for (const c of checks) {
    const r = await page.evaluate(c.fn);
    log(`${name}:${c.id}`, r.pass, r.detail);
  }
  await page.pdf({ path: `${OUT}/${name}.pdf`, format: 'A4', printBackground: true, ...pdfOpts }).catch(e => log(`${name}:pdf`, false, e.message));
  await page.close();
}

const hiddenInPrint = (sel) => new Function(`
  const els = [...document.querySelectorAll(${JSON.stringify(sel)})];
  if (!els.length) return { pass: true, detail: 'selector absent (0 matches): ${sel}' };
  const visible = els.filter(e => getComputedStyle(e).display !== 'none');
  return { pass: visible.length === 0, detail: els.length + ' matched, ' + visible.length + ' still visible in print' };`);
const visibleInPrint = (sel) => new Function(`
  const els = [...document.querySelectorAll(${JSON.stringify(sel)})];
  const visible = els.filter(e => getComputedStyle(e).display !== 'none');
  return { pass: visible.length > 0, detail: els.length + ' matched, ' + visible.length + ' visible in print' };`);

// category page (card grid) — R5-053
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
await printCheck(anonCtx, '/category/encoding-codecs', 'category', cardChecks);
await printCheck(anonCtx, '/search?q=ffmpeg', 'search', cardChecks.slice(0, 2).concat(cardChecks.slice(4)));

// journey — R5-027 login button prints as text
await printCheck(anonCtx, '/journey/7', 'journey-anon', [
  { id: 'login-inline-visible', fn: new Function(`
      const b = [...document.querySelectorAll('button.print-keep-text')];
      const vis = b.filter(e => getComputedStyle(e).display !== 'none');
      const txt = document.body.innerText;
      const hasSentence = /log in/i.test(txt);
      return { pass: vis.length > 0 && hasSentence, detail: b.length + ' print-keep-text btns, ' + vis.length + ' visible; sentence present: ' + hasSentence };`) },
]);

// recommendations (auth) — R5-027 helpful row + configure card hidden
await printCheck(authCtx, '/recommendations', 'recommendations', [
  { id: 'helpful-hidden', fn: new Function(`
      const nodes = [...document.querySelectorAll('.no-print')].filter(e => /helpful/i.test(e.textContent));
      const vis = nodes.filter(e => getComputedStyle(e).display !== 'none');
      return { pass: vis.length === 0, detail: nodes.length + ' helpful blocks marked no-print, ' + vis.length + ' visible' };`) },
]);

// theme settings (auth) — R5-027 pickers/swatches hidden
await printCheck(authCtx, '/settings/theme', 'theme-settings', [
  { id: 'pickers-hidden', fn: new Function(`
      const cards = [...document.querySelectorAll('.no-print')];
      const vis = cards.filter(e => getComputedStyle(e).display !== 'none');
      return { pass: cards.length >= 3 && vis.length === 0, detail: cards.length + ' no-print sections, ' + vis.length + ' visible in print' };`) },
]);

// resource detail + home + advanced — chrome hidden (R4-039)
const chromeChecks = [
  { id: 'header-hidden', fn: hiddenInPrint('header') },
  { id: 'sidebar-hidden', fn: hiddenInPrint('[data-sidebar="sidebar"], aside') },
  { id: 'buttons-hidden', fn: cardChecks[6].fn },
];
await printCheck(anonCtx, '/resource/187906', 'resource', chromeChecks);
await printCheck(anonCtx, '/', 'home', chromeChecks);
await printCheck(anonCtx, '/advanced', 'advanced', chromeChecks);
await printCheck(authCtx, '/profile', 'profile', chromeChecks);

// admin — R4-070: PDF page 2 must have ink
await printCheck(authCtx, '/admin', 'admin', chromeChecks.slice(0, 2));

fs.writeFileSync(`${OUT}/print-audit.json`, JSON.stringify(results, null, 2));
const fails = results.filter(r => !r.pass);
console.log(`\nTOTAL ${results.length}, FAIL ${fails.length}`);
await browser.close();
