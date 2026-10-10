#!/usr/bin/env node
// Theme drift gate (tasks #377, #388, #399, #429, parity W1 fonts).
//
// The design system is the verbatim pair served at /ds/*:
// client/public/ds/design-system.css (tokens + component skins) and
// client/public/ds/design-system.js (window.DESIGN_SYSTEMS / ACCENTS /
// SYSTEM_DEFAULT_ACCENT and applyDesignSystem(), which writes each system's
// vars and the accent pair INLINE on <html>). Neither file is ever edited.
// client/index.html loads both synchronously and runs an inline boot that
// calls the applier before React loads; Vite replaces markers with boot data
// derived from the TS sources. This gate verifies every contract around that
// pair plus the font mirrors.
//
// Sources compared:
//   1 · design-system.js   (evaluated, never regex-parsed, through
//        readCanonicalRegistry() in scripts/generate-design-system-artifact.mjs)
//        — the ONE copy of systems, accents and per-system default accents
//   2 · design-system.ts   the typed wrapper: restates no table, its getters
//        return the window globals, DEFAULT_SYSTEM/DEFAULT_ACCENT are the
//        applier's own fallbacks, and the storage keys the choice persists under
//   3 · design-system.css  :root → the pre-apply default pair, which must be
//        DEFAULT_ACCENT's swatch, and the pre-apply tokens, compared with
//        DEFAULT_SYSTEM's vars (see default-prepaint)
//   4 · client/index.html  /ds/design-system.css + /ds/design-system.js load
//        synchronously ahead of the inline boot, which reads only the
//        canonical globals and takes its storage keys + fallback system from
//        the wrapper (THEME_BOOT_DATA via the Vite marker, or literally)
//   5 · app stylesheets    client/**/*.css (minus the canonical sheet, incl.
//        client/src/styles/app-bridge.css), shared/styles/**/*.css and the
//        index.html <style> — none may re-key or redeclare the accent the
//        applier paints inline
//   6 · DESIGN_SYSTEMS[id].vars — every offered system paints from a
//        non-empty vars table that carries the tokens its peers agree on
//   7 · [data-system="…"] selectors in the canonical sheet AND every app
//        sheet ↔ DESIGN_SYSTEMS — a rule for a retired system is dead CSS
//   8 · font-options.ts    FONT_OPTIONS (id + stack; its own header calls
//        itself the source of truth)  ↔  FONT_BOOT_DATA generated from it +
//        the id it falls back to, which must be the option
//        applyFontOverride() falls back to at runtime (FONT_OPTIONS[0])
//   9 · design-system.js   SYSTEM_DEFAULT_ACCENT  ↔  DESIGN_SYSTEMS + ACCENTS:
//        the accent a system is meant to arrive with. The boot and the
//        wrapper's selectSystem() read it, so a system with no entry keeps
//        whatever accent happens to be active instead of its own look, and an
//        entry naming an accent that is not in ACCENTS makes the applier paint
//        ACCENTS[0] while data-accent claims something else
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
//  12 · design-system.js   the --font-display / --font-body / --font-mono a
//        system's vars declare (falling back to the canonical :root)  ↔  the
//        only loader that runs for that system:
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
//   · boot-registry  — design-system.ts exports its own DESIGN_SYSTEMS /
//     ACCENTS / SYSTEM_DEFAULT_ACCENT / THEME_FALLBACK_REGISTRY / scales, or
//     hard-codes a canonical accent color; a getter (executed against a
//     stand-in window) serves a copy instead of the global; DEFAULT_SYSTEM /
//     DEFAULT_ACCENT differ from applyDesignSystem()'s own fallbacks; or the
//     canonical registry is structurally incomplete (registryStructureIssues)
//   · boot-generation — /ds/design-system.css is not linked exactly once
//     unconditionally; /ds/design-system.js is missing, async/defer/module,
//     or loads after the boot; the boot is outside <head>, never calls the
//     applier, skips a canonical global, hard-codes a canonical id, tests
//     membership through the prototype chain, or reads storage keys /
//     falls back to a system other than the wrapper's (marker form: the
//     marker, the Vite serialization and THEME_BOOT_DATA's values)
//   · accent-paint   — the applier stops painting --accent/--accent-2 from
//     primary/secondary, an accent value is not a CSS color, or an app
//     stylesheet has a [data-accent] rule or declares --accent/--accent-2
//     (replaces the retired id-parity/swatch-value pair: the
//     :root[data-accent] blocks they compared no longer exist by design)
//   · root-default   — the canonical :root --accent/--accent-2 ≠ DEFAULT_ACCENT's pair
//   · system-fallback— DEFAULT_SYSTEM is not one of DESIGN_SYSTEMS
//   · system-paint   — an offered system with no or empty vars, or vars for a
//     system the picker never offers
//   · default-prepaint — (replaces the retired base-root-exemption) a token
//     DEFAULT_SYSTEM's vars declare that the canonical :root paints
//     differently before the applier runs. Reported as a NOTE while
//     boot-generation holds (the applier writes it inline in <head>, ahead
//     of first paint, so the difference never reaches a screen); a FAILURE
//     when the boot contract is broken
//   · system-skin    — a [data-system="…"] rule in the canonical sheet or any
//     app sheet names a system DESIGN_SYSTEMS does not offer
//   · system-token-contract — a system's vars miss one or more custom
//     properties its established peers agree on; every missing token is named
//   · minimal-system-exemption — the reason-carrying escape hatch for an
//     intentionally small token set has no reason, names an unoffered system,
//     or stayed pinned after the vars grew to satisfy the shared contract
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
// For a design system the families are read from its vars, never from the
// DESIGN_SYSTEMS `tag` beside each id: that tag is picker copy, not a family
// list ("Modern · Geist Sans" for the Geist family, and Brutalist names one
// of its two faces). The authoritative list is the --font-display /
// --font-body / --font-mono in DESIGN_SYSTEMS[id].vars, falling back
// token-by-token to the canonical :root exactly as the cascade does. A token's FIRST family is the face the design asks
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
  sharedSystemTokens,
  validateMinimalTokenSystems,
} from './design-system-token-contract.mjs';
import {
  APP_BRIDGE_PATH,
  CANONICAL_CSS_PATH,
  CANONICAL_REGISTRY_PATH,
  applierFallbacks,
  applierPaintsAccentPair,
  readCanonicalRegistry,
  registryStructureIssues,
} from '../generate-design-system-artifact.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TS_REL = 'client/src/lib/design-system.ts';
// The verbatim design-system pair served at /ds/*: the canonical sheet and
// the registry + applier. Never edited; everything here is checked against it.
const CSS_REL = CANONICAL_CSS_PATH;
const REGISTRY_REL = CANONICAL_REGISTRY_PATH;
const BRIDGE_REL = APP_BRIDGE_PATH;
const CANONICAL_CSS_HREF = '/ds/design-system.css';
const CANONICAL_JS_HREF = '/ds/design-system.js';
const HTML_REL = 'client/index.html';
const FONTS_REL = 'client/src/lib/font-options.ts';
const SERVER_REL = 'server/index.ts';
const VITE_REL = 'vite.config.ts';
// App stylesheets: everything the SPA loads besides the canonical sheet.
const APP_SHEET_DIRS = ['client', 'shared/styles'];

// ---------------------------------------------------------------------------
// Escape hatch: systems intentionally using a deliberately minimal token set
// ---------------------------------------------------------------------------
// A system may intentionally share most of the default look, but that choice
// must be recorded in the shared MINIMAL_TOKEN_SYSTEMS table imported above
// with a written reason. The reasoned entry excuses only the shared-token
// contract below; it never excuses empty vars, an unoffered id, or a stale pin.
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
  const duplicates = [];
  for (const part of splitTopLevel(stripComments(body))) {
    const m = OBJECT_ENTRY_RE.exec(part);
    if (!m) {
      malformed.push(part.replace(/\s+/g, ' ').slice(0, 120));
      continue;
    }
    const key = m[2] ?? m[3];
    // A duplicate key collapses before any parity check can see it: a JS
    // object literal keeps the LAST value, so first-wins elsewhere disagrees.
    if (entries.has(key)) {
      duplicates.push(key);
      continue;
    }
    entries.set(key, m[4].trim());
  }
  return { entries, malformed, duplicates };
}

// Same, restricted to string-valued entries. A non-string value (a computed
// key, a nested object) is reported as malformed rather than skipped.
function parseObjectStringEntries(body) {
  const { entries, malformed, duplicates } = parseObjectEntries(body);
  const strings = new Map();
  for (const [key, raw] of entries) {
    const m = STRING_LITERAL_RE.exec(raw);
    if (!m) {
      malformed.push(`${key}: ${raw.replace(/\s+/g, ' ').slice(0, 80)}`);
      continue;
    }
    strings.set(key, unescapeLiteral(m[2]));
  }
  return { entries: strings, malformed, duplicates };
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

// FONT_OPTIONS: FontOption[] in font-options.ts. Order is kept because
// applyFontOverride() falls back to FONT_OPTIONS[0] for an unknown id, which
// is the value the boot script's own fallback has to agree with. `stack` is
// read with the quote-tolerant field reader ('' is a legitimate stack — the
// "System default" option — and must never be confused with a missing field).
function parseTsFontOptions(fontsSrc) {
  const m = /export\s+const\s+FONT_OPTIONS\s*(?::[^=]*)?=\s*\[([\s\S]*?)\n\];/.exec(fontsSrc);
  if (!m) return { fonts: new Map(), order: [], malformed: [], duplicates: [], found: false };
  const body = stripComments(m[1]);
  const fonts = new Map();
  const order = [];
  const malformed = [];
  // Duplicate ids are rejected BEFORE the map is built: Map.set would keep the
  // last stack, Object.fromEntries (FONT_BOOT_DATA) the last, but the runtime
  // applyFontOverride() uses FONT_OPTIONS.find() — the FIRST. Boot and runtime
  // would then paint different faces for one stored id.
  const duplicates = [];
  for (const objMatch of body.matchAll(/\{[^{}]*\}/g)) {
    const obj = objMatch[0];
    const id = stringField(obj, 'id');
    const stack = stringField(obj, 'stack');
    if (!id || stack === null) {
      malformed.push(obj.replace(/\s+/g, ' ').slice(0, 120));
      continue;
    }
    if (fonts.has(id)) {
      duplicates.push({ id, first: fonts.get(id), duplicate: stack });
      continue;
    }
    fonts.set(id, stack);
    order.push(id);
  }
  return { fonts, order, malformed, duplicates, found: true };
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
  if (!m) return { entries: new Map(), malformed: [], duplicates: [], found: false };
  const { entries, malformed, duplicates } = parseObjectStringEntries(m[1]);
  return { entries, malformed, duplicates, found: true };
}

const THEME_BOOT_MARKER = '__AWESOME_VIDEO_THEME_BOOT__';
const FONT_BOOT_MARKER = '__AWESOME_VIDEO_FONT_BOOT__';

// ---------------------------------------------------------------------------
// Canonical registry readers
// ---------------------------------------------------------------------------
// The five systems, ten accents and SYSTEM_DEFAULT_ACCENT live ONLY in the
// verbatim /ds/design-system.js. It is evaluated (never regex-parsed) through
// readCanonicalRegistry() from the artifact generator, so the gate sees the
// exact tables the browser gets.

// Every custom property declared by the top-level bare `:root { … }` blocks
// of a stylesheet, in cascade order (a later declaration wins). This is what
// paints <html> before applyDesignSystem() writes its inline tokens.
function parseCssRootTokens(cssSrc) {
  const src = stripComments(cssSrc);
  const blocks = [...src.matchAll(/^[ \t]*:root\s*\{([^}]*)\}/gm)];
  if (!blocks.length) return null;
  const out = new Map();
  for (const [, body] of blocks) {
    for (const m of body.matchAll(/(?:^|[\s;{])(--[\w-]+)\s*:\s*([^;}]+)/g)) out.set(m[1], m[2].trim());
  }
  return out;
}

