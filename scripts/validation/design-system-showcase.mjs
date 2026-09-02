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
//    declared primary face at every meaningful weight the showcase paints.
//    This uses rendered widths, not document.fonts.check: the same sample must
//    measure identically with the declared stack and the primary family alone,
//    but differently with the stack's generic fallback.
// 5. The active system's Google Fonts loader requests every inventoried weight;
//    a temporary URL mutation proves a missing weight names its system, token,
//    and weight instead of passing because the family itself is present.
// 6. Every non-system font override selected in the picker paints its intended
//    body family at every meaningful body weight. Its own loader is scoped
//    separately from the always-on/system loaders, and a temporary URL mutation
//    proves a missing weight names the option id and weight.
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
  const paintFonts = async (
    targetPage = page,
    selectionId,
    retry = true,
    tokenNames = null,
    loaderScope = 'all',
  ) => {
    const deadline = Date.now() + (retry ? 15000 : 1);
    let last = [];
    while (Date.now() < deadline) {
      last = await targetPage.evaluate(async ({ activeSelectionId, requestedTokenNames, requestedLoaderScope }) => {
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
          { token: '--font-display', surface: 'display' },
          { token: '--font-body', surface: 'body' },
          { token: '--font-mono', surface: 'mono' },
        ];
        const tokensToCheck = requestedTokenNames
          ? FONT_TOKENS.filter(({ token }) => requestedTokenNames.includes(token))
          : FONT_TOKENS;
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
        const normalizeFamily = (family) =>
          String(family).replace(/["']/g, '').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim().toLowerCase();
        const decodeFontPart = (raw) => {
          const value = String(raw).replaceAll('+', ' ');
          try {
            return decodeURIComponent(value);
          } catch {
            return value;
          }
        };
        const loaderEntries = new Map();
        const addLoaderEntry = (family, ranges) => {
          const key = normalizeFamily(family);
          const previous = loaderEntries.get(key) || [];
          loaderEntries.set(key, [...previous, ...ranges]);
        };
        const parseLoaderHref = (href) => {
          let url;
          try {
            url = new URL(href, location.href);
          } catch {
            return;
          }
          for (const parameter of url.searchParams.getAll('family')) {
            const decoded = decodeFontPart(parameter);
            const separator = decoded.indexOf(':');
            const family = (separator < 0 ? decoded : decoded.slice(0, separator)).trim();
            if (!family) continue;
            const axisSpec = separator < 0 ? '' : decoded.slice(separator + 1);
            const at = axisSpec.indexOf('@');
            const axes = at < 0 ? [] : axisSpec.slice(0, at).split(',').map((axis) => axis.trim());
            const weightAxis = axes.indexOf('wght');
            const values = at < 0 ? [] : axisSpec.slice(at + 1).split(';');
            const ranges = [];
            if (weightAxis < 0 || !values.length) {
              ranges.push({ min: 400, max: 400 });
            } else {
              for (const value of values) {
                const part = value.split(',')[weightAxis]?.trim() || '';
                const range = /^(\d+(?:\.\d+)?)\.\.(\d+(?:\.\d+)?)$/.exec(part);
                const single = /^(\d+(?:\.\d+)?)$/.exec(part);
                if (range) ranges.push({ min: Number(range[1]), max: Number(range[2]) });
                else if (single) ranges.push({ min: Number(single[1]), max: Number(single[1]) });
              }
            }
            addLoaderEntry(family, ranges.length ? ranges : [{ min: 400, max: 400 }]);
          }
        };
        const loaderHrefs = [...document.querySelectorAll('link[rel="stylesheet"]')]
          .filter((link) => requestedLoaderScope !== 'font-override' || link.dataset.fontOption === activeSelectionId)
          .map((link) => link.href || link.getAttribute('href') || '')
          .filter(Boolean);
        for (const href of loaderHrefs) parseLoaderHref(href);
        const covers = (family, weight) =>
          (loaderEntries.get(normalizeFamily(family)) || []).some(({ min, max }) => weight >= min && weight <= max);
        const meaningfulElements = [...document.querySelectorAll('body, body *')].filter((element) => {
          const style = getComputedStyle(element);
          return (
            element.textContent.trim() &&
            element.getClientRects().length > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
          );
        });

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
            for (const { token, surface } of tokensToCheck) {
            const stack = rootStyle.getPropertyValue(token).trim();
            const families = splitStack(stack);
            const primary = families[0] ? unquote(families[0]) : '';
            const primaryKey = primary.toLowerCase();
            const generic = families
              .map(unquote)
              .find((family) => GENERIC_FAMILIES.has(family.toLowerCase())) || '';
            const result = {
              token,
              stack,
              primary,
              generic,
              declaredWidth: null,
              forcedWidth: null,
              fallbackWidth: null,
              surface,
              weights: [],
              missingWeights: [],
              loaderHrefs,
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

            // Inventory the weights that the live page really paints for this
            // token. Matching the resolved family stack keeps inherited body
            // text and token-backed utility classes in scope, while filtering
            // empty/hidden nodes avoids synthetic or decorative DOM noise.
            const tokenFamily = normalizeFamily(stack);
            const paintedWeights = new Set();
            for (const element of meaningfulElements) {
              const style = getComputedStyle(element);
              if (normalizeFamily(style.fontFamily) !== tokenFamily) continue;
              const numericWeight = Number(style.fontWeight);
              if (Number.isFinite(numericWeight) && numericWeight >= 1) paintedWeights.add(numericWeight);
            }
            result.weights = [...paintedWeights].sort((a, b) => a - b);
            if (!result.weights.length) {
               const selectionLabel = requestedLoaderScope === 'font-override'
                 ? `font override "${activeSelectionId}"`
                 : `system "${activeSelectionId}"`;
               result.error = `${selectionLabel} token ${token} (${surface}) paints no meaningful text`;
              results.push(result);
              continue;
            }

            // A FontFaceSet check is intentionally not used here. Loading the
            // exact weights first is important for static per-weight Google
            // Fonts faces: a weight nothing paints can otherwise measure like
            // the fallback even while the requested face is correctly loaded.
            for (const weight of result.weights) {
              await document.fonts.load(`${weight} 64px ${cssFamily(primary)}`, SAMPLE);
            }
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
            result.missingWeights = result.weights.filter((weight) => !covers(primary, weight));
            if (result.missingWeights.length) {
              result.pass = false;
              const selectionLabel = requestedLoaderScope === 'font-override'
                ? `font override "${activeSelectionId}"`
                : `system "${activeSelectionId}"`;
              result.error =
                `${selectionLabel} token ${token} (${surface}) loader for "${primary}" is missing weight(s) ${result.missingWeights.join(', ')}`;
            }
            if (!result.pass) {
              result.error ||= `declared=${result.declaredWidth} forced=${result.forcedWidth} fallback=${result.fallbackWidth}`;
            }
            results.push(result);
          }
        } finally {
          probe.remove();
        }
        return results;
      }, {
        activeSelectionId: selectionId,
        requestedTokenNames: tokenNames,
        requestedLoaderScope: loaderScope,
      });
      const expectedCount = tokenNames ? tokenNames.length : 3;
      if (!retry || (last.length === expectedCount && last.every((result) => result.pass))) return last;
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
    const fontResults = await paintFonts(fontPage, id);
    await fontContext.close();
    log(`font-paint-${id}`, fontResults.length === 3 && fontResults.every((result) => result.pass),
      fontResults.map((result) =>
        `${result.token}=${result.pass ? `painted [${result.weights.join(', ')}]` : `FAILED (${result.error})`}`).join('; '));
    perSystem[id] = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      return { radius: cs.getPropertyValue('--radius').trim(), display: cs.getPropertyValue('--font-display').trim() };
    });
    await page.screenshot({ path: path.join(OUT, `${id}.png`) });
  }

  // The picker replaces --font-body after selection, while the system sweep
  // above deliberately clears that override. Exercise every actual picker
  // option in a fresh document so a previously registered face cannot mask a
  // missing optional-font weight. The option buttons are the runtime registry
  // here rather than a second hard-coded list.
  const pickerContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pickerPage = await pickerContext.newPage();
  await pickerPage.goto(`${BASE}/settings/theme`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pickerPage.waitForSelector('[data-testid="font-picker"]', { timeout: 30000 });
  const fontOptionIds = await pickerPage.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="font-option-"]')]
      .map((button) => button.getAttribute('data-testid')?.replace('font-option-', ''))
      .filter((id) => id && id !== 'system'),
  );
  await pickerContext.close();
  log(
    'font-override-registry',
    fontOptionIds.length > 0,
    fontOptionIds.length > 0
      ? `${fontOptionIds.length} non-system picker option(s): ${fontOptionIds.join(', ')}`
      : 'the font picker exposes no non-system options',
  );

  for (const optionId of fontOptionIds) {
    const optionContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const optionPage = await optionContext.newPage();
    try {
      await optionPage.goto(`${BASE}/settings/theme`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await optionPage.waitForSelector(`[data-testid="font-option-${optionId}"]`, { timeout: 30000 });
      const intended = await optionPage.evaluate((id) => {
        const button = document.querySelector(`[data-testid="font-option-${id}"]`);
        const specimen = button?.querySelector('p');
        const stack = specimen?.getAttribute('style')?.match(/font-family:\s*([^;]+)/i)?.[1]?.trim() || '';
        const primary = stack.replace(/^(['"])(.*)\1$/, '$2').split(',')[0].trim();
        return { primary, stack };
      }, optionId);
      await optionPage.click(`[data-testid="font-option-${optionId}"]`);
      await optionPage.waitForFunction(
        (id) => document.documentElement.getAttribute('data-font') === id,
        optionId,
        { timeout: 5000 },
      );
      await optionPage.goto(`${BASE}/design-system`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await optionPage.waitForSelector('[data-testid="text-ds-title"]', { timeout: 30000 });
      await optionPage.waitForFunction(
        (id) => document.documentElement.getAttribute('data-font') === id,
        optionId,
        { timeout: 5000 },
      );
      const overrideResults = await paintFonts(
        optionPage,
        optionId,
        true,
        ['--font-body'],
        'font-override',
      );
      const bodyResult = overrideResults.find((result) => result.token === '--font-body');
      const intendedFamily =
        String(intended.primary || '').replace(/["']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      const paintedFamily =
        String(bodyResult?.primary || '').replace(/["']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
      const pass =
        overrideResults.length === 1 &&
        bodyResult?.pass &&
        intendedFamily.length > 0 &&
        paintedFamily === intendedFamily;
      log(
        `font-override-paint-${optionId}`,
        Boolean(pass),
        pass
          ? `${intended.primary} body painted [${bodyResult.weights.join(', ')}]`
          : `FAILED (${bodyResult?.error || `intended ${intended.primary || '(unknown)'} but painted ${bodyResult?.primary || '(none)'}`})`,
      );
    } finally {
      await optionContext.close();
    }
  }

  // Mutation proof for an optional picker font. Only the link marked by
  // loadFontOverride() is included in this check; the always-on Inter link
  // must not be able to hide a missing optional weight.
  const optionMutationId = fontOptionIds[0];
  let optionMutationTarget = null;
  let optionMutationPage = null;
  let optionMutationContext = null;
  if (optionMutationId) {
    optionMutationContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    optionMutationPage = await optionMutationContext.newPage();
    await optionMutationPage.goto(`${BASE}/settings/theme`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await optionMutationPage.waitForSelector(`[data-testid="font-option-${optionMutationId}"]`, { timeout: 30000 });
    await optionMutationPage.click(`[data-testid="font-option-${optionMutationId}"]`);
    await optionMutationPage.waitForFunction(
      (id) => document.documentElement.getAttribute('data-font') === id,
      optionMutationId,
      { timeout: 5000 },
    );
    await optionMutationPage.goto(`${BASE}/design-system`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await optionMutationPage.waitForSelector('[data-testid="text-ds-title"]', { timeout: 30000 });
    await optionMutationPage.waitForSelector(
      `link[data-font-option="${optionMutationId}"]`,
      { state: 'attached', timeout: 15000 },
    );
    const optionMutationBaseline = await paintFonts(
      optionMutationPage,
      optionMutationId,
      true,
      ['--font-body'],
      'font-override',
    );
    const requiredWeights =
      optionMutationBaseline.find((result) => result.token === '--font-body')?.weights || [];
    optionMutationTarget = await optionMutationPage.evaluate(({ id, requiredWeights: required }) => {
      const link = [...document.querySelectorAll('link[data-font-option]')]
        .find((candidate) => candidate.dataset.fontOption === id);
      if (!link) return null;
      const original = link.getAttribute('href') || link.href;
      const href = new URL(original, location.href);
      const families = href.searchParams.getAll('family');
      const first = families.find((family) => /(?:^|[:,])wght@/.test(family));
      if (!first) return null;
      const staticSpec = /^(.*:wght@)(\d+(?:\.\d+)?(?:;\d+(?:\.\d+)?)+)$/.exec(first);
      if (!staticSpec) return null;
      const requested = staticSpec[2].split(';').map(Number);
      const weight = [...required].reverse().find((candidate) => requested.includes(candidate));
      if (!Number.isFinite(weight)) return null;
      const mutatedFamily = `${staticSpec[1]}${requested.filter((candidate) => candidate !== weight).join(';')}`;
      href.searchParams.delete('family');
      for (const family of families) {
        href.searchParams.append('family', family === first ? mutatedFamily : family);
      }
      link.setAttribute('href', href.toString());
      return { id, original, mutated: href.toString(), weight };
    }, { id: optionMutationId, requiredWeights });
  }
  const optionMutationResult = optionMutationTarget
    ? await paintFonts(optionMutationPage, optionMutationId, false, ['--font-body'], 'font-override')
    : [];
  if (optionMutationTarget) {
    await optionMutationPage.evaluate(({ id, original }) => {
      const link = [...document.querySelectorAll('link[data-font-option]')]
        .find((candidate) => candidate.dataset.fontOption === id);
      if (link) link.setAttribute('href', original);
    }, optionMutationTarget);
  }
  const optionMutated = optionMutationResult.find(
    (result) => result.missingWeights?.includes(optionMutationTarget?.weight),
  );
  log(
    'font-override-paint-mutation-detection',
    Boolean(optionMutationTarget && optionMutated && !optionMutated.pass),
    optionMutationTarget && optionMutated
      ? `font option=${optionMutationTarget.id} token=${optionMutated.token} weight=${optionMutationTarget.weight} was ${optionMutated.pass ? 'not detected' : 'detected'} after removing it from the loader URL`
      : 'could not remove a requested static weight from an optional font loader URL',
  );
  if (optionMutationContext) await optionMutationContext.close();

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

  // Mutation proof: remove one requested weight from the active system's
  // loader URL. Existing @font-face rules may remain registered in this
  // document, so this deliberately tests the URL-vs-inventory comparator
  // rather than relying on a browser unload. The href is restored immediately.
  const mutationTarget = await page.evaluate(() => {
    const links = [...document.querySelectorAll('link[data-font-href]')];
    const link = links.at(-1);
    if (!link) return null;
    const systemHref = link.getAttribute('href') || link.href;
    const href = new URL(systemHref, location.href);
    const families = href.searchParams.getAll('family');
    const first = families.find((family) => /(?:^|[:,])wght@/.test(family));
    if (!first) return null;
    const weightMatch = first.match(/wght@[^;,&]*;(\d+(?:\.\d+)?)/);
    const weight = weightMatch ? Number(weightMatch[1]) : 700;
    const mutatedFamily = first.replace(new RegExp(`;${weight}(?=;|&)`), '');
    if (mutatedFamily === first) return null;
    href.searchParams.delete('family');
    for (const family of families) href.searchParams.append('family', family === first ? mutatedFamily : family);
    const original = link.getAttribute('href') || link.href;
    link.setAttribute('href', href.toString());
    return { original, mutated: href.toString(), weight };
  });
  const mutationResult = mutationTarget ? await paintFonts(page, 'swiss', false) : [];
  if (mutationTarget) {
    await page.evaluate(({ original, mutated }) => {
      const link = [...document.querySelectorAll('link[rel="stylesheet"]')]
        .find((candidate) => candidate.href === new URL(mutated, location.href).href);
      if (link) link.setAttribute('href', original);
    }, mutationTarget);
  }
  const mutated = mutationResult.find((result) => result.missingWeights?.includes(mutationTarget?.weight));
  log('font-paint-mutation-detection', Boolean(mutationTarget && mutated && !mutated.pass),
    mutationTarget && mutated
      ? `system=swiss token=${mutated.token} weight=${mutationTarget.weight} was ${mutated.pass ? 'not detected' : 'detected'} after removing it from the loader URL`
      : 'could not remove a requested static weight from the active system loader URL');
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
const failed = results.filter(r => !r.pass);
console.log(failed.length === 0 ? `\nALL ${results.length} CHECKS PASSED` : `\n${failed.length}/${results.length} CHECKS FAILED`);
process.exit(failed.length === 0 ? 0 : 1);
