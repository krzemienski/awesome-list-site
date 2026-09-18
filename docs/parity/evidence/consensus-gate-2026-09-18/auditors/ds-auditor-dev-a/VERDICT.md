# Design-System Compliance Audit · Awesome.Video

**Verdict: PASS**

System detected: `editorial` × `crimson`
Files audited: `client/index.html`, `client/src/index.css`, `client/src/styles/design-system.css`, `client/src`, `scripts/validation/palette-drift.mjs`, and all 8 required runtime routes

## Findings

### 🔴 BLOCK (0)
None.

### 🟡 FIX (0)
None.

### 🟢 NIT (0)
None.

## What's good
- Stage 1 passed: function, 5 systems, 10 accents, tokens, and system rules loaded.
- Stage 2 passed across all 80 matrix combinations.
- Stage 3 passed: fresh `68.2ms ≤ 264ms`; saved Terminal `32.8ms ≤ 48ms`.
- Stage 4 passed: `.page`, `.grain`, and atmosphere present throughout.
- Stage 5 passed: palette-drift reported zero off-system drift.
- Stage 6 passed: zero hits from all six filters across the full matrix.
- Stage 7 passed: scan count 0 (threshold ≤8); real primary/card hover and keyboard-focus screenshots captured.
- Stage 8 passed: zero long-copy `--text-3` offenders.
- Stage 9 passed: all display/body font loads succeeded in all 80 combinations.
- Stage 10 passed: 80 system rules and 26 `data-ds` rules; active rules reachable throughout.
- Stage 11 passed: all 80 required captures completed; every screen/width group produced five distinct hashes.

## Recommended next steps
1. Ship; no DS-contract remediation is required.

## Evidence
- Target: http://127.0.0.1:5000 (dev, commit `63d0d5852462f47cf45f0368a28767c37653b68b`)
- Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-dev-a/` — 95 files (80 matrix + 15 interaction proofs)
- Stage 3 proof: attr-set 68.2ms ≤ first-paint 264ms (fresh) · 32.8ms ≤ 48ms (saved Terminal)
- Stage 9 proof: Editorial Fraunces/Inter → true/true; Terminal IBM Plex Mono/IBM Plex Mono → true/true; Geist Geist/Geist → true/true; Brutalist Instrument Serif/Space Grotesk → true/true; Swiss Manrope/Manrope → true/true, on every screen and width
- Stage 6 hits per screen/width/system: none
- Visual sample: Editorial showed crimson rounded editorial styling; Terminal switched to green monospace square chrome; Brutalist showed amber, zero-radius, thick-border/slab styling; Swiss mobile used compact orange Swiss styling. The login Clerk card and mobile DS 404 page rendered coherently.
- Blocked / not executed: none

| Stage | Result | One-line evidence |
|---:|:---:|---|
| 1 | PASS | `applyDesignSystem` true; systems=5; accents=10; `--bg=#000000`; system rule reachable. |
| 2 | PASS | System, default accent, and non-empty `--bg` resolved in every matrix entry. |
| 3 | PASS | Inline synchronous head boot sets the system without calling the module global; both first mutations preceded paint. |
| 4 | PASS | `.page`, `.grain`, and non-empty `--bg-atmosphere` found in all 80 combinations. |
| 5 | PASS | `palette-drift.mjs` passed all five detectors with zero drift beyond baseline. |
| 6 | PASS | Buttons, inputs, chips, cards, h1s, and eyebrows produced zero stray hits across 8×2×5. |
| 7 | PASS | Accent count was 0 throughout; real hover/focus proofs are under `interactions/`. |
| 8 | PASS | No long `p`/`li` painted with `--text-3`. |
| 9 | PASS | `document.fonts.load()` returned loaded faces for both active families in every system. |
| 10 | PASS | Source counts were 80 system selectors and 26 bridge hooks; each active rule was reachable in-page. |
| 11 | PASS | 80/80 required screenshots captured; five distinct hashes for each of 16 screen/width groups, with no symptom-table breakage observed. |

Absolute output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-dev-a/`

PNG count: **95**