# Canonical design-source synchronization

## Scope and provenance

- Phase: **0 only**. This record synchronizes the canonical reference; it makes no product-parity claim.
- Supplied archive: `attached_assets/awesome_list_site_2_1789019068732.zip`
- Verified SHA-256: `19f0240c46caf790bfc384e21f123525699e1ff386fe892f8084bf73337302c9`
- The hash is identical to the previously reviewed archive recorded in `.local/tasks/verified-app-design-parity-archive-review.md`.
- Safe extraction used for comparison: `/tmp/design-parity-bundle-7zbnza_9`.
- `inspection-manifest.json` identifies exactly 103 original archive entries. Generated decode/inspection files outside that manifest were excluded.
- The ZIP remains intact and is not an application input.

The existing `awesome-list-site-ds/` tree was compared path-by-path with all 103 original entries before synchronization. Result: 77 byte-identical, 10 existing paths to overwrite, and 16 archive paths to add. Local-only files are retained.

## Source authority and variants

The authoritative target is the **modular** `index.html` load graph:

`data.js` → `tweaks-panel.jsx` → `design-systems.jsx` → `layout.jsx` → `sidebar-variants.jsx` → `home-layouts.jsx` → `pages.jsx` → `admin.jsx` → `app.jsx`.

This generation provides Index (default) and Curated home layouts, configurable identity and search placement, a right-justified header cluster, command palette, full footer, persistent 56px collapsed rail, and L1/L2/L3 sidebar.

`index.standalone.html` and `Awesome.Video - Standalone.html` are genuine older generated snapshots. They are retained as provenance, but their embedded app (four older home layouts, featured default, static identity, L1/L2 sidebar, no full footer or command palette) is never the canonical app target. Historical screenshots under `uploads/` are also references, not baselines; their documented references are preserved.

`design-system.html` and `docs.html` remain separate entrypoints. They are not folded into the app.

## Required reads completed before synchronization

Read end-to-end in the mandated order:

1. `awesome-list-site-ds/HANDOFF.md`
2. `awesome-list-site-ds/docs/04-tokens.md`
3. `awesome-list-site-ds/docs/05-theming.md`
4. `awesome-list-site-ds/docs/10-components.md`
5. `awesome-list-site-ds/docs/11-patterns.md`
6. upstream `SKILL-verify-design-system.md` (the vendor path was absent before sync)
7. upstream `styles.css` (753 lines)
8. upstream `design-systems.jsx` (346 lines)

Also read completely because they are changed/new authored reference files: `app.jsx`, `data.js`, `home-layouts.jsx`, `index.html`, `layout.jsx`, `pages.jsx`, `sidebar-variants.jsx`, `REPLIT-REMEDIATION-PROMPT.md`, `audit-report.md`, and `uploads/INDEX.md`. The prior complete archive review accounts for every other authored entry and all binary references. Generated standalone HTML was retained but was not promoted over the modular source.

## Existing paths approved for overwrite

| Path under `awesome-list-site-ds/` | Old SHA-256 | Archived SHA-256 |
|---|---|---|
| `app.jsx` | `e39129ff454bb5e56a92b7d38dad3aa99dc11e29df8624ab8881197fef9ff585` | `9d71619b1c70720d36b15803b818040f4515ca165b09388f9e60376fa81ae1c6` |
| `data.js` | `35324994961101928952a1a3d096fdcfd98303a665a01b5555427e760df93793` | `5196b2a166673cc3c62a011028573d93e02b9f690b24db2e06b6372700b25a66` |
| `design-systems.jsx` | `e8aeb34e3782ed072a8589f70a257a8189b294acc4f0cc7bbaf551cfa5a7fdf2` | `30c37539db397941f209055af28a5284fbdd14a3322adb869701c70b0e05bc7c` |
| `home-layouts.jsx` | `f3a5e925c803306907915ea2ddccf82b881b3675ca2a4785ee591df0025a6b8c` | `c91a2a679670684b4182b3c6015544265373e01cf2ee96efc778975a2257b4f2` |
| `index.html` | `79cfd4cd69ffe94630ea0bafef0cf8b9493f01124abdad8ba034055994d4f1f2` | `7f561822fdbb5b67ebce62324d7f02ce0154eb90b2927f8d46510466cda5f8f7` |
| `index.standalone.html` | `99f3003bc79da742c366f30c2f34a5d3a06e6fb536a8103b08e76826cd335172` | `7b62e47bf3ab24c6c1268be3a9ce078627d3074519af542bec07d1c40c7ffa47` |
| `layout.jsx` | `24b08135e304c71713488aea0d5ffca6c466f8e3a11b8ebbac57700287ecbf33` | `911f165b50f94d6b3930b2761545606105a9a4ba9727ed443a0681b039b3e76a` |
| `pages.jsx` | `c0bbabf247f5d51ca4fc779a487e03da3b4722984e48d208271d73cc058f1866` | `ee95572bb30f38424920918c49c9b483898ec975adf4bc0a8c04664cf2fd4a58` |
| `styles.css` | `fbd75f30bf05a19971d9073a5278834137cc2107e9269b557e84f2eb2dbc3f3f` | `f65694df1965889a6a6a4bff6404d9b47164f097ebcd417513a34d430e6a1055` |
| `uploads/INDEX.md` | `1fe5547f63a56f0743305449e662d9997d0410b44cafcd28040a7cc03b765b9c` | `12870b61be9bec03ae8da92b17fcc7f32a05df45fd4f4e23fd07d89bd0f9daf2` |

