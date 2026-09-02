// Behavioral validation for the /design-system live-token showcase (task #346).
// Guards the reviewer-flagged effect-ordering bug: the token catalog samples
// getComputedStyle via a MutationObserver on <html>'s data-system/data-accent
// attributes, so displayed values must match the ACTIVE stylesheet immediately
// after every system/accent switch (never the previous selection's values).
//
// Checks, per system (all 5) plus one accent flip:
// 1. Clicking the system pill updates html[data-system].
// 2. Every rendered token row ([data-testid^="ds-token-value-"]) equals the
//    live getComputedStyle value for its token on the CURRENT selection.
// 3. Spot-check divergence: --radius / --font-display actually differ across
//    systems (proves we're not reading one frozen snapshot).
// 4. --font-display / --font-body / --font-mono actually paint in their
//    declared primary face. This uses rendered widths, not document.fonts.check:
//    the same sample must measure identically with the declared stack and the
//    primary family alone, but differently with the stack's generic fallback.
//
// Requires the dev server on :5000 (public route, no login). Exits 1 on any
// failure. Evidence: /tmp/validation/ds-showcase.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowserWithLease } from './playwright-launch-lease.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));

const BASE = process.env.AUDIT_BASE_URL || process.env.BASE_URL || 'http://localhost:5000';
const OUT = '/tmp/validation/ds-showcase';
fs.mkdirSync(OUT, { recursive: true });

function chromePath() {
  const cache = path.join(ROOT, '.cache/ms-playwright');
  const dir = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
  if (!dir) throw new Error('No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium');
  return path.join(cache, dir, 'chrome-linux64/chrome');
}

// Wait up to 120s for the server so this can run in parallel with app startup.
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

