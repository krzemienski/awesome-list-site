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
//   · h1s     — page titles missing .display-h, or pinning font-sans /
//     font-medium over it ("### Page-title sweep", task #356)
//   · eyebrows — hand-pinned mono-uppercase section labels that skip
//     .eyebrow ("### Eyebrow sweep", task #356)
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
// Task #360: the anonymous sweep can never see signed-in chrome, so a third
// scenario creates a disposable Clerk user (+clerk_test email, fixed OTP
// 424242 on the dev instance), signs in through the real UI, seeds the
// minimal rows conditional UI needs (one in_app_notifications row so the
// kind label renders; one bookmark so the library grid renders), and runs
// the SAME six filters on the key signed-in routes: /notifications,
// /onboarding, signed-in /, /bookmarks, /settings. Everything is torn down
// in finally (Clerk user + local rows, sweeping this scenario's __qa_test_
// prefix, residue from aborted runs included). Detector-canary discipline:
// a synthetic rogue button AND a rogue mono-uppercase label injected on
// /notifications must be flagged, so the authed sweep can never pass blind.
//
// Task #364: the /bookmarks collection chrome only renders once a collection
// exists / rows are selected, so the authed scenario also seeds one bookmark
// collection (POST /api/collections) containing the seeded bookmark. That
// makes the per-collection sidebar rows + their reorder arrow buttons render
// on /bookmarks, and /bookmarks?collection=<id> renders the collection
// management button strip (rename/archive/publish/delete). Two authed
// interaction scenarios then sweep the remaining conditional chrome: the
// bulk-selection action bar (select-all → bulk controls) and the "New
// collection" dialog, each with the overlay-style rogue-button canary so
// they can never pass blind. Collection rows cascade with the QA user in
// the finally teardown.
//
// Task #367: the last conditional /bookmarks surfaces. The seeded collection
// is published (POST /api/collections/:id/publish) so the share controls
// ("Copy link" / "Unpublish" + public-link line) render on
// /bookmarks?collection=<id> and are swept by the route pass (expectAll
// proves they rendered), and two more authed interaction scenarios open the
// per-bookmark Note dialog (BookmarkNotesDialog) and the delete-collection
// AlertDialog (sweep only — never confirmed) with the same activation-proof
// + rogue-button-canary discipline.
//
// Task #372: the shared link's actual destination — the anonymous public
// shared-collection page at /collection/:shareId — never appears in the
// static route list (it needs a live published collection). The authed
// scenario captures the shareId from the publish response and sweeps
// /collection/:shareId with the SAME six filters in a FRESH non-authed
// browser context (proven anonymous via /api/auth/user), while the seeded
// collection is still published. Activation proof: the seeded bookmark's
// rendered ResourceCard + the collection title in the page <h1>, so the
// sweep can never pass on the not-found branch or a half-rendered page.
//
// Task #363: the admin panel needs admin privileges, so a fifth scenario
// signs in as a reusable QA admin. Its stable identity intentionally sits
// outside the __qa_test_ namespace so concurrent net-zero cleanup cannot
// delete it mid-run; only this scenario's seeded rows use the scoped
// __qa_test_ds_admin_ prefix. The user is found-or-created via the Clerk API
// with its password rotated to a fresh random value every run, so no
// credential is ever stored. It signs in through the same UI flow, elevates the
// JIT-provisioned local row to role='admin' directly in the DB (roles are
// local app state read fresh per request — see
// .agents/memory/audit-key-header-auth.md for why the header path isn't used:
// ADMIN_PASSWORD isn't guaranteed in task envs, and the role-elevated user
// exercises the REAL signed-in admin chrome), seeds one pending resource so
// the approvals queue renders row chrome, and runs the SAME six filters on
// every admin tab (approvals … audit). Tab activation is harness-verified
// (aria-selected + a panel-specific selector) and the detector canary runs on
// the approvals tab. Teardown in finally sweeps ONLY this scenario's
// __qa_test_ds_admin_ prefix (never __qa_test_% wholesale — parallel gates
// own their own prefixes), including the FK refs an admin row can acquire.
//
// Task #368: the admin tab sweep (#363) only scans each tab's static panel
// DOM — dialogs that exist only while open are never rendered. A set of
// admin overlay scenarios therefore opens the key admin pop-ups and runs the
// SAME six filters with each one open: the add-resource dialog, the
// edit-resource dialog, the pending-resource detail dialog (opened from the
// seeded pending row), one taxonomy delete-confirmation dialog (opened on a
// seeded empty QA category — resourceCount must be 0 or the delete trigger
// is disabled — and always CANCELLED, never confirmed), and the journey step
// editor (steps dialog → Add step). Every scenario starts from a fresh
// /admin load so Radix's close-animation pointer-events lock can never eat
// the next trigger click; explicit dismissals condition-wait on dialog
// detach, never a fixed sleep. Each overlay repeats the rogue-button canary
// inside its open scope, so no scenario can pass while a blanket exclusion
// blinds it. The QA category is torn down with the rest of the
// __qa_test_ds_admin_ prefix in finally.
//
// Requires the dev server on :5000 plus CLERK_SECRET_KEY (disposable authed
// user) and DATABASE_URL (seeding + guaranteed teardown). Exits 1 on any
// failure. Evidence: /tmp/validation/ds-button-sweep.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { launchBrowserWithLease } from './playwright-launch-lease.mjs';
import { acquireGateLease } from './gate-lease.mjs';
import { collectStrayButtons, collectStrayInputs, collectStrayChips, collectStrayCards, collectStrayH1s, collectStrayEyebrows } from './ds-button-filter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(path.join(ROOT, 'node_modules/playwright/index.mjs'));

const BASE = process.env.AUDIT_BASE_URL || process.env.BASE_URL || 'http://localhost:5000';
const OUT = '/tmp/validation/ds-button-sweep';
fs.mkdirSync(OUT, { recursive: true });

