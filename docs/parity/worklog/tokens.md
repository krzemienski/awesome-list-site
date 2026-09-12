# Worklog — tokens (canonical tokens and shell geometry)

Task: bring `client/src/styles/design-system.css` to parity with the design
source (`awesome-list-site-ds/styles.css` bare `:root` +
`design-systems.jsx` `DESIGN_SYSTEMS[id].vars` / `ACCENTS` /
`SYSTEM_DEFAULT_ACCENT`), add the shell geometry tokens, add the canonical
utility classes, and turn the comparison into a gate. Scope:
`client/src/styles/design-system.css`, `client/src/index.css` (import order
read, unchanged), `scripts/validation/canonical-token-parity.mjs` (new),
`package.json` (one script), `artifacts/awesome-video-design-system/tokens.json`
+ `DESIGN.md`, this worklog, `docs/parity/assumptions/tokens.md`,
`docs/parity/evidence/tokens/`. Out of scope and untouched: header/sidebar/
footer/page components, fonts, the parity harness, `client/index.html`
(the prepaint block already sets `data-system`/`data-accent` — see §6 below).

Evidence folder: `docs/parity/evidence/tokens/`. Reproduce the gate with
`npm run validate:canonical-token-parity` (add `--json <dir>` to dump the three
JSON models).

## 1. What was found (extraction and diff, before any change)

`canonical-token-parity.mjs --json /tmp/tokens-before` parsed both sides into
`/tmp/canonical-tokens.json` / `/tmp/app-tokens.json` and diffed them
(committed copies: `token-diff-before.json`, `canonical-tokens.json`,
`app-tokens-after.json`). The comparison is between **effective cascades** —
design = bare `:root` overlaid with each system's `vars` plus the accent pair;
runtime = the app's first `:root` overlaid with each `[data-system]` block plus
each `[data-accent]` block — not between raw blocks, because both sides put
different tokens in the root versus the per-system layer.

| count | value |
|---|---|
| design root tokens | 35 |
| design per-system vars | 32 (editorial, terminal, geist, brutalist), 33 (swiss) |
| accents (both sides) | 10, all primary/secondary pairs equal |
| shared token values compared (5 systems) | 165 |
| mismatching values before this task | **5** — `--text-3` in every system (design 0.36–0.40 alpha, runtime 0.52) |
| design tokens missing from the runtime | 0 |
| runtime-only tokens | 5 — `--radius-xs`, `--motion-fast/base/slow/ease` |
| registry defaults (`THEME_FALLBACK_REGISTRY`) vs `SYSTEM_DEFAULT_ACCENT` + boot default | equal (editorial/crimson; per-system default accents equal) |
| shell geometry tokens in the runtime | 0 of the 9 the brief names (two zero-consumer aliases `--shell-sidebar-width` 280px / `--shell-header-height` 60px and `--shell-footer-measure` 1240px existed) |
| canonical utility selectors | 26 exist on both sides; `.chip` had drifted (12px vs 10.5px), `.kbd` had drifted (12px vs 10.5px), `.hide-tablet`/`.show-tablet` were absent, the `.grain` asset was the same SVG but utf8-encoded instead of the canonical base64 data URL; `.stat`/`.section-title` exist on neither side |

So the colour/radius/shadow/spacing values were **already at parity** except
`--text-3`, which is kept on purpose (assumptions §1). The task's substance is
therefore the gate, the geometry tokens, the utilities, and the evidence.

## 2. What was changed and why

`client/src/styles/design-system.css` (declaration-level diff against the
previous commit is exactly this list; nothing else moved):

| change | old | new | why |
|---|---|---|---|
| `--shell-sidebar-w` | — | 280px (240px at 768–1023px via the tail media query) | design `.sidebar` width / tablet override |
| `--shell-sidebar-w-tablet` | — | 240px | design `@media (max-width:1024px) .sidebar` |
| `--shell-rail-w` | — | 56px | design `.icon-rail` |
| `--shell-header-h` | — | 60px (56px below 768px) | design `.header` height / mobile override |
| `--page-pad-y` / `--page-pad-x` | — | 48px / 40px | `app.jsx` page `padding: '48px 40px'` |
| `--content-max` / `--content-max-admin` | — | 1240px / 1400px | `app.jsx` `maxWidth: page.kind === 'admin' ? 1400 : 1240` |
| `--footer-pad` | — | 48px 40px 32px | `layout.jsx` footer padding |
| `--shell-footer-measure` | 1240px | `var(--content-max)` | keep the one consumer (`.site-footer-inner`) on the single source; resolved value unchanged |
| `--shell-sidebar-width`, `--shell-header-height` | 280px, 60px | removed | zero consumers; replaced by the canonical names |
| `.chip` font-size | 12px | 10.5px | canonical; no raw `.chip` in TSX (Badge uses `data-ds="chip"`) |
| `.grain` background-image | utf8 SVG data URL | canonical base64 data URL | byte-identical asset so the harness can suppress or compare it identically |
| `.hide-tablet` / `.show-tablet` | — | verbatim canonical (`max-width:1024px` / `min-width:1025px`) | listed canonical utilities |
| file header comment | — | describes the parity contract and where the gate lives | orientation for the shell tasks |

