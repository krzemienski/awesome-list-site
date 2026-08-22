// Automated stage-6 stray-primitive gate (task #349; extended by #353).
//
// Runs the EXACT stage-6 filters from
// .agents/skills/verify-design-system/SKILL.md (executable copies in
// ./ds-button-filter.mjs) against the key public routes in headless
// Chromium:
//   · buttons — hand-rolled, non-tokenized <button>s ("### Button sweep")
//   · inputs  — raw <input>/<select>/<textarea> that aren't the shadcn
//     primitives ("### Input sweep")
//   · chips   — pill-styled spans/divs built by hand instead of the Badge
//     primitive ("### Chip sweep")
//   · cards   — clickable/hoverable bg-card surfaces missing
//     data-ds="card-hover" ("### Card sweep")
// Any hit fails the gate with a readable list (data-testid / aria-label /
// class prefix / text).
//
// Also enforces filter parity: the string/regex literals in each shared
// module region must equal the ones in the skill's matching fenced snippet,
// so the skill and this gate cannot drift silently.
//
// Two routes load with an active tag filter so the active-filter removal
// chips (which only render once a filter is applied — see the skill's
// "Known composite chrome" note) are actually present and exercised.
//
// Task #352: the static DOM never renders buttons inside CLOSED overlays,
// so a second scenario list opens the high-traffic ones before running the
// same filter: the header search command dialog (cmdk), the Home "Filter by
// Tag" popover, and the /search mobile Filters sheet. Overlay interiors are
// swept button-by-button (the filter deliberately has NO container-level
// blanket exclusion for cmdk/popper content). Each scenario asserts the
// overlay actually activated (data-state="open" + buttons inside it) AND
// runs a detector canary — a synthetic rogue button injected inside the
// open overlay must be flagged — so a scenario can never pass while blind.
//
// Requires the dev server on :5000 (public routes, no login). Exits 1 on
// any failure. Evidence: /tmp/validation/ds-button-sweep.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchBrowserWithLease } from './playwright-launch-lease.mjs';
import { collectStrayButtons, collectStrayInputs, collectStrayChips, collectStrayCards } from './ds-button-filter.mjs';

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
// Drift guard: each shared-module filter's literals must match the skill's
// matching stage-6 snippet. Compares the set of quoted strings + /^…/ regex
// literals (the drift-prone part: selectors, aria-labels, testids, class
// prefixes) per filter.
// ---------------------------------------------------------------------------
const SWEEPS = [
  { kind: 'buttons', heading: '### Button sweep', marker: 'STAGE6-FILTER', collect: collectStrayButtons },
  { kind: 'inputs', heading: '### Input sweep', marker: 'STAGE6-INPUT-FILTER', collect: collectStrayInputs },
  { kind: 'chips', heading: '### Chip sweep', marker: 'STAGE6-CHIP-FILTER', collect: collectStrayChips },
  { kind: 'cards', heading: '### Card sweep', marker: 'STAGE6-CARD-FILTER', collect: collectStrayCards },
];
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
  const moduleSrc = fs.readFileSync(MODULE, 'utf8');
  for (const { kind, heading, marker } of SWEEPS) {
    const snippet = skillSrc.match(new RegExp(`${heading}\\s+\`\`\`js\\n([\\s\\S]*?)\`\`\``))?.[1];
    const region = moduleSrc.match(new RegExp(`${marker}-START[^\\n]*\\n([\\s\\S]*?)// ${marker}-END`))?.[1];

    if (!snippet || !region) {
      log(`filter-parity-${kind}`, false, `could not locate ${!snippet ? `the "${heading}" js snippet in SKILL.md` : `the ${marker} markers in ds-button-filter.mjs`}`);
    } else {
      const a = literalTokens(snippet);
      const b = literalTokens(region);
      const onlySkill = [...a].filter(t => !b.has(t));
      const onlyModule = [...b].filter(t => !a.has(t));
      log(`filter-parity-${kind}`, onlySkill.length === 0 && onlyModule.length === 0,
        onlySkill.length === 0 && onlyModule.length === 0
          ? `${a.size} filter literals identical in SKILL.md stage 6 ("${heading.slice(4)}") and ds-button-filter.mjs`
          : `DRIFT — update both files together. Only in SKILL.md: ${JSON.stringify(onlySkill)}; only in ds-button-filter.mjs: ${JSON.stringify(onlyModule)}`);
    }
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
// ---------------------------------------------------------------------------
// Overlay scenarios (task #352): buttons inside CLOSED overlays never exist
// in the static DOM, so each scenario opens one high-traffic overlay before
// running the SAME collectStrayButtons() filter. `open` clicks the trigger;
// `openedSelector` is the condition-based activation proof (Radix data-state
// / rendered overlay content — never a fixed sleep); `scope` is the overlay
// container whose button count must be > 0 or the scenario is vacuous.
// Every scenario navigates fresh (page.goto), so no close choreography is
// needed — Radix's body pointer-events lock through close animations (see
// prior flake notes) can never eat the next scenario's trigger click.
// ---------------------------------------------------------------------------
const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };
const OVERLAYS = [
  {
    // Header search chip → Radix Dialog wrapping cmdk. Exercises the
    // [cmdk-root] exclusion, the Dialog close ✕ (sr-only) exclusion, and —
    // via seeded recent searches — the button-clear-recent-searches testid.
    name: 'search-dialog',
    path: '/',
    viewport: DESKTOP,
    setup: async (page) => {
      await page.evaluate(() => localStorage.setItem('recent-searches', JSON.stringify(['hls', 'codec'])));
    },
    open: async (page) => { await page.click('button[aria-label="Open search"]'); },
    openedSelector: '[role="dialog"][data-state="open"] [cmdk-root]',
    alsoExpect: '[data-testid="button-clear-recent-searches"]',
    scope: '[role="dialog"][data-state="open"]',
  },
  {
    // Home "Filter by Tag" popover (client/src/components/ui/advanced-filter.tsx).
    // Exercises the [data-radix-popper-content-wrapper] exclusion plus the
    // aria-pressed tag toggle rows and the Collapsible trigger (data-state).
    name: 'tag-filter-popover',
    path: '/',
    viewport: DESKTOP,
    open: async (page) => { await page.click('button:not([disabled]):has-text("Filter by Tag")'); },
    openedSelector: '[data-radix-popper-content-wrapper] button[aria-pressed]',
    scope: '[data-radix-popper-content-wrapper]',
  },
  {
    // /search mobile "Filters" Sheet (SearchFilters.tsx, lg:hidden → needs a
    // phone viewport). A real Radix Sheet: exercises the Sheet close ✕
    // (sr-only in [role="dialog"]) and the aria-pressed facet rows.
    name: 'filters-sheet',
    path: '/search?q=video',
    viewport: MOBILE,
    open: async (page) => { await page.click('[data-testid="button-open-filters"]'); },
    openedSelector: '[role="dialog"][data-state="open"] button[aria-pressed]',
    alsoExpect: '[role="dialog"][data-state="open"] [data-testid="input-search-tags"]',
    scope: '[role="dialog"][data-state="open"]',
  },
];

