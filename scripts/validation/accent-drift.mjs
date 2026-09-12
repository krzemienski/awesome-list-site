#!/usr/bin/env node
// Theme drift gate (tasks #377, #388, #399, #429, parity W1 fonts).
//
// The inline boot script in client/index.html paints the theme BEFORE React
// loads. Vite replaces markers with boot data derived from the runtime sources,
// so system/accent/font ids and fallbacks are generated instead of copied into
// HTML. This gate verifies those generation contracts plus the remaining
// stylesheet/font mirrors.
//
// Sources compared (every one is a hand-maintained copy of ONE registry, and
// every pair below has silently drifted-by-omission before):
//   1 · design-system.ts   ACCENTS[]                 → id + primary + secondary
//   2 · design-system.css  :root[data-accent="…"]    → --accent + --accent-2
//   3 · design-system.css  :root                     → the pre-attribute
//        default pair, which the CSS itself documents as Crimson's values
//        (i.e. DEFAULT_ACCENT's) and which paints before any data-accent
//        attribute exists
//   4 · design-system.ts   THEME_FALLBACK_REGISTRY is the source for
//        ACCENTS / DESIGN_SYSTEMS / SYSTEM_DEFAULT_ACCENT / DEFAULT_* and the
//        generated THEME_BOOT_DATA consumed by client/index.html
//   5 · client/index.html  the pre-paint script keeps exactly one Vite marker
//        and reads ids/fallbacks only from the injected THEME_BOOT object
//   6 · design-system.css  :root[data-system="…"] token blocks  ↔
//        DESIGN_SYSTEMS — agreeing on an id is not the same as having a
//        LOOK. The block IS the treatment, so a system the picker offers
//        and the boot script accepts but the stylesheet never paints sticks
//        on <html> and renders exactly like the default: a theme that "does
//        nothing" rather than one that "won't stick". The custom properties
//        the established peer blocks agree on are also a contract: a block
//        that declares only a small subset is still a half-finished look.
//   7 · design-system.css  component skin selectors containing
//        [data-system="…"]  ↔  DESIGN_SYSTEMS — a skin for a retired system
//        is dead CSS that can never match, and would otherwise survive after
//        the system's token block is removed
//   8 · font-options.ts    FONT_OPTIONS (id + stack; its own header calls
//        itself the source of truth)  ↔  FONT_BOOT_DATA generated from it +
//        the id it falls back to, which must be the option
//        applyFontOverride() falls back to at runtime (FONT_OPTIONS[0])
//   9 · design-system.ts   SYSTEM_DEFAULT_ACCENT  ↔  DESIGN_SYSTEMS + ACCENTS.
//        A third hand-maintained list keyed by system id: it is the accent a
//        system is meant to arrive with. applyDesignSystem() and the theme
//        provider both read it as `SYSTEM_DEFAULT_ACCENT[id] || DEFAULT_ACCENT`,
//        so a system with no entry quietly keeps whatever accent happens to be
//        active (or falls back to the global default) instead of its own look,
//        and an entry naming an accent that is not in ACCENTS sets a
//        data-accent no :root[data-accent="…"] block paints
//  10 · font-options.ts    FONT_STYLESHEETS — the map that actually DOWNLOADS
//        the picker's webfonts  ↔  FONT_OPTIONS. A stack is only half of a
//        webfont: an option whose stack is right but whose stylesheet entry
//        is missing (or which downloads a family the stack never names)
//        renders in the fallback face — the setting looks applied and the
//        page looks unchanged, which is harder to spot than an outright reset
//  11 · client/index.html  the ONE always-on font <link rel="stylesheet">  ↔
//        awesome-list-site-ds/index.html, the frozen design source's single
//        Google Fonts css2 request (parity W1). Pixel parity needs both
//        documents to declare the same @font-face set — same families,
//        weights, styles and AXES — because a different axis subset (Fraunces
//        requested with `opsz`, Inter without 800) shapes different glyph
//        outlines and metrics, so headings drift by pixels everywhere. The
//        shell href must be byte-identical to the design's after entity
//        decoding, and there must be exactly one: a second request is a
//        second owner of the font set. That one request carries every family
//        all five systems name, so there is no per-system stylesheet map any
//        more — switching systems is attribute-only
//  12 · design-system.css  the --font-display / --font-body / --font-mono a
//        system declares (:root[data-system="…"], falling back to :root for
//        the default system)  ↔  the only loader that runs for that system:
//        the always-on <link rel="stylesheet"> in the HTML shell. This is #9
//        one level deeper and it is how the mono face went missing (#411):
//        every system NAMED a mono family, the (then per-system) stylesheets
//        fetched only each system's display/body face, and .mono/.kbd/
//        .textarea/eyebrows in four of the five systems quietly rendered in
//        the browser's ui-monospace. FONT_STYLESHEETS is deliberately NOT
//        counted as a loader here — it fires only when a visitor picks that
//        option in the picker, so it can never be what makes a system's own
//        face arrive. Because the shell request is the design's, a family a
//        system names that the shell lacks is a TOKEN drifting from the
//        design, never a reason to widen the URL
//  13 · client/src/**      no TS/TSX file other than font-options.ts may carry
//        a Google Fonts css2 request — the shell owns the base set and the
//        picker map owns overrides; anything else is a request nothing probes
//  14 · server/index.ts    both Content-Security-Policy header blocks. Every
//        font stylesheet host above must be allowed by style-src, both CSP
//        copies must agree, and the live response's font-file hosts must be
//        allowed by font-src or the browser blocks a download this gate just
//        proved exists
//
// Checks (each FAILs with the id and both sides' literal values):
//   · id-parity      — an accent id present in only one of the accent sources
//   · swatch-value   — primary ≠ --accent, or secondary ≠ --accent-2
//   · root-default   — :root's --accent/--accent-2 ≠ DEFAULT_ACCENT's pair
//   · boot-registry  — a derived runtime export or THEME_BOOT_DATA disagrees
//     with THEME_FALLBACK_REGISTRY
//   · boot-generation — client/index.html lost either Vite marker, regained a
//     hand-copied list/fallback, or no longer consumes injected fields
//   · system-fallback— DEFAULT_SYSTEM is not one of DESIGN_SYSTEMS
//   · system-paint   — a DESIGN_SYSTEMS id with no :root[data-system="…"]
//     token block, a block whose id the picker never offers (dead paint),
//     or a block that declares no custom property at all (an empty block
//     paints like the default just as surely as a missing one)
//   · system-skin    — a component skin selector in design-system.css names a
//     system DESIGN_SYSTEMS does not offer
//   · base-root-exemption — the "painted by the bare :root" escape hatch
//     below went stale: an entry carrying no written reason, an entry whose
//     system has since grown its own token block, or one naming a system
//     DESIGN_SYSTEMS no longer offers
//   · system-token-contract — a system block is missing one or more custom
//     properties its established peers agree on; every missing token is named
//   · minimal-system-exemption — the reason-carrying escape hatch for an
//     intentionally small token set has no reason, names an unoffered system,
//     or stayed pinned after the block grew to satisfy the shared contract
//   · system-accent-parity — a DESIGN_SYSTEMS id with no SYSTEM_DEFAULT_ACCENT
//     entry, or an entry keyed by a system that no longer exists
//   · system-accent-value  — a SYSTEM_DEFAULT_ACCENT entry naming an accent id
//     that is not in ACCENTS
//   · system-default-accent — SYSTEM_DEFAULT_ACCENT[DEFAULT_SYSTEM] ≠
//     DEFAULT_ACCENT, so the default system's intended accent never reaches a
//     first-time visitor
//   · font-boot-registry — FONT_BOOT_DATA is missing or does not exactly
//     derive its ids/stacks/fallback from FONT_OPTIONS
//   · font-stylesheet— an option with a non-empty stack has no
//     FONT_STYLESHEETS entry, an entry exists for an id FONT_OPTIONS does not
//     offer, or an entry exists for an option with NO stack. "System default"
//     needs no webfont BY RULE — stack "" ⇔ no stylesheet entry, checked in
//     BOTH directions, so the exemption is the empty stack itself and can
//     never quietly widen to cover an option that does declare a stack
//   · font-stylesheet-family — the stylesheet an option downloads names a
//     family its stack does not, so the file arrives and nothing renders in
//     it (the same invisible fallback-face bug as a missing entry)
//   · canonical-font-request — the HTML shell carries more or fewer than one
//     always-on font-provider <link>, or its href is not byte-identical to
//     the design source's (the message names the family whose axes differ,
//     the family one side lacks, or the non-family parameter that changed)
//   · system-font-coverage — a family a system's --font-display/--font-body/
//     --font-mono NAMES that the always-on request does not carry, so that
//     surface paints in the declaration's fallback face
//   · system-font-weight — (optional inventory from the browser gate) a weight
//     a system's surfaces use that the always-on request does not ask for
//   · system-font-token — a system resolves a --font-* token to nothing, or
//     to a value naming no family: `font-family: var(--font-mono)` then
//     computes to nothing at all
//   · font-source-coverage — a Google Fonts stylesheet URL in a client CSS
//     @import or an HTML entry point's stylesheet link is not one of the
//     FONT_STYLESHEETS / client/index.html sources the offline and live
//     probes read, or a TS/TSX file other than font-options.ts carries one
//   · csp-parity / stylesheet-csp — the two server CSP blocks disagree, or a
//     FONT_STYLESHEETS / pre-paint stylesheet URL is not allowed by style-src
//     and therefore cannot reach the browser
//   · system-id-resolution — a stored `ds-system` value is validated with a
//     prototype-chain test ("toString" in DESIGN_SYSTEMS, DESIGN_SYSTEMS[id]
//     ? …) instead of the shared own-property resolver, so junk resolves as
//     itself while the page paints the default: the app then believes a
//     system is selected that nothing paints. The real resolver is EXECUTED
//     against inherited keys here, not just pattern-matched
//   · parser rot     — ANY parser finding ZERO entries is itself a failure,
//     so a refactor that renames an array, a map, or a selector can never
//     make this gate pass vacuously
//   · webfont-http / webfont-empty / webfont-served-family  — OPT-IN, only
//     under --network: a stylesheet URL that does not answer 200, answers
//     200 with no @font-face at all, or answers 200 without declaring one of
//     the families its own URL asks for (see the probe section below)
//   · font-csp — OPT-IN, only under --network: an @font-face src: url(...)
//     points at a host the server's font-src policy does not allow
//
// For a design system the families are read from the CSS, never from the
// DESIGN_SYSTEMS `tag` beside each id: that tag is picker copy, not a family
// list ("Modern · Geist Sans" for the Geist family, and Brutalist names one
// of its two faces). The authoritative list is the --font-display /
// --font-body / --font-mono a system declares in its :root[data-system="…"]
// block, falling back token-by-token to :root exactly as the cascade does —
// which is also why the default system (no attribute block of its own) is
// checked against :root. A token's FIRST family is the face the design asks
// for and must be downloaded; the rest of the chain is by definition what it
// falls back to, so a generic keyword or an installed face there is fine. A
// token whose first family IS a generic (ui-monospace, system-ui) asks for a
// face the browser already has and needs no loader — that exemption belongs
// to the generic keyword, not to any token or system id.
//
// ---------------------------------------------------------------------------
// The live webfont probe (task #412) — OPT-IN, network, NOT part of the gate
// ---------------------------------------------------------------------------
// Every check above compares one file in this repo against another, so a
// family misspelled on BOTH sides agrees with itself and passes: stack
// "'Gesit', sans-serif" + family=Gesit is internally consistent, and Google
// Fonts answers 400 to it while the face never arrives. Only the live
// response can settle whether a URL serves the typeface it claims:
//
//   node scripts/validation/accent-drift.mjs --network   (npm run validate:webfont-fetch)
//
// fetches every FONT_STYLESHEETS entry and every <link rel="stylesheet"> in
// client/index.html (the canonical request), and requires each to
// answer HTTP 200 *and* declare an @font-face font-family for EVERY family
// its own URL asks for. Every font file URL in those @font-face blocks must
// also be allowed by the font-src parsed from both server CSP blocks. A 200
// that quietly serves nothing (an error page, an empty body, the wrong family,
// or a browser-blocked font host) is a failure, not a pass.
//
// It is deliberately NOT registered as a validation command and NOT reached
// by the default run: the `accent-drift` gate runs this file with no
// arguments and stays offline, so a Google Fonts outage, an egress proxy, or
// an air-gapped checkout can never fail an unrelated change. Run it by hand
// after editing any font URL — the offline run prints a reminder saying so.
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
// the families its stack NAMES, by that same identity. The same parameters
// carry the requested `wght` values: discrete values are individual faces and
// `min..max` values are variable ranges. A URL that names no family at all is
// reported as unverifiable rather than waved through.
//
// Detector canaries run on every invocation: every parser, every normalizer,
// and every comparator are asserted against synthetic known-good and
// known-bad samples first, so a parser regression can never pass vacuously
// either.
//
// Usage: node scripts/validation/accent-drift.mjs             — offline gate (what the
//                                                               registered `accent-drift`
//                                                               validation command runs)
//        node scripts/validation/accent-drift.mjs --network    — offline gate + the live
//                                                               webfont probe (opt-in;
//                                                               reaches fonts.googleapis.com)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import esbuild from 'esbuild';
import {
  MINIMAL_TOKEN_SYSTEMS,
  declaresCustomProperty,
  findStaleMinimalTokenSystems,
  findMissingSystemTokens,
  formatMissingSystemTokensMessage,
  parseCssCustomProperties,
  parseCssSystemBlocks,
  sharedSystemTokens,
  validateMinimalTokenSystems,
} from './design-system-token-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TS_REL = 'client/src/lib/design-system.ts';
const CSS_REL = 'client/src/styles/design-system.css';
const HTML_REL = 'client/index.html';
const FONTS_REL = 'client/src/lib/font-options.ts';
const SERVER_REL = 'server/index.ts';
const VITE_REL = 'vite.config.ts';

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
// Escape hatch: systems intentionally using a deliberately minimal token set
// ---------------------------------------------------------------------------
// A system may intentionally share most of the default look, but that choice
// must be recorded in the shared MINIMAL_TOKEN_SYSTEMS table imported above,
// with the same discipline as BASE_ROOT_PAINTED_SYSTEMS. The reasoned entry
// excuses only the shared-token contract below; it never excuses a
// missing/empty block, an unoffered id, or a stale pin.
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

// The source scan is intentionally limited to stylesheet URLs served by the
// provider whose responses this gate can understand. Font files from
// fonts.gstatic.com are response URLs, not source stylesheet URLs, and are
// checked by the opt-in probe's font-src validation instead.
const FONT_PROVIDER_HOSTS = new Set(['fonts.googleapis.com']);

function normalizeSourceUrl(raw) {
  return String(raw).trim().replace(/&amp;/gi, '&');
}

function isFontProviderUrl(raw) {
  const value = normalizeSourceUrl(raw);
  try {
    return FONT_PROVIDER_HOSTS.has(new URL(value, 'https://font-source-self.invalid').hostname.toLowerCase());
  } catch {
    return false;
  }
}

// The families a Google Fonts css2 URL DOWNLOADS: every `family=` parameter,
// with "+" read as a space and the axis spec after ":" dropped
// (family=Source+Sans+3:wght@400;700 → "Source Sans 3"). Returns [] when the
// href names no family at all — the caller treats that as unverifiable rather
// than as agreement.
function parseStylesheetFamilies(href) {
  return [...parseStylesheetFontEntries(href).values()].map((entry) => entry.family);
}

function decodeStylesheetPart(raw) {
  const value = String(raw).replace(/\+/g, ' ');
  try {
    return decodeURIComponent(value);
  } catch {
    /* a malformed % escape stays literal — it will simply fail to match */
    return value;
  }
}