Kept deliberately (both encoded as gate deviations, both in
`docs/parity/assumptions/tokens.md`): `--text-3` at alpha 0.52 (AA contrast;
design's literal alphas measure 3.3–3.7:1) and `.kbd` at 12px (the
tablet-audit floor on the theme preview card that `ThemeSettings.tsx` renders).

Rejected alternatives: a separate `canonical-utilities.css` file (palette-drift
only exempts `design-system.css`/`index.css` from hex scanning, and the
utilities are already in the file's layering — a second file would need a new
exemption and a new import); per-system geometry tokens (the stylelint
≥75%-peer rule would demand them in every system block for no benefit);
typing the geometry numbers into the gate (they are parsed from
`styles.css`/`app.jsx`/`layout.jsx` instead, so a design update moves the gate).

Artifact: `npm run generate:design-system-artifact` regenerated
`artifacts/awesome-video-design-system/tokens.json` (+9 geometry tokens in the
root and every theme; `validate:design-system-artifact` → up to date), and
`DESIGN.md` gained a "Canonical parity" section and a "Shell geometry" table
(hand-written, as the rest of that file is).

`package.json`: `validate:canonical-token-parity`. Registered as validation
step `canonical-token-parity` through the validation-step mechanism (not a new
workflow — the workflow cap is 10).

## 3. The gate — `scripts/validation/canonical-token-parity.mjs`

Rules (documented in the file header): (1) system set equal, (2) every design
token present in the runtime cascade, (3) every shared value equal after
normalisation (whitespace, hex case, `0.5px`/`.5px`), (4) accent set and pairs
equal, (5) registry defaults equal `SYSTEM_DEFAULT_ACCENT` and the boot
default, (6) documented deviations are self-expiring — an entry fails when the
values converge (stale) or when its `holds()` proof (recomputed WCAG contrast,
or the `.kbd` ≥12px floor) stops being true, (7) the nine geometry tokens equal
the numbers parsed from the design sources, (8) the 26 utility rules are
declaration-for-declaration identical (which also pins the base64 grain asset),
(9) the responsive geometry contract — `--shell-sidebar-w` inside the tablet
query equals the design's tablet `.sidebar` width and `--shell-header-h` inside
the mobile query equals the design's mobile `.header` height, and no other
scoped block re-declares a tracked token, (10) single source — a tracked token
(design tokens, geometry tokens, `--accent/--accent-2`) is declared only by the
three canonical html-level forms inside `design-system.css`; every other
selector (`html`, `*`, a component class, a compound system+accent selector)
and every sibling stylesheet that reaches the document fails, (11) cascade
shadows — for every utility, under every system, the values the cascade
resolves for that utility's element must agree with the design wherever a
non-canonical rule wins on either side (today the winners are the design's
own per-system overrides, mirrored by the runtime, plus one documented
deviation), (12) sixty-seven in-memory canaries run on every invocation and must
each fail on the expected rule (or pass, for the PASS controls). Runtime-only
tokens are reported, never failed.

Values are compared as the browser resolves them (review rounds 2 and 3, §8
and §9): every html-level custom-property declaration in the document — all
sheets in document order, `client/index.html` first, then the `@import` graph
of `index.css`; on the design side the `:root` block plus the inline writes of
`applyDesignSystem()` — goes through one resolver ranked by importance, then
layer, then specificity (`:root` < `:root[data-…]` < inline), then document
order, then position. So a second `:root` at the bottom of the file, a repeated
`:root[data-system]` block, a `:root { … !important }` that outranks a later
canonical-valued system block, or a system block placed after the accent
blocks that steals `--accent` for one combination, is compared exactly as the
browser paints it; all 50 system × accent combinations are resolved through
the same path. Shadow candidates are decided by a selector engine (jsdom
`Element.matches`) on a modelled utility element, not by selector text. The
design side is read the same way, and the gate refuses its own model if
`styles.css` ever declares a token outside `:root`.

