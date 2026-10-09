#!/usr/bin/env node

/**
 * Canonical token parity gate.
 *
 * The canonical design system is the authority for every CSS custom property
 * the runtime paints from, and the app serves it verbatim:
 *   - client/public/ds/design-system.css — the bare `:root` pre-apply defaults,
 *     the utilities and the per-system component skins
 *   - client/public/ds/design-system.js  — `DESIGN_SYSTEMS[id].vars` (written
 *     inline on <html> by applyDesignSystem()), `ACCENTS` (the accent pair,
 *     also inline) and `SYSTEM_DEFAULT_ACCENT`
 * Both are pinned (CANONICAL_PINS) to the sha256 of the design-system fetch
 * they were copied from, and design-system.js is evaluated (node:vm, through
 * scripts/generate-design-system-artifact.mjs), never re-parsed.
 * client/index.html links the sheet and loads the script before its pre-paint
 * boot; everything the app adds lives in sheets around it — app-only tokens
 * and rules in client/src/styles/app-bridge.css, the Tailwind entry
 * client/src/index.css and its @import graph, every other client/src CSS file
 * and index.html's own <style>. So the gate models the SAME canonical pair on
 * both sides and proves that nothing the app adds changes what it paints.
 *
 * What is compared is the EFFECTIVE value per system — the value the browser
 * resolves on <html data-system="…" data-accent="…"> — not the raw blocks.
 * Every html-level custom-property declaration on both sides (the runtime's
 * `:root`, `:root[data-system]`, `:root[data-accent]` blocks across every
 * sheet the document loads; the design's `:root` block plus the inline
 * `style` writes applyDesignSystem() performs) is fed to one cascade resolver
 * that ranks the way css-cascade-5 does: importance first; then inline
 * `style` over stylesheet rules; then CASCADE LAYER by the document's own
 * layer order — named layers in order of first appearance across every sheet
 * (an `@layer a, b;` statement, an `@import … layer(a)` or an `@layer a {}`
 * block, whichever the document meets first, each imported sheet spliced in
 * at its `@import`'s own position so an importer's statements ABOVE its
 * imports come first and its rules below them come after), each anonymous
 * `@layer {}` its own layer, a sublayer `a.b` ahead of `a`'s direct styles,
 * unlayered last; for normal declarations the LATER layer wins and unlayered
 * beats every layer, for `!important` that order is reversed, so an earlier
 * layer's `!important` beats a later layer's and the unlayered `!important`
 * loses to any layered one — then specificity (`:root` 0,1,0 <
 * `:root[data-…]` 0,2,0), then document order (client/index.html <style>
 * first, then index.css's @import graph in that same spliced order, relative,
 * root-relative and bare package imports alike; an `@import` the browser
 * drops — after another rule, or nested in a block — is not followed; a sheet
 * the walk cannot reach is ranked last), then position. So `:root { --surface: X
 * !important }` outranks a later canonical-valued `:root[data-system=
 * "editorial"]` block exactly as it does in the browser, a second `:root {
 * --bg }` at the bottom of the file wins, a system block placed after the
 * accent blocks steals --accent, and `@layer early { :where(.hide-tablet) {
 * display: block !important } }` beats a later layer's `.hide-tablet.hide-
 * tablet { display: none !important }` however specific. The two sides
 * may differ in structure (a system's vars restate every token; an app sheet
 * may add a :root block), so the comparison is always the resolved value,
 * never a raw block.
 *
 * Rules (each failure names the system, the token and both values):
 *   0. Verbatim pair: client/public/ds/design-system.{css,js} carry the pinned
 *      digests, the newest .cache/ds-fetch-* directory on disk (if any) still
 *      matches them, `--served URL` optionally proves a running server serves
 *      the same bytes, and inside the model the served pair must equal the
 *      canonical inputs byte for byte. Rule 3 additionally compares the
 *      pre-apply `:root` cascade (what paints before, or without, the applier).
 *   1. Every system the design ships must be offered by the served registry.
 *   2. Every token the design resolves for a system must exist in the runtime's
 *      cascade for that system (a design-only token the runtime lacks is a gap
 *      the canonical components would paint through as `initial`).
 *   3. Every token present on BOTH sides must resolve to the same value.
 *   4. Every accent the design ships must exist with the same primary/secondary
 *      pair, the runtime must not offer an accent the design lacks, and all
 *      50 system × accent combinations must resolve --accent/--accent-2 to the
 *      design's pair (a system block, an !important, or a sibling sheet that
 *      steals the accent for one combination is reported by combination).
 *   5. Registry and boot: the served SYSTEM_DEFAULT_ACCENT maps every system to
 *      the design's default accent; client/src/lib/design-system.ts boots the
 *      applier's own fallbacks (DEFAULT_SYSTEM = its fallback system,
 *      DEFAULT_ACCENT = ACCENTS[0] = SYSTEM_DEFAULT_ACCENT[DEFAULT_SYSTEM]),
 *      reads the window globals and checks boot id/default metadata against
 *      the canonical tables; the index.html
 *      pre-paint boot reads the same storage keys and falls back to the same
 *      system — as string literals or as fields of THEME_BOOT_DATA injected by
 *      vite.config.ts into the __AWESOME_VIDEO_THEME_BOOT__ marker.
 *   6. A mismatch may only survive as an entry in DOCUMENTED_DEVIATIONS, which
 *      needs a written reason AND a machine check that proves the reason still
 *      holds. A stale entry (values now equal, or the check no longer true)
 *      FAILS, so deviations expire on their own the moment the design catches
 *      up. Runtime-only tokens (Replit additions such as motion) are
 *      reported, never failed — the DESIGN-SYNC record lists them.
 *   7. Shell geometry: the runtime must resolve every shell geometry token
 *      (--shell-…, --page-pad-…, --content-max…, --footer-pad) to the value the
 *      design hard-codes (design-system.css .sidebar/.icon-rail/.header, app.jsx page
 *      padding + content measures, layout.jsx footer padding) under EVERY
 *      system — geometry is system-independent in the design, so a system
 *      block that re-declares one is drift. Values are parsed from the design
 *      files, not typed here.
 *   8. Canonical utility rules (.page, .grain, .card…, .chip…, .dot…, .eyebrow,
 *      .kbd, .mono, .display…, .hide-…, .show-…) must carry the design's declarations
 *      verbatim (normalised), including the byte-identical base64 grain asset.
 *      A declaration-level deviation uses the key `rule:<selector>:<property>`
 *      in DOCUMENTED_DEVIATIONS under the same reason + holds() contract.
 *   9. Responsive geometry: the shell breakpoints are mobile <768, tablet
 *      768–1023, desktop ≥1024 (docs/parity/DESIGN-SYNC.md). The runtime must
 *      re-assign --shell-sidebar-w to the design's tablet sidebar width inside
 *      the tablet query and --shell-header-h to the design's mobile header
 *      height inside the mobile query (RESPONSIVE_GEOMETRY), and NO other
 *      scoped (@media/@supports/@layer/@container) declaration may touch a
 *      tracked token — the design has no responsive token values beyond these.
 *  10. Single source of truth: a design token (the canonical :root tokens,
 *      every system's vars, --accent/--accent-2) may be set ONLY by the
 *      canonical sheet's :root and applyDesignSystem()'s inline writes — no app
 *      sheet (app-bridge.css, everything index.css imports, client/index.html
 *      <style>) may declare one under any selector, :root included, even when
 *      the inline write would still win on <html>. Shell geometry tokens are
 *      app-owned and may be declared only in the top-level :root of
 *      app-bridge.css plus rule 9's responsive re-assignments. Any other
 *      selector (`html`, `*`, `body`, `.page`, a compound
 *      `:root[data-system][data-accent]`, …) FAILS — custom properties
 *      inherit, so a descendant re-declaration repaints every element below it
 *      even though <html> still resolves the canonical value.
 *  11. Shadow rules: for every canonical utility, under every system, the
 *      property values the cascade resolves for that utility's element must
 *      agree between the design and the runtime wherever a NON-canonical rule
 *      wins on either side. Candidates are decided by a selector engine, not
 *      by selector text: the element is modelled as "unknown type, exactly the
 *      utility's classes, no other attribute, unknown document position", and a
 *      rule qualifies when some document can make it match — type selectors and
 *      non-html-level ancestors are dropped (so `.page .chip`, `span.chip`,
 *      `.no-anim *` qualify), id/other-attribute tests and pseudo-elements never
 *      match, `:root[data-system]`/`[data-accent]` ancestors are evaluated
 *      against the system under test, and state/structural pseudo-classes and
 *      `:has()` become evaluation contexts. Every runtime sheet in the document
 *      participates with the same importance → inline → layer order →
 *      specificity → order ranking as the tokens, so `[class~="chip"]`,
 *      `:is(.chip)`, `.chip:not(.accent)`, `:where(.chip) { … !important }`,
 *      a later sibling sheet, a `[data-system="geist"] .chip` override, an
 *      earlier layer's `:where() { … !important }` against a later layer's
 *      restore, a `@layer` statement or anonymous/nested layer that reorders
 *      two layers, and an `!important` in any layer against the unlayered
 *      canonical `!important` are all caught, while `:where(.chip)` at zero
 *      specificity, a normal-importance `@layer` copy, a canonical-valued rule
 *      in the winning layer, and a print-only `@media` list (not a screen
 *      parity surface — `not print` and `screen, print` still count) are
 *      not. Rules with no class test on the element
 *      are element styles and only count when they can outrank a class rule
 *      (`* { … !important }`, `.no-anim *`); a rule naming an element type
 *      never does. @supports/@container conditions are assumed to apply. The
 *      parser sees what the browser sees: CSS Nesting is flattened (`.page {
 *      .chip {} }`, `.chip { @media (…) {} }`, `:root { & {} }`) and hex
 *      escapes are decoded (`.\63 hip` is `.chip`). A surviving difference
 *      uses the key `shadow:<winning rule key>:<property>` in
 *      DOCUMENTED_DEVIATIONS under the same reason + holds() contract.
 *  12. The canonical pair must load: client/index.html links
 *      /ds/design-system.css exactly once with no media query (a conditioned
 *      link paints the tokens only while it matches), and loads
 *      /ds/design-system.js with a plain synchronous <script src> placed before
 *      the inline boot that calls applyDesignSystem(). An @import of the sheet
 *      anywhere in the index.css graph is a second load (rule 13).
 *  13. Every `@import` must be well-placed and single: index.css is a
 *      Tailwind root, and the Tailwind compiler inlines every import of the
 *      graph where it sits — after another rule, nested inside a block, or a
 *      second time — so that is how the document is modelled (the sheet IS
 *      loaded there, wrapped in the enclosing at-rules). But css-syntax,
 *      postcss-import and a browser given the raw sheet drop an `@import`
 *      that is not at the top of its sheet (only `@charset`, `@layer`
 *      statements and other imports may precede it), so a misplaced import
 *      means a different document per pipeline; and a doubled import applies
 *      every rule of its sheet twice at two positions. Both FAIL.
 *  14. Condition-independent layer order: Chromium registers a cascade layer
 *      only from the rules whose `@media`/`@supports`/`@container` groups
 *      currently match, so a layer whose first declaration sits inside a
 *      condition can swap places with a sibling declared later when the
 *      condition is false — and every `!important` contest between them
 *      flips. The linearised order (all conditions true) is what rules 3/11
 *      rank by; any sibling pair whose order can differ under some evaluation
 *      of the conditions (LayerOrder.swapWitness — conditions are opaque,
 *      independent atoms, no media semantics) FAILS and names the
 *      unconditional `@layer a, b;` statement that pins it.
 *  15. Canaries: every run first mutates in-memory copies of the live inputs
 *      (later :root override, :root !important vs a canonical system block,
 *      system block stealing --accent (plain and !important), system-scoped
 *      geometry, later .chip rule, extra/removed/changed media override, scoped
 *      token, sibling stylesheet, descendant/universal/html re-declaration,
 *      second system block, compound layer, the selector-equivalent shadows
 *      listed under rule 11 with their expected PASS controls, nested and
 *      hex-escaped spellings, non-print media lists, the cascade-layer cases
 *      in LAYER_CANARIES (two-layer !important in both orders, `@layer`
 *      statement order, anonymous layers, nested sublayers, layered vs
 *      unlayered !important, later-layer-wins for normal declarations, the
 *      vendor statement ordering layers an app sheet only uses, an
 *      the main sheet loaded into a layer), the document cases in
 *      DOCUMENT_CANARIES (rewriting index.css through an in-memory overlay:
 *      `@layer early;` above a `layer(late)` import with and without a
 *      pinning statement, imports misplaced after a rule and inside
 *      `@media`, a doubled import, media- and print-conditioned imports, the
 *      canonical sheet @imported again, a layer first declared only under a
 *      desktop query), the index.html cases (link removed or media-
 *      conditioned, registry script deferred or moved below the boot, boot
 *      storage key or fallback renamed, marker no longer injected), the
 *      served-pair cases (one byte, a registry value, an accent) plus the
 *      registry/accent/deviation/geometry/utility cases) and
 *      asserts the gate FAILS each one on the expected rule (or PASSES where
 *      the browser would paint the canonical value). A canary that escapes
 *      means the parser has regressed, and the gate fails on that alone.
 *      Canaries are judged on the failures a mutation ADDS to the live
 *      inputs' own (the gate reports those itself), so a live finding can
 *      neither mask nor fake a canary; mutations target app-bridge.css (the
 *      `bridge` key), where app rules actually live. The
 *      layer and document canaries are additionally rendered in real Chromium
 *      by canonical-token-parity-browser-check.mjs (evidence:
 *      docs/parity/evidence/tokens/layer-order-browser.json) so each
 *      expectation is the browser's, not the gate's own opinion.
 *
 * Document order: index.html <style> above the canonical <link> [0], the
 * canonical sheet [1], <style> below it [2], then index.css and its @import
 * graph [3, …] (Vite injects the bundle's CSS after the head), component
 * sheets outside the graph last. Tailwind: index.css opens with `@layer theme,
 * base, components;` and imports tailwindcss/theme.css into theme,
 * preflight.css into base and utilities.css unlayered (the canonical sheet is
 * unlayered and resets `*` padding, so layered utilities would lose), which
 * is why the modelled order is `theme < base < components < unlayered`. The
 * `@theme` block is a compiler directive: its variables come out inside
 * `@layer theme` at normal importance and are namespaced (--color-*,
 * --font-*, --radius-*). Rule 10 still scans index.css's html-level rules
 * like any other sibling, and rules 3/11 rank layered rules exactly where the
 * layer order puts them.
 *
 * Usage:
 *   node scripts/validation/canonical-token-parity.mjs            # gate (exit 1 on drift)
 *   node scripts/validation/canonical-token-parity.mjs --json DIR # also write
 *        DIR/canonical-tokens.json, DIR/app-tokens.json and DIR/token-diff.json
 *   node scripts/validation/canonical-token-parity.mjs --served http://localhost:5001
 *        also fetch /ds/design-system.{css,js} from a running server and compare to the pins
 *   node scripts/validation/canonical-token-parity.mjs --app-css PATH --app-js PATH --app-bridge PATH \
 *        --index-html PATH --app-registry PATH --vite-config PATH --canonical-css PATH --canonical-js PATH \
 *        --canonical-app PATH --canonical-layout PATH
 *        (mutation probing: point the parser at copies without touching the tree; the pins
 *        are checked against the --app-* and --canonical-* copies too)
 *   node scripts/validation/canonical-token-parity.mjs --canaries-only   # self-test only
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { applierFallbacks, applierPaintsAccentPair, evaluateCanonicalRegistry, evaluateBootRegistry, readThemeBootData } from '../generate-design-system-artifact.mjs';
import { accentContrastTable } from './app-accent-contrast.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const DEFAULT_PATHS = {
  // What the SPA serves: the verbatim canonical pair, linked/loaded by
  // client/index.html before the app bundle.
  appCss: 'client/public/ds/design-system.css',
  appJs: 'client/public/ds/design-system.js',
  // App-only rules and tokens (status, motion, shell geometry), imported by index.css.
  appBridge: 'client/src/styles/app-bridge.css',
  appEntryCss: 'client/src/index.css',
  appRegistry: 'client/src/lib/design-system.ts',
  appIndexHtml: 'client/index.html',
  viteConfig: 'vite.config.ts',
  appCssRoots: ['client/src'],
  viteRoot: 'client',
  vitePublic: 'client/public',
  // The design authority. By default the same files the app serves: the pins
  // below prove they are the fetched canonical bytes, so the model's job is to
  // prove nothing the app adds around them changes what they paint.
  canonicalCss: 'client/public/ds/design-system.css',
  canonicalJs: 'client/public/ds/design-system.js',
  // Shell geometry is hard-coded in the frozen prototype's JSX, not in the
  // canonical pair (the latest fetch's handoff/project/layout.jsx no longer
  // carries the site footer, so the frozen copy stays the geometry source).
  canonicalApp: 'awesome-list-site-ds/app.jsx',
  canonicalLayout: 'awesome-list-site-ds/layout.jsx',
};

// Rule 0 — the served pair is the canonical fetch, byte for byte. The digests
// were taken from the design-system fetch named here (its styles.css and
// design-system.js); re-pin only when a new fetch is adopted verbatim.
export const CANONICAL_FETCH = { dir: '.cache', prefix: 'ds-fetch-', pinned: 'ds-fetch-20260929T0714Z' };
export const CANONICAL_PINS = [
  { file: DEFAULT_PATHS.appCss, href: '/ds/design-system.css', fetched: 'styles.css', sha256: '31fde358acc5bea61c68b17025326169fad4e60c62b898fbacf279a9bc9b2070' },
  { file: DEFAULT_PATHS.appJs, href: '/ds/design-system.js', fetched: 'design-system.js', sha256: '30c37539db397941f209055af28a5284fbdd14a3322adb869701c70b0e05bc7c' },
];
const CSS_HREF = CANONICAL_PINS[0].href;
const JS_HREF = CANONICAL_PINS[1].href;
const THEME_BOOT_MARKER = '__AWESOME_VIDEO_THEME_BOOT__';

// Canonical utility rules the design JSX relies on. `media||selector` keys
// name rules nested in a media query; the runtime must carry the rule under
// the identical query.
export const UTILITY_RULES = [
  '.page', '.grain', '.mono', '.display', '.serif-italic', '.display-h',
  '.card', '.card.hoverable', '.card.hoverable:hover', '.card.glow:hover',
  '.chip', '.chip.accent', '.chip.ok', '.chip.warn', '.chip.bad', '.chip.muted',
  '.dot', '.dot.ok', '.dot.warn', '.dot.bad',
  '.eyebrow', '.kbd',
  '@media (max-width: 768px)||.hide-mobile',
  '@media (min-width: 769px)||.show-mobile',
  '@media (max-width: 1024px)||.hide-tablet',
  '@media (min-width: 1025px)||.show-tablet',
];

// Rule 8b — the document box. The design sizes `html, body { height: 100% }`;
// only `height` is compared (the rest of `body` is covered by rule 11's
// cascade model through the utilities that inherit from it).
export const BASE_BOX_RULES = ['html', 'body'];

// Shell geometry tokens the runtime must declare in its top-level :root
// cascade, with the canonical source each value is read from (see
// parseCanonicalGeometry).
export const GEOMETRY_TOKENS = [
  '--shell-sidebar-w', '--shell-sidebar-w-tablet', '--shell-rail-w', '--shell-header-h',
  '--page-pad-y', '--page-pad-x', '--content-max', '--content-max-admin', '--footer-pad',
];

// Rule 9 — the ONLY scoped re-assignments of tracked tokens the runtime may
// carry. `context` is the runtime query (the documented shell breakpoints);
// `canonical` names the design rule the value is read from; `via` is the
// geometry token the runtime may reference instead of the literal.
export const RESPONSIVE_GEOMETRY = [
  {
    token: '--shell-sidebar-w',
    context: '@media (min-width: 768px) and (max-width: 1023px)',
    via: '--shell-sidebar-w-tablet',
    canonical: ['@media (max-width: 1024px)||.sidebar', 'width'],
    note: 'tablet 768–1023: the sidebar narrows to the design\'s tablet .sidebar width',
  },
  {
    token: '--shell-header-h',
    context: '@media (max-width: 767px)',
    canonical: ['@media (max-width: 768px)||.header', 'height'],
    note: 'mobile <768: the header drops to the design\'s mobile .header height',
  },
];

// ---------------------------------------------------------------------------
// Documented deviations — the ONLY way a value mismatch survives this gate.
// Key: `${systemId}:${token}`. `reason` is shown in the report; `holds()` must
// return true for the entry to be honoured, and it receives the normalised
// canonical + runtime values plus each side's resolved token map so the reason
// can be re-proved from data rather than trusted. An entry whose values are
// equal, or whose check returns false, is stale and fails the gate.
// ---------------------------------------------------------------------------
const NO_ANIM_REASON =
  'Reduced motion: the runtime\'s motion toggle puts .no-anim on the root and freezes EVERY ' +
  'animation/transition (!important), so a user who turned motion off also loses card hover ' +
  'transitions; the design\'s .no-anim only stops caret, shimmer and live-dot (/ds/design-system.css; ' +
  'the app\'s blanket rule lives in client/src/styles/app-bridge.css). ' +
  'Kept on the WCAG 2.3.3 side. See docs/parity/assumptions/tokens.md §8. Expires when the ' +
  'design freezes transitions under .no-anim too or the runtime narrows its rule.';

const noAnimHolds = ({ canonical, app }) => app === 'none !important' && canonical !== app;

const BODY_HEIGHT_REASON =
  'NB-019 (run20) scroll-lock jump: with the design\'s `html, body { height: 100% }` the body box ' +
  'stays viewport-sized while content overflows it, so when Radix scroll-lock sets ' +
  '`overflow: hidden` on body (any Select/popover open) the document scroll range collapses, ' +
  'window.scrollY clamps to 0 and the page jumps to the top. The runtime keeps ' +
  '`html { height: 100% }`; client/src/styles/app-bridge.css gives body `height: auto`, and the ' +
  'viewport floor that keeps short pages full-height is `body { min-height: 100vh }` from ' +
  'client/src/styles/scrolling-fix.css (4e502ef1, imported after app-bridge.css in index.css, so ' +
  'it supersedes the bridge\'s own `min-height: 100%`). See docs/parity/assumptions/tokens.md §12. ' +
  'Expires when the design stops capping body height or the runtime drops the viewport floor.';

function bodyHeightHolds({ canonical, app, appRules }) {
  if (!appRules || canonical !== '100%' || app !== 'auto') return false;
  const decl = (selector, prop) => {
    const value = appRules.get(selector)?.get(prop);
    return value == null ? null : normaliseValue(value);
  };
  return ['100vh', '100%'].includes(decl('body', 'min-height')) && decl('html', 'height') === '100%';
}

// Rule 11 shadows the app keeps on purpose. Each entry is keyed by the app
// rule that wins and the property it re-declares; the variants it also wins
// on (.chip.accent/.ok/.warn/.bad/.muted) share the key. holds() pins the
// exact values so a change on either side expires the entry.
const ADMIN_TAGS_CHIP = 'client/src/styles/pages/admin-catalog-resources.css .admin-catalog-resources__tags .chip';
const ADMIN_TABLE_CHIP = 'client/src/styles/pages/admin-catalog-resources.css .admin-catalog-resources__table .chip';
const JOURNEY_CARD_CHIP = 'client/src/styles/pages/discovery-journeys.css .journeys-page .journey-card .chip';
const RESOURCE_SECTION_EYEBROW = 'client/src/styles/pages/resource.css [data-system="editorial"] .resource-detail-sections h2.eyebrow';

const ADMIN_TAG_TRUNCATE_REASON =
  'Layout safety: imported tags can be whole phrases, and the canonical .chip (inline-flex, ' +
  'nowrap, no max-width) lets one long tag push the admin resources table\'s Title column out ' +
  'of its cell. The tags cell caps each chip (max-width 132px) and truncates it with an ellipsis, ' +
  'which needs inline-block + overflow: hidden + text-overflow: ellipsis; the full tag stays in ' +
  'the row title. Expires when the design sizes chips inside table cells or the app drops the cap.';

const JOURNEY_CHIP_WRAP_REASON =
  'Layout safety: journey cards are narrow on mobile (375px) and a long topic chip would overflow ' +
  'the card with the canonical nowrap .chip; max-width: 100% + overflow-wrap: anywhere keep it ' +
  'inside the card. Expires when the design bounds chips to their container or the app drops the rule.';

const ADMIN_TABLE_CHIP_MONO_REASON =
  'The prototype\'s admin resources table draws its tag chips as `chip mono` at 9.5px ' +
  '(.cache/ds-fetch-20260929T0714Z/handoff/project/admin.jsx:468, featured star chip at :472). ' +
  'The runtime keeps that mono face and the canonical .chip tracking under every system; the ' +
  'Geist skin (`[data-system="geist"] .chip`, 0,2,0) outranks the prototype\'s `.mono` (0,1,0), so ' +
  'the design itself resolves body face / 0 tracking there. Expires when the table chips drop the ' +
  'mono override or the Geist skin stops re-facing chips.';

const RESOURCE_LABEL_WEIGHT_REASON =
  'The prototype\'s resource-detail card labels are accent-coloured mono text at the default weight ' +
  '(.cache/ds-fetch-20260929T0714Z/handoff/project/pages.jsx:153, :163, :176 — `<div className="mono">` ' +
  'at 10px / 1.4 letter-spacing), not the Editorial eyebrow\'s 700. The runtime renders them as ' +
  'h2.eyebrow for document outline and resets the weight to 400 under Editorial to match. ' +
  'Expires when the design gives those labels the eyebrow weight or the app stops using .eyebrow there.';

const ADMIN_COMPACT_CHIP_REASON =
  'The prototype\'s admin resources table draws compact chips: tag chips at fontSize 9.5 with ' +
  'padding 2px 6px, and the featured star chip at 9.5 with canonical padding ' +
  '(.cache/ds-fetch-20260929T0714Z/handoff/project/admin.jsx:468, :472). The runtime reproduces ' +
  'those sizes in admin-catalog-resources.css. Expires when the prototype drops the compact ' +
  'table chips or the app returns them to canonical .chip metrics.';

const pinned = (canonicalValue, appValue) => ({ canonical, app }) => canonical === canonicalValue && app === appValue;

function rgba(value) {
  value = value?.replace(/\s*!important$/, '');
  if (/^#[0-9a-f]{6}$/i.test(value)) return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16)).concat(1);
  const parts = value?.match(/[\d.]+/g)?.map(Number);
  return parts?.length === 4 ? parts : null;
}
function over(fg, bg) { return fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3])).concat(1); }
function luminance(c) {
  return c.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
function text3ContrastHolds({ canonical, app, appMap }) {
  const fg = rgba(app), old = rgba(canonical);
  if (!fg || !old || old[3] >= fg[3] || fg.slice(0, 3).some((v, i) => v !== old[i])) return false;
  const base = rgba(appMap.get('--bg'));
  const raised = rgba(appMap.get('--bg-2'));
  if (!base || !raised) return false;
  const backgrounds = [base, raised, ...['--surface', '--surface-2', '--surface-3'].map(key => over(rgba(appMap.get(key)), raised))];
  const contrast = (color, bg) => (luminance(over(color, bg)) + .05) / (luminance(bg) + .05);
  return backgrounds.every(bg => contrast(fg, bg) >= 4.6) &&
    backgrounds.some(bg => contrast([...fg.slice(0, 3), fg[3] - .01], bg) < 4.6) &&
    backgrounds.some(bg => contrast(old, bg) < 4.6);
}

// Text-3 is corrected in the app boot registry, never in the frozen sheet.
// All other token values retain canonical parity.
export const DOCUMENTED_DEVIATIONS = new Map([
  ['shadow:client/src/styles/app-bridge.css :root .chip.accent:color', {
    reason: "Approved app-owned small accent ink: decorative palette remains frozen, while every neutral raised backing and 8%/14% tinted state must meet AA. Expires when the canonical chip uses accessible ink.",
    holds: values => pinned('var(--accent)', 'var(--accent-ink)')(values) && accentContrastTable().every(row => row.ratio >= 4.5),
  }],
  ...["editorial", "terminal", "geist", "brutalist", "swiss"].map(id => [`${id}:--text-3`, {
    reason: "App-owned prepaint alpha correction: small metadata must meet the design's promised 4.6:1 on every neutral surface. Expires when canonical contrast catches up.",
    holds: text3ContrastHolds,
  }]),
  ['rule:body:height', { reason: BODY_HEIGHT_REASON, holds: bodyHeightHolds }],
  // Rule 11 (cascade shadows): `shadow:<winning rule key>:<property>`.
  ['shadow:client/src/styles/app-bridge.css .no-anim *:transition', { reason: NO_ANIM_REASON, holds: noAnimHolds }],
  [`shadow:${ADMIN_TAGS_CHIP}:display`, { reason: ADMIN_TAG_TRUNCATE_REASON, holds: pinned('inline-flex', 'inline-block') }],
  [`shadow:${ADMIN_TAGS_CHIP}:overflow`, { reason: ADMIN_TAG_TRUNCATE_REASON, holds: pinned(null, 'hidden') }],
  [`shadow:${ADMIN_TAGS_CHIP}:text-overflow`, { reason: ADMIN_TAG_TRUNCATE_REASON, holds: pinned(null, 'ellipsis') }],
  [`shadow:${JOURNEY_CARD_CHIP}:max-width`, { reason: JOURNEY_CHIP_WRAP_REASON, holds: pinned(null, '100%') }],
  [`shadow:${JOURNEY_CARD_CHIP}:overflow-wrap`, { reason: JOURNEY_CHIP_WRAP_REASON, holds: pinned(null, 'anywhere') }],
  [`shadow:${ADMIN_TABLE_CHIP}:font-family`, { reason: ADMIN_TABLE_CHIP_MONO_REASON, holds: pinned('var(--font-body)', 'var(--font-mono)') }],
  [`shadow:${ADMIN_TABLE_CHIP}:letter-spacing`, { reason: ADMIN_TABLE_CHIP_MONO_REASON, holds: pinned('0', '0.6px') }],
  [`shadow:${ADMIN_TAGS_CHIP}:padding`, { reason: ADMIN_COMPACT_CHIP_REASON, holds: pinned('4px 10px', '2px 6px') }],
  [`shadow:${ADMIN_TABLE_CHIP}:font-size`, { reason: ADMIN_COMPACT_CHIP_REASON, holds: pinned('10.5px', '9.5px') }],
  [`shadow:${RESOURCE_SECTION_EYEBROW}:font-weight`, { reason: RESOURCE_LABEL_WEIGHT_REASON, holds: pinned('700', '400') }],
]);

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------
function stripCssComments(src) {
  return String(src).replace(/\/\*[\s\S]*?\*\//g, '');
}

const IMPORTANT_RE = /!\s*important\s*$/i;

/**
 * Cascade-merge `decls` into `target`: a later declaration replaces an earlier
 * one unless the earlier one is `!important` and the later one is not.
 */
