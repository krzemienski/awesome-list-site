#!/usr/bin/env node
// Accent-swatch drift gate (task #377).
//
// The ten swatches painted by the /settings/theme picker are hand-copied hex
// literals in the ACCENTS array of client/src/lib/design-system.ts. The colors
// that actually paint the site are the :root[data-accent="…"] blocks at the
// bottom of client/src/styles/design-system.css. Nothing kept the two in sync,
// so editing one and forgetting the other made the picker advertise a color
// the site never uses — invisible until somebody eyeballed all ten swatches.
// Task #371 tagged the literals DS-OK with a "keep the two files in sync"
// note; a note is not a check. This is the check.
//
// Sources compared (all four are hand-maintained copies of ONE accent
// registry, and every pair below has silently drifted-by-omission before):
//   1 · design-system.ts   ACCENTS[]                 → id + primary + secondary
//   2 · design-system.css  :root[data-accent="…"]    → --accent + --accent-2
//   3 · design-system.css  :root                     → the pre-attribute
//        default pair, which the CSS itself documents as Crimson's values
//        (i.e. DEFAULT_ACCENT's) and which paints before any data-accent
//        attribute exists
//   4 · client/index.html  the pre-paint boot script's ACCENTS id allowlist +
//        its hard-coded fallback id — an accent missing from that list is
//        rejected before React boots, so the picker would offer an accent
//        that silently resets to the fallback on the next reload
//
// Checks (each FAILs with the accent id and both sides' literal values):
//   · id-parity     — an accent id present in only one of the sources
//   · swatch-value  — primary ≠ --accent, or secondary ≠ --accent-2
//   · root-default  — :root's --accent/--accent-2 ≠ DEFAULT_ACCENT's pair
//   · boot-fallback — index.html's fallback id ≠ DEFAULT_ACCENT
//   · parser rot    — either parser finding ZERO accents is itself a failure,
//     so a refactor that renames the array or the selector can never make
//     this gate pass vacuously
//
// Color identity is normalized before comparison: lowercased, whitespace
// stripped, and #rgb/#rgba shorthand expanded to #rrggbb/#rrggbbaa (so #0f8
// ≡ #00ff88). Notation is otherwise literal — swapping one side to rgb()/
// oklch() while the other keeps hex FAILs on purpose: the picker inlines its
// value as a style attribute, so "same color, different notation" is a claim
// this gate cannot verify and will not wave through.
//
// Detector canaries run on every invocation: both parsers, the color
// normalizer, and the comparator are asserted against synthetic known-good
// and known-bad samples first, so a parser regression can never pass
// vacuously either.
//
// Usage: node scripts/validation/accent-drift.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TS_REL = 'client/src/lib/design-system.ts';
const CSS_REL = 'client/src/styles/design-system.css';
const HTML_REL = 'client/index.html';