// Google Fonts css2 `family=` parameters, preserving the weight coverage
// needed by the runtime paint gate. A family with no `wght` axis is a static
// 400 face (for example Instrument Serif's `ital@0;1` request). Ranges are
// inclusive, so variable `400..700` covers every meaningful integer weight
// between those bounds without pretending it is a finite static list.
function parseStylesheetFontEntries(href) {
  const entries = new Map();
  for (const m of String(href).matchAll(/[?&]family=([^&]+)/g)) {
    const parameter = decodeStylesheetPart(m[1]);
    const separator = parameter.indexOf(':');
    const family = (separator < 0 ? parameter : parameter.slice(0, separator)).trim();
    if (!family) continue;

    const ranges = [];
    const axisSpec = separator < 0 ? '' : parameter.slice(separator + 1);
    const at = axisSpec.indexOf('@');
    const axes = at < 0 ? [] : axisSpec.slice(0, at).split(',').map((axis) => axis.trim());
    const weightAxis = axes.indexOf('wght');
    const values = at < 0 ? [] : axisSpec.slice(at + 1).split(';');
    if (weightAxis < 0 || !values.length) {
      ranges.push({ min: 400, max: 400 });
    } else {
      for (const value of values) {
        const weight = value.split(',')[weightAxis]?.trim();
        const range = /^(\d+(?:\.\d+)?)\.\.(\d+(?:\.\d+)?)$/.exec(weight ?? '');
        const single = /^(\d+(?:\.\d+)?)$/.exec(weight ?? '');
        if (range) {
          const min = Number(range[1]);
          const max = Number(range[2]);
          if (Number.isFinite(min) && Number.isFinite(max) && min <= max) ranges.push({ min, max });
        } else if (single) {
          const number = Number(single[1]);
          if (Number.isFinite(number)) ranges.push({ min: number, max: number });
        }
      }
      if (!ranges.length) ranges.push({ min: 400, max: 400 });
    }

    const key = normalizeFamilyName(family);
    const previous = entries.get(key);
    entries.set(key, {
      family,
      ranges: [...(previous?.ranges ?? []), ...ranges],
    });
  }
  return entries;
}

function stylesheetFamilyCoversWeight(entries, family, weight) {
  const entry = entries.get(normalizeFamilyName(family));
  return Boolean(entry?.ranges.some(({ min, max }) => weight >= min && weight <= max));
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------
// Strip // line comments and /* block */ comments so a commented-out accent
// entry (or a commented-out CSS block) is never read as live configuration.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// Like stripComments(), but retain line breaks so diagnostics can point to the
// source line of a component skin. CSS comments are replaced with spaces rather
// than deleted; a commented-out selector can never become a live match.
function stripCommentsPreservingLines(src) {
  return String(src)
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (comment, prefix) => prefix + ' '.repeat(comment.length - prefix.length));
}

// Object-literal walkers used by the remaining source maps. Entries are read
// structurally rather than by indentation so a reformat cannot change the
// parse, and so nested objects or commas inside quoted strings are never
// mistaken for entry boundaries.
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

// The three font tokens every surface reads through: `font-family:
// var(--font-mono)` and friends. A system declares them in its own block, or
// inherits :root's — per token, exactly as the cascade resolves them.
const FONT_TOKENS = ['--font-display', '--font-body', '--font-mono'];

// CSS-wide generic family keywords. A token whose FIRST family is one of
// these asks for a face the browser already has, so no loader is owed.
const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
  'math', 'emoji', 'fangsong',
  'inherit', 'initial', 'revert', 'revert-layer', 'unset',
]);

function parseCssFontTokens(body) {
  const out = new Map();
  for (const token of FONT_TOKENS) {
    const value = cssVar(body, token);
    if (value !== null) out.set(token, value);
  }
  return out;
}

// :root's own font tokens — the base every system inherits from, and the full
// set for the default system, which has no attribute block of its own.
function parseCssRootFonts(cssSrc) {
  const src = stripComments(cssSrc);
  const m = /^[ \t]*:root\s*\{([^}]*)\}/m.exec(src);
  if (!m) return null;
  return parseCssFontTokens(m[1]);
}

// ACCENTS: Accent[] in design-system.ts. Fields are read by NAME out of each
// object literal rather than positionally, so reordering id/name/primary/
// secondary never breaks the parse (only losing a field does — and that
// FAILs, it does not silently skip the entry).
function parseTsAccents(tsSrc) {
  const m = /export\s+const\s+ACCENTS\s*(?::\s*Accent\[\])?\s*=\s*\[([\s\S]*?)\n\]\s*(?:as\s+const\s*)?(?:satisfies\s+[^;]+)?;/.exec(tsSrc);
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
  const m = /export\s+const\s+DEFAULT_ACCENT\s*(?::[^=]+)?=\s*['"]([^'"]+)['"]/.exec(tsSrc);
  return m ? m[1] : null;
}

// DESIGN_SYSTEMS: Record<string, DesignSystem> in design-system.ts — only the
// keys matter here; the labels/taglines are picker copy, not boot state.
function parseTsDesignSystems(tsSrc) {
  const m = /export\s+const\s+DESIGN_SYSTEMS\s*(?::[^=]*)?=\s*\{([\s\S]*?)\n\}\s*(?:as\s+const\s*)?(?:satisfies\s+[^;]+)?;/.exec(tsSrc);
  if (!m) return { ids: [], malformed: [], found: false };
  const { entries, malformed } = parseObjectEntries(m[1]);
  return { ids: [...entries.keys()], malformed, found: true };
}

function parseTsDefaultSystem(tsSrc) {
  const m = /export\s+const\s+DEFAULT_SYSTEM\s*(?::[^=]+)?=\s*['"]([^'"]+)['"]/.exec(tsSrc);
  return m ? m[1] : null;
}

// :root[data-system="id"] { … } token blocks — the ~30 overrides that make a
// system look like itself. Anchored exactly like the accent parser, so only a
function parseCssSystems(cssSrc) {
  return parseCssSystemBlocks(cssSrc);
}

