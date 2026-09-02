#!/usr/bin/env node
// Theme drift gate (tasks #377, #388, #399).
//
// The inline boot script in client/index.html paints the theme BEFORE React
// loads: it reads ds-system / ds-accent / ds-font-override out of localStorage
// and validates each saved choice against a hand-copied list — SYSTEMS,
// ACCENTS, FONT_STACKS. Anything a list does not know is silently replaced by
// the fallback, so a design system, accent, or font that exists in the app but
// is missing from (or disagrees with) the boot script looks to a visitor like
// a choice that "won't stick" after a reload. Task #371 tagged the accent
// literals DS-OK with a "keep the two files in sync" note; a note is not a
// check. This is the check, for all three lists — and for the stylesheet maps
// that fetch the faces those lists name, whose omission is quieter still: the
// choice sticks, it just never paints in the typeface it promised.
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
//   6 · design-system.css  :root[data-system="…"] token blocks  ↔
//        DESIGN_SYSTEMS — agreeing on an id is not the same as having a
//        LOOK. The block IS the treatment, so a system the picker offers
//        and the boot script accepts but the stylesheet never paints sticks
//        on <html> and renders exactly like the default: a theme that "does
//        nothing" rather than one that "won't stick"
//   7 · font-options.ts    FONT_OPTIONS (id + stack; its own header calls
//        itself the source of truth)  ↔  the boot script's FONT_STACKS map +
//        the id it falls back to, which must be the option applyFontOverride()
//        falls back to at runtime (FONT_OPTIONS[0])
//   8 · design-system.ts   SYSTEM_DEFAULT_ACCENT  ↔  DESIGN_SYSTEMS + ACCENTS.
//        A third hand-maintained list keyed by system id: it is the accent a
//        system is meant to arrive with. applyDesignSystem() and the theme
//        provider both read it as `SYSTEM_DEFAULT_ACCENT[id] || DEFAULT_ACCENT`,
//        so a system with no entry quietly keeps whatever accent happens to be
//        active (or falls back to the global default) instead of its own look,
//        and an entry naming an accent that is not in ACCENTS sets a
//        data-accent no :root[data-accent="…"] block paints
//   9 · font-options.ts    FONT_STYLESHEETS — the map that actually DOWNLOADS
//        the picker's webfonts  ↔  FONT_OPTIONS. A stack is only half of a
//        webfont: an option whose stack is right but whose stylesheet entry
//        is missing (or which downloads a family the stack never names)
//        renders in the fallback face — the setting looks applied and the
//        page looks unchanged, which is harder to spot than an outright reset
//  10 · font-options.ts    SYSTEM_STYLESHEETS  ↔  design-system.ts
//        DESIGN_SYSTEMS — the per-system display face, same failure mode: the
//        system's CSS still NAMES its family, nothing downloads it
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
//   · system-paint   — a DESIGN_SYSTEMS id with no :root[data-system="…"]
//     token block, a block whose id the picker never offers (dead paint),
//     or a block that declares no custom property at all (an empty block
//     paints like the default just as surely as a missing one)
//   · base-root-exemption — the "painted by the bare :root" escape hatch
//     below went stale: an entry carrying no written reason, an entry whose
//     system has since grown its own token block, or one naming a system
//     DESIGN_SYSTEMS no longer offers
//   · system-accent-parity — a DESIGN_SYSTEMS id with no SYSTEM_DEFAULT_ACCENT
//     entry, or an entry keyed by a system that no longer exists
//   · system-accent-value  — a SYSTEM_DEFAULT_ACCENT entry naming an accent id
//     that is not in ACCENTS
//   · font-parity    — a font id in only one of FONT_OPTIONS / FONT_STACKS
//   · font-stack     — a boot FONT_STACKS stack ≠ the FONT_OPTIONS stack, so
//     the face applied before paint is not the one applied after it
//   · font-fallback  — the boot fallback font id ≠ FONT_OPTIONS[0].id, the
//     option applyFontOverride() falls back to
//   · font-stylesheet— an option with a non-empty stack has no
//     FONT_STYLESHEETS entry, an entry exists for an id FONT_OPTIONS does not
//     offer, or an entry exists for an option with NO stack. "System default"
//     needs no webfont BY RULE — stack "" ⇔ no stylesheet entry, checked in
//     BOTH directions, so the exemption is the empty stack itself and can
//     never quietly widen to cover an option that does declare a stack
//   · font-stylesheet-family — the stylesheet an option downloads names a
//     family its stack does not, so the file arrives and nothing renders in
//     it (the same invisible fallback-face bug as a missing entry)
//   · system-stylesheet — a DESIGN_SYSTEMS id with no SYSTEM_STYLESHEETS
//     entry (its display face is never fetched), or an entry for a system the
//     app does not offer
//   · parser rot     — ANY parser finding ZERO entries is itself a failure,
//     so a refactor that renames an array, a map, or a selector can never
//     make this gate pass vacuously
//
// The family cross-check stops at the picker fonts on purpose. A picker
// option carries its own stack, so the URL and the families it must serve sit
// side by side in one file. A design system's families live in
// design-system.css (--font-body/--font-display/--font-mono per
// :root[data-system="…"] block), and the DESIGN_SYSTEMS `tag` beside each id
// is picker copy, not a family list ("Modern · Geist Sans" for the Geist
// family, and Brutalist names one of its two faces) — checking ids is a claim
// this gate can make honestly; checking families off that copy is not.
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
// A stylesheet's families are read out of its `family=` parameters ("+" is a
// space, the axis spec after ":" is not part of the name) and matched against
// the families its stack NAMES, by that same identity. A URL that names no
// family at all is reported as unverifiable rather than waved through.
//
// Detector canaries run on every invocation: every parser, every normalizer,
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
// Escape hatch: systems intentionally painted by the BASE :root block
// ---------------------------------------------------------------------------
// Every offered design system owes a :root[data-system="…"] token block —
// that block IS the look. The one honest exception is a system whose tokens
// the bare :root block already carries, which would gain nothing from a block
// that restates them. Such a system must be named HERE, with a written
// reason, so the exemption is a decision on the record rather than a silent
// gap. The table is honest in every direction: an entry with no written
// reason is not an exemption at all, and an entry whose system has since
// grown its own block, or that names a system DESIGN_SYSTEMS no longer
// offers, FAILs as a stale pin so it can never outlive its reason.
const BASE_ROOT_PAINTED_SYSTEMS = new Map([
  [
    'editorial',
    `Editorial is the baseline, not an override: the bare ":root" block in ${CSS_REL} carries the Editorial token values verbatim (its own header says so), and both DEFAULT_SYSTEM and the pre-paint fallback resolve to it — a ":root[data-system=editorial]" block could only restate what already paints. Editorial's per-system COMPONENT skins do exist in that file, written as [data-system="editorial"] descendant rules.`,
  ],
]);

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

