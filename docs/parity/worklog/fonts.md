# Worklog — fonts (load the canonical web fonts)

Task: make the app's default document (Editorial × Crimson) declare the same
`@font-face` set as the design source — same families, weights, styles and
axes — from one owner, without loosening any gate. Scope: the font `<link>`
block in `client/index.html`, `client/src/lib/font-options.ts`, the font parts
of `client/src/components/layout/SEOHead.tsx`, the callers of the removed
loader, the three validation scripts that encoded the old loader layout, this
worklog, `docs/parity/evidence/fonts/`, and a "Fonts" section in
`docs/parity/DESIGN-SYNC.md`. Out of scope and untouched: layout/CSS token
values, `tests/parity/**`, `awesome-list-site-ds/**`, `server/`.

## 1. Loader inventory (starting state, `main` at `6ee20a60`)

Step 1 of the plan: `grep -rn "fonts.googleapis\|@font-face\|font-family"
client/index.html client/src/lib/font-options.ts
client/src/components/layout/SEOHead.tsx client/src/index.css
client/src/styles/design-system.css`, then following each hit to the code that
runs it.

| # | Where | What it requested | When |
|---|---|---|---|
| L1 | `client/index.html` lines 270–271 | `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com` (crossorigin) | HTML head, before first paint |
| L2 | `client/index.html` lines 275–276 | `Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400` + `JetBrains+Mono:wght@400;500;600;700` | HTML head, always |
| L3 | `client/index.html` lines 286–287 | `Inter:wght@400;500;600;700` | HTML head, always (second stylesheet link) |
| L4 | `client/src/lib/font-options.ts` `SYSTEM_STYLESHEETS` + `loadDesignSystemFont()` | one URL per design system: editorial = the same Fraunces `opsz` + JetBrains Mono URL as L2 (deduped by href, so no second request); terminal = IBM Plex Mono; geist = Geist + JetBrains Mono; brutalist = Space Grotesk + Instrument Serif + JetBrains Mono; swiss = Manrope + IBM Plex Mono | `client/src/main.tsx` line 78 at boot for the saved system, `theme-provider.tsx` lines 91/107 on every system switch — a new `<link>` per system visited (2 links on `/` for editorial, 6 after cycling all five; `before/font-set.md` "per-system link counts") |
| L5 | `client/src/lib/font-options.ts` `FONT_STYLESHEETS` + `loadFontOverride()` | picker overrides: `inter` (400–700), `dm-sans`, `source-sans`, `ibm-plex` (IBM Plex Sans), `jetbrains` | `main.tsx` at boot when `data-font` is saved; theme provider when the visitor picks one |
| L6 | `client/src/components/layout/SEOHead.tsx` lines 217–218 | a second pair of `preconnect` links through Helmet (duplicates of L1; no stylesheet) | every route render |
| L7 | `client/src/index.css` | nothing: no `@font-face`, no `size-adjust`, no `font-display`; only aliases (`--font-sans/--font-serif/--font-display/--font-body` → the system tokens) | — |
| L8 | `client/src/styles/design-system.css` | the five systems' `--font-body/--font-display/--font-mono` stacks (no `@font-face`) | — |