Current output: 5 systems, 10 accents, 165 shared values, 0 mismatches,
0 missing, 7 deviations honoured (five `--text-3`, `.kbd`, `.no-anim *`
transition), 13 runtime-only (`--radius-xs`, the four `--motion-*`,
`--shell-footer-measure`, and — because the resolver now reads every sheet —
the sibling-owned `--skeleton-*` and `--profile-*`), geometry 9/9 under every
system, responsive 2/2, accent combos 50/50, utilities 26/26 (86 declarations;
the non-canonical winners across the 8 runtime sheets are the design's
per-system overrides plus `.no-anim *`), 2 top-level `:root` blocks merged, 7
sibling stylesheets scanned (35 custom-property declarations, 0 tracked).
`token-diff-after.json` is the machine copy.

Mutation probes (`gate-mutations.md`): 67/67 in-gate canaries behave — the
controls pass and every mutation fails on the expected rule: the round-2
bypasses (later `:root`, later `.chip`, extra tablet override), the round-3
bypasses (`:root !important` vs a canonical system block, `[class~="chip"]`),
a later `!important` and an earlier `!important` that must survive, a second
system block, system blocks stealing `--accent` (plain and `!important`),
system-scoped geometry, media-/supports-scoped token re-declarations, removed /
re-bounded / re-valued media overrides, the selector-equivalent shadows
(`:is()`, `:not()`, `span.chip`, `:where(){!important}`, `* {!important}`,
`[data-system] .chip`, sibling sheet, admin descendant) with their PASS
controls (`:where()` at zero specificity, `@layer` copy, `@media print`,
an early `index.html` `:root` that loses on order), `html` / `*` / component /
compound-layer / accent-block re-declarations, sibling stylesheets (including
one whose `!important` changes the resolved value), and the original value /
accent / registry / deviation / geometry / utility cases. The working tree is
never mutated.

## 4. Functional checks