function mergeDeclarations(target, decls) {
  for (const [prop, value] of decls) {
    const previous = target.get(prop);
    if (previous != null && IMPORTANT_RE.test(previous) && !IMPORTANT_RE.test(value)) continue;
    target.set(prop, value);
  }
  return target;
}

/** `prop: value;` declarations of a block body → Map (cascade-merged). Custom property names keep their case. */
function parseDeclarations(body) {
  const out = new Map();
  if (!body) return out;
  // Split on `;` that are not inside parentheses (color-mix/gradients/data URLs
  // carry commas, parens and `;base64` but never a bare semicolon) — values
  // may span lines.
  let depth = 0;
  let quote = null;
  let current = '';
  const parts = [];
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) {
      current += ch;
      if (ch === '\\' && i + 1 < body.length) current += body[++i];
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (ch === ';' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  const decls = new Map();
  for (const part of parts) {
    const m = /^\s*(--[^\s:]+|[A-Za-z-][A-Za-z0-9_-]*)\s*:\s*([\s\S]*?)\s*$/.exec(part);
    if (!m) continue;
    const prop = m[1].startsWith('--') ? m[1] : m[1].toLowerCase();
    mergeDeclarations(decls, new Map([[prop, m[2]]]));
  }
  return mergeDeclarations(out, decls);
}

/** Split a selector list on top-level commas (not inside :is()/:not()/[…]). */
function splitSelectors(prelude) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of prelude) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

const ruleKey = ({ context, selector }) => (context ? `${context}||${selector}` : selector);

const CONTEXT_AT_RULE = /^@(media|supports|layer|container|scope)\b/;

/**
 * Split a rule body into its top-level pieces: declarations (`text`) and
 * nested blocks (`prelude` + body bounds), respecting strings, escapes and
 * parentheses/brackets so a `;` inside `url()` or a `{` inside a string never
 * splits. Statement at-rules (`@import …;`) come back as declarations starting
 * with `@` and are dropped by the caller.
 */
function splitBody(src, start, end) {
  const pieces = [];
  let i = start;
  while (i < end) {
    let j = i;
    let depth = 0;
    let quote = null;
    let stop = null;
    for (; j < end; j += 1) {
      const ch = src[j];
      if (quote) {
        if (ch === '\\') j += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '(' || ch === '[') depth += 1;
      else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
      else if (!depth && (ch === ';' || ch === '{' || ch === '}')) {
        stop = ch;
        break;
      }
    }
    const chunk = src.slice(i, j);
    if (stop === '{') {
      let k = j + 1;
      let nesting = 1;
      quote = null;
      for (; k < end && nesting; k += 1) {
        const ch = src[k];
        if (quote) {
          if (ch === '\\') k += 1;
          else if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '{') nesting += 1;
        else if (ch === '}') nesting -= 1;
      }
      pieces.push({ kind: 'block', prelude: chunk.trim().replace(/\s+/g, ' '), bodyStart: j + 1, bodyEnd: nesting ? end : k - 1 });
      i = k;
      continue;
    }
    if (chunk.trim()) pieces.push({ kind: 'declaration', text: chunk });
    i = j + 1;
  }
  return pieces;
}

/**
 * Resolve a nested selector against its parent rule the way CSS Nesting does:
 * `&` stands for the parent selector list (`:is(parent)`; a lone compound
 * parent is substituted verbatim so keys stay readable), and a nested selector
 * without `&` is a relative selector — a descendant of the parent (`.page {
 * .chip {} }` → `.page .chip`, `.chip { > .x {} }` → `.chip > .x`).
 */
function nestSelector(selector, parents) {
  const parent = parents.length === 1 && !/[\s>+~]/.test(parents[0]) ? parents[0] : `:is(${parents.join(', ')})`;
  if (selector.includes('&')) return selector.replace(/&/g, parent);
  return `${parent} ${selector}`;
}

/**
 * Every style rule occurrence of a stylesheet in source order, with its
 * at-rule context, plus the cascade-merged view keyed by `context||selector`
 * (or the bare selector at top level). Comma lists are split per selector.
 * `!important` stays part of the value. Statement at-rules (@import, @charset)
 * are skipped; block at-rules that are not conditional groups (@keyframes,
 * @font-face, @theme, @property, @starting-style) are not style rules and are
 * skipped whole. CSS Nesting is flattened: a style rule nested in a style rule
 * becomes `parent nested` / `&`-substituted, and a conditional at-rule nested
 * in a style rule becomes that at-rule wrapping the parent selector — so
 * `.page { .chip { … } }`, `.chip { &:hover { … } }` and `:root { @media (…) {
 * --x: … } }` are compared exactly as the browser applies them. A rule's own
 * declarations are recorded before its nested rules (the nesting spec hoists
 * them), and nested rules keep source order after that.
 */