The design source (`awesome-list-site-ds/index.html` line 10) has one request:

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap
```

Measured gap on `/` before any change (`evidence/fonts/before/font-set.md`,
`[...document.fonts]` after `document.fonts.ready` on both pages): 13 faces
shared, 1 app-only (Fraunces 800 — not in the design), 26 design-only
(Fraunces italic 500/600, Inter 800, and all of Geist, Instrument Serif,
Space Grotesk, IBM Plex Mono, IBM Plex Sans, Manrope). The Fraunces faces
that *were* shared came from different axis subsets (`ital,opsz,wght` on the
app, `ital,wght` on the design): Google Fonts serves different variable
subsets for different axis lists, so the two sides shaped headings from
different outlines and metrics even where the family/weight/style triple
matched. This is the harness "Fraunces italic 400 missing" finding from a
different angle: the face existed on the app but as a different font file.

## 2. What changed and why

### 2.1 One owner: the canonical link in the HTML head

`client/index.html` now carries L1 (unchanged preconnects) and **one**
stylesheet link whose `href` is the design URL above, byte for byte, with a
comment explaining why (a different axis subset is a different font). L2 and
L3 are gone. The inline pre-paint script (saved `data-system`/`data-font`
before React boots) is untouched, so the font-prepaint audit still passes.

Rejected alternative: keep Fraunces `opsz` "because it is the nicer optical
size ramp". The brief's rule is repair fonts, never loosen the gate, and the
gate is a byte-identical face set; `opsz` cannot be present on one side only.
(Reasoning recorded in `docs/parity/DESIGN-SYNC.md` → "Fonts".)

### 2.2 Per-system loader removed (plan deviation, recorded as drift)

The plan said "per-system font options … still load their extra families on
demand for the other four systems without re-requesting the base families".
Every family the five systems name (`design-system.css` `--font-*`: Inter,
Fraunces, JetBrains Mono, IBM Plex Mono, Geist, Space Grotesk, Instrument
Serif, Manrope) is already in the canonical request, so a lazy per-system
mechanism would have nothing left to load: `SYSTEM_STYLESHEETS` would be five
URLs whose every family the shell already declared, kept alive only so a
"lazy extras" path exists. That is dead code by construction, and the
dead-exports gate forbids speculative exports. So `SYSTEM_STYLESHEETS` and
`loadDesignSystemFont()` were deleted along with their three call sites
(`main.tsx` boot, `theme-provider.tsx` switch + set), and switching systems
now fetches no stylesheet at all (`after/font-set.md`: 1 font link in every
system; the h1 family per system is the right one — Fraunces / IBM Plex Mono
/ Geist / Instrument Serif / Manrope; `after/settings-theme-<id>.png`).

Cost of "declared but unused": only CSS bytes. Browsers download a font file
when a face is first used by rendered text, never on declaration —
Lighthouse on `/` after the change shows exactly two font files (Inter,
Fraunces), the same count as before (`evidence/fonts/lighthouse-home.md`).

`FONT_STYLESHEETS` / `loadFontOverride()` (picker overrides) stay: DM Sans and
Source Sans 3 are not in the design set. The `inter` entry moved to
`wght@400;500;600;700;800` so picking Inter never declares a narrower subset
than the shell already has.

### 2.3 SEOHead

The duplicate Helmet `preconnect` pair (L6) is removed; `SEOHead` never
injected a stylesheet, so nothing else to strip. The `dns-prefetch` for
GitHub stays.

### 2.4 Token stacks, `index.css`, CSP — checked, no change needed

- All five systems' `--font-display/--font-body/--font-mono` strings in
  `client/src/styles/design-system.css` already equal
  `awesome-list-site-ds/styles.css` / `design-systems.jsx` (compared line by
  line; the only edit in that file is the comment above the tokens, which
  described the deleted loader).
- `client/src/index.css` has no `@font-face`, `size-adjust` or `font-display`
  override (L7), matching the design, which has none either.
- `server/index.ts` CSP: `style-src … https://fonts.googleapis.com`,
  `font-src 'self' https://fonts.gstatic.com` — unchanged and sufficient; no
  console/CSP entry on `/` or `/settings/theme` in any capture
  (`after/font-set.md` "log entries: 4, relevant: 0").

### 2.5 Gates that encoded the old layout

Three validation scripts asserted the deleted loader and had to learn the
new contract (they are the reason "just edit index.html" was not enough):

- `scripts/validation/accent-drift.mjs` — dropped `system-stylesheet`,
  `system-stylesheet-family`, `static-font-scope` and the loader call-site
  checks. Added `canonical-font-request`: exactly one always-on
  font-provider `<link rel=stylesheet>` in `client/index.html`, decoded href
  byte-identical to the design source's (read live from
  `awesome-list-site-ds/index.html`; a missing or non-unique design href is
  parser-rot, not a pass). Added a `client/src` scan that fails
  `font-source-coverage` for any Google Fonts css2 URL outside
  `font-options.ts`. `system-font-coverage` now checks every `--font-*`
  family of every system against the canonical link alone: a family a token
  names that the shell lacks is **token drift** and fails — it is never a
  reason to widen the URL. Mutation probes (each restored afterwards): adding
  `opsz` to Fraunces → `canonical-font-request` names the Fraunces axes;
  a second always-on link → fail; a css2 URL in another TS module →
  `font-source-coverage`; design html missing → parser-rot; swiss
  `--font-display` → `'Ghost'` → `system-font-coverage`.
- `scripts/validation/design-system-showcase.mjs` —
  `font-paint-mutation-detection` used to mutate the active system's
  `SYSTEM_STYLESHEETS` URL; it now mutates the canonical shell link (removes
  the second weight of the active system's `--font-display` family, swiss →
  Manrope 500) and still proves the paint check notices.
- `scripts/validation/product-profile-drift.mjs` — the `main.tsx` boot
  expectation is now: no `localStorage.getItem("ds-system")`, no
  `loadDesignSystemFont`, `loadFontOverride(fontOverrideAtBoot)` still called.

