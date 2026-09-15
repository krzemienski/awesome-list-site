# Task 567 · Static design-system audit evidence

This directory records the non-browser evidence for the independent static
audit. The audit used `.agents/skills/verify-design-system/SKILL.md` and
`docs/DESIGN-SYSTEM.md` as the contract. No product source, aggregate parity
document, baseline allowlist, or frozen reference was edited.

## Gate transcripts

Each file contains the exact command, complete stdout/stderr, and exit status:

| Check | Transcript |
|---|---|
| app Stage 5 palette drift | [palette-drift.txt](palette-drift.txt) |
| registry/accent/font offline drift | [accent-drift.txt](accent-drift.txt) |
| standalone artifact Stage 5 drift | [standalone-palette-drift.txt](standalone-palette-drift.txt) |
| live webfont fetch | [webfont-fetch.txt](webfont-fetch.txt) |
| theme registry type safety | [theme-registry-types.txt](theme-registry-types.txt) |
| canonical token parity | [canonical-token-parity.txt](canonical-token-parity.txt) |

All six commands exited `0`. The standalone check reports legacy values only
where they are already pinned by
`scripts/validation/standalone-palette-drift-baseline.json`; it found no new
artifact drift.

## Source-only evidence

- `source-static-checks.txt` records the source checks and their exact output.
- `stage6-effective-css.txt` records the effective page-heading declarations
  and composite-control triage; it separates proven token/target defects
  from source-valid custom composites.
- `buttons-static.jsonl` is a TypeScript-parser inventory of native
  `<button>` nodes and their literal JSX attributes/ancestors. It is an audit
  aid, not a replacement for the browser Stage 6 sweep.
- `raw-button-context.txt` preserves source context for the high-confidence
  native-button findings.
- `accent-usage-source.txt` records the reproducible accent-reference scan and
  representative output outside the token sources.

The browser-dependent stages (including computed Stage 2/4 behavior, rendered
Stage 6 sweeps, Stage 7 accent counts, font loading, and Stage 11 switching)
were intentionally not run. The browser worker owns those checks.