// ---------------------------------------------------------------------------
// Color identity
// ---------------------------------------------------------------------------
// Lowercase + strip whitespace, and expand #rgb / #rgba shorthand so the two
// files may legitimately disagree about shorthand but nothing else.
function normalizeColor(raw) {
  const v = String(raw).trim().replace(/\s+/g, '').toLowerCase();
  const m = /^#([0-9a-f]{3,4})$/.exec(v);
  if (!m) return v;
  return '#' + [...m[1]].map((c) => c + c).join('');
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------
// Strip // line comments and /* block */ comments so a commented-out accent
// entry (or a commented-out CSS block) is never read as live configuration.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// A custom-property declaration inside a rule body. `--accent\s*:` cannot
// match "--accent-2:" (a "-" sits where the ":" must be), so the two names
// never collide.
function cssVar(body, name) {
  const re = new RegExp(`(?:^|[\\s;{])${name}\\s*:\\s*([^;}]+)`, 'i');
  const m = re.exec(body);
  return m ? m[1].trim() : null;
}

// :root[data-accent="id"] { … } blocks. Anchored so that only a bare
// attribute rule counts — a descendant rule like
// `:root[data-accent="matrix"] .card { … }` is a component skin, not the
// accent registry, and is deliberately ignored.
const ACCENT_BLOCK_RE = /^[ \t]*:root\[data-accent=["']([A-Za-z0-9_-]+)["']\]\s*\{([^}]*)\}/gm;

function parseCssAccents(cssSrc) {
  const src = stripComments(cssSrc);
  const out = new Map();
  for (const m of src.matchAll(ACCENT_BLOCK_RE)) {
    out.set(m[1], { primary: cssVar(m[2], '--accent'), secondary: cssVar(m[2], '--accent-2') });
  }
  return out;
}

// The bare `:root { … }` block (no attribute selector) holds the pre-attribute
// default pair. Body-matching stops at the first "}" — the accent tokens sit
// in the flat declaration list, not inside a nested at-rule, so that is exact.
function parseCssRootDefault(cssSrc) {
  const src = stripComments(cssSrc);
  const m = /^[ \t]*:root\s*\{([^}]*)\}/m.exec(src);
  if (!m) return null;
  return { primary: cssVar(m[1], '--accent'), secondary: cssVar(m[1], '--accent-2') };
}

// ACCENTS: Accent[] in design-system.ts. Fields are read by NAME out of each
// object literal rather than positionally, so reordering id/name/primary/
// secondary never breaks the parse (only losing a field does — and that
// FAILs, it does not silently skip the entry).
function parseTsAccents(tsSrc) {
  const m = /export\s+const\s+ACCENTS\s*:\s*Accent\[\]\s*=\s*\[([\s\S]*?)\n\];/.exec(tsSrc);
  if (!m) return { accents: new Map(), malformed: [], found: false };
  const body = stripComments(m[1]);
  const accents = new Map();
  const malformed = [];
  for (const objMatch of body.matchAll(/\{[^{}]*\}/g)) {
    const obj = objMatch[0];
    const field = (name) => {
      const f = new RegExp(`\\b${name}\\s*:\\s*['"\`]([^'"\`]*)['"\`]`).exec(obj);
      return f ? f[1] : null;
    };
    const id = field('id');
    const primary = field('primary');
    const secondary = field('secondary');
    if (!id || !primary || !secondary) {
      malformed.push(obj.replace(/\s+/g, ' ').slice(0, 120));
      continue;
    }
    accents.set(id, { primary, secondary });
  }
  return { accents, malformed, found: true };
}

// The pre-paint boot script in client/index.html: an id allowlist plus the
// hard-coded fallback applied when localStorage holds an unknown accent.
function parseBootAccents(htmlSrc) {
  const list = /var\s+ACCENTS\s*=\s*\[([^\]]*)\]/.exec(htmlSrc);
  const ids = list ? [...list[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : null;
  const fb = /ACCENTS\.indexOf\(\s*acc\s*\)\s*===?\s*-1\s*\)\s*acc\s*=\s*['"]([^'"]+)['"]/.exec(htmlSrc);
  return { ids, fallback: fb ? fb[1] : null };
}

function parseTsDefaultAccent(tsSrc) {
  const m = /export\s+const\s+DEFAULT_ACCENT\s*=\s*['"]([^'"]+)['"]/.exec(tsSrc);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Comparator — shared by the canaries and the real run so the two can never
// disagree about what counts as drift.
// ---------------------------------------------------------------------------
function compareAccents(ts, css) {
  const failures = [];
  for (const id of [...new Set([...ts.keys(), ...css.keys()])].sort()) {
    const t = ts.get(id);
    const c = css.get(id);
    if (!c) {
      failures.push({
        kind: 'id-parity',
        id,
        message: `accent "${id}" is in ${TS_REL} (ACCENTS) but has no :root[data-accent="${id}"] block in ${CSS_REL} — the picker offers a swatch that paints nothing`,
      });
      continue;
    }
    if (!t) {
      failures.push({
        kind: 'id-parity',
        id,
        message: `accent "${id}" has a :root[data-accent="${id}"] block in ${CSS_REL} but is missing from ACCENTS in ${TS_REL} — the picker can never offer it`,
      });
      continue;
    }
    for (const [field, cssVarName] of [
      ['primary', '--accent'],
      ['secondary', '--accent-2'],
    ]) {
      const cssValue = c[field];
      if (cssValue == null) {
        failures.push({
          kind: 'swatch-value',
          id,
          message: `accent "${id}" :root[data-accent="${id}"] block declares no ${cssVarName} in ${CSS_REL}`,
        });
        continue;
      }
      if (normalizeColor(t[field]) !== normalizeColor(cssValue)) {
        failures.push({
          kind: 'swatch-value',
          id,
          message: `accent "${id}" ${field} drifted — ${TS_REL} says ${t[field]}, ${CSS_REL} ${cssVarName} says ${cssValue}`,
        });
      }
    }
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Detector canaries
// ---------------------------------------------------------------------------
function runCanaries() {
  const eq = (a, b, what) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new Error(`canary: ${what} → ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
    }
  };

  // Color identity.
  eq(normalizeColor('#FF3D52'), '#ff3d52', 'hex lowercased');
  eq(normalizeColor(' #ff3d52 '), '#ff3d52', 'hex trimmed');
  eq(normalizeColor('#0f8'), '#00ff88', '#rgb shorthand expanded');
  eq(normalizeColor('#0f8a'), '#00ff88aa', '#rgba shorthand expanded');
  eq(normalizeColor('rgb(255, 61, 82)'), 'rgb(255,61,82)', 'non-hex notation kept literal (ws-stripped)');
  eq(normalizeColor('#ff3d52') === normalizeColor('rgb(255,61,82)'), false, 'notation change is drift, not equality');

  // CSS accent-block parser.
  const cssSample = [
    ':root { --accent: #ff3d52; --accent-2: #b84dff; }',
    ':root[data-accent="crimson"]  { --accent: #ff3d52; --accent-2: #b84dff; }',
    ":root[data-accent='matrix'] {--accent:#00FF88;--accent-2:#39ff14;}",
    ':root[data-accent="lime"] { --accent: #aaff00; }',
    ':root[data-accent="matrix"] .card { --accent: #dead00; }',
    '/* :root[data-accent="ghost"] { --accent: #111111; --accent-2: #222222; } */',
    '[data-system="terminal"] .btn { border-radius: 0; }',
  ].join('\n');
  const parsedCss = parseCssAccents(cssSample);
  eq([...parsedCss.keys()].sort(), ['crimson', 'lime', 'matrix'], 'css blocks parsed, descendant rule ignored');
  eq(parsedCss.get('crimson'), { primary: '#ff3d52', secondary: '#b84dff' }, 'css pair with padding');
  eq(parsedCss.get('matrix'), { primary: '#00FF88', secondary: '#39ff14' }, 'css pair minified + single quotes');
  eq(parsedCss.get('lime'), { primary: '#aaff00', secondary: null }, 'missing --accent-2 reported as null, not skipped');
  eq(parsedCss.has('ghost'), false, 'commented-out block is not live config');
  eq(parseCssRootDefault(cssSample), { primary: '#ff3d52', secondary: '#b84dff' }, ':root default pair');
  eq(cssVar('--accent-2: #b84dff;', '--accent'), null, '--accent-2 never satisfies --accent');

  // TS ACCENTS parser.
  const tsSample = [
    'export const ACCENTS: Accent[] = [',
    "  // DS-OK: mirrored DS accent constants — keep the two files in sync.",
    "  { id: 'crimson', name: 'Crimson', primary: '#ff3d52', secondary: '#b84dff' },",
    '  { secondary: "#39ff14", primary: "#00ff88", name: "Matrix", id: "matrix" },',
    "  // { id: 'ghost', name: 'Ghost', primary: '#111111', secondary: '#222222' },",
    "  { id: 'broken', name: 'Broken', primary: '#123456' },",
    '];',
    "export const DEFAULT_ACCENT = 'crimson';",
  ].join('\n');
  const parsedTs = parseTsAccents(tsSample);
  eq(parsedTs.found, true, 'ACCENTS array located');
  eq([...parsedTs.accents.keys()].sort(), ['crimson', 'matrix'], 'ts entries parsed, comment ignored');
  eq(parsedTs.accents.get('matrix'), { primary: '#00ff88', secondary: '#39ff14' }, 'fields read by name, not position');
  eq(parsedTs.malformed.length, 1, 'entry missing a field is reported, never silently dropped');
  eq(parseTsDefaultAccent(tsSample), 'crimson', 'DEFAULT_ACCENT parsed');
  eq(parseTsAccents('const OTHER = [];').found, false, 'renamed/absent array is detectable, not an empty pass');

  // Boot-script parser.
  const htmlSample = [
    "          var ACCENTS  = ['crimson', 'magenta', 'orange'];",
    "          if (ACCENTS.indexOf(acc)  === -1) acc = 'crimson';",
  ].join('\n');
  eq(parseBootAccents(htmlSample), { ids: ['crimson', 'magenta', 'orange'], fallback: 'crimson' }, 'boot allowlist + fallback');
  eq(parseBootAccents('<html></html>'), { ids: null, fallback: null }, 'absent boot script is detectable');

  // Comparator — every drift shape the gate exists to catch.
  const good = new Map([
    ['crimson', { primary: '#ff3d52', secondary: '#b84dff' }],
    ['matrix', { primary: '#00ff88', secondary: '#39ff14' }],
  ]);
  eq(compareAccents(good, new Map(good)), [], 'identical sources pass');
  eq(
    compareAccents(good, new Map([...good, ['matrix', { primary: '#0f8', secondary: '#39ff14' }]])).length,
    0,
    'shorthand-vs-longhand hex is the same color',
  );
  const primaryDrift = compareAccents(good, new Map([...good, ['matrix', { primary: '#00ff87', secondary: '#39ff14' }]]));
  eq(primaryDrift.map((f) => [f.kind, f.id]), [['swatch-value', 'matrix']], 'primary drift caught');
  const secondaryDrift = compareAccents(good, new Map([...good, ['crimson', { primary: '#ff3d52', secondary: '#b84dfe' }]]));
  eq(secondaryDrift.map((f) => [f.kind, f.id]), [['swatch-value', 'crimson']], 'secondary drift caught');
  const missingCss = compareAccents(good, new Map([['crimson', good.get('crimson')]]));
  eq(missingCss.map((f) => [f.kind, f.id]), [['id-parity', 'matrix']], 'ts-only accent caught');
  const missingTs = compareAccents(new Map([['crimson', good.get('crimson')]]), good);
  eq(missingTs.map((f) => [f.kind, f.id]), [['id-parity', 'matrix']], 'css-only accent caught');
  const noVar = compareAccents(good, new Map([...good, ['matrix', { primary: '#00ff88', secondary: null }]]));
  eq(noVar.map((f) => [f.kind, f.id]), [['swatch-value', 'matrix']], 'css block missing --accent-2 caught');
  const notation = compareAccents(good, new Map([...good, ['matrix', { primary: 'rgb(0,255,136)', secondary: '#39ff14' }]]));
  eq(notation.map((f) => [f.kind, f.id]), [['swatch-value', 'matrix']], 'notation swap is drift');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
runCanaries();
console.log('PASS canaries :: both parsers, the color normalizer, and the comparator verified against known-good/known-bad samples');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const tsSrc = read(TS_REL);
const cssSrc = read(CSS_REL);
const htmlSrc = read(HTML_REL);

const failures = [];
const fail = (kind, message) => failures.push({ kind, message });

const { accents: tsAccents, malformed, found } = parseTsAccents(tsSrc);
const cssAccents = parseCssAccents(cssSrc);

// Parser-rot guards: a rename or reformat must break the gate LOUDLY rather
// than reduce it to comparing two empty sets.
if (!found) fail('parser-rot', `could not locate "export const ACCENTS: Accent[] = [ … ];" in ${TS_REL}`);
if (!tsAccents.size) fail('parser-rot', `parsed ZERO accents out of ACCENTS in ${TS_REL}`);
if (!cssAccents.size) fail('parser-rot', `parsed ZERO :root[data-accent="…"] blocks out of ${CSS_REL}`);
for (const obj of malformed) {
  fail('parser-rot', `ACCENTS entry in ${TS_REL} is missing id/primary/secondary: ${obj}`);
}

failures.push(...compareAccents(tsAccents, cssAccents));

// :root's pre-attribute default pair must be DEFAULT_ACCENT's swatch.
const defaultAccentId = parseTsDefaultAccent(tsSrc);
const rootDefault = parseCssRootDefault(cssSrc);
if (!defaultAccentId) {
  fail('parser-rot', `could not locate "export const DEFAULT_ACCENT = …" in ${TS_REL}`);
} else if (!rootDefault) {
  fail('parser-rot', `could not locate the bare ":root { … }" token block in ${CSS_REL}`);
} else {
  const expected = tsAccents.get(defaultAccentId);
  if (!expected) {
    fail('root-default', `DEFAULT_ACCENT "${defaultAccentId}" in ${TS_REL} is not one of the ACCENTS entries`);
  } else {
    for (const [field, cssVarName] of [
      ['primary', '--accent'],
      ['secondary', '--accent-2'],
    ]) {
      if (normalizeColor(expected[field]) !== normalizeColor(rootDefault[field] ?? '')) {
        fail(
          'root-default',
          `:root ${cssVarName} in ${CSS_REL} is ${rootDefault[field] ?? '(absent)'} but DEFAULT_ACCENT "${defaultAccentId}" ${field} is ${expected[field]} — the pre-attribute paint disagrees with the default swatch`,
        );
      }
    }
  }
}

// The pre-paint boot allowlist gates which accent ids survive a reload.
const boot = parseBootAccents(htmlSrc);
if (!boot.ids || !boot.ids.length) {
  fail('parser-rot', `could not locate the pre-paint "var ACCENTS = [ … ]" allowlist in ${HTML_REL}`);
} else {
  const bootSet = new Set(boot.ids);
  for (const id of tsAccents.keys()) {
    if (!bootSet.has(id)) {
      fail(
        'boot-allowlist',
        `accent "${id}" is offered by the picker but is missing from the pre-paint ACCENTS allowlist in ${HTML_REL} — it would be reset to the fallback on the next reload`,
      );
    }
  }
  for (const id of bootSet) {
    if (!tsAccents.has(id)) {
      fail('boot-allowlist', `accent "${id}" is in the pre-paint ACCENTS allowlist in ${HTML_REL} but not in ACCENTS in ${TS_REL}`);
    }
  }
}
if (defaultAccentId && boot.fallback && boot.fallback !== defaultAccentId) {
  fail(
    'boot-fallback',
    `${HTML_REL} falls back to "${boot.fallback}" pre-paint but DEFAULT_ACCENT in ${TS_REL} is "${defaultAccentId}"`,
  );
}
if (!boot.fallback) {
  fail('parser-rot', `could not locate the pre-paint accent fallback assignment in ${HTML_REL}`);
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f.kind} :: ${f.message}`);
  console.error(`\n${failures.length} accent-drift failure(s).`);
  console.error(`       The picker swatches (${TS_REL}) and the paint (${CSS_REL})`);
  console.error('       are hand-copied mirrors of one accent registry — fix BOTH sides together,');
  console.error(`       and keep the pre-paint allowlist in ${HTML_REL} in step.`);
  process.exit(1);
}

console.log(`PASS id-parity :: ${tsAccents.size} accent(s) present in ACCENTS, :root[data-accent] blocks, and the pre-paint allowlist`);
for (const [id, v] of tsAccents) console.log(`       ${id.padEnd(8)} ${v.primary} / ${v.secondary}`);
console.log(`PASS root-default :: :root paints DEFAULT_ACCENT "${defaultAccentId}" (${rootDefault.primary} / ${rootDefault.secondary})`);
console.log('\nPASS accent-drift :: picker swatches and painted accent tokens agree');
