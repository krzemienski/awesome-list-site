#!/usr/bin/env node
// Pre-paint theme drift gate (tasks #377, #388).
//
// The inline boot script in client/index.html paints the theme BEFORE React
// loads: it reads ds-system / ds-accent / ds-font-override out of localStorage
// and validates each saved choice against a hand-copied list — SYSTEMS,
// ACCENTS, FONT_STACKS. Anything a list does not know is silently replaced by
// the fallback, so a design system, accent, or font that exists in the app but
// is missing from (or disagrees with) the boot script looks to a visitor like
// a choice that "won't stick" after a reload. Task #371 tagged the accent
// literals DS-OK with a "keep the two files in sync" note; a note is not a
// check. This is the check, for all three lists.
//
// Sources compared (every one is a hand-maintained copy of ONE registry, and
// every pair below has silently drifted-by-omission before):
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
//   5 · design-system.ts   DESIGN_SYSTEMS + DEFAULT_SYSTEM  ↔  the boot
//        script's SYSTEMS allowlist + its hard-coded fallback system id
//   6 · font-options.ts    FONT_OPTIONS (id + stack; its own header calls
//        itself the source of truth)  ↔  the boot script's FONT_STACKS map +
//        the id it falls back to, which must be the option applyFontOverride()
//        falls back to at runtime (FONT_OPTIONS[0])
//
// Checks (each FAILs with the id and both sides' literal values):
//   · id-parity      — an accent id present in only one of the accent sources
//   · swatch-value   — primary ≠ --accent, or secondary ≠ --accent-2
//   · root-default   — :root's --accent/--accent-2 ≠ DEFAULT_ACCENT's pair
//   · boot-allowlist — an accent id in only one of ACCENTS / the boot list
//   · boot-fallback  — index.html's fallback accent id ≠ DEFAULT_ACCENT
//   · system-parity  — a system id in only one of DESIGN_SYSTEMS / the boot
//     SYSTEMS allowlist
//   · system-fallback— the boot fallback system id ≠ DEFAULT_SYSTEM, or
//     DEFAULT_SYSTEM is not one of DESIGN_SYSTEMS
//   · font-parity    — a font id in only one of FONT_OPTIONS / FONT_STACKS
//   · font-stack     — a boot FONT_STACKS stack ≠ the FONT_OPTIONS stack, so
//     the face applied before paint is not the one applied after it
//   · font-fallback  — the boot fallback font id ≠ FONT_OPTIONS[0].id, the
//     option applyFontOverride() falls back to
//   · parser rot     — ANY parser finding ZERO entries is itself a failure,
//     so a refactor that renames an array, a map, or a selector can never
//     make this gate pass vacuously
//
// Color identity is normalized before comparison: lowercased, whitespace
// stripped, and #rgb/#rgba shorthand expanded to #rrggbb/#rrggbbaa (so #0f8
// ≡ #00ff88). Notation is otherwise literal — swapping one side to rgb()/
// oklch() while the other keeps hex FAILs on purpose: the picker inlines its
// value as a style attribute, so "same color, different notation" is a claim
// this gate cannot verify and will not wave through.
//
// Font-stack identity is normalized just as narrowly: whitespace runs
// collapse, spacing around commas is dropped, ' and " are interchangeable
// (CSS treats the two quote characters alike), and case is ignored (family
// name matching is case-insensitive). Anything else — a reordered fallback
// chain, a dropped generic family — is drift and FAILs.
//
// Detector canaries run on every invocation: every parser, both normalizers,
// and every comparator are asserted against synthetic known-good and
// known-bad samples first, so a parser regression can never pass vacuously
// either.
//
// Usage: node scripts/validation/accent-drift.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TS_REL = 'client/src/lib/design-system.ts';
const CSS_REL = 'client/src/styles/design-system.css';
const HTML_REL = 'client/index.html';
const FONTS_REL = 'client/src/lib/font-options.ts';

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
// Font-stack identity
// ---------------------------------------------------------------------------
// A font-family list is the same list whichever quote character it uses,
// however it is spaced around the commas, and whatever the family names are
// cased as — CSS treats all three as equivalent. Everything else (a family
// added, dropped, or reordered) is drift.
function normalizeFontStack(raw) {
  return String(raw)
    .replace(/["']/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------
// Strip // line comments and /* block */ comments so a commented-out accent
// entry (or a commented-out CSS block) is never read as live configuration.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// Object-literal walkers, shared by the DESIGN_SYSTEMS record and the boot
// script's FONT_STACKS map. Both are read structurally rather than by
// indentation so a reformat cannot change the parse, and so a nested object
// (a DesignSystem record) or a comma inside a quoted font stack is never
// mistaken for an entry boundary.
function endOfString(src, i) {
  const quote = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') {
      j++;
      continue;
    }
    if (src[j] === quote) return j;
  }
  return src.length - 1; // unterminated literal — the caller's parse fails loudly
}

function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = endOfString(body, i);
      continue;
    }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

