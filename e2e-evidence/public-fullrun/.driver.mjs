// CDP driver harness for the public full-run audit.
// Drives the live host app (http://localhost:5001, Neon-backed) via Playwright
// connectOverCDP against the headless Chrome on 127.0.0.1:9222.
//
// Usage: node .driver.mjs <step-file.mjs>
// The step file default-exports an async (page, ctx, helpers) => {...}.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:5001';
const EVID = path.dirname(fileURLToPath(import.meta.url));

const browser = await chromium.connectOverCDP(CDP);
const ctx = browser.contexts()[0] || (await browser.newContext());
const page = ctx.pages()[0] || (await ctx.newPage());
page.setDefaultTimeout(30000);

const helpers = {
  BASE,
  EVID,
  async goto(p, opts = {}) {
    await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 30000, ...opts });
    await page.waitForTimeout(2500); // settle SSR hydration (see agent-browser-settle-timing memory)
  },
  async shot(name, opts = {}) {
    const fp = path.join(EVID, name);
    await page.screenshot({ path: fp, fullPage: !!opts.full });
    return fp;
  },
  async api(p) {
    return page.evaluate(async (u) => {
      const r = await fetch(u);
      const t = await r.text();
      try { return { status: r.status, json: JSON.parse(t) }; }
      catch { return { status: r.status, text: t.slice(0, 300) }; }
    }, p);
  },
  // Resolve the first resource id matching a query, from the LIVE dataset (dataset-agnostic).
  // e.g. rid('subcategory=Codecs'), rid('subSubcategory=FFMPEG'), rid('category=Encoding%20%26%20Codecs')
  async rid(query) {
    const r = await page.evaluate(async (q) => {
      const res = await fetch('/api/resources?' + q + '&limit=1');
      const d = await res.json();
      return d.resources?.[0] || null;
    }, query);
    return r ? { id: r.id, title: r.title, url: r.url } : null;
  },
  log: (...a) => console.log(...a),
};

const stepArg = process.argv[2];
if (!stepArg) { console.error('no step file'); process.exit(1); }
const stepPath = path.isAbsolute(stepArg) ? stepArg : path.join(EVID, stepArg);
const mod = await import(stepPath);
try {
  await mod.default(page, ctx, helpers);
} catch (e) {
  console.error('STEP_ERROR:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close(); // detaches CDP; does NOT kill the 9222 chrome
}