// Component skins use descendant selectors rather than the bare
// :root[data-system="…"] token-block form. Keep every live occurrence with its
// source line so a retired system can be removed from the stylesheet directly.
// A selector containing :root[data-system="…"] plus a descendant is a skin too;
// only a rule whose entire selector is the bare token-block form is excluded.
const SYSTEM_SKIN_SELECTOR_RE = /\[data-system\s*=\s*(["'])([A-Za-z0-9_-]+)\1\s*\]/g;

function parseCssSystemSkins(cssSrc) {
  const src = stripCommentsPreservingLines(cssSrc);
  const skins = [];
  for (const rule of src.matchAll(/([^{}]+)\{/g)) {
    const selectorText = rule[1];
    const selector = selectorText.trim();
    if (!selector) continue;
    const isBareTokenBlock = /^\s*:root\s*\[data-system\s*=\s*(["'])[A-Za-z0-9_-]+\1\s*\]\s*$/.test(selectorText);
    for (const match of selectorText.matchAll(SYSTEM_SKIN_SELECTOR_RE)) {
      if (isBareTokenBlock) continue;
      const offset = rule.index + match.index;
      skins.push({
        id: match[2],
        line: src.slice(0, offset).split('\n').length,
        selector: selector.replace(/\s+/g, ' '),
      });
    }
  }
  return skins;
}

// The same blocks, read as the font tokens each system declares — one
// selector definition, so the two readings can never disagree about which
// rules count as a system's token block.
function parseCssSystemFonts(cssSrc) {
  const out = new Map();
  for (const [id, body] of parseCssSystems(cssSrc)) out.set(id, parseCssFontTokens(body));
  return out;
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

function parseFontRegistry(fontsSrc, parsedFonts = parseTsFontOptions(fontsSrc)) {
  let exports_;
  try {
    exports_ = loadTsExports(FONTS_REL, fontsSrc);
  } catch (err) {
    return { found: false, issues: [`could not execute ${FONTS_REL}: ${err.message}`], bootData: null };
  }

  const expectedBootData = {
    stacks: Object.fromEntries(parsedFonts.fonts),
    fallback: parsedFonts.order[0] ?? null,
  };
  const actualBootData = exports_.FONT_BOOT_DATA;
  const issues = [];
  if (JSON.stringify(actualBootData) !== JSON.stringify(expectedBootData)) {
    issues.push(`FONT_BOOT_DATA is stale: expected ${JSON.stringify(expectedBootData)}, received ${JSON.stringify(actualBootData)}`);
  }
  return {
    found: actualBootData !== undefined,
    issues,
    bootData: actualBootData ?? null,
  };
}

// A `Record<string, string>` map declared in a TS module, read by NAME:
// FONT_STYLESHEETS. It is not exported (module-private, reached only through
// loadFontOverride()), so `export` is optional in the match.
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

const THEME_BOOT_MARKER = '__AWESOME_VIDEO_THEME_BOOT__';
const FONT_BOOT_MARKER = '__AWESOME_VIDEO_FONT_BOOT__';

function parseThemeRegistry(tsSrc) {
  let exports_;
  try {
    exports_ = loadTsExports(TS_REL, tsSrc);
  } catch (err) {
    return { found: false, issues: [`could not execute ${TS_REL}: ${err.message}`] };
  }

  const registry = exports_.THEME_FALLBACK_REGISTRY;
  if (!registry || typeof registry !== 'object') {
    return { found: false, issues: [`${TS_REL} does not export THEME_FALLBACK_REGISTRY`] };
  }

  const issues = [];
  const systems = new Map();
  const accents = new Map();
  const systemDefaultAccents = new Map();
  const expectedAccentExports = [];

  if (!Array.isArray(registry.systems)) {
    issues.push('THEME_FALLBACK_REGISTRY.systems is not an array');
  } else {
    for (const system of registry.systems) {
      if (
        !system || typeof system !== 'object' ||
        !['id', 'name', 'tag', 'desc', 'defaultAccent'].every((field) => typeof system[field] === 'string' && system[field])
      ) {
        issues.push(`malformed system entry: ${JSON.stringify(system)}`);
        continue;
      }
      if (systems.has(system.id)) issues.push(`duplicate system id "${system.id}"`);
      systems.set(system.id, { name: system.name, tag: system.tag, desc: system.desc });
      systemDefaultAccents.set(system.id, system.defaultAccent);
    }
  }

  if (!Array.isArray(registry.accents)) {
    issues.push('THEME_FALLBACK_REGISTRY.accents is not an array');
  } else {
    for (const accent of registry.accents) {
      if (
        !accent || typeof accent !== 'object' ||
        !['id', 'name', 'primary', 'secondary'].every((field) => typeof accent[field] === 'string' && accent[field])
      ) {
        issues.push(`malformed accent entry: ${JSON.stringify(accent)}`);
        continue;
      }
      if (accents.has(accent.id)) issues.push(`duplicate accent id "${accent.id}"`);
      accents.set(accent.id, { primary: accent.primary, secondary: accent.secondary });
      expectedAccentExports.push({
        id: accent.id,
        name: accent.name,
        primary: accent.primary,
        secondary: accent.secondary,
      });
    }
  }

  const defaultSystem = typeof registry.defaultSystem === 'string' ? registry.defaultSystem : null;
  const defaultAccent = typeof registry.defaultAccent === 'string' ? registry.defaultAccent : null;
  if (!defaultSystem) issues.push('THEME_FALLBACK_REGISTRY.defaultSystem is not a non-empty string');
  if (!defaultAccent) issues.push('THEME_FALLBACK_REGISTRY.defaultAccent is not a non-empty string');

  const expectedBootData = {
    systems: [...systems.keys()],
    accents: [...accents.keys()],
    defaultSystem,
    defaultAccent,
  };
  const actualBootData = exports_.THEME_BOOT_DATA;
  if (JSON.stringify(actualBootData) !== JSON.stringify(expectedBootData)) {
    issues.push(`THEME_BOOT_DATA is stale: expected ${JSON.stringify(expectedBootData)}, received ${JSON.stringify(actualBootData)}`);
  }

  const exportedSystems = exports_.DESIGN_SYSTEMS;
  if (!exportedSystems || JSON.stringify(exportedSystems) !== JSON.stringify(Object.fromEntries(systems))) {
    issues.push('DESIGN_SYSTEMS metadata is not derived from THEME_FALLBACK_REGISTRY.systems');
  }
  const exportedAccents = exports_.ACCENTS;
  if (!Array.isArray(exportedAccents) || JSON.stringify(exportedAccents) !== JSON.stringify(expectedAccentExports)) {
    issues.push('ACCENTS metadata is not derived from THEME_FALLBACK_REGISTRY.accents');
  }
  if (JSON.stringify(exports_.SYSTEM_DEFAULT_ACCENT) !== JSON.stringify(Object.fromEntries(systemDefaultAccents))) {
    issues.push('SYSTEM_DEFAULT_ACCENT is not derived from THEME_FALLBACK_REGISTRY.systems');
  }
  if (exports_.DEFAULT_SYSTEM !== defaultSystem) {
    issues.push(`DEFAULT_SYSTEM is "${exports_.DEFAULT_SYSTEM}" instead of registry defaultSystem "${defaultSystem}"`);
  }
  if (exports_.DEFAULT_ACCENT !== defaultAccent) {
    issues.push(`DEFAULT_ACCENT is "${exports_.DEFAULT_ACCENT}" instead of registry defaultAccent "${defaultAccent}"`);
  }

  return {
    found: true,
    issues,
    systems,
    accents,
    systemDefaultAccents,
    defaultSystem,
    defaultAccent,
    bootData: actualBootData,
  };
}

function checkThemeBootGeneration(htmlSrc, viteSrc) {
  const issues = [];
  for (const marker of [THEME_BOOT_MARKER, FONT_BOOT_MARKER]) {
    const markerCount = htmlSrc.split(marker).length - 1;
    if (markerCount !== 1) {
      issues.push(`${HTML_REL} must contain exactly one ${marker} marker; found ${markerCount}`);
    }
  }
  if (/\bvar\s+(?:SYSTEMS|ACCENTS)\s*=\s*\[|\bvar\s+FONT_STACKS\s*=\s*\{/.test(htmlSrc)) {
    issues.push(`${HTML_REL} contains a hand-maintained theme/font allowlist instead of generated boot data`);
  }
  for (const field of ['systems', 'accents', 'defaultSystem', 'defaultAccent']) {
    if (!new RegExp(`\\bTHEME_BOOT\\.${field}\\b`).test(htmlSrc)) {
      issues.push(`${HTML_REL} does not consume generated THEME_BOOT.${field}`);
    }
  }
  for (const field of ['stacks', 'fallback']) {
    if (!new RegExp(`\\bFONT_BOOT\\.${field}\\b`).test(htmlSrc)) {
      issues.push(`${HTML_REL} does not consume generated FONT_BOOT.${field}`);
    }
  }
  if (!/\bimport\s*\{[^}]*\bTHEME_BOOT_DATA\b[^}]*\}\s*from\s*["']\.\/client\/src\/lib\/design-system["']/.test(viteSrc)) {
    issues.push(`${VITE_REL} does not import THEME_BOOT_DATA from ${TS_REL}`);
  }
  if (!/\bimport\s*\{[^}]*\bFONT_BOOT_DATA\b[^}]*\}\s*from\s*["']\.\/client\/src\/lib\/font-options["']/.test(viteSrc)) {
    issues.push(`${VITE_REL} does not import FONT_BOOT_DATA from ${FONTS_REL}`);
  }
  if (!viteSrc.includes(`const marker = "${THEME_BOOT_MARKER}"`) || !viteSrc.includes('JSON.stringify(THEME_BOOT_DATA)')) {
    issues.push(`${VITE_REL} does not serialize THEME_BOOT_DATA for the ${THEME_BOOT_MARKER} marker`);
  }
  if (!viteSrc.includes(`const marker = "${FONT_BOOT_MARKER}"`) || !viteSrc.includes('JSON.stringify(FONT_BOOT_DATA)')) {
    issues.push(`${VITE_REL} does not serialize FONT_BOOT_DATA for the ${FONT_BOOT_MARKER} marker`);
  }
  if (!/\bplugins\s*:\s*\[[\s\S]*?\bthemeBootRegistry\(\)/.test(viteSrc)) {
    issues.push(`${VITE_REL} does not register themeBootRegistry() in the Vite plugin pipeline`);
  }
  if (!/\bplugins\s*:\s*\[[\s\S]*?\bfontBootRegistry\(\)/.test(viteSrc)) {
    issues.push(`${VITE_REL} does not register fontBootRegistry() in the Vite plugin pipeline`);
  }
  return issues;
}

// Every <link> carrying the `stylesheet` rel token in an HTML source. HTML
// is parsed as HTML rather than matched as text: quoted `>` characters,
// character references, unquoted attributes, attribute order/line breaks,
// and space-separated rel tokens therefore resolve exactly as they do in the
// browser. This parser is shared by the offline coverage lock and live probe.
function parseHtmlStylesheetLinks(htmlSrc) {
  const $ = cheerio.load(String(htmlSrc));
  const hrefs = [];
  $('link').each((_, element) => {
    const relTokens = String($(element).attr('rel') ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    const href = $(element).attr('href');
    if (!relTokens.includes('stylesheet') || href === undefined) return; // preconnect/icon/manifest
    hrefs.push(normalizeSourceUrl(href));
  });
  return hrefs;
}

// CSS @import rules and HTML stylesheet links are both browser fetch points.
// Keep the source scan focused on provider stylesheets, not preconnect hints or
// font-file URLs, because only stylesheet URLs are targets of this gate/probe.
function parseCssFontProviderImports(cssSrc) {
  const src = stripCssComments(cssSrc);
  const hrefs = [];
  const importRe = /@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^'"\s)]+))\s*\)?/gi;
  for (const match of src.matchAll(importRe)) {
    const href = normalizeSourceUrl(match[1] ?? match[2] ?? match[3] ?? '');
    if (isFontProviderUrl(href)) hrefs.push(href);
  }
  return hrefs;
}

function parseHtmlFontProviderLinks(htmlSrc) {
  return parseHtmlStylesheetLinks(htmlSrc).filter(isFontProviderUrl).map(normalizeSourceUrl);
}

// Every provider stylesheet the browser can fetch from client source must be a
// URL this gate/probe already knows how to verify. A new fetch point must be
// added to one of the stylesheet maps, or the scanner would report a false
// green while the browser downloads an unchecked face.
function compareFontSourceCoverage(sources, probedHrefs) {
  const probed = new Set(probedHrefs.map(normalizeSourceUrl));
  return sources
    .filter(({ href }) => !probed.has(normalizeSourceUrl(href)))
    .map(({ kind, rel, href }) => ({
      kind: 'font-source-coverage',
      id: `${kind}:${rel}`,
      message: `${kind} in ${rel} references font-provider stylesheet ${href}, but that URL is not among the sources probed from ${FONTS_REL} (FONT_STYLESHEETS) or ${HTML_REL} (the canonical always-on request) — move it into the picker map or teach the scanner about this source before adding it`,
    }));
}

// The CSP is written twice in server/index.ts: once for the first middleware
// stack and once for the fallback stack. Read the actual directive literals
// rather than copying their current hosts into this gate. The returned
// `sources` retain CSP keywords such as 'self'; `hosts` contains only the
// absolute HTTP(S) source expressions that can authorize an external URL.
function parseCspHostAllowlists(serverSrc) {
  const src = stripComments(serverSrc);
  const headers = [...src.matchAll(/setHeader\s*\(\s*["']Content-Security-Policy["']/g)];
  const directives = { styleSrc: [], fontSrc: [] };
  const literalRe = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  const sharedBuilder = src.match(
    /const\s+buildContentSecurityPolicy\s*=\s*\([^)]*\)(?:\s*:\s*[^=]+)?\s*=>\s*\[/,
  );
  const sharedArrayStart = sharedBuilder
    ? sharedBuilder.index + sharedBuilder[0].lastIndexOf("[")
    : -1;

  function findArrayEnd(arrayStart) {
    if (arrayStart < 0) return -1;
    let depth = 0;
    for (let i = arrayStart; i < src.length; i++) {
      if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
        i = endOfString(src, i);
        continue;
      }
      if (src[i] === '[') depth++;
      else if (src[i] === ']' && --depth === 0) {
        return i;
      }
    }
    return -1;
  }

  function parseDirectiveArray(arrayStart) {
    const arrayEnd = findArrayEnd(arrayStart);
    if (arrayEnd < 0) return;
    for (const match of src.slice(arrayStart + 1, arrayEnd).matchAll(literalRe)) {
      const value = match[2].trim();
      const directive = /^(style-src|font-src)\s+([^;]+)/i.exec(value);
      if (!directive) continue;
      const key = directive[1].toLowerCase() === 'style-src' ? 'styleSrc' : 'fontSrc';
      const sources = directive[2].trim().split(/\s+/).filter(Boolean);
      const hosts = sources
        .filter((source) => /^https?:\/\//i.test(source))
        .map((source) => {
          try {
            return new URL(source).origin;
          } catch {
            return source;
          }
        });
      directives[key].push({ sources, hosts });
    }
  }

  for (const header of headers) {
    // Accept the original inline array form for synthetic canaries and older
    // source layouts, but prefer the single shared builder used by production.
    const headerTail = src.slice(header.index + header[0].length);
    const inlineArray = /^\s*,\s*\[/.exec(headerTail);
    const arrayStart = inlineArray
      ? header.index + header[0].length + inlineArray[0].lastIndexOf("[")
      : sharedArrayStart;
    parseDirectiveArray(arrayStart);
  }

  return { headerCount: headers.length, ...directives };
}

// The pre-paint boot script must consume the generated FONT_BOOT marker rather
// than carry a second id/stack/fallback registry in HTML.
function parseBootFonts(htmlSrc) {
  return {
    found: new RegExp(`\\bvar\\s+FONT_BOOT\\s*=\\s*${FONT_BOOT_MARKER}\\b`).test(htmlSrc),
    consumesStacks: /\bFONT_BOOT\.stacks\b/.test(htmlSrc),
    consumesFallback: /\bFONT_BOOT\.fallback\b/.test(htmlSrc),
  };
}

function cspSourceAllowsUrl(href, directives) {
  const value = String(href).trim();
  let parsed;
  try {
    parsed = new URL(value, 'https://csp-self.invalid');
  } catch {
    return false;
  }

  const isRelative = !/^[a-z][a-z\d+\-.]*:/i.test(value) && !value.startsWith('//');
  for (const directive of directives) {
    if (isRelative && directive.sources.includes("'self'")) return true;
    for (const source of directive.sources) {
      if (!/^https?:\/\//i.test(source)) continue;
      let allowed;
      try {
        allowed = new URL(source);
      } catch {
        continue;
      }
      if (allowed.origin === parsed.origin) return true;
      if (allowed.hostname.startsWith('*.') && parsed.protocol === allowed.protocol && parsed.hostname.endsWith(allowed.hostname.slice(1))) {
        return true;
      }
    }
  }
  return false;
}

function compareCspHostAllowlists(parsed) {
  const failures = [];
  const expectedBlocks = parsed.headerCount;

  if (!expectedBlocks) {
    failures.push({
      kind: 'parser-rot',
      message: `could not locate any Content-Security-Policy header blocks in ${SERVER_REL} — the CSP parser went vacuous`,
    });
  }

  for (const [key, label] of [
    ['styleSrc', 'style-src'],
    ['fontSrc', 'font-src'],
  ]) {
    const entries = parsed[key];
    if (!entries.length) {
      failures.push({
        kind: 'parser-rot',
        message: `could not locate any ${label} directive in ${SERVER_REL} — the CSP parser went vacuous`,
      });
      continue;
    }
    if (expectedBlocks && entries.length !== expectedBlocks) {
      failures.push({
        kind: 'csp-parity',
        message: `${SERVER_REL} has ${expectedBlocks} Content-Security-Policy header block(s) but ${entries.length} ${label} directive(s) — every block must declare the same font policy`,
      });
    }
    for (const entry of entries) {
      if (!entry.hosts.length) {
        failures.push({
          kind: 'parser-rot',
          message: `${label} in ${SERVER_REL} declares zero absolute CSP hosts — an empty allowlist cannot prove any stylesheet/font URL is permitted`,
        });
      }
    }
    const first = entries[0];
    const expected = [...first.sources].sort().join('\u0000');
    for (let i = 1; i < entries.length; i++) {
      const actual = [...entries[i].sources].sort().join('\u0000');
      if (actual !== expected) {
        failures.push({
          kind: 'csp-parity',
          message: `${label} allowlists disagree between CSP blocks in ${SERVER_REL} — block 1 has ${first.sources.join(' ')}, block ${i + 1} has ${entries[i].sources.join(' ')}`,
        });
      }
    }
  }

  return failures;
}

function compareStylesheetCsp(targets, styleDirectives) {
  const failures = [];
  for (const target of targets) {
    if (cspSourceAllowsUrl(target.href, styleDirectives)) continue;
    failures.push({
      kind: 'stylesheet-csp',
      id: target.id,
      message: `${target.label} → ${target.href} is not allowed by the site's style-src policy in ${SERVER_REL} — the browser will block this stylesheet and ${target.consequence}`,
    });
  }
  return failures;
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
function compareSystemPaint(systemIds, cssBlocks, baseRootPainted, minimalTokenSystems = MINIMAL_TOKEN_SYSTEMS) {
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

  // Minimal-token exemptions are checked before they are allowed to influence
  // the peer contract. A reason-less or stale entry is never an exemption.
  const minimalValidation = validateMinimalTokenSystems(
    [...offered],
    cssBlocks,
    minimalTokenSystems,
  );
  failures.push(
    ...minimalValidation.failures.map(({ id, message }) => ({
      kind: 'minimal-system-exemption',
      id,
      message,
    })),
  );
  const minimalTokenExempt = minimalValidation.exemptIds;

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

  const { tokens: sharedTokens, missingBySystem } = findMissingSystemTokens(
    [...offered],
    cssBlocks,
    new Set([...exempt, ...minimalTokenExempt]),
  );

  // Every non-exempt system must declare the contract its established peers
  // agree on. Report the names, not only a count, so a failed gate tells the
  // author exactly which part of the look is still inherited.
  for (const id of offered) {
    const body = cssBlocks.get(id);
    if (body == null || !declaresCustomProperty(body) || exempt.has(id) || minimalTokenExempt.has(id)) continue;
    const missing = missingBySystem.get(id);
    if (missing) {
      failures.push({
        kind: 'system-token-contract',
        id,
        message: formatMissingSystemTokensMessage(id, missing.declaredCount, sharedTokens.size, missing.missing),
      });
    }
  }

  // Once a minimal system grows to satisfy the peer contract, its exemption
  // has done its job and must be removed rather than becoming permanent debt.
  failures.push(
    ...findStaleMinimalTokenSystems(
      minimalTokenExempt,
      cssBlocks,
      sharedTokens,
      minimalTokenSystems,
    ).map(({ id, message }) => ({
      kind: 'minimal-system-exemption',
      id,
      message,
    })),
  );

  return failures;
}

function compareSystemSkins(systemIds, skins) {
  const offered = new Set(systemIds);
  return skins
    .filter(({ id }) => !offered.has(id))
    .map(({ id, line, selector }) => ({
      kind: 'system-skin',
      id,
      message: `${CSS_REL} has a component skin for unknown design system "${id}" on line ${line}: ${selector} — remove or rename the skin because DESIGN_SYSTEMS in ${TS_REL} does not offer "${id}"`,
    }));
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

// The default system is the one case where a first-time visitor does not pass
// through SYSTEM_DEFAULT_ACCENT: readInitial() and the pre-paint boot script
// both start with DEFAULT_ACCENT. Keep that fallback aligned with the
// default system's intended accent, or the site's initial look is wrong even
// though every map entry is otherwise valid.
function compareDefaultSystemAccent(defaultSystemId, defaultAccentId, defaults) {
  const mappedAccentId = defaults.get(defaultSystemId);
  if (mappedAccentId === defaultAccentId) return [];
  return [{
    kind: 'system-default-accent',
    id: defaultSystemId,
    message: `SYSTEM_DEFAULT_ACCENT[DEFAULT_SYSTEM] in ${TS_REL} maps "${defaultSystemId}" to "${mappedAccentId ?? '(missing)'}", but DEFAULT_ACCENT is "${defaultAccentId}" — the default system's intended accent never reaches a first-time visitor because readInitial() in theme-provider.tsx and the pre-paint fallback in ${HTML_REL} use DEFAULT_ACCENT`,
  }];
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
// Live webfont probe (opt-in — only reached under --network)
// ---------------------------------------------------------------------------
// Everything above is a repo-vs-repo comparison, so it can only catch a
// disagreement. It cannot catch agreement on something false: a family
// misspelled in both a stack and its URL matches itself, and the 400 that
// comes back is invisible to an offline gate. These three helpers close that
// hole by reading what the server actually sends.

// Only /* … */ comments are stripped from a CSS response: "//" is not a
// comment in CSS, and treating it as one would eat every src: url(https://…).
function stripCssComments(css) {
  return String(css).replace(/\/\*[\s\S]*?\*\//g, '');
}

// The families a stylesheet RESPONSE declares — the font-family of every
// @font-face block in the body. `blocks` is reported separately so "served a
// face we did not ask for" and "served no face at all" stay distinguishable:
// an HTML error page and an empty 200 both parse to zero families, and both
// are failures.
function parseServedFamilies(cssBody) {
  const src = stripCssComments(cssBody);
  const families = new Set();
  let blocks = 0;
  for (const block of src.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    blocks++;
    const decl = /(?:^|[\s;{])font-family\s*:\s*([^;}]+)/i.exec(block[1]);
    if (!decl) continue;
    const name = normalizeFamilyName(decl[1]);
    if (name) families.add(name);
  }
  return { families, blocks };
}

// The font-src policy applies to the actual font files named by each served
// @font-face block, not just to the stylesheet URL. Keep every url() so a
// response that mixes an allowed and a blocked CDN cannot pass accidentally.
function parseServedFontSources(cssBody) {
  const src = stripCssComments(cssBody);
  const urls = [];
  for (const block of src.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    for (const match of block[1].matchAll(/url\(\s*(?:(['"])(.*?)\1|([^'")\s]+))\s*\)/gi)) {
      urls.push(match[2] ?? match[3]);
    }
  }
  return urls;
}

// One probed URL vs the response it got. Split out from the fetch so the
// canaries can drive it with the synthetic responses a live run must never
// wave through: the 400 error page a misspelled family= earns, an empty 200,
// and a 200 that declares a different family than the one requested.
function compareServedFamilies(target, response) {
  const failures = [];
  const where = `${target.label} → ${target.href}`;
  if (response.error || response.status !== 200) {
    const what = response.error ? `no usable response (${response.error})` : `HTTP ${response.status}`;
    return [
      {
        kind: 'webfont-http',
        id: target.id,
        message: `${where} answered ${what} — the file never arrives, so ${target.consequence}`,
      },
    ];
  }
  const { families: served, blocks } = parseServedFamilies(response.body);
  if (!blocks || !served.size) {
    const what = blocks ? `${blocks} @font-face block(s) but not one font-family` : 'no @font-face at all';
    return [
      {
        kind: 'webfont-empty',
        id: target.id,
        message: `${where} answered HTTP 200 with ${what} (${String(response.body).length}-byte body) — a 200 that serves no face is the same silent bug as no stylesheet at all: ${target.consequence}`,
      },
    ];
  }
  const servedList = [...served].map((f) => `"${f}"`).join(', ');
  for (const family of target.families) {
    if (!served.has(normalizeFamilyName(family))) {
      failures.push({
        kind: 'webfont-served-family',
        id: target.id,
        message: `${where} asks for "${family}" but the response declares @font-face for ${servedList} — the requested family never arrives, so ${target.consequence}`,
      });
    }
  }
  return failures;
}

function compareServedFontSources(target, response, fontDirectives) {
  if (response.error || response.status !== 200) return [];
  const failures = [];
  for (const href of parseServedFontSources(response.body)) {
    if (cspSourceAllowsUrl(href, fontDirectives)) continue;
    failures.push({
      kind: 'font-csp',
      id: target.id,
      message: `${target.label} → ${target.href} serves font file ${href}, which is not allowed by the site's font-src policy in ${SERVER_REL} — the browser will block the face and ${target.consequence}`,
    });
  }
  return failures;
}

const PROBE_TIMEOUT_MS = 15000;
const PROBE_ATTEMPTS = 3;
const PROBE_CONCURRENCY = 4;
// Google's css2 endpoint tailors both the file format and the @font-face
// blocks it serves to the User-Agent, and Node's default agent gets a legacy
// response. Ask the way a current browser asks, so what the probe verifies is
// what a visitor is actually sent.
const PROBE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchStylesheet(href) {
  let error = null;
  for (let attempt = 1; attempt <= PROBE_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(href, {
        redirect: 'follow',
        headers: { 'User-Agent': PROBE_UA, Accept: 'text/css,*/*;q=0.1' },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      const body = await res.text();
      // A 4xx is the answer, not a hiccup — a misspelled family IS a 400, and
      // retrying only makes the failure slower. Transport errors, 429 and 5xx
      // are the ones worth another try, so a blip never fails the run.
      if (res.status < 500 && res.status !== 429) return { status: res.status, body, attempts: attempt };
      error = `HTTP ${res.status}`;
    } catch (err) {
      error = err?.message ?? String(err);
    }
    if (attempt < PROBE_ATTEMPTS) await sleep(400 * attempt);
  }
  return { status: null, body: '', attempts: PROBE_ATTEMPTS, error };
}

// Fetch every target, a few at a time, keeping results in target order so the
// report reads the same on every run.
async function fetchAllStylesheets(targets) {
  const responses = new Array(targets.length);
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < targets.length; i = next++) {
      responses[i] = await fetchStylesheet(targets[i].href);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PROBE_CONCURRENCY, targets.length) }, worker));
  return responses;
}

// ---------------------------------------------------------------------------
// Comparator — the loader behind a system's OWN font tokens (#411).
// ---------------------------------------------------------------------------
// Exactly one loader runs for a design system: the always-on stylesheet
// link(s) in the HTML shell (every visitor, pre-paint). That link is the
// design source's canonical request and carries every family all five
// systems name, so switching systems fetches nothing and there is no
// per-system stylesheet map to keep in step. Every family a system's
// --font-display / --font-body / --font-mono names FIRST has to come from
// those links. FONT_STYLESHEETS is not a loader here: it fires only when a
// visitor picks that option in the picker.
//
//   · a named family nothing fetches            → the surface paints in the
//     declaration's fallback face
//   · a named weight nothing fetches (optional
//     inventory from the browser gate)          → faux bold / faux weight
//
// The other direction — a fetched family no system names — is deliberately
// NOT judged here: the shell request is held byte-identical to the design's
// by compareCanonicalFontRequest() below, and it legitimately carries the
// faces of every system, not just the active one.
function effectiveSystemFonts(systemId, rootFonts, systemFonts) {
  const own = systemFonts.get(systemId);
  const out = new Map();
  for (const token of FONT_TOKENS) {
    const declaredHere = own?.has(token);
    out.set(token, {
      value: declaredHere ? own.get(token) : rootFonts.get(token),
      source: declaredHere ? `:root[data-system="${systemId}"]` : ':root',
    });
  }
  return out;
}

function mergeStylesheetFontEntries(hrefs) {
  const entries = new Map();
  for (const href of hrefs) {
    for (const [family, entry] of parseStylesheetFontEntries(href)) {
      const previous = entries.get(family);
      entries.set(family, {
        family: entry.family,
        ranges: [...(previous?.ranges ?? []), ...entry.ranges],
      });
    }
  }
  return entries;
}

function compareSystemFontCoverage({ systemIds, rootFonts, systemFonts, staticHrefs, requiredWeights }) {
  const failures = [];
  const alwaysLoaded = new Set();
  for (const href of staticHrefs) {
    for (const family of parseStylesheetFamilies(href)) alwaysLoaded.add(normalizeFamilyName(family));
  }
  const loadedEntries = mergeStylesheetFontEntries(staticHrefs);

  for (const id of [...systemIds].sort()) {
    const effective = effectiveSystemFonts(id, rootFonts, systemFonts);
    for (const [token, { value, source }] of effective) {
      if (value === undefined || value === null) {
        failures.push({
          kind: 'system-font-token',
          id,
          message: `design system "${id}" resolves ${token} to nothing — neither its own block nor :root declares it in ${CSS_REL}, so every \`font-family: var(${token})\` rule computes to nothing at all`,
        });
        continue;
      }
      const families = stackFamilies(value);
      if (!families.length) {
        failures.push({
          kind: 'system-font-token',
          id,
          message: `design system "${id}" declares ${token} in ${source} as ${JSON.stringify(value)}, which names no family — the surfaces reading it have no face to ask for`,
        });
        continue;
      }
      const primary = families[0];
      if (GENERIC_FAMILIES.has(primary)) continue; // a face the browser already has
      if (alwaysLoaded.has(primary)) continue;
      failures.push({
        kind: 'system-font-coverage',
        id,
        message: `design system "${id}" asks for "${primary}" (${token} in ${source}: ${JSON.stringify(value)}) but the always-on <link rel="stylesheet"> in ${HTML_REL} — the only loader that runs for a system — does not download it (it carries: ${[...alwaysLoaded].join(', ') || 'nothing'}), so every surface reading ${token} silently paints in the next family of that stack instead. The shell request is the design source's; a family it lacks is a token drifting from the design, not a URL to widen`,
      });
    }

    // The browser gate supplies this optional inventory after measuring the
    // actual display/body/mono surfaces. Keep the structural comparator useful
    // on its own as well: its canaries use the same path to prove a dropped
    // static weight and a variable range are not waved through.
    const requiredByToken = requiredWeights?.get?.(id);
    if (!requiredByToken) continue;
    for (const [token, weights] of requiredByToken) {
      const primary = stackFamilies(effective.get(token)?.value ?? '')[0];
      if (!primary || GENERIC_FAMILIES.has(primary)) continue;
      for (const weight of weights) {
        if (stylesheetFamilyCoversWeight(loadedEntries, primary, weight)) continue;
        failures.push({
          kind: 'system-font-weight',
          id,
          message: `design system "${id}" requires weight ${weight} for ${token} (${primary}), but the always-on font request in ${HTML_REL} does not request that weight — a browser may synthesize faux bold even though the family itself is present`,
        });
      }
    }
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Comparator — the shell's font request vs the design source's (parity W1)
// ---------------------------------------------------------------------------
// awesome-list-site-ds/index.html is the frozen design source. It makes ONE
// Google Fonts css2 request, and the app's shell must make the SAME one, byte
// for byte once HTML entities are decoded: same families, weights, styles and
// axes. A different axis subset (Fraunces requested with `opsz`, Inter
// without 800) produces different glyph outlines and metrics, so headings
// drift by pixels on every page and the parity budget can never be met.
// Exactly one always-on font-provider link is allowed: a second request is a
// second owner, and two owners have to be kept in lockstep by hand.
const DESIGN_HTML_REL = 'awesome-list-site-ds/index.html';

// The `family=` parameters of a css2 href as family → axis spec (the text
// after ":", "" when there is none), plus every other query parameter, so a
// mismatch can be described by what differs rather than by two long strings.
function describeCss2Href(href) {
  const families = new Map();
  const others = [];
  const query = String(href).split('?')[1] ?? '';
  for (const part of query.split('&')) {
    if (!part) continue;
    const [key, ...rest] = part.split('=');
    const value = rest.join('=');
    if (key === 'family') {
      const [family, ...spec] = value.split(':');
      families.set(decodeStylesheetPart(family), spec.join(':'));
    } else {
      others.push(part);
    }
  }
  return { families, others };
}

function describeHrefDifference(appHref, designHref) {
  const app = describeCss2Href(appHref);
  const design = describeCss2Href(designHref);
  const notes = [];
  for (const [family, spec] of design.families) {
    if (!app.families.has(family)) notes.push(`app never requests "${family}"`);
    else if (app.families.get(family) !== spec) notes.push(`"${family}" axes differ — app "${app.families.get(family)}" vs design "${spec}"`);
  }
  for (const family of app.families.keys()) {
    if (!design.families.has(family)) notes.push(`app requests "${family}", which the design does not`);
  }
  if (app.others.join('&') !== design.others.join('&')) notes.push(`other parameters differ — app "${app.others.join('&')}" vs design "${design.others.join('&')}"`);
  if (!notes.length) notes.push('the two differ only in parameter order or spelling — copy the design href verbatim');
  return notes;
}

function compareCanonicalFontRequest(shellHrefs, designHrefs) {
  const design = designHrefs.map(normalizeSourceUrl);
  if (design.length !== 1) {
    return [
      {
        kind: 'parser-rot',
        id: DESIGN_HTML_REL,
        message: `expected exactly one font-provider <link rel="stylesheet"> in ${DESIGN_HTML_REL} but found ${design.length}${design.length ? `: ${design.join(' | ')}` : ''} — the design source is frozen; this gate cannot say what the canonical request is without it`,
      },
    ];
  }
  const shell = shellHrefs.map(normalizeSourceUrl);
  if (shell.length !== 1) {
    return [
      {
        kind: 'canonical-font-request',
        id: HTML_REL,
        message: `${HTML_REL} must carry exactly ONE always-on font-provider <link rel="stylesheet"> — the design source's request, byte for byte — but carries ${shell.length}${shell.length ? `: ${shell.join(' | ')}` : ''}. A second request is a second owner of the font set; a missing one leaves every system painting in fallback faces`,
      },
    ];
  }
  if (shell[0] === design[0]) return [];
  return [
    {
      kind: 'canonical-font-request',
      id: HTML_REL,
      message: `the always-on font request in ${HTML_REL} is not byte-identical to the design source's in ${DESIGN_HTML_REL}:\n         app:    ${shell[0]}\n         design: ${design[0]}\n         ${describeHrefDifference(shell[0], design[0]).join('; ')}`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Stored-id resolution: junk must resolve to the DEFAULT system in BOTH halves
// ---------------------------------------------------------------------------
// `ds-system` in localStorage is arbitrary text: it outlives a retired system
// id and anyone can type one in by hand. TWO halves read it — the pre-paint
// boot script in the HTML shell, which PAINTS the page, and the app (the
// theme provider, the storage-sync path, the picker), which holds the
// selected system as STATE. The boot script resolves against a literal id
// list, so it always lands on a real system. The moment the app's half calls
// a value valid that the boot script rejected, the two disagree: the page
// paints the default system while the provider believes "toString" is
// selected — no picker card lights up, and the next storage write persists
// the junk for every tab.
//
// `id in DESIGN_SYSTEMS` and `DESIGN_SYSTEMS[id] ? …` both answer YES for keys
// nobody declared — toString, constructor, valueOf, __proto__ — so the test
// has to be an OWN-property test. This check does not take the source's word
// for it: it EXECUTES the real resolver out of the real file and hands it
// those keys, then asserts the id it returns is the default.
const CLIENT_SRC_REL = 'client/src';
const INHERITED_KEYS = ['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__'];
// Everything a stored `ds-system` can be that is NOT a system we offer: keys
// every object inherits, an id we retired, and the empty/absent value a first
// visit leaves behind. All of them must land on DEFAULT_SYSTEM.
const REJECTED_SAMPLE_IDS = [...INHERITED_KEYS, 'ghost-system', '', null, undefined];
const UNSAFE_MEMBERSHIP_TESTS = [
  [/\bin\s+DESIGN_SYSTEMS\b/, '`… in DESIGN_SYSTEMS` — the `in` operator walks the prototype chain'],
  [/DESIGN_SYSTEMS\s*\[[^\]\n]*\]\s*(?:\?|&&|\|\|)/, '`DESIGN_SYSTEMS[…] ? …` — a truthy lookup answers yes for inherited keys'],
  [/\bif\s*\(\s*!?\s*DESIGN_SYSTEMS\s*\[/, '`if (DESIGN_SYSTEMS[…])` — a truthy lookup answers yes for inherited keys'],
];
// A Google Fonts css2 request written into TS/TSX. Only font-options.ts may
// hold one (the picker map); anywhere else is a second owner of a webfont
// request that neither the canonical-request check nor the live probe reads.
const FONT_PROVIDER_REQUEST_RE = /https?:\/\/fonts\.googleapis\.com\/css2?\?[^\s'"`]*/gi;

// The unsafe patterns a source file must not use to decide "is this a system
// we offer?". Comments are stripped first: prose ABOUT the trap (including the
// warning on the resolver itself) is documentation, not a live test.
function unsafeMembershipTests(src) {
  const stripped = stripComments(String(src));
  return UNSAFE_MEMBERSHIP_TESTS.filter(([re]) => re.test(stripped)).map(([, why]) => why);
}

// Font-provider stylesheet requests a TS/TSX source carries outside comments.
function tsFontProviderRequests(src) {
  return [...stripComments(String(src)).matchAll(FONT_PROVIDER_REQUEST_RE)].map((m) => normalizeSourceUrl(m[0]));
}

function walkFiles(relDir, filePattern) {
  const out = [];
  const stack = [relDir];
  while (stack.length) {
    const rel = stack.pop();
    for (const entry of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      const childRel = `${rel}/${entry.name}`;
      if (entry.isDirectory()) stack.push(childRel);
      else if (filePattern.test(entry.name)) out.push(childRel);
    }
  }
  return out.sort();
}

function walkSourceFiles(relDir) {
  return walkFiles(relDir, /\.tsx?$/);
}

function walkClientMarkupFiles() {
  return walkFiles('client', /\.(?:css|html)$/);
}

// Run a self-contained TS module and hand back its exports. design-system.ts
// imports nothing and guards its only side effect behind `typeof window`, so
// the gate can exercise the shipped functions themselves rather than a
// re-implementation of them — a re-implementation would only ever prove the
// gate agrees with itself.
function loadTsExports(rel, tsSrc) {
  const js = esbuild.transformSync(tsSrc, { loader: 'ts', format: 'cjs' }).code;
  const mod = { exports: {} };
  const require_ = (spec) => {
    throw new Error(`${rel} imports "${spec}" — it must stay self-contained to be executable here`);
  };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, require_);
  return mod.exports;
}

function checkSystemIdResolution(tsSrc, { systemIds, defaultSystemId }) {
  const out = [];
  const bad = (message) => out.push({ kind: 'system-id-resolution', id: 'ds-system', message });

  let exports_;
  try {
    exports_ = loadTsExports(TS_REL, tsSrc);
  } catch (err) {
    return [{ kind: 'parser-rot', id: 'ds-system', message: `could not execute ${TS_REL} to exercise its stored-id resolver: ${err.message}` }];
  }

  const { isSystemId, resolveSystemId } = exports_;
  if (typeof isSystemId !== 'function' || typeof resolveSystemId !== 'function') {
    bad(`${TS_REL} no longer exports both isSystemId() and resolveSystemId() — the one place a stored "ds-system" is judged. Every reader would have to re-derive that test, and the prototype-chain versions of it (\`id in DESIGN_SYSTEMS\`) look correct`);
    return out;
  }

  for (const id of systemIds) {
    if (isSystemId(id) !== true) bad(`isSystemId("${id}") is false, but DESIGN_SYSTEMS in ${TS_REL} offers that system`);
    if (resolveSystemId(id) !== id) bad(`resolveSystemId("${id}") returns "${resolveSystemId(id)}" — an offered system must resolve to itself`);
  }

  for (const key of REJECTED_SAMPLE_IDS) {
    const shown = typeof key === 'string' ? `"${key}"` : String(key);
    if (isSystemId(key) !== false) {
      bad(`isSystemId(${shown}) is true, but nothing declares that system — inherited Object keys and retired ids must fail the test the way the pre-paint boot script's literal id list fails them`);
      continue;
    }
    const resolved = resolveSystemId(key);
    if (resolved !== defaultSystemId) {
      bad(`resolveSystemId(${shown}) returns "${resolved}" instead of DEFAULT_SYSTEM "${defaultSystemId}" — the pre-paint boot script PAINTS such a value as the default, so anything else splits the painted system from the one the app believes is selected`);
    }
  }

  return out;
}

// Every client source: no hand-rolled membership test against DESIGN_SYSTEMS
// (see above), and no Google Fonts request outside the picker map — the shell
// <link> is the one owner of the base font set, and the picker map the one
// owner of overrides, so a URL anywhere else is a request nothing verifies.
function checkSystemIdSources(sourceRels, readSource = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')) {
  const out = [];
  let scanned = 0;
  for (const rel of sourceRels) {
    const src = readSource(rel);
    scanned++;
    for (const why of unsafeMembershipTests(src)) {
      out.push({
        kind: 'system-id-resolution',
        id: rel,
        message: `${rel} decides whether a system id is real with ${why}. Use isSystemId()/resolveSystemId() from ${TS_REL}: a stored "ds-system" is arbitrary text, and this test calls "toString" a valid system — which paints as the default while the app believes junk is selected`,
      });
    }
    if (rel === FONTS_REL) continue;
    for (const href of tsFontProviderRequests(src)) {
      out.push({
        kind: 'font-source-coverage',
        id: rel,
        message: `${rel} carries a font-provider stylesheet request (${href}) — only the always-on <link> in ${HTML_REL} (the design source's canonical set) and FONT_STYLESHEETS in ${FONTS_REL} (picker overrides) may request webfonts; anything else is a second owner nothing probes`,
      });
    }
  }
  if (!scanned) {
    out.push({ kind: 'parser-rot', id: CLIENT_SRC_REL, message: `scanned ZERO source files under ${CLIENT_SRC_REL} — the walker went vacuous` });
  }
  return out;
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
  eq(
    [...parseStylesheetFontEntries('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap').get('inter').ranges],
    [{ min: 400, max: 400 }, { min: 500, max: 500 }, { min: 700, max: 700 }],
    'discrete wght values are read as individual static faces',
  );
  eq(
    stylesheetFamilyCoversWeight(
      parseStylesheetFontEntries('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..800&display=swap'),
      'Fraunces',
      650,
    ),
    true,
    'a variable wght range covers an interior weight',
  );
  eq(
    stylesheetFamilyCoversWeight(
      parseStylesheetFontEntries('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..800&display=swap'),
      'Fraunces',
      850,
    ),
    false,
    'a weight outside a variable range is missing',
  );
  eq(
    stylesheetFamilyCoversWeight(
      parseStylesheetFontEntries('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap'),
      'Instrument Serif',
      400,
    ),
    true,
    'a face with no wght axis is treated as its default 400 face',
  );
  eq(parseStylesheetFamilies('/fonts/self-hosted.css'), [], 'a URL naming no family is reported as unverifiable, not as a match');
  eq(parseStylesheetFamilies('https://example.test/css2?family=Bad%ZZ'), ['Bad%ZZ'], 'a malformed % escape stays literal instead of throwing');
  eq(
    parseCssFontProviderImports(`
      @import url("https://fonts.googleapis.com/css2?family=Inter&display=swap");
      @import 'https://example.test/fonts.css';
      /* @import url("https://fonts.googleapis.com/css2?family=Ghost"); */
    `),
    ['https://fonts.googleapis.com/css2?family=Inter&display=swap'],
    'CSS provider @imports are found while comments and other hosts are ignored',
  );
  eq(
    parseHtmlFontProviderLinks(`
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter&amp;display=swap">
      <link rel="alternate stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader&display=swap">
      <link href=https://fonts.googleapis.com/css2 rel=STYLESHEET>
      <link href="https://fonts.googleapis.com/css2?family=Manrope&display=swap" rel="preload STYLESHEET">
      <link rel="style&#115;heet" data-note="a > b" href="https://fonts.googleapis.com/css2?family=Roboto&amp;display=swap">
      <link rel="stylesheet" href="/local.css">
    `),
    [
      'https://fonts.googleapis.com/css2?family=Inter&display=swap',
      'https://fonts.googleapis.com/css2?family=Newsreader&display=swap',
      'https://fonts.googleapis.com/css2',
      'https://fonts.googleapis.com/css2?family=Manrope&display=swap',
      'https://fonts.googleapis.com/css2?family=Roboto&display=swap',
    ],
    'HTML provider stylesheet links support multi-token rels, unquoted attributes, encoded tokens, and quoted > characters while ignoring non-stylesheets',
  );
  const coveredFontUrl = 'https://fonts.googleapis.com/css2?family=Inter&display=swap';
  eq(
    compareFontSourceCoverage(
      [
        { kind: 'CSS @import', rel: 'client/src/index.css', href: coveredFontUrl },
        { kind: 'HTML stylesheet link', rel: 'client/index.html', href: coveredFontUrl },
      ],
      [coveredFontUrl],
    ),
    [],
    'provider URLs already in the probed source set pass coverage',
  );
  eq(
    compareFontSourceCoverage(
      [{ kind: 'CSS @import', rel: 'client/src/index.css', href: 'https://fonts.googleapis.com/css2?family=Ghost' }],
      [coveredFontUrl],
    ).map((failure) => failure.kind),
    ['font-source-coverage'],
    'a stray CSS provider @import cannot pass without a probed source',
  );
  eq(
    compareFontSourceCoverage(
      [{ kind: 'HTML stylesheet link', rel: 'client/alternate.html', href: 'https://fonts.googleapis.com/css2?family=Ghost' }],
      [coveredFontUrl],
    ).map((failure) => failure.kind),
    ['font-source-coverage'],
    'an unregistered provider link in another HTML entry point cannot pass coverage',
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

  // CSS font-token parsers (:root base + per-system blocks).
  const cssFontSample = [
    ':root {',
    "  --font-body: 'Inter', system-ui, sans-serif;",
    "  --font-display: 'Fraunces', Georgia, serif;",
    "  --font-mono: 'JetBrains Mono', ui-monospace, monospace;",
    '}',
    ':root[data-system="swiss"] {',
    "  --font-body: 'Manrope', system-ui, sans-serif;",
    "  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;",
    '}',
    ':root[data-system="swiss"] .chip { font-family: var(--font-mono); }',
    '/* :root[data-system="ghost"] { --font-body: \'Ghost\', sans-serif; } */',
    '[data-system="swiss"] .eyebrow { font-family: var(--font-mono); }',
  ].join('\n');
  eq(
    [...parseCssRootFonts(cssFontSample)],
    [
      ['--font-display', "'Fraunces', Georgia, serif"],
      ['--font-body', "'Inter', system-ui, sans-serif"],
      ['--font-mono', "'JetBrains Mono', ui-monospace, monospace"],
    ],
    ':root font tokens parsed',
  );
  const parsedSystemFonts = parseCssSystemFonts(cssFontSample);
  eq([...parsedSystemFonts.keys()], ['swiss'], 'per-system blocks parsed; descendant rule and comment ignored');
  eq(
    [...parsedSystemFonts.get('swiss').keys()],
    ['--font-body', '--font-mono'],
    'a token the system does not override is absent, not empty — the cascade decides, not the parser',
  );
  eq(parseCssRootFonts(':root[data-system="swiss"] { --font-body: A; }'), null, 'absent bare :root block is detectable');
  eq(parseCssSystemFonts(':root { --font-body: A; }').size, 0, 'zero per-system blocks is detectable, not an empty pass');

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

  // CSS component-skin parser: live descendant rules only, with source lines.
  const cssSkinSample = [
    ':root[data-system="terminal"] { --bg: #000000; }',
    '[data-system="terminal"] .btn { border-radius: 0; }',
    '[data-system="swiss"] [data-ds="chip"] { border-width: 0.5px; }',
    ':root[data-system="geist"] .card { box-shadow: none; }',
    '[data-system="ghost"] .card { color: pink; }',
    '/* [data-system="commented"] .card { color: red; } */',
  ].join('\n');
  const parsedCssSkins = parseCssSystemSkins(cssSkinSample);
  eq(
    parsedCssSkins.map(({ id }) => id),
    ['terminal', 'swiss', 'geist', 'ghost'],
    'component skins parsed, bare token block and comment ignored',
  );
  eq(
    parsedCssSkins.map(({ line }) => line),
    [2, 3, 4, 5],
    'component skin source lines are preserved for diagnostics',
  );
  const unknownSkinFailures = compareSystemSkins(['terminal', 'swiss', 'geist'], parsedCssSkins);
  eq(unknownSkinFailures.map(({ id }) => id), ['ghost'], 'unknown component skin system is reported');
  eq(
    unknownSkinFailures[0].message.includes('"ghost"') && unknownSkinFailures[0].message.includes('line 5'),
    true,
    'unknown component skin reports its id and source line',
  );
  eq(parseCssSystemSkins(':root[data-system="terminal"] { --bg: #000000; }').length, 0, 'zero component skins is detectable, not an empty pass');

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
  eq(parseTsStringMap(tsSheetSample, 'GHOST_STYLESHEETS').found, false, 'renamed/absent stylesheet map is detectable, not an empty pass');

  // Boot-script system + generated-font consumers.
  const htmlThemeSample = [
    "          var SYSTEMS = ['editorial', 'terminal', 'geist'];",
    "          if (SYSTEMS.indexOf(sys) === -1) sys = 'editorial';",
    `          var FONT_BOOT = ${FONT_BOOT_MARKER};`,
    '          if (!Object.prototype.hasOwnProperty.call(FONT_BOOT.stacks, fnt)) fnt = FONT_BOOT.fallback;',
  ].join('\n');
  eq(
    parseBootSystems(htmlThemeSample),
    { ids: ['editorial', 'terminal', 'geist'], fallback: 'editorial' },
    'boot SYSTEMS allowlist + fallback',
  );
  eq(parseBootSystems('<html></html>'), { ids: null, fallback: null }, 'absent boot SYSTEMS list is detectable');
  const parsedBootFonts = parseBootFonts(htmlThemeSample);
  eq(parsedBootFonts, { found: true, consumesStacks: true, consumesFallback: true }, 'boot FONT_BOOT marker and both generated fields located');
  eq(
    parseBootFonts('<html></html>'),
    { found: false, consumesStacks: false, consumesFallback: false },
    'absent generated FONT_BOOT consumer is detectable',
  );

  const fontRegistryModule = (fallbackExpression = 'FONT_OPTIONS[0].id') => [
    'export const FONT_OPTIONS = [',
    "  { id: 'system', name: 'System default', stack: '' },",
    `  { id: 'inter', name: 'Inter', stack: "'Inter', system-ui, sans-serif" },`,
    '];',
    'export const FONT_BOOT_DATA = {',
    '  stacks: Object.fromEntries(FONT_OPTIONS.map(({ id, stack }) => [id, stack])),',
    `  fallback: ${fallbackExpression},`,
    '};',
  ].join('\n');
  eq(parseFontRegistry(fontRegistryModule()).issues, [], 'font boot data derives ids, stacks, and fallback from FONT_OPTIONS');
  eq(
    parseFontRegistry(fontRegistryModule("'inter'")).issues.some((issue) => issue.includes('FONT_BOOT_DATA is stale')),
    true,
    'stale generated font fallback is caught with an explicit failure',
  );

  // Generated theme boot contract.
  const registryModule = (bootDefaultAccent = 'crimson') => [
    'export const THEME_FALLBACK_REGISTRY = {',
    "  defaultSystem: 'editorial',",
    "  defaultAccent: 'crimson',",
    "  systems: [{ id: 'editorial', name: 'Editorial', tag: 'Magazine', desc: 'Baseline', defaultAccent: 'crimson' }],",
    "  accents: [{ id: 'crimson', name: 'Crimson', primary: '#ff3d52', secondary: '#b84dff' }],",
    '};',
    "export const DESIGN_SYSTEMS = { editorial: { name: 'Editorial', tag: 'Magazine', desc: 'Baseline' } };",
    "export const ACCENTS = [{ id: 'crimson', name: 'Crimson', primary: '#ff3d52', secondary: '#b84dff' }];",
    "export const SYSTEM_DEFAULT_ACCENT = { editorial: 'crimson' };",
    "export const DEFAULT_SYSTEM = 'editorial';",
    "export const DEFAULT_ACCENT = 'crimson';",
    `export const THEME_BOOT_DATA = { systems: ['editorial'], accents: ['crimson'], defaultSystem: 'editorial', defaultAccent: '${bootDefaultAccent}' };`,
  ].join('\n');
  eq(parseThemeRegistry(registryModule()).issues, [], 'theme registry and every derived export agree');
  eq(
    parseThemeRegistry(registryModule('matrix')).issues.some((issue) => issue.includes('THEME_BOOT_DATA is stale')),
    true,
    'stale generated boot data is caught with an explicit failure',
  );
  const generatedHtml = [
    `var THEME_BOOT = ${THEME_BOOT_MARKER};`,
    'THEME_BOOT.systems; THEME_BOOT.accents;',
    'THEME_BOOT.defaultSystem; THEME_BOOT.defaultAccent;',
    `var FONT_BOOT = ${FONT_BOOT_MARKER};`,
    'FONT_BOOT.stacks; FONT_BOOT.fallback;',
  ].join('\n');
  const generatedVite = [
    'import { THEME_BOOT_DATA } from "./client/src/lib/design-system";',
    'import { FONT_BOOT_DATA } from "./client/src/lib/font-options";',
    'function themeBootRegistry() {',
    `  const marker = "${THEME_BOOT_MARKER}";`,
    '  const bootData = JSON.stringify(THEME_BOOT_DATA);',
    '}',
    'function fontBootRegistry() {',
    `  const marker = "${FONT_BOOT_MARKER}";`,
    '  const bootData = JSON.stringify(FONT_BOOT_DATA);',
    '}',
    'const config = { plugins: [themeBootRegistry(), fontBootRegistry()] };',
  ].join('\n');
  eq(checkThemeBootGeneration(generatedHtml, generatedVite), [], 'Vite theme marker generation contract passes');
  eq(
    checkThemeBootGeneration(generatedHtml.replace(THEME_BOOT_MARKER, '{}'), generatedVite)
      .some((issue) => issue.includes('exactly one')),
    true,
    'a missing generation marker fails clearly',
  );
  eq(
    checkThemeBootGeneration(`${generatedHtml}\nvar ACCENTS = ['crimson'];`, generatedVite)
      .some((issue) => issue.includes('hand-maintained')),
    true,
    'a reintroduced hand-maintained boot allowlist fails clearly',
  );

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
  const noMinimalTokenExempt = new Map();
  eq(compareSystemPaint(paintedIds, paintBlocks, baseRootExempt, noMinimalTokenExempt), [], 'a documented base-:root system passes without its own block');
  eq(
    compareSystemPaint(paintedIds, paintBlocks, new Map(), noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'editorial']],
    'an undocumented system with no token block is caught — silence is not an exemption',
  );
  eq(
    compareSystemPaint([...paintedIds, 'ghost'], paintBlocks, baseRootExempt, noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'ghost']],
    'a system added to DESIGN_SYSTEMS without a token block is caught',
  );
  eq(
    compareSystemPaint(paintedIds, new Map([...paintBlocks, ['ghost', '--bg: #111111;']]), baseRootExempt, noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'ghost']],
    'a token block for a system the picker never offers is caught',
  );
  eq(
    compareSystemPaint(paintedIds, new Map([...paintBlocks, ['swiss', '  ']]), baseRootExempt, noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'swiss']],
    'a block that declares nothing is caught, not counted as paint',
  );
  const halfFinishedPaint = compareSystemPaint(
    [...paintedIds, 'ghost'],
    new Map([...paintBlocks, ['ghost', '--bg: #111111;']]),
    baseRootExempt,
    noMinimalTokenExempt,
  );
  eq(
    halfFinishedPaint.map((f) => [f.kind, f.id]),
    [['system-token-contract', 'ghost']],
    'a one-token system is caught by the shared contract',
  );
  eq(
    /--radius/.test(halfFinishedPaint[0].message),
    true,
    'the shared-contract failure names the token the half-finished system forgot',
  );
  eq(
    compareSystemPaint(
      [...paintedIds, 'ghost'],
      new Map([...paintBlocks, ['ghost', '--bg: #111111;']]),
      baseRootExempt,
      new Map([['ghost', 'Written reason: this is intentionally a minimal visual variant']]),
    ),
    [],
    'a deliberately minimal system passes only with a written reason',
  );
  eq(
    compareSystemPaint(paintedIds, new Map([...paintBlocks, ['editorial', '--bg: #000000;']]), baseRootExempt, noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [['base-root-exemption', 'editorial']],
    'an exemption whose system grew its own block is a stale pin',
  );
  eq(
    compareSystemPaint(['terminal', 'swiss'], paintBlocks, baseRootExempt, noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [['base-root-exemption', 'editorial']],
    'an exemption naming a system DESIGN_SYSTEMS dropped is a stale pin',
  );
  eq(
    compareSystemPaint(paintedIds, paintBlocks, new Map([['editorial', '   ']]), noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [
      ['base-root-exemption', 'editorial'],
      ['system-paint', 'editorial'],
    ],
    'a reason-less entry is reported AND excuses nothing',
  );
  const reasonlessMinimal = compareSystemPaint(
    [...paintedIds, 'ghost'],
    new Map([...paintBlocks, ['ghost', '--bg: #111111;']]),
    baseRootExempt,
    new Map([['ghost', '   ']]),
  );
  eq(
    reasonlessMinimal.map((f) => [f.kind, f.id]),
    [
      ['minimal-system-exemption', 'ghost'],
      ['system-token-contract', 'ghost'],
    ],
    'a reason-less minimal entry is reported AND excuses nothing',
  );
  eq(
    compareSystemPaint(
      [...paintedIds, 'ghost'],
      new Map([...paintBlocks, ['ghost', '--bg: #111111; --radius: 2px;']]),
      baseRootExempt,
      new Map([['ghost', 'This used to be intentionally minimal']]),
    ).map((f) => [f.kind, f.id]),
    [['minimal-system-exemption', 'ghost']],
    'a minimal-system exemption is stale once the block satisfies the shared contract',
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
  eq(
    compareDefaultSystemAccent('editorial', 'crimson', goodDefaults),
    [],
    'the default system and first-visit accent agree',
  );
  const defaultSystemAccentDrift = compareDefaultSystemAccent(
    'editorial',
    'crimson',
    new Map([...goodDefaults, ['editorial', 'matrix']]),
  );
  eq(
    defaultSystemAccentDrift.map((f) => [f.kind, f.id]),
    [['system-default-accent', 'editorial']],
    'the default system accent drift is caught',
  );
  eq(/"matrix".*"crimson"/.test(defaultSystemAccentDrift[0].message), true, 'the default-system message names both accent values');
  eq(/first-time visitor/.test(defaultSystemAccentDrift[0].message), true, 'the default-system message names the first-visit consequence');
  eq(
    compareDefaultSystemAccent('editorial', 'crimson', new Map([['terminal', 'matrix']])).map((f) => [f.kind, f.id]),
    [['system-default-accent', 'editorial']],
    'a missing default-system row is also drift',
  );

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

  // HTML shell stylesheet links — the pre-paint face nothing else here sees.
  const htmlLinkSample = [
    '<link rel="preconnect" href="https://fonts.googleapis.com" />',
    '<!-- <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ghost&display=swap" /> -->',
    '    <link rel="stylesheet"',
    '           href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&amp;display=swap" />',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    "<link href='/styles/print.css' rel='stylesheet'>",
  ].join('\n');
  const parsedLinks = parseHtmlStylesheetLinks(htmlLinkSample);
  eq(
    parsedLinks,
    ['https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap', '/styles/print.css'],
    'stylesheet links read across a line break and with reordered/single-quoted attributes; preconnect/icon skipped, commented-out link is not live markup',
  );
  eq(parseStylesheetFamilies(parsedLinks[0]), ['Inter'], 'an &amp;-escaped href still splits into its family= parameters');
  eq(parseHtmlStylesheetLinks('<html><head></head></html>'), [], 'a shell with no stylesheet link is detectable, not an empty pass');

  // CSP parser + stylesheet source comparator. Cover both the legacy inline
  // array form and the shared builder used by the real server.
  const cspSample = [
    'res.setHeader("Content-Security-Policy", [',
    `  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",`,
    `  "font-src 'self' https://fonts.gstatic.com",`,
    '].join("; "));',
    'res.setHeader("Content-Security-Policy", [',
    `  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",`,
    `  "font-src 'self' https://fonts.gstatic.com",`,
    '].join("; "));',
  ].join('\n');
  const parsedCsp = parseCspHostAllowlists(cspSample);
  eq(parsedCsp.headerCount, 2, 'both CSP header blocks located');
  eq(
    parsedCsp.styleSrc.map((entry) => entry.hosts),
    [['https://fonts.googleapis.com'], ['https://fonts.googleapis.com']],
    'style-src hosts parsed from both blocks',
  );
  eq(
    parsedCsp.fontSrc.map((entry) => entry.hosts),
    [['https://fonts.gstatic.com'], ['https://fonts.gstatic.com']],
    'font-src hosts parsed from both blocks',
  );
  eq(compareCspHostAllowlists(parsedCsp), [], 'matching CSP blocks pass');
  const sharedCspSample = [
    'const buildContentSecurityPolicy = (nonce: string): string => [',
    `  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",`,
    `  "font-src 'self' https://fonts.gstatic.com",`,
    '].join("; ");',
    'res.setHeader("Content-Security-Policy", buildContentSecurityPolicy(nonce));',
    'res.setHeader("Content-Security-Policy", buildContentSecurityPolicy(nonce));',
  ].join('\n');
  const parsedSharedCsp = parseCspHostAllowlists(sharedCspSample);
  eq(parsedSharedCsp.headerCount, 2, 'shared CSP builder still covers both header paths');
  eq(
    parsedSharedCsp.styleSrc.map((entry) => entry.hosts),
    [['https://fonts.googleapis.com'], ['https://fonts.googleapis.com']],
    'shared builder style-src hosts parsed for both paths',
  );
  eq(
    parsedSharedCsp.fontSrc.map((entry) => entry.hosts),
    [['https://fonts.gstatic.com'], ['https://fonts.gstatic.com']],
    'shared builder font-src hosts parsed for both paths',
  );
  eq(compareCspHostAllowlists(parsedSharedCsp), [], 'shared CSP builder passes parity checks');
  eq(
    compareCspHostAllowlists(
      parseCspHostAllowlists(
        `res.setHeader("Content-Security-Policy", ["style-src 'self'", "font-src 'self'"].join("; "));`,
      ),
    ).map((f) => f.kind),
    ['parser-rot', 'parser-rot'],
    'CSP directives with zero absolute hosts fail instead of passing vacuously',
  );
  const cspStyleTarget = {
    id: 'font:inter',
    label: 'FONT_STYLESHEETS["inter"]',
    href: 'https://fonts.googleapis.com/css2?family=Inter',
    consequence: 'the face never arrives',
  };
  eq(compareStylesheetCsp([cspStyleTarget], parsedCsp.styleSrc), [], 'a stylesheet host allowed by style-src passes');
  eq(
    compareStylesheetCsp([{ ...cspStyleTarget, href: 'https://fonts.bunny.net/css?family=Inter' }], parsedCsp.styleSrc).map(
      (f) => f.kind,
    ),
    ['stylesheet-csp'],
    'a stylesheet host outside style-src is caught',
  );

  // Served-response parser — what the offline checks structurally cannot see.
  const cssResponseSample = [
    '/* cyrillic */',
    "@font-face { font-family: 'Inter'; font-style: normal; src: url(https://fonts.gstatic.com/s/inter/v20/a.woff2) format('woff2'); }",
    '@font-face {',
    "  font-family: 'Inter';",
    '  font-weight: 700;',
    '}',
    '@font-face { font-family: Instrument Serif; font-weight: 400; }',
  ].join('\n');
  const servedSample = parseServedFamilies(cssResponseSample);
  eq([...servedSample.families].sort(), ['instrument serif', 'inter'], 'every @font-face family read — quoted or bare — and deduped');
  eq(servedSample.blocks, 3, 'every @font-face block counted, multi-line included');
  eq(
    parseServedFontSources(cssResponseSample),
    ['https://fonts.gstatic.com/s/inter/v20/a.woff2'],
    'font file URLs read from each @font-face src declaration',
  );
  eq(
    parseServedFamilies("@font-face { src: url(https://fonts.gstatic.com/a.woff2); }").families.size,
    0,
    'the "//" in a src: url() is never mistaken for a comment, and a block with no font-family names nothing',
  );
  eq(parseServedFamilies('/* @font-face { font-family: Ghost; } */').blocks, 0, 'a commented-out @font-face serves nothing');
  eq(parseServedFamilies('<!DOCTYPE html><html lang=en><head><title>Error 400</title>').blocks, 0, 'an HTML error page declares no face');

  // Probe comparator — every shape a live response can fail in.
  const probeTarget = {
    id: 'font:inter',
    label: 'FONT_STYLESHEETS["inter"]',
    href: 'https://fonts.googleapis.com/css2?family=Inter&display=swap',
    families: ['Inter'],
    consequence: 'the option paints in its fallback face',
  };
  eq(compareServedFamilies(probeTarget, { status: 200, body: cssResponseSample }), [], 'a 200 declaring the requested family passes');
  eq(
    compareServedFontSources(probeTarget, { status: 200, body: cssResponseSample }, parsedCsp.fontSrc),
    [],
    'a served font URL allowed by font-src passes',
  );
  eq(
    compareServedFontSources(
      probeTarget,
      {
        status: 200,
        body: "@font-face { font-family: Inter; src: url('https://fonts.bunny.net/inter.woff2') format('woff2'); }",
      },
      parsedCsp.fontSrc,
    ).map((f) => f.kind),
    ['font-csp'],
    'a served font URL outside font-src is caught',
  );
  eq(
    compareServedFamilies(probeTarget, { status: 400, body: '<!DOCTYPE html><html lang=en>' }).map((f) => f.kind),
    ['webfont-http'],
    'the 400 a family Google does not have earns is caught — the misspelled-on-both-sides bug this probe exists for',
  );
  eq(
    compareServedFamilies(probeTarget, { status: null, body: '', error: 'fetch failed' }).map((f) => f.kind),
    ['webfont-http'],
    'a transport failure is a failure, never a silent skip',
  );
  eq(
    compareServedFamilies(probeTarget, { status: 200, body: '/* nothing at all */' }).map((f) => f.kind),
    ['webfont-empty'],
    'a 200 that serves no @font-face is caught',
  );
  eq(
    compareServedFamilies(probeTarget, { status: 200, body: '@font-face { src: url(a.woff2); }' }).map((f) => f.kind),
    ['webfont-empty'],
    'a 200 whose @font-face blocks declare no family is caught',
  );
  eq(
    compareServedFamilies(probeTarget, { status: 200, body: "@font-face { font-family: 'Inter Tight'; }" }).map((f) => f.kind),
    ['webfont-served-family'],
    'a 200 serving a DIFFERENT family is caught',
  );
  eq(
    compareServedFamilies(
      { ...probeTarget, families: ['Space Grotesk', 'Instrument Serif'] },
      { status: 200, body: cssResponseSample },
    ).map((f) => f.kind),
    ['webfont-served-family'],
    'ONE undelivered family in a multi-family URL is enough to fail',
  );
  eq(
    compareServedFamilies({ ...probeTarget, families: ['inter'] }, { status: 200, body: '@font-face{font-family:INTER;}' }),
    [],
    'served-family matching is case- and quote-insensitive, as CSS is',
  );

  // Comparator — a design system's own --font-* tokens vs the ONE loader that
  // runs for it, the always-on shell links (the #411 bug: a family named
  // everywhere, downloaded nowhere).
  const coverageRoot = new Map([
    ['--font-display', "'Fraunces', Georgia, serif"],
    ['--font-body', "'Inter', system-ui, sans-serif"],
    ['--font-mono', "'JetBrains Mono', ui-monospace, monospace"],
  ]);
  const coverageSystemFonts = new Map([
    [
      'swiss',
      new Map([
        ['--font-display', "'Manrope', system-ui, sans-serif"],
        ['--font-body', "'Manrope', system-ui, sans-serif"],
        ['--font-mono', "'IBM Plex Mono', ui-monospace, monospace"],
      ]),
    ],
  ]);
  const coverageStatic = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Fraunces:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;600&family=Manrope:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
  ];
  const coverageArgs = {
    systemIds: ['editorial', 'swiss'],
    rootFonts: coverageRoot,
    systemFonts: coverageSystemFonts,
    staticHrefs: coverageStatic,
  };
  const withoutFamily = (family) => coverageStatic.map((href) => href.replace(new RegExp(`family=${family}[^&]*&`), ''));
  eq(compareSystemFontCoverage(coverageArgs), [], 'every family a system names is downloaded by the always-on links');
  eq(
    compareSystemFontCoverage({ ...coverageArgs, staticHrefs: withoutFamily('IBM\\+Plex\\+Mono') }).map((f) => [f.kind, f.id]),
    [['system-font-coverage', 'swiss']],
    'the #411 bug: the shell fetches a system\'s body face but not the mono face it names',
  );
  eq(
    /IBM Plex Mono/.test(compareSystemFontCoverage({ ...coverageArgs, staticHrefs: withoutFamily('IBM\\+Plex\\+Mono') })[0].message),
    true,
    'the coverage message names the family that never downloads',
  );
  eq(
    compareSystemFontCoverage({ ...coverageArgs, staticHrefs: [] }).map((f) => [f.kind, f.id]),
    [
      ['system-font-coverage', 'editorial'], ['system-font-coverage', 'editorial'], ['system-font-coverage', 'editorial'],
      ['system-font-coverage', 'swiss'], ['system-font-coverage', 'swiss'], ['system-font-coverage', 'swiss'],
    ],
    'dropping the always-on link leaves every non-generic family of every system uncovered',
  );
  eq(
    compareSystemFontCoverage({
      ...coverageArgs,
      systemFonts: new Map([
        ...coverageSystemFonts,
        ['swiss', new Map([...coverageSystemFonts.get('swiss'), ['--font-mono', 'ui-monospace, monospace']])],
      ]),
      staticHrefs: withoutFamily('IBM\\+Plex\\+Mono'),
    }),
    [],
    'a token whose FIRST family is a generic keyword needs no loader — the exemption is the keyword, not the token',
  );
  eq(
    compareSystemFontCoverage({
      ...coverageArgs,
      systemFonts: new Map([...coverageSystemFonts, ['swiss', new Map([['--font-mono', "'IBM Plex Mono', ui-monospace"]])]]),
      staticHrefs: withoutFamily('Fraunces'),
    }).map((f) => [f.kind, f.id]),
    [['system-font-coverage', 'editorial'], ['system-font-coverage', 'swiss']],
    'a token a system does NOT override inherits :root and still needs the loader to carry it for that system',
  );
  eq(
    compareSystemFontCoverage({ ...coverageArgs, rootFonts: new Map([...coverageRoot].filter(([t]) => t !== '--font-mono')) }).map((f) => [
      f.kind,
      f.id,
    ]),
    [['system-font-token', 'editorial']],
    'a token no block declares fails as unresolvable',
  );
  eq(
    compareSystemFontCoverage({
      ...coverageArgs,
      staticHrefs: [...coverageStatic, 'https://fonts.googleapis.com/css2?family=Geist:wght@400&display=swap'],
    }),
    [],
    'a family the shell carries that no system names is not a coverage failure — the canonical-request check owns the shell\'s contents',
  );
  const requiredWeights = new Map([
    ['editorial', new Map([
      ['--font-display', new Set([400, 500])],
      ['--font-body', new Set([400])],
      ['--font-mono', new Set([400, 600])],
    ])],
    ['swiss', new Map([
      ['--font-display', new Set([400, 700])],
      ['--font-body', new Set([400, 600])],
      ['--font-mono', new Set([400, 500])],
    ])],
  ]);
  eq(
    compareSystemFontCoverage({ ...coverageArgs, requiredWeights }).filter((f) => f.kind === 'system-font-weight'),
    [],
    'all inventoried weights pass when the always-on URL requests them',
  );
  const missingWeight = compareSystemFontCoverage({
    ...coverageArgs,
    requiredWeights,
    staticHrefs: coverageStatic.map((href) => href.replace('Manrope:wght@400;600;700', 'Manrope:wght@400;600')),
  }).filter((f) => f.kind === 'system-font-weight');
  eq(missingWeight.map((f) => [f.kind, f.id]), [['system-font-weight', 'swiss']], 'a single removed static weight is caught');
  eq(/--font-display/.test(missingWeight[0].message) && /weight 700/.test(missingWeight[0].message), true, 'the missing-weight message names token and weight');
  eq(
    compareSystemFontCoverage({
      ...coverageArgs,
      requiredWeights: new Map([['editorial', new Map([['--font-display', new Set([650])]])]]),
      staticHrefs: coverageStatic.map((href) => href.replace('Fraunces:ital,wght@0,400;0,500;1,400', 'Fraunces:opsz,wght@9..144,400..800')),
    }).filter((f) => f.kind === 'system-font-weight'),
    [],
    'a variable range satisfies an inventoried interior weight',
  );
  eq(
    compareSystemFontCoverage({
      ...coverageArgs,
      requiredWeights,
      staticHrefs: [
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Fraunces:ital,wght@0,400;0,500;1,400&family=JetBrains+Mono:wght@400;600&display=swap',
        'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
      ],
    }),
    [],
    'weights and families are merged across every always-on link, not read from the first one only',
  );

  // Comparator — the shell's font request vs the design source's. Byte
  // identity after entity decoding, exactly one link on each side.
  const designHref =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
  eq(compareCanonicalFontRequest([designHref], [designHref]), [], 'an identical request passes');
  eq(compareCanonicalFontRequest([designHref.replace(/&/g, '&amp;')], [designHref]), [], 'HTML entity encoding of & is not a difference');
  eq(
    compareCanonicalFontRequest([designHref.replace('Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600', 'Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400')], [designHref]).map((f) => f.kind),
    ['canonical-font-request'],
    'a different axis subset for one family fails',
  );
  eq(
    /"Fraunces" axes differ/.test(
      compareCanonicalFontRequest([designHref.replace('Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600', 'Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400')], [designHref])[0].message,
    ),
    true,
    'the mismatch message names the family whose axes differ',
  );
  eq(
    /never requests "JetBrains Mono"/.test(compareCanonicalFontRequest([designHref.replace('&family=JetBrains+Mono:wght@400;500;600;700', '')], [designHref])[0].message),
    true,
    'a family the app drops is named',
  );
  eq(
    /requests "Geist", which the design does not/.test(compareCanonicalFontRequest([designHref.replace('&display=swap', '&family=Geist:wght@400&display=swap')], [designHref])[0].message),
    true,
    'a family the app adds is named',
  );
  eq(
    /other parameters differ/.test(compareCanonicalFontRequest([designHref.replace('display=swap', 'display=optional')], [designHref])[0].message),
    true,
    'a non-family parameter difference (display=) is named',
  );
  eq(
    compareCanonicalFontRequest(
      [designHref.replace('family=Inter:wght@400;500;600;700;800&', '').replace('&display=swap', '&family=Inter:wght@400;500;600;700;800&display=swap')],
      [designHref],
    ).map((f) => f.kind),
    ['canonical-font-request'],
    'the same parameters in a different order still fail — byte identity, not set identity',
  );
  eq(
    compareCanonicalFontRequest([designHref, 'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap'], [designHref]).map((f) => f.kind),
    ['canonical-font-request'],
    'a second always-on request is a second owner and fails',
  );
  eq(compareCanonicalFontRequest([], [designHref]).map((f) => f.kind), ['canonical-font-request'], 'no always-on request at all fails');
  eq(compareCanonicalFontRequest([designHref], []).map((f) => f.kind), ['parser-rot'], 'losing the design source href is parser rot, never an empty pass');
  eq(compareCanonicalFontRequest([designHref], [designHref, designHref]).map((f) => f.kind), ['parser-rot'], 'two design hrefs are ambiguous and fail loudly');
  eq(
    parseHtmlFontProviderLinks(
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap" rel="stylesheet">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="./styles.css">',
    ),
    ['https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap'],
    'the design source shape (href before rel, unclosed tags) yields exactly its provider href',
  );

  // Stored-id resolution. The detector EXECUTES the resolver, so its canaries
  // are whole miniature modules — one written safely, one written each of the
  // ways that look right and are not.
  const resolverModule = (test) =>
    [
      "export const DESIGN_SYSTEMS: Record<string, { name: string }> = { editorial: { name: 'E' }, swiss: { name: 'S' } };",
      "export const DEFAULT_SYSTEM = 'editorial';",
      `export function isSystemId(id: string | null | undefined): boolean { return ${test}; }`,
      'export function resolveSystemId(id: string | null | undefined): string { return isSystemId(id) ? (id as string) : DEFAULT_SYSTEM; }',
      "if (typeof window !== 'undefined') { (window as any).DESIGN_SYSTEMS = DESIGN_SYSTEMS; }",
    ].join('\n');
  const resolverArgs = { systemIds: ['editorial', 'swiss'], defaultSystemId: 'editorial' };
  const resolverKinds = (test, args = resolverArgs) => checkSystemIdResolution(resolverModule(test), args).map((f) => f.kind);

  eq(resolverKinds("typeof id === 'string' && Object.prototype.hasOwnProperty.call(DESIGN_SYSTEMS, id)"), [], 'an own-property resolver passes');
  eq(resolverKinds("typeof id === 'string' && Object.hasOwn(DESIGN_SYSTEMS, id)"), [], 'Object.hasOwn is an own-property test too');
  eq(
    resolverKinds('!!id && id in DESIGN_SYSTEMS').length >= INHERITED_KEYS.length,
    true,
    'the `in` operator is caught for EVERY inherited key, not just the first',
  );
  eq(
    checkSystemIdResolution(resolverModule('!!id && id in DESIGN_SYSTEMS'), resolverArgs)[0].message.includes('toString'),
    true,
    'the executed resolver reports the actual value it mishandles',
  );
  eq(resolverKinds('!!id && !!DESIGN_SYSTEMS[id]'), Array(INHERITED_KEYS.length).fill('system-id-resolution'), 'a truthy lookup is caught by execution even though the source never writes `in`');
  eq(
    resolverKinds("typeof id === 'string'"),
    Array(REJECTED_SAMPLE_IDS.filter((k) => typeof k === 'string').length).fill('system-id-resolution'),
    'a resolver that accepts any string at all is caught — by the inherited keys, a retired id, and the empty string alike',
  );
  eq(
    resolverKinds('false'),
    Array(3).fill('system-id-resolution'),
    'a resolver that rejects the systems we DO offer fails too — both offered ids, plus the non-default one no longer resolving to itself',
  );
  eq(
    checkSystemIdResolution("export const DESIGN_SYSTEMS = { editorial: 1 };\nexport const DEFAULT_SYSTEM = 'editorial';", resolverArgs).map((f) => f.kind),
    ['system-id-resolution'],
    'deleting the shared resolver is detectable, not an empty pass',
  );
  eq(
    checkSystemIdResolution("import { helper } from './nope';\nexport const DESIGN_SYSTEMS = { editorial: helper };", resolverArgs).map((f) => f.kind),
    ['parser-rot'],
    'a module this gate can no longer execute FAILs instead of skipping the check',
  );

  // Source scan for the same trap written by hand somewhere else.
  eq(unsafeMembershipTests('if (v in DESIGN_SYSTEMS) return;').length, 1, 'a hand-written `in DESIGN_SYSTEMS` test is caught');
  eq(unsafeMembershipTests('const s = DESIGN_SYSTEMS[id] ? id : DEFAULT_SYSTEM;').length, 1, 'a truthy-lookup ternary is caught');
  eq(unsafeMembershipTests('if (DESIGN_SYSTEMS[id]) load(id);').length, 1, 'a truthy-lookup if is caught');
  eq(unsafeMembershipTests('const name = DESIGN_SYSTEMS[systemId].name;').length, 0, 'reading a system record is not a membership test');
  eq(unsafeMembershipTests('// `id in DESIGN_SYSTEMS` accepts inherited keys').length, 0, 'prose about the trap is documentation, not a live test');
  eq(unsafeMembershipTests('Object.prototype.hasOwnProperty.call(DESIGN_SYSTEMS, id)').length, 0, 'the safe test is not mistaken for the unsafe one');

  // Source scan for a second owner of a webfont request.
  eq(
    tsFontProviderRequests('const href = "https://fonts.googleapis.com/css2?family=Geist:wght@400&display=swap";'),
    ['https://fonts.googleapis.com/css2?family=Geist:wght@400&display=swap'],
    'a css2 request in a string literal is read — the "//" in https is not a comment',
  );
  eq(tsFontProviderRequests('// https://fonts.googleapis.com/css2?family=Geist:wght@400 — prose'), [], 'a URL quoted in a comment is documentation');
  eq(tsFontProviderRequests('<link rel="preconnect" href="https://fonts.googleapis.com" />'), [], 'a preconnect to the host is a hint, not a stylesheet request');
  const fakeSources = new Map([
    ['ok.tsx', 'const name = DESIGN_SYSTEMS[systemId].name;'],
    [FONTS_REL, 'const FONT_STYLESHEETS = { inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap" };'],
  ]);
  eq(checkSystemIdSources([...fakeSources.keys()], (rel) => fakeSources.get(rel)), [], 'clean sources pass, and the picker map may hold requests');
  eq(
    checkSystemIdSources(['second-owner.tsx'], () => 'link.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400&display=swap";').map((f) => f.kind),
    ['font-source-coverage'],
    'a webfont request outside the picker map is a second owner and fails',
  );
  eq(
    checkSystemIdSources(['raw.tsx'], () => 'if (saved in DESIGN_SYSTEMS) apply(saved);').map((f) => f.kind),
    ['system-id-resolution'],
    'a hand-rolled membership test in any source fails',
  );
  eq(checkSystemIdSources([], () => '').map((f) => f.kind), ['parser-rot'], 'scanning no files at all is parser rot, not a pass');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
// Argument handling is strict on purpose: a typo'd flag must never quietly
// downgrade the run to "offline only", which reads exactly like a pass.
const argv = process.argv.slice(2);
const NETWORK = argv.includes('--network');
const unknownArgs = argv.filter((a) => a !== '--network');
if (unknownArgs.length) {
  console.error(`FAIL usage :: unknown argument(s): ${unknownArgs.join(' ')}`);
  console.error('       usage: node scripts/validation/accent-drift.mjs [--network]');
  console.error('       --network adds the opt-in live webfont probe (npm run validate:webfont-fetch).');
  process.exit(2);
}

runCanaries();
console.log('PASS canaries :: every parser, every normalizer, and every comparator verified against known-good/known-bad samples');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const tsSrc = read(TS_REL);
const cssSrc = read(CSS_REL);
const htmlSrc = read(HTML_REL);
const fontsSrc = read(FONTS_REL);
const serverSrc = read(SERVER_REL);
const viteSrc = read(VITE_REL);

const failures = [];
const fail = (kind, message) => failures.push({ kind, message });
const csp = parseCspHostAllowlists(serverSrc);
failures.push(...compareCspHostAllowlists(csp));

const themeRegistry = parseThemeRegistry(tsSrc);
const tsAccents = themeRegistry.accents ?? new Map();
const tsSystems = {
  ids: [...(themeRegistry.systems ?? new Map()).keys()],
  malformed: [],
  found: themeRegistry.found,
};
const defaultSystemId = themeRegistry.defaultSystem ?? null;
const defaultAccentId = themeRegistry.defaultAccent ?? null;
const tsSystemDefaultAccents = {
  accents: themeRegistry.systemDefaultAccents ?? new Map(),
  malformed: [],
  found: themeRegistry.found,
};
const cssAccents = parseCssAccents(cssSrc);

if (!themeRegistry.found) fail('parser-rot', `could not load THEME_FALLBACK_REGISTRY from ${TS_REL}`);
for (const issue of themeRegistry.issues ?? []) fail('boot-registry', issue);
for (const issue of checkThemeBootGeneration(htmlSrc, viteSrc)) fail('boot-generation', issue);

// Parser-rot guards: an empty registry must break the gate LOUDLY rather
// than reduce it to comparing two empty sets.
if (!tsAccents.size) fail('parser-rot', `parsed ZERO accents out of THEME_FALLBACK_REGISTRY in ${TS_REL}`);
if (!cssAccents.size) fail('parser-rot', `parsed ZERO :root[data-accent="…"] blocks out of ${CSS_REL}`);

failures.push(...compareAccents(tsAccents, cssAccents));

// :root's pre-attribute default pair must be DEFAULT_ACCENT's swatch.
const rootDefault = parseCssRootDefault(cssSrc);
if (!defaultAccentId) {
  fail('parser-rot', `THEME_FALLBACK_REGISTRY.defaultAccent is unavailable in ${TS_REL}`);
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

// ---------------------------------------------------------------------------
// Design systems: registry ids/defaults vs the CSS blocks that paint them.
// ---------------------------------------------------------------------------
const cssSystems = parseCssSystems(cssSrc);
const cssSystemSkins = parseCssSystemSkins(cssSrc);

if (!tsSystems.ids.length) fail('parser-rot', `parsed ZERO systems out of THEME_FALLBACK_REGISTRY in ${TS_REL}`);
if (!defaultSystemId) {
  fail('parser-rot', `THEME_FALLBACK_REGISTRY.defaultSystem is unavailable in ${TS_REL}`);
} else if (tsSystems.ids.length && !tsSystems.ids.includes(defaultSystemId)) {
  fail('system-fallback', `DEFAULT_SYSTEM "${defaultSystemId}" in ${TS_REL} is not one of the DESIGN_SYSTEMS entries`);
}

// …and the paint itself: an id both lists agree on still has no LOOK until
// the stylesheet carries its token block (or the bare :root demonstrably
// already paints it, which BASE_ROOT_PAINTED_SYSTEMS must say out loud).
if (!cssSystems.size) {
  fail('parser-rot', `parsed ZERO :root[data-system="…"] token blocks out of ${CSS_REL}`);
} else if (tsSystems.ids.length) {
  failures.push(...compareSystemPaint(tsSystems.ids, cssSystems, BASE_ROOT_PAINTED_SYSTEMS));
}
if (!cssSystemSkins.length) {
  fail('parser-rot', `parsed ZERO component skin rules containing [data-system="…"] out of ${CSS_REL}`);
} else if (tsSystems.ids.length) {
  failures.push(...compareSystemSkins(tsSystems.ids, cssSystemSkins));
}

// ---------------------------------------------------------------------------
// Per-system default accents: SYSTEM_DEFAULT_ACCENT must name every design
// system exactly once, and every accent it names must be a real ACCENTS id.
// ---------------------------------------------------------------------------
if (!tsSystemDefaultAccents.found) {
  fail('parser-rot', `could not derive SYSTEM_DEFAULT_ACCENT from THEME_FALLBACK_REGISTRY in ${TS_REL}`);
} else if (!tsSystemDefaultAccents.accents.size) {
  fail('parser-rot', `parsed ZERO entries out of SYSTEM_DEFAULT_ACCENT in ${TS_REL}`);
}
for (const part of tsSystemDefaultAccents.malformed) {
  fail('parser-rot', `SYSTEM_DEFAULT_ACCENT entry in ${TS_REL} is not a "systemId: 'accentId'" pair: ${part}`);
}
if (tsSystems.ids.length && tsAccents.size && tsSystemDefaultAccents.accents.size) {
  failures.push(...compareSystemDefaultAccents(tsSystems.ids, tsSystemDefaultAccents.accents, [...tsAccents.keys()]));
}
if (defaultSystemId && defaultAccentId && tsSystemDefaultAccents.found) {
  failures.push(...compareDefaultSystemAccent(defaultSystemId, defaultAccentId, tsSystemDefaultAccents.accents));
}

// ---------------------------------------------------------------------------
// Fonts: FONT_OPTIONS is the source of truth for generated pre-paint ids,
// stacks, and fallback.
// ---------------------------------------------------------------------------
const tsFonts = parseTsFontOptions(fontsSrc);
const fontRegistry = parseFontRegistry(fontsSrc, tsFonts);
const bootFonts = parseBootFonts(htmlSrc);
const runtimeFontFallback = tsFonts.order[0] ?? null;

if (!tsFonts.found) fail('parser-rot', `could not locate "export const FONT_OPTIONS … = [ … ];" in ${FONTS_REL}`);
if (!tsFonts.fonts.size) fail('parser-rot', `parsed ZERO options out of FONT_OPTIONS in ${FONTS_REL}`);
for (const obj of tsFonts.malformed) {
  fail('parser-rot', `FONT_OPTIONS entry in ${FONTS_REL} is missing id/stack: ${obj}`);
}
if (!fontRegistry.found) fail('parser-rot', `${FONTS_REL} does not export FONT_BOOT_DATA`);
for (const issue of fontRegistry.issues) fail('font-boot-registry', issue);
if (!bootFonts.found) fail('parser-rot', `could not locate "var FONT_BOOT = ${FONT_BOOT_MARKER}" in ${HTML_REL}`);
if (!bootFonts.consumesStacks) fail('boot-generation', `${HTML_REL} does not consume generated FONT_BOOT.stacks`);
if (!bootFonts.consumesFallback) fail('boot-generation', `${HTML_REL} does not consume generated FONT_BOOT.fallback`);

// ---------------------------------------------------------------------------
// Stylesheets: the maps that actually FETCH the faces the stacks above name.
// A correct stack with no download is invisible — the picker reports the new
// setting, the page keeps rendering in the fallback face.
// ---------------------------------------------------------------------------
const fontSheets = parseTsStringMap(fontsSrc, 'FONT_STYLESHEETS');

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

// ---------------------------------------------------------------------------
// Stored-id resolution: junk resolves to the DEFAULT system, in both halves.
// The same walk also catches a second owner of a webfont request in TS/TSX.
// ---------------------------------------------------------------------------
const clientSourceRels = walkSourceFiles(CLIENT_SRC_REL);
if (!clientSourceRels.length) {
  fail('parser-rot', `walked ZERO .ts/.tsx files under ${CLIENT_SRC_REL} — the source scan went vacuous`);
}
failures.push(...checkSystemIdSources(clientSourceRels));
if (tsSystems.ids.length && defaultSystemId) {
  failures.push(...checkSystemIdResolution(tsSrc, { systemIds: tsSystems.ids, defaultSystemId }));
}

// ---------------------------------------------------------------------------
// The canonical font request: the ONE always-on <link> in the HTML shell must
// be the design source's request, byte for byte (parity W1).
// ---------------------------------------------------------------------------
const staticFontHrefs = parseHtmlStylesheetLinks(htmlSrc);
const staticProviderHrefs = parseHtmlFontProviderLinks(htmlSrc);
let designHtmlSrc = null;
try {
  designHtmlSrc = read(DESIGN_HTML_REL);
} catch (err) {
  fail('parser-rot', `could not read the design source ${DESIGN_HTML_REL} (${err.message}) — the canonical font request cannot be verified without it`);
}
const designFontHrefs = designHtmlSrc === null ? [] : parseHtmlFontProviderLinks(designHtmlSrc);
if (designHtmlSrc !== null) failures.push(...compareCanonicalFontRequest(staticProviderHrefs, designFontHrefs));

// ---------------------------------------------------------------------------
// Font coverage: a --font-* token is a declaration, not a download (#411).
// Every family a design system NAMES has to be fetched by the always-on
// request above — the only loader that runs for a system.
// ---------------------------------------------------------------------------
const cssRootFonts = parseCssRootFonts(cssSrc);
const cssSystemFonts = parseCssSystemFonts(cssSrc);
const clientMarkupRels = walkClientMarkupFiles();
const clientCssRels = clientMarkupRels.filter((rel) => rel.endsWith('.css'));
const clientHtmlRels = clientMarkupRels.filter((rel) => rel.endsWith('.html'));
const discoveredFontSources = [];
for (const rel of clientCssRels) {
  for (const href of parseCssFontProviderImports(read(rel))) {
    discoveredFontSources.push({ kind: 'CSS @import', rel, href });
  }
}
for (const rel of clientHtmlRels) {
  for (const href of parseHtmlFontProviderLinks(read(rel))) {
    discoveredFontSources.push({ kind: 'HTML stylesheet link', rel, href });
  }
}
if (!clientCssRels.length) {
  fail('parser-rot', 'walked ZERO .css files under client/ — the font-source coverage scan went vacuous');
}
if (!clientHtmlRels.length) {
  fail('parser-rot', 'walked ZERO .html entry points under client/ — the font-source coverage scan went vacuous');
}
const stylesheetCspTargets = [
  ...[...fontSheets.entries].map(([id, href]) => ({
    id: `font:${id}`,
    label: `FONT_STYLESHEETS["${id}"] in ${FONTS_REL}`,
    href,
    consequence: `choosing font option "${id}" keeps rendering in the fallback face`,
  })),
  ...staticFontHrefs.map((href, index) => ({
    id: `html:pre-paint:${index + 1}`,
    label: `pre-paint <link rel="stylesheet"> #${index + 1} in ${HTML_REL}`,
    href,
    consequence: 'the first paint uses the next family in the stack, for every system',
  })),
];
failures.push(...compareFontSourceCoverage(discoveredFontSources, [...fontSheets.entries.values(), ...staticFontHrefs]));
failures.push(...compareStylesheetCsp(stylesheetCspTargets, csp.styleSrc));

if (!cssRootFonts) {
  fail('parser-rot', `could not locate the bare ":root { … }" token block in ${CSS_REL} to read its --font-* declarations`);
} else if (!cssRootFonts.size) {
  fail('parser-rot', `parsed ZERO of ${FONT_TOKENS.join('/')} out of the :root block in ${CSS_REL}`);
}
if (!cssSystemFonts.size) {
  fail('parser-rot', `parsed ZERO :root[data-system="…"] token blocks out of ${CSS_REL}`);
}
if (!staticFontHrefs.length) {
  fail('parser-rot', `could not locate any always-on <link rel="stylesheet"> in ${HTML_REL} — the pre-paint font loader cannot be verified`);
}
if (cssRootFonts?.size && tsSystems.ids.length) {
  failures.push(
    ...compareSystemFontCoverage({
      systemIds: tsSystems.ids,
      rootFonts: cssRootFonts,
      systemFonts: cssSystemFonts,
      staticHrefs: staticFontHrefs,
    }),
  );
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f.kind} :: ${f.message}`);
  console.error(`\n${failures.length} theme-drift failure(s).`);
  console.error(`       Theme ids/defaults come from THEME_FALLBACK_REGISTRY in ${TS_REL};`);
  console.error(`       ${VITE_REL} must inject its derived THEME_BOOT_DATA into ${HTML_REL}.`);
  console.error(`       ${VITE_REL} must also inject FONT_OPTIONS-derived FONT_BOOT_DATA from`);
  console.error(`       ${FONTS_REL}; picker swatches still mirror the paint in ${CSS_REL}.`);
  console.error('       A stack is only half of a webfont: the always-on <link> in');
  console.error(`       ${HTML_REL} (the design source's canonical request, byte for byte)`);
  console.error(`       and FONT_STYLESHEETS in ${FONTS_REL} are what fetch the face, so a`);
  console.error('       stylesheet fix has to land with every stack fix.');
  if (NETWORK) {
    console.error('\n       --network probe SKIPPED: there is no point asking the network about');
    console.error('       URLs this repo already disagrees with itself about. Fix the above, rerun.');
  }
  process.exit(1);
}

console.log(`PASS boot-generation :: ${tsSystems.ids.length} system id(s), ${tsAccents.size} accent id(s), and both fallbacks are generated from THEME_FALLBACK_REGISTRY into the inline pre-paint script`);
console.log(`PASS id-parity :: ${tsAccents.size} accent(s) present in THEME_FALLBACK_REGISTRY, derived ACCENTS, and :root[data-accent] blocks`);
for (const [id, v] of tsAccents) console.log(`       ${id.padEnd(8)} ${v.primary} / ${v.secondary}`);
console.log(`PASS root-default :: :root paints DEFAULT_ACCENT "${defaultAccentId}" (${rootDefault.primary} / ${rootDefault.secondary})`);
console.log(
  `PASS system-parity :: ${tsSystems.ids.length} system(s) present in THEME_FALLBACK_REGISTRY and derived DESIGN_SYSTEMS — ${tsSystems.ids.join(', ')} (fallback "${defaultSystemId}")`,
);
console.log(
  `PASS system-paint :: ${cssSystems.size} :root[data-system="…"] token block(s) — ${[...cssSystems.keys()].join(', ')}; painted by the bare :root instead: ${[...BASE_ROOT_PAINTED_SYSTEMS.keys()].join(', ') || '(none)'}`,
);
const sharedTokenPeers = tsSystems.ids.filter(
  (id) => cssSystems.has(id) && !BASE_ROOT_PAINTED_SYSTEMS.has(id) && !MINIMAL_TOKEN_SYSTEMS.has(id),
);
const sharedTokenContract = sharedSystemTokens(sharedTokenPeers, cssSystems).tokens;
console.log(
  `PASS system-tokens :: ${sharedTokenContract.size} shared token(s) agreed by ${sharedTokenPeers.length} peer block(s); every non-exempt system declares them`,
);
console.log(
  `PASS system-skin :: ${cssSystemSkins.length} component skin rule(s) name only offered systems — ${[...new Set(cssSystemSkins.map(({ id }) => id))].join(', ')}`,
);
console.log(
  `PASS system-accent :: every design system names a default accent that exists — ${[...tsSystemDefaultAccents.accents]
    .map(([system, accent]) => `${system}→${accent}`)
    .join(', ')}`,
);
console.log(
  `PASS system-default-accent :: DEFAULT_SYSTEM "${defaultSystemId}" and DEFAULT_ACCENT "${defaultAccentId}" agree with SYSTEM_DEFAULT_ACCENT`,
);
console.log(`PASS font-boot-registry :: ${tsFonts.fonts.size} font option id(s), stacks, and fallback "${runtimeFontFallback}" are generated from FONT_OPTIONS into the inline pre-paint script`);
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
  `PASS canonical-font-request :: the one always-on <link rel="stylesheet"> in ${HTML_REL} is byte-identical to the design source's request in ${DESIGN_HTML_REL} — ${describeCss2Href(staticProviderHrefs[0])
    .families.size} families: ${[...describeCss2Href(staticProviderHrefs[0]).families].map(([family, spec]) => `${family}${spec ? `:${spec}` : ''}`).join(', ')}`,
);
console.log(
  `PASS font-csp :: ${stylesheetCspTargets.length} stylesheet URL(s) are allowed by style-src; ${csp.styleSrc.length} style-src and ${csp.fontSrc.length} font-src directive(s) agree across ${csp.headerCount} CSP block(s) in ${SERVER_REL}`,
);
console.log(
  `PASS font-source-coverage :: ${discoveredFontSources.length} provider stylesheet reference(s) across ${clientCssRels.length} CSS file(s) and ${clientHtmlRels.length} HTML entry point(s) are already represented by a probed source; ${clientSourceRels.length} TS/TSX file(s) carry no webfont request outside FONT_STYLESHEETS`,
);
const alwaysOnFamilies = staticFontHrefs.flatMap(parseStylesheetFamilies);
console.log(
  `PASS system-id-resolution :: the shipped resolver was executed — every offered id resolves to itself, and ${INHERITED_KEYS.map((k) => `"${k}"`).join(', ')}, a retired id, "" and null all resolve to "${defaultSystemId}"; ${clientSourceRels.length} client source file(s) use no prototype-chain membership test`,
);
console.log(
  `PASS system-font-coverage :: every family named by ${FONT_TOKENS.join(' / ')} is carried by the always-on request, for every system`,
);
console.log(`       always-on (${HTML_REL}, pre-paint, every visitor) ${alwaysOnFamilies.join(' + ') || '(none)'}`);
for (const id of [...tsSystems.ids].sort()) {
  const asked = [...effectiveSystemFonts(id, cssRootFonts, cssSystemFonts)]
    .map(([token, { value }]) => `${token.replace('--font-', '')}=${stackFamilies(value ?? '')[0] ?? '?'}`)
    .join(' ');
  console.log(`       ${id.padEnd(10)} ${asked}`);
}
console.log('\nPASS accent-drift :: the generated pre-paint theme/font registries, picker swatches, painted tokens, and stylesheets all agree');

// ---------------------------------------------------------------------------
// Live webfont probe — opt-in, and never from the registered gate
// ---------------------------------------------------------------------------
// The registered `accent-drift` validation command runs this file with no
// arguments and stops here: the validation suite stays offline, so no Google
// Fonts outage or egress proxy can fail an unrelated change.
if (!NETWORK) {
  console.log('\nNOTE  the live webfont probe did NOT run (offline by default, and not registered as a gate).');
  console.log('       Every check above compares one file in this repo against another, so a family');
  console.log('       misspelled in BOTH a stack and its URL agrees with itself and passes here while');
  console.log('       fonts.googleapis.com answers 400 and the face never arrives.');
  console.log('       After editing any font URL, run:  npm run validate:webfont-fetch');
  process.exit(0);
}

const probeFailures = [];
const targets = [];

// 1 · the pre-paint <link> in the HTML shell — fetched by the shell itself,
//     so neither stylesheet map (nor any check above) covers it.
const shellLinks = parseHtmlStylesheetLinks(htmlSrc);
const shellHttpLinks = shellLinks.filter((href) => /^https?:\/\//i.test(href));
if (!shellHttpLinks.length) {
  probeFailures.push({
    kind: 'parser-rot',
    message: `found ZERO absolute <link rel="stylesheet"> hrefs in ${HTML_REL} (${shellLinks.length} stylesheet link(s) total) — either the pre-paint body face is no longer fetched before first paint, or parseHtmlStylesheetLinks() needs teaching about the new markup`,
  });
}
for (const href of shellHttpLinks) {
  targets.push({
    id: 'html:pre-paint',
    label: `the pre-paint <link rel="stylesheet"> in ${HTML_REL}`,
    href,
    families: parseStylesheetFamilies(href),
    consequence: 'every page, on every system, paints in the next family of the stack instead of the primary face',
  });
}

// 2 · the picker's per-option faces. (Design systems have no stylesheet of
//     their own: the shell link above carries every family they name.)
for (const [id, href] of fontSheets.entries) {
  targets.push({
    id: `font:${id}`,
    label: `FONT_STYLESHEETS["${id}"] in ${FONTS_REL}`,
    href,
    families: parseStylesheetFamilies(href),
    consequence: `choosing font option "${id}" reports the new setting and keeps rendering in the fallback face — the page just looks unchanged`,
  });
}
// A URL naming no family is unverifiable, not agreement: there is nothing to
// hold the response to. (FONT_STYLESHEETS already fails that offline; the
// shell link has no such check.)
const verifiable = [];
for (const target of targets) {
  if (!target.families.length) {
    probeFailures.push({
      kind: 'webfont-unverifiable',
      id: target.id,
      message: `${target.label} → ${target.href} names no family= parameter, so what it is supposed to serve cannot be checked against what it does serve — teach parseStylesheetFamilies() the new URL shape rather than leaving the entry unprobed`,
    });
    continue;
  }
  verifiable.push(target);
}

console.log(`\nPROBE webfont-fetch :: requesting ${verifiable.length} stylesheet URL(s) live (opt-in --network)`);
const responses = await fetchAllStylesheets(verifiable);
for (let i = 0; i < verifiable.length; i++) {
  const target = verifiable[i];
  const response = responses[i];
  probeFailures.push(...compareServedFamilies(target, response));
  probeFailures.push(...compareServedFontSources(target, response, csp.fontSrc));
  const served = response.status === 200 ? parseServedFamilies(response.body) : { families: new Set(), blocks: 0 };
  const status = response.error ? `ERR(${response.error})` : String(response.status);
  console.log(
    `       ${target.id.padEnd(18)} ${status.padEnd(4)} asks ${target.families.join(' + ')} · serves ${
      served.families.size ? [...served.families].join(' + ') : '(nothing)'
    } (${served.blocks} @font-face)`,
  );
}

if (probeFailures.length) {
  for (const f of probeFailures) console.error(`FAIL ${f.kind} :: ${f.message}`);
  console.error(`\n${probeFailures.length} live webfont failure(s).`);
  console.error(`       These URLs are what actually download the faces ${FONTS_REL} and`);
  console.error(`       ${HTML_REL} promise. A URL that 400s, or answers 200 without the`);
  console.error('       family it was asked for, leaves the page rendering in a fallback face with');
  console.error('       nothing in the UI to notice — check the family spelling against');
  console.error('       fonts.google.com before assuming the network is at fault.');
  process.exit(1);
}

console.log(
  `\nPASS webfont-fetch :: ${verifiable.length} stylesheet URL(s) each answered HTTP 200, declared every requested family, and served font files allowed by font-src`,
);
