# BUG-069 — /journey/6..10 render side-truncated headings in the page nav (e.g., "Eve…", "Cod…")

**Severity:** LOW (visual consistency)
**Affected page:** https://awesome.video/journey/{6..10}

## Reproduction
1. Open https://awesome.video/journey/6 in a fresh chromium at 1440×900.
2. Inspect the in-page nav (the step list). Section titles render
   abbreviated with "…" in the right-sidebar nav.
3. Same on /journey/7..10.

The page is functionally the same as BUG-043 (sidebar truncation) but
it manifests inside the journey detail itself.

## Expected
Step titles render fully.

## Actual
Truncated in page nav.

## Evidence
- `resources-audit` (Phase 6) confirmed this as a candidate finding
- `screenshots/journey_6_v2.png` / `journey_7.png`

## Fix prompt

```
Task: Inside https://awesome.video/journey/N pages, the right-side step
nav truncates each step title with ellipsis. Match the formatting used
on /category/* pages.

Acceptance:
1. /journey/{6..10} step titles fit their column at 1440×900.
2. Verifiable: Playwright measures each title element width ≤ column width.
```
