# Header repair — 2026-09-17

## Authenticated admin result (state-matched)

Pixelmatch used the existing expected strips, a `0.1` threshold, and the full
header area (56px high at 375/768; 60px at 1024/1440).

| Width | Before | After | After differing pixels |
|---:|---:|---:|---:|
| 375 | 5.3667% | 0.6952% | 146 |
| 768 | 2.7018% | 0.3557% | 153 |
| 1024 | 2.3291% | 0.5518% | 339 |
| 1440 | 2.6690% | 0.5162% | 446 |

The recapture used the supplied disposable Clerk account, confirmed
`Account · Admin`, `N / Nick`, and the desktop Admin nav item, and used the
pinned Chromium with `--disable-partial-raster`. The account was returned to
the `user` role and signed out after capture; neither the local nor Clerk user
was deleted.

The remaining 0.52–0.70% at three widths is fresh-capture raster variance, not
a measurable layout displacement. For example, the pinned browser reports a
74.08px Nick pill where the older expected raster lands on 74px; the right edge
is identical. Control centers, painted bounds, gaps, and header edges align.
The 44px target floor is transparent outside the centered 36px paint and does
not itself contribute visible strip pixels.

### Signed-out diagnostic capture (not state-matched)

These captures are retained only as evidence of why comparing a visitor
against the frozen admin fixture is invalid.

| Width | Before | Signed-out capture | Differing pixels |
|---:|---:|---:|---:|
| 375 | 5.3667% | 0.8524% | 179 |
| 768 | 2.7018% | 0.4325% | 186 |
| 1024 | 2.3291% | 1.2370% | 760 |
| 1440 | 2.6690% | 2.8843% | 2,492 |

## Diagnosis

Browser measurements disproved the ledger's broad geometry hypothesis:

- Header height (56/60px), horizontal padding (14/24px), 14px cluster gap,
  border, and 14px blur match.
- The brand mark is 28×28px in both builds. The wordmark has the same measured
  width, 11px size, 700 weight, and 1.8px tracking. The frozen JSX requests an
  800 logo weight, but the canonical font request ships JetBrains Mono only
  through 700; the app correctly uses the available 700 face.
- At 1024 the search visual is 180×36px with a 14px glyph and a 26.33×20px
  shortcut chip in both builds. At desktop the expected `1,816` text gives the
  same compact intrinsic search width as the app. Padding and the 10px/6px
  responsive gaps match.
- Nav spacing is 18px and typography matches.
- The initial recapture residual was capture state, not control geometry. The
  expected strips show the frozen `N / Nick` admin fixture and an `Admin` nav
  item. A signed-out capture shows a login glyph / `Sign in`, with no admin-only
  nav item. At 1024 that pill is 13px wider, moving the fixed-width search 13px
  left. At 1440 the missing 64px admin nav content and wider pill reposition
  the right cluster. At 375/768 only the `N` versus login glyph differs.
- In the corrected authenticated recapture, the Admin nav and Nick pill have
  the same geometry as the frozen fixture. No additional cluster CSS repair
  was warranted.

The app was not changed to fabricate an authenticated user or expose the
admin link to visitors.

## Change

`client/src/styles/shell/header.css` now gives the menu, search, and account
buttons real 44px minimum interactive heights. App-owned pseudo-elements keep
the canonical 36px painted controls centered inside those targets. Negative
inline margins on compact mobile controls preserve the reference's layout
footprint and spacing. No canonical class (`.kbd`, `.input`, etc.) was
restyled, and test IDs and accessible names were untouched.

The remaining percentages are therefore honest. The 44px target floor does
not add painted pixels in the static strips; it is visible in DOM geometry.
The small amounts above 0.5% cannot be removed by a geometry change without
moving correctly aligned controls to compensate for capture-era raster
rounding.

## Gates

- `npm run check` — PASS
- `node scripts/validation/canonical-token-parity.mjs` — PASS
- `node scripts/validation/accent-drift.mjs` — PASS
- Post-change application preview — rendered successfully; no browser errors
  (only the existing Clerk development-key warning)

Evidence:
`docs/parity/evidence/shell-header/repair-2026-09-17/`, with the state-matched
capture under `authenticated/`.