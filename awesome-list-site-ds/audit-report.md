# UI Experience Audit · awesome.video — Shell (header · sidebar · drawer · search)

**Date:** 2026-09-09 · **Mode:** drive-interaction (live iframe, DOM driven via eval) · **Design system:** Editorial × Crimson
**Coverage:** desktop-ish 924×540 driven live; tablet (769–1024) and mobile (≤768) verified via CSS rules + DOM wiring, not a resized viewport → **LIMITED COVERAGE on viewport axis**.

**Verdict before fixes: FAIL** (1 CRITICAL) · **Verdict after fixes in this turn: PASS WITH ISSUES** (0 CRITICAL, 2 HIGH remaining)

## Pass criteria (set before inspection)
1. Sidebar collapses/expands at all widths with no clipping — ✅
2. Mobile drawer opens, closes (overlay + button), navigates, restores scroll — ✅
3. L1→L2→L3 accordion expands without max-height clipping — ✅ (4000px / computed L3 cap)
4. Search opens from trigger and ⌘K; Esc closes; results populate — ✅ (9 results for "ffmpeg")
5. No false affordances — ❌ L3 rows navigated to parent (fixed)

## Actions actually executed
Clicked Encoding L1 → AV1 L2 → L3 row; clicked FFmpeg L2; collapse → expand; header search trigger → typed "ffmpeg" → Esc; ⌘K; mobile-menu-btn (forced) → drawer accordion → sub-item → overlay close; measured every button's box; scanned truncation; probed drawer/sidebar DOM.

## Findings

### CRITICAL
- **C1 · Primary nav unreachable at 769–1024px.** `nav.hide-tablet` hides Browse/Submit/About/Docs/Admin; `.mobile-menu-btn` only appeared ≤768. Tablet users had no route to Submit/About/Docs. *(Nielsen #7 Flexibility; #3 User control)* → **FIXED**: menu button now shows ≤1024; drawer is the tablet nav.

### HIGH
- **H1 · 6 of 9 category names truncate at the 240px tablet sidebar** ("Community & …", "Encoding & C…", "Infrastructure & D…"). L3 badge + count + chevron eat ~70px. *(Nielsen #6 Recognition)* → **FIXED**: L1 rows show `cat.short` ≤1024, full name above; `title` tooltip on all rows.
- **H2 · L3 rows are false affordances.** Clicking "Encoders" under AV1 landed on the AV1 page with no trace of the click. → **FIXED**: L3 click passes `subSub`; SubcategoryPage breadcrumb shows `AV1 / ENCODERS` (parent crumb is clickable). *Remaining:* resource list is still not filtered by L3 — data has no L3 field. **Hand-off: data model.**
- **H3 · L2 rows with children only toggle; opening the page requires the italic "All in …" row.** Discoverability gap. → **PARTIAL**: added an inline "open" link on those rows. Still worth a design pass.
- **H4 · Touch targets 23–29px** on L2/L3 rows and the 26px collapse toggle, on a sidebar that is visible at tablet-touch widths. → **FIXED** rows to ≥32/34px min-height. *Remaining:* collapse toggle 26px (LOW, mouse-first control).

### MEDIUM
- **M1 · Search trigger ≤1024 is a 180px box showing only an icon and ⌘K** — reads as an empty field. Suggest: shrink to icon-only 36px, or keep "Search" label and drop the count.
- **M2 · Header brand text hidden ≤1024** — only the `av` logo remains; fine for repeat visitors, weak for first landing. Consider showing `siteName` ≤1024 and hiding it only ≤480.
- **M3 · Drawer lacked repo link and Docs; close button unlabeled.** *(WCAG 4.1.2)* → **FIXED**: `aria-label="Close menu"`, `role=dialog aria-modal`, footer with Docs ↗ / GitHub ↗.
- **M4 · Drawer inherits the old accordion (computed `max-height = subs×40+60`)** — safe today (no L3 in drawer) but will clip if L3 is added there. Suggest reusing `AVSidebarV2` internals.

### LOW
- **L1 · Palette input autofocus not observable** in the driven iframe (`autoFocus` is present in code; iframe focus is unreliable) → **UNVERIFIED**, re-check in a real tab.
- **L2 · "+4" pill and "32" count sit 6px apart** on L2 rows; reads as "+432" in text order. Consider `title="4 nested groups"` or moving the pill after the count.
- **L3 · Collapse toggle 26×26px** — below 32px.

## Content / heuristics notes
- Body copy never uses `--text-3` (0 hits) ✅. Heading hierarchy intact ✅.
- H1 on subcategory pages renders at 46px (clamp) ✅.
- One `.serif-italic` per headline — Editorial rule respected ✅.

## Not covered (needs a resized viewport)
- Real 390px render: header single-row fit, home grids, hero wrap, FAB vs. tweaks toggle overlap when `searchPlacement=floating`.
- Dark-only system; no light axis to test.

## Hand-offs
- **Data model:** add `subSub` to resources so L3 filters resources (H2 remainder).
- **Design:** L2 toggle-vs-navigate pattern (H3); tablet search trigger (M1).
- **Verification:** run at 390 / 768 / 1024 in a real browser; confirm palette autofocus (L1).