- **50-combo computed-style table** (`50-combo-table.md`, `50-combo-results.json`):
  on `/settings/theme` at 1440×900, each of the 5×10 combinations was selected
  through the real pickers (`system-option-*`, `accent-option-*`) and
  `--accent`, `--accent-2`, `--bg`, `--text` read from
  `getComputedStyle(document.documentElement)` and compared with the design's
  effective value for the same combo — **50/50 match**. (`--fg` in the brief
  maps to the design's `--text` role; neither side has a `--fg` token.) The
  same run resolved the geometry live: 1440 → sidebar 280px / header 60px;
  800 → sidebar 240px; 375 → header 56px; `--content-max` 1240px and
  `--footer-pad` `48px 40px 32px` at every width.
- **375 filmstrip** (`filmstrip.md`, `filmstrip-home-375.png`,
  `filmstrip-settings-theme-375.png`, `filmstrip.json`): CDP screencast of a
  cold navigation of `/` and `/settings/theme`. The first frame painted from
  our document is already `#000000` with the crimson accent (black fraction
  0.89 / 0.56, white fraction ≤0.008); `data-system`/`data-accent` read
  `editorial/crimson` when the observer attaches (≈8–12ms) and at first rAF,
  and never take a different value afterwards. The only pre-response frame is
  the previous `about:blank` page.
- **Utility classes vs canonical** (`utility-fixture.html`,
  `utility-computed-diffs.json`, `utility-fixture-canonical-vs-app-1440.png`):
  the same fixture markup (`.chip` ×6 variants, `.dot.ok/.warn/.bad`, `.mono`,
  `.eyebrow`, `.kbd`, `.hide-mobile`, `.hide-tablet`, `.show-tablet`, `.card`,
  `.card.hoverable`, `.display-h`, page grain) rendered once under
  `awesome-list-site-ds/styles.css` with `applyDesignSystem('editorial','crimson')`
  mirrored as inline vars, once under the app's `design-system.css`; 18 elements
  × 27 computed properties × 3 viewports (1440/1000/375). Every difference is
  one of the two documented deviations: `--text-3` colour (on `.chip.muted`,
  `.kbd`) and `.kbd` font-size/line-height/box. Chips, dots, mono, eyebrow,
  cards, display heading, visibility utilities and the grain are identical.
- **`/design-system` showcase** (`design-system-showcase-1440.jpg`): the app's
  showcase route rendered after the change (buttons, chips, cards, `.kbd`,
  `.eyebrow` sections) — the orchestrator's side-by-side with
  `design-system.html` needs CDN React/Babel and is its own step.

## 5. No-regression evidence

- **Visual before/after at 1440** (`after-home-1440.jpg`,
  `after-category-encoding-codecs-1440.jpg`, `after-admin-1440.jpg`;
  `visual-before-after.md`): full-page PNG captures of `/`,
  `/category/encoding-codecs` and `/admin` before and after the change are
  **byte-identical** (same SHA-256 per route), i.e. zero visual delta — the
  only value that differs from the design (`--text-3`) was already in
  production, and the new tokens have no consumers.
- **Production baseline** (`baseline-compare/`): see the gates table.
- **Gates** (`gates.md`): every gate in the brief is green except `lint`,
  whose failure is the pre-existing typed-lint baseline — see the table.

## 6. Production comparison — the 12 most-used tokens

Usage counted as `var(--token` occurrences over `client/src` (`.tsx`/`.ts`/
`.css`). Production runs the committed values; this task changed **none** of
them, so old = new for every row. The intended change relative to production
is purely additive (geometry tokens, two utilities, `.chip` 10.5px, base64
grain, alias re-pointing).

| # | token | uses | editorial | terminal | geist | brutalist | swiss | vs production |
|---|---|---|---|---|---|---|---|---|
| 1 | `--accent` | 325 | per accent (crimson `#ff3d52`, … rose `#ff7a8a`) | ← | ← | ← | ← | unchanged |
| 2 | `--text-2` | 155 | rgba(244,243,238,0.66) | rgba(232,232,224,0.62) | rgba(250,250,250,0.62) | rgba(245,245,240,0.7) | rgba(250,250,248,0.62) | unchanged |
| 3 | `--border` | 121 | rgba(244,243,238,0.08) | rgba(232,232,224,0.14) | rgba(255,255,255,0.1) | rgba(245,245,240,0.85) | rgba(250,250,248,0.085) | unchanged |
| 4 | `--text` | 120 | #f4f3ee | #e8e8e0 | #fafafa | #f5f5f0 | #fafaf8 | unchanged |
| 5 | `--text-3` | 69 | rgba(244,243,238,0.52) | rgba(232,232,224,0.52) | rgba(250,250,250,0.52) | rgba(245,245,240,0.52) | rgba(250,250,248,0.52) | unchanged (design 0.4/0.36/0.38/0.4/0.38 — kept, assumptions §1) |
| 6 | `--surface` | 59 | rgba(244,243,238,0.025) | rgba(0,255,136,0.012) | rgba(255,255,255,0.04) | rgba(255,255,255,0.025) | rgba(250,250,248,0.018) | unchanged |
| 7 | `--surface-2` | 36 | rgba(244,243,238,0.05) | rgba(0,255,136,0.025) | rgba(255,255,255,0.07) | rgba(255,255,255,0.06) | rgba(250,250,248,0.04) | unchanged |
| 8 | `--border-strong` | 24 | rgba(244,243,238,0.16) | rgba(232,232,224,0.32) | rgba(255,255,255,0.18) | rgba(245,245,240,1) | rgba(250,250,248,0.18) | unchanged |
| 9 | `--radius-sm` | 23 | 8px | 0px | 6px | 0px | 2px | unchanged |
| 10 | `--hairline-w` | 21 | 1px | 1px | 1px | 1px | 0.5px | unchanged |
| 11 | `--bg` | 19 | #000000 | #000000 | #000000 | #000000 | #000000 | unchanged |
| 12 | `--radius` | 18 | 12px | 0px | 10px | 0px | 4px | unchanged |

## 7. Known gaps left on purpose

- Product-profile boot defaults (admin swiss/orange, learning geist/cyan) differ
  from the canonical editorial/crimson boot; not touched (assumptions §6).
- `.hide-tablet`/`.show-tablet` keep the upstream 1024/1025 edge, one pixel off
  the 768–1023 shell contract (assumptions §7).
- `lint`, `test:e2e` `search.spec.ts` and the tablet/mobile half of
  `sidebar-ux.spec.ts` are red on the previous commit too (measured, see
  `gates.md`); nothing in them references a token or class this task changed.

## 8. Review round 2 — cascade-aware gate, responsive contract, admin measure

The completion review found that the round-1 gate read only the FIRST block
per selector and only the top-level `:root`, so three edits passed it while
changing what the browser paints: a second `:root { --bg: … }` appended to
`design-system.css`, a repeated `.chip { font-size: 12px }` after the canonical
rule, and an extra `@media (min-width: 768px) and (max-width: 1023px)` block
re-setting `--shell-sidebar-w`. A fourth remark: `.admin-dashboard` should read
`--content-max-admin`, not inherit the accidental 1240px measure.

What changed:

- **Parser.** `parseStylesheet` keeps every rule occurrence with its at-rule
  context and merges repeated `context||selector` keys last-wins (`!important`
  yields only to a later `!important`). Custom-property names with digits
  (`--text-2`) and mixed case are preserved; statement at-rules (`@import`) are
  skipped, not mis-parsed. `classifyCustomProperties` sorts declarations into
  the three canonical html-level forms vs `scoped` (inside any at-rule) vs
  `elsewhere` (`html`, `*`, `body`, `.page`, compound selectors).
- **Inputs.** Besides `design-system.css` and the registry, the gate now scans
  every sibling stylesheet that reaches the document: `client/src/**/*.css`,
  the sheets `design-system.css` `@import`s (`shared/styles/product-profiles.css`)
  and the `<style>` blocks of `client/index.html` — 7 files, 35 declarations,
  none of them a tracked token.
- **Rules 9–12** (see §3): responsive geometry contract, single source,
  shadow rules, in-gate canaries. The responsive values are parsed from the
  design (`@media (max-width: 1024px) .sidebar { width: 240px }`,
  `@media (max-width: 768px) .header { height: 56px }`), not typed twice.
- **Canaries in the gate.** The 18 external `/tmp` probes of round 1 became 41
  in-memory cases (`CANARIES`) that run on every real invocation and gate the
  verdict; `--canaries-only` runs just them, and they are skipped (with a
  printed note) when any `--app-css/--canonical-*` override is given so a
  probe can still point the gate at a mutated copy. Table:
  `evidence/tokens/gate-mutations.md`.
- **Admin measure.** `client/src/components/admin/admin-canonical.css`
  `.admin-dashboard` now reads `var(--content-max-admin, 80rem)` (1400px, the
  design's admin measure) instead of `var(--content-max, 80rem)` (1240px after
  round 1; 1280px via the fallback before the task). Measured rendered width
  is identical in all three states — 1064px at 1440 and 1184px at 1920 —
  because the shell's page column already caps the admin content, so the
  `max-width` never bites (`evidence/tokens/admin-measure.json`,
  `after-admin-1920.jpg`). It is the only consumer of a new geometry token.
- **Artifact generator.** `scripts/generate-design-system-artifact.mjs` had the
  same first-block-only read; it now merges every top-level occurrence of a
  selector, so `tokens.json` foundations gained the runtime's
  `--shell-footer-measure: var(--content-max)` alias from the second `:root`
  block. `npm run validate:design-system-artifact` is green on the regenerated
  file.

Verification of the fix: the three review bypasses were re-run as `/tmp`
copies via `--app-css` and now fail on rules 3, 8 and 9 respectively (output in
`gate-mutations.md`); the unmodified inputs still pass with 0 mismatches and
the 41/41 canary table; `seo-snapshot --gate --parity`, which failed once on a
`/tag/open-source` hydration-parity flake during the first completion run,
passed 20/20 when re-run alone.

## 9. Review round 3 — importance-aware resolver, selector-engine shadows

The second completion review kept two bypasses alive in the round-2 gate:

1. `:root { --surface: #010203 !important }` prepended to `design-system.css`
   plus a canonical-valued `:root[data-system="editorial"] { --surface: … }`
   appended — the round-2 model overlaid "root ⊕ system block" per selector,
   so the system block's canonical value hid the `!important` root value that
   the browser actually paints (importance outranks specificity).
2. `[class~="chip"] { font-size: 99px }` — round-2 shadow detection matched
   selector text (`.chip` suffix / compound classes), so an attribute
   selector, `:is(.chip)`, `span.chip` or a `:not()` form on the same element
   went unseen.

What changed:

- **One resolver for tokens.** `classifyCustomProperties` now emits every
  html-level declaration (`:root`, `:root[data-system]`, `:root[data-accent]`)
  with importance, layer, specificity, sheet order and position;
  `resolveHtmlTokens` ranks them like the browser (importance → layer →
  specificity → document order → position) for a given system/accent. The
  design model feeds the same resolver with its `:root` block and the inline
  writes of `applyDesignSystem()` (system vars, then the accent pair, at inline
  specificity). Sibling sheets' html-level declarations take part too, so a
  sibling `!important` fails rule 3 as well as rule 10. Document order comes
  from `client/index.html` first, then a DFS of `index.css`'s `@import`s
  (imports before importer); a sheet the walk cannot reach (the admin sheet,
  imported from TSX) is ranked last.
- **Geometry and combos through the resolver.** Rule 7 resolves each geometry
  token under every system; rule 4 resolves `--accent`/`--accent-2` for all 50
  combinations and reports the combination that drifts.
- **Selector engine for shadows.** `relaxSelector` parses each rule's
  selector (quote/escape/nesting aware, L4 specificity for `:is/:where/:not/
  :has`, `:nth-child(… of …)`) and models the utility element as "unknown type,
  exactly the utility's classes, no other attribute, unknown position": type
  selectors, non-html ancestors and siblings are dropped (widening); ids,
  other attributes, pseudo-elements and `html`/`body`/`:root` subjects can
  never match; `:root[data-system]`/`[data-accent]` ancestors are evaluated
  against the system under test; state/structural pseudo-classes and `:has()`
  become evaluation contexts. What survives is matched with jsdom's
  `Element.matches` on a fixture element under `<html data-system data-accent>`,
  then cascaded per media/condition context with the same importance → layer →
  specificity → order ranking. Rules with no class test on the element count
  only when they can outrank a class rule (`* {…!important}`, `.no-anim *`);
  rules naming an element type (`select`, a custom element) never do, and
  `@media print` is excluded (not a screen parity surface). The design's
  stylesheet is held to the same rule, and differences may be honoured only as
  `shadow:<rule>:<property>` deviations.
- **Findings on the live tree.** The first run reported thousands of matches
  because non-class attribute rules (`[data-ds="chip"]`) and typed universal
  rules (`select`, `vite-plugin-checker-error-overlay`) were widened onto the
  fixture; the element model above removed them. The one real finding —
  the runtime's `.no-anim *` freezing `transition` on `.card*` where the
  design's `.no-anim` does not — is kept as a documented, self-expiring
  deviation (assumptions §8) rather than changed, because the motion toggle's
  behaviour is outside the token task.
- **Canaries.** 41 → 60, including the two review bypasses, `!important`
  accent theft, system-scoped geometry, the selector-equivalent shadow forms,
  and PASS controls that prove the engine does not over-report (`:where()` at
  zero specificity, an `@layer` copy, `@media print`, an early `index.html`
  `:root` that loses on document order — asserted with a `reject` pattern).
  The gate runs in about four seconds including all canaries.
- **Self-review sweep after round 3.** Thirty-one further spellings of the
  same two attacks were run as `--app-css` copies (`gate-mutations.md`,
  "Self-review sweep"). Three slipped through and are now fixed with canaries:
  CSS Nesting (`.page { .chip {} }`, `.chip { @media (…) {} }`, `:root { & {}
  }`) was parsed as declarations of the parent — the parser now flattens
  nested style rules and nested conditional at-rules the way the browser does
  (`&` → parent, relative selectors → descendants, a rule's own declarations
  hoisted before its nested rules); a hex-escaped class (`.\63 hip`) split on
  its terminator space — escapes are decoded before tokenising; and the print
  exclusion matched any query containing `print`, so `@media not print` and
  `@media screen, print` (both paint on screen) were skipped — only a
  print-only query list is excluded now. Canaries 60 → 67. The three PASS rows
  of the sweep are correct by the browser's rules (print-only lists; `.CHIP`
  does not match `class="chip"` in standards mode).

