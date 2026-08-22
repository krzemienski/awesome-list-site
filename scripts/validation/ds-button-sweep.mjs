// Automated stage-6 stray-button gate (task #349).
//
// Runs the EXACT "Stage 6 · Button sweep" filter from
// .agents/skills/verify-design-system/SKILL.md (executable copy in
// ./ds-button-filter.mjs) against the key public routes in headless
// Chromium. A hand-rolled, non-tokenized <button> that matches none of:
//   data-ds-variant · shadcn/Radix primitive attributes · the known
//   composite-chrome exclusions · raw DS classes
// fails the gate with a readable list (data-testid / aria-label / class
// prefix / text).
//
// Also enforces filter parity: the string/regex literals in the shared
// module must equal the ones in the skill's fenced snippet, so the skill
// and this gate cannot drift silently.
//
// Two routes load with an active tag filter so the active-filter removal
// chips (which only render once a filter is applied — see the skill's
// "Known composite chrome" note) are actually present and exercised.
//
// Requires the dev server on :5000 (public routes, no login). Exits 1 on
// any failure. Evidence: /tmp/validation/ds-button-sweep.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowserWithLease } from './playwright-launch-lease.mjs';
import { collectStrayButtons } from './ds-button-filter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));

const BASE = process.env.AUDIT_BASE_URL || process.env.BASE_URL || 'http://localhost:5000';
const OUT = '/tmp/validation/ds-button-sweep';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const log = (k, pass, detail) => { results.push({ k, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${k} :: ${detail}`); };

function chromePath() {
  const cache = path.join(ROOT, '.cache/ms-playwright');
  const dir = fs.readdirSync(cache).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
  if (!dir) throw new Error('No chromium-* dir in .cache/ms-playwright — run npx playwright install chromium');
  return path.join(cache, dir, 'chrome-linux64/chrome');
}

// ---------------------------------------------------------------------------
// Drift guard: the shared module's filter literals must match the skill's
// stage-6 snippet. Compares the set of quoted strings + /^…/ regex literals
// (the drift-prone part: selectors, aria-labels, testids, class prefixes).
// ---------------------------------------------------------------------------
{
  const SKILL = path.join(ROOT, '.agents/skills/verify-design-system/SKILL.md');
  const MODULE = path.join(ROOT, 'scripts/validation/ds-button-filter.mjs');

  const stripComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');
  const literalTokens = (src) => {
    const clean = stripComments(src);
    const tokens = new Set();
    for (const m of clean.matchAll(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g)) tokens.add(m[0]);
    for (const m of clean.matchAll(/\/\^[^\n/]*\//g)) tokens.add(m[0]);
    return tokens;
  };

  const skillSrc = fs.readFileSync(SKILL, 'utf8');
  const snippet = skillSrc.match(/### Button sweep\s+```js\n([\s\S]*?)```/)?.[1];
  const moduleSrc = fs.readFileSync(MODULE, 'utf8');
  const region = moduleSrc.match(/STAGE6-FILTER-START[^\n]*\n([\s\S]*?)\/\/ STAGE6-FILTER-END/)?.[1];

  if (!snippet || !region) {
    log('filter-parity', false, `could not locate ${!snippet ? 'the "### Button sweep" js snippet in SKILL.md' : 'the STAGE6-FILTER markers in ds-button-filter.mjs'}`);
  } else {
    const a = literalTokens(snippet);
    const b = literalTokens(region);
    const onlySkill = [...a].filter(t => !b.has(t));
    const onlyModule = [...b].filter(t => !a.has(t));
    log('filter-parity', onlySkill.length === 0 && onlyModule.length === 0,
      onlySkill.length === 0 && onlyModule.length === 0
        ? `${a.size} filter literals identical in SKILL.md stage 6 and ds-button-filter.mjs`
        : `DRIFT — update both files together. Only in SKILL.md: ${JSON.stringify(onlySkill)}; only in ds-button-filter.mjs: ${JSON.stringify(onlyModule)}`);
  }
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

async function firstCategorySlug() {
  try {
    const raw = await fetch(`${BASE}/api/awesome-list`).then(r => r.json());
    const cats = raw?.categories ?? raw?.data?.categories ?? [];
    return cats.find(c => c?.slug)?.slug ?? 'encoding-codecs';
  } catch {
    return 'encoding-codecs';
  }
}
const slug = await firstCategorySlug();
// Any benign tag works: the removal chips render from URL/filter state, not
// from corpus membership (and 'hls' is a real, common tag anyway).
const TAG = 'hls';

// The key public routes from the skill/task, plus two tag-active variants so
// the filter-removal chips exist in the DOM when the exclusions run.
const ROUTES = [
  { name: 'home', path: '/' },
  // Home deep-links ?tags= into AdvancedFilter → renders the
  // `aria-label="Remove <tag> filter"` removal chips.
  { name: 'home-tag-chips', path: `/?tags=${TAG}`, expect: `[aria-label="Remove ${TAG} filter"]` },
  { name: 'category', path: `/category/${slug}` },
  // Taxonomy pages render SearchFilters.ActiveFilters (the
  // data-testid="active-filter-chips" strip) when a tag is active.
  { name: 'category-tag-chips', path: `/category/${slug}?tags=${TAG}`, expect: '[data-testid="active-filter-chips"]' },
  { name: 'journeys', path: '/journeys' },
  { name: 'advanced', path: '/advanced' },
  { name: 'search', path: '/search?q=video' },
  { name: 'search-active-chips', path: `/search?q=video&tags=${TAG}`, expect: '[data-testid="active-filter-chips"]' },
  { name: 'categories', path: '/categories' },
];

const browser = await launchBrowserWithLease(
  chromium,
  { headless: true, executablePath: chromePath(), args: ['--no-sandbox', '--disable-dev-shm-usage'] },
  'ds-button-sweep',
);
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const sweepRoute = async (route) => {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.page', { timeout: 30000 });
    // Content rendered = at least one DS-hooked primitive button on screen.
    await page.waitForFunction(() => document.querySelectorAll('button[data-ds-variant]').length > 0, null, { timeout: 30000 });
    // og-middleware prerenders crawler chrome (.ssr-chrome: drawer ☰ + search
    // submit) that hydration replaces; sweep only the hydrated app — the
    // manual DevTools stage-6 sweep never sees this shell either.
    await page.waitForFunction(() => !document.querySelector('.ssr-chrome'), null, { timeout: 30000 });
    if (route.expect) await page.waitForSelector(route.expect, { timeout: 20000 });
    await page.waitForTimeout(600); // settle async chunks (cards, facets)
    let sweep = await page.evaluate(collectStrayButtons);
    if (sweep.strays.length > 0) {
      // Confirm before failing: transient pre-hydration/loading chrome can
      // linger when the whole validation suite saturates the machine. A real
      // hand-rolled button is still there 3s later.
      await page.waitForTimeout(3000);
      sweep = await page.evaluate(collectStrayButtons);
    }
    return sweep;
  };

  for (const route of ROUTES) {
    let sweep;
    try {
      sweep = await sweepRoute(route);
    } catch (e) {
      // Cold-boot renders can flake right after a server restart — retry once.
      try { sweep = await sweepRoute(route); }
      catch (e2) { log(`route-${route.name}`, false, `sweep failed twice: ${e2.message.split('\n')[0]}`); continue; }
    }
    const sane = sweep.total > 0 && sweep.dsVariantCount > 0;
    const pass = sane && sweep.strays.length === 0;
    if (pass) {
      log(`route-${route.name}`, true, `${route.path} — 0 stray of ${sweep.total} buttons (${sweep.dsVariantCount} DS-hooked)`);
    } else if (!sane) {
      log(`route-${route.name}`, false, `${route.path} — vacuous render (total=${sweep.total}, dsVariant=${sweep.dsVariantCount})`);
    } else {
      await page.screenshot({ path: path.join(OUT, `${route.name}.png`), fullPage: true }).catch(() => {});
      const list = sweep.strays.map((s, i) =>
        `  ${i + 1}. testid=${s.testid ?? '—'} aria-label=${s.ariaLabel ?? '—'} text=${JSON.stringify(s.text ?? '')} class=${s.classPrefix ?? '—'}`).join('\n');
      log(`route-${route.name}`, false, `${route.path} — ${sweep.strays.length} stray button(s) match no DS hook/exclusion:\n${list}\n  → triage with the stage-6 ladder in .agents/skills/verify-design-system/SKILL.md; if it is new compliant composite chrome, add it to BOTH the skill list and scripts/validation/ds-button-filter.mjs`);
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.pass);
console.log(failed.length === 0 ? `\nALL ${results.length} CHECKS PASSED` : `\n${failed.length}/${results.length} CHECKS FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