// One family NAME, as CSS matches them: quoting is optional, inner whitespace
// runs collapse, and case is ignored. 'IBM Plex Sans' ≡ IBM  plex  sans.
function normalizeFamilyName(raw) {
  return String(raw).replace(/["']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// The families a font-family stack actually NAMES, generics included — the
// list a downloaded webfont has to appear in to render anything.
function stackFamilies(stack) {
  const normalized = normalizeFontStack(stack);
  if (!normalized) return [];
  return normalized.split(',').map(normalizeFamilyName).filter(Boolean);
}

// The families a Google Fonts css2 URL DOWNLOADS: every `family=` parameter,
// with "+" read as a space and the axis spec after ":" dropped
// (family=Source+Sans+3:wght@400;700 → "Source Sans 3"). Returns [] when the
// href names no family at all — the caller treats that as unverifiable rather
// than as agreement.
function parseStylesheetFamilies(href) {
  const families = [];
  for (const m of String(href).matchAll(/[?&]family=([^&:]+)/g)) {
    const raw = m[1].replace(/\+/g, ' ');
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      /* a malformed % escape stays literal — it will simply fail to match */
    }
    const family = decoded.trim();
    if (family) families.push(family);
  }
  return families;
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

// :root[data-system="id"] { … } token blocks — the ~30 overrides that make a
// system look like itself. Anchored exactly like the accent parser, so only a
// bare attribute rule counts: the PER-SYSTEM COMPONENT SKINS further down the
// same stylesheet are written as `[data-system="…"] .card` descendant rules,
// which reshape individual components rather than carrying the system's
// tokens, and a `:root[data-system="…"] .card` rule is a skin too.
const SYSTEM_BLOCK_RE = /^[ \t]*:root\[data-system=["']([A-Za-z0-9_-]+)["']\]\s*\{([^}]*)\}/gm;

function parseCssSystems(cssSrc) {
  const src = stripComments(cssSrc);
  const out = new Map();
  for (const m of src.matchAll(SYSTEM_BLOCK_RE)) out.set(m[1], m[2]);
  return out;
}

// A token block earns its keep by DECLARING something. An empty block is a
// system that paints exactly like the default — the same defect as a missing
// block, wearing a selector.
function declaresCustomProperty(body) {
  return /(?:^|[\s;{])--[\w-]+\s*:/.test(String(body ?? ''));
}

// SYSTEM_DEFAULT_ACCENT: Record<string, string> in design-system.ts — a flat
// `systemId: 'accentId'` map, read with the shared object walker so quoted
// keys, bare keys, and a reformat all parse the same. A non-string value (a
// computed default, a nested object) is reported malformed rather than
// skipped: it is exactly the shape whose accent id cannot be verified.
function parseTsSystemDefaultAccents(tsSrc) {
  const m = /export\s+const\s+SYSTEM_DEFAULT_ACCENT\s*(?::[^=]*)?=\s*\{([\s\S]*?)\n\};/.exec(tsSrc);
  if (!m) return { accents: new Map(), malformed: [], found: false };
  const { entries, malformed } = parseObjectStringEntries(m[1]);
  return { accents: entries, malformed, found: true };
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

// A `Record<string, string>` map declared in a TS module, read by NAME:
// FONT_STYLESHEETS / SYSTEM_STYLESHEETS. Neither is exported (both are
// module-private, reached only through loadFontOverride() /
// loadDesignSystemFont()), so `export` is optional in the match.
function parseTsStringMap(src, name) {
  const m = new RegExp(`(?:export\\s+)?const\\s+${name}\\s*(?::[^=]*)?=\\s*\\{([\\s\\S]*?)\\n\\};`).exec(src);
  if (!m) return { entries: new Map(), malformed: [], found: false };
  const { entries, malformed } = parseObjectStringEntries(m[1]);
  return { entries, malformed, found: true };
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

// DESIGN_SYSTEMS vs the :root[data-system="…"] token blocks that paint them,
// with the documented "the bare :root already paints this one" escape hatch.
// Separate from compareIdSets() because this parity has an exemption table,
// and because the table itself has to be held to account.
function compareSystemPaint(systemIds, cssBlocks, baseRootPainted) {
  const offered = new Set(systemIds);
  const failures = [];

  // The escape hatch first: an entry only excuses a missing block while it is
  // honest about WHY, and about still being needed.
  for (const [id, reason] of baseRootPainted) {
    const written = String(reason ?? '').trim();
    if (!written) {
      failures.push({
        kind: 'base-root-exemption',
        id,
        message: `design system "${id}" is pinned in BASE_ROOT_PAINTED_SYSTEMS with no written reason — an exemption without a reason is silence with extra steps; write why the bare :root paints it or delete the entry`,
      });
    }
    if (cssBlocks.has(id)) {
      failures.push({
        kind: 'base-root-exemption',
        id,
        message: `design system "${id}" is pinned in BASE_ROOT_PAINTED_SYSTEMS as painted by the bare ":root" but now HAS its own :root[data-system="${id}"] block in ${CSS_REL} — drop the stale entry (reason was: ${written || '(none)'})`,
      });
    } else if (!offered.has(id)) {
      failures.push({
        kind: 'base-root-exemption',
        id,
        message: `design system "${id}" is pinned in BASE_ROOT_PAINTED_SYSTEMS but DESIGN_SYSTEMS in ${TS_REL} no longer offers it — drop the stale entry (reason was: ${written || '(none)'})`,
      });
    }
  }

  const exempt = new Set(
    [...baseRootPainted].filter(([, reason]) => String(reason ?? '').trim()).map(([id]) => id),
  );

  for (const id of [...new Set([...offered, ...cssBlocks.keys()])].sort()) {
    if (!cssBlocks.has(id)) {
      if (exempt.has(id)) continue; // documented above: the bare :root paints it
      failures.push({
        kind: 'system-paint',
        id,
        message: `design system "${id}" is offered by DESIGN_SYSTEMS in ${TS_REL} but has no :root[data-system="${id}"] block in ${CSS_REL} — the picker offers it and the attribute sticks, but the page paints exactly like the default. Add the token block, or — if the bare ":root" already paints it — add a reason-carrying entry to BASE_ROOT_PAINTED_SYSTEMS in this gate`,
      });
      continue;
    }
    if (!offered.has(id)) {
      failures.push({
        kind: 'system-paint',
        id,
        message: `${CSS_REL} has a :root[data-system="${id}"] token block but DESIGN_SYSTEMS in ${TS_REL} does not offer "${id}" — dead paint no picker choice can ever reach`,
      });
      continue;
    }
    if (!declaresCustomProperty(cssBlocks.get(id))) {
      failures.push({
        kind: 'system-paint',
        id,
        message: `design system "${id}" has a :root[data-system="${id}"] block in ${CSS_REL} that declares no custom property — an empty block paints exactly like the default`,
      });
    }
  }

  return failures;
}

// Every design system must name the accent it is meant to arrive with, and
// that accent must exist. Both directions matter and mean different things: a
// system with no entry silently keeps the previously active accent (or the
// global default), while an entry keyed by a system that no longer exists is a
// default nothing can ever apply — the next system added is the one that
// inherits the wrong look.
function compareSystemDefaultAccents(systemIds, defaults, accentIds) {
  const systems = new Set(systemIds);
  const accents = new Set(accentIds);
  const failures = [];
  for (const id of [...new Set([...systems, ...defaults.keys()])].sort()) {
    const accentId = defaults.get(id);
    if (accentId === undefined) {
      failures.push({
        kind: 'system-accent-parity',
        id,
        message: `design system "${id}" is in DESIGN_SYSTEMS in ${TS_REL} but has no SYSTEM_DEFAULT_ACCENT entry — switching to it keeps whatever accent is already active (or falls back to DEFAULT_ACCENT), so a first-time visitor never sees the accent the system was designed around`,
      });
      continue;
    }
    if (!systems.has(id)) {
      failures.push({
        kind: 'system-accent-parity',
        id,
        message: `SYSTEM_DEFAULT_ACCENT in ${TS_REL} maps design system "${id}" to accent "${accentId}", but "${id}" is not in DESIGN_SYSTEMS — a default no system can ever pick up`,
      });
      continue;
    }
    if (!accents.has(accentId)) {
      failures.push({
        kind: 'system-accent-value',
        id,
        message: `SYSTEM_DEFAULT_ACCENT in ${TS_REL} defaults design system "${id}" to accent "${accentId}", which is not one of the ACCENTS entries — it would be written to data-accent with no :root[data-accent="${accentId}"] block to paint it`,
      });
    }
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

// FONT_OPTIONS vs FONT_STYLESHEETS: an option has a webfont to download if
// and only if it declares a non-empty stack, and every family the download
// serves must be one the stack names.
//
// The "if and only if" is what makes "System default" exempt BY RULE: the
// exemption belongs to the empty stack, not to the id "system". Give that
// option a stack and it must carry a stylesheet; give any option a stylesheet
// without a stack and the download can never be applied.
function compareFontStylesheets(fontStacks, sheets) {
  const failures = [];
  for (const id of [...new Set([...fontStacks.keys(), ...sheets.keys()])].sort()) {
    const stack = fontStacks.get(id);
    const href = sheets.get(id);
    if (stack === undefined) {
      failures.push({
        kind: 'font-stylesheet',
        id,
        message: `FONT_STYLESHEETS in ${FONTS_REL} downloads a webfont for "${id}" but FONT_OPTIONS does not offer that id — nothing can ever select it`,
      });
      continue;
    }
    if (stack === '') {
      if (href !== undefined) {
        failures.push({
          kind: 'font-stylesheet',
          id,
          message: `font option "${id}" declares an empty stack (no override — the "System default" rule is stack "" ⇔ no webfont) yet FONT_STYLESHEETS in ${FONTS_REL} downloads ${href} for it — a font file no rule can ever apply`,
        });
      }
      continue; // exempt by rule: no stack to point at a face, so no face to fetch
    }
    if (href === undefined) {
      failures.push({
        kind: 'font-stylesheet',
        id,
        message: `font option "${id}" declares stack ${JSON.stringify(stack)} but has no FONT_STYLESHEETS entry in ${FONTS_REL} — selecting it points --font-body at a family the page never downloads, so the text silently keeps rendering in the fallback face and the setting looks like it did nothing`,
      });
      continue;
    }
    const families = parseStylesheetFamilies(href);
    if (!families.length) {
      failures.push({
        kind: 'font-stylesheet-family',
        id,
        message: `FONT_STYLESHEETS["${id}"] in ${FONTS_REL} names no family= parameter, so which face it downloads cannot be verified against the stack: ${href} — teach parseStylesheetFamilies() the new URL shape rather than leaving the entry unchecked`,
      });
      continue;
    }
    const named = new Set(stackFamilies(stack));
    for (const family of families) {
      if (!named.has(normalizeFamilyName(family))) {
        failures.push({
          kind: 'font-stylesheet-family',
          id,
          message: `font option "${id}" downloads "${family}" but its stack ${JSON.stringify(stack)} never names that family — the file arrives and nothing renders in it, so the option paints in a face it did not choose`,
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

  // Family identity + the two family readers.
  eq(normalizeFamilyName("'IBM Plex Sans'"), 'ibm plex sans', 'family name unquoted + lowercased');
  eq(normalizeFamilyName('IBM  Plex\n Sans'), 'ibm plex sans', 'family name whitespace runs collapsed');
  eq(
    stackFamilies("'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif"),
    ['source sans 3', 'source sans pro', 'system-ui', 'sans-serif'],
    'stack split into the families it names, generics included',
  );
  eq(stackFamilies(''), [], 'the empty "System default" stack names no family');
  eq(
    parseStylesheetFamilies('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'),
    ['Inter'],
    'family read, axis spec after ":" dropped',
  );
  eq(
    parseStylesheetFamilies('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;700&display=swap'),
    ['Source Sans 3'],
    '"+" read as a space',
  );
  eq(
    parseStylesheetFamilies(
      'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Instrument+Serif:ital@0;1&display=swap',
    ),
    ['Space Grotesk', 'Instrument Serif'],
    'every family= parameter of a multi-family URL is read',
  );
  eq(
    parseStylesheetFamilies('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,700&display=swap'),
    ['Fraunces'],
    'commas inside a variable-axis spec do not leak into the family name',
  );
  eq(parseStylesheetFamilies('/fonts/self-hosted.css'), [], 'a URL naming no family is reported as unverifiable, not as a match');
  eq(parseStylesheetFamilies('https://example.test/css2?family=Bad%ZZ'), ['Bad%ZZ'], 'a malformed % escape stays literal instead of throwing');

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

  // CSS per-system token-block parser.
  const cssSystemSample = [
    ':root { --bg: #000000; --accent: #ff3d52; }',
    ':root[data-system="terminal"] {',
    '  --bg: #000000; --radius: 0px;',
    '}',
    ":root[data-system='swiss'] { --bg: #000000; --radius: 4px; }",
    ':root[data-system="hollow"] {   }',
    '[data-system="editorial"] .display-h em { color: var(--accent); }',
    ':root[data-system="terminal"] .card { border-radius: 0; }',
    '/* :root[data-system="ghost"] { --bg: #111111; } */',
  ].join('\n');
  const parsedCssSystems = parseCssSystems(cssSystemSample);
  eq([...parsedCssSystems.keys()].sort(), ['hollow', 'swiss', 'terminal'], 'system token blocks parsed; component skins ignored');
  eq(parsedCssSystems.has('editorial'), false, 'a bare [data-system="…"] descendant skin is not a token block');
  eq(parsedCssSystems.has('ghost'), false, 'commented-out block is not live config');
  eq(declaresCustomProperty(parsedCssSystems.get('terminal')), true, 'multi-line block declares tokens');
  eq(declaresCustomProperty(parsedCssSystems.get('swiss')), true, 'minified single-quoted block declares tokens');
  eq(declaresCustomProperty(parsedCssSystems.get('hollow')), false, 'an empty block declares nothing');
  eq(declaresCustomProperty('color: var(--accent);'), false, 'a var() READ is not a token declaration');
  eq(parseCssSystems(':root { --bg: #000000; }').size, 0, 'a stylesheet with no system blocks is detectable, not an empty pass');

  // TS SYSTEM_DEFAULT_ACCENT parser (a flat systemId → accentId map).
  const tsSystemAccentSample = [
    'export const SYSTEM_DEFAULT_ACCENT: Record<string, string> = {',
    "  editorial: 'crimson',",
    '  \'terminal\': "matrix",',
    "  // ghost:     'violet',",
    '  brutalist: PICKED_LATER,',
    '};',
  ].join('\n');
  const parsedSystemAccents = parseTsSystemDefaultAccents(tsSystemAccentSample);
  eq(parsedSystemAccents.found, true, 'SYSTEM_DEFAULT_ACCENT map located');
  eq(
    [...parsedSystemAccents.accents],
    [['editorial', 'crimson'], ['terminal', 'matrix']],
    'bare and quoted keys parsed, comment ignored',
  );
  eq(parsedSystemAccents.malformed.length, 1, 'non-string default is reported, never silently dropped');
  eq(
    parseTsSystemDefaultAccents('const OTHER = {\n};').found,
    false,
    'renamed/absent SYSTEM_DEFAULT_ACCENT map is detectable, not an empty pass',
  );

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

  // TS stylesheet-map parser (module-private `const`, quoted + bare keys).
  const tsSheetSample = [
    'const FONT_STYLESHEETS: Record<string, string> = {',
    '  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap",',
    '  "dm-sans": "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap",',
    '  // ghost: "https://fonts.googleapis.com/css2?family=Ghost&display=swap",',
    '  broken: SOME_CONST,',
    '};',
  ].join('\n');
  const parsedSheets = parseTsStringMap(tsSheetSample, 'FONT_STYLESHEETS');
  eq(parsedSheets.found, true, 'module-private FONT_STYLESHEETS map located without an `export`');
  eq([...parsedSheets.entries.keys()], ['inter', 'dm-sans'], 'quoted + bare keys parsed, comment ignored');
  eq(
    parsedSheets.entries.get('inter'),
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap',
    'the "//" in an https URL is never mistaken for a line comment',
  );
  eq(parsedSheets.malformed.length, 1, 'a non-string value is reported, never silently dropped');
  eq(parseTsStringMap(tsSheetSample, 'SYSTEM_STYLESHEETS').found, false, 'renamed/absent stylesheet map is detectable, not an empty pass');

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

  // Comparator — per-system paint, and the escape hatch that excuses one.
  const paintedIds = ['editorial', 'terminal', 'swiss'];
  const paintBlocks = new Map([
    ['terminal', '--bg: #000000; --radius: 0px;'],
    ['swiss', '--bg: #000000; --radius: 4px;'],
  ]);
  const baseRootExempt = new Map([['editorial', 'the bare :root carries the Editorial tokens verbatim']]);
  eq(compareSystemPaint(paintedIds, paintBlocks, baseRootExempt), [], 'a documented base-:root system passes without its own block');
  eq(
    compareSystemPaint(paintedIds, paintBlocks, new Map()).map((f) => [f.kind, f.id]),
    [['system-paint', 'editorial']],
    'an undocumented system with no token block is caught — silence is not an exemption',
  );
  eq(
    compareSystemPaint([...paintedIds, 'ghost'], paintBlocks, baseRootExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'ghost']],
    'a system added to DESIGN_SYSTEMS without a token block is caught',
  );
  eq(
    compareSystemPaint(paintedIds, new Map([...paintBlocks, ['ghost', '--bg: #111111;']]), baseRootExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'ghost']],
    'a token block for a system the picker never offers is caught',
  );
  eq(
    compareSystemPaint(paintedIds, new Map([...paintBlocks, ['swiss', '  ']]), baseRootExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'swiss']],
    'a block that declares nothing is caught, not counted as paint',
  );
  eq(
    compareSystemPaint(paintedIds, new Map([...paintBlocks, ['editorial', '--bg: #000000;']]), baseRootExempt).map((f) => [f.kind, f.id]),
    [['base-root-exemption', 'editorial']],
    'an exemption whose system grew its own block is a stale pin',
  );
  eq(
    compareSystemPaint(['terminal', 'swiss'], paintBlocks, baseRootExempt).map((f) => [f.kind, f.id]),
    [['base-root-exemption', 'editorial']],
    'an exemption naming a system DESIGN_SYSTEMS dropped is a stale pin',
  );
  eq(
    compareSystemPaint(paintedIds, paintBlocks, new Map([['editorial', '   ']])).map((f) => [f.kind, f.id]),
    [
      ['base-root-exemption', 'editorial'],
      ['system-paint', 'editorial'],
    ],
    'a reason-less entry is reported AND excuses nothing',
  );

  // Comparator — per-system default accents.
  const someSystems = ['editorial', 'terminal'];
  const someAccents = ['crimson', 'matrix'];
  const goodDefaults = new Map([
    ['editorial', 'crimson'],
    ['terminal', 'matrix'],
  ]);
  eq(compareSystemDefaultAccents(someSystems, goodDefaults, someAccents), [], 'every system defaulting to a real accent passes');
  const unmappedSystem = compareSystemDefaultAccents([...someSystems, 'swiss'], goodDefaults, someAccents);
  eq(unmappedSystem.map((f) => [f.kind, f.id]), [['system-accent-parity', 'swiss']], 'system with no per-system default accent caught');
  eq(/no SYSTEM_DEFAULT_ACCENT entry/.test(unmappedSystem[0].message), true, 'the unmapped-system message names the missing entry');
  const orphanDefault = compareSystemDefaultAccents(someSystems, new Map([...goodDefaults, ['ghost', 'crimson']]), someAccents);
  eq(orphanDefault.map((f) => [f.kind, f.id]), [['system-accent-parity', 'ghost']], 'default keyed by a system that no longer exists caught');
  eq(/not in DESIGN_SYSTEMS/.test(orphanDefault[0].message), true, 'the orphan-entry message names the other side of the drift');
  eq(
    compareSystemDefaultAccents(someSystems, new Map([...goodDefaults, ['terminal', 'ghostgreen']]), someAccents).map((f) => [f.kind, f.id]),
    [['system-accent-value', 'terminal']],
    'default naming an accent that is not in ACCENTS caught',
  );
  eq(
    compareSystemDefaultAccents(someSystems, new Map([...goodDefaults, ['terminal', '']]), someAccents).map((f) => [f.kind, f.id]),
    [['system-accent-value', 'terminal']],
    'an emptied default is an unknown accent, not a skip',
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

  // Comparator — font stylesheets (the map that downloads the faces).
  const stackedFonts = new Map([
    ['system', ''],
    ['inter', "'Inter', system-ui, sans-serif"],
    ['ibm-plex', "'IBM Plex Sans', system-ui, sans-serif"],
  ]);
  const goodSheets = new Map([
    ['inter', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'],
    ['ibm-plex', 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700&display=swap'],
  ]);
  eq(compareFontStylesheets(stackedFonts, goodSheets), [], 'every stacked option downloads the family it names');
  eq(
    compareFontStylesheets(new Map([['system', '']]), new Map()),
    [],
    'the empty-stack option needs no webfont — the exemption is the empty stack itself',
  );
  const noSheet = compareFontStylesheets(stackedFonts, new Map([['inter', goodSheets.get('inter')]]));
  eq(noSheet.map((f) => [f.kind, f.id]), [['font-stylesheet', 'ibm-plex']], 'a stacked option with no stylesheet caught');
  const sheetOnly = compareFontStylesheets(
    stackedFonts,
    new Map([...goodSheets, ['ghost', 'https://fonts.googleapis.com/css2?family=Ghost&display=swap']]),
  );
  eq(sheetOnly.map((f) => [f.kind, f.id]), [['font-stylesheet', 'ghost']], 'a stylesheet for an id the picker never offers caught');
  const sheetForSystem = compareFontStylesheets(
    stackedFonts,
    new Map([...goodSheets, ['system', 'https://fonts.googleapis.com/css2?family=Inter&display=swap']]),
  );
  eq(
    sheetForSystem.map((f) => [f.kind, f.id]),
    [['font-stylesheet', 'system']],
    'the exemption is a rule in BOTH directions — an empty-stack option must not download a face either',
  );
  const wrongFamily = compareFontStylesheets(
    stackedFonts,
    new Map([...goodSheets, ['ibm-plex', 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap']]),
  );
  eq(
    wrongFamily.map((f) => [f.kind, f.id]),
    [['font-stylesheet-family', 'ibm-plex']],
    'a stylesheet downloading a family the stack does not name caught — the silent wrong-typeface bug',
  );
  eq(
    compareFontStylesheets(
      new Map([['inter', "'Inter', system-ui, sans-serif"]]),
      new Map([['inter', 'https://fonts.googleapis.com/css2?family=Inter&family=Ghost&display=swap']]),
    ).map((f) => [f.kind, f.id]),
    [['font-stylesheet-family', 'inter']],
    'ONE unnamed family in a multi-family URL is enough to fail',
  );
  eq(
    compareFontStylesheets(new Map([['inter', "'inter', system-ui"]]), new Map([['inter', '?family=INTER']])).length,
    0,
    'family matching is case- and quote-insensitive, as CSS is',
  );
  eq(
    compareFontStylesheets(stackedFonts, new Map([...goodSheets, ['inter', '/fonts/inter.css']])).map((f) => [f.kind, f.id]),
    [['font-stylesheet-family', 'inter']],
    'a stylesheet whose family cannot be read fails loudly instead of being waved through',
  );
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
runCanaries();
console.log('PASS canaries :: every parser, every normalizer, and every comparator verified against known-good/known-bad samples');

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
const cssSystems = parseCssSystems(cssSrc);

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

// …and the paint itself: an id both lists agree on still has no LOOK until
// the stylesheet carries its token block (or the bare :root demonstrably
// already paints it, which BASE_ROOT_PAINTED_SYSTEMS must say out loud).
if (!cssSystems.size) {
  fail('parser-rot', `parsed ZERO :root[data-system="…"] token blocks out of ${CSS_REL}`);
} else if (tsSystems.ids.length) {
  failures.push(...compareSystemPaint(tsSystems.ids, cssSystems, BASE_ROOT_PAINTED_SYSTEMS));
}

// ---------------------------------------------------------------------------
// Per-system default accents: SYSTEM_DEFAULT_ACCENT must name every design
// system exactly once, and every accent it names must be a real ACCENTS id.
// ---------------------------------------------------------------------------
const tsSystemDefaultAccents = parseTsSystemDefaultAccents(tsSrc);

if (!tsSystemDefaultAccents.found) {
  fail('parser-rot', `could not locate "export const SYSTEM_DEFAULT_ACCENT … = { … };" in ${TS_REL}`);
} else if (!tsSystemDefaultAccents.accents.size) {
  fail('parser-rot', `parsed ZERO entries out of SYSTEM_DEFAULT_ACCENT in ${TS_REL}`);
}
for (const part of tsSystemDefaultAccents.malformed) {
  fail('parser-rot', `SYSTEM_DEFAULT_ACCENT entry in ${TS_REL} is not a "systemId: 'accentId'" pair: ${part}`);
}
if (tsSystems.ids.length && tsAccents.size && tsSystemDefaultAccents.accents.size) {
  failures.push(...compareSystemDefaultAccents(tsSystems.ids, tsSystemDefaultAccents.accents, [...tsAccents.keys()]));
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

// ---------------------------------------------------------------------------
// Stylesheets: the maps that actually FETCH the faces the stacks above name.
// A correct stack with no download is invisible — the picker reports the new
// setting, the page keeps rendering in the fallback face.
// ---------------------------------------------------------------------------
const fontSheets = parseTsStringMap(fontsSrc, 'FONT_STYLESHEETS');
const systemSheets = parseTsStringMap(fontsSrc, 'SYSTEM_STYLESHEETS');

if (!fontSheets.found) fail('parser-rot', `could not locate "const FONT_STYLESHEETS … = { … };" in ${FONTS_REL}`);
if (fontSheets.found && !fontSheets.entries.size) {
  fail('parser-rot', `parsed ZERO entries out of FONT_STYLESHEETS in ${FONTS_REL}`);
}
for (const part of fontSheets.malformed) {
  fail('parser-rot', `FONT_STYLESHEETS entry in ${FONTS_REL} is not an "id: 'href'" pair: ${part}`);
}
if (tsFonts.fonts.size && fontSheets.entries.size) {
  failures.push(...compareFontStylesheets(tsFonts.fonts, fontSheets.entries));
}

if (!systemSheets.found) fail('parser-rot', `could not locate "const SYSTEM_STYLESHEETS … = { … };" in ${FONTS_REL}`);
if (systemSheets.found && !systemSheets.entries.size) {
  fail('parser-rot', `parsed ZERO entries out of SYSTEM_STYLESHEETS in ${FONTS_REL}`);
}
for (const part of systemSheets.malformed) {
  fail('parser-rot', `SYSTEM_STYLESHEETS entry in ${FONTS_REL} is not an "id: 'href'" pair: ${part}`);
}
if (tsSystems.ids.length && systemSheets.entries.size) {
  failures.push(
    ...compareIdSets(
      'system-stylesheet',
      [...systemSheets.entries.keys()],
      tsSystems.ids,
      (id) => `SYSTEM_STYLESHEETS in ${FONTS_REL} downloads a display font for "${id}" but DESIGN_SYSTEMS in ${TS_REL} does not offer that system — nothing can ever select it`,
      (id) => `design system "${id}" is offered by DESIGN_SYSTEMS in ${TS_REL} but has no SYSTEM_STYLESHEETS entry in ${FONTS_REL} — ${CSS_REL} still NAMES its display family, so choosing it downloads nothing and silently paints in that declaration's fallback face`,
    ),
  );
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f.kind} :: ${f.message}`);
  console.error(`\n${failures.length} theme-drift failure(s).`);
  console.error(`       The picker swatches (${TS_REL}), the paint (${CSS_REL}),`);
  console.error(`       and the font stacks (${FONTS_REL}) are hand-copied mirrors of one theme`);
  console.error('       registry — fix ALL affected sides together, and keep the pre-paint');
  console.error(`       SYSTEMS / ACCENTS / FONT_STACKS lists in ${HTML_REL} in step.`);
  console.error('       A stack is only half of a webfont: the FONT_STYLESHEETS /');
  console.error(`       SYSTEM_STYLESHEETS maps in ${FONTS_REL} are what fetch the face,`);
  console.error('       so a stylesheet fix has to land with every stack fix.');
  process.exit(1);
}

console.log(`PASS id-parity :: ${tsAccents.size} accent(s) present in ACCENTS, :root[data-accent] blocks, and the pre-paint allowlist`);
for (const [id, v] of tsAccents) console.log(`       ${id.padEnd(8)} ${v.primary} / ${v.secondary}`);
console.log(`PASS root-default :: :root paints DEFAULT_ACCENT "${defaultAccentId}" (${rootDefault.primary} / ${rootDefault.secondary})`);
console.log(
  `PASS system-parity :: ${tsSystems.ids.length} system(s) present in DESIGN_SYSTEMS and the pre-paint SYSTEMS allowlist — ${tsSystems.ids.join(', ')} (fallback "${defaultSystemId}")`,
);
console.log(
  `PASS system-paint :: ${cssSystems.size} :root[data-system="…"] token block(s) — ${[...cssSystems.keys()].join(', ')}; painted by the bare :root instead: ${[...BASE_ROOT_PAINTED_SYSTEMS.keys()].join(', ') || '(none)'}`,
);
console.log(
  `PASS system-accent :: every design system names a default accent that exists — ${[...tsSystemDefaultAccents.accents]
    .map(([system, accent]) => `${system}→${accent}`)
    .join(', ')}`,
);
console.log(`PASS font-parity :: ${tsFonts.fonts.size} font option(s) present in FONT_OPTIONS and the pre-paint FONT_STACKS map with identical stacks (fallback "${runtimeFontFallback}")`);
for (const [id, stack] of tsFonts.fonts) console.log(`       ${id.padEnd(12)} ${stack === '' ? '(system default — no override)' : stack}`);
const webfontOptions = [...tsFonts.fonts].filter(([, stack]) => stack !== '');
console.log(
  `PASS font-stylesheet :: ${webfontOptions.length} option(s) with a stack each download exactly the family they name; ${tsFonts.fonts.size - webfontOptions.length} with no stack download nothing (exempt by rule)`,
);
for (const id of tsFonts.fonts.keys()) {
  const href = fontSheets.entries.get(id);
  console.log(`       ${id.padEnd(12)} ${href ? parseStylesheetFamilies(href).join(' + ') : '(no webfont — empty stack)'}`);
}
console.log(
  `PASS system-stylesheet :: ${systemSheets.entries.size} display font(s) fetched, one per DESIGN_SYSTEMS id — ${[...systemSheets.entries.keys()].join(', ')}`,
);
console.log('\nPASS accent-drift :: picker swatches, painted accent tokens, the pre-paint system/font lists, and the stylesheets that fetch those faces all agree');