export function parseStylesheet(css, { baseContext = null } = {}) {
  const src = stripCssComments(css);
  const entries = [];
  // Cascade-layer facts the resolver needs (see LayerOrder): every entry
  // carries the dotted path of the layer it lives in (`null` when unlayered;
  // an anonymous `@layer {}` gets a per-sheet `#anonN` name so two anonymous
  // blocks stay two layers), and the statement at-rules that only DECLARE
  // layers — `@layer a, b.c;` and `@import … layer(x)` — are kept with their
  // position among the entries, because the browser orders layers by first
  // appearance and a statement placed early fixes the order for blocks that
  // follow in any sequence. `seq` is ONE source-order counter shared by
  // entries and statements, so a `@layer early;` written before the sheet's
  // first `@import` sorts before everything that import brings in
  // (documentOrder splices an imported sheet in at its import's seq).
  const statements = [];
  let seq = 0;
  let anonymous = 0;
  // `@import` is only honoured at the top level and before any other rule
  // (css-syntax-3: only `@charset`, `@layer` statements and other imports may
  // precede it; postcss-import — which inlines the runtime's imports — applies
  // the same rule). Anything else is a dead import: the browser drops it.
  let firstRuleSeq = null;
  const layerSegments = (name) => name.split('.').map((s) => s.trim()).filter(Boolean);
  const conditionsOf = (contexts) => contexts.filter((c) => !/^@layer\b/.test(c)).join(' ');
  const walk = (start, end, contexts, parents, layerPath, depth) => {
    const pieces = splitBody(src, start, end);
    if (parents) {
      const text = pieces.filter((p) => p.kind === 'declaration' && !p.text.trim().startsWith('@')).map((p) => p.text).join(';');
      const decls = parseDeclarations(text);
      if (decls.size) {
        const context = contexts.join(' ');
        const layer = layerPath.length ? layerPath.join('.') : null;
        for (const selector of parents) entries.push({ context, selector, decls, layer, index: entries.length, seq: seq++ });
      }
    }
    for (const piece of pieces) {
      if (piece.kind === 'declaration') {
        const text = piece.text.trim();
        const layerStatement = /^@layer\s+([^{;]+)$/.exec(text);
        if (layerStatement) {
          const paths = splitSelectors(layerStatement[1]).map((name) => [...layerPath, ...layerSegments(name)].join('.')).filter(Boolean);
          if (paths.length) statements.push({ kind: 'layer', paths, conditions: conditionsOf(contexts), index: entries.length, seq: seq++ });
          continue;
        }
        const importStatement = parseImportStatement(text);
        if (importStatement) {
          const layer = importStatement.layer === '' ? `#anon${++anonymous}` : importStatement.layer;
          const topLevel = depth === 0;
          const valid = topLevel && firstRuleSeq == null;
          statements.push({
            kind: 'import',
            spec: importStatement.spec,
            // The layer the imported sheet lands in: its own layer() under the
            // enclosing @layer blocks, or just the enclosing blocks.
            layer: layer == null ? (layerPath.length ? layerPath.join('.') : null) : [...layerPath, ...layerSegments(layer)].join('.'),
            conditions: importStatement.conditions,
            enclosing: conditionsOf(contexts),
            valid,
            reason: valid ? null : topLevel ? 'it follows another rule' : `it is nested inside ${contexts.length ? contexts[contexts.length - 1] : 'a style rule'}`,
            index: entries.length,
            seq: seq++,
          });
          continue;
        }
        if (depth === 0 && firstRuleSeq == null && !/^@charset\b/i.test(text)) firstRuleSeq = seq;
        continue;
      }
      if (depth === 0 && firstRuleSeq == null) firstRuleSeq = seq;
      const { prelude } = piece;
      if (CONTEXT_AT_RULE.test(prelude)) {
        let nextLayerPath = layerPath;
        if (/^@layer\b/.test(prelude)) {
          const name = prelude.replace(/^@layer\b/, '').trim();
          nextLayerPath = [...layerPath, ...(name ? layerSegments(name) : [`#anon${++anonymous}`])];
        }
        walk(piece.bodyStart, piece.bodyEnd, [...contexts, prelude], parents, nextLayerPath, depth + 1);
      } else if (prelude.startsWith('@')) {
        // @font-face, @keyframes, @property, @page, @starting-style, @theme … — not style rules
      } else {
        const selectors = splitSelectors(prelude).map((selector) => (parents ? nestSelector(selector, parents) : selector));
        if (selectors.length) walk(piece.bodyStart, piece.bodyEnd, contexts, selectors, layerPath, depth + 1);
      }
    }
  };
  // `baseContext` is the condition an `@import … supports(…) <media>` puts
  // around the WHOLE imported sheet: every rule below inherits it, exactly as
  // if the sheet were wrapped in the matching conditional group rules.
  walk(0, src.length, baseContext ? contextParts(baseContext) : [], null, [], 0);
  const rules = new Map();
  const occurrences = new Map();
  for (const entry of entries) {
    const key = ruleKey(entry);
    if (!rules.has(key)) rules.set(key, new Map());
    mergeDeclarations(rules.get(key), entry.decls);
    occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
  }
  return { entries, rules, occurrences, statements, firstRuleSeq };
}

/** Index of the `)` closing the `(` at `open`, honouring nesting and strings; -1 when unbalanced. */
function closingParen(text, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * `@import <url> [layer | layer(<name>)] [supports(…)] [<media-query-list>]`
 * Tailwind v4 additionally permits a `source(…)` modifier after the URL. It
 * is a compiler directive, not a media query, so it is consumed before the
 * real import modifiers are parsed.
 *
 * → { spec, layer, conditions } where layer is the dotted name, '' for an
 * anonymous `layer` keyword and null when the import is unlayered, and
 * conditions is the context the import puts around the imported sheet
 * (`@supports (…) @media …`, '' when unconditional); null for anything that
 * is not an @import.
 */
export function parseImportStatement(text) {
  const m = /^@import\s+(?:url\(\s*)?["']?([^"')\s]+)["']?\s*\)?\s*([\s\S]*)$/.exec(String(text).trim().replace(/;$/, ''));
  if (!m) return null;
  let rest = m[2].trim();
  let layer = null;
  const conditions = [];

  /**
   * Remove a top-level Tailwind `source(…)` modifier without touching a
   * function with the same name inside a supports condition or media feature.
   * Keeping this scan balanced matters for source paths and future source
   * options that contain parentheses.
   */
  const stripSourceModifiers = (input) => {
    let out = '';
    let cursor = 0;
    let depth = 0;
    let quote = null;
    for (let i = 0; i < input.length; i += 1) {
      const ch = input[i];
      if (quote) {
        if (ch === '\\') i += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (ch === '(') {
        depth += 1;
        continue;
      }
      if (ch === ')') {
        depth = Math.max(0, depth - 1);
        continue;
      }
      if (depth !== 0 || (i > 0 && /[A-Za-z0-9_-]/.test(input[i - 1]))) continue;
      const source = /^source\s*\(/i.exec(input.slice(i));
      if (!source) continue;
      const open = i + source[0].lastIndexOf('(');
      const close = closingParen(input, open);
      if (close === -1) {
        // Keep malformed input visible as media text instead of silently
        // swallowing the remainder of an @import statement.
        continue;
      }
      out += input.slice(cursor, i);
      cursor = close + 1;
      i = close;
    }
    return out + input.slice(cursor);
  };

  // `source(none)` is present on the live Tailwind v4 import. It must not
  // become `@media source(none)`, which would make the vendor layer appear
  // conditional to the document/layer walk.
  rest = stripSourceModifiers(rest).trim();

  // Parse the non-media import modifiers in either order. Tailwind's source()
  // may be adjacent to these, and supports()/layer() are valid independently
  // of the eventual media list.
  while (rest) {
    const named = /^layer\s*\(\s*([^)]+?)\s*\)\s*/i.exec(rest);
    if (named) {
      layer = named[1].trim();
      rest = rest.slice(named[0].length).trim();
      continue;
    }
    const anonymous = /^layer(?![\w-])\s*/i.exec(rest);
    if (anonymous) {
      layer = '';
      rest = rest.slice(anonymous[0].length).trim();
      continue;
    }
    const supports = /^supports\s*\(/i.exec(rest);
    if (supports) {
      const open = supports[0].lastIndexOf('(');
      const close = closingParen(rest, open);
      const end = close === -1 ? rest.length : close + 1;
      conditions.push(`@supports ${rest.slice(supports[0].length - 1, end).trim()}`);
      rest = rest.slice(end).trim();
      continue;
    }
    break;
  }
  if (rest) conditions.push(`@media ${rest.replace(/\s+/g, ' ')}`);
  return { spec: m[1], layer, conditions: conditions.join(' ') };
}

// ---------------------------------------------------------------------------
// Cascade layers — the order the browser gives them. Named layers rank by
// FIRST appearance in document order (a `@layer a, b;` statement, an
// `@import … layer(a)` or an `@layer a {}` block, whichever comes first,
// across every sheet the document loads); every anonymous `@layer {}` is its
// own layer; a nested layer `a.b` sits inside `a`, and a layer's own direct
// styles rank as its implicit LAST sublayer. Unlayered styles are the implicit
// final layer. Normal declarations: the later layer wins; `!important`
// declarations reverse the whole order (earlier layer wins, unlayered loses
// to every layer). rank() returns the position in that linearised order —
// children before their parent, Infinity for unlayered — so cascadeCompare()
// can compare two ranks directly.
// ---------------------------------------------------------------------------
export class LayerOrder {
  constructor() {
    this.root = { children: new Map() };
    this.ranks = null;
    // Every declaration of every layer — { pos, conditions, where } — so that
    // ambiguities() can tell whether two layers' relative order holds under
    // every evaluation of the document's conditional rules.
    this.declarations = new Map();
  }

  /**
   * Declare `pathString` (and, implicitly, each of its ancestors) at document
   * position `pos` under the conditional contexts `conditions` (a Set of
   * `@media …`/`@supports …`/`@container …` strings; empty = unconditional).
   */
  register(pathString, pos = [], conditions = new Set(), where = '') {
    if (!pathString) return;
    let node = this.root;
    let prefix = '';
    for (const segment of pathString.split('.')) {
      prefix = prefix ? `${prefix}.${segment}` : segment;
      if (!node.children.has(segment)) {
        node.children.set(segment, { children: new Map() });
        this.ranks = null;
      }
      if (!this.declarations.has(prefix)) this.declarations.set(prefix, []);
      this.declarations.get(prefix).push({ pos, conditions, where });
      node = node.children.get(segment);
    }
  }

  /**
   * The linear order (rank) is the order of first appearance with every
   * conditional group rule taken as matching. Chromium builds its layer order
   * only from the rules whose `@media`/`@supports`/`@container` groups
   * currently match, so a layer whose FIRST declaration sits inside a
   * condition can move: when the condition is false its next declaration
   * counts instead, and if that one comes after another layer's first
   * declaration the two swap — and with them every `!important` contest
   * between them. This returns the witness of such a swap for the pair
   * (a ranked before b), or null when a precedes b under every evaluation.
   *
   * Conditions are opaque, independent atoms (no media semantics), so a swap
   * exists exactly when some declaration y of b and some later declaration x′
   * of a can both be active while every declaration x of a ahead of y is
   * inactive — i.e. each such x has an atom outside cond(y) ∪ cond(x′). A
   * layer whose only declarations are conditional never swaps: it is simply
   * absent when the condition is false.
   */
  swapWitness(a, b) {
    const da = [...(this.declarations.get(a) ?? [])].sort((x, y) => comparePath(x.pos, y.pos));
    const db = [...(this.declarations.get(b) ?? [])].sort((x, y) => comparePath(x.pos, y.pos));
    for (const y of db) {
      const before = da.filter((x) => comparePath(x.pos, y.pos) < 0);
      for (const later of da) {
        if (comparePath(later.pos, y.pos) <= 0) continue;
        const allowed = new Set([...y.conditions, ...later.conditions]);
        const blocking = before.filter((x) => [...x.conditions].every((c) => allowed.has(c)));
        if (blocking.length === 0) return { laterDeclaration: y, redeclaration: later, conditionalDeclarations: before };
      }
    }
    return null;
  }

  /**
   * Sibling layer pairs (same parent) whose order swaps under some evaluation
   * of the document's conditional rules (see swapWitness).
   * @returns {{ earlier: string, later: string, conditionalWhere: string[], laterWhere: string, redeclaredWhere: string }[]}
   */
  ambiguities() {
    const byParent = new Map();
    for (const name of this.list()) {
      const i = name.lastIndexOf('.');
      const parent = i === -1 ? '' : name.slice(0, i);
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push(name);
    }
    const out = [];
    for (const names of byParent.values()) {
      for (let i = 0; i < names.length; i += 1) {
        for (let j = i + 1; j < names.length; j += 1) {
          const witness = this.swapWitness(names[i], names[j]);
          if (!witness) continue;
          out.push({
            earlier: names[i],
            later: names[j],
            conditionalWhere: [...new Set(witness.conditionalDeclarations.map((d) => d.where))],
            laterWhere: witness.laterDeclaration.where,
            redeclaredWhere: witness.redeclaration.where,
          });
        }
      }
    }
    return out;
  }

  finalise() {
    this.ranks = new Map();
    let next = 0;
    const visit = (node, prefix) => {
      for (const [name, child] of node.children) {
        const pathString = prefix ? `${prefix}.${name}` : name;
        visit(child, pathString);
        this.ranks.set(pathString, next++);
      }
    };
    visit(this.root, '');
  }

  /** Linear cascade position of a layer path; Infinity for unlayered. */
  rank(pathString) {
    if (!pathString) return Infinity;
    if (!this.ranks) this.finalise();
    if (!this.ranks.has(pathString)) {
      this.register(pathString);
      this.finalise();
    }
    return this.ranks.get(pathString);
  }

  /** Every layer in linearised order (evidence). */
  list() {
    if (!this.ranks) this.finalise();
    return [...this.ranks.entries()].sort((a, b) => a[1] - b[1]).map(([pathString]) => pathString);
  }
}

const joinLayer = (base, layer) => [base, layer].filter(Boolean).join('.') || null;
/**
 * Make a sheet's anonymous layer names unique across the document. A name
 * that is already qualified (`#anon1@file`, as documentOrder computes for an
 * imported sheet's base layer) is left alone.
 */
const qualifyLayer = (layer, file) => (layer ? layer.replace(/#anon(\d+)(?!@)/g, `#anon$1@${file}`) : null);

/**
 * Document positions are paths, not numbers: client/index.html <style> is
 * [0], the entry sheet [1], and a sheet imported by the statement at seq `s`
 * of a sheet at position P is [...P, s] — so it sorts exactly where its
 * `@import` sits among the importer's own statements and rules (a `@layer
 * early;` written above the imports is [...P, 0] and comes first; the
 * importer's rules below its imports come after every imported sheet).
 * comparePath orders two positions lexicographically; a numeric `order` (the
 * mutation probes still hand in -1 / LATE_SHEET) is one segment.
 */
export const asPath = (order) => (Array.isArray(order) ? order : [Number(order ?? 0)]);
export function comparePath(a, b) {
  const pa = asPath(a);
  const pb = asPath(b);
  const n = Math.min(pa.length, pb.length);
  for (let i = 0; i < n; i += 1) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return pa.length - pb.length;
}
/** The conditional parts of a context (`@layer` is not a condition), normalised. */
const conditionSet = (context) => new Set(contextParts(context ?? '').filter((c) => !/^@layer\b/.test(c)).map((c) => normaliseContext(c)));

/**
 * Register every layer the document declares, in document order — every
 * layer statement and layered rule of every sheet sorted by position (the
 * sheet's position path + the item's seq inside it) — so that
 * `layerOrder.rank()` reflects first appearance exactly as the browser sees
 * it, and every declaration is recorded with the conditions it sits in so
 * `layerOrder.ambiguities()` can prove the order condition-independent. Only
 * a VALID `@import … layer()` registers a layer: a misplaced or nested import
 * is dropped by the browser and declares nothing. `sheets`: [{ file, order,
 * sheet, baseLayer, context }] where baseLayer is the layer the sheet was
 * imported into (`@import … layer(x)`) and context the condition it was
 * imported under (`@import … supports(…) <media>`), if any.
 */
export function buildLayerOrder(sheets) {
  const layerOrder = new LayerOrder();
  const items = [];
  sheets.forEach(({ file, order, sheet, baseLayer = null, context = '' }, ordinal) => {
    const base = asPath(order);
    const sheetConditions = conditionSet(context);
    const withSheet = (conditions) => new Set([...sheetConditions, ...conditions]);
    for (const statement of sheet.statements ?? []) {
      // An import declares its layer() where it sits — the Tailwind compiler
      // inlines every @import in place, misplaced or nested ones included,
      // wrapped in its layer and conditions (see documentOrder).
      const conditions = withSheet(conditionSet(statement.kind === 'import' ? [statement.enclosing, statement.conditions].filter(Boolean).join(' ') : statement.conditions));
      const layers = statement.kind === 'layer' ? statement.paths : [statement.layer];
      layers.forEach((layer, k) => {
        if (!layer) return;
        items.push({ pos: [...base, statement.seq ?? statement.index, k], ordinal, layer: qualifyLayer(joinLayer(baseLayer, layer), file), conditions, file });
      });
    }
    for (const entry of sheet.entries) {
      const layer = joinLayer(baseLayer, entry.layer);
      if (!layer) continue;
      items.push({ pos: [...base, entry.seq ?? entry.index], ordinal, layer: qualifyLayer(layer, file), conditions: withSheet(conditionSet(entry.context)), file });
    }
  });
  items.sort((a, b) => comparePath(a.pos, b.pos) || (a.ordinal - b.ordinal));
  for (const item of items) {
    const where = item.conditions.size ? `${item.file} inside ${[...item.conditions].join(' ')}` : item.file;
    layerOrder.register(item.layer, item.pos, item.conditions, where);
  }
  return layerOrder;
}

/** Cascade-merged rules only (Map<key, Map<prop, value>>). */
export function parseRules(css) {
  return parseStylesheet(css).rules;
}

const CANONICAL_ROOT = /^:root$/;
const CANONICAL_SYSTEM = /^:root\[data-system=["']([A-Za-z0-9_-]+)["']\]$/;
const CANONICAL_ACCENT = /^:root\[data-accent=["']([A-Za-z0-9_-]+)["']\]$/;

/**
 * Custom-property declarations of a stylesheet sorted into the cascade layers
 * the gate models: top-level `:root` (merged), `:root[data-system]` and
 * `:root[data-accent]` per id (merged), everything else kept as evidence —
 * `scoped` (any html-level or other selector under @media/@supports/@layer/
 * @container) and `elsewhere` (a top-level selector outside the three canonical
 * forms: `html`, `*`, `body`, `.page`, compound attribute selectors, …).
 */
export function classifyCustomProperties(sheet, file = null, order = 0, baseLayer = null) {
  const root = new Map();
  const systems = new Map();
  const accents = new Map();
  const scoped = [];
  const elsewhere = [];
  // One record per html-level declaration of the three canonical forms, in
  // source order, carrying what the cascade needs (importance, layer,
  // specificity, position) — the merged maps above are the per-block view,
  // the declarations are what resolveHtmlTokens() cascades across blocks.
  // The canonical forms are top-level (no @layer context), so their layer is
  // the one the whole sheet was imported into, if any; `layerRank` is stamped
  // by the model builder once the document's layer order is known.
  const declarations = [];
  const layer = qualifyLayer(baseLayer, file);
  const push = (kind, id, props, index) => {
    for (const [prop, value] of props) {
      declarations.push({
        kind, id, prop, value, important: isImportant(value), layer, layerRank: null,
        specificity: HTML_SPECIFICITY[kind], order, index,
      });
    }
  };
  for (const entry of sheet.entries) {
    const props = new Map([...entry.decls].filter(([prop]) => prop.startsWith('--')));
    if (!props.size) continue;
    const record = { file, context: entry.context, selector: entry.selector, props, index: entry.index };
    if (entry.context) {
      scoped.push(record);
      continue;
    }
    if (CANONICAL_ROOT.test(entry.selector)) {
      mergeDeclarations(root, props);
      push('root', null, props, entry.seq ?? entry.index);
      continue;
    }
    let m = CANONICAL_SYSTEM.exec(entry.selector);
    if (m) {
      if (!systems.has(m[1])) systems.set(m[1], new Map());
      mergeDeclarations(systems.get(m[1]), props);
      push('system', m[1], props, entry.seq ?? entry.index);
      continue;
    }
    m = CANONICAL_ACCENT.exec(entry.selector);
    if (m) {
      if (!accents.has(m[1])) accents.set(m[1], new Map());
      mergeDeclarations(accents.get(m[1]), props);
      push('accent', m[1], props, entry.seq ?? entry.index);
      continue;
    }
    elsewhere.push(record);
  }
  return { root, systems, accents, scoped, elsewhere, declarations };
}

// ---------------------------------------------------------------------------
// Cascade — the one comparator every effective-value question in this gate
// goes through (html-level tokens per system × accent, utility rules per
// element), in the order css-cascade-5 sorts author declarations:
//   1. importance (`!important` beats normal);
//   2. element-attached styles (an inline `style` beats every stylesheet rule
//      of the same importance, whatever its layer);
//   3. cascade layer, by the document's linearised layer order (LayerOrder):
//      for normal declarations the LATER layer wins and unlayered — the
//      implicit final layer — beats them all; for `!important` the order is
//      reversed, so the EARLIER layer wins and unlayered loses to any layer;
//   4. specificity;
//   5. document order (sheet order, then position in the sheet).
// `layerRank` is the position in the linearised order (null/Infinity =
// unlayered), stamped by the model builders from buildLayerOrder().
// ---------------------------------------------------------------------------
const isImportant = (value) => IMPORTANT_RE.test(String(value ?? ''));

// :root = one pseudo-class (0,1,0); :root[data-…] adds an attribute (0,2,0);
// the design's applyDesignSystem() writes inline styles, which outrank every
// selector but still yield to a stylesheet `!important`.
const HTML_SPECIFICITY = { root: 10, system: 20, accent: 20, inline: 1e9 };

function cascadeCompare(a, b) {
  if (a.important !== b.important) return a.important ? 1 : -1;
  const ai = a.inline ? 1 : 0;
  const bi = b.inline ? 1 : 0;
  if (ai !== bi) return ai - bi;
  const ar = a.layerRank ?? Infinity;
  const br = b.layerRank ?? Infinity;
  if (ar !== br) {
    const laterLayerWins = ar > br ? 1 : -1;
    return a.important ? -laterLayerWins : laterLayerWins;
  }
  if (a.specificity !== b.specificity) return a.specificity - b.specificity;
  // Document position: the sheet's position path, then the declaration's seq
  // inside its sheet (see comparePath — an imported sheet sits at its
  // importer's [...path, importSeq], so it sorts between the importer's
  // statements above and rules below the @import).
  return comparePath([...asPath(a.order), a.index ?? 0], [...asPath(b.order), b.index ?? 0]);
}

/** The declaration the browser applies among candidates for one property on one element. */
export function cascadeWinner(candidates) {
  let best = null;
  for (const candidate of candidates) if (best == null || cascadeCompare(candidate, best) > 0) best = candidate;
  return best;
}

/**
 * Effective custom properties on <html data-system=… data-accent=…>: every
 * declaration of the matching canonical forms competes per property through
 * cascadeWinner(), so a `:root { --x !important }` beats a later
 * `:root[data-system]` block exactly as it does in the browser.
 */
export function resolveHtmlTokens(declarations, { systemId, accentId = null }) {
  const perProp = new Map();
  for (const d of declarations) {
    if (d.kind === 'system' && d.id !== systemId) continue;
    if (d.kind === 'accent' && d.id !== accentId) continue;
    if (!perProp.has(d.prop)) perProp.set(d.prop, []);
    perProp.get(d.prop).push(d);
  }
  const out = new Map();
  for (const [prop, list] of perProp) out.set(prop, cascadeWinner(list).value);
  return out;
}

/**
 * design-system.js → { systems: Map<id, Map<token,value>>, accents, defaultAccents,
 * fallbacks, paintsAccentPair }. The file only assigns window.* tables and
 * defines the applier, so it is evaluated (scripts/generate-design-system-
 * artifact.mjs, node:vm) rather than parsed: the model sees exactly the values
 * the browser gets.
 */
export function runtimeFromRegistry(source, label = DEFAULT_PATHS.canonicalJs) {
  const src = String(source ?? '');
  const registry = evaluateCanonicalRegistry(src, label);
  const systems = new Map(
    Object.entries(registry.systems ?? {}).map(([id, system]) => [id, new Map(Object.entries(system?.vars ?? {}))]),
  );
  const accents = new Map(
    (registry.accents ?? []).map((accent) => [accent.id, { name: accent.name, primary: accent.primary, secondary: accent.secondary }]),
  );
  const defaultAccents = new Map(Object.entries(registry.systemDefaultAccents ?? {}));
  return { systems, accents, defaultAccents, fallbacks: applierFallbacks(src, registry), paintsAccentPair: applierPaintsAccentPair(src) };
}

// applyDesignSystem() writes the system's vars, then the accent pair, as
// inline styles on <html>: modelled as inline declarations after every sheet
// so the same cascade comparator resolves both sides.
const INLINE_ORDER = 2e6;
function inlineDeclarations(runtime) {
  const out = [];
  const inline = (kind, id, prop, value, order, index) => ({
    kind, id, prop, value, important: false, inline: true, layer: null, layerRank: null, specificity: HTML_SPECIFICITY.inline, order, index,
  });
  for (const [id, vars] of runtime.systems) {
    let index = 0;
    for (const [prop, value] of vars) out.push(inline('system', id, prop, value, INLINE_ORDER, index++));
  }
  for (const [id, accent] of runtime.accents) {
    out.push(inline('accent', id, '--accent', accent.primary, INLINE_ORDER + 1, 0));
    out.push(inline('accent', id, '--accent-2', accent.secondary, INLINE_ORDER + 1, 1));
  }
  return out;
}

function firstMatch(re, src, label) {
  const m = re.exec(src);
  if (!m) throw new Error(`canonical geometry: could not read ${label}`);
  return m;
}

/**
 * Shell geometry the design hard-codes, read from its sources so the contract
 * follows the frozen files rather than a number typed here. Returns the
 * top-level tokens plus the responsive re-assignments of RESPONSIVE_GEOMETRY
 * resolved to the design's values.
 */
export function parseCanonicalGeometry({ css, appJsx, layoutJsx }) {
  const rules = parseRules(css);
  const rule = (key, prop, label) => {
    const v = rules.get(key)?.get(prop);
    if (v == null) throw new Error(`canonical geometry: ${label} (${key} ${prop}) not found in ${DEFAULT_PATHS.canonicalCss}`);
    return v.trim();
  };
  const padding = firstMatch(/const padding = [\s\S]*?:\s*'([^']+)';/, String(appJsx), 'default page padding (app.jsx)')[1];
  const [padY, padX] = padding.split(/\s+/);
  const measures = firstMatch(/maxWidth:\s*page\.kind === 'admin' \? (\d+) : (\d+)/, String(appJsx), 'content measures (app.jsx)');
  const footer = firstMatch(/maxWidth:\s*(\d+),\s*margin:\s*'0 auto',\s*padding:\s*'([^']+)'/, String(layoutJsx), 'footer padding (layout.jsx)');
  const geometry = new Map([
    ['--shell-sidebar-w', rule('.sidebar', 'width', 'sidebar width')],
    ['--shell-sidebar-w-tablet', rule('@media (max-width: 1024px)||.sidebar', 'width', 'tablet sidebar width')],
    ['--shell-rail-w', rule('.icon-rail', 'width', 'icon rail width')],
    ['--shell-header-h', rule('.header', 'height', 'header height')],
    ['--page-pad-y', padY],
    ['--page-pad-x', padX],
    ['--content-max', `${measures[2]}px`],
    ['--content-max-admin', `${measures[1]}px`],
    ['--footer-pad', footer[2]],
  ]);
  const responsive = RESPONSIVE_GEOMETRY.map((entry) => ({
    ...entry,
    value: rule(entry.canonical[0], entry.canonical[1], `${entry.token} responsive value`),
  }));
  return { geometry, responsive };
}

// ---------------------------------------------------------------------------
// Value normalisation — whitespace and notation only, never semantics.
// ---------------------------------------------------------------------------
export function normaliseValue(value) {
  let v = String(value ?? '').trim().replace(/\s+/g, ' ');
  v = v.replace(/\s*([(),])\s*/g, '$1');
  v = v.replace(/#([0-9a-fA-F]{3,8})\b/g, (_, hex) => {
    let h = hex.toLowerCase();
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length === 8 && h.endsWith('ff')) h = h.slice(0, 6);
    return `#${h}`;
  });
  v = v.replace(/(^|[\s(,])0*(\d+\.\d*?)0+(?=$|[\s),a-z%])/g, '$1$2').replace(/(\d)\.(?=$|[\s),a-z%])/g, '$1');
  v = v.replace(/(^|[\s(,])\.(\d)/g, '$10.$2');
  v = v.replace(/"/g, "'");
  return v;
}

const normaliseContext = (context) => String(context ?? '').replace(/\s+/g, ' ').replace(/:\s+/g, ':').trim();

// ---------------------------------------------------------------------------
// Model building
// ---------------------------------------------------------------------------
export function buildCanonicalModel({ css, js, appJsx = null, layoutJsx = null }) {
  const file = DEFAULT_PATHS.canonicalCss;
  const sheet = parseStylesheet(css);
  const layers = classifyCustomProperties(sheet, file, 0);
  if (!layers.root.size) throw new Error(`canonical ${file}: no bare :root block found`);
  const root = layers.root;
  const runtime = runtimeFromRegistry(js, DEFAULT_PATHS.canonicalJs);
  if (!runtime.systems.size) throw new Error(`canonical ${DEFAULT_PATHS.canonicalJs}: no DESIGN_SYSTEMS entries`);
  if (!runtime.accents.size) throw new Error(`canonical ${DEFAULT_PATHS.canonicalJs}: no ACCENTS`);
  const declarations = [...layers.declarations, ...inlineDeclarations(runtime)];
  const sheets = [{ file, order: 0, sheet, baseLayer: null }];
  const layerOrder = buildLayerOrder(sheets);
  for (const d of declarations) d.layerRank = layerOrder.rank(d.layer);
  const resolve = (systemId, accentId = null) => resolveHtmlTokens(declarations, { systemId, accentId });
  const effective = new Map();
  for (const id of runtime.systems.keys()) {
    const map = resolve(id);
    map.delete('--accent');
    map.delete('--accent-2');
    effective.set(id, map);
  }
  const parsedGeometry = appJsx != null && layoutJsx != null ? parseCanonicalGeometry({ css, appJsx, layoutJsx }) : null;
  return {
    cssSource: String(css),
    jsSource: String(js),
    root,
    systems: runtime.systems,
    effective,
    resolve,
    declarations,
    accents: runtime.accents,
    defaultAccents: runtime.defaultAccents,
    fallbacks: runtime.fallbacks,
    paintsAccentPair: runtime.paintsAccentPair,
    rules: sheet.rules,
    sheet,
    sheets,
    layerOrder,
    layers,
    geometry: parsedGeometry?.geometry ?? null,
    responsive: parsedGeometry?.responsive ?? null,
  };
}

/**
 * client/src/lib/design-system.ts → { defaultSystem, defaultAccent, systemKey,
 * accentKey, bootData, restated, readsGlobals }. The wrapper owns only the app
 * defaults and the storage keys; the tables themselves must be read from the
 * window globals /ds/design-system.js assigns, never restated.
 */
export function parseAppRegistry(ts) {
  const src = String(ts ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const constants = new Map();
  for (const m of src.matchAll(/\b(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\b[^=\n]*=\s*(["'])([^"'\n]*)\2/g)) constants.set(m[1], m[3]);
  const bootBody = /\bTHEME_BOOT_DATA\b[^=]*=\s*\{([^}]*)\}/.exec(src)?.[1] ?? null;
  let bootData = null;
  if (bootBody != null) {
    bootData = {};
    for (const m of bootBody.matchAll(/([A-Za-z_$][\w$]*)\s*:\s*([^,\n]+)/g)) {
      const value = m[2].trim();
      const literal = /^(["'])(.*)\1$/.exec(value);
      bootData[m[1]] = literal ? literal[2] : constants.get(value) ?? null;
    }
  }
  const restated = [...src.matchAll(/\bexport\s+(?:const|let|var|function)\s+(DESIGN_SYSTEMS|ACCENTS|SYSTEM_DEFAULT_ACCENT|THEME_FALLBACK_REGISTRY|TYPE_SCALE|SPACE_SCALE)\b/g)].map((m) => m[1]);
  if (/\bprimary\s*:\s*["']#[0-9a-f]/i.test(src)) restated.push('an accent swatch literal (primary: "#…")');
  const readsGlobals = new Set([...src.matchAll(/\bwindow\.(DESIGN_SYSTEMS|ACCENTS|SYSTEM_DEFAULT_ACCENT)\b/g)].map((m) => m[1]));
  return {
    defaultSystem: constants.get('DEFAULT_SYSTEM') ?? null,
    defaultAccent: constants.get('DEFAULT_ACCENT') ?? null,
    systemKey: constants.get('SYSTEM_STORAGE_KEY') ?? null,
    accentKey: constants.get('ACCENT_STORAGE_KEY') ?? null,
    bootData,
    restated,
    readsGlobals,
  };
}

// HTML comments blanked to spaces so offsets stay valid and a commented-out
// tag never counts.
const blankComments = (html) => String(html ?? '').replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

function tagAttributes(text) {
  const attrs = new Map();
  for (const m of text.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attrs.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

/**
 * How client/index.html loads the canonical pair (rule 12): the stylesheet
 * <link>, the registry <script src>, and the inline boot script that calls
 * applyDesignSystem(), each with its offset in the document.
 */
export function parseDsLoad(html, { cssHref = CSS_HREF, jsHref = JS_HREF } = {}) {
  const src = blankComments(html);
  const links = [];
  for (const m of src.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = tagAttributes(m[1]);
    if ((attrs.get('rel') ?? '').toLowerCase().split(/\s+/).includes('stylesheet') && attrs.get('href') === cssHref) {
      links.push({ index: m.index, media: attrs.get('media') ?? null, attrs });
    }
  }
  const scripts = [];
  let boot = null;
  for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = tagAttributes(m[1]);
    if (attrs.get('src') === jsHref) {
      scripts.push({ index: m.index, async: attrs.has('async'), defer: attrs.has('defer'), module: (attrs.get('type') ?? '').toLowerCase() === 'module' });
    } else if (!attrs.has('src') && boot == null && /\bapplyDesignSystem\s*\(/.test(m[2])) {
      boot = { index: m.index, body: m[2] };
    }
  }
  return { css: links[0] ?? null, cssCount: links.length, js: scripts[0] ?? null, jsCount: scripts.length, boot };
}

/**
 * The pre-paint boot's storage keys and fallback system. Each is a string
 * literal or a field of the object Vite injects for the THEME_BOOT marker —
 * which resolves only when vite.config.ts actually serializes THEME_BOOT_DATA
 * (imported from design-system.ts) into that marker.
 */
export function parseThemeBoot(bootBody, { registry = null, viteConfig = '' } = {}) {
  const body = String(bootBody ?? '');
  const markerVar = new RegExp(`\\bvar\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${THEME_BOOT_MARKER}\\b`).exec(body)?.[1] ?? null;
  const vite = String(viteConfig ?? '');
  const injects = vite.includes(`"${THEME_BOOT_MARKER}"`) || vite.includes(`'${THEME_BOOT_MARKER}'`);
  const serializes = /JSON\.stringify\(\s*THEME_BOOT_DATA\s*\)/.test(vite) && /\bimport\s*\{[^}]*\bTHEME_BOOT_DATA\b[^}]*\}\s*from\s*["']\.\/client\/src\/lib\/design-system["']/.test(vite);
  const injected = markerVar && injects && serializes ? registry?.bootData ?? null : null;
  const value = (expr) => {
    if (expr == null) return { value: null, expr: null };
    const text = expr.trim();
    const literal = /^(["'])(.*)\1$/.exec(text);
    if (literal) return { value: literal[2], expr: text };
    const field = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/.exec(text);
    if (field && field[1] === markerVar) return { value: injected?.[field[2]] ?? null, expr: text, marker: true };
    return { value: null, expr: text };
  };
  return {
    markerVar,
    injected: Boolean(injected),
    systemKey: value(/\bsys\s*=\s*localStorage\.getItem\(([^)]*)\)/.exec(body)?.[1]),
    accentKey: value(/\bacc\s*=\s*localStorage\.getItem\(([^)]*)\)/.exec(body)?.[1]),
    fallbackSystem: value(/hasOwnProperty\.call\(\s*window\.DESIGN_SYSTEMS\s*,\s*sys\s*\)\s*\)\s*sys\s*=\s*([^;]+);/.exec(body)?.[1]),
    handCopied: /\bvar\s+(?:SYSTEMS|ACCENTS|DESIGN_SYSTEMS)\s*=\s*[[{]/.test(body),
  };
}

/** `<style>…</style>` bodies of an HTML document (including ones built inside JS strings), with their offsets. */
function inlineStyleBlocksAt(html) {
  return [...blankComments(html).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => ({ index: m.index, css: m[1] }));
}

// A stylesheet whose position in the document is unknown (a canary-added
// sibling, a component-imported sheet Vite injects on demand) is modelled as
// arriving AFTER everything the entry imports — the conservative reading, since
// a later sheet wins every same-specificity tie.
const LATE_SHEET = 1e6;

/**
 * @param {object} input
 * @param {string} input.css        the served main sheet (client/public/ds/design-system.css)
 * @param {string} input.js         the served registry + applier (client/public/ds/design-system.js)
 * @param {string} [input.registry] client/src/lib/design-system.ts
 * @param {string} [input.indexHtml] client/index.html (boot keys, rule 5)
 * @param {string} [input.viteConfig] vite.config.ts (THEME_BOOT marker injection, rule 5)
 * @param {{file:string, css:string, order?:number|number[], layer?:string|null, context?:string}[]} [input.siblings]
 *        every other stylesheet that reaches the document, with its document
 *        position (see documentOrder), the cascade layer it was imported into
 *        (`@import … layer(x)`) and the condition it was imported under
 *        (`@import … supports(…) <media>`), if any — rule 10 scans them for
 *        tracked tokens and rule 11 cascades them against the canonical
 *        utilities
 * @param {number|number[]} [input.mainOrder] document position of the main sheet
 * @param {string|null} [input.mainLayer] layer the main sheet was imported into
 * @param {object|null} [input.reach] documentOrder's verdict on how the
 *        document loads its sheets (rules 12–13): { main: { reached, context,
 *        importer }, misplaced: [{ file, spec, reason }], duplicates, unresolved, entry }
 */
export function buildAppModel({ css, js, registry = null, indexHtml = null, viteConfig = null, siblings = [], mainOrder = 0, mainLayer = null, reach = null }) {
  const sheet = parseStylesheet(css);
  const layers = classifyCustomProperties(sheet, DEFAULT_PATHS.appCss, mainOrder, mainLayer);
  if (!layers.root.size) throw new Error(`served ${DEFAULT_PATHS.appCss}: no bare :root block found`);
  const runtime = runtimeFromRegistry(js, DEFAULT_PATHS.appJs);
  let bootRegistryMismatch = false;
  if (indexHtml && registry) {
    const painted = evaluateBootRegistry(js, indexHtml, registry);
    runtime.systems = new Map(Object.entries(painted).map(([id, system]) => [id, new Map(Object.entries(system.vars))]));
    const data = readThemeBootData(registry);
    const canonical = evaluateCanonicalRegistry(js);
    if (JSON.stringify(data.systemIds) !== JSON.stringify(Object.keys(canonical.systems)) ||
        JSON.stringify(data.accentIds) !== JSON.stringify(canonical.accents.map(a => a.id)) ||
        JSON.stringify(data.defaultAccents) !== JSON.stringify(canonical.systemDefaultAccents)) {
      bootRegistryMismatch = true;
    }
  }
  const siblingDeclarations = [];
  const scoped = layers.scoped.map((record) => ({ ...record, file: DEFAULT_PATHS.appCss }));
  const sheets = [{ file: DEFAULT_PATHS.appCss, order: mainOrder, sheet, baseLayer: mainLayer ?? null, context: '' }];
  // Every html-level declaration in the document takes part in the resolver —
  // a sibling's `:root { --bg: … !important }` changes what the browser paints
  // (rule 3) as well as breaking the single source (rule 10) — and so do the
  // inline writes applyDesignSystem() performs from the served registry.
  const declarations = [...layers.declarations, ...inlineDeclarations(runtime)];
  for (const sibling of siblings) {
    // A sheet imported under a condition is parsed as if wrapped in it: its
    // top-level rules become scoped rules (rule 9/10 see the condition) and
    // its layer declarations register under it (rule 14).
    const siblingSheet = parseStylesheet(sibling.css, { baseContext: sibling.context || null });
    const order = sibling.order ?? LATE_SHEET;
    sheets.push({ file: sibling.file, order, sheet: siblingSheet, baseLayer: sibling.layer ?? null, context: sibling.context ?? '' });
    const siblingLayers = classifyCustomProperties(siblingSheet, sibling.file, order, sibling.layer ?? null);
    declarations.push(...siblingLayers.declarations);
    for (const [prop, value] of siblingLayers.root) siblingDeclarations.push({ file: sibling.file, context: '', selector: ':root', prop, value });
    for (const [id, props] of siblingLayers.systems) for (const [prop, value] of props) siblingDeclarations.push({ file: sibling.file, context: '', selector: `:root[data-system="${id}"]`, prop, value });
    for (const [id, props] of siblingLayers.accents) for (const [prop, value] of props) siblingDeclarations.push({ file: sibling.file, context: '', selector: `:root[data-accent="${id}"]`, prop, value });
    for (const record of [...siblingLayers.scoped, ...siblingLayers.elsewhere]) {
      for (const [prop, value] of record.props) siblingDeclarations.push({ file: sibling.file, context: record.context, selector: record.selector, prop, value });
    }
    for (const record of siblingLayers.scoped) scoped.push({ ...record, file: sibling.file });
  }
  // The document's layer order is known only once every sheet is parsed:
  // stamp each html-level declaration with its linear rank before resolving.
  const layerOrder = buildLayerOrder(sheets);
  for (const d of declarations) d.layerRank = layerOrder.rank(d.layer);
  const resolve = (systemId, accentId = null) => resolveHtmlTokens(declarations, { systemId, accentId });
  // Every unconditioned rule of every sheet merged in document order — what
  // an element-level rule (html/body height, the pseudo layers a deviation
  // cites) resolves to once the app's sheets cascade over the canonical one.
  const mergedRules = new Map();
  for (const entry of [...sheets].sort((x, y) => comparePath(asPath(x.order), asPath(y.order)))) {
    for (const [key, decls] of entry.sheet.rules) {
      if (key.includes('||')) continue;
      if (!mergedRules.has(key)) mergedRules.set(key, new Map());
      mergeDeclarations(mergedRules.get(key), decls);
    }
  }
  const appRegistry = registry != null ? parseAppRegistry(registry) : null;
  const load = indexHtml != null ? parseDsLoad(indexHtml) : null;
  const boot = load ? parseThemeBoot(load.boot?.body ?? '', { registry: appRegistry, viteConfig }) : null;
  const accents = runtime.accents;
  return {
    cssSource: String(css),
    jsSource: String(js),
    root: layers.root,
    systems: runtime.systems,
    systemBlocks: layers.systems,
    defaultAccents: runtime.defaultAccents,
    fallbacks: runtime.fallbacks,
    paintsAccentPair: runtime.paintsAccentPair,
    declarations,
    resolve,
    accents,
    accentProps: layers.accents,
    scoped,
    elsewhere: layers.elsewhere,
    siblingDeclarations,
    registry: appRegistry,
    load,
    boot,
    bootRegistryMismatch,
    rules: sheet.rules,
    mergedRules,
    sheet,
    sheets,
    layerOrder,
    reach,
  };
}

/** The runtime's effective token map for <html data-system=…> minus the accent pair (compared per combo by rule 4). */
function appEffective(app, systemId) {
  const map = app.resolve(systemId);
  map.delete('--accent');
  map.delete('--accent-2');
  return map;
}

/** Resolve a one-level `var(--x)` reference through a token map (literal values pass through). */
function resolveVar(value, map) {
  const m = /^var\((--[^\s,)]+)\)$/.exec(String(value ?? '').trim());
  if (!m) return value;
  return map.get(m[1]) ?? value;
}

/**
 * A runtime utility value with every runtime-ONLY token (declared in the
 * runtime's top-level :root, absent from the design's) replaced by its literal,
 * and `color-mix(in srgb, #rrggbb P%, transparent)` — which keeps the hue and
 * scales only alpha — rewritten as the equivalent `rgba()`. Design tokens are
 * never substituted, so a runtime literal standing in for `var(--text)` still
 * fails. Used so a status hue can have one source (`--status-*`) while the
 * rule stays provably equal to the design's literals.
 */
function resolveRuntimeOnlyValue(value, appRoot, canonicalRoot) {
  if (!appRoot) return value;
  let v = value.replace(/var\((--[A-Za-z0-9_-]+)\)/g, (ref, token) =>
    canonicalRoot?.has(token) || !appRoot.has(token) ? ref : normaliseValue(appRoot.get(token)));
  v = v.replace(/color-mix\(in srgb,#([0-9a-f]{6}) ?(\d+(?:\.\d+)?)%,transparent\)/g, (_, hex, pct) => {
    const n = parseInt(hex, 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Number(pct) / 100})`;
  });
  return normaliseValue(v);
}

// ---------------------------------------------------------------------------
// Selectors — what rule 11 needs from a selector: its specificity, the
// conditions (state / structural pseudo-classes) under which it applies, and a
// RELAXED form that keeps only what can be decided for a synthesised utility
// element (its own classes, plus :root/html/[data-system]/[data-accent]
// ancestors, which the fixture models on <html>). See relaxSelector for the
// element model: type selectors, other ancestors and siblings are dropped
// (widening), ids / non-class attributes / pseudo-elements can never match it,
// and state pseudo-classes and :has() become evaluation conditions. Whatever
// survives beyond a plain class conjunction ([class~=…], :is(), :where(),
// :not(), ancestor attributes) is evaluated by a real selector engine (jsdom's
// Element.matches), never by a regex over the selector text.
// ---------------------------------------------------------------------------

/** Split a complex selector into compounds with the combinator that precedes each (' ', '>', '+', '~'). */
function splitComplex(selector) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  let currentCombinator = ' '; // combinator preceding `current`
  let pending = null; // combinator seen since `current` ended (' ' = descendant)
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector[i];
    if (quote) {
      current += ch;
      if (ch === '\\') {
        current += selector[i + 1] ?? '';
        i += 1;
      } else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '\\') {
      current += ch + (selector[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (depth === 0 && /[\s>+~]/.test(ch)) {
      if (!/\s/.test(ch)) pending = ch;
      else if (current && !pending) pending = ' ';
      continue;
    }
    if (pending) {
      if (current) parts.push({ combinator: currentCombinator, compound: current });
      current = '';
      currentCombinator = pending;
      pending = null;
    }
    current += ch;
  }
  if (current) parts.push({ combinator: currentCombinator, compound: current });
  return parts;
}

/** Simple selectors of one compound: { kind, name, args, raw }. */
function tokenizeCompound(compound) {
  const tokens = [];
  let i = 0;
  const ident = () => {
    let out = '';
    while (i < compound.length) {
      const ch = compound[i];
      if (ch === '\\') {
        out += ch + (compound[i + 1] ?? '');
        i += 2;
        continue;
      }
      if (!/[A-Za-z0-9_-]/.test(ch) && ch.charCodeAt(0) < 128) break;
      out += ch;
      i += 1;
    }
    return out;
  };
  const balanced = (open, close) => {
    let depth = 0;
    const start = i;
    let quote = null;
    for (; i < compound.length; i += 1) {
      const ch = compound[i];
      if (quote) {
        if (ch === '\\') i += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === open) depth += 1;
      else if (ch === close) {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          return compound.slice(start + 1, i - 1);
        }
      }
    }
    return compound.slice(start + 1);
  };
  while (i < compound.length) {
    const start = i;
    const ch = compound[i];
    if (ch === '*') {
      i += 1;
      tokens.push({ kind: 'universal', raw: '*' });
    } else if (ch === '#') {
      i += 1;
      tokens.push({ kind: 'id', name: ident(), raw: compound.slice(start, i) });
    } else if (ch === '.') {
      i += 1;
      tokens.push({ kind: 'class', name: ident(), raw: compound.slice(start, i) });
    } else if (ch === '[') {
      const inner = balanced('[', ']');
      const name = /^\s*([^\s~|^$*=\]]+)/.exec(inner)?.[1] ?? '';
      tokens.push({ kind: 'attribute', name: name.replace(/^.*\|/, ''), raw: compound.slice(start, i) });
    } else if (ch === ':') {
      const element = compound[i + 1] === ':';
      i += element ? 2 : 1;
      const name = ident();
      const args = compound[i] === '(' ? balanced('(', ')') : null;
      const legacyElement = !element && /^(before|after|first-line|first-letter)$/i.test(name);
      tokens.push({ kind: element || legacyElement ? 'pseudo-element' : 'pseudo', name, args, raw: compound.slice(start, i) });
    } else if (ch === '|') {
      i += 1; // namespace separator — the namespace itself was consumed as a type
    } else {
      const name = ident();
      if (!name) {
        i += 1;
        continue;
      }
      tokens.push({ kind: 'type', name, raw: name });
    }
  }
  return tokens;
}

const LOGICAL_PSEUDOS = new Set(['is', 'matches', 'any', '-webkit-any', '-moz-any']);

/** Selectors Level 4 specificity as [ids, classes/attributes/pseudo-classes, types/pseudo-elements]. */
function specificityTriple(selector) {
  const total = [0, 0, 0];
  const add = (t) => { total[0] += t[0]; total[1] += t[1]; total[2] += t[2]; };
  const most = (list) => {
    let best = [0, 0, 0];
    for (const arg of splitSelectors(list)) {
      const s = specificityTriple(arg);
      if (s[0] > best[0] || (s[0] === best[0] && (s[1] > best[1] || (s[1] === best[1] && s[2] > best[2])))) best = s;
    }
    return best;
  };
  for (const { compound } of splitComplex(selector)) {
    for (const tok of tokenizeCompound(compound)) {
      if (tok.kind === 'id') total[0] += 1;
      else if (tok.kind === 'class' || tok.kind === 'attribute') total[1] += 1;
      else if (tok.kind === 'type' || tok.kind === 'pseudo-element') total[2] += 1;
      else if (tok.kind === 'pseudo') {
        const name = tok.name.toLowerCase();
        if (name === 'where') continue;
        if (LOGICAL_PSEUDOS.has(name) || name === 'not' || name === 'has') add(most(tok.args ?? ''));
        else if (name === 'nth-child' || name === 'nth-last-child') {
          total[1] += 1;
          const of = /\sof\s+([\s\S]+)$/.exec(tok.args ?? '');
          if (of) add(most(of[1]));
        } else if (name === 'host' || name === 'host-context') {
          total[1] += 1;
          if (tok.args) add(specificityTriple(tok.args));
        } else total[1] += 1;
      }
    }
  }
  return total;
}

export function specificityOf(selector) {
  const [a, b, c] = specificityTriple(selector);
  return a * 1e6 + b * 1e3 + c;
}

const isDataAttribute = (tok) => tok.kind === 'attribute' && /^data-(system|accent)$/i.test(tok.name);
const keepAncestor = (compound) => tokenizeCompound(compound).every((tok) =>
  (tok.kind === 'type' && /^html$/i.test(tok.name)) || (tok.kind === 'pseudo' && /^root$/i.test(tok.name)) || isDataAttribute(tok));
const classToken = (tok) => tok.kind === 'class' || (tok.kind === 'attribute' && /^class$/i.test(tok.name));
const unescapeIdent = (name) => name.replace(/\\(.)/g, '$1');

/**
 * Decode CSS hex escapes so `.\63 hip` is analysed as `.chip` (the browser
 * matches both). A decoded character that is not an identifier character keeps
 * the single-character escape form (`\.`), which the engine and the tokenizer
 * both accept; the optional whitespace terminator after a hex escape is
 * consumed, so it can no longer be mistaken for a descendant combinator.
 */
function decodeHexEscapes(selector) {
  return selector.replace(/\\([0-9a-fA-F]{1,6})(?:\r\n|[ \t\n\r\f])?/g, (_, hex) => {
    const cp = Number.parseInt(hex, 16);
    if (!cp || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return '\ufffd';
    const ch = String.fromCodePoint(cp);
    return cp >= 0x80 || /[A-Za-z0-9_-]/.test(ch) ? ch : `\\${ch}`;
  });
}

/**
 * The utility element is modelled as "an element of unknown type carrying
 * exactly the utility's classes and no other attribute, in an unknown
 * position of the document" — what the design's JSX renders (`<span
 * className="chip">`). A rule is a candidate when SOME document can make it
 * match that element:
 *   - type selectors and ancestors/siblings other than the html-level
 *     [data-system]/[data-accent] compounds are dropped (the document could
 *     provide them) — widening;
 *   - id and non-class attribute tests can never hold on that element, nor can
 *     pseudo-elements or html/body/:root subjects — the rule is not a candidate;
 *   - state/structural pseudo-classes and :has() become CONDITIONS — the rule is
 *     cascaded in the evaluation contexts where they hold.
 *
 * @returns {null | { relaxed: string, conditions: string[], classOnly: Set<string>|null, universal: boolean, anchored: boolean }}
 *   null       — not a candidate for any utility element
 *   relaxed    — the widened selector to hand to the engine (`*` when nothing
 *                about the element itself is constrained)
 *   conditions — pseudo-classes dropped from the subject: the rule applies only
 *                under them
 *   classOnly  — when the relaxed form is a bare class conjunction, its class
 *                names (decided without the engine)
 *   universal  — the subject constrains nothing about the element itself
 *   anchored   — an html-level ancestor compound was kept
 */
export function relaxSelector(rawSelector) {
  const selector = decodeHexEscapes(rawSelector);
  const parts = splitComplex(selector);
  if (!parts.length) return null;
  const conditions = new Set();
  const subject = relaxCompound(parts[parts.length - 1].compound, conditions);
  if (subject == null) return null;
  const ancestors = [];
  for (let i = 0; i < parts.length - 1; i += 1) {
    const next = parts[i + 1].combinator;
    if (next === '+' || next === '~') continue; // a sibling, not an ancestor
    if (keepAncestor(parts[i].compound)) ancestors.push(parts[i].compound);
  }
  const subjectText = subject.kept.length ? subject.kept.join('') : '*';
  const classOnly = !ancestors.length && subject.classOnly && subject.kept.length
    ? new Set(subject.kept.map((raw) => unescapeIdent(raw.slice(1))))
    : null;
  return {
    relaxed: [...ancestors, subjectText].join(' '),
    conditions: [...conditions].sort(),
    classOnly,
    universal: !subject.kept.length,
    typed: subject.typed,
    anchored: ancestors.length > 0,
  };
}

// Simple selectors that can never hold on an element whose only attribute is
// class: ids and non-class attribute tests.
const fixtureFalse = (tok) => tok.kind === 'id' || (tok.kind === 'attribute' && !classToken(tok));

function relaxCompound(compound, conditions) {
  const kept = [];
  let classOnly = true;
  let typed = false;
  for (const tok of tokenizeCompound(compound)) {
    if (tok.kind === 'pseudo-element' || fixtureFalse(tok)) return null;
    if (tok.kind === 'type') {
      if (/^(html|body)$/i.test(tok.name)) return null;
      typed = true;
      continue;
    }
    if (tok.kind === 'universal') continue;
    if (tok.kind === 'attribute' || tok.kind === 'class') {
      kept.push(tok.raw);
      if (tok.kind === 'attribute') classOnly = false;
      continue;
    }
    const name = tok.name.toLowerCase();
    if (name === 'root') return null;
    if (name === 'where' || LOGICAL_PSEUDOS.has(name)) {
      const arms = splitSelectors(tok.args ?? '').map((arm) => relaxSelector(arm));
      const live = arms.filter(Boolean);
      if (!live.length) return null;
      for (const arm of live) for (const c of arm.conditions) conditions.add(c);
      if (live.some((arm) => arm.universal && !arm.anchored)) continue; // an arm that constrains nothing widens the whole :is()
      kept.push(`:${tok.name}(${live.map((arm) => arm.relaxed).join(', ')})`);
      classOnly = false;
      continue;
    }
    if (name === 'not') {
      const arms = splitSelectors(tok.args ?? '');
      const simple = (arm) => splitComplex(arm).length === 1;
      if (arms.length && arms.every((arm) => simple(arm) && tokenizeCompound(arm).every(classToken))) {
        kept.push(tok.raw); // decidable on the element's own classes
        classOnly = false;
      } else if (arms.length && arms.every((arm) => simple(arm) && tokenizeCompound(arm).every(fixtureFalse))) {
        // :not(#id) / :not([disabled]) always holds for the fixture element
      } else conditions.add(tok.raw); // states, types, ancestors inside the :not()
      continue;
    }
    conditions.add(tok.raw);
  }
  return { kept, classOnly, typed };
}

let fixtureDom = null;
const matchCache = new Map();

/**
 * Does `relaxed` match a utility element with `classes` under
 * <html data-system data-accent>? Decided by jsdom's selector engine; a
 * selector the engine cannot parse is reported as matching (conservative) with
 * `unparsable` set so the failure message says so.
 */
export function elementMatches({ system, accent, classes, relaxed }) {
  const classList = [...classes].join(' ');
  const cacheKey = `${system}|${accent}|${classList}|${relaxed}`;
  if (matchCache.has(cacheKey)) return matchCache.get(cacheKey);
  if (!fixtureDom) fixtureDom = new JSDOM('<!doctype html><html><body></body></html>');
  const { document } = fixtureDom.window;
  document.documentElement.setAttribute('data-system', system);
  document.documentElement.setAttribute('data-accent', accent);
  const element = document.createElement('div');
  element.className = classList;
  document.body.appendChild(element);
  let result;
  try {
    result = { matched: element.matches(relaxed), unparsable: false };
  } catch {
    result = { matched: true, unparsable: true };
  }
  element.remove();
  matchCache.set(cacheKey, result);
  return result;
}

const contextParts = (context) => (context ? String(context).split(/\s(?=@)/) : []);

/** Per-entry facts rule 11 needs, computed once per parsed sheet. */
const sheetAnalysis = new WeakMap();
/** True when an `@media` prelude's query list matches print only (every comma-separated query is `print` / `only print` / `print and …`). */
function isPrintOnly(prelude) {
  const list = prelude.replace(/^@media\b/, '').trim();
  if (!list) return false;
  return splitSelectors(list).every((query) => /^(only\s+)?print(\s+and\b|$)/i.test(query.trim()));
}

function analyseSheet(sheet) {
  if (sheetAnalysis.has(sheet)) return sheetAnalysis.get(sheet);
  const relaxCache = new Map();
  const out = [];
  for (const entry of sheet.entries) {
    if (!relaxCache.has(entry.selector)) relaxCache.set(entry.selector, relaxSelector(entry.selector));
    const relaxed = relaxCache.get(entry.selector);
    if (!relaxed) continue;
    const parts = contextParts(entry.context);
    const mediaParts = parts.filter((p) => /^@media\b/.test(p));
    // Paged media is not a parity surface: the design ships no print rules and
    // the print audit owns the runtime's. Only a query list that can NEVER
    // match a screen is excluded — `not print`, `screen, print` and `all` do.
    if (mediaParts.some(isPrintOnly)) continue;
    const media = normaliseContext(mediaParts.join(' '));
    out.push({
      entry,
      key: ruleKey(entry),
      media,
      layer: entry.layer ?? null,
      specificity: specificityOf(decodeHexEscapes(entry.selector)),
      important: [...entry.decls.values()].some(isImportant),
      relaxed,
    });
  }
  sheetAnalysis.set(sheet, out);
  return out;
}

/** Synthesised element for a canonical utility key: its classes and the conditions its own selector carries. */
function utilityElement(key) {
  const selector = key.includes('||') ? key.split('||')[1] : key;
  const relaxed = relaxSelector(selector);
  if (!relaxed?.classOnly) throw new Error(`utility ${key}: the canonical selector is not a class compound — extend the fixture model`);
  return { selector, classes: relaxed.classOnly, conditions: relaxed.conditions };
}

/**
 * Every rule of a side (`sheets`: [{file, order, sheet, baseLayer}]) that may
 * style the utility element under <html data-system data-accent>, with what
 * the cascade needs to rank its declarations; `layerOrder` is the side's
 * document layer order (buildLayerOrder) used to stamp each rule's layerRank.
 */
export function utilityCandidates(sheets, mainFile, element, { system, accent }, layerOrder = buildLayerOrder(sheets)) {
  const canonicalKeys = new Set(UTILITY_RULES);
  const out = [];
  for (const { file, order, sheet, baseLayer = null } of sheets) {
    for (const rule of analyseSheet(sheet)) {
      const { relaxed } = rule;
      // A rule with no class test on the element is an element style, not a
      // utility override: one naming an element type (`button`, `select`,
      // `vite-plugin-checker-error-overlay`) is skipped outright, and a bare
      // `*` / `.no-anim *` only counts when it can actually outrank a class
      // rule — through importance or an html-level ancestor tie.
      if (relaxed.universal && (relaxed.typed || (!relaxed.anchored && !rule.important))) continue;
      let match;
      if (relaxed.classOnly) match = { matched: [...relaxed.classOnly].every((c) => element.classes.has(c)), unparsable: false };
      else match = elementMatches({ system, accent, classes: element.classes, relaxed: relaxed.relaxed });
      if (!match.matched) continue;
      const layer = qualifyLayer(joinLayer(baseLayer, rule.layer), file);
      out.push({
        key: file === mainFile ? rule.key : `${file} ${rule.key}`,
        file,
        selector: rule.entry.selector,
        media: rule.media,
        conditions: relaxed.conditions,
        layer,
        layerRank: layerOrder.rank(layer),
        specificity: rule.specificity,
        order,
        index: rule.entry.seq ?? rule.entry.index,
        decls: rule.entry.decls,
        canonical: file === mainFile && canonicalKeys.has(rule.key),
        universal: relaxed.universal,
        unparsable: match.unparsable,
      });
    }
  }
  return out;
}

const conditionKey = (set) => [...set].sort().join(' ');
const subset = (list, set) => list.every((c) => set.has(c));

/**
 * Rule 11 — compare what each side's cascade resolves for a utility element:
 * for every evaluation context (media query × condition set) seen on either
 * side and every property the canonical rules or a non-universal override
 * declare, the winning declaration (cascadeWinner) must resolve to the same
 * value. A difference is reported when a non-canonical rule wins on either
 * side; differences between the canonical rules themselves are rule 8's.
 * @returns {{ findings: {message, key, prop, canonical, app}[], shadows: {canonical: string[], app: string[]}, contexts: number }}
 *   findings[].key names the non-canonical winner (the runtime's when it has
 *   one, else the design's); DOCUMENTED_DEVIATIONS may honour a finding as
 *   `shadow:<key>:<prop>`.
 */
export function compareUtilityCascade({ key, element, canonical, app }) {
  const findings = [];
  const shadows = { canonical: new Set(), app: new Set() };
  const base = new Set(element.conditions);
  const mediaSet = new Set(['']);
  const conditionSets = new Map([[conditionKey(base), base]]);
  const props = new Set();
  for (const side of [canonical, app]) {
    for (const c of side) {
      mediaSet.add(c.media);
      const set = new Set([...base, ...c.conditions]);
      conditionSets.set(conditionKey(set), set);
      if ((c.canonical && side === canonical) || (!c.universal && !c.canonical)) for (const prop of c.decls.keys()) props.add(prop);
    }
  }
  let contexts = 0;
  const seen = new Set(); // the same winner/values in a narrower context adds nothing
  for (const media of mediaSet) {
    for (const [, conditions] of conditionSets) {
      contexts += 1;
      const applicable = (side) => side.filter((c) => (c.media === '' || c.media === media) && subset(c.conditions, conditions));
      const canonRules = applicable(canonical);
      const appRules = applicable(app);
      const extra = [...conditions].filter((c) => !base.has(c));
      const where = `${media ? ` under ${media}` : ''}${extra.length ? ` when ${extra.join('')}` : ''}`;
      for (const prop of props) {
        const winner = (rules) => cascadeWinner(rules.filter((r) => r.decls.has(prop)).map((r) => ({
          ...r, value: r.decls.get(prop), important: isImportant(r.decls.get(prop)),
        })));
        const canonWinner = winner(canonRules);
        const appWinner = winner(appRules);
        if (!canonWinner && !appWinner) continue;
        if (canonWinner?.canonical !== false && appWinner?.canonical !== false) continue; // rule 8 territory
        if (canonWinner && !canonWinner.canonical) shadows.canonical.add(canonWinner.key);
        if (appWinner && !appWinner.canonical) shadows.app.add(appWinner.key);
        const canonValue = canonWinner ? normaliseValue(canonWinner.value) : null;
        const appValue = appWinner ? normaliseValue(appWinner.value) : null;
        if (canonValue === appValue) continue;
        const signature = [canonWinner?.key ?? '', appWinner?.key ?? '', prop, canonValue, appValue].join('\u0000');
        if (seen.has(signature)) continue;
        seen.add(signature);
        const flag = (w) => (w?.unparsable ? ' (selector not evaluable by the engine — treated as matching)' : '');
        if (appWinner && !appWinner.canonical) {
          findings.push({
            key: appWinner.key, prop, canonical: canonValue, app: appValue,
            message: `shadow rule: ${appWinner.key} re-declares ${prop} for ${element.selector}${where} — runtime resolves ${appValue}${flag(appWinner)}, design resolves ${canonValue ?? 'nothing'}${canonWinner && !canonWinner.canonical ? ` via ${canonWinner.key}` : ''}`,
          });
        } else {
          findings.push({
            key: canonWinner.key, prop, canonical: canonValue, app: appValue,
            message: `shadow rule: the design overrides ${element.selector}${where} via ${canonWinner.key} { ${prop}: ${canonValue} } and the runtime resolves ${appValue ?? 'nothing'}${appWinner ? ` (${appWinner.key})` : ''}${flag(canonWinner)}`,
          });
        }
      }
    }
  }
  return { key, findings, shadows: { canonical: [...shadows.canonical], app: [...shadows.app] }, contexts };
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------
export function compareModels(canonical, app, deviations = DOCUMENTED_DEVIATIONS) {
  const failures = [];
  const mismatches = [];
  const missing = [];
  const honoured = [];
  const appOnly = new Map();
  const perSystem = {};
  const usedDeviations = new Set();

  // Rule 0 — the served pair is the canonical pair, byte for byte (the CLI
  // additionally pins both to the fetched digests).
  for (const [label, served, canon, servedFile, canonFile] of [
    ['served sheet', app.cssSource, canonical.cssSource, DEFAULT_PATHS.appCss, DEFAULT_PATHS.canonicalCss],
    ['served registry', app.jsSource, canonical.jsSource, DEFAULT_PATHS.appJs, DEFAULT_PATHS.canonicalJs],
  ]) {
    if (served == null || canon == null || served === canon) continue;
    const a = served.split('\n');
    const b = canon.split('\n');
    let line = 0;
    while (line < Math.max(a.length, b.length) && a[line] === b[line]) line += 1;
    failures.push(`${label}: ${servedFile} is not byte-identical to the canonical ${canonFile} (first difference on line ${line + 1}) — the served design system must be the verbatim fetch; re-copy it, never edit it`);
  }

  // Pre-apply — the bare :root cascade that paints before applyDesignSystem()
  // runs (and whenever the registry script fails): app sheets may add tokens
  // but must not change a canonical one. Reported with the per-system rows
  // below as `pre-apply: <token> differs …` / `… is absent …`.
  {
    const canonPre = canonical.resolve(null);
    const appPre = app.resolve(null);
    for (const [token, canonRaw] of canonPre) {
      const canon = normaliseValue(canonRaw);
      const raw = appPre.get(token);
      if (raw == null) {
        missing.push({ system: 'pre-apply', token, canonical: canon });
      } else if (normaliseValue(raw) !== canon) {
        mismatches.push({ system: 'pre-apply', token, canonical: canon, app: normaliseValue(raw) });
      }
    }
  }

  for (const [systemId, canonMap] of canonical.effective) {
    if (!app.systems.has(systemId)) {
      failures.push(`system "${systemId}" ships in the design but is missing from the served DESIGN_SYSTEMS (${DEFAULT_PATHS.appJs})`);
      continue;
    }
    const appMap = appEffective(app, systemId);
    const rows = [];
    for (const [token, canonRaw] of canonMap) {
      const appRaw = appMap.get(token);
      const canon = normaliseValue(canonRaw);
      if (appRaw == null) {
        missing.push({ system: systemId, token, canonical: canon });
        rows.push({ token, canonical: canon, app: null, status: 'missing' });
        continue;
      }
      const appNorm = normaliseValue(appRaw);
      if (canon === appNorm) {
        rows.push({ token, canonical: canon, app: appNorm, status: 'match' });
        continue;
      }
      const key = `${systemId}:${token}`;
      const deviation = deviations.get(key);
      if (deviation) {
        usedDeviations.add(key);
        const reason = String(deviation.reason ?? '').trim();
        if (!reason) {
          failures.push(`deviation ${key} has no written reason — write why or delete the entry`);
        } else if (typeof deviation.holds !== 'function') {
          failures.push(`deviation ${key} has no holds() check — a reason must be re-provable from data`);
        } else if (!deviation.holds({ canonical: canon, app: appNorm, canonicalMap: canonMap, appMap })) {
          failures.push(`deviation ${key} no longer holds (canonical ${canon} vs runtime ${appNorm}) — its check returned false; align the value or rewrite the entry`);
        } else {
          honoured.push({ system: systemId, token, canonical: canon, app: appNorm, reason });
          rows.push({ token, canonical: canon, app: appNorm, status: 'documented-deviation' });
          continue;
        }
      }
      mismatches.push({ system: systemId, token, canonical: canon, app: appNorm });
      rows.push({ token, canonical: canon, app: appNorm, status: 'mismatch' });
    }
    for (const [token, appRaw] of appMap) {
      if (!canonMap.has(token)) {
        // Shell geometry is contract-checked by rule 7, not a Replit-only extra.
        if (canonical.geometry && GEOMETRY_TOKENS.includes(token)) continue;
        if (!appOnly.has(token)) appOnly.set(token, new Set());
        appOnly.get(token).add(systemId);
        rows.push({ token, canonical: null, app: normaliseValue(appRaw), status: 'runtime-only' });
      }
    }
    perSystem[systemId] = rows;
  }

  for (const [systemId] of app.systems) {
    if (!canonical.effective.has(systemId)) {
      failures.push(`the served DESIGN_SYSTEMS offers "${systemId}" but the design ships no such system`);
    }
  }

  // Rule 7 — shell geometry as the html-level cascade resolves it under every
  // system: the design's values are system-independent, so a system block that
  // re-declares one is a drift, not a theme.
  const geometry = [];
  if (canonical.geometry) {
    for (const token of GEOMETRY_TOKENS) {
      const canon = normaliseValue(canonical.geometry.get(token));
      const perSystemValues = new Map();
      for (const systemId of canonical.effective.keys()) {
        const raw = app.resolve(systemId).get(token);
        perSystemValues.set(systemId, raw == null ? null : normaliseValue(raw));
      }
      const values = new Set(perSystemValues.values());
      const appNorm = values.size === 1 ? [...values][0] : null;
      const status = values.size !== 1 ? 'mismatch' : appNorm == null ? 'missing' : appNorm === canon ? 'match' : 'mismatch';
      geometry.push({ token, canonical: canon, app: values.size === 1 ? appNorm : Object.fromEntries(perSystemValues), status });
      if (status === 'missing') failures.push(`geometry: ${token} (${canon} in the design) is not declared in the runtime's :root`);
      else if (status === 'mismatch') {
        for (const [systemId, value] of perSystemValues) {
          if (value !== canon) failures.push(`geometry: ${token} differs in ${systemId} — design ${canon} vs runtime ${value ?? 'nothing'}`);
        }
      }
    }
  }

  // The tracked set: every design token (canonical :root and every system's
  // vars), the accent pair, and the shell geometry tokens. Design tokens are
  // owned by the canonical pair alone; geometry is app-owned and lives in
  // exactly one place — the top-level :root of client/src/styles/app-bridge.css
  // (plus the responsive re-assignments of rule 9).
  const designTokens = new Set(['--accent', '--accent-2', ...canonical.root.keys()]);
  for (const map of canonical.effective.values()) for (const token of map.keys()) designTokens.add(token);
  const tracked = new Set([...designTokens, ...GEOMETRY_TOKENS]);

  // Rule 9 — responsive geometry contract; no other scoped tracked declaration.
  const responsive = [];
  let responsiveContract = new Set();
  if (canonical.responsive) {
    const scopedRoots = new Map();
    for (const record of app.scoped) {
      if (record.selector !== ':root') continue;
      const context = normaliseContext(record.context);
      if (!scopedRoots.has(context)) scopedRoots.set(context, new Map());
      mergeDeclarations(scopedRoots.get(context), record.props);
    }
    const expected = new Set();
    const appPreApply = app.resolve(null);
    for (const entry of canonical.responsive) {
      const context = normaliseContext(entry.context);
      expected.add(`${context}::${entry.token}`);
      const canon = normaliseValue(entry.value);
      const appRaw = scopedRoots.get(context)?.get(entry.token);
      const resolved = appRaw == null ? null : resolveVar(appRaw, appPreApply);
      const appNorm = resolved == null ? null : normaliseValue(resolved);
      const status = appNorm == null ? 'missing' : appNorm === canon ? 'match' : 'mismatch';
      responsive.push({ token: entry.token, context: entry.context, canonical: canon, app: appNorm, declared: appRaw ?? null, status });
      if (status === 'missing') failures.push(`responsive geometry: ${entry.token} is not re-assigned inside ${entry.context} (${entry.note}; design value ${canon})`);
      if (status === 'mismatch') failures.push(`responsive geometry: ${entry.token} inside ${entry.context} resolves to ${appNorm} but the design uses ${canon} (${entry.note})`);
    }
    for (const record of app.scoped) {
      // Sibling sheets' scoped declarations are reported by rule 10, with their file.
      if (record.file && record.file !== DEFAULT_PATHS.appCss) continue;
      const context = normaliseContext(record.context);
      for (const [prop, value] of record.props) {
        if (!tracked.has(prop)) continue;
        if (record.selector === ':root' && expected.has(`${context}::${prop}`)) continue;
        failures.push(`scoped token: ${record.context} { ${record.selector} { ${prop}: ${normaliseValue(value)} } } re-declares a tracked token outside the responsive geometry contract — the design has no responsive token values`);
      }
    }
    responsiveContract = expected;
  }

  // Rule 10 — single source: design tokens live only in the canonical sheet's
  // :root and the applier's inline writes; shell geometry only in the bridge.
  const elsewhere = [];
  for (const record of app.elsewhere) {
    for (const [prop, value] of record.props) {
      if (!tracked.has(prop)) continue;
      elsewhere.push({ selector: record.selector, prop, value: normaliseValue(value) });
      failures.push(`single source: ${record.selector} { ${prop}: ${normaliseValue(value)} } declares a tracked token outside :root in ${DEFAULT_PATHS.appCss} — custom properties inherit, so this repaints every element below it`);
    }
  }
  for (const record of app.siblingDeclarations) {
    if (!tracked.has(record.prop)) continue;
    const where = record.context ? `${record.context} { ${record.selector} }` : record.selector;
    if (!designTokens.has(record.prop) && record.file === DEFAULT_PATHS.appBridge && record.selector === ':root'
      && (!record.context || responsiveContract.has(`${normaliseContext(record.context)}::${record.prop}`))) continue;
    elsewhere.push({ file: record.file, selector: where, prop: record.prop, value: normaliseValue(record.value) });
    failures.push(designTokens.has(record.prop)
      ? `single source: ${record.file} ${where} { ${record.prop}: ${normaliseValue(record.value)} } redefines a canonical design token — only ${DEFAULT_PATHS.appCss} (:root) and applyDesignSystem() may set it`
      : `single source: ${record.file} ${where} { ${record.prop}: ${normaliseValue(record.value)} } declares shell geometry outside the top-level :root of ${DEFAULT_PATHS.appBridge}`);
  }
  if (canonical.layers) {
    for (const record of [...canonical.layers.scoped, ...canonical.layers.elsewhere]) {
      for (const [prop] of record.props) {
        if (!tracked.has(prop)) continue;
        failures.push(`canonical shape changed: ${DEFAULT_PATHS.canonicalCss} ${record.context ? `${record.context} ` : ''}${record.selector} declares ${prop} outside :root — extend the cascade model before trusting this gate`);
      }
    }
  }

  if (canonical.layers && (canonical.layers.systems.size || canonical.layers.accents.size)) {
    failures.push(`canonical shape changed: ${DEFAULT_PATHS.canonicalCss} now carries :root[data-system]/:root[data-accent] token blocks — the model assumes systems and accents are painted inline by applyDesignSystem(); extend it before trusting this gate`);
  }

  // Rule 8 — canonical utility rules carried verbatim.
  const utilities = [];
  if (canonical.rules && app.rules) {
    for (const key of UTILITY_RULES) {
      const canonDecls = canonical.rules.get(key);
      const appDecls = app.rules.get(key);
      const selector = key.includes('||') ? key.split('||')[1] : key;
      if (!canonDecls) {
        failures.push(`utility ${key}: the design no longer defines this rule — update UTILITY_RULES`);
        continue;
      }
      if (!appDecls) {
        failures.push(`utility ${key}: rule is missing from the runtime stylesheet`);
        utilities.push({ rule: key, status: 'missing' });
        continue;
      }
      const rows = [];
      for (const [prop, canonRaw] of canonDecls) {
        const canon = normaliseValue(canonRaw);
        const appRaw = appDecls.get(prop);
        const appNorm = appRaw == null ? null : normaliseValue(appRaw);
        if (appNorm === canon) { rows.push({ prop, canonical: canon, app: appNorm, status: 'match' }); continue; }
        const resolved = appNorm == null ? null : resolveRuntimeOnlyValue(appNorm, app.root, canonical.root);
        if (resolved !== appNorm && resolved === canon) {
          rows.push({ prop, canonical: canon, app: appNorm, resolved, status: 'match' });
          continue;
        }
        const devKey = `rule:${selector}:${prop}`;
        const deviation = deviations.get(devKey);
        if (deviation && appNorm != null) {
          usedDeviations.add(devKey);
          const reason = String(deviation.reason ?? '').trim();
          if (!reason) failures.push(`deviation ${devKey} has no written reason — write why or delete the entry`);
          else if (typeof deviation.holds !== 'function') failures.push(`deviation ${devKey} has no holds() check — a reason must be re-provable from data`);
          else if (!deviation.holds({ canonical: canon, app: appNorm, canonicalRules: canonical.rules, appRules: app.mergedRules ?? app.rules })) failures.push(`deviation ${devKey} no longer holds (canonical ${canon} vs runtime ${appNorm}) — align the value or rewrite the entry`);
          else { honoured.push({ system: `rule:${selector}`, token: prop, canonical: canon, app: appNorm, reason }); rows.push({ prop, canonical: canon, app: appNorm, status: 'documented-deviation' }); continue; }
        }
        rows.push({ prop, canonical: canon, app: appNorm, status: appNorm == null ? 'missing' : 'mismatch' });
        failures.push(appNorm == null
          ? `utility ${key}: declaration ${prop}: ${canon} is missing from the runtime rule`
          : `utility ${key}: ${prop} differs — design ${canon} vs runtime ${appNorm}${resolved !== appNorm ? ` (resolves to ${resolved})` : ''}`);
      }
      for (const [prop, appRaw] of appDecls) {
        if (!canonDecls.has(prop)) {
          rows.push({ prop, canonical: null, app: normaliseValue(appRaw), status: 'runtime-only' });
          failures.push(`utility ${key}: runtime adds ${prop}: ${normaliseValue(appRaw)} that the design rule lacks`);
        }
      }
      // Rule 11 — what the cascade resolves for this utility's element, under
      // every system, must agree wherever a non-canonical rule wins on either
      // side (see compareUtilityCascade).
      const shadows = { canonical: new Set(), app: new Set(), contexts: 0 };
      if (canonical.sheets && app.sheets) {
        const element = utilityElement(key);
        const bySystem = new Map();
        for (const systemId of canonical.effective.keys()) {
          const accent = canonical.defaultAccents?.get(systemId) ?? null;
          const scope = { system: systemId, accent };
          const result = compareUtilityCascade({
            key,
            element,
            canonical: utilityCandidates(canonical.sheets, canonical.sheets[0].file, element, scope, canonical.layerOrder),
            app: utilityCandidates(app.sheets, DEFAULT_PATHS.appCss, element, scope, app.layerOrder),
          });
          for (const k of result.shadows.canonical) shadows.canonical.add(k);
          for (const k of result.shadows.app) shadows.app.add(k);
          shadows.contexts = Math.max(shadows.contexts, result.contexts);
          for (const finding of result.findings) {
            const devKey = `shadow:${finding.key}:${finding.prop}`;
            const deviation = deviations.get(devKey);
            if (deviation) {
              usedDeviations.add(devKey);
              const reason = String(deviation.reason ?? '').trim();
              if (!reason) failures.push(`deviation ${devKey} has no reason — every documented deviation needs one`);
              else if (!deviation.holds({ canonical: finding.canonical, app: finding.app })) failures.push(`deviation ${devKey} no longer holds (design ${finding.canonical ?? 'nothing'}, runtime ${finding.app ?? 'nothing'}): ${finding.message}`);
              else { if (!honoured.some((h) => h.system === `shadow:${finding.key}` && h.token === finding.prop)) honoured.push({ system: `shadow:${finding.key}`, token: finding.prop, canonical: finding.canonical, app: finding.app, reason }); continue; }
            }
            if (!bySystem.has(finding.message)) bySystem.set(finding.message, []);
            bySystem.get(finding.message).push(systemId);
          }
        }
        const systemCount = canonical.effective.size;
        for (const [message, systems] of bySystem) {
          failures.push(systems.length === systemCount ? message : `${message} [${systems.join(', ')}]`);
        }
      }
      utilities.push({
        rule: key,
        status: rows.every((r) => r.status === 'match' || r.status === 'documented-deviation') ? 'match' : 'mismatch',
        occurrences: { canonical: canonical.sheet?.occurrences.get(key) ?? 1, app: app.sheet?.occurrences.get(key) ?? 1 },
        declarations: rows,
        shadows: { canonical: [...shadows.canonical].sort(), app: [...shadows.app].sort(), contexts: shadows.contexts },
      });
    }
  }

  // Rule 8b — the document box height (an absent runtime height is `auto`).
  if (canonical.rules && app.rules) {
    for (const selector of BASE_BOX_RULES) {
      const canonRaw = canonical.rules.get(selector)?.get('height');
      if (canonRaw == null) {
        failures.push(`base box ${selector}: the design no longer sets height — update BASE_BOX_RULES`);
        continue;
      }
      const canon = normaliseValue(canonRaw);
      // What the document resolves once every app sheet cascades over the canonical one.
      const appRaw = (app.mergedRules ?? app.rules).get(selector)?.get('height');
      const appNorm = appRaw == null ? 'auto' : normaliseValue(appRaw);
      if (appNorm === canon) continue;
      const devKey = `rule:${selector}:height`;
      const deviation = deviations.get(devKey);
      if (deviation) {
        usedDeviations.add(devKey);
        const reason = String(deviation.reason ?? '').trim();
        if (!reason) failures.push(`deviation ${devKey} has no written reason — write why or delete the entry`);
        else if (typeof deviation.holds !== 'function') failures.push(`deviation ${devKey} has no holds() check — a reason must be re-provable from data`);
        else if (!deviation.holds({ canonical: canon, app: appNorm, canonicalRules: canonical.rules, appRules: app.mergedRules ?? app.rules })) failures.push(`deviation ${devKey} no longer holds (canonical ${canon} vs runtime ${appNorm}) — align the value or rewrite the entry`);
        else { honoured.push({ system: `rule:${selector}`, token: 'height', canonical: canon, app: appNorm, reason }); continue; }
        continue;
      }
      failures.push(`base box ${selector}: height differs — design ${canon} vs runtime ${appNorm}`);
    }
  }

  for (const [key, deviation] of deviations) {
    if (usedDeviations.has(key)) continue;
    if (key.startsWith('rule:')) {
      failures.push(`deviation ${key} is stale — the declaration now matches the design (or the rule is absent); drop the entry`);
      continue;
    }
    if (key.startsWith('shadow:')) {
      failures.push(`deviation ${key} is stale — no non-canonical rule by that key wins the property any more; drop the entry`);
      continue;
    }
    const [systemId, token] = key.split(':');
    if (!canonical.effective.has(systemId)) {
      failures.push(`deviation ${key} names a system the design does not ship — drop the stale entry (reason was: ${String(deviation.reason ?? '').trim() || '(none)'})`);
      continue;
    }
    failures.push(`deviation ${key} is stale — ${token} now matches the design (or is absent on one side); drop the entry`);
  }

  // Rule 4 — the accent pair per block, then as the cascade resolves it for
  // every system × accent combination (a system block or an !important root
  // declaration that outranks the accent block is a drift the block-level
  // compare cannot see).
  const combos = [];
  if (canonical.paintsAccentPair === false) failures.push(`canonical ${DEFAULT_PATHS.canonicalJs}: applyDesignSystem no longer sets --accent/--accent-2 from primary/secondary — extend the model before trusting this gate`);
  if (app.bootRegistryMismatch) failures.push('registry: Theme boot fallback ids/default accents differ from canonical registry');
  if (app.paintsAccentPair === false) failures.push(`served ${DEFAULT_PATHS.appJs}: applyDesignSystem no longer sets --accent/--accent-2 from primary/secondary — no accent paints`);
  for (const [id, canonAccent] of canonical.accents) {
    const appAccent = app.accents.get(id);
    if (!appAccent) {
      failures.push(`accent "${id}" ships in the design but is missing from the served ACCENTS (${DEFAULT_PATHS.appJs})`);
      continue;
    }
    for (const [field, token] of [['primary', '--accent'], ['secondary', '--accent-2']]) {
      const canon = normaliseValue(canonAccent[field]);
      const appVal = appAccent[field] == null ? null : normaliseValue(appAccent[field]);
      if (appVal !== canon) {
        mismatches.push({ system: `accent:${id}`, token, canonical: canon, app: appVal });
      }
    }
    for (const systemId of canonical.effective.keys()) {
      const canonResolved = canonical.resolve(systemId, id);
      const appResolved = app.resolve(systemId, id);
      const row = { system: systemId, accent: id, status: 'match' };
      for (const [field, token] of [['primary', '--accent'], ['secondary', '--accent-2']]) {
        const canon = normaliseValue(canonResolved.get(token));
        const raw = appResolved.get(token);
        const appVal = raw == null ? null : normaliseValue(raw);
        row[token] = { canonical: canon, app: appVal };
        if (appVal === canon) continue;
        row.status = 'mismatch';
        // When the accent block itself wins and is wrong, the block-level
        // mismatch above already says so; report here only what outranks it.
        const blockValue = appAccent[field] == null ? null : normaliseValue(appAccent[field]);
        if (appVal === blockValue) continue;
        failures.push(`accent combo ${systemId}/${id}: ${token} resolves to ${appVal ?? 'nothing'} in the runtime but the design paints ${canon}`);
      }
      combos.push(row);
    }
  }
  for (const [id] of app.accents) {
    if (!canonical.accents.has(id)) failures.push(`the served ACCENTS offers "${id}" but the design ships no such accent`);
  }
  if (app.accentProps) {
    for (const [id, props] of app.accentProps) {
      for (const prop of props.keys()) {
        if (prop !== '--accent' && prop !== '--accent-2' && tracked.has(prop)) {
          failures.push(`accent "${id}": :root[data-accent="${id}"] re-declares ${prop} — an accent block may only set --accent/--accent-2`);
        }
      }
    }
  }

  // Rule 5 — the runtime wrapper and the pre-paint boot agree with the design
  // defaults and with each other, and restate none of the tables.
  for (const [systemId, accentId] of canonical.defaultAccents) {
    const appDefault = app.defaultAccents?.get(systemId) ?? null;
    if (appDefault !== accentId) {
      failures.push(`registry: default accent for "${systemId}" is ${appDefault ?? 'missing'} in the runtime but ${accentId} in the design`);
    }
  }
  if (app.registry) {
    const reg = app.registry;
    const ts = DEFAULT_PATHS.appRegistry;
    const designSystem = canonical.fallbacks?.system ?? null;
    const designAccent = designSystem ? canonical.defaultAccents.get(designSystem) ?? null : null;
    if (reg.defaultSystem !== designSystem || reg.defaultAccent !== designAccent) {
      failures.push(`registry: boot default is ${reg.defaultSystem}/${reg.defaultAccent} in ${ts}; the design boots ${designSystem}/${designAccent} (applyDesignSystem's fallback system and its SYSTEM_DEFAULT_ACCENT)`);
    }
    if (reg.defaultAccent !== (canonical.fallbacks?.accent ?? null)) {
      failures.push(`registry: DEFAULT_ACCENT ${reg.defaultAccent} in ${ts} is not the accent applyDesignSystem falls back to (${canonical.fallbacks?.accent ?? 'none'})`);
    }
    for (const name of reg.restated) {
      failures.push(`registry: ${ts} restates ${name} — the tables live only in ${DEFAULT_PATHS.appJs}; read the window globals through the getters`);
    }
    for (const global of ['DESIGN_SYSTEMS', 'ACCENTS', 'SYSTEM_DEFAULT_ACCENT']) {
      if (!reg.readsGlobals.has(global)) failures.push(`registry: ${ts} never reads window.${global} — its getters must read the canonical globals`);
    }
    for (const [field, label] of [['systemKey', 'SYSTEM_STORAGE_KEY'], ['accentKey', 'ACCENT_STORAGE_KEY']]) {
      if (!reg[field]) failures.push(`registry: could not read ${label} out of ${ts}`);
    }
    const boot = app.boot;
    const html = DEFAULT_PATHS.appIndexHtml;
    if (boot && app.load?.boot) {
      for (const [field, label, expected] of [
        ['systemKey', 'system storage key', reg.systemKey],
        ['accentKey', 'accent storage key', reg.accentKey],
        ['fallbackSystem', 'fallback system', reg.defaultSystem],
      ]) {
        const got = boot[field];
        if (got.expr == null) {
          failures.push(`boot: could not locate the ${label} in the ${html} pre-paint script — teach parseThemeBoot() the new shape rather than leaving it unchecked`);
        } else if (got.value == null) {
          failures.push(got.marker
            ? `boot: ${html} reads its ${label} from ${got.expr}, but ${DEFAULT_PATHS.viteConfig} does not inject design-system.ts THEME_BOOT_DATA for ${THEME_BOOT_MARKER} (or THEME_BOOT_DATA lacks that field)`
            : `boot: the ${label} in ${html} (${got.expr}) is neither a string literal nor injected THEME_BOOT data`);
        } else if (got.value !== expected) {
          failures.push(`boot: ${html} uses ${label} "${got.value}" but ${ts} uses "${expected}" — a saved choice is read from a different place than it is written`);
        }
      }
      if (boot.handCopied) failures.push(`boot: ${html} hand-copies a system/accent table into the pre-paint script — read window.DESIGN_SYSTEMS/ACCENTS instead`);
    }
  }

  for (const m of missing) failures.push(`${m.system}: design token ${m.token} (${m.canonical}) is absent from the runtime cascade`);
  for (const m of mismatches) failures.push(`${m.system}: ${m.token} differs — design ${m.canonical} vs runtime ${m.app}`);

  // Rules 12–14 — the document itself: the main sheet must actually load,
  // unconditionally; no @import may be misplaced or doubled; the layer order
  // must not depend on which conditional rules currently match.
  const reach = app.reach ?? null;
  const load = app.load ?? null;
  const html = DEFAULT_PATHS.appIndexHtml;
  if (load) {
    // Rule 12 — the canonical pair loads unconditionally and before the boot.
    if (!load.css) {
      failures.push(`document: ${html} has no <link rel="stylesheet" href="${CSS_HREF}"> — ${DEFAULT_PATHS.appCss} is never loaded and the runtime paints no design token at all`);
    } else if (load.css.media && !/^\s*(all|screen)?\s*$/i.test(load.css.media)) {
      failures.push(`document: the ${CSS_HREF} <link> in ${html} carries media="${load.css.media}" — its tokens apply only while that query matches; link it unconditionally`);
    }
    if (load.cssCount > 1) failures.push(`document: ${html} links ${CSS_HREF} ${load.cssCount} times — every rule of it would apply at two document positions`);
    if (!load.js) {
      failures.push(`document: ${html} has no <script src="${JS_HREF}"> — no system or accent is ever applied`);
    } else {
      const how = [load.js.async && 'async', load.js.defer && 'defer', load.js.module && 'type="module"'].filter(Boolean);
      if (how.length) failures.push(`document: <script src="${JS_HREF}"> in ${html} is ${how.join(' + ')} — it must load synchronously so applyDesignSystem exists before the boot paints`);
      if (!load.boot) failures.push(`document: no inline script in ${html} calls applyDesignSystem() — the saved system is never painted before hydration`);
      else if (load.js.index > load.boot.index) failures.push(`document: <script src="${JS_HREF}"> comes after the pre-paint boot in ${html} — the boot calls an applier that does not exist yet`);
    }
  }
  if (reach) {
    const entry = reach.entry ?? DEFAULT_PATHS.appEntryCss;
    for (const m of reach.misplaced ?? []) {
      failures.push(`misplaced @import: "${m.spec}" in ${m.file} ${m.reason} — the Tailwind compiler inlines it where it sits (so it IS modelled there), but css-syntax, postcss-import and a browser given the raw sheet drop an @import that is not at the top of its sheet (only @charset, @layer statements and other @imports may precede it); move it up so every pipeline agrees`);
    }
    for (const d of reach.duplicates ?? []) {
      failures.push(`duplicate @import: ${d.file} is imported again by ${d.importer} ("${d.spec}") after ${d.loadedVia ?? entry} already loaded it — the Tailwind compiler inlines both copies, so every rule of it applies twice at two document positions; import it once`);
    }
  }
  const ambiguities = app.layerOrder ? app.layerOrder.ambiguities() : [];
  for (const a of ambiguities) {
    failures.push(`layer order: cascade layers "${a.earlier}" and "${a.later}" are ordered by a condition — ahead of "${a.later}" (${a.laterWhere}) "${a.earlier}" is declared only conditionally (${a.conditionalWhere.join('; ')}) and it is declared again after it (${a.redeclaredWhere}), so while the condition is false the browser puts "${a.later}" first and every !important contest between the two flips; fix the order with an unconditional \`@layer ${a.earlier}, ${a.later};\` statement ahead of both`);
  }

  return {
    ok: failures.length === 0,
    failures,
    mismatches,
    missing,
    honoured,
    appOnly: [...appOnly].map(([token, systems]) => ({ token, systems: [...systems] })),
    perSystem,
    geometry,
    responsive,
    combos,
    elsewhere,
    cascade: {
      rootBlocks: app.sheet?.occurrences.get(':root') ?? null,
      systemBlocks: Object.fromEntries([...(app.systemBlocks ?? new Map()).keys()].map((id) => [id, app.sheet?.occurrences.get(`:root[data-system="${id}"]`) ?? null])),
      scopedDeclarations: app.scoped.reduce((n, r) => n + r.props.size, 0),
      siblingDeclarations: app.siblingDeclarations.length,
      layers: app.layerOrder ? app.layerOrder.list() : [],
      layerAmbiguities: ambiguities,
      sheets: app.sheets
        .map((s) => ({ file: s.file, position: asPath(s.order).join('.'), order: s.order, layer: s.baseLayer ?? null, context: s.context || null }))
        .sort((a, b) => comparePath(a.order, b.order)),
      document: reach ? { entry: reach.entry ?? null, main: reach.main ?? null, misplaced: reach.misplaced ?? [], unresolved: reach.unresolved ?? [], duplicates: reach.duplicates ?? [] } : null,
    },
    utilities,
  };
}

// ---------------------------------------------------------------------------
// Canaries — the gate proves on every run that it still catches each bypass
// class. Mutations act on in-memory copies of the LIVE inputs, so an anchor
// that stops matching fails loudly instead of silently probing nothing.
// ---------------------------------------------------------------------------
function must(source, pattern, label) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!re.test(source)) throw new Error(`canary anchor missing: ${label} (${re})`);
  return re;
}

const swap = (source, pattern, replacement, label) => source.replace(must(source, pattern, label), replacement);

// Cascade-layer canaries — the same stylesheets are loaded in a real browser
// by scripts/validation/canonical-token-parity-browser-check.mjs (evidence in
// docs/parity/evidence/tokens/), so `browser` records what Chromium resolves
// for the utility element at a tablet viewport and the gate's verdict must
// agree with it: FAIL whenever the browser paints something other than the
// design's `display: none !important` for .hide-tablet, PASS when it paints
// the canonical value even though a non-canonical rule supplies it.
const TABLET_MEDIA = '@media (max-width: 1024px)';
const bypass = ':where(.hide-tablet) { display: block !important; }';
const restore = '.hide-tablet.hide-tablet { display: none !important; }';
export const LAYER_CANARIES = {
  // The reviewer's bypass: an earlier layer's low-specificity !important beats
  // a later layer's high-specificity !important restore AND the unlayered
  // canonical rule (important reverses the layer order; unlayered loses to
  // every layer).
  'two-layer-important-earlier-wins': { css: `${TABLET_MEDIA} { @layer early { ${bypass} } @layer late { ${restore} } }`, browser: 'block' },
  // Same two layers, canonical value in the EARLIER layer: the browser paints
  // none — a non-canonical rule wins, but with the design's value.
  'two-layer-important-canonical-earlier': { css: `${TABLET_MEDIA} { @layer early { ${restore} } @layer late { ${bypass} } }`, browser: 'none' },
  // A `@layer` statement fixes the order before any block: `late` is declared
  // first, so it is the earlier layer and its restore wins.
  'layer-statement-sets-order-pass': { css: `@layer late, early; ${TABLET_MEDIA} { @layer early { ${bypass} } @layer late { ${restore} } }`, browser: 'none' },
  // …and the statement can also make the bypass win when the blocks appear in
  // the opposite order to the statement.
  'layer-statement-sets-order-fail': { css: `@layer early, late; ${TABLET_MEDIA} { @layer late { ${restore} } @layer early { ${bypass} } }`, browser: 'block' },
  // Two anonymous layers are two layers: the first wins under !important.
  'anonymous-layers-first-wins': { css: `${TABLET_MEDIA} { @layer { ${bypass} } @layer { ${restore} } }`, browser: 'block' },
  // A sublayer precedes its parent's direct styles, whatever the source order,
  // so `outer.inner`'s bypass beats `outer`'s restore under !important.
  'nested-sublayer-precedes-parent': { css: `${TABLET_MEDIA} { @layer outer { ${restore} @layer inner { ${bypass} } } }`, browser: 'block' },
  // Dotted sublayer syntax + the sublayer holding the canonical value.
  'nested-sublayer-canonical': { css: `${TABLET_MEDIA} { @layer outer.inner { ${restore} } @layer outer { ${bypass} } }`, browser: 'none' },
  // An !important in any layer beats the unlayered canonical !important.
  'layered-important-beats-unlayered-important': { css: `${TABLET_MEDIA} { @layer x { ${bypass} } }`, browser: 'block' },
  // Normal declarations: the LATER layer wins regardless of specificity (the
  // canonical .chip rule declares no outline-offset, so the layered rules
  // compete only with each other).
  'two-layer-normal-later-wins': { css: '@layer a { .chip.chip { outline-offset: 1px; } } @layer b { :where(.chip) { outline-offset: 2px; } }', browser: '2px', element: '.chip', property: 'outline-offset' },
  // The order Tailwind's `@layer theme, base, components, utilities;` statement
  // (node_modules/tailwindcss/index.css, reached through index.css) fixes for
  // named layers an app sheet only USES: components precedes utilities even
  // though this sheet opens utilities first, so the components restore wins.
  'vendor-statement-orders-named-layers': { css: `${TABLET_MEDIA} { @layer utilities { ${bypass} } @layer components { ${restore} } }`, browser: 'none', vendor: 'node_modules/tailwindcss/index.css' },
};
const layerCanary = (id, expect, note) => ({
  id, note, expect,
  browser: LAYER_CANARIES[id],
  mutate: { siblings: (list) => [...list, { file: 'client/src/styles/canary.css', css: LAYER_CANARIES[id].css }] },
});

// Document canaries — these rewrite the document itself (client/src/index.css,
// plus sheets outside client/src so the ONLY way they reach the page is the
// import under test) through an in-memory overlay; the model redoes the
// document walk over the overlay, and the browser check serves the same
// overlay to Chromium from a synthetic client/index.html that links index.css,
// at a 900px viewport unless `viewport` says otherwise. `browser` is what
// Chromium computes for `element`'s `property` (.hide-tablet display by
// default; .chip display — inline-flex from design-system.css, block without
// it — for the main-sheet canaries).
const INDEX_CSS = 'client/src/index.css';
const CANARY_BYPASS = 'client/canary/bypass.css';
const CANARY_RESTORE = 'client/canary/restore.css';
const prepend = (text) => (source) => `${text}\n${source}`;
const append = (text) => (source) => `${source}\n${text}\n`;
const bypassSheet = `${TABLET_MEDIA} { @layer early { ${bypass} } }`;
const restoreSheet = `${TABLET_MEDIA} { ${restore} }`;
export const DOCUMENT_CANARIES = {
  // The reviewer's round-5 bypass: `@layer early;` written ABOVE the imports
  // registers before the imported sheets' layers (browsers place an importer's
  // pre-import statements first), so early < late and the early bypass beats
  // the late restore under !important.
  'import-layer-statement-above-imports': { files: { [INDEX_CSS]: prepend(`@layer early;\n@import '../canary/restore.css' layer(late);\n@import '../canary/bypass.css';`), [CANARY_RESTORE]: restoreSheet, [CANARY_BYPASS]: bypassSheet }, browser: 'block' },
  // Same imports behind `@layer late, early;` — late is first, its restore wins.
  'import-layer-statement-control': { files: { [INDEX_CSS]: prepend(`@layer late, early;\n@import '../canary/restore.css' layer(late);\n@import '../canary/bypass.css';`), [CANARY_RESTORE]: restoreSheet, [CANARY_BYPASS]: bypassSheet }, browser: 'none' },
  // No statement: the `layer(late)` import declares late first.
  'import-layers-without-statement': { files: { [INDEX_CSS]: prepend(`@import '../canary/restore.css' layer(late);\n@import '../canary/bypass.css';`), [CANARY_RESTORE]: restoreSheet, [CANARY_BYPASS]: bypassSheet }, browser: 'none' },
  // An @import after another rule: the Tailwind compiler inlines the bypass
  // sheet at the end of index.css (the browser paints it), and rule 13 names
  // the misplaced import that css-syntax would drop.
  'misplaced-import-after-rule': { files: { [INDEX_CSS]: append("@import '../canary/bypass.css';"), [CANARY_BYPASS]: bypassSheet }, browser: 'block' },
  // …and one nested inside a block is inlined inside that block.
  'misplaced-import-nested-in-media': { files: { [INDEX_CSS]: append(`${TABLET_MEDIA} { @import '../canary/bypass.css'; }`), [CANARY_BYPASS]: bypassSheet }, browser: 'block' },
  // A sheet imported twice is inlined twice.
  'duplicate-import': { files: { [INDEX_CSS]: prepend("@import '../canary/bypass.css';\n@import '../canary/bypass.css';"), [CANARY_BYPASS]: bypassSheet }, browser: 'block' },
  // A media-conditioned import applies while its query matches (900px does).
  'conditional-import-media-matches': { files: { [INDEX_CSS]: prepend("@import '../canary/bypass.css' (min-width: 800px);"), [CANARY_BYPASS]: bypassSheet }, browser: 'block' },
  // A print-only import is not a screen surface.
  'conditional-import-print-only': { files: { [INDEX_CSS]: prepend("@import '../canary/bypass.css' print;"), [CANARY_BYPASS]: bypassSheet }, browser: 'none' },
  // The canonical sheet is <link>ed by client/index.html; an @import of it
  // from index.css loads it a second time, at the bundle's position (the
  // browser paints .chip inline-flex from that copy even without the link).
  'main-sheet-reimported': { files: { [INDEX_CSS]: prepend(`@import '${CSS_HREF}';`) }, browser: 'inline-flex', element: '.chip', property: 'display' },
  // Rule 14 alone: `late` is declared first only at ≥1200px; at 900px the
  // browser meets `early` first, so early < late and the bypass wins — while
  // the all-conditions-true shadow computation sees late < early and the
  // restore. The layer-order rule must catch what the shadow rule cannot.
  'layer-order-conditional-first-declaration': { files: { [INDEX_CSS]: prepend("@import '../canary/late-desktop.css';\n@import '../canary/bypass-late.css';"), 'client/canary/late-desktop.css': '@media (min-width: 1200px) { @layer late { .canary-zzz { color: red; } } }', 'client/canary/bypass-late.css': `${TABLET_MEDIA} { @layer early { ${bypass} } @layer late { ${restore} } }` }, browser: 'block' },
};
const documentCanary = (id, expect, note, extra = {}) => ({
  id, note, expect, ...extra,
  browser: DOCUMENT_CANARIES[id],
  mutate: { files: DOCUMENT_CANARIES[id].files },
});

/**
 * Materialise a canary `files` map: functions receive the file's current
 * source (empty when it does not exist) and return the new text; strings are
 * taken as-is. Shared by the model (runCanaries) and the browser check so both
 * see byte-identical sheets.
 */
export function overlayFiles(files) {
  const out = {};
  for (const [file, value] of Object.entries(files)) {
    const abs = path.resolve(ROOT, file);
    out[file] = typeof value === 'function' ? value(fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '') : value;
  }
  return out;
}

export const CANARIES = [
  { id: 'control', note: 'unmodified inputs', expect: 'PASS' },
  // --- cascade bypasses -----------------------------------------------------
  { id: 'later-root-override', note: 'the bridge re-declares --bg on :root — the applier\'s inline write still paints every system, but the pre-apply paint and the single source break', expect: /^single source: client\/src\/styles\/app-bridge\.css :root \{ --bg: #123456 \} redefines a canonical design token/, also: [/^pre-apply: --bg differs — design .+ vs runtime #123456/], reject: /^editorial: --bg differs/, mutate: { bridge: (s) => `${s}\n:root { --bg: #123456; }\n` } },
  { id: 'later-root-important', note: 'a later :root sets --radius !important', expect: /^editorial: --radius differs/, mutate: { bridge: (s) => `${s}\n:root { --radius: 10px !important; }\n` } },
  { id: 'earlier-important-wins', note: 'an earlier !important --radius survives a later plain override (browser semantics)', expect: /^editorial: --radius differs — design 12px vs runtime 9px !important/, mutate: { bridge: (s) => `:root { --radius: 9px !important; }\n${s}\n:root { --radius: 12px; }\n` } },
  { id: 'later-system-block', note: 'a bridge :root[data-system="geist"] block re-declares --surface (the inline write still wins; the single source breaks)', expect: /^single source: client\/src\/styles\/app-bridge\.css :root\[data-system="geist"\] \{ --surface: .+ \} redefines a canonical design token/, reject: /^geist: --surface differs/, mutate: { bridge: (s) => `${s}\n:root[data-system="geist"] { --surface: rgba(255,255,255,0.05); }\n` } },
  { id: 'important-root-vs-system', note: 'a bridge :root !important --surface outranks a later, canonical-valued editorial system block and the inline write (importance beats specificity and inline)', expect: /^editorial: --surface differs — design .+ vs runtime #010203 !important/, mutate: { bridge: (s) => `:root { --surface: #010203 !important; }\n${s}\n:root[data-system="editorial"] { --surface: rgba(244,243,238,0.025); }\n` } },
  { id: 'important-accent-combo', note: 'a system block sets --accent !important, outranking every accent block', expect: /^accent combo geist\/cyan: --accent resolves to #ff0000 !important in the runtime but the design paints/, mutate: { bridge: (s) => `${s}\n:root[data-system="geist"] { --accent: #ff0000 !important; }\n` } },
  { id: 'late-system-accent', note: 'a bridge system block sets --accent without !important — the applier\'s inline accent still wins, the single source does not', expect: /^single source: client\/src\/styles\/app-bridge\.css :root\[data-system="geist"\] \{ --accent: #ff0000 \} redefines a canonical design token/, reject: /^accent combo/, mutate: { bridge: (s) => `${s}\n:root[data-system="geist"] { --accent: #ff0000; }\n` } },
  { id: 'system-geometry-drift', note: 'a system block re-declares --content-max (geometry is system-independent in the design)', expect: /^geometry: --content-max differs in geist — design 1240px vs runtime 1000px/, mutate: { bridge: (s) => `${s}\n:root[data-system="geist"] { --content-max: 1000px; }\n` } },
  { id: 'later-utility-override', note: 'a repeated .chip rule changes font-size', expect: /^utility \.chip: font-size differs/, mutate: { appCss: (s) => `${s}\n.chip { font-size: 12px; }\n` } },
  { id: 'later-utility-under-media', note: '.chip re-declared under a media query in the bridge', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css @media \(max-width: 600px\)\|\|\.chip re-declares text-transform for \.chip under @media \(max-width:600px\)/, mutate: { bridge: (s) => `${s}\n@media (max-width: 600px) { .chip { text-transform: lowercase; } }\n` } },
  { id: 'descendant-override', note: '.page .chip re-declares text-transform in the bridge', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css \.page \.chip re-declares text-transform/, mutate: { bridge: (s) => `${s}\n.page .chip { text-transform: lowercase; }\n` } },
  { id: 'page-background-shadow', note: 'the bridge repaints .page (the retired .page atmosphere deviation must not come back silently)', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css \.page re-declares background for \.page/, mutate: { bridge: (s) => `${s}\n.page { background: transparent; }\n` } },
  { id: 'state-override', note: '.chip:hover re-declares background', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css \.chip:hover re-declares background for \.chip when :hover/, mutate: { bridge: (s) => `${s}\n.chip:hover { background: red; }\n` } },
  // --- selector-equivalent shadows (decided by a selector engine, not by the selector text) ---
  { id: 'escaped-class-shadow', note: '.\\63 hip is .chip spelled with a hex escape — the engine must decode it, not split on the terminator space', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css \.\\63 hip re-declares text-transform for \.chip — runtime resolves lowercase/, mutate: { bridge: (s) => `${s}\n.\\63 hip { text-transform: lowercase; }\n` } },
  { id: 'attribute-class-shadow', note: '[class~="chip"] re-declares text-transform (same element, same specificity, later wins)', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css \[class~="chip"\] re-declares text-transform for \.chip — runtime resolves lowercase, design resolves uppercase/, mutate: { bridge: (s) => `${s}\n[class~="chip"] { text-transform: lowercase; }\n` } },
  { id: 'is-shadow', note: ':is(.chip) re-declares text-transform', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css :is\(\.chip\) re-declares text-transform for \.chip/, mutate: { bridge: (s) => `${s}\n:is(.chip) { text-transform: lowercase; }\n` } },
  { id: 'not-shadow', note: '.chip:not(.accent) re-declares text-transform (higher specificity)', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css \.chip:not\(\.accent\) re-declares text-transform for \.chip/, mutate: { bridge: (s) => `${s}\n.chip:not(.accent) { text-transform: lowercase; }\n` } },
  { id: 'tag-qualified-shadow', note: 'span.chip re-declares text-transform (type selector adds specificity)', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css span\.chip re-declares text-transform for \.chip/, mutate: { bridge: (s) => `${s}\nspan.chip { text-transform: lowercase; }\n` } },
  { id: 'where-no-op', note: ':where(.chip) re-declares text-transform at zero specificity — the canonical rule still wins', expect: 'PASS', mutate: { bridge: (s) => `${s}\n:where(.chip) { text-transform: lowercase; }\n` } },
  { id: 'where-important-shadow', note: ':where(.chip) !important outranks the canonical rule despite zero specificity', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css :where\(\.chip\) re-declares text-transform for \.chip — runtime resolves lowercase !important/, mutate: { bridge: (s) => `${s}\n:where(.chip) { text-transform: lowercase !important; }\n` } },
  { id: 'system-scoped-shadow', note: ':root[data-system="geist"] .chip re-declares text-transform for one system only', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css :root\[data-system="geist"\] \.chip re-declares text-transform for \.chip — runtime resolves lowercase, design resolves none via \[data-system="geist"\] \.chip \[geist\]$/, mutate: { bridge: (s) => `${s}\n:root[data-system="geist"] .chip { text-transform: lowercase; }\n` } },
  { id: 'sibling-shadow', note: 'another client stylesheet (position unknown → ranked last) re-declares .chip text-transform', expect: /^shadow rule: client\/src\/styles\/canary\.css \.chip re-declares text-transform for \.chip/, mutate: { siblings: (list) => [...list, { file: 'client/src/styles/canary.css', css: '.chip { text-transform: lowercase; }' }] } },
  { id: 'admin-descendant-shadow', note: 'the admin sheet scopes a .chip override under .admin-dashboard', expect: /^shadow rule: client\/src\/components\/admin\/admin-canonical\.css \.admin-dashboard \.chip re-declares text-transform for \.chip/, mutate: { siblings: (list) => [...list, { file: 'client/src/components/admin/admin-canonical.css', css: '.admin-dashboard .chip { text-transform: lowercase; }' }] } },
  { id: 'layered-shadow-no-op', note: 'a sibling re-declares .chip inside @layer — unlayered canonical rules outrank it', expect: 'PASS', mutate: { siblings: (list) => [...list, { file: 'client/src/styles/canary.css', css: '@layer components { .chip { text-transform: lowercase; } }' }] } },
  layerCanary('two-layer-important-earlier-wins', /^shadow rule: client\/src\/styles\/canary\.css @media \(max-width: 1024px\) @layer early\|\|:where\(\.hide-tablet\) re-declares display for \.hide-tablet under @media \(max-width:1024px\) — runtime resolves block !important, design resolves none !important$/, 'reviewer bypass: earlier layer :where() !important beats a later layer\'s higher-specificity !important restore and the unlayered canonical rule'),
  layerCanary('two-layer-important-canonical-earlier', 'PASS', 'two layers, canonical restore in the earlier layer — the browser paints the design value'),
  layerCanary('layer-statement-sets-order-pass', 'PASS', '`@layer late, early;` declares late first, so its restore outranks the early-block bypass'),
  layerCanary('layer-statement-sets-order-fail', /^shadow rule: client\/src\/styles\/canary\.css @media \(max-width: 1024px\) @layer early\|\|:where\(\.hide-tablet\) re-declares display for \.hide-tablet under @media \(max-width:1024px\) — runtime resolves block !important/, '`@layer early, late;` makes the later-written early block the winner'),
  layerCanary('anonymous-layers-first-wins', /^shadow rule: client\/src\/styles\/canary\.css @media \(max-width: 1024px\) @layer\|\|:where\(\.hide-tablet\) re-declares display for \.hide-tablet under @media \(max-width:1024px\) — runtime resolves block !important/, 'two anonymous @layer {} blocks are two layers; the first wins under !important'),
  layerCanary('nested-sublayer-precedes-parent', /^shadow rule: client\/src\/styles\/canary\.css @media \(max-width: 1024px\) @layer outer @layer inner\|\|:where\(\.hide-tablet\) re-declares display for \.hide-tablet under @media \(max-width:1024px\) — runtime resolves block !important/, 'a sublayer precedes its parent\'s direct styles even when written after them'),
  layerCanary('nested-sublayer-canonical', 'PASS', 'dotted `@layer outer.inner` holds the canonical restore and outranks outer\'s bypass'),
  layerCanary('layered-important-beats-unlayered-important', /^shadow rule: client\/src\/styles\/canary\.css @media \(max-width: 1024px\) @layer x\|\|:where\(\.hide-tablet\) re-declares display for \.hide-tablet under @media \(max-width:1024px\) — runtime resolves block !important/, 'an !important inside any layer beats the unlayered canonical !important'),
  layerCanary('two-layer-normal-later-wins', /^shadow rule: client\/src\/styles\/canary\.css @layer b\|\|:where\(\.chip\) re-declares outline-offset for \.chip — runtime resolves 2px, design resolves nothing$/, 'normal declarations: the later layer wins over an earlier layer\'s higher specificity'),
  layerCanary('vendor-statement-orders-named-layers', 'PASS', 'Tailwind\'s `@layer theme, base, components, utilities;` statement orders layers this sheet only uses — components (restore) beats utilities (bypass)'),
  documentCanary('import-layer-statement-above-imports', /^shadow rule: client\/canary\/bypass\.css @media \(max-width: 1024px\) @layer early\|\|:where\(\.hide-tablet\) re-declares display for \.hide-tablet under @media \(max-width:1024px\) — runtime resolves block !important, design resolves none !important$/, 'reviewer bypass: `@layer early;` above index.css\'s imports registers before the layer(late) import — early < late, the early bypass wins'),
  documentCanary('import-layer-statement-control', 'PASS', '`@layer late, early;` above the same imports puts late first — the restore wins'),
  documentCanary('import-layers-without-statement', 'PASS', 'no statement: the layer(late) import declares late ahead of the bypass sheet\'s early'),
  documentCanary('misplaced-import-after-rule', /^misplaced @import: "\.\.\/canary\/bypass\.css" in client\/src\/index\.css it follows another rule/, 'an @import after index.css\'s rules is inlined there by the Tailwind compiler (the shadow is modelled) and reported as misplaced', { also: [/^shadow rule: client\/canary\/bypass\.css @media \(max-width: 1024px\) @layer early\|\|:where\(\.hide-tablet\) re-declares display for \.hide-tablet under @media \(max-width:1024px\) — runtime resolves block !important/] }),
  documentCanary('misplaced-import-nested-in-media', /^misplaced @import: "\.\.\/canary\/bypass\.css" in client\/src\/index\.css it is nested inside @media \(max-width: 1024px\)/, 'an @import nested in @media is inlined inside it — modelled under the enclosing condition and reported as misplaced', { also: [/^shadow rule: client\/canary\/bypass\.css @media \(max-width: 1024px\) @media \(max-width: 1024px\) @layer early\|\|:where\(\.hide-tablet\) re-declares display for \.hide-tablet under @media \(max-width:1024px\) @media \(max-width:1024px\) — runtime resolves block !important/] }),
  documentCanary('duplicate-import', /^duplicate @import: client\/canary\/bypass\.css is imported again by client\/src\/index\.css \("\.\.\/canary\/bypass\.css"\) after client\/src\/index\.css already loaded it/, 'a sheet imported twice is inlined twice — reported, first copy modelled', { also: [/^shadow rule: client\/canary\/bypass\.css @media \(max-width: 1024px\) @layer early\|\|:where\(\.hide-tablet\)/] }),
  documentCanary('conditional-import-media-matches', /^shadow rule: client\/canary\/bypass\.css @media \(min-width: 800px\) @media \(max-width: 1024px\) @layer early\|\|:where\(\.hide-tablet\) re-declares display for \.hide-tablet under @media \(min-width:800px\) @media \(max-width:1024px\) — runtime resolves block !important/, 'an @import with a media list is a media-scoped sheet — modelled under that condition'),
  documentCanary('conditional-import-print-only', 'PASS', 'an @import … print is print-only and not a screen parity surface'),
  documentCanary('main-sheet-reimported', /^duplicate @import: client\/public\/ds\/design-system\.css is imported again by client\/src\/index\.css \("\/ds\/design-system\.css"\) after client\/index\.html already loaded it/, 'index.css @imports the canonical sheet index.html already links — rule 13 names the second load'),
  documentCanary('layer-order-conditional-first-declaration', /^layer order: cascade layers "late" and "early" are ordered by a condition — ahead of "early" \(client\/canary\/bypass-late\.css inside @media \(max-width:1024px\)\) "late" is declared only conditionally \(client\/canary\/late-desktop\.css inside @media \(min-width:1200px\)\) and it is declared again after it \(client\/canary\/bypass-late\.css inside @media \(max-width:1024px\)\)/, 'late is first declared only at ≥1200px, so at 900px early registers first and its bypass wins — the shadow computation (all conditions true) sees the restore win, only rule 14 catches it', { reject: /^shadow rule:/ }),
  { id: 'import-layer-main-sheet', note: 'were the canonical sheet loaded into a cascade layer (layer(theme)) instead of linked unlayered, an EARLIER unlayered index.html :root would beat it — rule 3 must see the browser value', expect: /^pre-apply: --bg differs — design .+ vs runtime #000001$/, mutate: { mainLayer: () => 'theme', siblings: (list) => [...list, { file: 'client/index.html', css: ':root { --bg: #000001; }', order: -1 }] } },
  { id: 'import-layer-sibling-loses', note: 'a LATER sibling imported with layer(x) re-declares .chip — the unlayered canonical rule still wins', expect: 'PASS', mutate: { siblings: (list) => [...list, { file: 'client/src/styles/canary.css', css: '.chip { text-transform: lowercase; }', layer: 'x' }] } },
  { id: 'print-shadow-ignored', note: 'a print-only .chip override is not a screen parity surface', expect: 'PASS', mutate: { bridge: (s) => `${s}\n@media print { .chip { text-transform: lowercase; } }\n` } },
  { id: 'not-print-shadow-resolves', note: '@media not print DOES apply on screen — only a print-only query list is excluded', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css @media not print\|\|\.chip re-declares text-transform for \.chip under @media not print — runtime resolves lowercase/, mutate: { bridge: (s) => `${s}\n@media not print { .chip { text-transform: lowercase; } }\n` } },
  { id: 'screen-print-list-shadow-resolves', note: '@media screen, print matches screens too', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css @media screen, print\|\|\.chip re-declares text-transform for \.chip under @media screen, print — runtime resolves lowercase/, mutate: { bridge: (s) => `${s}\n@media screen, print { .chip { text-transform: lowercase; } }\n` } },
  { id: 'nested-descendant-shadow', note: 'CSS Nesting: .page { .chip {} } is .page .chip and outranks the utility', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css \.page \.chip re-declares text-transform for \.chip — runtime resolves lowercase/, mutate: { bridge: (s) => `${s}\n.page { .chip { text-transform: lowercase; } }\n` } },
  { id: 'nested-ampersand-media-shadow', note: 'CSS Nesting: .chip { @media (…) { … } } is a media-scoped .chip rule', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css @media \(min-width: 0px\)\|\|\.chip re-declares text-transform for \.chip under @media \(min-width:0px\) — runtime resolves lowercase/, mutate: { bridge: (s) => `${s}\n.chip { @media (min-width: 0px) { text-transform: lowercase; } }\n` } },
  { id: 'nested-root-media-geometry', note: 'CSS Nesting: :root { @media (tablet) { --shell-sidebar-w } } is the responsive geometry contract', expect: /^responsive geometry: --shell-sidebar-w inside @media \(min-width: 768px\) and \(max-width: 1023px\) resolves to 200px/, mutate: { bridge: (s) => `${s}\n:root { @media (min-width: 768px) and (max-width: 1023px) { --shell-sidebar-w: 200px; } }\n` } },
  { id: 'nested-ampersand-root-token', note: 'CSS Nesting: :root { & { --bg } } is a later :root declaration', expect: /^single source: client\/src\/styles\/app-bridge\.css :root \{ --bg: #010204 \} redefines a canonical design token/, also: [/^pre-apply: --bg differs — design .+ vs runtime #010204/], mutate: { bridge: (s) => `${s}\n:root { & { --bg: #010204; } }\n` } },
  { id: 'universal-important-shadow', note: '* { text-transform !important } outranks every utility rule', expect: /^shadow rule: client\/src\/styles\/app-bridge\.css \* re-declares text-transform for \.chip — runtime resolves lowercase !important/, mutate: { bridge: (s) => `${s}\n* { text-transform: lowercase !important; }\n` } },
  { id: 'no-anim-deviation-stale', note: 'the bridge narrows .no-anim * to the design\'s scope (entry becomes stale)', expect: /^deviation shadow:client\/src\/styles\/app-bridge\.css \.no-anim \*:transition is stale/, mutate: { bridge: (s) => swap(s, /\.no-anim,\s*\n\.no-anim \*,\s*\n\.no-anim \*::before,\s*\n\.no-anim \*::after \{/, '.no-anim .live-dot {', '.no-anim blanket rule') } },
  { id: 'no-anim-deviation-no-longer-holds', note: '.no-anim * still wins but no longer freezes (the reason cites a blanket freeze)', expect: /^deviation shadow:client\/src\/styles\/app-bridge\.css \.no-anim \*:transition no longer holds/, mutate: { bridge: (s) => swap(s, /(\.no-anim \*::after \{[^}]*transition:\s*)none !important/, '$1all 1s !important', '.no-anim transition !important') } },
  { id: 'extra-tablet-override', note: 'a later tablet media block sets --shell-sidebar-w to 200px', expect: /^responsive geometry: --shell-sidebar-w inside @media \(min-width: 768px\) and \(max-width: 1023px\) resolves to 200px/, mutate: { bridge: (s) => `${s}\n@media (min-width: 768px) and (max-width: 1023px) { :root { --shell-sidebar-w: 200px; } }\n` } },
  { id: 'removed-tablet-override', note: 'the tablet --shell-sidebar-w re-assignment is deleted', expect: /^responsive geometry: --shell-sidebar-w is not re-assigned inside/, mutate: { bridge: (s) => swap(s, /@media \(min-width: 768px\) and \(max-width: 1023px\)\s*\{\s*:root\s*\{\s*--shell-sidebar-w:[^}]*\}\s*\}/, '', 'tablet sidebar override') } },
  { id: 'changed-media-query', note: 'the tablet query upper bound moves to 1100px', expect: /^responsive geometry: --shell-sidebar-w is not re-assigned inside/, mutate: { bridge: (s) => swap(s, /\(max-width: 1023px\)\s*\{\s*:root\s*\{\s*--shell-sidebar-w/, '(max-width: 1100px) { :root { --shell-sidebar-w', 'tablet query') } },
  { id: 'changed-media-value', note: 'the mobile --shell-header-h drops to 60px', expect: /^responsive geometry: --shell-header-h inside @media \(max-width: 767px\) resolves to 60px/, mutate: { bridge: (s) => swap(s, /(--shell-header-h:\s*)56px(\s*;\s*\}\s*\})/, '$160px$2', 'mobile header override') } },
  { id: 'tablet-alias-drift', note: '--shell-sidebar-w-tablet (the var the tablet override resolves through) changes', expect: /^geometry: --shell-sidebar-w-tablet differs/, mutate: { bridge: (s) => swap(s, /(--shell-sidebar-w-tablet:\s*)240px/, '$1220px', 'tablet alias') } },
  { id: 'scoped-root-token', note: 'a media-scoped :root in the bridge re-declares --bg', expect: /^single source: client\/src\/styles\/app-bridge\.css @media \(max-width: 600px\) \{ :root \} \{ --bg: #111111 \} redefines/, mutate: { bridge: (s) => `${s}\n@media (max-width: 600px) { :root { --bg: #111111; } }\n` } },
  { id: 'supports-scoped-token', note: 'an @supports-scoped :root in the bridge re-declares --surface', expect: /^single source: client\/src\/styles\/app-bridge\.css @supports .+ \{ :root \} \{ --surface: red \} redefines/, mutate: { bridge: (s) => `${s}\n@supports (color: color-mix(in srgb, red, blue)) { :root { --surface: red; } }\n` } },
  { id: 'html-selector-token', note: 'html { --text } re-declares a tracked token', expect: /^single source: client\/src\/styles\/app-bridge\.css html \{ --text/, mutate: { bridge: (s) => `${s}\nhtml { --text: #ffffff; }\n` } },
  { id: 'universal-token', note: '* { --bg } re-declares a tracked token on every element', expect: /^single source: client\/src\/styles\/app-bridge\.css \* \{ --bg/, mutate: { bridge: (s) => `${s}\n* { --bg: #111111; }\n` } },
  { id: 'component-token', note: '.page { --radius } re-declares a tracked token for a subtree', expect: /^single source: client\/src\/styles\/app-bridge\.css \.page \{ --radius/, mutate: { bridge: (s) => `${s}\n.page { --radius: 4px; }\n` } },
  { id: 'compound-layer', note: ':root[data-system][data-accent] compound declares --bg', expect: /^single source: client\/src\/styles\/app-bridge\.css :root\[data-system="geist"\]\[data-accent="cyan"\] \{ --bg/, mutate: { bridge: (s) => `${s}\n:root[data-system="geist"][data-accent="cyan"] { --bg: #000001; }\n` } },
  { id: 'accent-block-token', note: 'a bridge accent block re-declares --surface', expect: /^single source: client\/src\/styles\/app-bridge\.css :root\[data-accent="cyan"\] \{ --surface: red \} redefines/, mutate: { bridge: (s) => `${s}\n:root[data-accent="cyan"] { --surface: red; }\n` } },
  { id: 'sibling-root-token', note: 'another client stylesheet declares --bg on :root', expect: /^single source: client\/src\/styles\/canary\.css :root \{ --bg/, mutate: { siblings: (list) => [...list, { file: 'client/src/styles/canary.css', css: ':root { --bg: #111111; }' }] } },
  { id: 'sibling-important-root-resolves', note: 'a sibling :root !important --bg also changes what every system RESOLVES (rule 3, not only rule 10)', expect: /^editorial: --bg differs — design .+ vs runtime #000001 !important/, mutate: { siblings: (list) => [...list, { file: 'client/src/styles/canary.css', css: ':root { --bg: #000001 !important; }' }] } },
  { id: 'index-html-early-root-loses', note: 'client/index.html <style> :root --bg (first in document order) loses to design-system.css — rule 10 still flags it, rule 3 must not', expect: /^single source: client\/index\.html :root \{ --bg/, reject: /^editorial: --bg differs/, reject: /^(pre-apply|editorial): --bg differs/, mutate: { siblings: (list) => [...list, { file: 'client/index.html', css: ':root { --bg: #000001; }', order: -1 }] } },
  { id: 'sibling-scoped-token', note: 'another client stylesheet re-declares --text under print', expect: /^single source: client\/src\/index\.css @media print \{ :root \} \{ --text/, mutate: { siblings: (list) => [...list, { file: 'client/src/index.css', css: '@media print { :root { --text: #000; } }' }] } },
  // --- the original value / structure cases ----------------------------------
  { id: 'value-drift', note: 'the served registry\'s geist --surface alpha changes', expect: /^geist: --surface differs — design rgba\(255,255,255,0\.04\) vs runtime rgba\(255,255,255,0\.05\)/, also: [/^served registry: /], mutate: { appJs: (s) => swap(s, /('--surface':\s*'rgba\(255,255,255,)0\.04\)'/, "$10.05)'", 'geist --surface') } },
  { id: 'root-value-drift', note: 'served :root --radius 12px -> 10px (the pre-apply paint; every system restates it inline)', expect: /^pre-apply: --radius differs — design 12px vs runtime 10px/, also: [/^served sheet: /], mutate: { appCss: (s) => swap(s, /(\n\s*--radius:\s*)12px/, '$110px', 'root --radius') } },
  { id: 'missing-token', note: 'served :root --hairline removed', expect: /^pre-apply: design token --hairline .* is absent from the runtime cascade/, mutate: { appCss: (s) => swap(s, /\n\s*--hairline:[^;]*;/, '\n', 'root --hairline') } },
  { id: 'bogus-accent', note: 'the served ACCENTS gains an accent the design lacks', expect: /^the served ACCENTS offers "mint" but the design ships no such accent/, mutate: { appJs: (s) => swap(s, /(window\.ACCENTS = \[\n)/, "$1  { id: 'mint', name: 'Mint', primary: '#00ffaa', secondary: '#00ddaa' },\n", 'ACCENTS') } },
  { id: 'accent-pair-drift', note: 'the served crimson --accent-2 changes', expect: /^accent:crimson: --accent-2 differs/, mutate: { appJs: (s) => swap(s, /(id: 'crimson',[^\n]*secondary: ')#b84dff'/, "$1#b84dfe'", 'crimson secondary') } },
  { id: 'registry-default-accent', note: 'served SYSTEM_DEFAULT_ACCENT geist cyan -> matrix', expect: /^registry: default accent for "geist" is matrix/, mutate: { appJs: (s) => swap(s, /(\n\s*geist:\s*')cyan'/, "$1matrix'", 'SYSTEM_DEFAULT_ACCENT geist') } },
  { id: 'registry-boot-default', note: 'design-system.ts DEFAULT_SYSTEM editorial -> swiss', expect: /^registry: boot default is swiss\/crimson/, mutate: { appRegistry: (s) => swap(s, /(export const DEFAULT_SYSTEM\b[^=]*=\s*")editorial"/, '$1swiss"', 'DEFAULT_SYSTEM') } },
  { id: 'geometry-drift', note: '--content-max 1240px -> 1280px', expect: /^geometry: --content-max differs in editorial — design 1240px vs runtime 1280px/, mutate: { bridge: (s) => swap(s, /(--content-max:\s*)1240px/, '$11280px', '--content-max') } },
  { id: 'geometry-missing', note: '--footer-pad removed', expect: /^geometry: --footer-pad .* is not declared in the runtime's :root/, mutate: { bridge: (s) => swap(s, /\n\s*--footer-pad:[^;]*;/, '\n', '--footer-pad') } },
  { id: 'grain-asset-drift', note: '.grain background-image swapped to a different data URI', expect: /^utility \.grain: background-image differs/, mutate: { appCss: (s) => swap(s, /(\.grain\s*\{[\s\S]*?background-image:\s*url\(["']?data:image\/svg\+xml;)utf8,/, '$1charset=utf-8,', '.grain asset') } },
  { id: 'utility-drift', note: '.chip font-size 10.5px -> 12px in place', expect: /^utility \.chip: font-size differs — design 10\.5px vs runtime 12px/, mutate: { appCss: (s) => swap(s, /(\n\.chip\s*\{[\s\S]*?font-size:\s*)10\.5px/, '$112px', '.chip font-size') } },
  { id: 'utility-missing', note: '.hide-tablet rule removed', expect: /^utility @media \(max-width: 1024px\)\|\|\.hide-tablet: rule is missing/, mutate: { appCss: (s) => swap(s, /\.hide-tablet\s*\{[^}]*\}/, '', '.hide-tablet') } },
  { id: 'body-height-deviation-stale', note: 'runtime body takes the design height 100% (entry becomes stale)', expect: /^deviation rule:body:height is stale/, mutate: { bridge: (s) => `${s}\nbody { height: 100%; }\n` } },
  { id: 'body-height-deviation-no-longer-holds', note: 'bridge body height auto -> 50% (the uncapped body the reason cites is gone)', expect: /^deviation rule:body:height no longer holds \(canonical 100% vs runtime 50%\)/, mutate: { bridge: (s) => swap(s, /(\nbody\s*\{\s*height:\s*)auto/, '$150%', 'body height') } },
  { id: 'html-height-drift', note: 'the bridge sets html height 100vh', expect: /^base box html: height differs — design 100% vs runtime 100vh/, mutate: { bridge: (s) => `${s}\nhtml { height: 100vh; }\n` } },
  { id: 'canonical-moves', note: 'canonical editorial --bg-2 changed (runtime now behind)', expect: /^editorial: --bg-2 differs/, mutate: { canonicalJs: (s) => swap(s, /('--bg-2':\s*')#070706'/, "$1#070707'", 'editorial --bg-2') } },
  { id: 'canonical-shape', note: 'the design itself declares a token outside :root', expect: /^canonical shape changed: client\/public\/ds\/design-system\.css \.sidebar declares --bg/, mutate: { canonicalCss: (s) => `${s}\n.sidebar { --bg: red; }\n` } },
  // --- rule 0 / 5 / 12: the served pair, the wrapper, the boot, the <head> ---
  { id: 'served-byte-drift', note: 'one byte of the served sheet changes (a comment) — nothing paints differently, but it is no longer the verbatim fetch', expect: /^served sheet: client\/public\/ds\/design-system\.css is not byte-identical to the canonical/, mutate: { appCss: (s) => swap(s, 'Per-system component skins', 'Per-system component skinz', 'served sheet comment') } },
  { id: 'bridge-geometry-elsewhere', note: 'another client stylesheet declares shell geometry', expect: /^single source: client\/src\/styles\/canary\.css :root \{ --content-max: 1240px \} declares shell geometry outside the top-level :root of client\/src\/styles\/app-bridge\.css/, mutate: { siblings: (list) => [...list, { file: 'client/src/styles/canary.css', css: ':root { --content-max: 1240px; }' }] } },
  { id: 'registry-restates-table', note: 'design-system.ts exports its own ACCENTS again', expect: /^registry: client\/src\/lib\/design-system\.ts restates ACCENTS/, mutate: { appRegistry: (s) => `${s}\nexport const ACCENTS = [];\n` } },
  { id: 'registry-stops-reading-globals', note: 'design-system.ts reads a renamed global instead of window.ACCENTS', expect: /^registry: client\/src\/lib\/design-system\.ts never reads window\.ACCENTS/, mutate: { appRegistry: (s) => swap(s, /window\.ACCENTS\b/g, 'window.ACCENT_LIST', 'window.ACCENTS reads') } },
  { id: 'boot-storage-key-renamed', note: 'the pre-paint boot reads the saved system from another key', expect: /^boot: client\/index\.html uses system storage key "ds-sys" but client\/src\/lib\/design-system\.ts uses "ds-system"/, mutate: { files: { 'client/index.html': (s) => swap(s, /(\bsys\s*=\s*localStorage\.getItem\()[^)]*\)/, "$1'ds-sys')", 'boot system key') } } },
  { id: 'boot-fallback-renamed', note: 'the pre-paint boot falls back to another system', expect: /^boot: client\/index\.html uses fallback system "swiss" but client\/src\/lib\/design-system\.ts uses "editorial"/, mutate: { files: { 'client/index.html': (s) => swap(s, /(hasOwnProperty\.call\(\s*window\.DESIGN_SYSTEMS\s*,\s*sys\s*\)\s*\)\s*sys\s*=\s*)[^;]+;/, "$1'swiss';", 'boot fallback') } } },
  { id: 'boot-marker-not-injected', note: 'vite.config.ts stops serializing THEME_BOOT_DATA into the boot marker', expect: /^boot: client\/index\.html reads its system storage key from .+ but vite\.config\.ts does not inject/, mutate: { viteConfig: (s) => swap(s, /JSON\.stringify\(THEME_BOOT_DATA\)/, 'JSON.stringify({})', 'vite THEME_BOOT_DATA serialization') } },
  { id: 'main-link-removed', note: 'index.html stops linking the canonical sheet — rule 12', expect: /^document: client\/index\.html has no <link rel="stylesheet" href="\/ds\/design-system\.css">/, mutate: { files: { 'client/index.html': (s) => swap(s, /<link\b[^>]*href="\/ds\/design-system\.css"[^>]*>/, '', 'canonical <link>') } } },
  { id: 'main-link-media', note: 'the canonical <link> gains a media query', expect: /^document: the \/ds\/design-system\.css <link> in client\/index\.html carries media="\(min-width: 1200px\)"/, mutate: { files: { 'client/index.html': (s) => swap(s, /(<link\b[^>]*href="\/ds\/design-system\.css")/, '$1 media="(min-width: 1200px)"', 'canonical <link>') } } },
  { id: 'ds-script-deferred', note: 'the registry script is deferred — the boot would call an applier that does not exist yet', expect: /^document: <script src="\/ds\/design-system\.js"> in client\/index\.html is defer/, mutate: { files: { 'client/index.html': (s) => swap(s, /<script src="\/ds\/design-system\.js">/, '<script defer src="/ds/design-system.js">', 'registry <script>') } } },
  { id: 'ds-script-after-boot', note: 'the registry script moves below the pre-paint boot', expect: /^document: <script src="\/ds\/design-system\.js"> comes after the pre-paint boot/, mutate: { files: { 'client/index.html': (s) => { const tag = '<script src="/ds/design-system.js"></script>'; return swap(s, tag, '', 'registry <script>').replace('</head>', `${tag}\n</head>`); } } } },
];

/**
 * Run every canary against in-memory mutations of the given inputs.
 * @returns {{ ok: boolean, rows: {id, note, expect, verdict, matched, ok, firstFailure}[] }}
 */
function appModelInputs(inputs) {
  return {
    css: inputs.appCss, js: inputs.appJs, registry: inputs.appRegistry, indexHtml: inputs.indexHtml, viteConfig: inputs.viteConfig,
    siblings: inputs.siblings, mainOrder: inputs.mainOrder ?? 1, mainLayer: inputs.mainLayer ?? null, reach: inputs.reach ?? null,
  };
}

// `bridge` rewrites client/src/styles/app-bridge.css where the document
// places it (the sibling the walk collected), so a canary exercises the file
// app-only rules actually live in.
function mutateBridge(siblings, fn) {
  const index = siblings.findIndex((s) => s.file === DEFAULT_PATHS.appBridge);
  if (index === -1) throw new Error(`canary anchor missing: ${DEFAULT_PATHS.appBridge} is not in the document`);
  return siblings.map((s, i) => (i === index ? { ...s, css: fn(s.css) } : s));
}

export function runCanaries(inputs, deviations = DOCUMENTED_DEVIATIONS) {
  const rows = [];
  // Canaries prove what a mutation ADDS: failures the live inputs already
  // carry (reported by the gate itself) are subtracted, so a live finding
  // neither masks nor fakes a canary's verdict.
  let baseline = new Set();
  try {
    const canonical = buildCanonicalModel({ css: inputs.canonicalCss, js: inputs.canonicalJs, appJsx: inputs.canonicalApp, layoutJsx: inputs.canonicalLayout });
    baseline = new Set(compareModels(canonical, buildAppModel(appModelInputs(inputs)), deviations).failures);
  } catch { /* the control canary reports the error */ }
  for (const canary of CANARIES) {
    const mutated = { ...inputs, siblings: [...(inputs.siblings ?? [])] };
    let result;
    let error = null;
    try {
      // `files` rewrites the document itself (index.css, added sheets): the
      // walk is redone over the overlay and every document-derived input
      // (siblings, main position/layer, reach) recomputed BEFORE the other
      // mutations apply on top.
      const { files, ...rest } = canary.mutate ?? {};
      if (files) Object.assign(mutated, documentInputs({ files: overlayFiles(files), appCss: mutated.appCss }));
      for (const [key, fn] of Object.entries(rest)) {
        if (key === 'bridge') mutated.siblings = mutateBridge(mutated.siblings, fn);
        else mutated[key] = fn(mutated[key]);
      }
      const canonical = buildCanonicalModel({ css: mutated.canonicalCss, js: mutated.canonicalJs, appJsx: mutated.canonicalApp, layoutJsx: mutated.canonicalLayout });
      const app = buildAppModel(appModelInputs(mutated));
      result = compareModels(canonical, app, deviations);
      const added = result.failures.filter((f) => !baseline.has(f));
      result = { ...result, failures: added, ok: added.length === 0 };
    } catch (err) {
      error = err;
    }
    const verdict = error ? 'ERROR' : result.ok ? 'PASS' : 'FAIL';
    const expectPass = canary.expect === 'PASS';
    // `expect` names the rule the canary must trip (or PASS); `also` lists
    // further rules that must trip alongside it; `reject` a rule that must NOT.
    const matched = error ? null : expectPass ? result.ok : result.failures.some((f) => canary.expect.test(f));
    const missingAlso = error ? null : (canary.also ?? []).find((re) => !result.failures.some((f) => re.test(f)));
    const rejected = !error && canary.reject ? result.failures.find((f) => canary.reject.test(f)) : undefined;
    const ok = !error && !rejected && !missingAlso && (expectPass ? result.ok : (!result.ok && matched));
    rows.push({
      id: canary.id,
      note: canary.note,
      expect: expectPass ? 'PASS' : `FAIL ${canary.expect}`,
      verdict,
      matched,
      ok,
      failures: error ? [] : result.failures,
      firstFailure: error ? error.message : rejected ? `unexpected: ${rejected}` : missingAlso ? `missing: ${missingAlso}` : (result.failures.find((f) => !expectPass && canary.expect.test(f)) ?? result.failures[0] ?? ''),
    });
  }
  return { ok: rows.every((r) => r.ok), rows };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

function serialise(map) {
  return Object.fromEntries([...map].map(([k, v]) => [k, v instanceof Map ? serialise(v) : v]));
}

function listCssFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listCssFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.css')) out.push(full);
  }
  return out;
}

/**
 * A read-only view of the repository with an in-memory overlay (relative or
 * absolute path → source text, `null` = deleted), so the canaries and the
 * mutation probes can rewrite index.css or add sheets without touching the
 * tree. Everything that reads a stylesheet for the document walk goes
 * through this.
 */
export function virtualFiles(files = {}) {
  const overlay = new Map();
  for (const [key, value] of files instanceof Map ? files : Object.entries(files)) overlay.set(path.resolve(ROOT, key), value);
  const isFile = (file) => (overlay.has(file) ? overlay.get(file) != null : fs.existsSync(file) && fs.statSync(file).isFile());
  const read = (file) => (overlay.has(file) ? overlay.get(file) : fs.readFileSync(file, 'utf8'));
  const listCss = (dir) => {
    const out = new Set(fs.existsSync(dir) ? listCssFiles(dir) : []);
    for (const [file, value] of overlay) {
      if (!file.startsWith(`${dir}${path.sep}`) || !file.endsWith('.css')) continue;
      if (value == null) out.delete(file);
      else out.add(file);
    }
    return [...out];
  };
  return { overlay, isFile, read, listCss };
}

/**
 * Resolve an @import specifier the way Vite does for CSS: `./x.css` relative
 * to the importer, `/x.css` from the Vite root (client/), a bare specifier
 * (`tailwindcss`, `pkg/file.css`) through the nearest node_modules — a file,
 * a directory's package.json `style` (or exports["."].style), or its
 * index.css. Remote and data URLs, and anything unresolvable, yield null.
 * Relative results are not checked for existence — the caller decides what a
 * missing file means.
 */
export function resolveImport(fromFile, spec) {
  const clean = spec.replace(/[?#].*$/, '');
  if (!clean || /^(https?:|data:|\/\/)/.test(clean)) return null;
  if (clean.startsWith('/')) {
    // Vite serves a root-relative URL from its root, then from publicDir.
    const fromRoot = path.join(ROOT, DEFAULT_PATHS.viteRoot, clean);
    const fromPublic = path.join(ROOT, DEFAULT_PATHS.vitePublic, clean);
    return !fs.existsSync(fromRoot) && fs.existsSync(fromPublic) ? fromPublic : fromRoot;
  }
  if (/^\./.test(clean) || clean.startsWith('~')) return path.resolve(path.dirname(fromFile), clean.replace(/^~/, ''));
  for (let dir = path.dirname(fromFile); ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', clean);
    if (fs.existsSync(candidate)) {
      if (fs.statSync(candidate).isFile()) return candidate;
      const pkgPath = path.join(candidate, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const style = pkg.style ?? pkg.exports?.['.']?.style;
        if (style && fs.existsSync(path.join(candidate, style))) return path.join(candidate, style);
      }
      if (fs.existsSync(path.join(candidate, 'index.css'))) return path.join(candidate, 'index.css');
    } else if (fs.existsSync(`${candidate}.css`)) return `${candidate}.css`;
    if (dir === path.dirname(dir) || dir.length <= ROOT.length) break;
  }
  return null;
}

/**
 * How the document loads its stylesheets: client/index.html's <style> is
 * position [0], the entry sheet [1], and every sheet an @import reaches is
 * spliced in at its import's position — [...importerPosition, importSeq] —
 * so an importer's `@layer early;` written above its imports ranks before the
 * imported sheets and its rules below them rank after. Relative,
 * root-relative and bare package imports are followed alike (so
 * "tailwindcss" — which declares the `theme, base, components, utilities`
 * layer order — sits where it is inlined).
 *
 * This is the served document's shape, not raw css-syntax: index.css is a
 * Tailwind root, and the Tailwind compiler (@tailwindcss/vite → tailwindcss
 * compile, dev and build alike) inlines EVERY @import of the graph where it
 * sits — one that follows another rule, one nested inside a block (wrapped in
 * the enclosing at-rule), one with a media list / supports() / layer()
 * (wrapped in `@media` / `@supports` / `@layer`), and each copy of a sheet
 * imported twice. So every import is followed; the misplaced ones are ALSO
 * reported in `misplaced` (rule 13: css-syntax, postcss-import and a browser
 * given the raw sheet drop them, so their meaning depends on the pipeline)
 * and a second import of a sheet already loaded is reported in `duplicates`
 * (its first copy is the one modelled). A cycle stops at the sheet already
 * being loaded. `layers` records the cascade layer each sheet was imported
 * into (composed through nested imports, anonymous import layers qualified by
 * importer), `contexts` the condition it was imported under (its import's
 * media/supports() list and the at-rules enclosing the import, composed the
 * same way).
 *
 * @param {object} [options]
 * @param {string} [options.entryCss]
 * @param {string} [options.indexHtmlPath]
 * @param {object|Map} [options.files] overlay for virtualFiles()
 * @param {ReturnType<typeof virtualFiles>} [options.vfs]
 * @returns {{ order: Map<string, number[]>, layers: Map<string, string|null>, contexts: Map<string, string>,
 *   importers: Map<string, {file: string, spec: string}|null>, misplaced: object[], unresolved: object[],
 *   duplicates: object[], entry: string, vfs: object }} keyed by absolute path
 */
export function documentOrder({ entryCss = DEFAULT_PATHS.appEntryCss, indexHtmlPath = DEFAULT_PATHS.appIndexHtml, appCssPath = DEFAULT_PATHS.appCss, files = null, vfs = virtualFiles(files ?? {}) } = {}) {
  const order = new Map();
  const layers = new Map();
  const contexts = new Map();
  const importers = new Map();
  const misplaced = [];
  const unresolved = [];
  const duplicates = [];
  const indexHtml = path.resolve(ROOT, indexHtmlPath);
  order.set(indexHtml, [0]);
  layers.set(indexHtml, null);
  contexts.set(indexHtml, '');
  const visiting = new Set();
  const rel = (file) => path.relative(ROOT, file);
  const visit = (file, position, layer, context) => {
    order.set(file, position);
    layers.set(file, layer);
    contexts.set(file, context);
    visiting.add(file);
    const importer = rel(file);
    for (const statement of parseStylesheet(vfs.read(file)).statements) {
      if (statement.kind !== 'import') continue;
      const resolved = resolveImport(file, statement.spec);
      const target = resolved ? rel(resolved) : null;
      if (!statement.valid) misplaced.push({ file: importer, spec: statement.spec, reason: statement.reason, resolved: target });
      if (!resolved || !vfs.isFile(resolved)) {
        unresolved.push({ file: importer, spec: statement.spec, resolved: target });
        continue;
      }
      if (visiting.has(resolved)) continue;
      if (order.has(resolved)) {
        duplicates.push({ file: target, importer, spec: statement.spec, loadedVia: importers.get(resolved)?.file ?? null });
        continue;
      }
      importers.set(resolved, { file: importer, spec: statement.spec });
      const own = statement.layer == null ? null : qualifyLayer(statement.layer, importer);
      visit(resolved, [...position, statement.seq], joinLayer(layer, own), [context, statement.enclosing, statement.conditions].filter(Boolean).join(' '));
    }
    visiting.delete(file);
  };
  // The canonical sheet is <link>ed by index.html ahead of the app bundle:
  // index.html <style> above the link [0], the main sheet [1], <style> below
  // it [2], then the entry sheet's graph [3, …] (Vite injects the bundle's CSS
  // after the head). An @import of the main sheet anywhere in the graph is a
  // second load and reported as a duplicate.
  const main = path.resolve(ROOT, appCssPath);
  const html = vfs.isFile(indexHtml) ? vfs.read(indexHtml) : '';
  const load = parseDsLoad(html);
  if (load.css && vfs.isFile(main) && resolveImport(indexHtml, CSS_HREF) === main) {
    order.set(main, [1]);
    layers.set(main, null);
    contexts.set(main, load.css.media && !/^\s*(all|screen)?\s*$/i.test(load.css.media) ? `@media ${load.css.media}` : '');
    importers.set(main, { file: rel(indexHtml), spec: CSS_HREF });
  }
  const entry = path.resolve(ROOT, entryCss);
  if (vfs.isFile(entry)) {
    importers.set(entry, null);
    visit(entry, [3], null, '');
  }
  return { order, layers, contexts, importers, misplaced, unresolved, duplicates, entry: rel(entry), load, html, vfs };
}

/**
 * Every stylesheet that reaches the document besides the main one — every
 * sheet the document walk reaches (including package sheets such as
 * tailwindcss and the main sheet's own imports), plus every client/src/**\/*.css
 * (a component-imported sheet Vite injects on demand, modelled as a late
 * sheet), plus client/index.html <style> — each with its document position,
 * import layer and import condition (see documentOrder).
 */
export function collectSiblingStylesheets({ appCssPath = DEFAULT_PATHS.appCss, roots = DEFAULT_PATHS.appCssRoots, indexHtmlPath = DEFAULT_PATHS.appIndexHtml, document = documentOrder({ indexHtmlPath }) }) {
  const { order, layers, contexts, vfs } = document;
  const main = path.resolve(ROOT, appCssPath);
  const indexHtml = path.resolve(ROOT, indexHtmlPath);
  const files = new Set();
  for (const root of roots) for (const file of vfs.listCss(path.resolve(ROOT, root))) files.add(path.resolve(file));
  for (const file of order.keys()) if (file.endsWith('.css')) files.add(file);
  files.delete(main);
  files.delete(indexHtml);
  const siblings = [...files].sort().map((file) => ({
    file: path.relative(ROOT, file), css: vfs.read(file), order: order.get(file) ?? LATE_SHEET, layer: layers.get(file) ?? null, context: contexts.get(file) ?? '',
  }));
  if (vfs.isFile(indexHtml)) {
    const html = vfs.read(indexHtml);
    const linkAt = parseDsLoad(html).css?.index ?? Infinity;
    const blocks = inlineStyleBlocksAt(html);
    for (const [css, position] of [
      [blocks.filter((b) => b.index < linkAt).map((b) => b.css), [0]],
      [blocks.filter((b) => b.index > linkAt).map((b) => b.css), [2]],
    ]) {
      if (css.length) siblings.push({ file: path.relative(ROOT, indexHtml), css: css.join('\n'), order: position, layer: null, context: '' });
    }
  }
  return siblings;
}

/**
 * Everything buildAppModel needs to know about the document, derived from the
 * repository plus an overlay: the sibling sheets, the main sheet's position
 * and import layer, and `reach` — whether (and how) the main sheet loads and
 * which imports are dead. `appCss` is the main sheet's source when it is not
 * the file on disk (a canary mutation, a `--app-css` probe); it is placed in
 * the overlay so the walk follows ITS imports.
 */
export function documentInputs({ files = {}, appCss = null, appCssPath = DEFAULT_PATHS.appCss, roots = DEFAULT_PATHS.appCssRoots } = {}) {
  const overlay = new Map();
  for (const [key, value] of files instanceof Map ? files : Object.entries(files)) overlay.set(path.resolve(ROOT, key), value);
  const main = path.resolve(ROOT, appCssPath);
  if (appCss != null && !overlay.has(main)) overlay.set(main, appCss);
  const document = documentOrder({ appCssPath, vfs: virtualFiles(overlay) });
  return {
    siblings: collectSiblingStylesheets({ appCssPath, roots, document }),
    mainOrder: document.order.get(main) ?? 1,
    mainLayer: document.layers.get(main) ?? null,
    indexHtml: document.html,
    reach: {
      entry: document.entry,
      main: { reached: document.order.has(main), context: document.contexts.get(main) ?? '', importer: document.importers.get(main)?.file ?? null },
      misplaced: document.misplaced,
      unresolved: document.unresolved,
      duplicates: document.duplicates,
    },
    document,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const paths = {
    appCss: argValue('--app-css') ?? DEFAULT_PATHS.appCss,
    appJs: argValue('--app-js') ?? DEFAULT_PATHS.appJs,
    appBridge: argValue('--app-bridge') ?? DEFAULT_PATHS.appBridge,
    indexHtml: argValue('--index-html') ?? DEFAULT_PATHS.appIndexHtml,
    appRegistry: argValue('--app-registry') ?? DEFAULT_PATHS.appRegistry,
    viteConfig: argValue('--vite-config') ?? DEFAULT_PATHS.viteConfig,
    canonicalCss: argValue('--canonical-css') ?? DEFAULT_PATHS.canonicalCss,
    canonicalJs: argValue('--canonical-js') ?? DEFAULT_PATHS.canonicalJs,
    canonicalApp: argValue('--canonical-app') ?? DEFAULT_PATHS.canonicalApp,
    canonicalLayout: argValue('--canonical-layout') ?? DEFAULT_PATHS.canonicalLayout,
  };
  const abs = (p) => (path.isAbsolute(p) ? p : path.join(ROOT, p));
  const read = (p) => fs.readFileSync(abs(p), 'utf8');
  const inputs = {
    appCss: read(paths.appCss),
    appJs: read(paths.appJs),
    appRegistry: read(paths.appRegistry),
    viteConfig: read(paths.viteConfig),
    canonicalCss: read(paths.canonicalCss),
    canonicalJs: read(paths.canonicalJs),
    canonicalApp: read(paths.canonicalApp),
    canonicalLayout: read(paths.canonicalLayout),
  };
  // The document walk reads the main sheet, the bridge and index.html from
  // the same sources the model does (a --app-css / --app-bridge / --index-html
  // probe copy stands in for the file on disk through the overlay).
  const overlay = {};
  if (paths.appBridge !== DEFAULT_PATHS.appBridge) overlay[DEFAULT_PATHS.appBridge] = read(paths.appBridge);
  if (paths.indexHtml !== DEFAULT_PATHS.appIndexHtml) overlay[DEFAULT_PATHS.appIndexHtml] = read(paths.indexHtml);
  Object.assign(inputs, documentInputs({ files: overlay, appCss: inputs.appCss }));

  // Rule 0 — pins: every file the gate treats as the canonical pair (the
  // served copies and the canonical inputs) must carry the fetched digests,
  // and the newest design-system fetch on disk, if any, must still match them.
  const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
  const pinFailures = [];
  const pinned = [
    [paths.appCss, inputs.appCss, CANONICAL_PINS[0]],
    [paths.appJs, inputs.appJs, CANONICAL_PINS[1]],
    [paths.canonicalCss, inputs.canonicalCss, CANONICAL_PINS[0]],
    [paths.canonicalJs, inputs.canonicalJs, CANONICAL_PINS[1]],
  ];
  const seenPinned = new Set();
  for (const [file, text, pin] of pinned) {
    if (seenPinned.has(abs(file))) continue;
    seenPinned.add(abs(file));
    const digest = sha256(text);
    if (digest !== pin.sha256) pinFailures.push(`pin: ${file} sha256 ${digest.slice(0, 12)}… is not the canonical ${pin.fetched} from ${CANONICAL_FETCH.pinned} (${pin.sha256.slice(0, 12)}…) — the served design system must be the verbatim fetch; re-copy it, never edit it`);
  }
  const fetchRoot = path.join(ROOT, CANONICAL_FETCH.dir);
  const fetches = fs.existsSync(fetchRoot) ? fs.readdirSync(fetchRoot).filter((d) => d.startsWith(CANONICAL_FETCH.prefix)).sort() : [];
  const latestFetch = fetches.at(-1) ?? null;
  if (latestFetch) {
    for (const pin of CANONICAL_PINS) {
      const fetched = path.join(fetchRoot, latestFetch, pin.fetched);
      if (!fs.existsSync(fetched)) {
        pinFailures.push(`pin: the latest fetch ${CANONICAL_FETCH.dir}/${latestFetch} has no ${pin.fetched} — cannot cross-check ${pin.file}`);
        continue;
      }
      const digest = sha256(fs.readFileSync(fetched));
      if (digest !== pin.sha256) pinFailures.push(`pin: ${CANONICAL_FETCH.dir}/${latestFetch}/${pin.fetched} (${digest.slice(0, 12)}…) differs from the pinned ${CANONICAL_FETCH.pinned} ${pin.fetched} — a newer design fetch exists: adopt it verbatim into ${pin.file} and re-pin, or remove the stale fetch`);
    }
  }
  const servedBase = argValue('--served');
  let servedNote = null;
  if (servedBase) {
    for (const pin of CANONICAL_PINS) {
      const url = new URL(pin.href, servedBase).href;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) { pinFailures.push(`served: ${url} answered HTTP ${res.status}`); continue; }
        const digest = sha256(Buffer.from(await res.arrayBuffer()));
        if (digest !== pin.sha256) pinFailures.push(`served: ${url} sha256 ${digest.slice(0, 12)}… is not the pinned canonical ${pin.fetched} (${pin.sha256.slice(0, 12)}…)`);
      } catch (err) {
        servedNote = `served: ${servedBase} unreachable (${err.cause?.code ?? err.name}) — served-bytes check skipped`;
        break;
      }
    }
  }

  // The canaries self-test the parser against the LIVE inputs. When a caller
  // points the gate at mutated copies (--app-css …) the control canary would
  // rightly fail, so probing runs skip them unless asked for explicitly.
  const probing = Object.keys(paths).some((key) => argValue(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`) != null);
  const canariesOnly = process.argv.includes('--canaries-only');
  const canaries = probing && !canariesOnly ? { ok: true, rows: [] } : runCanaries(inputs);
  const canaryFailures = canaries.rows.filter((r) => !r.ok);
  for (const row of canaryFailures) console.error(`FAIL canary ${row.id} (${row.note}): expected ${row.expect}, got ${row.verdict}${row.firstFailure ? ` — ${row.firstFailure}` : ''}`);
  if (canaryFailures.length) {
    console.error(`FAIL canaries :: ${canaryFailures.length}/${canaries.rows.length} mutation(s) escaped the gate — the parser has regressed`);
  } else if (canaries.rows.length) {
    console.log(`PASS canaries :: ${canaries.rows.length - 1} in-memory mutations of the live inputs each fail on the expected rule (control passes)`);
  } else {
    console.log('canaries skipped :: probing overridden inputs (pass --canaries-only to run them against these inputs)');
  }
  if (canariesOnly) process.exit(canaryFailures.length ? 1 : 0);

  const canonical = buildCanonicalModel({ css: inputs.canonicalCss, js: inputs.canonicalJs, appJsx: inputs.canonicalApp, layoutJsx: inputs.canonicalLayout });
  const app = buildAppModel(appModelInputs(inputs));
  const result = compareModels(canonical, app);
  try {
    const contrastRows = accentContrastTable();
    console.log(`PASS app-owned contrast deviations :: ${contrastRows.length} backing/tint rows across all 50 pairs`);
  } catch (error) {
    result.failures.push(`App accent accessibility: ${error.message}`);
  }
  result.failures.unshift(...pinFailures);
  if (canaryFailures.length) result.failures.unshift(`canaries: ${canaryFailures.map((r) => r.id).join(', ')} escaped — see above`);
  result.ok = result.failures.length === 0;

  const jsonDir = argValue('--json');
  if (jsonDir) {
    fs.mkdirSync(jsonDir, { recursive: true });
    fs.writeFileSync(path.join(jsonDir, 'canonical-tokens.json'), `${JSON.stringify({
      source: [paths.canonicalCss, paths.canonicalJs, paths.canonicalApp, paths.canonicalLayout],
      root: serialise(canonical.root),
      geometry: serialise(canonical.geometry),
      responsive: canonical.responsive.map(({ token, context, value, note }) => ({ token, context, value, note })),
      utilities: Object.fromEntries(UTILITY_RULES.map((k) => [k, canonical.rules.get(k) ? serialise(canonical.rules.get(k)) : null])),
      systems: serialise(canonical.systems),
      effective: serialise(canonical.effective),
      accents: serialise(canonical.accents),
      defaultAccents: serialise(canonical.defaultAccents),
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(jsonDir, 'app-tokens.json'), `${JSON.stringify({
      source: [paths.appCss, paths.appJs, paths.appRegistry, paths.indexHtml, ...inputs.siblings.map((s) => s.file)],
      cascade: result.cascade,
      root: serialise(app.root),
      systems: serialise(app.systems),
      effective: Object.fromEntries([...canonical.effective.keys()].map((id) => [id, serialise(appEffective(app, id))])),
      accents: serialise(app.accents),
      geometry: Object.fromEntries(GEOMETRY_TOKENS.map((t) => [t, app.root.get(t) ?? null])),
      scoped: app.scoped.map((r) => ({ context: r.context, selector: r.selector, props: serialise(r.props) })),
      elsewhere: app.elsewhere.map((r) => ({ selector: r.selector, props: serialise(r.props) })),
      siblingDeclarations: app.siblingDeclarations,
      utilities: Object.fromEntries(UTILITY_RULES.map((k) => [k, app.rules.get(k) ? serialise(app.rules.get(k)) : null])),
      registry: app.registry && {
        defaultSystem: app.registry.defaultSystem,
        defaultAccent: app.registry.defaultAccent,
        storageKeys: { system: app.registry.systemKey, accent: app.registry.accentKey },
        systemDefaultAccents: serialise(app.defaultAccents),
        accents: serialise(app.accents),
      },
      boot: app.boot && Object.fromEntries(['systemKey', 'accentKey', 'fallbackSystem'].map((k) => [k, app.boot[k]])),
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(jsonDir, 'token-diff.json'), `${JSON.stringify({ ...result, canaries: canaries.rows }, null, 2)}\n`);
  }

  const systemCount = canonical.effective.size;
  const compared = Object.values(result.perSystem).reduce((n, rows) => n + rows.filter((r) => r.canonical != null && r.app != null).length, 0);
  console.log(`canonical-token-parity: ${systemCount} systems, ${canonical.accents.size} accents, ${compared} shared token values compared`);
  console.log(`  canonical pair: ${CANONICAL_PINS.map((p) => `${p.file} sha256 ${p.sha256.slice(0, 12)}…`).join(', ')} (pinned from ${CANONICAL_FETCH.pinned}${latestFetch ? `; latest fetch on disk ${latestFetch}` : '; no fetch on disk to cross-check'})`);
  if (servedBase) console.log(`  ${servedNote ?? `served: ${CANONICAL_PINS.map((p) => new URL(p.href, servedBase).href).join(' and ')} carry the pinned bytes`}`);
  if (app.boot) console.log(`  boot: keys ${app.boot.systemKey.value}/${app.boot.accentKey.value}, fallback ${app.boot.fallbackSystem.value}${app.boot.markerVar ? ` (injected via ${THEME_BOOT_MARKER})` : ' (literal)'}; registry defaults ${app.registry?.defaultSystem}/${app.registry?.defaultAccent}`);
  const trackedInSiblings = result.elsewhere.filter((e) => e.file).length;
  console.log(`  cascade: ${result.cascade.rootBlocks} top-level :root block(s) merged, system blocks ${Object.entries(result.cascade.systemBlocks).map(([id, n]) => `${id}×${n}`).join(' ') || 'none (systems paint inline)'}, ${result.cascade.scopedDeclarations} scoped custom-property declaration(s), ${inputs.siblings.length} sibling stylesheet(s) scanned (${result.cascade.siblingDeclarations} custom-property declaration(s), ${trackedInSiblings} tracked)`);
  console.log(`  cascade layers (first appearance across ${app.sheets.length} sheets, browser order): ${result.cascade.layers.length ? `${result.cascade.layers.join(' < ')} < unlayered` : 'none — every rule is unlayered'}`);
  console.log(`  mismatches: ${result.mismatches.length}  missing-in-runtime: ${result.missing.length}  documented deviations honoured: ${result.honoured.length}  runtime-only tokens: ${result.appOnly.length}`);
  if (result.appOnly.length) console.log(`  runtime-only: ${result.appOnly.map((t) => t.token).join(', ')}`);
  console.log(`  shell geometry: ${result.geometry.filter((g) => g.status === 'match').length}/${result.geometry.length} tokens match the design sources`);
  console.log(`  responsive geometry: ${result.responsive.filter((r) => r.status === 'match').length}/${result.responsive.length} scoped re-assignments match (${result.responsive.map((r) => `${r.token} ${r.context} → ${r.app ?? 'missing'}`).join('; ')})`);
  console.log(`  accent combos: ${result.combos.filter((c) => c.status === 'match').length}/${result.combos.length} system × accent combinations resolve --accent/--accent-2 to the design's pair`);
  console.log(`  utility rules: ${result.utilities.filter((u) => u.status === 'match').length}/${UTILITY_RULES.length} rules verbatim (${result.utilities.reduce((n, u) => n + (u.declarations?.length ?? 0), 0)} declarations); cascade over ${inputs.siblings.length + 1} runtime sheets: ${result.utilities.reduce((n, u) => n + (u.shadows?.app.length ?? 0), 0)} non-canonical rule(s) win a compared property in the runtime, ${result.utilities.reduce((n, u) => n + (u.shadows?.canonical.length ?? 0), 0)} in the design`);
  for (const h of result.honoured) console.log(`  DEVIATION ${h.system}:${h.token} design ${h.canonical} → runtime ${h.app}`);
  if (result.ok) {
    console.log('PASS canonical-token-parity');
    process.exit(0);
  }
  for (const f of result.failures) console.error(`FAIL ${f}`);
  console.error(`FAIL canonical-token-parity (${result.failures.length} failure${result.failures.length === 1 ? '' : 's'})`);
  process.exit(1);
}