// `key: value` pairs at the TOP level of an object-literal body. Keys may be
// quoted ('dm-sans') or bare (editorial); values are returned verbatim.
const OBJECT_ENTRY_RE = /^(?:(['"`])((?:\\.|(?!\1)[\s\S])*)\1|([A-Za-z_$][\w$]*))\s*:\s*([\s\S]*)$/;
const STRING_LITERAL_RE = /^(['"`])((?:\\.|(?!\1)[\s\S])*)\1$/;

// Undo source-level quote escaping so what gets compared is the string the
// browser sees, not how it happens to be spelled: '\'Inter\', sans-serif'
// and "'Inter', sans-serif" are the same stack.
function unescapeLiteral(raw) {
  return raw.replace(/\\(['"\\])/g, '$1');
}

function parseObjectEntries(body) {
  const entries = new Map();
  const malformed = [];
  for (const part of splitTopLevel(stripComments(body))) {
    const m = OBJECT_ENTRY_RE.exec(part);
    if (!m) {
      malformed.push(part.replace(/\s+/g, ' ').slice(0, 120));
      continue;
    }
    entries.set(m[2] ?? m[3], m[4].trim());
  }
  return { entries, malformed };
}

// Same, restricted to string-valued entries. A non-string value (a computed
// key, a nested object) is reported as malformed rather than skipped.
function parseObjectStringEntries(body) {
  const { entries, malformed } = parseObjectEntries(body);
  const strings = new Map();
  for (const [key, raw] of entries) {
    const m = STRING_LITERAL_RE.exec(raw);
    if (!m) {
      malformed.push(`${key}: ${raw.replace(/\s+/g, ' ').slice(0, 80)}`);
      continue;
    }
    strings.set(key, unescapeLiteral(m[2]));
  }
  return { entries: strings, malformed };
}

// A string field of an object literal, read by NAME. Unlike a naive
// ['"] pair this tolerates the OTHER quote character inside the value —
// stack: "'Inter', system-ui, sans-serif" must come back whole, not empty.
function stringField(obj, name) {
  const re = new RegExp(`\\b${name}\\s*:\\s*(['"\`])((?:\\\\.|(?!\\1)[\\s\\S])*)\\1`);
  const m = re.exec(obj);
  return m ? unescapeLiteral(m[2]) : null;
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

// DESIGN_SYSTEMS: Record<string, DesignSystem> in design-system.ts — only the
// keys matter here; the labels/taglines are picker copy, not boot state.
function parseTsDesignSystems(tsSrc) {
  const m = /export\s+const\s+DESIGN_SYSTEMS\s*(?::[^=]*)?=\s*\{([\s\S]*?)\n\};/.exec(tsSrc);
  if (!m) return { ids: [], malformed: [], found: false };
  const { entries, malformed } = parseObjectEntries(m[1]);
  return { ids: [...entries.keys()], malformed, found: true };
}

function parseTsDefaultSystem(tsSrc) {
  const m = /export\s+const\s+DEFAULT_SYSTEM\s*=\s*['"]([^'"]+)['"]/.exec(tsSrc);
  return m ? m[1] : null;
}

// FONT_OPTIONS: FontOption[] in font-options.ts. Order is kept because
// applyFontOverride() falls back to FONT_OPTIONS[0] for an unknown id, which
// is the value the boot script's own fallback has to agree with. `stack` is
// read with the quote-tolerant field reader ('' is a legitimate stack — the
// "System default" option — and must never be confused with a missing field).
function parseTsFontOptions(fontsSrc) {
  const m = /export\s+const\s+FONT_OPTIONS\s*(?::[^=]*)?=\s*\[([\s\S]*?)\n\];/.exec(fontsSrc);
  if (!m) return { fonts: new Map(), order: [], malformed: [], found: false };
  const body = stripComments(m[1]);
  const fonts = new Map();
  const order = [];
  const malformed = [];
  for (const objMatch of body.matchAll(/\{[^{}]*\}/g)) {
    const obj = objMatch[0];
    const id = stringField(obj, 'id');
    const stack = stringField(obj, 'stack');
    if (!id || stack === null) {
      malformed.push(obj.replace(/\s+/g, ' ').slice(0, 120));
      continue;
    }
    fonts.set(id, stack);
    order.push(id);
  }
  return { fonts, order, malformed, found: true };
}

// The pre-paint boot script's system allowlist + the id an unknown saved
// system is silently rewritten to.
function parseBootSystems(htmlSrc) {
  const list = /var\s+SYSTEMS\s*=\s*\[([^\]]*)\]/.exec(htmlSrc);
  const ids = list ? [...list[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : null;
  const fb = /SYSTEMS\.indexOf\(\s*sys\s*\)\s*===?\s*-1\s*\)\s*sys\s*=\s*['"]([^'"]+)['"]/.exec(htmlSrc);
  return { ids, fallback: fb ? fb[1] : null };
}

// The pre-paint boot script's FONT_STACKS map (id → stack applied to
// --font-body/--font-sans before React) + the id an unknown saved font is
// silently rewritten to.
function parseBootFonts(htmlSrc) {
  const m = /var\s+FONT_STACKS\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(htmlSrc);
  const fb = /hasOwnProperty\.call\(\s*FONT_STACKS\s*,\s*fnt\s*\)\s*\)\s*fnt\s*=\s*['"]([^'"]+)['"]/.exec(htmlSrc);
  if (!m) return { stacks: new Map(), malformed: [], found: false, fallback: fb ? fb[1] : null };
  const { entries, malformed } = parseObjectStringEntries(m[1]);
  return { stacks: entries, malformed, found: true, fallback: fb ? fb[1] : null };
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

// Two id lists that must hold exactly the same ids. `describeOnlyInA` /
// `describeOnlyInB` name the consequence of each direction, since "the app
// offers a theme the boot script rejects" and "the boot script allows a theme
// the app never offers" are different bugs.
function compareIdSets(kind, a, b, describeOnlyInA, describeOnlyInB) {
  const setA = new Set(a);
  const setB = new Set(b);
  const failures = [];
  for (const id of [...new Set([...setA, ...setB])].sort()) {
    if (!setB.has(id)) failures.push({ kind, id, message: describeOnlyInA(id) });
    else if (!setA.has(id)) failures.push({ kind, id, message: describeOnlyInB(id) });
  }
  return failures;
}

// The boot script's FONT_STACKS map vs FONT_OPTIONS: same ids, same stacks.
function compareFonts(bootStacks, tsStacks) {
  const failures = [];
  for (const id of [...new Set([...bootStacks.keys(), ...tsStacks.keys()])].sort()) {
    const boot = bootStacks.get(id);
    const ts = tsStacks.get(id);
    if (ts === undefined) {
      failures.push({
        kind: 'font-parity',
        id,
        message: `font "${id}" is in the pre-paint FONT_STACKS map in ${HTML_REL} but not in FONT_OPTIONS in ${FONTS_REL} — the picker can never offer it`,
      });
      continue;
    }
    if (boot === undefined) {
      failures.push({
        kind: 'font-parity',
        id,
        message: `font "${id}" is offered by FONT_OPTIONS in ${FONTS_REL} but missing from the pre-paint FONT_STACKS map in ${HTML_REL} — choosing it would silently reset to the fallback font on the next reload`,
      });
      continue;
    }
    if (normalizeFontStack(boot) !== normalizeFontStack(ts)) {
      failures.push({
        kind: 'font-stack',
        id,
        message: `font "${id}" stack drifted — ${FONTS_REL} says ${JSON.stringify(ts)}, the pre-paint map in ${HTML_REL} says ${JSON.stringify(boot)} — the face painted before React is not the face the picker applies after it`,
      });
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

  // Font-stack identity.
  eq(normalizeFontStack("'Inter', system-ui, sans-serif"), "'inter',system-ui,sans-serif", 'stack lowercased, comma spacing dropped');
  eq(normalizeFontStack('"Inter",  system-ui,\n  sans-serif'), "'inter',system-ui,sans-serif", 'quote character and line breaks are cosmetic');
  eq(normalizeFontStack(''), '', 'the empty "System default" stack survives normalization');
  eq(
    normalizeFontStack("'Inter', sans-serif") === normalizeFontStack("'Inter', system-ui, sans-serif"),
    false,
    'a dropped fallback family is drift',
  );
  eq(
    normalizeFontStack("'Inter', system-ui") === normalizeFontStack("system-ui, 'Inter'"),
    false,
    'a reordered fallback chain is drift',
  );

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

  // TS DESIGN_SYSTEMS parser (nested records, read structurally).
  const tsSystemSample = [
    'export const DESIGN_SYSTEMS: Record<string, DesignSystem> = {',
    "  editorial: { name: 'Editorial', tag: 'Magazine · Fraunces', desc: 'Warm ink, generous leading.' },",
    '  terminal: {',
    "    name: 'Terminal',",
    "    tag: 'CRT · IBM Plex Mono',",
    "    desc: 'Square edges, scanlines, blinking carets.',",
    '  },',
    "  // ghost: { name: 'Ghost', tag: 'Hidden', desc: 'Commented out.' },",
    '};',
    "export const DEFAULT_SYSTEM = 'editorial';",
  ].join('\n');
  const parsedSystems = parseTsDesignSystems(tsSystemSample);
  eq(parsedSystems.found, true, 'DESIGN_SYSTEMS record located');
  eq(parsedSystems.ids, ['editorial', 'terminal'], 'nested + multi-line records parsed, comment ignored');
  eq(parsedSystems.malformed, [], 'well-formed record reports nothing malformed');
  eq(parseTsDesignSystems('const OTHER = {\n};').found, false, 'renamed/absent record is detectable, not an empty pass');
  eq(parseTsDefaultSystem(tsSystemSample), 'editorial', 'DEFAULT_SYSTEM parsed');

  // TS FONT_OPTIONS parser.
  const tsFontSample = [
    'export const FONT_OPTIONS: FontOption[] = [',
    '  { id: "system", name: "System default", stack: "" },',
    `  { id: "inter", name: "Inter", stack: "'Inter', system-ui, sans-serif" },`,
    `  // { id: "ghost", name: "Ghost", stack: "'Ghost', sans-serif" },`,
    '  { id: "broken", name: "Broken" },',
    '];',
  ].join('\n');
  const parsedTsFonts = parseTsFontOptions(tsFontSample);
  eq(parsedTsFonts.found, true, 'FONT_OPTIONS array located');
  eq([...parsedTsFonts.fonts.keys()], ['system', 'inter'], 'ts font entries parsed in order, comment ignored');
  eq(parsedTsFonts.fonts.get('inter'), "'Inter', system-ui, sans-serif", 'stack read whole despite the nested quote character');
  eq(parsedTsFonts.fonts.get('system'), '', 'empty stack kept, never confused with a missing field');
  eq(parsedTsFonts.malformed.length, 1, 'entry missing stack is reported, never silently dropped');
  eq(parsedTsFonts.order[0], 'system', 'FONT_OPTIONS[0] (the runtime fallback) identified by position');
  eq(parseTsFontOptions('const OTHER = [\n];').found, false, 'renamed/absent FONT_OPTIONS is detectable');
  const escapedStackSample = [
    'export const FONT_OPTIONS: FontOption[] = [',
    "  { id: 'inter', name: 'Inter', stack: '\\'Inter\\', system-ui, sans-serif' },",
    '];',
  ].join('\n');
  eq(
    parseTsFontOptions(escapedStackSample).fonts.get('inter'),
    "'Inter', system-ui, sans-serif",
    'escaped quotes are unescaped — a stack is compared by value, not by spelling',
  );

  // Boot-script system + font parsers.
  const htmlThemeSample = [
    "          var SYSTEMS = ['editorial', 'terminal', 'geist'];",
    "          if (SYSTEMS.indexOf(sys) === -1) sys = 'editorial';",
    '          var FONT_STACKS = {',
    "            'system':       '',",
    `            'inter':        "'Inter', system-ui, sans-serif",`,
    `            'jetbrains':    "'JetBrains Mono', ui-monospace, monospace"`,
    '          };',
    "          if (!Object.prototype.hasOwnProperty.call(FONT_STACKS, fnt)) fnt = 'system';",
  ].join('\n');
  eq(
    parseBootSystems(htmlThemeSample),
    { ids: ['editorial', 'terminal', 'geist'], fallback: 'editorial' },
    'boot SYSTEMS allowlist + fallback',
  );
  eq(parseBootSystems('<html></html>'), { ids: null, fallback: null }, 'absent boot SYSTEMS list is detectable');
  const parsedBootFonts = parseBootFonts(htmlThemeSample);
  eq(parsedBootFonts.found, true, 'boot FONT_STACKS map located');
  eq([...parsedBootFonts.stacks.keys()], ['system', 'inter', 'jetbrains'], 'boot font ids parsed');
  eq(parsedBootFonts.stacks.get('inter'), "'Inter', system-ui, sans-serif", 'commas inside a quoted stack do not split the entry');
  eq(parsedBootFonts.stacks.get('system'), '', 'empty boot stack parsed as "", not skipped');
  eq(parsedBootFonts.fallback, 'system', 'boot font fallback parsed');
  eq(parseBootFonts('<html></html>'), { stacks: new Map(), malformed: [], found: false, fallback: null }, 'absent FONT_STACKS map is detectable');

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

  // Comparator — id sets (systems).
  const onlyBoot = (id) => `only-boot ${id}`;
  const onlyTs = (id) => `only-ts ${id}`;
  eq(
    compareIdSets('system-parity', ['editorial', 'terminal'], ['terminal', 'editorial'], onlyBoot, onlyTs),
    [],
    'same ids in a different order pass',
  );
  eq(
    compareIdSets('system-parity', ['editorial', 'ghost'], ['editorial'], onlyBoot, onlyTs).map((f) => [f.kind, f.id, f.message]),
    [['system-parity', 'ghost', 'only-boot ghost']],
    'boot-only system caught, with the boot-side consequence',
  );
  eq(
    compareIdSets('system-parity', ['editorial'], ['editorial', 'ghost'], onlyBoot, onlyTs).map((f) => [f.kind, f.id, f.message]),
    [['system-parity', 'ghost', 'only-ts ghost']],
    'app-only system caught, with the app-side consequence',
  );

  // Comparator — fonts.
  const goodFonts = new Map([
    ['system', ''],
    ['inter', "'Inter', system-ui, sans-serif"],
  ]);
  eq(compareFonts(goodFonts, new Map(goodFonts)), [], 'identical font maps pass');
  eq(
    compareFonts(new Map([...goodFonts, ['inter', '"Inter",system-ui,sans-serif']]), goodFonts),
    [],
    'quote/whitespace differences are the same stack',
  );
  const stackDrift = compareFonts(new Map([...goodFonts, ['inter', "'Inter', sans-serif"]]), goodFonts);
  eq(stackDrift.map((f) => [f.kind, f.id]), [['font-stack', 'inter']], 'stack drift caught');
  const bootOnlyFont = compareFonts(goodFonts, new Map([['system', '']]));
  eq(bootOnlyFont.map((f) => [f.kind, f.id]), [['font-parity', 'inter']], 'boot-only font caught');
  const pickerOnlyFont = compareFonts(new Map([['system', '']]), goodFonts);
  eq(pickerOnlyFont.map((f) => [f.kind, f.id]), [['font-parity', 'inter']], 'picker-only font caught');
  const emptiedStack = compareFonts(new Map([...goodFonts, ['inter', '']]), goodFonts);
  eq(emptiedStack.map((f) => [f.kind, f.id]), [['font-stack', 'inter']], 'a stack emptied on one side is drift, not a skip');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
runCanaries();
console.log('PASS canaries :: every parser, both normalizers, and every comparator verified against known-good/known-bad samples');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const tsSrc = read(TS_REL);
const cssSrc = read(CSS_REL);
const htmlSrc = read(HTML_REL);
const fontsSrc = read(FONTS_REL);

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

// ---------------------------------------------------------------------------
// Design systems: DESIGN_SYSTEMS vs the pre-paint SYSTEMS allowlist, and
// DEFAULT_SYSTEM vs the id the boot script rewrites an unknown choice to.
// ---------------------------------------------------------------------------
const tsSystems = parseTsDesignSystems(tsSrc);
const bootSystems = parseBootSystems(htmlSrc);
const defaultSystemId = parseTsDefaultSystem(tsSrc);

if (!tsSystems.found) fail('parser-rot', `could not locate "export const DESIGN_SYSTEMS … = { … };" in ${TS_REL}`);
if (!tsSystems.ids.length) fail('parser-rot', `parsed ZERO systems out of DESIGN_SYSTEMS in ${TS_REL}`);
for (const part of tsSystems.malformed) {
  fail('parser-rot', `DESIGN_SYSTEMS entry in ${TS_REL} is not an "id: { … }" pair: ${part}`);
}
if (!bootSystems.ids || !bootSystems.ids.length) {
  fail('parser-rot', `could not locate the pre-paint "var SYSTEMS = [ … ]" allowlist in ${HTML_REL}`);
} else if (tsSystems.ids.length) {
  failures.push(
    ...compareIdSets(
      'system-parity',
      bootSystems.ids,
      tsSystems.ids,
      (id) => `design system "${id}" is in the pre-paint SYSTEMS allowlist in ${HTML_REL} but not in DESIGN_SYSTEMS in ${TS_REL} — the picker can never offer it`,
      (id) => `design system "${id}" is offered by DESIGN_SYSTEMS in ${TS_REL} but is missing from the pre-paint SYSTEMS allowlist in ${HTML_REL} — choosing it would silently reset to the fallback system on the next reload`,
    ),
  );
}
if (!defaultSystemId) {
  fail('parser-rot', `could not locate "export const DEFAULT_SYSTEM = …" in ${TS_REL}`);
} else if (tsSystems.ids.length && !tsSystems.ids.includes(defaultSystemId)) {
  fail('system-fallback', `DEFAULT_SYSTEM "${defaultSystemId}" in ${TS_REL} is not one of the DESIGN_SYSTEMS entries`);
}
if (!bootSystems.fallback) {
  fail('parser-rot', `could not locate the pre-paint system fallback assignment in ${HTML_REL}`);
} else if (defaultSystemId && bootSystems.fallback !== defaultSystemId) {
  fail(
    'system-fallback',
    `${HTML_REL} falls back to design system "${bootSystems.fallback}" pre-paint but DEFAULT_SYSTEM in ${TS_REL} is "${defaultSystemId}"`,
  );
}

// ---------------------------------------------------------------------------
// Fonts: FONT_OPTIONS (the declared source of truth) vs the pre-paint
// FONT_STACKS map, ids AND stacks, plus the two fallbacks.
// ---------------------------------------------------------------------------
const tsFonts = parseTsFontOptions(fontsSrc);
const bootFonts = parseBootFonts(htmlSrc);
const runtimeFontFallback = tsFonts.order[0] ?? null;

if (!tsFonts.found) fail('parser-rot', `could not locate "export const FONT_OPTIONS … = [ … ];" in ${FONTS_REL}`);
if (!tsFonts.fonts.size) fail('parser-rot', `parsed ZERO options out of FONT_OPTIONS in ${FONTS_REL}`);
for (const obj of tsFonts.malformed) {
  fail('parser-rot', `FONT_OPTIONS entry in ${FONTS_REL} is missing id/stack: ${obj}`);
}
if (!bootFonts.found) fail('parser-rot', `could not locate the pre-paint "var FONT_STACKS = { … };" map in ${HTML_REL}`);
if (bootFonts.found && !bootFonts.stacks.size) {
  fail('parser-rot', `parsed ZERO entries out of the pre-paint FONT_STACKS map in ${HTML_REL}`);
}
for (const part of bootFonts.malformed) {
  fail('parser-rot', `pre-paint FONT_STACKS entry in ${HTML_REL} is not an "id: 'stack'" pair: ${part}`);
}
if (tsFonts.fonts.size && bootFonts.stacks.size) {
  failures.push(...compareFonts(bootFonts.stacks, tsFonts.fonts));
}
if (!bootFonts.fallback) {
  fail('parser-rot', `could not locate the pre-paint font fallback assignment in ${HTML_REL}`);
} else if (runtimeFontFallback && bootFonts.fallback !== runtimeFontFallback) {
  fail(
    'font-fallback',
    `${HTML_REL} falls back to font "${bootFonts.fallback}" pre-paint but applyFontOverride() in ${FONTS_REL} falls back to FONT_OPTIONS[0] ("${runtimeFontFallback}") — an unknown saved font would paint one face before React and another after it`,
  );
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f.kind} :: ${f.message}`);
  console.error(`\n${failures.length} theme-drift failure(s).`);
  console.error(`       The picker swatches (${TS_REL}), the paint (${CSS_REL}),`);
  console.error(`       and the font stacks (${FONTS_REL}) are hand-copied mirrors of one theme`);
  console.error('       registry — fix ALL affected sides together, and keep the pre-paint');
  console.error(`       SYSTEMS / ACCENTS / FONT_STACKS lists in ${HTML_REL} in step.`);
  process.exit(1);
}

console.log(`PASS id-parity :: ${tsAccents.size} accent(s) present in ACCENTS, :root[data-accent] blocks, and the pre-paint allowlist`);
for (const [id, v] of tsAccents) console.log(`       ${id.padEnd(8)} ${v.primary} / ${v.secondary}`);
console.log(`PASS root-default :: :root paints DEFAULT_ACCENT "${defaultAccentId}" (${rootDefault.primary} / ${rootDefault.secondary})`);
console.log(
  `PASS system-parity :: ${tsSystems.ids.length} system(s) present in DESIGN_SYSTEMS and the pre-paint SYSTEMS allowlist — ${tsSystems.ids.join(', ')} (fallback "${defaultSystemId}")`,
);
console.log(`PASS font-parity :: ${tsFonts.fonts.size} font option(s) present in FONT_OPTIONS and the pre-paint FONT_STACKS map with identical stacks (fallback "${runtimeFontFallback}")`);
for (const [id, stack] of tsFonts.fonts) console.log(`       ${id.padEnd(12)} ${stack === '' ? '(system default — no override)' : stack}`);
console.log('\nPASS accent-drift :: picker swatches, painted accent tokens, and the pre-paint system/font lists agree');