// DESIGN_SYSTEMS[id].vars rendered as a declaration body, so the shared token
// contract (written against CSS block bodies) judges the inline paint the
// applier actually performs.
function registrySystemBlocks(systems) {
  const out = new Map();
  for (const [id, system] of Object.entries(systems ?? {})) {
    const vars = system?.vars && typeof system.vars === 'object' ? system.vars : {};
    out.set(id, Object.entries(vars).map(([name, value]) => `${name}: ${value};`).join(' '));
  }
  return out;
}

// The --font-* tokens each system's vars declare. A token a system leaves out
// is ABSENT (the canonical :root decides), never empty.
function registrySystemFonts(systems) {
  const out = new Map();
  for (const [id, system] of Object.entries(systems ?? {})) {
    const fonts = new Map();
    for (const token of FONT_TOKENS) {
      const value = system?.vars?.[token];
      if (typeof value === 'string') fonts.set(token, value);
    }
    out.set(id, fonts);
  }
  return out;
}

// The storage keys design-system.ts persists the choice under. They are
// module-private consts, so they are read from the source by name.
function parseStorageKeys(tsSrc) {
  const src = stripComments(tsSrc);
  const key = (name) => new RegExp(`\\bconst\\s+${name}\\s*(?::[^=]+)?=\\s*(['"\`])([^'"\`]+)\\1`).exec(src)?.[2] ?? null;
  return { system: key('SYSTEM_STORAGE_KEY'), accent: key('ACCENT_STORAGE_KEY') };
}

// Tables the wrapper must never restate: the canonical file owns them.
const RESTATED_TABLE_RE = /\bexport\s+(?:const|let|var|function)\s+(DESIGN_SYSTEMS|ACCENTS|SYSTEM_DEFAULT_ACCENT|THEME_FALLBACK_REGISTRY|TYPE_SCALE|SPACE_SCALE)\b/g;

// Run design-system.ts with a stand-in `window` carrying the canonical tables.
// Its readers resolve `window` at CALL time, so the stand-in has to stay in
// place while `fn` runs; it is always removed afterwards.
function withCanonicalWindow(registry, fn) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const previous = globalThis.window;
  globalThis.window = {
    DESIGN_SYSTEMS: registry?.systems,
    ACCENTS: registry?.accents,
    SYSTEM_DEFAULT_ACCENT: registry?.systemDefaultAccents,
    TYPE_SCALE: registry?.typeScale,
    SPACE_SCALE: registry?.spaceScale,
    applyDesignSystem: () => {},
  };
  try {
    return fn(globalThis.window);
  } finally {
    if (had) globalThis.window = previous;
    else delete globalThis.window;
  }
}

// boot-registry: design-system.ts is a typed wrapper over the canonical
// globals. It restates no table, its getters return the globals themselves,
// its defaults are the applier's own fallbacks, and the registry it wraps is
// structurally complete.
function checkRuntimeWrapper(tsSrc, registry, registrySource) {
  const issues = [];
  const stripped = stripComments(tsSrc);
  for (const m of stripped.matchAll(RESTATED_TABLE_RE)) {
    issues.push(`${TS_REL} exports its own ${m[1]} — the table lives only in ${REGISTRY_REL}; read window.${m[1] === 'THEME_FALLBACK_REGISTRY' ? 'DESIGN_SYSTEMS/ACCENTS' : m[1]} through the getters instead`);
  }
  for (const accent of Array.isArray(registry?.accents) ? registry.accents : []) {
    for (const field of ['primary', 'secondary']) {
      const value = String(accent?.[field] ?? '');
      if (/^#[0-9a-f]{3,8}$/i.test(value) && new RegExp(`${value}(?![0-9a-f])`, 'i').test(stripped)) {
        issues.push(`${TS_REL} hard-codes accent "${accent.id}" ${field} ${value} — a second copy of ${REGISTRY_REL}'s ACCENTS that nothing keeps in sync`);
      }
    }
  }
  for (const issue of registryStructureIssues(registry ?? {})) issues.push(`${REGISTRY_REL}: ${issue}`);

  let exports_;
  try {
    exports_ = loadTsExports(TS_REL, tsSrc);
  } catch (err) {
    return { found: false, issues: [...issues, `could not execute ${TS_REL}: ${err.message}`] };
  }

  withCanonicalWindow(registry, (win) => {
    for (const [getter, global] of [
      ['getDesignSystems', 'DESIGN_SYSTEMS'],
      ['getAccents', 'ACCENTS'],
      ['getSystemDefaultAccents', 'SYSTEM_DEFAULT_ACCENT'],
    ]) {
      if (typeof exports_[getter] !== 'function') {
        issues.push(`${TS_REL} no longer exports ${getter}() — the one typed reader of window.${global}`);
      } else if (exports_[getter]() !== win[global]) {
        issues.push(`${getter}() in ${TS_REL} does not return window.${global} itself — it serves a copy that can drift from ${REGISTRY_REL}`);
      }
    }
  });

  const defaultSystem = typeof exports_.DEFAULT_SYSTEM === 'string' ? exports_.DEFAULT_SYSTEM : null;
  const defaultAccent = typeof exports_.DEFAULT_ACCENT === 'string' ? exports_.DEFAULT_ACCENT : null;
  if (!defaultSystem) issues.push(`${TS_REL} does not export DEFAULT_SYSTEM as a string`);
  if (!defaultAccent) issues.push(`${TS_REL} does not export DEFAULT_ACCENT as a string`);
  const fallbacks = applierFallbacks(registrySource, registry ?? {});
  if (!fallbacks.system || !fallbacks.accent) {
    issues.push(`could not read applyDesignSystem()'s own fallbacks out of ${REGISTRY_REL} (system ${fallbacks.system ?? '?'}, accent ${fallbacks.accent ?? '?'})`);
  } else {
    if (defaultSystem && defaultSystem !== fallbacks.system) {
      issues.push(`DEFAULT_SYSTEM in ${TS_REL} is "${defaultSystem}" but applyDesignSystem() falls back to "${fallbacks.system}" — an unknown stored id paints one system while the app believes the other is selected`);
    }
    if (defaultAccent && defaultAccent !== fallbacks.accent) {
      issues.push(`DEFAULT_ACCENT in ${TS_REL} is "${defaultAccent}" but applyDesignSystem() falls back to ACCENTS[…] = "${fallbacks.accent}"`);
    }
  }
  return { found: true, issues, defaultSystem, defaultAccent, storageKeys: parseStorageKeys(tsSrc), exports: exports_ };
}