## 10. Review round 4 — ordered cascade layers, depth-aware generator, memory scrub

The third completion review found three things:

1. **Layers were a bit, not an order.** The round-3 resolver ranked
   "unlayered beats layered, reversed under `!important`", so any two layered
   rules tied and fell through to specificity. Bypass: `@layer early {
   :where(.hide-tablet) { display: block !important } }` followed by `@layer
   late { .hide-tablet.hide-tablet { display: none !important } }` — the gate
   saw the specific restore win; Chromium paints `block` (under `!important`
   the EARLIER layer wins, and every layered `!important` beats the unlayered
   canonical one).
2. **The artifact generator read `:root` with a first-`}` regex**, so a
   multi-line `@media (…) { :root { --shell-sidebar-w: 240px } }` would have
   been merged into the root and regenerated `tokens.json` with the tablet
   value.
3. **Memory files carried session detail** (counts, ports, lint history,
   route names) instead of durable rules.

What changed:

- **`LayerOrder` in the gate.** `parseStylesheet` threads the layer path
  through the walk (`@layer a.b` → segments, bare `@layer {}` → a per-sheet
  anonymous name, qualified by file when registered) and keeps the statement
  at-rules that only declare layers (`@layer a, b;`, `@import … layer(x)`)
  with their position. `buildLayerOrder` replays every sheet in document order
  (statements and rules interleaved by position, each sheet under the layer
  its importer's `@import … layer()` put it in) into a tree of first
  appearance; a post-order walk gives each layer its linear rank (sublayers
  before the parent's direct styles, unlayered = ∞). `cascadeCompare` is now
  importance → inline → layer rank (later wins; reversed under `!important`)
  → specificity → order → position, and every html-level declaration and
  every rule-11 candidate carries `layer`/`layerRank`.
- **The import walk follows bare specifiers.** `documentOrder` resolves
  `@import "tailwindcss"` through `node_modules` (file, package `style`, or
  `index.css`) and records the layer each sheet was imported into, so
  Tailwind's `@layer theme, base, components, utilities;` sits at its true
  position — after `design-system.css`'s own `@layer base` block. Modelled
  order: `base < theme < components < utilities < unlayered`; the summary
  prints it and `app-tokens.json` records it with the per-sheet order/layer
  table. Sibling sheets now include the vendor sheet (8 scanned, was 7).
- **Twelve new canaries** (`LAYER_CANARIES` + two import cases; 67 → 79): the
  reviewer's bypass and its canonical-first PASS control, `@layer` statement
  order in both directions, anonymous layers, nested sublayers (block and
  dotted forms), layered vs unlayered `!important`, later-layer-wins for
  normal declarations, the vendor statement ordering layers an app sheet only
  uses, an `@import … layer(theme)` of the main sheet losing to an earlier
  unlayered `index.html` root, and a layered later sibling losing to the
  unlayered canonical rule. Five of them escape a copy of the gate with the
  round-3 comparator swapped back in; all pass under the new one.
- **Chromium agrees.** `scripts/validation/canonical-token-parity-browser-check.mjs`
  loads the identical canary CSS after the design's rules (raw
  `node_modules/tailwindcss/index.css` for the vendor case; a data-URL
  `@import … layer(theme)` for the import case) at 900px and reads
  `getComputedStyle`: 11/11 agree with the gate's expectation. The same run
  walks the live app's `document.styleSheets` and lists layers by first
  appearance: `properties < base < theme < components < utilities` — the
  gate's order plus Tailwind's compiler-emitted `properties` layer (universal
  `--tw-*` `@property` fallbacks; no source rule; documented as not
  modelled). Evidence: `layer-order-browser.json`, `gate-mutations.md`
  ("Review round 4").
- **File-based bypass re-run**: the live `design-system.css` + the two layers
  appended passes the gate as committed before this round (exit 0) and fails
  the round-4 gate on rule 11 (exit 1) — transcript in `gate-mutations.md`.
- **Generator.** `scripts/generate-design-system-artifact.mjs` now strips
  comments, splits by brace depth, takes only depth-0 rules (at-rules
  excluded), splits selector lists (`:root, :host` counts), reads only
  depth-0 declarations (`;` inside `url()`/strings safe, last wins), throws on
  a missing block, and self-tests on every invocation (media-nested,
  `@layer`/`@supports`-nested, CSS-nested `@media` and `& .child` inside
  `:root`, comment-only block, list selector, missing selector). Probe: with
  the two responsive rules of `design-system.css` reformatted multi-line in a
  temporary copy, the previous generator reported `stale` (it had merged the
  media values) and the rewritten one `up to date`; the working tree was
  restored byte-identical (SHA-256 checked).
- **Memory.** `token-parity-effective-cascade.md` rewritten as rules + Why +
  How to apply (ordered layers added, session narrative removed);
  `filmstrip-prepaint-check.md`, `design-reference-independence.md` and
  `dev-listener-selection.md` stripped of counts, ports, file names and lint
  history; the four index lines shortened.

## 11. Review round 5 — spliced imports, document rules, overlay canaries

The fourth completion review found that `documentOrder` placed each imported
sheet BEFORE its importer as a whole, so an importer's own `@layer` statement
written above its imports was registered after them. Bypass, in
`client/src/index.css`: `@layer early;` then `@import '../canary/restore.css'
layer(late)` (`.hide-tablet.hide-tablet { display: none !important }` under
`(max-width: 1024px)`) then `@import '../canary/bypass.css'` (`@layer early {
:where(.hide-tablet) { display: block !important } }` under the same media).
In the browser an importer's pre-import statements precede its imported
sheets, so `early < late` and the early `!important` wins — Chromium paints
`block`; the round-4 gate saw `late` first, computed `none`, and passed. The
review also asked for the model AND Chromium canaries for that case with
competing important declarations, and for the stale "41 canaries" wording to go.

What was learned first, because it decides how the fix must read the tree:
`index.css` is a Tailwind root, and `@tailwindcss/vite` hands it (dev and
build) to the `tailwindcss` compiler, whose import substitution inlines EVERY
`@import` where it sits — one following another rule, one nested inside
`@media` (wrapped in the enclosing at-rule), one carrying a media list /
`supports()` / `layer()` (wrapped accordingly), and each copy of a doubled
import; `@layer early;` above the imports keeps its place. Measured with
`tailwindcss` 4.3.2's `compile()` over the live entry plus each variant
(table in `gate-mutations.md`, "Review round 5"). css-syntax, postcss-import
and a browser given the raw sheet drop a misplaced `@import`, so a misplaced
import is not dead in what ships but is pipeline-dependent. Decision: model
the compiled document (the sheet IS loaded at its position, under the
enclosing at-rules) and FAIL the position; model the first copy of a doubled
import and FAIL the second.

What changed (`scripts/validation/canonical-token-parity.mjs`):

- **Spliced document positions.** `documentOrder` walks the entry in source
  order and gives every imported sheet the position `[...importerPosition,
  importSeq]`; `parseStylesheet` records for each `@import` its media list,
  `supports()` prelude, `layer()` (falling back to an enclosing `@layer`) and
  the at-rules enclosing it, plus whether it is well-placed (`valid` /
  `reason`: follows another rule, or nested inside a block). A sheet's context
  is the union of its importer's, its enclosing and its own conditions; its
  layer is the importer's layer joined with the import's. Cycles stop at the
  sheet being loaded; unresolved imports are recorded (a layered one still
  declares its layer, as the compiler would fail the build). `buildLayerOrder`
  replays statements and rules by these positions, so the importer's `@layer
  early;` now ranks first — the bypass resolves `block !important` in the
  runtime and fails rule 11 as a shadow.
- **Three document rules.** Rule 12: the main sheet must be reached by the
  import chain, unconditionally (removed, unresolved, or imported under a
  media/supports condition → FAIL, "the runtime paints no design token at
  all"). Rule 13: every `@import` must be well-placed and single (misplaced →
  FAIL naming the pipeline split; doubled → FAIL "applies twice at two
  document positions"). Rule 14: the layer order must not depend on which
  conditional groups currently match — Chromium does not register a layer
  whose first declaration sits inside a non-matching `@media`, so a layer first
  declared under `(min-width: 1200px)` and again unconditionally later can
  swap places with a neighbour at another viewport; the check treats every
  condition as an independent atom (stricter than the browser, never laxer).
  `cascade.document` in `app-tokens.json` records entry, main-sheet verdict,
  misplaced, unresolved and duplicate imports.
- **Overlay canaries.** `DOCUMENT_CANARIES` (12 rows; 79 → 91 canaries plus
  the control) rewrite `client/src/index.css` and add sheets under
  `client/canary/` through an in-memory virtual file system that the resolver
  consults before disk, so the working tree is never touched: the reviewer's
  bypass (shadow FAIL, `block`), its two PASS controls (statement after the
  imports; no statement at all — `late < early`, restore wins), a misplaced
  import after a rule and one nested in `@media` (rule 13 AND the shadow, via
  the new `also` multi-pattern assertion), a doubled import (rule 13 and the
  shadow), a media-conditioned import whose condition matches at 900px (shadow)
  and a print-only one (PASS), the main sheet moved after a rule (rule 13, not
  rule 12 — `.chip` still paints), removed (rule 12), imported under
  `(min-width: 1200px)` (rule 12), and the conditional-first layer declaration
  (rule 14 alone; the canary asserts no shadow line fires). `runCanaries` gained
  `also: [regex…]` and reports `missing: <re>` on the first unmet pattern.
- **Chromium agrees, compiled and raw.**
  `canonical-token-parity-browser-check.mjs` now imports `compile` from
  `tailwindcss`, compiles each overlay's `index.css` with a `loadStylesheet`
  that runs the gate's own `resolveImport` over overlay-then-disk, serves it
  behind a synthetic `client/index.html` on a routed origin and reads
  `getComputedStyle`; a second pass serves the raw sheets. 12/12 document
  rows agree with the gate on the compiled document; the raw column shows the
  pipeline split for the two misplaced imports (`block` compiled, `none`
  raw) and agrees everywhere else. 11/11 layer rows unchanged. Evidence:
  `layer-order-browser.json` (rows carry `browser`, `rawBrowser`,
  `document`), `gate-mutations.md`.
- **File-based bypass re-run** against a mirror of the repository with the
  three lines prepended to `index.css` (`/tmp/parity-tokens/r5/mirror`): the
  gate as committed before this round PASSes (exit 0); the round-5 gate fails
  on rule 11 with the shadow named at `client/canary/bypass.css @media
  (max-width: 1024px) @layer early` (exit 1) — transcript in
  `gate-mutations.md`.
- **Stale counts.** `DESIGN.md` now describes the canary suite without a
  number; `DESIGN-SYNC.md`, the evidence README and this section state 91;
  earlier sections keep their historical counts (41 → 60 → 67 → 79 → 91).
- **No `client/`, `shared/` or `artifacts/` source changed** in this round
  (`DESIGN.md` wording only), so the round-3 e2e baseline stands. Gates:
  `evidence/tokens/gates.md`, "Review round 5".
