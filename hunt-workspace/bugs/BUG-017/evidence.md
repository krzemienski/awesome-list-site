# BUG-017 — Sidebar category labels truncated with ellipsis on every page at every viewport

**Severity:** MEDIUM (information loss — users cannot read full category names in the primary navigation)
**Affected pages:** every page with the sidebar — home, /about, /submit, /recommendations, /journeys, /advanced, /categories, /category/*, /subcategory/*, /sub-subcategory/*, /login, /register, /forgot-password, /reset-password, /resource/*
**Affected viewports:** all three (1440, 768, 375)

## Reproduction
1. Open any public page at 1440px.
2. Look at the left sidebar's "Categories" section.
3. Five of nine category labels are truncated with ellipsis:
   - "Community & Eve…" (full: Community & Events)
   - "Encoding & Cod…" (full: Encoding & Codecs)
   - "Infrastructure & …" (full: Infrastructure & Delivery)
   - "Protocols & Tran…" (full: Protocols & Transport)
   - "Standards & Ind…" (full: Standards & Industry)

## Expected
At 1440px wide (1440 - 240 sidebar = 1200 px content column) the sidebar is 256 px wide, which is more than enough for "Infrastructure & Delivery" to fit comfortably.

## Actual
Every category label beyond ~16 characters is truncated. The sidebar wastes space — the count badge and chevron icon eat the remaining room.

## Evidence
- `screenshots/public2_home_1440.png` — five ellipses visible
- `public-deep-pass1.json` — overflowDivs include `accordion-body-inner` and `flex items-stretch gap-[2px]` with scrollW=233 vs clientW=209 at every viewport
- Confirmed twice — re-render produces identical ellipsis.

## Fix prompt
Task: The left sidebar truncates 5 of 9 category labels with ellipsis on every page at every viewport, even at 1440px where there is plenty of room.

Reproduction: open https://awesome.video/ at 1440×900; inspect sidebar categories; "Encoding & Cod…" is shown.
Acceptance: every category name displays in full. Either widen the sidebar by ~30 px, drop the count badge column on hover, drop the chevron, or allow the label to wrap to two lines.

STATUS: FIXED (server/index.ts protectedPatterns += /profile) — 2026-07-11 (local re-confirm run, evidence in evidence/vg1..vg-int/)
