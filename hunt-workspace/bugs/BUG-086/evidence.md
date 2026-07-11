# BUG-086 — Admin pending-list has no column-sort control

**Severity:** LOW
**Affected page:** /admin → Approvals tab

## Reproduction
1. Open /admin (with admin auth) and click Approvals.
2. The pending-approval rows are listed in insertion order (FIFO).
   There is no header click to sort by Author, Date, etc.

## Expected
Clickable column headers for sort.

## Actual
Static insertion-order list.

## Evidence
- `screenshots/admin_dashboard.png` (admin approvals area)

## Fix prompt

```
Task: /admin → Approvals tab should support sort by Author, Date,
Resource.

Acceptance:
1. Click on a column header toggles sort.
2. Verifiable with Playwright.
```
