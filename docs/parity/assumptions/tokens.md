# Assumptions — tokens (canonical tokens and shell geometry)

Decisions taken while bringing `client/src/styles/design-system.css` to
parity with `awesome-list-site-ds/styles.css` + `design-systems.jsx` and
adding the shell geometry tokens. The shell tasks (header, sidebar, footer,
compose shell), the page tasks and the theme-settings task inherit them; a task
that overturns one must say so in its own assumptions file and add a pointer
here. Every deviation below is also encoded in
`scripts/validation/canonical-token-parity.mjs` (`DOCUMENTED_DEVIATIONS`), so
the gate fails the moment a deviation goes stale or stops delivering its reason.

## 1. `--text-3` stays at alpha 0.52 in all five systems (design: 0.36–0.40)

The design source sets `--text-3` to `rgba(<text>, 0.4)` (editorial,
brutalist), `0.36` (terminal) and `0.38` (geist, swiss) and its docs describe
the token as "AA on the black background". Measured with the WCAG relative
luminance formula against the system `--bg` (#000000), those literal alphas
give **3.3–3.7 : 1**, below AA (4.5 : 1) for the body-size text the app uses
`--text-3` on (badge text, meta rows, `.kbd`, `.chip.muted`, captions). The
runtime keeps **0.52**, which measures **≥ 4.5 : 1** in every system.

- Reverting to the literal alphas would add axe `color-contrast` violations
  against the production baseline and break the W4 audit task's a11y gate.
- `artifacts/awesome-video-design-system/DESIGN.md` already carries the same
  instruction ("preserve 0.52, don't restore 0.4"), so this is a continuation,
  not a new fork.
- Encoded as five `<system>:--text-3` deviation entries whose `holds()`
  recomputes both contrast ratios; if the design ever raises its alpha to an
  AA-passing value the entry is reported stale and the gate fails until it is
  removed.

**Revisit when:** the design source changes `--text-3` to a value that
measures ≥ 4.5 : 1 on its own (then delete the deviation entries and take the
canonical value), or the app stops using `--text-3` for text smaller than
18.66px bold / 24px regular (large-text AA is 3 : 1, which the literal alphas
would pass).

## 2. `.chip` is canonical (10.5px); `.kbd` stays 12px (design: 10.5px)

`.chip` had drifted to 12px in the runtime. It was reset to the canonical
10.5px because no TSX renders a raw `.chip` (the Badge primitive emits
`data-ds="chip"` and carries its own size), so the change has no consumer
surface today and future canonical markup gets the right size for free.

`.kbd` is rendered today by `ThemeSettings.tsx` inside the theme preview card,
and the `tablet-audit` gate's `theme-preview-text` check fails any preview text
below 12px (BUG-041). Taking the canonical 10.5px would trip that gate on a
screen the theme-settings task owns. The runtime therefore keeps 12px, encoded
as the `rule:.kbd:font-size` deviation whose `holds()` requires canonical
< 12px and runtime ≥ 12px.

**Revisit when:** the theme-settings task replaces the `.kbd` in the preview
card (or the tablet-audit floor moves), at which point the deviation entry is
deleted and `.kbd` takes the canonical 10.5px.

## 3. `.stat` and `.section-title` are not defined anywhere in the design source

The task brief lists them among the canonical utilities, but `styles.css`
declares neither, and no `.jsx` in `awesome-list-site-ds/` uses a `.stat` or
`.section-title` class (verified with `grep -rn` over the tree). The closest
thing is `.stat-strip` in `home-layouts.jsx`, a home-layout grid whose rules
live in that component's own `<style>` block — it belongs to the home page
task, not to the shared stylesheet. Nothing was invented for them; the gate's
`UTILITY_RULES` covers the 26 selectors that do exist on both sides.

**Revisit when:** a future archive sync adds either class to `styles.css`;
the gate then reports them as missing utility rules until they are ported.

## 4. Runtime-only tokens are kept and reported, never failed

`--radius-xs` and `--motion-fast/base/slow/ease` exist only in the runtime
(consumed by token-mapped primitives). They are additive, cannot conflict with
any canonical value, and are printed by the gate as `runtime-only` so their
count is visible. The nine shell geometry tokens are runtime-only by name but
are checked against the design's hard-coded measurements (rule 7), so they are
excluded from that report.

**Revisit when:** the design source adds a token with one of these names; the
gate then compares values automatically.

## 5. Shell geometry tokens are declared, aliased, and consumed only by the admin measure

- Names and values: `--shell-sidebar-w` 280px, `--shell-sidebar-w-tablet`
  240px, `--shell-rail-w` 56px, `--shell-header-h` 60px, `--page-pad-y` 48px,
  `--page-pad-x` 40px, `--content-max` 1240px, `--content-max-admin` 1400px,
  `--footer-pad` 48px 40px 32px. Each is parsed from the design source by the
  gate (`.sidebar`, `.icon-rail`, `.header` widths/heights in `styles.css`,
  `padding`/`maxWidth` in `app.jsx`, footer `padding` in `layout.jsx`) rather
  than typed twice.
- `--shell-sidebar-w` is **responsive**: it resolves to the tablet value at
  768–1023px, and `--shell-header-h` resolves to 56px below 768px, so a
  component can read one name at every viewport. This mirrors how the old
  `--shell-sidebar-width` alias behaved.
- The zero-consumer aliases `--shell-sidebar-width` and `--shell-header-height`
  were removed. `--shell-footer-measure` (read by `.site-footer-inner`) is kept
  as `var(--content-max)` so its resolved value is unchanged (1240px).
- `.admin-dashboard` (`client/src/components/admin/admin-canonical.css`) was
  already reading `var(--content-max, 80rem)`, so defining `--content-max`
  would have silently moved its measure from the 1280px fallback to the page's
  1240px. Per the completion review it now reads `var(--content-max-admin,
  80rem)` — the canonical 1400px admin measure — making it the one pre-existing
  consumer of a new geometry token. Rendered width is unchanged in every state
  (1064px at 1440, 1184px at 1920) because the shell's page column caps the
  admin content before this `max-width` applies
  (`evidence/tokens/admin-measure.json`).

**Revisit when:** the W2 shell tasks adopt the tokens (they may then drop the
`--shell-footer-measure` alias) and the W3 admin tasks restructure the admin
page column (the 1400px measure only becomes visible once the column stops
capping at the page measure).

## 6. Product-profile boot defaults stay (admin: swiss/orange, learning: geist/cyan)

The canonical app boots `editorial/crimson` everywhere. The runtime prepaint
script in `client/index.html` and `PRODUCT_PROFILES` in
`client/src/lib/design-system.ts` boot `swiss/orange` on admin routes and
`geist/cyan` on learning routes (which include `/settings/...`) when nothing is
stored. That is a deliberate product decision from 2026-09-05 with its own
gates (`product-profile-browser`, `theme-registry-types`); the shared default
(`editorial/crimson`) and every stored-preference path already match the
design. This task did not touch the prepaint block; the 50-combo check and the
filmstrip were run with stored preferences so they measure the token cascade,
not the profile choice.

**Revisit when:** the theme-settings task (account screens and 50-combo
settings) or the orchestrator decides whether product profiles survive parity;
if they are dropped, the prepaint block, `PRODUCT_PROFILES`, and the
`product-profile-browser` gate must go together.

## 7. Two breakpoint contracts coexist: shell tokens 768–1023, verbatim utilities 1024/1025

`docs/parity/DESIGN-SYNC.md` already records that upstream CSS switches the
tablet sidebar at `max-width: 1024px` while the governing brief requires
tablet behaviour at 768–1023px. The shell geometry overrides follow the brief
(`--shell-sidebar-w` → 240px at 768–1023px, `--shell-header-h` → 56px below
768px). The visibility utilities `.hide-tablet` (`max-width: 1024px`) and
`.show-tablet` (`min-width: 1025px`) were ported **verbatim** because the gate
checks utility declarations byte-for-byte against upstream; they differ from
the brief by one pixel at exactly 1024px. No runtime markup uses them yet.

**Revisit when:** a shell or page task starts using `.hide-tablet`/
`.show-tablet` at the 1024px edge; the task must then decide whether to add a
brief-aligned variant or record the 1px difference as accepted.

## 8. `.no-anim *` keeps freezing card transitions (design: only caret, shimmer, live-dot)

The runtime's motion toggle puts `.no-anim` on the root and its rule
`.no-anim, .no-anim *, .no-anim *::before, .no-anim *::after { animation: none
!important; transition: none !important }` (`client/src/styles/design-system.css`)
freezes every animation and transition. The design's `.no-anim` (`styles.css`)
only stops `.caret::after`, `.shimmer-line` and `.live-dot`, so inside
`.no-anim` a design `.card.hoverable` still animates its hover while the
runtime's does not. The gate's cascade-shadow rule (rule 11) sees this as a
non-canonical rule (`.no-anim *`, universal subject, `!important`) winning
`transition` for `.card`, `.card.hoverable`, `.card.hoverable:hover` and
`.card.glow:hover`; it is honoured as the deviation
`shadow:.no-anim *:transition` (reason + `holds()` = the runtime value is still
`none !important`), so the gate fails if the rule is narrowed to the design's
scope (stale) or stops freezing (no longer holds). Kept on the WCAG 2.3.3 side:
a user who turned motion off expects hover motion off too, and the toggle's
behaviour is a component/motion decision outside the token task.

**Revisit when:** the design freezes transitions under `.no-anim`, or the
motion task decides card hover transitions should survive the toggle; either
way the entry expires by itself.

## 9. Tailwind's compiler output is modelled from source, not from the served bundle

The gate parses stylesheets as written: `index.css` imports `"tailwindcss"`,
which the import walk follows into `node_modules/tailwindcss/index.css` so
its `@layer theme, base, components, utilities;` statement takes its true
place in the document (after `design-system.css`'s own `@layer base` block —
hence the modelled order `base < theme < components < utilities <
unlayered`). Two things the Tailwind compiler adds are NOT in any source sheet
and are not modelled: the `properties` layer it prepends (universal `--tw-*`
`@property` fallbacks under `@supports`, no class-anchored or html-level
declaration, so it cannot win a compared property) and the variables
`@theme` emits inside `@layer theme` (namespaced `--color-*`/`--font-*`/
`--radius-*`, normal importance, so they can never beat an unlayered
`design-system.css` declaration). Chromium's own first-appearance order for
the live document is `properties < base < theme < components < utilities`
(`evidence/tokens/layer-order-browser.json`) — the modelled order with the
compiler layer in front.

**Revisit when:** a source sheet starts declaring tokens inside `@theme`
with `!important`, or the app adds an `@import … layer()` — the model
already handles the latter (canaried), but the evidence table should be
re-run.

## 10. The document is the Tailwind-compiled import graph, spliced where each `@import` sits

`index.css` is a Tailwind root, so `@tailwindcss/vite` (dev and build alike)
hands it to the `tailwindcss` compiler, whose import substitution inlines
EVERY `@import` of the graph at its own position — after another rule, nested
inside a block (wrapped in the enclosing at-rule), with a media list /
`supports()` / `layer()` (wrapped in `@media` / `@supports` / `@layer`), and
each copy of a sheet imported twice (measured with `tailwindcss` 4.3.2's
`compile()`, table in `evidence/tokens/gate-mutations.md`, "Review round 5").
The gate therefore models the document as that compiler builds it:

- **Positions are paths.** `client/index.html`'s `<style>` is `[0]`, the
  entry `[1]`, an imported sheet `[...importerPosition, importSeq]` — so an
  importer's `@layer early;` written above its imports ranks before the
  imported sheets and its rules below them rank after (the round-5 bypass).
- **Every import is followed, misplaced or not**, and the misplaced ones
  (after another rule, or inside a block) FAIL rule 13 — css-syntax,
  postcss-import and a browser given the raw sheet drop such an import, so its
  meaning depends on the pipeline. The evidence table shows the split: the
  bypass sheet behind a misplaced import paints `block` compiled and `none`
  raw. Modelling what ships and failing the position is the conservative pair;
  a sheet nobody compiles (a component-level sheet without Tailwind features
  goes through Vite's postcss-import instead) would lose such an import, and
  the gate would still have failed it.
- **A doubled import** is inlined twice by the compiler; the gate models the
  first copy and FAILS the second (rule 13) rather than modelling two copies.
- **Conditions are opaque, independent atoms.** An import's media list,
  `supports()` prelude and the at-rules enclosing a nested import compose into
  the sheet's context; `supports()` is never evaluated. The layer-order
  ambiguity check (rule 14) asks only whether SOME assignment of truth values
  flips two layers' first appearances — it cannot know that `(min-width:
  1200px)` and `(max-width: 1024px)` are exclusive, so it is stricter than the
  browser, never laxer.
- **A cycle** stops at the sheet already being loaded; an unresolved import
  is recorded, not followed (a layered one still declares its layer, as the
  compiler would fail the build before the browser saw it).
- **Sheets under `client/src` that no import reaches** are still scanned as
  potential late siblings (component-level imports from TSX inject them after
  the entry bundle); Tailwind's compiler-emitted `properties` layer stays
  unmodelled (§9).

**Revisit when:** the app's CSS stops being compiled by Tailwind (then a
misplaced import IS dead and rule 13's model half is wrong in the other
direction), or a sheet is meant to be imported twice on purpose (then the
duplicate rule needs an allow-list rather than a blanket FAIL).

## 11. `.page` paints its background through `::before`/`::after` (design: on `.page` itself)

The design's `.page { background: var(--bg-atmosphere), var(--bg); background-size:
…; background-color: var(--bg) }` (`styles.css`) rasterises the atmosphere over
the whole `.page` box. In the runtime `.page` wraps the entire shell, so at
412px wide the Home box is ~6000px tall, and the Editorial ellipses
(`ellipse 1100px 700px at 88% -8%` and `ellipse 900px 500px at -8% 110%`, both
ending at `transparent 60%`) are exactly transparent everywhere except the band
`y < -8% + 420px` at the top and `y > 110% - 300px` at the bottom. Chromium's
software raster still evaluates both gradients for every device pixel of the
box: a CDP trace of the compiled Home at 412×823 / DPR 1.75 measured ~4.6s of
raster-worker time and a 300–430ms main-thread `LayerTreeHost::
WaitForCommitCompletion` stall, against ~0.4s / 0ms on production, whose
`.page` is 0px tall. Injecting `.page { background-image: none }` alone brought
both numbers to production's (`docs/parity/DS-AUDIT.md`, continuation).

The runtime therefore keeps the two layers but paints them on `.page`'s
pseudo-elements (`client/src/styles/design-system.css`):

- `.page::before` — `position: absolute; inset: 0; z-index: -1; background: var(--bg)`;
- `.page::after` — the same box, `background: var(--bg-atmosphere)`,
  `background-size: var(--bg-atmosphere-size, auto)`,
  `background-repeat: var(--bg-atmosphere-repeat, no-repeat)` and
  `clip-path: var(--bg-atmosphere-clip, none)`;
- `.page` — `background: none; background-color: transparent` so the pseudo
  layers show; `position: relative` and `min-height: 100vh` stay verbatim.

The pseudo box is the `.page` padding box, so percentages in `--bg-atmosphere`
resolve against the same positioning area, and a negative-z-index positioned
box paints directly after the enclosing stacking context's own background and
before every in-flow block — the position `.page`'s own background occupied.
No design rule uses a negative `z-index`, so nothing can slip between the two.
`--bg-atmosphere-clip` is a runtime-only token declared next to each system's
`--bg-atmosphere`: Editorial's polygon keeps the two visible bands, Geist keeps
`inset(0 0 calc(120% - 480px) 0)` (its single ellipse ends at
`-20% + 480px`), and Terminal, Brutalist and Swiss declare `none` because
their scanline/grid patterns (or no atmosphere) cover the whole page. A system
that changes `--bg-atmosphere` must re-declare the clip; the runtime `body`
also dropped its non-canonical fixed-attachment copy of the atmosphere (the
design's `body` has only `background: var(--bg)`).

The clip alone left a second cost in Home's first frame. With
`background-size: auto` a gradient image is exactly the positioning area, so
the default `background-repeat: repeat` never paints a second tile — but
Chromium rasterises a repeated background image through a tiled image shader
that re-renders the whole gradient bitmap (412 × ~6000 CSS px at DPR 1.75)
for every 256px raster tile: ~85ms per tile, ~350ms of raster-worker time
before the first frame could be presented, which held Home's observed first
contentful paint at ~250–330ms (after the entry bundle and the route chunks
had finished) and pulled them into Lighthouse's simulated FCP path. A CSS
bisection over the compiled Home (`docs/parity/DS-AUDIT.md`, continuation:
`* { background-image: none }`, then per-image, then per-property on
`.page::after`) isolated it: `background-repeat: no-repeat` brings the
pre-FCP raster to ~40ms and the observed FCP to ~130–180ms with every pixel
unchanged, because the single tile already covers the box. The runtime-only
token `--bg-atmosphere-repeat` defaults to `no-repeat`; Swiss, whose 64px
grid tile must repeat, re-declares `repeat`. Editorial, Terminal and Geist
use `auto`-sized gradients (Terminal's scanlines repeat inside the gradient
function, not through `background-repeat`), and Brutalist has no atmosphere.

The gate honours the two `.page` mismatches as `rule:.page:background` and
`rule:.page:background-color` with a shared `holds()` that re-reads the runtime
rules: it requires `.page` to be `none`/`transparent`, `.page::before` to carry
`var(--bg)`, `.page::after` to carry `var(--bg-atmosphere)`, the size token,
the repeat token and the clip token, and both pseudos to be `position:
absolute; inset: 0; z-index: -1`. Canaries `page-atmosphere-pseudo-dropped`,
`page-atmosphere-clip-dropped`, `page-atmosphere-repeat-dropped` and
`page-atmosphere-plane-dropped` prove the
entry stops holding when any of those is removed. Pixel equality is not
assumed from the reasoning above: the Editorial × Crimson rows run against the
frozen reference after the change with the unchanged 0.1 / 0.5% / full-union
thresholds.

**Revisit when:** the design moves the atmosphere off `.page`, gains a
negative-`z-index` rule, or Chromium stops rasterising fully transparent
gradient regions (then the deviation is pure cost and should be reverted).