const results = [];
const log = (k, pass, detail) => { results.push({ k, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${k} :: ${detail}`); };

const browser = await launchBrowserWithLease(
  chromium,
  { headless: true, executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage'] },
  'ds-showcase',
);
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/design-system`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-testid="text-ds-title"]', { timeout: 30000 });

  // Compare every rendered token row against live computed values, retrying
  // briefly (observer -> setState -> render is async but fast).
  const catalogMatches = async () => {
    const deadline = Date.now() + 5000;
    let last = { mismatches: [{ token: 'never-ran', shown: '', live: '' }], total: 0 };
    while (Date.now() < deadline) {
      last = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        const rows = [...document.querySelectorAll('[data-testid^="ds-token-value-"]')];
        const mismatches = [];
        for (const row of rows) {
          const token = `--${row.getAttribute('data-testid').replace('ds-token-value-', '')}`;
          const shown = row.textContent.trim();
          const live = cs.getPropertyValue(token).trim();
          if (shown !== live) mismatches.push({ token, shown: shown.slice(0, 60), live: live.slice(0, 60) });
        }
        return { mismatches, total: rows.length };
      });
      if (last.total > 0 && last.mismatches.length === 0) return last;
      await new Promise(r => setTimeout(r, 200));
    }
    return last;
  };

  const SYSTEMS = ['editorial', 'terminal', 'geist', 'brutalist', 'swiss'];
  const perSystem = {};
  const paintFonts = async (targetPage = page) => {
    const deadline = Date.now() + 15000;
    let last = [];
    while (Date.now() < deadline) {
      last = await targetPage.evaluate(async () => {
        const GENERIC_FAMILIES = new Set([
          'serif',
          'sans-serif',
          'cursive',
          'fantasy',
          'monospace',
          'system-ui',
          'ui-serif',
          'ui-sans-serif',
          'ui-monospace',
          'ui-rounded',
          'math',
          'emoji',
          'fangsong',
        ]);
        const FONT_TOKENS = [
          { token: '--font-display', weight: getComputedStyle(document.documentElement).getPropertyValue('--display-weight').trim() || '400' },
          { token: '--font-body', weight: '400' },
          { token: '--font-mono', weight: '400' },
        ];
        const SAMPLE = 'Aa Bb Cc Dd Ee Ff Gg Hh 0123456789 — @#$%';

        const splitStack = (stack) => {
          const parts = [];
          let current = '';
          let quote = '';
          for (const char of stack) {
            if (quote) {
              current += char;
              if (char === quote) quote = '';
            } else if (char === '"' || char === "'") {
              quote = char;
              current += char;
            } else if (char === ',') {
              if (current.trim()) parts.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          if (current.trim()) parts.push(current.trim());
          return parts;
        };
        const unquote = (family) => {
          const trimmed = family.trim();
          if (
            trimmed.length >= 2 &&
            ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
              (trimmed.startsWith('"') && trimmed.endsWith('"')))
          ) {
            return trimmed.slice(1, -1);
          }
          return trimmed;
        };
        const cssFamily = (family) => `"${family.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;

        const probe = document.createElement('span');
        probe.textContent = SAMPLE;
        probe.style.cssText = [
          'position: fixed',
          'left: -10000px',
          'top: -10000px',
          'display: inline-block',
          'white-space: nowrap',
          'font-size: 64px',
          'font-style: normal',
          'font-kerning: none',
          'letter-spacing: 0',
          'line-height: 1',
          'visibility: hidden',
        ].join(';');
        document.body.appendChild(probe);

        const results = [];
        try {
          const rootStyle = getComputedStyle(document.documentElement);
          for (const { token, weight } of FONT_TOKENS) {
            const stack = rootStyle.getPropertyValue(token).trim();
            const families = splitStack(stack);
            const primary = families[0] ? unquote(families[0]) : '';
            const primaryKey = primary.toLowerCase();
            const generic = families
              .map(unquote)
              .find((family) => GENERIC_FAMILIES.has(family.toLowerCase())) || '';
            const result = {
              token,
              weight,
              stack,
              primary,
              generic,
              declaredWidth: null,
              forcedWidth: null,
              fallbackWidth: null,
              pass: false,
              error: '',
            };

            if (!primary) {
              result.error = 'token resolves to an empty font stack';
              results.push(result);
              continue;
            }
            if (GENERIC_FAMILIES.has(primaryKey)) {
              result.error = `primary family "${primary}" is generic; the system has no designed face to paint`;
              results.push(result);
              continue;
            }
            if (!generic) {
              result.error = `stack has no generic fallback: ${stack}`;
              results.push(result);
              continue;
            }

            // A FontFaceSet check is intentionally not used here. Loading the
            // exact weight first is important for static per-weight Google
            // Fonts faces: a weight nothing paints can otherwise measure like
            // the fallback even while the requested face is correctly loaded.
            await document.fonts.load(`${weight} 64px ${cssFamily(primary)}`, SAMPLE);
            const measure = (fontFamily) => {
              probe.style.fontFamily = fontFamily;
              return probe.getBoundingClientRect().width;
            };
            result.declaredWidth = measure(stack);
            result.forcedWidth = measure(cssFamily(primary));
            result.fallbackWidth = measure(generic);
            result.pass =
              result.declaredWidth === result.forcedWidth &&
              result.declaredWidth !== result.fallbackWidth;
            if (!result.pass) {
              result.error =
                `declared=${result.declaredWidth} forced=${result.forcedWidth} fallback=${result.fallbackWidth}`;
            }
            results.push(result);
          }
        } finally {
          probe.remove();
        }
        return results;
      });
      if (last.length === 3 && last.every((result) => result.pass)) return last;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return last;
  };

  for (const id of SYSTEMS) {
    await page.click(`[data-testid="ds-system-${id}"]`);
    await page.waitForFunction((sid) => document.documentElement.getAttribute('data-system') === sid, id, { timeout: 5000 });
    const { mismatches, total } = await catalogMatches();
    log(`switch-${id}-live-tokens`, mismatches.length === 0 && total > 20,
      mismatches.length === 0
        ? `${total} rendered token values match getComputedStyle`
        : `${mismatches.length}/${total} stale rows, e.g. ${JSON.stringify(mismatches.slice(0, 3))}`);
    // Font availability is document-scoped. Do not measure in the showcase
    // page after several switches: previously loaded system stylesheets stay
    // registered there and can mask a missing family in a later system that
    // happens to share the face (Terminal and Swiss both use IBM Plex Mono).
    const fontContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await fontContext.addInitScript((systemId) => {
      localStorage.setItem('ds-system', systemId);
      localStorage.removeItem('ds-font-override');
    }, id);
    const fontPage = await fontContext.newPage();
    await fontPage.goto(`${BASE}/design-system`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await fontPage.waitForSelector('[data-testid="text-ds-title"]', { timeout: 30000 });
    await fontPage.waitForFunction(
      (systemId) => document.documentElement.getAttribute('data-system') === systemId,
      id,
      { timeout: 5000 },
    );
    const fontResults = await paintFonts(fontPage);
    await fontContext.close();
    log(`font-paint-${id}`, fontResults.length === 3 && fontResults.every((result) => result.pass),
      fontResults.map((result) =>
        `${result.token}=${result.pass ? 'painted' : `FAILED (${result.error})`}`).join('; '));
    perSystem[id] = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { radius: cs.getPropertyValue('--radius').trim(), display: cs.getPropertyValue('--font-display').trim() };
    });
    await page.screenshot({ path: path.join(OUT, `${id}.png`) });
  }

  // Not one frozen snapshot: radius and display face must vary across systems.
  const radii = new Set(Object.values(perSystem).map(s => s.radius));
  const faces = new Set(Object.values(perSystem).map(s => s.display));
  log('cross-system-divergence', radii.size >= 3 && faces.size === 5,
    `radii=${[...radii].join('|')} faces=${faces.size}/5 distinct`);

  // Accent flip on the last system: displayed --accent must follow immediately.
  await page.click('[data-testid="ds-accent-violet"]');
  await page.waitForFunction(() => document.documentElement.getAttribute('data-accent') === 'violet', null, { timeout: 5000 });
  const afterAccent = await catalogMatches();
  const accentShown = await page.textContent('[data-testid="ds-token-value-accent"]');
  log('accent-flip-live-tokens', afterAccent.mismatches.length === 0 && accentShown.trim() === '#9d4edd',
    afterAccent.mismatches.length === 0
      ? `--accent row shows ${accentShown.trim()} for violet`
      : `${afterAccent.mismatches.length} stale rows after accent flip`);

  // Mutation proof: a system stylesheet that drops a designed family and
  // leaves only its generic fallback must fail this gate. This is deliberately
  // done in the browser against a temporary inline override, so the real
  // checkout and the running app remain untouched while the failure path is
  // exercised on every validation run.
  const mutation = await page.evaluate(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--font-mono');
    const priority = root.style.getPropertyPriority('--font-mono');
    root.style.setProperty('--font-mono', 'ui-monospace, monospace', 'important');
    return {
      previous,
      priority,
      computed: getComputedStyle(root).getPropertyValue('--font-mono').trim(),
    };
  });
  const mutationResult = await paintFonts();
  await page.evaluate(({ previous, priority }) => {
    const root = document.documentElement;
    root.style.removeProperty('--font-mono');
    if (previous) root.style.setProperty('--font-mono', previous, priority);
  }, mutation);
  const mutatedMono = mutationResult.find((result) => result.token === '--font-mono');
  log('font-paint-mutation-detection', Boolean(mutatedMono && !mutatedMono.pass),
    mutatedMono
      ? `dropping the named mono face to "${mutation.computed}" was ${mutatedMono.pass ? 'not detected' : 'detected'}`
      : 'mono probe did not return a result');
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.pass);
console.log(failed.length === 0 ? `\nALL ${results.length} CHECKS PASSED` : `\n${failed.length}/${results.length} CHECKS FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