try {
  const page = await browser.newPage({ viewport: DESKTOP });

  const gotoAndSettle = async (route) => {
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
  };

  const runAll = async () => {
    const out = {};
    for (const { kind, collect } of SWEEPS) out[kind] = await page.evaluate(collect);
    return out;
  };

  const confirmedSweeps = async () => {
    let sweeps = await runAll();
    if (Object.values(sweeps).some(s => s.strays.length > 0)) {
      // Confirm before failing: transient pre-hydration/loading chrome can
      // linger when the whole validation suite saturates the machine. A real
      // hand-rolled element is still there 3s later.
      await page.waitForTimeout(3000);
      sweeps = await runAll();
    }
    return sweeps;
  };

  const sweepRoute = async (route) => {
    await gotoAndSettle(route);
    return confirmedSweeps();
  };

  const strayReport = (name, routePath, kind, sweep) =>
    log(name, false, `${routePath} — ${sweep.strays.length} stray ${kind} match no DS hook/exclusion:\n${sweep.strays.map((s, i) =>
      `  ${i + 1}. ${s.tag ? `tag=${s.tag} ` : ''}testid=${s.testid ?? '—'} aria-label=${s.ariaLabel ?? '—'} text=${JSON.stringify(s.text ?? '')} class=${s.classPrefix ?? '—'}`).join('\n')}\n  → triage with the stage-6 ladder in .agents/skills/verify-design-system/SKILL.md; if it is new compliant composite chrome, add it to BOTH the skill list and scripts/validation/ds-button-filter.mjs`);

  for (const route of ROUTES) {
    let sweeps;
    try {
      sweeps = await sweepRoute(route);
    } catch (e) {
      // Cold-boot renders can flake right after a server restart — retry once.
      try { sweeps = await sweepRoute(route); }
      catch (e2) { log(`route-${route.name}`, false, `sweep failed twice: ${e2.message.split('\n')[0]}`); continue; }
    }
    for (const { kind } of SWEEPS) {
      const sweep = sweeps[kind];
      // Only the button sweep doubles as the render-sanity probe: every route
      // has DS-hooked buttons, but zero inputs/chips/cards can be legitimate.
      const sane = kind !== 'buttons' || (sweep.total > 0 && sweep.dsVariantCount > 0);
      const pass = sane && sweep.strays.length === 0;
      if (pass) {
        const hooked = kind === 'buttons' ? `${sweep.dsVariantCount} DS-hooked of ${sweep.total}` : `${sweep.total} DS-hooked`;
        log(`route-${route.name}-${kind}`, true, `${route.path} — 0 stray ${kind} (${hooked})`);
      } else if (!sane) {
        log(`route-${route.name}-${kind}`, false, `${route.path} — vacuous render (total=${sweep.total}, dsVariant=${sweep.dsVariantCount})`);
      } else {
        await page.screenshot({ path: path.join(OUT, `${route.name}-${kind}.png`), fullPage: true }).catch(() => {});
        strayReport(`route-${route.name}-${kind}`, route.path, kind, sweep);
      }
    }
  }

  const sweepOverlay = async (o) => {
    await page.setViewportSize(o.viewport);
    await gotoAndSettle(o);
    if (o.setup) await o.setup(page);
    await o.open(page);
    // Condition-based activation wait — Radix animates open/close and keeps
    // body pointer-events locked mid-transition, so wait on rendered overlay
    // content, never a fixed sleep.
    await page.waitForSelector(o.openedSelector, { timeout: 15000 });
    if (o.alsoExpect) await page.waitForSelector(o.alsoExpect, { timeout: 15000 });
    await page.waitForTimeout(400); // settle async overlay content (tag lists, facets)
    const overlayButtons = await page.evaluate(
      (scope) => document.querySelectorAll(`${scope} button`).length, o.scope);
    const sweeps = await confirmedSweeps();
    // Detector canary: inject a synthetic rogue button INSIDE the open
    // overlay and prove the button filter flags it. Rendered-button counts
    // alone don't prove coverage — a blanket container exclusion would
    // render this whole scenario blind while still "passing" (review of
    // #352).
    const CANARY_ID = 'qa-canary-rogue-button';
    await page.evaluate(({ scope, id }) => {
      const host = document.querySelector(scope);
      if (!host) return;
      const rogue = document.createElement('button');
      rogue.type = 'button';
      rogue.setAttribute('data-testid', id);
      rogue.textContent = 'QA canary rogue';
      host.appendChild(rogue);
    }, { scope: o.scope, id: CANARY_ID });
    const canarySweep = await page.evaluate(collectStrayButtons);
    await page.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.remove(), CANARY_ID);
    const canaryCaught = canarySweep.strays.some((s) => s.testid === CANARY_ID);
    return { sweeps, overlayButtons, canaryCaught };
  };

  for (const o of OVERLAYS) {
    let sweeps, overlayButtons, canaryCaught;
    try {
      ({ sweeps, overlayButtons, canaryCaught } = await sweepOverlay(o));
    } catch (e) {
      try { ({ sweeps, overlayButtons, canaryCaught } = await sweepOverlay(o)); }
      catch (e2) { log(`overlay-${o.name}`, false, `overlay sweep failed twice (trigger/overlay missing?): ${e2.message.split('\n')[0]}`); continue; }
    }
    // Harness-verified activation: the overlay must actually contribute
    // buttons to the sweep AND the canary rogue injected inside it must be
    // detectable, or the scenario proved nothing. All four filter kinds run
    // with the overlay open (overlays contain inputs/chips too).
    const sane = sweeps.buttons.total > 0 && sweeps.buttons.dsVariantCount > 0 && overlayButtons > 0;
    if (!sane) {
      log(`overlay-${o.name}`, false, `${o.path} — vacuous overlay sweep (total=${sweeps.buttons.total}, dsVariant=${sweeps.buttons.dsVariantCount}, overlayButtons=${overlayButtons})`);
      continue;
    }
    if (!canaryCaught) {
      log(`overlay-${o.name}`, false, `${o.path} — DETECTOR BLIND: a synthetic rogue button injected inside the open overlay was NOT flagged by the stage-6 filter; an exclusion is blanket-covering this overlay's interior`);
      continue;
    }
    for (const { kind } of SWEEPS) {
      const sweep = sweeps[kind];
      if (sweep.strays.length === 0) {
        const extra = kind === 'buttons' ? `overlay open (${overlayButtons} button(s) inside), canary rogue detected, ` : '';
        log(`overlay-${o.name}-${kind}`, true, `${o.path} — ${extra}0 stray ${kind} of ${sweep.total} total`);
      } else {
        await page.screenshot({ path: path.join(OUT, `overlay-${o.name}-${kind}.png`), fullPage: true }).catch(() => {});
        strayReport(`overlay-${o.name}-${kind}`, o.path, kind, sweep);
      }
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.pass);
console.log(failed.length === 0 ? `\nALL ${results.length} CHECKS PASSED` : `\n${failed.length}/${results.length} CHECKS FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