Machine-readable additions and hashes are in `source-sync.json`.

## Runtime prerequisites and inherent reference limits

- Serve `awesome-list-site-ds/` over HTTP with `index.html` as the directory entry. The reference has no package/build step.
- Network access is required for Google Fonts, React 18.3.1, ReactDOM 18.3.1, and Babel Standalone 7.29.0. Integrity and CORS are declared for the unpkg scripts.
- JSX modules use `type="text/babel"` and browser globals, so Babel Standalone and exact script order are runtime prerequisites. `design-system.html` and `docs.html` have their own static load graphs.
- Font provenance differs by form: modular entrypoints request nine external Google families (Inter, Fraunces, JetBrains Mono, Geist, Instrument Serif, Space Grotesk, IBM Plex Mono, IBM Plex Sans, Manrope); standalone bundles contain 63 WOFF2 subset files represented by 190 `@font-face` declarations. The smaller counts in prose are stale.
- The reference intentionally uses illustrative demo data. No source totals, users, activity, resources, live counts, or credentials may be bound into production. Future parity work must use authorized real data and must not mock or intercept APIs.
- The reference has inherent behavior/accessibility limits: unknown theme IDs can leave mismatched attributes, drawer search is inert, counts are hardcoded, some controls are below the 44px touch contract, palette focus needs real-tab verification, and L3 demo resources have no L3 field. These are documented rather than masked.
- Touch guidance conflicts: component visuals include 26–36px controls while the governing accessibility contract requires 44px targets. Preserve the 44px production contract; do not treat undersized reference hit boxes as required behavior.
- Breakpoint guidance conflicts: source CSS hides the sidebar at `max-width: 768px` and opens tablet drawer access through 1024px, while the governing brief requires a 240px sidebar at exactly 768px and drawer only below 768px. Future implementation must follow the explicit 375/768/1024/1440 contract and record the reconciliation; this source sync does not rewrite upstream bytes.

## Fonts

