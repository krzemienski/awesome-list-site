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
  for (const id of SYSTEMS) {
    await page.click(`[data-testid="ds-system-${id}"]`);
    await page.waitForFunction((sid) => document.documentElement.getAttribute('data-system') === sid, id, { timeout: 5000 });
    const { mismatches, total } = await catalogMatches();
    log(`switch-${id}-live-tokens`, mismatches.length === 0 && total > 20,
      mismatches.length === 0
        ? `${total} rendered token values match getComputedStyle`
        : `${mismatches.length}/${total} stale rows, e.g. ${JSON.stringify(mismatches.slice(0, 3))}`);
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
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.pass);
console.log(failed.length === 0 ? `\nALL ${results.length} CHECKS PASSED` : `\n${failed.length}/${results.length} CHECKS FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
