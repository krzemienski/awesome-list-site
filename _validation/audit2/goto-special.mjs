import { chromium } from 'playwright';
import fs from 'fs';

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};
const vpName = process.argv[2];
const vp = VIEWPORTS[vpName];
const paths = process.argv.slice(3);
const outFile = `_validation/audit2/sweep-${vpName}.jsonl`;

const EXPECT_REDIRECT = {
  '/profile': '/', '/bookmarks': '/', '/favorites': '/', '/account': '/',
  '/category': '/', '/journey': '/journeys', '/?q=ffmpeg': '/search?q=ffmpeg',
  '/auth/login': '/login', '/auth/register': '/register',
};
const ALLOW = [/429/, /Too Many Requests/i, /VITE_GA_MEASUREMENT_ID/];

const browser = await chromium.launch({
  executablePath: '/home/runner/workspace/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: vp });
let consoleErrs = [], pageErrs = [];
page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 300)); });
page.on('pageerror', e => pageErrs.push(String(e).slice(0, 300)));

for (const p of paths) {
  consoleErrs = []; pageErrs = [];
  const t0 = Date.now();
  try {
    try {
      await page.goto('http://localhost:5000' + p, { waitUntil: 'domcontentloaded', timeout: 25000 });
    } catch (e) {
      if (!/interrupted by another navigation/.test(String(e))) throw e;
      // client-side gating redirect fired during load — that's the behavior under test
    }
    await page.waitForTimeout(2800);
    const info = await page.evaluate(() => {
      const de = document.documentElement;
      return {
        h1: document.querySelector('h1')?.textContent?.trim() || '',
        title: document.title,
        bodyLen: document.body.innerText.length,
        overflow: Math.max(de.scrollWidth, document.body.scrollWidth),
        path: location.pathname + location.search,
        snippet: document.body.innerText.replace(/\s+/g, ' ').slice(0, 150),
      };
    });
    const expected = EXPECT_REDIRECT[p];
    const redirectOk = expected ? (info.path === expected || info.path.startsWith(expected === '/' ? '/?' : expected)) : true;
    const is404 = p === '/nonexistent-route-404-check';
    let realErrs = consoleErrs.filter(e => !ALLOW.some(x => x.test(e)));
    if (is404) realErrs = realErrs.filter(e => !/404/.test(e));
    const overflowOk = info.overflow <= vp.width + 1;
    const rendered = is404 ? /not found/i.test(info.h1 + info.title) : (info.h1.length > 0 || info.bodyLen > 250);
    const gated = ['/profile', '/bookmarks', '/favorites', '/account'].includes(p);
    const gateOk = gated ? /authentication required|sign in/i.test(info.snippet) || info.path === '/login' : true;
    const pass = rendered && overflowOk && redirectOk && gateOk && pageErrs.length === 0 && realErrs.length === 0;
    const rec = { path: p, type: 'static', vp: vpName, method: 'goto', pass, rendered, redirectOk, gateOk, h1: info.h1.slice(0, 60), overflow: info.overflow, overflowOk, parity: null, consoleErrs: realErrs.slice(0, 3), pageErrs: pageErrs.slice(0, 3), finalPath: info.path, snippet: info.snippet, ms: Date.now() - t0 };
    fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');
    console.log(`${pass ? 'PASS' : 'FAIL'} ${vpName} goto ${p} -> ${info.path} h1="${rec.h1}" gate=${gateOk} redir=${redirectOk} ovf=${info.overflow}`);
  } catch (e) {
    fs.appendFileSync(outFile, JSON.stringify({ path: p, type: 'static', vp: vpName, method: 'goto', pass: false, error: String(e).slice(0, 200) }) + '\n');
    console.log(`FAIL ${vpName} goto ${p} ERROR ${String(e).slice(0, 150)}`);
  }
}
await browser.close();