The app declares the same web-font set as the design source. Since parity wave 1 (September 12, 2026) `client/index.html` carries exactly one always-on font stylesheet, and its `href` is the design's request (`awesome-list-site-ds/index.html` line 10) byte for byte:

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap
```

- Nine families, one request, preceded by `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com`, exactly as the design loads them. Every `--font-display` / `--font-body` / `--font-mono` family of all five design systems is in this set, so switching systems requests no further stylesheet; only picker overrides outside the set (DM Sans, Source Sans 3) load on demand from `client/src/lib/font-options.ts`.
- **Why Fraunces lost the `opsz` axis.** The app used to request `Fraunces:ital,opsz,wght@0,9..144,400…` while the design requests `Fraunces:ital,wght@0,400…` — no optical-size axis. Google Fonts serves a different variable-font subset for each axis list, and a different subset means different glyph outlines and different advance widths/vertical metrics, so a heading set in "Fraunces 600" on both pages still rasterised differently and could never meet a 0.5 % pixel gate. The face set must be identical on both sides — same families, weights, styles *and axes* — and the design is the source of truth, so the `opsz` axis (and the app-only weight 800) were dropped rather than the gate loosened. Inter gained weight 800 and Fraunces italic 500/600 for the same reason: the design declares them.
- Verified by `docs/parity/evidence/fonts/font-set.mjs`: `[...document.fonts]` after `document.fonts.ready` lists 39 identical (family, weight, style) faces on the app's `/` and the design page, with 0 faces on either side only (`docs/parity/evidence/fonts/after/font-set.md`; the pre-change gap was 1 app-only / 26 design-only).
- Held by `scripts/validation/accent-drift.mjs` (`canonical-font-request`): it reads the design's `href` live and fails if the app's differs by a single byte, if a second always-on font link appears, or if any other module under `client/src` requests Google Fonts. A family a system token names that this link does not fetch is token drift and fails the gate; it is never a reason to widen the URL beyond the design's.

## Verification boundary

Synchronization verifies provenance, hashes, load references, and static syntax only. No browser was run and no server/workflow was started. This is not evidence of visual or behavioral parity.

## Tokens

Synchronized by the tokens task (`docs/parity/worklog/tokens.md`,
`docs/parity/assumptions/tokens.md`, evidence in
`docs/parity/evidence/tokens/`). Runtime file: `client/src/styles/design-system.css`.
Gate: `npm run validate:canonical-token-parity`
(`scripts/validation/canonical-token-parity.mjs`, registered as a validation
step) — compares the effective cascade of all five systems and ten accents
against `styles.css` + `design-systems.jsx`, the nine shell geometry tokens
against the numbers parsed from `styles.css`/`app.jsx`/`layout.jsx`, and 26
utility rules declaration-for-declaration. The comparison is a cascade
resolution, not a block diff: every html-level custom-property declaration in
the document (all sheets, `client/index.html` first, then `index.css`'s
`@import` graph; the design's `:root` plus the inline writes of
`applyDesignSystem()`) is ranked by importance, then inline style, then the
document's cascade-layer ORDER (named layers by first appearance across every
sheet — `@layer` statements, `@import … layer()` and blocks, the bare
`tailwindcss` import followed into `node_modules` — anonymous layers each
their own, sublayers before their parent, unlayered last; later layer wins for
normal declarations, earlier layer wins under `!important`), then specificity,
then document order, so `:root { … !important }` outranks a later system
block exactly as in the browser, an earlier layer's `:where(.hide-tablet) {
display: block !important }` beats a later layer's `.hide-tablet.hide-tablet {
display: none !important }`, all 50 system × accent combinations must
resolve `--accent`/`--accent-2` to the design's pair, and geometry must hold
under every system. The tablet/mobile geometry overrides must equal the
design's own media values; a tracked token may be declared only by the three
canonical html-level forms in `design-system.css` (sibling stylesheets and
`client/index.html` styles are scanned and fail on a tracked token). Shadow
detection runs a selector engine (jsdom `Element.matches`) over a modelled
utility element — unknown type, exactly the utility's classes, no other
attribute, unknown position — so `[class~="chip"]`, `:is(.chip)`,
`.chip:not(.accent)`, `span.chip`, `.page .chip`, `:where(.chip){…!important}`,
a later sibling sheet and `[data-system="geist"] .chip` are all cascaded
against the canonical rule, while `:where(.chip)` at zero specificity, a
normal-importance `@layer` copy and a print-only `@media` list are not; the
parser flattens CSS Nesting and decodes hex escapes first, so `.page { .chip
{} }` and `.\63 hip` are seen as the browser sees them; the resolved values
must agree with the design wherever a non-canonical rule wins on either side.
The document itself is modelled: each imported sheet is spliced in at its
`@import`'s position (an importer's `@layer` statement written above its
imports ranks before them; the layer order is built from every declaration
across the graph), the main sheet must be reached unconditionally, every
`@import` must be well-placed and single (the Tailwind compiler inlines a
misplaced or doubled one where it sits — that is what ships and what is
modelled — while css-syntax, postcss-import and a browser given the raw sheet
drop it), and a layer whose first declaration sits inside a conditional group
cannot order the cascade (Chromium does not register it while the condition is
false). 91 in-memory canaries (including PASS controls) run on every
invocation; the eleven cascade-layer cases and the twelve document cases (the
latter rewriting `index.css` through an in-memory overlay, served both
compiled by the Tailwind compiler and raw) were rendered in Chromium
(`docs/parity/evidence/tokens/layer-order-browser.json`) so each expectation
is the browser's. The modelled layer order of the app document is `base <
theme < components < utilities < unlayered` (Tailwind's statement comes after
`design-system.css`'s own `@layer base`); the summary line prints it. Result
at sync:
165 shared values, 0 mismatches, 0 missing; every colour, radius, shadow,
spacing and font token already matched the design, so no colour value changed.

### Added

| token / rule | value | design source |
|---|---|---|
| `--shell-sidebar-w` | 280px; 240px at 768–1023px | `styles.css` `.sidebar` + tablet override |
| `--shell-sidebar-w-tablet` | 240px | `styles.css` `@media (max-width:1024px) .sidebar` |
| `--shell-rail-w` | 56px | `styles.css` `.icon-rail` |
| `--shell-header-h` | 60px; 56px below 768px | `styles.css` `.header` + mobile override |
| `--page-pad-y` / `--page-pad-x` | 48px / 40px | `app.jsx` page padding |
| `--content-max` / `--content-max-admin` | 1240px / 1400px | `app.jsx` page `maxWidth` |
| `--footer-pad` | 48px 40px 32px | `layout.jsx` footer padding |
| `.hide-tablet` / `.show-tablet` | verbatim (`max-width:1024px` / `min-width:1025px`) | `styles.css` |

Breakpoints for the shell tokens follow the governing contract: mobile <768px,
tablet 768–1023px, desktop ≥1024px (the verbatim utilities keep upstream's
1024/1025 edge; see assumptions §7). The only consumer of a new geometry token
is the admin measure (`.admin-dashboard` → `--content-max-admin`); the shell
tasks move their components onto the rest.

### Changed (old → new)

| token / rule | old | new |
|---|---|---|
| `.chip` `font-size` | 12px | 10.5px (canonical) |
| `.grain` `background-image` | utf8-encoded SVG data URL | canonical base64 data URL (same SVG bytes) |
| `--shell-footer-measure` | 1240px | `var(--content-max)` (resolves to 1240px) |
| `.admin-dashboard` `max-width` (`client/src/components/admin/admin-canonical.css`) | `var(--content-max, 80rem)` → 1280px fallback | `var(--content-max-admin, 80rem)` → 1400px; rendered width unchanged at 1440/1920 (page column caps first) |

### Kept different from the design (gate deviations, self-expiring)

| token / rule | design | runtime | reason |
|---|---|---|---|
| `--text-3` (all five systems) | alpha 0.4 / 0.36 / 0.38 / 0.4 / 0.38 | alpha 0.52 | design's literal alphas measure 3.3–3.7:1 on `#000`; 0.52 keeps AA (≥4.5:1) and the production axe baseline (assumptions §1) |
| `.kbd` `font-size` | 10.5px | 12px | tablet-audit 12px floor on the theme preview card rendered by `ThemeSettings.tsx` (assumptions §2) |
| `.no-anim *` `transition` (cascade shadow over `.card*`) | card transitions survive `.no-anim` | `none !important` | the runtime's motion toggle freezes every animation/transition; the design's `.no-anim` only stops caret/shimmer/live-dot (assumptions §8) |

Runtime-only tokens (reported, never failed): `--radius-xs`,
`--motion-fast/base/slow/ease`, `--shell-footer-measure`, and — now that the
resolver reads every sheet — the sibling-owned `--skeleton-base/shine`
(`skeleton-animations.css`) and `--profile-*` (`shared/styles/product-profiles.css`). `.stat` and
`.section-title` exist on neither side (assumptions §3). The artifact
`artifacts/awesome-video-design-system/tokens.json` was regenerated from the
same file (`npm run generate:design-system-artifact`, whose reader now merges
every top-level occurrence of a selector like the gate does) and `DESIGN.md`
documents the parity contract and the geometry table; there is no second
source of truth.
### Removed

`--shell-sidebar-width` (280px) and `--shell-header-height` (60px): zero
consumers, superseded by `--shell-sidebar-w` / `--shell-header-h`.
