# VG-011 — BUG-011 (MEDIUM): Admin Approvals table layout broken

## Fix
`client/src/components/admin/PendingResources.tsx`:
- **Root cause found during the gate**: with the table's default auto layout, `max-w-*` on `TableCell` does not cap column width, so the table grew to **1312px** inside a **1006px** container at 1440 — Approve/Reject were off-screen even at desktop (measured: `approveBtnRight 1539 > viewport 1440`).
- Switched to `table-fixed` with pixel column widths (Title 170 / Category 115 / Description 220 / Submitted 150 / Actions 320 = 975px) — px widths act as minimums in fixed layout, `min-w-[960px]` keeps ≤768px scroll behavior.
- Description: `truncateText(80)` → `line-clamp-3` + full text in `title` tooltip.
- Category badge + subcategory truncate on one line (tooltips) so they never drive row height.
- Submitter email truncates (tooltip); Submitted col widened to 150px so the date never wraps (a 2-line date was inflating every row to 81px).
- Row padding tightened `[&_td]:py-2`.
- Swipe hint (`hint-swipe-pending-table`) driven by real overflow: ResizeObserver compares the `<table>` laid-out width vs the container clientWidth (the shadcn `<Table>` has its own inner `overflow-auto` wrapper, so outer `scrollWidth` never reflects overflow — first implementation bug caught by this gate).

## Live evidence (dev, real pending submissions via POST /api/submit as `__qa_test_run22_bug011@example.com`; ids 187111 desc=378ch, 187112 desc=140ch, 187113 desc=30ch)
Harness: authed Playwright (admin `connect.sid` from real local login), `/admin` Approvals tab.

### Desktop 1440 (`bug-011-desktop-1440.png`)
- Table width **1006 = container 1006** (overflow 0); Approve button right edge 1233 < 1440 → **all actions visible with no scroll**; hint hidden.
- Descriptions: 195px col, 2/3/3 lines (clamped at 3), **first line holds ≥3 words** (Range-rect proof), full text via tooltip.

### Tablet 768 (`bug-011-tablet-768.png`, `-scrolled.png`, `-dialog.png`)
- Row heights **61 / 77 / 97px** (getBoundingClientRect incl. 1px border). 97px row = 3-line description + tag chips row — content genuinely requires it.
- Swipe hint **visible**; after scrolling right, View → details **dialog opened** (click proof).

### Mobile 375 (`bug-011-mobile-375.png`)
- Swipe hint **visible**; horizontal scroll reaches actions.

## Checks
- tsc --noEmit: clean (exit 0).
- Teardown: pending 187111/187112/187113 deleted + `__qa_test_%` users purged; net-zero verified (see below).

**Verdict: PASS**