// Fail closed: without these the signed-in half of the gate cannot run, and
// a silently anonymous-only sweep would defeat the point of task #360.
for (const key of ['CLERK_SECRET_KEY', 'DATABASE_URL']) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} is required (authed signed-in sweep + guaranteed QA teardown)`);
    process.exit(1);
  }
}

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
  { kind: 'h1s', heading: '### Page-title sweep', marker: 'STAGE6-H1-FILTER', collect: collectStrayH1s },
  { kind: 'eyebrows', heading: '### Eyebrow sweep', marker: 'STAGE6-EYEBROW-FILTER', collect: collectStrayEyebrows },
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

// The authed scenario signs in and JIT-provisions its user through the live
// DB; a concurrent resilience outage (real ACCESS EXCLUSIVE lock) would break
// the multi-step sign-in mid-flow. Hold the shared db-heavy lease, acquired
// BEFORE the browser lease so the lock order matches print-audit (gate lease
// first, then browser) and the two leases can never deadlock against it.
const releaseGateLease = await acquireGateLease('db-heavy', 'ds-button-sweep');
process.on('exit', releaseGateLease);

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

  const gotoAndSettle = async (pg, route) => {
    await pg.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pg.waitForSelector('.page', { timeout: 30000 });
    // Content rendered = at least one DS-hooked primitive button on screen.
    await pg.waitForFunction(() => document.querySelectorAll('button[data-ds-variant]').length > 0, null, { timeout: 30000 });
    // og-middleware prerenders crawler chrome (.ssr-chrome: drawer ☰ + search
    // submit) that hydration replaces; sweep only the hydrated app — the
    // manual DevTools stage-6 sweep never sees this shell either.
    await pg.waitForFunction(() => !document.querySelector('.ssr-chrome'), null, { timeout: 30000 });
    if (route.expect) await pg.waitForSelector(route.expect, { timeout: 20000 });
    for (const sel of route.expectAll ?? []) await pg.waitForSelector(sel, { timeout: 20000 });
    await pg.waitForTimeout(600); // settle async chunks (cards, facets)
  };

  const runAll = async (pg) => {
    const out = {};
    for (const { kind, collect } of SWEEPS) out[kind] = await pg.evaluate(collect);
    return out;
  };

  const confirmedSweeps = async (pg) => {
    let sweeps = await runAll(pg);
    if (Object.values(sweeps).some(s => s.strays.length > 0)) {
      // Confirm before failing: transient pre-hydration/loading chrome can
      // linger when the whole validation suite saturates the machine. A real
      // hand-rolled element is still there 3s later.
      await pg.waitForTimeout(3000);
      sweeps = await runAll(pg);
    }
    return sweeps;
  };

  const sweepRoute = async (pg, route) => {
    await gotoAndSettle(pg, route);
    return confirmedSweeps(pg);
  };

  const strayReport = (name, routePath, kind, sweep) =>
    log(name, false, `${routePath} — ${sweep.strays.length} stray ${kind} match no DS hook/exclusion:\n${sweep.strays.map((s, i) =>
      `  ${i + 1}. ${s.tag ? `tag=${s.tag} ` : ''}testid=${s.testid ?? '—'} aria-label=${s.ariaLabel ?? '—'} text=${JSON.stringify(s.text ?? '')} class=${s.classPrefix ?? '—'}`).join('\n')}\n  → triage with the stage-6 ladder in .agents/skills/verify-design-system/SKILL.md; if it is new compliant composite chrome, add it to BOTH the skill list and scripts/validation/ds-button-filter.mjs`);

  for (const route of ROUTES) {
    let sweeps;
    try {
      sweeps = await sweepRoute(page, route);
    } catch (e) {
      // Cold-boot renders can flake right after a server restart — retry once.
      try { sweeps = await sweepRoute(page, route); }
      catch (e2) { log(`route-${route.name}`, false, `sweep failed twice: ${e2.message.split('\n')[0]}`); continue; }
    }
    for (const { kind } of SWEEPS) {
      const sweep = sweeps[kind];
      // The button sweep doubles as the render-sanity probe (every route has
      // DS-hooked buttons) and every swept page must render a visible <h1>;
      // zero inputs/chips/cards/eyebrows can be legitimate.
      const sane = kind === 'buttons' ? (sweep.total > 0 && sweep.dsVariantCount > 0)
        : kind === 'h1s' ? sweep.total > 0
        : true;
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
    // Detector canaries for the two newest collectors (task #356): once, on
    // the home route, inject a synthetic off-system h1 and a hand-pinned
    // mono-uppercase label and prove both filters flag them — the eyebrow
    // sweep is heuristic (computed styles), so a silent no-match regression
    // would otherwise pass vacuously forever.
    if (route.name === 'home') {
      const caught = await page.evaluate(({ collectH1s, collectEyebrows }) => {
        const h1 = document.createElement('h1');
        h1.textContent = 'QA canary rogue title';
        const label = document.createElement('span');
        label.style.cssText = "font-family:'JetBrains Mono',monospace;text-transform:uppercase;font-size:11px";
        label.textContent = 'qa canary rogue label';
        document.body.append(h1, label);
        try {
          const h1Caught = new Function(`return (${collectH1s})()`)().strays.some(s => s.text === 'QA canary rogue title');
          const eyebrowCaught = new Function(`return (${collectEyebrows})()`)().strays.some(s => s.text === 'qa canary rogue label');
          return { h1Caught, eyebrowCaught };
        } finally { h1.remove(); label.remove(); }
      }, { collectH1s: collectStrayH1s.toString(), collectEyebrows: collectStrayEyebrows.toString() });
      log('canary-h1s', caught.h1Caught, caught.h1Caught
        ? 'synthetic h1 without .display-h was flagged by the page-title filter'
        : 'DETECTOR BLIND: a synthetic h1 without .display-h was NOT flagged');
      log('canary-eyebrows', caught.eyebrowCaught, caught.eyebrowCaught
        ? 'synthetic mono-uppercase label without .eyebrow was flagged by the eyebrow filter'
        : 'DETECTOR BLIND: a synthetic mono-uppercase label without .eyebrow was NOT flagged');
    }
  }

  const sweepOverlay = async (o) => {
    await page.setViewportSize(o.viewport);
    await gotoAndSettle(page, o);
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
    const sweeps = await confirmedSweeps(page);
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

  // -------------------------------------------------------------------------
  // Shared Clerk plumbing for the two signed-in scenarios (#360 authed user,
  // #363 admin user). Each scenario owns a distinct __qa_test_ sub-prefix and
  // purges ONLY that prefix, so neither can clobber the other — or a
  // concurrently running gate (e.g. collections-audit) — mid-flight.
  // -------------------------------------------------------------------------
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  const clerkApi = async (method, route, body) => {
    const res = await fetch(`https://api.clerk.com/v1${route}`, {
      method,
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`Clerk ${method} ${route} -> ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
    return data;
  };
  const listClerkUsers = async () => {
    const users = [];
    for (let offset = 0; offset < 1000; offset += 100) {
      const page = await clerkApi('GET', `/users?limit=100&offset=${offset}`);
      if (!Array.isArray(page)) break;
      users.push(...page);
      if (page.length < 100) break;
    }
    return users;
  };

  // Remove one scenario's user AND residue from previously aborted runs.
  // Clerk's `query` search is fuzzy AND can omit underscore-heavy emails, so
  // enumerate and enforce the exact prefix locally before any deletion.
  // `keepEmail` exempts a persistent user when one is supplied.
  const purgeClerkQaUsers = async (prefix, keepEmail) => {
    for (const u of await listClerkUsers()) {
      const emails = (u.email_addresses ?? []).map((a) => a.email_address);
      if (!emails.some((address) => address.startsWith(prefix))) continue;
      if (keepEmail && emails.includes(keepEmail)) continue;
      await clerkApi('DELETE', `/users/${u.id}`).catch(() => {});
    }
  };

  // Drive the real Clerk sign-in UI (post-Clerk there is no local login
  // API). Headless/new-device sessions land on the client-trust OTP step
  // (+clerk_test emails accept the fixed OTP 424242 on the dev instance).
  const measureClerkVerificationControls = async (pageToAuth) => {
    // Keep the pointer away from Clerk controls: its hover ring changes the
    // computed box while the code step is being inspected.
    await pageToAuth.mouse.move(0, 0);
    const measurements = await pageToAuth.evaluate(() => {
      const MIN_TOUCH_TARGET = 40;
      const elementKey = (element) => {
        const classes = [...element.classList];
        const clerkClass = classes.find((name) => name.startsWith('cl-'));
        return clerkClass?.replace(/^cl-/, '').split('__')[0] ?? null;
      };
      const root = document.querySelector('.cl-rootBox') ?? document;
      const controls = [
        {
          expectedKey: 'otpCodeFieldInput',
          label: 'verification-code cell',
          elements: [...root.querySelectorAll('.cl-otpCodeFieldInput')],
        },
        {
          expectedKey: 'identityPreviewEditButton',
          label: 'edit-email control',
          elements: [...root.querySelectorAll('.cl-identityPreviewEditButton')],
        },
      ];

      return {
        controls: controls.map(({ expectedKey, label, elements }) => ({
          expectedKey,
          label,
          count: elements.length,
          rendered: elements.map((element) => {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            return {
              tag: element.tagName.toLowerCase(),
              elementKey: elementKey(element),
              className: element.className,
              width: Math.round(rect.width * 100) / 100,
              height: Math.round(rect.height * 100) / 100,
              minWidth: styles.minWidth,
              minHeight: styles.minHeight,
            };
          }),
          passes: elements.length > 0 && elements.every((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width >= MIN_TOUCH_TARGET && rect.height >= MIN_TOUCH_TARGET;
          }),
        })),
      };
    });

    const missing = measurements.controls.filter((control) => control.count === 0);
    const undersized = measurements.controls.flatMap((control) =>
      control.rendered
        .filter((element) => element.width < 40 || element.height < 40)
        .map((element) => `${control.label} ${element.elementKey ?? control.expectedKey}=${element.width}x${element.height}px`),
    );
    const detail = measurements.controls
      .map((control) => `${control.label} (${control.expectedKey}): ${control.rendered.length > 0
        ? control.rendered.map((element) => `${element.elementKey ?? 'unknown-key'}=${element.width}x${element.height}px`).join(', ')
        : 'not rendered'}`)
      .join('; ');
    log('clerk-verification-controls', missing.length === 0 && undersized.length === 0,
      missing.length > 0
        ? `LIVE DOM missing ${missing.map((control) => control.label).join(', ')}; ${detail}`
        : undersized.length > 0
          ? `LIVE DOM touch target below 40px: ${undersized.join(', ')}; ${detail}`
          : `LIVE DOM measured at or above 40px: ${detail}`);

    // Keep the complete measurements in results.json as durable evidence, not
    // just the compact console line above.
    results.push({
      k: 'clerk-verification-controls-evidence',
      pass: missing.length === 0 && undersized.length === 0,
      detail: measurements,
    });
    await pageToAuth.screenshot({
      path: path.join(OUT, 'clerk-verification-code-step.png'),
      fullPage: true,
    });
  };

  // Reach the EMAIL-CODE variant specifically: the password-first
  // client-trust OTP screen renders the code cells but intentionally has no
  // edit-email affordance. Clerk's recovery flow exposes the real code step
  // that carries both live appearance keys, so this is the only non-vacuous
  // place to verify identityPreviewEditButton.
  const openClerkVerificationCodeStep = async (pageToAuth, email) => {
    await pageToAuth.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const identifier = pageToAuth.locator('input[name="identifier"]');
    await identifier.waitFor({ timeout: 30000 });
    await identifier.fill(email);
    await pageToAuth.keyboard.press('Enter');
    await pageToAuth.locator('input[name="password"]').waitFor({ timeout: 30000 });
    await pageToAuth.getByText(/forgot password/i).first().click();
    const emailCodeButton = pageToAuth.getByRole('button', { name: /^email code to /i }).first();
    await emailCodeButton.waitFor({ state: 'visible', timeout: 30000 });
    await emailCodeButton.click();
    await pageToAuth.locator('input[aria-label="Enter verification code"]').waitFor({
      state: 'visible',
      timeout: 30000,
    });
    await measureClerkVerificationControls(pageToAuth);
  };

  const signInWithClerk = async (pageToAuth, email, password) => {
    await pageToAuth.goto(`${BASE}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const identifier = pageToAuth.locator('input[name="identifier"]');
    await identifier.waitFor({ timeout: 30000 });
    await identifier.fill(email);
    await pageToAuth.keyboard.press('Enter');
    const passwordField = pageToAuth.locator('input[name="password"]');
    await passwordField.waitFor({ timeout: 30000 });
    await passwordField.fill(password);
    await pageToAuth.keyboard.press('Enter');
    const otp = pageToAuth.locator('input[aria-label="Enter verification code"]');
    if (await otp.waitFor({ timeout: 20000 }).then(() => true).catch(() => false)) {
      await otp.click();
      await pageToAuth.keyboard.type('424242', { delay: 120 });
    }
    const deadline = Date.now() + 60000;
    let authenticated = false;
    while (Date.now() < deadline && !authenticated) {
      authenticated = await pageToAuth.evaluate(async () => {
        const r = await fetch('/api/auth/user', { credentials: 'include' });
        return (await r.json().catch(() => null))?.isAuthenticated === true;
      });
      if (!authenticated) await pageToAuth.waitForTimeout(1500);
    }
    if (!authenticated) throw new Error('Clerk UI sign-in did not produce an authenticated session');
  };

  // -------------------------------------------------------------------------
  // Authed scenario (task #360): sweep the key signed-in routes as a
  // disposable Clerk user. Same six filters, same reporting; the expect
  // selectors double as signed-in render proof (each is authed-only UI).
  // -------------------------------------------------------------------------
  const PREFIX = '__qa_test_ds_sweep_';
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const email = `${PREFIX}${suffix}+clerk_test@example.com`;
  const password = `DsSweep-${suffix}!`;
  const NOTIF_TITLE = `QA sweep notification ${suffix}`;

  const purgeLocalQaUsers = async () => {
    const users = await pool.query('SELECT id FROM users WHERE email LIKE $1', [`${PREFIX}%`]);
    for (const { id } of users.rows) await pool.query('DELETE FROM sessions WHERE sess::text LIKE $1', [`%${id}%`]);
    // in_app_notifications + bookmarks cascade on the user row.
    await pool.query('DELETE FROM users WHERE email LIKE $1', [`${PREFIX}%`]);
  };

  let authedContext = null;
  try {
    await purgeClerkQaUsers(PREFIX);
    await purgeLocalQaUsers();
    await clerkApi('POST', '/users', { email_address: [email], password, skip_password_checks: true });

    authedContext = await browser.newContext({ viewport: DESKTOP });
    const authedPage = await authedContext.newPage();
    await openClerkVerificationCodeStep(authedPage, email);
    await signInWithClerk(authedPage, email, password);

    // JIT provisioning created the local row during the auth poll above.
    const userId = (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0]?.id;
    if (!userId) throw new Error('local user row missing after Clerk sign-in (JIT provisioning)');

    // Seed the minimal rows conditional UI needs: one notification (the kind
    // label + row chrome only render when a row exists) and one bookmark
    // (the /bookmarks library grid + controls only render with content).
    const catalog = await fetch(`${BASE}/api/resources?limit=1`).then(r => r.json());
    const resourceId = (catalog?.resources ?? catalog ?? [])[0]?.id;
    if (!resourceId) throw new Error('no approved catalog resource available to seed against');
    await pool.query(
      `INSERT INTO in_app_notifications (user_id, kind, title, description, href, resource_id, idempotency_key, expires_at)
       VALUES ($1, 'new_resource', $2, 'Seeded by the ds-button-sweep authed scenario.', $3, $4, $5, now() + interval '1 day')`,
      [userId, NOTIF_TITLE, `/resource/${resourceId}`, resourceId, `${PREFIX}${suffix}`],
    );
    const bookmarked = await authedContext.request.fetch(`${BASE}/api/bookmarks/${resourceId}`, {
      method: 'POST',
      headers: { Origin: BASE, 'Content-Type': 'application/json' },
      data: { notes: `ds-sweep seed ${suffix}` },
    });
    if (!bookmarked.ok()) throw new Error(`seed bookmark failed: ${bookmarked.status()} ${(await bookmarked.text()).slice(0, 200)}`);

    // Task #364: seed one collection holding the bookmark so the /bookmarks
    // collection chrome (sidebar rows + reorder arrows; management strip when
    // selected) actually renders. Rows cascade with the QA user in teardown.
    const COLLECTION_NAME = `QA sweep collection ${suffix}`;
    const createdCollection = await authedContext.request.fetch(`${BASE}/api/collections`, {
      method: 'POST',
      headers: { Origin: BASE, 'Content-Type': 'application/json' },
      data: { name: COLLECTION_NAME },
    });
    if (!createdCollection.ok()) throw new Error(`seed collection failed: ${createdCollection.status()} ${(await createdCollection.text()).slice(0, 200)}`);
    const collectionId = (await createdCollection.json())?.id;
    if (!collectionId) throw new Error('seed collection returned no id');
    const addedToCollection = await authedContext.request.fetch(`${BASE}/api/collections/${collectionId}/items/${resourceId}`, {
      method: 'POST',
      headers: { Origin: BASE, 'Content-Type': 'application/json' },
    });
    if (!addedToCollection.ok()) throw new Error(`seed collection item failed: ${addedToCollection.status()} ${(await addedToCollection.text()).slice(0, 200)}`);

    // Task #367: publish the seeded collection so the share controls
    // ("Copy link" / "Unpublish" + the public-link line) render on
    // /bookmarks?collection=<id> and get swept — they only exist while
    // publishedAt + publicUrl are set. The published state cascades with
    // the collection row (and the QA user) in teardown.
    const publishedCollection = await authedContext.request.fetch(`${BASE}/api/collections/${collectionId}/publish`, {
      method: 'POST',
      headers: { Origin: BASE, 'Content-Type': 'application/json' },
    });
    if (!publishedCollection.ok()) throw new Error(`seed collection publish failed: ${publishedCollection.status()} ${(await publishedCollection.text()).slice(0, 200)}`);
    // Task #372: the publish response carries shareId (+ publicUrl built from
    // SITE_URL, which may point at prod) — keep the shareId and build the
    // local path from it so the anonymous public-page sweep hits THIS server.
    const publishedBody = await publishedCollection.json().catch(() => null);
    const shareId = publishedBody?.shareId;
    if (!shareId) throw new Error(`publish response returned no shareId (got ${JSON.stringify(publishedBody).slice(0, 200)}) — cannot sweep the public shared-collection page`);

    const AUTHED_ROUTES = [
      // Fresh user with no saved preferences → the signed-in-only onboarding
      // invitation card proves this is the authed Home branch.
      { name: 'authed-home', path: '/', expect: '[data-testid="card-onboarding-invitation"]' },
      { name: 'authed-notifications', path: '/notifications', expect: `text=${NOTIF_TITLE}` },
      { name: 'authed-onboarding', path: '/onboarding', expect: '[data-testid="button-skip-onboarding"]' },
      // expectAll proves the collection sidebar row + its reorder arrows
      // rendered alongside the library grid (task #364) — a vacuous sweep
      // without the collection chrome cannot pass.
      {
        name: 'authed-bookmarks',
        path: '/bookmarks',
        expect: `[data-testid="bookmark-card-${resourceId}"]`,
        expectAll: [`[aria-label="Move ${COLLECTION_NAME} up"]`, `[aria-label="Move ${COLLECTION_NAME} down"]`],
      },
      // Selecting the collection renders the management button strip
      // (rename / archive / delete) above the grid; because the seed
      // collection is published (task #367), the strip must ALSO show the
      // share controls ("Copy link" / "Unpublish") and the public-link
      // line — expectAll makes a sweep without them fail, not pass vacuously.
      {
        name: 'authed-bookmarks-collection',
        path: `/bookmarks?collection=${collectionId}`,
        expect: 'section[aria-label="Selected collection controls"]',
        expectAll: [
          `[data-testid="bookmark-card-${resourceId}"]`,
          'button:has-text("Copy link")',
          'button:has-text("Unpublish")',
          'text=Public read-only link',
        ],
      },
      { name: 'authed-settings', path: '/settings', expect: '[data-testid="link-settings-account"]' },
    ];

    for (const route of AUTHED_ROUTES) {
      let sweeps;
      try {
        sweeps = await sweepRoute(authedPage, route);
      } catch (e) {
        try { sweeps = await sweepRoute(authedPage, route); }
        catch (e2) { log(`route-${route.name}`, false, `sweep failed twice: ${e2.message.split('\n')[0]}`); continue; }
      }
      for (const { kind } of SWEEPS) {
        const sweep = sweeps[kind];
        const sane = kind === 'buttons' ? (sweep.total > 0 && sweep.dsVariantCount > 0)
          : kind === 'h1s' ? sweep.total > 0
          : true;
        const pass = sane && sweep.strays.length === 0;
        if (pass) {
          const hooked = kind === 'buttons' ? `${sweep.dsVariantCount} DS-hooked of ${sweep.total}` : `${sweep.total} DS-hooked`;
          log(`route-${route.name}-${kind}`, true, `${route.path} (signed in) — 0 stray ${kind} (${hooked})`);
        } else if (!sane) {
          log(`route-${route.name}-${kind}`, false, `${route.path} (signed in) — vacuous render (total=${sweep.total}, dsVariant=${sweep.dsVariantCount})`);
        } else {
          await authedPage.screenshot({ path: path.join(OUT, `${route.name}-${kind}.png`), fullPage: true }).catch(() => {});
          strayReport(`route-${route.name}-${kind}`, `${route.path} (signed in)`, kind, sweep);
        }
      }
      // Detector canary on an authed route: a synthetic rogue button and a
      // hand-pinned mono-uppercase label injected on /notifications must be
      // flagged, or the signed-in half of the gate is passing blind.
      if (route.name === 'authed-notifications') {
        const caught = await authedPage.evaluate(({ collectButtons, collectEyebrows, id }) => {
          const rogue = document.createElement('button');
          rogue.type = 'button';
          rogue.setAttribute('data-testid', id);
          rogue.textContent = 'QA canary rogue';
          const label = document.createElement('span');
          label.style.cssText = "font-family:'JetBrains Mono',monospace;text-transform:uppercase;font-size:11px";
          label.textContent = 'qa canary rogue label';
          document.body.append(rogue, label);
          try {
            const buttonCaught = new Function(`return (${collectButtons})()`)().strays.some(s => s.testid === id);
            const eyebrowCaught = new Function(`return (${collectEyebrows})()`)().strays.some(s => s.text === 'qa canary rogue label');
            return { buttonCaught, eyebrowCaught };
          } finally { rogue.remove(); label.remove(); }
        }, { collectButtons: collectStrayButtons.toString(), collectEyebrows: collectStrayEyebrows.toString(), id: 'qa-canary-rogue-authed' });
        log('canary-authed-buttons', caught.buttonCaught, caught.buttonCaught
          ? 'synthetic rogue button on signed-in /notifications was flagged by the button filter'
          : 'DETECTOR BLIND: a synthetic rogue button on a signed-in route was NOT flagged');
        log('canary-authed-eyebrows', caught.eyebrowCaught, caught.eyebrowCaught
          ? 'synthetic mono-uppercase label on signed-in /notifications was flagged by the eyebrow filter'
          : 'DETECTOR BLIND: a synthetic mono-uppercase label on a signed-in route was NOT flagged');
      }
    }

    // -----------------------------------------------------------------------
    // Authed interaction scenarios (task #364): the bulk-selection action bar
    // only renders once a bookmark is selected, and the "New collection"
    // dialog only exists while open. Same pattern as the anonymous OVERLAYS
    // list: condition-based activation proof, scope button count > 0, and a
    // rogue-button canary inside the scope so the scenario can never pass
    // blind behind a blanket exclusion.
    // -----------------------------------------------------------------------
    const AUTHED_OVERLAYS = [
      {
        // Select-all checkbox → the bulk action bar (status/move/tag/archive
        // controls) renders inside the "Bulk bookmark actions" section.
        name: 'authed-bulk-bar',
        path: '/bookmarks',
        expect: `[data-testid="bookmark-card-${resourceId}"]`,
        open: async (p) => { await p.click('[role="checkbox"][aria-label="Select all visible bookmarks"]'); },
        openedSelector: '[aria-label="Bulk queue status"]',
        scope: 'section[aria-label="Bulk bookmark actions"]',
      },
      {
        // Header "New collection" button → the create/rename collection
        // Radix Dialog (name input + cancel/submit).
        name: 'authed-new-collection-dialog',
        path: '/bookmarks',
        expect: `[data-testid="bookmark-card-${resourceId}"]`,
        open: async (p) => { await p.click('button:has-text("New collection")'); },
        openedSelector: '[role="dialog"][data-state="open"] #collection-name',
        scope: '[role="dialog"][data-state="open"]',
      },
      {
        // Task #367: bookmark card "Note" button → the shared
        // BookmarkNotesDialog (textarea + cancel/save footer).
        name: 'authed-note-dialog',
        path: '/bookmarks',
        expect: `[data-testid="bookmark-card-${resourceId}"]`,
        open: async (p) => { await p.click(`[data-testid="bookmark-card-${resourceId}"] button:has-text("Note")`); },
        openedSelector: '[role="dialog"][data-state="open"] [data-testid="textarea-bookmark-notes"]',
        scope: '[role="dialog"][data-state="open"]',
      },
      {
        // Task #367: management strip "Delete" → the delete-collection
        // AlertDialog (cancel + destructive confirm). Sweep only — the
        // confirm button is NEVER clicked, so the seeded collection
        // survives for teardown to cascade.
        name: 'authed-delete-collection-confirm',
        path: `/bookmarks?collection=${collectionId}`,
        expect: 'section[aria-label="Selected collection controls"]',
        open: async (p) => { await p.click('section[aria-label="Selected collection controls"] button:has-text("Delete")'); },
        openedSelector: '[role="alertdialog"][data-state="open"] button[data-ds-variant]',
        scope: '[role="alertdialog"][data-state="open"]',
      },
    ];

    const sweepAuthedOverlay = async (o) => {
      await gotoAndSettle(authedPage, o);
      await o.open(authedPage);
      await authedPage.waitForSelector(o.openedSelector, { timeout: 15000 });
      await authedPage.waitForTimeout(400); // settle conditional chrome
      const scopeButtons = await authedPage.evaluate(
        (scope) => document.querySelectorAll(`${scope} button`).length, o.scope);
      const sweeps = await confirmedSweeps(authedPage);
      const CANARY_ID = 'qa-canary-rogue-authed-overlay';
      await authedPage.evaluate(({ scope, id }) => {
        const host = document.querySelector(scope);
        if (!host) return;
        const rogue = document.createElement('button');
        rogue.type = 'button';
        rogue.setAttribute('data-testid', id);
        rogue.textContent = 'QA canary rogue';
        host.appendChild(rogue);
      }, { scope: o.scope, id: CANARY_ID });
      const canarySweep = await authedPage.evaluate(collectStrayButtons);
      await authedPage.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.remove(), CANARY_ID);
      const canaryCaught = canarySweep.strays.some((s) => s.testid === CANARY_ID);
      return { sweeps, scopeButtons, canaryCaught };
    };

    for (const o of AUTHED_OVERLAYS) {
      let sweeps, scopeButtons, canaryCaught;
      try {
        ({ sweeps, scopeButtons, canaryCaught } = await sweepAuthedOverlay(o));
      } catch (e) {
        try { ({ sweeps, scopeButtons, canaryCaught } = await sweepAuthedOverlay(o)); }
        catch (e2) { log(`overlay-${o.name}`, false, `authed overlay sweep failed twice (trigger/chrome missing?): ${e2.message.split('\n')[0]}`); continue; }
      }
      const sane = sweeps.buttons.total > 0 && sweeps.buttons.dsVariantCount > 0 && scopeButtons > 0;
      if (!sane) {
        log(`overlay-${o.name}`, false, `${o.path} (signed in) — vacuous sweep (total=${sweeps.buttons.total}, dsVariant=${sweeps.buttons.dsVariantCount}, scopeButtons=${scopeButtons})`);
        continue;
      }
      if (!canaryCaught) {
        log(`overlay-${o.name}`, false, `${o.path} (signed in) — DETECTOR BLIND: a synthetic rogue button injected inside ${o.scope} was NOT flagged by the stage-6 filter; an exclusion is blanket-covering this chrome`);
        continue;
      }
      for (const { kind } of SWEEPS) {
        const sweep = sweeps[kind];
        if (sweep.strays.length === 0) {
          const extra = kind === 'buttons' ? `chrome active (${scopeButtons} button(s) in scope), canary rogue detected, ` : '';
          log(`overlay-${o.name}-${kind}`, true, `${o.path} (signed in) — ${extra}0 stray ${kind} of ${sweep.total} total`);
        } else {
          await authedPage.screenshot({ path: path.join(OUT, `overlay-${o.name}-${kind}.png`), fullPage: true }).catch(() => {});
          strayReport(`overlay-${o.name}-${kind}`, `${o.path} (signed in)`, kind, sweep);
        }
      }
    }

    // -----------------------------------------------------------------------
    // Task #372: sweep the page the shared link actually leads to — the
    // anonymous public shared-collection view at /collection/:shareId — the
    // way a visitor sees it: a FRESH non-authed context (no cookies, no
    // session). Must run HERE, while the seeded collection is still
    // published; teardown below cascades the published state away.
    // -----------------------------------------------------------------------
    const publicRoute = {
      name: 'public-collection',
      path: `/collection/${encodeURIComponent(shareId)}`,
      // Activation proof: the seeded bookmark's rendered ResourceCard AND the
      // collection title in the <h1> — the not-found / empty branches render
      // neither, so this sweep can never pass vacuously.
      expect: `[data-testid="card-resource-${resourceId}"]`,
      expectAll: [`h1:has-text("${COLLECTION_NAME}")`],
    };
    const publicContext = await browser.newContext({ viewport: DESKTOP });
    try {
      const publicPage = await publicContext.newPage();
      let sweeps;
      try {
        sweeps = await sweepRoute(publicPage, publicRoute);
      } catch (e) {
        try { sweeps = await sweepRoute(publicPage, publicRoute); }
        catch (e2) { throw new Error(`public shared-collection sweep failed twice: ${e2.message.split('\n')[0]}`); }
      }
      // Prove the context really is anonymous — if this context somehow had a
      // session, the sweep would not represent what visitors see.
      const authState = await publicPage.evaluate(async () => {
        const r = await fetch('/api/auth/user', { credentials: 'include' });
        return (await r.json().catch(() => null))?.isAuthenticated === true;
      });
      log('route-public-collection-anonymous', !authState, authState
        ? `${publicRoute.path} — context is UNEXPECTEDLY authenticated; this sweep does not represent the anonymous visitor view`
        : `${publicRoute.path} — swept in a fresh non-authed context (/api/auth/user reports anonymous)`);
      for (const { kind } of SWEEPS) {
        const sweep = sweeps[kind];
        const sane = kind === 'buttons' ? (sweep.total > 0 && sweep.dsVariantCount > 0)
          : kind === 'h1s' ? sweep.total > 0
          : true;
        const pass = sane && sweep.strays.length === 0;
        if (pass) {
          const hooked = kind === 'buttons' ? `${sweep.dsVariantCount} DS-hooked of ${sweep.total}` : `${sweep.total} DS-hooked`;
          log(`route-public-collection-${kind}`, true, `${publicRoute.path} (anonymous public) — 0 stray ${kind} (${hooked})`);
        } else if (!sane) {
          log(`route-public-collection-${kind}`, false, `${publicRoute.path} (anonymous public) — vacuous render (total=${sweep.total}, dsVariant=${sweep.dsVariantCount})`);
        } else {
          await publicPage.screenshot({ path: path.join(OUT, `public-collection-${kind}.png`), fullPage: true }).catch(() => {});
          strayReport(`route-public-collection-${kind}`, `${publicRoute.path} (anonymous public)`, kind, sweep);
        }
      }
    } finally {
      await publicContext.close().catch(() => {});
    }
  } catch (e) {
    log('authed-scenario', false, `authed sweep failed: ${e.message.split('\n')[0]}`);
  } finally {
    await authedContext?.close().catch(() => {});
    try {
      await purgeClerkQaUsers(PREFIX).catch((e) => log('authed-teardown-clerk', false, e.message));
      await purgeLocalQaUsers();
      const residue = await pool.query('SELECT count(*)::int AS count FROM users WHERE email LIKE $1', [`${PREFIX}%`]);
      log('authed-teardown', residue.rows[0].count === 0, `remaining ${PREFIX}* users=${residue.rows[0].count}`);
    } catch (e) {
      log('authed-teardown', false, e instanceof Error ? e.message : String(e));
    }
  }

  // -------------------------------------------------------------------------
  // Admin scenario (task #363): sweep every admin dashboard tab as a
  // role-elevated disposable Clerk user. Sign-in reuses the same UI flow;
  // the JIT-provisioned local row is then elevated to role='admin' directly
  // in the DB (role is local app state, read fresh per request), and a fresh
  // /admin load picks it up. One pending resource is seeded so the approvals
  // queue renders row chrome (approve/reject buttons, status badges).
  // -------------------------------------------------------------------------
  const ADMIN_PREFIX = '__qa_test_ds_admin_';
  const adminSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  // Reuse ONE persistent QA admin across runs instead of creating/deleting a
  // fresh Clerk user every time. It is deliberately outside __qa_test_ so a
  // concurrent interactive net-zero sweep cannot invalidate its Clerk
  // session. Seeded rows remain scoped under ADMIN_PREFIX and are net-zero.
  const adminEmail = 'ds-button-sweep-admin+clerk_test@example.com';
  const adminPassword = `DsAdmin-${adminSuffix}!`;

  // Scoped teardown for the admin prefix. An admin-role user can acquire FK
  // refs a plain user never gets (see .agents/memory/qa-throwaway-user-teardown.md
  // for the derivation): resource_edits.submitted_by RESTRICTs, several
  // *_by columns lack ON DELETE, and resource_audit_log is SET NULL (delete
  // explicitly for true net-zero). The sweep itself is read-only, but the
  // teardown must also clear residue from aborted runs that may have clicked.
  const purgeLocalAdminQa = async () => {
    const rows = (await pool.query('SELECT id, email FROM users WHERE email LIKE $1', [`${ADMIN_PREFIX}%`])).rows;
    // Every ADMIN_PREFIX user is residue from the old disposable-user scheme
    // or an aborted run. The reusable admin has a separate stable identity.
    const removable = rows.map(r => r.id);
    if (removable.length > 0) {
      await pool.query('DELETE FROM resource_edits WHERE submitted_by = ANY($1)', [removable]);
      await pool.query('UPDATE resource_edits SET handled_by = NULL WHERE handled_by = ANY($1)', [removable]);
      await pool.query('UPDATE resources SET approved_by = NULL WHERE approved_by = ANY($1)', [removable]);
      await pool.query('UPDATE github_sync_history SET performed_by = NULL WHERE performed_by = ANY($1)', [removable]);
      await pool.query('UPDATE enrichment_jobs SET started_by = NULL WHERE started_by = ANY($1)', [removable]);
      await pool.query('UPDATE research_jobs SET started_by = NULL WHERE started_by = ANY($1)', [removable]);
      await pool.query('DELETE FROM resource_audit_log WHERE performed_by = ANY($1)', [removable]);
    }
    // Clear stale sessions belonging to disposable prefix users.
    for (const { id } of rows) await pool.query('DELETE FROM sessions WHERE sess::text LIKE $1', [`%${id}%`]);
    // Seeded pending resource (+ residue where the user row is already gone —
    // resources.submitted_by cascades, so aborted-run rows can outlive users
    // only via this URL-scoped sweep).
    await pool.query('DELETE FROM resources WHERE url LIKE $1', [`%${ADMIN_PREFIX}%`]);
    // Seeded empty QA category for the delete-confirmation overlay (task
    // #368) — cancelled in-scenario, so the row survives until this sweep.
    await pool.query('DELETE FROM categories WHERE name LIKE $1', [`${ADMIN_PREFIX}%`]);
    await pool.query('DELETE FROM users WHERE email LIKE $1', [`${ADMIN_PREFIX}%`]);
  };

  let adminContext = null;
  try {
    await purgeClerkQaUsers(ADMIN_PREFIX);
    await purgeLocalAdminQa();
    // Find-or-create the persistent QA admin, rotating its password to this
    // run's random value either way (so no credential is ever stored). If its
    // Clerk record was removed but the local bridge row survived, restore the
    // same external_id; otherwise ensureDbUser correctly fails closed on the
    // email collision and the harness can never authenticate.
    const localAdmin = (await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [adminEmail])).rows[0];
    const existingAdmin = (await listClerkUsers()).find(
      (user) => (user.email_addresses ?? []).some((address) => address.email_address === adminEmail),
    );
    if (existingAdmin) {
      await clerkApi('PATCH', `/users/${existingAdmin.id}`, {
        password: adminPassword,
        skip_password_checks: true,
        ...(localAdmin ? { external_id: localAdmin.id } : {}),
      });
      console.log(`admin scenario: reusing persistent QA admin (Clerk ${existingAdmin.id}), password rotated`);
    } else {
      await clerkApi('POST', '/users', {
        email_address: [adminEmail],
        password: adminPassword,
        skip_password_checks: true,
        ...(localAdmin ? { external_id: localAdmin.id } : {}),
      });
      console.log(localAdmin
        ? 'admin scenario: restored missing Clerk identity against the existing local admin bridge'
        : 'admin scenario: persistent QA admin not found — created it (reused on future runs)');
    }

    let adminPage = null;
    const openFreshAdminSession = async () => {
      await adminContext?.close().catch(() => {});
      let lastError;
      for (let attempt = 1; attempt <= 2; attempt++) {
        adminContext = await browser.newContext({ viewport: DESKTOP });
        adminPage = await adminContext.newPage();
        try {
          await signInWithClerk(adminPage, adminEmail, adminPassword);
          return;
        } catch (error) {
          lastError = error;
          await adminContext.close().catch(() => {});
          adminContext = null;
          adminPage = null;
        }
      }
      throw lastError;
    };
    await openFreshAdminSession();

    // JIT provisioning created the local row (role='user'); elevate it.
    const adminUserId = (await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail])).rows[0]?.id;
    if (!adminUserId) throw new Error('local user row missing after Clerk sign-in (JIT provisioning)');
    await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [adminUserId]);

    // Seed one pending resource so the approvals queue renders row chrome.
    const seedCategory = (await pool.query(
      `SELECT category FROM resources WHERE status = 'approved' AND category IS NOT NULL LIMIT 1`,
    )).rows[0]?.category;
    if (!seedCategory) throw new Error('no approved resource to borrow a category from for the pending seed');
    const pendingId = (await pool.query(
      `INSERT INTO resources (title, url, description, category, status, submitted_by)
       VALUES ($1, $2, 'Seeded by the ds-button-sweep admin scenario.', $3, 'pending', $4)
       RETURNING id`,
      [`${ADMIN_PREFIX}${adminSuffix} pending resource`, `https://example.com/${ADMIN_PREFIX}${adminSuffix}`, seedCategory, adminUserId],
    )).rows[0].id;

    // Task #368: seed one EMPTY category so the taxonomy delete-confirmation
    // dialog can actually open — GenericCrudManager disables the per-row
    // delete trigger whenever resourceCount > 0, and every real category has
    // resources. The scenario only ever opens the confirm and clicks Cancel;
    // the row itself is deleted in the finally teardown (name-prefixed).
    const qaCategoryName = `${ADMIN_PREFIX}${adminSuffix} category`;
    const qaCategoryId = (await pool.query(
      `INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id`,
      [qaCategoryName, `qa-ds-admin-${adminSuffix.replace(/_/g, '-')}`],
    )).rows[0].id;

    // Every admin tab, with a panel-specific selector proving the section's
    // real content mounted (Radix Tabs unmount inactive panels, so each tab
    // is a distinct DOM). Selectors chosen to render without extra data —
    // except approvals, which waits for the seeded pending row.
    const ADMIN_TABS = [
      { slug: 'approvals', expect: `[data-testid="row-pending-resource-${pendingId}"]` },
      { slug: 'edits', expect: '[data-testid="button-refresh-pending-edits"]' },
      { slug: 'enrichment', expect: '[data-testid="button-start-enrichment"]' },
      { slug: 'researcher', expect: '[data-testid="button-generate-brief"]' },
      { slug: 'export', expect: 'button:has-text("Export Markdown")' },
      { slug: 'database', expect: '[data-testid="button-seed-database"]' },
      { slug: 'resources', expect: '[data-testid="button-add-resource"]' },
      { slug: 'categories', expect: '[data-testid="content-categories"][data-state="active"] button[data-ds-variant]' },
      { slug: 'subcategories', expect: '[data-testid="content-subcategories"][data-state="active"] button[data-ds-variant]' },
      { slug: 'subsubcategories', expect: '[data-testid="content-subsubcategories"][data-state="active"] button[data-ds-variant]' },
      { slug: 'journeys', expect: '[data-testid="journey-steps-manager"]' },
      { slug: 'users', expect: '[data-testid="input-user-search"]' },
      { slug: 'github', expect: '[data-testid="button-export-github"]' },
      { slug: 'linkhealth', expect: 'text=Link Health Summary' },
      { slug: 'digests', expect: '[data-testid="card-digest-queue-health"]' },
      { slug: 'audit', expect: '[data-testid="input-audit-resource-id"]' },
    ];

    const gotoAdmin = async () => {
      await adminPage.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      // AdminGuard verifies role, then the dashboard shows a stats spinner
      // before the tab strip mounts — wait for the strip, not just the shell.
      await adminPage.waitForSelector('[data-testid="tab-approvals"]', { timeout: 30000 });
      await adminPage.waitForFunction(() => document.querySelectorAll('button[data-ds-variant]').length > 0, null, { timeout: 30000 });
      await adminPage.waitForTimeout(600);
    };
    await gotoAdmin();

    const sweepAdminTab = async (tab) => {
      await adminPage.click(`[data-testid="tab-${tab.slug}"]`);
      // Harness-verified activation: the trigger must actually select AND the
      // panel's own content selector must appear, or the scenario is vacuous.
      await adminPage.waitForSelector(`[data-testid="tab-${tab.slug}"][aria-selected="true"]`, { timeout: 15000 });
      await adminPage.waitForSelector(tab.expect, { timeout: 30000 });
      await adminPage.waitForTimeout(600); // settle async panel content
      return confirmedSweeps(adminPage);
    };

    for (const tab of ADMIN_TABS) {
      let sweeps;
      try {
        sweeps = await sweepAdminTab(tab);
      } catch (e) {
        // Reload /admin once and retry — cold panels can flake under load.
        try { await gotoAdmin(); sweeps = await sweepAdminTab(tab); }
        catch (e2) { log(`admin-${tab.slug}`, false, `admin tab sweep failed twice: ${e2.message.split('\n')[0]}`); continue; }
      }
      for (const { kind } of SWEEPS) {
        const sweep = sweeps[kind];
        const sane = kind === 'buttons' ? (sweep.total > 0 && sweep.dsVariantCount > 0)
          : kind === 'h1s' ? sweep.total > 0
          : true;
        const pass = sane && sweep.strays.length === 0;
        if (pass) {
          const hooked = kind === 'buttons' ? `${sweep.dsVariantCount} DS-hooked of ${sweep.total}` : `${sweep.total} DS-hooked`;
          log(`admin-${tab.slug}-${kind}`, true, `/admin#${tab.slug} (admin) — 0 stray ${kind} (${hooked})`);
        } else if (!sane) {
          log(`admin-${tab.slug}-${kind}`, false, `/admin#${tab.slug} (admin) — vacuous render (total=${sweep.total}, dsVariant=${sweep.dsVariantCount})`);
        } else {
          await adminPage.screenshot({ path: path.join(OUT, `admin-${tab.slug}-${kind}.png`), fullPage: true }).catch(() => {});
          strayReport(`admin-${tab.slug}-${kind}`, `/admin#${tab.slug} (admin)`, kind, sweep);
        }
      }
      // Detector canary on an admin route: a synthetic rogue button and a
      // hand-pinned mono-uppercase label injected on the approvals tab must
      // be flagged, or the admin half of the gate is passing blind.
      if (tab.slug === 'approvals') {
        const caught = await adminPage.evaluate(({ collectButtons, collectEyebrows, id }) => {
          const rogue = document.createElement('button');
          rogue.type = 'button';
          rogue.setAttribute('data-testid', id);
          rogue.textContent = 'QA canary rogue';
          const label = document.createElement('span');
          label.style.cssText = "font-family:'JetBrains Mono',monospace;text-transform:uppercase;font-size:11px";
          label.textContent = 'qa canary rogue label';
          document.body.append(rogue, label);
          try {
            const buttonCaught = new Function(`return (${collectButtons})()`)().strays.some(s => s.testid === id);
            const eyebrowCaught = new Function(`return (${collectEyebrows})()`)().strays.some(s => s.text === 'qa canary rogue label');
            return { buttonCaught, eyebrowCaught };
          } finally { rogue.remove(); label.remove(); }
        }, { collectButtons: collectStrayButtons.toString(), collectEyebrows: collectStrayEyebrows.toString(), id: 'qa-canary-rogue-admin' });
        log('canary-admin-buttons', caught.buttonCaught, caught.buttonCaught
          ? 'synthetic rogue button on the admin approvals tab was flagged by the button filter'
          : 'DETECTOR BLIND: a synthetic rogue button on an admin route was NOT flagged');
        log('canary-admin-eyebrows', caught.eyebrowCaught, caught.eyebrowCaught
          ? 'synthetic mono-uppercase label on the admin approvals tab was flagged by the eyebrow filter'
          : 'DETECTOR BLIND: a synthetic mono-uppercase label on an admin route was NOT flagged');
      }
    }

    // -----------------------------------------------------------------------
    // Admin overlay scenarios (task #368): the tab sweep above only sees each
    // panel's static DOM — dialogs render nothing while closed. Open the key
    // admin pop-ups and run the SAME six filters with each one open. Every
    // scenario starts from a fresh /admin load (same rationale as the
    // anonymous OVERLAYS list: no close choreography → Radix's pointer-events
    // lock through close animations can never eat the next trigger click);
    // where a scenario dismisses in-flow (the delete confirm, the step
    // editor), it condition-waits on the dialog detaching, never a sleep.
    // Nothing is ever confirmed/submitted — dialogs are opened, swept,
    // canaried, and cancelled.
    // -----------------------------------------------------------------------
    const ADMIN_OVERLAYS = [
      {
        // Resources tab → "Add Resource" → the create-resource Radix Dialog
        // (title/url/description inputs + category/status Select triggers).
        name: 'admin-add-resource-dialog',
        tab: 'resources',
        tabExpect: '[data-testid="button-add-resource"]',
        open: async (p) => { await p.click('[data-testid="button-add-resource"]'); },
        openedSelector: '[role="dialog"][data-state="open"] [data-testid="input-create-title"]',
        scope: '[role="dialog"][data-state="open"]',
      },
      {
        // Resources tab → any row's edit pencil → the edit-resource Dialog
        // (same field set pre-filled + "Save Changes"). locator.click()
        // auto-waits for the row chrome to finish loading.
        name: 'admin-edit-resource-dialog',
        tab: 'resources',
        tabExpect: '[data-testid="button-add-resource"]',
        open: async (p) => { await p.locator('[data-testid^="button-edit-"]').first().click(); },
        openedSelector: '[role="dialog"][data-state="open"] [data-testid="input-edit-title"]',
        scope: '[role="dialog"][data-state="open"]',
      },
      {
        // Approvals tab → the seeded pending row's "View" → the read-only
        // Resource Details dialog. Approve/reject live OUTSIDE this dialog,
        // so opening it can never mutate the queue.
        name: 'admin-pending-detail-dialog',
        tab: 'approvals',
        tabExpect: `[data-testid="row-pending-resource-${pendingId}"]`,
        open: async (p) => { await p.click(`[data-testid="button-view-details-${pendingId}"]`); },
        openedSelector: '[role="dialog"][data-state="open"] [data-testid="button-close-details"]',
        scope: '[role="dialog"][data-state="open"]',
      },
      {
        // Categories tab → search for the seeded empty QA category (the list
        // paginates at 10/page, so the row may not be on page 1) → its delete
        // trigger (enabled only because resourceCount is 0) → the AlertDialog
        // confirm. Dismissed via Cancel + detach wait — NEVER confirmed.
        name: 'admin-category-delete-confirm',
        tab: 'categories',
        tabExpect: '[data-testid="input-search-categories"]',
        open: async (p) => {
          await p.fill('[data-testid="input-search-categories"]', qaCategoryName);
          await p.waitForSelector(`[data-testid="row-category-${qaCategoryId}"]`, { timeout: 15000 });
          await p.click(`[data-testid="button-delete-${qaCategoryId}"]`);
        },
        openedSelector: '[data-testid="dialog-delete-category"] [data-testid="button-cancel-delete"]',
        scope: '[data-testid="dialog-delete-category"]',
        dismiss: async (p) => {
          await p.click('[data-testid="button-cancel-delete"]');
          await p.waitForSelector('[data-testid="dialog-delete-category"]', { state: 'detached', timeout: 15000 });
        },
      },
      {
        // Journeys tab → first journey's "Steps" → the steps dialog → "Add
        // step" → the step editor (title/description inputs, optional
        // checkbox, resource picker toggle). Both nested dialogs are open
        // during the sweep, so the steps dialog's own chrome is swept too.
        // Cancelled without submitting; scope is the inner editor.
        name: 'admin-journey-step-editor',
        tab: 'journeys',
        tabExpect: '[data-testid="journey-steps-manager"]',
        open: async (p) => {
          await p.locator('[data-testid^="edit-steps-"]').first().click();
          await p.waitForSelector('[data-testid="steps-dialog"] [data-testid="add-step-button"]', { timeout: 15000 });
          await p.click('[data-testid="add-step-button"]');
        },
        openedSelector: '[data-testid="step-editor-dialog"] [data-testid="step-editor-submit"]',
        scope: '[data-testid="step-editor-dialog"]',
        dismiss: async (p) => {
          await p.click('[data-testid="step-editor-dialog"] button:has-text("Cancel")');
          await p.waitForSelector('[data-testid="step-editor-dialog"]', { state: 'detached', timeout: 15000 });
        },
      },
    ];

    // The static 16-tab sweep is long enough for Clerk's dev-browser session
    // to age out under load. Start overlays in a fresh browser context rather
    // than trying to repair stale Clerk cookies in place.
    await openFreshAdminSession();

    const sweepAdminOverlay = async (o) => {
      await gotoAdmin();
      await adminPage.click(`[data-testid="tab-${o.tab}"]`);
      await adminPage.waitForSelector(`[data-testid="tab-${o.tab}"][aria-selected="true"]`, { timeout: 15000 });
      await adminPage.waitForSelector(o.tabExpect, { timeout: 30000 });
      await adminPage.waitForTimeout(400); // settle async panel content
      await o.open(adminPage);
      await adminPage.waitForSelector(o.openedSelector, { timeout: 15000 });
      await adminPage.waitForTimeout(400); // settle async overlay content
      const scopeButtons = await adminPage.evaluate(
        (scope) => document.querySelectorAll(`${scope} button`).length, o.scope);
      const sweeps = await confirmedSweeps(adminPage);
      // Detector canary inside the open overlay: same discipline as every
      // other overlay scenario — a blanket exclusion covering this dialog's
      // interior must fail the gate, not silently pass it.
      const CANARY_ID = 'qa-canary-rogue-admin-overlay';
      await adminPage.evaluate(({ scope, id }) => {
        const host = document.querySelector(scope);
        if (!host) return;
        const rogue = document.createElement('button');
        rogue.type = 'button';
        rogue.setAttribute('data-testid', id);
        rogue.textContent = 'QA canary rogue';
        host.appendChild(rogue);
      }, { scope: o.scope, id: CANARY_ID });
      const canarySweep = await adminPage.evaluate(collectStrayButtons);
      await adminPage.evaluate((id) => document.querySelector(`[data-testid="${id}"]`)?.remove(), CANARY_ID);
      const canaryCaught = canarySweep.strays.some((s) => s.testid === CANARY_ID);
      if (o.dismiss) await o.dismiss(adminPage);
      return { sweeps, scopeButtons, canaryCaught };
    };

    for (const o of ADMIN_OVERLAYS) {
      let sweeps, scopeButtons, canaryCaught;
      try {
        ({ sweeps, scopeButtons, canaryCaught } = await sweepAdminOverlay(o));
      } catch (e) {
        // Retry once from a fresh /admin load — cold panels flake under load.
        try { ({ sweeps, scopeButtons, canaryCaught } = await sweepAdminOverlay(o)); }
        catch (e2) { log(`overlay-${o.name}`, false, `admin overlay sweep failed twice (trigger/dialog missing?): ${e2.message.split('\n')[0]}`); continue; }
      }
      const sane = sweeps.buttons.total > 0 && sweeps.buttons.dsVariantCount > 0 && scopeButtons > 0;
      if (!sane) {
        log(`overlay-${o.name}`, false, `/admin#${o.tab} (admin) — vacuous overlay sweep (total=${sweeps.buttons.total}, dsVariant=${sweeps.buttons.dsVariantCount}, scopeButtons=${scopeButtons})`);
        continue;
      }
      if (!canaryCaught) {
        log(`overlay-${o.name}`, false, `/admin#${o.tab} (admin) — DETECTOR BLIND: a synthetic rogue button injected inside ${o.scope} was NOT flagged by the stage-6 filter; an exclusion is blanket-covering this overlay's interior`);
        continue;
      }
      for (const { kind } of SWEEPS) {
        const sweep = sweeps[kind];
        if (sweep.strays.length === 0) {
          const extra = kind === 'buttons' ? `overlay open (${scopeButtons} button(s) inside), canary rogue detected, ` : '';
          log(`overlay-${o.name}-${kind}`, true, `/admin#${o.tab} (admin) — ${extra}0 stray ${kind} of ${sweep.total} total`);
        } else {
          await adminPage.screenshot({ path: path.join(OUT, `overlay-${o.name}-${kind}.png`), fullPage: true }).catch(() => {});
          strayReport(`overlay-${o.name}-${kind}`, `/admin#${o.tab} (admin, ${o.name} open)`, kind, sweep);
        }
      }
    }
  } catch (e) {
    log('admin-scenario', false, `admin sweep failed: ${e.message.split('\n')[0]}`);
  } finally {
    await adminContext?.close().catch(() => {});
    try {
      await purgeClerkQaUsers(ADMIN_PREFIX).catch((e) => log('admin-teardown-clerk', false, e.message));
      await purgeLocalAdminQa();
      const residue = await pool.query(
        'SELECT (SELECT count(*) FROM users WHERE email LIKE $1)::int AS users, (SELECT count(*) FROM resources WHERE url LIKE $2)::int AS resources, (SELECT count(*) FROM categories WHERE name LIKE $1)::int AS categories',
        [`${ADMIN_PREFIX}%`, `%${ADMIN_PREFIX}%`],
      );
      log('admin-teardown', residue.rows[0].users === 0 && residue.rows[0].resources === 0 && residue.rows[0].categories === 0,
        `remaining ${ADMIN_PREFIX}* users=${residue.rows[0].users}, seeded resources=${residue.rows[0].resources}, seeded categories=${residue.rows[0].categories} (reusable QA admin retained separately)`);
    } catch (e) {
      log('admin-teardown', false, e instanceof Error ? e.message : String(e));
    }
    await pool.end().catch(() => {});
  }
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.pass);
console.log(failed.length === 0 ? `\nALL ${results.length} CHECKS PASSED` : `\n${failed.length}/${results.length} CHECKS FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
