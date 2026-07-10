import { chromium } from 'playwright';
import fs from 'fs';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};

const vpName = process.argv[2] || 'desktop';
const start = parseInt(process.argv[3] || '0', 10);
const end = parseInt(process.argv[4] || '99999', 10);
const vp = VIEWPORTS[vpName];
if (!vp) { console.error('bad viewport', vpName); process.exit(1); }

const routes = JSON.parse(fs.readFileSync('_validation/audit2/routes.json', 'utf8'));
const outFile = `_validation/audit2/sweep-${vpName}.jsonl`;

// Anon expectations: gated routes redirect home (with auth toast); aliases redirect.
const EXPECT_REDIRECT = {
  '/profile': '/', '/bookmarks': '/', '/favorites': '/', '/account': '/',
  '/category': '/', '/journey': '/journeys', '/?q=ffmpeg': '/search?q=ffmpeg',
  '/auth/login': '/login', '/auth/register': '/register',
};

// Resume: skip routes that already have a genuine record (kill artifacts don't count)
const done = new Set();
if (fs.existsSync(outFile)) {
  for (const line of fs.readFileSync(outFile, 'utf8').trim().split('\n').filter(Boolean)) {
    try {
      const rec = JSON.parse(line);
      const killArtifact = rec.error && /has been closed|Target page/.test(rec.error);
      if (!killArtifact) done.add(rec.path);
    } catch {}
  }
}
const slice = routes.slice(start, end).filter(r => !done.has(r.path));
console.log(`resume: ${done.size} already done, ${slice.length} to go`);
if (slice.length === 0) { console.log('NOTHING TO DO'); process.exit(0); }

const browser = await chromium.launch({
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: vp });

// Allowlist (architect-approved): hourly rate-limiter 429s + GA measurement-id warn.
const ALLOW = [/429/, /Too Many Requests/i, /VITE_GA_MEASUREMENT_ID/];
let consoleErrs = [];
let pageErrs = [];
page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 300)); });
page.on('pageerror', e => pageErrs.push(String(e).slice(0, 300)));

await page.goto('http://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => document.querySelector('h1') !== null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2500);

async function inspect(r) {
  if (r.path === '/recommendations') {
    await page.waitForFunction(() => {
      const h1ok = /recommend/i.test(document.querySelector('h1')?.textContent || '');
      const cards = document.querySelectorAll('[data-testid*="card"], [data-testid*="resource"]').length;
      return cards > 3 || (h1ok && !document.querySelector('[class*="skeleton" i]'));
    }, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(800);
  } else {
    await page.waitForFunction(() => document.querySelector('h1') !== null || document.body.innerText.length > 250, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  return page.evaluate(() => {
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    const badge = document.querySelector('[data-testid="text-results-count"]')?.textContent?.trim() || '';
    const bodyLen = document.body.innerText.length;
    const de = document.documentElement;
    const overflow = Math.max(de.scrollWidth, document.body.scrollWidth);
    return { h1, badge, bodyLen, overflow, path: location.pathname + location.search, title: document.title };
  });
}

const results = [];
for (const r of slice) {
  consoleErrs = []; pageErrs = [];
  const t0 = Date.now();
  try {
    let info;
    try {
      await page.evaluate(u => {
        history.pushState({}, '', u);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, r.path);
      info = await inspect(r);
    } catch (e) {
      if (/Execution context was destroyed/.test(String(e))) {
        // a real navigation happened (redirect/lazy reload) — settle and re-inspect
        await page.waitForTimeout(1500);
        info = await inspect(r);
      } else throw e;
    }

    let parity = null;
    if (['category', 'subcategory', 'subsubcategory'].includes(r.type) && typeof r.expectedCount === 'number') {
      if (!info.badge) {
        await page.waitForFunction(() => (document.querySelector('[data-testid="text-results-count"]')?.textContent || '').length > 0, { timeout: 5000 }).catch(() => {});
        info.badge = await page.evaluate(() => document.querySelector('[data-testid="text-results-count"]')?.textContent?.trim() || '');
      }
      const m = info.badge.match(/of\s+([\d,]+)/i);
      const shown = m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
      parity = { badge: info.badge, expected: r.expectedCount, actual: shown, ok: shown === r.expectedCount };
    }

    const expectedRedirect = EXPECT_REDIRECT[r.path];
    const redirectOk = expectedRedirect
      ? (info.path === expectedRedirect || info.path.startsWith(expectedRedirect === '/' ? '/?' : expectedRedirect))
      : true;
    const is404Probe = r.path === '/nonexistent-route-404-check';
    let realConsoleErrs = consoleErrs.filter(e => !ALLOW.some(p => p.test(e)));
    if (is404Probe) realConsoleErrs = realConsoleErrs.filter(e => !/404/.test(e));
    const overflowOk = info.overflow <= vp.width + 1;
    const rendered = is404Probe ? /not found/i.test(info.h1 + info.title) : (info.h1.length > 0 || info.bodyLen > 250);
    const pass = rendered && overflowOk && redirectOk && pageErrs.length === 0 && realConsoleErrs.length === 0 && (parity === null || parity.ok);
    const rec = { path: r.path, type: r.type, vp: vpName, pass, rendered, redirectOk, h1: info.h1.slice(0, 60), overflow: info.overflow, overflowOk, parity, consoleErrs: realConsoleErrs.slice(0, 3), allowlisted: consoleErrs.length - realConsoleErrs.length, pageErrs: pageErrs.slice(0, 3), finalPath: info.path, ms: Date.now() - t0 };
    results.push(rec);
    fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
    console.log(`${pass ? 'PASS' : 'FAIL'} ${vpName} ${r.path} h1="${rec.h1}" ovf=${info.overflow}${parity ? ` parity=${parity.actual}/${parity.expected}${parity.ok ? '' : ' MISMATCH'}` : ''}${pageErrs.length ? ' PAGEERR' : ''}`);
  } catch (e) {
    const rec = { path: r.path, type: r.type, vp: vpName, pass: false, error: String(e).slice(0, 200) };
    results.push(rec);
    fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
    console.log(`FAIL ${vpName} ${r.path} ERROR ${rec.error}`);
  }
}
const fails = results.filter(x => !x.pass);
console.log(`\nBATCH DONE vp=${vpName} range=${start}-${Math.min(end, routes.length)} total=${results.length} pass=${results.length - fails.length} fail=${fails.length}`);
await browser.close();
