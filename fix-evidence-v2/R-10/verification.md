# R-10 — Journey mobile rows ≤2 lines at 375px (LOW, relates BUG-036)

**Date:** July 20, 2026 · **Status:** FIXED · **Verified live against dev**

## Root cause

Run22's BUG-036 fix clamped the /journeys CARD titles (line-clamp-2 on the title
anchor) and those were already passing. The residual 4–5-line wraps the auditor saw
were the step **resource** titles on /journey/:id — e.g. "Creating a secure
video-on-demand (VOD) platform using AWS" rendered 5 lines, "Netflix Titus
(Container orchestration for video)" 4 lines at 375px (pre-fix probe output).

## Change

`client/src/pages/JourneyDetail.tsx`: the resource-title `<span>` inside each step
row Link now carries `line-clamp-2 break-words min-w-0` (clamp lives on the text
element itself, not the flex anchor — the Run22 lesson) plus a `title` attribute so
the full text stays reachable; the resource detail page has the full title anyway.

## Evidence (verify.mjs, 375×812)

Measured EVERY journey surface: /journeys card titles + step h3 titles + step
resource titles across all 5 journeys (7, 9, 10, 8, 6):

| Surface | n | max lines | >2 lines |
|---|---|---|---|
| /journeys card titles | 5 | 2 | 0 |
| journey 7/9/10/8/6 step titles | 42 | 2 | 0 |
| journey 7/9/10/8/6 resource titles | 86 | 2 | 0 |

**VERDICT: worst=2 → PASS (all titles ≤2 lines @375px).**

Screenshots: `r10-journey7-375.png`, `r10-journey7-step5-375.png` (clamped
"OTT Content Delivery– Multi…", "OblivCDN: A Practical Privacy…" visible at 2 lines).
