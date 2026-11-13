# C7 AX01c (a11y: skip/landmarks/hash/history at touch widths, drawer, card focus order, theme Tab walk, reduced motion, hover labels)
Worker: sonnet a0de8822e04087aa5. Revision 130e5829 throughout (deploy had not landed). chrome-devtools real touch. Evidence: e2e-evidence/cycle-07/AX01c/.
PASS: AX-001, 002, 003 at 820/390; 004 at 820; 005 at 820/390 (backdrop close dispatched, not a real tap); 007 grid at all widths, list/compact at 390; 009 /settings/theme at 820; 012 at 1440/390.
HOVER-LABEL question RESOLVED, PASS: "View Details"/"Open Link" are sr-only names on always-visible 44x44 icon buttons; every card action has a visible tap path (card-390.png).
- C7-AX01c-01 DISMISSED: card Tab order puts Favorite/Bookmark (top-right) after details, tags, open link and suggest-edit. The order is consistent and meaningful (primary actions, then secondary toggles); WCAG 2.4.3 needs a meaningful order, not a strict visual scan. Not a defect.
Re-drive after deploy 1: the drawer Browse item (005). Gaps: 004 at 390; 007 list/compact at 1440/820; 009 at 390 + category-page Tab walk; 012 at 820.
