# Chunk AX01c (row definitions in cycle-07/lanes/AX01.md)
Signed out, chrome-devtools real touch at 820 and 390 (plus 1440 where noted).
- C6-AX-001..004 at 820 and 390 (skip link, landmarks, hash targets, Back/Forward restore).
- C6-AX-005 drawer at 820 and 390: focus trap, Escape, backdrop tap closes and returns focus.
- C6-AX-007 card focus order in grid, list and compact views at 1440, 820, 390.
- C6-AX-009 Tab walk on /settings/theme (signed-out) and a category page at 820 and 390 (with a hardware keyboard, emulated: just press Tab).
- C6-AX-012 under prefersReducedMotion reduce: tabs, pagination, anchor links and disclosures at 1440 and 390.
- HOVER-LABEL CHECK: on /category/<slug> at 820 and 390 (touch), resource cards show "View Details"/"Open Link" labels at opacity ~0 at rest. Determine whether every card action (open details, open link) is reachable by tap without hover (tap the card/title, look for visible buttons). FAIL only if an action has no visible tap path on touch.
