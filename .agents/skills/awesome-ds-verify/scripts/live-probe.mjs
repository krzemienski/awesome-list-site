#!/usr/bin/env node
/**
 * live-probe — stages 1, 2, 3, 4, 9 and 11 against the RUNNING app, per route.
 *
 * The repo's gates cover these stages for the registry, the stylesheet and the
 * /design-system showcase. None of them asks the question the audit starts
 * from: "is THIS page, as rendered, wearing the design system?" This does, in
 * a real headless Chromium, using the repo's own Playwright install.
 *
 *   stage 1  DS globals on window, 5 systems, 10 accents, --bg resolves   BLOCK
 *   stage 2  <html data-system data-accent> valid                         BLOCK
 *   stage 3  attributes are set with EVERY external script blocked
 *            (proves the boot is inline + pre-paint, not bundle-driven)   FIX
 *   stage 4  .page and .grain rendered                                    FIX
 *   stage 9  first family of --font-display/-body/-mono is loaded         FIX
 *   stage 11 cycling all 5 systems flips the attribute, root tokens
 *            diverge                                                      BLOCK
 *            ...and real cards / buttons / h1s actually restyle           FIX
 *
 * Exit: 0 clean · 1 at least one BLOCK · 2 FIX only · 70 could not run.
 *
 * Usage: node live-probe.mjs --repo <path> --base-url <url> [--routes /,/about] [--out <dir>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, token, index, all) => {
  if (token.startsWith('--')) pairs.push([token.slice(2), all[index + 1]]);
  return pairs;
}, []));
const repo = path.resolve(args.repo || process.cwd());
const baseUrl = (args['base-url'] || 'http://127.0.0.1:5000').replace(/\/+$/, '');
const routes = (args.routes || '/').split(',').map((route) => route.trim()).filter(Boolean);
const outDir = path.resolve(args.out || path.join(repo, '.cache', 'verify-ds', 'live-probe'));
fs.mkdirSync(outDir, { recursive: true });

const SYSTEMS = ['editorial', 'terminal', 'geist', 'brutalist', 'swiss'];

function bail(message) {
  console.error(`live-probe: ${message}`);
  process.exit(70);
}

let chromium;
try {
  ({ chromium } = createRequire(path.join(repo, 'package.json'))('playwright'));
} catch (error) {
  bail(`Cannot find package 'playwright' from ${repo} — run \`npm ci\` (${error.code || error.message})`);
}

function chromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim()) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.trim();
  const cache = path.join(repo, '.cache', 'ms-playwright');
  if (fs.existsSync(cache)) {
    const dir = fs.readdirSync(cache).filter((entry) => /^chromium-\d+$/.test(entry)).sort().pop();
    const candidate = dir && path.join(cache, dir, 'chrome-linux64', 'chrome');
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return undefined; // Playwright's own default location
}

const findings = [];
const passes = [];
const record = (ok, stage, severity, route, message, fix = '') => {
  (ok ? passes : findings).push({ stage, severity, route, message, fix });
  console.log(`${ok ? 'PASS' : `FAIL [${severity}]`} stage ${stage} ${route} :: ${message}${!ok && fix ? ` → ${fix}` : ''}`);
};

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: chromiumExecutable(), args: ['--no-sandbox', '--disable-dev-shm-usage'] });
} catch (error) {
  bail(`browserType.launch failed — ${error.message.split('\n')[0]}`);
}

const slug = (route) => route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';

try {
  // ---------------------------------------------------------------- stage 3
  // With every external script aborted, only inline <script>s can run. If the
  // attributes are still there, the theme is decided before the bundle — i.e.
  // before first paint. If they vanish, the boot depends on deferred code.
  // Checked on EVERY route: the boot picks its default system + accent from
  // the route's product profile (admin / learning / public), so one route
  // proving it says nothing about the others. This is a "decided before the
  // bundle" proof, not a paint-timing one — accent-drift covers the static
  // shape of the inline script.
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.route('**/*', (request) => (request.request().resourceType() === 'script' ? request.abort() : request.continue()));
    await page.goto(baseUrl + route, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => null);
    const boot = await page.evaluate(() => ({
      system: document.documentElement.getAttribute('data-system'),
      accent: document.documentElement.getAttribute('data-accent'),
    }));
    record(SYSTEMS.includes(boot.system) && !!boot.accent, '3', 'FIX', route,
      `boot with all external scripts blocked → data-system=${JSON.stringify(boot.system)} data-accent=${JSON.stringify(boot.accent)}`,
      'the theme attributes must be written by the inline boot script in client/index.html, not by the bundle / a useEffect');
    await context.close();
  }

  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const response = await page.goto(baseUrl + route, { waitUntil: 'load', timeout: 60_000 });
    // The not-found page is a key screen of the audit and answers 404 BY DESIGN
    // (soft-404 architecture: the SPA shell is served with a real 404 status so
    // crawlers don't index it). An HTML 404 is therefore audited like any other
    // route; only non-HTML 4xx and every 5xx mean "nothing to audit".
    const status = response?.status() ?? 0;
    const isHtml = /text\/html/i.test(response?.headers()['content-type'] || '');
    if (!response || status >= 500 || (status >= 400 && !(status === 404 && isHtml))) {
      record(false, '1', 'BLOCK', route, `route answered HTTP ${response ? status : 'no response'}`, 'fix the route or pass a valid --routes list');
      await context.close();
      continue;
    }
    if (status === 404) console.log(`NOTE ${route} :: answers HTTP 404 with the SPA shell (soft-404 by design) — audited as rendered`);
    await page.waitForFunction(() => typeof window.applyDesignSystem === 'function', null, { timeout: 45_000 }).catch(() => {});
    await page.waitForSelector('.page', { timeout: 15_000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);

    // ------------------------------------------------------- stages 1, 2, 4
    const base = await page.evaluate(() => {
      const root = document.documentElement;
      const cs = getComputedStyle(root);
      return {
        applyFn: typeof window.applyDesignSystem === 'function',
        systems: window.DESIGN_SYSTEMS ? Object.keys(window.DESIGN_SYSTEMS) : [],
        accents: Array.isArray(window.ACCENTS) ? window.ACCENTS.map((accent) => accent.id) : [],
        defaults: window.SYSTEM_DEFAULT_ACCENT || {},
        system: root.getAttribute('data-system'),
        accent: root.getAttribute('data-accent'),
        bg: cs.getPropertyValue('--bg').trim(),
        page: !!document.querySelector('.page'),
        grain: !!document.querySelector('.grain'),
      };
    });
    record(base.applyFn && base.systems.length === 5 && base.accents.length === 10, '1', 'BLOCK', route,
      `window.applyDesignSystem=${base.applyFn} · systems=${base.systems.length} · accents=${base.accents.length}`,
      'client/src/lib/design-system.ts must load and mirror its registry onto window');
    record(!!base.bg, '1', 'BLOCK', route, `--bg resolves to ${JSON.stringify(base.bg)}`,
      'design-system.css must be imported at the top of client/src/index.css');
    record(SYSTEMS.includes(base.system) && base.accents.includes(base.accent), '2', 'BLOCK', route,
      `data-system=${JSON.stringify(base.system)} data-accent=${JSON.stringify(base.accent)}`,
      'restore the pre-paint boot script in client/index.html');
    record(base.page, '4', 'FIX', route, `.page ${base.page ? 'rendered' : 'MISSING'}`, 'render the route inside MainLayout (or add the .page wrapper) so --bg-atmosphere paints');
    record(base.grain, '4', 'FIX', route, `.grain ${base.grain ? 'rendered' : 'MISSING'}`, 'add <div class="grain"> inside .page');

    // -------------------------------------------------------------- stage 9
    // A webfont only downloads once something paints in it, so ask about the
    // face a real element is using (its weight + style), never a bare family.
    // document.fonts.check(face) answers "is it loaded RIGHT NOW" — false while
    // a face requested by the always-on <link> is still downloading (content
    // that paints after a data fetch is the usual trigger). fonts.load(face)
    // waits for that download and resolves with the matching FontFace list:
    // empty means no @font-face covers this family/weight/style at all.
    const fonts = await page.evaluate(() => Promise.all(['--font-display', '--font-body', '--font-mono'].map(async (token) => {
      const stack = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
      const family = stack.split(',')[0].replace(/['"]/g, '').trim();
      const user = [...document.querySelectorAll('body *')].find((el) => {
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height || !(el.textContent || '').trim()) return false;
        return getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '').trim() === family;
      });
      if (!user) return { token, family, used: false };
      const cs = getComputedStyle(user);
      const face = `${cs.fontStyle} ${cs.fontWeight} 16px "${family}"`;
      const faces = await document.fonts.load(face).catch(() => []);
      return { token, family, used: true, face, loaded: faces.length > 0 && document.fonts.check(face) };
    })));
    for (const font of fonts) {
      if (!font.used) { console.log(`NOTE stage 9 ${route} :: nothing visible paints in ${font.token} ("${font.family}") on this route — not sampled`); continue; }
      record(font.loaded, '9', 'FIX', route, `${font.token} → ${font.face} ${font.loaded ? 'loaded' : 'NOT loaded (painting in fallback)'}`,
        'the always-on Google Fonts <link> in client/index.html must request this family/weight/style; then run `npm run validate:webfont-fetch`');
    }

    // ------------------------------------------------------------- stage 11
    if (base.applyFn) {
      const samples = {};
      for (const id of SYSTEMS) {
        samples[id] = await page.evaluate(async ({ id, accent }) => {
          window.applyDesignSystem(id, accent);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const root = getComputedStyle(document.documentElement);
          const visible = (el) => { const box = el.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
          const first = (selector) => [...document.querySelectorAll(selector)].find(visible);
          const style = (el, props) => (el ? Object.fromEntries(props.map((prop) => [prop, getComputedStyle(el)[prop]])) : null);
          return {
            attr: document.documentElement.getAttribute('data-system'),
            root: Object.fromEntries(['--radius', '--border-w', '--font-display', '--font-body', '--shadow', '--grain-opacity']
              .map((token) => [token, root.getPropertyValue(token).trim()])),
            card: style(first('[data-ds="card-hover"], .card'), ['borderTopLeftRadius', 'borderTopWidth', 'fontFamily']),
            button: style(first('button[data-ds-variant], .btn'), ['borderTopLeftRadius', 'borderTopWidth', 'fontFamily', 'textTransform']),
            h1: style(first('h1'), ['fontFamily', 'letterSpacing', 'fontWeight']),
          };
        }, { id, accent: base.defaults[id] || base.accent });
        await page.screenshot({ path: path.join(outDir, `${slug(route)}-${id}.png`) });
      }
      const flipped = SYSTEMS.filter((id) => samples[id].attr === id);
      record(flipped.length === 5, '11', 'BLOCK', route, `applyDesignSystem flipped data-system for ${flipped.length}/5 systems`,
        'applyDesignSystem() must set html[data-system]; check client/src/lib/design-system.ts');
      for (const token of ['--radius', '--border-w', '--font-display']) {
        const distinct = new Set(SYSTEMS.map((id) => samples[id].root[token]));
        record(distinct.size >= 2, '11', 'BLOCK', route, `${token} resolves to ${distinct.size} distinct value(s) across 5 systems: ${[...distinct].join(' | ')}`,
          'a :root[data-system] token block is missing or is being out-ranked (stage 10 / token-parity)');
      }
      for (const kind of ['card', 'button', 'h1']) {
        if (SYSTEMS.some((id) => !samples[id][kind])) {
          console.log(`NOTE stage 11 ${route} :: no visible ${kind} on this route — not sampled`);
          continue;
        }
        const distinct = new Set(SYSTEMS.map((id) => JSON.stringify(samples[id][kind])));
        record(distinct.size >= 2, '11', 'FIX', route, `first visible ${kind} shows ${distinct.size} distinct computed style(s) across 5 systems`,
          `this ${kind} looks identical in every system — its radius/border/font are hardcoded; re-run stage 5 on its component`);
      }
      fs.writeFileSync(path.join(outDir, `${slug(route)}-switch-samples.json`), `${JSON.stringify(samples, null, 2)}\n`);
    }
    await context.close();
  }
} catch (error) {
  await browser.close().catch(() => {});
  if (/ERR_CONNECTION_REFUSED|ECONNREFUSED/.test(error.message)) bail(`App not reachable at ${baseUrl} — ${error.message.split('\n')[0]}`);
  throw error;
}
await browser.close();

fs.writeFileSync(path.join(outDir, 'live-probe.json'), `${JSON.stringify({ baseUrl, routes, findings, passes }, null, 2)}\n`);
const blocks = findings.filter((finding) => finding.severity === 'BLOCK').length;
const fixes = findings.length - blocks;
console.log(`\nlive-probe :: ${passes.length} pass · ${blocks} BLOCK · ${fixes} FIX · evidence ${outDir}`);
process.exit(blocks ? 1 : fixes ? 2 : 0);
