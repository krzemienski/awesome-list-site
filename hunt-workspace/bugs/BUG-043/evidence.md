# BUG-043 — Sidebar category labels truncated with ellipsis (5 of 9 at every viewport)

**Severity:** MEDIUM (UX / readability — categories remain partially hidden)
**Affected page:** every page that renders the sidebar (all pages)
**Affected viewport:** 1440×900, 768×1024, 375×812

## Reproduction
1. Open https://awesome.video/ in a fresh chromium at any of the three
   target viewports.
2. Inspect the sidebar nav. At least 5 of 9 top-level category labels
   are visually truncated with "…" (e.g., "Encoding & …",
   "Infrastructure & …", "General …", "Media …", "Networking …").
3. The sidebar's `scrollWidth=233` overflows its `clientWidth=209` —
   the inner content is too wide for the visible sidebar column.

## Expected
Category labels should fit fully or wrap to a second line. Truncation
is fine if a tooltip reveals the full label, but no tooltip appears.

## Actual
Labels are clipped silently. A scanner cannot tell what "Encoding & …"
is the abbreviation for without clicking through.

## Evidence
- `public-deep-pass1.json`: `overflowDivs: { scrollW: 233, clientW: 209 }` in `accordion-body-inner` at every viewport
- `screenshots/public2_*_1440.png` for category landing pages
- `verify-findings.js` related runs

## Fix prompt

```
Task: In the sidebar nav of https://awesome.video/ (visible on every
page), 5 of 9 top-level category labels render truncated with ellipsis
at every viewport: "Encoding & …", "Infrastructure & …", "General …",
"Media …", "Networking …".

Reproduction: load / at any of 1440, 768, 375 in a fresh chromium and
inspect the sidebar — visible truncation.

Acceptance:
1. No category label is truncated at any of the three viewports.
   Either widen the sidebar OR allow labels to wrap to two lines.
2. If truncation is desired, show the full text in a title= or tooltip on hover.
3. Verifiable with the same Playwright probe.
```