// The inline pre-paint script: the <script> without src whose text calls
// applyDesignSystem(). Everything the boot contract needs is read off the
// parsed document, so attribute order/quoting cannot hide a change.
function parseThemeBoot(htmlSrc) {
  const $ = cheerio.load(String(htmlSrc));
  const nodes = $('link, script').toArray();
  const at = (el) => nodes.indexOf(el);
  const sheetLinks = $('link').toArray().filter((el) => {
    const rel = String($(el).attr('rel') ?? '').toLowerCase().split(/\s+/);
    return rel.includes('stylesheet') && $(el).attr('href') === CANONICAL_CSS_HREF;
  });
  const registryScripts = $('script[src]').toArray().filter((el) => $(el).attr('src') === CANONICAL_JS_HREF);
  const boot = $('script:not([src])').toArray().find((el) => /\bapplyDesignSystem\s*\(/.test(stripComments($(el).text())));
  return {
    sheetLinks: sheetLinks.map((el) => ({ index: at(el), media: $(el).attr('media') ?? null })),
    registryScripts: registryScripts.map((el) => ({
      index: at(el),
      async: $(el).attr('async') !== undefined,
      defer: $(el).attr('defer') !== undefined,
      type: $(el).attr('type') ?? null,
    })),
    boot: boot ? { index: at(boot), inHead: $(boot).closest('head').length > 0, text: stripComments($(boot).text()) } : null,
  };
}

// boot-generation: the canonical sheet and applier load synchronously ahead
// of an inline boot that picks the stored system/accent through the canonical
// globals and calls the applier before first paint. Its storage keys and
// fallback system are the wrapper's — either injected by Vite from
// THEME_BOOT_DATA (marker form) or written literally with the same values.
function checkThemeBoot(htmlSrc, viteSrc, wrapper, registry) {
  const issues = [];
  const doc = parseThemeBoot(htmlSrc);
  const markerCount = (marker) => htmlSrc.split(marker).length - 1;

  if (doc.sheetLinks.length !== 1) {
    issues.push(`${HTML_REL} must link ${CANONICAL_CSS_HREF} exactly once as a stylesheet; found ${doc.sheetLinks.length}`);
  } else if (doc.sheetLinks[0].media && !/^\s*all\s*$/i.test(doc.sheetLinks[0].media)) {
    issues.push(`${HTML_REL} links ${CANONICAL_CSS_HREF} under media="${doc.sheetLinks[0].media}" — the canonical tokens paint only while that query holds`);
  }
  if (doc.registryScripts.length !== 1) {
    issues.push(`${HTML_REL} must load ${CANONICAL_JS_HREF} exactly once with <script src>; found ${doc.registryScripts.length}`);
  } else {
    const s = doc.registryScripts[0];
    if (s.async || s.defer || (s.type && !/^(?:text|application)\/javascript$/i.test(s.type))) {
      issues.push(`${HTML_REL} loads ${CANONICAL_JS_HREF} ${s.async ? 'async' : s.defer ? 'deferred' : `as type="${s.type}"`} — the boot needs its globals synchronously, before first paint`);
    }
  }
  if (!doc.boot) {
    issues.push(`${HTML_REL} has no inline <script> that calls applyDesignSystem() — nothing paints the stored system before React loads`);
    return issues;
  }
  if (!doc.boot.inHead) issues.push(`the inline theme boot in ${HTML_REL} is outside <head> — the body can paint before it runs`);
  if (doc.sheetLinks[0] && doc.sheetLinks[0].index > doc.boot.index) {
    issues.push(`${HTML_REL} links ${CANONICAL_CSS_HREF} AFTER the inline theme boot`);
  }
  if (doc.registryScripts[0] && doc.registryScripts[0].index > doc.boot.index) {
    issues.push(`${HTML_REL} loads ${CANONICAL_JS_HREF} AFTER the inline theme boot — window.DESIGN_SYSTEMS/applyDesignSystem do not exist yet when it runs`);
  }

  const boot = doc.boot.text;
  for (const global of ['DESIGN_SYSTEMS', 'ACCENTS', 'SYSTEM_DEFAULT_ACCENT']) {
    if (!new RegExp(`\\bwindow\\.${global}\\b`).test(boot)) {
      issues.push(`the inline theme boot in ${HTML_REL} never reads window.${global} — it cannot validate the stored choice against the canonical table`);
    }
  }
  if (/\bvar\s+(?:SYSTEMS|ACCENTS)\s*=\s*\[|\bvar\s+FONT_STACKS\s*=\s*\{/.test(htmlSrc)) {
    issues.push(`${HTML_REL} contains a hand-maintained theme/font allowlist instead of the canonical globals`);
  }
  const markerForm = markerCount(THEME_BOOT_MARKER) > 0;
  const allowedLiteral = new Set(markerForm ? [] : [wrapper.defaultSystem]);
  const knownIds = new Set([
    ...Object.keys(registry?.systems ?? {}),
    ...(Array.isArray(registry?.accents) ? registry.accents.map((a) => a?.id) : []),
  ]);
  for (const m of boot.matchAll(/(['"])([A-Za-z0-9_-]+)\1/g)) {
    if (knownIds.has(m[2]) && !allowedLiteral.has(m[2])) {
      issues.push(`the inline theme boot in ${HTML_REL} hard-codes "${m[2]}" — a hand copy of a canonical id`);
    }
  }
  for (const why of unsafeMembershipTests(boot)) {
    issues.push(`the inline theme boot in ${HTML_REL} validates the stored system with ${why}`);
  }

  const keys = wrapper.storageKeys ?? {};
  if (!keys.system || !keys.accent) issues.push(`could not read SYSTEM_STORAGE_KEY/ACCENT_STORAGE_KEY out of ${TS_REL}`);
  if (markerForm) {
    if (markerCount(THEME_BOOT_MARKER) !== 1) issues.push(`${HTML_REL} must contain exactly one ${THEME_BOOT_MARKER} marker; found ${markerCount(THEME_BOOT_MARKER)}`);
    for (const field of ['systemKey', 'accentKey', 'defaultSystem']) {
      if (!new RegExp(`\\bTHEME_BOOT\\.${field}\\b`).test(boot)) issues.push(`the inline theme boot in ${HTML_REL} does not consume generated THEME_BOOT.${field}`);
    }
    if (!/\bimport\s*\{[^}]*\bTHEME_BOOT_DATA\b[^}]*\}\s*from\s*["']\.\/client\/src\/lib\/design-system["']/.test(viteSrc)) {
      issues.push(`${VITE_REL} does not import THEME_BOOT_DATA from ${TS_REL}`);
    }
    if (!viteSrc.includes(`const marker = "${THEME_BOOT_MARKER}"`) || !viteSrc.includes('JSON.stringify(THEME_BOOT_DATA)')) {
      issues.push(`${VITE_REL} does not serialize THEME_BOOT_DATA for the ${THEME_BOOT_MARKER} marker`);
    }
    if (!/\bplugins\s*:\s*\[[\s\S]*?\bthemeBootRegistry\(\)/.test(viteSrc)) {
      issues.push(`${VITE_REL} does not register themeBootRegistry() in the Vite plugin pipeline`);
    }
    const data = wrapper.exports?.THEME_BOOT_DATA;
    const expected = { systemKey: keys.system, accentKey: keys.accent, defaultSystem: wrapper.defaultSystem };
    for (const [field, value] of Object.entries(expected)) {
      if (data?.[field] !== value) issues.push(`THEME_BOOT_DATA.${field} in ${TS_REL} is ${JSON.stringify(data?.[field])} but the wrapper uses ${JSON.stringify(value)} — the boot and the app would read different state`);
    }
  } else {
    const readKeys = new Set([...boot.matchAll(/localStorage\.getItem\(\s*(['"])([^'"]+)\1\s*\)/g)].map((m) => m[2]));
    for (const [label, key] of [['SYSTEM_STORAGE_KEY', keys.system], ['ACCENT_STORAGE_KEY', keys.accent]]) {
      if (key && !readKeys.has(key)) issues.push(`the inline theme boot in ${HTML_REL} never reads localStorage "${key}" (${label} in ${TS_REL}); it reads ${[...readKeys].map((k) => `"${k}"`).join(', ') || 'nothing'}`);
    }
    const fallback = /\bsys\s*=\s*(['"])([^'"]+)\1/.exec(boot)?.[2] ?? null;
    if (fallback !== wrapper.defaultSystem) {
      issues.push(`the inline theme boot in ${HTML_REL} falls back to ${fallback ? `"${fallback}"` : 'nothing'} but DEFAULT_SYSTEM in ${TS_REL} is "${wrapper.defaultSystem}"`);
    }
  }

  if (markerCount(FONT_BOOT_MARKER) !== 1) issues.push(`${HTML_REL} must contain exactly one ${FONT_BOOT_MARKER} marker; found ${markerCount(FONT_BOOT_MARKER)}`);
  if (!/\bimport\s*\{[^}]*\bFONT_BOOT_DATA\b[^}]*\}\s*from\s*["']\.\/client\/src\/lib\/font-options["']/.test(viteSrc)) {
    issues.push(`${VITE_REL} does not import FONT_BOOT_DATA from ${FONTS_REL}`);
  }
  if (!viteSrc.includes(`const marker = "${FONT_BOOT_MARKER}"`) || !viteSrc.includes('JSON.stringify(FONT_BOOT_DATA)')) {
    issues.push(`${VITE_REL} does not serialize FONT_BOOT_DATA for the ${FONT_BOOT_MARKER} marker`);
  }
  if (!/\bplugins\s*:\s*\[[\s\S]*?\bfontBootRegistry\(\)/.test(viteSrc)) {
    issues.push(`${VITE_REL} does not register fontBootRegistry() in the Vite plugin pipeline`);
  }
  return issues;
}

// Every [data-system="…"] selector in a stylesheet, with its source line. The
// canonical sheet has no token blocks any more (the applier writes system
// tokens inline), so every occurrence counts — a component skin or a stray
// attribute block alike must name a system the registry offers.
const SYSTEM_SKIN_SELECTOR_RE = /\[data-system\s*=\s*(["'])([A-Za-z0-9_-]+)\1\s*\]/g;

// Attribute selectors are parsed STRUCTURALLY, not by matching the valid
// subset: every `[`…`]` in a selector is read, and one that targets
// data-system but is not a complete `[data-system=<id>]` (unclosed bracket,
// missing value, mismatched quote, a prefix/substring operator) or whose
// attribute name is a near-miss of data-system (data-sytem, data_system,
// data-systems) is reported with its line — a malformed skin would otherwise
// match nothing and silently drop out of validation.
const SYSTEM_ATTR = 'data-system';
function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function parseSystemAttributeSelectors(selectorText) {
  const out = [];
  for (let i = selectorText.indexOf('['); i !== -1; i = selectorText.indexOf('[', i + 1)) {
    const nameMatch = /^\[\s*([A-Za-z_][\w-]*)/.exec(selectorText.slice(i));
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const lower = name.toLowerCase();
    const near = lower !== SYSTEM_ATTR && lower.startsWith('data') && editDistance(lower.replace(/_/g, '-'), SYSTEM_ATTR) <= 2;
    if (lower !== SYSTEM_ATTR && !near) continue;
    const close = selectorText.indexOf(']', i);
    const raw = (close === -1 ? selectorText.slice(i) : selectorText.slice(i, close + 1)).trim();
    if (near) {
      out.push({ offset: i, error: `attribute "${name}" looks like a misspelt ${SYSTEM_ATTR}`, raw });
      continue;
    }
    if (name !== SYSTEM_ATTR) {
      out.push({ offset: i, error: `attribute "${name}" must be spelled exactly "${SYSTEM_ATTR}"`, raw });
      continue;
    }
    if (close === -1) {
      out.push({ offset: i, error: 'unclosed attribute selector (missing "]")', raw });
      continue;
    }
    const body = selectorText.slice(i + 1, close);
    const m = /^\s*data-system\s*=\s*(?:(["'])([A-Za-z0-9_-]+)\1|([A-Za-z_][\w-]*))\s*(?:\s[si])?\s*$/.exec(body);
    if (!m) {
      out.push({ offset: i, error: 'not a complete [data-system="<id>"] equality selector', raw });
      continue;
    }
    out.push({ offset: i, id: m[2] ?? m[3] });
  }
  return out;
}

function parseCssSystemSkins(cssSrc) {
  return parseCssSystemSelectors(cssSrc).skins;
}

function parseCssSystemSelectors(cssSrc) {
  const src = stripCommentsPreservingLines(cssSrc);
  const skins = [];
  const malformed = [];
  for (const rule of src.matchAll(/([^{};]+)\{/g)) {
    const selectorText = rule[1];
    const selector = selectorText.trim();
    if (!selector) continue;
    for (const attr of parseSystemAttributeSelectors(selectorText)) {
      const offset = rule.index + attr.offset;
      const entry = {
        line: src.slice(0, offset).split('\n').length,
        selector: selector.replace(/\s+/g, ' '),
      };
      if (attr.error) malformed.push({ ...entry, error: attr.error, raw: attr.raw });
      else skins.push({ ...entry, id: attr.id });
    }
  }
  return { skins, malformed };
}

function compareMalformedSystemSelectors(malformed, rel) {
  return malformed.map(({ line, selector, error, raw }) => ({
    kind: 'system-skin-malformed',
    id: raw,
    message: `${rel} line ${line}: ${error} — ${raw} in selector "${selector.slice(0, 160)}" matches no design system, so this skin silently escapes validation and never paints`,
  }));
}

// accent-paint (app side): applyDesignSystem() writes --accent/--accent-2
// inline on <html>. An app stylesheet that keys a rule off [data-accent] or
// declares either token repaints the accent somewhere the applier never
// reaches — every descendant inherits the redeclared value.
function parseCssAccentOverrides(cssSrc) {
  const src = stripCommentsPreservingLines(cssSrc);
  const out = [];
  const lineAt = (offset) => src.slice(0, offset).split('\n').length;
  for (const rule of src.matchAll(/([^{};]+)\{([^{}]*)\}?/g)) {
    if (!/\[data-accent\b/.test(rule[1])) continue;
    // The one approved [data-accent] use: a per system/accent accessible
    // text ink (--accent-ink, app-bridge.css, verified by
    // app-accent-contrast.mjs). It never redeclares the painted accent, so a
    // body that declares --accent-ink and nothing else is not a repaint.
    const props = [...(rule[2] || '').matchAll(/(--[\w-]+|[a-z-]+)\s*:/gi)].map(m => m[1]);
    if (props.length && props.every(p => p === '--accent-ink')) continue;
    out.push({ what: `a [data-accent] rule (${rule[1].trim().replace(/\s+/g, ' ')})`, line: lineAt(rule.index + rule[1].search(/\S/)) });
  }
  for (const m of src.matchAll(/(^|[\s;{])(--accent(?:-2)?)\s*:/g)) {
    out.push({ what: `a ${m[2]} declaration`, line: lineAt(m.index + m[1].length) });
  }
  return out.sort((a, b) => a.line - b.line);
}

const CSS_COLOR_RE = /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\))$/i;

function compareAccentPaint({ accents, registrySource, appSheets }) {
  const failures = [];
  if (!applierPaintsAccentPair(registrySource)) {
    failures.push({
      kind: 'accent-paint',
      id: 'applyDesignSystem',
      message: `applyDesignSystem() in ${REGISTRY_REL} no longer sets --accent/--accent-2 from the accent's primary/secondary — the picker's swatch and the painted accent come apart`,
    });
  }
  for (const accent of accents ?? []) {
    for (const field of ['primary', 'secondary']) {
      const value = String(accent?.[field] ?? '').trim();
      if (!CSS_COLOR_RE.test(value)) {
        failures.push({
          kind: 'accent-paint',
          id: accent?.id ?? '?',
          message: `accent "${accent?.id}" ${field} in ${REGISTRY_REL} is ${JSON.stringify(accent?.[field])}, which is not a CSS color the applier can paint`,
        });
      }
    }
  }
  for (const { rel, src } of appSheets) {
    for (const { what, line } of parseCssAccentOverrides(src)) {
      failures.push({
        kind: 'accent-paint',
        id: rel,
        message: `${rel}:${line} has ${what} — the accent is painted inline on <html> by applyDesignSystem() from ${REGISTRY_REL}; an app stylesheet that re-keys or redeclares it fights the picker`,
      });
    }
  }
  return failures;
}

// default-prepaint: the canonical :root is what <html> shows before the
// applier runs. For every token DEFAULT_SYSTEM's vars declare, the bare :root
// should agree — otherwise the pre-apply frame is a different look. Returns
// the divergences; the caller decides whether they can ever reach a screen.
function compareDefaultPrePaint(defaultSystemId, defaultVars, rootTokens) {
  const out = [];
  for (const [token, value] of Object.entries(defaultVars ?? {})) {
    const root = rootTokens?.get(token);
    if (root === undefined) {
      out.push({ kind: 'default-prepaint', id: token, root: null, system: value, message: `${token}: ${defaultSystemId} vars ${value}, canonical :root declares nothing` });
    } else if (normalizeColor(root) !== normalizeColor(value)) {
      out.push({ kind: 'default-prepaint', id: token, root, system: value, message: `${token}: ${defaultSystemId} vars ${value}, canonical :root ${root}` });
    }
  }
  return out;
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
    // `… && FONT_BOOT.stacks[fnt])` — an unknown or empty-stack id applies nothing.
    skipsEmptyStack: /&&\s*FONT_BOOT\.stacks\[\s*[A-Za-z_$][\w$]*\s*\]\s*\)/.test(htmlSrc),
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

// DESIGN_SYSTEMS vs the vars each system hands to applyDesignSystem(): a
// system the picker offers must carry a non-empty vars table (an empty one
// paints exactly like whatever was applied before), and every non-exempt
// system must declare the tokens its established peers agree on. `blocks` is
// registrySystemBlocks() output, so the shared contract helpers judge the
// inline paint. (The retired BASE_ROOT_PAINTED_SYSTEMS escape hatch covered a
// system with no CSS block; every system now paints from its own vars, and
// the bare :root's agreement with the default system is compareDefaultPrePaint.)
function compareSystemPaint(systemIds, blocks, minimalTokenSystems = MINIMAL_TOKEN_SYSTEMS) {
  const offered = new Set(systemIds);
  const failures = [];

  const minimalValidation = validateMinimalTokenSystems([...offered], blocks, minimalTokenSystems);
  failures.push(
    ...minimalValidation.failures.map(({ id, message }) => ({ kind: 'minimal-system-exemption', id, message })),
  );
  const minimalTokenExempt = minimalValidation.exemptIds;

  for (const id of [...new Set([...offered, ...blocks.keys()])].sort()) {
    if (!blocks.has(id)) {
      failures.push({
        kind: 'system-paint',
        id,
        message: `design system "${id}" is offered but DESIGN_SYSTEMS in ${REGISTRY_REL} carries no vars for it — the picker offers it and data-system sticks, but applyDesignSystem() paints nothing new`,
      });
      continue;
    }
    if (!offered.has(id)) {
      failures.push({
        kind: 'system-paint',
        id,
        message: `vars exist for design system "${id}" but DESIGN_SYSTEMS in ${REGISTRY_REL} does not offer it — dead paint no picker choice can ever reach`,
      });
      continue;
    }
    if (!declaresCustomProperty(blocks.get(id))) {
      failures.push({
        kind: 'system-paint',
        id,
        message: `design system "${id}" has an empty vars table in ${REGISTRY_REL} — switching to it leaves the previous system's inline tokens cleared and nothing in their place`,
      });
    }
  }

  const { tokens: sharedTokens, missingBySystem } = findMissingSystemTokens([...offered], blocks, minimalTokenExempt);
  for (const id of offered) {
    const body = blocks.get(id);
    if (body == null || !declaresCustomProperty(body) || minimalTokenExempt.has(id)) continue;
    const missing = missingBySystem.get(id);
    if (missing) {
      failures.push({
        kind: 'system-token-contract',
        id,
        message: formatMissingSystemTokensMessage(id, missing.declaredCount, sharedTokens.size, missing.missing)
          .replace(`its :root[data-system="${id}"] block`, `DESIGN_SYSTEMS.${id}.vars in ${REGISTRY_REL}`),
      });
    }
  }

  failures.push(
    ...findStaleMinimalTokenSystems(minimalTokenExempt, blocks, sharedTokens, minimalTokenSystems).map(({ id, message }) => ({
      kind: 'minimal-system-exemption',
      id,
      message,
    })),
  );

  return failures;
}

function compareSystemSkins(systemIds, skins, rel) {
  const offered = new Set(systemIds);
  return skins
    .filter(({ id }) => !offered.has(id))
    .map(({ id, line, selector }) => ({
      kind: 'system-skin',
      id,
      message: `${rel} has a [data-system="${id}"] rule for unknown design system "${id}" on line ${line}: ${selector} — remove or rename it because DESIGN_SYSTEMS in ${REGISTRY_REL} does not offer "${id}"`,
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
        message: `design system "${id}" is in DESIGN_SYSTEMS in ${REGISTRY_REL} but has no SYSTEM_DEFAULT_ACCENT entry — switching to it keeps whatever accent is already active (or falls back to DEFAULT_ACCENT), so a first-time visitor never sees the accent the system was designed around`,
      });
      continue;
    }
    if (!systems.has(id)) {
      failures.push({
        kind: 'system-accent-parity',
        id,
        message: `SYSTEM_DEFAULT_ACCENT in ${REGISTRY_REL} maps design system "${id}" to accent "${accentId}", but "${id}" is not in DESIGN_SYSTEMS — a default no system can ever pick up`,
      });
      continue;
    }
    if (!accents.has(accentId)) {
      failures.push({
        kind: 'system-accent-value',
        id,
        message: `SYSTEM_DEFAULT_ACCENT in ${REGISTRY_REL} defaults design system "${id}" to accent "${accentId}", which is not one of the ACCENTS entries — applyDesignSystem() would silently paint ACCENTS[0] while data-accent claims "${accentId}"`,
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
    message: `SYSTEM_DEFAULT_ACCENT[DEFAULT_SYSTEM] in ${REGISTRY_REL} maps "${defaultSystemId}" to "${mappedAccentId ?? '(missing)'}", but DEFAULT_ACCENT in ${TS_REL} is "${defaultAccentId}" — the default system's intended accent never reaches a first-time visitor: the pre-paint boot in ${HTML_REL} picks SYSTEM_DEFAULT_ACCENT while the app's fallbacks use DEFAULT_ACCENT`,
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
      source: declaredHere ? `DESIGN_SYSTEMS.${systemId}.vars` : `:root in ${CSS_REL}`,
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
          message: `design system "${id}" resolves ${token} to nothing — neither DESIGN_SYSTEMS.${id}.vars in ${REGISTRY_REL} nor the :root in ${CSS_REL} declares it, so every \`font-family: var(${token})\` rule computes to nothing at all`,
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
// A relative import of a sibling .ts module that exists on disk (font-options.ts
// → ./design-system) is executed the same way; anything else is refused.
function loadTsExports(rel, tsSrc) {
  const js = esbuild.transformSync(tsSrc, { loader: 'ts', format: 'cjs' }).code;
  const mod = { exports: {} };
  const require_ = (spec) => {
    const sibling = /^\.\.?\//.test(spec) ? path.posix.join(path.posix.dirname(rel), `${spec}.ts`) : null;
    if (sibling && fs.existsSync(path.join(ROOT, sibling))) return loadTsExports(sibling, read(sibling));
    throw new Error(`${rel} imports "${spec}" — only sibling .ts modules can be executed here`);
  };
  new Function('module', 'exports', 'require', js)(mod, mod.exports, require_);
  return mod.exports;
}

// The wrapper's readers resolve window.DESIGN_SYSTEMS at call time, so the
// resolver is executed with the canonical registry installed as `window`.
function checkSystemIdResolution(tsSrc, { systemIds, defaultSystemId, registry = null }) {
  return withCanonicalWindow(registry, () => checkSystemIdResolutionIn(tsSrc, { systemIds, defaultSystemId }));
}

function checkSystemIdResolutionIn(tsSrc, { systemIds, defaultSystemId }) {
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
    if (isSystemId(id) !== true) bad(`isSystemId("${id}") is false, but DESIGN_SYSTEMS in ${REGISTRY_REL} offers that system`);
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

  // Canonical :root readers (default accent pair, full token map, fonts).
  const cssSample = [
    ':root { --accent: #ff3d52; --accent-2: #b84dff; --bg: #000; }',
    ':root { --bg: #0a0a0a; }',
    '@media (max-width: 767px) { :root { --bg: #111111; } }',
    '/* :root { --ghost: 1; } */',
    '[data-system="terminal"] .btn { border-radius: 0; }',
  ].join('\n');
  eq(parseCssRootDefault(cssSample), { primary: '#ff3d52', secondary: '#b84dff' }, ':root default pair');
  eq(cssVar('--accent-2: #b84dff;', '--accent'), null, '--accent-2 never satisfies --accent');
  eq(
    [...parseCssRootTokens(cssSample)],
    [['--accent', '#ff3d52'], ['--accent-2', '#b84dff'], ['--bg', '#0a0a0a']],
    'every top-level bare :root block merges last-wins; indented media-scoped and commented blocks do not count',
  );
  eq(parseCssRootTokens('[data-system="x"] .a { --bg: #000; }'), null, 'a sheet with no bare :root block is detectable');

  const cssFontSample = [
    ':root {',
    "  --font-body: 'Inter', system-ui, sans-serif;",
    "  --font-display: 'Fraunces', Georgia, serif;",
    "  --font-mono: 'JetBrains Mono', ui-monospace, monospace;",
    '}',
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
  eq(parseCssRootFonts('[data-system="swiss"] .a { --font-body: A; }'), null, 'absent bare :root block is detectable');

  // Registry readers — DESIGN_SYSTEMS[id].vars as the paint the applier performs.
  const registrySystemsSample = {
    editorial: { vars: { '--bg': '#000', '--font-body': "'Inter', sans-serif" } },
    swiss: { vars: { '--bg': '#000', '--font-body': "'Manrope', sans-serif", '--font-mono': "'IBM Plex Mono', monospace" } },
    hollow: { vars: {} },
  };
  const sampleBlocks = registrySystemBlocks(registrySystemsSample);
  eq([...sampleBlocks.keys()], ['editorial', 'swiss', 'hollow'], 'one block per registry system');
  eq(declaresCustomProperty(sampleBlocks.get('swiss')), true, 'vars render as declarations the token contract can read');
  eq(declaresCustomProperty(sampleBlocks.get('hollow')), false, 'empty vars declare nothing');
  eq(
    [...registrySystemFonts(registrySystemsSample).get('swiss').keys()],
    ['--font-body', '--font-mono'],
    'a font token the system does not declare is absent, not empty — the canonical :root decides',
  );
  eq(registrySystemFonts(registrySystemsSample).get('hollow').size, 0, 'a system with no font vars yields an empty map');

  // default-prepaint comparator — the bare :root vs the default system's vars.
  eq(
    compareDefaultPrePaint('editorial', { '--bg': '#000000', '--text': '#f4f3ee' }, new Map([['--bg', '#000'], ['--text', '#F4F3EE']])),
    [],
    'shorthand and case differences are the same pre-paint value',
  );
  eq(
    compareDefaultPrePaint('editorial', { '--bg-2': '#070706', '--grain': '0.3' }, new Map([['--bg-2', '#0a0a0a']])).map((f) => [f.id, f.root]),
    [['--bg-2', '#0a0a0a'], ['--grain', null]],
    'a differing value and a token the :root never declares are both reported',
  );

  // Storage keys, read by name out of the wrapper source.
  eq(
    parseStorageKeys('const SYSTEM_STORAGE_KEY = "ds-system";\nexport const ACCENT_STORAGE_KEY: string = \'ds-accent\';'),
    { system: 'ds-system', accent: 'ds-accent' },
    'module-private and exported storage keys both parse',
  );
  eq(parseStorageKeys('const OTHER = "x";'), { system: null, accent: null }, 'renamed storage keys are detectable');

  // [data-system] rule parser: every occurrence, with source lines.
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
    ['terminal', 'terminal', 'swiss', 'geist', 'ghost'],
    'every [data-system] rule parsed — a bare attribute block is no longer exempt — and comments ignored',
  );
  eq(parsedCssSkins.map(({ line }) => line), [1, 2, 3, 4, 5], '[data-system] rule source lines are preserved for diagnostics');
  const unknownSkinFailures = compareSystemSkins(['terminal', 'swiss', 'geist'], parsedCssSkins, 'sample.css');
  eq(unknownSkinFailures.map(({ id }) => id), ['ghost'], 'unknown system rule is reported');
  eq(
    unknownSkinFailures[0].message.includes('"ghost"') && unknownSkinFailures[0].message.includes('line 5') && unknownSkinFailures[0].message.includes('sample.css'),
    true,
    'unknown system rule reports its file, id and source line',
  );
  eq(parseCssSystemSkins(':root { --bg: #000000; }').length, 0, 'zero [data-system] rules is detectable, not an empty pass');
  const malformedSample = [
    '[data-system="terminal" .btn { color: red; }',
    '[data-system] .btn { color: red; }',
    '[data-system^="term"] .btn { color: red; }',
    '[data-system="swiss\'] .btn { color: red; }',
    '[data-sytem="swiss"] .btn { color: red; }',
    '[data_system="swiss"] .btn { color: red; }',
    '[data-system=geist] .btn { color: red; }',
    '[data-state="open"] .btn { color: red; }',
  ].join('\n');
  const parsedMalformed = parseCssSystemSelectors(malformedSample);
  eq(parsedMalformed.malformed.map(({ line }) => line), [1, 2, 3, 4, 5, 6], 'unclosed / valueless / prefix-operator / mismatched-quote / misspelt data-system selectors are each reported with their line');
  eq(parsedMalformed.skins.map(({ id }) => id), ['geist'], 'an unquoted identifier value is valid CSS and is validated, not skipped; unrelated attributes are ignored');
  const malformedFailures = compareMalformedSystemSelectors(parsedMalformed.malformed, 'sample.css');
  eq(malformedFailures.every((f) => f.kind === 'system-skin-malformed' && f.message.includes('sample.css line')), true, 'malformed selector failures name file and line');

  // App-sheet accent overrides.
  eq(
    parseCssAccentOverrides([
      '.btn.primary { background: var(--accent); }',
      ':root[data-accent="crimson"] { --accent: #000; }',
      '.card { --accent-2: red; --accent-rgb: 1 2 3; }',
      '/* :root { --accent: #fff; } */',
    ].join('\n')).map(({ what, line }) => [what.split(' (')[0], line]),
    [['a [data-accent] rule', 2], ['a --accent declaration', 2], ['a --accent-2 declaration', 3]],
    'a [data-accent] rule and --accent/--accent-2 declarations are found; var() reads, --accent-rgb and comments are not',
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
  const dupFonts = parseTsFontOptions([
    'export const FONT_OPTIONS: FontOption[] = [',
    '  { id: "inter", name: "Inter", stack: "\'Inter\', sans-serif" },',
    '  { id: "mono", name: "Mono", stack: "monospace" },',
    '  { id: "inter", name: "Inter 2", stack: "\'Geist\', sans-serif" },',
    '];',
  ].join('\n'));
  eq(dupFonts.duplicates.map((d) => d.id), ['inter'], 'duplicate FONT_OPTIONS id is reported, never collapsed');
  eq(dupFonts.fonts.get('inter'), "'Inter', sans-serif", 'duplicate keeps the FIRST stack (FONT_OPTIONS.find semantics), not the last');
  eq(dupFonts.order, ['inter', 'mono'], 'duplicate id does not enter the option order twice');
  const dupSheets = parseTsStringMap('const FONT_STYLESHEETS = {\n  inter: "https://a.test/1",\n  inter: "https://a.test/2",\n};', 'FONT_STYLESHEETS');
  eq(dupSheets.duplicates, ['inter'], 'duplicate FONT_STYLESHEETS key is reported, never collapsed');
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

  // Generated-font consumer.
  const htmlThemeSample = [
    `          var FONT_BOOT = ${FONT_BOOT_MARKER};`,
    '          if (!Object.prototype.hasOwnProperty.call(FONT_BOOT.stacks, fnt)) fnt = FONT_BOOT.fallback;',
  ].join('\n');
  const parsedBootFonts = parseBootFonts(htmlThemeSample);
  eq(parsedBootFonts, { found: true, consumesStacks: true, consumesFallback: true, skipsEmptyStack: false }, 'boot FONT_BOOT marker and both generated fields located');
  eq(
    parseBootFonts('if (fnt && Object.prototype.hasOwnProperty.call(FONT_BOOT.stacks, fnt) && FONT_BOOT.stacks[fnt]) {').skipsEmptyStack,
    true,
    'a boot that applies nothing for an empty stack is recognised',
  );
  eq(
    parseBootFonts('<html></html>'),
    { found: false, consumesStacks: false, consumesFallback: false, skipsEmptyStack: false },
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

  // Theme boot + wrapper contract (canonical globals, no copied tables).
  const canonRegistry = {
    systems: {
      editorial: { name: 'Editorial', vars: { '--bg': '#000' } },
      terminal: { name: 'Terminal', vars: { '--bg': '#000' } },
    },
    accents: [
      { id: 'crimson', name: 'Crimson', primary: '#ff3d52', secondary: '#b84dff' },
      { id: 'matrix', name: 'Matrix', primary: '#00ff88', secondary: '#39ff14' },
    ],
    systemDefaultAccents: { editorial: 'crimson', terminal: 'matrix' },
  };
  const canonSource = [
    'window.applyDesignSystem = function(systemId, accentId) {',
    '  const sys = window.DESIGN_SYSTEMS[systemId] || window.DESIGN_SYSTEMS.editorial;',
    '  const a = window.ACCENTS.find(x => x.id === accentId) || window.ACCENTS[0];',
    "  root.style.setProperty('--accent',   a.primary);",
    "  root.style.setProperty('--accent-2', a.secondary);",
    '};',
  ].join('\n');
  const wrapperModule = (extra = '', defaults = { system: 'editorial', accent: 'crimson' }) => [
    'const SYSTEM_STORAGE_KEY = "ds-system";',
    'const ACCENT_STORAGE_KEY = "ds-accent";',
    `export const DEFAULT_SYSTEM = "${defaults.system}";`,
    `export const DEFAULT_ACCENT = "${defaults.accent}";`,
    'export const THEME_BOOT_DATA = { systemKey: SYSTEM_STORAGE_KEY, accentKey: ACCENT_STORAGE_KEY, defaultSystem: DEFAULT_SYSTEM };',
    'const hasWindow = () => typeof window !== "undefined";',
    'export function getDesignSystems() { return (hasWindow() && window.DESIGN_SYSTEMS) || {}; }',
    'export function getAccents() { return (hasWindow() && window.ACCENTS) || []; }',
    'export function getSystemDefaultAccents() { return (hasWindow() && window.SYSTEM_DEFAULT_ACCENT) || {}; }',
    extra,
  ].join('\n');
  const wrapperIssues = (src, registry = canonRegistry) => checkRuntimeWrapper(src, registry, canonSource).issues;
  eq(wrapperIssues(wrapperModule()), [], 'a wrapper over the canonical globals passes');
  eq(
    wrapperIssues(wrapperModule("export const ACCENTS = [{ id: 'crimson' }];")).some((i) => i.includes('exports its own ACCENTS')),
    true,
    'a restated ACCENTS table is caught',
  );
  eq(
    wrapperIssues(wrapperModule('export const THEME_FALLBACK_REGISTRY = {};')).some((i) => i.includes('THEME_FALLBACK_REGISTRY')),
    true,
    'a reintroduced THEME_FALLBACK_REGISTRY is caught',
  );
  eq(
    wrapperIssues(wrapperModule("const PAINT = '#ff3d52';")).some((i) => i.includes('hard-codes accent "crimson"')),
    true,
    'a hard-coded canonical accent color is caught as a second copy',
  );
  eq(
    wrapperIssues(wrapperModule().replace('return (hasWindow() && window.ACCENTS) || [];', 'return [{ id: "crimson" }];')).some((i) => i.includes('getAccents()')),
    true,
    'a getter that serves its own copy instead of the global is caught by execution',
  );
  eq(
    wrapperIssues(wrapperModule('', { system: 'terminal', accent: 'crimson' })).some((i) => i.includes('falls back to "editorial"')),
    true,
    "a DEFAULT_SYSTEM that disagrees with the applier's own fallback is caught",
  );
  eq(
    wrapperIssues(wrapperModule(), { ...canonRegistry, systemDefaultAccents: { editorial: 'crimson' } }).some((i) => i.includes('no entry for system "terminal"')),
    true,
    'an incomplete canonical registry is reported through registryStructureIssues',
  );
  eq(typeof globalThis.window, 'undefined', 'the stand-in window never outlives the wrapper check');

  const bootWrapper = checkRuntimeWrapper(wrapperModule(), canonRegistry, canonSource);
  const markerBoot = [
    '<html><head>',
    `<link rel="stylesheet" href="${CANONICAL_CSS_HREF}" />`,
    `<script src="${CANONICAL_JS_HREF}"></script>`,
    '<script>',
    `  var THEME_BOOT = ${THEME_BOOT_MARKER};`,
    '  var sys = localStorage.getItem(THEME_BOOT.systemKey), acc = localStorage.getItem(THEME_BOOT.accentKey);',
    '  if (!Object.prototype.hasOwnProperty.call(window.DESIGN_SYSTEMS, sys)) sys = THEME_BOOT.defaultSystem;',
    '  var known = window.ACCENTS.some(function (a) { return a.id === acc; });',
    '  if (!known) acc = window.SYSTEM_DEFAULT_ACCENT[sys];',
    '  window.applyDesignSystem(sys, acc);',
    `  var FONT_BOOT = ${FONT_BOOT_MARKER}; FONT_BOOT.stacks; FONT_BOOT.fallback;`,
    '</script>',
    '</head><body></body></html>',
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
  const bootIssues = (html, vite = generatedVite, wrapper = bootWrapper) => checkThemeBoot(html, vite, wrapper, canonRegistry);
  eq(bootIssues(markerBoot), [], 'the Vite-marker boot over the canonical globals passes');
  const literalBoot = markerBoot
    .replace(`  var THEME_BOOT = ${THEME_BOOT_MARKER};\n`, '')
    .replace('localStorage.getItem(THEME_BOOT.systemKey)', "localStorage.getItem('ds-system')")
    .replace('localStorage.getItem(THEME_BOOT.accentKey)', "localStorage.getItem('ds-accent')")
    .replace('sys = THEME_BOOT.defaultSystem', "sys = 'editorial'");
  eq(bootIssues(literalBoot), [], 'the literal boot with the wrapper\'s keys and fallback passes');
  eq(
    bootIssues(literalBoot.replace("getItem('ds-system')", "getItem('theme-system')")).some((i) => i.includes('never reads localStorage "ds-system"')),
    true,
    'a literal boot reading a renamed storage key is caught',
  );
  eq(
    bootIssues(literalBoot.replace("sys = 'editorial'", "sys = 'terminal'")).some((i) => i.includes('hard-codes "terminal"')),
    true,
    'a literal boot falling back to another system is caught',
  );
  eq(
    bootIssues(markerBoot, generatedVite, { ...bootWrapper, storageKeys: { system: 'theme-system', accent: 'ds-accent' } })
      .some((i) => i.includes('THEME_BOOT_DATA.systemKey')),
    true,
    'THEME_BOOT_DATA that disagrees with the wrapper storage key is caught',
  );
  eq(
    bootIssues(markerBoot.replace(`  var THEME_BOOT = ${THEME_BOOT_MARKER};`, `  var THEME_BOOT = ${THEME_BOOT_MARKER}; var X = ${THEME_BOOT_MARKER};`))
      .some((i) => i.includes('exactly one')),
    true,
    'a doubled generation marker fails clearly',
  );
  const scriptTag = `<script src="${CANONICAL_JS_HREF}"></script>`;
  eq(
    bootIssues(markerBoot.replace(`${scriptTag}\n`, '').replace('</head>', `${scriptTag}\n</head>`)).some((i) => i.includes('AFTER the inline theme boot')),
    true,
    'the registry script moved after the boot is caught',
  );
  eq(
    bootIssues(markerBoot.replace(scriptTag, `<script src="${CANONICAL_JS_HREF}" defer></script>`)).some((i) => i.includes('deferred')),
    true,
    'a deferred registry script is caught',
  );
  eq(
    bootIssues(markerBoot.replace(`<link rel="stylesheet" href="${CANONICAL_CSS_HREF}" />`, '')).some((i) => i.includes('exactly once as a stylesheet')),
    true,
    'a dropped canonical stylesheet link is caught',
  );
  eq(
    bootIssues(`${markerBoot}\n<script>var ACCENTS = ['crimson'];</script>`).some((i) => i.includes('hand-maintained')),
    true,
    'a reintroduced hand-maintained boot allowlist fails clearly',
  );
  eq(
    bootIssues(markerBoot.replace('Object.prototype.hasOwnProperty.call(window.DESIGN_SYSTEMS, sys)', 'window.DESIGN_SYSTEMS[sys] ? 1 : 0'))
      .some((i) => i.includes('validates the stored system')),
    true,
    'a prototype-chain membership test in the boot is caught',
  );
  eq(
    bootIssues(markerBoot.replace('  window.applyDesignSystem(sys, acc);\n', '')).some((i) => i.includes('no inline <script> that calls applyDesignSystem')),
    true,
    'a boot that never calls the applier is caught',
  );

  // accent-paint comparator.
  const paintArgs = { accents: canonRegistry.accents, registrySource: canonSource, appSheets: [{ rel: 'bridge.css', src: '.btn { color: var(--accent); }' }] };
  eq(compareAccentPaint(paintArgs), [], 'the canonical applier + an app sheet that only READS the accent passes');
  eq(
    compareAccentPaint({ ...paintArgs, registrySource: canonSource.replace("root.style.setProperty('--accent-2', a.secondary);", '') }).map((f) => f.id),
    ['applyDesignSystem'],
    'an applier that stops painting --accent-2 is caught',
  );
  eq(
    compareAccentPaint({ ...paintArgs, accents: [{ id: 'crimson', primary: 'crimson-ish', secondary: '#b84dff' }] }).map((f) => f.id),
    ['crimson'],
    'an accent value that is not a CSS color is caught',
  );
  eq(
    compareAccentPaint({ ...paintArgs, appSheets: [{ rel: 'bridge.css', src: ':root[data-accent="crimson"] { --accent: #000; }' }] }).map((f) => f.kind),
    ['accent-paint', 'accent-paint'],
    'an app [data-accent] block redeclaring --accent is caught on both counts',
  );

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

  // Comparator — per-system paint (DESIGN_SYSTEMS[id].vars) and the shared contract.
  const paintedIds = ['editorial', 'terminal', 'swiss'];
  const paintBlocks = new Map([
    ['editorial', '--bg: #000000; --radius: 12px;'],
    ['terminal', '--bg: #000000; --radius: 0px;'],
    ['swiss', '--bg: #000000; --radius: 4px;'],
  ]);
  const noMinimalTokenExempt = new Map();
  eq(compareSystemPaint(paintedIds, paintBlocks, noMinimalTokenExempt), [], 'every offered system with complete vars passes');
  eq(
    compareSystemPaint([...paintedIds, 'ghost'], paintBlocks, noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'ghost']],
    'an offered system with no vars is caught',
  );
  eq(
    compareSystemPaint(paintedIds, new Map([...paintBlocks, ['ghost', '--bg: #111111;']]), noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'ghost']],
    'vars for a system the picker never offers are caught',
  );
  eq(
    compareSystemPaint(paintedIds, new Map([...paintBlocks, ['swiss', '  ']]), noMinimalTokenExempt).map((f) => [f.kind, f.id]),
    [['system-paint', 'swiss']],
    'empty vars are caught, not counted as paint',
  );
  const halfFinishedPaint = compareSystemPaint([...paintedIds, 'ghost'], new Map([...paintBlocks, ['ghost', '--bg: #111111;']]), noMinimalTokenExempt);
  eq(halfFinishedPaint.map((f) => [f.kind, f.id]), [['system-token-contract', 'ghost']], 'a one-token system is caught by the shared contract');
  eq(/--radius/.test(halfFinishedPaint[0].message), true, 'the shared-contract failure names the token the half-finished system forgot');
  eq(/DESIGN_SYSTEMS\.ghost\.vars/.test(halfFinishedPaint[0].message), true, 'the shared-contract failure points at the registry vars, not a CSS block');
  eq(
    compareSystemPaint(
      [...paintedIds, 'ghost'],
      new Map([...paintBlocks, ['ghost', '--bg: #111111;']]),
      new Map([['ghost', 'Written reason: this is intentionally a minimal visual variant']]),
    ),
    [],
    'a deliberately minimal system passes only with a written reason',
  );
  eq(
    compareSystemPaint([...paintedIds, 'ghost'], new Map([...paintBlocks, ['ghost', '--bg: #111111;']]), new Map([['ghost', '   ']])).map((f) => [f.kind, f.id]),
    [['minimal-system-exemption', 'ghost'], ['system-token-contract', 'ghost']],
    'a reason-less minimal entry is reported AND excuses nothing',
  );
  eq(
    compareSystemPaint(
      [...paintedIds, 'ghost'],
      new Map([...paintBlocks, ['ghost', '--bg: #111111; --radius: 2px;']]),
      new Map([['ghost', 'This used to be intentionally minimal']]),
    ).map((f) => [f.kind, f.id]),
    [['minimal-system-exemption', 'ghost']],
    'a minimal-system exemption is stale once the vars satisfy the shared contract',
  );
  eq(
    compareSystemPaint(paintedIds, paintBlocks, new Map([['retired', 'reason']])).map((f) => [f.kind, f.id]),
    [['minimal-system-exemption', 'retired']],
    'a minimal-system exemption naming an unoffered system is a stale pin',
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
const unknownArgs = argv.filter((a) => a !== '--network' && !(NETWORK && /^--evidence=.+/.test(a)));
if (unknownArgs.length) {
  // Exit 64 (EX_USAGE), never 2: 2 is reserved for an inconclusive --network
  // run (provider outage), which CI treats as a warning.
  console.error(`FAIL usage :: unknown argument(s): ${unknownArgs.join(' ')}`);
  console.error('       usage: node scripts/validation/accent-drift.mjs [--network [--evidence=<file.json>]]');
  console.error('       --network adds the opt-in live webfont probe (npm run validate:webfont-fetch);');
  console.error('       exit 0 pass · 1 defect · 2 inconclusive (provider/network outage).');
  process.exit(64);
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

// ---------------------------------------------------------------------------
// The canonical registry (/ds/design-system.js, evaluated) and the wrapper.
// ---------------------------------------------------------------------------
let registry = { systems: undefined, accents: undefined, systemDefaultAccents: undefined, source: '' };
try {
  registry = readCanonicalRegistry(ROOT);
} catch (err) {
  fail('parser-rot', `could not evaluate ${REGISTRY_REL}: ${err.message}`);
}
const registrySource = registry.source;
const systemIds = Object.keys(registry.systems ?? {});
const registryAccents = Array.isArray(registry.accents) ? registry.accents : [];
const accentIds = registryAccents.map((accent) => accent?.id);
const systemDefaultAccents = new Map(Object.entries(registry.systemDefaultAccents ?? {}));

if (!systemIds.length) fail('parser-rot', `parsed ZERO systems out of window.DESIGN_SYSTEMS in ${REGISTRY_REL}`);
if (!registryAccents.length) fail('parser-rot', `parsed ZERO accents out of window.ACCENTS in ${REGISTRY_REL}`);
if (!systemDefaultAccents.size) fail('parser-rot', `parsed ZERO entries out of window.SYSTEM_DEFAULT_ACCENT in ${REGISTRY_REL}`);

const wrapper = checkRuntimeWrapper(tsSrc, registry, registrySource);
if (!wrapper.found) fail('parser-rot', `could not execute ${TS_REL}`);
for (const issue of wrapper.issues) fail('boot-registry', issue);
const defaultSystemId = wrapper.defaultSystem ?? null;
const defaultAccentId = wrapper.defaultAccent ?? null;

const bootIssues = wrapper.found ? checkThemeBoot(htmlSrc, viteSrc, wrapper, registry) : [];
for (const issue of bootIssues) fail('boot-generation', issue);

// ---------------------------------------------------------------------------
// Accents: the applier paints the pair inline; nothing in the app competes.
// ---------------------------------------------------------------------------
const appSheetRels = APP_SHEET_DIRS.flatMap((dir) => (fs.existsSync(path.join(ROOT, dir)) ? walkFiles(dir, /\.css$/) : []))
  .filter((rel) => rel !== CSS_REL);
const appSheets = appSheetRels.map((rel) => ({ rel, src: read(rel) }));
const inlineStyles = cheerio.load(htmlSrc)('style').toArray().map((el) => cheerio.load(el).text());
if (inlineStyles.length) appSheets.push({ rel: `${HTML_REL} <style>`, src: inlineStyles.join('\n') });
if (!appSheetRels.includes(BRIDGE_REL)) fail('parser-rot', `walked the app stylesheets without reaching ${BRIDGE_REL} — the app-sheet scan went vacuous`);

failures.push(...compareAccentPaint({ accents: registryAccents, registrySource, appSheets }));

// :root's pre-apply default pair must be DEFAULT_ACCENT's swatch.
const rootDefault = parseCssRootDefault(cssSrc);
if (!defaultAccentId) {
  fail('parser-rot', `DEFAULT_ACCENT is unavailable in ${TS_REL}`);
} else if (!rootDefault) {
  fail('parser-rot', `could not locate the bare ":root { … }" token block in ${CSS_REL}`);
} else {
  const expected = registryAccents.find((accent) => accent?.id === defaultAccentId);
  if (!expected) {
    fail('root-default', `DEFAULT_ACCENT "${defaultAccentId}" in ${TS_REL} is not one of the ACCENTS in ${REGISTRY_REL}`);
  } else {
    for (const [field, cssVarName] of [
      ['primary', '--accent'],
      ['secondary', '--accent-2'],
    ]) {
      if (normalizeColor(expected[field]) !== normalizeColor(rootDefault[field] ?? '')) {
        fail(
          'root-default',
          `:root ${cssVarName} in ${CSS_REL} is ${rootDefault[field] ?? '(absent)'} but DEFAULT_ACCENT "${defaultAccentId}" ${field} is ${expected[field]} — the pre-apply paint disagrees with the default swatch`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Design systems: every offered system paints from its own vars, and every
// [data-system="…"] rule — canonical skin or app skin — names one of them.
// ---------------------------------------------------------------------------
if (defaultSystemId && systemIds.length && !systemIds.includes(defaultSystemId)) {
  fail('system-fallback', `DEFAULT_SYSTEM "${defaultSystemId}" in ${TS_REL} is not one of the DESIGN_SYSTEMS in ${REGISTRY_REL}`);
}
const systemBlocks = registrySystemBlocks(registry.systems);
if (systemIds.length) failures.push(...compareSystemPaint(systemIds, systemBlocks));

const cssSystemParsed = parseCssSystemSelectors(cssSrc);
const cssSystemSkins = cssSystemParsed.skins;
failures.push(...compareMalformedSystemSelectors(cssSystemParsed.malformed, CSS_REL));
if (!cssSystemSkins.length) {
  fail('parser-rot', `parsed ZERO [data-system="…"] component skin rules out of ${CSS_REL}`);
} else if (systemIds.length) {
  failures.push(...compareSystemSkins(systemIds, cssSystemSkins, CSS_REL));
}
const appSystemSkins = [];
for (const { rel, src } of appSheets) {
  const { skins, malformed: malformedSkins } = parseCssSystemSelectors(src);
  failures.push(...compareMalformedSystemSelectors(malformedSkins, rel));
  appSystemSkins.push(...skins);
  if (systemIds.length) failures.push(...compareSystemSkins(systemIds, skins, rel));
}

// default-prepaint: the bare :root is what shows before the applier writes
// DEFAULT_SYSTEM's vars. The boot contract above makes the applier run
// synchronously in <head>, ahead of first paint, so a divergence cannot reach
// a screen while it holds: then it is reported as a NOTE (the canonical files
// are never edited here). If the boot contract is broken, it is a FAILURE.
const rootTokens = parseCssRootTokens(cssSrc);
if (!rootTokens) fail('parser-rot', `could not locate a bare ":root { … }" block in ${CSS_REL}`);
const prePaint = rootTokens && defaultSystemId && registry.systems?.[defaultSystemId]
  ? compareDefaultPrePaint(defaultSystemId, registry.systems[defaultSystemId].vars, rootTokens)
  : [];
const prePaintGuarded = bootIssues.length === 0 && wrapper.found;
if (!prePaintGuarded) {
  for (const d of prePaint) {
    fail('default-prepaint', `${d.message} — and the boot contract is broken, so this pre-apply value can reach the first paint`);
  }
}

// ---------------------------------------------------------------------------
// Per-system default accents: SYSTEM_DEFAULT_ACCENT must name every design
// system exactly once, and every accent it names must be a real ACCENTS id.
// ---------------------------------------------------------------------------
if (systemIds.length && accentIds.length && systemDefaultAccents.size) {
  failures.push(...compareSystemDefaultAccents(systemIds, systemDefaultAccents, accentIds));
}
if (defaultSystemId && defaultAccentId && systemDefaultAccents.size) {
  failures.push(...compareDefaultSystemAccent(defaultSystemId, defaultAccentId, systemDefaultAccents));
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
for (const d of tsFonts.duplicates) {
  fail('font-duplicate-id', `FONT_OPTIONS in ${FONTS_REL} declares id "${d.id}" twice (first stack ${JSON.stringify(d.first)}, later ${JSON.stringify(d.duplicate)}) — the picker would list two entries for one stored value, FONT_BOOT_DATA keeps the last stack while applyFontOverride() finds the first, so boot and runtime paint different faces`);
}
if (!fontRegistry.found) fail('parser-rot', `${FONTS_REL} does not export FONT_BOOT_DATA`);
for (const issue of fontRegistry.issues) fail('font-boot-registry', issue);
if (!bootFonts.found) fail('parser-rot', `could not locate "var FONT_BOOT = ${FONT_BOOT_MARKER}" in ${HTML_REL}`);
if (!bootFonts.consumesStacks) fail('boot-generation', `${HTML_REL} does not consume generated FONT_BOOT.stacks`);
// The boot may either apply FONT_BOOT.fallback for an unknown id, or apply
// nothing — which is the same outcome only while the fallback option is the
// empty-stack "System default" (no override at all).
const fontFallbackStack = tsFonts.fonts.get(runtimeFontFallback);
if (!bootFonts.consumesFallback && !(bootFonts.skipsEmptyStack && fontFallbackStack === '')) {
  fail('boot-generation', `${HTML_REL} neither consumes generated FONT_BOOT.fallback nor skips an unknown/empty-stack override while FONT_OPTIONS[0] ("${runtimeFontFallback}") is the empty-stack default — the boot and applyFontOverride() disagree about an unknown stored font`);
}

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
for (const id of fontSheets.duplicates) {
  fail('font-duplicate-id', `FONT_STYLESHEETS in ${FONTS_REL} declares key "${id}" twice — the object literal silently keeps the LAST href, so the gate would verify a URL the runtime never requests`);
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
if (systemIds.length && defaultSystemId) {
  failures.push(...checkSystemIdResolution(tsSrc, { systemIds, defaultSystemId, registry }));
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
const cssSystemFonts = registrySystemFonts(registry.systems);
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
  fail('parser-rot', `read ZERO systems' font vars out of DESIGN_SYSTEMS in ${REGISTRY_REL}`);
}
if (!staticFontHrefs.length) {
  fail('parser-rot', `could not locate any always-on <link rel="stylesheet"> in ${HTML_REL} — the pre-paint font loader cannot be verified`);
}
if (cssRootFonts?.size && systemIds.length) {
  failures.push(
    ...compareSystemFontCoverage({
      systemIds,
      rootFonts: cssRootFonts,
      systemFonts: cssSystemFonts,
      staticHrefs: staticFontHrefs,
    }),
  );
}

if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f.kind} :: ${f.message}`);
  console.error(`\n${failures.length} theme-drift failure(s).`);
  console.error(`       Systems, accents and SYSTEM_DEFAULT_ACCENT live only in ${REGISTRY_REL}`);
  console.error(`       (verbatim, never edited); ${TS_REL} wraps those globals, and the`);
  console.error(`       pre-paint boot in ${HTML_REL} reads them after loading /ds/* synchronously.`);
  console.error(`       ${VITE_REL} injects THEME_BOOT_DATA / FONT_OPTIONS-derived FONT_BOOT_DATA;`);
  console.error(`       app sheets (${BRIDGE_REL} and the rest) may not repaint the accent.`);
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

console.log(`PASS boot-registry :: ${TS_REL} restates no table; its getters return the ${REGISTRY_REL} globals; DEFAULT_SYSTEM "${defaultSystemId}" / DEFAULT_ACCENT "${defaultAccentId}" are applyDesignSystem()'s own fallbacks`);
console.log(`PASS boot-generation :: ${HTML_REL} loads ${CANONICAL_CSS_HREF} + ${CANONICAL_JS_HREF} synchronously ahead of the inline boot, which reads the canonical globals with storage keys "${wrapper.storageKeys.system}"/"${wrapper.storageKeys.accent}" and fallback "${defaultSystemId}" from ${TS_REL}`);
console.log(`PASS accent-paint :: applyDesignSystem() paints --accent/--accent-2 from ${registryAccents.length} accent(s); ${appSheets.length} app stylesheet(s) declare no [data-accent] rule or accent token`);
for (const accent of registryAccents) console.log(`       ${accent.id.padEnd(8)} ${accent.primary} / ${accent.secondary}`);
console.log(`PASS root-default :: the canonical :root paints DEFAULT_ACCENT "${defaultAccentId}" (${rootDefault.primary} / ${rootDefault.secondary})`);
console.log(`PASS system-paint :: ${systemIds.length} system(s) each paint from their own DESIGN_SYSTEMS vars — ${systemIds.join(', ')} (fallback "${defaultSystemId}")`);
const sharedTokenPeers = systemIds.filter((id) => !MINIMAL_TOKEN_SYSTEMS.has(id));
const sharedTokenContract = sharedSystemTokens(sharedTokenPeers, systemBlocks).tokens;
console.log(
  `PASS system-tokens :: ${sharedTokenContract.size} shared token(s) agreed by ${sharedTokenPeers.length} system(s); every non-exempt system declares them`,
);
console.log(
  `PASS system-skin :: ${cssSystemSkins.length} canonical and ${appSystemSkins.length} app [data-system] rule(s) name only offered systems — ${[...new Set([...cssSystemSkins, ...appSystemSkins].map(({ id }) => id))].join(', ')}`,
);
console.log(
  `PASS system-accent :: every design system names a default accent that exists — ${[...systemDefaultAccents]
    .map(([system, accent]) => `${system}→${accent}`)
    .join(', ')}`,
);
console.log(
  `PASS system-default-accent :: DEFAULT_SYSTEM "${defaultSystemId}" and DEFAULT_ACCENT "${defaultAccentId}" agree with SYSTEM_DEFAULT_ACCENT`,
);
if (prePaint.length) {
  console.log(`NOTE default-prepaint :: ${prePaint.length} token(s) where the canonical :root in ${CSS_REL} differs from DESIGN_SYSTEMS.${defaultSystemId}.vars.`);
  console.log('       Unreachable while boot-generation holds (the applier writes these inline in <head> before first paint);');
  console.log('       it becomes a FAILURE the moment the boot contract breaks. Canonical files are never edited here.');
  for (const d of prePaint) console.log(`       ${d.message}`);
} else {
  console.log(`PASS default-prepaint :: the canonical :root agrees with every token DESIGN_SYSTEMS.${defaultSystemId}.vars declares`);
}
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
for (const id of [...systemIds].sort()) {
  const asked = [...effectiveSystemFonts(id, cssRootFonts, cssSystemFonts)]
    .map(([token, { value }]) => `${token.replace('--font-', '')}=${stackFamilies(value ?? '')[0] ?? '?'}`)
    .join(' ');
  console.log(`       ${id.padEnd(10)} ${asked}`);
}
console.log('\nPASS accent-drift :: the canonical /ds registry, its wrapper, the pre-paint boot, the app stylesheets and the font loaders all agree');

// ---------------------------------------------------------------------------
// Live webfont probe — opt-in, and never from the registered gate
// ---------------------------------------------------------------------------
// The registered `accent-drift` validation command runs this file with no
// arguments and stops here: the validation suite stays offline, so no Google
// Fonts outage or egress proxy can fail an unrelated change.
if (!NETWORK) {
  console.log('\nNOTE  the live webfont probe did NOT run here (this offline gate never touches the network;');
  console.log('       the hosted check is the separate `webfont-fetch` validation command and CI job).');
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

// Outage vs defect. A transport error / 5xx / 429 after every retry says the
// network or provider is down, not that the repo is wrong — that is
// INCONCLUSIVE (exit 2), so CI can warn without blaming a font change. A 4xx,
// a 200 that lacks the asked-for family, or a CSP-blocked file is the
// provider's actual answer about this repo's URL — a DEFECT (exit 1).
const outageTargetIds = new Set(
  verifiable.filter((_, i) => responses[i].error).map((target) => target.id),
);
const isOutageFailure = (f) => f.kind === 'webfont-http' && outageTargetIds.has(f.id);
const defectFailures = probeFailures.filter((f) => !isOutageFailure(f));
const outageFailures = probeFailures.filter(isOutageFailure);
const webfontVerdict = defectFailures.length ? 'fail' : outageFailures.length ? 'inconclusive' : 'pass';

// --evidence=<file>: keep the raw per-URL answers (status, attempts, transport
// error, served families, a bounded body excerpt) so a CI failure can be
// diagnosed from the artifact without rerunning.
const evidenceArg = argv.find((arg) => arg.startsWith('--evidence='));
if (evidenceArg) {
  const evidencePath = path.resolve(evidenceArg.slice('--evidence='.length));
  const evidence = {
    generatedAt: new Date().toISOString(),
    verdict: webfontVerdict,
    targets: verifiable.map((target, i) => {
      const response = responses[i];
      const served = response.status === 200 ? parseServedFamilies(response.body) : { families: new Set(), blocks: 0 };
      return {
        id: target.id,
        href: target.href,
        requestedFamilies: target.families,
        status: response.status,
        attempts: response.attempts,
        transportError: response.error ?? null,
        servedFamilies: [...served.families],
        fontFaceBlocks: served.blocks,
        bodyExcerpt: String(response.body ?? '').slice(0, 600),
      };
    }),
    failures: probeFailures.map((f) => ({ ...f, class: isOutageFailure(f) ? 'outage' : 'defect' })),
  };
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`       evidence written to ${evidencePath}`);
}

if (webfontVerdict === 'inconclusive') {
  for (const f of outageFailures) console.error(`WARN ${f.kind} :: ${f.message}`);
  console.error(`\nINCONCLUSIVE webfont-fetch :: ${outageFailures.length} URL(s) got no usable answer after ${PROBE_ATTEMPTS} attempts (transport error / 5xx / 429).`);
  console.error('       This is a network or provider outage, not a verdict on the URLs. Rerun when the');
  console.error('       provider is reachable; exit 2 lets CI report it as a warning, not a defect.');
  process.exit(2);
}

if (probeFailures.length) {
  for (const f of probeFailures) console.error(`FAIL ${f.kind}${isOutageFailure(f) ? ' (outage)' : ''} :: ${f.message}`);
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
