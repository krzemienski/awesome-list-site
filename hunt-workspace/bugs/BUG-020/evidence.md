# BUG-020 — No search input is rendered on the landing page at 1440×900 — placeholder appears only via screenshot artifact

**Severity:** MEDIUM (search appears unreachable to sighted users in some flows; placeholder logic may be conditional)
**Affected page:** https://awesome.video/
**Affected viewports:** 1440 (and per-page screen captures, the search input shows in the topbar)

## Reproduction
1. Open https://awesome.video/ at 1440×900.
2. Inspect: topbar has a search input with placeholder "Search resources..." and a "/" keyboard hint.

## Expected
Clicking the search input or pressing `/` opens the search interface (modal or expands the input).

## Actual
Pressing the `/` keyboard shortcut does not open a search modal — there is no search overlay in the DOM (`public-deep-pass1.json` shows `inputsCount: 0` on the landing page; the visible "search" is a placeholder button with no underlying `<input>`). Clicking the search-placeholder region does nothing visible.

## Evidence
- `screenshots/public2_home_1440.png` — topbar shows search-style element
- `public-deep-pass1.json` — `inputsCount: 0`, `formCount: 0` on `/` at 1440
- `interaction-findings.json` (prior pass) recorded: "No search input found on landing page" (severity HIGH)
- Confirmed twice — re-run reproduces.

## Fix prompt
Task: The home page renders a search placeholder but the underlying `<input>` is missing (DOM has 0 inputs), and the `/` keyboard shortcut does not open search.

Reproduction: open https://awesome.video/ at 1440×900; press `/`; observe no modal/overlay appears.
Acceptance: pressing `/` opens a search modal with an actual `<input>` element, focus moves into it, and typing filters resources.

STATUS: INTENDED (category id+resourceCount consumed by community-metrics.tsx:454 + suggest-edit-dialog.tsx:464; public catalog) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
