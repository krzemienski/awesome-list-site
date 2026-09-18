# Design-System Compliance Audit · Awesome.Video production site

**Verdict: PASS**

System detected: `editorial` × `crimson`
Files audited: `client/index.html`, `client/src/index.css`, `client/src/styles/design-system.css`, `client/src`, `scripts/validation/palette-drift.mjs`, and the 8-screen production coverage matrix at `http://127.0.0.1:5055`

## Findings

### 🔴 BLOCK (0)
None.

### 🟡 FIX (0)
None.

### 🟢 NIT (0)
None.

## What's good
- Stage 1 — Runtime exposed all 5 systems, 10 accents, `applyDesignSystem`, `--bg`, and reachable skin rules.
- Stage 2 — System, accent, and background tokens resolved in all 80 combinations.
- Stage 3 — Synchronous inline head boot passed; fresh Editorial was set at 63.9 ms ≤ first paint 304 ms, and saved Terminal at 40.9 ms ≤ 176 ms.
- Stage 4 — `.page`, `.grain`, and non-empty `--bg-atmosphere` passed throughout the matrix.
- Stage 5 — `palette-drift.mjs` passed all five detectors and canaries with no unallowlisted drift.
- Stage 6 — All six component filters returned zero hits across 80 combinations.
- Stage 7 — The contract accent scan returned 0 (≤8) across all 80 combinations; real hover/focus proofs were captured where applicable.
- Stage 8 — No body-copy violation remained after triage; raw matches were hidden `print-only` URL metadata, for which tertiary ink is permitted.
- Stage 9 — Forced font loads passed: Editorial Fraunces/Inter; Terminal IBM Plex Mono/IBM Plex Mono; Geist Geist/Geist; Brutalist Instrument Serif/Space Grotesk; Swiss Manrope/Manrope. Display consumers were also recorded per screen.
- Stage 10 — Source counts were 80 system-selector lines and 26 `data-ds` lines; every active system also had an in-page reachable skin rule.
- Stage 11 — All 80 canonical captures were pixel-distinct across systems. Sample inspection confirmed Editorial’s crimson rounded treatment, Terminal’s green mono/bracket treatment, Brutalist’s amber square/high-border treatment, and Swiss/Geist mobile typography and accent changes without collapse.

## Recommended next steps
1. Ship it.

## Evidence
- Target: http://127.0.0.1:5055 (production build, commit `63d0d5852462f47cf45f0368a28767c37653b68b`)
- Screenshots: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod-b` — 260 PNG files (80 canonical matrix captures plus 180 hover/focus proofs)
- Stage 3 proof: attr-set 63.9 ms ≤ first-paint 304 ms (fresh) · 40.9 ms ≤ 176 ms (saved terminal)
- Stage 9 proof: `editorial → Fraunces/Inter → true/true`; `terminal → IBM Plex Mono/IBM Plex Mono → true/true`; `geist → Geist/Geist → true/true`; `brutalist → Instrument Serif/Space Grotesk → true/true`; `swiss → Manrope/Manrope → true/true`
- Stage 6 hits per screen/width/system: none across 80 combinations
- Blocked / not executed: none

| Stage | Status | One-line evidence |
|---:|:---:|---|
| 1 | PASS | Browser runtime: function present, 5 systems, 10 accents, `--bg: #000`, skin rule reachable. |
| 2 | PASS | All 80 rows had non-empty `data-system`, `data-accent`, and `--bg`. |
| 3 | PASS | Static synchronous head setter plus pre-paint fresh and saved-choice runtime proofs passed. |
| 4 | PASS | `.page`, `.grain`, and atmosphere token present in every matrix row. |
| 5 | PASS | Palette-drift gate passed all five regex detectors, parity checks, and canaries. |
| 6 | PASS | Buttons, inputs, chips, cards, H1s, and eyebrows: zero strays in all 80 rows. |
| 7 | PASS | Exact accent-user snippet: maximum 0; 80 button-hover and 80 keyboard-focus proofs plus 20 available card-hover proofs captured. |
| 8 | PASS | Only hidden print URL metadata matched; no long-form body copy used tertiary ink. |
| 9 | PASS | Both first-family faces loaded with non-empty, all-loaded face arrays for all five systems. |
| 10 | PASS | Source counts 80/26 and active-system CSS reachability passed in all 80 rows. |
| 11 | PASS | 8 screens × 2 widths × 5 systems captured; no identical five-system set and no symptom-table failure observed. |

Output directory: `/home/runner/workspace/.cache/ds-consensus/ds-auditor-prod-b`

PNG count: **260**