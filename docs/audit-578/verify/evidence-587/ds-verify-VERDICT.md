# Design-System Verification · awesome-list-site

**Verdict: FIX**

Run `2026-10-09T16-34-33-052Z-11092` · mode `full` · HEAD `c58c3a4f0c` + 8 uncommitted file(s)
Evidence: `/home/runner/workspace/.cache/verify-ds/2026-10-09T16-34-33-052Z-11092`

## Findings

### 🔴 BLOCK (0)
_none_

### 🟡 FIX (1)
1. stage 6 — `ds-button-sweep` failed → read `ds-button-sweep.log`

### ⚪ UNVERIFIED (2)
1. stage 11 — `parity-systems`: deep tier — re-run with --deep
2. stage 11 — `pixel-parity`: deep tier — re-run with --deep

## What passed
- `token-parity` (stage 0) — Runtime tokens, accents and canonical utility rules resolve to the frozen design source (awesome-list-site-ds) for all 5 systems x 10 accents, or carry a documented deviation.
- `theme-registry-types` (stage 1) — design-system.ts compiles standalone and rejects an unknown DEFAULT_SYSTEM or DEFAULT_ACCENT; registry uniqueness lives in the canonical JS and is checked by accent-drift.
- `accent-drift` (stage 1/2/3/9/10) — Registry, pre-paint boot markers, :root[data-system]/[data-accent] blocks, skin selectors, font options and the always-on font <link> all agree.
- `token-contract` (stage 10) — Every :root[data-system] block declares the token set its peers agree on.
- `skin-blocks` (stage 10) — The canonical client/public/ds/design-system.css keeps its [data-system] skin selectors (>= 55) with every system represented, and design-system.js defines every system.
- `palette-drift` (stage 5) — No new hardcoded hex / rgb() / Tailwind palette class / raw radius / font-family in client/src beyond the shrink-only baseline; SKILL.md stage-5 regex parity.
- `standalone-palette-drift` (stage 5) — Same stage-5 scan over manifest-backed artifacts/; frozen design archive still byte-identical to its upload.
- `lint-css` (stage 5/10) — stylelint (with the design-system token-contract plugin) is clean over client/**/*.css.
- `stage6-contract` (stage 6) — Button primitive minimum touch-target contract (44x44) holds for default/small/icon across all product profiles.
- `ds-artifact` (stage 1) — The published design-system artifact (tokens.json + docs) is regenerated from the current stylesheet and registry.
- `live-probe` (stage 1/2/3/4/9/11) — On each requested route of the RUNNING app: DS globals present, data-system/data-accent set, --bg resolves, .page + .grain rendered, display font painted, and switching all 5 systems changes radius/border/font on real elements.
- `font-prepaint` (stage 3/9) — data-font / --font-body / --font-sans are written before first paint on every boot path (no theme flash).
- `ds-showcase` (stage 9/11) — /design-system: every system pill flips html[data-system], token rows equal live computed values, tokens diverge across systems, and each declared face actually paints (width-measured, not fonts.check).
- `ink-accent` (stage 7/8) — Accent discipline and ink-tier (no long p/li in --text-3/--text-4) across 5 systems x 2 widths x 4 surfaces, compared on RESOLVED colors.
- `webfont-fetch` (stage 9) — Every font stylesheet URL answers 200 and ships an @font-face for each family it requests.

## Stage coverage
| Stage | State | Gates |
|---|---|---|
| 0 | PASS | token-parity:PASS |
| 1 | PASS | theme-registry-types:PASS, accent-drift:PASS, ds-artifact:PASS, live-probe:PASS |
| 2 | PASS | accent-drift:PASS, live-probe:PASS |
| 3 | PASS | accent-drift:PASS, live-probe:PASS, font-prepaint:PASS |
| 4 | PASS | live-probe:PASS |
| 5 | PASS | palette-drift:PASS, standalone-palette-drift:PASS, lint-css:PASS |
| 6 | FAIL | stage6-contract:PASS, ds-button-sweep:FAIL |
| 7 | PASS | ink-accent:PASS |
| 8 | PASS | ink-accent:PASS |
| 9 | PASS | accent-drift:PASS, live-probe:PASS, font-prepaint:PASS, ds-showcase:PASS, webfont-fetch:PASS |
| 10 | PASS | accent-drift:PASS, token-contract:PASS, skin-blocks:PASS, lint-css:PASS |
| 11 | PARTIAL | live-probe:PASS, ds-showcase:PASS, parity-systems:UNVERIFIED, pixel-parity:UNVERIFIED |