`replit.md` (webfont-probe bullet + a new "Canonical font request" bullet) and
`.agents/skills/verify-design-system/SKILL.md` were updated to describe the
single link.

## 3. Evidence

All under `docs/parity/evidence/fonts/`:

| File | Shows |
|---|---|
| `font-set.mjs` | the probe: serves `awesome-list-site-ds/` locally, opens the app `/`, `/settings/theme` per system, and the design page; lists `[...document.fonts]` (family, weight, style, status) after `document.fonts.ready`; diffs; records font links per system and any font-related network/console entry. `node docs/parity/evidence/fonts/font-set.mjs <phase> [appBase]` → `/tmp/fonts-evidence/<phase>/` |
| `before/font-set.md`, `.json` | 13 shared / 1 app-only / 26 design-only; links per system 2 → 6 |
| `after/font-set.md`, `.json` | **39 shared / 0 app-only / 0 design-only**; the same href on both sides; 1 link in every system; 0 relevant log entries |
| `before/`, `after/settings-theme-<system>.png` | `/settings/theme` at 1440 after switching to each system (heading in that system's display family) |
| `filmstrip.mjs` | CDP screencast at 375 for `/`, cold and warm cache, with rAF samples of the first `<h1>`'s computed family and measured width |
| `before/filmstrip/`, `after/filmstrip/` | 7 kept frames per run + `summary.md`; identical behaviour before and after: `document.fonts.ready` within 2 ms, no fallback→webfont swap (no same-text width change), the only h1 change is the SSR shell h1 ("Awesome Video", Inter) being replaced by React's ("Awesome Video Resources", Fraunces, width 343 both before and after) |
| `lighthouse-home.md` | font audits vs the production baseline: `font-display` 1 → 1, `uses-rel-preconnect` 1 → 1, CLS 0.052 → 0.044; the only best-practices deduction locally is `errors-in-console` from the read-only harness sealing Vite's HMR WebSocket |

## 4. Gate results (after all edits, dev server on :5000)

| Gate | Result |
|---|---|
| `node scripts/validation/accent-drift.mjs` | PASS (incl. new `canonical-font-request`, 9 families) |
| `npm run validate:webfont-fetch` (network) | PASS — 6 URLs, each 200, declared every requested family; the canonical link serves 190 `@font-face` across all nine families |
| `npm run validate:font-prepaint` | PASS (6 saved font ids + unknown-id fallback) |
| `npm run validate:theme-registry-types` | PASS |
| `node scripts/validation/design-system-showcase.mjs` | ALL 20 CHECKS PASSED (font-paint per system, picker paint, both mutation detections) |
| `npm run validate:product-profiles` | PASS (5 approved profiles) |
| `npm run validate:product-profile-browser` | PASS (5 profiles; 18 route scenarios; cross-tab theme and font sync) |
| `npm run check` | PASS |
| `npm run lint:css` | PASS |
| `npm run test:unit` | 270 passed |
| `npm run bundle:budget` | PASS |
| `node scripts/validation/responsive-audit.mjs` | TOTAL 32, FAIL 0 |
| `node scripts/validation/print-audit.mjs` | TOTAL 49, FAIL 0 |
| `node scripts/validation/dead-exports.mjs` / `dead-components.mjs` | PASS |
| Lighthouse `/` (mobile) | see `evidence/fonts/lighthouse-home.md` |

## 5. Functional checks

- Theme switching still swaps fonts: `/settings/theme` → each system's h1
  computed family is Fraunces / IBM Plex Mono / Geist / Instrument Serif /
  Manrope (`after/font-set.md` "h1 family" per system;
  `after/settings-theme-<id>.png`).
- No 404/blocked font requests and no CSP report in the network/console log
  of any capture; the only font-provider requests are the canonical
  stylesheet and the `fonts.gstatic.com` files it references.
- Headings on `/` at 1440 are Fraunces before and after (shared face family;
  the outlines now come from the `ital,wght` subset the design uses — the
  intended small metric shift).

## 6. Open items

- `artifacts/awesome-video-design-system/index.html` and
  `artifacts/mockup-sandbox/index.html` still carry their own (older) Google
  Fonts URLs; they are separate artifacts outside this task's file scope and
  are not measured by the parity harness, so they were left alone and
  proposed as a follow-up.
- The harness (`tests/parity/`) font-face assertion belongs to the parallel
  harness task; once merged, its per-row "declared-face gap" list should be
  empty for every app row (this task's probe is the interim proof).
- Production still serves the old two-link pair until the next publish; the
  production baseline's Lighthouse rows reflect that.
